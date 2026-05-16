# st-context.js

Builds and returns the SillyTavern **context object** — the single facade that exposes chat state, characters, generation primitives, event hooks, slash-command APIs, popup helpers, world info, variables, and more to extensions.

**Import path from a third-party extension:**

```js
import { getContext } from '../../../st-context.js';
// or, equivalently:
import getContext from '../../../st-context.js';
```

In practice, extensions almost never import this file. The same `getContext` function is reachable on the global `SillyTavern` namespace:

```js
const context = SillyTavern.getContext();
```

Both calls return the **same** object — there is no separate "extension context" vs. "global context". `SillyTavern.getContext` is set up during ST's boot sequence and simply forwards to the function exported here.

## Exports at a glance

| Export | Kind | Summary |
|--------|------|---------|
| `getContext()` | function (named + default) | Returns the live ST context object |

## Reference

### `getContext() → Context`

Constructs and returns a fresh context object on each call. The object is **not** cached — it captures the current values of `name1`, `name2`, `this_chid`, `selected_group`, `online_status`, etc., at call time, so always re-call before reading time-sensitive properties:

```js
function onChatChanged() {
    const ctx = SillyTavern.getContext();  // fresh, post-switch
    console.log('Now in chat', ctx.chatId);
}
```

The returned object aggregates:

- **Chat state**: `chat`, `chatId`, `chatMetadata`, `characters`, `characterId`, `groupId`, `groups`, `name1`, `name2`, `menuType`, `mainApi`, `onlineStatus`, `maxContext`.
- **Persistence**: `extensionSettings`, `saveSettingsDebounced`, `saveMetadata`, `saveMetadataDebounced`, `saveChat`, `saveReply`, `updateChatMetadata`.
- **Generation**: `generate` (the `Generate` function), `generateRaw`, `generateRawData`, `generateQuietPrompt`, `sendStreamingRequest`, `sendGenerationRequest`, `stopGeneration`, `streamingProcessor`, `ChatCompletionService`, `TextCompletionService`, `ConnectionManagerRequestService`.
- **Events**: `eventSource`, `eventTypes` (also legacy alias `event_types`). See [events.md](./events.md).
- **Prompts & macros**: `setExtensionPrompt`, `extensionPrompts`, `substituteParams`, `substituteParamsExtended`, `macros`.
- **Slash commands**: `SlashCommandParser`, `SlashCommand`, `SlashCommandArgument`, `SlashCommandNamedArgument`, `SlashCommandEnumValue`, `ARGUMENT_TYPE`, `executeSlashCommandsWithOptions`.
- **Tokens**: `tokenizers`, `getTextTokens`, `getTokenCountAsync`, `getTokenizerModel`.
- **UI**: `Popup`, `POPUP_TYPE`, `POPUP_RESULT`, `callGenericPopup`, `loader`, `activateSendButtons`, `deactivateSendButtons`, `messageFormatting`, `updateMessageBlock`, `addOneMessage`, `printMessages`, `clearChat`, `scrollChatToBottom`.
- **Swipes**: `swipe.{left, right, to, show, hide, refresh, isAllowed, state}`.
- **Variables**: `variables.{local,global}.{get, set, del, add, inc, dec, has}`.
- **World info**: `loadWorldInfo`, `saveWorldInfo`, `reloadWorldInfoEditor`, `updateWorldInfoList`, `getWorldInfoPrompt`, `getWorldInfoNames`, `convertCharacterBook`.
- **Tools**: `registerFunctionTool`, `unregisterFunctionTool`, `isToolCallingSupported`, `canPerformToolCalls`, `ToolManager`.
- **Templates / extensions**: `renderExtensionTemplateAsync`, `getExtensionManifest`, `openThirdPartyExtensionMenu`, `writeExtensionField`, `writeExtensionFieldBulk`. See [extensions.md](./extensions.md).
- **Misc**: `t`, `translate`, `getCurrentLocale`, `addLocaleData`, `uuidv4`, `timestampToMoment`, `humanizedDateTime`, `isMobile`, `shouldSendOnEnter`, `tags`, `tagMap`, `importTags`, `getThumbnailUrl`, `selectCharacterById`, `getCharacters`, `getOneCharacter`, `getCharacterCardFields`, `getCharacterSource`, `unshallowCharacter`, `unshallowGroupMembers`.
- **Sentinels**: `symbols.ignore` (re-exports `IGNORE_SYMBOL` from [constants.js](./constants.md)), `constants.unset` (re-exports `UNSET_VALUE` from [extensions.js](./extensions.md)).

For the full per-property reference — including which properties are deprecated, parameter shapes, and idiomatic usage — see the [project CLAUDE.md "The SillyTavern Context API"](../../../CLAUDE.md) section, which is the canonical narrative documentation.

### Deprecations to be aware of

The context object intentionally keeps several long-deprecated members alive for compatibility. Avoid in new code:

- `registerSlashCommand` → use `SlashCommandParser.addCommandObject(SlashCommand.fromProps(...))`
- `executeSlashCommands` → use `executeSlashCommandsWithOptions`
- `registerHelper` → no-op stub; Handlebars helpers for extensions are no longer supported
- `registerMacro` / `unregisterMacro` → use `macros.register(...)` / `macros.registry.unregisterMacro(...)`
- `renderExtensionTemplate` → use `renderExtensionTemplateAsync`
- `callPopup` → use `callGenericPopup` or `Popup`
- `showLoader` / `hideLoader` → use `loader.show` / `loader.hide`
- `getTokenCount` (sync) → use `getTokenCountAsync`
- `event_types` (snake_case alias) → use `eventTypes`

### Default export

`getContext` is also the module's default export, so either of these works:

```js
import { getContext } from '../../../st-context.js';
import getContext from '../../../st-context.js';
```
