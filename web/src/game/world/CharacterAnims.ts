import type Phaser from 'phaser';
import type { Facing } from './Collision';

/**
 * Animasi karakter overworld berbasis DATA (Polish Sprint 2). Setiap atlas eksplorasi (32x48 per sel) dapat membawa
 * `cols` dan `anims` di JSON-nya:
 *   anims[arah][state] = { frames: [indeks grid = baris*cols + kolom], fps }
 * dengan state `idle`, `walk`, `sprint`. Bila atlas belum membawa data (atlas lama), perilaku lama dipakai:
 * Yaric 4 kolom (diam = frame pertama baris, jalan = 4 frame), cast 6 kolom (diam = 2 frame, jalan = frame 2..5).
 * Sprint tanpa data = jalan yang dipercepat. Definisi dapat dipakai ulang oleh NPC mana pun.
 */
export type AnimState = 'idle' | 'walk' | 'sprint';
export interface AnimDef { frames: number[]; fps: number }
export type DirAnims = Partial<Record<AnimState, AnimDef>>;
export interface CharacterAnimMeta { cols?: number; anims?: Partial<Record<Facing, DirAnims>> }

export const DIRS: readonly Facing[] = ['down', 'left', 'right', 'up'];
const ROW: Record<Facing, number> = { down: 0, left: 1, right: 2, up: 3 };

export const animKey = (tag: string, state: AnimState, dir: Facing): string => `${tag}_${state}_${dir}`;

/** Definisi bawaan (perilaku sebelum Sprint 2) untuk atlas tanpa data `anims`. */
export function legacyAnims(cols: number, dir: Facing): Required<DirAnims> {
  const row = ROW[dir] * cols;
  if (cols === 4) {
    const walk = [0, 1, 2, 3].map(i => row + i);
    return { idle: { frames: [row], fps: 1 }, walk: { frames: walk, fps: 7 }, sprint: { frames: walk, fps: 12 } };
  }
  const walk = [2, 3, 4, 5].map(i => row + i);
  return { idle: { frames: [row, row + 1], fps: 2 }, walk: { frames: walk, fps: 7 }, sprint: { frames: walk, fps: 12 } };
}

/** Menggabungkan data atlas dengan bawaan; state yang hilang diisi bawaan (sprint = jalan x1,7). */
export function resolveAnims(meta: CharacterAnimMeta | undefined | null, fallbackCols: number, dir: Facing): Required<DirAnims> {
  const cols = meta?.cols ?? fallbackCols;
  const base = legacyAnims(cols, dir);
  const own = meta?.anims?.[dir];
  const walk = own?.walk ?? base.walk;
  return {
    idle: own?.idle ?? base.idle,
    walk,
    sprint: own?.sprint ?? { frames: walk.frames, fps: Math.round(walk.fps * 1.7) },
  };
}

/** Mendaftarkan semua animasi (idempoten) untuk satu karakter. */
export function registerCharacterAnims(scene: Phaser.Scene, textureKey: string, tag: string, meta: CharacterAnimMeta | undefined | null, fallbackCols: number): void {
  for (const dir of DIRS) {
    const set = resolveAnims(meta, fallbackCols, dir);
    for (const state of ['idle', 'walk', 'sprint'] as const) {
      const key = animKey(tag, state, dir);
      if (scene.anims.exists(key)) continue;
      const def = set[state];
      scene.anims.create({ key, frames: def.frames.map(frame => ({ key: textureKey, frame })), frameRate: def.fps, repeat: -1 });
    }
  }
}

/** Memutar state bila berbeda dari yang sedang berjalan. Idle dimulai dari frame acak agar NPC tidak berayun serempak. */
export function playState(sprite: Phaser.GameObjects.Sprite, tag: string, state: AnimState, dir: Facing, randomStart = false): void {
  const key = animKey(tag, state, dir);
  if (sprite.anims.currentAnim?.key === key) return;
  if (randomStart && state === 'idle') {
    const frames = sprite.scene.anims.get(key)?.frames.length ?? 1;
    sprite.anims.play({ key, startFrame: Math.floor(Math.random() * frames) }, true);
  } else sprite.anims.play(key, true);
}
