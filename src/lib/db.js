import fs from 'node:fs';
import path from 'node:path';
const dbPath = path.resolve(process.cwd(), 'data', 'state.json');
export function dbRead() {
  const raw = fs.readFileSync(dbPath, 'utf8');
  return JSON.parse(raw);
}
export function dbWrite(obj) {
  const raw = JSON.stringify(obj, null, 2);
  fs.writeFileSync(dbPath, raw);
}
