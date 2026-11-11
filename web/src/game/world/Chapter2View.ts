import type Phaser from 'phaser';
import { C2 } from '../story/chapter2Flags';
import { footBox, type Facing } from './Collision';
import { playState, registerCharacterAnims, type CharacterAnimMeta } from './CharacterAnims';
import type { LoadedMap } from './forest1';
import type { Interactable } from './Interaction';
import { drawChapter2Ground } from './chapter2Maps';
import { Forest2Barricade, drawForest2 } from './forest2Art';

/** Renderer only. All named sprites are the existing DRAFT atlases, with their original pivots. */
export class Chapter2View {
  private zira?: Phaser.GameObjects.Sprite;
  private torvan?: Phaser.GameObjects.Sprite;
  private veyrath?: Phaser.GameObjects.Sprite;
  private barricade?: { setVisible(value: boolean): unknown };
  private followX = 684;
  private followY = 496;
  private joined = false;
  constructor(scene: Phaser.Scene, private readonly loaded: LoadedMap, private readonly interactables: Interactable[]) {
    const area = loaded.map.id as 'liora' | 'forest_2';
    if (area === 'forest_2') drawForest2(scene); else drawChapter2Ground(scene, area);
    if (area === 'liora') {
      registerCharacterAnims(scene, 'C07_CH2_EXPLORE', 'c07', scene.cache.json.get('C07_CH2_EXPLORE:meta') as CharacterAnimMeta | undefined, 6);
      this.zira = scene.add.sprite(480, 320, 'C07_CH2_EXPLORE', 0).setOrigin(0.5, 47 / 48).setDepth(320);
      playState(this.zira, 'c07', 'idle', 'down', true);
      loaded.collision.setDynamic('zira', footBox(480, 320));
      for (const [x, y, coat, task] of [[428, 584, 0x667057, 'guard'], [348, 464, 0x927859, 'drying']] as const) {
        const g = scene.add.graphics().setPosition(x, y).setDepth(y);
        g.fillStyle(0x2b2a28, 0.3); g.fillEllipse(0, 0, 18, 6);
        g.fillStyle(0xb49372); g.fillRect(-6, -32, 12, 10);
        g.fillStyle(coat); g.fillRect(-8, -22, 16, 16);
        g.fillStyle(0x554b40); g.fillRect(-7, -6, 5, 6); g.fillRect(2, -6, 5, 6);
        if (task === 'drying') { g.fillStyle(0xc1aa7b); g.fillRect(8, -20, 10, 8); }
        else { g.fillStyle(0x888c72); g.fillRect(-8, -38, 16, 5); }
        loaded.collision.setDynamic(task, footBox(x, y));
      }
    } else {
      registerCharacterAnims(scene, 'C03_CH2_EXPLORE', 'c03', scene.cache.json.get('C03_CH2_EXPLORE:meta') as CharacterAnimMeta | undefined, 6);
      this.torvan = scene.add.sprite(684, 496, 'C03_CH2_EXPLORE', 0).setOrigin(0.5, 47 / 48).setDepth(496);
      playState(this.torvan, 'c03', 'idle', 'right', true);
      this.veyrath = scene.add.sprite(1032, 296, 'B02_CH2_BATTLE', 0).setOrigin(0.5, 92 / 96).setDepth(296);
      this.barricade = new Forest2Barricade(scene); // palisade log pile, art in forest2Art.ts
    }
  }
  apply(flags: Record<string, boolean>): void {
    this.joined = !!flags[C2.torvan];
    if (this.loaded.map.id === 'forest_2') {
      this.loaded.collision.setDynamic('torvan', this.joined ? null : footBox(684, 496));
      const pass = this.loaded.map.solidRects.find(s => s.id === 'veyrath_passage')!;
      this.loaded.collision.setDynamic('veyrath_passage', flags[C2.veyrath] ? null : pass);
      this.veyrath!.setVisible(!flags[C2.veyrath]); this.barricade!.setVisible(!flags[C2.veyrath]);
      for (const it of this.interactables) {
        if (it.id === 'torvan') it.enabled = !this.joined;
        if (it.id === 'veyrath') it.enabled = !!flags[C2.tutorial] && !flags[C2.veyrath];
        if (it.id === 'fragment_a') it.enabled = !!flags[C2.veyrath];
        if (it.id === 'fragment_b') it.enabled = !!flags[C2.fragmentA];
        if (it.id === 'forest2_rest') it.enabled = this.joined;
        if (it.id === 'forest2_to_city') it.enabled = !!flags[C2.fragments];
      }
    } else {
      for (const it of this.interactables) if (it.id === 'liora_to_forest') it.enabled = !!flags[C2.zira];
    }
  }
  update(player: { x: number; y: number; facing: Facing }, moving: boolean, delta: number, sprinting = false): void {
    if (!this.torvan || !this.joined) return;
    const offset = player.facing === 'right' ? -26 : player.facing === 'left' ? 26 : 0;
    const ahead = player.facing === 'up' ? 26 : player.facing === 'down' ? -26 : 0;
    const alpha = Math.min(1, delta / 130);
    this.followX += (player.x + offset - this.followX) * alpha;
    this.followY += (player.y + ahead - this.followY) * alpha;
    // Torvan mengikuti dengan state yang sama dengan Yaric (idle/jalan/lari), memakai data animasinya sendiri
    this.torvan.setPosition(Math.round(this.followX), Math.round(this.followY)).setDepth(Math.round(this.followY));
    playState(this.torvan, 'c03', moving ? (sprinting ? 'sprint' : 'walk') : 'idle', player.facing, true);
  }
  debug(): Record<string, unknown> {
    return { area: this.loaded.map.id, zira: this.zira ? { texture: this.zira.texture.key, x: this.zira.x, y: this.zira.y } : null,
      torvan: this.torvan ? { texture: this.torvan.texture.key, x: Math.round(this.torvan.x), y: Math.round(this.torvan.y), joined: this.joined } : null,
      veyrathVisible: !!this.veyrath?.visible, passageBlocked: this.loaded.collision.hasDynamic('veyrath_passage') };
  }
}
