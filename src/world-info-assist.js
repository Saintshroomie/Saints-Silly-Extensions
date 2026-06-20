/**
 * World Info Assist (WIA)
 *
 * Adds an LLM-driven Assist button to every World Info / Lore book entry
 * form. Each entry gets its own button row above the content textarea
 * with Assist, Continue, Retry, and Revert controls — mirroring the
 * Assisted Character Creation tool, but operating on a single field
 * (the entry's content) and using a free-form prompt instead of a schema.
 */

import { substituteParamsExtended } from '../../../../../script.js';
import { removeReasoningFromString } from '../../../../reasoning.js';
import {
    getContext,
    createDebugLogger,
    toast,
    buildContextPreamble,
    createLoreBookPicker,
    streamingGenerate,
    withSingleLineDisabled,
    applyTemplateMacros,
    stripPrefillEcho,
    showPromptPreview,
    getCurrentWorldEditorName,
    getEntryUidFromForm,
    readWIAEntryGuidance,
    saveWIAEntryGuidanceDebounced,
    flushWIAEntryGuidanceSave,
} from './utils.js';
import {
    isSilentGenerationAbort,
    abortAllGenerations,
} from './silent-generation.js';

// ─── Default Prompt ───

// {{context}} and {{guidance}} are this extension's placeholders
// (substituted by applyTemplateMacros). If a placeholder is removed, the
// block is prepended/appended automatically. {{title}} is also available.
export const DEFAULT_WIA_PROMPT = `{{context}}[
The next reply will be an out-of-story World Lore Description: a setting reference entry codifying key facts about an event, person, place, institution, or artifact so they remain consistent and reusable.

Write as a worldbook gazetteer entry, NOT as a story excerpt. Treat the reader as a setting researcher who needs canonical facts, not a vivid scene.

General Input Rules:
* Guidance (optional): IP/canon, tone/genre, tags, audience, era, length, style notes.

Defaults:
* Voice: Encyclopedic reference style. Declarative facts. No narration, no metaphor, no in-character voice.
* Tone: Genre-appropriate but neutral.
* Canon: Respect canon when named or implied.
* Length: 1–3 crisp sentences per entry (unless the user requests more).

Output Format (use exactly as written):
[ <Name of the Subject>: <Detailed factual description — type, founders/origin/dates, function/purpose, defining properties, current status> ]

Format Rules:
* Return only the World Lore Description artifact.
* Follow schema verbatim (brackets, colon, spacing).
* No extra commentary.

Anti-patterns — do NOT write like a story:
* No narrative verbs ("rose", "fell", "swept across", "fueled", "burned bright").
* No dramatic phrasing ("…and so it was that…", "fueling a decade of…").
* No metaphor ("a kingdom of glass and ash", "a serpent of a road").
* No in-character voice or address to the reader.
* No multi-clause story arcs strung with semicolons; favor noun phrases and short factual clauses.

Example — World Lore:
[ The Ashen Concord: Five-member city-state pact, signed 47 AB after the Ember War; covers river-trade routes, standardized coinage (the Concord drachma), and a continent-wide ban on pyromancy; enforcement body is the Cinder Court at Vellis; pyromancers operate covertly as the Hedge League; remains nominally active but strained by ongoing arson reprisals. ]
]

Guidance from the user:
{{guidance}}`;

const WIA_SYSTEM_PROMPT =
    'You are a world-building assistant. Output only the requested '
    + 'World Lore Description in the exact bracketed format described. '
    + 'No commentary, no preamble, no explanations.';

// Prefills are configured as named templates (like prompts). They are passed
// to the model as an assistant-prefix so the reply continues from them, and
// are also prepended to the final text inserted into the entry field on
// success — the user sees prefill + model output as one block.
export const DEFAULT_WIA_PREFILL_TITLED =
    '[Factual world-lore reference entry — encyclopedic, declarative, no narrative voice.\n\n{{title}}: ';

export const DEFAULT_WIA_PREFILL_UNTITLED =
    '[Factual world-lore reference entry — encyclopedic, declarative, no narrative voice.\n\n';

export const DEFAULT_WIA_RESPONSE_LENGTH = 600;

// ─── Module State ───

let moduleSettings = null;
let debug = () => {};
let listenersInstalled = false;
let observer = null;
let saveSettingsCb = null;

// Per-entry state, keyed by a stable id derived from the entry uid / DOM element.
// `activeAction` is set to 'assist' or 'continue' while generating so the button
// labels can swap to Stop and clicks can route to cancel rather than re-start.
// Guidance text now lives in its own textarea (and is persisted on the entry's
// `extensions` field), so we no longer track an originalSeed for revert.
const entryStates = new Map(); // id -> { hasGenerated, generating, activeAction }

function getWIAResponseLength() {
    const n = moduleSettings?.wiaResponseLength;
    return (typeof n === 'number' && n > 0) ? n : DEFAULT_WIA_RESPONSE_LENGTH;
}

function resolveWIAPrefill(title) {
    const trimmedTitle = (title || '').trim();
    if (trimmedTitle) {
        const tpl = (typeof moduleSettings?.wiaPrefillTitled === 'string' && moduleSettings.wiaPrefillTitled)
            ? moduleSettings.wiaPrefillTitled
            : DEFAULT_WIA_PREFILL_TITLED;
        return substituteParamsExtended(tpl, { title: trimmedTitle });
    }
    const tpl = (typeof moduleSettings?.wiaPrefillUntitled === 'string' && moduleSettings.wiaPrefillUntitled)
        ? moduleSettings.wiaPrefillUntitled
        : DEFAULT_WIA_PREFILL_UNTITLED;
    return substituteParamsExtended(tpl, {});
}

// ─── Init ───

/**
 * Initialize WIA module. Called once from index.js.
 * @param {object} opts - { settings }
 */
export function initWIA({ settings }) {
    moduleSettings = settings;
    debug = createDebugLogger('WIA', () => moduleSettings.wiaDebugMode);
    debug('Module initialized');
}

// ─── Editor Observation / Injection ───

/**
 * Watch for World Info entry forms appearing in the editor and inject the
 * assist controls. ST does not emit an event when an individual entry is
 * expanded — `displayWorldEntries` mutates the editor list directly — so we
 * use a narrowly-scoped MutationObserver on the editor's entry list
 * container, plus the WORLDINFO_UPDATED event for refresh after saves.
 */
export function startWIAObserver() {
    if (listenersInstalled) return;
    listenersInstalled = true;

    const rescan = () => {
        if (!moduleSettings?.wiaEnabled) return;
        document.querySelectorAll('.world_entry_edit').forEach(injectControls);
    };

    const attachObserver = () => {
        if (observer) return;
        const container = document.getElementById('world_popup_entries_list');
        if (!container) return;
        observer = new MutationObserver((mutations) => {
            if (!moduleSettings?.wiaEnabled) return;
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (!(node instanceof HTMLElement)) continue;
                    if (node.matches?.('.world_entry_edit')) injectControls(node);
                    node.querySelectorAll?.('.world_entry_edit').forEach(injectControls);
                }
            }
        });
        observer.observe(container, { childList: true, subtree: true });
        debug('WI editor observer attached');
    };

    // The editor list isn't in the DOM until the user opens World Info, so
    // try once now and re-try on WI events (which fire after open / save).
    attachObserver();
    const { eventSource, eventTypes } = getContext();
    eventSource.on(eventTypes.WORLDINFO_UPDATED, () => { attachObserver(); rescan(); });
    eventSource.on(eventTypes.WORLDINFO_ENTRIES_LOADED, () => { attachObserver(); rescan(); });

    rescan();
    debug('WI listeners installed');
}

/**
 * Re-scan all currently visible WI forms (used after enable toggle).
 */
export function rescanAllForms() {
    if (!moduleSettings?.wiaEnabled) return;
    document.querySelectorAll('.world_entry_edit').forEach(injectControls);
}

/**
 * Remove all injected controls (used when the feature is disabled). Must
 * cover every element injectControls creates — the controls row, the
 * guidance block, and the content-clear row — or a disable/enable cycle
 * leaves orphans behind and then injects duplicates next to them.
 */
export function removeAllControls() {
    document.querySelectorAll('.wia-controls, .wia-guidance-block, .wia-content-clear-row')
        .forEach(el => el.remove());
}

function injectControls(formEl) {
    if (!moduleSettings?.wiaEnabled) return;
    // Skip the hidden template element that SillyTavern clones from —
    // otherwise the template ends up with baked-in .wia-controls markup
    // that clones inherit without their click handlers, permanently
    // blocking injection on every live entry.
    if (formEl.closest('#entry_edit_template')) return;
    if (formEl.querySelector('.wia-controls')) return;

    const contentTextarea = formEl.querySelector('textarea[name="content"]');
    if (!contentTextarea) return;

    // The label sits immediately before the textarea inside the form control
    // wrapper. We append the controls into the label so they sit on the
    // header line above the textarea.
    const formControl = contentTextarea.closest('.world_entry_form_control');
    if (!formControl) return;

    const id = contentTextarea.id || `wia_${Math.random().toString(36).slice(2)}`;

    const controls = document.createElement('div');
    controls.className = 'wia-controls';
    controls.dataset.wiaFor = id;
    controls.innerHTML = `
        <div class="wia-btn wia-btn-assist menu_button interactable" title="LLM Assist — generate this World Info entry">
            <span class="fa-solid fa-wand-magic-sparkles"></span>
            <span class="wia-btn-label">Assist</span>
        </div>
        <label class="wia-context-toggle checkbox_label" title="Prepend the current chat / character context to the generation prompt, and auto-include the chat's relevant World Info entries. The lore-book dropdown adds extra books on top of that.">
            <input type="checkbox" class="wia-context-cb" />
            <span>Use Chat Context</span>
        </label>
        <div class="wia-lorebook-host"></div>
        <div class="wia-btn wia-btn-continue menu_button interactable wia-hidden" title="Continue generation from where it left off">
            <span class="fa-solid fa-arrow-right"></span>
        </div>
        <div class="wia-btn wia-btn-retry menu_button interactable wia-hidden" title="Retry using your saved guidance">
            <span class="fa-solid fa-rotate-right"></span>
        </div>
        <div class="wia-spinner wia-hidden" title="Generating..."><span class="fa-solid fa-spinner fa-spin"></span></div>
        <div class="wia-tokens-row">
            <label class="wia-tokens-label"><span class="fa-solid fa-coins"></span> Max Tokens:</label>
            <input type="number" class="text_pole wia-tokens-input" min="50" max="8192" step="50" />
        </div>
    `;

    // Insert at the very top of the content form control so it's clearly
    // visible above both the label and textarea.
    formControl.insertBefore(controls, formControl.firstChild);

    // Build the dedicated guidance section (user's prompt for the assist).
    // It sits between the control row and the entry's content textarea so
    // it's clearly the *input* and the content textarea is the *output*.
    const guidanceBlock = document.createElement('div');
    guidanceBlock.className = 'wia-guidance-block';
    guidanceBlock.innerHTML = `
        <div class="wia-guidance-header">
            <label class="wia-guidance-label" title="Free-form guidance for the LLM. Saved on the entry — persists across page reloads.">
                <span class="fa-solid fa-pen"></span> Assist Guidance
            </label>
            <div class="wia-btn wia-btn-clear-guidance menu_button interactable" title="Clear the guidance field (the field below)">
                <span class="fa-solid fa-eraser"></span> Clear Guidance
            </div>
        </div>
        <textarea class="text_pole wia-guidance-textarea" rows="3"
            placeholder="What should this entry be about? Tone, era, faction, key facts..."></textarea>
    `;
    // Insert after the controls row, before the original label/textarea.
    controls.insertAdjacentElement('afterend', guidanceBlock);

    // The content-clear button sits directly above the entry's content
    // textarea (not in the top controls row) so it's unambiguous which
    // field it clears — the guidance field has its own Clear in its header.
    const contentClearRow = document.createElement('div');
    contentClearRow.className = 'wia-content-clear-row';
    contentClearRow.innerHTML = `
        <div class="wia-btn wia-btn-clear-content menu_button interactable" title="Clear this entry's content (the field below)">
            <span class="fa-solid fa-eraser"></span> Clear Content
        </div>
    `;
    contentTextarea.insertAdjacentElement('beforebegin', contentClearRow);

    const guidanceTextarea = guidanceBlock.querySelector('.wia-guidance-textarea');
    const clearGuidanceBtn = guidanceBlock.querySelector('.wia-btn-clear-guidance');
    const assistBtn = controls.querySelector('.wia-btn-assist');
    const continueBtn = controls.querySelector('.wia-btn-continue');
    const retryBtn = controls.querySelector('.wia-btn-retry');
    const clearContentBtn = contentClearRow.querySelector('.wia-btn-clear-content');
    const tokensInput = controls.querySelector('.wia-tokens-input');

    // Wire up persistence for the guidance field — read on mount, save on
    // input (debounced) and on blur (flush).
    const worldName = getCurrentWorldEditorName();
    const uid = getEntryUidFromForm(formEl);
    if (worldName && uid != null) {
        guidanceTextarea.dataset.wiaWorld = worldName;
        guidanceTextarea.dataset.wiaUid = String(uid);
        // Best-effort hydrate. The async read is fire-and-forget; if the
        // user has typed in the meantime, we keep their text.
        readWIAEntryGuidance(worldName, uid).then(saved => {
            if (saved && !guidanceTextarea.value) {
                guidanceTextarea.value = saved;
            }
        }).catch(() => {});
        guidanceTextarea.addEventListener('input', () => {
            saveWIAEntryGuidanceDebounced(worldName, uid, guidanceTextarea.value);
        });
        guidanceTextarea.addEventListener('blur', () => {
            flushWIAEntryGuidanceSave(worldName, uid).catch(() => {});
        });
    }

    assistBtn.addEventListener('click', () => onAssist(formEl, id, false));
    continueBtn.addEventListener('click', () => onAssist(formEl, id, true));
    retryBtn.addEventListener('click', () => onRetry(formEl, id));
    clearGuidanceBtn.addEventListener('click', () => {
        guidanceTextarea.value = '';
        guidanceTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        guidanceTextarea.focus();
    });
    clearContentBtn.addEventListener('click', () => {
        contentTextarea.value = '';
        contentTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        const st = entryStates.get(id);
        if (st) {
            st.hasGenerated = false;
            entryStates.set(id, st);
        }
        setUIState(formEl, 'idle');
        contentTextarea.focus();
    });
    // Keep Continue's visibility in sync with the entry text so a hand-typed
    // entry exposes Continue without needing a throwaway Assist first.
    contentTextarea.addEventListener('input', () => {
        const st = entryStates.get(id);
        if (st?.generating) return;
        setUIState(formEl, st?.hasGenerated ? 'generated' : 'idle');
    });

    if (tokensInput) {
        tokensInput.value = getWIAResponseLength();
        tokensInput.addEventListener('change', () => {
            const n = parseInt(tokensInput.value, 10);
            if (Number.isFinite(n) && n > 0) {
                moduleSettings.wiaResponseLength = n;
                saveSettingsCb?.();
                // Sync all other visible token inputs to the new value.
                document.querySelectorAll('.wia-tokens-input').forEach(el => {
                    if (el !== tokensInput) el.value = n;
                });
            }
        });
    }

    const picker = createLoreBookPicker({ classPrefix: 'wia-lorebook' });
    controls.querySelector('.wia-lorebook-host').replaceWith(picker.element);
    controls._wiaLorebookPicker = picker;

    // Seed initial button visibility from the current content — an entry may
    // load with text already, which should expose Continue immediately.
    const existingState = entryStates.get(id);
    setUIState(formEl, existingState?.hasGenerated ? 'generated' : 'idle');

    debug('Injected controls for entry', id);
}

function readContextOptions(controls) {
    if (!controls) return { includeChat: false, loreBookNames: [] };
    const cb = controls.querySelector('.wia-context-cb');
    const includeChat = !!cb?.checked;
    const picker = controls._wiaLorebookPicker;
    const loreBookNames = picker ? picker.getSelected() : [];
    return { includeChat, loreBookNames };
}

// ─── Helpers ───

function getContentTextarea(formEl) {
    return formEl.querySelector('textarea[name="content"]');
}

function getGuidanceTextarea(formEl) {
    return formEl.querySelector('.wia-guidance-textarea');
}

function readGuidance(formEl) {
    return (getGuidanceTextarea(formEl)?.value || '').trim();
}

function getTitle(formEl) {
    // The title field (textarea[name="comment"]) lives in the entry's
    // inline-drawer header, which is a sibling of `.world_entry_edit` —
    // not a descendant. Walk up to the enclosing form before querying.
    const formRoot = formEl.closest('form.world_entry_form') || formEl.closest('form') || formEl;
    const commentInput = formRoot.querySelector('textarea[name="comment"], input[name="comment"]');
    return commentInput?.value?.trim() || '';
}

// Original button markup, captured so we can restore it when leaving the
// generating state. Keyed by class name.
const WIA_BTN_ORIGINAL_HTML = {
    'wia-btn-assist': '<span class="fa-solid fa-wand-magic-sparkles"></span> <span class="wia-btn-label">Assist</span>',
    'wia-btn-continue': '<span class="fa-solid fa-arrow-right"></span>',
};

const WIA_BTN_STOP_HTML = '<span class="fa-solid fa-stop"></span> <span class="wia-btn-label">Stop</span>';

function setUIState(formEl, state, activeAction = null) {
    const controls = formEl.querySelector('.wia-controls');
    if (!controls) return;
    const assistBtn = controls.querySelector('.wia-btn-assist');
    const continueBtn = controls.querySelector('.wia-btn-continue');
    const retryBtn = controls.querySelector('.wia-btn-retry');
    const spinner = controls.querySelector('.wia-spinner');

    const show = (el, vis) => el && el.classList.toggle('wia-hidden', !vis);
    const restoreBtn = (btn, key) => {
        if (btn && WIA_BTN_ORIGINAL_HTML[key]) btn.innerHTML = WIA_BTN_ORIGINAL_HTML[key];
    };

    if (state === 'idle') {
        restoreBtn(assistBtn, 'wia-btn-assist');
        restoreBtn(continueBtn, 'wia-btn-continue');
        show(assistBtn, true);
        // Continue is available whenever the entry has text to pick up from —
        // including text typed or pasted by hand, with no prior generation.
        // (Retry re-runs Assist, so it stays gated on an actual generation.)
        show(continueBtn, !!getContentTextarea(formEl)?.value?.trim());
        show(retryBtn, false);
        show(spinner, false);
    } else if (state === 'generating') {
        // Keep the active button visible and swap its content to a Stop
        // affordance. Hide the others so the user can't accidentally
        // re-trigger them mid-generation.
        const isContinue = activeAction === 'continue';
        if (isContinue) {
            restoreBtn(assistBtn, 'wia-btn-assist');
            if (continueBtn) continueBtn.innerHTML = WIA_BTN_STOP_HTML;
            show(assistBtn, false);
            show(continueBtn, true);
        } else {
            restoreBtn(continueBtn, 'wia-btn-continue');
            if (assistBtn) assistBtn.innerHTML = WIA_BTN_STOP_HTML;
            show(assistBtn, true);
            show(continueBtn, false);
        }
        show(retryBtn, false);
        show(spinner, false);
    } else if (state === 'generated') {
        restoreBtn(assistBtn, 'wia-btn-assist');
        restoreBtn(continueBtn, 'wia-btn-continue');
        show(assistBtn, false);
        show(continueBtn, true);
        show(retryBtn, true);
        show(spinner, false);
    }
}

// ─── Generation ───

function getWIAPromptTemplate() {
    return (moduleSettings?.wiaPrompt && moduleSettings.wiaPrompt.trim())
        ? moduleSettings.wiaPrompt
        : DEFAULT_WIA_PROMPT;
}

/**
 * Assemble the Assist/Continue user prompt. {{context}} / {{guidance}} /
 * {{title}} are substituted in place; when context or guidance placeholders
 * are absent the blocks are added the old way (context prepended, guidance
 * appended) so legacy templates keep working unchanged. The mode-specific
 * tail (prefill pointer or entry-so-far + continuation instructions) is
 * always appended.
 */
function composeWIAPrompt({ preambleBlock, seed, title, isContinue }) {
    const guidanceValue = seed
        || (isContinue ? '(none provided)' : '(no specific guidance — invent a fitting entry)');
    const { text, used } = applyTemplateMacros(getWIAPromptTemplate(), {
        context: preambleBlock || '',
        guidance: guidanceValue,
        title: (title || '').trim(),
    });
    let prompt = text;
    if (!used.has('context') && preambleBlock) prompt = preambleBlock + prompt;
    if (!used.has('guidance')) prompt = `${prompt}\n\nGuidance from the user:\n${guidanceValue}`;

    if (isContinue) {
        // The entry-so-far is sent as the assistant prefill (true positional
        // continuation, like ST's native Continue), so it is not embedded here.
        return `${prompt}\n\nYour reply has been prefilled with the entry so far. ` +
            'Continue seamlessly from exactly where it stops — do not repeat any existing text. ' +
            'Maintain the bracketed format and close the bracket when the entry is complete.';
    }
    return `${prompt}\n\n` + (title
        ? `Write the entry for "${title}". The reply has been prefilled with the opening bracket, a tone anchor, and the subject name — continue from where the prefill ends with the factual description, then close the bracket.`
        : 'No title was provided — invent a fitting subject name. The reply has been prefilled with the opening bracket and a tone anchor — continue from where the prefill ends with the subject name, colon, factual description, then close the bracket.');
}

async function onAssist(formEl, id, isContinue) {
    const state = entryStates.get(id)
        || { hasGenerated: false, generating: false, activeAction: null };
    const action = isContinue ? 'continue' : 'assist';

    // If we're already generating, treat a click on the active button as a
    // Stop. Clicks on the other button (which is hidden anyway) are ignored.
    if (state.generating) {
        if (state.activeAction === action) {
            // Use abortAllGenerations (not abortAllSilentGenerations) so
            // ST's GENERATION_STOPPED event fires and actually cancels the
            // backend fetch — otherwise KoboldCpp etc. keep generating to
            // the response cap while only the UI frees up.
            abortAllGenerations('wia-cancel');
            debug('Stop requested for', id);
        }
        return;
    }

    const contentEl = getContentTextarea(formEl);
    if (!contentEl) return;

    state.generating = true;
    state.activeAction = action;
    entryStates.set(id, state);

    setUIState(formEl, 'generating', action);

    try {
        const title = getTitle(formEl);
        // Guidance now lives in its own persisted field, separate from the
        // entry's content. Both Assist and Continue feed it to the model.
        const seed = readGuidance(formEl);
        const currentText = contentEl.value || '';

        // Optional preamble assembled from chat / character / lore books.
        const controls = formEl.querySelector('.wia-controls');
        const ctxOptions = readContextOptions(controls);
        let preamble = '';
        if (ctxOptions.includeChat || ctxOptions.loreBookNames.length) {
            preamble = await buildContextPreamble({
                ...ctxOptions,
                responseLength: getWIAResponseLength(),
                maxContextOverride: moduleSettings?.wiaMaxContextOverride || 0,
            });
            debug('Context preamble length:', preamble.length, 'options:', ctxOptions);
        }
        const preambleBlock = preamble
            ? `Existing context to consider when generating (do not repeat verbatim):\n${preamble}\n\n`
            : '';

        const userPrompt = composeWIAPrompt({
            preambleBlock, seed, title, isContinue,
        });
        // Continue: the entry-so-far is the prefill, so the model picks up from
        // its exact end. Assist: the prefill is the bracket/tone/subject opener.
        const prefill = isContinue ? currentText : resolveWIAPrefill(title);
        const systemPrompt = WIA_SYSTEM_PROMPT;

        debug('System prompt:', systemPrompt);
        debug('User prompt:', userPrompt);
        debug('Prefill:', prefill);

        const raw = await withSingleLineDisabled(() => streamingGenerate(
            {
                prompt: userPrompt,
                systemPrompt,
                responseLength: getWIAResponseLength(),
                ...(prefill ? { prefill } : {}),
            },
            contentEl,
            { append: isContinue },
        ));

        let cleaned = removeReasoningFromString(raw).trim();
        // Backends that ignore the assistant prefix may re-emit the prefill;
        // strip the echo so prepending/appending it doesn't double the text.
        cleaned = stripPrefillEcho(cleaned, prefill);

        if (isContinue) {
            const sep =
                currentText.length === 0 ||
                currentText.endsWith(' ') ||
                currentText.endsWith('\n') ||
                cleaned.startsWith(' ')
                    ? ''
                    : ' ';
            contentEl.value = currentText + sep + cleaned;
        } else {
            // The prefill is always preserved in the final entry text — the
            // user sees prefill + model output as one block.
            contentEl.value = (prefill || '') + cleaned;
        }

        // Notify SillyTavern that the entry has changed so it gets persisted.
        contentEl.dispatchEvent(new Event('input', { bubbles: true }));

        state.hasGenerated = true;
        state.generating = false;
        state.activeAction = null;
        entryStates.set(id, state);

        setUIState(formEl, 'generated');
        debug('Generation complete for', id);
    } catch (err) {
        if (isSilentGenerationAbort(err)) {
            debug('Generation cancelled for', id);
            // The streamed partial is left in the content field; if anything
            // was produced, treat the entry as generated so Continue/Retry stay
            // available and the user can edit the partial and pick up from it.
            if ((contentEl.value || '').trim()) state.hasGenerated = true;
        } else {
            console.error('WIA generation error:', err);
            toast(`World Info assist failed: ${err.message}`, 'error');
        }
        state.generating = false;
        state.activeAction = null;
        entryStates.set(id, state);
        setUIState(formEl, state.hasGenerated ? 'generated' : 'idle');
    }
}

async function onRetry(formEl, id) {
    const state = entryStates.get(id);
    if (!state) return;
    const contentEl = getContentTextarea(formEl);
    if (!contentEl) return;

    // Guidance lives in its own persisted field now, so Retry is just a
    // fresh Assist that overwrites the content textarea with a new output.
    contentEl.value = '';
    contentEl.dispatchEvent(new Event('input', { bubbles: true }));
    state.hasGenerated = false;
    entryStates.set(id, state);

    await onAssist(formEl, id, false);
}

// ─── Settings ───

/**
 * Bind WIA settings panel controls. Called after settings HTML is injected.
 * @param {function} saveSettings
 */
export function bindWIASettings(saveSettings) {
    saveSettingsCb = saveSettings;

    const enabledCb = document.getElementById('wia_enabled');
    const debugCb = document.getElementById('wia_debug_mode');
    const promptArea = document.getElementById('wia_prompt_textarea');

    if (enabledCb) {
        enabledCb.checked = !!moduleSettings.wiaEnabled;
        enabledCb.addEventListener('change', () => {
            moduleSettings.wiaEnabled = enabledCb.checked;
            saveSettings();
            if (moduleSettings.wiaEnabled) {
                rescanAllForms();
            } else {
                removeAllControls();
            }
        });
    }
    if (debugCb) {
        debugCb.checked = !!moduleSettings.wiaDebugMode;
        debugCb.addEventListener('change', () => {
            moduleSettings.wiaDebugMode = debugCb.checked;
            saveSettings();
        });
    }
    const maxContextInput = document.getElementById('wia_max_context_override');
    if (maxContextInput) {
        maxContextInput.value = moduleSettings.wiaMaxContextOverride || 0;
        maxContextInput.addEventListener('input', () => {
            const n = parseInt(maxContextInput.value, 10);
            moduleSettings.wiaMaxContextOverride = Number.isFinite(n) && n > 0 ? n : 0;
            saveSettings();
        });
    }
    const responseLengthInput = document.getElementById('wia_response_length');
    if (responseLengthInput) {
        responseLengthInput.value = moduleSettings.wiaResponseLength || DEFAULT_WIA_RESPONSE_LENGTH;
        responseLengthInput.addEventListener('input', () => {
            const n = parseInt(responseLengthInput.value, 10);
            if (Number.isFinite(n) && n > 0) {
                moduleSettings.wiaResponseLength = n;
                saveSettings();
                document.querySelectorAll('.wia-tokens-input').forEach(el => { el.value = n; });
            }
        });
    }
    if (promptArea) {
        promptArea.value = moduleSettings.wiaPrompt || DEFAULT_WIA_PROMPT;
        promptArea.addEventListener('input', () => {
            moduleSettings.wiaPrompt = promptArea.value;
            saveSettings();
        });
    }

    const prefillTitledArea = document.getElementById('wia_prefill_titled_textarea');
    if (prefillTitledArea) {
        prefillTitledArea.value = moduleSettings.wiaPrefillTitled || DEFAULT_WIA_PREFILL_TITLED;
        prefillTitledArea.addEventListener('input', () => {
            moduleSettings.wiaPrefillTitled = prefillTitledArea.value;
            saveSettings();
        });
    }

    const prefillUntitledArea = document.getElementById('wia_prefill_untitled_textarea');
    if (prefillUntitledArea) {
        prefillUntitledArea.value = moduleSettings.wiaPrefillUntitled || DEFAULT_WIA_PREFILL_UNTITLED;
        prefillUntitledArea.addEventListener('input', () => {
            moduleSettings.wiaPrefillUntitled = prefillUntitledArea.value;
            saveSettings();
        });
    }

    document.getElementById('wia_preview_btn')
        ?.addEventListener('click', showWIAPromptPreview);
}

function showWIAPromptPreview() {
    const sampleContext =
        'Existing context to consider when generating (do not repeat verbatim):\n'
        + '(character cards, persona, selected lore books, and recent chat — included when '
        + 'enabled on the entry\'s Assist row)\n\n';
    const sampleTitle = 'The Ashen Concord';
    const prompt = composeWIAPrompt({
        preambleBlock: sampleContext,
        seed: '(your Assist Guidance text)',
        title: sampleTitle,
        isContinue: false,
    });
    showPromptPreview('World Info Assist — Prompt Preview (Assist, titled entry)', [
        { label: 'System Prompt (fixed)', text: WIA_SYSTEM_PROMPT },
        { label: 'User Prompt (template with sample values)', text: prompt },
        { label: `Prefill — titled entry (sample title "${sampleTitle}")`, text: resolveWIAPrefill(sampleTitle) },
        { label: 'Prefill — untitled entry', text: resolveWIAPrefill('') },
        {
            label: 'Note',
            text: 'The prefill is sent as an assistant prefix and kept at the start of the entry on '
                + 'success. Continue uses the same template, but the entry so far is sent as the '
                + 'prefill so the model picks up from its exact end (a true continuation, like ST\'s '
                + 'native Continue) rather than starting a fresh section.',
        },
    ]);
}
