// Warga/bangsawan/penjaga tak bernama untuk krisis Aveloria (sel 32x48, kaki di y=46, pivot (0.5, 47/48)).
// Sprite DRAFT code-native, BUKAN identitas karakter bernama. Arah: down, side (menghadap kanan; kiri = flipX di runtime), up.
// Per varian: idle 2 frame (napas: kepala/bahu turun 1 px, kaki tetap) + jalan 4 frame. Palet tertutup, outline 1 px.
import { Canvas, H } from './pixel.mjs';
import { AV } from './ave-palette.mjs';
import { R, INK } from './kit.mjs';
import { GOLD } from './crisis-props.mjs';

const tri = (a, b, c) => [H(a), H(b), H(c)];
const SKIN = { a: tri('#8a6149', '#b58a67', '#d2a87f'), b: tri('#7a5340', '#a3745a', '#c28f6e'), c: tri('#9b7458', '#c79a74', '#e0b891') };
const HAIR = { dark: tri('#2a1d19', '#43302a', '#624636'), black: tri('#1d1625', '#2f2a38', '#4a4455'), grey: tri('#6d6d77', '#908f93', '#b4b1aa'), auburn: tri('#4a2a22', '#7a4630', '#a5663f'), blond: tri('#85603f', '#a98355', '#d0b070') };
const cl = (r, i) => [R(r, i), R(r, i + 1), R(r, i + 2)];
const CLOTH = { teal: cl(AV.teal, 0), earth: cl(AV.earth, 0), plum: cl(AV.plum, 1), slate: cl(AV.slate, 1), grass: cl(AV.grass, 1), wood: cl(AV.wood, 1), stone: cl(AV.stone, 2), rose: [H('#7a4350'), H('#a15a66'), H('#c97b84')], mustard: [H('#7a5a2c'), H('#a87d3c'), H('#c98b3c')], linen: [H('#a89d85'), H('#c9bfa6'), H('#e4dac3')] };
const BOOT = [R(AV.wood, 0), R(AV.wood, 1), R(AV.wood, 2)];
const TROUSER = { dark: cl(AV.slate, 0), brown: cl(AV.wood, 0), grey: cl(AV.iron, 0), earth: cl(AV.earth, 0) };

export const VARIANTS = [
  { id: 'porter', skin: 'a', hair: 'dark', style: 'short', tunic: 'teal', pants: 'brown', carry: 'crate' },
  { id: 'vendor', skin: 'c', hair: 'auburn', style: 'bun', tunic: 'mustard', pants: 'dark', apron: 'linen', carry: 'basket' },
  { id: 'sweeper', skin: 'b', hair: 'black', style: 'cap', tunic: 'earth', pants: 'brown', carry: 'broom' },
  { id: 'citizen_a', skin: 'a', hair: 'blond', style: 'short', tunic: 'grass', pants: 'dark', carry: 'sack' },
  { id: 'citizen_b', skin: 'c', hair: 'black', style: 'bun', tunic: 'rose', pants: 'grey', carry: 'none' },
  { id: 'citizen_c', skin: 'b', hair: 'grey', style: 'bald', tunic: 'stone', pants: 'earth', carry: 'sack' },
  { id: 'guard', skin: 'a', hair: 'dark', style: 'helm', tunic: 'slate', pants: 'grey', carry: 'spear' },
  { id: 'noble_a', skin: 'c', hair: 'blond', style: 'short', tunic: 'plum', pants: 'dark', robe: true, trim: true, carry: 'none' },
  { id: 'noble_b', skin: 'b', hair: 'grey', style: 'bun', tunic: 'teal', pants: 'dark', robe: true, trim: true, carry: 'none' },
];

/** persegi dengan pencahayaan kiri-atas: kolom kiri terang, kolom kanan gelap. */
function box(c, x, y, w, h, tri3) {
  c.rect(x, y, w, h, tri3[1]);
  c.vline(x, y, h, tri3[2]); c.hline(x, y, w, tri3[2]);
  c.vline(x + w - 1, y, h, tri3[0]); c.hline(x, y + h - 1, w, tri3[0]);
}

function drawFrame(v, dir, state, i) {
  const c = new Canvas(32, 48);
  const skin = SKIN[v.skin], hair = HAIR[v.hair], tun = CLOTH[v.tunic], pan = TROUSER[v.pants];
  const walking = state === 'walk';
  // fase jalan: 0 kontak-kiri, 1 lintasan, 2 kontak-kanan, 3 lintasan. lift = kaki yang terangkat (-1 kiri, +1 kanan)
  const lift = !walking ? 0 : i === 0 ? 1 : i === 2 ? -1 : 0;
  const passing = walking && (i === 1 || i === 3);
  const bob = walking ? (passing ? 0 : 1) : (i === 1 ? 1 : 0);   // idle: napas turun 1 px (kaki tetap)
  const hy = 4 + bob; // puncak kepala
  const sway = walking ? (i === 0 ? -1 : i === 2 ? 1 : 0) : 0;      // ayunan lengan (px)
  const side = dir === 'side', back = dir === 'up';

  const legs = () => {
    if (v.robe) return;
    if (!side) {
      // kiri x 11..15, kanan x 17..21; kaki terangkat naik 2 px
      for (const [lx, who] of [[11, -1], [17, 1]]) {
        const up = lift === who ? 2 : 0;
        box(c, lx, 30 + bob, 5, 13 - up - bob, pan);
        box(c, lx, 43 - up, 5, 3, BOOT);
      }
    } else {
      // tampak samping: dua kaki saling silang; swing = jarak langkah
      const sw = walking ? (passing ? 0 : 4) : 0, dirn = i === 0 ? 1 : -1;
      for (const [who, shade] of [[-1, 0], [1, 1]]) {
        const off = who * dirn * sw, up = walking && ((who === 1) === (i === 0)) && !passing ? 0 : (walking && !passing ? 2 : 0);
        const lx = 13 + off - (shade ? 0 : 0);
        c.rect(lx, 30 + bob, 5, 13 - up - bob, shade ? pan[1] : pan[0]);
        c.vline(lx, 30 + bob, 13 - up - bob, shade ? pan[2] : pan[1]);
        box(c, lx + (off > 0 ? 1 : 0), 43 - up, 7, 3, BOOT);
      }
    }
  };
  const robeSkirt = () => {
    if (!v.robe) return;
    const sw = walking ? (i === 0 ? 1 : i === 2 ? -1 : 0) : 0;
    const w = side ? 13 : 16, x0 = side ? 10 : 8;
    for (let j = 0; j < 16 - bob; j++) {
      const r = j + bob, flare = Math.floor(r / 6), xx = x0 - flare, ww = w + flare * 2;
      for (let k = 0; k < ww; k++) c.set(xx + k + (r > 12 ? sw * ((r - 12) >> 1) : 0), 29 + r, k < 2 ? tun[2] : k > ww - 3 ? tun[0] : tun[1]);
    }
    if (v.trim) { c.hline(x0 - 2 + sw, 44, w + 4, GOLD[1]); c.hline(x0 - 2 + sw, 43, w + 4, GOLD[2]); }
    box(c, 13 + sw, 44, 6, 2, BOOT);
  };
  const torso = () => {
    const x0 = side ? 12 : 10, w = side ? 9 : 12;
    const yy = 14 + bob;
    c.poly([[x0 + 3, yy], [x0 + w - 3, yy], [x0 + w, yy + 3], [x0 + w - 1, yy + 10], [x0 + w, yy + 15], [x0, yy + 15], [x0 + 1, yy + 10], [x0, yy + 3]], tun[1]);
    c.line(x0 + 1, yy + 3, x0 + 2, yy + 11, tun[2]);
    c.line(x0 + w - 2, yy + 3, x0 + w - 3, yy + 12, tun[0]);
    c.hline(x0 + 3, yy + 1, w - 6, tun[2]);
    c.line(x0 + 3, yy + 7, x0 + 4, yy + 12, tun[0]);
    c.set(x0 + 4, yy + 5, tun[2]);
    c.hline(x0, 28 + bob, w, v.robe ? tun[1] : BOOT[0]); // sabuk
    if (v.apron) box(c, x0 + 2, 20 + bob, w - 4, 10, CLOTH[v.apron]);
    if (v.trim) { c.vline(side ? x0 + w - 3 : 16, 14 + bob, 15, GOLD[2]); if (!side) c.vline(15, 14 + bob, 15, GOLD[1]); }
    if (!back && !side) {
      c.rect(14, 13 + bob, 4, 2, skin[1]);
      c.line(12, 15 + bob, 15, 17 + bob, tun[2]); c.line(19, 15 + bob, 16, 17 + bob, tun[0]);
      c.set(16, 20 + bob, tun[2]); c.set(16, 24 + bob, tun[2]);
    }
  };
  const head = () => {
    const x0 = side ? 11 : 11, w = side ? 10 : 10;
    // kulit
    c.poly([[x0 + 2, hy + 2], [x0 + w - 2, hy + 2], [x0 + w, hy + 5], [x0 + w - 1, hy + 9], [x0 + w - 3, hy + 11], [x0 + 3, hy + 11], [x0 + 1, hy + 9], [x0, hy + 5]], skin[1]);
    c.vline(x0 + 1, hy + 5, 4, skin[2]); c.vline(x0 + w - 2, hy + 6, 3, skin[0]);
    if (!back) { // wajah
      if (!side) { c.set(14, hy + 6, INK0()); c.set(18, hy + 6, INK0()); c.hline(15, hy + 9, 2, skin[0]); }
      else { c.set(x0 + w - 3, hy + 6, INK0()); c.set(x0 + w, hy + 7, skin[1]); c.hline(x0 + w - 3, hy + 9, 2, skin[0]); }
    }
    // rambut / penutup kepala
    const hr = v.style === 'helm' ? [R(AV.iron, 1), R(AV.iron, 2), R(AV.iron, 3)] : hair;
    if (v.style === 'bald') { c.rect(x0 + 1, hy - 1, w - 2, 4, skin[1]); c.hline(x0 + 2, hy - 1, w - 4, skin[2]); c.rect(x0, hy + 3, 2, 3, hair[2]); c.rect(x0 + w - 2, hy + 3, 2, 3, hair[0]); if (back) c.rect(x0, hy + 3, w, 5, hair[1]); }
    else {
      c.rect(x0, hy, w, 5, hr[1]); c.hline(x0 + 1, hy - 1, w - 2, hr[1]); c.hline(x0 + 1, hy, w - 3, hr[2]); c.vline(x0, hy + 1, 4, hr[2]); c.vline(x0 + w - 1, hy + 1, 4, hr[0]);
      if (back) c.rect(x0, hy + 5, w, 5, hr[1]);
      else if (side) c.rect(x0, hy + 5, 4, 5, hr[1]);
      else { c.rect(x0, hy + 5, 2, 3, hr[1]); c.rect(x0 + w - 2, hy + 5, 2, 3, hr[0]); }
      if (v.style === 'bun') { c.rect(side ? x0 - 2 : 14, hy - 2, side ? 4 : 5, 3, hr[1]); c.hline(side ? x0 - 2 : 14, hy - 2, side ? 4 : 5, hr[2]); }
      if (v.style === 'cap') { c.rect(x0 - 1, hy + 4, w + 2, 2, CLOTH.stone[1]); c.hline(x0 - 1, hy + 4, w + 2, CLOTH.stone[2]); }
      if (v.style === 'helm') { c.hline(x0 - 1, hy + 4, w + 2, hr[0]); c.vline(x0 + (side ? w - 2 : 4), hy + 4, 4, hr[0]); c.set(x0 + (w >> 1), hy - 2, R(AV.bronze, 2)); }
    }
    // Break the old square cap into a rounded crown, sideburns and a few locks.
    if (v.style !== 'bald' && v.style !== 'helm' && v.style !== 'cap') {
      // Clear only the two square cap corners; keep the native hard-alpha edge.
      for (const xx of [x0, x0 + w - 1]) c.d.fill(0, (hy * c.w + xx) * 4, (hy * c.w + xx) * 4 + 4);
      c.hline(x0 + 3, hy - 1, 4, hair[2]);
      c.set(x0 + 2, hy + 2, hair[2]); c.set(x0 + 6, hy + 1, hair[0]);
      if (!back) { c.set(x0 + 3, hy + 5, hair[0]); c.set(x0 + (side ? 5 : 7), hy + 4, hair[1]); }
      else { c.vline(x0 + 2, hy + 5, 3, hair[0]); c.vline(x0 + 6, hy + 4, 4, hair[2]); }
    }
    if (!back && v.style === 'bald') { c.hline(x0 + 3, hy + 10, 4, hair[1]); c.set(x0 + 1, hy + 9, hair[1]); }
  };
  const arms = () => {
    const sk = skin;
    if (!side) {
      for (const [ax, who] of [[7, -1], [22, 1]]) {
        const dy = sway * who * -1;
        box(c, ax, 15 + bob + (dy < 0 ? 0 : 0), 3, 9 + dy, tun);
        c.rect(ax, 24 + bob + dy, 3, 3, sk[1]); c.set(ax, 24 + bob + dy, sk[2]);
      }
    } else {
      // satu lengan terlihat (dekat kamera), berayun maju-mundur di sekitar bahu (x 15..17)
      const dx = walking ? (i === 0 ? 3 : i === 2 ? -3 : 0) : 0;
      for (let j = 0; j < 9; j++) { const x = 14 + Math.round((dx * j) / 9); c.rect(x, 15 + bob + j, 3, 1, j < 7 ? tun[1] : sk[1]); c.set(x, 15 + bob + j, j < 7 ? tun[2] : sk[2]); }
    }
  };
  const carryBehind = () => {
    if (v.carry === 'sack') {
      if (dir === 'down') { c.rect(19, 10 + bob, 8, 7, CLOTH.linen[1]); c.hline(19, 10 + bob, 8, CLOTH.linen[2]); c.vline(26, 10 + bob, 7, CLOTH.linen[0]); }
      else if (side) { c.rect(4, 14 + bob, 9, 12, CLOTH.linen[1]); c.vline(4, 14 + bob, 12, CLOTH.linen[2]); c.hline(4, 14 + bob, 9, CLOTH.linen[2]); c.hline(4, 25 + bob, 9, CLOTH.linen[0]); c.set(6, 12 + bob, CLOTH.linen[1]); c.hline(5, 13 + bob, 7, CLOTH.linen[1]); }
    }
    if (v.carry === 'broom' && side) { c.rect(22, 12 + bob, 2, 32 - bob, R(AV.wood, 2)); c.vline(22, 12 + bob, 32 - bob, R(AV.wood, 3)); c.rect(20, 41, 8, 4, CLOTH.mustard[1]); c.hline(20, 41, 8, CLOTH.mustard[2]); }
    if (v.carry === 'spear') { const sx = side ? 9 : 27; c.rect(sx, 7, 2, 38, R(AV.wood, 2)); c.vline(sx, 7, 38, R(AV.wood, 3)); c.poly([[sx - 1, 8], [sx + 1, 3], [sx + 3, 8]], R(AV.iron, 3)); }
  };
  const carryFront = () => {
    if (v.carry === 'sack' && back) { c.rect(9, 13 + bob, 14, 15, CLOTH.linen[1]); c.vline(9, 13 + bob, 15, CLOTH.linen[2]); c.hline(9, 13 + bob, 14, CLOTH.linen[2]); c.vline(22, 13 + bob, 15, CLOTH.linen[0]); c.hline(9, 27 + bob, 14, CLOTH.linen[0]); c.hline(12, 12 + bob, 8, CLOTH.linen[1]); }
    if (v.carry === 'sack' && dir === 'down') { c.line(11, 14 + bob, 21, 26 + bob, R(AV.wood, 1)); c.line(12, 14 + bob, 21, 25 + bob, R(AV.wood, 2)); }
    if (v.carry === 'crate' || v.carry === 'basket') {
      const crate = v.carry === 'crate', W = AV.wood;
      if (dir === 'down') { box(c, 8, 22 + bob, 16, 10, crate ? [R(W, 1), R(W, 2), R(W, 4)] : [R(W, 2), R(W, 3), R(W, 4)]); c.hline(9, 26 + bob, 14, R(W, 1)); if (!crate) { c.hline(8, 21 + bob, 16, R(AV.leaf, 2)); c.set(11, 20 + bob, AV.tomato); c.set(18, 20 + bob, AV.squash); } c.rect(7, 25 + bob, 3, 3, skin[1]); c.rect(22, 25 + bob, 3, 3, skin[1]); }
      else if (side) { box(c, 17, 22 + bob, 10, 10, crate ? [R(W, 1), R(W, 2), R(W, 4)] : [R(W, 2), R(W, 3), R(W, 4)]); c.hline(18, 26 + bob, 8, R(W, 1)); if (!crate) { c.hline(17, 21 + bob, 10, R(AV.leaf, 2)); c.set(20, 20 + bob, AV.squash); } c.rect(16, 24 + bob, 3, 3, skin[1]); }
      else { c.rect(8, 22 + bob, 2, 8, R(W, 1)); c.rect(22, 22 + bob, 2, 8, R(W, 1)); }
    }
    if (v.carry === 'broom' && !side) { const sx = dir === 'up' ? 6 : 25; c.rect(sx, 10 + bob, 2, 35 - bob, R(AV.wood, 2)); c.vline(sx, 10 + bob, 35 - bob, R(AV.wood, 3)); c.rect(sx - 3, 41, 8, 4, CLOTH.mustard[1]); c.hline(sx - 3, 41, 8, CLOTH.mustard[2]); }
  };

  carryBehind();
  if (back) { legs(); robeSkirt(); arms(); torso(); head(); carryFront(); }
  else { legs(); robeSkirt(); torso(); arms(); head(); carryFront(); }
  c.outline(INK);
  return c;
}
const INK0 = () => R(AV.slate, 0);

/** 3 arah x (2 idle + 4 jalan) per varian. */
export function citizenFrames() {
  const out = [];
  for (const v of VARIANTS) for (const dir of ['down', 'side', 'up']) {
    for (let i = 0; i < 2; i++) out.push({ name: `cit_${v.id}_idle_${dir}_${i}`, c: drawFrame(v, dir, 'idle', i), pivot: { x: 0.5, y: 47 / 48 } });
    for (let i = 0; i < 4; i++) out.push({ name: `cit_${v.id}_walk_${dir}_${i}`, c: drawFrame(v, dir, 'walk', i), pivot: { x: 0.5, y: 47 / 48 } });
  }
  return out;
}
