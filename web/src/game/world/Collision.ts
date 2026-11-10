import type { WalkableShape } from '../data/maps/forest1.map.mjs';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Facing = 'up' | 'down' | 'left' | 'right';

/** Kotak kaki pemain/NPC (titik acuan = tengah-bawah). Hanya kaki yang bertabrakan, bukan kepala/kanopi. */
export const FOOT_W = 16;
export const FOOT_H = 8;

export function footBox(x: number, y: number): Rect {
  return { x: x - FOOT_W / 2, y: y - FOOT_H, w: FOOT_W, h: FOOT_H };
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function pointIn(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

/**
 * Peta collision berbasis grid (sel 8 px): area WALKABLE (gabungan persegi/elips) dikurangi BLOCKER statis (kaki prop),
 * ditambah blocker DINAMIS yang bisa dinyalakan/dimatikan (gerbang, semak berduri, NPC).
 * Dipisahkan dari rendering dan interaksi agar dapat diuji tanpa Phaser.
 */
export class CollisionMap {
  private readonly cols: number;
  private readonly rows: number;
  private readonly grid: Uint8Array; // 1 = bisa dilalui
  private readonly dynamic = new Map<string, Rect>();

  constructor(
    readonly width: number,
    readonly height: number,
    walkable: readonly WalkableShape[],
    blockers: readonly Rect[],
    readonly cell = 8,
  ) {
    this.cols = Math.ceil(width / cell);
    this.rows = Math.ceil(height / cell);
    this.grid = new Uint8Array(this.cols * this.rows);
    for (const w of walkable) this.paintWalkable(w);
    for (const b of blockers) this.paintBlocker(b);
  }

  private paintWalkable(s: WalkableShape): void {
    const c = this.cell;
    const [x0, y0, x1, y1] =
      s.shape === 'rect' ? [s.x, s.y, s.x + s.w, s.y + s.h] : [s.cx - s.rx, s.cy - s.ry, s.cx + s.rx, s.cy + s.ry];
    for (let gy = Math.max(0, Math.floor(y0 / c)); gy <= Math.min(this.rows - 1, Math.floor(y1 / c)); gy++) {
      for (let gx = Math.max(0, Math.floor(x0 / c)); gx <= Math.min(this.cols - 1, Math.floor(x1 / c)); gx++) {
        const cx = gx * c + c / 2;
        const cy = gy * c + c / 2;
        let inside: boolean;
        if (s.shape === 'rect') inside = cx >= s.x && cx <= s.x + s.w && cy >= s.y && cy <= s.y + s.h;
        else inside = ((cx - s.cx) / s.rx) ** 2 + ((cy - s.cy) / s.ry) ** 2 <= 1;
        if (inside) this.grid[gy * this.cols + gx] = 1;
      }
    }
  }

  private paintBlocker(r: Rect): void {
    const c = this.cell;
    for (let gy = Math.max(0, Math.floor(r.y / c)); gy <= Math.min(this.rows - 1, Math.floor((r.y + r.h - 0.01) / c)); gy++) {
      for (let gx = Math.max(0, Math.floor(r.x / c)); gx <= Math.min(this.cols - 1, Math.floor((r.x + r.w - 0.01) / c)); gx++) {
        this.grid[gy * this.cols + gx] = 0;
      }
    }
  }

  setDynamic(id: string, rect: Rect | null): void {
    if (rect) this.dynamic.set(id, rect);
    else this.dynamic.delete(id);
  }

  hasDynamic(id: string): boolean {
    return this.dynamic.has(id);
  }

  isWalkableCell(gx: number, gy: number): boolean {
    if (gx < 0 || gy < 0 || gx >= this.cols || gy >= this.rows) return false;
    return this.grid[gy * this.cols + gx] === 1;
  }

  /** true bila kotak kaki sepenuhnya berada di area walkable dan tidak menabrak blocker dinamis. */
  canStand(box: Rect): boolean {
    const c = this.cell;
    for (let gy = Math.floor(box.y / c); gy <= Math.floor((box.y + box.h - 0.01) / c); gy++) {
      for (let gx = Math.floor(box.x / c); gx <= Math.floor((box.x + box.w - 0.01) / c); gx++) {
        if (!this.isWalkableCell(gx, gy)) return false;
      }
    }
    for (const r of this.dynamic.values()) if (overlaps(box, r)) return false;
    return true;
  }
}

/** Gerak per langkah 1 px per sumbu (tanpa tunneling). Mengembalikan posisi baru dan apakah terhalang. */
export function moveWithCollision(
  map: CollisionMap,
  x: number,
  y: number,
  dx: number,
  dy: number,
): { x: number; y: number; moved: number; blocked: boolean } {
  let cx = x;
  let cy = y;
  let moved = 0;
  let blocked = false;
  const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)));
  if (steps === 0) return { x, y, moved: 0, blocked: false };
  const sx = dx / steps;
  const sy = dy / steps;
  for (let i = 0; i < steps; i++) {
    if (sx !== 0) {
      if (map.canStand(footBox(cx + sx, cy))) {
        cx += sx;
        moved += Math.abs(sx);
      } else blocked = true;
    }
    if (sy !== 0) {
      if (map.canStand(footBox(cx, cy + sy))) {
        cy += sy;
        moved += Math.abs(sy);
      } else blocked = true;
    }
  }
  return { x: cx, y: cy, moved, blocked };
}
