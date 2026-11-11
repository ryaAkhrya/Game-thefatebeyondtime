import Phaser from 'phaser';
import { BattlePanel } from '../../ui/components/BattlePanel';
import { Ui, TYPE } from '../../ui/kit/ui';
import { BATTLE_TEXTURE, bossAtlas, draftPosePlayback, type BattleAtlas, type PoseAtlas } from '../combat/BattleAtlas';
import { enemyAI, intentHint, type Command, type PendingAction } from '../combat/BattleEngine';
import { BattleSession } from '../combat/BattleSession';
import { COLORS } from '../config/palette';
import { SCENE_KEYS } from '../data/ids';
import { isNameKnown } from '../story/identity';
import { DISPLAY_EVENT, getDisplay } from '../systems/DisplayController';
import { claimHint } from '../systems/Hints';
import { getServices, type Services } from '../systems/Services';
import type { EncounterId } from '../combat/encounters';

/**
 * Garis tanah (pecahan tinggi panggung) tempat kaki/pivot-bawah tiap petarung berpijak. Musuh tunggal dan boss berbagi garis
 * yang sama dengan C01 (sprite Hollowling melayang: pivot di tengah tubuh, sehingga y sprite dihitung dari garis tanah).
 */
const GROUND = { C01: 0.70, C03: 0.56, enemySingle: 0.70, enemyTwo: [0.64, 0.70] } as const;
const HOME_X = { enemySingle: 0.244, enemyTwo: [0.18, 0.34], C01: 0.76, C03: 0.875 } as const;

/**
 * Panggung battle memakai zoom kamera BILANGAN BULAT (sprite pixel art tajam, ukuran jelas); UI digambar oleh kamera kedua
 * pada resolusi perangkat. Goyang/kilat hanya mengenai panggung, bukan UI.
 */
export class BattleScene extends Phaser.Scene {
  private services!: Services;
  private ui!: Ui;
  private session!: BattleSession;
  private panel!: BattlePanel;
  private sprites!: Record<string, Phaser.GameObjects.Sprite>;
  private vfx!: Phaser.GameObjects.Sprite;
  private enemyShadow!: Phaser.GameObjects.Ellipse;
  private stageObjs: Phaser.GameObjects.GameObject[] = [];
  private shadows: Record<string, Phaser.GameObjects.Ellipse> = {};
  private releaseInput?: () => void;
  private locked = true;
  private closing = false;
  private idle: Record<string, { elapsed: number; frame: string }> = {};
  private phase = 'idle';
  private encounter: EncounterId = 'hollowling';
  private epoch = 0;
  private bossPlayback?: BattleAtlas;
  private draftPlayback: Record<string, BattleAtlas> = {};
  private homes: Record<string, { x: number; y: number }> = {};
  private history: { phase: string; turn: number; frame: string; actor: string }[] = [];
  private impacts: { command: Command; turn: number; shake: boolean; flash: boolean }[] = [];
  private view = { w: 480, h: 270 };
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private activeCaret!: Phaser.GameObjects.Triangle;
  private targetCaret!: Phaser.GameObjects.Triangle;
  private targetId: string | null = null;
  private selfName = 'Kau';
  private known = false;

  constructor() { super(SCENE_KEYS.Battle); }
  init(data: { encounter?: EncounterId }): void { this.encounter = data.encounter ?? 'hollowling'; }

  create(): void {
    this.epoch++;
    this.services = getServices(this);
    this.ui = new Ui(this);
    this.services.checkpoints.setSafe(false);
    this.session = new BattleSession(this.services.gameState, this.encounter);
    this.known = isNameKnown(this.services.gameState.snapshot()?.flags);
    this.selfName = this.known ? 'Yaric' : 'Kau';
    this.bossPlayback = this.encounter === 'mournfang' ? bossAtlas(this.cache.json.get(`${BATTLE_TEXTURE.B01}:meta`)) : undefined;
    this.draftPlayback = {};
    for (const id of ['C03', 'M02', 'M03', 'B02'] as const) this.draftPlayback[id] = draftPosePlayback(this.cache.json.get(`${BATTLE_TEXTURE[id]}:meta`) as PoseAtlas);
    this.closing = false; this.locked = true; this.history = []; this.impacts = []; this.idle = {}; this.targetId = null; this.stageObjs = []; this.shadows = {};
    this.services.router.arrive(this);
    this.cameras.main.setBackgroundColor(0x263a30);
    this.uiCamera = this.cameras.add(0, 0, this.ui.layout.pixelWidth, this.ui.layout.pixelHeight);
    this.applyView();

    this.drawForest();
    this.sprites = {};
    const enemyIds = this.session.enemyIds;
    enemyIds.forEach((id) => this.sprites[id] = this.add.sprite(0, 0, BATTLE_TEXTURE[id], 0).setDepth(4));
    this.sprites.C01 = this.add.sprite(0, 0, BATTLE_TEXTURE.C01, 0).setDepth(4);
    if (this.services.gameState.snapshot()!.party.includes('C03')) this.sprites.C03 = this.add.sprite(0, 0, BATTLE_TEXTURE.C03, 0).setDepth(4);
    this.vfx = this.add.sprite(0, 0, BATTLE_TEXTURE.slam, 0).setDepth(5).setVisible(false);
    this.activeCaret = this.add.triangle(0, 0, 0, 0, 9, 0, 4.5, 6, COLORS.bitterLime).setDepth(8).setVisible(false);
    this.targetCaret = this.add.triangle(0, 0, 0, 0, 9, 0, 4.5, 6, COLORS.rose).setDepth(8).setVisible(false);
    this.tweens.add({ targets: [this.activeCaret, this.targetCaret], scaleY: 0.75, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    for (const id of Object.keys(this.sprites)) this.setFrame(id, 'idle_a');
    this.placeHomes();

    const showHint = claimHint(this.services.storage, 'battle_controls');
    this.panel = new BattlePanel(this, (command, targetId) => {
      if (this.locked || this.closing) return;
      if (command === 'continue') {
        if (this.session.engine.snapshot().outcome === 'escaped' || this.session.commitVictory()) { this.closing = true; this.services.router.goto(this, SCENE_KEYS.World); }
      } else if (command === 'title') { this.closing = true; this.services.router.goto(this, SCENE_KEYS.Title); }
      else if (command === 'retry') {
        if (this.session.retry()) {
          this.panel.dismissResult();
          for (const [id, sprite] of Object.entries(this.sprites)) { sprite.setAlpha(1).setPosition(this.homes[id]!.x, this.homes[id]!.y); this.setFrame(id, 'idle_a'); }
          this.vfx.setVisible(false); this.idle = {};
          this.enemyShadow.setAlpha(0.4).setX(this.homes[this.session.enemyIds[0]!]!.x);
          this.services.audio.playBgm(this.encounter === 'mournfang' ? 'BGM_BOSS' : 'BGM_BATTLE');
          this.panel.say('Pilih Serang untuk menyerang musuh.'); this.nextTurn();
        }
      } else void this.act(command, targetId);
    }, this.encounter === 'mournfang' ? 'Mournfang' : this.encounter === 'veyrath' ? 'Veyrath' : enemyIds.length > 1 ? 'Dua musuh' : 'Hollowling',
    (id) => { this.targetId = id; }, showHint);

    // Shake/flash hanya mengenai panggung. UI memakai kamera kedua; objek berdepth >= 20 adalah UI.
    const filterCameras = (): void => {
      for (const object of this.children.list) {
        const depth = (object as Phaser.GameObjects.GameObject & { depth?: number }).depth ?? 0;
        if (depth >= 20) this.cameras.main.ignore(object);
        else this.uiCamera.ignore(object);
      }
    };
    this.events.on(Phaser.Scenes.Events.PRE_RENDER, filterCameras);
    const onDisplay = (): void => this.onDisplayChanged();
    this.game.events.on(DISPLAY_EVENT, onDisplay);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.PRE_RENDER, filterCameras);
      this.game.events.off(DISPLAY_EVENT, onDisplay);
    });
    this.releaseInput = this.services.input.pushLayer('battle', event => {
      if (this.locked || this.closing) return;
      if (event.intent === 'back' && this.panel.mode === 'main') {
        this.services.router.openOverlay(this, SCENE_KEYS.Pause); return;
      }
      this.panel.handle(event, this.session.engine);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.epoch++; this.closing = true; this.releaseInput?.(); this.services.audio.stopBgm(); });
    this.services.audio.playBgm(this.encounter === 'mournfang' ? 'BGM_BOSS' : 'BGM_BATTLE');
    this.nextTurn();
  }

  // ---------------------------------------------------------------- tampilan

  /** Zoom bulat untuk panggung; (0,0) panggung di pojok kiri atas layar. */
  private applyView(): void {
    const l = getDisplay(this);
    this.view = { w: l.pixelWidth / l.battleZoom, h: l.pixelHeight / l.battleZoom };
    this.cameras.main.setZoom(l.battleZoom).setRoundPixels(true).centerOn(this.view.w / 2, this.view.h / 2);
    this.uiCamera.setSize(l.pixelWidth, l.pixelHeight);
  }

  /** y sprite agar titik pijak bawah (footY) tepat di garis tanah, apa pun pivotnya. */
  private yForFoot(id: string, foot: number): number {
    const sprite = this.sprites[id]!;
    const meta = this.meta(id);
    return Math.round(foot - (1 - sprite.originY) * meta.frame_size[1] + 1);
  }

  private placeHomes(): void {
    const { w, h } = this.view;
    const enemyIds = this.session.enemyIds;
    enemyIds.forEach((id, index) => {
      const x = enemyIds.length === 1 ? HOME_X.enemySingle : HOME_X.enemyTwo[index]!;
      const foot = (enemyIds.length === 1 ? GROUND.enemySingle : GROUND.enemyTwo[index]!) * h;
      this.homes[id] = { x: Math.round(x * w), y: this.yForFoot(id, foot) };
    });
    this.homes.C01 = { x: Math.round(HOME_X.C01 * w), y: this.yForFoot('C01', GROUND.C01 * h) };
    if (this.sprites.C03) this.homes.C03 = { x: Math.round(HOME_X.C03 * w), y: this.yForFoot('C03', GROUND.C03 * h) };
    for (const [id, sprite] of Object.entries(this.sprites)) if (!this.locked || this.phase === 'idle') sprite.setPosition(this.homes[id]!.x, this.homes[id]!.y);
    // bayangan di garis tanah masing-masing
    const first = this.session.enemyIds[0]!;
    this.enemyShadow?.setPosition(this.homes[first]!.x, (enemyIds.length === 1 ? GROUND.enemySingle : GROUND.enemyTwo[0]) * h + 2);
    if (this.session.enemyIds.includes('B01')) this.enemyShadow?.setSize(116, 7); // bayangan boss selebar tubuhnya
    this.shadows.C01?.setPosition(this.homes.C01!.x, GROUND.C01 * h + 2);
    this.shadows.C03?.setPosition(this.homes.C03?.x ?? 0, GROUND.C03 * h + 2);
  }

  private drawForest(): void {
    const { w, h } = this.view;
    this.stageObjs.forEach(o => o.destroy()); this.stageObjs = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => { this.stageObjs.push(o); return o; };
    // Reuse Phase 1 forest sprites. Muted green/earth support the plum/lime UI; no new character art.
    add(this.add.rectangle(0, h * 0.49, w, h * 0.6, 0x65533e).setOrigin(0).setDepth(-5));
    add(this.add.rectangle(0, h * 0.12, w, h * 0.38, 0x304734).setOrigin(0).setDepth(-8));
    add(this.add.rectangle(0, 0, w, h * 0.12, 0x24382b).setOrigin(0).setDepth(-9));
    const props = 'forest1_props';
    if (this.textures.exists(props)) {
      for (const [fx, fy] of [[0.025, 0.52], [0.15, 0.42], [0.35, 0.46], [0.56, 0.41], [0.86, 0.45], [0.985, 0.52]]) add(this.add.image(fx! * w, fy! * h, props, 'tree_a').setOrigin(0.5, 1).setDepth(-7));
    }
    
    this.enemyShadow = add(this.add.ellipse(0, 0, 55, 6, 0x1d1625, 0.4).setDepth(-1));
    this.shadows = { C01: add(this.add.ellipse(0, 0, 50, 6, 0x1d1625, 0.4).setDepth(-1)) };
    if (this.services.gameState.snapshot()!.party.includes('C03')) this.shadows.C03 = add(this.add.ellipse(0, 0, 36, 5, 0x1d1625, 0.4).setDepth(-1));
  }

  private onDisplayChanged(): void {
    if (!this.panel) return;
    this.applyView();
    this.drawForest();
    this.placeHomes();
    // hanya UI (depth >= 20) yang digambar ulang; sprite panggung dipertahankan
    for (const o of [...this.children.list]) if (((o as Phaser.GameObjects.GameObject & { depth?: number }).depth ?? 0) >= 20) o.destroy();
    this.panel.relayout();
  }

  /** Titik panggung -> koordinat desain UI (untuk angka damage yang digambar kamera UI). */
  private toUi(x: number, y: number): { x: number; y: number } {
    const cam = this.cameras.main;
    return { x: ((x - cam.worldView.x) * cam.zoom) / this.ui.s, y: ((y - cam.worldView.y) * cam.zoom) / this.ui.s };
  }

  private meta(id: string): BattleAtlas { return id === 'B01' ? this.bossPlayback! : this.draftPlayback[id] ?? this.cache.json.get(`${BATTLE_TEXTURE[id as keyof typeof BATTLE_TEXTURE]}:meta`) as BattleAtlas; }
  private setFrame(id: string, frame: string): void {
    const meta = this.meta(id), f = meta.frames[frame]!;
    const sprite = id === 'slam' ? this.vfx : this.sprites[id]!;
    sprite.setFrame(f.index_0_based).setOrigin(f.pivot[0] / meta.frame_size[0], f.pivot[1] / meta.frame_size[1]);
  }
  private play(id: string, frames: string[], onFrame?: (key: string) => void): Promise<void> {
    const epoch = this.epoch;
    return new Promise(resolve => {
      let index = 0;
      const step = (): void => {
        if (epoch !== this.epoch) return;
        const frame = frames[index++];
        if (!frame) { resolve(); return; }
        this.setFrame(id, frame);
        this.history.push({ phase: this.phase, turn: this.session.engine.snapshot().turn, frame, actor: id });
        onFrame?.(frame);
        this.time.delayedCall(this.meta(id).frames[frame]!.duration_ms, step);
      };
      step();
    });
  }

  private async act(command: Command, targetId?: string): Promise<void> {
    if (this.locked || this.closing) return;
    const engine = this.session.engine;
    const epoch = this.epoch;
    const pending = engine.prepare(command, engine.snapshot().turn, targetId);
    if (!pending) { this.panel.say(engine.unavailable(command, targetId) ?? 'Aksi tidak tersedia.'); return; }
    this.locked = true; this.panel.busy(); this.panel.clearControlHint();
    if (pending.actorId === 'C01' && (pending.command === 'attack' || pending.command === 'ground_slam')) this.services.audio.playSfx('SFX_GREATSWORD_SWING');
    this.phase = 'anticipation';
    const me = this.selfName;
    this.panel.say(pending.actorId === 'B01' ? pending.command === 'boss_windup' ? 'Mournfang merendahkan tanduknya.' : pending.command === 'boss_recover' ? 'Mournfang terhuyung, lalu menarik napas.' : 'Mournfang menggeser kaki depannya.'
      : pending.actorId === 'B02' ? pending.command === 'knight_guard' ? 'Veyrath menahan bilah. Ia mengunci arah ke Torvan.' : 'Veyrath bergerak sesuai sumpah lama.'
      : pending.actorId === 'M01' ? `Hollowling merapatkan tubuh, lalu menerjang${this.known ? ' Yaric' : 'mu'}.`
      : pending.actorId === 'C03' ? `Torvan: ${pending.command === 'ranting_nakal' ? 'ranting bergerak di tangannya.' : pending.command === 'tunas_bandel' ? 'tunas kecil tumbuh.' : 'aku coba dulu.'}`
      : pending.actorId === 'M02' || pending.actorId === 'M03' ? `${engine.current.name} bersiap.`
      : pending.command === 'ground_slam' ? `${me} mengangkat pedangnya. Ground Slam!` : pending.command === 'attack' ? `${me} mengayunkan greatsword.` : `${me} bersiap.`);
    let reaction: Promise<void> = Promise.resolve();
    const impact = (): void => {
      if (epoch !== this.epoch) return;
      const result = engine.impact(pending.token);
      if (!result) return;
      this.phase = 'impact'; this.panel.say(result.text); this.panel.refresh(engine);
      if (result.amount > 0) {
        const healing = pending.command === 'potion' || pending.command === 'tunas_bandel';
        const target = this.sprites[result.targetId]!;
        const p = this.toUi(target.x, target.y - 44);
        const t = this.ui.text(p.x, p.y, `${healing ? '+' : '-'}${result.amount}`, { size: TYPE.display - 2, weight: '700', family: 'display', originX: 0.5, originY: 0.5, color: healing ? COLORS.bitterLime : COLORS.paper, depth: 30 });
        this.tweens.add({ targets: t, y: t.y - this.ui.u(26), alpha: 0.0, duration: 900, ease: 'Sine.easeOut', onComplete: () => t.destroy() });
        if (!healing) {
          this.services.audio.playSfx(pending.actorId !== 'C01' ? 'SFX_ENEMY_ATTACK' : pending.command === 'ground_slam' ? 'SFX_GROUND_SLAM' : 'SFX_GREATSWORD_IMPACT');
          this.services.audio.playSfx('SFX_DAMAGE');
          const dead = engine.snapshot().actors.find(a => a.id === result.targetId)!.hp <= 0;
          reaction = this.play(result.targetId, dead ? ['death_start', 'defeated'] : ['hit_recoil', 'hit_recover']).then(async () => {
            if (epoch !== this.epoch) return;
            if (!dead) this.setFrame(result.targetId, 'idle_a');
            else if (result.targetId === 'B01' || result.targetId === 'B02') await new Promise<void>(resolve => this.tweens.add({ targets: [target, this.enemyShadow], alpha: 0, x: target.x - 12, duration: 320, onComplete: () => resolve() }));
          });
          if (pending.command === 'ground_slam' || pending.command === 'boss_sweep') { this.services.effects.shake(this, 150, 0.007); this.services.effects.flash(this, 60); }
          this.impacts.push({ command: pending.command, turn: pending.token, shake: this.cameras.main.shakeEffect.isRunning, flash: this.cameras.main.flashEffect.isRunning });
        }
      }
      if (['ranting_nakal', 'bukan_aku', 'tunas_bandel'].includes(pending.command)) {
        const spot = this.sprites[result.targetId]!;
        const leaves = this.add.graphics().setPosition(spot.x, spot.y - 18).setDepth(7);
        leaves.fillStyle(0x90ad65); leaves.fillRect(-12, -3, 5, 2); leaves.fillRect(8, 2, 4, 2); leaves.fillRect(0, -12, 3, 5);
        this.tweens.add({ targets: leaves, alpha: 0, y: leaves.y - 8, duration: 440, onComplete: () => leaves.destroy() });
      }
    };
    await this.animate(pending, impact);
    await reaction;
    if (epoch !== this.epoch) return;
    this.phase = 'recovery';
    engine.finish(pending.token);
    this.panel.refresh(engine);
    this.time.delayedCall(550, () => { if (epoch === this.epoch) this.nextTurn(); });
  }

  private async animate(p: PendingAction, impact: () => void): Promise<void> {
    const id = p.actorId;
    if (p.command === 'attack' || p.command === 'ground_slam' || p.command === 'boss_sweep' || p.command === 'knight_thrust' || p.command === 'ranting_nakal') {
      await this.play(id, id === 'C01' ? ['anticipation', 'attack_windup'] : ['anticipation']);
      if (p.command === 'ground_slam') {
        await this.play(id, ['attack_contact']);
        const t = this.sprites[p.targetId ?? this.session.enemyId];
        this.vfx.setPosition(t?.x ?? this.homes[this.session.enemyId]!.x, Math.round(GROUND.C01 * this.view.h)).setVisible(true);
        await this.play('slam', ['fracture', 'crack_spread', 'slab_separates', 'slab_rises', 'slab_apex', 'slab_strikes', 'slab_descends', 'ground_settles'], frame => { if (frame === this.meta('slam').event.frame_key) impact(); });
        this.vfx.setVisible(false);
      } else if (p.command === 'ranting_nakal') {
        await this.play(id, [this.meta(id).event.frame_key], impact);
      } else {
        const actors = this.session.engine.snapshot().actors;
        const side = actors.find(a => a.id === id)!.side;
        const defaultTarget = side === 'player' ? actors.find(a => a.side === 'enemy' && a.hp > 0)!.id
          : p.command === 'knight_thrust' && actors.some(a => a.id === 'C03' && a.hp > 0) ? 'C03' : actors.find(a => a.side === 'player' && a.hp > 0)!.id;
        const target = this.sprites[p.targetId ?? defaultTarget]!;
        const standOff = id === 'B01' ? 112 : 76; // boss besar berhenti lebih jauh agar tubuhnya tidak menimpa target
        const x = id === 'C01' ? target.x + 88 : id === 'C03' ? target.x + 94 : target.x - standOff;
        await this.approach(id, x, 120);
        await this.play(id, [this.meta(id).event.frame_key], impact);
      }
      await this.play(id, ['followthrough', 'recovery']);
      if (p.command === 'attack' || p.command === 'boss_sweep' || p.command === 'knight_thrust') await this.approach(id, this.homes[id]!.x, 160);
    } else {
      await this.play(id, ['anticipation']);
      if (['bukan_aku', 'tunas_bandel'].includes(p.command)) await this.play(id, [this.meta(id).event.frame_key]);
      impact();
      await this.play(id, ['recovery']);
    }
    this.setFrame(id, 'idle_a');
  }
  private approach(id: string, x: number, duration: number): Promise<void> {
    return new Promise(resolve => this.tweens.add({ targets: this.sprites[id], x, duration, onComplete: () => resolve() }));
  }

  private nextTurn(): void {
    const engine = this.session.engine, state = engine.snapshot();
    this.locked = false; this.phase = 'idle';
    this.panel.refresh(engine);
    if (state.outcome) {
      this.phase = state.outcome; this.services.audio.stopBgm();
      if (state.outcome !== 'escaped') this.services.audio.playSfx(state.outcome === 'victory' ? 'SFX_VICTORY' : 'SFX_DEFEAT');
      this.panel.result(state.outcome, state.outcome === 'victory' ? this.session.previewReward() : null); return;
    }
    if (engine.current.side === 'enemy') { void this.act(enemyAI(engine.current)); return; }
    this.panel.show(engine);
    const hint = intentHint(state.actors.find(a => a.side === 'enemy' && a.hp > 0) ?? state.actors.find(a => a.side === 'enemy')!);
    if (hint) this.panel.say(hint);
    else if (state.turn === 1) this.panel.say(this.encounter === 'mournfang' ? 'Amati gerak tanduknya sebelum sapuan berat.' : 'Pilih Serang untuk menyerang musuh.');
    else if (engine.current.hp < engine.current.stats.HP) this.panel.say('HP berkurang. Barang: Potion. Bertahan: kurangi kerusakan.');
  }

  override update(_time: number, delta: number): void {
    if (this.services && !document.hidden) this.services.gameState.tick(delta / 1000);
    if (!this.sprites) return;
    // penanda giliran aktif dan target mengikuti sprite
    const engine = this.session?.engine;
    const state = engine?.snapshot();
    const activeId = state && !state.outcome && !this.locked && this.phase === 'idle' && engine.current.side === 'player' ? engine.current.id : null;
    const place = (caret: Phaser.GameObjects.Triangle, id: string | null): void => {
      const s = id ? this.sprites[id] : undefined;
      caret.setVisible(!!s && s.alpha > 0.5);
      if (s) caret.setPosition(Math.round(s.x), Math.round(s.y - (s.originY * s.height) - 6));
    };
    place(this.activeCaret, activeId && this.panel.mode !== 'target' ? activeId : null);
    place(this.targetCaret, this.panel.mode === 'target' ? this.targetId : null);
    if (this.locked || this.phase !== 'idle') return;
    for (const id of Object.keys(this.sprites)) {
      const idle = this.idle[id] ??= { elapsed: 0, frame: 'idle_a' };
      idle.elapsed += delta;
      if (idle.elapsed >= this.meta(id).frames[idle.frame]!.duration_ms) {
        idle.elapsed = 0; idle.frame = idle.frame === 'idle_a' ? 'idle_b' : 'idle_a'; this.setFrame(id, idle.frame);
      }
    }
  }

  /**
   * Probe visibilitas untuk QA: kotak sprite pada layar (piksel kanvas) beserta status render. Dipakai uji browser yang
   * membandingkan tangkapan layar dengan/tanpa sprite (bukti piksel nyata, bukan sekadar objek ada di memori).
   */
  qaProbe(id: string): { x: number; y: number; w: number; h: number; visible: boolean; alpha: number; depth: number; frame: string; texture: string } | null {
    const s = this.sprites?.[id];
    if (!s) return null;
    const cam = this.cameras.main;
    const b = s.getBounds();
    return { x: (b.x - cam.worldView.x) * cam.zoom, y: (b.y - cam.worldView.y) * cam.zoom, w: b.width * cam.zoom, h: b.height * cam.zoom,
      visible: s.visible, alpha: s.alpha, depth: s.depth, frame: String(s.frame.name), texture: s.texture.key };
  }
  qaHide(id: string, hidden: boolean): void { this.sprites[id]?.setVisible(!hidden); }

  debugState(): Record<string, unknown> {
    return { ...this.session.engine.snapshot(), encounter: this.encounter, locked: this.locked, phase: this.phase, menu: this.panel.mode,
      sprites: Object.fromEntries(Object.entries(this.sprites).map(([id, s]) => [id, { x: s.x, y: s.y, footY: s.y + (1 - s.originY) * this.meta(id).frame_size[1] - 1, frame: s.frame.name, originX: s.originX, originY: s.originY, alpha: s.alpha }])),
      enemyShadow: { x: this.enemyShadow.x, alpha: this.enemyShadow.alpha },
      vfx: { visible: this.vfx.visible, frame: this.vfx.frame.name }, history: this.history.slice(-150),
      impacts: this.impacts.slice(-30),
      stage: { zoom: this.cameras.main.zoom, w: this.view.w, h: this.view.h },
      effects: { shake: this.cameras.main.shakeEffect.isRunning, flash: this.cameras.main.flashEffect.isRunning } };
  }
}
