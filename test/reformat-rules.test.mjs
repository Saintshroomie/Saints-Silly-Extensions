import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyReformatRules } from '../src/reformat-rules.js';

const wrap = text => applyReformatRules(text, { asteriskMode: 'wrap' });

test('strip removes every asterisk', () => {
    assert.equal(applyReformatRules('*She waves.* "Hi!" **bold**'), 'She waves. "Hi!" bold');
});

test('none leaves the text alone', () => {
    const text = '*She waves.*   \n\n\n\n"Hi!"';
    assert.equal(applyReformatRules(text, { asteriskMode: 'none' }), text);
});

test('wrap puts narration in asterisks and leaves dialogue bare', () => {
    assert.equal(
        wrap('She waves. "Hi there!" She grins.'),
        '*She waves.* "Hi there!" *She grins.*',
    );
    assert.equal(wrap('“Curly,” he says.'), '“Curly,” *he says.*');
    assert.equal(wrap('"Only dialogue."'), '"Only dialogue."');
});

test('wrap is canonical: re-wrapping or pre-marked input changes nothing', () => {
    const once = wrap('He sighs. "Fine." *Already italic* narration.');
    assert.equal(wrap(once), once);
    assert.equal(once, '*He sighs.* "Fine." *Already italic narration.*');
});

test('wrap keeps line breaks, blank lines and surrounding spaces', () => {
    assert.equal(wrap('Line one.\n\n  "Two."  after'), '*Line one.*\n\n  "Two."  *after*');
});

test('collapse whitespace trims line ends and squeezes blank-line runs', () => {
    assert.equal(
        applyReformatRules('A  \n\n\n\nB\t\n', { asteriskMode: 'none', collapseWhitespace: true }),
        'A\n\nB',
    );
});

test('already-formatted text comes back identical (no swipe for a no-op)', () => {
    const text = 'She waves. "Hi!"\n\nHe nods.';
    assert.equal(applyReformatRules(text, { collapseWhitespace: true }), text);
});
