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
 *
 * Preset *management* (Save/Update/Rename/Delete) lives in the settings
 * panel, next to the textareas the presets bundle. Preset *selection* is
 * also available at the point of use: createToolPresetSelector returns a
 * compact dropdown (mounted in the ACC / Image Prompting / Compaction
 * modals and on every WIA entry's Assist row) that shares state with the
 * settings widget — changing the selection anywhere updates everywhere.
 */

const DEFAULT_ID = '__default__';
const DEFAULT_LABEL = 'Default';

// toolKey -> { toolKey, label, fields, settings, saveSettings, listeners }.
// Populated by setupToolPresets at startup; consulted by the point-of-use
// selectors and the shared activation logic.
const toolRegistry = new Map();

function getTool(toolKey) {
    return toolRegistry.get(toolKey) || null;
}

function notifyPresetChange(tool) {
    // Copy first: listeners may unsubscribe themselves while iterating.
    for (const listener of [...tool.listeners]) {
        try {
            listener();
        } catch (err) {
            console.error('Tool preset listener failed:', err);
        }
    }
}

function getActiveId(tool) {
    return tool.settings.activeToolPreset[tool.toolKey] || DEFAULT_ID;
}

function getPresets(tool) {
    return tool.settings.toolPresets[tool.toolKey];
}

function getPresetValues(tool, id) {
    const values = {};
    const stored = id === DEFAULT_ID ? null : getPresets(tool)[id];
    for (const field of tool.fields) {
        const text = stored?.[field.key];
        values[field.key] = (typeof text === 'string') ? text : field.defaultText;
    }
    return values;
}

function getCurrentValues(tool) {
    const values = {};
    for (const field of tool.fields) {
        const live = tool.settings[field.key];
        values[field.key] = (typeof live === 'string') ? live : field.defaultText;
    }
    return values;
}

function isDirty(tool) {
    const current = getCurrentValues(tool);
    const preset = getPresetValues(tool, getActiveId(tool));
    return tool.fields.some(f => current[f.key] !== preset[f.key]);
}

function loadPresetIntoTextareas(tool, id) {
    const values = getPresetValues(tool, id);
    for (const field of tool.fields) {
        const textarea = document.getElementById(field.textareaId);
        if (textarea) {
            textarea.value = values[field.key];
            // Re-dispatch input so the owning module's live-binding
            // persists the new text into settings.
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            tool.settings[field.key] = values[field.key];
        }
    }
}

function presetOptionLabel(id, activeId, dirty) {
    const base = id === DEFAULT_ID ? DEFAULT_LABEL : id;
    return (id === activeId && dirty) ? `${base} (modified)` : base;
}

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
 * Switch a tool's active preset (guarded by the shared unsaved-changes
 * confirmation) and load its texts into the tool's prompt fields. Used by
 * both the settings widget and the point-of-use selectors so the behavior
 * is identical everywhere. Notifies every mounted selector on success.
 *
 * @param {string} toolKey - Tool id from TOOL_PRESET_CONFIG, e.g. 'acc'.
 * @param {string} id - Preset name, or the internal Default id.
 * @returns {boolean} `true` if the preset is now active (including "already
 *   was"); `false` if the switch was refused or the preset doesn't exist.
 */
export function activateToolPreset(toolKey, id) {
    const tool = getTool(toolKey);
    if (!tool) return false;
    const previous = getActiveId(tool);
    if (id === previous) return true;
    if (id !== DEFAULT_ID && getPresets(tool)[id] === undefined) return false;
    if (isDirty(tool)) {
        const ok = window.confirm(
            `The ${tool.label} prompt fields have unsaved changes that will be replaced by `
            + `"${id === DEFAULT_ID ? DEFAULT_LABEL : id}". Discard them?`,
        );
        if (!ok) return false;
    }
    tool.settings.activeToolPreset[tool.toolKey] = id;
    tool.saveSettings();
    loadPresetIntoTextareas(tool, id);
    notifyPresetChange(tool);
    return true;
}

/**
 * Create a compact preset dropdown for mounting at a tool's point of use
 * (a modal, a World Info entry row). It mirrors the settings widget — same
 * preset list, same active selection, same "(modified)" dirty marker, same
 * discard confirmation — and stays in sync with it and with every other
 * selector for the tool.
 *
 * The selector manages its own lifecycle: once it has been in the DOM and
 * is later removed (modal closed, entry row torn down), the next change
 * notification unsubscribes it.
 *
 * @param {object} opts
 * @param {string} opts.toolKey     Tool id from TOOL_PRESET_CONFIG, e.g. 'acc'.
 * @param {string} [opts.className] Extra class(es) for the <select>.
 * @param {string} [opts.title]     Tooltip text.
 * @returns {HTMLSelectElement}
 */
export function createToolPresetSelector({ toolKey, className = '', title = '' }) {
    const select = document.createElement('select');
    select.className = ['text_pole', 'saints_preset_select', className].filter(Boolean).join(' ');
    if (title) select.title = title;

    const tool = getTool(toolKey);
    if (!tool) {
        // The tool was never registered (setupToolPresets runs at startup,
        // so this shouldn't happen in practice). Render inert.
        select.disabled = true;
        select.appendChild(new Option(DEFAULT_LABEL, DEFAULT_ID, true, true));
        return select;
    }

    let wasConnected = false;
    const refresh = () => {
        if (select.isConnected) {
            wasConnected = true;
        } else if (wasConnected) {
            tool.listeners.delete(refresh);
            return;
        }
        const active = getActiveId(tool);
        const dirty = isDirty(tool);
        const names = Object.keys(getPresets(tool)).sort((a, b) => a.localeCompare(b));
        select.innerHTML = '';
        select.appendChild(new Option(
            presetOptionLabel(DEFAULT_ID, active, dirty), DEFAULT_ID, false, active === DEFAULT_ID));
        for (const name of names) {
            select.appendChild(new Option(
                presetOptionLabel(name, active, dirty), name, false, active === name));
        }
    };

    select.addEventListener('change', () => {
        // On success the change notification refreshes every selector,
        // including this one; on refusal snap back to the active preset.
        if (!activateToolPreset(toolKey, select.value)) refresh();
    });

    tool.listeners.add(refresh);
    refresh();
    return select;
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
 * Render the full preset management widget (dropdown + Save/Update/Rename/
 * Delete) for one tool into the settings panel, and register the tool so
 * point-of-use selectors (createToolPresetSelector) can share its state.
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
    if (!settings.toolPresets) settings.toolPresets = {};
    if (!settings.activeToolPreset) settings.activeToolPreset = {};
    if (!settings.toolPresets[toolKey]) settings.toolPresets[toolKey] = {};
    if (!settings.activeToolPreset[toolKey]) settings.activeToolPreset[toolKey] = DEFAULT_ID;

    // Register (or re-register) the tool for the shared activation logic
    // and the point-of-use selectors, even if the settings container is
    // missing — selection elsewhere must still work.
    const tool = { toolKey, label, fields, settings, saveSettings, listeners: new Set() };
    toolRegistry.set(toolKey, tool);

    const container = document.getElementById(containerId);
    if (!container) return;

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

    function refreshDirtyMarker() {
        const dirty = isDirty(tool);
        const active = getActiveId(tool);
        for (const opt of select.options) {
            opt.textContent = presetOptionLabel(opt.value, active, dirty);
        }
        select.title = dirty
            ? 'The prompt fields differ from this preset. Use Update or Save as New to keep the changes.'
            : '';
    }

    function refreshDropdown() {
        const active = getActiveId(tool);
        const names = Object.keys(getPresets(tool)).sort((a, b) => a.localeCompare(b));
        select.innerHTML = '';
        select.appendChild(new Option(DEFAULT_LABEL, DEFAULT_ID, false, active === DEFAULT_ID));
        for (const name of names) {
            select.appendChild(new Option(name, name, false, active === name));
        }
        refreshButtonStates();
        refreshDirtyMarker();
    }

    function refreshButtonStates() {
        const isDefault = getActiveId(tool) === DEFAULT_ID;
        buttons.update.classList.toggle('disabled', isDefault);
        buttons.rename.classList.toggle('disabled', isDefault);
        buttons.delete.classList.toggle('disabled', isDefault);
    }

    function existingNames() {
        return Object.keys(getPresets(tool));
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
        getPresets(tool)[result.name] = getCurrentValues(tool);
        settings.activeToolPreset[toolKey] = result.name;
        saveSettings();
        notifyPresetChange(tool);
    });

    buttons.update.addEventListener('click', () => {
        const active = getActiveId(tool);
        if (active === DEFAULT_ID) return;
        getPresets(tool)[active] = getCurrentValues(tool);
        saveSettings();
        notifyPresetChange(tool);
    });

    buttons.rename.addEventListener('click', () => {
        const active = getActiveId(tool);
        if (active === DEFAULT_ID) return;
        const raw = window.prompt('Rename preset:', active);
        if (raw === null) return;
        const result = isValidName(raw, existingNames(), active);
        if (!result.ok) {
            window.alert(result.reason);
            return;
        }
        if (result.name === active) return;
        getPresets(tool)[result.name] = getPresets(tool)[active];
        delete getPresets(tool)[active];
        settings.activeToolPreset[toolKey] = result.name;
        saveSettings();
        notifyPresetChange(tool);
    });

    buttons.delete.addEventListener('click', () => {
        const active = getActiveId(tool);
        if (active === DEFAULT_ID) return;
        if (!window.confirm(`Delete preset "${active}"?`)) return;
        delete getPresets(tool)[active];
        // Non-destructive: keep the live texts and fall back to Default —
        // the dirty marker shows "(modified)" if they differ from it.
        settings.activeToolPreset[toolKey] = DEFAULT_ID;
        saveSettings();
        notifyPresetChange(tool);
    });

    select.addEventListener('change', () => {
        // Shared activation (dirty-check confirm + load + notify). On
        // refusal snap the dropdown back to the still-active preset.
        if (!activateToolPreset(toolKey, select.value)) {
            select.value = getActiveId(tool);
        }
    });

    // ── Dirty tracking ──

    // Modules bind their settings persistence to 'input' before this widget
    // is set up, so by the time this listener runs the settings value is
    // already current. Notify so point-of-use selectors update their
    // "(modified)" marker too.
    for (const field of fields) {
        document.getElementById(field.textareaId)
            ?.addEventListener('input', () => notifyPresetChange(tool));
    }

    // The settings widget itself stays in sync through the same channel as
    // the point-of-use selectors (it's permanently mounted, so no
    // disconnect handling is needed).
    tool.listeners.add(refreshDropdown);

    // ── Initial paint ──

    // Never overwrite the textareas at init: the modules already loaded the
    // live settings values into them, and those are the source of truth. If
    // they differ from the active preset, the dirty marker says so.
    refreshDropdown();
}
