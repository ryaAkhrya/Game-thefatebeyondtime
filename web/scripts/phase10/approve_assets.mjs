// Update only this explicitly reviewed fictional-art batch. Never enumerate and
// approve a public directory: unexpected files must still fail the build guard.
import { readFileSync, writeFileSync, existsSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const web = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const catalog = resolve(web, 'public-assets.allowlist.json');
const ids = ['C02', 'C03', 'C04', 'C05', 'C06', 'C07', 'C08', 'C09'];
const reviewed = [
  ...ids.flatMap(id => ['png', 'json'].map(ext => `assets/characters/final/${id}_explore.${ext}`)),
  'assets/ending/seated.png', 'assets/ending/seated.json', 'assets/ending/cliff.png', 'assets/ending/modern.png',
  'assets/ending/archive.png', 'assets/ending/heirloom.png', 'assets/ending/heart.png',
  'assets/chapter2/B02_encounter.png',
  'assets/environment/town/town_crisis_atlas.png', 'assets/environment/town/town_crisis_atlas.json',
  'assets/environment/town/town_c4_atlas.png', 'assets/environment/town/town_c4_atlas.json',
  ...['C03', 'M02', 'M03', 'B02'].flatMap(id => ['png', 'json'].map(ext => `assets/battle/${id}_BATTLE_V2.${ext}`)),
];
const entries = new Map(JSON.parse(readFileSync(catalog, 'utf8')).map(e => [e.path, e]));
for (const path of reviewed) {
  const file = resolve(web, 'public', path);
  if (!existsSync(file)) continue;
  if (lstatSync(file).isSymbolicLink()) throw Error('Reviewed art cannot be a symlink');
  if (path.includes('/characters/') && path.endsWith('.json') && JSON.parse(readFileSync(file, 'utf8')).phase !== 'Phase 10') throw Error('Unprepared cast source: ' + path);
  entries.set(path, { path, sha256: createHash('sha256').update(readFileSync(file)).digest('hex') });
}
writeFileSync(catalog, JSON.stringify([...entries.values()].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0), null, 2) + '\n');
console.log('Pinned only explicit Phase 10 fictional-art paths; unknown files remain unapproved.');
