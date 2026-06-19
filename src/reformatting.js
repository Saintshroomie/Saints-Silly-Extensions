/**
 * Reformatting module — normalizes the formatting of AI character messages
 * after they're generated, so they always match the prose style you want.
 *
 * Two interchangeable engines, picked in the settings panel:
 *   - Rules  — fast, free, deterministic transforms. Strip italic/bold
 *              asterisks, wrap narration (everything outside quoted dialogue)
 *              in asterisks, and/or collapse excess whitespace.
 *   - LLM    — send the message to the model with an editable prompt and let
 *              it rewrite the formatting. Routed through the shared
 *              silent-generation manager so the Stop button cancels it.
 *
 * Manual only: reformat a message with the per-message button injected into
 * `.mes_buttons` (kept present by a `#chat` MutationObserver) or with the
 * `/reformat` slash command. The original text is preserved as a swipe, so a
 * reformat is always non-destructive and reversible.
 */

import { SlashCommandParser } from '../../../../slash-commands/SlashCommandParser.js';
import { SlashCommand } from '../../../../slash-commands/SlashCommand.js';
import { removeReasoningFromString } from '../../../../reasoning.js';
import {
    getContext,
    createDebugLogger,
    toast,
    stickyToast,
    streamingGenerate,
    withSingleLineDisabled,
    applyTemplateMacros,
    stripPrefillEcho,
    showPromptPreview,
} from './utils.js';
import {
    isSilentGenerationAbort,
} from './silent-generation.js';

// ─── Constants ───

// {{message}} is this extension's placeholder (substituted by
// applyTemplateMacros). If it's removed, the message is appended instead.
export const DEFAULT_REFORMATTING_PROMPT =
    'Reformat the message below so its prose matches the target style. ' +
    'Keep the meaning, dialogue, and wording exactly the same — only change ' +
    'the formatting (markdown markers, emphasis, spacing). Do not add, remove, ' +
    'continue, or rewrite any content. Output only the reformatted message, ' +
    'with no commentary.\n\n' +
    'Target style: narration is plain text; spoken dialogue stays inside ' +
    'double quotes; no asterisks or other emphasis markers.\n\n' +
    'Message to reformat:\n{{message}}';

export const DEFAULT_REFORMATTING_PREFILL = '';

export const DEFAULT_REFORMATTING_RESPONSE_LENGTH = 800;

export const DEFAULT_REFORMATTING_SYSTEM_PROMPT =
    'You are a text-formatting assistant. You reformat a single message to ' +
    'match a requested style without changing its meaning, dialogue, or ' +
    'wording. Output only the reformatted message — no commentary, no preamble.';

// Per-swipe guard flag: set on the swipe_info entry of a reformatted swipe so
// the auto path never re-processes (or, for the wrap rule, double-wraps) text
// it already produced.
const REFORMAT_FLAG = 'sseReformatted';

// ─── Module State ───

let moduleSettings = null;
let debug = () => {};
let observer = null;
let listenersInstalled = false;
// Guards the auto path against reformatting a message we're mid-way through
// committing (the saveChat / re-render can re-enter the observer/events).
let busy = false;

// ─── Init ───

/**
 * @param {object} options
 * @param {object} options.settings - Shared mutable settings reference.
 */
export function initReformatting({ settings }) {
    moduleSettings = settings;
    debug = createDebugLogger('REFORMAT', () => moduleSettings.reformattingDebugMode);
    debug('Module initialized');
}

// ─── Deterministic Rules ───

/** Remove every asterisk (markdown italic / bold emphasis marker). */
function stripAsterisks(text) {
    return text.replace(/\*/g, '');
}

/**
 * Wrap the narration core of a single line in asterisks, leaving any quoted
 * dialogue untouched. Surrounding whitespace is preserved so paragraph shape
 * and spacing around dialogue survive.
 */
function wrapNarrationLine(line) {
    if (!line.trim()) return line;

    // Match balanced quote pairs (straight or curly). Everything between/around
    // them is narration.
    const quoteRe = /["“][^"”]*["”]/g;
    let result = '';
    let lastIndex = 0;
    let match;
    while ((match = quoteRe.exec(line)) !== null) {
        result += wrapNarrationSpan(line.slice(lastIndex, match.index));
        result += match[0];
        lastIndex = quoteRe.lastIndex;
    }
    result += wrapNarrationSpan(line.slice(lastIndex));
    return result;
}

/** Wrap a single non-dialogue span's trimmed core in asterisks. */
function wrapNarrationSpan(span) {
    const lead = span.match(/^\s*/)[0];
    const trail = span.match(/\s*$/)[0];
    const core = span.slice(lead.length, span.length - trail.length);
    if (!core) return span;
    return `${lead}*${core}*${trail}`;
}

/** Apply the narration-wrapping rule line by line (preserving line breaks). */
function wrapNarration(text) {
    return text.split('\n').map(wrapNarrationLine).join('\n');
}

/** Collapse runs of 3+ blank lines to one, and trim trailing spaces per line. */
function collapseWhitespace(text) {
    return text
        .split('\n')
        .map(line => line.replace(/[ \t]+$/, ''))
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/**
 * Run the configured deterministic rules over `text`. Asterisk handling is a
 * single mutually-exclusive choice ('none' | 'strip' | 'wrap'); 'wrap' strips
 * existing asterisks first so the output is canonical regardless of the input
 * (and never doubles markers). Whitespace collapsing is independent and
 * applies on top of any asterisk mode.
 *
 * @param {string} text
 * @returns {string} The reformatted text (unchanged if no rules apply).
 */
export function applyRulesReformat(text) {
    let out = text;
    const mode = moduleSettings.reformattingAsteriskMode || 'strip';
    if (mode === 'strip') {
        out = stripAsterisks(out);
    } else if (mode === 'wrap') {
        out = wrapNarration(stripAsterisks(out));
    }
    if (moduleSettings.reformattingCollapseWhitespace) {
        out = collapseWhitespace(out);
    }
    return out;
}

// ─── LLM Engine ───

function getReformattingResponseLength() {
    const n = moduleSettings?.reformattingResponseLength;
    return (typeof n === 'number' && n > 0) ? n : DEFAULT_REFORMATTING_RESPONSE_LENGTH;
}

function getReformattingPromptTemplate() {
    return (moduleSettings?.reformattingPrompt && moduleSettings.reformattingPrompt.trim())
        ? moduleSettings.reformattingPrompt
        : DEFAULT_REFORMATTING_PROMPT;
}

function getReformattingSystemPrompt() {
    return (moduleSettings?.reformattingSystemPrompt && moduleSettings.reformattingSystemPrompt.trim())
        ? moduleSettings.reformattingSystemPrompt
        : DEFAULT_REFORMATTING_SYSTEM_PROMPT;
}

/**
 * Assemble the LLM reformatting user prompt. {{message}} is substituted in
 * place; if it's absent the message is appended so old templates still work.
 */
function composeReformattingPrompt(message) {
    const { text, used } = applyTemplateMacros(getReformattingPromptTemplate(), { message });
    if (!used.has('message')) {
        return `${text}\n\nMessage to reformat:\n${message}`;
    }
    return text;
}

/**
 * Reformat `text` via the LLM. Returns the cleaned result, or '' on empty.
 * Throws AbortError if cancelled (caller suppresses via isSilentGenerationAbort).
 */
async function runLLMReformat(text) {
    const prefill = (typeof moduleSettings?.reformattingPrefill === 'string')
        ? moduleSettings.reformattingPrefill
        : DEFAULT_REFORMATTING_PREFILL;
    const userPrompt = composeReformattingPrompt(text);

    debug('LLM reformat — prompt length:', userPrompt.length, 'prefill:', prefill);

    const raw = await withSingleLineDisabled(() => streamingGenerate(
        {
            prompt: userPrompt,
            systemPrompt: getReformattingSystemPrompt(),
            responseLength: getReformattingResponseLength(),
            ...(prefill ? { prefill } : {}),
        },
        null,
        { name: 'reformatting' },
    ));

    let cleaned = removeReasoningFromString(raw).trim();
    if (prefill) cleaned = (prefill + stripPrefillEcho(cleaned, prefill));
    return cleaned.trim();
}

// ─── Message Application ───

/** True when the message at `index` is an AI character message we may reformat. */
function isReformattableMessage(msg) {
    return !!msg && !msg.is_user && !msg.is_system && typeof msg.mes === 'string' && msg.mes.trim().length > 0;
}

/**
 * Preserve the message's current text as a swipe and install `reformatted` as
 * a new active swipe. Mirrors ST's own swipe bookkeeping (see the
 * manage-chat-messages guide) so the swipe counter and arrows stay in sync.
 */
function commitReformat(index, msg, reformatted) {
    const context = getContext();

    if (!Array.isArray(msg.swipes) || msg.swipes.length === 0) {
        msg.swipes = [msg.mes];
        msg.swipe_id = 0;
        msg.swipe_info = [msg.swipe_info?.[0] || {}];
    }

    msg.swipes.push(reformatted);
    msg.swipe_info.push({ send_date: new Date().toISOString(), [REFORMAT_FLAG]: true });
    msg.swipe_id = msg.swipes.length - 1;
    msg.mes = reformatted;

    // Re-render the message body, then refresh swipe chevrons / counter.
    if (typeof context.updateMessageBlock === 'function') {
        context.updateMessageBlock(index, msg);
    }
    if (context.swipe?.refresh) {
        context.swipe.refresh(true);
    } else {
        const el = document.querySelector(`#chat .mes[mesid="${index}"]`);
        const counter = el?.querySelector('.swipes-counter');
        if (counter) counter.textContent = `${msg.swipe_id + 1}/${msg.swipes.length}`;
    }
}

/**
 * Reformat one message by chat index.
 *
 * @param {number} index
 * @param {{ manual?: boolean }} [opts] - `manual` clicks ignore the per-swipe
 *        guard and surface "no change" toasts; the auto path stays silent.
 * @returns {Promise<boolean>} `true` if the message was changed.
 */
export async function reformatMessage(index, { manual = false } = {}) {
    if (busy) {
        debug('reformatMessage — skipped (already running)');
        return false;
    }
    const context = getContext();
    const msg = context.chat?.[index];
    if (!isReformattableMessage(msg)) {
        if (manual) toast('Nothing to reformat in this message.', 'warning');
        return false;
    }

    // Per-swipe guard — auto never re-touches a swipe we already produced.
    if (!manual && msg.swipe_info?.[msg.swipe_id ?? 0]?.[REFORMAT_FLAG]) {
        debug('reformatMessage — skipped (swipe already reformatted)');
        return false;
    }

    const original = msg.mes;
    const useLLM = moduleSettings.reformattingEngine === 'llm';

    busy = true;
    let dismissToast = () => {};
    if (manual && useLLM) dismissToast = stickyToast('Reformatting message…', 'info');

    try {
        let reformatted;
        if (useLLM) {
            reformatted = await runLLMReformat(original);
        } else {
            reformatted = applyRulesReformat(original);
        }

        if (!reformatted) {
            if (manual) toast('Reformatting produced an empty result; left unchanged.', 'warning');
            return false;
        }
        if (reformatted === original) {
            debug('reformatMessage — no change for index', index);
            if (manual) toast('Message already matches the target format.', 'info');
            return false;
        }

        commitReformat(index, msg, reformatted);
        await context.saveChat();
        debug('reformatMessage — reformatted index', index, '| engine:', useLLM ? 'llm' : 'rules');
        if (manual) toast('Message reformatted. The original is kept as a swipe.', 'success');
        return true;
    } catch (err) {
        if (isSilentGenerationAbort(err)) {
            debug('reformatMessage — cancelled for index', index);
        } else {
            console.error('Reformatting error:', err);
            if (manual) toast(`Reformatting failed: ${err.message}`, 'error');
        }
        return false;
    } finally {
        busy = false;
        dismissToast();
    }
}

// ─── Per-message Button ───

function makeReformatButton() {
    const btn = document.createElement('div');
    btn.className = 'mes_button sse-reformat-button fa-solid fa-text-slash interactable';
    btn.title = 'Reformat this message (keeps the original as a swipe)';
    btn.tabIndex = 0;
    btn.addEventListener('click', onReformatButtonClick);
    return btn;
}

function onReformatButtonClick(event) {
    const mesEl = event.currentTarget.closest('.mes');
    if (!mesEl) return;
    const mesId = mesEl.getAttribute('mesid');
    const index = mesId !== null ? parseInt(mesId, 10) : -1;
    if (index < 0 || Number.isNaN(index)) return;
    if (getContext().isGenerating) return;
    reformatMessage(index, { manual: true });
}

/** Inject the reformat button into a single `.mes` element if eligible. */
function injectButtonInto(mesEl) {
    if (!(mesEl instanceof HTMLElement)) return;
    if (!mesEl.matches?.('.mes')) return;
    // AI character messages only — skip the user's own and system messages.
    if (mesEl.getAttribute('is_user') === 'true') return;
    if (mesEl.getAttribute('is_system') === 'true') return;
    const buttons = mesEl.querySelector('.mes_buttons');
    if (!buttons) return;
    if (buttons.querySelector('.sse-reformat-button')) return;

    // Sit alongside the other quick buttons, before the hover-revealed group.
    const extra = buttons.querySelector('.extraMesButtons');
    const btn = makeReformatButton();
    if (extra) {
        buttons.insertBefore(btn, extra);
    } else {
        buttons.appendChild(btn);
    }
}

/** (Re)scan every message in the chat and inject buttons where missing. */
export function rescanReformatButtons() {
    if (!moduleSettings?.reformattingEnabled) return;
    document.querySelectorAll('#chat .mes').forEach(injectButtonInto);
}

/** Remove every injected reformat button (on disable). */
export function removeAllReformatButtons() {
    document.querySelectorAll('.sse-reformat-button').forEach(el => el.remove());
}

/**
 * Watch the chat for messages appearing / re-rendering and keep each AI
 * message's reformat button present. ST re-renders message nodes on swipe,
 * edit, and load, which can drop injected DOM — the observer re-adds it.
 */
export function startReformattingObserver() {
    if (listenersInstalled) return;
    listenersInstalled = true;

    const attachObserver = () => {
        if (observer) return;
        const chat = document.getElementById('chat');
        if (!chat) return;
        observer = new MutationObserver((mutations) => {
            if (!moduleSettings?.reformattingEnabled) return;
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (!(node instanceof HTMLElement)) continue;
                    if (node.matches?.('.mes')) injectButtonInto(node);
                    node.querySelectorAll?.('.mes').forEach(injectButtonInto);
                }
            }
        });
        observer.observe(chat, { childList: true, subtree: true });
        debug('Chat observer attached');
    };

    attachObserver();
    rescanReformatButtons();
    debug('Reformatting observer installed');
}

// ─── Settings Panel ───

export function bindReformattingSettings(saveSettings) {
    const enabledCb = document.getElementById('reformatting_enabled');
    if (enabledCb) {
        enabledCb.checked = !!moduleSettings.reformattingEnabled;
        enabledCb.addEventListener('change', () => {
            moduleSettings.reformattingEnabled = enabledCb.checked;
            saveSettings();
            if (moduleSettings.reformattingEnabled) {
                rescanReformatButtons();
            } else {
                removeAllReformatButtons();
            }
        });
    }

    const engineSelect = document.getElementById('reformatting_engine');
    if (engineSelect) {
        engineSelect.value = moduleSettings.reformattingEngine || 'rules';
        const syncEngineSections = () => {
            const isLLM = engineSelect.value === 'llm';
            document.getElementById('reformatting_rules_section')
                ?.classList.toggle('reformatting-hidden', isLLM);
            document.getElementById('reformatting_llm_section')
                ?.classList.toggle('reformatting-hidden', !isLLM);
        };
        engineSelect.addEventListener('change', () => {
            moduleSettings.reformattingEngine = engineSelect.value;
            saveSettings();
            syncEngineSections();
        });
        syncEngineSections();
    }

    const asteriskMode = moduleSettings.reformattingAsteriskMode || 'strip';
    document.querySelectorAll('input[name="reformatting_asterisk_mode"]').forEach((radio) => {
        radio.checked = radio.value === asteriskMode;
        radio.addEventListener('change', () => {
            if (!radio.checked) return;
            moduleSettings.reformattingAsteriskMode = radio.value;
            saveSettings();
        });
    });

    const collapseCb = document.getElementById('reformatting_collapse_whitespace');
    if (collapseCb) {
        collapseCb.checked = !!moduleSettings.reformattingCollapseWhitespace;
        collapseCb.addEventListener('change', () => {
            moduleSettings.reformattingCollapseWhitespace = collapseCb.checked;
            saveSettings();
        });
    }

    const responseLengthInput = document.getElementById('reformatting_response_length');
    if (responseLengthInput) {
        responseLengthInput.value = moduleSettings.reformattingResponseLength || DEFAULT_REFORMATTING_RESPONSE_LENGTH;
        responseLengthInput.addEventListener('input', () => {
            const n = parseInt(responseLengthInput.value, 10);
            if (Number.isFinite(n) && n > 0) {
                moduleSettings.reformattingResponseLength = n;
                saveSettings();
            }
        });
    }

    const systemPromptArea = document.getElementById('reformatting_system_prompt_textarea');
    if (systemPromptArea) {
        systemPromptArea.value = moduleSettings.reformattingSystemPrompt || DEFAULT_REFORMATTING_SYSTEM_PROMPT;
        systemPromptArea.addEventListener('input', () => {
            moduleSettings.reformattingSystemPrompt = systemPromptArea.value;
            saveSettings();
        });
    }

    const promptArea = document.getElementById('reformatting_prompt_textarea');
    if (promptArea) {
        promptArea.value = moduleSettings.reformattingPrompt || DEFAULT_REFORMATTING_PROMPT;
        promptArea.addEventListener('input', () => {
            moduleSettings.reformattingPrompt = promptArea.value;
            saveSettings();
        });
    }

    const prefillArea = document.getElementById('reformatting_prefill_textarea');
    if (prefillArea) {
        prefillArea.value = typeof moduleSettings.reformattingPrefill === 'string'
            ? moduleSettings.reformattingPrefill
            : DEFAULT_REFORMATTING_PREFILL;
        prefillArea.addEventListener('input', () => {
            moduleSettings.reformattingPrefill = prefillArea.value;
            saveSettings();
        });
    }

    document.getElementById('reformatting_preview_btn')
        ?.addEventListener('click', showReformattingPromptPreview);

    const debugCb = document.getElementById('reformatting_debug_mode');
    if (debugCb) {
        debugCb.checked = !!moduleSettings.reformattingDebugMode;
        debugCb.addEventListener('change', () => {
            moduleSettings.reformattingDebugMode = debugCb.checked;
            saveSettings();
        });
    }
}

function showReformattingPromptPreview() {
    const sampleMessage =
        'CharacterName: *He danced around the room laughing hysterically.* '
        + '"What am I doing? I don\'t even know!"';
    const prefill = typeof moduleSettings?.reformattingPrefill === 'string'
        ? moduleSettings.reformattingPrefill
        : DEFAULT_REFORMATTING_PREFILL;
    showPromptPreview('Reformatting — LLM Prompt Preview', [
        { label: 'System Prompt', text: getReformattingSystemPrompt() },
        { label: 'User Prompt (template with a sample message)', text: composeReformattingPrompt(sampleMessage) },
        { label: 'Prefill (assistant prefix; kept at the start of the result)', text: prefill || '(none)' },
        {
            label: 'Note',
            text: 'The LLM engine is only used when Engine is set to "LLM". The Rules engine '
                + 'ignores this prompt entirely and applies the deterministic transforms instead.',
        },
    ]);
}

// ─── Slash Command ───

export function registerReformattingSlashCommand() {
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'reformat',
        callback: async () => {
            if (!moduleSettings.reformattingEnabled) return '';
            const context = getContext();
            const lastIndex = context.chat.length - 1;
            if (lastIndex < 0) {
                toast('No messages to reformat.', 'warning');
                return '';
            }
            await reformatMessage(lastIndex, { manual: true });
            return '';
        },
        unnamedArgumentList: [],
        aliases: [],
        helpString: 'Reformat the last message using the configured engine. The original is kept as a swipe.',
    }));
    debug('Registered /reformat slash command');
}
