// Generator art DRAFT Hutan 2 (forest_2), Polish Sprint 2. Menulis:
//   public/assets/environment/forest2/ground.png    dasar peta 1280x768 (jalur, lumut, humus, paving tua, tiang cahaya, akar, riak waktu)
//   public/assets/environment/forest2/props.png + .json   atlas prop (pohon purba x6, penanda batu x3, palisade, daun tertahan, dll.)
// Identitas lain dari Hutan 1: lebih tua, sunyi, dingin. Cahaya = bentuk tetap yang dilukis (bukan bloom). Penempatan di
// src/game/data/maps/forest2.map.mjs.   node scripts/gen-forest2-art.mjs     PREVIEW=x,y,w,h,zoom,out.png untuk pratinjau.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildForest2Art, FOREST2_FOOT, FOREST2_W, FOREST2_H } from '../src/game/data/maps/forest2.map.mjs';
import { clamp, composePreview, encodePNG, hash, makeNoise, packAtlas, shade, smooth, writeFileDeep } from './lib/pixelkit.mjs';
import { forest2Palette } from './lib/palettes.mjs';
import { buildForest2 } from './lib/forest2Sprites.mjs';
import { GroundKit } from './lib/groundKit.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../public/assets/environment/forest2');
const P = forest2Palette();

// ---------------------------------------------------------------- atlas
const sprites = buildForest2(P);
for (const [name, s] of Object.entries(sprites)) s.foot = FOREST2_FOOT[name] ?? [0, 0];
const missing = Object.keys(FOREST2_FOOT).filter((k) => !sprites[k]);
if (missing.length) throw new Error('FOOT tanpa sprite: ' + missing.join(','));
const { atlas, json } = packAtlas(sprites, 640, { image: 'props.png', status: 'DRAFT' });
writeFileDeep(resolve(outDir, 'props.png'), encodePNG(atlas.w, atlas.h, atlas.d));
writeFileDeep(resolve(outDir, 'props.json'), JSON.stringify(json, null, 1));

// ---------------------------------------------------------------- dasar peta
const map = buildForest2Art();
const W = FOREST2_W, H = FOREST2_H;
const { u, vnoise } = makeNoise(1e9, 1);
const kit = new GroundKit(P, W, H, { zs: 1e9, PP: 0, copies: 0, u, vnoise });
const G = P.grass, D = P.dirt, S = P.stone, M = P.moss;

const TRAIL = [[40, 566], [180, 560], [300, 556], [470, 566], [620, 556], [716, 532], [736, 466], [744, 400], [790, 352], [860, 336], [940, 332], [1010, 326], [1100, 304], [1180, 300]];
function trailDist(x, y) {
  let best = 1e9;
  for (let i = 0; i + 1 < TRAIL.length; i++) {
    const [x0, y0] = TRAIL[i], [x1, y1] = TRAIL[i + 1];
    const dx = x1 - x0, dy = y1 - y0, t = clamp(((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy), 0, 1);
    best = Math.min(best, Math.hypot(x - (x0 + dx * t), y - (y0 + dy * t)));
  }
  return best;
}
const dirtField = (x, y) => {
  const hw = 21 + (vnoise(x, y, 40, 7) - 0.5) * 9 + (vnoise(x, y, 12, 8) - 0.5) * 4;
  let f = hw - trailDist(x, y);
  // lapangan bundar kecil di tikungan Torvan dan di muka penanda pertama: tanah terinjak
  f = Math.max(f, 22 - Math.hypot((x - 684) / 1.4, (y - 504) / 0.9) + (vnoise(x, y, 10, 9) - 0.5) * 5);
  f = Math.max(f, 15 - Math.hypot((x - 356) / 1.5, (y - 548) / 0.9) + (vnoise(x, y, 10, 10) - 0.5) * 5);
  return f;
};
const sunAt = (x, y) => clamp(0.16 + (1 - smooth(10, 70, trailDist(x, y))) * 0.3, 0, 1);

kit.paintBase({
  grassTone: (x, y) => {
    const n = vnoise(x, y, 34, 4) * 0.4 + vnoise(x, y, 13, 5) * 0.4 + vnoise(x, y, 5, 6) * 0.2;
    const t = 1.15 + sunAt(x, y) * 2.2 + (n - 0.5) * 1.25;
    return clamp(Math.round(t), 1, 5);
  },
  dirtField,
  dirtTone: (x, y) => {
    const n = vnoise(x, y, 10, 41) * 0.55 + vnoise(x, y, 4, 43) * 0.45;
    return clamp(Math.round(3.1 + (n - 0.5) * 1.3), 3, 4);
  },
});

// ---------------- lumut tebal dan humus gelap (bercak bersih, bukan bintik)
kit.overlay((x, y, c) => {
  if (!c || c.ramp !== G) return null;
  if (kit.F[y * W + x] > -9) return null;
  const mf = vnoise(x, y, 26, 81) * 0.7 + vnoise(x, y, 9, 82) * 0.3;
  if (mf > 0.7) return M[clamp(c.i - 1, 0, 2)];
  return null;
});

// ---------------- paving jalur jaga lama (batu pipih bercelah lumut, ada yang hilang) dan cincin dua garis di muka Veyrath
function paveBand(x, y) { return x > 880 && x < 1190 && trailDist(x, y) < 27 + (vnoise(x, y, 14, 85) - 0.5) * 12 - smooth(1130, 1190, x) * 14; }
kit.overlay((x, y, c) => {
  if (!paveBand(x, y)) return null;
  const row = Math.floor((y + 3) / 10), off = (row % 2) * 8;
  const col = Math.floor((x + off + hash(row, 0, 3) * 9) / 17);
  const lx = (x + off + Math.floor(hash(row, 0, 3) * 9)) % 17, ly = (y + 3) % 10;
  if (hash(col, row, 87) < 0.3) return null; // batu hilang: tanah/lumut tampak
  const mortar = lx === 16 || ly === 9;
  if (mortar) return hash(x, y, 88) < 0.45 ? M[1] : S[1];
  const lit = lx === 0 || ly === 0;
  let idx = lit ? 4 : 3;
  if (hash(col, row, 89) < 0.25) idx = 2;
  if (hash(x >> 1, y >> 1, 90) < 0.06 + hash(col, row, 91) * 0.1) idx -= 1;
  return S[clamp(idx, 1, 4)];
});
// cincin dua garis hampir bertemu (motif) pada lantai batu di sekitar Veyrath, digambar sebagai alur
{
  const cx = 1040, cy = 300;
  for (const [r, w] of [[60, 2], [50, 1]]) {
    for (let a = 0; a < 6.2832; a += 0.004) {
      const gapN = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)) + Math.PI / 2) < 0.09 + (r === 50 ? 0.04 : 0); // celah di utara
      const gapS = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)) - Math.PI / 2) < 0.09 + (r === 50 ? 0.04 : 0);
      if (gapN || gapS) continue;
      const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r * 0.64);
      for (let k = 0; k < w; k++) { kit.set(x, y + k, S[0]); }
      kit.set(x + 1, y + w, S[3]);
    }
  }
}

// ---------------- jalur: kerikil, kubangan dingin, akar melintang, bekas jejak penjaga
for (const [x, y] of [[90, 566], [150, 556], [230, 566], [330, 554], [420, 570], [520, 564], [590, 552], [704, 520], [738, 440], [760, 380], [830, 340], [930, 330]]) kit.pebbles(x, y, 3);
kit.puddle(430, 572, 15, 5, 83); kit.puddle(702, 458, 11, 4, 84); kit.puddle(246, 560, 9, 3.5, 85);
for (const [x, y, t] of [[826, 410, 0.2], [834, 418, -0.1], [843, 411, 0.3], [851, 419, 0.0], [860, 412, 0.2], [868, 420, -0.2]]) kit.footprint(x, y, t);

// ---------------- tiang cahaya dingin yang dilukis (elips miring, tepi berdither), dan kolam cahaya di tempat penting
for (const [cx, cy, rx, ry] of [[190, 548, 78, 15], [330, 612, 54, 11], [430, 586, 66, 13], [650, 566, 84, 16], [724, 428, 60, 14], [872, 340, 88, 16], [1002, 392, 62, 13], [1094, 306, 74, 15], [830, 218, 56, 11], [560, 640, 44, 10]]) {
  kit.lightPatch(cx, cy, rx, ry, 0.5, 1);
  kit.lightPatch(cx + 6, cy + 3, rx * 0.5, ry * 0.5, 0.5, 1);
}
// ---------------- gangguan waktu: riak halus di sekitar penanda kedua, pecahan, dan penanda pertama
kit.rings(904, 392, [20, 30, 40, 50]);
kit.rings(1148, 354, [16, 26, 38, 50, 62]);
kit.rings(356, 532, [14, 22]);

// ---------------- rumput, daun gugur, akar permukaan
kit.tufts({ sunAt, dirtField });
const OLD_TREES = ['tree_old_a', 'tree_old_b', 'tree_hollow', 'tree_dead2', 'tree_gnarl', 'stump_old'];
kit.litterNearTrees(map.props, OLD_TREES);
kit.groundRoots(map.props, ['tree_old_a', 'tree_hollow', 'tree_gnarl', 'tree_old_b'], 3);

// ---------------- bayangan
const SHADOW = {
  tree_old_a: [46, 12, 18, 2], tree_old_b: [30, 9, 12, 2], tree_hollow: [30, 10, 10, 2], tree_dead2: [22, 6, 8, 1], tree_spruce_old: [20, 7, 10, 2], tree_gnarl: [40, 9, 16, 2],
  stump_old: [24, 6, 6, 0], rock_l: [34, 7, 8, 0], rock_s: [18, 5, 5, 0], rock_slab: [16, 5, 6, 1], rock_c: [24, 5, 6, 0],
  marker_old: [22, 6, 10, 1], marker_second: [22, 6, 10, 1], marker_broken: [22, 5, 8, 1], sign_west: [14, 4, 5, 0], sign_east: [14, 4, 5, 0],
  log_fallen: [56, 7, 6, -1], log_worked: [38, 6, 5, -1], bedroll: [20, 4, 4, 0], note_stand: [10, 3, 4, 0], time_shard: [16, 4, 6, 0], lantern: [7, 2, 3, 0],
  bush: [22, 6, 5, -2], bush_hedge: [34, 6, 6, -2], stake_a: [7, 3, 4, 0], stake_b: [7, 3, 4, 0], stake_c: [7, 3, 4, 0],
  leaves_a: [11, 3, 4, 0], leaves_b: [10, 3, 3, 0], leaves_c: [8, 2, 3, 0], blog_a: [10, 3, 4, 0], blog_b: [10, 3, 4, 0], log_short: [26, 5, 4, -1],
};
kit.shadows(map.props, SHADOW);
kit.finish();
writeFileDeep(resolve(outDir, 'ground.png'), encodePNG(W, H, kit.canvas.d));
console.log(`forest2 props.png ${atlas.w}x${atlas.h} (${Object.keys(sprites).length} sprite), ground.png ${W}x${H}, ${map.props.length} prop`);
void shade;

if (process.env.PREVIEW) {
  const [x, y, w, h, z, out] = process.env.PREVIEW.split(',');
  const list = map.props.filter((p) => sprites[p.type]).map((p) => ({ x: p.x, y: p.y, sprite: sprites[p.type] }));
  const big = composePreview(kit.canvas, list, { x: +x, y: +y, w: +w, h: +h }, +z);
  writeFileDeep(out, encodePNG(big.w, big.h, big.d));
  console.log('preview', out);
}
