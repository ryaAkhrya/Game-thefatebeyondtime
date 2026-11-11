export interface AtlasFrame { index_0_based: number; rect: [number, number, number, number]; pivot: [number, number]; duration_ms: number }
export interface BattleAtlas { frame_size: [number, number]; frames: Record<string, AtlasFrame>; event: { frame_key: string; index_0_based: number } }
export const BATTLE_TEXTURE = { C01: 'C01_YARIC_BATTLE', C03: 'C03_CH2_BATTLE', M01: 'M01_HOLLOWLING_BATTLE',
  M02: 'M02_CH2_BATTLE', M03: 'M03_CH2_BATTLE', B01: 'B01_MOURNFANG_BATTLE', B02: 'B02_CH2_BATTLE', slam: 'VFX_C01_GROUND_SLAM' } as const;

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

/** Alias four authored DRAFT poses to the existing timing contract without inventing frames. */
export function draftPosePlayback(source: PoseAtlas): BattleAtlas {
  const pose = (name: string, duration_ms: number): AtlasFrame => {
    const f = source.frames[name];
    if (!f || f.rect[0] % source.authored_grid[0] !== 0) throw new Error('Invalid draft pose atlas');
    return { rect: [...f.rect], pivot: [...f.pivot], index_0_based: f.rect[0] / source.authored_grid[0], duration_ms };
  };
  return { frame_size: [...source.authored_grid], event: { frame_key: 'attack', index_0_based: 1 }, frames: {
    idle_a: pose('idle', 650), idle_b: pose('idle', 650), anticipation: pose('idle', 240),
    attack: pose('attack', 280), followthrough: pose('attack', 160), recovery: pose('idle', 260),
    hit_recoil: pose('hit', 220), hit_recover: pose('idle', 180), death_start: pose('hit', 240), defeated: pose('defeated', 650),
  } };
}

/**
 * Atlas boss yang dipakai BattleScene. Atlas v4 (Sprint 2) sudah memuat semua kunci frame dan durasi sendiri; atlas lama
 * (empat pose DRAFT) diadaptasi lewat mournfangPlayback.
 */
export function bossAtlas(meta: unknown): BattleAtlas {
  const m = meta as Partial<BattleAtlas> & Partial<PoseAtlas>;
  if (m.frames && 'idle_a' in m.frames && m.frame_size) return m as BattleAtlas;
  return mournfangPlayback(meta as PoseAtlas);
}
