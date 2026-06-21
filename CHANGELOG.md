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
- **Automatic World Info in AI-assisted context** — whenever **Use Chat Context**
  is on (Assisted Character Creation, World Info Assist, Narrative Guidance,
  Compaction, and the Group Director's leaner non-cache mode), the extension now
  auto-activates the chat's bound World Info — keyword-matching the recent chat
  and character/persona exactly as a real turn would — and folds the relevant
  entries into the generation context. You no longer have to hand-pick lore books
  for the AI tools to "know" the current scene's lore; the lore-book dropdown
  becomes an **additive override** for extra books that wouldn't otherwise match.
  Activation is a side-effect-free dry run (it never disturbs the live chat's
  World Info state) and is counted against each tool's context budget.

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
  alongside real members, and choosing one posts a reply in that walk-on's
  voice under their name. The reply is generated via **SillyTavern's native
  swipe-regeneration** — a placeholder is posted under the name and ST's own
  pipeline fills it in, so formatting and stop strings are handled natively (with
  ST's usual generation indicator and Stop button). A **"Reuse chat
  context (KV-cache friendly)"** toggle (default on) routes the director's silent
  generations through ST's normal pipeline (a quiet generation anchored to the
  last speaker) so their prompt prefix matches the chat and the KV cache stays
  warm — only the instruction tail is reprocessed — instead of the leaner
  standalone prompt that busts the cache.
- **Group Director — multiple speakers per turn.** After each of your turns the
  director chains several speakers back-to-back (new **Speakers Per Turn**
  setting, default 2), re-deciding after each reply settles, so one message can
  play out a short multi-character exchange. Cancelling any turn's dialog stops
  the chain; `/next` still steps a single speaker.
- **Group Director — pick instantly.** With confirm/override on, the dialog now
  opens *immediately*, before the director decides, so you can just click who
  replies next. The roll runs in the background and highlights its suggestion
  when ready; the "director is choosing…" status moved from the toast into the
  dialog.

### Changed
- **Group Director — walk-on detection now catches bare `Name:` lines.** In
  addition to explicit `[Name]:` markers, the director recognises a bare `Name:`
  at the start of a line as a speaker line (line-anchored and name-shaped to
  limit false positives). This catches the walk-on replies the model slips onto
  the end of another character's message — it only ever sees `Name:` in its
  context (never bracketed) and walk-on names aren't stop strings — for both
  detection and line-splitting. (With auto-split on, script-style cards that
  write real members' dialogue as `Name: "..."` lines will be split too.)

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

[Unreleased]: https://github.com/Saintshroomie/Saints-Silly-Extensions/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/Saintshroomie/Saints-Silly-Extensions/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Saintshroomie/Saints-Silly-Extensions/releases/tag/v1.1.0
