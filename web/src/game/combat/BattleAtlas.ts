export interface AtlasFrame { index_0_based: number; rect: [number, number, number, number]; pivot: [number, number]; duration_ms: number }
export interface BattleAtlas { frame_size: [number, number]; frames: Record<string, AtlasFrame>; event: { frame_key: string; index_0_based: number } }
export const BATTLE_TEXTURE = { C01: 'C01_YARIC_BATTLE', M01: 'M01_HOLLOWLING_BATTLE', slam: 'VFX_C01_GROUND_SLAM' } as const;
