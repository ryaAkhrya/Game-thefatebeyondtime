import { describe, expect, it } from 'vitest';
import { AudioManager, MAX_SFX_VOICES, type SoundBackend } from '../../src/game/systems/AudioManager';
import { SettingsRepository } from '../../src/game/systems/SettingsRepository';
import { MemoryStorage } from '../../src/game/systems/StorageAdapter';
import type { SfxCue } from '../../src/game/data/sfxRegistry';

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
