import Phaser from 'phaser';
import { MenuList, type MenuItem } from '../../ui/components/MenuList';
import { configureUiCamera, makeText } from '../../ui/styles/theme';
import { COLORS } from '../config/palette';
import { SCENE_KEYS, type SceneKey } from '../data/ids';
import { equip, unlockSkill, useItem } from '../rpg/actions';
import { ITEMS, PROFILES, SKILLS, type EquipmentSlot } from '../rpg/definitions';
import { itemUseReason } from '../rpg/inventory';
import { effectiveStats, STAT_KEYS } from '../rpg/progression';
import { getServices } from '../systems/Services';

export type RpgMenuKind = 'status' | 'inventory' | 'equipment' | 'skills';
const TITLES: Record<RpgMenuKind, string> = { status: 'STATUS', inventory: 'INVENTARIS', equipment: 'PERLENGKAPAN', skills: 'JURUS' };
/** Shared classic menu layout; definitions, eligibility and all mutations stay in pure RPG modules. */
export class RpgMenuScene extends Phaser.Scene {
  private kind: RpgMenuKind = 'status';
  private returnTo: SceneKey = SCENE_KEYS.Pause;
  private menu?: MenuList;
  private detail!: Phaser.GameObjects.Text;
  private summary!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;
  private statusTexts: Phaser.GameObjects.Text[] = [];
  private releaseInput?: () => void;
  private characterId: 'C01' | 'C03' = 'C01';
  constructor() { super(SCENE_KEYS.RpgMenu); }
  init(data: { kind?: RpgMenuKind; returnTo?: SceneKey }): void { this.kind = data.kind ?? 'status'; this.returnTo = data.returnTo ?? SCENE_KEYS.Pause; this.menu = undefined; this.statusTexts = []; this.characterId = 'C01'; }
  create(): void {
    configureUiCamera(this);
    this.add.rectangle(0, 0, 320, 180, COLORS.ink).setOrigin(0);
    this.add.rectangle(6, 5, 308, 170, COLORS.deepPlum).setOrigin(0).setStrokeStyle(1, COLORS.bitterLime);
    makeText(this, 14, 12, TITLES[this.kind], { color: COLORS.bitterLime });
    this.summary = makeText(this, 14, 28, '');
    this.detail = makeText(this, 156, 45, '', { wrapWidth: 150, lineSpacing: 3 });
    this.message = makeText(this, 14, 146, '', { wrapWidth: 290, lineSpacing: 1, color: COLORS.bitterLime });
    makeText(this, 14, 167, 'Panah: pilih  Enter: pilih  Esc: kembali', { size: 6, color: COLORS.paperDim });
    this.render();
    const services = getServices(this);
    this.releaseInput = services.input.pushLayer('rpg-menu', e => {
      if (e.intent === 'back') services.router.closeOverlay(this, this.returnTo);
      else if ((e.intent === 'left' || e.intent === 'right') && services.gameState.snapshot()?.party.includes('C03')) {
        this.characterId = this.characterId === 'C01' ? 'C03' : 'C01'; this.render();
      }
      else this.menu?.handleIntent({ ...e, intent: e.intent === 'left' ? 'up' : e.intent === 'right' ? 'down' : e.intent });
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.releaseInput?.());
  }
  private render(focusId?: string): void {
    this.menu?.destroy(); this.statusTexts.forEach(t => t.destroy()); this.statusTexts = [];
    const state = getServices(this).gameState.snapshot()!, c = state.rpg.characters[this.characterId]!, stats = effectiveStats(state, this.characterId);
    const vitals = this.characterId === 'C03' ? state.partyVitals!.C03 : state.vitals;
    this.summary.setText(`${this.characterId === 'C03' ? 'Torvan' : 'Yaric'}  Lv ${c.level}   Emas ${state.rpg.gold}${state.party.includes('C03') ? '  < >' : ''}`);
    let items: MenuItem[];
    if (this.kind === 'status') {
      this.detail.setText(`EXP ${c.exp}/${PROFILES[this.characterId]!.thresholds[c.level] ?? 'MAX'}\n\nPoin jurus: ${c.skillPoints}\n\nKelas: ${c.classId}`);
      STAT_KEYS.forEach((key, index) => this.statusTexts.push(makeText(this, 18, 45 + index * 12, `${key} ${key === 'HP' ? `${vitals.hp}/` : key === 'MP' ? `${vitals.mp}/` : ''}${stats[key]}`)));
      this.menu = new MenuList(this, { x: 74, y: 132, width: 116, rowHeight: 12, items: [{ id: 'back', label: 'Kembali' }], onConfirm: () => getServices(this).router.closeOverlay(this, this.returnTo) }); return;
    }
    if (this.kind === 'inventory') {
      items = Object.entries(state.items).filter(([, n]) => n > 0).map(([id, n]) => ({ id, label: `${ITEMS[id]!.name} x${n}`, disabled: !!itemUseReason(state.items, id, vitals, stats.HP), disabledHint: itemUseReason(state.items, id, vitals, stats.HP) ?? undefined }));
    } else if (this.kind === 'equipment') {
      items = [];
      for (const slot of ['weapon', 'armor'] as const) {
        items.push({ id: `${slot}:none`, label: slot === 'weapon' ? 'Lepas senjata' : 'Lepas baju' });
        for (const [id, n] of Object.entries(state.items)) if (n > 0 && ITEMS[id]?.slot === slot) items.push({ id: `${slot}:${id}`, label: ITEMS[id]!.name, disabled: !equip(state, slot, id, this.characterId).ok, disabledHint: 'Tidak cocok untuk kelas ini.' });
      }
    } else {
      items = SKILLS.filter(skill => skill.classId === c.classId).map(skill => ({ id: skill.id, label: skill.name, disabled: c.unlockedSkills.includes(skill.id) || c.level < skill.level || c.skillPoints < skill.cost, disabledHint: c.unlockedSkills.includes(skill.id) ? 'Sudah terbuka.' : `Perlu level ${skill.level} dan ${skill.cost} poin.` }));
    }
    if (!items.length) items = [{ id: 'empty', label: 'Kosong', disabled: true, disabledHint: 'Belum ada barang.' }];
    const describe = (item: MenuItem): void => {
      if (this.kind === 'inventory') this.detail.setText(`${ITEMS[item.id]?.description ?? 'Tas kosong.'}\n\n${item.disabledHint ?? 'Enter: gunakan 1.'}\n\nHP ${vitals.hp}/${stats.HP}`);
      else if (this.kind === 'skills') {
        const skill = SKILLS.find(s => s.id === item.id)!;
        this.detail.setText(`${c.unlockedSkills.includes(item.id) ? 'TERBUKA' : 'TERKUNCI'}\n${skill.description}\n\nPoin: ${c.skillPoints}`);
      } else {
        const [slot, value] = item.id.split(':') as [EquipmentSlot, string];
        const preview = equip(state, slot, value === 'none' ? null : value, this.characterId);
        const next = preview.ok ? effectiveStats(preview.data, this.characterId) : stats;
        this.detail.setText(`${slot === 'weapon' ? 'SENJATA' : 'PELINDUNG'}\n${value === 'none' ? 'Kosongkan slot.' : ITEMS[value]!.name}\n${c.equipment[slot] === (value === 'none' ? null : value) ? 'Saat ini.' : 'Perbandingan:'}\nATK ${stats.ATK} > ${next.ATK}\nDEF ${stats.DEF} > ${next.DEF}\nMAG ${stats.MAG} > ${next.MAG}\n\nTampilan tetap.`);
      }
    };
    this.menu = new MenuList(this, { x: 76, y: 43, width: 136, rowHeight: 18, items,
      onFocusChange: describe, onDisabledConfirm: item => this.message.setText(item.disabledHint ?? 'Tidak tersedia.'),
      onConfirm: item => {
        const services = getServices(this), current = services.gameState.snapshot()!;
        const [slot, value] = item.id.split(':') as [EquipmentSlot, string];
        const result = this.kind === 'inventory' ? useItem(current, item.id, this.characterId) : this.kind === 'skills' ? unlockSkill(current, item.id, this.characterId) : equip(current, slot, value === 'none' ? null : value, this.characterId);
        this.message.setText(services.gameState.apply(result)); this.render(item.id);
      } });
    if (focusId) this.menu.focusId(focusId);
    describe(this.menu.focusedItem);
  }
}
