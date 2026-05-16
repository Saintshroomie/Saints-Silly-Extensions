# Manage Chat Messages

> *You want to add, edit, delete, or hide messages.*

The chat array is the live, mutable source of truth. Most operations follow the same pattern: read or write `context.chat[i]`, re-render with `reRenderMessage(i)`, and persist with `context.saveChat()`. Higher-level helpers like `addOneMessage`, `deleteMessage`, and `hideChatMessage` wrap the bookkeeping for common cases.

## Minimal example

```js
import { reRenderMessage } from '../../../../script.js';

async function appendToMessage(index, suffix) {
    const ctx = SillyTavern.getContext();
    const msg = ctx.chat[index];
    if (!msg) return;

    msg.mes = `${msg.mes}\n\n${suffix}`;     // raw text, pre-formatting
    await reRenderMessage(index);            // refresh the DOM node
    await ctx.saveChat();                    // persist to disk
}
```

The chat-array shape:

| Field | Type | Notes |
|-------|------|-------|
| `mes` | string | The current message text (raw markdown / HTML before formatting) |
| `is_user` | boolean | `true` for user messages |
| `name` | string | Author name |
| `send_date` | string | ISO timestamp |
| `swipes` | string[]? | Alternative versions; may not exist |
| `swipe_id` | number? | Index into `swipes` of the active variant |
| `swipe_info` | object[]? | Per-swipe metadata, parallel to `swipes` |
| `extra` | object | Free-form metadata, including extension data |

## Variations

### Add a new message

```js
import { addOneMessage } from '../../../../script.js';

async function postSystemNote(text) {
    const ctx = SillyTavern.getContext();
    const message = {
        name: 'System',
        is_user: false,
        is_system: true,        // suppresses some pipeline behaviors
        send_date: new Date().toISOString(),
        mes: text,
        extra: { type: 'narrator' },
    };
    ctx.chat.push(message);
    await addOneMessage(message);
    await ctx.saveChat();
}
```

`addOneMessage` only renders — you still push to `ctx.chat` yourself first. The two-step is intentional: push, render, save.

### Edit an existing message

```js
async function rewriteMessage(index, newText) {
    const ctx = SillyTavern.getContext();
    const msg = ctx.chat[index];
    if (!msg) return;

    msg.mes = newText;

    // If swipes exist, keep the active swipe in sync
    if (Array.isArray(msg.swipes)) {
        msg.swipes[msg.swipe_id ?? 0] = newText;
    }

    await reRenderMessage(index);
    await ctx.saveChat();
}
```

### Delete a message

```js
import { deleteMessage } from '../../../../script.js';

await deleteMessage(index);   // removes from chat array AND DOM
```

`deleteMessage` handles the array splice, DOM removal, and event emission. Don't manually `chat.splice(...)` unless you have a very specific reason — you'll desync the DOM.

### Delete a range

```js
async function deleteRange(startInclusive, endExclusive) {
    const ctx = SillyTavern.getContext();
    // Delete from the back so indices ahead of the cursor stay valid
    for (let i = endExclusive - 1; i >= startInclusive; i--) {
        await deleteMessage(i);
    }
    await ctx.saveChat();
}
```

### Hide / unhide a message

Hidden messages stay in the chat array (and on disk) but are excluded from the LLM context and visually collapsed in the UI. Useful for "soft delete" workflows.

```js
import { hideChatMessage, unhideChatMessage } from '../../../chats.js';

await hideChatMessage(index, /* unhide = */ false);
// later…
await hideChatMessage(index, /* unhide = */ true);
// or its sibling alias if exposed in your version:
// await unhideChatMessage(index);
```

To hide a range, loop the same way as for delete (back to front is fine, but order doesn't matter for hide since the array doesn't shrink).

### Add a new swipe variant

Swipes need careful initialization — the array may not exist on a fresh message. The full pattern is in [`CLAUDE.md` → Working with Swipes](../../../CLAUDE.md#working-with-swipes); the condensed flow:

```js
async function appendSwipe(index, newText) {
    const ctx = SillyTavern.getContext();
    const msg = ctx.chat[index];
    if (!msg || msg.is_user) return;

    if (!Array.isArray(msg.swipes)) {
        msg.swipes = [msg.mes];
        msg.swipe_id = 0;
        msg.swipe_info = [{}];
    }

    msg.swipes.push(newText);
    msg.swipe_info.push({ send_date: new Date().toISOString() });
    msg.swipe_id = msg.swipes.length - 1;
    msg.mes = newText;

    await reRenderMessage(index);

    // Make sure the swipe counter UI updates
    const el = document.querySelector(`#chat .mes[mesid="${index}"]`);
    const counter = el?.querySelector('.swipes-counter');
    if (counter) counter.textContent = `${msg.swipe_id + 1}/${msg.swipes.length}`;

    await ctx.saveChat();
}
```

### Read the user's typed text

Before mutating chat state, check whether the user has text queued in the input box — they may have started typing and not pressed Send yet:

```js
function getPendingUserInput() {
    return document.getElementById('send_textarea')?.value?.trim() ?? '';
}

if (getPendingUserInput()) {
    // Either incorporate it, warn the user, or bail.
}
```

### Clear the chat

`/clearchat` is the cleanest path. From JS:

```js
await SillyTavern.getContext().executeSlashCommandsWithOptions('/cut all');
```

Doing it by hand is fragile — there are several DOM and metadata side-effects.

### React to edits

```js
import { eventSource, event_types } from '../../../../script.js';

eventSource.on(event_types.MESSAGE_EDITED, (messageId) => {
    // messageId is a STRING — parseInt before comparing
    const i = parseInt(messageId, 10);
    if (Number.isNaN(i)) return;
    handleEdit(i);
});
```

If you also generate messages from your extension, gate the handler with a lock flag to suppress your own edits. The 1000 ms unlock-after-`MESSAGE_RECEIVED` pattern is described in [`CLAUDE.md` → Guard Flags](../../../CLAUDE.md#guard-flags-for-race-conditions):

```js
let snapshotLocked = false;

eventSource.on(event_types.MESSAGE_RECEIVED, () => {
    setTimeout(() => { snapshotLocked = false; }, 1000);
});

eventSource.on(event_types.MESSAGE_EDITED, (messageId) => {
    if (snapshotLocked) return;                       // ignore generation-side edits
    if (SillyTavern.getContext().isGenerating) return;
    handleEdit(parseInt(messageId, 10));
});
```

## Gotchas

- **`MESSAGE_EDITED` message ID is a string.** Always `parseInt(messageId, 10)` before comparing to numeric indices. Direct `===` comparison with `chat.length - 1` will silently fail. See [`CLAUDE.md` → `MESSAGE_EDITED` Parameter Caveat](../../../CLAUDE.md#message_edited-parameter-caveat).
- **The event fires slightly after generation finishes.** `MESSAGE_EDITED` can arrive *after* `MESSAGE_RECEIVED` for the just-completed message. That's the reason for the 1000 ms unlock delay.
- **`chat[N].mes` updates synchronously, the event is async.** When the user confirms an edit in the textarea, ST writes `chat[N].mes` immediately, then fires `MESSAGE_EDITED` later. If you need the new text *right after* confirming an in-progress edit, read it directly from `chat[N].mes` — don't wait for the event.
- **`addOneMessage` doesn't push to `chat`.** You have to do both: `ctx.chat.push(msg); await addOneMessage(msg)`. Skipping the push leaves a rendered message that has no array backing and disappears on chat reload.
- **Don't manually splice the chat array for deletes.** Use `deleteMessage(index)` so the DOM, swipe counters, and `MESSAGE_DELETED` event all stay in sync.
- **`MESSAGE_DELETED` param is the remaining count, not the deleted ID.** If you need to know what was deleted, track it before invoking `deleteMessage`.
- **Always `await saveChat()` after mutation.** Without it your changes survive in-memory until the chat is reloaded — at which point they're gone.
- **Hidden messages still occupy the chat array.** They affect indices: `chat[5]` is still `chat[5]` whether visible or hidden. Don't filter them out before indexing.
- **`reRenderMessage` re-runs the message-formatting pipeline.** Any custom HTML you injected via DOM manipulation (after the fact) will be discarded. If you need persistent decorations, hook `MESSAGE_RENDERED` events and reapply.
- **Auto-confirm active edits first.** If a user is editing a message and you trigger a mutation, the in-progress edit can be lost. Confirm it programmatically before mutating — see [`CLAUDE.md` → Auto-Confirming Active Edits](../../../CLAUDE.md#auto-confirming-active-edits).

## See also

- Reference: [`script.md`](../modules/script.md) — `reRenderMessage`, `addOneMessage`, `deleteMessage`, `eventSource`, `event_types`.
- Reference: [`chats.md`](../modules/chats.md) — `hideChatMessage` and the rest of the chat utilities.
- Reference: [`events.md`](../modules/events.md) — `MESSAGE_EDITED`, `MESSAGE_RECEIVED`, `MESSAGE_DELETED`, `CHAT_CHANGED`.
- Guide: [`show-a-modal.md`](show-a-modal.md) — confirm destructive mutations before performing them.
- Guide: [`register-slash-commands.md`](register-slash-commands.md) — expose message operations as `/commands`.
- CLAUDE.md: [Working with Swipes](../../../CLAUDE.md#working-with-swipes), [`MESSAGE_EDITED` Parameter Caveat](../../../CLAUDE.md#message_edited-parameter-caveat), [Guard Flags for Race Conditions](../../../CLAUDE.md#guard-flags-for-race-conditions), [Auto-Confirming Active Edits](../../../CLAUDE.md#auto-confirming-active-edits), [Detecting User Input Text](../../../CLAUDE.md#detecting-user-input-text).
