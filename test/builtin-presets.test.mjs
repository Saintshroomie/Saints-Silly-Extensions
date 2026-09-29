// The built-in presets that ship: their prompt text, and upgrading real v1
// installs (test/fixtures/builtin-presets-v1.json holds what v1 shipped).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fingerprintPreset, seedBuiltinPresets } from '../src/prompt-templates.js';
import { applyTemplateMacros } from '../src/text-utils.js';
import { TOOLKIT_PRESETS_SPEC } from '../src/toolkit-presets.js';
import { IMAGE_PROMPT_PRESETS_SPEC } from '../src/image-prompt-presets.js';
import { TOOLS, clone } from './helpers.mjs';

const readFixture = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const V1 = readFixture('builtin-presets-v1.json');
const V2 = readFixture('builtin-presets-v2.json');
const SPECS = { toolkit: TOOLKIT_PRESETS_SPEC, 'image-prompt': IMAGE_PROMPT_PRESETS_SPEC };
const EXTENSION_PLACEHOLDERS = ['context', 'guidance', 'title', 'themes', 'longGuidance'];

function* builtins(spec) {
    for (const [toolKey, presets] of Object.entries(spec.presets)) {
        for (const [name, preset] of Object.entries(presets)) yield { toolKey, name, preset };
    }
}

/** What reaches the model: extension placeholders filled, then ST's brace unescape. */
function asSentToModel(template) {
    const macros = Object.fromEntries(EXTENSION_PLACEHOLDERS.map(key => [key, '']));
    return applyTemplateMacros(template, macros).text.replace(/\\([{}])/g, '$1');
}

/** A `{{` that ST's macro engine would run (not escaped as `\{\{`). */
function hasLiveMacro(text) {
    return /(?<!\\)\{(?<!\\)\{/.test(applyTemplateMacros(text, Object.fromEntries(
        EXTENSION_PLACEHOLDERS.map(key => [key, '']))).text);
}

test('built-in prompt templates contain no macros SillyTavern would run', () => {
    for (const spec of Object.values(SPECS)) {
        for (const { toolKey, name, preset } of builtins(spec)) {
            for (const [key, text] of Object.entries(preset)) {
                if (typeof text !== 'string' || /Injection/.test(key)) continue;
                // WIA prefills may use WIA's own {{title}}; nothing else.
                const checked = /Prefill/.test(key) ? text.replace(/\{\{title\}\}/g, '') : text;
                assert.ok(!hasLiveMacro(checked), `${toolKey} / ${name} / ${key} has a live macro`);
            }
        }
    }
});

test('the cold-open scenario shows the model its override syntax', () => {
    const prompt = asSentToModel(TOOLKIT_PRESETS_SPEC.presets.wia['Scenario (Cold-open)'].wiaPrompt);
    assert.match(prompt, /\{\{\.<firstName>ClothingOverride = <scene-specific clothing>\}\}/);
    assert.match(prompt, /\{\{\.sableTrueGoalOverride = /);
});

test('the cold-open scenario assigns every override set-once', () => {
    const prompt = asSentToModel(TOOLKIT_PRESETS_SPEC.presets.wia['Scenario (Cold-open)'].wiaPrompt);
    const assignments = [...prompt.matchAll(/^\{\{.*\{\{\.([<>A-Za-z]+) = .*$/gm)];
    assert.ok(assignments.length >= 6);
    for (const [line, variable] of assignments) {
        assert.ok(line.startsWith(`{{if !.${variable}}}{{.${variable} = `) && line.endsWith('}}{{/if}}'), line);
    }
});

test('scenario presets stop at the closing bracket: no Openings block', () => {
    for (const { name, preset } of builtins(TOOLKIT_PRESETS_SPEC)) {
        for (const text of Object.values(preset)) {
            if (typeof text !== 'string') continue;
            assert.doesNotMatch(text, /openingSpeaker|lastCharMessage|\[Opening:/, name);
        }
    }
});

test('every built-in carries a response length where its tool has one', () => {
    for (const { toolKey, name, preset } of builtins(TOOLKIT_PRESETS_SPEC)) {
        assert.ok(TOOLS.find(t => t.toolKey === toolKey), `${toolKey} is a known tool`);
        assert.ok(Number.isInteger(preset.responseLength) && preset.responseLength > 0, name);
    }
});

test('built-ins only use their tool\'s prompt fields', () => {
    for (const spec of Object.values(SPECS)) {
        for (const { toolKey, name, preset } of builtins(spec)) {
            const keys = TOOLS.find(t => t.toolKey === toolKey).fields.map(f => f.key);
            for (const key of Object.keys(preset)) {
                assert.ok(key === 'responseLength' || keys.includes(key), `${toolKey} / ${name}: ${key}`);
            }
        }
    }
});

test('retired fingerprints match the texts earlier versions actually shipped', () => {
    for (const [id, spec] of Object.entries(SPECS)) {
        for (const [toolKey, retired] of Object.entries(spec.retired || {})) {
            const keys = TOOLS.find(t => t.toolKey === toolKey).fields.map(f => f.key);
            for (const [name, fingerprints] of Object.entries(retired)) {
                const shipped = [V1, V2].map(fixture => fixture[id]?.[toolKey]?.[name]).filter(Boolean);
                assert.ok(shipped.length > 0, `${id}: ${toolKey} / ${name} has a fixture`);
                for (const preset of shipped) {
                    assert.ok(fingerprints.includes(fingerprintPreset(preset, keys)), `${id}: ${toolKey} / ${name}`);
                }
            }
        }
    }
});

test('an untouched v2 Cold-open upgrades to the set-once text', () => {
    const current = TOOLKIT_PRESETS_SPEC.presets;
    const toolPresets = clone(current);
    toolPresets.wia['Scenario (Cold-open)'] = clone(V2.toolkit.wia['Scenario (Cold-open)']);
    const settings = { builtinPresetVersions: { toolkit: 2 }, toolPresets };
    assert.equal(seedBuiltinPresets(settings, TOOLS, TOOLKIT_PRESETS_SPEC), true);
    assert.deepEqual(settings.toolPresets.wia['Scenario (Cold-open)'], current.wia['Scenario (Cold-open)']);
});

test('an untouched v1 toolkit install upgrades to the current built-ins', () => {
    const settings = { scenarioPresetsSeeded: true, toolPresets: clone(V1.toolkit) };
    assert.equal(seedBuiltinPresets(settings, TOOLS, TOOLKIT_PRESETS_SPEC), true);
    for (const { toolKey, name, preset } of builtins(TOOLKIT_PRESETS_SPEC)) {
        assert.deepEqual(settings.toolPresets[toolKey][name], preset, `${toolKey} / ${name}`);
    }
});

test('an untouched v1 Image Prompting install picks up the negative prompts', () => {
    const settings = { imagePromptPresetsSeeded: true, toolPresets: clone(V1['image-prompt']) };
    assert.equal(seedBuiltinPresets(settings, TOOLS, IMAGE_PROMPT_PRESETS_SPEC), true);
    for (const { name, preset } of builtins(IMAGE_PROMPT_PRESETS_SPEC)) {
        assert.deepEqual(settings.toolPresets['image-prompt'][name], preset, name);
        assert.ok(preset.imagePromptNegative, `${name} ships a negative prompt`);
    }
});
