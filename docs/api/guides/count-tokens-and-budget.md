# Count tokens and build a live token budget

> *You want to count tokens in some text and display a live budget for
> the prompts your extension injects.*

## Minimal example

```js
import { getTokenCountAsync } from '../../../tokenizers.js';
import { getMaxContextSize } from '../../../../script.js';

async function showBudget(text) {
    const tokens = await getTokenCountAsync(text);
    const max = getMaxContextSize();
    document.getElementById('my_token_count').textContent =
        `${tokens} / ${max} tokens`;
}
```

`getTokenCountAsync` picks the right tokenizer for the active API
(OpenAI, Claude, LLaMA, etc.) automatically. Pad with extra tokens if
you want to reserve headroom for the prompt scaffolding ST adds around
your injection.

## Variations

### Count a specific tokenizer regardless of API

```js
import { getTextTokens, tokenizers } from '../../../tokenizers.js';

const claudeTokens = getTextTokens(tokenizers.CLAUDE, text).length;
const gptTokens   = getTextTokens(tokenizers.OPENAI, text).length;
```

Useful when your extension generates content destined for a specific
model regardless of the user's current connection.

### Sync fallback when you can't await

```js
import { getTokenCount } from '../../../tokenizers.js';

const approx = getTokenCount(text);  // synchronous; may block briefly
```

Prefer the async version. The sync variant exists for backwards
compatibility and for hot paths where you've already warmed the
tokenizer cache.

### Instant rough estimate

```js
import { guesstimate } from '../../../tokenizers.js';

const roughCount = guesstimate(text);  // bytes-per-token heuristic
```

`guesstimate` divides by `CHARACTERS_PER_TOKEN_RATIO` (≈ 3.35). Off by
20-30% but instant and never blocks. Good for "is this likely to fit"
prechecks before you spend time on a real count.

### OpenAI message-array counting (handles role overhead)

```js
import { countTokensOpenAIAsync } from '../../../tokenizers.js';

const messages = [
    { role: 'system', content: '...' },
    { role: 'user',   content: '...' },
];
const total = await countTokensOpenAIAsync(messages, true);
```

Each OpenAI message carries ~4 tokens of role/separator overhead.
`countTokensOpenAI*` includes that overhead, plus any tool/function-
calling structure if present.

### Live budget display for multi-key injections

```js
async function updateBudget() {
    const [s, a, f] = await Promise.all([
        getTokenCountAsync(sceneSummariesText),
        getTokenCountAsync(arcDirectiveText),
        getTokenCountAsync(factsText),
    ]);
    document.getElementById('my_budget').textContent =
        `Scenes ${s} · Arc ${a} · Facts ${f} · Total ${s + a + f}`;
}
```

Debounce or throttle if you call this from a streaming handler — the
async cost adds up.

## Gotchas

- **Tokenizer matters.** Claude and GPT-4 count the same text
  differently (often by 20%). Don't rely on a count taken with one
  tokenizer when sending to a different API.
- **Async vs. sync.** Both work, but the async version is preferred —
  the sync one can block briefly the first time it loads a tokenizer
  for an unfamiliar API.
- **Reserve headroom.** `getMaxContextSize()` is the *total* window,
  not what's available to you. ST's own prompt scaffolding, character
  card, World Info, and recent chat history eat into it. Treat
  whatever you inject as additive — and use
  [`getMaxResponseTokens()`](../modules/script.md) and
  [`getMaxPromptTokens()`](../modules/script.md) to reason about the
  response side of the budget.
- **First call cost.** Tokenizer initialization is lazy — the first
  count for a given tokenizer triggers a load. Subsequent counts are
  fast.

## See also

- Reference: [`tokenizers.md`](../modules/tokenizers.md),
  [`script.md`](../modules/script.md) (`getMaxContextSize`,
  `getMaxResponseTokens`, `getMaxPromptTokens`).
- Guide: [`inject-into-prompts.md`](inject-into-prompts.md) — pair
  token counts with injection sizes to avoid blowing the budget.
- CLAUDE.md: "Token Counting" section.
