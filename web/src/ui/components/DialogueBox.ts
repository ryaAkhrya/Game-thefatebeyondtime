import Phaser from 'phaser';
import { COLORS, css } from '../../game/config/palette';
import { DialogueRunner } from '../../game/dialogue/DialogueRunner';
import { portraitKey, type DialogueScript } from '../../game/dialogue/types';
import { speakerLabel } from '../../game/dialogue/speaker';
import type { Services } from '../../game/systems/Services';
import { SCENE_KEYS } from '../../game/data/ids';
import { UNKNOWN_LABEL, isNameKnown } from '../../game/story/identity';
import { FONT, TYPE, Ui } from '../kit/ui';
import { uiSfx } from '../kit/sfx';

/**
 * Tata letak dialog (satuan desain 960x540). Semua angka di sini agar UI mudah direvisi tanpa menyentuh
 * DialogueRunner maupun data dialog. Panel rendah di bawah layar, bukan kotak besar: dunia tetap terlihat.
 * Portrait (potongan dada, latar transparan) tumbuh keluar dari tepi atas panel.
 */
export const DIALOGUE_LAYOUT = {
  panelX: 72,
  panelW: 816,
  panelH: 124,
  panelBottom: 516,
  portraitCenterX: 170,
  portraitHeight: 232,
  textXWithPortrait: 280,
  textXWithout: 112,
  textRight: 864,
  nameY: 12,
  bodyYNamed: 36,
  bodyYUnnamed: 22,
  linesPerPage: 3,
  fontSize: TYPE.dialogue,
} as const;

const L = DIALOGUE_LAYOUT;

/** Ukur lebar teks pada ukuran desain (tidak bergantung skala layar) sehingga halaman identik di semua resolusi. */
let measureCtx: CanvasRenderingContext2D | null = null;
function measure(text: string, size: number, italic: boolean): number {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  if (!measureCtx) return text.length * size * 0.5;
  measureCtx.font = `${italic ? 'italic ' : ''}400 ${size}px ${FONT.body}`;
  return measureCtx.measureText(text).width;
}

/** Word-wrap berbasis lebar sebenarnya (font proporsional). Deterministik pada satu font; tidak memotong kata. */
export function wrapMeasured(text: string, maxWidth: number, size: number, italic = false): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    const words = para.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) { out.push(''); continue; }
    let line = '';
    for (const word of words) {
      const trial = line ? `${line} ${word}` : word;
      if (measure(trial, size, italic) <= maxWidth) { line = trial; continue; }
      if (line) { out.push(line); line = ''; }
      let rest = word;
      while (measure(rest, size, italic) > maxWidth && rest.length > 1) {
        let n = rest.length - 1;
        while (n > 1 && measure(rest.slice(0, n), size, italic) > maxWidth) n--;
        out.push(rest.slice(0, n));
        rest = rest.slice(n);
      }
      line = rest;
    }
    if (line) out.push(line);
  }
  return out;
}

/** Dialog JRPG: portrait + ekspresi, nama pembicara, typewriter sesuai Text Speed, halaman, pilihan. */
export class DialogueBox {
  private runner: DialogueRunner | null = null;
  private releaseInput: (() => void) | null = null;
  private resolve: (() => void) | null = null;
  private lastVersion = -1;
  private readonly ui: Ui;

  private chrome: Phaser.GameObjects.GameObject[] = [];
  private portrait!: Phaser.GameObjects.Image;
  private nameText!: Phaser.GameObjects.Text;
  private body!: Phaser.GameObjects.Text;
  private indicator!: Phaser.GameObjects.Text;
  private choiceBar!: Phaser.GameObjects.Rectangle;
  private choiceTexts: Phaser.GameObjects.Text[] = [];
  private blink = 0;
  private hasPortraitNow = false;
  private shown = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly services: Services,
    private readonly options: { silent?: boolean; onBack?: () => void } = {},
  ) {
    this.ui = new Ui(scene);
    this.build();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.releaseInput?.(); this.releaseInput = null; this.runner = null; this.resolve = null; });
  }

  /** (Re)membuat seluruh objek tampilan. Dipanggil juga saat kanvas berubah ukuran; state runner dipertahankan. */
  build(): void {
    const ui = this.ui;
    const depth = 100;
    const top = L.panelBottom - L.panelH;
    this.chrome = ui.panel(L.panelX, top, L.panelW, L.panelH, { fill: COLORS.night, alpha: 0.9, line: COLORS.plumLine, depth });
    // garis tipis lime pendek di sudut kiri atas: satu-satunya ornamen, menandai kotak dialog aktif
    this.chrome.push(ui.rect(L.panelX, top, 28, ui.hair / ui.s * 2, COLORS.bitterLime, 1, depth + 1));
    this.portrait = this.scene.add.image(0, 0, '__DEFAULT').setOrigin(0.5, 1).setDepth(depth + 2).setVisible(false);
    this.nameText = ui.text(0, 0, '', { family: 'display', weight: '700', size: TYPE.heading - 2, color: COLORS.bitterLime, depth: depth + 3 });
    this.body = ui.text(0, 0, '', { size: L.fontSize, depth: depth + 3, leading: 6 });
    this.indicator = ui.text(L.panelX + L.panelW - 22, L.panelBottom - 20, '▾', { size: 14, color: COLORS.bitterLime, originX: 0.5, originY: 0.5, depth: depth + 3 });
    this.choiceBar = ui.rect(0, 0, 10, 10, COLORS.plumLift, 0.95, depth + 3).setVisible(false);
    this.choiceTexts = [0, 1, 2].map(() => ui.text(0, 0, '', { size: L.fontSize - 0.5, depth: depth + 4, originY: 0.5 }));
    this.all().forEach((o) => (o as Phaser.GameObjects.Components.Visible & Phaser.GameObjects.GameObject).setVisible(false));
    this.shown = false;
    this.hasPortraitNow = false;
    if (this.runner) { this.lastVersion = -1; this.refresh(); }
  }

  private all(): Phaser.GameObjects.GameObject[] {
    return [...this.chrome, this.portrait, this.nameText, this.body, this.indicator, this.choiceBar, ...this.choiceTexts];
  }

  get active(): boolean {
    return this.runner !== null;
  }

  /** Untuk smoke test / debugging: keadaan terbaca. */
  get debug(): { script: string; line: string; state: string; text: string; portrait: string; label: string; page: number; pages: number } | null {
    const r = this.runner;
    if (!r) return null;
    return {
      script: r.scriptId,
      line: r.currentLine?.id ?? (r.choice ? r.choice.id : ''),
      state: r.state,
      text: r.visibleText,
      portrait: this.portrait.visible ? (this.portrait.texture.key as string) : '',
      label: this.nameText.visible ? this.nameText.text : '',
      page: r.currentPage + 1,
      pages: r.pageCount,
    };
  }

  /** Lebar area teks (satuan desain) tergantung ada tidaknya portrait. */
  private textWidth(portrait: boolean): number {
    return L.textRight - (portrait ? L.textXWithPortrait : L.textXWithout);
  }

  /** Memutar skrip dialog; promise selesai saat baris terakhir ditutup pemain. */
  play(script: DialogueScript): Promise<void> {
    if (this.runner) return Promise.reject(new Error('DialogueBox sudah aktif'));
    const runner = new DialogueRunner(script, {
      getTextSpeed: () => this.services.settings.get('text_speed'),
      linesPerPage: L.linesPerPage,
      wrap: (text, portrait, kind) => wrapMeasured(text, this.textWidth(portrait) * 0.965, L.fontSize, kind === 'thought'),
    });
    this.runner = runner;
    this.lastVersion = -1;
    runner.start();
    this.releaseInput = this.services.input.pushLayer('dialogue', (e) => {
      if (e.intent === 'confirm') {
        const result = runner.press();
        // 'completed_text' (mempercepat ketikan) dan 'ignored' senyap; hanya kemajuan nyata/pilihan yang berbunyi.
        if (!this.options.silent && (result === 'advanced' || result === 'finished')) uiSfx(this.scene, 'SFX_UI_DIALOGUE_ADVANCE');
        else if (result === 'chose') uiSfx(this.scene, 'SFX_UI_CONFIRM');
        if (result === 'finished') this.finish();
      } else if (e.intent === 'up' || e.intent === 'down') {
        if (!e.repeat) {
          if (runner.choice) uiSfx(this.scene, 'SFX_UI_DIALOGUE_CHOICE');
          runner.moveChoice(e.intent === 'up' ? -1 : 1);
        }
      } else if (e.intent === 'back') {
        if (this.options.onBack) this.options.onBack();
        else if (this.services.gameState.snapshot()?.area === 'aveloria') this.services.router.openOverlay(this.scene.scene.get(SCENE_KEYS.World), SCENE_KEYS.Pause);
        else runner.fastComplete(); // existing forest control remains unchanged
      }
    });
    this.refresh();
    return new Promise<void>((res) => (this.resolve = res));
  }

  update(deltaMs: number): void {
    const r = this.runner;
    if (!r) return;
    if (this.services.gameState.snapshot()?.area === 'aveloria' && this.services.input.topLayerId !== 'dialogue') return;
    r.update(deltaMs);
    if (r.version !== this.lastVersion) this.refresh();
    else if (r.state === 'typing') this.body.setText(r.visibleText);
    this.blink += deltaMs;
    this.indicator.setVisible(r.canAdvance && Math.floor(this.blink / 450) % 2 === 0);
  }

  private finish(): void {
    this.releaseInput?.();
    this.releaseInput = null;
    this.runner = null;
    this.hide();
    const res = this.resolve;
    this.resolve = null;
    res?.();
  }

  private hide(): void {
    for (const o of this.all()) (o as Phaser.GameObjects.Components.Visible & Phaser.GameObjects.GameObject).setVisible(false);
    this.shown = false;
  }

  private refresh(): void {
    const r = this.runner;
    if (!r) return;
    const ui = this.ui;
    this.lastVersion = r.version;
    if (!this.shown) { this.chrome.forEach((o) => (o as Phaser.GameObjects.Rectangle).setVisible(true)); this.shown = true; }
    const line = r.currentLine;
    const choice = r.choice;
    const known = isNameKnown(this.services.gameState.snapshot()?.flags);
    const top = L.panelBottom - L.panelH;

    // portrait: potongan dada yang tumbuh dari tepi atas panel
    const key = line ? portraitKey(line.speaker, line.expression) : null;
    const hasPortrait = !!key && this.scene.textures.exists(key);
    this.hasPortraitNow = hasPortrait;
    this.portrait.setVisible(hasPortrait);
    if (hasPortrait && key) {
      this.portrait.setTexture(key);
      const src = this.scene.textures.get(key).getSourceImage() as HTMLImageElement;
      this.portrait.setScale(ui.u(L.portraitHeight) / src.height).setPosition(ui.u(L.portraitCenterX), ui.u(L.panelBottom - 1));
    }
    const textX = hasPortrait ? L.textXWithPortrait : L.textXWithout;

    const label = line ? speakerLabel(line, known) : '';
    const showName = label.length > 0 && !choice;
    this.nameText.setVisible(showName);
    if (showName) this.nameText.setText(label).setPosition(ui.u(textX), ui.u(top + L.nameY)).setColor(css(label === UNKNOWN_LABEL ? COLORS.paperDim : COLORS.bitterLime));

    if (choice) {
      this.body.setVisible(false);
      this.indicator.setVisible(false);
      this.portrait.setVisible(false);
      const baseX = L.textXWithout;
      const rowH = 30;
      const y0 = top + 16;
      choice.options.forEach((opt, i) => {
        const t = this.choiceTexts[i]!;
        const focus = i === choice.index;
        t.setVisible(true).setText(opt.text).setPosition(ui.u(baseX + 16), ui.u(y0 + i * rowH + rowH / 2 - 1));
        t.setColor(css(COLORS.paper)).setFontStyle(focus ? '600' : '400');
      });
      for (let i = choice.options.length; i < this.choiceTexts.length; i++) this.choiceTexts[i]!.setVisible(false);
      const widest = Math.max(...this.choiceTexts.slice(0, choice.options.length).map((t) => t.width)) / ui.s;
      this.choiceBar.setVisible(true).setPosition(ui.u(baseX), ui.u(y0 + choice.index * rowH)).setSize(ui.u(widest + 36), ui.u(rowH - 2));
      this.choiceBar.setDisplaySize(ui.u(widest + 36), ui.u(rowH - 2));
    } else {
      this.choiceBar.setVisible(false);
      this.choiceTexts.forEach((t) => t.setVisible(false));
      const thought = line?.kind === 'thought';
      this.body.setVisible(true).setPosition(ui.u(textX), ui.u(top + (showName ? L.bodyYNamed : L.bodyYUnnamed))).setText(r.visibleText);
      this.body.setColor(css(line?.kind === 'system' ? COLORS.bitterLime : thought ? COLORS.paperDim : COLORS.paper));
      this.body.setFontStyle(thought ? 'italic 400' : '400');
    }
  }

  /** Dipakai HUD: apakah portrait sedang tampil (untuk tata letak prompt). */
  get portraitVisible(): boolean {
    return this.hasPortraitNow;
  }
}
