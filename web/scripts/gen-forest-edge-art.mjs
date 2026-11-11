// Generator dasar peta Tepi Hutan (forest_edge), Polish Sprint 2. Menulis public/assets/environment/forest_edge/ground.png.
// Prop memakai atlas Hutan 1 (gen-forest-art.mjs); penempatan di src/game/data/maps/forestEdge.map.mjs.
// Dari barat ke timur: jalan di bawah kanopi (teduh) -> tikungan -> jalur timur + tempat istirahat -> arena Mournfang
// (tanah terinjak, cakar, kawah) -> jalur ke Aveloria: padang terang, paving batu pertama.   node scripts/gen-forest-edge-art.mjs
//   PREVIEW=x,y,w,h,zoom,out.png untuk pratinjau komposit.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { buildForestEdgeMap } from '../src/game/data/maps/forestEdge.map.mjs';
import { Canvas, clamp, composePreview, encodePNG, hash, makeNoise, shade, smooth, writeFileDeep } from './lib/pixelkit.mjs';
import { forest1Palette } from './lib/palettes.mjs';
import { buildAll } from './lib/forest1Sprites.mjs';
import { GroundKit, SHADOW_OF } from './lib/groundKit.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const P = forest1Palette();
const map = buildForestEdgeMap();
const W = map.width, H = map.height;
const { u, vnoise } = makeNoise(1e9, 1);
const kit = new GroundKit(P, W, H, { zs: 1e9, PP: 0, copies: 0, u, vnoise });
const G = P.grass, D = P.dirt, S = P.stone;

const segDist = (x, y, x0, y0, x1, y1) => {
  const dx = x1 - x0, dy = y1 - y0, t = clamp(((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(x - (x0 + dx * t), y - (y0 + dy * t));
};
const arena = { cx: 960, cy: 400, rx: 192, ry: 144 };
function dirtField(x, y) {
  const wob = (vnoise(x, y, 14, 7) - 0.5) * 5 + (vnoise(x, y, 40, 8) - 0.5) * 6;
  const hw = (b) => b + wob * 0.5;
  let f = -99;
  f = Math.max(f, hw(31) - segDist(x, y, 40, 656 + Math.sin(x / 70) * 5, 480, 656));
  f = Math.max(f, hw(29) - segDist(x, y, 480 + Math.sin(y / 60) * 4, 656, 480 + Math.sin(y / 60) * 4, 400));
  f = Math.max(f, hw(28) - segDist(x, y, 480, 400 + Math.sin(x / 90) * 4, 900, 400));
  f = Math.max(f, hw(30 + smooth(1100, 1400, x) * 6) - segDist(x, y, 1000, 400 + Math.sin(x / 80) * 3, 1408, 400));
  const d = Math.hypot((x - arena.cx) / (arena.rx - 14), (y - arena.cy) / (arena.ry - 14)) + (vnoise(x, y, 18, 9) - 0.5) * 0.3 + (vnoise(x, y, 7, 12) - 0.5) * 0.12;
  f = Math.max(f, (0.8 - d) * 70 - 1);
  return f;
}
const sunAt = (x, y) => {
  const fx = smooth(300, 1000, x) * 0.5;
  let s = 0.28 + fx + smooth(1050, 1320, x) * 0.3;
  const ia = Math.hypot((x - arena.cx) / arena.rx, (y - arena.cy) / arena.ry);
  s = Math.max(s, 1 - smooth(0.85, 1.2, ia));
  const near = 1 - smooth(18, 90, Math.min(
    segDist(x, y, 40, 656, 480, 656), segDist(x, y, 480, 656, 480, 400), segDist(x, y, 480, 400, 900, 400), segDist(x, y, 1000, 400, 1408, 400)));
  s = Math.max(s, near * (0.45 + 0.4 * smooth(300, 1100, x)));
  return clamp(s, 0, 1);
};

kit.paintBase({
  grassTone: (x, y) => {
    const n = vnoise(x, y, 32, 4) * 0.4 + vnoise(x, y, 12, 5) * 0.4 + vnoise(x, y, 5, 6) * 0.2;
    let t = 1.3 + sunAt(x, y) * 2.6 + (n - 0.5) * 2.1;
    if (x > 1200 && y < 520) t += 0.5 * smooth(1200, 1330, x); // padang terang menjelang Aveloria
    return clamp(Math.round(t), 1, 6);
  },
  dirtField,
  dirtTone: (x, y) => {
    const n = vnoise(x, y, 9, 41) * 0.55 + vnoise(x, y, 4, 43) * 0.45;
    let t = 3 + (n - 0.5) * 1.9;
    const d = Math.hypot((x - arena.cx) / arena.rx, (y - arena.cy) / arena.ry);
    if (d < 0.8) t -= 0.5 * (1 - d / 0.8); // arena: tanah gelap terbalik, makin gelap ke tengah
    if (x > 1250) t += 0.5; // jalan kota: lebih terang dan rata
    return clamp(Math.round(t), 2, 4);
  },
});

// ---- jejak roda dan kubangan di jalan barat dan timur
const cy = (x) => (x < 480 ? 656 + Math.sin(x / 70) * 5 : 400 + Math.sin(x / 90) * 4);
for (const off of [-9, 9]) for (let x = 60; x < W; x++) {
  if (x > 480 && x < 1000 && (x < 490 || x > 880)) continue;
  if (x > 480 && x < 880 && false) continue;
  const n = vnoise(x, off, 26, 61);
  if (n < 0.32) continue;
  const y = Math.round(cy(x) + off);
  const c = kit.get(x, y);
  if (c && c.ramp === D && kit.F[y * W + x] > 8) { kit.set(x, y, D[1]); kit.set(x, y + 1, D[4]); }
}
for (const [x, y, rx, ry] of [[210, 660, 20, 6], [346, 648, 13, 4.5], [760, 404, 15, 5], [1180, 396, 12, 4]]) kit.puddle(x, y, rx, ry, 77 + x);
for (const [x, y] of [[100, 650], [180, 668], [260, 646], [330, 662], [440, 640], [482, 560], [478, 470], [560, 396], [660, 410], [1090, 410], [1200, 392], [1260, 408]]) kit.pebbles(x, y, 3);

// ---- tempat istirahat: lingkaran api dingin (abu, batu pinggir) di samping log
{
  const ax = 690, ay = 372;
  for (let yy = -6; yy <= 6; yy++) for (let xx = -14; xx <= 14; xx++) {
    const d = (xx / 13) ** 2 + (yy / 5.2) ** 2;
    if (d < 1) kit.set(ax + xx, ay + yy, d < 0.35 ? D[0] : D[1]);
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 6.283, sx = Math.round(ax + Math.cos(a) * 14), sy = Math.round(ay + Math.sin(a) * 5.6);
    kit.set(sx, sy, S[3]); kit.set(sx + 1, sy, S[2]); kit.set(sx, sy + 1, S[1]); kit.set(sx + 1, sy + 1, S[1]); kit.set(sx - 1, sy - 1, S[4]);
  }
  for (const [dx, dy] of [[-4, 0], [3, -1], [0, 2]]) kit.set(ax + dx, ay + dy, P.litter[0]);
}

// ---- arena: cakar, kawah, serpihan
function gouge(x, y, len, dir) { // tiga goresan sejajar (jejak cakar)
  for (let k = -1; k <= 1; k++) for (let i = 0; i < len; i++) {
    const px = Math.round(x + i * dir + k * 4), py = Math.round(y + i * 0.45 + k * 2.2);
    kit.set(px, py, D[0]); kit.set(px, py + 1, D[1]); kit.set(px + 1, py - 1, D[4]);
  }
}
for (const [x, y, l, d] of [[772, 390, 26, 1], [796, 402, 22, 1], [820, 394, 20, 1], [872, 372, 18, 1], [1060, 452, 22, -1], [1008, 486, 18, -1], [922, 460, 16, 1]]) gouge(x, y, l, d);
function crater(x, y, rx, ry) {
  for (let yy = -ry - 2; yy <= ry + 3; yy++) for (let xx = -rx - 3; xx <= rx + 3; xx++) {
    const d = Math.hypot(xx / rx, yy / ry) + (hash(xx, yy, 9) - 0.5) * 0.3;
    const c = kit.get(x + xx, y + yy);
    if (!c) continue;
    if (d < 0.8) kit.set(x + xx, y + yy, shade(c, -2));
    else if (d < 1.0) kit.set(x + xx, y + yy, D[1]);
    else if (d < 1.2 && xx < 0 && yy < 0) kit.set(x + xx, y + yy, D[4]); // bibir terangkat di sisi terang
  }
}
crater(1016, 436, 17, 6); crater(906, 356, 12, 4); crater(1090, 372, 9, 3);
// serpihan kayu dan daun di arena
for (const [x, y] of [[860, 380], [880, 420], [900, 460], [940, 330], [1030, 340], [1080, 420], [1000, 470], [850, 440], [1050, 400], [930, 500]]) {
  for (let i = 0; i < 5; i++) { const px = x + Math.round((hash(i, x, 5) - 0.5) * 16), py = y + Math.round((hash(i, y, 6) - 0.5) * 8); kit.set(px, py, P.wood[3]); kit.set(px + 1, py, P.wood[2]); kit.set(px + 2, py + 1, P.wood[1]); }
}

// ---- paving pertama dekat Aveloria: batu bulat/pipih berbaris selang-seling, makin rapat ke timur, hilang bertahap di barat
for (let y = 340; y < 460; y++) for (let x = 1290; x < W; x++) {
  const c = kit.get(x, y);
  if (!c || c.ramp !== D || kit.F[y * W + x] < 3) continue;
  const row = Math.floor(y / 9), off = (row % 2) * 7;
  const col = Math.floor((x + off) / 14), lx = (x + off) % 14, ly = y % 9;
  const density = smooth(1290, 1390, x);
  if (hash(col, row, 35) > 0.25 + density * 0.7) continue;
  if (lx >= 13 || ly >= 8) { kit.set(x, y, D[1]); continue; } // celah
  let idx = lx < 2 || ly < 2 ? 4 : 3;
  if (hash(col, row, 36) < 0.3) idx = 2;
  kit.set(x, y, S[idx]);
}

kit.tufts({ sunAt, dirtField });
kit.litterNearTrees(map.props);
kit.shadows(map.props, SHADOW_OF, { extra: [{ cx: 976, cy: 408, rx: 40, ry: 9 }] }); // bayangan bos
kit.finish();
const outDir = resolve(here, '../public/assets/environment/forest_edge');
writeFileDeep(resolve(outDir, 'ground.png'), encodePNG(W, H, kit.canvas.d));
console.log(`forest_edge/ground.png ${W}x${H}, ${map.props.length} prop`);

if (process.env.PREVIEW) {
  const sprites = buildAll(P);
  const [x, y, w, h, z, out] = process.env.PREVIEW.split(',');
  const list = map.props.filter((p) => sprites[p.type]).map((p) => ({ x: p.x, y: p.y, sprite: sprites[p.type] }));
  const big = composePreview(kit.canvas, list, { x: +x, y: +y, w: +w, h: +h }, +z);
  writeFileDeep(out, encodePNG(big.w, big.h, big.d));
  console.log('preview', out);
}
void readFileSync;
