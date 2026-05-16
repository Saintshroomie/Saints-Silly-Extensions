# chats.js

Utilities for managing chat messages, file attachments, the Data Bank, sanitization helpers, and the "neutral" (characterless) chat state.

**Import path from a third-party extension:**

```js
import {
    hideChatMessageRange,
    populateFileAttachment,
    getDataBankAttachments,
    encodeStyleTags,
    decodeStyleTags,
    formatCreatorNotes,
    preserveNeutralChat,
    restoreNeutralChat,
    registerFileConverter,
} from '../../../chats.js';
```

## Exports at a glance

| Export | Kind | Summary |
|--------|------|---------|
| `hideChatMessageRange` | async fn | Hide or unhide a range of chat messages (toggle `is_system`). |
| `hideChatMessage` | async fn | Deprecated single-message wrapper around `hideChatMessageRange`. |
| `unhideChatMessage` | async fn | Deprecated single-message unhide wrapper. |
| `populateFileAttachment` | async fn | Reads files from a `<input type="file">` and attaches them to a message. |
| `uploadFileAttachment` | async fn | Uploads base64-encoded file data to `/api/files/upload`. |
| `getFileAttachment` | async fn | Downloads a previously uploaded file as text. |
| `hasPendingFileAttachment` | fn | Returns `true` if the send-form file input has selected files. |
| `appendFileContent` | async fn | Prepends a message's attached file text(s) to the message text. |
| `uploadFileAttachmentToServer` | async fn | Validates, converts, uploads a `File`, and registers it with a Data Bank source. |
| `deleteAttachment` | async fn | Removes an attachment from its Data Bank source (with confirm). |
| `deleteMediaFromServer` | async fn | DELETE-style call to `/api/images/delete`. |
| `deleteFileFromServer` | async fn | DELETE-style call to `/api/files/delete`. |
| `getDataBankAttachments` | fn | Returns all Data Bank attachments visible in the current context. |
| `getDataBankAttachmentsForSource` | fn | Returns attachments for a single source (global/chat/character). |
| `isExternalMediaAllowed` | fn | Whether external media (URLs) is allowed for the current entity. |
| `encodeStyleTags` | fn | Encodes `<style>` blocks in message text so they survive sanitization. |
| `decodeStyleTags` | fn | Decodes and prefix-scopes the encoded style blocks. |
| `getCurrentEntityId` | fn | Group id or character avatar id for the currently selected entity. |
| `formatCreatorNotes` | fn | Markdown -> sanitized HTML for character creator notes. |
| `preserveNeutralChat` | fn | Stashes the "no character selected" chat in sessionStorage. |
| `restoreNeutralChat` | fn | Restores a stashed neutral chat. |
| `registerFileConverter` | fn | Register a function that converts a MIME type to plain text on upload. |
| `addDOMPurifyHooks` | fn | Installs the built-in DOMPurify hooks (called once at startup). |
| `initChatUtilities` | fn | Wires DOM event handlers for chat utilities (called once at startup). |

## Reference

### Message visibility

#### `hideChatMessageRange(start, end, unhide, nameFitler?) → Promise<void>`

Hides (`unhide=false`) or unhides (`unhide=true`) every message in the inclusive index range. Sets `is_system` on each message, mirrors the `is_system` attribute on the rendered `.mes` blocks, refreshes swipe buttons, and saves the chat. If `nameFitler` (sic) is set, only messages with that `name` are affected. If `end` is falsy, only `start` is toggled.

#### `hideChatMessage(messageId, _messageBlock) → Promise<void>`

**Deprecated.** Hide a single message; thin wrapper around `hideChatMessageRange(messageId, messageId, false)`.

#### `unhideChatMessage(messageId, _messageBlock) → Promise<void>`

**Deprecated.** Unhide a single message; thin wrapper around `hideChatMessageRange(messageId, messageId, true)`.

### File attachments

#### `populateFileAttachment(message, inputId?) → Promise<void>`

Reads files from the `<input type="file">` identified by `inputId` (default `'file_form_input'`), uploads each, and pushes attachment metadata onto `message.extra.files`. Intended for the active message being sent.

#### `uploadFileAttachment(fileName, base64Data) → Promise<string|undefined>`

POSTs `{ name, data }` to `/api/files/upload` and returns the resulting server path. Shows a toast on failure.

#### `getFileAttachment(url) → Promise<string|undefined>`

GETs a previously uploaded file (uses `cache: 'force-cache'`) and returns its text contents.

#### `hasPendingFileAttachment() → boolean`

`true` when the `#file_form_input` element currently has selected files.

#### `appendFileContent(message, messageText) → Promise<string>`

Resolves the text content of any files in `message.extra.files` (downloading if `file.text` is missing) and returns the concatenation `fileTexts + '\n\n' + messageText`. Also writes `message.extra.fileLength` so the prefix can be stripped back out later.

#### `uploadFileAttachmentToServer(file, target) → Promise<string|undefined>`

Validates, converts (using a registered converter if one matches the MIME type) and uploads a single `File`, then appends an attachment descriptor to one of the Data Bank source arrays. `target` is one of the `ATTACHMENT_SOURCE` constants — `'global'`, `'chat'`, or `'character'`. Returns the uploaded file URL.

### Data Bank

#### `getDataBankAttachments(includeDisabled?) → FileAttachment[]`

Returns the merged list of global + chat + character attachments. Disabled attachments are excluded by default.

#### `getDataBankAttachmentsForSource(source, includeDisabled?) → FileAttachment[]`

Returns attachments from one specific source (`'global'`, `'chat'`, or `'character'`). Disabled attachments are **included** by default — pass `false` to filter them out.

#### `deleteAttachment(attachment, source, callback, confirm?) → Promise<void>`

Removes the attachment from its source array and invokes `callback`. If `confirm` (default `true`), shows a generic confirmation popup first.

#### `deleteFileFromServer(url, silent?) → Promise<boolean>`

POSTs to `/api/files/delete` and emits `event_types.FILE_ATTACHMENT_DELETED`. Returns `true` on success.

#### `deleteMediaFromServer(url, silent?) → Promise<boolean>`

POSTs to `/api/images/delete` and emits `event_types.MEDIA_ATTACHMENT_DELETED`.

### Formatting & sanitization

#### `encodeStyleTags(text) → string`

Replaces every `<style>...</style>` with `<custom-style>encodeURIComponent(...)</custom-style>` so the inner CSS survives `DOMPurify.sanitize`. Pair with `decodeStyleTags`.

#### `decodeStyleTags(text, { prefix }?) → string`

Reverses `encodeStyleTags`, parses the CSS with a stylesheet AST, prefixes every selector (default prefix `'.mes_text '`), rewrites bare class names to a `custom-` prefix, and (when `isExternalMediaAllowed()` is false) drops declarations that contain URLs.

#### `formatCreatorNotes(text, avatarId) → string`

Renders Markdown creator notes through the Showdown converter, then through `encodeStyleTags` → `DOMPurify.sanitize` → `decodeStyleTags`. Honors a per-character "Allow Global Styles" preference stored in account storage.

#### `addDOMPurifyHooks() → void`

Installs the global DOMPurify hooks (auto-`target="_blank"` for links, custom attribute filters, etc.). Called once at startup; extensions normally don't need this.

### Neutral chat

#### `preserveNeutralChat() → void`

If the current chat is the "no character selected" placeholder, stashes `{ chat, chat_metadata }` into `sessionStorage` under the neutral-chat key. No-op otherwise.

#### `restoreNeutralChat() → void`

Companion to `preserveNeutralChat`. Splices the stashed data back into the live `chat` array and clears the sessionStorage entry.

### Misc

#### `getCurrentEntityId() → string|null`

Returns `String(selected_group)` if a group is open, otherwise the current character's `avatar` filename. `null` when nothing is selected.

#### `isExternalMediaAllowed() → boolean`

Resolves `power_user.forbid_external_media` plus the per-entity allow/forbid overrides into a final boolean. Used by `decodeStyleTags` to strip URL-bearing declarations.

#### `registerFileConverter(mimeType, converter) → void`

Registers `converter` as the handler for `mimeType`. `converter` is `(file: File) => Promise<string>` returning plain text. Re-registering an already-registered MIME logs an error and is a no-op.

```js
registerFileConverter('application/pdf', async (file) => extractText(file));
```

#### `initChatUtilities() → void`

Binds the `.mes_hide`, `.mes_unhide`, `.mes_file_delete`, `.mes_file_open` etc. click handlers on `document`. Called once during app init.
