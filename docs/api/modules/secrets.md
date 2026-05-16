# secrets.js

Client-side bridge to the server-side secret store that holds API keys for every supported provider. Extensions can check whether a key exists, retrieve its value for an outbound API call, and (rarely) write or rotate keys.

> **Security warning.** Secret values live on the server — never in `localStorage`, never in `extension_settings`, never in `chat_metadata`. The browser only sees an opacity map (`secret_state`) telling it *which* keys are populated, not what they contain. Use `findSecret(key)` to fetch a real value only at the moment you need it for an outbound request, and never persist that value to any client-readable store. If `allowKeysExposure` is `false` in `config.yaml` (the default), `findSecret` returns `null` — your extension must degrade gracefully.

**Import path from a third-party extension:**

```js
import {
    SECRET_KEYS, secret_state,
    writeSecret, deleteSecret, readSecretState,
    findSecret, rotateSecret, renameSecret,
    resolveSecretKey, getSecretLabelById, updateSecretDisplay,
    canViewSecrets, checkOpenRouterAuth, initSecrets,
} from '../../../secrets.js';
```

See also: [`../guides/secrets-and-api-keys.md`](../guides/secrets-and-api-keys.md).

## Exports at a glance

| Export | Kind | Summary |
|--------|------|---------|
| `SECRET_KEYS` | const object | Enum of every secret key string the server understands. |
| `secret_state` | mutable object | `{ [key]: SecretMeta[] }` — populated keys only. Read-only to extensions in practice. |
| `writeSecret` | async function | Create/save a secret value on the server. |
| `deleteSecret` | async function | Delete a stored secret (or one entry by id). |
| `readSecretState` | async function | Refresh `secret_state` from the server. |
| `findSecret` | async function | Return the plaintext value of a secret — requires `allowKeysExposure: true`. |
| `rotateSecret` | async function | Make a different stored entry the active one for a key. |
| `renameSecret` | async function | Change the human-readable label of a stored entry. |
| `resolveSecretKey` | function | Returns the `SECRET_KEYS` value matching the currently-selected API. |
| `getSecretLabelById` | function | Find the `label (value-preview)` string for a secret entry by id. |
| `updateSecretDisplay` | function | Refresh the placeholder text on every API-key input element. |
| `canViewSecrets` | async function | Probe server config — `true` if `allowKeysExposure` is enabled. |
| `checkOpenRouterAuth` | async function | Complete the OpenRouter OAuth PKCE flow on the callback page. |
| `initSecrets` | async function | Wire up DOM handlers (called once at app startup). |

## Reference

### Constants

#### `SECRET_KEYS`

A frozen-in-practice constant map from short uppercase identifier to the server-side secret key string. Use the constants, not the raw strings — they're stable across versions.

Provider keys (chat completion): `OPENAI`, `CLAUDE`, `OPENROUTER`, `MAKERSUITE` (Google AI Studio), `VERTEXAI`, `VERTEXAI_SERVICE_ACCOUNT`, `AI21`, `MISTRALAI`, `COHERE`, `PERPLEXITY`, `GROQ`, `DEEPSEEK`, `XAI`, `MOONSHOT`, `FIREWORKS`, `NANOGPT`, `CHUTES`, `ELECTRONHUB`, `COMETAPI`, `AZURE_OPENAI`, `ZAI`, `SILICONFLOW`, `AIMLAPI`, `POLLINATIONS`, `MINIMAX`, `MINIMAX_GROUP_ID`, `CUSTOM`, `GENERIC`.

Text completion / local backends: `MANCER`, `VLLM`, `APHRODITE`, `TABBY`, `OOBA`, `KOBOLDCPP`, `LLAMACPP`, `TOGETHERAI`, `INFERMATICAI`, `DREAMGEN`, `FEATHERLESS`, `HUGGINGFACE`, `WORKERS_AI`.

Image / sound: `STABILITY`, `BFL` (Black Forest Labs), `FALAI`, `COMFY_RUNPOD`, `AZURE_TTS`, `CUSTOM_OPENAI_TTS`, `ELEVENLABS`, `NOMICAI`.

Translation: `DEEPL`, `LIBRE`, `LIBRE_URL`, `LINGVA_URL`, `ONERING_URL`, `DEEPLX_URL`.

Search / web: `SERPAPI`, `SERPER`, `TAVILY`.

Other: `HORDE` (AI Horde), `NOVEL` (NovelAI), `VOLCENGINE_APP_ID`, `VOLCENGINE_ACCESS_KEY`.

The full source-of-truth list lives at the top of `public/scripts/secrets.js`.

#### `secret_state`

Object whose own keys are `SECRET_KEYS.*` values and whose values are arrays of `{ id, label, value, active }` metadata. `value` is a *short preview* (typically last 4 characters) — never the plaintext. A key is absent or maps to `[]` when nothing is stored.

```js
if (secret_state[SECRET_KEYS.OPENAI]?.length) {
    // user has at least one OpenAI key configured
}
```

Refreshed automatically after `writeSecret` / `deleteSecret` / `rotateSecret` / `renameSecret`. Call `readSecretState()` to force-refresh.

### Querying state

#### `resolveSecretKey() → string | null`

Returns the `SECRET_KEYS` value that matches whatever API/source/textgen-type is currently selected in ST's connect panel. Returns `null` if the current selection doesn't correspond to a known secret. Useful when you need to know "what key would ST itself use right now".

#### `canViewSecrets() → Promise<boolean | null>`

Hits `/api/secrets/settings`. Resolves to `true` if the server's `config.yaml` has `allowKeysExposure: true`, `false` otherwise, or `null` on network/auth failure. Cheap to call.

#### `getSecretLabelById(id) → string`

Scans every entry of every key in `secret_state` for one with the given `id`. Returns `"<label> (<value-preview>)"` or `''` if not found.

### Reading values

#### `findSecret(key, id?) → Promise<string | null>`

POSTs to `/api/secrets/find` and returns the **plaintext** secret. With `id`, fetches that specific stored entry; without, returns the *active* entry for the key. Returns `null` if `allowKeysExposure` is disabled, if the key isn't stored, or on error. **Never** cache the result — fetch it again next time you need it.

```js
const apiKey = await findSecret(SECRET_KEYS.OPENAI);
if (!apiKey) {
    toastr.warning('OpenAI key not available. Enable allowKeysExposure in config.yaml.');
    return;
}
```

### Mutating

Extensions rarely need to write secrets — the user manages them in the connect panel. The functions are exposed mainly for OAuth flows and migration scripts.

#### `writeSecret(key, value, label?, options?) → Promise<string | null>`

POSTs to `/api/secrets/write`. Generates a label from the current timestamp if `label` is omitted. With `options.allowEmpty === false` (the default), passing an empty `value` redirects to `deleteSecret(key)`. Returns the new entry's `id`, or `null` on error / no value. Emits `event_types.SECRET_WRITTEN`.

#### `deleteSecret(key, id?) → Promise<void>`

Without `id`, deletes the active entry for `key`. Emits `event_types.SECRET_DELETED`. Refreshes `secret_state` and re-triggers `#main_api` so ST reconnects with the new key set.

#### `rotateSecret(key, id) → Promise<void>`

Marks a different stored entry as active for the given `key`. Emits `event_types.SECRET_ROTATED`. Refreshes `secret_state` and reconnects ST.

#### `renameSecret(key, id, label) → Promise<void>`

Changes the human-readable label of a stored entry. Emits `event_types.SECRET_EDITED`.

#### `readSecretState() → Promise<void>`

Re-fetches `/api/secrets/read` and overwrites `secret_state`, then calls `updateSecretDisplay()` and refreshes the autocomplete datalists. Called automatically after every write — extensions normally don't need to call it.

### UI / lifecycle

#### `updateSecretDisplay() → void`

Updates the placeholder text on each API-key input in the connect panel to show whether a key is saved and which one is active. Pure UI concern; extensions can ignore.

#### `checkOpenRouterAuth() → Promise<void>`

If the current page URL is the OpenRouter OAuth callback, exchanges the authorization code for a key and stores it via `writeSecret(SECRET_KEYS.OPENROUTER, …)`. No-op otherwise. Called by ST during startup.

#### `initSecrets() → Promise<void>`

Binds DOM event handlers for the View Secrets button, the key manager dialog, the input fields, and the OpenRouter authorize button. Called once during app boot.

## Notes

- The "value" you see in `secret_state[key][i].value` is a preview/fingerprint, not the secret itself. Don't display it as if it were the full key.
- The `event_types.SECRET_*` events emitted by mutations are useful if your extension caches connection state and needs to react to user-driven key changes.
- For provider routing (which key to read for the current API), prefer `resolveSecretKey()` over hard-coding `SECRET_KEYS.OPENAI` — it transparently handles the textgen-webui sub-types and the Vertex AI auth mode split.
- The OAuth PKCE verifier used by `checkOpenRouterAuth` is stored in `accountStorage`, not in `secret_state`.
