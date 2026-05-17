# personas.js

User persona (avatar + name + description) management — listing, creating, selecting, locking, and rendering personas.

**Import path from a third-party extension:**

```js
import {
    user_avatar,
    persona_description_positions,
    personasFilter,
    getUserAvatars,
    getUserAvatar,
    setUserAvatar,
    createPersona,
    initPersona,
    convertCharacterToPersona,
    setPersonaDescription,
    isPersonaConnectionLocked,
    setPersonaLockState,
    togglePersonaLock,
    autoSelectPersona,
} from '../../../personas.js';
```

See also the [personas guide](../guides/personas-and-users.md) and [`power-user.md`](./power-user.md) — persona text/position/depth/role live on `power_user.persona_description*`.

## Exports at a glance

| Export | Kind | Summary |
|--------|------|---------|
| `user_avatar` | live binding | Avatar filename of the currently selected persona. |
| `persona_description_positions` | enum | Where the persona description is injected. |
| `personasFilter` | FilterHelper | Filter for the persona list. |
| `isPersonaPanelOpen` | fn | Whether the Persona Management drawer is open. |
| `getUserAvatar` | fn | Builds the storage path for an avatar filename. |
| `initUserAvatar` | fn | Sets `user_avatar` on startup without firing events. |
| `setUserAvatar` | async fn | Switches the active persona (fires `PERSONA_CHANGED`). |
| `getUserAvatars` | async fn | Fetches the avatar list from the server and optionally renders. |
| `createPersona` | async fn | Interactive: prompts for name/description, then `initPersona`. |
| `initPersona` | async fn | Adds a persona record to `power_user.personas`. |
| `convertCharacterToPersona` | async fn | Creates a persona from a character card. |
| `setPersonaDescription` | fn | Re-renders the persona settings panel inputs from `power_user`. |
| `buildPersonaAvatarList` | fn | Renders persona entities into a container element. |
| `updatePersonaConnectionsAvatarList` | fn | Re-renders the connections list under a persona. |
| `askForPersonaSelection` | async fn | Modal popup that asks the user to pick a persona. |
| `autoSelectPersona` | async fn | Programmatically selects a persona by name. |
| `isPersonaConnectionLocked` | fn | Is a connection currently locked to the open char/group? |
| `setPersonaLockState` | async fn | Lock or unlock the active persona. |
| `togglePersonaLock` | async fn | Flip the lock state. |

## Reference

### Persona access & creation

#### `getUserAvatar(avatarImg) → string`

Returns `'User Avatars/' + avatarImg` — the storage path for the avatar file.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `avatarImg` | `string` | — | Avatar filename to build a URL for. |

**Returns:** `string` — full storage URL for the avatar file.

#### `initUserAvatar(avatar) → void`

Sets the module-level `user_avatar` binding to `avatar`, refreshes the user-avatar DOM, and updates persona UI states. Used at app startup; does **not** emit `PERSONA_CHANGED`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `avatar` | `string` | — | Avatar filename to assign as the active persona. |

**Returns:** none.

#### `setUserAvatar(imgfile, { toastPersonaNameChange?, navigateToCurrent? }?) → Promise<void>`

Switches the active persona to `imgfile`. Updates rendered messages, runs first-message retrigger on empty chats, persists settings, and emits `event_types.PERSONA_CHANGED`. `toastPersonaNameChange` defaults to `true`; `navigateToCurrent` to `false`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `imgfile` | `string` | — | Avatar filename to switch to. |
| `options.toastPersonaNameChange` | `boolean` | `true` | Toast when the persona name changes. |
| `options.navigateToCurrent` | `boolean` | `false` | Scroll the persona list to the newly selected entry. |

**Returns:** `Promise<void>` — resolves once the persona has been set and persisted.

#### `getUserAvatars(doRender?, openPageAt?) → Promise<string[]>`

POSTs `/api/avatars/get`, returns the list of avatar filenames. Pass `doRender=false` to skip the UI rebuild. `openPageAt` is the avatar filename to scroll into view after render.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `doRender` | `boolean` | `true` | Re-render the persona list UI after fetching. |
| `openPageAt` | `string` | `''` | Avatar filename to scroll into view after render. |

**Returns:** `Promise<string[]>` — list of avatar filenames.

#### `createPersona(avatarId) → Promise<void>`

Interactive flow — prompts the user for a name (cancels if blank) and description, then calls `initPersona`. Shows a success toast when `power_user.persona_show_notifications` is on.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `avatarId` | `string` | — | Avatar id to use as the persona key. |

**Returns:** `Promise<void>` — resolves once the persona is created (or cancelled).

#### `initPersona(avatarId, personaName, personaDescription, personaTitle, options?) → Promise<void>`

Writes the persona into `power_user.personas[avatarId]` and `power_user.persona_descriptions[avatarId]`, then debounces a settings save.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `avatarId` | `string` | — | Avatar id key for the persona. |
| `personaName` | `string` | — | Display name for the persona. |
| `personaDescription` | `string` | — | Optional description body. |
| `personaTitle` | `string` | — | Optional title for the persona. |
| `options.silent` | `boolean` | `false` | Skip the `PERSONA_CREATED` event (used for migrations). |
| `options.position` | `number` | `persona_description_positions.IN_PROMPT` | Injection position. |
| `options.depth` | `number` | `DEFAULT_DEPTH` (`2`) | Depth for `AT_DEPTH` injections. |
| `options.role` | `number` | `DEFAULT_ROLE` (`0`) | Role for the injected message. |
| `options.lorebook` | `string` | `''` | Attached lorebook name. |

**Returns:** `Promise<void>` — resolves once the persona record is saved.

#### `convertCharacterToPersona(characterId = null) → Promise<boolean>`

Creates a `${name} (Persona).png` persona from the character card's description, with `{{char}}`/`{{user}}` macro substitution offered to the user. Returns `true` on success.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `characterId` | `number` | `null` | Character id to convert; defaults to the current character. |

**Returns:** `Promise<boolean>` — `true` if a persona was created, `false` otherwise.

### UI & selection

#### `isPersonaPanelOpen() → boolean`

`true` when the `#persona-management-button .drawer-content` has the `openDrawer` class.

**Returns:** `boolean` — whether the Persona Management drawer is currently open.

#### `setPersonaDescription() → void`

Re-syncs the Persona Management form fields from `power_user.persona_description*` values. Call after programmatic mutations to `power_user.persona_description`.

**Returns:** none.

#### `buildPersonaAvatarList(block, personas, options?) → void`

Renders persona avatar entities into `block`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `block` | `HTMLElement` | — | Container element to render into. |
| `personas` | `string[]` | — | Persona avatar ids to render. |
| `options.empty` | `boolean` | `true` | Clear the block before rendering. |
| `options.interactable` | `boolean` | `false` | Make the rendered avatars interactable. |
| `options.highlightFavs` | `boolean` | `true` | Highlight favorited personas. |

**Returns:** none.

#### `updatePersonaConnectionsAvatarList() → void`

Reads `power_user.persona_descriptions[user_avatar].connections` and rebuilds the connection-avatar list under the current persona. Shows a placeholder string when empty.

**Returns:** none.

#### `askForPersonaSelection(title, text, personas, options?) → Promise<string|null>`

Shows a modal listing `personas` (an array of avatar ids) and resolves with the chosen avatar id, or `null` if the user cancelled.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | `string` | — | Popup title. |
| `text` | `string` | — | Popup body text. |
| `personas` | `string[]` | — | Avatar ids to offer for selection. |
| `options.okButton` | `string` | `'None'` | OK button label. |
| `options.shiftClickHandler` | `(el: HTMLElement, ev: MouseEvent) => any` | `undefined` | Handler for shift-click on a persona block. |
| `options.highlightPersonas` | `boolean \| string[]` | `false` | `true` highlights ones used in the current chat; an array highlights those keys. |
| `options.targetedChar` | `PersonaConnection` | `undefined` | Adds a "Remove All Connections" button targeting this entity. |

**Returns:** `Promise<string | null>` — chosen avatar id, or `null` when cancelled.

#### `autoSelectPersona(name, { personaKey }?) → Promise<boolean>`

Finds a persona by display name (or by `personaKey` avatar id if multiple share a name) and calls `setUserAvatar`. Returns `true` if a match was found.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | `string` | — | Persona display name to look up. |
| `options.personaKey` | `string` | `null` | Optional avatar key to disambiguate duplicate names. |

**Returns:** `Promise<boolean>` — `true` if a matching persona was found and selected.

### Locking

#### `isPersonaConnectionLocked(connection) → boolean`

`true` when `connection.type/id` matches the currently open character or group.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `connection` | `PersonaConnection` | — | Connection descriptor `{ type, id }` to check. |

**Returns:** `boolean` — whether the connection is locked to the current entity.

#### `setPersonaLockState(state, type = 'chat') → Promise<void>`

Locks (`state=true`) or unlocks (`state=false`) the active persona. `type` is one of `'chat'`, `'character'`, `'default'`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `state` | `boolean` | — | Desired lock state. |
| `type` | `PersonaLockType` | `'chat'` | Lock scope — `'chat'`, `'character'`, or `'default'`. |

**Returns:** `Promise<void>` — resolves once the lock state is persisted.

#### `togglePersonaLock(type = 'chat') → Promise<boolean>`

Flips the lock for the given type and returns the new state.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | `PersonaLockType` | `'chat'` | Lock scope to toggle. |

**Returns:** `Promise<boolean>` — new lock state after toggling.

### State

#### `user_avatar: string`

Live binding holding the avatar filename of the active persona. Mutated by `setUserAvatar` / `initUserAvatar`.

#### `persona_description_positions`

```js
{
    IN_PROMPT:  0,
    AFTER_CHAR: 1,  // @deprecated — use IN_PROMPT
    TOP_AN:     2,
    BOTTOM_AN:  3,
    AT_DEPTH:   4,
    NONE:       9,
}
```

#### `personasFilter: FilterHelper`

Filter helper backing the persona search/sort UI. Triggers a debounced re-render of the avatar list.

## Notes

This module also exports `getOrCreatePersonaDescriptor`, `isPersonaLocked`, `getConnectedPersonas`, `showCharConnections`, `getCurrentConnectionObj`, `retriggerFirstMessageOnEmptyChat`, and `initPersonas`; they are not documented here. Per the task list, `isPersonaLocked` is omitted from the reference above (but is the read-side companion to `setPersonaLockState`/`togglePersonaLock`).
