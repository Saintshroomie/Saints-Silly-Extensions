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
 */

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
