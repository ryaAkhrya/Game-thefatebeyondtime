import { describe, expect, it } from 'vitest';
import { AudioManager, MAX_SFX_VOICES, type SoundBackend } from '../../src/game/systems/AudioManager';
import { SettingsRepository } from '../../src/game/systems/SettingsRepository';
import { MemoryStorage } from '../../src/game/systems/StorageAdapter';
import { SFX_REGISTRY, type SfxCue } from '../../src/game/data/sfxRegistry';

const CUES: SfxCue[] = [
  { id: 'SFX_A', files: ['a.wav'], minIntervalMs: 100, gain: 0.5, durationMs: 300, status: 'READY' },
  { id: 'SFX_STEP', files: ['s1.wav', 's2.wav', 's3.wav'], minIntervalMs: 50, gain: 1, durationMs: 100, status: 'READY' },
  { id: 'SFX_LONG', files: ['l.wav'], minIntervalMs: 0.001, gain: 1, durationMs: 2000, status: 'READY' },
  { id: 'SFX_MISSING', files: ['m.wav'], minIntervalMs: 10, gain: 1, status: 'MISSING' },
  { id: 'SFX_NOT_LOADED', files: ['n.wav'], minIntervalMs: 10, gain: 1, status: 'READY' },
];
const LOADED = ['SFX_A', 'SFX_STEP#0', 'SFX_STEP#1', 'SFX_STEP#2', 'SFX_LONG'];

function setup(opts: { loaded?: string[]; withPlaySfx?: boolean; maxVoices?: number } = {}) {
  const calls: string[] = [];
  const sfx: Array<{ key: string; volume: number; rate: number }> = [];
  const loaded = opts.loaded ?? LOADED;
  const backend: SoundBackend = {
    has: k => loaded.includes(k),
    playLoop: (k, v, loop) => calls.push(`loop:${k}:${v.toFixed(3)}:${loop}`),
    stop: () => calls.push('stop'),
    setBgmVolume: () => {},
    resume: () => calls.push('resume'),
    ...(opts.withPlaySfx ? { playSfx: (key: string, volume: number, rate: number) => { sfx.push({ key, volume, rate }); } } : {}),
  };
  let t = 1000;
  const settings = new SettingsRepository(new MemoryStorage());
  const audio = new AudioManager(settings, backend, () => {}, () => t, CUES, opts.maxVoices);
  return { audio, settings, calls, sfx, advance: (ms: number) => { t += ms; } };
}

describe('AudioManager.playSfx', () => {
  it('terkunci sebelum gesture: false, tidak ada bunyi, tidak melempar; setelah unlock berbunyi', () => {
    const { audio, calls } = setup();
    expect(audio.playSfx('SFX_A')).toBe('silent_locked');
    expect(audio.tryPlaySfx('SFX_A')).toBe(false);
    expect(calls).toEqual([]);
    audio.unlock();
    expect(audio.tryPlaySfx('SFX_A')).toBe(true);
    expect(audio.debug().suppressed['SFX_A']).toEqual({ locked: 2 });
  });

  it('id tidak dikenal, MISSING, atau berkas belum dimuat -> senyap tanpa melempar', () => {
    const { audio, calls } = setup();
    audio.unlock();
    expect(audio.playSfx('NOPE')).toBe('silent_unknown_track');
    expect(audio.playSfx('SFX_MISSING')).toBe('silent_awaiting_composer');
    expect(audio.playSfx('SFX_NOT_LOADED')).toBe('silent_not_loaded');
    expect(calls.filter(c => c.startsWith('loop'))).toEqual([]);
  });

  it('backend yang melempar tidak membuat playSfx melempar', () => {
    const { audio } = setup();
    audio.unlock();
    const boom = new AudioManager(new SettingsRepository(new MemoryStorage()), { has: () => true, playLoop: () => { throw new Error('ctx'); }, stop: () => {}, setBgmVolume: () => {}, resume: () => {} }, () => {}, () => 0, CUES);
    boom.unlock();
    expect(() => boom.playSfx('SFX_A')).not.toThrow();
    expect(boom.tryPlaySfx('SFX_A')).toBe(false);
  });

  it('volume = master x SFX x gain x opts.volume; rate dibatasi 0.5..2', () => {
    const { audio, settings, sfx, advance } = setup({ withPlaySfx: true });
    audio.unlock();
    settings.set('master_volume', 50); settings.set('sfx_volume', 80);
    expect(audio.playSfx('SFX_A', { volume: 0.5, rate: 3 })).toBe('playing');
    expect(sfx[0]!.volume).toBeCloseTo(0.5 * 0.8 * 0.5 * 0.5);
    expect(sfx[0]!.rate).toBe(2);
    advance(200);
    audio.playSfx('SFX_A', { rate: 0.1 });
    expect(sfx[1]!.rate).toBe(0.5);
  });

  it('memakai playLoop(key, volume, false) bila backend tanpa playSfx', () => {
    const { audio, calls } = setup();
    audio.unlock();
    audio.playSfx('SFX_A');
    expect(calls).toContain('loop:SFX_A:0.400:false'); // master 100% x SFX 80% (bawaan) x gain 0.5
  });

  it('mute memaksa senyap tanpa mengubah slider dan tanpa menghitung sebagai diputar', () => {
    const { audio, settings, calls, advance } = setup();
    audio.unlock();
    settings.set('mute_all', true);
    expect(audio.playSfx('SFX_A')).toBe('silent_muted');
    expect(calls.filter(c => c.startsWith('loop'))).toEqual([]);
    expect(audio.debug().totalPlayed).toBe(0);
    settings.set('mute_all', false);
    advance(1);
    expect(audio.playSfx('SFX_A')).toBe('playing');
  });

  it('pembatasan laju per id memakai minIntervalMs; id lain tidak terpengaruh', () => {
    const { audio, advance } = setup();
    audio.unlock();
    expect(audio.playSfx('SFX_A')).toBe('playing');
    advance(50);
    expect(audio.playSfx('SFX_A')).toBe('silent_rate_limited');
    expect(audio.playSfx('SFX_STEP')).toBe('playing');
    advance(50);
    expect(audio.playSfx('SFX_A')).toBe('playing');
    const d = audio.debug();
    expect(d.played['SFX_A']).toBe(2);
    expect(d.suppressed['SFX_A']).toEqual({ rate_limited: 1 });
  });

  it('variasi dipilih tanpa pengulangan langsung dan memakai key id#i', () => {
    const { audio, calls, advance } = setup();
    audio.unlock();
    const keys: string[] = [];
    for (let i = 0; i < 40; i++) { audio.playSfx('SFX_STEP'); advance(60); keys.push(calls.at(-1)!.split(':')[1]!); }
    for (let i = 1; i < keys.length; i++) expect(keys[i]).not.toBe(keys[i - 1]);
    expect(new Set(keys)).toEqual(new Set(['SFX_STEP#0', 'SFX_STEP#1', 'SFX_STEP#2']));
  });

  it('hanya variasi yang dimuat yang dipilih', () => {
    const { audio, calls, advance } = setup({ loaded: ['SFX_STEP#1'] });
    audio.unlock();
    for (let i = 0; i < 5; i++) { audio.playSfx('SFX_STEP'); advance(60); }
    expect(new Set(calls.filter(c => c.startsWith('loop')).map(c => c.split(':')[1]))).toEqual(new Set(['SFX_STEP#1']));
  });

  it('batas suara bersamaan: lewati bila penuh, pulih setelah suara selesai', () => {
    const { audio, advance } = setup({ maxVoices: 3 });
    audio.unlock();
    expect(MAX_SFX_VOICES).toBeGreaterThan(3);
    for (let i = 0; i < 3; i++) { expect(audio.playSfx('SFX_LONG')).toBe('playing'); advance(1); }
    expect(audio.playSfx('SFX_LONG')).toBe('silent_voice_cap');
    expect(audio.debug().activeVoices).toBe(3);
    advance(2100);
    expect(audio.debug().activeVoices).toBe(0);
    expect(audio.playSfx('SFX_LONG')).toBe('playing');
  });

  it('debug(): jumlah diputar/ditahan, lastPlayed, recent, resetDebug', () => {
    const { audio, advance } = setup();
    audio.unlock();
    audio.playSfx('SFX_A'); advance(10); audio.playSfx('SFX_A'); advance(200); audio.playSfx('SFX_STEP');
    const d = audio.debug();
    expect(d.unlocked).toBe(true);
    expect(d.totalPlayed).toBe(2);
    expect(d.lastPlayed).toBe('SFX_STEP');
    expect(d.recent.map(r => r.id)).toEqual(['SFX_A', 'SFX_STEP']);
    audio.resetDebug();
    expect(audio.debug()).toMatchObject({ totalPlayed: 0, played: {}, suppressed: {}, lastPlayed: null });
  });
});

describe('AudioManager.playSfx: perilaku tambahan (Phase 8)', () => {
  const VARS: SfxCue[] = [
    { id: 'SFX_TWO', files: ['t1.wav', 't2.wav'], minIntervalMs: 100, gain: 1, durationMs: 50, status: 'READY' },
    ...Array.from({ length: 10 }, (_, i): SfxCue => ({ id: `SFX_L${i}`, files: ['l.wav'], minIntervalMs: 1, gain: 1, durationMs: 5000, status: 'READY' })),
  ];
  const LOADED_VARS = ['SFX_TWO#0', 'SFX_TWO#1', ...Array.from({ length: 10 }, (_, i) => `SFX_L${i}`)];
  function make(cues: SfxCue[] = VARS, loaded: string[] = LOADED_VARS, extra: Partial<SoundBackend> = {}) {
    const plays: Array<{ key: string; volume: number; rate: number }> = [];
    const sfxVolumes: number[] = [];
    const resumes: number[] = [];
    const backend: SoundBackend = {
      has: k => loaded.includes(k),
      playLoop: () => { throw new Error('tidak boleh dipakai: backend punya playSfx'); },
      stop: () => {}, setBgmVolume: () => {},
      setSfxVolume: v => { sfxVolumes.push(v); },
      resume: () => { resumes.push(1); },
      playSfx: (key, volume, rate) => { plays.push({ key, volume, rate }); },
      ...extra,
    };
    let t = 5000;
    const settings = new SettingsRepository(new MemoryStorage());
    const audio = new AudioManager(settings, backend, () => {}, () => t, cues);
    return { audio, settings, plays, sfxVolumes, resumes, advance: (ms: number) => { t += ms; } };
  }

  it('unlock() hanya sekali: resume dipanggil satu kali walau dipanggil berulang; resume yang melempar tidak membuka error', () => {
    const { audio, resumes } = make();
    audio.unlock(); audio.unlock(); audio.unlock();
    expect(resumes.length).toBe(1);
    const throwing = make(VARS, LOADED_VARS, { resume: () => { throw new Error('AudioContext'); } });
    expect(() => throwing.audio.unlock()).not.toThrow();
    expect(throwing.audio.isUnlocked).toBe(true);
    expect(throwing.audio.playSfx('SFX_L0')).toBe('playing');
  });

  it('volume SFX backend mengikuti Settings (awal, master, SFX, mute) tanpa menyentuh slider saat mute', () => {
    const { settings, sfxVolumes } = make();
    expect(sfxVolumes.at(-1)).toBeCloseTo(0.8); // master 100% x SFX 80% (bawaan)
    settings.set('master_volume', 50);
    expect(sfxVolumes.at(-1)).toBeCloseTo(0.4);
    settings.set('sfx_volume', 10);
    expect(sfxVolumes.at(-1)).toBeCloseTo(0.05);
    settings.set('mute_all', true);
    expect(sfxVolumes.at(-1)).toBe(0);
    expect(settings.get('sfx_volume')).toBe(10);
    settings.set('mute_all', false);
    expect(sfxVolumes.at(-1)).toBeCloseTo(0.05);
  });

  it('REGRESI: percobaan yang ditahan (rate limit) tidak menggeser variasi terakhir -> tidak ada pengulangan langsung yang terdengar', () => {
    const { audio, plays, advance } = make();
    audio.unlock();
    for (let i = 0; i < 30; i++) {
      expect(audio.playSfx('SFX_TWO')).toBe('playing');
      advance(10);
      expect(audio.playSfx('SFX_TWO')).toBe('silent_rate_limited'); // percobaan ditahan
      advance(120);
    }
    const keys = plays.map(p => p.key);
    expect(keys.length).toBe(30);
    for (let i = 1; i < keys.length; i++) expect(keys[i], `urutan ke-${i}`).not.toBe(keys[i - 1]);
  });

  it('REGRESI: mute juga tidak menggeser variasi dan tidak memakai interval', () => {
    const { audio, settings, plays, advance } = make();
    audio.unlock();
    audio.playSfx('SFX_TWO'); advance(150);
    settings.set('mute_all', true);
    for (let i = 0; i < 5; i++) expect(audio.playSfx('SFX_TWO')).toBe('silent_muted');
    settings.set('mute_all', false);
    expect(audio.playSfx('SFX_TWO')).toBe('playing'); // interval tidak "terpakai" oleh percobaan mute
    expect(plays.length).toBe(2);
    expect(plays[1]!.key).not.toBe(plays[0]!.key);
  });

  it('REGRESI: volume/rate NaN atau Infinity tidak diteruskan ke backend (jatuh ke bawaan) dan suara tetap dihitung aktif', () => {
    const { audio, plays, advance } = make();
    audio.unlock();
    expect(audio.playSfx('SFX_L0', { volume: Number.NaN, rate: Number.NaN })).toBe('playing');
    advance(2);
    expect(audio.playSfx('SFX_L1', { volume: Number.POSITIVE_INFINITY, rate: Number.NEGATIVE_INFINITY })).toBe('playing');
    for (const p of plays) { expect(Number.isFinite(p.volume)).toBe(true); expect(Number.isFinite(p.rate)).toBe(true); }
    expect(plays[0]!.volume).toBeCloseTo(0.8); expect(plays[0]!.rate).toBe(1);
    expect(audio.debug().activeVoices).toBe(2);
  });

  it('batas bawaan 8 suara bersamaan (MAX_SFX_VOICES): suara ke-9 dilewati', () => {
    const { audio, advance } = make();
    audio.unlock();
    expect(MAX_SFX_VOICES).toBe(8);
    for (let i = 0; i < 8; i++) { expect(audio.playSfx(`SFX_L${i}`)).toBe('playing'); advance(2); }
    expect(audio.playSfx('SFX_L8')).toBe('silent_voice_cap');
    expect(audio.debug().suppressed['SFX_L8']).toEqual({ voice_cap: 1 });
  });

  it('backend.has yang melempar tidak membuat playSfx melempar', () => {
    const { audio } = make(VARS, [], { has: () => { throw new Error('has'); } });
    audio.unlock();
    expect(() => audio.playSfx('SFX_L0')).not.toThrow();
    expect(audio.tryPlaySfx('SFX_L0')).toBe(false);
    expect(audio.debug().suppressed['SFX_L0']).toEqual({ error: 2 });
  });

  it('key hilang untuk semua variasi -> senyap tanpa melempar dan tanpa memutar', () => {
    const { audio, plays } = make(VARS, []);
    audio.unlock();
    expect(audio.playSfx('SFX_TWO')).toBe('silent_not_loaded');
    expect(audio.playSfx('SFX_L0')).toBe('silent_not_loaded');
    expect(plays).toEqual([]);
  });
});

describe('AudioManager dengan SFX_REGISTRY asli: id Bab IV', () => {
  const P8 = [
    'SFX_FORTRESS_DOOR_ANCIENT', 'SFX_SEAL_ACTIVATE', 'SFX_SEAL_ERROR', 'SFX_ECHO_MEMORY', 'SFX_VARLGRIM_STAFF_SWING', 'SFX_VARLGRIM_STAFF_IMPACT',
    'SFX_TEMPORAL_BIND', 'SFX_TIME_DISTORTION', 'SFX_BOSS_PHASE_SHIFT', 'SFX_FRACTURE_MARK', 'SFX_METEOR_CHARGE', 'SFX_METEOR_DESCENT',
    'SFX_METEOR_IMPACT', 'SFX_AEGIS_CAST', 'SFX_AEGIS_FORM', 'SFX_AEGIS_STRESS', 'SFX_AEGIS_FADE', 'SFX_HEART_LOCK', 'SFX_HEART_UNSEAL',
    'SFX_TOWER_COLLAPSE_DISTANT', 'SFX_RIFTBORN_ATTACK', 'SFX_GRAVORN_ATTACK', 'SFX_BATTLE_TRANSITION_FINAL',
  ];
  const allKeys = SFX_REGISTRY.flatMap(c => (c.files.length === 1 ? [c.id] : c.files.map((_, i) => `${c.id}#${i}`)));
  function make(loaded: readonly string[] = allKeys) {
    const plays: Array<{ key: string; volume: number }> = [];
    let t = 1000;
    const backend: SoundBackend = {
      has: k => loaded.includes(k), playLoop: () => {}, stop: () => {}, setBgmVolume: () => {}, resume: () => {},
      playSfx: (key, volume) => { plays.push({ key, volume }); },
    };
    const audio = new AudioManager(new SettingsRepository(new MemoryStorage()), backend, () => {}, () => t);
    return { audio, plays, advance: (ms: number) => { t += ms; } };
  }

  it('setiap id Bab IV terkunci sebelum gesture, lalu berbunyi dengan key benar dan volume = master x SFX x gain', () => {
    const { audio, plays, advance } = make();
    for (const id of P8) expect(audio.playSfx(id), id).toBe('silent_locked');
    expect(plays).toEqual([]);
    audio.unlock();
    for (const id of P8) {
      const cue = SFX_REGISTRY.find(c => c.id === id)!;
      expect(audio.playSfx(id), id).toBe('playing');
      const p = plays.at(-1)!;
      if (cue.files.length === 1) expect(p.key).toBe(cue.id); else expect(p.key).toMatch(new RegExp(`^${cue.id}#[0-${cue.files.length - 1}]$`));
      expect(p.volume).toBeCloseTo(0.8 * cue.gain, 5);
      advance(6000); // lewati interval & kosongkan suara
    }
    expect(audio.debug().totalPlayed).toBe(P8.length);
  });

  it('urutan meteor (cast, form, charge, descent, impact, stress) tumpang tindih tanpa terpotong batas suara; tidak ada BGM', () => {
    const { audio, plays, advance } = make();
    audio.unlock();
    expect(audio.playSfx('SFX_AEGIS_CAST')).toBe('playing'); advance(2400);
    expect(audio.playSfx('SFX_AEGIS_FORM')).toBe('playing'); advance(100);
    expect(audio.playSfx('SFX_METEOR_CHARGE')).toBe('playing'); advance(1800);
    expect(audio.playSfx('SFX_METEOR_DESCENT')).toBe('playing'); advance(1900);
    expect(audio.playSfx('SFX_METEOR_IMPACT')).toBe('playing');
    expect(audio.playSfx('SFX_AEGIS_STRESS')).toBe('playing'); advance(1000);
    expect(audio.playSfx('SFX_RIFTBORN_ATTACK')).toBe('playing');
    expect(audio.debug().activeVoices).toBeLessThanOrEqual(8);
    expect(plays.every(p => !p.key.startsWith('BGM'))).toBe(true);
  });

  it('berkas Bab IV yang belum dimuat (aset gagal dimuat) -> senyap, tidak melempar', () => {
    const { audio, plays } = make(allKeys.filter(k => !k.startsWith('SFX_METEOR_IMPACT')));
    audio.unlock();
    expect(audio.playSfx('SFX_METEOR_IMPACT')).toBe('silent_not_loaded');
    expect(plays).toEqual([]);
  });

  it('batas laju: SFX_METEOR_IMPACT tidak bisa dibunyikan dua kali dalam 3 s', () => {
    const { audio, advance } = make();
    audio.unlock();
    expect(audio.playSfx('SFX_METEOR_IMPACT')).toBe('playing'); advance(1500);
    expect(audio.playSfx('SFX_METEOR_IMPACT')).toBe('silent_rate_limited'); advance(1600);
    expect(audio.playSfx('SFX_METEOR_IMPACT')).toBe('playing');
  });
});
