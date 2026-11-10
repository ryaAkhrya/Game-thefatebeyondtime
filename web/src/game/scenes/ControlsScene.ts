import Phaser from 'phaser';
import { UI_HEIGHT, UI_WIDTH } from '../config/constants';
import { COLORS } from '../config/palette';
import { SCENE_KEYS, type SceneKey } from '../data/ids';
import { CONTROL_LEGEND } from '../core/InputManager';
import { getServices } from '../systems/Services';
import { makeText, configureUiCamera } from '../../ui/styles/theme';

/** Panduan Kontrol (overlay). Daftar tombol diambil dari KEY_BINDINGS/CONTROL_LEGEND, bukan ditulis ulang. */
export class ControlsScene extends Phaser.Scene {
  private returnTo: SceneKey = SCENE_KEYS.Title;
  private releaseInput?: () => void;
  private closing = false;

  constructor() {
    super(SCENE_KEYS.Controls);
  }

  init(data: { returnTo?: SceneKey }): void {
    this.returnTo = data.returnTo ?? SCENE_KEYS.Title;
    this.closing = false;
  }

  create(): void {
    configureUiCamera(this);
    const services = getServices(this);

    this.add.rectangle(0, 0, UI_WIDTH, UI_HEIGHT, COLORS.ink).setOrigin(0, 0);
    this.add.rectangle(0, 0, UI_WIDTH, 21, COLORS.deepPlum).setOrigin(0, 0);
    this.add.rectangle(0, 21, UI_WIDTH, 1, COLORS.plumLine).setOrigin(0, 0);
    makeText(this, 16, 7, 'PANDUAN KONTROL', { color: COLORS.bitterLime });

    CONTROL_LEGEND.forEach((row, i) => {
      const y = 38 + i * 26;
      this.add.rectangle(16, y - 2, 128, 14, COLORS.deepPlum).setOrigin(0, 0);
      makeText(this, 22, y + 1, row.keys, { color: COLORS.bitterLime });
      makeText(this, 152, y + 1, row.labelId);
    });

    makeText(this, 16, 140, 'Mouse tidak diperlukan. Seluruh game dimainkan dengan keyboard.', {
      color: COLORS.paperDim,
      wrapWidth: UI_WIDTH - 32,
      lineSpacing: 3,
    });

    // Tombol Kembali tunggal, fokus selalu terlihat.
    this.add.rectangle(UI_WIDTH - 72, 167, 64, 11, COLORS.bitterLime).setOrigin(0, 0);
    makeText(this, UI_WIDTH - 40, 169, 'Kembali', { originX: 0.5, color: COLORS.ink });

    this.releaseInput = services.input.pushLayer('controls', (e) => {
      if (e.intent === 'back' || e.intent === 'confirm') this.close(services.router);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.releaseInput?.());
  }

  private close(router: ReturnType<typeof getServices>['router']): void {
    if (this.closing) return;
    this.closing = true;
    router.closeOverlay(this, this.returnTo);
  }
}
