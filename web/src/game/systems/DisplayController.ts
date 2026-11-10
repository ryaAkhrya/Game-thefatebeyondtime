import type { InputManager } from '../core/InputManager';
import { checkDesktopSupport, computeScale } from './DisplayScale';
import type { SettingsRepository } from './SettingsRepository';

/**
 * Menghubungkan window <-> canvas: ukuran tampilan 16:9 (Fit / Pixel Perfect), letterbox matte,
 * dan pesan desktop-only. Semua perhitungan ada di DisplayScale.ts (murni, teruji);
 * kelas ini hanya menerapkan hasilnya ke DOM.
 */
export class DisplayController {
  private lastKey = '';

  constructor(
    private readonly win: Window,
    private readonly canvas: HTMLCanvasElement,
    private readonly guardEl: HTMLElement,
    private readonly settings: SettingsRepository,
    private readonly input: InputManager,
  ) {
    const refresh = (): void => this.refresh();
    win.addEventListener('resize', refresh);
    win.visualViewport?.addEventListener('resize', refresh);
    settings.subscribe((_s, changed) => {
      if (changed === 'screen_scale' || changed === 'all') refresh();
    });
    // Perubahan devicePixelRatio (zoom browser / pindah monitor)
    const watchDpr = (): void => {
      const mq = win.matchMedia(`(resolution: ${win.devicePixelRatio}dppx)`);
      mq.addEventListener(
        'change',
        () => {
          refresh();
          watchDpr();
        },
        { once: true },
      );
    };
    watchDpr();
    this.refresh();
  }

  refresh(): void {
    const w = this.win.innerWidth;
    const h = this.win.innerHeight;
    const coarseOnly =
      this.win.matchMedia('(pointer: coarse)').matches && !this.win.matchMedia('(any-pointer: fine)').matches;

    const support = checkDesktopSupport({ width: w, height: h, coarsePointerOnly: coarseOnly });
    this.guardEl.hidden = support.ok;
    this.guardEl.dataset.reason = support.ok ? '' : support.reason;
    this.input.setEnabled(support.ok);
    this.canvas.style.visibility = support.ok ? 'visible' : 'hidden';

    const dpr = this.win.devicePixelRatio || 1;
    const r = computeScale(w, h, this.settings.get('screen_scale'), dpr);
    const key = `${r.cssWidth}x${r.cssHeight}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    this.canvas.style.width = `${r.cssWidth}px`;
    this.canvas.style.height = `${r.cssHeight}px`;
  }
}
