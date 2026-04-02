# CLAUDE.md — SillyTavern Extension Development Guide

## Project Overview

This is a comprehensive development guide for building SillyTavern third-party extensions, from simple UI additions to complex systems like **SillyMem** (structured narrative memory with LLM-driven scene summaries, fact extraction, and narrative arc management). It covers the full ST extension API surface: context, events, prompt injection, LLM generation, token counting, file storage, group chats, and more.

## Repository Structure

```
├── manifest.json   # Extension metadata (required)
├── index.js        # All extension logic — single entry point
├── style.css       # UI styling using ST's CSS variable system
├── README.md       # User-facing documentation
└── CLAUDE.md       # AI development guide (this file)
```

---

## How SillyTavern Extensions Work

### The Manifest (`manifest.json`)

Every extension **must** have a `manifest.json` at its root:

```json
{
  "display_name": "Extension Name",
  "loading_order": 1,
  "requires": [],
  "optional": [],
  "dependencies": [],
  "js": "index.js",
  "css": "style.css",
  "author": "Your Name",
  "version": "1.0.0",
  "homePage": "",
  "auto_update": true
}
```

| Field | Purpose |
|-------|---------|
| `display_name` | Shown in the ST extensions panel |
| `loading_order` | Lower = loaded earlier. Use `1` unless you depend on other extensions |
| `requires` | Array of required ST module names (e.g. `["tts"]`) |
| `optional` | Array of optional ST modules |
| `dependencies` | Array of other extension URLs this depends on |
| `js` | Entry point JavaScript file |
| `css` | Stylesheet file (loaded automatically) |
| `auto_update` | Whether ST should auto-update from the repo |

### Entry Point Pattern

Extensions use jQuery's DOM-ready callback as their entry point:

```javascript
jQuery(async () => {
    init();
});
```

The `init()` function orchestrates all setup: loading settings, adding UI elements, registering commands, subscribing to events, and restoring state.

---

## The SillyTavern Context API

The **single most important pattern** — all interaction with ST flows through the context object:

```javascript
const context = SillyTavern.getContext();
```

Call `SillyTavern.getContext()` fresh each time you need it (don't cache it long-term). Key properties and methods:

### Chat & Messages

| API | Description |
|-----|-------------|
| `context.chat` | Mutable array of message objects in current chat |
| `context.chat[i].mes` | The message text (raw, pre-formatting) |
| `context.chat[i].is_user` | Boolean — `true` if user message |
| `context.chat[i].swipes` | Array of swipe texts (may not exist until first swipe) |
| `context.chat[i].swipe_id` | Current active swipe index |
| `context.chat[i].swipe_info` | Metadata array parallel to `swipes` |
| `context.saveChat()` | Persist chat to disk (async) |
| `context.isGenerating` | Boolean — whether generation is in progress |

### Metadata (Per-Chat Persistent Storage)

```javascript
// Save custom data that persists with the chat
context.chatMetadata.myExtension = { key: 'value' };
context.saveMetadata();

// Load on chat switch
const saved = context.chatMetadata?.myExtension;
```

Use `chatMetadata` for per-chat state (checkpoints, counters, flags). This survives page refreshes.

### Extension Settings (Global Persistent Storage)

```javascript
// Save settings (persists across all chats)
context.extensionSettings.myExtension = { ...mySettings };
context.saveSettingsDebounced();

// Load on init
const saved = context.extensionSettings?.myExtension;
if (saved) {
    mySettings = { ...defaults, ...saved };
}
```

Use `extensionSettings` for user preferences (toggles, UI options). Always merge with defaults to handle new settings added in updates.

### Message Formatting

```javascript
if (typeof context.messageFormatting === 'function') {
    textElement.innerHTML = context.messageFormatting(
        msg.mes, msg.name, msg.is_system, msg.is_user, messageIndex,
    );
} else {
    textElement.textContent = msg.mes;  // fallback
}
```

Always provide a fallback — `messageFormatting` may not be available.

### Slash Command Execution

```javascript
await context.executeSlashCommandsWithOptions('/continue');
```

Preferred way to trigger ST built-in actions programmatically.

---

## Event System

SillyTavern uses an EventEmitter pattern. Subscribe in your init:

```javascript
const { eventSource, eventTypes } = SillyTavern.getContext();

eventSource.on(eventTypes.CHAT_CHANGED, () => { /* ... */ });
eventSource.on(eventTypes.MESSAGE_EDITED, (messageId) => { /* ... */ });
```

### Key Event Types

SillyTavern defines **86+ event types** in `public/scripts/events.js`. The most useful ones for extension development are listed below, organized by category. Parameter info is derived from source code `emit()` calls.

> **Note**: The way each event passes data to listeners is not uniform. Some events pass no data; others pass an object, index, or string. Always check current source if in doubt.

#### Core Message Events

| Event | Fires When | Params | Typical Use |
|-------|-----------|--------|-------------|
| `USER_MESSAGE_RENDERED` | User message rendered in DOM | `(messageIndex)` | Clear/reset extension state |
| `CHARACTER_MESSAGE_RENDERED` | Character message rendered in DOM | `(messageIndex)` | Detect new turns vs. continues |
| `MESSAGE_SENT` | User message recorded in chat array (before render) | `(messageIndex)` | Pre-processing before display |
| `MESSAGE_RECEIVED` | LLM message recorded in chat array (before render) | `(messageIndex)` | Post-generation cleanup, unlock guards |
| `MESSAGE_EDITED` | Any message edited (user, generation, or programmatic) | `(messageId)` **string!** | Update cached text — use `parseInt(messageId)` |
| `MESSAGE_DELETED` | A message is deleted from chat | `(messageCount)` | Clean up references (param is remaining count, not deleted ID) |
| `MESSAGE_SWIPED` | User swipes to a different response | — | React to swipe navigation |
| `MESSAGE_UPDATED` | Message object is updated/modified | `(messageIndex)` | Respond to non-edit content changes |
| `MESSAGE_FILE_EMBEDDED` | A file is embedded in a message | `(messageIndex)` | Handle file attachments |
| `MESSAGE_SWIPE_DELETED` | A swipe variant is deleted | `(messageIndex)` | Clean up swipe-related state |
| `MESSAGE_REASONING_EDITED` | Reasoning/thinking portion edited | `(messageIndex)` | Track chain-of-thought changes |
| `MESSAGE_REASONING_DELETED` | Reasoning/thinking portion deleted | `(messageIndex)` | Clean up reasoning UI |
| `IMPERSONATE_READY` | Impersonated message text is ready | `(messageText)` | Modify impersonated text |

#### Generation Events

| Event | Fires When | Params | Typical Use |
|-------|-----------|--------|-------------|
| `GENERATION_STARTED` | Generation request sent to backend | — | Hide buttons, set guard flags |
| `GENERATION_ENDED` | Generation finishes (success or failure) | — | Show buttons, unlock state |
| `GENERATION_STOPPED` | User manually stops/aborts generation | — | Handle interrupted generation |
| `GENERATION_AFTER_COMMANDS` | After slash commands processed, before gen | `(type, options, dryRun)` | Modify generation parameters |
| `GENERATE_BEFORE_COMBINE_PROMPTS` | Before prompt parts are combined | `(data)` mutable | Modify prompt assembly |
| `GENERATE_AFTER_COMBINE_PROMPTS` | After prompts are combined | `(data)` mutable | Inspect/modify final prompt |
| `GENERATE_AFTER_DATA` | After generation request data is built | `(data)` mutable | Last chance to modify API payload |
| `STREAM_TOKEN_RECEIVED` | Each token arrives during streaming | `(token)` | Real-time streaming UI updates |
| `SMOOTH_STREAM_TOKEN_RECEIVED` | Deprecated alias for `STREAM_TOKEN_RECEIVED` | `(token)` | Same string value — use `STREAM_TOKEN_RECEIVED` |
| `STREAM_REASONING_DONE` | Reasoning/thinking stream portion complete | — | Switch from reasoning to response display |

#### Chat & Session Events

| Event | Fires When | Params | Typical Use |
|-------|-----------|--------|-------------|
| `CHAT_CHANGED` | User switches to a different chat | `(chatId)` | Load per-chat state from metadata |
| `CHAT_LOADED` | Chat data loaded into memory | — | Post-load initialization |
| `CHAT_CREATED` | A new chat is created | `(chatId)` | Initialize fresh state |
| `CHAT_DELETED` | A chat is deleted | `(chatFileName)` | Clean up associated data |
| `GROUP_CHAT_CREATED` | A group chat is created | `(chatId)` | Group-specific initialization |
| `GROUP_CHAT_DELETED` | A group chat is deleted | `(chatId)` | Group cleanup |
| `GROUP_UPDATED` | Group settings or members changed | — | React to group changes |
| `GROUP_MEMBER_DRAFTED` | Group member selected for next turn | `(characterId)` | Track group generation order |
| `MORE_MESSAGES_LOADED` | Older messages loaded (scrollback) | — | Re-apply indicators to loaded messages |

#### Character Events

| Event | Fires When | Params | Typical Use |
|-------|-----------|--------|-------------|
| `CHARACTER_EDITOR_OPENED` | Character editor panel opens | — | Add custom editor UI |
| `CHARACTER_EDITED` | Character card is modified and saved | `(characterData)` | React to character changes |
| `CHARACTER_DELETED` | A character is deleted | `(characterData)` | Clean up character-specific data |
| `CHARACTER_DUPLICATED` | A character is duplicated | `(characterId)` | Handle copied characters |
| `CHARACTER_RENAMED` | A character is renamed | `(oldName, newName)` | Update name references |
| `CHARACTER_FIRST_MESSAGE_SELECTED` | Alt first message chosen | `(index)` | Handle greeting variants |
| `CHARACTER_PAGE_LOADED` | Character page finishes loading | — | Inject custom UI into character page |

#### Settings & Configuration Events

| Event | Fires When | Params | Typical Use |
|-------|-----------|--------|-------------|
| `SETTINGS_LOADED` | Settings finish loading | — | Read initial configuration |
| `SETTINGS_LOADED_BEFORE` | Just before settings are applied | — | Pre-settings setup |
| `SETTINGS_LOADED_AFTER` | After settings fully applied and UI updated | — | Post-settings initialization |
| `SETTINGS_UPDATED` | Any setting is changed | — | React to setting changes |
| `EXTENSION_SETTINGS_LOADED` | Extension settings loaded | — | Initialize extension state |
| `EXTENSIONS_FIRST_LOAD` | Extensions loaded for the first time | — | One-time setup |
| `CHATCOMPLETION_SOURCE_CHANGED` | Chat completion API source changed | `(source)` | Adapt to different APIs |
| `CHATCOMPLETION_MODEL_CHANGED` | Model selection changed | `(model)` | Model-specific behavior |
| `MAIN_API_CHANGED` | Main API backend changed | `(api)` | API-specific adaptations |
| `ONLINE_STATUS_CHANGED` | API connection status changed | `(status)` | Show/hide connection-dependent UI |
| `CONNECTION_PROFILE_LOADED` | Connection profile loaded | `(profileData)` | Profile-specific setup |
| `PRESET_CHANGED` | Any preset is changed | `(presetName)` | React to preset switches |

#### World Info Events

| Event | Fires When | Params | Typical Use |
|-------|-----------|--------|-------------|
| `WORLDINFO_UPDATED` | World Info entries are changed | `(worldInfoData)` | React to lore changes |
| `WORLDINFO_SETTINGS_UPDATED` | World Info settings changed | — | React to WI config changes |
| `WORLDINFO_ENTRIES_LOADED` | World Info entries finish loading | — | Post-load processing |
| `WORLDINFO_SCAN_DONE` | WI keyword scanning completes | `(scanResult)` mutable | Modify activation results |
| `WORLD_INFO_ACTIVATED` | WI entries activated during prompt building | `(activatedEntries)` | Track which lore is active |

#### Prompt Pipeline Events

| Event | Fires When | Params | Typical Use |
|-------|-----------|--------|-------------|
| `CHAT_COMPLETION_SETTINGS_READY` | Chat completion settings loaded | — | Modify completion config |
| `CHAT_COMPLETION_PROMPT_READY` | Prompt array assembled, ready to send | `(promptData)` mutable | Modify final prompt array |
| `TEXT_COMPLETION_SETTINGS_READY` | Text completion settings loaded | — | Modify text completion config |

#### Tool Call Events

| Event | Fires When | Params | Typical Use |
|-------|-----------|--------|-------------|
| `TOOL_CALLS_PERFORMED` | Tool/function calls have been executed | `(toolCallResults)` | Process tool results |
| `TOOL_CALLS_RENDERED` | Tool call results rendered in UI | `(toolCallResults)` | Post-render tool UI updates |

#### App Lifecycle Events

| Event | Fires When | Params | Typical Use |
|-------|-----------|--------|-------------|
| `APP_INITIALIZED` | Core systems loaded (sticky) | — | Safe to query app state |
| `APP_READY` | UI fully interactive (sticky) | — | Safe to interact with all systems |

> **Sticky events**: `APP_INITIALIZED` and `APP_READY` are "sticky" — if you subscribe after they've fired, your callback runs immediately. All other events are fire-and-forget.

> **Important**: Always check that an event type exists before subscribing: `if (eventTypes.GENERATION_STARTED) { eventSource.on(...) }`. This guards against ST version differences where events may not be defined.

> **String value inconsistencies**: Most event string values use `snake_case`, but a few use `camelCase` (e.g., `CHAT_LOADED` → `'chatLoaded'`, `CHARACTER_DELETED` → `'characterDeleted'`). Always use the constant name, never the raw string.

### Distinguishing New Messages vs. Continues

```javascript
eventSource.on(eventTypes.CHARACTER_MESSAGE_RENDERED, () => {
    const ctx = SillyTavern.getContext();
    const currentLastIndex = ctx.chat.length - 1;

    if (currentLastIndex !== savedMessageId) {
        // New message was added to the chat
    } else {
        // Same message — this was a Continue
    }
});
```

### Guard Flags for Race Conditions

Generation triggers `MESSAGE_EDITED` events that can overwrite your state. Use a lock pattern:

```javascript
let snapshotLocked = false;

// Before triggering generation:
snapshotLocked = true;

// In MESSAGE_EDITED handler:
eventSource.on(eventTypes.MESSAGE_EDITED, (messageId) => {
    if (snapshotLocked) return;       // Skip edits from generation
    if (context.isGenerating) return;  // Double-check
    // ... handle user edit
});

// After generation completes (with delay for post-generation edits):
eventSource.on(eventTypes.MESSAGE_RECEIVED, () => {
    setTimeout(() => { snapshotLocked = false; }, 1000);
});
```

The 1000ms delay is important — ST fires `MESSAGE_EDITED` slightly after generation completes.

### One-Time Event Listeners

For events you only need to catch once (e.g., waiting for a specific user message), manually remove the listener:

```javascript
const onUserMessage = () => {
    eventSource.removeListener(eventTypes.USER_MESSAGE_RENDERED, onUserMessage);
    // Handle the event...
};
eventSource.on(eventTypes.USER_MESSAGE_RENDERED, onUserMessage);
```

### `MESSAGE_EDITED` Parameter Caveat

The `messageId` passed to `MESSAGE_EDITED` handlers is a **string**, not a number. Always use `parseInt()` when comparing:

```javascript
eventSource.on(eventTypes.MESSAGE_EDITED, (messageId) => {
    if (parseInt(messageId) === myStoredIndex) {
        // This is the message we're tracking
    }
});
```

---

## Registering Slash Commands

```javascript
context.registerSlashCommand(
    'commandname',           // Command name (used as /commandname)
    async (args) => {        // Handler function
        // Do work...
        return '';           // Return value (string)
    },
    [],                      // Aliases array
    'Description for help.', // Help text
    true,                    // interruptsGeneration — stops active gen?
    true,                    // purgeFromMessage — remove from chat input?
);
```

- Always check `context.registerSlashCommand` exists before calling
- Return empty string `''` for action commands, or a status message for informational commands

---

## UI Integration

### Adding Buttons

Insert into existing ST containers rather than creating new panels:

```javascript
// Hamburger menu item (send_form)
const sendForm = document.getElementById('send_form');
const btn = document.createElement('div');
btn.id = 'my_extension_button';
btn.classList.add('list-group-item', 'interactable');
btn.innerHTML = '<span class="fa-solid fa-icon-name"></span> Label';

// Insert relative to an existing button
const referenceBtn = document.getElementById('option_continue');
referenceBtn.parentNode.insertBefore(btn, referenceBtn.nextSibling);

// Quick-action button (rightSendForm)
const rightForm = document.getElementById('rightSendForm');
const quickBtn = document.createElement('div');
quickBtn.classList.add('fa-solid', 'fa-icon-name', 'interactable');
rightForm.appendChild(quickBtn);
```

**Always guard against duplicates:**

```javascript
if (document.getElementById('my_button')) return;
```

### Settings Panel

Add to `#extensions_settings` using ST's inline-drawer pattern:

```javascript
const settingsContainer = document.getElementById('extensions_settings');
settingsContainer.insertAdjacentHTML('beforeend', `
    <div id="my_extension_settings" class="extension_settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>Extension Name</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <label class="checkbox_label">
                    <input id="my_checkbox" type="checkbox" />
                    <span>Setting description</span>
                </label>
                <select id="my_select" class="text_pole">
                    <option value="a">Option A</option>
                </select>
                <div class="menu_button" id="my_action_button">
                    Action Button
                </div>
            </div>
        </div>
    </div>
`);
```

Standard ST UI classes: `checkbox_label`, `text_pole`, `menu_button`, `interactable`, `list-group-item`.

### Targeting Messages in the DOM

```javascript
const messageEl = document.querySelector(`#chat .mes[mesid="${messageIndex}"]`);
const textEl = messageEl.querySelector('.mes_text');
const nameEl = messageEl.querySelector('.ch_name');
const swipeCounter = messageEl.querySelector('.swipes-counter');
```

---

## CSS Patterns

### Use ST's CSS Variables

Always prefer SillyTavern's theme variables over hardcoded colors:

```css
.my-element {
    color: var(--SmartThemeQuoteColor, #e8a23a);  /* always provide a fallback */
}
```

### Scope Styles to Your Extension

Prefix IDs and classes to avoid collisions:

```css
#my_extension_button { /* ... */ }
.my-extension-indicator { /* ... */ }
```

### Common Patterns

```css
/* Smooth state transitions */
.my-button {
    opacity: 0.7;
    transition: opacity 0.15s ease, color 0.15s ease;
}
.my-button:hover { opacity: 1; }
.my-button.active { opacity: 1; color: var(--SmartThemeQuoteColor, #e8a23a); }

/* Pseudo-element status indicators (e.g., active dot under a button) */
.my-button.active::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 50%;
    transform: translateX(-50%);
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--SmartThemeQuoteColor, #e8a23a);
}

/* Message border indicators (use !important to override ST's base styles) */
.mes.my-highlighted-message {
    border-left: 3px solid var(--SmartThemeQuoteColor, #e8a23a) !important;
}
```

> **Note on `!important`**: Sometimes necessary when overriding ST's base message styles (e.g., borders). Use sparingly and only on elements where ST's own styles would win otherwise.

---

## Working with Swipes

Swipes are alternative versions of a message. The `swipes` array may not exist until explicitly created:

```javascript
const msg = context.chat[messageIndex];

// Initialize swipes if needed
if (!msg.swipes) {
    msg.swipes = [msg.mes];       // Current text becomes swipe 0
    msg.swipe_id = 0;
    msg.swipe_info = [{}];
}

// Add a new swipe
msg.swipes.push(newText);
msg.swipe_info.push({});

// Switch to the new swipe
msg.swipe_id = msg.swipes.length - 1;
msg.mes = newText;

// Re-render and save
await reRenderMessage(messageIndex);
await context.saveChat();
```

After creating swipes, update the swipe counter and ensure swipe controls are visible:

```javascript
const swipeCounter = messageEl.querySelector('.swipes-counter');
swipeCounter.textContent = `${msg.swipe_id + 1}/${msg.swipes.length}`;

const swipeControl = messageEl.querySelector('.swipe_right, .swipe_left');
if (swipeControl) swipeControl.style.display = '';
```

---

## Toast Notifications

SillyTavern exposes `toastr` globally:

```javascript
function toast(message, type = 'info') {
    if (typeof toastr !== 'undefined' && toastr[type]) {
        toastr[type](message);
    }
}
// Types: 'info', 'success', 'warning', 'error'
```

Consider making toasts optional via a user setting.

---

## Triggering Built-in Actions

Prefer the slash command system over DOM clicks:

```javascript
// Best approach
if (context.executeSlashCommandsWithOptions) {
    await context.executeSlashCommandsWithOptions('/continue');
    return;
}

// Fallback: click the button
const btn = document.getElementById('option_continue');
if (btn) btn.click();
```

### Important: `#mes_continue` vs `#option_continue`

SillyTavern has **two** Continue buttons with different behaviors:

| Button | Location | Behavior |
|--------|----------|----------|
| `#option_continue` | Hamburger menu (`send_form`) | Continues the last message |
| `#mes_continue` | Quick-action bar (`rightSendForm`) | If text is in `#send_textarea`, posts it as a user message AND continues. Otherwise, same as `#option_continue` |

The `/continue` slash command behaves like `#option_continue` — it does **not** post typed text. If you need to handle typed input + continue, use `#mes_continue.click()` instead.

---

## Detecting User Input Text

Check `#send_textarea` before performing actions — the user may have typed text:

```javascript
const textarea = document.getElementById('send_textarea');
const inputText = textarea?.value?.trim();

if (inputText) {
    // User has typed something — handle it
} else {
    // No input — proceed with default behavior
}
```

---

## Auto-Confirming Active Edits

If a user is editing a message (the edit textarea is visible), you may need to confirm the edit before proceeding with your action:

```javascript
function confirmActiveMessageEdit() {
    const visibleEditButtons = document.querySelector(
        '#chat .mes .mes_edit_buttons[style*="display: inline-flex"]'
    );
    if (visibleEditButtons) {
        const editDoneBtn = visibleEditButtons.querySelector('.mes_edit_done');
        if (editDoneBtn) {
            editDoneBtn.click();
            return true;  // An edit was confirmed
        }
    }
    return false;
}
```

**Important**: ST updates `chat[N].mes` synchronously on edit confirm, but the `MESSAGE_EDITED` event fires asynchronously. If you need the updated text immediately after confirming, read it from `context.chat[N].mes` directly — don't wait for the event.

---

## Hooking Existing ST Buttons

To react when the user clicks ST's native buttons (e.g., Continue), add click listeners:

```javascript
function hookExistingButtons() {
    const continueButton = document.getElementById('option_continue');
    if (continueButton) {
        continueButton.addEventListener('click', () => myHandler());
    }

    const quickContinueBtn = document.getElementById('mes_continue');
    if (quickContinueBtn) {
        quickContinueBtn.addEventListener('click', () => myHandler());
    }
}
```

This is useful for "auto-set on Continue" type features where your extension reacts to ST's built-in actions.

---

## Debug Logging Pattern

Add a conditional debug logger controlled by a user setting:

```javascript
const defaultSettings = {
    debugMode: false,
    // ...other settings
};

function debug(...args) {
    if (!extensionSettings.debugMode) return;
    console.log('MY-EXTENSION:', ...args);
}
```

Use liberally throughout your code — it's free when disabled and invaluable when enabled. Log state transitions, event handlers, and guard flag changes.

---

## Generating LLM Responses from Extensions

Extensions can make LLM calls independently of the main chat generation. Two primary functions are available:

### `generateRaw` — Direct Prompt Control

Sends a prompt directly to the active LLM API without using the normal chat pipeline. Best for structured/templated prompts where you control the full prompt content.

```javascript
import { generateRaw } from '../../../../script.js';

const result = await generateRaw({
    prompt: sceneText,              // Main prompt text (user-role content)
    systemPrompt: instructionText,  // System-role instruction (optional)
    responseLength: 500,            // Max tokens for response (optional, 0 = use default)
});
// result is a string containing the LLM's response
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `prompt` | `string` | The main prompt content sent as user message |
| `systemPrompt` | `string` | System instruction prepended to the prompt |
| `responseLength` | `number\|null` | Override max response tokens. `null` or `0` uses default |
| `api` | `string\|null` | Override which API to use (default: current `main_api`) |
| `instructOverride` | `boolean` | Override instruct mode formatting |
| `prefill` | `string` | Assistant prefill text (for APIs that support it) |

### `generateQuietPrompt` — Pipeline-Aware Generation

Generates through the normal ST pipeline but "quietly" — the result is not added to the chat. Includes character context and system prompt from current settings.

```javascript
import { generateQuietPrompt } from '../../../../script.js';

const result = await generateQuietPrompt({
    quietPrompt: 'Summarize the following scene...',
    skipWIAN: true,          // Skip World Info and Author's Note
    responseLength: 300,     // Override response length
    removeReasoning: true,   // Strip chain-of-thought (default: true)
    trimToSentence: false,   // Trim to last complete sentence
});
```

### When to Use Which

| Use Case | Function | Why |
|----------|----------|-----|
| Structured extraction (facts, summaries) | `generateRaw` | Full control over prompt format, no character bleed |
| Narrative generation needing character voice | `generateQuietPrompt` | Includes character context automatically |
| Template-driven prompts with custom variables | `generateRaw` | Clean separation of instruction and content |

### Stripping Reasoning from Responses

When using `generateRaw`, the response may include chain-of-thought reasoning tags. Strip them:

```javascript
import { removeReasoningFromString } from '../../../reasoning.js';

const cleanResult = removeReasoningFromString(await generateRaw({ prompt, systemPrompt }));
```

`generateQuietPrompt` does this automatically when `removeReasoning: true` (the default).

### Preventing Concurrent API Calls

Use a guard flag to prevent overlapping generation requests:

```javascript
let inApiCall = false;

async function runGeneration(prompt) {
    if (inApiCall) return null;
    inApiCall = true;
    try {
        return await generateRaw({ prompt, systemPrompt: instruction });
    } catch (error) {
        console.error('Generation failed:', error);
        return null;
    } finally {
        inApiCall = false;
    }
}
```

---

## Extension Prompt Injection

Extensions inject content into the LLM's prompt at generation time using `setExtensionPrompt`. This is the primary mechanism for feeding memory, context, or instructions to the model.

```javascript
import { setExtensionPrompt, extension_prompt_types, extension_prompt_roles } from '../../../../script.js';

setExtensionPrompt(
    key,       // Unique string identifier for this injection (e.g., 'sillymem_scenes')
    value,     // Content to inject (string). Empty string '' removes the injection.
    position,  // Where to place it (extension_prompt_types enum)
    depth,     // Message depth for IN_CHAT position (0 = after latest message)
    scan,      // Boolean — include in World Info keyword scanning? (default: false)
    role,      // Message role (extension_prompt_roles enum)
);
```

### Position Types

| Constant | Value | Behavior |
|----------|-------|----------|
| `extension_prompt_types.NONE` | -1 | Disabled — not injected |
| `extension_prompt_types.IN_PROMPT` | 0 | Injected into system prompt area |
| `extension_prompt_types.IN_CHAT` | 1 | Injected into chat history at specified depth |
| `extension_prompt_types.BEFORE_PROMPT` | 2 | Injected before the system prompt |

### Role Types

| Constant | Value | Behavior |
|----------|-------|----------|
| `extension_prompt_roles.SYSTEM` | 0 | System message role |
| `extension_prompt_roles.USER` | 1 | User message role |
| `extension_prompt_roles.ASSISTANT` | 2 | Assistant message role |

### Depth Ordering

When using `IN_CHAT`, **depth** controls how far back from the latest message the injection is placed:
- Depth `0` = after the very latest message
- Depth `4` = four messages back from the end
- Lower depth = closer to the generation point (higher weight from the LLM)

At the same depth, injections are ordered by role priority: System → User → Assistant.

### Multiple Injection Keys

Call `setExtensionPrompt` multiple times with **different keys** to inject multiple blocks independently:

```javascript
// Each key manages its own injection — they don't overwrite each other
setExtensionPrompt('sillymem_scenes', sceneSummariesText,
    extension_prompt_types.IN_CHAT, 4, false, extension_prompt_roles.SYSTEM);

setExtensionPrompt('sillymem_arc', arcDirectiveText,
    extension_prompt_types.IN_CHAT, 4, false, extension_prompt_roles.SYSTEM);

setExtensionPrompt('sillymem_facts', factsText,
    extension_prompt_types.IN_CHAT, 4, false, extension_prompt_roles.SYSTEM);

// To disable one without affecting others:
setExtensionPrompt('sillymem_arc', '', extension_prompt_types.NONE, 0);
```

### Wrapping Injection Content

Wrap injected content in labeled blocks so it's clear to the LLM what it is:

```javascript
import { substituteParamsExtended } from '../../../../script.js';

const template = '[Story So Far:\n{{summary}}\n]';
const formatted = substituteParamsExtended(template, { summary: sceneSummariesText });
setExtensionPrompt('sillymem_scenes', formatted, extension_prompt_types.IN_CHAT, 4);
```

---

## Token Counting

SillyTavern provides tokenization utilities for estimating prompt sizes. Essential for displaying token budgets and making context-aware decisions.

### Async Token Count (Recommended)

```javascript
import { getTokenCountAsync } from '../../../tokenizers.js';

// Automatically selects the correct tokenizer for the current API
const count = await getTokenCountAsync(text, 0);  // text, optional padding
```

### Synchronous Token Count

```javascript
import { getTextTokens, tokenizers } from '../../../tokenizers.js';

// Returns token ID array for a specific tokenizer
const tokens = getTextTokens(tokenizers.GPT2, text);
const count = tokens.length;
```

### Common Tokenizer IDs

| Constant | Value | Use With |
|----------|-------|----------|
| `tokenizers.NONE` | 0 | No tokenization |
| `tokenizers.GPT2` | 1 | Fallback / Extras API |
| `tokenizers.OPENAI` | 2 | OpenAI models |
| `tokenizers.LLAMA` | 3 | LLaMA / Alpaca |
| `tokenizers.CLAUDE` | 11 | Anthropic Claude |
| `tokenizers.LLAMA3` | 12 | LLaMA 3+ |

### Context Window Size

```javascript
import { getMaxContextSize } from '../../../../script.js';

const maxTokens = getMaxContextSize();  // Current context window size in tokens
```

### Example: Token Budget Display

```javascript
async function updateTokenDisplay() {
    const scenesTokens = await getTokenCountAsync(sceneSummariesText);
    const arcTokens = await getTokenCountAsync(arcDirectiveText);
    const factsTokens = await getTokenCountAsync(factsText);
    const total = scenesTokens + arcTokens + factsTokens;
    document.getElementById('sm_token_count').textContent = `~${total} tokens`;
}
```

---

## File-Based Storage for Extensions

Extensions that need to persist data beyond `chatMetadata` and `extensionSettings` can use server API calls.

### Making Authenticated Server Requests

All ST server API calls require authentication headers:

```javascript
import { getRequestHeaders } from '../../../../script.js';

const response = await fetch('/api/endpoint', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({ key: 'value' }),
});

if (response.ok) {
    const data = await response.json();
}
```

### Storage Strategy Comparison

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| `chatMetadata` | Automatic save/load with chat, no server calls | Size limits, lost if chat deleted | Small per-chat state (flags, counters) |
| `extensionSettings` | Persists globally, easy API | Not per-chat, all-or-nothing save | User preferences, prompt templates |
| Server file API | Full control, any format, large data | Requires server endpoints, more code | Large per-chat data (memory files) |

### Server File Operations

SillyTavern exposes file endpoints at `/api/files/`:

```javascript
// Upload/save a file
const response = await fetch('/api/files/upload', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: formData,  // FormData with file content
});

// Verify a file exists
const response = await fetch('/api/files/verify', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({ filename: 'story-memory/char_chatid.md' }),
});
```

### Recommended Pattern for Extension Data Files

For extensions needing per-chat files (e.g., markdown memory files), the simplest approach for third-party extensions is to store serialized content in `chatMetadata`:

```javascript
// Save memory data as serialized markdown in chat metadata
context.chatMetadata.storyMemory = {
    version: 1,
    markdownContent: fullMarkdownString,
    lastModified: Date.now(),
};
context.saveMetadata();

// Load on chat switch
eventSource.on(eventTypes.CHAT_CHANGED, () => {
    const ctx = SillyTavern.getContext();
    const saved = ctx.chatMetadata?.storyMemory;
    if (saved) {
        parseMemoryFile(saved.markdownContent);
    }
});
```

For larger data or external file access, consider a server plugin (loaded via `src/plugin-loader.js`) that registers custom Express routes.

---

## Group Chat Integration

SillyTavern supports group chats where multiple characters interact. Extensions must handle both solo and group modes.

### Detecting Group Chat Mode

```javascript
import { selected_group, is_group_generating, groups } from '../../../group-chats.js';

if (selected_group) {
    // Currently in a group chat
    const groupId = selected_group;                    // Group ID string
    const group = groups.find(g => g.id === groupId);  // Full group object
    const memberIds = group.members;                   // Array of character avatar filenames
} else {
    // Solo (1:1) chat
}
```

### Via Context API

```javascript
const context = SillyTavern.getContext();
if (context.groupId) {
    // Group chat mode
}
```

### Waiting for Group Generation

In group chats, generation cycles through multiple characters. Wait for completion before proceeding:

```javascript
import { waitUntilCondition } from '../../../utils.js';
import { is_group_generating } from '../../../group-chats.js';

if (selected_group) {
    await waitUntilCondition(() => is_group_generating === false, 1000, 10);
}
// Safe to proceed — all group members have finished generating
```

### Accessing Group Member Data

```javascript
const context = SillyTavern.getContext();
const group = groups.find(g => g.id === selected_group);

// Get character objects for all group members
const memberCharacters = group.members
    .map(avatar => context.characters.find(c => c.avatar === avatar))
    .filter(Boolean);

// Collect all descriptions (useful for arc generation context)
const descriptions = memberCharacters.map(c => `${c.name}: ${c.description}`).join('\n\n');
```

### Scoping Data by Chat Type

For extensions with per-chat storage, generate unique identifiers:

```javascript
function getMemoryFileId() {
    const context = SillyTavern.getContext();
    if (selected_group) {
        const group = groups.find(g => g.id === selected_group);
        return `${sanitize(group.name)}_${context.chatId}`;
    } else {
        return `${sanitize(context.characters[context.characterId].name)}_${context.chatId}`;
    }
}
```

---

## Accessing Character & World Info Data

### Character Card Fields

```javascript
const context = SillyTavern.getContext();
const char = context.characters[context.characterId];
```

| Field | Description |
|-------|-------------|
| `char.name` | Character display name |
| `char.description` | Character description / personality card |
| `char.personality` | Personality summary |
| `char.scenario` | Scenario / setting description |
| `char.first_mes` | Default first message (greeting) |
| `char.mes_example` | Example dialogue |
| `char.system_prompt` | Character-specific system prompt override |
| `char.post_history_instructions` | Jailbreak / post-history instructions |
| `char.tags` | Array of tag strings |

### User Persona Description

```javascript
import { power_user } from '../../../power-user.js';

const personaDescription = power_user.persona_description;  // String or empty
const personaPosition = power_user.persona_description_position;
```

### World Info / Lorebook Access

Get activated World Info text (entries whose keywords matched the current context):

```javascript
const context = SillyTavern.getContext();

// Get the full resolved World Info prompt text (all activated entries combined)
if (typeof context.getWorldInfoPrompt === 'function') {
    const worldInfoText = await context.getWorldInfoPrompt();
}
```

Listen for World Info activation events to access individual entries:

```javascript
eventSource.on(eventTypes.WORLD_INFO_ACTIVATED, (activatedEntries) => {
    // activatedEntries contains the WI entries that matched during prompt building
    // Use for contextual awareness of what lore is active
});
```

### Assembling Full Context for LLM Calls

When building prompts that need rich context (e.g., arc generation), combine multiple sources:

```javascript
function assembleNarrativeContext() {
    const context = SillyTavern.getContext();
    const parts = [];

    // Character description(s)
    if (selected_group) {
        const group = groups.find(g => g.id === selected_group);
        group.members.forEach(avatar => {
            const char = context.characters.find(c => c.avatar === avatar);
            if (char) parts.push(`Character — ${char.name}:\n${char.description}`);
        });
    } else {
        const char = context.characters[context.characterId];
        parts.push(`Character — ${char.name}:\n${char.description}`);
    }

    // User persona
    if (power_user.persona_description) {
        parts.push(`User persona:\n${power_user.persona_description}`);
    }

    return parts.join('\n\n');
}
```

---

## Template Substitution (Macros)

SillyTavern provides macro substitution for resolving template variables like `{{char}}` and `{{user}}`.

### Standard Macros

```javascript
import { substituteParams } from '../../../../script.js';

const resolved = substituteParams('{{char}} looks at {{user}} and smiles.');
// → "Alice looks at Bob and smiles." (using current character/user names)
```

Common built-in macros: `{{char}}`, `{{user}}`, `{{time}}`, `{{date}}`, `{{idle_duration}}`, `{{lastMessage}}`, `{{lastMessageId}}`, `{{newline}}`, `{{trim}}`.

### Extended Macros with Custom Variables

```javascript
import { substituteParamsExtended } from '../../../../script.js';

const template = `Summarize scene {{sceneNumber}} for {{char}}.
Previous scene: {{previousScene}}`;

const resolved = substituteParamsExtended(template, {
    sceneNumber: '5',
    previousScene: lastSceneSummary,
});
// Resolves both standard ({{char}}) and custom ({{sceneNumber}}) macros
```

This is the recommended approach for prompt templates — define templates with placeholder variables and resolve them at runtime with `substituteParamsExtended`.

---

## Advanced Slash Command Registration

The modern pattern for registering slash commands uses `SlashCommandParser` with typed arguments:

```javascript
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
import { SlashCommand } from '../../../slash-commands/SlashCommand.js';
import { ARGUMENT_TYPE, SlashCommandArgument, SlashCommandNamedArgument }
    from '../../../slash-commands/SlashCommandArgument.js';

SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: 'sm-fact',
    callback: async (namedArgs, unnamedArgs) => {
        // unnamedArgs is the raw string after the command name
        // namedArgs is an object of --key=value pairs
        const parts = unnamedArgs.split('|').map(s => s.trim());
        if (parts.length < 3) return 'Usage: /sm-fact subject | state | keywords';
        addFact(parts[0], parts[1], parts[2]);
        return '';
    },
    unnamedArgumentList: [
        SlashCommandArgument.fromProps({
            description: 'subject | state | keywords',
            typeList: [ARGUMENT_TYPE.STRING],
            isRequired: true,
        }),
    ],
    helpString: 'Manually adds a persistent fact entry.',
}));
```

### Command with Named Arguments

```javascript
SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: 'sm-retry',
    callback: async (namedArgs, unnamedArgs) => {
        const step = unnamedArgs?.trim() || 'all';
        await retryPipelineStep(step);
        return '';
    },
    unnamedArgumentList: [
        SlashCommandArgument.fromProps({
            description: 'Pipeline step to retry: scene, facts, or arc',
            typeList: [ARGUMENT_TYPE.STRING],
            isRequired: false,
        }),
    ],
    aliases: [],
    helpString: 'Re-runs a specific pipeline step for the most recent scene break.',
}));
```

### Key `SlashCommand.fromProps` Options

| Option | Type | Description |
|--------|------|-------------|
| `name` | `string` | Command name (used as `/name`) |
| `callback` | `function` | `(namedArgs, unnamedArgs) => string` handler |
| `aliases` | `string[]` | Alternative command names |
| `helpString` | `string` | Shown in `/help` |
| `unnamedArgumentList` | `SlashCommandArgument[]` | Positional argument definitions |
| `namedArgumentList` | `SlashCommandNamedArgument[]` | Named `--key=value` argument definitions |

---

## Multi-Step LLM Pipelines

For extensions that run multiple sequential LLM calls (e.g., summarize → extract facts → generate arc), use a structured pipeline pattern.

### Pipeline Structure

```javascript
import { deactivateSendButtons, activateSendButtons } from '../../../../script.js';

let pipelineRunning = false;

async function runSceneBreakPipeline(sceneMessages) {
    if (pipelineRunning) return;
    pipelineRunning = true;
    deactivateSendButtons();  // Lock UI to prevent user generation during pipeline

    const results = { summary: null, facts: null, arc: null };

    try {
        // Step 1: Scene Summary
        updatePipelineStatus('Step 1/3: Generating scene summary...');
        try {
            results.summary = await generateSceneSummary(sceneMessages);
        } catch (err) {
            console.error('Scene summary failed:', err);
            showStepWarning('scene', err.message);
            // Continue to next step — failures are independent
        }

        // Step 2: Fact Extraction
        updatePipelineStatus('Step 2/3: Extracting facts...');
        try {
            const input = results.summary || sceneMessages;  // Fallback to raw if summary failed
            results.facts = await extractFacts(input);
        } catch (err) {
            console.error('Fact extraction failed:', err);
            showStepWarning('facts', err.message);
        }

        // Step 3: Arc Generation (conditional)
        if (shouldGenerateArc()) {
            updatePipelineStatus('Step 3/3: Generating arc directive...');
            try {
                results.arc = await generateArcDirective();
            } catch (err) {
                console.error('Arc generation failed:', err);
                showStepWarning('arc', err.message);
            }
        }
    } finally {
        pipelineRunning = false;
        activateSendButtons();  // Always unlock UI
        updatePipelineStatus('idle');
    }

    return results;
}
```

### Key Principles

1. **Independent failure** — each step has its own try/catch. A failed step never blocks subsequent steps.
2. **UI lockout** — `deactivateSendButtons()` / `activateSendButtons()` prevents user generation during pipeline.
3. **Guard flag** — `pipelineRunning` prevents concurrent pipeline execution.
4. **Progress feedback** — update a status indicator after each step.
5. **Graceful degradation** — if step 1 fails, step 2 can use fallback input (e.g., raw messages instead of summary).
6. **Always unlock** — use `finally` to ensure UI is unlocked even on unexpected errors.

### Parsing Structured LLM Output

For pipelines that expect structured output (e.g., pipe-delimited facts), validate and filter:

```javascript
function parseFacts(rawOutput) {
    return rawOutput
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('FACT |'))
        .map(line => {
            const parts = line.split('|').map(s => s.trim());
            if (parts.length !== 4) return null;
            return { subject: parts[1], state: parts[2], keywords: parts[3] };
        })
        .filter(Boolean);
}
```

---

## Popout / Draggable Panels

Extensions can create floating panels that persist their position across reloads.

### Loading HTML Templates

For complex UI, store HTML in separate template files and load them:

```javascript
import { renderExtensionTemplateAsync } from '../../../extensions.js';

// Loads HTML from your extension's directory: extensions/third-party/my-extension/panel.html
const panelHtml = await renderExtensionTemplateAsync('third-party/my-extension', 'panel', {});
document.body.insertAdjacentHTML('beforeend', panelHtml);
```

### Making Panels Draggable

```javascript
import { dragElement } from '../../../RossAscends-mods.js';
import { loadMovingUIState } from '../../../power-user.js';

// After inserting the panel into the DOM:
const panel = document.getElementById('sm_panel');
dragElement($(panel));       // Enable drag (uses jQuery wrapper)
loadMovingUIState();         // Restore saved position from last session
```

> **Note**: `dragElement` expects a jQuery object. The panel element needs an `id` attribute for position persistence to work.

### Popout Pattern

ST extensions commonly support "popping out" their panel from the extensions sidebar into a floating window:

```javascript
const popoutButton = document.getElementById('sm_popout_button');
popoutButton.addEventListener('click', () => {
    const panel = document.getElementById('sm_panel');
    panel.classList.toggle('popout');  // Toggle CSS class that changes positioning
    // Store popout state
    extensionSettings.popout = panel.classList.contains('popout');
    saveSettingsDebounced();
});
```

---

## Best Practices Summary

1. **Always get a fresh context** — call `SillyTavern.getContext()` when you need it, don't cache across async boundaries
2. **Guard all DOM operations** — elements may not exist; always null-check
3. **Prevent duplicate UI** — check for existing elements before creating buttons/panels
4. **Use chatMetadata for per-chat state** and **extensionSettings for global preferences**
5. **Merge with defaults on load** — `{ ...defaults, ...saved }` handles new settings gracefully
6. **Lock state during generation** — use guard flags to prevent `MESSAGE_EDITED` from overwriting your data
7. **Use event-driven architecture** — subscribe to ST events, don't poll
8. **Provide graceful fallbacks** — check if APIs exist before calling them
9. **Scope your CSS** — prefix all IDs/classes to avoid conflicts
10. **Keep it lean** — a single `index.js` and `style.css` is often sufficient. No build tools needed
11. **No external dependencies** — SillyTavern extensions run in the browser; prefer vanilla JS + jQuery (already available)
12. **Check eventType existence** — guard with `if (eventTypes.EVENT_NAME)` before subscribing, since event types may differ across ST versions
13. **`MESSAGE_EDITED` messageId is a string** — always `parseInt()` when comparing to numeric indices
14. **Auto-confirm active edits** — if your action modifies message state, confirm any in-progress edits first to avoid data loss
15. **Check `#send_textarea` for typed input** — the user may have text queued; handle it or warn before overwriting
16. **Use the 1000ms unlock delay** — after `MESSAGE_RECEIVED`, delay unlocking guard flags to catch post-generation `MESSAGE_EDITED` events
17. **Add debug logging** — a conditional `debug()` function controlled by a setting costs nothing when off and saves hours of troubleshooting
18. **Multiple button placements** — add buttons to both the hamburger menu (`send_form`) and quick-action bar (`rightSendForm`) for discoverability
19. **Hide/show buttons during generation** — toggle `display` on quick-action buttons via `GENERATION_STARTED`/`GENERATION_ENDED` to prevent double-triggers
20. **Use `generateRaw` for structured prompts** — when you need full control over prompt format (summaries, extractions); use `generateQuietPrompt` when you need character context
21. **Use unique injection keys** — when calling `setExtensionPrompt` multiple times, each content type needs its own key string to avoid overwrites
22. **Display token budgets** — use `getTokenCountAsync` to show users how many tokens their memory/injection content consumes
23. **Handle pipeline failures independently** — in multi-step LLM pipelines, each step should have its own try/catch so one failure doesn't block the rest
24. **Check `selected_group` for group awareness** — never assume solo chat; guard group-specific logic behind `if (selected_group)` checks
25. **Use `substituteParamsExtended` for prompt templates** — resolve both standard ST macros and custom variables in a single call
26. **Lock UI during LLM pipelines** — call `deactivateSendButtons()` before multi-step generation and `activateSendButtons()` in a `finally` block
27. **Parse LLM output defensively** — validate structured output line-by-line and silently discard malformed lines rather than failing entirely

---

## Build & Test

- **No build step** — extensions are loaded directly from source
- **Install location** — clone into `SillyTavern/data/default-user/extensions/third-party/`
- **Reload** — refresh the ST page to pick up changes
- **Debug** — use browser DevTools console; ST logs events and errors there
