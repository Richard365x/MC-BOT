require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'src', 'commands');
for (const file of fs.readdirSync(commandsPath)) {
  if (!file.endsWith('.js')) continue;
  const cmd = require(path.join(commandsPath, file));
  commands.push(cmd.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Refreshing application (/) commands…');
    await rest.put(
      Routes.applicationGuildCommands(process.env.APP_ID, process.env.GUILD_ID),
      { body: commands },
    );
    console.log('Done.');
  } catch (error) {
    console.error(error);
  }
})();