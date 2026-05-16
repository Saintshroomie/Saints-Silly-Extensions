# macros.js

The macro engine that powers `{{char}}`, `{{user}}`, `{{lastMessage}}`,
and the rest of SillyTavern's template substitution. Extensions register
custom macros here, and `substituteParams` / `substituteParamsExtended`
(in `script.js`) ultimately call `evaluateMacros` under the hood.

**Import path from a third-party extension:**

```js
import { MacrosParser, evaluateMacros, getLastMessageId } from '../../../macros.js';
```

> Most extensions use [`substituteParams`](script.md#substituteparamsmessage-name1-name2-randomvalues-replacecharacternames)
> from `script.js` rather than calling `evaluateMacros` directly.
> `MacrosParser.registerMacro` is the API used when you want to *add* a
> new macro that other code (and the user) can reference with `{{yourMacro}}`.

## Exports at a glance

| Export | Kind | Summary |
|--------|------|---------|
| `MacrosParser` | class | Static registry of custom macros (legacy API; bridges into the new macro engine when the experimental flag is on) |
| `evaluateMacros(content, env, postProcessFn)` | function | Resolves `{{...}}` substitutions in a string |
| `getLastMessageId(options?)` | function | Returns the most recent message index matching an optional filter |
| `initMacros()` | function | Registers built-in macros (called by ST during startup) |

## Reference

### `class MacrosParser`

Static class — never instantiated. Exposes a small set of methods for
registering, querying, and removing custom macros. As of recent
versions, the methods log a deprecation warning pointing to the new
`macroSystem.registry` API (in `public/scripts/macros/macro-system.js`);
the legacy surface still works for compatibility.

#### `MacrosParser.registerMacro(key, value, description?)`

Register a macro so `{{key}}` resolves to `value`. `value` can be a
string or a function `(nonce: string) → string`. `description` is shown
in macro-list UIs and autocomplete.

```js
import { MacrosParser } from '../../../macros.js';

MacrosParser.registerMacro(
    'scene_number',
    () => String(getCurrentSceneNumber()),
    'The current scene index according to my-extension.',
);
```

After registration, anywhere ST evaluates macros — character cards,
World Info entries, slash commands, prompt templates — will resolve
`{{scene_number}}` against your function.

#### `MacrosParser.unregisterMacro(key)`

Remove a previously-registered macro. Safe to call on unknown keys.

#### `MacrosParser.get(key) → string | MacroFunction | undefined`

Look up a registered macro by name. Returns the stored value/function
or `undefined`.

#### `MacrosParser.has(key) → boolean`

Check whether a macro is registered.

#### `MacrosParser.populateEnv(env)`

Populates an `env` object with every registered macro so it can be
passed to `evaluateMacros`. ST calls this internally; extensions rarely
need it directly.

#### `MacrosParser.sanitizeMacroValue(value) → string`

Coerces a macro value (string, function, number, etc.) to a safe
string for substitution.

#### `MacrosParser[Symbol.iterator]`

The class is iterable — yields `{ key, description }` for every
registered macro. Useful for building autocomplete or settings UIs.

```js
for (const { key, description } of MacrosParser) {
    console.log(key, description);
}
```

### `evaluateMacros(content, env, postProcessFn) → string`

Low-level macro resolver. Replaces every `{{name}}` in `content`
with the corresponding value from `env`, optionally post-processing
each substituted value with `postProcessFn`.

| Param | Type | Description |
|-------|------|-------------|
| `content` | `string` | Input text containing `{{...}}` macros. |
| `env` | `Record<string, string \| () => string>` | Map of macro names to values (functions are invoked and their return used). |
| `postProcessFn` | `(value: string) => string` | Applied to each substituted value before reinsertion. Defaults to identity. |

Built-in macros (`{{char}}`, `{{user}}`, `{{time}}`, etc.) are merged in
automatically alongside `env`.

Most extensions should call
[`substituteParams`](script.md#substituteparamsmessage-name1-name2-randomvalues-replacecharacternames)
or `substituteParamsExtended` instead — those wrappers also handle
character/user names and integrate with the rest of the pipeline.

### `getLastMessageId(options?) → number | null`

Returns the index of the most recent message in `context.chat`,
walking backwards. Returns `null` if no message matches.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `options.exclude_swipe_in_propress` | `boolean` | `true` | Skip messages whose current swipe hasn't finished yet. |
| `options.filter` | `(msg) => boolean` | `null` | Optional predicate — return only the most recent message that matches. |

```js
import { getLastMessageId } from '../../../macros.js';

const lastUser = getLastMessageId({ filter: m => m.is_user });
const lastBot = getLastMessageId({ filter: m => !m.is_user && !m.is_system });
```

### `initMacros()`

Called once during ST startup to register the built-in macro set
(`lastGenerationType`, etc.). Extensions never call this themselves.

## See also

- [`script.md`](script.md) — `substituteParams`, `substituteParamsExtended`,
  `removeMacros`, `baseChatReplace`.
- [`../guides/inject-into-prompts.md`](../guides/inject-into-prompts.md)
  — wrapping injected content with macro-aware templates.
- The newer `public/scripts/macros/macro-system.js` (registry-based
  engine) is gated behind `power_user.experimental_macro_engine`.
  When that flag is on, `MacrosParser.registerMacro` bridges to it
  automatically.
