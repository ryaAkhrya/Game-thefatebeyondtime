import { describe, expect, it } from 'vitest';
import { SAVE_STORAGE_PREFIX } from '../../src/game/config/constants';
import { GameState, createNewGameData, migrateLegacyGameState, validateGameStateData } from '../../src/game/systems/GameState';
import { STARTER_ITEMS } from '../../src/game/rpg/definitions';
import { SaveRepository, checksumOf } from '../../src/game/systems/SaveRepository';
import { MemoryStorage } from '../../src/game/systems/StorageAdapter';

// Semua tes memakai MemoryStorage terpisah: tidak menyentuh save pemain sebenarnya.

describe('GameState', () => {
  it('New Game: Chapter I, hanya Yaric (C01), hutan 1', () => {
    const gs = new GameState();
    expect(gs.isActive).toBe(false);
    const d = gs.startNewGame();
    expect(d.chapter).toBe('I');
    expect(d.area).toBe('forest_1');
    expect(d.party).toEqual(['C01']);
    expect(gs.isActive).toBe(true);
  });

  it('snapshot adalah salinan (mutasi tidak bocor)', () => {
    const gs = new GameState();
    gs.startNewGame();
    const snap = gs.snapshot()!;
    snap.flags['x'] = true;
    expect(gs.snapshot()!.flags).toEqual({});
  });
});

describe('validateGameStateData', () => {
  it('menerima data awal', () => {
    expect(validateGameStateData(createNewGameData())).not.toBeNull();
  });
  it.each([
    ['null', null],
    ['versi salah', { ...createNewGameData(), schemaVersion: 3 }],
    ['chapter tak dikenal', { ...createNewGameData(), chapter: 'V' }],
    ['area tak dikenal', { ...createNewGameData(), area: 'mars' }],
    ['party kosong', { ...createNewGameData(), party: [] }],
    ['party > 2', { ...createNewGameData(), party: ['C01', 'C02', 'C03'] }],
    ['party duplikat', { ...createNewGameData(), party: ['C01', 'C01'] }],
    ['party ID tak dikenal', { ...createNewGameData(), party: ['C99'] }],
    ['posisi NaN', { ...createNewGameData(), position: { x: Number.NaN, y: 0, facing: 'up' } }],
    ['facing salah', { ...createNewGameData(), position: { x: 0, y: 0, facing: 'diagonal' } }],
    ['flag bukan boolean', { ...createNewGameData(), flags: { a: 'ya' } }],
    ['playtime negatif', { ...createNewGameData(), playtimeSec: -1 }],
    ['items bukan integer', { ...createNewGameData(), items: { potion: 1.5 } }],
    ['items negatif', { ...createNewGameData(), items: { potion: -1 } }],
    ['items bukan objek', { ...createNewGameData(), items: [1] }],
  ])('menolak: %s', (_n, bad) => {
    expect(validateGameStateData(bad)).toBeNull();
  });
});

describe('SaveRepository', () => {
  it('kosong -> empty dan hasValidSave false (Lanjut harus nonaktif)', () => {
    const repo = new SaveRepository(new MemoryStorage());
    expect(repo.read('slot1').status).toBe('empty');
    expect(repo.hasValidSave()).toBe(false);
    expect(repo.latestValid()).toBeNull();
  });

  it('tulis lalu baca (round trip) dan checksum valid', () => {
    const repo = new SaveRepository(new MemoryStorage());
    const data = createNewGameData();
    data.flags['met_nambo'] = true;
    expect(repo.write('slot1', data, new Date('2026-11-10T10:00:00Z')).ok).toBe(true);
    const r = repo.read('slot1');
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.data.flags['met_nambo']).toBe(true);
      expect(r.savedAt).toBe('2026-11-10T10:00:00.000Z');
      expect(r.summary).toEqual({ chapter: 'I', area: 'forest_1', playtimeSec: 0 });
    }
    expect(repo.hasValidSave()).toBe(true);
  });

  it('latestValid memilih savedAt terbaru', () => {
    const repo = new SaveRepository(new MemoryStorage());
    repo.write('slot1', createNewGameData(), new Date('2026-01-01T00:00:00Z'));
    repo.write('auto', createNewGameData(), new Date('2026-06-01T00:00:00Z'));
    repo.write('slot2', createNewGameData(), new Date('2026-03-01T00:00:00Z'));
    expect(repo.latestValid()?.slot).toBe('auto');
  });

  it('JSON korup -> corrupt, tidak crash, bukan save valid', () => {
    const storage = new MemoryStorage();
    storage.setItem(`${SAVE_STORAGE_PREFIX}slot1`, '{{{');
    const repo = new SaveRepository(storage);
    expect(repo.read('slot1').status).toBe('corrupt');
    expect(repo.hasValidSave()).toBe(false);
  });

  it('checksum tidak cocok -> corrupt', () => {
    const storage = new MemoryStorage();
    const repo = new SaveRepository(storage);
    repo.write('slot1', createNewGameData());
    const key = `${SAVE_STORAGE_PREFIX}slot1`;
    const env = JSON.parse(storage.getItem(key)!);
    env.data.playtimeSec = 99999; // dimodifikasi tanpa memperbarui checksum
    storage.setItem(key, JSON.stringify(env));
    const r = repo.read('slot1');
    expect(r.status).toBe('corrupt');
  });

  it('data game invalid di dalam envelope -> corrupt', () => {
    const storage = new MemoryStorage();
    const bad = { ...createNewGameData(), party: [] };
    storage.setItem(
      `${SAVE_STORAGE_PREFIX}slot1`,
      JSON.stringify({ schema: 'save_v1', slot: 'slot1', savedAt: new Date().toISOString(), checksum: checksumOf(bad), data: bad }),
    );
    expect(new SaveRepository(storage).read('slot1').status).toBe('corrupt');
  });

  it('versi skema berbeda -> unsupported_version', () => {
    const storage = new MemoryStorage();
    storage.setItem(`${SAVE_STORAGE_PREFIX}slot1`, JSON.stringify({ schema: 'save_v7' }));
    const r = new SaveRepository(storage).read('slot1');
    expect(r).toEqual({ status: 'unsupported_version', found: 'save_v7' });
  });

  it('storage null -> storage_unavailable, write gagal dengan alasan', () => {
    const repo = new SaveRepository(null);
    expect(repo.isAvailable).toBe(false);
    expect(repo.read('auto').status).toBe('storage_unavailable');
    expect(repo.write('auto', createNewGameData())).toEqual({ ok: false, reason: 'storage_unavailable' });
    expect(repo.hasValidSave()).toBe(false);
  });

  it('write menolak data invalid dan tidak menimpa save lama', () => {
    const storage = new MemoryStorage();
    const repo = new SaveRepository(storage);
    repo.write('slot1', createNewGameData());
    const before = storage.getItem(`${SAVE_STORAGE_PREFIX}slot1`);
    const res = repo.write('slot1', { ...createNewGameData(), party: [] });
    expect(res.ok).toBe(false);
    expect(storage.getItem(`${SAVE_STORAGE_PREFIX}slot1`)).toBe(before);
  });
});

describe('Kompatibilitas items (Phase 1)', () => {
  it('save lama tanpa items valid dan items menjadi kosong', () => {
    const old = JSON.parse(JSON.stringify(createNewGameData()));
    old.schemaVersion = 1;
    delete old.items;
    expect(migrateLegacyGameState(old)?.items).toEqual(STARTER_ITEMS);
  });
  it('items tersimpan dan terbaca kembali bersama flag cerita', () => {
    const repo = new SaveRepository(new MemoryStorage());
    const d = createNewGameData();
    d.items['potion'] = 1;
    d.flags['story.c1_awake'] = true;
    expect(repo.write('slot1', d).ok).toBe(true);
    const r = repo.read('slot1');
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.data.items).toEqual({ ...STARTER_ITEMS, potion: 1 });
      expect(r.data.flags['story.c1_awake']).toBe(true);
    }
  });
});
