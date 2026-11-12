import { CHRONOLITH_REWARD, DUO_REWARD, MOURNFANG_REWARD, OATHGUARD_REWARD, PATROL_REWARD, TEMPLE_MIXED_REWARD, VEYRATH_REWARD } from '../combat/encounters';
import type { GameStateData } from '../systems/GameState';
import { C3 } from '../story/chapter3Flags';
import { CHAPTER4_REWARDS } from './chapter4Rewards';
import { HOLLOWLING_REWARD, PROFILES } from './definitions';
import { effectiveStats, expCapOf, gainExp } from './progression';
import { memberVitals, setMemberVitals } from './vitals';

/**
 * LEDGER HADIAH EXP (migrasi save Phase 8).
 *
 * Masalah: sebelum level cap 10, `gainExp` memotong EXP di 235. Save Bab III lama yang sudah mencapai 235 kehilangan sisa hadiah
 * (mis. Chronolith memberi +52 bukan +120). Fakta yang membuat pemulihan adil dan tepat: SETIAP sumber EXP adalah hadiah encounter
 * ber-flag `reward.*` (applyReward menyetel flag-nya pada transaksi yang sama dan tidak pernah memberi EXP lain). Jadi EXP historis
 * yang SEHARUSNYA diterima tiap anggota = jumlah EXP hadiah ber-flag yang ia ikuti.
 *
 * Aturan per karakter yang sudah ada di save: exp_baru = max(exp_sekarang, min(ledger, EXP_CAP)).
 * - Yaric (C01): semua hadiah ber-flag.
 * - Torvan (C03): hanya hadiah era 'torvan' (ia anggota aktif ke-2 hanya di Bab II; sesudahnya cadangan tanpa EXP).
 * - Velthia (C02): bergabung pada EXP Yaric (jumlah hadiah sebelum bergabung) lalu menerima semua hadiah sesudahnya, jadi ledger-nya
 *   = jumlah semua hadiah ber-flag (era 'solo' + 'torvan' diwarisi lewat EXP Yaric saat bergabung, era 'velthia' diterima langsung).
 * Level, stat dasar, poin jurus dan jurus otomatis dihitung ulang lewat `gainExp` (jalur yang sama dengan permainan). Tidak pernah
 * menurunkan EXP/level; idempoten; tidak mengarang EXP tanpa flag; save yang EXP-nya sudah >= ledger tidak berubah sama sekali.
 */
export type LedgerEra = 'solo' | 'torvan' | 'velthia';
export interface LedgerEntry { id: string; exp: number; era: LedgerEra }

const entry = (r: { id: string; exp: number }, era: LedgerEra): LedgerEntry => ({ id: r.id, exp: r.exp, era });
/** Semua hadiah ber-EXP. Impor langsung dari sumbernya sehingga penyetelan angka otomatis ikut. */
export const REWARD_LEDGER: readonly LedgerEntry[] = [
  entry(HOLLOWLING_REWARD, 'solo'), entry(MOURNFANG_REWARD, 'solo'),
  entry(DUO_REWARD, 'torvan'), entry(PATROL_REWARD, 'torvan'), entry(VEYRATH_REWARD, 'torvan'),
  entry(OATHGUARD_REWARD, 'velthia'), entry(TEMPLE_MIXED_REWARD, 'velthia'), entry(CHRONOLITH_REWARD, 'velthia'),
  ...CHAPTER4_REWARDS.map(r => entry(r, 'velthia')),
];

const ERAS_FOR: Readonly<Record<string, readonly LedgerEra[]>> = {
  C01: ['solo', 'torvan', 'velthia'],
  C03: ['torvan'],
  C02: ['solo', 'torvan', 'velthia'], // era 'solo'/'torvan' diwarisi lewat EXP Yaric saat bergabung
};
/** EXP yang seharusnya dimiliki `characterId` menurut flag hadiah (tanpa batas cap). 0 untuk id tak dikenal / Velthia belum bergabung. */
export function ledgerExpFor(data: Pick<GameStateData, 'flags'>, characterId: string): number {
  const eras = ERAS_FOR[characterId];
  if (!eras) return 0;
  if (characterId === 'C02' && !data.flags[C3.velthiaJoined]) return 0;
  return REWARD_LEDGER.reduce((sum, e) => sum + (data.flags[e.id] === true && eras.includes(e.era) ? e.exp : 0), 0);
}

export interface LedgerChange { id: string; expBefore: number; expAfter: number; levelBefore: number; levelAfter: number }
/** Sama dengan `normalizeLedger` tetapi juga mengembalikan perubahan (untuk log/toast/tes). */
export function normalizeLedgerReport(data: GameStateData): { data: GameStateData; changes: LedgerChange[] } {
  const changes: LedgerChange[] = [];
  let next: GameStateData | null = null;
  for (const id of Object.keys(data.rpg.characters)) {
    const profile = Object.hasOwn(PROFILES, id) ? PROFILES[id] : undefined, current = data.rpg.characters[id];
    if (!profile || !current) continue;
    const target = Math.max(current.exp, Math.min(ledgerExpFor(data, id), expCapOf(profile)));
    if (target === current.exp) continue;
    next ??= structuredClone(data);
    const oldStats = effectiveStats(data, id);
    const grown = gainExp(current, target - current.exp, profile);
    next.rpg.characters[id] = grown;
    const newStats = effectiveStats(next, id), vitals = memberVitals(data, id);
    if (vitals) {
      const dHp = Math.max(0, newStats.HP - oldStats.HP), dMp = Math.max(0, newStats.MP - oldStats.MP);
      // HP/MP naik sebesar kenaikan maksimum (seperti applyReward) dan tidak pernah turun; anggota tumbang (0 HP) tetap tumbang.
      setMemberVitals(next, id, { hp: vitals.hp > 0 ? Math.min(newStats.HP, vitals.hp + dHp) : 0, mp: Math.min(newStats.MP, vitals.mp + dMp) });
    }
    changes.push({ id, expBefore: current.exp, expAfter: grown.exp, levelBefore: current.level, levelAfter: grown.level });
  }
  return { data: next ?? data, changes };
}
/**
 * Fungsi MURNI: tidak memutasi `data`; mengembalikan objek yang sama bila tidak ada yang perlu berubah. Idempoten. Hasilnya lolos
 * `validateGameStateData` bila masukannya lolos.
 */
export function normalizeLedger(data: GameStateData): GameStateData { return normalizeLedgerReport(data).data; }
