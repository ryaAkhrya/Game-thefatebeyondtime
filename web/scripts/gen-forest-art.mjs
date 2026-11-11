// Generator art DRAFT untuk Hutan 1 (lingkungan), Polish Sprint 2. Menulis:
//   public/assets/environment/forest1/ground.png    dasar peta (rumput, jalan tanah, glade, jejak, bayangan pohon, litter)
//   public/assets/environment/forest1/props.png + .json   atlas prop (pohon x8, batu x4, semak x3, kayu, papan, peti, dll.)
// Seluruh gambar digambar oleh kode ini (tanpa aset luar / internet / lisensi pihak ketiga). STATUS: DRAFT dev art,
// mudah diganti: tukar file PNG/JSON dengan nama yang sama; peta dan collision tidak berubah (dari forest1.map.mjs).
// Atlas yang sama dipakai Tepi Hutan (forest_edge). Dasar peta Tepi Hutan ditulis oleh scripts/gen-forest-edge-art.mjs.
//   node scripts/gen-forest-art.mjs                      (deterministik, dapat dijalankan ulang)
//   PREVIEW=x,y,w,h,zoom,out.png node scripts/gen-forest-art.mjs   (pratinjau komposit tanpa browser)
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildForest1, FOOT, TILE } from '../src/game/data/maps/forest1.map.mjs';
import { Canvas, composePreview, encodePNG, hash, packAtlas, clamp, smooth, makeNoise, shade, writeFileDeep } from './lib/pixelkit.mjs';
import { forest1Palette } from './lib/palettes.mjs';
import { buildAll } from './lib/forest1Sprites.mjs';
import { GroundKit, SHADOW_OF } from './lib/groundKit.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../public/assets/environment/forest1');
const P = forest1Palette();

// ------------------------------------------------------------------ atlas prop
const sprites = buildAll(P);
for (const [name, s] of Object.entries(sprites)) s.foot = FOOT[name] ?? [0, 0];
const missing = Object.keys(FOOT).filter((k) => !sprites[k]);
if (missing.length) throw new Error('FOOT tanpa sprite: ' + missing.join(','));
const { atlas, json } = packAtlas(sprites, 640, { image: 'props.png', status: 'DRAFT' });
writeFileDeep(resolve(outDir, 'props.png'), encodePNG(atlas.w, atlas.h, atlas.d));
writeFileDeep(resolve(outDir, 'props.json'), JSON.stringify(json, null, 1));

// ------------------------------------------------------------------ dasar peta
const map = buildForest1();
const { width: GW, height: GH } = map;
const zs = map.zone.start, PP = map.zone.period, copies = map.zone.copies;
const { u, vnoise } = makeNoise(zs, PP);
const kit = new GroundKit(P, GW, GH, { zs, PP, copies, u, vnoise });
const G = P.grass, D = P.dirt;
const cl = map.clearing;
const roadC = (map.road.y0 + map.road.y1) / 2;
const tx = zs + map.trail.localX; // pusat jalan setapak dalam domain periodik (salinan 0)
const glade = { cx: tx, cy: map.trail.gladeCY, rx: map.trail.gladeRX, ry: map.trail.gladeRY };

const roadCenter = (ux) => roadC + (vnoise(ux, 3, 64, 31) - 0.5) * 18 + (vnoise(ux, 5, 22, 32) - 0.5) * 6;
const roadHalf = (ux) => 28 + (vnoise(ux, 7, 40, 33) - 0.5) * 9;
const sway = (y) => Math.sin(y / 41) * 5 + Math.sin(y / 17 + 1) * 2.2;
const trailHalf = (y) => 17 + (vnoise(zs + 3, y, 14, 37) - 0.5) * 6;

/** f > 0 di dalam tanah jalan utama / jalan setapak (satuan piksel dari tepi). */
function dirtField(x, y) {
  const ux = u(x);
  let f = roadHalf(ux) - Math.abs(y - roadCenter(ux)) + (vnoise(ux, y, 6, 34) - 0.5) * 3.2;
  if (x < 340) f = x < 226 ? -99 : Math.min(f, (x - 226) * 0.5 - Math.abs(y - roadCenter(ux)) + (vnoise(ux, y, 10, 35) - 0.5) * 5 + 2); // pangkal jalan: lidah tanah yang melebar keluar clearing
  // jalan setapak: hanya pada copy periodik
  if (x >= zs && y > 28 && y < 490) {
    const gi = Math.hypot((ux - glade.cx) / glade.rx, (y - glade.cy) / glade.ry);
    let tw = trailHalf(y) - Math.abs(ux - (tx + sway(y)));
    if (gi < 1) tw -= (1 - gi) * 12; // di dalam glade tanah menipis jadi jejak terinjak
    if (y > 470) tw += (y - 470) * 0.5; // bibir melebar saat bertemu jalan
    f = Math.max(f, tw);
  }
  return f;
}
const lerp = (a, b, t) => a + (b - a) * t;
const ellipseIn = (x, y, e, pad = 0) => Math.hypot((x - e.cx) / (e.rx + pad), (y - e.cy) / (e.ry + pad));
const clearE = { cx: cl.cx, cy: cl.cy, rx: cl.rx, ry: cl.ry };

/** Cahaya matahari 0..1 pada tanah hutan: terbuka di clearing/glade/jalan, redup di bawah kanopi. */
function sunAt(x, y) {
  const ux = u(x);
  const ic = ellipseIn(x, y, clearE);
  const sClear = 1 - smooth(0.78, 1.18, ic);
  const sRoad = 1 - smooth(34, 105, Math.abs(y - roadCenter(ux)));
  const rx = x < 250 ? 0 : 1;
  let sTrail = 0, sGlade = 0;
  if (x >= zs && y < 490) {
    sTrail = (1 - smooth(14, 62, Math.abs(ux - (tx + sway(y))))) * 0.8;
    sGlade = 1 - smooth(0.78, 1.2, Math.hypot((ux - glade.cx) / glade.rx, (y - glade.cy) / glade.ry));
  }
  return Math.max(sClear, sRoad * rx * 0.85, sTrail, sGlade);
}

kit.paintBase({
  grassTone: (x, y) => {
    const ux = u(x);
    const sun = sunAt(x, y);
    const n = vnoise(ux, y, 32, 4) * 0.4 + vnoise(ux, y, 12, 5) * 0.4 + vnoise(ux, y, 5, 6) * 0.2;
    let t = 1.35 + sun * 2.55 + (n - 0.5) * 2.1;
    const ic = ellipseIn(x, y, clearE);
    if (ic < 1) t += 0.4 * (1 - smooth(0.2, 1, ic));
    return clamp(Math.round(t), 1, 6);
  },
  dirtField,
  dirtTone: (x, y) => {
    const ux = u(x);
    const n = vnoise(ux, y, 9, 41) * 0.55 + vnoise(ux, y, 4, 43) * 0.45;
    return clamp(Math.round(3 + (n - 0.5) * 2.5), 2, 4);
  },
});

// ---------------- cahaya yang dirancang: tiang cahaya menimpa tempat Yaric bangun (dari celah kanopi kiri-atas)
kit.lightPool(150, 446, 66, 36, 1);
kit.lightPool(150, 446, 36, 20, 1);
kit.lightPool(250, 560, 40, 16, 1);
// area terinjak (badan yang berbaring): rumput rebah berarah + bekas tas
kit.pressedGrass(150, 447, 38, 21, 7);
kit.pressedGrass(212, 424, 12, 6, 5); // bekas di kaki pedang
kit.pressedGrass(204, 470, 30, 9, 11); // jalur terinjak menuju jalan
const prints = [
  [118, 468, 0.2], [108, 480, -0.3], [124, 486, 0.1], [98, 466, 0.4], [142, 482, -0.1], [170, 470, 0.3], [182, 486, 0.0], [196, 474, 0.2],
  [110, 428, -0.2], [100, 416, 0.1], [130, 410, 0.0], [212, 450, 0.3], [226, 462, -0.1], [238, 476, 0.2], [250, 488, 0.0],
];
for (const [px, py, tilt] of prints) kit.footprint(px, py, tilt);
kit.swordScuff(221, 419);

// ---------------- detail jalan: jejak roda, kerikil, kubangan, bekas daun (semua posisi lokal periodik)
kit.ruts({ center: roadCenter, half: roadHalf, x0: 330 });
for (const [lu, ly, rx, ry] of [[150, 523, 17, 5.5], [521, 497, 13, 4.5], [655, 530, 21, 6.5], [330, 508, 11, 4]]) kit.puddle(zs + lu, ly, rx, ry, 71 + lu);
for (const [lu, ly] of [[40, 510], [96, 534], [236, 504], [302, 528], [368, 498], [412, 540], [470, 522], [560, 506], [610, 536], [712, 504]]) kit.pebbles(zs + lu, ly, 3 + (lu % 3));
// jalan setapak: batu pijakan dan akar melintang
for (let ly = 440; ly > 130; ly -= 44) kit.pebbles(tx + Math.round(sway(ly)) + ((ly % 3) - 1) * 5, ly, 2);
kit.pebbles(tx - 8, 462, 3);
kit.pebbles(150, 536, 2);
kit.pebbles(300, 530, 3);

// ---------------- rumput: jumput bergerombol (ada ruang kosong), bunga kecil di clearing dan glade
kit.tufts({ sunAt, dirtField });
kit.litterNearTrees(map.props);

// ---------------- bayangan pohon dan benda (cahaya dari kiri-atas, bayangan jatuh ke kanan-bawah)
kit.shadows(map.props, SHADOW_OF);
kit.finish();

writeFileDeep(resolve(outDir, 'ground.png'), encodePNG(GW, GH, kit.canvas.d));
console.log(`props.png ${atlas.w}x${atlas.h} (${Object.keys(sprites).length} sprite), ground.png ${GW}x${GH}, ${map.props.length} prop`);
void TILE; void hash; void lerp; void shade;

// ---------------- pratinjau (opsional)
if (process.env.PREVIEW) {
  const [x, y, w, h, z, out] = process.env.PREVIEW.split(',');
  const list = map.props.filter((p) => sprites[p.type]).map((p) => ({ x: p.x, y: p.y, sprite: sprites[p.type] }));
  const big = composePreview(kit.canvas, list, { x: +x, y: +y, w: +w, h: +h }, +z);
  writeFileDeep(out, encodePNG(big.w, big.h, big.d));
  console.log('preview', out);
}
