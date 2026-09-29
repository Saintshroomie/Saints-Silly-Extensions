/**
 * Character State — pure helpers. No SillyTavern imports, so they're
 * unit-tested under plain Node (test/character-state-parsing.test.mjs).
 *
 * A character's "state variables" are the chat variables its card and lore
 * read with ST's variable shorthand, st-toolkit style:
 *
 *     Clothing: {{ .peterClothingOverride ?? Worn gray hoodie, … }};
 *
 * Discovery scans those texts for reads; the default after `??` / `||` is
 * what the card shows while the variable is unset.
 */

// ST's variable shorthand identifier (MacroLexer.js MACRO_VARIABLE_SHORTHAND_PATTERN).
const VARIABLE_NAME = '[a-zA-Z](?:[\\w-]*\\w)?';

const READ_WITH_DEFAULT_RE = new RegExp(`^\\s*\\.(${VARIABLE_NAME})\\s*(?:\\?\\?|\\|\\|)(?!=)\\s*([\\s\\S]*?)\\s*$`);
const PLAIN_READ_RE = new RegExp(`^\\s*\\.(${VARIABLE_NAME})\\s*$`);
const GETVAR_READ_RE = new RegExp(`^\\s*getvar::(${VARIABLE_NAME})\\s*$`);
const FIELD_LABEL_RE = /(?:^|[;[])\s*([A-Za-z][A-Za-z0-9 '’&/-]{0,40}?)\s*:\s*$/;

// ─── Macro Scanning ───

/**
 * Yield every `{{…}}` macro in `text` with balanced nesting, outermost first
 * and then the macros nested inside it. Unbalanced trailing text is ignored.
 *
 * @param {string} text
 * @returns {Generator<{ inner: string, start: number }>}
 */
function* iterateMacros(text) {
    let i = 0;
    while (i < text.length) {
        const open = text.indexOf('{{', i);
        if (open === -1) return;
        let depth = 1;
        let j = open + 2;
        while (j < text.length && depth > 0) {
            if (text.startsWith('{{', j)) {
                depth++;
                j += 2;
            } else if (text.startsWith('}}', j)) {
                depth--;
                j += 2;
            } else {
                j++;
            }
        }
        if (depth > 0) return;
        const inner = text.slice(open + 2, j - 2);
        yield { inner, start: open };
        // Reads can sit inside other macros ({{if …}} conditions aside, e.g. a
        // default that is itself a read); scan the inside too.
        for (const nested of iterateMacros(inner)) {
            yield { inner: nested.inner, start: open + 2 + nested.start };
        }
        i = j;
    }
}

/** The `Label:` a field-style line gives the macro that starts at `start`. */
function fieldLabelBefore(text, start) {
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const match = text.slice(lineStart, start).match(FIELD_LABEL_RE);
    return match ? match[1].trim() : null;
}

/**
 * Find the chat-variable reads in a card or lore text.
 *
 * Recognized: `{{ .name ?? default }}`, `{{ .name || default }}`, a bare
 * `{{.name}}`, and `{{getvar::name}}`. Assignments and comparisons
 * (`=`, `??=`, `+=`, `==`, …) are writes or tests, not reads, and are skipped.
 * A variable read more than once keeps its first default and label.
 *
 * @param {string} text
 * @returns {{ name: string, defaultValue: string|null, label: string|null }[]}
 */
export function findVariableReads(text) {
    if (!text || typeof text !== 'string') return [];
    const found = new Map();
    for (const { inner, start } of iterateMacros(text)) {
        let name = null;
        let defaultValue = null;
        const withDefault = inner.match(READ_WITH_DEFAULT_RE);
        if (withDefault) {
            name = withDefault[1];
            defaultValue = withDefault[2];
        } else {
            const plain = inner.match(PLAIN_READ_RE) || inner.match(GETVAR_READ_RE);
            if (plain) name = plain[1];
        }
        if (!name) continue;
        const label = fieldLabelBefore(text, start);
        const existing = found.get(name);
        if (!existing) {
            found.set(name, { name, defaultValue, label });
        } else {
            existing.defaultValue ??= defaultValue;
            existing.label ??= label;
        }
    }
    return [...found.values()];
}

/**
 * Merge the reads found across a character's texts, in source order.
 *
 * @param {{ source: string, book?: string, text: string }[]} sources
 *        `source` is 'card' or 'lore'; `book` names the lore book.
 * @returns {{ name: string, defaultValue: string|null, label: string|null, source: string, book: string|null }[]}
 */
export function discoverVariables(sources) {
    const merged = new Map();
    for (const { source, book = null, text } of sources || []) {
        for (const read of findVariableReads(text)) {
            const existing = merged.get(read.name);
            if (!existing) {
                merged.set(read.name, { ...read, source, book });
            } else {
                existing.defaultValue ??= read.defaultValue;
                existing.label ??= read.label;
            }
        }
    }
    return [...merged.values()];
}

// ─── Names & Labels ───

/**
 * st-toolkit's variable prefix for a character: the first word of the name,
 * non-alphanumerics stripped, first letter lowercased; an all-caps first
 * word is lowercased entirely ("Sable Voss" → sable, "MJ" → mj).
 *
 * @param {string} characterName
 * @returns {string}
 */
export function variablePrefix(characterName) {
    const first = String(characterName || '').trim().split(/\s+/)[0] || '';
    const word = first.replace(/[^A-Za-z0-9]/g, '');
    if (!word) return '';
    if (word.length > 1 && word === word.toUpperCase()) return word.toLowerCase();
    return word[0].toLowerCase() + word.slice(1);
}

/**
 * A readable label for a variable name, used when its card line has no
 * `Label:` of its own: the character's prefix and an `Override` suffix are
 * dropped and camelCase is split ("peterTrueGoalOverride" → "True Goal").
 *
 * @param {string} name
 * @param {string} [characterName]
 * @returns {string}
 */
export function humanizeVariableName(name, characterName = '') {
    let core = String(name || '');
    const prefix = variablePrefix(characterName);
    if (prefix && core.startsWith(prefix) && /^[A-Z0-9_-]/.test(core.slice(prefix.length))) {
        core = core.slice(prefix.length);
    }
    core = core.replace(/Override$/, '') || String(name || '');
    const words = core
        .replace(/[_-]+/g, ' ')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    return words.map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

// ─── Prompt Block ───

/**
 * The variable list shown to the model: one entry per variable with its
 * current value (or the card default it currently falls back to).
 *
 * @param {{ name: string, label: string, value: string, isSet: boolean, defaultValue: string|null }[]} rows
 * @returns {string}
 */
export function formatVariablesBlock(rows) {
    return (rows || []).map(row => {
        const current = row.isSet
            ? row.value
            : (row.defaultValue ? `${row.defaultValue} (card default)` : '(unset, no default)');
        return `- ${row.name} (${row.label}): ${current}`;
    }).join('\n');
}

// ─── Reply Parsing ───

const NO_CHANGE_VALUE_RE = /^(?:\(?\s*(?:unchanged|no change|same(?: as before)?|n\/a|none)\s*\)?)$/i;

function stripValue(raw) {
    let value = String(raw || '').trim();
    // Markdown emphasis or code the model wrapped the whole value in.
    const wrapped = value.match(/^(\*\*|__|`|"|“)([\s\S]*?)(\*\*|__|`|"|”)$/);
    if (wrapped) value = wrapped[2].trim();
    return value.replace(/\s*;\s*$/, '').trim();
}

/**
 * Parse the model's reply into proposed values. Expected lines are
 * `<variable name>: <new value>`; tolerated around that are list markers,
 * numbering, a leading `.`, markdown emphasis, `=` instead of `:`, and a
 * `(Label)` after the name. The label alone is accepted when it names
 * exactly one variable. Lines that match no variable are ignored, and a
 * value like "unchanged" is dropped. The last line for a variable wins.
 *
 * @param {string} text
 * @param {{ name: string, label?: string }[]} variables
 * @returns {{ name: string, value: string }[]}
 */
export function parseStateReply(text, variables) {
    const byName = new Map();
    const byLabel = new Map();
    for (const v of variables || []) {
        byName.set(v.name.toLowerCase(), v.name);
        const label = (v.label || '').toLowerCase();
        if (label) byLabel.set(label, byLabel.has(label) ? null : v.name);
    }

    const proposals = new Map();
    for (const rawLine of String(text || '').split('\n')) {
        const line = rawLine
            .trim()
            .replace(/^(?:[-*•]\s+|\d+[.)]\s+)/, '')
            .replace(/^(\*\*|__|`)(.+?)\1(?=\s*(?:\([^)]*\))?\s*[:=])/, '$2');
        const match = line.match(/^\.?([A-Za-z][\w -]*?)\s*(?:\([^)]*\))?\s*[:=]\s*(.*)$/);
        if (!match) continue;
        const key = match[1].trim().toLowerCase();
        const name = byName.get(key) ?? byLabel.get(key) ?? null;
        if (!name) continue;
        const value = stripValue(match[2]);
        if (!value || NO_CHANGE_VALUE_RE.test(value)) continue;
        proposals.set(name, value);
    }
    return [...proposals].map(([name, value]) => ({ name, value }));
}
