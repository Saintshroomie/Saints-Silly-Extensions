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

import { loadWorldInfo, world_names } from '../../../../world-info.js';
import { getMaxPromptTokens } from '../../../../../script.js';
import { getTokenCountAsync } from '../../../../tokenizers.js';
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
 * Call generateRaw and optionally stream tokens into targetEl as they arrive.
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
 * @returns {{ element: HTMLDetailsElement, getSelected: () => string[] }}
 */
export function createLoreBookPicker({
    initialSelection = [],
    onChange = null,
    classPrefix = 'sse-lorebook',
    title = 'Lore Books',
} = {}) {
    const details = document.createElement('details');
    details.className = `${classPrefix}-picker`;
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
        list.replaceChildren();
        if (!names.length) {
            const empty = document.createElement('div');
            empty.className = `${classPrefix}-empty`;
            empty.textContent = 'No lore books available.';
            list.appendChild(empty);
            updateSummary();
            return;
        }
        for (const name of names) {
            const label = document.createElement('label');
            label.className = `${classPrefix}-item checkbox_label`;
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = name;
            if (previouslyChecked.has(name)) cb.checked = true;
            cb.addEventListener('change', () => {
                updateSummary();
                onChange?.(getSelected());
            });
            const span = document.createElement('span');
            span.textContent = name;
            label.appendChild(cb);
            label.appendChild(span);
            list.appendChild(label);
        }
        updateSummary();
    };

    details.addEventListener('toggle', () => {
        if (details.open) render();
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
    const who = m.name || (m.is_user ? (ctx.name1 || 'User') : (ctx.name2 || 'Character'));
    const text = (m.mes || '').trim();
    return text ? `${who}: ${text}` : '';
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
 * @returns {Promise<string>} The composed preamble, or '' if nothing was included.
 */
export async function buildContextPreamble({
    includeChat = false,
    loreBookNames = [],
    responseLength = 0,
    maxContextOverride = 0,
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
        const chat = Array.isArray(ctx.chat) ? ctx.chat : [];
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
