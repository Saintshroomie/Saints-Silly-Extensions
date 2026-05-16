# Generate LLM responses from an extension

> *You want to call the LLM from inside your extension — to summarize,
> extract facts, classify, or generate a side response that does not
> appear in chat.*

ST exposes two main entry points. Pick based on whether you need
character context in the prompt.

| Function | Use when |
|----------|----------|
| `generateRaw` | You control the entire prompt. Structured extraction, classification, templated prompts. No character bleed. |
| `generateQuietPrompt` | You want a "quiet" response that uses the active character, persona, instruct mode, and (optionally) World Info — but doesn't appear in chat. |

## Minimal example — structured extraction

```js
import { generateRaw } from '../../../../script.js';
import { removeReasoningFromString } from '../../../reasoning.js';

const systemPrompt = `You extract facts from scenes. Output one per line as:
FACT | subject | state | keywords`;

const raw = await generateRaw({
    prompt: sceneText,
    systemPrompt,
    responseLength: 500,
});

const facts = removeReasoningFromString(raw)
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('FACT |'));
```

`generateRaw` returns a string. It does **not** strip reasoning tags —
call `removeReasoningFromString` if you used a reasoning model.

## Minimal example — quiet character response

```js
import { generateQuietPrompt } from '../../../../script.js';

const summary = await generateQuietPrompt({
    quietPrompt: `Summarize the scene above from {{char}}'s perspective in one paragraph.`,
    skipWIAN: true,         // skip World Info and Author's Note
    responseLength: 300,
    removeReasoning: true,  // default — strips reasoning automatically
});
```

`generateQuietPrompt` pulls in the active character, persona, instruct
formatting, and (optionally) chat history. The response uses the
character's voice. Macros like `{{char}}` and `{{user}}` are resolved
before sending.

## Variations

### Prefill the assistant's reply

```js
const raw = await generateRaw({
    prompt: userMessage,
    systemPrompt: instructionText,
    prefill: '<analysis>',
});
```

Prefills are useful for nudging the model into a specific format. Only
some APIs support them (Anthropic / Claude does; OpenAI does not).

### Add temporary stop strings

```js
import { addEphemeralStoppingString, flushEphemeralStoppingStrings } from '../../../power-user.js';

addEphemeralStoppingString('</fact>');
try {
    const raw = await generateRaw({ prompt, systemPrompt });
    // ...
} finally {
    flushEphemeralStoppingStrings();
}
```

Ephemeral stops are added *only* for the next generation call and
auto-cleared. Useful for structured extraction where you want the model
to stop after a closing tag.

### Concurrency guard

```js
let inApiCall = false;

async function runOnce(prompt) {
    if (inApiCall) return null;
    inApiCall = true;
    try {
        return await generateRaw({ prompt, systemPrompt: instruction });
    } catch (err) {
        console.error('Generation failed:', err);
        return null;
    } finally {
        inApiCall = false;
    }
}
```

ST does not queue concurrent extension generations — overlapping calls
will fail or interleave responses. Always gate with a flag.

### Lock the UI during a multi-step pipeline

```js
import { deactivateSendButtons, activateSendButtons } from '../../../../script.js';

deactivateSendButtons();
try {
    const summary = await generateRaw({ prompt, systemPrompt: 'Summarize:' });
    const facts   = await generateRaw({ prompt: summary, systemPrompt: 'Extract:' });
    return { summary, facts };
} finally {
    activateSendButtons();
}
```

This prevents the user from triggering a chat generation that
collides with your pipeline. Always wrap in `try`/`finally` so the
buttons re-enable even on error.

### Override the API for a single call

```js
const raw = await generateRaw({
    prompt,
    systemPrompt,
    api: 'openai',  // forces this API regardless of the current connection
});
```

Useful if you've negotiated a separate connection for your extension's
side calls.

## Gotchas

- **Errors throw.** Both functions throw on API errors (network,
  context overflow, auth). Wrap in `try`/`catch`.
- **`responseLength: 0` means default.** Use a positive number to
  override; don't pass `null` unless you mean it.
- **Reasoning leakage.** `generateQuietPrompt` strips reasoning by
  default; `generateRaw` does not. If you forget to strip after
  `generateRaw`, you'll see `<thinking>` blocks in your output.
- **Quiet ≠ silent.** `generateQuietPrompt` still produces an API
  request and consumes tokens — it just doesn't append a message to
  the chat. Don't loop it cheaply.
- **`skipWIAN` matters.** Without `skipWIAN: true`, World Info and
  Author's Note are evaluated against your quiet prompt. That's fine
  for narrative side calls; for extraction tasks it pollutes the
  prompt — turn it off.

## See also

- Reference: [`script.md`](../modules/script.md) — full signatures for
  `generateRaw` / `generateQuietPrompt` and related helpers.
- Reference: [`reasoning.md`](../modules/reasoning.md) — stripping and
  parsing reasoning blocks.
- Guide: [`handle-reasoning-models.md`](handle-reasoning-models.md).
- Guide: [`inject-into-prompts.md`](inject-into-prompts.md) — for the
  *other* side of the pipeline: feeding your data into the user's
  normal chat generation rather than running side calls.
- CLAUDE.md: "Generating LLM Responses from Extensions" and
  "Multi-Step LLM Pipelines".
