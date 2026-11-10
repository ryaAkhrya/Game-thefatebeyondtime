import { overlaps, type Facing, type Rect } from './Collision';

export interface Interactable extends Rect {
  id: string;
  kind: 'sign' | 'chest' | 'object' | 'npc';
  verb: string;
  /** Salinan periodik (0 = pertama) untuk objek di lorong berulang. */
  copy?: number;
  enabled?: boolean;
}

/** Persegi uji di depan pemain sesuai arah hadap. Interaksi hanya berlaku bila menghadap dan cukup dekat. */
export function probeRect(foot: { x: number; y: number }, facing: Facing): Rect {
  switch (facing) {
    case 'up':
      return { x: foot.x - 9, y: foot.y - 24, w: 18, h: 18 };
    case 'down':
      return { x: foot.x - 9, y: foot.y - 4, w: 18, h: 20 };
    case 'left':
      return { x: foot.x - 24, y: foot.y - 14, w: 20, h: 14 };
    case 'right':
      return { x: foot.x + 4, y: foot.y - 14, w: 20, h: 14 };
  }
}

function overlapArea(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/** Interactable dengan irisan terbesar terhadap persegi uji; null bila tak ada. */
export function findInteractable(
  foot: { x: number; y: number },
  facing: Facing,
  list: readonly Interactable[],
): Interactable | null {
  const probe = probeRect(foot, facing);
  let best: Interactable | null = null;
  let bestArea = 0;
  for (const it of list) {
    if (it.enabled === false) continue;
    if (!overlaps(probe, it)) continue;
    const a = overlapArea(probe, it);
    if (a > bestArea) {
      best = it;
      bestArea = a;
    }
  }
  return best;
}
