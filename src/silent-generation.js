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
import { getContext, createDebugLogger } from './utils.js';

// ─── Module State ───

const activeJobs = new Map(); // jobId -> { abortController, name }
let nextJobId = 1;
let stopListenerInstalled = false;
let moduleSettings = null;
let debug = () => {};

// ─── Init ───

/**
 * Initialize the silent-generation manager. Wires up the debug logger
 * against `settings.silentGenerationDebugMode` and installs the
 * `GENERATION_STOPPED` listener. Called once from `index.js`.
 *
 * @param {object} opts
 * @param {object} opts.settings - Shared mutable settings reference.
 */
export function initSilentGeneration({ settings }) {
    moduleSettings = settings;
    debug = createDebugLogger('SILENT-GEN', () => moduleSettings?.silentGenerationDebugMode);
    installSilentGenerationStopListener();
    debug('Module initialized');
}

/**
 * Bind the silent-generation settings panel controls. Called from
 * `injectSettingsPanel` in `index.js` after the HTML is injected.
 *
 * @param {() => void} saveSettings - Persist callback.
 */
export function bindSilentGenerationSettings(saveSettings) {
    const debugCb = document.getElementById('silent_generation_debug_mode');
    if (debugCb) {
        debugCb.checked = !!moduleSettings?.silentGenerationDebugMode;
        debugCb.addEventListener('change', () => {
            if (moduleSettings) moduleSettings.silentGenerationDebugMode = debugCb.checked;
            saveSettings();
            debug('Debug mode toggled:', debugCb.checked);
        });
    }
}

// ─── Public API ───

/**
 * Install the one-shot GENERATION_STOPPED listener that aborts every active
 * silent generation. Safe to call multiple times — only the first call wires
 * up the listener. Normally invoked via `initSilentGeneration`.
 */
export function installSilentGenerationStopListener() {
    if (stopListenerInstalled) {
        debug('Stop listener already installed; skipping');
        return;
    }
    const { eventSource, eventTypes } = getContext();
    if (!eventSource || !eventTypes?.GENERATION_STOPPED) {
        debug('Stop listener NOT installed — eventSource or GENERATION_STOPPED missing');
        return;
    }
    eventSource.on(eventTypes.GENERATION_STOPPED, () => {
        debug('GENERATION_STOPPED received — aborting all silent jobs');
        abortAllSilentGenerations('user-stop');
    });
    stopListenerInstalled = true;
    debug('Stop listener installed');
}

/**
 * Abort every in-flight silent generation by aborting our own local
 * AbortControllers. This frees the awaiting extension code (the
 * `Promise.race` against the abort signal resolves) but does NOT cancel
 * the underlying `generateRaw` fetch — only ST's `GENERATION_STOPPED`
 * event does that. Used by the global stop listener (where the event is
 * the trigger) and as a building block for `abortAllGenerations`. Most
 * extension UI code should call `abortAllGenerations` instead.
 *
 * @param {string} [reason] - Reason recorded on the AbortError.
 * @returns {number} The number of jobs aborted.
 */
export function abortAllSilentGenerations(reason = 'aborted') {
    if (activeJobs.size === 0) {
        debug('abortAllSilentGenerations called but no active jobs; reason:', reason);
        return 0;
    }
    let count = 0;
    const jobNames = [];
    for (const [jobId, job] of activeJobs) {
        try {
            job.abortController.abort(
                new DOMException(`Silent generation aborted: ${reason}`, 'AbortError'),
            );
            jobNames.push(`#${jobId}(${job.name})`);
            count++;
        } catch (err) {
            debug('Failed to abort job', jobId, err);
        }
    }
    debug(`Aborted ${count} silent job(s) — reason: ${reason} — jobs:`, jobNames.join(', '));
    return count;
}

/**
 * The "real" cancel path that extension UIs should use. Aborts our own
 * local controllers AND calls ST's exported `stopGeneration()`, which
 * emits `GENERATION_STOPPED`. That event is what ST's `generateRawData`
 * listens for to abort its own fetch — once the fetch aborts, the
 * connection to ST's Node server closes, and ST's server-side handler
 * propagates the abort upstream (e.g. POSTs `/api/extra/abort` to
 * KoboldCpp). Without this call, only the frontend UI frees up and the
 * LLM backend keeps generating to the response cap.
 *
 * Safe to call when nothing is running; ST's `stopGeneration()` is a
 * no-op in that case.
 *
 * @param {string} [reason]
 */
export function abortAllGenerations(reason = 'aborted') {
    debug('abortAllGenerations — reason:', reason);
    abortAllSilentGenerations(reason);
    try {
        stStopGeneration();
        debug('ST stopGeneration() invoked');
    } catch (err) {
        debug('ST stopGeneration() threw:', err);
    }
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
    const startedAt = Date.now();
    debug(`Job #${jobId}(${name}) started — active jobs:`, activeJobs.size);

    let abortReject;
    const abortPromise = new Promise((_, rej) => { abortReject = rej; });
    const onAbort = () => {
        const reason = abortController.signal.reason
            || new DOMException('Silent generation aborted', 'AbortError');
        debug(`Job #${jobId}(${name}) abort signal fired — reason:`, reason?.message || reason);
        abortReject(reason);
    };
    abortController.signal.addEventListener('abort', onAbort, { once: true });

    // If the abort race wins, the run() promise is abandoned but keeps
    // executing — its eventual rejection (when ST's fetch finally aborts)
    // would surface as an unhandled promise rejection in the console.
    // Swallow it here; the result is already irrelevant by that point.
    const runPromise = run(abortController.signal);
    runPromise.catch((err) => {
        debug(`Job #${jobId}(${name}) abandoned-runner rejection (swallowed):`, err?.message || err);
    });

    try {
        const result = await Promise.race([runPromise, abortPromise]);
        debug(`Job #${jobId}(${name}) completed normally in ${Date.now() - startedAt}ms`);
        return result;
    } catch (err) {
        const wasAbort = err?.name === 'AbortError';
        debug(`Job #${jobId}(${name}) ${wasAbort ? 'aborted' : 'threw'} after ${Date.now() - startedAt}ms — ${err?.message || err}`);
        throw err;
    } finally {
        abortController.signal.removeEventListener('abort', onAbort);
        activeJobs.delete(jobId);
        debug(`Job #${jobId}(${name}) cleaned up — remaining active jobs:`, activeJobs.size);
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

// ─── Generation Helper ───

/**
 * Run `generateRaw` under the silent-generation cancel system, optionally
 * writing the final result into a target textarea once it arrives.
 *
 * `generateRaw` does not stream into extension callers — it does one fetch
 * and returns the full text — so this fills `targetEl` in a single write
 * when the promise resolves. The name is kept for historical reasons and
 * because callers conceptually wire this to a streaming-style output area.
 *
 * @param {object} params - generateRaw parameters.
 * @param {HTMLTextAreaElement|null} targetEl - Element to write the result into, or null.
 * @param {{ append?: boolean, name?: string }} [opts]
 * @returns {Promise<string>} The full generated text.
 * @throws {DOMException} AbortError if cancelled.
 */
export async function cancellableStreamingGenerate(params, targetEl, { append = false, name } = {}) {
    const jobName = name || 'streamingGenerate';
    debug(`cancellableStreamingGenerate — name: ${jobName}, hasTarget: ${!!targetEl}, append: ${append}, promptLen: ${params?.prompt?.length ?? 0}, responseLength: ${params?.responseLength ?? '(default)'}`);

    return runCancellableSilentGeneration({
        name: jobName,
        run: async (_signal) => {
            const result = await generateRaw(params);
            debug(`${jobName} — generateRaw resolved, length: ${(result || '').length}`);
            if (targetEl && result) {
                targetEl.value = append ? ((targetEl.value || '') + result) : result;
                targetEl.scrollTop = targetEl.scrollHeight;
            }
            return result;
        },
    });
}
