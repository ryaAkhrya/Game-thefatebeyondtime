import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { Effects } from '../../src/game/systems/Effects';
import { SettingsRepository } from '../../src/game/systems/SettingsRepository';
import { MemoryStorage } from '../../src/game/systems/StorageAdapter';

function fakeScene() {
  const calls: string[] = [];
  const scene = {
    cameras: {
      main: {
        shake: (d: number, i: number) => calls.push(`shake:${d}:${i}`),
        flash: (d: number) => calls.push(`flash:${d}`),
      },
    },
  } as unknown as Phaser.Scene;
  return { scene, calls };
}

describe('Effects mengikuti Settings', () => {
  it('Screen Shake ON -> kamera bergetar; OFF -> tidak ada gerak kamera', () => {
    const settings = new SettingsRepository(new MemoryStorage());
    const fx = new Effects(settings);
    const { scene, calls } = fakeScene();
    expect(fx.shake(scene, 100, 0.01)).toBe(true);
    settings.set('screen_shake', false);
    expect(fx.shake(scene, 100, 0.01)).toBe(false);
    expect(calls).toEqual(['shake:100:0.01']);
  });

  it('Reduced Flashes ON (default) -> tidak ada flash layar; OFF -> flash berjalan', () => {
    const settings = new SettingsRepository(new MemoryStorage());
    const fx = new Effects(settings);
    const { scene, calls } = fakeScene();
    expect(settings.get('reduced_flashes')).toBe(true);
    expect(fx.flash(scene)).toBe(false);
    settings.set('reduced_flashes', false);
    expect(fx.flash(scene, 60)).toBe(true);
    expect(calls).toEqual(['flash:60']);
  });
});
