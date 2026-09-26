// Shared test helpers.

// The prompt field keys and length settings of the tools the built-in presets
// target, mirroring TOOL_PRESET_CONFIG in src/index.js (which imports
// SillyTavern, so tests can't load it).
export const TOOLS = [
    {
        toolKey: 'wia',
        fields: [{ key: 'wiaPrompt' }, { key: 'wiaPrefillTitled' }, { key: 'wiaPrefillUntitled' }],
        responseLength: { key: 'wiaResponseLength', inputSelector: '#wia_response_length, .wia-tokens-input' },
    },
    {
        toolKey: 'ng-long',
        fields: [
            { key: 'narrativeGuidanceLongPrompt' },
            { key: 'narrativeGuidanceLongGenerationPrompt' },
            { key: 'narrativeGuidanceLongInjectionPrompt' },
        ],
        responseLength: { key: 'narrativeGuidanceLongResponseLength', inputSelector: '#ng_long_response_length' },
    },
    {
        toolKey: 'ng-short',
        fields: [
            { key: 'narrativeGuidanceShortPrompt' },
            { key: 'narrativeGuidanceShortGenerationPrompt' },
            { key: 'narrativeGuidanceShortInjectionPrompt' },
        ],
        responseLength: { key: 'narrativeGuidanceShortResponseLength', inputSelector: '#ng_short_response_length' },
    },
    {
        toolKey: 'compaction',
        fields: [{ key: 'compactionSummaryPrompt' }, { key: 'compactionSummaryPrefill' }],
        responseLength: { key: 'compactionSummaryResponseLength', inputSelector: '#compaction_response_length, #cc_response_length' },
    },
    {
        toolKey: 'image-prompt',
        fields: [{ key: 'imagePromptPrompt' }, { key: 'imagePromptPrefill' }, { key: 'imagePromptNegative' }],
        responseLength: { key: 'imagePromptResponseLength', inputSelector: '#ip_response_length' },
    },
];

export const clone = value => JSON.parse(JSON.stringify(value));

/**
 * Install a minimal `document` / `window` for prompt-templates.js: no
 * textareas or settings containers (so presets load straight into settings),
 * plus fake inputs matched by selector for the response-length fields.
 * Returns the inputs and a log of confirm() prompts.
 */
export function installFakeDom({ confirmAnswer = true } = {}) {
    const inputs = new Map(); // selector part -> { value }
    const confirms = [];
    globalThis.document = {
        getElementById: () => null,
        addEventListener: () => {},
        querySelectorAll: selector => selector.split(',')
            .map(part => part.trim())
            .map(part => {
                if (!inputs.has(part)) inputs.set(part, { value: '' });
                return inputs.get(part);
            }),
    };
    globalThis.window = {
        confirm: message => {
            confirms.push(message);
            return confirmAnswer;
        },
    };
    return { inputs, confirms };
}
