import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    fingerprintPreset,
    seedBuiltinPresets,
    setupToolPresets,
    activateToolPreset,
} from '../src/prompt-templates.js';
import { TOOLS, clone, installFakeDom } from './helpers.mjs';

const WIA_KEYS = TOOLS.find(t => t.toolKey === 'wia').fields.map(f => f.key);

// ─── fingerprintPreset ───

test('fingerprintPreset is stable, order-independent, and ignores the response length', () => {
    const a = { wiaPrompt: 'p', wiaPrefillTitled: 't', wiaPrefillUntitled: 'u' };
    const b = { wiaPrefillUntitled: 'u', wiaPrompt: 'p', wiaPrefillTitled: 't', responseLength: 900 };
    assert.match(fingerprintPreset(a, WIA_KEYS), /^[0-9a-f]{8}$/);
    assert.equal(fingerprintPreset(a, WIA_KEYS), fingerprintPreset(b, WIA_KEYS));
    assert.notEqual(fingerprintPreset(a, WIA_KEYS), fingerprintPreset({ ...a, wiaPrompt: 'q' }, WIA_KEYS));
    // A missing field counts as empty.
    assert.equal(
        fingerprintPreset({ wiaPrompt: 'p' }, WIA_KEYS),
        fingerprintPreset({ wiaPrompt: 'p', wiaPrefillTitled: '', wiaPrefillUntitled: '' }, WIA_KEYS),
    );
});

// ─── seedBuiltinPresets ───

const V1 = { wiaPrompt: 'old prompt', wiaPrefillTitled: 'old titled', wiaPrefillUntitled: 'old untitled' };
const V2 = { wiaPrompt: 'new prompt', wiaPrefillTitled: 'new titled', wiaPrefillUntitled: 'new untitled', responseLength: 800 };
const EXTRA = { wiaPrompt: 'extra', wiaPrefillTitled: '', wiaPrefillUntitled: '' };

const spec = {
    id: 'test',
    version: 2,
    legacyFlag: 'testSeeded',
    presets: { wia: { Scenario: V2, Extra: EXTRA } },
    introduced: { wia: { Extra: 2 } },
    retired: { wia: { Scenario: [fingerprintPreset(V1, WIA_KEYS)] } },
};

/** Settings as a v1 install left them: the v1 preset seeded, flagged the old way. */
function v1Install(extra = {}) {
    return {
        testSeeded: true,
        toolPresets: { wia: { Scenario: { ...V1 } } },
        activeToolPreset: { wia: '__default__' },
        ...extra,
    };
}

test('a fresh install gets every built-in and keeps its active preset', () => {
    const settings = { activeToolPreset: { wia: '__default__' } };
    assert.equal(seedBuiltinPresets(settings, TOOLS, spec), true);
    assert.deepEqual(settings.toolPresets.wia, { Scenario: V2, Extra: EXTRA });
    assert.equal(settings.activeToolPreset.wia, '__default__');
    assert.equal(settings.builtinPresetVersions.test, 2);
    assert.equal(seedBuiltinPresets(settings, TOOLS, spec), false, 'a second run changes nothing');
});

test('a fresh install never overwrites a user preset with the same name', () => {
    const mine = { wiaPrompt: 'mine' };
    const settings = { toolPresets: { wia: { Scenario: mine } } };
    seedBuiltinPresets(settings, TOOLS, spec);
    assert.equal(settings.toolPresets.wia.Scenario, mine);
});

test('an upgrade replaces unedited built-ins and adds newly introduced ones', () => {
    const settings = v1Install();
    assert.equal(seedBuiltinPresets(settings, TOOLS, spec), true);
    assert.deepEqual(settings.toolPresets.wia.Scenario, V2);
    assert.deepEqual(settings.toolPresets.wia.Extra, EXTRA);
    assert.equal(settings.builtinPresetVersions.test, 2);
});

test('an upgrade keeps edited built-ins and never recreates deleted ones', () => {
    const edited = v1Install();
    edited.toolPresets.wia.Scenario.wiaPrompt += ' (my edit)';
    seedBuiltinPresets(edited, TOOLS, spec);
    assert.equal(edited.toolPresets.wia.Scenario.wiaPrompt, 'old prompt (my edit)');

    const deleted = v1Install();
    delete deleted.toolPresets.wia.Scenario;
    seedBuiltinPresets(deleted, TOOLS, spec);
    assert.equal(deleted.toolPresets.wia.Scenario, undefined);
});

test('an upgrade keeps a built-in whose saved response length was changed', () => {
    const settings = v1Install();
    settings.toolPresets.wia.Scenario.responseLength = 1200;
    seedBuiltinPresets(settings, TOOLS, spec);
    assert.equal(settings.toolPresets.wia.Scenario.wiaPrompt, 'old prompt');
});

test('an upgrade also moves the live fields of an active, unedited built-in', () => {
    const settings = v1Install({ ...V1, wiaResponseLength: 600 });
    settings.activeToolPreset.wia = 'Scenario';
    seedBuiltinPresets(settings, TOOLS, spec);
    assert.equal(settings.wiaPrompt, 'new prompt');
    assert.equal(settings.wiaPrefillUntitled, 'new untitled');
    assert.equal(settings.wiaResponseLength, 800);
    assert.equal(settings.activeToolPreset.wia, 'Scenario');
});

test('an upgrade leaves edited live fields alone', () => {
    const settings = v1Install({ ...V1, wiaPrompt: 'tweaked', wiaResponseLength: 600 });
    settings.activeToolPreset.wia = 'Scenario';
    seedBuiltinPresets(settings, TOOLS, spec);
    assert.equal(settings.wiaPrompt, 'tweaked');
    assert.equal(settings.wiaResponseLength, 600);
    assert.deepEqual(settings.toolPresets.wia.Scenario, V2, 'the stored preset is still upgraded');
});

// ─── Per-preset response length ───

function setupWia(settings) {
    const wia = TOOLS.find(t => t.toolKey === 'wia');
    setupToolPresets({ ...wia, label: 'World Info Assist', containerId: 'none', settings, saveSettings: () => {} });
}

function lengthSettings() {
    return {
        ...clone(V1),
        wiaResponseLength: 600,
        toolPresets: { wia: { Long: clone(V2), Plain: { ...clone(V1), wiaPrompt: 'plain' } } },
        activeToolPreset: { wia: '__default__' },
    };
}

test('loading a preset applies its response length to settings and every bound input', () => {
    const { inputs, confirms } = installFakeDom();
    const settings = lengthSettings();
    // Start from the Default preset with untouched fields (these test
    // fields have no default text, so "untouched" means unset).
    for (const key of WIA_KEYS) delete settings[key];
    setupWia(settings);
    assert.equal(activateToolPreset('wia', 'Long'), true);
    assert.equal(settings.wiaPrompt, 'new prompt');
    assert.equal(settings.wiaResponseLength, 800);
    assert.equal(inputs.get('#wia_response_length').value, '800');
    assert.equal(inputs.get('.wia-tokens-input').value, '800');
    assert.equal(confirms.length, 0);
});

test('a preset without a response length leaves the length alone', () => {
    installFakeDom();
    const settings = lengthSettings();
    settings.activeToolPreset.wia = 'Long';
    Object.assign(settings, clone(V1), { wiaPrompt: 'new prompt', wiaPrefillTitled: 'new titled', wiaPrefillUntitled: 'new untitled' });
    settings.wiaResponseLength = 800;
    setupWia(settings);
    assert.equal(activateToolPreset('wia', 'Plain'), true);
    assert.equal(settings.wiaPrompt, 'plain');
    assert.equal(settings.wiaResponseLength, 800);
});

test('a changed response length counts as unsaved changes to the active preset', () => {
    const { confirms } = installFakeDom({ confirmAnswer: false });
    const settings = lengthSettings();
    settings.activeToolPreset.wia = 'Long';
    Object.assign(settings, clone(V1), { wiaPrompt: 'new prompt', wiaPrefillTitled: 'new titled', wiaPrefillUntitled: 'new untitled' });
    settings.wiaResponseLength = 950; // the preset says 800
    setupWia(settings);
    assert.equal(activateToolPreset('wia', 'Plain'), false, 'refused at the discard prompt');
    assert.equal(confirms.length, 1);
    assert.equal(settings.activeToolPreset.wia, 'Long');
});

test('the Default preset never counts the response length as modified', () => {
    const { confirms } = installFakeDom();
    const settings = lengthSettings();
    for (const key of WIA_KEYS) delete settings[key];
    settings.wiaResponseLength = 1234;
    setupWia(settings);
    assert.equal(activateToolPreset('wia', 'Plain'), true);
    assert.equal(confirms.length, 0);
});
