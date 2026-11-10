import type { GameState, GameStateData } from '../systems/GameState';
import { BattleEngine, HOLLOWLING_STATS, actor } from './BattleEngine';
import { applyReward, effectiveStats, type RewardReceipt } from '../rpg/progression';
import { HOLLOWLING_REWARD } from '../rpg/definitions';

export const FIRST_HOLLOWLING_FLAG = 'battle.first_hollowling';

/** In-memory encounter checkpoint; SaveRepository remains the sole persistence boundary. */
export class BattleSession {
  private readonly checkpoint: GameStateData;
  engine: BattleEngine;
  private committed = false;
  constructor(private readonly gameState: GameState) {
    const checkpoint = gameState.snapshot();
    if (!checkpoint) throw new Error('Battle requires an active game');
    this.checkpoint = checkpoint;
    this.engine = this.createEngine();
  }
  private createEngine(): BattleEngine {
    const stats = effectiveStats(this.checkpoint);
    const yaric = actor('C01', 'player', stats);
    yaric.hp = this.checkpoint.vitals?.hp ?? stats.HP;
    yaric.mp = this.checkpoint.vitals?.mp ?? stats.MP;
    yaric.skills = [...this.checkpoint.rpg.characters.C01!.unlockedSkills];
    return new BattleEngine([yaric, actor('M01', 'enemy', HOLLOWLING_STATS)], this.checkpoint.items);
  }
  previewReward(): RewardReceipt | null { return applyReward(this.checkpoint, HOLLOWLING_REWARD).receipt; }
  retry(): boolean {
    if (this.committed || this.engine.snapshot().outcome !== 'defeat') return false;
    this.gameState.load(this.checkpoint);
    this.engine = this.createEngine();
    return true;
  }
  /** Vitals, consumed items, completion and idempotent RPG reward commit together after victory. */
  commitVictory(): boolean {
    const result = this.engine.snapshot();
    if (this.committed || result.outcome !== 'victory' || result.pending || this.gameState.hasFlag(FIRST_HOLLOWLING_FLAG)) return false;
    const yaric = result.actors.find(a => a.id === 'C01')!;
    const next = this.gameState.snapshot()!;
    next.vitals = { hp: yaric.hp, mp: yaric.mp };
    next.items = { ...result.items };
    next.flags[FIRST_HOLLOWLING_FLAG] = true;
    this.gameState.load(applyReward(next, HOLLOWLING_REWARD).data);
    this.committed = true;
    return true;
  }
}
