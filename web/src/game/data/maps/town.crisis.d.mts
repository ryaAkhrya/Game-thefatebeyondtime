export type CrisisStage = 'pre' | 'start' | 'crisisSeen' | 'azieDemand' | 'velthiaRefuses' | 'evacOrdered' | 'evacDone' | 'decision' | 'torvanStays' | 'velthiaJoined' | 'departed';
export type CrisisFacing = 'up' | 'down' | 'left' | 'right';
export interface CrisisItem {
  kind: 'decal' | 'shadow' | 'float' | 'clock' | 'flame' | 'water' | 'banner' | 'basket' | 'cart' | 'bundle';
  f?: string; x: number; y: number; lvl?: number; from?: CrisisStage;
  lift?: number; s?: string; mode?: 'stutter' | 'frozen'; pose?: string; phase?: number;
  sol?: [number, number, number, number];
}
export interface CrisisWalker {
  id: string; variant: string; interact?: string; role: string; facing: CrisisFacing; delay: number; speed: number;
  end: 'exit' | 'stay' | 'post'; route: [number, number][];
}
export interface CrisisSpot { x: number; y: number; facing: CrisisFacing }
export interface CrisisNpcSpots { velthia: CrisisSpot | 'follow'; azie: CrisisSpot; talric: CrisisSpot; torvan: CrisisSpot | null; gateGuard: CrisisSpot | null }
export const CRISIS_ATLAS: string;
export const CRISIS_STAGES: CrisisStage[];
export const CRISIS_ITEMS: CrisisItem[];
export const WALKERS: CrisisWalker[];
export const MAX_EVAC_WALKERS: number;
export const GATHER: Record<string, CrisisSpot>;
export const TORVAN_LOOP: [number, number][];
export const GATE_GUARD: CrisisSpot;
export const SCRIPT_PATHS: Record<'velthiaToCouncil' | 'azieToCouncil' | 'talricToGate' | 'talricToCouncil', [number, number][]>;
export function stageIndex(stage: CrisisStage): number;
export function atLeast(stage: CrisisStage, min: CrisisStage): boolean;
export function crisisLevel(stage: CrisisStage): 1 | 2 | 3;
export function itemVisible(item: CrisisItem, stage: CrisisStage): boolean;
export function crisisNpcSpots(stage: CrisisStage): CrisisNpcSpots;
export function walkersMode(stage: CrisisStage): 'work' | 'stream' | 'done';
export function walkerStart(w: CrisisWalker): { x: number; y: number };
export function walkerFinal(w: CrisisWalker, stage: CrisisStage): { x: number; y: number; facing?: CrisisFacing; visible: boolean };
