// Sprite Liora: rumah kayu-jerami-tanah, tempat kerja Zira, rak jemur, sumur, pagar, tanaman. Bahasa visual: kayu, jerami, tanah, kapur.
import { Canvas, hash, vnoise, clamp, H } from './pixel.mjs';
import { ashlar, doorBox, windowBox, planks, bandShade, tilePlane, INK, R, ramp } from './kit.mjs';
import { hipRoof, chimney, plasterWall, eaveShadow, gableFront } from './buildings.mjs';
import { drawText, textWidth } from './font.mjs';

export const LI = {
  earth: ramp('#5a4632', '#785d40', '#967a52', '#b39968', '#cdb585'),
  grass: ramp('#34482e', '#47642f', '#5f8038', '#7b9c45', '#9db95e'),
  thatch: ramp('#6a5230', '#8b6f3f', '#ad9050', '#cbb066', '#e2cd88'),
  wood: ramp('#2e2018', '#47301f', '#654530', '#85603f', '#a67c52'),
  daub: ramp('#8f8670', '#b3a98f', '#d2c8ac', '#ebe3cb'),
  ochre: ramp('#8f6a45', '#ae8556', '#c9a26c', '#ddbd88'),
  stone: ramp('#4a463f', '#6a665a', '#8d887a', '#b2ac9a', '#d0cab6'),
  shingle: ramp('#3d3430', '#574b43', '#75675a', '#968676', '#b7a691'),
  indigo: ramp('#2f3f63', '#48608c', '#6c87b3'),
  madder: ramp('#7a3a34', '#a0524a', '#c97a6a'),
  linen: ramp('#b8af94', '#cfc6ab', '#ebe3cb'),
  water: ramp('#2f4d5a', '#4a7487', '#7eaebb', '#c0dbd8'),
  iron: ramp('#2a2a30', '#4d4e58', '#7e808c'),
  glass: [H('#2a3340'), H('#3f5062'), H('#8aa6b4')],
  pink: H('#d98fa0'), pale: H('#e6d8a0'), lav: H('#9b8cc8'), leaf: ramp('#2f4a2c', '#456a34', '#628a3c'),
  apple: H('#c4553f'), shadow: H('#2a2233'),
};
const T = LI.thatch, W = LI.wood;
export const lframe = (name, c, baseY, px = 0.5) => ({ name, c, pivot: { x: px, y: (baseY + 1) / c.h } });

/** rangka kayu terlihat di atas dinding: tiang, balok atas/bawah, penyangga diagonal */
function timberFrame(c, x, y, w, h, posts, braces = true, beam = 4) {
  const bar = (bx, by, bw, bh) => { c.rect(bx, by, bw, bh, R(W, 2)); c.hline(bx, by, bw, R(W, 3)); c.vline(bx, by, bh, R(W, 3)); c.hline(bx, by + bh - 1, bw, R(W, 0)); c.vline(bx + bw - 1, by, bh, R(W, 1)); };
  bar(x, y, w, beam); bar(x, y + h - beam, w, beam);
  for (const p of posts) bar(x + p, y, beam, h);
  if (braces) for (let i = 0; i < posts.length - 1; i++) {
    const a = x + posts[i] + beam, b = x + posts[i + 1];
    if (b - a < 16) continue;
    c.line(a, y + h - beam - 1, a + Math.min(16, b - a), y + beam + 1, R(W, 2)); c.line(a + 1, y + h - beam - 1, a + 1 + Math.min(16, b - a), y + beam + 1, R(W, 1));
  }
}
function porch(c, x, y, w, depthH) { // tritisan kecil: balok melintang di atas dua tiang
  c.rect(x, y, w, 3, R(W, 3)); c.hline(x, y, w, R(W, 4)); c.hline(x, y + 3, w, R(W, 0));
  for (const px of [x + 1, x + w - 4]) { c.rect(px, y + 3, 3, depthH, R(W, 2)); c.vline(px, y + 3, depthH, R(W, 3)); c.vline(px + 2, y + 3, depthH, R(W, 1)); }
}
const stepStone = (c, x, w, B) => { c.rect(x, B - 3, w, 3, R(LI.stone, 3)); c.hline(x, B - 3, w, R(LI.stone, 4)); c.hline(x, B, w, R(LI.stone, 1)); };
function carvedFrame(c, x, y, w, h) { // bingkai ukir kecil digantung di dinding (budaya Liora)
  c.rect(x, y, w, h, R(W, 3)); c.rect(x + 2, y + 2, w - 4, h - 4, R(LI.daub, 1)); c.hline(x, y, w, R(W, 4)); c.vline(x + w - 1, y, h, R(W, 1)); c.hline(x, y + h - 1, w, R(W, 0));
  c.line(x + 3, y + h - 4, x + w - 4, y + 3, R(W, 1)); c.line(x + 3, y + 3, x + Math.floor(w / 2), y + Math.floor(h / 2), R(W, 1));
}
function herbs(c, x, y) { for (let i = 0; i < 3; i++) { c.vline(x + i * 5, y, 3, R(W, 1)); c.rect(x + i * 5 - 1, y + 3, 4, 6, R(LI.leaf, 1 + (i % 2))); c.set(x + i * 5, y + 9, R(LI.leaf, 0)); } }

/** Rumah NW (160x120): rangka kayu + kapur, atap jerami pinggul, cerobong batu, bingkai ukir di atas pintu. */
export function lioHouseNW() {
  const W_ = 160, c = new Canvas(W_ + 16, 150), B = 146, x0 = 8, wallH = 56, yW = B - wallH + 1;
  plasterWall(c, x0, yW, W_, wallH, { plaster: LI.daub, tone: 2, seed: 7 });
  ashlar(c, x0, B - 8, W_, 9, { ramp: LI.stone, tone: 2, ch: 5, bw: [8, 14], seed: 3 }); c.hline(x0, B - 9, W_, R(LI.stone, 4));
  timberFrame(c, x0, yW, W_, wallH - 9, [0, 40, 78, 116, W_ - 4]);
  for (const wx of [14, 52, 124]) windowBox(c, x0 + wx + (wx === 52 ? 0 : 0), yW + 18, 12, 14, { frame: W, glass: LI.glass, shutter: 'open', shutCol: LI.indigo, flowers: wx === 52 ? { leaf: LI.leaf, bloom: LI.pink } : null });
  doorBox(c, x0 + 90, B - 33, 20, 32, { ramp: W, iron: LI.iron, arch: false, frame: W, knob: R(LI.iron, 2), seed: 5 }); stepStone(c, x0 + 86, 28, B);
  carvedFrame(c, x0 + 92, B - 48, 16, 12);
  porch(c, x0 + 84, B - 38, 32, 33);
  herbs(c, x0 + 130, yW + 36); void herbs;
  eaveShadow(c, x0, yW, W_, 9);
  chimney(c, 28, 10, 70, 14, LI.stone, LI.shingle[0]);
  hipRoof(c, { xl: 0, xr: W_ + 16, yE: yW + 3, h: 54, inset: 40, ramp: T, mat: 'thatch', seed: 5, bundle: 9 });
  chimney(c, 28, 8, 48, 14, LI.stone, LI.shingle[0]); c.rect(25, 48, 20, 4, R(T, 1));
  c.outline(INK); return lframe('lio_house_nw', c, B);
}
/** Rumah NE (160x120): tanah liat oker, atap sirap kayu pinggul, gudang miring di samping. */
export function lioHouseNE() {
  const W_ = 160, c = new Canvas(W_ + 16, 150), B = 146, x0 = 8, wallH = 54, yW = B - wallH + 1;
  plasterWall(c, x0, yW, W_ - 34, wallH, { plaster: LI.ochre, tone: 2, seed: 17 });
  ashlar(c, x0, B - 8, W_ - 34, 9, { ramp: LI.stone, tone: 1, ch: 5, bw: [8, 14], seed: 9 }); c.hline(x0, B - 9, W_ - 34, R(LI.stone, 3));
  timberFrame(c, x0, yW, W_ - 34, wallH - 9, [0, 46, W_ - 38], false);
  windowBox(c, x0 + 14, yW + 16, 12, 14, { frame: W, glass: LI.glass, shutter: 'open', shutCol: LI.madder });
  windowBox(c, x0 + 86, yW + 16, 12, 14, { frame: W, glass: LI.glass, shutter: 'open', shutCol: LI.madder, flowers: { leaf: LI.leaf, bloom: LI.pale } });
  doorBox(c, x0 + 56, B - 32, 20, 31, { ramp: W, iron: LI.iron, frame: W, knob: R(LI.iron, 2), seed: 11 }); stepStone(c, x0 + 52, 28, B);
  // gudang kayu di kanan: dinding papan vertikal, atap miring satu sisi
  const sx = x0 + W_ - 34, sw = 36, sy = B - 36;
  planks(c, sx, sy, sw, 36, { ramp: W, vertical: true, bw: 5, tone: 2, seed: 21 });
  c.rect(sx + 6, B - 26, 18, 26, R(W, 0)); doorBox(c, sx + 7, B - 25, 16, 25, { ramp: W, iron: LI.iron, frame: W, seed: 22 }); void doorBox;
  c.poly([[sx - 3, sy + 2], [sx + sw + 3, sy + 2], [sx + sw + 3, sy - 14], [sx - 3, sy - 6]], (x, y) => R(LI.shingle, 2 + ((Math.floor((y + (x >> 3)) / 4) % 2) ? 0 : 0) - ((y - (sy - 14)) % 5 === 4 ? 2 : 0)));
  c.line(sx - 3, sy - 6, sx + sw + 3, sy - 14, R(LI.shingle, 4)); c.hline(sx - 3, sy + 2, sw + 7, R(LI.shingle, 0));
  eaveShadow(c, x0, yW, W_ - 34, 9);
  hipRoof(c, { xl: 0, xr: W_ - 18, yE: yW + 3, h: 54, inset: 34, ramp: LI.shingle, mat: 'wood', seed: 31, ch: 5, tw: 8 });
  chimney(c, 110, 14, 52, 13, LI.stone, LI.shingle[0]); c.rect(108, 52, 17, 3, R(LI.shingle, 1));
  c.outline(INK); return lframe('lio_house_ne', c, B);
}
/** Rumah SW (144x112): dinding balok mendatar, atap jerami rendah berlumut, serambi dan pasak jemur. */
export function lioHouseSW() {
  const W_ = 144, c = new Canvas(W_ + 16, 132), B = 128, x0 = 8, wallH = 48, yW = B - wallH + 1;
  planks(c, x0, yW, W_, wallH, { ramp: W, vertical: false, bw: 6, tone: 2, seed: 41 });
  for (let j = 0; j < wallH; j += 6) { c.hline(x0, yW + j, W_, R(W, 4)); for (const cx of [x0, x0 + W_ - 5]) { c.ellipse(cx + 2.5, yW + j + 2.5, 3.2, 3, R(W, 3)); c.set(cx + 2, yW + j + 2, R(W, 1)); } }
  ashlar(c, x0, B - 7, W_, 8, { ramp: LI.stone, tone: 1, ch: 4, bw: [8, 14], seed: 13 });
  for (const wx of [18, 100]) windowBox(c, x0 + wx, yW + 14, 12, 12, { frame: W, glass: LI.glass, shutter: 'closed', mullion: true });
  doorBox(c, x0 + 56, B - 31, 20, 30, { ramp: W, iron: LI.iron, frame: W, knob: R(LI.iron, 2), seed: 15 }); stepStone(c, x0 + 52, 28, B);
  porch(c, x0 + 48, B - 36, 36, 31);
  for (let i = 0; i < 4; i++) { c.rect(x0 + 118 + i * 6, yW + 28, 2, 6, R(W, 1)); } // pasak tempat menggantung perkakas
  c.rect(x0 + 116, yW + 36, 24, 10, R(W, 3)); c.hline(x0 + 116, yW + 36, 24, R(W, 4)); for (let i = 0; i < 4; i++) c.vline(x0 + 119 + i * 6, yW + 37, 8, R(LI.linen, 1));
  eaveShadow(c, x0, yW, W_, 8);
  hipRoof(c, { xl: 0, xr: W_ + 16, yE: yW + 3, h: 46, inset: 36, ramp: T, mat: 'thatch', seed: 51, bundle: 8 });
  for (const [mx, my, mw] of [[38, yW - 28, 22], [92, yW - 14, 16]]) for (let j = 0; j < 4; j++) for (let i = 0; i < mw; i++) if (hash(i, j, mx) > 0.25 && c.alpha(mx + i, my + j)) c.set(mx + i, my + j, R(LI.leaf, 1 + (j > 1 ? 0 : 1)));  // lumut di jerami
  c.outline(INK); return lframe('lio_house_sw', c, B);
}
/** Rumah SE (144x104): dasar batu, lantai atas kayu menjorok, atap sirap pelana menghadap depan, cerobong batu. */
export function lioHouseSE() {
  const W_ = 144, c = new Canvas(W_ + 16, 144), B = 140, x0 = 8, wallH = 44;
  const yW = B - wallH + 1;
  // lantai bawah: batu kasar
  ashlar(c, x0, yW + 16, W_, wallH - 15, { ramp: LI.stone, tone: 2, ch: 7, bw: [9, 17], seed: 61 });
  // lantai atas: papan vertikal menjorok 3 px
  planks(c, x0 - 3, yW - 14, W_ + 6, 30, { ramp: W, vertical: true, bw: 6, tone: 2, seed: 62 });
  c.rect(x0 - 3, yW + 14, W_ + 6, 3, R(W, 1)); c.hline(x0 - 3, yW + 14, W_ + 6, R(W, 3));
  windowBox(c, x0 + 22, yW - 4, 12, 12, { frame: W, glass: LI.glass, shutter: 'open', shutCol: LI.madder });
  windowBox(c, x0 + 108, yW - 4, 12, 12, { frame: W, glass: LI.glass, shutter: 'open', shutCol: LI.madder });
  windowBox(c, x0 + 66, yW - 4, 12, 12, { frame: W, glass: LI.glass, shutter: 'none' });
  windowBox(c, x0 + 20, yW + 24, 12, 12, { frame: W, glass: LI.glass, shutter: 'none', flowers: { leaf: LI.leaf, bloom: LI.lav } });
  doorBox(c, x0 + 90, B - 31, 20, 30, { ramp: W, iron: LI.iron, frame: W, knob: R(LI.iron, 2), seed: 63 }); stepStone(c, x0 + 86, 28, B);
  bandShade(c, x0, yW + 17, W_, 6, LI.shadow, 90, 'down');
  // atap pelana sirap + segitiga papan
  const ey = yW - 12;
  gableFront(c, { xl: 0, xr: W_ + 16, yE: ey, h: 56, ramp: LI.shingle, mat: 'wood', wallRamp: W, wallTone: 2, seed: 71, ch: 5, tw: 8, rake: 3 });
  // bubungan tertutup oleh dua bidang: isi bidang atap depan dengan sirap
  tilePlane(c, [[0, ey + 4], [W_ + 16, ey + 4], [W_ + 16 - 10, ey - 22], [10, ey - 22]], { ramp: LI.shingle, ch: 5, tw: 8, shift: 0, seed: 72, wood: true, y0: ey - 22 });
  c.rect(0, ey + 3, W_ + 16, 3, R(LI.shingle, 1)); c.hline(0, ey + 3, W_ + 16, R(LI.shingle, 3));
  windowBox(c, 80 - 6, ey - 46, 12, 14, { frame: W, glass: LI.glass, shutter: 'none', sill: false });  // jendela loteng di segitiga
  chimney(c, 118, 12, 86, 14, LI.stone, LI.shingle[0]);
  c.outline(INK); return lframe('lio_house_se', c, B);
}

export function lioWorkshop() { // bengkel bingkai Zira: meja kerja 96x32 + dua tiang + dua bingkai ukir berdiri
  const c = new Canvas(112, 108), B = 100;
  // tiang belakang dan balok
  for (const x of [6, 96]) { c.rect(x, B - 78, 5, 58, R(W, 2)); c.vline(x, B - 78, 58, R(W, 3)); c.vline(x + 4, B - 78, 58, R(W, 1)); }
  c.rect(4, B - 82, 104, 5, R(W, 2)); c.hline(4, B - 82, 104, R(W, 4)); c.hline(4, B - 78, 104, R(W, 0));
  // bingkai selesai bergantung di balok + perkakas di pasak
  const hang = (x, w, h, tone) => { c.vline(x + 2, B - 77, 8, R(LI.linen, 0)); c.vline(x + w - 3, B - 77, 8, R(LI.linen, 0)); carvedFrame(c, x, B - 70, w, h); void tone; };
  hang(14, 18, 22); hang(40, 12, 16); hang(70, 20, 18);
  for (let i = 0; i < 4; i++) { c.vline(58 + i * 6, B - 56, 1, R(W, 0)); c.rect(57 + i * 6, B - 55, 3, 11 - (i % 2) * 3, R(LI.iron, 1 + (i % 2))); c.rect(57 + i * 6, B - 46 - (i % 2) * 0, 3, 2, R(W, 3)); } // pahat tergantung
  // meja: permukaan atas 32 + muka depan
  planks(c, 4, B - 40, 104, 14, { ramp: W, vertical: false, bw: 5, tone: 3, seed: 81 }); c.hline(4, B - 40, 104, R(W, 4));
  planks(c, 6, B - 26, 100, 26, { ramp: W, vertical: true, bw: 7, tone: 2, seed: 82 }); c.hline(4, B - 27, 104, R(W, 1)); c.hline(6, B - 26, 100, R(W, 3));
  for (const x of [10, 98]) c.rect(x, B - 26, 4, 26, R(W, 1));
  c.rect(10, B - 14, 92, 2, R(W, 1)); // palang bawah
  // dua ukiran di atas meja (lambang retak, dua jalur mendekat)
  c.rect(20, B - 66, 28, 28, R(W, 4)); c.rect(22, B - 64, 24, 24, R(W, 3)); c.rect(24, B - 62, 20, 20, R(W, 2)); c.hline(20, B - 66, 28, R(W, 4)); c.vline(47, B - 66, 28, R(W, 1)); c.hline(20, B - 39, 28, R(W, 0));
  c.line(26, B - 50, 40, B - 52, R(W, 0)); c.line(34, B - 60, 31, B - 40, R(W, 0)); c.line(31, B - 52, 37, B - 56, R(W, 0)); c.ellipse(34, B - 52, 5, 5, R(W, 1)); c.ellipse(34, B - 52, 5, 5, (x, y) => (Math.hypot(x - 34, y - (B - 52)) > 3.5 ? R(W, 1) : null)); // lambang bundar dengan retak
  c.rect(58, B - 66, 28, 28, R(W, 4)); c.rect(60, B - 64, 24, 24, R(W, 3)); c.rect(62, B - 62, 20, 20, R(W, 2)); c.hline(58, B - 66, 28, R(W, 4)); c.vline(85, B - 66, 28, R(W, 1)); c.hline(58, B - 39, 28, R(W, 0));
  for (let t = 0; t < 12; t++) { c.set(63 + t, B - 44 - Math.round(t * 0.9), R(W, 0)); c.set(81 - t, B - 44 - Math.round(t * 0.9), R(W, 0)); } // dua jalur mendekat
  c.rect(70, B - 52, 4, 3, R(W, 2)); // bagian tengah aus
  // perkakas di meja: palu kayu, serutan
  c.rect(92, B - 46, 8, 4, R(W, 3)); c.rect(100, B - 48, 2, 10, R(W, 1)); c.rect(90, B - 41, 10, 2, R(T, 3)); c.set(87, B - 40, R(T, 4)); c.set(88, B - 40, R(T, 3));
  c.outline(INK); return lframe('lio_workshop', c, B);
}
