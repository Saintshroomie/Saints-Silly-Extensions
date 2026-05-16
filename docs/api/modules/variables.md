# variables.js

Local and global variable storage that powers the `/setvar`, `/getvar`, `/incvar`, `/addvar`, and related slash commands. Extensions can read and write these same variables programmatically so that user scripts and other extensions see a shared namespace.

**Import path from a third-party extension:**

```js
import {
    getLocalVariable, setLocalVariable, addLocalVariable, existsLocalVariable,
    deleteLocalVariable, incrementLocalVariable, decrementLocalVariable,
    getGlobalVariable, setGlobalVariable, addGlobalVariable, existsGlobalVariable,
    deleteGlobalVariable, incrementGlobalVariable, decrementGlobalVariable,
    resolveVariable, getVariableMacros, parseBooleanOperands, evalBoolean,
    registerVariableCommands,
} from '../../../variables.js';
```

## Storage model

| Scope | Backing store | Persists | Slash commands |
|-------|---------------|----------|----------------|
| **Local** | `chat_metadata.variables` (the same metadata blob saved with the current chat) | Per-chat, survives reloads | `/setvar`, `/getvar`, `/addvar`, `/incvar`, `/decvar`, `/flushvar` |
| **Global** | `extension_settings.variables.global` | Across all chats, all characters | `/setglobalvar`, `/getglobalvar`, `/addglobalvar`, `/incglobalvar`, `/decglobalvar`, `/flushglobalvar` |

**When to use these instead of `chatMetadata` / `extensionSettings` directly:** prefer this API when the data is something users or other extensions might reasonably want to inspect or mutate from STscript. If the value is purely an internal implementation detail of your extension (e.g. a render cache, a guard flag), write directly to `chatMetadata.myExtension` or `extensionSettings.myExtension` instead — those won't pollute the user's variable namespace.

Writes go through debounced savers (`saveMetadataDebounced` for local, `saveSettingsDebounced` for global), so you don't need to call `saveChat()` / `saveSettings()` explicitly.

**Values are stringly typed.** Both stores hold strings; reads coerce to `Number` when the string parses as numeric, otherwise return the raw string. Array/object values are JSON-stringified before storage and parsed on demand via the `index` arg.

See also: [`../guides/read-write-variables.md`](../guides/read-write-variables.md).

## Exports at a glance

| Export | Kind | Summary |
|--------|------|---------|
| `getLocalVariable` | function | Read a chat-scoped variable, with optional `index` into a JSON value. |
| `setLocalVariable` | function | Write a chat-scoped variable; throws on empty name. |
| `addLocalVariable` | function | Append/sum: numeric add if both sides numeric, string concat or array push otherwise. |
| `incrementLocalVariable` | function | `addLocalVariable(name, 1)`. |
| `decrementLocalVariable` | function | `addLocalVariable(name, -1)`. |
| `existsLocalVariable` | function | True if the variable key is defined in `chat_metadata.variables`. |
| `deleteLocalVariable` | function | Remove a chat-scoped variable. |
| `getGlobalVariable` | function | Read a session-scoped variable. |
| `setGlobalVariable` | function | Write a session-scoped variable. |
| `addGlobalVariable` | function | Global twin of `addLocalVariable`. |
| `incrementGlobalVariable` | function | `addGlobalVariable(name, 1)`. |
| `decrementGlobalVariable` | function | `addGlobalVariable(name, -1)`. |
| `existsGlobalVariable` | function | True if the variable key is defined in `extension_settings.variables.global`. |
| `deleteGlobalVariable` | function | Remove a session-scoped variable. |
| `resolveVariable` | function | Lookup chain: scope → local → global → string literal. |
| `getVariableMacros` | function | Returns the `{{setvar::…}}`, `{{getvar::…}}`, etc. macro definitions. |
| `parseBooleanOperands` | function | Resolves command args into typed `{a, b, rule}` operands for `/if`-style commands. |
| `evalBoolean` | function | Evaluates a comparison rule against two operands. |
| `registerVariableCommands` | function | Registers `/setvar`, `/getvar`, etc. with the slash command parser (called once at startup). |

## Reference

### Local variables (chat-scoped)

#### `getLocalVariable(name, args?) → string | number`

Returns the variable value, coerced to `Number` if it parses as numeric. `args.key` overrides `name` (used by slash command plumbing). `args.index` parses the stored value as JSON and returns `value[index]` (numeric index for arrays, string key for objects). Returns `''` if the variable is absent.

#### `setLocalVariable(name, value, args?) → value`

Writes `value` to `chat_metadata.variables[name]`. With `args.index`, parses the existing value as JSON, sets one slot, and re-stringifies. `args.as` lets `convertValueType` coerce the new value (`'string'`, `'number'`, `'boolean'`, `'array'`, `'object'`). Throws `Error` if `name` is empty.

#### `addLocalVariable(name, value) → number | string | Array`

Three behaviors based on the current value:
- If current parses as a JSON array, `value` is pushed and the new array returned.
- Else if both sides are numeric, returns `Number(current) + Number(value)`.
- Else returns `String(current) + value`.

#### `incrementLocalVariable(name) → number | string`

Equivalent to `addLocalVariable(name, 1)`.

#### `decrementLocalVariable(name) → number | string`

Equivalent to `addLocalVariable(name, -1)`.

#### `existsLocalVariable(name) → boolean`

True iff `chat_metadata.variables` has the key.

#### `deleteLocalVariable(name) → ''`

Removes the key from `chat_metadata.variables` and schedules a metadata save. Warns to console (no throw) if the key doesn't exist. Always returns the empty string for slash-command consistency.

### Global variables (session-scoped)

The global functions mirror the local ones exactly, but read/write `extension_settings.variables.global` and call `saveSettingsDebounced`. They have the same signatures and return types as their local counterparts:

#### `getGlobalVariable(name, args?) → string | number`
#### `setGlobalVariable(name, value, args?) → value`
#### `addGlobalVariable(name, value) → number | string | Array`
#### `incrementGlobalVariable(name) → number | string`
#### `decrementGlobalVariable(name) → number | string`
#### `existsGlobalVariable(name) → boolean`
#### `deleteGlobalVariable(name) → ''`

### Resolution & macros

#### `resolveVariable(name, scope?) → string | number`

Resolves a name in the order: STscript closure `scope` (if provided and the name exists there) → local variables → global variables → the literal `name` string itself. Used by slash commands so that arguments can be either variable names or literal strings.

#### `getVariableMacros() → Macro[]`

Returns the macro descriptor array consumed by `evaluateMacros` in `macros.js`. Includes `{{setvar::n::v}}`, `{{addvar::n::v}}`, `{{incvar::n}}`, `{{decvar::n}}`, `{{getvar::n}}`, and their `…globalvar::…` counterparts. Each entry is `{ regex, replace }`.

### Boolean evaluation

#### `parseBooleanOperands(args) → { a, b?, rule }`

Resolves `args.a` / `args.left` / `args.first` / `args.x` (and similarly for `b`) using the order: numeric literal → STscript scope variable → local variable → global variable → string literal. `rule` is passed through from `args.rule`. Used internally by `/if` and `/while`.

#### `evalBoolean(rule, a, b?) → boolean`

Evaluates a comparison. If `b` is omitted, checks truthiness of `a` (or its negation when `rule === 'not'`). Numeric rules: `gt`, `gte`, `lt`, `lte`, `eq`, `neq`. String rules (case-insensitive): `in`, `nin`, `eq`, `neq`. `in`/`nin` on numbers falls back to string comparison. Throws `Error` on unknown rules.

### Registration

#### `registerVariableCommands() → void`

Registers every variable-related slash command (`/setvar`, `/getvar`, `/addvar`, `/incvar`, `/decvar`, `/flushvar`, `/listvar`, plus all the `…globalvar` variants, plus `/let`, `/var`, `/if`, `/while`, etc.) with `SlashCommandParser`. Called once during ST startup — extensions normally never call this themselves.

## Notes

- All async-looking saves are debounced; if you write a variable and immediately tear down (e.g. page navigation), the value may not yet be on disk. If you must guarantee a flush, await `saveMetadata()` or `saveSettings()` from the context API.
- `addLocalVariable` / `addGlobalVariable` swallow JSON-parse errors silently — a malformed array stored under the key will fall through to string concatenation.
- `setLocalVariable`/`setGlobalVariable` throw on empty names, but `add*` / `increment*` / `decrement*` do not — they call `getLocalVariable` first, which short-circuits to `0`.
- For STscript-scope-aware lookup (`{{var::name}}` inside a closure), use `resolveVariable(name, scope)`, not the raw getters.
