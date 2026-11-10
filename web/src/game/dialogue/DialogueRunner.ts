import type { TextSpeed } from '../data/settingsSchema';
import { visibleChars } from '../utils/typewriter';
import type { DialogueLine, DialogueNode, DialogueScript } from './types';
import { paginate, wrapText } from './wrap';

export type RunnerState = 'idle' | 'typing' | 'waiting' | 'choice' | 'done';
export type PressResult = 'completed_text' | 'advanced' | 'finished' | 'chose' | 'ignored';

export interface RunnerOptions {
  getTextSpeed: () => TextSpeed;
  /** Karakter per baris saat ada portrait / tanpa portrait. */
  charsWithPortrait?: number;
  charsWithoutPortrait?: number;
  linesPerPage?: number;
  defaultPauseMs?: number;
  /** Dipanggil saat pilihan dipilih (ID pilihan, ID opsi). */
  onChoice?: (choiceId: string, optionId: string) => void;
}

/**
 * Mesin status dialog MURNI (tanpa Phaser). Aturan input:
 * - Saat teks diketik, Enter pertama menampilkan semua teks; Enter berikutnya melanjutkan.
 * - Setelah teks selesai ada jeda minimal (pause_ms) sebelum Enter diterima, supaya satu tekan
 *   tidak pernah melompati dua halaman/baris.
 * - Teks panjang dipecah per halaman; satu halaman = satu tekan.
 */
export class DialogueRunner {
  state: RunnerState = 'idle';
  private queue: DialogueNode[] = [];
  private line: DialogueLine | null = null;
  private pages: string[][] = [];
  private pageIndex = 0;
  private elapsed = 0;
  private waitElapsed = 0;
  private lockMs = 0;
  private choiceIndex = 0;
  private choiceNode: Extract<DialogueNode, { type: 'choice' }> | null = null;
  /** Dinaikkan setiap kali baris/halaman/pilihan berganti; UI memakainya untuk mendeteksi perubahan. */
  version = 0;
  readonly choicesMade: Record<string, string> = {};
  /** Jumlah baris yang sudah ditampilkan sampai selesai (untuk tes/audit). */
  readonly linesShown: string[] = [];

  constructor(
    private script: DialogueScript,
    private readonly opts: RunnerOptions,
  ) {}

  get scriptId(): string {
    return this.script.id;
  }

  start(): void {
    this.queue = [...this.script.nodes];
    this.state = 'idle';
    this.next();
  }

  get currentLine(): DialogueLine | null {
    return this.line;
  }

  get choice(): { id: string; options: readonly { id: string; text: string }[]; index: number } | null {
    return this.choiceNode ? { id: this.choiceNode.id, options: this.choiceNode.options, index: this.choiceIndex } : null;
  }

  get pageLines(): readonly string[] {
    return this.pages[this.pageIndex] ?? [];
  }

  get pageCount(): number {
    return this.pages.length;
  }

  get currentPage(): number {
    return this.pageIndex;
  }

  get hasPortraitLayout(): boolean {
    return this.line !== null && this.line.speaker !== 'SYSTEM' && this.line.expression !== undefined;
  }

  /** Teks halaman saat ini yang sudah terlihat (typewriter). */
  get visibleText(): string {
    const full = this.pageLines.join('\n');
    if (this.state === 'typing') return full.slice(0, visibleChars(this.elapsed, this.opts.getTextSpeed(), full.length));
    return full;
  }

  get isTextComplete(): boolean {
    return this.state !== 'typing';
  }

  get canAdvance(): boolean {
    return this.state === 'waiting' && this.waitElapsed >= this.lockMs;
  }

  update(dtMs: number): void {
    if (this.state === 'typing') {
      this.elapsed += dtMs;
      const full = this.pageLines.join('\n');
      if (visibleChars(this.elapsed, this.opts.getTextSpeed(), full.length) >= full.length) this.finishTyping();
    } else if (this.state === 'waiting') {
      this.waitElapsed += dtMs;
    }
  }

  press(): PressResult {
    switch (this.state) {
      case 'typing':
        this.finishTyping();
        return 'completed_text';
      case 'waiting': {
        if (this.waitElapsed < this.lockMs) return 'ignored';
        if (this.pageIndex + 1 < this.pages.length) {
          this.pageIndex++;
          this.beginPage();
          return 'advanced';
        }
        return this.next() ? 'advanced' : 'finished';
      }
      case 'choice':
        return this.chooseCurrent();
      default:
        return 'ignored';
    }
  }

  /** Esc: aman, hanya mempercepat teks yang sedang diketik (tidak melewati cerita). */
  fastComplete(): boolean {
    if (this.state !== 'typing') return false;
    this.finishTyping();
    return true;
  }

  moveChoice(delta: number): void {
    if (this.state !== 'choice' || !this.choiceNode) return;
    const n = this.choiceNode.options.length;
    this.choiceIndex = (this.choiceIndex + delta + n) % n;
    this.version++;
  }

  private chooseCurrent(): PressResult {
    const node = this.choiceNode;
    if (!node) return 'ignored';
    const opt = node.options[this.choiceIndex]!;
    this.choicesMade[node.id] = opt.id;
    this.opts.onChoice?.(node.id, opt.id);
    // Pilihan diucapkan oleh pemain, lalu cerita lanjut (semua opsi bermuara sama).
    const spoken: DialogueLine = {
      type: 'line',
      id: `${node.id}-${opt.id}`,
      speaker: node.speaker,
      expression: opt.expression ?? 'NEUTRAL',
      text: opt.text,
      kind: 'speech',
      source: 'CHAPTER_I_SCRIPT',
    };
    this.choiceNode = null;
    this.queue.unshift(spoken);
    this.next();
    return 'chose';
  }

  /** Maju ke node berikutnya. Mengembalikan false bila skrip selesai. */
  private next(): boolean {
    const node = this.queue.shift();
    if (!node) {
      this.state = 'done';
      this.line = null;
      this.version++;
      return false;
    }
    if (node.type === 'choice') {
      this.line = null;
      this.choiceNode = node;
      this.choiceIndex = 0;
      this.state = 'choice';
      this.version++;
      return true;
    }
    this.line = node;
    const chars = (this.hasPortraitLayout ? this.opts.charsWithPortrait : this.opts.charsWithoutPortrait) ?? 28;
    const text = node.kind === 'thought' ? `(${node.text})` : node.text;
    this.pages = paginate(wrapText(text, chars), this.opts.linesPerPage ?? 4);
    this.pageIndex = 0;
    this.beginPage();
    return true;
  }

  private beginPage(): void {
    this.elapsed = 0;
    this.waitElapsed = 0;
    this.lockMs = Math.min(this.line?.pauseMs ?? this.opts.defaultPauseMs ?? 180, 600);
    this.state = 'typing';
    this.version++;
    // Instan: tidak ada fase mengetik.
    const full = this.pageLines.join('\n');
    if (visibleChars(0, this.opts.getTextSpeed(), full.length) >= full.length) this.finishTyping();
  }

  private finishTyping(): void {
    this.state = 'waiting';
    this.waitElapsed = 0;
    this.version++;
    if (this.line && this.pageIndex === this.pages.length - 1) this.linesShown.push(this.line.id);
  }
}
