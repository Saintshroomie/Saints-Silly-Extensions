/**
 * Shared machinery for the "brief in, streamed text out" modals — Assisted
 * Character Creation, Compaction and Image Prompting all follow one flow:
 * Generate (fresh, from the tool's prefill) / Continue (from the output's
 * exact end) / Checkpoint / Retry, a Max Tokens field bound to the tool's
 * response-length setting, a status bar, and Stop on the active button.
 *
 * Each tool keeps its own markup, prompts and close behaviour; this module
 * owns the action state machine, the button/status UI, and the prefill-aware
 * streamed generation. Element ids follow `${prefix}_generate_btn`,
 * `${prefix}_status_bar`, … (see the HTML helpers below).
 */

import { removeReasoningFromString } from '../../../../reasoning.js';
import {
    toast,
    streamingGenerate,
    withSingleLineDisabled,
    stripPrefillEcho,
} from './utils.js';
import { abortAllGenerations, isSilentGenerationAbort } from './silent-generation.js';
import { parsePositiveInt, positiveIntSetting } from './settings-helpers.js';

const HIDDEN = 'sse-modal-hidden';
const DISABLED = 'sse-modal-disabled';

/** Lore-book picker class prefix shared by the modals (one set of styles). */
export const MODAL_LOREBOOK_PREFIX = 'sse-modal-lorebook';

// ─── Markup ───

const ACTIONS = ['generate', 'continue', 'checkpoint', 'retry'];

function actionLabel(action, generateLabel) {
    switch (action) {
        case 'generate': return `<span class="fa-solid fa-wand-magic-sparkles"></span> ${generateLabel}`;
        case 'continue': return '<span class="fa-solid fa-arrow-right"></span> Continue';
        case 'checkpoint': return '<span class="fa-solid fa-flag"></span> Checkpoint';
        default: return '<span class="fa-solid fa-rotate-right"></span> Retry';
    }
}

/**
 * The Generate / Continue / Checkpoint / Retry button row.
 *
 * @param {string} prefix - Id prefix (e.g. 'acc').
 * @param {object} opts
 * @param {string} opts.noun - What the output is ('description', 'summary', …).
 * @param {string} [opts.generateLabel='Generate']
 * @param {string} [opts.generateTitle]
 */
export function actionRowHtml(prefix, { noun, generateLabel = 'Generate', generateTitle }) {
    const titles = {
        generate: generateTitle || `Generate a fresh ${noun} (replaces the text below)`,
        continue: `Continue from where the ${noun} leaves off`,
        checkpoint: `Save the current ${noun} as the Retry restore point`,
        retry: 'Restore to the last snapshot and re-run the last action',
    };
    const buttons = ACTIONS.map(action => `
            <div id="${prefix}_${action}_btn" class="menu_button interactable sse-modal-action-btn${action === 'generate' ? ' sse-modal-primary' : ''}" title="${titles[action]}">
                ${actionLabel(action, generateLabel)}
            </div>`).join('');
    return `<div class="sse-modal-action-row">${buttons}\n        </div>`;
}

/** The Max Tokens row (`${prefix}_response_length`). */
export function tokensRowHtml(prefix, { max = 8192, title = 'Maximum tokens for each generation' } = {}) {
    return `
        <div class="sse-modal-tokens-row">
            <label class="sse-modal-tokens-label" for="${prefix}_response_length" title="${title}">
                <span class="fa-solid fa-coins"></span> Max Tokens:
            </label>
            <input id="${prefix}_response_length" type="number" class="text_pole sse-modal-tokens-input" min="50" max="${max}" step="50" />
        </div>`;
}

/** The spinner status bar (`${prefix}_status_bar` / `${prefix}_status_text`), hidden until used. */
export function statusBarHtml(prefix) {
    return `
        <div class="sse-modal-status ${HIDDEN}" id="${prefix}_status_bar">
            <span class="fa-solid fa-spinner fa-spin"></span>
            <span id="${prefix}_status_text"></span>
        </div>`;
}

/** A small header button (Clear, Copy, …). */
export function smallButtonHtml(id, icon, label, title, extraClass = '') {
    return `<div id="${id}" class="menu_button interactable sse-modal-small-btn${extraClass ? ` ${extraClass}` : ''}" title="${title}">
                    <span class="fa-solid ${icon}"></span> ${label}
                </div>`;
}

// ─── UI Helpers ───

/** Toggle the shared disabled look (and click-through) on an element by id. */
export function setModalButtonDisabled(id, disabled) {
    document.getElementById(id)?.classList.toggle(DISABLED, !!disabled);
}

/** Show `message` in `${prefix}_status_bar`, or hide the bar when it's falsy. */
export function setModalStatus(prefix, message) {
    const bar = document.getElementById(`${prefix}_status_bar`);
    const text = document.getElementById(`${prefix}_status_text`);
    if (!bar || !text) return;
    if (message) text.textContent = message;
    bar.classList.toggle(HIDDEN, !message);
}

// ─── Generation ───

function cleanReply(text, prefill) {
    return stripPrefillEcho(removeReasoningFromString(text).trim(), prefill);
}

/**
 * Stream a fresh generation into `outputEl`. The prefill is sent as the
 * assistant prefix *and* kept at the top of the result (echo-stripped, since
 * some backends re-emit it).
 *
 * @returns {Promise<string>} prefill + reply.
 */
export async function streamFresh({ prompt, systemPrompt, responseLength, prefill = '', outputEl, name }) {
    const result = await withSingleLineDisabled(() => streamingGenerate(
        { prompt, systemPrompt, responseLength, ...(prefill ? { prefill } : {}) },
        outputEl,
        { append: false, name },
    ));
    return prefill + cleanReply(result, prefill);
}

/**
 * Stream a continuation of `existing`: the text so far is the assistant
 * prefill, so the model picks up from its exact end (like ST's Continue).
 *
 * @returns {Promise<string>} Only the new tail.
 */
export async function streamContinuation({ prompt, systemPrompt, responseLength, existing, outputEl, name }) {
    const result = await withSingleLineDisabled(() => streamingGenerate(
        { prompt, systemPrompt, responseLength, ...(existing ? { prefill: existing } : {}) },
        outputEl,
        { append: true, name },
    ));
    return cleanReply(result, existing);
}

function needsSeparator(text) {
    return !!text && !/\s$/.test(text);
}

// ─── Action Controller ───

/**
 * Create the Generate / Continue / Checkpoint / Retry controller for a modal.
 *
 * @param {object} cfg
 * @param {string} cfg.prefix - Element id prefix (`${prefix}_generate_btn`, …).
 * @param {string} cfg.outputId - The output textarea's id.
 * @param {string} cfg.noun - What the output is, for messages ('description').
 * @param {string} cfg.aNoun - The noun with its article ('a description').
 * @param {{ generate: string, continue: string }} cfg.statusText - Status-bar text per action.
 * @param {string} [cfg.generateLabel='Generate'] - Must match the markup's label.
 * @param {string[]} [cfg.lockIds=[]] - Inputs disabled while generating.
 * @param {{ settings: object, key: string, fallback: number, save: () => void }} cfg.responseLength
 *        - The tool's response-length setting, bound to `${prefix}_response_length`.
 * @param {() => object|null} cfg.getPopup - The open Popup (its OK button is greyed while generating).
 * @param {(action: string) => boolean} [cfg.canRun] - Tool preflight for generate/retry-of-generate;
 *        toasts its own reason and returns false to refuse.
 * @param {(action: 'generate'|'continue', ctx: { existing: string, outputEl: HTMLElement,
 *        responseLength: number }) => Promise<string>} cfg.run - The tool's generation: the full
 *        text for generate, the new tail for continue.
 * @param {(generating: boolean, hasText: boolean) => void} [cfg.onRefresh] - Extra UI to sync.
 * @param {string} cfg.logLabel - Console label for errors.
 * @param {function} [cfg.debug]
 */
export function createGenerationActions(cfg) {
    const {
        prefix, outputId, noun, aNoun, statusText, lockIds = [], responseLength,
        getPopup, canRun = () => true, run, onRefresh, logLabel,
        generateLabel = 'Generate', debug = () => {},
    } = cfg;
    const id = action => `${prefix}_${action}_btn`;
    const output = () => document.getElementById(outputId);
    const tokenInput = () => document.getElementById(`${prefix}_response_length`);

    let generating = false;
    let abortRequested = false;
    let activeAction = null;   // which button started the current generation
    let lastAction = null;     // 'generate' | 'continue' — what Retry redoes
    let restorePoint = null;   // output snapshot Retry restores

    function savedResponseLength() {
        return positiveIntSetting(responseLength.settings, responseLength.key, responseLength.fallback);
    }

    function currentResponseLength() {
        return parsePositiveInt(tokenInput()?.value) ?? savedResponseLength();
    }

    function writeResponseLength(n) {
        if (n === null || n === responseLength.settings[responseLength.key]) return;
        responseLength.settings[responseLength.key] = n;
        responseLength.save();
    }

    function dropRestorePoint() {
        restorePoint = null;
        lastAction = null;
        refresh();
    }

    function refresh() {
        if (generating) return;
        const hasText = !!output()?.value?.trim();
        setModalButtonDisabled(id('continue'), !hasText);
        setModalButtonDisabled(id('checkpoint'), !hasText);
        setModalButtonDisabled(id('retry'), !lastAction || restorePoint === null);
        onRefresh?.(false, hasText);
    }

    function setGeneratingUI(on, action) {
        const activeId = id(action === 'continue' ? 'continue' : 'generate');
        for (const a of ACTIONS) {
            const btn = document.getElementById(id(a));
            if (!btn) continue;
            const isActive = on && id(a) === activeId;
            btn.innerHTML = isActive ? '<span class="fa-solid fa-stop"></span> Stop' : actionLabel(a, generateLabel);
            btn.classList.toggle(DISABLED, on && !isActive);
        }
        // Popup owns the OK button: grey it as a "wait" hint (each tool's
        // onClosing still refuses a mid-generation close).
        getPopup()?.okButton?.classList.toggle('disabled', on);
        for (const lockId of lockIds) {
            const el = document.getElementById(lockId);
            if (on) el?.setAttribute('disabled', 'true');
            else el?.removeAttribute('disabled');
        }
        if (on) onRefresh?.(true, !!output()?.value?.trim());
        else refresh();
    }

    function stop() {
        abortRequested = true;
        // abortAllGenerations (not just our controller) so ST's
        // GENERATION_STOPPED fires and the backend request is cancelled too.
        abortAllGenerations(`${prefix}-cancel`);
        debug('Stop generation triggered');
    }

    /** Keep the streamed partial on a stop, and let Retry redo it. */
    function adoptPartial(action) {
        if (output()?.value?.trim()) lastAction = action;
    }

    async function runAction(action) {
        generating = true;
        abortRequested = false;
        activeAction = action;
        const isContinue = action === 'continue';
        setGeneratingUI(true, action);
        setModalStatus(prefix, statusText[action]);

        try {
            const outputEl = output();
            const existing = outputEl?.value || '';
            const result = await run(action, { existing, outputEl, responseLength: currentResponseLength() });

            if (abortRequested) {
                debug(`${action} aborted; keeping the streamed partial`);
                adoptPartial(action);
                return;
            }
            if (!outputEl) return;
            outputEl.value = isContinue
                ? existing + (needsSeparator(existing) ? ' ' : '') + result
                : result;
            lastAction = action;
            debug(`${action} complete, length:`, result.length);
        } catch (err) {
            if (isSilentGenerationAbort(err)) {
                debug(`${action} aborted via cancellation; keeping the streamed partial`);
                adoptPartial(action);
            } else if (!abortRequested) {
                console.error(`${logLabel} generation error:`, err);
                toast(`Generation failed: ${err.message}`, 'error');
            }
        } finally {
            generating = false;
            abortRequested = false;
            activeAction = null;
            setGeneratingUI(false, action);
            setModalStatus(prefix, null);
        }
    }

    async function handleGenerate() {
        if (generating) {
            if (activeAction === 'generate') stop();
            return;
        }
        if (!canRun('generate')) return;
        restorePoint = output()?.value || '';
        await runAction('generate');
    }

    async function handleContinue() {
        if (generating) {
            if (activeAction === 'continue') stop();
            return;
        }
        const existing = output()?.value || '';
        if (!existing.trim()) {
            toast(`Nothing to continue from. Generate ${aNoun} first or type some text.`, 'warning');
            return;
        }
        restorePoint = existing;
        await runAction('continue');
    }

    function handleCheckpoint() {
        if (generating) return;
        const current = output()?.value || '';
        if (!current.trim()) {
            toast(`Nothing to checkpoint — the ${noun} is empty.`, 'warning');
            return;
        }
        restorePoint = current;
        lastAction = 'continue';
        toast('Checkpoint saved. Retry will restore to this point.', 'success');
        refresh();
        debug('Checkpoint saved, length:', current.length);
    }

    async function handleRetry() {
        if (generating) return;
        if (!lastAction || restorePoint === null) {
            toast('Nothing to retry yet.', 'warning');
            return;
        }
        if (lastAction === 'continue' && !restorePoint.trim()) {
            toast('Cannot continue from an empty restore point.', 'warning');
            return;
        }
        if (lastAction === 'generate' && !canRun('generate')) return;
        const out = output();
        if (out) out.value = restorePoint;
        await runAction(lastAction);
    }

    return {
        /** Attach the modal's handlers. Call from the Popup's onOpen. */
        bind() {
            document.getElementById(id('generate'))?.addEventListener('click', handleGenerate);
            document.getElementById(id('continue'))?.addEventListener('click', handleContinue);
            document.getElementById(id('checkpoint'))?.addEventListener('click', handleCheckpoint);
            document.getElementById(id('retry'))?.addEventListener('click', handleRetry);
            output()?.addEventListener('input', refresh);
            const input = tokenInput();
            input?.addEventListener('change', () => writeResponseLength(parsePositiveInt(input.value)));
            document.getElementById(`${prefix}_clear_output_btn`)?.addEventListener('click', () => {
                if (generating) return;
                const out = output();
                if (!out) return;
                out.value = '';
                dropRestorePoint();
                out.focus();
            });
            refresh();
        },
        /** Fill the Max Tokens field from the saved setting (a preset may have changed it). */
        fillResponseLength(root) {
            const input = root.querySelector(`#${prefix}_response_length`);
            if (input) input.value = String(savedResponseLength());
        },
        /**
         * Keep a typed Max Tokens value that never fired `change` (the field
         * is the tool's saved setting, not a modal-only copy). Call on close.
         */
        commitResponseLength(root) {
            const input = root?.querySelector(`#${prefix}_response_length`);
            if (input) writeResponseLength(parsePositiveInt(input.value));
        },
        /** Reset per-session state (on open and on close). */
        reset() {
            generating = false;
            abortRequested = false;
            activeAction = null;
            lastAction = null;
            restorePoint = null;
        },
        /** The output was replaced wholesale — the old Retry snapshot no longer applies. */
        dropRestorePoint,
        /** Abort a running generation (the modal is closing). */
        stopIfRunning() {
            if (generating) stop();
        },
        isGenerating: () => generating,
        responseLength: currentResponseLength,
        refresh,
        generate: handleGenerate,
    };
}
