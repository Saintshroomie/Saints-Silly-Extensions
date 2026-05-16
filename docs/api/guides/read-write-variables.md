# Read & Write Variables

> *You want to read or write a variable that persists with the chat (or session).*

SillyTavern exposes two parallel variable stores — **local** (per-chat) and **global** (per-session, across all chats) — that back the `/setvar`, `/getvar`, `/incvar`, `/addvar` family of slash commands. Extensions can read and write these same variables programmatically, which is the right choice when the value should be visible to users and STscript. For state that's purely internal to your extension, prefer `chatMetadata` / `extensionSettings` instead — see the decision matrix below.

## Minimal example

```js
import {
    getLocalVariable, setLocalVariable,
    incrementLocalVariable, decrementLocalVariable,
    getGlobalVariable, setGlobalVariable,
    existsLocalVariable, deleteLocalVariable,
} from '../../../variables.js';

// Per-chat counter that the user can also see with /getvar turns
setLocalVariable('turns', 0);

// Bump it after every assistant message
const next = incrementLocalVariable('turns'); // returns the new numeric value
console.log(`Now at turn ${next}`);

// Read back — automatically coerced to Number when numeric
const turns = getLocalVariable('turns');
if (turns >= 10) {
    setLocalVariable('milestone', 'reached');
}

// Global (session-wide) preference any chat can read
setGlobalVariable('myext_theme', 'dark');
```

## Variations

### 1. Decision matrix — variables vs. metadata vs. settings

| Storage | Scope | Visible to users / STscript | Best for |
|---------|-------|-----------------------------|----------|
| `setLocalVariable` / `getLocalVariable` | Per-chat | Yes (`/getvar`, `{{getvar::name}}`) | Counters, flags, scratch values that scripts or users may want to inspect or change |
| `setGlobalVariable` / `getGlobalVariable` | Per-session, all chats | Yes (`/getglobalvar`) | Cross-chat numeric/string state shared between extensions and user scripts |
| `chatMetadata.myExtension` | Per-chat | No (private to JS) | Structured per-chat state — snapshots, parsed memory blobs, lookup tables. See [CLAUDE.md → Metadata](../../../CLAUDE.md#metadata-per-chat-persistent-storage) |
| `extensionSettings.myExtension` | Global, across chats | No (private to JS) | User preferences, prompt templates, toggles |

Rule of thumb: **if a user might reasonably want to type `/getvar foo` and see your value, use variables. Otherwise, use metadata/settings.**

### 2. String flags

```js
import { setLocalVariable, getLocalVariable } from '../../../variables.js';

setLocalVariable('mode', 'roleplay');

const mode = getLocalVariable('mode');
// 'roleplay' — strings stay strings; only numeric-looking strings are coerced
```

### 3. JSON-ish values (with care — see Gotchas)

Variables are stored as strings. If you want to store an object or array, you must serialize and deserialize yourself:

```js
import { setLocalVariable, getLocalVariable } from '../../../variables.js';

const inventory = { gold: 50, items: ['sword', 'potion'] };
setLocalVariable('inventory', JSON.stringify(inventory));

const raw = getLocalVariable('inventory');
const parsed = raw ? JSON.parse(raw) : { gold: 0, items: [] };
parsed.gold += 10;
setLocalVariable('inventory', JSON.stringify(parsed));
```

For nested object/array writes, the underlying API also supports an `index` argument that splices into the stored JSON for you — see [`../modules/variables.md`](../modules/variables.md) for details.

### 4. Exists check + clean delete on chat switch

```js
import { existsLocalVariable, deleteLocalVariable } from '../../../variables.js';
import { eventSource, event_types } from '../../../../script.js';

eventSource.on(event_types.CHAT_CHANGED, () => {
    if (existsLocalVariable('myext_temp_buffer')) {
        deleteLocalVariable('myext_temp_buffer');
    }
});
```

### 5. Global counter for cross-chat analytics

```js
import { incrementGlobalVariable, getGlobalVariable } from '../../../variables.js';

const total = incrementGlobalVariable('myext_generations_total'); // returns new value
console.log(`You've used this extension ${total} times across all chats.`);
```

## Gotchas

- **Values round-trip as strings.** `setLocalVariable('count', 5)` stores `"5"`; `getLocalVariable('count')` returns `5` (numeric coercion happens on read for purely numeric strings). But `setLocalVariable('flag', true)` stores `"true"`, and reads return `"true"` as a **string** — `Boolean(getLocalVariable('flag'))` is `true`, but so is `Boolean("false")`. Compare against the string explicitly: `getLocalVariable('flag') === 'true'`.
- **Objects and arrays do not auto-serialize on write.** `setLocalVariable('x', { foo: 1 })` stores the string `"[object Object]"`. Always call `JSON.stringify` before writing structured values.
- **`incrementLocalVariable` / `decrementLocalVariable` return the new value** — not the old one. They also create the variable as `0`-then-incremented if it didn't exist, so you don't need to seed counters.
- **`addLocalVariable` is polymorphic.** If both sides parse as numbers, it adds numerically. If the existing value is a JSON-stringified array, it pushes. Otherwise it concatenates as strings. Use `incrementLocalVariable` when you specifically want numeric +1.
- **Deleting a chat removes its local variables.** Local vars live inside `chat_metadata`, which is persisted alongside the chat file. Delete the chat → lose the vars. Global variables survive (they're in `extension_settings.variables.global`).
- **Empty / missing variable returns the empty string `''`**, not `undefined`. Guard with `existsLocalVariable(name)` if you need to distinguish "set to empty" from "never set".
- **No save call needed.** Writes go through debounced savers internally; you don't need to call `saveMetadata()` or `saveSettings()` after a `set*Variable` call.
- **Don't use variables for high-frequency or large data.** Each write triggers a debounced save of the entire chat metadata or settings blob. For megabyte-scale state, use `chatMetadata.myExtension` and batch your saves.

## See also

- Reference: [`variables.md`](../modules/variables.md)
- Guide: [`getting-started.md`](getting-started.md)
- Guide: [`inject-into-prompts.md`](inject-into-prompts.md) — using a variable's value inside an injected prompt
- CLAUDE.md: [Metadata (Per-Chat Persistent Storage)](../../../CLAUDE.md#metadata-per-chat-persistent-storage), [Extension Settings (Global Persistent Storage)](../../../CLAUDE.md#extension-settings-global-persistent-storage)
