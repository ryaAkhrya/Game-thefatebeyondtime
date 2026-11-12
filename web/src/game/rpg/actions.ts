import type { GameStateData } from '../systems/GameState';
import { ITEMS, MAX_GOLD, MAX_ITEMS, SKILLS, type EquipmentSlot } from './definitions';
import { effectiveStats } from './progression';
import { useConsumable } from './inventory';
import { memberVitals, setMemberVitals } from './vitals';

export type RpgResult = { ok: true; data: GameStateData; message: string } | { ok: false; message: string };
const fail = (message: string): RpgResult => ({ ok: false, message });
export function useItem(data: GameStateData, id: string, characterId = 'C01'): RpgResult {
  if (!data.party.includes(characterId as GameStateData['party'][number])) return fail('Anggota tidak aktif.');
  const stats = effectiveStats(data, characterId);
  const vitals = memberVitals(data, characterId);
  const effect = useConsumable(data.items, id, vitals ?? { hp: stats.HP, mp: stats.MP }, stats.HP);
  if (!effect) return fail('Barang tidak dapat dipakai saat ini.');
  const next = structuredClone(data); next.items = effect.items;
  setMemberVitals(next, characterId, effect.vitals);
  return { ok: true, data: next, message: `Pulih ${effect.healed} HP. Potion terpakai 1.` };
}
export function equippedCount(data: GameStateData, id: string): number {
  return Object.values(data.rpg.characters).reduce((n, c) => n + Object.values(c.equipment).filter(item => item === id).length, 0);
}
export function equip(data: GameStateData, slot: EquipmentSlot, id: string | null, characterId = 'C01'): RpgResult {
  const c = data.rpg.characters[characterId];
  if (!c || !['weapon', 'armor'].includes(slot)) return fail('Slot tidak sesuai.');
  if (id !== null) {
    const item = ITEMS[id];
    if (!item || item.kind !== 'equipment' || item.slot !== slot || !item.classes?.includes(c.classId)) return fail('Perlengkapan tidak cocok untuk kelas ini.');
    const reserved = equippedCount(data, id) - (c.equipment[slot] === id ? 1 : 0);
    if ((data.items[id] ?? 0) <= reserved) return fail('Perlengkapan tidak tersedia.');
  }
  const next = structuredClone(data); next.rpg.characters[characterId]!.equipment[slot] = id;
  const stats = effectiveStats(next, characterId);
  const vitals = memberVitals(next, characterId);
  if (vitals) { vitals.hp = Math.min(vitals.hp, stats.HP); vitals.mp = Math.min(vitals.mp, stats.MP); }
  return { ok: true, data: next, message: id ? `${ITEMS[id]!.name} dipasang.` : 'Perlengkapan dilepas. Tampilan tetap.' };
}
export function skillUnlockReason(data: GameStateData, id: string, characterId = 'C01'): string | null {
  const c = data.rpg.characters[characterId], skill = SKILLS.find(s => s.id === id);
  if (!c || !skill || c.classId !== skill.classId) return 'Jurus tidak cocok untuk kelas ini.';
  if (c.unlockedSkills.includes(id)) return 'Sudah terbuka.';
  if (c.level < skill.level) return `Perlu level ${skill.level}.`;
  if (skill.prerequisite && !c.unlockedSkills.includes(skill.prerequisite)) return 'Buka jurus sebelumnya dulu.';
  if (c.skillPoints < skill.cost) return `Perlu ${skill.cost} poin jurus.`;
  return null;
}
export function unlockSkill(data: GameStateData, id: string, characterId = 'C01'): RpgResult {
  const reason = skillUnlockReason(data, id, characterId); if (reason) return fail(reason);
  const next = structuredClone(data), c = next.rpg.characters[characterId]!, skill = SKILLS.find(s => s.id === id)!;
  c.skillPoints -= skill.cost; c.unlockedSkills.push(id);
  return { ok: true, data: next, message: `${skill.name} dibuka.` };
}
export interface Shop { id: string; name: string; stock: Record<string, number> }
export type ShopResult = { ok: true; data: GameStateData; shop: Shop; message: string } | { ok: false; message: string };
/** No mutation before all checks succeed: failed buy/sell rolls back by construction. */
export function trade(data: GameStateData, shop: Shop, mode: 'buy' | 'sell', id: string, quantity = 1): ShopResult {
  const item = Object.hasOwn(ITEMS, id) ? ITEMS[id] : undefined, stock = shop.stock[id] ?? 0, owned = data.items[id] ?? 0;
  if (!item || !['buy', 'sell'].includes(mode) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99 || !Number.isSafeInteger(owned) || owned < 0 || owned > MAX_ITEMS || !Number.isSafeInteger(stock) || stock < 0 || stock > MAX_ITEMS || !Number.isSafeInteger(data.rpg.gold) || data.rpg.gold < 0 || data.rpg.gold > MAX_GOLD) return { ok: false, message: 'Transaksi tidak valid.' };
  const value = (mode === 'buy' ? item.buy : item.sell) * quantity;
  if (mode === 'buy') {
    if (item.buy <= 0 || item.kind === 'key') return { ok: false, message: 'Barang tidak dijual.' };
    if (stock < quantity) return { ok: false, message: 'Stok toko tidak cukup.' };
    if (data.rpg.gold < value) return { ok: false, message: 'Emas tidak cukup.' };
    if (owned + quantity > MAX_ITEMS) return { ok: false, message: 'Tas sudah penuh.' };
  } else {
    if (!item.sellable || item.kind === 'key') return { ok: false, message: 'Barang ini tidak boleh dijual.' };
    if (owned - equippedCount(data, id) < quantity) return { ok: false, message: 'Barang habis atau masih dipakai.' };
    if (data.rpg.gold + value > MAX_GOLD || stock + quantity > MAX_ITEMS) return { ok: false, message: 'Batas penyimpanan tercapai.' };
  }
  const next = structuredClone(data), nextShop = structuredClone(shop), sign = mode === 'buy' ? 1 : -1;
  next.items[id] = owned + sign * quantity; next.rpg.gold -= sign * value; nextShop.stock[id] = stock - sign * quantity;
  return { ok: true, data: next, shop: nextShop, message: `${mode === 'buy' ? 'Membeli' : 'Menjual'} ${quantity} ${item.name}.` };
}
