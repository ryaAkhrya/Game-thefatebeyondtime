import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: { Scenes: { Events: { SHUTDOWN: 'shutdown' } } } }));

import { FakeScene } from './helpers/fakeScene';
import { AveloriaC4View } from '../../src/game/world/AveloriaC4View';
import { loadAveloriaC4, AVELORIA_C4_SPAWN, C4_HIDE_AVE, C4_ITEMS, C4_NAMED, C4_RESIDENTS } from '../../src/game/world/aveloriaC4';
import { footBox } from '../../src/game/world/Collision';
import { C4 } from '../../src/game/story/chapter4Flags';
import { CITY_FLAG as F } from '../../src/game/story/aveloriaFlags';
import { C2 } from '../../src/game/story/chapter2Flags';
import { C3 } from '../../src/game/story/chapter3Flags';
import type { Interactable } from '../../src/game/world/Interaction';

const BASE_FLAGS = [F.vista, F.gate, F.archive, F.velthia, F.complete, C2.start, C2.farewell, C2.complete, C3.start, C3.departed, C3.velthiaJoined, C4.start, C4.returned];
const flags = (...extra: string[]): Record<string, boolean> => Object.fromEntries([...BASE_FLAGS, ...extra].map(f => [f, true]));

interface Dbg {
  area: string; dusk: string; items: number; itemsTotal: number; missingTextures: number; hiddenBase: string[]; dustAnims: number; fireAnims: number;
  residents: { id: string; x: number; y: number; visible: boolean; interactive: boolean }[]; named: Record<string, { x: number; y: number } | null>;
  interactables: string[]; cameraDetached: boolean; pendingOps: number;
}
interface FakeBase { texture: { key: string }; frame: { name: string }; x: number; y: number; visible: boolean; setVisible(v: boolean): void }

let scene: FakeScene;
function make(extra: string[] = []): { view: AveloriaC4View; loaded: ReturnType<typeof loadAveloriaC4>; interactables: Interactable[]; baseImages: FakeBase[] } {
  scene = new FakeScene();
  scene.textureKeys.add('town_c4'); scene.textureKeys.add('town_aveloria');
  const baseImages: FakeBase[] = [
    ...C4_HIDE_AVE.map(h => ({ texture: { key: 'town_aveloria' }, frame: { name: h.f }, x: h.x, y: h.y, visible: true, setVisible(v: boolean) { this.visible = v; } })),
    { texture: { key: 'town_aveloria' }, frame: { name: 'ave_tree_tall' }, x: 140, y: 1290, visible: true, setVisible(v: boolean) { this.visible = v; } }, // pohon lain tidak boleh ikut hilang
  ];
  (scene as unknown as { children: { list: FakeBase[] } }).children = { list: baseImages };
  const loaded = loadAveloriaC4();
  const interactables = loaded.interactables.map(i => ({ ...i }));
  const view = new AveloriaC4View(scene as never, loaded, interactables);
  view.apply(flags(...extra));
  return { view, loaded, interactables, baseImages };
}
const dbg = (v: AveloriaC4View): Dbg => v.debug() as Dbg;
const player = { x: AVELORIA_C4_SPAWN.x, y: AVELORIA_C4_SPAWN.y, facing: 'down' as const };
async function pump(view: AveloriaC4View, ms: number, step = 50): Promise<void> {
  for (let t = 0; t < ms; t += step) { scene.now += step; view.update(player, false, step, false); await vi.advanceTimersByTimeAsync(step); }
}
async function runOp(view: AveloriaC4View, op: string, limitMs: number, arg?: string | number): Promise<{ done: boolean; at: number }> {
  let done = false; const p = view.handleAction(op, arg).then(() => { done = true; });
  let t = 0;
  while (!done && t < limitMs) { await pump(view, 100, 50); t += 100; }
  await p.catch(() => undefined);
  return { done, at: t };
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('AveloriaC4View: keadaan visual dari flag (apply)', () => {
  it('membangun seluruh item, warga, dan NPC bernama; tidak ada tekstur hilang', () => {
    const { view } = make(); const d = dbg(view);
    expect(d.area).toBe('aveloria_c4'); expect(d.missingTextures).toBe(0);
    expect(d.items).toBe(C4_ITEMS.length); expect(d.itemsTotal).toBe(C4_ITEMS.length);
    expect(d.residents.length).toBe(C4_RESIDENTS.length + 1); // + penjaga gerbang dalam
    expect(d.dustAnims).toBe(2); expect(d.fireAnims).toBe(1);
    for (const id of Object.keys(C4_NAMED) as (keyof typeof C4_NAMED)[]) expect(d.named[id], id).toMatchObject({ x: C4_NAMED[id].x, y: C4_NAMED[id].y });
  });

  it('menyembunyikan menara, lonceng, portcullis, dan dua pohon penghalang; pohon lain tidak tersentuh', () => {
    const { view, baseImages } = make(); const d = dbg(view);
    expect(d.hiddenBase.length).toBe(C4_HIDE_AVE.length);
    for (const b of baseImages.slice(0, C4_HIDE_AVE.length)) expect(b.visible, b.frame.name).toBe(false);
    expect(baseImages[baseImages.length - 1]!.visible).toBe(true);
  });

  it('kota tua kosong dan dijaga: warga grafis lama tersembunyi; gerbang terbuka tidak mengurung; portal Liora, meja laporan dan pintu istana mati', () => {
    const { loaded, interactables } = make();
    expect(loaded.collision.hasDynamic('city_gate')).toBe(false);
    for (const id of ['liora_exit', 'reports', 'palace_door', 'porter', 'vendor', 'sweeper', 'guard']) expect(interactables.find(i => i.id === id)?.enabled, id).toBe(false);
    for (const r of C4_RESIDENTS) expect(interactables.find(i => i.id === r.id)?.enabled, r.id).toBe(true);
    expect(loaded.collision.hasDynamic('resident:porter')).toBe(false);
  });

  it('NPC dan warga mendapat collision footprint; pemain tidak bisa berdiri di atas mereka', () => {
    const { loaded } = make();
    for (const p of Object.values(C4_NAMED)) expect(loaded.collision.canStand(footBox(p.x, p.y)), `${p.x},${p.y}`).toBe(false);
    for (const r of C4_RESIDENTS) { expect(loaded.collision.hasDynamic(`c4res:${r.id}`)).toBe(true); expect(loaded.collision.canStand(footBox(r.x, r.y))).toBe(false); }
    expect(loaded.collision.canStand(footBox(AVELORIA_C4_SPAWN.x, AVELORIA_C4_SPAWN.y))).toBe(true);
  });

  it('kotak interaksi mengikuti sprite NPC dan semuanya aktif', () => {
    const { view, interactables } = make(); const d = dbg(view);
    for (const id of ['talric', 'azie', 'velthia', 'derrria', 'c4_roster', 'c4_bell', 'c4_fence_sign', 'city_sign', ...C4_RESIDENTS.map(r => r.id)]) expect(d.interactables, id).toContain(id);
    const azie = interactables.find(i => i.id === 'azie')!;
    expect(azie.x).toBeLessThan(C4_NAMED.azie.x); expect(azie.x + azie.w).toBeGreaterThan(C4_NAMED.azie.x);
    expect(d.interactables).not.toContain('liora_exit');
  });

  it('senja pelan sesudah adegan kembali: arrived -> seen -> complete (apply berulang idempoten)', () => {
    const { view } = make();
    expect(dbg(view).dusk).toBe('arrived');
    view.apply(flags(C4.returnSeen)); expect(dbg(view).dusk).toBe('seen');
    view.apply(flags(C4.returnSeen)); view.apply(flags(C4.returnSeen)); expect(dbg(view).dusk).toBe('seen');
    view.apply(flags(C4.returnSeen, C4.complete)); expect(dbg(view).dusk).toBe('complete');
    // muat langsung dari save yang sudah selesai: tanpa tween, langsung keadaan akhir
    const direct = make([C4.returnSeen, C4.complete]); expect(dbg(direct.view).dusk).toBe('complete');
    const before = dbg(direct.view).residents.map(r => `${r.id}:${r.x},${r.y}`).join('|');
    direct.view.apply(flags(C4.returnSeen, C4.complete)); expect(dbg(direct.view).residents.map(r => `${r.id}:${r.x},${r.y}`).join('|')).toBe(before);
  });

  it('animasi debu dan api berganti frame seiring waktu; warga menoleh tanpa pindah tempat', async () => {
    const { view } = make();
    const created = scene.created.filter(o => /^c4_(dust|cookfire)/.test(o.frame));
    expect(created.length).toBe(3);
    const f0 = created.map(o => o.frame);
    await pump(view, 900);
    expect(created.map(o => o.frame)).not.toEqual(f0);
    const d0 = dbg(view).residents.map(r => `${r.x},${r.y}`);
    await pump(view, 20000);
    expect(dbg(view).residents.map(r => `${r.x},${r.y}`)).toEqual(d0);
  });
});

describe('AveloriaC4View: koreografi kamera (handleAction)', () => {
  it('returnOpen: menyapu reruntuhan -> penampungan lalu kembali ke pemain; selesai di bawah batas dan bersih', async () => {
    const { view } = make();
    const r = await runOp(view, 'returnOpen', 15000);
    expect(r.done).toBe(true); expect(r.at).toBeLessThanOrEqual(10000);
    expect(dbg(view).cameraDetached).toBe(false); expect(dbg(view).pendingOps).toBe(0);
    expect(scene.cam._follow).toBe(scene.follow); // kamera mengikuti pemain lagi
  });

  it('batas waktu: pan kamera yang tidak pernah selesai tetap menyelesaikan op dan memulihkan kamera', async () => {
    const { view } = make(); scene.panCompletes = false;
    const r = await runOp(view, 'returnOpen', 16000);
    expect(r.done).toBe(true); expect(r.at).toBeLessThanOrEqual(15000);
    expect(dbg(view).cameraDetached).toBe(false); expect(dbg(view).pendingOps).toBe(0);
  });

  it('focus/release dan op tidak dikenal tidak menahan cerita', async () => {
    const { view } = make();
    for (const [op, arg] of [['focus', 'ruin'], ['focus', 'camp'], ['focus', 'gate'], ['release', undefined], ['tidak_dikenal', undefined]] as const) {
      const r = await runOp(view, op, 6000, arg); expect(r.done, op).toBe(true);
    }
    expect(dbg(view).cameraDetached).toBe(false);
  });

  it('destroy di tengah op menyelesaikan janji, membersihkan timer, dan idempoten; SHUTDOWN scene juga membersihkan', async () => {
    const { view } = make();
    let done = false; void view.handleAction('returnOpen').then(() => { done = true; });
    await pump(view, 300); view.destroy(); await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(true); expect(vi.getTimerCount()).toBe(0); view.destroy();
    await expect(view.handleAction('returnOpen')).resolves.toBeUndefined();
    const b = make(); let done2 = false; void b.view.handleAction('returnOpen').then(() => { done2 = true; });
    await pump(b.view, 200); scene.events.emit('shutdown'); await vi.advanceTimersByTimeAsync(0);
    expect(done2).toBe(true); expect(vi.getTimerCount()).toBe(0);
  });
});
