import Phaser from 'phaser';
import { MenuList, type MenuItem } from '../../ui/components/MenuList';
import { bar, menuWindow, veil, windowHint, type WindowSpec } from '../../ui/components/frame';
import { TYPE, Ui, bindRelayout } from '../../ui/kit/ui';
import { nameKnownIn, partyName } from '../../ui/labels';
import { COLORS } from '../config/palette';
import { SCENE_KEYS, type SceneKey } from '../data/ids';
import { equip, unlockSkill, useItem } from '../rpg/actions';
import { ITEMS, PROFILES, SKILLS, type EquipmentSlot } from '../rpg/definitions';
import { itemUseReason } from '../rpg/inventory';
import { effectiveStats, STAT_KEYS } from '../rpg/progression';
import { getServices } from '../systems/Services';

export type RpgMenuKind = 'status' | 'inventory' | 'equipment' | 'skills';
const TITLES: Record<RpgMenuKind, string> = { status: 'Status', inventory: 'Inventaris', equipment: 'Perlengkapan', skills: 'Jurus' };
const CLASS_LABEL: Record<string, string> = { swordsman: 'Pendekar Pedang', mage: 'Penyihir', royal_mage: 'Penyihir Kerajaan' };
const STAT_LABEL: Record<string, string> = { HP: 'HP', MP: 'MP', ATK: 'Serangan', DEF: 'Pertahanan', MAG: 'Sihir', MDEF: 'Tahan Sihir', SPD: 'Kecepatan' };
const WIN_W = 768;

/**
 * Layar menu RPG bersama (Status / Inventaris / Perlengkapan / Jurus). Daftar ringkas di kiri, rincian kontekstual di
 * kanan. Definisi, kelayakan, dan semua mutasi tetap di modul RPG murni; scene ini hanya menyajikan.
 */
export class RpgMenuScene extends Phaser.Scene {
  private ui!: Ui;
  private kind: RpgMenuKind = 'status';
  private returnTo: SceneKey = SCENE_KEYS.Pause;
  private menu?: MenuList;
  private messageText = '';
  private message?: Phaser.GameObjects.Text;
  private detailObjs: Phaser.GameObjects.GameObject[] = [];
  private releaseInput?: () => void;
  private characterId: 'C01' | 'C03' = 'C01';
  private focusId?: string;

  constructor() { super(SCENE_KEYS.RpgMenu); }

  init(data: { kind?: RpgMenuKind; returnTo?: SceneKey }): void {
    this.kind = data.kind ?? 'status';
    this.returnTo = data.returnTo ?? SCENE_KEYS.Pause;
    this.menu = undefined; this.detailObjs = []; this.characterId = 'C01'; this.messageText = ''; this.focusId = undefined;
  }

  create(): void {
    this.ui = new Ui(this);
    this.render();
    this.ui.fadeIn();
    bindRelayout(this, () => { this.focusId = this.menu?.focusedItem.id; this.render(this.focusId); });
    const services = getServices(this);
    this.releaseInput = services.input.pushLayer('rpg-menu', e => {
      if (e.intent === 'back') services.router.closeOverlay(this, this.returnTo);
      else if ((e.intent === 'left' || e.intent === 'right') && services.gameState.snapshot()?.party.includes('C03')) {
        this.characterId = this.characterId === 'C01' ? 'C03' : 'C01'; this.messageText = ''; this.focusId = undefined; this.redraw();
      } else this.menu?.handleIntent({ ...e, intent: e.intent === 'left' ? 'up' : e.intent === 'right' ? 'down' : e.intent });
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.releaseInput?.());
  }

  private redraw(focusId?: string): void {
    this.menu?.destroy();
    this.children.removeAll(true);
    this.render(focusId);
  }

  private detail(o: Phaser.GameObjects.GameObject): void { this.detailObjs.push(o); }
  private clearDetail(): void { this.detailObjs.forEach(o => o.destroy()); this.detailObjs = []; }

  private render(focusId?: string): void {
    const ui = this.ui;
    this.detailObjs = [];
    const services = getServices(this);
    const state = services.gameState.snapshot()!;
    const known = nameKnownIn(state);
    const c = state.rpg.characters[this.characterId]!;
    const stats = effectiveStats(state, this.characterId);
    const vitals = this.characterId === 'C03' ? state.partyVitals!.C03 : state.vitals;
    const duo = state.party.includes('C03');
    const who = partyName(this.characterId, known);
    veil(ui, 0.97);
    const WIN: WindowSpec = this.windowFor(state);
    this.win = WIN;
    const body = menuWindow(ui, { ...WIN, title: TITLES[this.kind], aside: `${duo ? '◂  ' : ''}${who}   Lv ${c.level}   ·   ${state.rpg.gold} emas${duo ? '  ▸' : ''}` });
    const top = body.bodyY + 2;
    this.message = ui.text(body.bodyX, WIN.y + WIN.h - 56, this.messageText, { size: TYPE.small, color: COLORS.bitterLime, depth: 3, width: body.bodyW });
    windowHint(ui, WIN, `Esc  kembali${duo ? '     ←  →  ganti anggota' : ''}`);

    if (this.kind === 'status') { this.renderStatus(body, top, stats, vitals, c, who); return; }

    let items: MenuItem[];
    if (this.kind === 'inventory') {
      items = Object.entries(state.items).filter(([, n]) => n > 0).map(([id, n]) => ({
        id, label: ITEMS[id]!.name, right: `×${n}`, tone: ITEMS[id]!.kind === 'consumable' ? COLORS.bitterLime : ITEMS[id]!.kind === 'equipment' ? COLORS.rose : COLORS.plumMist,
        soft: ITEMS[id]!.kind !== 'consumable', disabled: !!itemUseReason(state.items, id, vitals, stats.HP), disabledHint: itemUseReason(state.items, id, vitals, stats.HP) ?? undefined,
      }));
    } else if (this.kind === 'equipment') {
      items = [];
      for (const slot of ['weapon', 'armor'] as const) {
        items.push({ id: `${slot}:none`, label: slot === 'weapon' ? 'Lepas senjata' : 'Lepas pelindung', tone: slot === 'weapon' ? COLORS.rose : COLORS.mp, right: c.equipment[slot] === null ? 'kosong' : '' });
        for (const [id, n] of Object.entries(state.items)) if (n > 0 && ITEMS[id]?.slot === slot) {
          items.push({ id: `${slot}:${id}`, label: ITEMS[id]!.name, tone: slot === 'weapon' ? COLORS.rose : COLORS.mp, right: c.equipment[slot] === id ? 'dipakai' : '',
            disabled: !equip(state, slot, id, this.characterId).ok, disabledHint: 'Tidak cocok untuk kelas ini.' });
        }
      }
    } else {
      items = SKILLS.filter(skill => skill.classId === c.classId).map(skill => ({
        id: skill.id, label: skill.name, right: c.unlockedSkills.includes(skill.id) ? 'terbuka' : skill.cost ? `${skill.cost} poin` : '',
        tone: c.unlockedSkills.includes(skill.id) ? COLORS.bitterLime : COLORS.plumMist,
        disabled: c.unlockedSkills.includes(skill.id) || c.level < skill.level || c.skillPoints < skill.cost,
        disabledHint: c.unlockedSkills.includes(skill.id) ? 'Sudah terbuka.' : `Perlu level ${skill.level} dan ${skill.cost} poin.`,
      }));
    }
    if (!items.length) items = [{ id: 'empty', label: 'Kosong', disabled: true, disabledHint: 'Belum ada barang.' }];

    const detailX = body.bodyX + 322;
    const detailW = body.bodyW - 322;
    const describe = (item: MenuItem): void => {
      this.clearDetail();
      const t = (x: number, y: number, v: string, o: Parameters<Ui['text']>[3] = {}): void => { this.detail(ui.text(x, y, v, { depth: 3, ...o })); };
      if (this.kind === 'inventory') {
        const def = ITEMS[item.id];
        if (!def) { t(detailX, top, 'Tas kosong.', { color: COLORS.paperDim }); return; }
        t(detailX, top, def.name, { family: 'display', weight: '700', size: TYPE.heading + 3 });
        const descObj = ui.text(detailX, top + 38, def.description, { width: detailW, size: TYPE.body + 0.5, leading: 7, depth: 3 }); this.detail(descObj);
        let y = top + 38 + descObj.height / ui.s + 22;
        if (def.kind === 'consumable') {
          t(detailX, y, who, { size: TYPE.small, color: COLORS.paperDim });
          t(detailX + detailW, y, `HP  ${vitals.hp} / ${stats.HP}`, { size: TYPE.small, originX: 1, weight: '600' });
          y += 20;
          bar(ui, detailX, y, detailW, 6, vitals.hp / stats.HP, COLORS.bitterLime, 3).forEach(o => this.detail(o));
          y += 22;
          if (!item.disabled) t(detailX, y, 'Enter  gunakan satu', { size: TYPE.small, color: COLORS.bitterLime });
        } else if (def.kind === 'equipment') {
          for (const [k, v] of Object.entries(def.bonus ?? {})) { t(detailX, y, STAT_LABEL[k] ?? k, { color: COLORS.paperDim }); t(detailX + 140, y, `+${v}`, { weight: '600' }); y += 24; }
        }
      } else if (this.kind === 'skills') {
        const skill = SKILLS.find(s => s.id === item.id)!;
        const open = c.unlockedSkills.includes(item.id);
        t(detailX, top, skill.name, { family: 'display', weight: '700', size: TYPE.heading + 3 });
        t(detailX, top + 34, open ? 'TERBUKA' : 'TERKUNCI', { family: 'display', weight: '600', size: TYPE.small, color: open ? COLORS.bitterLime : COLORS.warn });
        t(detailX, top + 66, skill.description, { width: detailW, size: TYPE.body + 0.5, leading: 7 });
        t(detailX, top + 176, `Poin jurus tersisa  ${c.skillPoints}`, { size: TYPE.small, color: COLORS.paperDim });
      } else {
        const [slot, value] = item.id.split(':') as [EquipmentSlot, string];
        const preview = equip(state, slot, value === 'none' ? null : value, this.characterId);
        const next = preview.ok ? effectiveStats(preview.data, this.characterId) : stats;
        const now = c.equipment[slot];
        t(detailX, top, slot === 'weapon' ? 'SENJATA' : 'PELINDUNG', { family: 'display', weight: '600', size: TYPE.small, color: COLORS.paperDim });
        t(detailX, top + 22, value === 'none' ? 'Kosongkan slot' : ITEMS[value]!.name, { family: 'display', weight: '700', size: TYPE.heading + 3 });
        t(detailX, top + 64, `Terpasang sekarang: ${now ? ITEMS[now]!.name : 'kosong'}`, { size: TYPE.small, color: COLORS.paperDim });
        let y = top + 100;
        for (const k of ['ATK', 'DEF', 'MAG'] as const) {
          const diff = next[k] - stats[k];
          t(detailX, y, STAT_LABEL[k]!, { color: COLORS.paperDim });
          t(detailX + 150, y, `${stats[k]}`, { weight: '600' });
          t(detailX + 190, y, '→', { color: COLORS.plumMist });
          t(detailX + 220, y, `${next[k]}`, { weight: '600', color: diff > 0 ? COLORS.bitterLime : diff < 0 ? COLORS.danger : COLORS.paper });
          y += 28;
        }
        t(detailX, y + 8, 'Tampilan karakter tidak berubah.', { size: TYPE.small, color: COLORS.paperDim });
      }
    };
    this.menu = new MenuList(this, { ui, x: body.bodyX, y: top, width: 298, rowHeight: 36, maxRows: 9, depth: 4, size: TYPE.body + 0.5, items, initialId: focusId,
      onFocusChange: describe, onDisabledConfirm: item => this.setMessage(item.disabledHint ?? 'Tidak tersedia.'),
      onConfirm: item => {
        const current = services.gameState.snapshot()!;
        const [slot, value] = item.id.split(':') as [EquipmentSlot, string];
        const result = this.kind === 'inventory' ? useItem(current, item.id, this.characterId) : this.kind === 'skills' ? unlockSkill(current, item.id, this.characterId) : equip(current, slot, value === 'none' ? null : value, this.characterId);
        this.messageText = services.gameState.apply(result);
        this.redraw(item.id);
      } });
    describe(this.menu.focusedItem);
  }

  private win: WindowSpec = { x: 96, y: 40, w: WIN_W, h: 460, title: '' };
  /** Jendela sebesar kebutuhan isi: daftar pendek tidak memakai seluruh layar. */
  private windowFor(state: { items: Record<string, number> }): WindowSpec {
    const rows = this.kind === 'inventory' ? Object.values(state.items).filter(n => n > 0).length : 9;
    const h = this.kind === 'status' ? 440 : Math.max(360, Math.min(460, 190 + Math.max(rows, 4) * 38));
    return { x: (960 - WIN_W) / 2, y: Math.round((540 - h) / 2), w: WIN_W, h, title: '' };
  }

  private setMessage(text: string): void {
    this.messageText = text;
    this.message?.setText(text);
  }

  private renderStatus(body: { bodyX: number; bodyW: number }, top: number, stats: ReturnType<typeof effectiveStats>, vitals: { hp: number; mp: number }, c: { level: number; exp: number; classId: string; skillPoints: number; equipment: Record<EquipmentSlot, string | null> }, who: string): void {
    const ui = this.ui;
    const key = `${this.characterId}_NEUTRAL`;
    if (this.textures.exists(key)) {
      const src = this.textures.get(key).getSourceImage() as HTMLImageElement;
      const h = 262;
      this.add.image(ui.u(body.bodyX + 130), ui.u(top + 12 + h), key).setOrigin(0.5, 1).setScale(ui.u(h) / src.height).setDepth(3);
    }
    const x = body.bodyX + 300;
    const w = body.bodyW - 300;
    ui.text(x, top, who, { family: 'display', weight: '700', size: TYPE.display - 4, depth: 3 });
    ui.text(x, top + 36, CLASS_LABEL[c.classId] ?? c.classId, { size: TYPE.small, color: COLORS.paperDim, depth: 3 });
    let y = top + 70;
    const row = (label: string, value: string, ratio?: number, color: number = COLORS.bitterLime): void => {
      ui.text(x, y, label, { color: COLORS.paperDim, depth: 3 });
      ui.text(x + w, y, value, { originX: 1, weight: '600', depth: 3 });
      if (ratio !== undefined) bar(ui, x, y + 24, w, 5, ratio, color, 3);
      y += ratio !== undefined ? 40 : 26;
    };
    row('HP', `${vitals.hp} / ${stats.HP}`, vitals.hp / stats.HP);
    row('MP', `${vitals.mp} / ${stats.MP}`, vitals.mp / stats.MP, COLORS.mp);
    for (const k of STAT_KEYS) if (k !== 'HP' && k !== 'MP') row(STAT_LABEL[k]!, `${stats[k]}`);
    y += 8;
    const next = PROFILES[this.characterId]!.thresholds[c.level];
    row('EXP', next ? `${c.exp} / ${next}` : `${c.exp}  (maks)`, next ? c.exp / next : 1, COLORS.rose);
    ui.text(x, y, `Poin jurus  ${c.skillPoints}`, { size: TYPE.small, color: COLORS.paperDim, depth: 3 });
    this.menu = new MenuList(this, { ui, x: body.bodyX, y: this.win.y + this.win.h - 104, width: 180, rowHeight: 34, depth: 4, size: TYPE.body, items: [{ id: 'back', label: 'Kembali' }],
      onConfirm: () => getServices(this).router.closeOverlay(this, this.returnTo) });
  }
}
