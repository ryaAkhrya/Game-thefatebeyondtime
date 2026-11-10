import type { Stats } from './BattleEngine';

export type EncounterId = 'hollowling' | 'mournfang';
export const FIRST_HOLLOWLING_FLAG = 'battle.first_hollowling';
export const MOURNFANG_FLAG = 'boss.mournfang';
export const MOURNFANG_STATS: Stats = { HP: 224, MP: 0, ATK: 18, DEF: 10, MAG: 3, MDEF: 6, SPD: 6 };
export const MOURNFANG_REWARD = { id: 'reward.mournfang.rpg', exp: 45, gold: 20, items: { potion: 1 } } as const;
export const BOSS_CHECKPOINT = { x: 704, y: 400, facing: 'right' } as const;
export const BOSS_CHECKPOINT_FLAG = 'checkpoint.c1_before_mournfang';
export const FOREST_EDGE_FLAG = 'c1.entered_forest_edge';
export const MOURNFANG_VICTORY_SEEN = 'c1.mournfang_victory_seen';
export const SLICE_COMPLETE = 'c1.vertical_slice_complete';
