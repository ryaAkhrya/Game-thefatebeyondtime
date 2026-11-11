/**
 * Polish Sprint 1: renderer tidak lagi memakai kanvas 640x360 yang diperbesar oleh CSS.
 *
 * Penyebab font kasar: UI digambar di grid 320x180 (kamera zoom 2 pada kanvas 640x360), lalu CSS memperbesar
 * kanvas 2-3x. Satu piksel font Press Start 2P akhirnya 6 piksel layar pada 1080p, dan skala 2,13x pada 1366x768
 * tidak rata. Sekarang kanvas Phaser berukuran sama dengan piksel perangkat (DisplayScale.computeDisplay):
 * - Dunia/battle: kamera dengan zoom BILANGAN BULAT, sehingga pixel art tetap tajam dan rata.
 * - UI: ruang desain 960x540 yang digambar pada resolusi asli perangkat (zoom kamera 1, ukuran dibulatkan ke piksel).
 */

/** Resolusi referensi dunia (petak 32 px, 20 x 11,25 petak). Dipakai untuk rasio 16:9 dan zoom dunia. */
export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;

/** Ruang desain UI (satuan desain). Skala UI = tinggi kanvas / UI_HEIGHT. */
export const UI_WIDTH = 960;
export const UI_HEIGHT = 540;

/** Ukuran petak dunia (px). */
export const TILE = 32;

export const GAME_TITLE = 'THE FATE: BEYOND TIME';
/** Tidak ditampilkan di Title Screen (tidak ada nomor phase/developer). Hanya untuk diagnostik. */
export const BUILD_LABEL = 'v0.1.0';

/** Namespace storage. Settings dan save SENGAJA terpisah (reset settings tidak boleh menyentuh save). */
export const STORAGE_PREFIX = 'tfbt.';
export const SETTINGS_STORAGE_KEY = `${STORAGE_PREFIX}settings.v1`;
export const SAVE_STORAGE_PREFIX = `${STORAGE_PREFIX}save.v1.`;

/** Ambang desktop-only (viewport CSS px). */
export const MIN_VIEWPORT_WIDTH = 800;
export const MIN_VIEWPORT_HEIGHT = 450;
