/**
 * Group Director — pure parsing helpers: speaker-line detection (walk-on
 * learning and splitting) and mapping the director's reply to a roster
 * entry. No SillyTavern imports, so they're unit-tested under plain Node
 * (see test/); `ctx` arguments are plain SillyTavern context objects (only
 * `chat` and `characters` are read).
 */

// ─── Speaker Lines ───

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
export function matchSpeakerLines(text) {
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

/**
 * Split a message body at its speaker boundaries — `[Name]:` anywhere or a bare
 * `Name:` at a line start (ignoring meta-tags). Returns `{ head, segments:
 * [{ name, text }] }`, where `head` is the text before the first speaker line and
 * each segment's text is the speaker's content with the `Name:` prefix stripped.
 */
export function parseWalkOnSegments(text) {
    const str = String(text || '');
    const boundaries = matchSpeakerLines(str);
    if (!boundaries.length) return { head: str, segments: [] };
    const segments = boundaries.map((b, i) => {
        const end = i + 1 < boundaries.length ? boundaries[i + 1].start : str.length;
        return { name: b.name, text: str.slice(b.contentStart, end).trim() };
    });
    return { head: str.slice(0, boundaries[0].start), segments };
}

// ─── Roster Picks ───

/**
 * The `context.characters` index of the most recent AI speaker, used as the
 * aligned-mode `forceChId` anchor so the director's quiet generation reuses the
 * KV cache that the just-generated message left warm. Resolves by avatar first,
 * then name; returns null if no AI message resolves.
 */
export function resolveAnchorChid(ctx) {
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

/**
 * Deterministic fallback for an unusable reply: the next real member (never a
 * walk-on) after the last character to speak, wrapping around the roster, and
 * skipping the last speaker itself. Falls back to the first member, then the
 * first roster entry, so it always returns something.
 */
export function fallbackPick(roster, ctx) {
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

/**
 * Re-resolve a roster member's `context.characters` index at the moment of use.
 * Avatar filenames are the stable identity (names collide in groups); the index
 * is not, because ST rebuilds the array as it unshallows members. Falls back to
 * the name, then to the captured index only if it still points at that member.
 *
 * @returns {number|null} A validated index, or null if the character is gone.
 */
export function resolveMemberChid(ctx, member) {
    const chars = ctx.characters || [];
    if (member.avatar) {
        const byAvatar = chars.findIndex(c => c?.avatar === member.avatar);
        if (byAvatar !== -1) return byAvatar;
    }
    if (member.name) {
        const byName = chars.findIndex(c => (c?.name || '').toLowerCase() === member.name.toLowerCase());
        if (byName !== -1) return byName;
    }
    const captured = member.chid;
    if (Number.isInteger(captured) && chars[captured]) return captured;
    return null;
}

/** Stable identity compare for roster entries (members by chid, walk-ons by name). */
export function sameRosterEntry(a, b) {
    if (!a || !b || a.kind !== b.kind) return false;
    return a.kind === 'member'
        ? a.chid === b.chid
        : a.name.toLowerCase() === b.name.toLowerCase();
}

/**
 * Map the director's raw reply to one roster member. Prefers the roster number
 * (what the prompt asks for), then an exact name, then a contained/partial name.
 * On an unusable reply, falls back deterministically (`fallbackPick`) to the next
 * real member after the last speaker so the loop never crashes. `onNoMatch`
 * is called with the raw reply when that fallback kicks in (for logging).
 */
export function parsePick(text, roster, ctx, onNoMatch = () => {}) {
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

    onNoMatch(text);
    return fallbackPick(roster, ctx);
}

// ─── Walk-on Voicing ───

// Generation types that regenerate or extend the chat's last message in place
// (the only ones that can target a walk-on message, which has no card to draft).
const IN_PLACE_GENERATION_TYPES = new Set(['swipe', 'continue']);

/** Whether a generation `type` works on the last message in place (swipe / continue). */
export function isInPlaceGeneration(type) {
    return IN_PLACE_GENERATION_TYPES.has(type);
}

/**
 * The walk-on name a message speaks as, or null when it belongs to a real
 * character (or the user/system). Walk-on messages carry the name in
 * `extra.sseWalkOn`; split messages made before that tag existed are recognised
 * by shape — split-produced, no host avatar, and no card by that name.
 *
 * @returns {string|null}
 */
export function walkOnNameOf(message, characters) {
    if (!message || message.is_user || message.is_system) return null;
    const tagged = message.extra?.sseWalkOn;
    if (typeof tagged === 'string' && tagged.trim()) return tagged.trim();
    if (message.extra?.sseWalkOnSplit && !message.original_avatar && message.name) {
        const lower = String(message.name).toLowerCase();
        const isCharacter = (characters || []).some(c => (c?.name || '').toLowerCase() === lower);
        if (!isCharacter) return message.name;
    }
    return null;
}

/**
 * The group member whose generation slot a walk-on borrows. SillyTavern only
 * swipes/continues a group message it can map to a character (by
 * `original_avatar`), so a card-less walk-on needs a host: its existing one if
 * that still resolves, else the last real speaker when they're in the group,
 * else the first unmuted member, else the first member.
 *
 * @returns {string|null} The host's avatar file, or null if the group has none.
 */
export function pickWalkOnHostAvatar(ctx, group, message) {
    const chars = ctx.characters || [];
    const exists = avatar => !!avatar && chars.some(c => c?.avatar === avatar);
    if (exists(message?.original_avatar)) return message.original_avatar;
    const members = (group?.members || []).filter(exists);
    const anchor = resolveAnchorChid(ctx);
    const anchorAvatar = anchor !== null ? chars[anchor]?.avatar : null;
    if (anchorAvatar && members.includes(anchorAvatar)) return anchorAvatar;
    const disabled = new Set(group?.disabled_members || []);
    return members.find(a => !disabled.has(a)) || members[0] || null;
}
