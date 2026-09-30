/**
 * Image Prompting (IP)
 *
 * Modal-based image-prompt generation. Reads the current chat (and any
 * selected lore books) and silently generates a ready-to-paste prompt for an
 * external image-generation tool (ComfyUI, etc.) depicting the current
 * moment in the roleplay. The prompt template is preset-managed so the user
 * can keep one template per diffusion-model family: the Default targets
 * Krea 2 (natural-language prose); seeded presets target Anima
 * (Danbooru tags + prose) and pure Danbooru-tag models.
 *
 * Generated prompts can be saved to a per-chat store
 * (`chatMetadata.imagePrompting.savedPrompts`) and browsed / reloaded /
 * copied / deleted from the Saved Prompts section of the modal, so a good
 * prompt bound to a scene can be retrieved later in that chat.
 */

import {
    Popup,
    POPUP_TYPE,
    POPUP_RESULT,
} from '../../../../popup.js';
import { SlashCommandParser } from '../../../../slash-commands/SlashCommandParser.js';
import { SlashCommand } from '../../../../slash-commands/SlashCommand.js';
import {
    createDebugLogger,
    getContext,
    isGenerationInProgress,
    toast,
    buildContextPreamble,
    createLoreBookPicker,
    applyTemplateMacros,
    showPromptPreview,
    copyTextToClipboard,
    createSettingsBinder,
} from './utils.js';
import { templateSetting, textSetting } from './settings-helpers.js';
import { createToolPresetSelector, onToolPresetChange } from './prompt-templates.js';
import {
    MODAL_LOREBOOK_PREFIX,
    actionRowHtml,
    createGenerationActions,
    setModalButtonDisabled,
    smallButtonHtml,
    statusBarHtml,
    streamContinuation,
    streamFresh,
    tokensRowHtml,
} from './generation-modal.js';
import {
    isImageGenAvailable,
    getImageGenSourceLabel,
    checkImageGenConfigured,
    sendPromptToImageGen,
} from './image-generation.js';
import {
    DEFAULT_IMAGE_PROMPT_PROMPT,
    DEFAULT_IMAGE_PROMPT_PREFILL,
    DEFAULT_IMAGE_PROMPT_NEGATIVE,
    IP_GENERATE_SYSTEM_PROMPT,
    IP_CONTINUE_SYSTEM_PROMPT,
    DEFAULT_IMAGE_PROMPT_RESPONSE_LENGTH,
} from './image-prompt-presets.js';

// ─── Default Prompts & Built-in Presets ───

// The prompt texts and built-in presets live in image-prompt-presets.js (no
// SillyTavern imports, so they're unit-tested); re-exported for index.js.
export {
    IMAGE_PROMPT_PRESETS_SPEC,
    DEFAULT_IMAGE_PROMPT_PROMPT,
    DEFAULT_IMAGE_PROMPT_PREFILL,
    DEFAULT_IMAGE_PROMPT_NEGATIVE,
    DEFAULT_IMAGE_PROMPT_RESPONSE_LENGTH,
} from './image-prompt-presets.js';

// ─── Module State ───

let moduleSettings = null;
let saveSettingsFn = null;
let debug = () => {};

// True while a prompt is being rendered by ST's Image Generation extension.
// Separate from `actions.isGenerating()` (*our* LLM prompt generation):
// the two are different backends and the modal disables them independently.
let isSendingImage = false;

// When set, the chat context packed into {{context}} ends at this message
// index (inclusive) instead of the live end of the chat — the per-message
// button uses it to depict an earlier moment. Lives for one modal session
// only (cleared on close); the anchor bar in the modal shows and clears it.
let contextAnchorIndex = null;

// Per-message button observer state (mirrors the Reformatting observer).
let messageButtonObserver = null;
let messageButtonListenersInstalled = false;

// Modal contents are remembered across open/close so the user doesn't lose
// their generated prompt, guidance, or context-toggle selections. Cleared
// only via the explicit Clear buttons inside the modal. Chat context
// defaults ON — reading the current conversation is the tool's whole point.
const persistedModalState = {
    guidance: '',
    output: '',
    negative: null, // null means "never touched — follow the prompt preset"
    useChatContext: true,
    selectedLoreBooks: [],
};

// The negative text the active prompt preset last put into the modal's
// field. While the field still matches it the user hasn't customized their
// negative, so switching preset (or reopening the modal) is free to re-seed
// it; the moment they edit it, their text wins and the preset stops
// overwriting it. Reset puts the field back under preset control.
let seededNegative = null;

// Unsubscribe handle for the preset-change listener held while the modal is
// open — there is no element for the listener to watch, so the modal owns it.
let presetChangeUnsubscribe = null;

// ─── Saved Prompt Store (per-chat) ───

// Per-chat metadata key. Holds `{ savedPrompts: [{ id, title, text, savedAt }] }` —
// image prompts the user chose to keep, bound to the chat they were generated
// from so they travel with chat exports and survive reloads. Compaction
// migrates the key into the fresh chat like the other per-chat SSE state.
const IP_METADATA_KEY = 'imagePrompting';

function makeSavedPromptId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function hasActiveChat() {
    const chatId = getContext().chatId;
    return chatId !== undefined && chatId !== null && chatId !== '';
}

/**
 * Read the saved prompts for the current chat. Pure read apart from
 * backfilling missing ids in place (session-stable, persisted on the next
 * write) so every entry is addressable by the Load/Copy/Delete buttons.
 * @returns {Array<{ id: string, title: string, text: string, savedAt: number }>}
 */
function readSavedPrompts() {
    const raw = getContext().chatMetadata?.[IP_METADATA_KEY]?.savedPrompts;
    if (!Array.isArray(raw)) return [];
    const valid = raw.filter(p => p && typeof p.text === 'string' && p.text.trim());
    for (const p of valid) {
        if (typeof p.id !== 'string' || !p.id) p.id = makeSavedPromptId();
        if (typeof p.title !== 'string') p.title = '';
        if (typeof p.savedAt !== 'number') p.savedAt = 0;
        // `negative` is left undefined on entries saved before the field
        // existed — callers distinguish "saved without one" ('') from
        // "predates the feature" (undefined), so don't backfill it here.
    }
    return valid;
}

/**
 * Suggest a title for a prompt being saved: its first line, cut at a word
 * boundary. Only a suggestion — the user can replace or blank it.
 */
function suggestPromptTitle(text) {
    const firstLine = text.split('\n')[0].trim();
    if (firstLine.length <= 48) return firstLine;
    const cut = firstLine.slice(0, 48);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > 24 ? cut.slice(0, lastSpace) : cut) + '…';
}

/** Write the list through to chatMetadata (removing the key when empty). */
function writeSavedPrompts(list) {
    const context = getContext();
    if (!context.chatMetadata) {
        debug('writeSavedPrompts: no chatMetadata, skipping');
        return;
    }
    if (list.length) {
        context.chatMetadata[IP_METADATA_KEY] = { savedPrompts: list };
    } else if (context.chatMetadata[IP_METADATA_KEY]) {
        delete context.chatMetadata[IP_METADATA_KEY];
    }
    context.saveMetadata();
}

function saveOutputToChat() {
    if (actions.isGenerating()) return;
    const text = document.getElementById('ip_prompt_output')?.value?.trim() || '';
    if (!text) {
        toast('Image prompt is empty. Nothing to save.', 'warning');
        return;
    }
    if (!hasActiveChat()) {
        toast('Open a chat first — saved prompts are stored with the chat.', 'warning');
        return;
    }
    const prompts = readSavedPrompts();
    const negative = readNegativePrompt();
    // Same prompt with a different negative is a different render, so both
    // halves have to match for it to count as a duplicate.
    if (prompts.some(p => p.text === text && (p.negative ?? '') === negative)) {
        toast('This image prompt is already saved to this chat.', 'info');
        return;
    }
    // Cancel aborts the save; an emptied field saves the prompt untitled.
    const title = window.prompt('Title for this saved prompt:', suggestPromptTitle(text));
    if (title === null) return;
    prompts.push({
        id: makeSavedPromptId(),
        title: title.trim(),
        text,
        negative: readNegativePrompt(),
        savedAt: Date.now(),
    });
    writeSavedPrompts(prompts);
    renderSavedPrompts();
    toast('Image prompt saved to this chat.', 'success');
    debug('Saved prompt to chat, total:', prompts.length);
}

function renameSavedPrompt(id) {
    if (actions.isGenerating()) return;
    const prompts = readSavedPrompts();
    const entry = prompts.find(p => p.id === id);
    if (!entry) return;
    const title = window.prompt('New title for this saved prompt:', entry.title || '');
    if (title === null) return;
    entry.title = title.trim();
    writeSavedPrompts(prompts);
    renderSavedPrompts();
}

function deleteSavedPrompt(id) {
    const prompts = readSavedPrompts();
    const remaining = prompts.filter(p => p.id !== id);
    if (remaining.length === prompts.length) return;
    writeSavedPrompts(remaining);
    renderSavedPrompts();
    toast('Saved image prompt deleted.', 'success');
}

function loadSavedPrompt(id) {
    if (actions.isGenerating()) return;
    const entry = readSavedPrompts().find(p => p.id === id);
    if (!entry) return;
    const output = document.getElementById('ip_prompt_output');
    if (!output) return;
    const current = output.value.trim();
    if (current && current !== entry.text
        && !window.confirm('Replace the current image prompt with the saved one?')) {
        return;
    }
    output.value = entry.text;
    // Restore the negative it was saved with. Entries from before the field
    // existed have none, and leave the current negative alone.
    if (typeof entry.negative === 'string') {
        const negative = document.getElementById('ip_negative_prompt');
        if (negative) {
            negative.value = entry.negative;
            persistedModalState.negative = entry.negative;
        }
    }
    // Loading replaces the working prompt wholesale, so the old Retry
    // restore point no longer describes anything on screen — drop it,
    // mirroring the Clear button.
    actions.dropRestorePoint();
    toast('Saved image prompt loaded.', 'success');
}

function formatSavedPromptDate(savedAt) {
    if (!savedAt) return 'Unknown date';
    try {
        return new Date(savedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
        return new Date(savedAt).toLocaleString();
    }
}

/**
 * (Re)render the Saved Prompts section of the open modal from chatMetadata.
 * Rows are built with createElement/textContent — prompt text is user/LLM
 * content and must never pass through innerHTML.
 */
function renderSavedPrompts() {
    const list = document.getElementById('ip_saved_list');
    const count = document.getElementById('ip_saved_count');
    if (!list) return;

    const prompts = readSavedPrompts().slice().sort((a, b) => b.savedAt - a.savedAt);
    if (count) count.textContent = String(prompts.length);
    list.innerHTML = '';

    if (!prompts.length) {
        const empty = document.createElement('div');
        empty.className = 'ip-saved-empty';
        empty.textContent = hasActiveChat()
            ? 'No saved prompts in this chat yet. Click Save under the image prompt to keep one.'
            : 'Open a chat to save and browse image prompts — they are stored with the chat.';
        list.appendChild(empty);
        return;
    }

    for (const entry of prompts) {
        list.appendChild(buildSavedPromptRow(entry));
    }
}

function buildSavedPromptRow(entry) {
    const row = document.createElement('div');
    row.className = 'ip-saved-item';

    const info = document.createElement('div');
    info.className = 'ip-saved-item-info';
    info.title = entry.text;

    const head = document.createElement('div');
    head.className = 'ip-saved-item-head';

    const title = document.createElement('div');
    title.className = 'ip-saved-item-title';
    if (!entry.title) title.classList.add('ip-saved-item-untitled');
    title.textContent = entry.title || 'Untitled prompt';
    head.appendChild(title);

    const date = document.createElement('div');
    date.className = 'ip-saved-item-date';
    date.textContent = formatSavedPromptDate(entry.savedAt);
    head.appendChild(date);

    info.appendChild(head);

    const preview = document.createElement('div');
    preview.className = 'ip-saved-item-preview';
    preview.textContent = entry.text;
    info.appendChild(preview);

    row.appendChild(info);

    const buttons = document.createElement('div');
    buttons.className = 'ip-saved-item-buttons';
    buttons.appendChild(buildSavedPromptButton('fa-file-import', 'Load this prompt into the editor above', () => loadSavedPrompt(entry.id)));
    if (imageGenButtonEnabled()) {
        buttons.appendChild(buildSavedPromptButton(
            'fa-paintbrush',
            `Render this saved prompt on ${getImageGenSourceLabel()} without loading it into the editor`,
            () => sendSavedPromptToImageGen(entry.id),
        ));
    }
    buttons.appendChild(buildSavedPromptButton('fa-copy', 'Copy this prompt to the clipboard', () => copyToClipboard(entry.text)));
    buttons.appendChild(buildSavedPromptButton('fa-pen', 'Rename this saved prompt', () => renameSavedPrompt(entry.id)));
    buttons.appendChild(buildSavedPromptButton('fa-trash-can', 'Delete this saved prompt', () => {
        if (actions.isGenerating()) return;
        if (!window.confirm('Delete this saved image prompt?')) return;
        deleteSavedPrompt(entry.id);
    }));
    row.appendChild(buttons);

    return row;
}

function buildSavedPromptButton(icon, title, onClick) {
    const btn = document.createElement('div');
    btn.className = 'menu_button interactable ip-saved-item-btn';
    btn.title = title;
    btn.innerHTML = `<span class="fa-solid ${icon}"></span>`;
    btn.addEventListener('click', onClick);
    return btn;
}

// ─── Init ───

/**
 * Initialize the Image Prompting module. Called once from index.js.
 * @param {object} opts - { settings, saveSettings }
 */
export function initImagePrompting({ settings, saveSettings }) {
    moduleSettings = settings;
    saveSettingsFn = saveSettings;
    debug = createDebugLogger('IMAGE-PROMPT', () => moduleSettings.imagePromptDebugMode);
    debug('Module initialized');
}

// ─── Slash Command + Launch Menu Item ───

export function registerImagePromptSlashCommand() {
    if (typeof SlashCommandParser?.addCommandObject !== 'function') return;
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'imageprompt',
        callback: () => {
            openImagePromptModal();
            return '';
        },
        helpString: 'Open the Image Prompt modal: generate a diffusion-model prompt depicting the current moment of the chat, ready to paste into ComfyUI or another image tool.',
    }));
    debug('Registered /imageprompt slash command');
}

export function createImagePromptMenuItem() {
    if (document.getElementById('image_prompt_menu_button')) return;
    const ref = document.getElementById('option_continue');
    if (!ref) return;

    const btn = document.createElement('div');
    btn.id = 'image_prompt_menu_button';
    btn.classList.add('image-prompt-trigger', 'list-group-item', 'interactable');
    btn.title = 'Generate an image-generation prompt for the current moment of the chat';
    btn.innerHTML = '<span class="fa-solid fa-image"></span> Image Prompt';
    btn.addEventListener('click', () => openImagePromptModal());

    ref.parentNode.insertBefore(btn, ref.nextSibling);
    debug('Launch menu item injected');
}

// ─── Per-message Button ───

// Mirrors Reformatting's per-message button: injected into `.mes_buttons`,
// kept present by a `#chat` MutationObserver. Clicking it opens the modal
// anchored at that message — the packed chat context ends there, so the
// generated prompt depicts that moment of the story — and starts a Generate
// right away.

function messageButtonsEnabled() {
    return !!(moduleSettings?.imagePromptEnabled && moduleSettings?.imagePromptMessageButtonEnabled);
}

function makeMessageButton() {
    const btn = document.createElement('div');
    btn.className = 'mes_button sse-image-prompt-button fa-solid fa-image interactable';
    btn.title = 'Generate an image prompt for this moment (chat context ends at this message)';
    btn.tabIndex = 0;
    btn.addEventListener('click', onMessageButtonClick);
    return btn;
}

function onMessageButtonClick(event) {
    const mesEl = event.currentTarget.closest('.mes');
    if (!mesEl) return;
    const mesId = mesEl.getAttribute('mesid');
    const index = mesId !== null ? parseInt(mesId, 10) : -1;
    if (index < 0 || Number.isNaN(index)) return;
    if (isGenerationInProgress()) return;
    // Auto-generate is opt-in — by default the modal opens anchored but
    // idle, so there's time to add guidance before pressing Generate.
    openImagePromptModal({
        anchorIndex: index,
        autoGenerate: !!moduleSettings?.imagePromptMessageButtonAutoGenerate,
    });
}

/** Inject the image-prompt button into a single `.mes` element if eligible. */
function injectMessageButtonInto(mesEl) {
    if (!(mesEl instanceof HTMLElement)) return;
    if (!mesEl.matches?.('.mes')) return;
    // User and AI messages both make valid moments to depict; skip only
    // hidden/system messages (the context packer skips them anyway).
    if (mesEl.getAttribute('is_system') === 'true') return;
    const buttons = mesEl.querySelector('.mes_buttons');
    if (!buttons) return;
    if (buttons.querySelector('.sse-image-prompt-button')) return;

    // Sit alongside the other quick buttons, before the hover-revealed group.
    const extra = buttons.querySelector('.extraMesButtons');
    const btn = makeMessageButton();
    if (extra) {
        buttons.insertBefore(btn, extra);
    } else {
        buttons.appendChild(btn);
    }
}

/** (Re)scan every message in the chat and inject buttons where missing. */
export function rescanImagePromptButtons() {
    if (!messageButtonsEnabled()) return;
    document.querySelectorAll('#chat .mes').forEach(injectMessageButtonInto);
}

/** Remove every injected image-prompt button (on disable). */
export function removeAllImagePromptButtons() {
    document.querySelectorAll('.sse-image-prompt-button').forEach(el => el.remove());
}

/**
 * Watch the chat for messages appearing / re-rendering and keep each
 * message's image-prompt button present. ST re-renders message nodes on
 * swipe, edit, and load, which can drop injected DOM — the observer re-adds
 * it. Same shape as the Reformatting observer.
 */
export function startImagePromptObserver() {
    if (messageButtonListenersInstalled) return;
    messageButtonListenersInstalled = true;

    const attachObserver = () => {
        if (messageButtonObserver) return;
        const chat = document.getElementById('chat');
        if (!chat) return;
        messageButtonObserver = new MutationObserver((mutations) => {
            if (!messageButtonsEnabled()) return;
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (!(node instanceof HTMLElement)) continue;
                    if (node.matches?.('.mes')) injectMessageButtonInto(node);
                    node.querySelectorAll?.('.mes').forEach(injectMessageButtonInto);
                }
            }
        });
        messageButtonObserver.observe(chat, { childList: true, subtree: true });
        debug('Chat observer attached');
    };

    attachObserver();
    rescanImagePromptButtons();
    debug('Image-prompt message-button observer installed');
}

// ─── Settings Bindings ───

/**
 * Bind Image Prompting settings panel controls. Called after settings HTML
 * is injected.
 * @param {function} saveSettings
 */
export function bindImagePromptSettings(saveSettings) {
    const syncMessageButtons = () => {
        if (messageButtonsEnabled()) {
            rescanImagePromptButtons();
        } else {
            removeAllImagePromptButtons();
        }
    };

    const bind = createSettingsBinder(moduleSettings, saveSettings);
    bind.checkbox('image_prompt_enabled', 'imagePromptEnabled', syncMessageButtons);
    bind.checkbox('image_prompt_message_button_enabled', 'imagePromptMessageButtonEnabled', syncMessageButtons);
    bind.checkbox('image_prompt_message_button_autogenerate', 'imagePromptMessageButtonAutoGenerate');
    bind.checkbox('image_prompt_send_to_imagegen', 'imagePromptSendToImageGenEnabled', () => {
        // The modal may be open behind the settings drawer.
        refreshImageGenButton();
        renderSavedPrompts();
    });
    bind.checkbox('image_prompt_imagegen_quiet', 'imagePromptImageGenQuiet');
    bind.checkbox('image_prompt_debug_mode', 'imagePromptDebugMode');
    bind.number('image_prompt_max_context_override', 'imagePromptMaxContextOverride', { zeroMeansOff: true });
    bind.text('image_prompt_prompt_textarea', 'imagePromptPrompt', getPromptTemplate());
    bind.text('image_prompt_prefill_textarea', 'imagePromptPrefill', getPrefill());
    bind.text('image_prompt_negative_textarea', 'imagePromptNegative',
        textSetting(moduleSettings, 'imagePromptNegative', DEFAULT_IMAGE_PROMPT_NEGATIVE));

    document.getElementById('image_prompt_preview_btn')
        ?.addEventListener('click', showImagePromptPreview);
}

function showImagePromptPreview() {
    const sampleContext =
        'Scene to visualize (the roleplay chat, characters, and selected lore):\n'
        + '(character cards, persona, selected lore books, and recent chat — included when '
        + 'enabled in the Image Prompt modal)\n\n';
    const prompt = composeGeneratePrompt(sampleContext, '(your optional guidance)');
    showPromptPreview('Image Prompting — Prompt Preview (Generate)', [
        { label: 'System Prompt (fixed)', text: IP_GENERATE_SYSTEM_PROMPT },
        { label: 'User Prompt (template with sample values)', text: prompt },
        { label: 'Prefill (assistant prefix; kept at the start of the final prompt)', text: getPrefill() },
        {
            label: 'Negative Prompt (not sent to the LLM — used by Generate Image)',
            text: currentPresetNegative()
                || '(empty — Generate Image will send only the negative prompt configured in '
                    + 'SillyTavern\'s Image Generation panel)',
        },
        {
            label: 'Note',
            text: 'Continue uses the same template, but the image prompt so far is sent as '
                + 'the assistant prefill so the model picks up from its exact end (a true '
                + 'continuation, like ST\'s native Continue) rather than starting over. '
                + `System prompt:\n\n${IP_CONTINUE_SYSTEM_PROMPT}`,
        },
    ]);
}

// ─── Modal ───

let activePopup = null;
let lorebookPicker = null;

const actions = createGenerationActions({
    prefix: 'ip',
    outputId: 'ip_prompt_output',
    noun: 'image prompt',
    aNoun: 'an image prompt',
    statusText: { generate: 'Generating image prompt…', continue: 'Continuing image prompt…' },
    lockIds: ['ip_guidance'],
    responseLength: {
        get settings() { return moduleSettings; },
        key: 'imagePromptResponseLength',
        fallback: DEFAULT_IMAGE_PROMPT_RESPONSE_LENGTH,
        save: () => saveSettingsFn?.(),
    },
    getPopup: () => activePopup,
    canRun: () => {
        const { includeChat, loreBookNames } = readModalContextOptions();
        if (includeChat || loreBookNames.length || readGuidance()) return true;
        toast('Nothing to work from — enable Use Chat Context, select a lore book, or enter Guidance.', 'warning');
        return false;
    },
    run: (action, { existing, outputEl, responseLength }) => (action === 'continue'
        ? generateContinuation(existing, outputEl, responseLength)
        : generateImagePrompt(outputEl, responseLength)),
    // The image hand-off needs a finished prompt: off while ours streams, and
    // left alone while an image renders (setSendingImageUI owns it then).
    onRefresh: (generating, hasText) => {
        if (!isSendingImage) setModalButtonDisabled('ip_send_imagegen_btn', generating || !hasText);
    },
    logLabel: 'Image Prompting',
    debug: (...args) => debug(...args),
});

async function openImagePromptModal({ anchorIndex = null, autoGenerate = false } = {}) {
    if (activePopup) return;
    if (!moduleSettings?.imagePromptEnabled) {
        toast('Image Prompting is disabled. Enable it in the extension settings first.', 'warning');
        return;
    }

    actions.reset();
    isSendingImage = false;
    contextAnchorIndex = (Number.isInteger(anchorIndex) && anchorIndex >= 0) ? anchorIndex : null;

    const body = buildModalBody();

    const popup = new Popup(body, POPUP_TYPE.TEXT, '', {
        okButton: 'Copy & Close',
        cancelButton: 'Close',
        wide: true,
        large: true,
        allowVerticalScrolling: true,
        onOpen: () => {
            bindModalHandlers();
            actions.bind();
            refreshAnchorBar();
            presetChangeUnsubscribe = onToolPresetChange('image-prompt', onPresetChangedRefreshNegative);
            debug('Modal opened', contextAnchorIndex !== null ? `(anchored at message ${contextAnchorIndex})` : '');
            if (autoGenerate) actions.generate();
        },
        onClosing: (p) => {
            if (p.result === POPUP_RESULT.AFFIRMATIVE) {
                // Copy & Close clicked — refuse to close mid-generation.
                if (actions.isGenerating()) {
                    toast('Wait for generation to finish before copying.', 'warning');
                    return false;
                }
                const output = body.querySelector('#ip_prompt_output')?.value?.trim() || '';
                if (!output) {
                    toast('Image prompt is empty. Nothing to copy.', 'warning');
                    return false;
                }
                return true;
            }
            // Close / Esc / X — abort any in-flight job, then allow close.
            actions.stopIfRunning();
            return true;
        },
    });
    activePopup = popup;

    try {
        const result = await popup.show();
        if (result === POPUP_RESULT.AFFIRMATIVE) {
            const output = body.querySelector('#ip_prompt_output')?.value?.trim() || '';
            await copyToClipboard(output);
        }
    } finally {
        capturePersistedModalState(body);
        presetChangeUnsubscribe?.();
        presetChangeUnsubscribe = null;
        activePopup = null;
        lorebookPicker = null;
        actions.reset();
        isSendingImage = false;
        contextAnchorIndex = null;
        debug('Modal closed');
    }
}

function capturePersistedModalState(body) {
    if (!body) return;
    persistedModalState.guidance = body.querySelector('#ip_guidance')?.value || '';
    persistedModalState.output = body.querySelector('#ip_prompt_output')?.value || '';
    const negativeEl = body.querySelector('#ip_negative_prompt');
    if (negativeEl) persistedModalState.negative = negativeEl.value;
    persistedModalState.useChatContext = !!body.querySelector('#ip_use_chat_context')?.checked;
    persistedModalState.selectedLoreBooks = lorebookPicker?.getSelected() ?? [];
    actions.commitResponseLength(body);
}

function buildModalBody() {
    const root = document.createElement('div');
    root.className = 'sse-modal-body';
    root.innerHTML = `
        <div class="sse-modal-context">
            <label class="checkbox_label" title="Read the current chat, character cards, and persona to describe the present moment">
                <input id="ip_use_chat_context" type="checkbox" />
                <span>Use Chat Context</span>
            </label>
            <div class="ip-lorebook-host"></div>
        </div>
        <div id="ip_anchor_bar" class="sse-modal-banner ip-anchor-bar sse-modal-hidden">
            <span class="fa-solid fa-anchor"></span>
            <span id="ip_anchor_text" class="ip-anchor-text"></span>
            ${smallButtonHtml('ip_anchor_clear_btn', 'fa-xmark', 'Full Chat', 'Drop the anchor and use the full chat up to the latest message instead')}
        </div>
        <div class="sse-modal-preset-row">
            <label class="sse-modal-preset-label"><span class="fa-solid fa-file-pen"></span> Prompt Preset:</label>
            <div class="ip-preset-host"></div>
        </div>
        <div class="sse-modal-section">
            <div class="sse-modal-field-header">
                <label for="ip_guidance"><b>Guidance (optional):</b></label>
                ${smallButtonHtml('ip_clear_guidance_btn', 'fa-eraser', 'Clear', 'Clear the guidance')}
            </div>
            <textarea id="ip_guidance" class="text_pole" rows="3" placeholder="Optional extra direction: what to focus on, camera angle, art style, details to emphasize..."></textarea>
        </div>
        ${actionRowHtml('ip', {
        noun: 'image prompt',
        generateTitle: 'Generate a fresh image prompt from the scene (replaces the textarea)',
    })}
        ${tokensRowHtml('ip')}
        ${statusBarHtml('ip')}
        <div class="sse-modal-output-section">
            <div class="sse-modal-field-header">
                <label for="ip_prompt_output"><b>Image Prompt:</b></label>
                <div class="sse-modal-field-header-buttons">
                    ${smallButtonHtml('ip_send_imagegen_btn', 'fa-paintbrush', 'Generate Image', 'Render this prompt on the image backend configured in SillyTavern\'s Image Generation settings', 'sse-modal-primary sse-modal-hidden')}
                    ${smallButtonHtml('ip_save_output_btn', 'fa-floppy-disk', 'Save', 'Save the image prompt to this chat so it can be retrieved later')}
                    ${smallButtonHtml('ip_copy_output_btn', 'fa-copy', 'Copy', 'Copy the image prompt to the clipboard')}
                    ${smallButtonHtml('ip_clear_output_btn', 'fa-eraser', 'Clear', 'Clear the generated image prompt')}
                </div>
            </div>
            <textarea id="ip_prompt_output" class="text_pole sse-modal-output ip-prompt-output" rows="14" placeholder="The generated image prompt will appear here. Edit it freely, then copy it into ComfyUI or your image tool."></textarea>
        </div>
        <div class="ip-negative-section">
            <div class="sse-modal-field-header">
                <label for="ip_negative_prompt" title="Sent as the negative prompt when you click Generate Image. It is added in front of the negative prompt configured in SillyTavern's own Image Generation panel, which still applies."><b>Negative Prompt:</b></label>
                <div class="sse-modal-field-header-buttons">
                    ${smallButtonHtml('ip_reset_negative_btn', 'fa-rotate-left', 'Reset', 'Reset to the current prompt preset\'s negative prompt')}
                    ${smallButtonHtml('ip_clear_negative_btn', 'fa-eraser', 'Clear', 'Clear the negative prompt')}
                </div>
            </div>
            <textarea id="ip_negative_prompt" class="text_pole ip-negative-prompt" rows="3" placeholder="Things to keep out of the image (e.g. lowres, bad anatomy, watermark). Follows the prompt preset unless you edit it. Leave empty to use only SillyTavern's own negative prompt."></textarea>
        </div>
        <div class="ip-saved-section">
            <details class="ip-saved-picker">
                <summary title="Image prompts saved to this chat — load, copy, or delete them">
                    <span class="fa-solid fa-bookmark"></span>
                    <span>Saved Prompts (<span id="ip_saved_count">0</span>)</span>
                </summary>
                <div id="ip_saved_list" class="ip-saved-list"></div>
            </details>
        </div>
    `;

    // Hydrate the persisted-across-opens fields.
    const guidanceEl = root.querySelector('#ip_guidance');
    if (guidanceEl) guidanceEl.value = persistedModalState.guidance || '';
    const outputEl = root.querySelector('#ip_prompt_output');
    if (outputEl) outputEl.value = persistedModalState.output || '';
    const chatCb = root.querySelector('#ip_use_chat_context');
    if (chatCb) chatCb.checked = !!persistedModalState.useChatContext;
    const negativeEl = root.querySelector('#ip_negative_prompt');
    if (negativeEl) negativeEl.value = resolveNegativeForField();

    actions.fillResponseLength(root);

    // Mount the shared lore-book picker with previously-selected entries.
    lorebookPicker = createLoreBookPicker({
        classPrefix: MODAL_LOREBOOK_PREFIX,
        initialSelection: persistedModalState.selectedLoreBooks.slice(),
    });
    root.querySelector('.ip-lorebook-host').replaceWith(lorebookPicker.element);

    // Point-of-use preset selection — one preset per diffusion-model family
    // (Default targets Krea 2; Anima / Danbooru Tags ship seeded), synced
    // with the settings widget (which also manages presets).
    root.querySelector('.ip-preset-host').replaceWith(createToolPresetSelector({
        toolKey: 'image-prompt',
        title: 'Prompt preset used for Generate — pick the template for your target diffusion model '
            + '(e.g. Default for Krea 2, Anima, Danbooru Tags). Save and edit presets in the '
            + 'extension settings.',
    }));

    return root;
}

function bindModalHandlers() {
    document.getElementById('ip_save_output_btn')?.addEventListener('click', saveOutputToChat);
    document.getElementById('ip_send_imagegen_btn')?.addEventListener('click', handleSendToImageGen);
    refreshImageGenButton();
    renderSavedPrompts();

    document.getElementById('ip_copy_output_btn')?.addEventListener('click', () => {
        if (actions.isGenerating()) return;
        const out = document.getElementById('ip_prompt_output');
        const text = out?.value?.trim() || '';
        if (!text) {
            toast('Image prompt is empty. Nothing to copy.', 'warning');
            return;
        }
        copyToClipboard(text);
    });
    document.getElementById('ip_anchor_clear_btn')?.addEventListener('click', () => {
        if (actions.isGenerating()) return;
        contextAnchorIndex = null;
        refreshAnchorBar();
    });
    document.getElementById('ip_clear_guidance_btn')?.addEventListener('click', () => {
        if (actions.isGenerating()) return;
        const guidance = document.getElementById('ip_guidance');
        if (!guidance) return;
        guidance.value = '';
        guidance.focus();
    });
    document.getElementById('ip_reset_negative_btn')?.addEventListener('click', () => {
        if (actions.isGenerating()) return;
        setNegativeFromPreset();
    });
    document.getElementById('ip_clear_negative_btn')?.addEventListener('click', () => {
        if (actions.isGenerating()) return;
        const negative = document.getElementById('ip_negative_prompt');
        if (!negative) return;
        negative.value = '';
        // An emptied field is a deliberate choice, not "unset" — record it so
        // a preset switch doesn't quietly refill it.
        persistedModalState.negative = '';
        negative.focus();
    });
}

/**
 * Show or hide the context-anchor bar to match `contextAnchorIndex`. The
 * label is built with textContent — the message snippet is user/LLM content
 * and must never pass through innerHTML. If the anchored message no longer
 * exists (chat shrank while the modal was open), the anchor is dropped.
 */
function refreshAnchorBar() {
    const bar = document.getElementById('ip_anchor_bar');
    const label = document.getElementById('ip_anchor_text');
    if (!bar || !label) return;

    const msg = (contextAnchorIndex !== null) ? getContext().chat?.[contextAnchorIndex] : null;
    if (!msg) {
        contextAnchorIndex = null;
        bar.classList.add('sse-modal-hidden');
        return;
    }

    const snippet = (msg.mes || '').replace(/\s+/g, ' ').trim();
    const preview = snippet.length > 80 ? `${snippet.slice(0, 80)}…` : snippet;
    const who = msg.name ? ` — ${msg.name}` : '';
    label.textContent = `Context ends at message #${contextAnchorIndex}${who}: ${preview}`;
    bar.classList.remove('sse-modal-hidden');
}

async function copyToClipboard(text) {
    await copyTextToClipboard(text, {
        successMessage: 'Image prompt copied to clipboard!',
        logPrefix: 'Image Prompting',
        debug,
    });
}

// ─── Negative Prompt ───

/** The active prompt preset's negative prompt. */
function currentPresetNegative() {
    return (typeof moduleSettings?.imagePromptNegative === 'string')
        ? moduleSettings.imagePromptNegative
        : DEFAULT_IMAGE_PROMPT_NEGATIVE;
}

/**
 * Text the modal's negative field should open with: the preset's negative
 * while the user hasn't customized it, otherwise whatever they last typed.
 */
function resolveNegativeForField() {
    const preset = currentPresetNegative();
    const saved = persistedModalState.negative;
    if (saved === null || saved === seededNegative) {
        seededNegative = preset;
        return preset;
    }
    return saved;
}

/** Live value of the modal's negative field (empty when the modal is shut). */
function readNegativePrompt() {
    return document.getElementById('ip_negative_prompt')?.value?.trim() || '';
}

/** Put the field back under preset control. */
function setNegativeFromPreset() {
    const field = document.getElementById('ip_negative_prompt');
    if (!field) return;
    const preset = currentPresetNegative();
    field.value = preset;
    seededNegative = preset;
    persistedModalState.negative = preset;
}

/**
 * Follow a preset switch made while the modal is open — but only while the
 * field still holds what the previous preset seeded. A negative the user
 * typed themselves is theirs to keep; Reset is how they opt back in.
 */
function onPresetChangedRefreshNegative() {
    const field = document.getElementById('ip_negative_prompt');
    if (!field || field.value !== seededNegative) return;
    setNegativeFromPreset();
    debug('Negative prompt re-seeded from the newly activated preset');
}

// ─── Send to ST's Image Generation ───

/**
 * Whether the Generate Image affordances should be shown: the user hasn't
 * switched them off, and ST's own Image Generation extension is actually
 * loaded (it can be disabled in the Extensions panel).
 */
function imageGenButtonEnabled() {
    return moduleSettings?.imagePromptSendToImageGenEnabled !== false && isImageGenAvailable();
}

/**
 * Show/hide the modal's Generate Image button and label it with the backend
 * ST is currently pointed at, so it's obvious where the prompt is going.
 */
function refreshImageGenButton() {
    const btn = document.getElementById('ip_send_imagegen_btn');
    if (!btn) return;
    if (!imageGenButtonEnabled()) {
        btn.classList.add('sse-modal-hidden');
        return;
    }
    btn.classList.remove('sse-modal-hidden');
    if (!isSendingImage) {
        const label = getImageGenSourceLabel();
        btn.innerHTML = '<span class="fa-solid fa-paintbrush"></span> Generate Image';
        btn.title = `Render this prompt on ${label}, the backend configured in SillyTavern's `
            + 'Image Generation settings. The prompt is sent as-is — ST applies its own '
            + 'common prompt prefix and negative prompt on top.';
    }
}

/**
 * Hand the current image prompt to ST's Image Generation extension.
 *
 * The modal deliberately stays open: image generation is slow, ST shows its
 * own stoppable progress toast, and keeping the modal up lets the user tweak
 * the prompt and re-send without regenerating it. The result posts into the
 * chat behind the modal (unless the quiet setting is on).
 */
async function handleSendToImageGen() {
    if (actions.isGenerating() || isSendingImage) return;
    if (!imageGenButtonEnabled()) return;

    const text = document.getElementById('ip_prompt_output')?.value?.trim() || '';
    if (!text) {
        toast('Image prompt is empty. Generate one first.', 'warning');
        return;
    }

    // Pre-flight the parts of ST's config we can read, so an unset ComfyUI
    // URL or workflow says exactly that instead of ST's generic warning.
    const configured = checkImageGenConfigured();
    if (!configured.ok) {
        toast(configured.reason, 'warning');
        return;
    }

    const label = getImageGenSourceLabel();
    setSendingImageUI(true, label);
    try {
        await dispatchImageGen(text, label, readNegativePrompt());
    } finally {
        setSendingImageUI(false, label);
    }
}

/**
 * Render a saved prompt straight from its Saved Prompts row, without
 * disturbing whatever is in the editor above.
 */
async function sendSavedPromptToImageGen(id) {
    if (actions.isGenerating() || isSendingImage) return;
    if (!imageGenButtonEnabled()) return;

    const entry = readSavedPrompts().find(p => p.id === id);
    if (!entry) return;

    const configured = checkImageGenConfigured();
    if (!configured.ok) {
        toast(configured.reason, 'warning');
        return;
    }

    const label = getImageGenSourceLabel();
    setSendingImageUI(true, label);
    try {
        // A saved prompt carries the negative it was saved with; older
        // entries predate the field and fall back to the live one.
        const negative = (typeof entry.negative === 'string')
            ? entry.negative
            : readNegativePrompt();
        await dispatchImageGen(entry.text, label, negative);
    } finally {
        setSendingImageUI(false, label);
    }
}

/**
 * Shared hand-off: send the text, report the outcome. Owns the
 * `isSendingImage` flag so no caller can leave it stuck set.
 */
async function dispatchImageGen(text, label, negative = '') {
    isSendingImage = true;
    debug('Sending prompt to image generation:', label, `${text.length} chars`,
        negative ? `negative: ${negative.length} chars` : 'no negative');
    try {
        const url = await sendPromptToImageGen(text, {
            quiet: !!moduleSettings?.imagePromptImageGenQuiet,
            negative,
        });
        if (url) {
            toast(`Image generated on ${label}.`, 'success');
            debug('Image generated:', url);
        } else {
            // ST already raised its own toast (backend unreachable, stopped
            // mid-generation, bad workflow) — don't stack a second one.
            debug('Image generation returned no URL; ST reported the reason.');
        }
    } catch (err) {
        console.error('SSE Image Prompting: image generation failed', err);
        toast(err?.message || 'Image generation failed. See the console for details.', 'error');
    } finally {
        isSendingImage = false;
    }
}

/** Spinner + disabled state for the Generate Image button while in flight. */
function setSendingImageUI(sending, label) {
    const btn = document.getElementById('ip_send_imagegen_btn');
    if (!btn) return;
    if (sending) {
        btn.classList.add('sse-modal-disabled');
        btn.innerHTML = '<span class="fa-solid fa-spinner fa-spin"></span> Generating…';
        btn.title = `Generating an image on ${label}. Use ST's progress toast to stop it.`;
    } else {
        btn.classList.remove('sse-modal-disabled');
        refreshImageGenButton();
        actions.refresh();
    }
}

// ─── Generation ───

function readGuidance() {
    return document.getElementById('ip_guidance')?.value?.trim() || '';
}

function readModalContextOptions() {
    return {
        includeChat: !!document.getElementById('ip_use_chat_context')?.checked,
        loreBookNames: lorebookPicker?.getSelected() ?? [],
    };
}

// ─── Prompt Composition ───

/**
 * Assemble the Generate-mode user prompt. {{context}} / {{guidance}} are
 * substituted in place; when a placeholder is absent the block is added the
 * default way (context prepended, guidance appended) so custom templates
 * without the placeholders keep working.
 */
function composeGeneratePrompt(preambleBlock, guidance) {
    const guidanceText = (guidance || '').trim();
    const { text, used } = applyTemplateMacros(getPromptTemplate(), {
        context: preambleBlock || '',
        guidance: guidanceText,
    });
    let prompt = text;
    if (!used.has('context') && preambleBlock) prompt = preambleBlock + prompt;
    if (!used.has('guidance') && guidanceText) {
        prompt = `${prompt}\n\nAdditional guidance from the user (honor it):\n${guidanceText}`;
    }
    return prompt;
}

/**
 * Assemble the Continue-mode user prompt: same template + macros, then a
 * prefill-aware continuation note. The image-prompt-so-far is sent as the
 * assistant prefill (true positional continuation, like ST's native
 * Continue), so it is deliberately NOT embedded here.
 */
function composeContinuePrompt(preambleBlock, guidance) {
    const prompt = composeGeneratePrompt(preambleBlock, guidance);
    return `${prompt}\n\nYour reply has been prefilled with the image prompt so far. Continue seamlessly from exactly where it stops — do not repeat any existing text. Maintain the same prompt style. Output only the continuation.`;
}

async function generateImagePrompt(outputEl, responseLength) {
    const guidance = readGuidance();
    const prompt = composeGeneratePrompt(await buildPreambleBlock(responseLength), guidance);
    const prefill = getPrefill();
    debug('Generating with guidance length', guidance.length, 'tokens', responseLength);
    debug('Prompt:', prompt);
    debug('Prefill:', prefill);
    return streamFresh({
        prompt, systemPrompt: IP_GENERATE_SYSTEM_PROMPT, responseLength, prefill, outputEl, name: 'image-prompt',
    });
}

async function generateContinuation(existing, outputEl, responseLength) {
    const prompt = composeContinuePrompt(await buildPreambleBlock(responseLength), readGuidance());
    debug('Continuing with existing length', existing.length, 'tokens', responseLength);
    debug('Prompt:', prompt);
    return streamContinuation({
        prompt, systemPrompt: IP_CONTINUE_SYSTEM_PROMPT, responseLength, existing, outputEl,
        name: 'image-prompt-continue',
    });
}

function getPromptTemplate() {
    return templateSetting(moduleSettings, 'imagePromptPrompt', DEFAULT_IMAGE_PROMPT_PROMPT);
}

function getPrefill() {
    return textSetting(moduleSettings, 'imagePromptPrefill', DEFAULT_IMAGE_PROMPT_PREFILL);
}

async function buildPreambleBlock(responseLength) {
    const ctxOptions = readModalContextOptions();
    if (!ctxOptions.includeChat && !ctxOptions.loreBookNames.length) return '';
    const anchored = contextAnchorIndex !== null;
    const preamble = await buildContextPreamble({
        ...ctxOptions,
        responseLength,
        maxContextOverride: moduleSettings?.imagePromptMaxContextOverride || 0,
        ...(anchored ? { endAtMessageIndex: contextAnchorIndex } : {}),
    });
    if (!preamble) return '';
    debug('Context preamble length:', preamble.length, anchored ? `(anchored at message ${contextAnchorIndex})` : '');
    // When anchored, the packed chat ends at the chosen message, so tell the
    // model that the final message — not "now" — is the moment to depict.
    const header = anchored
        ? 'Scene to visualize (the roleplay chat up to the chosen moment, characters, and selected lore — the final message of the Recent Chat is the current moment to depict):'
        : 'Scene to visualize (the roleplay chat, characters, and selected lore):';
    return `${header}\n${preamble}\n\n`;
}
