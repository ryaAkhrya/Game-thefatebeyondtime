// Phase 8 (agen BA): salinan runtime LAMA atlas eksplorasi Varlgrim (C04). Byte-identik dengan sumber DRAFT di ../assets
// (sama seperti prepare-aveloria-assets.mjs untuk C02/C05/C06/C09). Sumber TIDAK diubah.
//   node scripts/prepare-c04-assets.mjs            -> public/assets/characters/C04_explore.{png,json}
// Urutan: prepare-c04-assets -> normalize-exploration-sprites (-> normalized/C04_explore.*) -> python -I scripts/author_cast_build.py C04 (-> final/C04_explore.*).
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const source = 'assets/characters/C04_Varlgrim/C04_EXPLORATION_ATLAS_DRAFT';
const out = resolve(here, '../public/assets/characters');
mkdirSync(out, { recursive: true });
for (const ext of ['png', 'json']) {
  copyFileSync(resolve(repo, `${source}.${ext}`), resolve(out, `C04_explore.${ext}`));
  const a = createHash('sha256').update(readFileSync(resolve(repo, `${source}.${ext}`))).digest('hex');
  const b = createHash('sha256').update(readFileSync(resolve(out, `C04_explore.${ext}`))).digest('hex');
  if (a !== b) throw new Error(`salinan C04_explore.${ext} tidak identik`);
  console.log(`C04_explore.${ext} sha256 ${a}`);
}
