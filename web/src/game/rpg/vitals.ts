import type { GameStateData } from '../systems/GameState';
import type { Vitals } from './inventory';

/** HP/MP per anggota: Yaric di `vitals`, anggota lain (C03 Torvan, C02 Velthia) di `partyVitals`. Cadangan tetap tersimpan. */
export function memberVitals(data: Pick<GameStateData, 'vitals' | 'partyVitals'>, id: string): Vitals | undefined {
  return id === 'C01' ? data.vitals : (data.partyVitals as Record<string, Vitals> | undefined)?.[id];
}
/** Mutasi in-place pada salinan data (pemanggil bertanggung jawab atas structuredClone). Tidak membuat C03 baru. */
export function setMemberVitals(data: GameStateData, id: string, vitals: Vitals): void {
  if (id === 'C01') { data.vitals = { hp: vitals.hp, mp: vitals.mp }; return; }
  if (!data.partyVitals) return;
  (data.partyVitals as Record<string, Vitals>)[id] = { hp: vitals.hp, mp: vitals.mp };
}
