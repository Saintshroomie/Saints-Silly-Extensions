# Getting Started

> *You want to start a brand-new SillyTavern third-party extension and import from core.*

This guide walks through the bare minimum to scaffold an extension, wire up an entry point, and import from SillyTavern's source. It deliberately stays shallow — once you have a working skeleton, the patterns in [`CLAUDE.md`](../../../CLAUDE.md) cover everything else.

## Minimal example

### Directory layout

Third-party extensions live at:

```
SillyTavern/data/<user>/extensions/third-party/<extension-name>/
```

A minimal extension is three files:

```
my-extension/
├── manifest.json
├── index.js
└── style.css        (optional)
```

### `manifest.json`

```json
{
    "display_name": "My Extension",
    "loading_order": 1,
    "requires": [],
    "optional": [],
    "dependencies": [],
    "js": "index.js",
    "css": "style.css",
    "author": "Me",
    "version": "0.1.0",
    "homePage": "",
    "auto_update": true
}
```

See [`CLAUDE.md` → The Manifest](../../../CLAUDE.md#the-manifest-manifestjson) for the field-by-field breakdown.

### `index.js`

```js
// Imports — see the table below for the path conventions.
import { eventSource, event_types, saveSettingsDebounced } from '../../../../script.js';
import { extension_settings, renderExtensionTemplateAsync } from '../../../extensions.js';
import { getTokenCountAsync } from '../../../tokenizers.js';

const EXTENSION_NAME = 'my-extension';

const defaultSettings = {
    enabled: true,
    debugMode: false,
};

function getSettings() {
    extension_settings[EXTENSION_NAME] = {
        ...defaultSettings,
        ...(extension_settings[EXTENSION_NAME] ?? {}),
    };
    return extension_settings[EXTENSION_NAME];
}

function debug(...args) {
    if (!getSettings().debugMode) return;
    console.log(`[${EXTENSION_NAME}]`, ...args);
}

function addSettingsPanel() {
    const container = document.getElementById('extensions_settings');
    if (!container || document.getElementById(`${EXTENSION_NAME}_settings`)) return;

    container.insertAdjacentHTML('beforeend', `
        <div id="${EXTENSION_NAME}_settings" class="extension_settings">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>My Extension</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content">
                    <label class="checkbox_label">
                        <input id="${EXTENSION_NAME}_enabled" type="checkbox" />
                        <span>Enabled</span>
                    </label>
                </div>
            </div>
        </div>
    `);

    const cb = document.getElementById(`${EXTENSION_NAME}_enabled`);
    cb.checked = getSettings().enabled;
    cb.addEventListener('change', () => {
        getSettings().enabled = cb.checked;
        saveSettingsDebounced();
    });
}

function init() {
    getSettings();
    addSettingsPanel();

    eventSource.on(event_types.CHAT_CHANGED, () => {
        debug('chat changed');
    });
}

jQuery(async () => {
    init();
});
```

### `style.css`

```css
#my-extension_settings .menu_button {
    margin-top: 6px;
}
```

Scope every selector behind your extension's ID prefix so you don't fight ST's own styles. Prefer ST's CSS variables (`var(--SmartThemeQuoteColor, #e8a23a)`) over hardcoded colors — see [`ui-panels-and-drag.md`](ui-panels-and-drag.md) for the patterns.

## Variations

### Import path cheat sheet

From an extension's `index.js`, ST core lives four directories up. Use this table to count for you:

| Target | Relative import |
|--------|-----------------|
| `public/script.js` | `'../../../../script.js'` |
| `public/scripts/<file>.js` | `'../../../<file>.js'` |
| `public/scripts/<dir>/<file>.js` | `'../../../<dir>/<file>.js'` |

Concrete examples:

```js
import { eventSource, event_types, getRequestHeaders } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';
import { getTokenCountAsync, tokenizers } from '../../../tokenizers.js';
import { power_user } from '../../../power-user.js';
import { selected_group, groups } from '../../../group-chats.js';
import { callGenericPopup, POPUP_TYPE } from '../../../popup.js';
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
import { SlashCommand } from '../../../slash-commands/SlashCommand.js';
```

### Loading an HTML template instead of inline strings

If your UI grows beyond a small drawer, store it in `panel.html` next to `index.js` and render it with [`renderExtensionTemplateAsync`](../modules/extensions.md):

```js
import { renderExtensionTemplateAsync } from '../../../extensions.js';

const html = await renderExtensionTemplateAsync(
    `third-party/${EXTENSION_NAME}`,  // path under public/scripts/extensions/
    'panel',                          // file name without .html
    { title: 'Hello' },               // Handlebars context (optional)
);
document.body.insertAdjacentHTML('beforeend', html);
```

ST resolves the path relative to `public/scripts/extensions/`, so `third-party/my-extension/panel.html` is correct for a third-party install.

### Adding a quick-action button

```js
function addQuickButton() {
    const rightForm = document.getElementById('rightSendForm');
    if (!rightForm || document.getElementById(`${EXTENSION_NAME}_quick`)) return;

    const btn = document.createElement('div');
    btn.id = `${EXTENSION_NAME}_quick`;
    btn.classList.add('fa-solid', 'fa-flask', 'interactable');
    btn.title = 'Run my extension';
    btn.addEventListener('click', () => debug('clicked'));
    rightForm.appendChild(btn);
}
```

[`CLAUDE.md` → UI Integration](../../../CLAUDE.md#ui-integration) catalogs the standard ST class names (`menu_button`, `text_pole`, `list-group-item`, etc.).

### Reload during development

There is no build step. To pick up changes:

1. Save your file.
2. Hard-refresh the SillyTavern tab (Ctrl/Cmd+Shift+R).

Chrome DevTools will show your `console.log` output and any import errors. If your `index.js` throws during load, the extensions panel will display an error badge — check the console first.

## Gotchas

- **Wait for `jQuery`'s ready callback.** Touching `document.getElementById('extensions_settings')` before DOM-ready returns `null`. The `jQuery(async () => { init(); })` wrapper is the conventional entry point and runs after ST has built its base UI.
- **Don't cache `SillyTavern.getContext()` long-term.** Call it fresh inside event handlers so you always get the current chat / character. The object can change identity across navigation.
- **Always merge with defaults.** `{ ...defaultSettings, ...saved }` handles the case where a future version adds a new setting that doesn't exist in the user's saved JSON yet.
- **Symlinks work.** During development you can `ln -s ~/my-extension SillyTavern/data/default-user/extensions/third-party/my-extension` and edit in place.
- **`auto_update: true` overwrites local edits.** If you're hacking on an installed extension, set it to `false` or work in a checkout that isn't ST-managed.
- **One `loading_order`-per-extension matters only for inter-extension dependencies.** Leave it at `1` unless another extension depends on yours.

## See also

- Index: [`../README.md`](../README.md) — the full module / guide catalog.
- Reference: [`extensions.md`](../modules/extensions.md) — `extension_settings`, `renderExtensionTemplateAsync`, and the rest of the extension subsystem.
- Reference: [`st-context.md`](../modules/st-context.md) — what `SillyTavern.getContext()` exposes.
- Reference: [`events.md`](../modules/events.md) — the full event catalog.
- Guide: [`ui-panels-and-drag.md`](ui-panels-and-drag.md) — floating panels, drawers, drag handles.
- Guide: [`register-slash-commands.md`](register-slash-commands.md) — add a `/command`.
- Guide: [`manage-chat-messages.md`](manage-chat-messages.md) — touching `context.chat`.
- CLAUDE.md: [How SillyTavern Extensions Work](../../../CLAUDE.md#how-sillytavern-extensions-work), [The SillyTavern Context API](../../../CLAUDE.md#the-sillytavern-context-api), [Best Practices Summary](../../../CLAUDE.md#best-practices-summary).
