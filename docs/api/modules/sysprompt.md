# sysprompt.js

System prompt management. Owns the list of saved system prompts, the enable/disable toggle, the `/sysprompt` family of slash commands, and a one-time migration that pulls `system_prompt` fields out of older instruct templates.

**Import path from a third-party extension:**

```js
import {
    system_prompts,
    loadSystemPrompts,
    checkForSystemPromptInInstructTemplate,
    initSystemPrompts,
} from '../../../sysprompt.js';
```

## Exports at a glance

| Export | Kind | Summary |
|--------|------|---------|
| `system_prompts` | let | Array of saved system prompt presets |
| `loadSystemPrompts(data)` | async function | Populates `system_prompts` and binds the sysprompt UI |
| `checkForSystemPromptInInstructTemplate(name, template)` | async function | Offers to migrate a system prompt embedded in an instruct template |
| `initSystemPrompts()` | function | Wires up UI handlers and registers `/sysprompt*` slash commands |

## Reference

### State

#### `system_prompts`

Mutable array of `{ name, content, post_history }` objects. Populated by `loadSystemPrompts`. The active preset name lives in `power_user.sysprompt.name`; its `content` / `post_history` are mirrored to `power_user.sysprompt`.

### Lifecycle

#### `loadSystemPrompts(data) → Promise<void>`

Reads `data.sysprompt` (the array of saved presets) into `system_prompts`, runs the legacy instruct-mode migration, populates `#sysprompt_select`, and sets the enabled/content/post-history controls to match `power_user.sysprompt`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `data` | `object` | — | Settings data object; `data.sysprompt` is consumed as the preset array. |

**Returns:** `Promise<void>` — resolves once presets are loaded, migration has run, and the UI is bound.

#### `initSystemPrompts() → void`

Binds the enabled toggle, the preset dropdown, the content textarea, and the post-history textarea to `power_user.sysprompt`, and registers the slash commands.

**Returns:** none.

| Command | Aliases | Purpose |
|---------|---------|---------|
| `/sysprompt [name]` | `system-prompt` | Get current or select by name (fuzzy match) |
| `/sysprompt-on` | `sysprompt-enable` | Enable |
| `/sysprompt-off` | `sysprompt-disable` | Disable |
| `/sysprompt-state [bool]` | `sysprompt-toggle` | Get/set enabled state |

### Migration

#### `checkForSystemPromptInInstructTemplate(name, template) → Promise<void>`

Called when importing an instruct template that still carries a `system_prompt` field. Prompts the user to save it as a standalone system prompt preset named `[Migrated] ${name}`; on confirmation, the field is removed from the instruct template. Used internally by ST's preset importers — extensions importing presets programmatically should call this before saving to avoid leaving orphaned system prompts.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | `string` | — | Name of the instruct template being imported. |
| `template` | `object` | — | Instruct template object; its `system_prompt` field is what may be migrated. |

**Returns:** `Promise<void>` — resolves after the user confirms or cancels the migration prompt.
