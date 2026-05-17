# popup.js

Modal dialog system for SillyTavern. Build custom dialogs, confirmation prompts, and input boxes that integrate with the app's focus management and theming.

**Import path from a third-party extension:**

```js
import {
    Popup,
    PopupUtils,
    callGenericPopup,
    getTopmostModalLayer,
    fixToastrForDialogs,
    POPUP_TYPE,
    POPUP_RESULT,
} from '../../../popup.js';
```

See also: [`../guides/show-a-modal.md`](../guides/show-a-modal.md).

## Exports at a glance

| Export | Kind | Summary |
|--------|------|---------|
| `POPUP_TYPE` | const enum | Popup variant: `TEXT`, `CONFIRM`, `INPUT`, `DISPLAY`, `CROP`. |
| `POPUP_RESULT` | const enum | Result code: `AFFIRMATIVE`, `NEGATIVE`, `CANCELLED`, plus `CUSTOM1..CUSTOM9`. |
| `Popup` | class | Full-featured dialog wrapper around `<dialog>`. |
| `PopupUtils` | class | Static helpers used by `Popup` (e.g. building headered content). |
| `callGenericPopup` | function | One-shot helper for opening a popup and awaiting its result. |
| `getTopmostModalLayer` | function | Returns the current top dialog element or `document.body`. |
| `fixToastrForDialogs` | function | Re-parents toastr notifications so they sit above active dialogs. |

## Reference

### `POPUP_TYPE`

```js
POPUP_TYPE.TEXT     // 1 — text + buttons (Yes/No-ish)
POPUP_TYPE.CONFIRM  // 2 — confirm-focused
POPUP_TYPE.INPUT    // 3 — main input field; resolves to the entered string
POPUP_TYPE.DISPLAY  // 4 — content only, X-close
POPUP_TYPE.CROP     // 5 — image-crop popup, resolves to a data URL
```

### `POPUP_RESULT`

```js
POPUP_RESULT.AFFIRMATIVE  // 1   (OK / Yes)
POPUP_RESULT.NEGATIVE     // 0   (No)
POPUP_RESULT.CANCELLED    // null (closed via Esc / close button)
POPUP_RESULT.CUSTOM1..9   // 1001..1009 — for custom button results
```

### `class Popup`

#### `new Popup(content, type, inputValue?, options?)`

Build a popup but do not yet display it. `content` may be a string, an `Element`, or a jQuery wrapper.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `content` | `JQuery<HTMLElement> \| string \| Element` | — | Body content of the popup. |
| `type` | `POPUP_TYPE` | — | Popup variant from `POPUP_TYPE`. |
| `inputValue` | `string` | `''` | Initial value of the input field (for `INPUT` popups). |
| `options` | `PopupOptions` | `{}` | See the `PopupOptions` bullet list below. |

`options` is a `PopupOptions` object (see source for the full shape) and supports:

- `okButton`, `cancelButton` — custom labels or `true`/`false` to force show/hide.
- `rows`, `placeholder`, `tooltip` — input controls.
- `wide`, `wider`, `large`, `transparent` — layout flags.
- `allowHorizontalScrolling`, `allowVerticalScrolling`, `leftAlign`.
- `animation` — `'slow' | 'fast' | 'none'`.
- `defaultResult` — which `POPUP_RESULT` Enter triggers (default `AFFIRMATIVE`).
- `customButtons` — array of `{ text, result, classes?, icon?, action?, appendAtEnd? }` (or just strings).
- `customInputs` — extra labelled inputs (checkboxes, text, textarea, number).
- `allowEscapeClose` — disable single-Esc close.
- `onClosing`, `onClose`, `onOpen` — lifecycle hooks. `onClosing` can return `false` to cancel close.
- `cropAspect`, `cropImage` — only for `POPUP_TYPE.CROP`.

**Returns:** a `Popup` instance (not yet shown — call `.show()`).

#### `popup.show() → Promise<string|number|boolean|null>`

Mount the dialog, show it, and resolve when the user closes it. Resolution value depends on type:

- `INPUT` — the typed string, `false` on Negative, `null` on Cancel.
- `CROP` — cropped image as a JPEG data URL, or `null`.
- Others — the chosen `POPUP_RESULT` (or custom number).

**Returns:** `Promise<string | number | boolean | null>` — resolves when the popup closes; shape depends on the `POPUP_TYPE`.

#### `popup.complete(result) → Promise<...>`

Programmatically close the popup with a given result. Resolves to `undefined` if `onClosing` blocked the close.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `result` | `POPUP_RESULT \| number` | — | Result to close with — either a `POPUP_RESULT` constant or a custom numeric result. |

**Returns:** `Promise<string | number | boolean | undefined | null>` — same shape as `show()`; resolves to `undefined` if `onClosing` cancelled the close.

#### `popup.completeAffirmative()` / `completeNegative()` / `completeCancelled()`

Convenience wrappers over `complete(...)`.

**Returns:** `Promise<...>` — same shape as `complete()`.

#### `popup.setAutoFocus({ applyAutoFocus? })`

Focus the most appropriate control (main input for `INPUT` popups, default button otherwise). Pass `applyAutoFocus: true` to set the HTML `autofocus` attribute instead of imperatively focusing.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `options` | `object` | `{}` | Option bag. |
| `options.applyAutoFocus` | `boolean` | `false` | Set the HTML `autofocus` attribute instead of imperatively focusing. |

**Returns:** none.

#### Static: `Popup.show`

Quick helpers that don't require constructing a `Popup` manually.

- `Popup.show.input(header, text?, defaultValue?, options?) → Promise<string|null>`
- `Popup.show.confirm(header, text?, options?) → Promise<POPUP_RESULT|null>`
- `Popup.show.text(header, text, options?) → Promise<POPUP_RESULT|null>`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `header` | `string \| null` | — | Header text rendered as an `<h3>`; pass `null` to omit. |
| `text` | `string \| null` | — | Body text below the header. |
| `defaultValue` | `string` | `''` | (input only) Pre-filled input value. |
| `options` | `PopupOptions` | `{}` | Same options bag as the `Popup` constructor. |

**Returns:** `Promise<string | POPUP_RESULT | null>` — typed value (`input`) or the chosen `POPUP_RESULT`.

#### Static: `Popup.util`

- `Popup.util.popups: Popup[]` — array of currently mounted popups.
- `Popup.util.lastResult: { value, result, inputResults } | null` — result of the most recently closed popup.
- `Popup.util.isPopupOpen() → boolean`.
- `Popup.util.getTopmostModalLayer() → HTMLElement`.

### `class PopupUtils`

Static helper class.

#### `PopupUtils.BuildTextWithHeader(header, text) → string`

Returns `<h3>header</h3>text` when a header is provided, otherwise just `text`. Used internally by `Popup.show.*` helpers.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `header` | `string \| null` | — | Header text, or `null`/empty for no header. |
| `text` | `string \| null` | — | Main body text. |

**Returns:** `string` — composite HTML string.

### `callGenericPopup(content, type, inputValue?, popupOptions?) → Promise<POPUP_RESULT|string|boolean|null>`

Build and immediately show a `Popup`. The most common API for extensions.

```js
import { callGenericPopup, POPUP_TYPE, POPUP_RESULT } from '../../../popup.js';

const result = await callGenericPopup(
    'Delete this entry? This cannot be undone.',
    POPUP_TYPE.CONFIRM,
    '',
    { okButton: 'Delete', cancelButton: 'Cancel' },
);

if (result === POPUP_RESULT.AFFIRMATIVE) {
    // proceed
}
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `content` | `JQuery<HTMLElement> \| string \| Element` | — | Body content of the popup. |
| `type` | `POPUP_TYPE` | — | Popup variant. |
| `inputValue` | `string` | `''` | Initial value of the input field (for `INPUT` popups). |
| `popupOptions` | `PopupOptions` | `{}` | Same options bag as the `Popup` constructor. |

**Returns:** `Promise<POPUP_RESULT | string | boolean | null>` — popup result, or the input value when applicable.

### `getTopmostModalLayer() → HTMLElement`

Returns the topmost open `<dialog>` element, or `document.body` when no dialog is open. Useful for portaling content (menus, toasts) into the right stacking layer.

**Returns:** `HTMLElement` — the topmost `<dialog>` element, or `document.body` when no dialog is open.

### `fixToastrForDialogs() → void`

Re-parents the toastr container into the topmost modal layer so notifications remain visible while a dialog is open. Called automatically by `Popup` on show/hide.

**Returns:** none.

## Notes

- The `setContent` / `setInput` / `hide` methods listed in older docs are not exported as public methods. Use `Popup.show.*` or `callGenericPopup` instead, and close via `complete*()`.
- There is no `POPUP_TYPE.DEFAULT`, `TEXTAREA`, `SELECT`, `CHECKBOX`, or `CUSTOM`. Use `customInputs` and `customButtons` in `PopupOptions` for those patterns.
- `POPUP_RESULT.CANCEL` is spelled `CANCELLED` in source.
