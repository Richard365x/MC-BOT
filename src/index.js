import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, ChannelType, PermissionFlagsBits } from 'discord.js';
import cron from 'node-cron';
import { getConfig } from './lib/config.js';
import { dbRead, dbWrite } from './lib/db.js';
import { registerCommands } from './register-commands.js';
import { handleInteraction } from './router.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.once('ready', async () => {
  const cfg = getConfig();
  console.log(`[MC-BOT] Logged in as ${client.user.tag}`);
  console.log(`[MC-BOT] Guild: ${cfg.guildId}`);
});

client.on('interactionCreate', async (interaction) => {
  try {
    await handleInteraction(interaction, client);
  } catch (err) {
    console.error('Interaction error:', err);
    if (interaction.isRepliable()) {
      const msg = 'Something went bonkers. Staff has been notified.';
      interaction.replied || interaction.deferred ? interaction.followUp({ content: msg, ephemeral: true }) : interaction.reply({ content: msg, ephemeral: true });
    }
  }
});

// Hourly sweep to close expired private matches
cron.schedule('0 * * * *', async () => {
  const cfg = getConfig();
  const db = dbRead();
  const now = Date.now();
  const guild = await client.guilds.fetch(cfg.guildId).catch(() => null);
  if (!guild) return;
  for (const m of db.matches) {
    if (m.status === 'OPEN' && now - m.createdAt >= 24 * 60 * 60 * 1000) {
      // expire
      m.status = 'EXPIRED';
      try {
        const ch = await guild.channels.fetch(m.channelId);
        if (ch && ch.isTextBased()) {
          await ch.send('24 hours elapsed with no winner. This match is now closed.');
          await ch.lockPermissions();
          await ch.setArchived?.(true).catch(()=>{});
        }
      } catch {}
    }
  }
  dbWrite(db);
});

client.login(process.env.BOT_TOKEN);
