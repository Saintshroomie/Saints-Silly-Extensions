# UI Panels and Drag

> *You want to add a draggable floating panel that remembers its position.*

SillyTavern's `dragElement` + `loadMovingUIState` pair gives you free position persistence: as long as your panel has an `id`, ST stores its last position in `power_user.movingUIState` and restores it on the next reload. This guide covers the floating-panel flow, the popout pattern, and the settings-drawer alternative.

## Minimal example

```js
import { renderExtensionTemplateAsync } from '../../../extensions.js';
import { dragElement } from '../../../RossAscends-mods.js';
import { loadMovingUIState } from '../../../power-user.js';

const EXTENSION_NAME = 'my-extension';

async function showPanel() {
    if (document.getElementById('my_extension_panel')) return;

    // panel.html lives next to index.js
    const html = await renderExtensionTemplateAsync(
        `third-party/${EXTENSION_NAME}`,
        'panel',
    );
    document.body.insertAdjacentHTML('beforeend', html);

    const panel = document.getElementById('my_extension_panel');
    dragElement($(panel));    // jQuery wrapper required
    loadMovingUIState();      // restore last-known position
}
```

A matching `panel.html`:

```html
<div id="my_extension_panel" class="drawer-content draggable">
    <div class="panelControlBar flex-container" id="my_extension_header">
        <div class="fa-solid fa-grip drag-grabber"></div>
        <div class="fa-solid fa-circle-xmark floating_panel_close" id="my_extension_close"></div>
    </div>
    <div class="my-extension-body">
        <h3>My Panel</h3>
        <p>Drag me by the grip handle.</p>
    </div>
</div>
```

The `.drag-grabber` element inside the panel is what `dragElement` listens to — without it, the whole panel becomes the drag handle (often fine, but interferes with text selection).

## Variations

### Popout toggle

The popout pattern lets the user pop your extension out of the sidebar into a floating window. The trick is a single CSS class that swaps positioning between "embedded in `#extensions_settings`" and "floating".

```js
import { saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

function togglePopout() {
    const panel = document.getElementById('my_extension_panel');
    panel.classList.toggle('popout');

    extension_settings[EXTENSION_NAME].popout = panel.classList.contains('popout');
    saveSettingsDebounced();

    if (panel.classList.contains('popout')) {
        dragElement($(panel));
        loadMovingUIState();
    }
}
```

CSS for the popout state:

```css
#my_extension_panel.popout {
    position: fixed;
    top: 100px;
    left: 100px;
    width: 400px;
    max-height: 70vh;
    overflow: auto;
    z-index: 3000;
    background: var(--SmartThemeBlurTintColor, rgba(20, 20, 20, 0.95));
    border: 1px solid var(--SmartThemeBorderColor, #555);
    border-radius: 8px;
}
```

Restore the popout state on init by reading the saved flag and calling `togglePopout()` if it was on last time.

### Minimize / restore

A common pattern is a header bar that collapses the body. Track state via a class, persist it the same way:

```js
function setupMinimize() {
    const header = document.getElementById('my_extension_header');
    const body = document.querySelector('#my_extension_panel .my-extension-body');

    header.addEventListener('dblclick', () => {
        const collapsed = body.classList.toggle('hidden');
        extension_settings[EXTENSION_NAME].minimized = collapsed;
        saveSettingsDebounced();
    });
}
```

### Settings drawer (no float, no drag)

If you only need a settings UI, skip the floating-panel machinery entirely and use ST's `inline-drawer` pattern — it's the same markup the rest of the app uses. [`CLAUDE.md` → Settings Panel](../../../CLAUDE.md#settings-panel) has the canonical template; the short version is:

```js
function addSettingsDrawer() {
    const container = document.getElementById('extensions_settings');
    if (!container || document.getElementById('my_extension_settings')) return;

    container.insertAdjacentHTML('beforeend', `
        <div id="my_extension_settings" class="extension_settings">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>My Extension</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content">
                    <label class="checkbox_label">
                        <input id="my_extension_enabled" type="checkbox" />
                        <span>Enable</span>
                    </label>
                    <select id="my_extension_mode" class="text_pole">
                        <option value="auto">Auto</option>
                        <option value="manual">Manual</option>
                    </select>
                    <div id="my_extension_action" class="menu_button">Run now</div>
                </div>
            </div>
        </div>
    `);
}
```

Standard reusable ST classes:

| Class | Use |
|-------|-----|
| `menu_button` | Primary action button |
| `interactable` | Adds hover / cursor styling to a clickable element |
| `list-group-item` | Hamburger-menu-style entry |
| `checkbox_label` | Wraps a labeled checkbox |
| `text_pole` | Standard text input / `<select>` styling |
| `fa-solid fa-<icon>` | Font Awesome 6 solid icon |
| `inline-drawer` | Collapsible section with chevron toggle |

### Theming with ST CSS variables

Always reach for the theme variables before hardcoding colors — the user's selected theme will pick them up automatically. Provide a fallback for safety:

```css
.my-extension-body h3 {
    color: var(--SmartThemeQuoteColor, #e8a23a);
}

.my-extension-body .indicator.active {
    border-left: 3px solid var(--SmartThemeQuoteColor, #e8a23a) !important;
}
```

Useful variables: `--SmartThemeBodyColor`, `--SmartThemeQuoteColor`, `--SmartThemeBorderColor`, `--SmartThemeBlurTintColor`, `--SmartThemeChatTintColor`. [`CLAUDE.md` → CSS Patterns](../../../CLAUDE.md#css-patterns) has more examples.

## Gotchas

- **The panel `must` have an `id` for position to persist.** `loadMovingUIState` keys on the element ID; an anonymous div will drag but won't remember where it was on the next reload.
- **`dragElement` expects a jQuery object, not a DOM node.** Wrap with `$(panel)`. Passing the raw element silently fails.
- **Don't call `dragElement` twice on the same node.** It binds new listeners every call; the panel will start moving in increments. Guard with `if (!panel.dataset.dragInitialized) { ... }`.
- **`loadMovingUIState()` reads from `power_user.movingUIState`.** If the user has UI scaling enabled or has never moved the panel, the call is a no-op — which is fine.
- **Z-index wars with ST's modals.** A popout at `z-index: 3000` sits above the chat but below `callGenericPopup` (which lives at ~`10000`). Don't try to fight popups; close your panel or let them stack above it.
- **Restore state in init order.** Read the saved popout / minimized flags *after* you've inserted the panel into the DOM but *before* `loadMovingUIState()`, so the position restore applies to the correct configuration.
- **Multiple panels need unique IDs.** If your extension has two floating windows, give them different IDs so their positions persist independently.

## See also

- Reference: [`ross-ascends-mods.md`](../modules/ross-ascends-mods.md) — `dragElement` and friends.
- Reference: [`power-user.md`](../modules/power-user.md) — `loadMovingUIState`, the `power_user` settings root.
- Reference: [`extensions.md`](../modules/extensions.md) — `renderExtensionTemplateAsync`, `extension_settings`.
- Guide: [`getting-started.md`](getting-started.md) — base scaffolding (settings drawer is shown there too).
- Guide: [`show-a-modal.md`](show-a-modal.md) — when you want a one-shot dialog instead of a persistent panel.
- CLAUDE.md: [UI Integration](../../../CLAUDE.md#ui-integration), [CSS Patterns](../../../CLAUDE.md#css-patterns), [Popout / Draggable Panels](../../../CLAUDE.md#popout--draggable-panels).
