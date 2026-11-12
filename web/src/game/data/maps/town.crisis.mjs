// Tata letak krisis Aveloria (Chapter III). Dipakai runtime (AveloriaCrisisView) dan pratinjau generator (scripts/town-art/crisis-preview.mjs).
// Murni data + fungsi tanpa Phaser dan tanpa nama flag (nama flag hanya di story/chapter3Flags.ts; tahap diturunkan di world/aveloriaCrisis.ts).
// Semua koordinat = titik pijak dunia (tengah-bawah). Hanya visual kecuali `sol` (jejak tabrakan dinamis, dipasang view).

export const CRISIS_ATLAS = 'town_crisis';
/** Urutan tahap krisis (indeks naik = cerita maju). 'pre' = Bab III belum mulai (view krisis tidak aktif). */
export const CRISIS_STAGES = ['pre', 'start', 'crisisSeen', 'azieDemand', 'velthiaRefuses', 'evacOrdered', 'evacDone', 'decision', 'torvanStays', 'velthiaJoined', 'departed'];
export const stageIndex = (s) => CRISIS_STAGES.indexOf(s);
export const atLeast = (s, min) => stageIndex(s) >= stageIndex(min);

/** Tingkat retakan 1..3 (makin parah seiring cerita); item krisis muncul mulai `lvl`. */
export function crisisLevel(stage) {
  if (atLeast(stage, 'decision')) return 3;
  if (atLeast(stage, 'velthiaRefuses')) return 2;
  return 1;
}

// ---------------------------------------------------------------------------------------------------------------------
// Item statis. kind: decal (tanah), shadow (bayangan salah arah), float (batu melayang), clock, flame, water, banner, basket,
// cart, bundle. `from` = tahap minimal (alternatif `lvl`).
// ---------------------------------------------------------------------------------------------------------------------
export const CRISIS_ITEMS = [
  // --- retakan paving dengan inti emas pucat ---
  { kind: 'decal', f: 'crisis_seam_long', x: 640, y: 762, lvl: 1 },
  { kind: 'decal', f: 'crisis_seam_diag', x: 715, y: 930, lvl: 1 },
  { kind: 'decal', f: 'crisis_seam_court', x: 700, y: 566, lvl: 2 },
  { kind: 'decal', f: 'crisis_seam_market', x: 385, y: 982, lvl: 2 },
  { kind: 'decal', f: 'crisis_seam_gate', x: 610, y: 1086, lvl: 3 },
  { kind: 'decal', f: 'crisis_seam_east', x: 900, y: 862, lvl: 3 },
  // --- bayangan yang jatuh ke arah salah (kiri-atas) di samping bayangan asli ---
  { kind: 'shadow', f: 'crisis_shadow_tower', x: 824, y: 544, lvl: 1 },
  { kind: 'shadow', f: 'crisis_shadow_lamp', x: 574, y: 760, lvl: 1 },
  { kind: 'shadow', f: 'crisis_shadow_lamp', x: 706, y: 760, lvl: 1 },
  { kind: 'shadow', f: 'crisis_shadow_banner', x: 556, y: 836, lvl: 1 },
  { kind: 'shadow', f: 'crisis_shadow_banner', x: 702, y: 836, lvl: 1 },
  { kind: 'shadow', f: 'crisis_shadow_well', x: 472, y: 880, lvl: 2 },
  { kind: 'shadow', f: 'crisis_shadow_lamp', x: 574, y: 1032, lvl: 2 },
  // --- batu melayang (membeku pada langkah kuantisasi; bergeser 1 px tersendat) ---
  { kind: 'float', f: 'crisis_stone_a', x: 622, y: 772, lift: 26, s: 'crisis_fshadow_m', lvl: 1 },
  { kind: 'float', f: 'crisis_stone_b', x: 670, y: 752, lift: 36, s: 'crisis_fshadow_s', lvl: 1 },
  { kind: 'float', f: 'crisis_stone_d', x: 556, y: 790, lift: 20, s: 'crisis_fshadow_s', lvl: 1 },
  { kind: 'float', f: 'crisis_stone_c', x: 702, y: 910, lift: 30, s: 'crisis_fshadow_m', lvl: 1 },
  { kind: 'float', f: 'crisis_stone_d', x: 748, y: 952, lift: 22, s: 'crisis_fshadow_s', lvl: 2 },
  { kind: 'float', f: 'crisis_stone_b', x: 690, y: 572, lift: 28, s: 'crisis_fshadow_s', lvl: 2 },
  { kind: 'float', f: 'crisis_stone_c', x: 424, y: 1034, lift: 36, s: 'crisis_fshadow_m', lvl: 2 },
  { kind: 'float', f: 'crisis_stone_a', x: 592, y: 1074, lift: 34, s: 'crisis_fshadow_m', lvl: 3 },
  { kind: 'float', f: 'crisis_stone_d', x: 676, y: 1092, lift: 26, s: 'crisis_fshadow_s', lvl: 3 },
  { kind: 'float', f: 'crisis_stone_c', x: 884, y: 866, lift: 30, s: 'crisis_fshadow_m', lvl: 3 },
  // --- jam menara: jarum menit mencoba maju lalu dilempar kembali; pada tahap parah jarum jam ikut bergetar ---
  { kind: 'clock', x: 824, y: 465, lvl: 1 },
  // --- lampu: api membeku di satu pose / tersendat antara dua pose ---
  { kind: 'flame', x: 574, y: 760, mode: 'stutter', lvl: 1 },
  { kind: 'flame', x: 706, y: 760, mode: 'frozen', pose: 'crisis_flame_l', lvl: 1 },
  { kind: 'flame', x: 592, y: 476, mode: 'frozen', pose: 'crisis_flame_r', lvl: 2 },
  { kind: 'flame', x: 688, y: 476, mode: 'stutter', lvl: 2 },
  { kind: 'flame', x: 574, y: 1032, mode: 'stutter', lvl: 3 },
  // --- air sumur yang menggantung ---
  { kind: 'water', x: 472, y: 857, lvl: 1 },
  // --- panji yang berkibar dalam putaran (tersendat kembali ke pose awal) ---
  { kind: 'banner', x: 556, y: 836, phase: 0, sol: [-4, -3, 8, 3], lvl: 1 },
  { kind: 'banner', x: 702, y: 836, phase: 2, sol: [-4, -3, 8, 3], lvl: 1 },
  // --- keranjang dan apel yang menggantung di dekat penjual ---
  { kind: 'basket', x: 284, y: 906, lvl: 2 },
  // --- sisa pengungsian ---
  { kind: 'cart', f: 'crisis_cart_loaded', x: 480, y: 1066, sol: [-34, -10, 62, 10], from: 'evacOrdered' },
  { kind: 'bundle', f: 'crisis_bundle_a', x: 438, y: 1014, from: 'evacOrdered' },
  { kind: 'bundle', f: 'crisis_bundle_b', x: 826, y: 1006, from: 'evacOrdered' },
  { kind: 'bundle', f: 'crisis_bundle_c', x: 322, y: 1012, from: 'evacOrdered' },
  { kind: 'bundle', f: 'crisis_bundle_b', x: 700, y: 640, from: 'evacDone' },
];

export const itemVisible = (it, stage) => (it.from ? atLeast(stage, it.from) : crisisLevel(stage) >= (it.lvl ?? 1));

// ---------------------------------------------------------------------------------------------------------------------
// Jalur evakuasi. Titik pertama = posisi awal. end: 'exit' (keluar lewat gerbang, hilang), 'stay' (berhenti di titik kumpul),
// 'post' (penjaga bersiaga). Semua titik harus dapat dipijak (diuji di tests/unit/aveloria-crisis-routes).
// ---------------------------------------------------------------------------------------------------------------------
const GATE_EXIT = [[640, 1170], [640, 1200], [640, 1300], [640, 1362]];
export const WALKERS = [
  { id: 'sweeper', variant: 'sweeper', interact: 'sweeper', role: 'work-sweep', facing: 'down', delay: 0, speed: 76, end: 'exit',
    route: [[736, 720], [736, 790], [750, 860], [740, 930], [740, 990], [728, 1064], [690, 1098], [650, 1130], ...GATE_EXIT] },
  { id: 'porter', variant: 'porter', interact: 'porter', role: 'work-carry', facing: 'down', delay: 1.2, speed: 72, end: 'exit',
    route: [[736, 1024], [728, 1064], [690, 1098], [650, 1130], ...GATE_EXIT] },
  { id: 'vendor', variant: 'vendor', interact: 'vendor', role: 'work-sort', facing: 'up', delay: 2.5, speed: 66, end: 'exit',
    route: [[232, 936], [330, 946], [420, 962], [520, 990], [596, 1000], [624, 1032], [640, 1100], [640, 1140], ...GATE_EXIT] },
  { id: 'noble_a', variant: 'noble_a', interact: 'c3_noble', role: 'audience', facing: 'right', delay: 3.5, speed: 60, end: 'exit',
    route: [[592, 584], [600, 640], [612, 700], [620, 780], [626, 860], [636, 930], [634, 1000], [640, 1060], [640, 1110], [640, 1150], ...GATE_EXIT] },
  { id: 'noble_b', variant: 'noble_b', role: 'audience', facing: 'left', delay: 4.6, speed: 58, end: 'exit',
    route: [[720, 584], [704, 640], [680, 700], [664, 780], [664, 860], [660, 930], [664, 1000], [664, 1060], [656, 1110], [648, 1150], ...GATE_EXIT] },
  { id: 'citizen_a', variant: 'citizen_a', role: 'look', facing: 'down', delay: 6, speed: 70, end: 'stay',
    route: [[860, 960], [842, 1020], [830, 1060], [790, 1074], [700, 1080], [640, 1070], [604, 1050]] },
  { id: 'citizen_c', variant: 'citizen_c', role: 'look', facing: 'left', delay: 8, speed: 62, end: 'stay',
    route: [[1000, 850], [940, 885], [880, 925], [840, 990], [830, 1060], [790, 1074], [700, 1080], [640, 1072], [600, 1056], [552, 1048], [552, 1014]] },
  { id: 'citizen_b', variant: 'citizen_b', role: 'look', facing: 'right', delay: 9.5, speed: 68, end: 'stay',
    route: [[390, 740], [470, 780], [545, 820], [548, 900], [552, 960], [548, 1006], [530, 1030], [520, 1060]] },
  { id: 'guard', variant: 'guard', interact: 'guard', role: 'watch', facing: 'down', delay: 0.6, speed: 84, end: 'post',
    route: [[752, 560], [740, 600], [740, 640], [730, 700], [722, 780], [724, 850], [726, 930], [736, 990], [738, 1062], [780, 1068]] },
];
export const MAX_EVAC_WALKERS = 10;
/** Penumpukan di titik aman (setelah evakuasi) dan posisi akhir penjaga. */
export const GATHER = { citizen_a: { x: 604, y: 1050, facing: 'left' }, citizen_c: { x: 552, y: 1014, facing: 'down' }, citizen_b: { x: 520, y: 1060, facing: 'right' }, guard: { x: 780, y: 1068, facing: 'down' } };
/** Jalur Torvan membantu membawa peti pasar -> kereta di titik aman (bolak-balik, jeda di ujung). */
export const TORVAN_LOOP = [[424, 968], [586, 1066]];
export const GATE_GUARD = { x: 676, y: 1152, facing: 'down' };

/** Posisi bernama untuk NPC bernama pada tiap tahap (Velthia 'follow' = pengikut pemain). */
export function crisisNpcSpots(stage) {
  const i = stageIndex(stage);
  const council = { velthia: { x: 640, y: 250, facing: 'down' }, azie: { x: 584, y: 268, facing: 'right' }, talric: { x: 696, y: 268, facing: 'left' } };
  const court = { velthia: { x: 656, y: 536, facing: 'down' }, azie: { x: 736, y: 632, facing: 'left' }, talric: { x: 584, y: 556, facing: 'right' } };
  let spots;
  if (i < stageIndex('evacOrdered')) spots = court;
  else if (i < stageIndex('evacDone')) spots = { velthia: council.velthia, azie: council.azie, talric: { x: 604, y: 1152, facing: 'down' } };
  else if (i < stageIndex('decision')) spots = council;
  else spots = { velthia: 'follow', azie: { x: 676, y: 1100, facing: 'down' }, talric: { x: 604, y: 1152, facing: 'down' } };
  const torvanCamp = { x: 576, y: 1064, facing: 'left' };
  return { ...spots, torvan: i >= stageIndex('evacDone') ? torvanCamp : null, gateGuard: i >= stageIndex('evacOrdered') ? GATE_GUARD : null };
}

/** Tahap tempat citizen/guard jalan berjalan (streaming) dan tahap akhir. */
export const walkersMode = (stage) => (stageIndex(stage) < stageIndex('evacOrdered') ? 'work' : stageIndex(stage) < stageIndex('evacDone') ? 'stream' : 'done');

/** Posisi kerja (sebelum evakuasi): titik awal route (+ gerak kerja kecil di view). Nobles hanya ada di tahap sebelum evakuasi. */
export const walkerStart = (w) => ({ x: w.route[0][0], y: w.route[0][1] });
export const walkerFinal = (w, stage) => {
  const mode = walkersMode(stage);
  if (mode === 'work') return { ...walkerStart(w), visible: true };
  if (mode === 'stream') return { ...walkerStart(w), visible: true };
  if (w.end === 'exit') return { x: 640, y: 1362, visible: false };
  const g = GATHER[w.id];
  return { x: g.x, y: g.y, facing: g.facing, visible: true };
};

/** Jalur gerak skrip untuk adegan (Velthia/Azie ke ruang pertemuan, Talric ke gerbang). Titik harus lolos collision. */
export const SCRIPT_PATHS = {
  velthiaToCouncil: [[656, 536], [640, 470], [640, 380], [640, 330], [640, 250]],
  azieToCouncil: [[736, 632], [704, 580], [660, 500], [640, 420], [620, 340], [584, 268]],
  talricToGate: [[584, 556], [600, 600], [612, 660], [622, 740], [632, 840], [640, 960], [640, 1060], [622, 1110], [604, 1152]],
  talricToCouncil: [[604, 1152], [622, 1110], [640, 1060], [640, 960], [632, 840], [622, 740], [612, 660], [630, 560], [640, 440], [640, 340], [696, 268]],
};
