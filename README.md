# MC-BOT v3.0.0

Unified **/challenge** flow with type → division → auto-pull Gym Leader (must have `Gym Leader` + selected Type + selected Division roles). 
Creates 24h private match channel, reminder at 12h, public announcement, and detailed log.

## Quick start
1. Create a file named `.env` at the project root with:
```
BOT_TOKEN=PUT_YOUR_BOT_TOKEN_HERE
GUILD_ID=1323266812024197140
APP_ID=PUT_YOUR_APPLICATION_ID_HERE
```
2. Edit `config.json` to set any remaining role IDs (placeholders are marked FILL_ME).
3. Install & run:
```
npm i
npm run register
npm run dev
```
