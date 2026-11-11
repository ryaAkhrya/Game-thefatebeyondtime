import type Phaser from 'phaser';
import type { ForestMap, MapNpc } from '../data/maps/forest1.map.mjs';
import { CollisionMap, type Rect } from './Collision';
import type { LoadedMap } from './forest1';
import { CITY_SPAWN } from '../story/aveloriaFlags';
import { AVELORIA_ITEMS, decorSolids } from '../data/maps/town.layout.mjs';
import { drawTown } from './townArt';

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
  ...decorSolids(AVELORIA_ITEMS), // dekorasi baru (lampu, tong, petak tanaman...) dengan jejak sesuai dasar visualnya
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

/** Art Aveloria (Polish Sprint 2): tanah hasil baking + sprite atlas dari scripts/gen-town-art.mjs.
 * Hanya renderer; geometri tabrakan tetap dari CITY_SOLIDS (+ jejak dekorasi dari town.layout). */
export function drawAveloria(scene: Phaser.Scene): { gate: Phaser.GameObjects.Image; bell: Phaser.GameObjects.Image; doorClosed: Phaser.GameObjects.Image; doorOpen: Phaser.GameObjects.Image } {
  const art = drawTown(scene, 'aveloria');
  const get = (id: string): Phaser.GameObjects.Image => art.byId.get(id)!;
  return { gate: get('gate'), bell: get('bell'), doorClosed: get('door_closed'), doorOpen: get('door_open') };
}
