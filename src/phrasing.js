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
    isGenerationInProgress,
    waitForGenerationEnd,
    showPromptPreview,
} from './utils.js';

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

// Auto Phrasing: true while an intercepted send is being rewritten. Both the
// re-entrancy guard for the interceptor and the pass-through flag for the
// programmatic re-send we fire once the rewrite lands.
let autoPhrasingBusy = false;

// Set when a generation is stopped by the user. Reset at the start of every
// Auto Phrasing run: a rewrite the user stopped is never sent automatically.
let autoPhrasingStopped = false;

/** @type {{ settings: object }} */
let ctx = null;

/** @type {{ isPossessing: function, getPossessedCharName: function, postPossessedMessage: function }} */
let possessionApi = null;

/** @type {{ runDirectorTurn: function }} */
let directorApi = null;

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

function assemblePrompt(seedText, swipesContext = null, options = {}) {
    const useInverse = !!swipesContext;
    debug('assemblePrompt — seed length:', seedText.length, '| mode:', options.promptTemplate ? 'custom template' : (useInverse ? 'inverse' : 'standard'));
    const tpl = options.promptTemplate || (useInverse ? getActiveInversePrompt() : getActivePrompt());
    const macros = {
        phrasingSeed: seedText,
        ...(useInverse ? { phrasingSwipes: swipesContext } : {}),
        ...(options.extraMacros || {}),
    };
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

// ─── Seed Storage (per swipe) ───

/**
 * Read the stored rephrase prompt for one swipe of a message.
 *
 * The seed is keyed per swipe (`swipe_info[id].phrasing_seed`) because only the
 * swipe a rephrase actually produced was written against that prompt — swiping
 * away from it must not carry the instruction along.
 *
 * Chats written before per-swipe keying stored a single seed on the message
 * itself. That value is only unambiguous when the message has no swipe history,
 * so it is used as a fallback in that case alone; on a legacy rephrased message
 * (always 2+ swipes) it is deliberately ignored rather than guessed at.
 *
 * @param {object} message - Chat message object.
 * @param {number} [swipeId] - Swipe to read; defaults to the active swipe.
 * @returns {string|null} The stored prompt, or null when this swipe has none.
 */
export function getPhrasingSeed(message, swipeId) {
    if (!message) return null;

    const id = swipeId ?? message.swipe_id ?? 0;
    const info = Array.isArray(message.swipe_info) ? message.swipe_info[id] : null;
    if (info?.[PHRASING_SEED_EXTRA_KEY]) return info[PHRASING_SEED_EXTRA_KEY];

    if (!Array.isArray(message.swipes) || message.swipes.length <= 1) {
        return message.extra?.[PHRASING_SEED_EXTRA_KEY] || null;
    }
    return null;
}

/**
 * Store the rephrase prompt against one swipe of a message. Pads `swipe_info`
 * so it stays parallel with `swipes` (ST and other tools index the two together).
 *
 * @param {object} message - Chat message object.
 * @param {number} [swipeId] - Swipe to stamp; defaults to the active swipe.
 * @param {string} assembledPrompt - The assembled prompt to store.
 */
export function setPhrasingSeed(message, swipeId, assembledPrompt) {
    if (!message || !assembledPrompt) return;

    const id = swipeId ?? message.swipe_id ?? 0;
    if (!Array.isArray(message.swipe_info)) message.swipe_info = [];
    const needed = Math.max(Array.isArray(message.swipes) ? message.swipes.length : 0, id + 1);
    while (message.swipe_info.length < needed) message.swipe_info.push({});
    if (!message.swipe_info[id]) message.swipe_info[id] = {};

    message.swipe_info[id][PHRASING_SEED_EXTRA_KEY] = assembledPrompt;
    debug('setPhrasingSeed — stored seed on swipe', id, '| length:', assembledPrompt.length);
}

/**
 * Called from the continue interceptors (native Continue, Retry Continue) —
 * reinjects the phrasing seed prompt if the last message's active swipe was
 * produced by a rephrase.
 */
export function handlePhrasingSeedReinjection() {
    if (!ctx.settings.phrasingEnabled) return;

    const context = getContext();
    const lastIndex = context.chat.length - 1;
    if (lastIndex < 0) return;

    const message = context.chat[lastIndex];
    const storedPrompt = getPhrasingSeed(message);
    if (!storedPrompt) return;

    debug('Reinjecting phrasing seed for continue on message', lastIndex, 'swipe', message.swipe_id ?? 0);
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

/**
 * @param {string} seedText
 * @param {object} [options]
 * @param {(index: number) => void} [options.onMessagePosted] - Called with the
 *   chat index once a possessed message has been posted, before it is rewritten.
 *   Lets callers tell "nothing happened" apart from "the message is in the chat
 *   but the rewrite did not finish".
 */
async function doPrimaryFlow(seedText, options = {}) {
    debug('doPrimaryFlow — starting, seed length:', seedText.length);
    const context = getContext();

    if (isGenerationInProgress()) {
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
            options.onMessagePosted?.(messageIndex);

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

/**
 * Persist a rephrase prompt against the message's active swipe. Re-resolves the
 * message from the live chat: the swipe generation may have replaced the array
 * entry we started with. A null/empty seed is a no-op (nothing to persist).
 */
async function stampSeedOnActiveSwipe(messageIndex, seed) {
    if (!seed) {
        debug('stampSeedOnActiveSwipe — no seed to stamp, skipping');
        return;
    }

    const context = getContext();
    const message = context.chat?.[messageIndex];
    if (!message) {
        debug('stampSeedOnActiveSwipe — message gone at index', messageIndex);
        return;
    }

    setPhrasingSeed(message, message.swipe_id, seed);
    await context.saveChat();
}

async function doSwipeMode(messageIndex, options = {}) {
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

    // Provenance of the text we're rephrasing, captured before the jump to the
    // last swipe below reassigns swipe_id (rawSeedText was read from the swipe
    // active on entry). A caller-supplied template inherits this swipe's seed
    // rather than storing its own — see the stamp after generation.
    const sourceSwipeId = message.swipe_id ?? 0;
    const inheritedSeed = getPhrasingSeed(message, sourceSwipeId);

    const wasAlreadyActive = phrasingActive;
    phrasingActive = true;

    try {
        if (!message.swipes || message.swipes.length === 0) {
            debug('doSwipeMode — initializing swipes array');
            message.swipes = [message.mes];
            message.swipe_id = 0;
            message.swipe_info = [{}];
        }

        // A caller-supplied template (e.g. Phrase Ban) carries its own
        // guidance, so Inverse Guidance doesn't apply on top of it.
        let swipesContext = null;
        if (!options.promptTemplate && ctx.settings.phrasingInverseGuidance) {
            const speakerName = message.name || (message.is_user ? context.name1 : context.name2);
            swipesContext = formatSwipesContext(message.swipes, speakerName);
            debug('doSwipeMode — inverse guidance ON, swipes included:', message.swipes.length);
        }

        const assembled = assemblePrompt(seedText, swipesContext, options);
        injectPhrasingPrompt(assembled);

        if (!message.extra) message.extra = {};
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

        // Stamp the seed on the swipe this run just produced. This has to happen
        // after generation — the swipe doesn't exist until then — and ST's own
        // post-generation save may already have run, so persist it.
        //
        // A caller-supplied template (Phrase Ban's ban-rewrite) is not the
        // user's rephrase guidance and must never become the seed a later
        // Continue reinjects. The produced swipe inherits the source swipe's
        // seed instead, so an earlier rephrase survives a ban rewrite — and a
        // ban rewrite of a never-rephrased message stamps nothing.
        const seedForSwipe = options.promptTemplate ? inheritedSeed : assembled;
        await stampSeedOnActiveSwipe(messageIndex, seedForSwipe);

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

// ─── External Rewrite API ───

/**
 * Rewrite a message as a new swipe using a caller-supplied prompt template
 * instead of the Phrasing templates. Used by Phrase Ban to force a rewrite
 * that avoids matched phrases. Same flow as a manual rephrase: the original
 * stays as a swipe and the injection is cleared when the generation ends.
 *
 * @param {number} messageIndex
 * @param {string} promptTemplate - Template using {{phrasingSeed}} plus any extra macros.
 * @param {Record<string, string>} [extraMacros] - Additional macro values for the template.
 * @returns {Promise<string>} The rewritten text, or '' if the rewrite did not run.
 */
export async function rewriteMessageWithTemplate(messageIndex, promptTemplate, extraMacros = {}) {
    return doSwipeMode(messageIndex, { promptTemplate, extraMacros });
}

// ─── Button Handlers ───

async function onInputPhrasingClick() {
    debug('onInputPhrasingClick — triggered');
    if (!ctx.settings.phrasingEnabled) return;

    const context = getContext();
    if (isGenerationInProgress()) return;

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

// ─── Auto Phrasing (Send Interception) ───

/**
 * Whether SillyTavern would send the message on a bare Enter. Mirrors the
 * host's own `shouldSendOnEnter()`, read off the context object so an older
 * host that doesn't expose it can't break the module import.
 */
function sendsOnEnter() {
    const context = getContext();
    if (typeof context.shouldSendOnEnter === 'function') {
        return !!context.shouldSendOnEnter();
    }
    // Fallback: the raw power-user setting (-1 disabled / 0 auto / 1 enabled).
    const mode = context.powerUserSettings?.send_on_enter;
    if (mode === -1) return false;
    if (mode === 0) {
        return typeof context.isMobile === 'function' ? !context.isMobile() : true;
    }
    return true;
}

/**
 * The pending input text if this send should be rewritten first, or `null` if
 * Auto Phrasing must keep its hands off and let SillyTavern send normally.
 *
 * @returns {string|null}
 */
function getAutoPhrasingInput() {
    if (!ctx.settings.phrasingEnabled || !ctx.settings.phrasingAutoEnabled) return null;
    // Our own re-send (and any rewrite still in flight) passes straight through.
    if (autoPhrasingBusy || phrasingActive) return null;
    if (isGenerationInProgress()) return null;

    const textarea = document.getElementById('send_textarea');
    const text = textarea?.value?.trim();
    // An empty send is the host's continue/regenerate path — nothing to rewrite.
    if (!text) return null;
    // Text typed into the chat box starting with "/" runs as a slash command.
    if (text.startsWith('/')) return null;
    // A message edit owns the input; let the host handle (and warn about) it.
    if (getEditingMessageIndex() >= 0) return null;

    const context = getContext();
    // Neither a character nor a group: impersonate has nothing to write as.
    if (context.characterId === undefined && !context.groupId) return null;

    return text;
}

/**
 * Rewrite the pending input, then complete the send the user asked for:
 * the enriched text is sent as a normal message, or — while possessing — the
 * rewritten message is already in the chat, so the reply is triggered instead.
 *
 * @param {string} inputText - The raw text taken from the chat box.
 */
async function runAutoPhrasing(inputText) {
    const textarea = document.getElementById('send_textarea');
    const possessing = !!possessionApi?.isPossessing();
    let posted = false;

    debug('runAutoPhrasing — starting, possessed:', possessing, '| input length:', inputText.length);

    autoPhrasingBusy = true;
    autoPhrasingStopped = false;
    hideAllPhrasingButtons();

    const setInput = (value) => {
        if (!textarea) return;
        textarea.value = value;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    };

    try {
        setInput('');

        const seedText = possessing
            ? formatSeedWithSpeaker(inputText, false, possessionApi.getPossessedCharName())
            : formatSeedWithSpeaker(inputText, true);

        const result = await doPrimaryFlow(seedText, {
            onMessagePosted: () => { posted = true; },
        });

        if (possessing) {
            if (!posted) {
                debug('runAutoPhrasing — nothing was posted, handing the text back');
                setInput(inputText);
                toastr.warning('Auto Phrasing could not post the message. Your text was left in the chat box.', 'Phrasing!');
                return;
            }
            if (autoPhrasingStopped) {
                debug('runAutoPhrasing — stopped by the user; reply not triggered');
                return;
            }
            await triggerReplyGeneration();
            return;
        }

        if (!result) {
            debug('runAutoPhrasing — rewrite produced nothing, handing the text back');
            setInput(inputText);
            if (!autoPhrasingStopped) {
                toastr.warning('Auto Phrasing produced nothing. Your text was left in the chat box.', 'Phrasing!');
            }
            return;
        }

        if (autoPhrasingStopped) {
            // Keep whatever was streamed before the stop, unsent, so it can be
            // edited and sent by hand.
            debug('runAutoPhrasing — stopped by the user; partial rewrite left in the chat box');
            return;
        }

        debug('runAutoPhrasing — sending rewrite, length:', result.length);
        submitCurrentInput();
    } catch (err) {
        console.error('[PHRASING] Auto Phrasing failed:', err);
        // Never swallow the user's message on an unexpected failure.
        if (!posted && !textarea?.value?.trim()) setInput(inputText);
        toastr.error('Auto Phrasing failed. See the console for details.', 'Phrasing!');
    } finally {
        autoPhrasingBusy = false;
        showAllPhrasingButtons();
        debug('runAutoPhrasing — complete');
    }
}

/**
 * Send whatever is in the chat box through the host's own send path. Called
 * while `autoPhrasingBusy` is still set, so the click passes our interceptor.
 */
function submitCurrentInput() {
    const sendButton = document.getElementById('send_but');
    if (!sendButton) {
        debug('submitCurrentInput — no send button found');
        return;
    }
    sendButton.click();
}

/**
 * Possessed sends post the message themselves, so the turn still needs the
 * reply the user expected from pressing Send.
 */
async function triggerReplyGeneration() {
    // In a group with the Director on, the next speaker is its call. `/trigger`
    // clears the input box and runs a plain group generation, so ST's Manual
    // reply order (which the Director puts the group in) picks a random member
    // silently — no roll, no confirm dialog. The possessed message was pushed
    // straight into the chat, so no MESSAGE_SENT fired and the Director's own
    // user-turn path never sees this turn; hand it over explicitly.
    if (await directorApi?.runDirectorTurn?.()) {
        debug('triggerReplyGeneration — turn handed to the Group Director');
        return;
    }

    const context = getContext();
    debug('triggerReplyGeneration — triggering the reply');
    await context.executeSlashCommandsWithOptions('/trigger');
}

/**
 * Intercepts the host's send affordances (button, Enter, Ctrl+Enter) so a
 * message is rewritten before it is sent. Mirrors Possession's Continue
 * interceptor: capture phase, so it runs ahead of SillyTavern's own handlers.
 */
export function attachAutoPhrasingInterceptor() {
    document.addEventListener('click', (event) => {
        if (!event.target.closest('#send_but')) return;

        const inputText = getAutoPhrasingInput();
        if (inputText === null) return;

        event.stopImmediatePropagation();
        event.preventDefault();

        debug('Intercepted send button for Auto Phrasing');
        runAutoPhrasing(inputText);
    }, { capture: true });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' || event.isComposing) return;
        // Shift+Enter is a newline; Alt+Enter is the host's Continue hotkey.
        if (event.shiftKey || event.altKey) return;
        // A popup owns the keyboard while it is open (the host skips its own
        // hotkeys too).
        if (document.querySelector('dialog[open]')) return;
        // Plain Enter only sends while the chat box has focus; Ctrl+Enter is a
        // global hotkey that sends whenever the box holds text.
        if (!event.ctrlKey && document.activeElement !== document.getElementById('send_textarea')) return;
        if (!sendsOnEnter()) return;

        const inputText = getAutoPhrasingInput();
        if (inputText === null) return;

        event.stopImmediatePropagation();
        event.preventDefault();

        debug('Intercepted Enter for Auto Phrasing');
        runAutoPhrasing(inputText);
    }, { capture: true });

    debug('Attached Auto Phrasing send interceptor');
}

// ─── Generation Lifecycle ───

export function onGenerationStarted() {
    hideAllPhrasingButtons();
}

export function onGenerationEnded() {
    // Always drop the injection — the generation that just ended has already
    // consumed it. The Continue seed-reinjection path injects while
    // phrasingActive is false, so a conditional clear would leave the rewrite
    // instruction stuck in the prompt for every subsequent generation.
    clearPhrasingInjection();
    phrasingActive = false;
    showAllPhrasingButtons();
}

export function onGenerationStopped() {
    // A rewrite the user stopped must never be auto-sent — runAutoPhrasing
    // reads this after its generation settles.
    autoPhrasingStopped = true;
    onGenerationEnded();
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

    const phrasingAutoEnabled = document.getElementById('phrasing_auto_enabled');
    if (phrasingAutoEnabled) {
        phrasingAutoEnabled.checked = ctx.settings.phrasingAutoEnabled;
        phrasingAutoEnabled.addEventListener('change', (e) => {
            ctx.settings.phrasingAutoEnabled = e.target.checked;
            saveSettings();
            debug('autoPhrasing toggled to', ctx.settings.phrasingAutoEnabled);
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

    document.getElementById('phrasing_preview_btn')
        ?.addEventListener('click', showPhrasingPromptPreview);
}

function showPhrasingPromptPreview() {
    const sampleSeed = 'User: (the message text being rephrased)';
    const sampleSwipes = formatSwipesContext(
        ['(first existing variation)', '(second existing variation)'],
        'User',
    );
    showPromptPreview('Phrasing! — Injection Preview', [
        {
            label: 'Standard injection (added to the chat prompt as a system message at depth 0 for the rephrase generation)',
            text: assemblePrompt(sampleSeed),
        },
        {
            label: 'Inverse Guidance injection (used instead when Inverse Guidance is on)',
            text: assemblePrompt(sampleSeed, sampleSwipes),
        },
    ]);
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
export function initPhrasing({ settings, possessionApi: pApi, directorApi: dApi }) {
    ctx = { settings };
    possessionApi = pApi;
    directorApi = dApi;
    debug = createDebugLogger('PHRASING', () => settings.phrasingDebugMode);
}
