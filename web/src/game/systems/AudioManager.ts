import type { Settings } from '../data/settingsSchema';
import { findCue } from '../data/musicRegistry';
import type { SettingsRepository } from './SettingsRepository';

export type AudioChannel = 'bgm' | 'sfx';

/** Volume efektif 0..1 = master x channel; mute memaksa 0 tanpa mengubah posisi slider. */
export function effectiveVolume(s: Readonly<Settings>, channel: AudioChannel): number {
  if (s.mute_all) return 0;
  const ch = channel === 'bgm' ? s.bgm_volume : s.sfx_volume;
  return (s.master_volume / 100) * (ch / 100);
}

/** Antarmuka minimal ke mesin audio (Phaser Sound Manager di runtime, palsu di tes). */
export interface SoundBackend {
  /** true bila aset audio dengan key ini benar-benar sudah dimuat. */
  has(key: string): boolean;
  playLoop(key: string, volume: number, loop: boolean): void;
  stop(): void;
  setBgmVolume(volume: number): void;
  /** Membuka AudioContext setelah gesture pemain. */
  resume(): void;
}

export type PlayBgmResult =
  | 'playing'
  | 'silent_unknown_track'
  | 'silent_awaiting_composer'
  | 'silent_not_loaded'
  | 'silent_locked';

/**
 * AudioManager: ID track -> file milik Game Director. Tanpa file, semuanya senyap tanpa error.
 * - Tidak ada autoplay sebelum gesture pemain (`unlock()` dipanggil dari InputManager.onFirstGesture).
 * - Volume selalu mengikuti Settings (master x BGM, mute); tidak ada jalur audio yang mengabaikan Settings.
 * - Tidak pernah membuat suara sintetis: slider volume tidak punya bunyi demonstrasi.
 */
export class AudioManager {
  private unlocked = false;
  private currentTrack: string | null = null;
  private pendingTrack: string | null = null;
  private readonly warned = new Set<string>();

  constructor(
    private readonly settings: SettingsRepository,
    private readonly backend: SoundBackend,
    private readonly log: (msg: string) => void = () => {},
  ) {
    settings.subscribe(() => this.applyVolumes());
    this.applyVolumes();
  }

  get isUnlocked(): boolean {
    return this.unlocked;
  }

  get nowPlaying(): string | null {
    return this.currentTrack;
  }

  /** Dipanggil pada interaksi pertama. Memutar track yang tertunda bila ada. */
  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    try {
      this.backend.resume();
    } catch {
      /* AudioContext tidak tersedia: lanjut senyap */
    }
    if (this.pendingTrack) {
      const t = this.pendingTrack;
      this.pendingTrack = null;
      this.playBgm(t);
    }
  }

  playBgm(trackId: string): PlayBgmResult {
    const cue = findCue(trackId);
    if (!cue) return this.silent(trackId, 'silent_unknown_track');
    if (!this.unlocked) {
      this.pendingTrack = trackId;
      return 'silent_locked';
    }
    if (cue.status !== 'READY') return this.silent(trackId, 'silent_awaiting_composer');
    if (!this.backend.has(cue.id)) return this.silent(trackId, 'silent_not_loaded');
    if (this.currentTrack === trackId) return 'playing';
    this.backend.stop();
    this.backend.playLoop(cue.id, effectiveVolume(this.settings.snapshot(), 'bgm'), cue.loop === 'yes');
    this.currentTrack = trackId;
    return 'playing';
  }

  stopBgm(): void {
    this.pendingTrack = null;
    if (this.currentTrack) this.backend.stop();
    this.currentTrack = null;
  }

  private applyVolumes(): void {
    this.backend.setBgmVolume(effectiveVolume(this.settings.snapshot(), 'bgm'));
  }

  private silent(trackId: string, r: Exclude<PlayBgmResult, 'playing' | 'silent_locked'>): PlayBgmResult {
    if (!this.warned.has(trackId)) {
      this.warned.add(trackId); // satu log per track, tidak membanjiri console
      this.log(`[audio] ${trackId}: ${r}`);
    }
    return r;
  }
}
