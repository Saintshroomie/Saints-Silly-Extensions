import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    matchSpeakerLines,
    parseWalkOnSegments,
    resolveAnchorChid,
    fallbackPick,
    resolveMemberChid,
    sameRosterEntry,
    parsePick,
    isInPlaceGeneration,
    walkOnNameOf,
    pickWalkOnHostAvatar,
} from '../src/director-parsing.js';

const names = text => matchSpeakerLines(text).map(m => m.name);

test('matchSpeakerLines finds bracketed speakers anywhere, several per line', () => {
    assert.deepEqual(names('She waved. [Tony Stark]: "Hey." [Pepper]: "Hi."'), ['Tony Stark', 'Pepper']);
});

test('matchSpeakerLines finds a bare Name: only at the start of a line', () => {
    assert.deepEqual(names('Peter looked up.\nMarcus: "You made it."'), ['Marcus']);
    assert.deepEqual(names('He said Marcus: "no".'), []);
});

test('matchSpeakerLines ignores meta-tags and sentence openers', () => {
    assert.deepEqual(names('[OOC]: brb\nNote: this is fine\nThen: he left'), []);
});

test('matchSpeakerLines requires a name-shaped label followed by a space or quote', () => {
    assert.deepEqual(names('Time:12 noon'), []);
    assert.deepEqual(names('lowercase: "x"'), []);
    assert.deepEqual(names('One Two Three Four Five: "x"'), []);
    assert.deepEqual(names('Mary Jane Watson: "x"'), ['Mary Jane Watson']);
});

test('parseWalkOnSegments splits the head from each speaker\'s text', () => {
    const parsed = parseWalkOnSegments('Peter shrugged.\nMarcus: "Late again."\n[Tony]: "Relax."');
    assert.equal(parsed.head, 'Peter shrugged.\n');
    assert.deepEqual(parsed.segments, [
        { name: 'Marcus', text: '"Late again."' },
        { name: 'Tony', text: '"Relax."' },
    ]);
    assert.deepEqual(parseWalkOnSegments('No speakers here.'), { head: 'No speakers here.', segments: [] });
});

// A small group: three members plus one walk-on.
const characters = [
    { name: 'Peter', avatar: 'peter.png' },
    { name: 'MJ', avatar: 'mj.png' },
    { name: 'Harry', avatar: 'harry.png' },
];
const roster = [
    { kind: 'member', chid: 0, name: 'Peter', avatar: 'peter.png' },
    { kind: 'member', chid: 1, name: 'MJ', avatar: 'mj.png' },
    { kind: 'walkon', name: 'Marcus' },
    { kind: 'member', chid: 2, name: 'Harry', avatar: 'harry.png' },
];
const ctxWithLastSpeaker = message => ({ characters, chat: [{ is_user: true, name: 'Me', mes: 'hi' }, message] });

test('resolveAnchorChid finds the last character speaker by avatar, then by name', () => {
    assert.equal(resolveAnchorChid(ctxWithLastSpeaker({ name: 'MJ', original_avatar: 'mj.png' })), 1);
    assert.equal(resolveAnchorChid(ctxWithLastSpeaker({ name: '?', force_avatar: '/characters/harry.png' })), 2);
    assert.equal(resolveAnchorChid(ctxWithLastSpeaker({ name: 'peter' })), 0);
    assert.equal(resolveAnchorChid({ characters, chat: [{ is_user: true, name: 'Me' }] }), null);
    assert.equal(resolveAnchorChid(ctxWithLastSpeaker({ name: 'Narrator', is_system: true })), null);
});

test('fallbackPick takes the next real member after the last speaker, wrapping and skipping walk-ons', () => {
    assert.equal(fallbackPick(roster, ctxWithLastSpeaker({ name: 'Peter' })).name, 'MJ');
    assert.equal(fallbackPick(roster, ctxWithLastSpeaker({ name: 'MJ' })).name, 'Harry');
    assert.equal(fallbackPick(roster, ctxWithLastSpeaker({ name: 'Harry' })).name, 'Peter');
    // Nobody has spoken yet: the first member.
    assert.equal(fallbackPick(roster, { characters, chat: [] }).name, 'Peter');
});

test('resolveMemberChid prefers avatar, then name, then a still-valid captured index', () => {
    const reordered = [characters[2], characters[0], characters[1]];
    assert.equal(resolveMemberChid({ characters: reordered }, roster[0]), 1);
    assert.equal(resolveMemberChid({ characters: reordered }, { name: 'mj', chid: 0 }), 2);
    assert.equal(resolveMemberChid({ characters }, { chid: 2 }), 2);
    assert.equal(resolveMemberChid({ characters }, { name: 'Gone', avatar: 'gone.png', chid: 9 }), null);
});

test('sameRosterEntry compares members by chid and walk-ons by name', () => {
    assert.ok(sameRosterEntry(roster[1], { kind: 'member', chid: 1, name: 'renamed' }));
    assert.ok(sameRosterEntry(roster[2], { kind: 'walkon', name: 'marcus' }));
    assert.ok(!sameRosterEntry(roster[0], roster[1]));
    assert.ok(!sameRosterEntry(roster[2], { kind: 'member', chid: 2, name: 'Marcus' }));
    assert.ok(!sameRosterEntry(null, roster[0]));
});

test('parsePick reads a roster number first, then an exact, contained, or partial name', () => {
    const ctx = ctxWithLastSpeaker({ name: 'Peter' });
    assert.equal(parsePick('2', roster, ctx).name, 'MJ');
    assert.equal(parsePick('**3.**', roster, ctx).name, 'Marcus');
    assert.equal(parsePick('Harry', roster, ctx).name, 'Harry');
    assert.equal(parsePick('I think MJ should speak', roster, ctx).name, 'MJ');
    assert.equal(parsePick('Harr', roster, ctx).name, 'Harry');
});

test('parsePick falls back deterministically and reports the unusable reply', () => {
    const ctx = ctxWithLastSpeaker({ name: 'MJ' });
    const misses = [];
    assert.equal(parsePick('nobody', roster, ctx, reply => misses.push(reply)).name, 'Harry');
    assert.equal(parsePick('', roster, ctx).name, 'Harry');
    // An out-of-range number with no name match falls back too.
    assert.equal(parsePick('9', roster, ctx).name, 'Harry');
    assert.deepEqual(misses, ['nobody']);
});

test('isInPlaceGeneration is true only for swipe and continue', () => {
    assert.equal(isInPlaceGeneration('swipe'), true);
    assert.equal(isInPlaceGeneration('continue'), true);
    for (const type of ['normal', 'quiet', 'impersonate', 'regenerate', undefined]) {
        assert.equal(isInPlaceGeneration(type), false);
    }
});

test('walkOnNameOf reads the walk-on tag and recognises untagged split walk-ons', () => {
    const chars = [{ name: 'Susan', avatar: 'susan.png' }];
    assert.equal(walkOnNameOf({ name: 'Tony', extra: { sseWalkOn: 'Tony' } }, chars), 'Tony');
    assert.equal(walkOnNameOf({ name: 'Tony', extra: { sseWalkOnSplit: true } }, chars), 'Tony');
    // A split line that went to a real character, or one already hosted, isn't a walk-on.
    assert.equal(walkOnNameOf({ name: 'Susan', extra: { sseWalkOnSplit: true } }, chars), null);
    assert.equal(walkOnNameOf({ name: 'Tony', original_avatar: 'susan.png', extra: { sseWalkOnSplit: true } }, chars), null);
    assert.equal(walkOnNameOf({ name: 'Susan', original_avatar: 'susan.png', extra: {} }, chars), null);
    assert.equal(walkOnNameOf({ name: 'Tony', is_user: true, extra: { sseWalkOn: 'Tony' } }, chars), null);
    assert.equal(walkOnNameOf(undefined, chars), null);
});

test('pickWalkOnHostAvatar keeps a valid host, then the last member speaker, then the first unmuted member', () => {
    const characters = [
        { name: 'Susan', avatar: 'susan.png' },
        { name: 'Peter', avatar: 'peter.png' },
        { name: 'Outsider', avatar: 'out.png' },
    ];
    const group = { members: ['susan.png', 'peter.png'], disabled_members: ['susan.png'] };
    const walkOn = { name: 'Tony', extra: { sseWalkOn: 'Tony' } };

    const hosted = { ...walkOn, original_avatar: 'susan.png' };
    assert.equal(pickWalkOnHostAvatar({ characters, chat: [hosted] }, group, hosted), 'susan.png');

    const chat = [{ name: 'Susan', original_avatar: 'susan.png' }, walkOn];
    assert.equal(pickWalkOnHostAvatar({ characters, chat }, group, walkOn), 'susan.png');

    // The last speaker isn't in the group (or nobody spoke): first unmuted member.
    const outsider = [{ name: 'Outsider', original_avatar: 'out.png' }, walkOn];
    assert.equal(pickWalkOnHostAvatar({ characters, chat: outsider }, group, walkOn), 'peter.png');
    const stale = { ...walkOn, original_avatar: 'gone.png' };
    assert.equal(pickWalkOnHostAvatar({ characters, chat: [stale] }, group, stale), 'peter.png');

    assert.equal(pickWalkOnHostAvatar({ characters, chat: [walkOn] }, { members: ['susan.png'], disabled_members: ['susan.png'] }, walkOn), 'susan.png');
    assert.equal(pickWalkOnHostAvatar({ characters, chat: [walkOn] }, { members: [] }, walkOn), null);
});
