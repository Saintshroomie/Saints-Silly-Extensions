# Show a Modal

> *You want to show a dialog and react to the answer.*

SillyTavern exposes a single popup helper — `callGenericPopup` — that covers alerts, confirms, prompts, and fully custom dialogs. It returns a `Promise` that resolves with the user's response, so you `await` it inline.

## Minimal example

```js
import { callGenericPopup, POPUP_TYPE, POPUP_RESULT } from '../../../popup.js';

async function confirmAndProceed() {
    const result = await callGenericPopup(
        'Delete all scene summaries? This cannot be undone.',
        POPUP_TYPE.CONFIRM,
    );

    if (result === POPUP_RESULT.AFFIRMATIVE) {
        // user clicked OK / Yes
        await clearSceneSummaries();
    }
    // POPUP_RESULT.NEGATIVE or POPUP_RESULT.CANCELLED → user said no
}
```

`POPUP_RESULT.AFFIRMATIVE` is truthy (`1`) and `POPUP_RESULT.NEGATIVE` is falsy (`0`), so a quick `if (result)` works for confirms — but checking the constant explicitly is clearer when you also want to distinguish CANCELLED (`null`).

## Variations

### Plain notice (`POPUP_TYPE.TEXT`)

A one-button informational dialog. The return value is the OK result; you usually ignore it.

```js
await callGenericPopup(
    '<b>Pipeline complete.</b><br>3 facts extracted.',
    POPUP_TYPE.TEXT,
);
```

The body accepts raw HTML — useful for formatting, but **sanitize anything that comes from an LLM or user input** before injecting it.

### Prompt for text (`POPUP_TYPE.INPUT`)

`INPUT` returns the entered string on confirm, or `false` on cancel.

```js
const name = await callGenericPopup(
    'Name this checkpoint:',
    POPUP_TYPE.INPUT,
    '',                                // initial text
    { okButton: 'Save', cancelButton: 'Cancel', rows: 1 },
);

if (name === false) return;             // user cancelled
if (typeof name === 'string' && name.trim()) {
    saveCheckpoint(name.trim());
}
```

Pass a multi-line default via `rows: 4` (or higher) to get a textarea instead of a single-line input.

### Confirm with custom button labels

`POPUP_TYPE.CONFIRM` lets you rename the affirmative / negative buttons through `popupOptions`:

```js
const result = await callGenericPopup(
    'Apply summary to chat or discard?',
    POPUP_TYPE.CONFIRM,
    '',
    { okButton: 'Apply', cancelButton: 'Discard' },
);

if (result === POPUP_RESULT.AFFIRMATIVE) await applySummary();
else if (result === POPUP_RESULT.NEGATIVE) await discardSummary();
// CANCELLED (esc/backdrop) → do nothing
```

### Wide / scrollable dialog for HTML content

For long content (a generated arc preview, a fact list, JSON debug output), enable the layout options:

```js
const html = `
    <h3>Generated arc directive</h3>
    <pre style="white-space: pre-wrap;">${escapeHtml(arcText)}</pre>
`;

const result = await callGenericPopup(html, POPUP_TYPE.CONFIRM, '', {
    okButton: 'Use this arc',
    cancelButton: 'Discard',
    wide: true,
    large: true,
    allowVerticalScrolling: true,
});
```

Common `popupOptions` fields:

| Option | Type | Effect |
|--------|------|--------|
| `okButton` | string | Affirmative button label |
| `cancelButton` | string \| false | Negative button label, or `false` to hide |
| `wide` | boolean | Widens the dialog |
| `large` | boolean | Increases height |
| `allowVerticalScrolling` | boolean | Lets the body scroll instead of pushing the buttons offscreen |
| `rows` | number | Multi-line `INPUT` textarea height |

See [`popup.md`](../modules/popup.md) for the full options reference.

### Chaining popups

Each call returns a promise, so you can sequence dialogs without nesting callbacks:

```js
async function configureAndRun() {
    const enabled = await callGenericPopup(
        'Enable verbose mode?',
        POPUP_TYPE.CONFIRM,
    );
    if (enabled !== POPUP_RESULT.AFFIRMATIVE) return;

    const tag = await callGenericPopup(
        'Tag for this run:',
        POPUP_TYPE.INPUT,
        'run-1',
    );
    if (tag === false) return;

    await runWith({ verbose: true, tag });
}
```

## Gotchas

- **Popups stack.** You can open a popup from inside another popup's handler, but each new one renders on top. Resolve the parent (let its promise settle) before showing the next when you don't actually need nesting.
- **`toastr` hides behind popups by default.** If you want toast notifications to appear *above* the popup, call `fixToastrForDialogs()` once before showing the popup. Otherwise, prefer in-body status text inside the popup itself.
- **`CANCELLED` ≠ `NEGATIVE`.** Closing via Escape or backdrop click resolves to `POPUP_RESULT.CANCELLED` (or `null`/`false` depending on type). If you only check `if (result === POPUP_RESULT.AFFIRMATIVE)` you handle both implicit-no cases correctly; only branch on `NEGATIVE` when "explicit no" should behave differently from "dismissed".
- **`INPUT` returns `false` on cancel, not `null`.** Use `if (text === false) return;` rather than a truthy check — the user could legitimately enter an empty string when `rows > 1`.
- **Don't block the main UI thread waiting on the user.** `await callGenericPopup(...)` yields control back to the event loop, so generation can still proceed in the background. Use guard flags (see [`CLAUDE.md` → Guard Flags](../../../CLAUDE.md#guard-flags-for-race-conditions)) if you need to prevent that.
- **Raw HTML is not sanitized.** When inserting LLM output or user-typed content, run it through your own escaper or use `textContent` instead of an HTML string.

## See also

- Reference: [`popup.md`](../modules/popup.md) — `callGenericPopup`, the `Popup` class, full `POPUP_TYPE` and `POPUP_RESULT` enums, `fixToastrForDialogs`.
- Guide: [`ui-panels-and-drag.md`](ui-panels-and-drag.md) — when you want a persistent panel instead of a modal.
- Guide: [`register-slash-commands.md`](register-slash-commands.md) — wire a popup to a `/command`.
- CLAUDE.md: [Toast Notifications](../../../CLAUDE.md#toast-notifications) — the lighter-weight alternative for non-blocking status.
