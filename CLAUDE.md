# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project Overview

**Saint's Silly Extensions** is a third-party extension for [SillyTavern](https://github.com/SillyTavern/SillyTavern) that bundles seven roleplay tools into a single extension package:

1. **Possession** (`src/possession.js`) — Take over an active character and post messages as them. Solo + group chats, with continue/impersonate interception and per-chat state persistence.
2. **Phrasing** (`src/phrasing.js`) — Rewrite or seed messages via LLM with prompt injection + impersonate/swipe flows. Possession-aware. Optional Inverse Guidance mode feeds existing swipes into the prompt to force a wildly different rewrite.
3. **Phrase Ban** (`src/phrase-ban.js`) — Regex ban list for AI replies. Scans each incoming AI message against user-defined regex patterns and, on a match, rewrites it through the Phrasing engine (`rewriteMessageWithTemplate`) with the matched phrases listed in the prompt, retrying up to a configurable cap (0 = notify only). Auto (detached from `MESSAGE_RECEIVED`) + manual (`/phraseban`). Every rewrite is a swipe. Three orthogonal concerns: **rewrites** (gated by Max Rewrite Attempts), the **native ban**, and the **soft injection**. Detection always accumulates the matched phrases into a per-chat learned list (`chatMetadata.phraseBan.bannedPhrases`, editable in a textarea). While Phrase Ban is enabled that list is automatically appended to the request's `banned_strings` on Text Completion backends (via `TEXT_COMPLETION_SETTINGS_READY`, non-destructive — a no-op on Chat Completion, which has no sampler ban). An independent **Proactive Injection** toggle persistently injects a "don't reuse these phrases" instruction built from that list (`setExtensionPrompt`, key `phrase_ban_proactive`) before every AI turn — useful on Chat Completion or as reinforcement. The list builds whether or not it is injected.
4. **Assisted Character Creation / ACC** (`src/assisted-character-creation.js`) — Modal-based character builder: brief in, full bracketed character sheet out, with Generate/Continue/Checkpoint/Retry actions, optional chat/lore-book context, and a configurable prefill. Done writes the result into the description textarea.
5. **World Info Assist / WIA** (`src/world-info-assist.js`) — Injects an Assist control row + persistent guidance textarea into every World Info entry form for LLM-drafted lore entries.
6. **Narrative Guidance / NG** (`src/narrative-guidance.js`) — Periodically generates a short story-direction paragraph and injects it before every AI turn until a per-chat turn counter expires, then regenerates.
7. **Reformatting** (`src/reformatting.js`) — Normalizes the formatting of AI character messages after generation. Two selectable engines: deterministic Rules (a mutually-exclusive asterisk mode — none/strip/wrap narration — plus an independent collapse-whitespace toggle) and LLM (editable system prompt + `{{message}}` user prompt + prefill). Auto (on `MESSAGE_RECEIVED`) + manual (a per-message button injected into `.mes_buttons`, kept present by a `#chat` MutationObserver). Preserves the original as a swipe and guards per-swipe so it never re-processes its own output.

Two infrastructure modules support them:

- **Silent Generation** (`src/silent-generation.js`) — Central cancellation manager + streaming engine for background raw generations. Hooks `GENERATION_STOPPED`, hands each job an AbortController, and exposes `abortAllGenerations()` so extension Stop buttons actually halt the LLM backend. Streams output into the target field token by token where the backend supports it (chat completion, Text Completion, streaming-capable KoboldCpp classic, NovelAI with streaming on), borrowing `createRawPrompt` + the per-API payload builders from ST so prompts match `generateRaw` exactly; unsupported backends and pre-first-token failures fall back to plain `generateRaw`. Toggleable via `silentGenerationStreaming` (default on).
- **Tool Presets** (`src/prompt-templates.js`) — Per-tool named presets (dropdown + Save/Update/Rename/Delete) that bundle *all* of a tool's editable prompt fields (e.g. ACC's prompt + prefill) so coupled fields are saved together. Shows a "(modified)" dirty marker and confirms before discarding unsaved edits. Persisted under `toolPresets` / `activeToolPreset`; legacy per-field `promptTemplates` are migrated on first load by `migrateLegacyToolPresets`.

The extension is loaded by SillyTavern at runtime as an ES module from `dist/index.js` (declared in `manifest.json`).

## Repository Layout

```
manifest.json                   SillyTavern extension manifest (points at dist/index.js)
package.json                    Build, lint, prepare scripts
webpack.config.js               Webpack config — externalizes ../-prefixed host imports
.eslintrc.js                    ESLint config (4-space indent, single quotes, semis)
.githooks/pre-commit            Lints, builds, and re-stages dist/ on every commit
src/
  index.js                      Entry point: settings, init, event wiring
  utils.js                      Shared helpers (context, toast, debug, settings, edit,
                                gen lifecycle, context preamble, lore-book picker,
                                WIA guidance persistence)
  possession.js                 Possession module
  phrasing.js                   Phrasing module
  phrase-ban.js                 Phrase Ban module (regex scan + auto-rewrite)
  assisted-character-creation.js  ACC modal + generation actions
  world-info-assist.js          WIA module
  narrative-guidance.js         Narrative Guidance module
  reformatting.js               Reformatting module (post-generation message formatting)
  silent-generation.js          Cancellable silent-generation manager
  prompt-templates.js           Per-tool prompt preset widget + legacy migration
  settings.html                 Settings panel markup (loaded via html-loader)
  style.css                     Extension styles (loaded via css-loader)
dist/                           Built bundle — committed, regenerated by pre-commit hook
```

## Build & Lint

```bash
npm install            # also runs `prepare`, which sets core.hooksPath = .githooks
npm run build          # webpack production build → dist/index.js
npm run build:dev      # development mode build
npm run lint           # eslint .
npm run lint:fix       # eslint --fix .
```

There is no test suite. Validation = lint + manual smoke-test inside SillyTavern.

### Important: dist/ is committed

`dist/` is **not** in `.gitignore`. The `.githooks/pre-commit` hook lints, builds, and `git add dist` on every commit so the committed snapshot always matches `src/`. When changing anything under `src/`, let the hook rebuild — do not hand-edit `dist/index.js`. If you bypass the hook for any reason, run `npm run build` and stage `dist/` manually.

## Webpack Externals (Critical)

SillyTavern's host scripts live **outside** this extension and are loaded by the host page as ES modules using relative paths like:

```js
import { generateRaw } from '../../../../../script.js';
import { SlashCommandParser } from '../../../../slash-commands/SlashCommandParser.js';
```

`webpack.config.js` marks every `../`-prefixed import (from non-`node_modules` issuers) as an external module and passes the request through unchanged. The relative paths only resolve correctly because both `src/` and `dist/` sit one directory deep, so the same `../../../../...` path works at runtime when SillyTavern serves `dist/index.js` from `extensions/third-party/Saints-Silly-Extensions/dist/`.

**Implications:**
- Never deepen or flatten the directory layout — it would break every host import.
- New imports from SillyTavern core must use the same `../../../../...` form, not aliases.
- `node_modules` code (e.g. the css-loader/style-loader runtimes) is bundled normally.

## Architecture Notes

- **Single entry, several modules.** `src/index.js` owns settings/persistence and wires every module together. Each module exposes an `init…({ settings, … })` function; cross-module needs are passed in (e.g. `initPossession({ phrasingApi: { isPhrasing, handlePhrasingSeedReinjection } })`) rather than imported directly, to keep the dependency graph shallow.
- **Settings live in one object.** `settings` is loaded once in `index.js` and the same reference is shared into every module via `init…`. Defaults live in `defaultSettings` in `index.js`. Persistence goes through `loadExtensionSettings` / `saveExtensionSettings` in `utils.js`, keyed by `EXTENSION_NAME = 'Saints-Silly-Extensions'`.
- **Per-chat state lives in `chatMetadata`.** Possession stores `{ name, avatar }` under the `possession` key; NG stores `{ guidance, turnsRemaining, themes }` under `narrativeGuidance`. WIA guidance text is persisted on each World Info entry's `extensions[WIA_GUIDANCE_EXT_KEY]` so it travels with the lorebook on export.
- **SillyTavern context is fetched fresh.** Always call `getContext()` from `utils.js` when you need it; don't cache it across awaits or events.
- **Event wiring is mostly centralized.** The chat-level `eventSource.on(...)` subscriptions live in the `jQuery(async () => { … })` block at the bottom of `index.js`, with per-module handlers combined into thin wrappers (`onGenerationStarted`, `onGenerationEnded`, etc.). Two exceptions own their listeners directly: `silent-generation.js` (GENERATION_STOPPED → abort all silent jobs) and `world-info-assist.js` (WORLDINFO_* events + a MutationObserver on the WI editor list).
- **Silent generations go through the manager.** ACC, WIA, NG, and LLM Reformatting call `streamingGenerate` (in `utils.js`), which routes through `cancellableStreamingGenerate` in `silent-generation.js`. That streams the output into the target field live when the backend supports it (clearing the field at job start for non-append runs), then overwrites the field with the `cleanUpMessage`-processed final text; callers must keep treating the resolved value (not the field contents mid-stream) as the result, and they all re-write the field with their own post-processed text afterwards. On cancel the streamed partial is deliberately left in the field and attached to the thrown AbortError as `err.streamedPartial` — abort handlers that keep the partial must read it from the error, not the field (which other code may have reset by then); NG adopts it into chat state via `adoptStreamedPartial`. On cancel the awaiting caller gets an AbortError immediately; check it with `isSilentGenerationAbort(err)` to suppress error toasts. Extension Stop buttons must call `abortAllGenerations()` (not just the local abort) so ST's `GENERATION_STOPPED` fires and the legacy non-streaming fetch is actually cancelled (streaming fetches abort via the job's own signal).
- **Context preamble is shared.** `buildContextPreamble` in `utils.js` assembles character cards, persona, selected lore books, and token-budget-packed recent chat (skipping hidden `is_system` messages) for ACC/WIA/NG prompts. Per-tool `*MaxContextOverride` settings cap the budget.
- **Generation templates use extension macros.** ACC/WIA/NG user-prompt templates support `{{context}}`, `{{brief}}`, `{{guidance}}`, `{{title}}`, `{{themes}}` via `applyTemplateMacros` in `utils.js` — deliberately *not* ST's macro engine, because the ACC template contains literal `{{ .fooOverride ?? … }}` syntax that must pass through. When a placeholder is absent the block is prepended/appended in the legacy position, so old custom templates keep working. Each tool has a `compose…Prompt` helper used by both the real generation and its Preview button (`showPromptPreview` in `utils.js`) — keep them shared so the preview never lies.
- **Prefills are dual-use and echo-stripped.** A prefill is sent as the assistant prefix *and* prepended to the final output. Backends that ignore assistant prefixes may re-emit the prefill, so every prepend site runs `stripPrefillEcho` first. New prefill consumers must do the same.
- **Prompt injections must be cleaned up.** Phrasing and NG inject via `setExtensionPrompt`, which persists until overwritten — Phrasing clears unconditionally on `GENERATION_ENDED`/`STOPPED`; NG re-applies or clears on every relevant event. Any new injection needs an equally deliberate clear path.
- **Slash commands** are registered via each module's `register…SlashCommand(s)()` using `SlashCommandParser` from the host. Currently: `/possess`, `/unpossess`, `/phrasing`, `/phraseban`, `/reformat`.
- **Settings panel** is a single HTML blob (`src/settings.html`) injected into `#extensions_settings`, organized as per-tool collapsible drawers plus a Diagnostics drawer for all debug toggles. Each module owns its own `bind…Settings(saveSettings)` to attach listeners after injection. The per-tool preset widgets are wired centrally in `index.js` via `TOOL_PRESET_CONFIG` + `setupToolPresets(...)`, *after* the module binds so preset loads persist through the modules' input listeners.
- **Debug logging** uses `createDebugLogger(prefix, isEnabled)` from `utils.js`. Each module reads its own `*DebugMode` flag from `settings`. The top-level `SSEDebug` in `index.js` always logs.

## Code Style

- 4-space indentation, single quotes, semicolons, trailing commas in multiline.
- ESLint enforces these — run `npm run lint` before committing (the hook does too).
- Prefer small, named helpers over inline lambdas for anything reused.
- Section comments use `// ─── Section Name ───` ASCII dividers; match the existing style when adding new sections.
- JSDoc on shared utilities in `utils.js`. Module-internal helpers don't need it unless behavior is non-obvious.

## When Modifying…

- **Possession**: many DOM hooks key off SillyTavern's chat/group UI. Test in both solo and group chats and verify the impersonate replacement button appears/disappears across `GENERATION_STARTED/ENDED/STOPPED` and `GROUP_WRAPPER_FINISHED`. Characters are resolved by avatar filename first (names can collide in groups).
- **Phrasing**: relies on `setExtensionPrompt` + impersonate/swipe lifecycle. The seed-reinjection on Continue is the trickiest path — test by rephrasing a swipe and then continuing it, and confirm the injection is cleared after the continue generation ends (it must not bleed into later turns).
- **Phrase Ban**: `onPhraseBanMessageReceived` must stay detached (setTimeout) — it waits for the generation to settle and triggers real swipe generations, and `MESSAGE_RECEIVED` is emitted inside ST's generation pipeline, so awaiting it would deadlock. The scan loop owns the retry cycle (`busy` guard + per-swipe `ssePhraseBanChecked` flag keep the rewrite's own MESSAGE_RECEIVED from re-entering); only the last message in the chat can be rewritten. Test: a pattern that matches (auto rewrite fires after generation settles), a rewrite that still matches (retry then give-up toast), Max Rewrite Attempts 0 (notify only), `/phraseban`, and the interplay with auto-Reformatting (Phrase Ban runs after it and re-scans the live text each pass).
- **ACC**: the modal persists its brief/output/context selections across open/close in `persistedModalState`. The prefill is both sent as an assistant prefix and prepended to the final output — keep those two uses in sync. Done writes plain text into `#description_textarea` and dispatches `input`.
- **WIA**: uses a `MutationObserver` (`startWIAObserver`) on `#world_popup_entries_list` to inject controls into newly created World Info entry forms — verify the row still appears for entries created after page load, and that the hidden `#entry_edit_template` is still skipped (injecting into it bakes dead markup into every clone). Guidance persistence goes through the debounced save helpers in `utils.js`.
- **NG**: state writes must go through `writeChatState`/`saveChatState`/`scheduleChatStateSave` — the write-through-then-debounce shape prevents cross-field and cross-chat races. Test the turn counter across `MESSAGE_SENT`/`MESSAGE_RECEIVED`, auto-regen at zero, and Stop mid-generation. Stop mid-stream must keep the streamed partial as the active guidance (`adoptStreamedPartial`: regen resets the turn counter, continue doesn't) — test stopping both with and without tokens received.
- **Reformatting**: the per-message button is injected by a `#chat` MutationObserver (`startReformattingObserver`) and re-added when ST re-renders message nodes; rescanned on `CHAT_CHANGED`. The auto path runs on `MESSAGE_RECEIVED` for AI messages only (`!is_user && !is_system`) and is guarded per-swipe via `swipe_info[swipe_id].sseReformatted` so it never re-processes (or double-wraps) its own output — preserve that guard. Every reformat preserves the prior text as a swipe and re-renders via `updateMessageBlock` + `swipe.refresh(true)`. The Rules engine's asterisk handling is a single mutually-exclusive mode (`reformattingAsteriskMode`: none/strip/wrap, surfaced as a radio group) with collapse-whitespace as a separate toggle; it must stay deterministic and idempotent enough that a no-op returns the input unchanged (so it adds no swipe). The LLM engine routes through `streamingGenerate`. Test both engines, auto + manual, and swiping back to the original.
- **Silent generation / Stop buttons**: any new background generation should run through `streamingGenerate` (or `runCancellableSilentGeneration`) and any new Stop affordance should call `abortAllGenerations()`. Check the abort signal before writing late-arriving results into DOM fields. The streaming engine (`openRawStream` / `streamRawGenerate`) must keep mirroring ST's `generateRaw` path — same `createRawPrompt` construction, same pre-send events, same `cleanUpMessage` post-processing — so streamed and non-streamed results stay interchangeable; test a backend from each family (chat completion + one text-completion API) plus the fallback by toggling `silentGenerationStreaming` off.
- **Settings panel**: when adding a setting, update `defaultSettings` in `index.js`, add the control to `settings.html`, and bind it in the relevant module's `bind…Settings`. For a new editable prompt, also add the field to the tool's entry in `TOOL_PRESET_CONFIG` in `index.js` (key, label, textareaId, defaultText) so it joins the tool's presets, give the textarea a standardized `<small>` placeholder note, and surface it in the tool's `show…PromptPreview`.

## Git & Branch Conventions

- Default branch: `main`. The pre-commit hook runs lint + build on every commit; do not skip it with `--no-verify`.
- Feature work happens on dedicated branches; `dist/` rebuilds are part of the commit, not a follow-up.

## Useful References

- `README.md` — user-facing feature docs, install instructions, settings tables, slash commands.
- `LICENSE` — GPL v3.0.
