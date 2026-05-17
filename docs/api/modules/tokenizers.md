# tokenizers.js

Tokenization utilities. Handles tokenizer selection per API/model, sync + async token counting, raw token id encode/decode, and the on-disk token cache. Most extensions only need `getTokenCountAsync`.

**Import path from a third-party extension:**

```js
import {
    getTokenCountAsync,
    getTokenCount,
    getTextTokens,
    decodeTextTokens,
    countTokensOpenAI,
    countTokensOpenAIAsync,
    guesstimate,
    selectTokenizer,
    getFriendlyTokenizerName,
    getTokenizerBestMatch,
    getTokenizerModel,
    getAvailableTokenizers,
    initTokenizers,
    saveTokenCache,
    tokenizers,
    ENCODE_TOKENIZERS,
    TEXTGEN_TOKENIZERS,
    CHARACTERS_PER_TOKEN_RATIO,
} from '../../../tokenizers.js';
```

See also the guide: [count-tokens-and-budget.md](../guides/count-tokens-and-budget.md).

## Exports at a glance

| Export | Kind | Summary |
|--------|------|---------|
| `getTokenCountAsync(str, padding?)` | async function | Async token count using the active tokenizer (preferred) |
| `getTokenCount(str, padding?)` | function | Synchronous variant — blocks on XHR for remote tokenizers |
| `getTextTokens(tokenizerType, str)` | function | Returns the token id array for `str` |
| `decodeTextTokens(tokenizerType, ids)` | function | Decodes token ids back to `{ text, chunks }` |
| `countTokensOpenAI(messages, full?)` | function | Sync per-message OpenAI count via `/api/tokenizers/openai/count` |
| `countTokensOpenAIAsync(messages, full?)` | async function | Async variant of `countTokensOpenAI` |
| `guesstimate(str)` | function | Coarse byte-based fallback estimate |
| `selectTokenizer(tokenizerId)` | function | Switches the tokenizer dropdown to `tokenizerId` |
| `getFriendlyTokenizerName(forApi?)` | function | Resolves `{tokenizerId, tokenizerKey, tokenizerName}` for an API |
| `getTokenizerBestMatch(forApi?)` | function | Heuristically picks a tokenizer id for the connected model |
| `getTokenizerModel()` | function | Returns the model-id-shaped string used by the OpenAI tokenizer endpoint |
| `getAvailableTokenizers()` | function | Lists tokenizer options currently in the UI |
| `initTokenizers()` | async function | One-time init (called by ST core) |
| `saveTokenCache()` | async function | Flushes the in-memory token cache to localforage |
| `tokenizers` | const | Numeric id enum of all supported tokenizers |
| `ENCODE_TOKENIZERS` | const | Subset of `tokenizers` that support local encoding/decoding |
| `TEXTGEN_TOKENIZERS` | const (let, mutated in init) | Text-completion sources that support remote tokenization |
| `CHARACTERS_PER_TOKEN_RATIO` | const | Re-export of `BYTES_PER_TOKEN` (≈ 3.35) used by `guesstimate` |

## Reference

### Counting tokens

#### `getTokenCountAsync(str, padding = undefined) → Promise<number>`

Preferred entry point. Picks the right tokenizer for the current `main_api` (OpenAI sources are routed via `countTokensOpenAIAsync`; `BEST_MATCH` is resolved via `getTokenizerBestMatch`), consults the cache, and returns the token count plus `padding`. Returns `0` for empty/non-string input.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `str` | `string` | — | String to tokenize. |
| `padding` | `number \| undefined` | `undefined` | Optional padding tokens added to the result. Defaults to 0 when omitted. |

**Returns:** `Promise<number>` — token count for `str` plus `padding`.

#### `getTokenCount(str, padding = undefined) → number`

Synchronous version. Uses blocking XHR when the chosen tokenizer hits a remote endpoint. Prefer the async variant in extensions.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `str` | `string` | — | String to tokenize. |
| `padding` | `number \| undefined` | `undefined` | Optional padding tokens added to the result. Defaults to 0 when omitted. |

**Returns:** `number` — token count for `str` plus `padding`. Deprecated; use `getTokenCountAsync`.

#### `countTokensOpenAI(messages, full = false) → number` / `countTokensOpenAIAsync(messages, full = false) → Promise<number>`

Counts tokens for a single message object or an array of them via `/api/tokenizers/openai/count?model=<modelId>`. When `full` is `false`, subtracts 2 to approximate the per-message envelope removed by ST's prompt builder. Claude models always force `full = true`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `messages` | `object \| object[]` | — | A single OpenAI-style message or an array of them. |
| `full` | `boolean` | `false` | If `true`, returns the raw count; if `false`, subtracts 2 to approximate ST's per-message envelope adjustment. |

**Returns:** `number` (sync) or `Promise<number>` (async) — message token count.

#### `guesstimate(str) → number`

Coarse fallback: `ceil(byteLength / CHARACTERS_PER_TOKEN_RATIO)`. Used when `tokenizers.NONE` is active or a remote tokenizer fails.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `str` | `string` | — | String to tokenize. |

**Returns:** `number` — estimated token count based on byte length.

### Encoding / decoding

#### `getTextTokens(tokenizerType, str) → number[]`

Returns the array of token ids for `str` using the specified tokenizer. Only tokenizers listed in `ENCODE_TOKENIZERS` (plus `OPENAI`, `GPT2`, `NERD`, `NERD2`, and remote APIs) have an `encode` endpoint; others return `[]` with a console warning.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `tokenizerType` | `number` | — | Tokenizer id from the `tokenizers` enum. |
| `str` | `string` | — | String to tokenize. |

**Returns:** `number[]` — array of token ids, or `[]` if the tokenizer can't encode.

#### `decodeTextTokens(tokenizerType, ids) → { text: string, chunks?: string[] }`

Inverse of `getTextTokens`. The remote `API_CURRENT`/`API_TEXTGENERATIONWEBUI`/`API_KOBOLD` tokenizers cannot decode and fall back to returning empty strings.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `tokenizerType` | `number` | — | Tokenizer id from the `tokenizers` enum. |
| `ids` | `number[]` | — | Array of token ids to decode. |

**Returns:** `{ text: string, chunks?: string[] }` — decoded text as a single string and, when available, the per-token chunks.

### Tokenizer selection

#### `tokenizers`

Numeric id enum: `NONE: 0`, `GPT2: 1`, `OPENAI: 2`, `LLAMA: 3`, `NERD: 4`, `NERD2: 5`, `API_CURRENT: 6`, `MISTRAL: 7`, `YI: 8`, `API_TEXTGENERATIONWEBUI: 9`, `API_KOBOLD: 10`, `CLAUDE: 11`, `LLAMA3: 12`, `GEMMA: 13`, `JAMBA: 14`, `QWEN2: 15`, `COMMAND_R: 16`, `NEMO: 17`, `DEEPSEEK: 18`, `COMMAND_A: 19`, `BEST_MATCH: 99`.

#### `ENCODE_TOKENIZERS`

Subset of local tokenizers that support encoding/decoding: `LLAMA`, `MISTRAL`, `YI`, `LLAMA3`, `GEMMA`, `JAMBA`, `QWEN2`, `COMMAND_R`, `COMMAND_A`, `NEMO`, `DEEPSEEK`.

#### `TEXTGEN_TOKENIZERS`

Mutable array populated by `initTokenizers` with the text-completion source ids that support remote tokenization (`OOBA`, `TABBY`, `KOBOLDCPP`, `LLAMACPP`, `VLLM`, `APHRODITE`).

#### `CHARACTERS_PER_TOKEN_RATIO`

Re-export of `BYTES_PER_TOKEN` (3.35). Used in `guesstimate` and available for extension-side rough estimates.

#### `selectTokenizer(tokenizerId) → void`

Sets the `#tokenizer` dropdown to `tokenizerId` if it isn't already selected, and shows a toast.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `tokenizerId` | `number` | — | Tokenizer id from the `tokenizers` enum to select in the UI. |

**Returns:** none.

#### `getAvailableTokenizers() → Tokenizer[]`

Reads the current options from `#tokenizer` and returns `[{ tokenizerId, tokenizerKey, tokenizerName }]`. `tokenizerKey` is the lowercase name from the `tokenizers` enum.

**Returns:** `Tokenizer[]` — list of `{ tokenizerId, tokenizerKey, tokenizerName }` objects describing every tokenizer option currently in the UI.

#### `getFriendlyTokenizerName(forApi) → Tokenizer`

Resolves the active tokenizer (`{ tokenizerName, tokenizerKey, tokenizerId }`) for `forApi` (defaults to `main_api`). For `'openai'`, returns the model string from `getTokenizerModel()`. For non-OpenAI APIs, expands `BEST_MATCH` via `getTokenizerBestMatch`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `forApi` | `string` | `main_api` | API to resolve the tokenizer for. Defaults to the main API. |

**Returns:** `Tokenizer` — `{ tokenizerName, tokenizerKey, tokenizerId }` describing the active tokenizer for the given API.

#### `getTokenizerBestMatch(forApi) → number`

Heuristic picker. For Kobold/textgenerationwebui it prefers the connected API tokenizer when available, otherwise inspects the model name for `llama3`, `mistral`, `gemma`, `nemo`, `deepseek`, `yi`, `jamba`, `command-r`, `command-a`, `qwen2`. For NovelAI returns `NERD`/`NERD2`/`LLAMA3` based on model.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `forApi` | `string` | `main_api` | API to resolve the tokenizer for. Defaults to the main API. |

**Returns:** `number` — tokenizer id from the `tokenizers` enum that best matches the connected model.

#### `getTokenizerModel() → string`

Returns the model id string used as the `?model=` query parameter for `/api/tokenizers/openai/*` endpoints. Maps OpenRouter / ElectronHub / Chutes / Custom / MiniMax / Deepseek / Azure model names to one of the canonical tokenizer model labels (`gpt-3.5-turbo`, `gpt-4`, `gpt-4o`, `claude`, `llama`, `llama3`, `mistral`, `gemma`, `jamba`, `qwen2`, `command-r`, `command-a`, `nemo`, `deepseek`, `yi`, `gpt2`).

**Returns:** `string` — canonical model label used as the `?model=` query parameter for OpenAI tokenizer endpoints.

### Lifecycle

#### `initTokenizers() → Promise<void>`

Called once at startup. Populates `TEXTGEN_TOKENIZERS`, loads the persisted token cache, and registers debug functions. Extensions should not call this.

**Returns:** `Promise<void>` — resolves when init completes.

#### `saveTokenCache() → Promise<void>`

Flushes the in-memory `tokenCache` to localforage. Triggered by ST core after generation; extensions can call it if they bulk-add cache entries.

**Returns:** `Promise<void>` — resolves when the cache has been written to localforage.

## Notes

- `CHARACTERS_PER_TOKEN_RATIO` is exported as an alias of `BYTES_PER_TOKEN` (≈ 3.35 bytes per token).
- Remote tokenizers cache results by `${tokenizerType}-${hash}${modelHash}+${padding}` — manual cache invalidation is exposed via the debug function `resetTokenCache`.
