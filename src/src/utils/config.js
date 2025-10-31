import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
dotenv.config();

const root = path.resolve(process.cwd());
const dataFile = path.join(root, 'data', 'Verified Role IDs.txt');

/**
 * Simple parser for the Verified Role IDs file.
 * Each section header in [BRACKETS]. Each following non-empty, non-comment line is collected.
 */
function parseVerifiedFile(txt) {
  const sections = {};
  let current = null;
  txt.split(/\r?\n/).forEach(line => {
    const raw = line.trim();
    if (!raw || raw.startsWith('#')) return;
    const m = raw.match(/^\[(.+?)\]$/);
    if (m) { current = m[1]; sections[current] = []; return; }
    if (current) sections[current].push(raw);
  });
  return sections;
}

export function loadConfig() {
  // .env first
  const env = {
    token: process.env.DISCORD_TOKEN,
    appId: process.env.APPLICATION_ID,
    guildId: process.env.GUILD_ID,
    ownerId: process.env.OWNER_ID,
    battleAnnouncementsChannelId: process.env.BATTLE_ANNOUNCEMENTS_CHANNEL_ID,
    logChannelId: process.env.LOG_CHANNEL_ID,
    privateMatchCategoryId: process.env.PRIVATE_MATCH_CATEGORY_ID,
  };

  // Optional role IDs from data file
  let roles = {
    typeRoles: [],                 // ordered list
    rankRoles: [],                 // [E,D,C,B,A,S,Apex]
    gymLeaderRole: null,
    winnerRankRoles: [],           // [Winner-E,...,Winner-Apex]
    loserRole: null
  };

  if (fs.existsSync(dataFile)) {
    const parsed = parseVerifiedFile(fs.readFileSync(dataFile, 'utf-8'));
    roles.typeRoles = parsed['TYPE_ROLES'] || roles.typeRoles;
    roles.rankRoles = parsed['RANK_ROLES'] || roles.rankRoles;
    roles.gymLeaderRole = (parsed['GYMLEADER_ROLE'] || [null])[0];
    roles.winnerRankRoles = parsed['WINNER_RANK_ROLES'] || roles.winnerRankRoles;
    roles.loserRole = (parsed['LOSER_ROLE'] || [null])[0];
  }

  // XP schedule by defeated rank (E..A,S,Apex). Values you specified.
  const xpForLosingToRank = {
    E: 1000,
    D: 1500,
    C: 2000,
    B: 3000,
    A: 4000,
    S: 5000,
    Apex: 10000   // you said Apex is 10000; leaving this locked.
  };

  return { env, roles, xpForLosingToRank };
}

export const RANK_ORDER = ['E','D','C','B','A','S','Apex'];
