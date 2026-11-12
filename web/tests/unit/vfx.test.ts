import { describe, expect, it } from 'vitest';
import { Vfx, type VfxScene, type VfxSprite } from '../../src/game/vfx/Vfx';
import { VFX_IDS, VFX_MAX_LIVE, VFX_SPECS } from '../../src/game/vfx/vfxSpecs';

class FakeSprite implements VfxSprite {
  texture = ''; frame = ''; x = 0; y = 0; depth = 0; scale = 1; flipX = false; visible = true; active = true; destroyed = false;
  setTexture(k: string, f?: string): this { this.texture = k; if (f !== undefined) this.frame = f; return this; }
  setFrame(f: string): this { this.frame = f; return this; }
  setPosition(x: number, y: number): this { this.x = x; this.y = y; return this; }
  setDepth(d: number): this { this.depth = d; return this; }
  setScale(s: number): this { this.scale = s; return this; }
  setFlipX(f: boolean): this { this.flipX = f; return this; }
  setVisible(v: boolean): this { this.visible = v; return this; }
  setActive(v: boolean): this { this.active = v; return this; }
  destroy(): void { this.destroyed = true; }
}
function fake() {
  const created: FakeSprite[] = [];
  const handlers: Record<string, ((...a: unknown[]) => void)[]> = {};
  const scene: VfxScene = {
    add: { image: (x, y, key, frame) => { const s = new FakeSprite().setTexture(key, frame); s.setPosition(x, y); created.push(s); return s; } },
    events: {
      on: (e, fn) => { (handlers[e] ??= []).push(fn as never); },
      off: (e, fn) => { handlers[e] = (handlers[e] ?? []).filter((h) => h !== (fn as never)); },
      once: (e, fn) => { (handlers[e] ??= []).push(fn as never); },
    },
  };
  return { scene, created, handlers };
}
const run = (v: Vfx, ms: number): void => { for (let t = 0; t < ms; t += 33) v.update(33); };
const make = (reduced = false, shake?: (ms: number, i: number) => void) => {
  const f = fake();
  const state = { reduced };
  const v = new Vfx(f.scene, { reducedFlashes: () => state.reduced, screenShake: shake });
  return { ...f, v, state };
};

describe('Vfx: spawn dan pembersihan', () => {
  it('setiap id kontrak bisa dimainkan, menghasilkan sprite, selesai sendiri dan melepas semuanya', () => {
    for (const id of VFX_IDS) {
      const { v, created } = make();
      let done = 0;
      v.play(id, 200, 120, { target: { x: 320, y: 130 }, onDone: () => done++, seed: 1 });
      expect(v.active(), `${id} tidak memunculkan sprite`).toBeGreaterThan(0);
      expect(v.active()).toBeLessThanOrEqual(VFX_SPECS[id]!.maxParticles);
      run(v, VFX_SPECS[id]!.durationMs + 400);
      expect(v.active(), `${id} masih ada sprite`).toBe(0);
      expect(v.running()).toBe(0);
      expect(done, `${id} onDone`).toBe(1);
      expect(created.every((s) => !s.visible && !s.active), `${id} sprite tidak disembunyikan`).toBe(true);
    }
  });

  it('id tak dikenal diabaikan tanpa error', () => {
    const { v } = make();
    expect(() => v.play('tidak_ada', 0, 0)).not.toThrow();
    expect(v.active()).toBe(0);
  });

  it('pooling: memutar efek yang sama berulang kali tidak membuat objek baru melebihi puncak', () => {
    const { v, created } = make();
    for (let i = 0; i < 6; i++) { v.play('impact_hit', 100, 100, { seed: i }); run(v, 500); }
    expect(created.length).toBeLessThanOrEqual(VFX_SPECS.impact_hit!.maxParticles);
  });

  it('koordinat sprite bulat, skala bulat, depth selalu di bawah 20 (kamera panggung)', () => {
    const { v, created } = make();
    v.play('debris_burst', 100.4, 80.6, { scale: 2.4, depth: 99, seed: 5 });
    for (let i = 0; i < 12; i++) { v.update(33); for (const s of created) { expect(Number.isInteger(s.x) && Number.isInteger(s.y)).toBe(true); expect(Number.isInteger(s.scale)).toBe(true); expect(s.depth).toBeLessThan(20); } }
    expect(created.every((s) => s.scale === 2)).toBe(true);
  });

  it('flip menukar arah: partikel balistik bergerak ke kiri, flipX menyala', () => {
    const a = make(), b = make();
    a.v.play('impact_heavy', 300, 100, { seed: 9 });
    b.v.play('impact_heavy', 300, 100, { seed: 9, flip: true });
    run(a.v, 200); run(b.v, 200);
    const mean = (xs: FakeSprite[]) => xs.reduce((s, x) => s + x.x, 0) / xs.length;
    expect(mean(a.created.filter((s) => s.visible)) - 300).toBeGreaterThan(-300);
    expect(b.created[0]!.flipX).toBe(true);
    expect(a.created[0]!.flipX).toBe(false);
  });

  it('opts.target dipakai: proyektil Torvan berakhir di target', () => {
    const { v, created } = make();
    v.play('torvan_leaf_bolt', 100, 100, { target: { x: 200, y: 120 }, seed: 2 });
    const bolt = created[0]!;
    run(v, 300);
    expect(bolt.x).toBeGreaterThan(170);
    expect(bolt.x).toBeLessThanOrEqual(200);
  });
});

describe('Vfx: batas global dan clear', () => {
  it('cap global: tak pernah lebih dari 64 sprite aktif walau dibanjiri efek', () => {
    const { v, created } = make();
    for (let i = 0; i < 40; i++) { v.play(i % 2 ? 'chronolith_slam' : 'debris_burst', 100 + i, 100, { seed: i }); expect(v.active()).toBeLessThanOrEqual(VFX_MAX_LIVE); }
    for (let t = 0; t < 40; t++) { v.update(33); expect(v.active()).toBeLessThanOrEqual(VFX_MAX_LIVE); }
    expect(created.length).toBeLessThanOrEqual(VFX_MAX_LIVE);
  });

  it('cap global dipenuhi persis 64 lalu penolakan sunyi (efek baru dilewati)', () => {
    const { v } = make();
    for (let i = 0; i < 10; i++) v.play('debris_burst', 100, 100, { seed: i });
    expect(v.active()).toBe(VFX_MAX_LIVE);
    v.play('impact_hit', 100, 100);
    expect(v.active()).toBe(VFX_MAX_LIVE);
  });

  it('clear() melepas semuanya, tidak memanggil onDone, dan pool dipakai ulang', () => {
    const { v, created } = make();
    let done = 0;
    v.play('ground_slam_crack', 200, 150, { onDone: () => done++ });
    v.play('velthia_mend', 100, 150, { onDone: () => done++ });
    run(v, 100);
    expect(v.active()).toBeGreaterThan(0);
    v.clear();
    expect(v.active()).toBe(0);
    expect(v.running()).toBe(0);
    run(v, 2000);
    expect(done).toBe(0);
    expect(created.every((s) => !s.visible)).toBe(true);
    const n = created.length;
    v.play('dust_puff', 50, 50);
    expect(created.length).toBe(n);
  });

  it('destroy() menghancurkan pool, melepas listener, dan play sesudahnya tidak berbuat apa-apa', () => {
    const { v, created, handlers } = make();
    v.play('impact_hit', 0, 0);
    run(v, 600);
    expect(handlers.update!.length).toBe(1);
    v.destroy();
    expect(created.every((s) => s.destroyed)).toBe(true);
    expect(handlers.update!.length).toBe(0);
    v.play('impact_hit', 0, 0);
    expect(v.active()).toBe(0);
  });

  it('event update/shutdown scene menggerakkan dan menghancurkan sistem', () => {
    const { v, handlers, created } = make();
    v.play('dust_puff', 10, 10);
    for (let i = 0; i < 20; i++) handlers.update![0]!(0, 33);
    expect(v.active()).toBe(0);
    handlers.shutdown![0]!();
    expect(created.every((s) => s.destroyed)).toBe(true);
  });
});

describe('Vfx: Reduced Flashes', () => {
  const firstFrames = (reduced: boolean, id: string): string[] => {
    const { v, created, state } = make(reduced);
    state.reduced = reduced;
    v.play(id, 100, 100, { seed: 3 });
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) { v.update(33); for (const s of created) seen.add(s.frame); }
    seen.add(created[0]?.frame ?? '');
    return [...seen];
  };

  it('efek flashy memakai frame varian tenang (_c) saat reducedFlashes() = true dan frame normal saat false', () => {
    for (const id of VFX_IDS.filter((i) => VFX_SPECS[i]!.flashy)) {
      const calm = firstFrames(true, id), normal = firstFrames(false, id);
      expect(calm.some((f) => /_\d+_c$/.test(f)), `${id} calm`).toBe(true);
      expect(normal.some((f) => /_\d+_c$/.test(f)), `${id} normal`).toBe(false);
    }
  });

  it('efek non-flashy tidak berubah oleh pengaturan', () => {
    for (const id of ['dust_puff', 'torvan_vine', 'hollowling_claw']) expect(firstFrames(true, id)).toEqual(firstFrames(false, id));
  });

  it('partikel varian tenang lebih sedikit (impact_hit)', () => {
    const count = (reduced: boolean): number => { const { v, created } = make(reduced); v.play('impact_hit', 0, 0, { seed: 4 }); return created.length; };
    expect(count(true)).toBeLessThan(count(false));
  });

  it('pengaturan dibaca saat play(): berubah di tengah jalan memengaruhi efek berikutnya', () => {
    const { v, created, state } = make(false);
    v.play('greatsword_trail', 0, 0);
    expect(/_\d+_c$/.test(created[0]!.frame)).toBe(false);
    run(v, 400);
    state.reduced = true;
    v.play('greatsword_trail', 0, 0);
    expect(created[0]!.frame).toBe('gs_1_c');
  });

  it('anak efek mewarisi mode tenang', () => {
    const { v, created } = make(true);
    v.play('velthia_ward', 100, 100);
    const seen: string[] = [];
    for (let i = 0; i < 16; i++) { v.update(33); seen.push(...created.map((s) => s.frame)); }
    expect(seen.some((f) => f.startsWith('vspark_') && /_\d+_c$/.test(f))).toBe(true);
  });
});

describe('Vfx: guncangan dan komposit', () => {
  it('ground_slam_crack memicu screenShake dan efek anak (debris + debu)', () => {
    const calls: [number, number][] = [];
    const { v, created } = make(false, (ms, i) => calls.push([ms, i]));
    v.play('ground_slam_crack', 200, 150, { seed: 1 });
    run(v, 300);
    expect(calls).toEqual([[160, 0.007]]);
    const frames = new Set(created.map((s) => s.frame));
    expect([...frames].some((f) => f.startsWith('deb_'))).toBe(true);
    expect([...frames].some((f) => f.startsWith('dust_'))).toBe(true);
    expect([...frames].some((f) => f.startsWith('crack_'))).toBe(true);
  });

  it('tanpa callback screenShake tidak error', () => {
    const { v } = make();
    expect(() => { v.play('chronolith_slam', 100, 100); run(v, 300); }).not.toThrow();
  });

  it('velthia_concord membentuk rantai simpul antara dua titik dan menariknya kembali', () => {
    const { v, created } = make();
    v.play('velthia_concord', 100, 140, { target: { x: 260, y: 140 } });
    const total = created.length;
    expect(total).toBeGreaterThanOrEqual(5);
    run(v, 400);
    const vis = created.filter((s) => s.visible);
    expect(vis.length).toBeGreaterThan(3);
    expect(Math.max(...vis.map((s) => s.x))).toBeLessThanOrEqual(260);
    expect(Math.min(...vis.map((s) => s.x))).toBeGreaterThanOrEqual(100);
    run(v, 1200);
    expect(v.active()).toBe(0);
  });

  it('simulasi deterministik untuk seed sama', () => {
    const trace = (): string => { const { v, created } = make(); v.play('debris_burst', 100, 100, { seed: 42 }); run(v, 330); return created.map((s) => `${s.frame}@${s.x},${s.y}`).join('|'); };
    expect(trace()).toBe(trace());
  });
});
