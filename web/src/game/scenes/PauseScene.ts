import Phaser from 'phaser';
import { COLORS } from '../config/palette';
import { SCENE_KEYS, type SceneKey } from '../data/ids';
import { getServices } from '../systems/Services';
import { MenuList } from '../../ui/components/MenuList';
import { veil } from '../../ui/components/frame';
import { Ui, TYPE, bindRelayout } from '../../ui/kit/ui';
import { AREA_LABEL, formatPlaytime } from '../../ui/labels';

type PauseAction = 'resume' | 'journal' | 'status' | 'inventory' | 'equipment' | 'skills' | 'save' | 'settings' | 'title';

/**
 * Menu Jeda (overlay di atas dunia/battle). Laci sempit di kiri, dunia tetap terlihat di kanan; di kanan bawah
 * hanya konteks singkat (lokasi, waktu). Pengaturan memakai jalur overlay yang sama dengan Title.
 */
export class PauseScene extends Phaser.Scene {
  private returnTo: SceneKey = SCENE_KEYS.World;
  private ui!: Ui;
  private menu?: MenuList;
  private mode: 'main' | 'confirm' = 'main';
  private releaseInput?: () => void;
  private closing = false;
  private hint?: Phaser.GameObjects.Text;
  private hintText = '';
  private focusId?: string;

  constructor() {
    super(SCENE_KEYS.Pause);
  }

  init(data: { returnTo?: SceneKey }): void {
    this.returnTo = data.returnTo ?? SCENE_KEYS.World;
    this.mode = 'main';
    this.closing = false;
    this.menu = undefined;
    this.hintText = '';
    this.focusId = undefined;
  }

  create(): void {
    this.ui = new Ui(this);
    const { input } = getServices(this);
    this.build();
    this.ui.fadeIn();
    bindRelayout(this, () => { this.focusId = this.menu?.focusedItem.id; this.build(); });
    this.releaseInput = input.pushLayer('pause', (e) => {
      if (this.closing) return;
      if (e.intent === 'back') {
        if (this.mode === 'confirm') this.toggleConfirm();
        else this.resume();
        return;
      }
      this.menu?.handleIntent(e);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.releaseInput?.());
  }

  private build(): void {
    const ui = this.ui;
    veil(ui, 0.62);
    // laci kiri
    ui.rect(0, 0, 312, ui.dh, COLORS.night, 0.94, 1);
    ui.rect(311, 0, 1, ui.dh, COLORS.plumLine, 1, 2);
    ui.text(48, 44, 'JEDA', { family: 'display', weight: '700', size: TYPE.display, color: COLORS.bitterLime, depth: 3 });
    ui.motif(48 + 64, 92, 128, 10, 3);
    this.hint = ui.text(48, ui.dh - 60, this.hintText, { size: TYPE.small, color: COLORS.paperDim, depth: 3, width: 230 });
    this.info();
    if (this.mode === 'confirm') this.confirmView(); else this.mainView();
  }

  /** Konteks singkat di kanan bawah: lokasi dan waktu. */
  private info(): void {
    const ui = this.ui;
    const state = getServices(this).gameState.snapshot();
    if (!state) return;
    const x = ui.dw - 56;
    ui.text(x, ui.dh - 92, AREA_LABEL[state.area] ?? '', { family: 'display', weight: '600', size: TYPE.heading + 3, originX: 1, depth: 3 });
    ui.text(x, ui.dh - 60, `Bab ${state.chapter}   ·   ${formatPlaytime(state.playtimeSec)}`, { size: TYPE.small, originX: 1, color: COLORS.paperDim, depth: 3 });
  }

  private mainView(): void {
    const ui = this.ui;
    const items: { id: PauseAction; label: string }[] = [
      { id: 'resume', label: 'Lanjutkan' },
      { id: 'journal', label: 'Jurnal' },
      { id: 'status', label: 'Status' },
      { id: 'inventory', label: 'Inventaris' },
      { id: 'equipment', label: 'Perlengkapan' },
      { id: 'skills', label: 'Jurus' },
      { id: 'save', label: 'Simpan / Muat' },
      { id: 'settings', label: 'Pengaturan' },
      { id: 'title', label: 'Kembali ke Judul' },
    ];
    const inBattle = this.returnTo === SCENE_KEYS.Battle;
    this.menu = new MenuList(this, {
      ui, x: 36, y: 124, width: 240, rowHeight: 38, depth: 4, initialId: this.focusId, size: 15,
      items: items.map(item => ({ ...item, disabled: inBattle && ['journal', 'status', 'inventory', 'equipment', 'skills', 'save'].includes(item.id), disabledHint: 'Selesaikan pertarungan dahulu.' })),
      onFocusChange: item => this.setHint(item.disabled ? item.disabledHint ?? '' : ''),
      onDisabledConfirm: item => this.setHint(item.disabledHint ?? ''),
      onConfirm: (item) => this.act(item.id as PauseAction),
    });
  }

  private confirmView(): void {
    const ui = this.ui;
    ui.text(48, 140, 'Kembali ke judul?', { family: 'display', weight: '600', size: TYPE.heading + 1, depth: 4 });
    ui.text(48, 172, 'Progres yang belum disimpan\nakan hilang.', { size: TYPE.body, color: COLORS.paperDim, depth: 4 });
    this.menu = new MenuList(this, {
      ui, x: 36, y: 232, width: 240, rowHeight: 38, depth: 4, size: 15,
      items: [{ id: 'cancel', label: 'Batal' }, { id: 'yes', label: 'Ya, kembali' }],
      onConfirm: (item) => { if (item.id === 'cancel') this.toggleConfirm(); else this.toTitle(); },
    });
  }

  private setHint(t: string): void {
    this.hintText = t;
    this.hint?.setText(t);
  }

  private toggleConfirm(): void {
    this.mode = this.mode === 'confirm' ? 'main' : 'confirm';
    this.menu?.destroy();
    this.children.removeAll(true);
    this.focusId = undefined;
    this.build();
  }

  private act(a: PauseAction): void {
    const { router } = getServices(this);
    if (a === 'resume') this.resume();
    else if (a === 'settings') router.openOverlay(this, SCENE_KEYS.Settings);
    else if (a === 'save') router.openOverlay(this, SCENE_KEYS.SaveLoad);
    else if (a === 'journal') router.openOverlay(this, SCENE_KEYS.Journal);
    else if (a === 'status' || a === 'inventory' || a === 'equipment' || a === 'skills') router.openOverlay(this, SCENE_KEYS.RpgMenu, { kind: a });
    else this.toggleConfirm();
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
