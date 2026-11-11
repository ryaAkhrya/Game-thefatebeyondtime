// Data peta Tepi Hutan (forest_edge). Builder MURNI, dipakai game (forestEdge.ts) dan generator art
// (scripts/gen-forest-edge-art.mjs). Memakai atlas prop Hutan 1. Polish Sprint 2: dekorasi dirancang per bagian:
//   [jalan barat di bawah kanopi] -> [tikungan utara] -> [jalur timur + tempat istirahat] -> [arena Mournfang yang porak-poranda]
//   -> [jalur ke Aveloria: hutan menipis, padang terang]. Collision, pemicu, spawn dan bos tidak berubah.
// Aturan kedalaman: kanopi menjulang ke utara dari pangkal batang, jadi pohon di SELATAN sebuah jalur harus berpangkal
// >= tepi jalur + ~125 px (kalau tidak, kanopinya menutupi jalur); di utara jalur pangkal boleh dekat dengan tepi.

import { FOOT } from './forest1.map.mjs';

export const EDGE_W = 1408;
export const EDGE_H = 832;

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ALL = ['tree_a', 'tree_b', 'tree_c', 'tree_pine', 'tree_twin', 'tree_fir', 'tree_birch'];

export const EDGE_WALKABLE = [
  { shape: 'rect', x: 64, y: 608, w: 464, h: 96 },
  { shape: 'rect', x: 432, y: 352, w: 96, h: 352 },
  { shape: 'rect', x: 480, y: 352, w: 384, h: 96 },
  { shape: 'ellipse', cx: 960, cy: 400, rx: 192, ry: 144 },
  { shape: 'rect', x: 1056, y: 352, w: 304, h: 96 },
];

export function buildForestEdgeMap() {
  const props = [];
  const add = (type, x, y) => props.push({ id: `edge_${props.length}`, type, x: Math.round(x), y: Math.round(y) });
  const rnd = mulberry32(20261112);
  /** baris pohon berjarak tidak teratur, jenis tidak sama dengan dua tetangga terakhir */
  const row = (x0, x1, y, dy, gap, skip, keep = () => true, types = ALL) => {
    let x = x0 + rnd() * gap * 0.5, p1 = '', p2 = '';
    while (x < x1) {
      const yy = y + (rnd() - 0.5) * 2 * dy;
      if (rnd() >= skip && keep(x, yy)) {
        let t, g = 0;
        do t = types[Math.floor(rnd() * types.length)]; while ((t === p1 || t === p2) && ++g < 12);
        add(t, x, yy);
        p2 = p1; p1 = t;
      }
      x += gap * (0.78 + rnd() * 0.5);
    }
  };
  const onPath = (x, y, pad) => EDGE_WALKABLE.some((s) => s.shape === 'rect' ? x > s.x - pad && x < s.x + s.w + pad && y > s.y - pad && y < s.y + s.h + pad : ((x - s.cx) / (s.rx + pad)) ** 2 + ((y - s.cy) / (s.ry + pad)) ** 2 < 1);

  // ---- jalan barat (di bawah kanopi lebat): utara dekat tepi jalur, selatan jauh ----
  for (const [t, x, y] of [['tree_b', 30, 596], ['tree_c', 100, 588], ['tree_pine', 158, 600], ['tree_a', 220, 590], ['tree_birch', 282, 598], ['tree_fir', 334, 592], ['tree_twin', 356, 596]]) add(t, x, y);
  row(0, 420, 520, 12, 82, 0.05, (x, y) => !onPath(x, y, 0));
  row(10, 420, 446, 12, 84, 0.06);
  row(20, 420, 372, 12, 80, 0.06);
  row(0, 1408, 826, 4, 70, 0.04);
  row(570, 1050, 760, 6, 120, 0.3);
  // ---- tikungan utara (jalur x 432..528): sisi barat dan timur ----
  for (const [t, x, y] of [['tree_pine', 588, 612], ['tree_a', 610, 584], ['tree_birch', 566, 574], ['tree_b', 392, 440], ['tree_c', 396, 376], ['tree_twin', 424, 332], ['tree_fir', 470, 326], ['tree_a', 540, 336]]) add(t, x, y);
  // ---- jalur timur (y 352..448): utara dengan pangkal dekat, selatan berpangkal jauh ----
  row(560, 1100, 338, 10, 84, 0.1, (x, y) => !(x > 600 && x < 740) && !onPath(x, y + 4, -2));
  row(640, 770, 592, 8, 78, 0.04);
  row(560, 760, 660, 8, 90, 0.05);
  row(900, 1408, 700, 4, 130, 0.5);
  // ---- latar utara (lapis dalam) ----
  row(0, 1408, 276, 16, 84, 0.08, (x, y) => !onPath(x, y, 0) && !(x > 740 && x < 1180));
  row(0, 1408, 206, 16, 84, 0.08);
  row(0, 1408, 136, 16, 82, 0.06);
  row(0, 1408, 66, 14, 80, 0.04);
  // ---- arena: pohon patah/tumbang di bibir, pangkal tersapu; bagian tengah dibiarkan bersih untuk bos ----
  for (const [t, x, y] of [
    ['tree_dead', 810, 282], ['tree_pine', 740, 296], ['tree_c', 770, 238], ['tree_a', 884, 244], ['tree_fir', 980, 236], ['tree_b', 1070, 248], ['tree_twin', 1140, 270],
    ['tree_birch', 1156, 330], ['tree_a', 1220, 338], ['tree_c', 1196, 590], ['tree_pine', 1150, 612], ['tree_b', 1076, 664], ['tree_fir', 980, 676], ['tree_a', 880, 672], ['tree_pine', 800, 640],
    ['tree_dead', 756, 548], ['tree_dead', 1130, 568], ['tree_fir', 744, 604],
  ]) add(t, x, y);
  // ---- dressing: tempat istirahat (log + tunggul + lingkaran api dingin dibaking di tanah), penanda checkpoint ----
  add('stump', 624, 356); add('log', 668, 346); add('fern', 600, 342); add('tuft_a', 716, 340); add('rock_c', 700, 360);
  add('marker_stone', 736, 342);
  add('rock_s', 838, 296); add('mushrooms', 882, 528); add('rock_l', 1154, 500); add('rock_c', 790, 520); add('log', 1036, 548); add('rock_s', 1112, 560);
  add('stump', 800, 342); add('stump', 1088, 270); add('bush', 840, 540); add('fern', 1040, 262); add('tuft_b', 940, 276);
  // ---- jalan barat dan tikungan: tanaman bawah ----
  for (const [t, x, y] of [
    ['fern', 70, 598], ['tuft_a', 130, 600], ['bush_hedge', 196, 602], ['flowers_v', 252, 600], ['fern_b', 306, 600], ['rock_s', 356, 604], ['tuft_b', 410, 600],
    ['bush_berry', 90, 718], ['fern', 152, 722], ['rock_c', 224, 724], ['tuft_a', 290, 720], ['bush', 350, 724], ['mushrooms_b', 412, 722], ['flowers', 470, 720], ['fern_b', 520, 724],
    ['bush_hedge', 580, 690], ['fern', 548, 604], ['tuft_a', 398, 480], ['fern_b', 408, 420], ['bush_berry', 406, 360], ['rock_slab', 548, 530], ['flowers_y', 548, 456], ['tuft_b', 556, 590],
  ]) add(t, x, y);
  // ---- jalur menuju Aveloria: hutan menipis, padang terang dengan bunga, papan arah ----
  add('sign', 1296, 338);
  for (const [t, x, y] of [
    ['tree_birch', 1236, 332], ['tree_sapling', 1286, 316], ['tree_sapling', 1350, 330], ['tree_birch', 1378, 306], ['tree_a', 1130, 604], ['tree_c', 1230, 590], ['tree_birch', 1310, 598], ['tree_sapling', 1372, 584],
    ['flowers', 1264, 450], ['flowers_y', 1338, 460], ['flowers_v', 1190, 456], ['tuft_a', 1310, 462], ['tuft_b', 1226, 336], ['fern_b', 1176, 340], ['rock_c', 1270, 336], ['bush_berry', 1360, 346], ['tuft_a', 1372, 462], ['flowers', 1100, 462], ['flowers_y', 1160, 340],
  ]) add(t, x, y);

  return {
    id: 'forest_edge', width: EDGE_W, height: EDGE_H, tile: 32,
    spawn: { x: 96, y: 656, facing: 'right' },
    clearing: { cx: 960, cy: 400, rx: 192, ry: 144 },
    road: { y0: 608, y1: 704, startX: 64 },
    zone: { start: 0, period: 0, copies: 0, wrapX: 1408 },
    trail: { localX: 480, gladeCY: 400, gladeRX: 192, gladeRY: 144, topY: 352, mouthY: 656 },
    props,
    walkable: EDGE_WALKABLE,
    solidRects: [{ id: 'mournfang_block', x: 896, y: 240, w: 20, h: 336, dynamic: true }],
    interactables: [
      { id: 'rest', kind: 'object', verb: 'Istirahat', x: 616, y: 324, w: 96, h: 52 },
      { id: 'aveloria_sign', kind: 'sign', verb: 'Baca', x: 1272, y: 300, w: 48, h: 52 },
      { id: 'slice_exit', kind: 'object', verb: 'Lanjut', x: 1328, y: 352, w: 40, h: 96 },
    ],
    triggers: [
      { id: 'boss_checkpoint', x: 728, y: 352, w: 24, h: 96 },
      { id: 'mournfang', x: 832, y: 240, w: 48, h: 336 },
    ],
    npcs: [],
  };
}
void FOOT;
