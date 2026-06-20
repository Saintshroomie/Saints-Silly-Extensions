/**
 * Group Director module — an LLM-chosen turn order for group chats.
 *
 * SillyTavern picks the next speaker in a group via fixed strategies (Manual /
 * Natural / List / Pooled) and exposes no hook to override that choice. Instead
 * of fighting that, the Director flips the active group to **Manual** (so ST
 * posts the user's message without auto-replying) and then, on each user turn,
 * runs a small "director" generation that reads the scene and names who should
 * speak next. The chosen member is triggered with ST's own
 * `Generate('normal', { force_chid })`, which forces one specific member to
 * reply, bypassing the strategy logic entirely.
 *
 * Because *we* author the director prompt and hand it a numbered roster, the
 * model only ever returns a tiny, controlled choice (a name or index) — there
 * is no need to parse the in-character reply.
 *
 * An optional confirm/override dialog lets the user accept the rolled pick or
 * pick a different cast member; a settings flag disables it for hands-off play.
 *
 * Possession-aware: if the director's chosen speaker is the character the user
 * is currently possessing, the Director yields silently (no dialog, no trigger)
 * so the user can reply as that character, exactly like native ST.
 *
 * Per-chat state lives under `context.chatMetadata.director` as
 * `{ previousStrategy }` — the group's activation strategy captured the moment
 * we flipped it to Manual, so it can be restored when the Director is disabled.
 */

import { SlashCommandParser } from '../../../../slash-commands/SlashCommandParser.js';
import { SlashCommand } from '../../../../slash-commands/SlashCommand.js';
import { editGroup, group_activation_strategy } from '../../../../group-chats.js';
import { removeReasoningFromString } from '../../../../reasoning.js';
import { Popup, POPUP_TYPE, POPUP_RESULT } from '../../../../popup.js';
import {
    getContext,
    createDebugLogger,
    toast,
    buildContextPreamble,
    streamingGenerate,
    withSingleLineDisabled,
    applyTemplateMacros,
    showPromptPreview,
} from './utils.js';
import { isSilentGenerationAbort } from './silent-generation.js';

// ─── Constants ───

const DIRECTOR_METADATA_KEY = 'director';

const MANUAL_STRATEGY = group_activation_strategy?.MANUAL ?? 2;

// The director user-prompt template. {{context}} is the packed chat/character/
// lore preamble; {{roster}} is the numbered list of eligible speakers. When a
// placeholder is absent the block is prepended/appended, so custom templates
// that drop one keep working.
export const DEFAULT_DIRECTOR_PROMPT =
    '{{context}}\n\nThe following characters are present in the scene:\n{{roster}}\n\n' +
    'Based on the conversation so far, decide which single character should speak ' +
    'next — choose whoever would most naturally respond or drive the scene forward. ' +
    'Reply with ONLY that character\'s name, exactly as written in the list above. ' +
    'Output nothing else.';

const DIRECTOR_SYSTEM_PROMPT =
    'You are the turn director for a multi-character roleplay. Your only job is to ' +
    'choose which one character should speak next. Respond with only the chosen ' +
    'character\'s name and nothing else — no punctuation, no explanation, no quotes.';

export const DEFAULT_DIRECTOR_RESPONSE_LENGTH = 32;

// ─── Module State ───

let moduleSettings = null;
let possessionApi = null;
let debug = () => {};

// Guards the decision phase (roll + dialog) so a second pass can't overlap. The
// triggered native generation is fenced by ST's own `isGenerating` instead.
let busy = false;

// ─── Per-chat State ───

function readState() {
    const context = getContext();
    const raw = context.chatMetadata?.[DIRECTOR_METADATA_KEY];
    return {
        previousStrategy: Number.isFinite(raw?.previousStrategy) ? raw.previousStrategy : null,
    };
}

function saveState(state) {
    const context = getContext();
    context.chatMetadata[DIRECTOR_METADATA_KEY] = {
        previousStrategy: Number.isFinite(state?.previousStrategy) ? state.previousStrategy : null,
    };
    context.saveMetadata();
}

// ─── Group / Roster Helpers ───

function getActiveGroup(ctx) {
    if (!ctx.groupId) return null;
    return (ctx.groups || []).find(g => g.id === ctx.groupId) || null;
}

/**
 * Build the eligible speaker roster: every group member that is not muted,
 * resolved to its `context.characters` index. Muted members live in ST's
 * `group.disabled_members`, so excluding that set carries the native "muted
 * characters don't speak" rule over to the Director. Characters are matched by
 * avatar filename (names collide in groups).
 *
 * @returns {{ chid: number, name: string, avatar: string }[]}
 */
function buildRoster(ctx, group) {
    const disabled = new Set(group.disabled_members || []);
    const roster = [];
    for (const avatar of group.members || []) {
        if (disabled.has(avatar)) continue;
        const chid = (ctx.characters || []).findIndex(c => c.avatar === avatar);
        if (chid === -1) continue;
        const char = ctx.characters[chid];
        if (!char) continue;
        roster.push({ chid, name: char.name, avatar });
    }
    return roster;
}

/** Whether a roster member is the character the user is currently possessing. */
function isPossessedMember(member) {
    if (!member || !possessionApi?.isPossessing?.()) return false;
    const possessed = possessionApi.getPossessedCharacter?.();
    if (possessed) {
        if (possessed.avatar && member.avatar) return possessed.avatar === member.avatar;
        if (possessed.name && member.name) return possessed.name === member.name;
    }
    const possessedName = possessionApi.getPossessedCharName?.();
    return !!possessedName && possessedName === member.name;
}

// ─── Manual-mode Management ───

/**
 * While the Director is enabled and a group is active, flip the group to Manual
 * reply order so ST stops auto-generating, capturing the group's previous
 * strategy (once) so it can be restored later.
 */
async function applyManualMode() {
    if (!moduleSettings?.directorEnabled) return;
    const ctx = getContext();
    const group = getActiveGroup(ctx);
    if (!group) return;

    const state = readState();
    if (state.previousStrategy === null) {
        const current = Number(group.activation_strategy);
        state.previousStrategy = Number.isFinite(current) ? current : MANUAL_STRATEGY;
        saveState(state);
    }

    if (Number(group.activation_strategy) !== MANUAL_STRATEGY) {
        group.activation_strategy = MANUAL_STRATEGY;
        try {
            await editGroup(group.id, true, false);
            debug('Flipped group to Manual reply order; previous strategy:', state.previousStrategy);
        } catch (err) {
            console.error('Group Director: failed to set Manual reply order:', err);
        }
    }
}

/** Restore the group's pre-Director reply strategy and clear the stored value. */
async function restoreStrategy() {
    const ctx = getContext();
    const state = readState();
    if (state.previousStrategy === null) return;

    const group = getActiveGroup(ctx);
    if (group && Number(group.activation_strategy) === MANUAL_STRATEGY) {
        group.activation_strategy = state.previousStrategy;
        try {
            await editGroup(group.id, true, false);
            debug('Restored group reply order to strategy:', state.previousStrategy);
        } catch (err) {
            console.error('Group Director: failed to restore reply order:', err);
        }
    }
    saveState({ previousStrategy: null });
}

// ─── Prompt Assembly ───

function resolveResponseLength() {
    const n = moduleSettings?.directorResponseLength;
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_DIRECTOR_RESPONSE_LENGTH;
}

/**
 * Assemble the director user prompt from the editable template. {{roster}} and
 * {{context}} are substituted in place; when a placeholder is absent the block
 * is appended (roster) / prepended (context) so old templates keep working.
 */
function composeDirectorPrompt(rosterBlock, contextBlock) {
    const configured = moduleSettings?.directorPrompt;
    const tpl = (typeof configured === 'string' && configured.trim())
        ? configured
        : DEFAULT_DIRECTOR_PROMPT;
    const { text, used } = applyTemplateMacros(tpl, {
        roster: rosterBlock || '',
        context: contextBlock || '',
    });
    let prompt = text;
    if (!used.has('roster') && rosterBlock) {
        prompt = `${prompt}\n\nCharacters present:\n${rosterBlock}`;
    }
    if (!used.has('context') && contextBlock) {
        prompt = `${contextBlock}\n\n${prompt}`;
    }
    return prompt;
}

function showDirectorPromptPreview() {
    const sampleRoster = '1. Susan\n2. Tony';
    const sampleContext =
        '(character cards, persona, selected lore books, and recent chat)';
    showPromptPreview('Group Director — Prompt Preview', [
        { label: 'System Prompt (fixed)', text: DIRECTOR_SYSTEM_PROMPT },
        { label: 'User Prompt (assembled, with sample values)', text: composeDirectorPrompt(sampleRoster, sampleContext) },
    ]);
}

// ─── Pick Parsing ───

function randomMember(roster) {
    return roster[Math.floor(Math.random() * roster.length)];
}

/**
 * Map the director's raw reply to one roster member. Tries a roster index, then
 * an exact name, then a contained name, then a partial name. Falls back to a
 * random member so the loop never crashes on an unexpected reply.
 */
function parsePick(text, roster) {
    const cleaned = String(text || '').replace(/[*_`"'.,!?:;()[\]{}]/g, ' ').trim();
    if (!cleaned) return randomMember(roster);

    const numMatch = cleaned.match(/\d+/);
    if (numMatch) {
        const idx = parseInt(numMatch[0], 10) - 1;
        if (idx >= 0 && idx < roster.length) return roster[idx];
    }

    const lower = cleaned.toLowerCase();
    let member = roster.find(r => r.name.toLowerCase() === lower);
    if (member) return member;

    member = roster.find(r => lower.includes(r.name.toLowerCase()));
    if (member) return member;

    if (lower.length >= 2) {
        member = roster.find(r => r.name.toLowerCase().includes(lower));
        if (member) return member;
    }

    debug('No roster match for director reply; choosing at random. Reply was:', text);
    return randomMember(roster);
}

// ─── Confirm / Override Dialog ───

/**
 * Show the rolled suggestion with a button per cast member to override it.
 * Resolves to the chosen member, or `null` if the user cancels.
 */
async function showDirectorDialog(roster, suggested) {
    const root = document.createElement('div');
    root.className = 'sse-director-dialog';

    const heading = document.createElement('div');
    heading.className = 'sse-director-heading';
    heading.innerHTML = 'The director suggests: <strong></strong>';
    heading.querySelector('strong').textContent = suggested.name;
    root.appendChild(heading);

    const hint = document.createElement('div');
    hint.className = 'sse-director-hint';
    hint.textContent = 'Confirm the suggestion, or choose who should speak next:';
    root.appendChild(hint);

    const choices = document.createElement('div');
    choices.className = 'sse-director-choices';
    root.appendChild(choices);

    let picked = null;
    const popup = new Popup(root, POPUP_TYPE.TEXT, '', {
        okButton: false,
        cancelButton: 'Cancel',
    });

    for (const member of roster) {
        const btn = document.createElement('div');
        btn.className = 'menu_button sse-director-choice';
        if (member.avatar === suggested.avatar && member.chid === suggested.chid) {
            btn.classList.add('sse-director-suggested');
        }
        btn.textContent = member.name;
        btn.addEventListener('click', () => {
            picked = member;
            popup.completeAffirmative();
        });
        choices.appendChild(btn);
    }

    const result = await popup.show();
    if (result === POPUP_RESULT.AFFIRMATIVE && picked) return picked;
    return null;
}

// ─── Trigger ───

function triggerMember(ctx, member) {
    debug('Triggering member:', member.name, '(chid', member.chid + ')');
    // Fire-and-forget: awaiting would hold the MESSAGE_SENT emit / dialog open
    // for the whole reply. ST's own isGenerating guard prevents overlap.
    Promise.resolve(ctx.generate('normal', { force_chid: member.chid })).catch(err => {
        console.error('Group Director: trigger failed:', err);
        toast(`Failed to trigger ${member.name}: ${err.message}`, 'error');
    });
}

// ─── Director Roll ───

async function rollDirector(ctx, roster) {
    const responseLength = resolveResponseLength();
    const rosterBlock = roster.map((m, i) => `${i + 1}. ${m.name}`).join('\n');
    const contextBlock = await buildContextPreamble({
        includeChat: true,
        responseLength,
        maxContextOverride: moduleSettings?.directorMaxContextOverride || 0,
    });
    const userPrompt = composeDirectorPrompt(rosterBlock, contextBlock);

    debug('Director roll — roster:', roster.map(m => m.name), 'prompt length:', userPrompt.length);

    // No visible target field is needed; stream into a detached scratch element.
    const scratch = document.createElement('textarea');
    const raw = await withSingleLineDisabled(() => streamingGenerate(
        { prompt: userPrompt, systemPrompt: DIRECTOR_SYSTEM_PROMPT, responseLength },
        scratch,
        { append: false },
    ));

    const text = removeReasoningFromString(raw || '').trim();
    debug('Director raw reply:', JSON.stringify(text));
    return parsePick(text, roster);
}

/**
 * Run one director turn: roll a next speaker, optionally confirm/override, then
 * trigger that member — unless the choice is the possessed character, in which
 * case yield to the user.
 *
 * @param {{ manual?: boolean }} [opts] - `manual` surfaces "wrong context"
 *   toasts that are silent on the automatic path.
 */
async function runDirector({ manual = false } = {}) {
    if (!moduleSettings?.directorEnabled) return;

    const ctx = getContext();
    if (!ctx.groupId) {
        if (manual) toast('Group Director only works in group chats.', 'warning');
        return;
    }
    if (busy) return;
    if (ctx.isGenerating) {
        if (manual) toast('Wait for the current generation to finish.', 'warning');
        return;
    }

    const group = getActiveGroup(ctx);
    if (!group) return;

    const roster = buildRoster(ctx, group);
    if (!roster.length) {
        if (manual) toast('Group Director: no eligible (unmuted) characters to choose from.', 'warning');
        return;
    }

    busy = true;
    try {
        // One eligible speaker needs no LLM call.
        const suggested = roster.length === 1 ? roster[0] : await rollDirector(ctx, roster);

        // Yield to the user when the suggestion is the character they possess.
        if (isPossessedMember(suggested)) {
            debug('Suggested speaker is the possessed character — yielding to the user.');
            return;
        }

        let chosen = suggested;
        if (moduleSettings.directorConfirm) {
            chosen = await showDirectorDialog(roster, suggested);
            if (!chosen) {
                debug('Director dialog cancelled.');
                return;
            }
            if (isPossessedMember(chosen)) {
                debug('Override is the possessed character — yielding to the user.');
                return;
            }
        }

        triggerMember(ctx, chosen);
    } catch (err) {
        if (isSilentGenerationAbort(err)) {
            debug('Director roll cancelled by user.');
        } else {
            console.error('Group Director error:', err);
            toast(`Group Director failed: ${err.message}`, 'error');
        }
    } finally {
        busy = false;
    }
}

// ─── Event Handlers ───

export function onDirectorChatChanged() {
    if (moduleSettings?.directorEnabled) {
        applyManualMode().catch(err => console.error('Group Director: applyManualMode failed:', err));
    } else if (readState().previousStrategy !== null) {
        // Self-heal: a chat we left in Manual mode, now that the Director is off.
        restoreStrategy().catch(err => console.error('Group Director: restoreStrategy failed:', err));
    }
}

export function onDirectorMessageSent(messageIndex) {
    if (!moduleSettings?.directorEnabled) return;
    const ctx = getContext();
    if (!ctx.groupId) return;
    const idx = Number.isInteger(messageIndex) ? messageIndex : ctx.chat.length - 1;
    const msg = ctx.chat?.[idx];
    // Only react to a genuine user message — Possession rewrites the send into a
    // character message, which should not drive a director turn.
    if (!msg || !msg.is_user) return;
    // Fire-and-forget so ST's send flow isn't blocked on the roll/dialog.
    runDirector({ manual: false }).catch(err => console.error('Group Director auto-run failed:', err));
}

// ─── Slash Commands ───

export function registerDirectorSlashCommands() {
    if (typeof SlashCommandParser?.addCommandObject !== 'function') return;
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'next',
        aliases: ['director'],
        callback: async () => {
            await runDirector({ manual: true });
            return '';
        },
        helpString: 'Group Director: roll for (and trigger) the next speaker in the current group chat.',
    }));
}

// ─── Settings Panel ───

export function bindDirectorSettings(saveSettings) {
    const enabledCb = document.getElementById('director_enabled');
    if (enabledCb) {
        enabledCb.checked = !!moduleSettings.directorEnabled;
        enabledCb.addEventListener('change', () => {
            moduleSettings.directorEnabled = enabledCb.checked;
            saveSettings();
            if (enabledCb.checked) {
                applyManualMode().catch(err => console.error('Group Director: applyManualMode failed:', err));
            } else {
                restoreStrategy().catch(err => console.error('Group Director: restoreStrategy failed:', err));
            }
        });
    }

    const confirmCb = document.getElementById('director_confirm');
    if (confirmCb) {
        confirmCb.checked = !!moduleSettings.directorConfirm;
        confirmCb.addEventListener('change', () => {
            moduleSettings.directorConfirm = confirmCb.checked;
            saveSettings();
        });
    }

    const responseLengthInput = document.getElementById('director_response_length');
    if (responseLengthInput) {
        responseLengthInput.value = moduleSettings.directorResponseLength || DEFAULT_DIRECTOR_RESPONSE_LENGTH;
        responseLengthInput.addEventListener('input', () => {
            const n = parseInt(responseLengthInput.value, 10);
            if (Number.isFinite(n) && n > 0) {
                moduleSettings.directorResponseLength = n;
                saveSettings();
            }
        });
    }

    const maxContextInput = document.getElementById('director_max_context_override');
    if (maxContextInput) {
        maxContextInput.value = moduleSettings.directorMaxContextOverride || 0;
        maxContextInput.addEventListener('input', () => {
            const n = parseInt(maxContextInput.value, 10);
            moduleSettings.directorMaxContextOverride = Number.isFinite(n) && n > 0 ? n : 0;
            saveSettings();
        });
    }

    const promptArea = document.getElementById('director_prompt_textarea');
    if (promptArea) {
        promptArea.value = moduleSettings.directorPrompt || DEFAULT_DIRECTOR_PROMPT;
        promptArea.addEventListener('input', () => {
            moduleSettings.directorPrompt = promptArea.value;
            saveSettings();
        });
    }

    document.getElementById('director_preview_btn')
        ?.addEventListener('click', showDirectorPromptPreview);

    const debugCb = document.getElementById('director_debug_mode');
    if (debugCb) {
        debugCb.checked = !!moduleSettings.directorDebugMode;
        debugCb.addEventListener('change', () => {
            moduleSettings.directorDebugMode = debugCb.checked;
            saveSettings();
        });
    }
}

// ─── Init ───

/**
 * @param {object} options
 * @param {object} options.settings - Shared mutable settings reference.
 * @param {object} options.possessionApi - { isPossessing, getPossessedCharacter, getPossessedCharName }.
 */
export function initDirector({ settings, possessionApi: possession }) {
    moduleSettings = settings;
    possessionApi = possession || null;
    debug = createDebugLogger('DIRECTOR', () => moduleSettings.directorDebugMode);
    debug('Module initialized');
}
