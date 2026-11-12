import { AREA_IDS, CHAPTER_IDS, CHARACTER_IDS, type AreaId, type ChapterId, type CharacterId } from '../data/ids';
import { STARTER_ITEMS, type RpgState } from '../rpg/definitions';
import { changeItem } from '../rpg/inventory';
import { createRpgState, effectiveStats } from '../rpg/progression';
import { integer, record, validateRpg } from '../rpg/validation';
import type { RpgResult } from '../rpg/actions';
import { BOSS_CHECKPOINT_FLAG, FIRST_HOLLOWLING_FLAG, FOREST_EDGE_FLAG, MOURNFANG_FLAG, MOURNFANG_VICTORY_SEEN, SLICE_COMPLETE } from '../combat/encounters';
import { CITY_FLAG } from '../story/aveloriaFlags';
import { C2 } from '../story/chapter2Flags';
import { C3, C3_BEATS, type C3Beat } from '../story/chapter3Flags';
import { C4, C4_BEATS, isChapter4Flag, type C4Beat } from '../story/chapter4Flags';
import { ITEMS, MAX_ITEMS } from '../rpg/definitions';

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
  /**
   * Optional v2 extension. Absent in every Chapter I save. C03 wajib setelah Torvan bergabung dan tetap ada saat ia cadangan;
   * C02 wajib hanya setelah Velthia bergabung (Chapter III).
   */
  partyVitals?: { C03: { hp: number; mp: number }; C02?: { hp: number; mp: number } };
  rpg: RpgState;
  storyBeat: 'C1-01' | 'C1-02' | 'C1-03' | 'C1-04' | 'C1-04-DONE' | 'C1-05' | 'C1-05-DONE' | 'SLICE-DONE' | 'C1-06' | 'C1-07' | 'C1-08' | 'C1-09' | 'C1-DONE'
    | 'C2-01' | 'C2-02' | 'C2-03' | 'C2-04' | 'C2-05' | 'C2-06' | 'C2-07' | 'C2-08' | 'C2-09' | 'C2-DONE' | C3Beat | C4Beat;
  /** Optional extension of v2: old saves have never opened a persistent shop. */
  world: { forestWrapCount: number; shops?: Record<string, Record<string, number>>; lastChapter2EncounterSec?: number };
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
  // Chapter IV: flag akhir beat N -> beat N+1 (urutan dari yang paling akhir).
  if (flags[C4.complete]) return 'C4-DONE';
  if (flags[C4.returned] || flags[C4.creatorReveal]) return 'C4-07';
  if (flags[C4.oldMemory]) return 'C4-06';
  if (flags[C4.heartOpen]) return 'C4-05';
  if (flags[C4.varlgrim]) return 'C4-04';
  if (flags[C4.confront]) return 'C4-03';
  if (flags[C4.checkpoint] || flags[C4.aegisTrial]) return 'C4-02';
  if (flags[C4.start]) return 'C4-01';
  // Chapter III (diturunkan dari flag; urutan dari yang paling akhir).
  if (flags[C3.complete]) return 'C3-DONE';
  if (flags[C3.chronolithOutroSeen] || flags[C3.hiddenName] || flags[C3.promise]) return 'C3-07';
  if (flags[C3.chronolith]) return 'C3-06';
  if (flags[C3.gateOpen] || flags[C3.checkpoint] || flags[C3.chronolithIntroSeen]) return 'C3-05';
  if (flags[C3.campSeen] || flags[C3.puzzleA] || flags[C3.puzzleB] || flags[C3.puzzleC] || flags[C3.puzzleNote] || flags[C3.templeFight1] || flags[C3.templeFight2]) return 'C3-04';
  if (flags[C3.departed] || flags[C3.templeEntered]) return 'C3-03';
  if (flags[C3.velthiaJoined] || flags[C3.torvanStays]) return 'C3-02';
  if (flags[C3.start]) return 'C3-01';
  if (flags[C2.complete]) return 'C2-DONE';
  if (flags[C2.fragments]) return 'C2-09';
  if (flags[C2.veyrath]) return 'C2-08';
  if (flags[C2.secondMarker] && flags[C2.tutorial]) return 'C2-07';
  if (flags[C2.tutorial]) return 'C2-06';
  if (flags[C2.torvan]) return 'C2-05';
  if (flags[C2.forest]) return 'C2-04';
  if (flags[C2.zira]) return 'C2-04';
  if (flags[C2.farewell]) return 'C2-03';
  if (flags[C2.depart]) return 'C2-02';
  if (flags[C2.start]) return 'C2-01';
  if (flags[CITY_FLAG.complete]) return 'C1-DONE';
  if (flags[CITY_FLAG.velthia]) return 'C1-09';
  if (flags[CITY_FLAG.archive]) return 'C1-08';
  if (flags[CITY_FLAG.gate]) return 'C1-07';
  if (flags[CITY_FLAG.vista]) return 'C1-06';
  if (flags[SLICE_COMPLETE]) return 'SLICE-DONE';
  if (flags[MOURNFANG_FLAG]) return 'C1-05-DONE';
  if (flags[FOREST_EDGE_FLAG]) return 'C1-05';
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
  const lastChapter2EncounterSec = r.world.lastChapter2EncounterSec;
  if (lastChapter2EncounterSec !== undefined && ((r.chapter !== 'II' && r.chapter !== 'III') || typeof lastChapter2EncounterSec !== 'number' || !Number.isFinite(lastChapter2EncounterSec) || lastChapter2EncounterSec < 0 || lastChapter2EncounterSec > (r.playtimeSec as number))) return null;
  if (!['C1-01', 'C1-02', 'C1-03', 'C1-04', 'C1-04-DONE', 'C1-05', 'C1-05-DONE', 'SLICE-DONE', 'C1-06', 'C1-07', 'C1-08', 'C1-09', 'C1-DONE', 'C2-01', 'C2-02', 'C2-03', 'C2-04', 'C2-05', 'C2-06', 'C2-07', 'C2-08', 'C2-09', 'C2-DONE', ...C3_BEATS, ...C4_BEATS].includes(String(r.storyBeat))) return null;
  if ((r.area === 'forest_edge' || flags[FOREST_EDGE_FLAG] || flags[BOSS_CHECKPOINT_FLAG] || flags[MOURNFANG_FLAG]) && !flags[FIRST_HOLLOWLING_FLAG]) return null;
  if (flags['reward.mournfang.rpg'] && !flags[MOURNFANG_FLAG]) return null;
  if ((flags[MOURNFANG_VICTORY_SEEN] || flags[SLICE_COMPLETE]) && !flags[MOURNFANG_FLAG]) return null;
  // Existing v2 forest saves still validate unchanged. City outcomes may never skip their prerequisites.
  if ((r.area === 'aveloria' || Object.values(CITY_FLAG).some(f => flags[f])) && (!flags[MOURNFANG_FLAG] || !flags[MOURNFANG_VICTORY_SEEN])) return null;
  for (const [next, previous] of [[CITY_FLAG.gate, CITY_FLAG.vista], [CITY_FLAG.archive, CITY_FLAG.gate], [CITY_FLAG.velthia, CITY_FLAG.archive], [CITY_FLAG.complete, CITY_FLAG.velthia]]) {
    if (flags[next!] && !flags[previous!]) return null;
  }
  const c2Flags = Object.values(C2);
  if ((r.chapter === 'II' || r.area === 'liora' || r.area === 'forest_2' || c2Flags.some(f => flags[f])) && !flags[CITY_FLAG.complete]) return null;
  if (r.chapter === 'I' && c2Flags.some(f => flags[f])) return null;
  if (r.chapter === 'II' && !flags[C2.start]) return null;
  if (r.area === 'liora' && !flags[C2.farewell]) return null;
  if (r.area === 'forest_2' && !flags[C2.zira]) return null;
  for (const [next, previous] of [[C2.depart, C2.start], [C2.farewell, C2.depart], [C2.zira, C2.farewell], [C2.forest, C2.zira], [C2.secondMarker, C2.forest], [C2.torvan, C2.forest], [C2.tutorial, C2.torvan], [C2.tutorialSeen, C2.tutorial], [C2.patrol, C2.tutorial], [C2.checkpoint, C2.torvan], [C2.veyrath, C2.tutorial], [C2.veyrath, C2.secondMarker], [C2.veyrathSeen, C2.veyrath], [C2.fragmentA, C2.veyrath], [C2.fragments, C2.fragmentA], [C2.complete, C2.fragments]]) {
    if (flags[next!] && !flags[previous!]) return null;
  }
  // Chapter III: setiap flag/area/bab butuh Bab II selesai; Velthia menggantikan Torvan (cadangan) sebagai anggota ke-2.
  const anyC3 = Object.values(C3).some(f => flags[f]);
  if ((r.chapter === 'III' || r.area === 'temple' || anyC3) && !flags[C2.complete]) return null;
  if ((r.chapter === 'III' || anyC3) && !flags[C3.start]) return null;
  if ((r.chapter === 'I' || r.chapter === 'II') && anyC3) return null;
  if (r.area === 'temple' && !flags[C3.velthiaJoined]) return null;
  for (const [next, previous] of [[C3.velthiaJoined, C2.torvan], [C3.templeEntered, C3.velthiaJoined], [C3.templeFight1, C3.velthiaJoined], [C3.templeFight2, C3.velthiaJoined],
    [C3.gateOpen, C3.templeEntered], [C3.chronolith, C3.velthiaJoined], [C3.chronolithOutroSeen, C3.chronolith], [C3.complete, C3.chronolith], ['reward.c3_chronolith.rpg', C3.chronolith]]) {
    if (flags[next!] && !flags[previous!]) return null;
  }
  // Chapter IV: butuh Bab III selesai; hanya bab IV (atau sesudahnya) yang boleh membawa flag Bab IV; area benteng/Aveloria.
  const anyC4 = Object.keys(flags).some(isChapter4Flag);
  if ((r.chapter === 'IV' || r.area === 'fortress' || anyC4) && !flags[C3.complete]) return null;
  if ((r.chapter === 'IV' || r.area === 'fortress' || anyC4) && !flags[C4.start]) return null;
  if ((r.chapter === 'I' || r.chapter === 'II' || r.chapter === 'III') && (anyC4 || r.area === 'fortress')) return null;
  if (r.chapter === 'IV' && r.area !== 'fortress' && !(r.area === 'aveloria' && flags[C4.returned])) return null;
  for (const [next, previous] of [[C4.entered, C4.start], [C4.aegisLearned, C4.entered], [C4.aegisTrial, C4.aegisLearned], [C4.fightCourt, C4.entered], [C4.fightHall, C4.entered],
    [C4.fightGuard, C4.entered], [C4.fightRift, C4.entered], [C4.reportA, C4.entered], [C4.reportB, C4.entered], [C4.checkpoint, C4.aegisTrial], [C4.confront, C4.checkpoint],
    [C4.varlgrim, C4.confront], ['reward.c4_varlgrim.rpg', C4.varlgrim], [C4.leanSeen, C4.varlgrim], [C4.unlockYaric, C4.leanSeen], [C4.unlockVelthia, C4.leanSeen],
    [C4.heartOpen, C4.unlockYaric], [C4.heartOpen, C4.unlockVelthia], [C4.towerFallen, C4.heartOpen], [C4.memoryA, C4.heartOpen], [C4.memoryB, C4.heartOpen],
    [C4.oldMemory, C4.heartOpen], [C4.varlgrimTruth, C4.oldMemory], [C4.creatorReveal, C4.oldMemory], [C4.varlgrimStays, C4.varlgrimTruth], [C4.returned, C4.creatorReveal],
    [C4.returnSeen, C4.returned], [C4.complete, C4.returnSeen]]) {
    if (flags[next!] && !flags[previous!]) return null;
  }
  const expectedParty = flags[C3.velthiaJoined] ? 'C01,C02' : flags[C2.torvan] ? 'C01,C03' : 'C01';
  if ((r.party as string[]).join() !== expectedParty) return null;
  let shops: GameStateData['world']['shops'];
  if (r.world.shops !== undefined) {
    if (!record(r.world.shops) || Object.keys(r.world.shops).some(id => id !== 'derrria')) return null;
    shops = {};
    for (const [id, stock] of Object.entries(r.world.shops)) {
      if (!flags[CITY_FLAG.gate] || !record(stock)) return null;
      const clean: Record<string, number> = {};
      for (const [item, count] of Object.entries(stock)) {
        if (!Object.hasOwn(ITEMS, item) || !ITEMS[item]!.sellable || !integer(count, 0, MAX_ITEMS)) return null;
        clean[item] = count;
      }
      shops[id] = clean;
    }
  }
  const stats = effectiveStats({ rpg });
  if (r.vitals === undefined) return null;
  let vitals: GameStateData['vitals'] | undefined;
  if (r.vitals !== undefined) {
    const v = r.vitals as Record<string, unknown> | null;
    if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
    if (!integer(v.hp, 0, stats.HP) || !integer(v.mp, 0, stats.MP)) return null;
    vitals = { hp: v.hp, mp: v.mp };
  }
  let partyVitals: GameStateData['partyVitals'];
  if (flags[C2.torvan]) {
    if (!rpg.characters.C03 || !record(r.partyVitals) || !record(r.partyVitals.C03)) return null;
    const torvan = effectiveStats({ rpg }, 'C03'), v = r.partyVitals.C03;
    if (!integer(v.hp, 0, torvan.HP) || !integer(v.mp, 0, torvan.MP)) return null;
    partyVitals = { C03: { hp: v.hp, mp: v.mp } };
  } else if (r.partyVitals !== undefined || rpg.characters.C03) return null;
  if (partyVitals && flags[C3.velthiaJoined]) {
    const pv = r.partyVitals as Record<string, unknown>;
    if (!rpg.characters.C02 || !record(pv.C02)) return null;
    const velthia = effectiveStats({ rpg }, 'C02'), v = pv.C02;
    if (!integer(v.hp, 0, velthia.HP) || !integer(v.mp, 0, velthia.MP)) return null;
    partyVitals = { ...partyVitals, C02: { hp: v.hp, mp: v.mp } };
  } else if (rpg.characters.C02 || (record(r.partyVitals) && r.partyVitals.C02 !== undefined)) return null;

  return {
    schemaVersion: GAME_STATE_VERSION,
    chapter: r.chapter as ChapterId,
    area: r.area as AreaId,
    position: { x: pos.x, y: pos.y, facing: pos.facing as Facing },
    party: [...(r.party as CharacterId[])],
    flags,
    items,
    vitals: vitals ?? { hp: stats.HP, mp: stats.MP },
    ...(partyVitals ? { partyVitals } : {}),
    rpg,
    storyBeat: storyBeatFor(flags),
    world: { forestWrapCount: r.world.forestWrapCount, ...(shops ? { shops } : {}), ...(lastChapter2EncounterSec !== undefined ? { lastChapter2EncounterSec } : {}) },
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
