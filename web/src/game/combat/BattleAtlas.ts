export interface AtlasFrame { index_0_based: number; rect: [number, number, number, number]; pivot: [number, number]; duration_ms: number }
export interface BattleAtlas { frame_size: [number, number]; frames: Record<string, AtlasFrame>; event: { frame_key: string; index_0_based: number } }
export const BATTLE_TEXTURE = { C01: 'C01_YARIC_BATTLE', M01: 'M01_HOLLOWLING_BATTLE', B01: 'B01_MOURNFANG_BATTLE', slam: 'VFX_C01_GROUND_SLAM' } as const;

export interface PoseAtlas { authored_grid: [number, number]; frames: Record<string, { rect: [number, number, number, number]; pivot: [number, number] }> }
/** Playback aliases HOLD the four existing poses. They do not claim extra authored animation frames. */
export function mournfangPlayback(source: PoseAtlas): BattleAtlas {
  const pose = (name: string, duration_ms: number): AtlasFrame => {
    const f = source.frames[name];
    if (!f || f.rect[0] % source.authored_grid[0] !== 0) throw new Error('Invalid Mournfang pose atlas');
    return { rect: [...f.rect], pivot: [...f.pivot], index_0_based: f.rect[0] / source.authored_grid[0], duration_ms };
  };
  return { frame_size: [...source.authored_grid], event: { frame_key: 'attack', index_0_based: 1 }, frames: {
    idle_a: pose('idle', 900), idle_b: pose('idle', 900), anticipation: pose('idle', 600),
    attack: pose('attack', 260), followthrough: pose('attack', 160), recovery: pose('idle', 420),
    hit_recoil: pose('hit', 220), hit_recover: pose('idle', 180), death_start: pose('hit', 300), defeated: pose('defeated', 700),
  } };
}
