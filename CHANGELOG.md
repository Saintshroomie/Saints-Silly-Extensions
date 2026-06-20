# Changelog

All notable changes to **Saint's Silly Extensions** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
(`MAJOR.MINOR.PATCH`).

## [Unreleased]

_Changes that have landed on the development branch but are not yet part of a
released version. When cutting a release, move these notes into a new
`## [X.Y.Z]` section and run `npm version`._

### Added
- **Group Director** — an LLM-chosen turn order for group chats. While enabled,
  the active group is switched to **Manual** reply order (your previous strategy
  is restored when you disable it) so SillyTavern stops auto-picking; on each of
  your turns a small "director" generation reads the scene and chooses who
  should speak next, and that member is triggered via ST's native `force_chid`
  group generation. A confirm/override dialog (toggleable) shows the rolled pick
  with a button per cast member so you can accept or redirect it; the `/next`
  (alias `/director`) slash command rolls again for back-to-back speakers. The
  roster is numbered and the director is asked to reply with just the number;
  an unparseable reply falls back deterministically to the next cast member
  (never a walk-on) after the last speaker, so a turn is never skipped or
  randomly assigned. **Muted members** (`disabled_members`) are never
  selectable; the director always voices its pick — including the character you
  are currently **possessing** (it no longer yields the turn). Editable director
  instructions (with `{{context}}` / `{{roster}}` macros), preset support, a
  prompt preview, and per-tool response-length / max-context controls. While the
  director is choosing, a click-to-cancel progress toast is shown (the silent
  roll has no native Stop button). Pressing **Send** with an empty input box
  advances the scene — the director picks the next speaker (same as `/next`).
  Also detects ad-hoc **walk-on characters** the story introduces inline as
  `[Name]:` speaker lines (in your sends, possessed posts, AI replies, or edits),
  including several in one message, with a toast on each new detection. Real
  members, your persona, and common meta-tags (`[OOC]:`, `[System]:`, …) are
  ignored, and a per-chat editable list is kept (with a "Scan Chat for Walk-ons"
  backfill button). Walk-on lines can also be **split into their own messages**,
  posted under each name (with the matching character's avatar when it's a real
  member) as if natively posted: automatically for AI replies (toggle), or on
  demand via a per-message scissors button. The **director can voice walk-ons**:
  when enabled they join the speaker roster and the confirm/override dialog
  alongside real members, and choosing one generates a reply in that walk-on's
  voice (editable template) and posts it under their name — trimmed to that
  walk-on's single turn (a stray `Name:` label or a reply that runs on into
  other characters' lines is cleaned up automatically). A **"Reuse chat
  context (KV-cache friendly)"** toggle (default on) routes the director's silent
  generations through ST's normal pipeline (a quiet generation anchored to the
  last speaker) so their prompt prefix matches the chat and the KV cache stays
  warm — only the instruction tail is reprocessed — instead of the leaner
  standalone prompt that busts the cache.

## [1.3.0] - 2026-08-08

### Added
- **Phrasing: Auto Phrasing** — a new toggle (off by default) that runs the
  rephrase on *every* message you send instead of only when you press the
  quill. Sending — by button, Enter, or Ctrl+Enter — rewrites the typed text
  and then sends the result; while possessing a character, the rewritten
  message is posted as that character and the reply is triggered, so the turn
  plays out exactly as a normal send would. Empty sends (SillyTavern's
  continue/regenerate path), slash commands typed into the chat box, and
  sends made while a message is being edited are left untouched. Stopping
  mid-rewrite sends nothing: whatever was generated stays in the chat box to
  edit and send by hand, and if the rewrite produces nothing at all your
  original text is put back.
- **Point-of-use preset selection** — the tools with an interactive surface
  now let you pick their prompt preset right where the work happens instead
  of detouring into the settings drawer: a **Prompt Preset** dropdown in the
  **Assisted Character Creation**, **Compaction**, and **Image Prompting**
  modals, and a **Preset** dropdown on every World Info entry's **Assist**
  row (so the type of entry World Info Assist produces is chosen per
  generation). The new dropdowns mirror the settings widget — same preset
  list, same **(modified)** dirty marker, same discard-unsaved-changes
  confirmation — and stay in sync with it and with each other; changing the
  selection anywhere updates everywhere. Preset management (Save as New /
  Update / Rename / Delete) remains in the settings drawer next to the
  prompt fields the presets bundle.
- **Image Prompting** — new tool that turns the current moment of the chat
  into a ready-to-paste prompt for an external image-generation tool
  (ComfyUI, etc.). An **Image Prompt** item in the hamburger menu (and
  `/imageprompt`) opens a modal mirroring Assisted Character Creation:
  a silent generation reads the current chat and any selected lore books and
  streams an image prompt into an editable textarea, with **Generate /
  Continue / Checkpoint / Retry**, a Max Tokens cap, optional free-text
  guidance, and **Copy** / **Copy & Close** buttons. The prompt template is
  preset-managed per diffusion-model family: the **Default** targets Krea 2
  (natural-language prose), and seeded **Anima (Tags + Prose)** and
  **Danbooru Tags** presets target Circlestone Labs' Anima Base and pure
  booru-tag models, with quality-tag prefills supplied where appropriate.
- **Image Prompting: per-chat saved prompts** — a **Save** button beside the
  modal's output stores the finished image prompt with the current chat
  (`chatMetadata.imagePrompting.savedPrompts`) under a title of your choosing
  (a suggestion is offered from the prompt's opening words), and a **Saved
  Prompts** section at the bottom of the modal lists everything saved there
  (newest first, titled) with per-entry **Load / Copy / Rename / Delete**
  buttons — so a good prompt can be found and re-rendered later in that
  chat. Saved prompts survive reloads, travel with chat exports, and are
  carried into the fresh chat by Compaction's state migration alongside the
  other per-chat extension state.
- **Image Prompting: per-message button to prompt an earlier moment** — every
  chat message now gets its own <span title="image icon">🖼</span> button
  (alongside the other per-message quick actions, toggleable in the Image
  Prompting settings) that opens the Image Prompt modal *anchored at that
  message*: the chat context packed into the generation ends there, so the
  generated prompt depicts that moment of the story instead of the latest
  one — with time to add Guidance or switch presets before generating (an
  optional **Auto-generate** setting starts the Generate immediately
  instead). An anchor bar at the top of the
  modal shows which message the context ends at, with a **Full Chat** button
  to drop the anchor; the anchor holds for every Generate/Continue in that
  modal session and clears when the modal closes.
- **Narrative Guidance: Clear buttons for Active Guidance** — each tier's
  **Active Guidance** textarea now has a **Clear** button beside its label
  that wipes the tier's per-chat guidance and removes its prompt injection
  in one click (no more select-all-delete to silence a stale arc).

### Fixed
- **Unreadable banners and status bars** — the generation status bars (ACC,
  Compaction, Image Prompting), Image Prompting's context-anchor bar,
  Compaction's context-usage banner, and Phrase Ban's pattern-error readout
  were drawing their text in the theme's accent colour on a background taken
  from the theme's *text* colour, which on light themes produced pale text on
  a near-white block. They now sit on a subtly darkened, bordered surface with
  body-coloured text (accent kept on the icon, border and warning tint), so
  they stay legible on light and dark themes alike.

## [1.2.0] - 2026-06-19

### Added
- **Retry Continue** — folds the standalone Retry Continue extension into the
  suite. Adds a <span title="rotate-right icon">↻</span> Retry button to the
  hamburger menu and the quick-action bar that snapshots the last message (or
  your edited prefix of it) as a checkpoint, saves it as a swipe, and continues
  from it — so each attempt becomes a swipe you can browse with the native
  arrows. Per-chat checkpoint persistence, a configurable checkpoint indicator
  (border / icon / none), optional auto-set-on-Continue, and the `/retry` and
  `/retryclear` slash commands.
- **Phrase Ban × Retry Continue** — when a Retry checkpoint is active on the
  matched message, Phrase Ban now drives a retry-continue from that checkpoint
  (after learning the offending phrase) instead of an in-place rewrite, so
  detection and retries share one swipe stack and the checkpoint prefix is never
  disturbed. Bounded by the existing Max Rewrite Attempts cap. Applies to both
  the auto path and the manual scan (`/phraseban`).

### Changed
- **Retry Continue checkpoint prefix is now frozen** against tool-generated
  edits — only a genuine user edit updates it. This stops an automatic
  reformat / phrase-ban rewrite from silently re-pointing what a retry continues
  from.

### Removed
- **Reformatting auto-scan** — Reformatting is now manual only (the per-message
  <span title="text-slash icon">✂</span> button and `/reformat`). The
  "Auto-Reformat AI Messages" setting and the on-arrival pass are gone; this
  removes the last automatic writer that could collide with a Retry checkpoint
  or other post-generation tools.

## [1.1.0] - 2026-06-19

### Added
- **Compaction** — a new tool that summarizes a long chat into an
  information-dense "Story so far" recap, then starts a fresh chat seeded with
  that summary plus the recent verbatim tail, so the context window is reset
  without losing the thread. Guided modal with Summary Guidance, lore-book
  selection, and Generate / Continue / Checkpoint / Retry actions that stream
  in live with a Stop button. Adds the `/compact` slash command.
- **Hand-authored continuations** — every tool with a Continue action now lets
  you type your own text into the field and Continue from it (treating your
  text as the prefill). Continue is available whenever the field has text:
  World Info Assist exposes it without a prior generation, and Narrative
  Guidance tracks the guidance text live.
- **Versioning workflow** — `npm version patch|minor|major` now keeps
  `package.json` and `manifest.json` in lockstep via `scripts/sync-version.js`.

### Changed
- **Continue is now a true positional continuation** across Compaction,
  Assisted Character Creation, World Info Assist, and Narrative Guidance. The
  existing text is sent as the assistant prefill (mirroring SillyTavern's
  native Continue), so the model extends from exactly where it left off instead
  of starting a fresh "Part 2".
- **Stop keeps your work** — stopping a streamed generation now leaves the
  partial in the field and keeps the post-generation actions (Continue / Retry /
  Checkpoint) available, so you can halt, edit the partial, and Continue from
  your edits.

### Fixed
- Lore-book picker: clicking a book's **name** (not just the checkbox) now
  selects it, and the dropdown no longer closes when a name is clicked.
- Lore-book picker: fixed an "Aw, Snap" renderer crash on Android Chrome when
  tapping a book name (text selection is now disabled on the picker).
- Compaction mobile hardening: throttled the live streamed field writes and
  bounded the cold-start context estimate to ease memory pressure on very long
  chats.

## [1.0.0]

Initial release. Bundles seven roleplay tools for SillyTavern:

- **Possession** — take over an active character and post messages as them
  (solo + group chats).
- **Phrasing** — LLM rewrite/seed of messages with prompt injection and
  impersonate/swipe flows.
- **Phrase Ban** — regex ban list for AI replies with auto-rewrite, a learned
  banned-phrase list, and optional sampler-level ban / proactive injection.
- **Assisted Character Creation** — modal-based character-sheet builder.
- **World Info Assist** — LLM-drafted lore entries inside the World Info editor.
- **Narrative Guidance** — periodic story-direction paragraphs injected before
  AI turns.
- **Reformatting** — post-generation message formatting (deterministic Rules +
  LLM engines).

Plus shared infrastructure: cancellable **Silent Generation** (with live
streaming) and per-tool **Prompt Presets**.

[Unreleased]: https://github.com/Saintshroomie/Saints-Silly-Extensions/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/Saintshroomie/Saints-Silly-Extensions/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/Saintshroomie/Saints-Silly-Extensions/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Saintshroomie/Saints-Silly-Extensions/releases/tag/v1.1.0
