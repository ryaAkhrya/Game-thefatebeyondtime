import type Phaser from 'phaser';
import type { IntentEvent } from '../../game/core/InputManager';
import { COLORS, css } from '../../game/config/palette';
import { TYPE, type Ui } from '../kit/ui';
import { uiSfx } from '../kit/sfx';

export interface MenuItem {
  id: string;
  label: string;
  disabled?: boolean;
  /** Pesan singkat saat item nonaktif difokuskan / dikonfirmasi. */
  disabledHint?: string;
  /** Teks rata kanan (mis. jumlah "x3", harga). */
  right?: string;
  /** Tetap tidak dapat dikonfirmasi (disabled) tetapi digambar normal, bukan redup (mis. perlengkapan di Inventaris). */
  soft?: boolean;
  /** Penanda warna kecil di kiri baris (kategori). */
  tone?: number;
}

export interface MenuListOptions {
  ui: Ui;
  /** Koordinat desain. `x` = tepi kiri daftar, kecuali align 'center' (x = tengah). */
  x: number;
  y: number;
  width: number;
  rowHeight: number;
  items: MenuItem[];
  depth?: number;
  align?: 'left' | 'center';
  size?: number;
  family?: 'body' | 'display';
  /** Jumlah baris terlihat; lebih banyak dari itu digulir mengikuti fokus. */
  maxRows?: number;
  /** Fokus awal (setelah tata letak dibangun ulang). */
  initialId?: string;
  onConfirm: (item: MenuItem) => void;
  onDisabledConfirm?: (item: MenuItem) => void;
  onFocusChange?: (item: MenuItem) => void;
  /** Id SFX per aksi; `false` = senyap (mis. scene memutar bunyi hasilnya sendiri). Default: gerak SFX_UI_MOVE, konfirmasi SFX_UI_CONFIRM, item nonaktif SFX_UI_CANCEL. */
  sfx?: { move?: string | false; confirm?: string | false; disabled?: string | false };
}

interface Row {
  fill: Phaser.GameObjects.Rectangle;
  edge: Phaser.GameObjects.Rectangle;
  outline: Phaser.GameObjects.Rectangle[];
  tone: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  right: Phaser.GameObjects.Text;
}

/**
 * Daftar menu vertikal berfokus-keyboard. Fokus selalu terlihat:
 * - aktif   : alas terangkat + garis lime di kiri + teks terang tebal
 * - nonaktif: teks redup; saat difokuskan hanya diberi kerangka tipis (tidak terlihat seperti aktif)
 * Item nonaktif tidak pernah memanggil onConfirm. Daftar panjang digulir (indikator di tepi).
 */
export class MenuList {
  private index = 0;
  private top = 0;
  private readonly rows: Row[] = [];
  private readonly more: Phaser.GameObjects.Text[] = [];
  private readonly registry: Phaser.Data.DataManager;
  private readonly visible: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly opts: MenuListOptions,
  ) {
    this.registry = scene.registry;
    const { ui } = opts;
    const depth = opts.depth ?? 0;
    this.visible = Math.min(opts.items.length, opts.maxRows ?? opts.items.length);
    const left = opts.align === 'center' ? opts.x - opts.width / 2 : opts.x;
    const h = ui.hair / ui.s;
    for (let i = 0; i < this.visible; i++) {
      const y = opts.y + i * opts.rowHeight;
      const fill = ui.rect(left, y, opts.width, opts.rowHeight - 2, COLORS.plumLift, 0.9, depth).setVisible(false);
      const edge = ui.rect(left, y, 3, opts.rowHeight - 2, COLORS.bitterLime, 1, depth + 1).setVisible(false);
      const outline = [
        ui.rect(left, y, opts.width, h, COLORS.bitterLime, 0.8, depth + 1),
        ui.rect(left, y + opts.rowHeight - 2 - h, opts.width, h, COLORS.bitterLime, 0.8, depth + 1),
        ui.rect(left, y, h, opts.rowHeight - 2, COLORS.bitterLime, 0.8, depth + 1),
        ui.rect(left + opts.width - h, y, h, opts.rowHeight - 2, COLORS.bitterLime, 0.8, depth + 1),
      ];
      outline.forEach(o => o.setVisible(false));
      const tone = ui.rect(left + 9, y + (opts.rowHeight - 2) / 2 - 2.5, 5, 5, COLORS.plumLine, 1, depth + 1).setVisible(false);
      const size = opts.size ?? TYPE.body;
      const ty = y + (opts.rowHeight - 2) / 2;
      const label = opts.align === 'center'
        ? ui.text(opts.x, ty, '', { size, originX: 0.5, originY: 0.5, depth: depth + 2, family: opts.family })
        : ui.text(left + 10, ty, '', { size, originY: 0.5, depth: depth + 2, family: opts.family, maxWidth: opts.width - 24 });
      const right = ui.text(left + opts.width - 10, ty, '', { size: size - 1, originX: 1, originY: 0.5, depth: depth + 2, color: COLORS.paperDim });
      this.rows.push({ fill, edge, outline, tone, label, right });
    }
    if (opts.items.length > this.visible) {
      this.more.push(
        ui.text(left + opts.width / 2, opts.y - 9, '▲', { size: TYPE.tiny, originX: 0.5, originY: 0.5, color: COLORS.paperDim, depth: depth + 2 }),
        ui.text(left + opts.width / 2, opts.y + this.visible * opts.rowHeight + 5, '▼', { size: TYPE.tiny, originX: 0.5, originY: 0.5, color: COLORS.paperDim, depth: depth + 2 }),
      );
    }
    if (opts.initialId) {
      const i = opts.items.findIndex(item => item.id === opts.initialId);
      if (i >= 0) this.index = i;
    }
    this.render();
  }

  destroy(): void {
    for (const r of this.rows) {
      r.fill.destroy(); r.edge.destroy(); r.tone.destroy(); r.label.destroy(); r.right.destroy();
      r.outline.forEach(o => o.destroy());
    }
    this.rows.length = 0;
    this.more.forEach(m => m.destroy());
    this.more.length = 0;
  }

  get focusedItem(): MenuItem {
    return this.opts.items[this.index]!;
  }

  get items(): readonly MenuItem[] {
    return this.opts.items;
  }

  focusId(id: string): void {
    const index = this.opts.items.findIndex(item => item.id === id);
    if (index >= 0) { this.index = index; this.render(); }
  }

  setDisabled(id: string, disabled: boolean): void {
    const it = this.opts.items.find((i) => i.id === id);
    if (it) it.disabled = disabled;
    this.render();
  }

  handleIntent(e: IntentEvent): void {
    const n = this.opts.items.length;
    switch (e.intent) {
      case 'up':
        this.index = (this.index + n - 1) % n;
        this.render(true);
        if (n > 1) this.play(this.opts.sfx?.move, 'SFX_UI_MOVE');
        break;
      case 'down':
        this.index = (this.index + 1) % n;
        this.render(true);
        if (n > 1) this.play(this.opts.sfx?.move, 'SFX_UI_MOVE');
        break;
      case 'confirm': {
        const item = this.focusedItem;
        if (item.disabled) {
          this.play(this.opts.sfx?.disabled, 'SFX_UI_CANCEL');
          this.opts.onDisabledConfirm?.(item);
        } else {
          this.play(this.opts.sfx?.confirm, 'SFX_UI_CONFIRM');
          this.opts.onConfirm(item);
        }
        break;
      }
      default:
        break;
    }
  }

  private play(choice: string | false | undefined, fallback: string): void {
    if (choice === false) return;
    uiSfx(this.scene, choice ?? fallback);
  }

  private render(notify = false): void {
    const n = this.opts.items.length;
    if (this.index < this.top) this.top = this.index;
    if (this.index >= this.top + this.visible) this.top = this.index - this.visible + 1;
    this.top = Math.max(0, Math.min(this.top, n - this.visible));
    this.rows.forEach((row, i) => {
      const item = this.opts.items[this.top + i]!;
      const focus = this.top + i === this.index;
      const looksDisabled = !!item.disabled && !item.soft;
      row.fill.setVisible(focus && !looksDisabled);
      row.edge.setVisible(focus && !looksDisabled);
      row.outline.forEach(o => o.setVisible(focus && looksDisabled));
      row.tone.setVisible(item.tone !== undefined);
      if (item.tone !== undefined) row.tone.setFillStyle(looksDisabled ? COLORS.plumLine : item.tone);
      const color = looksDisabled ? COLORS.disabled : COLORS.paper;
      row.label.setText(item.label).setColor(css(color)).setFontStyle(focus && !looksDisabled ? '600' : '400');
      if (this.opts.align !== 'center') {
        row.label.setX(Math.round(this.opts.ui.u((this.opts.x) + (item.tone !== undefined ? 22 : 10))));
        this.opts.ui.fit(row.label, this.opts.width - (item.tone !== undefined ? 36 : 24) - (item.right ? 56 : 0));
      }
      row.right.setText(item.right ?? '').setColor(css(looksDisabled ? COLORS.disabled : focus ? COLORS.paper : COLORS.paperDim));
    });
    if (this.more.length) {
      this.more[0]!.setVisible(this.top > 0);
      this.more[1]!.setVisible(this.top + this.visible < n);
    }
    this.registry.set('debug.focus', `menu:${this.focusedItem.id}`); // dibaca smoke test lewat window.__tfbt
    if (notify) this.opts.onFocusChange?.(this.focusedItem);
  }
}
