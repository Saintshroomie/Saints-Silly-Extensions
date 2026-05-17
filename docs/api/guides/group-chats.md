# Make your extension group-chat aware

> *You want your extension to behave correctly in both solo (1:1) chats
> and group chats with multiple characters.*

Group chats add three twists: (1) `context.characterId` is undefined,
(2) generation cycles through multiple characters, and (3)
`CHARACTER_MESSAGE_RENDERED` fires once per member per turn.

## Minimal example — detect group mode

```js
import { selected_group, groups } from '../../../group-chats.js';

const ctx = SillyTavern.getContext();

if (selected_group) {
    const group = groups.find(g => g.id === selected_group);
    console.log('Group:', group.name, 'Members:', group.members);
} else {
    const char = ctx.characters[ctx.characterId];
    console.log('Solo:', char.name);
}
```

`selected_group` is the truthy ID of the active group or `null` for
solo. `groups` is an array of every loaded group. `group.members` is an
array of character avatar filenames — map them back to characters via
`ctx.characters.find(c => c.avatar === avatar)`.

## Variations

### Wait for group generation to finish

```js
import { waitUntilCondition } from '../../../utils.js';
import { is_group_generating, selected_group } from '../../../group-chats.js';

if (selected_group) {
    await waitUntilCondition(() => is_group_generating === false, 1000, 10);
}
// safe to act — all members are done generating
```

`is_group_generating` is `true` while the orchestrator is cycling
through members. Don't trigger side effects (like writing memory) on
every `CHARACTER_MESSAGE_RENDERED` in a group — wait for the cycle to
end.

### Collect every member's description (e.g. for an arc prompt)

```js
const ctx = SillyTavern.getContext();
const group = groups.find(g => g.id === selected_group);

const descriptions = group.members
    .map(avatar => ctx.characters.find(c => c.avatar === avatar))
    .filter(Boolean)
    .map(c => `${c.name}: ${c.description}`)
    .join('\n\n');
```

Members may be "shallow" copies on first load. If you find missing
fields, call `unshallowGroupMembers(group.id)` first.

### Know which member just spoke

```js
const { eventSource, eventTypes } = SillyTavern.getContext();

eventSource.on(eventTypes.GROUP_MEMBER_DRAFTED, (characterId) => {
    console.log('About to generate for character ID:', characterId);
});
```

`GROUP_MEMBER_DRAFTED` fires *before* each member's turn within the
cycle. Combined with `is_group_generating`, you can distinguish "still
cycling" from "cycle complete".

### Scope per-chat data correctly

```js
function getMemoryFileId() {
    const ctx = SillyTavern.getContext();
    if (selected_group) {
        const group = groups.find(g => g.id === selected_group);
        return `${sanitize(group.name)}_${ctx.chatId}`;
    } else {
        const char = ctx.characters[ctx.characterId];
        return `${sanitize(char.name)}_${ctx.chatId}`;
    }
}
```

If your extension stores per-chat data, build the storage key from the
group name (in groups) or character name (in solo) plus `chatId`.
Falling back to `characterId` in a group will give you `undefined`.

### Read per-member depth prompts

```js
import { getGroupDepthPrompts } from '../../../group-chats.js';

const prompts = getGroupDepthPrompts(selected_group, characterId);
// → array of { text, depth, role } objects
```

Useful when you want to surface the per-member depth prompt in your UI
or include it in a summary.

### Detect group activation strategy

```js
import { group_activation_strategy } from '../../../group-chats.js';

const group = groups.find(g => g.id === selected_group);
if (group.activation_strategy === group_activation_strategy.LIST) {
    // round-robin through the member list
}
```

Strategies differ in how the next speaker is chosen (natural, list,
manual, pooled). The enum lets you reason about it without
hard-coding numeric values.

## Gotchas

- **`context.characterId` is undefined in groups.** Always guard with
  `if (selected_group)` before using it.
- **`CHARACTER_MESSAGE_RENDERED` fires per member.** If you have a
  "react when a turn ends" handler, debounce or wait for
  `is_group_generating === false`.
- **Members may be shallow on first load.** Call
  `unshallowGroupMembers(groupId)` if `description` etc. come back
  empty.
- **Generating manually requires picking a member.** ST's
  `Generate(type)` will cycle through the configured strategy — you
  generally do *not* want to manually start a generation in a group
  from an extension; let ST orchestrate.
- **The user's persona behavior can change in groups.** Read
  `power_user.persona_description_position` if you display the
  persona — its placement can shift per-group.

## See also

- Reference: [`group-chats.md`](../modules/group-chats.md) — full
  function and constant inventory.
- Reference: [`utils.md`](../modules/utils.md) for
  `waitUntilCondition`.
- Reference: [`events.md`](../modules/events.md) — group-specific
  events (`GROUP_UPDATED`, `GROUP_MEMBER_DRAFTED`, etc.).
- Guide: [`personas-and-users.md`](personas-and-users.md) — persona
  behavior changes between solo and group.
- CLAUDE.md: "Group Chat Integration".
