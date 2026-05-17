# Inject Into Prompts

> *You want to inject extra context into the LLM's prompt at generation time (memory, lore, status blocks, instructions).*

`setExtensionPrompt` is the primary mechanism. You give it a unique **key**, a string **value**, a **position** (where it goes in the prompt), a **depth** (how far back from the latest message, for in-chat injections), an optional **scan** flag (whether World Info keyword scanning sees the text), and an optional **role** (system / user / assistant). Each unique key is independent — different parts of your extension can manage their own injections without overwriting each other.

## Minimal example

```js
import {
    setExtensionPrompt,
    extension_prompt_types,
    extension_prompt_roles,
} from '../../../../script.js';

// Inject a summary block four messages above the bottom of the chat,
// as a system message, not scanned by World Info.
setExtensionPrompt(
    'myext_summary',                       // unique key
    '[Story So Far:\nA went to B and met C.\n]', // content
    extension_prompt_types.IN_CHAT,        // position: in chat history at depth
    4,                                     // depth: 4 messages back from latest
    false,                                 // scan: don't include in WI keyword scan
    extension_prompt_roles.SYSTEM,         // role: system message
);

// Later, to disable it (without losing the key):
setExtensionPrompt('myext_summary', '', extension_prompt_types.NONE, 0);
```

## Variations

### 1. Position types

`extension_prompt_types` constants:

| Constant | Value | Behavior |
|----------|-------|----------|
| `NONE` | `-1` | Disabled — not injected at all. Use to turn off a key without deleting it. |
| `IN_PROMPT` | `0` | Injected into the system-prompt area, after the story string. |
| `IN_CHAT` | `1` | Injected into chat history at the specified **depth**. |
| `BEFORE_PROMPT` | `2` | Injected before the system prompt. |

For `IN_CHAT`, lower depth = closer to the end of the chat = more recent / higher weight from the LLM. Depth `0` lands immediately after the latest message; depth `4` is four messages back.

When multiple injections share the same depth, they're ordered by role: **system → user → assistant**.

### 2. Roles

`extension_prompt_roles` constants:

```js
extension_prompt_roles.SYSTEM    // 0 — default
extension_prompt_roles.USER      // 1
extension_prompt_roles.ASSISTANT // 2
```

Choose based on how you want the LLM to treat the content. System for instructions and out-of-character context; user for "the user said" framing; assistant for prefilling or modeling assistant behavior.

### 3. Multi-key strategy — three independent injections

Different content types deserve different keys so they don't clobber each other:

```js
import {
    setExtensionPrompt,
    extension_prompt_types,
    extension_prompt_roles,
    substituteParamsExtended,
} from '../../../../script.js';

const KEY_SCENES = 'myext_scenes';
const KEY_ARC    = 'myext_arc';
const KEY_FACTS  = 'myext_facts';

function refreshInjections({ scenesText, arcText, factsText }) {
    setExtensionPrompt(
        KEY_SCENES,
        substituteParamsExtended('[Recent scenes for {{char}}:\n{{body}}\n]',
            { body: scenesText }),
        extension_prompt_types.IN_CHAT, 4, false, extension_prompt_roles.SYSTEM,
    );

    setExtensionPrompt(
        KEY_ARC,
        substituteParamsExtended('[Narrative arc directive:\n{{body}}\n]',
            { body: arcText }),
        extension_prompt_types.IN_CHAT, 4, false, extension_prompt_roles.SYSTEM,
    );

    setExtensionPrompt(
        KEY_FACTS,
        substituteParamsExtended('[Known facts:\n{{body}}\n]',
            { body: factsText }),
        extension_prompt_types.IN_CHAT, 4, false, extension_prompt_roles.SYSTEM,
    );
}

// Turning off one without touching the others
function disableArc() {
    setExtensionPrompt(KEY_ARC, '', extension_prompt_types.NONE, 0);
}
```

`substituteParamsExtended` resolves both standard ST macros (`{{char}}`, `{{user}}`, …) and your custom keys (`{{body}}`) in a single call. See [CLAUDE.md → Template Substitution](../../../CLAUDE.md#template-substitution-macros).

### 4. Inspect what's currently set for a key

```js
import { getExtensionPromptByName } from '../../../../script.js';

const current = await getExtensionPromptByName('myext_scenes');
console.log('Current injection text:', current);
```

`getExtensionPromptByName` returns the macro-substituted current value, or `''` if the key isn't set or its filter function (if any) returned false.

### 5. Token-budget-aware injection

Before injecting, check how much context you're about to consume:

```js
import { setExtensionPrompt, extension_prompt_types } from '../../../../script.js';
import { getTokenCountAsync } from '../../../tokenizers.js';

async function injectWithBudget(key, text, maxTokens = 1500) {
    const tokens = await getTokenCountAsync(text);
    if (tokens > maxTokens) {
        console.warn(`[myext] ${key} is ${tokens} tokens — over budget ${maxTokens}, truncating.`);
        // Trim by characters as a coarse approximation
        text = text.slice(0, Math.floor(text.length * (maxTokens / tokens)));
    }
    setExtensionPrompt(key, text, extension_prompt_types.IN_CHAT, 4);

    // Surface the cost to the user in your settings panel
    const span = document.getElementById('myext_tokens_label');
    if (span) span.textContent = `~${Math.min(tokens, maxTokens)} tokens`;
}
```

See [`count-tokens-and-budget.md`](count-tokens-and-budget.md) for the full token-budget pattern.

### 6. Opt into World Info scanning

Setting `scan: true` makes the World Info engine include your injection text when matching keywords — useful when your injected memory mentions characters or items that have WI entries:

```js
setExtensionPrompt(
    'myext_memory',
    memoryText,
    extension_prompt_types.IN_CHAT,
    4,
    true,                                 // scan: yes, match WI keywords against this text
    extension_prompt_roles.SYSTEM,
);
```

### 7. Disabling all of your injections on extension disable

```js
const MY_KEYS = ['myext_scenes', 'myext_arc', 'myext_facts'];

function disableAllInjections() {
    for (const key of MY_KEYS) {
        setExtensionPrompt(key, '', extension_prompt_types.NONE, 0);
    }
}
```

## Gotchas

- **Same key from multiple places = last writer wins.** Each key holds exactly one injection; calling `setExtensionPrompt('foo', ...)` twice replaces the first call. Use distinct keys per content block.
- **Empty string vs. `NONE` position.** Both effectively suppress the injection, but `position: NONE` is the clearer "off" signal — empty string with `IN_CHAT` still occupies a slot during prompt assembly (just with no visible content).
- **Depth ordering when multiple keys share a depth.** At the same depth, role order is system → user → assistant. If you need a specific order between two system-role injections at the same depth, you can't directly control it — use distinct depths, or concatenate them into one key.
- **Forgetting to clear on disable.** If the user toggles your extension off, injections you set earlier are still live. Always set position to `NONE` (or empty value) when disabling.
- **Scanning leaks names into WI activation.** If `scan: true` and your injection mentions a WI keyword, that WI entry will activate — which may or may not be what you want. Default to `scan: false` and opt in deliberately.
- **`role` is numeric, not a string.** Use the `extension_prompt_roles` enum, not `'system'` / `'user'`. If you really need to convert from a string, use `getExtensionPromptRoleByName` from `script.js`.
- **Macros aren't resolved by `setExtensionPrompt`.** The stored value goes through `substituteParams` only when the prompt is assembled (via `getExtensionPromptByName` or during generation). If you want predictable substitution at write time, run `substituteParamsExtended` yourself before calling `setExtensionPrompt`.
- **Depth is clamped.** `MAX_INJECTION_DEPTH` is `10000`; anything beyond the chat length pins to the top.

## See also

- Reference: [`script.md`](../modules/script.md) — `setExtensionPrompt`, `getExtensionPromptByName`, `extension_prompt_types`, `extension_prompt_roles`
- Guide: [`generate-llm-responses.md`](generate-llm-responses.md) — generating the text you'll inject
- Guide: [`count-tokens-and-budget.md`](count-tokens-and-budget.md) — measuring the cost of your injection
- CLAUDE.md: [Extension Prompt Injection](../../../CLAUDE.md#extension-prompt-injection), [Template Substitution (Macros)](../../../CLAUDE.md#template-substitution-macros)
