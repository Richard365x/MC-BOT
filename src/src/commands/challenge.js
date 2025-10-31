const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ids = require('../util/ids.js');
const matches = require('../util/matches.js');

const TYPE_CHOICES = Object.entries(ids.TYPES).map(([k,v]) => ({ name: k, value: k }));
const DIVISION_CHOICES = [
  { name: 'E', value: 'E'},
  { name: 'D', value: 'D'},
  { name: 'C', value: 'C'},
  { name: 'B', value: 'B'},
  { name: 'A', value: 'A'},
  { name: 'S', value: 'S'},
  { name: 'Apex', value: 'APEX'}
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('challenge')
    .setDescription('Issue a gym challenge.')
    .addStringOption(o => o.setName('type').setDescription('Gym type').setRequired(true).addChoices(...TYPE_CHOICES))
    .addStringOption(o => o.setName('division').setDescription('Rank division').setRequired(true).addChoices(...DIVISION_CHOICES)),
  async execute(interaction, client){
    const member = interaction.member;
    // Ensure challenger has a rank role (E→Apex)
    const hasRank = Object.values(ids.ROLES.RANK).some(r => member.roles.cache.has(r));
    if (!hasRank) return interaction.reply({ content: 'You must have a rank role to issue a challenge.', ephemeral: true });

    const typeKey = interaction.options.getString('type');
    const divKey = interaction.options.getString('division');

    // Find the gym leader by roles: Gym Leader + selected type + selected division rank
    const guild = await client.guilds.fetch(ids.GUILD_ID);
    await guild.members.fetch();
    const targetRoleIds = [ids.ROLES.GYM_LEADER, ids.TYPES[typeKey], ids.ROLES.RANK[divKey]];
    const leader = guild.members.cache.find(m => targetRoleIds.every(rid => m.roles.cache.has(rid)));
    if (!leader) return interaction.reply({ content: `No gym leader found for ${typeKey} in ${divKey}.`, ephemeral: true });

    // Prevent self-challenge
    if (leader.id === member.id) {
      return interaction.reply({ content: 'You can’t issue a challenge to yourself.', ephemeral: true });
    }

    // Create private thread/channel under the configured category
    const category = guild.channels.cache.get(ids.CHANNELS.PRIVATE_MATCH_CATEGORY);
    if (!category) return interaction.reply({ content: 'Private match category missing.', ephemeral: true });

    const channel = await guild.channels.create({
      name: `match-${typeKey.toLowerCase()}-${divKey.toLowerCase()}-${member.user.username}`.slice(0,90),
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: leader.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
      ]
    });

    // Announce publicly
    const announce = guild.channels.cache.get(ids.CHANNELS.BATTLE_ANNOUNCEMENTS);
    const embed = new EmbedBuilder()
      .setTitle('⚔️ Gym Challenge Issued')
      .setDescription(`**Type:** ${typeKey}
**Division:** ${divKey}
**Challenger:** <@${member.id}>
**Leader:** <@${leader.id}>`)
      .setFooter({ text: '24h window • 12h reminder • result by staff' })
      .setTimestamp();
    await announce?.send({ content: `<@${member.id}> vs <@${leader.id}>`, embeds: [embed] });

    // Log to logs channel
    const log = guild.channels.cache.get(ids.CHANNELS.LOGS);
    await log?.send(`Challenge created | Type: ${typeKey} | Division: ${divKey} | Challenger: ${member.user.tag} (${member.id}) | Leader: ${leader.user.tag} (${leader.id}) | Channel: <#${channel.id}>`);

    // Save match record
    const match = {
      id: `${Date.now()}-${member.id}`,
      type: typeKey,
      division: divKey,
      challengerId: member.id,
      leaderId: leader.id,
      privateChannelId: channel.id,
      createdAt: Date.now(),
      reminderSent: false,
      closed: false
    };
    matches.upsert(match);

    await channel.send(`Welcome <@${member.id}> and <@${leader.id}> — this is your private match channel. You have 24 hours. A reminder will go out at 12 hours.`);
    return interaction.reply({ content: `Challenge issued. Private channel: <#${channel.id}>`, ephemeral: true });
  }
};