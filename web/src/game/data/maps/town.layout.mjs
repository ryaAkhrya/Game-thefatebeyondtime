// Tata letak art kota (Aveloria, Liora). Dipakai generator (membaking bayangan ke tanah) dan runtime (menaruh sprite).
// Setiap item: f = nama frame atlas, x,y = titik pijak (tengah-bawah), d = override kedalaman, flip, id, sh:false = tanpa bayangan,
// sol = [dx,dy,w,h] jejak tabrakan relatif titik pijak (hanya untuk benda dekoratif BARU; bangunan memakai solid lama).
// Semua benda hanya visual: tidak ada trigger/interaksi yang berubah.

export const AVELORIA_ATLAS = 'town_aveloria';
export const LIORA_ATLAS = 'town_liora';

export const AVELORIA_ITEMS = [
  // --- bangunan ---
  { f: 'ave_home1', x: 248, y: 832 },
  { f: 'ave_home2', x: 240, y: 1104 },
  { f: 'ave_inn', x: 1040, y: 1096 },
  { f: 'ave_archive', x: 976, y: 792, d: 775 },
  // --- tembok kota, gerbang ---
  { f: 'ave_wall_w', x: 352, y: 1176 },
  { f: 'ave_wall_e', x: 928, y: 1176 },
  { f: 'ave_gatehouse', x: 640, y: 1176 },
  { f: 'ave_portcullis', x: 640, y: 1172, d: 1170, id: 'gate', sh: false },
  // --- menara lonceng dan istana ---
  { f: 'ave_tower', x: 824, y: 544 },
  { f: 'ave_bell', x: 824, y: 404, d: 545, id: 'bell', sh: false },
  { f: 'ave_palace_facade', x: 640, y: 448 },
  { f: 'ave_palace_door', x: 640, y: 448, d: 447, id: 'door_closed', sh: false },
  { f: 'ave_palace_door_open', x: 640, y: 448, d: 447, id: 'door_open', sh: false },
  // --- halaman istana ---
  { f: 'ave_hedge_bed', x: 488, y: 616, sol: [-24, -40, 48, 40] },
  { f: 'ave_hedge_bed', x: 784, y: 616, sol: [-24, -40, 48, 40], flip: true },
  { f: 'ave_lamp', x: 592, y: 476, sol: [-4, -4, 8, 4] },
  { f: 'ave_lamp', x: 688, y: 476, sol: [-4, -4, 8, 4] },
  // --- plaza ---
  { f: 'ave_well', x: 472, y: 880 },
  { f: 'ave_bench', x: 440, y: 904, sol: [-20, -8, 40, 8] },
  { f: 'ave_bench', x: 504, y: 904, sol: [-20, -8, 40, 8] },
  { f: 'ave_signpost', x: 692, y: 962, sol: [-4, -4, 8, 4], id: 'city_sign' },
  { f: 'ave_lamp', x: 574, y: 760, sol: [-4, -4, 8, 4] },
  { f: 'ave_lamp', x: 706, y: 760, sol: [-4, -4, 8, 4] },
  { f: 'ave_lamp', x: 574, y: 1032, sol: [-4, -4, 8, 4] },
  { f: 'ave_lamp', x: 706, y: 1032, sol: [-4, -4, 8, 4] },
  { f: 'ave_crates', x: 782, y: 1040, sol: [-26, -12, 52, 12] },
  { f: 'ave_barrel', x: 1130, y: 1088, sol: [-8, -6, 16, 6] },
  { f: 'ave_barrel', x: 1114, y: 1094, sol: [-8, -5, 16, 5] },
  { f: 'ave_sacks', x: 1112, y: 1052, sol: [-16, -8, 32, 8] },
  { f: 'ave_crates', x: 1040, y: 904, sol: [-26, -10, 52, 10] },
  { f: 'ave_planter', x: 226, y: 838, sol: [-8, -4, 16, 4] },
  { f: 'ave_planter', x: 280, y: 838, sol: [-8, -4, 16, 4] },
  // --- pasar ---
  { f: 'ave_stall_back', x: 344, y: 864, d: 863 },
  { f: 'ave_stall_front', x: 344, y: 912 },
  { f: 'ave_produce', x: 236, y: 920 },
  { f: 'ave_barrel', x: 424, y: 912, sol: [-8, -6, 16, 6] },
  { f: 'ave_barrel', x: 441, y: 918, sol: [-8, -5, 16, 5] },
  { f: 'ave_cart', x: 352, y: 1004, sol: [-34, -10, 62, 10] },
  { f: 'ave_crates', x: 186, y: 1022, sol: [-26, -10, 52, 10] },
  // --- meja Azie ---
  { f: 'ave_desk80', x: 912, y: 816 },
  { f: 'ave_desk40', x: 988, y: 816 },
  // --- ruang pertemuan ---
  { f: 'ave_shelf_a', x: 488, y: 216 }, { f: 'ave_shelf_b', x: 488, y: 280 }, { f: 'ave_shelf_a', x: 488, y: 344 },
  { f: 'ave_shelf_b', x: 792, y: 216 }, { f: 'ave_shelf_a', x: 792, y: 280 }, { f: 'ave_shelf_b', x: 792, y: 344 },
  { f: 'ave_council_table', x: 640, y: 216 },
  { f: 'ave_chair', x: 640, y: 184, sol: [-12, -8, 24, 8] },
  // --- taman dan pohon (area tak bisa dijalani) ---
  { f: 'ave_tree_round', x: 210, y: 560 }, { f: 'ave_tree_round', x: 280, y: 596 }, { f: 'ave_tree_round', x: 350, y: 548 }, { f: 'ave_tree_tall', x: 410, y: 600 },
  { f: 'ave_tree_tall', x: 172, y: 500 }, { f: 'ave_bush', x: 244, y: 612 }, { f: 'ave_bush', x: 312, y: 626 }, { f: 'ave_bush', x: 388, y: 626 },
  { f: 'ave_tree_round', x: 905, y: 556 }, { f: 'ave_tree_round', x: 975, y: 520 }, { f: 'ave_tree_round', x: 1045, y: 566 }, { f: 'ave_tree_tall', x: 872, y: 614 },
  { f: 'ave_tree_round', x: 1110, y: 530 }, { f: 'ave_bush', x: 940, y: 612 }, { f: 'ave_bush', x: 1010, y: 620 }, { f: 'ave_bush', x: 1090, y: 616 },
  { f: 'ave_oak', x: 70, y: 420 }, { f: 'ave_oak', x: 60, y: 640 }, { f: 'ave_oak', x: 90, y: 860 }, { f: 'ave_oak', x: 64, y: 1060 }, { f: 'ave_oak', x: 36, y: 200 },
  { f: 'ave_oak', x: 1200, y: 400 }, { f: 'ave_oak', x: 1220, y: 660 }, { f: 'ave_oak', x: 1196, y: 900 }, { f: 'ave_oak', x: 1222, y: 1080 }, { f: 'ave_oak', x: 1240, y: 190 },
  { f: 'ave_tree_tall', x: 140, y: 1290 }, { f: 'ave_oak', x: 300, y: 1330 }, { f: 'ave_oak', x: 470, y: 1370 }, { f: 'ave_oak', x: 960, y: 1340 }, { f: 'ave_oak', x: 1130, y: 1300 },
  { f: 'ave_tree_tall', x: 1180, y: 1380 }, { f: 'ave_bush', x: 560, y: 1262 }, { f: 'ave_bush', x: 724, y: 1270 }, { f: 'ave_bush', x: 540, y: 1388 }, { f: 'ave_bush', x: 744, y: 1384 },
  { f: 'ave_roadsign', x: 608, y: 1352, sol: [-4, -3, 8, 3], id: 'liora_sign' },
];

// Cincin pohon/semak di luar area jalan (deterministik; celah di jalan utara-selatan agar jalan ke hutan dan Aveloria terbuka).
function lioraRing() {
  let seed = 7;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const out = [];
  const kinds = ['lio_fir', 'lio_apple', 'lio_fir', 'lio_bush'];
  for (let x = 98; x < 870; x += 44 + Math.floor(rnd() * 14)) { if (x > 404 && x < 556) continue; out.push({ f: kinds[Math.floor(rnd() * 3)], x: x + Math.floor(rnd() * 12), y: 88 + Math.floor(rnd() * 6) }); }
  for (let y = 150; y < 660; y += 56 + Math.floor(rnd() * 16)) { out.push({ f: kinds[Math.floor(rnd() * 3)], x: 60 + Math.floor(rnd() * 22), y }); out.push({ f: kinds[Math.floor(rnd() * 3)], x: 898 + Math.floor(rnd() * 22), y: y + 20 }); }
  for (let x = 110; x < 860; x += 40 + Math.floor(rnd() * 14)) { if (x > 420 && x < 540) continue; out.push({ f: 'lio_bush', x, y: 684 + Math.floor(rnd() * 8) }); }
  out.push({ f: 'lio_fir', x: 70, y: 690 }, { f: 'lio_fir', x: 890, y: 694 }, { f: 'lio_fir', x: 30, y: 640 }, { f: 'lio_fir', x: 930, y: 640 });
  return out;
}
export const LIORA_ITEMS = [
  // --- rumah ---
  { f: 'lio_house_nw', x: 232, y: 280 }, { f: 'lio_house_ne', x: 728, y: 280 }, { f: 'lio_house_sw', x: 232, y: 512 }, { f: 'lio_house_se', x: 736, y: 512 },
  // --- bengkel bingkai Zira di persimpangan ---
  { f: 'lio_workshop', x: 552, y: 336, id: 'workshop' },
  { f: 'lio_chair', x: 412, y: 338, sol: [-9, -6, 18, 6] },
  { f: 'lio_lantern', x: 420, y: 300, sol: [-5, -4, 10, 4] }, { f: 'lio_lantern', x: 624, y: 356, sol: [-5, -4, 10, 4] },
  { f: 'lio_story_post', x: 600, y: 266, sol: [-10, -5, 20, 5] },
  { f: 'lio_well', x: 392, y: 262, sol: [-22, -14, 44, 14] },
  { f: 'lio_barrel_water', x: 322, y: 278, sol: [-8, -6, 16, 6] },
  // --- halaman kayu: rak jemur, papan, landasan ---
  { f: 'lio_rack_a', x: 368, y: 440 },
  { f: 'lio_rack_b', x: 232, y: 566, sol: [-32, -12, 64, 12] },
  { f: 'lio_chop', x: 306, y: 480, sol: [-8, -6, 16, 6] },
  { f: 'lio_planks', x: 398, y: 524, sol: [-28, -10, 56, 10] },
  { f: 'lio_woodpile', x: 124, y: 276, sol: [-24, -16, 48, 16] },
  // --- kebun dan pagar barat daya ---
  { f: 'lio_fence', x: 118, y: 598, sol: [-16, -4, 32, 4] }, { f: 'lio_fence', x: 150, y: 598, sol: [-16, -4, 32, 4] }, { f: 'lio_fence', x: 182, y: 598, sol: [-16, -4, 32, 4] }, { f: 'lio_fence', x: 214, y: 598, sol: [-16, -4, 32, 4] }, { f: 'lio_fence', x: 246, y: 598, sol: [-16, -4, 32, 4] },
  { f: 'lio_garden_a', x: 160, y: 632, sol: [-34, -14, 68, 14] }, { f: 'lio_garden_b', x: 232, y: 636, sol: [-26, -12, 52, 12] },
  // --- timur laut: gerobak, jerami, palung ---
  { f: 'lio_cart', x: 836, y: 274, sol: [-28, -10, 54, 10] }, { f: 'lio_hay', x: 842, y: 124, sol: [-18, -10, 36, 10] }, { f: 'lio_trough', x: 836, y: 304, sol: [-20, -8, 40, 8] },
  // --- tenggara: pohon peneduh, bangku, jemuran, kebun ---
  { f: 'lio_linden', x: 612, y: 488, sol: [-7, -6, 14, 6] }, { f: 'lio_bench', x: 556, y: 512, sol: [-20, -8, 40, 8] },
  { f: 'lio_washline', x: 594, y: 590, sols: [[-46, -6, 8, 6], [42, -6, 8, 6]] },
  { f: 'lio_fence', x: 720, y: 574, sol: [-16, -4, 32, 4] }, { f: 'lio_fence', x: 752, y: 574, sol: [-16, -4, 32, 4] }, { f: 'lio_fence', x: 784, y: 574, sol: [-16, -4, 32, 4] }, { f: 'lio_fence', x: 816, y: 574, sol: [-16, -4, 32, 4] }, { f: 'lio_fence', x: 848, y: 574, sol: [-16, -4, 32, 4] },
  { f: 'lio_garden_a', x: 764, y: 612, sol: [-34, -14, 68, 14] }, { f: 'lio_garden_b', x: 826, y: 642, sol: [-26, -12, 52, 12] },
  { f: 'lio_woodpile', x: 836, y: 502, sol: [-24, -16, 48, 16] },
  // --- pohon kebun dan semak di halaman ---
  { f: 'lio_apple', x: 190, y: 152, sol: [-6, -5, 12, 5] }, { f: 'lio_apple', x: 274, y: 148, sol: [-6, -5, 12, 5] }, { f: 'lio_apple', x: 704, y: 150, sol: [-6, -5, 12, 5] }, { f: 'lio_apple', x: 776, y: 146, sol: [-6, -5, 12, 5] },
  { f: 'lio_bush', x: 160, y: 288 }, { f: 'lio_fern', x: 312, y: 296 }, { f: 'lio_fern', x: 646, y: 296 }, { f: 'lio_fern', x: 172, y: 520 },
  // --- gerbang hutan, papan petunjuk, pos penjaga ---
  { f: 'lio_gate', x: 480, y: 132, id: 'gate', sols: [[-46, -6, 8, 6], [38, -6, 8, 6]] },
  { f: 'lio_signpost', x: 444, y: 646, sol: [-4, -3, 8, 3], id: 'sign_city' },
  { f: 'lio_lantern', x: 396, y: 604, sol: [-5, -4, 10, 4] }, { f: 'lio_barrel', x: 380, y: 598, sol: [-8, -6, 16, 6] },
  ...lioraRing(),
];

/** Jejak tabrakan tambahan (dekorasi baru) dari item yang memiliki `sol`. */
export function decorSolids(items) {
  const out = [];
  for (const i of items) for (const s of i.sols ?? (i.sol ? [i.sol] : [])) out.push({ x: Math.round(i.x + s[0]), y: Math.round(i.y + s[1]), w: s[2], h: s[3] });
  return out;
}
