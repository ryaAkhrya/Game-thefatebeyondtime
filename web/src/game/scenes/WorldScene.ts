import Phaser from 'phaser';
import { isEnding } from '../ending/progress';
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
import { presentationFor } from '../combat/presentation';
import { FootstepTracker, STEP_SFX, surfaceFor } from '../world/footsteps';
import { loadAveloria } from '../world/aveloria';
import { AveloriaView } from '../world/AveloriaView';
import { derrriaShop } from '../rpg/derrria';
import { loadForest2, loadLiora } from '../world/chapter2Maps';
import { Chapter2View } from '../world/Chapter2View';
import { FOREST2_SPAWN, LIORA_SPAWN, RETURN_SPAWN } from '../story/chapter2Flags';
import { joinTorvan, joinVelthia, restChapter2Party, restChapter3Party, restChapter4Party, returnToAveloria } from '../rpg/party';
import { loadTemple, TEMPLE_BATTLE_RETURN, TEMPLE_FROM_FOREST } from '../world/templeMaps';
import { TempleView } from '../world/TempleView';
import { AveloriaCrisisView } from '../world/AveloriaCrisisView';
import type { AreaView3 } from '../world/AreaView3';
import { C3 } from '../story/chapter3Flags';
import { C4, C4_ENCOUNTERS, type C4EncounterId } from '../story/chapter4Flags';
import { Vfx } from '../vfx';
import { loadFortress, FORTRESS_BATTLE_RETURN, FORTRESS_SPAWN, FORTRESS_VISTA } from '../world/fortressMaps';
import { FortressView } from '../world/FortressView';
import { loadAveloriaC4, AVELORIA_C4_SPAWN } from '../world/aveloriaC4';
import { AveloriaC4View } from '../world/AveloriaC4View';
import { DISPLAY_EVENT, getDisplay } from '../systems/DisplayController';
import { SPRINT_SPEED, WALK_SPEED } from '../world/movement';
import { playState, registerCharacterAnims, type AnimState, type CharacterAnimMeta } from '../world/CharacterAnims';


/** SFX yang diputar WorldScene untuk op `{type:'c4'}` (op lain hanya animasi view). Diselaraskan dengan catatan F/A4. */
const C4_OP_SFX: Readonly<Record<string, string>> = {
  seal_on: 'SFX_SEAL_ACTIVATE', seal_solved: 'SFX_SEAL_ACTIVATE', seal_reset: 'SFX_SEAL_ERROR', rift_solved: 'SFX_SEAL_ACTIVATE', anchor_touch: 'SFX_TIME_DISTORTION',
  door_open: 'SFX_FORTRESS_DOOR_ANCIENT', lever_pull: 'SFX_FORTRESS_DOOR_ANCIENT', lock_yaric: 'SFX_HEART_LOCK', lock_velthia: 'SFX_HEART_LOCK',
  heart_open: 'SFX_HEART_UNSEAL', relic_glow: 'SFX_ECHO_MEMORY', echo_a: 'SFX_ECHO_MEMORY', echo_b: 'SFX_ECHO_MEMORY',
};
const isFortressEncounter = (id: string): id is C4EncounterId => (C4_ENCOUNTERS as readonly string[]).includes(id);

const MAX_DT = 50; // ms; batas langkah waktu supaya tidak ada lompatan saat tab melambat
const DIR_ROW: Record<Facing, number> = { down: 0, left: 1, right: 2, up: 3 };
const DECAL_TYPES = new Set(['flowers', 'flowers_y', 'flowers_v', 'mushrooms', 'mushrooms_b']);

interface Walker {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  x: number;
  y: number;
  facing: Facing;
  state: AnimState;
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
  private sprinting = false;
  private readonly steps = new FootstepTracker();
  private stepCount = 0;
  private target: Interactable | null = null;
  private actionLog: string[] = [];
  private city?: AveloriaView;
  private chapter2?: Chapter2View;
  /** Chapter III: Aveloria krisis atau Kuil Jejak (kontrak AreaView3); `react` hanya ada pada Aveloria krisis. */
  private view3?: AreaView3 & { react?(speaker: string, line: string): void };
  private cityLine = '';
  private fx?: Vfx;

  constructor() {
    super(SCENE_KEYS.World);
  }

  create(): void {
    this.services = getServices(this);
    if (isEnding(this.services.gameState.snapshot())) { this.leaving = true; this.services.router.arrive(this); this.services.router.goto(this, SCENE_KEYS.Ending); return; }
    this.services.checkpoints.setSafe(false);
    const { gameState, input, audio, settings } = this.services;
    if (!gameState.isActive) gameState.startNewGame();
    this.story = new Chapter1Story(gameState);
    const area = gameState.snapshot()!.area;
    const chapter4 = gameState.snapshot()!.chapter === 'IV';
    this.loaded = area === 'fortress' ? loadFortress() : area === 'aveloria' && chapter4 ? loadAveloriaC4() : area === 'aveloria' ? loadAveloria() : area === 'liora' ? loadLiora() : area === 'forest_2' ? loadForest2() : area === 'forest_edge' ? loadForestEdge() : area === 'temple' ? loadTemple() : loadForest1();
    this.fx = undefined; this.city = undefined; this.view3 = undefined; this.chapter2 = undefined; this.cityLine = '';
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
    // Dunia memakai zoom kamera BILANGAN BULAT (pixel art rata); kanvas = piksel perangkat.
    this.cameras.main.setZoom(getDisplay(this).worldZoom);
    this.cameras.main.setRoundPixels(true);
    const onDisplay = (): void => { this.cameras.main.setZoom(getDisplay(this).worldZoom); };
    this.game.events.on(DISPLAY_EVENT, onDisplay);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(DISPLAY_EVENT, onDisplay));

    // ---- dasar peta (fallback polos bila gambar gagal dimuat) ----
    if (map.id === 'aveloria' || map.id === 'liora' || map.id === 'forest_2' || map.id === 'temple' || map.id === 'fortress') { /* ground is drawn with area view below */ }
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
      // Mournfang V4: 160x128, pivot [77,124], menghadap kanan -> flip agar menghadap barat (ke arah pemain)
      this.bossSprite = this.add.sprite(972, 400, BATTLE_TEXTURE.B01, 0).setOrigin(77 / 160, 124 / 128).setFlipX(true).setDepth(400);
    }

    // ---- keadaan dinamis dari flag ----
    this.interactables = this.loaded.interactables.map((i) => ({ ...i }));
    if (map.id === 'aveloria' && chapter4) this.view3 = new AveloriaC4View(this, this.loaded, this.interactables);
    else if (map.id === 'aveloria' && gameState.hasFlag(C3.start)) this.view3 = new AveloriaCrisisView(this, this.loaded, this.interactables);
    else if (map.id === 'aveloria') this.city = new AveloriaView(this, this.loaded, this.interactables);
    if (map.id === 'temple') this.view3 = new TempleView(this, this.loaded, this.interactables);
    if (map.id === 'fortress') this.view3 = new FortressView(this, this.loaded, this.interactables);
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
      this.view3?.destroy();
      audio.stopBgm();
      this.scene.stop(SCENE_KEYS.Hud);
    });

    // Musik hutan: BGM_FOREST_01 berstatus AWAITING_COMPOSER -> senyap tanpa error, dimulai hanya setelah gesture.
    audio.playBgm(map.id === 'fortress' || (map.id === 'aveloria' && chapter4) ? 'BGM_CRISIS' : map.id === 'temple' ? 'BGM_TEMPLE' : map.id === 'aveloria' ? 'BGM_AVELORIA_DAY' : map.id === 'liora' ? 'BGM_LIORA' : map.id === 'forest_2' ? 'BGM_FOREST_02' : 'BGM_FOREST_01');

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
    const prevX = this.player.x;
    const prevY = this.player.y;
    this.sprinting = false;
    if (dir) {
      this.player.facing = dir;
      this.sprinting = input.isSprintHeld();
      const speed = this.sprinting ? SPRINT_SPEED : WALK_SPEED;
      const vx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
      const vy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
      const r = moveWithCollision(this.loaded.collision, this.player.x, this.player.y, vx * speed * dt, vy * speed * dt);
      this.player.x = r.x;
      this.player.y = r.y;
      moved = r.moved;
    }
    if (moved <= 0) this.sprinting = false;
    if (this.steps.update(moved, this.sprinting)) {
      const surface = surfaceFor(this.loaded.map.id);
      this.stepCount++; this.services.audio.playSfx(STEP_SFX[surface]);
    }
    this.handleWrap();
    this.syncWalker(this.player, moved > 0 ? (this.sprinting ? 'sprint' : 'walk') : 'idle');
    if (this.nambo) this.syncWalker(this.nambo, this.nambo.state === 'walk' ? 'walk' : 'idle', true);
    this.city?.update(_time, this.busy);
    this.view3?.update(this.player, moved > 0, delta, this.sprinting);
    this.chapter2?.update(this.player, moved > 0, delta, this.sprinting);
    const dialogue = this.hud.dialogue.debug;
    const reactor = this.city ?? this.view3;
    if (reactor?.react && dialogue && dialogue.line !== this.cityLine) {
      this.cityLine = dialogue.line;
      reactor.react(dialogue.portrait.split('_')[0]!, dialogue.line);
      if (dialogue.line.startsWith('C1-08')) this.player.facing = dialogue.line === 'C1-08-L013' ? 'left' : 'up';
    }

    // ---- pemicu & prompt ----
    if (!this.busy) this.checkTriggers(prevX, prevY);
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
    if (!this.target) { this.hud.showPrompt(null); return; }
    // petunjuk kecil melayang di atas objek (koordinat piksel kanvas)
    const cam = this.cameras.main;
    const t = this.target;
    this.hud.showPrompt(t.verb, { x: (t.x + t.w / 2 - cam.worldView.x) * cam.zoom, y: (Math.min(t.y, this.player.y - 54) - cam.worldView.y) * cam.zoom - 6 }); // di atas kepala pemain, tidak menutup wajah
  }

  private tryInteract(): void {
    if (this.busy || !this.target) return;
    const t = this.target;
    this.services.audio.playSfx('SFX_INTERACT');
    const actions = this.story.interact(t.id, { copy: t.copy, wrapCount: this.wrapCount });
    this.actionLog.push(`interact:${t.id}`);
    if (actions.length > 0) void this.runActions(actions);
  }

  /**
   * Pemicu diperiksa sepanjang jalur frame ini (langkah <= 2 px), bukan hanya titik akhir: pada kecepatan lari satu frame
   * dapat melewati beberapa piksel, sehingga pemicu tipis tidak boleh terlewati.
   */
  private checkTriggers(fromX = this.player.x, fromY = this.player.y): void {
    const toX = this.player.x;
    const toY = this.player.y;
    const steps = Math.max(1, Math.ceil(Math.hypot(toX - fromX, toY - fromY) / 2));
    const inside = new Set<string>();
    const firstHit: { id: string; sampleX: number; sampleY: number }[] = [];
    for (let i = 1; i <= steps; i++) {
      const fx = fromX + ((toX - fromX) * i) / steps;
      const fy = fromY + ((toY - fromY) * i) / steps - 2;
      for (const t of this.loaded.map.triggers) {
        if (!pointIn(t, fx, fy)) continue;
        if (!inside.has(t.id)) { inside.add(t.id); firstHit.push({ id: t.id, sampleX: fx, sampleY: fy }); }
      }
    }
    // Keadaan akhir menentukan apakah masih di dalam (untuk "hanya saat MASUK" pada frame berikutnya).
    const endInside = new Set<string>();
    for (const t of this.loaded.map.triggers) if (pointIn(t, toX, toY - 2)) endInside.add(t.id);
    for (const hit of firstHit) {
      if (this.insideTriggers.has(hit.id)) continue; // hanya saat MASUK
      const t = this.loaded.map.triggers.find((x) => x.id === hit.id)!;
      const actions = this.story.trigger(hit.id, { copy: t.copy, wrapCount: this.wrapCount });
      this.actionLog.push(`trigger:${hit.id}`);
      if (actions.length > 0) {
        this.insideTriggers = endInside;
        void this.runActions(actions);
        return;
      }
    }
    this.insideTriggers = endInside;
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
      if (completed && actions.some(a => a.type === 'setFlag' || a.type === 'giveItem' || a.type === 'rest' || a.type === 'joinTorvan' || a.type === 'joinVelthia' || a.type === 'restParty' || a.type === 'restParty4')) this.services.checkpoints.requestAutosave();
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
        next.position = a.area === 'fortress' ? { ...FORTRESS_SPAWN } : a.area === 'temple' ? { ...TEMPLE_FROM_FOREST } : a.area === 'liora' ? previous === 'forest_2' ? { x: 480, y: 160, facing: 'down' } : { ...LIORA_SPAWN }
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
      case 'joinVelthia':
        gameState.load(joinVelthia(gameState.snapshot()!)); this.applyFlagState();
        break;
      case 'restParty':
        gameState.load(gameState.snapshot()!.chapter === 'IV' ? restChapter4Party(gameState.snapshot()!) : gameState.snapshot()!.chapter === 'III' ? restChapter3Party(gameState.snapshot()!) : restChapter2Party(gameState.snapshot()!)); this.applyFlagState();
        break;
      case 'restParty4':
        gameState.load(restChapter4Party(gameState.snapshot()!)); this.applyFlagState();
        break;
      case 'c4': {
        this.actionLog.push(`c4:${a.op}${a.arg === undefined ? '' : `:${a.arg}`}`);
        if (a.op === 'to_aveloria') {
          this.leaving = true;
          gameState.load(returnToAveloria(gameState.snapshot()!, { ...AVELORIA_C4_SPAWN })); this.services.checkpoints.requestAutosave();
          this.services.router.goto(this, SCENE_KEYS.World);
          await new Promise<void>(() => undefined);
          break;
        }
        if (a.op === 'tower_fall') { await this.towerFall(); break; }
        const sfx = C4_OP_SFX[a.op];
        if (sfx) this.services.audio.playSfx(sfx);
        await this.view3?.handleAction(a.op, a.arg);
        break;
      }
      case 'chapter4End':
        gameState.setPosition(this.player.x, this.player.y, this.player.facing, 'aveloria');
        this.services.checkpoints.setSafe(true); this.services.checkpoints.requestAutosave();
        if (this.services.checkpoints.flush()?.ok === false) this.hud.toast('Simpan otomatis gagal.');
        this.services.router.openOverlay(this, SCENE_KEYS.SliceEnd);
        break;
      case 'c3':
        this.actionLog.push(`c3:${a.op}${a.arg === undefined ? '' : `:${a.arg}`}`);
        if (a.op === 'pillar_on' || a.op === 'disc_on' || a.op === 'dial_set') this.services.audio.playSfx('SFX_PUZZLE_ACTIVATE');
        else if (a.op === 'puzzle_fx') this.services.audio.playSfx('SFX_PUZZLE_SOLVED');
        else if (a.op === 'gate_open') this.services.audio.playSfx('SFX_DOOR_OPEN');
        await this.view3?.handleAction(a.op, a.arg);
        break;
      case 'chapter3End':
        gameState.setPosition(this.player.x, this.player.y, this.player.facing, 'temple');
        this.services.checkpoints.setSafe(true); this.services.checkpoints.requestAutosave();
        if (this.services.checkpoints.flush()?.ok === false) this.hud.toast('Simpan otomatis gagal.');
        this.services.router.openOverlay(this, SCENE_KEYS.SliceEnd);
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
        if (this.city || this.view3 || this.chapter2 || a.flag === FLAG.awake || a.flag === FLAG.victorySeen) this.applyFlagState();
        if (a.flag === C4.complete) await this.runAction({ type: 'chapter4End' }); // kartu "Bab IV selesai" (tanpa epilog/modern)
        break;
      case 'objective':
        this.hud.setObjective(this.story.objective());
        break;
      case 'toast':
        this.hud.toast(a.text);
        break;
      case 'giveItem':
        if (!gameState.hasFlag(a.flag ?? FLAG.chestReward)) {
          gameState.addItem(a.item, a.count);
          this.services.audio.playSfx('SFX_ITEM_PICKUP');
          gameState.setFlag(a.flag ?? FLAG.chestReward);
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
        this.services.audio.playSfx('SFX_CHEST_OPEN');
        this.openChest();
        break;
      case 'battle':
        this.hud.showPrompt(null);
        if (a.encounter === 'veyrath' || a.encounter === 'duo_tutorial' || a.encounter === 'forest2_patrol') {
          if (a.encounter === 'veyrath') gameState.load(restChapter2Party(gameState.snapshot()!));
          this.player.x = a.encounter === 'veyrath' ? 928 : 744; this.player.y = a.encounter === 'veyrath' ? 320 : 544; this.player.facing = 'right';
          gameState.setPosition(this.player.x, this.player.y, this.player.facing, 'forest_2');
        } else if (a.encounter === 'temple_oathguard' || a.encounter === 'temple_mixed' || a.encounter === 'chronolith') {
          if (a.encounter === 'chronolith') gameState.load(restChapter3Party(gameState.snapshot()!)); // pemulihan penuh sebelum bos: retry ramah, tanpa grinding
          const back = TEMPLE_BATTLE_RETURN[a.encounter];
          this.player.x = back.x; this.player.y = back.y; this.player.facing = back.facing;
          gameState.setPosition(this.player.x, this.player.y, this.player.facing, 'temple');
        } else if (a.encounter && isFortressEncounter(a.encounter)) {
          if (a.encounter === 'varlgrim') gameState.load(restChapter4Party(gameState.snapshot()!)); // pemulihan penuh sebelum bos: retry ramah, tanpa grinding
          const back = FORTRESS_BATTLE_RETURN[a.encounter];
          this.player.x = back.x; this.player.y = back.y; this.player.facing = back.facing;
          gameState.setPosition(this.player.x, this.player.y, this.player.facing, 'fortress');
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
        const pres = presentationFor(a.encounter ?? 'hollowling', gameState.snapshot()!.flags);
        this.services.router.goto(this, SCENE_KEYS.Battle, { encounter: a.encounter ?? 'hollowling' }, { transition: pres.kind, label: pres.name, ...(pres.subtitle ? { subtitle: pres.subtitle } : {}) });
        // router.goto menghentikan scene ini; tunggu tanpa melakukan apa pun lagi
        await new Promise<void>(() => undefined);
        break;
    }
  }

  // ------------------------------------------------------------ keadaan dunia

  private applyFlagState(): void {
    if (this.view3) { this.view3.apply(this.services.gameState.snapshot()!.flags); return; }
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

  /** C4-04: kamera mengarah ke jendela busur, debu menara runtuh dari kejauhan, lalu kembali. Tanpa goyang kamera. */
  private async towerFall(): Promise<void> {
    const cam = this.cameras.main;
    cam.stopFollow();
    await this.panTo(FORTRESS_VISTA.x, FORTRESS_VISTA.y + 60, 700);
    this.fx ??= new Vfx(this, { reducedFlashes: () => this.services.settings.get('reduced_flashes') });
    this.services.audio.playSfx('SFX_TOWER_COLLAPSE_DISTANT');
    this.fx.play('tower_dust', FORTRESS_VISTA.x, FORTRESS_VISTA.y);
    await this.view3?.handleAction('tower_fall');
    await this.panTo(this.player.x, this.player.y - 24, 600);
    cam.startFollow(this.player.sprite, true, 0.14, 0.14);
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
        onUpdate: () => { n.state = 'walk'; this.syncWalker(n, 'walk', true); },
        onComplete: () => {
          n.facing = 'down';
          n.state = 'idle';
          this.updateNamboBlocker();
          this.syncNamboInteractable();
          resolve();
        },
      });
    });
  }

  // ---------------------------------------------------------- sprite helper

  private makeWalker(key: string, x: number, y: number, facing: Facing, cols: 4 | 6, tag: 'c01' | 'c08'): Walker {
    const shadow = this.add.ellipse(x, y - 1, 20, 6, 0x10161a, 0.38).setDepth(y - 1);
    const sprite = this.add.sprite(x, y, key, DIR_ROW[facing] * cols).setOrigin(0.5, 47 / 48).setDepth(y);
    sprite.setData('tag', tag);
    return { sprite, shadow, x, y, facing, state: 'idle' };
  }

  /** Animasi Yaric dan Nambo dari data atlas (`anims` di JSON); atlas tanpa data memakai definisi lama. */
  private createAnimations(): void {
    const meta = (key: string): CharacterAnimMeta | undefined => this.cache.json.get(`${key}:meta`) as CharacterAnimMeta | undefined;
    registerCharacterAnims(this, SPRITE_KEYS.yaric, 'c01', meta(SPRITE_KEYS.yaric), 4);
    registerCharacterAnims(this, SPRITE_KEYS.nambo, 'c08', meta(SPRITE_KEYS.nambo), 6);
  }

  private syncWalker(w: Walker, state: AnimState, isNpc = false): void {
    const tag = w.sprite.getData('tag') as string;
    w.state = state;
    playState(w.sprite, tag, state, w.facing, isNpc);
    const rx = Math.round(w.x);
    const ry = Math.round(w.y);
    w.sprite.setPosition(rx, ry).setDepth(ry);
    w.shadow.setPosition(rx, ry - 1).setDepth(ry - 1);
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
      // Kamera = bidang dunia yang terlihat (worldView), bukan scroll mentah: zoom bulat membuat keduanya berbeda.
      cam: { x: Math.round(cam.worldView.x), y: Math.round(cam.worldView.y), w: Math.round(cam.worldView.width), h: Math.round(cam.worldView.height), zoom: cam.zoom, bw: this.loaded.map.width, bh: this.loaded.map.height },
      dialogue: this.hud?.dialogue.debug ?? null,
      player: { texture: this.player.sprite.texture.key, frame: this.player.sprite.frame.name, originX: this.player.sprite.originX, originY: this.player.sprite.originY, displayWidth: this.player.sprite.displayWidth, displayHeight: this.player.sprite.displayHeight, y: this.player.sprite.y, shadowY: this.player.shadow.y },
      nambo: this.nambo ? { x: Math.round(this.nambo.x), y: Math.round(this.nambo.y), facing: this.nambo.facing } : null,
      bossVisible: !!this.bossSprite?.visible,
      city: this.city?.debug() ?? null,
      view3: this.view3?.debug() ?? null,
      interactables: this.interactables.map(i => ({ id: i.id, x: Math.round(i.x), y: Math.round(i.y), w: Math.round(i.w), h: Math.round(i.h), enabled: i.enabled !== false })),
      chapter2: this.chapter2?.debug() ?? null,
      toast: this.hud?.currentToast ?? '',
      thicketOpen: [...this.propSprites.entries()].some(([id, img]) => id.startsWith('thicket') && img.frame.name === 'thicket_open'),
      chestOpen: [...this.propSprites.entries()].some(([id, img]) => id.startsWith('chest') && img.frame.name === 'chest_open'),
      log: this.actionLog.slice(-60),
      moving: this.wasMoving,
      sprinting: this.sprinting,
      footsteps: { count: this.stepCount, surface: surfaceFor(this.loaded.map.id) },
      standable: this.loaded.collision.canStand(footBox(this.player.x, this.player.y)),
      moveState: this.player.state,
      anim: this.player.sprite.anims.currentAnim?.key ?? null,
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
