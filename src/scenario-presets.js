/**
 * Scenario Presets — built-in World Info Assist and Narrative Guidance
 * presets that write in the st-toolkit Scenario Description style: a
 * bracketed block of dense, semicolon-terminated fields (Scenario Title,
 * Context, Location, Opening Focus, Offstage, …), followed — for WIA — by
 * the per-character Openings block driven by ST's variable macros.
 *
 * Seeded once into the tools' preset lists by `seedScenarioPresets` (like
 * the Image Prompting built-ins), guarded by `scenarioPresetsSeeded` so a
 * deleted preset stays deleted. The Default preset of each tool is left
 * untouched and stays the active one.
 *
 * Brace escaping: ST's `createRawPrompt` runs its macro engine over the
 * prompt, so a literal `{{if !lastCharMessage}}` or `{{.x = …}}` in the
 * template would be *evaluated* (and an assignment would write a chat
 * variable) instead of being shown to the model as syntax. Every brace in
 * the format descriptions is therefore escaped as `\{` / `\}` — the macro
 * engine never matches an escaped pair and strips the backslashes after
 * substitution, so the model sees plain `{{…}}`. Only the extension's own
 * placeholders (`{{context}}`, `{{guidance}}`, `{{themes}}`,
 * `{{longGuidance}}`) stay unescaped. Model output is not macro-processed
 * (`cleanUpMessage` doesn't substitute), so the generated macros land in
 * the entry verbatim, ready for ST to run when the entry is injected.
 */

// ─── Helpers ───

/** Escape every brace so ST's macro engine passes the text through as-is. */
function escapeMacroBraces(text) {
    return text.replace(/[{}]/g, brace => `\\${brace}`);
}

// ─── Shared Instruction Blocks ───

const STYLE_RULES = `Style Rules:
* Dense reference fragments and comma-separated descriptors; every field ends with a semicolon. Full sentences only where a fragment would be unclear.
* No narration, no metaphor, no in-character voice, no address to the reader.
* Respect named IP canon unless the guidance says to deviate.
* Humanoid characters are he/him or she/her; it/its or they/them only for non-humanoid entities.
* Never write {{user}}, and never refer to the user, a persona, or "you". Anyone else in the scene is a named character or an unnamed "someone".
* Name only the places the scene actually uses; say "at headquarters" or "on the boat" rather than naming a place the scene never visits.`;

const OPENINGS_RULES = `Openings Rules:
* After the closing ] of the main block, write the Openings block exactly as shown: the first line {{if !lastCharMessage}}{{.openingSpeaker = {{char}}}} once, verbatim; then one {{if {{.openingSpeaker == <Card Name>}}}}[Opening: …]{{/if}} branch per focus character; then a final {{/if}} on its own line.
* <Card Name> is the character's exact card name, as written in the [Character — <name>] header of the character cards above. Match it character for character. Offstage characters get no branch.
* Each opening message: third-person past tense, prose narration, dialogue in "double quotes", no asterisks, one paragraph of 100–200 words. Only that character's own actions and words, never another focus character's dialogue.
* Openings are public-safe: no secrets, private feelings, or hidden aims.`;

const OPENINGS_SCHEMA = `{{if !lastCharMessage}}{{.openingSpeaker = {{char}}}}
{{if {{.openingSpeaker == <Card Name>}}}}[Opening: this is the start of the chat; <Card Name> speaks first and opens the scene with the message below as <his/her> own, adapted to anything already written, then continues normally;
<opening message>]{{/if}}
{{if {{.openingSpeaker == <Next Card Name>}}}}[Opening: …same, for the next focus character…]{{/if}}
{{/if}}`;

const COLD_OPEN_EXAMPLE = `[
Scenario Title: The Warden's Summons;
Context: Warden Ilsara has called Sable to Thistlemarch under a flag of truce. A new Thornblight bloom has swallowed a trade road, and the wardens now need the one tracker who survived direct contact. Guards at the gate have orders to search every visitor's pack.;
Location: The elven border outpost at Thistlemarch, dawn;
Opening Focus: Sable arriving alone at the outpost gate on foot, Patch at her heels, as the guards step out to search her pack;
Offstage: Warden Ilsara, waiting in the command tent past the gate; she will send for Sable once the search is done;
{{.sableClothingOverride = Same green coat but clean, hair combed back, scar deliberately left uncovered as a quiet challenge}}
{{.sableStatedGoalOverride = Hear the wardens out, name her price, and leave with a contract}}
{{.sableTrueGoalOverride = Learn what the wardens know about the new bloom without revealing the stolen text or the scar's behavior}}
]
{{if !lastCharMessage}}{{.openingSpeaker = {{char}}}}
{{if {{.openingSpeaker == Sable}}}}[Opening: this is the start of the chat; Sable speaks first and opens the scene with the message below as her own, adapted to anything already written, then continues normally;
Mist still lay in the hollows when Sable reached the gate at Thistlemarch, the white truce flag hanging limp above the palisade and the forest behind her gone quiet the way it only did near the wardens. She had walked through the night and did not look it: coat brushed clean, silver hair combed back, sleeve pushed up so the thorn-vine scar on her forearm showed plainly in the grey light. Patch trotted at her heels, one ear flicking at the guards as two of them stepped out with their hands already on their sword hilts. The taller one held out a gloved hand for her satchel. Sable looked at the hand, then at the flag, then back at him, and unslung the satchel without hurrying. "Search it, then. The salves in the green jar are for burns. Do not open the black one unless you wish to spend the day weeping." She sat down on the fence rail to wait, facing the gate, and ran her thumb once along the scar. "Tell Ilsara I came. She will want to know before I change my mind."]{{/if}}
{{/if}}`;

// ─── World Info Assist: Cold-open ───

const WIA_COLD_OPEN_BODY = `The next reply will be an out-of-story Scenario Description (cold-open variant) for a SillyTavern group roleplay: a scene setup that says exactly where a fresh scene starts, who is on-screen, who is expected, and what each character is after, followed by one opening message per focus character. It is stored as a World Info entry or pasted into a chat's Scenario Override, and every character in the scene reads it.

Write the main block as a scene brief in dense reference fragments, NOT as a story excerpt. Only the opening messages are prose.

Inputs:
* Guidance: the scene idea: who is involved, where and when, what is going on, and who is on-screen when it opens (the focus characters). Everyone else involved is anticipated (Offstage).
* Context (when provided): the character cards, lore, and chat above. Take names, appearances, relationships, places, and established facts from it.

Output Format (use exactly as written; <angle-bracket> parts are placeholders):
[
Scenario Title: <short, evocative title>;
Context: <the situation as the scene opens: what brought everyone here, what is at stake, the pressures and complications in play>;
Location: <specific place, time of day, conditions, concrete setting details>;
Opening Focus: <who is on-screen at the first moment, exactly where, doing what>;
Offstage: <each anticipated character: where they are right now, and when or why they will enter>;
{{.<firstName>ClothingOverride = <scene-specific clothing>}}
{{.<firstName>StatedGoalOverride = <what they will say they are here for>}}
{{.<firstName>TrueGoalOverride = <what they are really after in this scene>}}
]
${OPENINGS_SCHEMA}

Field Rules:
* Opening Focus is never vague: "Mara and Jonah walking up the gala steps toward the atrium doors", not "the pair arrive at some point".
* Omit the Offstage line entirely if nobody is anticipated.
* Context, Location, Opening Focus, and Offstage are seen by every character, so keep them public-safe: no secrets, private feelings, or hidden aims.

Override Rules:
* Override lines go after Opening Focus / Offstage, one per line, with no labels and no trailing semicolons.
* <firstName> is the character's first name in lower camelCase: "Sable Voss" → sable, "MJ" → mj, "Mary Jane Watson" → maryJane. Use the same prefix for all three variables.
* Set only the variables this scene actually changes; anything unset falls back to the character's card. Anticipated (Offstage) characters can have override lines too.
* TrueGoal may hold a private aim: it surfaces only in that character's own private lore, which only they see.

${OPENINGS_RULES}

${STYLE_RULES}

Format Rules:
* Return only the Scenario Description: the bracketed main block, then the Openings block. No commentary, no headings, no code fences.
* Follow the schema verbatim: brackets, colons, semicolons, line breaks, and macro syntax.

Example — Scenario Description (cold-open, one focus character):
${COLD_OPEN_EXAMPLE}`;

export const WIA_SCENARIO_COLD_OPEN_PROMPT =
    `{{context}}${escapeMacroBraces(WIA_COLD_OPEN_BODY)}\n\nGuidance from the user:\n{{guidance}}`;

// ─── World Info Assist: Continuation ───

const WIA_CONTINUATION_BODY = `The next reply will be an out-of-story Scenario Description (continuation variant) for a SillyTavern group roleplay: a scene setup that picks the story up mid-stream, typically to start a fresh chat where a long one left off. It records the story's current state in plain labeled fields, says exactly who is on-screen when play resumes and who is expected, and ends with one opening message per focus character. It is stored as a World Info entry or pasted into a chat's Scenario Override, and every character in the scene reads it.

Write the main block as a scene brief in dense reference fragments, NOT as a story excerpt. Only the opening messages are prose.

Inputs:
* Context: the character cards, lore, and chat above. Draw every fact from it. Do not invent events the story has not established.
* Guidance: which moment to resume from, who is on-screen when play resumes (the focus characters), and anything else to respect.

Output Format (use exactly as written; <angle-bracket> parts are placeholders):
[
Scenario Title: <short, evocative title>;
Story So Far: <3–5 public beats the scene depends on, oldest first>;
Context: <the situation at the moment play resumes: what just happened, what is at stake now>;
Location: <place, time of day, conditions>;
Present: <each focus character with their visible state: injuries, mood as others read it, what they carry>;
Opening Focus: <who is on-screen, exactly where, doing what, when play resumes>;
Offstage: <each anticipated character: where they are now, and when or why they will enter>;
<First Name>'s Current Clothing: <what they are wearing now>;
<First Name>'s Current Aim: <what they are openly pursuing now>;
Open Threads: <unresolved public tensions or questions the scene can pick up>;
]
${OPENINGS_SCHEMA}

Field Rules:
* Every field is seen by every character, so all of it is public-safe: no secrets, private feelings, or true goals, not even stated as rumor.
* Present lists only focus characters; anticipated characters go in Offstage. Omit the Offstage line entirely if nobody is anticipated.
* Opening Focus is never vague: "Mara and Jonah walking up the gala steps toward the atrium doors", not "the pair arrive at some point".
* Write a Current Clothing or Current Aim line only where that character's current state differs from their card; omit it where the card still holds. The "Current" wording tells the model these supersede the card.
* Story So Far summarizes; keep it to the beats this scene needs.
* Plain fields only: no {{.variable = …}} assignment lines in the main block.

${OPENINGS_RULES}

${STYLE_RULES}

Format Rules:
* Return only the Scenario Description: the bracketed main block, then the Openings block. No commentary, no headings, no code fences.
* Follow the schema verbatim: brackets, colons, semicolons, line breaks, and macro syntax.

Style reference — the Openings block and fragment style of a finished cold-open scenario (a continuation uses the plain fields above instead of its override lines):
${COLD_OPEN_EXAMPLE}`;

export const WIA_SCENARIO_CONTINUATION_PROMPT =
    `{{context}}${escapeMacroBraces(WIA_CONTINUATION_BODY)}\n\nGuidance from the user:\n{{guidance}}`;

// Prefills go through ST's macro engine too (substituteParamsExtended), so
// they carry no braces other than WIA's own {{title}}.
export const WIA_SCENARIO_PREFILL_TITLED = '[\nScenario Title: {{title}};\n';
export const WIA_SCENARIO_PREFILL_UNTITLED = '[\nScenario Title: ';

// ─── Narrative Guidance: Short-term (live scene) ───

// No Openings block and no override assignments: the chat is already
// running (the Openings would never show), and the guidance is injected
// into every character's prompt, so it follows the continuation variant's
// plain, public-safe fields.
const NG_SHORT_SCENARIO_BODY = `Write a Scenario Description (continuation variant) that captures the story exactly as it stands at the latest message and sets up where it heads over the next few turns. It is injected into every character's prompt until the next refresh, as the live state of the scene.

Output Format (use exactly as written; <angle-bracket> parts are placeholders):
[
Scenario Title: <short, evocative title for the current scene>;
Story So Far: <3–5 public beats the current scene depends on, oldest first>;
Context: <the situation right now: what just happened, what is at stake, what pressure is building>;
Location: <place, time of day, conditions>;
Present: <each on-screen character with their visible state: injuries, mood as others read it, what they carry>;
Opening Focus: <who is on-screen at the latest message, exactly where, doing what>;
Offstage: <each anticipated character: where they are now, and when or why they will enter>;
<First Name>'s Current Clothing: <what they are wearing now>;
<First Name>'s Current Aim: <what they are openly pursuing now>;
Open Threads: <the unresolved public tensions and questions the next few turns should pick up, most pressing first>;
]

Field Rules:
* Draw every fact from the context above. Do not invent events the story has not established; Open Threads may only develop tensions already in play.
* Every field is seen by every character, so all of it is public-safe: no secrets, private feelings, or true goals, not even stated as rumor.
* Present lists only on-screen characters; anticipated characters go in Offstage. Omit the Offstage line entirely if nobody is anticipated.
* Write a Current Clothing or Current Aim line only where that character's current state differs from their card; omit it where the card still holds.
* Keep the scene consistent with any long-term story direction and themes given above; Open Threads should move it toward them.
* Plain fields only: no {{…}} macros, no opening messages.

${STYLE_RULES}

Format Rules:
* The reply has been prefilled with the opening bracket and the Scenario Title label. Continue from there, fill every applicable field, and close the bracket.
* Return only the bracketed Scenario Description. No commentary, no headings, no code fences.`;

export const NG_SHORT_SCENARIO_PROMPT =
    `{{context}}{{longGuidance}}{{themes}}${escapeMacroBraces(NG_SHORT_SCENARIO_BODY)}`;

export const NG_SHORT_SCENARIO_PREFILL = '[\nScenario Title: ';

export const NG_SHORT_SCENARIO_INJECTION =
    '[Current scenario, as the scene stands now; its Current lines supersede the character cards. '
    + 'Continue the story from this state and move it toward the Open Threads;\n{{guidance}}]';

// ─── Narrative Guidance: Long-term (story arc) ───

const NG_LONG_SCENARIO_BODY = `Write a Scenario Arc: the overarching situation of the story in Scenario Description style, covering where events are ultimately heading across the next many turns. It is injected into every character's prompt as background, and the short-term scene guidance is built on top of it.

Output Format (use exactly as written; <angle-bracket> parts are placeholders):
[
Scenario Title: <short, evocative title for the arc>;
Story So Far: <3–5 public beats of the story as a whole, oldest first>;
Context: <the wider situation: the forces in motion, what is at stake for the characters, where events are heading and why>;
Open Threads: <the long-running unresolved tensions and questions the story should develop and pay off over many turns, most central first>;
]

Field Rules:
* Draw every fact from the context above. Do not invent events the story has not established; the arc may only develop tensions already in play.
* Describe the broad trajectory, escalating stakes, and mood, not immediate dialogue or scene actions.
* Every field is seen by every character, so all of it is public-safe: no secrets, private feelings, or true goals, not even stated as rumor.
* Keep the arc consistent with the themes given above.
* Plain fields only: no {{…}} macros.

${STYLE_RULES}

Format Rules:
* The reply has been prefilled with the opening bracket and the Scenario Title label. Continue from there, fill every field, and close the bracket.
* Return only the bracketed Scenario Arc. No commentary, no headings, no code fences.`;

export const NG_LONG_SCENARIO_PROMPT =
    `{{context}}{{themes}}${escapeMacroBraces(NG_LONG_SCENARIO_BODY)}`;

export const NG_LONG_SCENARIO_PREFILL = '[\nScenario Title: ';

export const NG_LONG_SCENARIO_INJECTION =
    '[Story arc, the overarching situation and where it is heading; '
    + 'let it shape the story over many turns;\n{{guidance}}]';

// ─── Built-in Presets ───

// toolKey -> { presetName: { fieldKey: text } }. Field keys match each
// tool's entry in TOOL_PRESET_CONFIG (index.js).
const BUILTIN_SCENARIO_PRESETS = {
    wia: {
        'Scenario (Cold-open)': {
            wiaPrompt: WIA_SCENARIO_COLD_OPEN_PROMPT,
            wiaPrefillTitled: WIA_SCENARIO_PREFILL_TITLED,
            wiaPrefillUntitled: WIA_SCENARIO_PREFILL_UNTITLED,
        },
        'Scenario (Continuation)': {
            wiaPrompt: WIA_SCENARIO_CONTINUATION_PROMPT,
            wiaPrefillTitled: WIA_SCENARIO_PREFILL_TITLED,
            wiaPrefillUntitled: WIA_SCENARIO_PREFILL_UNTITLED,
        },
    },
    'ng-short': {
        'Scenario': {
            narrativeGuidanceShortPrompt: NG_SHORT_SCENARIO_PROMPT,
            narrativeGuidanceShortGenerationPrompt: NG_SHORT_SCENARIO_PREFILL,
            narrativeGuidanceShortInjectionPrompt: NG_SHORT_SCENARIO_INJECTION,
        },
    },
    'ng-long': {
        'Scenario Arc': {
            narrativeGuidanceLongPrompt: NG_LONG_SCENARIO_PROMPT,
            narrativeGuidanceLongGenerationPrompt: NG_LONG_SCENARIO_PREFILL,
            narrativeGuidanceLongInjectionPrompt: NG_LONG_SCENARIO_INJECTION,
        },
    },
};

/**
 * One-shot seed of the built-in Scenario presets into World Info Assist and
 * both Narrative Guidance tracks. Never overwrites a preset the user already
 * has under the same name, never changes the active preset, and runs once
 * per install (so a deleted preset isn't recreated).
 *
 * @param {object} settings - The extension settings object.
 * @returns {boolean} `true` if settings changed and should be saved.
 */
export function seedScenarioPresets(settings) {
    if (settings.scenarioPresetsSeeded) return false;
    if (!settings.toolPresets || typeof settings.toolPresets !== 'object') settings.toolPresets = {};
    for (const [toolKey, builtins] of Object.entries(BUILTIN_SCENARIO_PRESETS)) {
        const presets = settings.toolPresets[toolKey] || (settings.toolPresets[toolKey] = {});
        for (const [name, preset] of Object.entries(builtins)) {
            if (presets[name] === undefined) presets[name] = { ...preset };
        }
    }
    settings.scenarioPresetsSeeded = true;
    return true;
}
