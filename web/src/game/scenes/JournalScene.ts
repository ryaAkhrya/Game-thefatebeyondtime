import Phaser from 'phaser';
import { COLORS } from '../config/palette';
import { SCENE_KEYS, type SceneKey } from '../data/ids';
import { Chapter1Story } from '../story/Chapter1Story';
import { journalNotes } from '../story/journal';
import { getServices } from '../systems/Services';
import { MenuList } from '../../ui/components/MenuList';
import { uiSfx } from '../../ui/kit/sfx';
import { menuWindow, veil, windowHint, type WindowSpec } from '../../ui/components/frame';
import { TYPE, Ui, bindRelayout } from '../../ui/kit/ui';

/**
 * Jurnal: tempat satu-satunya tujuan saat ini dibaca (tidak ada banner tujuan di HUD), ditambah catatan yang
 * sudah ditemukan. Hanya membaca state; tidak mengubah apa pun.
 */
export class JournalScene extends Phaser.Scene {
  private ui!: Ui;
  private returnTo: SceneKey = SCENE_KEYS.Pause;
  private menu?: MenuList;
  private detail?: Phaser.GameObjects.Text;
  private releaseInput?: () => void;
  private focusId?: string;

  constructor() {
    super(SCENE_KEYS.Journal);
  }

  init(data: { returnTo?: SceneKey }): void {
    this.returnTo = data.returnTo ?? SCENE_KEYS.Pause;
    this.menu = undefined;
    this.focusId = undefined;
  }

  create(): void {
    this.ui = new Ui(this);
    const services = getServices(this);
    this.build();
    this.ui.fadeIn();
    bindRelayout(this, () => { this.focusId = this.menu?.focusedItem.id; this.build(); });
    this.releaseInput = services.input.pushLayer('journal', (e) => {
      if (e.intent === 'back') { uiSfx(this, 'SFX_UI_CANCEL'); services.router.closeOverlay(this, this.returnTo); }
      else this.menu?.handleIntent(e);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.releaseInput?.());
  }

  private build(): void {
    const ui = this.ui;
    const services = getServices(this);
    const state = services.gameState.snapshot()!;
    const objective = new Chapter1Story(services.gameState).objective();
    const notes = journalNotes(state.flags);
    veil(ui, 0.97);
    const win: WindowSpec = { x: 120, y: 56, w: 720, h: 428, title: 'Jurnal' };
    const body = menuWindow(ui, win);
    // tujuan saat ini
    ui.text(body.bodyX, body.bodyY, 'TUJUAN', { family: 'display', weight: '600', size: TYPE.small, color: COLORS.paperDim, depth: 3 });
    ui.text(body.bodyX, body.bodyY + 20, objective ?? 'Belum ada tujuan khusus. Jelajahi sekitar.', { size: TYPE.body + 1.5, weight: '600', color: COLORS.bitterLime, depth: 3, width: body.bodyW });
    const listY = body.bodyY + 70;
    ui.rule(body.bodyX, listY - 10, body.bodyW, COLORS.plumLine, 0.6, 3);
    if (!notes.length) {
      ui.text(body.bodyX, listY + 8, 'Belum ada catatan.', { size: TYPE.body, color: COLORS.paperDim, depth: 3 });
    } else {
      this.menu = new MenuList(this, {
        ui, x: body.bodyX, y: listY, width: 236, rowHeight: 32, maxRows: 7, depth: 4, size: TYPE.body, initialId: this.focusId,
        items: notes.map(n => ({ id: n.id, label: n.title })),
        sfx: { confirm: 'SFX_UI_SELECT_ITEM' },
        onConfirm: () => undefined,
        onFocusChange: item => this.describe(notes.find(n => n.id === item.id)?.text ?? ''),
      });
      this.detail = ui.text(body.bodyX + 268, listY + 2, '', { size: TYPE.body + 0.5, width: body.bodyW - 268, depth: 3, leading: 7 });
      this.describe(notes.find(n => n.id === this.menu!.focusedItem.id)?.text ?? '');
    }
    windowHint(ui, win, 'Esc  kembali');
  }

  private describe(text: string): void {
    this.detail?.setText(text);
  }
}
