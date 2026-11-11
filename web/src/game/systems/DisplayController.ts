import type Phaser from 'phaser';
import type { InputManager } from '../core/InputManager';
import { checkDesktopSupport, computeDisplay, type DisplayLayout } from './DisplayScale';
import type { SettingsRepository } from './SettingsRepository';

/** Event game-level yang dipancarkan setiap ukuran kanvas/zoom berubah. Scene UI membangun ulang tata letaknya. */
export const DISPLAY_EVENT = 'tfbt-display';
const REGISTRY_KEY = 'display';

export function layoutForWindow(win: Window, mode: ScreenScaleMode): DisplayLayout {
  return computeDisplay(win.innerWidth, win.innerHeight, mode, win.devicePixelRatio || 1);
}
type ScreenScaleMode = Parameters<typeof computeDisplay>[2];

/** Tata letak tampilan saat ini (dipakai scene mana pun). */
export function getDisplay(scene: Phaser.Scene): DisplayLayout {
  return scene.registry.get(REGISTRY_KEY) as DisplayLayout;
}

/**
 * Menghubungkan window <-> kanvas. Ukuran backing-store kanvas = piksel perangkat (Fit atau kelipatan bulat
 * 640x360 untuk Pixel Perfect), CSS 1:1 dengan piksel perangkat sehingga tidak ada penskalaan browser yang
 * mengaburkan teks. Perhitungan murni ada di DisplayScale.ts (teruji); kelas ini hanya menerapkannya.
 */
export class DisplayController {
  private lastKey = '';
  layout: DisplayLayout;

  constructor(
    private readonly win: Window,
    private readonly game: Phaser.Game,
    private readonly guardEl: HTMLElement,
    private readonly settings: SettingsRepository,
    private readonly input: InputManager,
  ) {
    this.layout = getDisplay({ registry: game.registry } as Phaser.Scene);
    this.lastKey = this.keyOf(this.layout);
    const refresh = (): void => this.refresh();
    win.addEventListener('resize', refresh);
    win.visualViewport?.addEventListener('resize', refresh);
    settings.subscribe((_s, changed) => {
      if (changed === 'screen_scale' || changed === 'all') refresh();
    });
    // Perubahan devicePixelRatio (zoom browser / pindah monitor)
    const watchDpr = (): void => {
      const mq = win.matchMedia(`(resolution: ${win.devicePixelRatio}dppx)`);
      mq.addEventListener('change', () => { refresh(); watchDpr(); }, { once: true });
    };
    watchDpr();
    this.refresh();
  }

  private keyOf(l: DisplayLayout): string {
    return `${l.pixelWidth}x${l.pixelHeight}@${l.dpr}:${l.mode}`;
  }

  refresh(): void {
    const w = this.win.innerWidth;
    const h = this.win.innerHeight;
    const canvas = this.game.canvas;
    const coarseOnly = this.win.matchMedia('(pointer: coarse)').matches && !this.win.matchMedia('(any-pointer: fine)').matches;

    const support = checkDesktopSupport({ width: w, height: h, coarsePointerOnly: coarseOnly });
    this.guardEl.hidden = support.ok;
    this.guardEl.dataset.reason = support.ok ? '' : support.reason;
    this.input.setEnabled(support.ok);
    canvas.style.visibility = support.ok ? 'visible' : 'hidden';

    const r = layoutForWindow(this.win, this.settings.get('screen_scale'));
    const key = this.keyOf(r);
    // CSS size boleh pecahan (DPR 1,25): satu piksel kanvas = satu piksel perangkat.
    canvas.style.width = `${r.cssWidth}px`;
    canvas.style.height = `${r.cssHeight}px`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    this.layout = r;
    this.game.registry.set(REGISTRY_KEY, r);
    this.game.scale.resize(r.pixelWidth, r.pixelHeight);
    canvas.style.width = `${r.cssWidth}px`;
    canvas.style.height = `${r.cssHeight}px`;
    this.game.events.emit(DISPLAY_EVENT, r);
  }
}

export function registerDisplay(game: Phaser.Game, layout: DisplayLayout): void {
  game.registry.set(REGISTRY_KEY, layout);
}
