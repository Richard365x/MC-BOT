
// scripts/export-manifest.js
// Usage: node scripts/export-manifest.js [optionalOutPath]
const path = require('path');
const { getManifest, saveManifest } = require('../src/state');

(async () => {
  try {
    const out = process.argv[2] ? path.resolve(process.argv[2]) : undefined;
    const manifest = getManifest();
    const saved = saveManifest(out, manifest);
    console.log('Manifest exported to:', out || 'state/manifest.json');
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
})();
