
// src/state/state.js
// Lightweight schema check (no external deps).
// If you use TypeScript, you can rename to .ts and add types.

const fs = require('fs');
const path = require('path');

const DEFAULT_MANIFEST_PATH = process.env.MC_MANIFEST_PATH || path.join(process.cwd(), 'state', 'manifest.json');
const SCHEMA_PATH = process.env.MC_MANIFEST_SCHEMA || path.join(process.cwd(), 'state', 'manifest.schema.json');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function validateAgainstSchema(manifest, schema) {
  const errors = [];

  function required(obj, keyPath, requiredKeys) {
    for (const k of requiredKeys) {
      if (!(k in obj)) {
        errors.push(`Missing required key "${[...keyPath, k].join('.')}"`);
      }
    }
  }

  // minimal checks based on our schema
  required(manifest, [], ['build','guild','channels','categories','roles','xp','permissions','behaviour']);
  if (manifest.guild) required(manifest.guild, ['guild'], ['id']);
  if (manifest.channels) required(manifest.channels, ['channels'], ['battleAnnouncements','battleLogs']);
  if (manifest.categories) required(manifest.categories, ['categories'], ['privateBattles']);
  if (manifest.roles) {
    required(manifest.roles, ['roles'], ['winner','loser','owner','leagueDirector','ranks','typesOrdered']);
    if (manifest.roles.ranks) required(manifest.roles.ranks, ['roles','ranks'], ['S','Apex','A','B','C','D','E']);
  }
  if (manifest.xp) {
    required(manifest.xp, ['xp'], ['loserXpByRank','loserFlatRoleId','loserFlatXp']);
    if (manifest.xp.loserXpByRank) required(manifest.xp.loserXpByRank, ['xp','loserXpByRank'], ['S','Apex','A','B','C','D','E']);
  }
  if (manifest.behaviour) required(manifest.behaviour, ['behaviour'], ['challengePrivateChannelTTLHours','autopingHoursBeforeClose']);

  return errors;
}

let _manifestCache = null;

function loadManifest(customPath) {
  const manifestPath = customPath || DEFAULT_MANIFEST_PATH;
  const schemaPath = SCHEMA_PATH;

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found at ${manifestPath}. Copy 'state/manifest.example.json' to 'state/manifest.json' and fill IDs.`);
  }
  const manifest = readJson(manifestPath);
  const schema = fs.existsSync(schemaPath) ? readJson(schemaPath) : null;

  const errs = schema ? validateAgainstSchema(manifest, schema) : [];
  if (errs.length) {
    const msg = 'Manifest validation errors:\\n' + errs.map(e => ' - ' + e).join('\\n');
    throw new Error(msg);
  }
  _manifestCache = manifest;
  return manifest;
}

function getManifest() {
  if (_manifestCache) return _manifestCache;
  return loadManifest();
}

function saveManifest(outPath, manifest) {
  const p = outPath || DEFAULT_MANIFEST_PATH;
  const clone = { ...manifest, lastUpdated: new Date().toISOString() };
  fs.writeFileSync(p, JSON.stringify(clone, null, 2), 'utf8');
  _manifestCache = clone;
  return clone;
}

module.exports = {
  DEFAULT_MANIFEST_PATH,
  loadManifest,
  getManifest,
  saveManifest
};
