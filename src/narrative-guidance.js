/**
 * Narrative Guidance module — periodically asks the LLM to produce a short
 * paragraph of story guidance based on the current chat / character / lore
 * context, then injects that paragraph as a system prompt before every AI
 * turn until a per-chat turn counter expires, at which point it regenerates.
 *
 * Guidance comes in two independent tiers ("tracks"):
 *   - Long-term  — the overarching arc, with a long refresh horizon.
 *   - Short-term — the immediate beats, with a short refresh horizon.
 * The tiers are fully separate (own themes, prompts, lore books, counter and
 * toggles) but operate identically; everything track-specific is captured in
 * the NG_TRACKS descriptors so the generation/injection/counter logic is
 * shared. Short-term generation is hierarchical: it is seeded with the
 * current long-term guidance so the immediate beats serve the larger arc, and
 * a long-term refresh re-aligns short-term.
 *
 * Per-chat state lives under `context.chatMetadata.narrativeGuidance` as
 * `{ long: { guidance, turnsRemaining, themes }, short: { … } }`. Legacy
 * single-track state is mapped onto the short-term track on read.
 */

import {
    setExtensionPrompt,
    extension_prompt_types,
    extension_prompt_roles,
    substituteParamsExtended,
} from '../../../../../script.js';
import { removeReasoningFromString } from '../../../../reasoning.js';
import {
    getContext,
    createDebugLogger,
    toast,
    stickyToast,
    buildContextPreamble,
    createLoreBookPicker,
    streamingGenerate,
    withSingleLineDisabled,
    applyTemplateMacros,
    stripPrefillEcho,
    showPromptPreview,
} from './utils.js';
import {
    isSilentGenerationAbort,
    abortAllGenerations,
} from './silent-generation.js';

// ─── Constants ───

const NG_METADATA_KEY = 'narrativeGuidance';

// User-prompt templates for guidance generation. {{context}}, {{themes}} and
// (short-term only) {{longGuidance}} are replaced by the packed chat/lore
// preamble, the per-track themes block, and the active long-term arc; if a
// placeholder is missing the block is prepended instead.
export const DEFAULT_NG_LONG_USER_PROMPT =
    '{{context}}{{themes}}Continue the bracketed paragraph below. Output a single short paragraph ' +
    '(2–4 sentences) describing the overarching direction of the story across the next many turns — ' +
    'the larger arc, the escalating stakes, and where events are ultimately heading. ' +
    'Describe the broad trajectory and mood, not immediate dialogue or scene actions. ' +
    'Close the bracket when done.';

export const DEFAULT_NG_SHORT_USER_PROMPT =
    '{{context}}{{longGuidance}}{{themes}}Continue the bracketed paragraph below. Output a single short paragraph ' +
    '(2–4 sentences) proposing where the story should head over the next few turns — ' +
    'immediate direction, mood, complications, and beats that move the scene toward the overarching arc. ' +
    'Describe direction, not direct dialogue or scene actions. Close the bracket when done.';

export const DEFAULT_NG_LONG_GENERATION_PROMPT =
    '[The following paragraph describes the overarching story arc, and will guide the long-term direction of the story:';

export const DEFAULT_NG_SHORT_GENERATION_PROMPT =
    '[The following paragraph is based on the given context, and will guide the actions of the characters for the next few turns:';

export const DEFAULT_NG_LONG_INJECTION_PROMPT =
    '[Overall story direction: {{guidance}}]';

export const DEFAULT_NG_SHORT_INJECTION_PROMPT =
    '[Guide the story in the following direction over the next few turns: {{guidance}}]';

const NG_GENERATION_SYSTEM_PROMPT =
    'You are a story-direction assistant. Output only a single short paragraph ' +
    'of narrative guidance in the requested bracketed format. ' +
    'No commentary, no preamble, no explanations.';

export const DEFAULT_NG_LONG_TURN_COUNT = 40;
export const DEFAULT_NG_SHORT_TURN_COUNT = 8;
export const DEFAULT_NG_INJECTION_DEPTH = 0;
export const DEFAULT_NG_INJECTION_ROLE = 'system';
export const DEFAULT_NG_RESPONSE_LENGTH = 400;

// ─── Track Descriptors ───

// Everything track-specific lives here so the shared logic below can be
// parameterized by track. `settingPrefix` + a suffix yields the extension
// settings key (e.g. 'narrativeGuidanceLongEnabled'); `domPrefix` + a suffix
// yields the settings-panel element id (e.g. 'ng_long_enabled').
const NG_TRACKS = {
    long: {
        id: 'long',
        label: 'Long-term',
        injectionKey: 'narrative_guidance_long',
        countedFlag: 'ngLongCounted',
        settingPrefix: 'narrativeGuidanceLong',
        domPrefix: 'ng_long',
        hierarchical: false,
        defaultTurnCount: DEFAULT_NG_LONG_TURN_COUNT,
        defaultUserPrompt: DEFAULT_NG_LONG_USER_PROMPT,
        defaultGenerationPrompt: DEFAULT_NG_LONG_GENERATION_PROMPT,
        defaultInjectionPrompt: DEFAULT_NG_LONG_INJECTION_PROMPT,
    },
    short: {
        id: 'short',
        label: 'Short-term',
        injectionKey: 'narrative_guidance_short',
        countedFlag: 'ngShortCounted',
        settingPrefix: 'narrativeGuidanceShort',
        domPrefix: 'ng_short',
        hierarchical: true,
        defaultTurnCount: DEFAULT_NG_SHORT_TURN_COUNT,
        defaultUserPrompt: DEFAULT_NG_SHORT_USER_PROMPT,
        defaultGenerationPrompt: DEFAULT_NG_SHORT_GENERATION_PROMPT,
        defaultInjectionPrompt: DEFAULT_NG_SHORT_INJECTION_PROMPT,
    },
};

// Long first so short (hierarchical) sees a freshly-bootstrapped arc.
const NG_TRACK_LIST = [NG_TRACKS.long, NG_TRACKS.short];

function settingKey(track, suffix) {
    return `${track.settingPrefix}${suffix}`;
}

function getSetting(track, suffix) {
    return moduleSettings?.[settingKey(track, suffix)];
}

function domId(track, suffix) {
    return `${track.domPrefix}_${suffix}`;
}

function trackEl(track, suffix) {
    return document.getElementById(domId(track, suffix));
}

// ─── Module State ───

let moduleSettings = null;
let saveSettingsCb = null;
let debug = () => {};
let saveTimer = null;

// Per-track runtime: in-progress flag, the action currently running
// ('regen' | 'continue' | null) used to swap the active button to Stop, and
// the pre-regen guidance snapshot for Retry.
const runtime = {
    long: { regenInProgress: false, activeAction: null, lastSnapshot: null },
    short: { regenInProgress: false, activeAction: null, lastSnapshot: null },
};

// ─── Per-chat State ───

/**
 * Read the per-chat NG container, normalizing legacy single-track state onto
 * the short-term track. Pure read — never mutates chatMetadata, so the
 * migration is only persisted on the next write.
 */
function readContainer() {
    const context = getContext();
    const raw = context.chatMetadata?.[NG_METADATA_KEY];
    if (raw && (raw.long !== undefined || raw.short !== undefined)) {
        return raw;
    }
    // Empty or legacy single-track shape → map any legacy guidance to short.
    return {
        long: { guidance: '', turnsRemaining: 0, themes: '' },
        short: {
            guidance: typeof raw?.guidance === 'string' ? raw.guidance : '',
            turnsRemaining: Number.isFinite(raw?.turnsRemaining) ? raw.turnsRemaining : 0,
            themes: typeof raw?.themes === 'string' ? raw.themes : '',
        },
    };
}

function loadChatState(track) {
    const raw = readContainer()[track.id] || {};
    return {
        guidance: typeof raw.guidance === 'string' ? raw.guidance : '',
        turnsRemaining: Number.isFinite(raw.turnsRemaining) ? raw.turnsRemaining : 0,
        themes: typeof raw.themes === 'string' ? raw.themes : '',
    };
}

function writeChatState(track, state) {
    const context = getContext();
    const container = readContainer();
    container[track.id] = {
        guidance: state.guidance || '',
        turnsRemaining: Number.isFinite(state.turnsRemaining) ? state.turnsRemaining : 0,
        themes: state.themes || '',
    };
    context.chatMetadata[NG_METADATA_KEY] = container;
}

function saveChatState(track, state) {
    writeChatState(track, state);
    getContext().saveMetadata();
}

function scheduleChatStateSave(track, state) {
    // Write through to chatMetadata immediately so a concurrent edit to
    // another textarea (which reloads state via loadChatState) or a chat
    // switch never observes — or persists — stale state. Only the
    // saveMetadata call is debounced. A single shared timer is fine because
    // saveMetadata persists the whole container.
    writeChatState(track, state);
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        saveTimer = null;
        getContext().saveMetadata();
    }, 200);
}

function resolveTurnCount(track) {
    const n = getSetting(track, 'DefaultTurnCount');
    return Number.isFinite(n) && n > 0 ? n : track.defaultTurnCount;
}

function resolveResponseLength(track) {
    const n = getSetting(track, 'ResponseLength');
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_NG_RESPONSE_LENGTH;
}

// ─── Injection ───

function clearInjection(track) {
    setExtensionPrompt(track.injectionKey, '', extension_prompt_types.NONE, 0);
}

function reapplyInjection(track) {
    if (!getSetting(track, 'Enabled')) {
        clearInjection(track);
        return;
    }
    const state = loadChatState(track);
    if (!state.guidance) {
        clearInjection(track);
        return;
    }
    const tpl = getSetting(track, 'InjectionPrompt') || track.defaultInjectionPrompt;
    // state.guidance retains the generation prefill (so the textarea shows
    // it). Strip outer brackets here so {{guidance}} substitutes cleanly
    // into whatever injection template the user has configured.
    const guidanceForInjection = stripBracketWrap(state.guidance);
    const body = substituteParamsExtended(tpl, { guidance: guidanceForInjection });
    const configuredDepth = getSetting(track, 'InjectionDepth');
    const depth = Number.isFinite(configuredDepth) && configuredDepth >= 0 ? configuredDepth : 0;
    const role = resolveInjectionRole(getSetting(track, 'InjectionRole'));
    setExtensionPrompt(
        track.injectionKey,
        body,
        extension_prompt_types.IN_CHAT,
        depth,
        false,
        role,
    );
    debug(`[${track.id}] Injected guidance — depth:`, depth, 'role:', getSetting(track, 'InjectionRole'), 'body length:', body.length);
}

function resolveInjectionRole(name) {
    switch ((name || 'system').toLowerCase()) {
        case 'user': return extension_prompt_roles.USER;
        case 'assistant': return extension_prompt_roles.ASSISTANT;
        case 'system':
        default: return extension_prompt_roles.SYSTEM;
    }
}

// ─── Generation ───

function stripBracketWrap(text) {
    let out = (text || '').trim();
    if (out.startsWith('[')) out = out.slice(1).trimStart();
    if (out.endsWith(']')) out = out.slice(0, -1).trimEnd();
    return out;
}

/**
 * Assemble the guidance-generation user prompt from the editable template.
 * {{context}} / {{themes}} / {{longGuidance}} are substituted in place; when a
 * placeholder is absent the corresponding block is prepended (context first,
 * then long-term arc, then themes), matching the pre-template behavior.
 */
function composeGenerationPrompt(track, preambleBlock, themesBlock, longGuidanceBlock) {
    const configured = getSetting(track, 'Prompt');
    const tpl = (typeof configured === 'string' && configured.trim())
        ? configured
        : track.defaultUserPrompt;
    const { text, used } = applyTemplateMacros(tpl, {
        context: preambleBlock || '',
        themes: themesBlock || '',
        longGuidance: longGuidanceBlock || '',
    });
    let prompt = text;
    if (!used.has('themes') && themesBlock) prompt = themesBlock + prompt;
    if (track.hierarchical && !used.has('longGuidance') && longGuidanceBlock) prompt = longGuidanceBlock + prompt;
    if (!used.has('context') && preambleBlock) prompt = preambleBlock + prompt;
    return prompt;
}

/** Build the long-term arc block fed into short-term (hierarchical) prompts. */
function buildLongGuidanceBlock() {
    const longText = stripBracketWrap(loadChatState(NG_TRACKS.long).guidance || '');
    return longText
        ? `Long-term story direction to stay consistent with:\n${longText}\n\n`
        : '';
}

function showNGPromptPreview(track) {
    const sampleContext =
        'Existing context to consider when generating (do not repeat verbatim):\n'
        + '(character cards, persona, selected lore books, and recent chat)\n\n';
    const sampleThemes = 'Themes / story arcs to weave in:\n(your Themes / Story Arcs text)\n\n';
    const sampleLong = track.hierarchical
        ? 'Long-term story direction to stay consistent with:\n(the active long-term guidance)\n\n'
        : '';
    const prefill = getSetting(track, 'GenerationPrompt') || track.defaultGenerationPrompt;
    const injectionTpl = getSetting(track, 'InjectionPrompt') || track.defaultInjectionPrompt;
    const injection = substituteParamsExtended(injectionTpl, {
        guidance: '(the generated guidance text, outer brackets stripped)',
    });
    showPromptPreview(`Narrative Guidance (${track.label}) — Prompt Preview`, [
        { label: 'System Prompt (fixed)', text: NG_GENERATION_SYSTEM_PROMPT },
        { label: 'User Prompt (Generation Instructions template with sample values)', text: composeGenerationPrompt(track, sampleContext, sampleThemes, sampleLong) },
        { label: 'Prefill (assistant prefix; kept at the start of the stored guidance)', text: prefill },
        { label: 'Injection (added to the chat prompt before each AI turn while guidance is active)', text: injection },
    ]);
}

/**
 * If a long-term refresh just landed, re-align short-term to it (when
 * short-term is enabled and auto-regenerating). Fire-and-forget — the new
 * short-term guidance lands before the user's next send.
 */
function maybeCascadeShortRegen(reason) {
    const short = NG_TRACKS.short;
    if (!getSetting(short, 'Enabled')) return;
    if (!getSetting(short, 'AutoRegen')) return;
    if (runtime.short.regenInProgress) return;
    debug('Cascading short-term regen after long-term refresh');
    regenGuidance(short, `long-term refreshed (${reason})`).catch(err => {
        console.error('Narrative Guidance short-term cascade failed:', err);
    });
}

async function regenGuidance(track, reason) {
    const rt = runtime[track.id];
    if (rt.regenInProgress) {
        debug(`[${track.id}] regenGuidance — skipped (already running)`);
        return;
    }
    if (!getSetting(track, 'Enabled')) {
        debug(`[${track.id}] regenGuidance — skipped (disabled)`);
        return;
    }

    // Snapshot current guidance before overwriting so Retry can restore it.
    rt.lastSnapshot = loadChatState(track).guidance || '';

    rt.regenInProgress = true;
    rt.activeAction = 'regen';
    setNGActionButtonsRunning(track, true);
    clearInjection(track);
    debug(`[${track.id}] regenGuidance — starting, reason:`, reason);

    const dismissProgressToast = stickyToast(`Generating ${track.label.toLowerCase()} narrative guidance…`, 'info');

    try {
        const responseLength = resolveResponseLength(track);
        const state = loadChatState(track);
        const preamble = await buildContextPreamble({
            includeChat: true,
            loreBookNames: Array.isArray(getSetting(track, 'LoreBookNames'))
                ? getSetting(track, 'LoreBookNames')
                : [],
            responseLength,
            maxContextOverride: getSetting(track, 'MaxContextOverride') || 0,
        });

        const themesBlock = state.themes && state.themes.trim()
            ? `Themes / story arcs to weave in:\n${state.themes.trim()}\n\n`
            : '';

        const preambleBlock = preamble
            ? `Existing context to consider when generating (do not repeat verbatim):\n${preamble}\n\n`
            : '';

        const longGuidanceBlock = track.hierarchical ? buildLongGuidanceBlock() : '';

        const prefill = getSetting(track, 'GenerationPrompt') || track.defaultGenerationPrompt;

        const userPrompt = composeGenerationPrompt(track, preambleBlock, themesBlock, longGuidanceBlock);
        const systemPrompt = NG_GENERATION_SYSTEM_PROMPT;

        debug(`[${track.id}] User prompt length:`, userPrompt.length, 'prefill:', prefill);

        const guidanceArea = trackEl(track, 'active_guidance_textarea');
        const raw = await withSingleLineDisabled(() => streamingGenerate(
            { prompt: userPrompt, systemPrompt, responseLength, prefill },
            guidanceArea,
            { append: false },
        ));

        // Preserve the prefill in the stored guidance so the active-guidance
        // textarea shows prefill + model output as one block. The bracket
        // wrappers are stripped only at injection time (see reapplyInjection)
        // so the injected payload doesn't end up nested inside two brackets.
        // Backends that ignore the assistant prefix may re-emit the prefill;
        // strip the echo so the stored block doesn't double its opening.
        const cleaned = stripPrefillEcho(removeReasoningFromString(raw).trim(), prefill);
        if (!cleaned) {
            throw new Error('Model returned empty guidance.');
        }

        state.guidance = (prefill || '') + cleaned;
        state.turnsRemaining = resolveTurnCount(track);
        saveChatState(track, state);

        refreshPanelFromState(track);
        reapplyInjection(track);
        toast(`${track.label} narrative guidance regenerated.`, 'success');
        debug(`[${track.id}] regenGuidance — complete, length:`, cleaned.length);

        // A fresh long-term arc re-aligns the short-term track.
        if (track.id === 'long') maybeCascadeShortRegen(reason);
    } catch (err) {
        if (isSilentGenerationAbort(err)) {
            debug(`[${track.id}] regenGuidance — cancelled by user`);
            // A deliberate stop keeps whatever streamed so far as the active
            // guidance; only resync the panel when nothing usable streamed.
            if (adoptStreamedPartial(track, { resetCounter: true })) {
                toast(`${track.label} generation stopped — keeping the partial guidance.`, 'info');
                return;
            }
        } else {
            console.error(`Narrative Guidance (${track.label}) generation error:`, err);
            toast(`${track.label} narrative guidance failed: ${err.message}`, 'error');
        }
        // Resync the textarea (the failed run may have left discarded model
        // output in it) and restore whatever injection we had before clearing.
        refreshPanelFromState(track);
        reapplyInjection(track);
    } finally {
        dismissProgressToast();
        rt.regenInProgress = false;
        rt.activeAction = null;
        setNGActionButtonsRunning(track, false);
    }
}

async function continueGuidance(track) {
    const rt = runtime[track.id];
    if (rt.regenInProgress) {
        debug(`[${track.id}] continueGuidance — skipped (already running)`);
        return;
    }
    if (!getSetting(track, 'Enabled')) {
        debug(`[${track.id}] continueGuidance — skipped (disabled)`);
        return;
    }
    const state = loadChatState(track);
    if (!state.guidance) {
        toast('No active guidance to continue. Regenerate first.', 'warning');
        return;
    }

    rt.regenInProgress = true;
    rt.activeAction = 'continue';
    setNGActionButtonsRunning(track, true);
    debug(`[${track.id}] continueGuidance — starting`);

    const dismissProgressToast = stickyToast(`Continuing ${track.label.toLowerCase()} narrative guidance…`, 'info');

    try {
        const responseLength = resolveResponseLength(track);

        const continuePrompt =
            `The following narrative guidance paragraph is in progress:\n\n${state.guidance}\n\n` +
            'Continue this paragraph seamlessly from where it left off. ' +
            'Add 1–2 sentences extending the story direction, mood, or complications. ' +
            'Do not repeat existing text. Output only the continuation — no brackets, no preamble.';

        const systemPrompt =
            'You are a story-direction assistant. Output only the continuation of the guidance. ' +
            'No commentary, no preamble, no explanations.';

        debug(`[${track.id}] Continue prompt length:`, continuePrompt.length);

        const guidanceArea = trackEl(track, 'active_guidance_textarea');
        const raw = await withSingleLineDisabled(() => streamingGenerate(
            { prompt: continuePrompt, systemPrompt, responseLength },
            guidanceArea,
            { append: true },
        ));

        const continuation = removeReasoningFromString(raw).trim();
        if (!continuation) throw new Error('Model returned empty continuation.');

        rt.lastSnapshot = state.guidance;
        const sep = state.guidance.endsWith(' ') || continuation.startsWith(' ') ? '' : ' ';
        state.guidance = state.guidance + sep + continuation;
        saveChatState(track, state);

        refreshPanelFromState(track);
        reapplyInjection(track);
        toast(`${track.label} narrative guidance continued.`, 'success');
        debug(`[${track.id}] continueGuidance — complete, added length:`, continuation.length);
    } catch (err) {
        if (isSilentGenerationAbort(err)) {
            debug(`[${track.id}] continueGuidance — cancelled by user`);
            // A deliberate stop keeps the partial continuation as part of
            // the active guidance; only resync when nothing streamed.
            if (adoptStreamedPartial(track, { resetCounter: false })) {
                toast(`${track.label} continue stopped — keeping the partial continuation.`, 'info');
                return;
            }
        } else {
            console.error(`Narrative Guidance (${track.label}) continue error:`, err);
            toast(`${track.label} continue failed: ${err.message}`, 'error');
        }
        // Resync the textarea — the failed run may have appended discarded
        // model output that never made it into the saved state.
        refreshPanelFromState(track);
    } finally {
        dismissProgressToast();
        rt.regenInProgress = false;
        rt.activeAction = null;
        setNGActionButtonsRunning(track, false);
        refreshNGActionButtonStates(track);
    }
}

// ─── Event Handlers ───

export function onNarrativeGuidanceChatChanged() {
    for (const track of NG_TRACK_LIST) {
        refreshPanelFromState(track);
        reapplyInjection(track);
    }
    debug('Chat changed, state reloaded');
}

export async function onNarrativeGuidanceMessageSent(_messageIndex) {
    // Long-term first so a freshly-bootstrapped arc is available to seed a
    // short-term bootstrap on the same turn.
    for (const track of NG_TRACK_LIST) {
        if (!getSetting(track, 'Enabled')) continue;
        if (runtime[track.id].regenInProgress) continue;
        if (!getSetting(track, 'AutoRegen')) {
            reapplyInjection(track);
            continue;
        }
        const state = loadChatState(track);
        if (!state.guidance) {
            // First-turn bootstrap: block briefly so the next AI turn sees
            // guidance. (A long-term bootstrap may cascade short-term, which
            // sets short's in-progress flag before this loop reaches it.)
            await regenGuidance(track, 'no guidance yet');
        } else {
            reapplyInjection(track);
        }
    }
}

export function onNarrativeGuidanceMessageReceived(messageIndex) {
    const ctx = getContext();
    const idx = typeof messageIndex === 'number' ? messageIndex : ctx.chat.length - 1;
    const msg = ctx.chat?.[idx];
    if (!msg) return;
    if (msg.is_user || msg.is_system) return;

    for (const track of NG_TRACK_LIST) {
        if (!getSetting(track, 'Enabled')) continue;
        if (runtime[track.id].regenInProgress) continue;
        if (msg.extra?.[track.countedFlag]) continue;

        const state = loadChatState(track);
        if (state.turnsRemaining > 0) {
            state.turnsRemaining -= 1;
            saveChatState(track, state);
            refreshRemainingDisplay(track, state.turnsRemaining);
        }
        msg.extra = { ...(msg.extra || {}), [track.countedFlag]: true };
        debug(`[${track.id}] Counter decremented, turnsRemaining:`, state.turnsRemaining);

        if (state.turnsRemaining <= 0 && getSetting(track, 'AutoRegen')) {
            // Fire-and-forget so new guidance is in place before the next send.
            regenGuidance(track, 'counter expired').catch(err => {
                console.error(`Narrative Guidance (${track.label}) auto-regen failed:`, err);
            });
        }
    }
}

// ─── Settings Panel ───

function refreshRemainingDisplay(track, remaining) {
    const display = trackEl(track, 'remaining_display');
    if (display) display.textContent = String(remaining);
}

/**
 * Adopt whatever a stopped generation left in the active-guidance textarea
 * as the track's guidance — the user often stops precisely because they
 * already like the partial, and keeping it saved lets them edit it or hit
 * Continue. Returns false when there is no usable partial (nothing
 * streamed, or the field matches the saved guidance); the caller should
 * resync the panel instead.
 *
 * @param {object} track - NG track config.
 * @param {{ resetCounter: boolean }} opts - Reset the turn counter like a
 *   successful regen (so auto-regen doesn't immediately overwrite the kept
 *   partial); continues leave the counter alone, mirroring their success path.
 * @returns {boolean} Whether a partial was adopted.
 */
function adoptStreamedPartial(track, { resetCounter }) {
    const guidanceArea = trackEl(track, 'active_guidance_textarea');
    const partial = guidanceArea?.value?.trim() || '';
    const state = loadChatState(track);
    if (!partial || partial === (state.guidance || '').trim()) return false;

    state.guidance = partial;
    if (resetCounter) state.turnsRemaining = resolveTurnCount(track);
    saveChatState(track, state);

    refreshPanelFromState(track);
    reapplyInjection(track);
    debug(`[${track.id}] Adopted streamed partial as active guidance, length:`, partial.length);
    return true;
}

function refreshPanelFromState(track) {
    const state = loadChatState(track);
    const themesArea = trackEl(track, 'themes_textarea');
    if (themesArea && document.activeElement !== themesArea) {
        themesArea.value = state.themes || '';
    }
    const guidanceArea = trackEl(track, 'active_guidance_textarea');
    if (guidanceArea && document.activeElement !== guidanceArea) {
        guidanceArea.value = state.guidance || '';
    }
    refreshRemainingDisplay(track, state.turnsRemaining);
    refreshNGActionButtonStates(track);
}

// Original button HTML, captured so we can restore it when leaving the
// generating state.
const NG_REGEN_BTN_HTML = '<span class="ng-regen-icon fa-solid fa-wand-sparkles"></span> Regenerate Now';
const NG_CONTINUE_BTN_HTML = '<span class="fa-solid fa-arrow-right"></span> Continue';
const NG_STOP_BTN_HTML = '<span class="fa-solid fa-stop"></span> Stop';

function setNGActionButtonsRunning(track, running) {
    const regenBtn = trackEl(track, 'regenerate_now');
    const continueBtn = trackEl(track, 'continue_now');
    const retryBtn = trackEl(track, 'retry_now');

    if (running) {
        // Active button becomes Stop; the others get the disabled class so the
        // user can't fire off a second job mid-flight.
        if (runtime[track.id].activeAction === 'continue') {
            if (regenBtn) {
                regenBtn.innerHTML = NG_REGEN_BTN_HTML;
                regenBtn.classList.add('disabled');
            }
            if (continueBtn) {
                continueBtn.innerHTML = NG_STOP_BTN_HTML;
                continueBtn.classList.remove('disabled');
            }
        } else {
            // 'regen' or unspecified — treat regenerate as active.
            if (regenBtn) {
                regenBtn.innerHTML = NG_STOP_BTN_HTML;
                regenBtn.classList.remove('disabled');
            }
            if (continueBtn) {
                continueBtn.innerHTML = NG_CONTINUE_BTN_HTML;
                continueBtn.classList.add('disabled');
            }
        }
        retryBtn?.classList.add('disabled');
    } else {
        if (regenBtn) {
            regenBtn.innerHTML = NG_REGEN_BTN_HTML;
            regenBtn.classList.remove('disabled');
        }
        if (continueBtn) {
            continueBtn.innerHTML = NG_CONTINUE_BTN_HTML;
            continueBtn.classList.remove('disabled');
        }
        retryBtn?.classList.remove('disabled');
    }
}

function refreshNGActionButtonStates(track) {
    if (runtime[track.id].regenInProgress) return;
    const state = loadChatState(track);
    trackEl(track, 'retry_now')
        ?.classList.toggle('disabled', runtime[track.id].lastSnapshot === null);
    trackEl(track, 'continue_now')
        ?.classList.toggle('disabled', !(state.guidance && state.guidance.trim()));
}

function populateLoreBookPicker(track) {
    const host = trackEl(track, 'lorebooks_host');
    if (!host) return;

    const initial = Array.isArray(getSetting(track, 'LoreBookNames'))
        ? getSetting(track, 'LoreBookNames')
        : [];

    const { element } = createLoreBookPicker({
        initialSelection: initial,
        // Shared styling class across both tracks; the element id differs.
        classPrefix: 'ng-lorebook',
        onChange: (names) => {
            moduleSettings[settingKey(track, 'LoreBookNames')] = names;
            saveSettingsCb?.();
        },
    });
    element.id = domId(track, 'lorebooks_details');
    host.replaceChildren(element);
}

/** Bind every per-track control in the settings panel for one track. */
function bindTrackControls(track, saveSettings) {
    const enabledCb = trackEl(track, 'enabled');
    if (enabledCb) {
        enabledCb.checked = !!getSetting(track, 'Enabled');
        enabledCb.addEventListener('change', () => {
            moduleSettings[settingKey(track, 'Enabled')] = enabledCb.checked;
            saveSettings();
            if (enabledCb.checked) {
                reapplyInjection(track);
            } else {
                clearInjection(track);
            }
        });
    }

    const autoRegenCb = trackEl(track, 'auto_regen');
    if (autoRegenCb) {
        autoRegenCb.checked = !!getSetting(track, 'AutoRegen');
        autoRegenCb.addEventListener('change', () => {
            moduleSettings[settingKey(track, 'AutoRegen')] = autoRegenCb.checked;
            saveSettings();
        });
    }

    const turnCountInput = trackEl(track, 'default_turn_count');
    if (turnCountInput) {
        turnCountInput.value = getSetting(track, 'DefaultTurnCount') || track.defaultTurnCount;
        turnCountInput.addEventListener('input', () => {
            const n = parseInt(turnCountInput.value, 10);
            if (Number.isFinite(n) && n > 0) {
                moduleSettings[settingKey(track, 'DefaultTurnCount')] = n;
                saveSettings();
            }
        });
    }

    const responseLengthInput = trackEl(track, 'response_length');
    if (responseLengthInput) {
        responseLengthInput.value = getSetting(track, 'ResponseLength') || DEFAULT_NG_RESPONSE_LENGTH;
        responseLengthInput.addEventListener('input', () => {
            const n = parseInt(responseLengthInput.value, 10);
            if (Number.isFinite(n) && n > 0) {
                moduleSettings[settingKey(track, 'ResponseLength')] = n;
                saveSettings();
            }
        });
    }

    const maxContextInput = trackEl(track, 'max_context_override');
    if (maxContextInput) {
        maxContextInput.value = getSetting(track, 'MaxContextOverride') || 0;
        maxContextInput.addEventListener('input', () => {
            const n = parseInt(maxContextInput.value, 10);
            moduleSettings[settingKey(track, 'MaxContextOverride')] = Number.isFinite(n) && n > 0 ? n : 0;
            saveSettings();
        });
    }

    const userPromptArea = trackEl(track, 'user_prompt_textarea');
    if (userPromptArea) {
        userPromptArea.value = getSetting(track, 'Prompt') || track.defaultUserPrompt;
        userPromptArea.addEventListener('input', () => {
            moduleSettings[settingKey(track, 'Prompt')] = userPromptArea.value;
            saveSettings();
        });
    }

    const genArea = trackEl(track, 'generation_prompt_textarea');
    if (genArea) {
        genArea.value = getSetting(track, 'GenerationPrompt') || track.defaultGenerationPrompt;
        genArea.addEventListener('input', () => {
            moduleSettings[settingKey(track, 'GenerationPrompt')] = genArea.value;
            saveSettings();
        });
    }

    const injectArea = trackEl(track, 'injection_prompt_textarea');
    if (injectArea) {
        injectArea.value = getSetting(track, 'InjectionPrompt') || track.defaultInjectionPrompt;
        injectArea.addEventListener('input', () => {
            const value = injectArea.value;
            moduleSettings[settingKey(track, 'InjectionPrompt')] = value;
            saveSettings();
            if (value.trim() && !value.includes('{{guidance}}')) {
                toast('Warning: Injection template lacks {{guidance}}; the AI won\'t see the guidance text.', 'warning');
            }
            reapplyInjection(track);
        });
    }

    trackEl(track, 'preview_btn')
        ?.addEventListener('click', () => showNGPromptPreview(track));

    const depthInput = trackEl(track, 'injection_depth');
    if (depthInput) {
        const configuredDepth = getSetting(track, 'InjectionDepth');
        depthInput.value = Number.isFinite(configuredDepth) ? configuredDepth : DEFAULT_NG_INJECTION_DEPTH;
        depthInput.addEventListener('input', () => {
            const n = parseInt(depthInput.value, 10);
            if (Number.isFinite(n) && n >= 0) {
                moduleSettings[settingKey(track, 'InjectionDepth')] = n;
                saveSettings();
                reapplyInjection(track);
            }
        });
    }

    const roleSelect = trackEl(track, 'injection_role');
    if (roleSelect) {
        roleSelect.value = getSetting(track, 'InjectionRole') || DEFAULT_NG_INJECTION_ROLE;
        roleSelect.addEventListener('change', () => {
            moduleSettings[settingKey(track, 'InjectionRole')] = roleSelect.value;
            saveSettings();
            reapplyInjection(track);
        });
    }

    const themesArea = trackEl(track, 'themes_textarea');
    if (themesArea) {
        themesArea.addEventListener('input', () => {
            const state = loadChatState(track);
            state.themes = themesArea.value;
            scheduleChatStateSave(track, state);
        });
    }

    const guidanceArea = trackEl(track, 'active_guidance_textarea');
    if (guidanceArea) {
        guidanceArea.addEventListener('input', () => {
            const state = loadChatState(track);
            state.guidance = guidanceArea.value;
            scheduleChatStateSave(track, state);
            reapplyInjection(track);
        });
    }

    trackEl(track, 'decrement_button')?.addEventListener('click', () => {
        const state = loadChatState(track);
        if (state.turnsRemaining > 0) {
            state.turnsRemaining -= 1;
            saveChatState(track, state);
            refreshRemainingDisplay(track, state.turnsRemaining);
        }
    });

    trackEl(track, 'reset_button')?.addEventListener('click', () => {
        const state = loadChatState(track);
        state.turnsRemaining = resolveTurnCount(track);
        saveChatState(track, state);
        refreshRemainingDisplay(track, state.turnsRemaining);
    });

    trackEl(track, 'regenerate_now')?.addEventListener('click', async () => {
        // While running, the regenerate button is the Stop affordance for an
        // active regen. Clicks during a `continue` job are ignored (that
        // button is disabled in the UI).
        if (runtime[track.id].regenInProgress) {
            if (runtime[track.id].activeAction === 'regen') {
                abortAllGenerations('ng-cancel');
                debug(`[${track.id}] Stop requested via regenerate button`);
            }
            return;
        }
        await regenGuidance(track, 'manual');
    });

    trackEl(track, 'continue_now')?.addEventListener('click', async () => {
        if (runtime[track.id].regenInProgress) {
            if (runtime[track.id].activeAction === 'continue') {
                abortAllGenerations('ng-cancel');
                debug(`[${track.id}] Stop requested via continue button`);
            }
            return;
        }
        await continueGuidance(track);
    });

    trackEl(track, 'retry_now')?.addEventListener('click', async () => {
        if (runtime[track.id].regenInProgress) return;
        if (runtime[track.id].lastSnapshot === null) {
            toast('Nothing to retry — no previous generation in this session.', 'warning');
            return;
        }
        const state = loadChatState(track);
        state.guidance = runtime[track.id].lastSnapshot;
        saveChatState(track, state);
        refreshPanelFromState(track);
        reapplyInjection(track);
        await regenGuidance(track, 'retry');
    });

    populateLoreBookPicker(track);
    refreshPanelFromState(track);
    refreshNGActionButtonStates(track);
}

export function bindNarrativeGuidanceSettings(saveSettings) {
    saveSettingsCb = saveSettings;

    for (const track of NG_TRACK_LIST) {
        bindTrackControls(track, saveSettings);
    }

    // Shared (non per-track) controls.
    const debugCb = document.getElementById('ng_debug_mode');
    if (debugCb) {
        debugCb.checked = !!moduleSettings.narrativeGuidanceDebugMode;
        debugCb.addEventListener('change', () => {
            moduleSettings.narrativeGuidanceDebugMode = debugCb.checked;
            saveSettings();
        });
    }
}

// ─── Settings Migration ───

// Legacy single-track NG settings keys → short-term track keys. Run once on
// load so users keep their customized prompts, cadence and lore-book picks
// after the long/short split (existing guidance maps to short-term too).
const NG_LEGACY_SETTING_SUFFIXES = [
    'Enabled', 'AutoRegen', 'Prompt', 'GenerationPrompt', 'InjectionPrompt',
    'DefaultTurnCount', 'ResponseLength', 'MaxContextOverride',
    'InjectionDepth', 'InjectionRole', 'LoreBookNames',
];

/**
 * Migrate pre-split NG settings (and any `ng` tool-preset bundle) onto the
 * short-term track. Idempotent: keyed off the presence of legacy keys.
 *
 * @param {object} settings - Shared mutable settings reference.
 * @returns {boolean} `true` if anything changed (caller should save settings).
 */
export function migrateNarrativeGuidanceSettings(settings) {
    let changed = false;

    for (const suffix of NG_LEGACY_SETTING_SUFFIXES) {
        const legacyKey = `narrativeGuidance${suffix}`;
        const shortKey = `narrativeGuidanceShort${suffix}`;
        // A legacy key only survives on a pre-split saved blob, where the
        // short-track key was never persisted (it's still at the merged-in
        // default). So copy unconditionally — the default would otherwise
        // mask the user's real value.
        if (settings[legacyKey] !== undefined) {
            settings[shortKey] = settings[legacyKey];
            delete settings[legacyKey];
            changed = true;
        }
    }

    // Carry named NG presets over to the short-term tool, renaming the bundled
    // field keys (the long-term tool starts with just its Default).
    const presets = settings.toolPresets;
    if (presets && typeof presets === 'object' && presets.ng && !presets['ng-short']) {
        const fieldRename = {
            narrativeGuidancePrompt: 'narrativeGuidanceShortPrompt',
            narrativeGuidanceGenerationPrompt: 'narrativeGuidanceShortGenerationPrompt',
            narrativeGuidanceInjectionPrompt: 'narrativeGuidanceShortInjectionPrompt',
        };
        const migrated = {};
        for (const [name, bundle] of Object.entries(presets.ng)) {
            if (!bundle || typeof bundle !== 'object') continue;
            const next = {};
            for (const [oldKey, value] of Object.entries(bundle)) {
                next[fieldRename[oldKey] || oldKey] = value;
            }
            migrated[name] = next;
        }
        presets['ng-short'] = migrated;
        delete presets.ng;
        if (settings.activeToolPreset && typeof settings.activeToolPreset === 'object') {
            if (settings.activeToolPreset.ng !== undefined) {
                settings.activeToolPreset['ng-short'] = settings.activeToolPreset.ng;
                delete settings.activeToolPreset.ng;
            }
        }
        changed = true;
    }

    return changed;
}

// ─── Init ───

/**
 * @param {object} options
 * @param {object} options.settings - Shared mutable settings reference.
 */
export function initNarrativeGuidance({ settings }) {
    moduleSettings = settings;
    debug = createDebugLogger('NG', () => moduleSettings.narrativeGuidanceDebugMode);
    debug('Module initialized');
}
