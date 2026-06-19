/**
 * Shared utilities for SillyTavern extensions.
 *
 * These helpers encapsulate patterns that recur across extensions:
 *   - Context access
 *   - Toast notifications
 *   - Debug logging
 *   - Settings persistence
 *   - Message-editing helpers
 *   - Generation lifecycle helpers
 *   - Generation context preamble (chat + lore books)
 */

import {
    loadWorldInfo,
    saveWorldInfo,
    setWIOriginalDataValue,
    world_names,
} from '../../../../world-info.js';
import { getMaxPromptTokens } from '../../../../../script.js';
import { getTokenCountAsync } from '../../../../tokenizers.js';
import { Popup, POPUP_TYPE } from '../../../../popup.js';
import { cancellableStreamingGenerate } from './silent-generation.js';

// ─── Context ───

/**
 * Returns a fresh SillyTavern context object.
 * Always call this when you need the context — do not cache it long-term.
 */
export function getContext() {
    return SillyTavern.getContext();
}

// ─── Toast Notifications ───

/**
 * Show a toast notification via SillyTavern's global `toastr`.
 *
 * @param {string} message  - Text to display.
 * @param {string} [type]   - One of 'info', 'success', 'warning', 'error'.
 * @param {string} [title]  - Optional toast title.
 */
export function toast(message, type = 'info', title = undefined) {
    if (typeof toastr !== 'undefined' && toastr[type]) {
        toastr[type](message, title);
    }
}

/**
 * Show a "sticky" toast that stays visible until it is explicitly dismissed.
 * Useful for signalling an in-progress background generation. Returns a
 * function that removes the toast; calling it more than once is safe.
 *
 * @param {string} message  - Text to display.
 * @param {string} [type]   - One of 'info', 'success', 'warning', 'error'.
 * @param {string} [title]  - Optional toast title.
 * @returns {() => void} Dismiss callback.
 */
export function stickyToast(message, type = 'info', title = undefined) {
    if (typeof toastr === 'undefined' || !toastr[type]) {
        return () => {};
    }
    const $toast = toastr[type](message, title, {
        timeOut: 0,
        extendedTimeOut: 0,
        tapToDismiss: false,
        closeButton: false,
    });
    let dismissed = false;
    return () => {
        if (dismissed) return;
        dismissed = true;
        if ($toast) toastr.clear($toast);
    };
}

// ─── Debug Logger Factory ───

/**
 * Creates a conditional debug logger.
 *
 * @param {string}   prefix     - Label printed before every message (e.g. 'MY-EXT').
 * @param {function} isEnabled  - Callback that returns `true` when logging should be active.
 * @returns {function} A `console.log`-style function that only logs when enabled.
 *
 * @example
 *   const debug = createDebugLogger('PHRASING', () => settings.phrasingDebugMode);
 *   debug('seed length:', text.length);
 */
export function createDebugLogger(prefix, isEnabled) {
    return (...args) => {
        if (typeof isEnabled === 'function' && !isEnabled()) return;
        console.log(`${prefix}:`, ...args);
    };
}

// ─── Settings Persistence ───

/**
 * Load extension settings, merging saved values over the supplied defaults.
 *
 * @param {string} extensionName  - Key under `context.extensionSettings`.
 * @param {object} defaults       - Default settings object (used for new keys).
 * @returns {object} The merged settings object.
 */
export function loadExtensionSettings(extensionName, defaults) {
    const context = getContext();
    const saved = context.extensionSettings?.[extensionName];
    return saved ? { ...defaults, ...saved } : { ...defaults };
}

/**
 * Persist extension settings (debounced).
 *
 * @param {string} extensionName - Key under `context.extensionSettings`.
 * @param {object} settings      - The settings object to save.
 */
export function saveExtensionSettings(extensionName, settings) {
    const context = getContext();
    context.extensionSettings[extensionName] = { ...settings };
    context.saveSettingsDebounced();
}

// ─── Message Edit Helpers ───

/**
 * If a message is currently being edited (edit textarea visible), click "Done"
 * to confirm the edit programmatically.
 *
 * @returns {boolean} `true` if an active edit was confirmed; `false` otherwise.
 */
export function confirmActiveMessageEdit() {
    const visibleEditButtons = document.querySelector(
        '#chat .mes .mes_edit_buttons[style*="display: inline-flex"]',
    );
    if (visibleEditButtons) {
        const editDoneBtn = visibleEditButtons.querySelector('.mes_edit_done');
        if (editDoneBtn) {
            editDoneBtn.click();
            return true;
        }
    }
    return false;
}

/**
 * Returns the chat-array index of the message currently being edited, or -1
 * if no edit is in progress.
 *
 * @returns {number}
 */
export function getEditingMessageIndex() {
    const visibleEditButtons = document.querySelector(
        '#chat .mes .mes_edit_buttons[style*="display: inline-flex"]',
    );
    if (!visibleEditButtons) return -1;
    const mesEl = visibleEditButtons.closest('.mes');
    if (!mesEl) return -1;
    const mesId = mesEl.getAttribute('mesid');
    return mesId !== null ? parseInt(mesId) : -1;
}

// ─── Generation Lifecycle ───

/**
 * Returns a Promise that resolves when the current LLM generation ends
 * (either normally or via user stop). Resolves with the text of the last
 * message in the chat, or '' on timeout / empty chat.
 *
 * @param {number} [timeoutMs=300000] - Timeout in milliseconds (default 5 min).
 * @returns {Promise<string>}
 */
export function waitForGenerationEnd(timeoutMs = 5 * 60 * 1000) {
    return new Promise(resolve => {
        const context = getContext();
        const { eventSource, eventTypes } = context;
        let settled = false;

        const cleanup = () => {
            eventSource.removeListener(eventTypes.GENERATION_ENDED, onEnd);
            eventSource.removeListener(eventTypes.GENERATION_STOPPED, onEnd);
        };

        const onEnd = () => {
            if (settled) return;
            settled = true;
            cleanup();
            const ctx = getContext();
            const lastMsg = ctx.chat[ctx.chat.length - 1];
            resolve(lastMsg ? lastMsg.mes : '');
        };

        setTimeout(() => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve('');
        }, timeoutMs);

        eventSource.on(eventTypes.GENERATION_ENDED, onEnd);
        if (eventTypes.GENERATION_STOPPED) {
            eventSource.on(eventTypes.GENERATION_STOPPED, onEnd);
        }
    });
}

// ─── Streaming Generation Helper ───

/**
 * Run a raw silent generation, streaming tokens into targetEl as they
 * arrive when the backend supports it (see `cancellableStreamingGenerate`
 * for the support matrix); unsupported backends fall back to a single
 * write of the full response.
 *
 * Routes through the silent-generation cancellation manager so the call can
 * be aborted by ST's stop button or by `abortAllSilentGenerations()`. On
 * cancel, this throws an AbortError (rather than returning the partial /
 * discarded result) so callers can short-circuit cleanly.
 *
 * @param {object} params - generateRaw parameters (prompt, systemPrompt, responseLength, etc.)
 * @param {HTMLTextAreaElement|null} targetEl - Field to stream into, or null for no streaming.
 * @param {{ append?: boolean, name?: string }} [opts]
 * @returns {Promise<string>} The full generated text.
 * @throws {DOMException} AbortError if the generation was cancelled.
 */
export async function streamingGenerate(params, targetEl, opts = {}) {
    return cancellableStreamingGenerate(params, targetEl, opts);
}

// ─── Single-Line Override ───

/**
 * Temporarily disable ST's "Generate Only One Line Per Request" power-user
 * setting for the duration of fn, then restore it. Prevents silent generations
 * (WIA, ACC, NG) from being truncated at the first newline when the user has
 * that option active for normal chat.
 *
 * @template T
 * @param {() => Promise<T>} fn - Async function to execute with single-line disabled.
 * @returns {Promise<T>}
 */
export async function withSingleLineDisabled(fn) {
    const pus = getContext().powerUserSettings;
    const original = pus?.single_line;
    if (pus && original) pus.single_line = false;
    try {
        return await fn();
    } finally {
        if (pus && original !== undefined) pus.single_line = original;
    }
}

// ─── Template Macros ───

/**
 * Replace this extension's own `{{key}}` placeholders in a prompt template.
 *
 * Deliberately NOT SillyTavern's macro engine: ST macros run on Phrasing's
 * injection templates already, but the ACC/WIA templates contain literal
 * `{{ .fooOverride ?? bar }}` override syntax that must pass through
 * untouched, so generation prompts only get this narrow substitution.
 *
 * @param {string} template - Template text possibly containing `{{key}}` placeholders.
 * @param {Record<string, string>} macros - key → replacement value.
 * @returns {{ text: string, used: Set<string> }} The substituted text plus the
 *          set of macro keys that were actually present. Callers use `used`
 *          to fall back to appending/prepending a block when its placeholder
 *          is absent, which keeps old templates working unchanged.
 */
export function applyTemplateMacros(template, macros) {
    let text = template || '';
    const used = new Set();
    for (const [key, value] of Object.entries(macros)) {
        const re = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
        if (re.test(text)) {
            used.add(key);
            text = text.replace(new RegExp(re.source, 'gi'), () => value ?? '');
        }
    }
    return { text, used };
}

// ─── Prefill Echo Stripping ───

/**
 * Strip a prefill echo from the start of a generation result.
 *
 * Backends that support assistant-prefix continuation return only the new
 * text, so callers prepend the prefill to the result. Chat-completion
 * backends that ignore the prefix (e.g. OpenAI) often start over and re-emit
 * the prefill (or its final line), which would produce a doubled opening
 * once the prefill is prepended. Detects a full-prefill echo or a final-line
 * echo and removes it. Conservative: requires an exact match of at least a
 * few characters, so legitimate output is never trimmed.
 *
 * @param {string} output  - Cleaned (trimmed) generation result.
 * @param {string} prefill - The prefill that was sent as the assistant prefix.
 * @returns {string} The output with any leading prefill echo removed.
 */
export function stripPrefillEcho(output, prefill) {
    if (!output || !prefill) return output;
    const whole = prefill.trim();
    if (whole.length >= 3 && output.startsWith(whole)) {
        return output.slice(whole.length).replace(/^\s+/, '');
    }
    const lines = prefill.split('\n').map(l => l.trim()).filter(Boolean);
    const lastLine = lines[lines.length - 1];
    if (lastLine && lastLine.length >= 4 && output.startsWith(lastLine)) {
        return output.slice(lastLine.length).replace(/^\s+/, '');
    }
    return output;
}

// ─── Prompt Preview Popup ───

/**
 * Show a read-only popup laying out exactly what a tool will send to the
 * model: system prompt, assembled user prompt, prefill, injection, etc.
 *
 * @param {string} title - Popup heading.
 * @param {Array<{ label: string, text: string|null }>} sections - Sections to
 *        render in order. Sections with `text == null` are skipped; empty
 *        strings render as "(empty)".
 */
export function showPromptPreview(title, sections) {
    const root = document.createElement('div');
    root.className = 'sse-prompt-preview';

    const heading = document.createElement('h3');
    heading.textContent = title;
    root.appendChild(heading);

    for (const { label, text } of sections) {
        if (text == null) continue;
        const section = document.createElement('div');
        section.className = 'sse-preview-section';
        const labelEl = document.createElement('div');
        labelEl.className = 'sse-preview-label';
        labelEl.textContent = label;
        const pre = document.createElement('pre');
        pre.className = 'sse-preview-text';
        pre.textContent = text || '(empty)';
        section.appendChild(labelEl);
        section.appendChild(pre);
        root.appendChild(section);
    }

    const popup = new Popup(root, POPUP_TYPE.TEXT, '', {
        okButton: 'Close',
        wide: true,
        large: true,
        allowVerticalScrolling: true,
    });
    popup.show();
}

// ─── Generation Context Preamble ───

/**
 * Collect every "active" character for the current chat.
 *
 * In a solo chat this is just the selected character (`ctx.characterId`).
 * In a group chat this is every enabled member of the group, resolved by
 * avatar (which is the unique on-disk filename — character `name` fields can
 * collide). When two members share the same display name we disambiguate them
 * with a `#N` suffix so the LLM can tell them apart.
 *
 * @param {object} ctx - SillyTavern context object.
 * @returns {Array<{ displayName: string, char: object }>}
 */
function collectActiveCharacters(ctx) {
    const characters = Array.isArray(ctx.characters) ? ctx.characters : [];
    const results = [];
    const seenAvatars = new Set();

    const pushChar = (char) => {
        if (!char || seenAvatars.has(char.avatar)) return;
        seenAvatars.add(char.avatar);
        results.push({ displayName: char.name || '', char });
    };

    // Group chat: walk enabled members.
    const groupId = ctx.groupId;
    if (groupId && Array.isArray(ctx.groups)) {
        const group = ctx.groups.find(g => g.id == groupId);
        if (group && Array.isArray(group.members)) {
            const disabled = Array.isArray(group.disabled_members) ? group.disabled_members : [];
            for (const avatar of group.members) {
                if (disabled.includes(avatar)) continue;
                const char = characters.find(c => c.avatar === avatar);
                if (char) pushChar(char);
            }
        }
    }

    // Solo chat fallback (also covers groups where no member resolved).
    if (!results.length) {
        const char = characters[ctx.characterId];
        if (char) pushChar(char);
    }

    // Disambiguate duplicate display names. Avatar filenames are unique on
    // disk, but two characters in a group can share a `name`, so append a
    // running counter to the second-and-later occurrences.
    const nameCounts = new Map();
    for (const entry of results) {
        const base = entry.displayName || '(unnamed)';
        const seen = nameCounts.get(base) || 0;
        if (seen > 0) {
            entry.displayName = `${base} #${seen + 1}`;
        }
        nameCounts.set(base, seen + 1);
    }

    return results;
}

/**
 * Returns the list of available World Info / lore book names known to ST.
 * Always returns a fresh array; safe to mutate.
 *
 * @returns {string[]}
 */
export function getAvailableLoreBookNames() {
    // Prefer the context method, but fall back to the live `world_names`
    // import (the source of truth) and finally to the DOM. Older ST
    // versions don't expose `getWorldInfoNames` on the context.
    const fromContext = getContext().getWorldInfoNames?.();
    if (Array.isArray(fromContext) && fromContext.length) return fromContext;
    if (Array.isArray(world_names) && world_names.length) return world_names.slice();
    const selector = document.getElementById('world_info');
    if (selector) {
        return Array.from(selector.options)
            .map(o => (o.textContent || '').trim())
            .filter(Boolean);
    }
    return [];
}

// ─── World Info Entry Extension Persistence ───

/**
 * Key used to stash this extension's per-entry guidance text inside each
 * World Info entry's `extensions` object. Travels with the lorebook on
 * export so guidance follows the entry across installs.
 */
export const WIA_GUIDANCE_EXT_KEY = 'saintsSillyGuidance';

/**
 * Return the name of the world currently open in the WI editor, or null.
 */
export function getCurrentWorldEditorName() {
    const sel = document.getElementById('world_editor_select');
    if (!sel) return null;
    const opt = sel.options[sel.selectedIndex];
    if (!opt) return null;
    const text = (opt.textContent || '').trim();
    return text || null;
}

/**
 * Walk up from a WI entry form element to find the closest ancestor that
 * exposes a uid (either as an `uid` attribute or `data-uid`). Returns the
 * raw string or null.
 */
export function getEntryUidFromForm(formEl) {
    let el = formEl;
    while (el) {
        if (el.getAttribute) {
            const a = el.getAttribute('uid');
            if (a != null && a !== '') return a;
            const d = el.dataset?.uid;
            if (d != null && d !== '') return d;
        }
        el = el.parentElement;
    }
    return null;
}

/**
 * Read this extension's persisted guidance text for a WI entry. Returns ''
 * when the world/entry/field is missing.
 */
export async function readWIAEntryGuidance(worldName, uid) {
    if (!worldName || uid == null || uid === '') return '';
    try {
        const data = await loadWorldInfo(worldName);
        if (!data?.entries) return '';
        const entry = data.entries[uid];
        if (!entry) return '';
        const ext = entry.extensions;
        if (ext && typeof ext === 'object' && typeof ext[WIA_GUIDANCE_EXT_KEY] === 'string') {
            return ext[WIA_GUIDANCE_EXT_KEY];
        }
        return '';
    } catch (err) {
        console.error('Saints-Silly-Extensions: failed to read WIA guidance', err);
        return '';
    }
}

const wiaGuidancePending = new Map(); // mapKey -> { timer, latestValue }

async function flushWIASave(worldName, uid, guidance) {
    try {
        const data = await loadWorldInfo(worldName);
        if (!data?.entries) return;
        const entry = data.entries[uid];
        if (!entry) return;
        if (!entry.extensions || typeof entry.extensions !== 'object') {
            entry.extensions = {};
        }
        if (guidance === '' || guidance == null) {
            delete entry.extensions[WIA_GUIDANCE_EXT_KEY];
        } else {
            entry.extensions[WIA_GUIDANCE_EXT_KEY] = guidance;
        }
        // Mirror to originalData for entries imported from character books,
        // so the extension key survives if ST re-serializes from that shadow.
        if (data.originalData?.entries) {
            try {
                setWIOriginalDataValue(
                    data,
                    uid,
                    `extensions.${WIA_GUIDANCE_EXT_KEY}`,
                    (guidance === '' || guidance == null) ? undefined : guidance,
                );
            } catch (_) { /* originalData mirror is best-effort */ }
        }
        await saveWorldInfo(worldName, data, false);
    } catch (err) {
        console.error('Saints-Silly-Extensions: failed to save WIA guidance', err);
    }
}

/**
 * Persist guidance text into a WI entry's `extensions` field. Debounced per
 * (world,uid) — the latest call wins. An empty string deletes the key.
 */
export function saveWIAEntryGuidanceDebounced(worldName, uid, guidance, delayMs = 1200) {
    if (!worldName || uid == null || uid === '') return;
    const mapKey = `${worldName}::${uid}`;
    const existing = wiaGuidancePending.get(mapKey);
    if (existing?.timer) clearTimeout(existing.timer);
    const entry = { latestValue: guidance, timer: null };
    entry.timer = setTimeout(async () => {
        wiaGuidancePending.delete(mapKey);
        await flushWIASave(worldName, uid, entry.latestValue);
    }, delayMs);
    wiaGuidancePending.set(mapKey, entry);
}

/**
 * Force any pending guidance save for (world,uid) to flush immediately.
 * Used on blur so the user doesn't lose unsaved text if they reload right
 * after typing.
 */
export async function flushWIAEntryGuidanceSave(worldName, uid) {
    if (!worldName || uid == null || uid === '') return;
    const mapKey = `${worldName}::${uid}`;
    const pending = wiaGuidancePending.get(mapKey);
    if (!pending) return;
    clearTimeout(pending.timer);
    wiaGuidancePending.delete(mapKey);
    await flushWIASave(worldName, uid, pending.latestValue);
}

// ─── Lore Book Picker Widget ───

/**
 * Build a reusable lore-book picker: a `<details>` element containing a list
 * of checkboxes (one per known lore book) plus a summary that shows the
 * current selection count. Re-renders on open so newly added/removed books
 * appear without a reload.
 *
 * @param {object} [opts]
 * @param {string[]} [opts.initialSelection] - Names to start checked.
 * @param {(names: string[]) => void} [opts.onChange] - Called on every selection change.
 * @param {string} [opts.classPrefix='sse-lorebook'] - CSS class prefix; the existing
 *        module-specific styles (wia-…, acc-…, ng-…) all share the same shape,
 *        so callers can pass their own prefix to keep their styling intact.
 * @param {string} [opts.title='Lore Books'] - Summary label when nothing is selected.
 * @param {function} [opts.debug] - Optional logger; called with picker lifecycle
 *        details (render/toggle/change) so a caller's debug mode can trace
 *        selection behavior. No-op by default.
 * @returns {{ element: HTMLDetailsElement, getSelected: () => string[] }}
 */
export function createLoreBookPicker({
    initialSelection = [],
    onChange = null,
    classPrefix = 'sse-lorebook',
    title = 'Lore Books',
    debug = () => {},
} = {}) {
    const details = document.createElement('details');
    details.className = `${classPrefix}-picker sse-lorebook-picker`;
    details.title = 'Prepend active entries from the selected lore books';

    const summary = document.createElement('summary');
    const icon = document.createElement('span');
    icon.className = 'fa-solid fa-book';
    const summaryLabel = document.createElement('span');
    summaryLabel.className = `${classPrefix}-summary-label`;
    summaryLabel.textContent = title;
    summary.appendChild(icon);
    summary.appendChild(document.createTextNode(' '));
    summary.appendChild(summaryLabel);
    details.appendChild(summary);

    const list = document.createElement('div');
    list.className = `${classPrefix}-list`;
    details.appendChild(list);

    const getSelected = () => Array.from(
        list.querySelectorAll('input[type="checkbox"]:checked'),
    ).map(cb => cb.value);

    const updateSummary = () => {
        const count = getSelected().length;
        summaryLabel.textContent = count > 0 ? `${title} (${count})` : title;
    };

    const render = () => {
        const names = getAvailableLoreBookNames();
        const previouslyChecked = new Set(
            list.children.length === 0 ? initialSelection : getSelected(),
        );
        debug('picker render — available:', names.length, 'previously checked:', [...previouslyChecked]);
        list.replaceChildren();
        if (!names.length) {
            const empty = document.createElement('div');
            empty.className = `${classPrefix}-empty`;
            empty.textContent = 'No lore books available.';
            list.appendChild(empty);
            updateSummary();
            return;
        }
        const emitChange = (cb) => {
            debug('picker change — book:', cb.value, 'checked:', cb.checked);
            updateSummary();
            const selected = getSelected();
            debug('picker change — selection now:', selected);
            onChange?.(selected);
            debug('picker change — onChange handled');
        };
        for (const name of names) {
            // Deliberately a <div>, not a <label>: native <label> → checkbox
            // click forwarding is unreliable across browsers inside a <details>
            // dropdown — it does nothing in Firefox (focus escapes to <body>
            // and collapses the dropdown) and double-fires on Android Chrome
            // (forward + our manual toggle cancel out). With a plain div there
            // is no native forwarding to fight, so one explicit toggle is
            // deterministic everywhere. aria-label preserves the checkbox's
            // accessible name that the <label> used to provide.
            const row = document.createElement('div');
            row.className = `${classPrefix}-item checkbox_label`;
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = name;
            cb.setAttribute('aria-label', name);
            if (previouslyChecked.has(name)) cb.checked = true;
            // Direct checkbox clicks + keyboard (space) toggle natively.
            cb.addEventListener('change', () => emitChange(cb));
            // Tapping anywhere else on the row (the name) toggles manually.
            row.addEventListener('click', (event) => {
                if (event.target === cb) return;
                cb.checked = !cb.checked;
                emitChange(cb);
            });
            const span = document.createElement('span');
            span.textContent = name;
            row.appendChild(cb);
            row.appendChild(span);
            list.appendChild(row);
        }
        updateSummary();
    };

    // Close the dropdown when the user clicks or moves focus outside it, so it
    // behaves like a normal dropdown instead of requiring a second click on the
    // summary to dismiss. Capture-phase so we still see the event if inner
    // handlers stop propagation; only attached while open.
    const closeIfOutside = (event) => {
        if (!details.open) return;
        // Focus landing on <body> happens when clicking non-focusable text
        // inside the dropdown (e.g. a lore book name); that must not collapse
        // the picker. Genuine outside clicks are still caught via pointerdown.
        if (event.type === 'focusin' && event.target === document.body) return;
        if (details.contains(event.target)) return;
        details.open = false;
    };

    details.addEventListener('toggle', () => {
        debug('picker toggle — open:', details.open);
        if (details.open) {
            render();
            document.addEventListener('pointerdown', closeIfOutside, true);
            document.addEventListener('focusin', closeIfOutside, true);
        } else {
            document.removeEventListener('pointerdown', closeIfOutside, true);
            document.removeEventListener('focusin', closeIfOutside, true);
        }
    });
    render();

    return { element: details, getSelected };
}

// Tokens reserved on top of `responseLength` for the surrounding prompt
// scaffolding (system prompt, "Existing context to consider…" header, task
// instructions). Conservative — overshooting just leaves a little extra room.
const PREAMBLE_BUDGET_RESERVE = 256;

// Fallback message count when the tokenizer / max-context APIs are
// unavailable. Matches the previous hardcoded behavior.
const PREAMBLE_FALLBACK_MESSAGE_LIMIT = 20;

/**
 * Format a single chat message for inclusion in the preamble.
 */
function formatChatLine(m, ctx) {
    // Hidden / system messages are excluded from ST's own prompt building;
    // keep them out of the preamble too.
    if (m.is_system) return '';
    const who = m.name || (m.is_user ? (ctx.name1 || 'User') : (ctx.name2 || 'Character'));
    const text = (m.mes || '').trim();
    return text ? `${who}: ${text}` : '';
}

// Upper bound on the text fed to the cold-start token estimate. A full
// context window is at most a few hundred KB of text, so tokenizing more than
// this adds nothing — but building/hashing one string from a 1000+ message
// chat can spike memory on a constrained mobile tab. We only need a rough
// "how full is the context" number; the real measured size takes over after
// the first live generation.
const ESTIMATE_CHAR_BUDGET = 600000;

/**
 * Estimate the token cost of the current chat's visible (non-system) lines.
 *
 * Used as the cold-start fallback for context-usage readouts before a live
 * generation has reported the true outgoing prompt size. Packs the most recent
 * lines up to a fixed character budget (newest first) so it stays cheap even
 * on very long chats; returns 0 when there's nothing to count.
 *
 * @returns {Promise<number>} Approximate token count of the recent chat.
 */
export async function estimateChatTokens() {
    const ctx = getContext();
    const chat = Array.isArray(ctx.chat) ? ctx.chat : [];
    if (!chat.length) return 0;
    const picked = [];
    let chars = 0;
    for (let i = chat.length - 1; i >= 0; i--) {
        const line = formatChatLine(chat[i], ctx);
        if (!line) continue;
        picked.push(line);
        chars += line.length + 1;
        if (chars >= ESTIMATE_CHAR_BUDGET) break;
    }
    if (!picked.length) return 0;
    picked.reverse();
    return await getTokenCountAsync(picked.join('\n'));
}

/**
 * Pack as many recent chat lines as the token budget allows, newest first,
 * but return them in chronological order. Returns '' if nothing fits.
 */
async function packRecentChatLines(chat, ctx, chatBudget) {
    if (!chat.length || chatBudget <= 0) return '';
    const picked = [];
    let used = 0;
    // The eventual join uses '\n' between lines, so each additional line
    // costs roughly its own tokens plus one separator.
    for (let i = chat.length - 1; i >= 0; i--) {
        const line = formatChatLine(chat[i], ctx);
        if (!line) continue;
        const cost = await getTokenCountAsync(line + '\n');
        if (used + cost > chatBudget) break;
        picked.push(line);
        used += cost;
    }
    picked.reverse();
    return picked.join('\n');
}

/**
 * Build a context preamble string suitable for prepending to a generation
 * prompt. Combines (optionally) the current chat / character / persona and
 * the active entries of any selected lore books.
 *
 * Recent chat is packed to fit the model's remaining context budget
 * (`getMaxPromptTokens() - responseLength - reserve`), after the non-chat
 * sections have been counted. No fixed message cap.
 *
 * @param {object} opts
 * @param {boolean} [opts.includeChat=false] - Include character card, persona, and recent chat messages.
 * @param {string[]} [opts.loreBookNames=[]] - Names of lore books whose enabled entries to include.
 * @param {number}  [opts.responseLength=0] - Tokens reserved for the model's response; subtracted from the budget.
 * @param {number}  [opts.maxContextOverride=0] - If > 0, use this as the max-context size instead of `getMaxPromptTokens()`. Lets callers cap how much chat history they pull in independently of the model's real window.
 * @param {number}  [opts.excludeRecentCount=0] - Drop this many of the most recent messages before packing the chat. Compaction uses it so `{{context}}` is the chat *minus* the verbatim tail it carries over.
 * @returns {Promise<string>} The composed preamble, or '' if nothing was included.
 */
export async function buildContextPreamble({
    includeChat = false,
    loreBookNames = [],
    responseLength = 0,
    maxContextOverride = 0,
    excludeRecentCount = 0,
} = {}) {
    const sections = [];
    const ctx = getContext();

    // Non-chat sections first — they're prioritized over chat in the budget.
    if (includeChat) {
        const activeChars = collectActiveCharacters(ctx);
        for (const { displayName, char } of activeChars) {
            const lines = [];
            if (displayName) lines.push(`Name: ${displayName}`);
            if (char.description) lines.push(`Description: ${char.description}`);
            if (char.personality) lines.push(`Personality: ${char.personality}`);
            if (char.scenario) lines.push(`Scenario: ${char.scenario}`);
            if (lines.length) {
                const header = displayName ? `[Character — ${displayName}]` : '[Character]';
                sections.push(`${header}\n${lines.join('\n')}`);
            }
        }

        const persona = ctx.powerUserSettings?.persona_description?.trim();
        if (persona) sections.push(`[User Persona]\n${persona}`);
    }

    if (Array.isArray(loreBookNames) && loreBookNames.length) {
        for (const name of loreBookNames) {
            if (!name) continue;
            try {
                const data = await loadWorldInfo(name);
                if (!data?.entries) continue;
                const entries = Object.values(data.entries)
                    .filter(e => e && !e.disable && (e.content || '').trim())
                    .map(e => {
                        const label = (e.comment && e.comment.trim())
                            || (Array.isArray(e.key) ? e.key.join(', ') : '');
                        const content = e.content.trim();
                        return label ? `- ${label}: ${content}` : `- ${content}`;
                    });
                if (entries.length) {
                    sections.push(`[Lore Book: ${name}]\n${entries.join('\n')}`);
                }
            } catch (err) {
                console.error(`Saints-Silly-Extensions: failed to load lore book "${name}":`, err);
            }
        }
    }

    // Pack recent chat into whatever budget remains.
    if (includeChat) {
        const fullChat = Array.isArray(ctx.chat) ? ctx.chat : [];
        // Optionally drop the most-recent N messages (the verbatim tail a
        // caller is carrying over elsewhere) so they aren't double-counted.
        const chat = (Number.isFinite(excludeRecentCount) && excludeRecentCount > 0)
            ? fullChat.slice(0, Math.max(0, fullChat.length - excludeRecentCount))
            : fullChat;
        if (chat.length) {
            let recentBlock = '';
            try {
                const overrideValid = Number.isFinite(maxContextOverride) && maxContextOverride > 0;
                const maxContext = overrideValid ? maxContextOverride : getMaxPromptTokens();
                if (!Number.isFinite(maxContext) || maxContext <= 0) {
                    throw new Error(`maxContext resolved to ${maxContext}`);
                }
                const nonChatJoined = sections.join('\n\n');
                const nonChatTokens = nonChatJoined
                    ? await getTokenCountAsync(nonChatJoined)
                    : 0;
                const headerTokens = await getTokenCountAsync('[Recent Chat]\n');
                const chatBudget = maxContext - responseLength - PREAMBLE_BUDGET_RESERVE
                    - nonChatTokens - headerTokens;
                const packed = await packRecentChatLines(chat, ctx, chatBudget);
                if (packed) recentBlock = `[Recent Chat]\n${packed}`;
            } catch (err) {
                console.error('Saints-Silly-Extensions: token-budgeted chat packing failed; falling back to fixed limit.', err);
                const recent = chat.slice(-PREAMBLE_FALLBACK_MESSAGE_LIMIT);
                const lines = recent.map(m => formatChatLine(m, ctx)).filter(Boolean);
                if (lines.length) recentBlock = `[Recent Chat]\n${lines.join('\n')}`;
            }
            if (recentBlock) sections.push(recentBlock);
        }
    }

    return sections.join('\n\n');
}
