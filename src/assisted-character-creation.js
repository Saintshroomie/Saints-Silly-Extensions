/**
 * Assisted Character Creation (ACC)
 *
 * Modal-based character creation. The user enters a character brief,
 * generates a complete description, optionally extends or re-rolls it,
 * and clicks Done to copy it into SillyTavern's description field.
 */

import { generateRaw } from '../../../../../script.js';
import { removeReasoningFromString } from '../../../../reasoning.js';
import {
    createDebugLogger,
    toast,
    buildContextPreamble,
    getAvailableLoreBookNames,
} from './utils.js';

// ─── Module State ───

let moduleSettings = null;
let debug = () => {};

let isGenerating = false;
let abortRequested = false;
let activeAction = null;       // which button initiated the current generation
let lastAction = null;         // 'generate' | 'continue' — what Retry should redo
let restorePoint = null;       // textarea snapshot used by Retry

// ─── Init ───

/**
 * Initialize ACC module. Called once from index.js.
 * @param {object} opts - { settings }
 */
export function initACC({ settings }) {
    moduleSettings = settings;
    debug = createDebugLogger('ACC', () => moduleSettings.accDebugMode);
    debug('Module initialized');
}

// ─── Character Page Integration ───

/**
 * Called on CHARACTER_PAGE_LOADED. Injects the ACC launch button.
 */
export function onCharacterPageLoaded() {
    if (!moduleSettings.accEnabled) return;
    if (document.getElementById('acc_launch_btn')) return;

    const btnRow = document.querySelector('#form_create .ch_creation_btn_row');
    const target = btnRow || document.querySelector('#form_create');
    if (!target) return;

    const btn = document.createElement('div');
    btn.id = 'acc_launch_btn';
    btn.classList.add('menu_button', 'interactable');
    btn.title = 'Assisted Character Creation';
    btn.innerHTML = '<span class="fa-solid fa-wand-magic-sparkles"></span> <span>Assist</span>';
    btn.addEventListener('click', openModal);

    target.appendChild(btn);
    debug('Launch button injected');
}

// ─── Settings Bindings ───

/**
 * Bind ACC settings panel controls. Called after settings HTML is injected.
 * @param {function} saveSettings
 */
export function bindACCSettings(saveSettings) {
    const enabledCb = document.getElementById('acc_enabled');
    const debugCb = document.getElementById('acc_debug_mode');

    if (enabledCb) {
        enabledCb.checked = moduleSettings.accEnabled;
        enabledCb.addEventListener('change', () => {
            moduleSettings.accEnabled = enabledCb.checked;
            saveSettings();
        });
    }
    if (debugCb) {
        debugCb.checked = moduleSettings.accDebugMode;
        debugCb.addEventListener('change', () => {
            moduleSettings.accDebugMode = debugCb.checked;
            saveSettings();
        });
    }
}

// ─── Modal ───

function openModal() {
    if (document.getElementById('acc_modal_overlay')) return;

    isGenerating = false;
    abortRequested = false;
    activeAction = null;
    lastAction = null;
    restorePoint = null;

    const overlay = document.createElement('div');
    overlay.id = 'acc_modal_overlay';
    overlay.innerHTML = buildModalHTML();
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    document.getElementById('acc_close_btn')?.addEventListener('click', closeModal);
    document.getElementById('acc_cancel_btn')?.addEventListener('click', closeModal);
    document.getElementById('acc_done_btn')?.addEventListener('click', handleDone);
    document.getElementById('acc_generate_btn')?.addEventListener('click', handleGenerate);
    document.getElementById('acc_continue_btn')?.addEventListener('click', handleContinue);
    document.getElementById('acc_checkpoint_btn')?.addEventListener('click', handleCheckpoint);
    document.getElementById('acc_retry_btn')?.addEventListener('click', handleRetry);

    const updateLoreBookSummary = () => {
        const label = document.getElementById('acc_lorebook_summary_label');
        if (!label) return;
        const checked = document.querySelectorAll('#acc_lorebook_list .acc-lorebook-cb:checked').length;
        label.textContent = checked > 0 ? `Lore Books (${checked})` : 'Lore Books';
    };
    document.querySelectorAll('#acc_lorebook_list .acc-lorebook-cb').forEach(cb => {
        cb.addEventListener('change', updateLoreBookSummary);
    });

    const output = document.getElementById('acc_description_output');
    output?.addEventListener('input', refreshActionButtonStates);

    refreshActionButtonStates();
    debug('Modal opened');
}

function closeModal() {
    if (isGenerating) {
        abortRequested = true;
        stopGeneration();
    }
    const overlay = document.getElementById('acc_modal_overlay');
    if (overlay) overlay.remove();
    isGenerating = false;
    activeAction = null;
    lastAction = null;
    restorePoint = null;
    debug('Modal closed');
}

function buildModalHTML() {
    const loreBookNames = getAvailableLoreBookNames();
    const loreBookOptions = loreBookNames.length
        ? loreBookNames.map(n => `
            <label class="acc-lorebook-item checkbox_label">
                <input type="checkbox" class="acc-lorebook-cb" value="${escapeAttr(n)}" />
                <span>${escapeHTML(n)}</span>
            </label>
        `).join('')
        : '<div class="acc-lorebook-empty">No lore books available.</div>';

    return `
        <div id="acc_modal" class="acc-modal">
            <div class="acc-modal-header">
                <h3>Assisted Character Creation</h3>
                <div id="acc_close_btn" class="acc-close-btn interactable"><span class="fa-solid fa-xmark"></span></div>
            </div>
            <div class="acc-modal-body">
                <div class="acc-context-section">
                    <label class="checkbox_label" title="Prepend the current chat / character context to the generation">
                        <input id="acc_use_chat_context" type="checkbox" />
                        <span>Use Chat Context</span>
                    </label>
                    <details class="acc-lorebook-picker" title="Prepend active entries from the selected lore books">
                        <summary><span class="fa-solid fa-book"></span> <span id="acc_lorebook_summary_label">Lore Books</span></summary>
                        <div id="acc_lorebook_list" class="acc-lorebook-list">${loreBookOptions}</div>
                    </details>
                </div>
                <div class="acc-brief-section">
                    <label for="acc_character_brief"><b>Character Brief:</b></label>
                    <textarea id="acc_character_brief" class="text_pole" rows="4" placeholder="Describe your character concept, setting, and any key details..."></textarea>
                </div>
                <div class="acc-action-row">
                    <div id="acc_generate_btn" class="menu_button interactable acc-action-btn acc-generate-btn" title="Generate a fresh description from the brief (replaces the textarea)">
                        <span class="fa-solid fa-wand-magic-sparkles"></span> Generate
                    </div>
                    <div id="acc_continue_btn" class="menu_button interactable acc-action-btn acc-continue-btn" title="Continue from where the description leaves off">
                        <span class="fa-solid fa-arrow-right"></span> Continue
                    </div>
                    <div id="acc_checkpoint_btn" class="menu_button interactable acc-action-btn acc-checkpoint-btn" title="Save the current description as the Retry restore point">
                        <span class="fa-solid fa-flag"></span> Checkpoint
                    </div>
                    <div id="acc_retry_btn" class="menu_button interactable acc-action-btn acc-retry-btn" title="Restore to the last snapshot and re-run the last action">
                        <span class="fa-solid fa-rotate-right"></span> Retry
                    </div>
                </div>
                <div class="acc-status-bar acc-hidden" id="acc_status_bar">
                    <span class="fa-solid fa-spinner fa-spin"></span>
                    <span id="acc_status_text"></span>
                </div>
                <div class="acc-description-section">
                    <label for="acc_description_output"><b>Character Description:</b></label>
                    <textarea id="acc_description_output" class="text_pole acc-description-output" rows="18" placeholder="Generated description will appear here. You can edit it before clicking Done."></textarea>
                </div>
            </div>
            <div class="acc-modal-footer">
                <div class="acc-footer-right">
                    <div id="acc_cancel_btn" class="menu_button interactable">Cancel</div>
                    <div id="acc_done_btn" class="menu_button interactable acc-done-btn">Done</div>
                </div>
            </div>
        </div>`;
}

// ─── Actions ───

function readModalContextOptions() {
    const includeChat = !!document.getElementById('acc_use_chat_context')?.checked;
    const loreBookNames = Array.from(
        document.querySelectorAll('#acc_lorebook_list .acc-lorebook-cb:checked'),
    ).map(el => el.value);
    return { includeChat, loreBookNames };
}

async function handleGenerate() {
    if (isGenerating) {
        if (activeAction === 'generate') {
            abortRequested = true;
            stopGeneration();
        }
        return;
    }

    const brief = document.getElementById('acc_character_brief')?.value?.trim() || '';
    if (!brief) {
        toast('Please enter a Character Brief before generating.', 'warning');
        return;
    }

    const output = document.getElementById('acc_description_output');
    restorePoint = output?.value || '';
    await runGeneration('generate', brief);
}

async function handleContinue() {
    if (isGenerating) {
        if (activeAction === 'continue') {
            abortRequested = true;
            stopGeneration();
        }
        return;
    }

    const output = document.getElementById('acc_description_output');
    const existing = output?.value || '';
    if (!existing.trim()) {
        toast('Nothing to continue from. Generate a description first or type some text.', 'warning');
        return;
    }

    const brief = document.getElementById('acc_character_brief')?.value?.trim() || '';
    restorePoint = existing;
    await runGeneration('continue', brief);
}

function handleCheckpoint() {
    if (isGenerating) return;
    const output = document.getElementById('acc_description_output');
    const current = output?.value || '';
    if (!current.trim()) {
        toast('Nothing to checkpoint — the description is empty.', 'warning');
        return;
    }
    restorePoint = current;
    lastAction = 'continue';
    toast('Checkpoint saved. Retry will restore to this point.', 'success');
    refreshActionButtonStates();
    debug('Checkpoint saved, length:', current.length);
}

async function handleRetry() {
    if (isGenerating) return;
    if (!lastAction || restorePoint === null) {
        toast('Nothing to retry yet.', 'warning');
        return;
    }

    const brief = document.getElementById('acc_character_brief')?.value?.trim() || '';
    if (lastAction === 'continue' && !restorePoint.trim()) {
        toast('Cannot continue from an empty restore point.', 'warning');
        return;
    }
    if (lastAction === 'generate' && !brief) {
        toast('Please enter a Character Brief before retrying.', 'warning');
        return;
    }

    const output = document.getElementById('acc_description_output');
    if (output) output.value = restorePoint;
    await runGeneration(lastAction, brief);
}

async function runGeneration(action, brief) {
    isGenerating = true;
    abortRequested = false;
    activeAction = action;

    const isContinue = action === 'continue';
    setGeneratingUI(true, action);
    setStatusBar(isContinue ? 'Continuing description...' : 'Generating character description...');

    try {
        const ctxOptions = readModalContextOptions();
        const output = document.getElementById('acc_description_output');
        const existing = output?.value || '';

        const result = isContinue
            ? await generateContinuation(brief, existing, ctxOptions)
            : await generateDescription(brief, ctxOptions);

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
        if (!abortRequested) {
            console.error('ACC generation error:', err);
            toast(`Generation failed: ${err.message}`, 'error');
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

async function generateDescription(brief, ctxOptions) {
    const preambleBlock = await buildPreambleBlock(ctxOptions);
    const prompt = `${preambleBlock}Write a complete, detailed character description for use as a SillyTavern character card based on the following brief. Cover physical appearance, personality, background, mannerisms, motivations, and any other relevant details. Be vivid and specific.\n\nCharacter Brief:\n${brief}\n\nCharacter Description:`;
    const systemPrompt = 'You are a character creation assistant. Write a complete, well-organized character description in natural prose. Do not include meta-commentary, headers like "Character Description:", or extra formatting around the response.';

    debug('Generating with brief length', brief.length);
    debug('System prompt:', systemPrompt);
    debug('Prompt:', prompt);

    const result = await generateRaw({ prompt, systemPrompt, responseLength: 2000 });
    return removeReasoningFromString(result).trim();
}

async function generateContinuation(brief, existing, ctxOptions) {
    const preambleBlock = await buildPreambleBlock(ctxOptions);
    const briefBlock = brief ? `Character Brief:\n${brief}\n\n` : '';
    const prompt = `${preambleBlock}Continue writing the character description below. Pick up exactly where the text leaves off, matching tone and style. Do not repeat what's already there and do not restart the description.\n\n${briefBlock}Description so far:\n${existing}\n\nContinuation:`;
    const systemPrompt = 'You are a character creation assistant. Continue the existing character description seamlessly. Output only the continuation — no headers, no meta-commentary, no repetition of prior text.';

    debug('Continuing with existing length', existing.length);
    debug('System prompt:', systemPrompt);
    debug('Prompt:', prompt);

    const result = await generateRaw({ prompt, systemPrompt, responseLength: 1000 });
    return removeReasoningFromString(result).trim();
}

async function buildPreambleBlock(ctxOptions) {
    if (!ctxOptions) return '';
    if (!ctxOptions.includeChat && !(ctxOptions.loreBookNames && ctxOptions.loreBookNames.length)) return '';
    const preamble = await buildContextPreamble(ctxOptions);
    if (!preamble) return '';
    debug('Context preamble length:', preamble.length);
    return `Existing context to consider when generating (do not repeat verbatim):\n${preamble}\n\n`;
}

function stopGeneration() {
    const stopBtn = document.getElementById('mes_stop');
    if (stopBtn) stopBtn.click();
    debug('Stop generation triggered');
}

// ─── Done ───

function handleDone() {
    if (isGenerating) return;

    const output = document.getElementById('acc_description_output')?.value?.trim() || '';
    if (!output) {
        toast('Description is empty. Nothing to save.', 'warning');
        return;
    }

    const descField = document.getElementById('description_textarea');
    if (descField) {
        descField.value = output;
        descField.dispatchEvent(new Event('input', { bubbles: true }));
    }

    toast('Character description applied!', 'success');
    closeModal();
}

// ─── UI Helpers ───

const ACTION_BUTTON_IDS = ['acc_generate_btn', 'acc_continue_btn', 'acc_checkpoint_btn', 'acc_retry_btn'];

const ACTION_LABELS = {
    acc_generate_btn: '<span class="fa-solid fa-wand-magic-sparkles"></span> Generate',
    acc_continue_btn: '<span class="fa-solid fa-arrow-right"></span> Continue',
    acc_checkpoint_btn: '<span class="fa-solid fa-flag"></span> Checkpoint',
    acc_retry_btn: '<span class="fa-solid fa-rotate-right"></span> Retry',
};

function setGeneratingUI(generating, action) {
    const doneBtn = document.getElementById('acc_done_btn');
    const briefInput = document.getElementById('acc_character_brief');
    const activeBtnId = action === 'continue' ? 'acc_continue_btn' : 'acc_generate_btn';

    for (const id of ACTION_BUTTON_IDS) {
        const btn = document.getElementById(id);
        if (!btn) continue;
        if (generating) {
            if (id === activeBtnId) {
                btn.innerHTML = '<span class="fa-solid fa-stop"></span> Stop';
                btn.classList.remove('acc-disabled');
            } else {
                btn.innerHTML = ACTION_LABELS[id];
                btn.classList.add('acc-disabled');
            }
        } else {
            btn.innerHTML = ACTION_LABELS[id];
            btn.classList.remove('acc-disabled');
        }
    }

    if (generating) {
        doneBtn?.classList.add('acc-disabled');
        briefInput?.setAttribute('disabled', 'true');
    } else {
        doneBtn?.classList.remove('acc-disabled');
        briefInput?.removeAttribute('disabled');
        refreshActionButtonStates();
    }
}

function refreshActionButtonStates() {
    if (isGenerating) return;
    const output = document.getElementById('acc_description_output');
    const hasText = !!output?.value?.trim();

    setButtonDisabled('acc_continue_btn', !hasText);
    setButtonDisabled('acc_checkpoint_btn', !hasText);
    setButtonDisabled('acc_retry_btn', !lastAction || restorePoint === null);
}

function setButtonDisabled(id, disabled) {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (disabled) btn.classList.add('acc-disabled');
    else btn.classList.remove('acc-disabled');
}

function setStatusBar(message) {
    const bar = document.getElementById('acc_status_bar');
    const text = document.getElementById('acc_status_text');
    if (!bar || !text) return;
    if (message) {
        text.textContent = message;
        bar.classList.remove('acc-hidden');
    } else {
        bar.classList.add('acc-hidden');
    }
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escapeAttr(str) {
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
