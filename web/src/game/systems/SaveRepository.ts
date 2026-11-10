import { SAVE_STORAGE_PREFIX } from '../config/constants';
import type { AreaId, ChapterId } from '../data/ids';
import { migrateLegacyGameState, validateGameStateData, type GameStateData } from './GameState';
import type { StorageLike } from './StorageAdapter';

export const SAVE_SCHEMA_VERSION = 'save_v2';

export const SAVE_SLOTS = ['auto', 'slot1', 'slot2', 'slot3'] as const;
export type SaveSlot = (typeof SAVE_SLOTS)[number];

export interface SaveSummary {
  chapter: ChapterId;
  area: AreaId;
  playtimeSec: number;
}

interface SaveEnvelope {
  schema: typeof SAVE_SCHEMA_VERSION;
  slot: SaveSlot;
  savedAt: string; // ISO 8601
  summary: SaveSummary;
  checksum: string;
  data: GameStateData;
}

export type SaveReadResult =
  | { status: 'ok'; savedAt: string; summary: SaveSummary; data: GameStateData; migrated?: boolean; recovered?: boolean }
  | { status: 'empty' }
  | { status: 'corrupt'; reason: string }
  | { status: 'unsupported_version'; found: string }
  | { status: 'storage_unavailable' };

export type SaveWriteResult = { ok: true } | { ok: false; reason: 'storage_unavailable' | 'write_failed' };

/** Checksum ringan FNV-1a (deteksi korupsi tidak sengaja, bukan keamanan). */
export function checksumOf(data: unknown): string {
  const text = JSON.stringify(data);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * Repository save berversi. Storage terpisah dari Settings (prefix berbeda).
 * v2 preserves the original storage keys and reads legacy v1 without rewriting it.
 * State tidak dimodifikasi sebelum payload lulus validasi.
 */
export class SaveRepository {
  constructor(private readonly storage: StorageLike | null) {}

  get isAvailable(): boolean {
    return this.storage !== null;
  }

  private keyOf(slot: SaveSlot): string {
    return `${SAVE_STORAGE_PREFIX}${slot}`;
  }

  read(slot: SaveSlot): SaveReadResult {
    if (!this.storage) return { status: 'storage_unavailable' };
    let text: string | null;
    try {
      text = this.storage.getItem(this.keyOf(slot));
    } catch {
      return { status: 'storage_unavailable' };
    }
    const result: SaveReadResult = text === null ? { status: 'empty' } : this.decode(text, slot);
    if (result.status === 'ok') return result;
    try {
      const backup = this.storage.getItem(`${this.keyOf(slot)}.backup`);
      const recovered = backup ? this.decode(backup, slot) : null;
      if (recovered?.status === 'ok') return { ...recovered, recovered: true };
    } catch { /* original result remains available */ }
    return result;
  }

  private decode(text: string, slot: SaveSlot): SaveReadResult {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { status: 'corrupt', reason: 'JSON tidak valid' };
    }
    if (typeof parsed !== 'object' || parsed === null) return { status: 'corrupt', reason: 'bukan objek' };
    const env = parsed as Partial<SaveEnvelope>;
    if (String(env.schema) !== SAVE_SCHEMA_VERSION && String(env.schema) !== 'save_v1') {
      return { status: 'unsupported_version', found: String(env.schema) };
    }
    if (env.slot !== slot) return { status: 'corrupt', reason: 'slot tidak cocok' };
    if (!env.data || env.checksum !== checksumOf(env.data)) return { status: 'corrupt', reason: 'checksum tidak cocok' };
    const legacy = String(env.schema) === 'save_v1';
    const data = legacy ? migrateLegacyGameState(env.data) : validateGameStateData(env.data);
    if (!data || (!legacy && env.data.schemaVersion !== 2)) return { status: 'corrupt', reason: 'data game tidak valid' };
    if (typeof env.savedAt !== 'string' || Number.isNaN(Date.parse(env.savedAt))) {
      return { status: 'corrupt', reason: 'savedAt tidak valid' };
    }
    return {
      status: 'ok',
      savedAt: env.savedAt,
      summary: { chapter: data.chapter, area: data.area, playtimeSec: data.playtimeSec },
      data,
      ...(legacy ? { migrated: true } : {}),
    };
  }

  write(slot: SaveSlot, data: GameStateData, now: Date = new Date()): SaveWriteResult {
    if (!this.storage) return { ok: false, reason: 'storage_unavailable' };
    const valid = validateGameStateData(data);
    if (!valid) return { ok: false, reason: 'write_failed' };
    if (!Number.isFinite(now.getTime())) return { ok: false, reason: 'write_failed' };
    const env: SaveEnvelope = {
      schema: SAVE_SCHEMA_VERSION,
      slot,
      savedAt: now.toISOString(),
      summary: { chapter: valid.chapter, area: valid.area, playtimeSec: valid.playtimeSec },
      checksum: checksumOf(valid),
      data: valid,
    };
    const key = this.keyOf(slot);
    let previous: string | null = null;
    let attemptedWrite = false;
    try {
      previous = this.storage.getItem(key);
      if (previous) {
        const old = this.decode(previous, slot);
        if (old.status === 'unsupported_version') return { ok: false, reason: 'write_failed' };
        if (old.status === 'ok') this.storage.setItem(`${key}.backup`, previous);
      }
      const serialized = JSON.stringify(env);
      attemptedWrite = true;
      this.storage.setItem(key, serialized);
      if (this.storage.getItem(key) !== serialized) throw new Error('Save verification failed');
      return { ok: true };
    } catch {
      if (!attemptedWrite) return { ok: false, reason: 'write_failed' };
      // rollback best-effort agar save lama tidak rusak
      try {
        if (previous !== null) this.storage.setItem(key, previous);
        else this.storage.removeItem(key);
      } catch {
        /* diabaikan */
      }
      return { ok: false, reason: 'write_failed' };
    }
  }

  /** Slot yang berisi save valid. */
  listValid(): SaveSlot[] {
    return SAVE_SLOTS.filter((s) => this.read(s).status === 'ok');
  }

  /** Slot valid terbaru berdasarkan savedAt, atau null. Dipakai tombol Lanjut. */
  latestValid(): { slot: SaveSlot; savedAt: string; summary: SaveSummary; data: GameStateData } | null {
    let best: { slot: SaveSlot; savedAt: string; summary: SaveSummary; data: GameStateData } | null = null;
    for (const slot of SAVE_SLOTS) {
      const r = this.read(slot);
      if (r.status !== 'ok') continue;
      if (!best || Date.parse(r.savedAt) > Date.parse(best.savedAt)) {
        best = { slot, savedAt: r.savedAt, summary: r.summary, data: r.data };
      }
    }
    return best;
  }

  hasValidSave(): boolean {
    return this.latestValid() !== null;
  }
}
