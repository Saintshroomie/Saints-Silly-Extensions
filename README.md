# Saint's Silly Extensions

A [SillyTavern](https://github.com/SillyTavern/SillyTavern) third-party extension that adds four integrated roleplay tools: **Possession**, **Phrasing**, **Assisted Character Creation**, and **World Info Assist**

## Features

### Possession

Possession allows you to easily take control of any active character and post messages as them.

- **Solo chats** — A ghost icon button appears in the character panel to toggle possession
- **Group chats** — Radio-style toggles next to each group member let you pick who to possess
- **Continue interception** — When possessing, the Continue button posts your typed text as the possessed character, then triggers a continuation
- **Impersonate replacement** — While possessing, the standard Impersonate buttons are hidden and replaced with a character avatar button that triggers a generation as the possessed character (uses the character's speak action in groups, or trigger in solo)
- **State persistence** — Possession state (including character avatar) is saved per-chat and restored automatically when switching chats
- **Slash commands** — `/possess [name]` (supports partial name matching) and `/unpossess`

### Phrasing

Enrich your messages with LLM-generated narration, actions, and detail that stay consistent with the character and scene.

- **Context-aware rephrase** — The rephrase button (the Quill) adapts to what you're doing:
  - **Empty input** — Rephrases the last message in chat, using its latest swipe as the seed text
  - **Editing a message** — Confirms the edit, then rephrases that message
  - **Text in input** — Enriches your typed text
- **Seed text reinjection** — Rephrased messages remember their original seed prompt, so if you Continue a rephrased message the seed is reinjected to guide the continue generation
- **Custom prompts** — Customize the phrasing prompt per-chat or use the default template
- **Possession-aware** — When possessing a character, phrasing generates in that character's voice; otherwise it uses the standard ST impersonate feature

### Assisted Character Creation

A modal-based character creator that adds an **Assist** button to SillyTavern's character creation page, letting you build character cards field-by-field with LLM help.

- **Schema-driven form** — Each field in the active schema becomes a row in the modal with its own input, controls, and per-field LLM prompt. The default schema covers Character Name, Age, Gender & Pronouns, Species/Race, Occupation, and more.
- **Character Brief** — A top-level free-form description of your concept, setting, and key details. Used as context for every per-field generation.
- **Per-field Assist** — Click the wand on any field to generate just that value. The field's seed text (anything you typed) and the Character Brief guide the result, and already-filled fields are passed in for consistency.
- **Continue / Retry / Reset** — After a field generates, the Assist button becomes a Continue button (extends the current text), and Retry (re-generates from the original seed) and Reset (restores the seed text) buttons appear.
- **Stop mid-generation** — Click the active field's button again while it's generating to stop and discard the result.
- **Prose toggle** — Each field has a Prose checkbox. Off = brief comma-separated descriptors on a single line; On = descriptive multi-line prose. Prose state is persisted per-schema, per-field.
- **Token override** — Each field has a per-generation max-token input that overrides the schema default for that field.
- **Import from Existing** — When editing a character that already has a description, a button appears to reverse-map the existing description back into the form fields. Descriptions previously compiled by ACC are parsed directly from JSON; legacy prose descriptions are parsed via an LLM round-trip.
- **Compiled output** — Clicking Done writes a structured JSON object of all filled fields into SillyTavern's description textarea, and also fills the character name field if set.
- **Schema management** — The settings panel includes a schema selector plus Import, Export, and Delete buttons. Custom schemas are JSON files with field definitions, ordering, prompts, and default response lengths. The default schema cannot be deleted or overwritten.
- **Generation lockout** — While any field is generating, all other field controls and the Done button are disabled to prevent overlapping requests.

### World Info Assist

Adds an **Assist** button to every World Info / lore book entry, letting you draft entries with LLM help directly from the entry form.

- **Per-entry Assist button** — Every World Info entry form gets its own Assist button row injected above the content textarea. New entries get one automatically as soon as they're created.
- **Title-aware priming** — If the entry has a title (the comment field), generation is primed with `[Title: ` so the model continues in the exact bracketed format. If the title is empty, generation is primed with just `[`.
- **Guidance from the content field** — Whatever you've typed into the entry's content textarea is used as guidance for the generation, so you can sketch a rough idea and let the LLM flesh it out.
- **Continue / Retry / Revert** — After a generation, the Assist button is replaced by Continue (extends the current entry), Retry (re-rolls from your original guidance text), and Revert (restores your original guidance text and discards the generation).
- **Editable prompt template** — The default prompt instructs the model to emit a `[ Subject: Description ]` world lore artifact with no commentary. You can edit it freely in the settings panel and Restore Default at any time.
- **No schema** — Unlike Assisted Character Creation, World Info Assist has no schema. The prompt itself defines the desired output format.

### How to Use Possession

Possession allows you to "possess" an active character in your solo or group chat (more useful for group chats). When possessing, your messages will be sent as that character rather than your active persona.

1. Select a character to possess by clicking their radio button in the active member panel (group chat) or the ghost icon in the character card panel (solo chat).
2. Click the Character Avatar Button to perform an ST-like Impersonate for that character (It's just generating a response as that character)

### How to Use Phrasing
Love the gist, but not the phrasing of a generation? Wish you could easily guide the next generation to write something similar? Phrasing allows you to seed a generation with either your own message, or an existing one. If your not a great writer or just feeling lazy, you can type out a paraphrase about what you want your character to say or do, press the quill button, and let the LLM do the hard work of actually writing the message.

**Paraphrasing for {{user}}:**
1. Enter your paraphrase, and press the quill button to trigger a standard SillyTavern Impersonation that is guided by your written text.

**Paraphrasing for {{char}}:**
1. Press the quill button on the most recent message (must be a character message) and Phrasing will guide a swipe generation with that message.
2. Didn't like the phrasing? Just activate the swipe you want for the seed (or edit it to paraphrase something else) and click the quill for another guided swipe.
3. Wish the guided message was longer? Click the continue button and Phrasing will make sure the seed continues to guide the Continue generation.

### How to Use Possession and Phrasing Together

When Possession and Phrasing are used together, you can quickly take over characters, and guide their generation by paraphrasing. 

1. Select a character to possess.
2. Type a paraphrase of what you want your possessed character to do or say or feel, and press the quill button to let the LLM do the hard work.
3. Pressing the quill button again will perform a swipe using the active message as the guiding seed.

### How to Use Assisted Character Creation

1. Open SillyTavern's **Create Character** page and click the **Assist** button (wand icon) in the character creation button row.
2. Fill in the **Character Brief** at the top of the modal — a few sentences describing your concept, setting, and any anchor details.
3. For each field, optionally type a seed (notes, keywords, partial text), then click the wand to generate a value. Toggle **Prose** if you want full sentences instead of comma-separated descriptors, or set a token override for longer/shorter output.
4. Use **Continue** to extend a generated field, **Retry** to re-roll from your original seed, or **Reset** to discard the generation.
5. When editing an existing character, click **Import from Existing** to reverse-map the current description back into the form fields.
6. Click **Done** to write the compiled character into SillyTavern's description and name fields, or **Cancel** to discard.

### How to Use World Info Assist

1. Open any World Info / lore book entry. An **Assist** button will appear above the entry's content textarea.
2. (Optional) Type a title in the comment field at the top of the entry — it will be used to prime the generation with `[Title: `.
3. (Optional) Type any guidance into the content textarea — keywords, a rough idea, tone, canon notes, anything you want the model to consider.
4. Click **Assist** to generate the entry. The result is written into the content textarea and saved automatically.
5. Click **Continue** to extend the entry, **Retry** to re-roll from your original guidance text, or **Revert** to discard the generation and restore what you originally typed.


## Installation

1. Open SillyTavern and go to **Extensions** > **Install Extension**
2. Paste this repository URL:
   ```
   https://github.com/Saintshroomie/Saints-Silly-Extensions
   ```
3. Click **Install** and refresh the page

### Manual Installation

Clone this repository into your SillyTavern extensions directory:

```bash
cd SillyTavern/data/default-user/extensions/third-party/
git clone https://github.com/Saintshroomie/Saints-Silly-Extensions
```

Refresh SillyTavern to load the extension.

## Configuration

Open **Extensions** > **Saint's Silly Extensions** in SillyTavern's settings panel.

### Possession Settings

| Setting | Description |
|---------|-------------|
| Enable Possession | Toggle the possession feature on/off |
| Show Toast on Possess/Unpossess | Display notifications when possession state changes |
| Debug Mode | Log detailed possession events to the browser console |

### Phrasing! Settings

| Setting | Description |
|---------|-------------|
| Enable Phrasing! | Toggle the phrasing feature on/off |
| Debug Mode | Log detailed phrasing events to the browser console |
| Prompt Template | Customize the AI prompt used for enrichment (per-chat) |

### Assisted Character Creation Settings

| Setting | Description |
|---------|-------------|
| Enable Assisted Character Creation | Toggle the ACC feature and its Assist button on the character page |
| ACC Debug Mode | Log detailed ACC events, prompts, and generations to the browser console |
| Active Schema | Select which character schema drives the modal form (default or any imported custom schema) |
| Import Schema | Load a custom schema from a JSON file. Schemas define field labels, descriptions, ordering, prompts, and default response lengths |
| Export Schema | Download the active schema as a JSON file |
| Delete Schema | Remove the selected custom schema (the default schema cannot be deleted) |

### World Info Assist Settings

| Setting | Description |
|---------|-------------|
| Enable World Info Assist | Toggle the WI Assist feature and inject/remove its per-entry Assist buttons |
| WI Assist Debug Mode | Log detailed WI Assist events, prompts, and generations to the browser console |
| Prompt Template | Customize the prompt sent to the LLM for World Info entry generation |
| Restore Default | Reset the prompt template back to the built-in default |

## Slash Commands

| Command | Description |
|---------|-------------|
| `/possess [name]` | Possess a character by name (partial matching supported) |
| `/unpossess` | Release the currently possessed character |
| `/phrasing` | Enrich the text in the input box or the last message |

## License

[GNU General Public License v3.0](LICENSE)
