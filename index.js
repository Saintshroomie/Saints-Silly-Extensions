// Saint's Silly Extensions — Merged Possession + Phrasing!
// Allows the user to "possess" a character and enrich messages with AI narration.

import { selected_group, is_group_generating, groups } from '../../../group-chats.js';
import { renderExtensionTemplateAsync } from '../../../extensions.js';
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
import { SlashCommand } from '../../../slash-commands/SlashCommand.js';
import { ARGUMENT_TYPE, SlashCommandArgument } from '../../../slash-commands/SlashCommandArgument.js';
import {
    setExtensionPrompt,
    extension_prompt_types,
    extension_prompt_roles,
    substituteParams,
} from '../../../../script.js';

// ─── Constants ───

const EXTENSION_NAME = 'Saints-Silly-Extensions';
const POSSESSION_METADATA_KEY = 'possession';
const PHRASING_INJECTION_KEY = 'phrasing_instruction';
const PHRASING_SEED_EXTRA_KEY = 'phrasing_seed';

const DEFAULT_PHRASING_PROMPT = `[Rewrite the following message. Preserve its meaning, intent, and any dialogue, but enrich it with narration, action, and detail consistent with the character and the current scene. Do not continue the scene beyond what the original message describes.

{{phrasingSeed}}]`;

// ─── State ───

let possessedCharName = null;
let possessedCharAvatar = null;
let generationGuard = false;
let phrasingActive = false;

const defaultSettings = {
    possessionEnabled: true,
    possessionShowToast: true,
    possessionDebugMode: false,
    phrasingEnabled: true,
    phrasingDebugMode: false,
};

let settings = { ...defaultSettings };

// ─── Shared Helpers ───

function possessionDebug(...args) {
    if (!settings.possessionDebugMode) return;
    console.log('POSSESSION:', ...args);
}

function phrasingDebug(...args) {
    if (!settings.phrasingDebugMode) return;
    console.log('PHRASING:', ...args);
}

function SSEDebug(...args) {    
    console.log('SAINTS-SILLY-EXTENSIONS:', ...args);
}

function toast(message, type = 'info') {
    if (!settings.possessionShowToast) return;
    if (typeof toastr !== 'undefined' && toastr[type]) {
        toastr[type](message, "Saint's Silly Extensions");
    }
}

function getContext() {
    return SillyTavern.getContext();
}

function isPossessing() {
    return settings.possessionEnabled && possessedCharName !== null;
}

// ─── Section 1: Settings Persistence ───

function saveSettings() {
    const context = getContext();
    context.extensionSettings[EXTENSION_NAME] = { ...settings };
    context.saveSettingsDebounced();
    SSEDebug('Settings saved');
}

function loadSettings() {
    const context = getContext();
    const saved = context.extensionSettings?.[EXTENSION_NAME];
    if (saved) {
        settings = { ...defaultSettings, ...saved };
    }
    SSEDebug('Settings loaded:', JSON.stringify(settings));
}

// ─── Section 2: Possession — Persistence ───

function savePossessionState() {
    const context = getContext();
    context.chatMetadata[POSSESSION_METADATA_KEY] = {
        name: possessedCharName,
        avatar: possessedCharAvatar,
    };
    context.saveMetadata();
    possessionDebug('Saved possession state:', possessedCharName, '| avatar:', possessedCharAvatar);
}

function loadPossessionState() {
    const context = getContext();
    const saved = context.chatMetadata?.[POSSESSION_METADATA_KEY] ?? null;
    // Handle legacy format (plain string) and new format (object)
    if (saved && typeof saved === 'object') {
        possessedCharName = saved.name ?? null;
        possessedCharAvatar = saved.avatar ?? null;
    } else {
        possessedCharName = saved;
        possessedCharAvatar = null;
    }
    possessionDebug('Loaded possession state:', possessedCharName, '| avatar:', possessedCharAvatar);
}

// ─── Section 3: Possession — Character Utilities ───

function getPossessedCharacter() {
    if (!possessedCharName) return null;
    const context = getContext();
    // Prefer avatar match (unique), fall back to name match
    if (possessedCharAvatar) {
        const byAvatar = context.characters.find(c => c.avatar === possessedCharAvatar);
        if (byAvatar) return byAvatar;
    }
    return context.characters.find(c => c.name === possessedCharName) ?? null;
}

function validatePossessedCharInGroup() {
    if (!selected_group || !possessedCharName) return;
    const group = groups.find(g => g.id === selected_group);
    if (!group) return;
    const context = getContext();
    const isMember = group.members.some(avatar => {
        const char = context.characters.find(c => c.avatar === avatar);
        return char && char.name === possessedCharName;
    });
    if (!isMember) {
        possessionDebug('Possessed character removed from group, clearing');
        toast(`${possessedCharName} was removed from the group. Possession cleared.`, 'warning');
        setPossession(null);
    }
}

// ─── Section 4: Possession — Core Logic ───

function setPossession(charName, charAvatar) {
    const previous = possessedCharName;
    possessedCharName = charName;
    // Resolve avatar: use explicit param, or look up from characters array
    if (charName) {
        if (charAvatar) {
            possessedCharAvatar = charAvatar;
        } else {
            const context = getContext();
            const char = context.characters.find(c => c.name === charName);
            possessedCharAvatar = char?.avatar ?? null;
        }
    } else {
        possessedCharAvatar = null;
    }
    savePossessionState();
    syncAllPossessionUI();
    if (previous !== charName) {
        if (charName) {
            toast(`Possessing ${charName}`, 'success');
            possessionDebug('Now possessing:', charName);
        } else if (previous) {
            toast('Possession cleared', 'info');
            possessionDebug('Possession cleared');
        }
    }
}

// ─── Section 5: Possession — Message Posting ───

async function postPossessedMessage(text) {
    const context = getContext();
    const char = getPossessedCharacter();
    if (!char || !text) return -1;

    const message = {
        name: char.name,
        is_user: false,
        is_system: false,
        send_date: Date.now(),
        mes: text,
        force_avatar: char.avatar ? `/characters/${char.avatar}` : undefined,
        extra: {
            possession: true,
        },
    };

    if (selected_group) {
        message.original_avatar = char.avatar;
        message.is_name = true;
    }

    context.chat.push(message);
    const messageIndex = context.chat.length - 1;

    if (typeof context.addOneMessage === 'function') {
        context.addOneMessage(message);
    }

    await context.saveChat();
    possessionDebug('Posted possessed message at index', messageIndex);
    return messageIndex;
}

// ─── Section 6: Possession — Send Handling (MESSAGE_SENT) ───

async function onMessageSent(messageIndex) {
    if (!settings.possessionEnabled || !isPossessing()) return;
    if (phrasingActive) return; // Phrasing handles its own flow

    const context = getContext();
    const message = context.chat[messageIndex];
    if (!message || !message.is_user) return;

    const char = getPossessedCharacter();
    if (!char) return;

    possessionDebug('Converting user message to possessed character message at index', messageIndex);

    message.is_user = false;
    message.name = char.name;
    message.force_avatar = char.avatar ? `/characters/${char.avatar}` : undefined;
    message.extra = { ...(message.extra || {}), possession: true };

    if (selected_group) {
        message.original_avatar = char.avatar;
        message.is_name = true;
    }

    possessionDebug('Converted message — name:', char.name);
}

// ─── Section 7: Possession — Continue Interception ───

function handleContinueIntercept(event) {
    if (!settings.possessionEnabled || !isPossessing() || generationGuard) return;

    const textarea = document.getElementById('send_textarea');
    const text = textarea?.value?.trim();
    if (!text) return;

    event.stopImmediatePropagation();
    event.preventDefault();

    possessionDebug('Intercepted Continue with text:', text.substring(0, 50) + '...');
    executePossessedContinue(text);
}

async function executePossessedContinue(text) {
    const context = getContext();

    const textarea = document.getElementById('send_textarea');
    if (textarea) {
        textarea.value = '';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    await postPossessedMessage(text);
    await new Promise(resolve => requestAnimationFrame(resolve));

    if (context.executeSlashCommandsWithOptions) {
        await context.executeSlashCommandsWithOptions('/continue');
    } else {
        const continueBtn = document.getElementById('option_continue');
        if (continueBtn) continueBtn.click();
    }
}

function handlePhrasingSeedReinjection() {
    if (!settings.phrasingEnabled) return;

    const context = getContext();
    const lastIndex = context.chat.length - 1;
    if (lastIndex < 0) return;

    const message = context.chat[lastIndex];
    const storedPrompt = message?.extra?.[PHRASING_SEED_EXTRA_KEY];
    if (!storedPrompt) return;

    phrasingDebug('Reinjecting phrasing seed for continue on message', lastIndex);
    injectPhrasingPrompt(storedPrompt);
    // The injection will be cleared by onGenerationEnded/onGenerationStopped
}

function attachContinueInterceptor() {
    document.addEventListener('click', (event) => {
        if (!event.target.closest('#option_continue') && !event.target.closest('#mes_continue')) return;

        // Reinject phrasing seed if the last message was rephrased
        handlePhrasingSeedReinjection();

        handleContinueIntercept(event);
    }, { capture: true });
    possessionDebug('Attached continue interceptor');
}

// ─── Section 8: Possession — UI (Group Radio Buttons) ───

function injectGroupRadioButtons() {
    if (!selected_group) return;
    if (!settings.possessionEnabled) return;

    const group = groups.find(g => g.id === selected_group);
    if (!group) return;

    const context = getContext();
    const memberEntries = document.querySelectorAll('#rm_group_members .group_member');

    memberEntries.forEach(entry => {
        if (entry.querySelector('.possession_radio_wrapper')) return;

        const charId = entry.getAttribute('chid');
        const gridAvatar = entry.getAttribute('grid');
        let charName = null;
        let charAvatar = null;

        if (charId !== null) {
            const char = context.characters[parseInt(charId)];
            if (char) {
                charName = char.name;
                charAvatar = char.avatar;
            }
        } else if (gridAvatar) {
            const char = context.characters.find(c => c.avatar === gridAvatar);
            if (char) {
                charName = char.name;
                charAvatar = char.avatar;
            }
        }

        if (!charName) {
            const nameEl = entry.querySelector('.ch_name');
            if (nameEl) charName = nameEl.textContent?.trim() || nameEl.getAttribute('title');
        }

        if (!charName) return;

        const wrapper = document.createElement('div');
        wrapper.classList.add('possession_radio_wrapper');
        wrapper.title = `Possess ${charName}`;

        const radio = document.createElement('div');
        radio.classList.add('possession_radio');
        radio.dataset.charName = charName;
        if (charAvatar) radio.dataset.charAvatar = charAvatar;

        if (possessedCharName === charName) {
            radio.classList.add('possession_active');
            entry.classList.add('possession_possessed');
        }

        radio.addEventListener('click', (event) => {
            event.stopPropagation();
            if (possessedCharName === charName) {
                setPossession(null);
            } else {
                setPossession(charName, charAvatar);
            }
        });

        wrapper.appendChild(radio);

        const iconContainer = entry.querySelector('.group_member_icon');
        if (iconContainer) {
            iconContainer.insertBefore(wrapper, iconContainer.firstChild);
        } else {
            entry.appendChild(wrapper);
        }
    });
}

function syncGroupRadioButtons() {
    document.querySelectorAll('.possession_radio').forEach(radio => {
        const charName = radio.dataset.charName;
        radio.classList.toggle('possession_active', charName === possessedCharName);
    });

    document.querySelectorAll('.group_member').forEach(entry => {
        entry.classList.remove('possession_possessed');
    });

    if (possessedCharName) {
        document.querySelectorAll('.possession_radio.possession_active').forEach(radio => {
            const member = radio.closest('.group_member');
            if (member) member.classList.add('possession_possessed');
        });
    }
}

function removeGroupRadioButtons() {
    document.querySelectorAll('.possession_radio_wrapper').forEach(el => el.remove());
    document.querySelectorAll('.group_member.possession_possessed').forEach(el => {
        el.classList.remove('possession_possessed');
    });
}

// ─── Section 9: Possession — UI (Solo Chat Button) ───

function injectSoloButton() {
    if (selected_group) return;
    if (!settings.possessionEnabled) return;
    if (document.getElementById('possession_solo_btn')) return;

    const panelButtonRow = document.querySelector('#form_create .ch_creation_btn_row, #form_create .form_create_bottom_buttons_block');
    const target = panelButtonRow || document.getElementById('rightSendForm');
    if (!target) return;

    const btn = document.createElement('div');
    btn.id = 'possession_solo_btn';
    btn.classList.add('menu_button', 'interactable');
    btn.title = 'Possess this character';
    btn.innerHTML = '<span class="fa-solid fa-ghost"></span>';

    if (isPossessing()) {
        btn.classList.add('possession_active');
    }

    btn.addEventListener('click', () => {
        const context = getContext();
        const char = context.characters?.[context.characterId];
        if (!char) return;

        if (possessedCharName === char.name) {
            setPossession(null);
        } else {
            setPossession(char.name);
        }
    });

    target.appendChild(btn);
    possessionDebug('Injected solo possess button');
}

function syncSoloButton() {
    const btn = document.getElementById('possession_solo_btn');
    if (!btn) return;
    btn.classList.toggle('possession_active', isPossessing());
}

function removeSoloButton() {
    const btn = document.getElementById('possession_solo_btn');
    if (btn) btn.remove();
}

// ─── Section 9b: Possession — Impersonate Button Visibility ───

function hideImpersonateButtons() {
    const menuBtn = document.getElementById('option_impersonate');
    const quickBtn = document.getElementById('mes_impersonate');
    if (menuBtn) menuBtn.classList.add('possession_hidden');
    if (quickBtn) quickBtn.classList.add('possession_hidden');
    possessionDebug('Impersonate buttons hidden');
}

function showImpersonateButtons() {
    const menuBtn = document.getElementById('option_impersonate');
    const quickBtn = document.getElementById('mes_impersonate');
    if (menuBtn) menuBtn.classList.remove('possession_hidden');
    if (quickBtn) quickBtn.classList.remove('possession_hidden');
    possessionDebug('Impersonate buttons shown');
}

// ─── Section 9c: Possession — Impersonate Button (Character Avatar) ───

function injectPossessionImpersonateButton() {
    removePossessionImpersonateButton(); // Remove stale button first

    const char = getPossessedCharacter();
    if (!char) return;

    const sendForm = document.getElementById('rightSendForm');
    if (!sendForm) return;

    const btn = document.createElement('div');
    btn.id = 'possession_impersonate_btn';
    btn.classList.add('interactable');
    btn.title = `Generate as ${char.name}`;

    const img = document.createElement('img');
    img.src = char.avatar ? `/characters/${char.avatar}` : '/img/ai4.png';
    img.alt = char.name;
    img.classList.add('possession_impersonate_avatar');
    btn.appendChild(img);

    btn.addEventListener('click', async () => {
        const context = getContext();
        if (context.isGenerating || generationGuard) return;

        possessionDebug('Possession impersonate clicked — triggering generation for', char.name);

        if (selected_group) {
            // Group chat: find and click the possessed character's speak button
            const radios = document.querySelectorAll('.possession_radio');
            for (const radio of radios) {
                if (radio.dataset.charName === possessedCharName) {
                    const memberEntry = radio.closest('.group_member');
                    if (memberEntry) {
                        const speakBtn = memberEntry.querySelector('.right_menu_button[data-action="speak"]');
                        if (speakBtn) {
                            speakBtn.click();
                            return;
                        }
                    }
                    break;
                }
            }
            possessionDebug('Speak button not found, falling back to /trigger');
            if (context.executeSlashCommandsWithOptions) {
                await context.executeSlashCommandsWithOptions(`/trigger ${char.name}`);
            }
        } else {
            // Solo chat: trigger a normal generation
            if (context.executeSlashCommandsWithOptions) {
                await context.executeSlashCommandsWithOptions('/trigger');
            } else {
                const sendBtn = document.getElementById('send_but');
                if (sendBtn) sendBtn.click();
            }
        }
    });

    // Insert before the phrasing button if it exists, otherwise append
    const phrasingBtn = document.getElementById('phrasing_send_button');
    if (phrasingBtn) {
        sendForm.insertBefore(btn, phrasingBtn);
    } else {
        sendForm.appendChild(btn);
    }

    possessionDebug('Injected possession impersonate button for', char.name);
}

function removePossessionImpersonateButton() {
    const btn = document.getElementById('possession_impersonate_btn');
    if (btn) btn.remove();
}

// ─── Section 10: Possession — UI Sync ───

function syncAllPossessionUI() {
    if (!settings.possessionEnabled) {
        removeGroupRadioButtons();
        removeSoloButton();
        showImpersonateButtons();
        removePossessionImpersonateButton();
        return;
    }

    if (selected_group) {
        removeSoloButton();
        injectGroupRadioButtons();
        syncGroupRadioButtons();
    } else {
        removeGroupRadioButtons();
        injectSoloButton();
        syncSoloButton();
    }

    // Hide/show impersonate buttons based on possession state
    if (isPossessing()) {
        hideImpersonateButtons();
        injectPossessionImpersonateButton();
    } else {
        showImpersonateButtons();
        removePossessionImpersonateButton();
    }
}

// ─── Section 11: Phrasing — Prompt Management ───

function getActivePrompt() {
    const context = getContext();
    const chatPrompt = context.chatMetadata?.phrasing?.prompt;
    phrasingDebug('getActivePrompt — source:', chatPrompt ? 'chat metadata' : 'default');
    return chatPrompt || DEFAULT_PHRASING_PROMPT;
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
    phrasingDebug('formatSeedWithSpeaker — speaker:', name, '| isUser:', isUser);
    return `${name}: ${seedText}`;
}

function assemblePrompt(seedText) {
    phrasingDebug('assemblePrompt — seed length:', seedText.length);
    let prompt = getActivePrompt();
    prompt = prompt.replace(/\{\{phrasingSeed\}\}/g, seedText);
    prompt = substituteParams(prompt);
    phrasingDebug('assemblePrompt — final length:', prompt.length);
    return prompt;
}

// ─── Section 12: Phrasing — Injection ───

function injectPhrasingPrompt(assembledPrompt) {
    phrasingDebug('injectPhrasingPrompt — injecting at depth 0, SYSTEM role');
    setExtensionPrompt(
        PHRASING_INJECTION_KEY,
        assembledPrompt,
        extension_prompt_types.IN_CHAT,
        0,
        false,
        extension_prompt_roles.SYSTEM,
    );
}

function clearPhrasingInjection() {
    phrasingDebug('clearPhrasingInjection — removing injection');
    setExtensionPrompt(PHRASING_INJECTION_KEY, '', extension_prompt_types.NONE, 0);
}

// ─── Section 13: Phrasing — Button Visibility ───

function hideAllPhrasingButtons() {
    document.querySelectorAll('.phrasing-trigger').forEach(el => {
        el.classList.add('phrasing-hidden');
    });
}

function showAllPhrasingButtons() {
    if (!settings.phrasingEnabled) return;
    document.querySelectorAll('.phrasing-trigger').forEach(el => {
        el.classList.remove('phrasing-hidden');
    });
}

function applyPhrasingEnabledState() {
    if (settings.phrasingEnabled) {
        showAllPhrasingButtons();
    } else {
        hideAllPhrasingButtons();
    }
}

// ─── Section 14: Phrasing — Primary Flow (INPUT ENRICHMENT) ───

/**
 * Normal path (not possessing):
 *   Inject prompt, click impersonate, result lands in textarea.
 *
 * Possessed path:
 *   Post the seed text as a possessed character message, then run swipe-mode
 *   on it. The original text becomes swipe 0, the enriched version swipe 1.
 */
async function doPrimaryFlow(seedText) {
    phrasingDebug('doPrimaryFlow — starting, seed length:', seedText.length);
    const context = getContext();

    if (context.isGenerating) {
        phrasingDebug('doPrimaryFlow — ABORTED: generation in progress');
        return '';
    }

    phrasingActive = true;

    try {
        if (isPossessing()) {
            // ── Possessed path: post message then swipe-rephrase ──
            phrasingDebug('doPrimaryFlow — possessed path: posting message then swiping');

            // Extract the raw text (without speaker prefix) for the message body.
            // seedText is already formatted as "CharName: text", strip the prefix.
            const colonIndex = seedText.indexOf(': ');
            const rawText = colonIndex !== -1 ? seedText.substring(colonIndex + 2) : seedText;

            const messageIndex = await postPossessedMessage(rawText);
            if (messageIndex < 0) {
                phrasingDebug('doPrimaryFlow — FAILED: could not post possessed message');
                return '';
            }

            // Small delay for DOM to update after posting
            await new Promise(resolve => setTimeout(resolve, 100));

            // Now run swipe-mode on the newly posted message
            const result = await doSwipeMode(messageIndex);
            phrasingDebug('doPrimaryFlow — possessed path complete, result length:', result.length);
            return result;
        } else {
            // ── Normal path: inject + impersonate ──
            const assembled = assemblePrompt(seedText);
            injectPhrasingPrompt(assembled);

            phrasingDebug('doPrimaryFlow — normal path: triggering impersonate');
            const impersonateBtn = document.getElementById('option_impersonate');
            if (impersonateBtn) {
                impersonateBtn.click();
            } else {
                phrasingDebug('doPrimaryFlow — FAILED: option_impersonate not found');
                return '';
            }

            await waitForGenerationEnd();

            const textarea = document.getElementById('send_textarea');
            const result = textarea?.value?.trim() || '';
            phrasingDebug('doPrimaryFlow — normal path complete, result length:', result.length);
            return result;
        }
    } finally {
        clearPhrasingInjection();
        phrasingActive = false;
        showAllPhrasingButtons();
        phrasingDebug('doPrimaryFlow — cleanup complete');
    }
}

// ─── Section 15: Phrasing — Swipe Mode ───

async function doSwipeMode(messageIndex) {
    phrasingDebug('doSwipeMode — starting for message index:', messageIndex);
    const context = getContext();

    if (context.isGenerating) {
        phrasingDebug('doSwipeMode — ABORTED: generation in progress');
        return '';
    }

    const message = context.chat[messageIndex];
    if (!message) {
        phrasingDebug('doSwipeMode — ABORTED: no message at index', messageIndex);
        return '';
    }

    const rawSeedText = message.mes;
    if (!rawSeedText || !rawSeedText.trim()) {
        phrasingDebug('doSwipeMode — ABORTED: message is empty');
        toastr.warning('Cannot rephrase an empty message.', 'Phrasing!');
        return '';
    }

    const seedText = formatSeedWithSpeaker(rawSeedText, message.is_user, message.name);
    phrasingDebug('doSwipeMode — seed length:', seedText.length, '| speaker:', message.name);

    // Only set phrasingActive if not already set (doPrimaryFlow may have set it)
    const wasAlreadyActive = phrasingActive;
    phrasingActive = true;

    try {
        // Ensure swipe array exists.
        if (!message.swipes || message.swipes.length === 0) {
            phrasingDebug('doSwipeMode — initializing swipes array');
            message.swipes = [message.mes];
            message.swipe_id = 0;
            message.swipe_info = [{}];
        }

        const assembled = assemblePrompt(seedText);
        injectPhrasingPrompt(assembled);

        // Store the assembled prompt on the message for continue reinjection
        if (!message.extra) message.extra = {};
        message.extra[PHRASING_SEED_EXTRA_KEY] = assembled;

        // Force regenerate overswipe behavior so ST generates a new swipe instead of
        // looping (which happens for index-0 messages in pristine chats).
        message.extra.overswipe_behavior = 'regenerate';

        // Jump to the last swipe so a single swipe_right click triggers generation.
        const lastSwipeIndex = message.swipes.length - 1;
        if (message.swipe_id !== lastSwipeIndex) {
            phrasingDebug('doSwipeMode — jumping to last swipe', lastSwipeIndex);
            message.swipe_id = lastSwipeIndex;
            message.mes = message.swipes[lastSwipeIndex];

            const messageEl = document.querySelector(`#chat .mes[mesid="${messageIndex}"]`);
            if (messageEl) {
                const textEl = messageEl.querySelector('.mes_text');
                if (textEl) {
                    if (typeof context.messageFormatting === 'function') {
                        textEl.innerHTML = context.messageFormatting(
                            message.mes, message.name, message.is_system, message.is_user, messageIndex,
                        );
                    } else {
                        textEl.textContent = message.mes;
                    }
                }
                const swipeCounter = messageEl.querySelector('.swipes-counter');
                if (swipeCounter) {
                    swipeCounter.textContent = `${message.swipe_id + 1}/${message.swipes.length}`;
                }
            }
        }

        const swipeRight = document.querySelector(`#chat .mes[mesid="${messageIndex}"] .swipe_right`);
        if (!swipeRight) {
            phrasingDebug('doSwipeMode — FAILED: swipe_right button not found');
            return '';
        }

        phrasingDebug('doSwipeMode — clicking swipe_right');
        swipeRight.click();

        const result = await waitForGenerationEnd();
        phrasingDebug('doSwipeMode — complete, result length:', result.length);
        return result;
    } finally {
        clearPhrasingInjection();
        // Only reset phrasingActive if we set it ourselves
        if (!wasAlreadyActive) {
            phrasingActive = false;
            showAllPhrasingButtons();
        }
        phrasingDebug('doSwipeMode — cleanup complete');
    }
}

// ─── Section 16: Phrasing — Wait Helper ───

function waitForGenerationEnd() {
    phrasingDebug('waitForGenerationEnd — subscribing');
    return new Promise(resolve => {
        const context = getContext();
        const { eventSource, eventTypes } = context;
        let settled = false;

        const cleanup = () => {
            eventSource.removeListener(eventTypes.GENERATION_ENDED, onEnd);
            eventSource.removeListener(eventTypes.GENERATION_STOPPED, onEnd);
        };

        const onEnd = () => {
            if (settled) return;
            settled = true;
            phrasingDebug('waitForGenerationEnd — generation ended');
            cleanup();
            const ctx = getContext();
            const lastMsg = ctx.chat[ctx.chat.length - 1];
            resolve(lastMsg ? lastMsg.mes : '');
        };

        setTimeout(() => {
            if (settled) return;
            settled = true;
            phrasingDebug('waitForGenerationEnd — TIMED OUT after 5 minutes');
            cleanup();
            resolve('');
        }, 5 * 60 * 1000);

        eventSource.on(eventTypes.GENERATION_ENDED, onEnd);
        if (eventTypes.GENERATION_STOPPED) {
            eventSource.on(eventTypes.GENERATION_STOPPED, onEnd);
        }
    });
}

// ─── Section 17: Phrasing — Button Handlers ───

function confirmActiveMessageEdit() {
    const visibleEditButtons = document.querySelector('#chat .mes .mes_edit_buttons[style*="display: inline-flex"]');
    if (visibleEditButtons) {
        const editDoneBtn = visibleEditButtons.querySelector('.mes_edit_done');
        if (editDoneBtn) {
            editDoneBtn.click();
            return true;
        }
    }
    return false;
}

function getEditingMessageIndex() {
    const visibleEditButtons = document.querySelector('#chat .mes .mes_edit_buttons[style*="display: inline-flex"]');
    if (!visibleEditButtons) return -1;
    const mesEl = visibleEditButtons.closest('.mes');
    if (!mesEl) return -1;
    const mesId = mesEl.getAttribute('mesid');
    return mesId !== null ? parseInt(mesId) : -1;
}

async function onInputPhrasingClick() {
    phrasingDebug('onInputPhrasingClick — triggered');
    if (!settings.phrasingEnabled) return;

    const context = getContext();
    if (context.isGenerating) return;

    // Immediately disable buttons to prevent double-clicks
    hideAllPhrasingButtons();

    const textarea = document.getElementById('send_textarea');
    const inputText = textarea?.value?.trim();
    const editingIndex = getEditingMessageIndex();

    try {
        if (!inputText && editingIndex < 0) {
            // ── Case 1: Empty input, no edit in progress → rephrase last message ──
            phrasingDebug('onInputPhrasingClick — empty input, no edit → rephrase last message');
            const lastIndex = context.chat.length - 1;
            if (lastIndex < 0) {
                toastr.warning('No messages to rephrase.', 'Phrasing!');
                return;
            }
            await doSwipeMode(lastIndex);
        } else if (editingIndex >= 0 && !inputText) {
            // ── Case 2: Editing a message, no text in input → confirm edit, rephrase that message ──
            phrasingDebug('onInputPhrasingClick — editing message at index', editingIndex, '→ confirm and rephrase');
            confirmActiveMessageEdit();
            // Small delay for ST to process the edit confirmation
            await new Promise(resolve => setTimeout(resolve, 100));
            await doSwipeMode(editingIndex);
        } else {
            // ── Case 3: Text in input → confirm any edit, then handle input text ──
            if (editingIndex >= 0) {
                phrasingDebug('onInputPhrasingClick — confirming active edit before processing input');
                confirmActiveMessageEdit();
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            phrasingDebug('onInputPhrasingClick — input text present, seed length:', inputText.length);
            textarea.value = '';
            textarea.dispatchEvent(new Event('input', { bubbles: true }));

            const formattedSeed = isPossessing()
                ? formatSeedWithSpeaker(inputText, false, possessedCharName)
                : formatSeedWithSpeaker(inputText, true);

            await doPrimaryFlow(formattedSeed);
        }
    } finally {
        showAllPhrasingButtons();
    }
}

async function onMessagePhrasingClick(messageIndex) {
    phrasingDebug('onMessagePhrasingClick — index:', messageIndex);
    if (!settings.phrasingEnabled) return;

    const context = getContext();
    if (context.isGenerating) return;

    const lastIndex = context.chat.length - 1;
    if (messageIndex !== lastIndex) {
        toastr.warning('Phrasing! can only be used on the last message.', 'Phrasing!');
        return;
    }

    // Immediately disable buttons to prevent double-clicks
    hideAllPhrasingButtons();

    try {
        await doSwipeMode(messageIndex);
    } finally {
        showAllPhrasingButtons();
    }
}

// ─── Section 18: Phrasing — Message Action Button Management ───

function updateMessageActionButtons() {
    if (!settings.phrasingEnabled) return;

    const context = getContext();
    const lastIndex = context.chat.length - 1;

    document.querySelectorAll('.phrasing_mes_button').forEach(el => el.remove());

    if (lastIndex < 0) return;

    const lastMessageEl = document.querySelector(`#chat .mes[mesid="${lastIndex}"]`);
    if (!lastMessageEl) return;

    const extraButtons = lastMessageEl.querySelector('.extraMesButtons, .mes_buttons');
    if (!extraButtons) return;

    const btn = document.createElement('div');
    btn.classList.add('phrasing_mes_button', 'phrasing-trigger', 'mes_button', 'fa-solid', 'fa-pen-fancy', 'interactable');
    btn.title = 'Phrasing! — Add a rephrased swipe';
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mesId = parseInt(lastMessageEl.getAttribute('mesid'));
        onMessagePhrasingClick(mesId);
    });

    if (context.isGenerating) {
        btn.classList.add('phrasing-hidden');
    }

    extraButtons.appendChild(btn);
}

// ─── Section 19: Phrasing — Prompt Settings UI ───

function loadPromptTextarea() {
    const textarea = document.getElementById('phrasing_prompt_textarea');
    if (!textarea) return;
    textarea.value = getActivePrompt();
}

function onSaveToChat() {
    phrasingDebug('onSaveToChat — triggered');
    const textarea = document.getElementById('phrasing_prompt_textarea');
    if (!textarea) return;

    const promptText = textarea.value.trim();
    const context = getContext();

    if (promptText && !promptText.includes('{{phrasingSeed}}')) {
        toastr.warning("Warning: Prompt does not contain {{phrasingSeed}}. The AI won't receive your input text.", 'Phrasing!');
    }

    if (!context.chatMetadata.phrasing) {
        context.chatMetadata.phrasing = {};
    }

    context.chatMetadata.phrasing.prompt = promptText || null;
    context.saveMetadata();
    toastr.success('Phrasing! prompt saved to chat.', 'Phrasing!');
}

function onRestoreDefault() {
    phrasingDebug('onRestoreDefault — triggered');
    if (!confirm('Restore the default Phrasing! prompt? This will overwrite your current prompt.')) return;

    const textarea = document.getElementById('phrasing_prompt_textarea');
    if (textarea) {
        textarea.value = DEFAULT_PHRASING_PROMPT;
    }

    const context = getContext();
    if (context.chatMetadata.phrasing) {
        context.chatMetadata.phrasing.prompt = null;
    }
    context.saveMetadata();
    toastr.info('Phrasing! prompt restored to default.', 'Phrasing!');
}

// ─── Section 20: Merged Event Handlers ───

function hidePossessionImpersonateButton() {
    const btn = document.getElementById('possession_impersonate_btn');
    if (btn) btn.classList.add('possession_hidden');
}

function showPossessionImpersonateButton() {
    const btn = document.getElementById('possession_impersonate_btn');
    if (btn) btn.classList.remove('possession_hidden');
}

function onGenerationStarted() {
    generationGuard = true;
    hideAllPhrasingButtons();
    hidePossessionImpersonateButton();
    SSEDebug('Generation started, guard ON');
}

function onGenerationEnded() {
    generationGuard = false;
    syncAllPossessionUI();
    if (phrasingActive) {
        clearPhrasingInjection();
        phrasingActive = false;
    }
    showAllPhrasingButtons();
    showPossessionImpersonateButton();
    SSEDebug('Generation ended, guard OFF');
}

function onGenerationStopped() {
    generationGuard = false;
    syncAllPossessionUI();
    if (phrasingActive) {
        clearPhrasingInjection();
        phrasingActive = false;
    }
    showAllPhrasingButtons();
    showPossessionImpersonateButton();
    SSEDebug('Generation stopped, guard OFF');
}

function onChatChanged() {
    loadPossessionState();
    syncAllPossessionUI();
    loadPromptTextarea();
    setTimeout(() => updateMessageActionButtons(), 100);
    SSEDebug('Chat changed, state reloaded');
}

function onGroupUpdated() {
    validatePossessedCharInGroup();
    removeGroupRadioButtons();
    injectGroupRadioButtons();
    syncGroupRadioButtons();
    SSEDebug('Group updated, UI rebuilt');
}

function onCharacterPageLoaded() {
    if (!selected_group) {
        injectSoloButton();
        syncSoloButton();
    }
}

function onMessageRendered() {
    setTimeout(() => updateMessageActionButtons(), 50);
}

function onGroupWrapperFinished() {
    syncAllPossessionUI();
}

// ─── Section 21: Slash Commands ───

function registerPossessionSlashCommands() {
    // /possess [name]
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'possess',
        callback: async (namedArgs, unnamedArgs) => {
            const name = unnamedArgs?.trim();

            if (!name) {
                if (isPossessing()) {
                    toastr.info(`Currently possessing: ${possessedCharName}`, 'Possession');
                    return possessedCharName;
                }
                if (!selected_group) {
                    const context = getContext();
                    const char = context.characters?.[context.characterId];
                    if (char) {
                        setPossession(char.name);
                        return char.name;
                    }
                }
                toastr.info('No character is currently possessed.', 'Possession');
                return 'None';
            }

            const context = getContext();
            const nameLower = name.toLowerCase();

            if (selected_group) {
                const group = groups.find(g => g.id === selected_group);
                if (!group) {
                    toastr.error('No active group found.', 'Possession');
                    return '';
                }
                const match = group.members
                    .map(avatar => context.characters.find(c => c.avatar === avatar))
                    .filter(Boolean)
                    .find(c => c.name.toLowerCase().includes(nameLower));

                if (!match) {
                    toastr.error(`No group member matching "${name}" found.`, 'Possession');
                    return '';
                }
                setPossession(match.name);
                return match.name;
            } else {
                const char = context.characters?.[context.characterId];
                if (char && char.name.toLowerCase().includes(nameLower)) {
                    setPossession(char.name);
                    return char.name;
                }
                toastr.error(`Character "${name}" does not match the active character.`, 'Possession');
                return '';
            }
        },
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'Character name (partial match). Omit to show current or toggle in solo chat.',
                typeList: [ARGUMENT_TYPE.STRING],
                isRequired: false,
            }),
        ],
        aliases: [],
        helpString: 'Possess a character so your messages are posted under their name. Usage: /possess [name]',
    }));

    // /unpossess
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'unpossess',
        callback: async () => {
            if (isPossessing()) {
                setPossession(null);
            }
            return '';
        },
        unnamedArgumentList: [],
        aliases: [],
        helpString: 'Clear the currently possessed character, returning to normal mode.',
    }));

    possessionDebug('Registered possession slash commands');
}

function registerPhrasingSlashCommand() {
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'phrasing',
        callback: async (_namedArgs, unnamedArgs) => {
            phrasingDebug('slashCommand /phrasing — invoked');
            if (!settings.phrasingEnabled) return '';

            const rawSeedText = unnamedArgs?.trim();

            if (rawSeedText) {
                // With argument: primary flow (respects possession state)
                const seedText = isPossessing()
                    ? formatSeedWithSpeaker(rawSeedText, false, possessedCharName)
                    : formatSeedWithSpeaker(rawSeedText, true);
                return await doPrimaryFlow(seedText);
            } else {
                // Without argument: swipe-mode on last message
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

    phrasingDebug('Registered /phrasing slash command');
}

// ─── Section 22: Settings Panel Binding ───

async function injectSettingsPanel() {
    const settingsContainer = document.getElementById('extensions_settings');
    if (!settingsContainer) return;

    const settingsHtml = await renderExtensionTemplateAsync(`third-party/${EXTENSION_NAME}`, 'settings', {});
    settingsContainer.insertAdjacentHTML('beforeend', settingsHtml);

    // Possession checkboxes
    const possessionEnabled = document.getElementById('possession_enabled');
    if (possessionEnabled) {
        possessionEnabled.checked = settings.possessionEnabled;
        possessionEnabled.addEventListener('change', (e) => {
            settings.possessionEnabled = e.target.checked;
            saveSettings();
            syncAllPossessionUI();
        });
    }

    const possessionShowToast = document.getElementById('possession_show_toast');
    if (possessionShowToast) {
        possessionShowToast.checked = settings.possessionShowToast;
        possessionShowToast.addEventListener('change', (e) => {
            settings.possessionShowToast = e.target.checked;
            saveSettings();
        });
    }

    const possessionDebugMode = document.getElementById('possession_debug_mode');
    if (possessionDebugMode) {
        possessionDebugMode.checked = settings.possessionDebugMode;
        possessionDebugMode.addEventListener('change', (e) => {
            settings.possessionDebugMode = e.target.checked;
            saveSettings();
            possessionDebug('debugMode toggled to', settings.possessionDebugMode);
        });
    }

    // Phrasing checkboxes
    const phrasingEnabled = document.getElementById('phrasing_enabled');
    if (phrasingEnabled) {
        phrasingEnabled.checked = settings.phrasingEnabled;
        phrasingEnabled.addEventListener('change', (e) => {
            settings.phrasingEnabled = e.target.checked;
            saveSettings();
            applyPhrasingEnabledState();
            updateMessageActionButtons();
        });
    }

    const phrasingDebugMode = document.getElementById('phrasing_debug_mode');
    if (phrasingDebugMode) {
        phrasingDebugMode.checked = settings.phrasingDebugMode;
        phrasingDebugMode.addEventListener('change', (e) => {
            settings.phrasingDebugMode = e.target.checked;
            saveSettings();
            phrasingDebug('debugMode toggled to', settings.phrasingDebugMode);
        });
    }

    // Phrasing prompt buttons
    document.getElementById('phrasing_save_to_chat')?.addEventListener('click', onSaveToChat);
    document.getElementById('phrasing_restore_default')?.addEventListener('click', onRestoreDefault);
}

// ─── Section 23: Phrasing — UI Creation ───

function createInputAreaButton() {
    if (document.getElementById('phrasing_send_button')) return;

    const sendForm = document.getElementById('rightSendForm');
    if (!sendForm) return;

    const btn = document.createElement('div');
    btn.id = 'phrasing_send_button';
    btn.classList.add('phrasing-trigger', 'fa-solid', 'fa-pen-fancy', 'interactable');
    btn.title = 'Phrasing! — Enrich your message with AI narration';
    btn.addEventListener('click', onInputPhrasingClick);

    sendForm.appendChild(btn);
    phrasingDebug('Created input area button');
}

function createHamburgerMenuItem() {
    if (document.getElementById('phrasing_menu_button')) return;

    const impersonateBtn = document.getElementById('option_impersonate');
    if (!impersonateBtn) return;

    const btn = document.createElement('div');
    btn.id = 'phrasing_menu_button';
    btn.classList.add('phrasing-trigger', 'list-group-item', 'interactable');
    btn.innerHTML = '<span class="fa-solid fa-pen-fancy"></span> Phrasing!';
    btn.addEventListener('click', onInputPhrasingClick);

    impersonateBtn.parentNode.insertBefore(btn, impersonateBtn.nextSibling);
    phrasingDebug('Created hamburger menu item');
}

// ─── Section 24: Initialization ───

jQuery(async () => {
    loadSettings();
    loadPossessionState();
    await injectSettingsPanel();

    // Possession UI
    attachContinueInterceptor();

    // Phrasing UI
    createInputAreaButton();
    createHamburgerMenuItem();

    // Subscribe to events (merged handlers)
    const { eventSource, eventTypes } = getContext();
    eventSource.on(eventTypes.CHAT_CHANGED, onChatChanged);
    eventSource.on(eventTypes.GROUP_UPDATED, onGroupUpdated);
    eventSource.on(eventTypes.CHARACTER_PAGE_LOADED, onCharacterPageLoaded);
    eventSource.on(eventTypes.GENERATION_STARTED, onGenerationStarted);
    eventSource.on(eventTypes.GENERATION_ENDED, onGenerationEnded);
    eventSource.on(eventTypes.GENERATION_STOPPED, onGenerationStopped);
    eventSource.on(eventTypes.GROUP_WRAPPER_FINISHED, onGroupWrapperFinished);
    eventSource.on(eventTypes.MESSAGE_SENT, onMessageSent);
    eventSource.on(eventTypes.USER_MESSAGE_RENDERED, onMessageRendered);
    eventSource.on(eventTypes.CHARACTER_MESSAGE_RENDERED, onMessageRendered);

    // Slash commands
    registerPossessionSlashCommands();
    registerPhrasingSlashCommand();

    // Initial state
    syncAllPossessionUI();
    applyPhrasingEnabledState();
    loadPromptTextarea();

    possessionDebug('Extension initialized');
    phrasingDebug('Extension initialized');
});
