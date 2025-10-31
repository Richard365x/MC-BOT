import { ChannelType, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { getConfig } from '../lib/config.js';
import { dbRead, dbWrite } from '../lib/db.js';
import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

function hasAnyRank(member, cfg) {
  const rankIds = Object.values(cfg.roles.rankRoles).filter(Boolean);
  return member.roles.cache.some(r => rankIds.includes(r.id));
}

function getTypeRoleId(cfg, typeName) {
  const rec = cfg.types.find(t => t.name.toLowerCase() === typeName.toLowerCase());
  return rec?.roleId || null;
}

export async function challengeHandler(interaction, client) {
  const cfg = getConfig();
  const db = dbRead();
  const typeName = interaction.options.getString('type', true);
  const divisionName = interaction.options.getString('division', true);

  await interaction.deferReply({ ephemeral: true });

  const guild = await client.guilds.fetch(cfg.guildId);
  const member = await guild.members.fetch(interaction.user.id);

  if (!hasAnyRank(member, cfg)) {
    return interaction.editReply('You need a rank role (E → Apex) to issue a challenge.');
  }

  // Prevent self-challenge (if user is also a leader with same type+division)
  const gymLeaderRoleId = cfg.roles.gymLeaderRoleId;
  const typeRoleId = getTypeRoleId(cfg, typeName);
  const divisionRole = guild.roles.cache.find(r => r.name === divisionName) || null;

  if (!gymLeaderRoleId || !typeRoleId || !divisionRole) {
    return interaction.editReply('Configuration is incomplete (roles missing). Staff needs to fill config.json.');
  }

  const candidates = (await guild.members.fetch()).filter(m =>
    m.roles.cache.has(gymLeaderRoleId) &&
    m.roles.cache.has(typeRoleId) &&
    m.roles.cache.has(divisionRole.id)
  );

  if (candidates.size === 0) {
    return interaction.editReply('No Gym Leader found with Gym Leader + selected Type + selected Division. Please ping staff.');
  }
  if (candidates.size > 1) {
    return interaction.editReply('Multiple Gym Leaders match that type+division. Staff needs to fix duplicate assignments.');
  }

  const leader = candidates.first();
  if (leader.id === member.id) {
    return interaction.editReply('You cannot challenge yourself. Nice try, mirror match enthusiast.');
  }

  // Create private channel under category
  const parentId = cfg.privateMatchCategoryId;
  const ch = await guild.channels.create({
    name: `match-${typeName.toLowerCase()}-${nanoid()}`,
    type: ChannelType.GuildText,
    parent: parentId,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: leader.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
    ]
  });

  const matchId = nanoid();
  const now = Date.now();
  db.matches.push({
    id: matchId,
    challengerId: member.id,
    leaderId: leader.id,
    typeName,
    divisionName,
    channelId: ch.id,
    createdAt: now,
    status: 'OPEN'
  });
  dbWrite(db);

  // Announcement embed
  const ann = new EmbedBuilder()
    .setTitle('Gym Challenge Issued!')
    .setDescription(`${member} has challenged ${leader} for the **${typeName}** Gym (${divisionName}).`)
    .addFields(
      { name: 'Match ID', value: matchId, inline: true },
      { name: 'Private Match Channel', value: `<#${ch.id}>`, inline: true }
    )
    .setTimestamp(new Date(now));

  const annChan = await guild.channels.fetch(cfg.announcementChannelId);
  await annChan.send({ embeds: [ann] });

  const logChan = await guild.channels.fetch(cfg.logChannelId);
  await logChan.send(`NEW MATCH ${matchId}: Challenger <@${member.id}> vs Leader <@${leader.id}> — Type: ${typeName} — Division: ${divisionName} — Channel: <#${ch.id}>`);

  // Private channel intro + 12h reminder
  await ch.send(`Welcome <@${member.id}> and <@${leader.id}>! You have 24 hours to complete this battle. A reminder will ping at 12 hours.`);

  setTimeout(async () => {
    try {
      const freshDb = dbRead();
      const mm = freshDb.matches.find(m => m.id === matchId);
      if (!mm || mm.status !== 'OPEN') return;
      const channel = await guild.channels.fetch(ch.id);
      await channel.send(`<@${member.id}> <@${leader.id}> 12-hour reminder: please complete your battle.`);
    } catch {}
  }, 12 * 60 * 60 * 1000);

  return interaction.editReply('Challenge created. Check the battle announcement and your private channel.');
}
