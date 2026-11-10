// Typed IDs. Sumber: GDD.md bagian 3 (18 entitas unik: 9 C, 6 M, 3 boss selain B04).
// B04 = C04 Varlgrim (identitas dan tongkat kayu yang sama); jangan membuat varian lain.

export const CHARACTER_IDS = ['C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C07', 'C08', 'C09'] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

export const MONSTER_IDS = ['M01', 'M02', 'M03', 'M04', 'M05', 'M06'] as const;
export type MonsterId = (typeof MONSTER_IDS)[number];

/** Boss unik. B04 sengaja tidak ada: gunakan BOSS_ALIAS_OF_CHARACTER. */
export const BOSS_IDS = ['B01', 'B02', 'B03'] as const;
export type BossId = (typeof BOSS_IDS)[number];

export const BOSS_ALIAS_OF_CHARACTER = { B04: 'C04' } as const satisfies Record<string, CharacterId>;

export type EntityId = CharacterId | MonsterId | BossId;

export const CHAPTER_IDS = ['I', 'II', 'III', 'IV', 'MODERN', 'EPILOGUE'] as const;
export type ChapterId = (typeof CHAPTER_IDS)[number];

export const AREA_IDS = ['none', 'forest_1', 'aveloria', 'liora', 'forest_2', 'temple', 'fortress', 'cliff'] as const;
export type AreaId = (typeof AREA_IDS)[number];

export const SCENE_KEYS = {
  Boot: 'BootScene',
  Title: 'TitleScene',
  Settings: 'SettingsScene',
  Controls: 'ControlsScene',
  Placeholder: 'PlaceholderScene',
  World: 'WorldScene',
  Hud: 'HudScene',
  Pause: 'PauseScene',
  Battle: 'BattleScene',
} as const;
export type SceneKey = (typeof SCENE_KEYS)[keyof typeof SCENE_KEYS];
