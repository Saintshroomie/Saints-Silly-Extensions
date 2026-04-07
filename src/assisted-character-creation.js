/**
 * Assisted Character Creation (ACC)
 *
 * Modal-based character creation with per-field LLM assist, YOLO mode,
 * reverse mapping, and schema management.
 */

import { generateRaw } from '../../../../../script.js';
import { removeReasoningFromString } from '../../../../reasoning.js';
import {
    createDebugLogger,
    toast,
    buildContextPreamble,
    getAvailableLoreBookNames,
} from './utils.js';
import { DEFAULT_SCHEMA, validateSchema, getOrderedFields } from './default-character-schema.js';
import { tryParseCharacterData } from './schema-validation.js';

// ─── Module State ───

let moduleSettings = null;
let debug = () => {};
let saveSettingsFn = null;

// Modal state
let activeFieldKey = null;   // which field is currently generating
let fieldStates = {};        // per-field state: { originalSeed, currentValue, hasGenerated, prose, tokenOverride }
let currentSchema = null;    // the active schema object
let abortRequested = false;  // flag to discard result after stop

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

// ─── Prose State Persistence ───

/**
 * Get the saved prose states for a given schema, keyed by field name.
 * Returns an object like { fieldKey: boolean }.
 */
function getSavedProseStates(schemaName) {
    if (!moduleSettings.accProseStates) moduleSettings.accProseStates = {};
    return moduleSettings.accProseStates[schemaName] || {};
}

/**
 * Save a single field's prose state to settings.
 */
function saveProseState(schemaName, fieldKey, isProse) {
    if (!moduleSettings.accProseStates) moduleSettings.accProseStates = {};
    if (!moduleSettings.accProseStates[schemaName]) moduleSettings.accProseStates[schemaName] = {};
    moduleSettings.accProseStates[schemaName][fieldKey] = isProse;
    if (saveSettingsFn) saveSettingsFn();
}

/**
 * Look up the prose state for a field. Falls back to false (text field).
 */
function getFieldProseState(schemaName, fieldKey) {
    const saved = getSavedProseStates(schemaName);
    return saved[fieldKey] ?? false;
}

// ─── Schema Helpers ───

function getActiveSchema() {
    const name = moduleSettings.accActiveSchemaName;
    if (name === DEFAULT_SCHEMA.schemaName) return DEFAULT_SCHEMA;
    const custom = moduleSettings.accCustomSchemas?.[name];
    if (custom) return custom;
    // Fallback to default
    moduleSettings.accActiveSchemaName = DEFAULT_SCHEMA.schemaName;
    return DEFAULT_SCHEMA;
}

function getSchemaNames() {
    const names = [DEFAULT_SCHEMA.schemaName];
    if (moduleSettings.accCustomSchemas) {
        names.push(...Object.keys(moduleSettings.accCustomSchemas));
    }
    return names;
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
    const enabledCb = document.getElementById('acc_enabled');
    const debugCb = document.getElementById('acc_debug_mode');
    const schemaSelect = document.getElementById('acc_schema_select');
    const importBtn = document.getElementById('acc_import_schema');
    const exportBtn = document.getElementById('acc_export_schema');
    const deleteBtn = document.getElementById('acc_delete_schema');
    const fileInput = document.getElementById('acc_schema_file_input');

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

    // Populate schema selector
    populateSchemaSelect(schemaSelect);

    if (schemaSelect) {
        schemaSelect.addEventListener('change', () => {
            moduleSettings.accActiveSchemaName = schemaSelect.value;
            saveSettings();
        });
    }
    if (importBtn && fileInput) {
        importBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => handleSchemaImport(e, schemaSelect, saveSettings));
    }
    if (exportBtn) {
        exportBtn.addEventListener('click', () => handleSchemaExport());
    }
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => handleSchemaDelete(schemaSelect, saveSettings));
    }
}

function populateSchemaSelect(select) {
    if (!select) return;
    select.innerHTML = '';
    for (const name of getSchemaNames()) {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        if (name === moduleSettings.accActiveSchemaName) opt.selected = true;
        select.appendChild(opt);
    }
}

function handleSchemaImport(event, schemaSelect, saveSettings) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const schema = JSON.parse(e.target.result);
            const errors = validateSchema(schema);
            if (errors.length > 0) {
                toast('Invalid schema:\n' + errors.join('\n'), 'error');
                return;
            }
            if (schema.schemaName === DEFAULT_SCHEMA.schemaName) {
                toast('Cannot import a schema with the default schema name.', 'error');
                return;
            }
            if (!moduleSettings.accCustomSchemas) moduleSettings.accCustomSchemas = {};
            moduleSettings.accCustomSchemas[schema.schemaName] = schema;
            moduleSettings.accActiveSchemaName = schema.schemaName;
            saveSettings();
            populateSchemaSelect(schemaSelect);
            toast(`Schema "${schema.schemaName}" imported.`, 'success');
        } catch (err) {
            toast('Failed to parse schema JSON: ' + err.message, 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // reset file input
}

function handleSchemaExport() {
    const schema = getActiveSchema();
    const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schema.schemaName.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Schema exported.', 'success');
}

function handleSchemaDelete(schemaSelect, saveSettings) {
    const name = moduleSettings.accActiveSchemaName;
    if (name === DEFAULT_SCHEMA.schemaName) {
        toast('Cannot delete the default schema.', 'warning');
        return;
    }
    if (moduleSettings.accCustomSchemas) {
        delete moduleSettings.accCustomSchemas[name];
    }
    moduleSettings.accActiveSchemaName = DEFAULT_SCHEMA.schemaName;
    saveSettings();
    populateSchemaSelect(schemaSelect);
    toast(`Schema "${name}" deleted.`, 'success');
}

// ─── Modal ───

function openModal() {
    if (document.getElementById('acc_modal_overlay')) return;

    currentSchema = getActiveSchema();
    fieldStates = {};
    activeFieldKey = null;
    abortRequested = false;

    // Initialize field states
    const schemaName = currentSchema.schemaName;
    for (const [key] of getOrderedFields(currentSchema)) {
        fieldStates[key] = {
            originalSeed: '',
            currentValue: '',
            hasGenerated: false,
            prose: getFieldProseState(schemaName, key),
            tokenOverride: null,
        };
    }

    // Check if editing an existing character
    const descField = document.getElementById('description_textarea');
    const existingDesc = descField?.value?.trim() || '';

    const overlay = document.createElement('div');
    overlay.id = 'acc_modal_overlay';
    overlay.innerHTML = buildModalHTML(currentSchema, existingDesc);
    document.body.appendChild(overlay);

    // Close on overlay click (not on modal body)
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    // Wire up buttons
    document.getElementById('acc_close_btn')?.addEventListener('click', closeModal);
    document.getElementById('acc_cancel_btn')?.addEventListener('click', closeModal);
    document.getElementById('acc_done_btn')?.addEventListener('click', handleDone);
    document.getElementById('acc_yolo_btn')?.addEventListener('click', handleYolo);

    if (existingDesc) {
        document.getElementById('acc_reverse_map_btn')?.addEventListener('click', handleReverseMap);
    }

    // Lore book picker — update the summary count as books are toggled.
    const updateLoreBookSummary = () => {
        const label = document.getElementById('acc_lorebook_summary_label');
        if (!label) return;
        const checked = document.querySelectorAll('#acc_lorebook_list .acc-lorebook-cb:checked').length;
        label.textContent = checked > 0 ? `Lore Books (${checked})` : 'Lore Books';
    };
    document.querySelectorAll('#acc_lorebook_list .acc-lorebook-cb').forEach(cb => {
        cb.addEventListener('change', updateLoreBookSummary);
    });

    // Wire per-field buttons
    for (const [key] of getOrderedFields(currentSchema)) {
        const assistBtn = document.getElementById(`acc_assist_${key}`);
        const retryBtn = document.getElementById(`acc_retry_${key}`);
        const resetBtn = document.getElementById(`acc_reset_${key}`);
        const proseCb = document.getElementById(`acc_prose_${key}`);
        const tokenInput = document.getElementById(`acc_tokens_${key}`);
        const input = document.getElementById(`acc_field_${key}`);

        assistBtn?.addEventListener('click', () => onAssistClick(key));
        retryBtn?.addEventListener('click', () => onRetryClick(key));
        resetBtn?.addEventListener('click', () => onResetClick(key));

        // Prose toggle — swap input type and persist
        proseCb?.addEventListener('change', () => {
            fieldStates[key].prose = proseCb.checked;
            swapInputType(key, proseCb.checked);
            saveProseState(currentSchema.schemaName, key, proseCb.checked);
        });

        // Token override
        tokenInput?.addEventListener('input', () => {
            const val = parseInt(tokenInput.value);
            fieldStates[key].tokenOverride = isNaN(val) ? null : val;
        });

        // Track manual edits
        input?.addEventListener('input', () => {
            fieldStates[key].currentValue = input.value;
        });
    }

    debug('Modal opened');
}

function closeModal() {
    if (activeFieldKey) {
        abortRequested = true;
        stopGeneration();
    }
    const overlay = document.getElementById('acc_modal_overlay');
    if (overlay) overlay.remove();
    fieldStates = {};
    activeFieldKey = null;
    currentSchema = null;
    debug('Modal closed');
}

function buildModalHTML(schema, existingDesc) {
    const fields = getOrderedFields(schema);
    let fieldsHTML = '';

    for (const [key, field] of fields) {
        const isProse = getFieldProseState(schema.schemaName, key);
        const tokenDefault = field.responseLength ?? 200;

        fieldsHTML += `
            <div class="acc-field-group" data-field-key="${key}">
                <div class="acc-field-header">
                    <label class="acc-field-label" for="acc_field_${key}">${escapeHTML(field.label)}</label>
                    <div class="acc-field-controls">
                        <div class="acc-field-buttons">
                            <div id="acc_assist_${key}" class="acc-btn acc-btn-assist menu_button interactable" title="Assist">
                                <span class="fa-solid fa-wand-magic-sparkles"></span>
                            </div>
                            <div id="acc_retry_${key}" class="acc-btn acc-btn-retry menu_button interactable acc-hidden" title="Retry with original seed">
                                <span class="fa-solid fa-rotate-right"></span>
                            </div>
                            <div id="acc_reset_${key}" class="acc-btn acc-btn-reset menu_button interactable acc-hidden" title="Reset to original">
                                <span class="fa-solid fa-arrow-rotate-left"></span>
                            </div>
                        </div>
                        <label class="acc-prose-toggle" title="Toggle prose mode">
                            <input id="acc_prose_${key}" type="checkbox" ${isProse ? 'checked' : ''} />
                            <span class="acc-prose-label">Prose</span>
                        </label>
                        <div class="acc-token-label" title="Max tokens for generation (override)">
                            <span class="fa-solid fa-coins"></span>
                            <input id="acc_tokens_${key}" type="number" class="acc-token-input text_pole" min="10" max="4096" step="10" placeholder="${tokenDefault}" />
                        </div>
                    </div>
                </div>
                <div id="acc_input_wrap_${key}" class="acc-input-wrap">
                    <textarea id="acc_field_${key}" class="acc-field-input text_pole" rows="${isProse ? 5 : 1}" placeholder="${escapeAttr(field.description)}"></textarea>
                </div>
            </div>`;
    }

    const reverseMapBtn = existingDesc
        ? '<div id="acc_reverse_map_btn" class="menu_button interactable acc-reverse-btn"><span class="fa-solid fa-file-import"></span> Import from Existing</div>'
        : '';

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
                    <label class="checkbox_label" title="Prepend the current chat / character context to every per-field generation">
                        <input id="acc_use_chat_context" type="checkbox" />
                        <span>Use Chat Context</span>
                    </label>
                    <details class="acc-lorebook-picker" title="Prepend active entries from the selected lore books">
                        <summary><span class="fa-solid fa-book"></span> <span id="acc_lorebook_summary_label">Lore Books</span></summary>
                        <div id="acc_lorebook_list" class="acc-lorebook-list">${loreBookOptions}</div>
                    </details>
                </div>
                ${reverseMapBtn}
                <div class="acc-brief-section">
                    <label for="acc_character_brief"><b>Character Brief:</b></label>
                    <textarea id="acc_character_brief" class="text_pole" rows="3" placeholder="Describe your character concept, setting, and any key details..."></textarea>
                </div>
                <div class="acc-status-bar acc-hidden" id="acc_status_bar">
                    <span class="fa-solid fa-spinner fa-spin"></span>
                    <span id="acc_status_text"></span>
                </div>
                <div class="acc-fields-container">
                    ${fieldsHTML}
                </div>
            </div>
            <div class="acc-modal-footer">
                <!-- YOLO temporarily disabled
                <div id="acc_yolo_btn" class="menu_button interactable acc-yolo-btn">
                    <span class="fa-solid fa-bolt"></span> YOLO Generate All
                </div>
                -->
                <div class="acc-footer-right">
                    <div id="acc_cancel_btn" class="menu_button interactable">Cancel</div>
                    <div id="acc_done_btn" class="menu_button interactable acc-done-btn">Done</div>
                </div>
            </div>
        </div>`;
}

// ─── Input Type Swap ───

function swapInputType(fieldKey, toProse) {
    const textarea = document.getElementById(`acc_field_${fieldKey}`);
    if (!textarea) return;
    textarea.rows = toProse ? 3 : 1;
}

// ─── Per-Field Generation ───

async function onAssistClick(fieldKey) {
    if (activeFieldKey) {
        if (activeFieldKey === fieldKey) {
            // Stop current generation
            abortRequested = true;
            stopGeneration();
            return;
        }
        return; // another field generating, ignore
    }

    const input = document.getElementById(`acc_field_${fieldKey}`);
    if (!input) return;

    const isContinue = fieldStates[fieldKey].hasGenerated;

    // Save seed text before first generation
    if (!isContinue) {
        fieldStates[fieldKey].originalSeed = input.value;
    }

    activeFieldKey = fieldKey;
    abortRequested = false;
    setFieldGeneratingUI(fieldKey, true);
    const action = isContinue ? 'Continuing' : 'Generating';
    setStatusBar(`${action} ${currentSchema.fields[fieldKey].label}...`);

    try {
        const brief = document.getElementById('acc_character_brief')?.value || '';
        const ctxOptions = readModalContextOptions();
        const result = await generateFieldValue(fieldKey, currentSchema, fieldStates, brief, isContinue, ctxOptions);

        if (abortRequested) {
            debug(`Generation for ${fieldKey} aborted, discarding result`);
            return;
        }

        if (isContinue) {
            // Append to existing content
            const existing = input.value;
            const separator = existing.endsWith(' ') || existing.endsWith('\n') ? '' : ' ';
            input.value = existing + separator + result;
        } else {
            input.value = result;
        }
        fieldStates[fieldKey].currentValue = input.value;
        fieldStates[fieldKey].hasGenerated = true;
        debug(`Field ${fieldKey} ${isContinue ? 'continued' : 'generated'}:`, result.substring(0, 80));
    } catch (err) {
        if (!abortRequested) {
            console.error('ACC generation error:', err);
            toast(`Generation failed: ${err.message}`, 'error');
        }
    } finally {
        activeFieldKey = null;
        abortRequested = false;
        setFieldGeneratingUI(fieldKey, false);
        setStatusBar(null);
    }
}

async function onRetryClick(fieldKey) {
    const input = document.getElementById(`acc_field_${fieldKey}`);
    if (!input) return;

    // Restore original seed for re-generation
    input.value = fieldStates[fieldKey].originalSeed;
    fieldStates[fieldKey].currentValue = fieldStates[fieldKey].originalSeed;

    await onAssistClick(fieldKey);
}

function onResetClick(fieldKey) {
    const input = document.getElementById(`acc_field_${fieldKey}`);
    if (!input) return;

    input.value = fieldStates[fieldKey].originalSeed;
    fieldStates[fieldKey].currentValue = fieldStates[fieldKey].originalSeed;
    fieldStates[fieldKey].hasGenerated = false;

    // Hide retry/reset buttons, restore Assist icon
    const assistBtn = document.getElementById(`acc_assist_${fieldKey}`);
    const retryBtn = document.getElementById(`acc_retry_${fieldKey}`);
    const resetBtn = document.getElementById(`acc_reset_${fieldKey}`);
    if (assistBtn) {
        assistBtn.innerHTML = '<span class="fa-solid fa-wand-magic-sparkles"></span>';
        assistBtn.title = 'Assist';
    }
    retryBtn?.classList.add('acc-hidden');
    resetBtn?.classList.add('acc-hidden');
}

// ─── LLM Generation ───

/**
 * Read the modal-level "Use Chat Context" + selected lore books picker.
 * @returns {{ includeChat: boolean, loreBookNames: string[] }}
 */
function readModalContextOptions() {
    const includeChat = !!document.getElementById('acc_use_chat_context')?.checked;
    const loreBookNames = Array.from(
        document.querySelectorAll('#acc_lorebook_list .acc-lorebook-cb:checked'),
    ).map(el => el.value);
    return { includeChat, loreBookNames };
}

async function generateFieldValue(fieldKey, schema, states, characterBrief, isContinue = false, ctxOptions = null) {
    const field = schema.fields[fieldKey];
    const state = states[fieldKey];
    const isProse = state.prose;
    const responseLength = state.tokenOverride || field.responseLength || 200;
    const filledFields = buildFilledFieldsSummary(schema, states, fieldKey);

    // Optional preamble assembled from chat / character / lore books.
    let preambleBlock = '';
    if (ctxOptions && (ctxOptions.includeChat || (ctxOptions.loreBookNames && ctxOptions.loreBookNames.length))) {
        const preamble = await buildContextPreamble(ctxOptions);
        if (preamble) {
            preambleBlock = `Existing context to consider when generating (do not repeat verbatim):\n${preamble}\n\n`;
            debug(`[${fieldKey}] Context preamble length:`, preamble.length);
        }
    }

    let prompt;
    if (isContinue) {
        // Continue mode: ask to continue from where it left off
        const existingText = state.currentValue || '';
        prompt = `${preambleBlock}Continue writing the "${field.label}" field for this character. Pick up exactly where the text left off.\n\nCharacter Brief:\n${characterBrief || '(no brief provided)'}\n\nOther fields already defined:\n${filledFields || '(none yet)'}\n\nText so far:\n${existingText}\n\nContinue:`;
    } else {
        const seedText = state.currentValue || '';
        prompt = field.prompt
            .replace(/\{\{seedText\}\}/g, seedText || '(no user input)')
            .replace(/\{\{context\}\}/g, characterBrief || '(no brief provided)')
            .replace(/\{\{filledFields\}\}/g, filledFields || '(none yet)');
        prompt = `${preambleBlock}${prompt}\n\nRespond with only the value for "${field.label}":`;
    }

    const styleInstruction = isProse
        ? 'Write in descriptive prose.'
        : 'Be brief and concise. Use comma-separated descriptors, not full sentences.';

    const systemPrompt = `You are a character creation assistant. ${styleInstruction} Do not include labels, explanations, or extra formatting. Output only the field value.`;

    debug(`Generating field "${fieldKey}" (continue=${isContinue}, prose=${isProse}, tokens=${responseLength})`);
    debug(`[${fieldKey}] System prompt:`, systemPrompt);
    debug(`[${fieldKey}] Prompt:`, prompt);

    const result = await generateRaw({
        prompt,
        systemPrompt,
        responseLength,
    });

    let cleaned = removeReasoningFromString(result).trim();

    // Strip label echo
    if (cleaned.startsWith(field.label + ':')) {
        cleaned = cleaned.substring(field.label.length + 1).trim();
    }

    // Non-prose: trim to first newline
    if (!isProse && cleaned.includes('\n')) {
        cleaned = cleaned.split('\n')[0].trim();
    }

    return cleaned;
}

function buildFilledFieldsSummary(schema, states, excludeKey) {
    const parts = [];
    for (const [key, field] of getOrderedFields(schema)) {
        if (key === excludeKey) continue;
        const val = states[key]?.currentValue?.trim();
        if (val) {
            parts.push(`${field.label}: ${val}`);
        }
    }
    return parts.join('\n');
}

function stopGeneration() {
    const stopBtn = document.getElementById('mes_stop');
    if (stopBtn) stopBtn.click();
    debug('Stop generation triggered');
}

// ─── YOLO Mode ───

async function handleYolo() {
    if (activeFieldKey) return;

    const brief = document.getElementById('acc_character_brief')?.value?.trim();
    if (!brief) {
        toast('Please enter a Character Brief before using YOLO mode.', 'warning');
        return;
    }

    activeFieldKey = '__yolo__';
    setAllFieldsDisabled(true);
    setStatusBar('YOLO generating entire character...');

    try {
        const result = await yoloGenerate(currentSchema, brief);
        if (abortRequested) return;

        // Set directly into ST description field
        const descField = document.getElementById('description_textarea');
        if (descField) {
            descField.value = result;
            descField.dispatchEvent(new Event('input', { bubbles: true }));
        }
        toast('YOLO generation complete! Description field updated.', 'success');
        closeModal();
    } catch (err) {
        console.error('ACC YOLO error:', err);
        toast(`YOLO generation failed: ${err.message}`, 'error');
    } finally {
        activeFieldKey = null;
        abortRequested = false;
        setAllFieldsDisabled(false);
        setStatusBar(null);
    }
}

async function yoloGenerate(schema, characterBrief) {
    const fieldList = getOrderedFields(schema)
        .map(([, f]) => `${f.label}: ${f.description}`)
        .join('\n');

    const prompt = `Create a complete character description using the format below. Fill in every field with creative, detailed content.\n\nCharacter Brief:\n${characterBrief}\n\nFormat:\n{\n${fieldList}\n}`;
    const systemPrompt = 'You are a character creation assistant. Generate a complete character description in the exact format requested. Be creative and detailed.';

    debug('YOLO generating with brief length', characterBrief.length);
    debug('[YOLO] System prompt:', systemPrompt);
    debug('[YOLO] Prompt:', prompt);

    const result = await generateRaw({ prompt, systemPrompt, responseLength: 2000 });
    return removeReasoningFromString(result).trim();
}

// ─── Reverse Mapping ───

async function handleReverseMap() {
    if (activeFieldKey) return;

    const descField = document.getElementById('description_textarea');
    const description = descField?.value?.trim();
    if (!description) {
        toast('No existing description to import from.', 'warning');
        return;
    }

    activeFieldKey = '__reverse__';
    setAllFieldsDisabled(true);
    setStatusBar('Parsing existing description into fields...');

    try {
        const parsed = await reverseMapDescription(description, currentSchema);
        if (abortRequested) return;

        // Populate fields
        for (const [key, value] of Object.entries(parsed)) {
            const input = document.getElementById(`acc_field_${key}`);
            if (input && value) {
                input.value = value;
                fieldStates[key].currentValue = value;
                fieldStates[key].originalSeed = value;
            }
        }
        toast('Description parsed into fields. Review and edit as needed.', 'success');
    } catch (err) {
        console.error('ACC reverse map error:', err);
        toast(`Reverse mapping failed: ${err.message}`, 'error');
    } finally {
        activeFieldKey = null;
        abortRequested = false;
        setAllFieldsDisabled(false);
        setStatusBar(null);
    }
}

async function reverseMapDescription(description, schema) {
    // Fast path: if the description is a stringified character data object
    // (which is what compileDescription now produces), parse it directly and
    // validate against the schema. This avoids an LLM round-trip entirely
    // for descriptions that were compiled by this extension.
    const direct = tryParseCharacterData(description, schema);
    if (direct) {
        // Keep only keys the current schema knows about — extra keys from a
        // different schema version are preserved in the file but not surfaced
        // as fields in this modal.
        const filtered = {};
        for (const key of Object.keys(schema.fields)) {
            if (typeof direct[key] === 'string' && direct[key].trim()) {
                filtered[key] = direct[key];
            }
        }
        debug('Reverse mapped fields (JSON fast path):', Object.keys(filtered).length);
        return filtered;
    }

    // Fallback: legacy prose description — use the LLM to extract fields.
    const fieldList = getOrderedFields(schema)
        .map(([key, f]) => `${key}: ${f.label} — ${f.description}`)
        .join('\n');

    const prompt = `Parse this character description into the following fields. For each field, output exactly one line: FIELD_KEY | value\nIf a field has no matching content, output: FIELD_KEY | (empty)\n\nFields:\n${fieldList}\n\nDescription:\n${description}`;
    const systemPrompt = 'You are a character parsing assistant. Extract information from the description into the specified fields. Output exactly one line per field in the format: FIELD_KEY | value';

    debug('[ReverseMap] System prompt:', systemPrompt);
    debug('[ReverseMap] Prompt:', prompt);

    const result = await generateRaw({ prompt, systemPrompt, responseLength: 2000 });
    const cleaned = removeReasoningFromString(result).trim();

    const parsed = {};
    for (const line of cleaned.split('\n')) {
        const pipeIndex = line.indexOf('|');
        if (pipeIndex === -1) continue;
        const key = line.substring(0, pipeIndex).trim();
        const value = line.substring(pipeIndex + 1).trim();
        if (schema.fields[key] && value && value !== '(empty)') {
            parsed[key] = value;
        }
    }

    debug('Reverse mapped fields (LLM fallback):', Object.keys(parsed).length);
    return parsed;
}

// ─── Compilation & Output ───

function handleDone() {
    if (activeFieldKey) return;

    const compiled = compileDescription(currentSchema, fieldStates);
    if (!compiled.trim()) {
        toast('All fields are empty. Nothing to save.', 'warning');
        return;
    }

    // Set ST description field
    const descField = document.getElementById('description_textarea');
    if (descField) {
        descField.value = compiled;
        descField.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Set ST name field
    const nameValue = fieldStates.characterName?.currentValue?.trim();
    if (nameValue) {
        const nameField = document.getElementById('character_name_pole');
        if (nameField) {
            nameField.value = nameValue;
            nameField.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    toast('Character description compiled and applied!', 'success');
    closeModal();
}

function compileDescription(schema, states) {
    const obj = {};
    for (const [key] of getOrderedFields(schema)) {
        const val = states[key]?.currentValue?.trim();
        if (val) {
            obj[key] = val;
        }
    }
    if (Object.keys(obj).length === 0) return '';
    return JSON.stringify(obj, null, 2);
}

// ─── UI Helpers ───

function setFieldGeneratingUI(fieldKey, generating) {
    const input = document.getElementById(`acc_field_${fieldKey}`);
    const assistBtn = document.getElementById(`acc_assist_${fieldKey}`);
    const retryBtn = document.getElementById(`acc_retry_${fieldKey}`);
    const resetBtn = document.getElementById(`acc_reset_${fieldKey}`);

    if (generating) {
        input?.setAttribute('disabled', 'true');
        if (assistBtn) {
            assistBtn.innerHTML = '<span class="fa-solid fa-stop"></span>';
            assistBtn.title = 'Stop';
        }
        retryBtn?.classList.add('acc-hidden');
        resetBtn?.classList.add('acc-hidden');

        // Disable all other field buttons and inputs
        document.querySelectorAll('.acc-btn').forEach(btn => {
            if (btn.id !== `acc_assist_${fieldKey}`) {
                btn.classList.add('acc-disabled');
            }
        });
        document.querySelectorAll('.acc-field-input').forEach(el => {
            if (el.id !== `acc_field_${fieldKey}`) {
                el.setAttribute('disabled', 'true');
            }
        });

        // Disable YOLO and Done buttons
        document.getElementById('acc_yolo_btn')?.classList.add('acc-disabled');
        document.getElementById('acc_done_btn')?.classList.add('acc-disabled');
    } else {
        input?.removeAttribute('disabled');
        if (fieldStates[fieldKey]?.hasGenerated) {
            // Post-generation: show Continue button
            if (assistBtn) {
                assistBtn.innerHTML = '<span class="fa-solid fa-arrow-right"></span>';
                assistBtn.title = 'Continue';
            }
            retryBtn?.classList.remove('acc-hidden');
            resetBtn?.classList.remove('acc-hidden');
        } else {
            if (assistBtn) {
                assistBtn.innerHTML = '<span class="fa-solid fa-wand-magic-sparkles"></span>';
                assistBtn.title = 'Assist';
            }
        }

        // Re-enable all field buttons and inputs
        document.querySelectorAll('.acc-btn').forEach(btn => {
            btn.classList.remove('acc-disabled');
        });
        document.querySelectorAll('.acc-field-input').forEach(el => {
            el.removeAttribute('disabled');
        });

        // Re-enable YOLO and Done buttons
        document.getElementById('acc_yolo_btn')?.classList.remove('acc-disabled');
        document.getElementById('acc_done_btn')?.classList.remove('acc-disabled');
    }
}

function setAllFieldsDisabled(disabled) {
    document.querySelectorAll('.acc-field-input').forEach(el => {
        if (disabled) el.setAttribute('disabled', 'true');
        else el.removeAttribute('disabled');
    });
    document.querySelectorAll('.acc-btn').forEach(btn => {
        if (disabled) btn.classList.add('acc-disabled');
        else btn.classList.remove('acc-disabled');
    });
    const yoloBtn = document.getElementById('acc_yolo_btn');
    const doneBtn = document.getElementById('acc_done_btn');
    if (disabled) {
        yoloBtn?.classList.add('acc-disabled');
        doneBtn?.classList.add('acc-disabled');
    } else {
        yoloBtn?.classList.remove('acc-disabled');
        doneBtn?.classList.remove('acc-disabled');
    }
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
