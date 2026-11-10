import type Phaser from 'phaser';
import type { IntentEvent } from '../../game/core/InputManager';
import { COLORS } from '../../game/config/palette';
import type { BattleEngine, Command } from '../../game/combat/BattleEngine';
import { MenuList, type MenuItem } from './MenuList';
import { makeText } from '../styles/theme';
import type { RewardReceipt } from '../../game/rpg/progression';

/** All battle UI layout/text lives here; combat rules remain in BattleEngine. Coordinates: 320x180. */
export class BattlePanel {
  private readonly enemy: Phaser.GameObjects.Text;
  private readonly hp: Phaser.GameObjects.Text;
  private readonly mp: Phaser.GameObjects.Text;
  private readonly turn: Phaser.GameObjects.Text;
  private readonly message: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private menu?: MenuList;
  mode: 'main' | 'skill' | 'item' | 'result' | 'busy' = 'main';
  constructor(private readonly scene: Phaser.Scene, private readonly onAction: (action: Command | 'continue' | 'retry' | 'title') => void) {
    scene.add.rectangle(6, 5, 308, 27, COLORS.ink).setOrigin(0).setStrokeStyle(1, COLORS.plumLine).setDepth(20);
    scene.add.rectangle(6, 131, 308, 48, COLORS.deepPlum).setOrigin(0).setStrokeStyle(1, COLORS.bitterLime).setDepth(20);
    const text = (x: number, y: number, value: string, color: number = COLORS.paper) => makeText(scene, x, y, value, { color }).setDepth(21);
    text(12, 8, 'Hollowling'); text(230, 8, 'Yaric');
    this.enemy = text(12, 21, ''); this.hp = text(180, 21, ''); this.mp = text(252, 21, '');
    this.turn = text(140, 8, '', COLORS.bitterLime);
    this.message = makeText(scene, 112, 135, '', { wrapWidth: 192, lineSpacing: 1 }).setDepth(21);
    this.hint = makeText(scene, 112, 170, '', { size: 6, color: COLORS.paperDim }).setDepth(21);
    this.say('Pilih Serang untuk menyerang musuh.');
  }
  say(text: string): void { this.message.setText(text); }
  refresh(engine: BattleEngine): void {
    const s = engine.snapshot(), p = s.actors.find(a => a.side === 'player')!, e = s.actors.find(a => a.side === 'enemy')!;
    this.hp.setText(`HP ${p.hp}/${p.stats.HP}`); this.mp.setText(`MP${p.mp}/${p.stats.MP}`);
    this.enemy.setText(`HP ${e.hp}/${e.stats.HP}`);
    this.turn.setText(s.outcome ? '' : engine.current.side === 'player' ? 'ANDA' : 'MUSUH');
  }
  show(engine: BattleEngine, mode: 'main' | 'skill' | 'item' = 'main'): void {
    this.mode = mode;
    this.refresh(engine);
    const count = engine.snapshot().items.potion ?? 0;
    const choices: { id: string; label: string; command?: Command }[] = mode === 'skill'
      ? [{ id: 'ground_slam', label: 'Ground Slam', command: 'ground_slam' }, { id: 'back', label: 'Kembali' }]
      : mode === 'item'
        ? [{ id: 'potion', label: `Potion x${count}`, command: 'potion' }, { id: 'back', label: 'Kembali' }]
        : [{ id: 'attack', label: 'Serang', command: 'attack' }, { id: 'skill', label: 'Jurus' }, { id: 'item', label: 'Barang' }, { id: 'defend', label: 'Bertahan', command: 'defend' }, { id: 'run', label: 'Kabur', command: 'run' }];
    const items = choices.map(c => ({ ...c, disabled: !!(c.command && engine.unavailable(c.command)), disabledHint: c.command ? engine.unavailable(c.command) ?? undefined : undefined }));
    const describe = (item: MenuItem): void => {
      const descriptions: Record<string, string> = {
        attack: 'Tebasan greatsword ke Hollowling.', skill: 'Gunakan jurus dengan MP.', item: 'Gunakan Potion bila HP berkurang.',
        defend: 'Kurangi kerusakan separuh hingga giliran berikutnya.', run: 'Mencoba meninggalkan pertarungan.',
        ground_slam: '4 MP. Hantaman tanah, kerusakan fisik lebih besar.', potion: 'Pulihkan hingga 36 HP Yaric.', back: 'Kembali ke perintah.',
      };
      this.say(item.disabledHint ?? descriptions[item.id] ?? '');
    };
    this.makeMenu(items, item => {
      if (item.id === 'skill' || item.id === 'item') { this.show(engine, item.id); return; }
      if (item.id === 'back') { this.show(engine); return; }
      this.onAction(item.id as Command);
    }, describe);
    if (mode !== 'main') describe(this.menu!.focusedItem);
    this.hint.setText('Panah:pilih Enter:aksi Esc:jeda');
  }
  handle(event: IntentEvent, engine: BattleEngine): void {
    if (event.intent === 'back' && (this.mode === 'skill' || this.mode === 'item')) { this.show(engine); return; }
    this.menu?.handleIntent({ ...event, intent: event.intent === 'left' ? 'up' : event.intent === 'right' ? 'down' : event.intent });
  }
  busy(): void { this.mode = 'busy'; this.menu?.destroy(); this.menu = undefined; this.hint.setText('Tunggu sampai aksi selesai.'); }
  result(victory: boolean, reward?: RewardReceipt | null): void {
    this.mode = 'result';
    this.say(victory ? 'MENANG\nHollowling dikalahkan.' : 'KALAH\nCoba lagi dari sebelum pertarungan.');
    if (victory && reward) this.say(`MENANG  +${reward.exp} EXP\n+${reward.gold} emas  Lv ${reward.beforeLevel} > ${reward.afterLevel}\n+${reward.skillPoints} poin jurus`);
    this.hint.setText(victory ? 'Enter: lanjutkan eksplorasi' : 'Item dan MP kembali ke checkpoint.');
    this.makeMenu([
      { id: victory ? 'continue' : 'retry', label: victory ? 'Lanjutkan' : 'Coba Lagi' },
      { id: 'title', label: 'Ke Judul' },
    ], item => this.onAction(item.id as 'continue' | 'retry' | 'title'));
  }
  private makeMenu(items: MenuItem[], confirm: (item: MenuItem) => void, focus?: (item: MenuItem) => void): void {
    this.menu?.destroy();
    this.menu = new MenuList(this.scene, { x: 58, y: 132, width: 96, rowHeight: 9, depth: 22, items, onConfirm: confirm, onFocusChange: focus, onDisabledConfirm: item => this.say(item.disabledHint ?? '') });
  }
}
