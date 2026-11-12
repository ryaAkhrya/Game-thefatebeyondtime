import { ITEMS, MAX_GOLD, MAX_ITEMS, PROFILES, SKILLS, type CharacterProgress, type RpgState } from './definitions';
import { baseStatsAt, expCapOf, levelCapOf, levelForExp, STAT_KEYS } from './progression';

export function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
export const integer = (n: unknown, min: number, max: number): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= min && n <= max;
export function validateRpg(raw: unknown, items: Record<string, number>): RpgState | null {
  if (!record(raw) || !integer(raw.gold, 0, MAX_GOLD) || !record(raw.characters) || !raw.characters.C01) return null;
  const characters: Record<string, CharacterProgress> = {}, reserved: Record<string, number> = {};
  for (const [id, c] of Object.entries(raw.characters)) {
    const profile = Object.hasOwn(PROFILES, id) ? PROFILES[id] : undefined;
    if (!profile || !record(c) || c.classId !== profile.classId || !integer(c.exp, 0, expCapOf(profile)) || c.level !== levelForExp(c.exp, profile) || !record(c.baseStats)) return null;
    const base = baseStatsAt(c.level as number, profile);
    if (STAT_KEYS.some(key => c.baseStats && (c.baseStats as Record<string, unknown>)[key] !== base[key])) return null;
    if (!Array.isArray(c.unlockedSkills) || !c.unlockedSkills.every(s => typeof s === 'string') || new Set(c.unlockedSkills).size !== c.unlockedSkills.length || !record(c.equipment)) return null;
    let spent = 0;
    for (const skillId of c.unlockedSkills as string[]) {
      const skill = SKILLS.find(s => s.id === skillId);
      if (!skill || skill.classId !== profile.classId || (c.level as number) < skill.level || (skill.prerequisite && !c.unlockedSkills.includes(skill.prerequisite))) return null;
      spent += skill.cost;
    }
    // Poin jurus = level - 1 - poin yang dibelanjakan; batas atas mengikuti level maksimum profil (bukan angka terkunci).
    if (!integer(c.skillPoints, 0, levelCapOf(profile) - 1) || c.skillPoints !== (c.level as number) - 1 - spent) return null;
    for (const slot of ['weapon', 'armor'] as const) {
      const itemId = c.equipment[slot];
      if (itemId === null) continue;
      if (typeof itemId !== 'string') return null;
      const item = ITEMS[itemId];
      if (!item || item.kind !== 'equipment' || item.slot !== slot || !item.classes?.includes(profile.classId)) return null;
      reserved[itemId] = (reserved[itemId] ?? 0) + 1;
    }
    characters[id] = { classId: profile.classId, level: c.level as number, exp: c.exp,
      baseStats: base, skillPoints: c.skillPoints, unlockedSkills: [...c.unlockedSkills] as string[],
      equipment: { weapon: c.equipment.weapon as string | null, armor: c.equipment.armor as string | null } } satisfies CharacterProgress;
  }
  if (Object.entries(items).some(([id, n]) => !Object.hasOwn(ITEMS, id) || !integer(n, 0, MAX_ITEMS))) return null;
  if (Object.entries(reserved).some(([id, n]) => (items[id] ?? 0) < n)) return null;
  return { gold: raw.gold, characters };
}
