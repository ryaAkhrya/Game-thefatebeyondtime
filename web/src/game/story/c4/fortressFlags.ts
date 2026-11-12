/**
 * Flag internal Warden Fortress (Phase 8). Semua berawalan `c4.` sehingga dikenali `isChapter4Flag`/validasi GameState.
 * Flag tingkat-cerita bersama (aegisLearned, aegisTrial, checkpoint, confront, ...) ada di `story/chapter4Flags.ts` (objek `C4`).
 * Di sini hanya yang dipakai di dalam Benteng: lore, teka-teki, peti, sakelar, dan pengatur dialog sekali-putar.
 */
export const FORT = {
  // ---- teka-teki 1: Urutan Segel Jaga (Aula Lonceng) ----
  /** urutan segel jaga benar -> Pintu Segel terbuka */
  sealsSolved: 'c4.seals_solved',
  /** catatan jaga di Arsip sudah dibaca (petunjuk urutan) */
  logRead: 'c4.watch_log_read',
  // ---- teka-teki 2: Jangkar Retakan (Koridor Retakan) ----
  /** ketiga bagian lorong sejajar -> jalan ke Serambi terbuka permanen */
  riftAligned: 'c4.rift_aligned',
  riftHintSeen: 'c4.rift_hint_seen',
  // ---- sakelar dan pintu ----
  shortcutOpen: 'c4.shortcut_open',
  // ---- peti (sekali) ----
  chestPotion: 'c4.chest_potion',
  chestPlate: 'c4.chest_plate',
  chestRobe: 'c4.chest_robe',
  // ---- pengatur dialog sekali-putar ----
  sealHintSeen: 'c4.seal_hint_seen',
  riftbornSeen: 'c4.riftborn_first_seen',
  trialIntroSeen: 'c4.trial_intro_seen',
  trialDoneSeen: 'c4.trial_done_seen',
  bossIntroSeen: 'c4.boss_intro_seen',
  heartApproachSeen: 'c4.heart_approach_seen',
  echoEntered: 'c4.echo_entered',
  /** Torvan telah pergi dari Ruang Gema (resolusi adegan) */
  torvanLeft: 'c4.torvan_left',
} as const;

export const FORT_FLAGS: readonly string[] = Object.values(FORT);
