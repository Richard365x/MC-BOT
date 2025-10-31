import 'dotenv/config';
import {
  ChannelType,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
} from 'discord.js';
import { loadConfig, RANK_ORDER } from './utils/config.js';

const { env, roles, xpForLosingToRank } = loadConfig();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ],
  partials: [Partials.Channel]
});

// In-memory season order
let seasonOrder = []; // array of type strings

function getRankIndex(rank) {
  return RANK_ORDER.indexOf(rank);
}

// Resolve leader by TYPE + DIVISION + GYM_LEADER role intersection
async function resolveLeader(guild, typeRoleId, divisionRoleId, gymLeaderRoleId) {
  const members = await guild.members.fetch({ withPresences: false });
  for (const [,m] of members) {
    const hasType = m.roles.cache.has(typeRoleId);
    const hasDiv = m.roles.cache.has(divisionRoleId);
    const hasGL  = m.roles.cache.has(gymLeaderRoleId);
    if (hasType && hasDiv && hasGL) return m;
  }
  return null;
}

client.once('ready', () => {
  console.log(`MC-BOT ready as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const guild = interaction.guild;
  if (!guild) return;

  const battleAnnouncementsId = env.battleAnnouncementsChannelId;
  const logChannelId = env.logChannelId;
  const privateCategoryId = env.privateMatchCategoryId;

  const announceCh = guild.channels.cache.get(battleAnnouncementsId);
  const logCh = guild.channels.cache.get(logChannelId);
  const privCat = guild.channels.cache.get(privateCategoryId);

  // Guardrails for missing critical channels
  if (!announceCh) return interaction.reply({ content: 'Config error: battle announcements channel not found.', ephemeral: true });
  if (!logCh) return interaction.reply({ content: 'Config error: log channel not found.', ephemeral: true });
  if (!privCat) return interaction.reply({ content: 'Config error: private match category not found.', ephemeral: true });

  try {
    if (interaction.commandName === 'set_order') {
      const csv = interaction.options.getString('types_csv', true);
      seasonOrder = csv.split(',').map(s => s.trim()).filter(Boolean);
      await interaction.reply({ content: `Season order updated: ${seasonOrder.join(' > ')}`, ephemeral: true });
      await logCh.send(`Season order set by ${interaction.user.tag}: ${seasonOrder.join(' -> ')}`);
      return;
    }

    if (interaction.commandName === 'challenge') {
      // Only ranked members (E..A,S,Apex) can issue
      const issuer = await guild.members.fetch(interaction.user.id);
      const rankHit = roles.rankRoles.find(id => issuer.roles.cache.has(id));
      if (!rankHit) {
        return interaction.reply({ content: 'You need a rank role (E..A,S,Apex) to issue a challenge.', ephemeral: true });
      }

      const type = interaction.options.getString('type', true);
      const division = interaction.options.getString('division', true);
      const rankIdx = getRankIndex(division);
      if (rankIdx < 0) return interaction.reply({ content: 'Invalid division. Use one of: ' + RANK_ORDER.join(', '), ephemeral: true });

      // Map: type string -> type role id by index from roles.typeRoles using seasonOrder if provided, otherwise by name match later.
      // First attempt: if your verified file lists typeRoles in canonical order, we accept 'type' as literal name and look up by index of seasonOrder or by simple name map.
      // Simple name map: case-insensitive equality against known list derived from your role cache.
      let typeRoleId = null;
      // try direct numeric index if "type" was given like "1..18"
      if (/^\d+$/.test(type)) {
        const idx = parseInt(type,10)-1;
        if (roles.typeRoles[idx]) typeRoleId = roles.typeRoles[idx];
      }
      // else try by name mapping: not implemented here because your types are “no label” in your note; relying on order.
      if (!typeRoleId) {
        // fallback to order name matching
        const idx = seasonOrder.findIndex(t => t.toLowerCase() === type.toLowerCase());
        if (idx >= 0 && roles.typeRoles[idx]) typeRoleId = roles.typeRoles[idx];
      }
      if (!typeRoleId) {
        return interaction.reply({ content: 'Could not resolve the type role from your input. Use a number that matches your TYPE_ROLES order or a name present in the season order.', ephemeral: true });
      }

      const divisionRoleId = roles.rankRoles[rankIdx];
      const gymLeaderRoleId = roles.gymLeaderRole;

      if (!gymLeaderRoleId) return interaction.reply({ content: 'Config error: Gym Leader role ID missing.', ephemeral: true });

      const leader = await resolveLeader(guild, typeRoleId, divisionRoleId, gymLeaderRoleId);
      if (!leader) {
        return interaction.reply({ content: 'No matching Gym Leader found for that type + division at the moment.', ephemeral: true });
      }

      // Create private channel under category for issuer + leader
      const chan = await guild.channels.create({
        name: `battle-${issuer.user.username}-vs-${leader.user.username}`.toLowerCase(),
        type: ChannelType.GuildText,
        parent: privCat.id,
        permissionOverwrites: [
          { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: issuer.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
          { id: leader.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
          { id: env.ownerId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory] },
        ]
      });

      // Build announcement embed to mirror your reference style
      const embed = new EmbedBuilder()
        .setTitle('Gym Challenge Issued')
        .setDescription(`${issuer} has challenged ${leader} — Division **${division}**`)
        .addFields(
          { name: 'Type', value: type, inline: true },
          { name: 'Private Room', value: `<#${chan.id}>`, inline: true }
        )
        .setTimestamp(new Date());

      await announceCh.send({ embeds: [embed] });
      await interaction.reply({ content: `Challenge created. Private room: <#${chan.id}>`, ephemeral: true });

      // Log details
      await logCh.send([
        `Challenge: ${issuer.user.tag} vs ${leader.user.tag}`,
        `Type: ${type} | Division: ${division}`,
        `Room: #${chan.name} (${chan.id})`
      ].join('\n'));

      // 12h reminder and 24h auto-close job (basic timer, resets if process restarts)
      setTimeout(async () => {
        try { await chan.send(`12-hour reminder: ${issuer} vs ${leader} — please begin your match.`); } catch {}
      }, 12 * 60 * 60 * 1000);

      setTimeout(async () => {
        try {
          await chan.send('Time expired. Channel will lock and archive.');
          await chan.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
          await chan.setLocked(true).catch(()=>{});
          await chan.setArchived(true).catch(()=>{});
        } catch {}
      }, 24 * 60 * 60 * 1000);

      return;
    }

    if (interaction.commandName === 'result') {
      const winner = interaction.options.getUser('winner', true);
      const loser = interaction.options.getUser('loser', true);
      const defeated = interaction.options.getString('defeated_rank', true);

      const w = await guild.members.fetch(winner.id);
      const l = await guild.members.fetch(loser.id);

      const idx = RANK_ORDER.indexOf(defeated);
      if (idx < 0) return interaction.reply({ content: 'Invalid rank specified.', ephemeral: true });

      const winnerRoleId = roles.winnerRankRoles[idx];
      const loserRoleId = roles.loserRole;
      if (!winnerRoleId || !loserRoleId) return interaction.reply({ content: 'Config error: winner/loser roles not fully configured.', ephemeral: true });

      await w.roles.add(winnerRoleId).catch(()=>{});
      await l.roles.add(loserRoleId).catch(()=>{});

      // XP announcement (server handles XP; we just narrate numbers)
      const xpToLoser = Object.entries(xpForLosingToRank).find(([r]) => r === defeated)[1] ?? 0;

      const embed = new EmbedBuilder()
        .setTitle('Match Result')
        .setDescription(`Winner: ${w} | Loser: ${l}`)
        .addFields(
          { name: 'Defeated Rank', value: defeated, inline: true },
          { name: 'Rewards', value: `Winner role applied.
Loser role applied (+${xpToLoser} XP).`, inline: true }
        )
        .setTimestamp(new Date());

      await interaction.reply({ content: 'Result recorded.', ephemeral: true });
      await (await interaction.client.channels.fetch(env.battleAnnouncementsChannelId)).send({ embeds: [embed] });
      await (await interaction.client.channels.fetch(env.logChannelId)).send([
        `Result recorded by ${interaction.user.tag}`,
        `Winner: ${w.user.tag} -> role ${winnerRoleId}`,
        `Loser: ${l.user.tag} -> role ${loserRoleId} (+${xpToLoser} XP)`
      ].join('\n'));

      return;
    }
  } catch (err) {
    console.error(err);
    try {
      await interaction.reply({ content: 'Something bonked. Logged for admins.', ephemeral: true });
      await logCh.send('Error: ```' + (err?.stack || err?.message || String(err)) + '```');
    } catch {}
  }
});

client.login(env.token);
