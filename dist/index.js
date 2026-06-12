import { loadWorldInfo as __WEBPACK_EXTERNAL_MODULE__world_info_js_83198f57_loadWorldInfo__, saveWorldInfo as __WEBPACK_EXTERNAL_MODULE__world_info_js_83198f57_saveWorldInfo__, setWIOriginalDataValue as __WEBPACK_EXTERNAL_MODULE__world_info_js_83198f57_setWIOriginalDataValue__, world_names as __WEBPACK_EXTERNAL_MODULE__world_info_js_83198f57_world_names__ } from "../../../../world-info.js";
import { extension_prompt_roles as __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_extension_prompt_roles__, extension_prompt_types as __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_extension_prompt_types__, generateRaw as __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_generateRaw__, getMaxPromptTokens as __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_getMaxPromptTokens__, setExtensionPrompt as __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_setExtensionPrompt__, stopGeneration as __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_stopGeneration__, substituteParamsExtended as __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_substituteParamsExtended__ } from "../../../../../script.js";
import { getTokenCountAsync as __WEBPACK_EXTERNAL_MODULE__tokenizers_js_d5863f55_getTokenCountAsync__ } from "../../../../tokenizers.js";
import { POPUP_RESULT as __WEBPACK_EXTERNAL_MODULE__popup_js_755810aa_POPUP_RESULT__, POPUP_TYPE as __WEBPACK_EXTERNAL_MODULE__popup_js_755810aa_POPUP_TYPE__, Popup as __WEBPACK_EXTERNAL_MODULE__popup_js_755810aa_Popup__ } from "../../../../popup.js";
import { SlashCommandParser as __WEBPACK_EXTERNAL_MODULE__slash_commands_SlashCommandParser_js_42c8b851_SlashCommandParser__ } from "../../../../slash-commands/SlashCommandParser.js";
import { SlashCommand as __WEBPACK_EXTERNAL_MODULE__slash_commands_SlashCommand_js_1b0d5616_SlashCommand__ } from "../../../../slash-commands/SlashCommand.js";
import { ARGUMENT_TYPE as __WEBPACK_EXTERNAL_MODULE__slash_commands_SlashCommandArgument_js_a42b9371_ARGUMENT_TYPE__, SlashCommandArgument as __WEBPACK_EXTERNAL_MODULE__slash_commands_SlashCommandArgument_js_a42b9371_SlashCommandArgument__ } from "../../../../slash-commands/SlashCommandArgument.js";
import { removeReasoningFromString as __WEBPACK_EXTERNAL_MODULE__reasoning_js_8d5a64cc_removeReasoningFromString__ } from "../../../../reasoning.js";
/******/ var __webpack_modules__ = ({

/***/ 208
(module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   A: () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(354);
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(314);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
// Imports


var ___CSS_LOADER_EXPORT___ = _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default()));
// Module
___CSS_LOADER_EXPORT___.push([module.id, `/* Saint's Silly Extensions — Combined Styles */


/* ═══════════════════════════════════════════════════════════════════════════════
   POSSESSION STYLES
   ═══════════════════════════════════════════════════════════════════════════════ */

/* ── Group Chat: Radio Button Toggle ── */

.possession_radio_wrapper {
    display: inline-flex;
    align-items: center;
    margin-left: 4px;
    cursor: pointer;
}

.possession_radio {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid var(--SmartThemeBorderColor, #555);
    background: transparent;
    cursor: pointer;
    transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
    position: relative;
    flex-shrink: 0;
}

.possession_radio:hover {
    border-color: var(--SmartThemeQuoteColor, #e8a23a);
}

.possession_radio.possession_active {
    border-color: var(--SmartThemeQuoteColor, #e8a23a);
    background: var(--SmartThemeQuoteColor, #e8a23a);
    box-shadow: inset 0 0 0 3px var(--SmartThemeBlurTintColor, #1a1a2e);
}

/* ── Solo Chat: Possess Toggle Button ── */

#possession_solo_btn {
    opacity: 0.7;
    transition: opacity 0.15s ease, color 0.15s ease;
    cursor: pointer;
    position: relative;
}

#possession_solo_btn:hover {
    opacity: 1;
}

#possession_solo_btn.possession_active {
    opacity: 1;
    color: var(--SmartThemeQuoteColor, #e8a23a);
}

#possession_solo_btn.possession_active::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 50%;
    transform: translateX(-50%);
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--SmartThemeQuoteColor, #e8a23a);
}

/* ── Group member highlight when possessed ── */

.group_member.possession_possessed {
    border-left: 3px solid var(--SmartThemeQuoteColor, #e8a23a) !important;
}

/* ── Possession Impersonate Button (Character Avatar) ── */

#possession_impersonate_btn {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.15s ease;
    padding: 2px;
}

#possession_impersonate_btn:hover {
    opacity: 1;
}

.possession_impersonate_avatar {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid var(--SmartThemeBorderColor, #555);
    transition: border-color 0.15s ease;
}

#possession_impersonate_btn:hover .possession_impersonate_avatar {
    border-color: var(--SmartThemeQuoteColor, #e8a23a);
}

/* ── Hide controls when extension is disabled ── */

.possession_hidden {
    display: none !important;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PHRASING STYLES
   ═══════════════════════════════════════════════════════════════════════════════ */

/* ── Input Area Button (next to Send) ── */

#phrasing_send_button {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.7;
    transition: opacity 0.15s ease, color 0.15s ease;
    padding: 3px;
    font-size: 1.2em;
}

#phrasing_send_button:hover {
    opacity: 1;
    color: var(--SmartThemeQuoteColor, #e8a23a);
}

/* ── Hamburger Menu Item ── */

#phrasing_menu_button {
    cursor: pointer;
}

#phrasing_menu_button .fa-solid {
    margin-right: 5px;
    width: 1em;
    text-align: center;
}

/* ── Hide buttons during generation ── */

.phrasing-hidden {
    display: none !important;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SETTINGS PANEL STYLES
   ═══════════════════════════════════════════════════════════════════════════════ */

#saints_silly_settings .inline-drawer-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px 0;
}

/* Nested drawers (template fields inside each tool's panel) — slightly
   indented and with a smaller, dimmer header so they read as a sub-section
   rather than a peer of the top-level tool drawer. */
#saints_silly_settings .saints_nested_drawer {
    margin: 4px 0 4px 4px;
    border-left: 2px solid var(--SmartThemeBorderColor, #555);
    padding-left: 8px;
}

#saints_silly_settings .saints_nested_drawer > .inline-drawer-toggle {
    font-size: 0.95em;
    opacity: 0.85;
    padding: 2px 0;
}

#saints_silly_settings .saints_nested_drawer > .inline-drawer-toggle:hover {
    opacity: 1;
}

#saints_silly_settings .saints_nested_drawer > .inline-drawer-content {
    padding: 4px 0 4px 0;
}

#saints_silly_settings .checkbox_label {
    display: flex;
    align-items: center;
    gap: 6px;
}

#saints_silly_settings .saints_section_header {
    margin: 4px 0 2px 0;
    display: flex;
    align-items: center;
    gap: 6px;
}

#saints_silly_settings .saints_divider {
    border: none;
    border-top: 1px solid var(--SmartThemeBorderColor, #555);
    margin: 8px 0;
}

#saints_silly_settings .phrasing_prompt_section {
    margin-top: 8px;
    margin-bottom: 8px;
}

#saints_silly_settings #phrasing_prompt_textarea {
    width: 100%;
    min-height: 120px;
    resize: vertical;
    font-family: monospace;
    font-size: 0.9em;
    margin-top: 4px;
}

#saints_silly_settings .phrasing_buttons_row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 4px;
}

#saints_silly_settings .phrasing_buttons_row .menu_button {
    flex: 1;
    min-width: 0;
    text-align: center;
    white-space: nowrap;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ACC SETTINGS STYLES
   ═══════════════════════════════════════════════════════════════════════════════ */

#saints_silly_settings .acc_prompt_section {
    margin-top: 8px;
    margin-bottom: 8px;
}

#saints_silly_settings #acc_prompt_textarea {
    width: 100%;
    min-height: 160px;
    resize: vertical;
    font-family: monospace;
    font-size: 0.9em;
    margin-top: 4px;
}

#saints_silly_settings .acc_buttons_row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 4px;
}

#saints_silly_settings .acc_buttons_row .menu_button {
    flex: 1;
    min-width: 0;
    text-align: center;
    white-space: nowrap;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ACC MODAL STYLES (rendered inside ST's Popup; chrome is provided by Popup)
   ═══════════════════════════════════════════════════════════════════════════════ */

.acc-modal-body {
    display: flex;
    flex-direction: column;
    flex: 1 1 0%;
    min-height: 0;
    text-align: left;
}

.acc-brief-section {
    margin-bottom: 12px;
}

.acc-brief-section textarea {
    width: 100%;
    margin-top: 4px;
    resize: vertical;
}

.acc-action-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 8px;
}

.acc-tokens-row {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    margin-bottom: 12px;
    font-size: 0.85em;
    opacity: 0.85;
}

.acc-tokens-label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    user-select: none;
}

.acc-tokens-input {
    width: 80px !important;
    padding: 2px 6px !important;
    font-size: 0.9em !important;
    text-align: center;
}

.acc-action-btn {
    flex: 1 1 0;
    min-width: 110px;
    text-align: center;
    white-space: nowrap;
}

.acc-action-btn.acc-disabled {
    opacity: 0.3;
    pointer-events: none;
}

.acc-generate-btn {
    color: var(--SmartThemeQuoteColor, #e8a23a);
}

.acc-status-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    margin-bottom: 12px;
    background: var(--SmartThemeBodyColor, #222);
    border-radius: 4px;
    color: var(--SmartThemeQuoteColor, #e8a23a);
    font-size: 0.9em;
}

.acc-description-section {
    display: flex;
    flex-direction: column;
    flex: 1 1 0%;
    min-height: 0;
}

.acc-description-section label {
    margin-bottom: 4px;
}

.acc-description-output {
    width: 100%;
    flex: 1 1 0%;
    min-height: 200px;
    resize: vertical;
}

.acc-description-output[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
}

.acc-hidden {
    display: none !important;
}

/* ACC Launch button in character creator */
#acc_launch_btn {
    display: flex;
    align-items: center;
    gap: 4px;
}

/* Field header row: label on the left, Clear button on the right. */
.acc-modal-body .acc-field-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 4px;
}

.acc-modal-body .acc-clear-btn {
    font-size: 0.8em;
    padding: 2px 8px;
    opacity: 0.85;
}

.acc-modal-body .acc-clear-btn:hover {
    opacity: 1;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   WORLD INFO ASSIST STYLES
   ═══════════════════════════════════════════════════════════════════════════════ */

/* Settings panel */
#saints_silly_settings .wia_prompt_section {
    margin-top: 8px;
    margin-bottom: 8px;
}

#saints_silly_settings #wia_prompt_textarea {
    width: 100%;
    min-height: 160px;
    resize: vertical;
    font-family: monospace;
    font-size: 0.9em;
    margin-top: 4px;
}

#saints_silly_settings .wia_buttons_row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 4px;
}

#saints_silly_settings .wia_buttons_row .menu_button {
    flex: 1;
    min-width: 0;
    text-align: center;
    white-space: nowrap;
}

/* Per-entry assist controls injected into each WI entry form */
.wia-controls {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    margin: 6px 0 6px 0;
}

.wia-controls .wia-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    font-size: 0.85em;
    padding: 4px 8px;
}

.wia-controls .wia-btn-assist {
    color: var(--SmartThemeQuoteColor, #e8a23a);
}

.wia-controls .wia-btn-label {
    font-weight: 500;
}

.wia-controls .wia-spinner {
    color: var(--SmartThemeQuoteColor, #e8a23a);
    font-size: 1em;
    display: inline-flex;
    align-items: center;
    padding: 4px 6px;
}

.wia-controls .wia-hidden {
    display: none !important;
}

/* Use Chat Context checkbox */
.wia-controls .wia-context-toggle {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.85em;
    cursor: pointer;
    opacity: 0.85;
    user-select: none;
}

.wia-controls .wia-context-toggle:hover {
    opacity: 1;
}

/* Lore book multi-select picker (per-entry) */
.wia-controls .wia-lorebook-picker {
    position: relative;
    font-size: 0.85em;
}

.wia-controls .wia-lorebook-picker > summary {
    cursor: pointer;
    list-style: none;
    padding: 4px 8px;
    border: 1px solid var(--SmartThemeBorderColor, #555);
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    opacity: 0.85;
}

.wia-controls .wia-lorebook-picker > summary::-webkit-details-marker {
    display: none;
}

.wia-controls .wia-lorebook-picker > summary:hover {
    opacity: 1;
}

.wia-controls .wia-lorebook-list {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 2px;
    z-index: 50;
    min-width: 220px;
    max-height: 240px;
    overflow-y: auto;
    background: var(--SmartThemeBlurTintColor, #1a1a2e);
    border: 1px solid var(--SmartThemeBorderColor, #555);
    border-radius: 4px;
    padding: 6px 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.wia-controls .wia-lorebook-item {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
}

.wia-controls .wia-lorebook-empty {
    opacity: 0.6;
    font-style: italic;
}

/* Inline Clear-content button on the WIA controls row */
/* Content-clear row — sits directly above the entry's content textarea so
   it's unambiguous which field the button clears. */
.wia-content-clear-row {
    display: flex;
    justify-content: flex-end;
    margin: 2px 0 4px 0;
}

.wia-content-clear-row .wia-btn-clear-content {
    font-size: 0.8em;
    padding: 2px 8px;
    opacity: 0.85;
}

.wia-content-clear-row .wia-btn-clear-content:hover {
    opacity: 1;
}

/* Per-entry guidance section — sits between the controls and the entry's
   content textarea so it's clearly the user's *input* to the assist. */
.wia-guidance-block {
    margin: 0 0 8px 0;
}

.wia-guidance-block .wia-guidance-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin: 0 0 4px 0;
}

.wia-guidance-block .wia-guidance-label {
    font-size: 0.9em;
    font-weight: 500;
    opacity: 0.9;
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.wia-guidance-block .wia-btn-clear-guidance {
    font-size: 0.8em;
    padding: 2px 8px;
    opacity: 0.85;
}

.wia-guidance-block .wia-btn-clear-guidance:hover {
    opacity: 1;
}

.wia-guidance-block .wia-guidance-textarea {
    width: 100%;
    resize: vertical;
    min-height: 60px;
    font-size: 0.9em;
}

/* Per-entry token limit row */
.wia-controls .wia-tokens-row {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85em;
    opacity: 0.85;
    margin-left: auto;
}

.wia-controls .wia-tokens-label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    user-select: none;
}

.wia-controls .wia-tokens-input {
    width: 72px !important;
    padding: 2px 6px !important;
    font-size: 0.9em !important;
    text-align: center;
}

/* ── ACC modal: context preamble controls ── */

.acc-context-section {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 12px;
    padding: 8px 10px;
    border: 1px solid var(--SmartThemeBorderColor, #555);
    border-radius: 4px;
}

.acc-context-section .checkbox_label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9em;
    cursor: pointer;
}

.acc-lorebook-picker {
    position: relative;
    font-size: 0.9em;
}

.acc-lorebook-picker > summary {
    cursor: pointer;
    list-style: none;
    padding: 4px 8px;
    border: 1px solid var(--SmartThemeBorderColor, #555);
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    opacity: 0.85;
}

.acc-lorebook-picker > summary::-webkit-details-marker {
    display: none;
}

.acc-lorebook-picker > summary:hover {
    opacity: 1;
}

.acc-lorebook-list {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 2px;
    z-index: 10002;
    min-width: 240px;
    max-height: 260px;
    overflow-y: auto;
    background: var(--SmartThemeBlurTintColor, #1a1a2e);
    border: 1px solid var(--SmartThemeBorderColor, #555);
    border-radius: 4px;
    padding: 6px 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.acc-lorebook-item {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
}

.acc-lorebook-empty {
    opacity: 0.6;
    font-style: italic;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   NARRATIVE GUIDANCE SETTINGS STYLES
   ═══════════════════════════════════════════════════════════════════════════════ */

#saints_silly_settings .saints_subsection_header {
    margin: 12px 0 4px 0;
    opacity: 0.85;
}

#saints_silly_settings .ng_prompt_section {
    margin-top: 8px;
    margin-bottom: 8px;
}

#saints_silly_settings .ng_prompt_section textarea {
    width: 100%;
    resize: vertical;
    font-family: monospace;
    font-size: 0.9em;
    margin-top: 4px;
}

#saints_silly_settings .ng_buttons_row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 4px;
}

#saints_silly_settings .ng_buttons_row .menu_button {
    flex: 1;
    min-width: 0;
    text-align: center;
    white-space: nowrap;
}

#saints_silly_settings .ng_inline_row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin: 6px 0;
}

#saints_silly_settings .ng_number_input {
    width: 5em;
    flex: 0 0 auto;
}

#saints_silly_settings .ng_select_input {
    width: auto;
    flex: 0 0 auto;
}

#saints_silly_settings .ng-lorebook-picker {
    margin: 8px 0;
}

#saints_silly_settings .ng-lorebook-list {
    margin-top: 4px;
    padding: 6px 8px;
    border: 1px solid var(--SmartThemeBorderColor, #555);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

#saints_silly_settings .ng-lorebook-item {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
}

#saints_silly_settings .ng-lorebook-empty {
    opacity: 0.6;
    font-style: italic;
}

#saints_silly_settings [id\$="_regenerate_now"].disabled,
#saints_silly_settings [id\$="_continue_now"].disabled,
#saints_silly_settings [id\$="_retry_now"].disabled {
    opacity: 0.6;
    pointer-events: none;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PROMPT TEMPLATE CONTROLS (shared, one row per prompt)
   ═══════════════════════════════════════════════════════════════════════════════ */

#saints_silly_settings .saints_template_controls {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 6px;
}

#saints_silly_settings .saints_template_select {
    width: 100%;
}

#saints_silly_settings .saints_template_buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

#saints_silly_settings .saints_template_buttons .menu_button {
    flex: 1 1 0;
    min-width: 100px;
    text-align: center;
    white-space: nowrap;
}

#saints_silly_settings .saints_template_buttons .menu_button.disabled {
    opacity: 0.5;
    pointer-events: none;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TOOL PRESET BLOCK & PROMPT PREVIEW
   ═══════════════════════════════════════════════════════════════════════════════ */

#saints_silly_settings .saints_preset_block {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 8px 0;
    padding: 8px;
    border: 1px solid var(--SmartThemeBorderColor, rgba(255, 255, 255, 0.2));
    border-radius: 6px;
}

#saints_silly_settings .saints_preview_btn {
    align-self: flex-start;
    white-space: nowrap;
}

.sse-prompt-preview {
    text-align: left;
}

.sse-prompt-preview h3 {
    margin: 0 0 10px 0;
}

.sse-preview-section {
    margin-bottom: 12px;
}

.sse-preview-label {
    font-weight: bold;
    opacity: 0.8;
    margin-bottom: 4px;
}

.sse-preview-text {
    white-space: pre-wrap;
    word-break: break-word;
    text-align: left;
    font-size: calc(var(--mainFontSize, 14px) * 0.85);
    background-color: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--SmartThemeBorderColor, rgba(255, 255, 255, 0.2));
    border-radius: 6px;
    padding: 8px;
    margin: 0;
    max-height: 40vh;
    overflow-y: auto;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   REFORMATTING
   ═══════════════════════════════════════════════════════════════════════════════ */

/* Engine-specific option blocks; toggled by the Engine dropdown. */
#saints_silly_settings .reformatting_section {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 6px;
}

#saints_silly_settings .reformatting-hidden {
    display: none;
}

/* Mutually-exclusive asterisk-handling choice. */
#saints_silly_settings .reformatting_radio_group {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 2px 0 4px 12px;
}

/* Per-message reformat button — inherits ST's .mes_button sizing; this just
   gives it a subtle hover tint consistent with the other quick buttons. */
.sse-reformat-button {
    cursor: pointer;
}

.sse-reformat-button:hover {
    color: var(--SmartThemeQuoteColor, #6bf);
}

`, "",{"version":3,"sources":["webpack://./src/style.css"],"names":[],"mappings":"AAAA,+CAA+C;;;AAG/C;;oFAEoF;;AAEpF,0CAA0C;;AAE1C;IACI,oBAAoB;IACpB,mBAAmB;IACnB,gBAAgB;IAChB,eAAe;AACnB;;AAEA;IACI,WAAW;IACX,YAAY;IACZ,kBAAkB;IAClB,oDAAoD;IACpD,uBAAuB;IACvB,eAAe;IACf,iFAAiF;IACjF,kBAAkB;IAClB,cAAc;AAClB;;AAEA;IACI,kDAAkD;AACtD;;AAEA;IACI,kDAAkD;IAClD,gDAAgD;IAChD,mEAAmE;AACvE;;AAEA,2CAA2C;;AAE3C;IACI,YAAY;IACZ,gDAAgD;IAChD,eAAe;IACf,kBAAkB;AACtB;;AAEA;IACI,UAAU;AACd;;AAEA;IACI,UAAU;IACV,2CAA2C;AAC/C;;AAEA;IACI,WAAW;IACX,kBAAkB;IAClB,YAAY;IACZ,SAAS;IACT,2BAA2B;IAC3B,UAAU;IACV,WAAW;IACX,kBAAkB;IAClB,sDAAsD;AAC1D;;AAEA,gDAAgD;;AAEhD;IACI,sEAAsE;AAC1E;;AAEA,2DAA2D;;AAE3D;IACI,aAAa;IACb,mBAAmB;IACnB,uBAAuB;IACvB,eAAe;IACf,YAAY;IACZ,8BAA8B;IAC9B,YAAY;AAChB;;AAEA;IACI,UAAU;AACd;;AAEA;IACI,WAAW;IACX,YAAY;IACZ,kBAAkB;IAClB,iBAAiB;IACjB,oDAAoD;IACpD,mCAAmC;AACvC;;AAEA;IACI,kDAAkD;AACtD;;AAEA,mDAAmD;;AAEnD;IACI,wBAAwB;AAC5B;;AAEA;;oFAEoF;;AAEpF,2CAA2C;;AAE3C;IACI,eAAe;IACf,aAAa;IACb,mBAAmB;IACnB,uBAAuB;IACvB,YAAY;IACZ,gDAAgD;IAChD,YAAY;IACZ,gBAAgB;AACpB;;AAEA;IACI,UAAU;IACV,2CAA2C;AAC/C;;AAEA,8BAA8B;;AAE9B;IACI,eAAe;AACnB;;AAEA;IACI,iBAAiB;IACjB,UAAU;IACV,kBAAkB;AACtB;;AAEA,yCAAyC;;AAEzC;IACI,wBAAwB;AAC5B;;AAEA;;oFAEoF;;AAEpF;IACI,aAAa;IACb,sBAAsB;IACtB,QAAQ;IACR,cAAc;AAClB;;AAEA;;qDAEqD;AACrD;IACI,qBAAqB;IACrB,yDAAyD;IACzD,iBAAiB;AACrB;;AAEA;IACI,iBAAiB;IACjB,aAAa;IACb,cAAc;AAClB;;AAEA;IACI,UAAU;AACd;;AAEA;IACI,oBAAoB;AACxB;;AAEA;IACI,aAAa;IACb,mBAAmB;IACnB,QAAQ;AACZ;;AAEA;IACI,mBAAmB;IACnB,aAAa;IACb,mBAAmB;IACnB,QAAQ;AACZ;;AAEA;IACI,YAAY;IACZ,wDAAwD;IACxD,aAAa;AACjB;;AAEA;IACI,eAAe;IACf,kBAAkB;AACtB;;AAEA;IACI,WAAW;IACX,iBAAiB;IACjB,gBAAgB;IAChB,sBAAsB;IACtB,gBAAgB;IAChB,eAAe;AACnB;;AAEA;IACI,aAAa;IACb,QAAQ;IACR,eAAe;IACf,eAAe;AACnB;;AAEA;IACI,OAAO;IACP,YAAY;IACZ,kBAAkB;IAClB,mBAAmB;AACvB;;AAEA;;oFAEoF;;AAEpF;IACI,eAAe;IACf,kBAAkB;AACtB;;AAEA;IACI,WAAW;IACX,iBAAiB;IACjB,gBAAgB;IAChB,sBAAsB;IACtB,gBAAgB;IAChB,eAAe;AACnB;;AAEA;IACI,aAAa;IACb,QAAQ;IACR,eAAe;IACf,eAAe;AACnB;;AAEA;IACI,OAAO;IACP,YAAY;IACZ,kBAAkB;IAClB,mBAAmB;AACvB;;AAEA;;oFAEoF;;AAEpF;IACI,aAAa;IACb,sBAAsB;IACtB,YAAY;IACZ,aAAa;IACb,gBAAgB;AACpB;;AAEA;IACI,mBAAmB;AACvB;;AAEA;IACI,WAAW;IACX,eAAe;IACf,gBAAgB;AACpB;;AAEA;IACI,aAAa;IACb,eAAe;IACf,QAAQ;IACR,kBAAkB;AACtB;;AAEA;IACI,aAAa;IACb,mBAAmB;IACnB,yBAAyB;IACzB,QAAQ;IACR,mBAAmB;IACnB,iBAAiB;IACjB,aAAa;AACjB;;AAEA;IACI,oBAAoB;IACpB,mBAAmB;IACnB,QAAQ;IACR,iBAAiB;AACrB;;AAEA;IACI,sBAAsB;IACtB,2BAA2B;IAC3B,2BAA2B;IAC3B,kBAAkB;AACtB;;AAEA;IACI,WAAW;IACX,gBAAgB;IAChB,kBAAkB;IAClB,mBAAmB;AACvB;;AAEA;IACI,YAAY;IACZ,oBAAoB;AACxB;;AAEA;IACI,2CAA2C;AAC/C;;AAEA;IACI,aAAa;IACb,mBAAmB;IACnB,QAAQ;IACR,iBAAiB;IACjB,mBAAmB;IACnB,4CAA4C;IAC5C,kBAAkB;IAClB,2CAA2C;IAC3C,gBAAgB;AACpB;;AAEA;IACI,aAAa;IACb,sBAAsB;IACtB,YAAY;IACZ,aAAa;AACjB;;AAEA;IACI,kBAAkB;AACtB;;AAEA;IACI,WAAW;IACX,YAAY;IACZ,iBAAiB;IACjB,gBAAgB;AACpB;;AAEA;IACI,YAAY;IACZ,mBAAmB;AACvB;;AAEA;IACI,wBAAwB;AAC5B;;AAEA,2CAA2C;AAC3C;IACI,aAAa;IACb,mBAAmB;IACnB,QAAQ;AACZ;;AAEA,oEAAoE;AACpE;IACI,aAAa;IACb,mBAAmB;IACnB,8BAA8B;IAC9B,QAAQ;IACR,kBAAkB;AACtB;;AAEA;IACI,gBAAgB;IAChB,gBAAgB;IAChB,aAAa;AACjB;;AAEA;IACI,UAAU;AACd;;AAEA;;oFAEoF;;AAEpF,mBAAmB;AACnB;IACI,eAAe;IACf,kBAAkB;AACtB;;AAEA;IACI,WAAW;IACX,iBAAiB;IACjB,gBAAgB;IAChB,sBAAsB;IACtB,gBAAgB;IAChB,eAAe;AACnB;;AAEA;IACI,aAAa;IACb,QAAQ;IACR,eAAe;IACf,eAAe;AACnB;;AAEA;IACI,OAAO;IACP,YAAY;IACZ,kBAAkB;IAClB,mBAAmB;AACvB;;AAEA,+DAA+D;AAC/D;IACI,aAAa;IACb,mBAAmB;IACnB,QAAQ;IACR,eAAe;IACf,mBAAmB;AACvB;;AAEA;IACI,oBAAoB;IACpB,mBAAmB;IACnB,QAAQ;IACR,eAAe;IACf,iBAAiB;IACjB,gBAAgB;AACpB;;AAEA;IACI,2CAA2C;AAC/C;;AAEA;IACI,gBAAgB;AACpB;;AAEA;IACI,2CAA2C;IAC3C,cAAc;IACd,oBAAoB;IACpB,mBAAmB;IACnB,gBAAgB;AACpB;;AAEA;IACI,wBAAwB;AAC5B;;AAEA,8BAA8B;AAC9B;IACI,oBAAoB;IACpB,mBAAmB;IACnB,QAAQ;IACR,iBAAiB;IACjB,eAAe;IACf,aAAa;IACb,iBAAiB;AACrB;;AAEA;IACI,UAAU;AACd;;AAEA,8CAA8C;AAC9C;IACI,kBAAkB;IAClB,iBAAiB;AACrB;;AAEA;IACI,eAAe;IACf,gBAAgB;IAChB,gBAAgB;IAChB,oDAAoD;IACpD,kBAAkB;IAClB,oBAAoB;IACpB,mBAAmB;IACnB,QAAQ;IACR,aAAa;AACjB;;AAEA;IACI,aAAa;AACjB;;AAEA;IACI,UAAU;AACd;;AAEA;IACI,kBAAkB;IAClB,SAAS;IACT,OAAO;IACP,eAAe;IACf,WAAW;IACX,gBAAgB;IAChB,iBAAiB;IACjB,gBAAgB;IAChB,mDAAmD;IACnD,oDAAoD;IACpD,kBAAkB;IAClB,gBAAgB;IAChB,aAAa;IACb,sBAAsB;IACtB,QAAQ;IACR,yCAAyC;AAC7C;;AAEA;IACI,aAAa;IACb,mBAAmB;IACnB,QAAQ;IACR,eAAe;AACnB;;AAEA;IACI,YAAY;IACZ,kBAAkB;AACtB;;AAEA,wDAAwD;AACxD;oDACoD;AACpD;IACI,aAAa;IACb,yBAAyB;IACzB,mBAAmB;AACvB;;AAEA;IACI,gBAAgB;IAChB,gBAAgB;IAChB,aAAa;AACjB;;AAEA;IACI,UAAU;AACd;;AAEA;uEACuE;AACvE;IACI,iBAAiB;AACrB;;AAEA;IACI,aAAa;IACb,mBAAmB;IACnB,8BAA8B;IAC9B,QAAQ;IACR,iBAAiB;AACrB;;AAEA;IACI,gBAAgB;IAChB,gBAAgB;IAChB,YAAY;IACZ,oBAAoB;IACpB,mBAAmB;IACnB,QAAQ;AACZ;;AAEA;IACI,gBAAgB;IAChB,gBAAgB;IAChB,aAAa;AACjB;;AAEA;IACI,UAAU;AACd;;AAEA;IACI,WAAW;IACX,gBAAgB;IAChB,gBAAgB;IAChB,gBAAgB;AACpB;;AAEA,8BAA8B;AAC9B;IACI,oBAAoB;IACpB,mBAAmB;IACnB,QAAQ;IACR,iBAAiB;IACjB,aAAa;IACb,iBAAiB;AACrB;;AAEA;IACI,oBAAoB;IACpB,mBAAmB;IACnB,QAAQ;IACR,iBAAiB;AACrB;;AAEA;IACI,sBAAsB;IACtB,2BAA2B;IAC3B,2BAA2B;IAC3B,kBAAkB;AACtB;;AAEA,+CAA+C;;AAE/C;IACI,aAAa;IACb,mBAAmB;IACnB,SAAS;IACT,eAAe;IACf,mBAAmB;IACnB,iBAAiB;IACjB,oDAAoD;IACpD,kBAAkB;AACtB;;AAEA;IACI,aAAa;IACb,mBAAmB;IACnB,QAAQ;IACR,gBAAgB;IAChB,eAAe;AACnB;;AAEA;IACI,kBAAkB;IAClB,gBAAgB;AACpB;;AAEA;IACI,eAAe;IACf,gBAAgB;IAChB,gBAAgB;IAChB,oDAAoD;IACpD,kBAAkB;IAClB,oBAAoB;IACpB,mBAAmB;IACnB,QAAQ;IACR,aAAa;AACjB;;AAEA;IACI,aAAa;AACjB;;AAEA;IACI,UAAU;AACd;;AAEA;IACI,kBAAkB;IAClB,SAAS;IACT,OAAO;IACP,eAAe;IACf,cAAc;IACd,gBAAgB;IAChB,iBAAiB;IACjB,gBAAgB;IAChB,mDAAmD;IACnD,oDAAoD;IACpD,kBAAkB;IAClB,gBAAgB;IAChB,aAAa;IACb,sBAAsB;IACtB,QAAQ;IACR,yCAAyC;AAC7C;;AAEA;IACI,aAAa;IACb,mBAAmB;IACnB,QAAQ;IACR,eAAe;AACnB;;AAEA;IACI,YAAY;IACZ,kBAAkB;AACtB;;AAEA;;oFAEoF;;AAEpF;IACI,oBAAoB;IACpB,aAAa;AACjB;;AAEA;IACI,eAAe;IACf,kBAAkB;AACtB;;AAEA;IACI,WAAW;IACX,gBAAgB;IAChB,sBAAsB;IACtB,gBAAgB;IAChB,eAAe;AACnB;;AAEA;IACI,aAAa;IACb,QAAQ;IACR,eAAe;IACf,eAAe;AACnB;;AAEA;IACI,OAAO;IACP,YAAY;IACZ,kBAAkB;IAClB,mBAAmB;AACvB;;AAEA;IACI,aAAa;IACb,mBAAmB;IACnB,QAAQ;IACR,eAAe;IACf,aAAa;AACjB;;AAEA;IACI,UAAU;IACV,cAAc;AAClB;;AAEA;IACI,WAAW;IACX,cAAc;AAClB;;AAEA;IACI,aAAa;AACjB;;AAEA;IACI,eAAe;IACf,gBAAgB;IAChB,oDAAoD;IACpD,kBAAkB;IAClB,aAAa;IACb,sBAAsB;IACtB,QAAQ;AACZ;;AAEA;IACI,aAAa;IACb,mBAAmB;IACnB,QAAQ;IACR,eAAe;AACnB;;AAEA;IACI,YAAY;IACZ,kBAAkB;AACtB;;AAEA;;;IAGI,YAAY;IACZ,oBAAoB;AACxB;;AAEA;;oFAEoF;;AAEpF;IACI,aAAa;IACb,sBAAsB;IACtB,QAAQ;IACR,eAAe;AACnB;;AAEA;IACI,WAAW;AACf;;AAEA;IACI,aAAa;IACb,QAAQ;IACR,eAAe;AACnB;;AAEA;IACI,WAAW;IACX,gBAAgB;IAChB,kBAAkB;IAClB,mBAAmB;AACvB;;AAEA;IACI,YAAY;IACZ,oBAAoB;AACxB;;AAEA;;oFAEoF;;AAEpF;IACI,aAAa;IACb,sBAAsB;IACtB,QAAQ;IACR,aAAa;IACb,YAAY;IACZ,wEAAwE;IACxE,kBAAkB;AACtB;;AAEA;IACI,sBAAsB;IACtB,mBAAmB;AACvB;;AAEA;IACI,gBAAgB;AACpB;;AAEA;IACI,kBAAkB;AACtB;;AAEA;IACI,mBAAmB;AACvB;;AAEA;IACI,iBAAiB;IACjB,YAAY;IACZ,kBAAkB;AACtB;;AAEA;IACI,qBAAqB;IACrB,sBAAsB;IACtB,gBAAgB;IAChB,iDAAiD;IACjD,oCAAoC;IACpC,wEAAwE;IACxE,kBAAkB;IAClB,YAAY;IACZ,SAAS;IACT,gBAAgB;IAChB,gBAAgB;AACpB;;AAEA;;oFAEoF;;AAEpF,mEAAmE;AACnE;IACI,aAAa;IACb,sBAAsB;IACtB,QAAQ;IACR,eAAe;AACnB;;AAEA;IACI,aAAa;AACjB;;AAEA,iDAAiD;AACjD;IACI,aAAa;IACb,sBAAsB;IACtB,QAAQ;IACR,sBAAsB;AAC1B;;AAEA;0EAC0E;AAC1E;IACI,eAAe;AACnB;;AAEA;IACI,wCAAwC;AAC5C","sourcesContent":["/* Saint's Silly Extensions — Combined Styles */\n\n\n/* ═══════════════════════════════════════════════════════════════════════════════\n   POSSESSION STYLES\n   ═══════════════════════════════════════════════════════════════════════════════ */\n\n/* ── Group Chat: Radio Button Toggle ── */\n\n.possession_radio_wrapper {\n    display: inline-flex;\n    align-items: center;\n    margin-left: 4px;\n    cursor: pointer;\n}\n\n.possession_radio {\n    width: 16px;\n    height: 16px;\n    border-radius: 50%;\n    border: 2px solid var(--SmartThemeBorderColor, #555);\n    background: transparent;\n    cursor: pointer;\n    transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;\n    position: relative;\n    flex-shrink: 0;\n}\n\n.possession_radio:hover {\n    border-color: var(--SmartThemeQuoteColor, #e8a23a);\n}\n\n.possession_radio.possession_active {\n    border-color: var(--SmartThemeQuoteColor, #e8a23a);\n    background: var(--SmartThemeQuoteColor, #e8a23a);\n    box-shadow: inset 0 0 0 3px var(--SmartThemeBlurTintColor, #1a1a2e);\n}\n\n/* ── Solo Chat: Possess Toggle Button ── */\n\n#possession_solo_btn {\n    opacity: 0.7;\n    transition: opacity 0.15s ease, color 0.15s ease;\n    cursor: pointer;\n    position: relative;\n}\n\n#possession_solo_btn:hover {\n    opacity: 1;\n}\n\n#possession_solo_btn.possession_active {\n    opacity: 1;\n    color: var(--SmartThemeQuoteColor, #e8a23a);\n}\n\n#possession_solo_btn.possession_active::after {\n    content: '';\n    position: absolute;\n    bottom: -2px;\n    left: 50%;\n    transform: translateX(-50%);\n    width: 6px;\n    height: 6px;\n    border-radius: 50%;\n    background-color: var(--SmartThemeQuoteColor, #e8a23a);\n}\n\n/* ── Group member highlight when possessed ── */\n\n.group_member.possession_possessed {\n    border-left: 3px solid var(--SmartThemeQuoteColor, #e8a23a) !important;\n}\n\n/* ── Possession Impersonate Button (Character Avatar) ── */\n\n#possession_impersonate_btn {\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    cursor: pointer;\n    opacity: 0.7;\n    transition: opacity 0.15s ease;\n    padding: 2px;\n}\n\n#possession_impersonate_btn:hover {\n    opacity: 1;\n}\n\n.possession_impersonate_avatar {\n    width: 26px;\n    height: 26px;\n    border-radius: 50%;\n    object-fit: cover;\n    border: 1px solid var(--SmartThemeBorderColor, #555);\n    transition: border-color 0.15s ease;\n}\n\n#possession_impersonate_btn:hover .possession_impersonate_avatar {\n    border-color: var(--SmartThemeQuoteColor, #e8a23a);\n}\n\n/* ── Hide controls when extension is disabled ── */\n\n.possession_hidden {\n    display: none !important;\n}\n\n/* ═══════════════════════════════════════════════════════════════════════════════\n   PHRASING STYLES\n   ═══════════════════════════════════════════════════════════════════════════════ */\n\n/* ── Input Area Button (next to Send) ── */\n\n#phrasing_send_button {\n    cursor: pointer;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    opacity: 0.7;\n    transition: opacity 0.15s ease, color 0.15s ease;\n    padding: 3px;\n    font-size: 1.2em;\n}\n\n#phrasing_send_button:hover {\n    opacity: 1;\n    color: var(--SmartThemeQuoteColor, #e8a23a);\n}\n\n/* ── Hamburger Menu Item ── */\n\n#phrasing_menu_button {\n    cursor: pointer;\n}\n\n#phrasing_menu_button .fa-solid {\n    margin-right: 5px;\n    width: 1em;\n    text-align: center;\n}\n\n/* ── Hide buttons during generation ── */\n\n.phrasing-hidden {\n    display: none !important;\n}\n\n/* ═══════════════════════════════════════════════════════════════════════════════\n   SETTINGS PANEL STYLES\n   ═══════════════════════════════════════════════════════════════════════════════ */\n\n#saints_silly_settings .inline-drawer-content {\n    display: flex;\n    flex-direction: column;\n    gap: 8px;\n    padding: 8px 0;\n}\n\n/* Nested drawers (template fields inside each tool's panel) — slightly\n   indented and with a smaller, dimmer header so they read as a sub-section\n   rather than a peer of the top-level tool drawer. */\n#saints_silly_settings .saints_nested_drawer {\n    margin: 4px 0 4px 4px;\n    border-left: 2px solid var(--SmartThemeBorderColor, #555);\n    padding-left: 8px;\n}\n\n#saints_silly_settings .saints_nested_drawer > .inline-drawer-toggle {\n    font-size: 0.95em;\n    opacity: 0.85;\n    padding: 2px 0;\n}\n\n#saints_silly_settings .saints_nested_drawer > .inline-drawer-toggle:hover {\n    opacity: 1;\n}\n\n#saints_silly_settings .saints_nested_drawer > .inline-drawer-content {\n    padding: 4px 0 4px 0;\n}\n\n#saints_silly_settings .checkbox_label {\n    display: flex;\n    align-items: center;\n    gap: 6px;\n}\n\n#saints_silly_settings .saints_section_header {\n    margin: 4px 0 2px 0;\n    display: flex;\n    align-items: center;\n    gap: 6px;\n}\n\n#saints_silly_settings .saints_divider {\n    border: none;\n    border-top: 1px solid var(--SmartThemeBorderColor, #555);\n    margin: 8px 0;\n}\n\n#saints_silly_settings .phrasing_prompt_section {\n    margin-top: 8px;\n    margin-bottom: 8px;\n}\n\n#saints_silly_settings #phrasing_prompt_textarea {\n    width: 100%;\n    min-height: 120px;\n    resize: vertical;\n    font-family: monospace;\n    font-size: 0.9em;\n    margin-top: 4px;\n}\n\n#saints_silly_settings .phrasing_buttons_row {\n    display: flex;\n    gap: 8px;\n    flex-wrap: wrap;\n    margin-top: 4px;\n}\n\n#saints_silly_settings .phrasing_buttons_row .menu_button {\n    flex: 1;\n    min-width: 0;\n    text-align: center;\n    white-space: nowrap;\n}\n\n/* ═══════════════════════════════════════════════════════════════════════════════\n   ACC SETTINGS STYLES\n   ═══════════════════════════════════════════════════════════════════════════════ */\n\n#saints_silly_settings .acc_prompt_section {\n    margin-top: 8px;\n    margin-bottom: 8px;\n}\n\n#saints_silly_settings #acc_prompt_textarea {\n    width: 100%;\n    min-height: 160px;\n    resize: vertical;\n    font-family: monospace;\n    font-size: 0.9em;\n    margin-top: 4px;\n}\n\n#saints_silly_settings .acc_buttons_row {\n    display: flex;\n    gap: 8px;\n    flex-wrap: wrap;\n    margin-top: 4px;\n}\n\n#saints_silly_settings .acc_buttons_row .menu_button {\n    flex: 1;\n    min-width: 0;\n    text-align: center;\n    white-space: nowrap;\n}\n\n/* ═══════════════════════════════════════════════════════════════════════════════\n   ACC MODAL STYLES (rendered inside ST's Popup; chrome is provided by Popup)\n   ═══════════════════════════════════════════════════════════════════════════════ */\n\n.acc-modal-body {\n    display: flex;\n    flex-direction: column;\n    flex: 1 1 0%;\n    min-height: 0;\n    text-align: left;\n}\n\n.acc-brief-section {\n    margin-bottom: 12px;\n}\n\n.acc-brief-section textarea {\n    width: 100%;\n    margin-top: 4px;\n    resize: vertical;\n}\n\n.acc-action-row {\n    display: flex;\n    flex-wrap: wrap;\n    gap: 8px;\n    margin-bottom: 8px;\n}\n\n.acc-tokens-row {\n    display: flex;\n    align-items: center;\n    justify-content: flex-end;\n    gap: 6px;\n    margin-bottom: 12px;\n    font-size: 0.85em;\n    opacity: 0.85;\n}\n\n.acc-tokens-label {\n    display: inline-flex;\n    align-items: center;\n    gap: 4px;\n    user-select: none;\n}\n\n.acc-tokens-input {\n    width: 80px !important;\n    padding: 2px 6px !important;\n    font-size: 0.9em !important;\n    text-align: center;\n}\n\n.acc-action-btn {\n    flex: 1 1 0;\n    min-width: 110px;\n    text-align: center;\n    white-space: nowrap;\n}\n\n.acc-action-btn.acc-disabled {\n    opacity: 0.3;\n    pointer-events: none;\n}\n\n.acc-generate-btn {\n    color: var(--SmartThemeQuoteColor, #e8a23a);\n}\n\n.acc-status-bar {\n    display: flex;\n    align-items: center;\n    gap: 8px;\n    padding: 8px 12px;\n    margin-bottom: 12px;\n    background: var(--SmartThemeBodyColor, #222);\n    border-radius: 4px;\n    color: var(--SmartThemeQuoteColor, #e8a23a);\n    font-size: 0.9em;\n}\n\n.acc-description-section {\n    display: flex;\n    flex-direction: column;\n    flex: 1 1 0%;\n    min-height: 0;\n}\n\n.acc-description-section label {\n    margin-bottom: 4px;\n}\n\n.acc-description-output {\n    width: 100%;\n    flex: 1 1 0%;\n    min-height: 200px;\n    resize: vertical;\n}\n\n.acc-description-output[disabled] {\n    opacity: 0.5;\n    cursor: not-allowed;\n}\n\n.acc-hidden {\n    display: none !important;\n}\n\n/* ACC Launch button in character creator */\n#acc_launch_btn {\n    display: flex;\n    align-items: center;\n    gap: 4px;\n}\n\n/* Field header row: label on the left, Clear button on the right. */\n.acc-modal-body .acc-field-header {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: 8px;\n    margin-bottom: 4px;\n}\n\n.acc-modal-body .acc-clear-btn {\n    font-size: 0.8em;\n    padding: 2px 8px;\n    opacity: 0.85;\n}\n\n.acc-modal-body .acc-clear-btn:hover {\n    opacity: 1;\n}\n\n/* ═══════════════════════════════════════════════════════════════════════════════\n   WORLD INFO ASSIST STYLES\n   ═══════════════════════════════════════════════════════════════════════════════ */\n\n/* Settings panel */\n#saints_silly_settings .wia_prompt_section {\n    margin-top: 8px;\n    margin-bottom: 8px;\n}\n\n#saints_silly_settings #wia_prompt_textarea {\n    width: 100%;\n    min-height: 160px;\n    resize: vertical;\n    font-family: monospace;\n    font-size: 0.9em;\n    margin-top: 4px;\n}\n\n#saints_silly_settings .wia_buttons_row {\n    display: flex;\n    gap: 8px;\n    flex-wrap: wrap;\n    margin-top: 4px;\n}\n\n#saints_silly_settings .wia_buttons_row .menu_button {\n    flex: 1;\n    min-width: 0;\n    text-align: center;\n    white-space: nowrap;\n}\n\n/* Per-entry assist controls injected into each WI entry form */\n.wia-controls {\n    display: flex;\n    align-items: center;\n    gap: 6px;\n    flex-wrap: wrap;\n    margin: 6px 0 6px 0;\n}\n\n.wia-controls .wia-btn {\n    display: inline-flex;\n    align-items: center;\n    gap: 4px;\n    cursor: pointer;\n    font-size: 0.85em;\n    padding: 4px 8px;\n}\n\n.wia-controls .wia-btn-assist {\n    color: var(--SmartThemeQuoteColor, #e8a23a);\n}\n\n.wia-controls .wia-btn-label {\n    font-weight: 500;\n}\n\n.wia-controls .wia-spinner {\n    color: var(--SmartThemeQuoteColor, #e8a23a);\n    font-size: 1em;\n    display: inline-flex;\n    align-items: center;\n    padding: 4px 6px;\n}\n\n.wia-controls .wia-hidden {\n    display: none !important;\n}\n\n/* Use Chat Context checkbox */\n.wia-controls .wia-context-toggle {\n    display: inline-flex;\n    align-items: center;\n    gap: 4px;\n    font-size: 0.85em;\n    cursor: pointer;\n    opacity: 0.85;\n    user-select: none;\n}\n\n.wia-controls .wia-context-toggle:hover {\n    opacity: 1;\n}\n\n/* Lore book multi-select picker (per-entry) */\n.wia-controls .wia-lorebook-picker {\n    position: relative;\n    font-size: 0.85em;\n}\n\n.wia-controls .wia-lorebook-picker > summary {\n    cursor: pointer;\n    list-style: none;\n    padding: 4px 8px;\n    border: 1px solid var(--SmartThemeBorderColor, #555);\n    border-radius: 4px;\n    display: inline-flex;\n    align-items: center;\n    gap: 4px;\n    opacity: 0.85;\n}\n\n.wia-controls .wia-lorebook-picker > summary::-webkit-details-marker {\n    display: none;\n}\n\n.wia-controls .wia-lorebook-picker > summary:hover {\n    opacity: 1;\n}\n\n.wia-controls .wia-lorebook-list {\n    position: absolute;\n    top: 100%;\n    left: 0;\n    margin-top: 2px;\n    z-index: 50;\n    min-width: 220px;\n    max-height: 240px;\n    overflow-y: auto;\n    background: var(--SmartThemeBlurTintColor, #1a1a2e);\n    border: 1px solid var(--SmartThemeBorderColor, #555);\n    border-radius: 4px;\n    padding: 6px 8px;\n    display: flex;\n    flex-direction: column;\n    gap: 4px;\n    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);\n}\n\n.wia-controls .wia-lorebook-item {\n    display: flex;\n    align-items: center;\n    gap: 6px;\n    cursor: pointer;\n}\n\n.wia-controls .wia-lorebook-empty {\n    opacity: 0.6;\n    font-style: italic;\n}\n\n/* Inline Clear-content button on the WIA controls row */\n/* Content-clear row — sits directly above the entry's content textarea so\n   it's unambiguous which field the button clears. */\n.wia-content-clear-row {\n    display: flex;\n    justify-content: flex-end;\n    margin: 2px 0 4px 0;\n}\n\n.wia-content-clear-row .wia-btn-clear-content {\n    font-size: 0.8em;\n    padding: 2px 8px;\n    opacity: 0.85;\n}\n\n.wia-content-clear-row .wia-btn-clear-content:hover {\n    opacity: 1;\n}\n\n/* Per-entry guidance section — sits between the controls and the entry's\n   content textarea so it's clearly the user's *input* to the assist. */\n.wia-guidance-block {\n    margin: 0 0 8px 0;\n}\n\n.wia-guidance-block .wia-guidance-header {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: 8px;\n    margin: 0 0 4px 0;\n}\n\n.wia-guidance-block .wia-guidance-label {\n    font-size: 0.9em;\n    font-weight: 500;\n    opacity: 0.9;\n    display: inline-flex;\n    align-items: center;\n    gap: 4px;\n}\n\n.wia-guidance-block .wia-btn-clear-guidance {\n    font-size: 0.8em;\n    padding: 2px 8px;\n    opacity: 0.85;\n}\n\n.wia-guidance-block .wia-btn-clear-guidance:hover {\n    opacity: 1;\n}\n\n.wia-guidance-block .wia-guidance-textarea {\n    width: 100%;\n    resize: vertical;\n    min-height: 60px;\n    font-size: 0.9em;\n}\n\n/* Per-entry token limit row */\n.wia-controls .wia-tokens-row {\n    display: inline-flex;\n    align-items: center;\n    gap: 6px;\n    font-size: 0.85em;\n    opacity: 0.85;\n    margin-left: auto;\n}\n\n.wia-controls .wia-tokens-label {\n    display: inline-flex;\n    align-items: center;\n    gap: 4px;\n    user-select: none;\n}\n\n.wia-controls .wia-tokens-input {\n    width: 72px !important;\n    padding: 2px 6px !important;\n    font-size: 0.9em !important;\n    text-align: center;\n}\n\n/* ── ACC modal: context preamble controls ── */\n\n.acc-context-section {\n    display: flex;\n    align-items: center;\n    gap: 12px;\n    flex-wrap: wrap;\n    margin-bottom: 12px;\n    padding: 8px 10px;\n    border: 1px solid var(--SmartThemeBorderColor, #555);\n    border-radius: 4px;\n}\n\n.acc-context-section .checkbox_label {\n    display: flex;\n    align-items: center;\n    gap: 6px;\n    font-size: 0.9em;\n    cursor: pointer;\n}\n\n.acc-lorebook-picker {\n    position: relative;\n    font-size: 0.9em;\n}\n\n.acc-lorebook-picker > summary {\n    cursor: pointer;\n    list-style: none;\n    padding: 4px 8px;\n    border: 1px solid var(--SmartThemeBorderColor, #555);\n    border-radius: 4px;\n    display: inline-flex;\n    align-items: center;\n    gap: 4px;\n    opacity: 0.85;\n}\n\n.acc-lorebook-picker > summary::-webkit-details-marker {\n    display: none;\n}\n\n.acc-lorebook-picker > summary:hover {\n    opacity: 1;\n}\n\n.acc-lorebook-list {\n    position: absolute;\n    top: 100%;\n    left: 0;\n    margin-top: 2px;\n    z-index: 10002;\n    min-width: 240px;\n    max-height: 260px;\n    overflow-y: auto;\n    background: var(--SmartThemeBlurTintColor, #1a1a2e);\n    border: 1px solid var(--SmartThemeBorderColor, #555);\n    border-radius: 4px;\n    padding: 6px 8px;\n    display: flex;\n    flex-direction: column;\n    gap: 4px;\n    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);\n}\n\n.acc-lorebook-item {\n    display: flex;\n    align-items: center;\n    gap: 6px;\n    cursor: pointer;\n}\n\n.acc-lorebook-empty {\n    opacity: 0.6;\n    font-style: italic;\n}\n\n/* ═══════════════════════════════════════════════════════════════════════════════\n   NARRATIVE GUIDANCE SETTINGS STYLES\n   ═══════════════════════════════════════════════════════════════════════════════ */\n\n#saints_silly_settings .saints_subsection_header {\n    margin: 12px 0 4px 0;\n    opacity: 0.85;\n}\n\n#saints_silly_settings .ng_prompt_section {\n    margin-top: 8px;\n    margin-bottom: 8px;\n}\n\n#saints_silly_settings .ng_prompt_section textarea {\n    width: 100%;\n    resize: vertical;\n    font-family: monospace;\n    font-size: 0.9em;\n    margin-top: 4px;\n}\n\n#saints_silly_settings .ng_buttons_row {\n    display: flex;\n    gap: 8px;\n    flex-wrap: wrap;\n    margin-top: 4px;\n}\n\n#saints_silly_settings .ng_buttons_row .menu_button {\n    flex: 1;\n    min-width: 0;\n    text-align: center;\n    white-space: nowrap;\n}\n\n#saints_silly_settings .ng_inline_row {\n    display: flex;\n    align-items: center;\n    gap: 8px;\n    flex-wrap: wrap;\n    margin: 6px 0;\n}\n\n#saints_silly_settings .ng_number_input {\n    width: 5em;\n    flex: 0 0 auto;\n}\n\n#saints_silly_settings .ng_select_input {\n    width: auto;\n    flex: 0 0 auto;\n}\n\n#saints_silly_settings .ng-lorebook-picker {\n    margin: 8px 0;\n}\n\n#saints_silly_settings .ng-lorebook-list {\n    margin-top: 4px;\n    padding: 6px 8px;\n    border: 1px solid var(--SmartThemeBorderColor, #555);\n    border-radius: 4px;\n    display: flex;\n    flex-direction: column;\n    gap: 4px;\n}\n\n#saints_silly_settings .ng-lorebook-item {\n    display: flex;\n    align-items: center;\n    gap: 6px;\n    cursor: pointer;\n}\n\n#saints_silly_settings .ng-lorebook-empty {\n    opacity: 0.6;\n    font-style: italic;\n}\n\n#saints_silly_settings [id$=\"_regenerate_now\"].disabled,\n#saints_silly_settings [id$=\"_continue_now\"].disabled,\n#saints_silly_settings [id$=\"_retry_now\"].disabled {\n    opacity: 0.6;\n    pointer-events: none;\n}\n\n/* ═══════════════════════════════════════════════════════════════════════════════\n   PROMPT TEMPLATE CONTROLS (shared, one row per prompt)\n   ═══════════════════════════════════════════════════════════════════════════════ */\n\n#saints_silly_settings .saints_template_controls {\n    display: flex;\n    flex-direction: column;\n    gap: 6px;\n    margin-top: 6px;\n}\n\n#saints_silly_settings .saints_template_select {\n    width: 100%;\n}\n\n#saints_silly_settings .saints_template_buttons {\n    display: flex;\n    gap: 8px;\n    flex-wrap: wrap;\n}\n\n#saints_silly_settings .saints_template_buttons .menu_button {\n    flex: 1 1 0;\n    min-width: 100px;\n    text-align: center;\n    white-space: nowrap;\n}\n\n#saints_silly_settings .saints_template_buttons .menu_button.disabled {\n    opacity: 0.5;\n    pointer-events: none;\n}\n\n/* ═══════════════════════════════════════════════════════════════════════════════\n   TOOL PRESET BLOCK & PROMPT PREVIEW\n   ═══════════════════════════════════════════════════════════════════════════════ */\n\n#saints_silly_settings .saints_preset_block {\n    display: flex;\n    flex-direction: column;\n    gap: 6px;\n    margin: 8px 0;\n    padding: 8px;\n    border: 1px solid var(--SmartThemeBorderColor, rgba(255, 255, 255, 0.2));\n    border-radius: 6px;\n}\n\n#saints_silly_settings .saints_preview_btn {\n    align-self: flex-start;\n    white-space: nowrap;\n}\n\n.sse-prompt-preview {\n    text-align: left;\n}\n\n.sse-prompt-preview h3 {\n    margin: 0 0 10px 0;\n}\n\n.sse-preview-section {\n    margin-bottom: 12px;\n}\n\n.sse-preview-label {\n    font-weight: bold;\n    opacity: 0.8;\n    margin-bottom: 4px;\n}\n\n.sse-preview-text {\n    white-space: pre-wrap;\n    word-break: break-word;\n    text-align: left;\n    font-size: calc(var(--mainFontSize, 14px) * 0.85);\n    background-color: rgba(0, 0, 0, 0.2);\n    border: 1px solid var(--SmartThemeBorderColor, rgba(255, 255, 255, 0.2));\n    border-radius: 6px;\n    padding: 8px;\n    margin: 0;\n    max-height: 40vh;\n    overflow-y: auto;\n}\n\n/* ═══════════════════════════════════════════════════════════════════════════════\n   REFORMATTING\n   ═══════════════════════════════════════════════════════════════════════════════ */\n\n/* Engine-specific option blocks; toggled by the Engine dropdown. */\n#saints_silly_settings .reformatting_section {\n    display: flex;\n    flex-direction: column;\n    gap: 4px;\n    margin-top: 6px;\n}\n\n#saints_silly_settings .reformatting-hidden {\n    display: none;\n}\n\n/* Mutually-exclusive asterisk-handling choice. */\n#saints_silly_settings .reformatting_radio_group {\n    display: flex;\n    flex-direction: column;\n    gap: 2px;\n    margin: 2px 0 4px 12px;\n}\n\n/* Per-message reformat button — inherits ST's .mes_button sizing; this just\n   gives it a subtle hover tint consistent with the other quick buttons. */\n.sse-reformat-button {\n    cursor: pointer;\n}\n\n.sse-reformat-button:hover {\n    color: var(--SmartThemeQuoteColor, #6bf);\n}\n\n"],"sourceRoot":""}]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ },

/***/ 314
(module) {



/*
  MIT License http://www.opensource.org/licenses/mit-license.php
  Author Tobias Koppers @sokra
*/
module.exports = function (cssWithMappingToString) {
  var list = [];

  // return the list of modules as css string
  list.toString = function toString() {
    return this.map(function (item) {
      var content = "";
      var needLayer = typeof item[5] !== "undefined";
      if (item[4]) {
        content += "@supports (".concat(item[4], ") {");
      }
      if (item[2]) {
        content += "@media ".concat(item[2], " {");
      }
      if (needLayer) {
        content += "@layer".concat(item[5].length > 0 ? " ".concat(item[5]) : "", " {");
      }
      content += cssWithMappingToString(item);
      if (needLayer) {
        content += "}";
      }
      if (item[2]) {
        content += "}";
      }
      if (item[4]) {
        content += "}";
      }
      return content;
    }).join("");
  };

  // import a list of modules into the list
  list.i = function i(modules, media, dedupe, supports, layer) {
    if (typeof modules === "string") {
      modules = [[null, modules, undefined]];
    }
    var alreadyImportedModules = {};
    if (dedupe) {
      for (var k = 0; k < this.length; k++) {
        var id = this[k][0];
        if (id != null) {
          alreadyImportedModules[id] = true;
        }
      }
    }
    for (var _k = 0; _k < modules.length; _k++) {
      var item = [].concat(modules[_k]);
      if (dedupe && alreadyImportedModules[item[0]]) {
        continue;
      }
      if (typeof layer !== "undefined") {
        if (typeof item[5] === "undefined") {
          item[5] = layer;
        } else {
          item[1] = "@layer".concat(item[5].length > 0 ? " ".concat(item[5]) : "", " {").concat(item[1], "}");
          item[5] = layer;
        }
      }
      if (media) {
        if (!item[2]) {
          item[2] = media;
        } else {
          item[1] = "@media ".concat(item[2], " {").concat(item[1], "}");
          item[2] = media;
        }
      }
      if (supports) {
        if (!item[4]) {
          item[4] = "".concat(supports);
        } else {
          item[1] = "@supports (".concat(item[4], ") {").concat(item[1], "}");
          item[4] = supports;
        }
      }
      list.push(item);
    }
  };
  return list;
};

/***/ },

/***/ 354
(module) {



module.exports = function (item) {
  var content = item[1];
  var cssMapping = item[3];
  if (!cssMapping) {
    return content;
  }
  if (typeof btoa === "function") {
    var base64 = btoa(unescape(encodeURIComponent(JSON.stringify(cssMapping))));
    var data = "sourceMappingURL=data:application/json;charset=utf-8;base64,".concat(base64);
    var sourceMapping = "/*# ".concat(data, " */");
    return [content].concat([sourceMapping]).join("\n");
  }
  return [content].join("\n");
};

/***/ },

/***/ 72
(module) {



var stylesInDOM = [];
function getIndexByIdentifier(identifier) {
  var result = -1;
  for (var i = 0; i < stylesInDOM.length; i++) {
    if (stylesInDOM[i].identifier === identifier) {
      result = i;
      break;
    }
  }
  return result;
}
function modulesToDom(list, options) {
  var idCountMap = {};
  var identifiers = [];
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var id = options.base ? item[0] + options.base : item[0];
    var count = idCountMap[id] || 0;
    var identifier = "".concat(id, " ").concat(count);
    idCountMap[id] = count + 1;
    var indexByIdentifier = getIndexByIdentifier(identifier);
    var obj = {
      css: item[1],
      media: item[2],
      sourceMap: item[3],
      supports: item[4],
      layer: item[5]
    };
    if (indexByIdentifier !== -1) {
      stylesInDOM[indexByIdentifier].references++;
      stylesInDOM[indexByIdentifier].updater(obj);
    } else {
      var updater = addElementStyle(obj, options);
      options.byIndex = i;
      stylesInDOM.splice(i, 0, {
        identifier: identifier,
        updater: updater,
        references: 1
      });
    }
    identifiers.push(identifier);
  }
  return identifiers;
}
function addElementStyle(obj, options) {
  var api = options.domAPI(options);
  api.update(obj);
  var updater = function updater(newObj) {
    if (newObj) {
      if (newObj.css === obj.css && newObj.media === obj.media && newObj.sourceMap === obj.sourceMap && newObj.supports === obj.supports && newObj.layer === obj.layer) {
        return;
      }
      api.update(obj = newObj);
    } else {
      api.remove();
    }
  };
  return updater;
}
module.exports = function (list, options) {
  options = options || {};
  list = list || [];
  var lastIdentifiers = modulesToDom(list, options);
  return function update(newList) {
    newList = newList || [];
    for (var i = 0; i < lastIdentifiers.length; i++) {
      var identifier = lastIdentifiers[i];
      var index = getIndexByIdentifier(identifier);
      stylesInDOM[index].references--;
    }
    var newLastIdentifiers = modulesToDom(newList, options);
    for (var _i = 0; _i < lastIdentifiers.length; _i++) {
      var _identifier = lastIdentifiers[_i];
      var _index = getIndexByIdentifier(_identifier);
      if (stylesInDOM[_index].references === 0) {
        stylesInDOM[_index].updater();
        stylesInDOM.splice(_index, 1);
      }
    }
    lastIdentifiers = newLastIdentifiers;
  };
};

/***/ },

/***/ 659
(module) {



var memo = {};

/* istanbul ignore next  */
function getTarget(target) {
  if (typeof memo[target] === "undefined") {
    var styleTarget = document.querySelector(target);

    // Special case to return head of iframe instead of iframe itself
    if (window.HTMLIFrameElement && styleTarget instanceof window.HTMLIFrameElement) {
      try {
        // This will throw an exception if access to iframe is blocked
        // due to cross-origin restrictions
        styleTarget = styleTarget.contentDocument.head;
      } catch (e) {
        // istanbul ignore next
        styleTarget = null;
      }
    }
    memo[target] = styleTarget;
  }
  return memo[target];
}

/* istanbul ignore next  */
function insertBySelector(insert, style) {
  var target = getTarget(insert);
  if (!target) {
    throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");
  }
  target.appendChild(style);
}
module.exports = insertBySelector;

/***/ },

/***/ 540
(module) {



/* istanbul ignore next  */
function insertStyleElement(options) {
  var element = document.createElement("style");
  options.setAttributes(element, options.attributes);
  options.insert(element, options.options);
  return element;
}
module.exports = insertStyleElement;

/***/ },

/***/ 56
(module, __unused_webpack_exports, __webpack_require__) {



/* istanbul ignore next  */
function setAttributesWithoutAttributes(styleElement) {
  var nonce =  true ? __webpack_require__.nc : 0;
  if (nonce) {
    styleElement.setAttribute("nonce", nonce);
  }
}
module.exports = setAttributesWithoutAttributes;

/***/ },

/***/ 825
(module) {



/* istanbul ignore next  */
function apply(styleElement, options, obj) {
  var css = "";
  if (obj.supports) {
    css += "@supports (".concat(obj.supports, ") {");
  }
  if (obj.media) {
    css += "@media ".concat(obj.media, " {");
  }
  var needLayer = typeof obj.layer !== "undefined";
  if (needLayer) {
    css += "@layer".concat(obj.layer.length > 0 ? " ".concat(obj.layer) : "", " {");
  }
  css += obj.css;
  if (needLayer) {
    css += "}";
  }
  if (obj.media) {
    css += "}";
  }
  if (obj.supports) {
    css += "}";
  }
  var sourceMap = obj.sourceMap;
  if (sourceMap && typeof btoa !== "undefined") {
    css += "\n/*# sourceMappingURL=data:application/json;base64,".concat(btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))), " */");
  }

  // For old IE
  /* istanbul ignore if  */
  options.styleTagTransform(css, styleElement, options.options);
}
function removeStyleElement(styleElement) {
  // istanbul ignore if
  if (styleElement.parentNode === null) {
    return false;
  }
  styleElement.parentNode.removeChild(styleElement);
}

/* istanbul ignore next  */
function domAPI(options) {
  if (typeof document === "undefined") {
    return {
      update: function update() {},
      remove: function remove() {}
    };
  }
  var styleElement = options.insertStyleElement(options);
  return {
    update: function update(obj) {
      apply(styleElement, options, obj);
    },
    remove: function remove() {
      removeStyleElement(styleElement);
    }
  };
}
module.exports = domAPI;

/***/ },

/***/ 113
(module) {



/* istanbul ignore next  */
function styleTagTransform(css, styleElement) {
  if (styleElement.styleSheet) {
    styleElement.styleSheet.cssText = css;
  } else {
    while (styleElement.firstChild) {
      styleElement.removeChild(styleElement.firstChild);
    }
    styleElement.appendChild(document.createTextNode(css));
  }
}
module.exports = styleTagTransform;

/***/ }

/******/ });
/************************************************************************/
/******/ // The module cache
/******/ var __webpack_module_cache__ = {};
/******/ 
/******/ // The require function
/******/ function __webpack_require__(moduleId) {
/******/ 	// Check if module is in cache
/******/ 	var cachedModule = __webpack_module_cache__[moduleId];
/******/ 	if (cachedModule !== undefined) {
/******/ 		return cachedModule.exports;
/******/ 	}
/******/ 	// Create a new module (and put it into the cache)
/******/ 	var module = __webpack_module_cache__[moduleId] = {
/******/ 		id: moduleId,
/******/ 		// no module.loaded needed
/******/ 		exports: {}
/******/ 	};
/******/ 
/******/ 	// Execute the module function
/******/ 	__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 
/******/ 	// Return the exports of the module
/******/ 	return module.exports;
/******/ }
/******/ 
/************************************************************************/
/******/ /* webpack/runtime/compat get default export */
/******/ (() => {
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = (module) => {
/******/ 		var getter = module && module.__esModule ?
/******/ 			() => (module['default']) :
/******/ 			() => (module);
/******/ 		__webpack_require__.d(getter, { a: getter });
/******/ 		return getter;
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/define property getters */
/******/ (() => {
/******/ 	// define getter functions for harmony exports
/******/ 	__webpack_require__.d = (exports, definition) => {
/******/ 		for(var key in definition) {
/******/ 			if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 				Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 			}
/******/ 		}
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/hasOwnProperty shorthand */
/******/ (() => {
/******/ 	__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ })();
/******/ 
/******/ /* webpack/runtime/nonce */
/******/ (() => {
/******/ 	__webpack_require__.nc = undefined;
/******/ })();
/******/ 
/************************************************************************/
var __webpack_exports__ = {};

// EXTERNAL MODULE: ./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js
var injectStylesIntoStyleTag = __webpack_require__(72);
var injectStylesIntoStyleTag_default = /*#__PURE__*/__webpack_require__.n(injectStylesIntoStyleTag);
// EXTERNAL MODULE: ./node_modules/style-loader/dist/runtime/styleDomAPI.js
var styleDomAPI = __webpack_require__(825);
var styleDomAPI_default = /*#__PURE__*/__webpack_require__.n(styleDomAPI);
// EXTERNAL MODULE: ./node_modules/style-loader/dist/runtime/insertBySelector.js
var insertBySelector = __webpack_require__(659);
var insertBySelector_default = /*#__PURE__*/__webpack_require__.n(insertBySelector);
// EXTERNAL MODULE: ./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js
var setAttributesWithoutAttributes = __webpack_require__(56);
var setAttributesWithoutAttributes_default = /*#__PURE__*/__webpack_require__.n(setAttributesWithoutAttributes);
// EXTERNAL MODULE: ./node_modules/style-loader/dist/runtime/insertStyleElement.js
var insertStyleElement = __webpack_require__(540);
var insertStyleElement_default = /*#__PURE__*/__webpack_require__.n(insertStyleElement);
// EXTERNAL MODULE: ./node_modules/style-loader/dist/runtime/styleTagTransform.js
var styleTagTransform = __webpack_require__(113);
var styleTagTransform_default = /*#__PURE__*/__webpack_require__.n(styleTagTransform);
// EXTERNAL MODULE: ./node_modules/css-loader/dist/cjs.js!./src/style.css
var style = __webpack_require__(208);
;// ./src/style.css

      
      
      
      
      
      
      
      
      

var options = {};

options.styleTagTransform = (styleTagTransform_default());
options.setAttributes = (setAttributesWithoutAttributes_default());
options.insert = insertBySelector_default().bind(null, "head");
options.domAPI = (styleDomAPI_default());
options.insertStyleElement = (insertStyleElement_default());

var update = injectStylesIntoStyleTag_default()(style/* default */.A, options);




       /* harmony default export */ const src_style = (style/* default */.A && style/* default */.A.locals ? style/* default */.A.locals : undefined);

;// ./src/settings.html
// Module
var code = `<div id="saints_silly_settings" class="extension_settings"> <div class="inline-drawer"> <div class="inline-drawer-toggle inline-drawer-header"> <b><span class="fa-solid fa-ghost"></span> SSE Possession</b> <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div> </div> <div class="inline-drawer-content" style="display:none"> <label class="checkbox_label"> <input id="possession_enabled" type="checkbox"/> <span>Enable Possession</span> </label> <label class="checkbox_label"> <input id="possession_show_toast" type="checkbox"/> <span>Show Toast on Possess/Unpossess</span> </label> </div> </div> <div class="inline-drawer"> <div class="inline-drawer-toggle inline-drawer-header"> <b><span class="fa-solid fa-pen-fancy"></span> SSE Phrasing!</b> <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div> </div> <div class="inline-drawer-content" style="display:none"> <label class="checkbox_label"> <input id="phrasing_enabled" type="checkbox" checked="checked"/> <span>Enable Phrasing!</span> </label> <label class="checkbox_label" title="When enabled, rephrasing a message includes every existing swipe in the prompt and asks the model to produce something wildly different."> <input id="phrasing_inverse_guidance" type="checkbox"/> <span>Inverse Guidance</span> </label> <div class="saints_preset_block"> <label title="Save and switch named bundles of every Phrasing prompt field below."><b><span class="fa-solid fa-box-archive"></span> Preset</b></label> <div class="saints_template_controls" id="phrasing_presets"></div> <div class="menu_button saints_preview_btn" id="phrasing_preview_btn" title="Show exactly what Phrasing! will inject into the chat prompt, with sample values."> <span class="fa-solid fa-eye"></span> Preview Assembled Prompt </div> </div> <div class="inline-drawer saints_nested_drawer"> <div class="inline-drawer-toggle inline-drawer-header"> <b>Prompt Template</b> <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div> </div> <div class="inline-drawer-content" style="display:none"> <div class="phrasing_prompt_section"> <textarea id="phrasing_prompt_textarea" class="text_pole" rows="8" placeholder="Enter your Phrasing! prompt template..."></textarea> <small>Injected into the chat prompt as a system message for the rephrase generation. Placeholder: <code>{{phrasingSeed}}</code> — the speaker-prefixed message being rephrased.</small> </div> </div> </div> <div class="inline-drawer saints_nested_drawer"> <div class="inline-drawer-toggle inline-drawer-header"> <b>Inverse Guidance Prompt Template</b> <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div> </div> <div class="inline-drawer-content" style="display:none"> <div class="phrasing_prompt_section"> <textarea id="phrasing_inverse_prompt_textarea" class="text_pole" rows="8" placeholder="Enter your Inverse Guidance prompt template..."></textarea> <small>Used instead of the standard prompt when Inverse Guidance is on. Placeholders: <code>{{phrasingSeed}}</code>, <code>{{phrasingSwipes}}</code> — the existing swipes to avoid resembling.</small> </div> </div> </div> </div> </div> <div class="inline-drawer"> <div class="inline-drawer-toggle inline-drawer-header"> <b><span class="fa-solid fa-wand-magic-sparkles"></span> SSE Assisted Character Creation</b> <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div> </div> <div class="inline-drawer-content" style="display:none"> <label class="checkbox_label"> <input id="acc_enabled" type="checkbox"/> <span>Enable Assisted Character Creation</span> </label> <div class="ng_inline_row"> <label for="acc_max_context_override"><b><span class="fa-solid fa-coins"></span> Max Context Override:</b></label> <input id="acc_max_context_override" type="number" min="0" step="100" class="text_pole ng_number_input" title="If set above 0, caps how many tokens of context the chat-packer uses for ACC generations. 0 = use the model's full context size."/> <small>0 = use model default</small> </div> <div class="saints_preset_block"> <label title="Save and switch named bundles of the ACC prompt + prefill below. The prompt describes the prefill's opening, so they are saved together."><b><span class="fa-solid fa-box-archive"></span> Preset</b></label> <div class="saints_template_controls" id="acc_presets"></div> <div class="menu_button saints_preview_btn" id="acc_preview_btn" title="Show the exact system prompt, assembled user prompt, and prefill ACC will send, with sample values."> <span class="fa-solid fa-eye"></span> Preview Assembled Prompt </div> </div> <div class="inline-drawer saints_nested_drawer"> <div class="inline-drawer-toggle inline-drawer-header"> <b>Prompt Template</b> <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div> </div> <div class="inline-drawer-content" style="display:none"> <div class="acc_prompt_section"> <textarea id="acc_prompt_textarea" class="text_pole" rows="10" placeholder="Enter your ACC prompt template..."></textarea> <small>Sent as the user prompt for each generation. Placeholders: <code>{{context}}</code> (chat/lore preamble, when enabled in the modal), <code>{{brief}}</code> (your Character Brief). If a placeholder is missing, the context is prepended and the brief appended automatically.</small> </div> </div> </div> <div class="inline-drawer saints_nested_drawer"> <div class="inline-drawer-toggle inline-drawer-header"> <b>Prefill Template</b> <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div> </div> <div class="inline-drawer-content" style="display:none"> <div class="acc_prompt_section"> <textarea id="acc_prefill_textarea" class="text_pole" rows="3" placeholder="Assistant-prefix the model continues. Also prepended to the description on success."></textarea> <small>Sent as an assistant prefix the model continues from, and kept at the top of the final description. If the backend ignores prefills and the model repeats it, the echo is stripped automatically. Keep it in sync with the format the Prompt Template describes.</small> </div> </div> </div> </div> </div> <div class="inline-drawer"> <div class="inline-drawer-toggle inline-drawer-header"> <b><span class="fa-solid fa-book-atlas"></span> SSE World Info Assist</b> <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div> </div> <div class="inline-drawer-content" style="display:none"> <label class="checkbox_label"> <input id="wia_enabled" type="checkbox"/> <span>Enable World Info Assist</span> </label> <div class="ng_inline_row"> <label for="wia_max_context_override"><b><span class="fa-solid fa-coins"></span> Max Context Override:</b></label> <input id="wia_max_context_override" type="number" min="0" step="100" class="text_pole ng_number_input" title="If set above 0, caps how many tokens of context the chat-packer uses for World Info Assist generations. 0 = use the model's full context size."/> <small>0 = use model default</small> </div> <div class="ng_inline_row"> <label for="wia_response_length"><b><span class="fa-solid fa-coins"></span> Response Token Limit:</b></label> <input id="wia_response_length" type="number" min="50" max="8192" step="50" class="text_pole ng_number_input" title="Maximum tokens the model may use for each World Info Assist generation."/> </div> <div class="saints_preset_block"> <label title="Save and switch named bundles of the WIA prompt + both prefills below. The prompt describes the prefill's opening, so they are saved together."><b><span class="fa-solid fa-box-archive"></span> Preset</b></label> <div class="saints_template_controls" id="wia_presets"></div> <div class="menu_button saints_preview_btn" id="wia_preview_btn" title="Show the exact system prompt, assembled user prompt, and prefills WIA will send, with sample values."> <span class="fa-solid fa-eye"></span> Preview Assembled Prompt </div> </div> <div class="inline-drawer saints_nested_drawer"> <div class="inline-drawer-toggle inline-drawer-header"> <b>Prompt Template</b> <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div> </div> <div class="inline-drawer-content" style="display:none"> <div class="wia_prompt_section"> <textarea id="wia_prompt_textarea" class="text_pole" rows="10" placeholder="Enter your World Info Assist prompt template..."></textarea> <small>Sent as the user prompt for each Assist/Continue. Placeholders: <code>{{context}}</code> (chat/lore preamble, when enabled on the entry's Assist row), <code>{{guidance}}</code> (the entry's Assist Guidance text), <code>{{title}}</code> (the entry's title). If context or guidance placeholders are missing, those blocks are added automatically.</small> </div> </div> </div> <div class="inline-drawer saints_nested_drawer"> <div class="inline-drawer-toggle inline-drawer-header"> <b>Prefill Template — Titled Entry</b> <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div> </div> <div class="inline-drawer-content" style="display:none"> <div class="wia_prompt_section"> <textarea id="wia_prefill_titled_textarea" class="text_pole" rows="3" placeholder="Assistant-prefix used when the entry has a title."></textarea> <small>Sent as an assistant prefix when the entry has a title, and kept at the start of the entry on success. Placeholder: <code>{{title}}</code>. If the backend ignores prefills and the model repeats it, the echo is stripped automatically.</small> </div> </div> </div> <div class="inline-drawer saints_nested_drawer"> <div class="inline-drawer-toggle inline-drawer-header"> <b>Prefill Template — Untitled Entry</b> <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div> </div> <div class="inline-drawer-content" style="display:none"> <div class="wia_prompt_section"> <textarea id="wia_prefill_untitled_textarea" class="text_pole" rows="3" placeholder="Assistant-prefix used when the entry has no title yet."></textarea> <small>Sent as an assistant prefix when the entry has no title, and kept at the start of the entry on success. If the backend ignores prefills and the model repeats it, the echo is stripped automatically.</small> </div> </div> </div> </div> </div> <div class="inline-drawer"> <div class="inline-drawer-toggle inline-drawer-header"> <b><span class="fa-solid fa-compass"></span> SSE Narrative Guidance</b> <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div> </div> <div class="inline-drawer-content" style="display:none"> <small>Two independent tiers of story direction. <b>Long-term</b> sets the overarching arc on a slow refresh horizon; <b>Short-term</b> sets the immediate beats on a fast one and is seeded with the active long-term arc so the two stay aligned. Each tier has its own toggle, cadence, prompts, lore books and guidance text.</small> <div class="inline-drawer saints_nested_drawer"> <div class="inline-drawer-toggle inline-drawer-header"> <b><span class="fa-solid fa-mountain-sun"></span> Long-term (the overarching arc)</b> <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div> </div> <div class="inline-drawer-content" style="display:none"> <label class="checkbox_label"> <input id="ng_long_enabled" type="checkbox"/> <span>Enable Long-term Guidance</span> </label> <label class="checkbox_label" title="When on, regenerates the long-term arc automatically when its turn counter hits zero. When off, only the Regenerate Now button updates it."> <input id="ng_long_auto_regen" type="checkbox"/> <span>Auto-Regenerate at Zero</span> </label> <div class="ng_inline_row"> <label for="ng_long_default_turn_count"><b>Turns Between Regenerations:</b></label> <input id="ng_long_default_turn_count" type="number" min="1" step="1" class="text_pole ng_number_input"/> </div> <div class="ng_inline_row"> <label for="ng_long_response_length"><b>Response Token Limit:</b></label> <input id="ng_long_response_length" type="number" min="1" step="1" class="text_pole ng_number_input" title="Maximum number of tokens the model may use for each generated guidance paragraph."/> </div> <div class="ng_inline_row"> <label for="ng_long_max_context_override"><b><span class="fa-solid fa-coins"></span> Max Context Override:</b></label> <input id="ng_long_max_context_override" type="number" min="0" step="100" class="text_pole ng_number_input" title="If set above 0, caps how many tokens of context the chat-packer uses for long-term generations. 0 = use the model's full context size."/> <small>0 = use model default</small> </div> <div class="ng_inline_row"> <label for="ng_long_injection_depth"><b>Depth:</b></label> <input id="ng_long_injection_depth" type="number" min="0" step="1" class="text_pole ng_number_input" title="Number of recent chat messages to insert the guidance after (0 = bottom)."/> <label for="ng_long_injection_role"><b>Role:</b></label> <select id="ng_long_injection_role" class="text_pole ng_select_input" title="Role used when injecting the guidance into the prompt."> <option value="system">System</option> <option value="user">User</option> <option value="assistant">Assistant</option> </select> </div> <div id="ng_long_lorebooks_host"></div> <div class="ng_inline_row"> <span><b>Turns Remaining:</b> <span id="ng_long_remaining_display">0</span></span> <div class="menu_button" id="ng_long_decrement_button" title="Decrement remaining by 1"> <span class="fa-solid fa-minus"></span> </div> <div class="menu_button" id="ng_long_reset_button" title="Reset remaining to default turn count"> <span class="fa-solid fa-rotate-right"></span> Reset </div> <div class="menu_button disabled" id="ng_long_continue_now" title="Continue the current guidance paragraph"> <span class="fa-solid fa-arrow-right"></span> Continue </div> <div class="menu_button disabled" id="ng_long_retry_now" title="Restore previous guidance and regenerate"> <span class="fa-solid fa-rotate-right"></span> Retry </div> <div class="menu_button" id="ng_long_regenerate_now" title="Regenerate guidance now"> <span class="ng-regen-icon fa-solid fa-wand-sparkles"></span> Regenerate Now </div> </div> <div class="ng_prompt_section"> <label for="ng_long_themes_textarea"><b>Themes / Story Arcs:</b></label> <textarea id="ng_long_themes_textarea" class="text_pole" rows="4" placeholder="Optional themes, ideas, or arcs for the AI to consider..."></textarea> </div> <div class="ng_prompt_section"> <label for="ng_long_active_guidance_textarea"><b>Active Guidance:</b></label> <textarea id="ng_long_active_guidance_textarea" class="text_pole" rows="6" placeholder="The currently active long-term arc. Edit freely; changes apply on the next AI turn."></textarea> </div> <div class="saints_preset_block"> <label title="Save and switch named bundles of the three long-term prompt fields below."><b><span class="fa-solid fa-box-archive"></span> Preset</b></label> <div class="saints_template_controls" id="ng_long_presets"></div> <div class="menu_button saints_preview_btn" id="ng_long_preview_btn" title="Show the exact system prompt, assembled user prompt, prefill, and injection long-term guidance will send, with sample values."> <span class="fa-solid fa-eye"></span> Preview Assembled Prompt </div> </div> <div class="inline-drawer saints_nested_drawer"> <div class="inline-drawer-toggle inline-drawer-header"> <b>Generation Instructions Template</b> <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div> </div> <div class="inline-drawer-content" style="display:none"> <div class="ng_prompt_section"> <textarea id="ng_long_user_prompt_textarea" class="text_pole" rows="5" placeholder="Instructions sent as the user prompt for each generation..."></textarea> <small>Sent as the user prompt for each generation. Placeholders: <code>{{context}}</code> (chat/lore preamble), <code>{{themes}}</code> (your Themes / Story Arcs block). If a placeholder is missing, the blocks are prepended automatically.</small> </div> </div> </div> <div class="inline-drawer saints_nested_drawer"> <div class="inline-drawer-toggle inline-drawer-header"> <b>Prefill Template</b> <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div> </div> <div class="inline-drawer-content" style="display:none"> <div class="ng_prompt_section"> <textarea id="ng_long_generation_prompt_textarea" class="text_pole" rows="4" placeholder="Enter the prefill that the LLM will continue..."></textarea> <small>Sent as an assistant prefix the model continues from; the prefill plus the reply becomes the active guidance. If it opens with "[", the brackets are stripped when the guidance is injected into the chat prompt. If the backend ignores prefills and the model repeats it, the echo is stripped automatically.</small> </div> </div> </div> <div class="inline-drawer saints_nested_drawer"> <div class="inline-drawer-toggle inline-drawer-header"> <b>Injection Prompt Template</b> <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div> </div> <div class="inline-drawer-content" style="display:none"> <div class="ng_prompt_section"> <textarea id="ng_long_injection_prompt_textarea" class="text_pole" rows="3" placeholder="Template injected before each AI turn..."></textarea> <small>Added to the chat prompt before each AI turn while guidance is active. Placeholder: <code>{{guidance}}</code> — the active guidance text (outer brackets stripped).</small> </div> </div> </div> </div> </div> <div class="inline-drawer saints_nested_drawer"> <div class="inline-drawer-toggle inline-drawer-header"> <b><span class="fa-solid fa-bolt"></span> Short-term (the immediate beats)</b> <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div> </div> <div class="inline-drawer-content" style="display:none"> <label class="checkbox_label"> <input id="ng_short_enabled" type="checkbox"/> <span>Enable Short-term Guidance</span> </label> <label class="checkbox_label" title="When on, regenerates the short-term beats automatically when its turn counter hits zero (and whenever the long-term arc refreshes). When off, only the Regenerate Now button updates it."> <input id="ng_short_auto_regen" type="checkbox"/> <span>Auto-Regenerate at Zero</span> </label> <div class="ng_inline_row"> <label for="ng_short_default_turn_count"><b>Turns Between Regenerations:</b></label> <input id="ng_short_default_turn_count" type="number" min="1" step="1" class="text_pole ng_number_input"/> </div> <div class="ng_inline_row"> <label for="ng_short_response_length"><b>Response Token Limit:</b></label> <input id="ng_short_response_length" type="number" min="1" step="1" class="text_pole ng_number_input" title="Maximum number of tokens the model may use for each generated guidance paragraph."/> </div> <div class="ng_inline_row"> <label for="ng_short_max_context_override"><b><span class="fa-solid fa-coins"></span> Max Context Override:</b></label> <input id="ng_short_max_context_override" type="number" min="0" step="100" class="text_pole ng_number_input" title="If set above 0, caps how many tokens of context the chat-packer uses for short-term generations. 0 = use the model's full context size."/> <small>0 = use model default</small> </div> <div class="ng_inline_row"> <label for="ng_short_injection_depth"><b>Depth:</b></label> <input id="ng_short_injection_depth" type="number" min="0" step="1" class="text_pole ng_number_input" title="Number of recent chat messages to insert the guidance after (0 = bottom)."/> <label for="ng_short_injection_role"><b>Role:</b></label> <select id="ng_short_injection_role" class="text_pole ng_select_input" title="Role used when injecting the guidance into the prompt."> <option value="system">System</option> <option value="user">User</option> <option value="assistant">Assistant</option> </select> </div> <div id="ng_short_lorebooks_host"></div> <div class="ng_inline_row"> <span><b>Turns Remaining:</b> <span id="ng_short_remaining_display">0</span></span> <div class="menu_button" id="ng_short_decrement_button" title="Decrement remaining by 1"> <span class="fa-solid fa-minus"></span> </div> <div class="menu_button" id="ng_short_reset_button" title="Reset remaining to default turn count"> <span class="fa-solid fa-rotate-right"></span> Reset </div> <div class="menu_button disabled" id="ng_short_continue_now" title="Continue the current guidance paragraph"> <span class="fa-solid fa-arrow-right"></span> Continue </div> <div class="menu_button disabled" id="ng_short_retry_now" title="Restore previous guidance and regenerate"> <span class="fa-solid fa-rotate-right"></span> Retry </div> <div class="menu_button" id="ng_short_regenerate_now" title="Regenerate guidance now"> <span class="ng-regen-icon fa-solid fa-wand-sparkles"></span> Regenerate Now </div> </div> <div class="ng_prompt_section"> <label for="ng_short_themes_textarea"><b>Themes / Story Arcs:</b></label> <textarea id="ng_short_themes_textarea" class="text_pole" rows="4" placeholder="Optional themes, ideas, or arcs for the AI to consider..."></textarea> </div> <div class="ng_prompt_section"> <label for="ng_short_active_guidance_textarea"><b>Active Guidance:</b></label> <textarea id="ng_short_active_guidance_textarea" class="text_pole" rows="6" placeholder="The currently active short-term beats. Edit freely; changes apply on the next AI turn."></textarea> </div> <div class="saints_preset_block"> <label title="Save and switch named bundles of the three short-term prompt fields below."><b><span class="fa-solid fa-box-archive"></span> Preset</b></label> <div class="saints_template_controls" id="ng_short_presets"></div> <div class="menu_button saints_preview_btn" id="ng_short_preview_btn" title="Show the exact system prompt, assembled user prompt, prefill, and injection short-term guidance will send, with sample values."> <span class="fa-solid fa-eye"></span> Preview Assembled Prompt </div> </div> <div class="inline-drawer saints_nested_drawer"> <div class="inline-drawer-toggle inline-drawer-header"> <b>Generation Instructions Template</b> <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div> </div> <div class="inline-drawer-content" style="display:none"> <div class="ng_prompt_section"> <textarea id="ng_short_user_prompt_textarea" class="text_pole" rows="5" placeholder="Instructions sent as the user prompt for each generation..."></textarea> <small>Sent as the user prompt for each generation. Placeholders: <code>{{context}}</code> (chat/lore preamble), <code>{{longGuidance}}</code> (the active long-term arc), <code>{{themes}}</code> (your Themes / Story Arcs block). If a placeholder is missing, the blocks are prepended automatically.</small> </div> </div> </div> <div class="inline-drawer saints_nested_drawer"> <div class="inline-drawer-toggle inline-drawer-header"> <b>Prefill Template</b> <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div> </div> <div class="inline-drawer-content" style="display:none"> <div class="ng_prompt_section"> <textarea id="ng_short_generation_prompt_textarea" class="text_pole" rows="4" placeholder="Enter the prefill that the LLM will continue..."></textarea> <small>Sent as an assistant prefix the model continues from; the prefill plus the reply becomes the active guidance. If it opens with "[", the brackets are stripped when the guidance is injected into the chat prompt. If the backend ignores prefills and the model repeats it, the echo is stripped automatically.</small> </div> </div> </div> <div class="inline-drawer saints_nested_drawer"> <div class="inline-drawer-toggle inline-drawer-header"> <b>Injection Prompt Template</b> <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div> </div> <div class="inline-drawer-content" style="display:none"> <div class="ng_prompt_section"> <textarea id="ng_short_injection_prompt_textarea" class="text_pole" rows="3" placeholder="Template injected before each AI turn..."></textarea> <small>Added to the chat prompt before each AI turn while guidance is active. Placeholder: <code>{{guidance}}</code> — the active guidance text (outer brackets stripped).</small> </div> </div> </div> </div> </div> </div> </div> <div class="inline-drawer"> <div class="inline-drawer-toggle inline-drawer-header"> <b><span class="fa-solid fa-text-slash"></span> SSE Reformatting</b> <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div> </div> <div class="inline-drawer-content" style="display:none"> <small>Normalizes the formatting of AI character messages after they're generated. Runs automatically on each reply, or manually via the <span class="fa-solid fa-text-slash"></span> button on each message. The original text is always kept as a swipe, so a reformat is reversible.</small> <label class="checkbox_label"> <input id="reformatting_enabled" type="checkbox"/> <span>Enable Reformatting</span> </label> <label class="checkbox_label" title="When on, every AI character message is reformatted as it arrives. When off, only the per-message button (or /reformat) reformats."> <input id="reformatting_auto" type="checkbox"/> <span>Auto-Reformat AI Messages</span> </label> <div class="ng_inline_row"> <label for="reformatting_engine"><b>Engine:</b></label> <select id="reformatting_engine" class="text_pole ng_select_input" title="Rules — fast, free, deterministic transforms. LLM — send the message to the model with the prompt below."> <option value="rules">Rules (deterministic)</option> <option value="llm">LLM (prompt-based)</option> </select> </div> <div id="reformatting_rules_section" class="reformatting_section"> <label><b>Asterisks:</b></label> <div class="reformatting_radio_group"> <label class="checkbox_label" title="Leave asterisks exactly as the model wrote them."> <input type="radio" name="reformatting_asterisk_mode" value="none"/> <span>Leave as-is</span> </label> <label class="checkbox_label" title="Remove every asterisk (markdown italic / bold emphasis marker). Turns *He danced.* into He danced."> <input type="radio" name="reformatting_asterisk_mode" value="strip"/> <span>Strip asterisks</span> </label> <label class="checkbox_label" title="Wrap narration (everything outside quoted dialogue) in asterisks. Strips existing asterisks first, so the result is consistent. Turns He danced. &quot;Hi.&quot; into *He danced.* &quot;Hi.&quot;"> <input type="radio" name="reformatting_asterisk_mode" value="wrap"/> <span>Wrap narration in asterisks</span> </label> </div> <label class="checkbox_label" title="Collapse runs of 3+ blank lines to one and trim trailing spaces. Applies on top of the asterisk choice above."> <input id="reformatting_collapse_whitespace" type="checkbox"/> <span>Collapse Extra Whitespace</span> </label> </div> <div id="reformatting_llm_section" class="reformatting_section"> <div class="ng_inline_row"> <label for="reformatting_response_length"><b><span class="fa-solid fa-coins"></span> Response Token Limit:</b></label> <input id="reformatting_response_length" type="number" min="50" max="8192" step="50" class="text_pole ng_number_input" title="Maximum tokens the model may use to reformat a message."/> </div> <div class="saints_preset_block"> <label title="Save and switch named bundles of the Reformatting prompt + prefill below."><b><span class="fa-solid fa-box-archive"></span> Preset</b></label> <div class="saints_template_controls" id="reformatting_presets"></div> <div class="menu_button saints_preview_btn" id="reformatting_preview_btn" title="Show the exact system prompt, assembled user prompt, and prefill the LLM engine will send, with a sample message."> <span class="fa-solid fa-eye"></span> Preview Assembled Prompt </div> </div> <div class="inline-drawer saints_nested_drawer"> <div class="inline-drawer-toggle inline-drawer-header"> <b>Prompt Template</b> <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div> </div> <div class="inline-drawer-content" style="display:none"> <div class="reformatting_prompt_section"> <textarea id="reformatting_prompt_textarea" class="text_pole" rows="10" placeholder="Enter your Reformatting prompt template..."></textarea> <small>Sent as the user prompt for each LLM reformat. Placeholder: <code>{{message}}</code> — the message being reformatted. If it's missing, the message is appended automatically.</small> </div> </div> </div> <div class="inline-drawer saints_nested_drawer"> <div class="inline-drawer-toggle inline-drawer-header"> <b>Prefill Template</b> <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div> </div> <div class="inline-drawer-content" style="display:none"> <div class="reformatting_prompt_section"> <textarea id="reformatting_prefill_textarea" class="text_pole" rows="3" placeholder="Optional assistant prefix the model continues from (leave empty for none)."></textarea> <small>Optional. Sent as an assistant prefix the model continues from, and kept at the start of the result. If the backend ignores prefills and the model repeats it, the echo is stripped automatically.</small> </div> </div> </div> </div> </div> </div> <div class="inline-drawer"> <div class="inline-drawer-toggle inline-drawer-header"> <b><span class="fa-solid fa-bug"></span> SSE Diagnostics</b> <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div> </div> <div class="inline-drawer-content" style="display:none"> <label class="checkbox_label" title="Log detailed Possession events to the browser console."> <input id="possession_debug_mode" type="checkbox"/> <span>Possession Debug Mode</span> </label> <label class="checkbox_label" title="Log detailed Phrasing events to the browser console."> <input id="phrasing_debug_mode" type="checkbox"/> <span>Phrasing Debug Mode</span> </label> <label class="checkbox_label" title="Log detailed Assisted Character Creation events, prompts, and generations to the browser console."> <input id="acc_debug_mode" type="checkbox"/> <span>ACC Debug Mode</span> </label> <label class="checkbox_label" title="Log detailed World Info Assist events, prompts, and generations to the browser console."> <input id="wia_debug_mode" type="checkbox"/> <span>WI Assist Debug Mode</span> </label> <label class="checkbox_label" title="Log detailed Narrative Guidance events to the browser console."> <input id="ng_debug_mode" type="checkbox"/> <span>Narrative Guidance Debug Mode</span> </label> <label class="checkbox_label" title="Log detailed Reformatting events (engine, per-message decisions, LLM prompts) to the browser console."> <input id="reformatting_debug_mode" type="checkbox"/> <span>Reformatting Debug Mode</span> </label> <label class="checkbox_label" title="Log silent-generation lifecycle (job start/abort/completion, stop-listener events, stream token counts) to the browser console. Useful when diagnosing stop-button behavior across backends."> <input id="silent_generation_debug_mode" type="checkbox"/> <span>Silent Generation Debug Mode</span> </label> </div> </div> </div> `;
// Exports
/* harmony default export */ const settings = (code);
;// external "../../../../world-info.js"

;// external "../../../../../script.js"

;// external "../../../../tokenizers.js"

;// external "../../../../popup.js"

;// ./src/silent-generation.js
/**
 * Silent Generation Manager
 *
 * SillyTavern's stop button reliably cancels normal user-input generations
 * but not the "silent" / background ones extensions kick off through
 * `generateRaw` / `generateQuietPrompt`. ST's `generateRawData()` does listen
 * for `GENERATION_STOPPED` and aborts its local fetch, but two problems
 * remain in practice:
 *
 *   1. The stop button (`#mes_stop`) is hidden whenever a modal is open or
 *      the chat input is locked, so DOM-click-based "cancel" hacks no-op
 *      exactly when extensions need them most.
 *   2. Even when the underlying fetch is aborted, the `await` in extension
 *      code can still hang on the streaming reader or post-processing
 *      until the upstream call unwinds — so users see the UI sit there
 *      and then dump the discarded result.
 *
 * This module centralizes cancellation for every silent generation an
 * extension makes:
 *
 *   - Hooks `GENERATION_STOPPED` once at module load and aborts every
 *     in-flight silent job.
 *   - Hands each job its own AbortController and races the work against
 *     that signal so the awaiting caller returns immediately on cancel,
 *     even if upstream is still draining.
 *   - Exposes `abortAllSilentGenerations()` for extension UIs (modal close
 *     buttons, in-tool Cancel buttons) so they don't need to fight with
 *     `#mes_stop`'s visibility.
 *
 * Callers that opt in via `runCancellableSilentGeneration` or the
 * cancellation-aware `streamingGenerate` get AbortError-on-cancel for free.
 */




// ─── Module State ───

const activeJobs = new Map(); // jobId -> { abortController, name }
let nextJobId = 1;
let stopListenerInstalled = false;
let moduleSettings = null;
let debug = () => {};

// ─── Init ───

/**
 * Initialize the silent-generation manager. Wires up the debug logger
 * against `settings.silentGenerationDebugMode` and installs the
 * `GENERATION_STOPPED` listener. Called once from `index.js`.
 *
 * @param {object} opts
 * @param {object} opts.settings - Shared mutable settings reference.
 */
function initSilentGeneration({ settings }) {
    moduleSettings = settings;
    debug = createDebugLogger('SILENT-GEN', () => moduleSettings?.silentGenerationDebugMode);
    installSilentGenerationStopListener();
    debug('Module initialized');
}

/**
 * Bind the silent-generation settings panel controls. Called from
 * `injectSettingsPanel` in `index.js` after the HTML is injected.
 *
 * @param {() => void} saveSettings - Persist callback.
 */
function bindSilentGenerationSettings(saveSettings) {
    const debugCb = document.getElementById('silent_generation_debug_mode');
    if (debugCb) {
        debugCb.checked = !!moduleSettings?.silentGenerationDebugMode;
        debugCb.addEventListener('change', () => {
            if (moduleSettings) moduleSettings.silentGenerationDebugMode = debugCb.checked;
            saveSettings();
            debug('Debug mode toggled:', debugCb.checked);
        });
    }
}

// ─── Public API ───

/**
 * Install the one-shot GENERATION_STOPPED listener that aborts every active
 * silent generation. Safe to call multiple times — only the first call wires
 * up the listener. Normally invoked via `initSilentGeneration`.
 */
function installSilentGenerationStopListener() {
    if (stopListenerInstalled) {
        debug('Stop listener already installed; skipping');
        return;
    }
    const { eventSource, eventTypes } = getContext();
    if (!eventSource || !eventTypes?.GENERATION_STOPPED) {
        debug('Stop listener NOT installed — eventSource or GENERATION_STOPPED missing');
        return;
    }
    eventSource.on(eventTypes.GENERATION_STOPPED, () => {
        debug('GENERATION_STOPPED received — aborting all silent jobs');
        abortAllSilentGenerations('user-stop');
    });
    stopListenerInstalled = true;
    debug('Stop listener installed');
}

/**
 * Abort every in-flight silent generation by aborting our own local
 * AbortControllers. This frees the awaiting extension code (the
 * `Promise.race` against the abort signal resolves) but does NOT cancel
 * the underlying `generateRaw` fetch — only ST's `GENERATION_STOPPED`
 * event does that. Used by the global stop listener (where the event is
 * the trigger) and as a building block for `abortAllGenerations`. Most
 * extension UI code should call `abortAllGenerations` instead.
 *
 * @param {string} [reason] - Reason recorded on the AbortError.
 * @returns {number} The number of jobs aborted.
 */
function abortAllSilentGenerations(reason = 'aborted') {
    if (activeJobs.size === 0) {
        debug('abortAllSilentGenerations called but no active jobs; reason:', reason);
        return 0;
    }
    let count = 0;
    const jobNames = [];
    for (const [jobId, job] of activeJobs) {
        try {
            job.abortController.abort(
                new DOMException(`Silent generation aborted: ${reason}`, 'AbortError'),
            );
            jobNames.push(`#${jobId}(${job.name})`);
            count++;
        } catch (err) {
            debug('Failed to abort job', jobId, err);
        }
    }
    debug(`Aborted ${count} silent job(s) — reason: ${reason} — jobs:`, jobNames.join(', '));
    return count;
}

/**
 * The "real" cancel path that extension UIs should use. Aborts our own
 * local controllers AND calls ST's exported `stopGeneration()`, which
 * emits `GENERATION_STOPPED`. That event is what ST's `generateRawData`
 * listens for to abort its own fetch — once the fetch aborts, the
 * connection to ST's Node server closes, and ST's server-side handler
 * propagates the abort upstream (e.g. POSTs `/api/extra/abort` to
 * KoboldCpp). Without this call, only the frontend UI frees up and the
 * LLM backend keeps generating to the response cap.
 *
 * Safe to call when nothing is running; ST's `stopGeneration()` is a
 * no-op in that case.
 *
 * @param {string} [reason]
 */
function abortAllGenerations(reason = 'aborted') {
    debug('abortAllGenerations — reason:', reason);
    abortAllSilentGenerations(reason);
    try {
        __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_stopGeneration__();
        debug('ST stopGeneration() invoked');
    } catch (err) {
        debug('ST stopGeneration() threw:', err);
    }
}

/**
 * Whether at least one silent generation is currently in flight.
 *
 * @returns {boolean}
 */
function hasActiveSilentGenerations() {
    return activeJobs.size > 0;
}

/**
 * Run an async generation under the silent-generation cancellation system.
 *
 * The runner receives an AbortSignal. If the user clicks ST's stop button
 * (or any caller invokes `abortAllSilentGenerations`), the signal aborts
 * and the returned promise rejects with an AbortError immediately, without
 * waiting for the upstream fetch / generator to unwind.
 *
 * @template T
 * @param {object} opts
 * @param {(signal: AbortSignal) => Promise<T>} opts.run - The work to perform.
 * @param {string} [opts.name] - Debug name for the job.
 * @returns {Promise<T>}
 * @throws {DOMException} AbortError if cancelled.
 */
async function runCancellableSilentGeneration({ run, name = 'silent-gen' }) {
    installSilentGenerationStopListener();

    const jobId = nextJobId++;
    const abortController = new AbortController();
    activeJobs.set(jobId, { abortController, name });
    const startedAt = Date.now();
    debug(`Job #${jobId}(${name}) started — active jobs:`, activeJobs.size);

    let abortReject;
    const abortPromise = new Promise((_, rej) => { abortReject = rej; });
    const onAbort = () => {
        const reason = abortController.signal.reason
            || new DOMException('Silent generation aborted', 'AbortError');
        debug(`Job #${jobId}(${name}) abort signal fired — reason:`, reason?.message || reason);
        abortReject(reason);
    };
    abortController.signal.addEventListener('abort', onAbort, { once: true });

    // If the abort race wins, the run() promise is abandoned but keeps
    // executing — its eventual rejection (when ST's fetch finally aborts)
    // would surface as an unhandled promise rejection in the console.
    // Swallow it here; the result is already irrelevant by that point.
    const runPromise = run(abortController.signal);
    runPromise.catch((err) => {
        debug(`Job #${jobId}(${name}) abandoned-runner rejection (swallowed):`, err?.message || err);
    });

    try {
        const result = await Promise.race([runPromise, abortPromise]);
        debug(`Job #${jobId}(${name}) completed normally in ${Date.now() - startedAt}ms`);
        return result;
    } catch (err) {
        const wasAbort = err?.name === 'AbortError';
        debug(`Job #${jobId}(${name}) ${wasAbort ? 'aborted' : 'threw'} after ${Date.now() - startedAt}ms — ${err?.message || err}`);
        throw err;
    } finally {
        abortController.signal.removeEventListener('abort', onAbort);
        activeJobs.delete(jobId);
        debug(`Job #${jobId}(${name}) cleaned up — remaining active jobs:`, activeJobs.size);
    }
}

/**
 * `true` if the given error is a cancellation from this manager (or any
 * AbortError propagated up from ST / fetch). Use this in catch blocks to
 * suppress error toasts when the user deliberately cancelled.
 *
 * @param {unknown} err
 * @returns {boolean}
 */
function isSilentGenerationAbort(err) {
    if (!err) return false;
    if (err.name === 'AbortError') return true;
    const msg = (err.message || '').toLowerCase();
    return msg.includes('aborted') || msg.includes('cancelled by stop event');
}

// ─── Generation Helper ───

/**
 * Run `generateRaw` under the silent-generation cancel system, optionally
 * writing the final result into a target textarea once it arrives.
 *
 * `generateRaw` does not stream into extension callers — it does one fetch
 * and returns the full text — so this fills `targetEl` in a single write
 * when the promise resolves. The name is kept for historical reasons and
 * because callers conceptually wire this to a streaming-style output area.
 *
 * @param {object} params - generateRaw parameters.
 * @param {HTMLTextAreaElement|null} targetEl - Element to write the result into, or null.
 * @param {{ append?: boolean, name?: string }} [opts]
 * @returns {Promise<string>} The full generated text.
 * @throws {DOMException} AbortError if cancelled.
 */
async function cancellableStreamingGenerate(params, targetEl, { append = false, name } = {}) {
    const jobName = name || 'streamingGenerate';
    debug(`cancellableStreamingGenerate — name: ${jobName}, hasTarget: ${!!targetEl}, append: ${append}, promptLen: ${params?.prompt?.length ?? 0}, responseLength: ${params?.responseLength ?? '(default)'}`);

    return runCancellableSilentGeneration({
        name: jobName,
        run: async (signal) => {
            const result = await __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_generateRaw__(params);
            debug(`${jobName} — generateRaw resolved, length: ${(result || '').length}`);
            // If the job was cancelled while generateRaw was in flight, the
            // race in runCancellableSilentGeneration already rejected and the
            // caller moved on — don't clobber the target with the discarded
            // result (the user may have edited the field since).
            if (signal.aborted) return result;
            if (targetEl && result) {
                targetEl.value = append ? ((targetEl.value || '') + result) : result;
                targetEl.scrollTop = targetEl.scrollHeight;
            }
            return result;
        },
    });
}

;// ./src/utils.js
/**
 * Shared utilities for SillyTavern extensions.
 *
 * These helpers encapsulate patterns that recur across extensions:
 *   - Context access
 *   - Toast notifications
 *   - Debug logging
 *   - Settings persistence
 *   - Message-editing helpers
 *   - Generation lifecycle helpers
 *   - Generation context preamble (chat + lore books)
 */







// ─── Context ───

/**
 * Returns a fresh SillyTavern context object.
 * Always call this when you need the context — do not cache it long-term.
 */
function getContext() {
    return SillyTavern.getContext();
}

// ─── Toast Notifications ───

/**
 * Show a toast notification via SillyTavern's global `toastr`.
 *
 * @param {string} message  - Text to display.
 * @param {string} [type]   - One of 'info', 'success', 'warning', 'error'.
 * @param {string} [title]  - Optional toast title.
 */
function toast(message, type = 'info', title = undefined) {
    if (typeof toastr !== 'undefined' && toastr[type]) {
        toastr[type](message, title);
    }
}

/**
 * Show a "sticky" toast that stays visible until it is explicitly dismissed.
 * Useful for signalling an in-progress background generation. Returns a
 * function that removes the toast; calling it more than once is safe.
 *
 * @param {string} message  - Text to display.
 * @param {string} [type]   - One of 'info', 'success', 'warning', 'error'.
 * @param {string} [title]  - Optional toast title.
 * @returns {() => void} Dismiss callback.
 */
function stickyToast(message, type = 'info', title = undefined) {
    if (typeof toastr === 'undefined' || !toastr[type]) {
        return () => {};
    }
    const $toast = toastr[type](message, title, {
        timeOut: 0,
        extendedTimeOut: 0,
        tapToDismiss: false,
        closeButton: false,
    });
    let dismissed = false;
    return () => {
        if (dismissed) return;
        dismissed = true;
        if ($toast) toastr.clear($toast);
    };
}

// ─── Debug Logger Factory ───

/**
 * Creates a conditional debug logger.
 *
 * @param {string}   prefix     - Label printed before every message (e.g. 'MY-EXT').
 * @param {function} isEnabled  - Callback that returns `true` when logging should be active.
 * @returns {function} A `console.log`-style function that only logs when enabled.
 *
 * @example
 *   const debug = createDebugLogger('PHRASING', () => settings.phrasingDebugMode);
 *   debug('seed length:', text.length);
 */
function createDebugLogger(prefix, isEnabled) {
    return (...args) => {
        if (typeof isEnabled === 'function' && !isEnabled()) return;
        console.log(`${prefix}:`, ...args);
    };
}

// ─── Settings Persistence ───

/**
 * Load extension settings, merging saved values over the supplied defaults.
 *
 * @param {string} extensionName  - Key under `context.extensionSettings`.
 * @param {object} defaults       - Default settings object (used for new keys).
 * @returns {object} The merged settings object.
 */
function loadExtensionSettings(extensionName, defaults) {
    const context = getContext();
    const saved = context.extensionSettings?.[extensionName];
    return saved ? { ...defaults, ...saved } : { ...defaults };
}

/**
 * Persist extension settings (debounced).
 *
 * @param {string} extensionName - Key under `context.extensionSettings`.
 * @param {object} settings      - The settings object to save.
 */
function saveExtensionSettings(extensionName, settings) {
    const context = getContext();
    context.extensionSettings[extensionName] = { ...settings };
    context.saveSettingsDebounced();
}

// ─── Message Edit Helpers ───

/**
 * If a message is currently being edited (edit textarea visible), click "Done"
 * to confirm the edit programmatically.
 *
 * @returns {boolean} `true` if an active edit was confirmed; `false` otherwise.
 */
function confirmActiveMessageEdit() {
    const visibleEditButtons = document.querySelector(
        '#chat .mes .mes_edit_buttons[style*="display: inline-flex"]',
    );
    if (visibleEditButtons) {
        const editDoneBtn = visibleEditButtons.querySelector('.mes_edit_done');
        if (editDoneBtn) {
            editDoneBtn.click();
            return true;
        }
    }
    return false;
}

/**
 * Returns the chat-array index of the message currently being edited, or -1
 * if no edit is in progress.
 *
 * @returns {number}
 */
function getEditingMessageIndex() {
    const visibleEditButtons = document.querySelector(
        '#chat .mes .mes_edit_buttons[style*="display: inline-flex"]',
    );
    if (!visibleEditButtons) return -1;
    const mesEl = visibleEditButtons.closest('.mes');
    if (!mesEl) return -1;
    const mesId = mesEl.getAttribute('mesid');
    return mesId !== null ? parseInt(mesId) : -1;
}

// ─── Generation Lifecycle ───

/**
 * Returns a Promise that resolves when the current LLM generation ends
 * (either normally or via user stop). Resolves with the text of the last
 * message in the chat, or '' on timeout / empty chat.
 *
 * @param {number} [timeoutMs=300000] - Timeout in milliseconds (default 5 min).
 * @returns {Promise<string>}
 */
function waitForGenerationEnd(timeoutMs = 5 * 60 * 1000) {
    return new Promise(resolve => {
        const context = getContext();
        const { eventSource, eventTypes } = context;
        let settled = false;

        const cleanup = () => {
            eventSource.removeListener(eventTypes.GENERATION_ENDED, onEnd);
            eventSource.removeListener(eventTypes.GENERATION_STOPPED, onEnd);
        };

        const onEnd = () => {
            if (settled) return;
            settled = true;
            cleanup();
            const ctx = getContext();
            const lastMsg = ctx.chat[ctx.chat.length - 1];
            resolve(lastMsg ? lastMsg.mes : '');
        };

        setTimeout(() => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve('');
        }, timeoutMs);

        eventSource.on(eventTypes.GENERATION_ENDED, onEnd);
        if (eventTypes.GENERATION_STOPPED) {
            eventSource.on(eventTypes.GENERATION_STOPPED, onEnd);
        }
    });
}

// ─── Streaming Generation Helper ───

/**
 * Call generateRaw and optionally stream tokens into targetEl as they arrive.
 *
 * Routes through the silent-generation cancellation manager so the call can
 * be aborted by ST's stop button or by `abortAllSilentGenerations()`. On
 * cancel, this throws an AbortError (rather than returning the partial /
 * discarded result) so callers can short-circuit cleanly.
 *
 * @param {object} params - generateRaw parameters (prompt, systemPrompt, responseLength, etc.)
 * @param {HTMLTextAreaElement|null} targetEl - Field to stream into, or null for no streaming.
 * @param {{ append?: boolean, name?: string }} [opts]
 * @returns {Promise<string>} The full generated text.
 * @throws {DOMException} AbortError if the generation was cancelled.
 */
async function streamingGenerate(params, targetEl, opts = {}) {
    return cancellableStreamingGenerate(params, targetEl, opts);
}

// ─── Single-Line Override ───

/**
 * Temporarily disable ST's "Generate Only One Line Per Request" power-user
 * setting for the duration of fn, then restore it. Prevents silent generations
 * (WIA, ACC, NG) from being truncated at the first newline when the user has
 * that option active for normal chat.
 *
 * @template T
 * @param {() => Promise<T>} fn - Async function to execute with single-line disabled.
 * @returns {Promise<T>}
 */
async function withSingleLineDisabled(fn) {
    const pus = getContext().powerUserSettings;
    const original = pus?.single_line;
    if (pus && original) pus.single_line = false;
    try {
        return await fn();
    } finally {
        if (pus && original !== undefined) pus.single_line = original;
    }
}

// ─── Template Macros ───

/**
 * Replace this extension's own `{{key}}` placeholders in a prompt template.
 *
 * Deliberately NOT SillyTavern's macro engine: ST macros run on Phrasing's
 * injection templates already, but the ACC/WIA templates contain literal
 * `{{ .fooOverride ?? bar }}` override syntax that must pass through
 * untouched, so generation prompts only get this narrow substitution.
 *
 * @param {string} template - Template text possibly containing `{{key}}` placeholders.
 * @param {Record<string, string>} macros - key → replacement value.
 * @returns {{ text: string, used: Set<string> }} The substituted text plus the
 *          set of macro keys that were actually present. Callers use `used`
 *          to fall back to appending/prepending a block when its placeholder
 *          is absent, which keeps old templates working unchanged.
 */
function applyTemplateMacros(template, macros) {
    let text = template || '';
    const used = new Set();
    for (const [key, value] of Object.entries(macros)) {
        const re = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
        if (re.test(text)) {
            used.add(key);
            text = text.replace(new RegExp(re.source, 'gi'), () => value ?? '');
        }
    }
    return { text, used };
}

// ─── Prefill Echo Stripping ───

/**
 * Strip a prefill echo from the start of a generation result.
 *
 * Backends that support assistant-prefix continuation return only the new
 * text, so callers prepend the prefill to the result. Chat-completion
 * backends that ignore the prefix (e.g. OpenAI) often start over and re-emit
 * the prefill (or its final line), which would produce a doubled opening
 * once the prefill is prepended. Detects a full-prefill echo or a final-line
 * echo and removes it. Conservative: requires an exact match of at least a
 * few characters, so legitimate output is never trimmed.
 *
 * @param {string} output  - Cleaned (trimmed) generation result.
 * @param {string} prefill - The prefill that was sent as the assistant prefix.
 * @returns {string} The output with any leading prefill echo removed.
 */
function stripPrefillEcho(output, prefill) {
    if (!output || !prefill) return output;
    const whole = prefill.trim();
    if (whole.length >= 3 && output.startsWith(whole)) {
        return output.slice(whole.length).replace(/^\s+/, '');
    }
    const lines = prefill.split('\n').map(l => l.trim()).filter(Boolean);
    const lastLine = lines[lines.length - 1];
    if (lastLine && lastLine.length >= 4 && output.startsWith(lastLine)) {
        return output.slice(lastLine.length).replace(/^\s+/, '');
    }
    return output;
}

// ─── Prompt Preview Popup ───

/**
 * Show a read-only popup laying out exactly what a tool will send to the
 * model: system prompt, assembled user prompt, prefill, injection, etc.
 *
 * @param {string} title - Popup heading.
 * @param {Array<{ label: string, text: string|null }>} sections - Sections to
 *        render in order. Sections with `text == null` are skipped; empty
 *        strings render as "(empty)".
 */
function showPromptPreview(title, sections) {
    const root = document.createElement('div');
    root.className = 'sse-prompt-preview';

    const heading = document.createElement('h3');
    heading.textContent = title;
    root.appendChild(heading);

    for (const { label, text } of sections) {
        if (text == null) continue;
        const section = document.createElement('div');
        section.className = 'sse-preview-section';
        const labelEl = document.createElement('div');
        labelEl.className = 'sse-preview-label';
        labelEl.textContent = label;
        const pre = document.createElement('pre');
        pre.className = 'sse-preview-text';
        pre.textContent = text || '(empty)';
        section.appendChild(labelEl);
        section.appendChild(pre);
        root.appendChild(section);
    }

    const popup = new __WEBPACK_EXTERNAL_MODULE__popup_js_755810aa_Popup__(root, __WEBPACK_EXTERNAL_MODULE__popup_js_755810aa_POPUP_TYPE__.TEXT, '', {
        okButton: 'Close',
        wide: true,
        large: true,
        allowVerticalScrolling: true,
    });
    popup.show();
}

// ─── Generation Context Preamble ───

/**
 * Collect every "active" character for the current chat.
 *
 * In a solo chat this is just the selected character (`ctx.characterId`).
 * In a group chat this is every enabled member of the group, resolved by
 * avatar (which is the unique on-disk filename — character `name` fields can
 * collide). When two members share the same display name we disambiguate them
 * with a `#N` suffix so the LLM can tell them apart.
 *
 * @param {object} ctx - SillyTavern context object.
 * @returns {Array<{ displayName: string, char: object }>}
 */
function collectActiveCharacters(ctx) {
    const characters = Array.isArray(ctx.characters) ? ctx.characters : [];
    const results = [];
    const seenAvatars = new Set();

    const pushChar = (char) => {
        if (!char || seenAvatars.has(char.avatar)) return;
        seenAvatars.add(char.avatar);
        results.push({ displayName: char.name || '', char });
    };

    // Group chat: walk enabled members.
    const groupId = ctx.groupId;
    if (groupId && Array.isArray(ctx.groups)) {
        const group = ctx.groups.find(g => g.id == groupId);
        if (group && Array.isArray(group.members)) {
            const disabled = Array.isArray(group.disabled_members) ? group.disabled_members : [];
            for (const avatar of group.members) {
                if (disabled.includes(avatar)) continue;
                const char = characters.find(c => c.avatar === avatar);
                if (char) pushChar(char);
            }
        }
    }

    // Solo chat fallback (also covers groups where no member resolved).
    if (!results.length) {
        const char = characters[ctx.characterId];
        if (char) pushChar(char);
    }

    // Disambiguate duplicate display names. Avatar filenames are unique on
    // disk, but two characters in a group can share a `name`, so append a
    // running counter to the second-and-later occurrences.
    const nameCounts = new Map();
    for (const entry of results) {
        const base = entry.displayName || '(unnamed)';
        const seen = nameCounts.get(base) || 0;
        if (seen > 0) {
            entry.displayName = `${base} #${seen + 1}`;
        }
        nameCounts.set(base, seen + 1);
    }

    return results;
}

/**
 * Returns the list of available World Info / lore book names known to ST.
 * Always returns a fresh array; safe to mutate.
 *
 * @returns {string[]}
 */
function getAvailableLoreBookNames() {
    // Prefer the context method, but fall back to the live `world_names`
    // import (the source of truth) and finally to the DOM. Older ST
    // versions don't expose `getWorldInfoNames` on the context.
    const fromContext = getContext().getWorldInfoNames?.();
    if (Array.isArray(fromContext) && fromContext.length) return fromContext;
    if (Array.isArray(__WEBPACK_EXTERNAL_MODULE__world_info_js_83198f57_world_names__) && __WEBPACK_EXTERNAL_MODULE__world_info_js_83198f57_world_names__.length) return __WEBPACK_EXTERNAL_MODULE__world_info_js_83198f57_world_names__.slice();
    const selector = document.getElementById('world_info');
    if (selector) {
        return Array.from(selector.options)
            .map(o => (o.textContent || '').trim())
            .filter(Boolean);
    }
    return [];
}

// ─── World Info Entry Extension Persistence ───

/**
 * Key used to stash this extension's per-entry guidance text inside each
 * World Info entry's `extensions` object. Travels with the lorebook on
 * export so guidance follows the entry across installs.
 */
const WIA_GUIDANCE_EXT_KEY = 'saintsSillyGuidance';

/**
 * Return the name of the world currently open in the WI editor, or null.
 */
function getCurrentWorldEditorName() {
    const sel = document.getElementById('world_editor_select');
    if (!sel) return null;
    const opt = sel.options[sel.selectedIndex];
    if (!opt) return null;
    const text = (opt.textContent || '').trim();
    return text || null;
}

/**
 * Walk up from a WI entry form element to find the closest ancestor that
 * exposes a uid (either as an `uid` attribute or `data-uid`). Returns the
 * raw string or null.
 */
function getEntryUidFromForm(formEl) {
    let el = formEl;
    while (el) {
        if (el.getAttribute) {
            const a = el.getAttribute('uid');
            if (a != null && a !== '') return a;
            const d = el.dataset?.uid;
            if (d != null && d !== '') return d;
        }
        el = el.parentElement;
    }
    return null;
}

/**
 * Read this extension's persisted guidance text for a WI entry. Returns ''
 * when the world/entry/field is missing.
 */
async function readWIAEntryGuidance(worldName, uid) {
    if (!worldName || uid == null || uid === '') return '';
    try {
        const data = await __WEBPACK_EXTERNAL_MODULE__world_info_js_83198f57_loadWorldInfo__(worldName);
        if (!data?.entries) return '';
        const entry = data.entries[uid];
        if (!entry) return '';
        const ext = entry.extensions;
        if (ext && typeof ext === 'object' && typeof ext[WIA_GUIDANCE_EXT_KEY] === 'string') {
            return ext[WIA_GUIDANCE_EXT_KEY];
        }
        return '';
    } catch (err) {
        console.error('Saints-Silly-Extensions: failed to read WIA guidance', err);
        return '';
    }
}

const wiaGuidancePending = new Map(); // mapKey -> { timer, latestValue }

async function flushWIASave(worldName, uid, guidance) {
    try {
        const data = await __WEBPACK_EXTERNAL_MODULE__world_info_js_83198f57_loadWorldInfo__(worldName);
        if (!data?.entries) return;
        const entry = data.entries[uid];
        if (!entry) return;
        if (!entry.extensions || typeof entry.extensions !== 'object') {
            entry.extensions = {};
        }
        if (guidance === '' || guidance == null) {
            delete entry.extensions[WIA_GUIDANCE_EXT_KEY];
        } else {
            entry.extensions[WIA_GUIDANCE_EXT_KEY] = guidance;
        }
        // Mirror to originalData for entries imported from character books,
        // so the extension key survives if ST re-serializes from that shadow.
        if (data.originalData?.entries) {
            try {
                __WEBPACK_EXTERNAL_MODULE__world_info_js_83198f57_setWIOriginalDataValue__(
                    data,
                    uid,
                    `extensions.${WIA_GUIDANCE_EXT_KEY}`,
                    (guidance === '' || guidance == null) ? undefined : guidance,
                );
            } catch (_) { /* originalData mirror is best-effort */ }
        }
        await __WEBPACK_EXTERNAL_MODULE__world_info_js_83198f57_saveWorldInfo__(worldName, data, false);
    } catch (err) {
        console.error('Saints-Silly-Extensions: failed to save WIA guidance', err);
    }
}

/**
 * Persist guidance text into a WI entry's `extensions` field. Debounced per
 * (world,uid) — the latest call wins. An empty string deletes the key.
 */
function saveWIAEntryGuidanceDebounced(worldName, uid, guidance, delayMs = 1200) {
    if (!worldName || uid == null || uid === '') return;
    const mapKey = `${worldName}::${uid}`;
    const existing = wiaGuidancePending.get(mapKey);
    if (existing?.timer) clearTimeout(existing.timer);
    const entry = { latestValue: guidance, timer: null };
    entry.timer = setTimeout(async () => {
        wiaGuidancePending.delete(mapKey);
        await flushWIASave(worldName, uid, entry.latestValue);
    }, delayMs);
    wiaGuidancePending.set(mapKey, entry);
}

/**
 * Force any pending guidance save for (world,uid) to flush immediately.
 * Used on blur so the user doesn't lose unsaved text if they reload right
 * after typing.
 */
async function flushWIAEntryGuidanceSave(worldName, uid) {
    if (!worldName || uid == null || uid === '') return;
    const mapKey = `${worldName}::${uid}`;
    const pending = wiaGuidancePending.get(mapKey);
    if (!pending) return;
    clearTimeout(pending.timer);
    wiaGuidancePending.delete(mapKey);
    await flushWIASave(worldName, uid, pending.latestValue);
}

// ─── Lore Book Picker Widget ───

/**
 * Build a reusable lore-book picker: a `<details>` element containing a list
 * of checkboxes (one per known lore book) plus a summary that shows the
 * current selection count. Re-renders on open so newly added/removed books
 * appear without a reload.
 *
 * @param {object} [opts]
 * @param {string[]} [opts.initialSelection] - Names to start checked.
 * @param {(names: string[]) => void} [opts.onChange] - Called on every selection change.
 * @param {string} [opts.classPrefix='sse-lorebook'] - CSS class prefix; the existing
 *        module-specific styles (wia-…, acc-…, ng-…) all share the same shape,
 *        so callers can pass their own prefix to keep their styling intact.
 * @param {string} [opts.title='Lore Books'] - Summary label when nothing is selected.
 * @returns {{ element: HTMLDetailsElement, getSelected: () => string[] }}
 */
function createLoreBookPicker({
    initialSelection = [],
    onChange = null,
    classPrefix = 'sse-lorebook',
    title = 'Lore Books',
} = {}) {
    const details = document.createElement('details');
    details.className = `${classPrefix}-picker`;
    details.title = 'Prepend active entries from the selected lore books';

    const summary = document.createElement('summary');
    const icon = document.createElement('span');
    icon.className = 'fa-solid fa-book';
    const summaryLabel = document.createElement('span');
    summaryLabel.className = `${classPrefix}-summary-label`;
    summaryLabel.textContent = title;
    summary.appendChild(icon);
    summary.appendChild(document.createTextNode(' '));
    summary.appendChild(summaryLabel);
    details.appendChild(summary);

    const list = document.createElement('div');
    list.className = `${classPrefix}-list`;
    details.appendChild(list);

    const getSelected = () => Array.from(
        list.querySelectorAll('input[type="checkbox"]:checked'),
    ).map(cb => cb.value);

    const updateSummary = () => {
        const count = getSelected().length;
        summaryLabel.textContent = count > 0 ? `${title} (${count})` : title;
    };

    const render = () => {
        const names = getAvailableLoreBookNames();
        const previouslyChecked = new Set(
            list.children.length === 0 ? initialSelection : getSelected(),
        );
        list.replaceChildren();
        if (!names.length) {
            const empty = document.createElement('div');
            empty.className = `${classPrefix}-empty`;
            empty.textContent = 'No lore books available.';
            list.appendChild(empty);
            updateSummary();
            return;
        }
        for (const name of names) {
            const label = document.createElement('label');
            label.className = `${classPrefix}-item checkbox_label`;
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = name;
            if (previouslyChecked.has(name)) cb.checked = true;
            cb.addEventListener('change', () => {
                updateSummary();
                onChange?.(getSelected());
            });
            const span = document.createElement('span');
            span.textContent = name;
            label.appendChild(cb);
            label.appendChild(span);
            list.appendChild(label);
        }
        updateSummary();
    };

    details.addEventListener('toggle', () => {
        if (details.open) render();
    });
    render();

    return { element: details, getSelected };
}

// Tokens reserved on top of `responseLength` for the surrounding prompt
// scaffolding (system prompt, "Existing context to consider…" header, task
// instructions). Conservative — overshooting just leaves a little extra room.
const PREAMBLE_BUDGET_RESERVE = 256;

// Fallback message count when the tokenizer / max-context APIs are
// unavailable. Matches the previous hardcoded behavior.
const PREAMBLE_FALLBACK_MESSAGE_LIMIT = 20;

/**
 * Format a single chat message for inclusion in the preamble.
 */
function formatChatLine(m, ctx) {
    // Hidden / system messages are excluded from ST's own prompt building;
    // keep them out of the preamble too.
    if (m.is_system) return '';
    const who = m.name || (m.is_user ? (ctx.name1 || 'User') : (ctx.name2 || 'Character'));
    const text = (m.mes || '').trim();
    return text ? `${who}: ${text}` : '';
}

/**
 * Pack as many recent chat lines as the token budget allows, newest first,
 * but return them in chronological order. Returns '' if nothing fits.
 */
async function packRecentChatLines(chat, ctx, chatBudget) {
    if (!chat.length || chatBudget <= 0) return '';
    const picked = [];
    let used = 0;
    // The eventual join uses '\n' between lines, so each additional line
    // costs roughly its own tokens plus one separator.
    for (let i = chat.length - 1; i >= 0; i--) {
        const line = formatChatLine(chat[i], ctx);
        if (!line) continue;
        const cost = await __WEBPACK_EXTERNAL_MODULE__tokenizers_js_d5863f55_getTokenCountAsync__(line + '\n');
        if (used + cost > chatBudget) break;
        picked.push(line);
        used += cost;
    }
    picked.reverse();
    return picked.join('\n');
}

/**
 * Build a context preamble string suitable for prepending to a generation
 * prompt. Combines (optionally) the current chat / character / persona and
 * the active entries of any selected lore books.
 *
 * Recent chat is packed to fit the model's remaining context budget
 * (`getMaxPromptTokens() - responseLength - reserve`), after the non-chat
 * sections have been counted. No fixed message cap.
 *
 * @param {object} opts
 * @param {boolean} [opts.includeChat=false] - Include character card, persona, and recent chat messages.
 * @param {string[]} [opts.loreBookNames=[]] - Names of lore books whose enabled entries to include.
 * @param {number}  [opts.responseLength=0] - Tokens reserved for the model's response; subtracted from the budget.
 * @param {number}  [opts.maxContextOverride=0] - If > 0, use this as the max-context size instead of `getMaxPromptTokens()`. Lets callers cap how much chat history they pull in independently of the model's real window.
 * @returns {Promise<string>} The composed preamble, or '' if nothing was included.
 */
async function buildContextPreamble({
    includeChat = false,
    loreBookNames = [],
    responseLength = 0,
    maxContextOverride = 0,
} = {}) {
    const sections = [];
    const ctx = getContext();

    // Non-chat sections first — they're prioritized over chat in the budget.
    if (includeChat) {
        const activeChars = collectActiveCharacters(ctx);
        for (const { displayName, char } of activeChars) {
            const lines = [];
            if (displayName) lines.push(`Name: ${displayName}`);
            if (char.description) lines.push(`Description: ${char.description}`);
            if (char.personality) lines.push(`Personality: ${char.personality}`);
            if (char.scenario) lines.push(`Scenario: ${char.scenario}`);
            if (lines.length) {
                const header = displayName ? `[Character — ${displayName}]` : '[Character]';
                sections.push(`${header}\n${lines.join('\n')}`);
            }
        }

        const persona = ctx.powerUserSettings?.persona_description?.trim();
        if (persona) sections.push(`[User Persona]\n${persona}`);
    }

    if (Array.isArray(loreBookNames) && loreBookNames.length) {
        for (const name of loreBookNames) {
            if (!name) continue;
            try {
                const data = await __WEBPACK_EXTERNAL_MODULE__world_info_js_83198f57_loadWorldInfo__(name);
                if (!data?.entries) continue;
                const entries = Object.values(data.entries)
                    .filter(e => e && !e.disable && (e.content || '').trim())
                    .map(e => {
                        const label = (e.comment && e.comment.trim())
                            || (Array.isArray(e.key) ? e.key.join(', ') : '');
                        const content = e.content.trim();
                        return label ? `- ${label}: ${content}` : `- ${content}`;
                    });
                if (entries.length) {
                    sections.push(`[Lore Book: ${name}]\n${entries.join('\n')}`);
                }
            } catch (err) {
                console.error(`Saints-Silly-Extensions: failed to load lore book "${name}":`, err);
            }
        }
    }

    // Pack recent chat into whatever budget remains.
    if (includeChat) {
        const chat = Array.isArray(ctx.chat) ? ctx.chat : [];
        if (chat.length) {
            let recentBlock = '';
            try {
                const overrideValid = Number.isFinite(maxContextOverride) && maxContextOverride > 0;
                const maxContext = overrideValid ? maxContextOverride : __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_getMaxPromptTokens__();
                if (!Number.isFinite(maxContext) || maxContext <= 0) {
                    throw new Error(`maxContext resolved to ${maxContext}`);
                }
                const nonChatJoined = sections.join('\n\n');
                const nonChatTokens = nonChatJoined
                    ? await __WEBPACK_EXTERNAL_MODULE__tokenizers_js_d5863f55_getTokenCountAsync__(nonChatJoined)
                    : 0;
                const headerTokens = await __WEBPACK_EXTERNAL_MODULE__tokenizers_js_d5863f55_getTokenCountAsync__('[Recent Chat]\n');
                const chatBudget = maxContext - responseLength - PREAMBLE_BUDGET_RESERVE
                    - nonChatTokens - headerTokens;
                const packed = await packRecentChatLines(chat, ctx, chatBudget);
                if (packed) recentBlock = `[Recent Chat]\n${packed}`;
            } catch (err) {
                console.error('Saints-Silly-Extensions: token-budgeted chat packing failed; falling back to fixed limit.', err);
                const recent = chat.slice(-PREAMBLE_FALLBACK_MESSAGE_LIMIT);
                const lines = recent.map(m => formatChatLine(m, ctx)).filter(Boolean);
                if (lines.length) recentBlock = `[Recent Chat]\n${lines.join('\n')}`;
            }
            if (recentBlock) sections.push(recentBlock);
        }
    }

    return sections.join('\n\n');
}

;// external "../../../../slash-commands/SlashCommandParser.js"

;// external "../../../../slash-commands/SlashCommand.js"

;// external "../../../../slash-commands/SlashCommandArgument.js"

;// ./src/possession.js
/**
 * Possession module — lets the user "possess" a character so their messages
 * are posted under that character's name/avatar.
 */






const POSSESSION_METADATA_KEY = 'possession';

// ─── State ───

let possessedCharName = null;
let possessedCharAvatar = null;
// Re-entry guard: executePossessedContinue triggers an inner /continue
// (or clicks #option_continue) that would fire our Continue interceptor
// again. This flag short-circuits the nested intercept.
let inPossessedContinue = false;

/** @type {{ settings: object, saveSettings: function }} */
let ctx = null;

/** @type {{ handlePhrasingSeedReinjection: function, isPhrasing: function }} */
let phrasingApi = null;

let possession_debug = () => {};

function possession_toast(message, type = 'info') {
    if (!ctx.settings.possessionShowToast) return;
    toast(message, type, 'Saint\'s Silly Extensions');
}

// ─── Public Getters ───

function isPossessing() {
    return ctx.settings.possessionEnabled && possessedCharName !== null;
}

function getPossessedCharName() {
    return possessedCharName;
}

// ─── Persistence ───

function savePossessionState() {
    const context = getContext();
    context.chatMetadata[POSSESSION_METADATA_KEY] = {
        name: possessedCharName,
        avatar: possessedCharAvatar,
    };
    context.saveMetadata();
    possession_debug('Saved possession state:', possessedCharName, '| avatar:', possessedCharAvatar);
}

function loadPossessionState() {
    const context = getContext();
    const saved = context.chatMetadata?.[POSSESSION_METADATA_KEY] ?? null;
    if (saved && typeof saved === 'object') {
        possessedCharName = saved.name ?? null;
        possessedCharAvatar = saved.avatar ?? null;
    } else {
        possessedCharName = saved;
        possessedCharAvatar = null;
    }
    possession_debug('Loaded possession state:', possessedCharName, '| avatar:', possessedCharAvatar);
}

// ─── Character Utilities ───

function getPossessedCharacter() {
    if (!possessedCharName) return null;
    const context = getContext();
    if (possessedCharAvatar) {
        const byAvatar = context.characters.find(c => c.avatar === possessedCharAvatar);
        if (byAvatar) return byAvatar;
    }
    // In group chats, prefer the character whose avatar is in the group members list
    if (context.groupId) {
        const group = context.groups.find(g => g.id === context.groupId);
        if (group) {
            const groupChar = group.members
                .map(avatar => context.characters.find(c => c.avatar === avatar))
                .find(c => c && c.name === possessedCharName);
            if (groupChar) return groupChar;
        }
    }
    return context.characters.find(c => c.name === possessedCharName) ?? null;
}

function validatePossessedCharInGroup() {
    if (!possessedCharName) return;
    const context = getContext();
    if (!context.groupId) return;
    const group = context.groups.find(g => g.id === context.groupId);
    if (!group) return;
    const isMember = group.members.some(avatar => {
        if (possessedCharAvatar) return avatar === possessedCharAvatar;
        const char = context.characters.find(c => c.avatar === avatar);
        return char && char.name === possessedCharName;
    });
    if (!isMember) {
        possession_debug('Possessed character removed from group, clearing');
        possession_toast(`${possessedCharName} was removed from the group. Possession cleared.`, 'warning');
        setPossession(null);
    }
}

// ─── Core Logic ───

function setPossession(charName, charAvatar) {
    const previous = possessedCharName;
    possessedCharName = charName;
    if (charName) {
        if (charAvatar) {
            possessedCharAvatar = charAvatar;
        } else {
            const context = getContext();
            // In group chats, prefer the character whose avatar is in the group members list
            let char = null;
            if (context.groupId) {
                const group = context.groups.find(g => g.id === context.groupId);
                if (group) {
                    char = group.members
                        .map(avatar => context.characters.find(c => c.avatar === avatar))
                        .find(c => c && c.name === charName) ?? null;
                }
            }
            if (!char) {
                char = context.characters.find(c => c.name === charName) ?? null;
            }
            possessedCharAvatar = char?.avatar ?? null;
        }
    } else {
        possessedCharAvatar = null;
    }
    savePossessionState();
    syncAllPossessionUI();
    if (previous !== charName) {
        if (charName) {
            possession_toast(`Possessing ${charName}`, 'success');
            possession_debug('Now possessing:', charName);
        } else if (previous) {
            possession_toast('Possession cleared', 'info');
            possession_debug('Possession cleared');
        }
    }
}

// ─── Message Posting ───

async function postPossessedMessage(text) {
    const context = getContext();
    const char = getPossessedCharacter();
    if (!char || !text) return -1;

    const message = {
        name: char.name,
        is_user: false,
        is_system: false,
        send_date: Date.now(),
        mes: text,
        force_avatar: char.avatar ? `/characters/${char.avatar}` : undefined,
        extra: { possession: true },
    };

    if (context.groupId) {
        message.original_avatar = char.avatar;
        message.is_name = true;
    }

    context.chat.push(message);
    const messageIndex = context.chat.length - 1;

    if (typeof context.addOneMessage === 'function') {
        context.addOneMessage(message);
    }

    await context.saveChat();
    possession_debug('Posted possessed message at index', messageIndex);
    return messageIndex;
}

// ─── Send Handling (MESSAGE_SENT) ───

function onMessageSent(messageIndex) {
    if (!ctx.settings.possessionEnabled || !isPossessing()) return;
    if (phrasingApi?.isPhrasing()) return;

    const context = getContext();
    const message = context.chat[messageIndex];
    if (!message || !message.is_user) return;

    const char = getPossessedCharacter();
    if (!char) return;

    possession_debug('Converting user message to possessed character message at index', messageIndex);

    message.is_user = false;
    message.name = char.name;
    message.force_avatar = char.avatar ? `/characters/${char.avatar}` : undefined;
    message.extra = { ...(message.extra || {}), possession: true };

    if (context.groupId) {
        message.original_avatar = char.avatar;
        message.is_name = true;
    }

    possession_debug('Converted message — name:', char.name);
}

// ─── Continue Interception ───

function handleContinueIntercept(event) {
    if (!ctx.settings.possessionEnabled || !isPossessing()) return;
    if (inPossessedContinue) return;
    const context = getContext();
    if (context.isGenerating) return;

    const textarea = document.getElementById('send_textarea');
    const text = textarea?.value?.trim();
    if (!text) return;

    event.stopImmediatePropagation();
    event.preventDefault();

    possession_debug('Intercepted Continue with text:', text.substring(0, 50) + '...');
    executePossessedContinue(text);
}

async function executePossessedContinue(text) {
    const context = getContext();

    const textarea = document.getElementById('send_textarea');
    if (textarea) {
        textarea.value = '';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    inPossessedContinue = true;
    try {
        await postPossessedMessage(text);
        await new Promise(resolve => requestAnimationFrame(resolve));

        if (context.executeSlashCommandsWithOptions) {
            await context.executeSlashCommandsWithOptions('/continue');
        } else {
            const continueBtn = document.getElementById('option_continue');
            if (continueBtn) continueBtn.click();
        }
    } finally {
        inPossessedContinue = false;
    }
}

function attachContinueInterceptor() {
    document.addEventListener('click', (event) => {
        if (!event.target.closest('#option_continue') && !event.target.closest('#mes_continue')) return;

        // Reinject phrasing seed if the last message was rephrased
        phrasingApi?.handlePhrasingSeedReinjection();

        handleContinueIntercept(event);
    }, { capture: true });
    possession_debug('Attached continue interceptor');
}

// ─── UI: Group Radio Buttons ───

function injectGroupRadioButtons() {
    if (!ctx.settings.possessionEnabled) return;

    const context = getContext();
    if (!context.groupId) return;

    const group = context.groups.find(g => g.id === context.groupId);
    if (!group) return;

    const memberEntries = document.querySelectorAll('#rm_group_members .group_member');

    memberEntries.forEach(entry => {
        if (entry.querySelector('.possession_radio_wrapper')) return;

        const charId = entry.getAttribute('chid');
        const gridAvatar = entry.getAttribute('grid');
        let charName = null;
        let charAvatar = null;

        // Try chid first (character index)
        if (charId !== null) {
            const char = context.characters[parseInt(charId)];
            if (char) {
                charName = char.name;
                charAvatar = char.avatar;
            }
        }

        // Fallback to grid attribute (avatar filename)
        if (!charAvatar && gridAvatar) {
            const char = context.characters.find(c => c.avatar === gridAvatar);
            if (char) {
                charName = charName || char.name;
                charAvatar = char.avatar;
            } else {
                // grid is the avatar filename even if character lookup fails
                charAvatar = gridAvatar;
            }
        }

        // Fallback: extract avatar from the member's displayed image
        if (!charAvatar) {
            const img = entry.querySelector('img');
            if (img?.src) {
                const match = img.src.match(/[?&]file=([^&]+)|\/characters\/([^/?]+)/);
                const filename = match?.[1] || match?.[2];
                if (filename) {
                    const decoded = decodeURIComponent(filename);
                    charAvatar = decoded;
                    if (!charName) {
                        const char = context.characters.find(c => c.avatar === decoded);
                        if (char) charName = char.name;
                    }
                }
            }
        }

        if (!charName) {
            const nameEl = entry.querySelector('.ch_name');
            if (nameEl) charName = nameEl.textContent?.trim() || nameEl.getAttribute('title');
        }

        if (!charName) return;

        const wrapper = document.createElement('div');
        wrapper.classList.add('possession_radio_wrapper');
        wrapper.title = `Possess ${charName}`;

        const radio = document.createElement('div');
        radio.classList.add('possession_radio');
        radio.dataset.charName = charName;
        if (charAvatar) radio.dataset.charAvatar = charAvatar;

        const isActive = (possessedCharAvatar && charAvatar)
            ? possessedCharAvatar === charAvatar
            : possessedCharName === charName;
        if (isActive) {
            radio.classList.add('possession_active');
            entry.classList.add('possession_possessed');
        }

        radio.addEventListener('click', (event) => {
            event.stopPropagation();
            const isCurrentlyPossessed = (possessedCharAvatar && charAvatar)
                ? possessedCharAvatar === charAvatar
                : possessedCharName === charName;
            if (isCurrentlyPossessed) {
                setPossession(null);
            } else {
                setPossession(charName, charAvatar);
            }
        });

        wrapper.appendChild(radio);

        const iconContainer = entry.querySelector('.group_member_icon');
        if (iconContainer) {
            iconContainer.insertBefore(wrapper, iconContainer.firstChild);
        } else {
            entry.appendChild(wrapper);
        }
    });
}

function syncGroupRadioButtons() {
    document.querySelectorAll('.possession_radio').forEach(radio => {
        const charName = radio.dataset.charName;
        const charAvatar = radio.dataset.charAvatar;
        const isActive = (possessedCharAvatar && charAvatar)
            ? possessedCharAvatar === charAvatar
            : charName === possessedCharName;
        radio.classList.toggle('possession_active', isActive);
    });

    document.querySelectorAll('.group_member').forEach(entry => {
        entry.classList.remove('possession_possessed');
    });

    if (possessedCharName) {
        document.querySelectorAll('.possession_radio.possession_active').forEach(radio => {
            const member = radio.closest('.group_member');
            if (member) member.classList.add('possession_possessed');
        });
    }
}

function removeGroupRadioButtons() {
    document.querySelectorAll('.possession_radio_wrapper').forEach(el => el.remove());
    document.querySelectorAll('.group_member.possession_possessed').forEach(el => {
        el.classList.remove('possession_possessed');
    });
}

// ─── UI: Solo Chat Button ───

function injectSoloButton() {
    if (getContext().groupId) return;
    if (!ctx.settings.possessionEnabled) return;
    if (document.getElementById('possession_solo_btn')) return;

    const panelButtonRow = document.querySelector('#form_create .ch_creation_btn_row, #form_create .form_create_bottom_buttons_block');
    const target = panelButtonRow || document.getElementById('rightSendForm');
    if (!target) return;

    const btn = document.createElement('div');
    btn.id = 'possession_solo_btn';
    btn.classList.add('menu_button', 'interactable');
    btn.title = 'Possess this character';
    btn.innerHTML = '<span class="fa-solid fa-ghost"></span>';

    if (isPossessing()) {
        btn.classList.add('possession_active');
    }

    btn.addEventListener('click', () => {
        const context = getContext();
        const char = context.characters?.[context.characterId];
        if (!char) return;

        if (possessedCharName === char.name && (!possessedCharAvatar || possessedCharAvatar === char.avatar)) {
            setPossession(null);
        } else {
            setPossession(char.name, char.avatar);
        }
    });

    target.appendChild(btn);
    possession_debug('Injected solo possess button');
}

function syncSoloButton() {
    const btn = document.getElementById('possession_solo_btn');
    if (!btn) return;
    btn.classList.toggle('possession_active', isPossessing());
}

function removeSoloButton() {
    const btn = document.getElementById('possession_solo_btn');
    if (btn) btn.remove();
}

// ─── UI: Impersonate Button Visibility ───

function hideImpersonateButtons() {
    const menuBtn = document.getElementById('option_impersonate');
    const quickBtn = document.getElementById('mes_impersonate');
    if (menuBtn) menuBtn.classList.add('possession_hidden');
    if (quickBtn) quickBtn.classList.add('possession_hidden');
    possession_debug('Impersonate buttons hidden');
}

function showImpersonateButtons() {
    const menuBtn = document.getElementById('option_impersonate');
    const quickBtn = document.getElementById('mes_impersonate');
    if (menuBtn) menuBtn.classList.remove('possession_hidden');
    if (quickBtn) quickBtn.classList.remove('possession_hidden');
    possession_debug('Impersonate buttons shown');
}

// ─── UI: Possession Impersonate Button (Character Avatar) ───

function injectPossessionImpersonateButton() {
    removePossessionImpersonateButton();

    const char = getPossessedCharacter();
    if (!char) return;

    const sendForm = document.getElementById('rightSendForm');
    if (!sendForm) return;

    const btn = document.createElement('div');
    btn.id = 'possession_impersonate_btn';
    btn.classList.add('interactable');
    btn.title = `Generate as ${char.name}`;

    const img = document.createElement('img');
    img.src = char.avatar ? `/characters/${char.avatar}` : '/img/ai4.png';
    img.alt = char.name;
    img.classList.add('possession_impersonate_avatar');
    btn.appendChild(img);

    btn.addEventListener('click', async () => {
        const context = getContext();
        if (context.isGenerating) return;

        possession_debug('Possession impersonate clicked — triggering generation for', char.name);

        const cmd = context.groupId ? `/trigger ${char.name}` : '/trigger';
        await context.executeSlashCommandsWithOptions(cmd);
    });

    const phrasingBtn = document.getElementById('phrasing_send_button');
    if (phrasingBtn) {
        sendForm.insertBefore(btn, phrasingBtn);
    } else {
        sendForm.appendChild(btn);
    }

    possession_debug('Injected possession impersonate button for', char.name);
}

function removePossessionImpersonateButton() {
    const btn = document.getElementById('possession_impersonate_btn');
    if (btn) btn.remove();
}

function hidePossessionImpersonateButton() {
    const btn = document.getElementById('possession_impersonate_btn');
    if (btn) btn.classList.add('possession_hidden');
}

function showPossessionImpersonateButton() {
    const btn = document.getElementById('possession_impersonate_btn');
    if (btn) btn.classList.remove('possession_hidden');
}

// ─── UI Sync ───

function syncAllPossessionUI() {
    if (!ctx.settings.possessionEnabled) {
        removeGroupRadioButtons();
        removeSoloButton();
        showImpersonateButtons();
        removePossessionImpersonateButton();
        return;
    }

    if (getContext().groupId) {
        removeSoloButton();
        injectGroupRadioButtons();
        syncGroupRadioButtons();
    } else {
        removeGroupRadioButtons();
        injectSoloButton();
        syncSoloButton();
    }

    if (isPossessing()) {
        hideImpersonateButtons();
        injectPossessionImpersonateButton();
    } else {
        showImpersonateButtons();
        removePossessionImpersonateButton();
    }
}

// ─── Generation Lifecycle ───

function onGenerationStarted() {
    hidePossessionImpersonateButton();
}

function onGenerationEnded() {
    syncAllPossessionUI();
}

// ─── Event Handlers ───

function onGroupUpdated() {
    validatePossessedCharInGroup();
    removeGroupRadioButtons();
    injectGroupRadioButtons();
    syncGroupRadioButtons();
}

function onCharacterPageLoaded() {
    if (!getContext().groupId) {
        injectSoloButton();
        syncSoloButton();
    }
}

function onGroupWrapperFinished() {
    syncAllPossessionUI();
}

// ─── Settings Panel ───

function bindPossessionSettings(saveSettings) {
    const possessionEnabled = document.getElementById('possession_enabled');
    if (possessionEnabled) {
        possessionEnabled.checked = ctx.settings.possessionEnabled;
        possessionEnabled.addEventListener('change', (e) => {
            ctx.settings.possessionEnabled = e.target.checked;
            saveSettings();
            syncAllPossessionUI();
        });
    }

    const possessionShowToast = document.getElementById('possession_show_toast');
    if (possessionShowToast) {
        possessionShowToast.checked = ctx.settings.possessionShowToast;
        possessionShowToast.addEventListener('change', (e) => {
            ctx.settings.possessionShowToast = e.target.checked;
            saveSettings();
        });
    }

    const possessionDebugMode = document.getElementById('possession_debug_mode');
    if (possessionDebugMode) {
        possessionDebugMode.checked = ctx.settings.possessionDebugMode;
        possessionDebugMode.addEventListener('change', (e) => {
            ctx.settings.possessionDebugMode = e.target.checked;
            saveSettings();
            possession_debug('debugMode toggled to', ctx.settings.possessionDebugMode);
        });
    }
}

// ─── Slash Commands ───

function registerPossessionSlashCommands() {
    __WEBPACK_EXTERNAL_MODULE__slash_commands_SlashCommandParser_js_42c8b851_SlashCommandParser__.addCommandObject(__WEBPACK_EXTERNAL_MODULE__slash_commands_SlashCommand_js_1b0d5616_SlashCommand__.fromProps({
        name: 'possess',
        callback: async (namedArgs, unnamedArgs) => {
            const name = unnamedArgs?.trim();

            if (!name) {
                if (isPossessing()) {
                    toastr.info(`Currently possessing: ${possessedCharName}`, 'Possession');
                    return possessedCharName;
                }
                const context = getContext();
                if (!context.groupId) {
                    const char = context.characters?.[context.characterId];
                    if (char) {
                        setPossession(char.name, char.avatar);
                        return char.name;
                    }
                }
                toastr.info('No character is currently possessed.', 'Possession');
                return 'None';
            }

            const context = getContext();
            const nameLower = name.toLowerCase();

            if (context.groupId) {
                const group = context.groups.find(g => g.id === context.groupId);
                if (!group) {
                    toastr.error('No active group found.', 'Possession');
                    return '';
                }
                const match = group.members
                    .map(avatar => context.characters.find(c => c.avatar === avatar))
                    .filter(Boolean)
                    .find(c => c.name.toLowerCase().includes(nameLower));

                if (!match) {
                    toastr.error(`No group member matching "${name}" found.`, 'Possession');
                    return '';
                }
                setPossession(match.name, match.avatar);
                return match.name;
            } else {
                const char = context.characters?.[context.characterId];
                if (char && char.name.toLowerCase().includes(nameLower)) {
                    setPossession(char.name, char.avatar);
                    return char.name;
                }
                toastr.error(`Character "${name}" does not match the active character.`, 'Possession');
                return '';
            }
        },
        unnamedArgumentList: [
            __WEBPACK_EXTERNAL_MODULE__slash_commands_SlashCommandArgument_js_a42b9371_SlashCommandArgument__.fromProps({
                description: 'Character name (partial match). Omit to show current or toggle in solo chat.',
                typeList: [__WEBPACK_EXTERNAL_MODULE__slash_commands_SlashCommandArgument_js_a42b9371_ARGUMENT_TYPE__.STRING],
                isRequired: false,
            }),
        ],
        aliases: [],
        helpString: 'Possess a character so your messages are posted under their name. Usage: /possess [name]',
    }));

    __WEBPACK_EXTERNAL_MODULE__slash_commands_SlashCommandParser_js_42c8b851_SlashCommandParser__.addCommandObject(__WEBPACK_EXTERNAL_MODULE__slash_commands_SlashCommand_js_1b0d5616_SlashCommand__.fromProps({
        name: 'unpossess',
        callback: async () => {
            if (isPossessing()) {
                setPossession(null);
            }
            return '';
        },
        unnamedArgumentList: [],
        aliases: [],
        helpString: 'Clear the currently possessed character, returning to normal mode.',
    }));

    possession_debug('Registered possession slash commands');
}

// ─── Init ───

/**
 * @param {object} options
 * @param {object} options.settings  - Shared mutable settings reference.
 * @param {object} options.phrasingApi - { isPhrasing(), handlePhrasingSeedReinjection() }
 */
function initPossession({ settings, phrasingApi: pApi }) {
    ctx = { settings };
    phrasingApi = pApi;
    possession_debug = createDebugLogger('POSSESSION', () => settings.possessionDebugMode);
}

;// ./src/phrasing.js
/**
 * Phrasing module — enriches messages with AI-generated narration via
 * prompt injection + impersonate/swipe flows.
 */







// ─── Constants ───

const PHRASING_INJECTION_KEY = 'phrasing_instruction';
const PHRASING_SEED_EXTRA_KEY = 'phrasing_seed';

const DEFAULT_PHRASING_PROMPT = `[Rewrite the following message. Preserve its meaning, intent, and any dialogue, but enrich it with narration, action, and detail consistent with the character and the current scene. Do not continue the scene beyond what the original message describes.

{{phrasingSeed}}]`;

const DEFAULT_PHRASING_INVERSE_PROMPT = `[Rewrite the following message in a way that is WILDLY DIFFERENT from every previous variation listed below. Vary the tone, pacing, structure, imagery, sentence length, and word choice — take a fundamentally different angle. Preserve the underlying meaning, intent, and any dialogue. Do not continue the scene beyond what the original message describes.

Previous variations to avoid resembling:
{{phrasingSwipes}}

Now produce a wildly different rewrite of:
{{phrasingSeed}}]`;

// ─── State ───

let phrasingActive = false;

/** @type {{ settings: object }} */
let phrasing_ctx = null;

/** @type {{ isPossessing: function, getPossessedCharName: function, postPossessedMessage: function }} */
let possessionApi = null;

let phrasing_debug = () => {};

// ─── Public Getters ───

function isPhrasing() {
    return phrasingActive;
}

// ─── Prompt Management ───

function getActivePrompt() {
    return phrasing_ctx.settings.phrasingPrompt || DEFAULT_PHRASING_PROMPT;
}

function getActiveInversePrompt() {
    return phrasing_ctx.settings.phrasingInversePrompt || DEFAULT_PHRASING_INVERSE_PROMPT;
}

function formatSwipesContext(swipes, speakerName) {
    return swipes
        .map((swipe, i) => `Variation ${i + 1}:\n${speakerName}: ${swipe}`)
        .join('\n\n');
}

function formatSeedWithSpeaker(seedText, isUser, speakerName) {
    const context = getContext();
    let name;
    if (speakerName) {
        name = speakerName;
    } else if (isUser) {
        name = context.name1;
    } else {
        name = context.name2;
    }
    phrasing_debug('formatSeedWithSpeaker — speaker:', name, '| isUser:', isUser);
    return `${name}: ${seedText}`;
}

function assemblePrompt(seedText, swipesContext = null) {
    const useInverse = !!swipesContext;
    phrasing_debug('assemblePrompt — seed length:', seedText.length, '| mode:', useInverse ? 'inverse' : 'standard');
    const tpl = useInverse ? getActiveInversePrompt() : getActivePrompt();
    const macros = useInverse
        ? { phrasingSeed: seedText, phrasingSwipes: swipesContext }
        : { phrasingSeed: seedText };
    const prompt = __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_substituteParamsExtended__(tpl, macros);
    phrasing_debug('assemblePrompt — final length:', prompt.length);
    return prompt;
}

// ─── Injection ───

function injectPhrasingPrompt(assembledPrompt) {
    phrasing_debug('injectPhrasingPrompt — injecting at depth 0, SYSTEM role');
    __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_setExtensionPrompt__(
        PHRASING_INJECTION_KEY,
        assembledPrompt,
        __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_extension_prompt_types__.IN_CHAT,
        0,
        false,
        __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_extension_prompt_roles__.SYSTEM,
    );
}

function clearPhrasingInjection() {
    phrasing_debug('clearPhrasingInjection — removing injection');
    __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_setExtensionPrompt__(PHRASING_INJECTION_KEY, '', __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_extension_prompt_types__.NONE, 0);
}

/**
 * Called from the continue interceptor — reinjects the phrasing seed prompt
 * if the last message was rephrased.
 */
function handlePhrasingSeedReinjection() {
    if (!phrasing_ctx.settings.phrasingEnabled) return;

    const context = getContext();
    const lastIndex = context.chat.length - 1;
    if (lastIndex < 0) return;

    const message = context.chat[lastIndex];
    const storedPrompt = message?.extra?.[PHRASING_SEED_EXTRA_KEY];
    if (!storedPrompt) return;

    phrasing_debug('Reinjecting phrasing seed for continue on message', lastIndex);
    injectPhrasingPrompt(storedPrompt);
}

// ─── Button Visibility ───

function hideAllPhrasingButtons() {
    document.querySelectorAll('.phrasing-trigger').forEach(el => {
        el.classList.add('phrasing-hidden');
    });
}

function showAllPhrasingButtons() {
    if (!phrasing_ctx.settings.phrasingEnabled) return;
    document.querySelectorAll('.phrasing-trigger').forEach(el => {
        el.classList.remove('phrasing-hidden');
    });
}

function applyPhrasingEnabledState() {
    if (phrasing_ctx.settings.phrasingEnabled) {
        showAllPhrasingButtons();
    } else {
        hideAllPhrasingButtons();
    }
}

// ─── Primary Flow (Input Enrichment) ───

async function doPrimaryFlow(seedText) {
    phrasing_debug('doPrimaryFlow — starting, seed length:', seedText.length);
    const context = getContext();

    if (context.isGenerating) {
        phrasing_debug('doPrimaryFlow — ABORTED: generation in progress');
        return '';
    }

    phrasingActive = true;

    try {
        if (possessionApi?.isPossessing()) {
            phrasing_debug('doPrimaryFlow — possessed path: posting message then swiping');

            const colonIndex = seedText.indexOf(': ');
            const rawText = colonIndex !== -1 ? seedText.substring(colonIndex + 2) : seedText;

            const messageIndex = await possessionApi.postPossessedMessage(rawText);
            if (messageIndex < 0) {
                phrasing_debug('doPrimaryFlow — FAILED: could not post possessed message');
                return '';
            }

            await new Promise(resolve => setTimeout(resolve, 100));

            const result = await doSwipeMode(messageIndex);
            phrasing_debug('doPrimaryFlow — possessed path complete, result length:', result.length);
            return result;
        } else {
            const assembled = assemblePrompt(seedText);
            injectPhrasingPrompt(assembled);

            phrasing_debug('doPrimaryFlow — normal path: triggering /impersonate');
            const ended = waitForGenerationEnd();
            await context.executeSlashCommandsWithOptions('/impersonate');
            await ended;

            const textarea = document.getElementById('send_textarea');
            const result = textarea?.value?.trim() || '';
            phrasing_debug('doPrimaryFlow — normal path complete, result length:', result.length);
            return result;
        }
    } finally {
        clearPhrasingInjection();
        phrasingActive = false;
        showAllPhrasingButtons();
        phrasing_debug('doPrimaryFlow — cleanup complete');
    }
}

// ─── Swipe Mode ───

async function doSwipeMode(messageIndex) {
    phrasing_debug('doSwipeMode — starting for message index:', messageIndex);
    const context = getContext();

    if (context.isGenerating) {
        phrasing_debug('doSwipeMode — ABORTED: generation in progress');
        return '';
    }

    const message = context.chat[messageIndex];
    if (!message) {
        phrasing_debug('doSwipeMode — ABORTED: no message at index', messageIndex);
        return '';
    }

    const rawSeedText = message.mes;
    if (!rawSeedText || !rawSeedText.trim()) {
        phrasing_debug('doSwipeMode — ABORTED: message is empty');
        toastr.warning('Cannot rephrase an empty message.', 'Phrasing!');
        return '';
    }

    const seedText = formatSeedWithSpeaker(rawSeedText, message.is_user, message.name);
    phrasing_debug('doSwipeMode — seed length:', seedText.length, '| speaker:', message.name);

    const wasAlreadyActive = phrasingActive;
    phrasingActive = true;

    try {
        if (!message.swipes || message.swipes.length === 0) {
            phrasing_debug('doSwipeMode — initializing swipes array');
            message.swipes = [message.mes];
            message.swipe_id = 0;
            message.swipe_info = [{}];
        }

        let swipesContext = null;
        if (phrasing_ctx.settings.phrasingInverseGuidance) {
            const speakerName = message.name || (message.is_user ? context.name1 : context.name2);
            swipesContext = formatSwipesContext(message.swipes, speakerName);
            phrasing_debug('doSwipeMode — inverse guidance ON, swipes included:', message.swipes.length);
        }

        const assembled = assemblePrompt(seedText, swipesContext);
        injectPhrasingPrompt(assembled);

        if (!message.extra) message.extra = {};
        message.extra[PHRASING_SEED_EXTRA_KEY] = assembled;
        message.extra.overswipe_behavior = 'regenerate';

        const lastSwipeIndex = message.swipes.length - 1;
        if (message.swipe_id !== lastSwipeIndex) {
            phrasing_debug('doSwipeMode — jumping to last swipe', lastSwipeIndex);
            message.swipe_id = lastSwipeIndex;
            message.mes = message.swipes[lastSwipeIndex];

            // Re-render the visible message text (no public helper for this).
            const messageEl = document.querySelector(`#chat .mes[mesid="${messageIndex}"]`);
            const textEl = messageEl?.querySelector('.mes_text');
            if (textEl && typeof context.messageFormatting === 'function') {
                textEl.innerHTML = context.messageFormatting(
                    message.mes, message.name, message.is_system, message.is_user, messageIndex,
                );
            } else if (textEl) {
                textEl.textContent = message.mes;
            }
            // refresh(true) re-renders chevrons AND swipe counters.
            context.swipe.refresh(true);
        }

        phrasing_debug('doSwipeMode — triggering swipe right');
        // Install the GENERATION_ENDED listener before calling swipe.right
        // so we never miss the event if generation completes before the
        // swipe animation does.
        const ended = waitForGenerationEnd();
        await context.swipe.right(null, { message });
        const result = await ended;
        phrasing_debug('doSwipeMode — complete, result length:', result.length);
        return result;
    } finally {
        clearPhrasingInjection();
        if (!wasAlreadyActive) {
            phrasingActive = false;
            showAllPhrasingButtons();
        }
        phrasing_debug('doSwipeMode — cleanup complete');
    }
}

// ─── Button Handlers ───

async function onInputPhrasingClick() {
    phrasing_debug('onInputPhrasingClick — triggered');
    if (!phrasing_ctx.settings.phrasingEnabled) return;

    const context = getContext();
    if (context.isGenerating) return;

    hideAllPhrasingButtons();

    const textarea = document.getElementById('send_textarea');
    const inputText = textarea?.value?.trim();
    const editingIndex = getEditingMessageIndex();

    try {
        if (!inputText && editingIndex < 0) {
            phrasing_debug('onInputPhrasingClick — empty input, no edit → rephrase last message');
            const lastIndex = context.chat.length - 1;
            if (lastIndex < 0) {
                toastr.warning('No messages to rephrase.', 'Phrasing!');
                return;
            }
            await doSwipeMode(lastIndex);
        } else if (editingIndex >= 0 && !inputText) {
            phrasing_debug('onInputPhrasingClick — editing message at index', editingIndex, '→ confirm and rephrase');
            confirmActiveMessageEdit();
            await new Promise(resolve => setTimeout(resolve, 100));
            await doSwipeMode(editingIndex);
        } else {
            if (editingIndex >= 0) {
                phrasing_debug('onInputPhrasingClick — confirming active edit before processing input');
                confirmActiveMessageEdit();
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            phrasing_debug('onInputPhrasingClick — input text present, seed length:', inputText.length);
            textarea.value = '';
            textarea.dispatchEvent(new Event('input', { bubbles: true }));

            const formattedSeed = possessionApi?.isPossessing()
                ? formatSeedWithSpeaker(inputText, false, possessionApi.getPossessedCharName())
                : formatSeedWithSpeaker(inputText, true);

            await doPrimaryFlow(formattedSeed);
        }
    } finally {
        showAllPhrasingButtons();
    }
}

// ─── Generation Lifecycle ───

function phrasing_onGenerationStarted() {
    hideAllPhrasingButtons();
}

function phrasing_onGenerationEnded() {
    // Always drop the injection — the generation that just ended has already
    // consumed it. The Continue seed-reinjection path injects while
    // phrasingActive is false, so a conditional clear would leave the rewrite
    // instruction stuck in the prompt for every subsequent generation.
    clearPhrasingInjection();
    phrasingActive = false;
    showAllPhrasingButtons();
}

// ─── UI Creation ───

function createInputAreaButton() {
    if (document.getElementById('phrasing_send_button')) return;

    const sendForm = document.getElementById('rightSendForm');
    if (!sendForm) return;

    const btn = document.createElement('div');
    btn.id = 'phrasing_send_button';
    btn.classList.add('phrasing-trigger', 'fa-solid', 'fa-pen-fancy', 'interactable');
    btn.title = 'Phrasing! — Enrich your message with AI narration';
    btn.addEventListener('click', onInputPhrasingClick);

    sendForm.appendChild(btn);
    phrasing_debug('Created input area button');
}

function createHamburgerMenuItem() {
    if (document.getElementById('phrasing_menu_button')) return;

    const impersonateBtn = document.getElementById('option_impersonate');
    if (!impersonateBtn) return;

    const btn = document.createElement('div');
    btn.id = 'phrasing_menu_button';
    btn.classList.add('phrasing-trigger', 'list-group-item', 'interactable');
    btn.innerHTML = '<span class="fa-solid fa-pen-fancy"></span> Phrasing!';
    btn.addEventListener('click', onInputPhrasingClick);

    impersonateBtn.parentNode.insertBefore(btn, impersonateBtn.nextSibling);
    phrasing_debug('Created hamburger menu item');
}

// ─── Settings Panel ───

function bindPhrasingSettings(saveSettings) {
    const phrasingEnabled = document.getElementById('phrasing_enabled');
    if (phrasingEnabled) {
        phrasingEnabled.checked = phrasing_ctx.settings.phrasingEnabled;
        phrasingEnabled.addEventListener('change', (e) => {
            phrasing_ctx.settings.phrasingEnabled = e.target.checked;
            saveSettings();
            applyPhrasingEnabledState();
        });
    }

    const phrasingDebugMode = document.getElementById('phrasing_debug_mode');
    if (phrasingDebugMode) {
        phrasingDebugMode.checked = phrasing_ctx.settings.phrasingDebugMode;
        phrasingDebugMode.addEventListener('change', (e) => {
            phrasing_ctx.settings.phrasingDebugMode = e.target.checked;
            saveSettings();
            phrasing_debug('debugMode toggled to', phrasing_ctx.settings.phrasingDebugMode);
        });
    }

    const phrasingInverseGuidance = document.getElementById('phrasing_inverse_guidance');
    if (phrasingInverseGuidance) {
        phrasingInverseGuidance.checked = phrasing_ctx.settings.phrasingInverseGuidance;
        phrasingInverseGuidance.addEventListener('change', (e) => {
            phrasing_ctx.settings.phrasingInverseGuidance = e.target.checked;
            saveSettings();
            phrasing_debug('inverseGuidance toggled to', phrasing_ctx.settings.phrasingInverseGuidance);
        });
    }

    const phrasingPromptArea = document.getElementById('phrasing_prompt_textarea');
    if (phrasingPromptArea) {
        phrasingPromptArea.value = phrasing_ctx.settings.phrasingPrompt || DEFAULT_PHRASING_PROMPT;
        phrasingPromptArea.addEventListener('input', () => {
            phrasing_ctx.settings.phrasingPrompt = phrasingPromptArea.value;
            saveSettings();
        });
    }

    const phrasingInverseArea = document.getElementById('phrasing_inverse_prompt_textarea');
    if (phrasingInverseArea) {
        phrasingInverseArea.value = phrasing_ctx.settings.phrasingInversePrompt || DEFAULT_PHRASING_INVERSE_PROMPT;
        phrasingInverseArea.addEventListener('input', () => {
            phrasing_ctx.settings.phrasingInversePrompt = phrasingInverseArea.value;
            saveSettings();
        });
    }

    document.getElementById('phrasing_preview_btn')
        ?.addEventListener('click', showPhrasingPromptPreview);
}

function showPhrasingPromptPreview() {
    const sampleSeed = 'User: (the message text being rephrased)';
    const sampleSwipes = formatSwipesContext(
        ['(first existing variation)', '(second existing variation)'],
        'User',
    );
    showPromptPreview('Phrasing! — Injection Preview', [
        {
            label: 'Standard injection (added to the chat prompt as a system message at depth 0 for the rephrase generation)',
            text: assemblePrompt(sampleSeed),
        },
        {
            label: 'Inverse Guidance injection (used instead when Inverse Guidance is on)',
            text: assemblePrompt(sampleSeed, sampleSwipes),
        },
    ]);
}

// ─── Slash Command ───

function registerPhrasingSlashCommand() {
    __WEBPACK_EXTERNAL_MODULE__slash_commands_SlashCommandParser_js_42c8b851_SlashCommandParser__.addCommandObject(__WEBPACK_EXTERNAL_MODULE__slash_commands_SlashCommand_js_1b0d5616_SlashCommand__.fromProps({
        name: 'phrasing',
        callback: async (_namedArgs, unnamedArgs) => {
            phrasing_debug('slashCommand /phrasing — invoked');
            if (!phrasing_ctx.settings.phrasingEnabled) return '';

            const rawSeedText = unnamedArgs?.trim();

            if (rawSeedText) {
                const seedText = possessionApi?.isPossessing()
                    ? formatSeedWithSpeaker(rawSeedText, false, possessionApi.getPossessedCharName())
                    : formatSeedWithSpeaker(rawSeedText, true);
                return await doPrimaryFlow(seedText);
            } else {
                const context = getContext();
                const lastIndex = context.chat.length - 1;
                if (lastIndex < 0) {
                    toastr.warning('No messages to rephrase.', 'Phrasing!');
                    return '';
                }
                return await doSwipeMode(lastIndex);
            }
        },
        unnamedArgumentList: [
            __WEBPACK_EXTERNAL_MODULE__slash_commands_SlashCommandArgument_js_a42b9371_SlashCommandArgument__.fromProps({
                description: 'Optional seed text to post and rephrase',
                typeList: [__WEBPACK_EXTERNAL_MODULE__slash_commands_SlashCommandArgument_js_a42b9371_ARGUMENT_TYPE__.STRING],
                isRequired: false,
            }),
        ],
        aliases: [],
        helpString: 'Enriches a message with AI narration. With text: generates enriched prose. Without text: rephrases the last message as a new swipe.',
    }));

    phrasing_debug('Registered /phrasing slash command');
}

// ─── Init ───

/**
 * @param {object} options
 * @param {object} options.settings       - Shared mutable settings reference.
 * @param {object} options.possessionApi  - { isPossessing(), getPossessedCharName(), postPossessedMessage(text) }
 */
function initPhrasing({ settings, possessionApi: pApi }) {
    phrasing_ctx = { settings };
    possessionApi = pApi;
    phrasing_debug = createDebugLogger('PHRASING', () => settings.phrasingDebugMode);
}

;// external "../../../../reasoning.js"

;// ./src/assisted-character-creation.js
/**
 * Assisted Character Creation (ACC)
 *
 * Modal-based character creation. The user enters a character brief,
 * generates a complete description, optionally extends or re-rolls it,
 * and clicks Done to copy it into SillyTavern's description field.
 */






// ─── Default Prompt ───

// {{context}} and {{brief}} are this extension's placeholders (substituted
// by applyTemplateMacros, not ST's macro engine — the literal
// {{ .fooOverride ?? ... }} syntax below must pass through untouched). If a
// placeholder is removed, the block is prepended/appended automatically.
const DEFAULT_ACC_PROMPT = `{{context}}[
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
const DEFAULT_ACC_PREFILL = '[\nCharacter Name: ';

const DEFAULT_ACC_RESPONSE_LENGTH = 1000;

// ─── Module State ───

let assisted_character_creation_moduleSettings = null;
let assisted_character_creation_debug = () => {};

let isGenerating = false;
let abortRequested = false;
let activeAction = null;       // which button initiated the current generation
let lastAction = null;         // 'generate' | 'continue' — what Retry should redo
let restorePoint = null;       // textarea snapshot used by Retry

// Modal contents are remembered across open/close so the user doesn't lose
// their brief, generated description, or context-toggle selections — even
// when the modal closes via Done. Cleared only when the user uses the
// explicit Clear buttons inside the modal.
const persistedModalState = {
    brief: '',
    output: '',
    useChatContext: false,
    selectedLoreBooks: [],
    responseLength: null, // null means "use saved setting"
};

// ─── Init ───

/**
 * Initialize ACC module. Called once from index.js.
 * @param {object} opts - { settings, saveSettings }
 */
function initACC({ settings, saveSettings }) {
    assisted_character_creation_moduleSettings = settings;
    saveSettingsFn = saveSettings;
    assisted_character_creation_debug = createDebugLogger('ACC', () => assisted_character_creation_moduleSettings.accDebugMode);
    assisted_character_creation_debug('Module initialized');
}

let saveSettingsFn = null;

// ─── Character Page Integration ───

/**
 * Called on CHARACTER_PAGE_LOADED. Injects the ACC launch button.
 */
function assisted_character_creation_onCharacterPageLoaded() {
    if (!assisted_character_creation_moduleSettings.accEnabled) return;
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
    assisted_character_creation_debug('Launch button injected');
}

// ─── Settings Bindings ───

/**
 * Bind ACC settings panel controls. Called after settings HTML is injected.
 * @param {function} saveSettings
 */
function bindACCSettings(saveSettings) {
    const enabledCb = document.getElementById('acc_enabled');
    const debugCb = document.getElementById('acc_debug_mode');
    const promptArea = document.getElementById('acc_prompt_textarea');

    if (enabledCb) {
        enabledCb.checked = assisted_character_creation_moduleSettings.accEnabled;
        enabledCb.addEventListener('change', () => {
            assisted_character_creation_moduleSettings.accEnabled = enabledCb.checked;
            saveSettings();
        });
    }
    if (debugCb) {
        debugCb.checked = assisted_character_creation_moduleSettings.accDebugMode;
        debugCb.addEventListener('change', () => {
            assisted_character_creation_moduleSettings.accDebugMode = debugCb.checked;
            saveSettings();
        });
    }
    const maxContextInput = document.getElementById('acc_max_context_override');
    if (maxContextInput) {
        maxContextInput.value = assisted_character_creation_moduleSettings.accMaxContextOverride || 0;
        maxContextInput.addEventListener('input', () => {
            const n = parseInt(maxContextInput.value, 10);
            assisted_character_creation_moduleSettings.accMaxContextOverride = Number.isFinite(n) && n > 0 ? n : 0;
            saveSettings();
        });
    }
    if (promptArea) {
        promptArea.value = assisted_character_creation_moduleSettings.accPrompt || DEFAULT_ACC_PROMPT;
        promptArea.addEventListener('input', () => {
            assisted_character_creation_moduleSettings.accPrompt = promptArea.value;
            saveSettings();
        });
    }

    const prefillArea = document.getElementById('acc_prefill_textarea');
    if (prefillArea) {
        prefillArea.value = assisted_character_creation_moduleSettings.accPrefill || DEFAULT_ACC_PREFILL;
        prefillArea.addEventListener('input', () => {
            assisted_character_creation_moduleSettings.accPrefill = prefillArea.value;
            saveSettings();
        });
    }

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
            text: 'Continue uses the same template plus a fixed "Description so far: …" block and '
                + `continuation instructions, with this system prompt:\n\n${ACC_CONTINUE_SYSTEM_PROMPT}`,
        },
    ]);
}

// ─── Modal ───

let activePopup = null;
let activeBody = null;

async function openModal() {
    if (activePopup) return;

    isGenerating = false;
    abortRequested = false;
    activeAction = null;
    // Note: lastAction / restorePoint stay null on each open. They're
    // retry-only state and don't need to persist across modal sessions.
    lastAction = null;
    restorePoint = null;

    const body = buildModalBody();

    const popup = new __WEBPACK_EXTERNAL_MODULE__popup_js_755810aa_Popup__(body, __WEBPACK_EXTERNAL_MODULE__popup_js_755810aa_POPUP_TYPE__.TEXT, '', {
        okButton: 'Done',
        cancelButton: 'Cancel',
        wide: true,
        large: true,
        allowVerticalScrolling: true,
        onOpen: () => {
            bindModalHandlers();
            refreshActionButtonStates();
            assisted_character_creation_debug('Modal opened');
        },
        onClosing: (p) => {
            if (p.result === __WEBPACK_EXTERNAL_MODULE__popup_js_755810aa_POPUP_RESULT__.AFFIRMATIVE) {
                // Done clicked — refuse to close mid-generation.
                if (isGenerating) {
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
        if (result === __WEBPACK_EXTERNAL_MODULE__popup_js_755810aa_POPUP_RESULT__.AFFIRMATIVE) {
            applyDescription(body);
        }
    } finally {
        // Snapshot the modal's current state into the persisted store so
        // the next open shows the same brief / output / context options.
        capturePersistedModalState(body);
        activePopup = null;
        activeBody = null;
        isGenerating = false;
        activeAction = null;
        lastAction = null;
        restorePoint = null;
        assisted_character_creation_debug('Modal closed');
    }
}

function capturePersistedModalState(body) {
    if (!body) return;
    persistedModalState.brief = body.querySelector('#acc_character_brief')?.value || '';
    persistedModalState.output = body.querySelector('#acc_description_output')?.value || '';
    persistedModalState.useChatContext = !!body.querySelector('#acc_use_chat_context')?.checked;
    const picker = body._accLorebookPicker;
    persistedModalState.selectedLoreBooks = picker ? picker.getSelected() : [];
    const tokenInput = body.querySelector('#acc_response_length');
    const parsed = tokenInput ? parseInt(tokenInput.value, 10) : NaN;
    persistedModalState.responseLength = (!isNaN(parsed) && parsed > 0) ? parsed : null;
}

function buildModalBody() {
    const root = document.createElement('div');
    root.className = 'acc-modal-body';
    root.innerHTML = `
        <div class="acc-context-section">
            <label class="checkbox_label" title="Prepend the current chat / character context to the generation">
                <input id="acc_use_chat_context" type="checkbox" />
                <span>Use Chat Context</span>
            </label>
            <div class="acc-lorebook-host"></div>
        </div>
        <div class="acc-brief-section">
            <div class="acc-field-header">
                <label for="acc_character_brief"><b>Character Brief:</b></label>
                <div id="acc_clear_brief_btn" class="menu_button interactable acc-clear-btn" title="Clear the brief">
                    <span class="fa-solid fa-eraser"></span> Clear
                </div>
            </div>
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
            <input id="acc_response_length" type="number" class="text_pole acc-tokens-input" min="50" max="8192" step="50" />
        </div>
        <div class="acc-status-bar acc-hidden" id="acc_status_bar">
            <span class="fa-solid fa-spinner fa-spin"></span>
            <span id="acc_status_text"></span>
        </div>
        <div class="acc-description-section">
            <div class="acc-field-header">
                <label for="acc_description_output"><b>Character Description:</b></label>
                <div id="acc_clear_output_btn" class="menu_button interactable acc-clear-btn" title="Clear the generated description">
                    <span class="fa-solid fa-eraser"></span> Clear
                </div>
            </div>
            <textarea id="acc_description_output" class="text_pole acc-description-output" rows="18" placeholder="Generated description will appear here. You can edit it before clicking Done."></textarea>
        </div>
    `;

    // Hydrate the persisted-across-opens fields.
    const briefEl = root.querySelector('#acc_character_brief');
    if (briefEl) briefEl.value = persistedModalState.brief || '';
    const outputEl = root.querySelector('#acc_description_output');
    if (outputEl) outputEl.value = persistedModalState.output || '';
    const chatCb = root.querySelector('#acc_use_chat_context');
    if (chatCb) chatCb.checked = !!persistedModalState.useChatContext;

    // Initialize the token field from persisted state if available, else
    // from settings.
    const tokenInput = root.querySelector('#acc_response_length');
    if (tokenInput) {
        const persisted = persistedModalState.responseLength;
        tokenInput.value = String((typeof persisted === 'number' && persisted > 0)
            ? persisted
            : getResponseLength());
    }

    // Mount the shared lore-book picker with previously-selected entries.
    const picker = createLoreBookPicker({
        classPrefix: 'acc-lorebook',
        initialSelection: Array.isArray(persistedModalState.selectedLoreBooks)
            ? persistedModalState.selectedLoreBooks.slice()
            : [],
    });
    root.querySelector('.acc-lorebook-host').replaceWith(picker.element);
    root._accLorebookPicker = picker;

    return root;
}

function bindModalHandlers() {
    document.getElementById('acc_generate_btn')?.addEventListener('click', handleGenerate);
    document.getElementById('acc_continue_btn')?.addEventListener('click', handleContinue);
    document.getElementById('acc_checkpoint_btn')?.addEventListener('click', handleCheckpoint);
    document.getElementById('acc_retry_btn')?.addEventListener('click', handleRetry);

    const output = document.getElementById('acc_description_output');
    output?.addEventListener('input', refreshActionButtonStates);

    const tokenInput = document.getElementById('acc_response_length');
    tokenInput?.addEventListener('change', () => {
        const parsed = parseInt(tokenInput.value, 10);
        if (!isNaN(parsed) && parsed > 0) {
            assisted_character_creation_moduleSettings.accResponseLength = parsed;
            saveSettingsFn?.();
        }
    });

    document.getElementById('acc_clear_brief_btn')?.addEventListener('click', () => {
        if (isGenerating) return;
        const brief = document.getElementById('acc_character_brief');
        if (!brief) return;
        brief.value = '';
        brief.focus();
        refreshActionButtonStates();
    });
    document.getElementById('acc_clear_output_btn')?.addEventListener('click', () => {
        if (isGenerating) return;
        const out = document.getElementById('acc_description_output');
        if (!out) return;
        out.value = '';
        // Clearing the output invalidates the existing Retry restore point
        // so the user doesn't accidentally restore an unrelated description.
        restorePoint = null;
        lastAction = null;
        out.focus();
        refreshActionButtonStates();
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

// ─── Actions ───

function readModalContextOptions() {
    const includeChat = !!document.getElementById('acc_use_chat_context')?.checked;
    const picker = activeBody?._accLorebookPicker;
    const loreBookNames = picker ? picker.getSelected() : [];
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
    assisted_character_creation_debug('Checkpoint saved, length:', current.length);
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
            assisted_character_creation_debug(`${action} aborted, discarding result`);
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
        assisted_character_creation_debug(`${action} complete, length:`, result.length);
    } catch (err) {
        if (isSilentGenerationAbort(err)) {
            assisted_character_creation_debug(`${action} aborted via cancellation`);
        } else if (!abortRequested) {
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
 * Assemble the Continue-mode user prompt: same template + macros, then the
 * description-so-far and continuation instructions.
 */
function composeContinuePrompt(preambleBlock, brief, existing) {
    const briefValue = brief || '(none provided)';
    const { text, used } = applyTemplateMacros(getPromptTemplate(), {
        context: preambleBlock || '',
        brief: briefValue,
    });
    let prompt = text;
    if (!used.has('context') && preambleBlock) prompt = preambleBlock + prompt;
    if (!used.has('brief') && brief) prompt = `${prompt}\n\nCharacter Brief:\n${brief}`;
    return `${prompt}\n\nDescription so far:\n${existing}\n\nContinue exactly where the text leaves off. Do not repeat any text already present. Maintain the same format and style. Output only the continuation.`;
}

async function generateDescription(brief, ctxOptions) {
    const preambleBlock = await buildPreambleBlock(ctxOptions);
    const prompt = composeGeneratePrompt(preambleBlock, brief);
    const systemPrompt = ACC_GENERATE_SYSTEM_PROMPT;
    const responseLength = getResponseLength();
    const prefill = getPrefill();

    assisted_character_creation_debug('Generating with brief length', brief.length, 'tokens', responseLength);
    assisted_character_creation_debug('System prompt:', systemPrompt);
    assisted_character_creation_debug('Prompt:', prompt);
    assisted_character_creation_debug('Prefill:', prefill);

    const outputEl = document.getElementById('acc_description_output');
    const result = await withSingleLineDisabled(() => streamingGenerate(
        { prompt, systemPrompt, responseLength, ...(prefill ? { prefill } : {}) },
        outputEl,
        { append: false },
    ));
    // Backends that ignore the assistant prefix may re-emit the prefill;
    // strip the echo so prepending it doesn't double the opening.
    const cleaned = stripPrefillEcho(__WEBPACK_EXTERNAL_MODULE__reasoning_js_8d5a64cc_removeReasoningFromString__(result).trim(), prefill);
    return (prefill || '') + cleaned;
}

async function generateContinuation(brief, existing, ctxOptions) {
    const preambleBlock = await buildPreambleBlock(ctxOptions);
    const prompt = composeContinuePrompt(preambleBlock, brief, existing);
    const systemPrompt = ACC_CONTINUE_SYSTEM_PROMPT;
    const responseLength = getResponseLength();

    assisted_character_creation_debug('Continuing with existing length', existing.length, 'tokens', responseLength);
    assisted_character_creation_debug('System prompt:', systemPrompt);
    assisted_character_creation_debug('Prompt:', prompt);

    const outputEl = document.getElementById('acc_description_output');
    const result = await withSingleLineDisabled(() => streamingGenerate(
        { prompt, systemPrompt, responseLength },
        outputEl,
        { append: true },
    ));
    return __WEBPACK_EXTERNAL_MODULE__reasoning_js_8d5a64cc_removeReasoningFromString__(result).trim();
}

function getPromptTemplate() {
    const stored = assisted_character_creation_moduleSettings?.accPrompt;
    return (typeof stored === 'string' && stored.trim()) ? stored : DEFAULT_ACC_PROMPT;
}

function getPrefill() {
    const stored = assisted_character_creation_moduleSettings?.accPrefill;
    return (typeof stored === 'string' && stored.length > 0) ? stored : DEFAULT_ACC_PREFILL;
}

function getResponseLength() {
    const input = document.getElementById('acc_response_length');
    if (input) {
        const parsed = parseInt(input.value, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    const setting = assisted_character_creation_moduleSettings?.accResponseLength;
    if (typeof setting === 'number' && setting > 0) return setting;
    return DEFAULT_ACC_RESPONSE_LENGTH;
}

async function buildPreambleBlock(ctxOptions) {
    if (!ctxOptions) return '';
    if (!ctxOptions.includeChat && !(ctxOptions.loreBookNames && ctxOptions.loreBookNames.length)) return '';
    const preamble = await buildContextPreamble({
        ...ctxOptions,
        responseLength: getResponseLength(),
        maxContextOverride: assisted_character_creation_moduleSettings?.accMaxContextOverride || 0,
    });
    if (!preamble) return '';
    assisted_character_creation_debug('Context preamble length:', preamble.length);
    return `Existing context to consider when generating (do not repeat verbatim):\n${preamble}\n\n`;
}

function stopGeneration() {
    // Route through abortAllGenerations() so that ST's GENERATION_STOPPED
    // event also fires. That's what triggers generateRawData() to abort
    // its fetch, close the connection, and let ST's server propagate the
    // abort to the backend (e.g. POST /api/extra/abort to KoboldCpp).
    // Aborting only our local controllers would free the UI but leave the
    // LLM generating to the response cap.
    abortAllGenerations('acc-cancel');
    assisted_character_creation_debug('Stop generation triggered');
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

    // Popup owns the Done/Cancel buttons; toggle the OK button visually so
    // users get a clear "wait for generation" hint. The onClosing guard
    // still blocks the close if they click it mid-flight.
    const okBtn = activePopup?.okButton;
    if (okBtn) okBtn.classList.toggle('disabled', !!generating);

    if (generating) {
        briefInput?.setAttribute('disabled', 'true');
    } else {
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

;// ./src/world-info-assist.js
/**
 * World Info Assist (WIA)
 *
 * Adds an LLM-driven Assist button to every World Info / Lore book entry
 * form. Each entry gets its own button row above the content textarea
 * with Assist, Continue, Retry, and Revert controls — mirroring the
 * Assisted Character Creation tool, but operating on a single field
 * (the entry's content) and using a free-form prompt instead of a schema.
 */






// ─── Default Prompt ───

// {{context}} and {{guidance}} are this extension's placeholders
// (substituted by applyTemplateMacros). If a placeholder is removed, the
// block is prepended/appended automatically. {{title}} is also available.
const DEFAULT_WIA_PROMPT = `{{context}}[
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
const DEFAULT_WIA_PREFILL_TITLED =
    '[Factual world-lore reference entry — encyclopedic, declarative, no narrative voice.\n\n{{title}}: ';

const DEFAULT_WIA_PREFILL_UNTITLED =
    '[Factual world-lore reference entry — encyclopedic, declarative, no narrative voice.\n\n';

const DEFAULT_WIA_RESPONSE_LENGTH = 600;

// ─── Module State ───

let world_info_assist_moduleSettings = null;
let world_info_assist_debug = () => {};
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
    const n = world_info_assist_moduleSettings?.wiaResponseLength;
    return (typeof n === 'number' && n > 0) ? n : DEFAULT_WIA_RESPONSE_LENGTH;
}

function resolveWIAPrefill(title) {
    const trimmedTitle = (title || '').trim();
    if (trimmedTitle) {
        const tpl = (typeof world_info_assist_moduleSettings?.wiaPrefillTitled === 'string' && world_info_assist_moduleSettings.wiaPrefillTitled)
            ? world_info_assist_moduleSettings.wiaPrefillTitled
            : DEFAULT_WIA_PREFILL_TITLED;
        return __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_substituteParamsExtended__(tpl, { title: trimmedTitle });
    }
    const tpl = (typeof world_info_assist_moduleSettings?.wiaPrefillUntitled === 'string' && world_info_assist_moduleSettings.wiaPrefillUntitled)
        ? world_info_assist_moduleSettings.wiaPrefillUntitled
        : DEFAULT_WIA_PREFILL_UNTITLED;
    return __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_substituteParamsExtended__(tpl, {});
}

// ─── Init ───

/**
 * Initialize WIA module. Called once from index.js.
 * @param {object} opts - { settings }
 */
function initWIA({ settings }) {
    world_info_assist_moduleSettings = settings;
    world_info_assist_debug = createDebugLogger('WIA', () => world_info_assist_moduleSettings.wiaDebugMode);
    world_info_assist_debug('Module initialized');
}

// ─── Editor Observation / Injection ───

/**
 * Watch for World Info entry forms appearing in the editor and inject the
 * assist controls. ST does not emit an event when an individual entry is
 * expanded — `displayWorldEntries` mutates the editor list directly — so we
 * use a narrowly-scoped MutationObserver on the editor's entry list
 * container, plus the WORLDINFO_UPDATED event for refresh after saves.
 */
function startWIAObserver() {
    if (listenersInstalled) return;
    listenersInstalled = true;

    const rescan = () => {
        if (!world_info_assist_moduleSettings?.wiaEnabled) return;
        document.querySelectorAll('.world_entry_edit').forEach(injectControls);
    };

    const attachObserver = () => {
        if (observer) return;
        const container = document.getElementById('world_popup_entries_list');
        if (!container) return;
        observer = new MutationObserver((mutations) => {
            if (!world_info_assist_moduleSettings?.wiaEnabled) return;
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (!(node instanceof HTMLElement)) continue;
                    if (node.matches?.('.world_entry_edit')) injectControls(node);
                    node.querySelectorAll?.('.world_entry_edit').forEach(injectControls);
                }
            }
        });
        observer.observe(container, { childList: true, subtree: true });
        world_info_assist_debug('WI editor observer attached');
    };

    // The editor list isn't in the DOM until the user opens World Info, so
    // try once now and re-try on WI events (which fire after open / save).
    attachObserver();
    const { eventSource, eventTypes } = getContext();
    eventSource.on(eventTypes.WORLDINFO_UPDATED, () => { attachObserver(); rescan(); });
    eventSource.on(eventTypes.WORLDINFO_ENTRIES_LOADED, () => { attachObserver(); rescan(); });

    rescan();
    world_info_assist_debug('WI listeners installed');
}

/**
 * Re-scan all currently visible WI forms (used after enable toggle).
 */
function rescanAllForms() {
    if (!world_info_assist_moduleSettings?.wiaEnabled) return;
    document.querySelectorAll('.world_entry_edit').forEach(injectControls);
}

/**
 * Remove all injected controls (used when the feature is disabled). Must
 * cover every element injectControls creates — the controls row, the
 * guidance block, and the content-clear row — or a disable/enable cycle
 * leaves orphans behind and then injects duplicates next to them.
 */
function removeAllControls() {
    document.querySelectorAll('.wia-controls, .wia-guidance-block, .wia-content-clear-row')
        .forEach(el => el.remove());
}

function injectControls(formEl) {
    if (!world_info_assist_moduleSettings?.wiaEnabled) return;
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

    if (tokensInput) {
        tokensInput.value = getWIAResponseLength();
        tokensInput.addEventListener('change', () => {
            const n = parseInt(tokensInput.value, 10);
            if (Number.isFinite(n) && n > 0) {
                world_info_assist_moduleSettings.wiaResponseLength = n;
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

    world_info_assist_debug('Injected controls for entry', id);
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
        show(continueBtn, false);
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
    return (world_info_assist_moduleSettings?.wiaPrompt && world_info_assist_moduleSettings.wiaPrompt.trim())
        ? world_info_assist_moduleSettings.wiaPrompt
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
function composeWIAPrompt({ preambleBlock, seed, title, isContinue, currentText }) {
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
        return `${prompt}\n\nThe entry so far:\n${currentText}\n\n` +
            'Continue exactly where the entry left off. Do not repeat any text. ' +
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
            world_info_assist_debug('Stop requested for', id);
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
                maxContextOverride: world_info_assist_moduleSettings?.wiaMaxContextOverride || 0,
            });
            world_info_assist_debug('Context preamble length:', preamble.length, 'options:', ctxOptions);
        }
        const preambleBlock = preamble
            ? `Existing context to consider when generating (do not repeat verbatim):\n${preamble}\n\n`
            : '';

        const userPrompt = composeWIAPrompt({
            preambleBlock, seed, title, isContinue, currentText,
        });
        const prefill = isContinue ? '' : resolveWIAPrefill(title);
        const systemPrompt = WIA_SYSTEM_PROMPT;

        world_info_assist_debug('System prompt:', systemPrompt);
        world_info_assist_debug('User prompt:', userPrompt);
        world_info_assist_debug('Prefill:', prefill);

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

        let cleaned = __WEBPACK_EXTERNAL_MODULE__reasoning_js_8d5a64cc_removeReasoningFromString__(raw).trim();
        // Backends that ignore the assistant prefix may re-emit the prefill;
        // strip the echo so prepending it doesn't double the opening.
        if (!isContinue) cleaned = stripPrefillEcho(cleaned, prefill);

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
        world_info_assist_debug('Generation complete for', id);
    } catch (err) {
        if (isSilentGenerationAbort(err)) {
            world_info_assist_debug('Generation cancelled for', id);
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
function bindWIASettings(saveSettings) {
    saveSettingsCb = saveSettings;

    const enabledCb = document.getElementById('wia_enabled');
    const debugCb = document.getElementById('wia_debug_mode');
    const promptArea = document.getElementById('wia_prompt_textarea');

    if (enabledCb) {
        enabledCb.checked = !!world_info_assist_moduleSettings.wiaEnabled;
        enabledCb.addEventListener('change', () => {
            world_info_assist_moduleSettings.wiaEnabled = enabledCb.checked;
            saveSettings();
            if (world_info_assist_moduleSettings.wiaEnabled) {
                rescanAllForms();
            } else {
                removeAllControls();
            }
        });
    }
    if (debugCb) {
        debugCb.checked = !!world_info_assist_moduleSettings.wiaDebugMode;
        debugCb.addEventListener('change', () => {
            world_info_assist_moduleSettings.wiaDebugMode = debugCb.checked;
            saveSettings();
        });
    }
    const maxContextInput = document.getElementById('wia_max_context_override');
    if (maxContextInput) {
        maxContextInput.value = world_info_assist_moduleSettings.wiaMaxContextOverride || 0;
        maxContextInput.addEventListener('input', () => {
            const n = parseInt(maxContextInput.value, 10);
            world_info_assist_moduleSettings.wiaMaxContextOverride = Number.isFinite(n) && n > 0 ? n : 0;
            saveSettings();
        });
    }
    const responseLengthInput = document.getElementById('wia_response_length');
    if (responseLengthInput) {
        responseLengthInput.value = world_info_assist_moduleSettings.wiaResponseLength || DEFAULT_WIA_RESPONSE_LENGTH;
        responseLengthInput.addEventListener('input', () => {
            const n = parseInt(responseLengthInput.value, 10);
            if (Number.isFinite(n) && n > 0) {
                world_info_assist_moduleSettings.wiaResponseLength = n;
                saveSettings();
                document.querySelectorAll('.wia-tokens-input').forEach(el => { el.value = n; });
            }
        });
    }
    if (promptArea) {
        promptArea.value = world_info_assist_moduleSettings.wiaPrompt || DEFAULT_WIA_PROMPT;
        promptArea.addEventListener('input', () => {
            world_info_assist_moduleSettings.wiaPrompt = promptArea.value;
            saveSettings();
        });
    }

    const prefillTitledArea = document.getElementById('wia_prefill_titled_textarea');
    if (prefillTitledArea) {
        prefillTitledArea.value = world_info_assist_moduleSettings.wiaPrefillTitled || DEFAULT_WIA_PREFILL_TITLED;
        prefillTitledArea.addEventListener('input', () => {
            world_info_assist_moduleSettings.wiaPrefillTitled = prefillTitledArea.value;
            saveSettings();
        });
    }

    const prefillUntitledArea = document.getElementById('wia_prefill_untitled_textarea');
    if (prefillUntitledArea) {
        prefillUntitledArea.value = world_info_assist_moduleSettings.wiaPrefillUntitled || DEFAULT_WIA_PREFILL_UNTITLED;
        prefillUntitledArea.addEventListener('input', () => {
            world_info_assist_moduleSettings.wiaPrefillUntitled = prefillUntitledArea.value;
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
        currentText: '',
    });
    showPromptPreview('World Info Assist — Prompt Preview (Assist, titled entry)', [
        { label: 'System Prompt (fixed)', text: WIA_SYSTEM_PROMPT },
        { label: 'User Prompt (template with sample values)', text: prompt },
        { label: `Prefill — titled entry (sample title "${sampleTitle}")`, text: resolveWIAPrefill(sampleTitle) },
        { label: 'Prefill — untitled entry', text: resolveWIAPrefill('') },
        {
            label: 'Note',
            text: 'The prefill is sent as an assistant prefix and kept at the start of the entry on '
                + 'success. Continue uses the same template plus a fixed "The entry so far: …" block '
                + 'and continuation instructions, with no prefill.',
        },
    ]);
}

;// ./src/narrative-guidance.js
/**
 * Narrative Guidance module — periodically asks the LLM to produce a short
 * paragraph of story guidance based on the current chat / character / lore
 * context, then injects that paragraph as a system prompt before every AI
 * turn until a per-chat turn counter expires, at which point it regenerates.
 *
 * Guidance comes in two independent tiers ("tracks"):
 *   - Long-term  — the overarching arc, with a long refresh horizon.
 *   - Short-term — the immediate beats, with a short refresh horizon.
 * The tiers are fully separate (own themes, prompts, lore books, counter and
 * toggles) but operate identically; everything track-specific is captured in
 * the NG_TRACKS descriptors so the generation/injection/counter logic is
 * shared. Short-term generation is hierarchical: it is seeded with the
 * current long-term guidance so the immediate beats serve the larger arc, and
 * a long-term refresh re-aligns short-term.
 *
 * Per-chat state lives under `context.chatMetadata.narrativeGuidance` as
 * `{ long: { guidance, turnsRemaining, themes }, short: { … } }`. Legacy
 * single-track state is mapped onto the short-term track on read.
 */






// ─── Constants ───

const NG_METADATA_KEY = 'narrativeGuidance';

// User-prompt templates for guidance generation. {{context}}, {{themes}} and
// (short-term only) {{longGuidance}} are replaced by the packed chat/lore
// preamble, the per-track themes block, and the active long-term arc; if a
// placeholder is missing the block is prepended instead.
const DEFAULT_NG_LONG_USER_PROMPT =
    '{{context}}{{themes}}Continue the bracketed paragraph below. Output a single short paragraph ' +
    '(2–4 sentences) describing the overarching direction of the story across the next many turns — ' +
    'the larger arc, the escalating stakes, and where events are ultimately heading. ' +
    'Describe the broad trajectory and mood, not immediate dialogue or scene actions. ' +
    'Close the bracket when done.';

const DEFAULT_NG_SHORT_USER_PROMPT =
    '{{context}}{{longGuidance}}{{themes}}Continue the bracketed paragraph below. Output a single short paragraph ' +
    '(2–4 sentences) proposing where the story should head over the next few turns — ' +
    'immediate direction, mood, complications, and beats that move the scene toward the overarching arc. ' +
    'Describe direction, not direct dialogue or scene actions. Close the bracket when done.';

const DEFAULT_NG_LONG_GENERATION_PROMPT =
    '[The following paragraph describes the overarching story arc, and will guide the long-term direction of the story:';

const DEFAULT_NG_SHORT_GENERATION_PROMPT =
    '[The following paragraph is based on the given context, and will guide the actions of the characters for the next few turns:';

const DEFAULT_NG_LONG_INJECTION_PROMPT =
    '[Overall story direction: {{guidance}}]';

const DEFAULT_NG_SHORT_INJECTION_PROMPT =
    '[Guide the story in the following direction over the next few turns: {{guidance}}]';

const NG_GENERATION_SYSTEM_PROMPT =
    'You are a story-direction assistant. Output only a single short paragraph ' +
    'of narrative guidance in the requested bracketed format. ' +
    'No commentary, no preamble, no explanations.';

const DEFAULT_NG_LONG_TURN_COUNT = 40;
const DEFAULT_NG_SHORT_TURN_COUNT = 8;
const DEFAULT_NG_INJECTION_DEPTH = 0;
const DEFAULT_NG_INJECTION_ROLE = 'system';
const DEFAULT_NG_RESPONSE_LENGTH = 400;

// ─── Track Descriptors ───

// Everything track-specific lives here so the shared logic below can be
// parameterized by track. `settingPrefix` + a suffix yields the extension
// settings key (e.g. 'narrativeGuidanceLongEnabled'); `domPrefix` + a suffix
// yields the settings-panel element id (e.g. 'ng_long_enabled').
const NG_TRACKS = {
    long: {
        id: 'long',
        label: 'Long-term',
        injectionKey: 'narrative_guidance_long',
        countedFlag: 'ngLongCounted',
        settingPrefix: 'narrativeGuidanceLong',
        domPrefix: 'ng_long',
        hierarchical: false,
        defaultTurnCount: DEFAULT_NG_LONG_TURN_COUNT,
        defaultUserPrompt: DEFAULT_NG_LONG_USER_PROMPT,
        defaultGenerationPrompt: DEFAULT_NG_LONG_GENERATION_PROMPT,
        defaultInjectionPrompt: DEFAULT_NG_LONG_INJECTION_PROMPT,
    },
    short: {
        id: 'short',
        label: 'Short-term',
        injectionKey: 'narrative_guidance_short',
        countedFlag: 'ngShortCounted',
        settingPrefix: 'narrativeGuidanceShort',
        domPrefix: 'ng_short',
        hierarchical: true,
        defaultTurnCount: DEFAULT_NG_SHORT_TURN_COUNT,
        defaultUserPrompt: DEFAULT_NG_SHORT_USER_PROMPT,
        defaultGenerationPrompt: DEFAULT_NG_SHORT_GENERATION_PROMPT,
        defaultInjectionPrompt: DEFAULT_NG_SHORT_INJECTION_PROMPT,
    },
};

// Long first so short (hierarchical) sees a freshly-bootstrapped arc.
const NG_TRACK_LIST = [NG_TRACKS.long, NG_TRACKS.short];

function settingKey(track, suffix) {
    return `${track.settingPrefix}${suffix}`;
}

function getSetting(track, suffix) {
    return narrative_guidance_moduleSettings?.[settingKey(track, suffix)];
}

function domId(track, suffix) {
    return `${track.domPrefix}_${suffix}`;
}

function trackEl(track, suffix) {
    return document.getElementById(domId(track, suffix));
}

// ─── Module State ───

let narrative_guidance_moduleSettings = null;
let narrative_guidance_saveSettingsCb = null;
let narrative_guidance_debug = () => {};
let saveTimer = null;

// Per-track runtime: in-progress flag, the action currently running
// ('regen' | 'continue' | null) used to swap the active button to Stop, and
// the pre-regen guidance snapshot for Retry.
const runtime = {
    long: { regenInProgress: false, activeAction: null, lastSnapshot: null },
    short: { regenInProgress: false, activeAction: null, lastSnapshot: null },
};

// ─── Per-chat State ───

/**
 * Read the per-chat NG container, normalizing legacy single-track state onto
 * the short-term track. Pure read — never mutates chatMetadata, so the
 * migration is only persisted on the next write.
 */
function readContainer() {
    const context = getContext();
    const raw = context.chatMetadata?.[NG_METADATA_KEY];
    if (raw && (raw.long !== undefined || raw.short !== undefined)) {
        return raw;
    }
    // Empty or legacy single-track shape → map any legacy guidance to short.
    return {
        long: { guidance: '', turnsRemaining: 0, themes: '' },
        short: {
            guidance: typeof raw?.guidance === 'string' ? raw.guidance : '',
            turnsRemaining: Number.isFinite(raw?.turnsRemaining) ? raw.turnsRemaining : 0,
            themes: typeof raw?.themes === 'string' ? raw.themes : '',
        },
    };
}

function loadChatState(track) {
    const raw = readContainer()[track.id] || {};
    return {
        guidance: typeof raw.guidance === 'string' ? raw.guidance : '',
        turnsRemaining: Number.isFinite(raw.turnsRemaining) ? raw.turnsRemaining : 0,
        themes: typeof raw.themes === 'string' ? raw.themes : '',
    };
}

function writeChatState(track, state) {
    const context = getContext();
    const container = readContainer();
    container[track.id] = {
        guidance: state.guidance || '',
        turnsRemaining: Number.isFinite(state.turnsRemaining) ? state.turnsRemaining : 0,
        themes: state.themes || '',
    };
    context.chatMetadata[NG_METADATA_KEY] = container;
}

function saveChatState(track, state) {
    writeChatState(track, state);
    getContext().saveMetadata();
}

function scheduleChatStateSave(track, state) {
    // Write through to chatMetadata immediately so a concurrent edit to
    // another textarea (which reloads state via loadChatState) or a chat
    // switch never observes — or persists — stale state. Only the
    // saveMetadata call is debounced. A single shared timer is fine because
    // saveMetadata persists the whole container.
    writeChatState(track, state);
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        saveTimer = null;
        getContext().saveMetadata();
    }, 200);
}

function resolveTurnCount(track) {
    const n = getSetting(track, 'DefaultTurnCount');
    return Number.isFinite(n) && n > 0 ? n : track.defaultTurnCount;
}

function resolveResponseLength(track) {
    const n = getSetting(track, 'ResponseLength');
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_NG_RESPONSE_LENGTH;
}

// ─── Injection ───

function clearInjection(track) {
    __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_setExtensionPrompt__(track.injectionKey, '', __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_extension_prompt_types__.NONE, 0);
}

function reapplyInjection(track) {
    if (!getSetting(track, 'Enabled')) {
        clearInjection(track);
        return;
    }
    const state = loadChatState(track);
    if (!state.guidance) {
        clearInjection(track);
        return;
    }
    const tpl = getSetting(track, 'InjectionPrompt') || track.defaultInjectionPrompt;
    // state.guidance retains the generation prefill (so the textarea shows
    // it). Strip outer brackets here so {{guidance}} substitutes cleanly
    // into whatever injection template the user has configured.
    const guidanceForInjection = stripBracketWrap(state.guidance);
    const body = __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_substituteParamsExtended__(tpl, { guidance: guidanceForInjection });
    const configuredDepth = getSetting(track, 'InjectionDepth');
    const depth = Number.isFinite(configuredDepth) && configuredDepth >= 0 ? configuredDepth : 0;
    const role = resolveInjectionRole(getSetting(track, 'InjectionRole'));
    __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_setExtensionPrompt__(
        track.injectionKey,
        body,
        __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_extension_prompt_types__.IN_CHAT,
        depth,
        false,
        role,
    );
    narrative_guidance_debug(`[${track.id}] Injected guidance — depth:`, depth, 'role:', getSetting(track, 'InjectionRole'), 'body length:', body.length);
}

function resolveInjectionRole(name) {
    switch ((name || 'system').toLowerCase()) {
        case 'user': return __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_extension_prompt_roles__.USER;
        case 'assistant': return __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_extension_prompt_roles__.ASSISTANT;
        case 'system':
        default: return __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_extension_prompt_roles__.SYSTEM;
    }
}

// ─── Generation ───

function stripBracketWrap(text) {
    let out = (text || '').trim();
    if (out.startsWith('[')) out = out.slice(1).trimStart();
    if (out.endsWith(']')) out = out.slice(0, -1).trimEnd();
    return out;
}

/**
 * Assemble the guidance-generation user prompt from the editable template.
 * {{context}} / {{themes}} / {{longGuidance}} are substituted in place; when a
 * placeholder is absent the corresponding block is prepended (context first,
 * then long-term arc, then themes), matching the pre-template behavior.
 */
function composeGenerationPrompt(track, preambleBlock, themesBlock, longGuidanceBlock) {
    const configured = getSetting(track, 'Prompt');
    const tpl = (typeof configured === 'string' && configured.trim())
        ? configured
        : track.defaultUserPrompt;
    const { text, used } = applyTemplateMacros(tpl, {
        context: preambleBlock || '',
        themes: themesBlock || '',
        longGuidance: longGuidanceBlock || '',
    });
    let prompt = text;
    if (!used.has('themes') && themesBlock) prompt = themesBlock + prompt;
    if (track.hierarchical && !used.has('longGuidance') && longGuidanceBlock) prompt = longGuidanceBlock + prompt;
    if (!used.has('context') && preambleBlock) prompt = preambleBlock + prompt;
    return prompt;
}

/** Build the long-term arc block fed into short-term (hierarchical) prompts. */
function buildLongGuidanceBlock() {
    const longText = stripBracketWrap(loadChatState(NG_TRACKS.long).guidance || '');
    return longText
        ? `Long-term story direction to stay consistent with:\n${longText}\n\n`
        : '';
}

function showNGPromptPreview(track) {
    const sampleContext =
        'Existing context to consider when generating (do not repeat verbatim):\n'
        + '(character cards, persona, selected lore books, and recent chat)\n\n';
    const sampleThemes = 'Themes / story arcs to weave in:\n(your Themes / Story Arcs text)\n\n';
    const sampleLong = track.hierarchical
        ? 'Long-term story direction to stay consistent with:\n(the active long-term guidance)\n\n'
        : '';
    const prefill = getSetting(track, 'GenerationPrompt') || track.defaultGenerationPrompt;
    const injectionTpl = getSetting(track, 'InjectionPrompt') || track.defaultInjectionPrompt;
    const injection = __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_substituteParamsExtended__(injectionTpl, {
        guidance: '(the generated guidance text, outer brackets stripped)',
    });
    showPromptPreview(`Narrative Guidance (${track.label}) — Prompt Preview`, [
        { label: 'System Prompt (fixed)', text: NG_GENERATION_SYSTEM_PROMPT },
        { label: 'User Prompt (Generation Instructions template with sample values)', text: composeGenerationPrompt(track, sampleContext, sampleThemes, sampleLong) },
        { label: 'Prefill (assistant prefix; kept at the start of the stored guidance)', text: prefill },
        { label: 'Injection (added to the chat prompt before each AI turn while guidance is active)', text: injection },
    ]);
}

/**
 * If a long-term refresh just landed, re-align short-term to it (when
 * short-term is enabled and auto-regenerating). Fire-and-forget — the new
 * short-term guidance lands before the user's next send.
 */
function maybeCascadeShortRegen(reason) {
    const short = NG_TRACKS.short;
    if (!getSetting(short, 'Enabled')) return;
    if (!getSetting(short, 'AutoRegen')) return;
    if (runtime.short.regenInProgress) return;
    narrative_guidance_debug('Cascading short-term regen after long-term refresh');
    regenGuidance(short, `long-term refreshed (${reason})`).catch(err => {
        console.error('Narrative Guidance short-term cascade failed:', err);
    });
}

async function regenGuidance(track, reason) {
    const rt = runtime[track.id];
    if (rt.regenInProgress) {
        narrative_guidance_debug(`[${track.id}] regenGuidance — skipped (already running)`);
        return;
    }
    if (!getSetting(track, 'Enabled')) {
        narrative_guidance_debug(`[${track.id}] regenGuidance — skipped (disabled)`);
        return;
    }

    // Snapshot current guidance before overwriting so Retry can restore it.
    rt.lastSnapshot = loadChatState(track).guidance || '';

    rt.regenInProgress = true;
    rt.activeAction = 'regen';
    setNGActionButtonsRunning(track, true);
    clearInjection(track);
    narrative_guidance_debug(`[${track.id}] regenGuidance — starting, reason:`, reason);

    const dismissProgressToast = stickyToast(`Generating ${track.label.toLowerCase()} narrative guidance…`, 'info');

    try {
        const responseLength = resolveResponseLength(track);
        const state = loadChatState(track);
        const preamble = await buildContextPreamble({
            includeChat: true,
            loreBookNames: Array.isArray(getSetting(track, 'LoreBookNames'))
                ? getSetting(track, 'LoreBookNames')
                : [],
            responseLength,
            maxContextOverride: getSetting(track, 'MaxContextOverride') || 0,
        });

        const themesBlock = state.themes && state.themes.trim()
            ? `Themes / story arcs to weave in:\n${state.themes.trim()}\n\n`
            : '';

        const preambleBlock = preamble
            ? `Existing context to consider when generating (do not repeat verbatim):\n${preamble}\n\n`
            : '';

        const longGuidanceBlock = track.hierarchical ? buildLongGuidanceBlock() : '';

        const prefill = getSetting(track, 'GenerationPrompt') || track.defaultGenerationPrompt;

        const userPrompt = composeGenerationPrompt(track, preambleBlock, themesBlock, longGuidanceBlock);
        const systemPrompt = NG_GENERATION_SYSTEM_PROMPT;

        narrative_guidance_debug(`[${track.id}] User prompt length:`, userPrompt.length, 'prefill:', prefill);

        const guidanceArea = trackEl(track, 'active_guidance_textarea');
        const raw = await withSingleLineDisabled(() => streamingGenerate(
            { prompt: userPrompt, systemPrompt, responseLength, prefill },
            guidanceArea,
            { append: false },
        ));

        // Preserve the prefill in the stored guidance so the active-guidance
        // textarea shows prefill + model output as one block. The bracket
        // wrappers are stripped only at injection time (see reapplyInjection)
        // so the injected payload doesn't end up nested inside two brackets.
        // Backends that ignore the assistant prefix may re-emit the prefill;
        // strip the echo so the stored block doesn't double its opening.
        const cleaned = stripPrefillEcho(__WEBPACK_EXTERNAL_MODULE__reasoning_js_8d5a64cc_removeReasoningFromString__(raw).trim(), prefill);
        if (!cleaned) {
            throw new Error('Model returned empty guidance.');
        }

        state.guidance = (prefill || '') + cleaned;
        state.turnsRemaining = resolveTurnCount(track);
        saveChatState(track, state);

        refreshPanelFromState(track);
        reapplyInjection(track);
        toast(`${track.label} narrative guidance regenerated.`, 'success');
        narrative_guidance_debug(`[${track.id}] regenGuidance — complete, length:`, cleaned.length);

        // A fresh long-term arc re-aligns the short-term track.
        if (track.id === 'long') maybeCascadeShortRegen(reason);
    } catch (err) {
        if (isSilentGenerationAbort(err)) {
            narrative_guidance_debug(`[${track.id}] regenGuidance — cancelled by user`);
        } else {
            console.error(`Narrative Guidance (${track.label}) generation error:`, err);
            toast(`${track.label} narrative guidance failed: ${err.message}`, 'error');
        }
        // Resync the textarea (the failed run may have left discarded model
        // output in it) and restore whatever injection we had before clearing.
        refreshPanelFromState(track);
        reapplyInjection(track);
    } finally {
        dismissProgressToast();
        rt.regenInProgress = false;
        rt.activeAction = null;
        setNGActionButtonsRunning(track, false);
    }
}

async function continueGuidance(track) {
    const rt = runtime[track.id];
    if (rt.regenInProgress) {
        narrative_guidance_debug(`[${track.id}] continueGuidance — skipped (already running)`);
        return;
    }
    if (!getSetting(track, 'Enabled')) {
        narrative_guidance_debug(`[${track.id}] continueGuidance — skipped (disabled)`);
        return;
    }
    const state = loadChatState(track);
    if (!state.guidance) {
        toast('No active guidance to continue. Regenerate first.', 'warning');
        return;
    }

    rt.regenInProgress = true;
    rt.activeAction = 'continue';
    setNGActionButtonsRunning(track, true);
    narrative_guidance_debug(`[${track.id}] continueGuidance — starting`);

    const dismissProgressToast = stickyToast(`Continuing ${track.label.toLowerCase()} narrative guidance…`, 'info');

    try {
        const responseLength = resolveResponseLength(track);

        const continuePrompt =
            `The following narrative guidance paragraph is in progress:\n\n${state.guidance}\n\n` +
            'Continue this paragraph seamlessly from where it left off. ' +
            'Add 1–2 sentences extending the story direction, mood, or complications. ' +
            'Do not repeat existing text. Output only the continuation — no brackets, no preamble.';

        const systemPrompt =
            'You are a story-direction assistant. Output only the continuation of the guidance. ' +
            'No commentary, no preamble, no explanations.';

        narrative_guidance_debug(`[${track.id}] Continue prompt length:`, continuePrompt.length);

        const guidanceArea = trackEl(track, 'active_guidance_textarea');
        const raw = await withSingleLineDisabled(() => streamingGenerate(
            { prompt: continuePrompt, systemPrompt, responseLength },
            guidanceArea,
            { append: true },
        ));

        const continuation = __WEBPACK_EXTERNAL_MODULE__reasoning_js_8d5a64cc_removeReasoningFromString__(raw).trim();
        if (!continuation) throw new Error('Model returned empty continuation.');

        rt.lastSnapshot = state.guidance;
        const sep = state.guidance.endsWith(' ') || continuation.startsWith(' ') ? '' : ' ';
        state.guidance = state.guidance + sep + continuation;
        saveChatState(track, state);

        refreshPanelFromState(track);
        reapplyInjection(track);
        toast(`${track.label} narrative guidance continued.`, 'success');
        narrative_guidance_debug(`[${track.id}] continueGuidance — complete, added length:`, continuation.length);
    } catch (err) {
        if (isSilentGenerationAbort(err)) {
            narrative_guidance_debug(`[${track.id}] continueGuidance — cancelled by user`);
        } else {
            console.error(`Narrative Guidance (${track.label}) continue error:`, err);
            toast(`${track.label} continue failed: ${err.message}`, 'error');
        }
        // Resync the textarea — the failed run may have appended discarded
        // model output that never made it into the saved state.
        refreshPanelFromState(track);
    } finally {
        dismissProgressToast();
        rt.regenInProgress = false;
        rt.activeAction = null;
        setNGActionButtonsRunning(track, false);
        refreshNGActionButtonStates(track);
    }
}

// ─── Event Handlers ───

function onNarrativeGuidanceChatChanged() {
    for (const track of NG_TRACK_LIST) {
        refreshPanelFromState(track);
        reapplyInjection(track);
    }
    narrative_guidance_debug('Chat changed, state reloaded');
}

async function onNarrativeGuidanceMessageSent(_messageIndex) {
    // Long-term first so a freshly-bootstrapped arc is available to seed a
    // short-term bootstrap on the same turn.
    for (const track of NG_TRACK_LIST) {
        if (!getSetting(track, 'Enabled')) continue;
        if (runtime[track.id].regenInProgress) continue;
        if (!getSetting(track, 'AutoRegen')) {
            reapplyInjection(track);
            continue;
        }
        const state = loadChatState(track);
        if (!state.guidance) {
            // First-turn bootstrap: block briefly so the next AI turn sees
            // guidance. (A long-term bootstrap may cascade short-term, which
            // sets short's in-progress flag before this loop reaches it.)
            await regenGuidance(track, 'no guidance yet');
        } else {
            reapplyInjection(track);
        }
    }
}

function onNarrativeGuidanceMessageReceived(messageIndex) {
    const ctx = getContext();
    const idx = typeof messageIndex === 'number' ? messageIndex : ctx.chat.length - 1;
    const msg = ctx.chat?.[idx];
    if (!msg) return;
    if (msg.is_user || msg.is_system) return;

    for (const track of NG_TRACK_LIST) {
        if (!getSetting(track, 'Enabled')) continue;
        if (runtime[track.id].regenInProgress) continue;
        if (msg.extra?.[track.countedFlag]) continue;

        const state = loadChatState(track);
        if (state.turnsRemaining > 0) {
            state.turnsRemaining -= 1;
            saveChatState(track, state);
            refreshRemainingDisplay(track, state.turnsRemaining);
        }
        msg.extra = { ...(msg.extra || {}), [track.countedFlag]: true };
        narrative_guidance_debug(`[${track.id}] Counter decremented, turnsRemaining:`, state.turnsRemaining);

        if (state.turnsRemaining <= 0 && getSetting(track, 'AutoRegen')) {
            // Fire-and-forget so new guidance is in place before the next send.
            regenGuidance(track, 'counter expired').catch(err => {
                console.error(`Narrative Guidance (${track.label}) auto-regen failed:`, err);
            });
        }
    }
}

// ─── Settings Panel ───

function refreshRemainingDisplay(track, remaining) {
    const display = trackEl(track, 'remaining_display');
    if (display) display.textContent = String(remaining);
}

function refreshPanelFromState(track) {
    const state = loadChatState(track);
    const themesArea = trackEl(track, 'themes_textarea');
    if (themesArea && document.activeElement !== themesArea) {
        themesArea.value = state.themes || '';
    }
    const guidanceArea = trackEl(track, 'active_guidance_textarea');
    if (guidanceArea && document.activeElement !== guidanceArea) {
        guidanceArea.value = state.guidance || '';
    }
    refreshRemainingDisplay(track, state.turnsRemaining);
    refreshNGActionButtonStates(track);
}

// Original button HTML, captured so we can restore it when leaving the
// generating state.
const NG_REGEN_BTN_HTML = '<span class="ng-regen-icon fa-solid fa-wand-sparkles"></span> Regenerate Now';
const NG_CONTINUE_BTN_HTML = '<span class="fa-solid fa-arrow-right"></span> Continue';
const NG_STOP_BTN_HTML = '<span class="fa-solid fa-stop"></span> Stop';

function setNGActionButtonsRunning(track, running) {
    const regenBtn = trackEl(track, 'regenerate_now');
    const continueBtn = trackEl(track, 'continue_now');
    const retryBtn = trackEl(track, 'retry_now');

    if (running) {
        // Active button becomes Stop; the others get the disabled class so the
        // user can't fire off a second job mid-flight.
        if (runtime[track.id].activeAction === 'continue') {
            if (regenBtn) {
                regenBtn.innerHTML = NG_REGEN_BTN_HTML;
                regenBtn.classList.add('disabled');
            }
            if (continueBtn) {
                continueBtn.innerHTML = NG_STOP_BTN_HTML;
                continueBtn.classList.remove('disabled');
            }
        } else {
            // 'regen' or unspecified — treat regenerate as active.
            if (regenBtn) {
                regenBtn.innerHTML = NG_STOP_BTN_HTML;
                regenBtn.classList.remove('disabled');
            }
            if (continueBtn) {
                continueBtn.innerHTML = NG_CONTINUE_BTN_HTML;
                continueBtn.classList.add('disabled');
            }
        }
        retryBtn?.classList.add('disabled');
    } else {
        if (regenBtn) {
            regenBtn.innerHTML = NG_REGEN_BTN_HTML;
            regenBtn.classList.remove('disabled');
        }
        if (continueBtn) {
            continueBtn.innerHTML = NG_CONTINUE_BTN_HTML;
            continueBtn.classList.remove('disabled');
        }
        retryBtn?.classList.remove('disabled');
    }
}

function refreshNGActionButtonStates(track) {
    if (runtime[track.id].regenInProgress) return;
    const state = loadChatState(track);
    trackEl(track, 'retry_now')
        ?.classList.toggle('disabled', runtime[track.id].lastSnapshot === null);
    trackEl(track, 'continue_now')
        ?.classList.toggle('disabled', !(state.guidance && state.guidance.trim()));
}

function populateLoreBookPicker(track) {
    const host = trackEl(track, 'lorebooks_host');
    if (!host) return;

    const initial = Array.isArray(getSetting(track, 'LoreBookNames'))
        ? getSetting(track, 'LoreBookNames')
        : [];

    const { element } = createLoreBookPicker({
        initialSelection: initial,
        // Shared styling class across both tracks; the element id differs.
        classPrefix: 'ng-lorebook',
        onChange: (names) => {
            narrative_guidance_moduleSettings[settingKey(track, 'LoreBookNames')] = names;
            narrative_guidance_saveSettingsCb?.();
        },
    });
    element.id = domId(track, 'lorebooks_details');
    host.replaceChildren(element);
}

/** Bind every per-track control in the settings panel for one track. */
function bindTrackControls(track, saveSettings) {
    const enabledCb = trackEl(track, 'enabled');
    if (enabledCb) {
        enabledCb.checked = !!getSetting(track, 'Enabled');
        enabledCb.addEventListener('change', () => {
            narrative_guidance_moduleSettings[settingKey(track, 'Enabled')] = enabledCb.checked;
            saveSettings();
            if (enabledCb.checked) {
                reapplyInjection(track);
            } else {
                clearInjection(track);
            }
        });
    }

    const autoRegenCb = trackEl(track, 'auto_regen');
    if (autoRegenCb) {
        autoRegenCb.checked = !!getSetting(track, 'AutoRegen');
        autoRegenCb.addEventListener('change', () => {
            narrative_guidance_moduleSettings[settingKey(track, 'AutoRegen')] = autoRegenCb.checked;
            saveSettings();
        });
    }

    const turnCountInput = trackEl(track, 'default_turn_count');
    if (turnCountInput) {
        turnCountInput.value = getSetting(track, 'DefaultTurnCount') || track.defaultTurnCount;
        turnCountInput.addEventListener('input', () => {
            const n = parseInt(turnCountInput.value, 10);
            if (Number.isFinite(n) && n > 0) {
                narrative_guidance_moduleSettings[settingKey(track, 'DefaultTurnCount')] = n;
                saveSettings();
            }
        });
    }

    const responseLengthInput = trackEl(track, 'response_length');
    if (responseLengthInput) {
        responseLengthInput.value = getSetting(track, 'ResponseLength') || DEFAULT_NG_RESPONSE_LENGTH;
        responseLengthInput.addEventListener('input', () => {
            const n = parseInt(responseLengthInput.value, 10);
            if (Number.isFinite(n) && n > 0) {
                narrative_guidance_moduleSettings[settingKey(track, 'ResponseLength')] = n;
                saveSettings();
            }
        });
    }

    const maxContextInput = trackEl(track, 'max_context_override');
    if (maxContextInput) {
        maxContextInput.value = getSetting(track, 'MaxContextOverride') || 0;
        maxContextInput.addEventListener('input', () => {
            const n = parseInt(maxContextInput.value, 10);
            narrative_guidance_moduleSettings[settingKey(track, 'MaxContextOverride')] = Number.isFinite(n) && n > 0 ? n : 0;
            saveSettings();
        });
    }

    const userPromptArea = trackEl(track, 'user_prompt_textarea');
    if (userPromptArea) {
        userPromptArea.value = getSetting(track, 'Prompt') || track.defaultUserPrompt;
        userPromptArea.addEventListener('input', () => {
            narrative_guidance_moduleSettings[settingKey(track, 'Prompt')] = userPromptArea.value;
            saveSettings();
        });
    }

    const genArea = trackEl(track, 'generation_prompt_textarea');
    if (genArea) {
        genArea.value = getSetting(track, 'GenerationPrompt') || track.defaultGenerationPrompt;
        genArea.addEventListener('input', () => {
            narrative_guidance_moduleSettings[settingKey(track, 'GenerationPrompt')] = genArea.value;
            saveSettings();
        });
    }

    const injectArea = trackEl(track, 'injection_prompt_textarea');
    if (injectArea) {
        injectArea.value = getSetting(track, 'InjectionPrompt') || track.defaultInjectionPrompt;
        injectArea.addEventListener('input', () => {
            const value = injectArea.value;
            narrative_guidance_moduleSettings[settingKey(track, 'InjectionPrompt')] = value;
            saveSettings();
            if (value.trim() && !value.includes('{{guidance}}')) {
                toast('Warning: Injection template lacks {{guidance}}; the AI won\'t see the guidance text.', 'warning');
            }
            reapplyInjection(track);
        });
    }

    trackEl(track, 'preview_btn')
        ?.addEventListener('click', () => showNGPromptPreview(track));

    const depthInput = trackEl(track, 'injection_depth');
    if (depthInput) {
        const configuredDepth = getSetting(track, 'InjectionDepth');
        depthInput.value = Number.isFinite(configuredDepth) ? configuredDepth : DEFAULT_NG_INJECTION_DEPTH;
        depthInput.addEventListener('input', () => {
            const n = parseInt(depthInput.value, 10);
            if (Number.isFinite(n) && n >= 0) {
                narrative_guidance_moduleSettings[settingKey(track, 'InjectionDepth')] = n;
                saveSettings();
                reapplyInjection(track);
            }
        });
    }

    const roleSelect = trackEl(track, 'injection_role');
    if (roleSelect) {
        roleSelect.value = getSetting(track, 'InjectionRole') || DEFAULT_NG_INJECTION_ROLE;
        roleSelect.addEventListener('change', () => {
            narrative_guidance_moduleSettings[settingKey(track, 'InjectionRole')] = roleSelect.value;
            saveSettings();
            reapplyInjection(track);
        });
    }

    const themesArea = trackEl(track, 'themes_textarea');
    if (themesArea) {
        themesArea.addEventListener('input', () => {
            const state = loadChatState(track);
            state.themes = themesArea.value;
            scheduleChatStateSave(track, state);
        });
    }

    const guidanceArea = trackEl(track, 'active_guidance_textarea');
    if (guidanceArea) {
        guidanceArea.addEventListener('input', () => {
            const state = loadChatState(track);
            state.guidance = guidanceArea.value;
            scheduleChatStateSave(track, state);
            reapplyInjection(track);
        });
    }

    trackEl(track, 'decrement_button')?.addEventListener('click', () => {
        const state = loadChatState(track);
        if (state.turnsRemaining > 0) {
            state.turnsRemaining -= 1;
            saveChatState(track, state);
            refreshRemainingDisplay(track, state.turnsRemaining);
        }
    });

    trackEl(track, 'reset_button')?.addEventListener('click', () => {
        const state = loadChatState(track);
        state.turnsRemaining = resolveTurnCount(track);
        saveChatState(track, state);
        refreshRemainingDisplay(track, state.turnsRemaining);
    });

    trackEl(track, 'regenerate_now')?.addEventListener('click', async () => {
        // While running, the regenerate button is the Stop affordance for an
        // active regen. Clicks during a `continue` job are ignored (that
        // button is disabled in the UI).
        if (runtime[track.id].regenInProgress) {
            if (runtime[track.id].activeAction === 'regen') {
                abortAllGenerations('ng-cancel');
                narrative_guidance_debug(`[${track.id}] Stop requested via regenerate button`);
            }
            return;
        }
        await regenGuidance(track, 'manual');
    });

    trackEl(track, 'continue_now')?.addEventListener('click', async () => {
        if (runtime[track.id].regenInProgress) {
            if (runtime[track.id].activeAction === 'continue') {
                abortAllGenerations('ng-cancel');
                narrative_guidance_debug(`[${track.id}] Stop requested via continue button`);
            }
            return;
        }
        await continueGuidance(track);
    });

    trackEl(track, 'retry_now')?.addEventListener('click', async () => {
        if (runtime[track.id].regenInProgress) return;
        if (runtime[track.id].lastSnapshot === null) {
            toast('Nothing to retry — no previous generation in this session.', 'warning');
            return;
        }
        const state = loadChatState(track);
        state.guidance = runtime[track.id].lastSnapshot;
        saveChatState(track, state);
        refreshPanelFromState(track);
        reapplyInjection(track);
        await regenGuidance(track, 'retry');
    });

    populateLoreBookPicker(track);
    refreshPanelFromState(track);
    refreshNGActionButtonStates(track);
}

function bindNarrativeGuidanceSettings(saveSettings) {
    narrative_guidance_saveSettingsCb = saveSettings;

    for (const track of NG_TRACK_LIST) {
        bindTrackControls(track, saveSettings);
    }

    // Shared (non per-track) controls.
    const debugCb = document.getElementById('ng_debug_mode');
    if (debugCb) {
        debugCb.checked = !!narrative_guidance_moduleSettings.narrativeGuidanceDebugMode;
        debugCb.addEventListener('change', () => {
            narrative_guidance_moduleSettings.narrativeGuidanceDebugMode = debugCb.checked;
            saveSettings();
        });
    }
}

// ─── Settings Migration ───

// Legacy single-track NG settings keys → short-term track keys. Run once on
// load so users keep their customized prompts, cadence and lore-book picks
// after the long/short split (existing guidance maps to short-term too).
const NG_LEGACY_SETTING_SUFFIXES = [
    'Enabled', 'AutoRegen', 'Prompt', 'GenerationPrompt', 'InjectionPrompt',
    'DefaultTurnCount', 'ResponseLength', 'MaxContextOverride',
    'InjectionDepth', 'InjectionRole', 'LoreBookNames',
];

/**
 * Migrate pre-split NG settings (and any `ng` tool-preset bundle) onto the
 * short-term track. Idempotent: keyed off the presence of legacy keys.
 *
 * @param {object} settings - Shared mutable settings reference.
 * @returns {boolean} `true` if anything changed (caller should save settings).
 */
function migrateNarrativeGuidanceSettings(settings) {
    let changed = false;

    for (const suffix of NG_LEGACY_SETTING_SUFFIXES) {
        const legacyKey = `narrativeGuidance${suffix}`;
        const shortKey = `narrativeGuidanceShort${suffix}`;
        // A legacy key only survives on a pre-split saved blob, where the
        // short-track key was never persisted (it's still at the merged-in
        // default). So copy unconditionally — the default would otherwise
        // mask the user's real value.
        if (settings[legacyKey] !== undefined) {
            settings[shortKey] = settings[legacyKey];
            delete settings[legacyKey];
            changed = true;
        }
    }

    // Carry named NG presets over to the short-term tool, renaming the bundled
    // field keys (the long-term tool starts with just its Default).
    const presets = settings.toolPresets;
    if (presets && typeof presets === 'object' && presets.ng && !presets['ng-short']) {
        const fieldRename = {
            narrativeGuidancePrompt: 'narrativeGuidanceShortPrompt',
            narrativeGuidanceGenerationPrompt: 'narrativeGuidanceShortGenerationPrompt',
            narrativeGuidanceInjectionPrompt: 'narrativeGuidanceShortInjectionPrompt',
        };
        const migrated = {};
        for (const [name, bundle] of Object.entries(presets.ng)) {
            if (!bundle || typeof bundle !== 'object') continue;
            const next = {};
            for (const [oldKey, value] of Object.entries(bundle)) {
                next[fieldRename[oldKey] || oldKey] = value;
            }
            migrated[name] = next;
        }
        presets['ng-short'] = migrated;
        delete presets.ng;
        if (settings.activeToolPreset && typeof settings.activeToolPreset === 'object') {
            if (settings.activeToolPreset.ng !== undefined) {
                settings.activeToolPreset['ng-short'] = settings.activeToolPreset.ng;
                delete settings.activeToolPreset.ng;
            }
        }
        changed = true;
    }

    return changed;
}

// ─── Init ───

/**
 * @param {object} options
 * @param {object} options.settings - Shared mutable settings reference.
 */
function initNarrativeGuidance({ settings }) {
    narrative_guidance_moduleSettings = settings;
    narrative_guidance_debug = createDebugLogger('NG', () => narrative_guidance_moduleSettings.narrativeGuidanceDebugMode);
    narrative_guidance_debug('Module initialized');
}

;// ./src/reformatting.js
/**
 * Reformatting module — normalizes the formatting of AI character messages
 * after they're generated, so they always match the prose style you want.
 *
 * Two interchangeable engines, picked in the settings panel:
 *   - Rules  — fast, free, deterministic transforms. Strip italic/bold
 *              asterisks, wrap narration (everything outside quoted dialogue)
 *              in asterisks, and/or collapse excess whitespace.
 *   - LLM    — send the message to the model with an editable prompt and let
 *              it rewrite the formatting. Routed through the shared
 *              silent-generation manager so the Stop button cancels it.
 *
 * Works in two modes (independently): automatic (reformat each AI reply as it
 * arrives) and manual (a per-message button injected into `.mes_buttons`).
 * Either way the original text is preserved as a swipe, so a reformat is
 * always non-destructive and reversible.
 */







// ─── Constants ───

// {{message}} is this extension's placeholder (substituted by
// applyTemplateMacros). If it's removed, the message is appended instead.
const DEFAULT_REFORMATTING_PROMPT =
    'Reformat the message below so its prose matches the target style. ' +
    'Keep the meaning, dialogue, and wording exactly the same — only change ' +
    'the formatting (markdown markers, emphasis, spacing). Do not add, remove, ' +
    'continue, or rewrite any content. Output only the reformatted message, ' +
    'with no commentary.\n\n' +
    'Target style: narration is plain text; spoken dialogue stays inside ' +
    'double quotes; no asterisks or other emphasis markers.\n\n' +
    'Message to reformat:\n{{message}}';

const DEFAULT_REFORMATTING_PREFILL = '';

const DEFAULT_REFORMATTING_RESPONSE_LENGTH = 800;

const REFORMATTING_SYSTEM_PROMPT =
    'You are a text-formatting assistant. You reformat a single message to ' +
    'match a requested style without changing its meaning, dialogue, or ' +
    'wording. Output only the reformatted message — no commentary, no preamble.';

// Per-swipe guard flag: set on the swipe_info entry of a reformatted swipe so
// the auto path never re-processes (or, for the wrap rule, double-wraps) text
// it already produced.
const REFORMAT_FLAG = 'sseReformatted';

// ─── Module State ───

let reformatting_moduleSettings = null;
let reformatting_debug = () => {};
let reformatting_observer = null;
let reformatting_listenersInstalled = false;
// Guards the auto path against reformatting a message we're mid-way through
// committing (the saveChat / re-render can re-enter the observer/events).
let busy = false;

// ─── Init ───

/**
 * @param {object} options
 * @param {object} options.settings - Shared mutable settings reference.
 */
function initReformatting({ settings }) {
    reformatting_moduleSettings = settings;
    reformatting_debug = createDebugLogger('REFORMAT', () => reformatting_moduleSettings.reformattingDebugMode);
    reformatting_debug('Module initialized');
}

// ─── Deterministic Rules ───

/** Remove every asterisk (markdown italic / bold emphasis marker). */
function stripAsterisks(text) {
    return text.replace(/\*/g, '');
}

/**
 * Wrap the narration core of a single line in asterisks, leaving any quoted
 * dialogue untouched. Surrounding whitespace is preserved so paragraph shape
 * and spacing around dialogue survive.
 */
function wrapNarrationLine(line) {
    if (!line.trim()) return line;

    // Match balanced quote pairs (straight or curly). Everything between/around
    // them is narration.
    const quoteRe = /["“][^"”]*["”]/g;
    let result = '';
    let lastIndex = 0;
    let match;
    while ((match = quoteRe.exec(line)) !== null) {
        result += wrapNarrationSpan(line.slice(lastIndex, match.index));
        result += match[0];
        lastIndex = quoteRe.lastIndex;
    }
    result += wrapNarrationSpan(line.slice(lastIndex));
    return result;
}

/** Wrap a single non-dialogue span's trimmed core in asterisks. */
function wrapNarrationSpan(span) {
    const lead = span.match(/^\s*/)[0];
    const trail = span.match(/\s*$/)[0];
    const core = span.slice(lead.length, span.length - trail.length);
    if (!core) return span;
    return `${lead}*${core}*${trail}`;
}

/** Apply the narration-wrapping rule line by line (preserving line breaks). */
function wrapNarration(text) {
    return text.split('\n').map(wrapNarrationLine).join('\n');
}

/** Collapse runs of 3+ blank lines to one, and trim trailing spaces per line. */
function collapseWhitespace(text) {
    return text
        .split('\n')
        .map(line => line.replace(/[ \t]+$/, ''))
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/**
 * Run the configured deterministic rules over `text`. Asterisk handling is a
 * single mutually-exclusive choice ('none' | 'strip' | 'wrap'); 'wrap' strips
 * existing asterisks first so the output is canonical regardless of the input
 * (and never doubles markers). Whitespace collapsing is independent and
 * applies on top of any asterisk mode.
 *
 * @param {string} text
 * @returns {string} The reformatted text (unchanged if no rules apply).
 */
function applyRulesReformat(text) {
    let out = text;
    const mode = reformatting_moduleSettings.reformattingAsteriskMode || 'strip';
    if (mode === 'strip') {
        out = stripAsterisks(out);
    } else if (mode === 'wrap') {
        out = wrapNarration(stripAsterisks(out));
    }
    if (reformatting_moduleSettings.reformattingCollapseWhitespace) {
        out = collapseWhitespace(out);
    }
    return out;
}

// ─── LLM Engine ───

function getReformattingResponseLength() {
    const n = reformatting_moduleSettings?.reformattingResponseLength;
    return (typeof n === 'number' && n > 0) ? n : DEFAULT_REFORMATTING_RESPONSE_LENGTH;
}

function getReformattingPromptTemplate() {
    return (reformatting_moduleSettings?.reformattingPrompt && reformatting_moduleSettings.reformattingPrompt.trim())
        ? reformatting_moduleSettings.reformattingPrompt
        : DEFAULT_REFORMATTING_PROMPT;
}

/**
 * Assemble the LLM reformatting user prompt. {{message}} is substituted in
 * place; if it's absent the message is appended so old templates still work.
 */
function composeReformattingPrompt(message) {
    const { text, used } = applyTemplateMacros(getReformattingPromptTemplate(), { message });
    if (!used.has('message')) {
        return `${text}\n\nMessage to reformat:\n${message}`;
    }
    return text;
}

/**
 * Reformat `text` via the LLM. Returns the cleaned result, or '' on empty.
 * Throws AbortError if cancelled (caller suppresses via isSilentGenerationAbort).
 */
async function runLLMReformat(text) {
    const prefill = (typeof reformatting_moduleSettings?.reformattingPrefill === 'string')
        ? reformatting_moduleSettings.reformattingPrefill
        : DEFAULT_REFORMATTING_PREFILL;
    const userPrompt = composeReformattingPrompt(text);

    reformatting_debug('LLM reformat — prompt length:', userPrompt.length, 'prefill:', prefill);

    const raw = await withSingleLineDisabled(() => streamingGenerate(
        {
            prompt: userPrompt,
            systemPrompt: REFORMATTING_SYSTEM_PROMPT,
            responseLength: getReformattingResponseLength(),
            ...(prefill ? { prefill } : {}),
        },
        null,
        { name: 'reformatting' },
    ));

    let cleaned = __WEBPACK_EXTERNAL_MODULE__reasoning_js_8d5a64cc_removeReasoningFromString__(raw).trim();
    if (prefill) cleaned = (prefill + stripPrefillEcho(cleaned, prefill));
    return cleaned.trim();
}

// ─── Message Application ───

/** True when the message at `index` is an AI character message we may reformat. */
function isReformattableMessage(msg) {
    return !!msg && !msg.is_user && !msg.is_system && typeof msg.mes === 'string' && msg.mes.trim().length > 0;
}

/**
 * Preserve the message's current text as a swipe and install `reformatted` as
 * a new active swipe. Mirrors ST's own swipe bookkeeping (see the
 * manage-chat-messages guide) so the swipe counter and arrows stay in sync.
 */
function commitReformat(index, msg, reformatted) {
    const context = getContext();

    if (!Array.isArray(msg.swipes) || msg.swipes.length === 0) {
        msg.swipes = [msg.mes];
        msg.swipe_id = 0;
        msg.swipe_info = [msg.swipe_info?.[0] || {}];
    }

    msg.swipes.push(reformatted);
    msg.swipe_info.push({ send_date: new Date().toISOString(), [REFORMAT_FLAG]: true });
    msg.swipe_id = msg.swipes.length - 1;
    msg.mes = reformatted;

    // Re-render the message body, then refresh swipe chevrons / counter.
    if (typeof context.updateMessageBlock === 'function') {
        context.updateMessageBlock(index, msg);
    }
    if (context.swipe?.refresh) {
        context.swipe.refresh(true);
    } else {
        const el = document.querySelector(`#chat .mes[mesid="${index}"]`);
        const counter = el?.querySelector('.swipes-counter');
        if (counter) counter.textContent = `${msg.swipe_id + 1}/${msg.swipes.length}`;
    }
}

/**
 * Reformat one message by chat index.
 *
 * @param {number} index
 * @param {{ manual?: boolean }} [opts] - `manual` clicks ignore the per-swipe
 *        guard and surface "no change" toasts; the auto path stays silent.
 * @returns {Promise<boolean>} `true` if the message was changed.
 */
async function reformatMessage(index, { manual = false } = {}) {
    if (busy) {
        reformatting_debug('reformatMessage — skipped (already running)');
        return false;
    }
    const context = getContext();
    const msg = context.chat?.[index];
    if (!isReformattableMessage(msg)) {
        if (manual) toast('Nothing to reformat in this message.', 'warning');
        return false;
    }

    // Per-swipe guard — auto never re-touches a swipe we already produced.
    if (!manual && msg.swipe_info?.[msg.swipe_id ?? 0]?.[REFORMAT_FLAG]) {
        reformatting_debug('reformatMessage — skipped (swipe already reformatted)');
        return false;
    }

    const original = msg.mes;
    const useLLM = reformatting_moduleSettings.reformattingEngine === 'llm';

    busy = true;
    let dismissToast = () => {};
    if (manual && useLLM) dismissToast = stickyToast('Reformatting message…', 'info');

    try {
        let reformatted;
        if (useLLM) {
            reformatted = await runLLMReformat(original);
        } else {
            reformatted = applyRulesReformat(original);
        }

        if (!reformatted) {
            if (manual) toast('Reformatting produced an empty result; left unchanged.', 'warning');
            return false;
        }
        if (reformatted === original) {
            reformatting_debug('reformatMessage — no change for index', index);
            if (manual) toast('Message already matches the target format.', 'info');
            return false;
        }

        commitReformat(index, msg, reformatted);
        await context.saveChat();
        reformatting_debug('reformatMessage — reformatted index', index, '| engine:', useLLM ? 'llm' : 'rules');
        if (manual) toast('Message reformatted. The original is kept as a swipe.', 'success');
        return true;
    } catch (err) {
        if (isSilentGenerationAbort(err)) {
            reformatting_debug('reformatMessage — cancelled for index', index);
        } else {
            console.error('Reformatting error:', err);
            if (manual) toast(`Reformatting failed: ${err.message}`, 'error');
        }
        return false;
    } finally {
        busy = false;
        dismissToast();
    }
}

// ─── Auto Path ───

/**
 * Reformat a freshly received AI message when automatic mode is on. Fired from
 * the combined MESSAGE_RECEIVED handler in index.js.
 */
async function onReformattingMessageReceived(messageIndex) {
    if (!reformatting_moduleSettings.reformattingEnabled || !reformatting_moduleSettings.reformattingAuto) return;
    const context = getContext();
    const idx = typeof messageIndex === 'number' ? messageIndex : context.chat.length - 1;
    await reformatMessage(idx, { manual: false });
}

// ─── Per-message Button ───

function makeReformatButton() {
    const btn = document.createElement('div');
    btn.className = 'mes_button sse-reformat-button fa-solid fa-text-slash interactable';
    btn.title = 'Reformat this message (keeps the original as a swipe)';
    btn.tabIndex = 0;
    btn.addEventListener('click', onReformatButtonClick);
    return btn;
}

function onReformatButtonClick(event) {
    const mesEl = event.currentTarget.closest('.mes');
    if (!mesEl) return;
    const mesId = mesEl.getAttribute('mesid');
    const index = mesId !== null ? parseInt(mesId, 10) : -1;
    if (index < 0 || Number.isNaN(index)) return;
    if (getContext().isGenerating) return;
    reformatMessage(index, { manual: true });
}

/** Inject the reformat button into a single `.mes` element if eligible. */
function injectButtonInto(mesEl) {
    if (!(mesEl instanceof HTMLElement)) return;
    if (!mesEl.matches?.('.mes')) return;
    // AI character messages only — skip the user's own and system messages.
    if (mesEl.getAttribute('is_user') === 'true') return;
    if (mesEl.getAttribute('is_system') === 'true') return;
    const buttons = mesEl.querySelector('.mes_buttons');
    if (!buttons) return;
    if (buttons.querySelector('.sse-reformat-button')) return;

    // Sit alongside the other quick buttons, before the hover-revealed group.
    const extra = buttons.querySelector('.extraMesButtons');
    const btn = makeReformatButton();
    if (extra) {
        buttons.insertBefore(btn, extra);
    } else {
        buttons.appendChild(btn);
    }
}

/** (Re)scan every message in the chat and inject buttons where missing. */
function rescanReformatButtons() {
    if (!reformatting_moduleSettings?.reformattingEnabled) return;
    document.querySelectorAll('#chat .mes').forEach(injectButtonInto);
}

/** Remove every injected reformat button (on disable). */
function removeAllReformatButtons() {
    document.querySelectorAll('.sse-reformat-button').forEach(el => el.remove());
}

/**
 * Watch the chat for messages appearing / re-rendering and keep each AI
 * message's reformat button present. ST re-renders message nodes on swipe,
 * edit, and load, which can drop injected DOM — the observer re-adds it.
 */
function startReformattingObserver() {
    if (reformatting_listenersInstalled) return;
    reformatting_listenersInstalled = true;

    const attachObserver = () => {
        if (reformatting_observer) return;
        const chat = document.getElementById('chat');
        if (!chat) return;
        reformatting_observer = new MutationObserver((mutations) => {
            if (!reformatting_moduleSettings?.reformattingEnabled) return;
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (!(node instanceof HTMLElement)) continue;
                    if (node.matches?.('.mes')) injectButtonInto(node);
                    node.querySelectorAll?.('.mes').forEach(injectButtonInto);
                }
            }
        });
        reformatting_observer.observe(chat, { childList: true, subtree: true });
        reformatting_debug('Chat observer attached');
    };

    attachObserver();
    rescanReformatButtons();
    reformatting_debug('Reformatting observer installed');
}

// ─── Settings Panel ───

function bindReformattingSettings(saveSettings) {
    const enabledCb = document.getElementById('reformatting_enabled');
    if (enabledCb) {
        enabledCb.checked = !!reformatting_moduleSettings.reformattingEnabled;
        enabledCb.addEventListener('change', () => {
            reformatting_moduleSettings.reformattingEnabled = enabledCb.checked;
            saveSettings();
            if (reformatting_moduleSettings.reformattingEnabled) {
                rescanReformatButtons();
            } else {
                removeAllReformatButtons();
            }
        });
    }

    const autoCb = document.getElementById('reformatting_auto');
    if (autoCb) {
        autoCb.checked = !!reformatting_moduleSettings.reformattingAuto;
        autoCb.addEventListener('change', () => {
            reformatting_moduleSettings.reformattingAuto = autoCb.checked;
            saveSettings();
        });
    }

    const engineSelect = document.getElementById('reformatting_engine');
    if (engineSelect) {
        engineSelect.value = reformatting_moduleSettings.reformattingEngine || 'rules';
        const syncEngineSections = () => {
            const isLLM = engineSelect.value === 'llm';
            document.getElementById('reformatting_rules_section')
                ?.classList.toggle('reformatting-hidden', isLLM);
            document.getElementById('reformatting_llm_section')
                ?.classList.toggle('reformatting-hidden', !isLLM);
        };
        engineSelect.addEventListener('change', () => {
            reformatting_moduleSettings.reformattingEngine = engineSelect.value;
            saveSettings();
            syncEngineSections();
        });
        syncEngineSections();
    }

    const asteriskMode = reformatting_moduleSettings.reformattingAsteriskMode || 'strip';
    document.querySelectorAll('input[name="reformatting_asterisk_mode"]').forEach((radio) => {
        radio.checked = radio.value === asteriskMode;
        radio.addEventListener('change', () => {
            if (!radio.checked) return;
            reformatting_moduleSettings.reformattingAsteriskMode = radio.value;
            saveSettings();
        });
    });

    const collapseCb = document.getElementById('reformatting_collapse_whitespace');
    if (collapseCb) {
        collapseCb.checked = !!reformatting_moduleSettings.reformattingCollapseWhitespace;
        collapseCb.addEventListener('change', () => {
            reformatting_moduleSettings.reformattingCollapseWhitespace = collapseCb.checked;
            saveSettings();
        });
    }

    const responseLengthInput = document.getElementById('reformatting_response_length');
    if (responseLengthInput) {
        responseLengthInput.value = reformatting_moduleSettings.reformattingResponseLength || DEFAULT_REFORMATTING_RESPONSE_LENGTH;
        responseLengthInput.addEventListener('input', () => {
            const n = parseInt(responseLengthInput.value, 10);
            if (Number.isFinite(n) && n > 0) {
                reformatting_moduleSettings.reformattingResponseLength = n;
                saveSettings();
            }
        });
    }

    const promptArea = document.getElementById('reformatting_prompt_textarea');
    if (promptArea) {
        promptArea.value = reformatting_moduleSettings.reformattingPrompt || DEFAULT_REFORMATTING_PROMPT;
        promptArea.addEventListener('input', () => {
            reformatting_moduleSettings.reformattingPrompt = promptArea.value;
            saveSettings();
        });
    }

    const prefillArea = document.getElementById('reformatting_prefill_textarea');
    if (prefillArea) {
        prefillArea.value = typeof reformatting_moduleSettings.reformattingPrefill === 'string'
            ? reformatting_moduleSettings.reformattingPrefill
            : DEFAULT_REFORMATTING_PREFILL;
        prefillArea.addEventListener('input', () => {
            reformatting_moduleSettings.reformattingPrefill = prefillArea.value;
            saveSettings();
        });
    }

    document.getElementById('reformatting_preview_btn')
        ?.addEventListener('click', showReformattingPromptPreview);

    const debugCb = document.getElementById('reformatting_debug_mode');
    if (debugCb) {
        debugCb.checked = !!reformatting_moduleSettings.reformattingDebugMode;
        debugCb.addEventListener('change', () => {
            reformatting_moduleSettings.reformattingDebugMode = debugCb.checked;
            saveSettings();
        });
    }
}

function showReformattingPromptPreview() {
    const sampleMessage =
        'CharacterName: *He danced around the room laughing hysterically.* '
        + '"What am I doing? I don\'t even know!"';
    const prefill = typeof reformatting_moduleSettings?.reformattingPrefill === 'string'
        ? reformatting_moduleSettings.reformattingPrefill
        : DEFAULT_REFORMATTING_PREFILL;
    showPromptPreview('Reformatting — LLM Prompt Preview', [
        { label: 'System Prompt (fixed)', text: REFORMATTING_SYSTEM_PROMPT },
        { label: 'User Prompt (template with a sample message)', text: composeReformattingPrompt(sampleMessage) },
        { label: 'Prefill (assistant prefix; kept at the start of the result)', text: prefill || '(none)' },
        {
            label: 'Note',
            text: 'The LLM engine is only used when Engine is set to "LLM". The Rules engine '
                + 'ignores this prompt entirely and applies the deterministic transforms instead.',
        },
    ]);
}

// ─── Slash Command ───

function registerReformattingSlashCommand() {
    __WEBPACK_EXTERNAL_MODULE__slash_commands_SlashCommandParser_js_42c8b851_SlashCommandParser__.addCommandObject(__WEBPACK_EXTERNAL_MODULE__slash_commands_SlashCommand_js_1b0d5616_SlashCommand__.fromProps({
        name: 'reformat',
        callback: async () => {
            if (!reformatting_moduleSettings.reformattingEnabled) return '';
            const context = getContext();
            const lastIndex = context.chat.length - 1;
            if (lastIndex < 0) {
                toast('No messages to reformat.', 'warning');
                return '';
            }
            await reformatMessage(lastIndex, { manual: true });
            return '';
        },
        unnamedArgumentList: [],
        aliases: [],
        helpString: 'Reformat the last message using the configured engine. The original is kept as a swipe.',
    }));
    reformatting_debug('Registered /reformat slash command');
}

;// ./src/prompt-templates.js
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
function migrateLegacyToolPresets(settings, tools) {
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
function setupToolPresets({ toolKey, label, containerId, fields, settings, saveSettings }) {
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

;// ./src/index.js
// Saint's Silly Extensions — Possession, Phrasing, and Assisted Character Creation
// Allows the user to "possess" a character, enrich messages with AI narration, and create characters with LLM assistance.













// ─── Constants ───

const EXTENSION_NAME = 'Saints-Silly-Extensions';

const defaultSettings = {
    possessionEnabled: true,
    possessionShowToast: true,
    possessionDebugMode: false,
    phrasingEnabled: true,
    phrasingDebugMode: false,
    phrasingInverseGuidance: false,
    phrasingPrompt: DEFAULT_PHRASING_PROMPT,
    phrasingInversePrompt: DEFAULT_PHRASING_INVERSE_PROMPT,
    accEnabled: true,
    accDebugMode: false,
    accPrompt: DEFAULT_ACC_PROMPT,
    accPrefill: DEFAULT_ACC_PREFILL,
    accResponseLength: DEFAULT_ACC_RESPONSE_LENGTH,
    accMaxContextOverride: 0,
    wiaEnabled: true,
    wiaDebugMode: false,
    wiaPrompt: DEFAULT_WIA_PROMPT,
    wiaPrefillTitled: DEFAULT_WIA_PREFILL_TITLED,
    wiaPrefillUntitled: DEFAULT_WIA_PREFILL_UNTITLED,
    wiaResponseLength: DEFAULT_WIA_RESPONSE_LENGTH,
    wiaMaxContextOverride: 0,
    narrativeGuidanceDebugMode: false,
    // Long-term track — the overarching arc on a slow refresh horizon.
    narrativeGuidanceLongEnabled: false,
    narrativeGuidanceLongAutoRegen: true,
    narrativeGuidanceLongPrompt: DEFAULT_NG_LONG_USER_PROMPT,
    narrativeGuidanceLongGenerationPrompt: DEFAULT_NG_LONG_GENERATION_PROMPT,
    narrativeGuidanceLongInjectionPrompt: DEFAULT_NG_LONG_INJECTION_PROMPT,
    narrativeGuidanceLongDefaultTurnCount: DEFAULT_NG_LONG_TURN_COUNT,
    narrativeGuidanceLongResponseLength: DEFAULT_NG_RESPONSE_LENGTH,
    narrativeGuidanceLongMaxContextOverride: 0,
    narrativeGuidanceLongInjectionDepth: DEFAULT_NG_INJECTION_DEPTH,
    narrativeGuidanceLongInjectionRole: DEFAULT_NG_INJECTION_ROLE,
    narrativeGuidanceLongLoreBookNames: [],
    // Short-term track — the immediate beats on a fast refresh horizon,
    // seeded with the active long-term arc.
    narrativeGuidanceShortEnabled: false,
    narrativeGuidanceShortAutoRegen: true,
    narrativeGuidanceShortPrompt: DEFAULT_NG_SHORT_USER_PROMPT,
    narrativeGuidanceShortGenerationPrompt: DEFAULT_NG_SHORT_GENERATION_PROMPT,
    narrativeGuidanceShortInjectionPrompt: DEFAULT_NG_SHORT_INJECTION_PROMPT,
    narrativeGuidanceShortDefaultTurnCount: DEFAULT_NG_SHORT_TURN_COUNT,
    narrativeGuidanceShortResponseLength: DEFAULT_NG_RESPONSE_LENGTH,
    narrativeGuidanceShortMaxContextOverride: 0,
    narrativeGuidanceShortInjectionDepth: DEFAULT_NG_INJECTION_DEPTH,
    narrativeGuidanceShortInjectionRole: DEFAULT_NG_INJECTION_ROLE,
    narrativeGuidanceShortLoreBookNames: [],
    reformattingEnabled: false,
    reformattingAuto: true,
    reformattingEngine: 'rules',
    reformattingDebugMode: false,
    reformattingAsteriskMode: 'strip',
    reformattingCollapseWhitespace: false,
    reformattingPrompt: DEFAULT_REFORMATTING_PROMPT,
    reformattingPrefill: DEFAULT_REFORMATTING_PREFILL,
    reformattingResponseLength: DEFAULT_REFORMATTING_RESPONSE_LENGTH,
    silentGenerationDebugMode: false,
    // toolPresets / activeToolPreset are intentionally absent here:
    // migrateLegacyToolPresets initializes them (and converts any legacy
    // per-field promptTemplates) on first load. Listing them as defaults
    // would make the merged settings look already-migrated.
};

// The pre-macro default templates, reconstructed from the current ones so
// the migration can recognize (and upgrade) untouched installs. Must mirror
// exactly how the {{context}} / {{brief}} / {{guidance}} placeholders were
// added to the defaults.
const LEGACY_DEFAULT_ACC_PROMPT = DEFAULT_ACC_PROMPT
    .replace('{{context}}', '')
    .replace('\n\nCharacter Brief:\n{{brief}}', '');
const LEGACY_DEFAULT_WIA_PROMPT = DEFAULT_WIA_PROMPT
    .replace('{{context}}', '')
    .replace('\n\nGuidance from the user:\n{{guidance}}', '');

// Registry of every preset-managed prompt field, grouped per tool. Drives
// both the legacy-template migration and the per-tool preset widgets.
const TOOL_PRESET_CONFIG = [
    {
        toolKey: 'phrasing',
        label: 'Phrasing',
        containerId: 'phrasing_presets',
        fields: [
            { key: 'phrasingPrompt', label: 'Prompt', textareaId: 'phrasing_prompt_textarea', defaultText: DEFAULT_PHRASING_PROMPT },
            { key: 'phrasingInversePrompt', label: 'Inverse Prompt', textareaId: 'phrasing_inverse_prompt_textarea', defaultText: DEFAULT_PHRASING_INVERSE_PROMPT },
        ],
    },
    {
        toolKey: 'acc',
        label: 'Character Creation',
        containerId: 'acc_presets',
        fields: [
            { key: 'accPrompt', label: 'Prompt', textareaId: 'acc_prompt_textarea', defaultText: DEFAULT_ACC_PROMPT, legacyDefaultText: LEGACY_DEFAULT_ACC_PROMPT },
            { key: 'accPrefill', label: 'Prefill', textareaId: 'acc_prefill_textarea', defaultText: DEFAULT_ACC_PREFILL },
        ],
    },
    {
        toolKey: 'wia',
        label: 'World Info Assist',
        containerId: 'wia_presets',
        fields: [
            { key: 'wiaPrompt', label: 'Prompt', textareaId: 'wia_prompt_textarea', defaultText: DEFAULT_WIA_PROMPT, legacyDefaultText: LEGACY_DEFAULT_WIA_PROMPT },
            { key: 'wiaPrefillTitled', label: 'Prefill Titled', textareaId: 'wia_prefill_titled_textarea', defaultText: DEFAULT_WIA_PREFILL_TITLED },
            { key: 'wiaPrefillUntitled', label: 'Prefill Untitled', textareaId: 'wia_prefill_untitled_textarea', defaultText: DEFAULT_WIA_PREFILL_UNTITLED },
        ],
    },
    {
        toolKey: 'ng-long',
        label: 'Narrative Guidance (Long-term)',
        containerId: 'ng_long_presets',
        fields: [
            { key: 'narrativeGuidanceLongPrompt', label: 'Instructions', textareaId: 'ng_long_user_prompt_textarea', defaultText: DEFAULT_NG_LONG_USER_PROMPT },
            { key: 'narrativeGuidanceLongGenerationPrompt', label: 'Prefill', textareaId: 'ng_long_generation_prompt_textarea', defaultText: DEFAULT_NG_LONG_GENERATION_PROMPT },
            { key: 'narrativeGuidanceLongInjectionPrompt', label: 'Injection', textareaId: 'ng_long_injection_prompt_textarea', defaultText: DEFAULT_NG_LONG_INJECTION_PROMPT },
        ],
    },
    {
        toolKey: 'ng-short',
        label: 'Narrative Guidance (Short-term)',
        containerId: 'ng_short_presets',
        fields: [
            { key: 'narrativeGuidanceShortPrompt', label: 'Instructions', textareaId: 'ng_short_user_prompt_textarea', defaultText: DEFAULT_NG_SHORT_USER_PROMPT },
            { key: 'narrativeGuidanceShortGenerationPrompt', label: 'Prefill', textareaId: 'ng_short_generation_prompt_textarea', defaultText: DEFAULT_NG_SHORT_GENERATION_PROMPT },
            { key: 'narrativeGuidanceShortInjectionPrompt', label: 'Injection', textareaId: 'ng_short_injection_prompt_textarea', defaultText: DEFAULT_NG_SHORT_INJECTION_PROMPT },
        ],
    },
    {
        toolKey: 'reformatting',
        label: 'Reformatting',
        containerId: 'reformatting_presets',
        fields: [
            { key: 'reformattingPrompt', label: 'Prompt', textareaId: 'reformatting_prompt_textarea', defaultText: DEFAULT_REFORMATTING_PROMPT },
            { key: 'reformattingPrefill', label: 'Prefill', textareaId: 'reformatting_prefill_textarea', defaultText: DEFAULT_REFORMATTING_PREFILL },
        ],
    },
];

// ─── State ───

let src_settings = { ...defaultSettings };

const SSEDebug = createDebugLogger('SAINTS-SILLY-EXTENSIONS', () => true);

// ─── Settings Persistence ───

function saveSettings() {
    saveExtensionSettings(EXTENSION_NAME, src_settings);
    SSEDebug('Settings saved');
}

function loadSettings() {
    src_settings = loadExtensionSettings(EXTENSION_NAME, defaultSettings);
    let migrated = false;
    if (migrateLegacyToolPresets(src_settings, TOOL_PRESET_CONFIG)) {
        SSEDebug('Migrated legacy prompt templates to tool presets');
        migrated = true;
    }
    // Fold pre-split, single-track Narrative Guidance settings (and any saved
    // NG presets) onto the new short-term track.
    if (migrateNarrativeGuidanceSettings(src_settings)) {
        SSEDebug('Migrated legacy Narrative Guidance settings to the short-term track');
        migrated = true;
    }
    if (migrated) saveSettings();
    SSEDebug('Settings loaded:', JSON.stringify(src_settings));
}

// ─── Settings Panel ───

function injectSettingsPanel() {
    const settingsContainer = document.getElementById('extensions_settings');
    if (!settingsContainer) return;

    settingsContainer.insertAdjacentHTML('beforeend', settings);

    bindPossessionSettings(saveSettings);
    bindPhrasingSettings(saveSettings);
    bindACCSettings(saveSettings);
    bindWIASettings(saveSettings);
    bindNarrativeGuidanceSettings(saveSettings);
    bindReformattingSettings(saveSettings);
    bindSilentGenerationSettings(saveSettings);

    // Preset widgets go last: the module bindings above must attach their
    // textarea → settings listeners first so preset loads persist correctly.
    for (const tool of TOOL_PRESET_CONFIG) {
        setupToolPresets({ ...tool, settings: src_settings, saveSettings });
    }
}

// ─── Merged Event Handlers ───

function src_onGenerationStarted(_type, _options, dryRun) {
    // SillyTavern's PromptManager fires GENERATION_STARTED for dry-run
    // probes (token counts, prompt composition) on page load, CHAT_LOADED,
    // CHARACTER_EDITED, etc. Those never emit ENDED/STOPPED, so reacting
    // to them strands any button we hide here.
    if (dryRun) return;
    onGenerationStarted();
    phrasing_onGenerationStarted();
    SSEDebug('Generation started');
}

function src_onGenerationEnded() {
    onGenerationEnded();
    phrasing_onGenerationEnded();
    showPossessionImpersonateButton();
    SSEDebug('Generation ended');
}

function onGenerationStopped() {
    // Same cleanup as ended
    onGenerationEnded();
    phrasing_onGenerationEnded();
    showPossessionImpersonateButton();
    SSEDebug('Generation stopped');
}

function onChatChanged() {
    loadPossessionState();
    syncAllPossessionUI();
    onNarrativeGuidanceChatChanged();
    rescanReformatButtons();
    SSEDebug('Chat changed, state reloaded');
}

function onGroupUpdatedHandler() {
    onGroupUpdated();
    SSEDebug('Group updated, UI rebuilt');
}

function onCharacterPageLoadedHandler() {
    onCharacterPageLoaded();
    assisted_character_creation_onCharacterPageLoaded();
}

function onGroupWrapperFinishedHandler() {
    onGroupWrapperFinished();
}

// ─── Initialization ───

jQuery(async () => {
    loadSettings();

    // Wire up cross-module dependencies via shared settings reference
    initPossession({
        settings: src_settings,
        phrasingApi: { isPhrasing: isPhrasing, handlePhrasingSeedReinjection: handlePhrasingSeedReinjection },
    });
    initPhrasing({
        settings: src_settings,
        possessionApi: { isPossessing: isPossessing, getPossessedCharName: getPossessedCharName, postPossessedMessage: postPossessedMessage },
    });
    initACC({ settings: src_settings, saveSettings });
    initWIA({ settings: src_settings });
    initNarrativeGuidance({ settings: src_settings });
    initReformatting({ settings: src_settings });

    loadPossessionState();
    injectSettingsPanel();

    // Watch the DOM for World Info entry forms and inject assist controls.
    startWIAObserver();

    // Watch the chat for messages and inject per-message reformat buttons.
    startReformattingObserver();

    // Possession UI
    attachContinueInterceptor();

    // Phrasing UI
    createInputAreaButton();
    createHamburgerMenuItem();

    // Wire up the global "stop button → abort silent generations" hook
    // before subscribing any per-module handlers, so a stop event always
    // unblocks in-flight silent jobs first.
    initSilentGeneration({ settings: src_settings });

    // Subscribe to events
    const { eventSource, eventTypes } = getContext();
    eventSource.on(eventTypes.CHAT_CHANGED, onChatChanged);
    eventSource.on(eventTypes.GROUP_UPDATED, onGroupUpdatedHandler);
    eventSource.on(eventTypes.CHARACTER_PAGE_LOADED, onCharacterPageLoadedHandler);
    eventSource.on(eventTypes.GENERATION_STARTED, src_onGenerationStarted);
    eventSource.on(eventTypes.GENERATION_ENDED, src_onGenerationEnded);
    eventSource.on(eventTypes.GENERATION_STOPPED, onGenerationStopped);
    eventSource.on(eventTypes.GROUP_WRAPPER_FINISHED, onGroupWrapperFinishedHandler);
    eventSource.on(eventTypes.MESSAGE_SENT, async (idx) => {
        onMessageSent(idx);
        await onNarrativeGuidanceMessageSent(idx);
    });
    eventSource.on(eventTypes.MESSAGE_RECEIVED, async (idx) => {
        onNarrativeGuidanceMessageReceived(idx);
        await onReformattingMessageReceived(idx);
    });

    // Slash commands
    registerPossessionSlashCommands();
    registerPhrasingSlashCommand();
    registerReformattingSlashCommand();

    // Initial state
    syncAllPossessionUI();
    applyPhrasingEnabledState();

    SSEDebug('Extension initialized');
});


//# sourceMappingURL=index.js.map