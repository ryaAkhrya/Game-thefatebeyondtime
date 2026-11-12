// Generator art Aveloria sesudah menara tua runtuh (Chapter IV, C4-07). Deterministik: node scripts/gen-town-c4-art.mjs
// Output web/public/assets/environment/town/town_c4_atlas.png|json (frame Phaser + pivot per frame). STATUS: DRAFT / NEEDS_REVIEW, code-native.
// Tidak menyentuh aveloria_*/liora_*/town_crisis_* (aset Bab I-III tetap). Pratinjau QA: node scripts/town-art/c4-preview.mjs <out_dir>.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { packAtlas } from './town-art/pixel.mjs';
import { c4Frames } from './town-art/c4-all.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../public/assets/environment/town');
mkdirSync(outDir, { recursive: true });
const frames = c4Frames();
const { canvas, json } = packAtlas(frames.map(f => ({ name: f.name, c: f.c, pivot: f.pivot })), 1024);
json.meta.image = 'town_c4_atlas.png';
writeFileSync(resolve(outDir, 'town_c4_atlas.png'), canvas.png());
writeFileSync(resolve(outDir, 'town_c4_atlas.json'), JSON.stringify(json));
console.log(`town_c4: atlas ${canvas.w}x${canvas.h} (${frames.length} frame)`);
