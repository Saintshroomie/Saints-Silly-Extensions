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
import { removeReasoningFromString } from '../../../../reasoning.js';
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
    createDebugLogger,
    toast,
    buildContextPreamble,
    createLoreBookPicker,
    streamingGenerate,
    withSingleLineDisabled,
    applyTemplateMacros,
    stripPrefillEcho,
    showPromptPreview,
    estimateChatTokens,
} from './utils.js';
import {
    abortAllGenerations,
    isSilentGenerationAbort,
} from './silent-generation.js';

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
const MIGRATED_METADATA_KEYS = ['possession', 'narrativeGuidance', 'phraseBan'];

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

// Modal summary-generation runtime (mirrors ACC).
let isGenerating = false;
let abortRequested = false;
let activeAction = null;   // which button initiated the current generation
let lastAction = null;     // 'generate' | 'continue' — what Retry should redo
let restorePoint = null;   // preview snapshot used by Retry

let activePopup = null;
let activeBody = null;

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
    const stored = moduleSettings?.compactionSummaryPrompt;
    return (typeof stored === 'string' && stored.trim()) ? stored : DEFAULT_COMPACTION_SUMMARY_PROMPT;
}

function getPrefill() {
    const stored = moduleSettings?.compactionSummaryPrefill;
    return (typeof stored === 'string') ? stored : DEFAULT_COMPACTION_SUMMARY_PREFILL;
}

function getTailLength() {
    const n = moduleSettings?.compactionTailLength;
    return (Number.isFinite(n) && n > 0) ? Math.floor(n) : DEFAULT_COMPACTION_TAIL_LENGTH;
}

function getThresholdRatio() {
    const n = moduleSettings?.compactionThresholdPercent;
    const pct = (Number.isFinite(n) && n > 0) ? n : DEFAULT_COMPACTION_THRESHOLD_PERCENT;
    return Math.min(Math.max(pct, 1), 100) / 100;
}

function getResponseLength() {
    const input = document.getElementById('cc_response_length');
    if (input) {
        const parsed = parseInt(input.value, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    const setting = moduleSettings?.compactionSummaryResponseLength;
    if (typeof setting === 'number' && setting > 0) return setting;
    return DEFAULT_COMPACTION_RESPONSE_LENGTH;
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
    if (ctx.isGenerating) return;
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
    if (getContext().isGenerating) return;
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
    bindCheckbox('compaction_enabled', 'compactionEnabled', saveSettings);
    bindCheckbox('compaction_auto_enabled', 'compactionAutoEnabled', saveSettings);
    bindCheckbox('compaction_confirm_auto', 'compactionConfirmAuto', saveSettings);
    bindCheckbox('compaction_migrate_state', 'compactionMigrateState', saveSettings);
    bindCheckbox('compaction_debug_mode', 'compactionDebugMode', saveSettings);

    bindNumber('compaction_threshold_percent', 'compactionThresholdPercent', saveSettings, { min: 1, max: 100 });
    bindNumber('compaction_tail_length', 'compactionTailLength', saveSettings, { min: 1 });
    bindNumber('compaction_response_length', 'compactionSummaryResponseLength', saveSettings, { min: 50 });
    bindNumber('compaction_max_context_override', 'compactionMaxContextOverride', saveSettings, { min: 0, allowZero: true });

    const promptArea = document.getElementById('compaction_summary_prompt_textarea');
    if (promptArea) {
        promptArea.value = moduleSettings.compactionSummaryPrompt || DEFAULT_COMPACTION_SUMMARY_PROMPT;
        promptArea.addEventListener('input', () => {
            moduleSettings.compactionSummaryPrompt = promptArea.value;
            saveSettings();
        });
    }

    const prefillArea = document.getElementById('compaction_summary_prefill_textarea');
    if (prefillArea) {
        prefillArea.value = (typeof moduleSettings.compactionSummaryPrefill === 'string')
            ? moduleSettings.compactionSummaryPrefill
            : DEFAULT_COMPACTION_SUMMARY_PREFILL;
        prefillArea.addEventListener('input', () => {
            moduleSettings.compactionSummaryPrefill = prefillArea.value;
            saveSettings();
        });
    }

    document.getElementById('compaction_preview_btn')
        ?.addEventListener('click', showCompactionPromptPreview);
}

function bindCheckbox(id, key, saveSettings) {
    const cb = document.getElementById(id);
    if (!cb) return;
    cb.checked = !!moduleSettings[key];
    cb.addEventListener('change', () => {
        moduleSettings[key] = cb.checked;
        saveSettings();
    });
}

function bindNumber(id, key, saveSettings, { min = 0, max = Infinity, allowZero = false } = {}) {
    const input = document.getElementById(id);
    if (!input) return;
    input.value = Number.isFinite(moduleSettings[key]) ? moduleSettings[key] : 0;
    input.addEventListener('input', () => {
        const n = parseInt(input.value, 10);
        if (!Number.isFinite(n)) return;
        if (allowZero && n === 0) {
            moduleSettings[key] = 0;
            saveSettings();
            return;
        }
        if (n >= min && n <= max) {
            moduleSettings[key] = n;
            saveSettings();
        }
    });
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

function composeContinuePrompt(preambleBlock, guidance, existing) {
    const base = composeSummaryPrompt(preambleBlock, guidance);
    return `${base}\n\nRecap so far:\n${existing}\n\nContinue exactly where the recap leaves off. Do not repeat any text already present. Maintain the same format. Output only the continuation.`;
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
            text: 'Continue reuses the same template plus a "Recap so far: …" block and '
                + `continuation instructions, with this system prompt:\n\n${COMPACTION_CONTINUE_SYSTEM_PROMPT}`,
        },
    ]);
}

// ─── Preamble ───

async function buildSummaryPreamble(loreBookNames) {
    const tail = getTailLength();
    const preamble = await buildContextPreamble({
        includeChat: true,
        loreBookNames: Array.isArray(loreBookNames) ? loreBookNames : [],
        responseLength: getResponseLength(),
        maxContextOverride: moduleSettings?.compactionMaxContextOverride || 0,
        excludeRecentCount: tail,
    });
    if (!preamble) return '';
    debug('Summary preamble length:', preamble.length);
    return `Chat history to summarize (the most recent ${tail} messages are carried over verbatim and are NOT included here):\n${preamble}\n\n`;
}

// ─── Modal ───

async function openCompactionModal({ auto = false } = {}) {
    if (activePopup) return;
    if (!moduleSettings?.compactionEnabled) {
        if (!auto) toast('Compaction is disabled. Enable it in the extension settings first.', 'warning');
        return;
    }
    const ctx = getContext();
    if (ctx.isGenerating) {
        if (!auto) toast('Wait for the current generation to finish before compacting.', 'warning');
        return;
    }
    if (compacting) return;
    if (!hasActiveCharacterOrGroup(ctx)) {
        if (!auto) toast('Select a character or group chat before compacting.', 'warning');
        return;
    }

    isGenerating = false;
    abortRequested = false;
    activeAction = null;
    lastAction = null;
    restorePoint = null;

    const body = buildModalBody();

    const popup = new Popup(body, POPUP_TYPE.TEXT, '', {
        okButton: 'Compact',
        cancelButton: 'Cancel',
        wide: true,
        large: true,
        allowVerticalScrolling: true,
        onOpen: () => {
            bindModalHandlers();
            refreshActionButtonStates();
            updateUsageBanner();
            debug('Modal opened', auto ? '(auto)' : '(manual)');
        },
        onClosing: (p) => {
            if (p.result === POPUP_RESULT.AFFIRMATIVE) {
                if (isGenerating) {
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
            if (isGenerating) {
                abortRequested = true;
                stopGeneration();
            }
            return true;
        },
    });
    activePopup = popup;
    activeBody = body;

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
        activePopup = null;
        activeBody = null;
        isGenerating = false;
        activeAction = null;
        lastAction = null;
        restorePoint = null;
        debug('Modal closed', committed ? '(compacted)' : '(no commit)');
    }
}

function buildModalBody() {
    const root = document.createElement('div');
    root.className = 'cc-modal-body';
    root.innerHTML = `
        <div class="cc-usage-banner" id="cc_usage_banner">Measuring context usage…</div>
        <div class="cc-context-section">
            <div class="cc-lorebook-host"></div>
            <small class="cc-context-hint">Selected lore books are folded into the summary so canon isn't lost.</small>
        </div>
        <div class="cc-guidance-section">
            <div class="cc-field-header">
                <label for="cc_guidance"><b>Summary Guidance:</b></label>
                <div id="cc_clear_guidance_btn" class="menu_button interactable cc-clear-btn" title="Clear the guidance">
                    <span class="fa-solid fa-eraser"></span> Clear
                </div>
            </div>
            <textarea id="cc_guidance" class="text_pole" rows="3" placeholder="Demand specific details the summary must preserve (names, items, promises, plot threads, ongoing states…). Persisted per-chat."></textarea>
        </div>
        <div class="cc-action-row">
            <div id="cc_generate_btn" class="menu_button interactable cc-action-btn cc-generate-btn" title="Generate a fresh summary from the chat (replaces the preview)">
                <span class="fa-solid fa-wand-magic-sparkles"></span> Generate Summary
            </div>
            <div id="cc_continue_btn" class="menu_button interactable cc-action-btn" title="Continue from where the summary leaves off">
                <span class="fa-solid fa-arrow-right"></span> Continue
            </div>
            <div id="cc_checkpoint_btn" class="menu_button interactable cc-action-btn" title="Save the current summary as the Retry restore point">
                <span class="fa-solid fa-flag"></span> Checkpoint
            </div>
            <div id="cc_retry_btn" class="menu_button interactable cc-action-btn" title="Restore to the last snapshot and re-run the last action">
                <span class="fa-solid fa-rotate-right"></span> Retry
            </div>
        </div>
        <div class="cc-tokens-row">
            <label class="cc-tokens-label" for="cc_response_length" title="Maximum tokens for the summary generation">
                <span class="fa-solid fa-coins"></span> Max Tokens:
            </label>
            <input id="cc_response_length" type="number" class="text_pole cc-tokens-input" min="50" max="16384" step="50" />
        </div>
        <div class="cc-status-bar cc-hidden" id="cc_status_bar">
            <span class="fa-solid fa-spinner fa-spin"></span>
            <span id="cc_status_text"></span>
        </div>
        <div class="cc-summary-section">
            <div class="cc-field-header">
                <label for="cc_summary_output"><b>Story so far (summary preview):</b></label>
                <div id="cc_clear_output_btn" class="menu_button interactable cc-clear-btn" title="Clear the summary preview">
                    <span class="fa-solid fa-eraser"></span> Clear
                </div>
            </div>
            <textarea id="cc_summary_output" class="text_pole cc-summary-output" rows="16" placeholder="The generated summary will appear here. Edit it freely — this exact text becomes the &quot;Story so far&quot; message. Then click Compact."></textarea>
        </div>
    `;

    const guidanceEl = root.querySelector('#cc_guidance');
    if (guidanceEl) guidanceEl.value = readGuidance();

    const tokenInput = root.querySelector('#cc_response_length');
    if (tokenInput) tokenInput.value = String(getResponseLength());

    const picker = createLoreBookPicker({
        classPrefix: 'cc-lorebook',
        title: 'Lore Books',
    });
    root.querySelector('.cc-lorebook-host').replaceWith(picker.element);
    root._ccLorebookPicker = picker;

    return root;
}

function bindModalHandlers() {
    document.getElementById('cc_generate_btn')?.addEventListener('click', handleGenerate);
    document.getElementById('cc_continue_btn')?.addEventListener('click', handleContinue);
    document.getElementById('cc_checkpoint_btn')?.addEventListener('click', handleCheckpoint);
    document.getElementById('cc_retry_btn')?.addEventListener('click', handleRetry);

    const output = document.getElementById('cc_summary_output');
    output?.addEventListener('input', refreshActionButtonStates);

    const guidance = document.getElementById('cc_guidance');
    guidance?.addEventListener('input', () => scheduleGuidanceSave(guidance.value));

    const tokenInput = document.getElementById('cc_response_length');
    tokenInput?.addEventListener('change', () => {
        const parsed = parseInt(tokenInput.value, 10);
        if (!isNaN(parsed) && parsed > 0) {
            moduleSettings.compactionSummaryResponseLength = parsed;
            saveSettingsFn?.();
        }
    });

    document.getElementById('cc_clear_guidance_btn')?.addEventListener('click', () => {
        if (isGenerating) return;
        const g = document.getElementById('cc_guidance');
        if (!g) return;
        g.value = '';
        scheduleGuidanceSave('');
        g.focus();
    });

    document.getElementById('cc_clear_output_btn')?.addEventListener('click', () => {
        if (isGenerating) return;
        const out = document.getElementById('cc_summary_output');
        if (!out) return;
        out.value = '';
        restorePoint = null;
        lastAction = null;
        out.focus();
        refreshActionButtonStates();
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

// ─── Modal Actions (mirror ACC) ───

function readModalLoreBooks() {
    const picker = activeBody?._ccLorebookPicker;
    return picker ? picker.getSelected() : [];
}

async function handleGenerate() {
    if (isGenerating) {
        if (activeAction === 'generate') {
            abortRequested = true;
            stopGeneration();
        }
        return;
    }
    const ctx = getContext();
    if ((ctx.chat?.length || 0) <= getTailLength()) {
        toast(`The chat has ${ctx.chat?.length || 0} messages — at or below the tail length (${getTailLength()}). There's nothing to summarize away.`, 'warning');
        return;
    }
    const output = document.getElementById('cc_summary_output');
    restorePoint = output?.value || '';
    await runSummaryGeneration('generate');
}

async function handleContinue() {
    if (isGenerating) {
        if (activeAction === 'continue') {
            abortRequested = true;
            stopGeneration();
        }
        return;
    }
    const output = document.getElementById('cc_summary_output');
    const existing = output?.value || '';
    if (!existing.trim()) {
        toast('Nothing to continue from. Generate a summary first or type some text.', 'warning');
        return;
    }
    restorePoint = existing;
    await runSummaryGeneration('continue');
}

function handleCheckpoint() {
    if (isGenerating) return;
    const output = document.getElementById('cc_summary_output');
    const current = output?.value || '';
    if (!current.trim()) {
        toast('Nothing to checkpoint — the summary is empty.', 'warning');
        return;
    }
    restorePoint = current;
    lastAction = 'continue';
    toast('Checkpoint saved. Retry will restore to this point.', 'success');
    refreshActionButtonStates();
}

async function handleRetry() {
    if (isGenerating) return;
    if (!lastAction || restorePoint === null) {
        toast('Nothing to retry yet.', 'warning');
        return;
    }
    if (lastAction === 'continue' && !restorePoint.trim()) {
        toast('Cannot continue from an empty restore point.', 'warning');
        return;
    }
    const output = document.getElementById('cc_summary_output');
    if (output) output.value = restorePoint;
    await runSummaryGeneration(lastAction);
}

async function runSummaryGeneration(action) {
    isGenerating = true;
    abortRequested = false;
    activeAction = action;

    const isContinue = action === 'continue';
    setGeneratingUI(true, action);
    setStatusBar(isContinue ? 'Continuing summary…' : 'Generating summary…');

    try {
        const loreBookNames = readModalLoreBooks();
        const guidance = document.getElementById('cc_guidance')?.value || '';
        const output = document.getElementById('cc_summary_output');
        const existing = output?.value || '';

        const result = isContinue
            ? await generateContinuation(loreBookNames, guidance, existing)
            : await generateSummary(loreBookNames, guidance);

        if (abortRequested) {
            debug(`${action} aborted, discarding result`);
            return;
        }
        if (!output) return;
        if (isContinue) {
            const sep = needsSeparator(existing) ? ' ' : '';
            output.value = existing + sep + result;
        } else {
            output.value = result;
        }
        lastAction = action;
        debug(`${action} complete, length:`, result.length);
    } catch (err) {
        if (isSilentGenerationAbort(err)) {
            debug(`${action} aborted via cancellation`);
        } else if (!abortRequested) {
            console.error('Compaction summary error:', err);
            toast(`Summary generation failed: ${err.message}`, 'error');
        }
    } finally {
        isGenerating = false;
        abortRequested = false;
        activeAction = null;
        setGeneratingUI(false, action);
        setStatusBar(null);
        refreshActionButtonStates();
    }
}

function needsSeparator(text) {
    if (!text) return false;
    const last = text[text.length - 1];
    return last !== ' ' && last !== '\n' && last !== '\t';
}

async function generateSummary(loreBookNames, guidance) {
    const preambleBlock = await buildSummaryPreamble(loreBookNames);
    const prompt = composeSummaryPrompt(preambleBlock, guidance);
    const systemPrompt = COMPACTION_SUMMARY_SYSTEM_PROMPT;
    const responseLength = getResponseLength();
    const prefill = getPrefill();

    debug('Generating summary, tokens', responseLength, 'prefill?', !!prefill);

    const outputEl = document.getElementById('cc_summary_output');
    const result = await withSingleLineDisabled(() => streamingGenerate(
        { prompt, systemPrompt, responseLength, ...(prefill ? { prefill } : {}) },
        outputEl,
        { append: false },
    ));
    const cleaned = stripPrefillEcho(removeReasoningFromString(result).trim(), prefill);
    return (prefill || '') + cleaned;
}

async function generateContinuation(loreBookNames, guidance, existing) {
    const preambleBlock = await buildSummaryPreamble(loreBookNames);
    const prompt = composeContinuePrompt(preambleBlock, guidance, existing);
    const systemPrompt = COMPACTION_CONTINUE_SYSTEM_PROMPT;
    const responseLength = getResponseLength();

    debug('Continuing summary, existing length', existing.length);

    const outputEl = document.getElementById('cc_summary_output');
    const result = await withSingleLineDisabled(() => streamingGenerate(
        { prompt, systemPrompt, responseLength },
        outputEl,
        { append: true },
    ));
    return removeReasoningFromString(result).trim();
}

function stopGeneration() {
    // Route through abortAllGenerations() so ST's GENERATION_STOPPED fires and
    // the backend actually halts (not just our local controllers).
    abortAllGenerations('compaction-cancel');
    debug('Stop generation triggered');
}

// ─── Modal UI Helpers ───

const ACTION_BUTTON_IDS = ['cc_generate_btn', 'cc_continue_btn', 'cc_checkpoint_btn', 'cc_retry_btn'];

const ACTION_LABELS = {
    cc_generate_btn: '<span class="fa-solid fa-wand-magic-sparkles"></span> Generate Summary',
    cc_continue_btn: '<span class="fa-solid fa-arrow-right"></span> Continue',
    cc_checkpoint_btn: '<span class="fa-solid fa-flag"></span> Checkpoint',
    cc_retry_btn: '<span class="fa-solid fa-rotate-right"></span> Retry',
};

function setGeneratingUI(generating, action) {
    const guidanceInput = document.getElementById('cc_guidance');
    const activeBtnId = action === 'continue' ? 'cc_continue_btn' : 'cc_generate_btn';

    for (const id of ACTION_BUTTON_IDS) {
        const btn = document.getElementById(id);
        if (!btn) continue;
        if (generating) {
            if (id === activeBtnId) {
                btn.innerHTML = '<span class="fa-solid fa-stop"></span> Stop';
                btn.classList.remove('cc-disabled');
            } else {
                btn.innerHTML = ACTION_LABELS[id];
                btn.classList.add('cc-disabled');
            }
        } else {
            btn.innerHTML = ACTION_LABELS[id];
            btn.classList.remove('cc-disabled');
        }
    }

    const okBtn = activePopup?.okButton;
    if (okBtn) okBtn.classList.toggle('disabled', !!generating);

    if (generating) {
        guidanceInput?.setAttribute('disabled', 'true');
    } else {
        guidanceInput?.removeAttribute('disabled');
        refreshActionButtonStates();
    }
}

function refreshActionButtonStates() {
    if (isGenerating) return;
    const output = document.getElementById('cc_summary_output');
    const hasText = !!output?.value?.trim();
    setButtonDisabled('cc_continue_btn', !hasText);
    setButtonDisabled('cc_checkpoint_btn', !hasText);
    setButtonDisabled('cc_retry_btn', !lastAction || restorePoint === null);
}

function setButtonDisabled(id, disabled) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.classList.toggle('cc-disabled', disabled);
}

function setStatusBar(message) {
    const bar = document.getElementById('cc_status_bar');
    const text = document.getElementById('cc_status_text');
    if (!bar || !text) return;
    if (message) {
        text.textContent = message;
        bar.classList.remove('cc-hidden');
    } else {
        bar.classList.add('cc-hidden');
    }
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
