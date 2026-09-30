/**
 * Character State
 *
 * View and update a character's state variables — the chat variables its
 * card and lore read with ST's variable shorthand, st-toolkit style:
 *
 *     Clothing: {{ .peterClothingOverride ?? Worn gray hoodie, … }};
 *
 * A button on each group member row (next to Possession's radio) and in the
 * character panel for one-on-one chats opens a per-character pane listing
 * those variables with their current values. Values can be edited by hand,
 * reset to the card default, or rewritten by the LLM from an instruction —
 * or, with no instruction, from what the recent chat shows has changed.
 * Nothing is written until Apply; the values land in the chat's local
 * variables (`chatMetadata.variables`), the same store `/setvar` uses.
 *
 * Discovery and reply parsing are pure helpers in character-state-parsing.js.
 */

import { removeReasoningFromString } from '../../../../reasoning.js';
import {
    Popup,
    POPUP_TYPE,
    POPUP_RESULT,
} from '../../../../popup.js';
import { loadWorldInfo, world_info, world_names } from '../../../../world-info.js';
import { SlashCommandParser } from '../../../../slash-commands/SlashCommandParser.js';
import { SlashCommand } from '../../../../slash-commands/SlashCommand.js';
import { ARGUMENT_TYPE, SlashCommandArgument } from '../../../../slash-commands/SlashCommandArgument.js';
import {
    createDebugLogger,
    getContext,
    toast,
    buildContextPreamble,
    createLoreBookPicker,
    streamingGenerate,
    withSingleLineDisabled,
    applyTemplateMacros,
    stripPrefillEcho,
    showPromptPreview,
} from './utils.js';
import { templateSetting, textSetting, parsePositiveInt, positiveIntSetting } from './settings-helpers.js';
import {
    abortAllGenerations,
    isSilentGenerationAbort,
} from './silent-generation.js';
import { createToolPresetSelector } from './prompt-templates.js';
import {
    discoverVariables,
    humanizeVariableName,
    formatVariablesBlock,
    parseStateReply,
} from './character-state-parsing.js';
import { resolveGroupMemberRow } from './group-members.js';
import { characterLoreBooks } from './scenario-books.js';

// ─── Default Prompt ───

export const DEFAULT_CHARACTER_STATE_PROMPT = `{{context}}Task: update the state variables of the roleplay character {{character}}.

{{character}}'s character sheet and private notes read these variables, so whatever they hold is what the story treats as true for {{character}} right now. A variable showing "(card default)" is unset and falls back to that default.

Current variables:
{{variables}}

{{guidance}}

Rules:
* Change only the variables the instruction or the story calls for. Leave every other variable out of the reply.
* Match the style of the current values: dense reference fragments and comma-separated descriptors on a single line, no full sentences, no narration, no trailing semicolon.
* A new value replaces the old one completely, so carry over every detail that still holds.
* Stay consistent with the character sheet, the lore, and the recent chat.

Reply format: one line per changed variable, exactly
<variable name>: <new value>
using the variable names exactly as listed. Write nothing else. If nothing should change, reply with: NO CHANGES`;

export const DEFAULT_CHARACTER_STATE_PREFILL = '';
export const DEFAULT_CHARACTER_STATE_RESPONSE_LENGTH = 400;

const CHARACTER_STATE_SYSTEM_PROMPT =
    'You maintain the state variables of a character in an ongoing roleplay: what they wear, what they say they want, what they really want, and similar. '
    + 'You never write story text, dialogue, or commentary. You reply only with variable updates in the exact line format requested.';

const GUIDANCE_WITH_INSTRUCTION = 'Instruction from the user:\n';
const GUIDANCE_FROM_CHAT =
    'No instruction was given: read the recent chat and update only what it shows has changed for the character since these values were set '
    + '(new clothes, a new stated purpose, a shifted true aim). If the chat shows no change, reply NO CHANGES.';

// Card fields that can read a variable. Card-level only; lore is loaded separately.
const CARD_FIELDS = ['description', 'personality', 'scenario', 'first_mes', 'mes_example', 'system_prompt', 'post_history_instructions'];

// ─── Module State ───

let moduleSettings = null;
let saveSettingsFn = null;
let debug = () => {};

let activePopup = null;
let activeBody = null;
let activeCharacter = null;   // { avatar, name }
let openChatId = null;
let rows = [];                // see buildRowState()
let isGenerating = false;
let abortRequested = false;
let forceClose = false;       // closing for a chat change: skip the discard prompt

// Context options persist across opens (like ACC); the instruction doesn't,
// since it's specific to one character and moment.
const persistedModalState = {
    useChatContext: true,
    selectedLoreBooks: [],
};

let groupObserver = null;
let groupScanScheduled = false;

// ─── Init ───

/**
 * Initialize Character State. Called once from index.js.
 * @param {object} opts - { settings, saveSettings }
 */
export function initCharacterState({ settings, saveSettings }) {
    moduleSettings = settings;
    saveSettingsFn = saveSettings;
    debug = createDebugLogger('CharacterState', () => moduleSettings.characterStateDebugMode);
    debug('Module initialized');
}

// ─── Character Resolution ───

function findCharacterByAvatar(avatar) {
    if (!avatar) return null;
    return getContext().characters?.find(c => c?.avatar === avatar) || null;
}

/** Group members (or the solo character) of the open chat, as character objects. */
function chatCharacters() {
    const ctx = getContext();
    if (ctx.groupId) {
        const group = ctx.groups?.find(g => g.id === ctx.groupId);
        return (group?.members || []).map(findCharacterByAvatar).filter(Boolean);
    }
    const char = ctx.characters?.[ctx.characterId];
    return char ? [char] : [];
}

function currentChatId() {
    const ctx = getContext();
    return (typeof ctx.getCurrentChatId === 'function' ? ctx.getCurrentChatId() : ctx.chatId) || null;
}

// ─── Variable Discovery ───

/** Lore books tied to a character: its primary (linked) book plus any additional books. */
function entryTexts(entries) {
    return Object.values(entries || {})
        .filter(e => e && !e.disable && typeof e.content === 'string' && e.content.includes('{{'))
        .map(e => e.content);
}

/**
 * Every text the character's prompt can read variables from: the card
 * fields, the character note, and the entries of its lore books (the linked
 * book, else the card's embedded one, plus additional books).
 */
async function collectCharacterSources(char) {
    const sources = [];
    const cardText = CARD_FIELDS
        .map(field => char?.[field] ?? char?.data?.[field])
        .concat(char?.data?.extensions?.depth_prompt?.prompt)
        .filter(text => typeof text === 'string' && text)
        .join('\n');
    if (cardText) sources.push({ source: 'card', text: cardText });

    const primary = char?.data?.extensions?.world || null;
    let primaryLoaded = false;
    for (const book of characterLoreBooks(char, world_info?.charLore)) {
        if (Array.isArray(world_names) && !world_names.includes(book)) continue;
        try {
            const data = await loadWorldInfo(book);
            if (!data?.entries) continue;
            if (book === primary) primaryLoaded = true;
            for (const text of entryTexts(data.entries)) sources.push({ source: 'lore', book, text });
        } catch (err) {
            console.error(`Saints-Silly-Extensions: Character State failed to load lore book "${book}":`, err);
        }
    }
    // The card's embedded book stands in when its linked copy isn't loaded:
    // a card imported without importing its book still links the book's name.
    if (!primaryLoaded && Array.isArray(char?.data?.character_book?.entries)) {
        const book = char.data.character_book.name || primary || 'Embedded lore book';
        const embedded = char.data.character_book.entries.map(e => ({ content: e?.content, disable: e?.enabled === false }));
        for (const text of entryTexts(embedded)) sources.push({ source: 'lore', book, text });
    }
    return sources;
}

function readStoredVariable(name) {
    const vars = getContext().chatMetadata?.variables;
    if (!vars || vars[name] === undefined) return { isSet: false, value: '' };
    const raw = vars[name];
    return { isSet: true, value: typeof raw === 'string' ? raw : JSON.stringify(raw) };
}

function buildRowState(variable, characterName) {
    const original = readStoredVariable(variable.name);
    return {
        name: variable.name,
        label: variable.label || humanizeVariableName(variable.name, characterName),
        source: variable.source,
        book: variable.book,
        defaultValue: variable.defaultValue,
        original,
        pending: { ...original },
        proposed: false,
        el: null,
    };
}

function isDirty(row) {
    if (row.pending.isSet !== row.original.isSet) return true;
    return row.pending.isSet && row.pending.value !== row.original.value;
}

// ─── Launch Points ───

/** Open the Character State pane for a character (by avatar filename). */
export async function openCharacterStateModal(avatar) {
    if (!moduleSettings?.characterStateEnabled) return;
    if (activePopup) {
        toast('Character State is already open.', 'info');
        return;
    }
    const char = findCharacterByAvatar(avatar);
    if (!char) {
        toast('Character not found.', 'warning');
        return;
    }
    const chatId = currentChatId();
    if (!chatId) {
        toast('Open a chat first: state variables are stored per chat.', 'warning');
        return;
    }

    const sources = await collectCharacterSources(char);
    const variables = discoverVariables(sources);
    debug('Discovered variables for', char.name, variables);

    activeCharacter = { avatar: char.avatar, name: char.name };
    openChatId = chatId;
    rows = variables.map(v => buildRowState(v, char.name));
    isGenerating = false;
    abortRequested = false;
    forceClose = false;

    const body = buildModalBody(char);
    const popup = new Popup(body, POPUP_TYPE.TEXT, '', {
        okButton: 'Apply',
        cancelButton: 'Close',
        wide: true,
        allowVerticalScrolling: true,
        onOpen: () => {
            refreshAllRows();
            refreshApplyState();
            debug('Modal opened for', char.name);
        },
        onClosing: (p) => {
            if (forceClose) return true;
            if (p.result === POPUP_RESULT.AFFIRMATIVE) {
                if (isGenerating) {
                    toast('Wait for the update to finish (or Stop it) before applying.', 'warning');
                    return false;
                }
                return true;
            }
            if (!isGenerating && rows.some(isDirty)
                && !window.confirm('Discard the changes you haven\'t applied?')) {
                return false;
            }
            if (isGenerating) {
                abortRequested = true;
                stopGeneration();
            }
            return true;
        },
    });
    activePopup = popup;
    activeBody = body;

    try {
        const result = await popup.show();
        if (result === POPUP_RESULT.AFFIRMATIVE) await applyChanges();
    } finally {
        capturePersistedModalState(body);
        activePopup = null;
        activeBody = null;
        activeCharacter = null;
        openChatId = null;
        rows = [];
        isGenerating = false;
        abortRequested = false;
        forceClose = false;
        debug('Modal closed');
    }
}

function capturePersistedModalState(body) {
    if (!body) return;
    persistedModalState.useChatContext = !!body.querySelector('#cs_use_chat_context')?.checked;
    const picker = body._csLorebookPicker;
    persistedModalState.selectedLoreBooks = picker ? picker.getSelected() : [];
    const tokenInput = body.querySelector('#cs_response_length');
    const parsed = tokenInput ? parseInt(tokenInput.value, 10) : NaN;
    if (!isNaN(parsed) && parsed > 0 && parsed !== moduleSettings.characterStateResponseLength) {
        moduleSettings.characterStateResponseLength = parsed;
        saveSettingsFn?.();
    }
}

/** Close the pane if the chat it was opened for is no longer the open chat. */
export function onCharacterStateChatChanged() {
    syncCharacterStateButtons();
    if (!activePopup || currentChatId() === openChatId) return;
    debug('Chat changed under the open pane; closing without applying');
    if (isGenerating) {
        abortRequested = true;
        stopGeneration();
    }
    forceClose = true;
    activePopup.completeCancelled();
    toast('Chat changed: Character State closed without applying.', 'info');
}

// ─── Modal Body ───

function buildModalBody(char) {
    const root = document.createElement('div');
    root.className = 'cs-modal-body';

    const header = document.createElement('div');
    header.className = 'cs-header';
    const avatarUrl = getContext().getThumbnailUrl?.('avatar', char.avatar);
    if (avatarUrl) {
        const img = document.createElement('img');
        img.className = 'cs-header-avatar';
        img.src = avatarUrl;
        img.alt = '';
        header.appendChild(img);
    }
    const title = document.createElement('h3');
    title.className = 'cs-header-title';
    title.textContent = `Character State: ${char.name}`;
    header.appendChild(title);
    root.appendChild(header);

    const list = document.createElement('div');
    list.className = 'cs-variable-list';
    if (!rows.length) {
        const empty = document.createElement('div');
        empty.className = 'cs-empty';
        empty.textContent = `${char.name}'s card and lore books read no chat variables. `
            + 'A field written like "Clothing: {{ .nameClothingOverride ?? default }};" in the card description or a linked lore book shows up here.';
        list.appendChild(empty);
    }
    for (const row of rows) list.appendChild(buildVariableRow(row));
    root.appendChild(list);

    if (rows.length) {
        const assist = buildAssistSection();
        root._csLorebookPicker = assist._csLorebookPicker;
        root.appendChild(assist);
    }
    return root;
}

function buildVariableRow(row) {
    const wrap = document.createElement('div');
    wrap.className = 'cs-variable';

    const head = document.createElement('div');
    head.className = 'cs-variable-head';

    const label = document.createElement('b');
    label.className = 'cs-variable-label';
    label.textContent = row.label;
    head.appendChild(label);

    const name = document.createElement('code');
    name.className = 'cs-variable-name';
    name.textContent = `.${row.name}`;
    head.appendChild(name);

    const source = document.createElement('span');
    source.className = 'cs-variable-source';
    if (row.source === 'lore') {
        source.innerHTML = '<span class="fa-solid fa-book"></span> ';
        source.appendChild(document.createTextNode(row.book || 'Lore book'));
        source.title = `Read by an entry in the lore book "${row.book}"`;
    } else {
        source.innerHTML = '<span class="fa-solid fa-id-card"></span> Card';
        source.title = 'Read by the character card';
    }
    head.appendChild(source);

    const status = document.createElement('span');
    status.className = 'cs-variable-status';
    head.appendChild(status);

    const undoBtn = document.createElement('div');
    undoBtn.className = 'menu_button interactable cs-row-btn';
    undoBtn.title = 'Undo: back to the value this chat has now';
    undoBtn.innerHTML = '<span class="fa-solid fa-rotate-left"></span>';
    undoBtn.addEventListener('click', () => {
        if (isGenerating) return;
        row.pending = { ...row.original };
        row.proposed = false;
        refreshRow(row);
        refreshApplyState();
    });
    head.appendChild(undoBtn);

    const resetBtn = document.createElement('div');
    resetBtn.className = 'menu_button interactable cs-row-btn';
    resetBtn.title = row.defaultValue !== null
        ? 'Reset: unset the variable so the card default applies'
        : 'Reset: unset the variable';
    resetBtn.innerHTML = '<span class="fa-solid fa-eraser"></span>';
    resetBtn.addEventListener('click', () => {
        if (isGenerating) return;
        row.pending = { isSet: false, value: '' };
        row.proposed = false;
        refreshRow(row);
        refreshApplyState();
    });
    head.appendChild(resetBtn);

    wrap.appendChild(head);

    const textarea = document.createElement('textarea');
    textarea.className = 'text_pole cs-variable-value';
    textarea.rows = 2;
    textarea.placeholder = row.defaultValue !== null ? '(card default is empty)' : '(unset)';
    textarea.addEventListener('input', () => {
        const value = textarea.value;
        // An emptied field means "unset": the card default applies again.
        row.pending = value.trim() ? { isSet: true, value } : { isSet: false, value: '' };
        row.proposed = false;
        refreshRow(row, { keepText: true });
        refreshApplyState();
    });
    wrap.appendChild(textarea);

    row.el = { wrap, status, textarea, undoBtn, resetBtn };
    return wrap;
}

function effectiveText(row) {
    return row.pending.isSet ? row.pending.value : (row.defaultValue ?? '');
}

function refreshRow(row, { keepText = false } = {}) {
    if (!row.el) return;
    const { wrap, status, textarea, undoBtn, resetBtn } = row.el;
    if (!keepText) textarea.value = effectiveText(row);

    const dirty = isDirty(row);
    let text;
    if (row.proposed) text = 'Proposed';
    else if (dirty && !row.pending.isSet) text = 'Will reset to default';
    else if (dirty) text = 'Changed';
    else if (row.pending.isSet) text = 'Set in this chat';
    else text = row.defaultValue !== null ? 'Card default' : 'Unset';
    status.textContent = text;

    wrap.classList.toggle('cs-dirty', dirty);
    wrap.classList.toggle('cs-proposed', row.proposed);
    wrap.classList.toggle('cs-default', !row.pending.isSet);
    undoBtn.classList.toggle('cs-disabled', !dirty);
    resetBtn.classList.toggle('cs-disabled', !row.pending.isSet);
}

function refreshAllRows() {
    for (const row of rows) refreshRow(row);
}

function refreshApplyState() {
    const count = rows.filter(isDirty).length;
    const okBtn = activePopup?.okButton;
    if (okBtn) {
        okBtn.textContent = count ? `Apply (${count})` : 'Apply';
        okBtn.classList.toggle('disabled', isGenerating);
    }
}

function buildAssistSection() {
    const section = document.createElement('div');
    section.className = 'cs-assist-section';
    section.innerHTML = `
        <div class="cs-assist-title"><span class="fa-solid fa-wand-magic-sparkles"></span> <b>Update with AI</b></div>
        <div class="acc-context-section cs-context-section">
            <label class="checkbox_label" title="Give the model the character cards, the chat's relevant World Info, and the recent chat. Needed when the instruction is left blank.">
                <input id="cs_use_chat_context" type="checkbox" />
                <span>Use Chat Context</span>
            </label>
            <div class="cs-lorebook-host"></div>
        </div>
        <div class="acc-preset-row cs-preset-row">
            <label class="acc-preset-label"><span class="fa-solid fa-file-pen"></span> Prompt Preset:</label>
            <div class="cs-preset-host"></div>
        </div>
        <textarea id="cs_instruction" class="text_pole cs-instruction" rows="3" placeholder="How should these change? e.g. &quot;She changes into a swimsuit for the beach&quot;. Leave blank to update from what happened in the recent chat."></textarea>
        <div class="cs-action-row">
            <div id="cs_generate_btn" class="menu_button interactable acc-action-btn acc-generate-btn" title="Ask the model for new values. Proposals fill the fields above; nothing is saved until Apply.">
                <span class="fa-solid fa-wand-magic-sparkles"></span> Propose Changes
            </div>
            <div id="cs_revert_btn" class="menu_button interactable acc-action-btn" title="Undo every change in this pane">
                <span class="fa-solid fa-rotate-left"></span> Revert All
            </div>
            <label class="acc-tokens-label" for="cs_response_length" title="Maximum tokens for the model's reply">
                <span class="fa-solid fa-coins"></span> Max Tokens:
            </label>
            <input id="cs_response_length" type="number" class="text_pole acc-tokens-input" min="50" max="8192" step="50" />
        </div>
        <div class="acc-status-bar acc-hidden" id="cs_status_bar">
            <span class="fa-solid fa-spinner fa-spin"></span>
            <span id="cs_status_text"></span>
        </div>
        <details class="cs-reply-details">
            <summary>Model reply</summary>
            <textarea id="cs_reply" class="text_pole cs-reply" rows="5" readonly placeholder="The model's raw reply appears here."></textarea>
        </details>
    `;

    const chatCb = section.querySelector('#cs_use_chat_context');
    chatCb.checked = !!persistedModalState.useChatContext;

    const tokenInput = section.querySelector('#cs_response_length');
    tokenInput.value = String(getSavedResponseLength());
    tokenInput.addEventListener('change', () => {
        const parsed = parseInt(tokenInput.value, 10);
        if (!isNaN(parsed) && parsed > 0) {
            moduleSettings.characterStateResponseLength = parsed;
            saveSettingsFn?.();
        }
    });

    const picker = createLoreBookPicker({
        classPrefix: 'acc-lorebook',
        initialSelection: persistedModalState.selectedLoreBooks.slice(),
        debug,
    });
    section.querySelector('.cs-lorebook-host').replaceWith(picker.element);
    section._csLorebookPicker = picker;

    section.querySelector('.cs-preset-host').replaceWith(createToolPresetSelector({
        toolKey: 'character-state',
        className: 'acc-preset-select',
        title: 'Prompt preset used for Propose Changes. Save and edit presets in the extension settings.',
    }));

    section.querySelector('#cs_generate_btn').addEventListener('click', handleGenerate);
    section.querySelector('#cs_revert_btn').addEventListener('click', () => {
        if (isGenerating) return;
        for (const row of rows) {
            row.pending = { ...row.original };
            row.proposed = false;
        }
        refreshAllRows();
        refreshApplyState();
    });
    return section;
}

// ─── Apply ───

async function applyChanges() {
    const changed = rows.filter(isDirty);
    if (!changed.length) return;
    if (currentChatId() !== openChatId) {
        toast('The chat changed since this pane opened; nothing was applied.', 'warning');
        return;
    }

    const ctx = getContext();
    const local = ctx.variables?.local;
    if (!ctx.chatMetadata.variables) ctx.chatMetadata.variables = {};
    for (const row of changed) {
        if (row.pending.isSet) {
            const value = row.pending.value.trim();
            if (local?.set) local.set(row.name, value);
            else ctx.chatMetadata.variables[row.name] = value;
        } else if (local?.del) {
            if (local.has?.(row.name) ?? true) local.del(row.name);
        } else {
            delete ctx.chatMetadata.variables[row.name];
        }
        debug('Applied', row.name, row.pending.isSet ? '=' : 'unset', row.pending.value);
    }
    await ctx.saveMetadata?.();
    const who = activeCharacter?.name || 'the character';
    toast(`Updated ${changed.length} variable${changed.length === 1 ? '' : 's'} for ${who}.`, 'success');
}

// ─── Generation ───

function readModalContextOptions() {
    const includeChat = !!document.getElementById('cs_use_chat_context')?.checked;
    const picker = activeBody?._csLorebookPicker;
    const loreBookNames = picker ? picker.getSelected() : [];
    return { includeChat, loreBookNames };
}

async function handleGenerate() {
    if (isGenerating) {
        abortRequested = true;
        stopGeneration();
        return;
    }
    const instruction = document.getElementById('cs_instruction')?.value?.trim() || '';
    const ctxOptions = readModalContextOptions();
    if (!instruction && !ctxOptions.includeChat) {
        toast('Write an instruction, or turn on Use Chat Context so the model can update from the recent chat.', 'warning');
        return;
    }
    await runGeneration(instruction, ctxOptions);
}

async function runGeneration(instruction, ctxOptions) {
    isGenerating = true;
    abortRequested = false;
    setGeneratingUI(true);
    setStatusBar(instruction ? 'Proposing changes...' : 'Reading the recent chat for changes...');

    const replyEl = document.getElementById('cs_reply');
    try {
        const reply = await generateReply(instruction, ctxOptions, replyEl);
        if (abortRequested) {
            debug('Generation stopped; proposals discarded');
            return;
        }
        if (replyEl) replyEl.value = reply;
        const count = applyProposals(reply);
        if (count) {
            toast(`${count} change${count === 1 ? '' : 's'} proposed. Review them, then Apply.`, 'success');
        } else if (/NO CHANGES/i.test(reply) || !reply.trim()) {
            toast('The model proposed no changes.', 'info');
        } else {
            toast('Couldn\'t read any changes from the reply. See Model reply.', 'warning');
            const details = activeBody?.querySelector('.cs-reply-details');
            if (details) details.open = true;
        }
    } catch (err) {
        if (isSilentGenerationAbort(err)) {
            debug('Generation aborted via cancellation');
        } else if (!abortRequested) {
            console.error('Character State generation error:', err);
            toast(`Generation failed: ${err.message}`, 'error');
        }
    } finally {
        isGenerating = false;
        abortRequested = false;
        setGeneratingUI(false);
        setStatusBar(null);
        refreshApplyState();
    }
}

/** Fill the fields with the proposed values; returns how many rows changed. */
function applyProposals(reply) {
    let count = 0;
    for (const { name, value } of parseStateReply(reply, rows)) {
        const row = rows.find(r => r.name === name);
        if (!row || value === effectiveText(row)) continue;
        row.pending = { isSet: true, value };
        row.proposed = true;
        refreshRow(row);
        count++;
    }
    debug('Proposals applied to fields:', count);
    return count;
}

function currentVariableRows() {
    return rows.map(row => ({
        name: row.name,
        label: row.label,
        value: row.pending.value,
        isSet: row.pending.isSet,
        defaultValue: row.defaultValue,
    }));
}

function composeGuidance(instruction) {
    return instruction ? `${GUIDANCE_WITH_INSTRUCTION}${instruction}` : GUIDANCE_FROM_CHAT;
}

/**
 * Assemble the user prompt. {{context}}, {{character}}, {{variables}} and
 * {{guidance}} are substituted in place; a template missing {{variables}}
 * or {{guidance}} gets them appended, and one missing {{context}} gets the
 * context prepended, so a trimmed custom template still works.
 */
function composePrompt(preambleBlock, characterName, variablesBlock, guidance) {
    const { text, used } = applyTemplateMacros(getPromptTemplate(), {
        context: preambleBlock || '',
        character: characterName,
        variables: variablesBlock,
        guidance,
    });
    let prompt = text;
    if (!used.has('context') && preambleBlock) prompt = preambleBlock + prompt;
    if (!used.has('variables')) prompt = `${prompt}\n\nCurrent variables:\n${variablesBlock}`;
    if (!used.has('guidance')) prompt = `${prompt}\n\n${guidance}`;
    return prompt;
}

async function generateReply(instruction, ctxOptions, replyEl) {
    const preambleBlock = await buildPreambleBlock(ctxOptions);
    const prompt = composePrompt(
        preambleBlock,
        activeCharacter?.name || 'the character',
        formatVariablesBlock(currentVariableRows()),
        composeGuidance(instruction),
    );
    const systemPrompt = CHARACTER_STATE_SYSTEM_PROMPT;
    const responseLength = getResponseLength();
    const prefill = getPrefill();

    debug('System prompt:', systemPrompt);
    debug('Prompt:', prompt);
    debug('Prefill:', prefill);

    const result = await withSingleLineDisabled(() => streamingGenerate(
        { prompt, systemPrompt, responseLength, ...(prefill ? { prefill } : {}) },
        replyEl,
        { append: false, name: 'character-state' },
    ));
    const cleaned = stripPrefillEcho(removeReasoningFromString(result).trim(), prefill);
    return (prefill || '') + cleaned;
}

async function buildPreambleBlock(ctxOptions) {
    if (!ctxOptions.includeChat && !ctxOptions.loreBookNames.length) return '';
    const preamble = await buildContextPreamble({
        ...ctxOptions,
        responseLength: getResponseLength(),
        maxContextOverride: moduleSettings?.characterStateMaxContextOverride || 0,
    });
    if (!preamble) return '';
    debug('Context preamble length:', preamble.length);
    return `Story context (for reference; do not repeat it):\n${preamble}\n\n`;
}

function getPromptTemplate() {
    return templateSetting(moduleSettings, 'characterStatePrompt', DEFAULT_CHARACTER_STATE_PROMPT);
}

function getPrefill() {
    return textSetting(moduleSettings, 'characterStatePrefill', DEFAULT_CHARACTER_STATE_PREFILL);
}

function getResponseLength() {
    return parsePositiveInt(document.getElementById('cs_response_length')?.value) ?? getSavedResponseLength();
}

function getSavedResponseLength() {
    return positiveIntSetting(moduleSettings, 'characterStateResponseLength', DEFAULT_CHARACTER_STATE_RESPONSE_LENGTH);
}

function stopGeneration() {
    // abortAllGenerations (not just a local abort) so ST's GENERATION_STOPPED
    // fires and the backend request is actually cancelled.
    abortAllGenerations('character-state-cancel');
    debug('Stop generation triggered');
}

// ─── Modal UI Helpers ───

const GENERATE_LABEL = '<span class="fa-solid fa-wand-magic-sparkles"></span> Propose Changes';

function setGeneratingUI(generating) {
    const btn = document.getElementById('cs_generate_btn');
    if (btn) btn.innerHTML = generating ? '<span class="fa-solid fa-stop"></span> Stop' : GENERATE_LABEL;
    document.getElementById('cs_revert_btn')?.classList.toggle('acc-disabled', generating);
    const instruction = document.getElementById('cs_instruction');
    if (generating) instruction?.setAttribute('disabled', 'true');
    else instruction?.removeAttribute('disabled');
    for (const row of rows) {
        if (!row.el) continue;
        if (generating) row.el.textarea.setAttribute('disabled', 'true');
        else row.el.textarea.removeAttribute('disabled');
    }
    refreshApplyState();
}

function setStatusBar(message) {
    const bar = document.getElementById('cs_status_bar');
    const text = document.getElementById('cs_status_text');
    if (!bar || !text) return;
    if (message) {
        text.textContent = message;
        bar.classList.remove('acc-hidden');
    } else {
        bar.classList.add('acc-hidden');
    }
}

// ─── Group Member Row Buttons ───

// Sits in each member row's icon strip, right after Possession's radio. The
// member list is re-rendered by ST (group edits, paging, search), so an
// observer on #rm_group_members keeps the buttons present.

function injectGroupButtons() {
    if (!moduleSettings?.characterStateEnabled || !getContext().groupId) return;
    document.querySelectorAll('#rm_group_members .group_member').forEach(entry => {
        if (entry.querySelector('.character_state_btn')) return;
        const char = resolveGroupMemberRow(entry, getContext().characters).character;
        if (!char) return;

        const btn = document.createElement('div');
        btn.className = 'character_state_btn right_menu_button fa-solid fa-sliders';
        btn.title = `Character State: ${char.name}`;
        btn.dataset.avatar = char.avatar;
        btn.addEventListener('click', (event) => {
            event.stopPropagation();
            openCharacterStateModal(btn.dataset.avatar);
        });

        const icons = entry.querySelector('.group_member_icon');
        if (!icons) return;
        const possession = icons.querySelector('.possession_radio_wrapper');
        if (possession) possession.after(btn);
        else icons.insertBefore(btn, icons.firstChild);
    });
}

function removeGroupButtons() {
    document.querySelectorAll('.character_state_btn').forEach(el => el.remove());
}

function scheduleGroupScan() {
    if (groupScanScheduled) return;
    groupScanScheduled = true;
    setTimeout(() => {
        groupScanScheduled = false;
        injectGroupButtons();
    }, 0);
}

export function startCharacterStateObserver() {
    if (groupObserver) return;
    const list = document.getElementById('rm_group_members');
    if (!list) return;
    groupObserver = new MutationObserver(scheduleGroupScan);
    groupObserver.observe(list, { childList: true, subtree: true });
    scheduleGroupScan();
}

// ─── Solo Character Panel Button ───

function injectSoloButton() {
    if (!moduleSettings?.characterStateEnabled || getContext().groupId) return;
    if (document.getElementById('character_state_solo_btn')) return;
    const target = document.querySelector('#form_create .ch_creation_btn_row, #form_create .form_create_bottom_buttons_block');
    if (!target) return;

    const btn = document.createElement('div');
    btn.id = 'character_state_solo_btn';
    btn.classList.add('menu_button', 'interactable');
    btn.title = 'Character State: view and update this character\'s state variables';
    btn.innerHTML = '<span class="fa-solid fa-sliders"></span>';
    btn.addEventListener('click', () => {
        const ctx = getContext();
        const char = ctx.groupId ? null : ctx.characters?.[ctx.characterId];
        if (!char) {
            toast('Open a character\'s chat first.', 'warning');
            return;
        }
        openCharacterStateModal(char.avatar);
    });
    target.appendChild(btn);
    debug('Solo panel button injected');
}

function removeSoloButton() {
    document.getElementById('character_state_solo_btn')?.remove();
}

/** Add or remove the launch buttons to match the setting and chat type. */
export function syncCharacterStateButtons() {
    if (!moduleSettings?.characterStateEnabled) {
        removeGroupButtons();
        removeSoloButton();
        return;
    }
    if (getContext().groupId) {
        removeSoloButton();
        injectGroupButtons();
    } else {
        removeGroupButtons();
        injectSoloButton();
    }
}

export function onCharacterStateCharacterPageLoaded() {
    syncCharacterStateButtons();
}

export function onCharacterStateGroupUpdated() {
    scheduleGroupScan();
}

// ─── Settings Bindings ───

export function bindCharacterStateSettings(saveSettings) {
    const bindCheckbox = (id, key, after) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.checked = !!moduleSettings[key];
        el.addEventListener('change', () => {
            moduleSettings[key] = el.checked;
            saveSettings();
            after?.();
        });
    };
    bindCheckbox('character_state_enabled', 'characterStateEnabled', syncCharacterStateButtons);
    bindCheckbox('character_state_debug_mode', 'characterStateDebugMode');

    const bindTextarea = (id, key, fallback) => {
        const el = document.getElementById(id);
        if (!el) return;
        const stored = moduleSettings[key];
        el.value = typeof stored === 'string' ? stored : fallback;
        el.addEventListener('input', () => {
            moduleSettings[key] = el.value;
            saveSettings();
        });
    };
    bindTextarea('character_state_prompt_textarea', 'characterStatePrompt', DEFAULT_CHARACTER_STATE_PROMPT);
    bindTextarea('character_state_prefill_textarea', 'characterStatePrefill', DEFAULT_CHARACTER_STATE_PREFILL);

    const bindNumber = (id, key, fallback) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = moduleSettings[key] || fallback;
        el.addEventListener('input', () => {
            const n = parseInt(el.value, 10);
            moduleSettings[key] = Number.isFinite(n) && n > 0 ? n : fallback;
            saveSettings();
        });
    };
    bindNumber('character_state_response_length', 'characterStateResponseLength', DEFAULT_CHARACTER_STATE_RESPONSE_LENGTH);
    bindNumber('character_state_max_context_override', 'characterStateMaxContextOverride', 0);

    document.getElementById('character_state_preview_btn')
        ?.addEventListener('click', showCharacterStatePromptPreview);
}

function showCharacterStatePromptPreview() {
    const sampleContext = 'Story context (for reference; do not repeat it):\n'
        + '(character cards, the chat\'s relevant World Info, selected lore books, and recent chat: '
        + 'included when enabled in the pane)\n\n';
    const sampleVariables = formatVariablesBlock([
        { name: 'peterClothingOverride', label: 'Clothing', value: 'Board shorts, a borrowed rash guard', isSet: true, defaultValue: null },
        { name: 'peterStatedGoalOverride', label: 'Stated Goal', value: '', isSet: false, defaultValue: 'Land steady work' },
    ]);
    const prompt = composePrompt(sampleContext, 'Peter', sampleVariables, `${GUIDANCE_WITH_INSTRUCTION}(your instruction)`);
    showPromptPreview('Character State: Prompt Preview', [
        { label: 'System Prompt (fixed)', text: CHARACTER_STATE_SYSTEM_PROMPT },
        { label: 'User Prompt (template with sample values)', text: prompt },
        { label: 'Prefill (assistant prefix)', text: getPrefill() || '(none)' },
        { label: '{{guidance}} when the instruction is blank', text: GUIDANCE_FROM_CHAT },
    ]);
}

// ─── Slash Command ───

function findChatCharacter(query) {
    const q = String(query || '').trim().toLowerCase();
    const cast = chatCharacters();
    if (!q) return cast.length === 1 ? cast[0] : null;
    return cast.find(c => c.name?.toLowerCase() === q)
        || cast.find(c => c.avatar?.toLowerCase() === q)
        || cast.find(c => c.name?.toLowerCase().startsWith(q))
        || null;
}

export function registerCharacterStateSlashCommand() {
    if (typeof SlashCommandParser?.addCommandObject !== 'function') return;
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'charstate',
        callback: (_named, unnamed) => {
            if (!moduleSettings?.characterStateEnabled) {
                toast('Character State is disabled in the extension settings.', 'warning');
                return '';
            }
            const char = findChatCharacter(unnamed);
            if (!char) {
                toast(getContext().groupId
                    ? 'Name a group member: /charstate <name>'
                    : 'No character in this chat by that name.', 'warning');
                return '';
            }
            openCharacterStateModal(char.avatar);
            return '';
        },
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'Character name (required in group chats)',
                typeList: [ARGUMENT_TYPE.STRING],
                isRequired: false,
            }),
        ],
        helpString: 'Open the Character State pane for a character in this chat: view, edit, or AI-update the chat variables their card and lore read (e.g. clothing and goal overrides).',
    }));
    debug('Registered /charstate slash command');
}
