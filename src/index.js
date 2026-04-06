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
    loadPromptTextarea,
    createInputAreaButton,
    createHamburgerMenuItem,
    bindPhrasingSettings,
    registerPhrasingSlashCommand,
    onGenerationStarted as phrasingGenStarted,
    onGenerationEnded as phrasingGenEnded,
} from './phrasing.js';
import {
    initACC,
    onCharacterPageLoaded as accOnCharacterPageLoaded,
    bindACCSettings,
} from './assisted-character-creation.js';
import {
    initWIA,
    startWIAObserver,
    bindWIASettings,
    DEFAULT_WIA_PROMPT,
} from './world-info-assist.js';

// ─── Constants ───

const EXTENSION_NAME = 'Saints-Silly-Extensions';

const defaultSettings = {
    possessionEnabled: true,
    possessionShowToast: true,
    possessionDebugMode: false,
    phrasingEnabled: true,
    phrasingDebugMode: false,
    accEnabled: true,
    accDebugMode: false,
    accActiveSchemaName: 'Default Character Schema',
    accCustomSchemas: {},
    accProseStates: {},
    wiaEnabled: true,
    wiaDebugMode: false,
    wiaPrompt: DEFAULT_WIA_PROMPT,
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
}

// ─── Merged Event Handlers ───

function onGenerationStarted() {
    possessionGenStarted();
    phrasingGenStarted();
    SSEDebug('Generation started, guard ON');
}

function onGenerationEnded() {
    possessionGenEnded();
    phrasingGenEnded();
    showPossessionImpersonateButton();
    SSEDebug('Generation ended, guard OFF');
}

function onGenerationStopped() {
    // Same cleanup as ended
    possessionGenEnded();
    phrasingGenEnded();
    showPossessionImpersonateButton();
    SSEDebug('Generation stopped, guard OFF');
}

function onChatChanged() {
    loadPossessionState();
    syncAllPossessionUI();
    loadPromptTextarea();
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

    loadPossessionState();
    injectSettingsPanel();

    // Watch the DOM for World Info entry forms and inject assist controls.
    startWIAObserver();

    // Possession UI
    attachContinueInterceptor();

    // Phrasing UI
    createInputAreaButton();
    createHamburgerMenuItem();

    // Subscribe to events
    const { eventSource, eventTypes } = getContext();
    eventSource.on(eventTypes.CHAT_CHANGED, onChatChanged);
    eventSource.on(eventTypes.GROUP_UPDATED, onGroupUpdatedHandler);
    eventSource.on(eventTypes.CHARACTER_PAGE_LOADED, onCharacterPageLoadedHandler);
    eventSource.on(eventTypes.GENERATION_STARTED, onGenerationStarted);
    eventSource.on(eventTypes.GENERATION_ENDED, onGenerationEnded);
    eventSource.on(eventTypes.GENERATION_STOPPED, onGenerationStopped);
    eventSource.on(eventTypes.GROUP_WRAPPER_FINISHED, onGroupWrapperFinishedHandler);
    eventSource.on(eventTypes.MESSAGE_SENT, onMessageSent);

    // Slash commands
    registerPossessionSlashCommands();
    registerPhrasingSlashCommand();

    // Initial state
    syncAllPossessionUI();
    applyPhrasingEnabledState();
    loadPromptTextarea();

    SSEDebug('Extension initialized');
});
