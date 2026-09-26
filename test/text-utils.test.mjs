import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyTemplateMacros, stripPrefillEcho } from '../src/text-utils.js';

test('applyTemplateMacros substitutes placeholders and reports which were present', () => {
    const { text, used } = applyTemplateMacros('A {{context}} B {{ Guidance }} C', {
        context: 'ctx',
        guidance: 'g',
        title: 't',
    });
    assert.equal(text, 'A ctx B g C');
    assert.deepEqual([...used].sort(), ['context', 'guidance']);
});

test('applyTemplateMacros inserts values literally', () => {
    const { text } = applyTemplateMacros('{{context}}', { context: 'cost: $& and $1' });
    assert.equal(text, 'cost: $& and $1');
});

test('applyTemplateMacros leaves escaped braces and ST macros alone', () => {
    const template = '\\{\\{context\\}\\} {{.sableClothingOverride = coat}} {{char}}';
    const { text, used } = applyTemplateMacros(template, { context: 'X' });
    assert.equal(text, template);
    assert.equal(used.size, 0);
});

test('stripPrefillEcho removes a full-prefill echo', () => {
    assert.equal(stripPrefillEcho('[\nScenario Title: Dawn;\nContext: x', '[\nScenario Title: '), 'Dawn;\nContext: x');
});

test('stripPrefillEcho removes an echo of the prefill\'s last line', () => {
    const prefill = '[Factual entry.\n\nThe Keep: ';
    assert.equal(stripPrefillEcho('The Keep: a fortress', prefill), 'a fortress');
});

test('stripPrefillEcho leaves output that does not echo the prefill', () => {
    assert.equal(stripPrefillEcho('a fortress', '[Title: '), 'a fortress');
    assert.equal(stripPrefillEcho('a fortress', ''), 'a fortress');
    // Too short to be a reliable echo.
    assert.equal(stripPrefillEcho('[ a', '['), '[ a');
});
