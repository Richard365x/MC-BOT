import fs from 'node:fs';
import path from 'node:path';
const cfgPath = path.resolve(process.cwd(), 'config.json');
export function getConfig() {
  const raw = fs.readFileSync(cfgPath, 'utf8');
  return JSON.parse(raw);
}
export function saveConfig(obj) {
  const raw = JSON.stringify(obj, null, 2);
  fs.writeFileSync(cfgPath, raw);
}
