/**
 * Assisted Character Creation (ACC)
 *
 * Modal-based character creation. The user enters a character brief,
 * generates a complete description, optionally extends or re-rolls it,
 * and clicks Done to copy it into SillyTavern's description field.
 */

import { generateRaw } from '../../../../../script.js';
import { removeReasoningFromString } from '../../../../reasoning.js';
import {
    createDebugLogger,
    toast,
    buildContextPreamble,
    getAvailableLoreBookNames,
} from './utils.js';

// ─── Default Prompt ───

export const DEFAULT_ACC_PROMPT = `[
Role:
You are an AI that produces detailed, concise character description sheets for text-based roleplaying games across any genre.

General Input Rules:
- User Input: A character concept, which may range from a single name or vague idea to a detailed brief.
- Genre: User may specify a genre (fantasy, sci-fi, romance, horror, modern, etc.). If unspecified, infer from context or default to genre-neutral.
- Inferences: Fill in all fields with plausible, internally consistent details. If the user provides partial info, honor it and build around it.

General Output Rules:
- Conciseness: Use sentence fragments, keywords, comma-separated descriptors, and shorthand. No full sentences. Maximum density of detail in minimum words.
- Consistency: All fields must be internally coherent (age matches appearance, skills match background, etc.).
- Genre Flexibility: Adapt field content to genre. E.g., "Equipment" might list a plasma rifle (sci-fi) or a lute (fantasy). Fields that are irrelevant to the genre/character should be marked "N/A" rather than omitted.
- Specificity: Avoid vague defaults. Prefer "pale, freckled, sun-damaged across the nose" over "fair skin."
- Gender: Characters should be male or female. Reserve non-binary/ambiguous gender only for non-humanoid entities (creatures, monsters, constructs, eldritch beings, etc.). Use he/him or she/her accordingly; use it/its or they/them only for non-humanoid entities.
- No Commentary: Output the character sheet only. No preamble, no follow-up.

Format Rules:
- Use the exact bracket-and-semicolon format shown below.
- Each field ends with a semicolon.
- Multi-item fields use comma-separated lists.
- Sub-fields use " | " as a delimiter within a value when needed.
- Override Syntax: Fields marked with override syntax use the format {{ .<characterFirstName>FieldOverride ?? default value }}. The variable name is built from the character's first name in lower camelCase followed by the field name and "Override" (e.g., for a character named "Sable Voss" the clothing override is .sableClothingOverride; for "Elena" it is .elenaClothingOverride). This syntax applies only to the Clothing and Current Goal fields.

Output Template:
[
Character Name: <Full name, aliases/titles in parentheses if any>;
Age: <Number or approximate range, plus life-stage descriptor — e.g., "34, early middle-age">;
Gender & Pronouns: <Gender identity, pronoun set>;
Species/Race: <Human, elf, android, etc. — genre-dependent>;
Physical Description: <Height, build, skin, hair, eyes, distinguishing marks — compact descriptors>;
Voice & Speech: <Vocal quality, accent, speech patterns, verbal tics>;
Style: <Overall aesthetic sensibility — color palette tendencies, fashion philosophy, the vibe they project through appearance>;
Clothing: {{ .<characterFirstName>ClothingOverride ?? <Their most typical outfit — specific garments, materials, footwear, notable accessories> }};
Equipment/Belongings: <Weapons, tools, keepsakes, tech — whatever they carry>;
Personality Traits: <3–6 core traits, comma-separated>;
Strengths: <3–5 key strengths — skills, talents, mental/social assets>;
Weaknesses: <3–5 key flaws — vulnerabilities, bad habits, blind spots>;
Fears & Insecurities: <1–3, concise>;
Desires & Motivations: <Primary drive | secondary drive>;
Backstory Summary: <3–5 sentence fragments covering origin, key events, current situation>;
Relationships: <Notable connections — format: "Name (relation, status)" comma-separated>;
Skills & Abilities: <Practical/magical/technical skills, comma-separated>;
Mannerisms & Habits: <Physical tics, routines, comfort behaviors>;
Moral Alignment & Values: <Core ethical stance, what they will/won't compromise on>;
Secrets: <1–2 things they hide from others>;
Quirks: <2–3 memorable oddities or endearing details>;
Current Goal: {{ .<characterFirstName>GoalOverride ?? <Immediate objective at the start of play> }};
]

Output Example:
[
Character Name: Sable Voss ("The Thornwalker");
Age: 28, young adult;
Gender & Pronouns: Female, she/her;
Species/Race: Half-elf;
Physical Description: 5'9", wiry, deep brown skin, cropped silver-white hair, amber eyes with vertical pupils, thorn-vine scar wrapping left forearm to shoulder;
Voice & Speech: Low, measured cadence — clipped sentences, avoids contractions, occasional Sylvan loanwords;
Style: Rugged utilitarian — muted earth tones and deep greens, function over form, layered for movement not display, everything worn-in and trail-tested;
Clothing: {{ .sableClothingOverride ?? Weathered dark green leather coat (hip-length, high collar), wrapped linen undershirt, canvas trousers tucked into knee-high iron-buckle boots, bone-toggle clasps at cuffs }};
Equipment/Belongings: Curved hunting knife (ironwood handle), satchel of dried herbs and wound salves, enchanted compass that points toward strongest nearby magical source, dead mother's copper ring;
Personality Traits: Guarded, resourceful, dry-witted, quietly compassionate, stubborn, slow to trust;
Strengths: Expert tracker, herbalism/field medicine, preternatural patience, reads people well, resilient under pressure;
Weaknesses: Emotionally avoidant, overreliance on self-sufficiency, holds grudges, poor with authority figures, neglects own injuries;
Fears & Insecurities: Losing autonomy, becoming like her father, fear the scar is slowly spreading;
Desires & Motivations: Find the source of the Thornblight corrupting the Greenmarch | prove she doesn't need anyone's protection;
Backstory Summary: Raised in border village between human and elven lands — never fully accepted by either. Mother (elven healer) killed by Thornblight when Sable was 14. Father (human trapper) turned bitter, controlling. Left home at 17, survived as wilderness guide and unlicensed hedge-healer. Scar acquired two years ago from direct contact with Thornblight — hasn't told anyone it sometimes moves.;
Relationships: Brennick Gale (former traveling partner, estranged after argument), Warden Ilsara (elven border authority, uneasy mutual respect), "Patch" (rescued one-eared fox, sole constant companion);
Skills & Abilities: Wilderness survival, tracking (humanoid and beast), basic ward-magic (self-taught, unreliable), herbcraft, trap-setting, stealth movement;
Mannerisms & Habits: Rubs thumb along scar when anxious, always sits facing the door, braids grass stalks when idle, smells herbs before using them even when familiar;
Moral Alignment & Values: Chaotic good — protects the vulnerable, distrusts institutions, will break any law to do what's right but won't kill unarmed foes;
Secrets: The thorn-scar pulses near corrupted creatures and may be bonding with her. Stole a restricted text from an elven archive to research it.;
Quirks: Names all her knives, refuses to eat mushrooms (no stated reason), instinctively catches falling objects — unnervingly fast reflexes;
Current Goal: {{ .sableGoalOverride ?? Reach the Greenmarch interior and locate the Thornblight's origin before the scar reaches her chest }};
]
]`;

export const DEFAULT_ACC_RESPONSE_LENGTH = 1000;

// ─── Module State ───

let moduleSettings = null;
let debug = () => {};

let isGenerating = false;
let abortRequested = false;
let activeAction = null;       // which button initiated the current generation
let lastAction = null;         // 'generate' | 'continue' — what Retry should redo
let restorePoint = null;       // textarea snapshot used by Retry

// ─── Init ───

/**
 * Initialize ACC module. Called once from index.js.
 * @param {object} opts - { settings, saveSettings }
 */
export function initACC({ settings, saveSettings }) {
    moduleSettings = settings;
    saveSettingsFn = saveSettings;
    debug = createDebugLogger('ACC', () => moduleSettings.accDebugMode);
    debug('Module initialized');
}

let saveSettingsFn = null;

// ─── Character Page Integration ───

/**
 * Called on CHARACTER_PAGE_LOADED. Injects the ACC launch button.
 */
export function onCharacterPageLoaded() {
    if (!moduleSettings.accEnabled) return;
    if (document.getElementById('acc_launch_btn')) return;

    const btnRow = document.querySelector('#form_create .ch_creation_btn_row');
    const target = btnRow || document.querySelector('#form_create');
    if (!target) return;

    const btn = document.createElement('div');
    btn.id = 'acc_launch_btn';
    btn.classList.add('menu_button', 'interactable');
    btn.title = 'Assisted Character Creation';
    btn.innerHTML = '<span class="fa-solid fa-wand-magic-sparkles"></span> <span>Assist</span>';
    btn.addEventListener('click', openModal);

    target.appendChild(btn);
    debug('Launch button injected');
}

// ─── Settings Bindings ───

/**
 * Bind ACC settings panel controls. Called after settings HTML is injected.
 * @param {function} saveSettings
 */
export function bindACCSettings(saveSettings) {
    const enabledCb = document.getElementById('acc_enabled');
    const debugCb = document.getElementById('acc_debug_mode');
    const promptArea = document.getElementById('acc_prompt_textarea');
    const restoreBtn = document.getElementById('acc_restore_default_prompt');

    if (enabledCb) {
        enabledCb.checked = moduleSettings.accEnabled;
        enabledCb.addEventListener('change', () => {
            moduleSettings.accEnabled = enabledCb.checked;
            saveSettings();
        });
    }
    if (debugCb) {
        debugCb.checked = moduleSettings.accDebugMode;
        debugCb.addEventListener('change', () => {
            moduleSettings.accDebugMode = debugCb.checked;
            saveSettings();
        });
    }
    if (promptArea) {
        promptArea.value = moduleSettings.accPrompt || DEFAULT_ACC_PROMPT;
        promptArea.addEventListener('input', () => {
            moduleSettings.accPrompt = promptArea.value;
            saveSettings();
        });
    }
    if (restoreBtn) {
        restoreBtn.addEventListener('click', () => {
            moduleSettings.accPrompt = DEFAULT_ACC_PROMPT;
            if (promptArea) promptArea.value = DEFAULT_ACC_PROMPT;
            saveSettings();
            toast('ACC prompt restored to default.', 'success');
        });
    }
}

// ─── Modal ───

function openModal() {
    if (document.getElementById('acc_modal_overlay')) return;

    isGenerating = false;
    abortRequested = false;
    activeAction = null;
    lastAction = null;
    restorePoint = null;

    const overlay = document.createElement('div');
    overlay.id = 'acc_modal_overlay';
    overlay.innerHTML = buildModalHTML();
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    document.getElementById('acc_close_btn')?.addEventListener('click', closeModal);
    document.getElementById('acc_cancel_btn')?.addEventListener('click', closeModal);
    document.getElementById('acc_done_btn')?.addEventListener('click', handleDone);
    document.getElementById('acc_generate_btn')?.addEventListener('click', handleGenerate);
    document.getElementById('acc_continue_btn')?.addEventListener('click', handleContinue);
    document.getElementById('acc_checkpoint_btn')?.addEventListener('click', handleCheckpoint);
    document.getElementById('acc_retry_btn')?.addEventListener('click', handleRetry);

    const updateLoreBookSummary = () => {
        const label = document.getElementById('acc_lorebook_summary_label');
        if (!label) return;
        const checked = document.querySelectorAll('#acc_lorebook_list .acc-lorebook-cb:checked').length;
        label.textContent = checked > 0 ? `Lore Books (${checked})` : 'Lore Books';
    };
    document.querySelectorAll('#acc_lorebook_list .acc-lorebook-cb').forEach(cb => {
        cb.addEventListener('change', updateLoreBookSummary);
    });

    const output = document.getElementById('acc_description_output');
    output?.addEventListener('input', refreshActionButtonStates);

    const tokenInput = document.getElementById('acc_response_length');
    tokenInput?.addEventListener('change', () => {
        const parsed = parseInt(tokenInput.value, 10);
        if (!isNaN(parsed) && parsed > 0) {
            moduleSettings.accResponseLength = parsed;
            saveSettingsFn?.();
        }
    });

    refreshActionButtonStates();
    debug('Modal opened');
}

function closeModal() {
    if (isGenerating) {
        abortRequested = true;
        stopGeneration();
    }
    const overlay = document.getElementById('acc_modal_overlay');
    if (overlay) overlay.remove();
    isGenerating = false;
    activeAction = null;
    lastAction = null;
    restorePoint = null;
    debug('Modal closed');
}

function buildModalHTML() {
    const loreBookNames = getAvailableLoreBookNames();
    const loreBookOptions = loreBookNames.length
        ? loreBookNames.map(n => `
            <label class="acc-lorebook-item checkbox_label">
                <input type="checkbox" class="acc-lorebook-cb" value="${escapeAttr(n)}" />
                <span>${escapeHTML(n)}</span>
            </label>
        `).join('')
        : '<div class="acc-lorebook-empty">No lore books available.</div>';

    return `
        <div id="acc_modal" class="acc-modal">
            <div class="acc-modal-header">
                <h3>Assisted Character Creation</h3>
                <div id="acc_close_btn" class="acc-close-btn interactable"><span class="fa-solid fa-xmark"></span></div>
            </div>
            <div class="acc-modal-body">
                <div class="acc-context-section">
                    <label class="checkbox_label" title="Prepend the current chat / character context to the generation">
                        <input id="acc_use_chat_context" type="checkbox" />
                        <span>Use Chat Context</span>
                    </label>
                    <details class="acc-lorebook-picker" title="Prepend active entries from the selected lore books">
                        <summary><span class="fa-solid fa-book"></span> <span id="acc_lorebook_summary_label">Lore Books</span></summary>
                        <div id="acc_lorebook_list" class="acc-lorebook-list">${loreBookOptions}</div>
                    </details>
                </div>
                <div class="acc-brief-section">
                    <label for="acc_character_brief"><b>Character Brief:</b></label>
                    <textarea id="acc_character_brief" class="text_pole" rows="4" placeholder="Describe your character concept, setting, and any key details..."></textarea>
                </div>
                <div class="acc-action-row">
                    <div id="acc_generate_btn" class="menu_button interactable acc-action-btn acc-generate-btn" title="Generate a fresh description from the brief (replaces the textarea)">
                        <span class="fa-solid fa-wand-magic-sparkles"></span> Generate
                    </div>
                    <div id="acc_continue_btn" class="menu_button interactable acc-action-btn acc-continue-btn" title="Continue from where the description leaves off">
                        <span class="fa-solid fa-arrow-right"></span> Continue
                    </div>
                    <div id="acc_checkpoint_btn" class="menu_button interactable acc-action-btn acc-checkpoint-btn" title="Save the current description as the Retry restore point">
                        <span class="fa-solid fa-flag"></span> Checkpoint
                    </div>
                    <div id="acc_retry_btn" class="menu_button interactable acc-action-btn acc-retry-btn" title="Restore to the last snapshot and re-run the last action">
                        <span class="fa-solid fa-rotate-right"></span> Retry
                    </div>
                </div>
                <div class="acc-tokens-row">
                    <label class="acc-tokens-label" for="acc_response_length" title="Maximum tokens for each generation">
                        <span class="fa-solid fa-coins"></span> Max Tokens:
                    </label>
                    <input id="acc_response_length" type="number" class="text_pole acc-tokens-input" min="50" max="8192" step="50" value="${getResponseLength()}" />
                </div>
                <div class="acc-status-bar acc-hidden" id="acc_status_bar">
                    <span class="fa-solid fa-spinner fa-spin"></span>
                    <span id="acc_status_text"></span>
                </div>
                <div class="acc-description-section">
                    <label for="acc_description_output"><b>Character Description:</b></label>
                    <textarea id="acc_description_output" class="text_pole acc-description-output" rows="18" placeholder="Generated description will appear here. You can edit it before clicking Done."></textarea>
                </div>
            </div>
            <div class="acc-modal-footer">
                <div class="acc-footer-right">
                    <div id="acc_cancel_btn" class="menu_button interactable">Cancel</div>
                    <div id="acc_done_btn" class="menu_button interactable acc-done-btn">Done</div>
                </div>
            </div>
        </div>`;
}

// ─── Actions ───

function readModalContextOptions() {
    const includeChat = !!document.getElementById('acc_use_chat_context')?.checked;
    const loreBookNames = Array.from(
        document.querySelectorAll('#acc_lorebook_list .acc-lorebook-cb:checked'),
    ).map(el => el.value);
    return { includeChat, loreBookNames };
}

async function handleGenerate() {
    if (isGenerating) {
        if (activeAction === 'generate') {
            abortRequested = true;
            stopGeneration();
        }
        return;
    }

    const brief = document.getElementById('acc_character_brief')?.value?.trim() || '';
    if (!brief) {
        toast('Please enter a Character Brief before generating.', 'warning');
        return;
    }

    const output = document.getElementById('acc_description_output');
    restorePoint = output?.value || '';
    await runGeneration('generate', brief);
}

async function handleContinue() {
    if (isGenerating) {
        if (activeAction === 'continue') {
            abortRequested = true;
            stopGeneration();
        }
        return;
    }

    const output = document.getElementById('acc_description_output');
    const existing = output?.value || '';
    if (!existing.trim()) {
        toast('Nothing to continue from. Generate a description first or type some text.', 'warning');
        return;
    }

    const brief = document.getElementById('acc_character_brief')?.value?.trim() || '';
    restorePoint = existing;
    await runGeneration('continue', brief);
}

function handleCheckpoint() {
    if (isGenerating) return;
    const output = document.getElementById('acc_description_output');
    const current = output?.value || '';
    if (!current.trim()) {
        toast('Nothing to checkpoint — the description is empty.', 'warning');
        return;
    }
    restorePoint = current;
    lastAction = 'continue';
    toast('Checkpoint saved. Retry will restore to this point.', 'success');
    refreshActionButtonStates();
    debug('Checkpoint saved, length:', current.length);
}

async function handleRetry() {
    if (isGenerating) return;
    if (!lastAction || restorePoint === null) {
        toast('Nothing to retry yet.', 'warning');
        return;
    }

    const brief = document.getElementById('acc_character_brief')?.value?.trim() || '';
    if (lastAction === 'continue' && !restorePoint.trim()) {
        toast('Cannot continue from an empty restore point.', 'warning');
        return;
    }
    if (lastAction === 'generate' && !brief) {
        toast('Please enter a Character Brief before retrying.', 'warning');
        return;
    }

    const output = document.getElementById('acc_description_output');
    if (output) output.value = restorePoint;
    await runGeneration(lastAction, brief);
}

async function runGeneration(action, brief) {
    isGenerating = true;
    abortRequested = false;
    activeAction = action;

    const isContinue = action === 'continue';
    setGeneratingUI(true, action);
    setStatusBar(isContinue ? 'Continuing description...' : 'Generating character description...');

    try {
        const ctxOptions = readModalContextOptions();
        const output = document.getElementById('acc_description_output');
        const existing = output?.value || '';

        const result = isContinue
            ? await generateContinuation(brief, existing, ctxOptions)
            : await generateDescription(brief, ctxOptions);

        if (abortRequested) {
            debug(`${action} aborted, discarding result`);
            return;
        }

        if (!output) return;
        if (isContinue) {
            const sep = needsSeparator(existing) ? ' ' : '';
            output.value = existing + sep + result;
        } else {
            output.value = result;
        }
        lastAction = action;
        debug(`${action} complete, length:`, result.length);
    } catch (err) {
        if (!abortRequested) {
            console.error('ACC generation error:', err);
            toast(`Generation failed: ${err.message}`, 'error');
        }
    } finally {
        isGenerating = false;
        abortRequested = false;
        activeAction = null;
        setGeneratingUI(false, action);
        setStatusBar(null);
        refreshActionButtonStates();
    }
}

function needsSeparator(text) {
    if (!text) return false;
    const last = text[text.length - 1];
    return last !== ' ' && last !== '\n' && last !== '\t';
}

async function generateDescription(brief, ctxOptions) {
    const preambleBlock = await buildPreambleBlock(ctxOptions);
    const promptTemplate = getPromptTemplate();
    const prompt = `${preambleBlock}${promptTemplate}\n\nCharacter Brief:\n${brief}`;
    const systemPrompt = 'You are a character creation assistant. Follow the instructions and output format in the prompt exactly. Output only the character sheet — no preamble, no commentary.';
    const responseLength = getResponseLength();

    debug('Generating with brief length', brief.length, 'tokens', responseLength);
    debug('System prompt:', systemPrompt);
    debug('Prompt:', prompt);

    const result = await generateRaw({ prompt, systemPrompt, responseLength });
    return removeReasoningFromString(result).trim();
}

async function generateContinuation(brief, existing, ctxOptions) {
    const preambleBlock = await buildPreambleBlock(ctxOptions);
    const promptTemplate = getPromptTemplate();
    const briefBlock = brief ? `Character Brief:\n${brief}\n\n` : '';
    const prompt = `${preambleBlock}${promptTemplate}\n\n${briefBlock}Description so far:\n${existing}\n\nContinue exactly where the text leaves off. Do not repeat any text already present. Maintain the same format and style. Output only the continuation.`;
    const systemPrompt = 'You are a character creation assistant. Continue the existing character sheet seamlessly in the same format. Output only the continuation — no headers, no meta-commentary, no repetition of prior text.';
    const responseLength = getResponseLength();

    debug('Continuing with existing length', existing.length, 'tokens', responseLength);
    debug('System prompt:', systemPrompt);
    debug('Prompt:', prompt);

    const result = await generateRaw({ prompt, systemPrompt, responseLength });
    return removeReasoningFromString(result).trim();
}

function getPromptTemplate() {
    const stored = moduleSettings?.accPrompt;
    return (typeof stored === 'string' && stored.trim()) ? stored : DEFAULT_ACC_PROMPT;
}

function getResponseLength() {
    const input = document.getElementById('acc_response_length');
    if (input) {
        const parsed = parseInt(input.value, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    const setting = moduleSettings?.accResponseLength;
    if (typeof setting === 'number' && setting > 0) return setting;
    return DEFAULT_ACC_RESPONSE_LENGTH;
}

async function buildPreambleBlock(ctxOptions) {
    if (!ctxOptions) return '';
    if (!ctxOptions.includeChat && !(ctxOptions.loreBookNames && ctxOptions.loreBookNames.length)) return '';
    const preamble = await buildContextPreamble(ctxOptions);
    if (!preamble) return '';
    debug('Context preamble length:', preamble.length);
    return `Existing context to consider when generating (do not repeat verbatim):\n${preamble}\n\n`;
}

function stopGeneration() {
    const stopBtn = document.getElementById('mes_stop');
    if (stopBtn) stopBtn.click();
    debug('Stop generation triggered');
}

// ─── Done ───

function handleDone() {
    if (isGenerating) return;

    const output = document.getElementById('acc_description_output')?.value?.trim() || '';
    if (!output) {
        toast('Description is empty. Nothing to save.', 'warning');
        return;
    }

    const descField = document.getElementById('description_textarea');
    if (descField) {
        descField.value = output;
        descField.dispatchEvent(new Event('input', { bubbles: true }));
    }

    toast('Character description applied!', 'success');
    closeModal();
}

// ─── UI Helpers ───

const ACTION_BUTTON_IDS = ['acc_generate_btn', 'acc_continue_btn', 'acc_checkpoint_btn', 'acc_retry_btn'];

const ACTION_LABELS = {
    acc_generate_btn: '<span class="fa-solid fa-wand-magic-sparkles"></span> Generate',
    acc_continue_btn: '<span class="fa-solid fa-arrow-right"></span> Continue',
    acc_checkpoint_btn: '<span class="fa-solid fa-flag"></span> Checkpoint',
    acc_retry_btn: '<span class="fa-solid fa-rotate-right"></span> Retry',
};

function setGeneratingUI(generating, action) {
    const doneBtn = document.getElementById('acc_done_btn');
    const briefInput = document.getElementById('acc_character_brief');
    const activeBtnId = action === 'continue' ? 'acc_continue_btn' : 'acc_generate_btn';

    for (const id of ACTION_BUTTON_IDS) {
        const btn = document.getElementById(id);
        if (!btn) continue;
        if (generating) {
            if (id === activeBtnId) {
                btn.innerHTML = '<span class="fa-solid fa-stop"></span> Stop';
                btn.classList.remove('acc-disabled');
            } else {
                btn.innerHTML = ACTION_LABELS[id];
                btn.classList.add('acc-disabled');
            }
        } else {
            btn.innerHTML = ACTION_LABELS[id];
            btn.classList.remove('acc-disabled');
        }
    }

    if (generating) {
        doneBtn?.classList.add('acc-disabled');
        briefInput?.setAttribute('disabled', 'true');
    } else {
        doneBtn?.classList.remove('acc-disabled');
        briefInput?.removeAttribute('disabled');
        refreshActionButtonStates();
    }
}

function refreshActionButtonStates() {
    if (isGenerating) return;
    const output = document.getElementById('acc_description_output');
    const hasText = !!output?.value?.trim();

    setButtonDisabled('acc_continue_btn', !hasText);
    setButtonDisabled('acc_checkpoint_btn', !hasText);
    setButtonDisabled('acc_retry_btn', !lastAction || restorePoint === null);
}

function setButtonDisabled(id, disabled) {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (disabled) btn.classList.add('acc-disabled');
    else btn.classList.remove('acc-disabled');
}

function setStatusBar(message) {
    const bar = document.getElementById('acc_status_bar');
    const text = document.getElementById('acc_status_text');
    if (!bar || !text) return;
    if (message) {
        text.textContent = message;
        bar.classList.remove('acc-hidden');
    } else {
        bar.classList.add('acc-hidden');
    }
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escapeAttr(str) {
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
