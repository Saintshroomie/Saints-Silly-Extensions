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

#### `generateRawData(params) → Promise<object | string>`

Same parameters as `generateRaw` minus `trimNames`. Returns the raw backend response object (or a JSON string when `jsonSchema` is set) without `cleanUpMessage` post-processing — useful when you need access to reasoning content, finish reasons, or other API metadata.

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

#### `getStoppingStrings(isImpersonate, isContinue, api = main_api) → string[]`

Returns the array of stopping strings appropriate for the current API. For OpenAI/chat-completion APIs this returns only user-defined custom stops; for text completion it also includes `\nName:` style stops, group-member names, and any instruct-mode sequences.

#### `extractMessageBias(message) → string`

Compiles `message` as a Handlebars template with a `{{bias "..."}}` helper and returns the concatenated bias text (prefixed with a space) or `''` if none. Used by ST to pull `{{bias}}` macros out of a user message before sending.

#### `processCommands(message) → Promise<boolean>`

If `message` begins with `/`, runs it through `executeSlashCommandsOnChatInput` (which clears the chat input). Returns `true` if a command was executed (and therefore "send" should be considered interrupted), `false` otherwise.

#### `sendGenerationRequest(type, data, options = {}) → Promise<object>`

Low-level: send a **non-streaming** request to whichever backend is currently active. For `openai` it routes to `sendOpenAIRequest`; for `koboldhorde` to `generateHorde`; otherwise it POSTs `data` to `getGenerateUrl(main_api)` with the global `abortController.signal`. Most extensions should use `generateRaw` / `generateQuietPrompt` instead — this is for advanced use only. Throws the parsed error body on non-OK responses.

#### `sendStreamingRequest(type, data, options = {}) → Promise<any>`

Streaming counterpart of `sendGenerationRequest`. Requires `streamingProcessor` to already exist (i.e. called from within `Generate`). Returns an async generator. Throws if the active API does not support streaming.

#### `shouldAutoContinue(messageChunk, isImpersonate) → boolean`

Returns `true` only if all of the following hold: auto-continue is enabled, the chunk is a non-empty string, no impersonation, generation isn't already in flight or aborted, the textarea is empty, the API allows it, and the last message has fewer tokens than the configured target length.

#### `triggerAutoContinue(messageChunk, isImpersonate) → void`

If not in a group chat and `shouldAutoContinue` is true, fires a click on `#option_continue`.

#### `stopGeneration() → boolean`

Aborts the active stream (if any) and the global `abortController`, hides the stop button, and emits `event_types.GENERATION_STOPPED`. Returns `true` if anything was actually stopped.

#### `isStreamingEnabled() → boolean`

Returns whether the active `main_api` and its preset have streaming turned on (and the connection supports it). Note: OpenAI o1 models are explicitly excluded even if `stream_openai` is true.

#### `startStatusLoading() / stopStatusLoading() → void`

Show/hide the `.api_loading` spinner and toggle the `disabled` class on `.api_button` elements. Use sparingly — typically only when probing an API connection on your own.

#### `pingServer() → Promise<boolean>`

POSTs to `api/ping` with the CSRF header (no body). Returns `true` on a 2xx response, `false` otherwise (including network errors).

#### `deactivateSendButtons() → void`

Switches the UI into the "generating" state: shows the stop button, hides swipe buttons, and sets `document.body.dataset.generating = 'true'`. Pair with `activateSendButtons` in a `finally` block when running multi-step pipelines (see `CLAUDE.md` § Multi-Step LLM Pipelines).

#### `activateSendButtons() → void`

Restores the normal UI: clears `is_send_press`, hides the stop button, shows swipe buttons, and removes `document.body.dataset.generating`.

---

### Context & token budgets

#### `getMaxContextSize() → number` *(deprecated alias)*

Re-export of `getMaxPromptTokens` kept for compatibility. New code should call `getMaxPromptTokens` directly.

#### `getMaxContextTokens() → number`

Total context window for the active API:
- `kobold` / `koboldhorde` / `textgenerationwebui`: `max_context`
- `novel`: clamped to model-specific caps (8192 for clio/kayra/erato, minus subscription/special-token adjustments)
- `openai`: `oai_settings.openai_max_context`
- otherwise: `1487` (legacy default)

#### `getMaxResponseTokens() → number`

Configured response/generation length: `amount_gen` for KAI/TextGen/Novel, `oai_settings.openai_max_tokens` for OpenAI, else `0`.

#### `getMaxPromptTokens(overrideResponseLength = null) → number`

`getMaxContextTokens() - (overrideResponseLength || getMaxResponseTokens())`. The recommended call when an extension needs to know how much room a prompt has.

---

### Prompt injection

#### `setExtensionPrompt(key, value, position, depth, scan = false, role = SYSTEM, filter = null) → void`

```js
setExtensionPrompt('myExt_facts', factsText, extension_prompt_types.IN_CHAT, 4, false, extension_prompt_roles.SYSTEM);
// Remove:
setExtensionPrompt('myExt_facts', '', extension_prompt_types.NONE, 0);
```

Registers (or overwrites) an injection slot under `key`. `value` is coerced to a string. `filter`, if provided, is an `() => Promise<boolean>|boolean` predicate evaluated each time the injection is collected — return `false` to skip this injection on that build. See [../guides/inject-into-prompts.md](../guides/inject-into-prompts.md) and `CLAUDE.md` § Extension Prompt Injection.

#### `getExtensionPrompt(position = IN_PROMPT, depth, separator = '\n', role, wrap = true) → Promise<string>`

Resolve and join all extension prompts matching the given position (and optionally depth/role). Result is wrapped with the separator on both ends when `wrap` is true. The combined string is then run through `substituteParams`. `undefined` for `depth`/`role` matches any value.

#### `getExtensionPromptByName(moduleName) → Promise<string>`

Lookup a single injection by exact key. Returns `''` if missing or if the `filter` returns falsy. Result is run through `substituteParams`.

#### `getExtensionPromptMaxDepth() → number`

Returns `MAX_INJECTION_DEPTH` (`10000`). The internal `doChatInject` loop iterates `0..maxDepth` to place IN_CHAT injections.

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

#### `updateMessageBlock(messageId, message, { rerenderMessage = true } = {}) → void`

Update just the contents of an existing message element. When `rerenderMessage` is true (default), reruns `messageFormatting` on `message.extra?.display_text ?? message.mes` and writes it into `.mes_text`. Also refreshes reasoning UI, code-block copy buttons, and media.

#### `updateMessageElement(mes, { messageId, messageElement, adjustMediaScroll } = {}) → JQuery<HTMLElement>`

Builds a fully-populated message element from a `mes` object — avatar, timestamp, name, mesIDDisplay, token count, timer, bias, reasoning, media, swipe counter. If `messageElement` is omitted a fresh clone of the message template is used. The element is **returned but not appended** — callers do the DOM insertion.

#### `addOneMessage(mes, { type, insertAfter, scroll = true, insertBefore, forceId, showSwipes = true } = {}) → JQuery<HTMLElement>`

Append (or insert) a single message into the chat DOM. The caller must have already pushed `mes` onto `chat[]`. `type === 'swipe'` performs in-place update of the existing element rather than appending. Returns the resulting element.

#### `deleteMessage(id, swipeDeletionIndex = undefined, askConfirmation = false) → Promise<void>`

Delete the message at chat index `id`. If `swipeDeletionIndex` is a number, only that swipe variant is removed (via `deleteSwipe`). When `askConfirmation` is true, shows a confirm popup with separate "Delete Swipe"/"Delete Message" buttons. Emits `MESSAGE_DELETED` with the **resulting** chat length.

#### `deleteLastMessage() → Promise<void>`

Pop the last message off `chat[]` and remove its DOM element. Emits `MESSAGE_DELETED`.

#### `clearChat({ clearData = false } = {}) → Promise<void>`

Visually clears the chat container, closes any active edit, flushes `extension_prompts`, and saves itemized-prompt state. With `clearData: true` it also truncates `chat[]` to length 0.

#### `replaceCurrentChat() → Promise<void>`

After a chat is deleted, picks the next-most-recent chat file for the current character (or creates a new one), updates `characters[this_chid].chat`, and calls `getChat()`.

#### `reloadCurrentChatUnsafe() → Promise<void>` / `reloadCurrentChat() → Promise<void>`

`reloadCurrentChatUnsafe` performs `clearChat({ clearData: true })` and then loads the appropriate chat (group or solo). Always prefer **`reloadCurrentChat`**, which routes through `reloadChatMutex` (a `SimpleMutex`) so that concurrent reloads are serialized.

#### `showMoreMessages(messagesToLoad = null) → Promise<void>`

Prepend a batch of older messages above the currently displayed ones (used by the "Show more messages" button). The batch size defaults to `power_user.chat_truncation`. Emits `MORE_MESSAGES_LOADED`.

#### `printMessages() → Promise<void>`

Initial render after a chat is loaded — calls `redisplayChat`, scrolls to bottom, and schedules `scrollOnMediaLoad`.

#### `sendTextareaMessage() → Promise<any>`

Send whatever is in `#send_textarea`. If the textarea is empty and the last message is from a character (and `continue_on_send` is set), this becomes a continue. If no character is selected and the textarea is non-empty, a temporary "Assistant" chat is created first.

#### `messageFormatting(mes, ch_name, isSystem, isUser, messageId, sanitizerOverrides = {}, isReasoning = false) → string`

Run a raw message string through ST's full formatting pipeline: regex scripts, prompt-bias stripping, macro substitution, markdown (Showdown), DOMPurify sanitization, etc. Returns the final HTML string. Available on the context object as `context.messageFormatting` as well.

#### `appendMediaToMessage(mes, messageElement, scrollBehavior = SCROLL_BEHAVIOR.ADJUST) → void`

Render image/file attachments from `mes.extra.media` / `mes.extra.files` into the supplied jQuery message element. `scrollBehavior` is one of `SCROLL_BEHAVIOR.NONE | KEEP | ADJUST`. Migrates legacy single-media properties to arrays on first encounter.

#### `addCopyToCodeBlocks(messageElement) → void`

For every `<pre><code>` inside the supplied element, run `hljs.highlightElement` and append a clickable copy icon that writes the block's text to the clipboard.

#### `getNextMessageId(type) → number`

Returns `chat.length - 1` for `'swipe'` generations (which overwrite the current last message) or `chat.length` otherwise.

---

### Characters & entity helpers

#### `setActiveCharacter(entityOrKey) → void`

Sets the "active character" used by the entity-list filter UI (sidebar highlight). Accepts either an entity object (with `.id`), a numeric id, or a tag-key string. Setting a character clears any active group.

#### `setActiveGroup(entityOrKey) → void`

Mirror of `setActiveCharacter` for groups. Setting an active group clears any active character.

#### `selectCharacterById(id, { switchMenu = true } = {}) → Promise<void>`

Switch the UI to a different character by chid (numeric index in `characters[]`, **not** the avatar key). No-op if the chat is currently saving or a group generation is in progress. When `switchMenu` is true and the character is already selected, this also opens the character-edit menu.

#### `printCharacters(fullRefresh = false) → Promise<void>`

Re-render the character list panel. Pass `true` to force a complete redraw rather than a diffed update.

#### `printCharactersDebounced` *(const)*

`debounce(() => printCharacters(false), DEFAULT_PRINT_TIMEOUT)`. Prefer this when reprinting is a side-effect rather than the primary action.

#### `getOneCharacter(avatarUrl) → Promise<void>`

POSTs to `/api/characters/get` for a single avatar and replaces its entry in `characters[]`. Used after editing a single card to avoid reloading the whole list.

#### `getCharacters() → Promise<void>`

POSTs to `/api/characters/all`, replaces `characters[]`, then calls `getGroups()` and `printCharacters(true)`. If the previously selected character no longer exists, shows an error popup and reloads the page.

#### `characterToEntity(character, id) → Entity`

`{ item: character, id, type: 'character' }`.

#### `groupToEntity(group) → Entity`

`{ item: group, id: group.id, type: 'group' }`.

#### `tagToEntity(tag) → Entity`

`{ item: structuredClone(tag), id: tag.id, type: 'tag', entities: [] }`.

#### `getEntitiesList({ doFilter = false, doSort = true } = {}) → Entity[]`

Build the unified list of characters + groups + (when `bogus_folders` is enabled) tag-folders. With `doFilter`, the global filter UI is applied (tag filter, search, etc.). Used by the character-list renderer.

#### `getOneCharacter` — see above.

#### `getCharacterSource(chId = this_chid) → string`

Return the source URL for the character card if its extensions metadata advertises one — checks (in order) `chub.full_path`, `pygmalion_id`, `github_repo`. Returns `''` if none.

#### `getCharacterAvatar(characterId) → string`

Returns the thumbnailed avatar URL for the given chid, or `default_avatar` if the character has no avatar.

#### `formatCharacterAvatar(characterAvatar) → string`

Simple prefix: `` `characters/${characterAvatar}` ``.

#### `deleteCharacterChatByName(characterId, fileName) → Promise<void>`

Delete a single chat file (passed without the `.jsonl` extension) belonging to the given character. If the deleted chat is the currently active one for that character, the next-most-recent chat is selected. First calls `unshallowCharacter` so the full card is loaded.

---

### Character card fields

#### `getCharacterCardFields({ chid = undefined } = {}) → CharacterCardFields`

Eagerly resolved card fields for the chosen character (defaults to `this_chid`): `system`, `mesExamples`, `description`, `personality`, `persona`, `scenario`, `jailbreak`, `version`, `charDepthPrompt`, `creatorNotes`, `firstMessage`, `alternateGreetings`. Each text field is run through `baseChatReplace` (macros + newline-collapse). In group chats, `description`/`personality`/`scenario`/`mesExamples` may come from the group card layer.

#### `getCharacterCardFieldsLazy({ chid = undefined } = {}) → CharacterCardFields`

Same fields, but built with `createLazyFields` — each field is only computed on first access. Use this when you only need one or two fields and want to avoid the cost of substituting macros across the entire card.

#### `createLazyFields(resolvers) → object`

```js
const fields = createLazyFields({
    description: () => baseChatReplace(card.description),
    persona: () => baseChatReplace(power_user.persona_description),
});
fields.description; // resolver called once and memoized
```

Generic helper that creates an object whose properties are getters wrapping memoized resolver functions.

#### `parseMesExamples(examplesStr, isInstruct) → string[]`

Split a character's `mes_example` string on `<START>` delimiters into an array of example blocks, each prefixed with the configured example separator (`<START>` for OpenAI/instruct, `power_user.context.example_separator` otherwise).

#### `baseChatReplace(value, name1Override = null, name2Override = null) → string`

Pipeline used to process card fields: `substituteParams(value, { name1Override, name2Override, replaceCharacterCard: false })`, optional `collapseNewlines` (when `power_user.collapse_newlines` is on), and CR stripping. Returns `value` unchanged if it's not a non-empty string.

#### `removeMacros(str) → string`

Strip every `{{...}}` substring (greedy, multi-line aware) and `.trim()`. Used when a card field needs to be stored or compared without macro placeholders.

---

### Chat navigation & save

#### `getCurrentChatId() → string | undefined`

The current chat file id — `groups.find(g => g.id == selected_group)?.chat_id` for a group, or `characters[this_chid]?.chat` for a solo chat. `undefined` when nothing is selected.

#### `scrollChatToBottom({ waitForFrame } = {}) → void`

Scrolls the `#chat` container to the bottom (or, in waifu mode, just past the last `.mes`). No-op when `power_user.auto_scroll_chat_to_bottom` is disabled. With `waitForFrame: true` the scroll happens inside `requestAnimationFrame` to avoid layout thrashing.

#### `scrollOnMediaLoad() → void`

Watches every image/video/audio inside `.mes_block` and triggers an additional bottom-scroll once they finish loading — keeps the latest message visible after media expands the layout.

#### `cancelDebouncedChatSave() → void`

Cancel any pending debounced `saveChat` invocation. Called automatically by `clearChat`; rarely needed directly.

---

### Macros / substitution

Both of these are documented in detail in `CLAUDE.md` § Template Substitution.

#### `substituteParams(content, options = {}) → string`

Modern signature. Options: `name1Override`, `name2Override`, `original`, `groupOverride`, `replaceCharacterCard` (default `true`), `dynamicMacros` (object of `{ name: value | () => value }`), `postProcessFn`. Legacy positional calls are auto-rerouted to `substituteParamsLegacy`.

#### `substituteParamsExtended(content, additionalMacro = {}, postProcessFn = x => x) → string` *(deprecated)*

Thin wrapper: `substituteParams(content, { dynamicMacros: additionalMacro, postProcessFn })`. Kept for compatibility with older extensions.

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

---

### Constants & state

#### `chat` *(mutable array)*

Live reference to the current chat's message array. Mutate in place (`chat.push`, `chat.splice`) — do not reassign. The same array is reachable via `SillyTavern.getContext().chat`.

#### `chat_metadata` *(mutable object — but see note)*

The current chat's metadata. Note: `clearChat` and chat switches replace this object entirely, so caching it long-term across `CHAT_CHANGED` events is unsafe. Prefer `SillyTavern.getContext().chatMetadata`, which always returns the current binding.

#### `this_chid` *(string | undefined)*

Index into `characters[]` for the selected solo character, **stored as a string** (or `undefined` when nothing is selected, or in a group chat). Use `setCharacterId(value)` to write — it coerces numbers/objects appropriately.

#### `characters` *(mutable array)*

The full list of loaded character cards, in display order. Replaced in place by `getCharacters` (`splice(0, length, ...)`).

#### `chatElement` *(JQuery<HTMLElement>)*

Cached `$('#chat')` reference.

#### `systemUserName` / `neutralCharacterName` *(const string)*

`'SillyTavern System'` and `'Assistant'` respectively — used as `name2` for system/welcome and neutral chats.

#### `default_avatar` / `system_avatar` / `comment_avatar` / `default_user_avatar` *(const string)*

Built-in avatar image paths: `img/ai4.png`, `img/five.png`, `img/quill.png`, `img/user-default.png`.

#### `isGenerating()` *(function getter)*

> Despite the export list naming it as a constant, `isGenerating` is an **arrow function**: `() => (is_send_press || is_group_generating)`. Call it as `isGenerating()`. The boolean it returns is also exposed as `context.isGenerating` (boolean) on `SillyTavern.getContext()`.

#### `saveSettingsDebounced()` / `saveCharacterDebounced()` / `printCharactersDebounced()` *(debounced functions)*

Lodash-style debounced wrappers around `saveSettings`, the `#create_button` click handler, and `printCharacters(false)`. Default debounce: `debounce_timeout.relaxed` for saves, `debounce_timeout.quick` for printing.

#### `CLIENT_VERSION` *(const string)*

The Horde User-Agent / client identifier (e.g. `'SillyTavern:1.13.x:Cohee#1207'`). Populated by `getClientVersion()` at boot, defaulting to `'SillyTavern:UNKNOWN:Cohee#1207'`.

#### `talkativeness_default` / `depth_prompt_depth_default` / `depth_prompt_role_default` *(const)*

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
