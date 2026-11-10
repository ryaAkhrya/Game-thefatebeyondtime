import Phaser from 'phaser';
import { UI_HEIGHT, UI_WIDTH } from '../config/constants';
import { COLORS } from '../config/palette';
import { SCENE_KEYS, type SceneKey } from '../data/ids';
import { getServices } from '../systems/Services';
import { MenuList } from '../../ui/components/MenuList';
import { configureUiCamera, makeText } from '../../ui/styles/theme';

type PauseAction = 'resume' | 'status' | 'inventory' | 'equipment' | 'skills' | 'save' | 'settings' | 'title';

/**
 * Menu Jeda (overlay di atas dunia). Esc dari dunia membukanya; Pengaturan memakai jalur overlay yang sama
 * dengan Title, jadi nilainya identik. Layar RPG dan save tersedia di dunia; selama battle hanya menu aman yang aktif.
 */
export class PauseScene extends Phaser.Scene {
  private returnTo: SceneKey = SCENE_KEYS.World;
  private menu?: MenuList;
  private extra: Phaser.GameObjects.GameObject[] = [];
  private mode: 'main' | 'confirm' = 'main';
  private releaseInput?: () => void;
  private closing = false;
  private hint!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE_KEYS.Pause);
  }

  init(data: { returnTo?: SceneKey }): void {
    this.returnTo = data.returnTo ?? SCENE_KEYS.World;
    this.mode = 'main';
    this.closing = false;
    this.extra = [];
    this.menu = undefined;
  }

  create(): void {
    configureUiCamera(this);
    const { input } = getServices(this);

    this.add.rectangle(0, 0, UI_WIDTH, UI_HEIGHT, COLORS.ink, 0.62).setOrigin(0, 0);
    this.add.rectangle(36, 20, 248, 140, COLORS.deepPlum).setOrigin(0, 0).setStrokeStyle(1, COLORS.bitterLime);
    makeText(this, 160, 27, 'JEDA', { originX: 0.5, color: COLORS.bitterLime });
    this.hint = makeText(this, 160, 147, 'Esc: kembali', { originX: 0.5, size: 6, color: COLORS.paperDim });
    this.showMain();

    this.releaseInput = input.pushLayer('pause', (e) => {
      if (this.closing) return;
      if (e.intent === 'back') {
        if (this.mode === 'confirm') this.showMain();
        else this.resume();
        return;
      }
      this.menu?.handleIntent(e);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.releaseInput?.());
  }

  private clearMenu(): void {
    this.menu?.destroy();
    this.extra.forEach((o) => o.destroy());
    this.extra = [];
  }

  private showMain(): void {
    this.clearMenu();
    this.mode = 'main';
    const items: { id: PauseAction; label: string }[] = [
      { id: 'resume', label: 'Lanjutkan' },
      { id: 'status', label: 'Status' },
      { id: 'inventory', label: 'Inventaris' },
      { id: 'equipment', label: 'Perlengkapan' },
      { id: 'skills', label: 'Jurus' },
      { id: 'save', label: 'Simpan/Muat' },
      { id: 'settings', label: 'Pengaturan' },
      { id: 'title', label: 'Kembali ke Judul' },
    ];
    this.menu = new MenuList(this, {
      x: 160,
      y: 43,
      width: 216,
      rowHeight: 12,
      items: items.map(item => ({ ...item, disabled: this.returnTo === SCENE_KEYS.Battle && ['status', 'inventory', 'equipment', 'skills', 'save'].includes(item.id), disabledHint: 'Selesaikan pertarungan dahulu.' })),
      onFocusChange: item => this.hint.setText(item.disabled ? item.disabledHint ?? '' : 'Esc: kembali'),
      onDisabledConfirm: item => this.hint.setText(item.disabledHint ?? ''),
      onConfirm: (item) => this.act(item.id as PauseAction),
    });
  }

  private showConfirm(): void {
    this.clearMenu();
    this.mode = 'confirm';
    this.extra.push(
      makeText(this, 160, 62, 'Kembali ke judul?', { originX: 0.5 }),
      makeText(this, 160, 74, 'Simpan dulu bila perlu.', { originX: 0.5, color: COLORS.paperDim }),
    );
    this.menu = new MenuList(this, {
      x: 160,
      y: 94,
      width: 160,
      rowHeight: 14,
      items: [
        { id: 'cancel', label: 'Batal' },
        { id: 'yes', label: 'Ya, kembali' },
      ],
      onConfirm: (item) => {
        if (item.id === 'cancel') this.showMain();
        else this.toTitle();
      },
    });
  }

  private act(a: PauseAction): void {
    const { router } = getServices(this);
    if (a === 'resume') this.resume();
    else if (a === 'settings') router.openOverlay(this, SCENE_KEYS.Settings);
    else if (a === 'save') router.openOverlay(this, SCENE_KEYS.SaveLoad);
    else if (a === 'status' || a === 'inventory' || a === 'equipment' || a === 'skills') router.openOverlay(this, SCENE_KEYS.RpgMenu, { kind: a });
    else this.showConfirm();
  }

  private resume(): void {
    if (this.closing) return;
    this.closing = true;
    getServices(this).router.closeOverlay(this, this.returnTo);
  }

  private toTitle(): void {
    if (this.closing) return;
    this.closing = true;
    const { router } = getServices(this);
    this.scene.stop(SCENE_KEYS.World);
    this.scene.stop(SCENE_KEYS.Hud);
    this.scene.stop(SCENE_KEYS.Battle);
    router.goto(this, SCENE_KEYS.Title);
  }
}
