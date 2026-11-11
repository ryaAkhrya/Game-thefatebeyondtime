// Data seni Hutan 2 (forest_2), Polish Sprint 2. Murni, dipakai game (world/forest2Art.ts) dan generator
// (scripts/gen-forest2-art.mjs). Geometri walkable/solid/interaktif ada di world/chapter2Maps.ts (cerita); berkas ini hanya
// menyalin angkanya untuk generator dan pemeriksa (tests/unit/forest2art.test.ts memastikan keduanya sama), serta memuat
// penempatan dekorasi dan prop padat tambahan (FOREST2_EXTRA_SOLIDS).
//
// Identitas: hutan yang lebih tua dan lebih sunyi daripada Hutan 1. Tiga "ruang": (A) lorong barat dengan penanda batu pertama,
// (B) tikungan Torvan, (C) jalur jaga lama dengan penanda kedua, tempat istirahat, palisade Veyrath, dan fragmen.
// Aturan kedalaman: kanopi menjulang ke utara dari pangkal batang; pohon di SELATAN ruang berpangkal >= tepi + ~125 px.

export const FOREST2_W = 1280;
export const FOREST2_H = 768;

export const FOREST2_WALKABLE = [
  { shape: 'rect', x: 96, y: 480, w: 768, h: 160 },
  { shape: 'rect', x: 608, y: 336, w: 256, h: 304 },
  { shape: 'rect', x: 768, y: 208, w: 416, h: 240 },
];
/** Salinan FOREST_SOLIDS di chapter2Maps.ts (penanda 1, penanda 2, kayu kerja). */
export const FOREST2_SOLIDS = [
  { x: 344, y: 512, w: 24, h: 16 },
  { x: 888, y: 368, w: 32, h: 16 },
  { x: 544, y: 568, w: 64, h: 16 },
];
/** Prop padat tambahan (kaki prop dekoratif di dalam area walkable). Dimasukkan ke collision oleh loadForest2. */
export const FOREST2_EXTRA_SOLIDS = [
  { x: 111, y: 536, w: 14, h: 8 }, // papan "Ke Liora"
  { x: 805, y: 364, w: 30, h: 8 }, // gulungan tidur di tempat istirahat
  { x: 1089, y: 296, w: 14, h: 8 }, // papan catatan (fragmen A)
  { x: 1136, y: 340, w: 22, h: 10 }, // pecahan waktu (fragmen B)
  { x: 1105, y: 400, w: 14, h: 8 }, // papan "Jalan lama"
  { x: 944, y: 418, w: 22, h: 12 }, // batu pipih di bibir selatan jalur jaga
];
const FIXTURE_INTERACTABLES = [
  ['forest2_marker', 336, 504, 40, 32], ['torvan', 660, 480, 48, 40], ['forest2_second_marker', 880, 352, 48, 32], ['forest2_rest', 800, 344, 40, 32],
  ['forest2_patrol', 824, 400, 40, 32], ['veyrath', 1008, 256, 48, 56], ['fragment_a', 1072, 272, 48, 32], ['fragment_b', 1128, 320, 40, 32],
  ['forest2_return', 112, 544, 40, 32], ['forest2_to_city', 1080, 384, 64, 32],
];
const FIXTURE_TRIGGERS = [['forest2_shadow', 264, 488, 56, 144], ['forest2_tutorial', 768, 456, 96, 184], ['forest2_veyrath', 944, 208, 48, 240]];

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Jejak tapak prop padat (w,h). Kanopi tidak pernah menghalangi. */
export const FOREST2_FOOT = {
  tree_old_a: [30, 12], tree_old_b: [20, 10], tree_hollow: [34, 12], tree_dead2: [14, 10], tree_spruce_old: [14, 10], tree_gnarl: [22, 10],
  stump_old: [34, 12], rock_l: [48, 20], rock_s: [26, 12], rock_slab: [26, 12], rock_c: [34, 12],
  marker_old: [24, 16], marker_second: [32, 16], marker_broken: [28, 12], sign_west: [14, 8], sign_east: [14, 8],
  log_fallen: [88, 14], log_worked: [64, 16], bedroll: [30, 8], note_stand: [14, 8], time_shard: [22, 10], bush: [32, 12], bush_hedge: [52, 12],
  stake_a: [10, 6], stake_b: [10, 6], stake_c: [10, 6], blog_a: [0, 0], blog_b: [0, 0], log_short: [0, 0],
  lantern: [0, 0], leaves_a: [0, 0], leaves_b: [0, 0], leaves_c: [0, 0], fern: [0, 0], fern_b: [0, 0], tuft_a: [0, 0], tuft_b: [0, 0], flowers_v: [0, 0], flowers: [0, 0],
  mushrooms: [0, 0], mushrooms_b: [0, 0],
};

const inRect = (s, x, y, pad = 0) => x > s.x - pad && x < s.x + s.w + pad && y > s.y - pad && y < s.y + s.h + pad;
export const inWalkable = (x, y, pad = 0) => FOREST2_WALKABLE.some((s) => inRect(s, x, y, pad));

/** Posisi tonggak palisade Veyrath (x≈1000, memanjang y 214..446); dipakai game untuk membuat sprite dan generator untuk bayangan. */
export const BARRICADE_STAKES = (() => {
  const r = mulberry32(99);
  const list = [];
  const kinds = ['blog_a', 'blog_b', 'blog_b', 'blog_a', 'blog_b', 'blog_a'];
  for (let i = 0; i < 8; i++) list.push({ type: kinds[i % kinds.length], x: 1000 + Math.round((r() - 0.5) * 5), y: 244 + i * 29 });
  for (const [t, x, y] of [['stake_b', 986, 262], ['stake_c', 984, 340], ['stake_a', 988, 412], ['log_short', 1000, 292], ['log_short', 1000, 372], ['log_short', 1000, 434]]) list.push({ type: t, x, y });
  return list;
})();

export function buildForest2Art() {
  const props = [];
  const add = (type, x, y) => props.push({ id: `f2_${props.length}`, type, x: Math.round(x), y: Math.round(y) });
  const rnd = mulberry32(20261113);
  const OLD = ['tree_old_a', 'tree_old_b', 'tree_hollow', 'tree_dead2', 'tree_spruce_old', 'tree_gnarl', 'tree_spruce_old'];
  const W8 = [1, 1.4, 1, 1.5, 2.2, 1, 2];
  /** baris latar: jarak tak teratur, tidak pernah dua jenis sama berurutan, kanopi tidak menutup ruang jalan */
  const row = (x0, x1, y, dy, gap, skip, extraKeep = () => true, TYPES = OLD, WTS = W8) => {
    let x = x0 + rnd() * gap * 0.5, p1 = '', p2 = '';
    while (x < x1) {
      const yy = y + (rnd() - 0.5) * 2 * dy;
      const clear = !inWalkable(x, yy + 4, 6) && !inWalkable(x, yy - 80, -6) && !inWalkable(x - 40, yy - 70) && !inWalkable(x + 40, yy - 70);
      if (rnd() >= skip && clear && extraKeep(x, yy)) {
        let t, g = 0;
        do { let r = rnd() * WTS.reduce((a, b) => a + b, 0), k = 0; for (; k < TYPES.length - 1; k++) { r -= WTS[k]; if (r <= 0) break; } t = TYPES[k]; } while ((t === p1 || t === p2) && ++g < 14);
        add(t, x, yy);
        p2 = p1; p1 = t;
      }
      x += gap * (0.78 + rnd() * 0.5);
    }
  };

  // ---- Ruang A (lorong barat): sabuk utara dekat tepi, pohon purba besar menjadi jangkar di dekat tempat muncul ----
  for (const [t, x, y] of [['tree_spruce_old', 40, 474], ['tree_old_a', 150, 468], ['tree_gnarl', 262, 472], ['tree_dead2', 324, 470], ['tree_hollow', 420, 468], ['tree_old_b', 498, 470], ['tree_spruce_old', 562, 474]]) add(t, x, y);
  // ---- Ruang B (tikungan): barat dan utara ----
  for (const [t, x, y] of [['tree_spruce_old', 556, 396], ['tree_dead2', 540, 458], ['tree_old_b', 648, 330], ['tree_hollow', 704, 330]]) add(t, x, y);
  // ---- Ruang C (jalur jaga lama): sabuk utara, tepi timur (hanya pohon langsing, tidak menutupi fragmen) ----
  for (const [t, x, y] of [['tree_old_b', 800, 204], ['tree_hollow', 876, 200], ['tree_spruce_old', 950, 204], ['tree_old_a', 1052, 198], ['tree_gnarl', 1132, 202], ['tree_dead2', 1180, 200],
    ['tree_spruce_old', 1228, 268], ['tree_dead2', 1246, 352], ['tree_spruce_old', 1226, 430]]) add(t, x, y);
  // ---- tenggara (selatan jalur C dan timur ruang B) ----
  for (const [t, x, y] of [['tree_spruce_old', 906, 628], ['tree_dead2', 944, 604], ['tree_old_a', 1018, 642], ['tree_hollow', 1110, 592], ['tree_gnarl', 1196, 604], ['tree_old_b', 1262, 650]]) add(t, x, y);
  // ---- lapis latar ----
  row(0, 1280, 392, 14, 92, 0.1);
  row(0, 1280, 322, 14, 92, 0.1);
  row(0, 1280, 254, 16, 90, 0.08);
  row(0, 1280, 186, 16, 90, 0.08);
  row(0, 1280, 120, 14, 88, 0.06);
  row(0, 1280, 58, 12, 86, 0.04);
  row(0, 1280, 796, 6, 96, 0.04, () => true, ['tree_old_a', 'tree_old_b', 'tree_hollow', 'tree_gnarl', 'tree_old_a'], [1.5, 1.5, 1, 1.4, 1]);
  row(870, 1280, 700, 12, 110, 0.2);

  // ---- penanda batu, papan, kayu kerja (posisi = kaki collision di chapter2Maps) ----
  add('marker_old', 356, 528);
  add('marker_second', 904, 384);
  add('log_worked', 576, 584);
  add('sign_west', 118, 544);
  add('sign_east', 1112, 408);
  // tempat istirahat (diaktifkan setelah Torvan bergabung): gulungan tidur, lentera, lingkaran api dingin (dibaking)
  add('bedroll', 820, 372);
  add('lantern', 848, 368);
  add('rock_c', 790, 352);
  add('fern_b', 786, 372);
  // fragmen: papan catatan dan pecahan waktu
  add('note_stand', 1096, 304);
  add('time_shard', 1148, 350);
  // palisade Veyrath
  for (const s of BARRICADE_STAKES) add(s.type, s.x, s.y);
  // daun yang tertahan di udara: sekitar penanda kedua dan pecahan (tanda halus gangguan waktu, bukan hiasan acak)
  add('leaves_a', 886, 352); add('leaves_b', 928, 366); add('leaves_c', 872, 396);
  add('leaves_a', 1124, 330); add('leaves_b', 1170, 348); add('leaves_c', 1138, 304);
  add('leaves_b', 1052, 282);
  add('leaves_c', 338, 524); // tipis di penanda pertama
  // pohon patah / batu / kayu: pemecah garis tepi dan petunjuk "dipakai penduduk"
  add('log_fallen', 478, 664); add('log_fallen', 1004, 468);
  add('stump_old', 706, 348); add('stump_old', 236, 650);
  add('marker_broken', 1214, 394);
  add('rock_slab', 956, 428); add('rock_l', 668, 684); add('rock_s', 160, 668); add('rock_c', 392, 640);
  add('rock_s', 842, 224);
  // tanaman bawah di tepi walkable (memecah garis lurus)
  for (const [t, x, y] of [
    ['bush_hedge', 110, 484], ['fern', 205, 482], ['mushrooms', 268, 484], ['fern_b', 372, 482], ['bush', 448, 486], ['tuft_a', 520, 482], ['fern', 590, 486],
    ['fern', 98, 644], ['bush_hedge', 214, 650], ['mushrooms_b', 300, 648], ['fern_b', 430, 648], ['tuft_a', 520, 646], ['bush', 640, 652], ['fern', 760, 650], ['flowers_v', 560, 650], ['tuft_b', 812, 652],
    ['fern', 612, 342], ['tuft_b', 640, 338], ['fern_b', 702, 340], ['mushrooms', 744, 342],
    ['fern', 788, 216], ['bush', 852, 214], ['tuft_a', 910, 216], ['fern_b', 980, 216], ['bush_hedge', 1070, 216], ['fern', 1140, 214], ['tuft_b', 1176, 222],
    ['fern', 872, 452], ['fern_b', 920, 456], ['tuft_a', 990, 452], ['bush', 1058, 456], ['mushrooms_b', 1110, 454], ['fern', 1170, 456],
    ['fern_b', 866, 520], ['tuft_b', 868, 584], ['mushrooms', 866, 628], ['flowers_v', 1060, 330], ['flowers', 1040, 380],
  ]) add(t, x, y);

  return {
    id: 'forest_2', width: FOREST2_W, height: FOREST2_H, tile: 32,
    spawn: { x: 152, y: 560, facing: 'right' },
    clearing: { cx: 0, cy: 0, rx: 0, ry: 0 }, road: { y0: 0, y1: 0, startX: 0 }, zone: { start: 0, period: 0, copies: 0, wrapX: Infinity },
    trail: { localX: 0, gladeCY: 0, gladeRX: 0, gladeRY: 0, topY: 0, mouthY: 0 },
    props,
    walkable: FOREST2_WALKABLE,
    solidRects: [],
    interactables: FIXTURE_INTERACTABLES.map(([id, x, y, w, h]) => ({ id, kind: 'object', verb: '', x, y, w, h })),
    triggers: FIXTURE_TRIGGERS.map(([id, x, y, w, h]) => ({ id, x, y, w, h })),
    npcs: [],
  };
}
