
# MC-BOT State Kit (Persistent Manifest)

This add-on gives your bot **persistent, file-backed state** so we never lose critical IDs/config between sessions.

## Files

```
state/
  manifest.example.json   # Fill this out, then copy to manifest.json
  manifest.schema.json    # Validates required keys/structure

src/state/
  state.js                # Loader, minimal schema validation, save()
  index.js                # Re-export

scripts/
  export-manifest.js      # Writes the in-memory manifest back to file
```

## Quick Start

1. **Copy in** this `state` folder and `src/state` directory into your bot project root.
2. Rename `state/manifest.example.json` → `state/manifest.json`
3. Fill **all TBD_...** values with real IDs.
4. In your bot bootstrap (e.g., `src/index.js`), **load once**:

```js
const { loadManifest } = require('./src/state');
const manifest = loadManifest();
console.log('Manifest loaded for guild:', manifest.guild.id);
```

5. For admin commands that modify settings (e.g. circuit order), **persist changes**:

```js
const { getManifest, saveManifest } = require('./src/state');
const m = getManifest();
m.roles.typesOrdered = NEW_ORDER_ARRAY_OF_ROLE_IDS;
saveManifest(undefined, m);
```

## Environment Variables (optional)

- `MC_MANIFEST_PATH` → custom path to `manifest.json`
- `MC_MANIFEST_SCHEMA` → custom path to `manifest.schema.json`

## Known IDs already set

- `guild.id` = **1323266812024197140**
- `categories.privateBattles` = **1323266812024197141**

Everything else is `TBD_...` so you can fill them safely.

## What I still need from you (to finalize IDs)

- `channels.battleAnnouncements`
- `channels.battleLogs`
- `channels.battleArchive` (optional)
- `roles.winner`
- `roles.loser`
- `roles.owner`
- `roles.leagueDirector`
- `roles.ranks.*` (S, Apex, A, B, C, D, E)
- `roles.typesOrdered[]` → the 18 type role IDs **in your seasonal circuit order**

When you’re ready, paste those in `manifest.json` and **upload the file here**. I’ll sanity-check it and wire it into the rest of the bot where needed.
