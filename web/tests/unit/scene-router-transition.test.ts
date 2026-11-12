import { describe, expect, it, vi } from 'vitest';
import { SceneRouter } from '../../src/game/systems/SceneRouter';

/** Scene tiruan minimal: cukup untuk jalur goto/arrive dengan TransitionScene tiruan. */
function fake(opts: { transition?: boolean } = {}) {
  const calls: string[] = [];
  const player = {
    covered: false, ready: true,
    isReady() { return this.ready; },
    isCovered() { return this.covered; },
    cover: vi.fn(async (kind: string) => { calls.push(`cover:${kind}`); player.covered = true; }),
    reveal: vi.fn(async () => { calls.push('reveal'); player.covered = false; }),
    whenRevealed: () => Promise.resolve(),
  };
  const cam = { fadeIn: vi.fn(() => calls.push('fadeIn')), fade: vi.fn(), once: vi.fn() };
  const scene = {
    cameras: { main: cam },
    scene: { start: vi.fn((key: string) => calls.push(`start:${key}`)), manager: { getScene: () => (opts.transition === false ? null : player) } },
  };
  return { scene: scene as never, player, calls, cam };
}

describe('SceneRouter + transisi besar', () => {
  it('goto dengan transition menutup layar dulu, baru mengganti scene (tanpa fade biasa)', async () => {
    const f = fake();
    const router = new SceneRouter();
    expect(router.goto(f.scene, 'BattleScene', { encounter: 'hollowling' }, { transition: 'scripted', label: 'Hollowling' })).toBe(true);
    await Promise.resolve(); await Promise.resolve();
    expect(f.calls).toEqual(['cover:scripted', 'start:BattleScene']);
    expect(f.cam.fade).not.toHaveBeenCalled();
  });

  it('transisi ganda ditolak selama router sibuk (tidak ada encounter ganda)', () => {
    const f = fake();
    const router = new SceneRouter();
    expect(router.goto(f.scene, 'BattleScene', undefined, { transition: 'normal' })).toBe(true);
    expect(router.goto(f.scene, 'BattleScene', undefined, { transition: 'boss' })).toBe(false);
    expect(f.player.cover).toHaveBeenCalledTimes(1);
  });

  it('arrive saat layar tertutup membuka lewat overlay, bukan fadeIn; arrive biasa tetap fadeIn', async () => {
    const f = fake();
    const router = new SceneRouter();
    router.goto(f.scene, 'BattleScene', undefined, { transition: 'boss' });
    await Promise.resolve(); await Promise.resolve();
    router.arrive(f.scene);
    expect(f.player.reveal).toHaveBeenCalledTimes(1);
    expect(f.cam.fadeIn).not.toHaveBeenCalled();
    router.arrive(f.scene); // layar sudah terbuka -> jalur biasa
    expect(f.cam.fadeIn).toHaveBeenCalledTimes(1);
    expect(router.debug().busy).toBe(false);
  });

  it('tanpa overlay siap, goto jatuh ke fade lama (tidak macet)', () => {
    const f = fake({ transition: false });
    const router = new SceneRouter();
    expect(router.goto(f.scene, 'WorldScene', undefined, { transition: 'return' })).toBe(true);
    expect(f.cam.fade).toHaveBeenCalledTimes(1);
  });
});
