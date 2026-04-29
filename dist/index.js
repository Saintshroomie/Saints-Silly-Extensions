import { loadWorldInfo as __WEBPACK_EXTERNAL_MODULE__world_info_js_83198f57_loadWorldInfo__, world_names as __WEBPACK_EXTERNAL_MODULE__world_info_js_83198f57_world_names__ } from "../../../../world-info.js";
import { groups as __WEBPACK_EXTERNAL_MODULE__group_chats_js_678c16bd_groups__, selected_group as __WEBPACK_EXTERNAL_MODULE__group_chats_js_678c16bd_selected_group__ } from "../../../../group-chats.js";
import { SlashCommandParser as __WEBPACK_EXTERNAL_MODULE__slash_commands_SlashCommandParser_js_42c8b851_SlashCommandParser__ } from "../../../../slash-commands/SlashCommandParser.js";
import { SlashCommand as __WEBPACK_EXTERNAL_MODULE__slash_commands_SlashCommand_js_1b0d5616_SlashCommand__ } from "../../../../slash-commands/SlashCommand.js";
import { ARGUMENT_TYPE as __WEBPACK_EXTERNAL_MODULE__slash_commands_SlashCommandArgument_js_a42b9371_ARGUMENT_TYPE__, SlashCommandArgument as __WEBPACK_EXTERNAL_MODULE__slash_commands_SlashCommandArgument_js_a42b9371_SlashCommandArgument__ } from "../../../../slash-commands/SlashCommandArgument.js";
import { extension_prompt_roles as __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_extension_prompt_roles__, extension_prompt_types as __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_extension_prompt_types__, generateRaw as __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_generateRaw__, setExtensionPrompt as __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_setExtensionPrompt__, substituteParams as __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_substituteParams__ } from "../../../../../script.js";
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
   ACC MODAL STYLES
   ═══════════════════════════════════════════════════════════════════════════════ */

#acc_modal_overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 10000;
}

#acc_modal {
    position: fixed;
    top: 5vh;
    left: 50%;
    transform: translateX(-50%);
    background: var(--SmartThemeBlurTintColor, #1a1a2e);
    border: 1px solid var(--SmartThemeBorderColor, #555);
    border-radius: 8px;
    width: 90%;
    max-width: 700px;
    height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    z-index: 10001;
}

#acc_modal .acc-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--SmartThemeBorderColor, #555);
    flex-shrink: 0;
}

#acc_modal .acc-modal-header h3 {
    margin: 0;
    font-size: 1.1em;
}

.acc-close-btn {
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.15s ease;
    font-size: 1.2em;
    padding: 4px 8px;
}

.acc-close-btn:hover {
    opacity: 1;
}

#acc_modal .acc-modal-body {
    padding: 16px;
    overflow-y: auto !important;
    flex: 1 1 0%;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

.acc-brief-section {
    margin-bottom: 12px;
}

.acc-brief-section textarea {
    width: 100%;
    margin-top: 4px;
    resize: vertical;
}

.acc-generate-row {
    display: flex;
    justify-content: center;
    margin-bottom: 12px;
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

#acc_modal .acc-modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 12px 16px;
    border-top: 1px solid var(--SmartThemeBorderColor, #555);
    gap: 8px;
    flex-shrink: 0;
}

.acc-footer-right {
    display: flex;
    gap: 8px;
}

.acc-done-btn.acc-disabled {
    opacity: 0.3;
    pointer-events: none;
}

/* ACC Launch button in character creator */
#acc_launch_btn {
    display: flex;
    align-items: center;
    gap: 4px;
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
`, "",{"version":3,"sources":["webpack://./src/style.css"],"names":[],"mappings":"AAAA,+CAA+C;;AAE/C;;oFAEoF;;AAEpF,0CAA0C;;AAE1C;IACI,oBAAoB;IACpB,mBAAmB;IACnB,gBAAgB;IAChB,eAAe;AACnB;;AAEA;IACI,WAAW;IACX,YAAY;IACZ,kBAAkB;IAClB,oDAAoD;IACpD,uBAAuB;IACvB,eAAe;IACf,iFAAiF;IACjF,kBAAkB;IAClB,cAAc;AAClB;;AAEA;IACI,kDAAkD;AACtD;;AAEA;IACI,kDAAkD;IAClD,gDAAgD;IAChD,mEAAmE;AACvE;;AAEA,2CAA2C;;AAE3C;IACI,YAAY;IACZ,gDAAgD;IAChD,eAAe;IACf,kBAAkB;AACtB;;AAEA;IACI,UAAU;AACd;;AAEA;IACI,UAAU;IACV,2CAA2C;AAC/C;;AAEA;IACI,WAAW;IACX,kBAAkB;IAClB,YAAY;IACZ,SAAS;IACT,2BAA2B;IAC3B,UAAU;IACV,WAAW;IACX,kBAAkB;IAClB,sDAAsD;AAC1D;;AAEA,gDAAgD;;AAEhD;IACI,sEAAsE;AAC1E;;AAEA,2DAA2D;;AAE3D;IACI,aAAa;IACb,mBAAmB;IACnB,uBAAuB;IACvB,eAAe;IACf,YAAY;IACZ,8BAA8B;IAC9B,YAAY;AAChB;;AAEA;IACI,UAAU;AACd;;AAEA;IACI,WAAW;IACX,YAAY;IACZ,kBAAkB;IAClB,iBAAiB;IACjB,oDAAoD;IACpD,mCAAmC;AACvC;;AAEA;IACI,kDAAkD;AACtD;;AAEA,mDAAmD;;AAEnD;IACI,wBAAwB;AAC5B;;AAEA;;oFAEoF;;AAEpF,2CAA2C;;AAE3C;IACI,eAAe;IACf,aAAa;IACb,mBAAmB;IACnB,uBAAuB;IACvB,YAAY;IACZ,gDAAgD;IAChD,YAAY;IACZ,gBAAgB;AACpB;;AAEA;IACI,UAAU;IACV,2CAA2C;AAC/C;;AAEA,8BAA8B;;AAE9B;IACI,eAAe;AACnB;;AAEA;IACI,iBAAiB;IACjB,UAAU;IACV,kBAAkB;AACtB;;AAEA,yCAAyC;;AAEzC;IACI,wBAAwB;AAC5B;;AAEA;;oFAEoF;;AAEpF;IACI,aAAa;IACb,sBAAsB;IACtB,QAAQ;IACR,cAAc;AAClB;;AAEA;IACI,aAAa;IACb,mBAAmB;IACnB,QAAQ;AACZ;;AAEA;IACI,mBAAmB;IACnB,aAAa;IACb,mBAAmB;IACnB,QAAQ;AACZ;;AAEA;IACI,YAAY;IACZ,wDAAwD;IACxD,aAAa;AACjB;;AAEA;IACI,eAAe;IACf,kBAAkB;AACtB;;AAEA;IACI,WAAW;IACX,iBAAiB;IACjB,gBAAgB;IAChB,sBAAsB;IACtB,gBAAgB;IAChB,eAAe;AACnB;;AAEA;IACI,aAAa;IACb,QAAQ;IACR,eAAe;IACf,eAAe;AACnB;;AAEA;IACI,OAAO;IACP,YAAY;IACZ,kBAAkB;IAClB,mBAAmB;AACvB;;AAEA;;oFAEoF;;AAEpF;IACI,eAAe;IACf,MAAM;IACN,OAAO;IACP,QAAQ;IACR,SAAS;IACT,8BAA8B;IAC9B,cAAc;AAClB;;AAEA;IACI,eAAe;IACf,QAAQ;IACR,SAAS;IACT,2BAA2B;IAC3B,mDAAmD;IACnD,oDAAoD;IACpD,kBAAkB;IAClB,UAAU;IACV,gBAAgB;IAChB,YAAY;IACZ,aAAa;IACb,sBAAsB;IACtB,yCAAyC;IACzC,cAAc;AAClB;;AAEA;IACI,aAAa;IACb,mBAAmB;IACnB,8BAA8B;IAC9B,kBAAkB;IAClB,2DAA2D;IAC3D,cAAc;AAClB;;AAEA;IACI,SAAS;IACT,gBAAgB;AACpB;;AAEA;IACI,eAAe;IACf,YAAY;IACZ,8BAA8B;IAC9B,gBAAgB;IAChB,gBAAgB;AACpB;;AAEA;IACI,UAAU;AACd;;AAEA;IACI,aAAa;IACb,2BAA2B;IAC3B,YAAY;IACZ,aAAa;IACb,aAAa;IACb,sBAAsB;AAC1B;;AAEA;IACI,mBAAmB;AACvB;;AAEA;IACI,WAAW;IACX,eAAe;IACf,gBAAgB;AACpB;;AAEA;IACI,aAAa;IACb,uBAAuB;IACvB,mBAAmB;AACvB;;AAEA;IACI,2CAA2C;AAC/C;;AAEA;IACI,aAAa;IACb,mBAAmB;IACnB,QAAQ;IACR,iBAAiB;IACjB,mBAAmB;IACnB,4CAA4C;IAC5C,kBAAkB;IAClB,2CAA2C;IAC3C,gBAAgB;AACpB;;AAEA;IACI,aAAa;IACb,sBAAsB;IACtB,YAAY;IACZ,aAAa;AACjB;;AAEA;IACI,kBAAkB;AACtB;;AAEA;IACI,WAAW;IACX,YAAY;IACZ,iBAAiB;IACjB,gBAAgB;AACpB;;AAEA;IACI,YAAY;IACZ,mBAAmB;AACvB;;AAEA;IACI,wBAAwB;AAC5B;;AAEA;IACI,aAAa;IACb,mBAAmB;IACnB,yBAAyB;IACzB,kBAAkB;IAClB,wDAAwD;IACxD,QAAQ;IACR,cAAc;AAClB;;AAEA;IACI,aAAa;IACb,QAAQ;AACZ;;AAEA;IACI,YAAY;IACZ,oBAAoB;AACxB;;AAEA,2CAA2C;AAC3C;IACI,aAAa;IACb,mBAAmB;IACnB,QAAQ;AACZ;;AAEA;;oFAEoF;;AAEpF,mBAAmB;AACnB;IACI,eAAe;IACf,kBAAkB;AACtB;;AAEA;IACI,WAAW;IACX,iBAAiB;IACjB,gBAAgB;IAChB,sBAAsB;IACtB,gBAAgB;IAChB,eAAe;AACnB;;AAEA;IACI,aAAa;IACb,QAAQ;IACR,eAAe;IACf,eAAe;AACnB;;AAEA;IACI,OAAO;IACP,YAAY;IACZ,kBAAkB;IAClB,mBAAmB;AACvB;;AAEA,+DAA+D;AAC/D;IACI,aAAa;IACb,mBAAmB;IACnB,QAAQ;IACR,eAAe;IACf,mBAAmB;AACvB;;AAEA;IACI,oBAAoB;IACpB,mBAAmB;IACnB,QAAQ;IACR,eAAe;IACf,iBAAiB;IACjB,gBAAgB;AACpB;;AAEA;IACI,2CAA2C;AAC/C;;AAEA;IACI,gBAAgB;AACpB;;AAEA;IACI,2CAA2C;IAC3C,cAAc;IACd,oBAAoB;IACpB,mBAAmB;IACnB,gBAAgB;AACpB;;AAEA;IACI,wBAAwB;AAC5B;;AAEA,8BAA8B;AAC9B;IACI,oBAAoB;IACpB,mBAAmB;IACnB,QAAQ;IACR,iBAAiB;IACjB,eAAe;IACf,aAAa;IACb,iBAAiB;AACrB;;AAEA;IACI,UAAU;AACd;;AAEA,8CAA8C;AAC9C;IACI,kBAAkB;IAClB,iBAAiB;AACrB;;AAEA;IACI,eAAe;IACf,gBAAgB;IAChB,gBAAgB;IAChB,oDAAoD;IACpD,kBAAkB;IAClB,oBAAoB;IACpB,mBAAmB;IACnB,QAAQ;IACR,aAAa;AACjB;;AAEA;IACI,aAAa;AACjB;;AAEA;IACI,UAAU;AACd;;AAEA;IACI,kBAAkB;IAClB,SAAS;IACT,OAAO;IACP,eAAe;IACf,WAAW;IACX,gBAAgB;IAChB,iBAAiB;IACjB,gBAAgB;IAChB,mDAAmD;IACnD,oDAAoD;IACpD,kBAAkB;IAClB,gBAAgB;IAChB,aAAa;IACb,sBAAsB;IACtB,QAAQ;IACR,yCAAyC;AAC7C;;AAEA;IACI,aAAa;IACb,mBAAmB;IACnB,QAAQ;IACR,eAAe;AACnB;;AAEA;IACI,YAAY;IACZ,kBAAkB;AACtB;;AAEA,+CAA+C;;AAE/C;IACI,aAAa;IACb,mBAAmB;IACnB,SAAS;IACT,eAAe;IACf,mBAAmB;IACnB,iBAAiB;IACjB,oDAAoD;IACpD,kBAAkB;AACtB;;AAEA;IACI,aAAa;IACb,mBAAmB;IACnB,QAAQ;IACR,gBAAgB;IAChB,eAAe;AACnB;;AAEA;IACI,kBAAkB;IAClB,gBAAgB;AACpB;;AAEA;IACI,eAAe;IACf,gBAAgB;IAChB,gBAAgB;IAChB,oDAAoD;IACpD,kBAAkB;IAClB,oBAAoB;IACpB,mBAAmB;IACnB,QAAQ;IACR,aAAa;AACjB;;AAEA;IACI,aAAa;AACjB;;AAEA;IACI,UAAU;AACd;;AAEA;IACI,kBAAkB;IAClB,SAAS;IACT,OAAO;IACP,eAAe;IACf,cAAc;IACd,gBAAgB;IAChB,iBAAiB;IACjB,gBAAgB;IAChB,mDAAmD;IACnD,oDAAoD;IACpD,kBAAkB;IAClB,gBAAgB;IAChB,aAAa;IACb,sBAAsB;IACtB,QAAQ;IACR,yCAAyC;AAC7C;;AAEA;IACI,aAAa;IACb,mBAAmB;IACnB,QAAQ;IACR,eAAe;AACnB;;AAEA;IACI,YAAY;IACZ,kBAAkB;AACtB","sourcesContent":["/* Saint's Silly Extensions — Combined Styles */\n\n/* ═══════════════════════════════════════════════════════════════════════════════\n   POSSESSION STYLES\n   ═══════════════════════════════════════════════════════════════════════════════ */\n\n/* ── Group Chat: Radio Button Toggle ── */\n\n.possession_radio_wrapper {\n    display: inline-flex;\n    align-items: center;\n    margin-left: 4px;\n    cursor: pointer;\n}\n\n.possession_radio {\n    width: 16px;\n    height: 16px;\n    border-radius: 50%;\n    border: 2px solid var(--SmartThemeBorderColor, #555);\n    background: transparent;\n    cursor: pointer;\n    transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;\n    position: relative;\n    flex-shrink: 0;\n}\n\n.possession_radio:hover {\n    border-color: var(--SmartThemeQuoteColor, #e8a23a);\n}\n\n.possession_radio.possession_active {\n    border-color: var(--SmartThemeQuoteColor, #e8a23a);\n    background: var(--SmartThemeQuoteColor, #e8a23a);\n    box-shadow: inset 0 0 0 3px var(--SmartThemeBlurTintColor, #1a1a2e);\n}\n\n/* ── Solo Chat: Possess Toggle Button ── */\n\n#possession_solo_btn {\n    opacity: 0.7;\n    transition: opacity 0.15s ease, color 0.15s ease;\n    cursor: pointer;\n    position: relative;\n}\n\n#possession_solo_btn:hover {\n    opacity: 1;\n}\n\n#possession_solo_btn.possession_active {\n    opacity: 1;\n    color: var(--SmartThemeQuoteColor, #e8a23a);\n}\n\n#possession_solo_btn.possession_active::after {\n    content: '';\n    position: absolute;\n    bottom: -2px;\n    left: 50%;\n    transform: translateX(-50%);\n    width: 6px;\n    height: 6px;\n    border-radius: 50%;\n    background-color: var(--SmartThemeQuoteColor, #e8a23a);\n}\n\n/* ── Group member highlight when possessed ── */\n\n.group_member.possession_possessed {\n    border-left: 3px solid var(--SmartThemeQuoteColor, #e8a23a) !important;\n}\n\n/* ── Possession Impersonate Button (Character Avatar) ── */\n\n#possession_impersonate_btn {\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    cursor: pointer;\n    opacity: 0.7;\n    transition: opacity 0.15s ease;\n    padding: 2px;\n}\n\n#possession_impersonate_btn:hover {\n    opacity: 1;\n}\n\n.possession_impersonate_avatar {\n    width: 26px;\n    height: 26px;\n    border-radius: 50%;\n    object-fit: cover;\n    border: 1px solid var(--SmartThemeBorderColor, #555);\n    transition: border-color 0.15s ease;\n}\n\n#possession_impersonate_btn:hover .possession_impersonate_avatar {\n    border-color: var(--SmartThemeQuoteColor, #e8a23a);\n}\n\n/* ── Hide controls when extension is disabled ── */\n\n.possession_hidden {\n    display: none !important;\n}\n\n/* ═══════════════════════════════════════════════════════════════════════════════\n   PHRASING STYLES\n   ═══════════════════════════════════════════════════════════════════════════════ */\n\n/* ── Input Area Button (next to Send) ── */\n\n#phrasing_send_button {\n    cursor: pointer;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    opacity: 0.7;\n    transition: opacity 0.15s ease, color 0.15s ease;\n    padding: 3px;\n    font-size: 1.2em;\n}\n\n#phrasing_send_button:hover {\n    opacity: 1;\n    color: var(--SmartThemeQuoteColor, #e8a23a);\n}\n\n/* ── Hamburger Menu Item ── */\n\n#phrasing_menu_button {\n    cursor: pointer;\n}\n\n#phrasing_menu_button .fa-solid {\n    margin-right: 5px;\n    width: 1em;\n    text-align: center;\n}\n\n/* ── Hide buttons during generation ── */\n\n.phrasing-hidden {\n    display: none !important;\n}\n\n/* ═══════════════════════════════════════════════════════════════════════════════\n   SETTINGS PANEL STYLES\n   ═══════════════════════════════════════════════════════════════════════════════ */\n\n#saints_silly_settings .inline-drawer-content {\n    display: flex;\n    flex-direction: column;\n    gap: 8px;\n    padding: 8px 0;\n}\n\n#saints_silly_settings .checkbox_label {\n    display: flex;\n    align-items: center;\n    gap: 6px;\n}\n\n#saints_silly_settings .saints_section_header {\n    margin: 4px 0 2px 0;\n    display: flex;\n    align-items: center;\n    gap: 6px;\n}\n\n#saints_silly_settings .saints_divider {\n    border: none;\n    border-top: 1px solid var(--SmartThemeBorderColor, #555);\n    margin: 8px 0;\n}\n\n#saints_silly_settings .phrasing_prompt_section {\n    margin-top: 8px;\n    margin-bottom: 8px;\n}\n\n#saints_silly_settings #phrasing_prompt_textarea {\n    width: 100%;\n    min-height: 120px;\n    resize: vertical;\n    font-family: monospace;\n    font-size: 0.9em;\n    margin-top: 4px;\n}\n\n#saints_silly_settings .phrasing_buttons_row {\n    display: flex;\n    gap: 8px;\n    flex-wrap: wrap;\n    margin-top: 4px;\n}\n\n#saints_silly_settings .phrasing_buttons_row .menu_button {\n    flex: 1;\n    min-width: 0;\n    text-align: center;\n    white-space: nowrap;\n}\n\n/* ═══════════════════════════════════════════════════════════════════════════════\n   ACC MODAL STYLES\n   ═══════════════════════════════════════════════════════════════════════════════ */\n\n#acc_modal_overlay {\n    position: fixed;\n    top: 0;\n    left: 0;\n    right: 0;\n    bottom: 0;\n    background: rgba(0, 0, 0, 0.6);\n    z-index: 10000;\n}\n\n#acc_modal {\n    position: fixed;\n    top: 5vh;\n    left: 50%;\n    transform: translateX(-50%);\n    background: var(--SmartThemeBlurTintColor, #1a1a2e);\n    border: 1px solid var(--SmartThemeBorderColor, #555);\n    border-radius: 8px;\n    width: 90%;\n    max-width: 700px;\n    height: 90vh;\n    display: flex;\n    flex-direction: column;\n    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);\n    z-index: 10001;\n}\n\n#acc_modal .acc-modal-header {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    padding: 12px 16px;\n    border-bottom: 1px solid var(--SmartThemeBorderColor, #555);\n    flex-shrink: 0;\n}\n\n#acc_modal .acc-modal-header h3 {\n    margin: 0;\n    font-size: 1.1em;\n}\n\n.acc-close-btn {\n    cursor: pointer;\n    opacity: 0.7;\n    transition: opacity 0.15s ease;\n    font-size: 1.2em;\n    padding: 4px 8px;\n}\n\n.acc-close-btn:hover {\n    opacity: 1;\n}\n\n#acc_modal .acc-modal-body {\n    padding: 16px;\n    overflow-y: auto !important;\n    flex: 1 1 0%;\n    min-height: 0;\n    display: flex;\n    flex-direction: column;\n}\n\n.acc-brief-section {\n    margin-bottom: 12px;\n}\n\n.acc-brief-section textarea {\n    width: 100%;\n    margin-top: 4px;\n    resize: vertical;\n}\n\n.acc-generate-row {\n    display: flex;\n    justify-content: center;\n    margin-bottom: 12px;\n}\n\n.acc-generate-btn {\n    color: var(--SmartThemeQuoteColor, #e8a23a);\n}\n\n.acc-status-bar {\n    display: flex;\n    align-items: center;\n    gap: 8px;\n    padding: 8px 12px;\n    margin-bottom: 12px;\n    background: var(--SmartThemeBodyColor, #222);\n    border-radius: 4px;\n    color: var(--SmartThemeQuoteColor, #e8a23a);\n    font-size: 0.9em;\n}\n\n.acc-description-section {\n    display: flex;\n    flex-direction: column;\n    flex: 1 1 0%;\n    min-height: 0;\n}\n\n.acc-description-section label {\n    margin-bottom: 4px;\n}\n\n.acc-description-output {\n    width: 100%;\n    flex: 1 1 0%;\n    min-height: 200px;\n    resize: vertical;\n}\n\n.acc-description-output[disabled] {\n    opacity: 0.5;\n    cursor: not-allowed;\n}\n\n.acc-hidden {\n    display: none !important;\n}\n\n#acc_modal .acc-modal-footer {\n    display: flex;\n    align-items: center;\n    justify-content: flex-end;\n    padding: 12px 16px;\n    border-top: 1px solid var(--SmartThemeBorderColor, #555);\n    gap: 8px;\n    flex-shrink: 0;\n}\n\n.acc-footer-right {\n    display: flex;\n    gap: 8px;\n}\n\n.acc-done-btn.acc-disabled {\n    opacity: 0.3;\n    pointer-events: none;\n}\n\n/* ACC Launch button in character creator */\n#acc_launch_btn {\n    display: flex;\n    align-items: center;\n    gap: 4px;\n}\n\n/* ═══════════════════════════════════════════════════════════════════════════════\n   WORLD INFO ASSIST STYLES\n   ═══════════════════════════════════════════════════════════════════════════════ */\n\n/* Settings panel */\n#saints_silly_settings .wia_prompt_section {\n    margin-top: 8px;\n    margin-bottom: 8px;\n}\n\n#saints_silly_settings #wia_prompt_textarea {\n    width: 100%;\n    min-height: 160px;\n    resize: vertical;\n    font-family: monospace;\n    font-size: 0.9em;\n    margin-top: 4px;\n}\n\n#saints_silly_settings .wia_buttons_row {\n    display: flex;\n    gap: 8px;\n    flex-wrap: wrap;\n    margin-top: 4px;\n}\n\n#saints_silly_settings .wia_buttons_row .menu_button {\n    flex: 1;\n    min-width: 0;\n    text-align: center;\n    white-space: nowrap;\n}\n\n/* Per-entry assist controls injected into each WI entry form */\n.wia-controls {\n    display: flex;\n    align-items: center;\n    gap: 6px;\n    flex-wrap: wrap;\n    margin: 6px 0 6px 0;\n}\n\n.wia-controls .wia-btn {\n    display: inline-flex;\n    align-items: center;\n    gap: 4px;\n    cursor: pointer;\n    font-size: 0.85em;\n    padding: 4px 8px;\n}\n\n.wia-controls .wia-btn-assist {\n    color: var(--SmartThemeQuoteColor, #e8a23a);\n}\n\n.wia-controls .wia-btn-label {\n    font-weight: 500;\n}\n\n.wia-controls .wia-spinner {\n    color: var(--SmartThemeQuoteColor, #e8a23a);\n    font-size: 1em;\n    display: inline-flex;\n    align-items: center;\n    padding: 4px 6px;\n}\n\n.wia-controls .wia-hidden {\n    display: none !important;\n}\n\n/* Use Chat Context checkbox */\n.wia-controls .wia-context-toggle {\n    display: inline-flex;\n    align-items: center;\n    gap: 4px;\n    font-size: 0.85em;\n    cursor: pointer;\n    opacity: 0.85;\n    user-select: none;\n}\n\n.wia-controls .wia-context-toggle:hover {\n    opacity: 1;\n}\n\n/* Lore book multi-select picker (per-entry) */\n.wia-controls .wia-lorebook-picker {\n    position: relative;\n    font-size: 0.85em;\n}\n\n.wia-controls .wia-lorebook-picker > summary {\n    cursor: pointer;\n    list-style: none;\n    padding: 4px 8px;\n    border: 1px solid var(--SmartThemeBorderColor, #555);\n    border-radius: 4px;\n    display: inline-flex;\n    align-items: center;\n    gap: 4px;\n    opacity: 0.85;\n}\n\n.wia-controls .wia-lorebook-picker > summary::-webkit-details-marker {\n    display: none;\n}\n\n.wia-controls .wia-lorebook-picker > summary:hover {\n    opacity: 1;\n}\n\n.wia-controls .wia-lorebook-list {\n    position: absolute;\n    top: 100%;\n    left: 0;\n    margin-top: 2px;\n    z-index: 50;\n    min-width: 220px;\n    max-height: 240px;\n    overflow-y: auto;\n    background: var(--SmartThemeBlurTintColor, #1a1a2e);\n    border: 1px solid var(--SmartThemeBorderColor, #555);\n    border-radius: 4px;\n    padding: 6px 8px;\n    display: flex;\n    flex-direction: column;\n    gap: 4px;\n    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);\n}\n\n.wia-controls .wia-lorebook-item {\n    display: flex;\n    align-items: center;\n    gap: 6px;\n    cursor: pointer;\n}\n\n.wia-controls .wia-lorebook-empty {\n    opacity: 0.6;\n    font-style: italic;\n}\n\n/* ── ACC modal: context preamble controls ── */\n\n.acc-context-section {\n    display: flex;\n    align-items: center;\n    gap: 12px;\n    flex-wrap: wrap;\n    margin-bottom: 12px;\n    padding: 8px 10px;\n    border: 1px solid var(--SmartThemeBorderColor, #555);\n    border-radius: 4px;\n}\n\n.acc-context-section .checkbox_label {\n    display: flex;\n    align-items: center;\n    gap: 6px;\n    font-size: 0.9em;\n    cursor: pointer;\n}\n\n.acc-lorebook-picker {\n    position: relative;\n    font-size: 0.9em;\n}\n\n.acc-lorebook-picker > summary {\n    cursor: pointer;\n    list-style: none;\n    padding: 4px 8px;\n    border: 1px solid var(--SmartThemeBorderColor, #555);\n    border-radius: 4px;\n    display: inline-flex;\n    align-items: center;\n    gap: 4px;\n    opacity: 0.85;\n}\n\n.acc-lorebook-picker > summary::-webkit-details-marker {\n    display: none;\n}\n\n.acc-lorebook-picker > summary:hover {\n    opacity: 1;\n}\n\n.acc-lorebook-list {\n    position: absolute;\n    top: 100%;\n    left: 0;\n    margin-top: 2px;\n    z-index: 10002;\n    min-width: 240px;\n    max-height: 260px;\n    overflow-y: auto;\n    background: var(--SmartThemeBlurTintColor, #1a1a2e);\n    border: 1px solid var(--SmartThemeBorderColor, #555);\n    border-radius: 4px;\n    padding: 6px 8px;\n    display: flex;\n    flex-direction: column;\n    gap: 4px;\n    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);\n}\n\n.acc-lorebook-item {\n    display: flex;\n    align-items: center;\n    gap: 6px;\n    cursor: pointer;\n}\n\n.acc-lorebook-empty {\n    opacity: 0.6;\n    font-style: italic;\n}\n"],"sourceRoot":""}]);
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
var code = `<div id="saints_silly_settings" class="extension_settings"> <div class="inline-drawer"> <div class="inline-drawer-toggle inline-drawer-header"> <b>Saint's Silly Extensions</b> <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div> </div> <div class="inline-drawer-content"> <h4 class="saints_section_header"> <span class="fa-solid fa-ghost"></span> Possession </h4> <label class="checkbox_label"> <input id="possession_enabled" type="checkbox"/> <span>Enable Possession</span> </label> <label class="checkbox_label"> <input id="possession_show_toast" type="checkbox"/> <span>Show Toast on Possess/Unpossess</span> </label> <label class="checkbox_label"> <input id="possession_debug_mode" type="checkbox"/> <span>Possession Debug Mode</span> </label> <hr class="saints_divider"/> <h4 class="saints_section_header"> <span class="fa-solid fa-pen-fancy"></span> Phrasing! </h4> <label class="checkbox_label"> <input id="phrasing_enabled" type="checkbox" checked="checked"/> <span>Enable Phrasing!</span> </label> <label class="checkbox_label"> <input id="phrasing_debug_mode" type="checkbox"/> <span>Phrasing Debug Mode</span> </label> <div class="phrasing_prompt_section"> <label for="phrasing_prompt_textarea"><b>Prompt Template:</b></label> <textarea id="phrasing_prompt_textarea" class="text_pole" rows="8" placeholder="Enter your Phrasing! prompt template..."></textarea> </div> <div class="phrasing_buttons_row"> <div class="menu_button" id="phrasing_restore_default"> <span class="fa-solid fa-rotate-left"></span> Restore Default </div> <div class="menu_button" id="phrasing_save_to_chat"> <span class="fa-solid fa-floppy-disk"></span> Save to Chat </div> </div> <hr class="saints_divider"/> <h4 class="saints_section_header"> <span class="fa-solid fa-wand-magic-sparkles"></span> Assisted Character Creation </h4> <label class="checkbox_label"> <input id="acc_enabled" type="checkbox"/> <span>Enable Assisted Character Creation</span> </label> <label class="checkbox_label"> <input id="acc_debug_mode" type="checkbox"/> <span>ACC Debug Mode</span> </label> <hr class="saints_divider"/> <h4 class="saints_section_header"> <span class="fa-solid fa-book-atlas"></span> World Info Assist </h4> <label class="checkbox_label"> <input id="wia_enabled" type="checkbox"/> <span>Enable World Info Assist</span> </label> <label class="checkbox_label"> <input id="wia_debug_mode" type="checkbox"/> <span>WI Assist Debug Mode</span> </label> <div class="wia_prompt_section"> <label for="wia_prompt_textarea"><b>Prompt Template:</b></label> <textarea id="wia_prompt_textarea" class="text_pole" rows="10" placeholder="Enter your World Info Assist prompt template..."></textarea> </div> <div class="wia_buttons_row"> <div class="menu_button" id="wia_restore_default"> <span class="fa-solid fa-rotate-left"></span> Restore Default </div> </div> </div> </div> </div> `;
// Exports
/* harmony default export */ const settings = (code);
;// external "../../../../world-info.js"

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
    if (Array.isArray(__WEBPACK_EXTERNAL_MODULE__world_info_js_83198f57_world_names__) && __WEBPACK_EXTERNAL_MODULE__world_info_js_83198f57_world_names__.length) {
        return __WEBPACK_EXTERNAL_MODULE__world_info_js_83198f57_world_names__.slice();
    }
    // DOM fallback in case the host export is unavailable for some reason.
    const selector = document.getElementById('world_info');
    if (selector) {
        return Array.from(selector.options)
            .map(o => (o.textContent || '').trim())
            .filter(Boolean);
    }
    return [];
}

/**
 * Build a context preamble string suitable for prepending to a generation
 * prompt. Combines (optionally) the current chat / character / persona and
 * the active entries of any selected lore books.
 *
 * @param {object} opts
 * @param {boolean} [opts.includeChat=false] - Include character card, persona, and recent chat messages.
 * @param {string[]} [opts.loreBookNames=[]] - Names of lore books whose enabled entries to include.
 * @param {number}  [opts.chatMessageLimit=20] - Max recent chat messages to include.
 * @returns {Promise<string>} The composed preamble, or '' if nothing was included.
 */
async function buildContextPreamble({
    includeChat = false,
    loreBookNames = [],
    chatMessageLimit = 20,
} = {}) {
    const sections = [];

    if (includeChat) {
        const ctx = getContext();

        // Resolve the active character(s). In a group chat we walk every
        // enabled member; in a solo chat we just take the current character.
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

        // User persona
        const persona = ctx.powerUserSettings?.persona_description?.trim();
        if (persona) sections.push(`[User Persona]\n${persona}`);

        // Recent chat messages
        const chat = Array.isArray(ctx.chat) ? ctx.chat : [];
        if (chat.length) {
            const recent = chat.slice(-chatMessageLimit);
            const lines = recent.map(m => {
                const who = m.name || (m.is_user ? (ctx.name1 || 'User') : (ctx.name2 || 'Character'));
                const text = (m.mes || '').trim();
                return text ? `${who}: ${text}` : '';
            }).filter(Boolean);
            if (lines.length) sections.push(`[Recent Chat]\n${lines.join('\n')}`);
        }
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

    return sections.join('\n\n');
}

;// external "../../../../group-chats.js"

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
let generationGuard = false;

/** @type {{ settings: object, saveSettings: function }} */
let ctx = null;

/** @type {{ handlePhrasingSeedReinjection: function, isPhrasing: function }} */
let phrasingApi = null;

let debug = () => {};

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

function isGenerationGuarded() {
    return generationGuard;
}

// ─── Persistence ───

function savePossessionState() {
    const context = getContext();
    context.chatMetadata[POSSESSION_METADATA_KEY] = {
        name: possessedCharName,
        avatar: possessedCharAvatar,
    };
    context.saveMetadata();
    debug('Saved possession state:', possessedCharName, '| avatar:', possessedCharAvatar);
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
    debug('Loaded possession state:', possessedCharName, '| avatar:', possessedCharAvatar);
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
    if (__WEBPACK_EXTERNAL_MODULE__group_chats_js_678c16bd_selected_group__) {
        const group = __WEBPACK_EXTERNAL_MODULE__group_chats_js_678c16bd_groups__.find(g => g.id === __WEBPACK_EXTERNAL_MODULE__group_chats_js_678c16bd_selected_group__);
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
    if (!__WEBPACK_EXTERNAL_MODULE__group_chats_js_678c16bd_selected_group__ || !possessedCharName) return;
    const group = __WEBPACK_EXTERNAL_MODULE__group_chats_js_678c16bd_groups__.find(g => g.id === __WEBPACK_EXTERNAL_MODULE__group_chats_js_678c16bd_selected_group__);
    if (!group) return;
    const context = getContext();
    const isMember = group.members.some(avatar => {
        if (possessedCharAvatar) return avatar === possessedCharAvatar;
        const char = context.characters.find(c => c.avatar === avatar);
        return char && char.name === possessedCharName;
    });
    if (!isMember) {
        debug('Possessed character removed from group, clearing');
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
            if (__WEBPACK_EXTERNAL_MODULE__group_chats_js_678c16bd_selected_group__) {
                const group = __WEBPACK_EXTERNAL_MODULE__group_chats_js_678c16bd_groups__.find(g => g.id === __WEBPACK_EXTERNAL_MODULE__group_chats_js_678c16bd_selected_group__);
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
            debug('Now possessing:', charName);
        } else if (previous) {
            possession_toast('Possession cleared', 'info');
            debug('Possession cleared');
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

    if (__WEBPACK_EXTERNAL_MODULE__group_chats_js_678c16bd_selected_group__) {
        message.original_avatar = char.avatar;
        message.is_name = true;
    }

    context.chat.push(message);
    const messageIndex = context.chat.length - 1;

    if (typeof context.addOneMessage === 'function') {
        context.addOneMessage(message);
    }

    await context.saveChat();
    debug('Posted possessed message at index', messageIndex);
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

    debug('Converting user message to possessed character message at index', messageIndex);

    message.is_user = false;
    message.name = char.name;
    message.force_avatar = char.avatar ? `/characters/${char.avatar}` : undefined;
    message.extra = { ...(message.extra || {}), possession: true };

    if (__WEBPACK_EXTERNAL_MODULE__group_chats_js_678c16bd_selected_group__) {
        message.original_avatar = char.avatar;
        message.is_name = true;
    }

    debug('Converted message — name:', char.name);
}

// ─── Continue Interception ───

function handleContinueIntercept(event) {
    if (!ctx.settings.possessionEnabled || !isPossessing() || generationGuard) return;

    const textarea = document.getElementById('send_textarea');
    const text = textarea?.value?.trim();
    if (!text) return;

    event.stopImmediatePropagation();
    event.preventDefault();

    debug('Intercepted Continue with text:', text.substring(0, 50) + '...');
    executePossessedContinue(text);
}

async function executePossessedContinue(text) {
    const context = getContext();

    const textarea = document.getElementById('send_textarea');
    if (textarea) {
        textarea.value = '';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    await postPossessedMessage(text);
    await new Promise(resolve => requestAnimationFrame(resolve));

    if (context.executeSlashCommandsWithOptions) {
        await context.executeSlashCommandsWithOptions('/continue');
    } else {
        const continueBtn = document.getElementById('option_continue');
        if (continueBtn) continueBtn.click();
    }
}

function attachContinueInterceptor() {
    document.addEventListener('click', (event) => {
        if (!event.target.closest('#option_continue') && !event.target.closest('#mes_continue')) return;

        // Reinject phrasing seed if the last message was rephrased
        phrasingApi?.handlePhrasingSeedReinjection();

        handleContinueIntercept(event);
    }, { capture: true });
    debug('Attached continue interceptor');
}

// ─── UI: Group Radio Buttons ───

function injectGroupRadioButtons() {
    if (!__WEBPACK_EXTERNAL_MODULE__group_chats_js_678c16bd_selected_group__) return;
    if (!ctx.settings.possessionEnabled) return;

    const group = __WEBPACK_EXTERNAL_MODULE__group_chats_js_678c16bd_groups__.find(g => g.id === __WEBPACK_EXTERNAL_MODULE__group_chats_js_678c16bd_selected_group__);
    if (!group) return;

    const context = getContext();
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
    if (__WEBPACK_EXTERNAL_MODULE__group_chats_js_678c16bd_selected_group__) return;
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
    debug('Injected solo possess button');
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
    debug('Impersonate buttons hidden');
}

function showImpersonateButtons() {
    const menuBtn = document.getElementById('option_impersonate');
    const quickBtn = document.getElementById('mes_impersonate');
    if (menuBtn) menuBtn.classList.remove('possession_hidden');
    if (quickBtn) quickBtn.classList.remove('possession_hidden');
    debug('Impersonate buttons shown');
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
        if (context.isGenerating || generationGuard) return;

        debug('Possession impersonate clicked — triggering generation for', char.name);

        if (__WEBPACK_EXTERNAL_MODULE__group_chats_js_678c16bd_selected_group__) {
            const radios = document.querySelectorAll('.possession_radio');
            for (const radio of radios) {
                const radioMatch = (possessedCharAvatar && radio.dataset.charAvatar)
                    ? radio.dataset.charAvatar === possessedCharAvatar
                    : radio.dataset.charName === possessedCharName;
                if (radioMatch) {
                    const memberEntry = radio.closest('.group_member');
                    if (memberEntry) {
                        const speakBtn = memberEntry.querySelector('.right_menu_button[data-action="speak"]');
                        if (speakBtn) {
                            speakBtn.click();
                            return;
                        }
                    }
                    break;
                }
            }
            debug('Speak button not found, falling back to /trigger');
            if (context.executeSlashCommandsWithOptions) {
                await context.executeSlashCommandsWithOptions(`/trigger ${char.name}`);
            }
        } else {
            if (context.executeSlashCommandsWithOptions) {
                await context.executeSlashCommandsWithOptions('/trigger');
            } else {
                const sendBtn = document.getElementById('send_but');
                if (sendBtn) sendBtn.click();
            }
        }
    });

    const phrasingBtn = document.getElementById('phrasing_send_button');
    if (phrasingBtn) {
        sendForm.insertBefore(btn, phrasingBtn);
    } else {
        sendForm.appendChild(btn);
    }

    debug('Injected possession impersonate button for', char.name);
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

    if (__WEBPACK_EXTERNAL_MODULE__group_chats_js_678c16bd_selected_group__) {
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
    generationGuard = true;
    hidePossessionImpersonateButton();
}

function onGenerationEnded() {
    generationGuard = false;
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
    if (!__WEBPACK_EXTERNAL_MODULE__group_chats_js_678c16bd_selected_group__) {
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
            debug('debugMode toggled to', ctx.settings.possessionDebugMode);
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
                if (!__WEBPACK_EXTERNAL_MODULE__group_chats_js_678c16bd_selected_group__) {
                    const context = getContext();
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

            if (__WEBPACK_EXTERNAL_MODULE__group_chats_js_678c16bd_selected_group__) {
                const group = __WEBPACK_EXTERNAL_MODULE__group_chats_js_678c16bd_groups__.find(g => g.id === __WEBPACK_EXTERNAL_MODULE__group_chats_js_678c16bd_selected_group__);
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

    debug('Registered possession slash commands');
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
    debug = createDebugLogger('POSSESSION', () => settings.possessionDebugMode);
}

;// external "../../../../../script.js"

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
    const context = getContext();
    const chatPrompt = context.chatMetadata?.phrasing?.prompt;
    phrasing_debug('getActivePrompt — source:', chatPrompt ? 'chat metadata' : 'default');
    return chatPrompt || DEFAULT_PHRASING_PROMPT;
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

function assemblePrompt(seedText) {
    phrasing_debug('assemblePrompt — seed length:', seedText.length);
    let prompt = getActivePrompt();
    prompt = prompt.replace(/\{\{phrasingSeed\}\}/g, seedText);
    prompt = __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_substituteParams__(prompt);
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

            phrasing_debug('doPrimaryFlow — normal path: triggering impersonate');
            const impersonateBtn = document.getElementById('option_impersonate');
            if (impersonateBtn) {
                impersonateBtn.click();
            } else {
                phrasing_debug('doPrimaryFlow — FAILED: option_impersonate not found');
                return '';
            }

            await waitForGenerationEnd();

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

        const assembled = assemblePrompt(seedText);
        injectPhrasingPrompt(assembled);

        if (!message.extra) message.extra = {};
        message.extra[PHRASING_SEED_EXTRA_KEY] = assembled;
        message.extra.overswipe_behavior = 'regenerate';

        const lastSwipeIndex = message.swipes.length - 1;
        if (message.swipe_id !== lastSwipeIndex) {
            phrasing_debug('doSwipeMode — jumping to last swipe', lastSwipeIndex);
            message.swipe_id = lastSwipeIndex;
            message.mes = message.swipes[lastSwipeIndex];

            const messageEl = document.querySelector(`#chat .mes[mesid="${messageIndex}"]`);
            if (messageEl) {
                const textEl = messageEl.querySelector('.mes_text');
                if (textEl) {
                    if (typeof context.messageFormatting === 'function') {
                        textEl.innerHTML = context.messageFormatting(
                            message.mes, message.name, message.is_system, message.is_user, messageIndex,
                        );
                    } else {
                        textEl.textContent = message.mes;
                    }
                }
                const swipeCounter = messageEl.querySelector('.swipes-counter');
                if (swipeCounter) {
                    swipeCounter.textContent = `${message.swipe_id + 1}/${message.swipes.length}`;
                }
            }
        }

        const swipeRight = document.querySelector(`#chat .mes[mesid="${messageIndex}"] .swipe_right`);
        if (!swipeRight) {
            phrasing_debug('doSwipeMode — FAILED: swipe_right button not found');
            return '';
        }

        phrasing_debug('doSwipeMode — clicking swipe_right');
        swipeRight.click();

        const result = await waitForGenerationEnd();
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

// ─── Prompt Settings UI ───

function loadPromptTextarea() {
    const textarea = document.getElementById('phrasing_prompt_textarea');
    if (!textarea) return;
    textarea.value = getActivePrompt();
}

function onSaveToChat() {
    phrasing_debug('onSaveToChat — triggered');
    const textarea = document.getElementById('phrasing_prompt_textarea');
    if (!textarea) return;

    const promptText = textarea.value.trim();
    const context = getContext();

    if (promptText && !promptText.includes('{{phrasingSeed}}')) {
        toastr.warning('Warning: Prompt does not contain {{phrasingSeed}}. The AI won\'t receive your input text.', 'Phrasing!');
    }

    if (!context.chatMetadata.phrasing) {
        context.chatMetadata.phrasing = {};
    }

    context.chatMetadata.phrasing.prompt = promptText || null;
    context.saveMetadata();
    toastr.success('Phrasing! prompt saved to chat.', 'Phrasing!');
}

function onRestoreDefault() {
    phrasing_debug('onRestoreDefault — triggered');
    if (!confirm('Restore the default Phrasing! prompt? This will overwrite your current prompt.')) return;

    const textarea = document.getElementById('phrasing_prompt_textarea');
    if (textarea) {
        textarea.value = DEFAULT_PHRASING_PROMPT;
    }

    const context = getContext();
    if (context.chatMetadata.phrasing) {
        context.chatMetadata.phrasing.prompt = null;
    }
    context.saveMetadata();
    toastr.info('Phrasing! prompt restored to default.', 'Phrasing!');
}

// ─── Generation Lifecycle ───

function phrasing_onGenerationStarted() {
    hideAllPhrasingButtons();
}

function phrasing_onGenerationEnded() {
    if (phrasingActive) {
        clearPhrasingInjection();
        phrasingActive = false;
    }
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

    document.getElementById('phrasing_save_to_chat')?.addEventListener('click', onSaveToChat);
    document.getElementById('phrasing_restore_default')?.addEventListener('click', onRestoreDefault);
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
 * generates a complete description in one shot, can edit the result,
 * and clicks Done to copy it into SillyTavern's description field.
 */





// ─── Module State ───

let moduleSettings = null;
let assisted_character_creation_debug = () => {};

let isGenerating = false;
let abortRequested = false;

// ─── Init ───

/**
 * Initialize ACC module. Called once from index.js.
 * @param {object} opts - { settings }
 */
function initACC({ settings }) {
    moduleSettings = settings;
    assisted_character_creation_debug = createDebugLogger('ACC', () => moduleSettings.accDebugMode);
    assisted_character_creation_debug('Module initialized');
}

// ─── Character Page Integration ───

/**
 * Called on CHARACTER_PAGE_LOADED. Injects the ACC launch button.
 */
function assisted_character_creation_onCharacterPageLoaded() {
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
}

// ─── Modal ───

function openModal() {
    if (document.getElementById('acc_modal_overlay')) return;

    isGenerating = false;
    abortRequested = false;

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

    const updateLoreBookSummary = () => {
        const label = document.getElementById('acc_lorebook_summary_label');
        if (!label) return;
        const checked = document.querySelectorAll('#acc_lorebook_list .acc-lorebook-cb:checked').length;
        label.textContent = checked > 0 ? `Lore Books (${checked})` : 'Lore Books';
    };
    document.querySelectorAll('#acc_lorebook_list .acc-lorebook-cb').forEach(cb => {
        cb.addEventListener('change', updateLoreBookSummary);
    });

    assisted_character_creation_debug('Modal opened');
}

function closeModal() {
    if (isGenerating) {
        abortRequested = true;
        stopGeneration();
    }
    const overlay = document.getElementById('acc_modal_overlay');
    if (overlay) overlay.remove();
    isGenerating = false;
    assisted_character_creation_debug('Modal closed');
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
                <div class="acc-generate-row">
                    <div id="acc_generate_btn" class="menu_button interactable acc-generate-btn">
                        <span class="fa-solid fa-wand-magic-sparkles"></span> Generate Character Description
                    </div>
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

// ─── Generation ───

function readModalContextOptions() {
    const includeChat = !!document.getElementById('acc_use_chat_context')?.checked;
    const loreBookNames = Array.from(
        document.querySelectorAll('#acc_lorebook_list .acc-lorebook-cb:checked'),
    ).map(el => el.value);
    return { includeChat, loreBookNames };
}

async function handleGenerate() {
    if (isGenerating) {
        abortRequested = true;
        stopGeneration();
        return;
    }

    const brief = document.getElementById('acc_character_brief')?.value?.trim() || '';
    if (!brief) {
        toast('Please enter a Character Brief before generating.', 'warning');
        return;
    }

    isGenerating = true;
    abortRequested = false;
    setGeneratingUI(true);
    setStatusBar('Generating character description...');

    try {
        const ctxOptions = readModalContextOptions();
        const result = await generateDescription(brief, ctxOptions);
        if (abortRequested) {
            assisted_character_creation_debug('Generation aborted, discarding result');
            return;
        }
        const output = document.getElementById('acc_description_output');
        if (output) output.value = result;
        assisted_character_creation_debug('Generated description, length:', result.length);
    } catch (err) {
        if (!abortRequested) {
            console.error('ACC generation error:', err);
            toast(`Generation failed: ${err.message}`, 'error');
        }
    } finally {
        isGenerating = false;
        abortRequested = false;
        setGeneratingUI(false);
        setStatusBar(null);
    }
}

async function generateDescription(brief, ctxOptions) {
    let preambleBlock = '';
    if (ctxOptions && (ctxOptions.includeChat || (ctxOptions.loreBookNames && ctxOptions.loreBookNames.length))) {
        const preamble = await buildContextPreamble(ctxOptions);
        if (preamble) {
            preambleBlock = `Existing context to consider when generating (do not repeat verbatim):\n${preamble}\n\n`;
            assisted_character_creation_debug('Context preamble length:', preamble.length);
        }
    }

    const prompt = `${preambleBlock}Write a complete, detailed character description for use as a SillyTavern character card based on the following brief. Cover physical appearance, personality, background, mannerisms, motivations, and any other relevant details. Be vivid and specific.\n\nCharacter Brief:\n${brief}\n\nCharacter Description:`;
    const systemPrompt = 'You are a character creation assistant. Write a complete, well-organized character description in natural prose. Do not include meta-commentary, headers like "Character Description:", or extra formatting around the response.';

    assisted_character_creation_debug('Generating with brief length', brief.length);
    assisted_character_creation_debug('System prompt:', systemPrompt);
    assisted_character_creation_debug('Prompt:', prompt);

    const result = await __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_generateRaw__({ prompt, systemPrompt, responseLength: 2000 });
    return __WEBPACK_EXTERNAL_MODULE__reasoning_js_8d5a64cc_removeReasoningFromString__(result).trim();
}

function stopGeneration() {
    const stopBtn = document.getElementById('mes_stop');
    if (stopBtn) stopBtn.click();
    assisted_character_creation_debug('Stop generation triggered');
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

function setGeneratingUI(generating) {
    const generateBtn = document.getElementById('acc_generate_btn');
    const doneBtn = document.getElementById('acc_done_btn');
    const briefInput = document.getElementById('acc_character_brief');

    if (generating) {
        if (generateBtn) {
            generateBtn.innerHTML = '<span class="fa-solid fa-stop"></span> Stop';
        }
        doneBtn?.classList.add('acc-disabled');
        briefInput?.setAttribute('disabled', 'true');
    } else {
        if (generateBtn) {
            generateBtn.innerHTML = '<span class="fa-solid fa-wand-magic-sparkles"></span> Generate Character Description';
        }
        doneBtn?.classList.remove('acc-disabled');
        briefInput?.removeAttribute('disabled');
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

const DEFAULT_WIA_PROMPT = `[
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

let world_info_assist_moduleSettings = null;
let world_info_assist_debug = () => {};
let observer = null;

// Per-entry state, keyed by a stable id derived from the entry uid / DOM element
const entryStates = new Map(); // id -> { originalSeed, hasGenerated, generating }

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

// ─── DOM Observation / Injection ───

/**
 * Start watching the DOM for new World Info entry forms and inject
 * assist controls into each one.
 */
function startWIAObserver() {
    if (observer) return;

    observer = new MutationObserver((mutations) => {
        if (!world_info_assist_moduleSettings?.wiaEnabled) return;
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
    world_info_assist_debug('Observer started');
}

/**
 * Re-scan all currently visible WI forms (used after enable toggle).
 */
function rescanAllForms() {
    if (!world_info_assist_moduleSettings?.wiaEnabled) return;
    document.querySelectorAll('.world_entry_edit').forEach(injectControls);
}

/**
 * Remove all injected controls (used when the feature is disabled).
 */
function removeAllControls() {
    document.querySelectorAll('.wia-controls').forEach(el => el.remove());
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

    populateLoreBookPicker(controls);

    world_info_assist_debug('Injected controls for entry', id);
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

        const promptTemplate = (world_info_assist_moduleSettings.wiaPrompt && world_info_assist_moduleSettings.wiaPrompt.trim())
            ? world_info_assist_moduleSettings.wiaPrompt
            : DEFAULT_WIA_PROMPT;

        // Optional preamble assembled from chat / character / lore books.
        const controls = formEl.querySelector('.wia-controls');
        const ctxOptions = readContextOptions(controls);
        let preamble = '';
        if (ctxOptions.includeChat || ctxOptions.loreBookNames.length) {
            preamble = await buildContextPreamble(ctxOptions);
            world_info_assist_debug('Context preamble length:', preamble.length, 'options:', ctxOptions);
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
                    ? `Respond on one line with only the value for "${title}":`
                    : 'No title was provided — invent a fitting subject name.');
            prefill = title ? `[${title}- ` : '[';
        }

        const systemPrompt =
            'You are a world-building assistant. Output only the requested ' +
            'World Lore Description in the exact bracketed format described. ' +
            'No commentary, no preamble, no explanations.';

        world_info_assist_debug('System prompt:', systemPrompt);
        world_info_assist_debug('User prompt:', userPrompt);
        world_info_assist_debug('Prefill:', prefill);

        const raw = await __WEBPACK_EXTERNAL_MODULE__script_js_588e7203_generateRaw__({
            prompt: userPrompt,
            systemPrompt,
            responseLength: 600,
            ...(prefill ? { prefill } : {}),
        });

        let cleaned = __WEBPACK_EXTERNAL_MODULE__reasoning_js_8d5a64cc_removeReasoningFromString__(raw).trim();

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
        world_info_assist_debug('Generation complete for', id);
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
function bindWIASettings(saveSettings) {
    const enabledCb = document.getElementById('wia_enabled');
    const debugCb = document.getElementById('wia_debug_mode');
    const promptArea = document.getElementById('wia_prompt_textarea');
    const restoreBtn = document.getElementById('wia_restore_default');

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
    if (promptArea) {
        promptArea.value = world_info_assist_moduleSettings.wiaPrompt || DEFAULT_WIA_PROMPT;
        promptArea.addEventListener('input', () => {
            world_info_assist_moduleSettings.wiaPrompt = promptArea.value;
            saveSettings();
        });
    }
    if (restoreBtn) {
        restoreBtn.addEventListener('click', () => {
            world_info_assist_moduleSettings.wiaPrompt = DEFAULT_WIA_PROMPT;
            if (promptArea) promptArea.value = DEFAULT_WIA_PROMPT;
            saveSettings();
            toast('Default World Info assist prompt restored.', 'success');
        });
    }
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
    accEnabled: true,
    accDebugMode: false,
    wiaEnabled: true,
    wiaDebugMode: false,
    wiaPrompt: DEFAULT_WIA_PROMPT,
};

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
}

// ─── Merged Event Handlers ───

function src_onGenerationStarted() {
    onGenerationStarted();
    phrasing_onGenerationStarted();
    SSEDebug('Generation started, guard ON');
}

function src_onGenerationEnded() {
    onGenerationEnded();
    phrasing_onGenerationEnded();
    showPossessionImpersonateButton();
    SSEDebug('Generation ended, guard OFF');
}

function onGenerationStopped() {
    // Same cleanup as ended
    onGenerationEnded();
    phrasing_onGenerationEnded();
    showPossessionImpersonateButton();
    SSEDebug('Generation stopped, guard OFF');
}

function onChatChanged() {
    loadPossessionState();
    syncAllPossessionUI();
    loadPromptTextarea();
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
    initACC({ settings: src_settings });
    initWIA({ settings: src_settings });

    loadPossessionState();
    injectSettingsPanel();

    // Watch the DOM for World Info entry forms and inject assist controls.
    startWIAObserver();

    // Possession UI
    attachContinueInterceptor();

    // Phrasing UI
    createInputAreaButton();
    createHamburgerMenuItem();

    // Subscribe to events
    const { eventSource, eventTypes } = getContext();
    eventSource.on(eventTypes.CHAT_CHANGED, onChatChanged);
    eventSource.on(eventTypes.GROUP_UPDATED, onGroupUpdatedHandler);
    eventSource.on(eventTypes.CHARACTER_PAGE_LOADED, onCharacterPageLoadedHandler);
    eventSource.on(eventTypes.GENERATION_STARTED, src_onGenerationStarted);
    eventSource.on(eventTypes.GENERATION_ENDED, src_onGenerationEnded);
    eventSource.on(eventTypes.GENERATION_STOPPED, onGenerationStopped);
    eventSource.on(eventTypes.GROUP_WRAPPER_FINISHED, onGroupWrapperFinishedHandler);
    eventSource.on(eventTypes.MESSAGE_SENT, onMessageSent);

    // Slash commands
    registerPossessionSlashCommands();
    registerPhrasingSlashCommand();

    // Initial state
    syncAllPossessionUI();
    applyPhrasingEnabledState();
    loadPromptTextarea();

    SSEDebug('Extension initialized');
});


//# sourceMappingURL=index.js.map