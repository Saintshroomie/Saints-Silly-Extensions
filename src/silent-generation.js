/**
 * Silent Generation Manager
 *
 * SillyTavern's stop button reliably cancels normal user-input generations
 * but not the "silent" / background ones extensions kick off through
 * `generateRaw` / `generateQuietPrompt`. ST's `generateRawData()` does listen
 * for `GENERATION_STOPPED` and aborts its local fetch, but two problems
 * remain in practice:
 *
 *   1. The stop button (`#mes_stop`) is hidden whenever a modal is open or
 *      the chat input is locked, so DOM-click-based "cancel" hacks no-op
 *      exactly when extensions need them most.
 *   2. Even when the underlying fetch is aborted, the `await` in extension
 *      code can still hang on the streaming reader or post-processing
 *      until the upstream call unwinds — so users see the UI sit there
 *      and then dump the discarded result.
 *
 * This module centralizes cancellation for every silent generation an
 * extension makes:
 *
 *   - Hooks `GENERATION_STOPPED` once at module load and aborts every
 *     in-flight silent job.
 *   - Hands each job its own AbortController and races the work against
 *     that signal so the awaiting caller returns immediately on cancel,
 *     even if upstream is still draining.
 *   - Exposes `abortAllSilentGenerations()` for extension UIs (modal close
 *     buttons, in-tool Cancel buttons) so they don't need to fight with
 *     `#mes_stop`'s visibility.
 *
 * Callers that opt in via `runCancellableSilentGeneration` or the
 * cancellation-aware `streamingGenerate` get AbortError-on-cancel for free.
 */

import { generateRaw, stopGeneration as stStopGeneration } from '../../../../../script.js';
import { getContext } from './utils.js';

// ─── Module State ───

const activeJobs = new Map(); // jobId -> { abortController, name }
let nextJobId = 1;
let stopListenerInstalled = false;

// ─── Public API ───

/**
 * Install the one-shot GENERATION_STOPPED listener that aborts every active
 * silent generation. Safe to call multiple times — only the first call wires
 * up the listener. Should be called once during extension init.
 */
export function installSilentGenerationStopListener() {
    if (stopListenerInstalled) return;
    const { eventSource, eventTypes } = getContext();
    if (!eventSource || !eventTypes?.GENERATION_STOPPED) return;
    eventSource.on(eventTypes.GENERATION_STOPPED, () => {
        abortAllSilentGenerations('user-stop');
    });
    stopListenerInstalled = true;
}

/**
 * Abort every in-flight silent generation. Used by the global stop listener
 * and by extension UIs that close while a generation is running (e.g. the
 * ACC modal's Cancel/X buttons).
 *
 * @param {string} [reason] - Reason recorded on the AbortError.
 * @returns {number} The number of jobs aborted.
 */
export function abortAllSilentGenerations(reason = 'aborted') {
    let count = 0;
    for (const [, job] of activeJobs) {
        try {
            job.abortController.abort(
                new DOMException(`Silent generation aborted: ${reason}`, 'AbortError'),
            );
            count++;
        } catch (_) { /* ignore */ }
    }
    return count;
}

/**
 * Also tells SillyTavern to stop any non-silent generation that may be
 * running in parallel — used by extension UIs that want a single "Cancel"
 * button to stop both their own silent work and any normal chat
 * generation it may have triggered.
 *
 * Safe to call when nothing is running; ST's `stopGeneration()` is a no-op
 * in that case.
 *
 * @param {string} [reason]
 */
export function abortAllGenerations(reason = 'aborted') {
    abortAllSilentGenerations(reason);
    try { stStopGeneration(); } catch (_) { /* ignore */ }
}

/**
 * Whether at least one silent generation is currently in flight.
 *
 * @returns {boolean}
 */
export function hasActiveSilentGenerations() {
    return activeJobs.size > 0;
}

/**
 * Run an async generation under the silent-generation cancellation system.
 *
 * The runner receives an AbortSignal. If the user clicks ST's stop button
 * (or any caller invokes `abortAllSilentGenerations`), the signal aborts
 * and the returned promise rejects with an AbortError immediately, without
 * waiting for the upstream fetch / generator to unwind.
 *
 * @template T
 * @param {object} opts
 * @param {(signal: AbortSignal) => Promise<T>} opts.run - The work to perform.
 * @param {string} [opts.name] - Debug name for the job.
 * @returns {Promise<T>}
 * @throws {DOMException} AbortError if cancelled.
 */
export async function runCancellableSilentGeneration({ run, name = 'silent-gen' }) {
    installSilentGenerationStopListener();

    const jobId = nextJobId++;
    const abortController = new AbortController();
    activeJobs.set(jobId, { abortController, name });

    let abortReject;
    const abortPromise = new Promise((_, rej) => { abortReject = rej; });
    const onAbort = () => {
        const reason = abortController.signal.reason
            || new DOMException('Silent generation aborted', 'AbortError');
        abortReject(reason);
    };
    abortController.signal.addEventListener('abort', onAbort, { once: true });

    try {
        return await Promise.race([run(abortController.signal), abortPromise]);
    } finally {
        abortController.signal.removeEventListener('abort', onAbort);
        activeJobs.delete(jobId);
    }
}

/**
 * `true` if the given error is a cancellation from this manager (or any
 * AbortError propagated up from ST / fetch). Use this in catch blocks to
 * suppress error toasts when the user deliberately cancelled.
 *
 * @param {unknown} err
 * @returns {boolean}
 */
export function isSilentGenerationAbort(err) {
    if (!err) return false;
    if (err.name === 'AbortError') return true;
    const msg = (err.message || '').toLowerCase();
    return msg.includes('aborted') || msg.includes('cancelled by stop event');
}

// ─── Streaming Helper ───

/**
 * Cancellable replacement for the old streamingGenerate(). Calls
 * `generateRaw` with optional onToken streaming and plugs the call into
 * the silent-generation cancel system. Throws AbortError on cancel.
 *
 * @param {object} params - generateRaw parameters.
 * @param {HTMLTextAreaElement|null} targetEl - Element to stream into, or null.
 * @param {{ append?: boolean, name?: string }} [opts]
 * @returns {Promise<string>} The full generated text.
 * @throws {DOMException} AbortError if cancelled.
 */
export async function cancellableStreamingGenerate(params, targetEl, { append = false, name } = {}) {
    return runCancellableSilentGeneration({
        name: name || 'streamingGenerate',
        run: async (_signal) => {
            if (!targetEl) return generateRaw(params);

            let accumulated = append ? (targetEl.value || '') : '';
            let streamingWorked = false;

            try {
                const result = await generateRaw({
                    ...params,
                    onToken: (token) => {
                        accumulated += token;
                        targetEl.value = accumulated;
                        targetEl.scrollTop = targetEl.scrollHeight;
                        streamingWorked = true;
                    },
                });
                if (!streamingWorked && result) {
                    targetEl.value = append ? ((targetEl.value || '') + result) : result;
                }
                return result || accumulated;
            } catch (err) {
                // Fall back if ST rejected the unknown onToken param.
                const msg = (err?.message || '').toLowerCase();
                if (msg.includes('ontoken') || msg.includes('unknown') || msg.includes('invalid param')) {
                    const fallback = await generateRaw(params);
                    if (fallback) targetEl.value = append ? ((targetEl.value || '') + fallback) : fallback;
                    return fallback;
                }
                throw err;
            }
        },
    });
}
