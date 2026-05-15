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
    DEFAULT_NG_GENERATION_PROMPT,
    DEFAULT_NG_INJECTION_PROMPT,
    DEFAULT_NG_TURN_COUNT,
    DEFAULT_NG_INJECTION_DEPTH,
    DEFAULT_NG_INJECTION_ROLE,
    DEFAULT_NG_RESPONSE_LENGTH,
} from './narrative-guidance.js';

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
    narrativeGuidanceEnabled: false,
    narrativeGuidanceAutoRegen: true,
    narrativeGuidanceDebugMode: false,
    narrativeGuidanceGenerationPrompt: DEFAULT_NG_GENERATION_PROMPT,
    narrativeGuidanceInjectionPrompt: DEFAULT_NG_INJECTION_PROMPT,
    narrativeGuidanceDefaultTurnCount: DEFAULT_NG_TURN_COUNT,
    narrativeGuidanceResponseLength: DEFAULT_NG_RESPONSE_LENGTH,
    narrativeGuidanceMaxContextOverride: 0,
    narrativeGuidanceInjectionDepth: DEFAULT_NG_INJECTION_DEPTH,
    narrativeGuidanceInjectionRole: DEFAULT_NG_INJECTION_ROLE,
    narrativeGuidanceLoreBookNames: [],
    silentGenerationDebugMode: false,
    promptTemplates: {
        phrasingPrompt: {},
        phrasingInversePrompt: {},
        accPrompt: {},
        accPrefill: {},
        wiaPrompt: {},
        wiaPrefillTitled: {},
        wiaPrefillUntitled: {},
        narrativeGuidanceGenerationPrompt: {},
        narrativeGuidanceInjectionPrompt: {},
    },
    activePromptTemplate: {
        phrasingPrompt: '__default__',
        phrasingInversePrompt: '__default__',
        accPrompt: '__default__',
        accPrefill: '__default__',
        wiaPrompt: '__default__',
        wiaPrefillTitled: '__default__',
        wiaPrefillUntitled: '__default__',
        narrativeGuidanceGenerationPrompt: '__default__',
        narrativeGuidanceInjectionPrompt: '__default__',
    },
};

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
