import { GAME_HEIGHT, GAME_WIDTH, MIN_VIEWPORT_HEIGHT, MIN_VIEWPORT_WIDTH, UI_HEIGHT } from '../config/constants';
import type { ScreenScale } from '../data/settingsSchema';

export interface DisplayLayout {
  /** Ukuran tampilan kanvas dalam CSS px (boleh pecahan agar tepat satu-banding-satu dengan piksel perangkat). */
  cssWidth: number;
  cssHeight: number;
  /** Ukuran backing-store kanvas = piksel perangkat. UI digambar 1:1 pada resolusi ini. */
  pixelWidth: number;
  pixelHeight: number;
  dpr: number;
  /** Zoom kamera dunia, SELALU bilangan bulat (pixel art rata, tanpa shimmer). */
  worldZoom: number;
  /** Zoom sprite battle, SELALU bilangan bulat. */
  battleZoom: number;
  /** Piksel perangkat per satuan desain UI (960x540). Pecahan diperbolehkan; semua ukuran UI dibulatkan. */
  uiScale: number;
  /** Fit mengisi viewport; pixel_perfect hanya kelipatan bulat 640x360 dengan letterbox. */
  mode: ScreenScale;
}

/**
 * Menghitung tata letak tampilan 16:9 untuk viewport tertentu.
 * - fit: kanvas sebesar viewport (rasio 16:9, tanpa stretch) dalam piksel perangkat.
 * - pixel_perfect: kanvas = kelipatan bulat 640x360 dalam piksel perangkat, sisanya letterbox.
 * Zoom dunia dan battle dipilih sebagai bilangan bulat pada kedua mode, sehingga tidak ada penskalaan pecahan
 * pada pixel art. Hanya UI vektor/teks yang memakai skala pecahan, dan ia dirasterisasi pada resolusi perangkat.
 */
export function computeDisplay(viewportWidth: number, viewportHeight: number, mode: ScreenScale, devicePixelRatio = 1): DisplayLayout {
  const dpr = devicePixelRatio > 0 ? devicePixelRatio : 1;
  const devW = Math.max(1, Math.floor(viewportWidth * dpr));
  const devH = Math.max(1, Math.floor(viewportHeight * dpr));

  let pixelWidth: number;
  let pixelHeight: number;
  let worldZoom: number;
  if (mode === 'pixel_perfect') {
    const k = Math.max(1, Math.floor(Math.min(devW / GAME_WIDTH, devH / GAME_HEIGHT) + 1e-6));
    pixelWidth = GAME_WIDTH * k;
    pixelHeight = GAME_HEIGHT * k;
    worldZoom = k;
  } else {
    pixelHeight = Math.max(1, Math.min(devH, Math.floor((devW * 9) / 16)));
    pixelWidth = Math.max(1, Math.round((pixelHeight * 16) / 9));
    worldZoom = Math.max(1, Math.round(pixelWidth / GAME_WIDTH));
  }
  const battleZoom = Math.max(2, Math.round(pixelHeight / 250));
  return {
    cssWidth: pixelWidth / dpr,
    cssHeight: pixelHeight / dpr,
    pixelWidth,
    pixelHeight,
    dpr,
    worldZoom,
    battleZoom,
    uiScale: pixelHeight / UI_HEIGHT,
    mode,
  };
}

export interface DesktopCheckInput {
  width: number;
  height: number;
  coarsePointerOnly: boolean;
}

export type DesktopCheck = { ok: true } | { ok: false; reason: 'too_small' | 'touch_only' };

/** Deteksi desktop-only: viewport terlalu kecil atau perangkat hanya sentuh. */
export function checkDesktopSupport(i: DesktopCheckInput): DesktopCheck {
  if (i.coarsePointerOnly) return { ok: false, reason: 'touch_only' };
  if (i.width < MIN_VIEWPORT_WIDTH || i.height < MIN_VIEWPORT_HEIGHT) return { ok: false, reason: 'too_small' };
  return { ok: true };
}
