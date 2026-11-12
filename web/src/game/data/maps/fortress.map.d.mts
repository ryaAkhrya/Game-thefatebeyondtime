import type { ForestMap, MapProp, WalkableShape } from './forest1.map.mjs';

export interface FortressRect { x: number; y: number; w: number; h: number }
export interface FortressPoint { x: number; y: number; facing: 'up' | 'down' | 'left' | 'right' }
export type FortressRoomId =
  | 'approach' | 'outer' | 'gatehall' | 'bellhall' | 'bdoor' | 'barracks' | 'adoor' | 'archive' | 'tdoor' | 'trial' | 'sdoor' | 'rift'
  | 'serambi' | 'hdoor' | 'heart' | 'scdoor' | 'sc_v' | 'sc_land' | 'edoor' | 'echo';
export type FortressDynamicId = 'door_seal' | 'door_shortcut' | 'door_trial' | 'door_heart' | 'door_echo' | 'slab_1' | 'slab_2' | 'slab_3';
export type FortressEncounterId = 'fortress_riftborn' | 'fortress_gravorn' | 'fortress_guardpost' | 'fortress_rift' | 'fortress_aegis_trial' | 'varlgrim';
export type FortressTriggerId = 'fortress_court_fight' | 'fortress_hall_fight' | 'fortress_guardpost' | 'fortress_rift_fight' | 'heart_confront' | 'echo_enter';

export const FORTRESS_W: number;
export const FORTRESS_H: number;
export const FORTRESS_ROOMS: Readonly<Record<FortressRoomId, FortressRect>>;
export const FORTRESS_WALKABLE: WalkableShape[];
export const FORTRESS_DYNAMIC: Readonly<Record<FortressDynamicId, FortressRect & { id: FortressDynamicId }>>;
export const FORTRESS_INITIAL_DYNAMIC: readonly FortressDynamicId[];
export const FORTRESS_SLAB_Y: readonly [number, number, number];
export const FORTRESS_FOOT: Readonly<Record<string, readonly [number, number]>>;
export const FORTRESS_DECALS: readonly string[];
export const FORTRESS_OVERHEAD: readonly string[];
export const FORTRESS_SPAWN: FortressPoint;
export const FORTRESS_BATTLE_RETURN: Readonly<Record<Exclude<FortressEncounterId, never>, FortressPoint>>;
export const FORTRESS_STAGE: Readonly<Record<'varlgrim' | 'threshold' | 'varlgrimWall' | 'velthiaLock' | 'yaricLock' | 'vista' | 'checkpoint', { x: number; y: number }>>;
export const FORTRESS_PROPS: MapProp[];
export const FORTRESS_PATROLS: Readonly<Record<'fortress_riftborn' | 'fortress_gravorn' | 'fortress_guardpost' | 'fortress_rift' | 'fortress_aegis_trial', readonly string[]>>;
export const FORTRESS_SEAL_PROPS: readonly string[];
export function fortressFootRect(type: string, x: number, y: number): FortressRect | null;
export const FORTRESS_SOLIDS: FortressRect[];
export const FORTRESS_INTERACTABLES: { id: string; kind: 'sign' | 'chest' | 'object' | 'npc'; verb: string; x: number; y: number; w: number; h: number }[];
export const FORTRESS_TRIGGERS: { id: FortressTriggerId; x: number; y: number; w: number; h: number }[];
export const FORTRESS_TRIGGER_ENCOUNTER: Readonly<Partial<Record<FortressTriggerId, FortressEncounterId>>>;
export const FORTRESS_LAYOUT: Readonly<Record<'heartSeal' | 'bellCenter' | 'trialCircle' | 'sundial', { x: number; y: number }>>;
export function buildFortressMap(): ForestMap;
