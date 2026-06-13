/**
 * Phrase Ban module — scans AI character messages against a user-maintained
 * regex ban list and, on a match, has the model rewrite the message without
 * the offending phrasing.
 *
 * Detection is regex-over-text, so it necessarily runs after generation (no
 * backend supports regex banning at the sampler level). The rewrite itself is
 * delegated to the Phrasing! engine (`rewriteMessageWithTemplate`): the
 * matched phrases are injected into a rewrite prompt and the message is
 * regenerated as a new swipe, so the original is always preserved and the
 * whole flow stays reversible.
 *
 * Runs automatically on MESSAGE_RECEIVED (detached from ST's emit chain — see
 * onPhraseBanMessageReceived) and manually via `/phraseban`. A rewrite that
 * still matches is retried up to Max Rewrite Attempts; 0 attempts means
 * detect-and-notify only.
 *
 * Optionally (Proactive mode), every distinct phrase the scan detects is added
 * to a per-chat learned list and a "don't reuse these phrases" instruction is
 * persistently injected before every AI turn — so future replies avoid the
 * tics up front instead of relying on after-the-fact rewrites. The list lives
 * under `chatMetadata.phraseBan.bannedPhrases`; when Proactive is off nothing
 * is learned or injected and the module behaves exactly as the reactive path.
 */

import { SlashCommandParser } from '../../../../slash-commands/SlashCommandParser.js';
import { SlashCommand } from '../../../../slash-commands/SlashCommand.js';
import { is_group_generating } from '../../../../group-chats.js';
import {
    setExtensionPrompt,
    extension_prompt_types,
    extension_prompt_roles,
    substituteParamsExtended,
} from '../../../../../script.js';
import {
    getContext,
    createDebugLogger,
    toast,
    stickyToast,
    showPromptPreview,
} from './utils.js';

// ─── Constants ───

// {{phrasingSeed}} and {{bannedPhrases}} are substituted by the Phrasing
// engine when the rewrite is injected (ST's own macros also resolve).
export const DEFAULT_PHRASE_BAN_PROMPT = `[Rewrite the following message. Preserve its meaning, intent, tone, and any dialogue, but you MUST NOT reuse any of the banned phrases listed below — nor close paraphrases of them. Rework those passages with fresh wording and imagery instead. Do not continue the scene beyond what the original message describes.

Banned phrases found in the message:
{{bannedPhrases}}

Message to rewrite:
{{phrasingSeed}}]`;

export const DEFAULT_PHRASE_BAN_MAX_RETRIES = 2;

// Proactive injection: the persistent "don't reuse these phrases" instruction
// added before every AI turn while the per-chat learned list is non-empty.
// {{bannedPhrases}} is the formatted learned-phrase list (ST's own macros also
// resolve via substituteParamsExtended).
export const DEFAULT_PHRASE_BAN_PROACTIVE_PROMPT = `[Do not reuse any of the following phrases — nor close paraphrases of them — in your reply. They have already been used in this chat and must not appear again; reach for fresh wording and imagery instead:
{{bannedPhrases}}]`;

export const DEFAULT_PHRASE_BAN_INJECTION_DEPTH = 0;
export const DEFAULT_PHRASE_BAN_INJECTION_ROLE = 'system';

// Per-swipe guard flag: set on the swipe_info entry of every swipe the auto
// path has scanned, so re-renders and swipe navigation never re-trigger it.
const CHECK_FLAG = 'ssePhraseBanChecked';

// Per-chat metadata key holding the learned ban list ({ bannedPhrases: [] }).
const PHRASE_BAN_METADATA_KEY = 'phraseBan';

// Stable setExtensionPrompt key for the proactive injection.
const PHRASE_BAN_INJECTION_KEY = 'phrase_ban_proactive';

// getContext().mainApi value for the Text Completion backends — the only
// family that exposes a sampler-level (hard) banned-strings ban. Chat
// Completion APIs have no equivalent, so the hard ban is a no-op there.
const TEXTGEN_API = 'textgenerationwebui';

// Caps on the learned list: keep the most recent N phrases, each truncated so
// a runaway match never bloats the injected prompt.
const MAX_LEARNED_PHRASES = 50;
const MAX_LEARNED_PHRASE_LENGTH = 120;

// Cap on how many distinct matched phrases are listed in the rewrite prompt.
const MAX_LISTED_MATCHES = 12;

// Polling cadence / settle delay while waiting for the main generation
// (including a full group round) to finish before triggering a rewrite.
const POLL_INTERVAL_MS = 500;
const SETTLE_DELAY_MS = 500;
const SETTLE_TIMEOUT_MS = 5 * 60 * 1000;

// ─── Module State ───

let moduleSettings = null;
/** @type {{ rewriteMessageWithTemplate: function }} */
let phrasingApi = null;
let debug = () => {};
// One scan-and-rewrite cycle at a time; the rewrite's own MESSAGE_RECEIVED
// re-enters the auto path and must not start a second cycle.
let busy = false;

// ─── Init ───

/**
 * @param {object} options
 * @param {object} options.settings     - Shared mutable settings reference.
 * @param {object} options.phrasingApi  - { rewriteMessageWithTemplate(index, template, extraMacros) }
 */
export function initPhraseBan({ settings, phrasingApi: pApi }) {
    moduleSettings = settings;
    phrasingApi = pApi;
    debug = createDebugLogger('PHRASE-BAN', () => moduleSettings.phraseBanDebugMode);
    debug('Module initialized');
}

// ─── Pattern Compilation ───

/**
 * Compile the pattern list (one JS regex per line) into RegExp objects.
 * Plain lines are case-insensitive; `/pattern/flags` lines use their own
 * flags. The global flag is always added (matchAll requires it). Blank lines
 * and `#` comments are skipped; invalid patterns are collected, not thrown.
 *
 * @param {string} rawText
 * @returns {{ patterns: RegExp[], invalid: string[] }}
 */
function compilePatterns(rawText) {
    const patterns = [];
    const invalid = [];
    for (const line of String(rawText || '').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const slashForm = trimmed.match(/^\/(.*)\/([dgimsuvy]*)$/);
        const source = slashForm ? slashForm[1] : trimmed;
        let flags = slashForm ? slashForm[2] : 'i';
        if (!flags.includes('g')) flags += 'g';
        try {
            if (!source) throw new Error('empty pattern');
            patterns.push(new RegExp(source, flags));
        } catch (err) {
            invalid.push(trimmed);
        }
    }
    return { patterns, invalid };
}

/**
 * Collect the distinct substrings of `text` matched by any pattern, capped
 * at MAX_LISTED_MATCHES.
 */
function findBannedMatches(text, patterns) {
    const matches = [];
    const seen = new Set();
    for (const re of patterns) {
        re.lastIndex = 0;
        for (const m of text.matchAll(re)) {
            const hit = (m[0] || '').trim();
            if (!hit) continue;
            const key = hit.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            matches.push(hit);
            if (matches.length >= MAX_LISTED_MATCHES) return matches;
        }
    }
    return matches;
}

function formatMatchList(matches) {
    return matches.map(m => `- "${m}"`).join('\n');
}

function truncateMatch(match, maxLength = 60) {
    return match.length > maxLength ? `${match.slice(0, maxLength)}…` : match;
}

// ─── Message Helpers ───

/** True when the message is an AI character message we may scan. */
function isScannableMessage(msg) {
    return !!msg && !msg.is_user && !msg.is_system && typeof msg.mes === 'string' && msg.mes.trim().length > 0;
}

function isSwipeChecked(msg) {
    return !!msg.swipe_info?.[msg.swipe_id ?? 0]?.[CHECK_FLAG];
}

function markSwipeChecked(msg) {
    const swipeId = msg.swipe_id ?? 0;
    if (!Array.isArray(msg.swipe_info)) msg.swipe_info = [];
    if (!msg.swipe_info[swipeId]) msg.swipe_info[swipeId] = {};
    msg.swipe_info[swipeId][CHECK_FLAG] = true;
}

function getMaxRetries() {
    const n = moduleSettings?.phraseBanMaxRetries;
    return (typeof n === 'number' && Number.isFinite(n) && n >= 0) ? n : DEFAULT_PHRASE_BAN_MAX_RETRIES;
}

function getPromptTemplate() {
    return (moduleSettings?.phraseBanPrompt && moduleSettings.phraseBanPrompt.trim())
        ? moduleSettings.phraseBanPrompt
        : DEFAULT_PHRASE_BAN_PROMPT;
}

function getProactivePromptTemplate() {
    return (moduleSettings?.phraseBanProactivePrompt && moduleSettings.phraseBanProactivePrompt.trim())
        ? moduleSettings.phraseBanProactivePrompt
        : DEFAULT_PHRASE_BAN_PROACTIVE_PROMPT;
}

// ─── Proactive: Per-chat Learned List ───

// Debounce for the manual edit textarea: writes go through to chatMetadata
// immediately (so a chat switch never races a pending save) and only the
// saveMetadata flush is debounced — mirroring Narrative Guidance.
let learnedSaveTimer = null;

/** Read the per-chat learned ban list (pure read — never mutates metadata). */
function loadLearnedPhrases() {
    const list = getContext().chatMetadata?.[PHRASE_BAN_METADATA_KEY]?.bannedPhrases;
    return Array.isArray(list) ? list.filter(p => typeof p === 'string' && p.trim()) : [];
}

/**
 * Normalize a raw phrase list: trim, drop blanks, truncate each phrase so a
 * runaway entry can't bloat the injection, de-duplicate case-insensitively
 * (keeping first occurrence), and cap to the most recent MAX_LEARNED_PHRASES.
 */
function normalizeLearnedList(phrases) {
    const seen = new Set();
    const out = [];
    for (const raw of phrases) {
        const phrase = truncateMatch((raw || '').trim(), MAX_LEARNED_PHRASE_LENGTH);
        if (!phrase) continue;
        const key = phrase.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(phrase);
    }
    return out.slice(-MAX_LEARNED_PHRASES);
}

/** Write the normalized list through to chatMetadata (removing the key when empty). */
function storeLearnedPhrases(context, normalized) {
    if (normalized.length) {
        context.chatMetadata[PHRASE_BAN_METADATA_KEY] = { bannedPhrases: normalized };
    } else if (context.chatMetadata?.[PHRASE_BAN_METADATA_KEY]) {
        delete context.chatMetadata[PHRASE_BAN_METADATA_KEY];
    }
}

/**
 * Merge freshly-detected matches into the per-chat learned list.
 *
 * @returns {boolean} `true` if the stored list changed (caller should reinject).
 */
function addLearnedPhrases(matches) {
    const context = getContext();
    const existing = loadLearnedPhrases();
    const combined = normalizeLearnedList([...existing, ...matches]);
    if (combined.length === existing.length && combined.every((p, i) => p === existing[i])) {
        return false;
    }
    storeLearnedPhrases(context, combined);
    context.saveMetadata();
    return true;
}

/**
 * Persist a user-edited list from the textarea. Write-through is immediate;
 * the saveMetadata flush is debounced so typing doesn't thrash the disk.
 */
function scheduleLearnedSave(phrases) {
    const context = getContext();
    storeLearnedPhrases(context, normalizeLearnedList(phrases));
    if (learnedSaveTimer) clearTimeout(learnedSaveTimer);
    learnedSaveTimer = setTimeout(() => {
        learnedSaveTimer = null;
        getContext().saveMetadata();
    }, 300);
}

/** Drop the per-chat learned list entirely. */
function clearLearnedPhrases() {
    const context = getContext();
    if (context.chatMetadata?.[PHRASE_BAN_METADATA_KEY]) {
        delete context.chatMetadata[PHRASE_BAN_METADATA_KEY];
        context.saveMetadata();
    }
}

// ─── Proactive: Injection ───

function resolveInjectionRole(name) {
    switch ((name || DEFAULT_PHRASE_BAN_INJECTION_ROLE).toLowerCase()) {
        case 'user': return extension_prompt_roles.USER;
        case 'assistant': return extension_prompt_roles.ASSISTANT;
        case 'system':
        default: return extension_prompt_roles.SYSTEM;
    }
}

function clearProactiveInjection() {
    setExtensionPrompt(PHRASE_BAN_INJECTION_KEY, '', extension_prompt_types.NONE, 0);
}

/**
 * Whether the learned list should be enforced as a hard, sampler-level ban on
 * the current backend (Text Completion only). When true, the soft prompt
 * injection is suppressed — the hard ban replaces it — so we don't spend
 * context tokens repeating what the sampler already forbids.
 */
function shouldUseHardBan() {
    return !!(moduleSettings?.phraseBanEnabled
        && moduleSettings.phraseBanProactive
        && moduleSettings.phraseBanHardBan
        && getContext().mainApi === TEXTGEN_API);
}

/**
 * Reapply (or clear) the persistent "don't reuse these phrases" injection from
 * the current chat's learned list. setExtensionPrompt persists globally until
 * overwritten, so this is also what swaps the injection on chat change and
 * clears it the moment Proactive (or Phrase Ban) is turned off or the list
 * empties.
 */
export function reapplyProactiveInjection() {
    if (!moduleSettings?.phraseBanEnabled || !moduleSettings.phraseBanProactive) {
        clearProactiveInjection();
        return;
    }
    const phrases = loadLearnedPhrases();
    if (!phrases.length) {
        clearProactiveInjection();
        return;
    }
    // On a backend that enforces a hard sampler-level ban, drop the soft
    // injection — the hard banned-strings list (appended at request time)
    // replaces it.
    if (shouldUseHardBan()) {
        clearProactiveInjection();
        debug('Proactive injection suppressed — hard token ban active for this backend');
        return;
    }
    const body = substituteParamsExtended(getProactivePromptTemplate(), {
        bannedPhrases: formatMatchList(phrases),
    });
    const configuredDepth = moduleSettings.phraseBanInjectionDepth;
    const depth = Number.isFinite(configuredDepth) && configuredDepth >= 0
        ? configuredDepth
        : DEFAULT_PHRASE_BAN_INJECTION_DEPTH;
    const role = resolveInjectionRole(moduleSettings.phraseBanInjectionRole);
    setExtensionPrompt(
        PHRASE_BAN_INJECTION_KEY,
        body,
        extension_prompt_types.IN_CHAT,
        depth,
        false,
        role,
    );
    debug('Proactive injection applied —', phrases.length, 'learned phrase(s), depth', depth);
}

/**
 * Record newly-detected matches into the learned list and refresh the
 * injection / settings status when Proactive mode is on. No-op otherwise, so
 * the reactive path is untouched when the feature is disabled.
 */
function learnDetectedPhrases(matches) {
    if (!moduleSettings?.phraseBanProactive || !matches.length) return;
    if (addLearnedPhrases(matches)) {
        reapplyProactiveInjection();
        refreshLearnedPanel();
    }
}

// ─── Proactive: Hard (Sampler-level) Ban ───

/**
 * Append the learned list to the outgoing Text Completion request's
 * `banned_strings` so the backend hard-bans those sequences at the sampler
 * level. Non-destructive: it only mutates the per-request payload passed by
 * TEXT_COMPLETION_SETTINGS_READY, never the user's saved sampler settings.
 *
 * @param {{ banned_strings?: string[] }} params - The generation payload.
 */
export function onPhraseBanTextCompletionSettings(params) {
    if (!params || !shouldUseHardBan()) return;
    const phrases = loadLearnedPhrases();
    if (!phrases.length) return;

    if (!Array.isArray(params.banned_strings)) params.banned_strings = [];
    const existing = new Set(params.banned_strings.map(s => String(s)));
    let added = 0;
    for (const phrase of phrases) {
        if (existing.has(phrase)) continue;
        existing.add(phrase);
        params.banned_strings.push(phrase);
        added += 1;
    }
    if (added) debug('Hard ban — appended', added, 'learned phrase(s) to banned_strings');
}

/**
 * Re-evaluate the soft/hard split before each (non-dry-run) generation. The
 * choice hinges on the active backend, which can change between turns; doing
 * this here keeps the soft injection correctly present on Chat Completion and
 * suppressed on Text Completion regardless of when the user switched APIs.
 */
export function onPhraseBanGenerationStarted() {
    reapplyProactiveInjection();
}

// ─── Generation Settling ───

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait until no chat generation (solo or group round) is in flight, plus a
 * short settle delay. The rewrite triggers a real swipe generation, which ST
 * refuses while another one runs.
 *
 * @returns {Promise<boolean>} false on timeout.
 */
async function waitUntilGenerationSettles(timeoutMs = SETTLE_TIMEOUT_MS) {
    const start = Date.now();
    while (getContext().isGenerating || is_group_generating) {
        if (Date.now() - start > timeoutMs) return false;
        await delay(POLL_INTERVAL_MS);
    }
    await delay(SETTLE_DELAY_MS);
    return true;
}

// ─── Scan & Rewrite ───

/**
 * Scan one message against the ban list and, while it matches, rewrite it via
 * the Phrasing engine — up to Max Rewrite Attempts times. Each pass re-scans
 * the live message text, so edits/reformatting between passes are respected.
 *
 * @param {number} index
 * @param {{ manual?: boolean }} [opts] - `manual` calls surface "clean" /
 *        "nothing to scan" toasts; the auto path stays silent on no-ops.
 */
export async function scanAndRewriteMessage(index, { manual = false } = {}) {
    if (busy) {
        debug('scan — skipped (already running)');
        return;
    }

    const { patterns, invalid } = compilePatterns(moduleSettings.phraseBanPatterns);
    if (invalid.length) debug('scan — skipping invalid patterns:', invalid);
    if (!patterns.length) {
        if (manual) toast('No banned phrase patterns are configured.', 'warning', 'Phrase Ban');
        return;
    }

    busy = true;
    let dismissToast = () => {};
    try {
        if (!await waitUntilGenerationSettles()) {
            debug('scan — timed out waiting for generation to settle');
            return;
        }

        const maxRetries = getMaxRetries();
        for (let attempt = 0; ; attempt++) {
            const context = getContext();
            const msg = context.chat?.[index];
            if (!isScannableMessage(msg)) {
                if (manual && attempt === 0) toast('Nothing to scan in this message.', 'warning', 'Phrase Ban');
                return;
            }

            const matches = findBannedMatches(msg.mes, patterns);
            markSwipeChecked(msg);
            learnDetectedPhrases(matches);

            if (!matches.length) {
                if (attempt === 0) {
                    debug('scan — clean on first pass, index', index);
                    if (manual) toast('No banned phrases found.', 'info', 'Phrase Ban');
                } else {
                    debug('scan — clean after', attempt, 'rewrite(s), index', index);
                    toast('Rewrite is free of banned phrasing. The original is kept as a swipe.', 'success', 'Phrase Ban');
                }
                return;
            }

            debug('scan — index', index, 'attempt', attempt, '| matches:', matches);
            const summary = matches.slice(0, 3).map(m => `"${truncateMatch(m)}"`).join(', ');

            if (attempt >= maxRetries) {
                if (maxRetries === 0) {
                    toast(`Banned phrasing detected: ${summary}. Auto-rewrite is off (Max Rewrite Attempts is 0).`, 'warning', 'Phrase Ban');
                } else {
                    toast(`Still contains banned phrasing after ${maxRetries} rewrite${maxRetries === 1 ? '' : 's'}: ${summary}. Left as-is — earlier versions are kept as swipes.`, 'warning', 'Phrase Ban');
                }
                return;
            }

            // ST only regenerates swipes on the last message in the chat.
            if (index !== context.chat.length - 1) {
                debug('scan — message is no longer the last in the chat; cannot rewrite');
                if (manual) toast('Only the last message in the chat can be rewritten.', 'warning', 'Phrase Ban');
                return;
            }

            dismissToast();
            dismissToast = stickyToast(`Banned phrasing detected (${summary}) — rewriting…`, 'info', 'Phrase Ban');

            const result = await phrasingApi.rewriteMessageWithTemplate(
                index,
                getPromptTemplate(),
                { bannedPhrases: formatMatchList(matches) },
            );
            dismissToast();

            if (!result) {
                debug('scan — rewrite did not run or returned empty; stopping');
                return;
            }
            await delay(SETTLE_DELAY_MS);
        }
    } finally {
        busy = false;
        dismissToast();
    }
}

// ─── Auto Path ───

/**
 * Scan a freshly received AI message when auto mode is on. Fired from the
 * combined MESSAGE_RECEIVED handler in index.js.
 *
 * Deliberately detached (setTimeout) instead of awaited: the scan waits for
 * the generation to fully end and may trigger new swipe generations, and
 * MESSAGE_RECEIVED is emitted *inside* ST's generation pipeline — blocking
 * the emit chain here would deadlock it (GENERATION_ENDED could never fire
 * while we wait for it).
 */
export function onPhraseBanMessageReceived(messageIndex) {
    if (!moduleSettings?.phraseBanEnabled || !moduleSettings.phraseBanAuto) return;
    const context = getContext();
    const index = typeof messageIndex === 'number' ? messageIndex : context.chat.length - 1;
    const msg = context.chat?.[index];
    if (!isScannableMessage(msg)) return;
    if (isSwipeChecked(msg)) {
        debug('auto — swipe already scanned, index', index);
        return;
    }
    setTimeout(() => {
        scanAndRewriteMessage(index, { manual: false })
            .catch(err => console.error('Phrase Ban scan failed:', err));
    }, 0);
}

/**
 * Swap the proactive injection to the newly-loaded chat's learned list (or
 * clear it) and refresh the settings status. Fired from CHAT_CHANGED.
 */
export function onPhraseBanChatChanged() {
    reapplyProactiveInjection();
    refreshLearnedPanel();
    debug('Chat changed — proactive injection resynced');
}

// ─── Settings Panel ───

function updatePatternStatus() {
    const statusEl = document.getElementById('phrase_ban_pattern_status');
    if (!statusEl) return;
    const { patterns, invalid } = compilePatterns(moduleSettings.phraseBanPatterns);
    const parts = [patterns.length === 1 ? '1 pattern active' : `${patterns.length} patterns active`];
    if (invalid.length) {
        parts.push(`${invalid.length} invalid (skipped): ${invalid.map(p => truncateMatch(p, 40)).join(' · ')}`);
    }
    statusEl.textContent = parts.join(' — ');
    statusEl.classList.toggle('phrase-ban-status-error', invalid.length > 0);
}

function updateLearnedCount() {
    const el = document.getElementById('phrase_ban_learned_status');
    if (!el) return;
    const n = loadLearnedPhrases().length;
    el.textContent = n === 0
        ? 'No phrases learned in this chat yet.'
        : (n === 1 ? '1 phrase learned in this chat.' : `${n} phrases learned in this chat.`);
}

/**
 * Resync the learned-phrases textarea and count to the current chat's stored
 * list. The textarea is left alone while focused so an in-progress manual edit
 * is never clobbered (e.g. by an auto-learn landing mid-edit).
 */
function refreshLearnedPanel() {
    const textarea = document.getElementById('phrase_ban_learned_textarea');
    if (textarea && document.activeElement !== textarea) {
        textarea.value = loadLearnedPhrases().join('\n');
    }
    updateLearnedCount();
}

export function bindPhraseBanSettings(saveSettings) {
    const enabledCb = document.getElementById('phrase_ban_enabled');
    if (enabledCb) {
        enabledCb.checked = !!moduleSettings.phraseBanEnabled;
        enabledCb.addEventListener('change', () => {
            moduleSettings.phraseBanEnabled = enabledCb.checked;
            saveSettings();
            reapplyProactiveInjection();
        });
    }

    const autoCb = document.getElementById('phrase_ban_auto');
    if (autoCb) {
        autoCb.checked = !!moduleSettings.phraseBanAuto;
        autoCb.addEventListener('change', () => {
            moduleSettings.phraseBanAuto = autoCb.checked;
            saveSettings();
        });
    }

    const proactiveCb = document.getElementById('phrase_ban_proactive');
    if (proactiveCb) {
        proactiveCb.checked = !!moduleSettings.phraseBanProactive;
        proactiveCb.addEventListener('change', () => {
            moduleSettings.phraseBanProactive = proactiveCb.checked;
            saveSettings();
            reapplyProactiveInjection();
        });
    }

    const hardBanCb = document.getElementById('phrase_ban_hard_ban');
    if (hardBanCb) {
        hardBanCb.checked = !!moduleSettings.phraseBanHardBan;
        hardBanCb.addEventListener('change', () => {
            moduleSettings.phraseBanHardBan = hardBanCb.checked;
            saveSettings();
            // Flip the soft injection on/off to match the new hard/soft split.
            reapplyProactiveInjection();
        });
    }

    const depthInput = document.getElementById('phrase_ban_injection_depth');
    if (depthInput) {
        const configuredDepth = moduleSettings.phraseBanInjectionDepth;
        depthInput.value = Number.isFinite(configuredDepth) ? configuredDepth : DEFAULT_PHRASE_BAN_INJECTION_DEPTH;
        depthInput.addEventListener('input', () => {
            const n = parseInt(depthInput.value, 10);
            if (Number.isFinite(n) && n >= 0) {
                moduleSettings.phraseBanInjectionDepth = n;
                saveSettings();
                reapplyProactiveInjection();
            }
        });
    }

    const roleSelect = document.getElementById('phrase_ban_injection_role');
    if (roleSelect) {
        roleSelect.value = moduleSettings.phraseBanInjectionRole || DEFAULT_PHRASE_BAN_INJECTION_ROLE;
        roleSelect.addEventListener('change', () => {
            moduleSettings.phraseBanInjectionRole = roleSelect.value;
            saveSettings();
            reapplyProactiveInjection();
        });
    }

    const proactivePromptArea = document.getElementById('phrase_ban_proactive_prompt_textarea');
    if (proactivePromptArea) {
        proactivePromptArea.value = moduleSettings.phraseBanProactivePrompt || DEFAULT_PHRASE_BAN_PROACTIVE_PROMPT;
        proactivePromptArea.addEventListener('input', () => {
            const value = proactivePromptArea.value;
            moduleSettings.phraseBanProactivePrompt = value;
            saveSettings();
            if (value.trim() && !value.includes('{{bannedPhrases}}')) {
                toast('Warning: Proactive template lacks {{bannedPhrases}}; the AI won\'t see the learned list.', 'warning', 'Phrase Ban');
            }
            reapplyProactiveInjection();
        });
    }

    const learnedArea = document.getElementById('phrase_ban_learned_textarea');
    if (learnedArea) {
        learnedArea.addEventListener('input', () => {
            scheduleLearnedSave(learnedArea.value.split('\n'));
            reapplyProactiveInjection();
            // Update the count only — never rewrite the field the user is typing in.
            updateLearnedCount();
        });
    }

    document.getElementById('phrase_ban_clear_learned')?.addEventListener('click', () => {
        clearLearnedPhrases();
        clearProactiveInjection();
        refreshLearnedPanel();
        toast('Cleared the learned phrase list for this chat.', 'info', 'Phrase Ban');
    });

    refreshLearnedPanel();

    const retriesInput = document.getElementById('phrase_ban_max_retries');
    if (retriesInput) {
        retriesInput.value = getMaxRetries();
        retriesInput.addEventListener('input', () => {
            const n = parseInt(retriesInput.value, 10);
            if (Number.isFinite(n) && n >= 0) {
                moduleSettings.phraseBanMaxRetries = n;
                saveSettings();
            }
        });
    }

    const patternsArea = document.getElementById('phrase_ban_patterns_textarea');
    if (patternsArea) {
        patternsArea.value = moduleSettings.phraseBanPatterns || '';
        patternsArea.addEventListener('input', () => {
            moduleSettings.phraseBanPatterns = patternsArea.value;
            saveSettings();
            updatePatternStatus();
        });
        updatePatternStatus();
    }

    const promptArea = document.getElementById('phrase_ban_prompt_textarea');
    if (promptArea) {
        promptArea.value = moduleSettings.phraseBanPrompt || DEFAULT_PHRASE_BAN_PROMPT;
        promptArea.addEventListener('input', () => {
            moduleSettings.phraseBanPrompt = promptArea.value;
            saveSettings();
        });
    }

    document.getElementById('phrase_ban_preview_btn')
        ?.addEventListener('click', showPhraseBanPromptPreview);

    const debugCb = document.getElementById('phrase_ban_debug_mode');
    if (debugCb) {
        debugCb.checked = !!moduleSettings.phraseBanDebugMode;
        debugCb.addEventListener('change', () => {
            moduleSettings.phraseBanDebugMode = debugCb.checked;
            saveSettings();
        });
    }
}

function showPhraseBanPromptPreview() {
    const sampleMatches = formatMatchList([
        'his voice was thick with something he didn\'t want to name',
        'despite the chaos around them',
    ]);
    const sampleSeed = 'CharacterName: (the message text being rewritten)';
    // Display-only substitution; the real injection goes through the Phrasing
    // engine, where SillyTavern's own macros also resolve.
    const assembled = getPromptTemplate()
        .replace(/\{\{\s*bannedPhrases\s*\}\}/gi, sampleMatches)
        .replace(/\{\{\s*phrasingSeed\s*\}\}/gi, sampleSeed);
    const proactiveAssembled = getProactivePromptTemplate()
        .replace(/\{\{\s*bannedPhrases\s*\}\}/gi, sampleMatches);
    showPromptPreview('Phrase Ban — Injection Preview', [
        {
            label: 'Rewrite injection (added to the chat prompt as a system message at depth 0 for the rewrite generation, with sample matches)',
            text: assembled,
        },
        {
            label: `Proactive injection (${moduleSettings?.phraseBanProactive ? 'on' : 'off'} — persistently added before every AI turn while the chat's learned list is non-empty, with sample matches)`,
            text: proactiveAssembled,
        },
        {
            label: 'Note',
            text: 'The rewrite runs through the Phrasing! engine as a swipe regeneration, so the '
                + 'original message is always kept as a swipe. With Proactive mode on, every detected '
                + 'phrase is also added to a per-chat learned list and the proactive injection above is '
                + 'kept in the prompt so future replies avoid them up front. With Hard Token Ban on, the '
                + 'learned list is instead appended to the request\'s banned_strings on Text Completion '
                + 'backends (a sampler-level ban that replaces the soft injection there); Chat Completion '
                + 'APIs have no such ban, so the injection above is used. SillyTavern macros in the '
                + 'templates (e.g. {{char}}) resolve at generation time.',
        },
    ]);
}

// ─── Slash Command ───

export function registerPhraseBanSlashCommand() {
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'phraseban',
        callback: async () => {
            if (!moduleSettings.phraseBanEnabled) {
                toast('Phrase Ban is disabled in settings.', 'warning', 'Phrase Ban');
                return '';
            }
            const context = getContext();
            const lastIndex = context.chat.length - 1;
            if (lastIndex < 0) {
                toast('No messages to scan.', 'warning', 'Phrase Ban');
                return '';
            }
            await scanAndRewriteMessage(lastIndex, { manual: true });
            return '';
        },
        unnamedArgumentList: [],
        aliases: [],
        helpString: 'Scan the last message against the Phrase Ban regex list and rewrite it (as a new swipe) if banned phrasing is found.',
    }));
    debug('Registered /phraseban slash command');
}
