const { SlashCommandBuilder } = require('discord.js');
const ids = require('../util/ids.js');
const matches = require('../util/matches.js');

function isStaff(member){
  return member.id === ids.OWNER_ID || member.roles.cache.has(ids.ROLES.LEAGUE_DIRECTOR);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cancel')
    .setDescription('Cancel a match and archive its channel.')
    .addStringOption(o => o.setName('match_id').setDescription('Match ID').setRequired(true)),
  async execute(interaction, client){
    const member = interaction.member;
    const matchId = interaction.options.getString('match_id');
    const match = matches.all()[matchId];
    if (!match) return interaction.reply({ content: 'Match not found.', ephemeral: true });

    if (!(isStaff(member) || [match.challengerId, match.leaderId].includes(member.id))) {
      return interaction.reply({ content: 'Only staff or match participants can cancel.', ephemeral: true });
    }

    const guild = await client.guilds.fetch(ids.GUILD_ID);
    try {
      const ch = await guild.channels.fetch(match.privateChannelId);
      await ch.send('Match canceled. Channel locked and archived.');
      await ch.permissionOverwrites.edit(match.challengerId, { ViewChannel: false, SendMessages: false }).catch(()=>{});
      await ch.permissionOverwrites.edit(match.leaderId, { ViewChannel: false, SendMessages: false }).catch(()=>{});
      await ch.setArchived?.(true).catch(()=>{});
    } catch {}

    matches.remove(matchId);
    const log = guild.channels.cache.get(ids.CHANNELS.LOGS);
    await log?.send(`Match canceled | ${matchId}`);
    return interaction.reply({ content: `Canceled match ${matchId}.`, ephemeral: true });
  }
};