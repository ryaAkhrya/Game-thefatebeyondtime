import { AEGIS_COMMAND } from '../story/chapter4Flags';

/**
 * Ultimate Perlindungan Velthia (Chapter IV, DRAFT). Modul MURNI: rumus dan data; BattleEngine memanggilnya.
 * Dokumen: docs/production/ULTIMATE_SHIELD_MECHANIC.md.
 *
 * Ringkas: sumber daya `aegis` (0 atau 1) pada aktor Velthia, bukan MP. Casting menghabiskannya dan memasang status `aegis`
 * pada SEMUA anggota hidup. Ancaman mematikan (meteor_fall, atau rift_surge pada uji Perlindungan) membunuh anggota tanpa
 * status itu, dan hanya menyisakan "tekanan" pada yang memilikinya (HP tidak pernah di bawah 1).
 */
export { AEGIS_COMMAND };

export const AEGIS = {
  /** Tekanan sisa pada anggota berperlindungan: min(HP-1, ceil(maxHP * stressPct)). */
  stressPct: 0.22,
  /** `aegis` tidak berkurang per giliran; angka ini hanya pengisi StatusEffect.turns. */
  statusTurns: 99,
  /** Saat ancaman besar dipanggil, Heart bergema dan memulihkan muatan ke nilai ini. */
  fullCharge: 1,
} as const;

export const AEGIS_SKILL_INFO = {
  id: AEGIS_COMMAND,
  name: 'Perlindungan',
  mp: 0,
  target: 'allies' as const,
  frameKey: 'special' as const,
  vfx: AEGIS_COMMAND,
  description: 'Tanpa MP. Ultimate Velthia: seluruh barisan dinaungi perisai Heart sampai ancaman besar jatuh. Satu-satunya jawaban untuk Meteor. Muatan pulih saat ancaman besar berikutnya dipanggil.',
} as const;

/** Tekanan (kerusakan nyata) pada anggota yang terlindungi. Selalu menyisakan minimal 1 HP. */
export function aegisStress(hp: number, maxHP: number): number {
  if (hp <= 1) return 0;
  return Math.min(hp - 1, Math.max(1, Math.ceil(maxHP * AEGIS.stressPct)));
}

/** Tingkat retak perisai untuk presenter: 0 tidak ada tekanan; 1 ringan; 2 sedang; 3 berat (HP sisa di bawah 25%). */
export function stressLevel(hpAfter: number, maxHP: number, stress: number): 0 | 1 | 2 | 3 {
  if (stress <= 0) return 0;
  const f = hpAfter / maxHP;
  return f >= 0.5 ? 1 : f >= 0.25 ? 2 : 3;
}
