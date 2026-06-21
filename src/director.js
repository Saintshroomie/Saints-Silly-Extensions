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
 * After each user turn the Director chains several speakers back-to-back
 * (`directorConsecutiveTurns`, default 2), re-rolling once each reply settles and
 * stopping the moment the user cancels a turn. With confirm/override enabled the
 * dialog pops up **immediately** — before the decision is made — so the user can
 * just pick who replies next, while the roll runs behind it and reveals its
 * suggestion in place when it lands; a settings flag disables it for hands-off
 * play (a cancellable progress toast instead).
 *
 * The Director always voices its pick, including the possessed character.
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
    '{{context}}\n\nThe characters who can speak next are listed below, numbered:\n{{roster}}\n\n' +
    'Based on the conversation so far, decide which single character should speak ' +
    'next — choose whoever would most naturally respond or drive the scene forward. ' +
    'Reply with ONLY the number of that character from the list above — just the ' +
    'number, nothing else.';

const DIRECTOR_SYSTEM_PROMPT =
    'You are the turn director for a multi-character roleplay. Your only job is to ' +
    'choose which one character should speak next from a numbered roster. Respond ' +
    'with only the number of the chosen character and nothing else — no name, no ' +
    'punctuation, no explanation.';

export const DEFAULT_DIRECTOR_RESPONSE_LENGTH = 32;

// The pre-1.x director default asked the model to reply with the character's
// *name*; it now hands the model a numbered roster and asks for the roster
// *number* instead (more robust to parse). Installs that saved the old default
// verbatim — i.e. never customized the template — still carry the name-based
// text, which overrides the current default. `migrateDirectorPrompt` upgrades an
// **exact** match (in settings and in any saved preset) to the current default;
// any genuine edit won't match and is left untouched.
const LEGACY_NAME_DIRECTOR_PROMPT =
    '{{context}}\n\nThe following characters are present in the scene:\n{{roster}}\n\n' +
    'Based on the conversation so far, decide which single character should speak ' +
    'next — choose whoever would most naturally respond or drive the scene forward. ' +
    'Reply with ONLY that character\'s name, exactly as written in the list above. ' +
    'Output nothing else.';

/**
 * Upgrade a stale name-based director prompt to the current number-based default.
 * Idempotent and exact-match only, so user customizations are preserved.
 *
 * @param {object} settings - Shared mutable settings reference.
 * @returns {boolean} `true` if anything changed (caller should save settings).
 */
export function migrateDirectorPrompt(settings) {
    if (!settings || typeof settings !== 'object') return false;
    let changed = false;
    if (settings.directorPrompt === LEGACY_NAME_DIRECTOR_PROMPT) {
        settings.directorPrompt = DEFAULT_DIRECTOR_PROMPT;
        changed = true;
    }
    const presets = settings.toolPresets?.director;
    if (presets && typeof presets === 'object') {
        for (const preset of Object.values(presets)) {
            if (preset && preset.directorPrompt === LEGACY_NAME_DIRECTOR_PROMPT) {
                preset.directorPrompt = DEFAULT_DIRECTOR_PROMPT;
                changed = true;
            }
        }
    }
    return changed;
}

// Speaker-line detection. Two shapes are recognised:
//   1. Bracketed `[Name]:` — explicit, unambiguous, matched anywhere in the line
//      (so several walk-ons on one line are all caught).
//   2. Bare `Name:` at the START of a line — the shape the model actually emits,
//      because in its context window group speakers only ever appear as `Name:`
//      (never bracketed). Walk-on names aren't stop strings, so the model happily
//      tacks `WalkOn: "…"` onto the end of another character's reply; line-anchored
//      bare matching is what lets us split those back out. To keep false positives
//      down the bare form must begin a line, start with a capital, be 1–4
//      name-shaped words, and be followed by `: ` (colon + whitespace/quote).
// Group 1 = bracketed name, group 2 = bare name.
const SPEAKER_LINE_RE =
    /\[([^\]\n]{1,60})\][ \t]*:|^[ \t]*([\p{Lu}][\p{L}\p{N}'’.-]{0,30}(?:[ \t]+[\p{Lu}][\p{L}\p{N}'’.-]{0,30}){0,3})[ \t]*:(?=[\s"'“”‘’])/gmu;
const MAX_WALKON_NAME_LENGTH = 60;
const MAX_WALKONS = 50;

// Director chains this many chosen speakers per user turn (back-to-back), unless
// the user cancels a turn's dialog. Falls back when the setting is unset/invalid.
const DEFAULT_DIRECTOR_CONSECUTIVE_TURNS = 2;

// Names that look like `[Name]:` / `Name:` but aren't characters — bracketed
// meta-tags plus common capitalised sentence-openers and labels that the
// line-anchored bare matcher would otherwise mistake for a speaker.
const IGNORED_WALKON_TAGS = new Set([
    'ooc', 'system', 'note', 'notes', 'narrator', 'setting', 'scene', 'continue',
    'author', 'author\'s note', 'translation', 'time', 'status', 'a/n', 'an',
    'warning', 'tip', 'example', 'summary', 'step', 'chapter', 'part', 'location',
    'pov', 'edit', 'update', 'reminder', 'important', 'objective', 'goal', 'mission',
    'i', 'he', 'she', 'it', 'they', 'we', 'you', 'but', 'and', 'the', 'a', 'then',
    'so', 'well', 'no', 'yes', 'oh', 'okay', 'ok', 'meanwhile', 'later', 'suddenly',
    'finally', 'now', 'p.s', 'ps',
]);

/**
 * Find every speaker line (`[Name]:` anywhere, or a bare `Name:` at a line start)
 * in `text`, skipping meta-tags. Returns ordered matches with the name and the
 * offsets needed to split: `start` (where the speaker label begins) and
 * `contentStart` (just after the colon).
 *
 * @returns {Array<{ name: string, start: number, contentStart: number }>}
 */
function matchSpeakerLines(text) {
    const str = String(text || '');
    const out = [];
    SPEAKER_LINE_RE.lastIndex = 0;
    for (const m of str.matchAll(SPEAKER_LINE_RE)) {
        const name = ((m[1] ?? m[2]) || '').trim();
        if (!name || IGNORED_WALKON_TAGS.has(name.toLowerCase())) continue;
        out.push({ name, start: m.index, contentStart: m.index + m[0].length });
    }
    return out;
}

// ─── Module State ───

let moduleSettings = null;
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

// Set when the user clicks the progress toast to cancel. Aligned-mode generations
// go through ST's pipeline (generateQuietPrompt), which resolves rather than
// throwing on stop — so we check this flag after the call instead of relying on
// an AbortError (the lean/raw path still throws and is caught separately).
let generationAborted = false;

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
 * Build the speaker roster the director chooses from: every unmuted group member
 * (`kind: 'member'`, with a `chid` for `force_chid`) plus, when enabled, the
 * per-chat walk-on characters (`kind: 'walkon'`, name only — the director
 * generates and posts their reply itself). Muted members live in ST's
 * `group.disabled_members`. Members are matched by avatar (names collide).
 *
 * @returns {Array<{ kind: 'member', chid: number, name: string, avatar: string } | { kind: 'walkon', name: string }>}
 */
function buildRoster(ctx, group) {
    const disabled = new Set(group.disabled_members || []);
    const roster = [];
    const seenNames = new Set();
    for (const avatar of group.members || []) {
        if (disabled.has(avatar)) continue;
        const chid = (ctx.characters || []).findIndex(c => c.avatar === avatar);
        if (chid === -1) continue;
        const char = ctx.characters[chid];
        if (!char) continue;
        roster.push({ kind: 'member', chid, name: char.name, avatar });
        seenNames.add((char.name || '').toLowerCase());
    }
    if (moduleSettings?.directorIncludeWalkOns) {
        for (const name of loadWalkOns()) {
            const key = name.toLowerCase();
            if (seenNames.has(key)) continue;
            seenNames.add(key);
            roster.push({ kind: 'walkon', name });
        }
    }
    return roster;
}

/**
 * The `context.characters` index of the most recent AI speaker, used as the
 * aligned-mode `forceChId` anchor so the director's quiet generation reuses the
 * KV cache that the just-generated message left warm. Resolves by avatar first,
 * then name; returns null if no AI message resolves.
 */
function resolveAnchorChid(ctx) {
    const chat = ctx.chat || [];
    const chars = ctx.characters || [];
    for (let i = chat.length - 1; i >= 0; i--) {
        const m = chat[i];
        if (!m || m.is_user || m.is_system) continue;
        const avatar = m.original_avatar
            || (typeof m.force_avatar === 'string' ? m.force_avatar.replace(/^\/characters\//, '') : null);
        let chid = avatar ? chars.findIndex(c => c.avatar === avatar) : -1;
        if (chid === -1 && m.name) {
            chid = chars.findIndex(c => (c.name || '').toLowerCase() === m.name.toLowerCase());
        }
        if (chid !== -1) return chid;
    }
    return null;
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

/** Extract speaker names (`[Name]:` or a bare line-start `Name:`) from a message body. */
function extractWalkOnNames(text) {
    const names = [];
    const seen = new Set();
    for (const { name } of matchSpeakerLines(text)) {
        const key = name.toLowerCase();
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
 * Split a message body at its speaker boundaries — `[Name]:` anywhere or a bare
 * `Name:` at a line start (ignoring meta-tags). Returns `{ head, segments:
 * [{ name, text }] }`, where `head` is the text before the first speaker line and
 * each segment's text is the speaker's content with the `Name:` prefix stripped.
 */
function parseWalkOnSegments(text) {
    const str = String(text || '');
    const boundaries = matchSpeakerLines(str);
    if (!boundaries.length) return { head: str, segments: [] };
    const segments = boundaries.map((b, i) => {
        const end = i + 1 < boundaries.length ? boundaries[i + 1].start : str.length;
        return { name: b.name, text: str.slice(b.contentStart, end).trim() };
    });
    return { head: str.slice(0, boundaries[0].start), segments };
}

/**
 * Build a chat message posted under `name` (real character's avatar if known).
 * `tagSplit` marks split-produced messages so they're never re-split / offered a
 * split button; generated walk-on replies leave it off (no embedded line anyway).
 */
function makeSpeakerMessage(ctx, name, text, original, { tagSplit = true } = {}) {
    const char = (ctx.characters || []).find(c => (c.name || '').toLowerCase() === name.toLowerCase());
    const msg = {
        name: char ? char.name : name,
        is_user: false,
        is_system: false,
        send_date: original?.send_date ?? Date.now(),
        mes: text,
        extra: tagSplit ? { sseWalkOnSplit: true } : {},
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
 * Aligned mode routes the director's silent generations through ST's normal
 * pipeline (`generateQuietPrompt`) so their prompt prefix matches the chat and
 * the KV cache is reused — only the instruction tail is reprocessed. Lean mode
 * keeps the standalone raw path (smaller prompt, but cache-busting).
 */
function useAlignedContext(ctx) {
    return !!moduleSettings?.directorAlignedContext
        && typeof ctx.generateQuietPrompt === 'function';
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
    const sampleRoster = '1. Susan\n2. Tony (walk-on)';
    const sampleContext =
        '(character cards, persona, selected lore books, and recent chat)';
    showPromptPreview('Group Director — Prompt Preview', [
        { label: 'Speaker Pick — System Prompt (fixed)', text: DIRECTOR_SYSTEM_PROMPT },
        { label: 'Speaker Pick — User Prompt (assembled, with sample values)', text: composeDirectorPrompt(sampleRoster, sampleContext) },
    ]);
}

// ─── Pick Parsing ───

/**
 * Deterministic fallback for an unusable reply: the next real member (never a
 * walk-on) after the last character to speak, wrapping around the roster, and
 * skipping the last speaker itself. Falls back to the first member, then the
 * first roster entry, so it always returns something.
 */
function fallbackPick(roster, ctx) {
    const n = roster.length;
    const lastChid = resolveAnchorChid(ctx);
    let lastIdx = lastChid !== null
        ? roster.findIndex(r => r.kind === 'member' && r.chid === lastChid)
        : -1;
    for (let step = 1; step <= n; step++) {
        const idx = (((lastIdx + step) % n) + n) % n;
        const cand = roster[idx];
        if (cand.kind !== 'member') continue;
        if (idx === lastIdx) continue;
        return cand;
    }
    return roster.find(r => r.kind === 'member') || roster[0];
}

/** Stable identity compare for roster entries (members by chid, walk-ons by name). */
function sameRosterEntry(a, b) {
    if (!a || !b || a.kind !== b.kind) return false;
    return a.kind === 'member'
        ? a.chid === b.chid
        : a.name.toLowerCase() === b.name.toLowerCase();
}

/**
 * Map the director's raw reply to one roster member. Prefers the roster number
 * (what the prompt asks for), then an exact name, then a contained/partial name.
 * On an unusable reply, falls back deterministically (`fallbackPick`) to the next
 * real member after the last speaker so the loop never crashes.
 */
function parsePick(text, roster, ctx) {
    const cleaned = String(text || '').replace(/[*_`"'.,!?:;()[\]{}]/g, ' ').trim();
    if (!cleaned) return fallbackPick(roster, ctx);

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

    debug('No roster match for director reply; using deterministic fallback. Reply was:', text);
    return fallbackPick(roster, ctx);
}

// ─── Confirm / Override Dialog ───

/**
 * Decide the next speaker for one turn.
 *
 * With confirm/override on, the dialog opens **immediately** (before any decision)
 * so the user has the fast path of just picking someone, while the director's roll
 * runs behind it and reveals its suggestion when it lands. With confirm off, a
 * cancellable progress toast is shown and the rolled pick is returned directly.
 *
 * @returns {Promise<object|null>} The chosen roster entry, or `null` if cancelled.
 */
async function decideSpeaker(ctx, roster) {
    // One eligible speaker — nothing to decide or confirm.
    if (roster.length === 1) return roster[0];

    if (moduleSettings.directorConfirm) {
        return await chooseWithDialog(ctx, roster);
    }

    // Hands-off: roll behind a cancellable progress toast and trigger the pick.
    const dismiss = showRollProgressToast();
    try {
        return await rollDirector(ctx, roster);
    } catch (err) {
        if (isSilentGenerationAbort(err)) return null;
        throw err;
    } finally {
        dismiss();
    }
}

/** Abort an in-flight director roll (the lean path throws; aligned reads the flag). */
function abortRoll() {
    generationAborted = true;
    try { getContext().stopGeneration?.(); } catch { /* ignore */ }
    abortAllGenerations('director-cancel');
}

/**
 * Open the confirm/override dialog right away (carrying the "director is choosing"
 * status the progress toast used to show), run the roll concurrently, and reveal
 * the suggestion in-place when it resolves. The user can click any cast member at
 * any time — that wins immediately and the still-running roll is aborted.
 *
 * Resolves to the chosen roster entry, or `null` if the user cancels.
 */
async function chooseWithDialog(ctx, roster) {
    const root = document.createElement('div');
    root.className = 'sse-director-dialog';

    const heading = document.createElement('div');
    heading.className = 'sse-director-heading';
    heading.textContent = 'Director is choosing who speaks next…';
    root.appendChild(heading);

    const hint = document.createElement('div');
    hint.className = 'sse-director-hint';
    hint.textContent = 'Pick who should speak next, or wait for the director’s suggestion:';
    root.appendChild(hint);

    const choices = document.createElement('div');
    choices.className = 'sse-director-choices';
    root.appendChild(choices);

    let picked = null;
    let settled = false;
    const popup = new Popup(root, POPUP_TYPE.TEXT, '', {
        okButton: false,
        cancelButton: 'Cancel',
    });

    const btnByEntry = new Map();
    for (const member of roster) {
        const btn = document.createElement('div');
        btn.className = 'menu_button sse-director-choice';
        if (member.kind === 'walkon') btn.classList.add('sse-director-walkon');
        btn.textContent = member.kind === 'walkon' ? `${member.name} (walk-on)` : member.name;
        btn.addEventListener('click', () => {
            picked = member;
            settled = true;
            abortRoll(); // user chose — the suggestion is moot
            popup.completeAffirmative();
        });
        choices.appendChild(btn);
        btnByEntry.set(member, btn);
    }

    // Roll behind the open dialog; surface the suggestion when it lands.
    rollDirector(ctx, roster).then((suggested) => {
        if (settled) return;
        if (suggested) {
            heading.innerHTML = 'The director suggests: <strong></strong>';
            heading.querySelector('strong').textContent = suggested.name;
            hint.textContent = 'Confirm the suggestion, or choose who should speak next:';
            const entry = roster.find(r => sameRosterEntry(r, suggested));
            const btn = entry && btnByEntry.get(entry);
            if (btn) btn.classList.add('sse-director-suggested');
        } else {
            heading.textContent = 'Director cancelled — choose who speaks next:';
        }
    }).catch((err) => {
        if (settled) return;
        if (!isSilentGenerationAbort(err)) console.error('Group Director roll failed:', err);
        heading.textContent = 'Choose who should speak next:';
    });

    const result = await popup.show();
    settled = true;
    if (result === POPUP_RESULT.AFFIRMATIVE && picked) return picked;
    abortRoll(); // cancelled — stop the roll if it's still running
    return null;
}

// ─── Trigger ───

/**
 * Trigger a member's reply via ST's native `force_chid` generation and await it.
 * Awaiting is what lets `runDirector` chain the next turn only after this reply
 * has fully landed (the dialog is already closed by now, so there's no emit to
 * hold). Generation errors are surfaced but don't abort the chain.
 */
async function triggerMember(ctx, member) {
    debug('Triggering member:', member.name, '(chid', member.chid + ')');
    try {
        await ctx.generate('normal', { force_chid: member.chid });
    } catch (err) {
        console.error('Group Director: trigger failed:', err);
        toast(`Failed to trigger ${member.name}: ${err.message}`, 'error');
    }
}

// ─── Director Roll ───

/**
 * Sticky, click-to-cancel progress toast shown while a silent director
 * generation runs (it never surfaces ST's own Stop button). Clicking it aborts
 * via `abortAllGenerations`. Returns a dismiss callback.
 */
function cancellableProgressToast(message) {
    if (typeof toastr === 'undefined' || !toastr.info) return () => {};
    const $toast = toastr.info(message, undefined, {
        timeOut: 0,
        extendedTimeOut: 0,
        tapToDismiss: false,
        closeButton: false,
        onclick: () => {
            generationAborted = true;
            // Lean (raw) path: abort the silent job. Aligned path: stop the
            // pipeline generation. Call both — each is a no-op for the other.
            try { getContext().stopGeneration?.(); } catch { /* ignore */ }
            abortAllGenerations('director-cancel');
        },
    });
    let dismissed = false;
    return () => {
        if (dismissed) return;
        dismissed = true;
        if ($toast) toastr.clear($toast);
    };
}

function showRollProgressToast() {
    return cancellableProgressToast('Director is choosing who speaks next… (click to cancel)');
}

/**
 * Run the director generation and parse a pick. Pure — no progress UI of its own
 * (callers own that: the no-dialog path shows a cancellable toast, the confirm
 * path shows status in the open dialog). Returns the parsed pick, or `null` if
 * the generation was cancelled in aligned mode (the lean path throws instead).
 */
async function rollDirector(ctx, roster) {
    const responseLength = resolveResponseLength();
    const rosterBlock = roster
        .map((m, i) => `${i + 1}. ${m.name}${m.kind === 'walkon' ? ' (walk-on)' : ''}`)
        .join('\n');
    let text;
    if (useAlignedContext(ctx)) {
        // Aligned: build the *real* chat prompt and append our instruction at
        // the tail (quiet prompt), so the long prefix matches the chat and the
        // KV cache stays warm. Pinned to the last speaker's prompt.
        const quietPrompt = composeDirectorPrompt(rosterBlock, '');
        const forceChId = resolveAnchorChid(ctx);
        debug('Director roll (aligned) — anchor chid:', forceChId);
        const raw = await ctx.generateQuietPrompt({ quietPrompt, responseLength, forceChId, skipWIAN: false, removeReasoning: true });
        if (generationAborted) return null;
        text = String(raw || '').trim();
    } else {
        const contextBlock = await buildContextPreamble({
            includeChat: true,
            responseLength,
            maxContextOverride: moduleSettings?.directorMaxContextOverride || 0,
        });
        const userPrompt = composeDirectorPrompt(rosterBlock, contextBlock);
        debug('Director roll (lean) — prompt length:', userPrompt.length);
        // No visible target field is needed; stream into a detached scratch element.
        const scratch = document.createElement('textarea');
        const raw = await withSingleLineDisabled(() => streamingGenerate(
            { prompt: userPrompt, systemPrompt: DIRECTOR_SYSTEM_PROMPT, responseLength },
            scratch,
            { append: false },
        ));
        text = removeReasoningFromString(raw || '').trim();
    }
    debug('Director raw reply:', JSON.stringify(text));
    return parsePick(text, roster, ctx);
}

// ─── Walk-on Voicing ───

/** Remove the message at `idx` and re-render (used to undo a placeholder that produced nothing). */
async function removeMessageAt(ctx, idx) {
    if (idx < 0 || idx >= (ctx.chat?.length || 0)) return;
    ctx.chat.splice(idx, 1);
    await ctx.saveChat();
    if (typeof ctx.printMessages === 'function') await ctx.printMessages();
}

/** Collapse a multi-swipe message down to just its active swipe (drops the placeholder). */
function collapseToActiveSwipe(ctx, idx) {
    const m = ctx.chat?.[idx];
    if (!m || !Array.isArray(m.swipes) || m.swipes.length <= 1) return;
    const id = Number(m.swipe_id) || 0;
    const activeText = m.swipes[id];
    const activeInfo = Array.isArray(m.swipe_info) ? m.swipe_info[id] : undefined;
    m.swipes = [activeText];
    m.swipe_info = [activeInfo || {}];
    m.swipe_id = 0;
    m.mes = activeText;
}

/**
 * Voice a walk-on the native way: post a thin `…` placeholder under the name, then
 * drive ST's own swipe-regeneration on it (the same path as pressing the swipe
 * arrow) so the reply comes from the real pipeline — native formatting, stop
 * strings, and name handling, with no custom prompt or sanitizing. The throwaway
 * placeholder swipe is collapsed away afterward. ST shows its own generation
 * indicator and Stop button, so there's no extension progress toast; if the user
 * stops it before any text arrives, the placeholder is removed. Walk-ons only
 * exist in group chats, where `ctx.swipe.right` is always available.
 */
async function generateAndPostWalkOn(ctx, name) {
    if (!ctx.groupId || typeof ctx.swipe?.right !== 'function') {
        toast('Group Director: walk-ons can only be voiced in a group chat.', 'warning');
        return;
    }
    const placeholder = makeSpeakerMessage(ctx, name, '…', null, { tagSplit: false });
    ctx.chat.push(placeholder);
    const idx = ctx.chat.length - 1;
    if (typeof ctx.addOneMessage === 'function') ctx.addOneMessage(placeholder);
    await ctx.saveChat();
    try {
        // Overswipe → regenerate → Generate('swipe'); awaits the full generation.
        await ctx.swipe.right();
        await waitForGroupSettle();
        const text = String(ctx.chat?.[idx]?.mes || '').trim();
        if (!text || text === '…') {
            await removeMessageAt(ctx, idx);
            debug('Native walk-on swipe produced nothing for', name);
            return;
        }
        collapseToActiveSwipe(ctx, idx);
        await ctx.saveChat();
        if (typeof ctx.printMessages === 'function') await ctx.printMessages();
        debug('Voiced walk-on natively for', name, '— length', text.length);
    } catch (err) {
        debug('Native walk-on swipe threw:', err);
        await removeMessageAt(ctx, idx);
    }
}

/** Route a chosen roster entry: real members via force_chid, walk-ons via generation. Awaits either. */
async function triggerChoice(ctx, chosen) {
    if (chosen.kind === 'walkon') {
        await generateAndPostWalkOn(ctx, chosen.name);
    } else {
        await triggerMember(ctx, chosen);
    }
}

/** How many speakers the director chains back-to-back per invocation. */
function resolveConsecutiveTurns() {
    const n = moduleSettings?.directorConsecutiveTurns;
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_DIRECTOR_CONSECUTIVE_TURNS;
}

/**
 * Run the director: choose a next speaker (confirm/override dialog or hands-off
 * roll) and trigger that speaker — a real member via `force_chid`, or a walk-on
 * by generating and posting its reply. Repeats for up to `turns` speakers
 * back-to-back (default `directorConsecutiveTurns`), re-rolling after each reply
 * settles, and stops early the moment the user cancels a turn's dialog/roll. The
 * director always voices its pick — even the possessed character.
 *
 * @param {{ manual?: boolean, turns?: number }} [opts] - `manual` surfaces
 *   "wrong context" toasts that are silent on the automatic path; `turns`
 *   overrides the configured chain length (e.g. `/next` steps a single speaker).
 */
async function runDirector({ manual = false, turns } = {}) {
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

    const total = Number.isFinite(turns) && turns > 0 ? Math.floor(turns) : resolveConsecutiveTurns();

    busy = true;
    try {
        for (let turn = 0; turn < total; turn++) {
            // Re-fetch each turn: the previous reply mutated the chat (and roster
            // membership/unshallow state can shift across a triggered generation).
            const turnCtx = getContext();
            if (!turnCtx.groupId) break;
            const group = getActiveGroup(turnCtx);
            if (!group) {
                debug('runDirector stopping — no active group object');
                break;
            }

            const roster = buildRoster(turnCtx, group);
            debug(`Turn ${turn + 1}/${total} roster:`, roster.map(m => m.name));
            if (!roster.length) {
                if (manual && turn === 0) toast('Group Director: no eligible (unmuted) characters to choose from.', 'warning');
                debug('runDirector stopping — empty roster');
                break;
            }

            generationAborted = false;
            let chosen;
            try {
                chosen = await decideSpeaker(turnCtx, roster);
            } catch (err) {
                if (isSilentGenerationAbort(err)) chosen = null;
                else throw err;
            }

            if (!chosen) {
                debug('Director turn cancelled / no pick — stopping chain at turn', turn + 1);
                if (generationAborted) toast('Director cancelled.', 'info');
                break;
            }

            // We have a valid pick; clear any abort flag the dialog set when it
            // closed its (now-irrelevant) background roll, then voice the speaker
            // and wait for the reply to settle before the next turn rolls.
            generationAborted = false;
            await triggerChoice(turnCtx, chosen);
            await waitForGroupSettle();
        }
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
            // Manual step — a single speaker (the auto path chains several).
            await runDirector({ manual: true, turns: 1 });
            return '';
        },
        helpString: 'Group Director: roll for (and trigger) the next single speaker in the current group chat.',
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

    const consecutiveInput = document.getElementById('director_consecutive_turns');
    if (consecutiveInput) {
        consecutiveInput.value = moduleSettings.directorConsecutiveTurns || DEFAULT_DIRECTOR_CONSECUTIVE_TURNS;
        consecutiveInput.addEventListener('input', () => {
            const n = parseInt(consecutiveInput.value, 10);
            if (Number.isFinite(n) && n > 0) {
                moduleSettings.directorConsecutiveTurns = n;
                saveSettings();
            }
        });
    }

    const alignedCb = document.getElementById('director_aligned_context');
    if (alignedCb) {
        alignedCb.checked = !!moduleSettings.directorAlignedContext;
        alignedCb.addEventListener('change', () => {
            moduleSettings.directorAlignedContext = alignedCb.checked;
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

    const includeWalkOnsCb = document.getElementById('director_include_walkons');
    if (includeWalkOnsCb) {
        includeWalkOnsCb.checked = !!moduleSettings.directorIncludeWalkOns;
        includeWalkOnsCb.addEventListener('change', () => {
            moduleSettings.directorIncludeWalkOns = includeWalkOnsCb.checked;
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
 */
export function initDirector({ settings }) {
    moduleSettings = settings;
    debug = createDebugLogger('DIRECTOR', () => moduleSettings.directorDebugMode);
    debug('Module initialized');
}
