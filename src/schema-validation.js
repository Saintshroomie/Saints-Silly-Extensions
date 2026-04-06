/**
 * Schema validation for Assisted Character Creation.
 *
 * Uses AJV to do two things:
 *
 *   1. Meta-validate Character Schemas — the objects defined in
 *      default-character-schema.js and loaded via schema import. A single
 *      JSON Schema (META_SCHEMA) describes the expected shape of those
 *      objects (schemaName, fields, per-field order/label/prompt, etc.).
 *
 *   2. Validate Character *data* — the `{ fieldKey: value }` object that
 *      the compiled description is a stringified form of. Because every
 *      field is a free-form string, the generated JSON Schema for a given
 *      Character Schema is trivial: an object of string properties, with
 *      `additionalProperties: true` so a description compiled under one
 *      schema can still be imported under another without data loss.
 */

import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true, strict: false });

// ─── Meta-Schema: validates Character Schema definitions ───

const META_SCHEMA = {
    type: 'object',
    required: ['schemaName', 'fields'],
    properties: {
        schemaName: { type: 'string', minLength: 1 },
        fields: {
            type: 'object',
            minProperties: 1,
            additionalProperties: {
                type: 'object',
                required: ['order', 'label', 'prompt'],
                properties: {
                    order: { type: 'number' },
                    label: { type: 'string', minLength: 1 },
                    description: { type: 'string' },
                    responseLength: { type: 'number' },
                    prompt: { type: 'string', pattern: '\\{\\{seedText\\}\\}' },
                },
                additionalProperties: true,
            },
        },
    },
    additionalProperties: true,
};

const validateMetaSchema = ajv.compile(META_SCHEMA);

/**
 * Validate a Character Schema object against the meta-schema.
 * Also enforces the cross-field "unique order" constraint that JSON Schema
 * can't express directly.
 *
 * @param {object} schema
 * @returns {string[]} Array of human-readable error messages (empty = valid).
 */
export function validateCharacterSchema(schema) {
    const errors = [];

    if (!validateMetaSchema(schema)) {
        for (const err of validateMetaSchema.errors || []) {
            const path = err.instancePath || '(root)';
            errors.push(`${path} ${err.message}`);
        }
        return errors;
    }

    // AJV can't express "all field.order values must be unique" cleanly,
    // so we check it by hand. Same rule the old hand-rolled validator had.
    const seen = new Map();
    for (const [key, field] of Object.entries(schema.fields)) {
        if (seen.has(field.order)) {
            errors.push(`Field "${key}": duplicate order value ${field.order} (also used by "${seen.get(field.order)}").`);
        } else {
            seen.set(field.order, key);
        }
    }

    return errors;
}

// ─── Data Schema: validates compiled character data objects ───

/**
 * Build a JSON Schema that validates the *data* object produced by a given
 * Character Schema. Every field is a string; unknown keys are permitted so
 * old descriptions survive schema changes.
 *
 * @param {object} characterSchema
 * @returns {object} JSON Schema
 */
export function buildDataSchema(characterSchema) {
    const properties = {};
    for (const key of Object.keys(characterSchema.fields || {})) {
        properties[key] = { type: 'string' };
    }
    return {
        type: 'object',
        properties,
        additionalProperties: { type: 'string' },
    };
}

/**
 * Validate a character data object (the thing that gets JSON.stringify'd
 * into ST's description field) against a Character Schema.
 *
 * @param {object} characterSchema
 * @param {object} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateCharacterData(characterSchema, data) {
    const dataSchema = buildDataSchema(characterSchema);
    const validate = ajv.compile(dataSchema);
    if (validate(data)) return { valid: true, errors: [] };
    const errors = (validate.errors || []).map(err => {
        const path = err.instancePath || '(root)';
        return `${path} ${err.message}`;
    });
    return { valid: false, errors };
}

/**
 * Attempt to parse a description string as a character data object.
 * Returns the parsed object on success, or null on any failure
 * (not valid JSON, not an object, or fails schema validation).
 *
 * The caller can fall back to LLM-based reverse mapping when this returns null.
 *
 * @param {string} description
 * @param {object} characterSchema
 * @returns {object|null}
 */
export function tryParseCharacterData(description, characterSchema) {
    if (typeof description !== 'string' || !description.trim()) return null;
    let parsed;
    try {
        parsed = JSON.parse(description);
    } catch {
        return null;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const { valid } = validateCharacterData(characterSchema, parsed);
    return valid ? parsed : null;
}
