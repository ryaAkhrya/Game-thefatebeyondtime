import type { CharacterId } from '../data/ids';

/** ID ekspresi sesuai nama file PNG ekspresi (C01_EXPRESSION_<ID>.png). */
export type ExpressionId =
  | 'NEUTRAL'
  | 'CONFUSED'
  | 'DETERMINED'
  | 'SURPRISED'
  | 'HAPPY'
  | 'CONCERNED'
  | 'ANGRY'
  | 'SAD'
  | 'EMBARRASSED'
  | 'STERN' | 'AMUSED' | 'WORRIED' | 'SUSPICIOUS' | 'SKEPTICAL' | 'ALARMED'
  | 'VULNERABLE' | 'MISCHIEVOUS' | 'CURIOUS' | 'SOLEMN' | 'UPSET' | 'CAUTIOUS';

/**
 * speech  = ucapan ke orang lain
 * thought = pikiran (ditampilkan dalam tanda kurung)
 * read    = membaca tulisan (teks sudah memuat tanda kutipnya)
 * system  = pesan sistem/jurnal tanpa portrait
 */
export type LineKind = 'speech' | 'thought' | 'read' | 'system';

export interface DialogueLine {
  type: 'line';
  /** ID baris. Baris dari DIALOGUE_EVENTS.json memakai line_id aslinya; selain itu ID kerja (-X..). */
  id: string;
  speaker: CharacterId | 'SYSTEM';
  /** Nama tampilan (opsional); default dari DISPLAY_NAMES. */
  label?: string;
  expression?: ExpressionId;
  text: string;
  kind: LineKind;
  /** Jeda minimal sebelum Enter berikutnya diterima (ms), dari pause_ms DIALOGUE_EVENTS.json. */
  pauseMs?: number;
  /** Path portrait sumber di assets/ (sesuai DIALOGUE_EVENTS.json); salinan runtime diturunkan dari ID. */
  portrait?: string;
  /** Asal teks, untuk audit editorial. */
  source: 'DIALOGUE_EVENTS' | 'CHAPTER_I_SCRIPT' | 'CHAPTER_II_SCRIPT' | 'REUSE' | 'DRAFT_IMPL';
}

export interface ChoiceOption {
  id: string;
  /** Teks pilihan; setelah dipilih diucapkan oleh `speaker` sebagai baris dialog. */
  text: string;
  expression?: ExpressionId;
}

export interface DialogueChoice {
  type: 'choice';
  id: string;
  speaker: CharacterId;
  options: ChoiceOption[];
}

export type DialogueNode = DialogueLine | DialogueChoice;

export interface DialogueScript {
  id: string;
  nodes: DialogueNode[];
}

export const DISPLAY_NAMES: Readonly<Record<string, string>> = {
  C01: 'Yaric',
  C02: 'Velthia',
  C03: 'Torvan',
  C04: 'Varlgrim',
  C05: 'Azie',
  C06: 'Talric',
  C07: 'Zira',
  C08: 'Nambo',
  C09: 'Derrria',
  SYSTEM: '',
};

/** Key texture portrait runtime: <ID karakter>_<EKSPRESI>. */
export function portraitKey(speaker: string, expression: string | undefined): string | null {
  if (speaker === 'SYSTEM' || !expression) return null;
  return `${speaker}_${expression}`;
}

export function portraitUrl(key: string): string {
  return `assets/portraits/${key}.png`;
}
