# SillyTavern Extension API Reference

This directory documents the JavaScript modules that SillyTavern exposes to
third-party extension authors. It complements `CLAUDE.md` at the repo root
— `CLAUDE.md` covers *patterns and how-to guidance*, while these files
serve as a *reference* for the actual exports of each source module.

## How to use these docs

- **`modules/`** — one file per source module, each enumerating its
  exports with signatures, summaries, and import paths. Use these when
  you know the function name or want to scan what a module offers.
- **`guides/`** — task-oriented tutorials ("show a modal", "register a
  slash command", "count tokens"). Use these when you know what you want
  to *do* and need a recipe.

Every page is hand-written from the current source under
`public/scripts/`; treat it as a curated index rather than a generated
typedoc.

## Import paths from a third-party extension

Third-party extensions live at
`data/<user>/extensions/third-party/<extension-name>/`. From an
extension's `index.js`, paths back to the SillyTavern source look like:

| Target | Relative import |
|--------|-----------------|
| `public/script.js` | `'../../../../script.js'` |
| `public/scripts/<file>.js` | `'../../../<file>.js'` |
| `public/scripts/<dir>/<file>.js` | `'../../../<dir>/<file>.js'` |

> The four-up form (`../../../../`) reaches `public/` because the
> extension sits four directories deep relative to it. Anything *inside*
> `public/scripts/` is only three levels up.

Each module file below repeats the correct import path in its header so
you can copy-paste without counting dots.

## Module reference (`modules/`)

### Core

- [`script.md`](modules/script.md) — `public/script.js`: generation,
  prompt injection, message manipulation, characters, context budgets,
  macros, request headers. The largest single export surface.
- [`st-context.md`](modules/st-context.md) — `getContext()` /
  `SillyTavern.getContext()`: the canonical entry point used by most
  extensions.
- [`extensions.md`](modules/extensions.md) — extension lifecycle,
  `extension_settings`, template rendering, generation interceptors.
- [`events.md`](modules/events.md) — `eventSource`, `event_types`, full
  event catalog with parameter signatures.
- [`constants.md`](modules/constants.md) — shared enums:
  `debounce_timeout`, `MEDIA_*`, `SWIPE_*`, `inject_ids`, etc.

### Generation pipeline

- [`openai.md`](modules/openai.md) — chat-completion settings, model
  list, `ChatCompletion` class, streaming, capability checks.
- [`tokenizers.md`](modules/tokenizers.md) — token counting,
  tokenizer selection, model-specific encoders.
- [`reasoning.md`](modules/reasoning.md) — chain-of-thought parsing,
  reasoning UI, hidden-reasoning model detection.
- [`instruct-mode.md`](modules/instruct-mode.md) — instruct-mode prompt
  formatting and preset management.
- [`sysprompt.md`](modules/sysprompt.md) — system prompt library.
- [`tool-calling.md`](modules/tool-calling.md) — `ToolManager` for
  model tool / function calls.
- [`macros.md`](modules/macros.md) — `MacrosParser`, `evaluateMacros`,
  custom macro registration.

### Chat / messages / characters

- [`chats.md`](modules/chats.md) — message hiding, file attachments,
  data bank, neutral-chat handling.
- [`group-chats.md`](modules/group-chats.md) — `selected_group`,
  member access, group chat lifecycle.
- [`personas.md`](modules/personas.md) — user personas, avatar
  switching, persona locking.
- [`tags.md`](modules/tags.md) — character tagging, tag filters.
- [`world-info.md`](modules/world-info.md) — lorebook entries, WI
  scanning, position/strategy enums.

### State & storage

- [`variables.md`](modules/variables.md) — local/global custom
  variables (the `/var` system).
- [`secrets.md`](modules/secrets.md) — credential storage, `SECRET_KEYS`.
- [`power-user.md`](modules/power-user.md) — the `power_user` settings
  object, fuzzy search helpers, stopping strings, story-string render.

### UI & utilities

- [`popup.md`](modules/popup.md) — `callGenericPopup`, `Popup` class,
  `POPUP_TYPE`, `POPUP_RESULT`.
- [`templates.md`](modules/templates.md) — `renderTemplate` and
  `renderTemplateAsync` for Handlebars-style templates.
- [`ross-ascends-mods.md`](modules/ross-ascends-mods.md) —
  `dragElement`, mobile detection, time formatting.
- [`utils.md`](modules/utils.md) — general utilities: deep merge,
  fuzzy helpers, file download, validation, pagination.
- [`i18n.md`](modules/i18n.md) — localization (`t` template tag,
  `translate`, `applyLocale`).

### Slash commands

- [`slash-commands.md`](modules/slash-commands.md) — both the
  top-level `slash-commands.js` and the `slash-commands/` subdirectory
  (parser, command, argument, closure, abort, scope classes).

## Task-oriented guides (`guides/`)

- [`getting-started.md`](guides/getting-started.md) — set up a
  third-party extension and import from SillyTavern core.
- [`show-a-modal.md`](guides/show-a-modal.md) — confirms, prompts,
  custom dialogs.
- [`read-write-variables.md`](guides/read-write-variables.md) — chat
  variables, when to use them vs. metadata vs. settings.
- [`inject-into-prompts.md`](guides/inject-into-prompts.md) — deeper
  dive on `setExtensionPrompt` with multi-key strategy.
- [`generate-llm-responses.md`](guides/generate-llm-responses.md) —
  `generateRaw` vs. `generateQuietPrompt`, prefill, stop strings.
- [`count-tokens-and-budget.md`](guides/count-tokens-and-budget.md) —
  building a live token budget display.
- [`register-slash-commands.md`](guides/register-slash-commands.md) —
  modern `SlashCommandParser.addCommandObject` pattern.
- [`world-info-and-lore.md`](guides/world-info-and-lore.md) — reading
  active WI, modifying entries, position enums.
- [`handle-reasoning-models.md`](guides/handle-reasoning-models.md) —
  stripping reasoning from raw output, updating reasoning UI.
- [`manage-chat-messages.md`](guides/manage-chat-messages.md) — add,
  edit, delete, hide; swipes; the `MESSAGE_EDITED` string-ID gotcha.
- [`secrets-and-api-keys.md`](guides/secrets-and-api-keys.md) —
  storing credentials with `writeSecret` / `findSecret`.
- [`personas-and-users.md`](guides/personas-and-users.md) — reading
  persona description, switching avatars.
- [`group-chats.md`](guides/group-chats.md) — group-aware code,
  waiting for generation, scoping per-chat data.
- [`streaming-and-events.md`](guides/streaming-and-events.md) —
  `STREAM_TOKEN_RECEIVED`, lifecycle guards, the 1000 ms unlock delay.
- [`ui-panels-and-drag.md`](guides/ui-panels-and-drag.md) — settings
  drawers, popout panels, drag handles, ST CSS variables.

## Conventions used in these docs

- **Signatures** are written in JSDoc-flavored TypeScript-ish syntax,
  e.g. `getTokenCountAsync(str: string, padding?: number) → Promise<number>`.
  Optional parameters get `?`, default values are inlined where useful.
- **"Exports at a glance"** tables sit at the top of each module file
  so you can scan for what you need before reading prose.
- **Cross-links**: module files link to the relevant guide via
  *"See guide:"* lines, and guides link back to the modules they touch.
- **Async / sync** is noted explicitly when both flavors exist for the
  same operation (e.g. `getTokenCount` vs. `getTokenCountAsync`).
- **Out of date?** These docs are hand-curated. If a signature disagrees
  with the source, the source wins — please open a PR.

## See also

- [`CLAUDE.md`](../../CLAUDE.md) — extension development patterns,
  best practices, gotchas (the "how to think about extensions" doc).
- [`public/scripts/extensions/`](../../public/scripts/extensions/) —
  first-party extensions you can study as real-world examples.
