import Phaser from 'phaser';
import { MenuList } from '../../ui/components/MenuList';
import { configureUiCamera, makeText } from '../../ui/styles/theme';
import { COLORS } from '../config/palette';
import { SCENE_KEYS, type SceneKey } from '../data/ids';
import { ITEMS } from '../rpg/definitions';
import { trade, type Shop } from '../rpg/actions';
import { getServices } from '../systems/Services';

/** Reusable shop overlay. Only a QA harness invokes it in Phase 3; no merchant enters the story. */
export class ShopScene extends Phaser.Scene {
  private shop!: Shop;
  private returnTo: SceneKey = SCENE_KEYS.Title;
  private mode: 'buy' | 'sell' = 'buy';
  private menu?: MenuList;
  private detail!: Phaser.GameObjects.Text;
  private heading!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;
  private releaseInput?: () => void;
  constructor() { super(SCENE_KEYS.Shop); }
  init(data: { shop: Shop; returnTo: SceneKey }): void { this.shop = structuredClone(data.shop); this.returnTo = data.returnTo; this.mode = 'buy'; this.menu = undefined; }
  create(): void {
    configureUiCamera(this);
    this.add.rectangle(0, 0, 320, 180, COLORS.ink).setOrigin(0);
    this.add.rectangle(6, 5, 308, 170, COLORS.deepPlum).setOrigin(0).setStrokeStyle(1, COLORS.bitterLime);
    this.heading = makeText(this, 14, 12, '', { color: COLORS.bitterLime });
    makeText(this, 14, 28, 'Kiri/Kanan: Beli/Jual  Enter: transaksi 1', { size: 6, color: COLORS.paperDim });
    this.detail = makeText(this, 156, 45, '', { wrapWidth: 150, lineSpacing: 2 });
    this.message = makeText(this, 14, 146, '', { wrapWidth: 290, lineSpacing: 1, color: COLORS.bitterLime });
    makeText(this, 14, 167, 'Esc: kembali', { size: 6, color: COLORS.paperDim });
    this.render();
    const services = getServices(this);
    this.releaseInput = services.input.pushLayer('shop', e => {
      if (e.intent === 'back') services.router.closeOverlay(this, this.returnTo);
      else if (e.intent === 'left' || e.intent === 'right') { this.mode = this.mode === 'buy' ? 'sell' : 'buy'; this.render(); }
      else this.menu?.handleIntent(e);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.releaseInput?.());
  }
  private render(focusId?: string): void {
    this.menu?.destroy(); const state = getServices(this).gameState.snapshot()!;
    this.heading.setText(`${this.mode === 'buy' ? 'BELI' : 'JUAL'}  /  Emas ${state.rpg.gold}`);
    const ids = this.mode === 'buy' ? Object.keys(this.shop.stock) : Object.keys(state.items).filter(id => state.items[id]! > 0);
    const items = ids.map(id => { const preview = trade(state, this.shop, this.mode, id); return { id, label: ITEMS[id]!.name, disabled: !preview.ok, disabledHint: preview.ok ? undefined : preview.message }; });
    if (!items.length) items.push({ id: 'empty', label: 'Kosong', disabled: true, disabledHint: 'Tidak ada barang.' });
    const describe = (id: string): void => {
      const item = ITEMS[id];
      this.detail.setText(item ? `${item.description}\n\nHarga: ${this.mode === 'buy' ? item.buy : item.sell} emas\nStok: ${this.shop.stock[id] ?? 0}\nDi tas: ${state.items[id] ?? 0}` : 'Tidak ada barang.');
    };
    this.menu = new MenuList(this, { x: 76, y: 43, width: 136, rowHeight: 18, items, onFocusChange: item => describe(item.id), onDisabledConfirm: item => this.message.setText(item.disabledHint ?? ''),
      onConfirm: item => {
        const services = getServices(this), result = trade(services.gameState.snapshot()!, this.shop, this.mode, item.id);
        if (result.ok) { services.gameState.load(result.data); this.shop = result.shop; }
        this.message.setText(result.message); this.render(item.id);
      } });
    if (focusId) this.menu.focusId(focusId); describe(this.menu.focusedItem.id);
  }
  debugState(): unknown { return structuredClone(this.shop); }
}
