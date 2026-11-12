import { C4 } from '../story/chapter4Flags';
import { FORT } from '../story/c4/fortressFlags';
import type { FortressDynamicId } from '../data/maps/fortress.map.mjs';

/**
 * Logika teka-teki Warden Fortress (MURNI, tanpa Phaser). Dua teka-teki pengamatan tanpa refleks dan tanpa acak:
 *
 *  - 1) Urutan Segel Jaga (Aula Lonceng Berhenti). Empat pilar segel berlambang Fajar, Siang, Senja, Malam berdiri di sudut
 *       lantai penunjuk waktu. Urutan benar mengikuti perjalanan matahari (Fajar, Siang, Senja, Malam) sebagaimana tertulis di
 *       catatan jaga (Arsip Penjaga). Salah = semua pilar padam (reset aman, tanpa hukuman). Benar = Pintu Segel terbuka.
 *  - 2) Jangkar Retakan (Koridor Retakan). Tiga potongan lorong (S1, S2, S3) dapat bergeser dan menutup jalan. Dua jangkar waktu
 *       di ujung selatan masing-masing menggeser DUA potongan: jangkar A = {S1, S2}, jangkar B = {S2, S3}; tiap sentuhan membalik
 *       keadaan potongan itu (bergeser <-> sejajar). Keadaan awal: S1 dan S3 bergeser, S2 sejajar. Tiap jangkar harus disentuh
 *       ganjil kali (cukup sekali): A lalu B atau B lalu A. Keadaan apa pun dapat dibalik, jadi tidak pernah terkunci.
 *
 * Yang disimpan di save hanya flag selesai (`c4.seals_solved`, `c4.rift_aligned`). Kemajuan di tengah teka-teki (urutan pilar,
 * keadaan potongan) hanya hidup di `FortressPuzzleSession` dan kembali ke awal saat scene dibuat ulang (aman, sengaja).
 */

// ---------------------------------------------------------------- teka-teki 1
export const SEAL_ORDER = ['seal_dawn', 'seal_noon', 'seal_dusk', 'seal_night'] as const;
export type SealId = (typeof SEAL_ORDER)[number];

export type SealOutcome =
  | { kind: 'ignored' }
  | { kind: 'already' }
  | { kind: 'progress'; id: SealId; step: number; total: number }
  | { kind: 'wrong'; id: SealId; had: number }
  | { kind: 'solved'; id: SealId };

// ---------------------------------------------------------------- teka-teki 2
export const RIFT_SEGMENTS = 3;
export type RiftBits = readonly [boolean, boolean, boolean]; // true = bergeser (menutup jalan)
export const RIFT_INITIAL: RiftBits = [true, false, true];
export const ANCHOR_IDS = ['anchor_a', 'anchor_b'] as const;
export type AnchorId = (typeof ANCHOR_IDS)[number];
/** Indeks potongan yang dibalik oleh tiap jangkar. */
export const ANCHOR_EFFECT: Readonly<Record<AnchorId, readonly number[]>> = { anchor_a: [0, 1], anchor_b: [1, 2] };

export type RiftOutcome =
  | { kind: 'ignored' }
  | { kind: 'already' }
  | { kind: 'toggle'; anchor: AnchorId; state: RiftBits; aligned: number }
  | { kind: 'solved'; anchor: AnchorId; state: RiftBits };

/** Kemajuan sementara (bukan bagian save). Satu instans dipakai bersama oleh cerita dan view selama scene hidup. */
export class FortressPuzzleSession {
  sealProgress: SealId[] = [];
  rift: [boolean, boolean, boolean] = [...RIFT_INITIAL] as [boolean, boolean, boolean];
  pressed: Record<AnchorId, number> = { anchor_a: 0, anchor_b: 0 };
  reset(): void {
    this.sealProgress = [];
    this.rift = [...RIFT_INITIAL] as [boolean, boolean, boolean];
    this.pressed = { anchor_a: 0, anchor_b: 0 };
  }
}

type Flags = Readonly<Record<string, boolean>>;

export const isSealId = (id: string): id is SealId => (SEAL_ORDER as readonly string[]).includes(id);
export const isAnchorId = (id: string): id is AnchorId => (ANCHOR_IDS as readonly string[]).includes(id);

// ---------------------------------------------------------------- status dari flag
export const sealsSolved = (f: Flags): boolean => !!f[FORT.sealsSolved];
export const riftSolved = (f: Flags): boolean => !!f[FORT.riftAligned];
/** Keadaan potongan yang ditampilkan: selesai -> semua sejajar; selain itu kemajuan sesi. */
export function riftBits(f: Flags, s: FortressPuzzleSession): RiftBits {
  return riftSolved(f) ? [false, false, false] : [s.rift[0], s.rift[1], s.rift[2]];
}
/** Pilar yang menyala: selesai -> semua; selain itu yang sudah benar berurutan. */
export function litSeals(f: Flags, s: FortressPuzzleSession): SealId[] {
  return sealsSolved(f) ? [...SEAL_ORDER] : [...s.sealProgress];
}
/** Jangkar tampak "ditekan" bila disentuh ganjil kali (atau teka-teki selesai). */
export function anchorPressed(f: Flags, s: FortressPuzzleSession, id: AnchorId): boolean {
  return riftSolved(f) || s.pressed[id] % 2 === 1;
}

/**
 * Seluruh penghalang dinamis yang AKTIF menurut flag + sesi. Satu-satunya sumber aturan pintu/slab: FortressView.apply memasang
 * collision dari sini dan tes jangkauan memakainya, jadi visual, collision dan cerita tidak dapat berbeda.
 */
export function activeBlockers(f: Flags, s: FortressPuzzleSession): Set<FortressDynamicId> {
  const out = new Set<FortressDynamicId>();
  if (!sealsSolved(f)) out.add('door_seal');
  if (!f[FORT.shortcutOpen]) out.add('door_shortcut');
  if (!f[C4.aegisLearned]) out.add('door_trial');
  if (!f[C4.checkpoint]) out.add('door_heart');
  if (!f[C4.heartOpen]) out.add('door_echo');
  const bits = riftBits(f, s);
  if (bits[0]) out.add('slab_1');
  if (bits[1]) out.add('slab_2');
  if (bits[2]) out.add('slab_3');
  return out;
}

// ---------------------------------------------------------------- aksi
/**
 * Memproses satu aktivasi segel. Mengubah `session` saja (tidak pernah flag); cerita yang meng-commit flag sesudah dialog.
 * Idempoten: teka-teki yang sudah selesai selalu 'already' tanpa mengubah sesi.
 */
export function sealActivate(id: string, f: Flags, s: FortressPuzzleSession): SealOutcome {
  if (!isSealId(id)) return { kind: 'ignored' };
  if (sealsSolved(f)) return { kind: 'already' };
  const next = SEAL_ORDER[s.sealProgress.length];
  if (id !== next) {
    const had = s.sealProgress.length;
    s.sealProgress = [];
    return { kind: 'wrong', id, had };
  }
  s.sealProgress.push(id);
  if (s.sealProgress.length === SEAL_ORDER.length) {
    s.sealProgress = [];
    return { kind: 'solved', id };
  }
  return { kind: 'progress', id, step: s.sealProgress.length, total: SEAL_ORDER.length };
}

/** Memproses satu sentuhan jangkar: membalik potongan yang terkait. Selalu dapat dibalik; tidak pernah terkunci. */
export function anchorTouch(id: string, f: Flags, s: FortressPuzzleSession): RiftOutcome {
  if (!isAnchorId(id)) return { kind: 'ignored' };
  if (riftSolved(f)) return { kind: 'already' };
  for (const i of ANCHOR_EFFECT[id]) s.rift[i] = !s.rift[i];
  s.pressed[id] += 1;
  const state: RiftBits = [s.rift[0], s.rift[1], s.rift[2]];
  const aligned = state.filter((b) => !b).length;
  if (aligned === RIFT_SEGMENTS) return { kind: 'solved', anchor: id, state };
  return { kind: 'toggle', anchor: id, state, aligned };
}

/** Penyelesaian ada selama tiap jangkar disentuh ganjil kali; dipakai tes untuk membuktikan keadaan apa pun dapat diselesaikan. */
export function solvableFrom(bits: RiftBits): boolean {
  // ruang keadaan dibangkitkan oleh dua pembalikan; BFS kecil (maks 8 keadaan)
  const key = (b: readonly boolean[]): string => b.map((x) => (x ? 1 : 0)).join('');
  const seen = new Set<string>([key(bits)]);
  const q: boolean[][] = [[...bits]];
  while (q.length) {
    const cur = q.pop()!;
    if (cur.every((b) => !b)) return true;
    for (const a of ANCHOR_IDS) {
      const nx = [...cur];
      for (const i of ANCHOR_EFFECT[a]) nx[i] = !nx[i];
      const k = key(nx);
      if (!seen.has(k)) { seen.add(k); q.push(nx); }
    }
  }
  return false;
}
