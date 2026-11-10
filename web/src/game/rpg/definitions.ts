import type { Stats } from '../combat/BattleEngine';

/** Phase 3 balancing and new passive/item names are DRAFT; no narrative unlocks are invented. */
export type ClassId = 'swordsman' | 'mage' | 'royal_mage';
export type EquipmentSlot = 'weapon' | 'armor';
export interface ProgressionProfile { id: string; classId: ClassId; base: Stats; growth: Stats; thresholds: readonly number[] }
export interface CharacterProgress {
  classId: ClassId; level: number; exp: number; baseStats: Stats;
  skillPoints: number; unlockedSkills: string[]; equipment: Record<EquipmentSlot, string | null>;
}
export interface RpgState { gold: number; characters: Record<string, CharacterProgress> }
export const MAX_GOLD = 999999;
export const MAX_ITEMS = 999;
export const YARIC_PROFILE: ProgressionProfile = {
  id: 'C01', classId: 'swordsman',
  base: { HP: 96, MP: 12, ATK: 16, DEF: 6, MAG: 5, MDEF: 7, SPD: 10 },
  growth: { HP: 12, MP: 2, ATK: 3, DEF: 1, MAG: 1, MDEF: 1, SPD: 1 },
  thresholds: [0, 25, 70, 140, 235],
};
export const PROFILES: Readonly<Record<string, ProgressionProfile>> = { C01: YARIC_PROFILE };
export interface ItemDefinition {
  id: string; name: string; description: string; kind: 'consumable' | 'equipment' | 'key';
  buy: number; sell: number; sellable: boolean; healHP?: number;
  slot?: EquipmentSlot; classes?: readonly ClassId[]; bonus?: Partial<Stats>;
}
export const ITEMS: Readonly<Record<string, ItemDefinition>> = {
  potion: { id: 'potion', name: 'Potion', description: 'Pulihkan hingga 36 HP. Tidak dipakai saat HP penuh.', kind: 'consumable', healHP: 36, buy: 12, sell: 6, sellable: true },
  yaric_greatsword: { id: 'yaric_greatsword', name: 'Pedang Besar', description: 'Greatsword Yaric. ATK +4. Tampilan pedang tetap.', kind: 'equipment', slot: 'weapon', classes: ['swordsman'], bonus: { ATK: 4 }, buy: 0, sell: 0, sellable: false },
  travel_coat: { id: 'travel_coat', name: 'Baju Jalan', description: 'Pakaian perjalanan. DEF +2. Data perlengkapan DRAF.', kind: 'equipment', slot: 'armor', classes: ['swordsman', 'mage', 'royal_mage'], bonus: { DEF: 2 }, buy: 20, sell: 8, sellable: true },
  // Test harness only: never granted by Chapter I or placed in the forest.
  qa_staff: { id: 'qa_staff', name: 'Tongkat Uji', description: 'Perlengkapan uji kelas penyihir; bukan hadiah cerita.', kind: 'equipment', slot: 'weapon', classes: ['mage'], bonus: { MAG: 3 }, buy: 20, sell: 8, sellable: true },
  qa_key: { id: 'qa_key', name: 'Penanda Uji', description: 'Barang penting uji. Tidak dijual atau dibuang.', kind: 'key', buy: 0, sell: 0, sellable: false },
};
export const STARTER_ITEMS = { yaric_greatsword: 1, travel_coat: 1 };
export interface SkillDefinition { id: string; name: string; classId: ClassId; level: number; cost: number; prerequisite?: string; bonus?: Partial<Stats>; description: string }
export const SKILLS: readonly SkillDefinition[] = [
  { id: 'ground_slam', name: 'Ground Slam', classId: 'swordsman', level: 1, cost: 0, description: 'Jurus awal. 4 MP, hantaman tanah fisik. Sudah terbuka.' },
  { id: 'heavy_grip', name: 'Hantaman Berat', classId: 'swordsman', level: 2, cost: 1, prerequisite: 'ground_slam', bonus: { ATK: 2 }, description: 'DRAF: pasif ATK +2. Perlu level 2 dan 1 poin jurus.' },
  { id: 'firm_stance', name: 'Kuda-kuda Kukuh', classId: 'swordsman', level: 2, cost: 1, prerequisite: 'ground_slam', bonus: { DEF: 2 }, description: 'DRAF: pasif DEF +2. Perlu level 2 dan 1 poin jurus.' },
];
export const HOLLOWLING_REWARD = { id: 'reward.first_hollowling.rpg', exp: 25, gold: 8 } as const;
