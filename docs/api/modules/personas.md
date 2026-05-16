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

#### `initUserAvatar(avatar) → void`

Sets the module-level `user_avatar` binding to `avatar`, refreshes the user-avatar DOM, and updates persona UI states. Used at app startup; does **not** emit `PERSONA_CHANGED`.

#### `setUserAvatar(imgfile, { toastPersonaNameChange?, navigateToCurrent? }?) → Promise<void>`

Switches the active persona to `imgfile`. Updates rendered messages, runs first-message retrigger on empty chats, persists settings, and emits `event_types.PERSONA_CHANGED`. `toastPersonaNameChange` defaults to `true`; `navigateToCurrent` to `false`.

#### `getUserAvatars(doRender?, openPageAt?) → Promise<string[]>`

POSTs `/api/avatars/get`, returns the list of avatar filenames. Pass `doRender=false` to skip the UI rebuild. `openPageAt` is the avatar filename to scroll into view after render.

#### `createPersona(avatarId) → Promise<void>`

Interactive flow — prompts the user for a name (cancels if blank) and description, then calls `initPersona`. Shows a success toast when `power_user.persona_show_notifications` is on.

#### `initPersona(avatarId, personaName, personaDescription, personaTitle, options?) → Promise<void>`

Writes the persona into `power_user.personas[avatarId]` and `power_user.persona_descriptions[avatarId]`, then debounces a settings save. Options:

| Option | Default | Description |
|--------|---------|-------------|
| `silent` | `false` | Skip the `PERSONA_CREATED` event (used for migrations). |
| `position` | `persona_description_positions.IN_PROMPT` | Injection position. |
| `depth` | `2` | Depth for `AT_DEPTH` injections. |
| `role` | `0` | Role for injected message. |
| `lorebook` | `''` | Attached lorebook name. |

#### `convertCharacterToPersona(characterId = null) → Promise<boolean>`

Creates a `${name} (Persona).png` persona from the character card's description, with `{{char}}`/`{{user}}` macro substitution offered to the user. Returns `true` on success.

### UI & selection

#### `isPersonaPanelOpen() → boolean`

`true` when the `#persona-management-button .drawer-content` has the `openDrawer` class.

#### `setPersonaDescription() → void`

Re-syncs the Persona Management form fields from `power_user.persona_description*` values. Call after programmatic mutations to `power_user.persona_description`.

#### `buildPersonaAvatarList(block, personas, options?) → void`

Renders persona avatar entities into `block`. Options: `empty` (clear first, default `true`), `interactable` (default `false`), `highlightFavs` (default `true`).

#### `updatePersonaConnectionsAvatarList() → void`

Reads `power_user.persona_descriptions[user_avatar].connections` and rebuilds the connection-avatar list under the current persona. Shows a placeholder string when empty.

#### `askForPersonaSelection(title, text, personas, options?) → Promise<string|null>`

Shows a modal listing `personas` (an array of avatar ids) and resolves with the chosen avatar id, or `null` if the user cancelled. Options:

| Option | Description |
|--------|-------------|
| `okButton` | OK button label (default `'None'`). |
| `shiftClickHandler` | `(el, ev) => void` for shift+click on a persona block. |
| `highlightPersonas` | `true` highlights ones used in current chat, or pass an array of avatar ids. |
| `targetedChar` | `PersonaConnection` — adds a "Remove All Connections" button. |

#### `autoSelectPersona(name, { personaKey }?) → Promise<boolean>`

Finds a persona by display name (or by `personaKey` avatar id if multiple share a name) and calls `setUserAvatar`. Returns `true` if a match was found.

### Locking

#### `isPersonaConnectionLocked(connection) → boolean`

`true` when `connection.type/id` matches the currently open character or group.

#### `setPersonaLockState(state, type = 'chat') → Promise<void>`

Locks (`state=true`) or unlocks (`state=false`) the active persona. `type` is one of `'chat'`, `'character'`, `'default'`.

#### `togglePersonaLock(type = 'chat') → Promise<boolean>`

Flips the lock for the given type and returns the new state.

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
