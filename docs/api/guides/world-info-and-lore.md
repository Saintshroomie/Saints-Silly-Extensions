# World Info and Lore

> *You want to read or modify World Info / lorebook entries from your extension.*

World Info (also called "lore" or "lorebooks") is SillyTavern's keyword-driven prompt injection system. Entries fire when their keywords appear in the recent chat, then get assembled into the prompt during generation. This guide shows how to inspect activated entries, read the current WI state, and modify entries from inside an extension.

## Minimal example

Get the fully resolved World Info text that will be injected at the next generation:

```js
// extensions/third-party/my-ext/index.js
import { getWorldInfoPrompt } from '../../../world-info.js';
import { getMaxContextSize } from '../../../../script.js';

async function previewWorldInfo() {
    const context = SillyTavern.getContext();
    const maxContext = getMaxContextSize();

    // Resolves: scans chat keywords, applies budget, returns combined WI prompt text.
    // Signature: getWorldInfoPrompt(chat, maxContext, isDryRun, globalScanData?)
    const result = await getWorldInfoPrompt(context.chat, maxContext, /* isDryRun */ true);

    console.log('Before char:', result.worldInfoBefore);
    console.log('After char:',  result.worldInfoAfter);
    console.log('EM top/bot:',  result.EMEntries);
    console.log('AN top/bot:',  result.ANEntries);
    console.log('Depth (in-chat) injections:', result.WIDepthEntries);
}
```

Pass `isDryRun: true` when you only want to inspect WI without firing side effects like activation logging.

The context shortcut is equivalent for most callers:

```js
const wi = await SillyTavern.getContext().getWorldInfoPrompt();
```

## Variations

### React to activation during generation

```js
const { eventSource, eventTypes } = SillyTavern.getContext();

eventSource.on(eventTypes.WORLD_INFO_ACTIVATED, (activatedEntries) => {
    // Each entry has: world (book name), uid, key (keywords), content, position, depth, ...
    for (const entry of activatedEntries) {
        console.log(`[WI fired] ${entry.world} → ${entry.comment || entry.key?.[0]}`);
    }
});

// Fires after a scan completes; gives you the raw scan result (mutable).
eventSource.on(eventTypes.WORLDINFO_SCAN_DONE, (scanResult) => {
    // You can prune or annotate scanResult here.
});

// Fires when the user edits a lorebook in the WI editor.
eventSource.on(eventTypes.WORLDINFO_UPDATED, (worldInfoData) => {
    rebuildMyCache(worldInfoData);
});
```

### Read the current WI state

```js
import {
    world_info,            // { globalSelect, charLore, ... } – global WI config
    selected_world_info,   // string[] – names of globally-enabled WI books
    world_names,           // string[] – every WI book filename on the server
    world_info_depth,      // number – chat-history scan depth
    world_info_budget,     // number – % of context budget WI may consume
    world_info_budget_cap, // number – hard cap in tokens (0 = none)
    MAX_SCAN_DEPTH,        // safety ceiling for recursion
} from '../../../world-info.js';

console.log('Globally enabled books:', selected_world_info);
console.log('All books on disk:',      world_names);
console.log('Scan depth (messages):',  world_info_depth);
```

The chat-bound book (a "chat lorebook") is stored in `context.chatMetadata.world_info` (key exported as `METADATA_KEY` from `world-info.js`).

### Load a specific book and inspect its entries

```js
import { loadWorldInfo } from '../../../world-info.js';

const book = await loadWorldInfo('MyCampaign');
// book.entries is keyed by uid:
for (const uid of Object.keys(book.entries)) {
    const entry = book.entries[uid];
    console.log(uid, entry.comment, entry.key, entry.position, entry.depth);
}
```

### Modify an entry's underlying data

`setWIOriginalDataValue` writes into the persisted shape that the server expects on save:

```js
import {
    loadWorldInfo,
    setWIOriginalDataValue,
    world_info_position,
    world_info_logic,
    originalWIDataKeyMap,
} from '../../../world-info.js';
import { getRequestHeaders } from '../../../../script.js';

async function setEntryAtDepth(bookName, uid, depth) {
    const data = await loadWorldInfo(bookName);

    // Update the friendly shape...
    data.entries[uid].position = world_info_position.atDepth;
    data.entries[uid].depth = depth;
    data.entries[uid].selectiveLogic = world_info_logic.AND_ANY;

    // ...and mirror into the on-disk shape using the key map.
    setWIOriginalDataValue(data, uid, originalWIDataKeyMap.position, world_info_position.atDepth);
    setWIOriginalDataValue(data, uid, originalWIDataKeyMap.depth, depth);

    // Persist via the server API.
    await fetch('/api/worldinfo/edit', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({ name: bookName, data }),
    });
}
```

### Position, strategy, and logic enums

```js
import {
    world_info_position,            // where the entry is inserted
    world_info_insertion_strategy,  // how character-bound vs. global entries interleave
    world_info_logic,               // how secondary keys combine
} from '../../../world-info.js';

// world_info_position keys you'll touch most often:
//   before          – before character description
//   after           – after character description
//   ANTop / ANBottom – Author's Note top / bottom
//   EMTop / EMBottom – Example Messages top / bottom
//   atDepth         – injected into chat history at `entry.depth`
//   beforeChar / afterChar – before/after the character card section
//   beforeAuthorsNote / afterAuthorsNote – relative to Author's Note

// world_info_insertion_strategy:
//   evenly          – interleave character and global entries
//   character_first – character entries first
//   global_first    – global entries first

// world_info_logic:
//   AND_ANY  – primary key + any secondary
//   NOT_ALL  – primary key + none of the secondaries
//   NOT_ANY  – primary key + no secondary present
//   AND_ALL  – primary key + every secondary
```

## Gotchas

- **`worldInfoCache` is a `StructuredCloneMap`.** Reads return a *clone* of the cached value, so mutating that clone does not write back. Mutate the original data object you got from `loadWorldInfo` and call the server save endpoint.
- **Saving entries requires a server round-trip.** Changes to `data.entries[...]` in memory persist only if you POST to `/api/worldinfo/edit`. Don't expect `saveSettings()` to do it.
- **Activation depends on chat content.** `WORLD_INFO_ACTIVATED` only includes entries that actually matched against the current chat slice. An entry can be enabled and still never fire.
- **`MAX_SCAN_DEPTH` is a safety ceiling.** Recursive WI scans are capped — entries that only activate through deep chains may silently drop.
- **`world_info_depth` is measured in messages, not tokens.** `world_info_budget` is the token-share percentage; `world_info_budget_cap` is an absolute cap (0 means uncapped).
- **`isDryRun` matters.** When previewing WI for UI display, pass `true` so you don't pollute internal activation state used by the real generation pass.
- **Chat-bound books live in metadata.** The chat lorebook is read from `chatMetadata[METADATA_KEY]`; switching chats changes which book is active without firing `WORLDINFO_UPDATED`.

## See also

- Reference: [`world-info.md`](../modules/world-info.md)
- Reference: [`events.md`](../modules/events.md) — see `WORLDINFO_UPDATED`, `WORLDINFO_SCAN_DONE`, `WORLD_INFO_ACTIVATED`
- Guide: [`streaming-and-events.md`](streaming-and-events.md)
- CLAUDE.md: "World Info / Lorebook Access", "Accessing Character & World Info Data"
