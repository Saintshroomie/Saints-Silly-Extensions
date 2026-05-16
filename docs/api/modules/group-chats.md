# group-chats.js

State and helpers for SillyTavern group chats — the currently selected group, its members, generation-mode enums, and the load/create/edit lifecycle.

**Import path from a third-party extension:**

```js
import {
    selected_group,
    is_group_generating,
    groups,
    getGroupChat,
    getGroupMembers,
    getGroupNames,
    findGroupMemberId,
    getGroupDepthPrompts,
    getGroupCharacterCards,
    openGroupById,
    editGroup,
    group_activation_strategy,
    group_generation_mode,
} from '../../../group-chats.js';
```

See also the [group chats guide](../guides/group-chats.md) for higher-level patterns.

## Exports at a glance

| Export | Kind | Summary |
|--------|------|---------|
| `selected_group` | live binding | Currently open group id, or `null` for solo chat. |
| `is_group_generating` | live binding | `true` while group generation is in progress. |
| `groups` | live binding | The mutable array of all loaded `Group` objects. |
| `group_activation_strategy` | enum | How the next-to-speak member is chosen. |
| `group_generation_mode` | enum | How character cards are merged across members. |
| `DEFAULT_AUTO_MODE_DELAY` | const | Default seconds between auto-mode turns (`5`). |
| `groupCandidatesFilter` | FilterHelper | Filter for the "add members" list. |
| `groupMembersFilter` | FilterHelper | Filter for the current members list. |
| `getGroupChat` | async fn | Loads the chat file for a group and renders it. |
| `getGroupMembers` | fn | Returns `Character[]` for the group's members. |
| `getGroupNames` | fn | Returns the names of the current group's members. |
| `findGroupMemberId` | fn | Resolves an index or name to a character id (or detail object). |
| `getGroupDepthPrompts` | fn | Returns each member's `@Depth` prompt for the current turn. |
| `getGroupCharacterCards` | fn | Merged description/personality/scenario/mesExamples for the group. |
| `getGroupCharacterCardsLazy` | fn | Same as `getGroupCharacterCards`, but each field is a lazy getter. |
| `renameGroupMember` | async fn | Renames a member across every group and every group chat. |
| `getGroupBlock` | fn | Builds the DOM `.group_select` block for the character list. |
| `editGroup` | async fn | Saves a group (debounced unless `immediately`). |
| `unshallowGroupMembers` | async fn | Forces full-load of every member character. |
| `openGroupById` | async fn | Switches the UI to the given group. |
| `createNewGroupChat` | async fn | Creates a fresh chat under the given group. |
| `getGroupPastChats` | async fn | Returns chat metadata for every chat under the group. |
| `openGroupChat` | async fn | Opens a specific chat id under the given group. |

## Reference

### State

#### `selected_group: string | null`

Live binding. Currently opened group id, or `null` when a solo character (or nothing) is selected. Always read it freshly — do not destructure-and-keep.

#### `is_group_generating: boolean`

Live binding. `true` from when the first member starts generating until the last one is done. Pair with `waitUntilCondition` to wait out a group turn.

#### `groups: Group[]`

Live mutable array of all loaded groups. Look up by id:

```js
const group = groups.find(g => g.id === selected_group);
```

### Member access

#### `getGroupChat(groupId, reload?) → Promise<void>`

Validates the group, unshallows its members, loads the chat file from disk, renders messages, and fires `CHAT_CHANGED` (plus `GROUP_CHAT_CREATED` if the chat was empty). Pass `reload=true` to also reload the group selection UI.

#### `getGroupMembers(groupId = selected_group) → Character[]`

Returns the resolved `Character` object for every avatar listed in `group.members`. Missing characters become `undefined` entries.

#### `getGroupNames() → string[]`

Member names of the **currently selected** group only (ignores its argument-less signature). Returns `[]` when no group is open.

#### `findGroupMemberId(arg, full?) → number | { id, avatar, name, index } | undefined`

Resolves `arg` to a 0-based character id within the current group. `arg` can be a numeric string (0-based member index) or any text — text input is matched against avatars and names via Fuse fuzzy search. Pass `full=true` to receive a detail object instead of just the id.

#### `getGroupDepthPrompts(groupId, characterId) → { depth, text, role }[]`

Collects the per-member `@Depth` injection prompts (from `character.data.extensions.depth_prompt`). Disabled members are skipped unless they are the currently-speaking `characterId`. Returns `[]` when the group's generation mode is `SWAP`.

#### `getGroupCharacterCards(groupId, characterId) → { description, personality, scenario, mesExamples } | null`

Returns the joined character-card text the prompt builder injects for the active group turn. Each field is a string with prefix/suffix transforms applied. Returns `null` if the group has no generation mode set or no members.

#### `getGroupCharacterCardsLazy(groupId, characterId) → { description, personality, scenario, mesExamples } | null`

Same as above, but each property is a lazy getter — the underlying `baseChatReplace` work only runs when first accessed. Use when you may only need one of the fields.

### Group lifecycle

#### `editGroup(id, immediately, reload?) → Promise<void>`

Saves the group. When `immediately` is `false`, the save is debounced. `reload` (default `true`) re-renders the group list afterwards.

#### `createNewGroupChat(groupId) → Promise<void>`

Clears the chat, pushes a new `humanizedDateTime()` chat id onto the group's `chats` array, sets it as `chat_id`, saves, and re-renders.

#### `unshallowGroupMembers(groupId) → Promise<void>`

For each member, calls `unshallowCharacter` so all character fields are present in memory. Required before composing prompts from member data.

#### `openGroupChat(groupId, chatId) → Promise<void>`

Switches the active group to `chatId` (which must already exist in `group.chats`).

#### `openGroupById(groupId) → Promise<boolean>`

UI-level "open this group". Bails out if a chat save is in progress or generation is running. Returns `true` if the group was actually switched to.

#### `renameGroupMember(oldAvatar, newAvatar, newName) → Promise<void>`

Walks every group and every chat under each group, replacing references to `oldAvatar` and updating message names. Called by [`characters.js`](./characters.md) after a character rename.

#### `getGroupBlock(group) → JQuery<HTMLElement>`

Clones the `#group_list_template` element, fills in name/member-count/tags/avatar, and returns the jQuery node ready for insertion into the character list.

#### `getGroupPastChats(groupId) → Promise<ChatInfo[]>`

POSTs `/api/chats/group/info` for each chat id in the group, returning the array of `ChatInfo` results.

### Constants & enums

#### `group_activation_strategy`

```js
{
    NATURAL: 0,   // pick by name/message activation
    LIST: 1,      // strict round-robin through the member list
    MANUAL: 2,    // user picks each turn
    POOLED: 3,    // random pool of enabled members
}
```

#### `group_generation_mode`

```js
{
    SWAP: 0,             // only the speaking character's card is used
    APPEND: 1,           // all enabled members' cards merged
    APPEND_DISABLED: 2,  // all members' cards merged, including disabled
}
```

#### `DEFAULT_AUTO_MODE_DELAY: number`

`5` — default seconds between auto-mode turns.

### Filters

#### `groupCandidatesFilter: FilterHelper`

`FilterHelper` driving the "Add members" list. Debounced rerender via `printGroupCandidates`.

#### `groupMembersFilter: FilterHelper`

`FilterHelper` driving the current-members list. Debounced rerender via `printGroupMembers`.

## Notes

The module also exports (via the top `export { ... }` block) `openGroupId`, `is_group_automode_enabled`, `hideMutedSprites`, `group_generation_id`, `saveGroupChat`, `generateGroupWrapper`, `deleteGroup`, `getGroupAvatar`, `getGroups`, `regenerateGroup`, `resetSelectedGroup`, `select_group_chats`, and `getGroupChatNames` — these are present in the source but not part of the reference above.
