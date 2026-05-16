# Register Slash Commands

> *You want to add a `/command` that users can invoke.*

The modern API is `SlashCommandParser.addCommandObject(SlashCommand.fromProps({...}))`. It gives you typed arguments, named flags, autocomplete in the chat bar, and integration with the pipe (`|`) operator for chaining. The legacy `context.registerSlashCommand` ([covered in `CLAUDE.md`](../../../CLAUDE.md#registering-slash-commands)) still works but is essentially deprecated for new code.

## Minimal example

```js
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
import { SlashCommand } from '../../../slash-commands/SlashCommand.js';

SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: 'sm-status',
    callback: async (_namedArgs, _unnamedArgs) => {
        return 'OK';                       // shown in chat as the command output
    },
    helpString: 'Reports extension status.',
}));
```

Required props: `name` and `callback`. Everything else is optional but worth filling in once your command takes input.

The callback signature is `(namedArgs, unnamedArgs) => string | Promise<string>`:

- `namedArgs` is an object of `--key=value` flags (string values).
- `unnamedArgs` is the rest of the input after the command name. For a single positional arg it's a string; for multiple typed args it's an array.

Return an empty string when there's nothing to print, or a status message when there is. Returning anything non-string can break command chaining.

## Variations

### One unnamed string argument

```js
import { ARGUMENT_TYPE, SlashCommandArgument }
    from '../../../slash-commands/SlashCommandArgument.js';

SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: 'sm-tag',
    callback: async (_namedArgs, unnamedArgs) => {
        const tag = (unnamedArgs ?? '').toString().trim();
        if (!tag) return 'Usage: /sm-tag <tagname>';
        applyTagToCurrentScene(tag);
        return '';
    },
    unnamedArgumentList: [
        SlashCommandArgument.fromProps({
            description: 'Tag to apply to the current scene',
            typeList: [ARGUMENT_TYPE.STRING],
            isRequired: true,
        }),
    ],
    helpString: 'Tags the current scene break with a custom label.',
}));
```

Usage in chat: `/sm-tag turning-point`.

### Pipe-delimited multi-part input

For commands that take structured input (like fact entries `subject | state | keywords`), parse the raw string yourself rather than fighting the argument system:

```js
SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: 'sm-fact',
    callback: async (_namedArgs, unnamedArgs) => {
        const parts = (unnamedArgs ?? '').toString().split('|').map(s => s.trim());
        if (parts.length < 3 || parts.some(p => !p)) {
            return 'Usage: /sm-fact subject | state | keywords';
        }
        const [subject, state, keywords] = parts;
        addFact({ subject, state, keywords });
        return `Added fact: ${subject}`;
    },
    unnamedArgumentList: [
        SlashCommandArgument.fromProps({
            description: 'subject | state | keywords',
            typeList: [ARGUMENT_TYPE.STRING],
            isRequired: true,
        }),
    ],
    helpString: 'Manually adds a persistent fact entry.',
}));
```

### Named flags (`--key=value`)

```js
import { SlashCommandNamedArgument }
    from '../../../slash-commands/SlashCommandArgument.js';

SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: 'sm-summarize',
    callback: async (namedArgs, unnamedArgs) => {
        const length = parseInt(namedArgs.length ?? '300', 10);
        const focus = namedArgs.focus ?? 'plot';
        const sceneText = (unnamedArgs ?? '').toString();
        const summary = await summarize(sceneText, { length, focus });
        return summary;
    },
    namedArgumentList: [
        SlashCommandNamedArgument.fromProps({
            name: 'length',
            description: 'Approximate token budget for the summary',
            typeList: [ARGUMENT_TYPE.NUMBER],
            defaultValue: '300',
        }),
        SlashCommandNamedArgument.fromProps({
            name: 'focus',
            description: 'What to emphasize',
            typeList: [ARGUMENT_TYPE.STRING],
            defaultValue: 'plot',
        }),
    ],
    unnamedArgumentList: [
        SlashCommandArgument.fromProps({
            description: 'Scene text to summarize',
            typeList: [ARGUMENT_TYPE.STRING],
            isRequired: true,
        }),
    ],
    helpString: 'Summarizes the provided scene text.',
}));
```

Usage: `/sm-summarize --length=500 --focus=character {{lastMessage}}`.

Named-arg values come in as strings — `parseInt`/`parseFloat` them yourself even when you declared `ARGUMENT_TYPE.NUMBER`.

### Enum-typed argument

For a fixed set of choices, use `enumList` to drive autocomplete:

```js
import { SlashCommandEnumValue }
    from '../../../slash-commands/SlashCommandEnumValue.js';

SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: 'sm-retry',
    callback: async (_namedArgs, unnamedArgs) => {
        const step = (unnamedArgs ?? '').toString().trim() || 'all';
        await retryPipelineStep(step);
        return '';
    },
    unnamedArgumentList: [
        SlashCommandArgument.fromProps({
            description: 'Pipeline step to retry',
            typeList: [ARGUMENT_TYPE.STRING],
            isRequired: false,
            enumList: [
                new SlashCommandEnumValue('scene', 'Scene summary step'),
                new SlashCommandEnumValue('facts', 'Fact extraction step'),
                new SlashCommandEnumValue('arc', 'Arc directive step'),
                new SlashCommandEnumValue('all', 'Re-run the whole pipeline'),
            ],
        }),
    ],
    aliases: ['smr'],
    helpString: 'Re-runs a specific pipeline step for the most recent scene break.',
}));
```

### Returning a value vs. an empty string

A command's return value is piped to the next command in a chain. Two patterns:

```js
// "Action" command — does work, returns nothing
return '';

// "Query" command — returns text that can be piped
return JSON.stringify(getActiveFacts());
```

Mixing the two surprises users: `/sm-tag foo | /echo` would echo your status message rather than executing as expected if your action command returns "OK". Keep action commands silent unless the user explicitly asked for a confirmation.

## Gotchas

- **Always return a string.** Returning `undefined`, `null`, or an object breaks pipe chaining (the next command may see `"undefined"` as input). If you don't have a meaningful return, return `''`.
- **`unnamedArgs` is sometimes a string, sometimes an array.** For a single positional arg it's a string; if you declare multiple `unnamedArgumentList` entries it can be an array. Be explicit: `(unnamedArgs ?? '').toString()` or destructure with care.
- **Named-arg types are advisory.** Declaring `ARGUMENT_TYPE.NUMBER` doesn't coerce — values still arrive as strings. Parse them yourself.
- **The pipe operator (`|`) splits commands.** If your input might contain a literal `|`, users must escape it or wrap with `{:...:}` macro syntax. Document this in `helpString`.
- **Register once, after `jQuery` ready.** `addCommandObject` mutates a global parser state; re-running it (e.g. across hot-reloads) double-registers the same command. Guard with a module-level boolean or by reloading the page during development.
- **Legacy `context.registerSlashCommand` still works** but lacks typed args and autocomplete. Use the modern pattern shown above for new commands. The legacy signature is documented in [`CLAUDE.md` → Registering Slash Commands](../../../CLAUDE.md#registering-slash-commands).
- **No async timing guarantees against generation.** A user can fire your slash command mid-generation. If your handler conflicts with that state, check `context.isGenerating` and bail with a helpful message.

## See also

- Reference: [`slash-commands.md`](../modules/slash-commands.md) — full `SlashCommandParser`, `SlashCommand`, argument / enum classes, abort / scope APIs.
- Guide: [`show-a-modal.md`](show-a-modal.md) — popups make great slash-command UIs for confirmation.
- Guide: [`getting-started.md`](getting-started.md) — base extension scaffolding.
- CLAUDE.md: [Registering Slash Commands](../../../CLAUDE.md#registering-slash-commands) (legacy API), [Advanced Slash Command Registration](../../../CLAUDE.md#advanced-slash-command-registration) (the pattern shown here).
