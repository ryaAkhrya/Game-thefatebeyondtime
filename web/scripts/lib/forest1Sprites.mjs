// Sprite Hutan 1 / Tepi Hutan (DRAFT, dilukis oleh kode). Tiap jenis punya siluet sendiri (bukan recolor):
//  tree_a  ek besar berkubah        tree_b  pohon beech lonjong tinggi      tree_c  pohon tua condong dengan dahan samping
//  tree_birch  birch pucat renggang tree_twin  pohon kembar dua batang      tree_sapling  anakan kecil
//  tree_pine  cemara tinggi langsing  tree_fir  pinus lebar jarang miring   tree_dead  pohon mati
import { Canvas, Rng, clamp, hash } from './pixelkit.mjs';
import { drawBroadleaf, drawBush, drawConifer } from './envTrees.mjs';
import { buildRocks, drawChest, drawDeadTree, drawFern, drawFlowers, drawLog, drawMarker, drawMushrooms, drawSign, drawStump, drawSword, drawThicket, drawTuft } from './envProps.mjs';

export function buildTrees(P) {
  const S = {};
  const A = (c, anchorY, foot) => ({ c, anchorY, foot });

  S.tree_a = A(drawBroadleaf(P, {
    w: 124, h: 140, base: 134,
    trunk: { cx: 62, h: 52, w: 20, flare: 6, knot: [56, 118], mossH: 20 },
    branches: [[62, 90, 40, 76, 4], [62, 88, 86, 74, 4], [62, 84, 62, 62, 5]],
    clumps: [
      { x: 62, y: 34, rx: 26, ry: 22 }, { x: 38, y: 44, rx: 22, ry: 19 }, { x: 86, y: 44, rx: 22, ry: 19 }, { x: 62, y: 52, rx: 28, ry: 22 },
      { x: 24, y: 66, rx: 20, ry: 16 }, { x: 100, y: 64, rx: 20, ry: 16 }, { x: 44, y: 76, rx: 22, ry: 15 }, { x: 80, y: 76, rx: 22, ry: 15 }, { x: 62, y: 84, rx: 22, ry: 13 },
    ],
  }, 11), 134);

  S.tree_b = A(drawBroadleaf(P, {
    w: 104, h: 152, base: 146,
    trunk: { cx: 52, h: 60, w: 17, flare: 5, lean: 2, taper: 0.3 },
    branches: [[52, 104, 36, 88, 3], [52, 100, 68, 84, 3]],
    clumps: [
      { x: 52, y: 28, rx: 19, ry: 20 }, { x: 52, y: 50, rx: 25, ry: 20 }, { x: 33, y: 60, rx: 17, ry: 15 }, { x: 71, y: 62, rx: 17, ry: 15 },
      { x: 52, y: 72, rx: 23, ry: 16 }, { x: 38, y: 86, rx: 16, ry: 11 }, { x: 65, y: 87, rx: 16, ry: 11 },
    ],
  }, 23), 146);

  S.tree_c = A(drawBroadleaf(P, {
    w: 132, h: 142, base: 136,
    trunk: { cx: 62, h: 58, w: 19, flare: 6, lean: -12, taper: 0.28, knot: [58, 122] },
    branches: [[52, 92, 86, 82, 4], [50, 90, 30, 78, 3], [46, 84, 46, 64, 4]],
    clumps: [
      { x: 44, y: 36, rx: 25, ry: 20 }, { x: 24, y: 52, rx: 21, ry: 17 }, { x: 66, y: 48, rx: 24, ry: 19 }, { x: 46, y: 64, rx: 27, ry: 19 },
      { x: 20, y: 76, rx: 15, ry: 11 }, { x: 46, y: 84, rx: 19, ry: 12 }, { x: 98, y: 76, rx: 17, ry: 12 }, { x: 112, y: 84, rx: 11, ry: 8 }, { x: 86, y: 86, rx: 14, ry: 9 },
    ],
  }, 31), 136);

  S.tree_birch = A(drawBroadleaf(P, {
    w: 84, h: 132, base: 126,
    trunk: { cx: 42, h: 66, w: 9, flare: 1.5, ramp: P.bark2, moss: false, lean: 3, taper: 0.35, rootLen: 6 },
    branches: [[42, 70, 28, 56, 2], [44, 62, 58, 48, 2]],
    leaf: P.leafBright, lumpDen: 40,
    clumps: [
      { x: 42, y: 22, rx: 14, ry: 12 }, { x: 28, y: 34, rx: 13, ry: 11 }, { x: 57, y: 32, rx: 14, ry: 12 }, { x: 42, y: 42, rx: 16, ry: 11 },
      { x: 30, y: 56, rx: 11, ry: 8 }, { x: 56, y: 54, rx: 12, ry: 9 },
    ],
  }, 41), 126);
  // tanda khas birch: belang gelap melintang
  {
    const c = S.tree_birch.c;
    const r = new Rng(77);
    for (let y = 72; y < 124; y += r.int(4, 7)) {
      const x0 = 42 + Math.round(3 * Math.pow((126 - y) / 62, 1.6)) - 4;
      for (let x = x0; x < x0 + 5; x++) if (c.alpha(x, y) > 200 && hash(x, y, 4) > 0.3) c.set(x, y, P.bark2[0]);
    }
  }

  S.tree_twin = A(drawBroadleaf(P, {
    w: 132, h: 140, base: 134,
    trunk: { cx: 48, h: 56, w: 14, flare: 4, lean: 8, taper: 0.2, mossH: 12 },
    trunk2: { cx: 80, h: 50, w: 12, flare: 4, lean: -8, taper: 0.2, moss: false },
    branches: [[56, 88, 62, 70, 4]],
    clumps: [
      { x: 44, y: 36, rx: 22, ry: 19 }, { x: 84, y: 34, rx: 24, ry: 20 }, { x: 64, y: 50, rx: 28, ry: 20 },
      { x: 26, y: 62, rx: 18, ry: 14 }, { x: 104, y: 60, rx: 18, ry: 14 }, { x: 46, y: 74, rx: 20, ry: 13 }, { x: 82, y: 72, rx: 20, ry: 13 },
    ],
  }, 53), 134);

  S.tree_sapling = A(drawBroadleaf(P, {
    w: 58, h: 88, base: 84,
    trunk: { cx: 29, h: 44, w: 8, flare: 2, moss: false, lean: -2, rootLen: 5 },
    clumps: [{ x: 29, y: 20, rx: 13, ry: 12 }, { x: 19, y: 32, rx: 11, ry: 9 }, { x: 40, y: 32, rx: 11, ry: 9 }, { x: 29, y: 38, rx: 13, ry: 8 }],
    lumpDen: 40,
  }, 61), 84);

  S.tree_pine = A(drawConifer(P, {
    w: 92, h: 154, cx: 46, base: 148, trunkH: 24, trunkW: 9,
    tiers: [{ y: 44, hw: 10, h: 26 }, { y: 66, hw: 15, h: 28, lean: 1 }, { y: 90, hw: 20, h: 30 }, { y: 114, hw: 25, h: 32, lean: -1 }, { y: 136, hw: 30, h: 32 }],
    leaf: P.pine,
  }, 71), 148);

  S.tree_fir = A(drawConifer(P, {
    w: 100, h: 140, cx: 50, base: 134, trunkH: 38, trunkW: 10, flare: 4,
    tiers: [{ y: 46, hw: 12, h: 26, lean: 2 }, { y: 70, hw: 21, h: 30, lean: -2 }, { y: 96, hw: 30, h: 34, lean: 1 }],
    leaf: P.pine,
  }, 83), 134);

  return S;
}

export const TREE_FOOT = { tree_a: [22, 12], tree_b: [20, 12], tree_c: [22, 12], tree_birch: [12, 10], tree_twin: [34, 12], tree_sapling: [10, 8], tree_pine: [14, 10], tree_fir: [14, 10] };

export function buildAll(P) {
  const S = buildTrees(P);
  Object.assign(S, buildRocks(P));
  const A = (c, anchorY) => ({ c, anchorY });
  S.tree_dead = A(drawDeadTree(P, 91), 108);
  S.bush = A(drawBush(P, 'round', 5), 38);
  S.bush_hedge = A(drawBush(P, 'hedge', 6), 36);
  S.bush_berry = A(drawBush(P, 'berry', 7), 36);
  S.stump = A(drawStump(P, 8), 43);
  S.log = A(drawLog(P, 4), 35);
  S.sign = A(drawSign(P), 59);
  S.chest_closed = A(drawChest(P, false), 38);
  S.chest_open = A(drawChest(P, true), 38);
  S.sword = A(drawSword(P), 67);
  S.marker_stone = A(drawMarker(P, 6), 62);
  S.thicket_closed = A(drawThicket(P, false, 21), 56);
  S.thicket_open = A(drawThicket(P, true, 21), 56);
  S.fern = A(drawFern(P, 3), 31);
  S.fern_b = A(drawFern(P, 12, 0.8), 25);
  S.tuft_a = A(drawTuft(P, 2, 1), 20);
  S.tuft_b = A(drawTuft(P, 5, 0.7), 20);
  S.flowers = A(drawFlowers(P, 'w', 5), 24);
  S.flowers_y = A(drawFlowers(P, 'y', 8), 24);
  S.flowers_v = A(drawFlowers(P, 'v', 3), 24);
  S.mushrooms = A(drawMushrooms(P, 1, 2), 24);
  S.mushrooms_b = A(drawMushrooms(P, 2, 4), 24);
  return S;
}
