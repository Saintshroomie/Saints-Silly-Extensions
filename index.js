// Saint's Silly Extensions — Merged Possession + Phrasing!
// Allows the user to "possess" a character and enrich messages with AI narration.

import { renderExtensionTemplateAsync } from '../../../extensions.js';
import {
    getContext,
    createDebugLogger,
    loadExtensionSettings,
    saveExtensionSettings,
} from './lib/utils.js';
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
} from './lib/possession.js';
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
} from './lib/phrasing.js';

// ─── Constants ───

const EXTENSION_NAME = 'Saints-Silly-Extensions';

const defaultSettings = {
    possessionEnabled: true,
    possessionShowToast: true,
    possessionDebugMode: false,
    phrasingEnabled: true,
    phrasingDebugMode: false,
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

async function injectSettingsPanel() {
    const settingsContainer = document.getElementById('extensions_settings');
    if (!settingsContainer) return;

    const settingsHtml = await renderExtensionTemplateAsync(`third-party/${EXTENSION_NAME}`, 'settings', {});
    settingsContainer.insertAdjacentHTML('beforeend', settingsHtml);

    bindPossessionSettings(saveSettings);
    bindPhrasingSettings(saveSettings);
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

    loadPossessionState();
    await injectSettingsPanel();

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
