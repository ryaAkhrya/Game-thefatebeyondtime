import Phaser from 'phaser';
import { MenuList } from '../../ui/components/MenuList';
import { configureUiCamera, makeText } from '../../ui/styles/theme';
import { COLORS } from '../config/palette';
import { SCENE_KEYS, type SceneKey } from '../data/ids';
import { SAVE_SLOTS, type SaveReadResult, type SaveSlot } from '../systems/SaveRepository';
import { getServices } from '../systems/Services';

const slotName = (slot: SaveSlot): string => slot === 'auto' ? 'Otomatis' : `Slot ${slot.at(-1)}`;
const BEAT_LABEL = { 'C1-01': 'Terbangun', 'C1-02': 'Mencari jalan', 'C1-03': 'Jalur berulang', 'C1-04': 'Sebelum Hollowling', 'C1-04-DONE': 'Usai Hollowling' } as const;
export class SaveLoadScene extends Phaser.Scene {
  private returnTo: SceneKey = SCENE_KEYS.Pause;
  private mode: 'save' | 'load' = 'save';
  private confirmation: SaveSlot | null = null;
  private menu?: MenuList;
  private heading!: Phaser.GameObjects.Text;
  private detail!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;
  private releaseInput?: () => void;
  private closing = false;
  constructor() { super(SCENE_KEYS.SaveLoad); }
  init(data: { returnTo?: SceneKey }): void { this.returnTo = data.returnTo ?? SCENE_KEYS.Pause; this.mode = 'save'; this.confirmation = null; this.menu = undefined; this.closing = false; }
  create(): void {
    configureUiCamera(this);
    this.add.rectangle(0, 0, 320, 180, COLORS.ink).setOrigin(0);
    this.add.rectangle(6, 5, 308, 170, COLORS.deepPlum).setOrigin(0).setStrokeStyle(1, COLORS.bitterLime);
    this.heading = makeText(this, 14, 12, '', { color: COLORS.bitterLime });
    makeText(this, 14, 28, 'Kiri / Kanan: ganti Simpan / Muat', { size: 6, color: COLORS.paperDim });
    this.detail = makeText(this, 156, 46, '', { wrapWidth: 150, lineSpacing: 2 });
    this.message = makeText(this, 14, 146, '', { wrapWidth: 290, lineSpacing: 1, color: COLORS.bitterLime });
    makeText(this, 14, 166, 'Simpan lokal hilang jika data situs dihapus.', { size: 6, color: COLORS.paperDim });
    this.render();
    const services = getServices(this);
    this.releaseInput = services.input.pushLayer('save-load', event => {
      if (this.closing) return;
      if (event.intent === 'back') { if (this.confirmation) { this.confirmation = null; this.render(); } else services.router.closeOverlay(this, this.returnTo); }
      else if (!this.confirmation && (event.intent === 'left' || event.intent === 'right')) { this.mode = this.mode === 'save' ? 'load' : 'save'; this.render(); }
      else this.menu?.handleIntent(event);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.releaseInput?.());
  }
  private describe(slot: SaveSlot, result: SaveReadResult): void {
    if (result.status !== 'ok') {
      const reasons = { empty: 'Slot kosong.', corrupt: 'Data rusak. Pilih slot lain atau timpa dengan konfirmasi.', unsupported_version: 'Versi belum didukung. Slot lama dilindungi.', storage_unavailable: 'Penyimpanan browser tidak tersedia.' };
      this.detail.setText(`${slotName(slot)}\n\n${reasons[result.status]}`); return;
    }
    const d = result.data, local = new Date(result.savedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    this.detail.setText(`Bab ${d.chapter} / ${d.area === 'forest_1' ? 'Hutan 1' : d.area}\n${BEAT_LABEL[d.storyBeat]}\nLevel ${d.rpg.characters.C01!.level}\nHP ${d.vitals!.hp}\nMP ${d.vitals!.mp}\n${local} WIB\n${Math.floor(d.playtimeSec / 60)} menit\n${result.recovered ? 'Dari cadangan.' : result.migrated ? 'Data lama terbaca.' : ''}`);
  }
  private render(focusId?: string): void {
    this.menu?.destroy(); this.heading.setText(this.mode === 'save' ? 'SIMPAN PERMAINAN' : 'MUAT PERMAINAN');
    const { saves, checkpoints } = getServices(this);
    const rows = SAVE_SLOTS.map(slot => {
      const result = saves.read(slot);
      const disabled = this.mode === 'save' ? slot === 'auto' || !checkpoints.isSafe || result.status === 'unsupported_version' || result.status === 'storage_unavailable' : result.status !== 'ok';
      return { id: slot, label: `${slotName(slot)} - ${result.status === 'ok' ? `Lv${result.data.rpg.characters.C01!.level}` : result.status === 'empty' ? 'Kosong' : result.status === 'corrupt' ? 'Rusak' : 'Blokir'}`, disabled,
        disabledHint: this.mode === 'save' && slot === 'auto' ? 'Slot ini khusus simpan otomatis.' : 'Slot belum dapat digunakan.' };
    });
    this.menu = new MenuList(this, { x: 76, y: 44, width: 136, rowHeight: 23, items: rows,
      onFocusChange: item => this.describe(item.id as SaveSlot, saves.read(item.id as SaveSlot)),
      onDisabledConfirm: item => this.message.setText(item.disabledHint ?? ''),
      onConfirm: item => {
        const slot = item.id as SaveSlot;
        if (this.mode === 'load' || saves.read(slot).status !== 'empty') this.confirm(slot);
        else this.perform(slot);
      } });
    if (focusId) this.menu.focusId(focusId);
    this.describe(this.menu.focusedItem.id as SaveSlot, saves.read(this.menu.focusedItem.id as SaveSlot));
  }
  private confirm(slot: SaveSlot): void {
    this.confirmation = slot; this.menu?.destroy();
    this.detail.setText(this.mode === 'save' ? `Timpa ${slotName(slot)}?\nData sebelumnya menjadi cadangan jika valid.` : `Muat ${slotName(slot)}?\nProgres yang belum disimpan akan diganti.`);
    this.menu = new MenuList(this, { x: 76, y: 56, width: 136, rowHeight: 22, items: [{ id: 'cancel', label: 'Batal' }, { id: 'yes', label: this.mode === 'save' ? 'Ya, timpa' : 'Ya, muat' }],
      onConfirm: item => { this.confirmation = null; if (item.id === 'yes') this.perform(slot); else this.render(slot); } });
  }
  private perform(slot: SaveSlot): void {
    const services = getServices(this);
    if (this.mode === 'save') { const result = services.checkpoints.save(slot); this.message.setText(result.ok ? `${slotName(slot)} tersimpan.` : services.checkpoints.lastMessage); this.render(slot); return; }
    const result = services.saves.read(slot);
    if (result.status !== 'ok') { this.message.setText('Data tidak dapat dimuat.'); this.render(slot); return; }
    services.gameState.load(result.data); services.checkpoints.reset(); this.closing = true;
    this.scene.stop(SCENE_KEYS.Pause); this.scene.stop(SCENE_KEYS.World); this.scene.stop(SCENE_KEYS.Hud);
    services.router.goto(this, SCENE_KEYS.World);
  }
}
