# Saint's Silly Extensions

A [SillyTavern](https://github.com/SillyTavern/SillyTavern) third-party extension that adds five integrated roleplay tools: **Possession**, **Phrasing**, **Assisted Character Creation**, **World Info Assist**, and **Narrative Guidance**

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
- **Custom prompts** — Customize the phrasing prompt and save any number of named template variants (see Prompt Templates below)
- **Inverse Guidance** — Optional mode that feeds every existing swipe of the target message into the prompt and asks the model to produce a swipe that is wildly different in tone, pacing, and approach. Comes with its own editable prompt template (with `{{phrasingSwipes}}` and `{{phrasingSeed}}` placeholders).
- **Possession-aware** — When possessing a character, phrasing generates in that character's voice; otherwise it uses the standard ST impersonate feature

### Assisted Character Creation

A modal-based character creator that adds an **Assist** button to SillyTavern's character creation page, letting you draft a complete character description from a short brief.

- **Customizable prompt template** — A built-in prompt instructs the model to produce a structured, bracketed character sheet covering name, age, physical description, voice, clothing, equipment, personality, motivations, backstory, relationships, secrets, and more. Edit it freely in the settings panel; save named variants and switch between them via the template dropdown (see Prompt Templates below).
- **Max Tokens control** — A token-count input in the modal sets the response length for each generation (default 1000). Persisted between sessions.
- **Character Brief** — Type a few sentences describing your concept, setting, and any anchor details. The prompt template is sent first, followed by the brief.
- **Generate** — One-shot full character description from the brief; replaces the textarea.
- **Continue** — Extends the existing description, picking up where it leaves off.
- **Checkpoint** — Saves the current textarea state as the Retry restore point. Use it to lock in edits you're happy with before continuing.
- **Retry** — Restores to the last snapshot (auto-taken before Generate / Continue, or set manually with Checkpoint) and re-runs the last action. Useful when a roll went sideways.
- **Editable output** — The description appears in a large textarea so you can tweak or rewrite it freely between actions.
- **Optional context** — Tick **Use Chat Context** or pick lore books to prepend the current chat / character context and selected lore entries to the generation.
- **Stop mid-generation** — Click the active button again while generating to stop and discard the result.
- **Apply on Done** — Clicking Done copies the textarea contents into SillyTavern's description field. Cancel discards.

### World Info Assist

Adds an **Assist** button to every World Info / lore book entry, letting you draft entries with LLM help directly from the entry form.

- **Per-entry Assist button** — Every World Info entry form gets its own Assist button row injected above the content textarea. New entries get one automatically as soon as they're created.
- **Title-aware priming** — If the entry has a title (the comment field), generation is primed with `[Title: ` so the model continues in the exact bracketed format. If the title is empty, generation is primed with just `[`.
- **Guidance from the content field** — Whatever you've typed into the entry's content textarea is used as guidance for the generation, so you can sketch a rough idea and let the LLM flesh it out.
- **Continue / Retry / Revert** — After a generation, the Assist button is replaced by Continue (extends the current entry), Retry (re-rolls from your original guidance text), and Revert (restores your original guidance text and discards the generation).
- **Editable prompt template** — The default prompt instructs the model to emit a `[ Subject: Description ]` world lore artifact with no commentary. You can edit it freely in the settings panel; save named variants and switch between them via the template dropdown (see Prompt Templates below).
- **No schema** — Unlike Assisted Character Creation, World Info Assist has no schema. The prompt itself defines the desired output format.

### Narrative Guidance

Periodically asks the LLM for a short paragraph of story guidance based on the current chat, character cards, and selected lore books, then injects that paragraph as a system prompt before every AI turn until a per-chat turn counter expires — at which point it auto-regenerates.

- **Per-chat state** — Active guidance, remaining turn count, and themes/ideas are persisted per chat (via `chatMetadata`) and reload automatically when switching chats.
- **Auto-regenerate at zero** — When the turn counter hits zero on the AI's reply that decrements it, a new guidance paragraph is generated in the background so it's ready before your next send. A full-screen overlay masks the UI for the duration of the regeneration so you can't accidentally send a message mid-regen. Optional — turn it off to keep the counter purely as a manual prompt.
- **Manual regenerate** — A **Regenerate Now** button in the settings panel forces a fresh generation at any time. The `-1` and `Reset` buttons next to the remaining-turn display let you nudge or reset the counter without regenerating.
- **Editable everything** — The generation prompt (used as a prefill for a text-completion-style call), the injection template (with `{{guidance}}` placeholder), and the live guidance paragraph itself are all directly editable. Edits to the active guidance apply on the next AI turn.
- **Themes / arcs input** — A per-chat textarea where you can offer themes, ideas, or general arcs for the model to weave into the next round of guidance.
- **Injection controls** — Depth and Role inputs (mirroring SillyTavern's Author's Note) control where in the prompt the guidance is inserted and which role it speaks as.
- **Lore book picker** — Pick which lore books to feed into the guidance generation's context preamble.
- **Configurable token limits** — Set the response token limit for the generation, and optionally cap how much chat history feeds into the context preamble.

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
2. Fill in the **Character Brief** — a few sentences describing your concept, setting, and any anchor details.
3. (Optional) Tick **Use Chat Context** and/or pick lore books to ground the generation in your current chat or world.
4. Click **Generate**. The full description appears in the textarea below.
5. Use **Continue** to extend the description, **Retry** to undo the last action and re-roll, or **Checkpoint** to lock in the current state as the restore point for the next Retry.
6. Edit the textarea freely between actions.
7. Click **Done** to copy the description into SillyTavern's description field, or **Cancel** to discard.

### How to Use World Info Assist

1. Open any World Info / lore book entry. An **Assist** button will appear above the entry's content textarea.
2. (Optional) Type a title in the comment field at the top of the entry — it will be used to prime the generation with `[Title: `.
3. (Optional) Type any guidance into the content textarea — keywords, a rough idea, tone, canon notes, anything you want the model to consider.
4. Click **Assist** to generate the entry. The result is written into the content textarea and saved automatically.
5. Click **Continue** to extend the entry, **Retry** to re-roll from your original guidance text, or **Revert** to discard the generation and restore what you originally typed.

### How to Use Narrative Guidance

1. Open **Extensions** > **Saint's Silly Extensions** and find the **Narrative Guidance** section. Tick **Enable Narrative Guidance**.
2. (Optional) Adjust **Turns Between Regenerations** (default 10). This is how many AI replies elapse between automatic regenerations.
3. (Optional) Edit the **Themes / Story Arcs** textarea with anything you want the next round of guidance to weave in — ideas, arcs, "introduce a mysterious stranger", etc.
4. (Optional) Tick lore books in the picker to fold their entries into the guidance generation's context.
5. Send a message in your chat. With **Auto-Regenerate at Zero** on, the first generation kicks off automatically (the UI is masked while it runs) and the resulting paragraph fills the **Active Guidance** textarea.
6. From there, every subsequent AI turn is steered by the active guidance until the counter hits zero, at which point fresh guidance is generated based on the now-updated chat context (and your latest themes).
7. Click **Regenerate Now** at any time to force an immediate regeneration. Use **-1** and **Reset** to nudge the counter without regenerating. Edit the **Active Guidance** textarea directly to hand-tune the steering.


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
| Inverse Guidance | When enabled, rephrasing a message includes all of its existing swipes in the prompt and asks the model to produce something wildly different |
| Prompt Template | Customize the AI prompt used for enrichment. Save named variants via the template dropdown below the textarea. |
| Inverse Guidance Prompt Template | Customize the prompt used when Inverse Guidance is on. Supports `{{phrasingSeed}}` and `{{phrasingSwipes}}` placeholders. Save named variants via the template dropdown below the textarea. |

### Assisted Character Creation Settings

| Setting | Description |
|---------|-------------|
| Enable Assisted Character Creation | Toggle the ACC feature and its Assist button on the character page |
| ACC Debug Mode | Log detailed ACC events, prompts, and generations to the browser console |
| Max Context Override | If > 0, caps how many tokens of chat context the preamble packer uses for ACC generations. 0 = use the model's full context size. |
| Prompt Template | Customize the prompt sent to the LLM for character generation. Sent first, followed by the user's Character Brief. Save named variants via the template dropdown below the textarea. |

### World Info Assist Settings

| Setting | Description |
|---------|-------------|
| Enable World Info Assist | Toggle the WI Assist feature and inject/remove its per-entry Assist buttons |
| WI Assist Debug Mode | Log detailed WI Assist events, prompts, and generations to the browser console |
| Max Context Override | If > 0, caps how many tokens of chat context the preamble packer uses for WIA generations. 0 = use the model's full context size. |
| Prompt Template | Customize the prompt sent to the LLM for World Info entry generation. Save named variants via the template dropdown below the textarea. |

### Narrative Guidance Settings

| Setting | Description |
|---------|-------------|
| Enable Narrative Guidance | Toggle the feature on/off |
| Auto-Regenerate at Zero | When on, automatically regenerates guidance the moment the turn counter hits zero. When off, the counter still decrements but only **Regenerate Now** updates the guidance. |
| Narrative Guidance Debug Mode | Log detailed Narrative Guidance events to the browser console |
| Turns Between Regenerations | How many AI replies elapse between automatic regenerations (default 10) |
| Response Token Limit | Maximum tokens the model may use for each guidance paragraph (default 400) |
| Max Context Override | If > 0, caps how many tokens of chat context the preamble packer uses for guidance generations. 0 = use the model's full context size. |
| Generation Prompt | Prefill text the LLM continues to produce the guidance paragraph |
| Injection Prompt Template | Template injected before each AI turn. Supports the `{{guidance}}` placeholder. |
| Depth | Number of recent chat messages to insert the guidance after (0 = at the bottom) |
| Role | Role used when injecting the guidance (System / User / Assistant) |
| Lore Books | Optional picker for lore books to feed into the guidance generation's context |
| Themes / Story Arcs (per-chat) | Themes, ideas, or arcs for the model to weave into the next round of guidance |
| Active Guidance (per-chat) | The currently active guidance paragraph. Edit directly to hand-tune steering; edits apply on the next AI turn. |
| Turns Remaining / -1 / Reset / Regenerate Now | Manual controls over the per-chat counter and on-demand regeneration |

### Diagnostics

| Setting | Description |
|---------|-------------|
| Silent Generation Debug Mode | Log the silent-generation manager's lifecycle (job start/abort/completion, stop-listener events, stream token counts) to the browser console. Useful when diagnosing why a Stop button does or doesn't halt the LLM backend across ACC, WIA, and Narrative Guidance. |

### Prompt Templates

Every editable prompt in the settings panel (Phrasing standard, Phrasing inverse, Assisted Character Creation, World Info Assist, Narrative Guidance generation, Narrative Guidance injection) has its own template dropdown directly below the textarea, plus four actions:

| Control | Description |
|---------|-------------|
| Dropdown | Pick a saved template to load it into the textarea. The first entry, **Default**, is always present and non-deletable — it loads the built-in default text. |
| Save as New | Save the current textarea content as a new named template. |
| Update | Overwrite the currently selected template with the textarea content. Disabled when Default is selected. |
| Rename | Rename the currently selected template. Disabled when Default is selected. |
| Delete | Delete the currently selected template; selection falls back to Default. Disabled when Default is selected. |

Templates persist at the extension-settings level and are shared across all chats. Phrasing! no longer offers a "Save to Chat" prompt-override; templates supersede it.

## Slash Commands

| Command | Description |
|---------|-------------|
| `/possess [name]` | Possess a character by name (partial matching supported) |
| `/unpossess` | Release the currently possessed character |
| `/phrasing` | Enrich the text in the input box or the last message |

## License

[GNU General Public License v3.0](LICENSE)

Have fun!
