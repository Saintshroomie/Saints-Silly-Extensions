# RossAscends-mods.js

UX helpers: window-drag support for moving UI panels, user-agent detection, time/date formatting, token-count badges, and the "favourite character hotswap" panel.

**Import path from a third-party extension:**

```js
import {
    dragElement,
    humanizeGenTime,
    getParsedUA,
    isMobile,
    shouldSendOnEnter,
    humanizedDateTime,
    getMessageTimeStamp,
    RA_CountCharTokens,
    favsToHotswap,
    initMovingUI,
    autoFitSendTextAreaDebounced,
    initRossMods,
} from '../../../RossAscends-mods.js';
```

## Exports at a glance

| Export | Kind | Summary |
|--------|------|---------|
| `dragElement` | function | Make a jQuery-wrapped element drag/resize with persisted position. |
| `humanizeGenTime` | function | Render an elapsed-time number in `mm:ss` form. |
| `getParsedUA` | function | Parse the current `navigator.userAgent` via UAParser. |
| `isMobile` | function | Returns `true` on mobile or tablet form factors. |
| `shouldSendOnEnter` | function | Honors the user's "send on Enter" preference. |
| `humanizedDateTime` | function | Locale-aware human readable date+time. |
| `getMessageTimeStamp` | function | Stable timestamp format used on chat messages. |
| `RA_CountCharTokens` | async function | Counts and displays card tokens on the character UI. |
| `favsToHotswap` | async function | Re-renders the favourites hotswap panel. |
| `initMovingUI` | async function | Initialize the Moving UI (loadable layout) subsystem. |
| `autoFitSendTextAreaDebounced` | function | Debounced auto-resize for `#send_textarea`. |
| `initRossMods` | function | One-shot module initializer (called by ST at boot). |

## Reference

### `dragElement($elmnt) → void`

Wires up a jQuery-wrapped element so the user can drag and resize it via the Moving UI system. The element **must** have a unique `id` for its position to persist across sessions.

```js
import { dragElement } from '../../../RossAscends-mods.js';
import { loadMovingUIState } from '../../../power-user.js';

dragElement($('#my_extension_panel'));
loadMovingUIState();   // restore last saved position
```

`loadMovingUIState` lives in [`power-user.js`](./power-user.md), not this module — call it after mounting your panel.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `$elmnt` | `JQuery` | — | The jQuery-wrapped element to make draggable. Must have a unique `id` for persistence. |

**Returns:** none.

### `humanizeGenTime(total_gen_time) → string`

Formats a millisecond duration into a short `mm:ss` (or `Xs`) display string suitable for showing on a generation badge.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `total_gen_time` | `number` | — | Generation time in milliseconds. |

**Returns:** `string` — human-readable duration (`mm:ss` or `Xs`).

### `getParsedUA() → IResult`

Returns the cached `UAParser` result for the current browser. Use `.os.name`, `.browser.name`, `.device.type`, etc.

**Returns:** `IResult` — the UAParser result object (`browser`, `os`, `device`, etc.).

### `isMobile() → boolean`

`true` when the device type is `'mobile'` or `'tablet'`.

**Returns:** `boolean` — `true` on mobile/tablet form factors.

### `shouldSendOnEnter() → boolean`

Resolves the user's "send on Enter" setting and the current modifier state. Use this from a textarea handler to decide whether Enter should submit or insert a newline.

**Returns:** `boolean` — `true` if the current key event should submit, `false` to insert a newline.

### `humanizedDateTime(timestamp?) → string`

Locale-aware date+time. Defaults to `Date.now()`. Used in places like character creation timestamps.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `timestamp` | `number` | `Date.now()` | Milliseconds since epoch. |

**Returns:** `string` — humanized timestamp `YYYY-MM-DD@HHhMMmSSsMSms`.

### `getMessageTimeStamp(timestamp?) → string`

The fixed timestamp format ST writes onto chat messages. Prefer this when stamping messages your extension creates so they match the rest of the chat.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `timestamp` | `number` | `Date.now()` | Optional explicit timestamp in milliseconds. |

**Returns:** `string` — ISO 8601 formatted timestamp.

### `RA_CountCharTokens() → Promise<void>`

Recalculates and updates the token-count display in the character editor. Call after programmatically modifying a card field if you need the count refreshed immediately.

**Returns:** `Promise<void>` — resolves once the badge has been updated.

### `favsToHotswap() → Promise<void>`

Rebuilds the favourites hotswap row at the top of the character panel. Call after toggling a character's `fav` flag.

**Returns:** `Promise<void>` — resolves once the hotswap row is repainted.

### `initMovingUI() → Promise<void>`

Initializes the Moving UI overlay (the floating-panel layout system). Called once during app boot. Usually not invoked manually by extensions, but useful when a popout/floating panel needs the system available.

**Returns:** `Promise<void>` — resolves once the Moving UI subsystem is ready.

### `autoFitSendTextAreaDebounced()`

A debounced (short-timeout) version of the chat textarea auto-grow handler. Call after programmatically setting `#send_textarea` content to keep it visually sized.

**Returns:** none.

### `initRossMods() → void`

Boot-time initializer. Not normally called from extension code.

**Returns:** none.

## Notes

- `humanizeGenTime` actually accepts `total_gen_time` as a number of milliseconds — the parameter is named that way in source.
- `dragElement` requires jQuery (`$(elem)`); a raw DOM element will not work.
- Position persistence depends on `power_user.movingUIState`; see `loadMovingUIState` in [`power-user.js`](./power-user.md).
