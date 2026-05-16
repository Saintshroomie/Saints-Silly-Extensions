# instruct-mode.js

Instruct-mode formatting. Wraps system / user / assistant turns with the configured input/output/system sequences, builds stop strings, and manages instruct-mode presets. Used by text-completion APIs (the chat-completion path uses native role messages instead).

**Import path from a third-party extension:**

```js
import {
    selectInstructPreset,
    selectContextPreset,
    autoSelectInstructPreset,
    updateBindModelTemplatesState,
    formatInstructModeChat,
    formatInstructModeSystemPrompt,
    formatInstructModeStoryString,
    formatInstructModeExamples,
    formatInstructModePrompt,
    getInstructStoppingSequences,
    getInstructMacros,
    loadInstructMode,
    names_behavior_types,
    force_output_sequence,
    instruct_presets,
} from '../../../instruct-mode.js';
```

## Exports at a glance

| Export | Kind | Summary |
|--------|------|---------|
| `selectInstructPreset(preset, opts?)` | function | Switch the instruct preset; auto-enables instruct mode |
| `selectContextPreset(preset, opts?)` | function | Switch the context template preset |
| `autoSelectInstructPreset(modelId)` | function | Apply the mapped instruct/context preset for a model id |
| `updateBindModelTemplatesState()` | function | Recomputes the "bind to model" checkbox state |
| `formatInstructModeChat(name, mes, isUser, isNarrator, forceAvatar, name1, name2, forceOutputSequence, customInstruct?)` | function | Format a single chat turn with instruct sequences |
| `formatInstructModeSystemPrompt(systemPrompt, _customInstruct?)` | function | Deprecated passthrough; returns `systemPrompt \|\| ''` |
| `formatInstructModeStoryString(storyString, opts?)` | function | Wrap the assembled story string with instruct prefix/suffix |
| `formatInstructModeExamples(mesExamplesArray, name1, name2)` | function | Format `<START>`-delimited example blocks |
| `formatInstructModePrompt(name, isImpersonate, promptBias, name1, name2, isQuiet, isQuietToLoud, customInstruct?)` | function | Build the trailing prompt line for the next turn |
| `getInstructStoppingSequences(opts?)` | function | Returns the array of stop strings derived from sequences |
| `getInstructMacros(env)` | function | Returns `{{instruct*}}` macro definitions |
| `loadInstructMode(data)` | async function | Loads instruct presets and wires up UI controls |
| `names_behavior_types` | const | `{ NONE: 'none', FORCE: 'force', ALWAYS: 'always' }` |
| `force_output_sequence` | const | `{ FIRST: 1, LAST: 2 }` for first/last output overrides |
| `instruct_presets` | let | Array of loaded instruct preset objects |

## Reference

### Preset selection

#### `selectInstructPreset(preset, { quiet = false, isAuto = false } = {}) → void`

Selects an instruct preset by name. If instruct mode is currently disabled it is also enabled. Shows a toast unless `quiet`. `isAuto: true` makes the toast say "auto-selected".

#### `selectContextPreset(preset, { quiet = false, isAuto = false } = {}) → void`

Selects a context template preset by name. Idempotent if already selected. Toast suppressed by `quiet`.

#### `autoSelectInstructPreset(modelId) → boolean`

Looks up `power_user.model_templates_mappings[modelId]` and, if found, applies the mapped `instruct` and `context` presets. Returns `true` if a mapping was used, `false` otherwise.

#### `updateBindModelTemplatesState() → void`

Syncs the `#bind_model_templates` checkbox to reflect whether the active instruct + context match the mapping stored for the current model.

### Formatting

#### `formatInstructModeChat(name, mes, isUser, isNarrator, forceAvatar, name1, name2, forceOutputSequence, customInstruct = null) → string`

Wraps a single message with the appropriate prefix/suffix sequences. Honors `names_behavior` (always include names, force in groups, or never), `wrap` (newline padding), `macro` substitution, and `force_output_sequence` (`FIRST`/`LAST`) for first/last-turn overrides.

#### `formatInstructModeStoryString(storyString, { customContext = null, customInstruct = null } = {}) → string`

Wraps the system / character story string with `story_string_prefix` / `story_string_suffix`. Skipped when the configured story-string position is `IN_CHAT` (sequences are applied per-message instead).

#### `formatInstructModeExamples(mesExamplesArray, name1, name2) → string[]`

Splits `<START>`-delimited example blocks via `parseExampleIntoIndividual` and formats each example with the instruct sequences. Returns the original array (with `<START>` replaced by the example separator) if `instruct.skip_examples` is true or no examples parse.

#### `formatInstructModePrompt(name, isImpersonate, promptBias, name1, name2, isQuiet, isQuietToLoud, customInstruct = null) → string`

Builds the trailing line that hands the conversation off to the model. Chooses among `input_sequence` / `output_sequence` / `last_input_sequence` / `last_output_sequence` / `last_system_sequence` based on generation type (impersonate / quiet / quiet-to-loud / default). Appends `name:` when names are forced.

#### `formatInstructModeSystemPrompt(systemPrompt, _customInstruct = null) → string`

Deprecated passthrough — returns `systemPrompt || ''`. Kept for callers that previously relied on instruct-mode-aware system prompt formatting.

### Stop strings

#### `getInstructStoppingSequences({ customInstruct = null, useStopStrings = null } = {}) → string[]`

Returns the list of stop strings to send with a text-completion request. Always includes `stop_sequence`, plus the input/output/system sequences when `sequences_as_stop_strings` is true. When `use_stop_strings` (from `power_user.context`) is on, appends `chat_start` and `example_separator`. Sequences are wrapped with a leading `\n` when `instruct.wrap` is on, and macros are resolved when `instruct.macro` is on.

### Macros

#### `getInstructMacros(env) → import('./macros.js').Macro[]`

Returns the `{{instruct*}}` macro definitions (`instructStoryStringPrefix`, `instructStoryStringSuffix`, `instructInput`/`instructUserPrefix`, `instructUserSuffix`, `instructOutput`/`instructAssistantPrefix`, and friends). Returned macros are gated by `power_user.instruct.enabled`. Used internally by `evaluateMacros` (see [macros.md](./macros.md)).

### State & constants

#### `instruct_presets`

Mutable array populated by `loadInstructMode` from the backend's `data.instruct`.

#### `names_behavior_types`

Enum controlling when character names are inlined: `NONE: 'none'` (never), `FORCE: 'force'` (only when needed, e.g. group chats), `ALWAYS: 'always'`.

#### `force_output_sequence`

`{ FIRST: 1, LAST: 2 }`. Passed to `formatInstructModeChat` to force the first-output or last-output sequence variant.

### Lifecycle

#### `loadInstructMode(data) → Promise<void>`

Replaces `instruct_presets` with `data.instruct`, migrates legacy `power_user.instruct` keys to the evergreen format, populates the preset dropdown, and binds UI controls to `power_user.instruct` properties.
