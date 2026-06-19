# Saint's Silly Extensions

A [SillyTavern](https://github.com/SillyTavern/SillyTavern) third-party extension that adds seven integrated roleplay tools: **Possession**, **Phrasing**, **Assisted Character Creation**, **World Info Assist**, **Narrative Guidance**, **Reformatting**, and **Compaction**

See [CHANGELOG.md](CHANGELOG.md) for release notes and version history.

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

### Phrase Ban

Tired of the model reusing the same tics — "his voice was thick with something he didn't want to name", "she did X, despite the Y"? Phrase Ban keeps a regex ban list and automatically rewrites any AI reply that matches it.

- **Regex ban list** — One JavaScript regular expression per line, matched against the raw text of every incoming AI reply. Case-insensitive by default, `/pattern/flags` for custom flags, `#` for comments. Invalid patterns are skipped, with a live validity readout under the textarea.
- **Detect → rewrite loop** — On a match, the message is rewritten through the Phrasing! engine: the actual matched phrases are listed in a rewrite prompt and the message is regenerated as a new swipe. If the rewrite *still* matches, it retries up to **Max Rewrite Attempts** (default 2), then gives up with a warning toast.
- **Plays nicely with Retry Continue** — If a **Retry checkpoint** is active on the matched message, Phrase Ban skips the in-place rewrite and instead drives a **retry-continue from that checkpoint** (the freshly-detected phrase is added to the ban list first, so the new attempt is steered away from it). Each attempt is a browsable swipe and your frozen checkpoint prefix is never disturbed. Same **Max Rewrite Attempts** cap applies. (Most effective on Text Completion, where the ban is enforced at the sampler level; on Chat Completion turn on Proactive Injection — otherwise an attempt may just reproduce the phrase and exhaust the cap.)
- **Notify-only mode** — Set Max Rewrite Attempts to 0 to be warned about matches without ever auto-rewriting (or auto-retrying).
- **Non-destructive** — Every rewrite (or retry attempt) is a swipe; the original (and each intermediate attempt) stays one swipe away.
- **Automatic or manual** — With **Auto-Scan** on, every AI reply is scanned as it arrives (a reply is never re-scanned once checked). Run `/phraseban` to scan and fix the last message on demand.
- **Learned phrase list (per chat)** — Every phrase Phrase Ban detects is collected into a per-chat **Learned Phrases** list automatically, as bookkeeping — whether or not you ever inject it. The list is fully **editable** in a per-chat textarea (add your own phrases or delete ones you don't want used), travels with the chat, and has a **Clear Learned Phrases** button to wipe it.
- **Native sampler-level ban (automatic)** — While Phrase Ban is enabled, the learned list is appended to the request's `banned_strings` on **Text Completion** backends (llama.cpp, KoboldCpp, TabbyAPI/ExLlama, etc.), so the backend *refuses to emit* those sequences at the sampler level instead of merely being asked to. It's applied non-destructively per-request — your saved sampler settings are never touched — and needs no toggle. Chat Completion APIs (OpenAI, Claude, …) have no sampler-level ban, so this is a no-op there (use Proactive Injection instead).
- **Proactive injection (avoid learned phrases)** — Optionally, Phrase Ban also persistently injects a *"don't reuse these phrases"* instruction built from the learned list before every AI turn — so future replies avoid the tics up front. Independent of the native ban (it's the way to enforce the list on Chat Completion APIs, or extra reinforcement on Text Completion). The injection's depth and role are configurable. Pair it (or the native ban) with **Max Rewrite Attempts = 0** for pure prevention — collect + ban, never rewrite.
- **Custom rewrite + proactive prompts + presets** — Both the rewrite prompt (placeholders `{{phrasingSeed}}` and `{{bannedPhrases}}`) and the proactive injection template (placeholder `{{bannedPhrases}}`) are editable, and the pattern list + both prompts save together as named presets, so you can keep per-model or per-genre ban lists.

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

- **Per-chat state** — Each tier's active guidance, remaining turn count, themes/ideas, and lore-book selection are persisted per chat (via `chatMetadata`) and reload automatically when switching chats. A brand-new chat starts with nothing selected, so an old chat's lore-book picks never leak into a new one. (Pre-split chats keep their guidance — it lands on the short-term tier.)
- **Auto-regenerate at zero** — When a tier's turn counter hits zero on the AI's reply that decrements it, a new guidance paragraph is generated in the background so it's ready before your next send. A full-screen overlay masks the UI for the duration of the regeneration so you can't accidentally send a message mid-regen. Optional per tier — turn it off to keep the counter purely as a manual prompt. A progress toast stays up while a generation runs.
- **Manual regenerate** — A **Regenerate Now** button in each tier forces a fresh generation at any time. The `-1` and `Reset` buttons next to the remaining-turn display let you nudge or reset that tier's counter without regenerating.
- **Editable everything** — Per tier: the generation instructions (the user prompt, with `{{context}}` / `{{themes}}` placeholders, plus `{{longGuidance}}` for short-term), the prefill the model continues from, the injection template (with `{{guidance}}` placeholder), and the live guidance paragraph itself are all directly editable. Edits to the active guidance apply on the next AI turn.
- **Themes / arcs input** — Each tier has a per-chat textarea where you can offer themes, ideas, or general arcs for the model to weave into the next round of guidance.
- **Injection controls** — Per tier: Depth and Role inputs (mirroring SillyTavern's Author's Note) control where in the prompt the guidance is inserted and which role it speaks as.
- **Lore book picker** — Per tier: pick which lore books to feed into the guidance generation's context preamble. The selection is **per-chat** — it resets to empty on a new chat and reloads when you switch chats. If a selected lore book is later deleted or renamed, it's silently dropped from the selection (with a one-time notice) the next time that chat's picker is opened or guidance is generated.
- **Configurable token limits** — Per tier: set the response token limit for the generation, and optionally cap how much chat history feeds into the context preamble.

### Reformatting

Normalizes the formatting of AI character messages *after* they're generated, so they always match the prose style you want — for example, stripping the italic asterisks out of `*He danced around the room.*` to leave `He danced around the room.`

- **Two interchangeable engines** (pick one in the settings):
  - **Rules** — fast, free, deterministic transforms with no risk of the content changing:
    - **Asterisks** — a single choice of **Leave as-is**, **Strip asterisks** (removes every italic / bold marker), or **Wrap narration in asterisks** (the inverse: splits quoted dialogue from narration and wraps the narration, e.g. `He danced. "Hi."` → `*He danced.* "Hi."`, stripping existing asterisks first so the result is always consistent).
    - **Collapse Extra Whitespace** — an independent option that collapses runs of blank lines and trims trailing spaces, on top of the asterisk choice.
  - **LLM** — sends the message to the model with an editable prompt (and optional prefill) and lets it rewrite the formatting. More flexible, but slower and token-using; routed through the shared silent-generation manager so SillyTavern's Stop button cancels it. Joins the Tool Presets system.
- **Manual** — Reformat a single message with the <span title="text-slash icon">✂</span> button injected into that message's button row, or with `/reformat` for the last message. (Reformatting only acts when you ask it to — there's no automatic on-arrival pass, so it never collides with retries or other tools.)
- **AI messages only** — User and system messages are never touched.
- **Non-destructive** — The original text is always preserved as a swipe, so you can swipe back to it at any time. Reformatting never re-processes a swipe it already produced.

### Compaction

Long chats (1000+ messages) eventually fill the model's context window. Once full, SillyTavern evicts the oldest history every turn, which invalidates the backend's KV cache from the eviction point on — so each post-fill turn triggers a near-full reprocess and generation slows to a crawl. The only real fix is to make the prompt short again.

Compaction **summarizes the chat, starts a fresh chat seeded with that summary plus the recent tail, migrates per-chat extension state, and resumes** — resetting the context window and restoring fast generation. It's periodic context compaction, analogous to what agent harnesses do when they compact a long conversation.

- **Guided summary modal** (mirrors Assisted Character Creation) — Add **Summary Guidance** demanding specific details be captured, pick which **lore books** to fold in, then **Generate / Continue / Checkpoint / Retry** a summary preview you can freely edit. The summary streams in live and the Stop button cancels it. Clicking **Compact** commits.
- **The handoff** — The summary lands in the new chat as a visible, editable **"Story so far"** message, followed by the last *N* messages (default 20) copied over **verbatim with swipes preserved**. The old chat is left intact and selectable from history.
- **Manual or automatic trigger** — Trigger it from the <span title="compress icon">🗜</span> **Compact Chat** item in the hamburger menu or with `/compact`. With **Auto-open at threshold** on, the modal opens on its own once the *measured* outgoing prompt crosses your % of the context window (with an optional confirmation dialog). The trigger is the **only** automatic part — every compaction still requires you to act in the modal. Nothing is ever rewritten headlessly.
- **State migration** — Possession, Narrative Guidance, and Phrase Ban per-chat state carry over to the new chat (World Info Assist guidance travels on the lorebook automatically). Your Summary Guidance is remembered per-chat across compactions of the same storyline.

### Retry Continue

Automates the "edit the message to keep the good part, delete the bad part, hit Continue" workflow — and keeps every attempt as a swipe so you can compare and pick the best.

- **Checkpoint + retry** — Retry snapshots the last message (or, if you edited it down to a good prefix first, your edited text) as a checkpoint, saves that snapshot as a new swipe, and continues from it. Press Retry again and again — each attempt becomes a new swipe you can browse with SillyTavern's native swipe arrows.
- **Two buttons** — A <span title="rotate-right icon">↻</span> **Retry** item in the hamburger menu (next to Continue) and a matching quick-action button in the send bar. The button highlights while a checkpoint is active and shows the retry count.
- **Typed-message retry** — With text in the input box, Retry checkpoints that text and posts-and-continues it natively.
- **Smart checkpoint lifecycle** — The checkpoint clears automatically when a new message is added, you switch chats, or you clear it manually; editing the checkpointed message updates the snapshot. The prefix is frozen against tool-driven edits — only *your* edits change it. State persists per-chat across refreshes.
- **Configurable indicator** — Mark the checkpointed message with a border, an icon, or nothing.
- **Phrase Ban integration** — While a checkpoint is active, a banned-phrase hit drives a fresh retry from your checkpoint (with the offending phrase added to the ban list) instead of an in-place rewrite, so detection and retries share one swipe stack.

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

### How to Use Phrase Ban

1. Open **Extensions** > **Saint's Silly Extensions** and find the **Phrase Ban** section. Tick **Enable Phrase Ban**.
2. Open **Banned Phrase Patterns** and add one regex per line for the phrasing you never want to see again, e.g.:
   - `voice was (thick|heavy) with` — catches every pronoun/verb variation of the cliché
   - `something (he|she|they) (didn't|couldn't) want to name`
   - `despite the \w+ (around|between) them`
3. Leave **Auto-Scan AI Messages** on. From now on, any AI reply matching a pattern is automatically rewritten (the matched phrases are quoted to the model so it knows exactly what to avoid), and the original stays available as a swipe.
4. Tune **Max Rewrite Attempts** to taste: raise it for stubborn models, or set it to **0** to only get a warning toast instead of a rewrite.
5. Run `/phraseban` at any time to scan and fix the last message manually — useful after editing the pattern list.
6. Every detected phrase is collected into the per-chat **Learned Phrases** list automatically (no toggle needed) — open **Learned Phrases (this chat)** to review and hand-edit it, adding phrases of your own or deleting ones you don't want. While Phrase Ban is enabled, this list is automatically fed into your backend's sampler-level `banned_strings` on **Text Completion** backends, so the model is *unable* to emit those phrases. (On Chat Completion APIs there's no sampler ban — see the next step.)
7. *(Optional)* Tick **Proactive Injection (avoid learned phrases)** to also have the model *instructed* to avoid the list before every reply. This is the way to enforce the list on **Chat Completion** APIs (which have no native ban), and works as extra reinforcement on Text Completion too. Adjust the injection **Depth**/**Role**, edit the **Proactive Prompt Template** (must keep `{{bannedPhrases}}`), and use **Clear Learned Phrases** to reset the chat's list. For a "prevent, don't rewrite" workflow, combine the bans with **Max Rewrite Attempts = 0**.

Notes: detection happens after the reply arrives (regex can't run inside the model's sampler), so you'll briefly see the original before the rewrite lands. In group chats only the round's final message can be auto-rewritten, since SillyTavern can only swipe the last message in the chat. The learned list grows from the same detection pass, so a reply must match (and be scanned) once before its phrasing is added — the native/soft ban then prevents *future* reuse.

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
   - **LLM** — set a Response Token Limit and edit the system prompt, the user prompt (with the `{{message}}` placeholder), and the optional prefill. Use **Preview Assembled Prompt** to see exactly what gets sent, and save variants as presets.
3. To reformat a message, click the <span title="text-slash icon">✂</span> button in that message's button row, or run `/reformat` to reformat the last message. (Reformatting is manual — it only ever acts when you ask it to.)
4. The reformatted text becomes the active version of the message; the original is kept as a swipe, so you can always swipe back to it.

### How to Use Compaction

1. Open **Extensions** > **Saint's Silly Extensions** and find the **Compaction** section. Tick **Enable Compaction**.
2. Optionally set the **Tail Length** (how many recent messages are kept verbatim), the **Summary Token Limit**, and — if you want automatic prompts — **Auto-open at threshold** plus the **Auto Threshold (%)**.
3. When a chat grows long, open the modal: click **Compact Chat** in the hamburger (options) menu, or run `/compact`. (With auto-open on, it appears on its own once the prompt crosses your threshold — after an optional confirmation.)
4. In the modal: optionally add **Summary Guidance** (specific details the summary must preserve) and pick any **lore books** to fold in. Click **Generate Summary**, then refine with **Continue / Retry** or by editing the preview directly. **Checkpoint** saves a restore point for Retry.
5. When the **Story so far** preview reads well, click **Compact**. A fresh chat is created, seeded with the summary plus the last *N* messages (swipes intact), with your per-chat extension state carried over. The original chat stays in your chat history.
6. Continue roleplaying — you take the next turn. Generation is fast again because the context window has been reset.

### How to Use Retry Continue

1. The AI generates a message. You like the first half but not the second.
2. **Edit the message** — delete the unwanted tail, keeping only the good prefix — and confirm the edit. (Optional: skip this to retry the message as-is.)
3. Click **Retry** (the <span title="rotate-right icon">↻</span> button in the action bar or hamburger menu), or run `/retry`.
4. The extension saves your text as a checkpoint, creates a new swipe, and continues from it.
5. Not satisfied? Click **Retry** again — each attempt becomes a new swipe.
6. Use the native **swipe arrows** to browse all retry results and pick the best one. `/retryclear` (or the **Clear Retry Checkpoint** button) drops the checkpoint.

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

### Phrase Ban Settings

| Setting | Description |
|---------|-------------|
| Enable Phrase Ban | Toggle the Phrase Ban feature and `/phraseban` on/off |
| Auto-Scan AI Messages | When on, every AI character message is scanned against the ban list as it arrives. When off, only `/phraseban` scans |
| Max Rewrite Attempts | How many times to regenerate a reply that still matches the ban list before giving up (default 2). Caps both the in-place rewrite loop and, when a Retry checkpoint is active, the retry-continue loop. **0** = detect and notify only, never rewrite or retry |
| Native sampler-level ban | Automatic (no toggle): while Phrase Ban is enabled, the Learned Phrases list is appended to each Text Completion request's `banned_strings`, non-destructively per-request. No-op on Chat Completion APIs |
| Proactive Injection (avoid learned phrases) | When on, injects a "don't reuse these phrases" instruction built from the Learned Phrases list before every AI turn. Independent of the native ban; this only controls the soft injection. When off, the list is still built and natively banned (default off) |
| Depth / Role | Where (how many messages from the bottom) and with which role the proactive instruction is injected |
| Learned Phrases (this chat) | The per-chat running list, one phrase per line. Auto-populated from every detection (regardless of Proactive) and freely editable — add your own or delete entries. Stored with the chat, not globally |
| Clear Learned Phrases | Forget every phrase learned in the current chat (also removes its proactive injection). A live count is shown alongside |
| Preset / Preview Assembled Prompt | Save named bundles of the pattern list + rewrite prompt + proactive prompt and preview exactly what gets injected (see Tool Presets & Prompt Preview below) |
| Banned Phrase Patterns | One JavaScript regex per line, matched against the raw message text. Case-insensitive by default; wrap a line in `/…/flags` for custom flags; `#` starts a comment line. Invalid patterns are skipped and reported under the textarea |
| Rewrite Prompt Template | The instruction injected for the rewrite generation. Supports `{{phrasingSeed}}` (the speaker-prefixed message) and `{{bannedPhrases}}` (the list of matched phrases) placeholders |
| Proactive Prompt Template | The persistent instruction injected before every AI turn while Proactive is on and the chat has learned phrases. Supports the `{{bannedPhrases}}` (learned list) placeholder |
| Phrase Ban Debug Mode | Log pattern compilation, matches, and rewrite attempts to the browser console (in the Diagnostics drawer) |

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
| Lore Books (per-chat) | Optional picker for lore books to feed into that tier's generation context. Stored per chat (resets on a new chat); missing books are dropped automatically |
| Themes / Story Arcs (per-chat) | Themes, ideas, or arcs for the model to weave into the tier's next round of guidance |
| Active Guidance (per-chat) | The tier's currently active guidance paragraph. Edit directly to hand-tune steering; edits apply on the next AI turn. |
| Turns Remaining / -1 / Reset / Regenerate Now | Manual controls over that tier's per-chat counter and on-demand regeneration |

### Reformatting Settings

| Setting | Description |
|---------|-------------|
| Enable Reformatting | Toggle the Reformatting feature, its per-message buttons, and `/reformat` on/off. Reformatting is manual only — there is no automatic on-arrival pass |
| Engine | Which engine to use: **Rules** (deterministic transforms) or **LLM** (prompt-based rewrite) |
| Asterisks (Rules) | Mutually-exclusive choice: **Leave as-is**, **Strip asterisks** (remove every italic / bold marker), or **Wrap narration in asterisks** (wrap everything outside quoted dialogue; strips existing asterisks first so the result is consistent) |
| Collapse Extra Whitespace (Rules) | Independent option: collapse runs of 3+ blank lines to one and trim trailing spaces |
| Response Token Limit (LLM) | Maximum tokens the model may use to reformat a message (default 800) |
| Preset / Preview Assembled Prompt (LLM) | Save named bundles of the LLM system prompt + prompt + prefill and preview exactly what gets sent (see Tool Presets & Prompt Preview below) |
| System Prompt (LLM) | The system prompt sent for each LLM reformat — sets the model's role and overall instructions |
| Prompt Template (LLM) | The user prompt sent for each LLM reformat. Supports the `{{message}}` placeholder; if missing, the message is appended automatically |
| Prefill Template (LLM) | Optional assistant prefix the model continues from, kept at the start of the result. Prefill echoes from backends that ignore prefills are stripped automatically |
| Reformatting Debug Mode | Log detailed Reformatting events to the browser console (in the Diagnostics drawer) |

### Compaction Settings

| Setting | Description |
|---------|-------------|
| Enable Compaction | Toggle the Compaction feature, its **Compact Chat** menu item, `/compact`, and the auto-trigger |
| Auto-open at threshold | When on, automatically open the Compaction modal after a turn finishes once the measured prompt crosses the threshold. The modal still requires you to act — nothing is rewritten headlessly |
| Confirm before auto-opening | Show a confirmation dialog (with a **Don't ask again** option) before auto-opening the modal |
| Migrate per-chat extension state | Carry Possession, Narrative Guidance, and Phrase Ban per-chat state into the compacted chat (World Info Assist guidance travels on the lorebook automatically) |
| Auto Threshold (%) | Percent of the model's context window (measured outgoing prompt) that triggers the auto-open (default 90) |
| Tail Length | How many of the most recent messages are copied into the new chat verbatim, swipes preserved (default 20). Older messages are replaced by the summary |
| Summary Token Limit | Maximum tokens for the summary generation (default 1200) |
| Max Context Override | If > 0, caps how many tokens of chat history the summary generation pulls in. 0 = use the model's full context size |
| Preset / Preview Assembled Prompt | Save named bundles of the summary prompt + prefill and preview exactly what gets sent (see Tool Presets & Prompt Preview below) |
| Summary Prompt | The user prompt for the summary. Supports `{{context}}` (packed chat history minus the verbatim tail, plus selected lore books) and `{{guidance}}` (your Summary Guidance) placeholders; if missing, the context is prepended and the guidance appended last, wrapped emphatically |
| Summary Prefill | Optional assistant prefix the model continues from, kept at the start of the summary. Prefill echoes from backends that ignore prefills are stripped automatically |
| Summary Guidance (per-chat, in the modal) | Specific details the summary must preserve. Stored with the chat and remembered across compactions of the same storyline |
| Compaction Debug Mode | Log detailed Compaction events (prompt measurement, auto-trigger, summary generation, commit pipeline) to the browser console (in the Diagnostics drawer) |

### Retry Continue Settings

| Setting | Description |
|---------|-------------|
| Auto-Continue | After creating the retry swipe, automatically trigger Continue to generate from it. When off, Retry just creates the swipe and waits (default on) |
| Auto-set checkpoint on Continue | When you use SillyTavern's normal Continue button, automatically set a retry checkpoint from the current message first (default off) |
| Show toast notifications | Toggle Retry Continue's toast messages on/off (default on) |
| Checkpoint indicator | How the checkpointed message is marked: **Border**, **Icon**, or **None** (default Border) |
| Clear Retry Checkpoint | Button that drops the active checkpoint (same as `/retryclear`) |
| Retry Continue Debug Mode | Log detailed Retry Continue events (checkpoint set/clear, snapshot lock transitions, swipe creation) to the browser console (in the Diagnostics drawer) |

### Silent Generation

| Setting | Description |
|---------|-------------|
| Stream output into fields | Live-stream silent generations (Assisted Character Creation, World Info Assist, Narrative Guidance, LLM Reformatting) into their output fields token by token, instead of waiting for the full response. Each fresh generation clears the field as it starts; stopping mid-stream keeps whatever has arrived in the field — Narrative Guidance saves the kept partial as the active guidance — so you can edit it or hit Continue. Supported for Chat Completion, Text Completion, KoboldAI Classic (streaming-capable KoboldCpp), and NovelAI (with its streaming toggle on); other backends — or a stream that fails before the first token — fall back to a single write when the response completes. Default: on. |

### Diagnostics

| Setting | Description |
|---------|-------------|
| Silent Generation Debug Mode | Log the silent-generation manager's lifecycle (job start/abort/completion, stop-listener events, stream token counts) to the browser console. Useful when diagnosing why a Stop button does or doesn't halt the LLM backend across ACC, WIA, and Narrative Guidance. |

### Tool Presets & Prompt Preview

Each tool's settings drawer (Phrasing, Phrase Ban, Assisted Character Creation, World Info Assist, Narrative Guidance, Reformatting) has a **Preset** block that saves and restores *all* of that tool's editable prompt fields together — so a prompt that describes its prefill's format always travels with that prefill:

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
| Phrase Ban | `{{phrasingSeed}}`, `{{bannedPhrases}}` (rewrite prompt); `{{bannedPhrases}}` (proactive prompt) |
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
| `/phraseban` | Scan the last message against the Phrase Ban regex list and rewrite it (as a new swipe) if banned phrasing is found |
| `/reformat` | Reformat the last message using the configured engine (keeps the original as a swipe) |
| `/compact` | Open the Compaction modal to summarize the chat and start a fresh, compacted chat seeded with the summary plus the recent tail |
| `/retry` | Retry the continuation from the saved checkpoint, creating a new swipe. If no checkpoint exists, sets one from the current message and continues |
| `/retryclear` | Clear the active retry checkpoint |

## License

[GNU General Public License v3.0](LICENSE)

Have fun!
