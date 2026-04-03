# Assisted Character Creation — Implementation Plan

## Context

The user wants a new feature for Saints-Silly-Extensions that helps users create SillyTavern characters by using LLM generation to fill in individual character attributes one at a time. The core idea: a modal with a schema-driven form where each field has an "Assist" button that sends the user's seed text + a character brief to the LLM via `generateRaw`, replacing the field content with the AI's output. The completed form compiles into a structured character description dumped into ST's description field (and the name into ST's name field).

### User Decisions
- **Output target**: All compiled fields go into the ST description field only. Character name also fills the ST name field.
- **Schema format**: Object with `order` property per field (not array-based).
- **Input types**: Schema-defined per field (`inputType: "text"` or `"textarea"`).
- **YOLO mode**: Single LLM call, output dumped directly into description field as-is (no parsing). Strip non-informative schema metadata before sending to LLM.

---

## File Organization

| File | Purpose |
|------|---------|
| `lib/assisted-character-creation.js` | All feature logic: modal, form generation, LLM calls, schema management |
| `lib/default-character-schema.js` | Default schema definition (exported as a JS object) |
| `settings.html` | Add ACC settings section (enable toggle, debug toggle, schema selector, import/export) |
| `style.css` | Add ACC modal and form styles |
| `index.js` | Register ACC module, wire events, add settings |

---

## Character Schema Format

```js
{
    "schemaName": "Default Character Schema",
    "fields": {
        "characterName": {
            "order": 1,
            "label": "Character Name",
            "description": "Full name, aliases/titles in parentheses if any.",
            "inputType": "text",
            "prose": false,
            "prompt": "Generate a character name...\n\nCharacter Brief:\n{{context}}\n\nUser's notes for this field:\n{{seedText}}"
        },
        "backstorySummary": {
            "order": 15,
            "label": "Backstory Summary",
            "description": "Origin, key events, current situation.",
            "inputType": "textarea",
            "prose": true,
            "prompt": "Write a backstory summary for this character...\n\nCharacter Brief:\n{{context}}\n\nOther fields already defined:\n{{filledFields}}\n\nUser's notes for this field:\n{{seedText}}"
        }
        // ... remaining fields follow same pattern
    }
}
```

### Schema Design Decisions
- **`order`** — Integer controlling form layout and compiled output order.
- **`label`** — Display name in the form AND the key used in the compiled output (e.g., `Character Name: <value>`).
- **`description`** — Placeholder/helper text shown in the form field.
- **`inputType`** — `"text"` for single-line, `"textarea"` for multi-line.
- **`prose`** — Boolean. `false` = terse/concise output (comma-separated descriptors). `true` = descriptive prose (sentences/paragraphs). Controls both the system prompt style instruction and post-processing (non-prose fields are trimmed to first newline).
- **`prompt`** — Template with macros: `{{seedText}}` (user's field input), `{{context}}` (character brief), `{{filledFields}}` (other completed fields for cross-referencing).
- **`{{filledFields}}`** — At generation time, we compose a summary of all other non-empty fields so the LLM can maintain consistency across attributes. This is critical for coherent character generation.

### Schema Validation Rules
1. Must have `schemaName` (string).
2. Must have `fields` (object, non-empty).
3. Each field must have: `order` (number), `label` (string), `inputType` ("text" | "textarea"), `prose` (boolean), `prompt` (string containing `{{seedText}}`).
4. `description` is optional (defaults to empty string). `prose` defaults to `false` if missing.
5. No duplicate `order` values.

---

## Compiled Output Format

When the user clicks "Done", fields are compiled in order into:

```
{
Character Name: James Tiberius Kirk (Captain Kirk),
Age: 34, early middle-age,
Gender & Pronouns: Male, he/him,
...
}
```

- Empty fields are omitted from the output.
- The `label` property is the key in the compiled output.
- Character Name value also goes into ST's `#character_name_pole` (or equivalent name input).

---

## Modal UI Design

### Structure
```
┌─────────────────────────────────────────────┐
│  Assisted Character Creation          [X]   │
│─────────────────────────────────────────────│
│  Schema: [Default ▾]                        │
│                                             │
│  Character Brief:                           │
│  ┌─────────────────────────────────────┐    │
│  │ I want to create Captain Kirk...    │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─ Character Name ────────────────────┐    │
│  │ [input field          ] [✨][↺][⟲] │    │
│  └─────────────────────────────────────┘    │
│  ┌─ Age ───────────────────────────────┐    │
│  │ [input field          ] [✨][↺][⟲] │    │
│  └─────────────────────────────────────┘    │
│  ...more fields...                          │
│                                             │
│  [YOLO Generate All]                        │
│  [Cancel]                        [Done]     │
└─────────────────────────────────────────────┘
```

### Per-Field Button States
- **Idle**: Show [Assist ✨] button. [Retry ↺] and [Reset ⟲] hidden.
- **Generating (this field)**: Field disabled. [Assist] becomes [Stop ■]. [Retry] and [Reset] hidden.
- **Generating (other field)**: [Assist] button disabled/dimmed. No interaction allowed.
- **Post-generation**: Field enabled. [Assist ✨] visible. [Retry ↺] and [Reset ⟲] appear.
- **Retry**: Re-runs generation with the *original seed text* (stored per field).
- **Reset**: Reverts field to the original seed text and clears hasGenerated state.

### State Model
```js
// Module-level — enforces one-at-a-time
let activeFieldKey = null;  // Which field is currently generating, or null

// Per-field state (keyed by field key)
fieldStates[fieldKey] = {
    originalSeed: "",      // What the user typed before first Assist
    currentValue: "",      // Current field value
    hasGenerated: false,   // Has been assisted at least once
}
```

---

## LLM Generation Approach

### Per-Field Generation
```js
import { generateRaw } from '../../../../script.js';
import { removeReasoningFromString } from '../../../reasoning.js';

async function generateFieldValue(fieldKey, schema, fieldStates, characterBrief) {
    const field = schema.fields[fieldKey];
    const seedText = fieldStates[fieldKey].currentValue || "";
    
    // Build {{filledFields}} from other non-empty fields
    const filledFields = buildFilledFieldsSummary(schema, fieldStates, fieldKey);
    
    // Resolve prompt template
    let prompt = field.prompt
        .replace(/\{\{seedText\}\}/g, seedText || "(no user input)")
        .replace(/\{\{context\}\}/g, characterBrief || "(no brief provided)")
        .replace(/\{\{filledFields\}\}/g, filledFields || "(none yet)");
    
    // Prose vs. terse instruction based on field's prose flag
    const styleInstruction = field.prose
        ? "Write in descriptive prose."
        : "Be brief and concise. Use comma-separated descriptors, not full sentences.";
    
    const systemPrompt = `You are a character creation assistant. ${styleInstruction} Do not include labels, explanations, or extra formatting.`;
    
    // Use prefill to strongly imply the LLM must fill in this specific field value.
    // The generation should be stopped at newline to get just the field value.
    const prefill = `${field.label}: `;
    
    const result = await generateRaw({
        prompt,
        systemPrompt,
        responseLength: field.prose ? 500 : 150,
        prefill,
    });
    
    // Strip the prefill echo if the model repeats it, strip reasoning, trim
    let cleaned = removeReasoningFromString(result).trim();
    if (cleaned.startsWith(field.label + ':')) {
        cleaned = cleaned.substring(field.label.length + 1).trim();
    }
    // Trim to first newline for non-prose fields (terse single-value answers).
    // Note: generateRaw doesn't expose stop_sequences, so we can't halt at
    // newline server-side. Instead we post-process and keep a short
    // responseLength (150 tokens) so non-prose fields finish quickly.
    if (!field.prose && cleaned.includes('\n')) {
        cleaned = cleaned.split('\n')[0].trim();
    }
    return cleaned;
}
```

### Stop/Abort Generation
Click ST's native "Stop Generation" button to actually halt the server-side generation:
```js
function stopGeneration() {
    const stopBtn = document.getElementById('mes_stop');
    if (stopBtn) stopBtn.click();
}
```
This is preferred over a guard-flag approach because it frees the server immediately rather than letting it continue generating in the background. Since we enforce one-field-at-a-time generation, there's no risk of the stop interfering with other concurrent operations.

### One Field at a Time
A module-level `activeFieldKey` tracks which field (if any) is currently generating. All other Assist buttons are disabled while a generation is in progress. No queuing — clicking Assist on another field while one is generating does nothing.

### YOLO Mode
```js
async function yoloGenerate(schema, characterBrief) {
    // Build a clean schema representation (labels + descriptions only, no prompts/order)
    const fieldList = getOrderedFields(schema)
        .map(([key, f]) => `${f.label}: ${f.description}`)
        .join("\n");
    
    const prompt = `Create a character description using this format. Fill in every field.\n\nCharacter Brief:\n${characterBrief}\n\nFormat:\n{\n${fieldList}\n}`;
    const systemPrompt = "You are a character creation assistant. Generate a complete character description in the exact format requested.";
    
    const result = await generateRaw({ prompt, systemPrompt, responseLength: 2000 });
    return removeReasoningFromString(result).trim();
}
```
YOLO output goes directly into the ST description field — no parsing.

---

## Reverse Mapping (Existing Character → Form)

When the user opens ACC while editing an existing character, offer to parse the current description back into form fields via an LLM call:

```js
async function reverseMapDescription(description, schema) {
    const fieldList = getOrderedFields(schema)
        .map(([key, f]) => `${key}: ${f.label} — ${f.description}`)
        .join("\n");
    
    const prompt = `Parse this character description into the following fields. For each field, output exactly: FIELD_KEY | value\nIf a field has no matching content, output: FIELD_KEY | (empty)\n\nFields:\n${fieldList}\n\nDescription:\n${description}`;
    
    const result = await generateRaw({ prompt, systemPrompt: "..." });
    // Parse line-by-line, match FIELD_KEY | value pattern
    // Populate fieldStates with parsed values
}
```

This is inherently fuzzy — results populate the form for user review/editing, not direct application.

---

## Schema Storage & Management

### Settings Structure
```js
const defaultSettings = {
    // ...existing settings...
    accEnabled: true,
    accDebugMode: false,
    accActiveSchemaName: "Default Character Schema",
    accCustomSchemas: {},  // { "schemaName": schemaObject, ... }
};
```

- **Default schema**: Always available, defined in `lib/default-character-schema.js`, not stored in settings.
- **Custom schemas**: Stored in `extensionSettings` under `accCustomSchemas`, keyed by name.
- **Active schema**: Selected by name in settings. Falls back to default if not found.

### Import/Export
- **Import**: File input (`<input type="file" accept=".json">`) → read → validate → store in `accCustomSchemas`.
- **Export**: Serialize active schema to JSON → trigger browser download.
- **Delete**: Remove custom schema from `accCustomSchemas`. Can't delete the default.

---

## Integration with index.js

### New Settings
```js
const defaultSettings = {
    // existing...
    accEnabled: true,
    accDebugMode: false,
    accActiveSchemaName: "Default Character Schema",
    accCustomSchemas: {},
};
```

### Event Subscriptions
```js
// CHARACTER_PAGE_LOADED — inject the ACC launch button into #form_create
eventSource.on(eventTypes.CHARACTER_PAGE_LOADED, onCharacterPageLoadedHandler);
```

The existing `onCharacterPageLoadedHandler` in `index.js` already fires on this event (for Possession's solo button). We'll extend it to also inject the ACC button.

### Module Init Pattern
```js
import { initACC, onCharacterPageLoaded as accOnCharacterPageLoaded } from './lib/assisted-character-creation.js';

initACC({ settings });

// In the CHARACTER_PAGE_LOADED handler:
function onCharacterPageLoadedHandler() {
    onCharacterPageLoaded();     // existing Possession call
    accOnCharacterPageLoaded();  // new ACC call
}
```

### ACC Launch Button
Injected into `#form_create .ch_creation_btn_row` (or fallback) — a small icon button (e.g., `fa-wand-magic-sparkles`) that opens the modal.

---

## Implementation Steps

### Step 1: Default Schema Definition
- Create `lib/default-character-schema.js`
- Define all 21 fields with order, label, description, inputType, and prompt templates
- Export the schema object and a validation function

### Step 2: Core Module Scaffold
- Create `lib/assisted-character-creation.js`
- Implement: `initACC()`, `onCharacterPageLoaded()`, schema validation, schema storage helpers
- Wire into `index.js` with settings and event subscriptions

### Step 3: Modal UI
- Build modal creation/destruction functions
- Generate form fields dynamically from schema
- Character Brief textarea at top
- Done/Cancel buttons at bottom
- Style in `style.css`

### Step 4: Per-Field LLM Generation
- Implement `generateFieldValue()` using `generateRaw`
- Wire Assist button → generate → populate field
- Implement Stop (guard flag + discard), Retry (re-generate with original seed), Reset (revert to seed)
- Track per-field state (originalSeed, isGenerating, hasGenerated)
- Build `{{filledFields}}` from other completed fields

### Step 5: Compilation & Output
- Implement `compileDescription()` — ordered fields → formatted text block
- On "Done": compile, set ST description field value, set ST name field, close modal
- On "Cancel": close modal, discard everything

### Step 6: YOLO Mode
- Implement `yoloGenerate()` — single LLM call with stripped schema
- Button at bottom of form
- Result goes directly to ST description field and closes modal

### Step 7: Schema Management (Settings UI)
- Add ACC section to `settings.html` (enable toggle, debug toggle, schema selector dropdown)
- Import button (file input + validate + store)
- Export button (download active schema as JSON)
- Delete button for custom schemas

### Step 8: Reverse Mapping
- Detect when editing an existing character (description field is non-empty)
- Offer "Import from existing" button in modal
- LLM call to decompose description → populate form fields
- User reviews and edits before any application

---

## Settings HTML Addition

Add to `settings.html` a new section in the inline-drawer:

```html
<!-- Assisted Character Creation -->
<div class="sse-section">
    <h4>Assisted Character Creation</h4>
    <label class="checkbox_label">
        <input id="acc_enabled" type="checkbox" />
        <span>Enable Assisted Character Creation</span>
    </label>
    <label class="checkbox_label">
        <input id="acc_debug_mode" type="checkbox" />
        <span>Debug mode</span>
    </label>
    <div class="acc-schema-selector">
        <label>Active Schema:</label>
        <select id="acc_schema_select" class="text_pole"></select>
    </div>
    <div class="acc-schema-buttons">
        <div class="menu_button" id="acc_import_schema">Import Schema</div>
        <div class="menu_button" id="acc_export_schema">Export Schema</div>
        <div class="menu_button" id="acc_delete_schema">Delete Schema</div>
    </div>
    <input type="file" id="acc_schema_file_input" accept=".json" style="display:none" />
</div>
```

---

## Key Files to Modify

| File | Changes |
|------|---------|
| `lib/assisted-character-creation.js` | **NEW** — All ACC logic |
| `lib/default-character-schema.js` | **NEW** — Default schema definition |
| `index.js` | Add ACC settings, init, event wiring |
| `settings.html` | Add ACC settings section |
| `style.css` | Add modal and form styles |

---

## Verification Plan

1. **Manual testing in SillyTavern**:
   - Open character creation panel → verify ACC button appears
   - Click ACC button → verify modal opens with all schema fields
   - Type seed text in a field → click Assist → verify LLM generates and populates field
   - Click Stop during generation → verify field re-enables and result is discarded
   - Click Retry → verify re-generation with original seed
   - Click Reset → verify revert to original seed
   - Fill Character Brief → verify it's included in generation prompts
   - Click Done → verify compiled description appears in ST description field and name in ST name field
   - Click Cancel → verify modal closes with no side effects
   - Test YOLO mode → verify single LLM call and direct output to description field
2. **Schema management**:
   - Import a custom JSON schema → verify validation and storage
   - Select different schema → verify form regenerates
   - Export schema → verify valid JSON download
   - Delete custom schema → verify removal and fallback to default
3. **Reverse mapping**:
   - Open ACC on existing character → verify "Import from existing" option
   - Run reverse mapping → verify fields populate for review
4. **Settings persistence**:
   - Toggle ACC settings → refresh → verify settings persist
   - Switch chats → verify no state leakage
5. **Edge cases**:
   - Empty Character Brief → verify generation still works
   - All fields empty on Done → verify graceful handling
   - Rapidly clicking Assist on multiple fields → verify guard prevents concurrent generations
