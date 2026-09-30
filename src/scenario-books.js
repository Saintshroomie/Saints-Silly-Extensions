/**
 * Scenario books and lore scoping — pure helpers for Narrative Guidance.
 * No SillyTavern imports, so they're unit-tested under plain Node
 * (test/scenario-books.test.mjs); callers pass the loaded books, tag map
 * data and characters in.
 *
 * - Scenario discovery: st-toolkit builds each world's scenarios into a
 *   `<world>-scenarios` book, one disabled entry per scenario, commented
 *   `Scenario — <Title>` and filtered to the world's character tag. A chat
 *   whose group or characters carry that tag gets that world's scenarios.
 * - Character filters: which lore entries every character in the chat may
 *   see, mirroring ST's own per-character filter check, so guidance that is
 *   injected into everyone's prompt is never built from one character's
 *   private or shared-secret entries.
 * - The chat's default lore books: the books ST would currently apply.
 */

// ─── Scenario Entries ───

const SCENARIO_COMMENT_RE = /^\s*Scenario\s*[—–-]\s*(.+?)\s*$/;

/**
 * The title of an st-toolkit scenario entry (`Scenario — <Title>`), or null
 * when the entry isn't one.
 *
 * @param {{ comment?: string }} entry
 * @returns {string|null}
 */
export function scenarioTitle(entry) {
    const match = String(entry?.comment ?? '').match(SCENARIO_COMMENT_RE);
    return match ? match[1] : null;
}

/**
 * The scenarios a chat can use: st-toolkit scenario entries whose Character
 * Filter includes one of the chat's tags (the group's own tags or any
 * member's). Excluding filters and entries without content are skipped.
 * Entries are returned sorted by book, then title.
 *
 * @param {{ name: string, entries: object }[]} books - loaded World Info books
 * @param {string[]} chatTagIds - tag IDs on the group and its characters
 * @returns {{ book: string, uid: number|string, title: string, content: string }[]}
 */
export function findTaggedScenarios(books, chatTagIds) {
    const tags = new Set(chatTagIds || []);
    if (!tags.size) return [];
    const found = [];
    for (const { name, entries } of books || []) {
        for (const [key, entry] of Object.entries(entries || {})) {
            const title = scenarioTitle(entry);
            if (!title) continue;
            const content = typeof entry.content === 'string' ? entry.content.trim() : '';
            if (!content) continue;
            const filter = entry.characterFilter;
            if (!filter || filter.isExclude) continue;
            if (!(filter.tags || []).some(tag => tags.has(tag))) continue;
            found.push({ book: name, uid: entry.uid ?? key, title, content });
        }
    }
    return found.sort((a, b) => a.book.localeCompare(b.book) || a.title.localeCompare(b.title));
}

// ─── Character Filters ───

/** ST's filter key for a character: the avatar file without its extension. */
export function characterFileName(avatar) {
    return String(avatar || '').replace(/\.[^/.]+$/, '');
}

/**
 * Whether ST would let `character` see `entry`, mirroring the check in
 * world-info.js: a names filter, then a tags filter, each inverted by
 * `isExclude`. As in ST, the tag check is skipped when the character has no
 * tag-map entry (`tagIds` not an array).
 *
 * @param {{ characterFilter?: { names?: string[], tags?: string[], isExclude?: boolean } }} entry
 * @param {{ fileName: string, tagIds?: string[]|null }} character
 * @returns {boolean}
 */
export function entryPassesCharacterFilter(entry, character) {
    const filter = entry?.characterFilter;
    if (!filter) return true;
    const exclude = !!filter.isExclude;
    if (Array.isArray(filter.names) && filter.names.length > 0) {
        const included = filter.names.includes(character.fileName);
        if (exclude ? included : !included) return false;
    }
    if (Array.isArray(filter.tags) && filter.tags.length > 0 && Array.isArray(character.tagIds)) {
        const included = character.tagIds.some(tag => filter.tags.includes(tag));
        if (exclude ? included : !included) return false;
    }
    return true;
}

/**
 * Whether every character in the chat may see `entry`. Guidance built from
 * an entry is injected into every character's prompt, so an entry only some
 * of them can see (a private layer, a shared secret) must stay out of it.
 * With no characters to check against, nothing is filtered.
 *
 * @param {object} entry
 * @param {{ fileName: string, tagIds?: string[]|null }[]} characters
 * @returns {boolean}
 */
export function entryVisibleToAll(entry, characters) {
    if (!Array.isArray(characters) || !characters.length) return true;
    return characters.every(character => entryPassesCharacterFilter(entry, character));
}

// ─── Default Lore Books ───

/**
 * A character's own lore books, as ST loads them for its turns: the linked
 * (primary) book, then any additional books from `world_info.charLore`.
 *
 * @param {{ avatar?: string, data?: { extensions?: { world?: string } } }} character
 * @param {{ name: string, extraBooks?: string[] }[]} [charLore] - `world_info.charLore`
 * @returns {string[]}
 */
export function characterLoreBooks(character, charLore = []) {
    const names = [];
    const primary = character?.data?.extensions?.world;
    if (primary) names.push(primary);
    const fileName = characterFileName(character?.avatar);
    const extra = (charLore || []).find(e => e?.name === fileName);
    for (const name of extra?.extraBooks || []) {
        if (name && !names.includes(name)) names.push(name);
    }
    return names;
}

/**
 * The lore books ST currently applies to a chat, in its own order: global
 * (active) books, the chat's bound book, the persona's book, and — in a
 * one-on-one chat — the character's linked and additional books. A group's
 * character books are left out: ST loads each only for that member's own
 * turns, and they hold the members' private layers. Duplicates are dropped,
 * and when `available` is given, so are books ST doesn't know about.
 *
 * @param {object} sources
 * @param {string[]} [sources.globalBooks]
 * @param {string|null} [sources.chatBook]
 * @param {string|null} [sources.personaBook]
 * @param {string[]} [sources.characterBooks]
 * @param {boolean} [sources.isGroup]
 * @param {string[]} [sources.available]
 * @returns {string[]}
 */
export function defaultChatLoreBooks({
    globalBooks = [],
    chatBook = null,
    personaBook = null,
    characterBooks = [],
    isGroup = false,
    available = [],
} = {}) {
    const ordered = [...globalBooks, chatBook, personaBook, ...(isGroup ? [] : characterBooks)];
    const known = available.length ? new Set(available) : null;
    const out = [];
    for (const name of ordered) {
        if (!name || out.includes(name)) continue;
        if (known && !known.has(name)) continue;
        out.push(name);
    }
    return out;
}
