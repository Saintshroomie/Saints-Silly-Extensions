/**
 * Assisted Character Creation (ACC)
 *
 * Modal-based character creation. The user enters a character brief,
 * generates a complete description, optionally extends or re-rolls it,
 * and clicks Done to copy it into SillyTavern's description field.
 */

import {
    Popup,
    POPUP_TYPE,
    POPUP_RESULT,
} from '../../../../popup.js';
import {
    createDebugLogger,
    toast,
    buildContextPreamble,
    createLoreBookPicker,
    applyTemplateMacros,
    showPromptPreview,
    createSettingsBinder,
} from './utils.js';
import { templateSetting, textSetting } from './settings-helpers.js';
import { createToolPresetSelector } from './prompt-templates.js';
import {
    MODAL_LOREBOOK_PREFIX,
    actionRowHtml,
    createGenerationActions,
    smallButtonHtml,
    statusBarHtml,
    streamContinuation,
    streamFresh,
    tokensRowHtml,
} from './generation-modal.js';

// ─── Default Prompt ───

// {{context}} and {{brief}} are this extension's placeholders (substituted
// by applyTemplateMacros, not ST's macro engine — the literal
// {{ .fooOverride ?? ... }} syntax below must pass through untouched). If a
// placeholder is removed, the block is prepended/appended automatically.
export const DEFAULT_ACC_PROMPT = `{{context}}[
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
- No Commentary: Output the character sheet only. Begin directly with the opening "[". No preamble ("Here is...", "Sure!", "Of course..."), no acknowledgements, no follow-up after the closing "]".
- Prefill: The assistant turn is prefilled with the schema opening (e.g. "[\nCharacter Name: "). Continue from where the prefill ends — never repeat or echo it.

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
]

Character Brief:
{{brief}}`;

const ACC_GENERATE_SYSTEM_PROMPT =
    'You are a character creation assistant. Follow the instructions and output format '
    + 'in the prompt exactly. Output only the character sheet — no preamble, no commentary.';

const ACC_CONTINUE_SYSTEM_PROMPT =
    'You are a character creation assistant. Continue the existing character sheet seamlessly '
    + 'in the same format. Output only the continuation — no headers, no meta-commentary, '
    + 'no repetition of prior text.';

// Prefill is configured as a named template (like the prompt). It is passed
// to the model as an assistant-prefix so the reply continues from it, and
// is also prepended to the final text inserted into the description
// textarea — the user sees prefill + model output as one block.
export const DEFAULT_ACC_PREFILL = '[\nCharacter Name: ';

export const DEFAULT_ACC_RESPONSE_LENGTH = 1000;

// ─── Module State ───

let moduleSettings = null;
let saveSettingsFn = null;
let debug = () => {};

// Modal contents are remembered across open/close so the user doesn't lose
// their brief, generated description, or context-toggle selections — even
// when the modal closes via Done. Cleared only when the user uses the
// explicit Clear buttons inside the modal.
const persistedModalState = {
    brief: '',
    output: '',
    useChatContext: false,
    selectedLoreBooks: [],
};

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
    const bind = createSettingsBinder(moduleSettings, saveSettings);
    bind.checkbox('acc_enabled', 'accEnabled');
    bind.checkbox('acc_debug_mode', 'accDebugMode');
    bind.number('acc_max_context_override', 'accMaxContextOverride', { zeroMeansOff: true });
    bind.text('acc_prompt_textarea', 'accPrompt', getPromptTemplate());
    bind.text('acc_prefill_textarea', 'accPrefill', getPrefill());

    document.getElementById('acc_preview_btn')
        ?.addEventListener('click', showACCPromptPreview);
}

function showACCPromptPreview() {
    const sampleContext =
        'Existing context to consider when generating (do not repeat verbatim):\n'
        + '(character cards, persona, selected lore books, and recent chat — included when '
        + 'enabled in the Assist modal)\n\n';
    const prompt = composeGeneratePrompt(sampleContext, '(your character brief)');
    showPromptPreview('Assisted Character Creation — Prompt Preview (Generate)', [
        { label: 'System Prompt (fixed)', text: ACC_GENERATE_SYSTEM_PROMPT },
        { label: 'User Prompt (template with sample values)', text: prompt },
        { label: 'Prefill (assistant prefix; kept at the top of the final description)', text: getPrefill() },
        {
            label: 'Note',
            text: 'Continue uses the same template, but the character sheet so far is sent as '
                + 'the assistant prefill so the model picks up from its exact end (a true '
                + 'continuation, like ST\'s native Continue) rather than starting a fresh '
                + `section. System prompt:\n\n${ACC_CONTINUE_SYSTEM_PROMPT}`,
        },
    ]);
}

// ─── Modal ───

let activePopup = null;

const actions = createGenerationActions({
    prefix: 'acc',
    outputId: 'acc_description_output',
    noun: 'description',
    aNoun: 'a description',
    statusText: {
        generate: 'Generating character description…',
        continue: 'Continuing description…',
    },
    lockIds: ['acc_character_brief'],
    responseLength: {
        get settings() { return moduleSettings; },
        key: 'accResponseLength',
        fallback: DEFAULT_ACC_RESPONSE_LENGTH,
        save: () => saveSettingsFn?.(),
    },
    getPopup: () => activePopup,
    canRun: () => {
        if (readBrief()) return true;
        toast('Please enter a Character Brief first.', 'warning');
        return false;
    },
    run: (action, { existing, outputEl, responseLength }) => (action === 'continue'
        ? generateContinuation(existing, outputEl, responseLength)
        : generateDescription(outputEl, responseLength)),
    logLabel: 'ACC',
    debug: (...args) => debug(...args),
});

async function openModal() {
    if (activePopup) return;
    actions.reset();

    const body = buildModalBody();

    const popup = new Popup(body, POPUP_TYPE.TEXT, '', {
        okButton: 'Done',
        cancelButton: 'Cancel',
        wide: true,
        large: true,
        allowVerticalScrolling: true,
        onOpen: () => {
            bindModalHandlers();
            actions.bind();
            debug('Modal opened');
        },
        onClosing: (p) => {
            if (p.result === POPUP_RESULT.AFFIRMATIVE) {
                // Done clicked — refuse to close mid-generation.
                if (actions.isGenerating()) {
                    toast('Wait for generation to finish before clicking Done.', 'warning');
                    return false;
                }
                const output = body.querySelector('#acc_description_output')?.value?.trim() || '';
                if (!output) {
                    toast('Description is empty. Nothing to save.', 'warning');
                    return false;
                }
                return true;
            }
            // Cancel / Esc / X — abort any in-flight job, then allow close.
            actions.stopIfRunning();
            return true;
        },
    });
    activePopup = popup;

    try {
        const result = await popup.show();
        if (result === POPUP_RESULT.AFFIRMATIVE) {
            applyDescription(body);
        }
    } finally {
        // Snapshot the modal's current state into the persisted store so
        // the next open shows the same brief / output / context options.
        capturePersistedModalState(body);
        activePopup = null;
        actions.reset();
        debug('Modal closed');
    }
}

function capturePersistedModalState(body) {
    if (!body) return;
    persistedModalState.brief = body.querySelector('#acc_character_brief')?.value || '';
    persistedModalState.output = body.querySelector('#acc_description_output')?.value || '';
    persistedModalState.useChatContext = !!body.querySelector('#acc_use_chat_context')?.checked;
    persistedModalState.selectedLoreBooks = lorebookPicker?.getSelected() ?? [];
    actions.commitResponseLength(body);
}

let lorebookPicker = null;

function buildModalBody() {
    const root = document.createElement('div');
    root.className = 'sse-modal-body';
    root.innerHTML = `
        <div class="sse-modal-context">
            <label class="checkbox_label" title="Prepend the current chat / character context to the generation, and auto-include the chat's relevant World Info entries. The lore-book dropdown adds extra books on top of that.">
                <input id="acc_use_chat_context" type="checkbox" />
                <span>Use Chat Context</span>
            </label>
            <div class="acc-lorebook-host"></div>
        </div>
        <div class="sse-modal-preset-row">
            <label class="sse-modal-preset-label"><span class="fa-solid fa-file-pen"></span> Prompt Preset:</label>
            <div class="acc-preset-host"></div>
        </div>
        <div class="sse-modal-section">
            <div class="sse-modal-field-header">
                <label for="acc_character_brief"><b>Character Brief:</b></label>
                ${smallButtonHtml('acc_clear_brief_btn', 'fa-eraser', 'Clear', 'Clear the brief')}
            </div>
            <textarea id="acc_character_brief" class="text_pole" rows="4" placeholder="Describe your character concept, setting, and any key details..."></textarea>
        </div>
        ${actionRowHtml('acc', {
        noun: 'description',
        generateTitle: 'Generate a fresh description from the brief (replaces the textarea)',
    })}
        ${tokensRowHtml('acc')}
        ${statusBarHtml('acc')}
        <div class="sse-modal-output-section">
            <div class="sse-modal-field-header">
                <label for="acc_description_output"><b>Character Description:</b></label>
                ${smallButtonHtml('acc_clear_output_btn', 'fa-eraser', 'Clear', 'Clear the generated description')}
            </div>
            <textarea id="acc_description_output" class="text_pole sse-modal-output" rows="18" placeholder="Generated description will appear here. You can edit it before clicking Done."></textarea>
        </div>
    `;

    // Hydrate the persisted-across-opens fields.
    root.querySelector('#acc_character_brief').value = persistedModalState.brief || '';
    root.querySelector('#acc_description_output').value = persistedModalState.output || '';
    root.querySelector('#acc_use_chat_context').checked = !!persistedModalState.useChatContext;
    actions.fillResponseLength(root);

    // Mount the shared lore-book picker with previously-selected entries.
    lorebookPicker = createLoreBookPicker({
        classPrefix: MODAL_LOREBOOK_PREFIX,
        initialSelection: persistedModalState.selectedLoreBooks.slice(),
    });
    root.querySelector('.acc-lorebook-host').replaceWith(lorebookPicker.element);

    // Point-of-use preset selection — which prompt + prefill bundle
    // Generate/Continue uses, synced with the settings widget (which also
    // manages presets).
    root.querySelector('.acc-preset-host').replaceWith(createToolPresetSelector({
        toolKey: 'acc',
        title: 'Prompt preset used for Generate/Continue — the bundle of prompt + prefill that shapes '
            + 'the character sheet. Save and edit presets in the extension settings.',
    }));

    return root;
}

function bindModalHandlers() {
    document.getElementById('acc_clear_brief_btn')?.addEventListener('click', () => {
        if (actions.isGenerating()) return;
        const brief = document.getElementById('acc_character_brief');
        if (!brief) return;
        brief.value = '';
        brief.focus();
    });
}

function applyDescription(body) {
    const output = body.querySelector('#acc_description_output')?.value?.trim() || '';
    if (!output) return;
    const descField = document.getElementById('description_textarea');
    if (descField) {
        descField.value = output;
        descField.dispatchEvent(new Event('input', { bubbles: true }));
    }
    toast('Character description applied!', 'success');
}

// ─── Generation ───

function readBrief() {
    return document.getElementById('acc_character_brief')?.value?.trim() || '';
}

function readModalContextOptions() {
    return {
        includeChat: !!document.getElementById('acc_use_chat_context')?.checked,
        loreBookNames: lorebookPicker?.getSelected() ?? [],
    };
}

/**
 * Assemble the Generate-mode user prompt. {{context}} / {{brief}} are
 * substituted in place; when a placeholder is absent the block is added the
 * old way (context prepended, brief appended) so legacy templates keep
 * working unchanged.
 */
function composeGeneratePrompt(preambleBlock, brief) {
    const { text, used } = applyTemplateMacros(getPromptTemplate(), {
        context: preambleBlock || '',
        brief,
    });
    let prompt = text;
    if (!used.has('context') && preambleBlock) prompt = preambleBlock + prompt;
    if (!used.has('brief')) prompt = `${prompt}\n\nCharacter Brief:\n${brief}`;
    return prompt;
}

/**
 * Assemble the Continue-mode user prompt: same template + macros, then a
 * prefill-aware continuation note. The character-sheet-so-far is sent as the
 * assistant prefill (true positional continuation, like ST's native Continue),
 * so it is deliberately NOT embedded here — that would duplicate it.
 */
function composeContinuePrompt(preambleBlock, brief) {
    const briefValue = brief || '(none provided)';
    const { text, used } = applyTemplateMacros(getPromptTemplate(), {
        context: preambleBlock || '',
        brief: briefValue,
    });
    let prompt = text;
    if (!used.has('context') && preambleBlock) prompt = preambleBlock + prompt;
    if (!used.has('brief') && brief) prompt = `${prompt}\n\nCharacter Brief:\n${brief}`;
    return `${prompt}\n\nYour reply has been prefilled with the character sheet so far. Continue seamlessly from exactly where it stops — do not repeat any existing text. Maintain the same format and style. Output only the continuation.`;
}

async function generateDescription(outputEl, responseLength) {
    const brief = readBrief();
    const prompt = composeGeneratePrompt(await buildPreambleBlock(responseLength), brief);
    const prefill = getPrefill();
    debug('Generating with brief length', brief.length, 'tokens', responseLength);
    debug('Prompt:', prompt);
    debug('Prefill:', prefill);
    return streamFresh({
        prompt, systemPrompt: ACC_GENERATE_SYSTEM_PROMPT, responseLength, prefill, outputEl, name: 'acc',
    });
}

async function generateContinuation(existing, outputEl, responseLength) {
    const prompt = composeContinuePrompt(await buildPreambleBlock(responseLength), readBrief());
    debug('Continuing with existing length', existing.length, 'tokens', responseLength);
    debug('Prompt:', prompt);
    return streamContinuation({
        prompt, systemPrompt: ACC_CONTINUE_SYSTEM_PROMPT, responseLength, existing, outputEl, name: 'acc-continue',
    });
}

function getPromptTemplate() {
    return templateSetting(moduleSettings, 'accPrompt', DEFAULT_ACC_PROMPT);
}

function getPrefill() {
    return textSetting(moduleSettings, 'accPrefill', DEFAULT_ACC_PREFILL);
}

async function buildPreambleBlock(responseLength) {
    const ctxOptions = readModalContextOptions();
    if (!ctxOptions.includeChat && !ctxOptions.loreBookNames.length) return '';
    const preamble = await buildContextPreamble({
        ...ctxOptions,
        responseLength,
        maxContextOverride: moduleSettings?.accMaxContextOverride || 0,
    });
    if (!preamble) return '';
    debug('Context preamble length:', preamble.length);
    return `Existing context to consider when generating (do not repeat verbatim):\n${preamble}\n\n`;
}
