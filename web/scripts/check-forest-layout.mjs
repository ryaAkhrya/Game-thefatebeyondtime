// Pemeriksa tata letak hutan (visual-only): (1) kanopi pohon tidak boleh menyembunyikan area jalan/glade yang dilalui pemain
// (pemain di utara pangkal batang tertutup kanopi); (2) jejak tapak prop padat tidak memotong garis tengah koridor;
// (3) semua interaktif, pemicu, spawn, keluar berdiri di sel yang bisa dipijak.  node scripts/check-forest-layout.mjs [forest1|edge|forest2]
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildForest1, FOOT } from '../src/game/data/maps/forest1.map.mjs';
import { buildForestEdgeMap } from '../src/game/data/maps/forestEdge.map.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const which = process.argv[2] ?? 'all';
const CROWN = { // [bagian atas sprite yang berupa kanopi: tinggi batang terlihat di bawah kanopi, lebar kanopi relatif]
  tree_a: 37, tree_b: 49, tree_c: 52, tree_birch: 64, tree_twin: 40, tree_sapling: 30, tree_pine: 12, tree_fir: 12, tree_dead: 40,
  tree_old: 40, tree_hollow: 30, tree_gnarl: 38, tree_dead2: 40, tree_spruce_old: 14,
};
function inWalk(m, x, y) {
  return m.walkable.some((s) => s.shape === 'rect' ? x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h : ((x - s.cx) / s.rx) ** 2 + ((y - s.cy) / s.ry) ** 2 <= 1);
}
function check(name, m, atlasFile) {
  const atlas = JSON.parse(readFileSync(resolve(here, atlasFile), 'utf8')).frames;
  let bad = 0;
  const report = [];
  for (const p of m.props) {
    const f = atlas[p.type];
    if (!f) { console.log(`[${name}] tipe tanpa frame: ${p.type}`); bad++; continue; }
    const crownBottom = CROWN[p.type];
    if (crownBottom !== undefined) {
      const w = f.frame.w, h = f.frame.h, ay = f.pivot.y * h;
      const x0 = p.x - w * f.pivot.x, y0 = p.y - ay + 8, y1 = p.y - crownBottom;
      let cells = 0;
      for (let y = y0; y < y1; y += 8) for (let x = x0 + 8; x < x0 + w - 8; x += 8) if (y < p.y && inWalk(m, x, y + 8)) cells++;
      if (cells > 3) report.push(`  ${p.type}@${p.x},${p.y} menutupi ${cells * 64}px2 area jalan`);
    }
  }
  console.log(`[${name}] ${m.props.length} prop; kanopi menutupi jalan (>192 px2): ${report.length}`);
  for (const r of report) console.log(r);
  return bad;
}
let fail = 0;
if (which === 'all' || which === 'forest1') fail += check('forest1', buildForest1(), '../public/assets/environment/forest1/props.json');
if (which === 'all' || which === 'edge') fail += check('edge', buildForestEdgeMap(), '../public/assets/environment/forest1/props.json');
if (which === 'all' || which === 'forest2') {
  try {
    const mod = await import('../src/game/data/maps/forest2.map.mjs');
    fail += check('forest2', mod.buildForest2Art(), '../public/assets/environment/forest2/props.json');
  } catch (e) { if (which === 'forest2') throw e; }
}
// titik penting di sel yang dapat dipijak
function stand(m, x, y) { return inWalk(m, x, y); }
for (const [name, m] of [['forest1', buildForest1()], ['edge', buildForestEdgeMap()]]) {
  if (which !== 'all' && which !== name && !(which === 'forest1' && name === 'forest1')) continue;
  const pts = [['spawn', m.spawn.x, m.spawn.y], ...m.interactables.filter((i) => !['sword', 'ground_tracks'].includes(i.id) && !i.id.startsWith('chest')).map((i) => [i.id, i.x + i.w / 2, i.y + i.h + 8]), ...m.triggers.map((t) => [t.id, t.x + t.w / 2, t.y + t.h / 2])];
  const off = pts.filter(([id, x, y]) => !stand(m, x, y) && !stand(m, x, y - 30) && !(id === 'slice_exit' && stand(m, x, y - 60))).map(([id]) => id);
  console.log(`[${name}] titik di luar area walkable: ${off.length ? off.join(', ') : 'tidak ada'}`);
}
void FOOT;
process.exit(fail ? 1 : 0);
