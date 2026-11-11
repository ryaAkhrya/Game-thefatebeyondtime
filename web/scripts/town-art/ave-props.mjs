// Prop Aveloria: kios pasar, sumur, kotak/tong, papan petunjuk, lampu, bangku, tanaman, perabot ruang pertemuan.
import { Canvas, hash, vnoise, clamp } from './pixel.mjs';
import { ashlar, planks, shadedBox, bandShade, INK, R } from './kit.mjs';
import { tilePlane } from './kit.mjs';
import { drawText, textWidth } from './font.mjs';
import { AV } from './ave-palette.mjs';
import { frame, plumAwning } from './ave-sprites.mjs';

const S = AV.stone, W_ = AV.wood;
const px = (c, x, y, col) => c.set(x, y, col);

/** Mahkota daun bulat: gumpalan 4px, cahaya kiri-atas. */
export function crown(c, cx, cy, rx, ry, ramp, seed, clump = 4) {
  for (let y = Math.floor(cy - ry - 2); y <= Math.ceil(cy + ry + 2); y++) for (let x = Math.floor(cx - rx - 2); x <= Math.ceil(cx + rx + 2); x++) {
    const wob = (vnoise(x * 0.3, y * 0.3, seed) - 0.5) * 3;
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    if (Math.hypot(dx, dy) * Math.min(rx, ry) + wob > Math.min(rx, ry)) continue;
    const light = -dx * 0.55 - dy * 0.75;
    const cl = hash(Math.floor((x + 100) / clump), Math.floor((y + 100) / clump), seed);
    let k = 2 + light * 1.6 + (cl - 0.5) * 1.5;
    if (((x + y) & 1) === 0 && hash(x, y, seed + 3) > 0.9) k += 0.7;
    c.set(x, y, R(ramp, Math.round(k)));
  }
}
function trunk(c, cx, base, w, h, ramp = W_) {
  for (let j = 0; j < h; j++) { const fl = j > h - 5 ? Math.floor((j - (h - 5)) / 2) + 1 : 0; for (let i = -Math.floor(w / 2) - fl; i <= Math.floor(w / 2) + fl; i++) c.set(cx + i, base - j, R(ramp, i < -w / 4 ? 3 : i > w / 4 ? 1 : 2)); }
}

export function avTreeRound() { // pohon pangkas berbentuk bola
  const c = new Canvas(64, 84), B = 80;
  trunk(c, 32, B, 6, 26); crown(c, 32, 34, 25, 25, AV.grass, 3, 4);
  bandShade(c, 8, 44, 48, 18, AV.shadow, 60, 'up');
  c.outline(INK); return frame('ave_tree_round', c, B);
}
export function avTreeTall() { // sipres/poplar kolumnar
  const c = new Canvas(40, 112), B = 108;
  trunk(c, 20, B, 4, 12); crown(c, 20, 56, 13, 46, AV.grass, 7, 4);
  c.outline(INK); return frame('ave_tree_tall', c, B);
}
export function avOak() { // pohon besar di luar tembok
  const c = new Canvas(116, 120), B = 114;
  trunk(c, 58, B, 12, 44);
  for (const [x, y, rx, ry, s] of [[58, 38, 30, 26, 2], [30, 52, 24, 20, 3], [88, 54, 24, 20, 4], [58, 62, 34, 20, 5]]) crown(c, x, y, rx, ry, AV.grass, s, 5);
  c.outline(INK); return frame('ave_oak', c, B);
}
export function avBush() {
  const c = new Canvas(36, 26), B = 24;
  crown(c, 18, 14, 16, 10, AV.grass, 9, 3); crown(c, 10, 16, 9, 7, AV.grass, 11, 3);
  c.outline(INK); return frame('ave_bush', c, B);
}
/** Petak pagar-tanaman 48x48 jejak: kotak hedge dengan topiari bola. Dasar di y=47. */
export function avHedgeBed() {
  const c = new Canvas(56, 80), B = 74;
  // alas batu
  c.rect(4, B - 12, 48, 13, R(S, 3)); c.hline(4, B - 12, 48, R(S, 5)); c.hline(4, B, 48, R(S, 1)); c.vline(4, B - 12, 13, R(S, 4)); c.vline(51, B - 12, 13, R(S, 1));
  for (let x = 12; x < 50; x += 12) c.vline(x, B - 11, 11, R(S, 2));
  // pagar hijau di atas alas, tinggi 22
  for (let j = 0; j < 24; j++) for (let i = 0; i < 46; i++) { const k = 2 + (j < 4 ? 1 : 0) + (hash(Math.floor(i / 3), Math.floor(j / 3), 8) > 0.72 ? 1 : 0) - (j > 19 ? 1 : 0) - (i > 40 ? 1 : 0); c.set(5 + i, B - 36 + j, R(AV.grass, k)); }
  crown(c, 28, B - 46, 11, 11, AV.grass, 6, 3);
  trunk(c, 28, B - 36, 3, 6);
  bandShade(c, 5, B - 14, 46, 6, AV.shadow, 70, 'up');
  c.outline(INK); return frame('ave_hedge_bed', c, B);
}
export function avPlanter() { // pot batu dengan tanaman (di pintu)
  const c = new Canvas(24, 30), B = 28;
  c.rect(4, B - 11, 16, 12, R(S, 3)); c.hline(4, B - 11, 16, R(S, 5)); c.vline(4, B - 11, 12, R(S, 4)); c.vline(19, B - 11, 12, R(S, 1)); c.hline(4, B, 16, R(S, 1)); c.rect(3, B - 12, 18, 3, R(S, 4));
  crown(c, 12, B - 18, 8, 8, AV.grass, 14, 3); for (const [x, y] of [[8, B - 21], [15, B - 17], [12, B - 24]]) c.rect(x, y, 2, 2, AV.rose);
  c.outline(INK); return frame('ave_planter', c, B);
}
export function avBench() {
  const c = new Canvas(44, 24), B = 22;
  c.rect(2, B - 8, 40, 5, R(S, 4)); c.hline(2, B - 8, 40, R(S, 5)); c.hline(2, B - 4, 40, R(S, 2));
  c.rect(4, B - 4, 6, 5, R(S, 3)); c.rect(34, B - 4, 6, 5, R(S, 3)); c.vline(4, B - 4, 5, R(S, 4)); c.vline(39, B - 4, 5, R(S, 1));
  c.rect(2, B - 16, 40, 3, R(W_, 3)); c.hline(2, B - 16, 40, R(W_, 4)); c.hline(2, B - 14, 40, R(W_, 1));
  c.rect(4, B - 13, 3, 5, R(S, 3)); c.rect(37, B - 13, 3, 5, R(S, 2));
  c.outline(INK); return frame('ave_bench', c, B);
}
export function avLamp() {
  const c = new Canvas(20, 70), B = 66;
  c.rect(5, B - 5, 10, 6, R(S, 3)); c.hline(5, B - 5, 10, R(S, 5)); c.vline(5, B - 5, 6, R(S, 4)); c.vline(14, B - 5, 6, R(S, 1)); c.hline(5, B, 10, R(S, 1));
  for (let j = 0; j < 46; j++) { c.set(9, B - 6 - j, R(AV.iron, 3)); c.set(10, B - 6 - j, R(AV.iron, 2)); c.set(11, B - 6 - j, R(AV.iron, 1)); }
  c.rect(6, B - 56, 8, 3, R(AV.iron, 2));
  c.rect(5, B - 66, 10, 10, AV.glass[1]); c.rect(7, B - 64, 6, 6, AV.cream); c.set(7, B - 64, [255, 255, 240]); c.set(8, B - 64, [255, 255, 240]); c.hline(4, B - 67, 12, R(AV.iron, 2)); c.hline(6, B - 68, 8, R(AV.iron, 3));
  c.outline(INK); return frame('ave_lamp', c, B);
}
/** Papan penunjuk arah: PASAR / ARSIP / ISTANA di tiang. */
export function avSignpost() {
  const c = new Canvas(64, 74), B = 70;
  c.rect(29, 6, 6, B - 5, R(W_, 2)); c.vline(29, 6, B - 5, R(W_, 3)); c.vline(34, 6, B - 5, R(W_, 1)); c.rect(27, 3, 10, 4, R(W_, 3)); c.hline(27, 3, 10, R(W_, 4));
  c.rect(24, B - 2, 16, 3, R(S, 3)); c.hline(24, B - 2, 16, R(S, 4));
  const plank = (y, label, dir) => {
    const w = textWidth(label) + 10, x = dir < 0 ? 30 - w + 2 : 32;
    c.rect(x, y, w, 12, R(W_, 3)); c.hline(x, y, w, R(W_, 4)); c.hline(x, y + 11, w, R(W_, 1));
    for (let j = 0; j < 12; j++) { const t = dir < 0 ? Math.abs(5 - j) : 0; void t; }
    if (dir < 0) { c.poly([[x, y], [x - 5, y + 5.5], [x, y + 12]], R(W_, 3)); c.line(x, y, x - 5, y + 6, R(W_, 4)); c.line(x - 5, y + 6, x, y + 11, R(W_, 1)); }
    else { c.poly([[x + w, y], [x + w + 5, y + 5.5], [x + w, y + 12]], R(W_, 3)); c.line(x + w, y, x + w + 5, y + 6, R(W_, 4)); c.line(x + w + 5, y + 6, x + w, y + 11, R(W_, 1)); }
    drawText(c, x + 5, y + 3, label, AV.cream, R(W_, 0));
    c.set(x + 2, y + 2, R(AV.iron, 2)); c.set(x + w - 3, y + 2, R(AV.iron, 2));
  };
  plank(10, 'PASAR', -1); plank(25, 'ISTANA', 1); plank(40, 'ARSIP', 1);
  c.outline(INK); return frame('ave_signpost', c, B);
}
/** Penunjuk jalan ke Liora (selatan gerbang): kayu, panah ke bawah-kanan. */
export function avRoadsign() {
  const c = new Canvas(56, 60), B = 56;
  c.rect(10, 8, 5, B - 7, R(W_, 2)); c.vline(10, 8, B - 7, R(W_, 3)); c.vline(14, 8, B - 7, R(W_, 1));
  const w = textWidth('LIORA') + 10, x = 12;
  c.rect(x, 12, w, 13, R(W_, 3)); c.hline(x, 12, w, R(W_, 4)); c.hline(x, 24, w, R(W_, 1));
  c.poly([[x + w, 12], [x + w + 6, 18.5], [x + w, 25]], R(W_, 3)); c.line(x + w, 12, x + w + 6, 18, R(W_, 4)); c.line(x + w + 6, 19, x + w, 24, R(W_, 1));
  drawText(c, x + 5, 16, 'LIORA', AV.cream, R(W_, 0));
  c.rect(6, B - 2, 14, 3, R(S, 3)); c.hline(6, B - 2, 14, R(S, 4));
  c.outline(INK); return frame('ave_roadsign', c, B, 12 / 56);
}

/** Sumur plaza (footprint 80x64): bibir batu, dua tiang dan atap slate kecil dengan katrol. */
export function avWell() {
  const c = new Canvas(96, 112), B = 108;
  // bibir batu oktagon: elips 70x34
  const cx = 48, cy = B - 22;
  c.ellipse(cx, cy + 6, 36, 17, R(S, 2));
  c.ellipse(cx, cy + 1, 36, 17, (x, y) => R(S, ((x - cx) < -10 && (y - cy) < 0) ? 4 : (x - cx) > 14 ? 2 : 3));
  c.ellipse(cx, cy, 29, 11, R(S, 1)); c.ellipse(cx, cy + 1, 27, 9, R(AV.water, 1)); c.ellipse(cx - 4, cy, 14, 4, R(AV.water, 2)); c.ellipse(cx - 10, cy - 2, 5, 1.2, R(AV.water, 3));
  for (let a = 0; a < 16; a++) { const t = (a / 16) * Math.PI * 2; if (Math.sin(t) > 0) c.line(Math.round(cx + Math.cos(t) * 36), Math.round(cy + 1 + Math.sin(t) * 17), Math.round(cx + Math.cos(t) * 29), Math.round(cy + 1 + Math.sin(t) * 11), R(S, 1)); }
  // tiang & atap
  for (const x of [20, 72]) { c.rect(x, B - 74, 5, 56, R(W_, 2)); c.vline(x, B - 74, 56, R(W_, 3)); c.vline(x + 4, B - 74, 56, R(W_, 1)); }
  c.rect(18, B - 72, 60, 4, R(W_, 2)); c.hline(18, B - 72, 60, R(W_, 4));
  c.rect(45, B - 70, 6, 6, R(AV.iron, 2)); c.vline(48, B - 64, 20, R(W_, 4)); c.rect(46, B - 44, 5, 5, R(W_, 2)); c.hline(46, B - 44, 5, R(W_, 4));
  const rl = 12, rr = 84, y0 = B - 96, y1 = B - 70;
  tilePlane(c, [[rl - 6, y1], [rl + 14, y0], [rr - 14, y0], [rr + 6, y1]], { ramp: AV.slate, ch: 4, tw: 6, shift: 0, seed: 9, y0 });
  c.rect(rl - 6, y1, rr - rl + 13, 2, R(AV.slate, 1)); c.hline(rl - 6, y1, rr - rl + 13, R(AV.slate, 3));
  c.line(rl - 6, y1, rl + 14, y0, R(AV.slate, 4)); c.hline(rl + 14, y0, rr - rl - 27, R(AV.slate, 4));
  bandShade(c, 20, B - 70, 56, 6, AV.shadow, 80, 'down');
  c.outline(INK); return frame('ave_well', c, B);
}

/** Kios pasar Derrria. Bagian belakang (atap kain + rak) dan bagian depan (meja + kain) terpisah supaya NPC berdiri di antaranya. */
export function avStallBack() {
  const w = 120, c = new Canvas(w + 8, 96), B = 92;   // B = baris tepi belakang meja (dasar NPC)
  for (const x of [4, w - 4]) { c.rect(x, B - 74, 5, 76, R(W_, 2)); c.vline(x, B - 74, 76, R(W_, 3)); c.vline(x + 4, B - 74, 76, R(W_, 1)); }
  // rak botol di belakang
  for (const y of [B - 34, B - 52]) {
    c.rect(8, y, w - 12, 3, R(W_, 3)); c.hline(8, y, w - 12, R(W_, 4)); c.hline(8, y + 3, w - 12, R(W_, 0));
    for (let x = 12, k = 0; x < w - 14; x += 7, k++) { const tall = k % 3 === 0; c.rect(x, y - (tall ? 10 : 7), 4, tall ? 10 : 7, R(AV.teal, k % 2 ? 2 : 1)); c.set(x + 1, y - (tall ? 9 : 6), R(AV.teal, 3)); c.rect(x + 1, y - (tall ? 12 : 9), 2, 2, R(W_, 4)); }
  }
  // bagian atas atap kain: permukaan miring gelap lalu lambrekin
  for (let j = 0; j < 10; j++) for (let i = 0; i < w + 4; i++) c.set(2 + i, B - 92 + j, R(AV.plum, 1 + (Math.floor(i / 8) % 2 ? 0 : 1)) );
  plumAwning(c, 2, B - 82, w + 4, 14, 8);
  c.rect(0, B - 94, w + 8, 3, R(W_, 2)); c.hline(0, B - 94, w + 8, R(W_, 4));
  // gantungan herba
  for (const x of [26, 60, 94]) { c.vline(x, B - 62, 6, R(W_, 0)); c.rect(x - 2, B - 56, 5, 7, R(AV.grass, 2 + (x % 2))); c.set(x, B - 49, R(AV.grass, 1)); }
  c.outline(INK); return frame('ave_stall_back', c, B);
}
export function avStallFront() {
  const w = 112, c = new Canvas(w + 8, 60), B = 56;     // B = tepi depan meja
  // permukaan atas (24) + muka depan (22)
  planks(c, 4, B - 46, w, 24, { ramp: W_, vertical: false, bw: 6, tone: 3, seed: 4 });
  c.hline(4, B - 46, w, R(W_, 4));
  planks(c, 4, B - 22, w, 22, { ramp: W_, vertical: true, bw: 7, tone: 2, seed: 9 });
  c.rect(4, B - 23, w, 2, R(W_, 4)); c.hline(4, B - 21, w, R(W_, 1));
  // kain jumbai plum/krem di muka depan
  for (let x = 8; x < w - 4; x += 16) { for (let j = 0; j < 14; j++) for (let i = 0; i < 14; i++) { const e = j > 9 ? Math.abs(i - 6.5) > 6 - (j - 9) : false; if (!e) c.set(x + i, B - 20 + j, i < 2 ? R(AV.plum, 3) : R(AV.plum, 2 - (j > 11 ? 1 : 0))); } c.vline(x + 7, B - 20, 11, R(AV.plum, 1)); }
  for (let x = 16; x < w - 4; x += 16) c.rect(x, B - 20, 1, 12, AV.cream, 130);
  c.hline(4, B, w, R(W_, 0));
  // barang di meja: dua baris botol teal, toples, timbangan
  for (let x = 12; x < 52; x += 8) { c.rect(x, B - 42, 5, 9, R(AV.teal, x % 16 ? 2 : 1)); c.set(x + 1, B - 41, R(AV.teal, 3)); c.rect(x + 1, B - 44, 3, 3, R(W_, 4)); }
  for (let x = 58; x < 84; x += 12) { c.rect(x, B - 40, 9, 8, R(AV.glass, 1)); c.rect(x, B - 40, 9, 2, R(W_, 3)); c.rect(x + 2, B - 36, 5, 3, AV.squash); }
  c.rect(92, B - 36, 12, 3, R(AV.iron, 2)); c.vline(98, B - 44, 8, R(AV.iron, 2)); c.hline(92, B - 44, 12, R(AV.iron, 3));
  c.outline(INK); return frame('ave_stall_front', c, B, (4 + w / 2) / (w + 8));
}
/** Kios sayur (footprint 56x72). */
export function avProduce() {
  const c = new Canvas(80, 110), B = 106;
  // tiang atap belakang (kiri-kanan) dan atap kain
  for (const x of [6, 66]) { c.rect(x, B - 94, 5, 70, R(W_, 2)); c.vline(x, B - 94, 70, R(W_, 3)); c.vline(x + 4, B - 94, 70, R(W_, 1)); }
  for (let j = 0; j < 9; j++) for (let i = 0; i < 72; i++) c.set(4 + i, B - 102 + j, R(AV.plum, 1 + (Math.floor(i / 8) % 2 ? 0 : 1)));
  plumAwning(c, 4, B - 93, 72, 13, 8);
  // meja bertingkat: baris belakang (lebih tinggi) dan depan
  const tier = (y, h, items) => { planks(c, 6, y, 68, h, { ramp: W_, vertical: true, bw: 5, tone: 2, seed: y }); c.hline(6, y, 68, R(W_, 4)); c.hline(6, y + h - 1, 68, R(W_, 0)); for (const [x, kind] of items) pile(c, x, y, kind); };
  tier(B - 36, 14, [[10, 'cab'], [30, 'tom'], [50, 'sq']]);
  tier(B - 14, 14, [[10, 'sq'], [30, 'cab'], [50, 'tom']]);
  bandShade(c, 6, B - 60, 68, 8, AV.shadow, 70, 'down');
  c.outline(INK); return frame('ave_produce', c, B);
}
function pile(c, x, y, kind) { // tumpukan hasil bumi: baris bulatan berbayang
  const base = kind === 'tom' ? AV.tomato : kind === 'sq' ? AV.squash : AV.leaf;
  const dk = base.map(v => Math.round(v * 0.62)), lt = base.map(v => Math.min(255, Math.round(v * 1.25)));
  for (let r = 0; r < 2; r++) for (let i = 0; i < 4 - r; i++) { const cx = x + 3 + i * 5 + r * 2.5, cy = y - 3 - r * 4; c.ellipse(cx, cy, 3, 3, dk); c.ellipse(cx - 0.4, cy - 0.4, 2.4, 2.4, base); c.set(Math.round(cx - 1), Math.round(cy - 1), lt); }
}
export function avCratesStack() { // dua peti dan satu tong
  const c = new Canvas(56, 46), B = 42;
  const crate = (x, y, tone) => { planks(c, x, y, 20, 16, { ramp: W_, vertical: false, bw: 5, tone, seed: x + y }); c.rect(x, y, 20, 2, R(W_, tone + 2)); c.vline(x, y, 16, R(W_, 1)); c.vline(x + 19, y, 16, R(W_, 0)); c.vline(x + 3, y, 16, R(W_, 1)); c.vline(x + 16, y, 16, R(W_, 1)); c.hline(x, y + 15, 20, R(W_, 0)); };
  crate(4, B - 15, 2); crate(26, B - 15, 3); crate(15, B - 31, 2);
  c.hline(15, B - 31, 20, R(W_, 4));
  c.outline(INK); return frame('ave_crates', c, B);
}
export function avBarrel() {
  const c = new Canvas(24, 32), B = 29;
  for (let j = 0; j < 24; j++) { const hw = 7 + Math.round(Math.sin((j / 23) * Math.PI) * 2); for (let i = -hw; i <= hw; i++) c.set(12 + i, B - 24 + j, R(W_, i < -hw * 0.4 ? 3 : i > hw * 0.45 ? 1 : 2)); }
  for (const y of [4, 12, 20]) c.hline(4, B - 24 + y, 17, R(AV.iron, 2));
  c.ellipse(12, B - 24, 7.5, 2.5, R(W_, 4)); c.ellipse(12, B - 24, 5, 1.5, R(W_, 3));
  c.outline(INK); return frame('ave_barrel', c, B);
}
export function avSacks() {
  const c = new Canvas(40, 30), B = 27;
  for (const [x, y, w, h, t] of [[3, B - 15, 15, 16, 4], [19, B - 13, 16, 14, 3], [10, B - 25, 15, 14, 4]]) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const e = (j < 3 && (i < 3 || i > w - 4)) ; if (!e) c.set(x + i, y + j, [R(S, t)[0] + 14, R(S, t)[1] + 6, R(S, t)[2] - 10].map(v => clamp(v, 0, 255)).map((v, k) => k === 2 ? v - 10 : v)); }
    c.hline(x + 3, y + 2, w - 6, R(W_, 1));
  }
  c.outline(INK); return frame('ave_sacks', c, B);
}
export function avCart() {
  const c = new Canvas(76, 48), B = 44;
  planks(c, 8, B - 28, 52, 20, { ramp: W_, vertical: true, bw: 5, tone: 2, seed: 17 }); c.hline(8, B - 28, 52, R(W_, 4)); c.rect(8, B - 9, 52, 2, R(W_, 1));
  for (let x = 12; x < 56; x += 9) c.rect(x, B - 34, 8, 7, R(AV.grass, 2 + (x % 2)));
  c.rect(60, B - 20, 14, 3, R(W_, 3)); c.hline(60, B - 20, 14, R(W_, 4)); c.rect(72, B - 24, 3, 8, R(W_, 2));
  c.ellipse(26, B - 8, 10, 10, R(W_, 1)); c.ellipse(26, B - 8, 8, 8, R(W_, 3)); c.ellipse(26, B - 8, 2, 2, R(AV.iron, 2)); for (let a = 0; a < 4; a++) { const t = a * Math.PI / 4; c.line(Math.round(26 - Math.cos(t) * 7), Math.round(B - 8 - Math.sin(t) * 7), Math.round(26 + Math.cos(t) * 7), Math.round(B - 8 + Math.sin(t) * 7), R(W_, 1)); }
  c.outline(INK); return frame('ave_cart', c, B);
}
/** Meja kerja 80 (Azie) dan 40 (laporan): meja kayu tampak depan dengan kertas. */
export function avDesk(w, name, seed) {
  const c = new Canvas(w + 6, 44), B = 40;
  planks(c, 3, B - 26, w, 8, { ramp: W_, vertical: false, bw: 4, tone: 3, seed }); c.hline(3, B - 26, w, R(W_, 4));
  planks(c, 3, B - 18, w, 18, { ramp: W_, vertical: true, bw: 6, tone: 2, seed: seed + 1 }); c.rect(3, B - 19, w, 2, R(W_, 1));
  for (const x of [6, w - 3]) c.rect(x, B - 18, 4, 18, R(W_, 1));
  const paper = (x, y, pw, ph, t) => { c.rect(x, y, pw, ph, t ? AV.linen : AV.cream); c.hline(x, y, pw, [245, 240, 226]); c.hline(x, y + ph - 1, pw, [170, 160, 140]); for (let j = 2; j < ph - 2; j += 3) c.hline(x + 2, y + j, pw - 4, [120, 112, 110], 140); };
  if (w > 60) { paper(10, B - 36, 22, 12, 0); paper(40, B - 34, 18, 10, 1); c.rect(w - 14, B - 38, 6, 8, R(AV.iron, 1)); c.rect(w - 6, B - 37, 2, 7, R(AV.iron, 3)); }
  else { paper(7, B - 36, 20, 11, 0); paper(14, B - 34, 18, 10, 1); }
  c.outline(INK); return frame(name, c, B);
}

// ---- ruang pertemuan ----
export function avShelf(name, kind, seed) { // lemari 48x56 tampak depan
  const c = new Canvas(54, 64), B = 61;
  planks(c, 3, B - 56, 48, 56, { ramp: W_, vertical: true, bw: 6, tone: 1, seed });
  c.rect(1, B - 58, 52, 4, R(W_, 3)); c.hline(1, B - 58, 52, R(W_, 4)); c.hline(1, B - 55, 52, R(W_, 1));
  c.rect(3, B - 52, 48, 48, R(W_, 0));
  for (let sh = 0; sh < 3; sh++) {
    const y = B - 52 + sh * 16;
    for (let j = 0; j < 14; j++) for (let i = 0; i < 46; i++) c.set(4 + i, y + 1 + j, R(W_, 0));
    if (kind === 'books') for (let x = 5, k = 0; x < 49; k++) { const bw = 3 + Math.floor(hash(k, sh, seed) * 3), bh = 9 + Math.floor(hash(k, sh + 4, seed) * 4); const col = [AV.plum, AV.teal, W_, AV.slate][Math.floor(hash(k, sh + 9, seed) * 4)]; c.rect(x, y + 14 - bh, bw, bh, R(col, 2)); c.vline(x, y + 14 - bh, bh, R(col, 3)); c.vline(x + bw - 1, y + 14 - bh, bh, R(col, 1)); c.hline(x, y + 14 - bh, bw, R(col, 3)); x += bw + (hash(k, 5, seed) > 0.85 ? 3 : 0); }
    else for (let x = 7, k = 0; x < 46; x += 11, k++) { if (hash(k, sh, seed) > 0.8) continue; c.rect(x, y + 5, 9, 9, AV.linen); c.ellipse(x + 4.5, y + 5, 4.5, 1.6, AV.cream); c.hline(x, y + 13, 9, [150, 140, 120]); c.rect(x + 3, y + 8, 3, 1, R(AV.plum, 2)); }
    c.rect(3, y + 15, 48, 2, R(W_, 3)); c.hline(3, y + 15, 48, R(W_, 4)); c.hline(3, y + 16, 48, R(W_, 0));
  }
  c.vline(3, B - 52, 52, R(W_, 4)); c.vline(50, B - 52, 52, R(W_, 1));
  c.outline(INK); return frame(name, c, B);
}
export function avCouncilTable() { // meja kerja kerajaan 160x32: meja panjang, bukan singgasana
  const c = new Canvas(172, 56), B = 52;
  planks(c, 6, B - 38, 160, 14, { ramp: W_, vertical: false, bw: 5, tone: 3, seed: 61 }); c.hline(6, B - 38, 160, R(W_, 5 > 4 ? 4 : 4));
  c.rect(6, B - 25, 160, 3, R(W_, 1)); c.hline(6, B - 25, 160, R(W_, 3));
  planks(c, 10, B - 22, 152, 22, { ramp: W_, vertical: true, bw: 8, tone: 2, seed: 62 });
  for (const x of [12, 84, 154]) { c.vline(x, B - 22, 22, R(W_, 4)); c.vline(x + 1, B - 22, 22, R(W_, 0)); }
  c.hline(10, B - 22, 152, R(W_, 1)); c.hline(10, B, 152, R(W_, 0));
  // di atas meja: gulungan peta, dua dokumen, tinta dan lilin batang (tidak menyala)
  c.rect(14, B - 46, 34, 9, AV.cream); c.hline(14, B - 46, 34, [245, 240, 226]); c.hline(14, B - 38, 34, [170, 160, 140]);
  for (let j = 2; j < 8; j += 2) c.hline(17, B - 46 + j, 28, [130, 120, 112]);
  c.rect(52, B - 44, 14, 8, AV.linen); c.hline(52, B - 44, 14, [245, 240, 226]);
  c.ellipse(80, B - 40, 8, 2.2, R(AV.plum, 2)); c.rect(72, B - 42, 16, 3, R(AV.plum, 2)); // ujung hamparan kain meja? tidak: gulungan
  c.rect(122, B - 48, 22, 11, R(AV.slate, 1)); c.hline(122, B - 48, 22, R(AV.slate, 3)); c.rect(124, B - 46, 18, 7, R(AV.cream)); c.vline(133, B - 46, 7, [150, 140, 120]);
  c.rect(150, B - 45, 4, 8, R(AV.iron, 1)); c.rect(158, B - 48, 3, 11, AV.linen); c.rect(157, B - 38, 5, 2, R(AV.bronze, 1));
  c.outline(INK); return frame('ave_council_table', c, B, 0.5);
}
export function avChair() {
  const c = new Canvas(28, 52), B = 48;
  c.rect(5, B - 34, 18, 30, R(AV.plum, 1)); c.vline(5, B - 34, 30, R(AV.plum, 3)); c.vline(22, B - 34, 30, R(AV.plum, 0)); c.rect(4, B - 36, 20, 3, R(W_, 3)); c.hline(4, B - 36, 20, R(W_, 4));
  c.rect(3, B - 10, 22, 6, R(W_, 2)); c.hline(3, B - 10, 22, R(W_, 4)); c.rect(4, B - 4, 3, 5, R(W_, 1)); c.rect(21, B - 4, 3, 5, R(W_, 1));
  for (let j = 4; j < 22; j += 4) c.hline(8, B - 34 + j, 12, R(AV.plum, 2));
  c.outline(INK); return frame('ave_chair', c, B);
}
export function avLadder() {
  const c = new Canvas(20, 64), B = 61;
  for (const x of [3, 15]) { c.vline(x, 4, B - 4, R(W_, 3)); c.vline(x + 1, 4, B - 4, R(W_, 1)); }
  for (let y = 10; y < B - 2; y += 9) { c.hline(3, y, 13, R(W_, 2)); c.hline(3, y + 1, 13, R(W_, 0)); }
  c.outline(INK); return frame('ave_ladder', c, B);
}
export function avRugCrest() { // karpet kecil di depan meja: plum dengan dua garis putus
  const c = new Canvas(96, 40);
  for (let j = 0; j < 40; j++) for (let i = 0; i < 96; i++) { const edge = i < 3 || i > 92 || j < 3 || j > 36; const inner = i < 6 || i > 89 || j < 6 || j > 33; c.set(i, j, edge ? R(AV.plum, 3) : inner ? R(AV.plum, 1) : R(AV.plum, 2)); }
  for (let t = 0; t < 7; t++) { c.set(32 + t * 5, 18, AV.rose); c.set(35 + t * 5, 21, AV.lime); }
  return { name: 'ave_rug_crest', c, pivot: { x: 0.5, y: 0.5 } };
}
