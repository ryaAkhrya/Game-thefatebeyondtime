import type { Stats } from './BattleEngine';

export type EncounterId = 'hollowling' | 'mournfang' | 'duo_tutorial' | 'forest2_patrol' | 'veyrath' | 'temple_oathguard' | 'temple_mixed' | 'chronolith';
export const FIRST_HOLLOWLING_FLAG = 'battle.first_hollowling';
export const MOURNFANG_FLAG = 'boss.mournfang';
export const MOURNFANG_STATS: Stats = { HP: 224, MP: 0, ATK: 18, DEF: 10, MAG: 3, MDEF: 6, SPD: 6 };
export const MOURNFANG_REWARD = { id: 'reward.mournfang.rpg', exp: 45, gold: 20, items: { potion: 1 } } as const;
export const BOSS_CHECKPOINT = { x: 704, y: 400, facing: 'right' } as const;
export const BOSS_CHECKPOINT_FLAG = 'checkpoint.c1_before_mournfang';
export const FOREST_EDGE_FLAG = 'c1.entered_forest_edge';
export const MOURNFANG_VICTORY_SEEN = 'c1.mournfang_victory_seen';
export const SLICE_COMPLETE = 'c1.vertical_slice_complete';

/** ASSUMPTION / DRAFT Chapter II balance; review after human playtest. */
export const BRIAROOT_STATS: Stats = { HP: 70, MP: 0, ATK: 13, DEF: 12, MAG: 3, MDEF: 3, SPD: 8 };
export const WISPLET_STATS: Stats = { HP: 78, MP: 0, ATK: 10, DEF: 4, MAG: 12, MDEF: 10, SPD: 11 };
export const VEYRATH_STATS: Stats = { HP: 240, MP: 0, ATK: 18, DEF: 14, MAG: 4, MDEF: 9, SPD: 9 };
export const DUO_REWARD = { id: 'reward.c2_duo_tutorial.rpg', exp: 28, gold: 10, items: { potion: 1 } } as const;
export const PATROL_REWARD = { id: 'reward.c2_forest2_patrol.rpg', exp: 18, gold: 6 } as const;
export const VEYRATH_REWARD = { id: 'reward.c2_veyrath.rpg', exp: 85, gold: 32 } as const;

/**
 * Chapter III (DRAFT, simulasi di tests/unit/chapter3-balance.test.ts). Rancangan: Yaric + Velthia, level ~4-5 (cap level 5, EXP 235).
 * Satu Oathguard, atau Oathguard + Wisplet; tanpa grind (hadiah sekali lewat flag battle.*). Chronolith: boss besar berpola tertelegraf.
 */
export const OATHGUARD_STATS: Stats = { HP: 118, MP: 0, ATK: 17, DEF: 10, MAG: 3, MDEF: 6, SPD: 8 };
export const CHRONOLITH_STATS: Stats = { HP: 360, MP: 0, ATK: 38, DEF: 13, MAG: 10, MDEF: 10, SPD: 8 };
export const OATHGUARD_REWARD = { id: 'reward.c3_temple_oathguard.rpg', exp: 26, gold: 10 } as const;
export const TEMPLE_MIXED_REWARD = { id: 'reward.c3_temple_mixed.rpg', exp: 24, gold: 12, items: { potion: 1 } } as const;
export const CHRONOLITH_REWARD = { id: 'reward.c3_chronolith.rpg', exp: 120, gold: 45, items: { potion: 2 } } as const;
