/**
 * Compaction
 *
 * Long roleplays eventually fill the model's context window; once full, ST
 * evicts the oldest history every turn, which invalidates the backend's KV
 * cache and slows generation to a crawl. Compaction fixes this the only way
 * that actually works: it summarizes the chat, starts a *fresh* chat seeded
 * with that summary plus the recent tail, migrates all per-chat extension
 * state, and resumes — resetting the context window and restoring fast
 * generation.
 *
 * Triggers: a manual button + `/compact`, and an optional auto-trigger when
 * the *measured* outgoing prompt crosses a user-set % of the context window.
 * The auto-trigger only ever *opens the modal* — every compaction still
 * requires a deliberate user action (Generate a summary, then click Compact).
 * Nothing is ever rewritten headlessly.
 *
 * The guided summary modal mirrors the Assisted Character Creation modal:
 * per-chat guidance demanding specific details, a lore-book picker, and
 * Generate / Continue / Checkpoint / Retry actions that stream into an
 * editable "Story so far" preview before commit.
 */

// Namespace import: `doNewChat` is the New Chat button handler in the running
// ST but isn't listed in this repo's API docs, so we call it defensively
// (`hostScript.doNewChat?.(...)`) and fall back to confirmed primitives if a
// build ever lacks the export. The webpack externals rule passes the `../`
// request through unchanged, so the namespace resolves at runtime.
import * as hostScript from '../../../../../script.js';
import { getTokenCountAsync } from '../../../../tokenizers.js';
import { createNewGroupChat } from '../../../../group-chats.js';
import {
    Popup,
    POPUP_TYPE,
    POPUP_RESULT,
} from '../../../../popup.js';
import { SlashCommandParser } from '../../../../slash-commands/SlashCommandParser.js';
import { SlashCommand } from '../../../../slash-commands/SlashCommand.js';
import {
    getContext,
    isGenerationInProgress,
    createDebugLogger,
    toast,
    buildContextPreamble,
    createLoreBookPicker,
    applyTemplateMacros,
    showPromptPreview,
    estimateChatTokens,
    createSettingsBinder,
} from './utils.js';
import { templateSetting, textSetting, positiveIntSetting } from './settings-helpers.js';
import { createToolPresetSelector } from './prompt-templates.js';
import {
    MODAL_LOREBOOK_PREFIX,
    actionRowHtml,
    createGenerationActions,
    smallButtonHtml,
    statusBarHtml,
    streamContinuation,
    streamFresh,
    tokensRowHtml,
} from './generation-modal.js';

// ─── Defaults ───

export const DEFAULT_COMPACTION_SUMMARY_PROMPT = `{{context}}[
You are a summarization engine for a long-running roleplay. Produce a "Story so far" recap dense enough that the roleplay can continue seamlessly after the older chat history is dropped from the model's context.

Rules:
- Write organized prose under clear headings: Setting, Characters & Relationships, What Happened (chronological), Established Facts / Canon, Open Threads & Goals, Where Things Stand Now. Third person, past tense.
- Maximize information density. Keep everything plot-critical; drop verbatim dialogue, repetition, and minor filler.
- Never invent events that did not occur, and never continue the story — only summarize what has already happened.
- Output only the recap. No preamble, no commentary, no meta-text.
]`;

// Prefill is optional for Compaction (the summary is free-form prose), so the
// default is empty. When set it is dual-use: sent as the assistant prefix and
// prepended to the stored summary, with the echo stripped at the prepend site.
export const DEFAULT_COMPACTION_SUMMARY_PREFILL = '';

export const DEFAULT_COMPACTION_RESPONSE_LENGTH = 1200;
export const DEFAULT_COMPACTION_THRESHOLD_PERCENT = 90;
export const DEFAULT_COMPACTION_TAIL_LENGTH = 20;

const COMPACTION_SUMMARY_SYSTEM_PROMPT =
    'You are a summarization assistant for long-form roleplay. Produce a faithful, '
    + 'information-dense recap in the requested format. No preamble, no commentary.';

const COMPACTION_CONTINUE_SYSTEM_PROMPT =
    'You are a summarization assistant. Continue the existing recap seamlessly in the '
    + 'same format. Output only the continuation — no headers, no meta-commentary, '
    + 'no repetition of prior text.';

// Speaker name for the seeded recap message. It's a normal (non-system)
// message so the model actually receives it — see the plan's "Why not
// is_system" — tagged via extra.sse_summary for styling and recognition.
const SUMMARY_MESSAGE_NAME = 'Story so far';

// Per-chat metadata key. Holds `{ guidance }` — the user's demanded-details
// text, persisted like Narrative Guidance so it survives across opens and
// across compactions of the same storyline.
const COMPACTION_METADATA_KEY = 'compaction';

// SSE per-chat metadata keys carried into the fresh chat on compaction.
// `variables` is the chat's local variables: Character State's values (and
// anything else set with /setvar), which the story still needs after the cut.
const MIGRATED_METADATA_KEYS = ['possession', 'narrativeGuidance', 'phraseBan', 'imagePrompting', 'variables'];

// ─── Module State ───

let moduleSettings = null;
let saveSettingsFn = null;
let resyncChatStateFn = null;
let debug = () => {};

// The true outgoing prompt size, learned from the prompt-measurement events.
// 0 means "not measured yet" → getContextUsage() falls back to the cold-start
// chat estimate until the first live generation reports the real number.
let lastPromptTokens = 0;

// Set for the whole commit (snapshot → new chat → restore → seed) so our
// measurement listeners, auto-trigger, and modal don't re-enter on the
// freshly-created/seeded chat.
let compacting = false;

let activePopup = null;
let lorebookPicker = null;

let guidanceSaveTimer = null;

// ─── Init ───

/**
 * Initialize the Compaction module. Called once from index.js.
 * @param {object} opts
 * @param {object} opts.settings - Shared mutable settings reference.
 * @param {function} opts.saveSettings - Persists settings.
 * @param {function} opts.resyncChatState - Re-runs the per-chat state reload
 *   wiring (possession/NG/phrase-ban/reformatting) so migrated metadata is
 *   re-applied after the fresh chat is created and seeded.
 */
export function initCompaction({ settings, saveSettings, resyncChatState }) {
    moduleSettings = settings;
    saveSettingsFn = saveSettings;
    resyncChatStateFn = typeof resyncChatState === 'function' ? resyncChatState : null;
    debug = createDebugLogger('COMPACTION', () => moduleSettings.compactionDebugMode);
    debug('Module initialized');
}

// ─── Settings Helpers ───

function getSummaryTemplate() {
    return templateSetting(moduleSettings, 'compactionSummaryPrompt', DEFAULT_COMPACTION_SUMMARY_PROMPT);
}

function getPrefill() {
    return textSetting(moduleSettings, 'compactionSummaryPrefill', DEFAULT_COMPACTION_SUMMARY_PREFILL);
}

function getTailLength() {
    return positiveIntSetting(moduleSettings, 'compactionTailLength', DEFAULT_COMPACTION_TAIL_LENGTH);
}

function getThresholdRatio() {
    const n = moduleSettings?.compactionThresholdPercent;
    const pct = (Number.isFinite(n) && n > 0) ? n : DEFAULT_COMPACTION_THRESHOLD_PERCENT;
    return Math.min(Math.max(pct, 1), 100) / 100;
}

// ─── Per-chat Guidance Persistence ───

function readGuidance() {
    const ctx = getContext();
    const raw = ctx.chatMetadata?.[COMPACTION_METADATA_KEY];
    return (raw && typeof raw.guidance === 'string') ? raw.guidance : '';
}

function writeGuidance(text) {
    const ctx = getContext();
    const existing = ctx.chatMetadata?.[COMPACTION_METADATA_KEY];
    const container = (existing && typeof existing === 'object') ? existing : {};
    container.guidance = text || '';
    ctx.chatMetadata[COMPACTION_METADATA_KEY] = container;
}

function scheduleGuidanceSave(text) {
    // Write through immediately so a chat switch never persists stale text;
    // debounce only the saveMetadata call.
    writeGuidance(text);
    if (guidanceSaveTimer) clearTimeout(guidanceSaveTimer);
    guidanceSaveTimer = setTimeout(() => {
        guidanceSaveTimer = null;
        getContext().saveMetadata();
    }, 300);
}

// ─── Token Measurement ───

function contentToText(content) {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        return content.map(p => (typeof p === 'string' ? p : (p?.text || ''))).join(' ');
    }
    return '';
}

/**
 * CHAT_COMPLETION_PROMPT_READY → `{ chat, dryRun }`. The `chat` array is the
 * fully-assembled list of `{ role, content }` message objects actually sent,
 * so tokenizing it captures character cards, persona, activated world info,
 * system prompt, author's notes, and every injection.
 */
export async function onCompactionChatCompletionPromptReady(data) {
    // Skip dry-runs, the commit pipeline, and our own summary generation
    // (which fires this too — measuring it would clobber the real reading).
    if (!data || data.dryRun || compacting || activePopup) return;
    try {
        const chat = Array.isArray(data.chat) ? data.chat : [];
        const text = chat.map(m => contentToText(m?.content)).filter(Boolean).join('\n');
        lastPromptTokens = text ? await getTokenCountAsync(text) : 0;
        debug('Measured chat-completion prompt tokens:', lastPromptTokens);
    } catch (err) {
        debug('Chat-completion measurement failed:', err);
    }
}

/**
 * GENERATE_AFTER_COMBINE_PROMPTS → `{ prompt, dryRun }`. `prompt` is the final
 * combined text-completion string.
 */
export async function onCompactionGenerateAfterCombinePrompts(data) {
    if (!data || data.dryRun || compacting || activePopup) return;
    try {
        const prompt = typeof data.prompt === 'string' ? data.prompt : '';
        if (prompt) {
            lastPromptTokens = await getTokenCountAsync(prompt);
            debug('Measured text-completion prompt tokens:', lastPromptTokens);
        }
    } catch (err) {
        debug('Text-completion measurement failed:', err);
    }
}

/**
 * Current context usage. `tokens` is the measured outgoing prompt size when a
 * live generation has reported it, otherwise a cold-start estimate from the
 * chat. `ratio` is `tokens / getMaxPromptTokens()` (0 when the max is
 * unavailable, so callers never divide by zero / auto-trigger spuriously).
 *
 * @returns {Promise<{ tokens: number, max: number, ratio: number, measured: boolean }>}
 */
export async function getContextUsage() {
    let max = 0;
    try {
        const raw = hostScript.getMaxPromptTokens?.();
        if (Number.isFinite(raw) && raw > 0) max = raw;
    } catch (err) {
        debug('getMaxPromptTokens failed:', err);
    }

    let tokens = lastPromptTokens;
    let measured = tokens > 0;
    if (!measured) {
        try {
            tokens = await estimateChatTokens();
        } catch (err) {
            debug('Cold-start chat estimate failed:', err);
            tokens = 0;
        }
    }

    const ratio = max > 0 ? tokens / max : 0;
    return { tokens, max, ratio, measured };
}

// ─── Event Handlers (wired in index.js) ───

/** Reset measured tokens to cold-start for the new chat, then re-tag any
 *  seeded summary messages (DOM classes don't survive a chat reload). */
export function onCompactionChatChanged() {
    lastPromptTokens = 0;
    tagCompactionSummaries();
    debug('Chat changed — measured tokens reset to cold-start');
}

/**
 * Add the styling class to every "Story so far" message in the current chat.
 * The `extra.sse_summary` flag has no DOM hook, so we apply the class to the
 * matching `.mes` nodes ourselves. Safe to call repeatedly.
 */
export function tagCompactionSummaries() {
    const ctx = getContext();
    const chat = Array.isArray(ctx.chat) ? ctx.chat : [];
    for (let i = 0; i < chat.length; i++) {
        if (!chat[i]?.extra?.sse_summary) continue;
        const el = document.querySelector(`#chat .mes[mesid="${i}"]`);
        if (el) el.classList.add('cc-summary-message');
    }
}

/** Idle auto-trigger check, detached from ST's generation pipeline. */
export function onCompactionGenerationEnded() {
    if (!moduleSettings?.compactionEnabled || !moduleSettings?.compactionAutoEnabled) return;
    if (compacting || activePopup) return;
    setTimeout(() => {
        maybeAutoTrigger().catch(err => console.error('Compaction auto-trigger failed:', err));
    }, 1200);
}

async function maybeAutoTrigger() {
    if (!moduleSettings?.compactionEnabled || !moduleSettings?.compactionAutoEnabled) return;
    if (compacting || activePopup) return;
    const ctx = getContext();
    if (isGenerationInProgress()) return;
    if (!hasActiveCharacterOrGroup(ctx)) return;

    const usage = await getContextUsage();
    if (usage.max <= 0) return;
    if (usage.ratio < getThresholdRatio()) return;

    debug('Auto-trigger threshold reached:', Math.round(usage.ratio * 100), '%');

    if (moduleSettings.compactionConfirmAuto) {
        const ok = await confirmAutoCompaction(usage);
        if (!ok) return;
    }
    // Re-check guards: the confirm dialog is async and the user may have
    // started a generation, or a compaction may have begun, meanwhile.
    if (compacting || activePopup) return;
    if (isGenerationInProgress()) return;
    openCompactionModal({ auto: true });
}

async function confirmAutoCompaction(usage) {
    const pct = usage.max > 0 ? Math.round(usage.ratio * 100) : 0;
    const root = document.createElement('div');
    root.className = 'cc-confirm';
    const tokenNote = usage.max > 0 ? ` (≈${usage.tokens} / ${usage.max} tokens)` : '';
    root.innerHTML = `
        <p>The prompt is about <b>${pct}%</b> of the context window${tokenNote}.</p>
        <p>Compact this chat now? You'll review and edit the summary before anything changes.</p>
        <label class="checkbox_label cc-dont-ask">
            <input id="cc_dont_ask_again" type="checkbox" />
            <span>Don't ask again — auto-open the summary modal at the threshold</span>
        </label>
    `;
    const popup = new Popup(root, POPUP_TYPE.CONFIRM, '', {
        okButton: 'Compact',
        cancelButton: 'Not now',
    });
    const result = await popup.show();
    if (result === POPUP_RESULT.AFFIRMATIVE) {
        if (root.querySelector('#cc_dont_ask_again')?.checked) {
            moduleSettings.compactionConfirmAuto = false;
            saveSettingsFn?.();
            debug('Auto-confirm disabled via "Don\'t ask again"');
        }
        return true;
    }
    return false;
}

function hasActiveCharacterOrGroup(ctx) {
    if (ctx.groupId) return true;
    return ctx.characterId !== undefined && ctx.characterId !== null
        && Array.isArray(ctx.characters) && !!ctx.characters[ctx.characterId];
}

// ─── Slash Command + Launch Button ───

export function registerCompactionSlashCommand() {
    if (typeof SlashCommandParser?.addCommandObject !== 'function') return;
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'compact',
        callback: () => {
            openCompactionModal({ auto: false });
            return '';
        },
        helpString: 'Open the Compaction modal: summarize the chat and start a fresh, compacted chat seeded with the summary plus the recent tail.',
    }));
    debug('Registered /compact slash command');
}

export function createCompactionMenuItem() {
    if (document.getElementById('compaction_menu_button')) return;
    const ref = document.getElementById('option_continue');
    if (!ref) return;

    const btn = document.createElement('div');
    btn.id = 'compaction_menu_button';
    btn.classList.add('compaction-trigger', 'list-group-item', 'interactable');
    btn.title = 'Summarize this chat and start a fresh, compacted chat';
    btn.innerHTML = '<span class="fa-solid fa-compress"></span> Compact Chat';
    btn.addEventListener('click', () => openCompactionModal({ auto: false }));

    ref.parentNode.insertBefore(btn, ref.nextSibling);
    debug('Launch menu item injected');
}

// ─── Settings Bindings ───

export function bindCompactionSettings(saveSettings) {
    const bind = createSettingsBinder(moduleSettings, saveSettings);
    bind.checkbox('compaction_enabled', 'compactionEnabled');
    bind.checkbox('compaction_auto_enabled', 'compactionAutoEnabled');
    bind.checkbox('compaction_confirm_auto', 'compactionConfirmAuto');
    bind.checkbox('compaction_migrate_state', 'compactionMigrateState');
    bind.checkbox('compaction_debug_mode', 'compactionDebugMode');

    bind.number('compaction_threshold_percent', 'compactionThresholdPercent', {
        max: 100, fallback: DEFAULT_COMPACTION_THRESHOLD_PERCENT,
    });
    bind.number('compaction_tail_length', 'compactionTailLength', { fallback: DEFAULT_COMPACTION_TAIL_LENGTH });
    bind.number('compaction_response_length', 'compactionSummaryResponseLength', {
        min: 50, fallback: DEFAULT_COMPACTION_RESPONSE_LENGTH,
    });
    bind.number('compaction_max_context_override', 'compactionMaxContextOverride', { zeroMeansOff: true });

    bind.text('compaction_summary_prompt_textarea', 'compactionSummaryPrompt', getSummaryTemplate());
    bind.text('compaction_summary_prefill_textarea', 'compactionSummaryPrefill', getPrefill());

    document.getElementById('compaction_preview_btn')
        ?.addEventListener('click', showCompactionPromptPreview);
}

// ─── Prompt Composition ───

/**
 * Assemble the summary user prompt. `{{context}}` (the packed chat-minus-tail)
 * and `{{guidance}}` are substituted in place; when a placeholder is absent
 * the block is added the legacy way — context prepended, guidance appended
 * last and wrapped emphatically (it's the user's demanded detail, placed where
 * it carries the most weight). Shared by the real generation and Preview so
 * the preview never lies.
 */
export function composeSummaryPrompt(preambleBlock, guidance) {
    const guidanceText = (guidance || '').trim();
    const { text, used } = applyTemplateMacros(getSummaryTemplate(), {
        context: preambleBlock || '',
        guidance: guidanceText,
    });
    let prompt = text;
    if (!used.has('context') && preambleBlock) prompt = preambleBlock + prompt;
    if (!used.has('guidance') && guidanceText) {
        prompt = `${prompt}\n\nCRITICAL — the summary MUST explicitly preserve the following details:\n${guidanceText}`;
    }
    return prompt;
}

// Continue is a true positional continuation (mirrors ST's native Continue):
// the recap-so-far is sent as the assistant *prefill*, so createRawPrompt seeds
// it as the assistant prefix / trailing text and the model extends from the
// exact end. The user prompt therefore omits the recap text (it would otherwise
// be duplicated) and just notes the prefill.
function composeContinuePrompt(preambleBlock, guidance) {
    const base = composeSummaryPrompt(preambleBlock, guidance);
    return `${base}\n\nYour reply has been prefilled with the recap so far. Continue seamlessly from exactly where it stops — do not repeat any existing text. Maintain the same format. Output only the continuation.`;
}

export function showCompactionPromptPreview() {
    const sampleContext =
        'Chat history to summarize (the most recent messages are carried over verbatim and excluded here):\n'
        + '(character cards, persona, selected lore books, and packed chat history)\n\n';
    const prompt = composeSummaryPrompt(sampleContext, '(your Summary Guidance — demanded details to preserve)');
    showPromptPreview('Compaction — Summary Prompt Preview (Generate)', [
        { label: 'System Prompt (fixed)', text: COMPACTION_SUMMARY_SYSTEM_PROMPT },
        { label: 'User Prompt (template with sample values)', text: prompt },
        { label: 'Prefill (assistant prefix; kept at the start of the summary)', text: getPrefill() || '(none)' },
        {
            label: 'Note',
            text: 'Continue reuses the same template, but the recap so far is sent as the '
                + 'assistant prefill so the model picks up from its exact end (a true '
                + 'continuation, like ST\'s native Continue) rather than starting a fresh '
                + `section. System prompt:\n\n${COMPACTION_CONTINUE_SYSTEM_PROMPT}`,
        },
    ]);
}

// ─── Preamble ───

async function buildSummaryPreamble(responseLength) {
    const tail = getTailLength();
    const preamble = await buildContextPreamble({
        includeChat: true,
        loreBookNames: lorebookPicker?.getSelected() ?? [],
        responseLength,
        maxContextOverride: moduleSettings?.compactionMaxContextOverride || 0,
        excludeRecentCount: tail,
    });
    if (!preamble) return '';
    debug('Summary preamble length:', preamble.length);
    return `Chat history to summarize (the most recent ${tail} messages are carried over verbatim and are NOT included here):\n${preamble}\n\n`;
}

// ─── Modal ───

const actions = createGenerationActions({
    prefix: 'cc',
    outputId: 'cc_summary_output',
    noun: 'summary',
    aNoun: 'a summary',
    generateLabel: 'Generate Summary',
    statusText: { generate: 'Generating summary…', continue: 'Continuing summary…' },
    lockIds: ['cc_guidance'],
    responseLength: {
        get settings() { return moduleSettings; },
        key: 'compactionSummaryResponseLength',
        fallback: DEFAULT_COMPACTION_RESPONSE_LENGTH,
        save: () => saveSettingsFn?.(),
    },
    getPopup: () => activePopup,
    canRun: () => {
        const length = getContext().chat?.length || 0;
        if (length > getTailLength()) return true;
        toast(`The chat has ${length} messages — at or below the tail length (${getTailLength()}). There's nothing to summarize away.`, 'warning');
        return false;
    },
    run: (action, { existing, outputEl, responseLength }) => (action === 'continue'
        ? generateContinuation(existing, outputEl, responseLength)
        : generateSummary(outputEl, responseLength)),
    logLabel: 'Compaction summary',
    debug: (...args) => debug(...args),
});

async function openCompactionModal({ auto = false } = {}) {
    debug('openCompactionModal — auto:', auto, 'activePopup:', !!activePopup, 'compacting:', compacting);
    if (activePopup) return;
    if (!moduleSettings?.compactionEnabled) {
        debug('open refused — Compaction disabled');
        if (!auto) toast('Compaction is disabled. Enable it in the extension settings first.', 'warning');
        return;
    }
    const ctx = getContext();
    if (isGenerationInProgress()) {
        debug('open refused — generation in progress');
        if (!auto) toast('Wait for the current generation to finish before compacting.', 'warning');
        return;
    }
    if (compacting) return;
    if (!hasActiveCharacterOrGroup(ctx)) {
        debug('open refused — no active character/group');
        if (!auto) toast('Select a character or group chat before compacting.', 'warning');
        return;
    }
    debug('open allowed — chat length:', ctx.chat?.length, 'groupId:', ctx.groupId ?? '(solo)');

    actions.reset();
    const body = buildModalBody();

    const popup = new Popup(body, POPUP_TYPE.TEXT, '', {
        okButton: 'Compact',
        cancelButton: 'Cancel',
        wide: true,
        large: true,
        allowVerticalScrolling: true,
        onOpen: () => {
            bindModalHandlers();
            actions.bind();
            updateUsageBanner();
            debug('Modal opened', auto ? '(auto)' : '(manual)');
        },
        onClosing: (p) => {
            if (p.result === POPUP_RESULT.AFFIRMATIVE) {
                if (actions.isGenerating()) {
                    toast('Wait for the summary generation to finish before clicking Compact.', 'warning');
                    return false;
                }
                const summary = body.querySelector('#cc_summary_output')?.value?.trim() || '';
                if (!summary) {
                    toast('Generate or write a summary before compacting.', 'warning');
                    return false;
                }
                return true;
            }
            // Cancel / Esc / X — abort any in-flight summary gen, commit nothing.
            actions.stopIfRunning();
            return true;
        },
    });
    activePopup = popup;

    let committed = false;
    try {
        const result = await popup.show();
        if (result === POPUP_RESULT.AFFIRMATIVE) {
            const summary = body.querySelector('#cc_summary_output')?.value?.trim() || '';
            // Persist the final guidance text before tearing the modal down.
            scheduleGuidanceSave(body.querySelector('#cc_guidance')?.value || '');
            if (summary) {
                committed = true;
                await runCompaction({ summary });
            }
        }
    } finally {
        actions.commitResponseLength(body);
        activePopup = null;
        lorebookPicker = null;
        actions.reset();
        debug('Modal closed', committed ? '(compacted)' : '(no commit)');
    }
}

function buildModalBody() {
    const root = document.createElement('div');
    root.className = 'sse-modal-body';
    root.innerHTML = `
        <div class="sse-modal-banner cc-usage-banner" id="cc_usage_banner">Measuring context usage…</div>
        <div class="sse-modal-context">
            <div class="cc-lorebook-host"></div>
            <small class="cc-context-hint">Selected lore books are folded into the summary so canon isn't lost.</small>
        </div>
        <div class="sse-modal-preset-row">
            <label class="sse-modal-preset-label"><span class="fa-solid fa-file-pen"></span> Prompt Preset:</label>
            <div class="cc-preset-host"></div>
        </div>
        <div class="sse-modal-section">
            <div class="sse-modal-field-header">
                <label for="cc_guidance"><b>Summary Guidance:</b></label>
                ${smallButtonHtml('cc_clear_guidance_btn', 'fa-eraser', 'Clear', 'Clear the guidance')}
            </div>
            <textarea id="cc_guidance" class="text_pole" rows="3" placeholder="Demand specific details the summary must preserve (names, items, promises, plot threads, ongoing states…). Persisted per-chat."></textarea>
        </div>
        ${actionRowHtml('cc', {
        noun: 'summary',
        generateLabel: 'Generate Summary',
        generateTitle: 'Generate a fresh summary from the chat (replaces the preview)',
    })}
        ${tokensRowHtml('cc', { max: 16384, title: 'Maximum tokens for the summary generation' })}
        ${statusBarHtml('cc')}
        <div class="sse-modal-output-section">
            <div class="sse-modal-field-header">
                <label for="cc_summary_output"><b>Story so far (summary preview):</b></label>
                ${smallButtonHtml('cc_clear_output_btn', 'fa-eraser', 'Clear', 'Clear the summary preview')}
            </div>
            <textarea id="cc_summary_output" class="text_pole sse-modal-output" rows="16" placeholder="The generated summary will appear here. Edit it freely — this exact text becomes the &quot;Story so far&quot; message. Then click Compact."></textarea>
        </div>
    `;

    const guidanceEl = root.querySelector('#cc_guidance');
    guidanceEl.value = readGuidance();
    actions.fillResponseLength(root);

    lorebookPicker = createLoreBookPicker({
        classPrefix: MODAL_LOREBOOK_PREFIX,
        title: 'Lore Books',
        debug,
    });
    root.querySelector('.cc-lorebook-host').replaceWith(lorebookPicker.element);

    // Point-of-use preset selection — which summary prompt + prefill bundle
    // Generate Summary uses, synced with the settings widget (which also
    // manages presets).
    root.querySelector('.cc-preset-host').replaceWith(createToolPresetSelector({
        toolKey: 'compaction',
        title: 'Prompt preset used for Generate Summary — the bundle of summary prompt + prefill. '
            + 'Save and edit presets in the extension settings.',
    }));

    debug('Modal body built — guidance length:', guidanceEl.value.length);
    return root;
}

function bindModalHandlers() {
    const guidance = document.getElementById('cc_guidance');
    guidance?.addEventListener('input', () => scheduleGuidanceSave(guidance.value));

    document.getElementById('cc_clear_guidance_btn')?.addEventListener('click', () => {
        if (actions.isGenerating() || !guidance) return;
        guidance.value = '';
        scheduleGuidanceSave('');
        guidance.focus();
    });
}

async function updateUsageBanner() {
    const banner = document.getElementById('cc_usage_banner');
    if (!banner) return;
    try {
        const usage = await getContextUsage();
        if (usage.max <= 0) {
            banner.textContent = 'Context size unknown — compaction available, but the auto-threshold can\'t be measured.';
            banner.classList.toggle('cc-usage-high', false);
            return;
        }
        const pct = Math.round(usage.ratio * 100);
        const qualifier = usage.measured ? '' : ' (estimated)';
        banner.textContent = `Context ~${pct}% full${qualifier} (≈${usage.tokens} / ${usage.max} tokens).`;
        banner.classList.toggle('cc-usage-high', usage.ratio >= getThresholdRatio());
    } catch (err) {
        debug('Usage banner update failed:', err);
        banner.textContent = 'Context usage unavailable.';
    }
}

// ─── Summary Generation ───

async function generateSummary(outputEl, responseLength) {
    const guidance = document.getElementById('cc_guidance')?.value || '';
    const prompt = composeSummaryPrompt(await buildSummaryPreamble(responseLength), guidance);
    const prefill = getPrefill();
    debug('generateSummary — guidance length:', guidance.length, 'prompt length:', prompt.length,
        'responseLength:', responseLength, 'prefill?', !!prefill);
    return streamFresh({
        prompt, systemPrompt: COMPACTION_SUMMARY_SYSTEM_PROMPT, responseLength, prefill, outputEl,
        name: 'compaction-summary',
    });
}

async function generateContinuation(existing, outputEl, responseLength) {
    const guidance = document.getElementById('cc_guidance')?.value || '';
    const prompt = composeContinuePrompt(await buildSummaryPreamble(responseLength), guidance);
    debug('generateContinuation — existing length:', existing.length, 'prompt length:', prompt.length,
        'responseLength:', responseLength);
    return streamContinuation({
        prompt, systemPrompt: COMPACTION_CONTINUE_SYSTEM_PROMPT, responseLength, existing, outputEl,
        name: 'compaction-continue',
    });
}

// ─── Commit Pipeline ───

function deepClone(obj) {
    try {
        return structuredClone(obj);
    } catch (_) {
        return JSON.parse(JSON.stringify(obj));
    }
}

/**
 * Commit a compaction: snapshot per-chat state and the verbatim tail, create a
 * fresh chat, restore the migrated metadata, then seed the "Story so far"
 * message and the carried tail. Runs entirely under the `compacting` guard so
 * our own measurement/auto-trigger logic doesn't re-enter on the new chat.
 */
async function runCompaction({ summary }) {
    if (compacting) return;

    const ctx = getContext();
    const chat = Array.isArray(ctx.chat) ? ctx.chat : [];
    const tailLength = getTailLength();
    const messagesSummarized = chat.length - tailLength;
    if (messagesSummarized <= 0) {
        toast(`The chat has ${chat.length} messages — at or below the tail length (${tailLength}). Nothing to compact.`, 'warning');
        return;
    }

    compacting = true;
    debug('Commit starting — summarized:', messagesSummarized, 'tail:', tailLength);

    try {
        // 1. Snapshot the tail (deep copy — swipes/extra preserved) and the
        //    per-chat SSE metadata, before the new chat wipes everything.
        const tail = chat.slice(-tailLength).map(deepClone);
        const guidanceCarry = readGuidance();
        const metaSnapshot = {};
        if (moduleSettings.compactionMigrateState) {
            for (const key of MIGRATED_METADATA_KEYS) {
                const value = ctx.chatMetadata?.[key];
                if (value !== undefined) metaSnapshot[key] = deepClone(value);
            }
        }

        // 2. Create the fresh chat (solo or group). Clears chat + metadata and
        //    fires CHAT_CHANGED.
        const created = await createFreshChat();
        if (!created) {
            toast('Could not create a new chat — compaction aborted. The original chat is unchanged.', 'error');
            return;
        }
        // Drop any auto-added greeting so the new chat starts clean.
        if (typeof hostScript.clearChat === 'function') {
            await hostScript.clearChat({ clearData: true });
        }

        // 3. Restore metadata BEFORE seeding (fresh context — the new chat's
        //    chatMetadata is a different object).
        const ctx2 = getContext();
        for (const [key, value] of Object.entries(metaSnapshot)) {
            ctx2.chatMetadata[key] = value;
        }
        ctx2.chatMetadata[COMPACTION_METADATA_KEY] = { guidance: guidanceCarry };
        ctx2.saveMetadata();

        // 4. Seed the "Story so far" message, then the carried tail.
        const summaryMsg = {
            name: SUMMARY_MESSAGE_NAME,
            is_user: false,
            is_system: false,
            send_date: Date.now(),
            mes: summary,
            extra: { sse_summary: true },
        };
        ctx2.chat.push(summaryMsg);
        ctx2.addOneMessage(summaryMsg);
        for (const msg of tail) {
            ctx2.chat.push(msg);
            ctx2.addOneMessage(msg);
        }
        await ctx2.saveChat();
        tagCompactionSummaries();

        // 5. Re-sync per-chat module state with the restored metadata (the
        //    CHAT_CHANGED from step 2 saw the empty new chat).
        resyncChatStateFn?.();

        // 6. Reset measured tokens to cold-start for the compacted chat.
        lastPromptTokens = 0;

        toast(`Compacted: summarized ${messagesSummarized} message${messagesSummarized === 1 ? '' : 's'}, kept the last ${tailLength}.`, 'success');
        debug('Commit complete');
    } catch (err) {
        console.error('Compaction commit failed:', err);
        toast(`Compaction failed: ${err.message}`, 'error');
    } finally {
        compacting = false;
    }
}

/**
 * Create a fresh chat for the current character or group, preferring ST's
 * `doNewChat` (handles both solo and group internally) and falling back to
 * confirmed primitives if a build lacks the export.
 *
 * @returns {Promise<boolean>} Whether a new chat was created.
 */
async function createFreshChat() {
    const ctx = getContext();
    if (typeof hostScript.doNewChat === 'function') {
        await hostScript.doNewChat({ deleteCurrentChat: false });
        return true;
    }
    debug('doNewChat unavailable — using fallback chat creation');
    if (ctx.groupId && typeof createNewGroupChat === 'function') {
        await createNewGroupChat(ctx.groupId);
        return true;
    }
    if (typeof hostScript.clearChat === 'function') {
        await hostScript.clearChat({ clearData: true });
        if (typeof ctx.saveChat === 'function') await ctx.saveChat();
        return true;
    }
    return false;
}
