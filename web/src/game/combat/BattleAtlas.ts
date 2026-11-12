export interface AtlasFrame { index_0_based: number; rect: [number, number, number, number]; pivot: [number, number]; duration_ms: number }
export interface BattleAtlas { frame_size: [number, number]; frames: Record<string, AtlasFrame>; event: { frame_key: string; index_0_based: number } }
export const BATTLE_TEXTURE = { C01: 'C01_YARIC_BATTLE', C03: 'C03_CH2_BATTLE', M01: 'M01_HOLLOWLING_BATTLE',
  M02: 'M02_CH2_BATTLE', M03: 'M03_CH2_BATTLE', B01: 'B01_MOURNFANG_BATTLE', B02: 'B02_CH2_BATTLE',
  /** Phase 7 (Agent BA): atlas penuh 13-an frame (DRAFT/NEEDS_REVIEW), tiap atlas membawa duration_ms, pivot dan event sendiri. */
  C02: 'C02_BATTLE_V1', B03: 'B03_BATTLE_V1', M05: 'M05_BATTLE_V1',
  /** Phase 8 (Agent BA): Varlgrim (id aktor `C04`; `B04` = alias kanon), Gravorn, Riftborn (juga "Penguji"). Semua atlas penuh. */
  C04: 'B04_BATTLE_V1', B04: 'B04_BATTLE_V1', M04: 'M04_BATTLE_V1', M06: 'M06_BATTLE_V1', slam: 'VFX_C01_GROUND_SLAM' } as const;

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

/** Atlas Phase 7 (C02 Velthia, B03 Chronolith, M05 Oathguard) sudah berformat BattleAtlas penuh; helper hanya memvalidasi kunci wajib. */
export const REQUIRED_BATTLE_FRAMES = ['idle_a', 'idle_b', 'anticipation', 'attack', 'followthrough', 'recovery', 'hit_recoil', 'hit_recover', 'death_start', 'defeated'] as const;
export function fullAtlas(meta: unknown): BattleAtlas {
  const m = meta as Partial<BattleAtlas>;
  if (!m.frame_size || !m.frames || !m.event) throw new Error('Invalid full battle atlas');
  for (const k of REQUIRED_BATTLE_FRAMES) if (!(k in m.frames)) throw new Error(`Battle atlas missing frame ${k}`);
  return m as BattleAtlas;
}
/** Frame untuk kunci khusus (cast/heal/shield/summon/guard/special/charge): jatuh ke fallback bila atlas tidak punya. */
export function frameKeyFor(atlas: BattleAtlas, key: string, fallback = 'attack'): string {
  return key in atlas.frames ? key : fallback in atlas.frames ? fallback : 'idle_a';
}

/**
 * Phase 8: kunci frame khusus Varlgrim (B04) dan Gravorn (M04). Atlas lama tidak memilikinya -> jatuh ke fallback (perilaku lama tidak berubah).
 *  plant = tongkat ditanam (time_bind/phase_shift); raise = tongkat diangkat menahan langit (meteor_call/meteor_hold);
 *  cast = tangan terulur (distortion_wave/seal_pulse); guard = lengan disilang (Gravorn brace, juga B03).
 */
export const SPECIAL_FRAME_FALLBACK = { plant: 'anticipation', raise: 'anticipation', cast: 'attack', guard: 'idle_a' } as const;
export type SpecialFrameKey = keyof typeof SPECIAL_FRAME_FALLBACK;
export function specialFrameKey(atlas: BattleAtlas, key: SpecialFrameKey): string {
  return frameKeyFor(atlas, key, SPECIAL_FRAME_FALLBACK[key]);
}
export function hasSpecialFrame(atlas: BattleAtlas, key: SpecialFrameKey): boolean {
  return key in atlas.frames;
}
/** Atlas yang melayang (Riftborn) membawa `hover_px` di JSON: celah udara antara dasar sprite dan garis pivot (bayangan jatuh di garis pivot). */
export function atlasHoverPx(meta: unknown): number {
  const h = (meta as { hover_px?: unknown } | null)?.hover_px;
  return typeof h === 'number' && h >= 0 ? h : 0;
}
