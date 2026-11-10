import { BOSS_CHECKPOINT_FLAG, FIRST_HOLLOWLING_FLAG } from '../combat/encounters';
import type { GameStateData } from '../systems/GameState';
import { effectiveStats } from './progression';

/** Repeatable rest changes only vitals and its checkpoint flag; it never grants items, EXP or gold. */
export function restBeforeMournfang(data: GameStateData): GameStateData {
  if (data.area !== 'forest_edge' || !data.flags[FIRST_HOLLOWLING_FLAG]) throw new Error('Checkpoint out of sequence');
  const next = structuredClone(data), stats = effectiveStats(next);
  next.vitals = { hp: stats.HP, mp: stats.MP };
  next.flags[BOSS_CHECKPOINT_FLAG] = true;
  return next;
}
