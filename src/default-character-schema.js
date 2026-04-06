/**
 * Default Character Schema for Assisted Character Creation.
 *
 * Each field defines an attribute of a character card. The schema drives
 * the modal form layout, per-field LLM prompts, and the compiled output
 * that is written into SillyTavern's description field.
 *
 * The `prose` flag is NOT part of the schema — it's a per-field UI toggle
 * that the user controls at runtime. Prose state is persisted in extension
 * settings so changes survive modal close/reopen.
 */

export const DEFAULT_SCHEMA = {
    schemaName: 'Default Character Schema',
    fields: {
        characterName: {
            order: 1,
            label: 'Character Name',
            description: 'Full name, aliases/titles in parentheses if any.',
            responseLength: 100,
            prompt: 'Generate a fitting character name based on the brief and any notes provided. Include aliases or titles in parentheses if appropriate.\n\nCharacter Brief:\n{{context}}\n\nUser\'s notes for this field:\n{{seedText}}',
        },
        age: {
            order: 2,
            label: 'Age',
            description: 'Numeric age and life-stage descriptor.',
            responseLength: 80,
            prompt: 'Determine an appropriate age for this character. Provide the numeric age and a brief life-stage descriptor (e.g. "28, young adult").\n\nCharacter Brief:\n{{context}}\n\nOther fields already defined:\n{{filledFields}}\n\nUser\'s notes for this field:\n{{seedText}}',
        },
        genderPronouns: {
            order: 3,
            label: 'Gender & Pronouns',
            description: 'Gender identity and preferred pronouns.',
            responseLength: 80,
            prompt: 'Specify the character\'s gender identity and pronouns.\n\nCharacter Brief:\n{{context}}\n\nOther fields already defined:\n{{filledFields}}\n\nUser\'s notes for this field:\n{{seedText}}',
        },
        species: {
            order: 4,
            label: 'Species / Race',
            description: 'Species, race, or ancestry (human, elf, android, etc.).',
            responseLength: 80,
            prompt: 'Determine the character\'s species, race, or ancestry based on the setting and brief.\n\nCharacter Brief:\n{{context}}\n\nOther fields already defined:\n{{filledFields}}\n\nUser\'s notes for this field:\n{{seedText}}',
        },
        occupation: {
            order: 5,
            label: 'Occupation / Role',
            description: 'Job, title, social role, or adventuring class.',
            responseLength: 100,
            prompt: 'Determine the character\'s occupation, title, or role in their world.\n\nCharacter Brief:\n{{context}}\n\nOther fields already defined:\n{{filledFields}}\n\nUser\'s notes for this field:\n{{seedText}}',
        },
        physicalAppearance: {
            order: 6,
            label: 'Physical Appearance',
            description: 'Height, build, hair, eyes, distinguishing features.',
            responseLength: 500,
            prompt: 'Describe this character\'s physical appearance in vivid detail. Include height, build, hair, eyes, skin, and any distinguishing features.\n\nCharacter Brief:\n{{context}}\n\nOther fields already defined:\n{{filledFields}}\n\nUser\'s notes for this field:\n{{seedText}}',
        },
        clothingStyle: {
            order: 7,
            label: 'Clothing & Style',
            description: 'Typical attire, accessories, aesthetic.',
            responseLength: 400,
            prompt: 'Describe this character\'s typical clothing, accessories, and overall aesthetic style.\n\nCharacter Brief:\n{{context}}\n\nOther fields already defined:\n{{filledFields}}\n\nUser\'s notes for this field:\n{{seedText}}',
        },
        personalityTraits: {
            order: 8,
            label: 'Personality Traits',
            description: 'Core personality traits, temperament, demeanor.',
            responseLength: 200,
            prompt: 'List the character\'s core personality traits, temperament, and general demeanor. Use comma-separated descriptors.\n\nCharacter Brief:\n{{context}}\n\nOther fields already defined:\n{{filledFields}}\n\nUser\'s notes for this field:\n{{seedText}}',
        },
        strengths: {
            order: 9,
            label: 'Strengths',
            description: 'Key strengths, talents, positive qualities.',
            responseLength: 200,
            prompt: 'List this character\'s key strengths, talents, and positive qualities.\n\nCharacter Brief:\n{{context}}\n\nOther fields already defined:\n{{filledFields}}\n\nUser\'s notes for this field:\n{{seedText}}',
        },
        weaknesses: {
            order: 10,
            label: 'Weaknesses',
            description: 'Flaws, vulnerabilities, shortcomings.',
            responseLength: 200,
            prompt: 'List this character\'s flaws, vulnerabilities, and shortcomings.\n\nCharacter Brief:\n{{context}}\n\nOther fields already defined:\n{{filledFields}}\n\nUser\'s notes for this field:\n{{seedText}}',
        },
        fears: {
            order: 11,
            label: 'Fears',
            description: 'Phobias, deep fears, anxieties.',
            responseLength: 150,
            prompt: 'Identify this character\'s fears, phobias, or deep anxieties.\n\nCharacter Brief:\n{{context}}\n\nOther fields already defined:\n{{filledFields}}\n\nUser\'s notes for this field:\n{{seedText}}',
        },
        motivations: {
            order: 12,
            label: 'Motivations & Goals',
            description: 'What drives them, their ambitions and desires.',
            responseLength: 400,
            prompt: 'Describe what motivates this character — their goals, ambitions, and deepest desires.\n\nCharacter Brief:\n{{context}}\n\nOther fields already defined:\n{{filledFields}}\n\nUser\'s notes for this field:\n{{seedText}}',
        },
        speechStyle: {
            order: 13,
            label: 'Speech Style',
            description: 'How they talk: dialect, vocabulary, verbal tics, tone.',
            responseLength: 400,
            prompt: 'Describe how this character speaks — their dialect, vocabulary level, verbal tics, catchphrases, and conversational tone.\n\nCharacter Brief:\n{{context}}\n\nOther fields already defined:\n{{filledFields}}\n\nUser\'s notes for this field:\n{{seedText}}',
        },
        mannerisms: {
            order: 14,
            label: 'Mannerisms & Habits',
            description: 'Body language, habitual gestures, quirks.',
            responseLength: 400,
            prompt: 'Describe this character\'s mannerisms, habitual gestures, body language, and quirks.\n\nCharacter Brief:\n{{context}}\n\nOther fields already defined:\n{{filledFields}}\n\nUser\'s notes for this field:\n{{seedText}}',
        },
        backstorySummary: {
            order: 15,
            label: 'Backstory Summary',
            description: 'Origin, key events, current situation.',
            responseLength: 600,
            prompt: 'Write a backstory summary for this character covering their origin, formative experiences, key life events, and current situation.\n\nCharacter Brief:\n{{context}}\n\nOther fields already defined:\n{{filledFields}}\n\nUser\'s notes for this field:\n{{seedText}}',
        },
        relationships: {
            order: 16,
            label: 'Relationships',
            description: 'Key relationships: family, friends, rivals, romantic.',
            responseLength: 500,
            prompt: 'Describe this character\'s key relationships — family, friends, rivals, mentors, romantic interests, or enemies.\n\nCharacter Brief:\n{{context}}\n\nOther fields already defined:\n{{filledFields}}\n\nUser\'s notes for this field:\n{{seedText}}',
        },
        skills: {
            order: 17,
            label: 'Skills & Abilities',
            description: 'Trained skills, powers, areas of expertise.',
            responseLength: 200,
            prompt: 'List this character\'s trained skills, special abilities, powers, or areas of expertise.\n\nCharacter Brief:\n{{context}}\n\nOther fields already defined:\n{{filledFields}}\n\nUser\'s notes for this field:\n{{seedText}}',
        },
        possessions: {
            order: 18,
            label: 'Key Possessions',
            description: 'Important items, weapons, heirlooms, tools.',
            responseLength: 200,
            prompt: 'List this character\'s important possessions — signature items, weapons, heirlooms, tools, or artifacts.\n\nCharacter Brief:\n{{context}}\n\nOther fields already defined:\n{{filledFields}}\n\nUser\'s notes for this field:\n{{seedText}}',
        },
        likes: {
            order: 19,
            label: 'Likes',
            description: 'Things they enjoy, hobbies, preferences.',
            responseLength: 200,
            prompt: 'List things this character enjoys — hobbies, preferences, favorite activities, foods, etc.\n\nCharacter Brief:\n{{context}}\n\nOther fields already defined:\n{{filledFields}}\n\nUser\'s notes for this field:\n{{seedText}}',
        },
        dislikes: {
            order: 20,
            label: 'Dislikes',
            description: 'Things they dislike, pet peeves, aversions.',
            responseLength: 200,
            prompt: 'List things this character dislikes — pet peeves, aversions, things that annoy or upset them.\n\nCharacter Brief:\n{{context}}\n\nOther fields already defined:\n{{filledFields}}\n\nUser\'s notes for this field:\n{{seedText}}',
        },
        additionalNotes: {
            order: 21,
            label: 'Additional Notes',
            description: 'Anything else: lore hooks, secrets, trivia.',
            responseLength: 500,
            prompt: 'Generate additional notes for this character — lore hooks, hidden secrets, trivia, or anything else that adds depth.\n\nCharacter Brief:\n{{context}}\n\nOther fields already defined:\n{{filledFields}}\n\nUser\'s notes for this field:\n{{seedText}}',
        },
    },
};

// Schema validation is implemented in schema-validation.js using AJV.
// Re-exported here so existing imports keep working.
export { validateCharacterSchema as validateSchema } from './schema-validation.js';

/**
 * Returns fields sorted by their order property as [key, field] pairs.
 * @param {object} schema
 * @returns {Array<[string, object]>}
 */
export function getOrderedFields(schema) {
    return Object.entries(schema.fields).sort((a, b) => a[1].order - b[1].order);
}
