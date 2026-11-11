import type { GameStateData } from '../systems/GameState';
import { trade, type Shop, type ShopResult } from './actions';
import { CITY_FLAG } from '../story/aveloriaFlags';

/** ASSUMPTION DRAFT stock/pricing uses existing item prices. No free grant or restock on reload. */
export function derrriaShop(data: GameStateData): Shop {
  return { id: 'derrria', name: 'Kios Derrria', stock: structuredClone(data.world.shops?.derrria ?? { potion: 5, travel_coat: 1 }) };
}
/** Inventory, gold and stock commit in the same validated snapshot. Preview remains pure. */
export function tradeWithDerrria(data: GameStateData, mode: 'buy' | 'sell', id: string): ShopResult {
  if (data.area !== 'aveloria' || !data.flags[CITY_FLAG.gate]) return { ok: false, message: 'Kios belum dapat dikunjungi.' };
  const result = trade(data, derrriaShop(data), mode, id);
  if (result.ok) result.data.world.shops = { ...result.data.world.shops, derrria: structuredClone(result.shop.stock) };
  return result;
}
