# utils.js

The general-purpose utility kitchen sink: object/array helpers, string sanitizers, validation, file I/O, pagination scaffolding, and async control helpers. Most extensions pull at least a handful of these.

**Import path from a third-party extension:**

```js
import {
    deepMerge, ensurePlainObject, isObject, normalizeArray,
    onlyUnique, onlyUniqueJson, removeFromArray, shuffle,
    escapeHtml, sanitizeSelector, isDigitsOnly,
    isValidUrl, isExternalUrl, isUuid, convertValueType, stringToRange,
    download, getFileText, isSameFile, bufferToBase64, urlContentToDataUri,
    navigation_option, getSortableDelay, renderPaginationDropdown,
    paginationDropdownChangeHandler, PAGINATION_TEMPLATE, localizePagination,
    canUseNegativeLookbehind,
    waitUntilCondition,
} from '../../../utils.js';
```

## Exports at a glance

(Only the entries most useful to extension authors are listed here; the file contains many more.)

| Export | Kind | Summary |
|--------|------|---------|
| `deepMerge` | function | Deep-merge plain-object trees. |
| `ensurePlainObject` | function | Return value if it's a plain object, else a fresh `{}`. |
| `isObject` | function | Plain-object predicate (rejects arrays/null). |
| `normalizeArray` | function | Coerce a value to an array of strings. |
| `onlyUnique` | function | `Array.prototype.filter` callback for uniqueness. |
| `onlyUniqueJson` | function | Like `onlyUnique` but for object equality via JSON. |
| `removeFromArray` | function | Remove an item from an array in place. |
| `shuffle` | function | In-place Fisher–Yates shuffle. |
| `escapeHtml` | function | HTML-escape a string. |
| `sanitizeSelector` | function | Replace selector-unsafe chars in an ID. |
| `isDigitsOnly` | function | Numeric-string predicate. |
| `isValidUrl` | function | URL-format predicate. |
| `isExternalUrl` | function | True if URL is on a different origin. |
| `isUuid` | function | UUID-v4 predicate. |
| `convertValueType` | function | Coerce a string to a typed value. |
| `stringToRange` | function | Parse `"3-7"`-style ranges to numbers. |
| `download` | function | Trigger a browser download from in-memory content. |
| `getFileText` | function | Read a `File`/`Blob` as text. |
| `isSameFile` | function | Compare two `File` objects by name+size+mtime. |
| `bufferToBase64` | async function | Convert an `ArrayBuffer` to base64. |
| `urlContentToDataUri` | async function | Fetch a URL and return its body as a data URI. |
| `navigation_option` | const | Pagination size sentinel values. |
| `getSortableDelay` | function | Drag-delay (ms) suited to the current device. |
| `renderPaginationDropdown` | function | HTML for the page-size dropdown. |
| `paginationDropdownChangeHandler` | function | Default handler bound to the dropdown. |
| `PAGINATION_TEMPLATE` | const | Underscore template string for paginator ranges. |
| `localizePagination` | function | Translate paginator strings in a container. |
| `canUseNegativeLookbehind` | function | Detects regex lookbehind support. |
| `waitUntilCondition` | async function | Poll a predicate until truthy or until timeout. |

## Reference

### Objects & arrays

#### `isObject(item) → boolean`

`true` for non-null, non-array plain objects.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `item` | `any` | — | Value to test. |

**Returns:** `boolean` — `true` if the value is a non-null, non-array object.

#### `deepMerge(target, source) → object`

Recursively merge `source` into `target`. Arrays are replaced, not concatenated. Mutates and returns `target`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `target` | `object` | — | Destination object; mutated in place. |
| `source` | `object` | — | Source whose keys override `target`. |

**Returns:** `object` — the mutated `target`.

#### `ensurePlainObject(obj) → object`

Returns `obj` if it's a plain object; otherwise returns a fresh `{}`. Handy when reading defaulted JSON.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `obj` | `any` | — | Candidate value. |

**Returns:** `object` — `obj` itself when plain-object, otherwise a fresh `{}`.

#### `normalizeArray(arr) → string[]`

Coerce strings, JSON-stringified arrays, and arrays into a flat array of strings. Useful for inputs that can be one item or a list.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `arr` | `string \| string[] \| any` | — | Value to normalize. |

**Returns:** `string[]` — array form of the input.

#### `onlyUnique(value, index, array) → boolean`

Filter callback that keeps the first occurrence of each primitive value.

```js
[1, 2, 2, 3].filter(onlyUnique); // [1, 2, 3]
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `value` | `any` | — | The current element. |
| `index` | `number` | — | Index of the current element. |
| `array` | `any[]` | — | The array being filtered. |

**Returns:** `boolean` — `true` for the first occurrence of each value.

#### `onlyUniqueJson(value, index, array) → boolean`

Same idea but compares items via `JSON.stringify`. Use for arrays of plain objects.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `value` | `any` | — | The current element. |
| `index` | `number` | — | Index of the current element. |
| `array` | `any[]` | — | The array being filtered. |

**Returns:** `boolean` — `true` if no earlier element JSON-equals this one.

#### `removeFromArray(array, item) → boolean`

Splice the first occurrence of `item` out of `array`. Returns `true` if anything was removed.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `array` | `any[]` | — | Array to mutate. |
| `item` | `any` | — | Element to remove. |

**Returns:** `boolean` — `true` if an element was removed.

#### `shuffle(array) → array`

Fisher–Yates shuffle in place. Returns the same array.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `array` | `any[]` | — | Array to shuffle in place. |

**Returns:** `array` — the same array, now shuffled.

### Strings

#### `escapeHtml(str) → string`

HTML-escape `&`, `<`, `>`, `"`, `'`. Use before injecting user-supplied text into innerHTML.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `str` | `string` | — | Raw user-supplied string. |

**Returns:** `string` — the escaped string, safe for `innerHTML` interpolation.

#### `sanitizeSelector(str, replacement = '_') → string`

Replace characters that would break a CSS selector (spaces, dots, colons…) with `replacement`. Useful when deriving DOM IDs from chat or character names.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `str` | `string` | — | Candidate selector. |
| `replacement` | `string` | `'_'` | Replacement for unsafe characters. |

**Returns:** `string` — a selector-safe variant of `str`.

#### `isDigitsOnly(str) → boolean`

`true` when every character in the string is `0`–`9`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `str` | `string` | — | String to test. |

**Returns:** `boolean` — `true` if every character is a digit.

### Validation

#### `isValidUrl(value) → boolean`

`true` if `new URL(value)` succeeds.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `value` | `string` | — | Candidate URL string. |

**Returns:** `boolean` — `true` if `value` parses as a URL.

#### `isExternalUrl(url) → boolean`

`true` if the URL points at a different origin than the current page. Useful for warning before opening links.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `url` | `string` | — | URL to inspect. |

**Returns:** `boolean` — `true` if the URL's origin differs from `location.origin`.

#### `isUuid(value) → boolean`

`true` for a syntactically valid UUID v4.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `value` | `string` | — | Candidate UUID string. |

**Returns:** `boolean` — `true` if the value is a valid UUID v4.

#### `convertValueType(value, type) → any`

Cast a string to one of `'string' | 'number' | 'boolean' | 'array' | 'object' | 'null' | 'undefined'`. Used heavily by slash-command argument parsing.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `value` | `string` | — | The value to coerce. |
| `type` | `string` | — | Target type tag: `'string'`, `'number'`, `'boolean'`, `'array'`, `'object'`, `'null'`, `'undefined'`. |

**Returns:** `any` — the coerced value (type depends on `type`).

#### `stringToRange(input, min, max) → { start, end } | null`

Parse strings like `"3"`, `"3-7"`, `"-3"`, `"3-"` into a numeric range, clamped to `[min, max]`. Returns `null` on malformed input.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `input` | `string` | — | Range expression. |
| `min` | `number` | — | Lower clamp for the parsed start. |
| `max` | `number` | — | Upper clamp for the parsed end. |

**Returns:** `{ start: number, end: number } | null` — the parsed range, or `null` on malformed input.

### Files & data

#### `download(content, fileName, contentType) → void`

Trigger a browser download for `content` (a string or Blob).

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `content` | `string \| Blob` | — | Data to save. |
| `fileName` | `string` | — | Suggested filename. |
| `contentType` | `string` | — | MIME type for the download. |

**Returns:** none.

#### `getFileText(file) → Promise<string>`

Promise wrapper around `FileReader.readAsText`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `file` | `File \| Blob` | — | File or Blob to read. |

**Returns:** `Promise<string>` — the text contents of `file`.

#### `isSameFile(a, b) → boolean`

Compare two `File` objects by `name`, `size`, and `lastModified`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `a` | `File` | — | First file. |
| `b` | `File` | — | Second file. |

**Returns:** `boolean` — `true` if both files share `name`, `size`, and `lastModified`.

#### `bufferToBase64(buffer) → Promise<string>`

Encode an `ArrayBuffer` to a base64 string.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `buffer` | `ArrayBuffer` | — | Buffer to encode. |

**Returns:** `Promise<string>` — base64-encoded representation of `buffer`.

#### `urlContentToDataUri(url, params) → Promise<string>`

Fetch `url` (with optional `fetch` params) and return its body as a `data:` URI. Useful for embedding remote images into exports.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `url` | `string` | — | URL to fetch. |
| `params` | `RequestInit` | — | Optional `fetch` options. |

**Returns:** `Promise<string>` — a `data:` URI containing the response body.

### Pagination

These four work together with the [jQuery Paginator](https://github.com/josecebe/twbs-pagination) plugin used by ST list views.

#### `PAGINATION_TEMPLATE` (string)

Underscore-style template for `"<start>-<end> .. <total>"` ranges.

#### `localizePagination(container) → void`

Replace untranslated paginator strings inside `container` with localized versions.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `container` | `JQuery<HTMLElement> \| HTMLElement` | — | Container holding paginator markup to localize. |

**Returns:** none.

#### `renderPaginationDropdown(pageSize, sizeChangerOptions) → string`

Return the HTML for a page-size `<select>` matching ST's styling.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `pageSize` | `number` | — | Currently selected page size. |
| `sizeChangerOptions` | `Array<number \| string>` | — | Allowed page-size options. |

**Returns:** `string` — HTML for the `<select>` element.

#### `paginationDropdownChangeHandler(event, size) → void`

Default change handler — accepts the dropdown event and selected size.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `event` | `Event` | — | The `change` event from the dropdown. |
| `size` | `number` | — | The newly selected page size. |

**Returns:** none.

#### `navigation_option` (const)

```js
navigation_option.none      // 0
navigation_option.all       // -1
navigation_option.default   // -2
```

Sentinel values for paginator size selections.

#### `getSortableDelay() → number`

Returns 0 on desktop, 250 on touch — pass to jQuery UI's `sortable({ delay })` to avoid accidental drags on mobile.

**Returns:** `number` — `0` on desktop, `250` on touch devices.

### Async helpers

#### `waitUntilCondition(condition, timeout = 1000, interval = 100, options = {}) → Promise<void>`

Poll `condition()` every `interval` ms; resolve when it returns truthy, or reject after `timeout` ms. Pass `{ rejectOnTimeout: false }` to resolve (with an `Error` value) on timeout instead.

```js
import { waitUntilCondition } from '../../../utils.js';
import { is_group_generating } from '../../../group-chats.js';

await waitUntilCondition(() => is_group_generating === false, 10000, 250);
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `condition` | `() => any` | — | Predicate called on each poll; resolution happens when it returns truthy. |
| `timeout` | `number` | `1000` | Maximum wait time in milliseconds. |
| `interval` | `number` | `100` | Polling interval in milliseconds. |
| `options` | `object` | `{}` | Options bag. |
| `options.rejectOnTimeout` | `boolean` | `true` | When `false`, resolves with an `Error` instead of rejecting on timeout. |

**Returns:** `Promise<void>` — resolves once `condition()` is truthy, or rejects on timeout (unless `rejectOnTimeout: false`).

### Misc

#### `canUseNegativeLookbehind() → boolean`

`true` if the current engine compiles `/(?<!x)/`. Cache the result if you call it often.

**Returns:** `boolean` — `true` when the JS regex engine supports negative lookbehind.

## Notes

- Many other helpers exist in `utils.js` (e.g. `debounce`, `delay`, `getStringHash`, `copyText`, `humanFileSize`, `Stopwatch`, `RateLimiter`, `extractDataFromPng`, image/video helpers, Select2 helpers, `findChar`/`findPersona`). They follow the same import convention; check the source for signatures.
- There is no `tokenizers` helper in this file — see `tokenizers.js`.
