import type Phaser from 'phaser';
import type { ForestMap, MapProp } from '../data/maps/forest1.map.mjs';
import { CollisionMap } from './Collision';
import { footRectOf, type LoadedMap } from './forest1';

/** Small non-looping continuation. Reuses the forest's authored prop atlas; no new character art. */
export function buildForestEdge(): ForestMap {
  const props: MapProp[] = [];
  const add = (type: string, x: number, y: number): void => { props.push({ id: `edge_${props.length}`, type, x, y }); };
  const trees = ['tree_a', 'tree_b', 'tree_pine'];
  for (let x = 40; x < 600; x += 68) {
    if (x < 412 || x > 548) add(trees[Math.floor(x / 68) % 3]!, x, 592);
    add(trees[Math.floor(x / 68 + 1) % 3]!, x + 20, 786);
  }
  for (let y = 320; y <= 570; y += 76) { add('tree_b', 368, y); if (y + 36 > 500) add('tree_pine', 592, y + 36); }
  for (let x = 656; x < 1370; x += 76) {
    add(trees[Math.floor(x / 76) % 3]!, x, x > 760 && x < 1150 ? 226 : 338);
    add(trees[Math.floor(x / 76 + 1) % 3]!, x + 10, x > 760 && x < 1150 ? 634 : 570);
  }
  add('log', 656, 350); add('stump', 624, 356); add('fern', 680, 346);
  add('marker_stone', 736, 340); add('rock_l', 1154, 484); add('rock_s', 838, 296);
  add('tree_dead', 810, 278); add('mushrooms', 882, 528); add('fern', 1040, 260);
  add('sign', 1296, 338); add('flowers', 1264, 450);
  return {
    id: 'forest_edge', width: 1408, height: 832, tile: 32,
    spawn: { x: 96, y: 656, facing: 'right' },
    clearing: { cx: 960, cy: 400, rx: 192, ry: 144 },
    road: { y0: 608, y1: 704, startX: 64 },
    zone: { start: 0, period: 0, copies: 0, wrapX: 1408 },
    trail: { localX: 480, gladeCY: 400, gladeRX: 192, gladeRY: 144, topY: 352, mouthY: 656 },
    props,
    walkable: [
      { shape: 'rect', x: 64, y: 608, w: 464, h: 96 },
      { shape: 'rect', x: 432, y: 352, w: 96, h: 352 },
      { shape: 'rect', x: 480, y: 352, w: 384, h: 96 },
      { shape: 'ellipse', cx: 960, cy: 400, rx: 192, ry: 144 },
      { shape: 'rect', x: 1056, y: 352, w: 304, h: 96 },
    ],
    solidRects: [{ id: 'mournfang_block', x: 896, y: 240, w: 20, h: 336, dynamic: true }],
    interactables: [
      { id: 'rest', kind: 'object', verb: 'Istirahat', x: 616, y: 324, w: 96, h: 52 },
      { id: 'aveloria_sign', kind: 'sign', verb: 'Baca', x: 1272, y: 300, w: 48, h: 52 },
      { id: 'slice_exit', kind: 'object', verb: 'Lanjut', x: 1328, y: 352, w: 40, h: 96 },
    ],
    triggers: [
      { id: 'boss_checkpoint', x: 728, y: 352, w: 24, h: 96 },
      { id: 'mournfang', x: 832, y: 240, w: 48, h: 336 },
    ], npcs: [],
  };
}

export function loadForestEdge(): LoadedMap {
  const map = buildForestEdge();
  const footRects = map.props.flatMap(p => { const r = footRectOf(p.type, p.x, p.y); return r ? [r] : []; });
  return { map, footRects, interactables: map.interactables.map(i => ({ ...i })), collision: new CollisionMap(map.width, map.height, map.walkable, footRects) };
}

/** Grid-drawn ground, DRAFT, intentionally separate from collision and the original periodic map PNG. */
export function drawForestEdgeGround(scene: Phaser.Scene, map: ForestMap): void {
  const g = scene.add.graphics().setDepth(-1000);
  g.fillStyle(0x354a35); g.fillRect(0, 0, map.width, map.height);
  for (let y = 0; y < map.height; y += 8) for (let x = 0; x < map.width; x += 8) {
    const walkable = map.walkable.some(s => s.shape === 'rect'
      ? x + 4 >= s.x && x + 4 < s.x + s.w && y + 4 >= s.y && y + 4 < s.y + s.h
      : ((x + 4 - s.cx) / s.rx) ** 2 + ((y + 4 - s.cy) / s.ry) ** 2 <= 1);
    const n = Math.abs((x * 17 ^ y * 31) % 13);
    if (walkable) { g.fillStyle(n < 4 ? 0x77694d : 0x726247); g.fillRect(x, y, 8, 8); }
    else if (n < 2) { g.fillStyle(0x40543a); g.fillRect(x + 2, y + 2, 2, 3); }
  }
  // Broken claw marks lead into the clearing; their purpose is anticipation, not decoration.
  g.fillStyle(0x504638);
  for (const [x, y] of [[774, 394], [794, 400], [813, 392]]) for (let i = 0; i < 3; i++) g.fillRect(x! + i * 4, y!, 2, 8);
}
