import type { Stats } from './BattleEngine';
import type { GRAVORN_COMMANDS, RIFTBORN_COMMANDS } from '../story/chapter4Flags';

export type RiftbornCommand = (typeof RIFTBORN_COMMANDS)[number];
export type GravornCommand = (typeof GRAVORN_COMMANDS)[number];

/**
 * Musuh Benteng Chapter IV (DRAFT): Riftborn M06 dan Gravorn M04. Murni data/pola; BattleEngine mengeksekusi efeknya.
 * Riftborn: cincin retak yang berhenti lalu menyentak (sihir; surge menghentikan target yang tidak bertahan).
 * Gravorn: lambat, DEF tinggi, lengan batu terangkat sebelum crush berat; sihir menembusnya.
 * Pada `fortress_aegis_trial`, Riftborn Penguji memakai `lethalSurge`: rift_surge mematikan tanpa Perlindungan.
 */
export const RIFTBORN_STATS: Stats = { HP: 340, MP: 0, ATK: 14, DEF: 9, MAG: 46, MDEF: 14, SPD: 12 };
export const GRAVORN_STATS: Stats = { HP: 420, MP: 0, ATK: 42, DEF: 24, MAG: 6, MDEF: 8, SPD: 5 };
/** Versi untuk pertarungan dua musuh (fortress_guardpost, fortress_rift): HP lebih rendah agar total tetap adil. */
export const RIFTBORN_PAIR_STATS: Stats = { ...RIFTBORN_STATS, HP: 200 };
export const GRAVORN_PAIR_STATS: Stats = { ...GRAVORN_STATS, HP: 250 };
/** Penguji: HP cukup tebal agar surge pertama pasti datang sebelum ia tumbang (diuji). */
export const RIFTBORN_TRIAL_STATS: Stats = { HP: 360, MP: 0, ATK: 14, DEF: 9, MAG: 46, MDEF: 14, SPD: 12 };

export const C4_POWER = { riftLash: 0.8, riftSurge: 1.85, gravornHeave: 1.0, gravornCrush: 2.0 } as const;

/** Pola Riftborn biasa; gather -> surge dipaksa. */
export const RIFTBORN_CYCLE: readonly RiftbornCommand[] = ['rift_lash', 'rift_gather', 'rift_lash', 'rift_lash'];
/** Pola Gravorn; brace -> crush dipaksa. */
export const GRAVORN_CYCLE: readonly GravornCommand[] = ['gravorn_heave', 'gravorn_heave', 'gravorn_brace', 'gravorn_heave'];
/** Penguji: dua lash setelah tiap surge sebelum telegraf berikutnya. */
export const TRIAL_LASHES_BETWEEN = 2;

export function riftbornNext(last: RiftbornCommand, step: number, lethal: boolean, calm: number, veAlive: boolean): RiftbornCommand {
  if (last === 'rift_gather') return 'rift_surge';
  if (lethal) return calm >= TRIAL_LASHES_BETWEEN && veAlive ? 'rift_gather' : 'rift_lash';
  return RIFTBORN_CYCLE[step % RIFTBORN_CYCLE.length]!;
}
export function gravornNext(last: GravornCommand, step: number): GravornCommand {
  if (last === 'gravorn_brace') return 'gravorn_crush';
  return GRAVORN_CYCLE[step % GRAVORN_CYCLE.length]!;
}
