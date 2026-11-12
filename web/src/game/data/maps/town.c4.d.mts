import type { WalkableShape } from './forest1.map.mjs';

export type C4Facing = 'up' | 'down' | 'left' | 'right';
export interface C4Item {
  f: string; x: number; y: number; atlas?: 'c4' | 'crisis' | 'ave'; d?: number; flip?: boolean; id?: string;
  sol?: [number, number, number, number]; sols?: [number, number, number, number][]; anim?: 'dust' | 'cookfire'; seed?: number;
}
export interface C4Spot { x: number; y: number; facing: C4Facing }
export interface C4Resident extends C4Spot { id: string; variant: string }
export interface C4Object { id: string; kind: 'sign' | 'chest' | 'object' | 'npc'; verb: string; x: number; y: number; w: number; h: number }
export const C4_ATLAS: string;
export const C4_HIDE_AVE: { f: string; x: number; y: number }[];
export const C4_CRISIS_ATLAS: string;
export const C4_AVE_ATLAS: string;
export const C4_SPAWN: C4Spot;
export const C4_WALKABLE: WalkableShape[];
export const C4_ITEMS: C4Item[];
export const C4_EXTRA_SOLIDS: { id: string; x: number; y: number; w: number; h: number }[];
export function c4Solids(): { x: number; y: number; w: number; h: number }[];
export const C4_NAMED: Record<'talric' | 'azie' | 'velthia' | 'derrria', C4Spot>;
export const C4_RESIDENTS: C4Resident[];
export const C4_GATE_GUARD: Omit<C4Resident, "id">;
export const C4_OBJECTS: C4Object[];
export const C4_FOCUS: Record<'ruin' | 'camp' | 'gate', [number, number]>;
