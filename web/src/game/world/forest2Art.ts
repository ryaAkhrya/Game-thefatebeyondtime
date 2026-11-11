import type Phaser from 'phaser';
import { BARRICADE_STAKES, buildForest2Art } from '../data/maps/forest2.map.mjs';

/**
 * Render Hutan 2 (forest_2), Polish Sprint 2. Dasar peta dan prop berasal dari atlas hasil scripts/gen-forest2-art.mjs
 * (DRAFT, dilukis kode); penempatan di data/maps/forest2.map.mjs. Murni visual: collision dan cerita ada di chapter2Maps.ts.
 * Kedalaman: prop memakai setDepth(y) dengan titik acuan di dasar, jadi kanopi pohon menutupi pemain hanya bila pemain
 * berada di utara pangkal batang.
 */
const ATLAS = 'forest2_props';
const GROUND = 'forest2_ground';
/** Prop yang digambar datar di atas dasar peta (selalu di bawah karakter). */
const DECALS = new Set(['flowers', 'flowers_v', 'mushrooms', 'mushrooms_b']);

type Meta = { frames: Record<string, { pivot: { y: number } }> } | undefined;

function frameOrigin(scene: Phaser.Scene, type: string): number {
  const meta = scene.cache.json.get(`${ATLAS}:meta`) as Meta;
  return meta?.frames[type]?.pivot.y ?? 1;
}

export function drawForest2(scene: Phaser.Scene): void {
  if (scene.textures.exists(GROUND)) scene.add.image(0, 0, GROUND).setOrigin(0, 0).setDepth(-1000);
  else scene.add.rectangle(0, 0, 1280, 768, 0x183a38).setOrigin(0, 0).setDepth(-1000);
  if (!scene.textures.exists(ATLAS)) return;
  const tex = scene.textures.get(ATLAS);
  const palisade = new Set(BARRICADE_STAKES.map((s) => `${s.type}:${Math.round(s.x)}:${Math.round(s.y)}`));
  for (const p of buildForest2Art().props) {
    if (palisade.has(`${p.type}:${p.x}:${p.y}`) || !tex.has(p.type)) continue; // palisade dibuat oleh Forest2Barricade
    scene.add.image(p.x, p.y, ATLAS, p.type).setOrigin(0.5, frameOrigin(scene, p.type)).setDepth(DECALS.has(p.type) ? -500 : p.y);
  }
}

/** Palisade Veyrath: tumpukan balok kayu utara-selatan di x~1000. Menyediakan setVisible agar Chapter2View dapat menyembunyikannya setelah Veyrath kalah. */
export class Forest2Barricade {
  private readonly parts: Phaser.GameObjects.Image[] = [];
  constructor(scene: Phaser.Scene) {
    if (!scene.textures.exists(ATLAS)) return;
    const tex = scene.textures.get(ATLAS);
    for (const s of BARRICADE_STAKES) {
      if (!tex.has(s.type)) continue;
      this.parts.push(scene.add.image(Math.round(s.x), Math.round(s.y), ATLAS, s.type).setOrigin(0.5, frameOrigin(scene, s.type)).setDepth(Math.round(s.y)));
    }
  }
  setVisible(value: boolean): this {
    for (const p of this.parts) p.setVisible(value);
    return this;
  }
}
