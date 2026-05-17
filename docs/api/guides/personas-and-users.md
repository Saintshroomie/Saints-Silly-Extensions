# Personas and Users

> *You want to read the user's persona description, switch the active avatar, or react to persona changes.*

A "persona" in SillyTavern is the user's side of the conversation: a name, an avatar, and an optional description that gets injected into prompts. Personas live in `power_user.personas` (a map of avatar filename → display name) and the active one is tracked by `user_avatar`. This guide covers reading persona state, switching personas, and reacting to changes.

## Minimal example

```js
// extensions/third-party/my-ext/index.js
import { user_avatar, setUserAvatar } from '../../../personas.js';
import { power_user, persona_description_positions } from '../../../power-user.js';

function describeCurrentPersona() {
    const context = SillyTavern.getContext();
    const name        = power_user.personas?.[user_avatar] || context.name1 || 'User';
    const description = power_user.persona_description || '';
    const position    = power_user.persona_description_position; // see enum below

    console.log(`Active persona: ${name} (${user_avatar})`);
    console.log(`Description: ${description.slice(0, 80)}...`);
    console.log(`Injection position: ${position}`); // numeric enum value
}

async function switchToPersona(avatarFilename) {
    // setUserAvatar accepts an options object as second argument.
    await setUserAvatar(avatarFilename, { toastPersonaNameChange: true });
}
```

`user_avatar` is the avatar *filename* (e.g. `"user-default.png"`); use it as the key into `power_user.personas` to get the display name.

## Variations

### Detect persona changes

There is no dedicated `PERSONA_CHANGED` event. Cache `user_avatar` and re-check on chat or settings changes:

```js
import { user_avatar } from '../../../personas.js';

let lastSeenAvatar = user_avatar;

function checkPersonaChange() {
    if (user_avatar !== lastSeenAvatar) {
        const previous = lastSeenAvatar;
        lastSeenAvatar = user_avatar;
        onPersonaChanged(previous, user_avatar);
    }
}

const { eventSource, eventTypes } = SillyTavern.getContext();
eventSource.on(eventTypes.CHAT_CHANGED,      checkPersonaChange);
eventSource.on(eventTypes.SETTINGS_UPDATED,  checkPersonaChange);

function onPersonaChanged(prev, current) {
    console.log(`Persona switched: ${prev} → ${current}`);
}
```

### List every persona

```js
import { getUserAvatars } from '../../../personas.js';

// Pass false to skip rendering the persona panel.
const { personas } = await getUserAvatars(/* doRender */ false);
// personas is an array of avatar filenames.
for (const avatar of personas) {
    const name = power_user.personas?.[avatar];
    console.log(`${avatar} → ${name}`);
}
```

### Ask the user to pick one

```js
import { askForPersonaSelection, getUserAvatars } from '../../../personas.js';

const { personas } = await getUserAvatars(false);
const selected = await askForPersonaSelection(
    'Select narrator',                          // title
    'Pick the persona to use for this scene.',  // body text
    personas,                                   // candidate avatar filenames
    { okButton: 'Cancel' },                     // optional config
);
// `selected` is an avatar filename or null/undefined if the user cancelled.
```

### Lock a persona to the current chat

```js
import { setPersonaLockState, togglePersonaLock, isPersonaLocked } from '../../../personas.js';

// Lock the current persona to this chat (or character):
await setPersonaLockState(true, 'chat');      // 'chat' | 'character'
const isLocked = isPersonaLocked('chat');

// Toggle:
await togglePersonaLock('chat');
```

When locked, ST switches back to that persona when the chat is reopened.

### Create or convert

```js
import { createPersona, convertCharacterToPersona } from '../../../personas.js';

// Make a persona out of an avatar filename (must already exist in /User Avatars).
await createPersona('hero.png');

// Convert the currently selected character card into a persona.
await convertCharacterToPersona();
// Or specify a character index:
await convertCharacterToPersona(42);
```

### Auto-select by name

```js
import { autoSelectPersona } from '../../../personas.js';

// Finds a persona whose display name matches `name` (case-insensitive) and activates it.
await autoSelectPersona('Aria');
```

### Persona description position enum

```js
import { persona_description_positions } from '../../../power-user.js';

// Likely values you'll branch on:
//   IN_PROMPT       – injected as part of the system prompt
//   ABOVE_CHAR      – above the character description block
//   BELOW_CHAR      – below the character description block
//   TOP_AN          – at the top of Author's Note
//   BOTTOM_AN       – at the bottom of Author's Note
//   AT_DEPTH        – injected into chat history at a configurable depth
//   NONE            – not injected
```

See [`personas.md`](../modules/personas.md) for the full enum.

## Gotchas

- **`user_avatar` is a filename, not a display name.** Look the name up in `power_user.personas[user_avatar]`.
- **`persona_description` is plain text.** If your UI renders it as HTML, escape it first — users can put anything in there.
- **`setUserAvatar` is async.** Await it; don't read `user_avatar` immediately after calling it on the same tick.
- **Group chats can shadow the persona.** When `selected_group` is truthy, persona behavior may differ based on group settings. Verify by reading the group object — see [`group-chats.md`](group-chats.md).
- **`power_user.persona_description_position` is a number, not a string.** Compare against the `persona_description_positions` enum, not string literals.
- **There is no persona-change event.** Diff `user_avatar` against a cached value on `CHAT_CHANGED` / `SETTINGS_UPDATED`. Don't rely on `APP_READY` having already fired the "first" change — initialize your cache during `init()`.
- **`getUserAvatars(true)` re-renders the persona panel.** Pass `false` if you just want the list — otherwise you'll fight ST's UI.
- **`createPersona` requires the avatar file to already exist** under `User Avatars/`. To upload a new one, post to `/api/avatars/upload` with `getRequestHeaders()` first.

## See also

- Reference: [`personas.md`](../modules/personas.md)
- Reference: [`power-user.md`](../modules/power-user.md) — `power_user.persona_description`, `persona_description_positions`
- Reference: [`script.md`](../modules/script.md) — `name1`, `name2`, `user_avatar` context fields
- Guide: [`group-chats.md`](group-chats.md) — persona interactions in groups
- CLAUDE.md: "User Persona Description", "Assembling Full Context for LLM Calls"
