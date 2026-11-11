import Phaser from 'phaser';
import { COLORS, css } from '../../game/config/palette';
import { DialogueRunner } from '../../game/dialogue/DialogueRunner';
import { DISPLAY_NAMES, portraitKey, type DialogueScript } from '../../game/dialogue/types';
import type { Services } from '../../game/systems/Services';
import { makeText } from '../styles/theme';
import { SCENE_KEYS } from '../../game/data/ids';

/**
 * Layout (ruang UI 320x180). Semua angka ada di sini agar UI mudah direvisi tanpa menyentuh DialogueRunner
 * maupun data dialog.
 */
export const DIALOGUE_LAYOUT = {
  boxX: 8,
  boxY: 120,
  boxW: 304,
  boxH: 54,
  portraitPanel: { x: 11, y: 123, w: 56, h: 48 },
  portraitFootX: 39, // tengah portrait
  portraitFootY: 171, // bawah portrait (menonjol ke atas kotak)
  portraitScale: 0.5, // tekstur 128 px tinggi -> 64 unit UI
  textXWithPortrait: 76,
  textXWithout: 16,
  textY: 125,
  nameY: 110,
  charsWithPortrait: 28,
  charsWithout: 36,
  linesPerPage: 4,
} as const;

const L = DIALOGUE_LAYOUT;

/** Kotak dialog JRPG: portrait + ekspresi, nama pembicara, typewriter sesuai Text Speed, halaman, pilihan. */
export class DialogueBox {
  private runner: DialogueRunner | null = null;
  private releaseInput: (() => void) | null = null;
  private resolve: (() => void) | null = null;
  private lastVersion = -1;

  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly portrait: Phaser.GameObjects.Image;
  private readonly nameBg: Phaser.GameObjects.Rectangle;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly indicator: Phaser.GameObjects.Triangle;
  private readonly choiceBar: Phaser.GameObjects.Rectangle;
  private readonly choiceTexts: Phaser.GameObjects.Text[] = [];
  private readonly all: Phaser.GameObjects.GameObject[] = [];
  private blink = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly services: Services,
  ) {
    const depth = 100;
    this.bg = scene.add.rectangle(L.boxX, L.boxY, L.boxW, L.boxH, COLORS.deepPlum, 0.97).setOrigin(0, 0).setStrokeStyle(1, COLORS.bitterLime);
    this.panel = scene.add
      .rectangle(L.portraitPanel.x, L.portraitPanel.y, L.portraitPanel.w, L.portraitPanel.h, COLORS.ink, 0.75)
      .setOrigin(0, 0)
      .setStrokeStyle(1, COLORS.plumLine);
    this.portrait = scene.add.image(L.portraitFootX, L.portraitFootY, '__DEFAULT').setOrigin(0.5, 1).setScale(L.portraitScale);
    this.nameBg = scene.add.rectangle(0, L.nameY, 10, 11, COLORS.bitterLime).setOrigin(0, 0);
    this.nameText = makeText(scene, 0, L.nameY + 2, '', { color: COLORS.ink });
    this.body = makeText(scene, L.textXWithout, L.textY, '', { lineSpacing: 4 });
    this.indicator = scene.add.triangle(L.boxX + L.boxW - 12, L.boxY + L.boxH - 9, 0, 0, 7, 0, 3.5, 5, COLORS.bitterLime).setOrigin(0, 0);
    this.choiceBar = scene.add.rectangle(0, 0, 10, 11, COLORS.bitterLime).setOrigin(0, 0);
    for (let i = 0; i < 3; i++) this.choiceTexts.push(makeText(scene, 0, 0, '', { color: COLORS.paper }));
    this.all.push(this.bg, this.panel, this.portrait, this.nameBg, this.nameText, this.body, this.indicator, this.choiceBar, ...this.choiceTexts);
    this.bg.setDepth(depth);
    this.panel.setDepth(depth + 1);
    this.portrait.setDepth(depth + 2);
    this.nameBg.setDepth(depth + 3);
    this.nameText.setDepth(depth + 4);
    this.body.setDepth(depth + 3);
    this.indicator.setDepth(depth + 3);
    this.choiceBar.setDepth(depth + 3);
    this.choiceTexts.forEach((t) => t.setDepth(depth + 4));
    this.hide();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.releaseInput?.(); this.releaseInput = null; this.runner = null; this.resolve = null; });
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

  /** Memutar skrip dialog; promise selesai saat baris terakhir ditutup pemain. */
  play(script: DialogueScript): Promise<void> {
    if (this.runner) return Promise.reject(new Error('DialogueBox sudah aktif'));
    const runner = new DialogueRunner(script, {
      getTextSpeed: () => this.services.settings.get('text_speed'),
      charsWithPortrait: L.charsWithPortrait,
      charsWithoutPortrait: L.charsWithout,
      linesPerPage: L.linesPerPage,
    });
    this.runner = runner;
    this.lastVersion = -1;
    this.show();
    runner.start();
    this.releaseInput = this.services.input.pushLayer('dialogue', (e) => {
      if (e.intent === 'confirm') {
        if (runner.press() === 'finished') this.finish();
      } else if (e.intent === 'up' || e.intent === 'down') {
        if (!e.repeat) runner.moveChoice(e.intent === 'up' ? -1 : 1);
      } else if (e.intent === 'back') {
        if (this.services.gameState.snapshot()?.area === 'aveloria') this.services.router.openOverlay(this.scene.scene.get(SCENE_KEYS.World), SCENE_KEYS.Pause);
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
    this.indicator.setVisible(r.canAdvance && Math.floor(this.blink / 350) % 2 === 0);
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

  private show(): void {
    this.bg.setVisible(true);
  }

  private hide(): void {
    for (const o of this.all) (o as Phaser.GameObjects.Components.Visible & Phaser.GameObjects.GameObject).setVisible(false);
  }

  private refresh(): void {
    const r = this.runner;
    if (!r) return;
    this.lastVersion = r.version;
    this.bg.setVisible(true);
    const line = r.currentLine;
    const choice = r.choice;

    // portrait + nama
    const key = line ? portraitKey(line.speaker, line.expression) : null;
    const hasPortrait = !!key && this.scene.textures.exists(key);
    this.panel.setVisible(hasPortrait);
    this.portrait.setVisible(hasPortrait);
    if (hasPortrait && key) this.portrait.setTexture(key);
    const textX = hasPortrait ? L.textXWithPortrait : L.textXWithout;
    const label = line ? (line.label ?? DISPLAY_NAMES[line.speaker] ?? '') : '';
    const showName = label.length > 0;
    this.nameBg.setVisible(showName);
    this.nameText.setVisible(showName);
    if (showName) {
      const nx = hasPortrait ? L.textXWithPortrait : L.textXWithout;
      this.nameText.setText(label).setPosition(nx + 4, L.nameY + 2);
      this.nameBg.setPosition(nx, L.nameY).setSize(label.length * 8 + 8, 11);
      this.nameBg.displayWidth = label.length * 8 + 8;
    }

    // isi
    if (choice) {
      this.body.setVisible(false);
      this.indicator.setVisible(false);
      const baseX = L.textXWithout + 6;
      this.choiceBar.setVisible(true);
      choice.options.forEach((opt, i) => {
        const t = this.choiceTexts[i]!;
        t.setVisible(true).setText(opt.text).setPosition(baseX + 4, L.textY + 4 + i * 13);
        t.setColor(css(i === choice.index ? COLORS.ink : COLORS.paper));
      });
      for (let i = choice.options.length; i < this.choiceTexts.length; i++) this.choiceTexts[i]!.setVisible(false);
      const sel = this.choiceTexts[choice.index]!;
      this.choiceBar.setPosition(baseX, sel.y - 1).setSize(Math.max(...choice.options.map((o) => o.text.length)) * 8 + 8, 11);
      this.choiceBar.displayWidth = Math.max(...choice.options.map((o) => o.text.length)) * 8 + 8;
      this.nameBg.setVisible(false);
      this.nameText.setVisible(false);
      this.portrait.setVisible(false);
      this.panel.setVisible(false);
    } else {
      this.choiceBar.setVisible(false);
      this.choiceTexts.forEach((t) => t.setVisible(false));
      this.body.setVisible(true).setPosition(textX, L.textY).setText(r.visibleText);
      this.body.setColor(css(line?.kind === 'system' ? COLORS.bitterLime : COLORS.paper));
    }
  }
}

