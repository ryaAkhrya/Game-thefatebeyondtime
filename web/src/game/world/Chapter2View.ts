import type Phaser from 'phaser';
import { C2 } from '../story/chapter2Flags';
import { footBox, type Facing } from './Collision';
import type { LoadedMap } from './forest1';
import type { Interactable } from './Interaction';
import { drawChapter2Ground } from './chapter2Maps';

const ROW: Record<Facing, number> = { down: 0, left: 1, right: 2, up: 3 };
/** Renderer only. All named sprites are the existing DRAFT atlases, with their original pivots. */
export class Chapter2View {
  private zira?: Phaser.GameObjects.Sprite;
  private torvan?: Phaser.GameObjects.Sprite;
  private veyrath?: Phaser.GameObjects.Sprite;
  private barricade?: Phaser.GameObjects.Graphics;
  private followX = 684;
  private followY = 496;
  private joined = false;
  constructor(scene: Phaser.Scene, private readonly loaded: LoadedMap, private readonly interactables: Interactable[]) {
    const area = loaded.map.id as 'liora' | 'forest_2';
    drawChapter2Ground(scene, area);
    if (area === 'liora') {
      this.zira = scene.add.sprite(480, 320, 'C07_CH2_EXPLORE', 0).setOrigin(0.5, 46 / 48).setDepth(320);
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
      this.torvan = scene.add.sprite(684, 496, 'C03_CH2_EXPLORE', 0).setOrigin(0.5, 46 / 48).setDepth(496);
      this.veyrath = scene.add.sprite(1032, 296, 'B02_CH2_BATTLE', 0).setOrigin(0.5, 92 / 96).setDepth(296);
      this.barricade = scene.add.graphics().setDepth(450);
      this.barricade.fillStyle(0x675f50); this.barricade.fillRect(992, 208, 16, 240);
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
  update(player: { x: number; y: number; facing: Facing }, moving: boolean, delta: number): void {
    if (!this.torvan || !this.joined) return;
    const offset = player.facing === 'right' ? -26 : player.facing === 'left' ? 26 : 0;
    const ahead = player.facing === 'up' ? 26 : player.facing === 'down' ? -26 : 0;
    const alpha = Math.min(1, delta / 130);
    this.followX += (player.x + offset - this.followX) * alpha;
    this.followY += (player.y + ahead - this.followY) * alpha;
    const frame = ROW[player.facing] * 6 + (moving ? 2 + Math.floor(performance.now() / 160) % 4 : 0);
    this.torvan.setPosition(Math.round(this.followX), Math.round(this.followY)).setFrame(frame).setDepth(Math.round(this.followY));
  }
  debug(): Record<string, unknown> {
    return { area: this.loaded.map.id, zira: this.zira ? { texture: this.zira.texture.key, x: this.zira.x, y: this.zira.y } : null,
      torvan: this.torvan ? { texture: this.torvan.texture.key, x: Math.round(this.torvan.x), y: Math.round(this.torvan.y), joined: this.joined } : null,
      veyrathVisible: !!this.veyrath?.visible, passageBlocked: this.loaded.collision.hasDynamic('veyrath_passage') };
  }
}
