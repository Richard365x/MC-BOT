import { getConfig } from '../lib/config.js';
import { dbRead, dbWrite } from '../lib/db.js';

function getRankOf(member, cfg) {
  for (const [rank, roleId] of Object.entries(cfg.roles.rankRoles)) {
    if (roleId && member.roles.cache.has(roleId)) return rank;
  }
  return null;
}

export async function resultHandler(interaction, client) {
  const cfg = getConfig();
  const db = dbRead();

  await interaction.deferReply({ ephemeral: true });

  // perms: owner or any resultManagers role
  const guild = await client.guilds.fetch(cfg.guildId);
  const me = await guild.members.fetch(interaction.user.id);
  const allowed = interaction.user.id === cfg.ownerId ||
    me.roles.cache.some(r => cfg.permissions.resultManagers.includes(r.id));
  if (!allowed) return interaction.editReply('You do not have permission to set results.');

  // Find the most recent OPEN match in which the winner participated (channel context would be better; for simplicity choose recent OPEN where winner is challenger/leader)
  const winner = interaction.options.getUser('winner', true);
  const match = [...db.matches].reverse().find(
  m => m.status === 'OPEN' && (m.challengerId === winner.id || m.leaderId === winner.id)
);

  if (!match) return interaction.editReply('No open match found involving that user.');

  const guildWinner = await guild.members.fetch(winner.id);
  const challenger = await guild.members.fetch(match.challengerId);
  const leader = await guild.members.fetch(match.leaderId);

  const winnerIsChallenger = (guildWinner.id === challenger.id);
  const loser = winnerIsChallenger ? leader : challenger;

  // Determine defeated rank: scan loser
  const defeatedRank = getRankOf(loser, cfg) || 'E';
  const xpForWinner = cfg.xpAwards[defeatedRank] ?? 0;
  const xpForLoser = cfg.xpAwards['LOSER'] ?? 0;

  // Assign roles
  const loserRoleId = cfg.roles.loserRoleId;
  const winnerRoleId = cfg.roles.winnerRolesByDefeatedRank[defeatedRank];

  try {
    if (loserRoleId) await loser.roles.add(loserRoleId);
    if (winnerRoleId) await guildWinner.roles.add(winnerRoleId);
  } catch {}

  // Close the channel
  try {
    const ch = await guild.channels.fetch(match.channelId);
    await ch.send(`Result set by staff. Winner: <@${guildWinner.id}>. Awarding **${xpForWinner} XP** to winner and **${xpForLoser} XP** to loser.`);
    await ch.lockPermissions();
    await ch.setArchived?.(true).catch(()=>{});
  } catch {}

  // Update DB
  match.status = 'RESOLVED';
  match.winnerId = guildWinner.id;
  match.loserId = loser.id;
  dbWrite(db);

  // Announce and log
  try {
    const ann = await guild.channels.fetch(cfg.announcementChannelId);
    await ann.send(`🏆 Match ${match.id} — Winner: <@${guildWinner.id}> (vs <@${loser.id}>) — Defeated rank: **${defeatedRank}** — XP: +${xpForWinner} / +${xpForLoser}.`);
    const log = await guild.channels.fetch(cfg.logChannelId);
    await log.send(`RESOLVED ${match.id}: Winner <@${guildWinner.id}>, Loser <@${loser.id}>, Defeated rank ${defeatedRank}, XP winner ${xpForWinner}, XP loser ${xpForLoser}.`);
  } catch {}

  return interaction.editReply('Result recorded, roles assigned, and channels closed.');
}
