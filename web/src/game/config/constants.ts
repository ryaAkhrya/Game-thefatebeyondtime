/**
 * Resolusi internal 16:9 (provisional, TECHNICAL_DESIGN.md). Phase 1 menaikkan 320x180 -> 640x360
 * karena sprite eksplorasi 32x48 butuh bidang pandang dunia yang lebih luas (20 x 11,25 petak 32 px).
 * Integer zoom: 2x di 1366x768 (1280x720) dan 3x di 1920x1080.
 */
export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;

/** Ruang koordinat UI (desain UI patch v3.3 = 320x180). Scene UI memakai kamera zoom 2 sehingga tampilan UI Phase 0 tidak berubah. */
export const UI_ZOOM = 2;
export const UI_WIDTH = GAME_WIDTH / UI_ZOOM;
export const UI_HEIGHT = GAME_HEIGHT / UI_ZOOM;

/** Ukuran petak dunia (px). */
export const TILE = 32;

export const GAME_TITLE = 'THE FATE: BEYOND TIME';
export const BUILD_LABEL = 'v0.1.0 - Phase 3';

/** Namespace storage. Settings dan save SENGAJA terpisah (reset settings tidak boleh menyentuh save). */
export const STORAGE_PREFIX = 'tfbt.';
export const SETTINGS_STORAGE_KEY = `${STORAGE_PREFIX}settings.v1`;
export const SAVE_STORAGE_PREFIX = `${STORAGE_PREFIX}save.v1.`;

/** Ambang desktop-only (viewport CSS px). */
export const MIN_VIEWPORT_WIDTH = 800;
export const MIN_VIEWPORT_HEIGHT = 450;
