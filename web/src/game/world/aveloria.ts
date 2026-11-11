import type Phaser from 'phaser';
import type { ForestMap, MapNpc } from '../data/maps/forest1.map.mjs';
import { CollisionMap, type Rect } from './Collision';
import type { LoadedMap } from './forest1';
import { CITY_SPAWN } from '../story/aveloriaFlags';

/** ASSUMPTION / DRAFT layout: one compact kingdom, no encounters or Chapter II exits.
 * Geometry is independent of Graphics, so replacing environment art cannot change navigation. */
export const CITY_BUILDINGS = [
  { x: 160, y: 704, w: 176, h: 128, roof: 0x826053, kind: 'home' },
  { x: 160, y: 960, w: 160, h: 144, roof: 0x6a595b, kind: 'home' },
  { x: 960, y: 944, w: 160, h: 152, roof: 0x826053, kind: 'home' },
  { x: 832, y: 656, w: 288, h: 136, roof: 0x586c6e, kind: 'archive' },
] as const;
export const CITY_SOLIDS: Rect[] = [
  { x: 128, y: 1104, w: 448, h: 72 },
  { x: 704, y: 1104, w: 448, h: 72 },
  ...CITY_BUILDINGS.map(b => ({ x: b.x, y: b.y, w: b.w, h: b.h })),
  { x: 432, y: 816, w: 80, h: 64 }, // plaza well, leave the main avenue clear
  { x: 288, y: 864, w: 112, h: 48 }, // Derrria's counter
  { x: 208, y: 848, w: 56, h: 72 }, // produce stall
  { x: 872, y: 792, w: 80, h: 24 }, // Azie's report desk
  { x: 800, y: 480, w: 48, h: 64 }, // bell tower base, outside the avenue
  { x: 464, y: 160, w: 48, h: 184 }, // room shelves
  { x: 768, y: 160, w: 48, h: 184 },
  { x: 560, y: 184, w: 160, h: 32 }, // royal working table, not a giant throne
];
export const CITY_NPCS: readonly MapNpc[] = [
  { id: 'talric', entity: 'C06', x: 640, y: 1148, facing: 'down' },
  { id: 'azie', entity: 'C05', x: 912, y: 776, facing: 'down' },
  { id: 'velthia', entity: 'C02', x: 640, y: 248, facing: 'down' },
  { id: 'derrria', entity: 'C09', x: 344, y: 864, facing: 'down' },
];
export const CITIZENS = [
  { id: 'porter', x: 736, y: 1024, role: 'Pembawa peti', color: 0x627c78, task: 'carry' },
  { id: 'vendor', x: 232, y: 936, role: 'Penjual sayur', color: 0x8e7160, task: 'sort' },
  { id: 'sweeper', x: 736, y: 720, role: 'Penyapu jalan', color: 0x7c8064, task: 'sweep' },
  { id: 'guard', x: 752, y: 560, role: 'Penjaga', color: 0x64717e, task: 'watch' },
] as const;

export function buildAveloria(): ForestMap {
  return {
    id: 'aveloria', width: 1280, height: 1408, tile: 32, spawn: { ...CITY_SPAWN },
    clearing: { cx: 640, cy: 928, rx: 192, ry: 160 }, road: { y0: 0, y1: 0, startX: 0 },
    zone: { start: 0, period: 0, copies: 0, wrapX: Infinity },
    trail: { localX: 0, gladeCY: 0, gladeRX: 0, gladeRY: 0, topY: 0, mouthY: 0 },
    props: [], npcs: [], // named NPCs use their own original atlas metadata, not Nambo's adapter
    walkable: [
      { shape: 'rect', x: 128, y: 640, w: 1024, h: 544 },
      { shape: 'rect', x: 592, y: 1168, w: 96, h: 208 },
      { shape: 'rect', x: 448, y: 448, w: 384, h: 224 },
      { shape: 'rect', x: 600, y: 352, w: 80, h: 320 },
      { shape: 'rect', x: 448, y: 128, w: 384, h: 256 },
    ],
    solidRects: [
      ...CITY_SOLIDS.map((s, i) => ({ ...s, id: `city_solid_${i}` })),
      { id: 'city_gate', x: 128, y: 1160, w: 1024, h: 16, dynamic: true },
      { id: 'palace_door', x: 600, y: 416, w: 80, h: 16, dynamic: true },
    ],
    interactables: [
      { id: 'talric', kind: 'npc', verb: 'Bicara', x: 616, y: 1132, w: 48, h: 48 },
      { id: 'azie', kind: 'npc', verb: 'Bicara', x: 872, y: 792, w: 80, h: 32 },
      { id: 'velthia', kind: 'npc', verb: 'Bicara', x: 616, y: 240, w: 48, h: 32 },
      { id: 'derrria', kind: 'npc', verb: 'Berdagang', x: 288, y: 896, w: 112, h: 24 },
      { id: 'reports', kind: 'object', verb: 'Baca laporan', x: 968, y: 792, w: 40, h: 24 },
      { id: 'city_sign', kind: 'sign', verb: 'Baca', x: 680, y: 936, w: 24, h: 24 },
      { id: 'liora_exit', kind: 'sign', verb: 'Ke Liora', x: 616, y: 1344, w: 48, h: 32 },
      { id: 'palace_door', kind: 'object', verb: 'Periksa', x: 600, y: 432, w: 80, h: 16 },
      ...CITIZENS.map(n => ({ id: n.id, kind: 'npc' as const, verb: 'Bicara', x: n.x - 12, y: n.y - 14, w: 24, h: 28 })),
    ],
    triggers: [
      { id: 'city_gate', x: 592, y: 1184, w: 96, h: 24 },
      { id: 'city_audience', x: 608, y: 296, w: 64, h: 24 },
      { id: 'city_bells', x: 600, y: 488, w: 80, h: 32 },
    ],
  };
}

export function loadAveloria(): LoadedMap {
  const map = buildAveloria();
  return { map, footRects: CITY_SOLIDS, interactables: map.interactables.map(i => ({ ...i })),
    collision: new CollisionMap(map.width, map.height, map.walkable, CITY_SOLIDS) };
}

/** Code-native replaceable environment DRAFT, on the same pixel grid as forest props.
 * Slate roofs, plaster walls, stone roads and practical market stock distinguish the kingdom. */
export function drawAveloria(scene: Phaser.Scene): { gate: Phaser.GameObjects.Graphics; bell: Phaser.GameObjects.Graphics } {
  const g = scene.add.graphics().setDepth(-1000);
  const rect = (x: number, y: number, w: number, h: number, c: number): void => { g.fillStyle(c); g.fillRect(x, y, w, h); };
  rect(0, 0, 1280, 1408, 0x354a35);
  rect(128, 640, 1024, 544, 0x8c8775);
  rect(592, 1168, 96, 208, 0x79715d);
  rect(448, 448, 384, 224, 0x8c8775);
  rect(600, 352, 80, 320, 0x9c9581);
  rect(448, 128, 384, 256, 0x696263);
  // Paving is legible, restrained; the central avenue has a continuous lighter edge.
  for (let y = 648; y < 1184; y += 16) for (let x = 136; x < 1152; x += 32) {
    rect(x + (y % 32 ? 8 : 0), y, 24, 1, 0x777568);
    if ((x + y) % 96 === 0) rect(x + 4, y + 6, 4, 2, 0x99927d);
  }
  for (const x of [584, 696]) rect(x, 672, 3, 480, 0xb1a58a);
  // Castle walls and gate towers give a readable entrance instead of a road into a wall.
  for (const [x, w] of [[128, 448], [704, 448]]) {
    rect(x!, 1120, w!, 56, 0x676d69); rect(x!, 1120, w!, 8, 0x929387);
    for (let bx = x!; bx < x! + w!; bx += 32) { rect(bx, 1104, 20, 24, 0x7c837b); rect(bx + 2, 1104, 16, 3, 0xa4a391); }
  }
  for (const x of [544, 704]) { rect(x, 1080, 32, 96, 0x575f5c); rect(x, 1072, 32, 12, 0x8c9588); rect(x + 12, 1092, 8, 22, 0x29383a); }
  // Domestic buildings; actual doorways face paths, shutters and chimney have a purpose.
  for (const b of CITY_BUILDINGS) {
    rect(b.x + 5, b.y + 6, b.w, b.h, 0x6c6a5e);
    rect(b.x, b.y, b.w, b.h, 0xb0a58b);
    rect(b.x - 8, b.y - 32, b.w + 16, 72, b.roof);
    for (let y = b.y - 28; y < b.y + 36; y += 8) rect(b.x - 8, y, b.w + 16, 2, 0x414e52);
    rect(b.x + 24, b.y + 56, 24, 28, 0x3c4d51); rect(b.x + b.w - 48, b.y + 56, 24, 28, 0x3c4d51);
    rect(b.x + b.w / 2 - 12, b.y + b.h - 32, 24, 32, 0x594c42);
    rect(b.x + 26, b.y - 40, 16, 24, 0x8b877a);
  }
  // Well, two stalls, baskets of produce and Derrria's small supply bottles.
  rect(428, 812, 88, 68, 0x625f55); rect(440, 824, 64, 44, 0x555d63); rect(448, 832, 48, 24, 0x466069);
  for (const [x, y, w] of [[280, 848, 128], [200, 832, 72]]) {
    rect(x!, y!, w!, 12, 0x6e4956); rect(x!, y! + 12, w!, 10, 0x9a806a);
    for (let sx = x!; sx < x! + w!; sx += 16) rect(sx, y!, 8, 12, 0xaba08a);
    rect(x! + 8, y! + 32, w! - 16, 28, 0x6d5944);
  }
  for (let x = 304; x < 392; x += 16) { rect(x, 880, 8, 12, 0x6b857a); rect(x + 2, 876, 4, 4, 0xb3ab86); }
  for (let x = 216; x < 256; x += 8) rect(x, 896, 6, 6, 0x70834f);
  // Practical archive desk and two mismatched reports.
  rect(872, 792, 80, 24, 0x6c5949); rect(880, 788, 24, 16, 0xc6bea2); rect(916, 790, 24, 12, 0xb7af96);
  rect(968, 792, 40, 24, 0x6c5949); rect(972, 790, 30, 14, 0xc6bea2);
  // Courtyard hedges leave both the avenue and bell tower approach open.
  for (const x of [464, 760]) { rect(x, 568, 48, 48, 0x485c42); rect(x + 4, 568, 40, 4, 0x6d7d51); }
  rect(440, 392, 160, 40, 0x777d76); rect(680, 392, 160, 40, 0x777d76);
  // Open roof / cutaway room. It is part of Aveloria, not a new kingdom or area.
  rect(440, 104, 400, 24, 0x777d76); rect(440, 128, 8, 256, 0x9b9b87); rect(832, 128, 8, 256, 0x9b9b87);
  rect(600, 216, 80, 168, 0x594756);
  for (const x of [464, 768]) { rect(x, 160, 48, 184, 0x675747); for (let y = 168; y < 344; y += 24) { rect(x + 4, y, 40, 2, 0x9b8b68); for (let bx = x + 8; bx < x + 40; bx += 8) rect(bx, y + 4, 5, 12, bx % 16 ? 0x798475 : 0x917563); } }
  rect(560, 184, 160, 32, 0x6c5949); rect(576, 184, 32, 14, 0xc6bea2); rect(664, 184, 24, 10, 0xc6bea2);
  // One bell tower; its hands deliberately stay at nine for both signals.
  rect(800, 432, 48, 112, 0x6e7771); rect(792, 416, 64, 16, 0x52666b);
  rect(808, 448, 32, 24, 0x303c3d); rect(810, 480, 28, 28, 0xb2ae91);
  rect(824, 492, 2, 4, 0x414b49); rect(814, 492, 12, 2, 0x414b49); rect(824, 482, 2, 12, 0x414b49);
  // Signs and crates show where people work, without gold/clock ornament spam.
  rect(688, 936, 4, 28, 0x594d40); rect(676, 932, 32, 16, 0xb1a283);
  for (const [x, y] of [[760, 1020], [784, 1020], [1032, 880]]) { rect(x!, y!, 20, 20, 0x806348); rect(x! + 2, y! + 2, 16, 2, 0xa0835d); }
  const label = (x: number, y: number, text: string): void => { scene.add.text(x, y, text, { fontFamily: "'Source Sans 3', sans-serif", fontStyle: '600', fontSize: '9px', color: '#e1d9bd', backgroundColor: '#3b4240', padding: { x: 4, y: 2 }, resolution: Math.max(2, scene.cameras.main.zoom) }).setDepth(-500); };
  label(600, 1088, 'AVELORIA'); label(280, 816, 'PASAR'); label(868, 624, 'ARSIP'); label(560, 568, 'ISTANA'); label(544, 152, 'RUANG PERTEMUAN');
  const gate = scene.add.graphics().setDepth(1160); gate.fillStyle(0x423f38); gate.fillRect(576, 1144, 128, 24); gate.fillStyle(0x8e8067); for (let x = 584; x < 704; x += 16) gate.fillRect(x, 1144, 4, 24);
  const bell = scene.add.graphics().setPosition(824, 452).setDepth(545); bell.fillStyle(0xa69a76); bell.fillRect(-8, 0, 16, 12); bell.fillRect(-12, 12, 24, 4); bell.fillStyle(0x423e34); bell.fillRect(-2, 16, 4, 4);
  return { gate, bell };
}
