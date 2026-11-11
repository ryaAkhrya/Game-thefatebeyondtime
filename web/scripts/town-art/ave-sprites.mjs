// Sprite Aveloria: bangunan, gerbang, menara, kios, perabot ruang pertemuan, tanaman. Satu bahasa: batu pucat + slate + plum.
import { Canvas, clamp, hash, vnoise } from './pixel.mjs';
import { ashlar, doorBox, windowBox, planks, bandShade, INK, R } from './kit.mjs';
import { hipRoof, chimney, plasterWall, eaveShadow, gableFront } from './buildings.mjs';
import { drawText, textWidth } from './font.mjs';
import { AV } from './ave-palette.mjs';

export const frame = (name, c, baseY, px = 0.5, extra) => ({ name, c, pivot: { x: px, y: (baseY + 1) / c.h }, extra });
const S = AV.stone;

/** blok sudut selang-seling (quoin) pada tepi dinding */
export function quoins(c, x, y, h, w, left, tone = 4) {
  for (let j = 0, k = 0; j < h; j += 7, k++) {
    const bw = k % 2 ? 7 : 11;
    const bx = left ? x : x + w - bw;
    for (let jj = 0; jj < 6 && j + jj < h; jj++) for (let ii = 0; ii < bw; ii++) {
      let t = tone;
      if (jj === 0) t = tone + 1; else if (jj === 5) t = tone - 2; else if (ii === 0 && left) t = tone + 1; else if (ii === bw - 1 && !left) t = tone - 1;
      c.set(bx + ii, y + j + jj, R(S, t));
    }
  }
}

/** ambang pintu melengkung: lengkung batu + pintu kayu. (x,y) = sudut kiri-atas daun pintu. */
export function archedDoor(c, x, y, w, h, B, o = {}) {
  const r = w / 2 + 3, cx = x + w / 2, cy = y + w / 2;
  for (let j = y - 3; j <= B; j++) for (let i = x - 3; i < x + w + 3; i++) {
    if (j < cy && Math.hypot(i + 0.5 - cx, j + 0.5 - cy) > r) continue;
    const ang = Math.atan2(j + 0.5 - cy, i + 0.5 - cx);
    const joint = j < cy && Math.abs(((ang * 180 / Math.PI + 180) % 22.5)) < 3.2;
    c.set(i, j, R(S, joint ? 2 : (i < cx ? 4 : 3)));
  }
  doorBox(c, x, y, w, h, { ramp: AV.wood, iron: AV.iron, arch: true, frame: AV.wood, knob: R(AV.bronze, 2), seed: o.seed ?? 6 });
  for (const dx of [-1, 0]) c.set(Math.round(cx) + dx, y - 3, R(S, 5));   // kunci lengkung
  // tangga dua anak
  c.rect(x - 5, B - 3, w + 10, 3, R(S, 3)); c.hline(x - 5, B - 3, w + 10, R(S, 5)); c.hline(x - 5, B, w + 10, R(S, 1));
  c.rect(x - 3, B - 6, w + 6, 3, R(S, 4)); c.hline(x - 3, B - 6, w + 6, R(S, 5));
}

/** Awning kain plum bergaris krem, bergelombang di tepi bawah. (x,y)=sudut kiri-atas, depth=tinggi miring */
export function plumAwning(c, x, y, w, depth, stripe = 8) {
  for (let j = 0; j < depth; j++) for (let i = 0; i < w; i++) {
    const s = Math.floor(i / stripe) % 2 === 0;
    let k = s ? 2 : 0;
    const shade = j < 2 ? 1 : j > depth - 4 ? -1 : 0;   // lipatan atas terang, tepi bawah gelap
    if (s) c.set(x + i, y + j, R(AV.plum, k + shade)); else c.set(x + i, y + j, shade < 0 ? [190, 180, 160] : shade > 0 ? [236, 228, 208] : AV.cream);
  }
  for (let i = 0; i < w; i++) { // lambrekin bergerigi
    const s = Math.floor(i / stripe) % 2 === 0, m = i % stripe;
    const sc = s ? R(AV.plum, 1) : [190, 180, 160];
    const len = m < 2 || m > stripe - 3 ? 2 : 4;
    for (let j = 0; j < len; j++) c.set(x + i, y + depth + j, j === len - 1 ? R(AV.plum, 0) : sc);
  }
}

export function banner(c, x, y, h, w = 12) {
  c.rect(x - 1, y - 2, w + 2, 2, R(AV.wood, 1)); c.hline(x - 1, y - 2, w + 2, R(AV.wood, 3));
  for (let j = 0; j < h; j++) {
    const tail = j > h - 6, half = tail ? Math.floor((j - (h - 6)) * 0.9) : 0;
    for (let i = 0; i < w; i++) {
      if (tail && (i < half || i >= w - half)) continue;
      c.set(x + i, y + j, R(AV.plum, i < 2 ? 3 : i > w - 3 ? 1 : 2));
    }
  }
  // dua garis putus yang hampir bertemu (motif Aveloria): mawar dan hijau-muda
  const mid = Math.floor(w / 2);
  for (let j = 5; j < h - 10; j++) { if (j % 5 !== 4) { c.set(x + mid - 2, y + j + (j > h / 2 ? 0 : 0), AV.rose); } if ((j + 2) % 5 !== 4) c.set(x + mid + 1, y + j, AV.lime); }
}

export function homeBase(W, wallH, roofH, seed) {
  const c = new Canvas(W + 16, wallH + roofH + 34);
  const B = c.h - 4, x0 = 8, yW = B - wallH + 1;
  plasterWall(c, x0, yW, W, wallH, { plaster: S, tone: 3, seed });
  return { c, B, x0, yW };
}

/** Rumah 1 (176x128): rumah penjahit di barat laut, atap pinggul slate, awning plum di pintu. */
export function avHome1() {
  const W = 176, { c, B, x0, yW } = homeBase(W, 60, 58, 11);
  ashlar(c, x0, B - 10, W, 11, { ramp: S, tone: 2, ch: 6, bw: [12, 20], seed: 4 }); c.hline(x0, B - 11, W, R(S, 4));
  quoins(c, x0, yW + 2, 58, 12, true); quoins(c, x0 + W - 12, yW + 2, 58, 12, false);
  const wy = yW + 22;
  for (const [wx, fl] of [[26, false], [56, true], [128, false], [152, true]]) {
    windowBox(c, x0 + wx, wy, 12, 14, { frame: AV.wood, glass: AV.glass, shutter: 'open', shutCol: AV.teal, flowers: fl ? { leaf: AV.grass, bloom: AV.rose } : null });
  }
  archedDoor(c, x0 + 82, B - 33, 20, 32, B);
  c.rect(x0 + 76, B - 49, 32, 4, R(S, 4)); c.hline(x0 + 76, B - 49, 32, R(S, 5)); c.hline(x0 + 76, B - 46, 32, R(S, 1));   // kanopi batu kecil di atas pintu
  for (const dx of [78, 102]) c.rect(x0 + dx, B - 45, 3, 4, R(S, 3));
  eaveShadow(c, x0, yW, W, 10);
  hipRoof(c, { xl: 0, xr: W + 16, yE: yW + 3, h: 58, inset: 52, ramp: AV.slate, seed: 5 });
  // cerobong digambar lagi di atas atap agar tumpuannya tampak duduk di bidang atap
  chimney(c, 132, 8, 52, 14, S, AV.slate[0]);
  c.rect(130, 52, 18, 3, R(AV.slate, 1));
  c.outline(INK);
  return frame('ave_home1', c, B);
}

