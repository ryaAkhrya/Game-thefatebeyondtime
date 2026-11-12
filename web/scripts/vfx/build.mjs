// Generator atlas VFX (deterministik, tanpa aset luar). Jalankan: node scripts/vfx/build.mjs [key ...]
// Output: web/public/assets/vfx/<key>.png + <key>.json (Phaser atlas JSON hash) dan
//         docs/production/sprint3/vfx-contact-sheets/<key>.png (+ <key>.rows.txt) untuk tinjauan.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAtlas, contactSheet, makePalette, writeDeep } from './kit.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, '..', '..');
const outDir = join(webRoot, 'public', 'assets', 'vfx');
const sheetDir = join(webRoot, '..', 'docs', 'production', 'sprint3', 'vfx-contact-sheets');

const ATLASES = [
  { key: 'vfx_combat', file: './draw-combat.mjs' },
  { key: 'vfx_nature', file: './draw-nature.mjs' },
  { key: 'vfx_velthia', file: './draw-velthia.mjs' },
  { key: 'vfx_enemy', file: './draw-enemy.mjs' },
  { key: 'vfx_chrono', file: './draw-chrono.mjs' },
];

const only = process.argv.slice(2);
for (const { key, file } of ATLASES) {
  if (only.length && !only.includes(key)) continue;
  const mod = await import(file);
  const palette = makePalette(mod.PALETTE);
  if (palette.size > 16) throw new Error(`${key}: palet ${palette.size} > 16`);
  const frames = mod.frames(palette.idx);
  const names = new Set();
  for (const f of frames) {
    if (names.has(f.name)) throw new Error(`${key}: nama frame ganda ${f.name}`);
    names.add(f.name);
    const n = f.cv.count();
    if (n === 0) throw new Error(`${key}/${f.name}: frame kosong`);
    if (n === f.cv.w * f.cv.h) throw new Error(`${key}/${f.name}: frame opak penuh`);
  }
  const atlas = buildAtlas(key, `${key}.png`, palette, frames);
  writeDeep(join(outDir, `${key}.png`), atlas.png());
  writeDeep(join(outDir, `${key}.json`), JSON.stringify(atlas.json, null, 1));
  // contact sheet: satu baris per grup
  const groups = [];
  for (const f of frames) {
    let g = groups.find((x) => x.name === f.group);
    if (!g) groups.push((g = { name: f.group, frames: [], names: [] }));
    g.frames.push(f.cv); g.names.push(f.name);
  }
  writeDeep(join(sheetDir, `${key}.png`), contactSheet(groups, palette, 4));
  writeDeep(join(sheetDir, `${key}.rows.txt`), groups.map((g, i) => `${i + 1}. ${g.name}: ${g.names.join(', ')}`).join('\n') + '\n');
  console.log(`${key}: ${frames.length} frame, atlas ${atlas.w}x${atlas.h}, palet ${palette.size} warna`);
}
