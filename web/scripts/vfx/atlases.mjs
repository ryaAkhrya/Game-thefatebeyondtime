// Daftar atlas VFX + pembuat atlas murni (tanpa I/O) agar build.mjs dan tes memakai kode yang sama.
// Phase 7 (lima atlas, lebar 256) dan Phase 8 (Bab IV; meteor memakai lebar 1024 karena frame hingga ~280 px).
import { buildAtlas, contactSheet, makePalette } from './kit.mjs';

/** sheet: 'sprint3' (Phase 7) atau 'sprint4' (Phase 8); zoom = pembesaran contact sheet */
export const ATLASES = [
  { key: 'vfx_combat', file: './draw-combat.mjs', width: 256, sheet: 'sprint3', zoom: 4 },
  { key: 'vfx_nature', file: './draw-nature.mjs', width: 256, sheet: 'sprint3', zoom: 4 },
  { key: 'vfx_velthia', file: './draw-velthia.mjs', width: 256, sheet: 'sprint3', zoom: 4 },
  { key: 'vfx_enemy', file: './draw-enemy.mjs', width: 256, sheet: 'sprint3', zoom: 4 },
  { key: 'vfx_chrono', file: './draw-chrono.mjs', width: 256, sheet: 'sprint3', zoom: 4 },
  { key: 'vfx_varlgrim', file: './draw-varlgrim.mjs', width: 512, sheet: 'sprint4', zoom: 3 },
  { key: 'vfx_rift', file: './draw-rift.mjs', width: 512, sheet: 'sprint4', zoom: 3 },
  { key: 'vfx_meteor', file: './draw-meteor.mjs', width: 1024, sheet: 'sprint4', zoom: 1 },
  { key: 'vfx_aegis', file: './draw-aegis.mjs', width: 512, sheet: 'sprint4', zoom: 3 },
  { key: 'vfx_heart', file: './draw-heart.mjs', width: 512, sheet: 'sprint4', zoom: 2 },
];

/** Bangun atlas `key`: {atlas, palette, frames, groups, sheet(): Buffer, rows: string}. Melempar bila aturan atlas dilanggar. */
export async function renderAtlas(key) {
  const def = ATLASES.find((a) => a.key === key);
  if (!def) throw new Error(`atlas tak dikenal: ${key}`);
  const mod = await import(def.file);
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
    if (f.cv.w > 512 || f.cv.h > 512) throw new Error(`${key}/${f.name}: frame ${f.cv.w}x${f.cv.h} > 512`);
  }
  const atlas = buildAtlas(key, `${key}.png`, palette, frames, def.width, def.sheet === 'sprint4');
  const groups = [];
  for (const f of frames) {
    let g = groups.find((x) => x.name === f.group);
    if (!g) groups.push((g = { name: f.group, frames: [], names: [] }));
    g.frames.push(f.cv); g.names.push(f.name);
  }
  return {
    def, atlas, palette, frames, groups,
    sheet: () => contactSheet(groups, palette, def.zoom),
    rows: groups.map((g, i) => `${i + 1}. ${g.name}: ${g.names.join(', ')}`).join('\n') + '\n',
  };
}
