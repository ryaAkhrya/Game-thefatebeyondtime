import Phaser from 'phaser';
import { COLORS } from '../config/palette';
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
import { menuWindow, veil, windowHint, type WindowSpec } from '../../ui/components/frame';
import { TYPE, Ui, bindRelayout } from '../../ui/kit/ui';

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

const WIN: WindowSpec = { x: 170, y: 40, w: 620, h: 460, title: 'Pengaturan' };
const ROW_H = 28;
const SEGMENTS = 12;
const SAMPLE_TEXT = 'Contoh: teks akan muncul seperti ini.';

/**
 * Panel Pengaturan. Overlay (dibuka dari Title/Pause), keyboard saja, perubahan langsung disimpan lewat
 * SettingsRepository. Tata letak digambar ulang penuh setiap perubahan (murah; menjaga satu sumber kebenaran).
 */
export class SettingsScene extends Phaser.Scene {
  private services!: Services;
  private ui!: Ui;
  private returnTo: SceneKey = SCENE_KEYS.Title;
  private index = 0;
  private sample?: Phaser.GameObjects.Text;
  private sampleStart = 0;
  private statusMsg = '';
  private statusColor: number = COLORS.paperDim;
  private statusTimer?: Phaser.Time.TimerEvent;
  private confirmOpen = false;
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
    this.confirmOpen = false;
    this.statusMsg = '';
    this.sample = undefined; // objek lama sudah dihancurkan bersama scene sebelumnya
  }

  create(): void {
    this.services = getServices(this);
    this.ui = new Ui(this);
    const { settings, input, fullscreen } = this.services;
    this.restartSample();
    this.draw();
    this.ui.fadeIn();
    bindRelayout(this, () => this.draw());
    this.unsubSettings = settings.subscribe(() => this.redraw());
    // Mengikuti keadaan Fullscreen sebenarnya (mis. pemain menekan Esc browser).
    this.unsubFullscreen = fullscreen.subscribe((on) => {
      if (settings.get('fullscreen') !== on) settings.set('fullscreen', on);
    });
    this.releaseInput = input.pushLayer('settings', (e) => this.onIntent(e));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  override update(time: number): void {
    if (!this.sample) return;
    const n = visibleChars(time - this.sampleStart, this.services.settings.get('text_speed'), SAMPLE_TEXT.length);
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
    this.sample?.setText('');
  }

  private onIntent(e: IntentEvent): void {
    if (this.closing) return;
    const row = ROWS[this.index]!;
    switch (e.intent) {
      case 'up':
        this.index = (this.index + ROWS.length - 1) % ROWS.length;
        this.redraw();
        break;
      case 'down':
        this.index = (this.index + 1) % ROWS.length;
        this.redraw();
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
      if (settings.get('fullscreen') !== fullscreen.isFullscreen) settings.set('fullscreen', fullscreen.isFullscreen);
      const why = result.reason === 'unsupported' ? 'Browser ini tidak mendukung layar penuh.' : 'Browser menolak layar penuh.';
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
    if (this.confirmOpen) return;
    this.confirmOpen = true;
    this.confirmIndex = 0; // fokus awal pada Batal (aman)
    this.redraw();
    this.releaseConfirm = this.services.input.pushLayer('settings-confirm', (e) => {
      if (e.intent === 'left' || e.intent === 'right' || e.intent === 'up' || e.intent === 'down') {
        this.confirmIndex = this.confirmIndex === 0 ? 1 : 0;
        this.redraw();
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
    this.confirmOpen = false;
    this.redraw();
  }

  // ---- Render ----

  private flashStatus(msg: string, color: number, ms = 3000): void {
    this.statusTimer?.remove();
    this.statusMsg = msg;
    this.statusColor = color;
    this.redraw();
    this.statusTimer = this.time.delayedCall(ms, () => { this.statusMsg = ''; this.redraw(); });
  }

  private redraw(): void {
    if (!this.ui) return;
    this.children.removeAll(true);
    this.draw();
  }

  private draw(): void {
    const ui = this.ui;
    const { settings } = this.services;
    this.registry.set('debug.focus', `settings:${ROWS[this.index]!.id}`); // dibaca smoke test
    veil(ui, 0.97);
    const body = menuWindow(ui, WIN);
    const x0 = body.bodyX;
    const valueX = x0 + 320;
    ROWS.forEach((row, i) => {
      const y = body.bodyY - 2 + i * ROW_H;
      const focused = i === this.index && !this.confirmOpen;
      if (focused) {
        ui.rect(x0 - 8, y, body.bodyW + 16, ROW_H - 2, COLORS.plumLift, 0.9, 2);
        ui.rect(x0 - 8, y, 3, ROW_H - 2, COLORS.bitterLime, 1, 3);
      }
      const mid = y + (ROW_H - 2) / 2;
      const separate = row.kind === 'action' && (row.id === 'reset');
      if (separate) ui.rule(x0, y - 3, body.bodyW, COLORS.plumLine, 0.7, 2);
      ui.text(x0 + 6, mid, row.label, { size: TYPE.body, originY: 0.5, weight: focused ? '600' : '400', depth: 4 });
      switch (row.kind) {
        case 'volume': {
          const pct = settings.get(row.key as 'master_volume');
          const lit = Math.round((pct / 100) * SEGMENTS);
          for (let s = 0; s < SEGMENTS; s++) {
            ui.rect(valueX + s * 14, mid - 4, 11, 8, s < lit ? COLORS.bitterLime : COLORS.plumLine, s < lit ? 1 : 0.55, 4);
          }
          ui.text(x0 + body.bodyW - 4, mid, `${pct}%`, { size: TYPE.body, originX: 1, originY: 0.5, weight: '600', depth: 4 });
          break;
        }
        case 'toggle': {
          const on = settings.get(row.key as 'mute_all');
          ui.text(valueX, mid, on ? 'Aktif' : 'Mati', { size: TYPE.body, originY: 0.5, weight: '600', color: on ? COLORS.bitterLime : COLORS.paperDim, depth: 4 });
          break;
        }
        case 'cycle': {
          const label = row.key === 'text_speed' ? TEXT_SPEED_LABEL_ID[settings.get('text_speed')] : SCREEN_SCALE_LABEL_ID[settings.get('screen_scale')];
          ui.text(valueX, mid, `‹   ${label}   ›`, { size: TYPE.body, originY: 0.5, weight: '600', depth: 4 });
          break;
        }
        case 'action':
          break;
      }
    });
    const afterRows = body.bodyY + ROWS.length * ROW_H + 10;
    ui.text(x0, afterRows, 'Pratinjau teks', { size: TYPE.tiny, color: COLORS.paperDim, depth: 4 });
    this.sample = ui.text(x0 + 110, afterRows - 1, '', { size: TYPE.small + 1, depth: 4 });
    this.sample.setText(this.sample.text);
    const persist = !settings.isPersistent ? 'Pengaturan tidak tersimpan permanen.' : '';
    const msg = this.statusMsg || persist;
    ui.text(x0, afterRows + 22, msg, { size: TYPE.small, color: this.statusMsg ? this.statusColor : COLORS.warn, depth: 4 });
    windowHint(ui, WIN, '↑ ↓  pilih        ← →  ubah        Esc  kembali');
    if (this.confirmOpen) this.drawConfirm();
  }

  private drawConfirm(): void {
    const ui = this.ui;
    ui.rect(0, 0, ui.dw, ui.dh, COLORS.night, 0.7, 10);
    const w = 400, h = 132, x = (ui.dw - w) / 2, y = 190;
    ui.panel(x, y, w, h, { fill: COLORS.deepPlum, alpha: 1, line: COLORS.bitterLime, depth: 11 });
    ui.text(x + w / 2, y + 22, 'Kembalikan semua pengaturan?', { size: TYPE.body + 1, weight: '600', originX: 0.5, depth: 12 });
    ui.text(x + w / 2, y + 48, 'Data simpan tidak dihapus.', { size: TYPE.small, color: COLORS.paperDim, originX: 0.5, depth: 12 });
    ['Batal', 'Ya, kembalikan'].forEach((label, i) => {
      const bx = x + 28 + i * 190;
      const focus = this.confirmIndex === i;
      ui.rect(bx, y + 80, 164, 32, focus ? COLORS.bitterLime : COLORS.plumLift, 1, 12);
      ui.text(bx + 82, y + 96, label, { size: TYPE.body, weight: '600', originX: 0.5, originY: 0.5, color: focus ? COLORS.ink : COLORS.paper, depth: 13 });
    });
  }
}
