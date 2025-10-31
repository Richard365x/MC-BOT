# MC-BOT Guardrails Patch (v1)

This add‑on makes slash‑commands fail soft and auto‑syncs command schemas so you don’t have to rerun a separate “register” step.

## What’s inside
- `src/bootstrap/commandSync.js` — syncs commands to the guild on boot.
- `src/utils/guards.js` — helpers: required option check, self‑challenge prevention, simple error net.
- `README.txt` — these instructions.

## How to install (90 seconds)

1) **Copy** the `src/bootstrap` and `src/utils` folders into your existing project so the paths match.
2) In your **main entry** (usually `src/index.js`), at the top add:
```js
import { installGlobalErrorNet } from './utils/guards.js';
installGlobalErrorNet();
```
3) Still in `src/index.js`, **after** your client logs in and once you have `APP_ID`, `BOT_TOKEN`, and your `GUILD_ID`, call:
```js
import { syncCommands } from './bootstrap/commandSync.js';
import { commandsJson } from '../scripts/commandsJson.js'; // or wherever you build your SlashCommandBuilder JSON

await syncCommands(process.env.APP_ID, process.env.BOT_TOKEN, process.env.GUILD_ID, commandsJson);
```
> If you currently register commands from a separate script, export the JSON you use there as `commandsJson` and reuse it here. No duplication needed.

4) In your command handlers (e.g., `src/commands/challenge.js`), replace raw option access with guard helpers:
```js
import { requireStringOpt, forbidSelfChallenge } from '../utils/guards.js';

const type = requireStringOpt(interaction, 'type', 'Try: `/challenge type:<…> division:<…>`'); if (!type) return;
const division = requireStringOpt(interaction, 'division'); if (!division) return;

// resolve leader as before…
if (forbidSelfChallenge(interaction, leader.id)) return;
```

## Prevent “missing option” forever
When you build the slash command, mark options **required** and constrain with **choices**:

```js
// Example in your command registration file:
new SlashCommandBuilder()
  .setName('challenge')
  .setDescription('Issue a gym challenge')
  .addStringOption(o => o.setName('type').setDescription('Gym type').setRequired(true).addChoices(...TYPE_CHOICES))
  .addStringOption(o => o.setName('division').setDescription('Division').setRequired(true).addChoices(...DIVISION_CHOICES));
```

After this patch, if a user submits without the required options, Discord prevents it before it ever reaches your bot.

Happy battling! 🎮
