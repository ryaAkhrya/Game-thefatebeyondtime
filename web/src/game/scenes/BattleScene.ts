import Phaser from 'phaser';
import { BattlePanel } from '../../ui/components/BattlePanel';
import { configureUiCamera, makeText } from '../../ui/styles/theme';
import { BATTLE_TEXTURE, type BattleAtlas } from '../combat/BattleAtlas';
import { enemyAI, type Command, type PendingAction } from '../combat/BattleEngine';
import { BattleSession } from '../combat/BattleSession';
import { COLORS } from '../config/palette';
import { GAME_HEIGHT, GAME_WIDTH, UI_HEIGHT, UI_WIDTH, UI_ZOOM } from '../config/constants';
import { SCENE_KEYS } from '../data/ids';
import { getServices, type Services } from '../systems/Services';

export class BattleScene extends Phaser.Scene {
  private services!: Services;
  private session!: BattleSession;
  private panel!: BattlePanel;
  private sprites!: Record<string, Phaser.GameObjects.Sprite>;
  private vfx!: Phaser.GameObjects.Sprite;
  private releaseInput?: () => void;
  private locked = true;
  private closing = false;
  private idle: Record<string, { elapsed: number; frame: string }> = {};
  private phase = 'idle';
  private history: { phase: string; turn: number; frame: string; actor: string }[] = [];
  private impacts: { command: Command; turn: number; shake: boolean; flash: boolean }[] = [];

  constructor() { super(SCENE_KEYS.Battle); }
  create(): void {
    this.services = getServices(this);
    this.session = new BattleSession(this.services.gameState);
    this.closing = false; this.locked = true; this.history = []; this.impacts = []; this.idle = {};
    configureUiCamera(this);
    this.services.router.arrive(this);
    this.cameras.main.setBackgroundColor(0x263a30);
    this.drawForest();
    this.sprites = {
      M01: this.add.sprite(78, 83, BATTLE_TEXTURE.M01, 0).setDepth(4), // source pivot is CENTER [48,48], bottom lands at 130
      C01: this.add.sprite(244, 130, BATTLE_TEXTURE.C01, 0).setDepth(4), // source pivot is FEET [48,95]
    };
    this.vfx = this.add.sprite(78, 130, BATTLE_TEXTURE.slam, 0).setDepth(5).setVisible(false);
    this.setFrame('C01', 'idle_a'); this.setFrame('M01', 'idle_a');
    this.panel = new BattlePanel(this, command => {
      if (this.locked || this.closing) return;
      if (command === 'continue') {
        if (this.session.commitVictory()) { this.closing = true; this.services.router.goto(this, SCENE_KEYS.World); }
      } else if (command === 'title') { this.closing = true; this.services.router.goto(this, SCENE_KEYS.Title); }
      else if (command === 'retry') {
        if (this.session.retry()) {
          this.setFrame('C01', 'idle_a'); this.setFrame('M01', 'idle_a');
          this.panel.say('Pilih Serang untuk menyerang musuh.'); this.nextTurn();
        }
      } else void this.act(command);
    });
    // Shake/flash affects the battlefield only. The command panel and HP/MP stay readable.
    const uiCamera = this.cameras.add(0, 0, GAME_WIDTH, GAME_HEIGHT).setZoom(UI_ZOOM).centerOn(UI_WIDTH / 2, UI_HEIGHT / 2);
    const filterCameras = (): void => {
      for (const object of this.children.list) {
        const depth = (object as Phaser.GameObjects.GameObject & { depth?: number }).depth ?? 0;
        if (depth >= 20) this.cameras.main.ignore(object);
        else uiCamera.ignore(object);
      }
    };
    this.events.on(Phaser.Scenes.Events.PRE_RENDER, filterCameras);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.PRE_RENDER, filterCameras));
    this.releaseInput = this.services.input.pushLayer('battle', event => {
      if (this.locked || this.closing) return;
      if (event.intent === 'back' && this.panel.mode === 'main') {
        this.services.router.openOverlay(this, SCENE_KEYS.Pause); return;
      }
      this.panel.handle(event, this.session.engine);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.releaseInput?.(); this.services.audio.stopBgm(); });
    this.services.audio.playBgm('BGM_BATTLE');
    this.nextTurn();
  }
  private drawForest(): void {
    // Reuse Phase 1 forest sprites. Muted green/earth support the plum/lime UI; no new character art.
    this.add.rectangle(0, 88, 320, 43, 0x65533e).setOrigin(0).setDepth(-5);
    this.add.rectangle(0, 34, 320, 54, 0x304734).setOrigin(0).setDepth(-8);
    const props = 'forest1_props';
    if (this.textures.exists(props)) {
      for (const [x, y] of [[8, 94], [49, 76], [112, 83], [180, 75], [275, 82], [318, 94]]) this.add.image(x!, y!, props, 'tree_a').setOrigin(0.5, 1).setDepth(-7);
    }
    this.add.ellipse(78, 129, 55, 5, 0x1d1625, 0.4).setDepth(-1);
    this.add.ellipse(244, 129, 50, 5, 0x1d1625, 0.4).setDepth(-1);
  }
  private meta(id: string): BattleAtlas { return this.cache.json.get(`${BATTLE_TEXTURE[id as keyof typeof BATTLE_TEXTURE]}:meta`) as BattleAtlas; }
  private setFrame(id: string, frame: string): void {
    const meta = this.meta(id), f = meta.frames[frame]!;
    const sprite = id === 'slam' ? this.vfx : this.sprites[id]!;
    sprite.setFrame(f.index_0_based).setOrigin(f.pivot[0] / meta.frame_size[0], f.pivot[1] / meta.frame_size[1]);
  }
  private play(id: string, frames: string[], onFrame?: (key: string) => void): Promise<void> {
    return new Promise(resolve => {
      let index = 0;
      const step = (): void => {
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
  private async act(command: Command): Promise<void> {
    if (this.locked || this.closing) return;
    const engine = this.session.engine;
    const pending = engine.prepare(command, engine.snapshot().turn);
    if (!pending) { this.panel.say(engine.unavailable(command) ?? 'Aksi tidak tersedia.'); return; }
    this.locked = true; this.panel.busy();
    if (pending.actorId === 'C01' && (pending.command === 'attack' || pending.command === 'ground_slam')) this.services.audio.playSfx('SFX_GREATSWORD_SWING');
    this.phase = 'anticipation';
    this.panel.say(pending.actorId === 'M01' ? 'Hollowling merapatkan tubuh, lalu menerjang Yaric.' : pending.command === 'ground_slam' ? 'Yaric mengangkat pedangnya. Ground Slam!' : pending.command === 'attack' ? 'Yaric mengayunkan greatsword.' : 'Yaric bersiap.');
    let reaction: Promise<void> = Promise.resolve();
    const impact = (): void => {
      const result = engine.impact(pending.token);
      if (!result) return;
      this.phase = 'impact'; this.panel.say(result.text); this.panel.refresh(engine);
      if (result.amount > 0) {
        const healing = pending.command === 'potion';
        const target = this.sprites[result.targetId]!;
        const t = makeText(this, target.x, 54, `${healing ? '+' : '-'}${result.amount}`, { originX: 0.5, color: healing ? COLORS.bitterLime : COLORS.paper }).setDepth(30);
        this.tweens.add({ targets: t, y: 40, duration: 650, onComplete: () => t.destroy() });
        if (!healing) {
          this.services.audio.playSfx(pending.actorId === 'M01' ? 'SFX_ENEMY_ATTACK' : pending.command === 'ground_slam' ? 'SFX_GROUND_SLAM' : 'SFX_GREATSWORD_IMPACT');
          this.services.audio.playSfx('SFX_DAMAGE');
          const dead = engine.snapshot().actors.find(a => a.id === result.targetId)!.hp <= 0;
          reaction = this.play(result.targetId, dead ? ['death_start', 'defeated'] : ['hit_recoil', 'hit_recover']).then(() => { if (!dead) this.setFrame(result.targetId, 'idle_a'); });
          if (pending.command === 'ground_slam') { this.services.effects.shake(this, 150, 0.007); this.services.effects.flash(this, 60); }
          this.impacts.push({ command: pending.command, turn: pending.token, shake: this.cameras.main.shakeEffect.isRunning, flash: this.cameras.main.flashEffect.isRunning });
        }
      }
    };
    await this.animate(pending, impact);
    await reaction;
    this.phase = 'recovery';
    engine.finish(pending.token);
    this.panel.refresh(engine);
    this.time.delayedCall(550, () => this.nextTurn());
  }
  private async animate(p: PendingAction, impact: () => void): Promise<void> {
    const id = p.actorId;
    if (p.command === 'attack' || p.command === 'ground_slam') {
      await this.play(id, id === 'C01' ? ['anticipation', 'attack_windup'] : ['anticipation']);
      if (p.command === 'ground_slam') {
        await this.play(id, ['attack_contact']);
        this.vfx.setVisible(true);
        await this.play('slam', ['fracture', 'crack_spread', 'slab_separates', 'slab_rises', 'slab_apex', 'slab_strikes', 'slab_descends', 'ground_settles'], frame => { if (frame === this.meta('slam').event.frame_key) impact(); });
        this.vfx.setVisible(false);
      } else {
        await this.approach(id, id === 'C01' ? 166 : 168, 120);
        await this.play(id, [this.meta(id).event.frame_key], impact);
      }
      await this.play(id, ['followthrough', 'recovery']);
      if (p.command === 'attack') await this.approach(id, id === 'C01' ? 244 : 78, 160);
    } else {
      await this.play(id, ['anticipation']); impact();
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
      this.services.audio.playSfx(state.outcome === 'victory' ? 'SFX_VICTORY' : 'SFX_DEFEAT');
      this.panel.result(state.outcome === 'victory'); return;
    }
    if (engine.current.side === 'enemy') { void this.act(enemyAI()); return; }
    this.panel.show(engine);
    if (state.turn === 1) this.panel.say('Pilih Serang untuk menyerang musuh.');
    else if (engine.current.hp < engine.current.stats.HP) this.panel.say('HP berkurang. Barang: Potion. Bertahan: kurangi kerusakan.');
  }
  override update(_time: number, delta: number): void {
    if (!this.sprites || this.locked || this.phase !== 'idle') return;
    for (const id of ['C01', 'M01']) {
      const idle = this.idle[id] ??= { elapsed: 0, frame: 'idle_a' };
      idle.elapsed += delta;
      if (idle.elapsed >= this.meta(id).frames[idle.frame]!.duration_ms) {
        idle.elapsed = 0; idle.frame = idle.frame === 'idle_a' ? 'idle_b' : 'idle_a'; this.setFrame(id, idle.frame);
      }
    }
  }
  debugState(): Record<string, unknown> {
    return { ...this.session.engine.snapshot(), locked: this.locked, phase: this.phase, menu: this.panel.mode,
      sprites: Object.fromEntries(Object.entries(this.sprites).map(([id, s]) => [id, { x: s.x, y: s.y, footY: s.y + (1 - s.originY) * 96 - 1, frame: s.frame.name, originX: s.originX, originY: s.originY }])),
      vfx: { visible: this.vfx.visible, frame: this.vfx.frame.name }, history: this.history.slice(-150),
      impacts: this.impacts.slice(-30),
      effects: { shake: this.cameras.main.shakeEffect.isRunning, flash: this.cameras.main.flashEffect.isRunning } };
  }
}
