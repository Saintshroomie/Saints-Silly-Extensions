# tags.js

Character/group tag system — resolving entity keys, adding/removing tags, drawing tag inputs, and the filter/import/sort enums.

**Import path from a third-party extension:**

```js
import {
    getTagKeyForEntity,
    getTagKeyForEntityElement,
    searchCharByName,
    addTagsToEntity,
    removeTagFromEntity,
    applyTagsOnCharacterSelect,
    applyTagsOnGroupSelect,
    applyCharacterTagsToMessageDivs,
    createTagInput,
    tag_filter_type,
    tag_import_setting,
    tag_sort_mode,
} from '../../../tags.js';
```

## Exports at a glance

| Export | Kind | Summary |
|--------|------|---------|
| `getTagKeyForEntity` | fn | Resolve a character/group reference to its tag-map key. |
| `getTagKeyForEntityElement` | fn | Walk the DOM up to find a `data-chid` / `data-grid` and resolve its key. |
| `searchCharByName` | fn | Find a char/group key by name (toasts a warning on miss). |
| `addTagsToEntity` | fn | Attach one or more tags to one or more entities. |
| `removeTagFromEntity` | fn | Detach a tag from one or more entities. |
| `applyTagsOnCharacterSelect` | fn | Repaint `#tagList` for the currently selected character. |
| `applyTagsOnGroupSelect` | fn | Repaint `#groupTagList` and group-related filters. |
| `applyCharacterTagsToMessageDivs` | fn | Mirror a character's tags onto its message `.mes` elements as data attributes. |
| `createTagInput` | fn | Wire a jQuery UI autocomplete input to a tag list element. |
| `initTags` | fn | Bind document-level tag handlers (called once at startup). |
| `tag_filter_type` | enum | Which tag-filter UI a request targets. |
| `tag_import_setting` | enum | Behavior when importing a character with tags. |
| `tag_sort_mode` | enum | How the tag-management list is sorted. |

## Reference

### Entity key resolution

#### `getTagKeyForEntity(entityOrKey) → string|undefined`

Accepts a character object, character id (number), character avatar key, or group id, and returns the key used in `tag_map`. If the input resolves to a known character that doesn't yet have an entry in `tag_map`, the entry is created empty and the avatar is returned.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `entityOrKey` | `object \| number \| string` | — | A character object (with `id`), a character id, a character avatar key, or a group id. |

**Returns:** `string | undefined` — the `tag_map` key, or `undefined` if no match.

#### `getTagKeyForEntityElement(element) → string|undefined`

Walks `element` (a jQuery object or selector string) upward looking for `data-grid` or `data-chid`, then resolves whichever it finds with `getTagKeyForEntity`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `element` | `JQuery<HTMLElement> \| string` | — | DOM element (or selector) inside a tag-bearing entity row. |

**Returns:** `string | undefined` — the `tag_map` key, or `undefined` if no ancestor carries `data-grid` / `data-chid`.

#### `searchCharByName(charName, { suppressLogging }?) → string|null`

Resolves a char/group by display name (falling back to the current entity if `charName` is empty). Toasts `Character {name} not found.` on miss unless `suppressLogging` is true. Mostly used by slash commands.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `charName` | `string \| null` | — | Display name to look up; empty string falls back to current entity. |
| `options` | `object` | `{}` | Option bag. |
| `options.suppressLogging` | `boolean` | `false` | Skip the toast warning on miss. |

**Returns:** `string | null` — the `tag_map` key, or `null` if not found.

### Tag mutation

#### `addTagsToEntity(tag, entityId, { tagListSelector?, tagListOptions? }?) → boolean`

Adds `tag` (one tag or array) to `entityId` (one key or array). Saves settings, re-renders the inline tag list, and optionally re-renders the list at `tagListSelector`. Returns `true` if any add actually happened.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `tag` | `Tag \| Tag[]` | — | Tag or list of tags to add. |
| `entityId` | `string \| string[]` | — | One or more entity keys. |
| `options` | `object` | `{}` | Option bag. |
| `options.tagListSelector` | `JQuery<HTMLElement> \| string \| null` | `null` | Extra tag-list element to repaint after add. |
| `options.tagListOptions` | `PrintTagListOptions` | `{}` | Options forwarded to `printTagList`. |

**Returns:** `boolean` — `true` if at least one tag was added.

#### `removeTagFromEntity(tag, entityId, { tagListSelector?, tagElement? }?) → boolean`

Removes `tag` from one or many entities. If you pass `tagElement` (the DOM element for that tag), it is removed from the DOM directly. Returns `true` if any removal happened.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `tag` | `Tag` | — | Tag to remove. |
| `entityId` | `string \| string[]` | — | One or more entity keys. |
| `options` | `object` | `{}` | Option bag. |
| `options.tagListSelector` | `JQuery<HTMLElement> \| string \| null` | `null` | Extra tag-list element to repaint after removal. |
| `options.tagElement` | `JQuery<HTMLElement> \| null` | `null` | Direct DOM element to detach. |

**Returns:** `boolean` — `true` if at least one tag was removed.

### UI helpers

#### `applyTagsOnCharacterSelect(chid = null) → void`

Repaints `#tagList` for the character `chid` (defaulting to the active `this_chid`). In the character-creation flow, reads the in-progress tag ids out of the DOM and reprints them as removable.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `chid` | `number \| null` | `null` | Character id; defaults to the active `this_chid`. |

**Returns:** none.

#### `applyTagsOnGroupSelect(groupId = null) → void`

Repaints `#groupTagList` for the group and the candidate/member filter lists. In `group_create` mode, reads in-progress tags out of the DOM.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `groupId` | `number \| null` | `null` | Group id; defaults to the active `selected_group`. |

**Returns:** none.

#### `applyCharacterTagsToMessageDivs({ mesIds }?) → void`

Clears existing `data-char-tag-*` and `data-char-tags` attributes on chat message elements, then re-applies them based on the speaking character's current tags. Pass `mesIds` to limit the update.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `options` | `object` | `{}` | Option bag. |
| `options.mesIds` | `number[]` | `[]` | Restrict the update to these message ids. Empty array means all. |

**Returns:** none.

#### `createTagInput(inputSelector, listSelector, tagListOptions?) → void`

Wires jQuery UI autocomplete on `inputSelector` so that picking a suggestion calls `selectTag` against `listSelector`. Used internally to create the standard `#tagInput` / `#groupTagInput` controls.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `inputSelector` | `string` | — | Selector for the input element. |
| `listSelector` | `string` | — | Selector for the tag-list element to mutate. |
| `tagListOptions` | `PrintTagListOptions` | `{}` | Print options for tag rendering. |

**Returns:** none.

#### `initTags() → void`

Binds document-level tag click/input handlers and creates the two stock tag inputs. Called once at app startup.

**Returns:** none.

### Enums

#### `tag_filter_type`

```js
{
    character:             0,
    group_member:          1,  // @deprecated alias
    group_candidates_list: 1,
    group_members_list:    2,
}
```

Picks which filter list (and which `power_user.show_tag_filters*` setting) a tag-filter operation targets.

#### `tag_import_setting`

```js
{
    ASK:           1,  // prompt the user
    NONE:          2,  // ignore tags on import
    ALL:           3,  // import all tags
    ONLY_EXISTING: 4,  // import only tags that already exist
}
```

#### `tag_sort_mode`

```js
{
    MANUAL:       'manual',
    ALPHABETICAL: 'alphabetical',
    BY_ENTRIES:   'by_entries',
}
```

## Notes

The module's top-level `export { ... }` block also re-exports `TAG_FOLDER_TYPES`, `TAG_FOLDER_DEFAULT_TYPE`, `tags`, `tag_map`, `filterByTagState`, `isBogusFolder`, `isBogusFolderOpen`, `chooseBogusFolder`, `getTagBlock`, `loadTagsSettings`, `printTagFilters`, `getTagsList`, `printTagList`, `appendTagToList`, `createTagMapFromList`, `renameTagKey`, `importTags`, `sortTags`, `compareTagsForSort`, and `removeTagFromMap` — these are not covered here.
