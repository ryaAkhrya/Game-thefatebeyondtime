// Generator atlas VFX (deterministik, tanpa aset luar). Jalankan: node scripts/vfx/build.mjs [key ...]
// Output: web/public/assets/vfx/<key>.png + <key>.json (Phaser atlas JSON hash) dan contact sheet untuk tinjauan:
//   Phase 7 -> docs/production/sprint3/vfx-contact-sheets/, Phase 8 -> docs/production/sprint4/vfx-contact-sheets/ (+ <key>.rows.txt).
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ATLASES, renderAtlas } from './atlases.mjs';
import { writeDeep } from './kit.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, '..', '..');
const outDir = join(webRoot, 'public', 'assets', 'vfx');
const sheetDirs = {
  sprint3: join(webRoot, '..', 'docs', 'production', 'sprint3', 'vfx-contact-sheets'),
  sprint4: join(webRoot, '..', 'docs', 'production', 'sprint4', 'vfx-contact-sheets'),
};

const only = process.argv.slice(2);
for (const { key, sheet } of ATLASES) {
  if (only.length && !only.includes(key)) continue;
  let r;
  try { r = await renderAtlas(key); } catch (e) { if (only.length === 0 && e.code === 'ERR_MODULE_NOT_FOUND') { console.warn(`${key}: dilewati (${e.message})`); continue; } throw e; }
  writeDeep(join(outDir, `${key}.png`), r.atlas.png());
  writeDeep(join(outDir, `${key}.json`), JSON.stringify(r.atlas.json, null, 1));
  writeDeep(join(sheetDirs[sheet], `${key}.png`), r.sheet());
  writeDeep(join(sheetDirs[sheet], `${key}.rows.txt`), r.rows);
  console.log(`${key}: ${r.frames.length} frame, atlas ${r.atlas.w}x${r.atlas.h}, palet ${r.palette.size} warna`);
}
