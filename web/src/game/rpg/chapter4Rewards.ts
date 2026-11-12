/**
 * Hadiah encounter Chapter IV (Phase 8). Nilai awal dari lead; agen progression menyetel ANGKA (exp/gold/items) tetapi
 * TIDAK nama ekspor atau id. Setiap hadiah sekali lewat flag `reward.c4_*` (applyReward idempoten). Kurva level 10:
 * lihat docs/production/PROGRESSION_LEVEL10.md. Angka EXP disetel (DRAFT) supaya, dari Yaric EXP 303 (jalur wajib minimum akhir Bab III,
 * L6): jalur benteng minimum -> L7-L8 sebelum Varlgrim, jalur penuh -> L8; sesudah Varlgrim L9-L10. Tanpa grind wajib.
 */
export interface EncounterReward { id: string; exp: number; gold: number; items?: Readonly<Record<string, number>> }

export const FORTRESS_COURT_REWARD: EncounterReward = { id: 'reward.c4_fortress_riftborn.rpg', exp: 46, gold: 14 };
export const FORTRESS_HALL_REWARD: EncounterReward = { id: 'reward.c4_fortress_gravorn.rpg', exp: 54, gold: 16, items: { potion: 1 } };
export const FORTRESS_GUARD_REWARD: EncounterReward = { id: 'reward.c4_fortress_guardpost.rpg', exp: 56, gold: 20, items: { potion: 1 } };
export const FORTRESS_RIFT_REWARD: EncounterReward = { id: 'reward.c4_fortress_rift.rpg', exp: 60, gold: 22, items: { potion: 1 } };
export const AEGIS_TRIAL_REWARD: EncounterReward = { id: 'reward.c4_fortress_aegis_trial.rpg', exp: 48, gold: 10 };
export const VARLGRIM_REWARD: EncounterReward = { id: 'reward.c4_varlgrim.rpg', exp: 200, gold: 120, items: { potion: 2 } };

/** Semua hadiah Bab IV (untuk ledger dan tes). */
export const CHAPTER4_REWARDS: readonly EncounterReward[] = [FORTRESS_COURT_REWARD, FORTRESS_HALL_REWARD, FORTRESS_GUARD_REWARD, FORTRESS_RIFT_REWARD, AEGIS_TRIAL_REWARD, VARLGRIM_REWARD];
