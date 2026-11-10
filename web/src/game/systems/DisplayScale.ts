import { GAME_HEIGHT, GAME_WIDTH, MIN_VIEWPORT_HEIGHT, MIN_VIEWPORT_WIDTH } from '../config/constants';
import type { ScreenScale } from '../data/settingsSchema';

export interface ScaleResult {
  /** Ukuran canvas dalam CSS px (bilangan bulat). */
  cssWidth: number;
  cssHeight: number;
  /** Pengali terhadap resolusi internal, dalam piksel perangkat (device pixel). */
  deviceZoom: number;
  integer: boolean;
}

/**
 * Menghitung ukuran tampilan 16:9 untuk viewport tertentu.
 * - pixel_perfect: zoom bilangan bulat dalam PIKSEL PERANGKAT (memperhitungkan devicePixelRatio),
 *   sisanya letterbox. Tidak ada piksel yang tidak rata.
 * - fit: memenuhi viewport (tetap 16:9, tanpa stretch), zoom boleh pecahan; ukuran CSS dibulatkan.
 */
export function computeScale(
  viewportWidth: number,
  viewportHeight: number,
  mode: ScreenScale,
  devicePixelRatio = 1,
): ScaleResult {
  const dpr = devicePixelRatio > 0 ? devicePixelRatio : 1;
  const devW = Math.max(1, viewportWidth * dpr);
  const devH = Math.max(1, viewportHeight * dpr);
  const rawZoom = Math.min(devW / GAME_WIDTH, devH / GAME_HEIGHT);

  if (mode === 'pixel_perfect') {
    const z = Math.max(1, Math.floor(rawZoom + 1e-6));
    return {
      cssWidth: Math.round((GAME_WIDTH * z) / dpr),
      cssHeight: Math.round((GAME_HEIGHT * z) / dpr),
      deviceZoom: z,
      integer: true,
    };
  }

  const z = Math.max(1, rawZoom);
  // Bulatkan ke bawah agar tidak melebihi viewport; jaga rasio 16:9 dari sisi lebar.
  const cssWidth = Math.max(1, Math.floor((GAME_WIDTH * z) / dpr));
  const cssHeight = Math.max(1, Math.floor((cssWidth * GAME_HEIGHT) / GAME_WIDTH));
  return { cssWidth, cssHeight, deviceZoom: z, integer: Number.isInteger(z) };
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
