import Phaser from 'phaser';
import { BattlePanel } from '../../ui/components/BattlePanel';
import { Ui, TYPE } from '../../ui/kit/ui';
import { BATTLE_TEXTURE, bossAtlas, draftPosePlayback, frameKeyFor, fullAtlas, type BattleAtlas, type PoseAtlas } from '../combat/BattleAtlas';
import { enemyAI, intentHint, type Command, type EffectResult, type ImpactResult, type PendingAction } from '../combat/BattleEngine';
import { BattleSession } from '../combat/BattleSession';
import { TIMELINES, actionClassFor, effectiveHitstop, impactFx, presentationFor, type ActionClass, type PhaseName, type TimelineSpec } from '../combat/presentation';
import { COLORS } from '../config/palette';
import { SCENE_KEYS } from '../data/ids';
import { isNameKnown } from '../story/identity';
import { Vfx } from '../vfx';
import { isVelthiaCommand, VELTHIA_SKILL_INFO } from '../rpg/velthia';
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

/** Jejak waktu satu aksi (ms sejak konfirmasi) untuk QA tempo; lihat BATTLE_TRANSITION_AND_PACING_SPEC.md. */
interface ActionTrace { actor: string; command: string; cls: ActionClass; start: number; marks: Partial<Record<PhaseName, number>>; total: number }

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
  /** Pustaka VFX piksel Phase 7 (partikel diskret, pooled, depth < 20). `vfx` di atas = sprite slab Ground Slam lama. */
  private fx!: Vfx;
  private partner: 'C02' | 'C03' | null = null;
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
  private traces: ActionTrace[] = [];
  /** Anggota yang ditandai hantaman berat Chronolith (telegraf) selama giliran pemain. */
  private telegraphed: string | null = null;
  /** Log id VFX yang diputar (QA). */
  private fxLog: string[] = [];
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
    // Atlas penuh Phase 7 (Velthia, Oathguard, Chronolith): sudah memuat durasi, pivot, dan kunci frame khusus sendiri.
    for (const id of ['C02', 'M05', 'B03'] as const) { const meta = this.cache.json.get(`${BATTLE_TEXTURE[id]}:meta`); if (meta) this.draftPlayback[id] = fullAtlas(meta); }
    this.partner = this.services.gameState.snapshot()!.party.find((id): id is 'C02' | 'C03' => id === 'C02' || id === 'C03') ?? null;
    this.closing = false; this.locked = true; this.history = []; this.impacts = []; this.traces = []; this.telegraphed = null; this.idle = {}; this.targetId = null; this.stageObjs = []; this.shadows = {};
    this.services.router.arrive(this);
    this.cameras.main.setBackgroundColor(0x263a30);
    this.uiCamera = this.cameras.add(0, 0, this.ui.layout.pixelWidth, this.ui.layout.pixelHeight);
    this.applyView();

    this.drawForest();
    this.sprites = {};
    const enemyIds = this.session.enemyIds;
    enemyIds.forEach((id) => this.sprites[id] = this.add.sprite(0, 0, BATTLE_TEXTURE[id], 0).setDepth(4));
    this.sprites.C01 = this.add.sprite(0, 0, BATTLE_TEXTURE.C01, 0).setDepth(4);
    if (this.partner) this.sprites[this.partner] = this.add.sprite(0, 0, BATTLE_TEXTURE[this.partner], 0).setDepth(4);
    this.fx = new Vfx(this, { reducedFlashes: () => this.services.settings.get('reduced_flashes') });
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
        if (this.session.engine.snapshot().outcome === 'escaped' || this.session.commitVictory()) { this.closing = true; this.services.router.goto(this, SCENE_KEYS.World, undefined, { transition: 'return' }); }
      } else if (command === 'title') { this.closing = true; this.services.router.goto(this, SCENE_KEYS.Title); }
      else if (command === 'retry') {
        if (this.session.retry()) {
          this.panel.dismissResult();
          for (const [id, sprite] of Object.entries(this.sprites)) { sprite.setAlpha(1).setPosition(this.homes[id]!.x, this.homes[id]!.y); this.setFrame(id, 'idle_a'); }
          this.vfx.setVisible(false); this.idle = {}; this.fx.clear();
          this.enemyShadow.setAlpha(0.4).setX(this.homes[this.session.enemyIds[0]!]!.x);
          this.services.audio.playBgm(presentationFor(this.encounter).bgm);
          this.panel.say('Pilih Serang untuk menyerang musuh.'); this.nextTurn();
        }
      } else void this.act(command, targetId);
    }, enemyIds.length > 1 ? 'Dua musuh' : presentationFor(this.encounter).name === 'Musuh' ? 'Hollowling' : presentationFor(this.encounter).name,
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
      if (this.closing) return;
      // Pause aman dibuka kapan saja (termasuk saat animasi: scene dijeda, linimasa berlanjut setelah resume).
      if (event.intent === 'back' && (this.locked || this.panel.mode === 'main')) {
        this.services.router.openOverlay(this, SCENE_KEYS.Pause); return;
      }
      if (this.locked) return;
      this.panel.handle(event, this.session.engine);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.epoch++; this.closing = true; this.releaseInput?.(); this.services.audio.stopBgm(); });
    this.services.audio.playBgm(presentationFor(this.encounter).bgm);
    const epochAtStart = this.epoch;
    void this.services.router.revealed(this).then(() => { if (epochAtStart === this.epoch) this.nextTurn(); });
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
    if (this.partner && this.sprites[this.partner]) this.homes[this.partner] = { x: Math.round(HOME_X.C03 * w), y: this.yForFoot(this.partner, GROUND.C03 * h) };
    for (const [id, sprite] of Object.entries(this.sprites)) if (!this.locked || this.phase === 'idle') sprite.setPosition(this.homes[id]!.x, this.homes[id]!.y);
    // bayangan di garis tanah masing-masing
    const first = this.session.enemyIds[0]!;
    this.enemyShadow?.setPosition(this.homes[first]!.x, (enemyIds.length === 1 ? GROUND.enemySingle : GROUND.enemyTwo[0]) * h + 2);
    if (this.session.enemyIds.includes('B01')) this.enemyShadow?.setSize(116, 7); // bayangan boss selebar tubuhnya
    if (this.session.enemyIds.includes('B03')) this.enemyShadow?.setSize(150, 8);
    this.shadows.C01?.setPosition(this.homes.C01!.x, GROUND.C01 * h + 2);
    if (this.partner) this.shadows[this.partner]?.setPosition(this.homes[this.partner]?.x ?? 0, GROUND.C03 * h + 2);
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
    if (this.partner) this.shadows[this.partner] = add(this.add.ellipse(0, 0, 36, 5, 0x1d1625, 0.4).setDepth(-1));
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
  /**
   * Memutar frame atlas berurutan. `totalMs` (opsional) membagi durasi total ke frame secara proporsional terhadap durasi
   * atlas, sehingga LINIMASA (combat/presentation.ts) yang menentukan tempo, bukan durasi frame mentah.
   */
  private play(id: string, frames: string[], onFrame?: (key: string) => void, totalMs?: number): Promise<void> {
    const epoch = this.epoch;
    const meta = this.meta(id);
    const raw = frames.map(f => meta.frames[f]?.duration_ms ?? 100);
    const sum = raw.reduce((a, b) => a + b, 0) || 1;
    const scale = totalMs === undefined ? 1 : totalMs / sum;
    return new Promise(resolve => {
      let index = 0;
      const step = (): void => {
        if (epoch !== this.epoch) return;
        const i = index++;
        const frame = frames[i];
        if (!frame) { resolve(); return; }
        this.setFrame(id, frame);
        this.history.push({ phase: this.phase, turn: this.session.engine.snapshot().turn, frame, actor: id });
        onFrame?.(frame);
        this.time.delayedCall(Math.max(16, Math.round(raw[i]! * scale)), step);
      };
      step();
    });
  }

  private sleep(ms: number): Promise<void> {
    const epoch = this.epoch;
    return new Promise(resolve => {
      if (ms <= 0) { resolve(); return; }
      this.time.delayedCall(ms, () => { if (epoch === this.epoch) resolve(); });
    });
  }

  /** Catat waktu fase linimasa aksi (untuk QA/pengukuran tempo). */
  private mark(trace: ActionTrace, phase: PhaseName): void { trace.marks[phase] = Math.round(this.time.now - trace.start); }

  private playFx(id: string, x: number, y: number, o?: Parameters<Vfx['play']>[3]): void { this.fxLog.push(id); this.fx.play(id, x, y, o); }
  private isPlayerSide(id: string): boolean { return id === 'C01' || id === 'C02' || id === 'C03'; }
  private alive(side: 'player' | 'enemy'): string[] { return this.session.engine.snapshot().actors.filter(a => a.side === side && a.hp > 0).map(a => a.id); }

  /** Titik tengah tubuh sprite pada koordinat panggung (untuk VFX dampak) dan titik pijak (untuk VFX tanah). */
  private center(id: string): { x: number; y: number } {
    const b = this.sprites[id]!.getBounds();
    return { x: Math.round(b.centerX), y: Math.round(b.centerY) };
  }
  private foot(id: string): { x: number; y: number } {
    const s = this.sprites[id]!;
    return { x: Math.round(s.x), y: Math.round(s.y + (1 - s.originY) * this.meta(id).frame_size[1] - 1) };
  }

  private statusText(pending: PendingAction): string {
    const engine = this.session.engine, me = this.selfName, c: string = pending.command;
    if (pending.actorId === 'C02') {
      return c === 'velthia_pulse' ? 'Velthia membuka telapak tangannya.' : c === 'velthia_mend' ? 'Velthia mengulurkan tangan, tenang.' : c === 'velthia_ward' ? 'Velthia merentangkan selubung cahaya.'
        : c === 'velthia_bloom' ? 'Velthia memanggil tunas rimba.' : c === 'velthia_concord' ? `Velthia menyelaraskan langkah dengan ${me}.` : 'Velthia bersiap.';
    }
    if (pending.actorId === 'B03') {
      return c === 'chrono_charge' ? 'Lengkung dan inti Chronolith bergeser. Hantaman menyusul.' : c === 'chrono_slam' ? 'Chronolith menurunkan lengannya!' : c === 'chrono_sweep' ? 'Chronolith menyapukan lengannya.'
        : c === 'chrono_guard' ? 'Chronolith menutup diri.' : c === 'chrono_rewind' ? 'Waktu di sekitar Chronolith bergeser.' : 'Chronolith bergerak.';
    }
    if (pending.actorId === 'M05') return c === 'oath_brace' ? 'Oathguard menahan perisai di depan tubuhnya.' : 'Oathguard maju sesuai sumpah lamanya.';
    return pending.actorId === 'B01' ? c === 'boss_windup' ? 'Mournfang merendahkan tanduknya.' : c === 'boss_recover' ? 'Mournfang terhuyung, lalu menarik napas.' : 'Mournfang menggeser kaki depannya.'
      : pending.actorId === 'B02' ? c === 'knight_guard' ? 'Veyrath menahan bilah. Ia mengunci arah ke Torvan.' : 'Veyrath bergerak sesuai sumpah lama.'
      : pending.actorId === 'M01' ? `Hollowling merapatkan tubuh, lalu menerjang${this.known ? ' Yaric' : 'mu'}.`
      : pending.actorId === 'C03' ? `Torvan: ${c === 'ranting_nakal' ? 'ranting bergerak di tangannya.' : c === 'tunas_bandel' ? 'tunas kecil tumbuh.' : 'aku coba dulu.'}`
      : pending.actorId === 'M02' || pending.actorId === 'M03' ? `${engine.current.name} bersiap.`
      : c === 'ground_slam' ? `${me} mengangkat pedangnya. Ground Slam!` : c === 'attack' ? `${me} mengayunkan greatsword.` : c === 'defend' ? `${me} bertahan.` : `${me} bersiap.`;
  }

  /** Target aksi pada saat eksekusi (sebelum engine.impact melaporkan hasil). */
  private targetsOf(p: PendingAction): string[] {
    const snap = this.session.engine.snapshot();
    const me = snap.actors.find(a => a.id === p.actorId)!;
    const c: string = p.command;
    if (p.targetId) return [p.targetId];
    if (c === 'velthia_bloom' || c === 'chrono_sweep') return this.alive(c === 'velthia_bloom' ? 'player' : 'player');
    if (c === 'velthia_concord') return ['C01'];
    if (c === 'chrono_slam' && me.intentTargetId) return [me.intentTargetId];
    if (c === 'chrono_charge' || c === 'chrono_guard' || c === 'chrono_rewind' || c === 'boss_windup' || c === 'boss_recover' || c === 'knight_guard' || c === 'knight_recover' || c === 'oath_brace' || c === 'defend') return [];
    if (me.side === 'player') return this.alive('enemy').slice(0, 1);
    const players = this.alive('player');
    return [c === 'knight_thrust' && players.includes('C03') ? 'C03' : players[0]!];
  }

  /** Pose utama (frame event) untuk perintah; null = tidak ada pose khusus (hanya jeda). */
  private eventPose(p: PendingAction): string | null {
    const id = p.actorId, c: string = p.command, meta = this.meta(id);
    if (isVelthiaCommand(c)) return frameKeyFor(meta, VELTHIA_SKILL_INFO[c].frameKey, 'attack');
    if (c === 'chrono_charge') return frameKeyFor(meta, 'charge', 'anticipation');
    if (c === 'chrono_guard') return frameKeyFor(meta, 'guard', 'anticipation');
    if (c === 'chrono_rewind') return frameKeyFor(meta, 'special', 'anticipation');
    if (c === 'oath_brace') return null;
    if (c === 'bukan_aku' || c === 'tunas_bandel') return meta.event.frame_key;
    if (c === 'potion' || c === 'defend' || c === 'boss_windup' || c === 'boss_recover' || c === 'knight_guard' || c === 'knight_recover') return null;
    return meta.event.frame_key;
  }

  private popup(targetId: string, text: string, color: number, slot = 0, big = true): void {
    const target = this.sprites[targetId];
    if (!target) return;
    const p = this.toUi(target.x + slot * 14, target.y - 44 - slot * 4);
    const t = this.ui.text(p.x, p.y, text, { size: big ? TYPE.display - 2 : TYPE.body + 1, weight: '700', family: 'display', originX: 0.5, originY: 0.5, color, depth: 30 });
    this.tweens.add({ targets: t, y: t.y - this.ui.u(26), alpha: 0.0, duration: 900, ease: 'Sine.easeOut', onComplete: () => t.destroy() });
  }

  private popupFor(effect: EffectResult, slot: number): void {
    const { targetId, kind, amount } = effect;
    if (kind === 'damage') this.popup(targetId, amount > 0 ? `-${amount}` : 'Serap', amount > 0 ? COLORS.paper : COLORS.mp, slot, amount > 0);
    else if (kind === 'heal') this.popup(targetId, `+${amount}`, COLORS.bitterLime, slot);
    else if (kind === 'regen') this.popup(targetId, 'Pulih', COLORS.bitterLime, slot, false);
    else if (kind === 'shield') this.popup(targetId, 'Selubung', COLORS.mp, slot, false);
    else if (kind === 'mp') this.popup(targetId, `+${amount} MP`, COLORS.mp, slot, false);
    else if (kind === 'buff') this.popup(targetId, 'Selaras', COLORS.bitterLime, slot, false);
  }

  /** VFX saat eksekusi (ayunan, rapal, pengumpulan) - sebelum dampak. */
  private fxExecute(p: PendingAction, targets: string[]): void {
    const c: string = p.command, a = p.actorId, player = this.isPlayerSide(a);
    const t0 = targets[0];
    const me = this.center(a);
    const tc = t0 ? this.center(t0) : undefined;
    const flip = player; // seni VFX menghadap kanan; pemain di kanan menghadap kiri
    if (c === 'attack' && a === 'C01' && tc) this.playFx('greatsword_trail', Math.round((me.x + tc.x) / 2), tc.y, { flip });
    else if (c === 'attack' && a === 'M01' && tc) this.playFx('hollowling_claw', tc.x, tc.y, { flip });
    else if (c === 'boss_sweep' && tc) this.playFx('mournfang_slash', tc.x, tc.y, { flip });
    else if (c === 'knight_thrust' && tc) this.playFx('veyrath_strike', tc.x, tc.y, { flip });
    else if (c === 'ranting_nakal' && tc) this.playFx('torvan_leaf_bolt', me.x, me.y - 6, { target: tc, flip });
    else if (c === 'bukan_aku' && t0) { const f = this.foot(t0); this.playFx('torvan_support', f.x, f.y, { flip }); }
    else if (c === 'tunas_bandel' && t0) { const f = this.foot(t0); this.playFx('forest_summon_small', f.x, f.y, { flip }); }
    else if (c === 'velthia_pulse' && tc) this.playFx('velthia_pulse', me.x, me.y - 14, { target: tc, flip });
    else if (c === 'velthia_mend' && t0) { const f = this.foot(t0); this.playFx('velthia_mend', f.x, f.y, { flip }); }
    else if (c === 'velthia_ward' && t0) { const k = this.center(t0); this.playFx('velthia_ward', k.x, k.y, { flip }); }
    else if (c === 'velthia_bloom') for (const id of targets) { const f = this.foot(id); this.playFx('velthia_bloom', f.x, f.y, { flip }); }
    else if (c === 'velthia_concord') { const y = this.center('C01'); this.playFx('velthia_concord', y.x, y.y - 6, { target: { x: me.x, y: me.y - 6 }, flip }); }
    else if (c === 'chrono_charge') this.playFx('chronolith_charge', me.x, me.y - 10, { flip: false });
    else if (c === 'chrono_rewind') this.playFx('chronolith_temporal', me.x, me.y, { flip: false });
  }

  /** VFX pada dampak per efek hasil engine. */
  private fxImpact(p: PendingAction, effects: EffectResult[], heavy: boolean): void {
    const c: string = p.command;
    if (c === 'ground_slam') { const t = effects.find(e => e.kind === 'damage'); if (t) { const f = this.foot(t.targetId); this.playFx('ground_slam_crack', f.x, Math.round(GROUND.C01 * this.view.h)); } }
    else if (c === 'chrono_slam') { const t = effects.find(e => e.kind === 'damage'); if (t) { const f = this.foot(t.targetId); this.playFx('chronolith_slam', f.x, f.y, { flip: true }); } }
    else if (c === 'chrono_sweep') { const f = this.foot('C01'); this.playFx('chronolith_slam', f.x, f.y, { flip: true, scale: 1 }); }
    for (const e of effects) {
      const k = this.center(e.targetId);
      if (e.kind === 'damage' && e.amount > 0 && c !== 'ground_slam' && !c.startsWith('chrono_')) this.playFx(heavy ? 'impact_heavy' : 'impact_hit', k.x, k.y, { flip: !this.isPlayerSide(e.targetId) });
      else if (e.kind === 'damage' && e.amount > 0 && c.startsWith('chrono_')) this.playFx('impact_hit', k.x, k.y);
      if (e.kind === 'damage' && (e.absorbed ?? 0) > 0) this.playFx('shield_hit_spark', k.x, k.y);
      if (e.kind === 'heal' && c !== 'velthia_mend') this.playFx('heal_sparkle', k.x, k.y);
    }
  }

  private execSfx(p: PendingAction): void {
    const a = this.services.audio, c: string = p.command;
    const sfx = c === 'attack' && p.actorId === 'C01' ? 'SFX_GREATSWORD_SWING' : c === 'ground_slam' ? 'SFX_GREATSWORD_SWING'
      : c === 'ranting_nakal' || c === 'bukan_aku' || c === 'tunas_bandel' ? 'SFX_MAGIC_TORVAN'
      : c === 'velthia_ward' ? 'SFX_MAGIC_VELTHIA_SHIELD' : c === 'velthia_mend' ? 'SFX_MAGIC_VELTHIA_HEAL' : isVelthiaCommand(c) ? 'SFX_MAGIC_VELTHIA_CAST'
      : c === 'chrono_rewind' || c === 'chrono_guard' ? 'SFX_CHRONOLITH_TEMPORAL'
      : c === 'defend' ? 'SFX_DEFEND' : (c === 'attack' || c === 'boss_sweep' || c === 'knight_thrust') && !this.isPlayerSide(p.actorId) ? 'SFX_ENEMY_ATTACK' : null;
    if (c === 'chrono_charge') a.playSfx('SFX_CHRONOLITH_CHARGE'); else if (sfx) a.playSfx(sfx);
    if (c === 'velthia_ward') a.playSfx('SFX_SHIELD');
  }

  private async act(command: Command, targetId?: string): Promise<void> {
    if (this.locked || this.closing) return;
    const engine = this.session.engine;
    const epoch = this.epoch;
    const pending = engine.prepare(command, engine.snapshot().turn, targetId);
    if (!pending) { this.panel.say(engine.unavailable(command, targetId) ?? 'Aksi tidak tersedia.'); return; }
    const cls = actionClassFor(pending.command);
    const spec = TIMELINES[cls];
    const trace: ActionTrace = { actor: pending.actorId, command: pending.command, cls, start: this.time.now, marks: {}, total: 0 };
    this.locked = true; this.panel.busy(); this.panel.clearControlHint();
    this.phase = 'anticipation';
    this.mark(trace, 'confirm');
    if (this.isPlayerSide(pending.actorId)) this.services.audio.playSfx('SFX_BATTLE_CONFIRM');
    this.panel.say(this.statusText(pending));
    await this.sleep(spec.confirm);
    if (epoch !== this.epoch) return;
    let reaction: Promise<void> = Promise.resolve();
    const heavy = cls === 'heavy' || cls === 'boss_special';
    const impact = (): void => {
      if (epoch !== this.epoch) return;
      const result: ImpactResult | null = engine.impact(pending.token);
      if (!result) return;
      this.phase = 'impact'; this.mark(trace, 'hitstop'); this.panel.say(result.text); this.panel.refresh(engine);
      const effects = result.effects?.length ? result.effects : [{ targetId: result.targetId, kind: result.amount > 0 ? 'damage' : 'none', amount: result.amount } as EffectResult];
      // Angka muncul TEPAT pada dampak (frame event). Slot menggeser angka bila satu target menerima beberapa efek.
      const perTarget: Record<string, number> = {};
      for (const e of effects) { const slot = perTarget[e.targetId] ?? 0; perTarget[e.targetId] = slot + 1; this.popupFor(e, slot); }
      this.fxImpact(pending, effects, heavy);
      const damaged = effects.filter(e => e.kind === 'damage' && e.amount > 0);
      if (damaged.length) {
        this.playImpactSfx(pending);
        const stop = effectiveHitstop(spec, this.services.settings.get('screen_shake'));
        const snapshot = engine.snapshot();
        const reactions = damaged.map(e => {
          const dead = snapshot.actors.find(a => a.id === e.targetId)!.hp <= 0;
          const target = this.sprites[e.targetId]!;
          return this.sleep(stop).then(() => {
            this.mark(trace, 'reaction');
            return this.play(e.targetId, dead ? ['death_start', 'defeated'] : ['hit_recoil', 'hit_recover'], undefined, dead ? undefined : spec.reaction);
          }).then(async () => {
            if (epoch !== this.epoch) return;
            if (!dead) this.setFrame(e.targetId, 'idle_a');
            else if (e.targetId === 'B01' || e.targetId === 'B02' || e.targetId === 'B03') await new Promise<void>(resolve => this.tweens.add({ targets: [target, this.enemyShadow], alpha: 0, x: target.x - 12, duration: 320, onComplete: () => resolve() }));
          });
        });
        reaction = Promise.all(reactions).then(() => undefined);
        const fx = impactFx({ reducedFlashes: this.services.settings.get('reduced_flashes'), screenShake: this.services.settings.get('screen_shake') }, heavy);
        const shook = fx.shake ? this.services.effects.shake(this, 150, 0.007) : false;
        const flashed = fx.flash ? this.services.effects.flash(this, 60) : false;
        this.impacts.push({ command: pending.command, turn: pending.token, shake: shook, flash: flashed });
      }
      const healed = effects.some(e => e.kind === 'heal');
      if (healed) this.services.audio.playSfx(this.healSfx(pending));
      if (result.effects?.some(e => e.kind === 'shield')) this.services.audio.playSfx('SFX_SHIELD');
      if (result.telegraph) this.telegraphed = result.telegraph.targetId;
      else if (pending.command === 'chrono_slam') this.telegraphed = null;
    };
    await this.animate(pending, impact, spec, trace);
    await reaction;
    if (epoch !== this.epoch) return;
    this.phase = 'recovery'; this.mark(trace, 'recovery');
    engine.finish(pending.token);
    // Racun / regen akhir giliran
    const ticks = engine.snapshot().ticks ?? [];
    ticks.forEach((tk, i) => {
      if (tk.kind === 'poison') { this.popup(tk.actorId, `-${tk.amount}`, COLORS.warn, i, false); this.playFx('status_poison', this.center(tk.actorId).x, this.center(tk.actorId).y); this.services.audio.playSfx('SFX_STATUS_POISON'); }
      else this.popup(tk.actorId, `+${tk.amount}`, COLORS.bitterLime, i, false);
    });
    this.panel.refresh(engine);
    await this.sleep(spec.handoff);
    if (epoch !== this.epoch) return;
    this.mark(trace, 'handoff'); trace.total = Math.round(this.time.now - trace.start);
    this.traces.push(trace); if (this.traces.length > 40) this.traces.shift();
    this.nextTurn();
  }

  /** SFX dampak berdasarkan perintah dan sisi pelaku. */
  private playImpactSfx(pending: PendingAction): void {
    const a = this.services.audio;
    const c: string = pending.command;
    const player = this.isPlayerSide(pending.actorId);
    if (c === 'ground_slam') a.playSfx('SFX_GROUND_SLAM');
    else if (c === 'attack' && pending.actorId === 'C01') a.playSfx('SFX_GREATSWORD_IMPACT');
    else if (c.startsWith('chrono_')) a.playSfx('SFX_CHRONOLITH_STRIKE');
    else if (!player) a.playSfx('SFX_ENEMY_ATTACK');
    a.playSfx(player ? 'SFX_ENEMY_DAMAGE' : 'SFX_DAMAGE');
  }
  private healSfx(pending: PendingAction): string {
    return pending.command === 'velthia_mend' ? 'SFX_MAGIC_VELTHIA_HEAL' : pending.command === 'tunas_bandel' ? 'SFX_MAGIC_TORVAN' : 'SFX_HEAL';
  }

  private async animate(p: PendingAction, impact: () => void, spec: TimelineSpec, trace: ActionTrace): Promise<void> {
    const id = p.actorId, c: string = p.command;
    const targets = this.targetsOf(p);
    const melee = c === 'attack' || c === 'ground_slam' || c === 'boss_sweep' || c === 'knight_thrust' || c === 'chrono_slam';
    const stationaryStrike = c === 'ranting_nakal' || c === 'velthia_pulse' || c === 'chrono_sweep';
    if (melee || stationaryStrike) {
      // antisipasi (pose siap) -> windup (maju) -> eksekusi (frame event = dampak) -> hitstop -> pemulihan
      this.mark(trace, 'anticipation');
      await this.play(id, id === 'C01' ? ['anticipation', 'attack_windup'] : ['anticipation'], undefined, spec.anticipation);
      this.mark(trace, 'windup');
      if (c === 'ground_slam') {
        await this.play(id, ['attack_contact'], undefined, spec.windup);
        this.execSfx(p);
        this.mark(trace, 'execution');
        const t = this.sprites[targets[0] ?? this.session.enemyId];
        this.vfx.setPosition(t?.x ?? this.homes[this.session.enemyId]!.x, Math.round(GROUND.C01 * this.view.h)).setVisible(true);
        await this.play('slam', ['fracture', 'crack_spread', 'slab_separates', 'slab_rises', 'slab_apex', 'slab_strikes', 'slab_descends', 'ground_settles'], frame => { if (frame === this.meta('slam').event.frame_key) impact(); }, spec.execution + spec.hitstop + 260);
        this.vfx.setVisible(false);
      } else if (stationaryStrike) {
        await this.sleep(spec.windup);
        this.execSfx(p); this.fxExecute(p, targets);
        this.mark(trace, 'execution');
        const pose = this.eventPose(p) ?? this.meta(id).event.frame_key;
        await this.play(id, [pose], impact, spec.execution + spec.hitstop);
      } else {
        const target = this.sprites[targets[0]!]!;
        const standOff = id === 'B01' ? 112 : id === 'B03' ? 130 : 76; // boss besar berhenti lebih jauh agar tubuhnya tidak menimpa target
        const x = this.isPlayerSide(id) ? target.x + (id === 'C01' ? 88 : 94) : target.x - standOff;
        await this.approach(id, x, spec.windup);
        this.execSfx(p); this.fxExecute(p, targets);
        this.mark(trace, 'execution');
        await this.play(id, [this.eventPose(p) ?? this.meta(id).event.frame_key], impact, spec.execution + spec.hitstop);
      }
      this.mark(trace, 'recovery');
      const back = c !== 'ground_slam' && melee ? this.approach(id, this.homes[id]!.x, Math.round(spec.recovery * 0.6)) : Promise.resolve();
      await Promise.all([this.play(id, ['followthrough', 'recovery'], undefined, spec.recovery), back]);
    } else {
      // aksi non-serangan: antisipasi -> (frame event) -> efek -> pemulihan
      this.mark(trace, 'anticipation');
      await this.play(id, ['anticipation'], undefined, spec.anticipation);
      this.mark(trace, 'windup');
      if (spec.windup > 0) await this.sleep(spec.windup);
      this.execSfx(p); this.fxExecute(p, targets);
      this.mark(trace, 'execution');
      const pose = this.eventPose(p);
      if (pose && pose !== 'anticipation') await this.play(id, [pose], undefined, spec.execution);
      else await this.sleep(spec.execution);
      impact();
      this.mark(trace, 'recovery');
      await this.play(id, ['recovery'], undefined, spec.recovery);
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
    place(this.targetCaret, this.panel.mode === 'target' ? this.targetId : this.telegraphed);
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
      fx: { active: this.fx.active(), running: this.fx.running(), played: this.fxLog.slice(-40) }, telegraphed: this.telegraphed,
      impacts: this.impacts.slice(-30), traces: this.traces.slice(-20),
      stage: { zoom: this.cameras.main.zoom, w: this.view.w, h: this.view.h },
      effects: { shake: this.cameras.main.shakeEffect.isRunning, flash: this.cameras.main.flashEffect.isRunning } };
  }
}
