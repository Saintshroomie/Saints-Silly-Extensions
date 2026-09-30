---
name: manual-test
description: Manually test Saint's Silly Extensions in a real, running SillyTavern — install the built extension, seed test characters/lore/scenarios, point ST at a stand-in OpenAI-compatible model that logs every prompt, then drive the UI headlessly with Playwright and verify through ST state, the logged prompts, and screenshots. Use whenever the user asks for manual testing, a smoke test, "test it in SillyTavern", "try it live", or to verify a UI/behavior change end to end (not just unit tests).
---

# Manual testing in a live SillyTavern

Unit tests only cover the pure modules. Everything that touches SillyTavern (buttons, popups, events, prompt injection, what actually reaches the model) is verified here, against a real ST server with the extension installed exactly as a user installs it. The harness lives in `scripts/manual-test/`:

| File | What it is |
|---|---|
| `harness.sh` | Sets up, installs, seeds, starts/stops everything. `up` does it all. |
| `seed.mjs` | Writes test data into ST's default user (run by `harness.sh seed` / `up`). |
| `fake-llm.mjs` | Stand-in OpenAI-compatible model: logs every request, answers with canned text. |
| `lib.mjs` | Playwright helpers for smoke scripts (`run`, `check`, `openGroup`, `sendMessage`, `requests`, …). |
| `example-smoke.mjs` | Baseline smoke test and the template for new ones. |

## Procedure

1. **Pick a work dir in the session scratchpad** and export it in *every* Bash call (shell state doesn't carry over between calls):
   ```bash
   export SSE_TEST_DIR=<scratchpad>/manual-test
   ```
   Logs, the request log, screenshots and `playwright-core` all go there. Nothing is written to the repo except `dist/`, which `install` rebuilds from `src/` exactly as the pre-commit hook would.

2. **Bring it up** (from the repo root). Redirect to a log file; don't pipe it into `tail`/`head`:
   ```bash
   scripts/manual-test/harness.sh up > "$SSE_TEST_DIR/up.log" 2>&1; tail -5 "$SSE_TEST_DIR/up.log"
   ```
   This finds SillyTavern (the attached checkout at `/home/user/SillyTavern` if present, which is the user's fork; otherwise it clones upstream `release` into the work dir), runs `npm ci`, installs `playwright-core` into the work dir, builds the extension and copies `manifest.json` + `dist/` into `public/scripts/extensions/third-party/Saints-Silly-Extensions/`. It then seeds the test data and starts ST (`:8000`) and the stand-in model (`:5005`) detached. A fresh clone plus `npm ci` takes about a minute; later runs take about 30 seconds.
   - Test data: `--source auto` (default) uses an st-toolkit checkout's build (`/home/user/st-toolkit/build`, world `spider-man`) when one is present, otherwise `--source builtin`. Pick a different st-toolkit world with `--world <slug>`; add `--no-private-books` to test the embedded-book fallback. See **Test data** below.
   - Start from a clean ST user: `harness.sh reset` first (wipes `data/default-user`; the next `up` recreates it).

3. **Run the baseline** to confirm the install works before testing anything new:
   ```bash
   scripts/manual-test/harness.sh run scripts/manual-test/example-smoke.mjs
   ```

4. **Write a smoke script for the change** in the scratchpad (copy `example-smoke.mjs`). Import the helpers by absolute path: `import { run, check, … } from '/home/user/Saints-Silly-Extensions/scripts/manual-test/lib.mjs';`. Wrap it in `await run(async ({ page, errors }) => { … })`: it launches headless Chromium, loads ST, catches a crash as a failure (with `failure.png`), fails on page errors, and prints PASS/FAIL lines with an exit code. Make one `check(label, condition, detail)` per behavior. Work through the **Test:** list for the module in CLAUDE.md's "When Modifying…" section: those are the cases the maintainer cares about.

5. **Run it**: `scripts/manual-test/harness.sh run <scratchpad>/smoke-<feature>.mjs`. On a failure, read the output, look at `$SSE_TEST_DIR/failure.png`, `st.log`, and the request log, then fix and re-run.

6. **After changing `src/`**, run `harness.sh install`, then re-run the script. Every script loads a fresh page, so no restart is needed. Re-seed (`harness.sh seed …`, then `start`) only when you need the seeded data or settings back.

7. **Stop** at the end: `scripts/manual-test/harness.sh stop`.

8. **Report** what was exercised and what passed. Say plainly that replies came from a stand-in model: this proves the plumbing, not what a real model writes. Give the ST version (`harness.sh status` / `up.log`), list what wasn't covered, and include key screenshots when layout matters (Read them yourself first; attach with SendUserFile if useful).

## What to verify, in order of weight

1. **ST state**, read in `page.evaluate(() => SillyTavern.getContext()…)`: `chatMetadata` (the extension's per-chat state, `variables`), `extensionPrompts[key]` (injected value, `scan`, depth), `chat` (messages, swipes, `extra`), `tagMap`, settings. `ctx.substituteParams('{{ .x ?? y }}')` checks what a macro resolves to right now.
2. **What reached the model.** `clearRequests()`, act, then `requests()` / `findRequest('needle')` / `promptText(req)`. Assert on the exact prompt: an injection present, macros resolved (no `{{`), lore activated or excluded, the right system prompt.
3. **DOM**: presence and order of injected controls, labels, disabled states.
4. **Screenshots** (`shot(page, selector, name)`, or `revealSetting` first for settings-drawer content): for layout only. Read each one; element screenshots of hidden content silently capture whatever is behind it.

## Stand-in model

- The fallback reply comes from `setReply(text)`, re-read on every request.
- `setReplyRules([{ match, reply }])` gives different replies per request: the first rule whose `match` substring appears in the prompt wins. Use it to tell a silent tool generation apart from a chat turn.
- `run()` clears both when it finishes.
- It streams when asked, so streaming paths are exercised.
- The request log is `$SSE_TEST_DIR/fake-llm-requests.jsonl`, one JSON line per request: `{ at, url, body }`.
- A real backend isn't available here, so it can't judge output quality. Don't claim it did.

## Test data

Every seed:
- disables first-run onboarding;
- points Chat Completion at the stand-in model (Custom source);
- tags the seeded cards with the world's tag;
- activates the world's lore/locations/shared books globally, but never the scenarios book, whose entries stay disabled;
- writes the group **`SSE Test Group`** (`openGroup(page)`) with every seeded card.

**builtin: "Test World"** (tag ID `sse-test-world-tag`):
- **Ava, Ben, Cleo.** Each card reads `.avaClothingOverride`-style Clothing and Stated Goal overrides with `?? default`.
- **Private books:** each has one, `Test World - <Card> (private)`, holding a True Goal read. It is embedded in the card, and written as a linked world file unless `--no-private-books`.
- **`testworld-lore`:** "Harbor Market", keyed `Harbor Market`, tag-filtered.
- **`testworld-shared`:** "The Loan" is filtered to Ava + Ben, a secret from Cleo. "The Storm" is filtered to all three.
- **`testworld-scenarios`:** "Market Morning" and "Harbor Inspection". Both have set-once override lines and an Openings block.

**toolkit** (st-toolkit `build/`, default world `spider-man`):
- the world's cards, meaning those with a `<Tag> - <Card> (private)` book;
- its lore, locations, shared and scenarios books, and each card's private book;
- the tag ID read from the built books.

This data is realistic but large: 8 cards, and group replies produce many requests.

For a one-on-one chat, use `openSolo(page, 'Ava')`.

## Gotchas (all hit for real)

- **Groups open by clicking `.group_select`** (`openGroup`). `ctx.openGroupChat()` needs a chat id and doesn't select the group.
- **Group member rows carry `data-chid`** on current ST (bare `chid` before Jan 2025). Resolve them with `resolveGroupMemberRow`, never one attribute.
- **Several popups can exist at once.** Scope popup buttons with `closePopup(page, '.your-modal-body')`; a bare `.popup-button-cancel` matches more than one.
- **`window.confirm` dialogs are auto-accepted.** To test a cancel path, `launch({ acceptDialogs: false })` and handle `page.on('dialog')` yourself.
- **Expected console noise:** "Extension update failed … 500" (the copied extension has no `.git`). `lib.mjs` filters it.
- **Generation state** is `document.body.dataset.generating` (`waitForIdle`, `sendMessage`); `ctx.isGenerating` doesn't exist. In a natural-order group several members may reply to one send, so expect several requests.
- **State persists between scripts:**
  - Settings changed in the page are saved to ST's `settings.json`, and chats and `chatMetadata` persist too.
  - Each script should set up what it needs and undo global toggles it flipped (e.g. turn an NG track back off).
  - For a known baseline, re-seed (`harness.sh seed` + `start`) or `reset` + `up`.
- **Stop servers with `harness.sh stop`, not a hand-written `pkill -f`.** A `pkill -f` whose own command text contains the pattern kills the calling shell. The harness patterns are anchored to avoid this.
- **`rm` on a variable path gets blocked** by a safety check. Use literal paths or `"${VAR:?}"/…`.
- **Don't pipe `harness.sh up` into `tail`/`head`.** Redirect to a file: if a server ever stayed attached to the pipe, the call would hang.
- **Can't clone or `npm ci`?** That's the environment's network policy: read the `environment.network` documentation page rather than guessing.

## Keeping it useful

- A feature-specific smoke script worth rerunning (a regression-prone area) can be added as `scripts/manual-test/smoke-<area>.mjs`, importing `./lib.mjs`.
- When ST or the extension changes in a way a helper depends on (selectors, the popup shape, a new chat-opening path), fix `lib.mjs` and `example-smoke.mjs` in the same PR.
