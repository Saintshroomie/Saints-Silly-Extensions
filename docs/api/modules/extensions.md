# extensions.js

The core extension subsystem: discovery, install / enable / disable, manifest access, per-character extension fields, settings storage, generation interceptors, and template rendering helpers. Most third-party extensions touch this module either directly or via [`st-context.js`](./st-context.md).

**Import path from a third-party extension:**

```js
import {
    extension_settings,
    renderExtensionTemplateAsync,
    writeExtensionField,
    UNSET_VALUE,
} from '../../../extensions.js';
```

## Exports at a glance

| Export | Kind | Summary |
|--------|------|---------|
| `extension_settings` | object | Global, persisted settings root for all extensions |
| `extensionNames` | string[] | Mutable list of discovered extension internal names |
| `extensionTypes` | Record<string,string> | Map of extension name to type (`global` / `local` / `system`) |
| `modules` | string[] | Active Extras API module names |
| `UNSET_VALUE` | const string | Sentinel passed to `writeExtensionField*` to delete a key |
| `EMPTY_AUTHOR` | const object | Frozen `{name:'',url:''}` sentinel returned by `getAuthorFromUrl` |
| `enableExtension(name, reload?)` | async fn | Removes name from `disabledExtensions`; optionally reloads page |
| `disableExtension(name, reload?)` | async fn | Adds name to `disabledExtensions`; optionally reloads page |
| `findExtension(name)` | fn | Resolves a short or full name to `{name, enabled}` or `null` |
| `getExtensionManifest(name)` | fn | Returns a deep clone of an extension's manifest (or `null`) |
| `deleteExtension(name, shouldClean?)` | async fn | Deletes a third-party extension from disk |
| `installExtension(url, global, branch?)` | async fn | Installs a third-party extension by repo URL |
| `loadExtensionSettings(settings, versionChanged, enableAutoUpdate)` | async fn | Internal loader run during ST boot |
| `doDailyExtensionUpdatesCheck()` | fn | Schedules background update check if enabled |
| `initExtensions()` | async fn | Internal one-time UI / DOM initialization |
| `writeExtensionField(characterId, key, value)` | async fn | Writes (or unsets) a key in `data.extensions` on one character |
| `writeExtensionFieldBulk(avatars, key, value, opts?)` | async fn | Bulk version of `writeExtensionField` |
| `renderExtensionTemplate(extensionName, templateId, data?, sanitize?, localize?)` | fn | Sync Handlebars render from an extension's folder (deprecated) |
| `renderExtensionTemplateAsync(extensionName, templateId, data?, sanitize?, localize?)` | async fn | Async Handlebars render from an extension's folder |
| `runGenerationInterceptors(chat, contextSize, type)` | async fn | Runs all registered `generate_interceptor` hooks |
| `doExtrasFetch(endpoint, args?)` | async fn | `fetch` wrapper that injects the Extras API key |
| `openThirdPartyExtensionMenu(suggestUrl?)` | async fn | Opens the "install third-party extension" popup |
| `isOfficialExtension(url)` | fn | True if `url` points to a `github.com/SillyTavern/*` repo |
| `getAuthorFromUrl(url)` | fn | Parses a GitHub URL into `{name, url}` |
| `cancelDebouncedMetadataSave()` | fn | Cancels a pending `saveMetadataDebounced` |
| `saveMetadataDebounced()` | fn | Saves chat metadata after a relaxed (~1s) debounce |

## Reference

### Lifecycle

#### `enableExtension(name, reload = true) → Promise<void>`

Removes the extension from `extension_settings.disabledExtensions`, fires its `enable` hook, persists settings, and (by default) reloads the page so the extension can boot. Pass `reload = false` to defer; the page will be marked as needing a reload.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | `string` | — | Extension name (internal key). |
| `reload` | `boolean` | `true` | If true, reload the page after enabling. |

**Returns:** `Promise<void>` — resolves after settings are saved (and before any reload).

#### `disableExtension(name, reload = true) → Promise<void>`

Inverse of `enableExtension`. Fires the extension's `disable` hook before persisting. Reloading the page is the only reliable way to fully unload an already-running extension.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | `string` | — | Extension name (internal key). |
| `reload` | `boolean` | `true` | If true, reload the page after disabling. |

**Returns:** `Promise<void>` — resolves after settings are saved.

#### `deleteExtension(extensionName, shouldClean = false) → Promise<void>`

Deletes a third-party extension from disk via `/api/extensions/delete`. When `shouldClean` is true, fires the extension's `clean` hook before deletion so it can scrub any persisted data. Forces a page reload one second after success.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `extensionName` | `string` | — | Extension name to delete (with or without `third-party` prefix). |
| `shouldClean` | `boolean` | `false` | Also run the `clean` hook before deletion. |

**Returns:** `Promise<void>` — resolves after the delete API call; a page reload follows ~1s later.

#### `installExtension(url, global, branch = '') → Promise<boolean>`

Installs a third-party extension by cloning `url` (HTTP/HTTPS only). When the URL is not under `github.com/SillyTavern/*`, the user is shown a confirmation popup (unless they've previously opted out via account storage). `global` controls whether the extension is installed for all users (admin only). `branch` optionally checks out a specific branch or tag. Resolves to `true` on success.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `url` | `string` | — | Extension repository URL (HTTP/HTTPS only). |
| `global` | `boolean` | — | Install for all users (admin only). |
| `branch` | `string` | `''` | Branch or tag to install; defaults to the repo's default branch. |

**Returns:** `Promise<boolean>` — `true` on success, `false` if the URL is invalid or the user cancels.

#### `loadExtensionSettings(settings, versionChanged, enableAutoUpdate) → Promise<void>`

Internal loader called by `script.js` during settings load. Discovers extensions, fetches their manifests, runs auto-updates if applicable, and activates them. Third-party extensions should not call this directly.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `settings` | `object` | — | App settings blob (may contain `extension_settings`). |
| `versionChanged` | `boolean` | — | Whether the ST version changed since last boot. |
| `enableAutoUpdate` | `boolean` | — | Whether auto-update should run on version change. |

**Returns:** `Promise<void>` — resolves once extensions are activated.

#### `doDailyExtensionUpdatesCheck() → void`

Schedules a background update check if the user has enabled `notifyUpdates`. Called once during ST boot.

**Returns:** `void`.

#### `initExtensions() → Promise<void>`

One-time UI initialization: adds the wand button, binds the extensions panel handlers, and wires up the install dialog. Third-party extensions should not call this.

**Returns:** `Promise<void>` — resolves once UI has been wired up.

### Settings & metadata

#### `extension_settings`

`extension_settings: object` — the single global object where ST persists all extension settings. The same object is exposed as `context.extensionSettings`. Pre-seeded with sub-objects for built-in extensions (`memory`, `note`, `expressions`, `regex`, `connectionManager`, `vectors`, `variables.global`, ...).

Third-party extensions should namespace their data:

```js
extension_settings.myExt = { ...defaults, ...(extension_settings.myExt ?? {}) };
saveSettingsDebounced();
```

#### `UNSET_VALUE`

`UNSET_VALUE: string` — a sentinel string (`'__@@UNSET@@__'`) passed to `writeExtensionField` / `writeExtensionFieldBulk` when you want the field **deleted** rather than set. Passing `null` would set the key to `null`; this constant removes it entirely.

#### `writeExtensionField(characterId, key, value) → Promise<void>`

Writes `value` into `character.data.extensions[key]` for the character at `characterId`, syncing both the in-memory object and the persisted card on the server. Pass `UNSET_VALUE` to delete the key instead.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `characterId` | `number \| string` | — | Index in the character array. |
| `key` | `string` | — | Field name under `data.extensions`. |
| `value` | `any` | — | Field value; pass `UNSET_VALUE` to delete the key. |

**Returns:** `Promise<void>` — resolves once the server merge-attributes call completes.

#### `writeExtensionFieldBulk(avatars, key, value, { filterPath? } = {}) → Promise<BulkExtensionFieldResult>`

Bulk variant. `avatars` is an array of avatar filenames, or `null`/`[]` to target every character. Returns `{ updated, skipped, failed }` arrays of avatar filenames. When `value === UNSET_VALUE`, the server-side filter defaults to `data.extensions.<key>` so characters that don't have the field are skipped (you can override via `filterPath`).

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `avatars` | `string[] \| null` | — | Avatar filenames to target; `null`/`[]` targets every character. |
| `key` | `string` | — | Extension field name (e.g. `"greeting_tools"`). |
| `value` | `any` | — | Field value, `null` to set null, or `UNSET_VALUE` to delete. |
| `options.filterPath` | `string` | `undefined` | Dot-path filter; defaults to `data.extensions.<key>` when unsetting. |

**Returns:** `Promise<BulkExtensionFieldResult>` — `{ updated, skipped, failed }` arrays of avatar filenames.

#### `cancelDebouncedMetadataSave() → void` / `saveMetadataDebounced() → void`

Pair of helpers for batching metadata saves at the `debounce_timeout.relaxed` (~1s) interval. `saveMetadataDebounced` schedules a save and verifies the character/group hasn't changed before committing. Calling `cancelDebouncedMetadataSave` aborts a pending save (useful when switching chats and the new state is incompatible).

**Returns:** none (both functions return `void`).

### UI / templates

#### `renderExtensionTemplate(extensionName, templateId, templateData = {}, sanitize = true, localize = true) → string`

Synchronously renders `scripts/extensions/<extensionName>/<templateId>.html` through Handlebars. **Deprecated** — prefer the async version. Sanitation and localization are applied by default.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `extensionName` | `string` | — | Path under `scripts/extensions/`. |
| `templateId` | `string` | — | Template filename (without `.html`). |
| `templateData` | `object` | `{}` | Additional data passed to the template. |
| `sanitize` | `boolean` | `true` | Sanitize HTML output. |
| `localize` | `boolean` | `true` | Apply i18n to template strings. |

**Returns:** `string` — rendered HTML.

#### `renderExtensionTemplateAsync(extensionName, templateId, templateData = {}, sanitize = true, localize = true) → Promise<string>`

Async variant; the only difference is non-blocking I/O. `extensionName` is the path under `scripts/extensions/` (use `'third-party/<your-folder>'` for third-party extensions). Wraps [`renderTemplateAsync`](./templates.md) with `fullPath` semantics derived from the extension folder.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `extensionName` | `string` | — | Path under `scripts/extensions/` (use `'third-party/<your-folder>'`). |
| `templateId` | `string` | — | Template filename (without `.html`). |
| `templateData` | `object` | `{}` | Additional data passed to the template. |
| `sanitize` | `boolean` | `true` | Sanitize HTML output. |
| `localize` | `boolean` | `true` | Apply i18n to template strings. |

**Returns:** `Promise<string>` — rendered HTML.

```js
const html = await renderExtensionTemplateAsync(
    'third-party/MyExt',
    'settings-panel',
    { name: characterName },
);
document.getElementById('extensions_settings').insertAdjacentHTML('beforeend', html);
```

#### `openThirdPartyExtensionMenu(suggestUrl = '') → Promise<void>`

Opens ST's "Install extension from URL" dialog. `suggestUrl` pre-fills the input. Admin users see an extra "Install for all users" button.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `suggestUrl` | `string` | `''` | Pre-fills the URL input. |

**Returns:** `Promise<void>` — resolves once the popup completes (whether install succeeded or was cancelled).

### Generation interceptors

#### `runGenerationInterceptors(chat, contextSize, type) → Promise<boolean>`

Runs every extension's registered `generate_interceptor` function in `loading_order` sequence, passing the chat array (mutable), the context size, an `abort(immediately)` callback, and the generation `type`. Returns `true` if any interceptor called `abort`. The function exits the loop immediately when an interceptor calls `abort(true)`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `chat` | `any[]` | — | Mutable chat array passed to each interceptor. |
| `contextSize` | `number` | — | Current generation context size in tokens. |
| `type` | `string` | — | Generation kind (`'normal'`, `'quiet'`, `'continue'`, etc.). |

**Returns:** `Promise<boolean>` — `true` if any interceptor aborted generation.

To register an interceptor, declare its global function name in your extension's `manifest.json`:

```json
{ "generate_interceptor": "myExtensionInterceptor" }
```

And expose the function on `globalThis` (or `window`) before generation runs.

### Discovery & install

#### `findExtension(name) → {name: string, enabled: boolean} | null`

Looks up an extension by short name (`MyExt`) or full internal key (`third-party/MyExt`), case- and accent-insensitive. Returns `null` if not found.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | `string` | — | Short name or full internal key. |

**Returns:** `{name: string, enabled: boolean} | null` — the resolved name and current enabled state, or `null` if no match.

#### `getExtensionManifest(name) → object | null`

Returns a `structuredClone` of the matched extension's manifest, or `null` if not found. Safe to mutate without affecting the cached manifest.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | `string` | — | Short name or full internal key. |

**Returns:** `object | null` — cloned manifest, or `null` if no match.

#### `isOfficialExtension(url) → boolean`

`true` only if `url` parses as a valid URL under `https://github.com/SillyTavern/<path>`. Used to suppress the third-party-install confirmation popup.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `url` | `string` | — | URL to check. |

**Returns:** `boolean` — `true` if the URL is an official SillyTavern GitHub repo.

#### `getAuthorFromUrl(url) → {name: string, url: string}`

Extracts the GitHub repo owner. Returns a clone of `EMPTY_AUTHOR` for non-GitHub or unparseable URLs.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `url` | `string` | — | Repository URL. |

**Returns:** `{name: string, url: string}` — the author's GitHub username and profile URL (empty strings if extraction fails).

#### `EMPTY_AUTHOR`

`EMPTY_AUTHOR: {name: string, url: string}` — frozen `{name: '', url: ''}` sentinel returned by `getAuthorFromUrl` when no author can be parsed.

#### `doExtrasFetch(endpoint, args = {}) → Promise<Response>`

Thin wrapper around `fetch` that injects the `Authorization: Bearer <apiKey>` header when `extension_settings.apiKey` is set. Use it for any call to the Extras API.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `endpoint` | `string \| URL` | — | Extras API endpoint. |
| `args` | `RequestInit` | `{}` | Standard `fetch` options; headers will be merged. |

**Returns:** `Promise<Response>` — the raw `fetch` response.

### State

These mutable module-level bindings are exported so other ST internals can read them. Treat them as read-only from extensions.

#### `extensionNames`

`extensionNames: string[]` — array of every discovered extension's internal name (e.g. `'expressions'`, `'third-party/SillyTavern-MyExt'`). Populated by `loadExtensionSettings`.

#### `extensionTypes`

`extensionTypes: Record<string, string>` — object mapping extension name to type: `'global'`, `'local'`, or `'system'`. `'system'` extensions ship with ST and cannot be deleted.

#### `modules`

`modules: string[]` — the Extras API module list returned from `/api/modules` on the configured Extras server. Empty when Extras is not connected. Use this to gate features that require a specific Extras module (e.g. `'caption'`, `'tts'`).
