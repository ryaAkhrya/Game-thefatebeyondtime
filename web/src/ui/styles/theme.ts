import type Phaser from 'phaser';
import { UI_HEIGHT, UI_WIDTH, UI_ZOOM } from '../../game/config/constants';
import { COLORS, css } from '../../game/config/palette';

/**
 * Tema UI. Font = Press Start 2P (SIL OFL 1.1, paket npm lokal @fontsource) sebagai PLACEHOLDER:
 * keluarga font final masih TBD (UI_STYLE_SPEC_V3_3.md). Ganti di sini saja saat font final ditetapkan.
 * Ukuran 8px dan kelipatannya agar piksel font jatuh tepat di grid internal 320x180.
 */
export const FONT_FAMILY = "'Press Start 2P'";
export const FONT_LOAD_SPECS = ["8px 'Press Start 2P'", "16px 'Press Start 2P'"] as const;

export const TEXT_SIZE = { small: 8, title: 16 } as const;
export const FOCUS_BAR_HEIGHT = 11;

/** Scene UI bekerja di ruang 320x180; kamera di-zoom agar memenuhi canvas 640x360 (piksel tetap tajam). */
export function configureUiCamera(scene: Phaser.Scene): void {
  scene.cameras.main.setZoom(UI_ZOOM).centerOn(UI_WIDTH / 2, UI_HEIGHT / 2);
}

export interface TextOpts {
  size?: number;
  color?: number;
  originX?: number;
  originY?: number;
  wrapWidth?: number;
  lineSpacing?: number;
}

/** Membuat Text pixel-aligned (posisi dibulatkan, tanpa resolusi di atas 1). */
export function makeText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  opts: TextOpts = {},
): Phaser.GameObjects.Text {
  const t = scene.add.text(Math.round(x), Math.round(y), value, {
    fontFamily: FONT_FAMILY,
    fontSize: `${opts.size ?? TEXT_SIZE.small}px`,
    color: css(opts.color ?? COLORS.paper),
    lineSpacing: opts.lineSpacing ?? 4,
    ...(opts.wrapWidth ? { wordWrap: { width: opts.wrapWidth, useAdvancedWrap: false } } : {}),
  });
  t.setOrigin(opts.originX ?? 0, opts.originY ?? 0);
  t.setResolution(1);
  return t;
}
