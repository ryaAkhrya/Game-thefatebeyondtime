// Byte-for-byte copies only. No resizing, repainting, GIF conversion or source mutation.
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const web = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sources = [
  ['characters/C01_Yaric', 'C01_ATLAS_PIXEL_PASS_V3_3'],
  ['monsters/M01_Hollowling', 'M01_ATLAS_PIXEL_PASS_V3_3'],
  ['vfx/C01_GROUND_SLAM', 'C01_GROUND_SLAM_ATLAS_PIXEL_PASS_V3_3'],
];
const target = resolve(web, 'public/assets/battle');
mkdirSync(target, { recursive: true });
for (const [folder, name] of sources) {
  const base = resolve(web, '../assets', folder, 'v3_3', name);
  const meta = JSON.parse(readFileSync(base + '.json', 'utf8'));
  if (meta.status !== 'NEEDS_REVIEW' || !meta.frames[meta.event.frame_key]) throw new Error('Invalid v3.3 metadata');
  for (const ext of ['png', 'json']) copyFileSync(base + '.' + ext, resolve(target, name + '.' + ext));
  console.log(`Copied ${name} (NEEDS_REVIEW, unchanged)`);
}
// B01 has four DRAFT key poses and no v3.3 replacement. Preserve its original metadata too.
const bossName = 'B01_BATTLE_ATLAS_DRAFT';
const bossBase = resolve(web, '../assets/bosses/B01_Mournfang', bossName);
const bossMeta = JSON.parse(readFileSync(bossBase + '.json', 'utf8'));
if (bossMeta.status !== 'DRAFT' || Object.keys(bossMeta.frames).length !== 4) throw new Error('Invalid B01 pose metadata');
for (const ext of ['png', 'json']) copyFileSync(bossBase + '.' + ext, resolve(target, bossName + '.' + ext));
console.log('Copied B01 original four poses (DRAFT, NEEDS_REVIEW, unchanged)');
