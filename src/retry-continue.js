/**
 * Retry Continue module — adds a Retry button that snapshots a message
 * (checkpoint) and creates new swipes by continuing from that snapshot. Each
 * retry attempt becomes a separate swipe, so the user can browse results with
 * SillyTavern's native swipe arrows.
 *
 * It automates the workflow of editing a message to keep the good prefix,
 * deleting the bad tail, and hitting Continue. The snapshot is preserved across
 * generation-triggered edits via a lock flag, and persisted per-chat in
 * chatMetadata so it survives a page refresh.
 *
 * This module owns no LLM generation of its own — it drives ST's native
 * Continue (slash command / button). Its chat-level event handlers are exported
 * and merged into the central wiring in index.js.
 */

import { SlashCommandParser } from '../../../../slash-commands/SlashCommandParser.js';
import { SlashCommand } from '../../../../slash-commands/SlashCommand.js';
import {
    getContext,
    createDebugLogger,
    toast,
} from './utils.js';

// ─── Module State ───

let moduleSettings = null;
let debug = () => {};

// In-memory retry state (mirrored into chatMetadata.retryContinue).
let retryState = {
    active: false,
    messageId: null,
    snapshotText: '',
    retryCount: 0,
};

// Guard flag: when true, MESSAGE_EDITED will not overwrite the snapshot.
// This prevents continue/generation from silently updating the checkpoint.
let snapshotLocked = false;

// ─── Init ───

/**
 * @param {object} options
 * @param {object} options.settings - Shared mutable settings reference.
 */
export function initRetryContinue({ settings }) {
    moduleSettings = settings;
    debug = createDebugLogger('RETRY-CONTINUE', () => moduleSettings.retryDebugMode);
    debug('Module initialized');
}

// ─── Toast Helper ───

/** Toast gated on the per-tool "Show toast notifications" preference. */
function rcToast(message, type = 'info') {
    if (!moduleSettings?.retryShowToasts) return;
    toast(message, type);
}

// ─── State Persistence ───

function saveRetryState() {
    const context = getContext();
    if (!context.chatMetadata) {
        debug('saveRetryState: no chatMetadata, skipping');
        return;
    }
    debug('saveRetryState:', { active: retryState.active, messageId: retryState.messageId, retryCount: retryState.retryCount, snapshotLength: retryState.snapshotText.length });
    context.chatMetadata.retryContinue = {
        active: retryState.active,
        messageId: retryState.messageId,
        snapshotText: retryState.snapshotText,
        retryCount: retryState.retryCount,
    };
    context.saveMetadata();
}

export function loadRetryState() {
    const context = getContext();
    const saved = context.chatMetadata?.retryContinue;
    if (saved && saved.active) {
        debug('loadRetryState: restoring saved state', { messageId: saved.messageId, retryCount: saved.retryCount, snapshotLength: saved.snapshotText?.length });
        retryState = { ...saved };
    } else {
        debug('loadRetryState: no saved state, resetting');
        resetRetryState();
    }
    updateButtonVisuals();
    updateMessageIndicator();
}

function resetRetryState() {
    debug('resetRetryState: clearing all state | old: { active:', retryState.active, ', messageId:', retryState.messageId, ', snapshotLength:', retryState.snapshotText?.length ?? 0, ', retryCount:', retryState.retryCount, '}');
    retryState = {
        active: false,
        messageId: null,
        snapshotText: '',
        retryCount: 0,
    };
}

// ─── Auto-Confirm Edit ───

/**
 * If any message is currently being edited (has a visible edit textarea),
 * confirm the edit so the message exits editing state before we proceed.
 */
function confirmActiveMessageEdit() {
    const visibleEditButtons = document.querySelector('#chat .mes .mes_edit_buttons[style*="display: inline-flex"]');
    if (visibleEditButtons) {
        const editDoneBtn = visibleEditButtons.querySelector('.mes_edit_done');
        if (editDoneBtn) {
            debug('confirmActiveMessageEdit: found active edit, clicking confirm');
            editDoneBtn.click();
            return true;
        }
    }
    return false;
}

// ─── Core Retry Logic ───

async function doRetry() {
    debug('doRetry: invoked');

    // Auto-confirm any in-progress message edit
    const editWasActive = confirmActiveMessageEdit();

    const context = getContext();

    // Guard: no generation in progress
    if (context.isGenerating) {
        debug('doRetry: generation in progress, aborting');
        rcToast('Cannot retry while generation is in progress.', 'warning');
        return;
    }

    // Check if the user has typed text in the input area
    const textarea = document.getElementById('send_textarea');
    const inputText = textarea?.value?.trim();

    if (inputText) {
        debug('doRetry: input text detected, length =', inputText.length);
        await handleTypedMessageRetry(inputText);
        return;
    }

    const chat = context.chat;

    // Guard: must have messages
    if (!chat || chat.length === 0) {
        debug('doRetry: no messages in chat, aborting');
        rcToast('No messages in chat.', 'warning');
        return;
    }

    const lastMsg = chat[chat.length - 1];
    if (!lastMsg) {
        debug('doRetry: lastMsg is falsy, aborting');
        return;
    }

    const lastMsgIndex = chat.length - 1;
    debug('doRetry: lastMsgIndex =', lastMsgIndex, '| is_user =', lastMsg.is_user, '| retryState.active =', retryState.active);

    if (!retryState.active) {
        // First retry: establish snapshot
        debug('doRetry: first retry — setting checkpoint',
            '| old: { active:', retryState.active, ', messageId:', retryState.messageId, ', snapshotLength:', retryState.snapshotText?.length ?? 0, ', retryCount:', retryState.retryCount, '}',
            '| new: { active: true, messageId:', lastMsgIndex, ', snapshotLength:', lastMsg.mes.length, ', retryCount: 0 }');
        retryState.active = true;
        retryState.messageId = lastMsgIndex;
        retryState.snapshotText = lastMsg.mes;
        retryState.retryCount = 0;
        saveRetryState();
        rcToast(lastMsg.is_user ? 'User message checkpoint set — continuing...' : 'Retry checkpoint set.');
    } else {
        // Subsequent retry: validate snapshot still applies
        if (retryState.messageId !== lastMsgIndex) {
            debug('doRetry: messageId mismatch — expected', retryState.messageId, 'but got', lastMsgIndex, ', resetting');
            rcToast('Message context has changed. Resetting retry checkpoint.', 'warning');
            resetRetryState();
            saveRetryState();
            updateButtonVisuals();
            updateMessageIndicator();
            return;
        }
        // If we auto-confirmed an edit on the checkpointed message, update
        // the snapshot now. ST updates chat[N].mes synchronously on edit
        // confirm, but the MESSAGE_EDITED event fires asynchronously — so
        // we can't rely on the event handler having run yet.
        if (editWasActive) {
            debug('doRetry: edit was auto-confirmed — updating snapshot to edited text, length =', lastMsg.mes.length);
            retryState.snapshotText = lastMsg.mes;
            saveRetryState();
        }

        debug('doRetry: subsequent retry — checkpoint still valid');
    }

    retryState.retryCount++;
    debug('doRetry: retryCount incremented to', retryState.retryCount);
    saveRetryState();
    updateButtonVisuals();

    await createSnapshotSwipeAndContinue(lastMsg, lastMsgIndex);
}

// ─── Typed Message Retry ───

/**
 * Handles the case where the user has text in the input area when pressing
 * retry-continue. The typed text becomes the checkpoint, then #mes_continue
 * is clicked which natively posts the message and continues it.
 */
async function handleTypedMessageRetry(inputText) {
    const context = getContext();
    const { eventSource, eventTypes } = context;

    debug('handleTypedMessageRetry: setting checkpoint from input text, length =', inputText.length);

    // Lock snapshot so USER_MESSAGE_RENDERED doesn't clear our state
    snapshotLocked = true;

    // Set up retry state with the typed text as the checkpoint.
    // messageId will be updated once the user message renders.
    retryState.active = true;
    retryState.snapshotText = inputText;
    retryState.retryCount = 1;
    retryState.messageId = null;

    // Listen for the user message to capture its index
    const onUserMessage = () => {
        eventSource.removeListener(eventTypes.USER_MESSAGE_RENDERED, onUserMessage);
        const ctx = getContext();
        retryState.messageId = ctx.chat.length - 1;
        debug('handleTypedMessageRetry: USER_MESSAGE_RENDERED — messageId set to', retryState.messageId);
        saveRetryState();
        updateButtonVisuals();
        updateMessageIndicator();
    };
    eventSource.on(eventTypes.USER_MESSAGE_RENDERED, onUserMessage);

    // Click the Continue button directly — it handles posting the typed
    // message and continuing it natively, unlike the /continue slash command.
    rcToast('Message checkpoint set — continuing...');
    debug('handleTypedMessageRetry: clicking #mes_continue');
    const mesContinueBtn = document.getElementById('mes_continue');
    if (mesContinueBtn) {
        mesContinueBtn.click();
        return;
    }

    // Fallback to the hamburger menu Continue button
    debug('handleTypedMessageRetry: #mes_continue not found, trying #option_continue');
    const optionContinueBtn = document.getElementById('option_continue');
    if (optionContinueBtn) {
        optionContinueBtn.click();
        return;
    }

    debug('handleTypedMessageRetry: no continue button found, aborting');
    rcToast('Could not find Continue button.', 'error');
    snapshotLocked = false;
    resetRetryState();
    eventSource.removeListener(eventTypes.USER_MESSAGE_RENDERED, onUserMessage);
}

// ─── Swipe Creation & Continue ───

async function createSnapshotSwipeAndContinue(lastMsg, lastMsgIndex) {
    debug('createSnapshotSwipeAndContinue: msgIndex =', lastMsgIndex);
    const context = getContext();

    // Ensure the message has a swipes array
    if (!lastMsg.swipes) {
        debug('createSnapshotSwipeAndContinue: initializing swipes array');
        lastMsg.swipes = [lastMsg.mes];
        lastMsg.swipe_id = 0;
        lastMsg.swipe_info = [{}];
    }

    // Add a new swipe with the snapshot text
    lastMsg.swipes.push(retryState.snapshotText);
    lastMsg.swipe_info.push({});

    // Switch to the new swipe
    const newSwipeIndex = lastMsg.swipes.length - 1;
    lastMsg.swipe_id = newSwipeIndex;
    lastMsg.mes = retryState.snapshotText;
    debug('createSnapshotSwipeAndContinue: created swipe', newSwipeIndex, '| total swipes =', lastMsg.swipes.length);

    // Re-render the message to reflect the new swipe
    reRenderMessage(lastMsgIndex);

    // Persist the chat
    await context.saveChat();
    debug('createSnapshotSwipeAndContinue: chat saved');

    // Update message indicator
    updateMessageIndicator();

    // Trigger Continue to generate from the snapshot (if Auto-Continue enabled)
    if (moduleSettings.retryAutoContinue) {
        rcToast('Retrying from checkpoint...');
        snapshotLocked = true;
        debug('createSnapshotSwipeAndContinue: snapshotLocked = true, triggering continue');
        await triggerContinue();
    } else {
        debug('createSnapshotSwipeAndContinue: autoContinue disabled, skipping continue');
        rcToast('New swipe created from checkpoint.');
    }
}

/**
 * Re-render a message body to reflect the active swipe, preferring ST's own
 * updateMessageBlock + swipe.refresh and falling back to a manual DOM write.
 */
function reRenderMessage(messageIndex) {
    const context = getContext();
    const msg = context.chat[messageIndex];
    if (!msg) return;

    if (typeof context.updateMessageBlock === 'function') {
        context.updateMessageBlock(messageIndex, msg);
    } else {
        const messageElement = document.querySelector(`#chat .mes[mesid="${messageIndex}"]`);
        const textElement = messageElement?.querySelector('.mes_text');
        if (textElement) {
            if (typeof context.messageFormatting === 'function') {
                textElement.innerHTML = context.messageFormatting(
                    msg.mes,
                    msg.name,
                    msg.is_system,
                    msg.is_user,
                    messageIndex,
                );
            } else {
                textElement.textContent = msg.mes;
            }
        }
    }

    // Refresh swipe chevrons / counter.
    if (context.swipe?.refresh) {
        context.swipe.refresh(true);
        return;
    }
    const messageElement = document.querySelector(`#chat .mes[mesid="${messageIndex}"]`);
    if (!messageElement) return;
    const swipeCountElement = messageElement.querySelector('.swipes-counter');
    if (swipeCountElement && msg.swipes) {
        swipeCountElement.textContent = `${msg.swipe_id + 1}/${msg.swipes.length}`;
    }
    const swipeContainer = messageElement.querySelector('.swipe_right, .swipe_left');
    if (swipeContainer) {
        swipeContainer.style.display = '';
    }
}

async function triggerContinue() {
    const context = getContext();

    // Approach 1: Slash command system (most stable)
    if (context.executeSlashCommandsWithOptions) {
        debug('triggerContinue: using slash command /continue');
        await context.executeSlashCommandsWithOptions('/continue');
        return;
    }

    // Approach 2: Click the Continue button
    const continueButton = document.getElementById('option_continue');
    if (continueButton) {
        debug('triggerContinue: falling back to button click');
        continueButton.click();
        return;
    }

    debug('triggerContinue: no continue method available');
    rcToast('Could not trigger Continue. Is the Continue button enabled?', 'error');
}

// ─── UI: Buttons ───

/** Create both the hamburger-menu and quick-action Retry buttons. */
export function createRetryContinueButtons() {
    addRetryButton();
    addQuickRetryButton();
}

function addRetryButton() {
    const sendForm = document.getElementById('send_form');
    if (!sendForm) return;

    // Don't add twice
    if (document.getElementById('option_retry_continue')) return;

    const retryButton = document.createElement('div');
    retryButton.id = 'option_retry_continue';
    retryButton.classList.add('list-group-item', 'interactable');
    retryButton.title = 'Retry Continue — regenerate from checkpoint';
    retryButton.tabIndex = 0;
    retryButton.setAttribute('data-i18n', 'Retry');
    retryButton.innerHTML = '<span class="fa-solid fa-arrow-rotate-right"></span> Retry';

    // Insert after the Continue button
    const continueButton = document.getElementById('option_continue');
    if (continueButton && continueButton.parentNode) {
        continueButton.parentNode.insertBefore(
            retryButton,
            continueButton.nextSibling,
        );
    } else {
        sendForm.appendChild(retryButton);
    }

    retryButton.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await doRetry();
    });
}

function addQuickRetryButton() {
    const rightSendForm = document.getElementById('rightSendForm');
    if (!rightSendForm) return;

    // Don't add twice
    if (document.getElementById('quick_retry_continue')) return;

    const quickBtn = document.createElement('div');
    quickBtn.id = 'quick_retry_continue';
    quickBtn.classList.add('fa-solid', 'fa-arrow-rotate-right', 'interactable');
    quickBtn.title = 'Retry Continue — regenerate from checkpoint';
    quickBtn.tabIndex = 0;

    rightSendForm.appendChild(quickBtn);

    quickBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await doRetry();
    });
}

// ─── UI: Button Visuals ───

function updateButtonVisuals() {
    const buttons = [
        document.getElementById('option_retry_continue'),
        document.getElementById('quick_retry_continue'),
    ];

    for (const btn of buttons) {
        if (!btn) continue;
        if (retryState.active) {
            btn.classList.add('retry-active');
            btn.title = `Retry Continue (checkpoint active, ${retryState.retryCount} retries)`;
        } else {
            btn.classList.remove('retry-active');
            btn.title = 'Retry Continue — regenerate from checkpoint';
        }
    }
}

// ─── UI: Message Indicator ───

function updateMessageIndicator() {
    // Remove old indicators
    document.querySelectorAll('.retry-checkpoint-indicator').forEach((el) => el.remove());
    document.querySelectorAll('.mes.retry-checkpoint-border').forEach((el) => {
        el.classList.remove('retry-checkpoint-border');
    });

    if (!retryState.active || moduleSettings.retryIndicatorStyle === 'none') return;

    const messageElement = document.querySelector(
        `#chat .mes[mesid="${retryState.messageId}"]`,
    );
    if (!messageElement) return;

    if (moduleSettings.retryIndicatorStyle === 'border') {
        messageElement.classList.add('retry-checkpoint-border');
    } else if (moduleSettings.retryIndicatorStyle === 'icon') {
        const nameBlock = messageElement.querySelector('.ch_name');
        if (nameBlock && !nameBlock.querySelector('.retry-checkpoint-indicator')) {
            const icon = document.createElement('span');
            icon.classList.add('retry-checkpoint-indicator', 'fa-solid', 'fa-bookmark');
            icon.title = 'Retry checkpoint active';
            nameBlock.appendChild(icon);
        }
    }
}

// ─── UI: Quick Button Visibility During Generation ───

function hideQuickRetryButton() {
    const quickBtn = document.getElementById('quick_retry_continue');
    if (quickBtn) quickBtn.style.display = 'none';
}

function showQuickRetryButton() {
    const quickBtn = document.getElementById('quick_retry_continue');
    if (quickBtn) quickBtn.style.display = '';
}

// ─── Settings Panel ───

export function bindRetryContinueSettings(saveSettings) {
    const autoContinueCheck = document.getElementById('retry_continue_autocontinue');
    if (autoContinueCheck) {
        autoContinueCheck.checked = !!moduleSettings.retryAutoContinue;
        autoContinueCheck.addEventListener('change', () => {
            moduleSettings.retryAutoContinue = autoContinueCheck.checked;
            saveSettings();
        });
    }

    const autoSetCheck = document.getElementById('retry_continue_autoset');
    if (autoSetCheck) {
        autoSetCheck.checked = !!moduleSettings.retryAutoSetOnContinue;
        autoSetCheck.addEventListener('change', () => {
            moduleSettings.retryAutoSetOnContinue = autoSetCheck.checked;
            saveSettings();
        });
    }

    const toastCheck = document.getElementById('retry_continue_show_toasts');
    if (toastCheck) {
        toastCheck.checked = !!moduleSettings.retryShowToasts;
        toastCheck.addEventListener('change', () => {
            moduleSettings.retryShowToasts = toastCheck.checked;
            saveSettings();
        });
    }

    const styleSelect = document.getElementById('retry_continue_indicator_style');
    if (styleSelect) {
        styleSelect.value = moduleSettings.retryIndicatorStyle || 'border';
        styleSelect.addEventListener('change', () => {
            moduleSettings.retryIndicatorStyle = styleSelect.value;
            saveSettings();
            updateMessageIndicator();
        });
    }

    const clearBtn = document.getElementById('retry_continue_clear');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            resetRetryState();
            saveRetryState();
            updateButtonVisuals();
            updateMessageIndicator();
            rcToast('Retry checkpoint cleared.');
        });
    }

    const debugCheck = document.getElementById('retry_continue_debug_mode');
    if (debugCheck) {
        debugCheck.checked = !!moduleSettings.retryDebugMode;
        debugCheck.addEventListener('change', () => {
            moduleSettings.retryDebugMode = debugCheck.checked;
            saveSettings();
        });
    }
}

// ─── Slash Commands ───

export function registerRetryContinueSlashCommands() {
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'retry',
        callback: async () => {
            await doRetry();
            return '';
        },
        unnamedArgumentList: [],
        aliases: [],
        helpString: 'Retry the continuation from the saved checkpoint. If no checkpoint exists, sets one from the current message state and continues.',
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'retryclear',
        callback: () => {
            resetRetryState();
            saveRetryState();
            updateButtonVisuals();
            updateMessageIndicator();
            return 'Retry checkpoint cleared.';
        },
        unnamedArgumentList: [],
        aliases: [],
        helpString: 'Clear the active retry checkpoint.',
    }));
    debug('Registered /retry and /retryclear slash commands');
}

// ─── Auto-Set on Continue (optional feature) ───

function autoSetCheckpointOnContinue() {
    debug('autoSetCheckpointOnContinue: invoked | autoSetOnContinue =', moduleSettings.retryAutoSetOnContinue, '| retryState.active =', retryState.active);
    if (!moduleSettings.retryAutoSetOnContinue) return;
    if (retryState.active) {
        debug('autoSetCheckpointOnContinue: already have a checkpoint, skipping');
        return;
    }

    const context = getContext();
    const chat = context.chat;
    if (!chat || chat.length === 0) return;

    const lastMsg = chat[chat.length - 1];
    if (!lastMsg) return;

    debug('autoSetCheckpointOnContinue: auto-setting checkpoint',
        '| old: { active:', retryState.active, ', messageId:', retryState.messageId, ', snapshotLength:', retryState.snapshotText?.length ?? 0, ', retryCount:', retryState.retryCount, '}',
        '| new: { active: true, messageId:', chat.length - 1, ', snapshotLength:', lastMsg.mes.length, ', retryCount: 0 }');
    retryState.active = true;
    retryState.messageId = chat.length - 1;
    retryState.snapshotText = lastMsg.mes;
    retryState.retryCount = 0;
    snapshotLocked = true;
    saveRetryState();
    updateButtonVisuals();
    updateMessageIndicator();
    rcToast('Retry checkpoint auto-set from Continue.');
}

/** Hook ST's native Continue buttons so a checkpoint can be auto-set on use. */
export function hookRetryAutoContinue() {
    // Hook the hamburger menu Continue button
    const continueButton = document.getElementById('option_continue');
    if (continueButton) {
        continueButton.addEventListener('click', () => autoSetCheckpointOnContinue());
    }

    // Hook the quick Continue button in the right send form
    const quickContinueBtn = document.getElementById('mes_continue');
    if (quickContinueBtn) {
        quickContinueBtn.addEventListener('click', () => autoSetCheckpointOnContinue());
    }
}

// ─── Event Handlers (merged centrally in index.js) ───

/** CHAT_CHANGED — load saved state for the new chat. */
export function onRetryContinueChatChanged() {
    debug('event: CHAT_CHANGED');
    loadRetryState();
}

/**
 * USER_MESSAGE_RENDERED — a new user message clears the checkpoint, unless a
 * user-message retry is currently in progress (snapshotLocked), since the
 * continue may cause the user message to re-render.
 */
export function onRetryContinueUserMessageRendered() {
    debug('event: USER_MESSAGE_RENDERED | retryState.active =', retryState.active, '| snapshotLocked =', snapshotLocked);
    if (retryState.active && snapshotLocked) {
        debug('event: USER_MESSAGE_RENDERED — skipping (snapshotLocked)');
        return;
    }
    if (retryState.active) {
        debug('event: USER_MESSAGE_RENDERED — clearing checkpoint (new user message)');
        resetRetryState();
        saveRetryState();
        updateButtonVisuals();
        updateMessageIndicator();
    }
}

/**
 * CHARACTER_MESSAGE_RENDERED — clear only if it's a NEW message (not a
 * Continue of the checkpointed one).
 */
export function onRetryContinueCharacterMessageRendered() {
    debug('event: CHARACTER_MESSAGE_RENDERED | retryState.active =', retryState.active);
    if (!retryState.active) return;

    const ctx = getContext();
    const currentLastIndex = ctx.chat.length - 1;

    if (currentLastIndex !== retryState.messageId) {
        // A new message was added — conversation moved on
        debug('event: CHARACTER_MESSAGE_RENDERED — new message detected (lastIndex =', currentLastIndex, ', checkpoint =', retryState.messageId, '), clearing');
        resetRetryState();
        saveRetryState();
        updateButtonVisuals();
        updateMessageIndicator();
    } else {
        debug('event: CHARACTER_MESSAGE_RENDERED — same message (continue), keeping checkpoint');
    }
}

/**
 * MESSAGE_EDITED — update snapshot if it's the snapshotted message. Skipped
 * while the snapshot is locked (edit came from generation, not the user).
 */
export function onRetryContinueMessageEdited(messageId) {
    const ctx = getContext();
    debug('event: MESSAGE_EDITED | messageId =', messageId, '| snapshotLocked =', snapshotLocked, '| isGenerating =', ctx.isGenerating);
    if (snapshotLocked) {
        debug('event: MESSAGE_EDITED — skipping (snapshotLocked)');
        return;
    }
    if (ctx.isGenerating) {
        debug('event: MESSAGE_EDITED — skipping (isGenerating)');
        return;
    }
    if (retryState.active && parseInt(messageId) === retryState.messageId) {
        const msg = ctx.chat[retryState.messageId];
        if (msg) {
            debug('event: MESSAGE_EDITED — updating snapshot to edited text, length =', msg.mes.length);
            retryState.snapshotText = msg.mes;
            saveRetryState();
            rcToast('Retry checkpoint updated to your edit.');
        }
    }
}

/**
 * MESSAGE_RECEIVED — unlock the snapshot (after a delay) and refresh visuals.
 * The delay keeps any post-generation MESSAGE_EDITED events blocked, so the
 * snapshot isn't overwritten with the completed (post-continue) text.
 */
export function onRetryContinueMessageReceived() {
    debug('event: MESSAGE_RECEIVED — scheduling snapshotLocked = false (1000ms delay)');
    setTimeout(() => {
        snapshotLocked = false;
        debug('event: MESSAGE_RECEIVED — snapshotLocked = false (after delay)');
    }, 1000);
    updateButtonVisuals();
    updateMessageIndicator();
    showQuickRetryButton();
}

/** GENERATION_STARTED — hide the quick-action Retry button while generating. */
export function onRetryContinueGenerationStarted() {
    debug('event: GENERATION_STARTED — hiding quick button');
    hideQuickRetryButton();
}

/** GENERATION_ENDED — restore the quick-action Retry button. */
export function onRetryContinueGenerationEnded() {
    debug('event: GENERATION_ENDED — showing quick button');
    showQuickRetryButton();
}
