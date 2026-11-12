import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MUSIC_REGISTRY } from '../../src/game/data/musicRegistry';
import { AudioManager, effectiveVolume, type SoundBackend } from '../../src/game/systems/AudioManager';
import { SettingsRepository } from '../../src/game/systems/SettingsRepository';
import { MemoryStorage } from '../../src/game/systems/StorageAdapter';
import { DEFAULT_SETTINGS } from '../../src/game/data/settingsSchema';
import { BATTLE_SFX } from '../../src/game/data/battleSfxRegistry';
import { SFX_REGISTRY } from '../../src/game/data/sfxRegistry';

function fakeBackend(loaded: string[] = []) {
  const calls: string[] = [];
  let bgmVolume = -1;
  const backend: SoundBackend = {
    has: (k) => loaded.includes(k),
    playLoop: (k, v, loop) => calls.push(`play:${k}:${v.toFixed(2)}:${loop}`),
    stop: () => calls.push('stop'),
    setBgmVolume: (v) => {
      bgmVolume = v;
    },
    resume: () => calls.push('resume'),
  };
  return { backend, calls, volume: () => bgmVolume };
}

describe('MUSIC_REGISTRY', () => {
  it('sama persis dengan MUSIC_REGISTRY.json di root (13 cue, semua AWAITING_COMPOSER)', () => {
    const json = JSON.parse(readFileSync(resolve(__dirname, '../../../MUSIC_REGISTRY.json'), 'utf8')) as Array<Record<string, string>>;
    expect(MUSIC_REGISTRY).toHaveLength(json.length);
    json.forEach((j, i) => {
      const c = MUSIC_REGISTRY[i]!;
      expect(c.file).toBe(j.file);
      expect(c.sceneTrigger).toBe(j.scene_trigger);
      expect(c.moodInstruments).toBe(j.mood_instruments);
      expect(c.tempoDuration).toBe(j.tempo_duration);
      expect(c.loop).toBe(j.loop);
      expect(c.priority).toBe(j.priority);
      expect(j.status).toBe('AWAITING_COMPOSER');
      expect(j.fallback).toBe('SILENCE');
    });
  });

  it('tidak ada cue READY (tidak ada musik yang dimasukkan otomatis)', () => {
    expect(MUSIC_REGISTRY.every((c) => c.status === 'AWAITING_COMPOSER')).toBe(true);
  });
});

describe('effectiveVolume', () => {
  it('master x channel; mute memaksa 0 tanpa mengubah slider', () => {
    expect(effectiveVolume({ ...DEFAULT_SETTINGS, master_volume: 50, bgm_volume: 80 }, 'bgm')).toBeCloseTo(0.4);
    expect(effectiveVolume({ ...DEFAULT_SETTINGS, master_volume: 50, sfx_volume: 40 }, 'sfx')).toBeCloseTo(0.2);
    expect(effectiveVolume({ ...DEFAULT_SETTINGS, mute_all: true }, 'bgm')).toBe(0);
  });
});

describe('AudioManager', () => {
  it('SFX battle lama kini READY dari SFX_REGISTRY; id tak dikenal dan gesture belum ada tetap aman', () => {
    const { backend, calls } = fakeBackend(BATTLE_SFX.map(c => c.id));
    const audio = new AudioManager(new SettingsRepository(new MemoryStorage()), backend);
    expect(audio.playSfx(BATTLE_SFX[0]!.id)).toBe('silent_locked'); audio.unlock();
    for (const cue of BATTLE_SFX) { expect(cue.status).toBe('READY'); expect(SFX_REGISTRY.some(c => c.id === cue.id && c.status === 'READY')).toBe(true); }
    expect(audio.playSfx('unknown')).toBe('silent_unknown_track');
    expect(calls.filter(c => c.startsWith('play')).length).toBe(0);
    expect(audio.playSfx(BATTLE_SFX[0]!.id)).toBe('playing');
  });
  it('SFX memakai master x SFX x gain dan tidak pernah loop', () => {
    const cue = SFX_REGISTRY.find(c => c.id === BATTLE_SFX[0]!.id)!;
    const settings = new SettingsRepository(new MemoryStorage()); settings.set('master_volume', 50); settings.set('sfx_volume', 40);
    const { backend, calls } = fakeBackend([cue.id]); const audio = new AudioManager(settings, backend); audio.unlock();
    expect(audio.playSfx(cue.id)).toBe('playing'); expect(calls).toContain(`play:${cue.id}:${(0.2 * cue.gain).toFixed(2)}:false`);
  });
  it('tanpa file komposer: senyap, tidak melempar, tidak memanggil play', () => {
    const settings = new SettingsRepository(new MemoryStorage());
    const { backend, calls } = fakeBackend();
    const logs: string[] = [];
    const audio = new AudioManager(settings, backend, (m) => logs.push(m));
    audio.unlock();
    expect(audio.playBgm('BGM_TITLE')).toBe('silent_awaiting_composer');
    expect(audio.playBgm('BGM_TITLE')).toBe('silent_awaiting_composer');
    expect(audio.playBgm('BGM_TIDAK_ADA')).toBe('silent_unknown_track');
    expect(calls.filter((c) => c.startsWith('play'))).toEqual([]);
    expect(logs.filter((l) => l.includes('BGM_TITLE'))).toHaveLength(1); // log sekali saja
  });

  it('tidak memutar sebelum gesture (autoplay policy); track tertunda diproses setelah unlock', () => {
    const settings = new SettingsRepository(new MemoryStorage());
    const { backend, calls } = fakeBackend();
    const audio = new AudioManager(settings, backend);
    expect(audio.playBgm('BGM_TITLE')).toBe('silent_locked');
    expect(calls).toEqual([]); // belum ada resume/play
    audio.unlock();
    expect(calls).toEqual(['resume']);
    expect(audio.isUnlocked).toBe(true);
  });

  it('volume mengikuti Settings secara langsung (master, BGM, mute) saat track hipotetis READY', () => {
    // Simulasi masa depan: cue READY + file dimuat. Registry asli tidak diubah.
    const cue = MUSIC_REGISTRY.find((c) => c.id === 'BGM_TITLE')!;
    const original = cue.status;
    (cue as { status: string }).status = 'READY';
    try {
      const settings = new SettingsRepository(new MemoryStorage());
      const { backend, calls, volume } = fakeBackend(['BGM_TITLE']);
      const audio = new AudioManager(settings, backend);
      audio.unlock();
      expect(audio.playBgm('BGM_TITLE')).toBe('playing');
      expect(calls).toContain('play:BGM_TITLE:0.70:true'); // 100% x 70%
      settings.set('master_volume', 50);
      expect(volume()).toBeCloseTo(0.35);
      settings.set('mute_all', true);
      expect(volume()).toBe(0);
      expect(settings.get('bgm_volume')).toBe(70); // slider tidak berubah
      settings.set('mute_all', false);
      expect(volume()).toBeCloseTo(0.35);
    } finally {
      (cue as { status: string }).status = original;
    }
  });

  it('file belum dimuat walau status READY -> senyap, tanpa error', () => {
    const cue = MUSIC_REGISTRY.find((c) => c.id === 'BGM_BATTLE')!;
    (cue as { status: string }).status = 'READY';
    try {
      const settings = new SettingsRepository(new MemoryStorage());
      const audio = new AudioManager(settings, fakeBackend([]).backend);
      audio.unlock();
      expect(audio.playBgm('BGM_BATTLE')).toBe('silent_not_loaded');
    } finally {
      (cue as { status: string }).status = 'AWAITING_COMPOSER';
    }
  });
});
