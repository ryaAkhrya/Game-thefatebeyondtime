import { SETTINGS_STORAGE_KEY } from '../config/constants';
import {
  DEFAULT_SETTINGS,
  clampVolume,
  sanitizeSettings,
  type SettingKey,
  type Settings,
} from '../data/settingsSchema';
import type { StorageLike } from './StorageAdapter';

export const SETTINGS_SCHEMA_VERSION = 'settings_v1';

interface SettingsEnvelope {
  schema: typeof SETTINGS_SCHEMA_VERSION;
  values: Settings;
}

export type SettingsListener = (settings: Readonly<Settings>, changed: SettingKey | 'all') => void;

/**
 * Menyimpan Settings di localStorage (key `tfbt.settings.v1`), terpisah dari story save.
 * - Boot memuat dan memvalidasi; data hilang/korup -> default (tidak crash).
 * - Storage null/menolak menulis -> tetap bekerja di memori, `isPersistent` = false.
 * - Hanya menyentuh SETTINGS_STORAGE_KEY; tidak pernah menyentuh save.
 */
export class SettingsRepository {
  private values: Settings = { ...DEFAULT_SETTINGS };
  private readonly listeners = new Set<SettingsListener>();
  private persistent: boolean;
  private loadedFromCorrupt = false;

  constructor(private readonly storage: StorageLike | null) {
    this.persistent = storage !== null;
    this.load();
  }

  /** false bila storage tidak tersedia atau gagal menulis; UI menampilkan peringatan. */
  get isPersistent(): boolean {
    return this.persistent;
  }

  /** true bila data tersimpan ditemukan tetapi tidak valid dan diganti default. */
  get recoveredFromCorruption(): boolean {
    return this.loadedFromCorrupt;
  }

  get<K extends SettingKey>(key: K): Settings[K] {
    return this.values[key];
  }

  snapshot(): Readonly<Settings> {
    return { ...this.values };
  }

  set<K extends SettingKey>(key: K, value: Settings[K]): void {
    const next = sanitizeSettings({ ...this.values, [key]: value });
    if (next[key] === this.values[key]) return;
    this.values = next;
    this.save();
    this.emit(key);
  }

  /** Mengubah volume satu langkah (+/- step). */
  nudgeVolume(key: 'master_volume' | 'bgm_volume' | 'sfx_volume', delta: number): void {
    this.set(key, clampVolume(this.values[key] + delta));
  }

  /** Reset hanya settings. Tidak menyentuh save game. */
  resetToDefaults(): void {
    this.values = { ...DEFAULT_SETTINGS };
    this.save();
    this.emit('all');
  }

  subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(changed: SettingKey | 'all'): void {
    const snap = this.snapshot();
    for (const l of this.listeners) l(snap, changed);
  }

  private load(): void {
    if (!this.storage) return;
    let text: string | null;
    try {
      text = this.storage.getItem(SETTINGS_STORAGE_KEY);
    } catch {
      this.persistent = false;
      return;
    }
    if (text === null) return;
    try {
      const parsed: unknown = JSON.parse(text);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        (parsed as { schema?: unknown }).schema === SETTINGS_SCHEMA_VERSION
      ) {
        this.values = sanitizeSettings((parsed as { values?: unknown }).values);
        return;
      }
      this.loadedFromCorrupt = true; // versi/struktur tidak dikenal
    } catch {
      this.loadedFromCorrupt = true;
    }
  }

  private save(): void {
    if (!this.storage) return;
    const env: SettingsEnvelope = { schema: SETTINGS_SCHEMA_VERSION, values: this.values };
    try {
      this.storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(env));
    } catch {
      this.persistent = false; // quota/diblokir: lanjut di memori
    }
  }
}
