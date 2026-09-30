/**
 * Reformatting's deterministic Rules engine — pure text transforms, kept free
 * of SillyTavern imports so they're unit-tested under plain Node (test/).
 *
 * The rules must stay deterministic, and a message that already matches the
 * target comes back unchanged (Reformatting adds no swipe for a no-op).
 */

/** Remove every asterisk (markdown italic / bold emphasis marker). */
function stripAsterisks(text) {
    return text.replace(/\*/g, '');
}

/** Wrap a single non-dialogue span's trimmed core in asterisks. */
function wrapNarrationSpan(span) {
    const lead = span.match(/^\s*/)[0];
    const trail = span.match(/\s*$/)[0];
    const core = span.slice(lead.length, span.length - trail.length);
    if (!core) return span;
    return `${lead}*${core}*${trail}`;
}

/**
 * Wrap the narration core of a single line in asterisks, leaving any quoted
 * dialogue untouched. Surrounding whitespace is preserved so paragraph shape
 * and spacing around dialogue survive.
 */
function wrapNarrationLine(line) {
    if (!line.trim()) return line;

    // Match balanced quote pairs (straight or curly). Everything between/around
    // them is narration.
    const quoteRe = /["“][^"”]*["”]/g;
    let result = '';
    let lastIndex = 0;
    let match;
    while ((match = quoteRe.exec(line)) !== null) {
        result += wrapNarrationSpan(line.slice(lastIndex, match.index));
        result += match[0];
        lastIndex = quoteRe.lastIndex;
    }
    result += wrapNarrationSpan(line.slice(lastIndex));
    return result;
}

/** Collapse runs of blank lines to a single blank line, and trim trailing spaces per line. */
function collapseBlankLines(text) {
    return text
        .split('\n')
        .map(line => line.replace(/[ \t]+$/, ''))
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/**
 * Apply the Rules engine. Asterisk handling is one mutually-exclusive mode:
 *   - 'none'  — leave asterisks alone;
 *   - 'strip' — remove every asterisk;
 *   - 'wrap'  — strip, then wrap each line's narration (everything outside
 *               quoted dialogue) in asterisks, so the output is canonical
 *               whatever the input's markers were and never doubles them.
 * Whitespace collapsing is independent and applies on top of any mode.
 *
 * @param {string} text
 * @param {{ asteriskMode?: 'none'|'strip'|'wrap', collapseWhitespace?: boolean }} [rules]
 * @returns {string}
 */
export function applyReformatRules(text, { asteriskMode = 'strip', collapseWhitespace = false } = {}) {
    let out = text;
    if (asteriskMode === 'strip') {
        out = stripAsterisks(out);
    } else if (asteriskMode === 'wrap') {
        out = stripAsterisks(out).split('\n').map(wrapNarrationLine).join('\n');
    }
    if (collapseWhitespace) out = collapseBlankLines(out);
    return out;
}
