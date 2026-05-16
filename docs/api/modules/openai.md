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

#### `chat_completion_sources`

Enum of provider identifiers used as the value of `oai_settings.chat_completion_source`. Members include `OPENAI`, `CLAUDE`, `OPENROUTER`, `MAKERSUITE`, `VERTEXAI`, `MISTRALAI`, `CUSTOM`, `COHERE`, `PERPLEXITY`, `GROQ`, `ELECTRONHUB`, `CHUTES`, `NANOGPT`, `DEEPSEEK`, `AIMLAPI`, `XAI`, `POLLINATIONS`, `MOONSHOT`, `FIREWORKS`, `COMETAPI`, `AZURE_OPENAI`, `ZAI`, `SILICONFLOW`, `WORKERS_AI`, `MINIMAX`, `AI21`.

#### `ZAI_ENDPOINT`, `SILICONFLOW_ENDPOINT`, `MINIMAX_ENDPOINT`

Endpoint sub-selectors for sources that expose multiple regional or specialized endpoints. `ZAI_ENDPOINT` is `{ COMMON, CODING }`. `SILICONFLOW_ENDPOINT` and `MINIMAX_ENDPOINT` are `{ GLOBAL, CN }`.

#### `model_list`

Array populated from the most recent `/api/backends/chat-completions/status` response. Items typically have `id` plus provider-specific capability metadata (`architecture`, `capabilities`, `supported_parameters`, etc.) consulted by the capability-detection helpers below.

### Generation parameters

#### `createGenerationParameters(settings, model, type, messages, { jsonSchema = null } = {}) → Promise<object>`

Builds the full request body that gets POSTed to the chat-completion backend. Resolves source-specific behaviors (streaming gating, logit bias, multi-swipe `n`, seed support, proxy fields, reasoning settings, tool config, JSON-schema mode). `type` is one of the generation kinds (`'normal'`, `'quiet'`, `'continue'`, `'impersonate'`, etc.).

#### `prepareOpenAIMessages(args, dryRun) → Promise<[chat: object[], counts: object] | [null, false]>`

Assembles the final ordered message array for chat completion using a fresh `ChatCompletion` (see below). `args` carries the per-generation inputs (`name2`, `charDescription`, `charPersonality`, `scenario`, `worldInfoBefore`, `worldInfoAfter`, `bias`, `type`, `quietPrompt`, `quietImage`, `extensionPrompts`, `cyclePrompt`, `systemPromptOverride`, `jailbreakPromptOverride`, `messages`, `messageExamples`). On success returns `[messages, tokenCounts]`. Emits `CHAT_COMPLETION_PROMPT_READY` with a mutable `{ chat, dryRun }`.

#### `parseExampleIntoIndividual(messageExampleString, appendNamesForGroup = true) → Array<{role, content, name}>`

Splits a `<START>`-delimited example dialog block into individual messages tagged with `'example_user'` / `'example_assistant'` (matching OpenAI's name convention for system-role examples).

#### `formatWorldInfo(value, { wiFormat = null } = {}) → string`

Wraps World Info text using the format template stored in `oai_settings.wi_format` (or the supplied override). The default format `{0}` is a passthrough; users may set e.g. `[Lore: {0}]`.

#### `getPromptPosition(position) → 'start' | 'end' | false`

Maps an `extension_prompt_types` value (`BEFORE_PROMPT`, `IN_PROMPT`, `IN_CHAT`/`NONE`) to the relative position label used by `ChatCompletion.insert()`. Returns `false` for in-chat / none.

#### `getPromptRole(role) → 'system' | 'user' | 'assistant'`

Maps an `extension_prompt_roles` value to the chat-completion role string. Defaults to `'system'` for unknown values.

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

#### `tryParseStreamingError(response, decoded, { quiet = false } = {}) → void`

Inspects a (potentially partial) JSON chunk for backend error/quota/moderation payloads. Throws if a fatal `error`, `message`, or `detail` field is present so the streaming loop can abort; harmless on non-JSON content. Pass `quiet: true` to suppress toasts.

### Capability detection

#### `isImageInliningSupported() → boolean`

True only when `main_api === 'openai'`, `oai_settings.media_inlining` is enabled, and the configured source+model is on the per-source vision list (or has the relevant capability flag in `model_list`).

#### `isVideoInliningSupported() → boolean`

True for Gemini family models (MakerSuite/VertexAI), OpenRouter with `video` modality, and Z.AI vision GLM models — with `media_inlining` enabled.

#### `isAudioInliningSupported() → boolean`

True for OpenAI audio / Gemini / OpenRouter audio-capable models, plus `CUSTOM` (which is assumed to support audio).

#### `isReasoningSignatureSupported(settings = oai_settings) → boolean`

True if the source is VertexAI/MakerSuite, or OpenRouter pointed at a Gemini model — i.e. providers that round-trip encrypted thought signatures. Cross-link: [reasoning.md](./reasoning.md).

### Classes

#### `class ChatCompletion`

Token-budgeted container that prompt assembly fills with system / user / assistant messages until the budget is exhausted. Created internally by `prepareOpenAIMessages`; extensions rarely construct one directly, but its shape is useful when reading prompts from `CHAT_COMPLETION_PROMPT_READY` events.

| Member | Description |
|--------|-------------|
| `constructor()` | Initializes an empty root `MessageCollection` and zero budget |
| `setTokenBudget(context, response)` | Sets budget to `context - response` tokens |
| `add(collection, position = null)` → `ChatCompletion` | Appends or replaces a `MessageCollection`; deducts tokens |
| `insert(message, identifier, position = 'end')` | Inserts a `Message` into a named collection at `'start'`, `'end'`, or a numeric index |
| `insertAtStart(message, identifier)` / `insertAtEnd(message, identifier)` | Convenience wrappers around `insert` |
| `removeLastFrom(identifier)` | Pops the last message from a named collection and refunds tokens |
| `has(identifier) → boolean` | Whether a collection with that identifier exists |
| `canAfford(message) → boolean` / `canAffordAll(messages)` | Budget checks |
| `getChat() → object[]` | Flattens to the OpenAI-shaped messages array (`role`, `content`, optional `name`/`tool_calls`/`tool_call_id`/`signature`/`reasoning`) |
| `getMessages() → MessageCollection` | Returns the root collection |
| `getTotalTokenCount() → number` | Sum of all message tokens |
| `reserveBudget(message\|number)` / `freeBudget(message)` | Manually decrement/increment budget |
| `increaseTokenBudgetBy(n)` / `decreaseTokenBudgetBy(n)` | Low-level budget tweaks |
| `squashSystemMessages()` → `Promise<void>` | Merges consecutive nameless system messages |
| `setOverriddenPrompts(list)` / `getOverriddenPrompts()` | Tracks which prompts were overridden by character cards |
| `enableLogging()` / `disableLogging()` / `log(output)` | Optional debug logging |

Throws `TokenBudgetExceededError` from `add`/`insert` when budget would go negative, and `IdentifierNotFoundError` from `findMessageIndex` for missing identifiers.

### Constants & state

#### `model_list`

See above (Models & sources).

#### `openai_setting_names`

Object map of preset name → index into `openai_settings`. Populated by `loadOpenAISettings`.

#### `openai_settings`

Array of parsed preset bodies (decoded from JSON strings sent by the backend).

#### `promptManager`

Active `PromptManager` instance attached to the chat-completion UI. `null` before init; populated by `setupChatCompletionPromptManager`. Owns the prompt order and per-character prompt overrides.

#### `proxies` / `selected_proxy`

Saved reverse-proxy presets and the currently active one. Each preset is `{ name, url, password }`.

#### `settingsToUpdate`

Record of `preset_key -> [selector, settings_key, is_checkbox, is_connection]`. Used to round-trip settings between presets, the DOM, and `oai_settings`. Extensions that surface custom controls keyed on chat-completion settings can consult this map to discover the relevant selectors.

#### `getChatCompletionPreset(settings = oai_settings) → object`

Returns a deep-cloned preset body suitable for export, built by walking `settingsToUpdate`.

#### `loadProxyPresets(settings) → void`

Loads saved reverse-proxy presets from `settings.proxies` / `settings.selected_proxy` into `proxies`/`selected_proxy` and populates `#openai_proxy_preset`.

#### `initOpenAI() → void`

Wires up all UI events for the chat-completion panel. Called once during startup; not normally invoked by extensions.
