/**
 * Group member rows — resolving the character a row in ST's group panel
 * (`#rm_group_members .group_member`) stands for. No SillyTavern imports, so
 * it's unit-tested under plain Node (test/group-members.test.mjs); callers
 * pass the row element and `context.characters`.
 *
 * ST has marked the row two ways:
 *   - `data-chid="<index>"` — current builds (ST commit 7c9b347, Jan 2025,
 *     "Refactor chid/grid attributes to data attributes").
 *   - `chid="<index>"` — older builds.
 * Both hold an index into `context.characters`. The row's thumbnail URL names
 * the avatar file directly, so it's the cross-check and the last resort: an
 * index can go stale if the characters array is rebuilt after the row was
 * rendered, the file name can't.
 */

/**
 * The avatar file named by a row's thumbnail, e.g.
 * `/thumbnail?type=avatar&file=Peter.png` or `/characters/Peter.png`.
 *
 * @param {{ querySelector: Function }} entry
 * @returns {string|null}
 */
export function avatarFromRowThumbnail(entry) {
    const src = entry?.querySelector?.('img')?.getAttribute?.('src') || '';
    const match = src.match(/[?&]file=([^&]+)|\/characters\/([^/?]+)/);
    const file = match?.[1] || match?.[2];
    if (!file) return null;
    try {
        return decodeURIComponent(file);
    } catch {
        return file;
    }
}

/** The character index a row carries: `data-chid` (current ST) or `chid` (older). */
function rowIndex(entry) {
    for (const attr of ['data-chid', 'chid']) {
        const raw = entry?.getAttribute?.(attr);
        if (raw === null || raw === undefined || String(raw).trim() === '') continue;
        const index = Number(raw);
        if (Number.isInteger(index) && index >= 0) return index;
    }
    return null;
}

/**
 * Resolve a group member row to its character.
 *
 * Order: the row's index attribute (`data-chid`, then `chid`), checked
 * against the thumbnail's avatar file (the file wins if they disagree), then
 * a legacy `grid` avatar attribute, then the thumbnail alone. The name falls
 * back to the row's `.ch_name` text when no character matched.
 *
 * @param {{ getAttribute: Function, querySelector: Function }} entry
 * @param {object[]} characters - `context.characters`
 * @returns {{ character: object|null, avatar: string|null, name: string|null }}
 */
export function resolveGroupMemberRow(entry, characters) {
    const list = Array.isArray(characters) ? characters : [];
    const byAvatar = avatar => (avatar ? list.find(c => c?.avatar === avatar) || null : null);

    const index = rowIndex(entry);
    const thumbAvatar = avatarFromRowThumbnail(entry);
    let character = index !== null ? list[index] || null : null;
    if (thumbAvatar && character?.avatar !== thumbAvatar) {
        character = byAvatar(thumbAvatar) || character;
    }
    const gridAvatar = entry?.getAttribute?.('grid') || null;
    if (!character) character = byAvatar(gridAvatar);

    const avatar = character?.avatar || gridAvatar || thumbAvatar || null;
    const nameEl = entry?.querySelector?.('.ch_name');
    const name = character?.name
        || nameEl?.textContent?.trim()
        || nameEl?.getAttribute?.('title')
        || null;
    return { character, avatar, name };
}
