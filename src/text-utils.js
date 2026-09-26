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
