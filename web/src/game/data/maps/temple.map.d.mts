import type { ForestMap, MapProp, WalkableShape } from './forest1.map.mjs';

export interface TempleRect { x: number; y: number; w: number; h: number }
export interface TemplePoint { x: number; y: number; facing: 'up' | 'down' | 'left' | 'right' }
export const TEMPLE_W: number;
export const TEMPLE_H: number;
export const TEMPLE_ROOMS: Readonly<Record<'hall' | 'gate' | 'ante' | 'camp' | 'corr' | 'court' | 'wdoor' | 'wchamber' | 'edoor' | 'echamber' | 'approach', TempleRect>>;
export const TEMPLE_WALKABLE: WalkableShape[];
export const TEMPLE_GATE_SOLID: { id: string; x: number; y: number; w: number; h: number; dynamic: true };
export const TEMPLE_FOOT: Readonly<Record<string, readonly [number, number]>>;
export const TEMPLE_DECALS: readonly string[];
export const TEMPLE_OVERHEAD: readonly string[];
export const TEMPLE_SPAWN: TemplePoint;
export const TEMPLE_FROM_FOREST: TemplePoint;
export const TEMPLE_BATTLE_RETURN: Readonly<Record<'temple_oathguard' | 'temple_mixed' | 'chronolith', TemplePoint>>;
export const TEMPLE_PROPS: MapProp[];
export const TEMPLE_PATROLS: Readonly<Record<'temple_oathguard' | 'temple_mixed', readonly string[]>>;
export function templeFootRect(type: string, x: number, y: number): TempleRect | null;
export const TEMPLE_SOLIDS: TempleRect[];
export const TEMPLE_INTERACTABLES: { id: string; kind: 'sign' | 'chest' | 'object' | 'npc'; verb: string; x: number; y: number; w: number; h: number }[];
export const TEMPLE_TRIGGERS: { id: string; x: number; y: number; w: number; h: number }[];
export const TEMPLE_LAYOUT: Readonly<Record<'floorCircle' | 'lampSource' | 'beamTarget' | 'hallCenter', { x: number; y: number }>>;
export function buildTempleMap(): ForestMap;
