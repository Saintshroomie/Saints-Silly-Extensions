// Playwright helpers for manual-test smoke scripts against the harness's
// SillyTavern (see harness.sh and .claude/skills/manual-test/SKILL.md).
//
// A smoke script lives in the session scratchpad and imports this file by
// absolute path:
//
//   import { launch, boot, openGroup, ... } from '/home/user/Saints-Silly-Extensions/scripts/manual-test/lib.mjs';
//
// Code inside page.evaluate() runs in the browser: SillyTavern.getContext(),
// jQuery ($) and the DOM are available there, nothing from Node is.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

export const TEST_DIR = process.env.SSE_TEST_DIR || path.join(os.tmpdir(), 'sse-manual-test');
export const ST_URL = `http://127.0.0.1:${process.env.ST_PORT || 8000}/`;
export const GROUP_NAME = 'SSE Test Group';
const REQUEST_LOG = path.join(TEST_DIR, 'fake-llm-requests.jsonl');

// Console noise that isn't a failure: the copied extension has no .git, so
// ST's auto-update check for it returns 500.
const KNOWN_NOISE = [/Extension update failed/, /status of 500 \(Internal Server Error\)/, /favicon/];

// ─── Browser ───

/** Chromium from the environment's pre-installed Playwright browsers. */
function chromiumPath() {
    if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
    const root = '/opt/pw-browsers';
    if (fs.existsSync(path.join(root, 'chromium'))) return path.join(root, 'chromium');
    const dirs = fs.existsSync(root) ? fs.readdirSync(root).filter(d => /^chromium-\d+$/.test(d)).sort() : [];
    for (const dir of dirs.reverse()) {
        const exe = path.join(root, dir, 'chrome-linux', 'chrome');
        if (fs.existsSync(exe)) return exe;
    }
    return undefined;
}

/** playwright-core, installed into TEST_DIR by `harness.sh setup` (not a repo dependency). */
async function loadChromium() {
    const require = createRequire(path.join(TEST_DIR, 'package.json'));
    const mod = await import(pathToFileURL(require.resolve('playwright-core')).href);
    return mod.chromium ?? mod.default.chromium;
}

/**
 * Launch a headless page. Confirm/alert dialogs are accepted (ST and the
 * extension use window.confirm); page errors and console errors are
 * collected in `errors` (known noise filtered out).
 */
export async function launch({ width = 1400, height = 1100, acceptDialogs = true } = {}) {
    const chromium = await loadChromium();
    const browser = await chromium.launch({ executablePath: chromiumPath() });
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on('pageerror', e => errors.push(`PAGEERROR ${e.message}`));
    page.on('console', m => {
        if (m.type() === 'error' && !KNOWN_NOISE.some(re => re.test(m.text()))) errors.push(m.text());
    });
    if (acceptDialogs) page.on('dialog', d => d.accept());
    return { browser, page, errors };
}

/**
 * Load ST and wait until it's usable: characters loaded, the extension's
 * settings injected, any first-run popup dismissed.
 */
export async function boot(page) {
    await page.goto(ST_URL, { waitUntil: 'domcontentloaded' });
    try {
        // The seeder turns onboarding off; this catches an unseeded install.
        const save = page.locator('.popup button:has-text("Save")').first();
        await save.waitFor({ timeout: 4000 });
        await save.click();
    } catch { /* no onboarding popup */ }
    await page.waitForFunction(() => window.SillyTavern?.getContext?.()?.characters?.length > 0, null, { timeout: 60000 });
    await page.waitForFunction(() => !!document.getElementById('saints_silly_settings'), null, { timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.keyboard.press('Escape');
}

/** Point Chat Completion at the stand-in model (the seeder does this too; this also connects). */
export async function connectFakeApi(page) {
    const port = process.env.FAKE_LLM_PORT || 5005;
    await page.evaluate(async (url) => {
        const ctx = SillyTavern.getContext();
        await ctx.executeSlashCommandsWithOptions('/api custom');
        await ctx.executeSlashCommandsWithOptions(`/api-url ${url}`);
    }, `http://127.0.0.1:${port}/v1`);
    await page.waitForFunction(() => SillyTavern.getContext().onlineStatus !== 'no_connection', null, { timeout: 15000 });
}

// ─── Chats ───

/** Open a one-on-one chat with the character whose card name is `name`. */
export async function openSolo(page, name) {
    const id = await page.evaluate(n => SillyTavern.getContext().characters.findIndex(c => c.name === n), name);
    if (id < 0) throw new Error(`No character named ${name}`);
    await page.evaluate(async i => { await SillyTavern.getContext().selectCharacterById(i); }, id);
    await page.waitForFunction(i => String(SillyTavern.getContext().characterId) === String(i) && !SillyTavern.getContext().groupId, id, { timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.keyboard.press('Escape');
}

/**
 * Open a group chat by name. Clicks the group in the character list, the way
 * a user does — ctx.openGroupChat() needs a chat id and doesn't select the group.
 */
export async function openGroup(page, name = GROUP_NAME) {
    const found = await page.evaluate(n => {
        const el = $('.group_select').filter((_, e) => $(e).find('.ch_name').text().trim() === n || $(e).text().includes(n)).first();
        el.trigger('click');
        return el.length > 0;
    }, name);
    if (!found) throw new Error(`No group named ${name}`);
    await page.waitForFunction(() => !!SillyTavern.getContext().groupId, null, { timeout: 15000 });
    await page.waitForTimeout(1500);
    await page.keyboard.press('Escape');
}

/** True while ST is generating (the flag ST sets on <body>). */
export function isGenerating(page) {
    return page.evaluate(() => document.body.dataset.generating === 'true');
}

/** Wait until no generation has been running for `quietMs`. */
export async function waitForIdle(page, { timeout = 60000, quietMs = 1200 } = {}) {
    const start = Date.now();
    let idleSince = null;
    while (Date.now() - start < timeout) {
        if (await isGenerating(page)) {
            idleSince = null;
        } else {
            idleSince ??= Date.now();
            if (Date.now() - idleSince >= quietMs) return;
        }
        await page.waitForTimeout(200);
    }
    throw new Error('Timed out waiting for generation to finish');
}

/** Type into the send box and click Send, then wait for the replies to settle. */
export async function sendMessage(page, text) {
    await page.locator('#send_textarea').fill(text);
    await page.evaluate(() => document.getElementById('send_but').click());
    await page.waitForTimeout(500);
    await waitForIdle(page);
}

// ─── Stand-in Model ───

/** Every request ST has sent the stand-in model, oldest first. */
export function requests() {
    if (!fs.existsSync(REQUEST_LOG)) return [];
    return fs.readFileSync(REQUEST_LOG, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
}

export function clearRequests() {
    fs.writeFileSync(REQUEST_LOG, '');
}

/** A request's messages flattened to text, e.g. to search for what reached the prompt. */
export function promptText(request) {
    const messages = request?.body?.messages;
    if (Array.isArray(messages)) return messages.map(m => `[${m.role}] ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`).join('\n');
    return String(request?.body?.prompt ?? '');
}

/** The newest request whose prompt contains `needle` (a string or RegExp). */
export function findRequest(needle) {
    const test = needle instanceof RegExp ? t => needle.test(t) : t => t.includes(needle);
    return requests().reverse().find(r => test(promptText(r))) || null;
}

/** The fallback reply for the next requests. */
export function setReply(text) {
    fs.writeFileSync(path.join(TEST_DIR, 'fake-llm-reply.txt'), text);
}

/** Replies by rule: [{ match: 'substring in the prompt', reply: '...' }], first match wins. */
export function setReplyRules(rules) {
    fs.writeFileSync(path.join(TEST_DIR, 'fake-llm-replies.json'), JSON.stringify(rules, null, 2));
}

export function resetReplies() {
    for (const f of ['fake-llm-reply.txt', 'fake-llm-replies.json']) fs.rmSync(path.join(TEST_DIR, f), { force: true });
}

// ─── Settings Panel & Screenshots ───

/**
 * Open the Extensions panel and expand every drawer around `selector`, so a
 * control inside the extension's settings is visible (for clicks and
 * screenshots). Returns the element's locator.
 */
export async function revealSetting(page, selector) {
    await page.evaluate(() => {
        const toggle = document.querySelector('#extensions-settings-button .drawer-toggle');
        const panel = document.getElementById('rm_extensions_block');
        if (toggle && panel && !panel.classList.contains('openDrawer')) toggle.click();
    });
    await page.waitForTimeout(600);
    await page.evaluate(sel => {
        const el = document.querySelector(sel);
        if (!el) throw new Error(`No element ${sel}`);
        for (let node = el.parentElement; node; node = node.parentElement) {
            if (node.classList?.contains('inline-drawer-content')) node.style.display = 'block';
        }
        el.scrollIntoView({ block: 'center' });
    }, selector);
    await page.waitForTimeout(300);
    return page.locator(selector);
}

/** Screenshot one element into TEST_DIR (or `dir`); returns the file path. */
export async function shot(page, selector, name, dir = TEST_DIR) {
    const file = path.join(dir, name.endsWith('.png') ? name : `${name}.png`);
    await page.locator(selector).first().screenshot({ path: file });
    return file;
}

// ─── Popups ───

/**
 * Close the ST popup that contains `selector` (e.g. '.cs-modal-body') with its
 * OK or Cancel button. Scope matters: ST can have more than one popup open.
 */
export async function closePopup(page, selector, { ok = false } = {}) {
    const button = ok ? '.popup-button-ok' : '.popup-button-cancel';
    await page.locator(`.popup:has(${selector}) ${button}`).first().click();
    await page.waitForTimeout(400);
}

// ─── Reporting ───

let failures = 0;

/** Print a PASS/FAIL line; failures are counted for `finish()`. */
export function check(label, ok, detail = '') {
    if (!ok) failures++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
    return !!ok;
}

/**
 * Launch, boot, run `body({ page, browser, errors })`, and report. A thrown
 * error counts as a failure (with a screenshot of the page at that moment)
 * instead of skipping the summary.
 */
export async function run(body, launchOptions) {
    const { browser, page, errors } = await launch(launchOptions);
    try {
        await boot(page);
        await body({ page, browser, errors });
    } catch (err) {
        const file = path.join(TEST_DIR, 'failure.png');
        await page.screenshot({ path: file }).catch(() => {});
        check('script ran to completion', false, `${err.message.split('\n')[0]} — screenshot: ${file}`);
    } finally {
        resetReplies();
        await finish(browser, errors);
    }
}

/** Report page errors, close the browser, and exit non-zero if anything failed. */
export async function finish(browser, errors = []) {
    check('no page errors', errors.length === 0, errors.slice(0, 5).join(' | '));
    await browser.close();
    console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
    process.exitCode = failures ? 1 : 0;
}
