/**
 * Pure text helpers shared by the generation tools. No SillyTavern imports,
 * so they can be unit-tested under plain Node (see test/). Re-exported from
 * utils.js, which is where the modules import them from.
 */

// ─── Template Macros ───

/**
 * Replace this extension's own `{{key}}` placeholders in a prompt template.
 *
 * Deliberately NOT SillyTavern's macro engine: ST macros run on Phrasing's
 * injection templates already, but the ACC/WIA templates contain literal
 * `{{ .fooOverride ?? bar }}` override syntax that must pass through
 * untouched, so generation prompts only get this narrow substitution.
 *
 * @param {string} template - Template text possibly containing `{{key}}` placeholders.
 * @param {Record<string, string>} macros - key → replacement value.
 * @returns {{ text: string, used: Set<string> }} The substituted text plus the
 *          set of macro keys that were actually present. Callers use `used`
 *          to fall back to appending/prepending a block when its placeholder
 *          is absent, which keeps old templates working unchanged.
 */
export function applyTemplateMacros(template, macros) {
    let text = template || '';
    const used = new Set();
    for (const [key, value] of Object.entries(macros)) {
        const re = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
        if (re.test(text)) {
            used.add(key);
            text = text.replace(new RegExp(re.source, 'gi'), () => value ?? '');
        }
    }
    return { text, used };
}

// ─── Prefill Echo Stripping ───

/**
 * Strip a prefill echo from the start of a generation result.
 *
 * Backends that support assistant-prefix continuation return only the new
 * text, so callers prepend the prefill to the result. Chat-completion
 * backends that ignore the prefix (e.g. OpenAI) often start over and re-emit
 * the prefill (or its final line), which would produce a doubled opening
 * once the prefill is prepended. Detects a full-prefill echo or a final-line
 * echo and removes it. Conservative: requires an exact match of at least a
 * few characters, so legitimate output is never trimmed.
 *
 * @param {string} output  - Cleaned (trimmed) generation result.
 * @param {string} prefill - The prefill that was sent as the assistant prefix.
 * @returns {string} The output with any leading prefill echo removed.
 */
export function stripPrefillEcho(output, prefill) {
    if (!output || !prefill) return output;
    const whole = prefill.trim();
    if (whole.length >= 3 && output.startsWith(whole)) {
        return output.slice(whole.length).replace(/^\s+/, '');
    }
    const lines = prefill.split('\n').map(l => l.trim()).filter(Boolean);
    const lastLine = lines[lines.length - 1];
    if (lastLine && lastLine.length >= 4 && output.startsWith(lastLine)) {
        return output.slice(lastLine.length).replace(/^\s+/, '');
    }
    return output;
}

// ─── Outer Bracket Stripping ───

/**
 * Remove the `[ … ]` that wraps a whole bracketed block, so it can be
 * substituted into an injection template that brings its own brackets.
 *
 * Only a bracket pair that encloses *everything* is removed: text with more
 * after the block — an st-toolkit scenario's Openings block follows its
 * closing `]` — comes back unchanged. A block that was never closed (a stopped
 * generation) loses just its opener, and a stray trailing `]` with no opener
 * is dropped, as before.
 *
 * @param {string} text
 * @returns {string}
 */
export function stripOuterBrackets(text) {
    const out = (text || '').trim();
    if (!out.startsWith('[')) {
        const unmatchedClose = out.endsWith(']') && out.split(']').length > out.split('[').length;
        return unmatchedClose ? out.slice(0, -1).trimEnd() : out;
    }
    let depth = 0;
    for (let i = 0; i < out.length; i++) {
        if (out[i] === '[') {
            depth++;
        } else if (out[i] === ']' && --depth === 0) {
            return i === out.length - 1 ? out.slice(1, -1).trim() : out;
        }
    }
    return out.slice(1).trimStart();
}
