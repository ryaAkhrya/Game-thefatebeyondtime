import type Phaser from 'phaser';
import { AVELORIA_ATLAS, AVELORIA_ITEMS, LIORA_ATLAS, LIORA_ITEMS, type TownItem } from '../data/maps/town.layout.mjs';

export type TownArea = 'aveloria' | 'liora';
export interface TownArt { ground: Phaser.GameObjects.Image; byId: Map<string, Phaser.GameObjects.Image>; all: Phaser.GameObjects.Image[] }

const CONFIG: Record<TownArea, { atlas: string; ground: string; items: TownItem[] }> = {
  aveloria: { atlas: AVELORIA_ATLAS, ground: 'town_aveloria_ground', items: AVELORIA_ITEMS },
  liora: { atlas: LIORA_ATLAS, ground: 'town_liora_ground', items: LIORA_ITEMS },
};

/** Renderer saja: tanah hasil baking + sprite atlas (diurutkan menurut y kaki). Tidak menyentuh geometri/tabrakan. */
export function drawTown(scene: Phaser.Scene, area: TownArea): TownArt {
  const cfg = CONFIG[area];
  const ground = scene.add.image(0, 0, cfg.ground).setOrigin(0, 0).setDepth(-1000);
  const meta = scene.cache.json.get(`${cfg.atlas}:meta`) as { frames: Record<string, { pivot: { x: number; y: number } }> } | undefined;
  const byId = new Map<string, Phaser.GameObjects.Image>();
  const all: Phaser.GameObjects.Image[] = [];
  for (const it of cfg.items) {
    const pivot = meta?.frames[it.f]?.pivot ?? { x: 0.5, y: 1 };
    const img = scene.add.image(it.x, it.y, cfg.atlas, it.f).setOrigin(pivot.x, pivot.y).setDepth(it.d ?? it.y);
    if (it.flip) img.setFlipX(true);
    if (it.id) byId.set(it.id, img);
    all.push(img);
  }
  return { ground, byId, all };
}
