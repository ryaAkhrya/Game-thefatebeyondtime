import { AREA_IDS, CHAPTER_IDS, CHARACTER_IDS, type AreaId, type ChapterId, type CharacterId } from '../data/ids';
import { STARTER_ITEMS, type RpgState } from '../rpg/definitions';
import { changeItem } from '../rpg/inventory';
import { createRpgState, effectiveStats } from '../rpg/progression';
import { integer, record, validateRpg } from '../rpg/validation';
import type { RpgResult } from '../rpg/actions';

export const GAME_STATE_VERSION = 2;
export const MAX_PARTY_SIZE = 2; // GDD: party aktif maksimal dua

export type Facing = 'up' | 'down' | 'left' | 'right';

/**
 * Data murni dan serializable (hanya ID, flags, angka). Tidak boleh berisi instance Phaser.
 * Phase 3: progression, inventory, skill, equipment, vitals dan flags tervalidasi. Legacy v1 dimigrasikan terpisah.
 */
export interface GameStateData {
  schemaVersion: typeof GAME_STATE_VERSION;
  chapter: ChapterId;
  area: AreaId;
  position: { x: number; y: number; facing: Facing };
  party: CharacterId[];
  flags: Record<string, boolean>;
  /** Single shared inventory: quantities include equipment currently assigned to a slot. */
  items: Record<string, number>;
  /** Canonical v2 vitals; migration supplies defaults only for older saves. */
  vitals: { hp: number; mp: number };
  rpg: RpgState;
  storyBeat: 'C1-01' | 'C1-02' | 'C1-03' | 'C1-04' | 'C1-04-DONE';
  world: { forestWrapCount: number };
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
    items: { ...STARTER_ITEMS },
    vitals: { hp: 96, mp: 12 },
    rpg: createRpgState(),
    storyBeat: 'C1-01',
    world: { forestWrapCount: 0 },
    playtimeSec: 0,
  };
}

const FACINGS: readonly Facing[] = ['up', 'down', 'left', 'right'];

export function storyBeatFor(flags: Record<string, boolean>): GameStateData['storyBeat'] {
  if (flags['battle.first_hollowling']) return 'C1-04-DONE';
  if (flags['story.c1_loop']) return 'C1-04';
  if (flags['story.c1_nambo']) return 'C1-03';
  if (flags['story.c1_awake']) return 'C1-02';
  return 'C1-01';
}

/** Read-only migration; the original browser slot is never overwritten merely by reading it. */
export function migrateLegacyGameState(raw: unknown): GameStateData | null {
  if (!record(raw) || raw.schemaVersion !== 1 || (raw.items !== undefined && !record(raw.items))) return null;
  const flags = record(raw.flags) ? { ...raw.flags } : raw.flags;
  if (record(flags) && flags['battle.first_hollowling'] === true) flags['reward.first_hollowling.rpg'] = true; // no retroactive duplicate rewards
  return validateGameStateData({ ...raw, schemaVersion: 2, items: { ...STARTER_ITEMS, ...(raw.items as object ?? {}) },
    rpg: createRpgState(), storyBeat: 'C1-01', world: { forestWrapCount: 0 }, vitals: raw.vitals ?? { hp: 96, mp: 12 }, flags });
}

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

  // v2 inventory is mandatory; only legacy migration supplies missing fields.
  const items: Record<string, number> = {};
  if (!record(r.items)) return null;
  if (r.items !== undefined) {
    if (typeof r.items !== 'object' || r.items === null || Array.isArray(r.items)) return null;
    for (const [k, v] of Object.entries(r.items as Record<string, unknown>)) {
      if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) return null;
      items[k] = v;
    }
  }

  if (typeof r.playtimeSec !== 'number' || !Number.isFinite(r.playtimeSec) || r.playtimeSec < 0) return null;

  const rpg = validateRpg(r.rpg, items);
  if (!rpg || !(r.party as string[]).every(id => rpg.characters[id])) return null;
  if (!record(r.world) || !integer(r.world.forestWrapCount, 0, 1000000)) return null;
  if (!['C1-01', 'C1-02', 'C1-03', 'C1-04', 'C1-04-DONE'].includes(String(r.storyBeat))) return null;
  const stats = effectiveStats({ rpg });
  if (r.vitals === undefined) return null;
  let vitals: GameStateData['vitals'] | undefined;
  if (r.vitals !== undefined) {
    const v = r.vitals as Record<string, unknown> | null;
    if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
    if (!integer(v.hp, 0, stats.HP) || !integer(v.mp, 0, stats.MP)) return null;
    vitals = { hp: v.hp, mp: v.mp };
  }

  return {
    schemaVersion: GAME_STATE_VERSION,
    chapter: r.chapter as ChapterId,
    area: r.area as AreaId,
    position: { x: pos.x, y: pos.y, facing: pos.facing as Facing },
    party: [...(r.party as CharacterId[])],
    flags,
    items,
    vitals: vitals ?? { hp: stats.HP, mp: stats.MP },
    rpg,
    storyBeat: storyBeatFor(flags),
    world: { forestWrapCount: r.world.forestWrapCount },
    playtimeSec: r.playtimeSec,
  };
}

/** Validated session state. SaveRepository owns persistence; scenes never become the RPG source of truth. */
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
    const valid = validateGameStateData(data);
    if (!valid) throw new Error('GameState: data tidak valid');
    this.data = valid;
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
    d.storyBeat = storyBeatFor(d.flags);
    return true;
  }

  itemCount(item: string): number {
    return this.data?.items[item] ?? 0;
  }

  addItem(item: string, count = 1): void {
    const d = this.need();
    const next = changeItem(d.items, item, count);
    if (!next || count < 1) throw new Error('Item acquisition invalid');
    d.items = next;
  }

  apply(result: RpgResult): string {
    if (result.ok) this.load(result.data);
    return result.message;
  }

  tick(seconds: number): void { if (this.data && Number.isFinite(seconds) && seconds > 0) this.data.playtimeSec += Math.min(seconds, 0.1); }
  setWrapCount(count: number): void { if (integer(count, 0, 1000000)) this.need().world.forestWrapCount = count; }

  setPosition(x: number, y: number, facing: Facing, area?: AreaId): void {
    const d = this.need();
    d.position = { x: Math.round(x), y: Math.round(y), facing };
    if (area) d.area = area;
  }
}
