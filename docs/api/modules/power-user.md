# power-user.js

The `power_user` module owns SillyTavern's "User Settings" panel — appearance, behavior, persona, context template, instruct template, fuzzy search, custom stopping strings, and ~100 other knobs. It also exposes the fuzzy-search helpers used to power character / lorebook / persona lists, the story-string template renderer, and the movable-UI state machine.

This module is large. The reference below covers the exports most useful to **extension authors**; for the full settings surface, read the `power_user` object definition at the top of `public/scripts/power-user.js` directly.

**Import path from a third-party extension:**

```js
import {
    power_user, context_presets,
    MAX_CONTEXT_DEFAULT, MAX_RESPONSE_DEFAULT,
    chat_styles, send_on_enter_options, persona_description_positions, toastPositionClasses,
    fuzzySearchCharacters, fuzzySearchWorldInfo, fuzzySearchPersonas, fuzzySearchTags,
    fuzzySearchGroups, performFuzzySearch, sortEntitiesList,
    renderStoryString, getContextSettings,
    addEphemeralStoppingString, flushEphemeralStoppingStrings, getCustomStoppingStrings,
    generatedTextFiltered, forceCharacterEditorTokenize,
    fixMarkdown, collapseNewlines,
    loadMovingUIState, resetMovableStyles, applyStylePins, applyPowerUserSettings,
    registerDebugFunction, playMessageSound,
} from '../../../power-user.js';
```

## Exports at a glance

| Export | Kind | Summary |
|--------|------|---------|
| `power_user` | mutable object | Global user-settings store (~100 fields). |
| `context_presets` | mutable array | Loaded context templates (Roleplay, Story, etc.). |
| `MAX_CONTEXT_DEFAULT` | const number | Default upper bound for the context-size slider (`8192`). |
| `MAX_RESPONSE_DEFAULT` | const number | Default upper bound for the response-length slider (`2048`). |
| `chat_styles` | const object | Enum: `DEFAULT`, `BUBBLES`, `DOCUMENT`. |
| `send_on_enter_options` | const object | Enum: `DISABLED`, `AUTO`, `ENABLED`. |
| `persona_description_positions` | const object | Re-export from `personas.js` — enum of injection positions. |
| `toastPositionClasses` | const string[] | Valid `toastr` position CSS classes. |
| `fuzzySearchCharacters` | function | Fuse.js search across character cards. |
| `fuzzySearchWorldInfo` | function | Fuse.js search across WI entries. |
| `fuzzySearchPersonas` | function | Fuse.js search across personas. |
| `fuzzySearchTags` | function | Fuse.js search across tag names. |
| `fuzzySearchGroups` | function | Fuse.js search across group chats. |
| `performFuzzySearch` | function | Low-level Fuse.js wrapper with optional result cache. |
| `sortEntitiesList` | function | Sorts an entity list using the user's chosen sort field/order. |
| `renderStoryString` | function | Renders the Handlebars context template with character/persona params. |
| `getContextSettings` | function | Returns a flattened snapshot of the active context preset. |
| `addEphemeralStoppingString` | function | Push a one-generation stopping string. |
| `flushEphemeralStoppingStrings` | function | Clear all ephemeral stopping strings. |
| `getCustomStoppingStrings` | function | Concat of permanent + ephemeral stopping strings. |
| `generatedTextFiltered` | function | True if a response should be auto-rejected per auto-swipe rules. |
| `forceCharacterEditorTokenize` | function | Force the character-editor token counters to recompute. |
| `fixMarkdown` | function | Repair unpaired or spaced markdown formatting. |
| `collapseNewlines` | function | Collapse runs of `\n` to a single `\n`. |
| `loadMovingUIState` | function | Restore saved positions of draggable panels. |
| `resetMovableStyles` | function | Wipe inline positioning styles from one panel. |
| `applyStylePins` | function | Pin `<style>` tags from the first message above the chat. |
| `applyPowerUserSettings` | function | Re-apply every visual setting at once. |
| `registerDebugFunction` | function | Add a button to the Debug Menu in user settings. |
| `playMessageSound` | function | Play the new-message audio if the user has it enabled. |

## Reference

### Settings object

#### `power_user`

The global user-settings store. Mutate fields and call `saveSettingsDebounced()` from `../script.js` to persist.

Extension-relevant fields (see source for the rest):

| Field | Type | Purpose |
|-------|------|---------|
| `persona_description` | string | The active persona's description blob. |
| `persona_description_position` | enum | Where the persona description is injected (see `persona_description_positions`). |
| `persona_description_role` | number | Message role of the persona injection (0=system, 1=user, 2=assistant). |
| `persona_description_depth` | number | Depth for in-chat persona injection. |
| `personas` | object | `{ avatar: name }` — list of saved personas. |
| `default_persona` | string\|null | Avatar filename of the default persona. |
| `theme` | string | Active theme name. |
| `font_scale` | number | UI font multiplier (1 = normal). |
| `chat_width` | number | Chat column width percentage. |
| `chat_display` | enum | `chat_styles.DEFAULT` / `BUBBLES` / `DOCUMENT`. |
| `avatar_style` | number | 0=round, 1=rectangular, 2=square, 3=rounded. |
| `play_message_sound` | boolean | Play audio on new message. |
| `play_sound_unfocused` | boolean | Suppress sound when window has focus. |
| `auto_continue` | object | `{ enabled, allow_chat_completions, target_length }`. |
| `continue_on_send` | boolean | Continue current message instead of starting a new one when user posts. |
| `quick_continue` | boolean | Show the `#mes_continue` quick-action button. |
| `quick_impersonate` | boolean | Show the `#mes_impersonate` quick-action button. |
| `waifuMode` | boolean | Centered single-character mobile-style layout. |
| `movingUI` | boolean | Enable draggable panels. |
| `movingUIState` | object | Saved positions/sizes keyed by element id. |
| `trim_sentences` | boolean | Trim generations to the last full sentence. |
| `chat_truncation` | number | Max chat messages sent to the LLM (0 = unlimited). |
| `custom_stopping_strings` | string | JSON array of permanent stopping strings. |
| `custom_stopping_strings_macro` | boolean | Apply `{{macros}}` to stopping strings before send. |
| `fuzzy_search` | boolean | Whether character/WI lists use fuzzy matching. |
| `tokenizer` | enum | Active tokenizer (see `../tokenizers.js`). |
| `instruct` | object | Instruct-template settings. |
| `context` | object | Context-template settings (story_string, separators, etc.). |
| `sysprompt` | object | `{ enabled, name, content, post_history }`. |
| `reasoning` | object | Reasoning/`<think>`-tag settings. |
| `stscript` | object | STscript autocomplete and parser flags. |
| `console_log_prompts` | boolean | Log final prompts to the browser console. |
| `tag_import_setting` | enum | Behavior when importing cards with tags. |
| `toastr_position` | string | One of `toastPositionClasses`. |

For everything else (the long tail of UI toggles, color overrides, blur/shadow, autocomplete sub-options, etc.), inspect `power_user` at runtime: `console.log(SillyTavern.getContext().powerUserSettings)` or just read the source.

#### `context_presets`

The array of loaded context-template preset objects (`Roleplay`, `Story`, etc.) — each has `name`, `story_string`, `chat_start`, `example_separator`, and the related position/role/depth fields. Populated at boot.

### Fuzzy search

All fuzzy-search helpers use Fuse.js under the hood with extended search syntax and a 0.2 threshold. The optional `fuzzySearchCaches` arg, when provided, memoizes by `(category, searchValue)` so repeated calls during the same render pass are free.

#### `fuzzySearchCharacters(searchValue, fuzzySearchCaches?) → FuseResult<Character>[]`

Search the global `characters` array. Weighted: name (20) > tags (10) > description / mes_example (3) > scenario / personality / first_mes / creator_notes (2) > creator / tags / alternate_greetings (1).

#### `fuzzySearchWorldInfo(data, searchValue, fuzzySearchCaches?) → FuseResult<any>[]`

Search a provided array of WI entries. Weighted: key (20) > group (15) > comment / keysecondary (10) > content (3) > uid / automationId (1).

#### `fuzzySearchPersonas(data, searchValue, fuzzySearchCaches?) → FuseResult<any>[]`

`data` is an array of persona-avatar identifiers; the function maps them to `{ key, name, description }` internally via `power_user.personas` / `power_user.persona_descriptions`. Weighted: name (20) > description (3).

#### `fuzzySearchTags(searchValue, fuzzySearchCaches?) → FuseResult<Tag>[]`

Search the global `tags` array by `name` only.

#### `fuzzySearchGroups(searchValue, fuzzySearchCaches?) → FuseResult<Group>[]`

Search the global `groups` array. Weighted: name (20) > members (15) > tags (10) > id (1).

#### `performFuzzySearch(type, data, keys, searchValue, fuzzySearchCaches?) → FuseResult<any>[]`

Low-level wrapper. `type` is a key into `fuzzySearchCaches` (`filters.js → fuzzySearchCategories`). `keys` is a Fuse.js key descriptor array.

#### `sortEntitiesList(entities, forceSearch, filterHelper?) → void`

Sorts an array of `{ item, …}` entities in place using `power_user.sort_field`, `power_user.sort_order`, and `power_user.sort_rule`. When `forceSearch` is true (a search query is active), preserves search-score order.

### Prompt rendering & stopping strings

#### `renderStoryString(params, options?) → string`

Compiles the active context preset's `story_string` (Handlebars) with `params` (typically `{ description, personality, scenario, persona, system, wiBefore, wiAfter, char, user }`), runs `substituteParams` for any unresolved `{{macros}}`, and normalizes trailing newlines. `options.customStoryString` / `options.customInstructSettings` / `options.customContextSettings` let you override for one render. Throws on Handlebars compile errors (and toasts the user).

#### `getContextSettings() → object`

Returns a flattened object containing the current values of every field driven by the context controls (`story_string`, `example_separator`, `chat_start`, `use_stop_strings`, `names_as_stop_strings`, `story_string_position`, `story_string_depth`, `story_string_role`, plus a few power-user toggles). Useful for snapshotting before a programmatic preset switch.

#### `addEphemeralStoppingString(value) → void`

Adds `value` to an in-memory list of stopping strings that apply to **the very next generation only**. The list is auto-flushed when generation ends.

#### `flushEphemeralStoppingStrings() → void`

Clears the ephemeral list immediately. Normally called by the generation pipeline; extensions may call it if they queued strings but then aborted the request.

#### `getCustomStoppingStrings(limit?) → string[]`

Returns `[...permanent, ...ephemeral]`. Permanent strings are parsed from the `power_user.custom_stopping_strings` JSON; if `custom_stopping_strings_macro` is true, each is run through `substituteParams`. With `limit > 0`, returns only the first `limit` entries.

#### `generatedTextFiltered(text) → boolean`

Returns `true` if the auto-swipe machinery should reject this response — either because it's shorter than `auto_swipe_minimum_length` or contains enough blacklisted words (`auto_swipe_blacklist` / `auto_swipe_blacklist_threshold`).

#### `forceCharacterEditorTokenize() → void`

Invalidates the cached token-count hashes on every `[data-token-counter]` element and re-triggers the character creator's `input` handler so all counters recompute.

### Text utilities

#### `fixMarkdown(text, forDisplay) → string`

Repairs markdown formatting: trims whitespace adjacent to `*` / `_` pairs, and (when `forDisplay` is true) auto-closes unpaired `*` and `"` on a per-line basis. Does **not** apply the line-level repair for non-display contexts (it breaks Continue).

#### `collapseNewlines(x) → string`

Replaces consecutive `\n` runs with a single `\n`.

### UI helpers

#### `loadMovingUIState() → void`

Restores `power_user.movingUIState` to the actual elements — applies CSS top/left/width/height from the saved per-element record. No-op on mobile or when `movingUI` is disabled. Call after creating a new draggable panel to restore its last position.

#### `resetMovableStyles(id) → void`

Clears `top`, `left`, `right`, `bottom`, `height`, `width`, `margin` inline styles on the element with the given `id`. Use to "snap" a panel back to its CSS-defined defaults.

#### `applyStylePins() → void`

If `power_user.pin_styles` is true, extracts `<style>` tags from the first chat message and pins them above the chat so they survive scrolling. Called on chat changes.

#### `applyPowerUserSettings() → void`

Re-applies every visual setting (UI mode, font scale, theme colors, chat width, avatar style, blur, shadows, custom CSS, moving UI, hotswap, timer, timestamps, icons, mesID display, hidden avatars, token count, message actions, swipe-number-all). Call after bulk-updating multiple `power_user.*` visual fields.

### Constants & enums

#### `MAX_CONTEXT_DEFAULT` / `MAX_RESPONSE_DEFAULT`

Numeric ceilings used by the context-size and response-length sliders (`8192` and `2048` respectively). Higher values are available when `power_user.max_context_unlocked` is true.

#### `chat_styles`

```js
{ DEFAULT: 0, BUBBLES: 1, DOCUMENT: 2 }
```

Indexed by `power_user.chat_display`.

#### `send_on_enter_options`

```js
{ DISABLED: -1, AUTO: 0, ENABLED: 1 }
```

Indexed by `power_user.send_on_enter`.

#### `persona_description_positions`

Re-export from `personas.js`. Enum of where the persona description is injected into the prompt (in story string, before/after char description, in chat at depth, etc.). See `personas.js` for exact values.

#### `toastPositionClasses`

```js
['toast-top-left', 'toast-top-center', 'toast-top-right',
 'toast-bottom-left', 'toast-bottom-center', 'toast-bottom-right']
```

Valid values for `power_user.toastr_position`.

### Lifecycle

#### `registerDebugFunction(functionId, name, description, func) → void`

Adds an entry to the Debug Menu (under User Settings → Debug). `func` is called when the user clicks the entry. Useful for shipping a "Dump my extension state to console" or "Force re-index" button without owning UI real estate.

```js
registerDebugFunction(
    'my_ext_dump_state',
    'Dump my extension state',
    'Logs the current extension state to the browser console.',
    () => console.log(JSON.stringify(myState, null, 2)),
);
```

#### `playMessageSound({ force } = {}) → void`

Plays the new-message audio if `power_user.play_message_sound` is enabled and the window is unfocused (unless `force` is true, which bypasses both checks). The sound element is `#audio_message_sound`.

## Notes

- `power_user` is not frozen — extensions can read and write any field, but should call `saveSettingsDebounced()` from `../script.js` after mutating. Avoid changing visual settings during generation; some apply immediately, others require `applyPowerUserSettings()`.
- `loadPowerUserSettings` is exported in source but is part of ST's boot sequence — third-party extensions should not call it.
- A handful of internal helpers (`switchUiMode`, `applyThemeColor`, etc.) are intentionally module-private; if you need to react to user-setting changes, listen on `eventTypes.SETTINGS_UPDATED` rather than reaching in.
- Several enum-like constants referenced by `power_user` fields (e.g. `tag_import_setting`, `tag_sort_mode`, `names_behavior_types`, `AUTOCOMPLETE_STATE`) live in their own modules — search by name if you need to set those programmatically.
