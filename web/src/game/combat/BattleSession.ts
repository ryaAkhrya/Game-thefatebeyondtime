import type { GameState, GameStateData } from '../systems/GameState';
import { BattleEngine, HOLLOWLING_STATS, actor } from './BattleEngine';
import { applyReward, effectiveStats, type RewardReceipt } from '../rpg/progression';
import { HOLLOWLING_REWARD } from '../rpg/definitions';
import { BRIAROOT_STATS, DUO_REWARD, FIRST_HOLLOWLING_FLAG, MOURNFANG_FLAG, MOURNFANG_REWARD, MOURNFANG_STATS,
  PATROL_REWARD, VEYRATH_REWARD, VEYRATH_STATS, WISPLET_STATS, type EncounterId } from './encounters';
import { C2 } from '../story/chapter2Flags';
import { TRUE_NAME, UNKNOWN_SELF, isNameKnown } from '../story/identity';

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
    if (['duo_tutorial', 'forest2_patrol', 'veyrath'].includes(encounter) && (checkpoint.chapter !== 'II' || checkpoint.area !== 'forest_2' || !checkpoint.flags[C2.torvan] || checkpoint.party.join() !== 'C01,C03')) throw new Error('Chapter II battle requires joined party');
    if (encounter === 'veyrath' && (!checkpoint.flags[C2.tutorial] || !checkpoint.flags[C2.secondMarker])) throw new Error('Veyrath requires the old route');
    this.checkpoint = checkpoint;
    this.engine = this.createEngine();
  }
  private createEngine(): BattleEngine {
    const stats = effectiveStats(this.checkpoint);
    const yaric = actor('C01', 'player', stats);
    yaric.name = isNameKnown(this.checkpoint.flags) ? TRUE_NAME : UNKNOWN_SELF; // nama hanya tampil setelah identitas terungkap
    yaric.hp = this.checkpoint.vitals?.hp ?? stats.HP;
    yaric.mp = this.checkpoint.vitals?.mp ?? stats.MP;
    yaric.skills = [...this.checkpoint.rpg.characters.C01!.unlockedSkills];
    const players = [yaric];
    if (this.checkpoint.party.includes('C03')) {
      const torvanStats = effectiveStats(this.checkpoint, 'C03');
      const torvan = actor('C03', 'player', torvanStats);
      torvan.hp = this.checkpoint.partyVitals!.C03.hp; torvan.mp = this.checkpoint.partyVitals!.C03.mp;
      torvan.skills = [...this.checkpoint.rpg.characters.C03!.unlockedSkills]; players.push(torvan);
    }
    const enemies = this.enemyIds.map(id => actor(id, 'enemy', id === 'B01' ? MOURNFANG_STATS : id === 'B02' ? VEYRATH_STATS
      : id === 'M02' ? BRIAROOT_STATS : id === 'M03' ? WISPLET_STATS : HOLLOWLING_STATS));
    return new BattleEngine([...players, ...enemies], this.checkpoint.items, this.encounter === 'forest2_patrol');
  }
  get enemyIds(): ('M01' | 'M02' | 'M03' | 'B01' | 'B02')[] {
    return this.encounter === 'mournfang' ? ['B01'] : this.encounter === 'duo_tutorial' ? ['M01', 'M02']
      : this.encounter === 'forest2_patrol' ? ['M02', 'M03'] : this.encounter === 'veyrath' ? ['B02'] : ['M01'];
  }
  get enemyId(): 'M01' | 'M02' | 'B01' | 'B02' { return this.enemyIds[0] as 'M01' | 'M02' | 'B01' | 'B02'; }
  private get completionFlag(): string { return this.encounter === 'mournfang' ? MOURNFANG_FLAG : this.encounter === 'duo_tutorial' ? C2.tutorial
    : this.encounter === 'forest2_patrol' ? C2.patrol : this.encounter === 'veyrath' ? C2.veyrath : FIRST_HOLLOWLING_FLAG; }
  private get reward(): typeof HOLLOWLING_REWARD | typeof MOURNFANG_REWARD | typeof DUO_REWARD | typeof PATROL_REWARD | typeof VEYRATH_REWARD {
    return this.encounter === 'mournfang' ? MOURNFANG_REWARD : this.encounter === 'duo_tutorial' ? DUO_REWARD
      : this.encounter === 'forest2_patrol' ? PATROL_REWARD : this.encounter === 'veyrath' ? VEYRATH_REWARD : HOLLOWLING_REWARD;
  }
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
    if (next.party.includes('C03')) {
      const torvan = result.actors.find(a => a.id === 'C03')!;
      next.partyVitals = { C03: { hp: torvan.hp, mp: torvan.mp } };
    }
    next.items = { ...result.items };
    next.flags[this.completionFlag] = true;
    if (this.encounter === 'duo_tutorial' || this.encounter === 'forest2_patrol') next.world.lastChapter2EncounterSec = next.playtimeSec;
    this.gameState.load(applyReward(next, this.reward).data);
    this.committed = true;
    return true;
  }
}
