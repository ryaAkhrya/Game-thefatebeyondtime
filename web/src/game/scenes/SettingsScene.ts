import Phaser from 'phaser';
import { UI_HEIGHT, UI_WIDTH } from '../config/constants';
import { COLORS, css } from '../config/palette';
import { SCENE_KEYS, type SceneKey } from '../data/ids';
import {
  SCREEN_SCALES,
  SCREEN_SCALE_LABEL_ID,
  TEXT_SPEEDS,
  TEXT_SPEED_LABEL_ID,
  VOLUME_STEP,
  type SettingKey,
} from '../data/settingsSchema';
import type { IntentEvent } from '../core/InputManager';
import { getServices, type Services } from '../systems/Services';
import { visibleChars } from '../utils/typewriter';
import { FOCUS_BAR_HEIGHT, makeText, configureUiCamera } from '../../ui/styles/theme';

type RowKind = 'volume' | 'toggle' | 'cycle' | 'action';

interface Row {
  id: string;
  label: string;
  kind: RowKind;
  key?: SettingKey;
}

const ROWS: readonly Row[] = [
  { id: 'master', label: 'Volume Utama', kind: 'volume', key: 'master_volume' },
  { id: 'bgm', label: 'Musik', kind: 'volume', key: 'bgm_volume' },
  { id: 'sfx', label: 'Efek Suara', kind: 'volume', key: 'sfx_volume' },
  { id: 'mute', label: 'Bisukan', kind: 'toggle', key: 'mute_all' },
  { id: 'text', label: 'Kecepatan Teks', kind: 'cycle', key: 'text_speed' },
  { id: 'fullscreen', label: 'Layar Penuh', kind: 'toggle', key: 'fullscreen' },
  { id: 'scale', label: 'Skala Tampilan', kind: 'cycle', key: 'screen_scale' },
  { id: 'shake', label: 'Goyang Layar', kind: 'toggle', key: 'screen_shake' },
  { id: 'flash', label: 'Kurangi Kilatan', kind: 'toggle', key: 'reduced_flashes' },
  { id: 'reset', label: 'Kembalikan Bawaan', kind: 'action' },
  { id: 'back', label: 'Kembali', kind: 'action' },
];

const ROW_Y0 = 26;
const ROW_H = 11;
const LABEL_X = 16;
const VALUE_X = 168;
const BAR_W = 60;
const BAR_SEGMENTS = 12;
const SAMPLE_TEXT = 'Contoh: teks akan muncul seperti ini.';

/**
 * Panel Pengaturan. Berjalan sebagai overlay (dibuka dari Title; Pause Menu memakai jalur yang sama),
 * kontrol sepenuhnya keyboard, perubahan langsung disimpan lewat SettingsRepository.
 */
export class SettingsScene extends Phaser.Scene {
  private services!: Services;
  private returnTo: SceneKey = SCENE_KEYS.Title;
  private index = 0;
  private bar!: Phaser.GameObjects.Rectangle;
  private labels: Phaser.GameObjects.Text[] = [];
  private values: Phaser.GameObjects.Text[] = [];
  private barG!: Phaser.GameObjects.Graphics;
  private status!: Phaser.GameObjects.Text;
  private statusTimer?: Phaser.Time.TimerEvent;
  private sample!: Phaser.GameObjects.Text;
  private sampleStart = 0;
  private confirmUi: Phaser.GameObjects.GameObject[] = [];
  private confirmIndex = 0;
  private releaseInput?: () => void;
  private releaseConfirm?: () => void;
  private unsubSettings?: () => void;
  private unsubFullscreen?: () => void;
  private closing = false;

  constructor() {
    super(SCENE_KEYS.Settings);
  }

  init(data: { returnTo?: SceneKey }): void {
    this.returnTo = data.returnTo ?? SCENE_KEYS.Title;
    this.index = 0;
    this.closing = false;
    this.confirmUi = [];
    this.labels = [];
    this.values = [];
  }

  create(): void {
    configureUiCamera(this);
    this.services = getServices(this);
    const { settings, input, fullscreen } = this.services;

    this.add.rectangle(0, 0, UI_WIDTH, UI_HEIGHT, COLORS.ink).setOrigin(0, 0);
    this.add.rectangle(0, 0, UI_WIDTH, 21, COLORS.deepPlum).setOrigin(0, 0);
    this.add.rectangle(0, 21, UI_WIDTH, 1, COLORS.plumLine).setOrigin(0, 0);
    makeText(this, LABEL_X, 7, 'PENGATURAN', { color: COLORS.bitterLime });

    this.bar = this.add.rectangle(8, 0, UI_WIDTH - 16, FOCUS_BAR_HEIGHT, COLORS.bitterLime).setOrigin(0, 0);
    this.barG = this.add.graphics();
    ROWS.forEach((row, i) => {
      const y = ROW_Y0 + i * ROW_H;
      this.labels.push(makeText(this, LABEL_X, y + 1, row.label));
      this.values.push(makeText(this, VALUE_X, y + 1, ''));
    });

    this.sample = makeText(this, LABEL_X, 150, '', { color: COLORS.paperDim });
    this.status = makeText(this, LABEL_X, 160, '', { color: COLORS.paperDim });
    makeText(this, LABEL_X, 171, 'Panah: pilih/ubah   Esc: kembali', { color: COLORS.disabled });

    this.refreshAll();
    this.restartSample();
    this.showPersistenceWarning();

    this.unsubSettings = settings.subscribe(() => this.refreshAll());
    // Mengikuti keadaan Fullscreen sebenarnya (mis. pemain menekan Esc browser).
    this.unsubFullscreen = fullscreen.subscribe((on) => {
      if (settings.get('fullscreen') !== on) settings.set('fullscreen', on);
    });

    this.releaseInput = input.pushLayer('settings', (e) => this.onIntent(e));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  override update(time: number): void {
    const { settings } = this.services;
    const n = visibleChars(time - this.sampleStart, settings.get('text_speed'), SAMPLE_TEXT.length);
    const next = SAMPLE_TEXT.slice(0, n);
    if (this.sample.text !== next) this.sample.setText(next);
  }

  private cleanup(): void {
    this.releaseConfirm?.();
    this.releaseInput?.();
    this.unsubSettings?.();
    this.unsubFullscreen?.();
    this.statusTimer?.remove();
  }

  private restartSample(): void {
    this.sampleStart = this.time.now;
    this.sample.setText('');
  }

  private onIntent(e: IntentEvent): void {
    if (this.closing) return;
    const row = ROWS[this.index]!;
    switch (e.intent) {
      case 'up':
        this.index = (this.index + ROWS.length - 1) % ROWS.length;
        this.refreshAll();
        break;
      case 'down':
        this.index = (this.index + 1) % ROWS.length;
        this.refreshAll();
        break;
      case 'left':
        this.adjust(row, -1);
        break;
      case 'right':
        this.adjust(row, 1);
        break;
      case 'confirm':
        this.activate(row);
        break;
      case 'back':
        this.close();
        break;
    }
  }

  private adjust(row: Row, dir: -1 | 1): void {
    const { settings } = this.services;
    switch (row.kind) {
      case 'volume':
        settings.nudgeVolume(row.key as 'master_volume' | 'bgm_volume' | 'sfx_volume', dir * VOLUME_STEP);
        break;
      case 'toggle':
        this.toggle(row);
        break;
      case 'cycle':
        this.cycle(row, dir);
        break;
      case 'action':
        break;
    }
  }

  private activate(row: Row): void {
    switch (row.kind) {
      case 'toggle':
        this.toggle(row);
        break;
      case 'cycle':
        this.cycle(row, 1);
        break;
      case 'volume':
        break; // slider hanya berubah lewat Kiri/Kanan
      case 'action':
        if (row.id === 'reset') this.openResetConfirm();
        else this.close();
        break;
    }
  }

  private toggle(row: Row): void {
    const { settings, effects } = this.services;
    if (row.id === 'fullscreen') {
      void this.toggleFullscreen();
      return;
    }
    const key = row.key as 'mute_all' | 'screen_shake' | 'reduced_flashes';
    const next = !settings.get(key);
    settings.set(key, next);
    // Pratinjau nyata: menyalakan Goyang Layar memberi satu getaran kecil.
    if (key === 'screen_shake' && next) effects.shake(this, 140, 0.006);
  }

  private async toggleFullscreen(): Promise<void> {
    const { fullscreen, settings } = this.services;
    const want = !fullscreen.isFullscreen;
    const result = await fullscreen.set(want);
    if (!result.ok) {
      // Kembalikan tampilan ke keadaan sebenarnya dan beri tahu pemain.
      if (settings.get('fullscreen') !== fullscreen.isFullscreen) settings.set('fullscreen', fullscreen.isFullscreen);
      const why =
        result.reason === 'unsupported' ? 'Browser ini tidak mendukung layar penuh.' : 'Browser menolak layar penuh.';
      this.flashStatus(why, COLORS.warn);
    } else if (settings.get('fullscreen') !== fullscreen.isFullscreen) {
      settings.set('fullscreen', fullscreen.isFullscreen);
    }
  }

  private cycle(row: Row, dir: -1 | 1): void {
    const { settings } = this.services;
    if (row.key === 'text_speed') {
      const i = TEXT_SPEEDS.indexOf(settings.get('text_speed'));
      settings.set('text_speed', TEXT_SPEEDS[(i + dir + TEXT_SPEEDS.length) % TEXT_SPEEDS.length]!);
      this.restartSample();
    } else if (row.key === 'screen_scale') {
      const i = SCREEN_SCALES.indexOf(settings.get('screen_scale'));
      settings.set('screen_scale', SCREEN_SCALES[(i + dir + SCREEN_SCALES.length) % SCREEN_SCALES.length]!);
    }
  }

  private close(): void {
    if (this.closing) return;
    this.closing = true;
    this.services.router.closeOverlay(this, this.returnTo);
  }

  // ---- Reset Defaults dengan konfirmasi (tidak menyentuh save) ----

  private openResetConfirm(): void {
    if (this.confirmUi.length > 0) return;
    this.confirmIndex = 0; // fokus awal pada Batal (aman)
    const w = 264;
    const h = 62;
    const x = (UI_WIDTH - w) / 2;
    const y = 54;
    const shade = this.add.rectangle(0, 0, UI_WIDTH, UI_HEIGHT, COLORS.ink, 0.7).setOrigin(0, 0);
    const box = this.add.rectangle(x, y, w, h, COLORS.deepPlum).setOrigin(0, 0).setStrokeStyle(1, COLORS.bitterLime);
    const t1 = makeText(this, UI_WIDTH / 2, y + 8, 'Kembalikan semua pengaturan?', { originX: 0.5 });
    const t2 = makeText(this, UI_WIDTH / 2, y + 20, 'Data simpan tidak dihapus.', { originX: 0.5, color: COLORS.paperDim });
    const opt = [
      makeText(this, UI_WIDTH / 2 - 52, y + 42, 'Batal', { originX: 0.5 }),
      makeText(this, UI_WIDTH / 2 + 52, y + 42, 'Ya, kembalikan', { originX: 0.5 }),
    ];
    const hl = this.add.rectangle(0, 0, 10, 10, COLORS.bitterLime).setOrigin(0.5, 0.5).setDepth(0);
    this.confirmUi = [shade, box, t1, t2, hl, ...opt];
    shade.setDepth(10);
    box.setDepth(11);
    [t1, t2].forEach((t) => t.setDepth(12));
    hl.setDepth(12);
    opt.forEach((t) => t.setDepth(13));

    const paint = (): void => {
      opt.forEach((t, i) => t.setColor(css(i === this.confirmIndex ? COLORS.ink : COLORS.paper)));
      const target = opt[this.confirmIndex]!;
      hl.setPosition(target.x, target.y + 4).setSize(target.width + 8, 11);
      hl.displayWidth = target.width + 8;
      hl.displayHeight = 11;
    };
    paint();

    this.releaseConfirm = this.services.input.pushLayer('settings-confirm', (e) => {
      if (e.intent === 'left' || e.intent === 'right') {
        this.confirmIndex = this.confirmIndex === 0 ? 1 : 0;
        paint();
      } else if (e.intent === 'back') {
        this.closeResetConfirm();
      } else if (e.intent === 'confirm') {
        const doReset = this.confirmIndex === 1;
        this.closeResetConfirm();
        if (doReset) {
          this.services.settings.resetToDefaults();
          // Bawaan Layar Penuh = Mati: keluar dari fullscreen bila sedang aktif (tidak perlu gesture).
          if (this.services.fullscreen.isFullscreen) void this.services.fullscreen.set(false);
          this.restartSample();
          this.flashStatus('Pengaturan dikembalikan ke bawaan.', COLORS.bitterLime);
        }
      }
    });
  }

  private closeResetConfirm(): void {
    this.releaseConfirm?.();
    this.releaseConfirm = undefined;
    this.confirmUi.forEach((o) => o.destroy());
    this.confirmUi = [];
  }

  // ---- Render ----

  private flashStatus(msg: string, color: number, ms = 3000): void {
    this.statusTimer?.remove();
    this.status.setText(msg).setColor(css(color));
    this.statusTimer = this.time.delayedCall(ms, () => this.showPersistenceWarning());
  }

  private showPersistenceWarning(): void {
    if (!this.services.settings.isPersistent) {
      this.status.setText('Pengaturan tidak tersimpan permanen.').setColor(css(COLORS.warn));
    } else {
      this.status.setText('');
    }
  }

  private refreshAll(): void {
    const { settings } = this.services;
    const y = ROW_Y0 + this.index * ROW_H;
    this.bar.setPosition(this.bar.x, y);
    this.barG.clear();
    this.registry.set('debug.focus', `settings:${ROWS[this.index]!.id}`); // dibaca smoke test

    ROWS.forEach((row, i) => {
      const focused = i === this.index;
      const fg = focused ? COLORS.ink : COLORS.paper;
      this.labels[i]!.setColor(css(fg));
      const rowY = ROW_Y0 + i * ROW_H;
      const v = this.values[i]!;
      switch (row.kind) {
        case 'volume': {
          const pct = settings.get(row.key as 'master_volume');
          const lit = Math.round((pct / 100) * BAR_SEGMENTS);
          const segW = BAR_W / BAR_SEGMENTS;
          for (let s = 0; s < BAR_SEGMENTS; s++) {
            const on = s < lit;
            const col = on ? (focused ? COLORS.ink : COLORS.bitterLime) : focused ? COLORS.plumLine : COLORS.plumLift;
            this.barG.fillStyle(col, 1);
            this.barG.fillRect(VALUE_X + Math.floor(s * segW), rowY + 2, Math.floor(segW) - 1, 6);
          }
          v.setText(`${String(pct).padStart(3, ' ')}%`).setPosition(VALUE_X + BAR_W + 8, rowY + 1);
          break;
        }
        case 'toggle': {
          const on = settings.get(row.key as 'mute_all');
          v.setText(on ? 'Aktif' : 'Mati').setPosition(VALUE_X, rowY + 1);
          break;
        }
        case 'cycle': {
          const label =
            row.key === 'text_speed'
              ? TEXT_SPEED_LABEL_ID[settings.get('text_speed')]
              : SCREEN_SCALE_LABEL_ID[settings.get('screen_scale')];
          v.setText(`< ${label} >`).setPosition(VALUE_X, rowY + 1);
          break;
        }
        case 'action':
          v.setText('');
          break;
      }
      v.setColor(css(fg));
    });
  }
}
