/**
 * Narrative Guidance module — periodically asks the LLM to produce a short
 * paragraph of story guidance based on the current chat / character / lore
 * context, then injects that paragraph as a system prompt before every AI
 * turn until a per-chat turn counter expires, at which point it regenerates.
 *
 * Per-chat state (active guidance, remaining turns, themes) lives in
 * `context.chatMetadata.narrativeGuidance`. Prompt templates and the
 * default turn count live in extension settings.
 */

import {
    setExtensionPrompt,
    extension_prompt_types,
    extension_prompt_roles,
    substituteParams,
} from '../../../../../script.js';
import { removeReasoningFromString } from '../../../../reasoning.js';
import {
    getContext,
    createDebugLogger,
    toast,
    buildContextPreamble,
    getAvailableLoreBookNames,
    streamingGenerate,
    withSingleLineDisabled,
} from './utils.js';
import {
    isSilentGenerationAbort,
    abortAllGenerations,
} from './silent-generation.js';
import { setupPromptTemplates } from './prompt-templates.js';

// ─── Constants ───

const NG_INJECTION_KEY = 'narrative_guidance';
const NG_METADATA_KEY = 'narrativeGuidance';

export const DEFAULT_NG_GENERATION_PROMPT =
    '[The following paragraph is based on the given context, and will guide the actions of the characters for the next several turns:';

export const DEFAULT_NG_INJECTION_PROMPT =
    '[Guide the story in the following direction: {{guidance}}]';

export const DEFAULT_NG_TURN_COUNT = 10;
export const DEFAULT_NG_INJECTION_DEPTH = 0;
export const DEFAULT_NG_INJECTION_ROLE = 'system';
export const DEFAULT_NG_RESPONSE_LENGTH = 400;

// ─── Module State ───

let moduleSettings = null;
let saveSettingsCb = null;
let debug = () => {};
let regenInProgress = false;
// Which action is currently running: 'regen' | 'continue' | null.
// Used to swap the active button to Stop and route its click to cancel.
let ngActiveAction = null;
let ngLastGuidanceSnapshot = null; // guidance text before last regen, for Retry
let saveTimer = null;

// ─── Per-chat State ───

function loadChatState() {
    const context = getContext();
    const raw = context.chatMetadata?.[NG_METADATA_KEY];
    return {
        guidance: typeof raw?.guidance === 'string' ? raw.guidance : '',
        turnsRemaining: Number.isFinite(raw?.turnsRemaining) ? raw.turnsRemaining : 0,
        themes: typeof raw?.themes === 'string' ? raw.themes : '',
    };
}

function saveChatState(state) {
    const context = getContext();
    context.chatMetadata[NG_METADATA_KEY] = {
        guidance: state.guidance || '',
        turnsRemaining: Number.isFinite(state.turnsRemaining) ? state.turnsRemaining : 0,
        themes: state.themes || '',
    };
    context.saveMetadata();
}

function scheduleChatStateSave(state) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        saveTimer = null;
        saveChatState(state);
    }, 200);
}

// ─── Injection ───

function clearInjection() {
    setExtensionPrompt(NG_INJECTION_KEY, '', extension_prompt_types.NONE, 0);
}

function reapplyInjection() {
    if (!moduleSettings?.narrativeGuidanceEnabled) {
        clearInjection();
        return;
    }
    const state = loadChatState();
    if (!state.guidance) {
        clearInjection();
        return;
    }
    const tpl = moduleSettings.narrativeGuidanceInjectionPrompt || DEFAULT_NG_INJECTION_PROMPT;
    // state.guidance retains the generation prefill (so the textarea shows
    // it). Strip outer brackets here so {{guidance}} substitutes cleanly
    // into whatever injection template the user has configured.
    const guidanceForInjection = stripBracketWrap(state.guidance);
    let body = tpl.replace(/\{\{guidance\}\}/g, guidanceForInjection);
    body = substituteParams(body);
    const depth = Number.isFinite(moduleSettings.narrativeGuidanceInjectionDepth)
        && moduleSettings.narrativeGuidanceInjectionDepth >= 0
        ? moduleSettings.narrativeGuidanceInjectionDepth
        : 0;
    const role = resolveInjectionRole(moduleSettings.narrativeGuidanceInjectionRole);
    setExtensionPrompt(
        NG_INJECTION_KEY,
        body,
        extension_prompt_types.IN_CHAT,
        depth,
        false,
        role,
    );
    debug('Injected guidance — depth:', depth, 'role:', moduleSettings.narrativeGuidanceInjectionRole, 'body length:', body.length);
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

async function regenGuidance(reason) {
    if (regenInProgress) {
        debug('regenGuidance — skipped (already running)');
        return;
    }
    if (!moduleSettings?.narrativeGuidanceEnabled) {
        debug('regenGuidance — skipped (disabled)');
        return;
    }

    // Snapshot current guidance before overwriting so Retry can restore it.
    const preRegenState = loadChatState();
    ngLastGuidanceSnapshot = preRegenState.guidance || '';

    regenInProgress = true;
    ngActiveAction = 'regen';
    setNGActionButtonsRunning(true);
    clearInjection();
    debug('regenGuidance — starting, reason:', reason);

    try {
        const responseLength = Number.isFinite(moduleSettings.narrativeGuidanceResponseLength)
            && moduleSettings.narrativeGuidanceResponseLength > 0
            ? moduleSettings.narrativeGuidanceResponseLength
            : DEFAULT_NG_RESPONSE_LENGTH;
        const state = loadChatState();
        const preamble = await buildContextPreamble({
            includeChat: true,
            loreBookNames: Array.isArray(moduleSettings.narrativeGuidanceLoreBookNames)
                ? moduleSettings.narrativeGuidanceLoreBookNames
                : [],
            responseLength,
            maxContextOverride: moduleSettings.narrativeGuidanceMaxContextOverride || 0,
        });

        const themesBlock = state.themes && state.themes.trim()
            ? `Themes / story arcs to weave in:\n${state.themes.trim()}\n\n`
            : '';

        const preambleBlock = preamble
            ? `Existing context to consider when generating (do not repeat verbatim):\n${preamble}\n\n`
            : '';

        const prefill = moduleSettings.narrativeGuidanceGenerationPrompt
            || DEFAULT_NG_GENERATION_PROMPT;

        const userPrompt =
            `${preambleBlock}${themesBlock}` +
            'Continue the bracketed paragraph below. Output a single short paragraph ' +
            '(2–4 sentences) proposing where the story should head over the next several turns. ' +
            'Describe direction, mood, complications, and beats — not direct dialogue or scene actions. ' +
            'Close the bracket when done.';

        const systemPrompt =
            'You are a story-direction assistant. Output only a single short paragraph ' +
            'of narrative guidance in the requested bracketed format. ' +
            'No commentary, no preamble, no explanations.';

        debug('System prompt:', systemPrompt);
        debug('User prompt length:', userPrompt.length);
        debug('Prefill:', prefill);

        const guidanceArea = document.getElementById('ng_active_guidance_textarea');
        const raw = await withSingleLineDisabled(() => streamingGenerate(
            { prompt: userPrompt, systemPrompt, responseLength, prefill },
            guidanceArea,
            { append: false },
        ));

        // Preserve the prefill in the stored guidance so the active-guidance
        // textarea shows prefill + model output as one block. The bracket
        // wrappers are stripped only at injection time (see reapplyInjection)
        // so the injected payload doesn't end up nested inside two brackets.
        const cleaned = removeReasoningFromString(raw).trim();
        if (!cleaned) {
            throw new Error('Model returned empty guidance.');
        }

        state.guidance = (prefill || '') + cleaned;
        const defaultTurns = Number.isFinite(moduleSettings.narrativeGuidanceDefaultTurnCount)
            && moduleSettings.narrativeGuidanceDefaultTurnCount > 0
            ? moduleSettings.narrativeGuidanceDefaultTurnCount
            : DEFAULT_NG_TURN_COUNT;
        state.turnsRemaining = defaultTurns;
        saveChatState(state);

        refreshPanelFromState();
        reapplyInjection();
        toast('Narrative guidance regenerated.', 'success');
        debug('regenGuidance — complete, length:', cleaned.length);
    } catch (err) {
        if (isSilentGenerationAbort(err)) {
            debug('regenGuidance — cancelled by user');
        } else {
            console.error('Narrative Guidance generation error:', err);
            toast(`Narrative guidance failed: ${err.message}`, 'error');
        }
        // Restore whatever injection we had before clearing.
        reapplyInjection();
    } finally {
        regenInProgress = false;
        ngActiveAction = null;
        setNGActionButtonsRunning(false);
    }
}

async function continueGuidance() {
    if (regenInProgress) {
        debug('continueGuidance — skipped (already running)');
        return;
    }
    if (!moduleSettings?.narrativeGuidanceEnabled) {
        debug('continueGuidance — skipped (disabled)');
        return;
    }
    const state = loadChatState();
    if (!state.guidance) {
        toast('No active guidance to continue. Regenerate first.', 'warning');
        return;
    }

    regenInProgress = true;
    ngActiveAction = 'continue';
    setNGActionButtonsRunning(true);
    debug('continueGuidance — starting');

    try {
        const responseLength = Number.isFinite(moduleSettings.narrativeGuidanceResponseLength)
            && moduleSettings.narrativeGuidanceResponseLength > 0
            ? moduleSettings.narrativeGuidanceResponseLength
            : DEFAULT_NG_RESPONSE_LENGTH;

        const continuePrompt =
            `The following narrative guidance paragraph is in progress:\n\n${state.guidance}\n\n` +
            'Continue this paragraph seamlessly from where it left off. ' +
            'Add 1–2 sentences extending the story direction, mood, or complications. ' +
            'Do not repeat existing text. Output only the continuation — no brackets, no preamble.';

        const systemPrompt =
            'You are a story-direction assistant. Output only the continuation of the guidance. ' +
            'No commentary, no preamble, no explanations.';

        debug('Continue prompt length:', continuePrompt.length);

        const guidanceArea = document.getElementById('ng_active_guidance_textarea');
        const raw = await withSingleLineDisabled(() => streamingGenerate(
            { prompt: continuePrompt, systemPrompt, responseLength },
            guidanceArea,
            { append: true },
        ));

        const continuation = removeReasoningFromString(raw).trim();
        if (!continuation) throw new Error('Model returned empty continuation.');

        ngLastGuidanceSnapshot = state.guidance;
        const sep = state.guidance.endsWith(' ') || continuation.startsWith(' ') ? '' : ' ';
        state.guidance = state.guidance + sep + continuation;
        saveChatState(state);

        refreshPanelFromState();
        reapplyInjection();
        toast('Narrative guidance continued.', 'success');
        debug('continueGuidance — complete, added length:', continuation.length);
    } catch (err) {
        if (isSilentGenerationAbort(err)) {
            debug('continueGuidance — cancelled by user');
        } else {
            console.error('Narrative Guidance continue error:', err);
            toast(`Continue failed: ${err.message}`, 'error');
        }
    } finally {
        regenInProgress = false;
        ngActiveAction = null;
        setNGActionButtonsRunning(false);
        refreshNGActionButtonStates();
    }
}

// ─── Event Handlers ───

export function onNarrativeGuidanceChatChanged() {
    refreshPanelFromState();
    reapplyInjection();
    debug('Chat changed, state reloaded');
}

export async function onNarrativeGuidanceMessageSent(_messageIndex) {
    if (!moduleSettings?.narrativeGuidanceEnabled) return;
    if (regenInProgress) return;
    if (!moduleSettings.narrativeGuidanceAutoRegen) {
        reapplyInjection();
        return;
    }
    const state = loadChatState();
    if (!state.guidance) {
        // First-turn bootstrap: block briefly so the next AI turn sees guidance.
        await regenGuidance('no guidance yet');
    } else {
        reapplyInjection();
    }
}

export function onNarrativeGuidanceMessageReceived(messageIndex) {
    if (!moduleSettings?.narrativeGuidanceEnabled) return;
    if (regenInProgress) return;
    const ctx = getContext();
    const idx = typeof messageIndex === 'number' ? messageIndex : ctx.chat.length - 1;
    const msg = ctx.chat?.[idx];
    if (!msg) return;
    if (msg.is_user || msg.is_system) return;
    if (msg.extra?.narrativeGuidanceCounted) return;

    const state = loadChatState();
    if (state.turnsRemaining > 0) {
        state.turnsRemaining -= 1;
        saveChatState(state);
        refreshRemainingDisplay(state.turnsRemaining);
    }
    msg.extra = { ...(msg.extra || {}), narrativeGuidanceCounted: true };
    debug('Counter decremented, turnsRemaining:', state.turnsRemaining);

    if (state.turnsRemaining <= 0 && moduleSettings.narrativeGuidanceAutoRegen) {
        // Fire-and-forget so the new guidance is in place before the user's next send.
        regenGuidance('counter expired').catch(err => {
            console.error('Narrative Guidance auto-regen failed:', err);
        });
    }
}

// ─── Settings Panel ───

function refreshRemainingDisplay(remaining) {
    const display = document.getElementById('ng_remaining_display');
    if (display) display.textContent = String(remaining);
}

function refreshPanelFromState() {
    const state = loadChatState();
    const themesArea = document.getElementById('ng_themes_textarea');
    if (themesArea && document.activeElement !== themesArea) {
        themesArea.value = state.themes || '';
    }
    const guidanceArea = document.getElementById('ng_active_guidance_textarea');
    if (guidanceArea && document.activeElement !== guidanceArea) {
        guidanceArea.value = state.guidance || '';
    }
    refreshRemainingDisplay(state.turnsRemaining);
    refreshNGActionButtonStates();
}

// Original button HTML, captured so we can restore it when leaving the
// generating state.
const NG_REGEN_BTN_HTML = '<span class="ng-regen-icon fa-solid fa-wand-sparkles"></span> Regenerate Now';
const NG_CONTINUE_BTN_HTML = '<span class="fa-solid fa-arrow-right"></span> Continue';
const NG_STOP_BTN_HTML = '<span class="fa-solid fa-stop"></span> Stop';

function setNGActionButtonsRunning(running) {
    const regenBtn = document.getElementById('ng_regenerate_now');
    const continueBtn = document.getElementById('ng_continue_now');
    const retryBtn = document.getElementById('ng_retry_now');

    if (running) {
        // Active button becomes Stop; the others get the disabled class so the
        // user can't fire off a second job mid-flight.
        if (ngActiveAction === 'continue') {
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

function refreshNGActionButtonStates() {
    if (regenInProgress) return;
    const state = loadChatState();
    document.getElementById('ng_retry_now')
        ?.classList.toggle('disabled', ngLastGuidanceSnapshot === null);
    document.getElementById('ng_continue_now')
        ?.classList.toggle('disabled', !(state.guidance && state.guidance.trim()));
}

function populateLoreBookPicker() {
    const picker = document.getElementById('ng_lorebooks_details');
    const list = document.getElementById('ng_lorebooks_list');
    const summaryLabel = document.getElementById('ng_lorebooks_summary_label');
    if (!picker || !list || !summaryLabel) return;

    const updateSummary = () => {
        const checked = list.querySelectorAll('input[type="checkbox"]:checked').length;
        summaryLabel.textContent = checked > 0 ? `Lore Books (${checked})` : 'Lore Books';
    };

    const writeSelectionToSettings = () => {
        const names = Array.from(list.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => cb.value);
        moduleSettings.narrativeGuidanceLoreBookNames = names;
        saveSettingsCb?.();
    };

    const render = () => {
        const names = getAvailableLoreBookNames();
        const previouslyChecked = new Set(
            Array.isArray(moduleSettings.narrativeGuidanceLoreBookNames)
                ? moduleSettings.narrativeGuidanceLoreBookNames
                : [],
        );
        list.innerHTML = '';
        if (!names.length) {
            const empty = document.createElement('div');
            empty.className = 'ng-lorebook-empty';
            empty.textContent = 'No lore books available.';
            list.appendChild(empty);
            updateSummary();
            return;
        }
        for (const name of names) {
            const label = document.createElement('label');
            label.className = 'ng-lorebook-item checkbox_label';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = name;
            if (previouslyChecked.has(name)) cb.checked = true;
            cb.addEventListener('change', () => {
                writeSelectionToSettings();
                updateSummary();
            });
            const span = document.createElement('span');
            span.textContent = name;
            label.appendChild(cb);
            label.appendChild(span);
            list.appendChild(label);
        }
        updateSummary();
    };

    picker.addEventListener('toggle', () => {
        if (picker.open) render();
    });

    render();
}

export function bindNarrativeGuidanceSettings(saveSettings) {
    saveSettingsCb = saveSettings;

    const enabledCb = document.getElementById('ng_enabled');
    if (enabledCb) {
        enabledCb.checked = !!moduleSettings.narrativeGuidanceEnabled;
        enabledCb.addEventListener('change', () => {
            moduleSettings.narrativeGuidanceEnabled = enabledCb.checked;
            saveSettings();
            if (moduleSettings.narrativeGuidanceEnabled) {
                reapplyInjection();
            } else {
                clearInjection();
            }
        });
    }

    const autoRegenCb = document.getElementById('ng_auto_regen');
    if (autoRegenCb) {
        autoRegenCb.checked = !!moduleSettings.narrativeGuidanceAutoRegen;
        autoRegenCb.addEventListener('change', () => {
            moduleSettings.narrativeGuidanceAutoRegen = autoRegenCb.checked;
            saveSettings();
        });
    }

    const debugCb = document.getElementById('ng_debug_mode');
    if (debugCb) {
        debugCb.checked = !!moduleSettings.narrativeGuidanceDebugMode;
        debugCb.addEventListener('change', () => {
            moduleSettings.narrativeGuidanceDebugMode = debugCb.checked;
            saveSettings();
        });
    }

    const turnCountInput = document.getElementById('ng_default_turn_count');
    if (turnCountInput) {
        turnCountInput.value = moduleSettings.narrativeGuidanceDefaultTurnCount || DEFAULT_NG_TURN_COUNT;
        turnCountInput.addEventListener('input', () => {
            const n = parseInt(turnCountInput.value, 10);
            if (Number.isFinite(n) && n > 0) {
                moduleSettings.narrativeGuidanceDefaultTurnCount = n;
                saveSettings();
            }
        });
    }

    const responseLengthInput = document.getElementById('ng_response_length');
    if (responseLengthInput) {
        responseLengthInput.value = moduleSettings.narrativeGuidanceResponseLength || DEFAULT_NG_RESPONSE_LENGTH;
        responseLengthInput.addEventListener('input', () => {
            const n = parseInt(responseLengthInput.value, 10);
            if (Number.isFinite(n) && n > 0) {
                moduleSettings.narrativeGuidanceResponseLength = n;
                saveSettings();
            }
        });
    }

    const maxContextInput = document.getElementById('ng_max_context_override');
    if (maxContextInput) {
        maxContextInput.value = moduleSettings.narrativeGuidanceMaxContextOverride || 0;
        maxContextInput.addEventListener('input', () => {
            const n = parseInt(maxContextInput.value, 10);
            moduleSettings.narrativeGuidanceMaxContextOverride = Number.isFinite(n) && n > 0 ? n : 0;
            saveSettings();
        });
    }

    const genArea = document.getElementById('ng_generation_prompt_textarea');
    if (genArea) {
        genArea.value = moduleSettings.narrativeGuidanceGenerationPrompt || DEFAULT_NG_GENERATION_PROMPT;
        genArea.addEventListener('input', () => {
            moduleSettings.narrativeGuidanceGenerationPrompt = genArea.value;
            saveSettings();
        });
    }

    setupPromptTemplates({
        promptKey: 'narrativeGuidanceGenerationPrompt',
        defaultText: DEFAULT_NG_GENERATION_PROMPT,
        textareaId: 'ng_generation_prompt_textarea',
        containerId: 'ng_generation_prompt_templates',
        settings: moduleSettings,
        saveSettings,
    });

    const injectArea = document.getElementById('ng_injection_prompt_textarea');
    if (injectArea) {
        injectArea.value = moduleSettings.narrativeGuidanceInjectionPrompt || DEFAULT_NG_INJECTION_PROMPT;
        injectArea.addEventListener('input', () => {
            const value = injectArea.value;
            moduleSettings.narrativeGuidanceInjectionPrompt = value;
            saveSettings();
            if (value.trim() && !value.includes('{{guidance}}')) {
                toast('Warning: Injection template lacks {{guidance}}; the AI won\'t see the guidance text.', 'warning');
            }
            reapplyInjection();
        });
    }

    setupPromptTemplates({
        promptKey: 'narrativeGuidanceInjectionPrompt',
        defaultText: DEFAULT_NG_INJECTION_PROMPT,
        textareaId: 'ng_injection_prompt_textarea',
        containerId: 'ng_injection_prompt_templates',
        settings: moduleSettings,
        saveSettings,
    });

    const depthInput = document.getElementById('ng_injection_depth');
    if (depthInput) {
        const initialDepth = Number.isFinite(moduleSettings.narrativeGuidanceInjectionDepth)
            ? moduleSettings.narrativeGuidanceInjectionDepth
            : DEFAULT_NG_INJECTION_DEPTH;
        depthInput.value = initialDepth;
        depthInput.addEventListener('input', () => {
            const n = parseInt(depthInput.value, 10);
            if (Number.isFinite(n) && n >= 0) {
                moduleSettings.narrativeGuidanceInjectionDepth = n;
                saveSettings();
                reapplyInjection();
            }
        });
    }

    const roleSelect = document.getElementById('ng_injection_role');
    if (roleSelect) {
        roleSelect.value = moduleSettings.narrativeGuidanceInjectionRole || DEFAULT_NG_INJECTION_ROLE;
        roleSelect.addEventListener('change', () => {
            moduleSettings.narrativeGuidanceInjectionRole = roleSelect.value;
            saveSettings();
            reapplyInjection();
        });
    }

    const themesArea = document.getElementById('ng_themes_textarea');
    if (themesArea) {
        themesArea.addEventListener('input', () => {
            const state = loadChatState();
            state.themes = themesArea.value;
            scheduleChatStateSave(state);
        });
    }

    const guidanceArea = document.getElementById('ng_active_guidance_textarea');
    if (guidanceArea) {
        guidanceArea.addEventListener('input', () => {
            const state = loadChatState();
            state.guidance = guidanceArea.value;
            scheduleChatStateSave(state);
            reapplyInjection();
        });
    }

    document.getElementById('ng_decrement_button')?.addEventListener('click', () => {
        const state = loadChatState();
        if (state.turnsRemaining > 0) {
            state.turnsRemaining -= 1;
            saveChatState(state);
            refreshRemainingDisplay(state.turnsRemaining);
        }
    });

    document.getElementById('ng_reset_button')?.addEventListener('click', () => {
        const state = loadChatState();
        state.turnsRemaining = moduleSettings.narrativeGuidanceDefaultTurnCount || DEFAULT_NG_TURN_COUNT;
        saveChatState(state);
        refreshRemainingDisplay(state.turnsRemaining);
    });

    document.getElementById('ng_regenerate_now')?.addEventListener('click', async () => {
        // While running, the regenerate button is the Stop affordance for an
        // active regen. Clicks during a `continue` job are ignored (that
        // button is disabled in the UI).
        if (regenInProgress) {
            if (ngActiveAction === 'regen') {
                abortAllGenerations('ng-cancel');
                debug('Stop requested via regenerate button');
            }
            return;
        }
        await regenGuidance('manual');
    });

    document.getElementById('ng_continue_now')?.addEventListener('click', async () => {
        if (regenInProgress) {
            if (ngActiveAction === 'continue') {
                abortAllGenerations('ng-cancel');
                debug('Stop requested via continue button');
            }
            return;
        }
        await continueGuidance();
    });

    document.getElementById('ng_retry_now')?.addEventListener('click', async () => {
        if (regenInProgress) return;
        if (ngLastGuidanceSnapshot === null) {
            toast('Nothing to retry — no previous generation in this session.', 'warning');
            return;
        }
        const state = loadChatState();
        state.guidance = ngLastGuidanceSnapshot;
        saveChatState(state);
        refreshPanelFromState();
        reapplyInjection();
        await regenGuidance('retry');
    });

    populateLoreBookPicker();
    refreshPanelFromState();
    refreshNGActionButtonStates();
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
