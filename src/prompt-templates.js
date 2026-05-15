/**
 * Prompt Templates — named, reusable presets for any of the extension's
 * editable LLM prompts. Persisted at the extension-settings level (across
 * chats). One dropdown + Save/Update/Rename/Delete buttons per prompt.
 *
 * The associated textarea (e.g. #acc_prompt_textarea) remains the single
 * live source of truth for the active prompt. Selecting a template loads
 * its text into the textarea and re-dispatches an `input` event so the
 * owning module's existing live-binding persists textarea → settings.
 */

const DEFAULT_ID = '__default__';
const DEFAULT_LABEL = 'Default';

function isValidName(name, existingNames, currentName = null) {
    if (!name || !name.trim()) return { ok: false, reason: 'Name cannot be empty.' };
    const trimmed = name.trim();
    if (trimmed === DEFAULT_ID) return { ok: false, reason: `Name "${DEFAULT_ID}" is reserved.` };
    if (trimmed === DEFAULT_LABEL) return { ok: false, reason: `Name "${DEFAULT_LABEL}" is reserved.` };
    if (trimmed !== currentName && existingNames.includes(trimmed)) {
        return { ok: false, reason: `A template named "${trimmed}" already exists.` };
    }
    return { ok: true, name: trimmed };
}

/**
 * Render a templates dropdown + action buttons for one prompt.
 *
 * @param {object} opts
 * @param {string}   opts.promptKey     Settings key, e.g. 'phrasingPrompt'.
 * @param {string}   opts.defaultText   The hardcoded DEFAULT_* constant.
 * @param {string}   opts.textareaId    Id of the existing textarea (no '#').
 * @param {string}   opts.containerId   Id of the empty <div> to render into (no '#').
 * @param {object}   opts.settings      Shared mutable settings reference.
 * @param {Function} opts.saveSettings  () => void — persists settings.
 */
export function setupPromptTemplates({ promptKey, defaultText, textareaId, containerId, settings, saveSettings }) {
    const container = document.getElementById(containerId);
    const textarea = document.getElementById(textareaId);
    if (!container || !textarea) return;

    if (!settings.promptTemplates) settings.promptTemplates = {};
    if (!settings.activePromptTemplate) settings.activePromptTemplate = {};
    if (!settings.promptTemplates[promptKey]) settings.promptTemplates[promptKey] = {};
    if (!settings.activePromptTemplate[promptKey]) settings.activePromptTemplate[promptKey] = DEFAULT_ID;

    container.innerHTML = `
        <select class="text_pole saints_template_select" id="${containerId}_select"></select>
        <div class="saints_template_buttons">
            <div class="menu_button" data-action="save" title="Save the current textarea as a new named template">
                <span class="fa-solid fa-plus"></span> Save as New
            </div>
            <div class="menu_button" data-action="update" title="Overwrite the selected template with the current textarea">
                <span class="fa-solid fa-floppy-disk"></span> Update
            </div>
            <div class="menu_button" data-action="rename" title="Rename the selected template">
                <span class="fa-solid fa-pen"></span> Rename
            </div>
            <div class="menu_button" data-action="delete" title="Delete the selected template">
                <span class="fa-solid fa-trash"></span> Delete
            </div>
        </div>
    `;

    const select = container.querySelector('select');
    const buttons = {
        save:   container.querySelector('[data-action="save"]'),
        update: container.querySelector('[data-action="update"]'),
        rename: container.querySelector('[data-action="rename"]'),
        delete: container.querySelector('[data-action="delete"]'),
    };

    function getActiveId() {
        return settings.activePromptTemplate[promptKey] || DEFAULT_ID;
    }

    function getTemplateText(id) {
        if (id === DEFAULT_ID) return defaultText;
        const text = settings.promptTemplates[promptKey][id];
        return text === undefined ? defaultText : text;
    }

    function refreshDropdown() {
        const active = getActiveId();
        const names = Object.keys(settings.promptTemplates[promptKey]).sort((a, b) => a.localeCompare(b));
        select.innerHTML = '';
        select.appendChild(new Option(DEFAULT_LABEL, DEFAULT_ID, false, active === DEFAULT_ID));
        for (const name of names) {
            select.appendChild(new Option(name, name, false, active === name));
        }
        refreshButtonStates();
    }

    function refreshButtonStates() {
        const isDefault = getActiveId() === DEFAULT_ID;
        buttons.update.classList.toggle('disabled', isDefault);
        buttons.rename.classList.toggle('disabled', isDefault);
        buttons.delete.classList.toggle('disabled', isDefault);
    }

    function loadActiveIntoTextarea() {
        textarea.value = getTemplateText(getActiveId());
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function existingNames() {
        return Object.keys(settings.promptTemplates[promptKey]);
    }

    // ── Actions ──

    buttons.save.addEventListener('click', () => {
        const raw = window.prompt('Name for the new template:', '');
        if (raw === null) return;
        const result = isValidName(raw, existingNames());
        if (!result.ok) {
            window.alert(result.reason);
            return;
        }
        settings.promptTemplates[promptKey][result.name] = textarea.value;
        settings.activePromptTemplate[promptKey] = result.name;
        saveSettings();
        refreshDropdown();
    });

    buttons.update.addEventListener('click', () => {
        const active = getActiveId();
        if (active === DEFAULT_ID) return;
        settings.promptTemplates[promptKey][active] = textarea.value;
        saveSettings();
    });

    buttons.rename.addEventListener('click', () => {
        const active = getActiveId();
        if (active === DEFAULT_ID) return;
        const raw = window.prompt('Rename template:', active);
        if (raw === null) return;
        const result = isValidName(raw, existingNames(), active);
        if (!result.ok) {
            window.alert(result.reason);
            return;
        }
        if (result.name === active) return;
        const text = settings.promptTemplates[promptKey][active];
        delete settings.promptTemplates[promptKey][active];
        settings.promptTemplates[promptKey][result.name] = text;
        settings.activePromptTemplate[promptKey] = result.name;
        saveSettings();
        refreshDropdown();
    });

    buttons.delete.addEventListener('click', () => {
        const active = getActiveId();
        if (active === DEFAULT_ID) return;
        if (!window.confirm(`Delete template "${active}"?`)) return;
        delete settings.promptTemplates[promptKey][active];
        settings.activePromptTemplate[promptKey] = DEFAULT_ID;
        saveSettings();
        refreshDropdown();
        loadActiveIntoTextarea();
    });

    select.addEventListener('change', () => {
        settings.activePromptTemplate[promptKey] = select.value;
        saveSettings();
        loadActiveIntoTextarea();
        refreshButtonStates();
    });

    // ── Initial paint ──

    refreshDropdown();

    // First-interaction guard: if the active template is "Default" but the
    // user already has a customised textarea/settings value (from a prior
    // version with no template system), preserve their work. They can click
    // "Save as New" to name it. Explicit "Default" selection still overwrites.
    const initialActive = getActiveId();
    const settingsValue = settings[promptKey];
    const hasCustomization =
        initialActive === DEFAULT_ID &&
        typeof settingsValue === 'string' &&
        settingsValue.length > 0 &&
        settingsValue !== defaultText;
    if (!hasCustomization) {
        loadActiveIntoTextarea();
    }
}
