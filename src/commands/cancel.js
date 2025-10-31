import { getConfig } from '../lib/config.js';
import { dbRead, dbWrite } from '../lib/db.js';

export async function cancelHandler(interaction, client) {
  const cfg = getConfig();
  const db = dbRead();
  const matchId = interaction.options.getString('match', true);

  await interaction.deferReply({ ephemeral: true });

  const guild = await client.guilds.fetch(cfg.guildId);
  const me = await guild.members.fetch(interaction.user.id);

  const isOwner = interaction.user.id === cfg.ownerId;
  const isManager = me.roles.cache.some(r => cfg.permissions.resultManagers.includes(r.id));

  if (!isOwner && !isManager) {
    return interaction.editReply('Only Owner or Result Managers can cancel matches.');
  }

  const match = db.matches.find(m => m.id === matchId && m.status === 'OPEN');
  if (!match) return interaction.editReply('Open match not found with that ID.');

  match.status = 'CANCELLED';
  dbWrite(db);

  try {
    const ch = await guild.channels.fetch(match.channelId);
    await ch.send('This match has been cancelled by staff. Locking and archiving.');
    await ch.lockPermissions();
    await ch.setArchived?.(true).catch(()=>{});
  } catch {}

  const log = await guild.channels.fetch(cfg.logChannelId);
  await log.send(`CANCELLED ${match.id}: <@${match.challengerId}> vs <@${match.leaderId}>`);

  return interaction.editReply('Match cancelled.');
}
