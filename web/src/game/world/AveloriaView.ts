import Phaser from 'phaser';
import { CITY_FLAG as F } from '../story/aveloriaFlags';
import { C2 } from '../story/chapter2Flags';
import { CITIZENS, CITY_NPCS, drawAveloria } from './aveloria';
import { footBox, type Facing } from './Collision';
import { playState, registerCharacterAnims, type CharacterAnimMeta } from './CharacterAnims';
import type { LoadedMap } from './forest1';
import type { Interactable } from './Interaction';
import { drawResident } from './residentArt';

const ROW: Record<Facing, number> = { down: 0, left: 1, right: 2, up: 3 };
export interface Actor { x: number; y: number; facing: Facing; entity: string; sprite: Phaser.GameObjects.Sprite; shadow: Phaser.GameObjects.Ellipse }

/** Renderer only. Original named-character textures and pivots are preserved. */
export class AveloriaView {
  private actors = new Map<string, Actor>();
  private residents: { graphic: Phaser.GameObjects.Graphics; id: string; x: number; y: number }[] = [];
  private gate: Phaser.GameObjects.Image;
  private bell: Phaser.GameObjects.Image;
  private doorClosed: Phaser.GameObjects.Image;
  private doorOpen: Phaser.GameObjects.Image;
  private dusk: Phaser.GameObjects.Rectangle;
  private evening = false;
  private bellNumber = 0;
  private phase = 'explore';
  constructor(private readonly scene: Phaser.Scene, private readonly loaded: LoadedMap, private readonly interactables: Interactable[]) {
    const art = drawAveloria(scene); this.gate = art.gate; this.bell = art.bell; this.doorClosed = art.doorClosed; this.doorOpen = art.doorOpen;
    this.dusk = scene.add.rectangle(0, 0, loaded.map.width, loaded.map.height, 0x25263d, 0).setOrigin(0).setDepth(9000);
    for (const n of CITY_NPCS) {
      const shadow = scene.add.ellipse(n.x, n.y - 1, 18, 6, 0x20272a, 0.35).setDepth(n.y - 1);
      const tex = `${n.entity}_CITY_EXPLORE`;
      const tag = `${n.entity.toLowerCase()}city`;
      registerCharacterAnims(scene, tex, tag, scene.cache.json.get(`${tex}:meta`) as CharacterAnimMeta | undefined, 6);
      const sprite = scene.add.sprite(n.x, n.y, tex, ROW[n.facing] * 6).setOrigin(0.5, 47 / 48).setDepth(n.y);
      sprite.setData('tag', tag);
      playState(sprite, tag, 'idle', n.facing, true); // idle hidup: bernapas, kain/rambut bergerak, tidak serempak antar NPC
      this.actors.set(n.id, { ...n, sprite, shadow });
    }
    for (const n of CITIZENS) {
      // Unnamed residents are replaceable code-native DRAFT sprites, not reused named identities.
      const g = scene.add.graphics().setPosition(n.x, n.y).setDepth(n.y);
      drawResident(g, n.color, n.task);
      this.residents.push({ graphic: g, id: n.id, x: n.x, y: n.y });
      loaded.collision.setDynamic(`resident:${n.id}`, footBox(n.x, n.y));
    }
  }
  apply(flags: Record<string, boolean>): void {
    const lioraExit = this.interactables.find(i => i.id === 'liora_exit');
    if (lioraExit) lioraExit.enabled = !!flags[C2.farewell];
    this.gate.setVisible(!flags[F.gate]);
    this.doorClosed.setVisible(!flags[F.archive]); this.doorOpen.setVisible(!!flags[F.archive]);
    const gate = this.loaded.map.solidRects.find(s => s.id === 'city_gate')!;
    const door = this.loaded.map.solidRects.find(s => s.id === 'palace_door')!;
    this.loaded.collision.setDynamic('city_gate', flags[F.gate] ? null : gate);
    this.loaded.collision.setDynamic('palace_door', flags[F.archive] ? null : door);
    if (!flags[F.gate]) this.place('talric', 640, 1148, 'down');
    else if (!flags[F.archive]) this.place('talric', 848, 824, 'right');
    else this.place('talric', 752, 552, 'left');
    this.place('azie', 912, 776, 'down');
    if (flags[F.velthia]) this.place('velthia', 672, 552, 'left');
    else this.place('velthia', 640, 248, 'down');
    if (flags[F.complete] && !flags[C2.start]) { this.night(); this.bellNumber = 2; this.phase = 'complete'; }
    if (flags[C2.start]) { this.evening = false; this.dusk.setAlpha(0); this.phase = 'chapter2'; }
  }
  stage(stage: string): void {
    this.phase = stage;
    if (stage === 'audience') {
      this.place('talric', 560, 280, 'right'); this.place('azie', 720, 280, 'left');
    } else if (stage === 'evening') {
      this.night(); this.place('velthia', 672, 552, 'up'); this.place('azie', 704, 576, 'up'); this.place('talric', 752, 552, 'up');
    }
  }
  react(speaker: string, line: string): void {
    const id = [...this.actors.entries()].find(([, actor]) => actor.entity === speaker)?.[0];
    if (id) {
      const actor = this.actors.get(id)!;
      // An actual existing idle variation, not a fabricated emotion/gesture frame.
      void line; // idle berbasis data tetap berjalan; tidak ada frame ekspresi palsu
      playState(actor.sprite, actor.sprite.getData('tag') as string, 'idle', actor.facing);
    }
  }
  /** Akses NPC bernama (talric, azie, velthia, derrria) untuk view krisis Bab III. */
  actor(id: string): Actor | undefined { return this.actors.get(id); }
  get bellImage(): Phaser.GameObjects.Image { return this.bell; }
  get gateImage(): Phaser.GameObjects.Image { return this.gate; }
  /** Gerbang kota: terbuka = portcullis tersembunyi + collision dilepas (tanpa menyentuh flag Bab I). */
  setGate(open: boolean): void {
    const gate = this.loaded.map.solidRects.find(s => s.id === 'city_gate')!;
    this.gate.setVisible(!open);
    this.loaded.collision.setDynamic('city_gate', open ? null : gate);
  }
  /** Warga grafis Bab I disembunyikan (Bab III menggantinya dengan sprite warga krisis). */
  setResidentsVisible(visible: boolean): void {
    for (const r of this.residents) {
      r.graphic.setVisible(visible);
      this.loaded.collision.setDynamic(`resident:${r.id}`, visible ? footBox(r.x, r.y) : null);
    }
  }
  private night(): void { this.evening = true; this.dusk.setAlpha(0.22); }
  /** Menaruh NPC bernama (sprite, bayangan, collision dinamis, kotak interaksi). Dipakai juga oleh AveloriaCrisisView. */
  place(id: string, x: number, y: number, facing: Facing): void {
    const n = this.actors.get(id)!; Object.assign(n, { x, y, facing });
    n.sprite.setPosition(x, y).setDepth(y); playState(n.sprite, n.sprite.getData('tag') as string, 'idle', facing, true); n.shadow.setPosition(x, y - 1).setDepth(y - 1);
    this.loaded.collision.setDynamic(`cityNpc:${id}`, footBox(x, y));
    const it = this.interactables.find(i => i.id === id);
    if (it && id !== 'azie' && id !== 'derrria') Object.assign(it, { x: x - 24, y: y - 8, w: 48, h: 32 });
  }
  ring(number: 1 | 2): Promise<void> {
    this.bellNumber = number;
    return new Promise(resolve => this.scene.tweens.add({ targets: this.bell, angle: { from: -16, to: 16 }, duration: 160, yoyo: true, repeat: 1,
      onComplete: () => { this.bell.setAngle(0); resolve(); } }));
  }
  update(time: number, busy: boolean): void {
    for (const n of this.residents) {
      // Work pauses when the second bell is observed. No pathing through player/buildings.
      n.graphic.setX(n.x + (!busy && !this.evening && n.id === 'sweeper' ? Math.round(Math.sin(time / 700)) : 0));
    }
  }
  debug(): unknown {
    return { phase: this.phase, evening: this.evening, bellNumber: this.bellNumber, clock: '21:00', bellAngle: this.bell.angle,
      safeZone: true, npcs: Object.fromEntries([...this.actors].map(([id, n]) => [id, { x: n.x, y: n.y, facing: n.facing, texture: n.sprite.texture.key, originY: n.sprite.originY, anim: n.sprite.anims.currentAnim?.key ?? null }])),
      citizens: this.residents.map(n => ({ id: n.id, working: !this.evening })) };
  }
}
