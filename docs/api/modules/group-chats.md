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

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `groupId` | `string` | — | ID of the group to load chat messages for. |
| `reload` | `boolean` | `false` | Reload the group chat selection UI after loading. |

**Returns:** `Promise<void>` — resolves once chat messages have been loaded and rendered.

#### `getGroupMembers(groupId = selected_group) → Character[]`

Returns the resolved `Character` object for every avatar listed in `group.members`. Missing characters become `undefined` entries.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `groupId` | `string` | `selected_group` | Group id to fetch members from; defaults to the currently selected group. |

**Returns:** `Character[]` — characters for each member avatar, or `[]` if the group isn't found.

#### `getGroupNames() → string[]`

Member names of the **currently selected** group only (ignores its argument-less signature). Returns `[]` when no group is open.

**Returns:** `string[]` — display names of the current group's members.

#### `findGroupMemberId(arg, full?) → number | { id, avatar, name, index } | undefined`

Resolves `arg` to a 0-based character id within the current group. `arg` can be a numeric string (0-based member index) or any text — text input is matched against avatars and names via Fuse fuzzy search. Pass `full=true` to receive a detail object instead of just the id.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `arg` | `number \| string` | — | 0-based member index or character name to look up. |
| `full` | `boolean` | `false` | If `true`, return an object with extra detail; otherwise return only the character id. |

**Returns:** `number | { id, avatar, name, index } | undefined` — character id, detail object, or `undefined` if no match.

#### `getGroupDepthPrompts(groupId, characterId) → { depth, text, role }[]`

Collects the per-member `@Depth` injection prompts (from `character.data.extensions.depth_prompt`). Disabled members are skipped unless they are the currently-speaking `characterId`. Returns `[]` when the group's generation mode is `SWAP`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `groupId` | `string` | — | Group id. |
| `characterId` | `number` | — | Current speaking character id; used so a disabled member still contributes when it's their turn. |

**Returns:** `{ depth: number, text: string, role: string }[]` — depth prompt entries to inject for the turn.

#### `getGroupCharacterCards(groupId, characterId) → { description, personality, scenario, mesExamples } | null`

Returns the joined character-card text the prompt builder injects for the active group turn. Each field is a string with prefix/suffix transforms applied. Returns `null` if the group has no generation mode set or no members.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `groupId` | `string` | — | Group id. |
| `characterId` | `number` | — | Currently speaking character id. |

**Returns:** `{ description, personality, scenario, mesExamples } | null` — combined card text for the group, or `null` if not applicable.

#### `getGroupCharacterCardsLazy(groupId, characterId) → { description, personality, scenario, mesExamples } | null`

Same as above, but each property is a lazy getter — the underlying `baseChatReplace` work only runs when first accessed. Use when you may only need one of the fields.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `groupId` | `string` | — | Group id. |
| `characterId` | `number` | — | Currently speaking character id. |

**Returns:** `{ description, personality, scenario, mesExamples } | null` — object with lazy getters for each field, or `null` if not applicable.

### Group lifecycle

#### `editGroup(id, immediately, reload?) → Promise<void>`

Saves the group. When `immediately` is `false`, the save is debounced. `reload` (default `true`) re-renders the group list afterwards.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `string` | — | Group id to edit. |
| `immediately` | `boolean` | — | Save immediately rather than debounced. |
| `reload` | `boolean` | `true` | Reload the groups list after saving. |

**Returns:** `Promise<void>` — resolves once the group has been saved.

#### `createNewGroupChat(groupId) → Promise<void>`

Clears the chat, pushes a new `humanizedDateTime()` chat id onto the group's `chats` array, sets it as `chat_id`, saves, and re-renders.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `groupId` | `string` | — | Group id to create a new chat under. |

**Returns:** `Promise<void>` — resolves once the new group chat is created and opened.

#### `unshallowGroupMembers(groupId) → Promise<void>`

For each member, calls `unshallowCharacter` so all character fields are present in memory. Required before composing prompts from member data.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `groupId` | `string` | — | Group id whose members should be fully loaded. |

**Returns:** `Promise<void>` — resolves once every member is unshallowed.

#### `openGroupChat(groupId, chatId) → Promise<void>`

Switches the active group to `chatId` (which must already exist in `group.chats`).

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `groupId` | `string` | — | Group id. |
| `chatId` | `string` | — | Chat id to open within the group. |

**Returns:** `Promise<void>` — resolves once the chat is open.

#### `openGroupById(groupId) → Promise<boolean>`

UI-level "open this group". Bails out if a chat save is in progress or generation is running. Returns `true` if the group was actually switched to.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `groupId` | `string` | — | Group id to open. |

**Returns:** `Promise<boolean>` — `true` if the group was opened; `false` if blocked by a save/generation in progress.

#### `renameGroupMember(oldAvatar, newAvatar, newName) → Promise<void>`

Walks every group and every chat under each group, replacing references to `oldAvatar` and updating message names. Called by [`characters.js`](./characters.md) after a character rename.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `oldAvatar` | `string` | — | Previous avatar filename. |
| `newAvatar` | `string` | — | New avatar filename. |
| `newName` | `string` | — | New character display name. |

**Returns:** `Promise<void>` — resolves once every group and chat is updated.

#### `getGroupBlock(group) → JQuery<HTMLElement>`

Clones the `#group_list_template` element, fills in name/member-count/tags/avatar, and returns the jQuery node ready for insertion into the character list.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `group` | `Group` | — | Group object to render. |

**Returns:** `JQuery<HTMLElement>` — populated `.group_select` DOM node.

#### `getGroupPastChats(groupId) → Promise<ChatInfo[]>`

POSTs `/api/chats/group/info` for each chat id in the group, returning the array of `ChatInfo` results.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `groupId` | `string` | — | Group id. |

**Returns:** `Promise<ChatInfo[]>` — metadata for every chat under the group.

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
