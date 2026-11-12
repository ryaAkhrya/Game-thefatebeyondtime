/**
 * Chapter III (The Forgotten Promise) - kontrak flag bersama. Satu-satunya sumber nama flag; modul cerita, dunia, engine
 * dan tes mengimpor dari sini. Commit sebuah flag hanya SESUDAH dialog/aksi yang bersangkutan selesai.
 */
export const C3 = {
  start: 'chapter.3_started',
  /** Aveloria: krisis retakan waktu */
  crisisSeen: 'c3.crisis_seen',
  azieDemand: 'c3.azie_demand',
  velthiaRefuses: 'c3.velthia_refuses',
  evacOrdered: 'c3.evac_ordered',
  evacDone: 'c3.evac_done',
  /** keputusan Velthia ikut ke kuil (C3-01) */
  decision: 'story.c3_decision',
  torvanStays: 'c3.torvan_stays',
  /** party aktif Yaric + Velthia (Torvan cadangan, progresinya tersimpan) */
  velthiaJoined: 'party.velthia_joined',
  departed: 'c3.departed',
  /** Kuil Jejak */
  templeEntered: 'c3.temple_entered',
  campSeen: 'c3.camp_seen',
  puzzleA: 'c3.puzzle_a',
  puzzleB: 'c3.puzzle_b',
  puzzleC: 'c3.puzzle_c',
  puzzleNote: 'c3.puzzle_note_read',
  gateOpen: 'c3.hall_gate_open',
  checkpoint: 'checkpoint.c3_before_chronolith',
  chronolithIntroSeen: 'c3.chronolith_intro_seen',
  chronolith: 'boss.chronolith',
  chronolithOutroSeen: 'c3.chronolith_outro_seen',
  hiddenName: 'c3.varlgrim_name',
  promise: 'c3.promise_seen',
  /** encounter kuil opsional/wajib */
  templeFight1: 'battle.temple_oathguard',
  templeFight2: 'battle.temple_mixed',
  complete: 'chapter.3_complete',
} as const;

/** Beat save (GameStateData.storyBeat) untuk Chapter III. */
export const C3_BEATS = ['C3-01', 'C3-02', 'C3-03', 'C3-04', 'C3-05', 'C3-06', 'C3-07', 'C3-DONE'] as const;
export type C3Beat = (typeof C3_BEATS)[number];

/** Id encounter baru (BattleSession/encounters). */
export const C3_ENCOUNTERS = ['temple_oathguard', 'temple_mixed', 'chronolith'] as const;

/** Perintah battle Velthia (BattleEngine/BattleScene/VFX/SFX memakai nama yang sama). */
export const VELTHIA_COMMANDS = ['velthia_pulse', 'velthia_mend', 'velthia_ward', 'velthia_bloom', 'velthia_concord'] as const;
