import type Phaser from 'phaser';
import type { IntentEvent } from '../../game/core/InputManager';
import { COLORS, css } from '../../game/config/palette';
import { FOCUS_BAR_HEIGHT, makeText } from '../styles/theme';

export interface MenuItem {
  id: string;
  label: string;
  disabled?: boolean;
  /** Pesan singkat saat item nonaktif difokuskan / dikonfirmasi. */
  disabledHint?: string;
}

export interface MenuListOptions {
  x: number; // tengah menu
  y: number; // atas baris pertama
  width: number;
  rowHeight: number;
  depth?: number;
  items: MenuItem[];
  onConfirm: (item: MenuItem) => void;
  onDisabledConfirm?: (item: MenuItem) => void;
  onFocusChange?: (item: MenuItem) => void;
}

/**
 * Daftar menu vertikal berfokus-keyboard. Fokus selalu terlihat:
 * - aktif   : batang Bitter Lime + teks gelap
 * - nonaktif: teks redup; saat difokuskan hanya diberi kerangka lime (tidak terlihat seperti aktif)
 * Item nonaktif tidak pernah memanggil onConfirm.
 */
export class MenuList {
  private index = 0;
  private readonly bar: Phaser.GameObjects.Rectangle;
  private readonly outline: Phaser.GameObjects.Rectangle;
  private readonly labels: Phaser.GameObjects.Text[] = [];
  private readonly registry: Phaser.Data.DataManager;

  constructor(
    scene: Phaser.Scene,
    private readonly opts: MenuListOptions,
  ) {
    this.registry = scene.registry;
    const left = opts.x - opts.width / 2;
    this.bar = scene.add.rectangle(left, 0, opts.width, FOCUS_BAR_HEIGHT, COLORS.bitterLime).setOrigin(0, 0);
    this.outline = scene.add
      .rectangle(left, 0, opts.width, FOCUS_BAR_HEIGHT)
      .setOrigin(0, 0)
      .setStrokeStyle(1, COLORS.bitterLime)
      .setFillStyle(0, 0);
    opts.items.forEach((item, i) => {
      const t = makeText(scene, opts.x, opts.y + i * opts.rowHeight + 2, item.label, {
        originX: 0.5,
        color: COLORS.paper,
      });
      this.labels.push(t);
    });
    this.bar.setDepth(opts.depth ?? 0);
    this.outline.setDepth(opts.depth ?? 0);
    this.labels.forEach(t => t.setDepth(opts.depth ?? 0));
    this.render();
  }

  destroy(): void {
    this.bar.destroy();
    this.outline.destroy();
    this.labels.forEach((l) => l.destroy());
  }

  get focusedItem(): MenuItem {
    return this.opts.items[this.index]!;
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
        break;
      case 'down':
        this.index = (this.index + 1) % n;
        this.render(true);
        break;
      case 'confirm': {
        const item = this.focusedItem;
        if (item.disabled) this.opts.onDisabledConfirm?.(item);
        else this.opts.onConfirm(item);
        break;
      }
      default:
        break;
    }
  }

  private render(notify = false): void {
    const y = this.opts.y + this.index * this.opts.rowHeight;
    const focused = this.focusedItem;
    this.bar.setPosition(this.bar.x, y).setVisible(!focused.disabled);
    this.outline.setPosition(this.outline.x, y).setVisible(!!focused.disabled);
    this.opts.items.forEach((item, i) => {
      const isFocus = i === this.index;
      const color = item.disabled ? COLORS.disabled : isFocus ? COLORS.ink : COLORS.paper;
      this.labels[i]!.setColor(css(color));
    });
    this.registry.set('debug.focus', `menu:${focused.id}`); // dibaca smoke test lewat window.__tfbt
    if (notify) this.opts.onFocusChange?.(focused);
  }
}
