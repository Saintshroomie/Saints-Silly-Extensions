# script.js

The core SillyTavern module — `public/script.js` exposes the bulk of the runtime: LLM generation, prompt injection, message rendering, chat manipulation, character access, macro substitution, network helpers, and a large bag of global state. Most extension code reaches into ST through this file (alongside `SillyTavern.getContext()`).

**Import path from a third-party extension:**

```js
import {
    generateRaw,
    generateQuietPrompt,
    setExtensionPrompt,
    getRequestHeaders,
    eventSource,
    event_types,
    substituteParams,
    chat,
    this_chid,
    characters,
} from '../../../../script.js';
```

> Many of the symbols re-exported from `script.js` (such as `eventSource`, `event_types`, `system_messages`, `user_avatar`) are not their primary definitions — `script.js` simply re-exports them. For prompt injection and event handling, see the guide at [../guides/inject-into-prompts.md](../guides/inject-into-prompts.md). For LLM calls, see [../guides/generate-llm-responses.md](../guides/generate-llm-responses.md). The high-level patterns are documented in `/home/user/SillyTavern/CLAUDE.md`.

---

## Exports at a glance

### Generation & LLM

| Export | Kind | Summary |
|---|---|---|
| `generateRaw` | async function | Cleaned-up LLM call with full control over prompt format. |
| `generateRawData` | async function | Lower-level variant of `generateRaw` returning the raw API response. |
| `generateQuietPrompt` | async function | LLM call through the normal pipeline without adding to chat. |
| `getStoppingStrings` | function | Compute stopping sequences for the active API. |
| `extractMessageBias` | function | Extract `{{bias}}` macro content from a message. |
| `processCommands` | async function | Run a `/slash-command` message via the slash-command engine. |
| `sendGenerationRequest` | async function | Send a non-streaming generation request directly to the active backend. |
| `sendStreamingRequest` | async function | Send a streaming generation request directly to the active backend. |
| `shouldAutoContinue` | function | Decide whether the last chunk warrants an auto-continue. |
| `triggerAutoContinue` | function | If `shouldAutoContinue`, click `#option_continue`. |
| `stopGeneration` | function | Abort the in-flight generation and any active stream. |
| `isStreamingEnabled` | function | Whether the active API+settings support streaming. |
| `startStatusLoading` | function | Show the "API is checking" spinner. |
| `stopStatusLoading` | function | Hide the "API is checking" spinner. |
| `pingServer` | async function | HTTP HEAD-ish ping to confirm the backend is reachable. |
| `deactivateSendButtons` | function | Switch the UI into the "generating" state. |
| `activateSendButtons` | function | Restore the UI from the "generating" state. |

### Context & token budgets

| Export | Kind | Summary |
|---|---|---|
| `getMaxContextSize` | function | **Deprecated alias** for `getMaxPromptTokens`. |
| `getMaxContextTokens` | function | Total context window of the active API. |
| `getMaxResponseTokens` | function | Configured max response length for the active API. |
| `getMaxPromptTokens` | function | Usable prompt budget (`context - response`). |

### Prompt injection

| Export | Kind | Summary |
|---|---|---|
| `setExtensionPrompt` | function | Register/update an extension prompt injection. |
| `getExtensionPrompt` | async function | Resolve the combined injection text for a position/depth/role. |
| `getExtensionPromptByName` | async function | Get the value of an injection by its module key. |
| `getExtensionPromptMaxDepth` | function | Returns `MAX_INJECTION_DEPTH` (10000). |
| `extension_prompt_types` | const enum | `NONE`, `IN_PROMPT`, `IN_CHAT`, `BEFORE_PROMPT`. |
| `extension_prompt_roles` | const enum | `SYSTEM`, `USER`, `ASSISTANT`. |
| `MAX_INJECTION_DEPTH` | const number | `10000`. |

### Messages & chat rendering

| Export | Kind | Summary |
|---|---|---|
| `redisplayChat` | async function | Re-render messages from a given index. |
| `updateMessageBlock` | function | Re-render a single message's content block in-place. |
| `updateMessageElement` | function | Build/refresh the full DOM element for a message. |
| `addOneMessage` | function | Append a single message element to the chat. |
| `deleteMessage` | async function | Delete a message (and emit `MESSAGE_DELETED`). |
| `deleteLastMessage` | async function | Pop the last message from chat and DOM. |
| `clearChat` | async function | Wipe rendered messages, optionally also `chat[]`. |
| `replaceCurrentChat` | async function | Re-select the most recent chat file for the current character. |
| `reloadCurrentChatUnsafe` | async function | Reload the current chat without mutex. Prefer `reloadCurrentChat`. |
| `reloadCurrentChat` | function | Mutex-guarded re-entry into `reloadCurrentChatUnsafe`. |
| `showMoreMessages` | async function | Load older messages above the current scrollback. |
| `printMessages` | async function | Initial render of all messages in the current chat. |
| `sendTextareaMessage` | async function | Send whatever is in `#send_textarea`. |
| `messageFormatting` | function | Format a message string into final display HTML. |
| `appendMediaToMessage` | function | Render images/files attached to a message. |
| `addCopyToCodeBlocks` | function | Inject "copy" buttons into `<pre><code>` blocks. |
| `getNextMessageId` | function | Get the index a new message would occupy. |

### Characters & entity helpers

| Export | Kind | Summary |
|---|---|---|
| `setActiveCharacter` | function | Set the "active character" used by the entity filter UI. |
| `setActiveGroup` | function | Set the "active group" (mutually exclusive with active character). |
| `selectCharacterById` | async function | Switch to a different character by chid. |
| `printCharacters` | async function | Re-render the character list panel. |
| `printCharactersDebounced` | function | Debounced wrapper around `printCharacters(false)`. |
| `getOneCharacter` | async function | Fetch/refresh a single character record. |
| `getCharacters` | async function | Reload the entire character list from the server. |
| `characterToEntity` | function | Wrap a character in an entity object. |
| `groupToEntity` | function | Wrap a group in an entity object. |
| `tagToEntity` | function | Wrap a tag in an entity object. |
| `getEntitiesList` | function | All characters + groups + bogus folders, filtered/sorted. |
| `getCharacterSource` | function | URL of the character card's source (CHub, Pygmalion, GitHub). |
| `getCharacterAvatar` | function | URL of a character's avatar thumbnail. |
| `formatCharacterAvatar` | function | `characters/<avatar>` URL helper. |
| `deleteCharacterChatByName` | async function | Delete a specific chat file for a character. |

### Character card fields

| Export | Kind | Summary |
|---|---|---|
| `getCharacterCardFields` | function | Eagerly resolve all card fields (description, system, persona, etc.). |
| `getCharacterCardFieldsLazy` | function | Same fields, but each is a lazy getter. |
| `createLazyFields` | function | Generic helper to build a lazy/memoized object from resolvers. |
| `parseMesExamples` | function | Split a `mes_example` string into example blocks. |
| `baseChatReplace` | function | `substituteParams` + newline-collapse + CRLF cleanup. |
| `removeMacros` | function | Strip every `{{…}}` macro from a string. |

### Chat navigation & save

| Export | Kind | Summary |
|---|---|---|
| `getCurrentChatId` | function | The active chat file id (group `chat_id` or character `chat`). |
| `scrollChatToBottom` | function | Scroll the chat container to the latest message. |
| `scrollOnMediaLoad` | function | Re-scroll after embedded images/media finish loading. |
| `cancelDebouncedChatSave` | function | Cancel any pending debounced chat save. |

### Macros / substitution

| Export | Kind | Summary |
|---|---|---|
| `substituteParams` | function | Resolve `{{macros}}` in a string (new options-object signature). |
| `substituteParamsExtended` | function | Deprecated convenience wrapper for `substituteParams` with custom macros. |

### Auth / network

| Export | Kind | Summary |
|---|---|---|
| `getRequestHeaders` | function | Headers (Content-Type + CSRF) for ST server requests. |

### Constants & state

A large set of mutable globals and constants are exported from `script.js`. The most commonly used:

- **Chat state**: `chat`, `chat_metadata` (mutable arrays/objects — do not reassign), `chatElement` (jQuery), `isGenerating()` (live getter, returns `is_send_press || is_group_generating`).
- **Character state**: `characters`, `this_chid` (string|undefined), `default_avatar`, `system_avatar`, `comment_avatar`, `default_user_avatar`.
- **System identifiers**: `systemUserName` (`'SillyTavern System'`), `neutralCharacterName` (`'Assistant'`).
- **Debounced savers**: `saveSettingsDebounced`, `saveCharacterDebounced`, `printCharactersDebounced`.
- **Versioning**: `CLIENT_VERSION` (Horde User-Agent string).
- **Character-card defaults**: `talkativeness_default` (`0.5`), `depth_prompt_depth_default` (`4`), `depth_prompt_role_default` (`'system'`).

---

## Reference

### Generation & LLM

#### `generateRaw(params) → Promise<string>`

```js
generateRaw({
    prompt = '',
    api = null,
    instructOverride = false,
    quietToLoud = false,
    systemPrompt = '',
    responseLength = null,
    trimNames = true,
    prefill = '',
    jsonSchema = null,
} = {})
```

Cleaned-up LLM call with no chat-context bleed. The `prompt` may be a string (treated as a single user-role message) or an array of `{ role, content, name? }` chat-style messages. When `jsonSchema` is provided, the returned string is the extracted JSON conforming to that schema. See the guide at [../guides/generate-llm-responses.md](../guides/generate-llm-responses.md) and the high-level pattern in `CLAUDE.md`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `params.prompt` | `string \| object[]` | `''` | Prompt content. String = single user-role message; array = chat-style `[{role, content, name?}, ...]`. |
| `params.api` | `string` | `null` | API to use. Falls back to `main_api` when unset. |
| `params.instructOverride` | `boolean` | `false` | `true` to override instruct mode, `false` to use the default. |
| `params.quietToLoud` | `boolean` | `false` | `true` = generate in system mode, `false` = character mode. |
| `params.systemPrompt` | `string` | `''` | System prompt to use. |
| `params.responseLength` | `number` | `null` | Maximum response length. `null`/`0` uses the global default. |
| `params.trimNames` | `boolean` | `true` | Whether to trim `{{user}}:` and `{{char}}:` from the response. |
| `params.prefill` | `string` | `''` | Optional prefill text for the prompt (assistant prefill on chat-completion APIs). |
| `params.jsonSchema` | `JsonSchema` | `null` | JSON schema for structured generation. Usually requires a special instruction. |

**Returns:** `Promise<string>` — the cleaned-up generated text, or an extracted JSON string conforming to `jsonSchema` when one is supplied. Throws `Error('No message generated')` if the backend returns an empty result.

#### `generateRawData(params) → Promise<object | string>`

Same parameters as `generateRaw` minus `trimNames`. Returns the raw backend response object (or a JSON string when `jsonSchema` is set) without `cleanUpMessage` post-processing — useful when you need access to reasoning content, finish reasons, or other API metadata.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `params.prompt` | `string \| object[]` | `''` | Prompt content (see `generateRaw`). |
| `params.api` | `string` | `null` | API to use. Falls back to `main_api`. |
| `params.instructOverride` | `boolean` | `false` | Override instruct mode. |
| `params.quietToLoud` | `boolean` | `false` | Generate in loud (foreground) mode instead of quiet. |
| `params.systemPrompt` | `string` | `''` | System prompt. |
| `params.responseLength` | `number` | `null` | Override max response tokens. |
| `params.prefill` | `string` | `''` | Optional prefill text. |
| `params.jsonSchema` | `JsonSchema` | `null` | JSON schema for structured generation. |

**Returns:** `Promise<object | string>` — raw backend response object, or an extracted JSON string when `jsonSchema` is provided. Throws the parsed error body on non-OK responses.

#### `generateQuietPrompt(params) → Promise<string>`

```js
generateQuietPrompt({
    quietPrompt = '',
    quietToLoud = false,
    skipWIAN = false,
    quietImage = null,
    quietName = null,
    responseLength = null,
    forceChId = null,
    jsonSchema = null,
    removeReasoning = true,
    trimToSentence = false,
} = {})
```

Runs the full ST generation pipeline (character card, World Info, Author's Note, etc.) but does not add the result to chat. By default it strips reasoning blocks. Use when you need character voice/context; use `generateRaw` for clean templated prompts. See [../guides/generate-llm-responses.md](../guides/generate-llm-responses.md) and `CLAUDE.md`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `params.quietPrompt` | `string` | `''` | Instruction prompt for the AI. |
| `params.quietToLoud` | `boolean` | `false` | Whether to generate loudly (foreground) instead of quietly. |
| `params.skipWIAN` | `boolean` | `false` | Skip injection of World Info and Author's Note. |
| `params.quietImage` | `string` | `null` | Image to use for the quiet prompt. |
| `params.quietName` | `string` | `null` | Name override (defaults to `"System:"`). |
| `params.responseLength` | `number` | `null` | Override max response tokens. |
| `params.forceChId` | `number` | `null` | Character ID to use (group chats only). |
| `params.jsonSchema` | `object` | `null` | JSON schema for structured generation. |
| `params.removeReasoning` | `boolean` | `true` | Parse and remove reasoning blocks per reasoning-format preferences. |
| `params.trimToSentence` | `boolean` | `false` | Trim the response to the last complete sentence. |

**Returns:** `Promise<string>` — the generated text, or a serialized JSON object when `jsonSchema` is provided.

#### `getStoppingStrings(isImpersonate, isContinue, api = main_api) → string[]`

Returns the array of stopping strings appropriate for the current API. For OpenAI/chat-completion APIs this returns only user-defined custom stops; for text completion it also includes `\nName:` style stops, group-member names, and any instruct-mode sequences.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `isImpersonate` | `boolean` | — | A request is made to impersonate the user. |
| `isContinue` | `boolean` | — | A request is made to continue the last message. |
| `api` | `string` | `main_api` | Optional API name to get API-specific stopping sequences for. |

**Returns:** `string[]` — deduplicated array of stopping strings.

#### `extractMessageBias(message) → string`

Compiles `message` as a Handlebars template with a `{{bias "..."}}` helper and returns the concatenated bias text (prefixed with a space) or `''` if none. Used by ST to pull `{{bias}}` macros out of a user message before sending.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `message` | `string` | — | Message text containing optional `{{bias "..."}}` macros. |

**Returns:** `string` — concatenated bias text (prefixed with a space), or `''` when no bias macros are present or on parse error.

#### `processCommands(message) → Promise<boolean>`

If `message` begins with `/`, runs it through `executeSlashCommandsOnChatInput` (which clears the chat input). Returns `true` if a command was executed (and therefore "send" should be considered interrupted), `false` otherwise.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `message` | `string` | — | Text to test; only strings starting with `/` are treated as commands. |

**Returns:** `Promise<boolean>` — `true` if message sending was interrupted (i.e. a slash command ran), `false` otherwise.

#### `sendGenerationRequest(type, data, options = {}) → Promise<object>`

Low-level: send a **non-streaming** request to whichever backend is currently active. For `openai` it routes to `sendOpenAIRequest`; for `koboldhorde` to `generateHorde`; otherwise it POSTs `data` to `getGenerateUrl(main_api)` with the global `abortController.signal`. Most extensions should use `generateRaw` / `generateQuietPrompt` instead — this is for advanced use only. Throws the parsed error body on non-OK responses.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | `string` | — | Generation type (e.g. `'normal'`, `'quiet'`, `'impersonate'`). |
| `data` | `object` | — | Generation data payload (API-specific schema). |
| `options` | `AdditionalRequestOptions` | `{}` | Additional options forwarded to the per-API request function. |

**Returns:** `Promise<object>` — parsed JSON response data from the backend. Throws the parsed error body on non-OK responses.

#### `sendStreamingRequest(type, data, options = {}) → Promise<any>`

Streaming counterpart of `sendGenerationRequest`. Requires `streamingProcessor` to already exist (i.e. called from within `Generate`). Returns an async generator. Throws if the active API does not support streaming.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | `string` | — | Generation type. |
| `data` | `object` | — | Generation data payload. |
| `options` | `AdditionalRequestOptions` | `{}` | Additional options forwarded to the per-API streaming function. |

**Returns:** `Promise<any>` — an async generator yielding stream chunks. Throws `'Generation was aborted.'` if the abort signal already fired, or `'Streaming is enabled, but the current API does not support streaming.'` for unsupported APIs.

#### `shouldAutoContinue(messageChunk, isImpersonate) → boolean`

Returns `true` only if all of the following hold: auto-continue is enabled, the chunk is a non-empty string, no impersonation, generation isn't already in flight or aborted, the textarea is empty, the API allows it, and the last message has fewer tokens than the configured target length.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `messageChunk` | `string` | — | The most recent generated chunk to evaluate. |
| `isImpersonate` | `boolean` | — | Whether the current generation is a user impersonation. |

**Returns:** `boolean` — `true` if the message should be auto-continued, `false` otherwise.

#### `triggerAutoContinue(messageChunk, isImpersonate) → void`

If not in a group chat and `shouldAutoContinue` is true, fires a click on `#option_continue`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `messageChunk` | `string` | — | The most recent generated chunk. |
| `isImpersonate` | `boolean` | — | Whether the current generation is a user impersonation. |

**Returns:** none.

#### `stopGeneration() → boolean`

Aborts the active stream (if any) and the global `abortController`, hides the stop button, and emits `event_types.GENERATION_STOPPED`.

**Returns:** `boolean` — `true` if a stream or abort controller was actually stopped, `false` if there was nothing to stop.

#### `isStreamingEnabled() → boolean`

Returns whether the active `main_api` and its preset have streaming turned on (and the connection supports it). Note: OpenAI o1 models are explicitly excluded even if `stream_openai` is true.

**Returns:** `boolean` — `true` when streaming is available and enabled for the current API.

#### `startStatusLoading() / stopStatusLoading() → void`

Show/hide the `.api_loading` spinner and toggle the `disabled` class on `.api_button` elements. Use sparingly — typically only when probing an API connection on your own.

**Returns:** none.

#### `pingServer() → Promise<boolean>`

POSTs to `api/ping` with the CSRF header (no body).

**Returns:** `Promise<boolean>` — `true` on a 2xx response, `false` otherwise (including network errors).

#### `deactivateSendButtons() → void`

Switches the UI into the "generating" state: shows the stop button, hides swipe buttons, and sets `document.body.dataset.generating = 'true'`. Pair with `activateSendButtons` in a `finally` block when running multi-step pipelines (see `CLAUDE.md` § Multi-Step LLM Pipelines).

**Returns:** none.

#### `activateSendButtons() → void`

Restores the normal UI: clears `is_send_press`, hides the stop button, shows swipe buttons, and removes `document.body.dataset.generating`.

**Returns:** none.

---

### Context & token budgets

#### `getMaxContextSize() → number` *(deprecated alias)*

Re-export of `getMaxPromptTokens` kept for compatibility. New code should call `getMaxPromptTokens` directly.

**Returns:** `number` — usable prompt token budget (delegates to `getMaxPromptTokens`).

#### `getMaxContextTokens() → number`

Total context window for the active API:
- `kobold` / `koboldhorde` / `textgenerationwebui`: `max_context`
- `novel`: clamped to model-specific caps (8192 for clio/kayra/erato, minus subscription/special-token adjustments)
- `openai`: `oai_settings.openai_max_context`
- otherwise: `1487` (legacy default)

**Returns:** `number` — the maximum context token limit for the current API.

#### `getMaxResponseTokens() → number`

Configured response/generation length: `amount_gen` for KAI/TextGen/Novel, `oai_settings.openai_max_tokens` for OpenAI, else `0`.

**Returns:** `number` — the maximum response token limit for the current API.

#### `getMaxPromptTokens(overrideResponseLength = null) → number`

`getMaxContextTokens() - (overrideResponseLength || getMaxResponseTokens())`. The recommended call when an extension needs to know how much room a prompt has.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `overrideResponseLength` | `number \| null` | `null` | Optional override for the response length budget. Non-positive/NaN values are treated as `null`. |

**Returns:** `number` — usable prompt token budget.

---

### Prompt injection

#### `setExtensionPrompt(key, value, position, depth, scan = false, role = SYSTEM, filter = null) → void`

```js
setExtensionPrompt('myExt_facts', factsText, extension_prompt_types.IN_CHAT, 4, false, extension_prompt_roles.SYSTEM);
// Remove:
setExtensionPrompt('myExt_facts', '', extension_prompt_types.NONE, 0);
```

Registers (or overwrites) an injection slot under `key`. `value` is coerced to a string. `filter`, if provided, is an `() => Promise<boolean>|boolean` predicate evaluated each time the injection is collected — return `false` to skip this injection on that build. See [../guides/inject-into-prompts.md](../guides/inject-into-prompts.md) and `CLAUDE.md` § Extension Prompt Injection.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `key` | `string` | — | Prompt injection id (unique per extension). |
| `value` | `string` | — | Prompt injection text (coerced to string). Empty string removes the injection's contribution. |
| `position` | `number` | — | Insertion position. `0` = after story string, `1` = in-chat with custom depth (see `extension_prompt_types`). |
| `depth` | `number` | — | Insertion depth. `0` represents the last message in context; expected values up to `MAX_INJECTION_DEPTH`. |
| `scan` | `boolean` | `false` | Whether the prompt should be included in the World Info keyword scan. |
| `role` | `number` | `extension_prompt_roles.SYSTEM` | Message role for this injection. |
| `filter` | `() => Promise<boolean>\|boolean` | `null` | Predicate evaluated each build; return `false` to skip the injection. |

**Returns:** none.

#### `getExtensionPrompt(position = IN_PROMPT, depth, separator = '\n', role, wrap = true) → Promise<string>`

Resolve and join all extension prompts matching the given position (and optionally depth/role). Result is wrapped with the separator on both ends when `wrap` is true. The combined string is then run through `substituteParams`. `undefined` for `depth`/`role` matches any value.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `position` | `number` | `extension_prompt_types.IN_PROMPT` | Position to match. |
| `depth` | `number` | `undefined` | Depth to match. `undefined` matches any depth. |
| `separator` | `string` | `'\n'` | Separator for joining multiple prompts. |
| `role` | `number` | `undefined` | Role to match. `undefined` matches any role. |
| `wrap` | `boolean` | `true` | Whether to wrap the joined output in the separator on both ends. |

**Returns:** `Promise<string>` — the combined and macro-substituted extension prompt text (empty string when nothing matches).

#### `getExtensionPromptByName(moduleName) → Promise<string>`

Lookup a single injection by exact key. Result is run through `substituteParams`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `moduleName` | `string` | — | Exact injection key (the `key` passed to `setExtensionPrompt`). |

**Returns:** `Promise<string>` — the macro-substituted prompt value, or `''` if missing or if the registered `filter` returns falsy.

#### `getExtensionPromptMaxDepth() → number`

The internal `doChatInject` loop iterates `0..maxDepth` to place IN_CHAT injections.

**Returns:** `number` — `MAX_INJECTION_DEPTH` (currently `10000`).

#### `extension_prompt_types` *(const enum)*

```js
{ NONE: -1, IN_PROMPT: 0, IN_CHAT: 1, BEFORE_PROMPT: 2 }
```

#### `extension_prompt_roles` *(const enum)*

```js
{ SYSTEM: 0, USER: 1, ASSISTANT: 2 }
```

#### `MAX_INJECTION_DEPTH` *(const number)*

`10000`. Hard cap on how far back an `IN_CHAT` injection can be placed.

---

### Messages & chat rendering

#### `redisplayChat({ targetChat = chat, startIndex = 0, fade = true } = {}) → Promise<void>`

Removes all `.mes` elements at or after `startIndex` and re-renders them from `targetChat`. Used by `printMessages` and after destructive edits.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `options.targetChat` | `ChatMessage[]` | `chat` | Source array to render. Messages before `startIndex` remain untouched. |
| `options.startIndex` | `number` | `0` | Everything including and after this index is replaced. |
| `options.fade` | `boolean` | `true` | When `false`, swipe chevrons do not fade in. |

**Returns:** `Promise<void>`.

#### `updateMessageBlock(messageId, message, { rerenderMessage = true } = {}) → void`

Update just the contents of an existing message element. When `rerenderMessage` is true (default), reruns `messageFormatting` on `message.extra?.display_text ?? message.mes` and writes it into `.mes_text`. Also refreshes reasoning UI, code-block copy buttons, and media.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `messageId` | `number` | — | Index of the message in `chat`. |
| `message` | `object` | — | Message object (used to derive new content). |
| `options.rerenderMessage` | `boolean` | `true` | Whether to re-render the message content inside `.mes_text`. |

**Returns:** none.

#### `updateMessageElement(mes, { messageId, messageElement, adjustMediaScroll } = {}) → JQuery<HTMLElement>`

Builds a fully-populated message element from a `mes` object — avatar, timestamp, name, mesIDDisplay, token count, timer, bias, reasoning, media, swipe counter. If `messageElement` is omitted a fresh clone of the message template is used. The element is **returned but not appended** — callers do the DOM insertion.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `mes` | `ChatMessage` | — | Message object to render. |
| `options.messageId` | `number` | `chat.length - 1` | Message ID to assign to the element. |
| `options.messageElement` | `JQuery<HTMLElement>` | `messageTemplate.clone()` | Element to populate. Mutated in place. |
| `options.adjustMediaScroll` | `SCROLL_BEHAVIOR` | `SCROLL_BEHAVIOR.NONE` | Scroll behavior passed to `appendMediaToMessage`. |

**Returns:** `JQuery<HTMLElement>` — the populated (but not yet inserted) message element.

#### `addOneMessage(mes, { type, insertAfter, scroll = true, insertBefore, forceId, showSwipes = true } = {}) → JQuery<HTMLElement>`

Append (or insert) a single message into the chat DOM. The caller must have already pushed `mes` onto `chat[]`. `type === 'swipe'` performs in-place update of the existing element rather than appending.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `mes` | `ChatMessage` | — | Message object (already pushed onto `chat[]`). |
| `options.type` | `string` | `undefined` | Deprecated. Pass `'swipe'` to update existing element in place. |
| `options.insertAfter` | `number` | `null` | Message ID to insert the new message after. |
| `options.scroll` | `boolean` | `true` | Whether to scroll to the new message. |
| `options.insertBefore` | `number` | `null` | Message ID to insert the new message before. |
| `options.forceId` | `number` | `null` | Force the assigned message ID. |
| `options.showSwipes` | `boolean` | `true` | Whether to refresh swipe buttons after insertion. |

**Returns:** `JQuery<HTMLElement>` — the inserted (or updated) message element.

#### `deleteMessage(id, swipeDeletionIndex = undefined, askConfirmation = false) → Promise<void>`

Delete the message at chat index `id`. If `swipeDeletionIndex` is a number, only that swipe variant is removed (via `deleteSwipe`). When `askConfirmation` is true, shows a confirm popup with separate "Delete Swipe"/"Delete Message" buttons. Emits `MESSAGE_DELETED` with the **resulting** chat length.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `number` | — | Index of the message to delete. |
| `swipeDeletionIndex` | `number` | `undefined` | If provided, delete only that swipe variant (via `deleteSwipe`). |
| `askConfirmation` | `boolean` | `false` | Whether to show a confirmation popup before deletion. |

**Returns:** `Promise<void>`. Throws on invalid swipe indices.

#### `deleteLastMessage() → Promise<void>`

Pop the last message off `chat[]` and remove its DOM element. Emits `MESSAGE_DELETED`.

**Returns:** `Promise<void>`.

#### `clearChat({ clearData = false } = {}) → Promise<void>`

Visually clears the chat container, closes any active edit, flushes `extension_prompts`, and saves itemized-prompt state.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `options.clearData` | `boolean` | `false` | Also truncate the `chat[]` array to length 0. |

**Returns:** `Promise<void>`.

#### `replaceCurrentChat() → Promise<void>`

After a chat is deleted, picks the next-most-recent chat file for the current character (or creates a new one), updates `characters[this_chid].chat`, and calls `getChat()`.

**Returns:** `Promise<void>`.

#### `reloadCurrentChatUnsafe() → Promise<void>` / `reloadCurrentChat() → Promise<void>`

`reloadCurrentChatUnsafe` performs `clearChat({ clearData: true })` and then loads the appropriate chat (group or solo). Always prefer **`reloadCurrentChat`**, which routes through `reloadChatMutex` (a `SimpleMutex`) so that concurrent reloads are serialized.

**Returns:** `Promise<void>` (for both).

#### `showMoreMessages(messagesToLoad = null) → Promise<void>`

Prepend a batch of older messages above the currently displayed ones (used by the "Show more messages" button). Emits `MORE_MESSAGES_LOADED`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `messagesToLoad` | `number \| null` | `null` | Batch size. Defaults to `power_user.chat_truncation` (or all remaining messages). |

**Returns:** `Promise<void>`.

#### `printMessages() → Promise<void>`

Initial render after a chat is loaded — calls `redisplayChat`, scrolls to bottom, and schedules `scrollOnMediaLoad`.

**Returns:** `Promise<void>`.

#### `sendTextareaMessage() → Promise<any>`

Send whatever is in `#send_textarea`. If the textarea is empty and the last message is from a character (and `continue_on_send` is set), this becomes a continue. If no character is selected and the textarea is non-empty, a temporary "Assistant" chat is created first.

**Returns:** `Promise<any>` — the result of the underlying `Generate(...)` call, or `undefined` when sending is blocked by guard checks (mid-swipe, generation in progress, etc.).

#### `messageFormatting(mes, ch_name, isSystem, isUser, messageId, sanitizerOverrides = {}, isReasoning = false) → string`

Run a raw message string through ST's full formatting pipeline: regex scripts, prompt-bias stripping, macro substitution, markdown (Showdown), DOMPurify sanitization, etc. Available on the context object as `context.messageFormatting` as well.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `mes` | `string` | — | Raw message text. |
| `ch_name` | `string` | — | Character name (used for regex scripts and name stripping). |
| `isSystem` | `boolean` | — | `true` if the message was sent by the system. |
| `isUser` | `boolean` | — | `true` if the message was sent by the user. |
| `messageId` | `number` | — | Message index in the `chat` array. |
| `sanitizerOverrides` | `Partial<DOMPurify.Config>` | `{}` | DOMPurify config overrides. |
| `isReasoning` | `boolean` | `false` | `true` if the text is reasoning output (alters regex placement). |

**Returns:** `string` — formatted, sanitized HTML. Returns `''` for falsy `mes`.

#### `appendMediaToMessage(mes, messageElement, scrollBehavior = SCROLL_BEHAVIOR.ADJUST) → void`

Render image/file attachments from `mes.extra.media` / `mes.extra.files` into the supplied jQuery message element. Migrates legacy single-media properties to arrays on first encounter.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `mes` | `ChatMessage` | — | Message object (mutated: legacy media fields are normalized to arrays). |
| `messageElement` | `JQuery<HTMLElement>` | — | Target message element. |
| `scrollBehavior` | `SCROLL_BEHAVIOR` | `SCROLL_BEHAVIOR.ADJUST` | One of `NONE`, `KEEP`, `ADJUST`. |

**Returns:** none.

#### `addCopyToCodeBlocks(messageElement) → void`

For every `<pre><code>` inside the supplied element, run `hljs.highlightElement` and append a clickable copy icon that writes the block's text to the clipboard.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `messageElement` | `JQuery<HTMLElement> \| HTMLElement` | — | Container element to scan for code blocks. |

**Returns:** none.

#### `getNextMessageId(type) → number`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | `string` | — | Generation type. `'swipe'` returns `chat.length - 1`. |

**Returns:** `number` — `chat.length - 1` for swipe generations, `chat.length` otherwise.

---

### Characters & entity helpers

#### `setActiveCharacter(entityOrKey) → void`

Sets the "active character" used by the entity-list filter UI (sidebar highlight). Setting a character clears any active group.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `entityOrKey` | `object \| number \| string` | `undefined` | Entity (with `.id`), numeric id, or tag-key string. If omitted/falsy, resets the active character to `null`. |

**Returns:** none.

#### `setActiveGroup(entityOrKey) → void`

Mirror of `setActiveCharacter` for groups. Setting an active group clears any active character.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `entityOrKey` | `object \| number \| string` | `undefined` | Entity (with `.id`), numeric id, or tag-key string. If omitted/falsy, resets the active group to `null`. |

**Returns:** none.

#### `selectCharacterById(id, { switchMenu = true } = {}) → Promise<void>`

Switch the UI to a different character by chid (numeric index in `characters[]`, **not** the avatar key). No-op if the chat is currently saving or a group generation is in progress. When `switchMenu` is true and the character is already selected, this also opens the character-edit menu.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `number` | — | The chid (index into `characters[]`). |
| `options.switchMenu` | `boolean` | `true` | Switch the right menu to the character-edit menu if already selected. |

**Returns:** `Promise<void>`. No-op when `characters[id]` is missing, the chat is saving, or a group generation is in progress.

#### `printCharacters(fullRefresh = false) → Promise<void>`

Re-render the character list panel. Use this when reprinting is the primary focus; prefer `printCharactersDebounced` for side-effects.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `fullRefresh` | `boolean` | `false` | If `true`, fully refresh the list and reset pagination. |

**Returns:** `Promise<void>`.

#### `printCharactersDebounced` *(const)*

`debounce(() => printCharacters(false), DEFAULT_PRINT_TIMEOUT)`. Prefer this when reprinting is a side-effect rather than the primary action.

#### `getOneCharacter(avatarUrl) → Promise<void>`

POSTs to `/api/characters/get` for a single avatar and replaces its entry in `characters[]`. Used after editing a single card to avoid reloading the whole list.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `avatarUrl` | `string` | — | Avatar filename of the character to fetch. |

**Returns:** `Promise<void>`. Shows a toast if the character is no longer in the list.

#### `getCharacters() → Promise<void>`

POSTs to `/api/characters/all`, replaces `characters[]`, then calls `getGroups()` and `printCharacters(true)`. If the previously selected character no longer exists, shows an error popup and reloads the page.

**Returns:** `Promise<void>`.

#### `characterToEntity(character, id) → Entity`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `character` | `Character` | — | The character object. |
| `id` | `string \| number` | — | Id to assign to this entity. |

**Returns:** `Entity` — `{ item: character, id, type: 'character' }`.

#### `groupToEntity(group) → Entity`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `group` | `Group` | — | The group object. |

**Returns:** `Entity` — `{ item: group, id: group.id, type: 'group' }`.

#### `tagToEntity(tag) → Entity`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `tag` | `Tag` | — | The tag object (deep-cloned). |

**Returns:** `Entity` — `{ item: structuredClone(tag), id: tag.id, type: 'tag', entities: [] }`.

#### `getEntitiesList({ doFilter = false, doSort = true } = {}) → Entity[]`

Build the unified list of characters + groups + (when `bogus_folders` is enabled) tag-folders. Used by the character-list renderer.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `options.doFilter` | `boolean` | `false` | Apply the global filter UI (tag filter, search, etc.). |
| `options.doSort` | `boolean` | `true` | Sort the resulting list. |

**Returns:** `Entity[]` — all entities, filtered/sorted per the options.

#### `getOneCharacter` — see above.

#### `getCharacterSource(chId = this_chid) → string`

Return the source URL for the character card if its extensions metadata advertises one — checks (in order) `chub.full_path`, `pygmalion_id`, `github_repo`, `source_url`, `risuai.source`, and `perchance_data.slug`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `chId` | `string \| number` | `this_chid` | Index into `characters[]`. |

**Returns:** `string` — the source URL, or `''` when none is set.

#### `getCharacterAvatar(characterId) → string`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `characterId` | `number \| string` | — | Character index. |

**Returns:** `string` — thumbnailed avatar URL, or `default_avatar` if the character has no avatar.

#### `formatCharacterAvatar(characterAvatar) → string`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `characterAvatar` | `string` | — | Avatar filename. |

**Returns:** `string` — `` `characters/${characterAvatar}` ``.

#### `deleteCharacterChatByName(characterId, fileName) → Promise<void>`

Delete a single chat file belonging to the given character. If the deleted chat is the currently active one for that character, the next-most-recent chat is selected. First calls `unshallowCharacter` so the full card is loaded.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `characterId` | `string` | — | Character ID to delete the chat for. |
| `fileName` | `string` | — | Name of the chat file (without `.jsonl` extension). |

**Returns:** `Promise<void>`. No-op (with warning) when the character isn't found.

---

### Character card fields

#### `getCharacterCardFields({ chid = undefined } = {}) → CharacterCardFields`

Eagerly resolved card fields for the chosen character: `system`, `mesExamples`, `description`, `personality`, `persona`, `scenario`, `jailbreak`, `version`, `charDepthPrompt`, `creatorNotes`, `firstMessage`, `alternateGreetings`. Each text field is run through `baseChatReplace` (macros + newline-collapse). In group chats, `description`/`personality`/`scenario`/`mesExamples` may come from the group card layer.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `options.chid` | `number` | `this_chid` | Optional character index. |

**Returns:** `CharacterCardFields` — all card text fields, fully resolved.

#### `getCharacterCardFieldsLazy({ chid = undefined } = {}) → CharacterCardFields`

Same fields as `getCharacterCardFields`, but built with `createLazyFields` — each field is only computed on first access. Use this when you only need one or two fields and want to avoid the cost of substituting macros across the entire card.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `options.chid` | `number` | `this_chid` | Optional character index. |

**Returns:** `CharacterCardFields` — same shape as `getCharacterCardFields`, but every property is a memoized getter.

#### `createLazyFields(resolvers) → object`

```js
const fields = createLazyFields({
    description: () => baseChatReplace(card.description),
    persona: () => baseChatReplace(power_user.persona_description),
});
fields.description; // resolver called once and memoized
```

Generic helper that creates an object whose properties are getters wrapping memoized resolver functions.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `resolvers` | `Record<string, () => string \| string[]>` | — | Map of field names to resolver functions. |

**Returns:** `object` — object with lazy, memoized getters for each key.

#### `parseMesExamples(examplesStr, isInstruct) → string[]`

Split a character's `mes_example` string on `<START>` delimiters into an array of example blocks, each prefixed with the configured example separator (`<START>` for OpenAI/instruct, `power_user.context.example_separator` otherwise).

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `examplesStr` | `string` | — | The `mes_example` raw text. |
| `isInstruct` | `boolean` | — | Whether instruct-mode formatting is active. |

**Returns:** `string[]` — array of example blocks (each with its block heading). Returns `[]` for empty/`<START>`-only input.

#### `baseChatReplace(value, name1Override = null, name2Override = null) → string`

Pipeline used to process card fields: `substituteParams(value, { name1Override, name2Override, replaceCharacterCard: false })`, optional `collapseNewlines` (when `power_user.collapse_newlines` is on), and CR stripping.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `value` | `string` | — | Input text to process. |
| `name1Override` | `string \| null` | `null` | Override for `name1`. |
| `name2Override` | `string \| null` | `null` | Override for `name2`. |

**Returns:** `string` — the processed text, or `value` unchanged if it's not a non-empty string.

#### `removeMacros(str) → string`

Strip every `{{...}}` substring (greedy, multi-line aware) and `.trim()`. Used when a card field needs to be stored or compared without macro placeholders.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `str` | `string` | — | Input string (nullish coalesces to `''`). |

**Returns:** `string` — `str` with all `{{…}}` substrings removed and trimmed.

---

### Chat navigation & save

#### `getCurrentChatId() → string | undefined`

The current chat file id — `groups.find(g => g.id == selected_group)?.chat_id` for a group, or `characters[this_chid]?.chat` for a solo chat.

**Returns:** `string | undefined` — the chat file id, or `undefined` when nothing is selected.

#### `scrollChatToBottom({ waitForFrame } = {}) → void`

Scrolls the `#chat` container to the bottom (or, in waifu mode, just past the last `.mes`). No-op when `power_user.auto_scroll_chat_to_bottom` is disabled.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `options.waitForFrame` | `boolean` | `undefined` | If `true`, scroll inside `requestAnimationFrame` to avoid layout thrashing. |

**Returns:** none.

#### `scrollOnMediaLoad() → void`

Watches every image/video/audio inside `.mes_block` and triggers an additional bottom-scroll once they finish loading — keeps the latest message visible after media expands the layout.

**Returns:** none.

#### `cancelDebouncedChatSave() → void`

Cancel any pending debounced `saveChat` invocation. Called automatically by `clearChat`; rarely needed directly.

**Returns:** none.

---

### Macros / substitution

Both of these are documented in detail in `CLAUDE.md` § Template Substitution.

#### `substituteParams(content, options = {}) → string`

Modern signature. Legacy positional calls are auto-rerouted to `substituteParamsLegacy`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `content` | `string` | — | The string to substitute parameters in. Falsy → returns `''`. |
| `options.name1Override` | `string` | `undefined` | Override for the user name. |
| `options.name2Override` | `string` | `undefined` | Override for the character name. |
| `options.original` | `string` | `undefined` | The original message for `{{original}}` substitution. |
| `options.groupOverride` | `string` | `undefined` | Group members list for `{{group}}` substitution. |
| `options.replaceCharacterCard` | `boolean` | `true` | Whether to expose character card macros (`{{description}}`, etc.). |
| `options.dynamicMacros` | `Record<string, any>` | `{}` | Additional environment variables. Values may be functions for lazy evaluation. |
| `options.postProcessFn` | `(x: string) => string` | `x => x` | Post-processing function applied to each substituted macro. |

**Returns:** `string` — content with macros substituted.

#### `substituteParamsExtended(content, additionalMacro = {}, postProcessFn = x => x) → string` *(deprecated)*

Thin wrapper: `substituteParams(content, { dynamicMacros: additionalMacro, postProcessFn })`. Kept for compatibility with older extensions.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `content` | `string` | — | The string to substitute parameters in. |
| `additionalMacro` | `Record<string, any>` | `{}` | Extra dynamic macros. |
| `postProcessFn` | `(x: string) => string` | `x => x` | Post-processing function. |

**Returns:** `string` — content with macros substituted.

---

### Auth / network

#### `getRequestHeaders({ omitContentType = false } = {}) → Record<string, string>`

```js
fetch('/api/things', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({ thing: 1 }),
});
```

Returns `{ 'Content-Type': 'application/json', 'X-CSRF-Token': token }`. Pass `omitContentType: true` when sending `FormData` (so the browser can set its own multipart boundary). See `CLAUDE.md` § Making Authenticated Server Requests.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `options.omitContentType` | `boolean` | `false` | If `true`, omit the `Content-Type` header (use for `FormData` uploads). |

**Returns:** `Record<string, string>` — headers object suitable for `fetch`.

---

### Constants & state

#### `chat: ChatMessage[]` *(mutable array)*

Live reference to the current chat's message array. Mutate in place (`chat.push`, `chat.splice`) — do not reassign. The same array is reachable via `SillyTavern.getContext().chat`.

#### `chat_metadata: object` *(mutable object — but see note)*

The current chat's metadata. Note: `clearChat` and chat switches replace this object entirely, so caching it long-term across `CHAT_CHANGED` events is unsafe. Prefer `SillyTavern.getContext().chatMetadata`, which always returns the current binding.

#### `this_chid: string | undefined`

Index into `characters[]` for the selected solo character, **stored as a string** (or `undefined` when nothing is selected, or in a group chat). Use `setCharacterId(value)` to write — it coerces numbers/objects appropriately.

#### `characters: Character[]` *(mutable array)*

The full list of loaded character cards, in display order. Replaced in place by `getCharacters` (`splice(0, length, ...)`).

#### `chatElement: JQuery<HTMLElement>`

Cached `$('#chat')` reference.

#### `systemUserName: string` / `neutralCharacterName: string` *(const)*

`'SillyTavern System'` and `'Assistant'` respectively — used as `name2` for system/welcome and neutral chats.

#### `default_avatar: string` / `system_avatar: string` / `comment_avatar: string` / `default_user_avatar: string` *(const)*

Built-in avatar image paths: `img/ai4.png`, `img/five.png`, `img/quill.png`, `img/user-default.png`.

#### `isGenerating(): boolean` *(function getter)*

> Despite the export list naming it as a constant, `isGenerating` is an **arrow function**: `() => (is_send_press || is_group_generating)`. Call it as `isGenerating()`. The boolean it returns is also exposed as `context.isGenerating` (boolean) on `SillyTavern.getContext()`.

**Returns:** `boolean` — `true` while solo or group generation is in flight.

#### `saveSettingsDebounced()` / `saveCharacterDebounced()` / `printCharactersDebounced()` *(debounced functions)*

Lodash-style debounced wrappers around `saveSettings`, the `#create_button` click handler, and `printCharacters(false)`. Default debounce: `debounce_timeout.relaxed` for saves, `debounce_timeout.quick` for printing.

#### `CLIENT_VERSION: string` *(const)*

The Horde User-Agent / client identifier (e.g. `'SillyTavern:1.13.x:Cohee#1207'`). Populated by `getClientVersion()` at boot, defaulting to `'SillyTavern:UNKNOWN:Cohee#1207'`.

#### `talkativeness_default: number` / `depth_prompt_depth_default: number` / `depth_prompt_role_default: string` *(const)*

Defaults applied to character cards when those optional fields are missing: `0.5`, `4`, `'system'`.

---

## See also

- [../guides/inject-into-prompts.md](../guides/inject-into-prompts.md) — Practical recipes for `setExtensionPrompt`.
- [../guides/generate-llm-responses.md](../guides/generate-llm-responses.md) — `generateRaw` / `generateQuietPrompt` patterns.
- [tokenizers.md](tokenizers.md) — `getTokenCountAsync`, `tokenizers`.
- [extensions.md](extensions.md) — `renderExtensionTemplateAsync`, extension lifecycle.
- `/home/user/SillyTavern/CLAUDE.md` — Project-level extension development guide.

---

## Notes

The following names appeared in the requested export list but **do not exist** as exports in the current `public/script.js`, so they have been omitted from this reference:

- `reRenderMessage` — not exported by `script.js`. The closest equivalents are `updateMessageBlock` (re-render content of an existing message) and `updateMessageElement` (rebuild a full message element). Some extensions define a local `reRenderMessage` helper; it is not a public API.
