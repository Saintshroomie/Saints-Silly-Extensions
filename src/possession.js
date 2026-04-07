/**
 * Possession module — lets the user "possess" a character so their messages
 * are posted under that character's name/avatar.
 */

import { selected_group, groups } from '../../../../group-chats.js';
import { SlashCommandParser } from '../../../../slash-commands/SlashCommandParser.js';
import { SlashCommand } from '../../../../slash-commands/SlashCommand.js';
import { ARGUMENT_TYPE, SlashCommandArgument } from '../../../../slash-commands/SlashCommandArgument.js';
import { getContext, createDebugLogger, toast as showToast } from './utils.js';

const POSSESSION_METADATA_KEY = 'possession';

// ─── State ───

let possessedCharName = null;
let possessedCharAvatar = null;
let generationGuard = false;

/** @type {{ settings: object, saveSettings: function }} */
let ctx = null;

/** @type {{ handlePhrasingSeedReinjection: function, isPhrasing: function }} */
let phrasingApi = null;

let debug = () => {};

function toast(message, type = 'info') {
    if (!ctx.settings.possessionShowToast) return;
    showToast(message, type, 'Saint\'s Silly Extensions');
}

// ─── Public Getters ───

export function isPossessing() {
    return ctx.settings.possessionEnabled && possessedCharName !== null;
}

export function getPossessedCharName() {
    return possessedCharName;
}

export function isGenerationGuarded() {
    return generationGuard;
}

// ─── Persistence ───

function savePossessionState() {
    const context = getContext();
    context.chatMetadata[POSSESSION_METADATA_KEY] = {
        name: possessedCharName,
        avatar: possessedCharAvatar,
    };
    context.saveMetadata();
    debug('Saved possession state:', possessedCharName, '| avatar:', possessedCharAvatar);
}

export function loadPossessionState() {
    const context = getContext();
    const saved = context.chatMetadata?.[POSSESSION_METADATA_KEY] ?? null;
    if (saved && typeof saved === 'object') {
        possessedCharName = saved.name ?? null;
        possessedCharAvatar = saved.avatar ?? null;
    } else {
        possessedCharName = saved;
        possessedCharAvatar = null;
    }
    debug('Loaded possession state:', possessedCharName, '| avatar:', possessedCharAvatar);
}

// ─── Character Utilities ───

export function getPossessedCharacter() {
    if (!possessedCharName) return null;
    const context = getContext();
    if (possessedCharAvatar) {
        const byAvatar = context.characters.find(c => c.avatar === possessedCharAvatar);
        if (byAvatar) return byAvatar;
    }
    // In group chats, prefer the character whose avatar is in the group members list
    if (selected_group) {
        const group = groups.find(g => g.id === selected_group);
        if (group) {
            const groupChar = group.members
                .map(avatar => context.characters.find(c => c.avatar === avatar))
                .find(c => c && c.name === possessedCharName);
            if (groupChar) return groupChar;
        }
    }
    return context.characters.find(c => c.name === possessedCharName) ?? null;
}

function validatePossessedCharInGroup() {
    if (!selected_group || !possessedCharName) return;
    const group = groups.find(g => g.id === selected_group);
    if (!group) return;
    const context = getContext();
    const isMember = group.members.some(avatar => {
        if (possessedCharAvatar) return avatar === possessedCharAvatar;
        const char = context.characters.find(c => c.avatar === avatar);
        return char && char.name === possessedCharName;
    });
    if (!isMember) {
        debug('Possessed character removed from group, clearing');
        toast(`${possessedCharName} was removed from the group. Possession cleared.`, 'warning');
        setPossession(null);
    }
}

// ─── Core Logic ───

function setPossession(charName, charAvatar) {
    const previous = possessedCharName;
    possessedCharName = charName;
    if (charName) {
        if (charAvatar) {
            possessedCharAvatar = charAvatar;
        } else {
            const context = getContext();
            // In group chats, prefer the character whose avatar is in the group members list
            let char = null;
            if (selected_group) {
                const group = groups.find(g => g.id === selected_group);
                if (group) {
                    char = group.members
                        .map(avatar => context.characters.find(c => c.avatar === avatar))
                        .find(c => c && c.name === charName) ?? null;
                }
            }
            if (!char) {
                char = context.characters.find(c => c.name === charName) ?? null;
            }
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
            debug('Now possessing:', charName);
        } else if (previous) {
            toast('Possession cleared', 'info');
            debug('Possession cleared');
        }
    }
}

// ─── Message Posting ───

export async function postPossessedMessage(text) {
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
        extra: { possession: true },
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
    debug('Posted possessed message at index', messageIndex);
    return messageIndex;
}

// ─── Send Handling (MESSAGE_SENT) ───

export function onMessageSent(messageIndex) {
    if (!ctx.settings.possessionEnabled || !isPossessing()) return;
    if (phrasingApi?.isPhrasing()) return;

    const context = getContext();
    const message = context.chat[messageIndex];
    if (!message || !message.is_user) return;

    const char = getPossessedCharacter();
    if (!char) return;

    debug('Converting user message to possessed character message at index', messageIndex);

    message.is_user = false;
    message.name = char.name;
    message.force_avatar = char.avatar ? `/characters/${char.avatar}` : undefined;
    message.extra = { ...(message.extra || {}), possession: true };

    if (selected_group) {
        message.original_avatar = char.avatar;
        message.is_name = true;
    }

    debug('Converted message — name:', char.name);
}

// ─── Continue Interception ───

function handleContinueIntercept(event) {
    if (!ctx.settings.possessionEnabled || !isPossessing() || generationGuard) return;

    const textarea = document.getElementById('send_textarea');
    const text = textarea?.value?.trim();
    if (!text) return;

    event.stopImmediatePropagation();
    event.preventDefault();

    debug('Intercepted Continue with text:', text.substring(0, 50) + '...');
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

export function attachContinueInterceptor() {
    document.addEventListener('click', (event) => {
        if (!event.target.closest('#option_continue') && !event.target.closest('#mes_continue')) return;

        // Reinject phrasing seed if the last message was rephrased
        phrasingApi?.handlePhrasingSeedReinjection();

        handleContinueIntercept(event);
    }, { capture: true });
    debug('Attached continue interceptor');
}

// ─── UI: Group Radio Buttons ───

function injectGroupRadioButtons() {
    if (!selected_group) return;
    if (!ctx.settings.possessionEnabled) return;

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

        // Try chid first (character index)
        if (charId !== null) {
            const char = context.characters[parseInt(charId)];
            if (char) {
                charName = char.name;
                charAvatar = char.avatar;
            }
        }

        // Fallback to grid attribute (avatar filename)
        if (!charAvatar && gridAvatar) {
            const char = context.characters.find(c => c.avatar === gridAvatar);
            if (char) {
                charName = charName || char.name;
                charAvatar = char.avatar;
            } else {
                // grid is the avatar filename even if character lookup fails
                charAvatar = gridAvatar;
            }
        }

        // Fallback: extract avatar from the member's displayed image
        if (!charAvatar) {
            const img = entry.querySelector('img');
            if (img?.src) {
                const match = img.src.match(/[?&]file=([^&]+)|\/characters\/([^/?]+)/);
                const filename = match?.[1] || match?.[2];
                if (filename) {
                    const decoded = decodeURIComponent(filename);
                    charAvatar = decoded;
                    if (!charName) {
                        const char = context.characters.find(c => c.avatar === decoded);
                        if (char) charName = char.name;
                    }
                }
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

        const isActive = (possessedCharAvatar && charAvatar)
            ? possessedCharAvatar === charAvatar
            : possessedCharName === charName;
        if (isActive) {
            radio.classList.add('possession_active');
            entry.classList.add('possession_possessed');
        }

        radio.addEventListener('click', (event) => {
            event.stopPropagation();
            const isCurrentlyPossessed = (possessedCharAvatar && charAvatar)
                ? possessedCharAvatar === charAvatar
                : possessedCharName === charName;
            if (isCurrentlyPossessed) {
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
        const charAvatar = radio.dataset.charAvatar;
        const isActive = (possessedCharAvatar && charAvatar)
            ? possessedCharAvatar === charAvatar
            : charName === possessedCharName;
        radio.classList.toggle('possession_active', isActive);
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

// ─── UI: Solo Chat Button ───

function injectSoloButton() {
    if (selected_group) return;
    if (!ctx.settings.possessionEnabled) return;
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

        if (possessedCharName === char.name && (!possessedCharAvatar || possessedCharAvatar === char.avatar)) {
            setPossession(null);
        } else {
            setPossession(char.name, char.avatar);
        }
    });

    target.appendChild(btn);
    debug('Injected solo possess button');
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

// ─── UI: Impersonate Button Visibility ───

function hideImpersonateButtons() {
    const menuBtn = document.getElementById('option_impersonate');
    const quickBtn = document.getElementById('mes_impersonate');
    if (menuBtn) menuBtn.classList.add('possession_hidden');
    if (quickBtn) quickBtn.classList.add('possession_hidden');
    debug('Impersonate buttons hidden');
}

function showImpersonateButtons() {
    const menuBtn = document.getElementById('option_impersonate');
    const quickBtn = document.getElementById('mes_impersonate');
    if (menuBtn) menuBtn.classList.remove('possession_hidden');
    if (quickBtn) quickBtn.classList.remove('possession_hidden');
    debug('Impersonate buttons shown');
}

// ─── UI: Possession Impersonate Button (Character Avatar) ───

function injectPossessionImpersonateButton() {
    removePossessionImpersonateButton();

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

        debug('Possession impersonate clicked — triggering generation for', char.name);

        if (selected_group) {
            const radios = document.querySelectorAll('.possession_radio');
            for (const radio of radios) {
                const radioMatch = (possessedCharAvatar && radio.dataset.charAvatar)
                    ? radio.dataset.charAvatar === possessedCharAvatar
                    : radio.dataset.charName === possessedCharName;
                if (radioMatch) {
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
            debug('Speak button not found, falling back to /trigger');
            if (context.executeSlashCommandsWithOptions) {
                await context.executeSlashCommandsWithOptions(`/trigger ${char.name}`);
            }
        } else {
            if (context.executeSlashCommandsWithOptions) {
                await context.executeSlashCommandsWithOptions('/trigger');
            } else {
                const sendBtn = document.getElementById('send_but');
                if (sendBtn) sendBtn.click();
            }
        }
    });

    const phrasingBtn = document.getElementById('phrasing_send_button');
    if (phrasingBtn) {
        sendForm.insertBefore(btn, phrasingBtn);
    } else {
        sendForm.appendChild(btn);
    }

    debug('Injected possession impersonate button for', char.name);
}

function removePossessionImpersonateButton() {
    const btn = document.getElementById('possession_impersonate_btn');
    if (btn) btn.remove();
}

export function hidePossessionImpersonateButton() {
    const btn = document.getElementById('possession_impersonate_btn');
    if (btn) btn.classList.add('possession_hidden');
}

export function showPossessionImpersonateButton() {
    const btn = document.getElementById('possession_impersonate_btn');
    if (btn) btn.classList.remove('possession_hidden');
}

// ─── UI Sync ───

export function syncAllPossessionUI() {
    if (!ctx.settings.possessionEnabled) {
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

    if (isPossessing()) {
        hideImpersonateButtons();
        injectPossessionImpersonateButton();
    } else {
        showImpersonateButtons();
        removePossessionImpersonateButton();
    }
}

// ─── Generation Lifecycle ───

export function onGenerationStarted() {
    generationGuard = true;
    hidePossessionImpersonateButton();
}

export function onGenerationEnded() {
    generationGuard = false;
    syncAllPossessionUI();
}

// ─── Event Handlers ───

export function onGroupUpdated() {
    validatePossessedCharInGroup();
    removeGroupRadioButtons();
    injectGroupRadioButtons();
    syncGroupRadioButtons();
}

export function onCharacterPageLoaded() {
    if (!selected_group) {
        injectSoloButton();
        syncSoloButton();
    }
}

export function onGroupWrapperFinished() {
    syncAllPossessionUI();
}

// ─── Settings Panel ───

export function bindPossessionSettings(saveSettings) {
    const possessionEnabled = document.getElementById('possession_enabled');
    if (possessionEnabled) {
        possessionEnabled.checked = ctx.settings.possessionEnabled;
        possessionEnabled.addEventListener('change', (e) => {
            ctx.settings.possessionEnabled = e.target.checked;
            saveSettings();
            syncAllPossessionUI();
        });
    }

    const possessionShowToast = document.getElementById('possession_show_toast');
    if (possessionShowToast) {
        possessionShowToast.checked = ctx.settings.possessionShowToast;
        possessionShowToast.addEventListener('change', (e) => {
            ctx.settings.possessionShowToast = e.target.checked;
            saveSettings();
        });
    }

    const possessionDebugMode = document.getElementById('possession_debug_mode');
    if (possessionDebugMode) {
        possessionDebugMode.checked = ctx.settings.possessionDebugMode;
        possessionDebugMode.addEventListener('change', (e) => {
            ctx.settings.possessionDebugMode = e.target.checked;
            saveSettings();
            debug('debugMode toggled to', ctx.settings.possessionDebugMode);
        });
    }
}

// ─── Slash Commands ───

export function registerPossessionSlashCommands() {
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
                        setPossession(char.name, char.avatar);
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
                setPossession(match.name, match.avatar);
                return match.name;
            } else {
                const char = context.characters?.[context.characterId];
                if (char && char.name.toLowerCase().includes(nameLower)) {
                    setPossession(char.name, char.avatar);
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

    debug('Registered possession slash commands');
}

// ─── Init ───

/**
 * @param {object} options
 * @param {object} options.settings  - Shared mutable settings reference.
 * @param {object} options.phrasingApi - { isPhrasing(), handlePhrasingSeedReinjection() }
 */
export function initPossession({ settings, phrasingApi: pApi }) {
    ctx = { settings };
    phrasingApi = pApi;
    debug = createDebugLogger('POSSESSION', () => settings.possessionDebugMode);
}
