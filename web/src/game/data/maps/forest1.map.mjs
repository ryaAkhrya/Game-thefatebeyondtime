// Data peta Hutan 1 (Chapter I). Builder MURNI, dipakai bersama oleh game (forest1.ts) dan generator art
// (scripts/gen-forest-art.mjs) agar peta dan gambar tidak pernah tidak sinkron. Satuan: piksel dunia (petak = 32 px).
//
// Tata letak (timur = kanan):
//   [Tempat bangun (clearing)] -> gerbang tak terlihat (hingga story.c1_awake) -> Nambo -> LORONG BERULANG
//   Lorong memiliki dekorasi PERIODIK (periode 24 petak): papan, pepohonan, dan mulut jalan setapak identik tiap periode,
//   sehingga pemain melihat "papan yang sama" lagi. Mulut jalan setapak tertutup semak berduri sampai pemain menyadari
//   pengulangan; sesudahnya jalan setapak -> glade (peti) -> keluar utara = akhir demo Phase 1.
//
// Polish Sprint 2: penempatan prop kini DIRANCANG (set piece + sabuk pohon berlapis), bukan sebar acak. Semua posisi
// cerita (spawn, papan, peti, pedang, semak, Nambo, pemicu) tidak berubah; hanya dekorasi visual.

export const TILE = 32;
export const MAP_W_TILES = 60;
export const MAP_H_TILES = 28;
export const ZONE_START_TILE = 12; // awal zona periodik
export const PERIOD_TILES = 24;
export const WRAP_X_TILE = 48; // pemain yang melewati x ini digeser -PERIOD (hanya sebelum loop selesai)

/**
 * Jejak tapak (w,h) di dasar tiap tipe prop; titik acuan sprite = tengah-bawah. Jejak = pangkal batang/badan saja,
 * kanopi tidak pernah menghalangi. Prop datar (pakis, rumput, bunga, jamur) tidak padat.
 */
export const FOOT = {
  tree_a: [22, 12],
  tree_b: [20, 12],
  tree_c: [22, 12],
  tree_birch: [12, 10],
  tree_twin: [34, 12],
  tree_sapling: [10, 8],
  tree_pine: [14, 10],
  tree_fir: [14, 10],
  tree_dead: [14, 10],
  rock_l: [48, 20],
  rock_s: [26, 12],
  rock_slab: [26, 12],
  rock_c: [34, 12],
  bush: [32, 12],
  bush_hedge: [52, 12],
  bush_berry: [30, 12],
  stump: [26, 12],
  log: [84, 14],
  sign: [14, 8],
  chest_closed: [28, 12],
  chest_open: [28, 12],
  sword: [10, 6],
  marker_stone: [24, 10],
  thicket_closed: [0, 0],
  thicket_open: [0, 0],
  fern: [0, 0],
  fern_b: [0, 0],
  tuft_a: [0, 0],
  tuft_b: [0, 0],
  flowers: [0, 0],
  flowers_y: [0, 0],
  flowers_v: [0, 0],
  mushrooms: [0, 0],
  mushrooms_b: [0, 0],
};

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Jenis pohon bernaungan (kanopi tinggi) yang dipakai sabuk latar. Tiap jenis siluetnya berbeda. */
const CANOPY_TYPES = ['tree_a', 'tree_b', 'tree_c', 'tree_pine', 'tree_twin', 'tree_fir', 'tree_birch'];

/**
 * Lapisan latar: baris pohon dengan jarak tidak teratur, jenis tidak pernah sama dengan tetangga, kadang celah.
 * Deterministik. `keep(u,y)` menolak titik (mis. di jalan setapak / glade).
 */
function treeRow(list, rnd, { u0, u1, y, dy, gap, skipP, keep, types = CANOPY_TYPES, weights }) {
  let u = u0 + rnd() * gap * 0.6;
  let prev = '', prev2 = '';
  while (u < u1) {
    const yy = y + (rnd() - 0.5) * 2 * dy;
    if (rnd() >= skipP && keep(u, yy)) {
      let t;
      let guard = 0;
      do {
        // pilih berbobot, tolak jenis yang sama dengan dua tetangga terakhir
        const w = weights ?? types.map(() => 1);
        let r = rnd() * w.reduce((a, b) => a + b, 0);
        let k = 0;
        for (; k < types.length - 1; k++) { r -= w[k]; if (r <= 0) break; }
        t = types[k];
      } while ((t === prev || t === prev2) && ++guard < 12);
      list.push({ type: t, u, y: Math.round(yy) });
      prev2 = prev;
      prev = t;
    }
    u += gap * (0.75 + rnd() * 0.55);
  }
}

export function buildForest1() {
  const W = MAP_W_TILES * TILE;
  const H = MAP_H_TILES * TILE;
  const zs = ZONE_START_TILE * TILE;
  const P = PERIOD_TILES * TILE;

  const roadY0 = 15 * TILE; // 480
  const roadY1 = 17 * TILE; // 544  (jalan = baris 15-16)
  const trailLocalX = 14 * TILE; // pusat jalan setapak, koordinat lokal periode (448)
  const gladeCY = 6 * TILE;
  const gladeRX = 3.5 * TILE, gladeRY = 2.9 * TILE;

  /** @type {{id:string,type:string,x:number,y:number,solid?:boolean,state?:string,copy?:number}[]} */
  const props = [];
  const add = (type, x, y, extra = {}) => props.push({ id: `${type}_${props.length}`, type, x: Math.round(x), y: Math.round(y), ...extra });

  // ---------- Dekorasi periodik (koordinat lokal u dalam [0,P)) ----------
  const local = []; // {type, u, y, role?}
  const L = (type, u, y, role) => local.push(role ? { type, u, y, role } : { type, u, y });
  const nearTrail = (u, pad) => Math.abs(u - trailLocalX) < pad;
  const inGlade = (u, y, pad = 0) => ((u - trailLocalX) / (gladeRX + pad)) ** 2 + ((y - gladeCY) / (gladeRY + pad)) ** 2 < 1;
  // kanopi pohon yang basisnya di (u,y) menjulang ke utara; tolak bila pusat kanopi jatuh di glade (glade harus tetap terbuka)
  const crownHitsGlade = (u, y) => inGlade(u, y - 78, 34) || inGlade(u, y, 14);
  const rnd = mulberry32(20261111);

  // --- Sabuk utara dekat jalan (N1): batang berdiri di tepi koridor, kanopi menjulang ke atas. Tangan-susun. ---
  for (const [t, u, y] of [
    ['tree_b', 24, 432], ['tree_birch', 88, 440], ['tree_a', 146, 430], ['tree_pine', 262, 426], ['tree_sapling', 316, 444],
    ['tree_c', 356, 424], ['tree_fir', 378, 402], ['tree_b', 534, 410], ['tree_twin', 584, 430], ['tree_pine', 664, 434],
    ['tree_birch', 712, 440], ['tree_a', 744, 428],
  ]) L(t, u, y);

  // --- Sabuk utara lapis 2-4: baris latar berjarak tidak teratur (terlihat sebagai kanopi bertumpuk di atas N1 dan di sekitar jalan setapak) ---
  const keepFar = (u, y) => !(nearTrail(u, 74) && y > 100) && !crownHitsGlade(u, y);
  treeRow(local, rnd, { u0: 0, u1: P, y: 344, dy: 14, gap: 84, skipP: 0.06, keep: (u, y) => !nearTrail(u, 70) && !crownHitsGlade(u, y) });
  treeRow(local, rnd, { u0: 30, u1: P, y: 268, dy: 18, gap: 80, skipP: 0.08, keep: keepFar });
  treeRow(local, rnd, { u0: 10, u1: P, y: 196, dy: 18, gap: 80, skipP: 0.08, keep: keepFar });
  treeRow(local, rnd, { u0: 50, u1: P, y: 128, dy: 14, gap: 78, skipP: 0.08, keep: keepFar });
  treeRow(local, rnd, { u0: 20, u1: P, y: 66, dy: 12, gap: 74, skipP: 0.04, keep: (u, y) => !nearTrail(u, 76) });

  // --- Sabuk selatan: S1 menampakkan kanopi di tepi bawah layar, S2 di belakangnya ---
  treeRow(local, rnd, { u0: 14, u1: P, y: 726, dy: 5, gap: 72, skipP: 0.1, keep: () => true });
  treeRow(local, rnd, { u0: 44, u1: P, y: 806, dy: 10, gap: 76, skipP: 0.06, keep: () => true });

  // --- Tepi jalan utara: tanaman bawah penghalus (tidak menutup koridor) ---
  for (const [t, u, y] of [
    ['fern', 56, 454], ['tuft_a', 118, 458], ['flowers', 172, 456], ['fern_b', 218, 452], ['bush_hedge', 300, 450], ['tuft_b', 340, 458],
    ['bush_berry', 398, 454], ['fern', 506, 456], ['tuft_a', 560, 458], ['mushrooms_b', 624, 458], ['flowers_y', 690, 456], ['fern_b', 742, 454],
  ]) L(t, u, y);
  // --- Tepi jalan selatan dan set piece batu / kayu ---
  L('stump', 109, 566);
  L('mushrooms', 132, 572);
  L('fern', 150, 584);
  L('bush', 190, 592);
  L('marker_stone', 272, 558);
  L('rock_l', 332, 568);
  L('rock_c', 380, 586);
  L('tuft_a', 420, 584);
  L('flowers_v', 462, 586);
  L('bush_berry', 520, 590);
  L('rock_s', 578, 592);
  L('fern_b', 612, 588);
  L('log', 678, 574);
  L('mushrooms_b', 736, 590);
  L('tuft_b', 40, 586);
  L('rock_slab', 70, 596);
  // --- Batu di tepi utara jalan ---
  L('rock_s', 608, 461);
  // --- Papan petunjuk (interaktif) dengan tanaman bunga kecil di kakinya ---
  L('sign', 6 * TILE, 14.55 * TILE, 'sign');
  L('flowers_y', 6 * TILE - 30, 14.55 * TILE + 8);

  // --- Jalan setapak: semak berduri (gerbang), pohon pelindung, tanaman tepi, glade ---
  L('thicket_closed', trailLocalX, 14.05 * TILE, 'thicket');
  for (const [t, du, y] of [
    ['tree_pine', -172, 252], ['tree_b', -178, 172], ['tree_c', -150, 102], ['tree_a', 172, 244], ['tree_twin', 178, 164], ['tree_fir', 152, 100],
    ['tree_dead', -72, 394], ['tree_sapling', 74, 384], ['bush_hedge', 88, 330], ['bush', -96, 300],
  ]) L(t, trailLocalX + du, y);
  // tepi jalan setapak: pakis, rumput, bebatuan kecil bergantian
  for (const [t, du, y] of [
    ['fern', -38, 420], ['tuft_a', 38, 408], ['rock_s', 44, 376], ['fern_b', -40, 330], ['tuft_b', 36, 316], ['flowers_v', -34, 282],
    ['fern', 40, 268],
  ]) L(t, trailLocalX + du, y);
  // glade: cahaya terbuka, peti, bunga berkelompok, tunggul tua dan anakan
  L('chest_closed', trailLocalX + 38, 6.7 * TILE, 'chest');
  for (const [t, du, y] of [
    ['flowers', -62, 176], ['flowers_y', -30, 238], ['flowers_v', 70, 160], ['flowers', 82, 224], ['flowers_y', 14, 134], ['tuft_a', -72, 214], ['tuft_b', 56, 244],
    ['tuft_a', 8, 266], ['stump', -84, 252], ['mushrooms', -70, 258], ['fern', 92, 188], ['fern_b', -92, 160], ['rock_s', 92, 262],
    ['bush_berry', 62, 146], ['bush', -66, 140],
  ]) L(t, trailLocalX + du, y);
  // ambang keluar utara: dua pohon besar membingkai, bukaan terang di antaranya
  L('tree_a', trailLocalX - 70, 84);
  L('tree_c', trailLocalX + 76, 80);

  const copies = 2; // 12..36 dan 36..60 petak
  for (let k = 0; k < copies; k++) {
    for (const d of local) {
      const x = zs + k * P + d.u;
      if (x < 0 || x > W) continue;
      add(d.type, x, d.y, { copy: k, role: d.role });
    }
  }

  // ---------- Area tempat bangun (non-periodik, x < zona) ----------
  const clear = { cx: 5 * TILE, cy: 14.6 * TILE, rx: 5 * TILE, ry: 4.4 * TILE };
  // Cincin pohon utara/barat berlapis. Pohon selatan tidak mungkin dekat (kanopi menjulang ke utara), jadi sisi selatan = semak bawah.
  for (const [t, x, y] of [
    ['tree_pine', 296, 394], ['tree_a', 358, 418], ['tree_b', 238, 352], ['tree_a', 178, 334], ['tree_c', 106, 346], ['tree_twin', 44, 372],
    ['tree_fir', 4, 436], ['tree_birch', 12, 498],
    // lapis belakang
    ['tree_pine', 318, 308], ['tree_birch', 262, 296], ['tree_a', 206, 268], ['tree_fir', 136, 280], ['tree_b', 74, 292], ['tree_c', 22, 322],
    ['tree_twin', 322, 232], ['tree_pine', 240, 214], ['tree_b', 170, 196], ['tree_fir', 100, 208], ['tree_a', 40, 222],
    ['tree_c', 310, 150], ['tree_pine', 200, 132], ['tree_b', 120, 140], ['tree_birch', 50, 150],
    // selatan jauh: hanya kanopi yang menyembul di tepi layar bawah
    ['tree_b', 24, 744], ['tree_a', 108, 748], ['tree_fir', 196, 764], ['tree_c', 276, 746], ['tree_pine', 352, 766],
    ['tree_pine', 70, 830], ['tree_a', 170, 836], ['tree_b', 270, 828], ['tree_twin', 340, 838],
  ]) add(t, x, y);
  // tanaman bawah selatan dan barat (rendah, tidak menutupi tempat bangun)
  for (const [t, x, y] of [
    ['bush_hedge', 34, 592], ['bush', 92, 606], ['fern', 144, 598], ['bush_berry', 204, 604], ['fern_b', 252, 610], ['mushrooms', 250, 596], ['bush', 304, 600],
    ['rock_c', 52, 572],
  ]) add(t, x, y);
  add('tree_sapling', 150, 706);
  add('tree_sapling', 76, 716);
  add('log', 98, 552);
  // dekor utara clearing (batas hutan)
  add('bush', 45, 371);
  add('fern', 83, 385);
  add('flowers', 109, 376);
  add('stump', 70, 392);
  add('rock_s', 278, 404);
  add('fern_b', 258, 392);
  add('tuft_a', 152, 372);
  // dalam clearing: bunga berkelompok dan rumput (bunga hanya di tepi, tengah dibiarkan terbuka dan bersih)
  add('flowers_y', 58, 440);
  add('flowers_v', 118, 392);
  add('flowers', 286, 442);
  add('tuft_b', 36, 480);
  add('tuft_a', 274, 540);
  // tempat Yaric berbaring: pedang tertancap di samping batu berlumut, jejak di tanah (jejak digambar pada dasar peta)
  add('sword', 6.9 * TILE, 13.1 * TILE, { role: 'sword' });
  add('rock_l', 7.7 * TILE, 12.2 * TILE);
  add('tuft_a', 8.1 * TILE, 13.0 * TILE);
  add('fern_b', 7.2 * TILE, 12.6 * TILE);

  // ---------- Walkable ----------
  const walkable = [
    { shape: 'ellipse', cx: clear.cx, cy: clear.cy, rx: clear.rx - 6, ry: clear.ry - 6 },
    { shape: 'rect', x: 8 * TILE, y: 14 * TILE, w: 10 * TILE - 0, h: 4 * TILE }, // pangkal koridor
    { shape: 'rect', x: 10 * TILE, y: 14 * TILE, w: 49 * TILE, h: 4 * TILE }, // koridor
  ];
  for (let k = 0; k < copies; k++) {
    const cx = zs + k * P + trailLocalX;
    walkable.push({ shape: 'rect', x: cx - 26, y: TILE, w: 52, h: 14.2 * TILE }); // jalan setapak
    walkable.push({ shape: 'ellipse', cx, cy: gladeCY, rx: gladeRX, ry: gladeRY }); // glade
  }

  // ---------- Interaktif, pemicu, NPC ----------
  const sc = (k, u) => zs + k * P + u;
  const interactables = [];
  const triggers = [];
  const signCopies = [];
  const thicketCopies = [];
  const chestCopies = [];
  for (const p of props) {
    if (p.role === 'sign') {
      signCopies.push(p.id);
      interactables.push({ id: `sign#${p.copy}`, kind: 'sign', verb: 'Baca', x: p.x - 22, y: p.y - 34, w: 44, h: 42, copy: p.copy, prop: p.id });
    }
    if (p.role === 'chest') {
      chestCopies.push(p.id);
      interactables.push({ id: `chest#${p.copy}`, kind: 'chest', verb: 'Buka', x: p.x - 24, y: p.y - 28, w: 48, h: 36, copy: p.copy, prop: p.id });
    }
    if (p.role === 'thicket') {
      thicketCopies.push(p.id);
      interactables.push({ id: `thicket#${p.copy}`, kind: 'object', verb: 'Periksa', x: p.x - 40, y: p.y - 20, w: 80, h: 44, copy: p.copy, prop: p.id });
      triggers.push({ id: `trail_enter#${p.copy}`, x: p.x - 22, y: 12.6 * TILE, w: 44, h: 16, copy: p.copy });
    }
  }
  for (const p of props) {
    if (p.role === 'sword') interactables.push({ id: 'sword', kind: 'object', verb: 'Periksa', x: p.x - 20, y: p.y - 56, w: 40, h: 64, prop: p.id });
  }
  interactables.push({ id: 'ground_tracks', kind: 'object', verb: 'Periksa', x: 118, y: 436, w: 84, h: 58 });
  interactables.push({ id: 'nambo', kind: 'npc', verb: 'Bicara', x: 352 - 26, y: 504 - 52, w: 52, h: 62 }); // posisi disinkronkan runtime

  for (let k = 0; k < copies; k++) {
    triggers.push({ id: `demo_end#${k}`, x: sc(k, trailLocalX) - 26, y: 1.2 * TILE, w: 52, h: 40, copy: k });
    interactables.push({ id: `forest_exit#${k}`, kind: 'object', verb: 'Lanjut', x: sc(k, trailLocalX) - 26, y: 0, w: 52, h: 42, copy: k });
  }
  triggers.push({ id: 'gate_hint', x: 236, y: 320, w: 28, h: 290 });
  triggers.push({ id: 'nambo_zone', x: 300, y: 14 * TILE, w: 30, h: 4 * TILE });

  // Gerbang menutup SELURUH tinggi pintu keluar clearing (termasuk sisi utara elips), bukan hanya jalan.
  const solidRects = [{ id: 'gate_awake', x: 264, y: 320, w: 16, h: 290, dynamic: true }];
  for (let k = 0; k < copies; k++) {
    const cx = sc(k, trailLocalX);
    solidRects.push({ id: `thicket_block#${k}`, x: cx - 34, y: 13.0 * TILE, w: 68, h: 1.0 * TILE + 6, dynamic: true, copy: k });
  }

  return {
    id: 'forest_1',
    width: W,
    height: H,
    tile: TILE,
    spawn: { x: 4 * TILE + 6, y: 13.7 * TILE, facing: 'down' },
    clearing: clear,
    road: { y0: roadY0, y1: roadY1, startX: 6.2 * TILE },
    zone: { start: zs, period: P, copies, wrapX: WRAP_X_TILE * TILE },
    trail: { localX: trailLocalX, gladeCY, gladeRX: 3.5 * TILE, gladeRY: 2.9 * TILE, topY: 1.0 * TILE, mouthY: 14 * TILE },
    props,
    walkable,
    solidRects,
    interactables,
    triggers,
    npcs: [{ id: 'nambo', entity: 'C08', x: 352, y: 504, facing: 'down' }],
  };
}
