/**
 * Pure readers for the shared settings object — kept free of SillyTavern
 * imports so they're unit-tested under plain Node (test/).
 *
 * Every tool reads its prompts, prefills and lengths through these so an
 * emptied field means the same thing everywhere:
 *   - a prompt template left blank falls back to the default (an empty
 *     instruction is never what the user meant);
 *   - a prefill is literal text, so clearing it really sends no prefill —
 *     matching how presets store it.
 */

/**
 * A prompt template: any non-blank string, else `fallback`.
 *
 * @param {object} settings
 * @param {string} key
 * @param {string} fallback
 * @returns {string}
 */
export function templateSetting(settings, key, fallback) {
    const value = settings?.[key];
    return (typeof value === 'string' && value.trim()) ? value : fallback;
}

/**
 * Literal text (prefills and other fields where empty is meaningful): any
 * string, `''` included, else `fallback`.
 *
 * @param {object} settings
 * @param {string} key
 * @param {string} fallback
 * @returns {string}
 */
export function textSetting(settings, key, fallback) {
    const value = settings?.[key];
    return (typeof value === 'string') ? value : fallback;
}

/**
 * Parse an input value (string or number) as a positive integer.
 *
 * @param {unknown} value
 * @returns {number|null} The integer, or null when it isn't a positive integer.
 */
export function parsePositiveInt(value) {
    const n = typeof value === 'number' ? Math.trunc(value) : parseInt(value, 10);
    return (Number.isFinite(n) && n > 0) ? n : null;
}

/**
 * A positive-integer setting (response lengths, turn counts), else `fallback`.
 *
 * @param {object} settings
 * @param {string} key
 * @param {number} fallback
 * @returns {number}
 */
export function positiveIntSetting(settings, key, fallback) {
    return parsePositiveInt(settings?.[key]) ?? fallback;
}
