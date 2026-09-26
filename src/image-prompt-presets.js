/**
 * Image Prompting — default prompt texts and the built-in diffusion-model
 * presets. No SillyTavern imports, so they're unit-tested under plain Node
 * (see test/). image-prompting.js imports what it uses and re-exports the
 * rest for index.js.
 */

// ─── Default Prompts ───

// {{context}} and {{guidance}} are this extension's placeholders (substituted
// by applyTemplateMacros, not ST's macro engine). If a placeholder is
// removed, the block is prepended/appended automatically.

// Default template — targets Krea 2, which is prompted with natural-language
// prose (no tag lists): long, detailed, front-loaded descriptions following
// subject → action → environment → composition → lighting → mood → style.
export const DEFAULT_IMAGE_PROMPT_PROMPT = `{{context}}Role:
You are an expert prompt writer for text-to-image diffusion models. Read the roleplay scene above and write a single image-generation prompt that captures the current moment of the story — the latest, most visually striking beat — as one standalone image.

Target model: Krea 2. Krea 2 is prompted with natural language, not tag lists, and long detailed prompts yield the best results.

Prompt-writing rules:
- Write flowing, descriptive prose — complete sentences forming one coherent paragraph (or two short ones). Never use comma-separated keyword lists, tag soup, or prompt weights.
- Order carries emphasis: whatever comes first reads as the subject of the image, so open with the main subject and what they are doing.
- Cover, in roughly this order: subject and action → other characters and their positions → environment and setting → composition and camera framing (e.g. close-up, low angle, over-the-shoulder) → lighting → mood and atmosphere → artistic medium or style (e.g. cinematic photograph, digital painting, anime key visual — pick what fits the scene).
- Be specific and concrete: name colors, materials, textures, light sources, and spatial relationships instead of vague adjectives.
- Describe characters entirely by their visible appearance (hair, eyes, build, clothing, expression, pose). The image model knows nothing about the story — never rely on names alone or refer to prior events.
- Depict a single frozen moment. No sequence of events ("then", "after"), no dialogue, no sounds, no inner thoughts — only what a camera would capture.
- If words must be legible inside the image (a sign, a screen, a label), put those exact words in "double quotes". Otherwise include no quoted text.
- Output only the image prompt itself — no preamble, no commentary, no headings, no surrounding quotation marks, no negative prompt.`;

export const DEFAULT_IMAGE_PROMPT_PREFILL = '';

// Negative prompt shipped with the Default (Krea 2) preset. Empty on
// purpose: Krea 2 is a modern flow-matching model that barely responds to
// the booru-era "bad anatomy, worst quality" negatives, and an unnecessary
// negative costs quality. Users who want one just type it in.
export const DEFAULT_IMAGE_PROMPT_NEGATIVE = '';

// Seeded preset — targets Circlestone Labs' Anima (Base), which accepts
// Danbooru tags, natural language, or both; the mixed style (a tag block
// followed by a short prose passage) plays to its training. Tag block
// ordering and the quality/score prefix follow the model card.
export const ANIMA_IMAGE_PROMPT_PROMPT = `{{context}}Role:
You are an expert prompt writer for text-to-image diffusion models. Read the roleplay scene above and write a single image-generation prompt that captures the current moment of the story — the latest, most visually striking beat — as one standalone image.

Target model: Anima (Circlestone Labs Anima Base). Anima accepts Danbooru-style tags, natural language, or a mix; use the mixed style — a tag block first, then a short natural-language passage.

Prompt-writing rules:
- Your reply is prefilled with the quality tags ("masterpiece, best quality, score_7, "). Continue the tag block from there — never repeat the prefill.
- Tag block, comma-separated, in this order: content rating tag (safe / sensitive / nsfw / explicit — match the scene), character count (1girl, 1boy, 2girls, ...), then general Danbooru tags for appearance, clothing, pose, expression, setting, and framing.
- Tags are lowercase and use spaces instead of underscores (score tags like score_7 are the only underscore exception).
- Only tag a character by name if they are a well-known franchise character the model would recognize, and still tag their basic appearance to avoid confusion. Original roleplay characters get appearance tags only — the model does not know their names.
- Not every possible tag is needed — pick the tags that matter most for this shot.
- After the tag block, write a natural-language passage of at least two sentences describing the scene: who is where, what they are doing, the environment, the lighting, and the mood. Use normal capitalization for names in this passage.
- Depict a single frozen moment — only what a camera would capture. No sequence of events, no dialogue, no inner thoughts.
- Output only the image prompt itself (tag block + passage) — no preamble, no commentary, no headings, no negative prompt.`;

export const ANIMA_IMAGE_PROMPT_PREFILL = 'masterpiece, best quality, score_7, ';

// Standard booru-model negative: quality floor + the anatomy/artifact tags
// these models were captioned with. Sent as a prefix to whatever negative
// prompt is already configured in ST's Image Generation panel.
export const ANIMA_IMAGE_PROMPT_NEGATIVE =
    'lowres, worst quality, low quality, bad anatomy, bad hands, missing fingers, '
    + 'extra digit, fewer digits, extra limbs, deformed, mutated, blurry, jpeg artifacts, '
    + 'text, watermark, signature, username, artist name, cropped';

// Seeded preset — pure Danbooru tag list for booru-trained anime models
// (Illustrious, NoobAI, Pony derivatives, etc.).
export const DANBOORU_IMAGE_PROMPT_PROMPT = `{{context}}Role:
You are an expert prompt writer for text-to-image diffusion models. Read the roleplay scene above and write a single image-generation prompt that captures the current moment of the story — the latest, most visually striking beat — as one standalone image.

Target style: pure Danbooru tags, for anime-style diffusion models trained on booru tag captions. The entire prompt is one comma-separated tag list — no sentences, no prose.

Prompt-writing rules:
- Your reply is prefilled with the quality tags ("masterpiece, best quality, "). Continue the tag list from there — never repeat the prefill.
- Order the tags: content rating (safe / sensitive / nsfw / explicit — match the scene) → character count (1girl, 1boy, 2girls, solo, ...) → character appearance (hair length, color, and style; eye color; body type) → clothing and accessories → pose and action → expression → setting and background → composition and framing (cowboy shot, close-up, from above, looking at viewer, ...) → lighting and atmosphere.
- Tags are lowercase and use spaces instead of underscores.
- Prefer established Danbooru tags over invented phrases.
- Only tag a character by name if they are a well-known franchise character the model would recognize; original roleplay characters are described purely by appearance tags — the model does not know their names.
- Capture a single frozen moment — only what a camera would capture.
- Output only the tag list — no preamble, no commentary, no sentences, no negative prompt.`;

export const DANBOORU_IMAGE_PROMPT_PREFILL = 'masterpiece, best quality, ';

export const DANBOORU_IMAGE_PROMPT_NEGATIVE =
    'lowres, worst quality, low quality, normal quality, bad anatomy, bad hands, '
    + 'missing fingers, extra digit, fewer digits, extra limbs, deformed, mutated, '
    + 'blurry, jpeg artifacts, text, watermark, signature, username, artist name, cropped';

export const IP_GENERATE_SYSTEM_PROMPT =
    'You are an image-prompt engineering assistant. Follow the instructions and target '
    + 'prompt style in the prompt exactly. Output only the image-generation prompt — '
    + 'no preamble, no commentary.';

export const IP_CONTINUE_SYSTEM_PROMPT =
    'You are an image-prompt engineering assistant. Continue the existing image-generation '
    + 'prompt seamlessly in the same style. Output only the continuation — no headers, '
    + 'no meta-commentary, no repetition of prior text.';

export const DEFAULT_IMAGE_PROMPT_RESPONSE_LENGTH = 500;

// ─── Built-in Presets ───

// Handed to `seedBuiltinPresets` (prompt-templates.js) so the alternate
// diffusion-model targets ship ready to select. The Default preset entry
// (built-in) already covers Krea 2; these add the tag-based styles. Users
// can edit, rename, or delete them like any saved preset; a deleted one
// never comes back, and an edited one is never overwritten.
//
// History: v1 (flagged by `imagePromptPresetsSeeded`) had no negative
// prompts; v2 added them, so unedited v1 copies pick them up on upgrade.
export const IMAGE_PROMPT_PRESETS_SPEC = {
    id: 'image-prompt',
    version: 2,
    legacyFlag: 'imagePromptPresetsSeeded',
    presets: {
        'image-prompt': {
            'Anima (Tags + Prose)': {
                imagePromptPrompt: ANIMA_IMAGE_PROMPT_PROMPT,
                imagePromptPrefill: ANIMA_IMAGE_PROMPT_PREFILL,
                imagePromptNegative: ANIMA_IMAGE_PROMPT_NEGATIVE,
            },
            'Danbooru Tags': {
                imagePromptPrompt: DANBOORU_IMAGE_PROMPT_PROMPT,
                imagePromptPrefill: DANBOORU_IMAGE_PROMPT_PREFILL,
                imagePromptNegative: DANBOORU_IMAGE_PROMPT_NEGATIVE,
            },
        },
    },
    retired: {
        'image-prompt': {
            'Anima (Tags + Prose)': ['45b33951'],
            'Danbooru Tags': ['13a8e0e4'],
        },
    },
};
