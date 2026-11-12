/**
 * Registri SFX ORIGINAL (Phase 7). Hanya efek suara; BGM tetap milik Game Director (MUSIC_REGISTRY.json, AWAITING_COMPOSER).
 * BERKAS INI DIHASILKAN oleh web/scripts/sfx/generate.mjs (jangan ubah manual; ubah katalog lalu jalankan ulang).
 * Semua bunyi disintesis dari kode (web/scripts/sfx/*), bukan rekaman/sampel pihak ketiga. Kualitas: FUNCTIONAL / AUDIO-REVIEW PENDING.
 * BootScene memuat entri READY dari assets/audio/sfx/: key = id (satu file) atau `id#i` (variasi).
 */
export type SfxCategory = 'ui' | 'step' | 'interact' | 'transition' | 'battle' | 'magic' | 'stinger';

export interface SfxCue {
  id: string;
  category?: SfxCategory;
  /** satu atau beberapa file (variasi); dipilih bergantian tanpa pengulangan langsung */
  files: readonly string[];
  /** interval minimum antar pemutaran id yang sama (ms) untuk membatasi tumpang tindih */
  minIntervalMs: number;
  /** volume relatif 0..1 sebelum Settings */
  gain: number;
  /** durasi file terpanjang (ms); dipakai membatasi jumlah suara bersamaan */
  durationMs?: number;
  status: 'READY' | 'MISSING';
}

export const SFX_REGISTRY: readonly SfxCue[] = [
  { id: 'SFX_UI_MOVE', category: 'ui', files: ['SFX_UI_MOVE.wav'], minIntervalMs: 45, gain: 0.5, durationMs: 70, status: 'READY' },
  { id: 'SFX_UI_CONFIRM', category: 'ui', files: ['SFX_UI_CONFIRM.wav'], minIntervalMs: 80, gain: 0.55, durationMs: 200, status: 'READY' },
  { id: 'SFX_UI_CANCEL', category: 'ui', files: ['SFX_UI_CANCEL.wav'], minIntervalMs: 80, gain: 0.5, durationMs: 170, status: 'READY' },
  { id: 'SFX_UI_SELECT_ITEM', category: 'ui', files: ['SFX_UI_SELECT_ITEM.wav'], minIntervalMs: 60, gain: 0.5, durationMs: 90, status: 'READY' },
  { id: 'SFX_UI_ITEM_USE', category: 'ui', files: ['SFX_UI_ITEM_USE.wav'], minIntervalMs: 120, gain: 0.6, durationMs: 200, status: 'READY' },
  { id: 'SFX_UI_SAVE_OK', category: 'ui', files: ['SFX_UI_SAVE_OK.wav'], minIntervalMs: 200, gain: 0.6, durationMs: 200, status: 'READY' },
  { id: 'SFX_UI_SAVE_FAIL', category: 'ui', files: ['SFX_UI_SAVE_FAIL.wav'], minIntervalMs: 200, gain: 0.55, durationMs: 200, status: 'READY' },
  { id: 'SFX_UI_DIALOGUE_ADVANCE', category: 'ui', files: ['SFX_UI_DIALOGUE_ADVANCE.wav'], minIntervalMs: 60, gain: 0.35, durationMs: 55, status: 'READY' },
  { id: 'SFX_UI_DIALOGUE_CHOICE', category: 'ui', files: ['SFX_UI_DIALOGUE_CHOICE.wav'], minIntervalMs: 60, gain: 0.45, durationMs: 100, status: 'READY' },
  { id: 'SFX_UI_SHOP_BUY', category: 'ui', files: ['SFX_UI_SHOP_BUY.wav'], minIntervalMs: 100, gain: 0.6, durationMs: 200, status: 'READY' },
  { id: 'SFX_UI_SHOP_SELL', category: 'ui', files: ['SFX_UI_SHOP_SELL.wav'], minIntervalMs: 100, gain: 0.6, durationMs: 190, status: 'READY' },
  { id: 'SFX_STEP_GRASS', category: 'step', files: ['SFX_STEP_GRASS_01.wav', 'SFX_STEP_GRASS_02.wav', 'SFX_STEP_GRASS_03.wav', 'SFX_STEP_GRASS_04.wav'], minIntervalMs: 90, gain: 0.5, durationMs: 110, status: 'READY' },
  { id: 'SFX_STEP_DIRT', category: 'step', files: ['SFX_STEP_DIRT_01.wav', 'SFX_STEP_DIRT_02.wav', 'SFX_STEP_DIRT_03.wav', 'SFX_STEP_DIRT_04.wav'], minIntervalMs: 90, gain: 0.55, durationMs: 100, status: 'READY' },
  { id: 'SFX_STEP_STONE', category: 'step', files: ['SFX_STEP_STONE_01.wav', 'SFX_STEP_STONE_02.wav', 'SFX_STEP_STONE_03.wav', 'SFX_STEP_STONE_04.wav'], minIntervalMs: 90, gain: 0.5, durationMs: 100, status: 'READY' },
  { id: 'SFX_INTERACT', category: 'interact', files: ['SFX_INTERACT.wav'], minIntervalMs: 150, gain: 0.6, durationMs: 220, status: 'READY' },
  { id: 'SFX_CHEST_OPEN', category: 'interact', files: ['SFX_CHEST_OPEN.wav'], minIntervalMs: 400, gain: 0.7, durationMs: 900, status: 'READY' },
  { id: 'SFX_ITEM_PICKUP', category: 'interact', files: ['SFX_ITEM_PICKUP.wav'], minIntervalMs: 150, gain: 0.6, durationMs: 320, status: 'READY' },
  { id: 'SFX_DOOR_OPEN', category: 'interact', files: ['SFX_DOOR_OPEN.wav'], minIntervalMs: 500, gain: 0.7, durationMs: 900, status: 'READY' },
  { id: 'SFX_PUZZLE_ACTIVATE', category: 'interact', files: ['SFX_PUZZLE_ACTIVATE.wav'], minIntervalMs: 300, gain: 0.7, durationMs: 600, status: 'READY' },
  { id: 'SFX_PUZZLE_SOLVED', category: 'interact', files: ['SFX_PUZZLE_SOLVED.wav'], minIntervalMs: 800, gain: 0.75, durationMs: 1450, status: 'READY' },
  { id: 'SFX_BATTLE_TRANSITION_NORMAL', category: 'transition', files: ['SFX_BATTLE_TRANSITION_NORMAL.wav'], minIntervalMs: 800, gain: 0.8, durationMs: 850, status: 'READY' },
  { id: 'SFX_BATTLE_TRANSITION_BOSS', category: 'transition', files: ['SFX_BATTLE_TRANSITION_BOSS.wav'], minIntervalMs: 1000, gain: 0.85, durationMs: 1400, status: 'READY' },
  { id: 'SFX_BATTLE_TRANSITION_TEMPORAL', category: 'transition', files: ['SFX_BATTLE_TRANSITION_TEMPORAL.wav'], minIntervalMs: 1000, gain: 0.8, durationMs: 1150, status: 'READY' },
  { id: 'SFX_BATTLE_TRANSITION_SCRIPTED', category: 'transition', files: ['SFX_BATTLE_TRANSITION_SCRIPTED.wav'], minIntervalMs: 1000, gain: 0.8, durationMs: 1000, status: 'READY' },
  { id: 'SFX_BATTLE_CONFIRM', category: 'ui', files: ['SFX_BATTLE_CONFIRM.wav'], minIntervalMs: 80, gain: 0.6, durationMs: 200, status: 'READY' },
  { id: 'SFX_GREATSWORD_SWING', category: 'battle', files: ['SFX_GREATSWORD_SWING.wav'], minIntervalMs: 120, gain: 0.85, durationMs: 380, status: 'READY' },
  { id: 'SFX_GREATSWORD_IMPACT', category: 'battle', files: ['SFX_GREATSWORD_IMPACT.wav'], minIntervalMs: 60, gain: 1, durationMs: 500, status: 'READY' },
  { id: 'SFX_GROUND_SLAM', category: 'battle', files: ['SFX_GROUND_SLAM.wav'], minIntervalMs: 200, gain: 1, durationMs: 600, status: 'READY' },
  { id: 'SFX_ENEMY_ATTACK', category: 'battle', files: ['SFX_ENEMY_ATTACK.wav'], minIntervalMs: 120, gain: 0.9, durationMs: 400, status: 'READY' },
  { id: 'SFX_DAMAGE', category: 'battle', files: ['SFX_DAMAGE.wav'], minIntervalMs: 80, gain: 0.95, durationMs: 280, status: 'READY' },
  { id: 'SFX_ENEMY_DAMAGE', category: 'battle', files: ['SFX_ENEMY_DAMAGE.wav'], minIntervalMs: 80, gain: 0.95, durationMs: 260, status: 'READY' },
  { id: 'SFX_DEFEND', category: 'battle', files: ['SFX_DEFEND.wav'], minIntervalMs: 120, gain: 0.85, durationMs: 320, status: 'READY' },
  { id: 'SFX_HEAL', category: 'magic', files: ['SFX_HEAL.wav'], minIntervalMs: 200, gain: 0.8, durationMs: 1000, status: 'READY' },
  { id: 'SFX_SHIELD', category: 'magic', files: ['SFX_SHIELD.wav'], minIntervalMs: 200, gain: 0.8, durationMs: 700, status: 'READY' },
  { id: 'SFX_STATUS_POISON', category: 'magic', files: ['SFX_STATUS_POISON.wav'], minIntervalMs: 300, gain: 0.8, durationMs: 650, status: 'READY' },
  { id: 'SFX_VICTORY', category: 'stinger', files: ['SFX_VICTORY.wav'], minIntervalMs: 2000, gain: 0.8, durationMs: 2450, status: 'READY' },
  { id: 'SFX_DEFEAT', category: 'stinger', files: ['SFX_DEFEAT.wav'], minIntervalMs: 2000, gain: 0.8, durationMs: 2450, status: 'READY' },
  { id: 'SFX_MAGIC_TORVAN', category: 'magic', files: ['SFX_MAGIC_TORVAN.wav'], minIntervalMs: 200, gain: 0.8, durationMs: 950, status: 'READY' },
  { id: 'SFX_MAGIC_VELTHIA_CAST', category: 'magic', files: ['SFX_MAGIC_VELTHIA_CAST.wav'], minIntervalMs: 200, gain: 0.75, durationMs: 900, status: 'READY' },
  { id: 'SFX_MAGIC_VELTHIA_SHIELD', category: 'magic', files: ['SFX_MAGIC_VELTHIA_SHIELD.wav'], minIntervalMs: 250, gain: 0.75, durationMs: 1150, status: 'READY' },
  { id: 'SFX_MAGIC_VELTHIA_HEAL', category: 'magic', files: ['SFX_MAGIC_VELTHIA_HEAL.wav'], minIntervalMs: 250, gain: 0.75, durationMs: 1200, status: 'READY' },
  { id: 'SFX_CHRONOLITH_CHARGE', category: 'magic', files: ['SFX_CHRONOLITH_CHARGE.wav'], minIntervalMs: 300, gain: 0.85, durationMs: 1200, status: 'READY' },
  { id: 'SFX_CHRONOLITH_STRIKE', category: 'magic', files: ['SFX_CHRONOLITH_STRIKE.wav'], minIntervalMs: 300, gain: 1, durationMs: 1000, status: 'READY' },
  { id: 'SFX_CHRONOLITH_TEMPORAL', category: 'magic', files: ['SFX_CHRONOLITH_TEMPORAL.wav'], minIntervalMs: 300, gain: 0.85, durationMs: 1200, status: 'READY' },
];
