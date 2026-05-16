# Streaming and generation lifecycle events

> *You want to react to streaming tokens and to the full generation
> lifecycle — pre-prompt, mid-stream, and post-completion.*

ST emits events at every stage. For an exhaustive list see
[`events.md`](../modules/events.md) and the CLAUDE.md event table.
This guide shows the most useful patterns.

## The lifecycle, in order

For a normal chat generation:

```
GENERATION_STARTED
  └─ GENERATION_AFTER_COMMANDS         (slash commands processed)
  └─ GENERATE_BEFORE_COMBINE_PROMPTS   (last chance before assembly)
  └─ GENERATE_AFTER_COMBINE_PROMPTS    (prompts combined, mutable)
  └─ GENERATE_AFTER_DATA               (full request payload, mutable)
  ├─ STREAM_TOKEN_RECEIVED   (× many — if streaming)
  ├─ STREAM_REASONING_DONE   (× 1 if reasoning model)
  └─ STREAM_TOKEN_RECEIVED   (× many — continued)
  MESSAGE_RECEIVED                     (message appended to chat)
  CHARACTER_MESSAGE_RENDERED           (message in DOM)
GENERATION_ENDED
```

For a stopped or failed generation, you also see `GENERATION_STOPPED`.

## Minimal example — per-token streaming UI

```js
const { eventSource, eventTypes } = SillyTavern.getContext();

let buffer = '';
eventSource.on(eventTypes.STREAM_TOKEN_RECEIVED, (token) => {
    buffer += token;
    updateMyIndicator(buffer.length);
});

eventSource.on(eventTypes.GENERATION_ENDED, () => {
    buffer = '';
});
```

`STREAM_TOKEN_RECEIVED` fires *very* frequently (every chunk). Debounce
DOM writes or you'll thrash the renderer.

## Variations

### Check whether streaming is even on

```js
import { isStreamingEnabled } from '../../../../script.js';

if (isStreamingEnabled()) {
    eventSource.on(eventTypes.STREAM_TOKEN_RECEIVED, handler);
} else {
    eventSource.on(eventTypes.MESSAGE_RECEIVED, () => {
        // Non-streaming: the full message lands all at once.
    });
}
```

Streaming can be disabled per-API or per-user setting even when the
model supports it.

### Modify the prompt before it's sent

```js
eventSource.on(eventTypes.GENERATE_AFTER_COMBINE_PROMPTS, (data) => {
    // data.prompt is the assembled prompt string — mutate in place
    data.prompt = data.prompt.replace('FOO', 'BAR');
});
```

`GENERATE_AFTER_COMBINE_PROMPTS` passes a mutable object. Mutate
`data` directly; do not reassign. `GENERATE_AFTER_DATA` is the last
hook before the request hits the wire.

### Lock state during generation (guard-flag pattern)

```js
let locked = false;

eventSource.on(eventTypes.GENERATION_STARTED, () => { locked = true; });

eventSource.on(eventTypes.MESSAGE_RECEIVED, () => {
    // Delay unlock to swallow trailing MESSAGE_EDITED events.
    setTimeout(() => { locked = false; }, 1000);
});

eventSource.on(eventTypes.MESSAGE_EDITED, (messageId) => {
    if (locked) return;
    if (SillyTavern.getContext().isGenerating) return;
    handleUserEdit(parseInt(messageId));  // ← string-to-int!
});
```

The 1000ms delay matters: ST fires a trailing `MESSAGE_EDITED` shortly
after `MESSAGE_RECEIVED` as it finalizes the message. Without the
delay you'll clobber state with that event.

### Cancel generation

```js
import { stopGeneration } from '../../../../script.js';

document.getElementById('my_cancel').addEventListener('click', () => {
    stopGeneration();
});
```

`stopGeneration` aborts the active request. `GENERATION_STOPPED` fires
shortly after.

### Detect "new message" vs. "Continue"

```js
let lastIndex = -1;

eventSource.on(eventTypes.CHARACTER_MESSAGE_RENDERED, () => {
    const ctx = SillyTavern.getContext();
    const currentLastIndex = ctx.chat.length - 1;
    if (currentLastIndex !== lastIndex) {
        // A new message was added
        lastIndex = currentLastIndex;
    } else {
        // Same index — this was a Continue
    }
});
```

ST does not have a dedicated "continue happened" event. Tracking the
last-message index is the standard idiom.

### One-shot listeners

```js
const onUserMsg = () => {
    eventSource.removeListener(eventTypes.USER_MESSAGE_RENDERED, onUserMsg);
    handleNextUserMessage();
};
eventSource.on(eventTypes.USER_MESSAGE_RENDERED, onUserMsg);
```

ST's EventEmitter doesn't have `.once` in all versions — implement it
manually if you only want a single fire.

## Gotchas

- **`messageId` is a string.** `MESSAGE_EDITED` passes the index as a
  string. Always `parseInt` before comparing to numeric indices.
- **`STREAM_TOKEN_RECEIVED` is high-frequency.** Don't do anything
  expensive synchronously in the handler. Batch updates with
  `requestAnimationFrame` or a debouncer.
- **The 1000ms unlock delay is non-negotiable.** Without it, the
  trailing `MESSAGE_EDITED` event after `MESSAGE_RECEIVED` will
  re-fire your "user edited" logic.
- **`isGenerating` is a function, not a value.** It's exported as
  `() => is_send_press || is_group_generating`. Call it:
  `if (isGenerating()) { ... }`. The `context.isGenerating` property
  is also the function — call it the same way.
- **Sticky events.** `APP_INITIALIZED` and `APP_READY` fire
  immediately on subscription if they've already fired. Use these for
  "do this once on startup" without worrying about timing.
- **`event_types` keys may differ across ST versions.** Guard with
  `if (eventTypes.SOME_EVENT)` before subscribing to avoid silent
  no-ops on older builds.

## See also

- Reference: [`events.md`](../modules/events.md) — full event table.
- Reference: [`script.md`](../modules/script.md) —
  `stopGeneration`, `isStreamingEnabled`, `isGenerating`.
- Reference: [`openai.md`](../modules/openai.md) — `getStreamingReply`
  for low-level stream handling.
- Guide: [`generate-llm-responses.md`](generate-llm-responses.md) —
  the *other* generation surface (extension-initiated, not
  chat-initiated).
- Guide: [`manage-chat-messages.md`](manage-chat-messages.md) — for
  the `MESSAGE_EDITED` / swipe gotchas.
- CLAUDE.md: "Event System" and "Guard Flags for Race Conditions".
