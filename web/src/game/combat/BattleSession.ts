import type { GameState, GameStateData } from '../systems/GameState';
import { BattleEngine, HOLLOWLING_STATS, actor } from './BattleEngine';
import { applyReward, effectiveStats, type RewardReceipt } from '../rpg/progression';
import { HOLLOWLING_REWARD } from '../rpg/definitions';
import { FIRST_HOLLOWLING_FLAG, MOURNFANG_FLAG, MOURNFANG_REWARD, MOURNFANG_STATS, type EncounterId } from './encounters';

export { FIRST_HOLLOWLING_FLAG } from './encounters';

/** In-memory encounter checkpoint; SaveRepository remains the sole persistence boundary. */
export class BattleSession {
  private readonly checkpoint: GameStateData;
  engine: BattleEngine;
  private committed = false;
  constructor(private readonly gameState: GameState, readonly encounter: EncounterId = 'hollowling') {
    const checkpoint = gameState.snapshot();
    if (!checkpoint) throw new Error('Battle requires an active game');
    if (encounter === 'mournfang' && !checkpoint.flags[FIRST_HOLLOWLING_FLAG]) throw new Error('Mournfang requires the completed Hollowling encounter');
    this.checkpoint = checkpoint;
    this.engine = this.createEngine();
  }
  private createEngine(): BattleEngine {
    const stats = effectiveStats(this.checkpoint);
    const yaric = actor('C01', 'player', stats);
    yaric.hp = this.checkpoint.vitals?.hp ?? stats.HP;
    yaric.mp = this.checkpoint.vitals?.mp ?? stats.MP;
    yaric.skills = [...this.checkpoint.rpg.characters.C01!.unlockedSkills];
    return new BattleEngine([yaric, actor(this.enemyId, 'enemy', this.encounter === 'mournfang' ? MOURNFANG_STATS : HOLLOWLING_STATS)], this.checkpoint.items);
  }
  get enemyId(): 'M01' | 'B01' { return this.encounter === 'mournfang' ? 'B01' : 'M01'; }
  private get completionFlag(): string { return this.encounter === 'mournfang' ? MOURNFANG_FLAG : FIRST_HOLLOWLING_FLAG; }
  private get reward(): typeof HOLLOWLING_REWARD | typeof MOURNFANG_REWARD { return this.encounter === 'mournfang' ? MOURNFANG_REWARD : HOLLOWLING_REWARD; }
  previewReward(): RewardReceipt | null { return applyReward(this.checkpoint, this.reward).receipt; }
  retry(): boolean {
    if (this.committed || this.engine.snapshot().outcome !== 'defeat') return false;
    const restored = structuredClone(this.checkpoint);
    restored.playtimeSec = Math.max(restored.playtimeSec, this.gameState.snapshot()!.playtimeSec);
    this.gameState.load(restored);
    this.engine = this.createEngine();
    return true;
  }
  /** Vitals, consumed items, completion and idempotent RPG reward commit together after victory. */
  commitVictory(): boolean {
    const result = this.engine.snapshot();
    if (this.committed || result.outcome !== 'victory' || result.pending || this.gameState.hasFlag(this.completionFlag)) return false;
    const yaric = result.actors.find(a => a.id === 'C01')!;
    const next = this.gameState.snapshot()!;
    next.vitals = { hp: yaric.hp, mp: yaric.mp };
    next.items = { ...result.items };
    next.flags[this.completionFlag] = true;
    this.gameState.load(applyReward(next, this.reward).data);
    this.committed = true;
    return true;
  }
}
