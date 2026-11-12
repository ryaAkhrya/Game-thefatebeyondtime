import Phaser from 'phaser';
import { footBox, type Facing, type Rect } from './Collision';
import { playState, registerCharacterAnims, type CharacterAnimMeta } from './CharacterAnims';
import { AveloriaView, type Actor } from './AveloriaView';
import type { AreaView3 } from './AreaView3';
import type { LoadedMap } from './forest1';
import type { Interactable } from './Interaction';
import {
  CRISIS_ATLAS, CRISIS_ITEMS, CRISIS_TRIGGERS, GATE_GUARD, GATHER, ID_NOBLE, ID_TORVAN, MAX_EVAC_WALKERS, SCRIPT_PATHS, TORVAN_LOOP, WALKERS,
  atLeast, crisisLevel, crisisNpcSpots, crisisStage, itemVisible, stageIndex, walkerFinal, walkerStart, walkersMode,
  type CrisisItem, type CrisisSpot, type CrisisStage, type CrisisWalker,
} from './aveloriaCrisis';

/**
 * Aveloria dalam krisis retakan waktu (Chapter III). Membungkus AveloriaView (Bab I-II tidak berubah) dan menambah:
 *  - perubahan lingkungan (retakan paving emas pucat, batu/air/api yang membeku, jam menara tersendat, bayangan salah arah,
 *    panji berkibar dalam putaran, lonceng salah waktu), semuanya turunan flag lewat `apply(flags)`;
 *  - evakuasi nyata: <= 10 warga berjalan di rute tetap menuju gerbang, Talric/penjaga di gerbang, Torvan membawa peti;
 *  - koreografi (`handleAction`) yang SELALU selesai (batas waktu) dan dibersihkan saat scene berhenti.
 *
 * Ops `handleAction(op, arg)`:
 *   crisisOpen      pembukaan: kamera menyapu plaza -> menara jam, waktu "tersangkut" sebentar, kamera kembali (~5 dtk)
 *   audienceGather  Azie berjalan ke dekat Velthia, bangsawan menghadapnya (~2 dtk)
 *   evacStart       gerbang dibuka (portcullis naik), Velthia+Azie ke ruang pertemuan, Talric ke gerbang, warga mulai mengalir (~5 dtk)
 *   evacFinish      sisa warga dipercepat sampai tiba (~<= 9 dtk), keadaan akhir evakuasi
 *   torvanFace      Torvan menoleh ke pemain
 *   focus <arg>     kamera ke 'tower'|'plaza'|'gate'|'council'|'court' (arg angka tidak dipakai); `release` mengembalikan kamera
 *   release         kamera kembali mengikuti pemain
 *   hitch <ms>      waktu "tersangkut": semua animasi krisis berhenti sebentar
 */

type Dir3 = 'down' | 'side' | 'up';
const ROW: Record<Facing, number> = { down: 0, left: 1, right: 2, up: 3 };
void ROW;
const FOOT_ORIGIN_Y = 47 / 48;
const OP_TIMEOUT: Record<string, number> = { crisisOpen: 14000, audienceGather: 8000, evacStart: 13000, evacFinish: 13000, torvanFace: 1500, focus: 3500, release: 3500, hitch: 3000 };

interface Body { id: string; x: number; y: number; facing: Facing; sprite: Phaser.GameObjects.Sprite; shadow: Phaser.GameObjects.Ellipse; tag: string; moving: boolean; collide: boolean }
interface ScriptedMove { path: readonly (readonly [number, number])[]; i: number; speed: number; done: () => void }
type WalkerStatus = 'work' | 'wait' | 'walk' | 'gathered' | 'gone';
interface Walker {
  def: CrisisWalker; sprite: Phaser.GameObjects.Sprite; shadow: Phaser.GameObjects.Ellipse; x: number; y: number; facing: Facing;
  status: WalkerStatus; idx: number; yieldT: number; lookT: number; workT: number; anim: string;
}
interface Anim { update(t: number, dt: number, level: number): void; setVisible(v: boolean): void }

/** Pseudo-acak deterministik (tanpa Math.random) agar jeda tersendat dapat diuji dan tidak serempak. */
function lcg(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a / 4294967296; };
}

export class AveloriaCrisisView implements AreaView3 {
  readonly base: AveloriaView;
  private readonly scene: Phaser.Scene;
  private readonly loaded: LoadedMap;
  private readonly interactables: Interactable[];
  private stage: CrisisStage = 'pre';
  private firstApply = true;
  private destroyed = false;
  private t = 0;
  private frozenUntil = 0;
  private readonly has: boolean;
  private readonly meta: { frames: Record<string, { pivot: { x: number; y: number } }> } | undefined;
  private readonly props: { item: CrisisItem; objs: Phaser.GameObjects.Image[]; anim?: Anim }[] = [];
  private readonly walkers: Walker[] = [];
  private walkMode: 'work' | 'stream' | 'done' = 'work';
  private streamClock = 0;
  private hurry = 1;
  private readonly bodies = new Map<string, Body>();
  private readonly moves = new Map<string, ScriptedMove>();
  private readonly named: Record<'velthia' | 'azie' | 'talric', { desired: CrisisSpot | 'follow' }> = { velthia: { desired: { x: 656, y: 536, facing: 'down' } }, azie: { desired: { x: 736, y: 632, facing: 'left' } }, talric: { desired: { x: 584, y: 556, facing: 'right' } } };
  private torvanState: { mode: 'loop' | 'camp'; phase: 0 | 1 | 2 | 3; t: number } = { mode: 'loop', phase: 0, t: 0 };
  private torvanCrate?: Phaser.GameObjects.Image;
  private gateGuard?: { sprite: Phaser.GameObjects.Sprite; shadow: Phaser.GameObjects.Ellipse };
  private gateLocked = true;
  private follow = { x: 656, y: 536, active: false, snap: false };
  private player = { x: 640, y: 616, moving: false, sprinting: false, facing: 'up' as Facing };
  private camDetached = false;
  private camTarget: Phaser.GameObjects.GameObject | null = null;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private readonly pending = new Set<() => void>();
  private bellNext = 2.5;
  private readonly rnd = lcg(1234567);

  constructor(scene: Phaser.Scene, loaded: LoadedMap, interactables: Interactable[]) {
    this.scene = scene; this.loaded = loaded; this.interactables = interactables;
    this.base = new AveloriaView(scene, loaded, interactables);
    this.base.setResidentsVisible(false);
    this.has = scene.textures.exists(CRISIS_ATLAS);
    this.meta = scene.cache.json.get(`${CRISIS_ATLAS}:meta`) as typeof this.meta;
    for (const t of CRISIS_TRIGGERS) if (!loaded.map.triggers.some(x => x.id === t.id)) loaded.map.triggers.push({ ...t });
    // Bab I-II: portal ke Liora tidak dipakai di krisis; interactable krisis ditambahkan hanya pada scene ini (peta bersama tidak berubah)
    const lioraExit = interactables.find(i => i.id === 'liora_exit'); if (lioraExit) lioraExit.enabled = false;
    this.buildTorvan();
    this.buildWalkers();
    this.buildProps();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  // ------------------------------------------------------------------------------------------------ konstruksi

  private pivotOf(frame: string, fx = 0.5, fy = 1): { x: number; y: number } { return this.meta?.frames[frame]?.pivot ?? { x: fx, y: fy }; }
  private image(frame: string, x: number, y: number, depth: number): Phaser.GameObjects.Image {
    const p = this.pivotOf(frame);
    return this.scene.add.image(x, y, CRISIS_ATLAS, frame).setOrigin(p.x, p.y).setDepth(depth).setVisible(false);
  }

  private buildTorvan(): void {
    const scene = this.scene;
    registerCharacterAnims(scene, 'C03_CH2_EXPLORE', 'c03', scene.cache.json.get('C03_CH2_EXPLORE:meta') as CharacterAnimMeta | undefined, 6);
    if (!scene.textures.exists('C03_CH2_EXPLORE')) return;
    const shadow = scene.add.ellipse(576, 1063, 18, 6, 0x20272a, 0.35).setDepth(1063);
    const sprite = scene.add.sprite(576, 1064, 'C03_CH2_EXPLORE', 0).setOrigin(0.5, FOOT_ORIGIN_Y).setDepth(1064);
    sprite.setData('tag', 'c03');
    this.bodies.set('torvan', { id: 'torvan', x: 576, y: 1064, facing: 'left', sprite, shadow, tag: 'c03', moving: false, collide: true });
    if (!this.interactables.some(i => i.id === ID_TORVAN)) this.interactables.push({ id: ID_TORVAN, kind: 'npc', verb: 'Bicara', x: 556, y: 1046, w: 40, h: 28, enabled: false });
    this.torvanCrate = this.has ? this.image('crisis_crate_carry', 0, 0, 0) : undefined;
  }

  private buildWalkers(): void {
    if (!this.has) return;
    const scene = this.scene;
    // animasi warga: 3 arah (down/side/up) x idle/jalan; kiri = flipX dari 'side'
    for (const w of WALKERS) for (const dir of ['down', 'side', 'up'] as Dir3[]) {
      const idle = `cit_${w.variant}_idle_${dir}`, walk = `cit_${w.variant}_walk_${dir}`;
      if (!scene.anims.exists(idle)) scene.anims.create({ key: idle, frames: [0, 1].map(i => ({ key: CRISIS_ATLAS, frame: `${idle}_${i}` })), frameRate: 2, repeat: -1 });
      if (!scene.anims.exists(walk)) scene.anims.create({ key: walk, frames: [0, 1, 2, 3].map(i => ({ key: CRISIS_ATLAS, frame: `${walk}_${i}` })), frameRate: 8, repeat: -1 });
    }
    {
      const g = GATE_GUARD;
      const shadow = scene.add.ellipse(g.x, g.y - 1, 18, 6, 0x20272a, 0.35).setDepth(g.y - 1).setVisible(false);
      const sprite = scene.add.sprite(g.x, g.y, CRISIS_ATLAS, 'cit_guard_idle_down_0').setOrigin(0.5, FOOT_ORIGIN_Y).setDepth(g.y).setVisible(false);
      sprite.anims.play({ key: 'cit_guard_idle_down', startFrame: 1 }, true);
      this.gateGuard = { sprite, shadow };
    }
    for (const def of WALKERS) {
      const s = walkerStart(def);
      const shadow = scene.add.ellipse(s.x, s.y - 1, 18, 6, 0x20272a, 0.35).setDepth(s.y - 1);
      const sprite = scene.add.sprite(s.x, s.y, CRISIS_ATLAS, `cit_${def.variant}_idle_down_0`).setOrigin(0.5, FOOT_ORIGIN_Y).setDepth(s.y);
      const w: Walker = { def, sprite, shadow, x: s.x, y: s.y, facing: def.facing, status: 'work', idx: 1, yieldT: 0, lookT: 1 + this.rnd() * 3, workT: this.rnd() * 3, anim: '' };
      this.walkers.push(w);
      this.playWalker(w, 'idle', def.facing);
      if (def.interact === ID_NOBLE && !this.interactables.some(i => i.id === ID_NOBLE)) this.interactables.push({ id: ID_NOBLE, kind: 'npc', verb: 'Bicara', x: s.x - 14, y: s.y - 16, w: 28, h: 28, enabled: false });
    }
  }

  private buildProps(): void {
    if (!this.has) return;
    const rnd = lcg(99);
    for (const item of CRISIS_ITEMS) {
      const entry: { item: CrisisItem; objs: Phaser.GameObjects.Image[]; anim?: Anim } = { item, objs: [] };
      const f = item.f ?? '';
      switch (item.kind) {
        case 'decal': entry.objs.push(this.image(f, item.x, item.y, -900)); break;
        case 'shadow': entry.objs.push(this.image(f, item.x, item.y, -890)); break;
        case 'bundle': case 'cart': entry.objs.push(this.image(f, item.x, item.y, item.y)); break;
        case 'water': {
          const img = this.image('crisis_well_water_a', item.x, item.y, 881); entry.objs.push(img);
          let acc = rnd() * 2;
          entry.anim = { setVisible: v => img.setVisible(v), update: (_t, dt) => { acc += dt; img.setFrame(Math.floor(acc / 2.4) % 2 ? 'crisis_well_water_b' : 'crisis_well_water_a'); } };
          break;
        }
        case 'clock': {
          const img = this.image('crisis_clock_0', item.x, item.y, 546); img.setOrigin(0.5, 0.5); entry.objs.push(img);
          const calm = [0, 0, 0, 1, 2, 3, 0, 0, 1, 0], bad = [0, 0, 1, 2, 3, 4, 4, 0, 5, 0];
          entry.anim = { setVisible: v => img.setVisible(v), update: (t, _dt, level) => { const seq = level >= 2 ? bad : calm; img.setFrame(`crisis_clock_${seq[Math.floor(t / 0.62) % seq.length]}`); } };
          break;
        }
        case 'flame': {
          const img = this.image(item.pose ?? 'crisis_flame_l', item.x, item.y - 60, item.y + 1); img.setOrigin(0.5, 0.5); entry.objs.push(img);
          let next = rnd() * 1.2, pose = 0;
          entry.anim = { setVisible: v => img.setVisible(v), update: (t) => { if (item.mode !== 'stutter' || t < next) return; pose = (pose + 1) % 3; img.setFrame(['crisis_flame_l', 'crisis_flame_c', 'crisis_flame_r'][pose]!); next = t + 0.3 + rnd() * 1.4; } };
          break;
        }
        case 'banner': {
          const img = this.image(`crisis_banner_${item.phase ?? 0}`, item.x, item.y, item.y); entry.objs.push(img);
          const seq = [0, 1, 2, 3, 0, 1, 2, 3, 1, 2, 2, 2, 0];   // putaran tersendat: tertahan di pose 2 lalu melompat ke pose 0
          const off = Math.floor(rnd() * seq.length);
          entry.anim = { setVisible: v => img.setVisible(v), update: (t) => img.setFrame(`crisis_banner_${seq[(Math.floor(t / 0.2) + off) % seq.length]}`) };
          break;
        }
        case 'float': {
          const stone = this.image(f, item.x, item.y - (item.lift ?? 24), item.y); stone.setOrigin(0.5, 0.5);
          const shadow = this.image(item.s ?? 'crisis_fshadow_s', item.x, item.y, -880); shadow.setOrigin(0.5, 0.5);
          entry.objs.push(stone, shadow);
          let next = rnd() * 2, off = 0;
          // membeku pada langkah kuantisasi: bergeser 1 px secara tersendat, tidak halus
          entry.anim = { setVisible: v => { stone.setVisible(v); shadow.setVisible(v); }, update: (t) => { if (t < next) return; off = off === 0 ? (rnd() < 0.5 ? -1 : 1) : 0; stone.setY(item.y - (item.lift ?? 24) + off); next = t + 0.8 + rnd() * 1.8; } };
          break;
        }
        case 'basket': {
          const basket = this.image('crisis_basket', item.x, item.y, item.y + 34); basket.setOrigin(0.5, 0.5);
          const shadow = this.image('crisis_fshadow_m', item.x, item.y + 34, -880); shadow.setOrigin(0.5, 0.5);
          const apples = [[-8, -16], [4, -24], [12, -12]].map(([dx, dy]) => this.image('crisis_apple', item.x + dx!, item.y + dy!, item.y + 36).setOrigin(0.5, 0.5));
          entry.objs.push(basket, shadow, ...apples);
          entry.anim = { setVisible: v => entry.objs.forEach(o => o.setVisible(v)), update: (t) => apples.forEach((a, i) => a.setY(item.y + [-16, -24, -12][i]! + (((Math.floor(t / 0.9) + i) % 4) === 0 ? 3 : 0))) };
          break;
        }
      }
      this.props.push(entry);
    }
  }

  // ------------------------------------------------------------------------------------------------ AreaView3

  apply(flags: Readonly<Record<string, boolean>>): void {
    const stage = crisisStage(flags);
    if (this.firstApply) {
      this.base.apply({ ...flags });
      this.base.setResidentsVisible(false);
      const lioraExit = this.interactables.find(i => i.id === 'liora_exit'); if (lioraExit) lioraExit.enabled = false;
    }
    this.stage = stage === 'pre' ? 'start' : stage;
    const level = crisisLevel(this.stage);
    for (const p of this.props) {
      const vis = itemVisible(p.item, this.stage);
      p.objs.forEach(o => o.setVisible(vis));
      p.anim?.setVisible(vis);
      if (p.item.sol) { const s = p.item.sol; this.loaded.collision.setDynamic(`crisisprop:${p.item.f ?? p.item.kind}:${p.item.x}`, vis ? { x: p.item.x + s[0], y: p.item.y + s[1], w: s[2], h: s[3] } : null); }
    }
    void level;
    // gerbang terkunci sampai evakuasi diperintahkan
    const wantLocked = !atLeast(this.stage, 'evacOrdered');
    if (this.firstApply || wantLocked !== this.gateLocked) { this.gateLocked = wantLocked; this.base.setGate(!wantLocked); this.base.gateImage.setY(this.gateBaseY()); this.base.gateImage.setAlpha(1); }
    const gg = atLeast(this.stage, 'evacOrdered'); this.gateGuard?.sprite.setVisible(gg); this.gateGuard?.shadow.setVisible(gg);
    this.applyNamed(this.firstApply);
    this.applyWalkMode(walkersMode(this.stage), this.firstApply);
    this.applyTorvan(this.firstApply);
    this.syncInteractables();
    this.firstApply = false;
  }

  private gateBaseY(): number { return 1172; }

  update(player: { x: number; y: number }, moving: boolean, delta: number, sprinting: boolean): void {
    if (this.destroyed) return;
    const facing = (player as { facing?: Facing }).facing ?? this.player.facing;
    this.player = { x: player.x, y: player.y, moving, sprinting, facing };
    const dt = Math.min(delta, 100) / 1000;
    const frozen = this.scene.time.now < this.frozenUntil;
    if (!frozen) {
      this.t += dt;
      const level = crisisLevel(this.stage);
      for (const p of this.props) if (p.anim && p.objs[0]?.visible) p.anim.update(this.t, dt, level);
      this.tickBell();
      this.tickWalkers(dt);
      this.tickTorvan(dt);
    }
    this.tickMoves(dt, frozen);
    this.tickFollower(dt);
    this.relocate();
    if (this.gateLocked && player.y >= 1170) { // pemain sudah di luar gerbang (mis. posisi lama): jangan pernah mengurung
      this.gateLocked = false; this.base.setGate(true);
    }
    this.syncInteractables();
  }

  // ------------------------------------------------------------------------------------------------ keadaan statis dari flag

  private spotOf(id: 'velthia' | 'azie' | 'talric'): CrisisSpot | 'follow' { return crisisNpcSpots(this.stage)[id]; }

  private applyNamed(snap: boolean): void {
    for (const id of ['velthia', 'azie', 'talric'] as const) {
      const spot = this.spotOf(id);
      this.named[id].desired = spot;
      const a = this.base.actor(id); if (!a) continue;
      if (spot === 'follow') { // Velthia ikut pemain sejak keputusan
        if (!this.follow.active) { this.follow = { x: a.x, y: a.y, active: true, snap: snap }; this.loaded.collision.setDynamic('cityNpc:velthia', null); }
        continue;
      }
      if (id === 'velthia' && this.follow.active) this.follow.active = false;
      if (snap) this.placeNamed(id, spot);
    }
    if (this.firstApply) this.firstApplyBodies();
  }
  private firstApplyBodies(): void {
    const t = crisisNpcSpots(this.stage).torvan;
    const b = this.bodies.get('torvan'); if (b && t) this.placeBody(b, t.x, t.y, t.facing);
  }

  private placeNamed(id: 'velthia' | 'azie' | 'talric', spot: CrisisSpot): void {
    this.moves.delete(id);
    this.base.place(id, spot.x, spot.y, spot.facing);
    const a = this.base.actor(id)!; this.syncNamedInteract(id, a);
  }

  /** NPC bernama berpindah ke posisi tahap baru HANYA saat tidak terlihat (tanpa teleport di depan pemain). */
  private relocate(): void {
    for (const id of ['velthia', 'azie', 'talric'] as const) {
      const want = this.named[id].desired; if (want === 'follow' || this.moves.has(id)) continue;
      const a = this.base.actor(id); if (!a) continue;
      if (Math.abs(a.x - want.x) < 1 && Math.abs(a.y - want.y) < 1) continue;
      if (!this.inView(a.x, a.y) && !this.inView(want.x, want.y)) this.placeNamed(id, want);
    }
    const tb = this.bodies.get('torvan'); const ts = crisisNpcSpots(this.stage).torvan;
    if (tb && ts && this.torvanState.mode === 'camp' && (Math.abs(tb.x - ts.x) > 1 || Math.abs(tb.y - ts.y) > 1) && !this.inView(tb.x, tb.y) && !this.inView(ts.x, ts.y)) this.placeBody(tb, ts.x, ts.y, ts.facing);
  }
  private inView(x: number, y: number): boolean { return Math.abs(x - this.player.x) < 520 && Math.abs(y - this.player.y) < 320; }

  private applyTorvan(snap: boolean): void {
    const b = this.bodies.get('torvan'); if (!b) return;
    const ts = crisisNpcSpots(this.stage).torvan;
    if (ts) {
      this.torvanState = { mode: 'camp', phase: 0, t: 0 };
      this.torvanCrate?.setVisible(false);
      if (snap || !this.inView(b.x, b.y)) this.placeBody(b, ts.x, ts.y, ts.facing);
    } else if (snap) {
      this.torvanState = { mode: 'loop', phase: 0, t: this.rnd() * 2 };
      this.placeBody(b, TORVAN_LOOP[0]![0], TORVAN_LOOP[0]![1], 'right');
    }
    const it = this.interactables.find(i => i.id === ID_TORVAN); if (it) it.enabled = true;
  }

  private applyWalkMode(mode: 'work' | 'stream' | 'done', snap: boolean): void {
    if (!this.has) { this.walkMode = mode; return; }
    if (mode === this.walkMode && !snap) return;
    if (mode === 'work') {
      for (const w of this.walkers) { const s = walkerStart(w.def); w.status = 'work'; w.idx = 1; this.setWalker(w, s.x, s.y, w.def.facing, 'idle'); w.sprite.setVisible(true); w.shadow.setVisible(true); }
    } else if (mode === 'stream') {
      if (this.walkMode !== 'stream' || snap) {
        const fromWork = this.walkMode === 'work' && !snap; // tanpa lompatan: warga mulai dari tempat mereka berdiri
        this.streamClock = 0; this.hurry = 1;
        for (const w of this.walkers) { const s = walkerStart(w.def); w.status = 'wait'; w.idx = 1; if (!fromWork) this.setWalker(w, s.x, s.y, w.def.facing, 'idle'); w.sprite.setVisible(true); w.shadow.setVisible(true); }
      }
    } else this.finalizeWalkers();
    this.walkMode = mode;
  }

  private finalizeWalkers(): void {
    for (const w of this.walkers) {
      const f = walkerFinal(w.def, 'evacDone');
      if (f.visible) { w.status = 'gathered'; this.setWalker(w, f.x, f.y, f.facing ?? w.facing, 'idle'); w.sprite.setVisible(true); w.shadow.setVisible(true); }
      else { w.status = 'gone'; w.sprite.setVisible(false); w.shadow.setVisible(false); }
    }
  }

  // ------------------------------------------------------------------------------------------------ tubuh bernama + Torvan

  private placeBody(b: Body, x: number, y: number, facing: Facing): void {
    Object.assign(b, { x, y, facing, moving: false });
    b.sprite.setPosition(x, y).setDepth(y); b.shadow.setPosition(x, y - 1).setDepth(y - 1);
    playState(b.sprite, b.tag, 'idle', facing, true);
    if (b.collide) this.loaded.collision.setDynamic(`cityNpc:${b.id}`, footBox(x, y));
  }
  private stepBody(b: Body, x: number, y: number, facing: Facing, state: 'walk' | 'sprint' | 'idle'): void {
    if (!b.moving && state !== 'idle') { b.moving = true; if (b.collide) this.loaded.collision.setDynamic(`cityNpc:${b.id}`, null); }
    Object.assign(b, { x, y, facing });
    b.sprite.setPosition(Math.round(x), Math.round(y)).setDepth(Math.round(y)); b.shadow.setPosition(Math.round(x), Math.round(y) - 1).setDepth(Math.round(y) - 1);
    playState(b.sprite, b.tag, state, facing, state === 'idle');
  }
  private namedBody(id: string): Body | undefined {
    const a: Actor | undefined = this.base.actor(id); if (!a) return this.bodies.get(id);
    return { id, x: a.x, y: a.y, facing: a.facing, sprite: a.sprite, shadow: a.shadow, tag: a.sprite.getData('tag') as string, moving: false, collide: true };
  }

  private tickTorvan(dt: number): void {
    const b = this.bodies.get('torvan'); if (!b || this.moves.has('torvan')) return;
    const s = this.torvanState;
    if (s.mode === 'camp') { this.torvanCrate?.setVisible(false); return; }
    const A = TORVAN_LOOP[0]!, B = TORVAN_LOOP[1]!;
    const speed = this.walkMode === 'stream' ? 58 : 44;
    s.t -= dt;
    if (s.phase === 0 || s.phase === 2) { // jeda di ujung: memuat / menurunkan peti
      this.stepBody(b, b.x, b.y, s.phase === 0 ? 'right' : 'left', 'idle');
      this.torvanCrate?.setVisible(false);
      if (s.t <= 0) { s.phase = (s.phase + 1) as 1 | 3; }
      return;
    }
    const target = s.phase === 1 ? B : A;
    const d = Math.hypot(target[0] - b.x, target[1] - b.y);
    if (d < 1.5) { s.phase = s.phase === 1 ? 2 : 0; s.t = 2.2 + this.rnd() * 1.6; return; }
    const step = Math.min(d, speed * dt);
    const nx = b.x + ((target[0] - b.x) / d) * step, ny = b.y + ((target[1] - b.y) / d) * step;
    const facing: Facing = Math.abs(target[0] - b.x) > Math.abs(target[1] - b.y) ? (target[0] > b.x ? 'right' : 'left') : (target[1] > b.y ? 'down' : 'up');
    this.stepBody(b, nx, ny, facing, 'walk');
    if (s.phase === 1 && this.torvanCrate) { // membawa peti: di depan badan (di belakang bila menghadap ke atas)
      this.torvanCrate.setVisible(true).setPosition(Math.round(nx + (facing === 'left' ? -3 : facing === 'right' ? 3 : 0)), Math.round(ny - 18)).setDepth(facing === 'up' ? Math.round(ny) - 1 : Math.round(ny) + 1);
    } else this.torvanCrate?.setVisible(false);
  }

  private tickFollower(dt: number): void {
    if (!this.follow.active) return;
    const a = this.base.actor('velthia'); if (!a) return;
    const p = this.player;
    const off = p.facing === 'right' ? -26 : p.facing === 'left' ? 26 : 0, ahead = p.facing === 'up' ? 26 : p.facing === 'down' ? -26 : 0;
    if (this.follow.snap) { this.follow.x = p.x + off; this.follow.y = p.y + ahead; this.follow.snap = false; } // muat/Continue: langsung di sisi pemain
    const k = Math.min(1, (dt * 1000) / 130);
    const px = this.follow.x, py = this.follow.y;
    this.follow.x += (p.x + off - this.follow.x) * k; this.follow.y += (p.y + ahead - this.follow.y) * k;
    const walking = Math.hypot(this.follow.x - px, this.follow.y - py) > 0.15 || p.moving;
    a.x = Math.round(this.follow.x); a.y = Math.round(this.follow.y);
    a.sprite.setPosition(a.x, a.y).setDepth(a.y); a.shadow.setPosition(a.x, a.y - 1).setDepth(a.y - 1);
    playState(a.sprite, a.sprite.getData('tag') as string, walking ? (p.sprinting ? 'sprint' : 'walk') : 'idle', p.facing, !walking);
    a.facing = p.facing;
  }

  // ------------------------------------------------------------------------------------------------ warga

  private playWalker(w: Walker, state: 'idle' | 'walk', facing: Facing): void {
    const dir: Dir3 = facing === 'left' || facing === 'right' ? 'side' : facing;
    const key = `cit_${w.def.variant}_${state}_${dir}`;
    w.sprite.setFlipX(facing === 'left');
    if (w.anim !== key) { w.anim = key; if (this.scene.anims.exists(key)) w.sprite.anims.play(key, true); }
    w.facing = facing;
  }
  private setWalker(w: Walker, x: number, y: number, facing: Facing, state: 'idle' | 'walk'): void {
    w.x = x; w.y = y;
    w.sprite.setPosition(Math.round(x), Math.round(y)).setDepth(Math.round(y)); w.shadow.setPosition(Math.round(x), Math.round(y) - 1).setDepth(Math.round(y) - 1);
    this.playWalker(w, state, facing);
  }

  private tickWalkers(dt: number): void {
    if (!this.has) return;
    if (this.walkMode === 'stream') this.streamClock += dt * this.hurry;
    for (const w of this.walkers) {
      if (w.status === 'gone') continue;
      if (w.status === 'gathered') { if (w.def.role === 'look' || w.def.role === 'watch') this.lookAround(w, dt, w.def.role === 'look' ? 4 : 99); continue; }
      if (this.walkMode === 'work') { this.work(w, dt); continue; }
      if (w.status === 'wait') {
        this.lookAround(w, dt, 3.2);
        if (this.streamClock >= w.def.delay) { w.status = 'walk'; w.idx = 1; }
        continue;
      }
      if (w.status === 'walk') this.advance(w, dt);
    }
  }

  private lookAround(w: Walker, dt: number, every: number): void {
    w.lookT -= dt;
    if (w.lookT > 0) return;
    w.lookT = every * (0.7 + this.rnd() * 0.8);
    const dirs: Facing[] = ['down', 'left', 'right', 'up'];
    this.playWalker(w, 'idle', dirs[Math.floor(this.rnd() * dirs.length)]!);
  }

  /** Warga mengulang pekerjaan: lintasan pendek lalu melompat kembali ke awal (putaran waktu yang rusak). */
  private work(w: Walker, dt: number): void {
    const s = walkerStart(w.def);
    if (w.def.role === 'work-sweep') {
      w.workT += dt; const ph = (w.workT % 4.2) / 4.2;
      this.setWalker(w, s.x + Math.round(ph * 26), s.y, 'right', 'walk');
    } else if (w.def.role === 'work-carry') {
      w.workT += dt; const ph = (w.workT % 3.4) / 3.4;
      this.setWalker(w, s.x, s.y - Math.round(ph * 26), 'up', 'walk');
    } else if (w.def.role === 'work-sort') {
      this.playWalker(w, 'idle', 'up');
    } else if (w.def.role === 'look') this.lookAround(w, dt, 3.5);
    else if (w.def.role === 'audience') this.playWalker(w, 'idle', w.def.facing);
    else this.playWalker(w, 'idle', w.def.facing);
  }

  private advance(w: Walker, dt: number): void {
    const route = w.def.route;
    const target = route[w.idx];
    if (!target) { this.finishWalker(w); return; }
    const dx = target[0] - w.x, dy = target[1] - w.y, d = Math.hypot(dx, dy);
    if (d < 1) { w.idx++; if (w.idx >= route.length) this.finishWalker(w); return; }
    const step = Math.min(d, w.def.speed * this.hurry * dt);
    const nx = w.x + (dx / d) * step, ny = w.y + (dy / d) * step;
    // memberi jalan: bila pemain tepat di depan, berhenti sebentar (maks 0,8 dtk, lalu jeda tenggang 1,2 dtk agar tidak macet)
    const near = Math.hypot(this.player.x - nx, this.player.y - ny) < 14 && Math.hypot(this.player.x - nx, this.player.y - ny) < Math.hypot(this.player.x - w.x, this.player.y - w.y);
    if (w.yieldT === 0 && near) w.yieldT = 0.8;
    if (w.yieldT > 0) { w.yieldT -= dt; this.playWalker(w, 'idle', w.facing); if (w.yieldT <= 0) w.yieldT = -1.2; return; }
    if (w.yieldT < 0) w.yieldT = Math.min(0, w.yieldT + dt);
    const facing: Facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    this.setWalker(w, nx, ny, facing, 'walk');
  }

  private finishWalker(w: Walker): void {
    if (w.def.end === 'exit') { w.status = 'gone'; w.sprite.setVisible(false); w.shadow.setVisible(false); return; }
    const g = GATHER[w.def.id]!;
    w.status = 'gathered'; this.setWalker(w, g.x, g.y, g.facing, 'idle');
  }

  // ------------------------------------------------------------------------------------------------ interaksi mengikuti sprite

  private syncNamedInteract(id: string, a: { x: number; y: number }): void {
    const it = this.interactables.find(i => i.id === id); if (!it) return;
    Object.assign(it, { x: a.x - 24, y: a.y - 10, w: 48, h: 34 });
  }

  private syncInteractables(): void {
    const mode = this.walkMode;
    for (const id of ['velthia', 'azie', 'talric'] as const) {
      const a = this.base.actor(id); if (!a) continue;
      const it = this.interactables.find(i => i.id === id); if (!it) continue;
      this.syncNamedInteract(id, a);
      it.enabled = !(id === 'velthia' && this.follow.active) && !this.moves.has(id);
    }
    const tb = this.bodies.get('torvan'), tit = this.interactables.find(i => i.id === ID_TORVAN);
    if (tb && tit) { Object.assign(tit, { x: tb.x - 20, y: tb.y - 18, w: 40, h: 28 }); tit.enabled = !this.moves.has('torvan'); }
    for (const w of this.walkers) {
      const key = w.def.interact; if (!key) continue;
      const it = this.interactables.find(i => i.id === key); if (!it) continue;
      Object.assign(it, { x: w.x - 14, y: w.y - 18, w: 28, h: 30 });
      it.enabled = w.status !== 'gone' && (mode === 'work' || (mode === 'done' && w.def.id === 'guard'));
    }
    void stageIndex;
  }

  // ------------------------------------------------------------------------------------------------ gerak skrip

  private tickMoves(dt: number, frozen: boolean): void {
    if (frozen) return;
    for (const [id, m] of [...this.moves]) {
      const b = this.namedBody(id); if (!b) { this.moves.delete(id); m.done(); continue; }
      const target = m.path[m.i];
      if (!target) { this.finishMove(id, m); continue; }
      const dx = target[0] - b.x, dy = target[1] - b.y, d = Math.hypot(dx, dy);
      if (d < 1) { m.i++; if (m.i >= m.path.length) this.finishMove(id, m); continue; }
      const step = Math.min(d, m.speed * dt);
      const facing: Facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      const own = this.base.actor(id);
      if (own) { // NPC bernama milik AveloriaView
        if (this.loaded.collision.hasDynamic(`cityNpc:${id}`)) this.loaded.collision.setDynamic(`cityNpc:${id}`, null);
        own.x = b.x + (dx / d) * step; own.y = b.y + (dy / d) * step; own.facing = facing;
        own.sprite.setPosition(Math.round(own.x), Math.round(own.y)).setDepth(Math.round(own.y)); own.shadow.setPosition(Math.round(own.x), Math.round(own.y) - 1).setDepth(Math.round(own.y) - 1);
        playState(own.sprite, own.sprite.getData('tag') as string, 'walk', facing);
      } else this.stepBody(b, b.x + (dx / d) * step, b.y + (dy / d) * step, facing, 'walk');
    }
  }
  private finishMove(id: string, m: ScriptedMove): void {
    this.moves.delete(id);
    const last = m.path[m.path.length - 1]!;
    const own = this.base.actor(id);
    if (own) {
      const want = (this.named as Record<string, { desired: CrisisSpot | 'follow' }>)[id]?.desired;
      this.base.place(id, last[0], last[1], want && want !== 'follow' ? want.facing : own.facing); this.syncNamedInteract(id, own);
    }
    else { const b = this.bodies.get(id); if (b) this.placeBody(b, last[0], last[1], b.facing); }
    m.done();
  }
  private walkPath(id: string, path: readonly (readonly [number, number])[], speed: number): Promise<void> {
    if (this.destroyed) return Promise.resolve();
    return new Promise<void>(resolve => {
      const done = (): void => { this.pending.delete(done); resolve(); };
      this.pending.add(done);
      this.moves.set(id, { path, i: 1, speed, done });
    });
  }

  // ------------------------------------------------------------------------------------------------ koreografi

  handleAction(op: string, arg?: string | number): Promise<void> {
    if (this.destroyed) return Promise.resolve();
    const limit = OP_TIMEOUT[op] ?? 6000;
    return new Promise<void>(resolve => {
      let finished = false;
      const finish = (): void => { if (finished) return; finished = true; this.pending.delete(finish); clearTimeout(timer); this.timers.delete(timer); resolve(); };
      const timer = setTimeout(() => { this.forceFinish(op); finish(); }, limit);
      this.timers.add(timer); this.pending.add(finish);
      this.runOp(op, arg).then(finish, finish);
    });
  }

  private async runOp(op: string, arg?: string | number): Promise<void> {
    switch (op) {
      case 'crisisOpen': {
        this.hitch(600);
        await this.focus(700, 800, 800); await this.wait(700);
        await this.focus(824, 480, 700); this.hitch(500); await this.wait(1100);
        await this.release(700);
        break;
      }
      case 'audienceGather': {
        const velthia = this.base.actor('velthia'), azie = this.base.actor('azie');
        if (!azie || !velthia) break;
        const to: [number, number] = [velthia.x + 44, velthia.y + 28];
        this.named.azie.desired = { x: to[0], y: to[1], facing: 'left' };
        await this.walkPath('azie', [[azie.x, azie.y], [to[0], to[1]]], 70);
        this.base.place('azie', to[0], to[1], 'left'); this.syncNamedInteract('azie', this.base.actor('azie')!);
        for (const w of this.walkers) if (w.def.role === 'audience') this.playWalker(w, 'idle', w.def.id === 'noble_a' ? 'right' : 'left');
        await this.wait(400);
        break;
      }
      case 'evacStart': {
        this.applyWalkMode('stream', false);
        const gate = this.openGate();
        const v = this.base.actor('velthia'), a = this.base.actor('azie'), tal = this.base.actor('talric');
        this.named.velthia.desired = crisisNpcSpots('evacOrdered').velthia; this.named.azie.desired = crisisNpcSpots('evacOrdered').azie; this.named.talric.desired = crisisNpcSpots('evacOrdered').talric;
        const jobs: Promise<void>[] = [gate];
        if (v) jobs.push(this.walkPath('velthia', [[v.x, v.y], ...SCRIPT_PATHS.velthiaToCouncil.slice(1)], 96));
        if (a) jobs.push(this.walkPath('azie', [[a.x, a.y], ...SCRIPT_PATHS.azieToCouncil.slice(1)], 90));
        if (tal) void this.walkPath('talric', [[tal.x, tal.y], ...SCRIPT_PATHS.talricToGate.slice(1)], 120); // Talric terus berjalan; tidak ditunggu
        await Promise.all(jobs);
        break;
      }
      case 'evacFinish': {
        this.hurry = 2.6;
        const t0 = this.scene.time.now;
        while (this.walkMode === 'stream' && this.walkers.some(w => w.status === 'wait' || w.status === 'walk') && this.scene.time.now - t0 < 9500 && !this.destroyed) await this.wait(120);
        this.hurry = 1;
        this.applyWalkMode('done', true);
        break;
      }
      case 'torvanFace': {
        const b = this.bodies.get('torvan'); if (!b) break;
        const dx = this.player.x - b.x, dy = this.player.y - b.y;
        const facing: Facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        this.placeBody(b, b.x, b.y, facing);
        await this.wait(200);
        break;
      }
      case 'focus': await this.focus(...this.focusPoint(String(arg ?? 'plaza')), 700); break;
      case 'release': await this.release(700); break;
      case 'hitch': this.hitch(typeof arg === 'number' ? arg : 600); await this.wait(typeof arg === 'number' ? arg : 600); break;
      default: break; // op tidak dikenal: lewati (tidak pernah menahan cerita)
    }
  }

  /** Dipanggil saat batas waktu op habis atau scene berhenti: letakkan semua yang sedang bergerak pada keadaan akhirnya. */
  private forceFinish(op: string): void {
    for (const [id, m] of [...this.moves]) this.finishMove(id, m);
    if (op === 'evacStart') { this.hurry = 1; this.finishGate(); }
    if (op === 'evacFinish') { this.hurry = 1; this.applyWalkMode('done', true); }
    if (op === 'crisisOpen' || op === 'focus') void this.release(1);
    this.frozenUntil = 0;
  }

  private openGate(): Promise<void> {
    if (this.destroyed) return Promise.resolve();
    return new Promise<void>(resolve => {
      const img = this.base.gateImage;
      const done = (): void => { this.pending.delete(done); this.finishGate(); resolve(); };
      this.pending.add(done);
      this.scene.tweens.add({ targets: img, y: this.gateBaseY() - 44, alpha: 0.2, duration: 900, ease: 'Sine.easeIn', onComplete: done });
    });
  }
  private finishGate(): void { this.gateLocked = false; this.base.setGate(true); this.base.gateImage.setY(this.gateBaseY()).setAlpha(1); }

  private hitch(ms: number): void {
    if (this.destroyed) return;
    this.frozenUntil = this.scene.time.now + ms;
    const pause = [...this.walkers.map(w => w.sprite), ...[...this.bodies.values()].map(b => b.sprite)];
    for (const s of pause) s.anims.pause();
    const t = setTimeout(() => { this.timers.delete(t); if (!this.destroyed) for (const s of pause) s.anims.resume(); }, ms);
    this.timers.add(t);
  }

  private wait(ms: number): Promise<void> {
    if (this.destroyed) return Promise.resolve();
    return new Promise<void>(resolve => {
      const done = (): void => { this.pending.delete(done); this.timers.delete(t); resolve(); };
      const t = setTimeout(done, ms);
      this.timers.add(t); this.pending.add(done);
    });
  }

  private focusPoint(name: string): [number, number] {
    switch (name) {
      case 'tower': return [824, 470];
      case 'gate': return [640, 1120];
      case 'council': return [640, 260];
      case 'court': return [640, 560];
      default: return [700, 800];
    }
  }
  private focus(x: number, y: number, ms: number): Promise<void> {
    if (this.destroyed) return Promise.resolve();
    const cam = this.scene.cameras.main as Phaser.Cameras.Scene2D.Camera & { _follow?: Phaser.GameObjects.GameObject | null };
    if (!this.camDetached) { this.camTarget = cam._follow ?? null; cam.stopFollow(); this.camDetached = true; }
    return new Promise<void>(resolve => {
      const done = (): void => { this.pending.delete(done); resolve(); };
      this.pending.add(done);
      cam.once('camerapancomplete', done);
      cam.pan(x, y, ms, 'Sine.easeInOut', true);
    });
  }
  private async release(ms: number): Promise<void> {
    if (!this.camDetached) return;
    const cam = this.scene.cameras.main;
    const target = this.camTarget;
    await this.focus(this.player.x, this.player.y - 24, ms);
    if (target && (target as { active?: boolean }).active !== false) cam.startFollow(target, true, 0.14, 0.14);
    this.camDetached = false; this.camTarget = null;
  }

  // ------------------------------------------------------------------------------------------------ lonceng, debug, bersih-bersih

  private tickBell(): void {
    if (this.t < this.bellNext) return;
    this.bellNext = this.t + 1.8 + this.rnd() * 3.4;   // berdentang pada waktu yang salah, tanpa pola
    const bell = this.base.bellImage;
    if (!this.scene.tweens.isTweening(bell)) this.scene.tweens.add({ targets: bell, angle: { from: -14, to: 14 }, duration: 170, yoyo: true, repeat: 1, onComplete: () => bell.setAngle(0) });
  }

  /** Untuk tes/E2E: gambaran keadaan visual. */
  debug(): unknown {
    const visibleWalkers = this.walkers.filter(w => w.status !== 'gone' && w.sprite.visible);
    return {
      area: 'aveloria_crisis', stage: this.stage, level: crisisLevel(this.stage), walkMode: this.walkMode, gateLocked: this.gateLocked,
      streamClock: Math.round(this.streamClock * 10) / 10, hurry: this.hurry, atlas: this.has, gateGuard: !!this.gateGuard?.sprite.visible,
      walkers: this.walkers.map(w => ({ id: w.def.id, status: w.status, x: Math.round(w.x), y: Math.round(w.y), visible: w.sprite.visible, anim: w.anim })),
      visibleWalkers: visibleWalkers.length, walkerCap: MAX_EVAC_WALKERS,
      props: this.props.filter(p => p.objs[0]?.visible).length, propsTotal: this.props.length,
      torvan: (() => { const b = this.bodies.get('torvan'); return b ? { x: Math.round(b.x), y: Math.round(b.y), mode: this.torvanState.mode, phase: this.torvanState.phase } : null; })(),
      velthiaFollowing: this.follow.active, scripted: [...this.moves.keys()], cameraDetached: this.camDetached, pendingOps: this.pending.size,
      named: Object.fromEntries((['velthia', 'azie', 'talric'] as const).map(id => { const a = this.base.actor(id); return [id, a ? { x: Math.round(a.x), y: Math.round(a.y) } : null]; })),
      base: this.base.debug(),
    };
  }

  react(speaker: string, line: string): void { this.base.react(speaker, line); }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    for (const done of [...this.pending]) { try { done(); } catch { /* batal */ } }
    this.pending.clear(); this.moves.clear();
    if (this.camDetached) {
      const cam = this.scene.cameras?.main; const target = this.camTarget;
      try { if (cam && target && (target as { active?: boolean }).active !== false) cam.startFollow(target, true, 0.14, 0.14); } catch { /* scene sudah berhenti */ }
      this.camDetached = false;
    }
  }
}
void ({} as Rect);
