import Phaser from 'phaser';
import { COLORS } from '../config/palette';
import { SCENE_KEYS, type SceneKey } from '../data/ids';
import { CONTROL_LEGEND } from '../core/InputManager';
import { getServices } from '../systems/Services';
import { menuWindow, veil, windowHint, type WindowSpec } from '../../ui/components/frame';
import { TYPE, Ui, bindRelayout } from '../../ui/kit/ui';

const WIN: WindowSpec = { x: 180, y: 92, w: 600, h: 356, title: 'Panduan Kontrol' };

/** Panduan Kontrol (overlay). Daftar tombol diambil dari KEY_BINDINGS/CONTROL_LEGEND, bukan ditulis ulang. */
export class ControlsScene extends Phaser.Scene {
  private ui!: Ui;
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
    this.ui = new Ui(this);
    const services = getServices(this);
    this.build();
    this.ui.fadeIn();
    bindRelayout(this, () => this.build());
    this.releaseInput = services.input.pushLayer('controls', (e) => {
      if (e.intent === 'back' || e.intent === 'confirm') this.close(services.router);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.releaseInput?.());
  }

  private build(): void {
    const ui = this.ui;
    veil(ui, 0.97);
    const body = menuWindow(ui, WIN);
    CONTROL_LEGEND.forEach((row, i) => {
      const y = body.bodyY + 6 + i * 52;
      // tutup tombol: kotak kecil per tombol
      let x = body.bodyX;
      for (const key of row.keys.split(' / ').flatMap(k => k.split('/'))) {
        const label = ui.text(x + 10, y + 13, key.trim(), { size: TYPE.small, weight: '600', color: COLORS.bitterLime, originY: 0.5, depth: 4 });
        const w = label.width / ui.s + 20;
        ui.panel(x, y, w, 26, { fill: COLORS.night, alpha: 0.9, line: COLORS.plumLine, depth: 3 });
        x += w + 8;
      }
      ui.text(body.bodyX + 300, y + 13, row.labelId, { size: TYPE.body, originY: 0.5, depth: 3 });
    });
    ui.text(body.bodyX, WIN.y + WIN.h - 86, 'Mouse tidak diperlukan. Seluruh game dimainkan dengan keyboard.', { size: TYPE.small, color: COLORS.paperDim, depth: 3 });
    windowHint(ui, WIN, 'Enter / Esc  kembali');
  }

  private close(router: ReturnType<typeof getServices>['router']): void {
    if (this.closing) return;
    this.closing = true;
    router.closeOverlay(this, this.returnTo);
  }
}
