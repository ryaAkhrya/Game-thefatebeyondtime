import type { Settings } from '../data/settingsSchema';
import { findCue } from '../data/musicRegistry';
import { SFX_REGISTRY, type SfxCue } from '../data/sfxRegistry';
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
  setSfxVolume?(volume: number): void;
  /** Memutar SFX sekali dengan laju (playbackRate) tertentu. Bila tidak ada, AudioManager memakai playLoop(key, volume, false). */
  playSfx?(key: string, volume: number, rate: number): void;
  /** Membuka AudioContext setelah gesture pemain. */
  resume(): void;
}

export type PlayBgmResult =
  | 'playing'
  | 'silent_unknown_track'
  | 'silent_awaiting_composer'
  | 'silent_not_loaded'
  | 'silent_locked';

/** Hasil playSfx: 'playing' atau alasan senyap. Tidak pernah melempar. */
export type SfxResult = PlayBgmResult | 'silent_rate_limited' | 'silent_voice_cap' | 'silent_muted';

export interface SfxPlayOptions {
  /** pengali volume 0..1 di atas Settings x gain cue */
  volume?: number;
  /** laju pemutaran (1 = normal); dibatasi 0.5..2 */
  rate?: number;
}

/** Menjepit angka ke [lo, hi]; NaN/Infinity/bukan-angka -> fallback (tidak pernah meneruskan NaN ke backend). */
function clampFinite(x: number | undefined, lo: number, hi: number, fallback: number): number {
  if (typeof x !== 'number' || !Number.isFinite(x)) return fallback;
  return Math.min(hi, Math.max(lo, x));
}

/** Batas suara SFX yang boleh terdengar bersamaan; selebihnya dilewati (bukan ditumpuk). */
export const MAX_SFX_VOICES = 8;
const RECENT_LOG = 24;

export interface AudioDebug {
  unlocked: boolean;
  activeVoices: number;
  totalPlayed: number;
  played: Record<string, number>;
  suppressed: Record<string, Record<string, number>>;
  lastPlayed: string | null;
  recent: Array<{ id: string; key: string; volume: number; rate: number; t: number }>;
}

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
  private readonly cueById: Map<string, SfxCue>;
  private readonly lastPlayedAt = new Map<string, number>();
  private readonly lastVariant = new Map<string, number>();
  private voices: number[] = []; // waktu selesai (ms) tiap suara SFX aktif
  private rngState = 0x9e3779b9;
  private readonly playedCount: Record<string, number> = {};
  private readonly suppressedCount: Record<string, Record<string, number>> = {};
  private readonly recent: AudioDebug['recent'] = [];
  private lastPlayedId: string | null = null;
  private totalPlayed = 0;

  constructor(
    private readonly settings: SettingsRepository,
    private readonly backend: SoundBackend,
    private readonly log: (msg: string) => void = () => {},
    private readonly now: () => number = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
    cues: readonly SfxCue[] = SFX_REGISTRY,
    private readonly maxVoices: number = MAX_SFX_VOICES,
  ) {
    this.cueById = new Map(cues.map(c => [c.id, c]));
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

  /**
   * Memutar SFX ORIGINAL dari SFX_REGISTRY. Tidak pernah melempar; bila senyap mengembalikan alasannya.
   * Urutan pemeriksaan: id dikenal -> sudah ada gesture -> cue READY -> file dimuat -> tidak mute -> interval minimum -> batas suara.
   * Variasi (files.length > 1) dipilih acak deterministik tanpa pengulangan langsung.
   */
  playSfx(id: string, opts: SfxPlayOptions = {}): SfxResult {
    try {
      return this.playSfxUnsafe(id, opts);
    } catch (err) {
      this.suppress(id, 'error');
      this.log(`[audio] ${id}: error ${String(err)}`);
      return 'silent_not_loaded';
    }
  }

  /** Versi boolean dari playSfx: true hanya bila suara benar-benar dimulai. */
  tryPlaySfx(id: string, opts?: SfxPlayOptions): boolean {
    return this.playSfx(id, opts) === 'playing';
  }

  /** Ringkasan untuk QA/E2E: berapa kali tiap id diputar atau ditahan (dan kenapa). */
  debug(): AudioDebug {
    const t = this.now();
    this.voices = this.voices.filter(e => e > t);
    return {
      unlocked: this.unlocked,
      activeVoices: this.voices.length,
      totalPlayed: this.totalPlayed,
      played: { ...this.playedCount },
      suppressed: Object.fromEntries(Object.entries(this.suppressedCount).map(([k, v]) => [k, { ...v }])),
      lastPlayed: this.lastPlayedId,
      recent: this.recent.map(r => ({ ...r })),
    };
  }

  resetDebug(): void {
    for (const k of Object.keys(this.playedCount)) delete this.playedCount[k];
    for (const k of Object.keys(this.suppressedCount)) delete this.suppressedCount[k];
    this.recent.length = 0;
    this.lastPlayedId = null;
    this.totalPlayed = 0;
  }

  private playSfxUnsafe(id: string, opts: SfxPlayOptions): SfxResult {
    const cue = this.cueById.get(id);
    if (!cue) { this.suppress(id, 'unknown'); return this.silent(id, 'silent_unknown_track'); }
    if (!this.unlocked) { this.suppress(id, 'locked'); return 'silent_locked'; }
    if (cue.status !== 'READY') { this.suppress(id, 'not_ready'); return this.silent(id, 'silent_awaiting_composer'); }
    const pick = this.pickKey(cue);
    if (pick === null) { this.suppress(id, 'not_loaded'); return this.silent(id, 'silent_not_loaded'); }
    const key = pick.key;
    const base = effectiveVolume(this.settings.snapshot(), 'sfx');
    if (base <= 0) { this.suppress(id, 'muted'); return 'silent_muted'; }
    const t = this.now();
    const last = this.lastPlayedAt.get(id);
    if (last !== undefined && t - last < cue.minIntervalMs) { this.suppress(id, 'rate_limited'); return 'silent_rate_limited'; }
    this.voices = this.voices.filter(e => e > t);
    if (this.voices.length >= this.maxVoices) { this.suppress(id, 'voice_cap'); return 'silent_voice_cap'; }
    const rate = clampFinite(opts.rate, 0.5, 2, 1);
    const volume = Math.min(1, Math.max(0, base * cue.gain * clampFinite(opts.volume, 0, 1, 1)));
    if (this.backend.playSfx) this.backend.playSfx(key, volume, rate);
    else this.backend.playLoop(key, volume, false);
    // Status variasi hanya di-commit bila suara BENAR-BENAR dimulai: percobaan yang ditahan (rate limit/voice cap/mute)
    // tidak boleh menggeser "variasi terakhir" sehingga pemutaran berikutnya mengulang variasi yang sama.
    this.lastVariant.set(id, pick.index);
    this.rngState = pick.rngState;
    this.lastPlayedAt.set(id, t);
    this.voices.push(t + (cue.durationMs ?? 1000) / rate);
    this.playedCount[id] = (this.playedCount[id] ?? 0) + 1;
    this.totalPlayed++;
    this.lastPlayedId = id;
    this.recent.push({ id, key, volume, rate, t });
    if (this.recent.length > RECENT_LOG) this.recent.shift();
    return 'playing';
  }

  /**
   * Key Phaser: id (satu file) atau id#i (variasi). Memilih variasi yang sudah dimuat, berbeda dari yang terakhir diputar bila bisa.
   * Murni (tanpa efek samping): pemanggil meng-commit `index`/`rngState` hanya setelah suara dimulai.
   */
  private pickKey(cue: SfxCue): { key: string; index: number; rngState: number } | null {
    const n = cue.files.length;
    if (n === 0) return null;
    const keyOf = (i: number) => (n === 1 ? cue.id : `${cue.id}#${i}`);
    const loaded: number[] = [];
    for (let i = 0; i < n; i++) if (this.backend.has(keyOf(i))) loaded.push(i);
    if (loaded.length === 0) return null;
    const last = this.lastVariant.get(cue.id);
    const pool = loaded.length > 1 ? loaded.filter(i => i !== last) : loaded;
    const rngState = (Math.imul(this.rngState, 1664525) + 1013904223) >>> 0;
    const index = pool[Math.floor((rngState / 4294967296) * pool.length)]!;
    return { key: keyOf(index), index, rngState };
  }

  private suppress(id: string, reason: string): void {
    const m = (this.suppressedCount[id] ??= {});
    m[reason] = (m[reason] ?? 0) + 1;
  }

  private applyVolumes(): void {
    this.backend.setBgmVolume(effectiveVolume(this.settings.snapshot(), 'bgm'));
    this.backend.setSfxVolume?.(effectiveVolume(this.settings.snapshot(), 'sfx'));
  }

  private silent(trackId: string, r: Exclude<PlayBgmResult, 'playing' | 'silent_locked'>): PlayBgmResult {
    if (!this.warned.has(trackId)) {
      this.warned.add(trackId); // satu log per track, tidak membanjiri console
      this.log(`[audio] ${trackId}: ${r}`);
    }
    return r;
  }
}
