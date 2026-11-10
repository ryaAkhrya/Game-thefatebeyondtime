import Phaser from 'phaser';
import { UI_HEIGHT, UI_WIDTH } from '../config/constants';
import { COLORS } from '../config/palette';
import { SCENE_KEYS, type AreaId } from '../data/ids';
import type { SaveSummary } from '../systems/SaveRepository';
import { getServices } from '../systems/Services';
import { makeText, configureUiCamera } from '../../ui/styles/theme';

type Variant = 'new' | 'continue' | 'phase1_end';

interface PlaceholderData {
  variant?: Variant;
  summary?: SaveSummary;
}

/** Nama area untuk tampilan. Nama kerja / TBD (GDD bagian 4); bukan nama final. */
const AREA_LABEL_ID: Readonly<Record<AreaId, string>> = {
  none: '-',
  forest_1: 'Hutan 1',
  aveloria: 'Aveloria',
  liora: 'Liora',
  forest_2: 'Hutan 2',
  temple: 'Kuil',
  fortress: 'Benteng',
  cliff: 'Tebing',
};

const NEW_GAME_TEXT = [
  'Gameplay Chapter I belum tersedia.',
  '',
  'Fase ini baru membangun fondasi: layar judul, pengaturan, input, dan sistem simpan.',
  '',
  'Hutan, percakapan, dan pertarungan pertama menyusul di fase berikutnya.',
].join('\n');

const PHASE1_END_TEXT = [
  'Intro Chapter I selesai: bangun di hutan, bertemu Nambo, dan jalur hutan yang berulang.',
  '',
  'Pertarungan pertama (Hollowling) dikerjakan pada Phase 2.',
].join(String.fromCharCode(10));

/**
 * Layar pengganti sementara untuk Mulai Baru / Lanjut. Jujur bahwa gameplay belum ada:
 * Phase 0 hanya fondasi. Tidak menulis/mengubah save apa pun.
 */
export class PlaceholderScene extends Phaser.Scene {
  private variant: Variant = 'new';
  private summary?: SaveSummary;
  private releaseInput?: () => void;

  constructor() {
    super(SCENE_KEYS.Placeholder);
  }

  init(data: PlaceholderData): void {
    this.variant = data.variant ?? 'new';
    this.summary = data.summary;
  }

  create(): void {
    configureUiCamera(this);
    const { router, input } = getServices(this);
    router.arrive(this);

    this.add.rectangle(0, 0, UI_WIDTH, UI_HEIGHT, COLORS.ink).setOrigin(0, 0);
    this.add.rectangle(0, 0, UI_WIDTH, 21, COLORS.deepPlum).setOrigin(0, 0);
    this.add.rectangle(0, 21, UI_WIDTH, 1, COLORS.plumLine).setOrigin(0, 0);

    const body = { wrapWidth: UI_WIDTH - 32, lineSpacing: 3 };
    if (this.variant === 'new') {
      makeText(this, 16, 7, 'MULAI BARU', { color: COLORS.bitterLime });
      makeText(this, 16, 30, NEW_GAME_TEXT, body);
      makeText(this, 16, 130, 'Tidak ada data simpan yang dibuat atau diubah.', { ...body, color: COLORS.paperDim });
    } else if (this.variant === 'phase1_end') {
      makeText(this, 16, 7, 'AKHIR DEMO PHASE 1', { color: COLORS.bitterLime });
      makeText(this, 16, 30, PHASE1_END_TEXT, body);
      makeText(this, 16, 130, 'Kemajuan ini belum dapat disimpan (Phase 3).', { ...body, color: COLORS.paperDim });
    } else {
      makeText(this, 16, 7, 'LANJUT', { color: COLORS.bitterLime });
      const s = this.summary;
      const info = s
        ? `Data simpan valid ditemukan.\nChapter ${s.chapter}, ${AREA_LABEL_ID[s.area]}.`
        : 'Data simpan valid ditemukan.';
      const text = `${info}\n\nPemuatan permainan belum tersedia. Fitur ini dikerjakan pada Phase 3 (RPG State / Save).`;
      makeText(this, 16, 30, text, body);
      makeText(this, 16, 130, 'Data simpan Anda tidak diubah.', { ...body, color: COLORS.paperDim });
    }

    const label = makeText(this, 20, 169, 'Enter / Esc: ke layar judul', { color: COLORS.ink }).setDepth(1);
    this.add
      .rectangle(16, 167, label.width + 8, 11, COLORS.bitterLime)
      .setOrigin(0, 0)
      .setDepth(0);

    this.releaseInput = input.pushLayer('placeholder', (e) => {
      if (e.intent === 'confirm' || e.intent === 'back') router.goto(this, SCENE_KEYS.Title);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.releaseInput?.());
  }
}
