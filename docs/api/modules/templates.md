# templates.js

Tiny Handlebars rendering layer with built-in DOMPurify sanitization, i18n localization, and a compiled-template cache. ST's core UI and most extensions render HTML through these two functions.

**Import path from a third-party extension:**

```js
import { renderTemplate, renderTemplateAsync } from '../../../templates.js';
```

In most cases you should prefer the extension-aware wrapper [`renderExtensionTemplateAsync`](./extensions.md#renderextensiontemplateasyncextensionname-templateid-templatedata---sanitize--true-localize--true--promisestring), which scopes the template path to your extension's folder for you. Use these direct functions only when you need to load a template from an arbitrary path (via `fullPath: true`) or render a built-in `/scripts/templates/*.html` file.

## Exports at a glance

| Export | Kind | Summary |
|--------|------|---------|
| `renderTemplateAsync(templateId, data?, sanitize?, localize?, fullPath?)` | async fn | Async Handlebars render with optional sanitization + localization |
| `renderTemplate(templateId, data?, sanitize?, localize?, fullPath?)` | fn | Synchronous variant — deprecated, blocks the main thread |

## Reference

### `renderTemplateAsync(templateId, templateData = {}, sanitize = true, localize = true, fullPath = false) → Promise<string>`

Loads an HTML template, compiles it with Handlebars, runs it against `templateData`, and returns the resulting HTML string. Compiled templates are cached in a module-local `Map` keyed by their resolved URL, so repeated renders are cheap.

Path resolution:

- `fullPath = false` (default): `templateId` is treated as a relative ID under `/scripts/templates/`, producing the URL `` `/scripts/templates/${templateId}.html` ``.
- `fullPath = true`: `templateId` is used verbatim as the URL. This is how [`renderExtensionTemplateAsync`](./extensions.md) targets files inside an extension's own folder (e.g. `scripts/extensions/third-party/MyExt/panel.html`).

Pipeline applied to the rendered string, in order:

1. **Render**: `Handlebars.compile(html)(templateData)`.
2. **`sanitize`** (default `true`): runs the result through `DOMPurify.sanitize`. Disable only when you're rendering a template that intentionally produces something `DOMPurify` would strip (e.g. inline event handlers — but prefer not to).
3. **`localize`** (default `true`): runs the result through `applyLocale` from `i18n.js`, replacing `data-i18n` markers with the active locale's strings.

On failure, the error is logged and a `toastr.error` is shown; the function resolves to `undefined`. There is no thrown error to catch.

```js
const html = await renderTemplateAsync('myTemplate', { name: 'Alice' });
$('#somewhere').html(html);

// With a full path (typical for extension-owned templates):
const html2 = await renderTemplateAsync(
    '/scripts/extensions/third-party/MyExt/panel.html',
    { tokens: 1234 },
    true, true, true,
);
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `templateId` | `string` | — | Template identifier; either a name under `/scripts/templates/` or a full URL when `fullPath` is `true`. |
| `templateData` | `object` | `{}` | Data passed to the compiled Handlebars template. |
| `sanitize` | `boolean` | `true` | Run the rendered HTML through `DOMPurify.sanitize`. |
| `localize` | `boolean` | `true` | Apply `data-i18n` substitutions via `applyLocale`. |
| `fullPath` | `boolean` | `false` | Treat `templateId` as a full URL rather than a name under `/scripts/templates/`. |

**Returns:** `Promise<string>` — the rendered (and optionally sanitized + localized) HTML string. Resolves to `undefined` on failure (toast is shown, error logged).

### `renderTemplate(templateId, templateData = {}, sanitize = true, localize = true, fullPath = false) → string`

Synchronous mirror of `renderTemplateAsync`. Uses a blocking `XMLHttpRequest` to fetch the template the first time it's seen, then reuses the cached compiled function on subsequent calls.

**Deprecated** — the sync XHR can lock the UI on slow disks / network shares, and modern code paths assume async rendering. Prefer `renderTemplateAsync` everywhere.

```js
// Don't write new code like this — kept around for legacy compatibility.
const html = renderTemplate('myTemplate', { name: 'Alice' });
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `templateId` | `string` | — | Template identifier; either a name under `/scripts/templates/` or a full URL when `fullPath` is `true`. |
| `templateData` | `object` | `{}` | Data passed to the compiled Handlebars template. |
| `sanitize` | `boolean` | `true` | Run the rendered HTML through `DOMPurify.sanitize`. |
| `localize` | `boolean` | `true` | Apply `data-i18n` substitutions via `applyLocale`. |
| `fullPath` | `boolean` | `false` | Treat `templateId` as a full URL rather than a name under `/scripts/templates/`. |

**Returns:** `string` — the rendered HTML string (synchronously).

## Handlebars basics

SillyTavern uses stock Handlebars (no custom helpers are exposed to third-party extensions — `context.registerHelper` is a deprecated no-op). The features you'll use most:

```handlebars
{{name}}                     {{!-- escaped interpolation --}}
{{{rawHtml}}}                {{!-- unescaped (will still pass through DOMPurify) --}}
{{#if condition}} ... {{/if}}
{{#each items}} <li>{{this}}</li> {{/each}}
{{#unless flag}} ... {{/unless}}
{{> partialName}}            {{!-- not registered for extensions by default --}}
```

Pair the rendered string with `data-i18n` attributes to take advantage of the automatic localization pass:

```handlebars
<button data-i18n="my-extension-save">Save</button>
```

## Flag reference

| Flag | Default | Effect |
|------|---------|--------|
| `sanitize` | `true` | Run result through `DOMPurify.sanitize`. Set to `false` only when you control the entire input and need DOM features DOMPurify strips |
| `localize` | `true` | Apply the current locale's `data-i18n` substitutions |
| `fullPath` | `false` | Treat `templateId` as the full URL rather than a name under `/scripts/templates/` |

## See also

- [`renderExtensionTemplateAsync`](./extensions.md) — the extension-scoped wrapper. Prefer this in third-party extensions: it sets `fullPath` for you and resolves paths relative to `scripts/extensions/<your-name>/`.
