# Handle reasoning / thinking models correctly

> *You want your extension to behave correctly with reasoning models —
> Claude with extended thinking, DeepSeek R1, OpenAI o1, etc.*

Reasoning models emit chain-of-thought *before* their answer. Depending
on the API, that reasoning may arrive as:

- inline `<thinking>` or `<reasoning>` tags inside the response text,
- a separate streamed channel (`reasoning_content`),
- entirely hidden (signature-based, no client visibility),

and ST stores it on the message object under `reasoning` /
`reasoning_duration`. Your extension typically wants the *answer* —
without the reasoning bleed.

## Minimal example — strip reasoning from a raw response

```js
import { generateRaw } from '../../../../script.js';
import { removeReasoningFromString } from '../../../reasoning.js';

const raw = await generateRaw({
    prompt: sceneText,
    systemPrompt: 'Summarize in one paragraph.',
    responseLength: 300,
});

const clean = removeReasoningFromString(raw);
```

`generateRaw` returns whatever the model produced. If a reasoning model
emitted `<thinking>…</thinking>Summary here.`, you need
`removeReasoningFromString` before storing or displaying. (Note:
[`generateQuietPrompt`](../modules/script.md) does this automatically
when `removeReasoning: true` — its default.)

## Variations

### Parse the reasoning out separately

```js
import { parseReasoningFromString } from '../../../reasoning.js';

const { reasoning, content } = parseReasoningFromString(raw) ?? { reasoning: '', content: raw };
console.log('Model thought:', reasoning);
console.log('Final answer:', content);
```

`parseReasoningFromString` returns `null` if no reasoning was detected,
so always fall back. Useful when you want to log or display the
chain-of-thought as well as the answer.

### Detect whether the active model is a reasoning model

```js
import { isHiddenReasoningModel } from '../../../reasoning.js';

if (isHiddenReasoningModel()) {
    // OpenAI o1 etc. — reasoning never appears client-side.
    // Don't bother stripping; the response is already final.
}
```

`isHiddenReasoningModel` returns `true` for models whose reasoning is
server-side only (you'll never see the tokens). For these, raw output
is already the final answer.

### Check support for reasoning signatures (Claude extended thinking)

```js
import { isReasoningSignatureSupported } from '../../../openai.js';

if (isReasoningSignatureSupported(settings)) {
    // The current settings support passing reasoning signatures back
    // for multi-turn extended-thinking continuity.
}
```

This determines whether ST can round-trip reasoning between turns
(Anthropic-specific behavior).

### Read reasoning from a stored message

```js
const ctx = SillyTavern.getContext();
const msg = ctx.chat[messageIndex];
const reasoning = msg.extra?.reasoning;
const duration  = msg.extra?.reasoning_duration;
```

ST attaches `reasoning` and `reasoning_duration` to the message
object's `extra` field after generation. Reading from here is cheaper
than re-parsing the message text.

### Refresh the reasoning UI after editing

```js
import { updateReasoningUI } from '../../../reasoning.js';

await updateReasoningUI(messageIndex);             // re-render
await updateReasoningUI(messageIndex, { reset: true });  // also reset fold state
```

Call this after you modify the reasoning text (e.g. via an extension
that summarizes/edits reasoning blocks) so the message DOM picks up
your changes.

### React when reasoning streaming finishes

```js
const { eventSource, eventTypes } = SillyTavern.getContext();

eventSource.on(eventTypes.STREAM_REASONING_DONE, () => {
    // The model has finished its reasoning portion; final answer is
    // about to start streaming.
});
```

Useful for UI that wants to flip from a "thinking…" indicator to a
"writing…" indicator.

## Gotchas

- **`generateRaw` does NOT strip reasoning.** Call
  `removeReasoningFromString` (or use `generateQuietPrompt` instead).
  This is the single most common bug in extensions that talk to
  reasoning models.
- **Hidden reasoning models still cost tokens.** OpenAI o1 charges for
  the reasoning tokens you never see. Your token budget needs headroom
  even though the response looks short.
- **Per-swipe state.** Reasoning attaches per-swipe. If you store
  state derived from reasoning, key it by `(messageIndex, swipe_id)`.
- **`<thinking>` tag conventions vary.** Some local models use
  `<reasoning>`, `<thought>`, custom XML. `removeReasoningFromString`
  uses the active reasoning template — set with `reasoning_templates`
  — so it should match what the model actually emits.
- **Reasoning duration is approximate.** `reasoning_duration` is
  wall-clock ms measured client-side; not a model self-report.

## See also

- Reference: [`reasoning.md`](../modules/reasoning.md) — full
  function/class inventory (`ReasoningHandler`, `PromptReasoning`,
  templates).
- Reference: [`openai.md`](../modules/openai.md) —
  `isReasoningSignatureSupported`, `reasoning_effort_types`.
- Guide: [`generate-llm-responses.md`](generate-llm-responses.md) —
  pair this with the right generation function.
- CLAUDE.md: "Stripping Reasoning from Responses" within the
  generation section.
