import Phaser from 'phaser';
import { COLORS } from '../config/palette';
import { SCENE_KEYS } from '../data/ids';
import type { DialogueScript } from '../dialogue/types';
import { claimHint } from '../systems/Hints';
import { getServices, type Services } from '../systems/Services';
import { DialogueBox } from '../../ui/components/DialogueBox';
import { TYPE, Ui, bindRelayout } from '../../ui/kit/ui';


/**
 * HUD di atas dunia: kotak dialog, petunjuk interaksi kontekstual, toast. TIDAK ada banner tujuan permanen
 * (prinsip "show, don't over-instruct"): tujuan dibuka lewat Jurnal. Petunjuk mekanik baru tampil sekali saja.
 */
export class HudScene extends Phaser.Scene {
  ready = false;
  dialogue!: DialogueBox;
  private ui!: Ui;
  private services!: Services;
  private promptBox?: Phaser.GameObjects.Container;
  private promptHalf = 40;
  private toastObjs: Phaser.GameObjects.GameObject[] = [];
  private toastTimer?: Phaser.Time.TimerEvent;
  private promptWanted: { verb: string; x: number; y: number } | null = null;
  private promptDrawn = '';
  private objective: string | null = null;
  /** Teks toast yang sedang tampil (untuk smoke test). */
  currentToast = '';
  /** Teks petunjuk interaksi yang sedang tampil (untuk smoke test). */
  currentPrompt = '';

  constructor() {
    super(SCENE_KEYS.Hud);
  }

  create(): void {
    this.services = getServices(this);
    this.ui = new Ui(this);
    this.ready = false;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => (this.ready = false));
    this.dialogue = new DialogueBox(this, this.services);
    bindRelayout(this, () => {
      this.promptBox = undefined; this.toastObjs = []; this.promptDrawn = '';
      this.dialogue.build();
      if (this.currentToast) this.drawToast(this.currentToast);
    });
    this.ready = true;
  }

  override update(_time: number, delta: number): void {
    this.dialogue.update(delta);
    this.applyPrompt();
  }

  playDialogue(script: DialogueScript): Promise<void> {
    this.promptWanted = null;
    this.applyPrompt();
    return this.dialogue.play(script);
  }

  /** Tujuan tidak lagi digambar di HUD; hanya disimpan untuk Jurnal/diagnostik. */
  setObjective(text: string | null): void {
    this.objective = text;
  }
  get objectiveText(): string | null {
    return this.objective;
  }

  /**
   * Petunjuk interaksi kecil di atas objek yang dapat diperiksa. `at` = piksel kanvas titik di atas objek;
   * null menyembunyikan.
   */
  showPrompt(verb: string | null, at?: { x: number; y: number }): void {
    this.promptWanted = verb ? { verb, x: at?.x ?? this.ui.layout.pixelWidth / 2, y: at?.y ?? this.ui.layout.pixelHeight * 0.8 } : null;
  }

  /** Petunjuk sekali-tampil untuk mekanik yang baru relevan. Mengembalikan true bila baru ditampilkan. */
  hintOnce(id: string, text: string, ms = 4200): boolean {
    if (!claimHint(this.services.storage, id)) return false;
    this.toast(text, ms);
    return true;
  }

  toast(text: string, ms = 3200): void {
    this.toastTimer?.remove();
    this.currentToast = text;
    this.drawToast(text);
    this.toastTimer = this.time.delayedCall(ms, () => {
      this.currentToast = '';
      this.toastObjs.forEach(o => o.destroy());
      this.toastObjs = [];
    });
  }

  private drawToast(text: string): void {
    const ui = this.ui;
    this.toastObjs.forEach(o => o.destroy());
    const t = ui.text(ui.dw / 2, 36, text, { size: TYPE.body, originX: 0.5, originY: 0.5, depth: 12, width: 560, align: 'center', color: COLORS.paper });
    const w = t.width / ui.s + 36;
    const h = t.height / ui.s + 14;
    const x = (ui.dw - w) / 2;
    const y = 36 - h / 2;
    const panel = ui.panel(x, y, w, h, { fill: COLORS.night, alpha: 0.9, line: COLORS.plumLine, depth: 11 });
    const accent = ui.rect(x, y, 3, h, COLORS.bitterLime, 1, 12);
    this.toastObjs = [...panel, accent, t];
  }

  private applyPrompt(): void {
    const want = this.dialogue?.active ? null : this.promptWanted;
    const sig = want ? want.verb : '';
    if (sig !== this.promptDrawn) {
      this.promptDrawn = sig;
      this.promptBox?.destroy();
      this.promptBox = undefined;
      this.currentPrompt = want?.verb ?? '';
      if (want) {
        const ui = this.ui;
        const verb = ui.text(0, 0, want.verb, { size: TYPE.small + 1, weight: '600', originY: 0.5, depth: 11 });
        const keyW = 20;
        const w = keyW + 10 + verb.width / ui.s + 16;
        const h = 26;
        const x = -w / 2;
        const y = -h;
        const panel = ui.panel(x, y, w, h, { fill: COLORS.night, alpha: 0.88, line: COLORS.plumLine });
        const key = ui.rect(x + 4, y + 4, keyW, h - 8, COLORS.bitterLime, 1);
        const keyLabel = ui.text(x + 4 + keyW / 2, y + h / 2, 'E', { size: TYPE.small, weight: '700', color: COLORS.ink, originX: 0.5, originY: 0.5 });
        verb.setPosition(ui.u(x + 4 + keyW + 10), ui.u(y + h / 2));
        this.promptBox = this.add.container(0, 0, [...panel, key, keyLabel, verb]).setDepth(10);
        this.promptHalf = w / 2;
        this.hintOnce('interact', 'Enter atau Spasi juga dapat dipakai untuk memeriksa.');
      }
    }
    if (this.promptBox && want) {
      const ui = this.ui;
      const cx = Phaser.Math.Clamp(want.x / ui.s, this.promptHalf + 8, ui.dw - this.promptHalf - 8);
      const cy = Phaser.Math.Clamp(want.y / ui.s, 34, ui.dh - 150);
      this.promptBox.setPosition(ui.u(cx), ui.u(cy));
    }
  }
}

/** Dipakai WorldScene/QA: apakah HUD sedang memperlihatkan toast. */
export type HudView = Pick<HudScene, 'toast' | 'showPrompt' | 'setObjective' | 'playDialogue' | 'hintOnce'>;
