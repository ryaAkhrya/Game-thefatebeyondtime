/**
 * Chapter IV (The Fate) - kontrak flag bersama (Phase 8). Sumber tunggal nama flag tingkat-cerita; modul cerita, dunia, engine
 * dan tes mengimpor dari sini. Commit sebuah flag hanya SESUDAH dialog/aksi yang bersangkutan selesai.
 *
 * KONVENSI: SETIAP flag Bab IV diawali salah satu awalan di `C4_FLAG_PREFIXES` (`isChapter4Flag`). Flag internal Benteng
 * (puzzle, lore, peti) dibuat pemilik Benteng di `story/c4/fortressFlags.ts` dengan awalan `c4.` dan otomatis dikenali validasi.
 */
export const C4 = {
  start: 'chapter.4_started',
  /** masuk Benteng (C4-01 selesai) - nama kanon SCENE_DIRECTION */
  entered: 'story.c4_entered',
  /** laporan Talric yang dibaca di pos luar / dekat ruang Heart */
  reportA: 'c4.report_a',
  reportB: 'c4.report_b',
  /** Velthia mempelajari Perlindungan (Ultimate) di Arsip; uji Perlindungan */
  aegisLearned: 'c4.aegis_learned',
  aegisTrial: 'battle.fortress_aegis_trial',
  /** encounter Benteng (hadiah sekali lewat flag battle.*) */
  fightCourt: 'battle.fortress_riftborn',
  fightHall: 'battle.fortress_gravorn',
  fightGuard: 'battle.fortress_guardpost',
  fightRift: 'battle.fortress_rift',
  /** rest/checkpoint sebelum ruang Heart (HP/MP penuh, aman diulang) */
  checkpoint: 'checkpoint.c4_before_varlgrim',
  /** C4-02 selesai (kesaksian dan bantahan) - nama kanon */
  confront: 'story.c4_confront',
  varlgrim: 'boss.varlgrim',
  /** pidato pembuka C4-03 sesudah kalah ("Kalau segelnya kulepas...") */
  leanSeen: 'c4.varlgrim_lean_seen',
  /** dua pengunci Heart dibuka bersama (C4-04) - nama kanon */
  unlockYaric: 'c4.heart_lock_yaric',
  unlockVelthia: 'c4.heart_lock_velthia',
  heartOpen: 'story.c4_heart_open',
  /** menara tua runtuh (dilihat dari kejauhan) */
  towerFallen: 'c4.tower_fallen',
  /** C4-05 ingatan lama - nama kanon */
  memoryA: 'c4.memory_a',
  memoryB: 'c4.memory_b',
  oldMemory: 'story.c4_old_memory',
  /** C4-06 pengakuan Varlgrim lalu jati diri Torvan - nama kanon */
  varlgrimTruth: 'c4.varlgrim_truth',
  creatorReveal: 'story.c4_creator_reveal',
  /** Varlgrim tinggal menahan sisa retakan (nasib tidak dipastikan) */
  varlgrimStays: 'c4.varlgrim_stays',
  /** kembali ke Aveloria (C4-07) */
  returned: 'c4.returned_aveloria',
  returnSeen: 'c4.return_scene_seen',
  complete: 'chapter.4_complete',
} as const;

/** Awalan yang menandai flag Bab IV (dipakai validasi GameState). */
export const C4_FLAG_PREFIXES = ['chapter.4_', 'story.c4_', 'c4.', 'battle.fortress_', 'boss.varlgrim', 'checkpoint.c4_', 'reward.c4_'] as const;
export function isChapter4Flag(key: string): boolean {
  return C4_FLAG_PREFIXES.some(p => key.startsWith(p));
}

/** Beat save (GameStateData.storyBeat) untuk Chapter IV; sama pola dengan C3 (flag akhir beat N -> beat N+1). */
export const C4_BEATS = ['C4-01', 'C4-02', 'C4-03', 'C4-04', 'C4-05', 'C4-06', 'C4-07', 'C4-DONE'] as const;
export type C4Beat = (typeof C4_BEATS)[number];

/** Id encounter baru (BattleSession/encounters). `varlgrim` = B04/C04. */
export const C4_ENCOUNTERS = ['fortress_riftborn', 'fortress_gravorn', 'fortress_guardpost', 'fortress_rift', 'fortress_aegis_trial', 'varlgrim'] as const;
export type C4EncounterId = (typeof C4_ENCOUNTERS)[number];

/** Perintah Velthia khusus Chapter IV (battle/UI/VFX/SFX memakai nama yang sama). Bukan perintah level: dibuka oleh flag `C4.aegisLearned`. */
export const AEGIS_COMMAND = 'velthia_aegis' as const;

/**
 * Perintah/niat Varlgrim (B04). Engine, presenter, VFX dan SFX memakai nama yang sama.
 * Fase 1 Keeper: keeper_stance -> keeper_strike, time_bind, seal_pulse.
 * Fase 2 Distortion: fracture_mark -> fracture_strike, distortion_wave (+ time_bind, seal_pulse).
 * Fase 3 Meteor: meteor_call (telegraf) -> [satu ronde penuh pemain] -> meteor_fall; meteor_hold bila Velthia belum bertindak.
 * phase_shift: jeda transisi fase tanpa kerusakan (dialog callout).
 */
export const VARLGRIM_COMMANDS = ['keeper_stance', 'keeper_strike', 'time_bind', 'seal_pulse', 'fracture_mark', 'fracture_strike', 'distortion_wave', 'phase_shift', 'meteor_call', 'meteor_hold', 'meteor_fall'] as const;
export type VarlgrimCommand = (typeof VARLGRIM_COMMANDS)[number];

/** Perintah/niat musuh Benteng baru. */
export const RIFTBORN_COMMANDS = ['rift_lash', 'rift_gather', 'rift_surge'] as const; // M06: lash ringan, gather = telegraf, surge = berat (dilawan Perlindungan pada uji)
export const GRAVORN_COMMANDS = ['gravorn_heave', 'gravorn_brace', 'gravorn_crush'] as const; // M04: lambat, DEF tinggi, crush berat tertelegraf
