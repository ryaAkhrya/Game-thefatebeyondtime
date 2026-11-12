import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: { Scenes: { Events: { SHUTDOWN: 'shutdown' } } } }));

import { FakeScene } from './helpers/fakeScene';
import { AveloriaCrisisView } from '../../src/game/world/AveloriaCrisisView';
import { loadAveloria } from '../../src/game/world/aveloria';
import { C3 } from '../../src/game/story/chapter3Flags';
import { CITY_FLAG as F } from '../../src/game/story/aveloriaFlags';
import { C2 } from '../../src/game/story/chapter2Flags';
import { AVELORIA_AUDIENCE, AVELORIA_TEMPLE_EXIT, ID_NOBLE, ID_TORVAN, MAX_EVAC_WALKERS, SCRIPT_PATHS } from '../../src/game/world/aveloriaCrisis';
import type { Interactable } from '../../src/game/world/Interaction';

const ORDER = [C3.crisisSeen, C3.azieDemand, C3.velthiaRefuses, C3.evacOrdered, C3.evacDone, C3.decision, C3.torvanStays, C3.velthiaJoined, C3.departed];
const flagsAt = (n: number): Record<string, boolean> => Object.fromEntries([F.vista, F.gate, F.archive, F.velthia, F.complete, C2.start, C2.farewell, C2.complete, C3.start, ...ORDER.slice(0, n)].map(f => [f, true]));

interface DebugShape { stage: string; walkMode: string; gateLocked: boolean; visibleWalkers: number; props: number; propsTotal: number; walkers: { id: string; status: string; x: number; y: number; visible: boolean }[]; named: Record<string, { x: number; y: number } | null>; velthiaFollowing: boolean; pendingOps: number; cameraDetached: boolean; scripted: string[]; gateGuard: boolean; torvan: { x: number; y: number; mode: string } | null }

let scene: FakeScene;
function make(n: number): { view: AveloriaCrisisView; loaded: ReturnType<typeof loadAveloria>; interactables: Interactable[] } {
  scene = new FakeScene();
  const loaded = loadAveloria();
  const interactables = loaded.interactables.map(i => ({ ...i }));
  const view = new AveloriaCrisisView(scene as never, loaded, interactables);
  view.apply(flagsAt(n));
  return { view, loaded, interactables };
}
const dbg = (v: AveloriaCrisisView): DebugShape => v.debug() as DebugShape;
const player = { x: 640, y: 616, facing: 'up' as const };
async function pump(view: AveloriaCrisisView, ms: number, step = 50): Promise<void> {
  for (let t = 0; t < ms; t += step) { scene.now += step; view.update(player, false, step, false); await vi.advanceTimersByTimeAsync(step); }
}
async function runOp(view: AveloriaCrisisView, op: string, limitMs: number, arg?: string | number): Promise<{ done: boolean; at: number }> {
  let done = false; const p = view.handleAction(op, arg).then(() => { done = true; });
  let t = 0;
  while (!done && t < limitMs) { await pump(view, 100, 50); t += 100; }
  await p.catch(() => undefined);
  return { done, at: t };
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('AveloriaCrisisView: keadaan visual dari flag (apply)', () => {
  it('tahap -> tabel visual: gerbang, mode warga, jumlah prop, NPC bernama', () => {
    const rows: { n: number; stage: string; mode: string; locked: boolean }[] = [
      { n: 0, stage: 'start', mode: 'work', locked: true }, { n: 1, stage: 'crisisSeen', mode: 'work', locked: true }, { n: 3, stage: 'velthiaRefuses', mode: 'work', locked: true },
      { n: 4, stage: 'evacOrdered', mode: 'stream', locked: false }, { n: 5, stage: 'evacDone', mode: 'done', locked: false }, { n: 6, stage: 'decision', mode: 'done', locked: false },
      { n: 9, stage: 'departed', mode: 'done', locked: false },
    ];
    let lastProps = 0;
    for (const r of rows) {
      const { view } = make(r.n); const d = dbg(view);
      expect(d.stage, `n=${r.n}`).toBe(r.stage); expect(d.walkMode).toBe(r.mode); expect(d.gateLocked).toBe(r.locked);
      expect(d.props).toBeGreaterThanOrEqual(lastProps); lastProps = d.props;
      expect(d.visibleWalkers).toBeLessThanOrEqual(MAX_EVAC_WALKERS);
    }
  });
  it('evakuasi selesai: warga keluar hilang, yang menetap terlihat, penjaga gerbang dan Torvan di titik aman', () => {
    const { view } = make(5); const d = dbg(view);
    expect(d.walkers.filter(w => w.status === 'gone').map(w => w.id).sort()).toEqual(['noble_a', 'noble_b', 'porter', 'sweeper', 'vendor']);
    expect(d.walkers.filter(w => w.status === 'gathered').length).toBe(4);
    expect(d.gateGuard).toBe(true); expect(d.torvan?.mode).toBe('camp');
    expect(d.named.talric).toEqual({ x: 696, y: 268 }); // Talric kembali ke ruang pertemuan untuk keputusan
  });
  it('Velthia ikut pemain sejak keputusan; Torvan di loop sebelum evakuasi', () => {
    expect(dbg(make(6).view).velthiaFollowing).toBe(true);
    expect(dbg(make(5).view).velthiaFollowing).toBe(false);
    const { view } = make(2); expect(dbg(view).torvan?.mode).toBe('loop'); expect(dbg(view).gateGuard).toBe(false);
  });
  it('Muat/Continue di tengah evakuasi memulai arus warga dari awal, apply berulang tidak mengulang', async () => {
    const { view } = make(4);
    await pump(view, 3000);
    const before = JSON.stringify(dbg(view).walkers);
    view.apply(flagsAt(4)); view.apply(flagsAt(4));
    expect(JSON.stringify(dbg(view).walkers)).toBe(before);
    expect(dbg(view).walkers.some(w => w.status === 'walk')).toBe(true);
  });
  it('interactable: warga bekerja bisa diajak bicara, bangsawan hanya sebelum evakuasi, Torvan selalu, portal Liora mati', () => {
    const a = make(1);
    const by = (id: string): Interactable => a.interactables.find(i => i.id === id)!;
    expect(by('porter').enabled).toBe(true); expect(by(ID_NOBLE).enabled).toBe(true); expect(by(ID_TORVAN).enabled).toBe(true); expect(by('liora_exit').enabled).toBe(false);
    const b = make(4);
    const byB = (id: string): Interactable => b.interactables.find(i => i.id === id)!;
    expect(byB('porter').enabled).toBe(false); expect(byB(ID_NOBLE).enabled).toBe(false);
    const c = make(5);
    expect(c.interactables.find(i => i.id === 'guard')!.enabled).toBe(true);
  });
  it('pemicu krisis dipasang pada peta scene (peta Bab I-II lain tidak tersentuh)', () => {
    const a = make(1);
    expect(a.loaded.map.triggers.map(t => t.id)).toEqual(expect.arrayContaining([AVELORIA_AUDIENCE, AVELORIA_TEMPLE_EXIT]));
    expect(loadAveloria().map.triggers.some(t => t.id === AVELORIA_AUDIENCE)).toBe(false);
  });
  it('gerbang yang masih terkunci terbuka sendiri bila pemain sudah di luar (tidak mengurung)', () => {
    const { view } = make(1);
    expect(dbg(view).gateLocked).toBe(true);
    view.update({ x: 640, y: 1300 }, false, 16, false);
    expect(dbg(view).gateLocked).toBe(false);
  });
});

describe('AveloriaCrisisView: koreografi selesai, aman dari softlock', () => {
  it('crisisOpen menyelesaikan diri dan mengembalikan kamera', async () => {
    const { view } = make(0);
    const r = await runOp(view, 'crisisOpen', 16000);
    expect(r.done).toBe(true); expect(dbg(view).cameraDetached).toBe(false); expect(scene.cam._follow).toBe(scene.follow);
    expect(dbg(view).pendingOps).toBe(0);
  });
  it('audienceGather: Azie berjalan ke dekat Velthia', async () => {
    const { view } = make(1);
    const a0 = dbg(view).named.azie!;
    const r = await runOp(view, 'audienceGather', 10000);
    expect(r.done).toBe(true);
    const a1 = dbg(view).named.azie!;
    expect(Math.hypot(a1.x - a0.x, a1.y - a0.y)).toBeGreaterThan(40);
  });
  it('evacStart: gerbang terbuka, warga mengalir, Velthia dan Azie sampai di ruang pertemuan, Talric ke gerbang', async () => {
    const { view } = make(3);
    const r = await runOp(view, 'evacStart', 14000);
    expect(r.done).toBe(true);
    const d = dbg(view);
    expect(d.gateLocked).toBe(false); expect(d.walkMode).toBe('stream');
    expect(d.named.velthia).toEqual({ x: 640, y: 250 }); expect(d.named.azie).toEqual({ x: 584, y: 268 });
    view.apply(flagsAt(4)); // flag evacOrdered dipasang sesudah op: tidak mengulang arus
    await pump(view, 4000);
    expect(dbg(view).walkers.filter(w => w.status === 'walk').length).toBeGreaterThan(2);
    const tal = dbg(view).named.talric!; expect(tal.y).toBeGreaterThan(600); // Talric terus berjalan ke selatan
    await pump(view, 16000);
    expect(dbg(view).named.talric).toEqual({ x: 604, y: 1152 });
    expect(dbg(view).visibleWalkers).toBeLessThanOrEqual(MAX_EVAC_WALKERS);
  });
  it('evacFinish mempercepat sisa warga lalu menetapkan keadaan akhir', async () => {
    const { view } = make(4);
    await runOp(view, 'evacStart', 14000);
    const r = await runOp(view, 'evacFinish', 14000);
    expect(r.done).toBe(true); expect(dbg(view).walkMode).toBe('done');
    expect(dbg(view).walkers.every(w => w.status === 'gone' || w.status === 'gathered')).toBe(true);
    view.apply(flagsAt(5));
    expect(dbg(view).walkMode).toBe('done');
  });
  it('batas waktu: bila update tidak pernah berjalan (mis. scene macet) op tetap selesai dan keadaan dipaksa akhir', async () => {
    const { view } = make(3);
    let done = false; void view.handleAction('evacStart').then(() => { done = true; });
    await vi.advanceTimersByTimeAsync(14000);
    expect(done).toBe(true);
    expect(dbg(view).gateLocked).toBe(false); expect(dbg(view).scripted).toEqual([]);
    expect(dbg(view).named.velthia).toEqual({ x: 640, y: 250 });
  });
  it('batas waktu kamera: pan yang tidak pernah selesai tidak mengunci cerita', async () => {
    const { view } = make(0); scene.panCompletes = false;
    let done = false; void view.handleAction('crisisOpen').then(() => { done = true; });
    await vi.advanceTimersByTimeAsync(15000);
    expect(done).toBe(true);
  });
  it('destroy: menyelesaikan op yang menggantung, membersihkan pewaktu, idempoten', async () => {
    const { view } = make(0);
    let done = false; void view.handleAction('crisisOpen').then(() => { done = true; });
    await pump(view, 500);
    view.destroy(); view.destroy();
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    expect(scene.cam._follow).toBe(scene.follow); // kamera dikembalikan ke pemain
    await expect(view.handleAction('evacStart')).resolves.toBeUndefined();
  });
  it('shutdown scene memicu destroy', async () => {
    const { view } = make(0);
    let done = false; void view.handleAction('crisisOpen').then(() => { done = true; });
    scene.events.emit('shutdown');
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toBe(true); void view;
  });
  it('op tidak dikenal dan torvanFace langsung selesai', async () => {
    const { view } = make(6);
    expect((await runOp(view, 'tidak_ada', 1000)).done).toBe(true);
    expect((await runOp(view, 'torvanFace', 2000)).done).toBe(true);
    expect((await runOp(view, 'hitch', 2000, 300)).done).toBe(true);
    expect((await runOp(view, 'focus', 2000, 'gate')).done).toBe(true);
    expect((await runOp(view, 'release', 2000)).done).toBe(true);
  });
  it('jalur adegan dipakai view ada dan berujung pada posisi tahap berikutnya', () => {
    expect(SCRIPT_PATHS.velthiaToCouncil.at(-1)).toEqual([640, 250]);
    expect(SCRIPT_PATHS.azieToCouncil.at(-1)).toEqual([584, 268]);
    expect(SCRIPT_PATHS.talricToGate.at(-1)).toEqual([604, 1152]);
  });
});
