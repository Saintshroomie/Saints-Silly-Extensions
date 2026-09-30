// Seed a SillyTavern install's default user with test data for manual testing.
// Run it while the ST server is STOPPED (the page rewrites settings.json).
//
//   node seed.mjs [--source auto|toolkit|builtin] [--toolkit DIR] [--world SLUG] [--no-private-books]
//
// Sources:
//   toolkit — an st-toolkit checkout's build output for one world: its cards
//             (build/cards/<card>.png, with private books embedded), its lore /
//             locations / shared / scenarios books, and (unless
//             --no-private-books) each card's private book as a linked world
//             file. The world's tag ID is read from the built books.
//   builtin — a small generated world ("Test World": Ava, Ben, Cleo) with the
//             same shapes: override-variable reads, private books, a
//             names-filtered shared secret, a tag-filtered lore entry, and a
//             scenarios book with set-once overrides + an Openings block.
//   auto    — toolkit when an st-toolkit build is found, else builtin.
//
// Always: skips first-run onboarding, points Chat Completion at the stand-in
// backend (Custom, http://127.0.0.1:$FAKE_LLM_PORT/v1), tags the cards,
// activates the world's lore/locations/shared books globally, and writes a
// group "SSE Test Group" with every seeded card.
//
// Env: ST_DIR (SillyTavern checkout), FAKE_LLM_PORT (default 5005).

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// ─── Args ───

const args = process.argv.slice(2);
const flag = name => args.includes(`--${name}`);
const option = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const ST_DIR = process.env.ST_DIR;
if (!ST_DIR) throw new Error('Set ST_DIR to the SillyTavern checkout.');
const USER_DIR = path.join(ST_DIR, 'data', 'default-user');
const SETTINGS = path.join(USER_DIR, 'settings.json');
if (!fs.existsSync(SETTINGS)) {
    throw new Error(`${SETTINGS} not found: start the ST server once so it creates the default user, stop it, then seed.`);
}
const FAKE_URL = `http://127.0.0.1:${process.env.FAKE_LLM_PORT || 5005}/v1`;
const GROUP_ID = '1700000000000';
const GROUP_NAME = 'SSE Test Group';

let source = option('source', 'auto');
const toolkitDir = option('toolkit', ['/home/user/st-toolkit', path.resolve(ST_DIR, '..', 'st-toolkit')]
    .find(dir => fs.existsSync(path.join(dir, 'build'))) || '');
if (source === 'auto') source = toolkitDir ? 'toolkit' : 'builtin';

// ─── Helpers ───

function writeJson(file, data) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 4));
}

/** A World Info entry with ST's defaults. */
function wiEntry(uid, fields) {
    return {
        uid, key: [], keysecondary: [], comment: '', content: '', constant: false, vectorized: false,
        selective: true, selectiveLogic: 0, addMemo: true, order: 100, position: 1, disable: false,
        excludeRecursion: false, preventRecursion: false, delayUntilRecursion: false,
        probability: 100, useProbability: true, depth: 4, group: '', groupOverride: false, groupWeight: 100,
        scanDepth: null, caseSensitive: null, matchWholeWords: null, useGroupScoring: null,
        automationId: '', role: null, sticky: 0, cooldown: 0, delay: 0, displayIndex: uid,
        characterFilter: { names: [], tags: [], isExclude: false },
        ...fields,
    };
}

function book(entries) {
    return { entries: Object.fromEntries(entries.map(e => [String(e.uid), e])) };
}

/** Copy a PNG, replacing its character data with `card` (a tEXt 'chara' chunk). */
function writeCardPng(basePng, file, card) {
    const png = fs.readFileSync(basePng);
    const chunks = [];
    let pos = 8;
    while (pos < png.length) {
        const length = png.readUInt32BE(pos);
        const type = png.toString('latin1', pos + 4, pos + 8);
        const end = pos + 12 + length;
        const keyword = type === 'tEXt' ? png.toString('latin1', pos + 8, pos + 8 + Math.min(length, 5)) : '';
        if (!(type === 'tEXt' && (keyword === 'chara' || keyword === 'ccv3'))) chunks.push(png.subarray(pos, end));
        pos = end;
    }
    const data = Buffer.concat([Buffer.from('chara\0', 'latin1'), Buffer.from(Buffer.from(JSON.stringify(card)).toString('base64'), 'latin1')]);
    const typeAndData = Buffer.concat([Buffer.from('tEXt', 'latin1'), data]);
    const header = Buffer.alloc(4);
    header.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(typeAndData) >>> 0);
    const text = Buffer.concat([header, typeAndData, crc]);
    const iend = chunks.pop();
    fs.writeFileSync(file, Buffer.concat([png.subarray(0, 8), ...chunks, text, iend]));
}

// ─── Builtin World ───

const BUILTIN_TAG = { id: 'sse-test-world-tag', name: 'Test World' };

function builtinCharacter({ name, card, prefix, clothing, statedGoal, trueGoal, tell, greeting }) {
    const privateName = `${BUILTIN_TAG.name} - ${card} (private)`;
    const description = [
        '[',
        `Character Name: ${name};`,
        `Clothing: {{ .${prefix}ClothingOverride ?? ${clothing} }};`,
        `Stated Goal: {{ .${prefix}StatedGoalOverride ?? ${statedGoal} }};`,
        ']',
    ].join('\n');
    const privateText = [
        '[',
        `Private Mind — ${name}: known only to ${card};`,
        `True Goal: {{ .${prefix}TrueGoalOverride ?? ${trueGoal} }};`,
        `Tells: ${tell};`,
        ']',
    ].join('\n');
    const embedded = {
        name: privateName,
        entries: [{
            id: 0, keys: [], secondary_keys: [], comment: `Private — ${card}`, content: privateText,
            constant: true, selective: false, insertion_order: 100, enabled: true, position: 'after_char',
            extensions: { position: 1, depth: 4 },
        }],
    };
    const data = {
        name: card, description, personality: '', scenario: '', first_mes: greeting, mes_example: '',
        creator_notes: '', system_prompt: '', post_history_instructions: '', alternate_greetings: [],
        tags: [], creator: 'sse-manual-test', character_version: '1',
        extensions: { talkativeness: '0.5', fav: false, world: privateName, depth_prompt: { prompt: '', depth: 4, role: 'system' } },
        character_book: embedded,
    };
    return {
        card,
        json: {
            name: card, description, personality: '', scenario: '', first_mes: greeting, mes_example: '',
            creatorcomment: '', avatar: 'none', chat: '', talkativeness: '0.5', fav: false, tags: [],
            spec: 'chara_card_v2', spec_version: '2.0', data,
        },
        privateName,
        privateBook: book([wiEntry(0, { comment: `Private — ${card}`, content: privateText, constant: true })]),
    };
}

function seedBuiltin() {
    const characters = [
        builtinCharacter({
            name: 'Ava Stone', card: 'Ava', prefix: 'ava',
            clothing: 'Weathered denim jacket, grey scarf, work boots',
            statedGoal: 'Keep the boat running and the crew paid',
            trueGoal: 'Sell the boat before the bank finds out about the loan',
            tell: 'taps the counter when she lies',
            greeting: 'Ava looked up from the charts. "You\'re late."',
        }),
        builtinCharacter({
            name: 'Ben Ortiz', card: 'Ben', prefix: 'ben',
            clothing: 'Yellow rain slicker, cargo shorts, deck shoes',
            statedGoal: 'Learn the trade and earn a share of the catch',
            trueGoal: 'Find out who has been skimming the fuel money',
            tell: 'goes quiet and counts things',
            greeting: 'Ben dropped a crate on the dock. "That\'s the last of them."',
        }),
        builtinCharacter({
            name: 'Cleo', card: 'Cleo', prefix: 'cleo',
            clothing: 'Harbormaster\'s navy uniform, brass whistle',
            statedGoal: 'Keep the harbor safe through the storm season',
            trueGoal: 'Get Ava\'s boat impounded so her brother can buy it cheap',
            tell: 'polishes the whistle when nervous',
            greeting: 'Cleo blew the whistle once. "Storm by noon, people."',
        }),
    ];
    const tagFilter = { names: [], tags: [BUILTIN_TAG.id], isExclude: false };
    const scenario = (title, focus, card, overrides, opening) => [
        '[',
        `Scenario Title: ${title};`,
        'Context: A storm is due by noon and the boat must be loaded before it hits;',
        'Location: The Harbor Market, dawn, fog over the water;',
        `Opening Focus: ${focus};`,
        ...overrides.map(([v, value]) => `{{if !.${v}}}{{.${v} = ${value}}}{{/if}}`),
        ']',
        '{{if !lastCharMessage}}{{.openingSpeaker = {{char}}}}',
        `{{if {{.openingSpeaker == ${card}}}}}[Opening: this is the start of the chat; ${card} speaks first and opens the scene with the message below as their own, adapted to anything already written, then continues normally;`,
        `${opening}]{{/if}}`,
        '{{/if}}',
    ].join('\n');
    const books = {
        'testworld-lore': book([
            wiEntry(0, { comment: 'Harbor Market', key: ['Harbor Market', 'the market'], content: '[Harbor Market: fish stalls, rope sellers, and a fuel dock; opens at dawn;]', characterFilter: tagFilter }),
        ]),
        'testworld-shared': book([
            wiEntry(0, { comment: 'Shared — The Loan', content: '[Shared Knowledge — The Loan: known to Ava and Ben; the boat is mortgaged to the bank;]', constant: true, characterFilter: { names: ['Ava', 'Ben'], tags: [], isExclude: false } }),
            wiEntry(1, { comment: 'Shared — The Storm', content: '[Shared Knowledge — The Storm: known to Ava, Ben and Cleo; it will hit by noon;]', constant: true, characterFilter: { names: ['Ava', 'Ben', 'Cleo'], tags: [], isExclude: false } }),
        ]),
        'testworld-scenarios': book([
            wiEntry(0, {
                comment: 'Scenario — Market Morning', constant: true, disable: true, order: 50, characterFilter: tagFilter,
                content: scenario('Market Morning', 'Ava haggling at a fish stall while Ben carries crates', 'Ava',
                    [['avaClothingOverride', 'Oilskin coat over a wool sweater, rubber boots'], ['benStatedGoalOverride', 'Get every crate aboard before the rain']],
                    'Ava slapped a coin on the counter. "Two of the silver ones, and don\'t pretend they\'re fresh."'),
            }),
            wiEntry(1, {
                comment: 'Scenario — Harbor Inspection', constant: true, disable: true, order: 50, characterFilter: tagFilter,
                content: scenario('Harbor Inspection', 'Cleo boarding Ava\'s boat with a clipboard', 'Cleo',
                    [['cleoStatedGoalOverride', 'Inspect every boat before the storm']],
                    'Cleo stepped aboard without asking. "Papers, Ava. All of them."'),
            }),
        ]),
    };
    const basePng = path.join(ST_DIR, 'public', 'img', 'ai4.png');
    for (const c of characters) writeCardPng(basePng, path.join(USER_DIR, 'characters', `${c.card}.png`), c.json);
    for (const [name, data] of Object.entries(books)) writeJson(path.join(USER_DIR, 'worlds', `${name}.json`), data);
    if (!flag('no-private-books')) {
        for (const c of characters) writeJson(path.join(USER_DIR, 'worlds', `${c.privateName}.json`), c.privateBook);
    }
    return {
        tag: BUILTIN_TAG,
        cards: characters.map(c => c.card),
        globalBooks: ['testworld-lore', 'testworld-shared'],
        books: Object.keys(books),
    };
}

// ─── st-toolkit World ───

function seedToolkit() {
    if (!toolkitDir) throw new Error('No st-toolkit build found; pass --toolkit DIR or use --source builtin.');
    const build = path.join(toolkitDir, 'build');
    const world = option('world', 'spider-man');
    const worldBooks = fs.readdirSync(build).filter(f => f.startsWith(`${world}-`) && f.endsWith('.json'));
    if (!worldBooks.length) throw new Error(`No build/${world}-*.json books in ${toolkitDir}.`);

    // The tag ID from the built books' Character Filters; the name from book.yaml.
    let tagId = null;
    for (const file of worldBooks) {
        const data = JSON.parse(fs.readFileSync(path.join(build, file), 'utf8'));
        tagId = Object.values(data.entries || {}).flatMap(e => e.characterFilter?.tags || [])[0] || null;
        if (tagId) break;
    }
    if (!tagId) throw new Error(`No tag ID in build/${world}-*.json (the world's tag has no ST ID yet?).`);
    const bookYaml = path.join(toolkitDir, 'worlds', world, 'book.yaml');
    const tagName = (fs.existsSync(bookYaml) && fs.readFileSync(bookYaml, 'utf8').match(/^tag:\s*(.+?)\s*(#.*)?$/m)?.[1]) || world;

    // Cards: those with a private book filed under this world's tag.
    const privateDir = path.join(build, 'private');
    const privateFiles = fs.existsSync(privateDir)
        ? fs.readdirSync(privateDir).filter(f => f.startsWith(`${tagName} - `) && f.endsWith(' (private).json'))
        : [];
    const cards = [];
    for (const file of privateFiles) {
        const card = file.slice(`${tagName} - `.length, -' (private).json'.length);
        const png = path.join(build, 'cards', `${card}.png`);
        if (!fs.existsSync(png)) continue;
        fs.copyFileSync(png, path.join(USER_DIR, 'characters', `${card}.png`));
        cards.push(card);
        if (!flag('no-private-books')) fs.copyFileSync(path.join(privateDir, file), path.join(USER_DIR, 'worlds', file));
    }
    for (const file of worldBooks) fs.copyFileSync(path.join(build, file), path.join(USER_DIR, 'worlds', file));
    const books = worldBooks.map(f => f.replace(/\.json$/, ''));
    return {
        tag: { id: tagId, name: tagName },
        cards,
        globalBooks: books.filter(b => !b.endsWith('-scenarios')),
        books,
    };
}

// ─── Settings & Group ───

const seeded = source === 'toolkit' ? seedToolkit() : seedBuiltin();

const settings = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
settings.firstRun = false;
settings.main_api = 'openai';
settings.oai_settings = {
    ...settings.oai_settings,
    chat_completion_source: 'custom',
    custom_url: FAKE_URL,
    custom_model: 'fake-model',
    stream_openai: true,
};
settings.power_user = { ...settings.power_user, auto_connect: true };
settings.tags = [
    ...(settings.tags || []).filter(t => t.id !== seeded.tag.id),
    { id: seeded.tag.id, name: seeded.tag.name, folder_type: 'NONE', filter_state: 'UNDEFINED', sort_order: 0, color: '', color2: '', create_date: 0 },
];
settings.tag_map = settings.tag_map || {};
for (const card of seeded.cards) {
    const key = `${card}.png`;
    settings.tag_map[key] = [...new Set([...(settings.tag_map[key] || []), seeded.tag.id])];
}
settings.world_info_settings = settings.world_info_settings || {};
settings.world_info_settings.world_info = { ...settings.world_info_settings.world_info, globalSelect: seeded.globalBooks };
writeJson(SETTINGS, settings);

writeJson(path.join(USER_DIR, 'groups', `${GROUP_ID}.json`), {
    id: GROUP_ID, name: GROUP_NAME, members: seeded.cards.map(c => `${c}.png`), avatar_url: '',
    allow_self_responses: false, activation_strategy: 0, generation_mode: 0, disabled_members: [], fav: false,
    chat_id: GROUP_ID, chats: [GROUP_ID], auto_mode_delay: 5,
    generation_mode_join_prefix: '', generation_mode_join_suffix: '',
});

console.log(JSON.stringify({ source, toolkitDir: source === 'toolkit' ? toolkitDir : null, ...seeded, group: GROUP_NAME, fakeUrl: FAKE_URL }, null, 2));
