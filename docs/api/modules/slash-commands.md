# slash-commands.js and `slash-commands/`

The slash-command (STscript) system. The top-level `slash-commands.js` registers all built-in commands and exposes a handful of helpers used by the chat input pipeline. The `slash-commands/` subdirectory contains the parser, command/argument classes, and runtime data structures.

For an extension author, the headline API is:

```js
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
import { SlashCommand }       from '../../../slash-commands/SlashCommand.js';
import {
    ARGUMENT_TYPE,
    SlashCommandArgument,
    SlashCommandNamedArgument,
} from '../../../slash-commands/SlashCommandArgument.js';

SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: 'my-cmd',
    callback: async (named, unnamed) => { /* … */ return ''; },
    helpString: 'Does my thing.',
}));
```

See also: [`../guides/register-slash-commands.md`](../guides/register-slash-commands.md).

## Exports at a glance

### From `slash-commands.js`

| Export | Kind | Summary |
|--------|------|---------|
| `parser` | const | The singleton `SlashCommandParser` instance. |
| `initDefaultSlashCommands` | function | Boot-time: registers ST's built-in commands. |
| `executeSlashCommandsOnChatInput` | async function | Run the chat input as a script. |
| `processChatSlashCommands` | function | Re-process pending chat-bound commands after chat switch. |
| `getNameAndAvatarForMessage` | function | Resolve speaker name + avatar for a sent message. |
| `sendMessageAs` | async function | Insert a message as a named character. |
| `sendNarratorMessage` | async function | Insert a message attributed to the narrator. |
| `promptQuietForLoudResponse` | async function | Run a quiet prompt, surface the response loudly. |
| `generateSystemMessage` | async function | Generate and append a system message. |
| `validateArrayArgString` | function | Validate a slash-command list arg as strings. |
| `validateArrayArg` | function | Validate a slash-command list arg of mixed types. |
| `setSlashCommandAutoComplete` | async function | Attach slash autocomplete to a textarea. |
| `initSlashCommandAutoComplete` | async function | Wire autocomplete on the chat input. |
| `activateScriptButtons` | function | Re-enable the script run/stop UI. |
| `deactivateScriptButtons` | function | Disable the script run/stop UI. |
| `pauseScriptExecution` | function | Pause the running closure. |
| `stopScriptExecution` | function | Abort the running closure. |
| `isExecutingCommandsFromChatInput` | let | True while a chat-input script is running. |
| `commandsFromChatInputAbortController` | let | The active `AbortController` for chat-input scripts. |
| `COMMENT_NAME_DEFAULT` | const | Default name for `/comment` messages (`'Note'`). |
| `CONNECT_API_MAP` | const | Lookup table from `/api` keys to backend config. |
| `UNIQUE_APIS` | const | Deduplicated list of API kinds (`main_api` values). |

### From `slash-commands/` (classes & enums)

| Export | File | Summary |
|--------|------|---------|
| `SlashCommandParser` | `SlashCommandParser.js` | Parses STscript and owns the command registry. |
| `PARSER_FLAG` | `SlashCommandParser.js` | Parser flag enum (`STRICT_ESCAPING`, `REPLACE_GETVAR`). |
| `SlashCommand` | `SlashCommand.js` | Command definition (name, callback, args, help). |
| `SlashCommandArgument` | `SlashCommandArgument.js` | Unnamed (positional) argument definition. |
| `SlashCommandNamedArgument` | `SlashCommandArgument.js` | `--key=value` argument definition. |
| `ARGUMENT_TYPE` | `SlashCommandArgument.js` | Argument-type enum. |
| `SlashCommandAbortController` | `SlashCommandAbortController.js` | Abort/pause signal for running scripts. |
| `SlashCommandAbortSignal` | `SlashCommandAbortController.js` | Signal half of the abort controller. |
| `SlashCommandBreak` | `SlashCommandBreak.js` | Executor representing an STscript `/break`. |
| `SlashCommandBreakController` | `SlashCommandBreakController.js` | Cooperative break signal between closures. |
| `SlashCommandBreakPoint` | `SlashCommandBreakPoint.js` | Executor representing a breakpoint. |
| `SlashCommandClosure` | `SlashCommandClosure.js` | A parsed STscript block ready to execute. |
| `SlashCommandClosureResult` | `SlashCommandClosureResult.js` | Result wrapper from running a closure. |
| `SlashCommandExecutionError` | `SlashCommandExecutionError.js` | Error type thrown by script execution. |
| `SlashCommandExecutor` | `SlashCommandExecutor.js` | A single parsed command call within a closure. |
| `SlashCommandScope` | `SlashCommandScope.js` | Variable scope for a closure. |
| `slashCommandReturnHelper` | `SlashCommandReturnHelper.js` | Helper for `return` named-arg routing. |
| `SlashCommandBrowser` | `SlashCommandBrowser.js` | UI for the in-app command help browser. |
| `SlashCommandAutoCompleteNameResult` | `SlashCommandAutoCompleteNameResult.js` | Autocomplete-result model. |

---

## Reference

## From `slash-commands.js`

### `parser` (const)

The singleton `SlashCommandParser`. You normally use `SlashCommandParser.addCommandObject(...)` (a static method) rather than touching `parser` directly, but `parser` is useful for inspection: `parser.commands` lists all registered commands and `parser.getHelpString()` returns the HTML help block.

### `initDefaultSlashCommands() → void`

Registers all built-in slash commands (`/api`, `/sendas`, `/sys`, `/setvar`, …) and binds chat-input handlers. Called once during boot — extensions should not call this.

### `executeSlashCommandsOnChatInput(text, options = {}) → Promise<SlashCommandClosureResult>`

Parse `text` as STscript and execute it as if the user had typed it into the chat input. Returns the closure's result. While running, `isExecutingCommandsFromChatInput` is `true` and `commandsFromChatInputAbortController` is set.

```js
import { executeSlashCommandsOnChatInput } from '../../../slash-commands.js';
await executeSlashCommandsOnChatInput('/echo Hello');
```

> For programmatic use, prefer `SillyTavern.getContext().executeSlashCommandsWithOptions(...)` — it does not depend on the chat input UI.

### `processChatSlashCommands() → void`

Re-applies persistent script injections (`/inject`) and similar chat-bound commands. Called on `CHAT_CHANGED`.

### `getNameAndAvatarForMessage(character, name = null) → { name, force_avatar, original_avatar }`

Resolve the display name and avatar URL to use when inserting a message attributed to `character` (or a string name).

### `sendMessageAs(args, text) → Promise<void>`

The implementation behind `/sendas`. Inserts a message as a named character, respecting impersonation rules and group chat ordering. `args` is the named-args object; `text` is the message content.

### `sendNarratorMessage(args, text) → Promise<void>`

The implementation behind `/sys`. Inserts a system/narrator message.

### `promptQuietForLoudResponse(who, text) → Promise<void>`

Run a "quiet" generation but route the result back into the chat loudly (e.g. used by `/genraw`-style flows).

### `generateSystemMessage(args, prompt) → Promise<void>`

The implementation behind `/genraw` family — generates and appends a system message constructed from `prompt`.

### `validateArrayArgString(arg, name, { allowUndefined = true }) → string[]`

Validate that `arg` is a string array (parsing JSON if needed). Throws with a helpful message referencing `name` on failure. `allowUndefined` returns `[]` if the arg is missing.

### `validateArrayArg(arg, name, { allowUndefined = true }) → any[]`

Same as above but allows mixed-type elements.

### `setSlashCommandAutoComplete(textarea, isFloating = false) → Promise<void>`

Wire the slash-command autocompleter onto an arbitrary `<textarea>`. Use this if your extension has a floating panel that should also accept STscript.

### `initSlashCommandAutoComplete() → Promise<void>`

Boot-time autocomplete wiring for `#send_textarea`. Called once during init.

### `activateScriptButtons()` / `deactivateScriptButtons()`

Show/hide the run/stop/pause buttons that appear while a script is running.

### `pauseScriptExecution()` / `stopScriptExecution()`

Pause or abort the currently running closure (driven by the active `SlashCommandAbortController`).

### `isExecutingCommandsFromChatInput` (let, `boolean`)

`true` while a chat-input-originated script is running.

### `commandsFromChatInputAbortController` (let, `AbortController | undefined`)

The abort controller for the active chat-input script. Inspect or `.abort()` it from extension code to stop running scripts (or call `stopScriptExecution()`).

### `COMMENT_NAME_DEFAULT` (`'Note'`)

Default speaker name used by `/comment`.

### `CONNECT_API_MAP` (object)

Map from `/api` argument values (e.g. `'openai'`, `'kobold'`, `'kcpp'`) to their backend config:

```ts
{ selected: string;            // main_api value
  button?: string;             // CSS selector for the API button
  type?: string;               // textgen_types value
  source?: string;             // chat_completion_sources value
}
```

### `UNIQUE_APIS` (string[])

The deduplicated set of `main_api` values seen in `CONNECT_API_MAP`. Useful for iterating the supported backends.

---

## From `slash-commands/` (classes & enums)

### `class SlashCommandParser`

Owns the static command registry. Extensions almost always interact with it via two static methods.

**Import:**

```js
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
```

#### `SlashCommandParser.addCommandObject(command)`

Register a new slash command. Throws on illegal names (those starting with `/`, `#`, `:`, `parser-flag`, or `breakpoint`). The parser also auto-detects the caller's stack and tags the command as `isExtension` / `isThirdParty` / records its source folder — no extra metadata needed from you.

```js
SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: 'my-cmd',
    callback: async (named, unnamed) => '...',
    helpString: 'Describe what /my-cmd does.',
    aliases: ['mc'],
    namedArgumentList: [/* SlashCommandNamedArgument.fromProps(...) */],
    unnamedArgumentList: [/* SlashCommandArgument.fromProps(...) */],
}));
```

#### `SlashCommandParser.addCommand(command, callback, aliases, helpString)` — deprecated

Older positional registration API. Prefer `addCommandObject`.

#### `parser.getHelpString() → string`

Renders the full help table as HTML (used by `/help slash`).

#### `parser.commands` / `SlashCommandParser.commands`

Object map of `{ [name]: SlashCommand }` (including aliases as separate keys).

### `enum PARSER_FLAG`

Defined in `SlashCommandParser.js`:

```js
PARSER_FLAG.STRICT_ESCAPING  // 1 — strict backslash handling
PARSER_FLAG.REPLACE_GETVAR   // 2 — replace {{getvar::}} with scoped vars
```

User-toggleable via the `/parser-flag` command.

### `class SlashCommand`

Represents a single registered command. Construct via the static factory.

**Import:**

```js
import { SlashCommand } from '../../../slash-commands/SlashCommand.js';
```

#### `SlashCommand.fromProps(props) → SlashCommand`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `name` | `string` | — | Command name, no leading slash. |
| `callback` | `(named, unnamed) => string \| Promise<string \| SlashCommandClosure>` | — | Handler. Return `''` for actions, or a string to push into the pipe. |
| `aliases` | `string[]` | `[]` | Alternative names. |
| `helpString` | `string` | `''` | HTML allowed; shown in `/help` and autocomplete. |
| `returns` | `string` | — | Short description of return value for help. |
| `splitUnnamedArgument` | `boolean` | `false` | Split the unnamed arg into an array on whitespace. |
| `splitUnnamedArgumentCount` | `number` | — | Max items when splitting (rest goes into the last). |
| `rawQuotes` | `boolean` | `false` | Keep wrapping quotes on the unnamed arg. |
| `namedArgumentList` | `SlashCommandNamedArgument[]` | `[]` | Named (`--key=value`) args. |
| `unnamedArgumentList` | `SlashCommandArgument[]` | `[]` | Positional args. |

The `callback` receives:

- `named` — an object of name → value. Reserved keys are present too: `_scope`, `_parserFlags`, `_abortController`, `_debugController`, `_hasUnnamedArgument`.
- `unnamed` — `string | SlashCommandClosure | (string | SlashCommandClosure)[]`. A string for the simple case; an array when `splitUnnamedArgument` is set.

### `class SlashCommandArgument`

An unnamed (positional) argument definition.

**Import:**

```js
import { SlashCommandArgument, ARGUMENT_TYPE } from '../../../slash-commands/SlashCommandArgument.js';
```

#### `SlashCommandArgument.fromProps(props) → SlashCommandArgument`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `description` | `string` | — | Help text. |
| `typeList` | `ARGUMENT_TYPE \| ARGUMENT_TYPE[]` | `[ARGUMENT_TYPE.STRING]` | Accepted types. |
| `isRequired` | `boolean` | `false` | Validation only. |
| `acceptsMultiple` | `boolean` | `false` | Allow multiple values (when supported). |
| `defaultValue` | `string \| SlashCommandClosure` | `null` | Used when the user omits the arg. |
| `enumList` | `string[] \| SlashCommandEnumValue[]` | `[]` | Static autocomplete choices. |
| `enumProvider` | `(executor, scope) => SlashCommandEnumValue[]` | `null` | Dynamic autocomplete. |
| `forceEnum` | `boolean` | `false` | Reject values outside `enumList`/provider. |

### `class SlashCommandNamedArgument extends SlashCommandArgument`

A `--key=value` argument.

#### `SlashCommandNamedArgument.fromProps(props) → SlashCommandNamedArgument`

Same props as `SlashCommandArgument.fromProps`, plus:

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `name` | `string` | — | The argument name (`--name=value`). |
| `aliasList` | `string[]` | `[]` | Alternative names. |

### `enum ARGUMENT_TYPE`

Defined in `SlashCommandArgument.js`:

```js
ARGUMENT_TYPE.STRING         // 'string'
ARGUMENT_TYPE.NUMBER         // 'number'
ARGUMENT_TYPE.RANGE          // 'range'        — e.g. "3-7"
ARGUMENT_TYPE.BOOLEAN        // 'bool'         — 'on'/'off'/'true'/'false'
ARGUMENT_TYPE.VARIABLE_NAME  // 'varname'
ARGUMENT_TYPE.CLOSURE        // 'closure'      — { ... } STscript block
ARGUMENT_TYPE.SUBCOMMAND     // 'subcommand'
ARGUMENT_TYPE.LIST           // 'list'
ARGUMENT_TYPE.DICTIONARY     // 'dictionary'
```

> There is no `ENUM`, `JSON`, or `OBJECT` member — use `LIST`/`DICTIONARY`, or set `enumList`/`forceEnum` to constrain a `STRING` arg.

### `class SlashCommandAbortController`

Cooperative abort controller for a running script. Mirrors the DOM `AbortController` shape (`.abort(reason)`, `.signal`). The signal is a `SlashCommandAbortSignal` (also exported) that the script polls between executors. Used by `stopScriptExecution()` and `commandsFromChatInputAbortController`.

### `class SlashCommandBreak`

Internal executor representing the `/break` command in a parsed closure.

### `class SlashCommandBreakController`

Coordinates `/break` between nested closures. The executing closure ticks `.isBreak` to abort the surrounding loop/closure cleanly.

### `class SlashCommandBreakPoint`

Internal executor representing a `/breakpoint` — paused inspection point when the debugger is attached.

### `class SlashCommandClosure`

A parsed STscript block (one set of `{ ... }`). Has its own `scope`, an `executorList`, and an `execute()` method. Closures may be passed around as values (e.g. as the `defaultValue` of an argument). You generally consume them from a callback, e.g.:

```js
async callback(named, unnamed) {
    const closure = named.onDone;
    if (closure instanceof SlashCommandClosure) {
        const result = await closure.getCopy().execute();
        return result.pipe;
    }
}
```

### `class SlashCommandClosureResult`

Returned by `SlashCommandClosure.execute()`. Notable fields: `pipe` (the final pipe string), `isAborted`, `isBreak`, `isError`.

### `class SlashCommandExecutionError extends Error`

Thrown by the runtime when a command fails. Carries position info into the original script source for editor highlighting.

### `class SlashCommandExecutor`

A single parsed command call within a closure — i.e. one `/cmd args` invocation. Holds the named/unnamed argument assignments and a reference back to the `SlashCommand` definition.

### `class SlashCommandScope`

Variable scope for a closure. Provides `setVariable`, `getVariable`, `existsVariable`, etc. — useful from callbacks that take a `_scope` capture (`named._scope`) and want to read/write closure-local variables.

`SlashCommandScopeVariableExistsError` and `SlashCommandScopeVariableNotFoundError` are also exported from this file.

### `slashCommandReturnHelper`

Drop-in helper for commands that support a `return=...` named arg ("pipe", "object", "chat-html", "popup-text", "toast-text", "console", "none", …). Provides `enumList({...})` to build the named-arg's enum list and `doReturn(type, value, opts?)` to dispatch a value to the right place.

```js
SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: 'my-info',
    namedArgumentList: [
        SlashCommandNamedArgument.fromProps({
            name: 'return',
            description: 'Where to send the result.',
            typeList: [ARGUMENT_TYPE.STRING],
            defaultValue: 'pipe',
            enumList: slashCommandReturnHelper.enumList({ allowChat: true, allowPopup: true }),
        }),
    ],
    callback: async (named) => {
        return slashCommandReturnHelper.doReturn(named.return, computeValue());
    },
}));
```

### `class SlashCommandBrowser`

UI for the in-app slash-command browser (the help popup that lists every command with rendered argument signatures). Not typically used from extensions.

### `class SlashCommandAutoCompleteNameResult`

Model object used by the autocomplete subsystem; subclass of `AutoCompleteNameResult`. Internal — you only see it if you're writing custom autocomplete logic.

## Notes

- The deferred-from-`script.js` exports `executeSlashCommands`, `executeSlashCommandsWithOptions`, `getSlashCommandsHelp`, and `registerSlashCommand` are re-exported here (line 102 of `slash-commands.js`). `registerSlashCommand` is the old positional API; prefer `SlashCommandParser.addCommandObject(SlashCommand.fromProps({...}))`.
- The `executeNow` / `parserContext` machinery on `SlashCommandClosure` is internal — treat closures as opaque values from callback code, except for `.getCopy()` + `.execute()`.
- `AbstractEventTarget` (in `slash-commands/AbstractEventTarget.js`) is a base class only; not part of the public API.
