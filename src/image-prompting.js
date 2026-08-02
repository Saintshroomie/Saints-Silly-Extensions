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
 */

import { removeReasoningFromString } from '../../../../reasoning.js';
import {
    Popup,
    POPUP_TYPE,
    POPUP_RESULT,
} from '../../../../popup.js';
import { SlashCommandParser } from '../../../../slash-commands/SlashCommandParser.js';
import { SlashCommand } from '../../../../slash-commands/SlashCommand.js';
import {
    createDebugLogger,
    toast,
    buildContextPreamble,
    createLoreBookPicker,
    streamingGenerate,
    withSingleLineDisabled,
    applyTemplateMacros,
    stripPrefillEcho,
    showPromptPreview,
} from './utils.js';
import {
    abortAllGenerations,
    isSilentGenerationAbort,
} from './silent-generation.js';

// ─── Default Prompts ───

// {{context}} and {{guidance}} are this extension's placeholders (substituted
// by applyTemplateMacros, not ST's macro engine). If a placeholder is
// removed, the block is prepended/appended automatically.

// Default template — targets Krea 2, which is prompted with natural-language
// prose (no tag lists): long, detailed, front-loaded descriptions following
// subject → action → environment → composition → lighting → mood → style.
export const DEFAULT_IMAGE_PROMPT_PROMPT = `{{context}}Role:
You are an expert prompt writer for text-to-image diffusion models. Read the roleplay scene above and write a single image-generation prompt that captures the current moment of the story — the latest, most visually striking beat — as one standalone image.

Target model: Krea 2. Krea 2 is prompted with natural language, not tag lists, and long detailed prompts yield the best results.

Prompt-writing rules:
- Write flowing, descriptive prose — complete sentences forming one coherent paragraph (or two short ones). Never use comma-separated keyword lists, tag soup, or prompt weights.
- Order carries emphasis: whatever comes first reads as the subject of the image, so open with the main subject and what they are doing.
- Cover, in roughly this order: subject and action → other characters and their positions → environment and setting → composition and camera framing (e.g. close-up, low angle, over-the-shoulder) → lighting → mood and atmosphere → artistic medium or style (e.g. cinematic photograph, digital painting, anime key visual — pick what fits the scene).
- Be specific and concrete: name colors, materials, textures, light sources, and spatial relationships instead of vague adjectives.
- Describe characters entirely by their visible appearance (hair, eyes, build, clothing, expression, pose). The image model knows nothing about the story — never rely on names alone or refer to prior events.
- Depict a single frozen moment. No sequence of events ("then", "after"), no dialogue, no sounds, no inner thoughts — only what a camera would capture.
- If words must be legible inside the image (a sign, a screen, a label), put those exact words in "double quotes". Otherwise include no quoted text.
- Output only the image prompt itself — no preamble, no commentary, no headings, no surrounding quotation marks, no negative prompt.`;

export const DEFAULT_IMAGE_PROMPT_PREFILL = '';

// Seeded preset — targets Circlestone Labs' Anima (Base), which accepts
// Danbooru tags, natural language, or both; the mixed style (a tag block
// followed by a short prose passage) plays to its training. Tag block
// ordering and the quality/score prefix follow the model card.
export const ANIMA_IMAGE_PROMPT_PROMPT = `{{context}}Role:
You are an expert prompt writer for text-to-image diffusion models. Read the roleplay scene above and write a single image-generation prompt that captures the current moment of the story — the latest, most visually striking beat — as one standalone image.

Target model: Anima (Circlestone Labs Anima Base). Anima accepts Danbooru-style tags, natural language, or a mix; use the mixed style — a tag block first, then a short natural-language passage.

Prompt-writing rules:
- Your reply is prefilled with the quality tags ("masterpiece, best quality, score_7, "). Continue the tag block from there — never repeat the prefill.
- Tag block, comma-separated, in this order: content rating tag (safe / sensitive / nsfw / explicit — match the scene), character count (1girl, 1boy, 2girls, ...), then general Danbooru tags for appearance, clothing, pose, expression, setting, and framing.
- Tags are lowercase and use spaces instead of underscores (score tags like score_7 are the only underscore exception).
- Only tag a character by name if they are a well-known franchise character the model would recognize, and still tag their basic appearance to avoid confusion. Original roleplay characters get appearance tags only — the model does not know their names.
- Not every possible tag is needed — pick the tags that matter most for this shot.
- After the tag block, write a natural-language passage of at least two sentences describing the scene: who is where, what they are doing, the environment, the lighting, and the mood. Use normal capitalization for names in this passage.
- Depict a single frozen moment — only what a camera would capture. No sequence of events, no dialogue, no inner thoughts.
- Output only the image prompt itself (tag block + passage) — no preamble, no commentary, no headings, no negative prompt.`;

export const ANIMA_IMAGE_PROMPT_PREFILL = 'masterpiece, best quality, score_7, ';

// Seeded preset — pure Danbooru tag list for booru-trained anime models
// (Illustrious, NoobAI, Pony derivatives, etc.).
export const DANBOORU_IMAGE_PROMPT_PROMPT = `{{context}}Role:
You are an expert prompt writer for text-to-image diffusion models. Read the roleplay scene above and write a single image-generation prompt that captures the current moment of the story — the latest, most visually striking beat — as one standalone image.

Target style: pure Danbooru tags, for anime-style diffusion models trained on booru tag captions. The entire prompt is one comma-separated tag list — no sentences, no prose.

Prompt-writing rules:
- Your reply is prefilled with the quality tags ("masterpiece, best quality, "). Continue the tag list from there — never repeat the prefill.
- Order the tags: content rating (safe / sensitive / nsfw / explicit — match the scene) → character count (1girl, 1boy, 2girls, solo, ...) → character appearance (hair length, color, and style; eye color; body type) → clothing and accessories → pose and action → expression → setting and background → composition and framing (cowboy shot, close-up, from above, looking at viewer, ...) → lighting and atmosphere.
- Tags are lowercase and use spaces instead of underscores.
- Prefer established Danbooru tags over invented phrases.
- Only tag a character by name if they are a well-known franchise character the model would recognize; original roleplay characters are described purely by appearance tags — the model does not know their names.
- Capture a single frozen moment — only what a camera would capture.
- Output only the tag list — no preamble, no commentary, no sentences, no negative prompt.`;

export const DANBOORU_IMAGE_PROMPT_PREFILL = 'masterpiece, best quality, ';

const IP_GENERATE_SYSTEM_PROMPT =
    'You are an image-prompt engineering assistant. Follow the instructions and target '
    + 'prompt style in the prompt exactly. Output only the image-generation prompt — '
    + 'no preamble, no commentary.';

const IP_CONTINUE_SYSTEM_PROMPT =
    'You are an image-prompt engineering assistant. Continue the existing image-generation '
    + 'prompt seamlessly in the same style. Output only the continuation — no headers, '
    + 'no meta-commentary, no repetition of prior text.';

export const DEFAULT_IMAGE_PROMPT_RESPONSE_LENGTH = 500;

// ─── Built-in Presets ───

// Seeded once into settings.toolPresets['image-prompt'] so the alternate
// diffusion-model targets ship ready to select. The Default preset entry
// (built-in) already covers Krea 2; these add the tag-based styles. Users
// can edit, rename, or delete them like any saved preset — the seed flag
// keeps deleted ones from coming back.
const BUILTIN_IMAGE_PROMPT_PRESETS = {
    'Anima (Tags + Prose)': {
        imagePromptPrompt: ANIMA_IMAGE_PROMPT_PROMPT,
        imagePromptPrefill: ANIMA_IMAGE_PROMPT_PREFILL,
    },
    'Danbooru Tags': {
        imagePromptPrompt: DANBOORU_IMAGE_PROMPT_PROMPT,
        imagePromptPrefill: DANBOORU_IMAGE_PROMPT_PREFILL,
    },
};

/**
 * Seed the built-in Anima / Danbooru presets into the tool-preset store.
 * Runs after migrateLegacyToolPresets so `toolPresets` exists. One-shot:
 * a settings flag records the seeding so user deletions stick.
 *
 * @param {object} settings - Shared mutable settings reference.
 * @returns {boolean} `true` if anything changed (caller should save settings).
 */
export function seedImagePromptPresets(settings) {
    if (settings.imagePromptPresetsSeeded) return false;
    if (!settings.toolPresets || typeof settings.toolPresets !== 'object') settings.toolPresets = {};
    if (!settings.activeToolPreset || typeof settings.activeToolPreset !== 'object') settings.activeToolPreset = {};
    const presets = settings.toolPresets['image-prompt']
        || (settings.toolPresets['image-prompt'] = {});
    for (const [name, preset] of Object.entries(BUILTIN_IMAGE_PROMPT_PRESETS)) {
        if (presets[name] === undefined) presets[name] = { ...preset };
    }
    if (!settings.activeToolPreset['image-prompt']) {
        settings.activeToolPreset['image-prompt'] = '__default__';
    }
    settings.imagePromptPresetsSeeded = true;
    return true;
}

// ─── Module State ───

let moduleSettings = null;
let saveSettingsFn = null;
let debug = () => {};

let isGenerating = false;
let abortRequested = false;
let activeAction = null;       // which button initiated the current generation
let lastAction = null;         // 'generate' | 'continue' — what Retry should redo
let restorePoint = null;       // textarea snapshot used by Retry

// Modal contents are remembered across open/close so the user doesn't lose
// their generated prompt, guidance, or context-toggle selections. Cleared
// only via the explicit Clear buttons inside the modal. Chat context
// defaults ON — reading the current conversation is the tool's whole point.
const persistedModalState = {
    guidance: '',
    output: '',
    useChatContext: true,
    selectedLoreBooks: [],
    responseLength: null, // null means "use saved setting"
};

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

// ─── Settings Bindings ───

/**
 * Bind Image Prompting settings panel controls. Called after settings HTML
 * is injected.
 * @param {function} saveSettings
 */
export function bindImagePromptSettings(saveSettings) {
    const enabledCb = document.getElementById('image_prompt_enabled');
    if (enabledCb) {
        enabledCb.checked = moduleSettings.imagePromptEnabled;
        enabledCb.addEventListener('change', () => {
            moduleSettings.imagePromptEnabled = enabledCb.checked;
            saveSettings();
        });
    }

    const debugCb = document.getElementById('image_prompt_debug_mode');
    if (debugCb) {
        debugCb.checked = moduleSettings.imagePromptDebugMode;
        debugCb.addEventListener('change', () => {
            moduleSettings.imagePromptDebugMode = debugCb.checked;
            saveSettings();
        });
    }

    const maxContextInput = document.getElementById('image_prompt_max_context_override');
    if (maxContextInput) {
        maxContextInput.value = moduleSettings.imagePromptMaxContextOverride || 0;
        maxContextInput.addEventListener('input', () => {
            const n = parseInt(maxContextInput.value, 10);
            moduleSettings.imagePromptMaxContextOverride = Number.isFinite(n) && n > 0 ? n : 0;
            saveSettings();
        });
    }

    const promptArea = document.getElementById('image_prompt_prompt_textarea');
    if (promptArea) {
        promptArea.value = moduleSettings.imagePromptPrompt || DEFAULT_IMAGE_PROMPT_PROMPT;
        promptArea.addEventListener('input', () => {
            moduleSettings.imagePromptPrompt = promptArea.value;
            saveSettings();
        });
    }

    const prefillArea = document.getElementById('image_prompt_prefill_textarea');
    if (prefillArea) {
        prefillArea.value = (typeof moduleSettings.imagePromptPrefill === 'string')
            ? moduleSettings.imagePromptPrefill
            : DEFAULT_IMAGE_PROMPT_PREFILL;
        prefillArea.addEventListener('input', () => {
            moduleSettings.imagePromptPrefill = prefillArea.value;
            saveSettings();
        });
    }

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
let activeBody = null;

async function openImagePromptModal() {
    if (activePopup) return;
    if (!moduleSettings?.imagePromptEnabled) {
        toast('Image Prompting is disabled. Enable it in the extension settings first.', 'warning');
        return;
    }

    isGenerating = false;
    abortRequested = false;
    activeAction = null;
    // lastAction / restorePoint are retry-only state and don't need to
    // persist across modal sessions.
    lastAction = null;
    restorePoint = null;

    const body = buildModalBody();

    const popup = new Popup(body, POPUP_TYPE.TEXT, '', {
        okButton: 'Copy & Close',
        cancelButton: 'Close',
        wide: true,
        large: true,
        allowVerticalScrolling: true,
        onOpen: () => {
            bindModalHandlers();
            refreshActionButtonStates();
            debug('Modal opened');
        },
        onClosing: (p) => {
            if (p.result === POPUP_RESULT.AFFIRMATIVE) {
                // Copy & Close clicked — refuse to close mid-generation.
                if (isGenerating) {
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
            if (isGenerating) {
                abortRequested = true;
                stopGeneration();
            }
            return true;
        },
    });
    activePopup = popup;
    activeBody = body;

    try {
        const result = await popup.show();
        if (result === POPUP_RESULT.AFFIRMATIVE) {
            const output = body.querySelector('#ip_prompt_output')?.value?.trim() || '';
            await copyToClipboard(output);
        }
    } finally {
        capturePersistedModalState(body);
        activePopup = null;
        activeBody = null;
        isGenerating = false;
        activeAction = null;
        lastAction = null;
        restorePoint = null;
        debug('Modal closed');
    }
}

function capturePersistedModalState(body) {
    if (!body) return;
    persistedModalState.guidance = body.querySelector('#ip_guidance')?.value || '';
    persistedModalState.output = body.querySelector('#ip_prompt_output')?.value || '';
    persistedModalState.useChatContext = !!body.querySelector('#ip_use_chat_context')?.checked;
    const picker = body._ipLorebookPicker;
    persistedModalState.selectedLoreBooks = picker ? picker.getSelected() : [];
    const tokenInput = body.querySelector('#ip_response_length');
    const parsed = tokenInput ? parseInt(tokenInput.value, 10) : NaN;
    persistedModalState.responseLength = (!isNaN(parsed) && parsed > 0) ? parsed : null;
}

function buildModalBody() {
    const root = document.createElement('div');
    root.className = 'ip-modal-body';
    root.innerHTML = `
        <div class="ip-context-section">
            <label class="checkbox_label" title="Read the current chat, character cards, and persona to describe the present moment">
                <input id="ip_use_chat_context" type="checkbox" />
                <span>Use Chat Context</span>
            </label>
            <div class="ip-lorebook-host"></div>
        </div>
        <div class="ip-guidance-section">
            <div class="ip-field-header">
                <label for="ip_guidance"><b>Guidance (optional):</b></label>
                <div id="ip_clear_guidance_btn" class="menu_button interactable ip-clear-btn" title="Clear the guidance">
                    <span class="fa-solid fa-eraser"></span> Clear
                </div>
            </div>
            <textarea id="ip_guidance" class="text_pole" rows="3" placeholder="Optional extra direction: what to focus on, camera angle, art style, details to emphasize..."></textarea>
        </div>
        <div class="ip-action-row">
            <div id="ip_generate_btn" class="menu_button interactable ip-action-btn ip-generate-btn" title="Generate a fresh image prompt from the scene (replaces the textarea)">
                <span class="fa-solid fa-wand-magic-sparkles"></span> Generate
            </div>
            <div id="ip_continue_btn" class="menu_button interactable ip-action-btn" title="Continue from where the image prompt leaves off">
                <span class="fa-solid fa-arrow-right"></span> Continue
            </div>
            <div id="ip_checkpoint_btn" class="menu_button interactable ip-action-btn" title="Save the current image prompt as the Retry restore point">
                <span class="fa-solid fa-flag"></span> Checkpoint
            </div>
            <div id="ip_retry_btn" class="menu_button interactable ip-action-btn" title="Restore to the last snapshot and re-run the last action">
                <span class="fa-solid fa-rotate-right"></span> Retry
            </div>
        </div>
        <div class="ip-tokens-row">
            <label class="ip-tokens-label" for="ip_response_length" title="Maximum tokens for each generation">
                <span class="fa-solid fa-coins"></span> Max Tokens:
            </label>
            <input id="ip_response_length" type="number" class="text_pole ip-tokens-input" min="50" max="8192" step="50" />
        </div>
        <div class="ip-status-bar ip-hidden" id="ip_status_bar">
            <span class="fa-solid fa-spinner fa-spin"></span>
            <span id="ip_status_text"></span>
        </div>
        <div class="ip-output-section">
            <div class="ip-field-header">
                <label for="ip_prompt_output"><b>Image Prompt:</b></label>
                <div class="ip-field-header-buttons">
                    <div id="ip_copy_output_btn" class="menu_button interactable ip-clear-btn" title="Copy the image prompt to the clipboard">
                        <span class="fa-solid fa-copy"></span> Copy
                    </div>
                    <div id="ip_clear_output_btn" class="menu_button interactable ip-clear-btn" title="Clear the generated image prompt">
                        <span class="fa-solid fa-eraser"></span> Clear
                    </div>
                </div>
            </div>
            <textarea id="ip_prompt_output" class="text_pole ip-prompt-output" rows="14" placeholder="The generated image prompt will appear here. Edit it freely, then copy it into ComfyUI or your image tool."></textarea>
        </div>
    `;

    // Hydrate the persisted-across-opens fields.
    const guidanceEl = root.querySelector('#ip_guidance');
    if (guidanceEl) guidanceEl.value = persistedModalState.guidance || '';
    const outputEl = root.querySelector('#ip_prompt_output');
    if (outputEl) outputEl.value = persistedModalState.output || '';
    const chatCb = root.querySelector('#ip_use_chat_context');
    if (chatCb) chatCb.checked = !!persistedModalState.useChatContext;

    // Initialize the token field from persisted state if available, else
    // from settings.
    const tokenInput = root.querySelector('#ip_response_length');
    if (tokenInput) {
        const persisted = persistedModalState.responseLength;
        tokenInput.value = String((typeof persisted === 'number' && persisted > 0)
            ? persisted
            : getResponseLength());
    }

    // Mount the shared lore-book picker with previously-selected entries.
    const picker = createLoreBookPicker({
        classPrefix: 'ip-lorebook',
        initialSelection: Array.isArray(persistedModalState.selectedLoreBooks)
            ? persistedModalState.selectedLoreBooks.slice()
            : [],
    });
    root.querySelector('.ip-lorebook-host').replaceWith(picker.element);
    root._ipLorebookPicker = picker;

    return root;
}

function bindModalHandlers() {
    document.getElementById('ip_generate_btn')?.addEventListener('click', handleGenerate);
    document.getElementById('ip_continue_btn')?.addEventListener('click', handleContinue);
    document.getElementById('ip_checkpoint_btn')?.addEventListener('click', handleCheckpoint);
    document.getElementById('ip_retry_btn')?.addEventListener('click', handleRetry);

    const output = document.getElementById('ip_prompt_output');
    output?.addEventListener('input', refreshActionButtonStates);

    const tokenInput = document.getElementById('ip_response_length');
    tokenInput?.addEventListener('change', () => {
        const parsed = parseInt(tokenInput.value, 10);
        if (!isNaN(parsed) && parsed > 0) {
            moduleSettings.imagePromptResponseLength = parsed;
            saveSettingsFn?.();
        }
    });

    document.getElementById('ip_copy_output_btn')?.addEventListener('click', () => {
        if (isGenerating) return;
        const out = document.getElementById('ip_prompt_output');
        const text = out?.value?.trim() || '';
        if (!text) {
            toast('Image prompt is empty. Nothing to copy.', 'warning');
            return;
        }
        copyToClipboard(text);
    });
    document.getElementById('ip_clear_guidance_btn')?.addEventListener('click', () => {
        if (isGenerating) return;
        const guidance = document.getElementById('ip_guidance');
        if (!guidance) return;
        guidance.value = '';
        guidance.focus();
    });
    document.getElementById('ip_clear_output_btn')?.addEventListener('click', () => {
        if (isGenerating) return;
        const out = document.getElementById('ip_prompt_output');
        if (!out) return;
        out.value = '';
        // Clearing the output invalidates the existing Retry restore point
        // so the user doesn't accidentally restore an unrelated prompt.
        restorePoint = null;
        lastAction = null;
        out.focus();
        refreshActionButtonStates();
    });
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        toast('Image prompt copied to clipboard!', 'success');
        return;
    } catch (err) {
        debug('navigator.clipboard failed, falling back to execCommand:', err);
    }
    // Fallback for insecure contexts (e.g. ST served over plain http).
    try {
        const helper = document.createElement('textarea');
        helper.value = text;
        helper.style.position = 'fixed';
        helper.style.opacity = '0';
        document.body.appendChild(helper);
        helper.focus();
        helper.select();
        const ok = document.execCommand('copy');
        helper.remove();
        if (!ok) throw new Error('execCommand copy returned false');
        toast('Image prompt copied to clipboard!', 'success');
    } catch (err) {
        console.error('Image Prompting: clipboard copy failed:', err);
        toast('Could not copy to the clipboard — select the text and copy it manually.', 'error');
    }
}

// ─── Actions ───

function readModalContextOptions() {
    const includeChat = !!document.getElementById('ip_use_chat_context')?.checked;
    const picker = activeBody?._ipLorebookPicker;
    const loreBookNames = picker ? picker.getSelected() : [];
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

    const guidance = document.getElementById('ip_guidance')?.value?.trim() || '';
    const ctxOptions = readModalContextOptions();
    if (!ctxOptions.includeChat && !ctxOptions.loreBookNames.length && !guidance) {
        toast('Nothing to work from — enable Use Chat Context, select a lore book, or enter Guidance.', 'warning');
        return;
    }

    const output = document.getElementById('ip_prompt_output');
    restorePoint = output?.value || '';
    await runGeneration('generate', guidance);
}

async function handleContinue() {
    if (isGenerating) {
        if (activeAction === 'continue') {
            abortRequested = true;
            stopGeneration();
        }
        return;
    }

    const output = document.getElementById('ip_prompt_output');
    const existing = output?.value || '';
    if (!existing.trim()) {
        toast('Nothing to continue from. Generate an image prompt first or type some text.', 'warning');
        return;
    }

    const guidance = document.getElementById('ip_guidance')?.value?.trim() || '';
    restorePoint = existing;
    await runGeneration('continue', guidance);
}

function handleCheckpoint() {
    if (isGenerating) return;
    const output = document.getElementById('ip_prompt_output');
    const current = output?.value || '';
    if (!current.trim()) {
        toast('Nothing to checkpoint — the image prompt is empty.', 'warning');
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

    const guidance = document.getElementById('ip_guidance')?.value?.trim() || '';
    if (lastAction === 'continue' && !restorePoint.trim()) {
        toast('Cannot continue from an empty restore point.', 'warning');
        return;
    }

    const output = document.getElementById('ip_prompt_output');
    if (output) output.value = restorePoint;
    await runGeneration(lastAction, guidance);
}

async function runGeneration(action, guidance) {
    isGenerating = true;
    abortRequested = false;
    activeAction = action;

    const isContinue = action === 'continue';
    setGeneratingUI(true, action);
    setStatusBar(isContinue ? 'Continuing image prompt...' : 'Generating image prompt...');

    try {
        const ctxOptions = readModalContextOptions();
        const output = document.getElementById('ip_prompt_output');
        const existing = output?.value || '';

        const result = isContinue
            ? await generateContinuation(guidance, existing, ctxOptions)
            : await generateImagePrompt(guidance, ctxOptions);

        if (abortRequested) {
            debug(`${action} aborted, discarding result; keeping the streamed partial`);
            // Leave the streamed partial in the field so the user can edit it
            // and Continue from there.
            if (output?.value?.trim()) lastAction = action;
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
            debug(`${action} aborted via cancellation; keeping the streamed partial`);
            const out = document.getElementById('ip_prompt_output');
            if (out?.value?.trim()) lastAction = action;
        } else if (!abortRequested) {
            console.error('Image Prompting generation error:', err);
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

async function generateImagePrompt(guidance, ctxOptions) {
    const preambleBlock = await buildPreambleBlock(ctxOptions);
    const prompt = composeGeneratePrompt(preambleBlock, guidance);
    const systemPrompt = IP_GENERATE_SYSTEM_PROMPT;
    const responseLength = getResponseLength();
    const prefill = getPrefill();

    debug('Generating with guidance length', guidance.length, 'tokens', responseLength);
    debug('System prompt:', systemPrompt);
    debug('Prompt:', prompt);
    debug('Prefill:', prefill);

    const outputEl = document.getElementById('ip_prompt_output');
    const result = await withSingleLineDisabled(() => streamingGenerate(
        { prompt, systemPrompt, responseLength, ...(prefill ? { prefill } : {}) },
        outputEl,
        { append: false, name: 'image-prompt' },
    ));
    // Backends that ignore the assistant prefix may re-emit the prefill;
    // strip the echo so prepending it doesn't double the opening.
    const cleaned = stripPrefillEcho(removeReasoningFromString(result).trim(), prefill);
    return (prefill || '') + cleaned;
}

async function generateContinuation(guidance, existing, ctxOptions) {
    const preambleBlock = await buildPreambleBlock(ctxOptions);
    const prompt = composeContinuePrompt(preambleBlock, guidance);
    const systemPrompt = IP_CONTINUE_SYSTEM_PROMPT;
    const responseLength = getResponseLength();

    debug('Continuing with existing length', existing.length, 'tokens', responseLength);
    debug('System prompt:', systemPrompt);
    debug('Prompt:', prompt);

    const outputEl = document.getElementById('ip_prompt_output');
    // The prompt-so-far is the assistant prefill, so the model continues from
    // its exact end; strip any prefill echo to keep only the new tail.
    const result = await withSingleLineDisabled(() => streamingGenerate(
        { prompt, systemPrompt, responseLength, ...(existing ? { prefill: existing } : {}) },
        outputEl,
        { append: true, name: 'image-prompt-continue' },
    ));
    return stripPrefillEcho(removeReasoningFromString(result).trim(), existing);
}

function getPromptTemplate() {
    const stored = moduleSettings?.imagePromptPrompt;
    return (typeof stored === 'string' && stored.trim()) ? stored : DEFAULT_IMAGE_PROMPT_PROMPT;
}

function getPrefill() {
    const stored = moduleSettings?.imagePromptPrefill;
    return (typeof stored === 'string') ? stored : DEFAULT_IMAGE_PROMPT_PREFILL;
}

function getResponseLength() {
    const input = document.getElementById('ip_response_length');
    if (input) {
        const parsed = parseInt(input.value, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    const setting = moduleSettings?.imagePromptResponseLength;
    if (typeof setting === 'number' && setting > 0) return setting;
    return DEFAULT_IMAGE_PROMPT_RESPONSE_LENGTH;
}

async function buildPreambleBlock(ctxOptions) {
    if (!ctxOptions) return '';
    if (!ctxOptions.includeChat && !(ctxOptions.loreBookNames && ctxOptions.loreBookNames.length)) return '';
    const preamble = await buildContextPreamble({
        ...ctxOptions,
        responseLength: getResponseLength(),
        maxContextOverride: moduleSettings?.imagePromptMaxContextOverride || 0,
    });
    if (!preamble) return '';
    debug('Context preamble length:', preamble.length);
    return `Scene to visualize (the roleplay chat, characters, and selected lore):\n${preamble}\n\n`;
}

function stopGeneration() {
    // Route through abortAllGenerations() so that ST's GENERATION_STOPPED
    // event also fires and the backend fetch is actually cancelled — see
    // the silent-generation module for the full rationale.
    abortAllGenerations('image-prompt-cancel');
    debug('Stop generation triggered');
}

// ─── UI Helpers ───

const ACTION_BUTTON_IDS = ['ip_generate_btn', 'ip_continue_btn', 'ip_checkpoint_btn', 'ip_retry_btn'];

const ACTION_LABELS = {
    ip_generate_btn: '<span class="fa-solid fa-wand-magic-sparkles"></span> Generate',
    ip_continue_btn: '<span class="fa-solid fa-arrow-right"></span> Continue',
    ip_checkpoint_btn: '<span class="fa-solid fa-flag"></span> Checkpoint',
    ip_retry_btn: '<span class="fa-solid fa-rotate-right"></span> Retry',
};

function setGeneratingUI(generating, action) {
    const guidanceInput = document.getElementById('ip_guidance');
    const activeBtnId = action === 'continue' ? 'ip_continue_btn' : 'ip_generate_btn';

    for (const id of ACTION_BUTTON_IDS) {
        const btn = document.getElementById(id);
        if (!btn) continue;
        if (generating) {
            if (id === activeBtnId) {
                btn.innerHTML = '<span class="fa-solid fa-stop"></span> Stop';
                btn.classList.remove('ip-disabled');
            } else {
                btn.innerHTML = ACTION_LABELS[id];
                btn.classList.add('ip-disabled');
            }
        } else {
            btn.innerHTML = ACTION_LABELS[id];
            btn.classList.remove('ip-disabled');
        }
    }

    // Popup owns the OK/Cancel buttons; toggle the OK button visually so
    // users get a clear "wait for generation" hint. The onClosing guard
    // still blocks the close if they click it mid-flight.
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
    const output = document.getElementById('ip_prompt_output');
    const hasText = !!output?.value?.trim();

    setButtonDisabled('ip_continue_btn', !hasText);
    setButtonDisabled('ip_checkpoint_btn', !hasText);
    setButtonDisabled('ip_retry_btn', !lastAction || restorePoint === null);
}

function setButtonDisabled(id, disabled) {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (disabled) btn.classList.add('ip-disabled');
    else btn.classList.remove('ip-disabled');
}

function setStatusBar(message) {
    const bar = document.getElementById('ip_status_bar');
    const text = document.getElementById('ip_status_text');
    if (!bar || !text) return;
    if (message) {
        text.textContent = message;
        bar.classList.remove('ip-hidden');
    } else {
        bar.classList.add('ip-hidden');
    }
}
