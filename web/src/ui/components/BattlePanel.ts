import type Phaser from 'phaser';
import type { IntentEvent } from '../../game/core/InputManager';
import { COLORS } from '../../game/config/palette';
import type { BattleActor, BattleEngine, Command } from '../../game/combat/BattleEngine';
import { MenuList, type MenuItem } from './MenuList';
import { bar } from './frame';
import { TYPE, Ui } from '../kit/ui';
import type { RewardReceipt } from '../../game/rpg/progression';
import { UNKNOWN_LABEL } from '../../game/story/identity';

export const BATTLE_BAND = { y: 388, h: 152 } as const;
const STATUS_LABEL: Record<string, string> = { poison: 'Racun', stun: 'Pingsan', atk_up: 'Serang+', def_up: 'Tahan+' };
const DEPTH = 20;
type PanelMode = 'main' | 'skill' | 'item' | 'target' | 'result' | 'busy';

/**
 * Seluruh UI battle. Aturan combat tetap di BattleEngine. Komposisi: kartu musuh kecil di kiri atas, lencana giliran/bahaya
 * di tengah atas, dan satu pita bawah yang tipis (perintah | pesan | kartu party) sehingga panggung tetap didominasi
 * karakter dan animasi. Koordinat = satuan desain 960x540 pada resolusi perangkat.
 */
export class BattlePanel {
  private readonly ui: Ui;
  private objs: Phaser.GameObjects.GameObject[] = [];
  private menu?: MenuList;
  private message = '';
  private messageText?: Phaser.GameObjects.Text;
  private hintText = '';
  private hintObj?: Phaser.GameObjects.Text;
  private sourceMode: 'main' | 'skill' | 'item' = 'main';
  private engineRef?: BattleEngine;
  private resultState: { outcome: 'victory' | 'defeat' | 'escaped'; reward?: RewardReceipt | null } | null = null;
  private duo = false;
  mode: PanelMode = 'main';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onAction: (action: Command | 'continue' | 'retry' | 'title', targetId?: string) => void,
    private readonly enemyName = 'Hollowling',
    private readonly onTarget: (id: string | null) => void = () => undefined,
    private readonly hintOnFirstBattle = true,
  ) {
    this.ui = new Ui(scene);
    this.message = 'Pilih Serang untuk menyerang musuh.';
    if (this.hintOnFirstBattle) this.hintText = '↑ ↓ pilih  ·  Enter aksi  ·  Esc jeda';
    this.build();
  }

  /** Membangun ulang seluruh tampilan dari state tersimpan (dipanggil juga saat kanvas berubah ukuran). */
  relayout(): void {
    this.objs = [];
    this.menu = undefined;
    this.build();
    const engine = this.engineRef;
    if (!engine) return;
    if (this.mode === 'result' && this.resultState) { this.result(this.resultState.outcome, this.resultState.reward); return; }
    if (this.mode === 'busy') { this.refresh(engine); this.busy(); return; }
    this.show(engine, this.sourceMode === 'main' || this.mode === 'main' ? 'main' : this.sourceMode);
  }

  private build(): void {
    const ui = this.ui;
    const y0 = BATTLE_BAND.y;
    this.objs.push(
      ui.rect(0, y0, ui.dw, BATTLE_BAND.h + 2, COLORS.night, 0.9, DEPTH),
      ui.rect(0, y0, ui.dw, ui.hair / ui.s, COLORS.plumLine, 1, DEPTH + 1),
    );
    // gradasi gelap tipis di atas agar kartu musuh/lencana terbaca di atas pepohonan
    this.objs.push(ui.gradient(0, 0, ui.dw, 110, [[0, 'rgba(18,13,25,0.66)'], [1, 'rgba(18,13,25,0)']], DEPTH));
    this.messageText = ui.text(276, y0 + 16, this.message, { size: TYPE.body + 0.5, width: 332, depth: DEPTH + 2, leading: 6 });
    this.hintObj = ui.text(276, y0 + BATTLE_BAND.h - 28, this.hintText, { size: TYPE.tiny, color: COLORS.paperDim, depth: DEPTH + 2 });
    this.objs.push(this.messageText, this.hintObj);
  }

  say(text: string): void {
    this.message = text;
    this.messageText?.setText(text);
  }

  private hint(text: string): void {
    this.hintText = text;
    this.hintObj?.setText(text);
  }

  private dynamic: Phaser.GameObjects.GameObject[] = [];
  private clearDynamic(): void { this.dynamic.forEach(o => o.destroy()); this.dynamic = []; }

  private name(a: BattleActor): string {
    return a.id === 'C01' && a.name !== 'Yaric' ? UNKNOWN_LABEL : a.name;
  }

  /** Kartu musuh (kiri atas), kartu party (pita kanan), lencana giliran/bahaya (tengah atas). */
  refresh(engine: BattleEngine): void {
    this.engineRef = engine;
    const ui = this.ui;
    this.clearDynamic();
    const put = <T extends Phaser.GameObjects.GameObject>(o: T): T => { this.dynamic.push(o); return o; };
    const s = engine.snapshot();
    const players = s.actors.filter(a => a.side === 'player');
    const enemies = s.actors.filter(a => a.side === 'enemy');
    this.duo = players.length > 1;
    const activeId = s.outcome ? '' : engine.current.id;

    // musuh
    enemies.forEach((e, i) => {
      const y = 28 + i * 54;
      const dead = e.hp <= 0;
      put(ui.text(40, y, e.name, { family: 'display', weight: '700', size: TYPE.heading - 1, depth: DEPTH + 2, color: dead ? COLORS.disabled : COLORS.paper }));
      const chips = [...e.statuses.map(st => `${STATUS_LABEL[st.id] ?? st.id} ${st.turns}`), ...(e.defending ? ['Bertahan'] : [])].join('  ');
      if (chips) put(ui.text(300, y + 3, chips, { size: TYPE.tiny, originX: 1, color: COLORS.warn, depth: DEPTH + 2 }));
      bar(ui, 40, y + 26, 260, 6, e.hp / e.stats.HP, e.hp / e.stats.HP < 0.3 ? COLORS.danger : COLORS.bitterLime, DEPTH + 2).forEach(o => put(o));
      put(ui.text(300, y + 33, `${e.hp} / ${e.stats.HP}`, { size: TYPE.tiny, originX: 1, color: COLORS.paperDim, depth: DEPTH + 2 }));
    });

    // lencana giliran + bahaya
    const e0 = enemies.find(e => e.hp > 0) ?? enemies[0]!;
    const danger = e0.intent === 'sweep' ? 'SAPUAN!' : e0.intent === 'knight_thrust' ? 'TUSUKAN!' : '';
    const calm = e0.intent === 'recover' ? 'GOYAH' : e0.intent === 'knight_recover' ? 'TERBUKA' : '';
    if (!s.outcome) {
      if (danger) {
        const w = 190;
        const x = ui.dw / 2 - w / 2;
        ui.panel(x, 24, w, 40, { fill: COLORS.night, alpha: 0.92, line: COLORS.danger, depth: DEPTH + 1 }).forEach(o => put(o));
        put(ui.text(ui.dw / 2, 44, danger, { family: 'display', weight: '700', size: TYPE.heading + 2, color: COLORS.danger, originX: 0.5, originY: 0.5, depth: DEPTH + 2 }));
      } else {
        const label = calm || (engine.current.side === 'player' ? 'GILIRAN ANDA' : 'GILIRAN MUSUH');
        put(ui.text(ui.dw / 2, 36, label, { family: 'display', weight: '600', size: TYPE.small + 0.5, color: calm ? COLORS.bitterLime : COLORS.paperDim, originX: 0.5, originY: 0.5, depth: DEPTH + 2 }));
        ui.motif(ui.dw / 2, 50, 70, 8, DEPTH + 2).forEach(o => put(o));
      }
    }

    // party
    const cardW = 276;
    const x0 = ui.dw - cardW - 40;
    players.forEach((a, i) => {
      const y = BATTLE_BAND.y + 12 + i * 70;
      const active = a.id === activeId;
      if (active) put(ui.rect(x0 - 10, y - 2, 3, 62, COLORS.bitterLime, 1, DEPTH + 2));
      put(ui.text(x0, y, this.name(a), { weight: '600', size: TYPE.body + 1, color: active ? COLORS.bitterLime : COLORS.paper, depth: DEPTH + 2 }));
      const chips = [...a.statuses.map(st => `${STATUS_LABEL[st.id] ?? st.id} ${st.turns}`), ...(a.defending ? ['Bertahan'] : [])].join('  ');
      if (chips) put(ui.text(x0 + cardW, y + 3, chips, { size: TYPE.tiny, originX: 1, color: COLORS.warn, depth: DEPTH + 2 }));
      const row = (label: string, v: number, max: number, color: number, ry: number): void => {
        put(ui.text(x0, ry, label, { size: TYPE.tiny, color: COLORS.paperDim, depth: DEPTH + 2 }));
        bar(ui, x0 + 26, ry + 6, 168, 5, v / Math.max(1, max), color, DEPTH + 2).forEach(o => put(o));
        put(ui.text(x0 + cardW, ry, `${v} / ${max}`, { size: TYPE.small, originX: 1, weight: '600', depth: DEPTH + 2 }));
      };
      row('HP', a.hp, a.stats.HP, a.hp / a.stats.HP < 0.3 ? COLORS.danger : COLORS.bitterLime, y + 24);
      row('MP', a.mp, a.stats.MP, COLORS.mp, y + 42);
    });
  }

  show(engine: BattleEngine, mode: 'main' | 'skill' | 'item' = 'main'): void {
    this.mode = mode;
    this.sourceMode = mode;
    this.onTarget(null);
    this.refresh(engine);
    const state = engine.snapshot(), count = state.items.potion ?? 0;
    const skills = engine.current.skills ?? [];
    const choices: { id: string; label: string; command?: Command; right?: string }[] = mode === 'skill'
      ? [...skills.filter(id => ['ground_slam', 'ranting_nakal', 'bukan_aku', 'tunas_bandel'].includes(id)).map(id => ({ id, label: ({ ground_slam: 'Ground Slam', ranting_nakal: 'Ranting Nakal', bukan_aku: 'Bukan Aku!', tunas_bandel: 'Tunas Bandel' } as Record<string, string>)[id]!, command: id as Command,
        right: `${({ ground_slam: 4, ranting_nakal: 3, bukan_aku: 2, tunas_bandel: 4 } as Record<string, number>)[id]} MP` })), { id: 'back', label: 'Kembali' }]
      : mode === 'item'
        ? [{ id: 'potion', label: 'Potion', command: 'potion', right: `×${count}` }, { id: 'back', label: 'Kembali' }]
        : [{ id: 'attack', label: 'Serang', command: 'attack' }, { id: 'skill', label: 'Jurus' }, { id: 'item', label: 'Barang' }, { id: 'defend', label: 'Bertahan', command: 'defend' }, { id: 'run', label: 'Kabur', command: 'run' }];
    const reason = (command: Command): string | null => {
      if (['potion', 'tunas_bandel', 'bukan_aku'].includes(command) && this.duo) {
        const allies = state.actors.filter(a => a.side === 'player' && a.hp > 0);
        if (allies.some(a => engine.unavailable(command, a.id) === null)) return null;
      }
      return engine.unavailable(command);
    };
    const items = choices.map(c => ({ ...c, disabled: !!(c.command && reason(c.command)), disabledHint: c.command ? reason(c.command) ?? undefined : undefined }));
    const describe = (item: MenuItem): void => {
      const descriptions: Record<string, string> = {
        attack: `Tebasan greatsword ke ${this.enemyName}.`, skill: 'Gunakan jurus dengan MP.', item: 'Gunakan Potion bila HP berkurang.',
        defend: 'Kurangi kerusakan separuh hingga giliran berikutnya.', run: 'Mencoba meninggalkan pertarungan.',
        ground_slam: '4 MP. Hantaman tanah, kerusakan fisik lebih besar.', potion: 'Pulihkan hingga 36 HP satu anggota.', back: 'Kembali ke perintah.',
        ranting_nakal: '3 MP. Sihir daun; dapat memutus kuda-kuda Veyrath.', bukan_aku: '2 MP. Lindungi satu anggota party.', tunas_bandel: '4 MP. Pulihkan 24 HP satu anggota.',
      };
      this.say(item.disabledHint ?? descriptions[item.id] ?? '');
    };
    this.makeMenu(items, item => {
      if (item.id === 'skill' || item.id === 'item') { this.show(engine, item.id); return; }
      if (item.id === 'back') { this.show(engine); return; }
      this.chooseTarget(engine, item.id as Command, mode);
    }, describe);
    if (mode !== 'main') describe(this.menu!.focusedItem);
  }

  handle(event: IntentEvent, engine: BattleEngine): void {
    if (event.intent === 'back' && this.mode === 'target') { this.show(engine, this.sourceMode); return; }
    if (event.intent === 'back' && (this.mode === 'skill' || this.mode === 'item')) { this.show(engine); return; }
    this.menu?.handleIntent({ ...event, intent: event.intent === 'left' ? 'up' : event.intent === 'right' ? 'down' : event.intent });
  }

  busy(): void {
    this.mode = 'busy'; this.menu?.destroy(); this.menu = undefined; this.onTarget(null);
    this.hint('');
  }

  result(outcome: 'victory' | 'defeat' | 'escaped', reward?: RewardReceipt | null): void {
    this.mode = 'result';
    this.resultState = { outcome, reward };
    this.onTarget(null);
    this.menu?.destroy();
    const ui = this.ui;
    this.clearResult();
    const w = 380, x = (ui.dw - w) / 2, y = 84;
    const title = outcome === 'victory' ? 'KEMENANGAN' : outcome === 'escaped' ? 'LOLOS' : 'KALAH';
    const sub = outcome === 'victory' ? `${this.enemyName} dikalahkan.` : outcome === 'escaped' ? 'Party kembali ke jalur hutan.' : 'Coba lagi dari sebelum pertarungan.';
    const lines: string[] = [];
    if (outcome === 'victory' && reward) {
      lines.push(`+${reward.exp} EXP${this.duo ? ' tiap anggota' : ''}`, `+${reward.gold} emas`);
      if (reward.items?.potion) lines.push(`+${reward.items.potion} Potion`);
      if (reward.afterLevel > reward.beforeLevel) lines.push(`Naik ke Lv ${reward.afterLevel}`);
      if (reward.skillPoints) lines.push(`+${reward.skillPoints} poin jurus`);
    }
    const h = 118 + lines.length * 24 + 92;
    this.result_ = [
      ...ui.panel(x, y, w, h, { fill: COLORS.deepPlum, alpha: 0.97, line: outcome === 'defeat' ? COLORS.danger : COLORS.plumLine, depth: DEPTH + 3 }),
      ui.text(ui.dw / 2, y + 26, title, { family: 'display', weight: '700', size: TYPE.display - 2, originX: 0.5, color: outcome === 'defeat' ? COLORS.danger : COLORS.bitterLime, depth: DEPTH + 4 }),
      ui.text(ui.dw / 2, y + 64, sub, { size: TYPE.body, originX: 0.5, color: COLORS.paperDim, depth: DEPTH + 4 }),
      ...ui.motif(ui.dw / 2, y + 96, 120, 10, DEPTH + 4),
      ...lines.map((l, i) => ui.text(ui.dw / 2, y + 112 + i * 24, l, { size: TYPE.body + 1, originX: 0.5, weight: '600', depth: DEPTH + 4 })),
    ];
    this.message = '';
    this.messageText?.setText('');
    this.hint(outcome !== 'defeat' ? '' : 'Item dan MP kembali ke checkpoint.');
    this.menu = new MenuList(this.scene, { ui, x: ui.dw / 2, y: y + h - 86, width: 240, rowHeight: 38, align: 'center', depth: DEPTH + 5, size: TYPE.body + 1,
      items: [{ id: outcome === 'defeat' ? 'retry' : 'continue', label: outcome === 'defeat' ? 'Coba Lagi' : 'Lanjutkan' }, { id: 'title', label: 'Ke Judul' }],
      onConfirm: item => this.onAction(item.id as 'continue' | 'retry' | 'title') });
  }
  private result_: Phaser.GameObjects.GameObject[] = [];
  private clearResult(): void { this.result_.forEach(o => o.destroy()); this.result_ = []; }
  /** Dipanggil saat retry: hapus kartu hasil. */
  dismissResult(): void { this.clearResult(); this.resultState = null; }

  private chooseTarget(engine: BattleEngine, command: Command, sourceMode: 'main' | 'skill' | 'item'): void {
    if (command === 'defend' || command === 'run') { this.onAction(command); return; }
    const ally = ['potion', 'bukan_aku', 'tunas_bandel'].includes(command);
    const candidates = engine.snapshot().actors.filter(a => a.side === (ally ? 'player' : 'enemy') && a.hp > 0);
    if (candidates.length === 1) { this.onAction(command, candidates[0]!.id); return; }
    this.mode = 'target'; this.sourceMode = sourceMode;
    const items: MenuItem[] = candidates.map(a => ({ id: a.id, label: this.name(a), right: `${a.hp}/${a.stats.HP}`, disabled: !!engine.unavailable(command, a.id), disabledHint: engine.unavailable(command, a.id) ?? undefined }));
    this.makeMenu(items, item => this.onAction(command, item.id), item => {
      const a = candidates.find(a => a.id === item.id)!;
      this.say(item.disabledHint ?? `Target ${this.name(a)}: HP ${a.hp}/${a.stats.HP}.`);
      this.onTarget(item.id);
    });
    this.onTarget(this.menu!.focusedItem.id);
    this.say(`Pilih target.`);
    this.hint('Enter pilih  ·  Esc kembali');
  }

  private makeMenu(items: MenuItem[], confirm: (item: MenuItem) => void, focus?: (item: MenuItem) => void): void {
    this.menu?.destroy();
    this.menu = new MenuList(this.scene, { ui: this.ui, x: 40, y: BATTLE_BAND.y + 10, width: 204, rowHeight: 27, depth: DEPTH + 2, size: TYPE.body, items, onConfirm: confirm, onFocusChange: focus,
      onDisabledConfirm: item => this.say(item.disabledHint ?? '') });
  }

  /** Selesai satu aksi pemain pertama: petunjuk kontrol tidak diulang. */
  clearControlHint(): void { if (this.hintText.startsWith('↑')) this.hint(''); }
}
