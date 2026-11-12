// Tempat penampungan warga di luar tembok Aveloria (Chapter IV, C4-07): tenda, tikar, orang duduk/tidur, api masak, meja daftar, papan daftar.
// DRAFT / NEEDS_REVIEW, code-native. Palet AV tertutup, outline 1 px, cahaya kiri-atas. Rasa lega yang letih, bukan pesta.
import { Canvas, H, rng, hash, vnoise } from './pixel.mjs';
import { AV } from './ave-palette.mjs';
import { R, INK } from './kit.mjs';
import { drawText, textWidth } from './font.mjs';
import { fr, frC, rock } from './c4-props.mjs';

const W_ = AV.wood, S = AV.stone;
const tri = (a, b, c) => [H(a), H(b), H(c)];
const SKIN = { a: tri('#8a6149', '#b58a67', '#d2a87f'), b: tri('#7a5340', '#a3745a', '#c28f6e'), c: tri('#9b7458', '#c79a74', '#e0b891') };
const HAIR = { dark: tri('#2a1d19', '#43302a', '#624636'), black: tri('#1d1625', '#2f2a38', '#4a4455'), grey: tri('#6d6d77', '#908f93', '#b4b1aa'), auburn: tri('#4a2a22', '#7a4630', '#a5663f'), blond: tri('#85603f', '#a98355', '#d0b070') };
const cl = (r, i) => [R(r, i), R(r, i + 1), R(r, i + 2)];
const CLOTH = { teal: cl(AV.teal, 0), earth: cl(AV.earth, 0), plum: cl(AV.plum, 1), slate: cl(AV.slate, 1), grass: cl(AV.grass, 1), stone: cl(AV.stone, 2), rose: [H('#7a4350'), H('#a15a66'), H('#c97b84')], mustard: [H('#7a5a2c'), H('#a87d3c'), H('#c98b3c')], linen: [H('#a89d85'), H('#c9bfa6'), H('#e4dac3')] };
const SHADOW = AV.shadow;

function box(c, x, y, w, h, t) { c.rect(x, y, w, h, t[1]); c.vline(x, y, h, t[2]); c.hline(x, y, w, t[2]); c.vline(x + w - 1, y, h, t[0]); c.hline(x, y + h - 1, w, t[0]); }
const flatShadow = (c, cx, y, rx) => c.ellipse(cx, y, rx, 2.2, SHADOW, 110);

// ---------------------------------------------------------------------------------------------------------------------
// Tenda
// ---------------------------------------------------------------------------------------------------------------------

/** Tenda kain berpelana (pelana menghadap pemain), pintu terbuka gelap, tali dan patok. 76x62, kaki di y=56. */
export function tentA() {
  const c = new Canvas(76, 62), B = 56;
  flatShadow(c, 40, B + 2, 34);
  // sisi belakang (bidang atap kanan, lebih gelap) lalu muka pelana
  c.poly([[32, 6], [70, 14], [70, 46], [58, B]], (x, y) => (((x + y * 2) % 11) === 0 ? R(AV.stone, 1) : CLOTH.linen[0]));
  c.poly([[32, 6], [4, B], [58, B]], (x, y) => { const lx = (x - 32) / 28; let k = lx < -0.25 ? 2 : lx < 0.35 ? 1 : 0; if (((x + y * 2) % 13) === 0) k = Math.max(0, k - 1); return CLOTH.linen[k]; });
  // tambalan plum dan noda
  c.rect(22, 34, 9, 8, R(AV.plum, 2)); c.hline(22, 34, 9, R(AV.plum, 3)); c.vline(22, 34, 8, R(AV.plum, 3)); c.hline(22, 41, 9, R(AV.plum, 1));
  for (let k = 0; k < 4; k++) { c.set(24 + k * 2, 34, R(AV.cream, 4)); c.set(24 + k * 2, 41, R(AV.cream, 4)); }
  c.rect(40, 20, 6, 5, R(AV.earth, 1)); // noda lumpur
  // pintu terbuka (segitiga gelap) dengan dua lipatan kain di sisinya
  c.poly([[32, 22], [24, B], [40, B]], R(AV.slate, 0));
  c.poly([[32, 22], [26, B], [29, B]], CLOTH.linen[2]); c.poly([[32, 22], [38, B], [41, B]], CLOTH.linen[0]);
  c.poly([[32, 30], [28, B], [36, B]], R(AV.slate, 1));
  // tiang bubungan menonjol, tali ke patok
  c.vline(32, 1, 6, R(W_, 3)); c.set(32, 0, R(W_, 4));
  for (const [x0, y0, x1, y1] of [[10, 40, 1, B + 1], [54, 40, 66, B + 1], [70, 30, 74, B]]) c.line(x0, y0, x1, y1, R(AV.earth, 2));
  for (const x of [1, 66, 74]) { c.rect(x, B - 1, 2, 3, R(W_, 3)); }
  c.outline(INK);
  return fr('c4_tent_a', c, B);
}

/** Tenda miring (terpal teal) di atas dua tiang, dinding belakang gelap. 60x48, kaki y=42. */
export function tentB() {
  const c = new Canvas(60, 48), B = 42;
  flatShadow(c, 30, B + 2, 26);
  c.rect(6, 14, 46, 28, R(AV.slate, 0)); c.hline(6, 14, 46, R(AV.slate, 1));
  // alas tidur di dalam
  c.rect(12, 34, 32, 7, R(AV.earth, 1)); c.hline(12, 34, 32, R(AV.earth, 2)); c.rect(14, 31, 8, 4, CLOTH.linen[1]);
  // terpal miring
  c.poly([[2, 18], [14, 4], [54, 4], [58, 24], [4, 30]], (x, y) => { const lx = (x - 2) / 56; let k = 2 - (y - 4) / 12 * 0.6 + (lx < 0.3 ? 1 : 0); if (((x + y * 3) % 17) === 0) k -= 1; return R(AV.teal, Math.round(k)); });
  c.hline(14, 4, 40, R(AV.teal, 3)); c.line(2, 18, 14, 4, R(AV.teal, 3)); c.hline(4, 30, 54, R(AV.teal, 0));
  c.poly([[22, 12], [30, 12], [29, 20], [23, 20]], R(AV.earth, 2)); c.hline(22, 12, 8, R(AV.earth, 3)); // tambalan
  for (const x of [6, 52]) { c.rect(x, 28, 3, 15, R(W_, 2)); c.vline(x, 28, 15, R(W_, 4)); c.vline(x + 2, 28, 15, R(W_, 1)); }
  c.outline(INK);
  return fr('c4_tent_b', c, B);
}

/** Tenda kecil berpelana dari terpal teal tua dengan pintu terbuka dan bubungan kayu. 50x38, kaki y=34. */
export function tentC() {
  const c = new Canvas(50, 38), B = 34;
  flatShadow(c, 26, B + 1, 22);
  c.poly([[22, 6], [46, 12], [46, 30], [38, B]], (x, y) => (((x + y * 2) % 11) === 0 ? R(AV.teal, 0) : R(AV.teal, 0)));
  c.poly([[22, 6], [4, B], [38, B]], (x, y) => { const lx = (x - 22) / 18; let k = lx < -0.2 ? 3 : lx < 0.4 ? 2 : 1; if (((x + y * 2) % 13) === 0) k = Math.max(0, k - 1); return R(AV.teal, k); });
  c.poly([[22, 16], [16, B], [28, B]], R(AV.slate, 0));
  c.poly([[22, 16], [18, B], [20, B]], R(AV.teal, 3)); c.poly([[22, 16], [26, B], [28, B]], R(AV.teal, 1));
  c.rect(10, 26, 5, 4, R(AV.earth, 2)); c.hline(10, 26, 5, R(AV.earth, 3));
  c.vline(22, 1, 6, R(W_, 3)); c.set(22, 0, R(W_, 4));
  for (const [x0, y0, x1, y1] of [[6, 28, 0, B + 1], [40, 26, 48, B + 1]]) c.line(x0, y0, x1, y1, R(AV.earth, 2));
  c.outline(INK);
  return fr('c4_tent_c', c, B);
}

// ---------------------------------------------------------------------------------------------------------------------
// Tikar, orang duduk, orang tidur
// ---------------------------------------------------------------------------------------------------------------------

function mat(name, col, seed, w = 38, h = 18) {
  const c = new Canvas(w, h), rand = rng(seed);
  c.poly([[2, 3], [w - 2, 1], [w - 1, h - 3], [1, h - 1]], (x, y) => { let k = 2 + (y < 6 ? 1 : 0) - (y > h - 5 ? 1 : 0); if (((x * 2 + y) % 7) === 0) k -= 1; return R(AV.earth, k); });
  // selimut digulung di salah satu ujung + ikatan
  box(c, 3, 4, 11, h - 9, CLOTH[col]); c.vline(8, 4, h - 9, CLOTH[col][0]); c.vline(11, 4, h - 9, R(AV.earth, 1));
  for (let k = 0; k < 3; k++) c.set(18 + Math.floor(rand() * 12), 5 + Math.floor(rand() * (h - 10)), R(AV.earth, 1));
  c.outline(INK);
  return fr(name, c, h - 2);
}

/** Satu orang duduk menghadap depan, berselimut. ox,oy = sudut kiri-atas area 16x24 */
function seatedPerson(c, ox, oy, o) {
  const skin = SKIN[o.skin], hair = HAIR[o.hair], tun = CLOTH[o.cloth], bl = o.blanket ? CLOTH[o.blanket] : null;
  // kaki ditekuk di depan
  box(c, ox + 1, oy + 16, 14, 6, [R(AV.slate, 0), R(AV.slate, 1), R(AV.slate, 2)]);
  c.rect(ox + 1, oy + 21, 5, 3, R(AV.wood, 1)); c.rect(ox + 10, oy + 21, 5, 3, R(AV.wood, 1));
  // badan
  box(c, ox + 2, oy + 8, 12, 10, tun);
  // kepala
  box(c, ox + 4, oy + 1, 8, 8, skin);
  c.set(ox + 6, oy + 5, R(AV.slate, 0)); c.set(ox + 10, oy + 5, R(AV.slate, 0));
  c.rect(ox + 4, oy, 8, 3, hair[1]); c.hline(ox + 5, oy, 6, hair[2]); c.vline(ox + 4, oy + 1, 4, hair[2]); c.vline(ox + 11, oy + 1, 4, hair[0]);
  if (o.bun) { c.rect(ox + 6, oy - 2, 4, 3, hair[1]); c.hline(ox + 6, oy - 2, 4, hair[2]); }
  // selimut di bahu: menutup bahu, miring ke bawah di depan dada
  if (bl) { c.poly([[ox + 1, oy + 8], [ox + 15, oy + 8], [ox + 14, oy + 18], [ox + 2, oy + 18]], bl[1]); c.hline(ox + 2, oy + 8, 12, bl[2]); c.vline(ox + 1, oy + 9, 9, bl[2]); c.vline(ox + 14, oy + 9, 9, bl[0]); for (let k = 0; k < 4; k++) c.set(ox + 4 + k * 3, oy + 12 + (k % 2), bl[0]); }
  // tangan memegang mangkuk atau lutut
  c.rect(ox + 4, oy + 16, 3, 2, skin[1]); c.rect(ox + 10, oy + 16, 3, 2, skin[1]);
  if (o.bowl) { c.rect(ox + 6, oy + 17, 5, 3, R(AV.earth, 2)); c.hline(ox + 6, oy + 17, 5, R(AV.earth, 3)); }
}

/** Dua orang duduk berdekatan (satu selimut), menghadap api. 38x28, kaki y=25. */
export function sitGroup(name, a, b, seed) {
  const c = new Canvas(38, 28), B = 25;
  flatShadow(c, 19, B + 1, 17);
  seatedPerson(c, 3, 1, a); seatedPerson(c, 19, 2, b);
  void seed;
  c.outline(INK);
  return fr(name, c, B);
}
export function sitGroups() {
  return [
    sitGroup('c4_sit_a', { skin: 'a', hair: 'blond', cloth: 'grass', blanket: 'plum' }, { skin: 'c', hair: 'black', cloth: 'rose', blanket: 'plum', bun: true, bowl: true }, 1),
    sitGroup('c4_sit_b', { skin: 'b', hair: 'grey', cloth: 'stone', blanket: 'teal', bowl: true }, { skin: 'a', hair: 'dark', cloth: 'earth', blanket: 'teal' }, 2),
    sitGroup('c4_sit_c', { skin: 'c', hair: 'auburn', cloth: 'mustard', blanket: 'earth', bun: true }, { skin: 'b', hair: 'black', cloth: 'teal', blanket: 'earth', bowl: true }, 3),
  ];
}

/** Orang tidur di atas tikar, berselimut sampai bahu; kepala di kiri. 44x20, kaki y=17. */
export function sleeper(name, cloth, hairKey, skinKey, seed) {
  const c = new Canvas(44, 20), B = 17, rand = rng(seed);
  flatShadow(c, 22, B + 1, 20);
  c.poly([[2, 5], [42, 3], [43, 17], [1, 18]], (x, y) => R(AV.earth, 2 + (y < 8 ? 1 : 0) - (y > 15 ? 1 : 0) - (((x * 2 + y) % 7) === 0 ? 1 : 0)));
  // bantal + kepala
  box(c, 3, 6, 9, 8, CLOTH.linen);
  const skin = SKIN[skinKey], hair = HAIR[hairKey];
  c.ellipse(8, 10, 3.5, 3.5, skin[1]); c.hline(5, 8, 6, hair[1]); c.rect(4, 8, 2, 4, hair[1]); c.set(7, 10, R(AV.slate, 0));
  // selimut: gundukan tubuh, tonjolan lutut dan kaki, lipatan
  c.poly([[13, 5], [34, 5], [41, 8], [41, 16], [13, 16]], (x, y) => { let k = 1 + (y < 8 ? 1 : 0) - (y > 13 ? 1 : 0) + (x < 18 ? 1 : 0); if (((x + y * 2) % 9) === 0) k -= 1; return CLOTH[cloth][Math.max(0, Math.min(2, k))]; });
  c.hline(13, 5, 28, CLOTH[cloth][2]); c.vline(13, 5, 11, CLOTH[cloth][2]);
  for (const x of [22, 29]) { c.vline(x, 7, 7, CLOTH[cloth][0]); }
  c.poly([[36, 9], [40, 9], [41, 11], [36, 12]], CLOTH[cloth][2]);
  void rand;
  c.outline(INK);
  return fr(name, c, B);
}
export function sleepers() { return [sleeper('c4_sleeper_a', 'plum', 'dark', 'a', 1), sleeper('c4_sleeper_b', 'teal', 'grey', 'b', 2)]; }

// ---------------------------------------------------------------------------------------------------------------------
// Api masak, meja daftar, papan daftar, karung/peti, patok tikar
// ---------------------------------------------------------------------------------------------------------------------

/** Api masak: cincin batu, kayu bakar, panci besi digantung pada tripod. 3 pose api. 36x44, kaki y=40. */
function cookfire(i) {
  const c = new Canvas(36, 44), B = 40;
  flatShadow(c, 18, B, 15);
  // tripod: tiga kayu, panci
  c.line(8, B - 4, 18, 4, R(W_, 3)); c.line(28, B - 4, 18, 4, R(W_, 2)); c.line(18, B - 10, 18, 4, R(W_, 3));
  c.line(18, 5, 18, 14, R(AV.iron, 2));
  c.ellipse(18, 19, 7, 6, (x, y) => R(AV.iron, (x - 18) + (y - 19) < -3 ? 3 : (x - 18) + (y - 19) > 3 ? 1 : 2)); c.hline(12, 15, 13, R(AV.iron, 3)); c.ellipse(18, 15, 6, 1.5, R(AV.slate, 0));
  // cincin batu
  const ring = [[6, 33], [11, 37], [18, 39], [25, 37], [30, 33], [27, 30], [9, 30]];
  for (const [x, y] of ring) { const r = rock(7, 5, x * 3 + y, S, 2); c.blit(r, x - 4, y - 3); }
  // kayu bakar bersilang
  c.line(11, 34, 25, 31, R(W_, 2)); c.line(11, 31, 25, 35, R(W_, 1)); c.set(11, 34, R(W_, 3));
  // api: tiga pose kecil, warna bara (bukan emas retakan)
  const pose = [[[17, 24], [17, 26], [16, 28], [17, 29], [18, 29], [19, 27], [18, 25]], [[18, 25], [17, 27], [17, 29], [19, 29], [19, 27], [19, 26]], [[16, 26], [17, 27], [16, 29], [18, 29], [19, 28], [18, 26]]][i];
  for (const [x, y] of pose) { c.set(x, y + 3, AV.squash); c.set(x, y + 4, AV.tomato); }
  c.rect(15, 33, 6, 2, AV.tomato); c.set(17, 32, AV.squash); c.set(18, 33, [242, 208, 130]); c.set(16 + (i % 2), 31, AV.squash);
  c.outline(INK);
  return fr(`c4_cookfire_${i}`, c, B);
}
export function cookfires() { return [0, 1, 2].map(cookfire); }

/** Meja kecil Azie: buku catatan terbuka, tinta, pena bulu, tumpukan lembar, batu penindih. 56x38, kaki y=34. */
export function tableLedger() {
  const c = new Canvas(56, 38), B = 34;
  flatShadow(c, 28, B + 1, 25);
  for (const x of [4, 48]) { c.rect(x, 20, 4, 14, R(W_, 2)); c.vline(x, 20, 14, R(W_, 3)); c.vline(x + 3, 20, 14, R(W_, 1)); }
  c.poly([[1, 14], [54, 14], [56, 22], [0, 22]], (x, y) => R(W_, 3 + (y < 16 ? 1 : 0) - (y > 20 ? 1 : 0) - (((x * 5 + y) % 13) === 0 ? 1 : 0)));
  c.hline(1, 14, 54, R(W_, 4)); c.hline(0, 22, 56, R(W_, 0));
  // buku catatan terbuka
  c.poly([[12, 8], [28, 8], [28, 16], [10, 16]], AV.linen); c.poly([[28, 8], [44, 8], [46, 16], [28, 16]], AV.cream); c.vline(28, 8, 9, R(S, 2));
  for (const [x, w] of [[13, 13], [31, 12]]) for (const y of [10, 12, 14]) c.hline(x, y, w - 1, R(AV.slate, 2));
  c.hline(10, 16, 36, R(AV.plum, 2));
  // pena + tinta + tumpukan lembar dan batu penindih
  c.rect(48, 9, 4, 5, AV.glass[0]); c.hline(48, 9, 4, AV.glass[2]); c.line(49, 9, 53, 2, AV.cream); c.set(53, 1, AV.cream);
  c.rect(2, 8, 8, 6, AV.linen); c.hline(2, 8, 8, AV.cream); c.hline(2, 13, 8, R(S, 1)); c.rect(5, 6, 4, 3, R(S, 3)); c.hline(5, 6, 4, R(S, 5));
  c.outline(INK);
  return fr('c4_table_ledger', c, B);
}

/** Papan daftar warga: dua tiang, papan kayu, lembar daftar dipaku dengan centang kecil, plakat "DAFTAR". 52x58, kaki y=54. */
export function rosterBoard() {
  const c = new Canvas(52, 58), B = 54;
  flatShadow(c, 26, B + 1, 22);
  for (const x of [5, 43]) { c.rect(x, 12, 4, B - 11, R(W_, 2)); c.vline(x, 12, B - 11, R(W_, 4)); c.vline(x + 3, 12, B - 11, R(W_, 1)); }
  c.rect(3, B - 3, 8, 3, R(S, 3)); c.hline(3, B - 3, 8, R(S, 5)); c.rect(41, B - 3, 8, 3, R(S, 3)); c.hline(41, B - 3, 8, R(S, 5));
  c.rect(2, 14, 48, 28, R(W_, 2)); c.hline(2, 14, 48, R(W_, 4)); c.vline(2, 14, 28, R(W_, 3)); c.hline(2, 41, 48, R(W_, 0)); c.vline(49, 14, 28, R(W_, 1));
  for (const y of [22, 30]) c.hline(3, y, 46, R(W_, 1));
  // plakat judul
  const tw = textWidth('DAFTAR') + 6;
  c.rect(26 - Math.floor(tw / 2), 3, tw, 10, R(AV.slate, 1)); c.hline(26 - Math.floor(tw / 2), 3, tw, R(AV.slate, 3));
  drawText(c, 26 - Math.floor(tw / 2) + 3, 5, 'DAFTAR', AV.cream, R(AV.slate, 0));
  // lembar daftar dipaku: tiga lembar dengan baris dan centang
  for (const [x, y, w, h] of [[5, 17, 12, 20], [20, 16, 12, 22], [35, 18, 12, 19]]) {
    c.rect(x, y, w, h, AV.linen); c.hline(x, y, w, AV.cream); c.vline(x, y, h, AV.cream); c.hline(x, y + h - 1, w, R(S, 2)); c.vline(x + w - 1, y, h, R(S, 2));
    for (let r = 3; r < h - 2; r += 4) { c.hline(x + 2, y + r, w - 7, R(AV.slate, 2)); c.set(x + w - 4, y + r, AV.leaf); c.set(x + w - 3, y + r - 1, AV.leaf); }
    c.set(x + Math.floor(w / 2), y - 1, R(AV.iron, 2));
  }
  c.outline(INK);
  return fr('c4_roster_board', c, B);
}

/** Karung biji dan peti persediaan bersusun. 52x34, kaki y=31. */
export function supplies() {
  const c = new Canvas(52, 34), B = 31;
  flatShadow(c, 26, B + 1, 24);
  const sack = (x, y, w, h, col) => { box(c, x, y, w, h, col); c.rect(x + 2, y - 3, w - 4, 4, col[1]); c.hline(x + 2, y - 3, w - 4, col[2]); c.hline(x + 3, y + 3, w - 6, col[0]); c.set(x + (w >> 1), y - 4, col[0]); };
  sack(2, B - 14, 14, 15, CLOTH.linen); sack(17, B - 12, 13, 13, CLOTH.stone); sack(8, B - 27, 13, 13, CLOTH.mustard);
  box(c, 32, B - 16, 18, 17, [R(W_, 1), R(W_, 2), R(W_, 4)]); c.hline(33, B - 9, 16, R(W_, 1)); c.vline(41, B - 15, 15, R(W_, 1)); c.set(35, B - 12, AV.tomato); c.set(44, B - 5, AV.leaf);
  c.outline(INK);
  return fr('c4_supplies', c, B);
}

// ---------------------------------------------------------------------------------------------------------------------
// Tanah tempat tinggal darurat: rumput terinjak, jerami, jejak
// ---------------------------------------------------------------------------------------------------------------------
function campGround(name, w, h, seed) {
  const c = new Canvas(w, h), cx = w / 2, cy = h / 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (x + 0.5 - cx) / (w / 2), dy = (y + 0.5 - cy) / (h / 2), d = Math.hypot(dx, dy) + (vnoise(x * 0.12, y * 0.15, seed) - 0.5) * 0.45;
    if (d > 1) continue;
    if (d > 0.78 && hash(x, y, seed + 2) < (d - 0.78) * 4.5) continue;
    let k = 1 + vnoise(x * 0.4, y * 0.4, seed + 1) * 1.6;
    if (hash(x >> 1, y >> 1, seed + 4) > 0.88) k -= 1;
    c.set(x, y, R(AV.earth, Math.round(k)));
    if (d < 0.7 && hash(x, y, seed + 7) > 0.985) c.set(x, y, R(AV.grass, 1));
  }
  const rand = rng(seed + 9);
  for (let k = 0; k < Math.round(w / 9); k++) { // jerami: goresan 3 px
    const x = Math.floor(6 + rand() * (w - 14)), y = Math.floor(4 + rand() * (h - 8));
    if (c.alpha(x, y) && c.alpha(x + 3, y)) { c.hline(x, y, 3, R(AV.earth, 3)); c.set(x + 1, y + 1, R(AV.earth, 3)); }
  }
  return frC(name, c);
}
export function campGrounds() { return [campGround('c4_camp_ground_a', 132, 72, 3), campGround('c4_camp_ground_b', 96, 56, 4), campGround('c4_camp_ground_c', 72, 44, 5)]; }

export function campFrames() {
  return [tentA(), tentB(), tentC(), mat('c4_mat_a', 'plum', 1), mat('c4_mat_c', 'mustard', 3), ...sitGroups(), ...sleepers(), ...cookfires(), tableLedger(), rosterBoard(), supplies(), ...campGrounds()];
}
void H;
