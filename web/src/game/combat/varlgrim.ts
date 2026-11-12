import type { Stats } from './BattleEngine';
import type { VarlgrimCommand } from '../story/chapter4Flags';

/**
 * Varlgrim (B04 = C04), boss akhir. Penjaga waktu yang tragis, BUKAN iblis atau dewa: tongkat kayu berat, disiplin, tanpa RNG.
 * Semua angka DRAFT, disetel lewat simulasi (tests/unit/varlgrim-balance.test.ts). Dokumen: docs/production/VARLGRIM_BOSS_DESIGN.md.
 * Modul ini murni data dan fungsi pola; BattleEngine mengeksekusi efeknya.
 */
export const VARLGRIM_STATS: Stats = { HP: 1150, MP: 0, ATK: 50, DEF: 16, MAG: 44, MDEF: 12, SPD: 8 };

export const VARLGRIM = {
  /** Fase 2 di HP <= 66%, fase 3 di HP <= 35% (dievaluasi hanya di luar jeda telegraf). */
  phase2At: 0.66,
  phase3At: 0.35,
  /** Kekuatan serangan (pengali ATK untuk fisik, MAG untuk temporal). */
  power: { keeperStrike: 2.2, sealPulse: 0.47, timeBind: 0.65, fractureStrike: 2.6, distortionWave: 0.72 },
  /** Paling sedikit aksi biasa antara dua meteor. */
  minPlainBetweenMeteors: 2,
  /** Meteor pertama: boleh langsung sesudah phase_shift (telegraf sudah tampil sejak jeda), agar pemain kuat tidak dapat melewatinya dengan menyerang cepat. */
  minPlainBeforeFirstMeteor: 0,
  /** Pulih sesudah fase 3 bermula bila ada yang tumbang. */
  reviveFraction: 0.25,
} as const;

export type VarlgrimPhase = 1 | 2 | 3;

/** Siklus pola fase 1 dan 2 (indeks = aiStep). Pasangan telegraf->serangan SELALU berurutan (dipaksa AI, bukan siklus). */
export const PHASE1_CYCLE: readonly VarlgrimCommand[] = ['keeper_stance', 'seal_pulse', 'keeper_stance', 'time_bind', 'seal_pulse'];
export const PHASE2_CYCLE: readonly VarlgrimCommand[] = ['fracture_mark', 'distortion_wave', 'keeper_stance', 'time_bind', 'fracture_mark', 'distortion_wave', 'seal_pulse'];
/** Rotasi aksi biasa fase 3 (selain seal_pulse yang lembut sesudah transisi/meteor). */
export const PHASE3_ROTATION: readonly VarlgrimCommand[] = ['distortion_wave', 'keeper_stance', 'fracture_mark', 'seal_pulse'];

/** Perintah yang membuka jeda telegraf: fase tidak boleh bertransisi sesudahnya dan strike HARUS menyusul. */
export const LEAD_IN: Readonly<Partial<Record<VarlgrimCommand, VarlgrimCommand>>> = { keeper_stance: 'keeper_strike', fracture_mark: 'fracture_strike', meteor_call: 'meteor_fall', meteor_hold: 'meteor_fall' };

export function varlgrimPhaseFor(hp: number, maxHP: number): VarlgrimPhase {
  const f = hp / maxHP;
  return f <= VARLGRIM.phase3At ? 3 : f <= VARLGRIM.phase2At ? 2 : 1;
}

export interface VarlgrimCursor {
  phase: VarlgrimPhase;
  /** indeks siklus fase 1/2 */
  step: number;
  /** aksi biasa sejak meteor terakhir (atau sejak fase 3 mulai) */
  calm: number;
  /** penghitung rotasi aksi biasa fase 3 */
  rot: number;
  /** meteor yang sudah jatuh */
  falls: number;
}

/**
 * Niat berikutnya sesudah `last` selesai. `veAlive` = Velthia hidup (tanpa dia meteor TIDAK dipanggil). Tidak mengubah kursor;
 * pemanggil (engine) memperbarui step/calm/rot lewat `advanceCursor`.
 */
export interface VarlgrimPick { next: VarlgrimCommand; /** penghitung yang dipakai pilihan ini */ use: 'step' | 'rot' | null }
export function varlgrimNext(last: VarlgrimCommand, c: VarlgrimCursor, veAlive: boolean): VarlgrimPick {
  const lead = LEAD_IN[last];
  if (lead) return { next: lead, use: null };
  if (c.phase === 1) return { next: PHASE1_CYCLE[c.step % PHASE1_CYCLE.length]!, use: 'step' };
  if (c.phase === 2) return { next: PHASE2_CYCLE[c.step % PHASE2_CYCLE.length]!, use: 'step' };
  if (last === 'meteor_fall') return { next: 'seal_pulse', use: null }; // aftermath lembut
  if (c.calm >= (c.falls === 0 ? VARLGRIM.minPlainBeforeFirstMeteor : VARLGRIM.minPlainBetweenMeteors) && veAlive) return { next: 'meteor_call', use: null };
  if (last === 'phase_shift') return { next: 'seal_pulse', use: null };
  return { next: PHASE3_ROTATION[c.rot % PHASE3_ROTATION.length]!, use: 'rot' };
}

/** Aksi biasa cadangan bila meteor_call harus ditunda karena Velthia tumbang. Tidak pernah memanggil meteor. */
export function varlgrimPlainFallback(c: VarlgrimCursor): VarlgrimCommand {
  return c.phase === 3 ? PHASE3_ROTATION[c.rot % PHASE3_ROTATION.length]! : 'seal_pulse';
}

export const isPlainCommand = (cmd: string): boolean => cmd !== 'meteor_call' && cmd !== 'meteor_hold' && cmd !== 'meteor_fall' && cmd !== 'phase_shift';
