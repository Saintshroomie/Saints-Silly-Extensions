# Changelog

All notable changes to **Saint's Silly Extensions** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
(`MAJOR.MINOR.PATCH`).

## [Unreleased]

_Changes that have landed on the development branch but are not yet part of a
released version. When cutting a release, move these notes into a new
`## [X.Y.Z]` section and run `npm version`._

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

[Unreleased]: https://github.com/Saintshroomie/Saints-Silly-Extensions/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/Saintshroomie/Saints-Silly-Extensions/releases/tag/v1.1.0
