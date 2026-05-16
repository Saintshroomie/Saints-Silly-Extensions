# Secrets and API Keys

> *You want to securely store an API key or other credential for your extension.*

SillyTavern stores secrets server-side in `secrets.json` and exposes a small API for reading and writing them. The client only sees a `secret_state` object containing booleans — "is this secret set?" — never the actual values, unless your code explicitly calls `findSecret`. This guide shows the right pattern for handing credentials in third-party extensions.

## Minimal example

Register a key, then retrieve it just-in-time before making a request:

```js
// extensions/third-party/my-ext/index.js
import {
    writeSecret,
    findSecret,
    readSecretState,
    secret_state,
    canViewSecrets,
} from '../../../secrets.js';

const MY_KEY = 'MY_EXTENSION_OPENAI_KEY';

async function saveKey(userEnteredValue) {
    // The optional third argument is a human-readable label for the settings UI.
    await writeSecret(MY_KEY, userEnteredValue, 'My Extension – OpenAI key');
}

async function callApi(prompt) {
    if (!secret_state[MY_KEY]) {
        toastr.error('No API key configured. Open extension settings to add one.');
        return;
    }

    // findSecret hits the server and returns the plaintext value.
    const apiKey = await findSecret(MY_KEY);
    if (!apiKey) {
        toastr.error('Could not retrieve key (multi-user lockdown?).');
        return;
    }

    try {
        const response = await fetch('https://api.example.com/v1/chat', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
        });
        return await response.json();
    } finally {
        // Drop the local reference — don't stash it on a long-lived object.
        // The garbage collector will reclaim it.
    }
}

// During init: refresh the boolean state so UI reflects what's stored.
await readSecretState();
```

Namespace your key string (`MY_EXTENSION_*`) so it doesn't collide with built-in `SECRET_KEYS`.

## Variations

### Use a built-in key

If your extension just wants to reuse the same OpenAI key the user configured in core ST, use the canonical constant:

```js
import { SECRET_KEYS, findSecret, secret_state } from '../../../secrets.js';

if (secret_state[SECRET_KEYS.OPENAI]) {
    const key = await findSecret(SECRET_KEYS.OPENAI);
    // ... use it
}
```

`SECRET_KEYS` covers every built-in provider (`OPENAI`, `CLAUDE`, `OPENROUTER`, `MISTRALAI`, `DEEPSEEK`, `GROQ`, `COHERE`, `XAI`, etc.). See [`secrets.md`](../modules/secrets.md) for the full list.

### Enumerate which secrets are set

```js
import { readSecretState, secret_state } from '../../../secrets.js';

await readSecretState(); // refreshes secret_state from the server
const configured = Object.entries(secret_state)
    .filter(([, isSet]) => isSet)
    .map(([key]) => key);
console.log('Configured secrets:', configured);
```

`readSecretState()` does not return the values — only flags per key.

### Per-identity secrets

`writeSecret`, `findSecret`, and `deleteSecret` all accept an optional `id` parameter, so you can keep multiple values under one key (e.g., named profiles):

```js
await writeSecret('MY_EXTENSION_OPENAI_KEY', 'sk-aaa...', 'Personal',  /* id */ 'personal');
await writeSecret('MY_EXTENSION_OPENAI_KEY', 'sk-bbb...', 'Work',      /* id */ 'work');

const personal = await findSecret('MY_EXTENSION_OPENAI_KEY', 'personal');
const work     = await findSecret('MY_EXTENSION_OPENAI_KEY', 'work');
```

### Rotate or delete

```js
import { writeSecret, deleteSecret } from '../../../secrets.js';

// Rotate by overwriting.
await writeSecret(MY_KEY, newValue);

// Or remove entirely.
await deleteSecret(MY_KEY);
```

### Guard against multi-user lockdown

```js
import { canViewSecrets, findSecret, secret_state } from '../../../secrets.js';

const allowed = await canViewSecrets();
if (!allowed) {
    // Multi-user mode with allow_keys_exposure disabled.
    // secret_state still tells you whether a key is set — but you can't read it.
    if (secret_state[MY_KEY]) {
        // Tell the user to use ST's built-in API caller, or fall back to a feature
        // that doesn't need raw credentials.
    }
    return;
}

const value = await findSecret(MY_KEY);
```

### Settings panel field for a secret

```js
const html = `
    <div class="inline-drawer-content">
        <label for="my_ext_key">API key</label>
        <div class="flex-container">
            <input id="my_ext_key" type="password" class="text_pole flex1" autocomplete="off" />
            <div id="my_ext_key_save" class="menu_button">Save</div>
        </div>
        <small id="my_ext_key_status"></small>
    </div>
`;
document.getElementById('extensions_settings').insertAdjacentHTML('beforeend', html);

document.getElementById('my_ext_key_save').addEventListener('click', async () => {
    const input = document.getElementById('my_ext_key');
    await writeSecret(MY_KEY, input.value.trim(), 'My Extension API');
    input.value = ''; // Clear the field — it's saved server-side now.
    document.getElementById('my_ext_key_status').textContent = 'Saved.';
});
```

Render the field empty on load; never round-trip the secret to populate it.

## Gotchas

- **Never put secrets in `extensionSettings` or `chatMetadata`.** Both end up in client-side persistence (localStorage / chat files). Use `writeSecret` exclusively.
- **Never log secrets.** Don't `console.log(apiKey)`, don't dump the request body verbatim, don't paste them into error toasts.
- **`findSecret` is async and may return `undefined`.** Always await and null-check before using.
- **`secret_state[KEY]` is a boolean, not the value.** It tells you the key is set on the server; the value is fetched on demand.
- **Multi-user installs may block reads.** When `canViewSecrets()` is `false`, `findSecret` returns nothing. Design a fallback (e.g., use ST's own provider routing instead of calling the upstream API yourself).
- **Empty values are rejected by default.** Pass `{ allowEmpty: true }` to `writeSecret` if you intentionally want to clear-by-write.
- **Do not cache the plaintext.** Re-fetch with `findSecret` each call. Caching widens the leak surface and breaks rotation.
- **Pick a namespaced key string.** `MY_EXTENSION_OPENAI_KEY` will not collide with `SECRET_KEYS.OPENAI` and survives ST upgrades that add new built-ins.

## See also

- Reference: [`secrets.md`](../modules/secrets.md)
- Guide: [`personas-and-users.md`](personas-and-users.md) — for user-scoped data that *isn't* sensitive
- CLAUDE.md: "Extension Settings (Global Persistent Storage)" — for non-secret preferences
