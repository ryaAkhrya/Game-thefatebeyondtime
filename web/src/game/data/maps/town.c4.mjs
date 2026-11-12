// Tata letak Aveloria SESUDAH menara tua runtuh (Chapter IV, C4-07). Dipakai runtime (AveloriaC4View, aveloriaC4.ts) dan pratinjau
// generator (scripts/town-art/c4-preview.mjs). Murni data + fungsi, tanpa Phaser, tanpa nama flag.
// Koordinat = titik pijak dunia (tengah-bawah). `sol` = [dx,dy,w,h] jejak tabrakan relatif titik pijak.
// Kota di dalam tembok (kota tua) KOSONG dan dijaga; warga yang dievakuasi berkumpul di luar gerbang selatan.
// STATUS: DRAFT / NEEDS_REVIEW.

export const C4_ATLAS = 'town_c4';
/** Gambar dasar Aveloria yang disembunyikan view: menara lonceng, portcullis dan pohon yang menutupi reruntuhan/penampungan. */
export const C4_HIDE_AVE = [
  { f: 'ave_tower', x: 824, y: 544 }, { f: 'ave_bell', x: 824, y: 404 }, { f: 'ave_portcullis', x: 640, y: 1172 },
  { f: 'ave_tree_tall', x: 872, y: 614 }, { f: 'ave_oak', x: 470, y: 1370 },
];
export const C4_CRISIS_ATLAS = 'town_crisis';
export const C4_AVE_ATLAS = 'town_aveloria';

/** Pemain tiba dari gerbang (sisi luar), menghadap penampungan. */
export const C4_SPAWN = { x: 640, y: 1204, facing: 'down' };

/** Tambahan area jalan di luar tembok selatan (padang rumput tempat penampungan). Menyambung ke jalan Liora (x 592..688). */
export const C4_WALKABLE = [
  { shape: 'rect', x: 344, y: 1196, w: 256, h: 152 },
  { shape: 'rect', x: 680, y: 1196, w: 216, h: 152 },
];

/**
 * Item gambar. atlas: 'c4' (default) | 'crisis' | 'ave'. d = kedalaman (default y). anim: 'dust' | 'cookfire'.
 * Decal tanah memakai d <= -890 (di atas tanah baking, di bawah semua sprite).
 */
export const C4_ITEMS = [
  // ---------------------------------------------------------------------------------------------- menara tua yang runtuh
  { f: 'c4_ground_ruin', x: 866, y: 560, d: -900 },
  { f: 'c4_debris_a', x: 716, y: 520, d: -899 },
  { f: 'c4_debris_b', x: 690, y: 584, d: -899 },
  { f: 'c4_debris_c', x: 790, y: 652, d: -899 },
  { f: 'c4_ruin_main', x: 824, y: 562 },
  { f: 'c4_roof_fallen', x: 784, y: 600 },
  { f: 'c4_clock_broken', x: 800, y: 576, d: 577 },
  { f: 'c4_beam_a', x: 806, y: 628 },
  { f: 'c4_beam_b', x: 774, y: 536, d: 540 },
  { f: 'c4_rubble_m', x: 738, y: 516, sol: [-20, -8, 40, 8] },
  { f: 'c4_rubble_s', x: 728, y: 626, sol: [-12, -6, 24, 6] },
  { f: 'c4_rubble_l', x: 868, y: 520, d: 524 },
  { f: 'c4_bell_fallen', x: 704, y: 604, sol: [-16, -8, 32, 8], id: 'bell' },
  { f: 'c4_dust_0', x: 828, y: 500, d: 2000, anim: 'dust', seed: 0 },
  { f: 'c4_dust_0', x: 776, y: 548, d: 2000, anim: 'dust', seed: 2 },
  // pagar darurat: sisi barat (tegak) dan sisi selatan (datar) mengurung area reruntuhan
  { f: 'c4_barrier', x: 756, y: 480 }, { f: 'c4_barrier', x: 756, y: 508 }, { f: 'c4_barrier', x: 756, y: 536 }, { f: 'c4_barrier', x: 756, y: 564 },
  { f: 'c4_barrier', x: 756, y: 592 }, { f: 'c4_barrier', x: 756, y: 620 },
  { f: 'c4_fence_h', x: 774, y: 636 }, { f: 'c4_fence_h', x: 806, y: 636 }, { f: 'c4_fence_h', x: 838, y: 636 },
  { f: 'c4_sign_closed', x: 726, y: 640, sol: [-4, -3, 8, 3], id: 'fence_sign' },
  // ---------------------------------------------------------------------------------------------- bekas retakan yang sudah tenang
  { f: 'c4_scar_long', x: 640, y: 762, d: -898 },
  { f: 'c4_scar_diag', x: 715, y: 930, d: -898 },
  { f: 'c4_scar_gate', x: 610, y: 1086, d: -898 },
  { f: 'c4_stone_rest_a', x: 622, y: 776 }, { f: 'c4_stone_rest_b', x: 670, y: 756 }, { f: 'c4_stone_rest_c', x: 556, y: 794 },
  { f: 'c4_stone_rest_b', x: 702, y: 914 }, { f: 'c4_stone_rest_a', x: 594, y: 1070 }, { f: 'c4_stone_rest_c', x: 884, y: 868 },
  // ---------------------------------------------------------------------------------------------- tempat penampungan (barat)
  { f: 'c4_camp_ground_a', x: 448, y: 1270, d: -897 }, { f: 'c4_camp_ground_b', x: 392, y: 1322, d: -897 }, { f: 'c4_camp_ground_c', x: 536, y: 1322, d: -897 },
  { f: 'c4_tent_a', x: 436, y: 1252, sol: [-30, -10, 60, 10] },
  { f: 'c4_tent_b', x: 534, y: 1338, sol: [-26, -8, 52, 8] },
  { f: 'c4_tent_c', x: 370, y: 1342, sol: [-20, -8, 40, 8] },
  { f: 'c4_cookfire_0', x: 500, y: 1270, sol: [-14, -6, 28, 6], anim: 'cookfire', seed: 1 },
  { f: 'c4_sit_a', x: 462, y: 1302 }, { f: 'c4_sit_b', x: 546, y: 1286 },
  { f: 'c4_mat_a', x: 392, y: 1292 }, { f: 'c4_sleeper_a', x: 400, y: 1316 },
  { f: 'c4_supplies', x: 372, y: 1232, sol: [-26, -12, 52, 12] },
  { f: 'ave_barrel', atlas: 'ave', x: 566, y: 1236, sol: [-8, -6, 16, 6] },
  { f: 'ave_crates', atlas: 'ave', x: 428, y: 1358, sol: [-26, -10, 52, 10] },
  // ---------------------------------------------------------------------------------------------- tempat penampungan (timur): meja daftar
  { f: 'c4_camp_ground_a', x: 788, y: 1262, d: -897 }, { f: 'c4_camp_ground_b', x: 840, y: 1322, d: -897 }, { f: 'c4_camp_ground_c', x: 722, y: 1308, d: -897 },
  { f: 'c4_roster_board', x: 720, y: 1232, sol: [-22, -8, 44, 8], id: 'roster' },
  { f: 'c4_table_ledger', x: 782, y: 1268, sol: [-26, -10, 52, 10] },
  { f: 'c4_tent_a', x: 858, y: 1250, sol: [-30, -10, 60, 10], flip: true },
  { f: 'c4_sit_c', x: 748, y: 1312 }, { f: 'c4_mat_c', x: 800, y: 1334 }, { f: 'c4_sleeper_b', x: 828, y: 1306 },
  { f: 'crisis_cart_loaded', atlas: 'crisis', x: 856, y: 1342, sol: [-34, -10, 62, 10] },
  { f: 'ave_crates', atlas: 'ave', x: 724, y: 1344, sol: [-26, -10, 52, 10] },
];

/** Jejak tabrakan tambahan (item dengan `sol`). Pagar dan rubble mengurung reruntuhan. */
export const C4_EXTRA_SOLIDS = [
  { id: 'c4_fence_west', x: 752, y: 444, w: 8, h: 196 },
  { id: 'c4_fence_south', x: 752, y: 632, w: 96, h: 8 },
  { id: 'c4_ruin_block', x: 760, y: 448, w: 140, h: 184 },
];

export function c4Solids() {
  const out = [];
  for (const i of C4_ITEMS) for (const s of i.sols ?? (i.sol ? [i.sol] : [])) out.push({ x: Math.round(i.x + s[0]), y: Math.round(i.y + s[1]), w: s[2], h: s[3] });
  for (const s of C4_EXTRA_SOLIDS) out.push({ x: s.x, y: s.y, w: s.w, h: s.h });
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// Tokoh. Talric/Azie/Velthia = NPC bernama (atlas kota final); warga memakai frame warga atlas krisis (DRAFT) bila `variant`.
// ---------------------------------------------------------------------------------------------------------------------
export const C4_NAMED = {
  talric: { x: 744, y: 1270, facing: 'right' },
  azie: { x: 782, y: 1246, facing: 'down' },
  velthia: { x: 826, y: 1272, facing: 'left' },
  derrria: { x: 482, y: 1336, facing: 'left' },
};

/** Warga tanpa nama (frame `cit_<variant>_idle_<dir>_<n>` atlas krisis). id = id interaksi. */
export const C4_RESIDENTS = [
  { id: 'c4_res_vendor', variant: 'vendor', x: 410, y: 1280, facing: 'right' },
  { id: 'c4_res_porter', variant: 'porter', x: 574, y: 1306, facing: 'left' },
  { id: 'c4_res_a', variant: 'citizen_a', x: 874, y: 1296, facing: 'left' },
  { id: 'c4_res_b', variant: 'citizen_b', x: 700, y: 1276, facing: 'right' },
  { id: 'c4_res_c', variant: 'citizen_c', x: 520, y: 1230, facing: 'down' },
  { id: 'c4_res_guard', variant: 'guard', x: 726, y: 574, facing: 'right' },
];
/** Penjaga gerbang bagian dalam (tidak dapat diajak bicara; kota tua kosong dan dijaga). */
export const C4_GATE_GUARD = { variant: 'guard', x: 676, y: 1150, facing: 'down' };

/** Kotak interaksi tambahan. NPC mengikuti sprite (diatur view); papan/lonceng/tanda statis. */
export const C4_OBJECTS = [
  { id: 'c4_roster', kind: 'object', verb: 'Periksa daftar', x: 700, y: 1218, w: 40, h: 22 },
  { id: 'c4_bell', kind: 'object', verb: 'Periksa', x: 684, y: 586, w: 40, h: 24 },
  { id: 'c4_fence_sign', kind: 'sign', verb: 'Baca', x: 716, y: 622, w: 20, h: 20 },
];

export const C4_FOCUS = { ruin: [816, 480], camp: [782, 1250], gate: [640, 1170] };
