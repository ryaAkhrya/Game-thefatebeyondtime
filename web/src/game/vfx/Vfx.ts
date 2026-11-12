import type Phaser from 'phaser';
import { VFX_MAX_LIVE, VFX_SPECS, type AnimLayer, type BurstLayer, type LinkLayer, type TravelLayer, type VfxLayer, type VfxSpec } from './vfxSpecs';

/**
 * Sistem VFX pixel-art untuk panggung battle (kamera stage, depth < 20).
 *  - partikel = sprite diskret dari frame atlas (tanpa Graphics, tanpa tween berat, tanpa blur/bloom);
 *  - simulasi langkah tetap 33 ms (posisi dibulatkan ke piksel bulat -> gerak "on twos/threes" khas pixel art);
 *  - pool objek, batas global VFX_MAX_LIVE (64) sprite aktif; bila penuh, partikel baru dilewati (bukan menumpuk);
 *  - Reduced Flashes: efek `flashy` diganti varian tenang (frame redup, partikel setengah, tanpa pop putih).
 */
export interface VfxPlayOptions {
  /** cermin horizontal: true bila sumber berdiri di kanan dan menghadap kiri (Yaric). Seni default menghadap kanan. */
  flip?: boolean;
  /** skala BULAT (>=1); nilai lain dibulatkan */
  scale?: number;
  /** depth dasar; dijepit ke 0..19 agar tetap di kamera panggung */
  depth?: number;
  /** titik target (efek travel/link/layer at:'target'); bila kosong dipakai jangkauan bawaan searah hadap */
  target?: { x: number; y: number };
  /** dipanggil sekali saat efek selesai alami (TIDAK dipanggil oleh clear()/destroy()) */
  onDone?: () => void;
  /** benih RNG agar tes/rekaman deterministik */
  seed?: number;
}
export interface VfxOptions {
  reducedFlashes: () => boolean;
  /** hubungkan ke Effects.shake(scene, ms, intensity) (yang sudah menghormati pengaturan Screen Shake) */
  screenShake?: (ms: number, intensity: number) => void;
}

/** Permukaan minimal sprite yang dipakai (Phaser.GameObjects.Image memenuhinya). */
export interface VfxSprite {
  setTexture(key: string, frame?: string): unknown;
  setFrame(frame: string): unknown;
  setPosition(x: number, y: number): unknown;
  setDepth(d: number): unknown;
  setScale(s: number): unknown;
  setFlipX(f: boolean): unknown;
  setVisible(v: boolean): unknown;
  setActive(v: boolean): unknown;
  destroy(): void;
}
export interface VfxScene {
  add: { image(x: number, y: number, key: string, frame?: string): VfxSprite };
  events?: { on(e: string, fn: (...a: never[]) => void): unknown; off(e: string, fn: (...a: never[]) => void): unknown; once(e: string, fn: (...a: never[]) => void): unknown };
}

const STEP_MS = 33;
const MAX_STEPS_PER_UPDATE = 4;
const KILL_GRACE_MS = 250;
const END_FRAME_MS = 120;

interface Inst {
  spec: VfxSpec;
  t: number;
  x: number; y: number;
  tx: number; ty: number;
  facing: 1 | -1;
  scale: number;
  depth: number;
  calm: boolean;
  rng: () => number;
  events: { at: number; run: () => void }[];
  live: number;
  onDone?: () => void;
}
type PartKind = 'anim' | 'burst' | 'travel' | 'ghost' | 'node' | 'end';
interface Part {
  obj: VfxSprite;
  inst: Inst;
  kind: PartKind;
  t: number;
  frame: string;
  // anim
  layerAnim?: AnimLayer; x: number; y: number;
  // burst
  layerBurst?: BurstLayer; vx: number; vy: number; life: number; groundY?: number; phase: number; baseX: number; sx: number; sy: number; cx: number; cy: number;
  // travel
  layerTravel?: TravelLayer; trailAcc: number; ex: number; ey: number;
  // link
  layerLink?: LinkLayer; u: number; index: number; total: number; lastIdx?: number;
}

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Vfx {
  private readonly free: VfxSprite[] = [];
  private parts: Part[] = [];
  private insts: Inst[] = [];
  private acc = 0;
  private seq = 1;
  private dead = false;
  private readonly onUpdate = (_time: number, delta: number): void => this.update(delta);
  private readonly onShutdown = (): void => this.destroy();

  constructor(private readonly scene: VfxScene, private readonly opts: VfxOptions) {
    scene.events?.on('update', this.onUpdate as never);
    scene.events?.once('shutdown', this.onShutdown as never);
  }

  /** Jumlah sprite VFX yang sedang hidup (selalu <= 64). */
  active(): number { return this.parts.length; }
  /** Jumlah efek (instans) yang masih berjalan. */
  running(): number { return this.insts.length; }
  has(id: string): boolean { return id in VFX_SPECS; }

  /** Mainkan efek `id` di (x,y) koordinat panggung. id tak dikenal diabaikan (tidak throw). */
  play(id: string, x: number, y: number, o: VfxPlayOptions = {}): void {
    if (this.dead) return;
    const spec = VFX_SPECS[id];
    if (!spec) return;
    this.start(spec, x, y, o, false);
  }

  /** Hentikan dan lepas SEMUA efek (tanpa memanggil onDone). Objek kembali ke pool. */
  clear(): void {
    for (const p of [...this.parts]) this.release(p);
    this.parts = [];
    for (const i of this.insts) { i.events = []; i.onDone = undefined; }
    this.insts = [];
  }

  destroy(): void {
    if (this.dead) return;
    this.clear();
    this.dead = true;
    for (const o of this.free) o.destroy();
    this.free.length = 0;
    this.scene.events?.off('update', this.onUpdate as never);
    this.scene.events?.off('shutdown', this.onShutdown as never);
  }

  /** Maju `deltaMs` (dipanggil otomatis oleh event update scene; tes memanggilnya langsung). */
  update(deltaMs: number): void {
    if (this.dead || (this.insts.length === 0 && this.parts.length === 0)) { this.acc = 0; return; }
    this.acc += Math.min(Math.max(deltaMs, 0), 100);
    let steps = 0;
    while (this.acc >= STEP_MS && steps < MAX_STEPS_PER_UPDATE) { this.acc -= STEP_MS; steps++; this.step(); }
    if (steps === MAX_STEPS_PER_UPDATE) this.acc = 0;
  }

  // ------------------------------------------------------------ mulai efek
  private start(spec: VfxSpec, x: number, y: number, o: VfxPlayOptions, forceCalm: boolean): void {
    const facing: 1 | -1 = o.flip ? -1 : 1;
    const scale = Math.max(1, Math.round(o.scale ?? 1));
    const reach = spec.layers.find((l): l is TravelLayer => l.kind === 'travel')?.defaultReach ?? 0;
    const tgt = o.target ?? { x: x + facing * reach * scale, y };
    const inst: Inst = {
      spec, t: 0, x: Math.round(x), y: Math.round(y), tx: Math.round(tgt.x), ty: Math.round(tgt.y), facing, scale,
      depth: Math.max(0, Math.min(19, Math.round(o.depth ?? spec.depth ?? 10))),
      calm: forceCalm || (spec.flashy && this.opts.reducedFlashes()),
      rng: mulberry32(o.seed ?? (this.seq++ * 7919 + 13)),
      events: [], live: 0, onDone: o.onDone,
    };
    this.insts.push(inst);
    for (const layer of spec.layers) this.schedule(inst, layer);
    for (const c of spec.children ?? []) {
      const child = VFX_SPECS[c.id];
      if (!child) continue;
      const anchor = c.at === 'target' ? { x: inst.tx, y: inst.ty } : { x: inst.x, y: inst.y };
      inst.events.push({
        at: c.delayMs ?? 0,
        run: () => this.start(child, anchor.x + (c.dx ?? 0) * facing * scale, anchor.y + (c.dy ?? 0) * scale, { flip: o.flip, scale, depth: inst.depth, target: { x: inst.tx, y: inst.ty } }, inst.calm),
      });
    }
    if (spec.shake && this.opts.screenShake) {
      const sh = spec.shake, cb = this.opts.screenShake;
      inst.events.push({ at: sh.delayMs ?? 0, run: () => cb(sh.ms, sh.intensity) });
    }
    inst.events.sort((a, b) => a.at - b.at);
    this.pump(inst);
  }

  private frameName(inst: Inst, f: string): string { return inst.calm ? inst.spec.calm?.frameMap[f] ?? f : f; }
  private anchor(inst: Inst, layer: VfxLayer): { x: number; y: number } {
    const base = layer.at === 'target' ? { x: inst.tx, y: inst.ty } : { x: inst.x, y: inst.y };
    return { x: base.x + (layer.dx ?? 0) * inst.facing * inst.scale, y: base.y + (layer.dy ?? 0) * inst.scale };
  }

  private schedule(inst: Inst, layer: VfxLayer): void {
    const d = layer.delayMs ?? 0;
    if (layer.kind === 'anim') {
      for (const i of layer.instances ?? [{ dx: 0, dy: 0 }]) {
        inst.events.push({ at: d + (i.delayMs ?? 0), run: () => {
          const a = this.anchor(inst, layer);
          const px = a.x + i.dx * inst.facing * inst.scale, py = a.y + i.dy * inst.scale;
          const first = this.frameName(inst, layer.frames[0]!);
          const obj = this.acquire(inst, inst.spec.atlas, first, px, py, inst.depth + (layer.depth ?? 0) + (i.depth ?? 0), (inst.facing < 0) !== !!i.flip);
          if (obj) this.parts.push({ ...this.blank(obj, inst, 'anim', first), layerAnim: layer, x: px, y: py });
        } });
      }
    } else if (layer.kind === 'burst') {
      const n = inst.calm ? Math.ceil(layer.count * (inst.spec.calm?.particleScale ?? 1)) : layer.count;
      for (let i = 0; i < n; i++) inst.events.push({ at: d + (layer.spawnMs ? Math.floor((layer.spawnMs * i) / Math.max(1, n)) : 0), run: () => this.spawnBurst(inst, layer) });
    } else if (layer.kind === 'travel') {
      inst.events.push({ at: d, run: () => {
        const a = this.anchor(inst, layer);
        const frame = this.frameName(inst, layer.frames[0]!);
        const obj = this.acquire(inst, inst.spec.atlas, frame, a.x, a.y, inst.depth + (layer.depth ?? 0), inst.facing < 0);
        if (obj) this.parts.push({ ...this.blank(obj, inst, 'travel', frame), layerTravel: layer, x: a.x, y: a.y, ex: inst.tx, ey: inst.ty });
      } });
    } else {
      inst.events.push({ at: d, run: () => this.spawnLink(inst, layer) });
    }
  }

  private blank(obj: VfxSprite, inst: Inst, kind: PartKind, frame: string): Part {
    return { obj, inst, kind, t: 0, frame, x: 0, y: 0, vx: 0, vy: 0, life: 0, phase: 0, baseX: 0, sx: 0, sy: 0, cx: 0, cy: 0, trailAcc: 0, ex: 0, ey: 0, u: 0, index: 0, total: 0 };
  }

  private spawnBurst(inst: Inst, l: BurstLayer): void {
    const r = inst.rng, a = this.anchor(inst, l), s = inst.scale;
    const life = l.lifeMs[0] + r() * (l.lifeMs[1] - l.lifeMs[0]);
    const frame = this.frameName(inst, l.animate ? l.frames[0]! : l.frames[Math.floor(r() * l.frames.length)]!);
    let px = a.x + (r() * 2 - 1) * (l.spawnRx ?? 0) * s, py = a.y + (r() * 2 - 1) * (l.spawnRy ?? 0) * s;
    let vx = 0, vy = 0, sx = 0, sy = 0;
    if (l.motion === 'gather') {
      const th = r() * Math.PI * 2;
      sx = a.x + Math.cos(th) * (l.ring ?? 24) * s; sy = a.y + Math.sin(th) * (l.ring ?? 24) * (l.squash ?? 1) * s;
      px = sx; py = sy;
    } else {
      const ang = ((l.angle[0] + r() * (l.angle[1] - l.angle[0])) * Math.PI) / 180, sp = (l.speed[0] + r() * (l.speed[1] - l.speed[0])) * s;
      vx = Math.cos(ang) * sp * inst.facing; vy = Math.sin(ang) * sp;
    }
    const obj = this.acquire(inst, inst.spec.atlas, frame, px, py, inst.depth + (l.depth ?? 0), false);
    if (!obj) return;
    const p = this.blank(obj, inst, 'burst', frame);
    Object.assign(p, { layerBurst: l, x: px, y: py, vx, vy, life, phase: r() * Math.PI * 2, baseX: px, sx, sy, cx: a.x, cy: a.y, groundY: l.groundDy !== undefined ? a.y + l.groundDy * s : undefined });
    this.parts.push(p);
  }

  private spawnLink(inst: Inst, l: LinkLayer): void {
    const dist = Math.hypot(inst.tx - inst.x, inst.ty - inst.y);
    const n = Math.max(3, Math.min(l.maxNodes, Math.round(dist / (l.spacing * inst.scale))));
    const mk = (kind: 'node' | 'end', u: number, index: number): void => {
      const frame = this.frameName(inst, kind === 'node' ? l.nodeFrames[0]! : l.endFrames[0]!);
      const obj = this.acquire(inst, inst.spec.atlas, frame, inst.x, inst.y, inst.depth + (l.depth ?? 0) + (kind === 'end' ? 1 : 0), false);
      if (!obj) return;
      obj.setVisible(false);
      const p = this.blank(obj, inst, kind, frame);
      Object.assign(p, { layerLink: l, u, index, total: n });
      this.parts.push(p);
    };
    mk('end', 0, 0); mk('end', 1, 1);
    for (let i = 0; i < n; i++) mk('node', (i + 1) / (n + 1), i);
  }

  /** Jalankan event yang sudah jatuh tempo pada waktu inst.t. */
  private pump(inst: Inst): void {
    while (inst.events.length && inst.events[0]!.at <= inst.t) inst.events.shift()!.run();
  }

  // ------------------------------------------------------------ pool
  private acquire(inst: Inst, atlas: string, frame: string, x: number, y: number, depth: number, flip: boolean): VfxSprite | null {
    if (this.parts.length >= VFX_MAX_LIVE) return null;
    let obj = this.free.pop();
    if (obj) obj.setTexture(atlas, frame);
    else obj = this.scene.add.image(0, 0, atlas, frame);
    obj.setPosition(Math.round(x), Math.round(y));
    obj.setDepth(Math.max(0, Math.min(19, depth)));
    obj.setScale(inst.scale);
    obj.setFlipX(flip);
    obj.setVisible(true);
    obj.setActive(true);
    inst.live++;
    return obj;
  }
  private release(p: Part): void {
    p.obj.setVisible(false);
    p.obj.setActive(false);
    this.free.push(p.obj);
    p.inst.live--;
  }
  private drop(p: Part): void {
    this.release(p);
    const i = this.parts.indexOf(p);
    if (i >= 0) this.parts.splice(i, 1);
  }
  private setFrame(p: Part, frame: string): void {
    if (p.frame === frame) return;
    p.frame = frame;
    p.obj.setFrame(frame);
  }

  // ------------------------------------------------------------ simulasi
  private step(): void {
    const dt = STEP_MS / 1000;
    for (const inst of [...this.insts]) { inst.t += STEP_MS; this.pump(inst); }
    for (const p of [...this.parts]) this.stepPart(p, dt);
    for (const inst of [...this.insts]) {
      const forced = inst.t >= inst.spec.durationMs + KILL_GRACE_MS;
      if (forced) {
        for (const p of [...this.parts]) if (p.inst === inst) this.drop(p);
        inst.events = [];
      }
      if (inst.events.length === 0 && inst.live <= 0) {
        this.insts.splice(this.insts.indexOf(inst), 1);
        const cb = inst.onDone;
        inst.onDone = undefined;
        try { cb?.(); } catch { /* callback pemanggil tidak boleh merusak VFX */ }
      }
    }
  }

  private stepPart(p: Part, dt: number): void {
    p.t += STEP_MS;
    const inst = p.inst;
    switch (p.kind) {
      case 'anim': {
        const l = p.layerAnim!;
        const n = l.frames.length, loops = l.loops ?? 1;
        let idx = 0, acc = 0;
        for (; idx < n * loops; idx++) { acc += Array.isArray(l.frameMs) ? (l.frameMs as readonly number[])[idx % n]! : (l.frameMs as number); if (p.t < acc) break; }
        if (idx >= n * loops) { this.drop(p); return; }
        this.setFrame(p, this.frameName(inst, l.frames[idx % n]!));
        return;
      }
      case 'burst': {
        const l = p.layerBurst!;
        if (p.t >= p.life) { this.drop(p); return; }
        if (l.motion === 'gather') {
          const f = p.t / p.life, e = f * f;
          p.x = p.sx + (p.cx - p.sx) * e; p.y = p.sy + (p.cy - p.sy) * e;
        } else {
          p.vy += (l.gravity ?? 0) * dt;
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.groundY !== undefined && p.y >= p.groundY && p.vy > 0) {
            p.y = p.groundY;
            if ((l.bounce ?? 0) > 0 && p.vy > 70) { p.vy = -p.vy * l.bounce!; p.vx *= 0.6; } else { p.vy = 0; p.vx = 0; }
          }
        }
        const sway = l.sway ? l.sway.amp * inst.scale * Math.sin(Math.PI * 2 * l.sway.hz * (p.t / 1000) + p.phase) : 0;
        p.obj.setPosition(Math.round(p.x + sway), Math.round(p.y));
        if (l.animate) this.setFrame(p, this.frameName(inst, l.frames[Math.min(l.frames.length - 1, Math.floor((p.t / p.life) * l.frames.length))]!));
        else if (l.endFrame && p.life - p.t <= END_FRAME_MS) this.setFrame(p, this.frameName(inst, l.endFrame));
        return;
      }
      case 'travel': {
        const l = p.layerTravel!;
        const f = Math.min(1, p.t / l.durationMs);
        const e = l.ease === 'out' ? 1 - (1 - f) * (1 - f) : l.ease === 'in' ? f * f : f;
        const sx = this.anchor(inst, l).x, sy = this.anchor(inst, l).y;
        const x = sx + (p.ex - sx) * e, y = sy + (p.ey - sy) * e - Math.sin(Math.PI * f) * (l.arc ?? 0) * inst.scale;
        p.obj.setPosition(Math.round(x), Math.round(y));
        this.setFrame(p, this.frameName(inst, l.frames[Math.floor(p.t / l.frameMs) % l.frames.length]!));
        if (l.trail) {
          p.trailAcc += STEP_MS;
          if (p.trailAcc >= l.trail.everyMs && f < 1) {
            p.trailAcc -= l.trail.everyMs;
            const gf = this.frameName(inst, l.trail.frames[Math.floor(inst.rng() * l.trail.frames.length)]!);
            const g = this.acquire(inst, inst.spec.atlas, gf, x, y + 1, inst.depth + (l.depth ?? 0) - 1, false);
            if (g) this.parts.push({ ...this.blank(g, inst, 'ghost', gf), layerTravel: l, x, y: y + 1, life: l.trail.lifeMs });
          }
        }
        if (f >= 1) this.drop(p);
        return;
      }
      case 'ghost': {
        if (p.t >= p.life) { this.drop(p); return; }
        if (p.t > p.life * 0.55) p.obj.setPosition(Math.round(p.x), Math.round(p.y + Math.floor((p.t - p.life * 0.55) / 100)));
        return;
      }
      case 'node':
      case 'end': {
        const l = p.layerLink!;
        const total = l.growMs + l.holdMs + l.shrinkMs;
        if (p.t >= total) { this.drop(p); return; }
        let visible: boolean;
        if (p.kind === 'node') visible = p.t >= l.growMs * p.u && p.t < l.growMs + l.holdMs + l.shrinkMs * p.u;
        else visible = p.index === 0 || p.t >= l.growMs * 0.9;
        p.obj.setVisible(visible);
        if (!visible) return;
        const sx = inst.x, sy = inst.y, ex = inst.tx, ey = inst.ty;
        let x: number, y: number;
        if (p.kind === 'end') { x = p.index === 0 ? sx : ex; y = p.index === 0 ? sy : ey; }
        else {
          const u = p.u, cx = (sx + ex) / 2, cy = (sy + ey) / 2 - l.lift * 2 * inst.scale;
          x = (1 - u) * (1 - u) * sx + 2 * (1 - u) * u * cx + u * u * ex; y = (1 - u) * (1 - u) * sy + 2 * (1 - u) * u * cy + u * u * ey;
        }
        p.obj.setPosition(Math.round(x), Math.round(y));
        const frames = p.kind === 'node' ? l.nodeFrames : l.endFrames;
        const per = p.kind === 'node' ? 90 : l.endFrameMs;
        this.setFrame(p, this.frameName(inst, frames[(Math.floor(p.t / per) + p.index) % frames.length]!));
        return;
      }
    }
  }
}

/** Pintasan bertipe untuk Phaser.Scene (Image memenuhi VfxSprite). */
export function createVfx(scene: Phaser.Scene, opts: VfxOptions): Vfx {
  return new Vfx(scene, opts);
}
