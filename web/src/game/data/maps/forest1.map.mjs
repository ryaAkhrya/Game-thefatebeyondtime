// Data peta Hutan 1 (Chapter I). Builder MURNI, dipakai bersama oleh game (forest1.ts) dan generator art
// (scripts/gen-forest-art.mjs) agar peta dan gambar tidak pernah tidak sinkron. Satuan: piksel dunia (petak = 32 px).
//
// Tata letak (timur = kanan):
//   [Tempat bangun (clearing)] -> gerbang tak terlihat (hingga story.c1_awake) -> Nambo -> LORONG BERULANG
//   Lorong memiliki dekorasi PERIODIK (periode 24 petak): papan, pepohonan, dan mulut jalan setapak identik tiap periode,
//   sehingga pemain melihat "papan yang sama" lagi. Mulut jalan setapak tertutup semak berduri sampai pemain menyadari
//   pengulangan; sesudahnya jalan setapak -> glade (peti) -> keluar utara = akhir demo Phase 1.

export const TILE = 32;
export const MAP_W_TILES = 60;
export const MAP_H_TILES = 28;
export const ZONE_START_TILE = 12; // awal zona periodik
export const PERIOD_TILES = 24;
export const WRAP_X_TILE = 48; // pemain yang melewati x ini digeser -PERIOD (hanya sebelum loop selesai)

/** Jejak tapak (w,h) di dasar tiap tipe prop; titik acuan sprite = tengah-bawah. */
export const FOOT = {
  tree_a: [22, 12],
  tree_b: [22, 12],
  tree_pine: [18, 12],
  tree_dead: [18, 12],
  rock_l: [48, 20],
  rock_s: [24, 12],
  bush: [30, 14],
  stump: [24, 12],
  log: [78, 14],
  sign: [14, 8],
  chest_closed: [26, 12],
  chest_open: [26, 12],
  sword: [10, 6],
  marker_stone: [20, 10],
  thicket_closed: [0, 0],
  thicket_open: [0, 0],
  fern: [0, 0],
  flowers: [0, 0],
  mushrooms: [0, 0],
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

export function buildForest1() {
  const W = MAP_W_TILES * TILE;
  const H = MAP_H_TILES * TILE;
  const zs = ZONE_START_TILE * TILE;
  const P = PERIOD_TILES * TILE;

  const roadY0 = 15 * TILE; // 480
  const roadY1 = 17 * TILE; // 544  (jalan = baris 15-16)
  const trailLocalX = 14 * TILE; // pusat jalan setapak, koordinat lokal periode
  const gladeCY = 6 * TILE;

  /** @type {{id:string,type:string,x:number,y:number,solid?:boolean,state?:string,copy?:number}[]} */
  const props = [];
  const add = (type, x, y, extra = {}) => props.push({ id: `${type}_${props.length}`, type, x: Math.round(x), y: Math.round(y), ...extra });

  // ---------- Dekorasi periodik (koordinat lokal u dalam [0,P)) ----------
  const local = []; // {type, u, y}
  const rnd = mulberry32(20261110);
  const treeTypes = ['tree_a', 'tree_b', 'tree_pine', 'tree_a', 'tree_b'];
  const trailGap = 52; // setengah lebar celah pohon di mulut jalan setapak
  const nearTrail = (u, pad = 0) => Math.abs(u - trailLocalX) < trailGap + pad;
  const nearSign = (u) => Math.abs(u - 6 * TILE) < 40;

  // sabuk utara (basis y = 13*32 = 416; kanopi naik ke atas koridor) dan sabuk selatan (basis y = 22*32)
  for (let i = 0; i < 10; i++) {
    const u = (i + 0.5) * (P / 10) + (rnd() - 0.5) * 24;
    if (!nearTrail(u, 8)) local.push({ type: treeTypes[i % 5], u, y: 13 * TILE + Math.round((rnd() - 0.5) * 10) });
    local.push({ type: treeTypes[(i + 2) % 5], u: u + 38, y: 22 * TILE + Math.round((rnd() - 0.5) * 10) });
  }
  // baris belakang (lebih jauh) agar hutan terasa rapat
  for (let i = 0; i < 10; i++) {
    const u = (i + 0.2) * (P / 10) + (rnd() - 0.5) * 20;
    if (!nearTrail(u, 70)) local.push({ type: treeTypes[(i + 1) % 5], u, y: 10.6 * TILE + Math.round((rnd() - 0.5) * 12) });
    local.push({ type: treeTypes[(i + 3) % 5], u: u + 30, y: 25.4 * TILE + Math.round((rnd() - 0.5) * 12) });
  }
  // vegetasi bahu jalan (tidak solid)
  for (let i = 0; i < 9; i++) {
    const u = (i + rnd()) * (P / 9);
    if (nearTrail(u, 20) || nearSign(u)) continue;
    const north = i % 2 === 0;
    local.push({ type: ['fern', 'bush', 'flowers', 'fern', 'mushrooms'][i % 5], u, y: north ? 14.35 * TILE : 17.55 * TILE });
  }
  // detail dunia: batu, tunggul, kayu tumbang di tepi koridor
  local.push({ type: 'rock_l', u: 10.2 * TILE, y: 17.7 * TILE });
  local.push({ type: 'rock_s', u: 19.0 * TILE, y: 14.4 * TILE });
  local.push({ type: 'stump', u: 3.4 * TILE, y: 17.6 * TILE });
  local.push({ type: 'log', u: 21.2 * TILE, y: 17.9 * TILE });
  // papan petunjuk (interaktif) di sisi selatan jalan, dan batu penanda dengan motif dua garis hampir bertemu
  local.push({ type: 'sign', u: 6 * TILE, y: 14.55 * TILE, role: 'sign' });
  local.push({ type: 'marker_stone', u: 8.5 * TILE, y: 17.4 * TILE });
  // jalan setapak: semak berduri (gerbang), pohon pelindung glade, glade
  local.push({ type: 'thicket_closed', u: trailLocalX, y: 14.05 * TILE, role: 'thicket' });
  for (const [dx, y, t] of [[-76, 9.4, 'tree_a'], [-92, 6.2, 'tree_b'], [-78, 3.4, 'tree_pine'], [78, 9.2, 'tree_b'], [94, 6.0, 'tree_a'], [80, 3.2, 'tree_pine'], [-30, 1.6, 'tree_pine'], [34, 1.5, 'tree_b'], [-118, 8.4, 'tree_pine'], [120, 8.2, 'tree_pine']]) {
    local.push({ type: t, u: trailLocalX + dx, y: y * TILE });
  }
  // hutan lebat di sekeliling jalan setapak dan glade (latar; tidak bisa dimasuki karena di luar area walkable)
  {
    const r3 = mulberry32(4242);
    const gx = 3.5 * TILE + 44, gy = 2.9 * TILE + 34;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < Math.floor(P / 70); col++) {
        const u = col * 70 + (row % 2) * 35 + (r3() - 0.5) * 26;
        const y = (3.6 + row * 2.1) * TILE + (r3() - 0.5) * 18;
        const inGlade = ((u - trailLocalX) / gx) ** 2 + ((y - gladeCY) / gy) ** 2 < 1;
        const onTrail = Math.abs(u - trailLocalX) < 44 && y < 13.5 * TILE;
        if (inGlade || onTrail || y > 12.6 * TILE) continue;
        local.push({ type: treeTypes[(row + col) % 5], u, y });
      }
    }
    for (let col = 0; col < Math.floor(P / 72); col++) {
      for (const [row, base] of [[0, 24.2], [1, 26.8]]) {
        const u = col * 72 + row * 36 + (r3() - 0.5) * 24;
        local.push({ type: treeTypes[(col + row * 2) % 5], u, y: base * TILE + (r3() - 0.5) * 16 });
      }
    }
  }
  local.push({ type: 'tree_dead', u: trailLocalX - 40, y: 11.0 * TILE });
  local.push({ type: 'flowers', u: trailLocalX - 36, y: 6.6 * TILE });
  local.push({ type: 'flowers', u: trailLocalX + 46, y: 5.3 * TILE });
  local.push({ type: 'fern', u: trailLocalX - 60, y: 5.0 * TILE });
  local.push({ type: 'mushrooms', u: trailLocalX + 62, y: 7.6 * TILE });
  local.push({ type: 'chest_closed', u: trailLocalX + 38, y: 6.7 * TILE, role: 'chest' });
  local.push({ type: 'rock_s', u: trailLocalX - 50, y: 8.2 * TILE });

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
  const rnd2 = mulberry32(777);
  // cincin pohon di sekeliling clearing, kecuali celah timur (jalan keluar)
  for (let a = 0; a < 22; a++) {
    const ang = (a / 22) * Math.PI * 2;
    const east = Math.cos(ang) > 0.78 && Math.abs(Math.sin(ang)) < 0.45;
    if (east) continue;
    const rr = 1.06 + (a % 2) * 0.1;
    const x = clear.cx + Math.cos(ang) * clear.rx * rr;
    const y = clear.cy + Math.sin(ang) * clear.ry * rr + TILE * 0.9;
    if (x < 8 || x > zs + 8) continue;
    add(treeTypes[a % 5], x + (rnd2() - 0.5) * 12, y);
  }
  for (let i = 0; i < 6; i++) add(treeTypes[(i + 1) % 5], 10 + i * 60 + rnd2() * 20, 8.6 * TILE + rnd2() * 20); // baris belakang atas
  for (let i = 0; i < 6; i++) add(treeTypes[(i + 3) % 5], 30 + i * 62 + rnd2() * 20, 25.6 * TILE + rnd2() * 20);
  add('tree_a', 11.2 * TILE, 13.0 * TILE);
  add('tree_pine', 10.8 * TILE, 22.0 * TILE);
  add('tree_b', 8.4 * TILE, 21.8 * TILE);
  add('tree_pine', 9.0 * TILE, 12.6 * TILE);
  add('bush', 1.4 * TILE, 11.6 * TILE);
  add('fern', 2.6 * TILE, 18.2 * TILE);
  add('flowers', 3.4 * TILE, 11.6 * TILE);
  add('mushrooms', 7.8 * TILE, 18.6 * TILE);
  add('rock_s', 8.7 * TILE, 12.5 * TILE);
  add('stump', 2.2 * TILE, 12.0 * TILE);
  add('fern', 9.3 * TILE, 18.2 * TILE);
  // tempat Yaric berbaring: pedang bersandar, jejak di tanah (jejak digambar pada dasar peta)
  add('sword', 6.9 * TILE, 13.1 * TILE, { role: 'sword' });
  add('rock_l', 7.7 * TILE, 12.2 * TILE);

  // ---------- Walkable ----------
  const walkable = [
    { shape: 'ellipse', cx: clear.cx, cy: clear.cy, rx: clear.rx - 6, ry: clear.ry - 6 },
    { shape: 'rect', x: 8 * TILE, y: 14 * TILE, w: 10 * TILE - 0, h: 4 * TILE }, // pangkal koridor
    { shape: 'rect', x: 10 * TILE, y: 14 * TILE, w: 49 * TILE, h: 4 * TILE }, // koridor
  ];
  for (let k = 0; k < copies; k++) {
    const cx = zs + k * P + trailLocalX;
    walkable.push({ shape: 'rect', x: cx - 26, y: TILE, w: 52, h: 14.2 * TILE }); // jalan setapak
    walkable.push({ shape: 'ellipse', cx, cy: gladeCY, rx: 3.5 * TILE, ry: 2.9 * TILE }); // glade
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
