import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avatarFromRowThumbnail, resolveGroupMemberRow } from '../src/group-members.js';

const CHARACTERS = [
    { name: 'Harry', avatar: 'Harry.png' },
    { name: 'MJ', avatar: 'MJ.png' },
    { name: 'Peter', avatar: 'Peter.png' },
];

/** A minimal stand-in for a `.group_member` row element. */
function row({ attrs = {}, img = null, name = null, title = null } = {}) {
    return {
        getAttribute: key => (key in attrs ? attrs[key] : null),
        querySelector: selector => {
            if (selector === 'img') return img === null ? null : { getAttribute: () => img };
            if (selector === '.ch_name') {
                return name === null && title === null ? null : {
                    textContent: name ?? '',
                    getAttribute: key => (key === 'title' ? title : null),
                };
            }
            return null;
        },
    };
}

const resolve = entry => {
    const { character, avatar, name } = resolveGroupMemberRow(entry, CHARACTERS);
    return { character: character?.name ?? null, avatar, name };
};

test('current ST rows: data-chid', () => {
    assert.deepEqual(resolve(row({ attrs: { 'data-chid': '2' } })),
        { character: 'Peter', avatar: 'Peter.png', name: 'Peter' });
});

test('older ST rows: bare chid', () => {
    assert.deepEqual(resolve(row({ attrs: { chid: '1' } })),
        { character: 'MJ', avatar: 'MJ.png', name: 'MJ' });
});

test('data-chid wins over a leftover chid', () => {
    assert.equal(resolve(row({ attrs: { 'data-chid': '0', chid: '2' } })).character, 'Harry');
});

test('index 0 resolves (not treated as missing)', () => {
    assert.equal(resolve(row({ attrs: { 'data-chid': '0' } })).character, 'Harry');
});

test('the thumbnail wins when a stale index points elsewhere', () => {
    const entry = row({ attrs: { 'data-chid': '0' }, img: '/thumbnail?type=avatar&file=Peter.png' });
    assert.equal(resolve(entry).character, 'Peter');
});

test('thumbnail alone resolves a row with no index', () => {
    assert.equal(resolve(row({ img: '/thumbnail?type=avatar&file=MJ.png' })).character, 'MJ');
    assert.equal(resolve(row({ img: '/characters/Harry.png' })).character, 'Harry');
});

test('legacy grid attribute holds an avatar file', () => {
    assert.equal(resolve(row({ attrs: { grid: 'MJ.png' } })).character, 'MJ');
});

test('unknown character keeps the avatar and the row name', () => {
    assert.deepEqual(resolve(row({ img: '/thumbnail?type=avatar&file=Ghost%20Girl.png', name: 'Ghost Girl' })),
        { character: null, avatar: 'Ghost Girl.png', name: 'Ghost Girl' });
    assert.equal(resolve(row({ title: 'Titled' })).name, 'Titled');
});

test('garbage indexes are ignored', () => {
    assert.deepEqual(resolve(row({ attrs: { 'data-chid': 'abc', chid: '' } })),
        { character: null, avatar: null, name: null });
    assert.equal(resolve(row({ attrs: { 'data-chid': '99' }, img: '/characters/Peter.png' })).character, 'Peter');
});

test('avatarFromRowThumbnail decodes and tolerates bad escapes', () => {
    assert.equal(avatarFromRowThumbnail(row({ img: '/thumbnail?type=avatar&file=A%20B.png&t=1' })), 'A B.png');
    assert.equal(avatarFromRowThumbnail(row({ img: '/thumbnail?file=100%.png' })), '100%.png');
    assert.equal(avatarFromRowThumbnail(row({})), null);
});
