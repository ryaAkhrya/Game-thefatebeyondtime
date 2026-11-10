import Phaser from 'phaser';
import { BUILD_LABEL, UI_HEIGHT, UI_WIDTH } from '../config/constants';
import { COLORS, css } from '../config/palette';
import { SCENE_KEYS } from '../data/ids';
import { getServices, type Services } from '../systems/Services';
import { MenuList, type MenuItem } from '../../ui/components/MenuList';
import { TEXT_SIZE, makeText, configureUiCamera } from '../../ui/styles/theme';

type TitleAction = 'new' | 'continue' | 'settings' | 'controls';

const NO_SAVE_HINT = 'Belum ada data simpan.';

export class TitleScene extends Phaser.Scene {
  private services!: Services;
  private menu!: MenuList;
  private status!: Phaser.GameObjects.Text;
  private statusTimer?: Phaser.Time.TimerEvent;
  private releaseInput?: () => void;
  private lineL!: Phaser.GameObjects.Rectangle;
  private lineR!: Phaser.GameObjects.Rectangle;
  private gapWide = true;

  constructor() {
    super(SCENE_KEYS.Title);
  }

  create(): void {
    configureUiCamera(this);
    this.services = getServices(this);
    const { router, saves, settings, input, audio } = this.services;
    router.arrive(this);

    this.cameras.main.setBackgroundColor(COLORS.ink);
    this.drawBackdrop();
    this.drawTitle();
    this.drawMotif();

    const hasSave = saves.hasValidSave();
    const items: (MenuItem & { action: TitleAction })[] = [
      { id: 'new', action: 'new', label: 'Mulai Baru' },
      { id: 'continue', action: 'continue', label: 'Lanjut', disabled: !hasSave, disabledHint: NO_SAVE_HINT },
      { id: 'settings', action: 'settings', label: 'Pengaturan' },
      { id: 'controls', action: 'controls', label: 'Panduan Kontrol' },
    ];

    this.menu = new MenuList(this, {
      x: UI_WIDTH / 2,
      y: 92,
      width: 128,
      rowHeight: 14,
      items,
      onConfirm: (item) => this.activate((item as (typeof items)[number]).action),
      onDisabledConfirm: (item) => this.setStatus(item.disabledHint ?? '', COLORS.warn, 2500),
      onFocusChange: (item) => {
        if (item.disabled) this.setStatus(item.disabledHint ?? '', COLORS.warn);
        else this.resetStatus();
      },
    });

    this.status = makeText(this, UI_WIDTH / 2, 156, '', { originX: 0.5, color: COLORS.paperDim });
    this.resetStatus();

    makeText(this, 8, 170, 'W/S atau Panah: pilih   Enter: ok', { color: COLORS.paperDim });
    makeText(this, UI_WIDTH - 8, 8, BUILD_LABEL, { originX: 1, color: COLORS.disabled });

    this.releaseInput = input.pushLayer('title', (e) => this.menu.handleIntent(e));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.releaseInput?.());

    // Audio dimulai hanya setelah input pemain; tanpa file komposer -> senyap, tanpa error.
    audio.playBgm('BGM_TITLE');

    if (settings.recoveredFromCorruption) {
      this.setStatus('Pengaturan tersimpan rusak; memakai bawaan.', COLORS.warn, 4000);
    }
  }

  private activate(action: TitleAction): void {
    const { router, gameState, saves } = this.services;
    switch (action) {
      case 'new':
        // New Game hanya menyiapkan state di memori; tidak menulis atau menimpa save apa pun.
        gameState.startNewGame();
        router.goto(this, SCENE_KEYS.World);
        break;
      case 'continue': {
        const latest = saves.latestValid();
        if (!latest) return this.setStatus(NO_SAVE_HINT, COLORS.warn, 2500);
        router.goto(this, SCENE_KEYS.Placeholder, { variant: 'continue', summary: latest.summary });
        break;
      }
      case 'settings':
        router.openOverlay(this, SCENE_KEYS.Settings);
        break;
      case 'controls':
        router.openOverlay(this, SCENE_KEYS.Controls);
        break;
    }
  }

  private resetStatus(): void {
    this.statusTimer?.remove();
    const { settings } = this.services;
    if (!settings.isPersistent) {
      this.status.setText('Penyimpanan browser tidak tersedia.').setColor(css(COLORS.warn));
    } else {
      this.status.setText('');
    }
  }

  private setStatus(msg: string, color: number, clearAfterMs?: number): void {
    this.statusTimer?.remove();
    this.status.setText(msg).setColor(css(color));
    if (clearAfterMs) {
      this.statusTimer = this.time.delayedCall(clearAfterMs, () => {
        const f = this.menu.focusedItem;
        if (f.disabled) this.setStatus(f.disabledHint ?? '', COLORS.warn);
        else this.resetStatus();
      });
    }
  }

  /** Titik-titik latar deterministik (bukan acak) supaya tampilan stabil antar sesi. */
  private drawBackdrop(): void {
    const g = this.add.graphics();
    let seed = 7;
    const rnd = (): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    g.fillStyle(COLORS.deepPlum, 1);
    g.fillRect(0, UI_HEIGHT - 28, UI_WIDTH, 28); // pita dasar plum
    g.fillStyle(COLORS.plumLine, 1);
    for (let i = 0; i < 26; i++) {
      g.fillRect(Math.floor(rnd() * UI_WIDTH), Math.floor(rnd() * 70), 1, 1);
    }
    g.fillStyle(COLORS.plumLift, 1);
    g.fillRect(0, UI_HEIGHT - 28, UI_WIDTH, 1);
  }

  private drawTitle(): void {
    makeText(this, UI_WIDTH / 2, 22, 'THE FATE', { size: TEXT_SIZE.title, originX: 0.5, color: COLORS.paper });
    makeText(this, UI_WIDTH / 2, 44, 'BEYOND TIME', { size: TEXT_SIZE.title, originX: 0.5, color: COLORS.bitterLime });
  }

  /** Motif identitas: dua garis yang hampir bertemu. Celah menyempit-melebar 2px, lambat, tanpa kilat. */
  private drawMotif(): void {
    const y = 72;
    const cx = UI_WIDTH / 2;
    this.lineL = this.add.rectangle(0, y, 0, 2, COLORS.rose).setOrigin(0, 0);
    this.lineR = this.add.rectangle(0, y, 0, 2, COLORS.bitterLime).setOrigin(0, 0);
    const layout = (): void => {
      const half = this.gapWide ? 12 : 9;
      this.lineL.setPosition(cx - half - 108, y).setSize(108, 2);
      this.lineR.setPosition(cx + half, y).setSize(108, 2);
    };
    layout();
    this.time.addEvent({
      delay: 1400,
      loop: true,
      callback: () => {
        this.gapWide = !this.gapWide;
        layout();
      },
    });
  }
}
