# world-info.js

World Info / Lorebook engine — loading entries, building the WI prompt block, the position/insertion/logic enums, and live settings state.

**Import path from a third-party extension:**

```js
import {
    getWorldInfoPrompt,
    getWorldInfoSettings,
    updateWorldInfoSettings,
    setWorldInfoSettings,
    loadWorldInfo,
    updateWorldInfoList,
    showWorldEditor,
    reloadEditor,
    sortWorldInfoEntries,
    setWIOriginalDataValue,
    deleteWIOriginalDataValue,
    originalWIDataKeyMap,
    worldInfoCache,
    world_info_insertion_strategy,
    world_info_logic,
    scan_state,
    world_info_position,
    wi_anchor_position,
    DEFAULT_DEPTH,
    DEFAULT_WEIGHT,
    MAX_SCAN_DEPTH,
    SORT_ORDER_KEY,
    METADATA_KEY,
    selected_world_info,
    world_names,
    worldInfoFilter,
} from '../../../world-info.js';
```

See also the [world info & lore guide](../guides/world-info-and-lore.md).

## Exports at a glance

| Export | Kind | Summary |
|--------|------|---------|
| `getWorldInfoPrompt` | async fn | Build the WI prompt string for a chat window. |
| `getWorldInfoSettings` | fn | Return a plain object of the current WI settings. |
| `updateWorldInfoSettings` | fn | Apply a settings object back into the live module state. |
| `setWorldInfoSettings` | fn | Apply WI fields from a settings blob during settings load. |
| `loadWorldInfo` | async fn | Load (and cache) a world info file by name. |
| `updateWorldInfoList` | async fn | Refetch `world_names` and refill the WI selectors. |
| `showWorldEditor` | async fn | Open the editor on the named world. |
| `reloadEditor` | fn | Reselect a world in the editor select (optionally even if not current). |
| `sortWorldInfoEntries` | fn | Sort entries by the UI sort option or a custom rule. |
| `setWIOriginalDataValue` | fn | Write a value into `data.originalData.entries` by uid + path. |
| `deleteWIOriginalDataValue` | fn | Drop an entry from `data.originalData.entries`. |
| `originalWIDataKeyMap` | const obj | Maps in-memory WI fields to their `originalData` JSON paths. |
| `worldInfoCache` | `StructuredCloneMap` | Read-through cache of loaded world files. |
| `world_info_insertion_strategy` | enum | Order in which character WI is interleaved with global WI. |
| `world_info_logic` | enum | Per-entry secondary-key boolean logic mode. |
| `scan_state` | enum | The WI scanner's run-state during prompt building. |
| `world_info_position` | enum | Where the entry is inserted in the prompt. |
| `wi_anchor_position` | enum | Anchor for `before`/`after` insertion. |
| `DEFAULT_DEPTH` | const | Default depth (4) for new entries. |
| `DEFAULT_WEIGHT` | const | Default weight (100). |
| `MAX_SCAN_DEPTH` | const | Hard cap (1000) on scan depth. |
| `SORT_ORDER_KEY` | const | accountStorage key for the editor sort order. |
| `METADATA_KEY` | const | Chat-metadata key for the chat-bound lorebook. |
| `world_info` | live binding | Global WI settings object. |
| `selected_world_info` | live binding | Names of globally enabled worlds. |
| `world_names` | live binding | All known world filenames. |
| `world_info_depth` | live binding | Default scan depth (in messages). |
| `world_info_budget` | live binding | Max WI tokens as a % of context. |
| `world_info_recursive` | live binding | Whether recursive scanning is enabled. |
| `worldInfoFilter` | FilterHelper | Filter helper for the WI editor list. |

## Reference

### Reading WI data

#### `getWorldInfoPrompt(chat, maxContext, isDryRun, globalScanData) → Promise<WIPromptResult>`

Runs `checkWorldInfo` against `chat` (reversed message strings), `maxContext` (current generation context size), with `globalScanData` for chat-independent scanning. When `isDryRun` is true, no events are emitted. This is the entry point the main prompt builder uses.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `chat` | `string[]` | — | Chat messages to scan, in reverse order. |
| `maxContext` | `number` | — | Maximum generation context size in tokens. |
| `isDryRun` | `boolean` | — | When true, suppresses `WORLD_INFO_ACTIVATED` event emission. |
| `globalScanData` | `WIGlobalScanData` | — | Chat-independent context to be scanned. |

**Returns:** `Promise<WIPromptResult>` — `{ worldInfoString, worldInfoBefore, worldInfoAfter, worldInfoExamples, worldInfoDepth, anBefore, anAfter, outletEntries }`.

#### `loadWorldInfo(name) → Promise<object|null>`

Returns the WI file `name` from `worldInfoCache` if present, otherwise POSTs `/api/worldinfo/get`, caches, and returns it. Returns `null` on failure.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | `string` | — | World filename to load. |

**Returns:** `Promise<object|null>` — the loaded world data, or `null` if the request failed or `name` was empty.

#### `worldInfoCache: StructuredCloneMap<string, object>`

`worldInfoCache: StructuredCloneMap<string, object>` — process-wide cache for loaded world files. Values are deep-cloned on get so callers cannot mutate cached data; use `saveWorldInfo` to persist edits. Useful for synchronous access in tight loops.

#### `sortWorldInfoEntries(data, { customSort }?) → any[]`

Sorts `data` by the editor's currently-selected sort option, or by `customSort` if provided (`{ sortField, sortOrder, sortRule }`). Returns the sorted (or unchanged-if-empty) array.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `data` | `any[]` | — | WI entries to sort. |
| `options.customSort` | `{sortField?: string, sortOrder?: string, sortRule?: string}` | `null` | Override the editor's sort selection. |

**Returns:** `any[]` — the sorted array (or `data` unchanged if empty).

### Editing entries

#### `setWIOriginalDataValue(data, uid, key, value) → void`

When an entry has an `originalData` shadow (preserved during conversion from character-book format), this writes `value` into the right nested JSON path for `key`. Use `originalWIDataKeyMap[fieldName]` to get the path to pass as `key`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `data` | `object` | — | The world data object containing `originalData.entries`. |
| `uid` | `number` | — | Unique identifier of the target entry. |
| `key` | `string` | — | Dotted JSON path inside the original entry (use `originalWIDataKeyMap[...]`). |
| `value` | `any` | — | Value to write. |

**Returns:** `void` — no-op if `data.originalData.entries` is missing or the entry isn't found.

```js
setWIOriginalDataValue(data, entry.uid, originalWIDataKeyMap.content, entry.content);
```

#### `deleteWIOriginalDataValue(data, uid) → void`

Removes the entry with `uid` from `data.originalData.entries`. Use after `deleteWorldInfoEntry`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `data` | `object` | — | The world data object containing `originalData.entries`. |
| `uid` | `string \| number` | — | Unique identifier of the entry to remove. |

**Returns:** `void` — no-op if the entry isn't found.

#### `originalWIDataKeyMap: Record<string, string>`

`originalWIDataKeyMap: Record<string, string>` — lookup table mapping in-memory entry fields (e.g. `'content'`, `'depth'`, `'matchWholeWords'`) to their dotted paths inside `originalData` JSON (e.g. `'content'`, `'extensions.depth'`, `'extensions.match_whole_words'`).

### Position & strategy enums

#### `world_info_position`

```js
{
    before:   0,  // Before character definition
    after:    1,  // After character definition
    ANTop:    2,  // Top of Author's Note
    ANBottom: 3,  // Bottom of Author's Note
    atDepth:  4,  // Injected at a message-depth from the end
    EMTop:    5,  // Top of example messages
    EMBottom: 6,  // Bottom of example messages
    outlet:   7,  // Custom outlet
}
```

#### `wi_anchor_position`

```js
{ before: 0, after: 1 }
```

Anchor used together with `world_info_position.before`/`after` to choose what they are "before/after" of.

#### `world_info_insertion_strategy`

```js
{
    evenly:          0,  // Interleave global + character WI
    character_first: 1,
    global_first:    2,
}
```

#### `world_info_logic`

```js
{
    AND_ANY: 0,  // primary key + ANY secondary
    NOT_ALL: 1,  // primary key + NOT all secondaries
    NOT_ANY: 2,  // primary key + NOT any secondary
    AND_ALL: 3,  // primary key + ALL secondaries
}
```

#### `scan_state`

```js
{
    NONE:            0,  // scan stopped
    INITIAL:         1,  // first pass
    RECURSION:       2,  // a recursion step
    MIN_ACTIVATIONS: 3,  // depth-skew pass to hit min_activations
}
```

### Settings & state

Live bindings — read fresh, do not cache.

| Binding | Type | Notes |
|---------|------|-------|
| `world_info` | `object` | The serialized WI settings object (also gets `globalSelect` written back on save). |
| `selected_world_info` | `string[]` | Globally enabled world names. |
| `world_names` | `string[]` | All world filenames known to the server. |
| `world_info_depth` | `number` | Default scan depth in messages (default `2`). |
| `world_info_budget` | `number` | Token budget % of context (default `25`). |
| `world_info_recursive` | `boolean` | Enable recursive activation. |
| `worldInfoFilter` | `FilterHelper` | Filters the editor entry list; triggers `updateEditor()`. |

#### `getWorldInfoSettings() → WorldInfoSettings`

Snapshots the current settings into a plain object suitable for `/api/settings/save`. Includes `world_info`, depth, budget, recursion, alerts, case-sensitivity, group scoring, character strategy, budget cap, and max recursion steps.

**Returns:** `WorldInfoSettings` — a plain settings object with every WI tunable.

#### `updateWorldInfoSettings(settings, activeWorldInfo?) → void`

Mutates each live binding from `settings` and updates UI controls. Pass `activeWorldInfo` (array of names) to also set `selected_world_info`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `settings` | `WorldInfoSettings` | — | New settings object; fields present overwrite the live bindings. |
| `activeWorldInfo` | `string[]` | `undefined` | Optional list of active world names to assign to `selected_world_info`. |

**Returns:** `void` (triggers a debounced save).

#### `setWorldInfoSettings(settings, data) → void`

Variant used during initial settings load — copies values from `settings` into the live bindings and reads world data from `data`. Tolerant of missing fields.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `settings` | `object` | — | Partial settings blob from saved app state. |
| `data` | `object` | — | App data containing `world_names` and related world state. |

**Returns:** `void`.

### Constants

| Constant | Value | Meaning |
|----------|-------|---------|
| `DEFAULT_DEPTH` | `4` | Default WI entry depth. |
| `DEFAULT_WEIGHT` | `100` | Default WI entry weight. |
| `MAX_SCAN_DEPTH` | `1000` | Hard cap on scan depth. |
| `SORT_ORDER_KEY` | `'world_info_sort_order'` | accountStorage key for editor sort. |
| `METADATA_KEY` | `'world_info'` | `chat_metadata` key for chat-bound lorebook. |

### UI

#### `showWorldEditor(name) → Promise<void>`

If `name` is empty, hides the editor; otherwise loads the world via `loadWorldInfo` and renders its entries.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | `string` | — | World name to display; empty/falsy hides the editor. |

**Returns:** `Promise<void>` — resolves once the editor is rendered (or hidden).

#### `reloadEditor(file, loadIfNotSelected = false) → void`

If `file` is the currently-selected world in `#world_editor_select`, reselects/triggers a change. With `loadIfNotSelected=true`, switches to `file` even if it wasn't selected.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `file` | `string` | — | World file to reload. |
| `loadIfNotSelected` | `boolean` | `false` | Switch to `file` even if it isn't currently selected. |

**Returns:** `void`.

#### `updateWorldInfoList() → Promise<void>`

POSTs `/api/settings/get`, rebuilds `world_names`, and repopulates the `#world_info` and `#world_editor_select` dropdowns, preserving selection state.

**Returns:** `Promise<void>` — resolves once the dropdowns are repopulated.

## Notes

This module also exports many editing/persistence helpers not documented here, including `splitKeywordsAndRegexes`, `parseRegexFromString`, `getWorldEntry`, `duplicateWorldInfoEntry`, `deleteWorldInfoEntry`, `newWorldInfoEntryDefinition`, `newWorldInfoEntryTemplate`, `createWorldInfoEntry`, `saveWorldInfo`, `deleteWorldInfo`, `getFreeWorldEntryUid`, `getFreeWorldName`, `createNewWorldInfo`, `getSortedEntries`, `checkWorldInfo`, `convertCharacterBook`, `setWorldInfoButtonClass`, `checkEmbeddedWorld`, `importEmbeddedWorldInfo`, `onWorldInfoChange`, `importWorldInfo`, `openWorldInfoEditor`, `assignLorebookToChat`, `moveWorldInfoEntry`, `charUpdatePrimaryWorld`, `charUpdateAddAuxWorld`, `charSetAuxWorlds`, and `initWorldInfo`. Additional live bindings exist for `world_info_min_activations`, `world_info_min_activations_depth_max`, `world_info_include_names`, `world_info_overflow_alert`, `world_info_case_sensitive`, `world_info_match_whole_words`, `world_info_use_group_scoring`, `world_info_character_strategy`, `world_info_budget_cap`, and `world_info_max_recursion_steps`.
