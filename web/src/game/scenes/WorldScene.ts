import Phaser from 'phaser';
import { ENV, SPRITE_KEYS } from '../data/assetPaths';
import { SCENE_KEYS, type AreaId } from '../data/ids';
import { footBox, moveWithCollision, pointIn, type Facing, type Rect } from '../world/Collision';
import { findInteractable, type Interactable } from '../world/Interaction';
import { loadForest1, type LoadedMap } from '../world/forest1';
import { Chapter1Story, FLAG, type StoryAction } from '../story/Chapter1Story';
import { getServices, type Services } from '../systems/Services';
import type { HudScene } from './HudScene';
import { drawForestEdgeGround, loadForestEdge } from '../world/forestEdge';
import { BOSS_CHECKPOINT, FOREST_EDGE_FLAG, MOURNFANG_FLAG } from '../combat/encounters';
import { restBeforeMournfang } from '../rpg/checkpoints';
import { BATTLE_TEXTURE } from '../combat/BattleAtlas';
import { loadAveloria } from '../world/aveloria';
import { AveloriaView } from '../world/AveloriaView';
import { derrriaShop } from '../rpg/derrria';
import { loadForest2, loadLiora } from '../world/chapter2Maps';
import { Chapter2View } from '../world/Chapter2View';
import { FOREST2_SPAWN, LIORA_SPAWN, RETURN_SPAWN } from '../story/chapter2Flags';
import { joinTorvan, restChapter2Party } from '../rpg/party';

const WALK_SPEED = 88; // px/detik (2,75 petak/detik)
const MAX_DT = 50; // ms; batas langkah waktu supaya tidak ada lompatan saat tab melambat
const DIR_ROW: Record<Facing, number> = { down: 0, left: 1, right: 2, up: 3 };
const DECAL_TYPES = new Set(['flowers', 'mushrooms']);

interface Walker {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  x: number;
  y: number;
  facing: Facing;
}

/**
 * Dunia eksplorasi Hutan 1 dan tepi hutan (Chapter I, C1-01..C1-05). WorldScene menghubungkan collision (world/Collision),
 * interaksi (world/Interaction), keputusan cerita (story/Chapter1Story) dan UI (HudScene). Tidak ada logika cerita di sini.
 */
export class WorldScene extends Phaser.Scene {
  private services!: Services;
  private loaded!: LoadedMap;
  private story!: Chapter1Story;
  private hud!: HudScene;
  private player!: Walker;
  private nambo?: Walker;
  private bossSprite?: Phaser.GameObjects.Sprite;
  private propSprites = new Map<string, Phaser.GameObjects.Image>();
  private interactables: Interactable[] = [];
  private insideTriggers = new Set<string>();
  private releaseInput?: () => void;
  private busy = false;
  private started = false;
  private leaving = false;
  private wrapCount = 0;
  private wasMoving = false;
  private target: Interactable | null = null;
  private actionLog: string[] = [];
  private city?: AveloriaView;
  private chapter2?: Chapter2View;
  private cityLine = '';

  constructor() {
    super(SCENE_KEYS.World);
  }

  create(): void {
    this.services = getServices(this);
    this.services.checkpoints.setSafe(false);
    const { gameState, input, audio, settings } = this.services;
    if (!gameState.isActive) gameState.startNewGame();
    this.story = new Chapter1Story(gameState);
    const area = gameState.snapshot()!.area;
    this.loaded = area === 'aveloria' ? loadAveloria() : area === 'liora' ? loadLiora() : area === 'forest_2' ? loadForest2() : area === 'forest_edge' ? loadForestEdge() : loadForest1();
    this.city = undefined; this.chapter2 = undefined; this.cityLine = '';
    this.nambo = undefined; this.bossSprite = undefined;
    this.busy = false;
    this.started = false;
    this.leaving = false;
    this.wrapCount = gameState.snapshot()!.world.forestWrapCount;
    this.insideTriggers.clear();
    this.propSprites.clear();
    this.actionLog = [];
    const { map } = this.loaded;

    this.cameras.main.setBackgroundColor(0x1d1625);

    // ---- dasar peta (fallback polos bila gambar gagal dimuat) ----
    if (map.id === 'aveloria' || map.id === 'liora' || map.id === 'forest_2') { /* ground is drawn with area view below */ }
    else if (map.id === 'forest_edge') drawForestEdgeGround(this, map);
    else if (this.textures.exists(ENV.groundKey)) this.add.image(0, 0, ENV.groundKey).setOrigin(0, 0).setDepth(-1000);
    else this.add.rectangle(0, 0, map.width, map.height, 0x2e4934).setOrigin(0, 0).setDepth(-1000);

    // ---- prop ----
    const meta = this.cache.json.get(ENV.propsMetaKey) as { frames: Record<string, { pivot: { y: number } }> } | undefined;
    for (const p of map.props) {
      if (!this.textures.exists(ENV.propsKey) || !this.textures.get(ENV.propsKey).has(p.type)) continue;
      const pivotY = meta?.frames[p.type]?.pivot.y ?? 1;
      const img = this.add.image(p.x, p.y, ENV.propsKey, p.type).setOrigin(0.5, pivotY).setDepth(DECAL_TYPES.has(p.type) ? -500 : p.y);
      this.propSprites.set(p.id, img);
    }

    // ---- karakter ----
    this.createAnimations();
    const saved = gameState.snapshot()!.position;
    const hasSaved = saved.x > 0 || saved.y > 0;
    this.player = this.makeWalker(SPRITE_KEYS.yaric, hasSaved ? saved.x : map.spawn.x, hasSaved ? saved.y : map.spawn.y, hasSaved ? saved.facing : map.spawn.facing, 4, 'c01');
    const nm = map.npcs[0];
    if (nm) {
      this.nambo = this.makeWalker(SPRITE_KEYS.nambo, nm.x, nm.y, nm.facing, 6, 'c08');
      if (this.story.namboDone) this.placeNambo(352, 458, 'down');
      else this.updateNamboBlocker();
    }
    if (map.id === 'forest_edge' && !gameState.hasFlag(MOURNFANG_FLAG)) {
      this.bossSprite = this.add.sprite(972, 400, BATTLE_TEXTURE.B01, 0).setOrigin(0.5, 92 / 96).setFlipX(true).setDepth(400);
    }

    // ---- keadaan dinamis dari flag ----
    this.interactables = this.loaded.interactables.map((i) => ({ ...i }));
    if (map.id === 'aveloria') this.city = new AveloriaView(this, this.loaded, this.interactables);
    if (map.id === 'liora' || map.id === 'forest_2') this.chapter2 = new Chapter2View(this, this.loaded, this.interactables);
    this.syncNamboInteractable();
    this.applyFlagState();
    if (this.chapter2 && gameState.snapshot()!.party.includes('C03')) this.chapter2.update(this.player, false, 1000);
    // Legacy/out-of-bounds positions return to the existing safe spawn; flags/items remain untouched.
    if (!this.loaded.collision.canStand(footBox(this.player.x, this.player.y)) || (map.id === 'forest_1' && !this.story.awake && this.player.x > 264)) {
      this.player.x = map.spawn.x; this.player.y = map.spawn.y; this.player.facing = map.spawn.facing;
    }

    // ---- kamera ----
    const cam = this.cameras.main;
    cam.setBounds(0, 0, map.width, map.height);
    cam.centerOn(this.player.x, this.player.y - 24);
    cam.startFollow(this.player.sprite, true, 0.14, 0.14);

    // ---- HUD & input ----
    this.scene.launch(SCENE_KEYS.Hud);
    this.hud = this.scene.get(SCENE_KEYS.Hud) as HudScene;
    this.releaseInput = input.pushLayer('world', (e) => {
      if (this.busy) return;
      if (e.intent === 'confirm') this.tryInteract();
      else if (e.intent === 'back') this.services.router.openOverlay(this, SCENE_KEYS.Pause);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.releaseInput?.();
      audio.stopBgm();
      this.scene.stop(SCENE_KEYS.Hud);
    });

    // Musik hutan: BGM_FOREST_01 berstatus AWAITING_COMPOSER -> senyap tanpa error, dimulai hanya setelah gesture.
    audio.playBgm(map.id === 'aveloria' ? 'BGM_AVELORIA_DAY' : map.id === 'liora' ? 'BGM_LIORA' : map.id === 'forest_2' ? 'BGM_FOREST_02' : 'BGM_FOREST_01');

    // fade-in: pembukaan C1-01 pelan (bangun), selanjutnya singkat
    const firstTime = !this.story.objective();
    this.services.router.arrive(this);
    cam.fadeEffect.start(false, firstTime ? 1600 : 160, 29, 22, 37, true);
    void settings;
  }

  // ------------------------------------------------------------------ frame

  override update(_time: number, delta: number): void {
    if (!this.hud?.ready || this.leaving) return;
    if (!document.hidden) this.services.gameState.tick(delta / 1000);
    if (!this.started) {
      this.started = true;
      this.hud.setObjective(this.story.objective());
      const actions = this.story.onStart();
      if (actions.length > 0) {
        // jeda singkat: kamera diam sebelum pemain bergerak (arahan C1-01)
        this.busy = true;
        this.time.delayedCall(900, () => void this.runActions(actions));
      }
    }
    const dt = Math.min(delta, MAX_DT) / 1000;
    const { input } = this.services;

    // ---- gerak ----
    let moved = 0;
    const canMove = !this.busy && input.topLayerId === 'world';
    const dir = canMove ? input.getMoveDirection() : null;
    if (dir) {
      this.player.facing = dir;
      const vx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
      const vy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
      const r = moveWithCollision(this.loaded.collision, this.player.x, this.player.y, vx * WALK_SPEED * dt, vy * WALK_SPEED * dt);
      this.player.x = r.x;
      this.player.y = r.y;
      moved = r.moved;
    }
    this.handleWrap();
    this.syncWalker(this.player, moved > 0);
    if (this.nambo) this.syncWalker(this.nambo, false, true);
    this.city?.update(_time, this.busy);
    this.chapter2?.update(this.player, moved > 0, delta);
    const dialogue = this.hud.dialogue.debug;
    if (this.city && dialogue && dialogue.line !== this.cityLine) {
      this.cityLine = dialogue.line;
      this.city.react(dialogue.portrait.split('_')[0]!, dialogue.line);
      if (dialogue.line.startsWith('C1-08')) this.player.facing = dialogue.line === 'C1-08-L013' ? 'left' : 'up';
    }

    // ---- pemicu & prompt ----
    if (!this.busy) this.checkTriggers();
    this.updatePrompt();
    this.services.gameState.setPosition(this.player.x, this.player.y, this.player.facing, this.loaded.map.id as AreaId);
    this.services.checkpoints.setSafe(!this.busy && !this.hud.dialogue.active);
    const saved = this.services.checkpoints.flush();
    if (saved && !saved.ok) this.hud.toast('Simpan otomatis gagal. Coba Simpan/Muat.');
    this.wasMoving = moved > 0;
  }

  // ------------------------------------------------------------ pengulangan

  /** Lorong berulang: melewati wrapX menggeser pemain -periode (dekorasi periodik identik, kamera ikut digeser). */
  private handleWrap(): void {
    const { zone } = this.loaded.map;
    if (this.story.loopDone || this.player.x < zone.wrapX) return;
    const shift = zone.period;
    this.player.x -= shift;
    this.cameras.main.scrollX -= shift;
    this.wrapCount++;
    this.services.gameState.setWrapCount(this.wrapCount);
    this.services.checkpoints.requestAutosave();
    this.insideTriggers.clear();
    this.actionLog.push(`wrap#${this.wrapCount}`);
  }

  // ------------------------------------------------------------- interaksi

  private updatePrompt(): void {
    if (this.busy) {
      this.hud.showPrompt(null);
      this.target = null;
      return;
    }
    this.target = findInteractable({ x: this.player.x, y: this.player.y }, this.player.facing, this.interactables);
    this.hud.showPrompt(this.target ? `E  ${this.target.verb}` : null);
  }

  private tryInteract(): void {
    if (this.busy || !this.target) return;
    const t = this.target;
    const actions = this.story.interact(t.id, { copy: t.copy, wrapCount: this.wrapCount });
    this.actionLog.push(`interact:${t.id}`);
    if (actions.length > 0) void this.runActions(actions);
  }

  private checkTriggers(): void {
    const fx = this.player.x;
    const fy = this.player.y - 2;
    const inside = new Set<string>();
    for (const t of this.loaded.map.triggers) {
      if (pointIn(t, fx, fy)) inside.add(t.id);
    }
    for (const id of inside) {
      if (this.insideTriggers.has(id)) continue; // hanya saat MASUK
      const t = this.loaded.map.triggers.find((x) => x.id === id)!;
      const actions = this.story.trigger(id, { copy: t.copy, wrapCount: this.wrapCount });
      this.actionLog.push(`trigger:${id}`);
      if (actions.length > 0) {
        this.insideTriggers = inside;
        void this.runActions(actions);
        return;
      }
    }
    this.insideTriggers = inside;
  }

  // -------------------------------------------------------------- aksi cerita

  private async runActions(actions: readonly StoryAction[]): Promise<void> {
    this.busy = true;
    this.services.checkpoints.setSafe(false);
    let completed = false;
    try {
      for (const a of actions) await this.runAction(a);
      completed = true;
    } finally {
      this.busy = false;
      this.hud.setObjective(this.story.objective());
      if (completed && actions.some(a => a.type === 'setFlag' || a.type === 'giveItem' || a.type === 'rest' || a.type === 'joinTorvan' || a.type === 'restParty')) this.services.checkpoints.requestAutosave();
    }
  }

  private async runAction(a: StoryAction): Promise<void> {
    const { gameState } = this.services;
    switch (a.type) {
      case 'changeArea': {
        this.leaving = true;
        const next = gameState.snapshot()!;
        const previous = next.area;
        next.area = a.area;
        next.position = a.area === 'liora' ? previous === 'forest_2' ? { x: 480, y: 160, facing: 'down' } : { ...LIORA_SPAWN }
          : a.area === 'forest_2' ? { ...FOREST2_SPAWN }
          : previous === 'forest_2' ? { ...RETURN_SPAWN } : { x: 640, y: 1312, facing: 'up' };
        gameState.load(next); this.services.checkpoints.requestAutosave();
        this.services.router.goto(this, SCENE_KEYS.World);
        await new Promise<void>(() => undefined);
        break;
      }
      case 'joinTorvan':
        gameState.load(joinTorvan(gameState.snapshot()!)); this.applyFlagState();
        break;
      case 'restParty':
        gameState.load(restChapter2Party(gameState.snapshot()!)); this.applyFlagState();
        break;
      case 'chapter2End':
        gameState.setPosition(this.player.x, this.player.y, this.player.facing, 'aveloria');
        this.services.checkpoints.setSafe(true); this.services.checkpoints.requestAutosave();
        if (this.services.checkpoints.flush()?.ok === false) this.hud.toast('Simpan otomatis gagal.');
        this.services.router.openOverlay(this, SCENE_KEYS.SliceEnd);
        break;
      case 'cityStage': {
        this.city?.stage(a.stage);
        if (a.stage === 'vista') {
          const cam = this.cameras.main; cam.stopFollow();
          await this.panTo(640, 920, 650);
        } else if (a.stage === 'vistaEnd') {
          const cam = this.cameras.main;
          await this.panTo(this.player.x, this.player.y - 24, 550);
          cam.startFollow(this.player.sprite, true, 0.14, 0.14);
        } else if (a.stage === 'audience') {
          this.player.x = 640; this.player.y = 304; this.player.facing = 'up';
        } else if (a.stage === 'evening') {
          this.services.audio.stopBgm();
          this.player.facing = 'right';
          this.cameras.main.stopFollow();
          await this.panTo(720, 480, 450);
        } else if (a.stage === 'gate' || a.stage === 'archive') this.player.facing = 'up';
        break;
      }
      case 'cityBell':
        this.actionLog.push(`bell:${a.number}:21:00`);
        await this.city?.ring(a.number);
        break;
      case 'shop':
        this.services.router.openOverlay(this, SCENE_KEYS.Shop, { shop: derrriaShop(gameState.snapshot()!) });
        break;
      case 'chapterEnd':
        gameState.setPosition(this.player.x, this.player.y, this.player.facing, 'aveloria');
        this.services.checkpoints.setSafe(true); this.services.checkpoints.requestAutosave();
        if (this.services.checkpoints.flush()?.ok === false) this.hud.toast('Simpan otomatis gagal.');
        this.cameras.main.startFollow(this.player.sprite, true, 0.14, 0.14);
        this.services.router.openOverlay(this, SCENE_KEYS.SliceEnd);
        break;
      case 'forestEdge': {
        this.leaving = true; // the old scene must not overwrite the new area's spawn during its fade
        const data = gameState.snapshot()!;
        data.area = 'forest_edge'; data.position = loadForestEdge().map.spawn; data.flags[FOREST_EDGE_FLAG] = true;
        gameState.load(data); this.services.checkpoints.requestAutosave();
        this.services.router.goto(this, SCENE_KEYS.World);
        await new Promise<void>(() => undefined);
        break;
      }
      case 'rest':
        gameState.load(restBeforeMournfang(gameState.snapshot()!));
        break;
      case 'mournfangApproach':
        if (this.bossSprite) {
          this.bossSprite.setFrame(1);
          await new Promise<void>(resolve => this.tweens.add({ targets: this.bossSprite, x: 948, duration: 480, onComplete: () => resolve() }));
          this.bossSprite.setFrame(0);
        }
        break;
      case 'sliceEnd':
        gameState.setPosition(this.player.x, this.player.y, this.player.facing, 'forest_edge');
        this.services.checkpoints.setSafe(true); this.services.checkpoints.requestAutosave(); this.services.checkpoints.flush();
        this.services.router.openOverlay(this, SCENE_KEYS.SliceEnd);
        break;
      case 'dialogue':
        this.actionLog.push(`dialogue:${a.script.id}`);
        await this.hud.playDialogue(a.script);
        break;
      case 'setFlag':
        if (gameState.setFlag(a.flag)) this.actionLog.push(`flag:${a.flag}`);
        if (this.city || this.chapter2 || a.flag === FLAG.awake || a.flag === FLAG.victorySeen) this.applyFlagState();
        break;
      case 'objective':
        this.hud.setObjective(this.story.objective());
        break;
      case 'toast':
        this.hud.toast(a.text);
        break;
      case 'giveItem':
        if (!gameState.hasFlag(FLAG.chestReward)) {
          gameState.addItem(a.item, a.count);
          gameState.setFlag(FLAG.chestReward);
          this.actionLog.push(`item:${a.item}`);
        }
        break;
      case 'npc':
        if (a.op === 'face_player') this.facePlayer();
        else await this.namboStepAside();
        break;
      case 'openThicket':
        this.openThicket();
        break;
      case 'openChest':
        this.openChest();
        break;
      case 'battle':
        this.hud.showPrompt(null);
        if (a.encounter === 'veyrath' || a.encounter === 'duo_tutorial' || a.encounter === 'forest2_patrol') {
          if (a.encounter === 'veyrath') gameState.load(restChapter2Party(gameState.snapshot()!));
          this.player.x = a.encounter === 'veyrath' ? 928 : 744; this.player.y = a.encounter === 'veyrath' ? 320 : 544; this.player.facing = 'right';
          gameState.setPosition(this.player.x, this.player.y, this.player.facing, 'forest_2');
        } else if (a.encounter === 'mournfang') {
          gameState.load(restBeforeMournfang(gameState.snapshot()!));
          this.player.x = BOSS_CHECKPOINT.x; this.player.y = BOSS_CHECKPOINT.y; this.player.facing = BOSS_CHECKPOINT.facing;
          gameState.setPosition(this.player.x, this.player.y, this.player.facing, 'forest_edge');
        } else {
          this.player.y = 100; this.player.facing = 'down';
          gameState.setPosition(this.player.x, 100, 'down', 'forest_1');
        }
        this.services.checkpoints.setSafe(true);
        this.services.checkpoints.requestAutosave();
        const save = this.services.checkpoints.flush(); // complete, safe checkpoint before entering the scripted encounter
        if (save && !save.ok) this.hud.toast('Simpan otomatis gagal.');
        this.services.checkpoints.setSafe(false);
        this.leaving = true;
        this.services.router.goto(this, SCENE_KEYS.Battle, { encounter: a.encounter ?? 'hollowling' });
        // router.goto menghentikan scene ini; tunggu tanpa melakukan apa pun lagi
        await new Promise<void>(() => undefined);
        break;
    }
  }

  // ------------------------------------------------------------ keadaan dunia

  private applyFlagState(): void {
    if (this.city) { this.city.apply(this.services.gameState.snapshot()!.flags); return; }
    if (this.chapter2) { this.chapter2.apply(this.services.gameState.snapshot()!.flags); return; }
    const { collision, map } = this.loaded;
    const gm = map.solidRects.find((s) => s.id === 'gate_awake');
    if (gm) collision.setDynamic('gate_awake', this.story.awake ? null : rectOf(gm));
    if (this.story.loopNoticed) this.openThicket(false);
    else for (const s of map.solidRects) if (s.id.startsWith('thicket_block')) collision.setDynamic(s.id, rectOf(s));
    if (this.services.gameState.hasFlag(FLAG.chestReward)) this.openChest(false);
    const boss = map.solidRects.find(s => s.id === 'mournfang_block');
    if (boss) collision.setDynamic(boss.id, this.services.gameState.hasFlag(MOURNFANG_FLAG) ? null : rectOf(boss));
    for (const i of this.interactables) if (i.id.startsWith('forest_exit')) i.enabled = this.services.gameState.hasFlag(FLAG.victorySeen);
  }

  private panTo(x: number, y: number, duration: number): Promise<void> {
    return new Promise(resolve => {
      this.cameras.main.once('camerapancomplete', () => resolve());
      this.cameras.main.pan(x, y, duration, 'Sine.easeInOut', true);
    });
  }

  private openThicket(animate = true): void {
    const { collision, map } = this.loaded;
    for (const s of map.solidRects) if (s.id.startsWith('thicket_block')) collision.setDynamic(s.id, null);
    for (const p of map.props) if (p.role === 'thicket') this.propSprites.get(p.id)?.setFrame('thicket_open');
    for (const i of this.interactables) if (i.id.startsWith('thicket')) i.enabled = false;
    void animate;
  }

  private openChest(_animate = true): void {
    for (const p of this.loaded.map.props) if (p.role === 'chest') this.propSprites.get(p.id)?.setFrame('chest_open');
  }

  // ---------------------------------------------------------------- Nambo

  private updateNamboBlocker(): void {
    if (!this.nambo) return;
    const b = footBox(this.nambo.x, this.nambo.y);
    this.loaded.collision.setDynamic('nambo', { x: b.x - 4, y: b.y - 2, w: b.w + 8, h: b.h + 4 });
  }

  private syncNamboInteractable(): void {
    if (!this.nambo) return;
    const it = this.interactables.find((i) => i.id === 'nambo');
    if (!it) return;
    it.x = this.nambo.x - 26;
    it.y = this.nambo.y - 52;
    it.w = 52;
    it.h = 62;
  }

  private placeNambo(x: number, y: number, facing: Facing): void {
    if (!this.nambo) return;
    this.nambo.x = x;
    this.nambo.y = y;
    this.nambo.facing = facing;
    this.updateNamboBlocker();
    this.syncNamboInteractable();
  }

  private facePlayer(): void {
    if (!this.nambo) return;
    const dx = this.player.x - this.nambo.x;
    const dy = this.player.y - this.nambo.y;
    this.nambo.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
    // Yaric juga menoleh ke Nambo
    this.player.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'right' : 'left') : dy < 0 ? 'down' : 'up';
  }

  /** "Nambo menepi memberi jalan": berjalan ke bahu jalan utara. */
  private namboStepAside(): Promise<void> {
    if (!this.nambo) return Promise.resolve();
    return new Promise((resolve) => {
      const n = this.nambo!;
      n.facing = 'up';
      const walking = true;
      void walking;
      this.tweens.add({
        targets: n,
        y: 458,
        duration: 650,
        onUpdate: () => this.syncWalker(n, true, true),
        onComplete: () => {
          n.facing = 'down';
          this.updateNamboBlocker();
          this.syncNamboInteractable();
          resolve();
        },
      });
    });
  }

  // ---------------------------------------------------------- sprite helper

  private makeWalker(key: string, x: number, y: number, facing: Facing, cols: 4 | 6, tag: 'c01' | 'c08'): Walker {
    const shadow = this.add.ellipse(x, y - 1, 18, 6, 0x10161a, 0.38).setDepth(y - 1);
    const sprite = this.add.sprite(x, y, key, DIR_ROW[facing] * cols).setOrigin(0.5, 47 / 48).setDepth(y);
    sprite.setData('tag', tag);
    return { sprite, shadow, x, y, facing };
  }

  private createAnimations(): void {
    const mk = (key: string, sheet: string, frames: number[], fps: number): void => {
      if (this.anims.exists(key)) return;
      this.anims.create({ key, frames: frames.map((frame) => ({ key: sheet, frame })), frameRate: fps, repeat: -1 });
    };
    for (const [dir, row] of Object.entries(DIR_ROW)) {
      mk(`c01_idle_${dir}`, SPRITE_KEYS.yaric, [row * 4], 1);
      mk(`c01_walk_${dir}`, SPRITE_KEYS.yaric, [0, 1, 2, 3].map((i) => row * 4 + i), 7);
      mk(`c08_idle_${dir}`, SPRITE_KEYS.nambo, [row * 6, row * 6 + 1], 2);
      mk(`c08_walk_${dir}`, SPRITE_KEYS.nambo, [2, 3, 4, 5].map((i) => row * 6 + i), 7);
    }
  }

  private syncWalker(w: Walker, walking: boolean, isNpc = false): void {
    const tag = w.sprite.getData('tag') as string;
    const key = `${tag}_${walking ? 'walk' : 'idle'}_${w.facing}`;
    if (w.sprite.anims.currentAnim?.key !== key) w.sprite.anims.play(key, true);
    const rx = Math.round(w.x);
    const ry = Math.round(w.y);
    w.sprite.setPosition(rx, ry).setDepth(ry);
    w.shadow.setPosition(rx, ry - 1).setDepth(ry - 1);
    void isNpc;
  }

  // ----------------------------------------------------------------- debug

  /** Keadaan read-only untuk smoke test. */
  debugState(): Record<string, unknown> {
    const snap = this.services.gameState.snapshot();
    const cam = this.cameras.main;
    return {
      x: Math.round(this.player.x),
      area: this.loaded.map.id,
      y: Math.round(this.player.y),
      facing: this.player.facing,
      busy: this.busy,
      wrapCount: this.wrapCount,
      flags: snap?.flags ?? {},
      items: snap?.items ?? {},
      vitals: snap?.vitals ?? null,
      rpg: snap?.rpg,
      storyBeat: snap?.storyBeat,
      objective: this.story.objective(),
      target: this.target?.id ?? null,
      prompt: this.target?.verb ?? null,
      cam: { x: Math.round(cam.scrollX), y: Math.round(cam.scrollY), w: cam.width, h: cam.height, bw: this.loaded.map.width, bh: this.loaded.map.height },
      dialogue: this.hud?.dialogue.debug ?? null,
      nambo: this.nambo ? { x: Math.round(this.nambo.x), y: Math.round(this.nambo.y), facing: this.nambo.facing } : null,
      bossVisible: !!this.bossSprite?.visible,
      city: this.city?.debug() ?? null,
      chapter2: this.chapter2?.debug() ?? null,
      toast: this.hud?.currentToast ?? '',
      thicketOpen: [...this.propSprites.entries()].some(([id, img]) => id.startsWith('thicket') && img.frame.name === 'thicket_open'),
      chestOpen: [...this.propSprites.entries()].some(([id, img]) => id.startsWith('chest') && img.frame.name === 'chest_open'),
      log: this.actionLog.slice(-60),
      moving: this.wasMoving,
    };
  }

  /** Hanya untuk QA (aktif dengan ?qa=1): memindahkan pemain dan menyinkronkan kamera. */
  qaTeleport(x: number, y: number): void {
    this.player.x = x;
    this.player.y = y;
    this.insideTriggers.clear();
    this.cameras.main.centerOn(x, y - 24);
  }
}

function rectOf(s: { x: number; y: number; w: number; h: number }): Rect {
  return { x: s.x, y: s.y, w: s.w, h: s.h };
}
