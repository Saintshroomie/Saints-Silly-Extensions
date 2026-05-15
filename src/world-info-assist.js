/**
 * World Info Assist (WIA)
 *
 * Adds an LLM-driven Assist button to every World Info / Lore book entry
 * form. Each entry gets its own button row above the content textarea
 * with Assist, Continue, Retry, and Revert controls — mirroring the
 * Assisted Character Creation tool, but operating on a single field
 * (the entry's content) and using a free-form prompt instead of a schema.
 */

import { removeReasoningFromString } from '../../../../reasoning.js';
import {
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

// ─── Default Prompt ───

export const DEFAULT_WIA_PROMPT = `[
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
]`;

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
let observer = null;
let saveSettingsCb = null;

// Per-entry state, keyed by a stable id derived from the entry uid / DOM element.
// `activeAction` is set to 'assist' or 'continue' while generating so the button
// labels can swap to Stop and clicks can route to cancel rather than re-start.
const entryStates = new Map(); // id -> { originalSeed, hasGenerated, generating, activeAction }

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
        return tpl.replace(/\{\{title\}\}/g, trimmedTitle);
    }
    const tpl = (typeof moduleSettings?.wiaPrefillUntitled === 'string' && moduleSettings.wiaPrefillUntitled)
        ? moduleSettings.wiaPrefillUntitled
        : DEFAULT_WIA_PREFILL_UNTITLED;
    return tpl;
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

// ─── DOM Observation / Injection ───

/**
 * Start watching the DOM for new World Info entry forms and inject
 * assist controls into each one.
 */
export function startWIAObserver() {
    if (observer) return;

    observer = new MutationObserver((mutations) => {
        if (!moduleSettings?.wiaEnabled) return;
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (!(node instanceof HTMLElement)) continue;
                if (node.matches?.('.world_entry_edit')) {
                    injectControls(node);
                }
                node.querySelectorAll?.('.world_entry_edit').forEach(injectControls);
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Process anything already present on the page
    document.querySelectorAll('.world_entry_edit').forEach(injectControls);
    debug('Observer started');
}

/**
 * Re-scan all currently visible WI forms (used after enable toggle).
 */
export function rescanAllForms() {
    if (!moduleSettings?.wiaEnabled) return;
    document.querySelectorAll('.world_entry_edit').forEach(injectControls);
}

/**
 * Remove all injected controls (used when the feature is disabled).
 */
export function removeAllControls() {
    document.querySelectorAll('.wia-controls').forEach(el => el.remove());
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
        <label class="wia-context-toggle checkbox_label" title="Prepend the current chat / character context to the generation prompt">
            <input type="checkbox" class="wia-context-cb" />
            <span>Use Chat Context</span>
        </label>
        <details class="wia-lorebook-picker" title="Prepend active entries from the selected lore books">
            <summary><span class="fa-solid fa-book"></span> <span class="wia-lorebook-summary-label">Lore Books</span></summary>
            <div class="wia-lorebook-list"></div>
        </details>
        <div class="wia-btn wia-btn-continue menu_button interactable wia-hidden" title="Continue generation from where it left off">
            <span class="fa-solid fa-arrow-right"></span>
        </div>
        <div class="wia-btn wia-btn-retry menu_button interactable wia-hidden" title="Retry from your original guidance text">
            <span class="fa-solid fa-rotate-right"></span>
        </div>
        <div class="wia-btn wia-btn-revert menu_button interactable wia-hidden" title="Revert to your original guidance text">
            <span class="fa-solid fa-arrow-rotate-left"></span>
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

    const assistBtn = controls.querySelector('.wia-btn-assist');
    const continueBtn = controls.querySelector('.wia-btn-continue');
    const retryBtn = controls.querySelector('.wia-btn-retry');
    const revertBtn = controls.querySelector('.wia-btn-revert');
    const tokensInput = controls.querySelector('.wia-tokens-input');

    assistBtn.addEventListener('click', () => onAssist(formEl, id, false));
    continueBtn.addEventListener('click', () => onAssist(formEl, id, true));
    retryBtn.addEventListener('click', () => onRetry(formEl, id));
    revertBtn.addEventListener('click', () => onRevert(formEl, id));

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

    populateLoreBookPicker(controls);

    debug('Injected controls for entry', id);
}

/**
 * Fill the lore book picker with one checkbox per known book and wire up the
 * summary label so it reflects the current selection count.
 */
function populateLoreBookPicker(controls) {
    const picker = controls.querySelector('.wia-lorebook-picker');
    const list = controls.querySelector('.wia-lorebook-list');
    const summaryLabel = controls.querySelector('.wia-lorebook-summary-label');
    if (!picker || !list || !summaryLabel) return;

    const updateSummary = () => {
        const checked = list.querySelectorAll('input[type="checkbox"]:checked').length;
        summaryLabel.textContent = checked > 0 ? `Lore Books (${checked})` : 'Lore Books';
    };

    const render = () => {
        const names = getAvailableLoreBookNames();
        const previouslyChecked = new Set(
            Array.from(list.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value),
        );
        list.innerHTML = '';
        if (!names.length) {
            const empty = document.createElement('div');
            empty.className = 'wia-lorebook-empty';
            empty.textContent = 'No lore books available.';
            list.appendChild(empty);
            updateSummary();
            return;
        }
        for (const name of names) {
            const label = document.createElement('label');
            label.className = 'wia-lorebook-item checkbox_label';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = name;
            if (previouslyChecked.has(name)) cb.checked = true;
            cb.addEventListener('change', updateSummary);
            const span = document.createElement('span');
            span.textContent = name;
            label.appendChild(cb);
            label.appendChild(span);
            list.appendChild(label);
        }
        updateSummary();
    };

    // Re-render on open so newly added/removed books appear without a reload.
    picker.addEventListener('toggle', () => {
        if (picker.open) render();
    });

    render();
}

function readContextOptions(controls) {
    if (!controls) return { includeChat: false, loreBookNames: [] };
    const cb = controls.querySelector('.wia-context-cb');
    const includeChat = !!cb?.checked;
    const loreBookNames = Array.from(
        controls.querySelectorAll('.wia-lorebook-list input[type="checkbox"]:checked'),
    ).map(el => el.value);
    return { includeChat, loreBookNames };
}

// ─── Helpers ───

function getContentTextarea(formEl) {
    return formEl.querySelector('textarea[name="content"]');
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
    const revertBtn = controls.querySelector('.wia-btn-revert');
    const spinner = controls.querySelector('.wia-spinner');

    const show = (el, vis) => el && el.classList.toggle('wia-hidden', !vis);
    const restoreBtn = (btn, key) => {
        if (btn && WIA_BTN_ORIGINAL_HTML[key]) btn.innerHTML = WIA_BTN_ORIGINAL_HTML[key];
    };

    if (state === 'idle') {
        restoreBtn(assistBtn, 'wia-btn-assist');
        restoreBtn(continueBtn, 'wia-btn-continue');
        show(assistBtn, true);
        show(continueBtn, false);
        show(retryBtn, false);
        show(revertBtn, false);
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
        show(revertBtn, false);
        show(spinner, false);
    } else if (state === 'generated') {
        restoreBtn(assistBtn, 'wia-btn-assist');
        restoreBtn(continueBtn, 'wia-btn-continue');
        show(assistBtn, false);
        show(continueBtn, true);
        show(retryBtn, true);
        show(revertBtn, true);
        show(spinner, false);
    }
}

// ─── Generation ───

async function onAssist(formEl, id, isContinue) {
    const state = entryStates.get(id)
        || { originalSeed: '', hasGenerated: false, generating: false, activeAction: null };
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

    if (!isContinue) {
        // First-pass generation: capture the user's seed text from the field
        // so we can revert / retry from it later.
        state.originalSeed = contentEl.value;
    }
    state.generating = true;
    state.activeAction = action;
    entryStates.set(id, state);

    setUIState(formEl, 'generating', action);

    try {
        const title = getTitle(formEl);
        const seed = state.originalSeed || '';
        const currentText = contentEl.value || '';

        const promptTemplate = (moduleSettings.wiaPrompt && moduleSettings.wiaPrompt.trim())
            ? moduleSettings.wiaPrompt
            : DEFAULT_WIA_PROMPT;

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

        let userPrompt;
        let prefill;

        if (isContinue) {
            userPrompt =
                `${preambleBlock}${promptTemplate}\n\n` +
                `Guidance from the user:\n${seed || '(none provided)'}\n\n` +
                `The entry so far:\n${currentText}\n\n` +
                'Continue exactly where the entry left off. Do not repeat any text. ' +
                'Maintain the bracketed format and close the bracket when the entry is complete.';
            prefill = '';
        } else {
            userPrompt =
                `${preambleBlock}${promptTemplate}\n\n` +
                `Guidance from the user:\n${seed || '(no specific guidance — invent a fitting entry)'}\n\n` +
                (title
                    ? `Write the entry for "${title}". The reply has been prefilled with the opening bracket, a tone anchor, and the subject name — continue from where the prefill ends with the factual description, then close the bracket.`
                    : 'No title was provided — invent a fitting subject name. The reply has been prefilled with the opening bracket and a tone anchor — continue from where the prefill ends with the subject name, colon, factual description, then close the bracket.');
            prefill = resolveWIAPrefill(title);
        }

        const systemPrompt =
            'You are a world-building assistant. Output only the requested ' +
            'World Lore Description in the exact bracketed format described. ' +
            'No commentary, no preamble, no explanations.';

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

    contentEl.value = state.originalSeed || '';
    contentEl.dispatchEvent(new Event('input', { bubbles: true }));
    state.hasGenerated = false;
    entryStates.set(id, state);

    await onAssist(formEl, id, false);
}

function onRevert(formEl, id) {
    const state = entryStates.get(id);
    if (!state) return;
    const contentEl = getContentTextarea(formEl);
    if (!contentEl) return;

    contentEl.value = state.originalSeed || '';
    contentEl.dispatchEvent(new Event('input', { bubbles: true }));
    state.hasGenerated = false;
    entryStates.set(id, state);
    setUIState(formEl, 'idle');
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

    setupPromptTemplates({
        promptKey: 'wiaPrompt',
        defaultText: DEFAULT_WIA_PROMPT,
        textareaId: 'wia_prompt_textarea',
        containerId: 'wia_prompt_templates',
        settings: moduleSettings,
        saveSettings,
    });

    const prefillTitledArea = document.getElementById('wia_prefill_titled_textarea');
    if (prefillTitledArea) {
        prefillTitledArea.value = moduleSettings.wiaPrefillTitled || DEFAULT_WIA_PREFILL_TITLED;
        prefillTitledArea.addEventListener('input', () => {
            moduleSettings.wiaPrefillTitled = prefillTitledArea.value;
            saveSettings();
        });
    }
    setupPromptTemplates({
        promptKey: 'wiaPrefillTitled',
        defaultText: DEFAULT_WIA_PREFILL_TITLED,
        textareaId: 'wia_prefill_titled_textarea',
        containerId: 'wia_prefill_titled_templates',
        settings: moduleSettings,
        saveSettings,
    });

    const prefillUntitledArea = document.getElementById('wia_prefill_untitled_textarea');
    if (prefillUntitledArea) {
        prefillUntitledArea.value = moduleSettings.wiaPrefillUntitled || DEFAULT_WIA_PREFILL_UNTITLED;
        prefillUntitledArea.addEventListener('input', () => {
            moduleSettings.wiaPrefillUntitled = prefillUntitledArea.value;
            saveSettings();
        });
    }
    setupPromptTemplates({
        promptKey: 'wiaPrefillUntitled',
        defaultText: DEFAULT_WIA_PREFILL_UNTITLED,
        textareaId: 'wia_prefill_untitled_textarea',
        containerId: 'wia_prefill_untitled_templates',
        settings: moduleSettings,
        saveSettings,
    });
}
