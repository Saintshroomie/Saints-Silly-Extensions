# openai.js

Core module for Chat Completion generation. Owns settings (`oai_settings`), prompt assembly (`ChatCompletion`, `prepareOpenAIMessages`), API source/model selection, streaming response parsing, and capability detection across every Chat Completion provider SillyTavern supports.

**Import path from a third-party extension:**

```js
import {
    getChatCompletionModel,
    createGenerationParameters,
    prepareOpenAIMessages,
    formatWorldInfo,
    getPromptPosition,
    getPromptRole,
    getStreamingReply,
    tryParseStreamingError,
    getChatCompletionPreset,
    loadProxyPresets,
    parseExampleIntoIndividual,
    initOpenAI,
    isImageInliningSupported,
    isVideoInliningSupported,
    isAudioInliningSupported,
    isReasoningSignatureSupported,
    ChatCompletion,
    chat_completion_sources,
    reasoning_effort_types,
    verbosity_levels,
    tool_reasoning_modes,
    custom_prompt_post_processing_types,
    model_list,
    openai_setting_names,
    openai_settings,
    promptManager,
    proxies,
    selected_proxy,
    settingsToUpdate,
    ZAI_ENDPOINT,
    SILICONFLOW_ENDPOINT,
    MINIMAX_ENDPOINT,
} from '../../../openai.js';
```

## Exports at a glance

| Export | Kind | Summary |
|--------|------|---------|
| `getChatCompletionModel(settings?)` | function | Returns the model id for the currently selected chat completion source |
| `createGenerationParameters(settings, model, type, messages, { jsonSchema })` | function | Builds the full generation payload sent to the backend |
| `prepareOpenAIMessages(args, dryRun)` | async function | Assembles the final ordered prompt array for chat completion |
| `formatWorldInfo(value, { wiFormat })` | function | Wraps World Info text in the configured WI format |
| `getPromptPosition(position)` | function | Maps `extension_prompt_types` to `'start'`/`'end'`/`false` |
| `getPromptRole(role)` | function | Maps `extension_prompt_roles` to `'system'`/`'user'`/`'assistant'` |
| `getStreamingReply(data, state, opts?)` | function | Extracts streamed text + reasoning per provider format |
| `tryParseStreamingError(response, decoded, opts?)` | function | Detects + reports backend errors inside streamed chunks |
| `getChatCompletionPreset(settings?)` | function | Serializes the current settings into a preset body |
| `loadProxyPresets(settings)` | function | Loads saved reverse-proxy presets into the dropdown |
| `parseExampleIntoIndividual(str, appendNamesForGroup?)` | function | Splits example dialog into role-tagged messages |
| `initOpenAI()` | function | Wires up DOM listeners for the chat-completion UI |
| `isImageInliningSupported()` | function | True if the current source/model supports image inputs |
| `isVideoInliningSupported()` | function | True if the current source/model supports video inputs |
| `isAudioInliningSupported()` | function | True if the current source/model supports audio inputs |
| `isReasoningSignatureSupported(settings?)` | function | True if encrypted reasoning signatures should be sent |
| `ChatCompletion` | class | Token-budgeted message collection for prompt assembly |
| `chat_completion_sources` | const | Enum of supported chat completion providers |
| `reasoning_effort_types` | const | Enum of reasoning effort levels |
| `verbosity_levels` | const | Enum of verbosity levels |
| `tool_reasoning_modes` | const | Enum of tool-call reasoning forwarding modes |
| `custom_prompt_post_processing_types` | const | Enum of prompt post-processing strategies |
| `model_list` | let | Current API's model list (populated after status check) |
| `openai_setting_names` | let | Map of preset name to preset index |
| `openai_settings` | let | Array of parsed preset bodies |
| `promptManager` | let | Active `PromptManager` instance (null until init) |
| `proxies` | let | Array of saved reverse-proxy presets |
| `selected_proxy` | let | Currently selected proxy preset |
| `settingsToUpdate` | const | Selector / setting-key map used for preset round-tripping |
| `ZAI_ENDPOINT` | const | Z.AI endpoint enum (`COMMON`, `CODING`) |
| `SILICONFLOW_ENDPOINT` | const | SiliconFlow endpoint enum (`GLOBAL`, `CN`) |
| `MINIMAX_ENDPOINT` | const | MiniMax endpoint enum (`GLOBAL`, `CN`) |

## Reference

### Models & sources

#### `getChatCompletionModel(settings = null) → string`

Returns the currently selected model id for the chat completion source on `settings` (defaults to `oai_settings`). For OpenRouter, returns `null` if the "OR_Website" sentinel is selected.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `settings` | `ChatCompletionSettings` | `null` | Settings object; defaults to `oai_settings`. |

**Returns:** `string` — the model id for the active source, or `null` for the OpenRouter "OR_Website" sentinel.

#### `chat_completion_sources`

Enum of provider identifiers used as the value of `oai_settings.chat_completion_source`. Members include `OPENAI`, `CLAUDE`, `OPENROUTER`, `MAKERSUITE`, `VERTEXAI`, `MISTRALAI`, `CUSTOM`, `COHERE`, `PERPLEXITY`, `GROQ`, `ELECTRONHUB`, `CHUTES`, `NANOGPT`, `DEEPSEEK`, `AIMLAPI`, `XAI`, `POLLINATIONS`, `MOONSHOT`, `FIREWORKS`, `COMETAPI`, `AZURE_OPENAI`, `ZAI`, `SILICONFLOW`, `WORKERS_AI`, `MINIMAX`, `AI21`.

#### `ZAI_ENDPOINT`, `SILICONFLOW_ENDPOINT`, `MINIMAX_ENDPOINT`

Endpoint sub-selectors for sources that expose multiple regional or specialized endpoints. `ZAI_ENDPOINT` is `{ COMMON, CODING }`. `SILICONFLOW_ENDPOINT` and `MINIMAX_ENDPOINT` are `{ GLOBAL, CN }`.

#### `model_list`

`model_list: object[]` — array populated from the most recent `/api/backends/chat-completions/status` response. Items typically have `id` plus provider-specific capability metadata (`architecture`, `capabilities`, `supported_parameters`, etc.) consulted by the capability-detection helpers below.

### Generation parameters

#### `createGenerationParameters(settings, model, type, messages, { jsonSchema = null } = {}) → Promise<object>`

Builds the full request body that gets POSTed to the chat-completion backend. Resolves source-specific behaviors (streaming gating, logit bias, multi-swipe `n`, seed support, proxy fields, reasoning settings, tool config, JSON-schema mode). `type` is one of the generation kinds (`'normal'`, `'quiet'`, `'continue'`, `'impersonate'`, etc.).

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `settings` | `ChatCompletionSettings` | — | Initial chat completion settings. |
| `model` | `string` | — | Model name. |
| `type` | `string` | — | Request type (`'normal'`, `'quiet'`, `'continue'`, `'impersonate'`, etc.). |
| `messages` | `ChatCompletionMessage[]` | — | Array of chat completion messages. |
| `options.jsonSchema` | `object \| null` | `null` | Optional JSON schema for structured output. |

**Returns:** `Promise<object>` — the final request payload appropriate for the active chat-completion source.

#### `prepareOpenAIMessages(args, dryRun) → Promise<[chat: object[], counts: object] | [null, false]>`

Assembles the final ordered message array for chat completion using a fresh `ChatCompletion` (see below). On success returns `[messages, tokenCounts]`. Emits `CHAT_COMPLETION_PROMPT_READY` with a mutable `{ chat, dryRun }`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `args.name2` | `string` | — | The second name to be used in the messages. |
| `args.charDescription` | `string` | — | Description of the character. |
| `args.charPersonality` | `string` | — | Description of the character's personality. |
| `args.scenario` | `string` | — | Scenario / context of the dialogue. |
| `args.worldInfoBefore` | `string` | — | World info inserted before the main conversation. |
| `args.worldInfoAfter` | `string` | — | World info inserted after the main conversation. |
| `args.bias` | `string` | — | Bias to be added in the conversation. |
| `args.type` | `string` | — | Chat type (e.g. `'impersonate'`). |
| `args.quietPrompt` | `string` | — | Quiet prompt content. |
| `args.quietImage` | `string` | — | Image prompt for extras. |
| `args.extensionPrompts` | `object` | — | Map of additional extension prompts. |
| `args.cyclePrompt` | `string` | — | Last prompt used for chat message continuation. |
| `args.systemPromptOverride` | `string` | — | Per-character system prompt override. |
| `args.jailbreakPromptOverride` | `string` | — | Per-character jailbreak prompt override. |
| `args.messages` | `object[]` | — | Chat history messages. |
| `args.messageExamples` | `string[]` | — | Dialogue example blocks. |
| `dryRun` | `boolean` | — | When `true`, skips event emission and side effects. |

**Returns:** `Promise<[object[], object] | [null, false]>` — `[messages, tokenCounts]` on success, `[null, false]` if no active character during a dry run.

#### `parseExampleIntoIndividual(messageExampleString, appendNamesForGroup = true) → Array<{role, content, name}>`

Splits a `<START>`-delimited example dialog block into individual messages tagged with `'example_user'` / `'example_assistant'` (matching OpenAI's name convention for system-role examples).

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `messageExampleString` | `string` | — | The string containing the example messages. |
| `appendNamesForGroup` | `boolean` | `true` | Append the character name for group chats. |

**Returns:** `Array<{role: string, content: string, name: string}>` — parsed example messages.

#### `formatWorldInfo(value, { wiFormat = null } = {}) → string`

Wraps World Info text using the format template stored in `oai_settings.wi_format` (or the supplied override). The default format `{0}` is a passthrough; users may set e.g. `[Lore: {0}]`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `value` | `string` | — | World Info text to wrap. |
| `options.wiFormat` | `string \| null` | `null` | Override format template; defaults to `oai_settings.wi_format`. |

**Returns:** `string` — the formatted World Info block (or empty string if `value` is empty).

#### `getPromptPosition(position) → 'start' | 'end' | false`

Maps an `extension_prompt_types` value (`BEFORE_PROMPT`, `IN_PROMPT`, `IN_CHAT`/`NONE`) to the relative position label used by `ChatCompletion.insert()`. Returns `false` for in-chat / none.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `position` | `number` | — | Prompt position from `extension_prompt_types`. |

**Returns:** `'start' | 'end' | false` — position label, or `false` for in-chat/none.

#### `getPromptRole(role) → 'system' | 'user' | 'assistant'`

Maps an `extension_prompt_roles` value to the chat-completion role string. Defaults to `'system'` for unknown values.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `role` | `number` | — | Role enum value from `extension_prompt_roles`. |

**Returns:** `'system' | 'user' | 'assistant'` — mapped chat-completion role.

#### `reasoning_effort_types`

Enum: `auto`, `low`, `medium`, `high`, `min`, `max`. Matches `oai_settings.reasoning_effort`.

#### `verbosity_levels`

Enum: `auto`, `low`, `medium`, `high`. Matches `oai_settings.verbosity`.

#### `tool_reasoning_modes`

Enum controlling how reasoning is forwarded inside tool-call chains: `DISABLED`, `SINCE_LAST_USER`, `ACTIVE_CHAIN`. Matches `oai_settings.tool_reasoning_mode`.

#### `custom_prompt_post_processing_types`

Enum: `NONE`, `MERGE`, `MERGE_TOOLS`, `SEMI`, `SEMI_TOOLS`, `STRICT`, `STRICT_TOOLS`, `SINGLE`, plus the deprecated `CLAUDE`. Selects how custom/proxy backends are sent the prompt (role merging strategies). See [tool-calling.md](./tool-calling.md) — only the `*_TOOLS` variants and `NONE` allow function-calling.

### Streaming

#### `getStreamingReply(data, state, { chatCompletionSource = null, overrideShowThoughts = null } = {}) → string`

Extracts the streaming text delta from a parsed SSE chunk, switching on `chat_completion_source`. `state` is a mutable object the caller maintains across chunks; supported fields the function may write are `state.reasoning` (string), `state.signature` (string), `state.toolSignatures` (record), `state.images` (string[] of data URLs). Returns the next text fragment to append.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `data` | `object` | — | Parsed SSE chunk from the chat-completions source. |
| `state` | `object` | — | Mutable per-stream state; the function may write `reasoning`, `signature`, `toolSignatures`, `images`. |
| `options.chatCompletionSource` | `string \| null` | `null` | Override the active source; defaults to `oai_settings.chat_completion_source`. |
| `options.overrideShowThoughts` | `boolean \| null` | `null` | Override the user's `show_thoughts` setting. |

**Returns:** `string` — the next text fragment to append (empty string if the chunk has no text delta).

#### `tryParseStreamingError(response, decoded, { quiet = false } = {}) → void`

Inspects a (potentially partial) JSON chunk for backend error/quota/moderation payloads. Throws if a fatal `error`, `message`, or `detail` field is present so the streaming loop can abort; harmless on non-JSON content. Pass `quiet: true` to suppress toasts.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `response` | `Response` | — | The streaming `fetch` response (used for status text on errors). |
| `decoded` | `string` | — | The decoded chunk text. |
| `options.quiet` | `boolean` | `false` | Suppress toast messages. |

**Returns:** `void` — throws on fatal backend errors; otherwise returns silently.

### Capability detection

#### `isImageInliningSupported() → boolean`

True only when `main_api === 'openai'`, `oai_settings.media_inlining` is enabled, and the configured source+model is on the per-source vision list (or has the relevant capability flag in `model_list`).

**Returns:** `boolean` — whether image inputs can be inlined for the current source/model.

#### `isVideoInliningSupported() → boolean`

True for Gemini family models (MakerSuite/VertexAI), OpenRouter with `video` modality, and Z.AI vision GLM models — with `media_inlining` enabled.

**Returns:** `boolean` — whether video inputs can be inlined for the current source/model.

#### `isAudioInliningSupported() → boolean`

True for OpenAI audio / Gemini / OpenRouter audio-capable models, plus `CUSTOM` (which is assumed to support audio).

**Returns:** `boolean` — whether audio inputs can be inlined for the current source/model.

#### `isReasoningSignatureSupported(settings = oai_settings) → boolean`

True if the source is VertexAI/MakerSuite, or OpenRouter pointed at a Gemini model — i.e. providers that round-trip encrypted thought signatures. Cross-link: [reasoning.md](./reasoning.md).

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `settings` | `ChatCompletionSettings` | `oai_settings` | Settings object to inspect. |

**Returns:** `boolean` — whether encrypted reasoning signatures should be sent.

### Classes

#### `class ChatCompletion`

Token-budgeted container that prompt assembly fills with system / user / assistant messages until the budget is exhausted. Created internally by `prepareOpenAIMessages`; extensions rarely construct one directly, but its shape is useful when reading prompts from `CHAT_COMPLETION_PROMPT_READY` events.

##### `constructor()`

Initializes an empty root `MessageCollection` and zero budget.

**Returns:** a new `ChatCompletion` instance.

##### `setTokenBudget(context, response) → void`

Sets the token budget to `context - response`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `context` | `number` | — | Number of tokens in the context window. |
| `response` | `number` | — | Number of tokens reserved for the response. |

**Returns:** `void`.

##### `add(collection, position = null) → ChatCompletion`

Appends or (when `position` is set) replaces a `MessageCollection` at the given index, deducting its token cost from the budget.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `collection` | `MessageCollection` | — | The collection to add. |
| `position` | `number \| null` | `null` | Index to replace; if `null`/`-1`, appends. |

**Returns:** `ChatCompletion` — the same instance, for chaining. Throws `TokenBudgetExceededError` if the budget would go negative.

##### `insert(message, identifier, position = 'end') → void`

Inserts a `Message` into a named collection at `'start'`, `'end'`, or a numeric index.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `message` | `Message` | — | The message to insert. |
| `identifier` | `string` | — | Identifier of the target collection. |
| `position` | `'start' \| 'end' \| number` | `'end'` | Where to insert. |

**Returns:** `void`. Throws `TokenBudgetExceededError` on overflow or `IdentifierNotFoundError` if `identifier` is unknown.

##### `insertAtStart(message, identifier) → void` / `insertAtEnd(message, identifier) → void`

Convenience wrappers around `insert` with `position` fixed to `'start'` or `'end'`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `message` | `Message` | — | The message to insert. |
| `identifier` | `string` | — | Identifier of the target collection. |

**Returns:** `void`.

##### `removeLastFrom(identifier) → void`

Pops the last message from a named collection and refunds its tokens to the budget.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `identifier` | `string` | — | Identifier of the target collection. |

**Returns:** `void` (no-op if the collection is empty).

##### `has(identifier) → boolean`

Whether a collection with that identifier exists.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `identifier` | `string` | — | Identifier to check. |

**Returns:** `boolean` — `true` if a collection with that identifier exists.

##### `canAfford(message) → boolean` / `canAffordAll(messages) → boolean`

Budget checks against the remaining token budget.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `message` / `messages` | `Message \| MessageCollection` / `Message[]` | — | One message (`canAfford`) or many (`canAffordAll`). |

**Returns:** `boolean` — `true` if the budget can afford the message(s).

##### `getChat() → object[]`

Flattens the collection to the OpenAI-shaped messages array (`role`, `content`, optional `name`/`tool_calls`/`tool_call_id`/`signature`/`reasoning`).

**Returns:** `object[]` — the flattened messages array ready to send to the API.

##### `getMessages() → MessageCollection`

**Returns:** `MessageCollection` — the root message collection.

##### `getTotalTokenCount() → number`

**Returns:** `number` — sum of tokens across all contained messages.

##### `reserveBudget(message) → void` / `freeBudget(message) → void`

Manually decrement/increment the token budget.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `message` | `Message \| MessageCollection \| number` | — | Item whose token count is reserved/freed; a raw `number` is accepted for `reserveBudget`. |

**Returns:** `void`.

##### `increaseTokenBudgetBy(tokens) → void` / `decreaseTokenBudgetBy(tokens) → void`

Low-level budget tweaks.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `tokens` | `number` | — | Number of tokens to add/subtract. |

**Returns:** `void`.

##### `squashSystemMessages() → Promise<void>`

Merges consecutive nameless system messages into a single message (skipping `newMainChat`/`newChat`/`groupNudge` identifiers).

**Returns:** `Promise<void>` — resolves once the messages are merged and re-tokenized.

##### `setOverriddenPrompts(list) → void` / `getOverriddenPrompts() → string[]`

Tracks which prompts were overridden by character cards.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `list` | `string[]` | — | Identifiers of overridden prompts (setter only). |

**Returns:** `void` (setter); `string[]` (getter).

##### `enableLogging() → void` / `disableLogging() → void` / `log(output) → void`

Optional debug logging — when enabled, `log` prints to the browser console with a `[ChatCompletion]` prefix.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `output` | `string` | — | Message to log (only used by `log`). |

**Returns:** `void`.

Throws `TokenBudgetExceededError` from `add`/`insert` when budget would go negative, and `IdentifierNotFoundError` from `findMessageIndex` for missing identifiers.

### Constants & state

#### `model_list`

See above (Models & sources).

#### `openai_setting_names`

`openai_setting_names: Record<string, number>` — map of preset name → index into `openai_settings`. Populated by `loadOpenAISettings`.

#### `openai_settings`

`openai_settings: object[]` — array of parsed preset bodies (decoded from JSON strings sent by the backend).

#### `promptManager`

`promptManager: PromptManager | null` — active `PromptManager` instance attached to the chat-completion UI. `null` before init; populated by `setupChatCompletionPromptManager`. Owns the prompt order and per-character prompt overrides.

#### `proxies` / `selected_proxy`

`proxies: {name: string, url: string, password: string}[]` and `selected_proxy: {name, url, password}` — saved reverse-proxy presets and the currently active one.

#### `settingsToUpdate`

`settingsToUpdate: Record<string, [selector: string, settingsKey: string, isCheckbox: boolean, isConnection: boolean]>` — used to round-trip settings between presets, the DOM, and `oai_settings`. Extensions that surface custom controls keyed on chat-completion settings can consult this map to discover the relevant selectors.

#### `getChatCompletionPreset(settings = oai_settings) → object`

Returns a deep-cloned preset body suitable for export, built by walking `settingsToUpdate`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `settings` | `ChatCompletionSettings` | `oai_settings` | Settings to serialize. |

**Returns:** `object` — deep-cloned preset body.

#### `loadProxyPresets(settings) → void`

Loads saved reverse-proxy presets from `settings.proxies` / `settings.selected_proxy` into `proxies`/`selected_proxy` and populates `#openai_proxy_preset`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `settings` | `object` | — | Settings blob containing `proxies` and `selected_proxy`. |

**Returns:** `void`.

#### `initOpenAI() → void`

Wires up all UI events for the chat-completion panel. Called once during startup; not normally invoked by extensions.

**Returns:** `void`.
