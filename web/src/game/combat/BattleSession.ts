import type { GameState, GameStateData } from '../systems/GameState';
import { BattleEngine, HOLLOWLING_STATS, actor } from './BattleEngine';
import { applyReward, effectiveStats, type RewardReceipt } from '../rpg/progression';
import { HOLLOWLING_REWARD } from '../rpg/definitions';
import { memberVitals, setMemberVitals } from '../rpg/vitals';
import { BRIAROOT_STATS, CHRONOLITH_REWARD, CHRONOLITH_STATS, DUO_REWARD, FIRST_HOLLOWLING_FLAG, MOURNFANG_FLAG, MOURNFANG_REWARD, MOURNFANG_STATS,
  OATHGUARD_REWARD, OATHGUARD_STATS, PATROL_REWARD, TEMPLE_MIXED_REWARD, VEYRATH_REWARD, VEYRATH_STATS, WISPLET_STATS, type EncounterId } from './encounters';
import { C2 } from '../story/chapter2Flags';
import { C3 } from '../story/chapter3Flags';
import { TRUE_NAME, UNKNOWN_SELF, isNameKnown } from '../story/identity';

export { FIRST_HOLLOWLING_FLAG } from './encounters';

type EnemyId = 'M01' | 'M02' | 'M03' | 'M05' | 'B01' | 'B02' | 'B03';
const CHAPTER3_ENCOUNTERS: readonly EncounterId[] = ['temple_oathguard', 'temple_mixed', 'chronolith'];
type Reward = { id: string; exp: number; gold: number; items?: Readonly<Record<string, number>> };
/** Setelah menang di Chapter III anggota yang tumbang bangkit dengan 25% HP agar tidak ada softlock di dunia. */
export const REVIVE_FRACTION = 0.25;

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
    if (CHAPTER3_ENCOUNTERS.includes(encounter) && (checkpoint.chapter !== 'III' || checkpoint.area !== 'temple' || !checkpoint.flags[C3.velthiaJoined] || checkpoint.party.join() !== 'C01,C02')) throw new Error('Chapter III battle requires Velthia in the temple');
    if (encounter === 'chronolith' && !checkpoint.flags[C3.gateOpen]) throw new Error('Chronolith requires the opened hall gate');
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
    for (const id of this.checkpoint.party) {
      if (id === 'C01') continue;
      const memberStats = effectiveStats(this.checkpoint, id);
      const member = actor(id, 'player', memberStats), vitals = memberVitals(this.checkpoint, id)!;
      member.hp = vitals.hp; member.mp = vitals.mp;
      member.skills = [...this.checkpoint.rpg.characters[id]!.unlockedSkills]; players.push(member);
    }
    const enemies = this.enemyIds.map(id => actor(id, 'enemy', id === 'B01' ? MOURNFANG_STATS : id === 'B02' ? VEYRATH_STATS : id === 'B03' ? CHRONOLITH_STATS
      : id === 'M05' ? OATHGUARD_STATS : id === 'M02' ? BRIAROOT_STATS : id === 'M03' ? WISPLET_STATS : HOLLOWLING_STATS));
    if (this.checkpoint.chapter === 'III') for (const p of players) if (p.hp <= 0) p.hp = Math.max(1, Math.ceil(p.stats.HP * REVIVE_FRACTION)); // pertahanan: save lama dengan 0 HP tidak menjebak
    return new BattleEngine([...players, ...enemies], this.checkpoint.items, this.encounter === 'forest2_patrol' || this.encounter === 'temple_oathguard' || this.encounter === 'temple_mixed');
  }
  get enemyIds(): EnemyId[] {
    return this.encounter === 'mournfang' ? ['B01'] : this.encounter === 'duo_tutorial' ? ['M01', 'M02']
      : this.encounter === 'forest2_patrol' ? ['M02', 'M03'] : this.encounter === 'veyrath' ? ['B02']
      : this.encounter === 'temple_oathguard' ? ['M05'] : this.encounter === 'temple_mixed' ? ['M05', 'M03'] : this.encounter === 'chronolith' ? ['B03'] : ['M01'];
  }
  get enemyId(): EnemyId { return this.enemyIds[0] as EnemyId; }
  get completionFlag(): string { return this.encounter === 'mournfang' ? MOURNFANG_FLAG : this.encounter === 'duo_tutorial' ? C2.tutorial
    : this.encounter === 'forest2_patrol' ? C2.patrol : this.encounter === 'veyrath' ? C2.veyrath
    : this.encounter === 'temple_oathguard' ? C3.templeFight1 : this.encounter === 'temple_mixed' ? C3.templeFight2 : this.encounter === 'chronolith' ? C3.chronolith : FIRST_HOLLOWLING_FLAG; }
  private get reward(): Reward {
    return this.encounter === 'mournfang' ? MOURNFANG_REWARD : this.encounter === 'duo_tutorial' ? DUO_REWARD
      : this.encounter === 'forest2_patrol' ? PATROL_REWARD : this.encounter === 'veyrath' ? VEYRATH_REWARD
      : this.encounter === 'temple_oathguard' ? OATHGUARD_REWARD : this.encounter === 'temple_mixed' ? TEMPLE_MIXED_REWARD : this.encounter === 'chronolith' ? CHRONOLITH_REWARD : HOLLOWLING_REWARD;
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
    for (const id of next.party) {
      if (id === 'C01') continue;
      const member = result.actors.find(a => a.id === id)!;
      setMemberVitals(next, id, { hp: member.hp, mp: member.mp }); // Torvan cadangan tidak disentuh
    }
    if (next.chapter === 'III') { // tanpa softlock: yang tumbang bangkit dengan sebagian HP setelah menang
      for (const id of next.party) {
        const stats = effectiveStats(next, id), v = memberVitals(next, id)!;
        if (v.hp <= 0) setMemberVitals(next, id, { hp: Math.max(1, Math.ceil(stats.HP * REVIVE_FRACTION)), mp: v.mp });
      }
    }
    next.items = { ...result.items };
    next.flags[this.completionFlag] = true;
    if (this.encounter === 'duo_tutorial' || this.encounter === 'forest2_patrol') next.world.lastChapter2EncounterSec = next.playtimeSec;
    this.gameState.load(applyReward(next, this.reward).data);
    this.committed = true;
    return true;
  }
}
