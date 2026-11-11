/**
 * Satu-satunya pintu input keyboard game. Semua scene membaca "intent" (bukan tombol mentah),
 * sehingga mapping hanya ada di sini (TECHNICAL_DESIGN.md bagian 5).
 *
 * Aturan fokus: hanya layer teratas yang menerima intent (Modal Settings > Pause > Dialogue > Battle > World).
 * Tombol yang sedang ditahan saat layer berganti DIABAIKAN sampai dilepas, sehingga satu tekan Enter
 * tidak bisa membuka menu lalu langsung memilih item pertamanya (double advance / input bocor).
 */

export type Intent = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back';

export const KEY_BINDINGS: Readonly<Record<string, Intent>> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Enter: 'confirm',
  NumpadEnter: 'confirm',
  KeyZ: 'confirm',
  KeyE: 'confirm',
  Space: 'confirm',
  Escape: 'back',
  KeyX: 'back',
};

/** Label kontrol untuk layar Panduan Kontrol (satu sumber dengan KEY_BINDINGS). */
export const CONTROL_LEGEND: ReadonlyArray<{ intent: Intent | 'move'; keys: string; labelId: string }> = [
  { intent: 'move', keys: 'WASD / Panah', labelId: 'Jalan, pilih menu' },
  { intent: 'confirm', keys: 'Enter/Z/E/Spasi', labelId: 'Periksa, lanjut' },
  { intent: 'back', keys: 'Esc / X', labelId: 'Kembali, jeda' },
  { intent: 'left', keys: 'Kiri / Kanan', labelId: 'Ubah pengaturan' },
];

export interface IntentEvent {
  intent: Intent;
  /** true bila berasal dari auto-repeat tombol yang ditahan. Hanya arah yang diteruskan saat repeat. */
  repeat: boolean;
}

export type IntentHandler = (e: IntentEvent) => void;

interface KeyEventLike {
  code: string;
  shiftKey?: boolean;
  repeat?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  preventDefault(): void;
}

interface Layer {
  id: string;
  handler: IntentHandler;
}

export class InputManager {
  private readonly layers: Layer[] = [];
  private readonly held = new Set<string>();
  /** Urutan tombol yang sedang ditahan (terbaru di belakang): arah terakhir yang ditekan menang. */
  private heldOrder: string[] = [];
  private suppressed = new Set<string>();
  private enabled = true;
  private shift = false;
  private readonly gestureListeners: Array<() => void> = [];
  private gestureFired = false;

  private readonly onKeyDown = (ev: Event): void => this.handleKeyDown(ev as unknown as KeyEventLike);
  private readonly onKeyUp = (ev: Event): void => this.handleKeyUp(ev as unknown as KeyEventLike);
  private readonly onBlur = (): void => this.releaseAll();

  constructor(private readonly target: EventTarget) {
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.onBlur);
  }

  destroy(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.onBlur);
    this.layers.length = 0;
  }

  /** Dipanggil sekali pada interaksi pertama pemain (dipakai untuk membuka audio browser). */
  onFirstGesture(cb: () => void): void {
    if (this.gestureFired) cb();
    else this.gestureListeners.push(cb);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.releaseAll();
  }

  get topLayerId(): string | null {
    return this.layers.at(-1)?.id ?? null;
  }

  get layerCount(): number {
    return this.layers.length;
  }

  /** Mendaftarkan layer fokus baru di atas tumpukan. Mengembalikan fungsi untuk melepasnya. */
  pushLayer(id: string, handler: IntentHandler): () => void {
    const layer: Layer = { id, handler };
    this.layers.push(layer);
    this.suppressHeld();
    return () => {
      const i = this.layers.indexOf(layer);
      if (i >= 0) {
        this.layers.splice(i, 1);
        this.suppressHeld();
      }
    };
  }

  /** Untuk tes dan fallback: simulasikan intent langsung ke layer teratas. */
  dispatch(intent: Intent, repeat = false): void {
    this.layers.at(-1)?.handler({ intent, repeat });
  }

  private suppressHeld(): void {
    this.suppressed = new Set(this.held);
  }

  private releaseAll(): void {
    this.shift = false;
    this.held.clear();
    this.heldOrder = [];
    this.suppressed.clear();
  }

  /**
   * Arah gerak yang sedang ditahan (4 arah, tanpa diagonal): tombol arah terbaru yang ditahan dan tidak
   * sedang ditekan sejak sebelum layer berganti. null bila tidak ada, input dimatikan, atau tombol disuppress.
   */
  /**
   * Shift ditahan = lari (Sprint 2). Shift bukan intent: tidak pernah memicu menu, melewati dialog atau aksi battle;
   * hanya dibaca oleh gerak dunia. Hilang saat jendela kehilangan fokus atau input dimatikan.
   */
  isSprintHeld(): boolean {
    return this.enabled && this.shift;
  }

  getMoveDirection(): 'up' | 'down' | 'left' | 'right' | null {
    if (!this.enabled) return null;
    for (let i = this.heldOrder.length - 1; i >= 0; i--) {
      const code = this.heldOrder[i]!;
      if (this.suppressed.has(code)) continue;
      const intent = KEY_BINDINGS[code];
      if (intent === 'up' || intent === 'down' || intent === 'left' || intent === 'right') return intent;
    }
    return null;
  }

  private handleKeyDown(ev: KeyEventLike): void {
    if (!this.enabled) return;
    if (ev.code === 'ShiftLeft' || ev.code === 'ShiftRight') { this.shift = true; return; }
    if (ev.shiftKey !== undefined) this.shift = ev.shiftKey;
    if (ev.ctrlKey || ev.altKey || ev.metaKey) return; // jangan ganggu shortcut browser
    const intent = KEY_BINDINGS[ev.code];
    if (!intent) return;

    ev.preventDefault();
    const isRepeat = ev.repeat === true;
    if (!this.held.has(ev.code)) this.heldOrder.push(ev.code);
    this.held.add(ev.code);

    if (!this.gestureFired) {
      this.gestureFired = true;
      for (const cb of this.gestureListeners.splice(0)) cb();
    }

    if (this.suppressed.has(ev.code)) return;
    const directional = intent === 'up' || intent === 'down' || intent === 'left' || intent === 'right';
    if (isRepeat && !directional) return; // Enter/Esc ditahan tidak boleh mengulang aksi

    this.layers.at(-1)?.handler({ intent, repeat: isRepeat });
  }

  private handleKeyUp(ev: KeyEventLike): void {
    if (ev.code === 'ShiftLeft' || ev.code === 'ShiftRight') this.shift = false;
    else if (ev.shiftKey !== undefined) this.shift = ev.shiftKey;
    this.held.delete(ev.code);
    this.heldOrder = this.heldOrder.filter((c) => c !== ev.code);
    this.suppressed.delete(ev.code);
  }
}
