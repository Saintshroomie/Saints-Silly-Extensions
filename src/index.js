// Saint's Silly Extensions — Possession, Phrasing, and Assisted Character Creation
// Allows the user to "possess" a character, enrich messages with AI narration, and create characters with LLM assistance.

import './style.css';
import settingsHtml from './settings.html';
import {
    getContext,
    createDebugLogger,
    loadExtensionSettings,
    saveExtensionSettings,
} from './utils.js';
import {
    initSilentGeneration,
    bindSilentGenerationSettings,
} from './silent-generation.js';
import {
    initPossession,
    isPossessing,
    getPossessedCharName,
    postPossessedMessage,
    loadPossessionState,
    syncAllPossessionUI,
    attachContinueInterceptor,
    onMessageSent,
    bindPossessionSettings,
    registerPossessionSlashCommands,
    onGenerationStarted as possessionGenStarted,
    onGenerationEnded as possessionGenEnded,
    onGroupUpdated,
    onCharacterPageLoaded,
    onGroupWrapperFinished,
    showPossessionImpersonateButton,
} from './possession.js';
import {
    initPhrasing,
    isPhrasing,
    handlePhrasingSeedReinjection,
    applyPhrasingEnabledState,
    createInputAreaButton,
    createHamburgerMenuItem,
    bindPhrasingSettings,
    registerPhrasingSlashCommand,
    onGenerationStarted as phrasingGenStarted,
    onGenerationEnded as phrasingGenEnded,
    DEFAULT_PHRASING_PROMPT,
    DEFAULT_PHRASING_INVERSE_PROMPT,
} from './phrasing.js';
import {
    initACC,
    onCharacterPageLoaded as accOnCharacterPageLoaded,
    bindACCSettings,
    DEFAULT_ACC_PROMPT,
    DEFAULT_ACC_PREFILL,
    DEFAULT_ACC_RESPONSE_LENGTH,
} from './assisted-character-creation.js';
import {
    initWIA,
    startWIAObserver,
    bindWIASettings,
    DEFAULT_WIA_PROMPT,
    DEFAULT_WIA_PREFILL_TITLED,
    DEFAULT_WIA_PREFILL_UNTITLED,
    DEFAULT_WIA_RESPONSE_LENGTH,
} from './world-info-assist.js';
import {
    initNarrativeGuidance,
    bindNarrativeGuidanceSettings,
    onNarrativeGuidanceChatChanged,
    onNarrativeGuidanceMessageSent,
    onNarrativeGuidanceMessageReceived,
    migrateNarrativeGuidanceSettings,
    DEFAULT_NG_LONG_USER_PROMPT,
    DEFAULT_NG_SHORT_USER_PROMPT,
    DEFAULT_NG_LONG_GENERATION_PROMPT,
    DEFAULT_NG_SHORT_GENERATION_PROMPT,
    DEFAULT_NG_LONG_INJECTION_PROMPT,
    DEFAULT_NG_SHORT_INJECTION_PROMPT,
    DEFAULT_NG_LONG_TURN_COUNT,
    DEFAULT_NG_SHORT_TURN_COUNT,
    DEFAULT_NG_INJECTION_DEPTH,
    DEFAULT_NG_INJECTION_ROLE,
    DEFAULT_NG_RESPONSE_LENGTH,
} from './narrative-guidance.js';
import {
    setupToolPresets,
    migrateLegacyToolPresets,
} from './prompt-templates.js';

// ─── Constants ───

const EXTENSION_NAME = 'Saints-Silly-Extensions';

const defaultSettings = {
    possessionEnabled: true,
    possessionShowToast: true,
    possessionDebugMode: false,
    phrasingEnabled: true,
    phrasingDebugMode: false,
    phrasingInverseGuidance: false,
    phrasingPrompt: DEFAULT_PHRASING_PROMPT,
    phrasingInversePrompt: DEFAULT_PHRASING_INVERSE_PROMPT,
    accEnabled: true,
    accDebugMode: false,
    accPrompt: DEFAULT_ACC_PROMPT,
    accPrefill: DEFAULT_ACC_PREFILL,
    accResponseLength: DEFAULT_ACC_RESPONSE_LENGTH,
    accMaxContextOverride: 0,
    wiaEnabled: true,
    wiaDebugMode: false,
    wiaPrompt: DEFAULT_WIA_PROMPT,
    wiaPrefillTitled: DEFAULT_WIA_PREFILL_TITLED,
    wiaPrefillUntitled: DEFAULT_WIA_PREFILL_UNTITLED,
    wiaResponseLength: DEFAULT_WIA_RESPONSE_LENGTH,
    wiaMaxContextOverride: 0,
    narrativeGuidanceDebugMode: false,
    // Long-term track — the overarching arc on a slow refresh horizon.
    narrativeGuidanceLongEnabled: false,
    narrativeGuidanceLongAutoRegen: true,
    narrativeGuidanceLongPrompt: DEFAULT_NG_LONG_USER_PROMPT,
    narrativeGuidanceLongGenerationPrompt: DEFAULT_NG_LONG_GENERATION_PROMPT,
    narrativeGuidanceLongInjectionPrompt: DEFAULT_NG_LONG_INJECTION_PROMPT,
    narrativeGuidanceLongDefaultTurnCount: DEFAULT_NG_LONG_TURN_COUNT,
    narrativeGuidanceLongResponseLength: DEFAULT_NG_RESPONSE_LENGTH,
    narrativeGuidanceLongMaxContextOverride: 0,
    narrativeGuidanceLongInjectionDepth: DEFAULT_NG_INJECTION_DEPTH,
    narrativeGuidanceLongInjectionRole: DEFAULT_NG_INJECTION_ROLE,
    narrativeGuidanceLongLoreBookNames: [],
    // Short-term track — the immediate beats on a fast refresh horizon,
    // seeded with the active long-term arc.
    narrativeGuidanceShortEnabled: false,
    narrativeGuidanceShortAutoRegen: true,
    narrativeGuidanceShortPrompt: DEFAULT_NG_SHORT_USER_PROMPT,
    narrativeGuidanceShortGenerationPrompt: DEFAULT_NG_SHORT_GENERATION_PROMPT,
    narrativeGuidanceShortInjectionPrompt: DEFAULT_NG_SHORT_INJECTION_PROMPT,
    narrativeGuidanceShortDefaultTurnCount: DEFAULT_NG_SHORT_TURN_COUNT,
    narrativeGuidanceShortResponseLength: DEFAULT_NG_RESPONSE_LENGTH,
    narrativeGuidanceShortMaxContextOverride: 0,
    narrativeGuidanceShortInjectionDepth: DEFAULT_NG_INJECTION_DEPTH,
    narrativeGuidanceShortInjectionRole: DEFAULT_NG_INJECTION_ROLE,
    narrativeGuidanceShortLoreBookNames: [],
    silentGenerationDebugMode: false,
    // toolPresets / activeToolPreset are intentionally absent here:
    // migrateLegacyToolPresets initializes them (and converts any legacy
    // per-field promptTemplates) on first load. Listing them as defaults
    // would make the merged settings look already-migrated.
};

// The pre-macro default templates, reconstructed from the current ones so
// the migration can recognize (and upgrade) untouched installs. Must mirror
// exactly how the {{context}} / {{brief}} / {{guidance}} placeholders were
// added to the defaults.
const LEGACY_DEFAULT_ACC_PROMPT = DEFAULT_ACC_PROMPT
    .replace('{{context}}', '')
    .replace('\n\nCharacter Brief:\n{{brief}}', '');
const LEGACY_DEFAULT_WIA_PROMPT = DEFAULT_WIA_PROMPT
    .replace('{{context}}', '')
    .replace('\n\nGuidance from the user:\n{{guidance}}', '');

// Registry of every preset-managed prompt field, grouped per tool. Drives
// both the legacy-template migration and the per-tool preset widgets.
const TOOL_PRESET_CONFIG = [
    {
        toolKey: 'phrasing',
        label: 'Phrasing',
        containerId: 'phrasing_presets',
        fields: [
            { key: 'phrasingPrompt', label: 'Prompt', textareaId: 'phrasing_prompt_textarea', defaultText: DEFAULT_PHRASING_PROMPT },
            { key: 'phrasingInversePrompt', label: 'Inverse Prompt', textareaId: 'phrasing_inverse_prompt_textarea', defaultText: DEFAULT_PHRASING_INVERSE_PROMPT },
        ],
    },
    {
        toolKey: 'acc',
        label: 'Character Creation',
        containerId: 'acc_presets',
        fields: [
            { key: 'accPrompt', label: 'Prompt', textareaId: 'acc_prompt_textarea', defaultText: DEFAULT_ACC_PROMPT, legacyDefaultText: LEGACY_DEFAULT_ACC_PROMPT },
            { key: 'accPrefill', label: 'Prefill', textareaId: 'acc_prefill_textarea', defaultText: DEFAULT_ACC_PREFILL },
        ],
    },
    {
        toolKey: 'wia',
        label: 'World Info Assist',
        containerId: 'wia_presets',
        fields: [
            { key: 'wiaPrompt', label: 'Prompt', textareaId: 'wia_prompt_textarea', defaultText: DEFAULT_WIA_PROMPT, legacyDefaultText: LEGACY_DEFAULT_WIA_PROMPT },
            { key: 'wiaPrefillTitled', label: 'Prefill Titled', textareaId: 'wia_prefill_titled_textarea', defaultText: DEFAULT_WIA_PREFILL_TITLED },
            { key: 'wiaPrefillUntitled', label: 'Prefill Untitled', textareaId: 'wia_prefill_untitled_textarea', defaultText: DEFAULT_WIA_PREFILL_UNTITLED },
        ],
    },
    {
        toolKey: 'ng-long',
        label: 'Narrative Guidance (Long-term)',
        containerId: 'ng_long_presets',
        fields: [
            { key: 'narrativeGuidanceLongPrompt', label: 'Instructions', textareaId: 'ng_long_user_prompt_textarea', defaultText: DEFAULT_NG_LONG_USER_PROMPT },
            { key: 'narrativeGuidanceLongGenerationPrompt', label: 'Prefill', textareaId: 'ng_long_generation_prompt_textarea', defaultText: DEFAULT_NG_LONG_GENERATION_PROMPT },
            { key: 'narrativeGuidanceLongInjectionPrompt', label: 'Injection', textareaId: 'ng_long_injection_prompt_textarea', defaultText: DEFAULT_NG_LONG_INJECTION_PROMPT },
        ],
    },
    {
        toolKey: 'ng-short',
        label: 'Narrative Guidance (Short-term)',
        containerId: 'ng_short_presets',
        fields: [
            { key: 'narrativeGuidanceShortPrompt', label: 'Instructions', textareaId: 'ng_short_user_prompt_textarea', defaultText: DEFAULT_NG_SHORT_USER_PROMPT },
            { key: 'narrativeGuidanceShortGenerationPrompt', label: 'Prefill', textareaId: 'ng_short_generation_prompt_textarea', defaultText: DEFAULT_NG_SHORT_GENERATION_PROMPT },
            { key: 'narrativeGuidanceShortInjectionPrompt', label: 'Injection', textareaId: 'ng_short_injection_prompt_textarea', defaultText: DEFAULT_NG_SHORT_INJECTION_PROMPT },
        ],
    },
];

// ─── State ───

let settings = { ...defaultSettings };

const SSEDebug = createDebugLogger('SAINTS-SILLY-EXTENSIONS', () => true);

// ─── Settings Persistence ───

function saveSettings() {
    saveExtensionSettings(EXTENSION_NAME, settings);
    SSEDebug('Settings saved');
}

function loadSettings() {
    settings = loadExtensionSettings(EXTENSION_NAME, defaultSettings);
    let migrated = false;
    if (migrateLegacyToolPresets(settings, TOOL_PRESET_CONFIG)) {
        SSEDebug('Migrated legacy prompt templates to tool presets');
        migrated = true;
    }
    // Fold pre-split, single-track Narrative Guidance settings (and any saved
    // NG presets) onto the new short-term track.
    if (migrateNarrativeGuidanceSettings(settings)) {
        SSEDebug('Migrated legacy Narrative Guidance settings to the short-term track');
        migrated = true;
    }
    if (migrated) saveSettings();
    SSEDebug('Settings loaded:', JSON.stringify(settings));
}

// ─── Settings Panel ───

function injectSettingsPanel() {
    const settingsContainer = document.getElementById('extensions_settings');
    if (!settingsContainer) return;

    settingsContainer.insertAdjacentHTML('beforeend', settingsHtml);

    bindPossessionSettings(saveSettings);
    bindPhrasingSettings(saveSettings);
    bindACCSettings(saveSettings);
    bindWIASettings(saveSettings);
    bindNarrativeGuidanceSettings(saveSettings);
    bindSilentGenerationSettings(saveSettings);

    // Preset widgets go last: the module bindings above must attach their
    // textarea → settings listeners first so preset loads persist correctly.
    for (const tool of TOOL_PRESET_CONFIG) {
        setupToolPresets({ ...tool, settings, saveSettings });
    }
}

// ─── Merged Event Handlers ───

function onGenerationStarted(_type, _options, dryRun) {
    // SillyTavern's PromptManager fires GENERATION_STARTED for dry-run
    // probes (token counts, prompt composition) on page load, CHAT_LOADED,
    // CHARACTER_EDITED, etc. Those never emit ENDED/STOPPED, so reacting
    // to them strands any button we hide here.
    if (dryRun) return;
    possessionGenStarted();
    phrasingGenStarted();
    SSEDebug('Generation started');
}

function onGenerationEnded() {
    possessionGenEnded();
    phrasingGenEnded();
    showPossessionImpersonateButton();
    SSEDebug('Generation ended');
}

function onGenerationStopped() {
    // Same cleanup as ended
    possessionGenEnded();
    phrasingGenEnded();
    showPossessionImpersonateButton();
    SSEDebug('Generation stopped');
}

function onChatChanged() {
    loadPossessionState();
    syncAllPossessionUI();
    onNarrativeGuidanceChatChanged();
    SSEDebug('Chat changed, state reloaded');
}

function onGroupUpdatedHandler() {
    onGroupUpdated();
    SSEDebug('Group updated, UI rebuilt');
}

function onCharacterPageLoadedHandler() {
    onCharacterPageLoaded();
    accOnCharacterPageLoaded();
}

function onGroupWrapperFinishedHandler() {
    onGroupWrapperFinished();
}

// ─── Initialization ───

jQuery(async () => {
    loadSettings();

    // Wire up cross-module dependencies via shared settings reference
    initPossession({
        settings,
        phrasingApi: { isPhrasing, handlePhrasingSeedReinjection },
    });
    initPhrasing({
        settings,
        possessionApi: { isPossessing, getPossessedCharName, postPossessedMessage },
    });
    initACC({ settings, saveSettings });
    initWIA({ settings });
    initNarrativeGuidance({ settings });

    loadPossessionState();
    injectSettingsPanel();

    // Watch the DOM for World Info entry forms and inject assist controls.
    startWIAObserver();

    // Possession UI
    attachContinueInterceptor();

    // Phrasing UI
    createInputAreaButton();
    createHamburgerMenuItem();

    // Wire up the global "stop button → abort silent generations" hook
    // before subscribing any per-module handlers, so a stop event always
    // unblocks in-flight silent jobs first.
    initSilentGeneration({ settings });

    // Subscribe to events
    const { eventSource, eventTypes } = getContext();
    eventSource.on(eventTypes.CHAT_CHANGED, onChatChanged);
    eventSource.on(eventTypes.GROUP_UPDATED, onGroupUpdatedHandler);
    eventSource.on(eventTypes.CHARACTER_PAGE_LOADED, onCharacterPageLoadedHandler);
    eventSource.on(eventTypes.GENERATION_STARTED, onGenerationStarted);
    eventSource.on(eventTypes.GENERATION_ENDED, onGenerationEnded);
    eventSource.on(eventTypes.GENERATION_STOPPED, onGenerationStopped);
    eventSource.on(eventTypes.GROUP_WRAPPER_FINISHED, onGroupWrapperFinishedHandler);
    eventSource.on(eventTypes.MESSAGE_SENT, async (idx) => {
        onMessageSent(idx);
        await onNarrativeGuidanceMessageSent(idx);
    });
    eventSource.on(eventTypes.MESSAGE_RECEIVED, onNarrativeGuidanceMessageReceived);

    // Slash commands
    registerPossessionSlashCommands();
    registerPhrasingSlashCommand();

    // Initial state
    syncAllPossessionUI();
    applyPhrasingEnabledState();

    SSEDebug('Extension initialized');
});
