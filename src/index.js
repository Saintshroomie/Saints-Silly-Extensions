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
    getPossessedCharacter,
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
    rewriteMessageWithTemplate,
    DEFAULT_PHRASING_PROMPT,
    DEFAULT_PHRASING_INVERSE_PROMPT,
} from './phrasing.js';
import {
    initPhraseBan,
    bindPhraseBanSettings,
    onPhraseBanMessageReceived,
    onPhraseBanChatChanged,
    onPhraseBanTextCompletionSettings,
    registerPhraseBanSlashCommand,
    DEFAULT_PHRASE_BAN_PROMPT,
    DEFAULT_PHRASE_BAN_PROACTIVE_PROMPT,
    DEFAULT_PHRASE_BAN_MAX_RETRIES,
    DEFAULT_PHRASE_BAN_INJECTION_DEPTH,
    DEFAULT_PHRASE_BAN_INJECTION_ROLE,
} from './phrase-ban.js';
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
    initReformatting,
    bindReformattingSettings,
    startReformattingObserver,
    rescanReformatButtons,
    registerReformattingSlashCommand,
    DEFAULT_REFORMATTING_PROMPT,
    DEFAULT_REFORMATTING_PREFILL,
    DEFAULT_REFORMATTING_SYSTEM_PROMPT,
    DEFAULT_REFORMATTING_RESPONSE_LENGTH,
} from './reformatting.js';
import {
    initCompaction,
    bindCompactionSettings,
    registerCompactionSlashCommand,
    createCompactionMenuItem,
    onCompactionChatChanged,
    onCompactionGenerationEnded,
    onCompactionChatCompletionPromptReady,
    onCompactionGenerateAfterCombinePrompts,
    DEFAULT_COMPACTION_SUMMARY_PROMPT,
    DEFAULT_COMPACTION_SUMMARY_PREFILL,
    DEFAULT_COMPACTION_RESPONSE_LENGTH,
    DEFAULT_COMPACTION_THRESHOLD_PERCENT,
    DEFAULT_COMPACTION_TAIL_LENGTH,
} from './compaction.js';
import {
    initRetryContinue,
    bindRetryContinueSettings,
    createRetryContinueButtons,
    hookRetryAutoContinue,
    registerRetryContinueSlashCommands,
    loadRetryState,
    isRetryCheckpointActiveFor,
    retryFromCheckpoint,
    onRetryContinueChatChanged,
    onRetryContinueUserMessageRendered,
    onRetryContinueCharacterMessageRendered,
    onRetryContinueMessageEdited,
    onRetryContinueMessageReceived,
    onRetryContinueGenerationStarted,
    onRetryContinueGenerationEnded,
} from './retry-continue.js';
import {
    initDirector,
    bindDirectorSettings,
    registerDirectorSlashCommands,
    onDirectorChatChanged,
    onDirectorMessageSent,
    onDirectorGroupWrapperFinished,
    attachDirectorSendInterceptor,
    DEFAULT_DIRECTOR_PROMPT,
    DEFAULT_DIRECTOR_RESPONSE_LENGTH,
} from './director.js';
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
    phraseBanEnabled: false,
    phraseBanAuto: true,
    phraseBanDebugMode: false,
    phraseBanMaxRetries: DEFAULT_PHRASE_BAN_MAX_RETRIES,
    phraseBanPatterns: '',
    phraseBanPrompt: DEFAULT_PHRASE_BAN_PROMPT,
    phraseBanProactive: false,
    phraseBanProactivePrompt: DEFAULT_PHRASE_BAN_PROACTIVE_PROMPT,
    phraseBanInjectionDepth: DEFAULT_PHRASE_BAN_INJECTION_DEPTH,
    phraseBanInjectionRole: DEFAULT_PHRASE_BAN_INJECTION_ROLE,
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
    // (Lore-book selection is stored per-chat in chatMetadata, not here.)
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
    // (Lore-book selection is stored per-chat in chatMetadata, not here.)
    reformattingEnabled: false,
    reformattingEngine: 'rules',
    reformattingDebugMode: false,
    reformattingAsteriskMode: 'strip',
    reformattingCollapseWhitespace: false,
    reformattingSystemPrompt: DEFAULT_REFORMATTING_SYSTEM_PROMPT,
    reformattingPrompt: DEFAULT_REFORMATTING_PROMPT,
    reformattingPrefill: DEFAULT_REFORMATTING_PREFILL,
    reformattingResponseLength: DEFAULT_REFORMATTING_RESPONSE_LENGTH,
    compactionEnabled: false,
    compactionAutoEnabled: false,
    compactionThresholdPercent: DEFAULT_COMPACTION_THRESHOLD_PERCENT,
    compactionTailLength: DEFAULT_COMPACTION_TAIL_LENGTH,
    compactionConfirmAuto: true,
    compactionSummaryPrompt: DEFAULT_COMPACTION_SUMMARY_PROMPT,
    compactionSummaryPrefill: DEFAULT_COMPACTION_SUMMARY_PREFILL,
    compactionSummaryResponseLength: DEFAULT_COMPACTION_RESPONSE_LENGTH,
    compactionMaxContextOverride: 0,
    compactionMigrateState: true,
    compactionDebugMode: false,
    retryAutoContinue: true,
    retryAutoSetOnContinue: false,
    retryShowToasts: true,
    retryIndicatorStyle: 'border',
    retryDebugMode: false,
    directorEnabled: false,
    directorConfirm: true,
    directorPrompt: DEFAULT_DIRECTOR_PROMPT,
    directorResponseLength: DEFAULT_DIRECTOR_RESPONSE_LENGTH,
    directorMaxContextOverride: 0,
    directorDebugMode: false,
    silentGenerationDebugMode: false,
    silentGenerationStreaming: true,
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
        toolKey: 'phrase-ban',
        label: 'Phrase Ban',
        containerId: 'phrase_ban_presets',
        fields: [
            { key: 'phraseBanPatterns', label: 'Patterns', textareaId: 'phrase_ban_patterns_textarea', defaultText: '' },
            { key: 'phraseBanPrompt', label: 'Rewrite Prompt', textareaId: 'phrase_ban_prompt_textarea', defaultText: DEFAULT_PHRASE_BAN_PROMPT },
            { key: 'phraseBanProactivePrompt', label: 'Proactive Prompt', textareaId: 'phrase_ban_proactive_prompt_textarea', defaultText: DEFAULT_PHRASE_BAN_PROACTIVE_PROMPT },
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
    {
        toolKey: 'reformatting',
        label: 'Reformatting',
        containerId: 'reformatting_presets',
        fields: [
            { key: 'reformattingSystemPrompt', label: 'System Prompt', textareaId: 'reformatting_system_prompt_textarea', defaultText: DEFAULT_REFORMATTING_SYSTEM_PROMPT },
            { key: 'reformattingPrompt', label: 'Prompt', textareaId: 'reformatting_prompt_textarea', defaultText: DEFAULT_REFORMATTING_PROMPT },
            { key: 'reformattingPrefill', label: 'Prefill', textareaId: 'reformatting_prefill_textarea', defaultText: DEFAULT_REFORMATTING_PREFILL },
        ],
    },
    {
        toolKey: 'compaction',
        label: 'Compaction',
        containerId: 'compaction_presets',
        fields: [
            { key: 'compactionSummaryPrompt', label: 'Summary Prompt', textareaId: 'compaction_summary_prompt_textarea', defaultText: DEFAULT_COMPACTION_SUMMARY_PROMPT },
            { key: 'compactionSummaryPrefill', label: 'Summary Prefill', textareaId: 'compaction_summary_prefill_textarea', defaultText: DEFAULT_COMPACTION_SUMMARY_PREFILL },
        ],
    },
    {
        toolKey: 'director',
        label: 'Group Director',
        containerId: 'director_presets',
        fields: [
            { key: 'directorPrompt', label: 'Instructions', textareaId: 'director_prompt_textarea', defaultText: DEFAULT_DIRECTOR_PROMPT },
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
    bindPhraseBanSettings(saveSettings);
    bindACCSettings(saveSettings);
    bindWIASettings(saveSettings);
    bindNarrativeGuidanceSettings(saveSettings);
    bindReformattingSettings(saveSettings);
    bindCompactionSettings(saveSettings);
    bindRetryContinueSettings(saveSettings);
    bindDirectorSettings(saveSettings);
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
    onRetryContinueGenerationStarted();
    SSEDebug('Generation started');
}

function onGenerationEnded() {
    possessionGenEnded();
    phrasingGenEnded();
    showPossessionImpersonateButton();
    onCompactionGenerationEnded();
    onRetryContinueGenerationEnded();
    SSEDebug('Generation ended');
}

function onGenerationStopped() {
    // Same cleanup as ended
    possessionGenEnded();
    phrasingGenEnded();
    showPossessionImpersonateButton();
    onRetryContinueGenerationEnded();
    SSEDebug('Generation stopped');
}

function onChatChanged() {
    loadPossessionState();
    syncAllPossessionUI();
    onNarrativeGuidanceChatChanged();
    onPhraseBanChatChanged();
    rescanReformatButtons();
    onCompactionChatChanged();
    onRetryContinueChatChanged();
    onDirectorChatChanged();
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

function onGroupWrapperFinishedHandler(data) {
    onGroupWrapperFinished();
    onDirectorGroupWrapperFinished(data);
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
    initPhraseBan({
        settings,
        phrasingApi: { rewriteMessageWithTemplate },
        retryApi: { isRetryCheckpointActiveFor, retryFromCheckpoint },
    });
    initACC({ settings, saveSettings });
    initWIA({ settings });
    initNarrativeGuidance({ settings });
    initReformatting({ settings });
    // resyncChatState re-runs the per-chat state reload after a compaction
    // creates and seeds the fresh chat, so migrated metadata is re-applied.
    initCompaction({ settings, saveSettings, resyncChatState: onChatChanged });
    initRetryContinue({ settings });
    initDirector({
        settings,
        possessionApi: { isPossessing, getPossessedCharacter, getPossessedCharName },
    });

    loadPossessionState();
    injectSettingsPanel();

    // Watch the DOM for World Info entry forms and inject assist controls.
    startWIAObserver();

    // Watch the chat for messages and inject per-message reformat buttons.
    startReformattingObserver();

    // Possession UI
    attachContinueInterceptor();

    // Group Director: empty Send (no input) → director picks the next speaker.
    attachDirectorSendInterceptor();

    // Phrasing UI
    createInputAreaButton();
    createHamburgerMenuItem();

    // Compaction UI — launch item in the hamburger (options) menu.
    createCompactionMenuItem();

    // Retry Continue UI — Retry buttons in the hamburger + quick-action bars,
    // plus the optional auto-set-on-Continue hook on ST's native Continue.
    createRetryContinueButtons();
    hookRetryAutoContinue();

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
        onDirectorMessageSent();
    });
    eventSource.on(eventTypes.MESSAGE_RECEIVED, async (idx) => {
        onNarrativeGuidanceMessageReceived(idx);
        onRetryContinueMessageReceived(idx);
        // Detached internally (setTimeout) — it must never block this emit
        // chain. On a banned-phrase hit it drives a rewrite, or, while a Retry
        // checkpoint is active, a retry-continue from that checkpoint.
        onPhraseBanMessageReceived(idx);
    });
    if (eventTypes.USER_MESSAGE_RENDERED) {
        eventSource.on(eventTypes.USER_MESSAGE_RENDERED, onRetryContinueUserMessageRendered);
    }
    if (eventTypes.CHARACTER_MESSAGE_RENDERED) {
        eventSource.on(eventTypes.CHARACTER_MESSAGE_RENDERED, onRetryContinueCharacterMessageRendered);
    }
    if (eventTypes.MESSAGE_EDITED) {
        eventSource.on(eventTypes.MESSAGE_EDITED, onRetryContinueMessageEdited);
    }
    // Text Completion only: append Phrase Ban's learned list to the request's
    // sampler-level banned_strings whenever Phrase Ban is enabled.
    if (eventTypes.TEXT_COMPLETION_SETTINGS_READY) {
        eventSource.on(eventTypes.TEXT_COMPLETION_SETTINGS_READY, onPhraseBanTextCompletionSettings);
    }
    // Compaction prompt-measurement: passively tokenize the true outgoing
    // prompt so the trigger threshold reflects the real context usage.
    if (eventTypes.CHAT_COMPLETION_PROMPT_READY) {
        eventSource.on(eventTypes.CHAT_COMPLETION_PROMPT_READY, onCompactionChatCompletionPromptReady);
    }
    if (eventTypes.GENERATE_AFTER_COMBINE_PROMPTS) {
        eventSource.on(eventTypes.GENERATE_AFTER_COMBINE_PROMPTS, onCompactionGenerateAfterCombinePrompts);
    }

    // Slash commands
    registerPossessionSlashCommands();
    registerPhrasingSlashCommand();
    registerPhraseBanSlashCommand();
    registerReformattingSlashCommand();
    registerCompactionSlashCommand();
    registerRetryContinueSlashCommands();
    registerDirectorSlashCommands();

    // Initial state
    syncAllPossessionUI();
    applyPhrasingEnabledState();
    loadRetryState();

    SSEDebug('Extension initialized');
});
