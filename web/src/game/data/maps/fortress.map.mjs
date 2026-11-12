// Data peta Benteng Penjaga (Warden Fortress, area `fortress`, Chapter IV), Phase 8. Murni (tanpa Phaser): dipakai game
// (world/fortressMaps.ts, world/FortressView.ts), generator seni (scripts/gen-fortress-art.mjs) dan tes. SATU sumber untuk
// geometri, penempatan prop, interaktif dan pemicu, sehingga seni dan collision tidak pernah berbeda.
//
// Garis besar (utara = atas, 32 px/petak). Jalur utama linear dari selatan ke utara, dengan dua sayap kecil dan satu pintasan:
//
//   approach -> outer (Gerbang Luar) -> gatehall -> bellhall (Aula Lonceng Berhenti)
//   bellhall barat : bdoor -> barracks (bekas barak) -> adoor -> archive (Arsip Penjaga)         [pusaka Velthia: Perlindungan]
//   bellhall timur : tdoor (gerbang besi, terbuka setelah Perlindungan dipelajari) -> trial (Ruang Uji Segel)
//   bellhall utara : sdoor (Pintu Segel, terbuka setelah urutan segel jaga benar) -> rift (Koridor Retakan) -> serambi
//   serambi        : lentera jaga (titik simpan) -> hdoor (Pintu Heart, terbuka sesudah titik simpan) -> heart (Ruang Heart)
//                    pintasan: scdoor -> sc_v (+ sc_land) -> turun ke pojok barat laut aula lonceng (pintu pintasan + tuas)
//   heart          : edoor (disegel retakan sampai Heart dibuka) -> echo (Ruang Gema) -> gerbang keluar
//
// Dinding digambar di LUAR persegi lantai (muka dinding 64 px di atas tepi utara tiap ruang + tutup 16 px). Karena itu semua
// pintu depan (sdoor, hdoor, pintu pintasan, pintu belakang) berada di dinding utara; lintasan samping (bdoor, tdoor, edoor, adoor)
// berupa celah lantai.

export const FORTRESS_W = 1792;
export const FORTRESS_H = 2432;

/** Lantai yang dapat dilalui (tiap persegi = satu ruang/lorong). */
export const FORTRESS_ROOMS = {
  approach: { x: 800, y: 2304, w: 192, h: 128 },
  outer: { x: 640, y: 1984, w: 512, h: 320 },
  gatehall: { x: 832, y: 1856, w: 128, h: 128 },
  bellhall: { x: 512, y: 1424, w: 768, h: 432 },
  bdoor: { x: 448, y: 1680, w: 64, h: 64 },
  barracks: { x: 160, y: 1568, w: 288, h: 288 },
  adoor: { x: 256, y: 1504, w: 64, h: 64 },
  archive: { x: 128, y: 1216, w: 352, h: 288 },
  tdoor: { x: 1280, y: 1680, w: 64, h: 64 },
  trial: { x: 1344, y: 1552, w: 320, h: 304 },
  sdoor: { x: 848, y: 1360, w: 96, h: 64 },
  rift: { x: 800, y: 800, w: 192, h: 560 },
  serambi: { x: 704, y: 480, w: 384, h: 320 },
  hdoor: { x: 848, y: 400, w: 96, h: 80 },
  heart: { x: 576, y: 96, w: 640, h: 304 },
  scdoor: { x: 640, y: 608, w: 64, h: 64 },
  sc_v: { x: 576, y: 608, w: 96, h: 816 },
  sc_land: { x: 448, y: 944, w: 224, h: 160 },
  edoor: { x: 1216, y: 224, w: 64, h: 64 },
  echo: { x: 1280, y: 112, w: 384, h: 272 },
};
export const FORTRESS_WALKABLE = Object.values(FORTRESS_ROOMS).map((r) => ({ shape: 'rect', ...r }));

/** Penghalang dinamis (aktif sampai kondisi pembukanya terpenuhi; FortressView.apply memasang/melepasnya dari flag). */
export const FORTRESS_DYNAMIC = {
  door_seal: { id: 'door_seal', x: 848, y: 1368, w: 96, h: 56 },
  door_shortcut: { id: 'door_shortcut', x: 576, y: 1368, w: 96, h: 56 },
  door_trial: { id: 'door_trial', x: 1304, y: 1680, w: 16, h: 64 },
  door_heart: { id: 'door_heart', x: 848, y: 432, w: 96, h: 48 },
  door_echo: { id: 'door_echo', x: 1240, y: 224, w: 16, h: 64 },
  slab_1: { id: 'slab_1', x: 800, y: 1232, w: 192, h: 32 },
  slab_2: { id: 'slab_2', x: 800, y: 1104, w: 192, h: 32 },
  slab_3: { id: 'slab_3', x: 800, y: 976, w: 192, h: 32 },
};
/** Daftar penghalang yang aktif pada keadaan awal (tanpa flag). Slab mengikuti keadaan awal teka-teki (lihat fortressPuzzle.ts). */
export const FORTRESS_INITIAL_DYNAMIC = ['door_seal', 'door_shortcut', 'door_trial', 'door_heart', 'door_echo', 'slab_1', 'slab_3'];
/** Posisi dasar (kaki) slab; sprite slab berpivot di sini (y + h). */
export const FORTRESS_SLAB_Y = [1232, 1104, 976];

/** Jejak kaki prop padat [w,h] (kaki di tengah-bawah titik prop). [0,0] = tanpa collision. */
export const FORTRESS_FOOT = {
  column: [26, 12], column_broken: [26, 12], statue_warden: [30, 12], statue_broken: [30, 12], gate_post: [34, 12],
  brazier_cold: [18, 6], brazier_a: [18, 6], brazier_b: [18, 6],
  torch_a: [0, 0], torch_b: [0, 0], banner_a: [0, 0], banner_b: [0, 0],
  bell_frame: [152, 14],
  seal_dawn_off: [26, 12], seal_dawn_on: [26, 12], seal_noon_off: [26, 12], seal_noon_on: [26, 12],
  seal_dusk_off: [26, 12], seal_dusk_on: [26, 12], seal_night_off: [26, 12], seal_night_on: [26, 12],
  door_iron_closed: [0, 0], door_iron_open: [0, 0], door_heart_closed: [0, 0], door_heart_half: [0, 0], door_heart_open: [0, 0],
  gate_side_closed: [0, 0], gate_side_open: [0, 0], echo_seal_closed: [0, 0], echo_seal_open: [0, 0],
  portcullis: [0, 0], slab_aligned: [0, 0], slab_shifted: [0, 0],
  anchor_a_0: [28, 12], anchor_a_1: [28, 12], anchor_b_0: [28, 12], anchor_b_1: [28, 12],
  lever_off: [14, 8], lever_on: [14, 8], lantern_off: [24, 10], lantern_on: [24, 10],
  courier_post: [16, 6], lectern_log: [26, 10], shelf: [60, 14], bunk: [60, 14], table: [90, 14], weapon_rack: [46, 10],
  crate: [30, 12], barrel: [22, 10], sacks: [24, 8], chest_closed: [28, 12], chest_open: [28, 12],
  relic_dim: [24, 10], relic_glow: [24, 10], trial_pedestal_off: [30, 12], trial_pedestal_on: [30, 12],
  memorial_niche: [0, 0], cloak_stand: [22, 8], name_wall: [0, 0], dial_wall: [0, 0], slit_window: [0, 0],
  heart_pylon_off: [34, 12], heart_pylon_on: [34, 12], heart_seal_sealed: [0, 0], heart_seal_open: [0, 0], heart_emblem_sealed: [0, 0], heart_emblem_open: [0, 0],
  window_arch_0: [0, 0], window_arch_1: [0, 0], window_arch_2: [0, 0], window_arch_3: [0, 0],
  echo_a_off: [30, 10], echo_a_on: [30, 10], echo_b_off: [30, 10], echo_b_on: [30, 10],
  rubble_a: [32, 8], rubble_b: [0, 0], rubble_c: [0, 0], block_fallen: [60, 10], cart_broken: [66, 12],
  crack_a: [0, 0], crack_b: [0, 0], crack_c: [0, 0], crack_a_dead: [0, 0], crack_b_dead: [0, 0], crack_c_dead: [0, 0], mote: [0, 0],
  oathguard_a: [0, 0], oathguard_b: [0, 0], riftborn_a: [0, 0], riftborn_b: [0, 0], gravorn_a: [0, 0], gravorn_b: [0, 0],
};

/** Jenis yang digambar datar di bawah karakter (tidak di-sort dengan y). */
export const FORTRESS_DECALS = ['heart_seal_sealed', 'heart_seal_open', 'rubble_b', 'rubble_c', 'crack_a', 'crack_b', 'crack_c', 'crack_a_dead', 'crack_b_dead', 'crack_c_dead'];
/** Jenis yang tergantung di atas jalan (digambar di atas karakter). */
export const FORTRESS_OVERHEAD = ['portcullis'];

export const FORTRESS_SPAWN = { x: 896, y: 2412, facing: 'up' };
/** Titik kembali aman (di luar semua pemicu) setelah pertarungan; WorldScene menaruh pemain di sini sebelum battle. */
export const FORTRESS_BATTLE_RETURN = {
  fortress_riftborn: { x: 896, y: 2134, facing: 'up' },
  fortress_gravorn: { x: 896, y: 1836, facing: 'up' },
  fortress_guardpost: { x: 476, y: 1712, facing: 'left' },
  fortress_aegis_trial: { x: 1504, y: 1744, facing: 'up' },
  fortress_rift: { x: 896, y: 1050, facing: 'up' },
  varlgrim: { x: 896, y: 308, facing: 'up' },
};
/** Titik cerita untuk adegan (tidak dipakai collision). */
export const FORTRESS_STAGE = {
  /** Varlgrim berdiri di antara dua pengunci, dekat lambang Heart (sebelum dan sesudah pertarungan). */
  varlgrim: { x: 896, y: 170 },
  /** ambang Ruang Gema (lorong disegel): Varlgrim dan Torvan muncul di sini */
  threshold: { x: 1262, y: 258 },
  /** dinding Ruang Gema yang paling retak: Varlgrim menanam tongkatnya di sini dan tinggal menahan retakan */
  varlgrimWall: { x: 1364, y: 150 },
  velthiaLock: { x: 1026, y: 176 },
  yaricLock: { x: 800, y: 178 },
  vista: { x: 704, y: 70 },
  checkpoint: { x: 800, y: 640 },
};

/** [id, type, x, y]: titik dasar prop. Urutan: jalan masuk, gerbang luar, lorong gerbang, aula lonceng, sayap barat, sayap timur, koridor, serambi, pintasan, Heart, Gema. */
export const FORTRESS_PROPS = [
  // ---- jalan masuk ----
  ['app_statue_l', 'statue_broken', 828, 2352], ['app_statue_r', 'statue_warden', 964, 2352],
  ['app_rub_a', 'rubble_c', 880, 2386], ['app_rub_b', 'rubble_c', 936, 2330],
  // ---- Gerbang Luar ----
  ['gate_post_l', 'gate_post', 812, 1996], ['gate_post_r', 'gate_post', 980, 1996], ['portcullis', 'portcullis', 896, 1984],
  ['outer_col_l', 'column_broken', 664, 2036], ['outer_col_r', 'column', 1130, 2036],
  ['outer_statue_l', 'statue_warden', 704, 2014], ['outer_statue_r', 'statue_broken', 1088, 2014],
  ['outer_brazier_l', 'brazier_a', 778, 2062], ['outer_brazier_r', 'brazier_a', 1014, 2062],
  ['outer_banner_l', 'banner_a', 728, 1972], ['outer_banner_r', 'banner_b', 1070, 1972],
  ['courier_a', 'courier_post', 704, 2238], ['camp_crate', 'crate', 668, 2262], ['camp_barrel', 'barrel', 742, 2266], ['camp_sacks', 'sacks', 702, 2276],
  ['outer_cart', 'cart_broken', 1046, 2230], ['outer_block', 'block_fallen', 990, 2160],
  ['outer_rub_a', 'rubble_b', 780, 2120], ['outer_rub_b', 'rubble_c', 1062, 2094], ['outer_rub_c', 'rubble_a', 846, 2250],
  ['outer_crack_a', 'crack_a', 760, 2176], ['outer_crack_b', 'crack_b', 1004, 2200],
  ['patrol_riftborn', 'riftborn_a', 896, 2102],
  // ---- lorong gerbang ----
  ['gh_crack', 'crack_c', 896, 1930],
  // ---- Aula Lonceng Berhenti ----
  ['door_seal', 'door_iron_closed', 896, 1424], ['door_shortcut', 'door_iron_closed', 624, 1424],
  ['bh_torch_1', 'torch_a', 724, 1398], ['bh_torch_2', 'torch_a', 1086, 1398], ['bh_torch_3', 'torch_a', 548, 1398], ['bh_torch_4', 'torch_a', 1240, 1398],
  ['bh_banner_1', 'banner_a', 782, 1412], ['bh_banner_2', 'banner_b', 1010, 1412], ['bh_dial', 'dial_wall', 1170, 1412],
  ['bell', 'bell_frame', 896, 1650],
  ['seal_dawn', 'seal_dawn_off', 1070, 1560], ['seal_noon', 'seal_noon_off', 722, 1760], ['seal_dusk', 'seal_dusk_off', 722, 1560], ['seal_night', 'seal_night_off', 1070, 1760],
  ['bh_col_nw', 'column', 552, 1472], ['bh_col_ne', 'column', 1240, 1472], ['bh_col_sw', 'column', 552, 1832], ['bh_col_se', 'column', 1240, 1832],
  ['bh_brazier_l', 'brazier_a', 796, 1838], ['bh_brazier_r', 'brazier_a', 996, 1838],
  ['bh_crack_a', 'crack_a', 806, 1702], ['bh_crack_b', 'crack_b', 1004, 1618], ['bh_rub_a', 'rubble_b', 842, 1560], ['bh_rub_b', 'rubble_c', 958, 1744], ['bh_rub_c', 'rubble_a', 566, 1626],
  ['trial_gate', 'gate_side_closed', 1312, 1744], ['hall_lantern', 'lantern_on', 620, 1634],
  ['patrol_gravorn', 'gravorn_a', 896, 1784],
  // ---- bekas barak ----
  ['bk_torch_1', 'torch_a', 226, 1542], ['bk_torch_2', 'torch_a', 340, 1542], ['bk_names', 'name_wall', 396, 1558],
  ['bk_bunk_a', 'bunk', 196, 1612], ['bk_bunk_b', 'bunk', 196, 1708], ['bk_bunk_c', 'bunk', 196, 1804],
  ['bk_table', 'table', 296, 1796], ['bk_rack', 'weapon_rack', 372, 1606], ['bk_barrel', 'barrel', 402, 1642],
  ['bk_crate', 'crate', 394, 1836], ['bk_chest', 'chest_closed', 362, 1840],
  ['bk_crack', 'crack_b', 330, 1702],
  ['patrol_guard_og', 'oathguard_a', 392, 1706], ['patrol_guard_rb', 'riftborn_a', 410, 1740],
  // ---- Arsip Penjaga ----
  ['ar_shelf_1', 'shelf', 160, 1252], ['ar_shelf_2', 'shelf', 232, 1252], ['ar_niche', 'memorial_niche', 300, 1208], ['ar_shelf_3', 'shelf', 368, 1252], ['ar_shelf_4', 'shelf', 440, 1252],
  ['ar_relic', 'relic_dim', 304, 1372], ['ar_log', 'lectern_log', 190, 1344], ['ar_cloak', 'cloak_stand', 428, 1336],
  ['ar_brazier_l', 'brazier_a', 150, 1296], ['ar_brazier_r', 'brazier_a', 462, 1296],
  ['ar_chest', 'chest_closed', 444, 1480], ['ar_crack', 'crack_c', 360, 1420], ['ar_rub', 'rubble_c', 150, 1452],
  // ---- Ruang Uji Segel ----
  ['tr_torch_l', 'torch_a', 1400, 1526], ['tr_torch_r', 'torch_a', 1612, 1526], ['tr_banner_l', 'banner_a', 1450, 1540], ['tr_banner_r', 'banner_b', 1558, 1540], ['tr_plaque', 'name_wall', 1504, 1544],
  ['tr_pedestal', 'trial_pedestal_off', 1504, 1700], ['patrol_trial_rb', 'riftborn_a', 1504, 1650],
  ['tr_st_nw', 'statue_warden', 1388, 1620], ['tr_st_ne', 'statue_warden', 1620, 1620], ['tr_st_sw', 'statue_warden', 1388, 1832], ['tr_st_se', 'statue_broken', 1620, 1832],
  ['tr_chest', 'chest_closed', 1636, 1716], ['tr_crack', 'crack_b', 1440, 1780],
  // ---- Koridor Retakan ----
  ['slab_1', 'slab_shifted', 896, 1264], ['slab_2', 'slab_aligned', 896, 1136], ['slab_3', 'slab_shifted', 896, 1008],
  ['corridor_lantern', 'lantern_on', 896, 1306], ['anchor_a', 'anchor_a_0', 838, 1332], ['anchor_b', 'anchor_b_0', 954, 1332],
  ['rf_col_1', 'column', 818, 1190], ['rf_col_2', 'column', 974, 1190], ['rf_col_3', 'column_broken', 818, 1060], ['rf_col_4', 'column', 974, 1060], ['rf_col_5', 'column', 818, 962], ['rf_col_6', 'column_broken', 974, 962],
  ['rf_crack_1', 'crack_c', 856, 1296], ['rf_crack_2', 'crack_a', 936, 1170], ['rf_crack_3', 'crack_b', 860, 1044], ['rf_crack_4', 'crack_c', 934, 904],
  ['rf_rub_1', 'rubble_b', 832, 1218], ['rf_rub_2', 'rubble_b', 960, 1090], ['rf_rub_3', 'rubble_c', 840, 980],
  ['patrol_rift_rb', 'riftborn_a', 858, 928], ['patrol_rift_gv', 'gravorn_a', 934, 936],
  // ---- Serambi Heart ----
  ['door_heart', 'door_heart_closed', 896, 480],
  ['sb_st_l', 'statue_warden', 812, 512], ['sb_st_r', 'statue_warden', 980, 512],
  ['sb_torch_l', 'torch_a', 760, 454], ['sb_torch_r', 'torch_a', 1032, 454], ['sb_banner_l', 'banner_a', 730, 468], ['sb_banner_r', 'banner_a', 1062, 468],
  ['lantern', 'lantern_off', 800, 622], ['courier_b', 'courier_post', 1010, 642],
  ['sb_col_a', 'column', 752, 772], ['sb_col_b', 'column', 1040, 772], ['sb_crack', 'crack_b', 900, 764], ['sb_rub', 'rubble_c', 1056, 560],
  // ---- pintasan ----
  ['sc_lever', 'lever_off', 600, 1352], ['sc_torch_1', 'torch_a', 556, 918], ['sc_window', 'slit_window', 520, 934], ['sc_note', 'lectern_log', 628, 1076],
  ['sc_rub', 'rubble_c', 540, 1070],
  // ---- Ruang Heart ----
  ['hr_window', 'window_arch_0', 704, 96], ['hr_emblem', 'heart_emblem_sealed', 896, 96], ['hr_seal', 'heart_seal_sealed', 896, 252],
  ['hr_pylon_y', 'heart_pylon_off', 800, 150], ['hr_pylon_v', 'heart_pylon_off', 992, 150],
  ['hr_st_l', 'statue_warden', 612, 150], ['hr_st_r', 'statue_warden', 1180, 150],
  ['hr_torch_1', 'torch_a', 636, 70], ['hr_torch_2', 'torch_a', 762, 70], ['hr_torch_3', 'torch_a', 1030, 70], ['hr_torch_4', 'torch_a', 1156, 70],
  ['hr_banner_r', 'banner_a', 1092, 84],
  ['hr_brazier_l', 'brazier_a', 650, 326], ['hr_brazier_r', 'brazier_a', 1142, 326],
  ['hr_crack_a', 'crack_a', 790, 322], ['hr_crack_b', 'crack_b', 1002, 312], ['hr_shards_a', 'rubble_c', 840, 300], ['hr_shards_b', 'rubble_c', 960, 312],
  // ---- Ruang Gema ----
  ['echo_seal', 'echo_seal_closed', 1248, 288],
  ['ec_torch_l', 'torch_a', 1336, 86], ['ec_torch_r', 'torch_a', 1654, 86],
  ['echo_a', 'echo_a_off', 1384, 276], ['echo_b', 'echo_b_off', 1568, 276],
  ['ec_col_a', 'column_broken', 1334, 190], ['ec_col_b', 'column', 1636, 190], ['ec_col_c', 'column', 1336, 366], ['ec_col_d', 'column_broken', 1634, 366],
].map(([id, type, x, y]) => ({ id, type, x, y }));

/** Prop yang disembunyikan/diubah FortressView menurut flag (id -> peran). */
export const FORTRESS_PATROLS = {
  fortress_riftborn: ['patrol_riftborn'],
  fortress_gravorn: ['patrol_gravorn'],
  fortress_guardpost: ['patrol_guard_og', 'patrol_guard_rb'],
  fortress_rift: ['patrol_rift_rb', 'patrol_rift_gv'],
  fortress_aegis_trial: ['patrol_trial_rb'],
};
export const FORTRESS_SEAL_PROPS = ['seal_dawn', 'seal_noon', 'seal_dusk', 'seal_night'];

/** Kotak kaki prop (collision statis). Patroli, pintu dinding, lukisan dan hiasan datar tanpa collision. */
export function fortressFootRect(type, x, y) {
  const f = FORTRESS_FOOT[type];
  if (!f || f[0] <= 0) return null;
  return { x: x - f[0] / 2, y: y - f[1], w: f[0], h: f[1] };
}
export const FORTRESS_SOLIDS = FORTRESS_PROPS.map((p) => fortressFootRect(p.type, p.x, p.y)).filter(Boolean);

const P = Object.fromEntries(FORTRESS_PROPS.map((p) => [p.id, p]));
/** Interaktif di sekitar prop padat: kotak bertumpu pada kaki prop dan meluas 8 px ke bawah supaya kotak uji pemain menyentuhnya. */
const onProp = (id, kind, verb, propId, w = 44, h = 44) => ({ id, kind, verb, x: P[propId].x - w / 2, y: P[propId].y - h, w, h: h + 8 });
/** Interaktif di dinding utara ruang: kotak menempel pada tepi lantai (y = tepi atas lantai). */
const onWall = (id, kind, verb, x, floorTop, w = 56, h = 48) => ({ id, kind, verb, x: x - w / 2, y: floorTop - h + 8, w, h });

/** Interaktif. `id` menjadi id interaksi untuk FortressStory.interact. */
export const FORTRESS_INTERACTABLES = [
  // Gerbang Luar
  onProp('courier_a', 'object', 'Baca laporan', 'courier_a', 48, 48),
  onWall('outer_gate', 'object', 'Periksa gerbang', 896, 1984, 64, 40),
  onProp('outer_statue', 'object', 'Periksa patung', 'outer_statue_l', 44, 56),
  onProp('outer_cart', 'object', 'Periksa gerobak', 'outer_cart', 92, 40),
  // Aula Lonceng Berhenti
  onProp('bell', 'object', 'Periksa lonceng', 'bell', 140, 70),
  onProp('hall_lantern', 'object', 'Beristirahat', 'hall_lantern', 44, 60),
  onProp('seal_dawn', 'object', 'Periksa segel', 'seal_dawn', 40, 52),
  onProp('seal_noon', 'object', 'Periksa segel', 'seal_noon', 40, 52),
  onProp('seal_dusk', 'object', 'Periksa segel', 'seal_dusk', 40, 52),
  onProp('seal_night', 'object', 'Periksa segel', 'seal_night', 40, 52),
  onWall('bell_dial', 'object', 'Periksa cakram', 1170, 1424, 56, 52),
  onWall('door_seal', 'object', 'Periksa pintu', 896, 1424, 96, 44),
  onProp('trial_gate', 'object', 'Periksa gerbang besi', 'trial_gate', 56, 60),
  onWall('door_shortcut', 'object', 'Periksa pintu', 624, 1424, 96, 44),
  // bekas barak
  onWall('barracks_names', 'object', 'Baca nama', 396, 1568, 84, 44),
  onProp('barracks_bunk', 'object', 'Periksa ranjang', 'bk_bunk_b', 68, 44),
  onProp('barracks_table', 'object', 'Periksa meja', 'bk_table', 100, 40),
  onProp('chest_potion', 'chest', 'Buka peti', 'bk_chest', 40, 36),
  // Arsip Penjaga
  onProp('archive_log', 'object', 'Baca catatan jaga', 'ar_log', 40, 48),
  onProp('archive_relic', 'object', 'Periksa pusaka', 'ar_relic', 44, 52),
  onWall('archive_memorial', 'object', 'Periksa ceruk', 300, 1216, 56, 48),
  onProp('archive_cloak', 'object', 'Periksa jubah', 'ar_cloak', 40, 56),
  onProp('archive_shelf', 'object', 'Periksa rak', 'ar_shelf_2', 70, 60),
  onProp('chest_robe', 'chest', 'Buka peti', 'ar_chest', 40, 36),
  // Ruang Uji Segel
  onProp('trial_pedestal', 'object', 'Hadapi uji segel', 'tr_pedestal', 48, 56),
  onWall('trial_plaque', 'object', 'Baca prasasti', 1504, 1552, 84, 44),
  onProp('chest_plate', 'chest', 'Buka peti', 'tr_chest', 40, 36),
  // Koridor Retakan
  onProp('corridor_lantern', 'object', 'Beristirahat', 'corridor_lantern', 44, 60),
  onProp('anchor_a', 'object', 'Sentuh jangkar', 'anchor_a', 44, 52),
  onProp('anchor_b', 'object', 'Sentuh jangkar', 'anchor_b', 44, 52),
  // Serambi Heart
  onProp('lantern_rest', 'object', 'Beristirahat', 'lantern', 44, 60),
  onProp('courier_b', 'object', 'Baca laporan', 'courier_b', 48, 48),
  onWall('door_heart', 'object', 'Periksa pintu', 896, 480, 110, 48),
  // pintasan
  onProp('shortcut_lever', 'object', 'Tarik tuas', 'sc_lever', 40, 44),
  onWall('shortcut_window', 'object', 'Periksa celah', 520, 944, 52, 44),
  onProp('shortcut_note', 'object', 'Baca catatan', 'sc_note', 40, 48),
  // Ruang Heart
  onProp('heart_lock_yaric', 'object', 'Letakkan tangan', 'hr_pylon_y', 52, 64),
  onProp('heart_lock_velthia', 'object', 'Panggil Velthia', 'hr_pylon_v', 52, 64),
  onWall('heart_emblem', 'object', 'Periksa lambang', 896, 96, 80, 40),
  onWall('heart_window', 'object', 'Lihat jendela', 704, 96, 84, 44),
  { id: 'heart_seal', kind: 'object', verb: 'Periksa lantai', x: 838, y: 232, w: 116, h: 36 },
  // Ruang Gema
  onProp('echo_a', 'object', 'Periksa benda', 'echo_a', 44, 56),
  onProp('echo_b', 'object', 'Periksa benda', 'echo_b', 44, 56),
];

/** Pemicu (hanya saat MASUK). Tidak berpotongan dengan collision statis. */
export const FORTRESS_TRIGGERS = [
  ['fortress_court_fight', 640, 2090, 512, 20],
  ['fortress_hall_fight', 520, 1792, 752, 20],
  ['fortress_guardpost', 416, 1568, 16, 288],
  ['fortress_rift_fight', 800, 884, 192, 56],
  ['heart_confront', 576, 340, 640, 16],
  ['echo_enter', 1260, 228, 16, 56],
].map(([id, x, y, w, h]) => ({ id, x, y, w, h }));

/** Pemetaan pemicu pertarungan -> encounter (dipakai story, tes, dan lead). */
export const FORTRESS_TRIGGER_ENCOUNTER = {
  fortress_court_fight: 'fortress_riftborn',
  fortress_hall_fight: 'fortress_gravorn',
  fortress_guardpost: 'fortress_guardpost',
  fortress_rift_fight: 'fortress_rift',
  heart_confront: 'varlgrim',
};

/** Posisi sprite pemandangan tambahan yang dipakai FortressView dan generator. */
export const FORTRESS_LAYOUT = {
  heartSeal: { x: 896, y: 252 },
  bellCenter: { x: 896, y: 1650 },
  trialCircle: { x: 1504, y: 1690 },
  sundial: { x: 896, y: 1660 },
};

export function buildFortressMap() {
  return {
    id: 'fortress', width: FORTRESS_W, height: FORTRESS_H, tile: 32,
    spawn: { ...FORTRESS_SPAWN },
    clearing: { cx: 0, cy: 0, rx: 0, ry: 0 }, road: { y0: 0, y1: 0, startX: 0 }, zone: { start: 0, period: 0, copies: 0, wrapX: Infinity },
    trail: { localX: 0, gladeCY: 0, gladeRX: 0, gladeRY: 0, topY: 0, mouthY: 0 },
    props: [], // sengaja kosong: prop digambar oleh FortressView dari FORTRESS_PROPS (atlas fortress_props)
    npcs: [],
    walkable: FORTRESS_WALKABLE.map((w) => ({ ...w })),
    solidRects: FORTRESS_INITIAL_DYNAMIC.map((k) => ({ ...FORTRESS_DYNAMIC[k], dynamic: true })),
    interactables: FORTRESS_INTERACTABLES.map((i) => ({ ...i })),
    triggers: FORTRESS_TRIGGERS.map((t) => ({ ...t })),
  };
}
