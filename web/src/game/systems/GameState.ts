import { AREA_IDS, CHAPTER_IDS, CHARACTER_IDS, type AreaId, type ChapterId, type CharacterId } from '../data/ids';

export const GAME_STATE_VERSION = 1;
export const MAX_PARTY_SIZE = 2; // GDD: party aktif maksimal dua

export type Facing = 'up' | 'down' | 'left' | 'right';

/**
 * Data murni dan serializable (hanya ID, flags, angka). Tidak boleh berisi instance Phaser.
 * Field gameplay lain (EXP, inventory, skill, quest) ditambahkan di Phase 3 lewat migrasi versi.
 */
export interface GameStateData {
  schemaVersion: typeof GAME_STATE_VERSION;
  chapter: ChapterId;
  area: AreaId;
  position: { x: number; y: number; facing: Facing };
  party: CharacterId[];
  flags: Record<string, boolean>;
  /** Inventaris minimal Phase 1 (hanya hitungan per ID item); inventaris penuh = Phase 3. */
  items: Record<string, number>;
  playtimeSec: number;
}

export function createNewGameData(): GameStateData {
  return {
    schemaVersion: GAME_STATE_VERSION,
    chapter: 'I',
    area: 'forest_1',
    position: { x: 0, y: 0, facing: 'down' },
    party: ['C01'], // Chapter I: hanya Yaric (Torvan bergabung di Chapter II)
    flags: {},
    items: {},
    playtimeSec: 0,
  };
}

const FACINGS: readonly Facing[] = ['up', 'down', 'left', 'right'];

/** Validasi ketat data tak tepercaya. Mengembalikan null jika bentuknya tidak valid. */
export function validateGameStateData(raw: unknown): GameStateData | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (r.schemaVersion !== GAME_STATE_VERSION) return null;
  if (!(CHAPTER_IDS as readonly unknown[]).includes(r.chapter)) return null;
  if (!(AREA_IDS as readonly unknown[]).includes(r.area)) return null;

  const pos = r.position as Record<string, unknown> | null;
  if (typeof pos !== 'object' || pos === null) return null;
  if (typeof pos.x !== 'number' || !Number.isFinite(pos.x)) return null;
  if (typeof pos.y !== 'number' || !Number.isFinite(pos.y)) return null;
  if (!(FACINGS as readonly unknown[]).includes(pos.facing)) return null;

  if (!Array.isArray(r.party) || r.party.length === 0 || r.party.length > MAX_PARTY_SIZE) return null;
  if (!r.party.every((p) => (CHARACTER_IDS as readonly unknown[]).includes(p))) return null;
  if (new Set(r.party).size !== r.party.length) return null;

  if (typeof r.flags !== 'object' || r.flags === null || Array.isArray(r.flags)) return null;
  const flags: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(r.flags as Record<string, unknown>)) {
    if (typeof v !== 'boolean') return null;
    flags[k] = v;
  }

  // items opsional (save lama tanpa items dianggap kosong)
  const items: Record<string, number> = {};
  if (r.items !== undefined) {
    if (typeof r.items !== 'object' || r.items === null || Array.isArray(r.items)) return null;
    for (const [k, v] of Object.entries(r.items as Record<string, unknown>)) {
      if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) return null;
      items[k] = v;
    }
  }

  if (typeof r.playtimeSec !== 'number' || !Number.isFinite(r.playtimeSec) || r.playtimeSec < 0) return null;

  return {
    schemaVersion: GAME_STATE_VERSION,
    chapter: r.chapter as ChapterId,
    area: r.area as AreaId,
    position: { x: pos.x, y: pos.y, facing: pos.facing as Facing },
    party: [...(r.party as CharacterId[])],
    flags,
    items,
    playtimeSec: r.playtimeSec,
  };
}

/** State sesi berjalan. Phase 0: hanya New Game di memori; belum ada gameplay yang menulis save. */
export class GameState {
  private data: GameStateData | null = null;

  get isActive(): boolean {
    return this.data !== null;
  }

  startNewGame(): GameStateData {
    this.data = createNewGameData();
    return this.snapshot()!;
  }

  load(data: GameStateData): void {
    this.data = structuredClone(data);
  }

  snapshot(): GameStateData | null {
    return this.data ? structuredClone(this.data) : null;
  }

  clear(): void {
    this.data = null;
  }

  // ---- akses terarah untuk gameplay (selalu butuh game aktif) ----
  private need(): GameStateData {
    if (!this.data) throw new Error('GameState tidak aktif: panggil startNewGame()/load() dulu.');
    return this.data;
  }

  hasFlag(flag: string): boolean {
    return this.data?.flags[flag] === true;
  }

  /** Idempoten: mengembalikan true hanya saat flag baru benar-benar berubah dari false ke true. */
  setFlag(flag: string): boolean {
    const d = this.need();
    if (d.flags[flag] === true) return false;
    d.flags[flag] = true;
    return true;
  }

  itemCount(item: string): number {
    return this.data?.items[item] ?? 0;
  }

  addItem(item: string, count = 1): void {
    const d = this.need();
    d.items[item] = (d.items[item] ?? 0) + count;
  }

  setPosition(x: number, y: number, facing: Facing, area?: AreaId): void {
    const d = this.need();
    d.position = { x: Math.round(x), y: Math.round(y), facing };
    if (area) d.area = area;
  }
}
