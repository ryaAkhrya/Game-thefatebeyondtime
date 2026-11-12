/**
 * Spesifikasi presentasi battle (Phase 7): kategori transisi masuk/keluar dan linimasa aksi berbasis data.
 * MURNI (tanpa Phaser) agar durasi, urutan fase, dan aturan Reduced Flashes dapat diuji unit.
 * Dokumen: docs/production/BATTLE_TRANSITION_AND_PACING_SPEC.md.
 */

// ------------------------------------------------------------------ transisi

export type TransitionKind = 'normal' | 'scripted' | 'boss' | 'temporal';

export interface TransitionSpec {
  kind: TransitionKind;
  /** Menutup layar dunia (ms). Input dikunci sejak awal. */
  coverMs: number;
  /** Tahan layar tertutup sebentar (plakat nama pada boss) sebelum scene battle dimulai. */
  holdMs: number;
  /** Membuka layar battle (ms). */
  revealMs: number;
  /** Jumlah bilah penutup (pita) yang bergeser. */
  bars: number;
  /** >0 = gerak bertahap seperti jarum jam yang tersendat (hanya tipe temporal). */
  steps: number;
  /** Plakat nama musuh pada fase tahan. */
  nameplate: boolean;
  sfx: string;
  /** true = gerakan berkedip/terang; diganti varian tenang bila Reduced Flashes aktif. */
  flashy: boolean;
}

export const TRANSITIONS: Readonly<Record<TransitionKind, TransitionSpec>> = {
  normal: { kind: 'normal', coverMs: 420, holdMs: 0, revealMs: 300, bars: 8, steps: 0, nameplate: false, sfx: 'SFX_BATTLE_TRANSITION_NORMAL', flashy: false },
  scripted: { kind: 'scripted', coverMs: 620, holdMs: 120, revealMs: 420, bars: 6, steps: 0, nameplate: false, sfx: 'SFX_BATTLE_TRANSITION_SCRIPTED', flashy: false },
  boss: { kind: 'boss', coverMs: 760, holdMs: 520, revealMs: 560, bars: 10, steps: 0, nameplate: true, sfx: 'SFX_BATTLE_TRANSITION_BOSS', flashy: true },
  temporal: { kind: 'temporal', coverMs: 640, holdMs: 80, revealMs: 420, bars: 8, steps: 5, nameplate: false, sfx: 'SFX_BATTLE_TRANSITION_TEMPORAL', flashy: false },
};

/** Kembali ke dunia setelah battle: pendek dan tenang. */
export const RETURN_TRANSITION = { coverMs: 260, revealMs: 320 } as const;

export interface EncounterPresentation { kind: TransitionKind; name: string; bgm: 'BGM_BATTLE' | 'BGM_BOSS' }

/** Penentuan kategori transisi + label dari id encounter (string agar tidak bergantung pada daftar encounter). */
export function presentationFor(encounter: string, flags: Readonly<Record<string, boolean>> = {}): EncounterPresentation {
  switch (encounter) {
    case 'mournfang': return { kind: 'boss', name: 'Mournfang', bgm: 'BGM_BOSS' };
    case 'veyrath': return { kind: 'boss', name: 'Veyrath', bgm: 'BGM_BOSS' };
    case 'chronolith': return { kind: 'boss', name: 'Chronolith', bgm: 'BGM_BOSS' };
    case 'hollowling': return { kind: flags['battle.first_hollowling'] ? 'normal' : 'scripted', name: 'Hollowling', bgm: 'BGM_BATTLE' };
    case 'temple_oathguard': return { kind: 'temporal', name: 'Oathguard', bgm: 'BGM_BATTLE' };
    case 'temple_mixed': return { kind: 'temporal', name: 'Penjaga Kuil', bgm: 'BGM_BATTLE' };
    case 'duo_tutorial': return { kind: 'scripted', name: 'Dua musuh', bgm: 'BGM_BATTLE' };
    default: return { kind: 'normal', name: 'Musuh', bgm: 'BGM_BATTLE' };
  }
}

/** Durasi total transisi masuk sampai scene battle mulai (cover + hold). Pada Reduced Flashes tidak lebih panjang. */
export function transitionEntryMs(kind: TransitionKind): number {
  const s = TRANSITIONS[kind];
  return s.coverMs + s.holdMs;
}

// ------------------------------------------------------------------ linimasa aksi

export type ActionClass = 'basic' | 'heavy' | 'magic' | 'support' | 'defend' | 'item' | 'enemy_basic' | 'boss_telegraph' | 'boss_special';

/**
 * Fase linimasa: konfirmasi -> antisipasi -> windup -> eksekusi -> dampak -> reaksi -> pemulihan -> serah giliran.
 * Nilai menit minimal per fase (ms); animasi atlas dapat lebih lama, tidak lebih singkat dari spesifikasi.
 */
export interface TimelineSpec {
  confirm: number;
  anticipation: number;
  windup: number;
  execution: number;
  /** Jeda singkat tepat pada dampak (hitstop mikro) sebelum reaksi bergerak. */
  hitstop: number;
  reaction: number;
  recovery: number;
  handoff: number;
}

export const TIMELINES: Readonly<Record<ActionClass, TimelineSpec>> = {
  basic:          { confirm: 60, anticipation: 180, windup: 120, execution: 160, hitstop: 55, reaction: 230, recovery: 200, handoff: 160 },
  enemy_basic:    { confirm: 40, anticipation: 260, windup: 140, execution: 160, hitstop: 55, reaction: 230, recovery: 200, handoff: 180 },
  heavy:          { confirm: 70, anticipation: 320, windup: 260, execution: 360, hitstop: 90, reaction: 300, recovery: 280, handoff: 200 },
  magic:          { confirm: 70, anticipation: 300, windup: 200, execution: 320, hitstop: 60, reaction: 260, recovery: 240, handoff: 180 },
  support:        { confirm: 70, anticipation: 260, windup: 160, execution: 300, hitstop: 0, reaction: 160, recovery: 220, handoff: 180 },
  defend:         { confirm: 60, anticipation: 120, windup: 0, execution: 240, hitstop: 0, reaction: 0, recovery: 200, handoff: 160 },
  item:           { confirm: 60, anticipation: 140, windup: 0, execution: 300, hitstop: 0, reaction: 160, recovery: 180, handoff: 160 },
  boss_telegraph: { confirm: 40, anticipation: 520, windup: 320, execution: 200, hitstop: 0, reaction: 0, recovery: 300, handoff: 240 },
  boss_special:   { confirm: 40, anticipation: 420, windup: 360, execution: 420, hitstop: 110, reaction: 340, recovery: 360, handoff: 260 },
};

export function timelineTotalMs(t: TimelineSpec): number {
  return t.confirm + t.anticipation + t.windup + t.execution + t.hitstop + t.reaction + t.recovery + t.handoff;
}

/** Urutan fase untuk diagnostik/QA. */
export const PHASE_ORDER = ['confirm', 'anticipation', 'windup', 'execution', 'hitstop', 'reaction', 'recovery', 'handoff'] as const;
export type PhaseName = (typeof PHASE_ORDER)[number];

/** Klasifikasi perintah (string id) ke kelas linimasa. Perintah tak dikenal -> 'basic'. */
export function actionClassFor(command: string): ActionClass {
  switch (command) {
    case 'attack': return 'basic';
    case 'ground_slam': return 'heavy';
    case 'ranting_nakal': case 'velthia_pulse': return 'magic';
    case 'bukan_aku': case 'tunas_bandel': case 'velthia_mend': case 'velthia_ward': case 'velthia_bloom': case 'velthia_concord': return 'support';
    case 'defend': return 'defend';
    case 'potion': return 'item';
    case 'boss_windup': case 'knight_guard': case 'chrono_charge': case 'chrono_guard': return 'boss_telegraph';
    case 'boss_sweep': case 'knight_thrust': case 'chrono_slam': case 'chrono_sweep': case 'chrono_rewind': return 'boss_special';
    case 'boss_recover': case 'knight_recover': case 'chrono_recover': return 'enemy_basic';
    default: return 'basic';
  }
}

/** Hitstop efektif: Reduced Flashes tidak memengaruhinya (bukan kilat), tetapi dipendekkan bila shake mati agar tidak terasa macet. */
export function effectiveHitstop(spec: TimelineSpec, screenShake: boolean): number {
  return screenShake ? spec.hitstop : Math.round(spec.hitstop * 0.7);
}

/** Aturan efek benturan: kilat layar penuh hanya bila Reduced Flashes mati; goyang hanya bila Screen Shake aktif. */
export function impactFx(opts: { reducedFlashes: boolean; screenShake: boolean }, heavy: boolean): { flash: boolean; shake: boolean } {
  return { flash: heavy && !opts.reducedFlashes, shake: heavy && opts.screenShake };
}
