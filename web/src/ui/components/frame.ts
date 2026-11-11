import type Phaser from 'phaser';
import { COLORS } from '../../game/config/palette';
import { TYPE, type Ui } from '../kit/ui';

/** Tirai gelap penuh layar di belakang menu (dunia/battle tetap samar terlihat). */
export function veil(ui: Ui, alpha = 0.7, color: number = COLORS.night): void {
  ui.rect(0, 0, ui.dw, ui.dh, color, alpha, 0);
}

export interface WindowSpec {
  x: number; y: number; w: number; h: number;
  title: string;
  /** Teks kanan pada kepala (mis. emas, nama karakter). */
  aside?: string;
  depth?: number;
}

/**
 * Jendela menu: panel plum tipis + kepala berjudul (Cinzel, lime) dengan garis motif. Hanya sebesar kebutuhan isi;
 * tidak ada ornamen selain motif dua garis pada kepala.
 */
export function menuWindow(ui: Ui, s: WindowSpec): { bodyY: number; bodyX: number; bodyW: number; aside: Phaser.GameObjects.Text | null } {
  const d = s.depth ?? 1;
  ui.panel(s.x, s.y, s.w, s.h, { fill: COLORS.deepPlum, alpha: 0.97, line: COLORS.plumLine, depth: d });
  ui.text(s.x + 24, s.y + 16, s.title.toUpperCase(), { family: 'display', weight: '700', size: TYPE.heading, color: COLORS.bitterLime, depth: d + 1 });
  let aside: Phaser.GameObjects.Text | null = null;
  if (s.aside !== undefined) aside = ui.text(s.x + s.w - 24, s.y + 18, s.aside, { size: TYPE.body, originX: 1, color: COLORS.paper, depth: d + 1, weight: '600' });
  const ruleY = s.y + 50;
  ui.rule(s.x + 24, ruleY, s.w - 48, COLORS.plumLine, 1, d + 1);
  ui.motif(s.x + 24 + 48, ruleY - 0.5, 96, 8, d + 2);
  return { bodyX: s.x + 24, bodyY: ruleY + 14, bodyW: s.w - 48, aside };
}

/** Baris petunjuk kecil di dasar jendela. Hanya menu yang butuh; bukan banner permanen. */
export function windowHint(ui: Ui, s: WindowSpec, text: string, depth = 3): Phaser.GameObjects.Text {
  return ui.text(s.x + 24, s.y + s.h - 28, text, { size: TYPE.tiny, color: COLORS.paperDim, depth });
}

/** Batang tipis HP/MP/EXP. `ratio` 0..1. Mengembalikan objek yang dibuat. */
export function bar(ui: Ui, x: number, y: number, w: number, h: number, ratio: number, color: number, depth = 3): Phaser.GameObjects.Rectangle[] {
  const out = [ui.rect(x, y, w, h, COLORS.night, 0.9, depth)];
  const fill = Math.max(0, Math.min(1, ratio)) * w;
  if (fill > 0) out.push(ui.rect(x, y, Math.max(fill, 1), h, color, 1, depth + 1));
  return out;
}
