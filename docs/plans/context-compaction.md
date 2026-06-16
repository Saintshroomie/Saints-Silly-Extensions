# Plan: Context Compaction ("Continuation")

Status: **approved design, not yet implemented**
Branch: `claude/friendly-cori-t5nxgb`

## Problem

Long chats (1000+ messages) eventually fill the model's context window. Once
full, SillyTavern evicts the oldest history each turn, which shifts every later
token to a new position and invalidates the backend's KV cache from the
eviction point onward — so every post-fill turn triggers a near-full reprocess
and generation slows to a crawl.

The only true fix is to make the prompt short again. This feature
**summarizes the chat, starts a fresh chat seeded with that summary plus the
recent tail, migrates all per-chat extension state, and resumes** — resetting
the context window and restoring fast generation. It's periodic context
compaction, analogous to what agent harnesses do when they compact a long
conversation.

## User-facing behavior

- **Manual trigger:** a button + `/compact` slash command.
- **Auto trigger:** when the *measured* prompt size crosses a user-set % of the
  context window. The trigger is the **only** automatic part — every compaction
  still requires a deliberate user action in the modal. No headless rewrites.
- **Guided summary modal** (mirrors the Assisted Character Creation modal): the
  user adds **guidance** demanding specific details be captured, picks which
  **lore books** to fold in, generates a **summary preview** they can edit,
  then clicks **Compact** to commit.
- The summary lands in the new chat as a visible, editable **"Story so far"**
  message, followed by the last *N* messages copied over verbatim (swipes
  preserved). The old chat is left intact and selectable from history.

## Locked decisions

1. **Handoff:** summary + last **20** messages (configurable). Tail messages are
   deep-copied in full — `mes`, `swipes`, `swipe_info`, `extra` — so the user
   can still swipe to alternates in the new chat.
2. **Trigger basis:** **token-%** of `getMaxPromptTokens()`, driven by the
   *measured* outgoing prompt (see "Token measurement"), plus the manual button.
3. **Summary placement:** a visible, editable "Story so far" message
   (`is_system: false` — see "Why not is_system").
4. **State migration:** carry over **all** per-chat extension state
   (Possession, Narrative Guidance, Phrase Ban). WIA needs nothing — its
   guidance lives on the lorebook entry and travels automatically.
5. **Auto confirmation:** confirm dialog with a persisted **"Don't ask again"**
   (flips `contextCompactionConfirmAuto`).
6. **Prompt order:** `[packed chat-minus-tail]` → `[summary instructions]` →
   `{{guidance}}` **last**. Chat is relegated to the top/back (weakest by
   recency); the user's demanded details land at the very end where they're
   strongest, wrapped emphatically.
7. **Modal during generation:** never opened while a generation is in flight —
   pre-open guard on both paths.

## SillyTavern API findings

Verified against `docs/api/` (local) and live ST source.

| Need | API | Status |
|---|---|---|
| Context window size | `getMaxPromptTokens()` (`script.js`, already imported in `utils.js`) | ✅ confirmed |
| Token counting | `getTokenCountAsync()` (`tokenizers.js`, already used) | ✅ confirmed |
| Measured chat-completion prompt | event `CHAT_COMPLETION_PROMPT_READY` → `{ chat, dryRun }` | ✅ confirmed |
| Measured text-completion prompt | event `GENERATE_AFTER_COMBINE_PROMPTS` → `{ prompt, dryRun }` | ✅ confirmed |
| New **group** chat | `createNewGroupChat(groupId)` (`group-chats.js`) — clears chat, pushes a `humanizedDateTime()` id, saves, re-renders; **preserves the group** | ✅ confirmed |
| New **solo** chat | `doNewChat` (New Chat button handler) | ⚠️ **not in API docs — verify at impl** |
| Seed messages | `ctx.chat.push(msg)` → `addOneMessage(msg)` → `ctx.saveChat()` | ✅ confirmed (Possession + manage-chat-messages guide) |
| Clear chat (fallback) | `clearChat({ clearData })` | ✅ confirmed |
| Date-stamp chat name (fallback) | `humanizedDateTime()` (`ross-ascends-mods.js`; also on context) | ✅ confirmed |
| Metadata | `ctx.chatMetadata`, `ctx.saveMetadata()` | ✅ confirmed |

### Open item: solo new-chat creation

`doNewChat` is the intended function (it's the "New Chat" button handler and is
imported by other extensions) but it does **not** appear in this repo's
`docs/api/modules/script.md`. **At implementation time:** confirm
`doNewChat` is exported by the running ST. To avoid a module-load crash if the
named export is absent, prefer a **namespace import**
(`import * as hostScript from '../../../../../script.js'`) and call
`hostScript.doNewChat?.(...)`. If unavailable, fall back to replicating the
button using confirmed primitives: set
`characters[characterId].chat = \`${name2} - ${humanizedDateTime()}\``, reset
`chat[]`/`chatMetadata`, `clearChat({ clearData: true })`, then `saveChat()`.
The webpack externals rule (`webpack.config.js`) externalizes any `../`-prefixed
request regardless of import style, so a namespace import resolves at runtime.

### Why not `is_system` for the summary

ST excludes `is_system` messages from the prompt, and this repo's own
`formatChatLine` (`utils.js`) skips them too. A summary flagged `is_system`
would be visible but **never sent to the model** — defeating the point. The
"Story so far" message must be a normal message (`is_system: false`),
tagged `extra.sse_summary: true` for styling and recognition.

## Module & file layout

New module `src/context-compaction.js`, exporting:

- `initContextCompaction({ settings, saveSettings })` — wire events, register
  slash command, inject the manual button.
- `bindContextCompactionSettings(saveSettings)` — attach settings listeners.
- `registerContextCompactionSlashCommand()` — `/compact`.
- `composeSummaryPrompt(...)` — shared by real generation + Preview.
- `showContextCompactionPromptPreview()`.
- `getContextUsage()` — `{ tokens, max, ratio }` for the UI + trigger.
- `onContextCompactionGenerationEnded()` — idle auto-trigger check.
- `onContextCompactionChatChanged()` — reset measured tokens for the new chat.
- Two passive prompt-measurement listeners (registered in `init`).

Touch points:

- `src/index.js` — `defaultSettings` additions; `initContextCompaction(...)`;
  `TOOL_PRESET_CONFIG` entry; event-wiring wrappers; subscribe the two
  measurement events; register the slash command.
- `src/settings.html` — new collapsible drawer + a Diagnostics debug toggle.
- `src/style.css` — `cc-`prefixed modal styles mirroring the `acc-` flex fixes;
  `extra.sse_summary` message styling.
- `src/utils.js` — optional: factor the cold-start chat-token estimate out of
  `buildContextPreamble`'s packing loop (or a thin sibling) for reuse.
- `README.md` — feature docs, settings table, `/compact`.

No directory-depth changes (preserves webpack `../../../../` externals).

## Settings (`defaultSettings` in `index.js`)

| Key | Default | Meaning |
|---|---|---|
| `contextCompactionEnabled` | `false` | Master toggle |
| `contextCompactionAutoEnabled` | `false` | Auto-trigger on threshold |
| `contextCompactionThresholdPercent` | `90` | % of `getMaxPromptTokens()` |
| `contextCompactionTailLength` | `20` | Verbatim messages carried over |
| `contextCompactionConfirmAuto` | `true` | Confirm before auto-restart |
| `contextCompactionSummaryPrompt` | `<default>` | Editable summary instructions |
| `contextCompactionSummaryPrefill` | `''` | Optional assistant prefill |
| `contextCompactionSummaryResponseLength` | `<default>` | Summary token cap |
| `contextCompactionMaxContextOverride` | `0` | Cap context pulled into the summary gen |
| `contextCompactionMigrateState` | `true` | Carry over per-chat extension state |
| `contextCompactionDebugMode` | `false` | Diagnostics logging |

Per-chat state (in `chatMetadata`, key `contextCompaction`):
- `guidance` — the user's demanded-details text, persisted per-chat (NG-like),
  so it survives across opens and across compactions of the same storyline.

The summary prompt + prefill join the tool's presets via a `TOOL_PRESET_CONFIG`
entry (key, label, `textareaId`, `defaultText`), like ACC.

## Token measurement (trigger data source)

Passive listeners registered in `init`, ignoring `dryRun: true`:

- `CHAT_COMPLETION_PROMPT_READY` → tokenize the `chat` array → `lastPromptTokens`.
- `GENERATE_AFTER_COMBINE_PROMPTS` → tokenize the `prompt` string → `lastPromptTokens`.

`lastPromptTokens` is the **true** outgoing size — character cards, persona,
*activated* world info, system prompt, author's notes, and every injection
included — so it catches the "static overhead alone blows past the threshold"
case that a chat-only estimate would miss.

`getContextUsage()` returns `lastPromptTokens / getMaxPromptTokens()`. Caveats
(both benign):
1. **One-turn lag** — we learn true size during/after a generation, so the
   threshold trips on the *next* idle check. Fine; the slowdown is gradual.
2. **Cold start** — before the first live generation, fall back to the
   chat-token estimate from the `buildContextPreamble` tokenizer loop. The real
   number takes over after one turn. Reset to cold-start on `CHAT_CHANGED`.

## The guided summary modal (mirrors ACC)

Launched by the manual button / `/compact`, and by the auto-trigger after
confirm. **Pre-open guard:** if `getContext().isGenerating`, refuse to open
(manual → toast "wait for generation to finish"; auto is already idle-fired off
`GENERATION_ENDED`).

Structure (top → bottom):

- **Context-usage banner:** "Context ~92% full (≈X / Y tokens)".
- **Summary Guidance textarea:** demand specific details to capture. Mirrors
  ACC's brief field; persisted per-chat in `chatMetadata.contextCompaction.guidance`.
- **Lore-book picker:** shared `createLoreBookPicker` (enabled entries only),
  feeding `loreBookNames` into the preamble so canon isn't lost.
- **Action row:** **Generate Summary** / **Continue** / **Checkpoint** /
  **Retry** — Stop-while-generating + disabled-state logic copied from ACC.
- **Max Tokens** row (summary length).
- **Status bar** (spinner + text) during generation.
- **Summary preview textarea** — the editable "Story so far" before commit;
  generation streams into it live via `streamingGenerate`. This is the
  `flex: 1 1 0%` output box.
- **Footer:** the Popup's affirmative button is **"Compact"** (+ Cancel).
  `onClosing` refuses to commit mid-generation or with an empty summary
  (straight from ACC's guard). Cancel/Esc aborts the modal's own summary gen
  (via `abortAllGenerations()`) and commits nothing.

### Critical CSS fixes to reuse (from ACC)

The ACC modal renders correctly inside ST's `Popup` because of a flex chain
that must be mirrored on the `cc-` classes:

- `.cc-modal-body`: `display:flex; flex-direction:column; flex:1 1 0%;
  min-height:0; text-align:left`. The **`min-height:0`** is the load-bearing
  fix (lets flex children shrink so the textarea doesn't overflow the popup);
  **`text-align:left`** overrides ST popups' default centering.
- `.cc-summary-section` + `.cc-summary-output`: the same `flex:1 1 0%;
  min-height:0` so the output box fills remaining height and scrolls instead of
  blowing out the modal.
- Popup opened with `{ wide:true, large:true, allowVerticalScrolling:true }`.

Use a separate `cc-`prefixed style set (not the `acc-` classes) to keep the
modules' styles decoupled.

### Prompt composition

The editable template carries `{{context}}` and `{{guidance}}` macros via
`applyTemplateMacros` (the extension's own macro engine, not ST's), ordered:
`{{context}}` (packed chat-minus-tail) → summary instructions → `{{guidance}}`.
Guidance is appended **last** and wrapped emphatically, e.g.:

> CRITICAL — the summary MUST explicitly preserve the following:
> {{guidance}}

`composeSummaryPrompt` is shared by the real generation and the Preview button
so the preview never lies. Prefill is dual-use (assistant prefix + prepended to
output) → run `stripPrefillEcho` at the prepend site.

## Compaction pipeline

A single `async runCompaction({ manual })`, guarded by a module-level
`compacting` flag.

1. **Pre-open guard** — bail if `isGenerating` or already `compacting`.
2. **Open modal** — load per-chat guidance; show usage banner.
3. **Generate Summary** (in modal) → `composeSummaryPrompt` → `streamingGenerate`
   into the preview box. Continue/Retry/Checkpoint/manual edits work as in ACC.
   Stop routes through `abortAllGenerations()`. Respect `isSilentGenerationAbort`.
4. **User clicks "Compact"** → commit (set `compacting = true` for 4a–4f):
   1. **Snapshot** `chatMetadata` (SSE keys) + the last-*N* tail (deep copy,
      swipes preserved) + character/group identity.
   2. **Create the fresh chat:** group → `createNewGroupChat(groupId)`; solo →
      `doNewChat` (or documented fallback). Both wipe `chat` + `chatMetadata`
      and fire `CHAT_CHANGED`.
   3. **Restore metadata** — merge the snapshot's SSE keys into the new
      `chatMetadata` → `saveMetadata()`. (Before seeding, so NG/Possession
      `CHAT_CHANGED` handlers see correct state.)
   4. **Seed** the "Story so far" message (preview box's final text;
      `is_system:false`, `extra.sse_summary:true`) then the copied tail, each
      via push → `addOneMessage` → (`saveChat` once at the end).
   5. **Reset** `lastPromptTokens` to the cold-start estimate.
   6. **Toast** — "Compacted: summarized N messages, kept last 20."
5. **Cancel/Esc** — abort any in-flight summary gen, commit nothing.

No forced first-response generation — the user takes the next turn.

## State migration

Driven by `contextCompactionMigrateState`, via the snapshot/restore in 4a/4c:

- **Possession** — `{ name, avatar }`.
- **Narrative Guidance** — per-track `{ guidance, turnsRemaining, themes, loreBookNames }`.
- **Phrase Ban** — `bannedPhrases` learned list.
- **WIA** — nothing to do (lives on the lorebook entry).

## Event-ordering & re-entrancy safeguards

(Same class of problem already solved in Phrase Ban / NG.)

- Module-level `compacting` flag checked by: the auto-trigger (no double fire),
  our `MESSAGE_RECEIVED`/`CHAT_CHANGED` reactions, and the measurement listeners.
- New-chat functions fire `CHAT_CHANGED` → NG recompute, Reformatting rescan,
  Phrase Ban react. Seeding fires message paths. The whole commit (4a–4f) runs
  under `compacting` so **our** auto-trigger/summary logic doesn't re-enter on
  the freshly-seeded messages.
- Restore metadata **before** seeding.
- Auto-trigger fires off `GENERATION_ENDED` + `setTimeout` (idle, detached from
  ST's generation pipeline), never mid-emit.

## Solo vs group

Single branch at pipeline step 4b keyed on `ctx.groupId`. Everything else
(snapshot, summary, restore, seed) is identical. Smoke-test both, plus
Possession-active in a group (avatar resolution).

## Edge cases

- Chat shorter than the tail length → keep everything / no-op with a toast.
- Summary generation aborted → no chat created, clean bail.
- No character/group selected → guard out.
- `getMaxPromptTokens()` nonsensical → fall back to estimate, never divide-by-zero.
- User edits "Story so far" after the fact → fine, it's a normal message.

## Build order

1. Settings + drawer + binding (inert).
2. Token measurement listeners + `getContextUsage()` + usage readout.
3. Summary prompt + preset + Preview.
4. Modal (mirroring ACC, with lore picker + guidance) + manual button + `/compact`.
5. Commit pipeline (snapshot → new chat → restore → seed) behind Compact.
6. Auto-trigger + confirm dialog (+ "Don't ask again").
7. State migration.
8. Re-entrancy hardening + solo/group testing.
9. README; lint; let the pre-commit hook rebuild `dist/`.

## Validation

No test suite — validation is `npm run lint` + manual smoke-test inside
SillyTavern. Specific manual checks: both API families (chat completion + a
text-completion backend) for token measurement; solo + group compaction;
swipes survive on carried tail; all three migrated states present in the new
chat; auto-trigger confirm + "Don't ask again"; modal refuses to open during a
live generation.
