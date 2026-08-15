/**
 * Image Generation bridge
 *
 * Hands a finished image prompt to SillyTavern's own Image Generation
 * extension (the built-in `stable-diffusion` module) so it renders on
 * whichever backend the user already configured — ComfyUI, A1111, NovelAI,
 * Horde, an online API, whatever `#sd_source` is set to. We own no backend
 * plumbing of our own: no ComfyUI URL, no workflow, no sampler settings.
 * Everything lives in ST's Image Generation panel and stays the single
 * source of truth.
 *
 * How the hand-off works: ST's SD extension registers the `/imagine`
 * command (aliases `/sd`, `/img`, `/image`) on `SlashCommandParser`. We call
 * that command's `callback` **directly** rather than building a slash-command
 * string and running it through `executeSlashCommandsWithOptions` — image
 * prompts routinely contain `|`, `{{`, quotes and newlines, all of which are
 * slash-command syntax and would need fragile escaping. Calling the callback
 * hands the prompt over as an opaque string with no parsing in between.
 *
 * The prompt is sent as a "free mode" trigger, which ST uses verbatim (only
 * expanding its own `{{charPrefix}}` macro) — no second LLM pass to rewrite
 * what we just carefully generated. `extend: 'false'` pins that down even if
 * the user has ST's "Auto-extend free mode prompts" setting switched on;
 * `/imagine` restores the setting afterwards. ST still applies its own
 * common prompt prefix / negative prompt from the Image Generation panel,
 * which is what a user expects their quality tags and negatives to do.
 */

import { SlashCommandParser } from '../../../../slash-commands/SlashCommandParser.js';
import { getContext } from './utils.js';

// ST's `/imagine`; the aliases are checked too in case a future ST build
// renames the primary command but keeps one of them.
const IMAGINE_COMMAND_NAMES = ['imagine', 'sd', 'img', 'image'];

// Friendly labels for the `#sd_source` values worth naming in a toast. Any
// source not listed falls back to its raw id, so a newly added ST backend
// still reports something sensible instead of "unknown".
const SOURCE_LABELS = {
    comfy: 'ComfyUI',
    auto: 'AUTOMATIC1111',
    vlad: 'SD.Next',
    sdcpp: 'stable-diffusion.cpp',
    drawthings: 'DrawThings',
    extras: 'Extras',
    horde: 'Stable Horde',
    novel: 'NovelAI',
    openai: 'OpenAI',
    togetherai: 'Together AI',
    pollinations: 'Pollinations',
    stability: 'Stability AI',
    huggingface: 'HuggingFace',
    aimlapi: 'AI/ML API',
    electronhub: 'Electron Hub',
    nanogpt: 'NanoGPT',
    openrouter: 'OpenRouter',
    workersai: 'Cloudflare Workers AI',
    chutes: 'Chutes',
    google: 'Google',
    falai: 'fal.ai',
    bfl: 'Black Forest Labs',
    xai: 'xAI',
    zai: 'Z.AI',
};

/**
 * Resolve ST's image-generation slash command, or null when the built-in
 * Image Generation extension isn't loaded (the user disabled it, or an ST
 * build without it).
 * @returns {{ callback: function }|null}
 */
function getImagineCommand() {
    const commands = SlashCommandParser.commands;
    if (!commands) return null;
    for (const name of IMAGINE_COMMAND_NAMES) {
        const command = commands[name];
        if (command && typeof command.callback === 'function') return command;
    }
    return null;
}

/**
 * Whether ST's Image Generation extension is present and can be driven.
 * @returns {boolean}
 */
export function isImageGenAvailable() {
    return !!getImagineCommand();
}

/** Read ST's Image Generation settings block (may be undefined pre-init). */
function getSdSettings() {
    return getContext().extensionSettings?.sd ?? null;
}

/**
 * Human-readable name of the configured backend, e.g. 'ComfyUI'. Falls back
 * to the generic phrase when ST's settings aren't readable yet.
 * @returns {string}
 */
export function getImageGenSourceLabel() {
    const source = getSdSettings()?.source;
    if (!source) return 'image generation';
    return SOURCE_LABELS[source] || source;
}

/**
 * Best-effort pre-flight check so we can explain *what* is unconfigured
 * instead of letting ST raise its generic "check your settings" warning.
 * Deliberately conservative: it only reports a problem for the cases it can
 * verify locally (ComfyUI's URL, the local WebUI-style URLs). Anything
 * key/secret-backed is left to ST, which owns the secret store.
 * @returns {{ ok: boolean, reason?: string }}
 */
export function checkImageGenConfigured() {
    const sd = getSdSettings();
    if (!sd) {
        return { ok: false, reason: 'ST\'s Image Generation extension has no settings yet. Open its panel once and pick a source.' };
    }
    const label = getImageGenSourceLabel();
    switch (sd.source) {
        case 'comfy':
            // ST supports a standard ComfyUI server and RunPod serverless;
            // only the standard one has a locally verifiable URL.
            if (sd.comfy_type === 'runpod_serverless') return { ok: true };
            if (!sd.comfy_url) {
                return { ok: false, reason: 'No ComfyUI URL is set in ST\'s Image Generation settings.' };
            }
            if (!sd.comfy_workflow) {
                return { ok: false, reason: 'No ComfyUI workflow is selected in ST\'s Image Generation settings.' };
            }
            return { ok: true };
        case 'auto':
            return sd.auto_url ? { ok: true } : { ok: false, reason: `No ${label} URL is set in ST's Image Generation settings.` };
        case 'vlad':
            return sd.vlad_url ? { ok: true } : { ok: false, reason: `No ${label} URL is set in ST's Image Generation settings.` };
        case 'sdcpp':
            return sd.sdcpp_url ? { ok: true } : { ok: false, reason: `No ${label} URL is set in ST's Image Generation settings.` };
        case 'drawthings':
            return sd.drawthings_url ? { ok: true } : { ok: false, reason: `No ${label} URL is set in ST's Image Generation settings.` };
        default:
            // Secret-backed or always-available sources — ST validates them.
            return { ok: true };
    }
}

/**
 * Send a finished image prompt to ST's configured image-generation backend.
 *
 * Resolves with the generated image's URL, or an empty string when ST could
 * not produce one (it raises its own toast in that case — an unreachable
 * backend, a stopped generation, an invalid workflow). Rejects only when the
 * Image Generation extension isn't available at all.
 *
 * @param {string} prompt Prompt text, used verbatim as a free-mode trigger.
 * @param {object} [options]
 * @param {boolean} [options.quiet] When true, generate without posting the
 *   image as a chat message (it still lands in the character gallery).
 * @param {string} [options.negative] Negative prompt. ST treats this as a
 *   *prefix*: it is comma-joined in front of the negative prompt configured
 *   in the Image Generation panel rather than replacing it, so the user's
 *   own negatives keep applying. Omit or pass '' to send only theirs.
 * @returns {Promise<string>} URL of the generated image, or ''.
 */
export async function sendPromptToImageGen(prompt, { quiet = false, negative = '' } = {}) {
    const text = (prompt || '').trim();
    if (!text) throw new Error('Image prompt is empty.');

    const command = getImagineCommand();
    if (!command) {
        throw new Error('SillyTavern\'s Image Generation extension is not available. Enable it in Extensions first.');
    }

    // Named args are passed as strings — ST parses them with its own
    // isTrueBoolean/isFalseBoolean helpers, same as a typed command would.
    const args = {
        quiet: quiet ? 'true' : 'false',
        extend: 'false',
    };
    // Only set it when non-empty: ST reads `args?.negative || ''`, so an
    // empty string is equivalent, but leaving the key off keeps the args
    // identical to what a plain `/imagine` would produce.
    const negativeText = (negative || '').trim();
    if (negativeText) args.negative = negativeText;

    const url = await command.callback(args, text);

    return typeof url === 'string' ? url : '';
}
