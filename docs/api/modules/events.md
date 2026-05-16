# events.js

Defines SillyTavern's global event bus (`eventSource`) and the enum of every event name (`event_types`). Extensions subscribe here to react to chat, generation, settings, and lifecycle changes.

**Import path from a third-party extension:**

```js
import { eventSource, event_types } from '../../../events.js';
```

In practice most extensions read the same two objects from the context:

```js
const { eventSource, eventTypes } = SillyTavern.getContext();
// eventTypes === event_types
```

## Exports at a glance

| Export | Kind | Summary |
|--------|------|---------|
| `eventSource` | EventEmitter | Singleton bus on which ST emits all `event_types` events |
| `event_types` | const object | String constants for every event the app emits |

## Reference

### `eventSource`

Instance of the project's own `EventEmitter` (`public/lib/eventemitter.js`). The constructor receives a list of **sticky** event names: `APP_READY` and `APP_INITIALIZED`. A "sticky" event remembers its last fire — handlers registered after the event has already fired will be invoked immediately.

The standard API surface:

```js
eventSource.on(eventName, handler);            // subscribe
eventSource.once(eventName, handler);          // subscribe for exactly one fire
eventSource.removeListener(eventName, handler); // unsubscribe a specific handler
await eventSource.emit(eventName, ...args);    // fire (await runs handlers in registration order)
```

Notes:

- Handlers may be `async`. `emit` awaits them sequentially, so a slow handler can delay subsequent ones.
- The argument signature is **per-event**. See the CLAUDE.md event tables for the parameter contract of each event (some events pass an index, some a string, some a mutable object, some nothing).
- Always guard subscription with an existence check, since events can be added or renamed between ST versions:

```js
if (event_types.GENERATION_STARTED) {
    eventSource.on(event_types.GENERATION_STARTED, onGenStart);
}
```

### `event_types`

Frozen-in-practice enum object mapping each event's constant name (UPPER_SNAKE) to its raw string value (mostly `snake_case`, with a handful of inconsistencies — always use the constant, never the literal).

For the **prose** event reference — when each event fires, what it's typically used for, common pitfalls — see the "Event System" section in [CLAUDE.md](../../../CLAUDE.md), which documents the most important 40-odd events in narrative form.

The table below is the **machine-readable** complement: every event constant in the source, in declaration order, with its raw string value and a one-line summary.

| Constant | String value | Summary |
|----------|--------------|---------|
| `APP_INITIALIZED` | `app_initialized` | Core systems loaded; sticky |
| `APP_READY` | `app_ready` | UI fully interactive; sticky |
| `EXTRAS_CONNECTED` | `extras_connected` | Successfully connected to the Extras API |
| `MESSAGE_SWIPED` | `message_swiped` | User swiped to a different message variant |
| `MESSAGE_SENT` | `message_sent` | User message added to chat (pre-render) |
| `MESSAGE_RECEIVED` | `message_received` | LLM message added to chat (pre-render) |
| `MESSAGE_EDITED` | `message_edited` | A message was edited; param is a string ID |
| `MESSAGE_DELETED` | `message_deleted` | A message was deleted; param is the new length |
| `MESSAGE_UPDATED` | `message_updated` | Message object was updated/modified |
| `MESSAGE_FILE_EMBEDDED` | `message_file_embedded` | A file was embedded in a message |
| `MESSAGE_REASONING_EDITED` | `message_reasoning_edited` | Reasoning/thinking text was edited |
| `MESSAGE_REASONING_DELETED` | `message_reasoning_deleted` | Reasoning/thinking text was deleted |
| `MESSAGE_SWIPE_DELETED` | `message_swipe_deleted` | A swipe variant was deleted |
| `MORE_MESSAGES_LOADED` | `more_messages_loaded` | Older messages loaded via scrollback |
| `IMPERSONATE_READY` | `impersonate_ready` | Impersonated user message is ready |
| `CHAT_CHANGED` | `chat_id_changed` | Active chat switched |
| `CHAT_LOADED` | `chatLoaded` | Chat data loaded into memory (camelCase!) |
| `GENERATION_AFTER_COMMANDS` | `GENERATION_AFTER_COMMANDS` | After slash commands, before generation |
| `GENERATION_STARTED` | `generation_started` | Generation request sent |
| `GENERATION_STOPPED` | `generation_stopped` | User aborted generation |
| `GENERATION_ENDED` | `generation_ended` | Generation finished (success or failure) |
| `SD_PROMPT_PROCESSING` | `sd_prompt_processing` | Stable Diffusion prompt is being processed |
| `EXTENSIONS_FIRST_LOAD` | `extensions_first_load` | First-time extension discovery |
| `EXTENSION_SETTINGS_LOADED` | `extension_settings_loaded` | Extension settings finished loading |
| `SETTINGS_LOADED` | `settings_loaded` | App settings finished loading |
| `SETTINGS_UPDATED` | `settings_updated` | Any settings change persisted |
| `GROUP_UPDATED` | `group_updated` | Group composition or settings changed |
| `MOVABLE_PANELS_RESET` | `movable_panels_reset` | Floating panel positions reset |
| `SETTINGS_LOADED_BEFORE` | `settings_loaded_before` | Just before settings are applied |
| `SETTINGS_LOADED_AFTER` | `settings_loaded_after` | After settings fully applied |
| `CHATCOMPLETION_SOURCE_CHANGED` | `chatcompletion_source_changed` | Chat completion API source changed |
| `CHATCOMPLETION_MODEL_CHANGED` | `chatcompletion_model_changed` | Chat completion model selection changed |
| `OAI_PRESET_CHANGED_BEFORE` | `oai_preset_changed_before` | About to switch OpenAI preset |
| `OAI_PRESET_CHANGED_AFTER` | `oai_preset_changed_after` | Switched OpenAI preset |
| `OAI_PRESET_EXPORT_READY` | `oai_preset_export_ready` | OpenAI preset is ready to export |
| `OAI_PRESET_IMPORT_READY` | `oai_preset_import_ready` | OpenAI preset is ready to import |
| `WORLDINFO_SETTINGS_UPDATED` | `worldinfo_settings_updated` | World Info settings changed |
| `WORLDINFO_UPDATED` | `worldinfo_updated` | World Info entries changed |
| `CHARACTER_EDITOR_OPENED` | `character_editor_opened` | Character editor panel opened |
| `CHARACTER_EDITED` | `character_edited` | Character card saved |
| `CHARACTER_PAGE_LOADED` | `character_page_loaded` | Character page finished loading |
| `CHARACTER_GROUP_OVERLAY_STATE_CHANGE_BEFORE` | `character_group_overlay_state_change_before` | Group overlay state about to change |
| `CHARACTER_GROUP_OVERLAY_STATE_CHANGE_AFTER` | `character_group_overlay_state_change_after` | Group overlay state changed |
| `USER_MESSAGE_RENDERED` | `user_message_rendered` | User message DOM rendered |
| `CHARACTER_MESSAGE_RENDERED` | `character_message_rendered` | Character message DOM rendered |
| `FORCE_SET_BACKGROUND` | `force_set_background` | Background image programmatically set |
| `CHAT_DELETED` | `chat_deleted` | Solo chat deleted |
| `CHAT_CREATED` | `chat_created` | New solo chat created |
| `CHAT_RENAMED` | `chat_renamed` | Chat file renamed |
| `GROUP_CHAT_DELETED` | `group_chat_deleted` | Group chat deleted |
| `GROUP_CHAT_CREATED` | `group_chat_created` | New group chat created |
| `GENERATE_BEFORE_COMBINE_PROMPTS` | `generate_before_combine_prompts` | Before prompt parts are combined |
| `GENERATE_AFTER_COMBINE_PROMPTS` | `generate_after_combine_prompts` | After prompts combined (mutable) |
| `GENERATE_AFTER_DATA` | `generate_after_data` | After generation payload built (mutable) |
| `GROUP_MEMBER_DRAFTED` | `group_member_drafted` | Group member selected for next turn |
| `GROUP_WRAPPER_STARTED` | `group_wrapper_started` | Group generation cycle started |
| `GROUP_WRAPPER_FINISHED` | `group_wrapper_finished` | Group generation cycle finished |
| `WORLD_INFO_ACTIVATED` | `world_info_activated` | WI entries activated during prompt building |
| `TEXT_COMPLETION_SETTINGS_READY` | `text_completion_settings_ready` | Text completion settings loaded |
| `CHAT_COMPLETION_SETTINGS_READY` | `chat_completion_settings_ready` | Chat completion settings loaded |
| `CHAT_COMPLETION_PROMPT_READY` | `chat_completion_prompt_ready` | Final prompt array ready (mutable) |
| `CHARACTER_FIRST_MESSAGE_SELECTED` | `character_first_message_selected` | Alt greeting chosen |
| `CHARACTER_DELETED` | `characterDeleted` | Character deleted (camelCase!) |
| `CHARACTER_DUPLICATED` | `character_duplicated` | Character duplicated |
| `CHARACTER_RENAMED` | `character_renamed` | Character renamed |
| `CHARACTER_RENAMED_IN_PAST_CHAT` | `character_renamed_in_past_chat` | Character renamed in a past chat file |
| `SMOOTH_STREAM_TOKEN_RECEIVED` | `stream_token_received` | Deprecated alias for `STREAM_TOKEN_RECEIVED` |
| `STREAM_TOKEN_RECEIVED` | `stream_token_received` | Each streamed token |
| `STREAM_REASONING_DONE` | `stream_reasoning_done` | Reasoning stream portion complete |
| `FILE_ATTACHMENT_DELETED` | `file_attachment_deleted` | File attachment removed |
| `WORLDINFO_FORCE_ACTIVATE` | `worldinfo_force_activate` | Caller can push extra WI entries to activate |
| `OPEN_CHARACTER_LIBRARY` | `open_character_library` | Character library UI opened |
| `ONLINE_STATUS_CHANGED` | `online_status_changed` | API connection status changed |
| `IMAGE_SWIPED` | `image_swiped` | User swiped between images on a message |
| `CONNECTION_PROFILE_LOADED` | `connection_profile_loaded` | Connection profile loaded |
| `CONNECTION_PROFILE_CREATED` | `connection_profile_created` | Connection profile created |
| `CONNECTION_PROFILE_DELETED` | `connection_profile_deleted` | Connection profile deleted |
| `CONNECTION_PROFILE_UPDATED` | `connection_profile_updated` | Connection profile updated |
| `TOOL_CALLS_PERFORMED` | `tool_calls_performed` | Tool/function calls executed |
| `TOOL_CALLS_RENDERED` | `tool_calls_rendered` | Tool call results rendered in UI |
| `CHARACTER_MANAGEMENT_DROPDOWN` | `charManagementDropdown` | Char management dropdown action (camelCase!) |
| `SECRET_WRITTEN` | `secret_written` | A secret value was written |
| `SECRET_DELETED` | `secret_deleted` | A secret value was deleted |
| `SECRET_ROTATED` | `secret_rotated` | A secret value was rotated |
| `SECRET_EDITED` | `secret_edited` | A secret value was edited |
| `PRESET_CHANGED` | `preset_changed` | Active preset changed |
| `PRESET_DELETED` | `preset_deleted` | A preset was deleted |
| `PRESET_RENAMED` | `preset_renamed` | A preset was renamed |
| `PRESET_RENAMED_BEFORE` | `preset_renamed_before` | Preset rename about to occur |
| `MAIN_API_CHANGED` | `main_api_changed` | Main API backend changed |
| `WORLDINFO_ENTRIES_LOADED` | `worldinfo_entries_loaded` | World Info entries finished loading |
| `WORLDINFO_SCAN_DONE` | `worldinfo_scan_done` | WI keyword scan complete (mutable) |
| `MEDIA_ATTACHMENT_DELETED` | `media_attachment_deleted` | Media attachment deleted |
| `PERSONA_CHANGED` | `persona_changed` | Active user persona changed |
| `PERSONA_CREATED` | `persona_created` | A persona was created |
| `PERSONA_UPDATED` | `persona_updated` | A persona was updated |
| `PERSONA_RENAMED` | `persona_renamed` | A persona was renamed |
| `PERSONA_DELETED` | `persona_deleted` | A persona was deleted |
| `TTS_JOB_STARTED` | `tts_job_started` | A TTS synthesis job started |
| `TTS_AUDIO_READY` | `tts_audio_ready` | TTS audio is ready to play |
| `TTS_JOB_COMPLETE` | `tts_job_complete` | TTS synthesis job complete |
| `ITEMIZED_PROMPTS_LOADED` | `itemized_prompts_loaded` | Itemized prompt history loaded |
| `ITEMIZED_PROMPTS_SAVED` | `itemized_prompts_saved` | Itemized prompt history saved |
| `ITEMIZED_PROMPTS_DELETED` | `itemized_prompts_deleted` | Itemized prompt history entry deleted |

## Gotchas

### Sticky events fire late-subscribers immediately

`APP_INITIALIZED` and `APP_READY` are constructed as sticky in `new EventEmitter([...])`. If you subscribe after they've already fired (which is the common case for extensions loaded after boot), your handler runs synchronously on subscribe. No other events are sticky.

### `MESSAGE_EDITED` passes a **string** message ID

```js
eventSource.on(event_types.MESSAGE_EDITED, (messageId) => {
    // messageId is a string — parseInt before comparing to numeric indices
    if (parseInt(messageId, 10) === myTrackedIndex) { /* ... */ }
});
```

### Inconsistent string casing

Three events use camelCase string values while all others use snake_case: `CHAT_LOADED → 'chatLoaded'`, `CHARACTER_DELETED → 'characterDeleted'`, `CHARACTER_MANAGEMENT_DROPDOWN → 'charManagementDropdown'`. Always reference these via the `event_types.*` constant rather than the raw string.

### Aliased event

`SMOOTH_STREAM_TOKEN_RECEIVED` and `STREAM_TOKEN_RECEIVED` share the same string value (`'stream_token_received'`). The former is deprecated — use the latter.
