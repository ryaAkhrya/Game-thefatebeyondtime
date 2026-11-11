import Phaser from 'phaser';
import { COLORS, css } from '../../game/config/palette';
import { DISPLAY_EVENT, getDisplay } from '../../game/systems/DisplayController';
import type { DisplayLayout } from '../../game/systems/DisplayScale';

/**
 * Sistem desain UI. Ruang desain 960x540 digambar pada resolusi perangkat (kamera zoom 1): setiap ukuran/posisi
 * dalam "satuan desain" dibulatkan ke piksel perangkat, sehingga teks dan garis tajam pada 1366x768 maupun 1920x1080.
 *
 * Tipografi: Cinzel (judul/heading, huruf kapital klasik) + Source Sans 3 (isi, dialog, metadata).
 * Font final belum ditetapkan Game Director; semua ukuran/keluarga ada di satu tempat ini.
 */
export const FONT = {
  display: "'Cinzel', 'Times New Roman', serif",
  body: "'Source Sans 3', 'Segoe UI', system-ui, sans-serif",
} as const;

export const FONT_LOAD_SPECS = [
  "400 16px 'Source Sans 3'",
  "600 16px 'Source Sans 3'",
  "italic 400 16px 'Source Sans 3'",
  "600 16px 'Cinzel'",
  "700 16px 'Cinzel'",
] as const;

/** Skala tipografi (satuan desain). Hirarki: title > display > heading > body > small > tiny. */
export const TYPE = {
  title: 60,
  display: 28,
  heading: 17,
  body: 14.5,
  dialogue: 16,
  small: 12,
  tiny: 10.5,
} as const;

export const SPACE = { xs: 4, sm: 8, md: 12, lg: 20, xl: 32 } as const;

export interface TextOpts {
  size?: number;
  color?: number;
  weight?: '400' | '600' | '700';
  italic?: boolean;
  family?: keyof typeof FONT;
  originX?: number;
  originY?: number;
  /** Lebar bungkus (satuan desain). */
  width?: number;
  /** Tambahan jarak antarbaris (satuan desain). */
  leading?: number;
  align?: 'left' | 'center' | 'right';
  depth?: number;
  /** Potong dengan elipsis bila lebih lebar dari ini (satuan desain). */
  maxWidth?: number;
  alpha?: number;
}

export interface PanelOpts {
  fill?: number;
  alpha?: number;
  line?: number | null;
  lineAlpha?: number;
  depth?: number;
}

let gradientCount = 0;

/** Fasad gambar UI per scene. Tidak menyimpan state; scene menyimpan objeknya sendiri. */
export class Ui {
  constructor(readonly scene: Phaser.Scene) {}

  get layout(): DisplayLayout {
    return getDisplay(this.scene);
  }
  get s(): number {
    return this.layout.uiScale;
  }
  /** Lebar/tinggi kanvas dalam satuan desain (selalu 960x540 karena 16:9). */
  get dw(): number {
    return this.layout.pixelWidth / this.s;
  }
  get dh(): number {
    return this.layout.pixelHeight / this.s;
  }
  /** Garis rambut: 1 px pada 1366x768 dan 1080p, 2 px pada 1440p+. */
  get hair(): number {
    return Math.max(1, Math.round(this.s * 0.6));
  }
  u(v: number): number {
    return Math.round(v * this.s);
  }

  text(x: number, y: number, value: string, o: TextOpts = {}): Phaser.GameObjects.Text {
    const s = this.s;
    const px = Math.max(8, Math.round((o.size ?? TYPE.body) * s));
    const t = this.scene.add.text(this.u(x), this.u(y), value, {
      fontFamily: FONT[o.family ?? 'body'],
      fontSize: `${px}px`,
      fontStyle: `${o.italic ? 'italic ' : ''}${o.weight ?? '400'}`.trim(),
      color: css(o.color ?? COLORS.paper),
      align: o.align ?? 'left',
      lineSpacing: Math.round((o.leading ?? 3) * s),
      padding: { top: Math.round(2 * s), bottom: Math.round(2 * s), left: Math.round(1 * s), right: Math.round(1 * s) },
      ...(o.width ? { wordWrap: { width: this.u(o.width), useAdvancedWrap: true } } : {}),
    });
    t.setOrigin(o.originX ?? 0, o.originY ?? 0);
    t.setResolution(1);
    if (o.depth !== undefined) t.setDepth(o.depth);
    if (o.alpha !== undefined) t.setAlpha(o.alpha);
    if (o.maxWidth) this.fit(t, o.maxWidth);
    return t;
  }

  /** Memotong teks ber-elipsis sampai muat dalam `maxWidth` (satuan desain). */
  fit(t: Phaser.GameObjects.Text, maxWidth: number): void {
    const limit = this.u(maxWidth);
    if (t.width <= limit) return;
    const full = t.text;
    let n = full.length;
    while (n > 1 && t.width > limit) {
      n--;
      t.setText(`${full.slice(0, n).trimEnd()}…`);
    }
  }

  /** Persegi isi tanpa garis (koordinat desain, dibulatkan). */
  rect(x: number, y: number, w: number, h: number, color: number, alpha = 1, depth?: number): Phaser.GameObjects.Rectangle {
    const r = this.scene.add.rectangle(this.u(x), this.u(y), Math.max(1, this.u(w)), Math.max(1, this.u(h)), color, alpha).setOrigin(0, 0);
    if (depth !== undefined) r.setDepth(depth);
    return r;
  }

  /** Panel: isi + garis rambut di sisi dalam. */
  panel(x: number, y: number, w: number, h: number, o: PanelOpts = {}): Phaser.GameObjects.GameObject[] {
    const out: Phaser.GameObjects.GameObject[] = [];
    out.push(this.rect(x, y, w, h, o.fill ?? COLORS.deepPlum, o.alpha ?? 1, o.depth));
    const line = o.line === undefined ? COLORS.plumLine : o.line;
    if (line !== null) {
      const hr = this.hair / this.s;
      const a = o.lineAlpha ?? 1;
      out.push(
        this.rect(x, y, w, hr, line, a, o.depth),
        this.rect(x, y + h - hr, w, hr, line, a, o.depth),
        this.rect(x, y, hr, h, line, a, o.depth),
        this.rect(x + w - hr, y, hr, h, line, a, o.depth),
      );
    }
    return out;
  }

  /**
   * Gradasi vertikal mulus (tekstur kanvas pada resolusi perangkat). Dipakai untuk scrim/latar supaya tidak ada
   * garis tipis di sambungan strip persegi akibat pembulatan piksel. Tekstur dihapus saat objek dihancurkan.
   */
  gradient(x: number, y: number, w: number, h: number, stops: readonly (readonly [number, string])[], depth?: number): Phaser.GameObjects.Image {
    const key = `ui-grad-${++gradientCount}`;
    const pw = Math.max(1, this.u(w));
    const ph = Math.max(1, this.u(h));
    const tex = this.scene.textures.createCanvas(key, pw, ph)!;
    const ctx = tex.getContext();
    const g = ctx.createLinearGradient(0, 0, 0, ph);
    for (const [at, color] of stops) g.addColorStop(at, color);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, pw, ph);
    tex.refresh();
    const img = this.scene.add.image(this.u(x), this.u(y), key).setOrigin(0, 0);
    if (depth !== undefined) img.setDepth(depth);
    img.once(Phaser.GameObjects.Events.DESTROY, () => { if (this.scene.textures.exists(key)) this.scene.textures.remove(key); });
    return img;
  }

  /** Micro-feedback: overlay muncul dengan fade singkat dari warna latar (bukan kilat). */
  fadeIn(ms = 90): void {
    this.scene.cameras.main.fadeIn(ms, 18, 13, 25);
  }

  /** Garis horizontal tipis. */
  rule(x: number, y: number, w: number, color: number = COLORS.plumLine, alpha = 1, depth?: number): Phaser.GameObjects.Rectangle {
    return this.rect(x, y, w, this.hair / this.s, color, alpha, depth);
  }

  /**
   * Motif identitas: dua garis terputus yang hampir bertemu (mawar + lime). Dipakai hemat: judul dan kepala layar.
   * `gap` = celah di tengah (satuan desain).
   */
  motif(cx: number, y: number, w: number, gap = 10, depth?: number): Phaser.GameObjects.Rectangle[] {
    const half = (w - gap) / 2;
    const th = Math.max(this.hair, this.u(1.5)) / this.s;
    return [
      this.rect(cx - gap / 2 - half, y, half, th, COLORS.rose, 1, depth),
      this.rect(cx + gap / 2, y, half, th, COLORS.bitterLime, 1, depth),
    ];
  }
}

/**
 * Membangun ulang tata letak saat kanvas berubah ukuran (jendela, fullscreen, Skala Tampilan). `rebuild` harus
 * membuat ulang SEMUA objek tampilan dari state scene; objek lama dihancurkan di sini.
 */
export function bindRelayout(scene: Phaser.Scene, rebuild: () => void): void {
  const handler = (): void => {
    if (!scene.sys.isActive() && !scene.sys.isPaused()) return;
    scene.tweens.killAll();
    scene.children.removeAll(true);
    rebuild();
  };
  scene.game.events.on(DISPLAY_EVENT, handler);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.game.events.off(DISPLAY_EVENT, handler));
}
