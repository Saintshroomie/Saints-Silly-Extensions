# Saint's Silly Extensions

A [SillyTavern](https://github.com/SillyTavern/SillyTavern) third-party extension that adds two integrated roleplay tools: **Possession** and **Phrasing!**

## Features

### Possession

Take control of any character and post messages as them.

- **Solo chats** — A ghost icon button appears in the character panel to toggle possession
- **Group chats** — Radio-style toggles next to each group member let you pick who to possess
- **Continue interception** — When possessing, the Continue button posts your typed text as the possessed character, then triggers a continuation
- **Impersonate replacement** — While possessing, the standard Impersonate buttons are hidden and replaced with a character avatar button that triggers a generation as the possessed character (uses the character's speak action in groups, or trigger in solo)
- **State persistence** — Possession state (including character avatar) is saved per-chat and restored automatically when switching chats
- **Slash commands** — `/possess [name]` (supports partial name matching) and `/unpossess`

### Phrasing!

Enrich your messages with AI-generated narration, actions, and detail that stay consistent with the character and scene.

- **Context-aware rephrase** — The rephrase button adapts to what you're doing:
  - **Empty input** — Rephrases the last message in chat, using its latest swipe as the seed text
  - **Editing a message** — Confirms the edit, then rephrases that message
  - **Text in input** — Enriches your typed text (as you if normal, as the possessed character if possessing)
- **Swipe mode** — Use on the most recent message to create an enriched swipe variant while keeping the original
- **Seed text reinjection** — Rephrased messages remember their original seed prompt, so if you Continue a rephrased message the seed is reinjected to guide the generation
- **Custom prompts** — Customize the phrasing prompt per-chat or use the default template
- **Possession-aware** — When possessing a character, phrasing generates in that character's voice; otherwise it uses impersonate mode
- **Double-click prevention** — Rephrase buttons are disabled immediately on click, before generation starts

### How They Work Together

When Possession and Phrasing are used together, enriched responses are generated in the possessed character's voice and context, enabling character-authentic roleplay without manual narration.

## Installation

1. Open SillyTavern and go to **Extensions** > **Install Extension**
2. Paste this repository URL:
   ```
   https://github.com/Saintshroomie/Saints-Silly-Extensions
   ```
3. Click **Install** and refresh the page

### Manual Installation

Clone this repository into your SillyTavern extensions directory:

```bash
cd SillyTavern/data/default-user/extensions/third-party/
git clone https://github.com/Saintshroomie/Saints-Silly-Extensions
```

Refresh SillyTavern to load the extension.

## Configuration

Open **Extensions** > **Saint's Silly Extensions** in SillyTavern's settings panel.

### Possession Settings

| Setting | Description |
|---------|-------------|
| Enable Possession | Toggle the possession feature on/off |
| Show Toast on Possess/Unpossess | Display notifications when possession state changes |
| Debug Mode | Log detailed possession events to the browser console |

### Phrasing! Settings

| Setting | Description |
|---------|-------------|
| Enable Phrasing! | Toggle the phrasing feature on/off |
| Debug Mode | Log detailed phrasing events to the browser console |
| Prompt Template | Customize the AI prompt used for enrichment (per-chat) |

## Slash Commands

| Command | Description |
|---------|-------------|
| `/possess [name]` | Possess a character by name (partial matching supported) |
| `/unpossess` | Release the currently possessed character |
| `/phrasing` | Enrich the text in the input box or the last message |

## License

[GNU General Public License v3.0](LICENSE)

## Author

Chris Phifer
