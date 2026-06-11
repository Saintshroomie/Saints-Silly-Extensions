/**
 * Tool Presets — named, reusable bundles of every editable prompt/prefill a
 * tool owns, replacing the old per-field prompt templates. One dropdown +
 * Save/Update/Rename/Delete per tool keeps coupled fields (e.g. a prompt
 * that describes its prefill's format) saved and restored together.
 * Persisted at the extension-settings level (across chats) under
 * `toolPresets` / `activeToolPreset`.
 *
 * The bound textareas remain the single live source of truth: selecting a
 * preset loads each field's text into its textarea and re-dispatches `input`
 * so the owning module's existing live-binding persists textarea → settings.
 * Editing a textarea never silently mutates the preset — the dropdown shows
 * "(modified)" until the user clicks Update or saves a new preset, and
 * switching presets with unsaved changes asks for confirmation first.
 */

const DEFAULT_ID = '__default__';
const DEFAULT_LABEL = 'Default';

function isValidName(name, existingNames, currentName = null) {
    if (!name || !name.trim()) return { ok: false, reason: 'Name cannot be empty.' };
    const trimmed = name.trim();
    if (trimmed === DEFAULT_ID) return { ok: false, reason: `Name "${DEFAULT_ID}" is reserved.` };
    if (trimmed === DEFAULT_LABEL) return { ok: false, reason: `Name "${DEFAULT_LABEL}" is reserved.` };
    if (trimmed !== currentName && existingNames.includes(trimmed)) {
        return { ok: false, reason: `A preset named "${trimmed}" already exists.` };
    }
    return { ok: true, name: trimmed };
}

/**
 * One-time migration from the legacy per-field template system
 * (`promptTemplates` / `activePromptTemplate`) to per-tool presets.
 *
 * Each legacy named template becomes a preset whose other fields hold the
 * built-in defaults; name collisions across a tool's fields get a
 * "(Field Label)" suffix. The legacy settings keys are left in place so a
 * downgrade loses nothing. Every tool's active preset starts at Default and
 * the user's current live texts are preserved untouched — the dirty marker
 * shows "(modified)" where they had customized.
 *
 * @param {object} settings - Shared mutable settings reference.
 * @param {Array<{ toolKey: string, fields: Array<{ key: string, label: string, defaultText: string, legacyDefaultText?: string }> }>} tools
 * @returns {boolean} `true` if a migration ran (caller should save settings).
 */
export function migrateLegacyToolPresets(settings, tools) {
    if (settings.toolPresets && typeof settings.toolPresets === 'object') return false;

    settings.toolPresets = {};
    settings.activeToolPreset = {};
    for (const tool of tools) {
        settings.toolPresets[tool.toolKey] = {};
        settings.activeToolPreset[tool.toolKey] = DEFAULT_ID;

        // Saved settings from versions whose default templates predate the
        // {{macro}} placeholders hold the old default text verbatim. Upgrade
        // exact matches to the current default so untouched installs don't
        // show a spurious "(modified)" marker (assembled output is identical
        // either way).
        for (const field of tool.fields) {
            if (field.legacyDefaultText !== undefined
                && settings[field.key] === field.legacyDefaultText) {
                settings[field.key] = field.defaultText;
            }
        }
    }

    const legacy = settings.promptTemplates;
    if (legacy && typeof legacy === 'object') {
        for (const tool of tools) {
            const presets = settings.toolPresets[tool.toolKey];
            for (const field of tool.fields) {
                const saved = legacy[field.key];
                if (!saved || typeof saved !== 'object') continue;
                for (const [name, text] of Object.entries(saved)) {
                    if (typeof text !== 'string') continue;
                    let presetName = name;
                    if (presets[presetName] !== undefined) presetName = `${name} (${field.label})`;
                    let n = 2;
                    while (presets[presetName] !== undefined) presetName = `${name} (${field.label} ${n++})`;
                    const preset = {};
                    for (const f of tool.fields) {
                        preset[f.key] = (f.key === field.key) ? text : f.defaultText;
                    }
                    presets[presetName] = preset;
                }
            }
        }
    }
    return true;
}

/**
 * Render a preset dropdown + action buttons for one tool.
 *
 * @param {object} opts
 * @param {string}   opts.toolKey       Tool id, e.g. 'acc'.
 * @param {string}   opts.label         Human label used in confirm dialogs.
 * @param {string}   opts.containerId   Id of the empty <div> to render into (no '#').
 * @param {Array<{ key: string, label: string, textareaId: string, defaultText: string }>} opts.fields
 *                   The settings keys / textareas bundled into this tool's presets.
 * @param {object}   opts.settings      Shared mutable settings reference.
 * @param {Function} opts.saveSettings  () => void — persists settings.
 */
export function setupToolPresets({ toolKey, label, containerId, fields, settings, saveSettings }) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!settings.toolPresets) settings.toolPresets = {};
    if (!settings.activeToolPreset) settings.activeToolPreset = {};
    if (!settings.toolPresets[toolKey]) settings.toolPresets[toolKey] = {};
    if (!settings.activeToolPreset[toolKey]) settings.activeToolPreset[toolKey] = DEFAULT_ID;

    container.innerHTML = `
        <select class="text_pole saints_template_select" id="${containerId}_select"></select>
        <div class="saints_template_buttons">
            <div class="menu_button" data-action="save" title="Save the current texts of every ${label} prompt field as a new named preset">
                <span class="fa-solid fa-plus"></span> Save as New
            </div>
            <div class="menu_button" data-action="update" title="Overwrite the selected preset with the current texts">
                <span class="fa-solid fa-floppy-disk"></span> Update
            </div>
            <div class="menu_button" data-action="rename" title="Rename the selected preset">
                <span class="fa-solid fa-pen"></span> Rename
            </div>
            <div class="menu_button" data-action="delete" title="Delete the selected preset">
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

    const presets = () => settings.toolPresets[toolKey];

    function getActiveId() {
        return settings.activeToolPreset[toolKey] || DEFAULT_ID;
    }

    function getPresetValues(id) {
        const values = {};
        const stored = id === DEFAULT_ID ? null : presets()[id];
        for (const field of fields) {
            const text = stored?.[field.key];
            values[field.key] = (typeof text === 'string') ? text : field.defaultText;
        }
        return values;
    }

    function getCurrentValues() {
        const values = {};
        for (const field of fields) {
            const live = settings[field.key];
            values[field.key] = (typeof live === 'string') ? live : field.defaultText;
        }
        return values;
    }

    function isDirty() {
        const current = getCurrentValues();
        const preset = getPresetValues(getActiveId());
        return fields.some(f => current[f.key] !== preset[f.key]);
    }

    function refreshDirtyMarker() {
        const dirty = isDirty();
        const active = getActiveId();
        for (const opt of select.options) {
            const base = opt.value === DEFAULT_ID ? DEFAULT_LABEL : opt.value;
            opt.textContent = (opt.value === active && dirty) ? `${base} (modified)` : base;
        }
        select.title = dirty
            ? 'The prompt fields differ from this preset. Use Update or Save as New to keep the changes.'
            : '';
    }

    function refreshDropdown() {
        const active = getActiveId();
        const names = Object.keys(presets()).sort((a, b) => a.localeCompare(b));
        select.innerHTML = '';
        select.appendChild(new Option(DEFAULT_LABEL, DEFAULT_ID, false, active === DEFAULT_ID));
        for (const name of names) {
            select.appendChild(new Option(name, name, false, active === name));
        }
        refreshButtonStates();
        refreshDirtyMarker();
    }

    function refreshButtonStates() {
        const isDefault = getActiveId() === DEFAULT_ID;
        buttons.update.classList.toggle('disabled', isDefault);
        buttons.rename.classList.toggle('disabled', isDefault);
        buttons.delete.classList.toggle('disabled', isDefault);
    }

    function loadPresetIntoTextareas(id) {
        const values = getPresetValues(id);
        for (const field of fields) {
            const textarea = document.getElementById(field.textareaId);
            if (textarea) {
                textarea.value = values[field.key];
                // Re-dispatch input so the owning module's live-binding
                // persists the new text into settings.
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
            } else {
                settings[field.key] = values[field.key];
            }
        }
    }

    function existingNames() {
        return Object.keys(presets());
    }

    // ── Actions ──

    buttons.save.addEventListener('click', () => {
        const raw = window.prompt(`Name for the new ${label} preset:`, '');
        if (raw === null) return;
        const result = isValidName(raw, existingNames());
        if (!result.ok) {
            window.alert(result.reason);
            return;
        }
        presets()[result.name] = getCurrentValues();
        settings.activeToolPreset[toolKey] = result.name;
        saveSettings();
        refreshDropdown();
    });

    buttons.update.addEventListener('click', () => {
        const active = getActiveId();
        if (active === DEFAULT_ID) return;
        presets()[active] = getCurrentValues();
        saveSettings();
        refreshDirtyMarker();
    });

    buttons.rename.addEventListener('click', () => {
        const active = getActiveId();
        if (active === DEFAULT_ID) return;
        const raw = window.prompt('Rename preset:', active);
        if (raw === null) return;
        const result = isValidName(raw, existingNames(), active);
        if (!result.ok) {
            window.alert(result.reason);
            return;
        }
        if (result.name === active) return;
        presets()[result.name] = presets()[active];
        delete presets()[active];
        settings.activeToolPreset[toolKey] = result.name;
        saveSettings();
        refreshDropdown();
    });

    buttons.delete.addEventListener('click', () => {
        const active = getActiveId();
        if (active === DEFAULT_ID) return;
        if (!window.confirm(`Delete preset "${active}"?`)) return;
        delete presets()[active];
        // Non-destructive: keep the live texts and fall back to Default —
        // the dirty marker shows "(modified)" if they differ from it.
        settings.activeToolPreset[toolKey] = DEFAULT_ID;
        saveSettings();
        refreshDropdown();
    });

    select.addEventListener('change', () => {
        const previous = getActiveId();
        if (select.value === previous) return;
        if (isDirty()) {
            const ok = window.confirm(
                `The ${label} prompt fields have unsaved changes that will be replaced by `
                + `"${select.value === DEFAULT_ID ? DEFAULT_LABEL : select.value}". Discard them?`,
            );
            if (!ok) {
                select.value = previous;
                return;
            }
        }
        settings.activeToolPreset[toolKey] = select.value;
        saveSettings();
        loadPresetIntoTextareas(select.value);
        refreshButtonStates();
        refreshDirtyMarker();
    });

    // ── Dirty tracking ──

    // Modules bind their settings persistence to 'input' before this widget
    // is set up, so by the time this listener runs the settings value is
    // already current.
    for (const field of fields) {
        document.getElementById(field.textareaId)
            ?.addEventListener('input', refreshDirtyMarker);
    }

    // ── Initial paint ──

    // Never overwrite the textareas at init: the modules already loaded the
    // live settings values into them, and those are the source of truth. If
    // they differ from the active preset, the dirty marker says so.
    refreshDropdown();
}
