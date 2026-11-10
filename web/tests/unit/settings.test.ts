import { describe, expect, it } from 'vitest';
import { SAVE_STORAGE_PREFIX, SETTINGS_STORAGE_KEY } from '../../src/game/config/constants';
import { DEFAULT_SETTINGS, clampVolume, sanitizeSettings } from '../../src/game/data/settingsSchema';
import { SettingsRepository } from '../../src/game/systems/SettingsRepository';
import { MemoryStorage, probeStorage, type StorageLike } from '../../src/game/systems/StorageAdapter';

class ThrowingStorage implements StorageLike {
  length = 0;
  getItem(): string | null {
    throw new Error('SecurityError');
  }
  setItem(): void {
    throw new Error('QuotaExceeded');
  }
  removeItem(): void {
    throw new Error('x');
  }
  key(): string | null {
    return null;
  }
}

/** Storage yang bisa dibaca tetapi menolak menulis (quota penuh). */
class ReadOnlyStorage extends MemoryStorage {
  override setItem(): void {
    throw new Error('QuotaExceededError');
  }
}

describe('default settings (GDD)', () => {
  it('sesuai tabel GDD bagian 7', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      master_volume: 100,
      bgm_volume: 70,
      sfx_volume: 80,
      mute_all: false,
      text_speed: 'normal',
      fullscreen: false,
      screen_scale: 'fit',
      screen_shake: true,
      reduced_flashes: true,
    });
  });
});

describe('clampVolume / sanitizeSettings', () => {
  it('membulatkan ke step 5 dan membatasi 0..100', () => {
    expect(clampVolume(52)).toBe(50);
    expect(clampVolume(53)).toBe(55);
    expect(clampVolume(-20)).toBe(0);
    expect(clampVolume(999)).toBe(100);
    expect(clampVolume(Number.NaN)).toBe(0);
  });

  it('nilai invalid jatuh ke default per-key, nilai valid tetap', () => {
    const s = sanitizeSettings({ master_volume: 'keras', bgm_volume: 35, text_speed: 'turbo', screen_shake: false, screen_scale: 'pixel_perfect' });
    expect(s.master_volume).toBe(100);
    expect(s.bgm_volume).toBe(35);
    expect(s.text_speed).toBe('normal');
    expect(s.screen_shake).toBe(false);
    expect(s.screen_scale).toBe('pixel_perfect');
  });

  it('input bukan objek -> default', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('x')).toEqual(DEFAULT_SETTINGS);
  });
});

describe('SettingsRepository', () => {
  it('menyimpan dan memuat ulang (simulasi refresh)', () => {
    const storage = new MemoryStorage();
    const a = new SettingsRepository(storage);
    a.set('bgm_volume', 40);
    a.set('text_speed', 'instant');
    a.set('mute_all', true);
    a.set('screen_scale', 'pixel_perfect');
    a.set('screen_shake', false);
    a.set('reduced_flashes', false);

    const b = new SettingsRepository(storage); // "refresh"
    expect(b.snapshot()).toMatchObject({
      bgm_volume: 40,
      text_speed: 'instant',
      mute_all: true,
      screen_scale: 'pixel_perfect',
      screen_shake: false,
      reduced_flashes: false,
    });
    expect(b.isPersistent).toBe(true);
  });

  it('nudgeVolume memakai step 5 dan tidak keluar rentang', () => {
    const r = new SettingsRepository(new MemoryStorage());
    r.nudgeVolume('sfx_volume', 5);
    expect(r.get('sfx_volume')).toBe(85);
    for (let i = 0; i < 30; i++) r.nudgeVolume('sfx_volume', 5);
    expect(r.get('sfx_volume')).toBe(100);
    for (let i = 0; i < 40; i++) r.nudgeVolume('sfx_volume', -5);
    expect(r.get('sfx_volume')).toBe(0);
  });

  it('JSON korup -> default, tidak crash, ditandai recovered', () => {
    const storage = new MemoryStorage();
    storage.setItem(SETTINGS_STORAGE_KEY, '{ bukan json');
    const r = new SettingsRepository(storage);
    expect(r.snapshot()).toEqual(DEFAULT_SETTINGS);
    expect(r.recoveredFromCorruption).toBe(true);
  });

  it('versi skema tidak dikenal -> default', () => {
    const storage = new MemoryStorage();
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ schema: 'settings_v99', values: { master_volume: 5 } }));
    const r = new SettingsRepository(storage);
    expect(r.get('master_volume')).toBe(100);
    expect(r.recoveredFromCorruption).toBe(true);
  });

  it('storage null (tidak tersedia) tetap berfungsi di memori, non-persistent', () => {
    const r = new SettingsRepository(null);
    expect(r.isPersistent).toBe(false);
    r.set('master_volume', 20);
    expect(r.get('master_volume')).toBe(20);
  });

  it('storage yang melempar saat dibaca/ditulis tidak membuat crash', () => {
    const r = new SettingsRepository(new ThrowingStorage());
    expect(r.isPersistent).toBe(false);
    expect(() => r.set('bgm_volume', 10)).not.toThrow();
    expect(r.get('bgm_volume')).toBe(10);
  });

  it('gagal menulis (quota) -> isPersistent false namun nilai tetap berlaku', () => {
    const r = new SettingsRepository(new ReadOnlyStorage());
    r.set('sfx_volume', 10);
    expect(r.isPersistent).toBe(false);
    expect(r.get('sfx_volume')).toBe(10);
  });

  it('listener dipanggil saat berubah, tidak saat nilai sama', () => {
    const r = new SettingsRepository(new MemoryStorage());
    const calls: string[] = [];
    r.subscribe((_s, k) => calls.push(String(k)));
    r.set('bgm_volume', 70); // sama dengan default
    r.set('bgm_volume', 60);
    expect(calls).toEqual(['bgm_volume']);
  });

  it('Reset Defaults mengembalikan settings dan TIDAK menyentuh save', () => {
    const storage = new MemoryStorage();
    const saveKey = `${SAVE_STORAGE_PREFIX}slot1`;
    storage.setItem(saveKey, '{"pura-pura":"save"}');
    storage.setItem('kunci.lain', 'x');

    const r = new SettingsRepository(storage);
    r.set('master_volume', 10);
    r.set('mute_all', true);
    r.resetToDefaults();

    expect(r.snapshot()).toEqual(DEFAULT_SETTINGS);
    expect(storage.getItem(saveKey)).toBe('{"pura-pura":"save"}');
    expect(storage.getItem('kunci.lain')).toBe('x');
    // dan persisten sebagai default
    expect(new SettingsRepository(storage).snapshot()).toEqual(DEFAULT_SETTINGS);
  });

  it('mengubah settings tidak pernah menulis ke key save', () => {
    const storage = new MemoryStorage();
    const r = new SettingsRepository(storage);
    r.set('bgm_volume', 10);
    const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i));
    expect(keys.every((k) => k !== null && !k.startsWith(SAVE_STORAGE_PREFIX))).toBe(true);
  });
});

describe('probeStorage', () => {
  it('null bila getter melempar (mis. SecurityError)', () => {
    expect(probeStorage(() => { throw new Error('SecurityError'); })).toBeNull();
  });
  it('null bila storage menolak menulis', () => {
    expect(probeStorage(() => new ReadOnlyStorage())).toBeNull();
  });
  it('null bila tidak ada storage', () => {
    expect(probeStorage(() => null)).toBeNull();
  });
  it('mengembalikan storage yang berfungsi dan membersihkan kunci probe', () => {
    const s = new MemoryStorage();
    expect(probeStorage(() => s)).toBe(s);
    expect(s.length).toBe(0);
  });
});
