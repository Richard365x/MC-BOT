# MC-BOT v3.3.0

Unified **/challenge**, **/result**, and **/set_order** for the gym circuit. Private battle rooms, timed reminders, public announcements, logging, and rank-aware rewards.

## 1) Setup
- Install Node.js 18+ (you said you're on 24.11.0 which is fine).
- Copy `.env.example` to `.env` and fill:
  - DISCORD_TOKEN= (keep secret)
  - APPLICATION_ID= (from Dev Portal)
  - GUILD_ID=1323266812024197140
  - BATTLE_ANNOUNCEMENTS_CHANNEL_ID=1433151880414105790
  - LOG_CHANNEL_ID=1426840044584566835
  - PRIVATE_MATCH_CATEGORY_ID=1335485679135621222
  - OWNER_ID=174383448931172352

## 2) Role IDs
Put your verified IDs into `data/Verified Role IDs.txt`. This is the source of truth for:
- TYPE_ROLES (ordered)
- RANK_ROLES (E..A,S,Apex)
- GYMLEADER_ROLE
- WINNER_RANK_ROLES (winner roles mapped to defeated rank)
- LOSER_ROLE

## 3) Commands
- `/set_order types_csv:"Fire,Water,Grass,..."` — league director+ updates the seasonal order.
- `/challenge type:<index or name from set_order> division:<E|D|C|B|A|S|Apex>`
  - Creates private channel under your category for challenger and auto-resolved leader.
  - Announces publicly and logs details.
  - Reminds at 12h, auto-locks/archives at 24h.
- `/result winner:@user loser:@user defeated_rank:<E|D|C|B|A|S|Apex>`
  - Applies the matching Winner role and the Loser role, and narrates XP.

## 4) Deploy Commands
```bash
npm i
npm run register
npm start
```

## Notes
- Only users with rank roles (E..A,S,Apex) can issue `/challenge`.
- The bot resolves the Gym Leader by intersecting TYPE + DIVISION + GYM LEADER roles.
- Everything stays inside the server: announcements and logs in your channels.
