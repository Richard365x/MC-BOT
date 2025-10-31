import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { RANK_ORDER } from './utils/config.js';

const commands = [
  // Single unified challenge command
  new SlashCommandBuilder()
    .setName('challenge')
    .setDescription('Issue a gym challenge (choose type + division; auto-finds the leader).')
    .addStringOption(opt => opt.setName('type')
      .setDescription('Gym type')
      .setRequired(true))
    .addStringOption(opt => opt.setName('division')
      .setDescription('Rank division (E, D, C, B, A, S, Apex)')
      .setRequired(true))
    .setDMPermission(false),

  new SlashCommandBuilder()
    .setName('result')
    .setDescription('Record the match result and award roles/XP.')
    .addUserOption(opt => opt.setName('winner').setDescription('Winner of the match').setRequired(true))
    .addUserOption(opt => opt.setName('loser').setDescription('Loser of the match').setRequired(true))
    .addStringOption(opt => opt.setName('defeated_rank')
      .setDescription('Rank defeated (E..A,S,Apex) for winner reward mapping')
      .setRequired(true)
      .addChoices(...RANK_ORDER.map(r => ({ name: r, value: r }))))
    .setDMPermission(false),

  new SlashCommandBuilder()
    .setName('set_order')
    .setDescription('Set the gym order for the current season (list of types).')
    .addStringOption(opt => opt.setName('types_csv')
      .setDescription('Comma-separated list of types in order for the season')
      .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function main() {
  const appId = process.env.APPLICATION_ID;
  const guildId = process.env.GUILD_ID;
  await rest.put(Routes.applicationGuildCommands(appId, guildId), { body: commands });
  console.log('Slash commands registered in guild:', guildId);
}

main().catch(console.error);
