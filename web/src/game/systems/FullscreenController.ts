export type FullscreenResult = { ok: true } | { ok: false; reason: 'unsupported' | 'denied' | 'error' };

interface FullscreenDoc {
  fullscreenEnabled?: boolean;
  fullscreenElement: Element | null;
  exitFullscreen(): Promise<void>;
  addEventListener(type: 'fullscreenchange', cb: () => void): void;
}

type FullscreenListener = (isFullscreen: boolean) => void;

/**
 * Pembungkus Fullscreen API. Permintaan butuh user gesture; penolakan browser ditangani
 * (hasil `ok: false`) agar UI dapat mengembalikan toggle dan menampilkan pesan, bukan diam.
 * Keadaan sebenarnya selalu mengikuti `document.fullscreenElement` (misal pemain menekan Esc browser).
 */
export class FullscreenController {
  private readonly listeners = new Set<FullscreenListener>();

  constructor(
    private readonly doc: FullscreenDoc,
    private readonly element: { requestFullscreen?: (o?: FullscreenOptions) => Promise<void> },
  ) {
    doc.addEventListener('fullscreenchange', () => {
      const state = this.isFullscreen;
      for (const l of this.listeners) l(state);
    });
  }

  get isSupported(): boolean {
    return this.doc.fullscreenEnabled !== false && typeof this.element.requestFullscreen === 'function';
  }

  get isFullscreen(): boolean {
    return this.doc.fullscreenElement !== null;
  }

  subscribe(l: FullscreenListener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  async set(on: boolean): Promise<FullscreenResult> {
    if (on === this.isFullscreen) return { ok: true };
    if (!this.isSupported) return { ok: false, reason: 'unsupported' };
    try {
      if (on) await this.element.requestFullscreen!({ navigationUI: 'hide' });
      else await this.doc.exitFullscreen();
      return { ok: true };
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      return { ok: false, reason: name === 'TypeError' || name === 'NotAllowedError' ? 'denied' : 'error' };
    }
  }
}
