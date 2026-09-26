/**
 * Toolkit Presets — built-in presets that write in st-toolkit's formats:
 *
 * - Scenario Description style (World Info Assist, Narrative Guidance,
 *   Compaction): a bracketed block of dense, semicolon-terminated fields
 *   (Scenario Title, Context, Location, Opening Focus, Offstage, …). Unlike
 *   st-toolkit's own scenarios they stop at the closing bracket: there is no
 *   per-character Openings block, because local models write those opening
 *   messages poorly.
 * - Timeline Summary (Compaction): st-toolkit's numbered event timeline.
 *
 * `TOOLKIT_PRESETS_SPEC` hands them to `seedBuiltinPresets` (in
 * prompt-templates.js), which adds them once, upgrades unedited copies when
 * the text changes, and never switches a tool's active preset. Each preset
 * carries the response length its output needs.
 *
 * Brace escaping: ST's `createRawPrompt` runs its macro engine over the
 * prompt, so a literal `{{.x = …}}` or `{{user}}` in the
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

// WIA only. The scenario ends at its closing bracket: no opening messages
// (local models write them poorly), and nothing else after the block.
const FORMAT_RULES = `Format Rules:
* Return only the bracketed Scenario Description and end the reply at its closing ]. Write no opening messages, dialogue, or narration after it.
* No commentary, no headings, no code fences.
* Follow the schema verbatim: brackets, colons, semicolons, line breaks, and macro syntax.`;

const COLD_OPEN_EXAMPLE = `[
Scenario Title: The Warden's Summons;
Context: Warden Ilsara has called Sable to Thistlemarch under a flag of truce. A new Thornblight bloom has swallowed a trade road, and the wardens now need the one tracker who survived direct contact. Guards at the gate have orders to search every visitor's pack.;
Location: The elven border outpost at Thistlemarch, dawn;
Opening Focus: Sable arriving alone at the outpost gate on foot, Patch at her heels, as the guards step out to search her pack;
Offstage: Warden Ilsara, waiting in the command tent past the gate; she will send for Sable once the search is done;
{{.sableClothingOverride = Same green coat but clean, hair combed back, scar deliberately left uncovered as a quiet challenge}}
{{.sableStatedGoalOverride = Hear the wardens out, name her price, and leave with a contract}}
{{.sableTrueGoalOverride = Learn what the wardens know about the new bloom without revealing the stolen text or the scar's behavior}}
]`;

// ─── World Info Assist: Cold-open ───

const WIA_COLD_OPEN_BODY = `The next reply will be an out-of-story Scenario Description (cold-open variant) for a SillyTavern group roleplay: a scene setup that says exactly where a fresh scene starts, who is on-screen, who is expected, and what each character is after. It is stored as a World Info entry or pasted into a chat's Scenario Override, and every character in the scene reads it.

Write it as a scene brief in dense reference fragments, NOT as a story excerpt.

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

Field Rules:
* Opening Focus is never vague: "Mara and Jonah walking up the gala steps toward the atrium doors", not "the pair arrive at some point".
* Omit the Offstage line entirely if nobody is anticipated.
* Context, Location, Opening Focus, and Offstage are seen by every character, so keep them public-safe: no secrets, private feelings, or hidden aims.

Override Rules:
* Override lines go after Opening Focus / Offstage, one per line, with no labels and no trailing semicolons.
* <firstName> is the character's first name in lower camelCase: "Sable Voss" → sable, "MJ" → mj, "Mary Jane Watson" → maryJane. Use the same prefix for all three variables.
* Set only the variables this scene actually changes; anything unset falls back to the character's card. Anticipated (Offstage) characters can have override lines too.
* TrueGoal may hold a private aim: it surfaces only in that character's own private lore, which only they see.

${STYLE_RULES}

${FORMAT_RULES}

Example — Scenario Description (cold-open, one focus character):
${COLD_OPEN_EXAMPLE}`;

export const WIA_SCENARIO_COLD_OPEN_PROMPT =
    `{{context}}${escapeMacroBraces(WIA_COLD_OPEN_BODY)}\n\nGuidance from the user:\n{{guidance}}`;

// ─── World Info Assist: Continuation ───

const WIA_CONTINUATION_BODY = `The next reply will be an out-of-story Scenario Description (continuation variant) for a SillyTavern group roleplay: a scene setup that picks the story up mid-stream, typically to start a fresh chat where a long one left off. It records the story's current state in plain labeled fields and says exactly who is on-screen when play resumes and who is expected. It is stored as a World Info entry or pasted into a chat's Scenario Override, and every character in the scene reads it.

Write it as a scene brief in dense reference fragments, NOT as a story excerpt.

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

Field Rules:
* Every field is seen by every character, so all of it is public-safe: no secrets, private feelings, or true goals, not even stated as rumor.
* Present lists only focus characters; anticipated characters go in Offstage. Omit the Offstage line entirely if nobody is anticipated.
* Opening Focus is never vague: "Mara and Jonah walking up the gala steps toward the atrium doors", not "the pair arrive at some point".
* Write a Current Clothing or Current Aim line only where that character's current state differs from their card; omit it where the card still holds. The "Current" wording tells the model these supersede the card.
* Story So Far summarizes; keep it to the beats this scene needs.
* Plain fields only: no {{.variable = …}} assignment lines.

${STYLE_RULES}

${FORMAT_RULES}

Style reference — the fragment style of a finished cold-open scenario (a continuation uses the plain fields above instead of its override lines):
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

// ─── Compaction: Scenario recap ───

// The recap replaces the dropped history and is followed by the verbatim
// tail, so it describes the moment the summarized history ends. No
// {{guidance}} placeholder: Compaction appends the user's must-keep details
// itself, and only when there are any.
const COMPACTION_SCENARIO_BODY = `Write a Scenario Description (continuation variant) that recaps the roleplay so far. It replaces the chat history above, which is about to be dropped from the model's context: a fresh chat starts with this recap, followed by the most recent messages carried over verbatim. It must hold everything the story needs to carry on, and describe where things stand at the point the history above ends, where the carried-over messages pick up.

Output Format (use exactly as written; <angle-bracket> parts are placeholders):
[
Scenario Title: <short, evocative title for the story so far>;
Story So Far: <the public beats of the whole story, oldest first, one short clause each; as many as it takes for the story to continue without the dropped history>;
Context: <the situation at the point the history ends: what just happened, what is at stake now>;
Location: <place, time of day, conditions>;
Present: <each on-screen character with their visible state: injuries, mood as others read it, what they carry>;
Opening Focus: <who is on-screen at the point the history ends, exactly where, doing what>;
Offstage: <each anticipated character: where they are now, and when or why they will enter>;
<First Name>'s Current Clothing: <what they are wearing now>;
<First Name>'s Current Aim: <what they are openly pursuing now>;
Open Threads: <every unresolved public tension or question, most pressing first>;
]

Field Rules:
* Draw every fact from the chat history above. Never invent events, and never continue the story.
* If the history opens with an earlier recap (from a previous compaction), fold all of its beats into Story So Far; nothing from it may be lost.
* Every field is seen by every character, so all of it is public-safe: no secrets, private feelings, or true goals, not even stated as rumor.
* Present lists only on-screen characters; anticipated characters go in Offstage. Omit the Offstage line entirely if nobody is anticipated.
* Write a Current Clothing or Current Aim line only where that character's current state differs from their card; omit it where the card still holds.
* Plain fields only: no {{…}} macros, no opening messages.

${STYLE_RULES}

Format Rules:
* The reply has been prefilled with the opening bracket and the Scenario Title label. Continue from there, fill every applicable field, and close the bracket.
* Return only the bracketed Scenario Description. No commentary, no headings, no code fences.`;

export const COMPACTION_SCENARIO_PROMPT = `{{context}}${escapeMacroBraces(COMPACTION_SCENARIO_BODY)}`;
export const COMPACTION_SCENARIO_PREFILL = '[\nScenario Title: ';

// ─── Compaction: Timeline Summary ───

// st-toolkit's Timeline Summary (docs/specs/timeline-extractor.md), adapted
// for Compaction: no code fence (the recap is posted as a chat message), and
// instead of the spec's append-only "new entries" mode, an earlier timeline
// at the top of the history is carried over whole, because the history it
// came from is about to be dropped.
const COMPACTION_TIMELINE_BODY = `Write a Timeline Summary of the roleplay so far. It replaces the chat history above, which is about to be dropped from the model's context: a fresh chat starts with this timeline, followed by the most recent messages carried over verbatim. It must cover the whole story, in order, up to where the history above ends.

Output Format (use exactly as written; <angle-bracket> parts are placeholders):
[
Timeline Summary

**1. <Event Title>** – <single-paragraph summary of the event and its narrative significance>

**2. <Event Title>** – <…>
]

Entry Rules:
* Each entry is a numbered, bolded event title, an en dash, then one paragraph of 3–6 sentences: what happened, who was involved, and why it matters to the ongoing story (cause and effect, character development, relationship shifts, reveals, or stakes changes).
* Collapse minor back-and-forth into the broader event it belongs to; never write an entry per message. If the boundary between two events is unclear, group them under the one they most naturally belong to.
* Strict chronological order as events occur in the story, not the order messages were sent; note flashbacks and time skips where they matter.
* If the history opens with an earlier Timeline Summary (from a previous compaction), carry its entries over unchanged, then continue the numbering with the new events. Nothing from it may be dropped.
* Stay neutral and descriptive; don't editorialize about characters' choices. Use the names, aliases, and titles the characters use.
* Summarize mature or sensitive content factually, without graphic detail.
* Leave out OOC messages, meta-discussion, and system or instruction blocks; entries cover in-story events only.
* Draw every fact from the chat history above. Never invent events, and never continue the story.

Format Rules:
* The reply has been prefilled with the opening bracket and the Timeline Summary header. Continue with the entries and close the bracket after the last one.
* Return only the bracketed Timeline Summary. No commentary, no preamble, no code fences.`;

export const COMPACTION_TIMELINE_PROMPT = `{{context}}${escapeMacroBraces(COMPACTION_TIMELINE_BODY)}`;
export const COMPACTION_TIMELINE_PREFILL = '[\nTimeline Summary\n\n';

// ─── Built-in Presets ───

// Handed to `seedBuiltinPresets`. Field keys match each tool's entry in
// TOOL_PRESET_CONFIG (index.js); `responseLength` is what the output needs.
//
// History: v1 shipped the WIA and NG Scenario presets without response
// lengths, and the WIA pair ended with the per-character Openings block
// (flagged by `scenarioPresetsSeeded`). v2 dropped the Openings, added
// response lengths, and added the Compaction presets.
export const TOOLKIT_PRESETS_SPEC = {
    id: 'toolkit',
    version: 2,
    legacyFlag: 'scenarioPresetsSeeded',
    presets: {
        wia: {
            'Scenario (Cold-open)': {
                wiaPrompt: WIA_SCENARIO_COLD_OPEN_PROMPT,
                wiaPrefillTitled: WIA_SCENARIO_PREFILL_TITLED,
                wiaPrefillUntitled: WIA_SCENARIO_PREFILL_UNTITLED,
                responseLength: 800,
            },
            'Scenario (Continuation)': {
                wiaPrompt: WIA_SCENARIO_CONTINUATION_PROMPT,
                wiaPrefillTitled: WIA_SCENARIO_PREFILL_TITLED,
                wiaPrefillUntitled: WIA_SCENARIO_PREFILL_UNTITLED,
                responseLength: 800,
            },
        },
        'ng-short': {
            'Scenario': {
                narrativeGuidanceShortPrompt: NG_SHORT_SCENARIO_PROMPT,
                narrativeGuidanceShortGenerationPrompt: NG_SHORT_SCENARIO_PREFILL,
                narrativeGuidanceShortInjectionPrompt: NG_SHORT_SCENARIO_INJECTION,
                responseLength: 800,
            },
        },
        'ng-long': {
            'Scenario Arc': {
                narrativeGuidanceLongPrompt: NG_LONG_SCENARIO_PROMPT,
                narrativeGuidanceLongGenerationPrompt: NG_LONG_SCENARIO_PREFILL,
                narrativeGuidanceLongInjectionPrompt: NG_LONG_SCENARIO_INJECTION,
                responseLength: 600,
            },
        },
        compaction: {
            'Scenario (Continuation)': {
                compactionSummaryPrompt: COMPACTION_SCENARIO_PROMPT,
                compactionSummaryPrefill: COMPACTION_SCENARIO_PREFILL,
                responseLength: 1500,
            },
            'Timeline Summary': {
                compactionSummaryPrompt: COMPACTION_TIMELINE_PROMPT,
                compactionSummaryPrefill: COMPACTION_TIMELINE_PREFILL,
                responseLength: 2500,
            },
        },
    },
    introduced: {
        compaction: { 'Scenario (Continuation)': 2, 'Timeline Summary': 2 },
    },
    retired: {
        // v1 texts (ending with the Openings block).
        wia: {
            'Scenario (Cold-open)': ['eba40bf9'],
            'Scenario (Continuation)': ['77579a39'],
        },
    },
};
