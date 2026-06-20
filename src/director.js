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
import { editGroup, group_activation_strategy, is_group_generating } from '../../../../group-chats.js';
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
import { isSilentGenerationAbort, abortAllGenerations } from './silent-generation.js';

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

// Walk-on detection: a speaker line is a bracket-delimited name followed by a
// colon, e.g. `[Tony Stark]: "Hello."`. The brackets delimit a (possibly
// multi-word) name unambiguously. Not line-anchored, so multiple walk-ons in
// one message — even on the same line — are all detected.
const WALKON_SPEAKER_RE = /\[([^\]\n]{1,60})\][ \t]*:/g;
const MAX_WALKON_NAME_LENGTH = 60;
const MAX_WALKONS = 50;

// Common bracketed meta-tags that look like `[Name]:` but aren't characters.
const IGNORED_WALKON_TAGS = new Set([
    'ooc', 'system', 'note', 'notes', 'narrator', 'setting', 'scene', 'continue',
    'author', 'author\'s note', 'translation', 'time', 'status', 'a/n', 'an',
]);

// ─── Module State ───

let moduleSettings = null;
let possessionApi = null;
let debug = () => {};

// Guards the decision phase (roll + dialog) so a second pass can't overlap. The
// triggered native generation is fenced by `is_group_generating` instead.
let busy = false;

// Set on every user MESSAGE_SENT (possession-agnostic — we never read is_user),
// consumed when the next group wrapper finishes. This is what tells the
// wrapper-finished handler that the just-completed wrapper followed a *user*
// turn (vs a director-triggered member reply, which emits no MESSAGE_SENT).
let userTurnPending = false;

// Debounce timer for the walk-on textarea (write-through is immediate; only the
// saveMetadata flush is debounced).
let walkOnSaveTimer = null;

// ─── Per-chat State ───

function readState() {
    const context = getContext();
    const raw = context.chatMetadata?.[DIRECTOR_METADATA_KEY];
    return {
        previousStrategy: Number.isFinite(raw?.previousStrategy) ? raw.previousStrategy : null,
        walkOns: Array.isArray(raw?.walkOns)
            ? raw.walkOns.filter(n => typeof n === 'string' && n.trim())
            : [],
    };
}

/** Write the per-chat director state into chatMetadata without flushing. */
function writeState(state) {
    const context = getContext();
    context.chatMetadata[DIRECTOR_METADATA_KEY] = {
        previousStrategy: Number.isFinite(state?.previousStrategy) ? state.previousStrategy : null,
        walkOns: Array.isArray(state?.walkOns) ? state.walkOns : [],
    };
}

function saveState(state) {
    writeState(state);
    getContext().saveMetadata();
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
    // Preserve walkOns (and anything else) — only clear the captured strategy.
    state.previousStrategy = null;
    saveState(state);
}

// ─── Walk-on Detection ───

/** Names that are real cast (group members + user persona), not walk-ons. */
function buildExcludedNameSet(ctx) {
    const set = new Set();
    if (ctx.name1) set.add(ctx.name1.trim().toLowerCase());
    const group = getActiveGroup(ctx);
    if (group) {
        for (const avatar of group.members || []) {
            const char = (ctx.characters || []).find(c => c.avatar === avatar);
            if (char?.name) set.add(char.name.trim().toLowerCase());
        }
    }
    return set;
}

/** Extract bracket-delimited speaker names (`[Name]:`) from a message body. */
function extractWalkOnNames(text) {
    const names = [];
    const seen = new Set();
    WALKON_SPEAKER_RE.lastIndex = 0;
    for (const m of String(text || '').matchAll(WALKON_SPEAKER_RE)) {
        const name = (m[1] || '').trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (IGNORED_WALKON_TAGS.has(key)) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        names.push(name);
    }
    return names;
}

function loadWalkOns() {
    return readState().walkOns;
}

function normalizeWalkOns(names) {
    const seen = new Set();
    const out = [];
    for (const raw of names) {
        const name = (raw || '').trim().slice(0, MAX_WALKON_NAME_LENGTH).trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(name);
    }
    return out.slice(-MAX_WALKONS);
}

function sameList(a, b) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * Merge newly-detected names into the per-chat list, dropping anything that is a
 * real cast member or the persona, or already known. Returns the list of names
 * that were actually newly added (empty if nothing changed).
 */
function addWalkOns(names) {
    const ctx = getContext();
    const excluded = buildExcludedNameSet(ctx);
    const state = readState();
    const known = new Set(state.walkOns.map(n => n.toLowerCase()));
    const fresh = [];
    for (const raw of names) {
        const name = (raw || '').trim();
        const key = name.toLowerCase();
        if (!name || excluded.has(key) || known.has(key)) continue;
        known.add(key);
        fresh.push(name);
    }
    if (!fresh.length) return [];

    const combined = normalizeWalkOns([...state.walkOns, ...fresh]);
    if (sameList(combined, state.walkOns)) return [];

    state.walkOns = combined;
    saveState(state);
    refreshWalkOnPanel();
    return fresh;
}

/** Scan one message's text for walk-on speaker lines and learn any new names. */
function scanMessageForWalkOns(index) {
    const ctx = getContext();
    if (!moduleSettings?.directorWalkOnsEnabled) return;
    if (!ctx.groupId) return;
    const idx = Number.isInteger(index) ? index : ctx.chat.length - 1;
    const msg = ctx.chat?.[idx];
    if (!msg || msg.is_system || typeof msg.mes !== 'string' || !msg.mes.trim()) return;
    const names = extractWalkOnNames(msg.mes);
    if (!names.length) return;
    const added = addWalkOns(names);
    if (added.length) {
        debug('Learned walk-on(s):', added);
        toast(
            `Walk-on ${added.length === 1 ? 'character' : 'characters'} detected: ${added.join(', ')}`,
            'success',
        );
    }
}

/**
 * Detached scan for a message index. Runs on `MESSAGE_SENT` / `MESSAGE_RECEIVED`
 * / `MESSAGE_EDITED`; deferred via `setTimeout(0)` so member characters are
 * fully unshallowed before we build the excluded-names set (same unshallow race
 * the roster hits mid-pipeline).
 */
export function onDirectorScanForWalkOns(messageIndex) {
    if (!moduleSettings?.directorWalkOnsEnabled) return;
    const idx = Number.isInteger(messageIndex) ? messageIndex : undefined;
    setTimeout(() => {
        try {
            scanMessageForWalkOns(idx);
        } catch (err) {
            console.error('Group Director walk-on scan failed:', err);
        }
    }, 0);
}

/** Scan every message in the current chat (manual backfill). */
function scanWholeChatForWalkOns() {
    const ctx = getContext();
    if (!ctx.groupId) {
        toast('Walk-on detection only runs in group chats.', 'warning');
        return;
    }
    const found = [];
    const seen = new Set();
    for (const msg of ctx.chat || []) {
        if (!msg || msg.is_system || typeof msg.mes !== 'string') continue;
        for (const name of extractWalkOnNames(msg.mes)) {
            const key = name.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            found.push(name);
        }
    }
    const added = addWalkOns(found);
    toast(added.length
        ? `Found ${added.length} new walk-on${added.length === 1 ? '' : 's'}: ${added.join(', ')}`
        : 'No new walk-on characters found.', added.length ? 'success' : 'info');
}

// ─── Walk-on Message Splitting ───
//
// Promote `[Name]:` speaker lines embedded in a message into their own messages,
// posted under each name (with the matching character's avatar when the name is
// a real character, otherwise a nameplate-only walk-on) — as if ST had posted
// them. Deterministic (no LLM). The chat array is spliced and re-rendered via
// `printMessages`, so it works at any position.

let splitBusy = false;

function delayMs(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/** Wait until the group turn has fully settled before mutating the chat. */
async function waitForGroupSettle(timeoutMs = 8000) {
    const start = Date.now();
    while (is_group_generating) {
        if (Date.now() - start > timeoutMs) return false;
        await delayMs(100);
    }
    await delayMs(50);
    return true;
}

/**
 * Split a message body at its `[Name]:` speaker boundaries (ignoring meta-tags).
 * Returns `{ head, segments: [{ name, text }] }`, where `head` is the text
 * before the first speaker line and each segment's text is the speaker's
 * content with the `[Name]:` prefix stripped.
 */
function parseWalkOnSegments(text) {
    const str = String(text || '');
    const boundaries = [];
    WALKON_SPEAKER_RE.lastIndex = 0;
    for (const m of str.matchAll(WALKON_SPEAKER_RE)) {
        const name = (m[1] || '').trim();
        if (!name || IGNORED_WALKON_TAGS.has(name.toLowerCase())) continue;
        boundaries.push({ name, start: m.index, contentStart: m.index + m[0].length });
    }
    if (!boundaries.length) return { head: str, segments: [] };
    const segments = boundaries.map((b, i) => {
        const end = i + 1 < boundaries.length ? boundaries[i + 1].start : str.length;
        return { name: b.name, text: str.slice(b.contentStart, end).trim() };
    });
    return { head: str.slice(0, boundaries[0].start), segments };
}

/** Build a chat message posted under `name` (real character's avatar if known). */
function makeSpeakerMessage(ctx, name, text, original) {
    const char = (ctx.characters || []).find(c => (c.name || '').toLowerCase() === name.toLowerCase());
    const msg = {
        name: char ? char.name : name,
        is_user: false,
        is_system: false,
        send_date: original?.send_date ?? Date.now(),
        mes: text,
        extra: { sseWalkOnSplit: true },
    };
    if (char?.avatar) {
        msg.force_avatar = `/characters/${char.avatar}`;
        if (ctx.groupId) msg.original_avatar = char.avatar;
    }
    if (ctx.groupId) msg.is_name = true;
    return msg;
}

/** Construct the ordered replacement messages for a split. */
function buildSplitMessages(ctx, original, parsed) {
    const replacements = [];
    const headText = parsed.head.trim();
    if (headText) {
        // Keep the original message's identity, trimmed to the leading text.
        // Drop stale swipes (content changed). No split tag — a later edit that
        // re-introduces a speaker line should still be splittable.
        const kept = { ...original, mes: headText };
        delete kept.swipes;
        delete kept.swipe_id;
        delete kept.swipe_info;
        replacements.push(kept);
    }
    for (const seg of parsed.segments) {
        if (!seg.text) continue;
        replacements.push(makeSpeakerMessage(ctx, seg.name, seg.text, original));
    }
    return replacements;
}

/**
 * Split the message at `index` into separate named messages. Returns the number
 * of new messages created (0 = nothing to split).
 */
async function splitWalkOnsInMessage(index) {
    if (splitBusy) return 0;
    const ctx = getContext();
    const msg = ctx.chat?.[index];
    if (!msg || typeof msg.mes !== 'string') return 0;
    if (msg.extra?.sseWalkOnSplit) return 0;

    const parsed = parseWalkOnSegments(msg.mes);
    if (!parsed.segments.length) return 0;

    const replacements = buildSplitMessages(ctx, msg, parsed);
    if (!replacements.length) return 0;
    const newCount = replacements.length - (parsed.head.trim() ? 1 : 0);

    splitBusy = true;
    try {
        ctx.chat.splice(index, 1, ...replacements);
        await ctx.saveChat();
        await ctx.printMessages();
        debug('Split walk-on message at', index, '→', replacements.length, 'message(s)');
        return newCount;
    } finally {
        splitBusy = false;
    }
}

/**
 * Auto-split path (AI replies only): after the group turn settles, split the
 * referenced message if it carries embedded walk-on lines. Tracks the message
 * by object reference so a shifted index (e.g. the director appended a reply)
 * still resolves.
 */
async function maybeAutoSplit(messageIndex) {
    if (!moduleSettings?.directorWalkOnSplitAuto) return;
    const ctx = getContext();
    if (!ctx.groupId) return;
    const idx = Number.isInteger(messageIndex) ? messageIndex : ctx.chat.length - 1;
    const msg = ctx.chat?.[idx];
    if (!msg || msg.extra?.sseWalkOnSplit) return;
    if (!parseWalkOnSegments(String(msg.mes || '')).segments.length) return;

    await waitForGroupSettle();
    const liveIdx = getContext().chat.indexOf(msg);
    if (liveIdx === -1) return; // message was swiped/deleted while we waited
    await splitWalkOnsInMessage(liveIdx);
}

/**
 * Auto-split a freshly-received AI message (wired to `MESSAGE_RECEIVED` only —
 * user/edited messages use the per-message button, which avoids reordering
 * against the director's own triggered reply).
 */
export function onDirectorMaybeSplit(messageIndex) {
    if (!moduleSettings?.directorWalkOnSplitAuto) return;
    const idx = Number.isInteger(messageIndex) ? messageIndex : undefined;
    maybeAutoSplit(idx).catch(err => console.error('Group Director auto-split failed:', err));
}

// ─── Walk-on Split Button ───

function makeSplitButton() {
    const btn = document.createElement('div');
    btn.className = 'mes_button sse-walkon-split-button fa-solid fa-scissors interactable';
    btn.title = 'Split [Name]: walk-on lines in this message into separate messages';
    btn.tabIndex = 0;
    btn.addEventListener('click', onSplitButtonClick);
    return btn;
}

function onSplitButtonClick(event) {
    const mesEl = event.currentTarget.closest('.mes');
    if (!mesEl) return;
    const index = parseInt(mesEl.getAttribute('mesid'), 10);
    if (Number.isNaN(index)) return;
    if (is_group_generating) {
        toast('Wait for the current generation to finish.', 'warning');
        return;
    }
    splitWalkOnsInMessage(index)
        .then(n => { if (!n) toast('No walk-on lines to split in this message.', 'info'); })
        .catch(err => console.error('Group Director split failed:', err));
}

/** Inject (or remove) the split button on a `.mes` based on its content. */
function injectSplitButtonInto(mesEl) {
    if (!(mesEl instanceof HTMLElement) || !mesEl.matches?.('.mes')) return;
    if (mesEl.getAttribute('is_system') === 'true') return;
    const buttons = mesEl.querySelector('.mes_buttons');
    if (!buttons) return;
    const existing = buttons.querySelector('.sse-walkon-split-button');

    const ctx = getContext();
    const index = parseInt(mesEl.getAttribute('mesid'), 10);
    const msg = !Number.isNaN(index) ? ctx.chat?.[index] : null;
    const splittable = !!ctx.groupId && !!msg && !msg.extra?.sseWalkOnSplit
        && parseWalkOnSegments(String(msg.mes || '')).segments.length > 0;

    if (!splittable) {
        existing?.remove();
        return;
    }
    if (existing) return;
    const extra = buttons.querySelector('.extraMesButtons');
    const btn = makeSplitButton();
    if (extra) buttons.insertBefore(btn, extra);
    else buttons.appendChild(btn);
}

/** (Re)scan every message and inject/refresh split buttons. */
export function rescanSplitButtons() {
    document.querySelectorAll('#chat .mes').forEach(injectSplitButtonInto);
}

let splitObserverInstalled = false;

/** Keep the per-message split button present as ST re-renders message nodes. */
export function startDirectorObserver() {
    if (splitObserverInstalled) return;
    splitObserverInstalled = true;
    const chat = document.getElementById('chat');
    if (!chat) return;
    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (!(node instanceof HTMLElement)) continue;
                if (node.matches?.('.mes')) injectSplitButtonInto(node);
                node.querySelectorAll?.('.mes').forEach(injectSplitButtonInto);
            }
        }
    });
    observer.observe(chat, { childList: true, subtree: true });
    rescanSplitButtons();
    debug('Split-button observer installed');
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

/**
 * Sticky, click-to-cancel progress toast shown while the silent director roll
 * runs (the roll never surfaces ST's own Stop button). Clicking it aborts the
 * generation via `abortAllGenerations`. Returns a dismiss callback.
 */
function showRollProgressToast() {
    if (typeof toastr === 'undefined' || !toastr.info) return () => {};
    const $toast = toastr.info('Director is choosing who speaks next… (click to cancel)', undefined, {
        timeOut: 0,
        extendedTimeOut: 0,
        tapToDismiss: false,
        closeButton: false,
        onclick: () => abortAllGenerations('director-cancel'),
    });
    let dismissed = false;
    return () => {
        if (dismissed) return;
        dismissed = true;
        if ($toast) toastr.clear($toast);
    };
}

async function rollDirector(ctx, roster) {
    const responseLength = resolveResponseLength();
    const rosterBlock = roster.map((m, i) => `${i + 1}. ${m.name}`).join('\n');
    const dismissProgress = showRollProgressToast();
    try {
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
    } finally {
        dismissProgress();
    }
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
    debug('runDirector — manual:', manual);
    if (!moduleSettings?.directorEnabled) {
        debug('runDirector skipped — disabled');
        return;
    }

    const ctx = getContext();
    if (!ctx.groupId) {
        if (manual) toast('Group Director only works in group chats.', 'warning');
        debug('runDirector skipped — not a group chat');
        return;
    }
    if (busy) {
        debug('runDirector skipped — already busy');
        return;
    }
    // Only the manual path can race a live generation; the auto path runs after
    // the group wrapper finishes, so is_group_generating is already false there.
    if (manual && is_group_generating) {
        toast('Wait for the current generation to finish.', 'warning');
        debug('runDirector skipped — generation in progress');
        return;
    }

    const group = getActiveGroup(ctx);
    if (!group) {
        debug('runDirector skipped — no active group object');
        return;
    }

    const roster = buildRoster(ctx, group);
    debug('Roster:', roster.map(m => m.name));
    if (!roster.length) {
        if (manual) toast('Group Director: no eligible (unmuted) characters to choose from.', 'warning');
        debug('runDirector skipped — empty roster');
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
            toast('Director cancelled.', 'info');
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
    refreshWalkOnPanel();
}

/**
 * Mark that a user turn happened. Fires on `MESSAGE_SENT` (a genuine user send —
 * including a possessed send, which Possession rewrites to a character message,
 * but the event still fires). A director-triggered member reply emits
 * `MESSAGE_RECEIVED`, not `MESSAGE_SENT`, so it never sets this flag — which is
 * how the wrapper-finished handler tells a user turn from a triggered reply.
 *
 * Deliberately does NOT roll or build a roster here: `MESSAGE_SENT` fires
 * mid-pipeline while group members are still being unshallowed, so the roster
 * would be empty. The roll happens later, on the settled wrapper.
 */
export function onDirectorMessageSent() {
    if (!moduleSettings?.directorEnabled) return;
    if (!getContext().groupId) return;
    userTurnPending = true;
    debug('User turn registered');
}

/**
 * Auto-trigger after a group turn settles. Fires on `GROUP_WRAPPER_FINISHED`
 * (not `MESSAGE_SENT`): by then ST's send pipeline is done, members are fully
 * loaded (so the roster isn't empty), and `is_group_generating` is false.
 *
 * Rolls only when the wrapper followed a user turn (`userTurnPending`, set on
 * `MESSAGE_SENT`). A director-triggered member reply sets no such flag, so it
 * never re-rolls — no loop. The flag is consumed on *every* wrapper finish so a
 * `continue`-with-text turn (which fires `MESSAGE_SENT` then a non-normal
 * wrapper) can't leak it into a later turn.
 *
 * @param {{ selected_group?: string, type?: string }} [data] - Wrapper payload.
 */
export function onDirectorGroupWrapperFinished(data) {
    const wasUserTurn = userTurnPending;
    userTurnPending = false;

    if (!moduleSettings?.directorEnabled) return;
    if (!getContext().groupId) return;
    if (busy) return;
    if (!wasUserTurn) {
        debug('Group wrapper finished — not a user turn; no roll');
        return;
    }
    // Only react to a normal turn — skip swipe/continue/impersonate/quiet wrappers.
    const type = data?.type;
    if (type && type !== 'normal') {
        debug('Group wrapper finished — ignoring type:', type);
        return;
    }
    debug('Group wrapper finished on a user turn — scheduling director roll');
    // Defer so ST's Generate stack fully unwinds (releasing is_send_press) before
    // we roll and trigger force_chid.
    setTimeout(() => {
        runDirector({ manual: false }).catch(err => console.error('Group Director auto-run failed:', err));
    }, 0);
}

// ─── Send-button Interceptor ───

/**
 * Capture-phase handler: when the user presses Send with an **empty** input box
 * in a group, run the director instead of ST's default (which, in our Manual
 * reply order, would pick a random member). A normal send with text is left
 * alone — the `MESSAGE_SENT` → `userTurnPending` path rolls after it.
 */
function onSendButtonClickCapture(event) {
    if (!event.target.closest?.('#send_but')) return;
    if (!moduleSettings?.directorEnabled) return;
    if (!getContext().groupId) return;
    const textarea = document.getElementById('send_textarea');
    if (textarea?.value?.trim()) return; // has input — let ST send it normally
    if (is_group_generating) return; // a turn is already running

    event.stopImmediatePropagation();
    event.preventDefault();
    if (textarea) {
        textarea.value = '';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
    debug('Empty send intercepted — running director');
    runDirector({ manual: true }).catch(err => console.error('Group Director empty-send failed:', err));
}

export function attachDirectorSendInterceptor() {
    document.addEventListener('click', onSendButtonClickCapture, { capture: true });
    debug('Attached send interceptor');
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

// ─── Walk-on List Panel ───

/** Write the edited textarea through to chatMetadata, debouncing the flush. */
function scheduleWalkOnSave(names) {
    const state = readState();
    state.walkOns = normalizeWalkOns(names);
    writeState(state);
    if (walkOnSaveTimer) clearTimeout(walkOnSaveTimer);
    walkOnSaveTimer = setTimeout(() => {
        walkOnSaveTimer = null;
        getContext().saveMetadata();
    }, 300);
}

function updateWalkOnCount() {
    const el = document.getElementById('director_walkons_count');
    if (el) el.textContent = String(loadWalkOns().length);
}

/** Repopulate the textarea from the current chat's list (never clobber typing). */
function refreshWalkOnPanel() {
    const textarea = document.getElementById('director_walkons_textarea');
    if (textarea && document.activeElement !== textarea) {
        textarea.value = loadWalkOns().join('\n');
    }
    updateWalkOnCount();
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

    // Walk-on detection
    const walkOnsCb = document.getElementById('director_walkons_enabled');
    if (walkOnsCb) {
        walkOnsCb.checked = !!moduleSettings.directorWalkOnsEnabled;
        walkOnsCb.addEventListener('change', () => {
            moduleSettings.directorWalkOnsEnabled = walkOnsCb.checked;
            saveSettings();
        });
    }

    const splitAutoCb = document.getElementById('director_walkon_split_auto');
    if (splitAutoCb) {
        splitAutoCb.checked = !!moduleSettings.directorWalkOnSplitAuto;
        splitAutoCb.addEventListener('change', () => {
            moduleSettings.directorWalkOnSplitAuto = splitAutoCb.checked;
            saveSettings();
        });
    }

    const walkOnsArea = document.getElementById('director_walkons_textarea');
    if (walkOnsArea) {
        walkOnsArea.addEventListener('input', () => {
            scheduleWalkOnSave(walkOnsArea.value.split('\n'));
            updateWalkOnCount();
        });
    }

    document.getElementById('director_walkons_scan')
        ?.addEventListener('click', scanWholeChatForWalkOns);

    const debugCb = document.getElementById('director_debug_mode');
    if (debugCb) {
        debugCb.checked = !!moduleSettings.directorDebugMode;
        debugCb.addEventListener('change', () => {
            moduleSettings.directorDebugMode = debugCb.checked;
            saveSettings();
        });
    }

    refreshWalkOnPanel();
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
