// deploy-commands.mjs
import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import config from './config.json' assert { type: 'json' };

// Collect slash command JSON from ./src/commands/*.js
const commandsDir = path.resolve('./src/commands');
const files = fs.existsSync(commandsDir)
  ? fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'))
  : [];

const commands = [];
for (const file of files) {
  const fileUrl = pathToFileURL(path.join(commandsDir, file)).href;
  const mod = await import(fileUrl);
  // Support either default export or named export
  const def = mod.default ?? mod;
  const data = def.data ?? mod.data;
  if (!data) continue;
  commands.push(typeof data.toJSON === 'function' ? data.toJSON() : data);
}

const appId = config.applicationId || process.env.APPLICATION_ID;
const guildId = config.guildId || process.env.GUILD_ID;
const token = process.env.BOT_TOKEN;

if (!appId || !guildId || !token) {
  console.error('Missing APP ID, GUILD ID, or BOT TOKEN. Check config.json and .env.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

try {
  console.log(`Registering ${commands.length} commands to guild ${guildId}...`);
  await rest.put(
    Routes.applicationGuildCommands(appId, guildId),
    { body: commands },
  );
  console.log('✅ Slash commands registered successfully.');
} catch (err) {
  console.error('❌ Failed to register:', err);
  process.exit(1);
}
