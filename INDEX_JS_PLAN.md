# index.js Implementation Plan

## Overview

Merge Possession and Phrasing! into a single `index.js` with an integrated
workflow: when a user is possessing a character and triggers Phrasing!, the
generation runs as the possessed character (not as a user impersonate) and the
seed text is attributed to the possessed character's name.

---

## Imports

```javascript
import { selected_group, is_group_generating, groups } from '../../../group-chats.js';
import { renderExtensionTemplateAsync } from '../../../extensions.js';
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
import { SlashCommand } from '../../../slash-commands/SlashCommand.js';
import { ARGUMENT_TYPE, SlashCommandArgument } from '../../../slash-commands/SlashCommandArgument.js';
import {
    setExtensionPrompt,
    extension_prompt_types,
    extension_prompt_roles,
    substituteParams,
    generateQuietPrompt,
} from '../../../../script.js';
```

Key addition: `generateQuietPrompt` — used for the possessed+phrasing flow to
generate as the character (not impersonate as the user).

---

## Constants

```javascript
const EXTENSION_NAME = 'Saints-Silly-Extensions';  // Must match folder name

// Possession
const POSSESSION_METADATA_KEY = 'possession';

// Phrasing
const PHRASING_INJECTION_KEY = 'phrasing_instruction';
const DEFAULT_PHRASING_PROMPT = `[Rewrite the following message. Preserve its meaning, intent, and any dialogue, but enrich it with narration, action, and detail consistent with the character and the current scene. Do not continue the scene beyond what the original message describes.

{{phrasingSeed}}]`;
```

---

## State

```javascript
// Possession state
let possessedCharName = null;   // Display name of possessed character, or null
let generationGuard = false;    // True while any generation is in progress

// Phrasing state
let phrasingActive = false;     // True while a Phrasing!-triggered generation is running

// Combined settings (single object, stored under one extensionSettings key)
const defaultSettings = {
    possessionEnabled: true,
    possessionShowToast: true,
    possessionDebugMode: false,
    phrasingEnabled: true,
    phrasingDebugMode: false,
};
let settings = { ...defaultSettings };
```

---

## Shared Helpers

```javascript
function possessionDebug(...args)   // logs with 'POSSESSION:' prefix if possessionDebugMode
function phrasingDebug(...args)     // logs with 'PHRASING:' prefix if phrasingDebugMode
function toast(message, type)       // toastr wrapper, respects possessionShowToast
function getContext()                // SillyTavern.getContext() wrapper
function isPossessing()             // returns true if possessionEnabled AND possessedCharName !== null
```

---

## Section 1: Settings Persistence

```javascript
function saveSettings()         // saves settings to context.extensionSettings[EXTENSION_NAME]
function loadSettings()         // loads from context.extensionSettings[EXTENSION_NAME]
```

---

## Section 2: Possession — Persistence

```javascript
function savePossessionState()  // saves possessedCharName to context.chatMetadata.possession
function loadPossessionState()  // loads from context.chatMetadata.possession
```

---

## Section 3: Possession — Character Utilities

```javascript
function getPossessedCharacter()         // finds character object by possessedCharName
function validatePossessedCharInGroup()  // checks if possessed char still in group, clears if removed
```

---

## Section 4: Possession — Core Logic

```javascript
function setPossession(charName)         // sets possessedCharName, saves state, syncs UI, toasts
```

---

## Section 5: Possession — Message Posting

```javascript
async function postPossessedMessage(text)
```

Creates a character message object attributed to the possessed character and adds
it to the chat. Used by the Continue interception flow. Sets:
- `is_user: false`
- `name: char.name`
- `force_avatar: /characters/{avatar}`
- `extra.possession: true`
- For group: `original_avatar`, `is_name`

---

## Section 6: Possession — Send Handling (MESSAGE_SENT event)

```javascript
async function onMessageSent(messageIndex)
```

Converts user message to character message in-place when possession is active.
Identical to original Possession extension behavior.

---

## Section 7: Possession — Continue Interception

```javascript
function handleContinueIntercept(event)
async function executePossessedContinue(text)
function attachContinueInterceptor()
```

Intercepts Continue button when possession is active and textarea has text.
Posts possessed message then triggers `/continue`.

---

## Section 8: Possession — UI (Group Radio Buttons)

```javascript
function injectGroupRadioButtons()
function syncGroupRadioButtons()
function removeGroupRadioButtons()
```

Adds radio-style toggle circles to each group member entry.
Click to possess, click again to unpossess.

---

## Section 9: Possession — UI (Solo Chat Button)

```javascript
function injectSoloButton()
function syncSoloButton()
function removeSoloButton()
```

Ghost icon button in character panel toolbar (or rightSendForm fallback).

---

## Section 10: Possession — UI Sync

```javascript
function syncAllPossessionUI()
```

Master sync: removes stale UI, injects appropriate controls based on context
(group vs solo), updates active states.

---

## Section 11: Phrasing — Prompt Management

```javascript
function getActivePrompt()              // chat metadata prompt → default fallback
function formatSeedWithSpeaker(seedText, isUser, speakerName)  // "Name: text"
function assemblePrompt(seedText)       // replace {{phrasingSeed}}, resolve ST macros
```

---

## Section 12: Phrasing — Injection

```javascript
function injectPhrasingPrompt(assembledPrompt)  // setExtensionPrompt at depth 0, SYSTEM
function clearPhrasingInjection()                // clear the ephemeral injection
```

---

## Section 13: Phrasing — Button Visibility

```javascript
function hideAllPhrasingButtons()
function showAllPhrasingButtons()
function applyPhrasingEnabledState()
```

---

## Section 14: Phrasing — Primary Flow (INPUT ENRICHMENT)

### THIS IS WHERE THE KEY INTEGRATION LIVES

```javascript
async function doPrimaryFlow(seedText)
```

**Normal path** (not possessing):
1. Assemble prompt with seed text
2. Inject via `setExtensionPrompt` at depth 0
3. Click `#option_impersonate` — AI generates as user persona
4. `waitForGenerationEnd()` — result lands in textarea
5. Return result; finally block clears injection

**Possessed path** (possessing a character):
1. Assemble prompt with seed text (already attributed to possessed char name)
2. Call `generateQuietPrompt({ quietPrompt: assembled })` — AI generates as
   character through the normal pipeline (character card, chat history, etc.)
   but does NOT add the result to chat
3. Manually place result in `#send_textarea`
4. Return result; finally block cleans up

The caller (`onInputPhrasingClick`) is responsible for formatting the seed:
- Not possessing: `formatSeedWithSpeaker(seedText, true)` → `"UserName: text"`
- Possessing: `formatSeedWithSpeaker(seedText, false, possessedCharName)` → `"CharName: text"`

---

## Section 15: Phrasing — Swipe Mode

```javascript
async function doSwipeMode(messageIndex)
```

Reads the currently displayed swipe as seed, injects phrasing prompt, triggers
swipe_right for a new AI-generated variant. Same as original — no special
possession handling needed because swipe mode operates on existing messages
that already have the correct speaker attribution.

---

## Section 16: Phrasing — Wait Helper

```javascript
function waitForGenerationEnd()
```

Returns a promise resolving when GENERATION_ENDED or GENERATION_STOPPED fires.
5-minute safety timeout.

---

## Section 17: Phrasing — Button Handlers

```javascript
async function onInputPhrasingClick()
```

Handler for input area button and hamburger menu.

**Integration point**: checks `isPossessing()` to decide seed attribution:
```javascript
const formattedSeed = isPossessing()
    ? formatSeedWithSpeaker(seedText, false, possessedCharName)
    : formatSeedWithSpeaker(seedText, true);
await doPrimaryFlow(formattedSeed);
```

```javascript
async function onMessagePhrasingClick(messageIndex)  // Handler for message action button
```

---

## Section 18: Phrasing — Message Action Button Management

```javascript
function updateMessageActionButtons()
```

Adds Phrasing! button to last message's action area, removes from all others.

---

## Section 19: Phrasing — Prompt Settings UI

```javascript
function loadPromptTextarea()
function onSaveToChat()
function onRestoreDefault()
```

---

## Section 20: Merged Event Handlers

```javascript
function onGenerationStarted() {
    generationGuard = true;           // Possession
    hideAllPhrasingButtons();         // Phrasing
}

function onGenerationEnded() {
    generationGuard = false;          // Possession
    syncAllPossessionUI();            // Possession
    if (phrasingActive) {             // Phrasing
        clearPhrasingInjection();
        phrasingActive = false;
    }
    showAllPhrasingButtons();         // Phrasing
}

function onGenerationStopped() {
    // Same as onGenerationEnded
}

function onChatChanged() {
    loadPossessionState();            // Possession
    syncAllPossessionUI();            // Possession
    loadPromptTextarea();             // Phrasing
    setTimeout(() => updateMessageActionButtons(), 100);  // Phrasing
}

function onGroupUpdated() {
    validatePossessedCharInGroup();   // Possession
    removeGroupRadioButtons();        // Possession
    injectGroupRadioButtons();        // Possession
    syncGroupRadioButtons();          // Possession
}

function onCharacterPageLoaded() {
    if (!selected_group) {            // Possession
        injectSoloButton();
        syncSoloButton();
    }
}

function onMessageRendered() {
    setTimeout(() => updateMessageActionButtons(), 50);  // Phrasing
}

function onGroupWrapperFinished() {
    syncAllPossessionUI();            // Possession
}
```

---

## Section 21: Slash Commands

### /possess [name]
- No args + possessed: show current
- No args + solo + not possessed: toggle possession of active character
- With args: find matching character (group: among members, solo: active char)

### /unpossess
- Clear possession

### /phrasing [text]
- With text: Primary Flow (respects possession state for seed attribution)
- Without text: Swipe-Mode on last message

---

## Section 22: Settings Panel Binding

```javascript
async function injectSettingsPanel()
```

Uses `renderExtensionTemplateAsync` to load `settings.html`.
Binds change handlers for all checkboxes:
- `#possession_enabled` → `settings.possessionEnabled`
- `#possession_show_toast` → `settings.possessionShowToast`
- `#possession_debug_mode` → `settings.possessionDebugMode`
- `#phrasing_enabled` → `settings.phrasingEnabled`
- `#phrasing_debug_mode` → `settings.phrasingDebugMode`

Plus prompt buttons: `#phrasing_save_to_chat`, `#phrasing_restore_default`.

---

## Section 23: Initialization

```javascript
jQuery(async () => {
    loadSettings();
    loadPossessionState();
    await injectSettingsPanel();

    // Possession UI
    attachContinueInterceptor();

    // Phrasing UI
    createInputAreaButton();
    createHamburgerMenuItem();

    // Subscribe to events (merged handlers)
    const { eventSource, eventTypes } = getContext();
    eventSource.on(eventTypes.CHAT_CHANGED, onChatChanged);
    eventSource.on(eventTypes.GROUP_UPDATED, onGroupUpdated);
    eventSource.on(eventTypes.CHARACTER_PAGE_LOADED, onCharacterPageLoaded);
    eventSource.on(eventTypes.GENERATION_STARTED, onGenerationStarted);
    eventSource.on(eventTypes.GENERATION_ENDED, onGenerationEnded);
    eventSource.on(eventTypes.GENERATION_STOPPED, onGenerationStopped);
    eventSource.on(eventTypes.GROUP_WRAPPER_FINISHED, onGroupWrapperFinished);
    eventSource.on(eventTypes.MESSAGE_SENT, onMessageSent);
    eventSource.on(eventTypes.USER_MESSAGE_RENDERED, onMessageRendered);
    eventSource.on(eventTypes.CHARACTER_MESSAGE_RENDERED, onMessageRendered);

    // Slash commands
    registerPossessionSlashCommands();
    registerPhrasingSlashCommand();

    // Initial state
    syncAllPossessionUI();
    applyPhrasingEnabledState();
    loadPromptTextarea();
});
```

---

## Integration Summary

The key integration between Possession and Phrasing happens in two places:

### 1. Seed Text Attribution (`onInputPhrasingClick` and `/phrasing` slash command)

When `isPossessing()` is true, the seed text is formatted as:
```
"PossessedCharName: user's typed text"
```
Instead of the normal:
```
"UserPersonaName: user's typed text"
```

### 2. Generation Method (`doPrimaryFlow`)

When `isPossessing()` is true:
- Skip `setExtensionPrompt` injection
- Skip clicking `#option_impersonate`
- Instead call `generateQuietPrompt({ quietPrompt: assembled })`
- This generates through the character pipeline (character card, chat history,
  lorebook, Author's Note, etc.) — the AI writes as the character, not the user
- Manually place the result string in `#send_textarea`
- User reviews and sends; Possession's `MESSAGE_SENT` handler converts it to a
  possessed character message as usual

### Why `generateQuietPrompt`?

- **Impersonate** generates as the user's persona. Wrong voice for possession.
- **generateQuietPrompt** generates through the normal character pipeline.
  The phrasing instruction (passed as `quietPrompt`) guides the AI to rewrite
  the seed text. The seed is attributed to the possessed character's name, so
  the AI naturally writes in that character's voice.
- The result is returned as a string without adding to chat — perfect for
  placing in the textarea for user review.
