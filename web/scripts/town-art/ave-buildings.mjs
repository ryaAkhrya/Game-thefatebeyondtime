// Bangunan besar Aveloria: rumah 2, penginapan, arsip, tembok, gerbang, menara lonceng, fasad istana.
import { Canvas, hash } from './pixel.mjs';
import { ashlar, doorBox, windowBox, planks, bandShade, INK, R } from './kit.mjs';
import { hipRoof, chimney, plasterWall, eaveShadow, gableFront } from './buildings.mjs';
import { drawText, textWidth } from './font.mjs';
import { AV } from './ave-palette.mjs';
import { frame, banner, quoins, archedDoor, homeBase, plumAwning } from './ave-sprites.mjs';

const S = AV.stone;

function dormer(c, cx, yBase, w, h) {
  const x = cx - w / 2;
  c.rect(x, yBase - h + 10, w, h - 10, R(S, 3));
  windowBox(c, cx - 5, yBase - h + 14, 10, 12, { frame: AV.wood, glass: AV.glass, sill: false });
  for (let j = 0; j < 10; j++) { const hw = Math.round(w / 2 + 3 - (j * (w / 2 + 3)) / 10); for (let i = -hw; i <= hw; i++) c.set(cx + i, yBase - h + j, R(AV.slate, 2 + (i < -hw / 3 ? 1 : i > hw / 3 ? -1 : 0))); }
  c.line(cx - w / 2 - 3, yBase - h + 10, cx, yBase - h, R(AV.slate, 4)); c.line(cx + w / 2 + 3, yBase - h + 10, cx, yBase - h, R(AV.slate, 0));
  c.hline(x - 3, yBase - h + 10, w + 6, R(AV.slate, 0));
}

/** Rumah dua lantai (160x144): jendela atas, balkon kayu, dormer. */
export function avHome2() {
  const W = 160, { c, B, x0, yW } = homeBase(W, 70, 56, 23);
  ashlar(c, x0, B - 9, W, 10, { ramp: S, tone: 2, ch: 5, bw: [12, 18], seed: 8 }); c.hline(x0, B - 10, W, R(S, 4));
  quoins(c, x0, yW + 2, 66, 11, true); quoins(c, x0 + W - 11, yW + 2, 66, 11, false);
  const sc = yW + 34; c.rect(x0, sc, W, 3, R(S, 4)); c.hline(x0, sc, W, R(S, 5)); c.hline(x0, sc + 3, W, R(S, 1)); // balok pemisah lantai
  for (const wx of [30, 76, 122]) windowBox(c, x0 + wx, yW + 13, 12, 14, { frame: AV.wood, glass: AV.glass, shutter: 'open', shutCol: AV.teal });
  // balkon kayu di bawah jendela tengah atas
  c.rect(x0 + 66, sc + 3, 32, 3, R(AV.wood, 3)); c.hline(x0 + 66, sc + 6, 32, R(AV.wood, 0));
  for (let i = 0; i < 32; i += 4) c.vline(x0 + 67 + i, sc - 6, 6, R(AV.wood, 2));
  c.hline(x0 + 66, sc - 7, 32, R(AV.wood, 4));
  windowBox(c, x0 + 28, B - 40, 12, 14, { frame: AV.wood, glass: AV.glass, shutter: 'open', shutCol: AV.teal });
  c.rect(x0 + 15, B - 18, 22, 10, R(AV.iron, 0)); for (let i = 0; i < 22; i += 4) c.vline(x0 + 15 + i, B - 18, 10, R(AV.iron, 2)); c.rect(x0 + 13, B - 20, 26, 3, R(S, 4)); c.hline(x0 + 13, B - 20, 26, R(S, 5));
  for (const wx of [74, 112]) windowBox(c, x0 + wx, B - 40, 12, 14, { frame: AV.wood, glass: AV.glass, shutter: 'open', shutCol: AV.teal, flowers: wx === 112 ? { leaf: AV.grass, bloom: AV.rose } : null });
  windowBox(c, x0 + 136, B - 40, 12, 14, { frame: AV.wood, glass: AV.glass, shutter: 'none' });
  eaveShadow(c, x0, yW, W, 9);
  hipRoof(c, { xl: 0, xr: W + 16, yE: yW + 3, h: 56, inset: 44, ramp: AV.slate, seed: 15 });
  dormer(c, 92, yW + 6, 26, 28);
  chimney(c, 18, 6, 56, 13, S, AV.slate[0]); c.rect(16, 56, 17, 3, R(AV.slate, 1));
  c.outline(INK);
  return frame('ave_home2', c, B);
}

/** Penginapan (160x152): lantai bawah batu, atas plester, pintu kereta lengkung dan papan gantung. */
export function avInn() {
  const W = 160, wallH = 62, c = new Canvas(W + 40, wallH + 56 + 34), B = c.h - 4, x0 = 8, yW = B - wallH + 1;
  plasterWall(c, x0, yW, W, wallH - 28, { plaster: S, tone: 3, seed: 31 });
  ashlar(c, x0, B - 28, W, 29, { ramp: S, tone: 2, ch: 7, bw: [14, 22], seed: 6 });
  c.rect(x0, B - 30, W, 3, R(S, 4)); c.hline(x0, B - 30, W, R(S, 5)); c.hline(x0, B - 27, W, R(S, 1));
  quoins(c, x0, yW + 2, 32, 11, true); quoins(c, x0 + W - 11, yW + 2, 32, 11, false);
  for (const wx of [28, 74, 120]) windowBox(c, x0 + wx, yW + 12, 12, 14, { frame: AV.wood, glass: AV.glass, shutter: 'open', shutCol: AV.plum });
  { const x = x0 + 56, w = 48, h = 26, y = B - 36; // ceruk jendela ruang makan: tiga lengkung berkaca
    c.rect(x - 3, y - 4, w + 6, h + 6, R(S, 4)); c.hline(x - 3, y - 4, w + 6, R(S, 5)); c.vline(x - 3, y - 4, h + 6, R(S, 5)); c.vline(x + w + 2, y - 4, h + 6, R(S, 2));
    for (let k = 0; k < 3; k++) windowBox(c, x + 1 + k * 16, y, 14, h - 2, { frame: AV.wood, glass: AV.glass, arch: true, sill: false });
    c.rect(x - 5, y + h + 1, w + 10, 3, R(S, 5)); c.hline(x - 5, y + h + 3, w + 10, R(S, 2)); }
  for (const wx of [18, 130]) windowBox(c, x0 + wx, B - 22, 12, 12, { frame: AV.wood, glass: AV.glass, shutter: 'none', flowers: wx > 100 ? { leaf: AV.grass, bloom: AV.rose } : null });
  eaveShadow(c, x0, yW, W, 9);
  hipRoof(c, { xl: 0, xr: W + 16, yE: yW + 3, h: 58, inset: 50, ramp: AV.slate, seed: 41 });
  chimney(c, 120, 6, 52, 13, S, AV.slate[0]); c.rect(118, 52, 17, 3, R(AV.slate, 1));
  // lengan papan gantung di kanan: kotak plum dengan ikon tempat tidur dan tulisan INAP
  const bx = x0 + W + 2, by = yW + 14;
  c.rect(x0 + W - 1, by - 3, 29, 2, R(AV.iron, 1)); c.vline(x0 + W - 1, by - 3, 8, R(AV.iron, 1));
  c.vline(bx + 3, by - 1, 4, R(AV.iron, 2)); c.vline(bx + 24, by - 1, 4, R(AV.iron, 2));
  c.rect(bx, by + 3, 28, 17, R(AV.plum, 1)); c.hline(bx, by + 3, 28, R(AV.plum, 3)); c.vline(bx, by + 3, 17, R(AV.plum, 3)); c.hline(bx, by + 19, 28, R(AV.plum, 0)); c.vline(bx + 27, by + 3, 17, R(AV.plum, 0));
  drawText(c, bx + 8, by + 6, 'INAP', AV.cream);
  c.rect(bx + 5, by + 14, 18, 2, AV.cream); c.rect(bx + 5, by + 12, 6, 2, AV.cream); c.rect(bx + 5, by + 16, 2, 2, AV.cream); c.rect(bx + 21, by + 16, 2, 2, AV.cream);
  c.outline(INK);
  return frame('ave_inn', c, B, (x0 + W / 2) / c.w);
}

/** Arsip (288x136): fasad sipil dengan paviliun berpedimen, teras batu dan lentera atap. */
export function avArchive() {
  const W = 288, wallH = 56, c = new Canvas(W + 16, wallH + 22 + 56 + 30), B = c.h - 4, x0 = 8;
  const yWb = B - 22, yW = yWb - wallH + 1;      // dasar dinding berada 22 px di atas garis dasar (teras)
  // dinding batu halus
  ashlar(c, x0, yW, W, wallH, { ramp: S, tone: 3, ch: 7, bw: [14, 22], seed: 52 });
  ashlar(c, x0, yWb - 8, W, 9, { ramp: S, tone: 2, ch: 4, bw: [14, 22], seed: 53 });
  c.hline(x0, yWb - 9, W, R(S, 4));
  // teras: permukaan 14 px + muka 8 px
  for (let j = 0; j < 14; j++) for (let i = 0; i < W + 16; i++) c.set(i, yWb + 1 + j, R(S, 3 + (Math.floor((i + (j > 6 ? 8 : 0)) / 16) % 2 && j % 7 === 0 ? 0 : 0) - (j % 7 === 6 ? 1 : 0) - (i % 16 === 0 ? 1 : 0)));
  c.hline(0, yWb + 1, W + 16, R(S, 4));
  ashlar(c, 0, B - 7, W + 16, 8, { ramp: S, tone: 2, ch: 4, bw: [14, 20], seed: 54 }); c.hline(0, B - 8, W + 16, R(S, 4)); c.hline(0, B, W + 16, R(S, 0));
  // jendela lengkung tinggi
  const arcWin = (x) => { const y = yW + 14, w = 12, h = 28;
    c.rect(x - 3, y - 3, w + 6, h + 5, R(S, 4)); c.vline(x - 3, y - 3, h + 5, R(S, 5)); c.vline(x + w + 2, y - 3, h + 5, R(S, 2));
    windowBox(c, x, y, w, h, { frame: AV.wood, glass: AV.glass, arch: true, sill: false });
    c.rect(x - 4, y + h + 2, w + 8, 3, R(S, 5)); c.hline(x - 4, y + h + 4, w + 8, R(S, 2)); };
  for (const x of [20, 56]) { arcWin(x0 + x); arcWin(x0 + W - 12 - x); }
  // paviliun tengah
  const pc = x0 + W / 2, pw = 88, px = pc - pw / 2;
  c.rect(px, yW - 3, pw, wallH + 3 - 9, R(S, 4));
  ashlar(c, px + 8, yW, pw - 16, wallH - 9, { ramp: S, tone: 4, ch: 7, bw: [12, 18], seed: 55 });
  for (const sx of [px, px + pw - 10]) { // pilaster
    for (let j = yW - 3; j < yWb - 8; j++) for (let i = 0; i < 10; i++) c.set(sx + i, j, R(S, i === 0 ? 5 : i < 3 ? 4 : i > 7 ? 2 : 3));
    c.rect(sx - 2, yW - 5, 14, 4, R(S, 4)); c.hline(sx - 2, yW - 5, 14, R(S, 5)); c.hline(sx - 2, yW - 2, 14, R(S, 1));
    c.rect(sx - 2, yWb - 10, 14, 3, R(S, 4)); c.hline(sx - 2, yWb - 8, 14, R(S, 1)); }
  archedDoor(c, pc - 13, yWb - 38, 26, 38, yWb + 1, { seed: 21 });
  // papan nama di entablatur
  c.rect(px, yW - 12, pw, 8, R(S, 3)); c.hline(px, yW - 12, pw, R(S, 5)); c.hline(px, yW - 5, pw, R(S, 1));
  c.rect(pc - 18, yW - 11, 36, 7, R(AV.slate, 1)); drawText(c, pc - 14, yW - 10, 'ARSIP', R(S, 4));
  // spanduk plum dengan dua garis putus
  banner(c, px - 14, yW + 2, 34, 12); banner(c, px + pw + 3, yW + 2, 34, 12);
  // atap pinggul panjang
  eaveShadow(c, x0, yW - 2, W, 8);
  const yE = yW - 8;
  const g = hipRoof(c, { xl: 0, xr: W + 16, yE, h: 54, inset: 70, ramp: AV.slate, seed: 61 });
  // lentera/louvre di bubungan
  const lx = pc - 22, ly = g.yR - 15;
  c.rect(lx, ly, 44, 14, R(S, 3)); c.hline(lx, ly, 44, R(S, 5)); for (let i = 3; i < 42; i += 5) { c.rect(lx + i, ly + 3, 3, 9, R(AV.slate, 0)); c.vline(lx + i, ly + 3, 9, R(AV.slate, 1)); }
  for (let j = 0; j < 7; j++) c.hline(lx - 3 + j, ly - 7 + j, 50 - 2 * j, R(AV.slate, 2 + (j < 2 ? 1 : 0)));
  // pedimen paviliun di atas atap, dasar di garis cornice
  c.rect(px - 4, yE - 5, pw + 8, 5, R(S, 4)); c.hline(px - 4, yE - 5, pw + 8, R(S, 5)); c.hline(px - 4, yE - 1, pw + 8, R(S, 1));
  gableFront(c, { xl: px - 4, xr: px + pw + 4, yE: yE - 5, h: 26, ramp: S, mat: 'slate', wallRamp: S, wallTone: 3, seed: 71, rake: 2 });
  // lingkaran dengan dua garis putus pada tympanum
  c.ellipse(pc, yE - 14, 6, 6, R(AV.plum, 1)); for (let t = -4; t <= 3; t += 2) { c.set(pc - 2, yE - 14 + t, AV.rose); c.set(pc + 2, yE - 14 + t + 1, AV.lime); }
  c.outline(INK);
  return frame('ave_archive', c, B);
}

/** Tembok kota (448 lebar): muka 56 + puncak 16 + gigi benteng; variasi arah cahaya tetap. */
export function avWall(name, seed, bannerX) {
  const W = 448, c = new Canvas(W, 92), B = 88;
  ashlar(c, 0, B - 56, W, 57, { ramp: S, tone: 3, ch: 7, bw: [14, 22], seed });
  // puncak tembok (jalan patroli) 16 px dengan paving
  for (let j = 0; j < 16; j++) for (let i = 0; i < W; i++) c.set(i, B - 72 + j, R(S, 4 - (j > 12 ? 1 : 0) - (i % 14 === 0 ? 1 : 0) - (j % 8 === 7 ? 1 : 0)));
  c.hline(0, B - 57, W, R(S, 5)); c.hline(0, B - 56, W, R(S, 1));
  // gigi benteng di sisi belakang
  for (let x = 4; x < W - 10; x += 22) {
    for (let j = 0; j < 10; j++) for (let i = 0; i < 14; i++) c.set(x + i, B - 82 + j, R(S, j === 0 ? 5 : i === 0 ? 4 : i > 11 ? 2 : 3));
    c.hline(x, B - 73, 14, R(S, 1));
  }
  // celah panah (3 di setiap bentang) dan noda lembap di dasar
  for (let x = 40; x < W - 20; x += 66) { c.rect(x, B - 40, 3, 14, R(AV.slate, 0)); c.rect(x - 1, B - 41, 5, 1, R(S, 4)); c.rect(x - 1, B - 26, 5, 1, R(S, 1)); }
  for (let x = 0; x < W; x++) { const n = hash(Math.floor(x / 6), 1, seed); if (n > 0.55) for (let j = 0; j < 3 + Math.floor(n * 4); j++) c.set(x, B - j, R(AV.grass, 1 + (j > 3 ? 0 : 0)), 140); }
  if (bannerX != null) banner(c, bannerX, B - 52, 36, 12);
  bandShade(c, 0, B - 56, W, 7, AV.shadow, 90, 'down');
  c.outline(INK);
  return frame(name, c, B, 0.5);
}

/** Rumah gerbang: dua menara 48 lebar + jembatan lengkung; celah 128 lebar (transparan) tempat pemain lewat. */
export function avGatehouse() {
  const W = 240, c = new Canvas(W, 130), B = 126, tw = 48, ty = B - 106, passL = 56, passR = 184;
  const tower = (x) => { ashlar(c, x, ty, tw, 107, { ramp: S, tone: 3, ch: 7, bw: [12, 20], seed: 91 + x });
    c.rect(x - 2, ty - 4, tw + 4, 5, R(S, 4)); c.hline(x - 2, ty - 4, tw + 4, R(S, 5)); c.hline(x - 2, ty, tw + 4, R(S, 1));
    for (let i = 0; i < tw + 4; i += 12) { c.rect(x - 2 + i, ty - 11, 8, 7, R(S, 3)); c.hline(x - 2 + i, ty - 11, 8, R(S, 5)); c.vline(x - 2 + i + 7, ty - 11, 7, R(S, 1)); }
    c.rect(x + tw / 2 - 2, ty + 22, 4, 16, R(AV.slate, 0)); c.rect(x + tw / 2 - 3, ty + 21, 6, 1, R(S, 4));
    c.rect(x - 2, B - 9, tw + 4, 10, R(S, 2)); c.hline(x - 2, B - 9, tw + 4, R(S, 4)); };
  tower(8); tower(W - 8 - tw);
  // jembatan atas lengkung
  const top = B - 92;
  c.rect(8 + tw, top, passR - passL + 0, 92, R(S, 3));
  ashlar(c, 8 + tw, top, passR - passL, 92, { ramp: S, tone: 3, ch: 7, bw: [12, 20], seed: 97 });
  c.rect(8 + tw, top - 4, passR - passL, 5, R(S, 4)); c.hline(8 + tw, top - 4, passR - passL, R(S, 5));
  for (let i = 0; i < passR - passL; i += 14) { c.rect(8 + tw + i, top - 10, 8, 7, R(S, 3)); c.hline(8 + tw + i, top - 10, 8, R(S, 5)); }
  // lubang lengkung segmen: tinggi tepi 64, mahkota 76
  const cx = (passL + passR) / 2 + 0, half = (passR - passL) / 2 - 0;
  const crown = 76, spring = 64, cy = B + 1 - spring - 0, R2 = (half * half + (crown - spring) ** 2) / (2 * (crown - spring));
  const centerY = B + 1 - crown + R2;
  for (let j = 0; j <= B; j++) for (let i = passL; i < passR; i++) {
    const yy = j + 0.5, xx = i + 0.5;
    const inside = yy > B - spring - 0 ? true : Math.hypot(xx - cx - 0, yy - centerY) <= R2;
    if (yy >= B + 1 - crown && inside) c.d[(j * W + i) * 4 + 3] = 0;
  }
  void cy;
  // cincin lengkung (voussoir)
  for (let j = 0; j <= B; j++) for (let i = passL - 7; i < passR + 7; i++) {
    const yy = j + 0.5, xx = i + 0.5; if (yy >= B + 1 - spring) continue;
    const d = Math.hypot(xx - cx, yy - centerY);
    if (d > R2 && d <= R2 + 7 && c.alpha(i, j)) { const ang = Math.atan2(yy - centerY, xx - cx), joint = Math.abs(((ang * 180 / Math.PI + 360) % 9)) < 1.2; c.set(i, j, R(S, joint ? 2 : (i < cx ? 4 : 3))); }
  }
  for (let t = -2; t <= 1; t++) for (let j = 0; j < 7; j++) c.set(Math.round(cx) + t, B + 1 - crown - 7 + j, R(S, 5));
  // papan nama di atas lengkung
  c.rect(cx - 26, top + 6, 52, 11, R(AV.slate, 1)); c.hline(cx - 26, top + 6, 52, R(AV.slate, 3)); c.hline(cx - 26, top + 16, 52, R(AV.slate, 0));
  drawText(c, Math.round(cx - textWidth('AVELORIA') / 2), top + 9, 'AVELORIA', R(S, 4));
  banner(c, 8 + 18, ty + 36, 40, 12); banner(c, W - 8 - tw + 18, ty + 36, 40, 12);
  // bayang lengkung ke bawah
  for (let j = 0; j < 8; j++) for (let i = passL; i < passR; i++) if (c.alpha(i, B - crown + j - 1) === 0 && false) c.set(i, j, AV.shadow);
  c.outline(INK);
  return frame('ave_gatehouse', c, B);
}

/** Jeruji gerbang yang diturunkan (portcullis), 128x76. */
export function avPortcullis() {
  const c = new Canvas(128, 78), B = 74;
  for (let x = 4; x < 128; x += 9) { // jeruji kayu berujung besi
    for (let j = 6; j <= B; j++) { c.set(x, j, R(AV.wood, 3)); c.set(x + 1, j, R(AV.wood, 2)); c.set(x + 2, j, R(AV.wood, 1)); }
    c.set(x, B + 1, R(AV.iron, 3)); c.set(x + 1, B + 2, R(AV.iron, 3)); c.set(x + 1, B + 1, R(AV.iron, 2)); c.set(x + 2, B + 1, R(AV.iron, 1));
  }
  for (const y of [16, 38, 60]) { c.rect(0, y, 128, 3, R(AV.iron, 1)); c.hline(0, y, 128, R(AV.iron, 3)); c.hline(0, y + 2, 128, R(AV.iron, 0)); for (let x = 5; x < 128; x += 9) c.set(x + 1, y + 1, R(AV.bronze, 1)); }
  c.outline(INK);
  return frame('ave_portcullis', c, B);
}

/** Menara lonceng: 56 lebar, tinggi ~160. Jarum jam menunjuk pukul 9 (jarum jam ke kiri, menit ke atas). */
export function avTower() {
  const W = 60, c = new Canvas(W, 196), B = 192, cx = 30;
  // plinth + poros
  ashlar(c, 4, B - 44, 52, 45, { ramp: S, tone: 2, ch: 7, bw: [12, 18], seed: 101 });
  ashlar(c, 8, B - 112, 44, 69, { ramp: S, tone: 3, ch: 7, bw: [10, 16], seed: 103 });
  c.rect(5, B - 46, 50, 4, R(S, 4)); c.hline(5, B - 46, 50, R(S, 5)); c.hline(5, B - 43, 50, R(S, 1));
  // jam
  const clx = cx, cly = B - 78;
  c.ellipse(clx, cly, 14, 14, R(S, 5)); c.ellipse(clx, cly, 12, 12, AV.cream); c.ellipse(clx, cly, 12, 12, (x, y) => (x + y < clx + cly - 4 ? AV.linen : AV.cream));
  for (let a = 0; a < 12; a++) { const t = (a / 12) * Math.PI * 2; c.set(Math.round(clx + Math.sin(t) * 10), Math.round(cly - Math.cos(t) * 10), R(AV.slate, 0)); }
  c.line(clx, cly, clx - 6, cly, R(AV.slate, 0)); c.line(clx, cly - 1, clx - 6, cly - 1, R(AV.slate, 0)); // jarum jam ke pukul 9
  c.line(clx, cly, clx, cly - 9, R(AV.slate, 1));                                                        // jarum menit ke 12
  c.set(clx, cly, R(AV.bronze, 2));
  // ruang lonceng: tiga bukaan lengkung, bagian dalam gelap
  c.rect(6, B - 150 + 24, 48, 38, R(S, 3)); c.rect(5, B - 114, 50, 4, R(S, 4)); c.hline(5, B - 114, 50, R(S, 5)); c.hline(5, B - 111, 50, R(S, 1));
  for (let j = 0; j < 31; j++) for (let i = 0; i < 28; i++) { if (j < 14 && Math.hypot(i - 13.5, j - 14) > 14.5) continue; c.set(16 + i, B - 142 + j, R(AV.slate, j < 6 ? 0 : 0)); }
  for (let j = 0; j < 14; j++) for (let i = 0; i < 31; i++) { const d = Math.hypot(i - 15 - 0, j - 15.5); if (d > 14.5 && d <= 17.5 && j < 15) c.set(14 + i, B - 144 + j, R(S, i < 15 ? 4 : 3)); }
  c.vline(14, B - 129, 18, R(S, 4)); c.vline(15, B - 129, 18, R(S, 4)); c.vline(44, B - 129, 18, R(S, 2)); c.vline(45, B - 129, 18, R(S, 2));
  c.hline(14, B - 112, 32, R(S, 5));
  // bubungan piramida slate
  const top = B - 150, base = B - 146;
  const L = [[1, base + 2], [cx, top - 40], [cx, base + 2]], Rr = [[W - 2, base + 2], [cx, top - 40], [cx, base + 2]];
  const tile = (pts, sh) => { c.poly(pts, (x, y) => { const row = Math.floor((y - (top - 40)) / 5), w = 6, off = (row % 2) * 3, col = Math.floor((x + off) / w), within = (y - (top - 40)) % 5; let k = 2 + sh + (hash(col, row, 5) > 0.9 ? 1 : 0); if (within === 4) k -= 2; else if (within === 0) k += 1; if ((x + off) % w === 0) k -= 1; return R(AV.slate, k); }); };
  tile(L, 1); tile(Rr, -1);
  c.rect(2, base + 1, 56, 3, R(AV.slate, 1)); c.hline(2, base + 1, 56, R(AV.slate, 3));
  c.vline(cx, top - 46, 7, R(AV.iron, 2)); c.set(cx, top - 47, R(AV.bronze, 3));
  bandShade(c, 5, B - 112, 50, 8, AV.shadow, 90, 'down');
  c.outline(INK);
  return frame('ave_tower', c, B);
}

/** Lonceng perunggu (digantung di titik tengah-atas). */
export function avBell() {
  const c = new Canvas(20, 26);
  c.rect(9, 0, 2, 3, R(AV.iron, 1));
  for (let j = 0; j < 17; j++) { const hw = j < 4 ? 4 + j * 0.5 : 6 + (j - 4) * 0.35; for (let i = -Math.round(hw); i <= Math.round(hw); i++) c.set(10 + i, 3 + j, R(AV.bronze, i < -hw * 0.3 ? 3 : i > hw * 0.4 ? 1 : 2)); }
  c.rect(3, 19, 15, 2, R(AV.bronze, 3)); c.hline(3, 20, 15, R(AV.bronze, 0)); c.rect(9, 21, 3, 3, R(AV.iron, 2));
  c.outline(INK);
  return { name: 'ave_bell', c, pivot: { x: 0.5, y: 0 } };
}

/** Fasad istana (400x64): 6 jendela lengkung, pilaster, portal lengkung, spanduk. Pintu terpisah. */
export function avPalaceFacade() {
  const W = 400, c = new Canvas(W, 68), B = 64, cx = 200;
  ashlar(c, 0, 0, W, 65, { ramp: S, tone: 3, ch: 7, bw: [14, 22], seed: 111 });
  // koping puncak + dentil
  c.rect(0, 0, W, 6, R(S, 4)); c.hline(0, 0, W, R(S, 5)); c.hline(0, 5, W, R(S, 1));
  for (let x = 2; x < W; x += 6) c.rect(x, 6, 3, 3, R(S, 2));
  c.hline(0, 9, W, R(S, 1));
  // dasar
  c.rect(0, B - 7, W, 8, R(S, 2)); c.hline(0, B - 7, W, R(S, 4)); c.hline(0, B, W, R(S, 0));
  const arcWin = (x) => { const y = 14, w = 14, h = 30;
    c.rect(x - 3, y - 3, w + 6, h + 5, R(S, 4)); c.vline(x - 3, y - 3, h + 5, R(S, 5)); c.vline(x + w + 2, y - 3, h + 5, R(S, 2));
    windowBox(c, x, y, w, h, { frame: AV.wood, glass: AV.glass, arch: true, sill: false });
    c.rect(x - 4, y + h + 2, w + 8, 3, R(S, 5)); c.hline(x - 4, y + h + 4, w + 8, R(S, 2)); };
  for (const x of [24, 62, 100]) { arcWin(x); arcWin(W - 14 - x); }
  // pilaster di kedua sisi portal
  for (const sx of [cx - 56, cx + 46]) { for (let j = 8; j < B - 7; j++) for (let i = 0; i < 10; i++) c.set(sx + i, j, R(S, i === 0 ? 5 : i < 3 ? 4 : i > 7 ? 2 : 3)); c.rect(sx - 2, 8, 14, 3, R(S, 4)); c.hline(sx - 2, 10, 14, R(S, 1)); }
  // portal: bukaan 80 lebar, tinggi 56 (lengkung 40 radius), cincin batu
  const pw = 80, ph = 56, r = 40, centerY = B + 1 - ph + r;
  for (let j = 0; j <= B; j++) for (let i = cx - 48; i < cx + 48; i++) {
    const xx = i + 0.5, yy = j + 0.5; const d = Math.hypot(xx - cx, yy - centerY);
    const inHole = Math.abs(xx - cx) <= pw / 2 && (yy >= centerY || d <= r) && yy >= B + 1 - ph;
    if (inHole) { c.d[(j * W + i) * 4 + 3] = 0; continue; }
    if (yy < centerY ? (d > r && d <= r + 7) : (Math.abs(xx - cx) > pw / 2 && Math.abs(xx - cx) <= pw / 2 + 7)) {
      const ang = Math.atan2(yy - centerY, xx - cx), joint = yy < centerY && Math.abs(((ang * 180 / Math.PI + 360) % 11.25)) < 1.5;
      c.set(i, j, R(S, joint ? 2 : (xx < cx ? 4 : 3)));
    }
  }
  for (let t = -3; t <= 2; t++) for (let j = 0; j < 8; j++) c.set(cx + t, B + 1 - ph - 7 + j, R(S, 5));
  banner(c, cx - 78, 12, 38, 14); banner(c, cx + 64, 12, 38, 14);
  bandShade(c, 0, 9, W, 6, AV.shadow, 90, 'down');
  c.outline(INK);
  return frame('ave_palace_facade', c, B);
}

/** Pintu portal (80x56): tertutup = dua daun kayu berpita besi; terbuka = daun terlipat di sisi + bayang lorong. */
export function avPalaceDoor(open) {
  const c = new Canvas(80, 57), pw = 80, r = 40;
  const inside = (i, j) => j >= 56 - 56 && (j >= 40 - 0 + 0 - 40 + 40 ? true : Math.hypot(i + 0.5 - 40, j + 0.5 - 40) <= r);
  if (!open) {
    for (let j = 0; j < 56; j++) for (let i = 0; i < pw; i++) if (j >= 40 || Math.hypot(i + 0.5 - 40, j + 0.5 - 40) <= r) c.set(i, j, [0, 0, 0]);
    // isi daun
    const mask = new Canvas(80, 57); mask.d.set(c.d); c.d.fill(0);
    planks(c, 0, 0, 80, 56, { ramp: AV.wood, vertical: true, bw: 5, tone: 2, seed: 33 });
    for (let j = 0; j < 57; j++) for (let i = 0; i < 80; i++) if (!mask.alpha(i, j)) c.d[(j * 80 + i) * 4 + 3] = 0;
    c.vline(39, 0, 56, R(AV.wood, 0)); c.vline(40, 0, 56, R(AV.wood, 0));
    for (const y of [16, 34, 50]) { c.rect(0, y, 80, 3, R(AV.iron, 1)); c.hline(0, y, 80, R(AV.iron, 3)); c.hline(0, y + 2, 80, R(AV.iron, 0)); for (let x = 5; x < 80; x += 10) c.set(x, y + 1, R(AV.iron, 3)); }
    for (const x of [33, 45]) { c.ellipse(x, 40, 3, 3, R(AV.bronze, 2)); c.ellipse(x, 40, 1.5, 1.5, R(AV.bronze, 0)); }
    c.outline(INK);
  } else {
    // daun terbuka ke dalam: dua pita sempit di tepi, lorong gelap dengan gradasi
    for (let j = 0; j < 56; j++) for (let i = 0; i < pw; i++) if (j >= 40 || Math.hypot(i + 0.5 - 40, j + 0.5 - 40) <= r) {
      const edge = i < 7 || i >= pw - 7;
      if (edge) c.set(i, j, R(AV.wood, i < 7 ? (i % 3 === 0 ? 1 : 2) : (i % 3 === 0 ? 0 : 1)));
      else if (j < 26) c.set(i, j, AV.shadow, 150 * (1 - j / 26) + 20);
    }
  }
  void inside;
  return { name: open ? 'ave_palace_door_open' : 'ave_palace_door', c, pivot: { x: 0.5, y: 1 } };
}
