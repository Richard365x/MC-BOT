import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { getConfig } from './lib/config.js';

const cfg = getConfig();
const types = cfg.types.map(t => ({ name: t.name, value: t.name }));
const divisions = cfg.divisions.map(d => ({ name: d, value: d }));

const commands = [
  new SlashCommandBuilder()
    .setName('challenge')
    .setDescription('Challenge a Gym Leader by type and division')
    .addStringOption(o => o.setName('type').setDescription('Gym type').setRequired(true).addChoices(...types))
    .addStringOption(o => o.setName('division').setDescription('Division').setRequired(true).addChoices(...divisions)),
  new SlashCommandBuilder()
    .setName('result')
    .setDescription('Set the winner for an active match')
    .addUserOption(o => o.setName('winner').setDescription('Winner of the match').setRequired(true)),
  new SlashCommandBuilder()
    .setName('set-order')
    .setDescription('Set the season gym order (directors/owner only)')
    .addStringOption(o => o.setName('order').setDescription('Comma-separated type names').setRequired(true)),
  new SlashCommandBuilder()
    .setName('cancel')
    .setDescription('Cancel an active match you opened or staff can cancel')
    .addStringOption(o => o.setName('match').setDescription('Match ID from logs').setRequired(true))
].map(c=>c.toJSON());

export async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
  await rest.put(Routes.applicationGuildCommands(process.env.APP_ID, cfg.guildId), { body: commands });
  console.log('Slash commands registered.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  registerCommands().catch(console.error);
}
