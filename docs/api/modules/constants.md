# constants.js

Shared enums and sentinel values used across SillyTavern: debounce timings, media classifications, swipe state, the "ignore this message" symbol, and the list of known generation triggers.

**Import path from a third-party extension:**

```js
import {
    debounce_timeout,
    IGNORE_SYMBOL,
    MEDIA_TYPE,
    SWIPE_DIRECTION,
} from '../../../constants.js';
```

## Exports at a glance

| Export | Kind | Summary |
|--------|------|---------|
| `debounce_timeout` | enum<number> | Standard debounce intervals (ms) |
| `IGNORE_SYMBOL` | Symbol | Marker for messages excluded from generation prompts |
| `VIDEO_EXTENSIONS` | string[] | Recognized video file extensions |
| `GENERATION_TYPE_TRIGGERS` | string[] | Valid `type` values passed to `Generate` |
| `inject_ids` | object | Known prompt-injection key strings / builders |
| `COMETAPI_IGNORE_PATTERNS` | string[] | Model-name substrings filtered from CometAPI lists |
| `MEDIA_SOURCE` | enum<string> | How a media file entered the chat |
| `MEDIA_DISPLAY` | enum<string> | Media display modes |
| `IMAGE_OVERSWIPE` | enum<string> | Behavior on image overswipe |
| `MEDIA_TYPE` | enum<string> + helper | Media class (`image`/`video`/`audio`) plus `getFromMime` |
| `MEDIA_REQUEST_TYPE` | enum<number> | Bitwise flags for requested media types |
| `SCROLL_BEHAVIOR` | enum<string> | Auto-scroll behavior on media append |
| `OVERSWIPE_BEHAVIOR` | enum<string> | What happens when the user swipes past the last variant |
| `SWIPE_DIRECTION` | enum<string> | `left` / `right` |
| `SWIPE_SOURCE` | enum<string> | What caused a swipe (delete / keyboard / ...) |
| `SWIPE_STATE` | enum<string> | Current swipe FSM state |

## Reference

### Timing

#### `debounce_timeout`

Recommended debounce intervals for use with `debounce()` from `utils.js`. Use the named member instead of raw numbers so call-sites stay consistent.

| Member | Value | Typical use |
|--------|------:|-------------|
| `quick` | `100` | Keypress-rate handlers |
| `short` | `200` | Slightly slower keypress / scroll handlers |
| `standard` | `300` | General-purpose default |
| `relaxed` | `1000` | Auto-save, settings persistence |
| `extended` | `5000` | Batch operations with significant pause |

### Sentinels

#### `IGNORE_SYMBOL`

`Symbol.for('ignore')`. When attached to a message's `extra` object as an ephemeral marker, the message is **excluded from generation prompts** without being removed from the chat array — important for keeping World Info timed effects in sync.

### File-type lists

#### `VIDEO_EXTENSIONS`

`['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', '3gp', 'mkv', 'mpg']` — chosen to match Gemini's supported video upload formats.

### Generation

#### `GENERATION_TYPE_TRIGGERS`

The whitelisted `type` strings that can be passed to ST's `Generate` function:

`'normal'`, `'continue'`, `'impersonate'`, `'swipe'`, `'regenerate'`, `'quiet'`.

#### `inject_ids`

Known keys used with prompt injection. Some are plain strings, others are builder functions for parameterized keys:

| Member | Kind | Value |
|--------|------|-------|
| `STORY_STRING` | string | `'__STORY_STRING__'` |
| `QUIET_PROMPT` | string | `'QUIET_PROMPT'` |
| `DEPTH_PROMPT` | string | `'DEPTH_PROMPT'` |
| `DEPTH_PROMPT_INDEX(index)` | fn | `` `DEPTH_PROMPT_${index}` `` |
| `CUSTOM_WI_DEPTH` | string | `'customDepthWI'` |
| `CUSTOM_WI_DEPTH_ROLE(depth, role)` | fn | `` `customDepthWI_${depth}_${role}` `` |
| `CUSTOM_WI_OUTLET(key)` | fn | `` `customWIOutlet_${key}` `` |

### Provider filtering

#### `COMETAPI_IGNORE_PATTERNS`

String[] of substring patterns matched (case-insensitive) against CometAPI model IDs to filter out non-chat models (image / audio / video / utility). Examples: `'dall-e'`, `'tts'`, `'whisper'`, `'flux-'`, `'embedding'`, `'moderation'`. See the source for the full list.

### Media

#### `MEDIA_SOURCE`

How a media item arrived in the chat.

| Member | Value |
|--------|-------|
| `API` | `'api'` |
| `UPLOAD` | `'upload'` |
| `GENERATED` | `'generated'` |
| `CAPTIONED` | `'captioned'` |

#### `MEDIA_DISPLAY`

| Member | Value |
|--------|-------|
| `LIST` | `'list'` |
| `GALLERY` | `'gallery'` |

#### `IMAGE_OVERSWIPE`

Behavior when the user attempts to swipe past the last image.

| Member | Value |
|--------|-------|
| `GENERATE` | `'generate'` |
| `ROLLOVER` | `'rollover'` |

#### `MEDIA_TYPE`

Identifies the broad class of a media file, plus a helper to derive it from a MIME type.

| Member | Value |
|--------|-------|
| `IMAGE` | `'image'` |
| `VIDEO` | `'video'` |
| `AUDIO` | `'audio'` |
| `getFromMime(mimeType)` | returns one of the three constants above, or `null` |

```js
MEDIA_TYPE.getFromMime('image/png');   // 'image'
MEDIA_TYPE.getFromMime('application/pdf'); // null
```

#### `MEDIA_REQUEST_TYPE`

Bitwise flags so multiple media types can be requested in a single call. Combine with `|`, test with `&`.

| Member | Value | Bit |
|--------|------:|-----|
| `IMAGE` | `0b001` | 1 |
| `VIDEO` | `0b010` | 2 |
| `AUDIO` | `0b100` | 4 |

#### `SCROLL_BEHAVIOR`

How the chat view should scroll when media is appended to a message.

| Member | Value |
|--------|-------|
| `NONE` | `'none'` |
| `KEEP` | `'keep'` |
| `ADJUST` | `'adjust'` |

### Swipes

#### `OVERSWIPE_BEHAVIOR`

What happens when the user swipes past the last swipe of a message.

| Member | Value | Behavior |
|--------|-------|----------|
| `NONE` | `'none'` | Don't show the right chevron at all |
| `LOOP` | `'loop'` | Wrap around to swipe 0 |
| `PRISTINE_GREETING` | `'pristine_greeting'` | Pristine greetings loop; chevrons always shown |
| `EDIT_GENERATE` | `'edit_generate'` | With chat tree enabled, edit before regenerating |
| `REGENERATE` | `'regenerate'` | Default for character messages — generate a new swipe |

#### `SWIPE_DIRECTION`

| Member | Value |
|--------|-------|
| `LEFT` | `'left'` |
| `RIGHT` | `'right'` |

#### `SWIPE_SOURCE`

Identifies what initiated a swipe. Useful for analytics and conditional UI updates.

| Member | Value |
|--------|-------|
| `DELETE` | `'delete'` |
| `KEYBOARD` | `'keyboard'` |
| `BACK` | `'back'` |
| `AUTO_SWIPE` | `'auto_swipe'` |
| `SLASH_COMMAND` | `'slash_command'` |
| `SWIPE_PICKER` | `'swipe_picker'` |

#### `SWIPE_STATE`

Coarse FSM for the swipe subsystem.

| Member | Value |
|--------|-------|
| `NONE` | `'none'` |
| `SWIPING` | `'swiping'` |
| `EDITING` | `'editing'` |
