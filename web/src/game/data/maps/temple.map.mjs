// Data peta Kuil Jejak (area `temple`, Chapter III), Phase 7. Murni (tanpa Phaser): dipakai game (world/templeMaps.ts,
// world/TempleView.ts), generator seni (scripts/gen-temple-art.mjs) dan tes. SATU sumber untuk geometri, penempatan prop,
// interaktif dan pemicu, sehingga seni dan collision tidak pernah berbeda.
//
// Ruang (utara = atas, 32 px/petak):
//   Aula Chronolith (hall)  <- gerbang aula (dinamis) <- Ruang Gerbang (ante) + perkemahan (camp, ceruk timur)
//   Lorong (corr)           menghubungkan Ruang Gerbang dengan Halaman Reruntuhan (court)
//   Halaman (court)         pintu barat -> Ruang Pilar (wchamber, teka-teki A), pintu timur -> Ruang Segel (echamber, teka-teki B)
//   Jalan masuk (approach)  dari hutan, di selatan halaman.
// Teka-teki: A = tiga pilar bergaris (urutan sesuai lukisan dinding), B = tiga cakram segel (yang disinari lampu yang berhenti),
//            C = tiga alas menghadap lingkaran di lantai gerbang (arah garis sesuai lukisan; alas ketiga ditutup belakangan).

export const TEMPLE_W = 1280;
export const TEMPLE_H = 1280;

/** Lantai yang dapat dilalui (tiap persegi = satu ruang); dinding digambar di luar persegi ini. */
export const TEMPLE_ROOMS = {
  hall: { x: 320, y: 128, w: 640, h: 272 },
  gate: { x: 592, y: 400, w: 96, h: 80 },
  ante: { x: 416, y: 480, w: 448, h: 256 },
  camp: { x: 864, y: 544, w: 192, h: 160 },
  corr: { x: 576, y: 736, w: 128, h: 96 },
  court: { x: 384, y: 832, w: 512, h: 288 },
  wdoor: { x: 320, y: 928, w: 64, h: 64 },
  wchamber: { x: 64, y: 832, w: 256, h: 288 },
  edoor: { x: 896, y: 928, w: 64, h: 64 },
  echamber: { x: 960, y: 832, w: 256, h: 288 },
  approach: { x: 608, y: 1120, w: 64, h: 160 },
};
export const TEMPLE_WALKABLE = Object.values(TEMPLE_ROOMS).map((r) => ({ shape: 'rect', ...r }));

/** Penghalang dinamis gerbang aula (aktif sampai flag gerbang terbuka). */
export const TEMPLE_GATE_SOLID = { id: 'hall_gate', x: 592, y: 424, w: 96, h: 56, dynamic: true };

/** Jejak kaki prop padat [w,h] (kaki di tengah-bawah titik prop). [0,0] = tanpa collision. */
const dials = {};
for (const k of ['dial', 'dialm']) for (let i = 0; i < 4; i++) for (const s of ['off', 'on', 'frozen']) dials[`${k}_${i}_${s}`] = [30, 14];
export const TEMPLE_FOOT = {
  column: [24, 12], column_broken: [24, 12], column_cracked: [24, 12], column_ringed: [24, 12], column_fallen: [72, 14],
  statue_guard: [28, 12], brazier_cold: [18, 10], fire_a: [40, 14], fire_b: [40, 14], crate_stack: [32, 14], pack: [14, 8], log_seat: [32, 10],
  bedroll_a: [0, 0], bedroll_b: [0, 0],
  pillar_a1_off: [26, 12], pillar_a1_on: [26, 12], pillar_a2_off: [26, 12], pillar_a2_on: [26, 12], pillar_a3_off: [26, 12], pillar_a3_on: [26, 12],
  disc_b1_off: [0, 0], disc_b1_on: [0, 0], disc_b2_off: [0, 0], disc_b2_on: [0, 0], disc_b3_off: [0, 0], disc_b3_on: [0, 0],
  ...dials,
  gate_closed: [0, 0], gate_half: [0, 0], gate_open: [0, 0], gate_lamp_off: [0, 0], gate_lamp_on: [0, 0],
  lamp_frozen: [14, 8], chronolith_dormant: [112, 22], chronolith_wake: [112, 22], chronolith_still: [112, 22],
  record_plaque: [0, 0], exit_door: [0, 0], plinth: [24, 10], note_lectern: [22, 10], sign_back: [12, 8],
  shrub: [28, 10], fern: [0, 0], fern_b: [0, 0], rubble_a: [30, 10], rubble_b: [0, 0], vine_a: [0, 0], vine_b: [0, 0],
  chips_a: [0, 0], chips_b: [0, 0], oathguard_a: [0, 0], oathguard_b: [0, 0], wisplet_a: [0, 0], wisplet_b: [0, 0], wisplet_c: [0, 0],
};

/** Jenis yang digambar datar di bawah karakter (tidak di-sort dengan y). */
export const TEMPLE_DECALS = ['bedroll_a', 'bedroll_b', 'rubble_b', 'fern', 'fern_b'];
/** Jenis yang menggantung/di dinding: depth mengikuti titik dasarnya, tanpa footprint. */
export const TEMPLE_OVERHEAD = ['chips_a', 'chips_b', 'wisplet_a', 'wisplet_b', 'wisplet_c'];

export const TEMPLE_SPAWN = { x: 640, y: 1088, facing: 'up' };
export const TEMPLE_FROM_FOREST = { x: 640, y: 1240, facing: 'up' };
/** Titik kembali aman (di luar zona pemicu) setelah pertarungan di kuil; WorldScene menaruh pemain di sini sebelum battle. */
export const TEMPLE_BATTLE_RETURN = {
  temple_oathguard: { x: 552, y: 1000, facing: 'left' },
  temple_mixed: { x: 568, y: 648, facing: 'left' },
  chronolith: { x: 640, y: 392, facing: 'up' },
};

/** [id, type, x, y]: titik dasar prop. Urutan: halaman, lorong, ruang gerbang, perkemahan, ruang pilar, ruang segel, aula. */
export const TEMPLE_PROPS = [
  // ---- jalan masuk dan halaman reruntuhan ----
  ['sign_back', 'sign_back', 590, 1236],
  ['court_col_a', 'column_broken', 590, 1136], ['court_col_b', 'column', 692, 1136],
  ['court_col_nw', 'column', 432, 868], ['court_col_ne', 'column', 848, 868],
  ['court_col_sw', 'column_broken', 440, 1104], ['court_col_se', 'column_broken', 858, 1100],
  ['court_fallen', 'column_fallen', 770, 1084],
  ['statue_w', 'statue_guard', 512, 884], ['statue_e', 'statue_guard', 768, 884],
  ['note_lectern', 'note_lectern', 576, 1004],
  ['court_shrub_a', 'shrub', 410, 852], ['court_shrub_b', 'shrub', 876, 1108], ['court_shrub_c', 'shrub', 400, 1000 + 60],
  ['court_rubble', 'rubble_a', 480, 1010], ['court_rubble_b', 'rubble_b', 820, 1010], ['court_rubble_c', 'rubble_b', 520, 1088],
  ['court_fern_a', 'fern', 404, 940], ['court_fern_b', 'fern_b', 884, 944], ['court_fern_c', 'fern', 690, 1100], ['court_fern_d', 'fern_b', 520, 850],
  ['court_chips_a', 'chips_a', 700, 952], ['court_chips_b', 'chips_b', 590, 924],
  ['court_vine_a', 'vine_a', 470, 832], ['court_vine_b', 'vine_b', 820, 832],
  ['patrol1_og', 'oathguard_a', 456, 1052],
  // ---- lorong ----
  ['corr_vine', 'vine_b', 590, 736],
  // ---- ruang gerbang ----
  ['gate', 'gate_closed', 640, 480],
  ['gate_lamp_a', 'gate_lamp_off', 612, 414], ['gate_lamp_b', 'gate_lamp_off', 640, 414], ['gate_lamp_c', 'gate_lamp_off', 668, 414],
  ['ante_brazier_l', 'brazier_cold', 588, 514], ['ante_brazier_r', 'brazier_cold', 692, 514],
  ['c_dial_l', 'dial_3_frozen', 552, 572], ['c_dial_r', 'dial_1_frozen', 728, 572], ['c_dial_m', 'dialm_2_frozen', 640, 652],
  ['ante_cracked', 'column_cracked', 448, 600],
  ['ante_col_sw', 'column', 440, 724], ['ante_col_se', 'column', 840, 724], ['ante_col_nw', 'column', 432, 508], ['ante_col_ne', 'column', 848, 508],
  ['ante_chips_a', 'chips_a', 700, 640], ['ante_chips_b', 'chips_b', 580, 690],
  ['ante_fern_a', 'fern', 424, 700], ['ante_fern_b', 'fern_b', 856, 690], ['ante_rubble', 'rubble_b', 800, 650],
  ['ante_vine_a', 'vine_a', 424, 480], ['ante_vine_b', 'vine_b', 862, 480],
  ['patrol2_og', 'oathguard_a', 472, 648], ['patrol2_w1', 'wisplet_a', 506, 626], ['patrol2_w2', 'wisplet_b', 452, 672],
  // ---- perkemahan ----
  ['fire', 'fire_a', 960, 636], ['camp_seat_w', 'log_seat', 912, 664], ['camp_seat_e', 'log_seat', 1008, 664],
  ['camp_bed_a', 'bedroll_a', 912, 592], ['camp_bed_b', 'bedroll_b', 1010, 596],
  ['camp_crate', 'crate_stack', 1030, 566], ['camp_pack', 'pack', 890, 640],
  ['camp_vine', 'vine_a', 1000, 544], ['camp_fern', 'fern', 1040, 690],
  // ---- ruang pilar (teka-teki A) ----
  ['a_pillar_3', 'pillar_a3_off', 128, 928], ['a_pillar_1', 'pillar_a1_off', 192, 1000], ['a_pillar_2', 'pillar_a2_off', 256, 928],
  ['w_brazier_l', 'brazier_cold', 98, 872], ['w_brazier_r', 'brazier_cold', 288, 872],
  ['w_rubble', 'rubble_a', 110, 1084], ['w_fern_a', 'fern', 296, 1090], ['w_fern_b', 'fern_b', 84, 1000],
  ['w_chips', 'chips_b', 192, 904], ['w_vine_a', 'vine_a', 106, 832], ['w_vine_b', 'vine_b', 290, 832],
  // ---- ruang segel (teka-teki B) ----
  ['b_disc_1', 'disc_b1_off', 1024, 826], ['b_disc_2', 'disc_b2_off', 1088, 826], ['b_disc_3', 'disc_b3_off', 1152, 826],
  ['b_lamp', 'lamp_frozen', 1032, 1004],
  ['e_brazier_l', 'brazier_cold', 990, 1092], ['e_brazier_r', 'brazier_cold', 1186, 1092],
  ['e_col_se', 'column_broken', 1190, 868], ['e_rubble', 'rubble_a', 1160, 1040], ['e_fern_a', 'fern', 976, 870], ['e_fern_b', 'fern_b', 1200, 1100],
  ['e_chips', 'chips_a', 1100, 900], ['e_vine_a', 'vine_a', 1000, 832], ['e_vine_b', 'vine_b', 1196, 832],
  // ---- aula Chronolith ----
  ['chronolith', 'chronolith_dormant', 640, 296],
  ['hall_col_nw', 'column', 368, 200], ['hall_col_sw', 'column', 368, 320], ['hall_col_ne', 'column', 912, 200], ['hall_col_se', 'column', 912, 320],
  ['hall_ringed', 'column_ringed', 552, 384], ['hall_brazier_r', 'brazier_cold', 728, 384],
  ['hall_plinth', 'plinth', 880, 372],
  ['record', 'record_plaque', 448, 124], ['exit_door', 'exit_door', 832, 124],
  ['hall_chips_a', 'chips_a', 570, 252], ['hall_chips_b', 'chips_b', 714, 232], ['hall_chips_c', 'chips_a', 640, 186],
  ['hall_fern', 'fern', 340, 380], ['hall_rubble', 'rubble_b', 930, 260], ['hall_vine_a', 'vine_a', 360, 128], ['hall_vine_b', 'vine_b', 940, 128],
].map(([id, type, x, y]) => ({ id, type, x, y }));

/** Prop dinamis yang diubah TempleView (id -> peran). */
export const TEMPLE_PATROLS = {
  temple_oathguard: ['patrol1_og'],
  temple_mixed: ['patrol2_og', 'patrol2_w1', 'patrol2_w2'],
};

/** Kotak kaki prop (collision statis). Patroli, lukisan dinding dan hiasan datar tanpa collision. */
export function templeFootRect(type, x, y) {
  const f = TEMPLE_FOOT[type];
  if (!f || f[0] <= 0) return null;
  return { x: x - f[0] / 2, y: y - f[1], w: f[0], h: f[1] };
}
export const TEMPLE_SOLIDS = TEMPLE_PROPS.map((p) => templeFootRect(p.type, p.x, p.y)).filter(Boolean);

/** Interaktif: [id, kind, verb, x, y, w, h]. Kotak berada di atas tepi lantai yang berdekatan agar kotak uji pemain menyentuhnya. */
export const TEMPLE_INTERACTABLES = [
  ['temple_exit', 'sign', 'Baca papan', 566, 1212, 50, 34],
  ['inspect_1', 'object', 'Periksa lukisan', 428, 792, 112, 44],
  ['temple_note', 'object', 'Baca catatan', 556, 976, 40, 34],
  ['inspect_2', 'object', 'Periksa relief', 330, 880, 44, 40],
  ['a_mural', 'object', 'Periksa lukisan', 128, 792, 128, 44],
  ['a_pillar_1', 'object', 'Periksa pilar', 172, 966, 40, 42],
  ['a_pillar_2', 'object', 'Periksa pilar', 236, 894, 40, 42],
  ['a_pillar_3', 'object', 'Periksa pilar', 108, 894, 40, 42],
  ['b_lamp', 'object', 'Periksa lampu', 1012, 972, 40, 40],
  ['b_disc_1', 'object', 'Periksa segel', 1006, 796, 36, 40],
  ['b_disc_2', 'object', 'Periksa segel', 1070, 796, 36, 40],
  ['b_disc_3', 'object', 'Periksa segel', 1134, 796, 36, 40],
  ['c_mural_l', 'object', 'Periksa lukisan', 476, 452, 72, 34],
  ['c_mural_r', 'object', 'Periksa lukisan', 732, 452, 72, 34],
  ['inspect_3', 'object', 'Periksa lingkaran', 612, 548, 56, 48],
  ['c_dial_l', 'object', 'Putar alas', 530, 538, 44, 40],
  ['c_dial_r', 'object', 'Putar alas', 706, 538, 44, 40],
  ['c_dial_m', 'object', 'Putar alas', 618, 618, 44, 40],
  ['temple_camp', 'object', 'Beristirahat', 934, 606, 52, 40],
  ['chronolith', 'object', 'Hadapi', 596, 250, 88, 50],
  ['inspect_4', 'object', 'Periksa cincin', 530, 350, 44, 40],
  ['hall_record', 'object', 'Baca catatan', 420, 92, 56, 40],
  ['hall_exit', 'object', 'Ke pintu keluar', 812, 84, 40, 50],
].map(([id, kind, verb, x, y, w, h]) => ({ id, kind, verb, x, y, w, h }));

/** Pemicu (hanya saat MASUK). Tidak berpotongan dengan collision. */
export const TEMPLE_TRIGGERS = [
  ['temple_fight1', 416, 1016, 80, 72],
  ['temple_fight2', 440, 608, 80, 80],
  ['temple_chamber_w', 332, 932, 20, 56],
  ['temple_chamber_e', 906, 932, 20, 56],
  ['temple_inner', 592, 760, 96, 16],
  ['temple_chronolith', 352, 328, 576, 24],
].map(([id, x, y, w, h]) => ({ id, x, y, w, h }));

/** Posisi sprite pemandangan tambahan yang dipakai TempleView dan generator. */
export const TEMPLE_LAYOUT = {
  floorCircle: { x: 640, y: 572 },
  lampSource: { x: 1073, y: 962 },
  beamTarget: { x: 1152, y: 808 },
  hallCenter: { x: 640, y: 296 },
};

export function buildTempleMap() {
  return {
    id: 'temple', width: TEMPLE_W, height: TEMPLE_H, tile: 32,
    spawn: { ...TEMPLE_SPAWN },
    clearing: { cx: 0, cy: 0, rx: 0, ry: 0 }, road: { y0: 0, y1: 0, startX: 0 }, zone: { start: 0, period: 0, copies: 0, wrapX: Infinity },
    trail: { localX: 0, gladeCY: 0, gladeRX: 0, gladeRY: 0, topY: 0, mouthY: 0 },
    props: [], // sengaja kosong: prop digambar oleh TempleView dari TEMPLE_PROPS (atlas temple_props), bukan oleh render prop Hutan 1
    npcs: [],
    walkable: TEMPLE_WALKABLE.map((w) => ({ ...w })),
    solidRects: [{ ...TEMPLE_GATE_SOLID }],
    interactables: TEMPLE_INTERACTABLES.map((i) => ({ ...i })),
    triggers: TEMPLE_TRIGGERS.map((t) => ({ ...t })),
  };
}
