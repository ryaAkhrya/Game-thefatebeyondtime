import Phaser from 'phaser';
import { continueIntoEnding } from '../ending/progress';
import { MenuList } from '../../ui/components/MenuList';
import { uiSfx } from '../../ui/kit/sfx';
import { bar, menuWindow, veil, windowHint, type WindowSpec } from '../../ui/components/frame';
import { TYPE, Ui, bindRelayout } from '../../ui/kit/ui';
import { AREA_LABEL, BEAT_LABEL, chapterLabel, formatPlaytime, partyName } from '../../ui/labels';
import { COLORS } from '../config/palette';
import { SCENE_KEYS, type SceneKey } from '../data/ids';
import { effectiveStats } from '../rpg/progression';
import { memberVitals } from '../rpg/vitals';
import { isNameKnown } from '../story/identity';
import { SAVE_SLOTS, type SaveReadResult, type SaveSlot } from '../systems/SaveRepository';
import { getServices } from '../systems/Services';

const slotName = (slot: SaveSlot): string => slot === 'auto' ? 'Otomatis' : `Slot ${slot.at(-1)}`;
const WIN: WindowSpec = { x: 140, y: 52, w: 680, h: 436, title: 'Simpan / Muat' };

export class SaveLoadScene extends Phaser.Scene {
  private ui!: Ui;
  private returnTo: SceneKey = SCENE_KEYS.Pause;
  private mode: 'save' | 'load' = 'save';
  private confirmation: SaveSlot | null = null;
  private menu?: MenuList;
  private messageText = '';
  private message?: Phaser.GameObjects.Text;
  private detailObjs: Phaser.GameObjects.GameObject[] = [];
  private releaseInput?: () => void;
  private closing = false;
  private focusId?: string;

  constructor() { super(SCENE_KEYS.SaveLoad); }

  init(data: { returnTo?: SceneKey }): void {
    this.returnTo = data.returnTo ?? SCENE_KEYS.Pause; this.mode = 'save'; this.confirmation = null; this.menu = undefined;
    this.closing = false; this.messageText = ''; this.focusId = undefined;
  }

  create(): void {
    this.ui = new Ui(this);
    this.render();
    this.ui.fadeIn();
    bindRelayout(this, () => { this.focusId = this.menu?.focusedItem.id; this.render(this.focusId); });
    const services = getServices(this);
    this.releaseInput = services.input.pushLayer('save-load', event => {
      if (this.closing) return;
      if (event.intent === 'back') { uiSfx(this, 'SFX_UI_CANCEL'); if (this.confirmation) { this.confirmation = null; this.redraw(); } else services.router.closeOverlay(this, this.returnTo); }
      else if (!this.confirmation && (event.intent === 'left' || event.intent === 'right')) { uiSfx(this, 'SFX_UI_SELECT_ITEM'); this.mode = this.mode === 'save' ? 'load' : 'save'; this.messageText = ''; this.redraw(this.menu?.focusedItem.id); }
      else this.menu?.handleIntent(event);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.releaseInput?.());
  }

  private redraw(focusId?: string): void {
    this.menu?.destroy();
    this.children.removeAll(true);
    this.render(focusId);
  }

  private put(o: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[]): void {
    this.detailObjs.push(...(Array.isArray(o) ? o : [o]));
  }
  private clearDetail(): void { this.detailObjs.forEach(o => o.destroy()); this.detailObjs = []; }

  private describe(slot: SaveSlot, result: SaveReadResult, x: number, y: number, w: number): void {
    const ui = this.ui;
    this.clearDetail();
    const t = (px: number, py: number, v: string, o: Parameters<Ui['text']>[3] = {}): void => { this.put(ui.text(px, py, v, { depth: 3, ...o })); };
    if (result.status !== 'ok') {
      const reasons = { empty: 'Slot kosong.', corrupt: 'Data rusak. Pilih slot lain atau timpa dengan konfirmasi.', unsupported_version: 'Versi belum didukung. Slot lama dilindungi.', storage_unavailable: 'Penyimpanan browser tidak tersedia.' };
      t(x, y, slotName(slot), { family: 'display', weight: '700', size: TYPE.heading + 2 });
      t(x, y + 38, reasons[result.status], { color: COLORS.paperDim, width: w });
      return;
    }
    const d = result.data;
    const known = isNameKnown(d.flags);
    const local = new Date(result.savedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    t(x, y, slotName(slot), { family: 'display', weight: '700', size: TYPE.heading + 2 });
    t(x, y + 34, `${chapterLabel(d.chapter)}  ·  ${AREA_LABEL[d.area] ?? d.area}`, { weight: '600', color: COLORS.bitterLime });
    t(x, y + 58, BEAT_LABEL[d.storyBeat] ?? '', { color: COLORS.paperDim });
    let py = y + 100;
    const member = (id: 'C01' | 'C02' | 'C03', hp: number, mp: number): void => {
      const c = d.rpg.characters[id]!;
      t(x, py, partyName(id, known), { weight: '600' });
      t(x + w, py, `Lv ${c.level}`, { originX: 1, color: COLORS.paperDim });
      const max = effectiveStats(d, id);
      this.put(bar(ui, x, py + 26, w * 0.48 - 6, 4, hp / Math.max(1, max.HP), COLORS.bitterLime));
      t(x, py + 34, `HP ${hp}`, { size: TYPE.tiny, color: COLORS.paperDim });
      this.put(bar(ui, x + w * 0.52, py + 26, w * 0.48, 4, mp / Math.max(1, max.MP), COLORS.mp));
      t(x + w * 0.52, py + 34, `MP ${mp}`, { size: TYPE.tiny, color: COLORS.paperDim });
      py += 66;
    };
    member('C01', d.vitals.hp, d.vitals.mp);
    for (const id of d.party) if (id !== 'C01') { const v = memberVitals(d, id); if (v) member(id as 'C02' | 'C03', v.hp, v.mp); } // anggota aktif sesuai party
    t(x, py + 6, `${local} WIB   ·   ${formatPlaytime(d.playtimeSec)}`, { size: TYPE.small, color: COLORS.paperDim });
    if (result.recovered || result.migrated) t(x, py + 28, result.recovered ? 'Dari cadangan.' : 'Data lama terbaca.', { size: TYPE.small, color: COLORS.warn });
  }

  private render(focusId?: string): void {
    const ui = this.ui;
    this.detailObjs = [];
    const { saves, checkpoints } = getServices(this);
    veil(ui, 0.97);
    const body = menuWindow(ui, { ...WIN, aside: this.mode === 'save' ? '[ Simpan ]    Muat' : 'Simpan    [ Muat ]' });
    this.message = ui.text(body.bodyX, WIN.y + WIN.h - 58, this.messageText, { size: TYPE.small, color: COLORS.bitterLime, depth: 3, width: body.bodyW });
    windowHint(ui, WIN, '←  →  ganti Simpan / Muat        Esc  kembali        Data tersimpan di browser ini');
    const rows = SAVE_SLOTS.map(slot => {
      const result = saves.read(slot);
      const disabled = this.mode === 'save' ? slot === 'auto' || !checkpoints.isSafe || result.status === 'unsupported_version' || result.status === 'storage_unavailable' : result.status !== 'ok';
      return { id: slot, label: slotName(slot), right: result.status === 'ok' ? `Lv ${result.data.rpg.characters.C01!.level}` : result.status === 'empty' ? 'Kosong' : result.status === 'corrupt' ? 'Rusak' : 'Blokir', disabled,
        disabledHint: this.mode === 'save' && slot === 'auto' ? 'Slot ini khusus simpan otomatis.' : this.mode === 'save' && !checkpoints.isSafe ? 'Belum aman menyimpan sekarang.' : 'Slot belum dapat digunakan.' };
    });
    const dx = body.bodyX + 280;
    const dw = body.bodyW - 280;
    if (this.confirmation) {
      const slot = this.confirmation;
      ui.text(dx, body.bodyY + 4, this.mode === 'save' ? `Timpa ${slotName(slot)}?` : `Muat ${slotName(slot)}?`, { family: 'display', weight: '700', size: TYPE.heading + 2, depth: 3 });
      ui.text(dx, body.bodyY + 42, this.mode === 'save' ? 'Data sebelumnya menjadi cadangan jika valid.' : 'Progres yang belum disimpan akan diganti.', { color: COLORS.paperDim, width: dw, depth: 3 });
      this.menu = new MenuList(this, { ui, x: body.bodyX, y: body.bodyY + 4, width: 256, rowHeight: 40, depth: 4, size: TYPE.body + 0.5,
        items: [{ id: 'cancel', label: 'Batal' }, { id: 'yes', label: this.mode === 'save' ? 'Ya, timpa' : 'Ya, muat' }],
        sfx: { confirm: false },
        onConfirm: item => { if (item.id !== 'yes') uiSfx(this, 'SFX_UI_CANCEL'); this.confirmation = null; if (item.id === 'yes') this.perform(slot); else this.redraw(slot); } });
      return;
    }
    this.menu = new MenuList(this, { ui, x: body.bodyX, y: body.bodyY + 4, width: 256, rowHeight: 48, depth: 4, size: TYPE.body + 1, items: rows, initialId: focusId, sfx: { confirm: false },
      onFocusChange: item => this.describe(item.id as SaveSlot, saves.read(item.id as SaveSlot), dx, body.bodyY + 4, dw),
      onDisabledConfirm: item => { this.messageText = item.disabledHint ?? ''; this.message?.setText(this.messageText); },
      onConfirm: item => {
        const slot = item.id as SaveSlot;
        if (this.mode === 'load' || saves.read(slot).status !== 'empty') { uiSfx(this, 'SFX_UI_CONFIRM'); this.askConfirm(slot); }
        else this.perform(slot);
      } });
    const f = this.menu.focusedItem.id as SaveSlot;
    this.describe(f, saves.read(f), dx, body.bodyY + 4, dw);
  }

  private askConfirm(slot: SaveSlot): void {
    this.confirmation = slot;
    this.redraw();
  }

  private perform(slot: SaveSlot): void {
    const services = getServices(this);
    if (this.mode === 'save') { const result = services.checkpoints.save(slot); uiSfx(this, result.ok ? 'SFX_UI_SAVE_OK' : 'SFX_UI_SAVE_FAIL'); this.messageText = result.ok ? `${slotName(slot)} tersimpan.` : services.checkpoints.lastMessage; this.redraw(slot); return; }
    const result = services.saves.read(slot);
    if (result.status !== 'ok') { uiSfx(this, 'SFX_UI_SAVE_FAIL'); this.messageText = 'Data tidak dapat dimuat.'; this.redraw(slot); return; }
    uiSfx(this, 'SFX_UI_SAVE_OK');
    services.gameState.load(result.data); services.checkpoints.reset(); this.closing = true;
    this.scene.stop(SCENE_KEYS.Pause); this.scene.stop(SCENE_KEYS.World); this.scene.stop(SCENE_KEYS.Hud);
    this.scene.stop(SCENE_KEYS.SliceEnd); this.scene.stop(SCENE_KEYS.Ending);
    services.router.goto(this, continueIntoEnding(result.data) ? SCENE_KEYS.Ending : SCENE_KEYS.World);
  }
}
