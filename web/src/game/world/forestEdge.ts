import type Phaser from 'phaser';
import type { ForestMap } from '../data/maps/forest1.map.mjs';
import { buildForestEdgeMap } from '../data/maps/forestEdge.map.mjs';
import { CollisionMap } from './Collision';
import { footRectOf, type LoadedMap } from './forest1';

/** Small non-looping continuation. Map data (props, walkable, triggers) lives in forestEdge.map.mjs, shared with the art generator. */
export function buildForestEdge(): ForestMap {
  return buildForestEdgeMap();
}

export function loadForestEdge(): LoadedMap {
  const map = buildForestEdge();
  const footRects = map.props.flatMap(p => { const r = footRectOf(p.type, p.x, p.y); return r ? [r] : []; });
  return { map, footRects, interactables: map.interactables.map(i => ({ ...i })), collision: new CollisionMap(map.width, map.height, map.walkable, footRects) };
}

/** Ground: baked PNG from scripts/gen-forest-edge-art.mjs (DRAFT). Falls back to a flat fill if the texture failed to load. Separate from collision. */
export function drawForestEdgeGround(scene: Phaser.Scene, map: ForestMap): void {
  if (scene.textures.exists('forest_edge_ground')) { scene.add.image(0, 0, 'forest_edge_ground').setOrigin(0, 0).setDepth(-1000); return; }
  const g = scene.add.graphics().setDepth(-1000);
  g.fillStyle(0x354a35); g.fillRect(0, 0, map.width, map.height);
}
