# reasoning.js

Reasoning-/thinking-token plumbing. Extracts reasoning blocks from provider responses, parses inline `<think>`-style reasoning, renders the collapsible reasoning UI block on messages, and manages reasoning templates (prefix/suffix/separator triples used to wrap or detect reasoning).

**Import path from a third-party extension:**

```js
import {
    extractReasoningFromData,
    extractReasoningSignatureFromData,
    parseReasoningFromString,
    removeReasoningFromString,
    parseReasoningInSwipes,
    formatReasoning,
    updateReasoningUI,
    loadReasoningTemplates,
    initReasoning,
    getReasoningTemplateByName,
    isHiddenReasoningModel,
    ReasoningHandler,
    PromptReasoning,
    reasoning_templates,
    DEFAULT_REASONING_TEMPLATE,
    ReasoningType,
    ReasoningState,
} from '../../../reasoning.js';
```

See also: [handle-reasoning-models.md](../guides/handle-reasoning-models.md) and [generate-llm-responses.md](../guides/generate-llm-responses.md).

## Exports at a glance

| Export | Kind | Summary |
|--------|------|---------|
| `extractReasoningFromData(data, opts?)` | function | Pulls the reasoning text from a non-streaming response |
| `extractReasoningSignatureFromData(data, opts?)` | function | Pulls the encrypted thought signature (Gemini / OpenRouter) |
| `parseReasoningFromString(str, opts?, template?)` | function | Splits an inline reasoning-tagged string into `{reasoning, content}` |
| `removeReasoningFromString(str)` | function | Strips reasoning prefix/suffix if auto-parse is enabled |
| `parseReasoningInSwipes(swipes, swipeInfoArray, duration)` | function | Auto-parses reasoning across a swipes array in-place |
| `formatReasoning(reasoning, content, template?)` | function | Inverse of `parseReasoningFromString` — wraps reasoning in template tags |
| `updateReasoningUI(messageIdOrElement, opts?)` | function | Refreshes the reasoning details block for a rendered message |
| `loadReasoningTemplates(data)` | async function | Loads templates from settings payload + handles migration |
| `initReasoning()` | function | One-time init (called by ST core) |
| `getReasoningTemplateByName(name)` | function | Looks up a template; throws if missing |
| `isHiddenReasoningModel()` | function | True for models that reason internally without emitting visible reasoning |
| `ReasoningHandler` | class | Per-message reasoning state machine used by the streaming processor |
| `PromptReasoning` | class | Tracks reasoning carried forward as a prompt prefix on continues |
| `reasoning_templates` | const (mutated) | Loaded templates (array of `{name, prefix, suffix, separator}`) |
| `DEFAULT_REASONING_TEMPLATE` | const | `'Think XML'` |
| `ReasoningType` | const | `{ Model, Parsed, Manual, Edited }` |
| `ReasoningState` | const | `{ None, Thinking, Done, Hidden }` |

## Reference

### Extraction from API responses

#### `extractReasoningFromData(data, { mainApi = null, ignoreShowThoughts = false, textGenType = null, chatCompletionSource = null } = {}) → string`

Reads the reasoning text from a parsed (non-streaming) response. Knows the per-source location: `choices[0].message.reasoning_content` (Deepseek/XAI/OpenRouter and most "OpenAI-shape" custom providers), `responseContent.parts[].thought` (Gemini), `content[type=thinking].thinking` (Claude), `choices[0].message.content[].thinking` (Mistral), `choices[0].reasoning` (OpenRouter text-gen), `thinking` (Ollama). Returns `''` when no reasoning is present or `show_thoughts` is disabled (unless `ignoreShowThoughts: true`).

#### `extractReasoningSignatureFromData(data, { mainApi = null, chatCompletionSource = null } = {}) → string | null`

Pulls an encrypted "thought signature" from the response so the model's chain-of-thought can be re-supplied on later turns. Only meaningful for Gemini via MakerSuite/VertexAI/OpenRouter; returns `null` otherwise.

#### `isHiddenReasoningModel() → boolean`

True for OpenAI/Gemini families that reason internally and never return the reasoning text (e.g. `o1*`, `o3*`, `gpt-4.5*`, `gemini-2.0-flash-thinking-exp`, `gemini-2.0-pro-exp`). Used to keep the UI in `Thinking` state while the model is working but no reasoning chunks arrive.

### Inline parsing

#### `parseReasoningFromString(str, { strict = true } = {}, template = null) → { reasoning, content } | null`

Pattern-matches `template.prefix(.*?)template.suffix` (defaults to `power_user.reasoning`). With `strict: true` the prefix must be at the start of `str` (ignoring leading whitespace); with `strict: false` it can appear anywhere. Returns `null` when the template lacks a prefix/suffix or the regex fails.

#### `removeReasoningFromString(str) → string`

Returns `parseReasoningFromString(str).content` if auto-parse is on and reasoning is present; otherwise returns `str` unchanged. Useful in custom extension generation flows — for example, strip reasoning from a `generateRaw` result before storing it.

```js
const text = removeReasoningFromString(await generateRaw({ prompt, systemPrompt }));
```

#### `formatReasoning(reasoning, content, template = null) → { formatted, contentOnly }`

Inverse of `parseReasoningFromString`. Produces `prefix + reasoning + suffix + separator + content`. Returns `{ formatted: content, contentOnly: content }` if no reasoning or no template.

#### `parseReasoningInSwipes(swipes, swipeInfoArray, duration) → void`

Mutates each entry of `swipes` to its parsed `content`, and writes `reasoning`/`reasoning_duration`/`reasoning_type` into the matching `swipeInfoArray[i].extra`. No-op when auto-parse is disabled or the arrays don't line up.

### Templates

#### `reasoning_templates`

Mutable array of `{ name, prefix, suffix, separator }`. Populated by `loadReasoningTemplates`.

#### `DEFAULT_REASONING_TEMPLATE`

The string `'Think XML'` — name of the default template.

#### `getReasoningTemplateByName(name) → ReasoningTemplate`

Looks up a template by name. Throws `Error` if not found.

#### `loadReasoningTemplates(data) → Promise<void>`

Replaces the contents of `reasoning_templates` with `data.reasoning`, fills the template select, and handles a one-time migration of legacy custom prefix/suffix/separator settings into a saved preset.

### UI

#### `updateReasoningUI(messageIdOrElement, { reset = false } = {}) → void`

Re-renders the `.mes_reasoning_details` block on a message. Accepts a numeric `mesid`, an `HTMLElement`, or a jQuery object. With `reset: true`, clears state instead of taking it from `chat[id].extra`.

#### `ReasoningType`

Enum of where reasoning came from: `Model` (returned by the API), `Parsed` (auto-parsed from inline `<think>` tags), `Manual` (user-entered), `Edited` (user-edited).

#### `ReasoningState`

Per-message state for the reasoning UI: `None`, `Thinking`, `Done`, `Hidden`.

### Classes

#### `class ReasoningHandler`

State machine used by `StreamingProcessor` to manage reasoning during generation. Extensions reading reasoning state during streaming will encounter instances of this class.

| Member | Description |
|--------|-------------|
| `constructor(timeStarted = null)` | Initializes state; defaults `initialTime` to now |
| `state` | Current `ReasoningState` |
| `type` | `ReasoningType` once known |
| `reasoning` | Accumulated reasoning text |
| `reasoningDisplayText` | Optional translated/formatted display variant |
| `startTime` / `endTime` / `initialTime` | Timing of the reasoning phase |
| `messageDom` / `messageReasoningDetailsDom` / `messageReasoningContentDom` / `messageReasoningHeaderDom` | Cached DOM refs |
| `initContinue(promptReasoning)` | Seeds state from a `PromptReasoning` when continuing |
| `initHandleMessage(idOrElement, { reset })` | Loads state from `chat[id].extra` and updates the DOM (also exposed via `updateReasoningUI`) |
| `getDuration() → number \| null` | `endTime - startTime` in ms |
| `updateReasoning(messageId, reasoning?, { persist, allowReset })` → `boolean` | Updates `this.reasoning`; with `persist`, writes into `chat[id].extra.reasoning` |
| `process(messageId, mesChanged, promptReasoning)` → `Promise<void>` | Drives the state machine on each streamed delta |
| `finish(messageId)` → `Promise<void>` | Closes out the reasoning phase, fires events, persists |
| `updateDom(messageId)` | Refreshes the rendered reasoning block |

#### `class PromptReasoning`

Tracks reasoning carried forward as a prompt prefix when continuing a partially-emitted assistant message.

| Member | Description |
|--------|-------------|
| `static REASONING_PLACEHOLDER` | `'​'` — zero-width-space sentinel for legacy data |
| `static getLatestPrefix() → string` | Returns the formatted prefix if the latest instance has an incomplete reasoning prefix |
| `static clearLatest()` | Drops the latest instance (call on generation end / chat change) |
| `counter` | Number of past messages we've added reasoning to in the prompt |
| `prefixReasoning` / `prefixReasoningFormatted` / `prefixLength` / `prefixDuration` / `prefixIncomplete` | State of the carried-forward prefix |
| `isLimitReached() → boolean` | True once `power_user.reasoning.max_additions` is reached |
| `addToMessage(content, reasoning, isPrefix, duration) → string` | Folds reasoning into a message according to user settings |

### Lifecycle

#### `initReasoning() → void`

Wires up settings, event handlers, slash commands, macros, and auto-parse hooks. Called once at startup.
