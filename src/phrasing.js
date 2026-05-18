/**
 * Phrasing module — enriches messages with AI-generated narration via
 * prompt injection + impersonate/swipe flows.
 */

import { SlashCommandParser } from '../../../../slash-commands/SlashCommandParser.js';
import { SlashCommand } from '../../../../slash-commands/SlashCommand.js';
import { ARGUMENT_TYPE, SlashCommandArgument } from '../../../../slash-commands/SlashCommandArgument.js';
import {
    setExtensionPrompt,
    extension_prompt_types,
    extension_prompt_roles,
    substituteParamsExtended,
} from '../../../../../script.js';
import {
    getContext,
    createDebugLogger,
    confirmActiveMessageEdit,
    getEditingMessageIndex,
    waitForGenerationEnd,
} from './utils.js';
import { setupPromptTemplates } from './prompt-templates.js';

// ─── Constants ───

const PHRASING_INJECTION_KEY = 'phrasing_instruction';
const PHRASING_SEED_EXTRA_KEY = 'phrasing_seed';

export const DEFAULT_PHRASING_PROMPT = `[Rewrite the following message. Preserve its meaning, intent, and any dialogue, but enrich it with narration, action, and detail consistent with the character and the current scene. Do not continue the scene beyond what the original message describes.

{{phrasingSeed}}]`;

export const DEFAULT_PHRASING_INVERSE_PROMPT = `[Rewrite the following message in a way that is WILDLY DIFFERENT from every previous variation listed below. Vary the tone, pacing, structure, imagery, sentence length, and word choice — take a fundamentally different angle. Preserve the underlying meaning, intent, and any dialogue. Do not continue the scene beyond what the original message describes.

Previous variations to avoid resembling:
{{phrasingSwipes}}

Now produce a wildly different rewrite of:
{{phrasingSeed}}]`;

// ─── State ───

let phrasingActive = false;

/** @type {{ settings: object }} */
let ctx = null;

/** @type {{ isPossessing: function, getPossessedCharName: function, postPossessedMessage: function }} */
let possessionApi = null;

let debug = () => {};

// ─── Public Getters ───

export function isPhrasing() {
    return phrasingActive;
}

// ─── Prompt Management ───

function getActivePrompt() {
    return ctx.settings.phrasingPrompt || DEFAULT_PHRASING_PROMPT;
}

function getActiveInversePrompt() {
    return ctx.settings.phrasingInversePrompt || DEFAULT_PHRASING_INVERSE_PROMPT;
}

function formatSwipesContext(swipes, speakerName) {
    return swipes
        .map((swipe, i) => `Variation ${i + 1}:\n${speakerName}: ${swipe}`)
        .join('\n\n');
}

function formatSeedWithSpeaker(seedText, isUser, speakerName) {
    const context = getContext();
    let name;
    if (speakerName) {
        name = speakerName;
    } else if (isUser) {
        name = context.name1;
    } else {
        name = context.name2;
    }
    debug('formatSeedWithSpeaker — speaker:', name, '| isUser:', isUser);
    return `${name}: ${seedText}`;
}

function assemblePrompt(seedText, swipesContext = null) {
    const useInverse = !!swipesContext;
    debug('assemblePrompt — seed length:', seedText.length, '| mode:', useInverse ? 'inverse' : 'standard');
    const tpl = useInverse ? getActiveInversePrompt() : getActivePrompt();
    const macros = useInverse
        ? { phrasingSeed: seedText, phrasingSwipes: swipesContext }
        : { phrasingSeed: seedText };
    const prompt = substituteParamsExtended(tpl, macros);
    debug('assemblePrompt — final length:', prompt.length);
    return prompt;
}

// ─── Injection ───

function injectPhrasingPrompt(assembledPrompt) {
    debug('injectPhrasingPrompt — injecting at depth 0, SYSTEM role');
    setExtensionPrompt(
        PHRASING_INJECTION_KEY,
        assembledPrompt,
        extension_prompt_types.IN_CHAT,
        0,
        false,
        extension_prompt_roles.SYSTEM,
    );
}

export function clearPhrasingInjection() {
    debug('clearPhrasingInjection — removing injection');
    setExtensionPrompt(PHRASING_INJECTION_KEY, '', extension_prompt_types.NONE, 0);
}

/**
 * Called from the continue interceptor — reinjects the phrasing seed prompt
 * if the last message was rephrased.
 */
export function handlePhrasingSeedReinjection() {
    if (!ctx.settings.phrasingEnabled) return;

    const context = getContext();
    const lastIndex = context.chat.length - 1;
    if (lastIndex < 0) return;

    const message = context.chat[lastIndex];
    const storedPrompt = message?.extra?.[PHRASING_SEED_EXTRA_KEY];
    if (!storedPrompt) return;

    debug('Reinjecting phrasing seed for continue on message', lastIndex);
    injectPhrasingPrompt(storedPrompt);
}

// ─── Button Visibility ───

export function hideAllPhrasingButtons() {
    document.querySelectorAll('.phrasing-trigger').forEach(el => {
        el.classList.add('phrasing-hidden');
    });
}

export function showAllPhrasingButtons() {
    if (!ctx.settings.phrasingEnabled) return;
    document.querySelectorAll('.phrasing-trigger').forEach(el => {
        el.classList.remove('phrasing-hidden');
    });
}

export function applyPhrasingEnabledState() {
    if (ctx.settings.phrasingEnabled) {
        showAllPhrasingButtons();
    } else {
        hideAllPhrasingButtons();
    }
}

// ─── Primary Flow (Input Enrichment) ───

async function doPrimaryFlow(seedText) {
    debug('doPrimaryFlow — starting, seed length:', seedText.length);
    const context = getContext();

    if (context.isGenerating) {
        debug('doPrimaryFlow — ABORTED: generation in progress');
        return '';
    }

    phrasingActive = true;

    try {
        if (possessionApi?.isPossessing()) {
            debug('doPrimaryFlow — possessed path: posting message then swiping');

            const colonIndex = seedText.indexOf(': ');
            const rawText = colonIndex !== -1 ? seedText.substring(colonIndex + 2) : seedText;

            const messageIndex = await possessionApi.postPossessedMessage(rawText);
            if (messageIndex < 0) {
                debug('doPrimaryFlow — FAILED: could not post possessed message');
                return '';
            }

            await new Promise(resolve => setTimeout(resolve, 100));

            const result = await doSwipeMode(messageIndex);
            debug('doPrimaryFlow — possessed path complete, result length:', result.length);
            return result;
        } else {
            const assembled = assemblePrompt(seedText);
            injectPhrasingPrompt(assembled);

            debug('doPrimaryFlow — normal path: triggering /impersonate');
            const ended = waitForGenerationEnd();
            await context.executeSlashCommandsWithOptions('/impersonate');
            await ended;

            const textarea = document.getElementById('send_textarea');
            const result = textarea?.value?.trim() || '';
            debug('doPrimaryFlow — normal path complete, result length:', result.length);
            return result;
        }
    } finally {
        clearPhrasingInjection();
        phrasingActive = false;
        showAllPhrasingButtons();
        debug('doPrimaryFlow — cleanup complete');
    }
}

// ─── Swipe Mode ───

async function doSwipeMode(messageIndex) {
    debug('doSwipeMode — starting for message index:', messageIndex);
    const context = getContext();

    if (context.isGenerating) {
        debug('doSwipeMode — ABORTED: generation in progress');
        return '';
    }

    const message = context.chat[messageIndex];
    if (!message) {
        debug('doSwipeMode — ABORTED: no message at index', messageIndex);
        return '';
    }

    const rawSeedText = message.mes;
    if (!rawSeedText || !rawSeedText.trim()) {
        debug('doSwipeMode — ABORTED: message is empty');
        toastr.warning('Cannot rephrase an empty message.', 'Phrasing!');
        return '';
    }

    const seedText = formatSeedWithSpeaker(rawSeedText, message.is_user, message.name);
    debug('doSwipeMode — seed length:', seedText.length, '| speaker:', message.name);

    const wasAlreadyActive = phrasingActive;
    phrasingActive = true;

    try {
        if (!message.swipes || message.swipes.length === 0) {
            debug('doSwipeMode — initializing swipes array');
            message.swipes = [message.mes];
            message.swipe_id = 0;
            message.swipe_info = [{}];
        }

        let swipesContext = null;
        if (ctx.settings.phrasingInverseGuidance) {
            const speakerName = message.name || (message.is_user ? context.name1 : context.name2);
            swipesContext = formatSwipesContext(message.swipes, speakerName);
            debug('doSwipeMode — inverse guidance ON, swipes included:', message.swipes.length);
        }

        const assembled = assemblePrompt(seedText, swipesContext);
        injectPhrasingPrompt(assembled);

        if (!message.extra) message.extra = {};
        message.extra[PHRASING_SEED_EXTRA_KEY] = assembled;
        message.extra.overswipe_behavior = 'regenerate';

        const lastSwipeIndex = message.swipes.length - 1;
        if (message.swipe_id !== lastSwipeIndex) {
            debug('doSwipeMode — jumping to last swipe', lastSwipeIndex);
            message.swipe_id = lastSwipeIndex;
            message.mes = message.swipes[lastSwipeIndex];

            // Re-render the visible message text (no public helper for this).
            const messageEl = document.querySelector(`#chat .mes[mesid="${messageIndex}"]`);
            const textEl = messageEl?.querySelector('.mes_text');
            if (textEl && typeof context.messageFormatting === 'function') {
                textEl.innerHTML = context.messageFormatting(
                    message.mes, message.name, message.is_system, message.is_user, messageIndex,
                );
            } else if (textEl) {
                textEl.textContent = message.mes;
            }
            // refresh(true) re-renders chevrons AND swipe counters.
            context.swipe.refresh(true);
        }

        debug('doSwipeMode — triggering swipe right');
        // Install the GENERATION_ENDED listener before calling swipe.right
        // so we never miss the event if generation completes before the
        // swipe animation does.
        const ended = waitForGenerationEnd();
        await context.swipe.right(null, { message });
        const result = await ended;
        debug('doSwipeMode — complete, result length:', result.length);
        return result;
    } finally {
        clearPhrasingInjection();
        if (!wasAlreadyActive) {
            phrasingActive = false;
            showAllPhrasingButtons();
        }
        debug('doSwipeMode — cleanup complete');
    }
}

// ─── Button Handlers ───

async function onInputPhrasingClick() {
    debug('onInputPhrasingClick — triggered');
    if (!ctx.settings.phrasingEnabled) return;

    const context = getContext();
    if (context.isGenerating) return;

    hideAllPhrasingButtons();

    const textarea = document.getElementById('send_textarea');
    const inputText = textarea?.value?.trim();
    const editingIndex = getEditingMessageIndex();

    try {
        if (!inputText && editingIndex < 0) {
            debug('onInputPhrasingClick — empty input, no edit → rephrase last message');
            const lastIndex = context.chat.length - 1;
            if (lastIndex < 0) {
                toastr.warning('No messages to rephrase.', 'Phrasing!');
                return;
            }
            await doSwipeMode(lastIndex);
        } else if (editingIndex >= 0 && !inputText) {
            debug('onInputPhrasingClick — editing message at index', editingIndex, '→ confirm and rephrase');
            confirmActiveMessageEdit();
            await new Promise(resolve => setTimeout(resolve, 100));
            await doSwipeMode(editingIndex);
        } else {
            if (editingIndex >= 0) {
                debug('onInputPhrasingClick — confirming active edit before processing input');
                confirmActiveMessageEdit();
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            debug('onInputPhrasingClick — input text present, seed length:', inputText.length);
            textarea.value = '';
            textarea.dispatchEvent(new Event('input', { bubbles: true }));

            const formattedSeed = possessionApi?.isPossessing()
                ? formatSeedWithSpeaker(inputText, false, possessionApi.getPossessedCharName())
                : formatSeedWithSpeaker(inputText, true);

            await doPrimaryFlow(formattedSeed);
        }
    } finally {
        showAllPhrasingButtons();
    }
}

// ─── Generation Lifecycle ───

export function onGenerationStarted() {
    hideAllPhrasingButtons();
}

export function onGenerationEnded() {
    if (phrasingActive) {
        clearPhrasingInjection();
        phrasingActive = false;
    }
    showAllPhrasingButtons();
}

// ─── UI Creation ───

export function createInputAreaButton() {
    if (document.getElementById('phrasing_send_button')) return;

    const sendForm = document.getElementById('rightSendForm');
    if (!sendForm) return;

    const btn = document.createElement('div');
    btn.id = 'phrasing_send_button';
    btn.classList.add('phrasing-trigger', 'fa-solid', 'fa-pen-fancy', 'interactable');
    btn.title = 'Phrasing! — Enrich your message with AI narration';
    btn.addEventListener('click', onInputPhrasingClick);

    sendForm.appendChild(btn);
    debug('Created input area button');
}

export function createHamburgerMenuItem() {
    if (document.getElementById('phrasing_menu_button')) return;

    const impersonateBtn = document.getElementById('option_impersonate');
    if (!impersonateBtn) return;

    const btn = document.createElement('div');
    btn.id = 'phrasing_menu_button';
    btn.classList.add('phrasing-trigger', 'list-group-item', 'interactable');
    btn.innerHTML = '<span class="fa-solid fa-pen-fancy"></span> Phrasing!';
    btn.addEventListener('click', onInputPhrasingClick);

    impersonateBtn.parentNode.insertBefore(btn, impersonateBtn.nextSibling);
    debug('Created hamburger menu item');
}

// ─── Settings Panel ───

export function bindPhrasingSettings(saveSettings) {
    const phrasingEnabled = document.getElementById('phrasing_enabled');
    if (phrasingEnabled) {
        phrasingEnabled.checked = ctx.settings.phrasingEnabled;
        phrasingEnabled.addEventListener('change', (e) => {
            ctx.settings.phrasingEnabled = e.target.checked;
            saveSettings();
            applyPhrasingEnabledState();
        });
    }

    const phrasingDebugMode = document.getElementById('phrasing_debug_mode');
    if (phrasingDebugMode) {
        phrasingDebugMode.checked = ctx.settings.phrasingDebugMode;
        phrasingDebugMode.addEventListener('change', (e) => {
            ctx.settings.phrasingDebugMode = e.target.checked;
            saveSettings();
            debug('debugMode toggled to', ctx.settings.phrasingDebugMode);
        });
    }

    const phrasingInverseGuidance = document.getElementById('phrasing_inverse_guidance');
    if (phrasingInverseGuidance) {
        phrasingInverseGuidance.checked = ctx.settings.phrasingInverseGuidance;
        phrasingInverseGuidance.addEventListener('change', (e) => {
            ctx.settings.phrasingInverseGuidance = e.target.checked;
            saveSettings();
            debug('inverseGuidance toggled to', ctx.settings.phrasingInverseGuidance);
        });
    }

    const phrasingPromptArea = document.getElementById('phrasing_prompt_textarea');
    if (phrasingPromptArea) {
        phrasingPromptArea.value = ctx.settings.phrasingPrompt || DEFAULT_PHRASING_PROMPT;
        phrasingPromptArea.addEventListener('input', () => {
            ctx.settings.phrasingPrompt = phrasingPromptArea.value;
            saveSettings();
        });
    }

    const phrasingInverseArea = document.getElementById('phrasing_inverse_prompt_textarea');
    if (phrasingInverseArea) {
        phrasingInverseArea.value = ctx.settings.phrasingInversePrompt || DEFAULT_PHRASING_INVERSE_PROMPT;
        phrasingInverseArea.addEventListener('input', () => {
            ctx.settings.phrasingInversePrompt = phrasingInverseArea.value;
            saveSettings();
        });
    }

    setupPromptTemplates({
        promptKey: 'phrasingPrompt',
        defaultText: DEFAULT_PHRASING_PROMPT,
        textareaId: 'phrasing_prompt_textarea',
        containerId: 'phrasing_prompt_templates',
        settings: ctx.settings,
        saveSettings,
    });
    setupPromptTemplates({
        promptKey: 'phrasingInversePrompt',
        defaultText: DEFAULT_PHRASING_INVERSE_PROMPT,
        textareaId: 'phrasing_inverse_prompt_textarea',
        containerId: 'phrasing_inverse_prompt_templates',
        settings: ctx.settings,
        saveSettings,
    });
}

// ─── Slash Command ───

export function registerPhrasingSlashCommand() {
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'phrasing',
        callback: async (_namedArgs, unnamedArgs) => {
            debug('slashCommand /phrasing — invoked');
            if (!ctx.settings.phrasingEnabled) return '';

            const rawSeedText = unnamedArgs?.trim();

            if (rawSeedText) {
                const seedText = possessionApi?.isPossessing()
                    ? formatSeedWithSpeaker(rawSeedText, false, possessionApi.getPossessedCharName())
                    : formatSeedWithSpeaker(rawSeedText, true);
                return await doPrimaryFlow(seedText);
            } else {
                const context = getContext();
                const lastIndex = context.chat.length - 1;
                if (lastIndex < 0) {
                    toastr.warning('No messages to rephrase.', 'Phrasing!');
                    return '';
                }
                return await doSwipeMode(lastIndex);
            }
        },
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'Optional seed text to post and rephrase',
                typeList: [ARGUMENT_TYPE.STRING],
                isRequired: false,
            }),
        ],
        aliases: [],
        helpString: 'Enriches a message with AI narration. With text: generates enriched prose. Without text: rephrases the last message as a new swipe.',
    }));

    debug('Registered /phrasing slash command');
}

// ─── Init ───

/**
 * @param {object} options
 * @param {object} options.settings       - Shared mutable settings reference.
 * @param {object} options.possessionApi  - { isPossessing(), getPossessedCharName(), postPossessedMessage(text) }
 */
export function initPhrasing({ settings, possessionApi: pApi }) {
    ctx = { settings };
    possessionApi = pApi;
    debug = createDebugLogger('PHRASING', () => settings.phrasingDebugMode);
}
