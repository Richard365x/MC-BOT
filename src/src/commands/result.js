const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ids = require('../util/ids.js');
const { xpForRank } = require('../util/xp.js');
const matches = require('../util/matches.js');

function isStaff(member){
  return member.id === ids.OWNER_ID || member.roles.cache.has(ids.ROLES.LEAGUE_DIRECTOR);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('result')
    .setDescription('Record match result and award roles/XP.')
    .addStringOption(o => o.setName('match_id').setDescription('Match ID as shown in logs').setRequired(true))
    .addUserOption(o => o.setName('winner').setDescription('Winner of the match').setRequired(true)),
  async execute(interaction, client){
    const member = interaction.member;
    if (!isStaff(member)) return interaction.reply({ content: 'Only Owner or League Director can record results.', ephemeral: true });

    const matchId = interaction.options.getString('match_id');
    const winner = interaction.options.getUser('winner');
    const state = matches.all();
    const match = state[matchId];
    if (!match) return interaction.reply({ content: 'Match not found.', ephemeral: true });

    const guild = await client.guilds.fetch(ids.GUILD_ID);
    const gWinner = await guild.members.fetch(winner.id);
    const gChallenger = await guild.members.fetch(match.challengerId);
    const gLeader = await guild.members.fetch(match.leaderId);

    // Determine loser
    const loser = (winner.id === gChallenger.id) ? gLeader : gChallenger;

    // Award winner role based on defeated rank (division of the leader)
    const winRole = ids.ROLES.WINNER[match.division];
    if (winRole) await gWinner.roles.add(winRole).catch(()=>{});

    // Auto-assign loser role
    await loser.roles.add(ids.ROLES.LOSER).catch(()=>{});

    // Compute XP awards
    const xpWin = xpForRank(match.division);
    const xpLose = ids.XP.LOSER;

    // Announce XP
    const announce = guild.channels.cache.get(ids.CHANNELS.BATTLE_ANNOUNCEMENTS);
    await announce?.send(`Result for match ${matchId}: **Winner:** <@${gWinner.id}> (+${xpWin} XP) • **Loser:** <@${loser.id}> (+${xpLose} XP)`);

    // Lock and archive channel
    try {
      const ch = await guild.channels.fetch(match.privateChannelId);
      await ch.permissionOverwrites.edit(gChallenger.id, { ViewChannel: false, SendMessages: false }).catch(()=>{});
      await ch.permissionOverwrites.edit(gLeader.id, { ViewChannel: false, SendMessages: false }).catch(()=>{});
      await ch.send('Result recorded. Channel locked and archived.');
      await ch.setArchived?.(true).catch(()=>{});
    } catch {}

    // Log
    const log = guild.channels.cache.get(ids.CHANNELS.LOGS);
    await log?.send(`Result recorded | Match: ${matchId} | Winner: ${gWinner.user.tag} | Loser: ${loser.user.tag} | Division: ${match.division} | Type: ${match.type}`);

    match.closed = true;
    matches.upsert(match);
    return interaction.reply({ content: `Result recorded for ${matchId}.`, ephemeral: true });
  }
};