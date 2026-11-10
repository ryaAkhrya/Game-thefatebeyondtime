import type { Stats } from '../combat/BattleEngine';
import { ITEMS, MAX_GOLD, PROFILES, SKILLS, YARIC_PROFILE, type CharacterProgress, type ProgressionProfile, type RpgState } from './definitions';
import type { GameStateData } from '../systems/GameState';

export const STAT_KEYS: readonly (keyof Stats)[] = ['HP', 'MP', 'ATK', 'DEF', 'MAG', 'MDEF', 'SPD'];
export function levelForExp(exp: number, profile: ProgressionProfile = YARIC_PROFILE): number {
  return profile.thresholds.reduce((level, threshold, index) => exp >= threshold ? index + 1 : level, 1);
}
export function baseStatsAt(level: number, profile: ProgressionProfile = YARIC_PROFILE): Stats {
  return Object.fromEntries(STAT_KEYS.map(key => [key, profile.base[key] + profile.growth[key] * (level - 1)])) as unknown as Stats;
}
export function createCharacter(profile: ProgressionProfile = YARIC_PROFILE): CharacterProgress {
  return { classId: profile.classId, level: 1, exp: 0, baseStats: baseStatsAt(1, profile), skillPoints: 0,
    unlockedSkills: profile.id === 'C01' ? ['ground_slam'] : [],
    equipment: { weapon: profile.id === 'C01' ? 'yaric_greatsword' : null, armor: profile.id === 'C01' ? 'travel_coat' : null } };
}
export function createRpgState(): RpgState { return { gold: 0, characters: { C01: createCharacter() } }; }
export function effectiveStats(data: Pick<GameStateData, 'rpg'>, id = 'C01'): Stats {
  const c = data.rpg.characters[id];
  if (!c) throw new Error('Unknown progression character');
  const stats = { ...c.baseStats };
  for (const itemId of Object.values(c.equipment)) {
    const bonus = itemId ? ITEMS[itemId]?.bonus : undefined;
    for (const key of STAT_KEYS) stats[key] += bonus?.[key] ?? 0;
  }
  for (const skillId of c.unlockedSkills) {
    const skill = SKILLS.find(s => s.id === skillId);
    for (const key of STAT_KEYS) stats[key] += skill?.bonus?.[key] ?? 0;
  }
  return stats;
}
export function gainExp(character: CharacterProgress, amount: number, profile: ProgressionProfile = YARIC_PROFILE): CharacterProgress {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('Invalid EXP');
  const next = structuredClone(character), cap = profile.thresholds.at(-1)!;
  next.exp = Math.min(cap, next.exp + amount); next.level = levelForExp(next.exp, profile);
  next.baseStats = baseStatsAt(next.level, profile); next.skillPoints += next.level - character.level;
  return next;
}
export interface RewardReceipt { exp: number; gold: number; beforeLevel: number; afterLevel: number; skillPoints: number }
/** Pure, idempotent transaction. The encounter caller checks victory before invoking this. */
export function applyReward(data: GameStateData, reward: { id: string; exp: number; gold: number }): { data: GameStateData; receipt: RewardReceipt | null } {
  if (!Number.isSafeInteger(reward.exp) || reward.exp < 0 || !Number.isSafeInteger(reward.gold) || reward.gold < 0) throw new Error('Invalid reward');
  if (data.flags[reward.id]) return { data, receipt: null };
  const next = structuredClone(data), before = effectiveStats(data), c = next.rpg.characters.C01!;
  next.rpg.characters.C01 = gainExp(c, reward.exp, PROFILES.C01);
  const after = effectiveStats(next);
  next.vitals = { hp: Math.min(after.HP, (data.vitals?.hp ?? before.HP) + after.HP - before.HP), mp: Math.min(after.MP, (data.vitals?.mp ?? before.MP) + after.MP - before.MP) };
  next.rpg.gold = Math.min(MAX_GOLD, next.rpg.gold + reward.gold); next.flags[reward.id] = true;
  const upgraded = next.rpg.characters.C01!;
  return { data: next, receipt: { exp: upgraded.exp - c.exp, gold: next.rpg.gold - data.rpg.gold, beforeLevel: c.level, afterLevel: upgraded.level, skillPoints: upgraded.skillPoints - c.skillPoints } };
}
