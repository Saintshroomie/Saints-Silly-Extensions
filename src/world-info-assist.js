/**
 * World Info Assist (WIA)
 *
 * Adds an LLM-driven Assist button to every World Info / Lore book entry
 * form. Each entry gets its own button row above the content textarea
 * with Assist, Continue, Retry, and Revert controls — mirroring the
 * Assisted Character Creation tool, but operating on a single field
 * (the entry's content) and using a free-form prompt instead of a schema.
 */

import { generateRaw } from '../../../../../script.js';
import { removeReasoningFromString } from '../../../../reasoning.js';
import { createDebugLogger, toast } from './utils.js';

// ─── Default Prompt ───

export const DEFAULT_WIA_PROMPT = `[
The next reply will be an out of story generated World Lore Description. This is a setting reference entry that codifies key facts about an event, person, place, institution, or artifact so they remain consistent and reusable. It should prioritize clear, canonical details over narrative dramatization.

General Input Rules:
* Guidance (optional): IP/canon, tone/genre, tags, audience, era, length, style notes.

Defaults:
* Tone: Genre-appropriate, neutral-evocative.
* Canon: Respect canon when named or implied.
* Length: 1–3 crisp sentences per entry (unless the user requests more).

Output Format (use exactly as written):
[ <Name of the Subject>: <Detailed Description of the Event, Person, Place, or Thing> ]

Format Rules:

* Return only the World Lore Description artifact.
* Follow schema verbatim (brackets, colon, spacing).
* No extra commentary.

Example — World Lore:
[ The Ashen Concord: A pact of five city-states after the Ember War to share river trade, standardize coinage, and outlaw pyromancy; prosperity rose while hedge mages went underground, fueling a decade of covert arson reprisals; ]
]`;

// ─── Module State ───

let moduleSettings = null;
let debug = () => {};
let observer = null;

// Per-entry state, keyed by a stable id derived from the entry uid / DOM element
const entryStates = new Map(); // id -> { originalSeed, hasGenerated, generating }

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
    `;

    // Insert at the very top of the content form control so it's clearly
    // visible above both the label and textarea.
    formControl.insertBefore(controls, formControl.firstChild);

    const assistBtn = controls.querySelector('.wia-btn-assist');
    const continueBtn = controls.querySelector('.wia-btn-continue');
    const retryBtn = controls.querySelector('.wia-btn-retry');
    const revertBtn = controls.querySelector('.wia-btn-revert');

    assistBtn.addEventListener('click', () => onAssist(formEl, id, false));
    continueBtn.addEventListener('click', () => onAssist(formEl, id, true));
    retryBtn.addEventListener('click', () => onRetry(formEl, id));
    revertBtn.addEventListener('click', () => onRevert(formEl, id));

    debug('Injected controls for entry', id);
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

function setUIState(formEl, state) {
    const controls = formEl.querySelector('.wia-controls');
    if (!controls) return;
    const assistBtn = controls.querySelector('.wia-btn-assist');
    const continueBtn = controls.querySelector('.wia-btn-continue');
    const retryBtn = controls.querySelector('.wia-btn-retry');
    const revertBtn = controls.querySelector('.wia-btn-revert');
    const spinner = controls.querySelector('.wia-spinner');

    const show = (el, vis) => el && el.classList.toggle('wia-hidden', !vis);

    if (state === 'idle') {
        show(assistBtn, true);
        show(continueBtn, false);
        show(retryBtn, false);
        show(revertBtn, false);
        show(spinner, false);
    } else if (state === 'generating') {
        show(assistBtn, false);
        show(continueBtn, false);
        show(retryBtn, false);
        show(revertBtn, false);
        show(spinner, true);
    } else if (state === 'generated') {
        show(assistBtn, false);
        show(continueBtn, true);
        show(retryBtn, true);
        show(revertBtn, true);
        show(spinner, false);
    }
}

// ─── Generation ───

async function onAssist(formEl, id, isContinue) {
    const state = entryStates.get(id) || { originalSeed: '', hasGenerated: false, generating: false };
    if (state.generating) return;

    const contentEl = getContentTextarea(formEl);
    if (!contentEl) return;

    if (!isContinue) {
        // First-pass generation: capture the user's seed text from the field
        // so we can revert / retry from it later.
        state.originalSeed = contentEl.value;
    }
    state.generating = true;
    entryStates.set(id, state);

    setUIState(formEl, 'generating');

    try {
        const title = getTitle(formEl);
        const seed = state.originalSeed || '';
        const currentText = contentEl.value || '';

        const promptTemplate = (moduleSettings.wiaPrompt && moduleSettings.wiaPrompt.trim())
            ? moduleSettings.wiaPrompt
            : DEFAULT_WIA_PROMPT;

        let userPrompt;
        let prefill;

        if (isContinue) {
            userPrompt =
                `${promptTemplate}\n\n` +
                `Guidance from the user:\n${seed || '(none provided)'}\n\n` +
                `The entry so far:\n${currentText}\n\n` +
                'Continue exactly where the entry left off. Do not repeat any text. ' +
                'Maintain the bracketed format and close the bracket when the entry is complete.';
            prefill = '';
        } else {
            userPrompt =
                `${promptTemplate}\n\n` +
                `Guidance from the user:\n${seed || '(no specific guidance — invent a fitting entry)'}\n\n` +
                (title
                    ? `Respond on one line with only the value for "${title}":`
                    : 'No title was provided — invent a fitting subject name.');
            prefill = title ? `[${title}: ` : '[';
        }

        const systemPrompt =
            'You are a world-building assistant. Output only the requested ' +
            'World Lore Description in the exact bracketed format described. ' +
            'No commentary, no preamble, no explanations.';

        debug('System prompt:', systemPrompt);
        debug('User prompt:', userPrompt);
        debug('Prefill:', prefill);

        const raw = await generateRaw({
            prompt: userPrompt,
            systemPrompt,
            responseLength: 600,
            ...(prefill ? { prefill } : {}),
        });

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
            // If the model didn't echo the prefill back, prepend it so the
            // entry always starts in the desired format.
            let finalText = cleaned;
            if (prefill && !finalText.startsWith('[')) {
                finalText = prefill + finalText;
            }
            contentEl.value = finalText;
        }

        // Notify SillyTavern that the entry has changed so it gets persisted.
        contentEl.dispatchEvent(new Event('input', { bubbles: true }));

        state.hasGenerated = true;
        state.generating = false;
        entryStates.set(id, state);

        setUIState(formEl, 'generated');
        debug('Generation complete for', id);
    } catch (err) {
        console.error('WIA generation error:', err);
        toast(`World Info assist failed: ${err.message}`, 'error');
        state.generating = false;
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
    const enabledCb = document.getElementById('wia_enabled');
    const debugCb = document.getElementById('wia_debug_mode');
    const promptArea = document.getElementById('wia_prompt_textarea');
    const restoreBtn = document.getElementById('wia_restore_default');

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
    if (promptArea) {
        promptArea.value = moduleSettings.wiaPrompt || DEFAULT_WIA_PROMPT;
        promptArea.addEventListener('input', () => {
            moduleSettings.wiaPrompt = promptArea.value;
            saveSettings();
        });
    }
    if (restoreBtn) {
        restoreBtn.addEventListener('click', () => {
            moduleSettings.wiaPrompt = DEFAULT_WIA_PROMPT;
            if (promptArea) promptArea.value = DEFAULT_WIA_PROMPT;
            saveSettings();
            toast('Default World Info assist prompt restored.', 'success');
        });
    }
}
