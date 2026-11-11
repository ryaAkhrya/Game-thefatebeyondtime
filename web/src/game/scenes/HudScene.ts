import Phaser from 'phaser';
import { UI_WIDTH } from '../config/constants';
import { COLORS } from '../config/palette';
import { SCENE_KEYS } from '../data/ids';
import type { DialogueScript } from '../dialogue/types';
import { getServices } from '../systems/Services';
import { DialogueBox } from '../../ui/components/DialogueBox';
import { configureUiCamera, makeText } from '../../ui/styles/theme';

/**
 * HUD di atas dunia (ruang UI 320x180): kotak dialog, tujuan, petunjuk interaksi, toast.
 * Dipisah dari WorldScene agar UI dapat direvisi tanpa menyentuh logika dunia/cerita.
 */
export class HudScene extends Phaser.Scene {
  ready = false;
  dialogue!: DialogueBox;
  private objectiveBg!: Phaser.GameObjects.Rectangle;
  private objectiveText!: Phaser.GameObjects.Text;
  private promptBg!: Phaser.GameObjects.Rectangle;
  private promptText!: Phaser.GameObjects.Text;
  private toastBg!: Phaser.GameObjects.Rectangle;
  private toastText!: Phaser.GameObjects.Text;
  private toastTimer?: Phaser.Time.TimerEvent;
  private promptWanted: string | null = null;
  /** Teks toast yang sedang tampil (untuk smoke test). */
  currentToast = '';

  constructor() {
    super(SCENE_KEYS.Hud);
  }

  create(): void {
    configureUiCamera(this);
    const services = getServices(this);
    this.ready = false;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => (this.ready = false));

    this.objectiveBg = this.add.rectangle(6, 5, 10, 13, COLORS.ink, 0.78).setOrigin(0, 0).setDepth(10);
    this.objectiveText = makeText(this, 10, 8, '', { color: COLORS.bitterLime, wrapWidth: 296, lineSpacing: 2 }).setDepth(11);

    this.toastBg = this.add.rectangle(0, 26, 10, 13, COLORS.deepPlum, 0.95).setOrigin(0.5, 0).setStrokeStyle(1, COLORS.bitterLime).setDepth(12);
    this.toastText = makeText(this, UI_WIDTH / 2, 29, '', { originX: 0.5, wrapWidth: 288, lineSpacing: 2 }).setDepth(13);

    this.promptBg = this.add.rectangle(UI_WIDTH / 2, 160, 10, 13, COLORS.deepPlum, 0.95).setOrigin(0.5, 0).setStrokeStyle(1, COLORS.bitterLime).setDepth(10);
    this.promptText = makeText(this, UI_WIDTH / 2, 163, '', { originX: 0.5 }).setDepth(11);

    this.dialogue = new DialogueBox(this, services);
    this.setObjective(null);
    this.toastBg.setVisible(false);
    this.toastText.setVisible(false);
    this.applyPrompt();
    this.ready = true;
  }

  override update(_time: number, delta: number): void {
    this.dialogue.update(delta);
    // petunjuk interaksi disembunyikan selama dialog
    this.applyPrompt();
  }

  playDialogue(script: DialogueScript): Promise<void> {
    this.promptWanted = null;
    this.applyPrompt();
    return this.dialogue.play(script);
  }

  setObjective(text: string | null): void {
    const show = !!text;
    this.objectiveBg.setVisible(show);
    this.objectiveText.setVisible(show);
    if (text) {
      this.objectiveText.setText(text);
      this.objectiveBg.setSize(Math.min(308, this.objectiveText.width + 8), this.objectiveText.height + 6);
      this.placeToast();
    }
  }

  /** Teks petunjuk, mis. "E  Periksa"; null menyembunyikan. */
  showPrompt(text: string | null): void {
    this.promptWanted = text;
  }

  toast(text: string, ms = 3200): void {
    this.toastTimer?.remove();
    this.currentToast = text;
    this.toastText.setText(text).setVisible(true);
    this.toastBg.setVisible(true);
    this.toastBg.setSize(Math.min(308, this.toastText.width + 12), this.toastText.height + 6);
    this.placeToast();
    this.toastTimer = this.time.delayedCall(ms, () => {
      this.currentToast = '';
      this.toastText.setVisible(false);
      this.toastBg.setVisible(false);
    });
  }

  private placeToast(): void {
    const y = this.objectiveText.visible ? Math.max(26, 10 + this.objectiveText.height + 8) : 26;
    this.toastBg.setPosition(UI_WIDTH / 2, y);
    this.toastText.setPosition(UI_WIDTH / 2, y + 3);
  }

  private applyPrompt(): void {
    const text = this.dialogue?.active ? null : this.promptWanted;
    const show = !!text;
    this.promptBg.setVisible(show);
    this.promptText.setVisible(show);
    if (text) {
      this.promptText.setText(text);
      const w = text.length * 8 + 12;
      this.promptBg.setSize(w, 13);
      this.promptBg.displayWidth = w;
    }
  }
}
