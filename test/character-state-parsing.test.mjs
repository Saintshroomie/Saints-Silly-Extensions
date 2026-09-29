import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    findVariableReads,
    discoverVariables,
    variablePrefix,
    humanizeVariableName,
    formatVariablesBlock,
    parseStateReply,
} from '../src/character-state-parsing.js';

// Lines from st-toolkit cards (public layer + private book).
const PUBLIC = `[
Character Name: Mary Jane Watson-Parker ("MJ");
Clothing: {{ .mjClothingOverride ?? Cropped black leather jacket over a white fitted tee, ankle boots }};
Stated Goal: {{ .mjStatedGoalOverride ?? Build her career one booking at a time }};
]`;
const PRIVATE = `[
Private Mind — Mary Jane Watson-Parker: known only to MJ;
True Goal: {{ .mjTrueGoalOverride ?? Keep Harry in her life without deciding yet what that means }};
]`;

test('findVariableReads finds st-toolkit override reads with their defaults and labels', () => {
    assert.deepEqual(findVariableReads(PUBLIC), [
        { name: 'mjClothingOverride', defaultValue: 'Cropped black leather jacket over a white fitted tee, ankle boots', label: 'Clothing' },
        { name: 'mjStatedGoalOverride', defaultValue: 'Build her career one booking at a time', label: 'Stated Goal' },
    ]);
});

test('findVariableReads accepts ||, bare reads, getvar, and a label after a semicolon', () => {
    const reads = findVariableReads('[Mood: {{.mood || calm}}; Hair: {{.hair}}] {{getvar::scar}}');
    assert.deepEqual(reads, [
        { name: 'mood', defaultValue: 'calm', label: 'Mood' },
        { name: 'hair', defaultValue: null, label: 'Hair' },
        { name: 'scar', defaultValue: null, label: null },
    ]);
});

test('findVariableReads keeps a default that contains a nested macro', () => {
    const [read] = findVariableReads('Clothing: {{ .x ?? {{char}}\'s old coat }};');
    assert.equal(read.defaultValue, '{{char}}\'s old coat');
});

test('findVariableReads skips assignments and comparisons', () => {
    const text = [
        '{{if !.a}}{{.a = set}}{{/if}}',
        '{{.b ??= once}}',
        '{{.c += 1}}',
        '{{if {{.openingSpeaker == MJ}}}}x{{/if}}',
        '{{.d++}}',
    ].join('\n');
    assert.deepEqual(findVariableReads(text), []);
});

test('findVariableReads keeps the first default and label for a repeated read', () => {
    const reads = findVariableReads('Clothing: {{.x ?? first}}\n{{.x ?? second}}');
    assert.deepEqual(reads, [{ name: 'x', defaultValue: 'first', label: 'Clothing' }]);
});

test('findVariableReads survives unbalanced braces', () => {
    assert.deepEqual(findVariableReads('Clothing: {{.x ?? coat}} and then {{ broken'), [
        { name: 'x', defaultValue: 'coat', label: 'Clothing' },
    ]);
});

test('discoverVariables merges sources in order and records where each was found', () => {
    const vars = discoverVariables([
        { source: 'card', text: PUBLIC },
        { source: 'lore', book: 'Spider-Man - MJ (private)', text: PRIVATE },
        { source: 'lore', book: 'Other', text: 'Clothing: {{.mjClothingOverride ?? ignored}}' },
    ]);
    assert.deepEqual(vars.map(v => [v.name, v.source, v.book]), [
        ['mjClothingOverride', 'card', null],
        ['mjStatedGoalOverride', 'card', null],
        ['mjTrueGoalOverride', 'lore', 'Spider-Man - MJ (private)'],
    ]);
    assert.equal(vars[0].defaultValue, 'Cropped black leather jacket over a white fitted tee, ankle boots');
});

test('variablePrefix follows st-toolkit\'s first-name rule', () => {
    assert.equal(variablePrefix('Sable Voss'), 'sable');
    assert.equal(variablePrefix('MJ'), 'mj');
    assert.equal(variablePrefix('Peter'), 'peter');
    assert.equal(variablePrefix(''), '');
});

test('humanizeVariableName drops the prefix and Override suffix', () => {
    assert.equal(humanizeVariableName('peterTrueGoalOverride', 'Peter Parker'), 'True Goal');
    assert.equal(humanizeVariableName('mjClothingOverride', 'MJ'), 'Clothing');
    assert.equal(humanizeVariableName('mood_level', 'Peter'), 'Mood Level');
    assert.equal(humanizeVariableName('peterOverride', 'Peter'), 'Peter Override');
});

test('formatVariablesBlock shows the set value or the card default', () => {
    const block = formatVariablesBlock([
        { name: 'a', label: 'Clothing', value: 'wetsuit', isSet: true, defaultValue: 'coat' },
        { name: 'b', label: 'Goal', value: '', isSet: false, defaultValue: 'win' },
        { name: 'c', label: 'Mood', value: '', isSet: false, defaultValue: null },
    ]);
    assert.equal(block, '- a (Clothing): wetsuit\n- b (Goal): win (card default)\n- c (Mood): (unset, no default)');
});

const VARS = [
    { name: 'mjClothingOverride', label: 'Clothing' },
    { name: 'mjStatedGoalOverride', label: 'Stated Goal' },
    { name: 'mjTrueGoalOverride', label: 'True Goal' },
];

test('parseStateReply reads name: value lines', () => {
    assert.deepEqual(parseStateReply('mjClothingOverride: Emerald bikini, sheer rash guard\n', VARS), [
        { name: 'mjClothingOverride', value: 'Emerald bikini, sheer rash guard' },
    ]);
});

test('parseStateReply tolerates list markers, dots, emphasis, labels, and =', () => {
    const reply = [
        'Here are the updates:',
        '- **mjClothingOverride**: Wetsuit;',
        '2. .mjStatedGoalOverride (Stated Goal) = Feed the stingrays',
        'True Goal: "Get Peter to unplug"',
    ].join('\n');
    assert.deepEqual(parseStateReply(reply, VARS), [
        { name: 'mjClothingOverride', value: 'Wetsuit' },
        { name: 'mjStatedGoalOverride', value: 'Feed the stingrays' },
        { name: 'mjTrueGoalOverride', value: 'Get Peter to unplug' },
    ]);
});

test('parseStateReply ignores unknown names, no-change values, and NO CHANGES', () => {
    const reply = 'Note: nothing much\nmjClothingOverride: unchanged\nmjTrueGoalOverride: (no change)\nNO CHANGES';
    assert.deepEqual(parseStateReply(reply, VARS), []);
});

test('parseStateReply only accepts a label that names one variable', () => {
    const dup = [{ name: 'a', label: 'Goal' }, { name: 'b', label: 'Goal' }];
    assert.deepEqual(parseStateReply('Goal: win', dup), []);
});

test('parseStateReply keeps the last line for a variable', () => {
    assert.deepEqual(parseStateReply('mjClothingOverride: a\nmjclothingoverride: b', VARS), [
        { name: 'mjClothingOverride', value: 'b' },
    ]);
});
