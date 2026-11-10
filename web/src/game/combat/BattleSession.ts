import type { GameState, GameStateData } from '../systems/GameState';
import { BattleEngine, HOLLOWLING_STATS, YARIC_STATS, actor } from './BattleEngine';

export const FIRST_HOLLOWLING_FLAG = 'battle.first_hollowling';

/** In-memory encounter checkpoint; SaveRepository remains the sole future persistence boundary. */
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
    const yaric = actor('C01', 'player', YARIC_STATS);
    yaric.hp = this.checkpoint.vitals?.hp ?? YARIC_STATS.HP;
    yaric.mp = this.checkpoint.vitals?.mp ?? YARIC_STATS.MP;
    return new BattleEngine([yaric, actor('M01', 'enemy', HOLLOWLING_STATS)], this.checkpoint.items);
  }
  retry(): boolean {
    if (this.committed || this.engine.snapshot().outcome !== 'defeat') return false;
    this.gameState.load(this.checkpoint);
    this.engine = this.createEngine();
    return true;
  }
  /** Empty reward foundation: no invented EXP/gold. Vitals + consumed items + completion commit together. */
  commitVictory(): boolean {
    const result = this.engine.snapshot();
    if (this.committed || result.outcome !== 'victory' || result.pending || this.gameState.hasFlag(FIRST_HOLLOWLING_FLAG)) return false;
    const yaric = result.actors.find(a => a.id === 'C01')!;
    const next = this.gameState.snapshot()!;
    next.vitals = { hp: yaric.hp, mp: yaric.mp };
    next.items = { ...result.items };
    next.flags[FIRST_HOLLOWLING_FLAG] = true;
    this.gameState.load(next);
    this.committed = true;
    return true;
  }
}
