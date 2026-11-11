import type Phaser from 'phaser';
import type { ForestMap } from '../data/maps/forest1.map.mjs';
import { CollisionMap, type Rect } from './Collision';
import type { LoadedMap } from './forest1';
import { FOREST2_SPAWN, LIORA_SPAWN } from '../story/chapter2Flags';

/** DRAFT layout: a lived-in village and an observed, branching woodland. 32 px map grid. */
const VILLAGE_SOLIDS: Rect[] = [
  { x: 152, y: 160, w: 160, h: 120 }, { x: 648, y: 160, w: 160, h: 120 },
  { x: 160, y: 400, w: 144, h: 112 }, { x: 664, y: 408, w: 144, h: 104 },
  { x: 504, y: 304, w: 96, h: 32 }, // Zira's frame-repair bench
  { x: 344, y: 408, w: 48, h: 32 }, // drying rack, off the main path
];
const FOREST_SOLIDS: Rect[] = [
  { x: 344, y: 512, w: 24, h: 16 }, // old marker: can be read from the southern trail
  { x: 888, y: 368, w: 32, h: 16 }, // second marker / deliberate branch landmark
  { x: 544, y: 568, w: 64, h: 16 }, // worked log, evidence of nearby villagers
];

function base(id: 'liora' | 'forest_2', width: number, height: number, spawn: ForestMap['spawn']): ForestMap {
  return { id, width, height, tile: 32, spawn, clearing: { cx: 0, cy: 0, rx: 0, ry: 0 },
    road: { y0: 0, y1: 0, startX: 0 }, zone: { start: 0, period: 0, copies: 0, wrapX: Infinity },
    trail: { localX: 0, gladeCY: 0, gladeRX: 0, gladeRY: 0, topY: 0, mouthY: 0 },
    props: [], npcs: [], walkable: [], solidRects: [], interactables: [], triggers: [] };
}
export function buildLiora(): ForestMap {
  const m = base('liora', 960, 704, { ...LIORA_SPAWN });
  m.walkable = [{ shape: 'rect', x: 96, y: 96, w: 768, h: 552 }];
  m.solidRects = VILLAGE_SOLIDS.map((s, i) => ({ ...s, id: `liora_solid_${i}` }));
  m.interactables = [
    { id: 'zira', kind: 'npc', verb: 'Bicara', x: 460, y: 312, w: 44, h: 40 },
    { id: 'carving_a', kind: 'object', verb: 'Periksa ukiran', x: 506, y: 336, w: 42, h: 24 },
    { id: 'carving_b', kind: 'object', verb: 'Periksa ukiran', x: 552, y: 336, w: 42, h: 24 },
    { id: 'village_guard', kind: 'npc', verb: 'Bicara', x: 408, y: 568, w: 40, h: 36 },
    { id: 'drying_worker', kind: 'npc', verb: 'Bicara', x: 328, y: 452, w: 40, h: 36 },
    { id: 'liora_to_forest', kind: 'sign', verb: 'Ke Hutan 2', x: 460, y: 112, w: 40, h: 24 },
    { id: 'liora_to_city', kind: 'sign', verb: 'Ke Aveloria', x: 460, y: 624, w: 40, h: 24 },
  ];
  return m;
}
export function loadLiora(): LoadedMap {
  const map = buildLiora();
  return { map, footRects: VILLAGE_SOLIDS, interactables: map.interactables.map(i => ({ ...i })),
    collision: new CollisionMap(map.width, map.height, map.walkable, VILLAGE_SOLIDS) };
}
export function buildForest2(): ForestMap {
  const m = base('forest_2', 1280, 768, { ...FOREST2_SPAWN });
  m.walkable = [
    { shape: 'rect', x: 96, y: 480, w: 768, h: 160 }, // woodcutters' east-west trail
    { shape: 'rect', x: 608, y: 336, w: 256, h: 304 }, // Torvan's bend
    { shape: 'rect', x: 768, y: 208, w: 416, h: 240 }, // quiet old guard route
  ];
  m.solidRects = [
    ...FOREST_SOLIDS.map((s, i) => ({ ...s, id: `forest2_solid_${i}` })),
    { id: 'veyrath_passage', x: 992, y: 208, w: 16, h: 240, dynamic: true },
  ];
  m.interactables = [
    { id: 'forest2_marker', kind: 'object', verb: 'Periksa batu', x: 336, y: 504, w: 40, h: 32 },
    { id: 'torvan', kind: 'npc', verb: 'Bicara', x: 660, y: 480, w: 48, h: 40 },
    { id: 'forest2_second_marker', kind: 'object', verb: 'Periksa penanda', x: 880, y: 352, w: 48, h: 32 },
    { id: 'forest2_rest', kind: 'object', verb: 'Beristirahat', x: 800, y: 344, w: 40, h: 32 },
    { id: 'forest2_patrol', kind: 'object', verb: 'Periksa jejak', x: 824, y: 400, w: 40, h: 32 },
    { id: 'veyrath', kind: 'npc', verb: 'Dekati', x: 1008, y: 256, w: 48, h: 56 },
    { id: 'fragment_a', kind: 'object', verb: 'Baca catatan', x: 1072, y: 272, w: 48, h: 32 },
    { id: 'fragment_b', kind: 'object', verb: 'Periksa fragmen', x: 1128, y: 320, w: 40, h: 32 },
    { id: 'forest2_return', kind: 'sign', verb: 'Ke Liora', x: 112, y: 544, w: 40, h: 32 },
    { id: 'forest2_to_city', kind: 'sign', verb: 'Kembali melapor', x: 1080, y: 384, w: 64, h: 32 },
  ];
  m.triggers = [
    { id: 'forest2_shadow', x: 264, y: 488, w: 56, h: 144 },
    { id: 'forest2_tutorial', x: 768, y: 456, w: 96, h: 184 },
    { id: 'forest2_veyrath', x: 944, y: 208, w: 48, h: 240 },
  ];
  return m;
}
export function loadForest2(): LoadedMap {
  const map = buildForest2();
  return { map, footRects: FOREST_SOLIDS, interactables: map.interactables.map(i => ({ ...i })),
    collision: new CollisionMap(map.width, map.height, map.walkable, FOREST_SOLIDS) };
}

/** Small code-native environment DRAFT. Geometry and landmarks are shared with the collision data above. */
export function drawChapter2Ground(scene: Phaser.Scene, area: 'liora' | 'forest_2'): void {
  const g = scene.add.graphics().setDepth(-1000);
  const rect = (x: number, y: number, w: number, h: number, c: number): void => { g.fillStyle(c); g.fillRect(x, y, w, h); };
  if (area === 'liora') {
    rect(0, 0, 960, 704, 0x455b42); rect(96, 96, 768, 552, 0x77765b);
    rect(448, 96, 64, 552, 0x9b8d6b); rect(96, 288, 768, 72, 0x8d8063);
    for (const s of VILLAGE_SOLIDS.slice(0, 4)) {
      rect(s.x, s.y, s.w, s.h, 0xb69b73); rect(s.x - 8, s.y - 24, s.w + 16, 56, 0x6f5f49);
      for (let x = s.x; x < s.x + s.w; x += 24) rect(x, s.y - 20, 16, 2, 0x89765a);
      rect(s.x + s.w / 2 - 10, s.y + s.h - 24, 20, 24, 0x5d5041);
    }
    rect(504, 304, 96, 32, 0x6b543f); rect(512, 296, 72, 8, 0xc1ad82);
    rect(344, 408, 48, 32, 0x6e5543); for (let x = 344; x < 392; x += 8) rect(x, 400, 4, 8, 0xbba777);
    for (const [x, y] of [[120, 560], [816, 560], [120, 120], [840, 120]] as const) { rect(x, y, 32, 40, 0x526a46); rect(x + 4, y - 20, 24, 24, 0x637b50); }
    rect(432, 592, 4, 32, 0x574b3c); rect(408, 588, 52, 12, 0xc2ac7f);
  } else {
    rect(0, 0, 1280, 768, 0x263f36);
    rect(96, 480, 768, 160, 0x59684d); rect(608, 336, 256, 304, 0x59684d); rect(768, 208, 416, 240, 0x59684d);
    rect(112, 536, 744, 48, 0x756e55); rect(704, 352, 64, 232, 0x756e55); rect(768, 280, 400, 48, 0x756e55);
    for (let x = 160; x < 1180; x += 72) {
      const y = x < 640 ? (x % 144 ? 480 : 616) : x < 832 ? 384 : (x % 144 ? 208 : 424);
      rect(x, y - 24, 32, 32, 0x425c45); rect(x + 4, y - 34, 24, 22, 0x56704e); rect(x + 12, y + 8, 8, 12, 0x514b38);
    }
    rect(344, 512, 24, 16, 0x8e8973); rect(348, 508, 16, 4, 0xb0aa8a);
    rect(544, 568, 64, 16, 0x76583e); rect(888, 368, 32, 16, 0x8e8973);
    rect(800, 344, 40, 32, 0x5d533f); rect(808, 340, 24, 6, 0xa79b77);
    rect(824, 412, 32, 4, 0x887e61); rect(832, 420, 26, 3, 0x887e61);
    rect(1072, 272, 48, 32, 0x5d5546); rect(1128, 320, 40, 32, 0x696358);
  }
  const label = (x: number, y: number, value: string): void => { scene.add.text(x, y, value, { fontFamily: "'Source Sans 3', sans-serif", fontStyle: '600', fontSize: '9px', color: '#e1d9bd', backgroundColor: '#3b4240', padding: { x: 4, y: 2 }, resolution: Math.max(2, scene.cameras.main.zoom) }).setDepth(-500); };
  if (area === 'liora') { label(416, 112, 'HUTAN 2'); label(412, 608, 'AVELORIA'); label(496, 260, 'ZIRA'); }
  else { label(128, 488, 'LIORA'); label(792, 304, 'BERISTIRAHAT'); label(1064, 424, 'JALAN LAMA'); }
}
