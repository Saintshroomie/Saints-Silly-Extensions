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
    isGenerationInProgress,
    createDebugLogger,
    toast,
    stickyToast,
    streamingGenerate,
    withSingleLineDisabled,
    applyTemplateMacros,
    stripPrefillEcho,
    showPromptPreview,
    createSettingsBinder,
} from './utils.js';
import { applyReformatRules } from './reformat-rules.js';
import { templateSetting, textSetting, positiveIntSetting } from './settings-helpers.js';
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

// Per-swipe tag on each reformatted swipe's swipe_info entry, so other tools
// (Retry Continue) can recognise a tool-generated edit.
const REFORMAT_FLAG = 'sseReformatted';

// ─── Module State ───

let moduleSettings = null;
let debug = () => {};
let observer = null;
let listenersInstalled = false;
// Guards against reformatting a message we're mid-way through committing
// (the saveChat / re-render can re-enter the observer/events).
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

/** Run the configured deterministic rules over `text` (see reformat-rules.js). */
function applyRulesReformat(text) {
    return applyReformatRules(text, {
        asteriskMode: moduleSettings.reformattingAsteriskMode || 'strip',
        collapseWhitespace: !!moduleSettings.reformattingCollapseWhitespace,
    });
}

// ─── LLM Engine ───

function getReformattingResponseLength() {
    return positiveIntSetting(moduleSettings, 'reformattingResponseLength', DEFAULT_REFORMATTING_RESPONSE_LENGTH);
}

function getReformattingPromptTemplate() {
    return templateSetting(moduleSettings, 'reformattingPrompt', DEFAULT_REFORMATTING_PROMPT);
}

function getReformattingSystemPrompt() {
    return templateSetting(moduleSettings, 'reformattingSystemPrompt', DEFAULT_REFORMATTING_SYSTEM_PROMPT);
}

function getReformattingPrefill() {
    return textSetting(moduleSettings, 'reformattingPrefill', DEFAULT_REFORMATTING_PREFILL);
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
    const prefill = getReformattingPrefill();
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
 * @returns {Promise<boolean>} `true` if the message was changed.
 */
export async function reformatMessage(index) {
    if (busy) {
        debug('reformatMessage — skipped (already running)');
        return false;
    }
    const context = getContext();
    const msg = context.chat?.[index];
    if (!isReformattableMessage(msg)) {
        toast('Nothing to reformat in this message.', 'warning');
        return false;
    }

    const original = msg.mes;
    const useLLM = moduleSettings.reformattingEngine === 'llm';

    busy = true;
    let dismissToast = () => {};
    if (useLLM) dismissToast = stickyToast('Reformatting message…', 'info');

    try {
        let reformatted;
        if (useLLM) {
            reformatted = await runLLMReformat(original);
        } else {
            reformatted = applyRulesReformat(original);
        }

        if (!reformatted) {
            toast('Reformatting produced an empty result; left unchanged.', 'warning');
            return false;
        }
        if (reformatted === original) {
            debug('reformatMessage — no change for index', index);
            toast('Message already matches the target format.', 'info');
            return false;
        }

        commitReformat(index, msg, reformatted);
        await context.saveChat();
        debug('reformatMessage — reformatted index', index, '| engine:', useLLM ? 'llm' : 'rules');
        toast('Message reformatted. The original is kept as a swipe.', 'success');
        return true;
    } catch (err) {
        if (isSilentGenerationAbort(err)) {
            debug('reformatMessage — cancelled for index', index);
        } else {
            console.error('Reformatting error:', err);
            toast(`Reformatting failed: ${err.message}`, 'error');
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
    if (isGenerationInProgress()) return;
    reformatMessage(index);
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
    const bind = createSettingsBinder(moduleSettings, saveSettings);
    bind.checkbox('reformatting_enabled', 'reformattingEnabled',
        on => (on ? rescanReformatButtons() : removeAllReformatButtons()));

    const syncEngineSections = () => {
        const isLLM = moduleSettings.reformattingEngine === 'llm';
        document.getElementById('reformatting_rules_section')
            ?.classList.toggle('reformatting-hidden', isLLM);
        document.getElementById('reformatting_llm_section')
            ?.classList.toggle('reformatting-hidden', !isLLM);
    };
    bind.select('reformatting_engine', 'reformattingEngine', 'rules', syncEngineSections);
    syncEngineSections();

    const asteriskMode = moduleSettings.reformattingAsteriskMode || 'strip';
    document.querySelectorAll('input[name="reformatting_asterisk_mode"]').forEach((radio) => {
        radio.checked = radio.value === asteriskMode;
        radio.addEventListener('change', () => {
            if (!radio.checked) return;
            moduleSettings.reformattingAsteriskMode = radio.value;
            saveSettings();
        });
    });

    bind.checkbox('reformatting_collapse_whitespace', 'reformattingCollapseWhitespace');
    bind.number('reformatting_response_length', 'reformattingResponseLength', {
        fallback: DEFAULT_REFORMATTING_RESPONSE_LENGTH,
    });
    bind.text('reformatting_system_prompt_textarea', 'reformattingSystemPrompt', getReformattingSystemPrompt());
    bind.text('reformatting_prompt_textarea', 'reformattingPrompt', getReformattingPromptTemplate());
    bind.text('reformatting_prefill_textarea', 'reformattingPrefill', getReformattingPrefill());

    document.getElementById('reformatting_preview_btn')
        ?.addEventListener('click', showReformattingPromptPreview);

    bind.checkbox('reformatting_debug_mode', 'reformattingDebugMode');
}

function showReformattingPromptPreview() {
    const sampleMessage =
        'CharacterName: *He danced around the room laughing hysterically.* '
        + '"What am I doing? I don\'t even know!"';
    const prefill = getReformattingPrefill();
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
            await reformatMessage(lastIndex);
            return '';
        },
        unnamedArgumentList: [],
        aliases: [],
        helpString: 'Reformat the last message using the configured engine. The original is kept as a swipe.',
    }));
    debug('Registered /reformat slash command');
}
