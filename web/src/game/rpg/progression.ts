import type { Stats } from '../combat/BattleEngine';
import { ITEMS, MAX_GOLD, MAX_ITEMS, PROFILES, SKILLS, STARTING_EQUIPMENT, YARIC_PROFILE, type CharacterProgress, type ProgressionProfile, type RpgState } from './definitions';
import type { GameStateData } from '../systems/GameState';
import { changeItem } from './inventory';
import { memberVitals, setMemberVitals } from './vitals';

export const STAT_KEYS: readonly (keyof Stats)[] = ['HP', 'MP', 'ATK', 'DEF', 'MAG', 'MDEF', 'SPD'];
export function levelForExp(exp: number, profile: ProgressionProfile = YARIC_PROFILE): number {
  return profile.thresholds.reduce((level, threshold, index) => exp >= threshold ? index + 1 : level, 1);
}
export function baseStatsAt(level: number, profile: ProgressionProfile = YARIC_PROFILE): Stats {
  return Object.fromEntries(STAT_KEYS.map(key => [key, profile.base[key] + profile.growth[key] * (level - 1)])) as unknown as Stats;
}
/** Jurus cost-0 tanpa prasyarat terbuka otomatis menurut level (tidak mengubah Yaric/Torvan: semuanya level 1). */
function autoSkills(profile: ProgressionProfile, level: number, known: readonly string[] = []): string[] {
  return SKILLS.filter(s => s.classId === profile.classId && s.cost === 0 && s.level <= level && (!s.prerequisite || known.includes(s.prerequisite))).map(s => s.id);
}
/** `startExp` memungkinkan bergabung pada level tertentu (Velthia). Poin jurus = level - 1 (belum dibelanjakan). */
export function createCharacter(profile: ProgressionProfile = YARIC_PROFILE, startExp = 0): CharacterProgress {
  const exp = Math.max(0, Math.min(profile.thresholds.at(-1)!, startExp)), level = levelForExp(exp, profile);
  const eq = STARTING_EQUIPMENT[profile.id] ?? { weapon: null, armor: null };
  return { classId: profile.classId, level, exp, baseStats: baseStatsAt(level, profile), skillPoints: level - 1,
    unlockedSkills: autoSkills(profile, level), equipment: { weapon: eq.weapon, armor: eq.armor } };
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
  for (const id of autoSkills(profile, next.level, next.unlockedSkills)) if (!next.unlockedSkills.includes(id)) next.unlockedSkills.push(id);
  return next;
}
export interface RewardReceipt { exp: number; gold: number; beforeLevel: number; afterLevel: number; skillPoints: number; items?: Record<string, number> }
/** Pure, idempotent transaction. The encounter caller checks victory before invoking this. */
export function applyReward(data: GameStateData, reward: { id: string; exp: number; gold: number; items?: Readonly<Record<string, number>> }): { data: GameStateData; receipt: RewardReceipt | null } {
  if (!Number.isSafeInteger(reward.exp) || reward.exp < 0 || !Number.isSafeInteger(reward.gold) || reward.gold < 0) throw new Error('Invalid reward');
  if (data.flags[reward.id]) return { data, receipt: null };
  const next = structuredClone(data), before = effectiveStats(data), c = next.rpg.characters.C01!;
  const loot: Record<string, number> = {};
  for (const [id, count] of Object.entries(reward.items ?? {})) {
    if (!Object.hasOwn(ITEMS, id) || !Number.isSafeInteger(count) || count < 1) throw new Error('Invalid reward item');
    const amount = Math.min(count, MAX_ITEMS - (next.items[id] ?? 0));
    if (amount > 0) { next.items = changeItem(next.items, id, amount)!; loot[id] = amount; }
  }
  for (const id of data.party) {
    const current = next.rpg.characters[id]!;
    const oldStats = effectiveStats(data, id);
    next.rpg.characters[id] = gainExp(current, reward.exp, PROFILES[id]);
    const vitals = id === 'C01' ? undefined : memberVitals(next, id);
    if (vitals) {
      const newStats = effectiveStats(next, id);
      setMemberVitals(next, id, { hp: Math.min(newStats.HP, vitals.hp + newStats.HP - oldStats.HP), mp: Math.min(newStats.MP, vitals.mp + newStats.MP - oldStats.MP) });
    }
  }
  const after = effectiveStats(next);
  next.vitals = { hp: Math.min(after.HP, (data.vitals?.hp ?? before.HP) + after.HP - before.HP), mp: Math.min(after.MP, (data.vitals?.mp ?? before.MP) + after.MP - before.MP) };
  next.rpg.gold = Math.min(MAX_GOLD, next.rpg.gold + reward.gold); next.flags[reward.id] = true;
  const upgraded = next.rpg.characters.C01!;
  return { data: next, receipt: { exp: upgraded.exp - c.exp, gold: next.rpg.gold - data.rpg.gold, beforeLevel: c.level, afterLevel: upgraded.level, skillPoints: upgraded.skillPoints - c.skillPoints, ...(Object.keys(loot).length ? { items: loot } : {}) } };
}
