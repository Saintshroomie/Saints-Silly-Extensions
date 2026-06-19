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
 *
 * It also owns the streaming engine for those silent generations. ST's
 * `generateRaw` cannot stream — `generateRawData` tags every request as
 * 'quiet' (which hard-disables streaming for chat completion) and reads the
 * text-completion response with a single `response.json()` — so awaiting it
 * means the output field stays empty until the whole response lands. The
 * streaming engine borrows `generateRaw`'s prompt construction
 * (`createRawPrompt`) and per-API payload builders verbatim, flips only the
 * stream flag, and consumes the SSE token stream into the target field
 * live, finishing with the same `cleanUpMessage` post-processing
 * `generateRaw` applies. APIs without a usable token stream (Horde, and
 * Kobold/NovelAI without their streaming prerequisites) fall back to the
 * legacy single-write `generateRaw` path, as does any streaming attempt
 * that fails before the first token arrives.
 */

import {
    generateRaw,
    stopGeneration as stStopGeneration,
    createRawPrompt,
    cleanUpMessage,
    main_api,
    amount_gen,
    max_context,
    koboldai_settings,
    koboldai_setting_names,
    novelai_settings,
    novelai_setting_names,
} from '../../../../../script.js';
import { ChatCompletionService, TextCompletionService } from '../../../../custom-request.js';
import { oai_settings, getChatCompletionModel, createGenerationParameters } from '../../../../openai.js';
import { getTextGenGenerationData } from '../../../../textgen-settings.js';
import { kai_settings, kai_flags, getKoboldGenerationData, generateKoboldWithStreaming } from '../../../../kai-settings.js';
import { nai_settings, getNovelGenerationData, generateNovelWithStreaming } from '../../../../nai-settings.js';
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
    const streamingCb = document.getElementById('silent_generation_streaming');
    if (streamingCb) {
        streamingCb.checked = moduleSettings?.silentGenerationStreaming !== false;
        streamingCb.addEventListener('change', () => {
            if (moduleSettings) moduleSettings.silentGenerationStreaming = streamingCb.checked;
            saveSettings();
            debug('Streaming toggled:', streamingCb.checked);
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
 * `Promise.race` against the abort signal resolves) and cancels streaming
 * fetches (their signal is wired into the request), but it does NOT cancel
 * a legacy non-streaming `generateRaw` fetch — only ST's
 * `GENERATION_STOPPED` event does that. Used by the global stop listener
 * (where the event is the trigger) and as a building block for
 * `abortAllGenerations`. Most extension UI code should call
 * `abortAllGenerations` instead.
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

// ─── Streaming Engine ───

/**
 * Whether the user wants silent generations streamed into their output
 * fields. Defaults to on when the setting is absent.
 */
function isStreamingPreferred() {
    return moduleSettings?.silentGenerationStreaming !== false;
}

/**
 * Whether the streaming engine can serve the given API with the current
 * connection settings. Horde polls (there is no token stream to read),
 * Kobold's GUI preset bypasses the sampler payload the streaming endpoint
 * expects, classic Kobold needs a streaming-capable KoboldCpp, and
 * NovelAI's streaming generator reads the user's streaming toggle
 * internally — so each of those gates a fallback to plain `generateRaw`.
 *
 * @param {string} api - ST main-API identifier.
 * @returns {boolean}
 */
function canStreamApi(api) {
    switch (api) {
        case 'openai':
        case 'textgenerationwebui':
            return true;
        case 'kobold':
            return kai_settings.preset_settings !== 'gui' && !!kai_flags.can_use_streaming;
        case 'novel':
            return !!nai_settings.streaming_novel;
        default:
            return false;
    }
}

/**
 * Build the request payload for the given API and open the token stream.
 *
 * Prompt construction is borrowed wholesale from ST's `generateRaw` family:
 * `createRawPrompt` handles role mapping, instruct formatting, the system
 * prompt, and the prefill exactly as the non-streaming path does, and the
 * per-API payload builders are the same ones `generateRawData` calls — the
 * only deliberate difference is the stream flag (which `generateRawData`
 * never sets because everything it sends is typed 'quiet').
 *
 * @param {object} params - generateRaw-style parameters.
 * @param {AbortSignal} signal - Abort signal wired into the fetch.
 * @returns {Promise<() => AsyncGenerator<{ text: string }>>} Stream generator factory.
 */
async function openRawStream(params, signal) {
    const api = params.api || main_api;
    const { eventSource, eventTypes } = getContext();

    let prompt = createRawPrompt(
        params.prompt ?? '',
        api,
        !!params.instructOverride,
        !!params.quietToLoud,
        params.systemPrompt ?? '',
        params.prefill ?? '',
    );

    // Run the same extension hooks generateRawData fires before sending, so
    // other extensions that rewrite prompts still see silent generations.
    if (typeof prompt === 'string' && eventTypes?.GENERATE_AFTER_COMBINE_PROMPTS) {
        const eventData = { prompt, dryRun: false };
        await eventSource.emit(eventTypes.GENERATE_AFTER_COMBINE_PROMPTS, eventData);
        prompt = eventData.prompt;
    } else if (Array.isArray(prompt) && eventTypes?.CHAT_COMPLETION_PROMPT_READY) {
        const eventData = { chat: prompt, dryRun: false };
        await eventSource.emit(eventTypes.CHAT_COMPLETION_PROMPT_READY, eventData);
        prompt = eventData.chat;
    }

    const responseLength = (typeof params.responseLength === 'number' && params.responseLength > 0)
        ? params.responseLength
        : null;
    const maxTokens = responseLength ?? amount_gen;

    switch (api) {
        case 'openai': {
            const model = getChatCompletionModel();
            const { generate_data } = await createGenerationParameters(oai_settings, model, 'quiet', prompt);
            generate_data.stream = true;
            if (responseLength) {
                // o-series / gpt-5 payloads carry max_completion_tokens instead.
                if ('max_completion_tokens' in generate_data) generate_data.max_completion_tokens = responseLength;
                else generate_data.max_tokens = responseLength;
            }
            if (eventTypes?.CHAT_COMPLETION_SETTINGS_READY) {
                await eventSource.emit(eventTypes.CHAT_COMPLETION_SETTINGS_READY, generate_data);
            }
            const stream = await ChatCompletionService.sendRequest(generate_data, true, signal);
            return /** @type {() => AsyncGenerator<{ text: string }>} */ (stream);
        }
        case 'textgenerationwebui': {
            const generate_data = await getTextGenGenerationData(prompt, maxTokens, false, false, null, 'quiet');
            generate_data.stream = true;
            const stream = await TextCompletionService.sendRequest(generate_data, true, signal);
            return /** @type {() => AsyncGenerator<{ text: string }>} */ (stream);
        }
        case 'kobold': {
            const koboldSettings = koboldai_settings[koboldai_setting_names[kai_settings.preset_settings]];
            const generate_data = getKoboldGenerationData(String(prompt), koboldSettings, maxTokens, max_context, false, 'quiet');
            generate_data.streaming = true; // getKoboldGenerationData forces this off for 'quiet'
            return await generateKoboldWithStreaming(generate_data, signal);
        }
        case 'novel': {
            const novelSettings = novelai_settings[novelai_setting_names[nai_settings.preset_settings_novel]];
            const generate_data = getNovelGenerationData(prompt, novelSettings, maxTokens, false, false, null, 'quiet');
            return await generateNovelWithStreaming(generate_data, signal);
        }
        default:
            throw new Error(`Silent generation streaming does not support API: ${api}`);
    }
}

/**
 * Run one streaming silent generation end to end: open the stream, write
 * each partial into `targetEl` as it arrives, then apply the same
 * `cleanUpMessage` post-processing `generateRaw` runs and write the cleaned
 * final text. Mirrors `generateRaw`'s contract by throwing
 * 'No message generated' on an empty result.
 *
 * @param {object} params - generateRaw-style parameters.
 * @param {HTMLTextAreaElement|null} targetEl - Field streamed into, or null.
 * @param {boolean} append - Preserve the field's existing text as a prefix.
 * @param {AbortSignal} signal - Cancellation signal from the job manager.
 * @param {string} jobName - Debug name.
 * @param {{ receivedChunks: number, text: string }} progress - Out-param: the
 *   live chunk count and accumulated raw text, so the caller can tell a
 *   pre-stream failure (safe to fall back) from a mid-stream one and can
 *   recover the streamed partial after an abort.
 * @returns {Promise<string>} The cleaned final message.
 */
async function streamRawGenerate(params, targetEl, append, signal, jobName, progress) {
    const baseText = (append && targetEl) ? (targetEl.value || '') : '';
    // Reset the field before the request goes out — a fresh run clears
    // stale content immediately instead of waiting for the first token, so
    // the user sees the generation begin (append mode keeps the existing
    // text as the prefix).
    if (targetEl) {
        targetEl.value = baseText;
    }
    const streamFn = await openRawStream(params, signal);
    debug(`${jobName} — stream opened, awaiting tokens (api: ${params.api || main_api})`);

    // Throttle the live field writes. Writing (and scrolling) the textarea on
    // every token forces a reflow per token; on a large page (e.g. a long
    // chat behind the modal) that starves the main thread enough that the SSE
    // reader falls behind and the stream appears to hang — most visibly on
    // memory/CPU-limited mobile devices. Coalesce writes to ~10/sec; the final
    // cleaned write after the loop always reflects the full text.
    const FLUSH_INTERVAL_MS = 100;
    let lastFlush = 0;
    const flushField = () => {
        if (!targetEl) return;
        targetEl.value = baseText + progress.text;
        targetEl.scrollTop = targetEl.scrollHeight;
    };

    for await (const chunk of streamFn()) {
        if (signal.aborted) break;
        if (typeof chunk?.text === 'string') progress.text = chunk.text;
        if (progress.receivedChunks === 0) debug(`${jobName} — first chunk received`);
        progress.receivedChunks++;
        const now = Date.now();
        if (now - lastFlush >= FLUSH_INTERVAL_MS) {
            flushField();
            lastFlush = now;
        }
    }
    // Make sure the field reflects everything streamed (the last tokens may
    // have been throttled out, and abort handlers expect the partial visible).
    flushField();
    debug(`${jobName} — stream LOOP ENDED after ${progress.receivedChunks} chunk(s), raw length: ${progress.text.length} (if this line is missing in the log, the backend never closed the stream)`);
    signal.throwIfAborted();

    const trimNames = params.trimNames !== false;
    const message = cleanUpMessage({
        getMessage: progress.text,
        isImpersonate: false,
        isContinue: false,
        displayIncompleteSentences: true,
        includeUserPromptBias: false,
        trimNames,
        trimWrongNames: trimNames,
    });
    if (!message) throw new Error('No message generated');

    // Replace the live raw text with the cleaned final message (stopping
    // strings trimmed, regex scripts applied) so the field matches what the
    // caller gets back.
    if (targetEl) {
        targetEl.value = baseText + message;
        targetEl.scrollTop = targetEl.scrollHeight;
    }
    return message;
}

// ─── Generation Helper ───

/**
 * Run a silent generation under the cancel system, streaming the output
 * into `targetEl` token by token when the backend supports it.
 *
 * Streaming is used for chat completion, Text Completion, classic Kobold
 * (streaming-capable KoboldCpp), and NovelAI (with its streaming toggle
 * on), unless disabled via the Silent Generation settings or the call uses
 * `jsonSchema`. Everything else — and any streaming attempt that dies
 * before the first token — goes through plain `generateRaw` and fills
 * `targetEl` in a single write when the promise resolves.
 *
 * A fresh (non-append) streaming run clears `targetEl` as soon as the job
 * starts. On cancel, whatever streamed so far is deliberately left in the
 * field, and the thrown AbortError carries it as `err.streamedPartial`
 * (the raw streamed text, without the append-mode prefix) — abort handlers
 * that want to keep the partial should read it from there rather than from
 * the field, which other code may have reset or re-rendered by the time
 * the handler runs.
 *
 * @param {object} params - generateRaw parameters.
 * @param {HTMLTextAreaElement|null} targetEl - Element to stream/write the result into, or null.
 * @param {{ append?: boolean, name?: string }} [opts]
 * @returns {Promise<string>} The full generated text.
 * @throws {DOMException} AbortError if cancelled, with `streamedPartial` attached.
 */
export async function cancellableStreamingGenerate(params, targetEl, { append = false, name } = {}) {
    const jobName = name || 'streamingGenerate';
    const api = params?.api || main_api;
    const wantStreaming = isStreamingPreferred() && !params?.jsonSchema && canStreamApi(api);
    debug(`cancellableStreamingGenerate — name: ${jobName}, api: ${api}, streaming: ${wantStreaming}, hasTarget: ${!!targetEl}, append: ${append}, promptLen: ${params?.prompt?.length ?? 0}, responseLength: ${params?.responseLength ?? '(default)'}`);

    const progress = { receivedChunks: 0, text: '' };
    try {
        return await runCancellableSilentGeneration({
            name: jobName,
            run: async (signal) => {
                if (wantStreaming) {
                    try {
                        return await streamRawGenerate(params, targetEl, append, signal, jobName, progress);
                    } catch (err) {
                        if (signal.aborted || err?.name === 'AbortError' || progress.receivedChunks > 0) {
                            throw err;
                        }
                        debug(`${jobName} — streaming failed before any tokens arrived (${err?.message || err}); falling back to generateRaw`);
                    }
                }

                const result = await generateRaw(params);
                debug(`${jobName} — generateRaw resolved, length: ${(result || '').length}`);
                // If the job was cancelled while generateRaw was in flight, the
                // race in runCancellableSilentGeneration already rejected and the
                // caller moved on — don't clobber the target with the discarded
                // result (the user may have edited the field since).
                if (signal.aborted) return result;
                if (targetEl && result) {
                    targetEl.value = append ? ((targetEl.value || '') + result) : result;
                    targetEl.scrollTop = targetEl.scrollHeight;
                }
                return result;
            },
        });
    } catch (err) {
        // Hand abort handlers the streamed partial directly — the field may
        // already have been reset or re-rendered by the time they run.
        if (err && typeof err === 'object' && err.name === 'AbortError') {
            err.streamedPartial = progress.text;
        }
        debug(`${jobName} — rejected (${err?.name || 'Error'}), streamed partial length: ${progress.text.length}`);
        throw err;
    }
}
