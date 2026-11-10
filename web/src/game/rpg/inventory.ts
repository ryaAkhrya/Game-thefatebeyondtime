import { ITEMS, MAX_ITEMS } from './definitions';

export interface Vitals { hp: number; mp: number }
export function changeItem(items: Readonly<Record<string, number>>, id: string, amount: number): Record<string, number> | null {
  if (!Object.hasOwn(ITEMS, id) || !Number.isInteger(amount) || amount === 0) return null;
  const current = items[id] ?? 0;
  if (!Number.isInteger(current) || current < 0 || current > MAX_ITEMS) return null;
  const count = current + amount;
  if (!Number.isInteger(count) || count < 0 || count > MAX_ITEMS) return null;
  return { ...items, [id]: count };
}
export function itemUseReason(items: Readonly<Record<string, number>>, id: string, vitals: Vitals, maxHP: number): string | null {
  const item = Object.hasOwn(ITEMS, id) ? ITEMS[id] : undefined;
  if (!item) return 'Barang tidak dikenal.';
  if ((items[id] ?? 0) < 1) return `${item.name} sudah habis.`;
  if (item.kind === 'equipment') return 'Atur barang ini di Perlengkapan.';
  if (item.kind === 'key') return 'Barang penting tidak dapat dipakai sembarangan.';
  if (vitals.hp <= 0) return 'Tidak dapat dipakai saat karakter tumbang.';
  if (vitals.hp >= maxHP) return 'HP masih penuh. Potion tidak dipakai.';
  return null;
}
/** Shared by World inventory AND BattleEngine: one item definition, one stock/effect rule. */
export function useConsumable(items: Readonly<Record<string, number>>, id: string, vitals: Vitals, maxHP: number): { items: Record<string, number>; vitals: Vitals; healed: number } | null {
  if (itemUseReason(items, id, vitals, maxHP)) return null;
  const next = changeItem(items, id, -1);
  if (!next) return null;
  const healed = Math.min(ITEMS[id]!.healHP ?? 0, maxHP - vitals.hp);
  if (healed <= 0) return null;
  return { items: next, vitals: { hp: vitals.hp + healed, mp: vitals.mp }, healed };
}
