// Generator art kota (Polish Sprint 2): Aveloria + Liora. Deterministik: node scripts/gen-town-art.mjs [aveloria|liora]
// Output web/public/assets/environment/town/:
//   aveloria_ground.png / liora_ground.png   tanah satu gambar (paving, transisi, bayangan jatuh sudah dibaking)
//   aveloria_atlas.png|json / liora_atlas.png|json   atlas sprite (frame Phaser + pivot per frame)
//   town_crisis_atlas.png|json   (target 'crisis': prop + warga krisis Chapter III; TIDAK ikut target bawaan agar aset Bab I-II tidak berubah)
// Semua gambar dihasilkan kode ini (tanpa aset luar). STATUS: DRAFT dev art, dapat diganti file PNG/JSON bernama sama.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { packAtlas } from './town-art/pixel.mjs';
import { aveFrames } from './town-art/ave-all.mjs';
import { bakeAveloria } from './town-art/ave-ground.mjs';
import { AVELORIA_ITEMS, LIORA_ITEMS } from '../src/game/data/maps/town.layout.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../public/assets/environment/town');
mkdirSync(outDir, { recursive: true });
const only = process.argv[2];

function emit(name, frames, ground) {
  const { canvas, json } = packAtlas(frames.map(f => ({ name: f.name, c: f.c, pivot: f.pivot })), 2048);
  json.meta.image = `${name}_atlas.png`;
  writeFileSync(resolve(outDir, `${name}_atlas.png`), canvas.png());
  writeFileSync(resolve(outDir, `${name}_atlas.json`), JSON.stringify(json));
  writeFileSync(resolve(outDir, `${name}_ground.png`), ground.png());
  console.log(`${name}: atlas ${canvas.w}x${canvas.h} (${frames.length} frame), ground ${ground.w}x${ground.h}`);
}
const toMap = (frames) => Object.fromEntries(frames.map(f => [f.name, f]));

if (!only || only === 'aveloria') {
  const frames = aveFrames();
  emit('aveloria', frames, bakeAveloria(AVELORIA_ITEMS, toMap(frames)));
}
if ((!only || only === 'liora') && LIORA_ITEMS.length) {
  const { lioraFrames } = await import('./town-art/lio-all.mjs');
  const { bakeLiora } = await import('./town-art/lio-ground.mjs');
  const frames = lioraFrames();
  emit('liora', frames, bakeLiora(LIORA_ITEMS, toMap(frames)));
}

if (only === 'crisis') {
  const { crisisFrames } = await import('./town-art/crisis-all.mjs');
  const frames = crisisFrames();
  const { canvas, json } = packAtlas(frames.map(f => ({ name: f.name, c: f.c, pivot: f.pivot })), 2048);
  json.meta.image = 'town_crisis_atlas.png';
  writeFileSync(resolve(outDir, 'town_crisis_atlas.png'), canvas.png());
  writeFileSync(resolve(outDir, 'town_crisis_atlas.json'), JSON.stringify(json));
  console.log('town_crisis: atlas ' + canvas.w + 'x' + canvas.h + ' (' + frames.length + ' frame)');
}
