import Phaser from 'phaser';
import { MenuList, type MenuItem } from '../../ui/components/MenuList';
import { uiSfx } from '../../ui/kit/sfx';
import { menuWindow, veil, windowHint, type WindowSpec } from '../../ui/components/frame';
import { TYPE, Ui, bindRelayout } from '../../ui/kit/ui';
import { COLORS } from '../config/palette';
import { SCENE_KEYS, type SceneKey } from '../data/ids';
import { ITEMS } from '../rpg/definitions';
import { trade, type Shop } from '../rpg/actions';
import { getServices } from '../systems/Services';
import { tradeWithDerrria } from '../rpg/derrria';

const WIN: WindowSpec = { x: 120, y: 56, w: 720, h: 428, title: '' };

/** Overlay toko. Daftar barang + harga di kiri, rincian dan stok di kanan. */
export class ShopScene extends Phaser.Scene {
  private ui!: Ui;
  private shop!: Shop;
  private returnTo: SceneKey = SCENE_KEYS.Title;
  private mode: 'buy' | 'sell' = 'buy';
  private menu?: MenuList;
  private messageText = '';
  private message?: Phaser.GameObjects.Text;
  private detailObjs: Phaser.GameObjects.GameObject[] = [];
  private releaseInput?: () => void;

  constructor() { super(SCENE_KEYS.Shop); }

  init(data: { shop: Shop; returnTo: SceneKey }): void {
    this.shop = structuredClone(data.shop); this.returnTo = data.returnTo; this.mode = 'buy'; this.menu = undefined; this.messageText = '';
  }

  create(): void {
    this.ui = new Ui(this);
    this.render();
    this.ui.fadeIn();
    bindRelayout(this, () => this.render(this.menu?.focusedItem.id));
    const services = getServices(this);
    this.releaseInput = services.input.pushLayer('shop', e => {
      if (e.intent === 'back') { uiSfx(this, 'SFX_UI_CANCEL'); services.router.closeOverlay(this, this.returnTo); }
      else if (e.intent === 'left' || e.intent === 'right') { uiSfx(this, 'SFX_UI_SELECT_ITEM'); this.mode = this.mode === 'buy' ? 'sell' : 'buy'; this.messageText = ''; this.redraw(); }
      else this.menu?.handleIntent(e);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.releaseInput?.());
  }

  private redraw(focusId?: string): void {
    this.menu?.destroy();
    this.children.removeAll(true);
    this.render(focusId);
  }

  private render(focusId?: string): void {
    const ui = this.ui;
    this.detailObjs = [];
    const state = getServices(this).gameState.snapshot()!;
    veil(ui, 0.97);
    const body = menuWindow(ui, { ...WIN, title: this.shop.name || 'Toko', aside: `${this.mode === 'buy' ? '[ Beli ]    Jual' : 'Beli    [ Jual ]'}      ${state.rpg.gold} emas` });
    this.message = ui.text(body.bodyX, WIN.y + WIN.h - 58, this.messageText, { size: TYPE.small, color: COLORS.bitterLime, depth: 3, width: body.bodyW });
    windowHint(ui, WIN, '←  →  Beli / Jual        Enter  transaksi satu barang        Esc  kembali');
    const ids = this.mode === 'buy' ? Object.keys(this.shop.stock) : Object.keys(state.items).filter(id => state.items[id]! > 0);
    const items: MenuItem[] = ids.map(id => {
      const preview = trade(state, this.shop, this.mode, id);
      const def = ITEMS[id]!;
      return { id, label: def.name, right: `${this.mode === 'buy' ? def.buy : def.sell} emas`, disabled: !preview.ok, disabledHint: preview.ok ? undefined : preview.message,
        tone: def.kind === 'consumable' ? COLORS.bitterLime : def.kind === 'equipment' ? COLORS.rose : COLORS.plumMist };
    });
    if (!items.length) items.push({ id: 'empty', label: 'Kosong', disabled: true, disabledHint: 'Tidak ada barang.' });
    const dx = body.bodyX + 332;
    const describe = (id: string): void => {
      this.detailObjs.forEach(o => o.destroy()); this.detailObjs = [];
      const item = ITEMS[id];
      const t = (x: number, y: number, v: string, o: Parameters<Ui['text']>[3] = {}): void => { this.detailObjs.push(ui.text(x, y, v, { depth: 3, ...o })); };
      if (!item) { t(dx, body.bodyY + 4, 'Tidak ada barang.', { color: COLORS.paperDim }); return; }
      t(dx, body.bodyY + 4, item.name, { family: 'display', weight: '700', size: TYPE.heading + 3 });
      t(dx, body.bodyY + 42, item.description, { width: body.bodyW - 332, size: TYPE.body + 0.5, leading: 7 });
      const y = body.bodyY + 160;
      t(dx, y, 'Harga', { color: COLORS.paperDim }); t(dx + 150, y, `${this.mode === 'buy' ? item.buy : item.sell} emas`, { weight: '600' });
      t(dx, y + 26, 'Stok toko', { color: COLORS.paperDim }); t(dx + 150, y + 26, `${this.shop.stock[id] ?? 0}`, { weight: '600' });
      t(dx, y + 52, 'Di tas', { color: COLORS.paperDim }); t(dx + 150, y + 52, `${state.items[id] ?? 0}`, { weight: '600' });
    };
    this.menu = new MenuList(this, { ui, x: body.bodyX, y: body.bodyY + 4, width: 308, rowHeight: 38, maxRows: 8, depth: 4, size: TYPE.body + 0.5, items, initialId: focusId, sfx: { confirm: false },
      onFocusChange: item => describe(item.id),
      onDisabledConfirm: item => { this.messageText = item.disabledHint ?? ''; this.message?.setText(this.messageText); },
      onConfirm: item => {
        const services = getServices(this);
        const snap = services.gameState.snapshot()!;
        const result = this.shop.id === 'derrria' ? tradeWithDerrria(snap, this.mode, item.id) : trade(snap, this.shop, this.mode, item.id);
        if (result.ok) { services.gameState.load(result.data); this.shop = result.shop; if (this.shop.id === 'derrria') services.checkpoints.requestAutosave(); }
        uiSfx(this, !result.ok ? 'SFX_UI_CANCEL' : this.mode === 'buy' ? 'SFX_UI_SHOP_BUY' : 'SFX_UI_SHOP_SELL');
        this.messageText = result.message;
        this.redraw(item.id);
      } });
    describe(this.menu.focusedItem.id);
  }

  debugState(): unknown { return structuredClone(this.shop); }
}
