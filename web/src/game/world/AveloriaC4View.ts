import Phaser from 'phaser';
import { footBox, type Facing } from './Collision';
import { AveloriaView } from './AveloriaView';
import type { AreaView3 } from './AreaView3';
import type { LoadedMap } from './forest1';
import type { Interactable } from './Interaction';
import { npcInteractRect } from './aveloriaC4';
import {
  C4_ATLAS, C4_AVE_ATLAS, C4_CRISIS_ATLAS, C4_FOCUS, C4_GATE_GUARD, C4_HIDE_AVE, C4_ITEMS, C4_NAMED, C4_OBJECTS, C4_RESIDENTS,
  type C4Item,
} from '../data/maps/town.c4.mjs';
import { C4 } from '../story/chapter4Flags';

/**
 * Aveloria SESUDAH menara tua runtuh (Chapter IV, C4-07). Membungkus AveloriaView (Bab I-III tidak berubah) dan menambah:
 *  - menara/lonceng/portcullis/dua pohon yang menutupi pemandangan disembunyikan; diganti reruntuhan, lonceng retak, pagar darurat,
 *    tanda "TUTUP", debu yang naik pelan, bekas retakan yang tenang (tanpa efek krisis Bab III), batu yang sudah kembali ke tanah;
 *  - kota tua kosong dan dijaga (penjaga gerbang, satu penjaga di pagar); warga berkumpul di luar gerbang selatan: tenda, tikar, api
 *    masak, meja daftar Azie, papan daftar warga; Talric, Azie, Velthia dan Derrria berdiri di titik adegan (collision = footprint);
 *  - senja yang pelan sesudah adegan kembali (`apply`: `returnSeen`).
 * Visual turunan flag lewat `apply(flags)`; `handleAction(op, arg)` hanya koreografi kamera (selalu selesai, ada batas waktu).
 *
 * Ops `handleAction(op, arg)` (dari `{type:'c4', op, arg}`):
 *   returnOpen     kamera menyapu: reruntuhan menara -> penampungan, lalu kembali ke pemain (~7 dtk; batas 14 dtk)
 *   focus <arg>    kamera ke 'ruin'|'camp'|'gate'; `release` mengembalikan kamera ke pemain
 *   release        kamera kembali mengikuti pemain
 *   lainnya        diabaikan (tidak pernah menahan cerita)
 */

const FOOT_ORIGIN_Y = 47 / 48;
const OP_TIMEOUT: Record<string, number> = { returnOpen: 14000, focus: 4000, release: 4000 };
const DUSK_ALPHA = { arrived: 0, seen: 0.16, complete: 0.2 } as const;
type Dir3 = 'down' | 'side' | 'up';
type Meta = { frames: Record<string, { pivot: { x: number; y: number } }> };

interface Res { id: string; variant: string; sprite: Phaser.GameObjects.Sprite; shadow: Phaser.GameObjects.Ellipse; x: number; y: number; facing: Facing; baseFacing: Facing; lookT: number; anim: string; interactive: boolean }
interface Anim { update(t: number): void; img: Phaser.GameObjects.Image; frames: string[]; period: number; offset: number }

function lcg(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a / 4294967296; };
}

export class AveloriaC4View implements AreaView3 {
  readonly base: AveloriaView;
  private readonly scene: Phaser.Scene;
  private readonly loaded: LoadedMap;
  private readonly interactables: Interactable[];
  private readonly meta = new Map<string, Meta | undefined>();
  private readonly images: Phaser.GameObjects.Image[] = [];
  private readonly anims: Anim[] = [];
  private readonly residents: Res[] = [];
  private readonly hidden: string[] = [];
  private missing = 0;
  private dusk?: Phaser.GameObjects.Rectangle;
  private duskStage: keyof typeof DUSK_ALPHA = 'arrived';
  private firstApply = true;
  private destroyed = false;
  private t = 0;
  private player = { x: 640, y: 1204 };
  private camDetached = false;
  private camTarget: Phaser.GameObjects.GameObject | null = null;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private readonly pending = new Set<() => void>();
  private opSeq = 0;
  private readonly rnd = lcg(404404);

  constructor(scene: Phaser.Scene, loaded: LoadedMap, interactables: Interactable[]) {
    this.scene = scene; this.loaded = loaded; this.interactables = interactables;
    this.base = new AveloriaView(scene, loaded, interactables);
    this.base.setResidentsVisible(false);
    for (const key of [C4_ATLAS, C4_CRISIS_ATLAS, C4_AVE_ATLAS]) this.meta.set(key, scene.cache.json.get(`${key}:meta`) as Meta | undefined);
    this.hideBaseImages();
    this.buildItems();
    this.buildResidents();
    this.ensureInteractables();
    this.dusk = scene.add.rectangle(0, 0, loaded.map.width, loaded.map.height, 0x25263d, 0).setOrigin(0).setDepth(9500);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  // ------------------------------------------------------------------------------------------------ konstruksi

  private atlasKey(it: C4Item): string { return it.atlas === 'crisis' ? C4_CRISIS_ATLAS : it.atlas === 'ave' ? C4_AVE_ATLAS : C4_ATLAS; }
  private pivotOf(key: string, frame: string): { x: number; y: number } { return this.meta.get(key)?.frames[frame]?.pivot ?? { x: 0.5, y: 1 }; }
  private has(key: string): boolean { return this.scene.textures.exists(key); }

  /** Menyembunyikan sprite dasar Aveloria (menara, lonceng, pohon yang menutupi) menurut nama frame dan posisi. Tanah baking tidak diubah. */
  private hideBaseImages(): void {
    const list = ((this.scene as unknown as { children?: { list?: unknown[] } }).children?.list ?? []) as { texture?: { key?: string }; frame?: { name?: string }; x: number; y: number; setVisible(v: boolean): unknown }[];
    for (const h of C4_HIDE_AVE) {
      for (const o of list) {
        if (o.texture?.key !== C4_AVE_ATLAS || o.frame?.name !== h.f || Math.abs(o.x - h.x) > 1 || Math.abs(o.y - h.y) > 1) continue;
        o.setVisible(false); this.hidden.push(`${h.f}@${h.x},${h.y}`);
      }
    }
    this.base.bellImage.setVisible(false);
  }

  private buildItems(): void {
    const scene = this.scene;
    for (const it of C4_ITEMS) {
      const key = this.atlasKey(it);
      if (!this.has(key)) { this.missing++; continue; }
      const p = this.pivotOf(key, it.f);
      const img = scene.add.image(it.x, it.y, key, it.f).setOrigin(p.x, p.y).setDepth(it.d ?? it.y);
      if (it.flip) img.setFlipX(true);
      this.images.push(img);
      if (it.anim === 'dust') this.anims.push({ img, frames: [0, 1, 2, 3].map(i => `c4_dust_${i}`), period: 0.7, offset: (it.seed ?? 0) * 0.37, update: () => undefined });
      if (it.anim === 'cookfire') this.anims.push({ img, frames: [0, 1, 2, 1].map(i => `c4_cookfire_${i}`), period: 0.22, offset: (it.seed ?? 0) * 0.13, update: () => undefined });
    }
  }

  private buildResidents(): void {
    const scene = this.scene;
    if (!this.has(C4_CRISIS_ATLAS)) { this.missing += C4_RESIDENTS.length + 1; return; }
    const all = [...C4_RESIDENTS.map(r => ({ ...r, interactive: true })), { id: 'c4_gate_guard', ...C4_GATE_GUARD, interactive: false }];
    for (const r of all) for (const dir of ['down', 'side', 'up'] as Dir3[]) {
      const idle = `cit_${r.variant}_idle_${dir}`;
      if (!scene.anims.exists(idle)) scene.anims.create({ key: idle, frames: [0, 1].map(i => ({ key: C4_CRISIS_ATLAS, frame: `${idle}_${i}` })), frameRate: 2, repeat: -1 });
    }
    for (const r of all) {
      const shadow = scene.add.ellipse(r.x, r.y - 1, 18, 6, 0x20272a, 0.35).setDepth(r.y - 1);
      const sprite = scene.add.sprite(r.x, r.y, C4_CRISIS_ATLAS, `cit_${r.variant}_idle_down_0`).setOrigin(0.5, FOOT_ORIGIN_Y).setDepth(r.y);
      const res: Res = { id: r.id, variant: r.variant, sprite, shadow, x: r.x, y: r.y, facing: r.facing, baseFacing: r.facing, lookT: 2 + this.rnd() * 5, anim: '', interactive: r.interactive };
      this.residents.push(res);
      this.face(res, r.facing);
      this.loaded.collision.setDynamic(`c4res:${r.id}`, footBox(r.x, r.y));
    }
  }

  private face(r: Res, facing: Facing): void {
    const dir: Dir3 = facing === 'left' || facing === 'right' ? 'side' : facing;
    const key = `cit_${r.variant}_idle_${dir}`;
    r.sprite.setFlipX(facing === 'left');
    if (r.anim !== key) { r.anim = key; if (this.scene.anims.exists(key)) r.sprite.anims.play(key, true); }
    r.facing = facing;
  }

  /** Pastikan setiap interactable C4 ada (peta dari loadAveloriaC4 sudah memuatnya; ini hanya pengaman untuk peta lain). */
  private ensureInteractables(): void {
    for (const o of C4_OBJECTS) if (!this.interactables.some(i => i.id === o.id)) this.interactables.push({ ...o });
    for (const r of C4_RESIDENTS) if (!this.interactables.some(i => i.id === r.id)) this.interactables.push({ id: r.id, kind: 'npc', verb: 'Bicara', ...npcInteractRect(r.x, r.y, false) });
  }

  // ------------------------------------------------------------------------------------------------ AreaView3

  apply(flags: Readonly<Record<string, boolean>>): void {
    if (this.firstApply) {
      this.base.apply({ ...flags });
      this.base.setResidentsVisible(false);
      this.base.setGate(true); // portcullis tetap terbuka (evakuasi sudah selesai); gerbang tidak mengurung siapa pun
      for (const id of Object.keys(C4_NAMED) as (keyof typeof C4_NAMED)[]) {
        const s = C4_NAMED[id];
        if (this.base.actor(id)) this.base.place(id, s.x, s.y, s.facing);
      }
    }
    // base.apply mengaktifkan kembali sebagian interaksi Bab I-II: matikan lagi (warga grafis lama, meja laporan, portal Liora, pintu istana)
    for (const id of ['liora_exit', 'reports', 'palace_door', 'porter', 'vendor', 'sweeper', 'guard']) { const it = this.interactables.find(i => i.id === id); if (it) it.enabled = false; }
    this.syncInteractables();
    const stage = flags[C4.complete] ? 'complete' : flags[C4.returnSeen] ? 'seen' : 'arrived';
    this.setDusk(stage, !this.firstApply);
    this.firstApply = false;
  }

  private setDusk(stage: keyof typeof DUSK_ALPHA, animate: boolean): void {
    if (!this.dusk) return;
    const to = DUSK_ALPHA[stage];
    if (!animate) { this.duskStage = stage; this.dusk.setAlpha(to); return; }
    if (stage === this.duskStage) return;
    this.duskStage = stage;
    this.scene.tweens.add({ targets: this.dusk, alpha: to, duration: 2400, ease: 'Sine.easeInOut' });
  }

  update(player: { x: number; y: number }, _moving: boolean, delta: number, _sprinting: boolean): void {
    if (this.destroyed) return;
    this.player = { x: player.x, y: player.y };
    const dt = Math.min(delta, 100) / 1000;
    this.t += dt;
    for (const a of this.anims) a.img.setFrame(a.frames[Math.floor(this.t / a.period + a.offset * 7) % a.frames.length]!);
    for (const r of this.residents) {
      r.lookT -= dt;
      if (r.lookT > 0 || r.id === 'c4_gate_guard' || r.id === 'c4_res_guard') continue;
      r.lookT = 3 + this.rnd() * 6;
      // menoleh pelan: kembali ke arah dasar atau ke arah pemain bila dekat
      const near = Math.hypot(this.player.x - r.x, this.player.y - r.y) < 110;
      if (near) { const dx = this.player.x - r.x, dy = this.player.y - r.y; this.face(r, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')); }
      else this.face(r, r.facing === r.baseFacing ? (r.baseFacing === 'down' ? 'left' : 'down') : r.baseFacing);
    }
    this.syncInteractables();
  }

  private syncInteractables(): void {
    for (const id of Object.keys(C4_NAMED) as (keyof typeof C4_NAMED)[]) {
      const a = this.base.actor(id); const it = this.interactables.find(i => i.id === id); if (!a || !it) continue;
      Object.assign(it, npcInteractRect(a.x, a.y, true)); it.enabled = true;
    }
    for (const r of this.residents) {
      if (!r.interactive) continue;
      const it = this.interactables.find(i => i.id === r.id); if (!it) continue;
      Object.assign(it, npcInteractRect(r.x, r.y, false)); it.enabled = true;
    }
    for (const o of C4_OBJECTS) { const it = this.interactables.find(i => i.id === o.id); if (it) it.enabled = true; }
  }

  // ------------------------------------------------------------------------------------------------ koreografi

  handleAction(op: string, arg?: string | number): Promise<void> {
    if (this.destroyed) return Promise.resolve();
    const limit = OP_TIMEOUT[op] ?? 6000;
    const token = ++this.opSeq;
    return new Promise<void>(resolve => {
      let finished = false;
      const finish = (): void => { if (finished) return; finished = true; this.pending.delete(finish); clearTimeout(timer); this.timers.delete(timer); resolve(); };
      const timer = setTimeout(() => { this.forceFinish(op); finish(); }, limit);
      this.timers.add(timer); this.pending.add(finish);
      this.runOp(op, arg, token).then(finish, finish);
    });
  }

  private async runOp(op: string, arg: string | number | undefined, token: number): Promise<void> {
    const live = (): boolean => !this.destroyed && token === this.opSeq;
    switch (op) {
      case 'returnOpen': {
        await this.focus(...this.focusPoint('ruin'), 1300); if (!live()) return;
        await this.wait(1500); if (!live()) return;
        await this.focus(...this.focusPoint('camp'), 1700); if (!live()) return;
        await this.wait(500); if (!live()) return;
        await this.release(800);
        break;
      }
      case 'focus': await this.focus(...this.focusPoint(String(arg ?? 'camp')), 900); break;
      case 'release': await this.release(800); break;
      default: break; // op tidak dikenal: lewati (tidak pernah menahan cerita)
    }
  }

  /** Batas waktu habis: batalkan langkah yang tersisa, lepaskan semua penantian, dan kembalikan kamera. */
  private forceFinish(op: string): void {
    this.opSeq++;
    if (op === 'returnOpen' || op === 'focus' || op === 'release') this.restoreCamera();
    for (const done of [...this.pending]) { try { done(); } catch { /* batal */ } }
    this.pending.clear();
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
    const p = (C4_FOCUS as Record<string, [number, number]>)[name] ?? C4_FOCUS.camp;
    return [p[0], p[1]];
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
    await this.focus(this.player.x, this.player.y - 24, ms);
    this.restoreCamera();
  }

  /** Kamera kembali mengikuti pemain seketika (batas waktu / destroy): tidak menunggu pan yang mungkin tak selesai. */
  private restoreCamera(): void {
    if (!this.camDetached) return;
    const cam = this.scene.cameras?.main; const target = this.camTarget;
    try { if (cam && target && (target as { active?: boolean }).active !== false) cam.startFollow(target, true, 0.14, 0.14); } catch { /* scene sudah berhenti */ }
    this.camDetached = false; this.camTarget = null;
  }

  // ------------------------------------------------------------------------------------------------ diagnosa, bersih-bersih

  /** Untuk tes/E2E: gambaran keadaan visual (lihat docs/production/sprint4/A4.md). */
  debug(): unknown {
    return {
      area: 'aveloria_c4', dusk: this.duskStage, duskAlpha: this.dusk?.alpha ?? 0, items: this.images.length, itemsTotal: C4_ITEMS.length, missingTextures: this.missing,
      hiddenBase: [...this.hidden], dustAnims: this.anims.filter(a => a.frames[0]!.startsWith('c4_dust')).length, fireAnims: this.anims.filter(a => a.frames[0]!.startsWith('c4_cookfire')).length,
      residents: this.residents.map(r => ({ id: r.id, x: r.x, y: r.y, facing: r.facing, visible: r.sprite.visible, interactive: r.interactive })),
      named: Object.fromEntries((Object.keys(C4_NAMED) as (keyof typeof C4_NAMED)[]).map(id => { const a = this.base.actor(id); return [id, a ? { x: Math.round(a.x), y: Math.round(a.y), facing: a.facing } : null]; })),
      interactables: this.interactables.filter(i => i.enabled !== false).map(i => i.id),
      cameraDetached: this.camDetached, pendingOps: this.pending.size, base: this.base.debug(),
    };
  }

  react(speaker: string, line: string): void { this.base.react(speaker, line); }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    for (const done of [...this.pending]) { try { done(); } catch { /* batal */ } }
    this.pending.clear();
    this.restoreCamera();
  }
}
