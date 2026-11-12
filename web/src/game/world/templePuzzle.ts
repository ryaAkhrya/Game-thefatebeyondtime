import { C3 } from '../story/chapter3Flags';

/**
 * Logika teka-teki Kuil Jejak (MURNI, tanpa Phaser). Tiga teka-teki pengamatan; jawaban selalu tampak di lingkungan:
 *  - A (Ruang Pilar): tiga pilar bergaris 1/2/3. Urutan = jumlah garis naik, sesuai lukisan dinding di atas pilar.
 *  - B (Ruang Segel): tiga cakram segel. Jawaban = cakram yang disorot tiang cahaya lampu yang berhenti.
 *  - C (Ruang Gerbang): tiga alas arah menghadap lingkaran di lantai. Lukisan di dinding menunjukkan arah garis: dari barat
 *    menunjuk timur, dari timur menunjuk barat, dari selatan (alas yang ditutup belakangan) menunjuk utara. Alas membeku
 *    sampai A dan B selesai.
 * Salah = reset aman (tidak ada hukuman, tidak ada kondisi mati). Yang disimpan di save hanya flag A/B/C; kemajuan di tengah
 * teka-teki (urutan pilar, arah alas) hanya hidup di `TemplePuzzleSession` dan boleh hilang saat memuat.
 */
export type PuzzleId = 'A' | 'B' | 'C';
export const PUZZLES: readonly PuzzleId[] = ['A', 'B', 'C'];
export const PUZZLE_FLAG: Readonly<Record<PuzzleId, string>> = { A: C3.puzzleA, B: C3.puzzleB, C: C3.puzzleC };

/** Urutan benar teka-teki A (id interaktif / prop). */
export const A_ORDER = ['a_pillar_1', 'a_pillar_2', 'a_pillar_3'] as const;
export const B_DISCS = ['b_disc_1', 'b_disc_2', 'b_disc_3'] as const;
export const B_ANSWER = 'b_disc_3';
export const DIAL_IDS = ['c_dial_l', 'c_dial_r', 'c_dial_m'] as const;
export type DialId = (typeof DIAL_IDS)[number];
/** Arah 0=utara 1=timur 2=selatan 3=barat; interaksi memutar searah jarum jam. */
export type Dir = 0 | 1 | 2 | 3;
export const DIAL_TARGET: Readonly<Record<DialId, Dir>> = { c_dial_l: 1, c_dial_r: 3, c_dial_m: 0 };
export const DIAL_START: Readonly<Record<DialId, Dir>> = { c_dial_l: 3, c_dial_r: 1, c_dial_m: 2 };

export type Outcome =
  | { kind: 'ignored' }
  | { kind: 'already'; puzzle: PuzzleId }
  | { kind: 'locked'; puzzle: 'C' }
  | { kind: 'progress'; puzzle: 'A'; id: string; step: number; total: number }
  | { kind: 'wrong'; puzzle: 'A' | 'B'; id: string }
  | { kind: 'dial'; puzzle: 'C'; id: DialId; pos: Dir; aligned: number }
  | { kind: 'solved'; puzzle: PuzzleId; id: string };

/** Kemajuan sementara (bukan bagian save). Satu instans dipakai bersama oleh cerita dan view selama scene hidup. */
export class TemplePuzzleSession {
  progressA: string[] = [];
  dials: Record<DialId, Dir> = { ...DIAL_START };
  reset(): void {
    this.progressA = [];
    this.dials = { ...DIAL_START };
  }
}

type Flags = Readonly<Record<string, boolean>>;

export function puzzleOf(id: string): PuzzleId | null {
  if ((A_ORDER as readonly string[]).includes(id)) return 'A';
  if ((B_DISCS as readonly string[]).includes(id)) return 'B';
  if ((DIAL_IDS as readonly string[]).includes(id)) return 'C';
  return null;
}

// ---------------------------------------------------------------- status dari flag
export function solvedMap(flags: Flags): Record<PuzzleId, boolean> {
  return { A: !!flags[C3.puzzleA], B: !!flags[C3.puzzleB], C: !!flags[C3.puzzleC] };
}
export const solvedCount = (flags: Flags): number => PUZZLES.filter((p) => flags[PUZZLE_FLAG[p]]).length;
export const allSolved = (flags: Flags): boolean => solvedCount(flags) === PUZZLES.length;
/** Alas arah (C) membeku sampai kedua teka-teki ruang samping selesai. */
export const cUnlocked = (flags: Flags): boolean => !!flags[C3.puzzleA] && !!flags[C3.puzzleB];
/** Gerbang aula benar-benar terbuka hanya bila semua teka-teki selesai DAN flag gerbang sudah di-commit. */
export const gateIsOpen = (flags: Flags): boolean => allSolved(flags) && !!flags[C3.gateOpen];
/** Semua selesai tetapi flag gerbang belum di-commit (mis. keluar di tengah dialog): onStart memperbaikinya. */
export const gateNeedsOpening = (flags: Flags): boolean => allSolved(flags) && !flags[C3.gateOpen];

/** Serialisasi: status selesai -> flag; dan sebaliknya. fromFlags(toFlags(x)) == x. */
export function toFlags(solved: Readonly<Record<PuzzleId, boolean>>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const p of PUZZLES) if (solved[p]) out[PUZZLE_FLAG[p]] = true;
  return out;
}
export const fromFlags = solvedMap;

/** Arah alas yang ditampilkan: sudah selesai -> sasaran; selain itu kemajuan sesi. */
export function dialPositions(flags: Flags, session: TemplePuzzleSession): Record<DialId, Dir> {
  return flags[C3.puzzleC] ? { ...DIAL_TARGET } : { ...session.dials };
}
/** Pilar yang menyala: selesai -> semua; selain itu yang sudah benar berurutan. */
export function litPillars(flags: Flags, session: TemplePuzzleSession): string[] {
  return flags[C3.puzzleA] ? [...A_ORDER] : [...session.progressA];
}

// ---------------------------------------------------------------- aksi
/**
 * Memproses satu aktivasi. Mengubah `session` saja (tidak pernah flag); cerita yang meng-commit flag sesudah dialog.
 * Idempoten: teka-teki yang sudah selesai selalu 'already' tanpa mengubah sesi.
 */
export function activate(id: string, flags: Flags, session: TemplePuzzleSession): Outcome {
  const puzzle = puzzleOf(id);
  if (!puzzle) return { kind: 'ignored' };
  if (flags[PUZZLE_FLAG[puzzle]]) return { kind: 'already', puzzle };

  if (puzzle === 'A') {
    const next = A_ORDER[session.progressA.length];
    if (id !== next) { session.progressA = []; return { kind: 'wrong', puzzle: 'A', id }; }
    session.progressA.push(id);
    if (session.progressA.length === A_ORDER.length) { session.progressA = []; return { kind: 'solved', puzzle: 'A', id }; }
    return { kind: 'progress', puzzle: 'A', id, step: session.progressA.length, total: A_ORDER.length };
  }
  if (puzzle === 'B') return id === B_ANSWER ? { kind: 'solved', puzzle: 'B', id } : { kind: 'wrong', puzzle: 'B', id };

  if (!cUnlocked(flags)) return { kind: 'locked', puzzle: 'C' };
  const dial = id as DialId;
  const pos = (((session.dials[dial] ?? DIAL_START[dial]) + 1) % 4) as Dir;
  session.dials[dial] = pos;
  const aligned = DIAL_IDS.filter((d) => session.dials[d] === DIAL_TARGET[d]).length;
  if (aligned === DIAL_IDS.length) return { kind: 'solved', puzzle: 'C', id };
  return { kind: 'dial', puzzle: 'C', id: dial, pos, aligned };
}
