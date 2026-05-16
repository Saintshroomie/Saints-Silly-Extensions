# tool-calling.js

Function-tool (function-calling) registry and invocation pipeline. Provides `ToolManager` — a static class for registering tools, exporting them in OpenAI function-spec format, parsing tool calls out of streamed and non-streamed responses across every supported provider, invoking the matching action, and recording results back into the chat.

**Import path from a third-party extension:**

```js
import { ToolManager } from '../../../tool-calling.js';
```

## Exports at a glance

| Export | Kind | Summary |
|--------|------|---------|
| `ToolManager` | class | Static registry + dispatcher for function tools |

## Reference

### `class ToolManager`

All members are `static`. There is one global registry shared by all extensions.

#### Properties

| Member | Type | Description |
|--------|------|-------------|
| `ToolManager.RECURSE_LIMIT` | `number` | Maximum tool-call recursion depth per generation (default 5; overridable in settings) |
| `ToolManager.tools` | `ToolDefinition[]` (getter) | Snapshot array of all registered tools |

#### Registration

##### `ToolManager.registerFunctionTool({ name, displayName, description, parameters, action, formatMessage, shouldRegister, stealth }) → void`

Registers a tool. The fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | yes | Unique tool name (the function name sent to the model) |
| `displayName` | `string` | no | Friendly name used in the UI |
| `description` | `string` | yes | Sent to the model as the function description |
| `parameters` | `object` | yes | JSON Schema for the function arguments |
| `action` | `(params) => any \| Promise<any>` | yes | Implementation. Non-string return values are JSON-stringified |
| `formatMessage` | `(params) => string \| Promise<string>` | no | Returns the toast message shown while invoking |
| `shouldRegister` | `() => boolean \| Promise<boolean>` | no | Per-request gate — return `false` to omit the tool from the current generation |
| `stealth` | `boolean` | no | If true, the call result is not appended to chat and no follow-up generation is triggered |

If a tool with the same `name` is already registered, it is **overwritten** with a console warning. Re-register on each extension load.

```js
ToolManager.registerFunctionTool({
    name: 'get_weather',
    displayName: 'Weather',
    description: 'Get the current weather for a city.',
    parameters: {
        type: 'object',
        properties: { city: { type: 'string' } },
        required: ['city'],
    },
    action: async ({ city }) => {
        const data = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
        return await data.json();
    },
    formatMessage: ({ city }) => `Looking up weather for ${city}…`,
});
```

##### `ToolManager.unregisterFunctionTool(name) → void`

Removes a tool from the registry. Silent no-op if `name` is not registered.

#### Inspection

##### `ToolManager.getDisplayName(name) → string`

Returns the tool's `displayName` if set, otherwise `name`. Returns `name` for unknown tools.

##### `ToolManager.isStealthTool(name) → boolean`

True if the tool was registered with `stealth: true`.

#### Capability gating

##### `ToolManager.isToolCallingSupported(settings = null, model = null) → boolean`

True when `main_api === 'openai'`, `function_calling` is enabled, the `custom_prompt_post_processing` mode is compatible (`NONE` or any `*_TOOLS` variant), and the current source+model is on the per-source allowlist (consulting `model_list` capability flags for OpenRouter / Mistral / AIMLAPI / Chutes / ElectronHub / WorkersAI / Fireworks / Pollinations).

##### `ToolManager.canPerformToolCalls(type, settings = null, model = null) → boolean`

True when `isToolCallingSupported` is true **and** `type` is not one of `'impersonate'`, `'quiet'`, `'continue'`. Use this to decide whether to register tools for a given generation pass.

#### Per-request setup

##### `ToolManager.registerFunctionToolsOpenAI(data) → Promise<void>`

Walks the registry, calls each tool's `shouldRegister()`, and attaches the OpenAI-style `tools` array (plus `tool_choice: 'auto'`) to `data`. Called by ST's core generation pipeline once the prompt is built.

#### Response parsing

##### `ToolManager.hasToolCalls(data) → boolean`

True if the (parsed) response contains at least one tool call in any supported provider format.

##### `ToolManager.parseToolCalls(toolCalls, parsed, toolSignatures = {}) → void`

Updates `toolCalls` (an array indexed by stream choice index, each entry an array of partial tool calls) with a new streamed chunk. Handles OpenAI deltas, Cohere `tool-call-*` events, Anthropic `content_block` / `input_json_delta`, and Google `candidates[].content.parts`. Encrypted thought signatures keyed by tool-call id can be passed via `toolSignatures`.

##### `ToolManager.invokeFunctionTools(data, { reasoningText = null } = {}) → Promise<ToolInvocationResult>`

End-to-end dispatcher: extracts tool calls from `data`, invokes each via the registered action, shows a transient toast (from `formatMessage`), and returns:

```ts
{
  invocations: ToolInvocation[],  // one entry per visible (non-stealth) call, success or failure
  errors: Error[],                // errors thrown by `action`
  stealthCalls: string[],         // names of stealth tools that ran
}
```

A `ToolInvocation` is `{ id, displayName, name, parameters, result, signature?, reasoning?, error? }` — note that `parameters` and `result` are always strings (JSON-stringified if the action returned an object).

##### `ToolManager.invokeFunctionTool(name, parameters) → Promise<string | Error>`

Invokes a single tool by name. `parameters` may be a JSON string, an empty string (treated as `{}`), or an already-parsed object. Returns the tool's result (JSON-stringified if non-string) or an `Error` with `cause` set to the tool name on failure.

##### `ToolManager.formatToolCallMessage(name, parameters) → Promise<string>`

Runs the tool's `formatMessage` (if any) to produce the toast text shown while the call is in flight.

#### Persistence

##### `ToolManager.saveFunctionToolInvocations(invocations) → Promise<void>`

Pushes a system message into `chat` summarizing the tool calls, emits `TOOL_CALLS_PERFORMED` and `TOOL_CALLS_RENDERED`, renders the new message, and persists the chat. Called by ST core after `invokeFunctionTools`; extensions normally do not invoke this directly.

##### `ToolManager.showToolCallError(errors) → void`

Shows an error toast that opens a popup listing the per-tool failure messages.

#### Slash commands

##### `ToolManager.initToolSlashCommands() → void`

Registers `/tools-list` (returns the OpenAI-shape tool definitions) and `/tools-invoke` (invokes a tool by name with JSON parameters). Called once at startup.

## Notes

- Tool calling is only meaningful on chat-completion APIs (`main_api === 'openai'`). Text-completion connections always return false from `isToolCallingSupported`.
- `parameters` reaching your `action` is always the parsed JSON object — handle missing/optional fields defensively, since the model may omit non-required parameters.
- Returning a plain object from `action` is fine — it will be `JSON.stringify`-ed into the `tool` role message before being sent back to the model on the follow-up turn.
