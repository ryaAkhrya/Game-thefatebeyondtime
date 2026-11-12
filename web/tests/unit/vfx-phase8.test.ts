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
  const v = new Vfx(f.scene, { reducedFlashes: () => reduced, screenShake: shake });
  return { ...f, v };
};

const PERSISTENT = ['meteor_sky_hold', 'aegis_hold', 'fracture_mark', 'heart_lock_glow'];

describe('Vfx Phase 8: efek persisten start()/stop()', () => {
  it('start() menjalankan efek tanpa batas sampai stop(); sprite tetap hidup puluhan detik', () => {
    for (const id of PERSISTENT) {
      const { v } = make();
      const h = v.start(id, 200, 120, { seed: 1 });
      expect(v.active(), id).toBe(1);
      run(v, 20000);
      expect(v.active(), `${id} berhenti sendiri`).toBe(1);
      expect(v.running()).toBe(1);
      h.stop();
    }
  });

  it('stop() memutar frame exit (peluruhan piksel), lalu semua sprite kembali ke pool dan onDone dipanggil sekali', () => {
    for (const id of PERSISTENT) {
      const { v, created } = make();
      let done = 0;
      const h = v.start(id, 200, 120, { onDone: () => done++ });
      run(v, 500);
      const exit = VFX_SPECS[id]!.persistent!.exit;
      h.stop();
      v.update(33); v.update(33);
      expect(created.some((s) => exit.frames.includes(s.frame)), `${id} tidak memakai frame exit`).toBe(true);
      run(v, exit.frames.length * exit.frameMs + 600);
      expect(v.active(), id).toBe(0);
      expect(v.running()).toBe(0);
      expect(done).toBe(1);
      expect(created.every((s) => !s.visible && !s.active)).toBe(true);
    }
  });

  it('stop() berulang, stop() setelah clear(), stop() setelah selesai, dan id tak dikenal tidak melempar', () => {
    const { v } = make();
    const h = v.start('aegis_hold', 100, 100);
    h.stop(); h.stop();
    run(v, 1000);
    expect(() => h.stop()).not.toThrow();
    const h2 = v.start('meteor_sky_hold', 100, 100);
    v.clear();
    expect(() => h2.stop()).not.toThrow();
    expect(v.active()).toBe(0);
    expect(() => v.start('tidak_ada', 0, 0).stop()).not.toThrow();
    v.destroy();
    expect(() => v.start('aegis_hold', 0, 0).stop()).not.toThrow();
    expect(v.active()).toBe(0);
  });

  it('start() pada efek non-persisten: stop() melepas seketika', () => {
    const { v } = make();
    const h = v.start('staff_impact', 100, 100, { seed: 1 });
    run(v, 100);
    expect(v.active()).toBeGreaterThan(0);
    h.stop();
    expect(v.active()).toBe(0);
    run(v, 100);
    expect(v.running()).toBe(0);
  });

  it('play() pada efek persisten berhenti sendiri di durationMs; opts.durationMs pada start() juga menghentikan otomatis', () => {
    const a = make();
    let doneA = 0;
    a.v.play('aegis_hold', 100, 100, { onDone: () => doneA++ });
    run(a.v, VFX_SPECS.aegis_hold!.durationMs + 600);
    expect(a.v.active()).toBe(0);
    expect(doneA).toBe(1);
    const b = make();
    b.v.start('meteor_sky_hold', 100, 100, { durationMs: 1000 });
    run(b.v, 900);
    expect(b.v.active()).toBe(1);
    run(b.v, 900);
    expect(b.v.active()).toBe(0);
  });

  it('semua id: play() selesai sendiri, termasuk efek persisten (auto-stop), tanpa sprite tersisa', () => {
    for (const id of VFX_IDS) {
      const { v, created } = make();
      let done = 0;
      v.play(id, 300, 150, { onDone: () => done++, seed: 3, target: { x: 400, y: 150 } });
      run(v, VFX_SPECS[id]!.durationMs + 1200);
      expect(v.active(), id).toBe(0);
      expect(done, id).toBe(1);
      expect(created.every((s) => !s.visible && !s.active), id).toBe(true);
    }
  });

  it('efek persisten menghitung ke cap 64 dan tidak pernah melampauinya', () => {
    const { v } = make();
    for (let i = 0; i < 6; i++) v.play('debris_burst', 100, 100, { seed: i });
    expect(v.active()).toBeLessThanOrEqual(VFX_MAX_LIVE);
    v.start('meteor_sky_hold', 200, 80);
    expect(v.active()).toBeLessThanOrEqual(VFX_MAX_LIVE);
    for (let t = 0; t < 40; t++) { v.update(33); expect(v.active()).toBeLessThanOrEqual(VFX_MAX_LIVE); }
    const full = make();
    for (let i = 0; i < 10; i++) full.v.play('debris_burst', 100, 100, { seed: i });
    expect(full.v.active()).toBe(VFX_MAX_LIVE);
    const h = full.v.start('aegis_hold', 0, 0);
    expect(full.v.active()).toBe(VFX_MAX_LIVE);
    expect(() => h.stop()).not.toThrow();
  });

  it('frame loop meteor_sky_hold/aegis_hold melewati seluruh frame dan kembali ke awal', () => {
    for (const id of ['meteor_sky_hold', 'aegis_hold']) {
      const { v, created } = make();
      v.start(id, 100, 100);
      const seen: string[] = [];
      for (let i = 0; i < 90; i++) { v.update(33); seen.push(created[0]!.frame); }
      const loopFrames = (VFX_SPECS[id]!.layers[0] as { frames: readonly string[] }).frames;
      for (const f of loopFrames) expect(seen.includes(f), `${id} ${f}`).toBe(true);
      expect(seen.lastIndexOf(loopFrames[0]!)).toBeGreaterThan(seen.indexOf(loopFrames[loopFrames.length - 1]!));
    }
  });

  it('battle diulang berurutan: sistem baru + start/stop/clear/destroy tidak membocorkan sprite atau listener', () => {
    for (let round = 0; round < 12; round++) {
      const { v, created, handlers } = make();
      const sky = v.start('meteor_sky_hold', 240, 60);
      const aegis = v.start('aegis_hold', 360, 190);
      v.play('aegis_form', 360, 190, { seed: round });
      run(v, 400);
      sky.stop();
      v.play('meteor_descent', 360, 190, { from: { x: 240, y: 20 }, durationMs: 1000 });
      run(v, 1200);
      v.play('meteor_impact', 360, 190, { seed: round });
      v.play('aegis_stress', 360, 190, { level: 3, seed: round });
      run(v, 600);
      aegis.stop();
      if (round % 2 === 0) v.clear(); else run(v, 3000);
      expect(v.active()).toBe(0);
      v.destroy();
      expect(created.every((s) => s.destroyed)).toBe(true);
      expect((handlers.update ?? []).length).toBe(0);
      expect(created.length).toBeLessThanOrEqual(VFX_MAX_LIVE);
    }
  });

  it('pooling efek persisten: start/stop berulang memakai ulang sprite, tidak menambah objek', () => {
    const { v, created } = make();
    for (let i = 0; i < 8; i++) { const h = v.start('aegis_hold', 100, 100); run(v, 300); h.stop(); run(v, 500); }
    expect(created.length).toBeLessThanOrEqual(2);
  });
});

describe('Vfx Phase 8: meteor_descent, meteor_impact, meteor_aftermath', () => {
  const meteorFrames = (): readonly string[] => (VFX_SPECS.meteor_descent!.layers[0] as { frames: readonly string[] }).frames;

  it('descent jatuh dari opts.from ke titik tabrak dalam opts.durationMs, frame membesar monoton, selesai tepat waktu', () => {
    const { v, created } = make();
    let done = 0;
    v.play('meteor_descent', 300, 190, { from: { x: 200, y: -40 }, durationMs: 1200, onDone: () => done++ });
    const meteor = created[0]!;
    expect(meteor.x).toBe(200);
    expect(meteor.y).toBe(-40);
    const order = meteorFrames();
    let last = -1, lastY = -Infinity;
    for (let t = 0; t < 1100; t += 33) {
      v.update(33);
      const idx = order.indexOf(meteor.frame);
      expect(idx).toBeGreaterThanOrEqual(last);
      expect(meteor.y).toBeGreaterThanOrEqual(lastY);
      last = idx; lastY = meteor.y;
    }
    expect(last).toBe(order.length - 1);
    expect(done).toBe(0);
    run(v, 600);
    expect(done).toBe(1);
    expect(v.active()).toBe(0);
    expect(meteor.x).toBe(300);
    expect(meteor.y).toBe(190);
  });

  it('durasi descent mengikuti parameter: 1000 ms lebih cepat selesai daripada 1400 ms', () => {
    const finish = (ms: number): number => {
      const { v } = make();
      let t = 0, done = false;
      v.play('meteor_descent', 300, 190, { durationMs: ms, onDone: () => { done = true; } });
      while (!done && t < 5000) { v.update(33); t += 33; }
      return t;
    };
    const a = finish(1000), b = finish(1400);
    expect(a).toBeLessThan(b);
    expect(a).toBeGreaterThanOrEqual(1000);
    expect(b).toBeGreaterThanOrEqual(1400);
    expect(b).toBeLessThan(2400);
  });

  it('tanpa opts.from: jatuh lurus dari atas titik tabrak (fallPx dikali scale); skala bulat dipakai', () => {
    const { v, created } = make();
    v.play('meteor_descent', 300, 190, { scale: 2 });
    expect(created[0]!.x).toBe(300);
    expect(created[0]!.y).toBe(190 - 260 * 2);
    expect(created[0]!.scale).toBe(2);
  });

  it('descent menimbulkan jejak partikel diskret yang tidak melebihi puncak spec', () => {
    const { v } = make();
    v.play('meteor_descent', 300, 190, { durationMs: 1200 });
    let peak = 0;
    for (let t = 0; t < 1500; t += 33) { v.update(33); peak = Math.max(peak, v.active()); expect(v.active()).toBeLessThanOrEqual(VFX_SPECS.meteor_descent!.maxParticles); }
    expect(peak).toBeGreaterThan(3);
  });

  it('meteor_impact: guncangan besar + cincin/letusan/retak + serpihan; varian tenang tanpa frame putih/bara terang', () => {
    const calls: [number, number][] = [];
    const { v, created } = make(false, (ms, i) => calls.push([ms, i]));
    v.play('meteor_impact', 300, 190, { seed: 3 });
    run(v, 200);
    expect(calls).toEqual([[280, 0.012]]);
    const frames = new Set(created.map((s) => s.frame));
    for (const prefix of ['mimp_', 'mring_', 'mcrack_', 'mrock_', 'mem_']) expect([...frames].some((f) => f.startsWith(prefix)), prefix).toBe(true);
    const calm = make(true);
    calm.v.play('meteor_impact', 300, 190, { seed: 3 });
    const seen = new Set<string>();
    for (let i = 0; i < 12; i++) { calm.v.update(33); for (const s of calm.created) seen.add(s.frame); }
    seen.add(calm.created[0]!.frame);
    expect([...seen].some((f) => f === 'mimp_1_c' || f === 'mimp_2_c')).toBe(true);
    expect(seen.has('mimp_1')).toBe(false);
    expect(calm.created.length).toBeLessThan(created.length);
  });

  it('meteor_aftermath lambat (>= 2,5 s) dan bersih sepenuhnya', () => {
    const { v, created } = make();
    let done = 0;
    v.play('meteor_aftermath', 300, 190, { seed: 2, onDone: () => done++ });
    run(v, 2000);
    expect(done).toBe(0);
    run(v, 2000);
    expect(done).toBe(1);
    expect(v.active()).toBe(0);
    expect(created.every((s) => !s.visible)).toBe(true);
  });
});

describe('Vfx Phase 8: Perlindungan (aegis) dan tingkat', () => {
  it('aegis_stress memakai frame menurut opts.level; level lebih tinggi menambah serpihan', () => {
    const counts: number[] = [];
    for (const level of [1, 2, 3]) {
      const { v, created } = make();
      v.play('aegis_stress', 300, 190, { level, seed: 5 });
      run(v, 200);
      expect(created.some((s) => s.frame.startsWith(`astress${level}_`)), `level ${level}`).toBe(true);
      for (const other of [1, 2, 3].filter((l) => l !== level)) expect(created.some((s) => s.frame.startsWith(`astress${other}_`)), `level ${level} bocor ${other}`).toBe(false);
      counts.push(created.length);
    }
    expect(counts[1]!).toBeGreaterThan(counts[0]!);
    expect(counts[2]!).toBeGreaterThan(counts[1]!);
  });

  it('level di luar rentang dijepit (0 -> 1, 9 -> 3) dan bawaan = 1', () => {
    const first = (level?: number): string => { const { v, created } = make(); v.play('aegis_stress', 0, 0, level === undefined ? {} : { level }); return created[0]!.frame; };
    expect(first()).toBe('astress1_1');
    expect(first(0)).toBe('astress1_1');
    expect(first(9)).toBe('astress3_1');
  });

  it('urutan penuh charge -> form -> hold -> impact + stress -> fade: satu cap, selesai bersih', () => {
    const { v, created } = make();
    v.play('aegis_charge', 400, 150);
    run(v, 1000);
    v.play('aegis_form', 360, 190);
    run(v, 900);
    const hold = v.start('aegis_hold', 360, 190);
    v.play('meteor_impact', 360, 190);
    v.play('aegis_stress', 360, 190, { level: 2 });
    run(v, 700);
    hold.stop();
    run(v, 3000);
    expect(v.active()).toBe(0);
    expect(created.length).toBeLessThanOrEqual(VFX_MAX_LIVE);
    expect(created.every((s) => !s.visible)).toBe(true);
  });

  it('aegis_form dan aegis_hold berada di depth panggung (< 20): kontur tidak menutupi UI', () => {
    const { v, created } = make();
    v.play('aegis_form', 360, 190, { depth: 99 });
    v.start('aegis_hold', 360, 190, { depth: 99 });
    for (let i = 0; i < 10; i++) v.update(33);
    expect(created.every((s) => s.depth < 20)).toBe(true);
  });
});

describe('Vfx Phase 8: Reduced Flashes pada efek baru', () => {
  const seenFrames = (reduced: boolean, id: string): Set<string> => {
    const { v, created } = make(reduced);
    v.play(id, 200, 150, { target: { x: 300, y: 150 }, seed: 2 });
    const seen = new Set<string>();
    for (const s of created) seen.add(s.frame);
    for (let i = 0; i < 44; i++) { v.update(33); for (const s of created) seen.add(s.frame); }
    return seen;
  };
  it('semua efek flashy baru memakai frame _c saat Reduced Flashes dan tidak saat normal', () => {
    for (const id of ['meteor_impact', 'aegis_form', 'aegis_charge', 'heart_unseal', 'staff_impact', 'fracture_strike', 'seal_pulse', 'phase_shift', 'riftborn_surge', 'time_distortion']) {
      expect([...seenFrames(true, id)].some((f) => /_\d+_c$/.test(f)), `${id} tenang`).toBe(true);
      expect([...seenFrames(false, id)].some((f) => /_\d+_c$/.test(f)), `${id} normal`).toBe(false);
    }
  });
  it('efek non-flashy baru tidak berubah oleh pengaturan', () => {
    for (const id of ['temporal_bind', 'keeper_stance', 'riftborn_lash', 'gravorn_slam', 'meteor_aftermath', 'aegis_fade', 'tower_dust']) expect([...seenFrames(true, id)].sort()).toEqual([...seenFrames(false, id)].sort());
  });
});
