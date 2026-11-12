import type { Stats } from '../combat/BattleEngine';

/** Phase 3 balancing and new passive/item names are DRAFT; no narrative unlocks are invented. */
export type ClassId = 'swordsman' | 'mage' | 'royal_mage';
export type EquipmentSlot = 'weapon' | 'armor';
/**
 * Kurva EXP bersama (Phase 8): indeks i = EXP kumulatif untuk mencapai level i+1. Lima entri pertama TIDAK BOLEH berubah
 * (save lama sah tanpa migrasi). Panjang array = level maksimum; entri terakhir = batas EXP. DRAFT, tinjau setelah playtest.
 */
export const LEVEL_THRESHOLDS: readonly number[] = [0, 25, 70, 140, 235, 300, 395, 500, 650, 800];
export const MAX_LEVEL = LEVEL_THRESHOLDS.length;
export const EXP_CAP = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]!;
export interface ProgressionProfile {
  id: string; classId: ClassId; base: Stats; growth: Stats; thresholds: readonly number[];
  /** Opsional: pertumbuhan per level SESUDAH `lateFromLevel` (level di atasnya memakai ini; level <= lateFromLevel tetap memakai `growth`). */
  lateGrowth?: Stats; lateFromLevel?: number;
}
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
  // Level 6-10 (DRAFT): tetap penyerang fisik berat, tetapi ATK/HP tumbuh lebih pelan agar kerusakan tidak meledak.
  lateGrowth: { HP: 11, MP: 2, ATK: 2, DEF: 1, MAG: 1, MDEF: 1, SPD: 1 }, lateFromLevel: 5,
  thresholds: LEVEL_THRESHOLDS,
};
/** ASSUMPTION / DRAFT: Torvan starts below Yaric's physical power, with faster support turns. */
export const TORVAN_PROFILE: ProgressionProfile = {
  id: 'C03', classId: 'mage',
  base: { HP: 62, MP: 20, ATK: 7, DEF: 5, MAG: 15, MDEF: 11, SPD: 13 },
  growth: { HP: 7, MP: 4, ATK: 1, DEF: 1, MAG: 2, MDEF: 2, SPD: 1 },
  lateGrowth: { HP: 6, MP: 3, ATK: 1, DEF: 1, MAG: 1, MDEF: 2, SPD: 1 }, lateFromLevel: 5,
  thresholds: LEVEL_THRESHOLDS,
};
/** ASSUMPTION / DRAFT Chapter III: Ratu tanpa senjata; HP rendah, MP/MAG/MDEF tinggi, kecepatan di bawah Yaric. */
export const VELTHIA_PROFILE: ProgressionProfile = {
  id: 'C02', classId: 'royal_mage',
  base: { HP: 70, MP: 26, ATK: 6, DEF: 5, MAG: 16, MDEF: 12, SPD: 9 },
  growth: { HP: 8, MP: 4, ATK: 1, DEF: 1, MAG: 2, MDEF: 2, SPD: 1 },
  // Level 6-10 (DRAFT): tetap rapuh (HP rendah); MAG tumbuh pelan agar Denyut/Pulih tidak melonjak, MDEF tetap unggul.
  lateGrowth: { HP: 7, MP: 3, ATK: 0, DEF: 1, MAG: 1, MDEF: 2, SPD: 1 }, lateFromLevel: 5,
  thresholds: LEVEL_THRESHOLDS,
};
export const PROFILES: Readonly<Record<string, ProgressionProfile>> = { C01: YARIC_PROFILE, C03: TORVAN_PROFILE, C02: VELTHIA_PROFILE };
/** Perlengkapan awal per anggota (slot kosong = null; Velthia tidak punya senjata). */
export const STARTING_EQUIPMENT: Readonly<Record<string, Record<EquipmentSlot, string | null>>> = {
  C01: { weapon: 'yaric_greatsword', armor: 'travel_coat' },
  C03: { weapon: 'twig_staff', armor: null },
  C02: { weapon: null, armor: 'royal_robe' },
};
export interface ItemDefinition {
  id: string; name: string; description: string; kind: 'consumable' | 'equipment' | 'key';
  buy: number; sell: number; sellable: boolean; healHP?: number;
  slot?: EquipmentSlot; classes?: readonly ClassId[]; bonus?: Partial<Stats>;
}
export const ITEMS: Readonly<Record<string, ItemDefinition>> = {
  potion: { id: 'potion', name: 'Potion', description: 'Pulihkan hingga 36 HP. Tidak dipakai saat HP penuh.', kind: 'consumable', healHP: 36, buy: 12, sell: 6, sellable: true },
  yaric_greatsword: { id: 'yaric_greatsword', name: 'Pedang Besar', description: 'Greatsword berat. ATK +4. Tampilan pedang tetap.', kind: 'equipment', slot: 'weapon', classes: ['swordsman'], bonus: { ATK: 4 }, buy: 0, sell: 0, sellable: false },
  travel_coat: { id: 'travel_coat', name: 'Baju Jalan', description: 'Pakaian perjalanan. DEF +2. Data perlengkapan DRAF.', kind: 'equipment', slot: 'armor', classes: ['swordsman', 'mage', 'royal_mage'], bonus: { DEF: 2 }, buy: 20, sell: 8, sellable: true },
  // Test harness only: never granted by Chapter I or placed in the forest.
  qa_staff: { id: 'qa_staff', name: 'Tongkat Uji', description: 'Perlengkapan uji kelas penyihir; bukan hadiah cerita.', kind: 'equipment', slot: 'weapon', classes: ['mage'], bonus: { MAG: 3 }, buy: 20, sell: 8, sellable: true },
  qa_key: { id: 'qa_key', name: 'Penanda Uji', description: 'Barang penting uji. Tidak dijual atau dibuang.', kind: 'key', buy: 0, sell: 0, sellable: false },
  royal_robe: { id: 'royal_robe', name: 'Jubah Istana', description: 'Jubah sederhana Velthia. DEF +2, MDEF +3. Data DRAF.', kind: 'equipment', slot: 'armor', classes: ['royal_mage'], bonus: { DEF: 2, MDEF: 3 }, buy: 0, sell: 0, sellable: false },
  twig_staff: { id: 'twig_staff', name: 'Tongkat Ranting', description: 'Tongkat kecil Torvan. MAG +2. Data DRAF.', kind: 'equipment', slot: 'weapon', classes: ['mage'], bonus: { MAG: 2 }, buy: 0, sell: 0, sellable: false },
  // Phase 8: hanya dari peti Benteng Penjaga (tidak dijual). Nama dan angka DRAF.
  warden_plate: { id: 'warden_plate', name: 'Zirah Penjaga', description: 'Zirah tua para penjaga Benteng. DEF +3. Hanya untuk petarung pedang. Data DRAF.', kind: 'equipment', slot: 'armor', classes: ['swordsman'], bonus: { DEF: 3 }, buy: 0, sell: 0, sellable: false },
  keeper_robe: { id: 'keeper_robe', name: 'Jubah Pengawas', description: 'Jubah tenun para pengawas Benteng. DEF +2, MDEF +4. Hanya untuk penyihir kerajaan. Data DRAF.', kind: 'equipment', slot: 'armor', classes: ['royal_mage'], bonus: { DEF: 2, MDEF: 4 }, buy: 0, sell: 0, sellable: false },
};
export const STARTER_ITEMS = { yaric_greatsword: 1, travel_coat: 1 };
export interface SkillDefinition { id: string; name: string; classId: ClassId; level: number; cost: number; prerequisite?: string; bonus?: Partial<Stats>; description: string }
export const SKILLS: readonly SkillDefinition[] = [
  { id: 'ground_slam', name: 'Ground Slam', classId: 'swordsman', level: 1, cost: 0, description: 'Jurus awal. 4 MP, hantaman tanah fisik. Sudah terbuka.' },
  { id: 'heavy_grip', name: 'Hantaman Berat', classId: 'swordsman', level: 2, cost: 1, prerequisite: 'ground_slam', bonus: { ATK: 2 }, description: 'DRAF: pasif ATK +2. Perlu level 2 dan 1 poin jurus.' },
  { id: 'firm_stance', name: 'Kuda-kuda Kukuh', classId: 'swordsman', level: 2, cost: 1, prerequisite: 'ground_slam', bonus: { DEF: 2 }, description: 'DRAF: pasif DEF +2. Perlu level 2 dan 1 poin jurus.' },
  { id: 'ranting_nakal', name: 'Ranting Nakal', classId: 'mage', level: 1, cost: 0, description: '3 MP. Sihir daun tunggal; efektif pada musuh berpelindung.' },
  { id: 'bukan_aku', name: 'Bukan Aku!', classId: 'mage', level: 1, cost: 0, description: '2 MP. Naikkan pertahanan satu sekutu hingga ia selesai bertindak.' },
  { id: 'tunas_bandel', name: 'Tunas Bandel', classId: 'mage', level: 2, cost: 1, prerequisite: 'ranting_nakal', description: '4 MP. Pulihkan 24 HP satu sekutu. DRAF.' },
  // Velthia: lima perintah MP terbuka otomatis menurut level (cost 0); dua pasif DRAF memakai poin jurus. Detail MP/target di velthia.ts.
  { id: 'velthia_pulse', name: 'Denyut Telapak', classId: 'royal_mage', level: 1, cost: 0, description: '2 MP. Serangan sihir satu musuh dari telapak tangan.' },
  { id: 'velthia_mend', name: 'Sentuhan Pulih', classId: 'royal_mage', level: 1, cost: 0, description: '4 MP. Pulihkan HP satu sekutu.' },
  { id: 'velthia_ward', name: 'Selubung Kecil', classId: 'royal_mage', level: 2, cost: 0, description: '5 MP. Selubung penyerap kerusakan pada satu sekutu.' },
  { id: 'velthia_bloom', name: 'Mekar Rimba', classId: 'royal_mage', level: 3, cost: 0, description: '7 MP. Pemulihan bertahap untuk seluruh sekutu.' },
  { id: 'velthia_concord', name: 'Selaras Langkah', classId: 'royal_mage', level: 4, cost: 0, description: '6 MP. Perkuat serangan Yaric berikutnya dan pulihkan 4 MP-nya.' },
  { id: 'gentle_light', name: 'Cahaya Lembut', classId: 'royal_mage', level: 2, cost: 1, prerequisite: 'velthia_mend', bonus: { MAG: 2 }, description: 'DRAF: pasif MAG +2 (pulih dan sihir lebih kuat). Perlu level 2 dan 1 poin jurus.' },
  { id: 'royal_poise', name: 'Sikap Kerajaan', classId: 'royal_mage', level: 2, cost: 1, prerequisite: 'velthia_ward', bonus: { DEF: 1, MDEF: 2 }, description: 'DRAF: pasif DEF +1, MDEF +2. Perlu level 2 dan 1 poin jurus.' },
  // Phase 8 (level 5-9, DRAF): pasif kecil agar poin jurus tambahan bermakna. Semua cost 1 dan berantai pada pasif yang sudah ada.
  { id: 'keen_edge', name: 'Ketajaman Bilah', classId: 'swordsman', level: 5, cost: 1, prerequisite: 'heavy_grip', bonus: { ATK: 2 }, description: 'DRAF: pasif ATK +2. Perlu Hantaman Berat, level 5 dan 1 poin jurus.' },
  { id: 'deep_breath', name: 'Napas Panjang', classId: 'swordsman', level: 6, cost: 1, prerequisite: 'firm_stance', bonus: { HP: 14, MP: 3 }, description: 'DRAF: pasif HP +14, MP +3. Perlu Kuda-kuda Kukuh, level 6 dan 1 poin jurus.' },
  { id: 'veteran_poise', name: 'Kewaspadaan Veteran', classId: 'swordsman', level: 8, cost: 1, prerequisite: 'keen_edge', bonus: { DEF: 1, MDEF: 2, SPD: 1 }, description: 'DRAF: pasif DEF +1, MDEF +2, SPD +1. Perlu Ketajaman Bilah, level 8 dan 1 poin jurus.' },
  { id: 'clear_mind', name: 'Pikiran Jernih', classId: 'royal_mage', level: 5, cost: 1, prerequisite: 'gentle_light', bonus: { MP: 6 }, description: 'DRAF: pasif MP +6. Perlu Cahaya Lembut, level 5 dan 1 poin jurus.' },
  { id: 'calm_veil', name: 'Tabir Tenang', classId: 'royal_mage', level: 7, cost: 1, prerequisite: 'royal_poise', bonus: { HP: 10, MDEF: 2 }, description: 'DRAF: pasif HP +10, MDEF +2. Perlu Sikap Kerajaan, level 7 dan 1 poin jurus.' },
  { id: 'echo_focus', name: 'Fokus Gema', classId: 'royal_mage', level: 9, cost: 1, prerequisite: 'clear_mind', bonus: { MAG: 2 }, description: 'DRAF: pasif MAG +2. Perlu Pikiran Jernih, level 9 dan 1 poin jurus.' },
  { id: 'keajaiban_kecil', name: 'Keajaiban Kecil', classId: 'mage', level: 5, cost: 2, prerequisite: 'tunas_bandel', description: 'Ultimate konsep. Belum dipakai pada Chapter II.' },
];
export const HOLLOWLING_REWARD = { id: 'reward.first_hollowling.rpg', exp: 25, gold: 8 } as const;
