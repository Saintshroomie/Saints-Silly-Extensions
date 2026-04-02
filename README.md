# Saint's Silly Extensions

A [SillyTavern](https://github.com/SillyTavern/SillyTavern) third-party extension that adds two integrated roleplay tools: **Possession** and **Phrasing**

## Features

### Possession

Possession allows you to easily take control of any active character and post messages as them.

- **Solo chats** — A ghost icon button appears in the character panel to toggle possession
- **Group chats** — Radio-style toggles next to each group member let you pick who to possess
- **Continue interception** — When possessing, the Continue button posts your typed text as the possessed character, then triggers a continuation
- **Impersonate replacement** — While possessing, the standard Impersonate buttons are hidden and replaced with a character avatar button that triggers a generation as the possessed character (uses the character's speak action in groups, or trigger in solo)
- **State persistence** — Possession state (including character avatar) is saved per-chat and restored automatically when switching chats
- **Slash commands** — `/possess [name]` (supports partial name matching) and `/unpossess`

### Phrasing

Enrich your messages with LLM-generated narration, actions, and detail that stay consistent with the character and scene.

- **Context-aware rephrase** — The rephrase button (the Quill) adapts to what you're doing:
  - **Empty input** — Rephrases the last message in chat, using its latest swipe as the seed text
  - **Editing a message** — Confirms the edit, then rephrases that message
  - **Text in input** — Enriches your typed text (Not Possessing: as your selected persona, Possessing: as the possessed character)
- **Swipe mode** — Click the quill on the most recent message to create an enriched swipe variant while keeping the original
- **Seed text reinjection** — Rephrased messages remember their original seed prompt, so if you Continue a rephrased message the seed is reinjected to guide the generation
- **Custom prompts** — Customize the phrasing prompt per-chat or use the default template
- **Possession-aware** — When possessing a character, phrasing generates in that character's voice; otherwise it uses the standard ST impersonate feature

### How to Use Possession

Possession allows you to "possess" an active character in your solo or group chat (more useful for group chats). When possessing, your messages will be sent as that character rather than your active persona.

1. Select a character to possess by clicking their radio button in the active member panel (group chat) or the ghost icon in the character card panel (solo chat).
2. Click the Character Avatar Button to perform an ST-like Impersonate for that character (It's just generating a response as that character)

### How to Use Phrasing
Love the gist, but not the phrasing of a generation? Wish you could easily guide the next generation to write something similar? Phrasing allows you to seed a generation with either your own message, or an existing one. If your not a great writer or just feeling lazy, you can type out a paraphrase about what you want your character to say or do, press the quill button, and let the LLM do the hard work of actually writing the message.

**Paraphrasing for {{user}}:**
1. Enter your paraphrase, and press the quill button to trigger a standard SillyTavern Impersonation that is guided by your written text.

**Paraphrasing for {{char}}:**
1. Press the quill button on the most recent message (must be a character message) and Phrasing will guide a swipe generation with that message.
2. Didn't like the phrasing? Just activate the swipe you want for the seed (or edit it to paraphrase something else) and click the quill for another guided swipe.
3. Wish the guided message was longer? Click the continue button and Phrasing will make sure the seed continues to guide the Continue generation.

### How to Use Possession and Phrasing Together

When Possession and Phrasing are used together, you can quickly take over characters, and guide their generation by paraphrasing. 

1. Select a character to possess.
2. Type a paraphrase of what you want your possessed character to do or say or feel, and press the quill button to let the LLM do the hard work.
3. Pressing the quill button again will perform a swipe using the active message as the guiding seed.


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
