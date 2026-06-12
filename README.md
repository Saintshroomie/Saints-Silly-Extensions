# Saint's Silly Extensions

A [SillyTavern](https://github.com/SillyTavern/SillyTavern) third-party extension that adds six integrated roleplay tools: **Possession**, **Phrasing**, **Assisted Character Creation**, **World Info Assist**, **Narrative Guidance**, and **Reformatting**

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
- **Custom prompts** — Customize the phrasing prompt and save any number of named preset variants (see Tool Presets & Prompt Preview below)
- **Inverse Guidance** — Optional mode that feeds every existing swipe of the target message into the prompt and asks the model to produce a swipe that is wildly different in tone, pacing, and approach. Comes with its own editable prompt template (with `{{phrasingSwipes}}` and `{{phrasingSeed}}` placeholders).
- **Possession-aware** — When possessing a character, phrasing generates in that character's voice; otherwise it uses the standard ST impersonate feature

### Assisted Character Creation

A modal-based character creator that adds an **Assist** button to SillyTavern's character creation page, letting you draft a complete character description from a short brief.

- **Customizable prompt template** — A built-in prompt instructs the model to produce a structured, bracketed character sheet covering name, age, physical description, voice, clothing, equipment, personality, motivations, backstory, relationships, secrets, and more. Edit it freely in the settings panel (with `{{context}}` / `{{brief}}` placeholders); save the prompt + prefill together as named presets and preview the assembled prompt (see Tool Presets & Prompt Preview below).
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
- **Modal contents persist** — The brief, generated description, Use Chat Context toggle, selected lore books, and token count are all remembered the next time you open the modal — even after clicking Done or Cancel. Use the per-field **Clear** buttons to wipe the brief or description when you want to start fresh.

### World Info Assist

Adds an **Assist** button to every World Info / lore book entry, letting you draft entries with LLM help directly from the entry form.

- **Per-entry Assist button** — Every World Info entry form gets its own Assist button row injected above the content textarea. New entries get one automatically as soon as they're created.
- **Title-aware priming** — If the entry has a title (the comment field), generation is primed with `[Title: ` so the model continues in the exact bracketed format. If the title is empty, generation is primed with just `[`.
- **Dedicated Assist Guidance field** — A separate guidance textarea sits between the Assist button row and the entry's content textarea. Type a rough idea, tone, canon notes, or anything else you want the model to consider — it's used as the seed for every Assist / Retry / Continue on that entry. The guidance is saved on the entry itself (in its `extensions` field) so it persists across page reloads and travels with the lorebook on export.
- **Continue / Retry** — After a generation, the Assist button is replaced by Continue (extends the current entry) and Retry (re-runs Assist with your saved guidance, replacing the content).
- **Clear buttons** — Each field has its own labeled button directly above it: **Clear Guidance** in the Assist Guidance header, and **Clear Content** just above the entry's content textarea.
- **Editable prompt template** — The default prompt instructs the model to emit a `[ Subject: Description ]` world lore artifact with no commentary. You can edit it freely in the settings panel (with `{{context}}` / `{{guidance}}` / `{{title}}` placeholders); save the prompt + prefills together as named presets and preview the assembled prompt (see Tool Presets & Prompt Preview below).
- **No schema** — Unlike Assisted Character Creation, World Info Assist has no schema. The prompt itself defines the desired output format.

### Narrative Guidance

Periodically asks the LLM for a short paragraph of story guidance based on the current chat, character cards, and selected lore books, then injects that paragraph as a system prompt before every AI turn until a per-chat turn counter expires — at which point it auto-regenerates.

Guidance comes in **two independent tiers** that operate the same way but on different clocks:

- **Long-term** — the overarching arc, where the whole thread is heading, on a slow refresh horizon (default every **40** AI turns).
- **Short-term** — the immediate beats for the next few turns, on a fast horizon (default every **8** AI turns). Short-term generation is **hierarchical**: it's seeded with the current long-term arc so the immediate beats serve the larger destination, and whenever long-term refreshes, short-term re-aligns to it.

Enable either tier on its own or both together. Each tier is fully self-contained — its own enable/auto-regen toggles, refresh horizon, prompts, lore-book picks, themes box, counter, and live guidance paragraph.

- **Per-chat state** — Each tier's active guidance, remaining turn count, and themes/ideas are persisted per chat (via `chatMetadata`) and reload automatically when switching chats. (Pre-split chats keep their guidance — it lands on the short-term tier.)
- **Auto-regenerate at zero** — When a tier's turn counter hits zero on the AI's reply that decrements it, a new guidance paragraph is generated in the background so it's ready before your next send. A full-screen overlay masks the UI for the duration of the regeneration so you can't accidentally send a message mid-regen. Optional per tier — turn it off to keep the counter purely as a manual prompt. A progress toast stays up while a generation runs.
- **Manual regenerate** — A **Regenerate Now** button in each tier forces a fresh generation at any time. The `-1` and `Reset` buttons next to the remaining-turn display let you nudge or reset that tier's counter without regenerating.
- **Editable everything** — Per tier: the generation instructions (the user prompt, with `{{context}}` / `{{themes}}` placeholders, plus `{{longGuidance}}` for short-term), the prefill the model continues from, the injection template (with `{{guidance}}` placeholder), and the live guidance paragraph itself are all directly editable. Edits to the active guidance apply on the next AI turn.
- **Themes / arcs input** — Each tier has a per-chat textarea where you can offer themes, ideas, or general arcs for the model to weave into the next round of guidance.
- **Injection controls** — Per tier: Depth and Role inputs (mirroring SillyTavern's Author's Note) control where in the prompt the guidance is inserted and which role it speaks as.
- **Lore book picker** — Per tier: pick which lore books to feed into the guidance generation's context preamble.
- **Configurable token limits** — Per tier: set the response token limit for the generation, and optionally cap how much chat history feeds into the context preamble.

### Reformatting

Normalizes the formatting of AI character messages *after* they're generated, so they always match the prose style you want — for example, stripping the italic asterisks out of `*He danced around the room.*` to leave `He danced around the room.`

- **Two interchangeable engines** (pick one in the settings):
  - **Rules** — fast, free, deterministic transforms with no risk of the content changing:
    - **Asterisks** — a single choice of **Leave as-is**, **Strip asterisks** (removes every italic / bold marker), or **Wrap narration in asterisks** (the inverse: splits quoted dialogue from narration and wraps the narration, e.g. `He danced. "Hi."` → `*He danced.* "Hi."`, stripping existing asterisks first so the result is always consistent).
    - **Collapse Extra Whitespace** — an independent option that collapses runs of blank lines and trims trailing spaces, on top of the asterisk choice.
  - **LLM** — sends the message to the model with an editable prompt (and optional prefill) and lets it rewrite the formatting. More flexible, but slower and token-using; routed through the shared silent-generation manager so SillyTavern's Stop button cancels it. Joins the Tool Presets system.
- **Automatic or manual** — With **Auto-Reformat** on, every AI reply is reformatted as it arrives. With it off (or any time), reformat a single message with the <span title="text-slash icon">✂</span> button injected into that message's button row, or with `/reformat` for the last message.
- **AI messages only** — User and system messages are never touched.
- **Non-destructive** — The original text is always preserved as a swipe, so you can swipe back to it at any time. Reformatting never re-processes a swipe it already produced.

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

1. Open any World Info / lore book entry. An **Assist** button row and an **Assist Guidance** textarea will appear above the entry's content textarea.
2. (Optional) Type a title in the comment field at the top of the entry — it will be used to prime the generation with `[Title: `.
3. (Optional) Type guidance into the **Assist Guidance** field — keywords, a rough idea, tone, canon notes, anything you want the model to consider. The guidance is saved on the entry and persists across page reloads.
4. Click **Assist** to generate the entry. The result is written into the content textarea and saved automatically.
5. Click **Continue** to extend the entry, or **Retry** to re-run Assist with your saved guidance (replacing the current content). Use the **Clear** buttons to wipe the guidance or content fields when starting over.

### How to Use Narrative Guidance

1. Open **Extensions** > **Saint's Silly Extensions** and find the **Narrative Guidance** section. It holds two tiers — **Long-term** (the overarching arc) and **Short-term** (the immediate beats). Open either sub-drawer and tick its **Enable** box. You can run one tier or both.
2. (Optional) Adjust that tier's **Turns Between Regenerations** — how many AI replies elapse between automatic regenerations (defaults: long-term 40, short-term 8).
3. (Optional) Edit the tier's **Themes / Story Arcs** textarea with anything you want its next round of guidance to weave in — ideas, arcs, "introduce a mysterious stranger", etc.
4. (Optional) Tick lore books in the tier's picker to fold their entries into that tier's guidance generation context.
5. Send a message in your chat. With **Auto-Regenerate at Zero** on, the first generation for each enabled tier kicks off automatically (the UI is masked while it runs, and a progress toast stays up) and the resulting paragraph fills that tier's **Active Guidance** textarea. If both tiers are enabled, long-term generates first and short-term is seeded from it.
6. From there, every subsequent AI turn is steered by the active guidance until a tier's counter hits zero, at which point that tier regenerates from the now-updated chat context (and your latest themes). When long-term refreshes, short-term re-aligns to the new arc.
7. Click a tier's **Regenerate Now** at any time to force an immediate regeneration. Use **-1** and **Reset** to nudge that tier's counter without regenerating. Edit the **Active Guidance** textarea directly to hand-tune the steering.

### How to Use Reformatting

1. Open **Extensions** > **Saint's Silly Extensions** and find the **Reformatting** section. Tick **Enable Reformatting**.
2. Choose an **Engine**:
   - **Rules** — pick how asterisks are handled (**Strip asterisks** handles the common "remove the italics" case; **Wrap narration in asterisks** does the inverse), and optionally enable **Collapse Extra Whitespace**.
   - **LLM** — set a Response Token Limit and edit the prompt (with the `{{message}}` placeholder) / optional prefill. Use **Preview Assembled Prompt** to see exactly what gets sent, and save variants as presets.
3. Leave **Auto-Reformat AI Messages** on to reformat every reply as it arrives, or turn it off to keep it manual-only.
4. To reformat a single message at any time, click the <span title="text-slash icon">✂</span> button in that message's button row, or run `/reformat` to reformat the last message.
5. The reformatted text becomes the active version of the message; the original is kept as a swipe, so you can always swipe back to it.


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
| Preset / Preview Assembled Prompt | Save named bundles of both Phrasing prompt fields and preview exactly what gets injected (see Tool Presets & Prompt Preview below) |
| Prompt Template | Customize the AI prompt used for enrichment. Supports the `{{phrasingSeed}}` placeholder. |
| Inverse Guidance Prompt Template | Customize the prompt used when Inverse Guidance is on. Supports `{{phrasingSeed}}` and `{{phrasingSwipes}}` placeholders. |

### Assisted Character Creation Settings

| Setting | Description |
|---------|-------------|
| Enable Assisted Character Creation | Toggle the ACC feature and its Assist button on the character page |
| ACC Debug Mode | Log detailed ACC events, prompts, and generations to the browser console |
| Max Context Override | If > 0, caps how many tokens of chat context the preamble packer uses for ACC generations. 0 = use the model's full context size. |
| Preset / Preview Assembled Prompt | Save named bundles of the ACC prompt + prefill and preview exactly what gets sent (see Tool Presets & Prompt Preview below) |
| Prompt Template | Customize the prompt sent to the LLM for character generation. Supports `{{context}}` and `{{brief}}` placeholders; if missing, the context is prepended and the brief appended automatically. |
| Prefill Template | The assistant prefix the model continues from, also kept at the top of the final description. If the backend ignores prefills and the model repeats it, the echo is stripped automatically. |

### World Info Assist Settings

| Setting | Description |
|---------|-------------|
| Enable World Info Assist | Toggle the WI Assist feature and inject/remove its per-entry Assist buttons |
| WI Assist Debug Mode | Log detailed WI Assist events, prompts, and generations to the browser console |
| Max Context Override | If > 0, caps how many tokens of chat context the preamble packer uses for WIA generations. 0 = use the model's full context size. |
| Preset / Preview Assembled Prompt | Save named bundles of the WIA prompt + both prefills and preview exactly what gets sent (see Tool Presets & Prompt Preview below) |
| Prompt Template | Customize the prompt sent to the LLM for World Info entry generation. Supports `{{context}}`, `{{guidance}}`, and `{{title}}` placeholders; if context/guidance are missing, those blocks are added automatically. |
| Prefill Templates (Titled / Untitled) | The assistant prefixes used when the entry has / lacks a title, also kept at the start of the entry on success. Titled supports `{{title}}`. Prefill echoes from backends that ignore prefills are stripped automatically. |

### Narrative Guidance Settings

The drawer holds two self-contained tiers — **Long-term** (the overarching arc) and **Short-term** (the immediate beats, seeded with the active long-term arc). Every setting below exists **per tier**, except **Narrative Guidance Debug Mode**, which is shared and lives in the Diagnostics drawer. Defaults differ only in the refresh horizon: long-term **40** turns, short-term **8**.

| Setting | Description |
|---------|-------------|
| Enable (Long-term / Short-term) | Toggle that tier on/off. Run one tier or both. |
| Auto-Regenerate at Zero | When on, automatically regenerates that tier the moment its turn counter hits zero (and, for short-term, whenever long-term refreshes). When off, the counter still decrements but only **Regenerate Now** updates the guidance. |
| Narrative Guidance Debug Mode | Log detailed Narrative Guidance events to the browser console (shared across both tiers; in the Diagnostics drawer) |
| Turns Between Regenerations | How many AI replies elapse between automatic regenerations (defaults: long-term 40, short-term 8) |
| Response Token Limit | Maximum tokens the model may use for each guidance paragraph (default 400) |
| Max Context Override | If > 0, caps how many tokens of chat context the preamble packer uses for that tier's generations. 0 = use the model's full context size. |
| Preset / Preview Assembled Prompt | Save named bundles of the tier's three prompt fields and preview exactly what gets sent (see Tool Presets & Prompt Preview below) |
| Generation Instructions Template | The user prompt for each generation. Supports `{{context}}` and `{{themes}}` placeholders (short-term also supports `{{longGuidance}}` — the active long-term arc); if missing, the blocks are prepended automatically. |
| Prefill Template | The assistant prefix the LLM continues to produce the guidance paragraph; kept at the start of the stored guidance. Outer brackets are stripped at injection time. |
| Injection Prompt Template | Template injected before each AI turn. Supports the `{{guidance}}` placeholder. |
| Depth | Number of recent chat messages to insert the guidance after (0 = at the bottom) |
| Role | Role used when injecting the guidance (System / User / Assistant) |
| Lore Books | Optional picker for lore books to feed into that tier's generation context |
| Themes / Story Arcs (per-chat) | Themes, ideas, or arcs for the model to weave into the tier's next round of guidance |
| Active Guidance (per-chat) | The tier's currently active guidance paragraph. Edit directly to hand-tune steering; edits apply on the next AI turn. |
| Turns Remaining / -1 / Reset / Regenerate Now | Manual controls over that tier's per-chat counter and on-demand regeneration |

### Reformatting Settings

| Setting | Description |
|---------|-------------|
| Enable Reformatting | Toggle the Reformatting feature, its per-message buttons, and `/reformat` on/off |
| Auto-Reformat AI Messages | When on, every AI character message is reformatted as it arrives. When off, only the per-message button or `/reformat` reformats |
| Engine | Which engine to use: **Rules** (deterministic transforms) or **LLM** (prompt-based rewrite) |
| Asterisks (Rules) | Mutually-exclusive choice: **Leave as-is**, **Strip asterisks** (remove every italic / bold marker), or **Wrap narration in asterisks** (wrap everything outside quoted dialogue; strips existing asterisks first so the result is consistent) |
| Collapse Extra Whitespace (Rules) | Independent option: collapse runs of 3+ blank lines to one and trim trailing spaces |
| Response Token Limit (LLM) | Maximum tokens the model may use to reformat a message (default 800) |
| Preset / Preview Assembled Prompt (LLM) | Save named bundles of the LLM prompt + prefill and preview exactly what gets sent (see Tool Presets & Prompt Preview below) |
| Prompt Template (LLM) | The user prompt sent for each LLM reformat. Supports the `{{message}}` placeholder; if missing, the message is appended automatically |
| Prefill Template (LLM) | Optional assistant prefix the model continues from, kept at the start of the result. Prefill echoes from backends that ignore prefills are stripped automatically |
| Reformatting Debug Mode | Log detailed Reformatting events to the browser console (in the Diagnostics drawer) |

### Diagnostics

| Setting | Description |
|---------|-------------|
| Silent Generation Debug Mode | Log the silent-generation manager's lifecycle (job start/abort/completion, stop-listener events, stream token counts) to the browser console. Useful when diagnosing why a Stop button does or doesn't halt the LLM backend across ACC, WIA, and Narrative Guidance. |

### Tool Presets & Prompt Preview

Each tool's settings drawer (Phrasing, Assisted Character Creation, World Info Assist, Narrative Guidance, Reformatting) has a **Preset** block that saves and restores *all* of that tool's editable prompt fields together — so a prompt that describes its prefill's format always travels with that prefill:

| Control | Description |
|---------|-------------|
| Dropdown | Pick a saved preset to load its texts into every prompt field of the tool. The first entry, **Default**, is always present and non-deletable — it loads the built-in default texts. The active entry shows **(modified)** whenever any field differs from the saved preset; switching presets with unsaved changes asks for confirmation first. |
| Save as New | Save the current texts of all of the tool's prompt fields as a new named preset. |
| Update | Overwrite the currently selected preset with the current texts. Disabled when Default is selected. |
| Rename | Rename the currently selected preset. Disabled when Default is selected. |
| Delete | Delete the currently selected preset; selection falls back to Default without touching the current texts. Disabled when Default is selected. |

Presets persist at the extension-settings level and are shared across all chats. Templates saved with the older per-field system are converted to presets automatically on first load.

Next to each Preset block, **Preview Assembled Prompt** opens a read-only popup showing exactly what the tool will send to the model — the fixed system prompt, the fully assembled user prompt (with sample values in place of your brief/guidance/context), and the prefill(s) — so there is never any mystery about what surrounds your template.

#### Template placeholders

Generation templates support tool-specific placeholders, substituted in place. If a placeholder is omitted, the corresponding block is added automatically in the legacy position (context prepended, brief/guidance appended), so older custom templates keep working unchanged.

| Tool | Placeholders |
|------|--------------|
| Phrasing | `{{phrasingSeed}}`, `{{phrasingSwipes}}` (inverse prompt only) |
| Assisted Character Creation | `{{context}}`, `{{brief}}` |
| World Info Assist | `{{context}}`, `{{guidance}}`, `{{title}}` |
| Narrative Guidance | `{{context}}`, `{{themes}}`, plus `{{longGuidance}}` for the short-term tier (generation instructions); `{{guidance}}` (injection template) |
| Reformatting | `{{message}}` (LLM prompt) |

## Slash Commands

| Command | Description |
|---------|-------------|
| `/possess [name]` | Possess a character by name (partial matching supported) |
| `/unpossess` | Release the currently possessed character |
| `/phrasing` | Enrich the text in the input box or the last message |
| `/reformat` | Reformat the last message using the configured engine (keeps the original as a swipe) |

## License

[GNU General Public License v3.0](LICENSE)

Have fun!
