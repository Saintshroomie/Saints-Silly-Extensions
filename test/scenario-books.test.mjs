import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    scenarioTitle,
    findTaggedScenarios,
    characterFileName,
    characterLoreBooks,
    entryPassesCharacterFilter,
    entryVisibleToAll,
    defaultChatLoreBooks,
} from '../src/scenario-books.js';
import { stripOuterBrackets } from '../src/text-utils.js';

const SPIDER = '08be3cdf-c127-490d-9182-fd9c90f4dff6';
const EVA = 'eva-tag';

// Shaped like st-toolkit's build/<world>-scenarios.json.
const SCENARIO_CONTENT = '[\nScenario Title: Stingrays at Moorea;\nContext: Day two of the cruise;\n'
    + '{{if !.peterClothingOverride}}{{.peterClothingOverride = Board shorts}}{{/if}}\n]\n'
    + '{{if !lastCharMessage}}{{.openingSpeaker = {{char}}}}\n'
    + '{{if {{.openingSpeaker == MJ}}}}[Opening: this is the start of the chat; MJ speaks first ...]{{/if}}\n{{/if}}';

const spiderBook = {
    name: 'spider-man-scenarios',
    entries: {
        5: { uid: 5, comment: 'Scenario — Stingrays at Moorea', content: SCENARIO_CONTENT, disable: true,
            characterFilter: { names: [], tags: [SPIDER], isExclude: false } },
        2: { uid: 2, comment: 'Scenario — Dinner on the Sandbar', content: '[\nScenario Title: Dinner;\n]', disable: true,
            characterFilter: { names: [], tags: [SPIDER], isExclude: false } },
        9: { uid: 9, comment: 'Scenario — Empty', content: '  ', characterFilter: { tags: [SPIDER] } },
    },
};
const evaBook = {
    name: 'evangelion-scenarios',
    entries: { 0: { uid: 0, comment: 'Scenario - Top of the Chart', content: '[x]', characterFilter: { tags: [EVA] } } },
};
const loreBook = {
    name: 'spider-man-lore',
    entries: { 0: { uid: 0, comment: 'Oscorp', content: '[Oscorp: ...]', characterFilter: { tags: [SPIDER] } } },
};

test('scenarioTitle reads st-toolkit scenario comments', () => {
    assert.equal(scenarioTitle({ comment: 'Scenario — Stingrays at Moorea' }), 'Stingrays at Moorea');
    assert.equal(scenarioTitle({ comment: 'Scenario - Plain Hyphen' }), 'Plain Hyphen');
    assert.equal(scenarioTitle({ comment: 'Oscorp' }), null);
    assert.equal(scenarioTitle({}), null);
});

test('findTaggedScenarios returns only scenarios tagged for this chat, sorted', () => {
    const found = findTaggedScenarios([spiderBook, evaBook, loreBook], [SPIDER, 'other']);
    assert.deepEqual(found.map(s => [s.book, s.uid, s.title]), [
        ['spider-man-scenarios', 2, 'Dinner on the Sandbar'],
        ['spider-man-scenarios', 5, 'Stingrays at Moorea'],
    ]);
    assert.equal(found[1].content, SCENARIO_CONTENT);
});

test('findTaggedScenarios needs a tag match and skips exclude filters', () => {
    assert.deepEqual(findTaggedScenarios([spiderBook], []), []);
    assert.deepEqual(findTaggedScenarios([spiderBook], [EVA]), []);
    const excluded = { name: 'b', entries: { 0: { comment: 'Scenario — X', content: 'x', characterFilter: { tags: [SPIDER], isExclude: true } } } };
    assert.deepEqual(findTaggedScenarios([excluded], [SPIDER]), []);
    const unfiltered = { name: 'b', entries: { 0: { comment: 'Scenario — X', content: 'x' } } };
    assert.deepEqual(findTaggedScenarios([unfiltered], [SPIDER]), []);
});

test('characterFileName drops the extension', () => {
    assert.equal(characterFileName('Peter.png'), 'Peter');
    assert.equal(characterFileName('Mary Jane.v2.png'), 'Mary Jane.v2');
});

const peter = { fileName: 'Peter', tagIds: [SPIDER] };
const mj = { fileName: 'MJ', tagIds: [SPIDER] };
const untagged = { fileName: 'Loner', tagIds: null };

test('entryPassesCharacterFilter mirrors ST: names, then tags, inverted by isExclude', () => {
    assert.equal(entryPassesCharacterFilter({}, peter), true);
    assert.equal(entryPassesCharacterFilter({ characterFilter: { names: ['Peter'] } }, peter), true);
    assert.equal(entryPassesCharacterFilter({ characterFilter: { names: ['Peter'] } }, mj), false);
    assert.equal(entryPassesCharacterFilter({ characterFilter: { names: ['Peter'], isExclude: true } }, peter), false);
    assert.equal(entryPassesCharacterFilter({ characterFilter: { tags: [EVA] } }, peter), false);
    assert.equal(entryPassesCharacterFilter({ characterFilter: { tags: [SPIDER] } }, peter), true);
    // No tag-map entry: ST skips the tag check.
    assert.equal(entryPassesCharacterFilter({ characterFilter: { tags: [EVA] } }, untagged), true);
});

test('entryVisibleToAll keeps shared secrets and private layers out of group guidance', () => {
    const sharedSecret = { characterFilter: { names: ['Peter', 'Harry'] } };
    const worldLore = { characterFilter: { tags: [SPIDER] } };
    assert.equal(entryVisibleToAll(sharedSecret, [peter, mj]), false);
    assert.equal(entryVisibleToAll(sharedSecret, [peter]), true);
    assert.equal(entryVisibleToAll(worldLore, [peter, mj]), true);
    assert.equal(entryVisibleToAll(sharedSecret, []), true);
});

test('defaultChatLoreBooks lists what ST applies, without group members\' own books', () => {
    const sources = {
        globalBooks: ['spider-man-lore', 'spider-man-shared'],
        chatBook: 'Chat Notes',
        personaBook: 'spider-man-lore',
        characterBooks: ['Spider-Man - Peter (private)'],
        available: ['spider-man-lore', 'spider-man-shared', 'Chat Notes', 'Spider-Man - Peter (private)'],
    };
    assert.deepEqual(defaultChatLoreBooks(sources),
        ['spider-man-lore', 'spider-man-shared', 'Chat Notes', 'Spider-Man - Peter (private)']);
    assert.deepEqual(defaultChatLoreBooks({ ...sources, isGroup: true }),
        ['spider-man-lore', 'spider-man-shared', 'Chat Notes']);
    assert.deepEqual(defaultChatLoreBooks({ ...sources, available: ['Chat Notes'] }), ['Chat Notes']);
    assert.deepEqual(defaultChatLoreBooks(), []);
});

test('stripOuterBrackets unwraps a whole block only', () => {
    assert.equal(stripOuterBrackets('[\nScenario Title: A;\nContext: B;\n]'), 'Scenario Title: A;\nContext: B;');
    // A scenario's Openings follow its closing bracket: leave it whole.
    assert.equal(stripOuterBrackets(SCENARIO_CONTENT), SCENARIO_CONTENT);
    assert.equal(stripOuterBrackets('[a] then [b]'), '[a] then [b]');
    // Nested brackets inside the block.
    assert.equal(stripOuterBrackets('[Outer [inner] text]'), 'Outer [inner] text');
    // Stopped mid-block: drop the opener only.
    assert.equal(stripOuterBrackets('[\nScenario Title: A;\nContext: half'), 'Scenario Title: A;\nContext: half');
    // A stray closer with no opener, as before.
    assert.equal(stripOuterBrackets('steer toward the storm]'), 'steer toward the storm');
    assert.equal(stripOuterBrackets('plain guidance'), 'plain guidance');
    assert.equal(stripOuterBrackets(''), '');
});

test('characterLoreBooks lists the linked book, then additional books', () => {
    const char = { avatar: 'Peter.png', data: { extensions: { world: 'Spider-Man - Peter (private)' } } };
    const charLore = [{ name: 'Peter', extraBooks: ['Peter Extras', 'Spider-Man - Peter (private)'] }, { name: 'MJ', extraBooks: ['x'] }];
    assert.deepEqual(characterLoreBooks(char, charLore), ['Spider-Man - Peter (private)', 'Peter Extras']);
    assert.deepEqual(characterLoreBooks({ avatar: 'Nobody.png' }, charLore), []);
    assert.deepEqual(characterLoreBooks(null), []);
});
