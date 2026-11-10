import { SAVE_STORAGE_PREFIX } from '../config/constants';
import type { AreaId, ChapterId } from '../data/ids';
import { validateGameStateData, type GameStateData } from './GameState';
import type { StorageLike } from './StorageAdapter';

export const SAVE_SCHEMA_VERSION = 'save_v1';

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
  | { status: 'ok'; savedAt: string; summary: SaveSummary; data: GameStateData }
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
 * Phase 0: belum ada gameplay yang memanggil write(); Continue hanya aktif bila ada save VALID.
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
    if (text === null) return { status: 'empty' };

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { status: 'corrupt', reason: 'JSON tidak valid' };
    }
    if (typeof parsed !== 'object' || parsed === null) return { status: 'corrupt', reason: 'bukan objek' };
    const env = parsed as Partial<SaveEnvelope>;
    if (env.schema !== SAVE_SCHEMA_VERSION) {
      return { status: 'unsupported_version', found: String(env.schema) };
    }
    const data = validateGameStateData(env.data);
    if (!data) return { status: 'corrupt', reason: 'data game tidak valid' };
    if (env.checksum !== checksumOf(env.data)) return { status: 'corrupt', reason: 'checksum tidak cocok' };
    if (typeof env.savedAt !== 'string' || Number.isNaN(Date.parse(env.savedAt))) {
      return { status: 'corrupt', reason: 'savedAt tidak valid' };
    }
    return {
      status: 'ok',
      savedAt: env.savedAt,
      summary: { chapter: data.chapter, area: data.area, playtimeSec: data.playtimeSec },
      data,
    };
  }

  write(slot: SaveSlot, data: GameStateData, now: Date = new Date()): SaveWriteResult {
    if (!this.storage) return { ok: false, reason: 'storage_unavailable' };
    const valid = validateGameStateData(data);
    if (!valid) return { ok: false, reason: 'write_failed' };
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
    try {
      previous = this.storage.getItem(key);
      this.storage.setItem(key, JSON.stringify(env));
      return { ok: true };
    } catch {
      // rollback best-effort agar save lama tidak rusak
      try {
        if (previous !== null) this.storage.setItem(key, previous);
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
