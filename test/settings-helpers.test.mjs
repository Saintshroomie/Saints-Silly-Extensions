import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    templateSetting,
    textSetting,
    parsePositiveInt,
    positiveIntSetting,
} from '../src/settings-helpers.js';

test('templateSetting falls back for a missing, non-string, or blank template', () => {
    assert.equal(templateSetting({ p: 'Write it.' }, 'p', 'D'), 'Write it.');
    assert.equal(templateSetting({ p: '   \n' }, 'p', 'D'), 'D');
    assert.equal(templateSetting({ p: '' }, 'p', 'D'), 'D');
    assert.equal(templateSetting({ p: 3 }, 'p', 'D'), 'D');
    assert.equal(templateSetting({}, 'p', 'D'), 'D');
    assert.equal(templateSetting(null, 'p', 'D'), 'D');
});

test('textSetting keeps an emptied prefill instead of restoring the default', () => {
    assert.equal(textSetting({ p: '' }, 'p', '[\nName: '), '');
    assert.equal(textSetting({ p: '  ' }, 'p', 'D'), '  ');
    assert.equal(textSetting({ p: 'x' }, 'p', 'D'), 'x');
    assert.equal(textSetting({}, 'p', 'D'), 'D');
    assert.equal(textSetting({ p: null }, 'p', 'D'), 'D');
});

test('parsePositiveInt accepts positive integers from inputs and numbers only', () => {
    assert.equal(parsePositiveInt('300'), 300);
    assert.equal(parsePositiveInt(' 42 '), 42);
    assert.equal(parsePositiveInt(7), 7);
    assert.equal(parsePositiveInt(7.9), 7);
    assert.equal(parsePositiveInt('0'), null);
    assert.equal(parsePositiveInt(-5), null);
    assert.equal(parsePositiveInt(''), null);
    assert.equal(parsePositiveInt('abc'), null);
    assert.equal(parsePositiveInt(undefined), null);
    assert.equal(parsePositiveInt(NaN), null);
});

test('positiveIntSetting falls back unless the stored value is a positive integer', () => {
    assert.equal(positiveIntSetting({ n: 500 }, 'n', 1000), 500);
    assert.equal(positiveIntSetting({ n: 0 }, 'n', 1000), 1000);
    assert.equal(positiveIntSetting({ n: '12' }, 'n', 1000), 12);
    assert.equal(positiveIntSetting({}, 'n', 1000), 1000);
});
