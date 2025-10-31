// src/bootstrap/commandSync.js
// Auto-sync slash commands to the guild on boot so you don't have to run a separate register step.
import { REST, Routes } from 'discord.js';

/**
 * @param {string} appId      Discord Application ID
 * @param {string} token      Bot token
 * @param {string} guildId    Target guild ID
 * @param {Array<object>} commandsJson  Array of slash command JSON
 */
export async function syncCommands(appId, token, guildId, commandsJson) {
  const rest = new REST({ version: '10' }).setToken(token);
  try {
    await rest.put(Routes.applicationGuildCommands(appId, guildId), { body: commandsJson });
    console.log(`[CommandSync] Synced ${commandsJson.length} commands to ${guildId}`);
  } catch (err) {
    console.error('[CommandSync] Failed to sync commands:', err?.message || err);
  }
}
