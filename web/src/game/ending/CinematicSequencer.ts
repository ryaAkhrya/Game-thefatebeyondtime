export interface CinematicBeat { id: string; minMs: number; autoMs?: number; transition?: 'fade' | 'hold' | 'pan' }

/** Reusable, frame-clock driven. One input can advance one beat; no timers survive a scene shutdown. */
export class CinematicSequencer<T extends CinematicBeat> {
  private elapsed = 0;
  private index = 0;
  constructor(readonly beats: readonly T[]) {
    if (!beats.length || beats.some(b => !Number.isFinite(b.minMs) || b.minMs < 0 || (b.autoMs !== undefined && (!Number.isFinite(b.autoMs) || b.autoMs < b.minMs)))) throw new Error('Invalid cinematic timing');
  }
  get current(): T { return this.beats[this.index]!; }
  get time(): number { return this.elapsed; }
  get position(): number { return this.index; }
  get canAdvance(): boolean { return this.elapsed >= this.current.minMs; }
  get fade(): number { return this.current.transition === 'hold' ? 1 : Math.min(1, this.elapsed / 700); }
  update(delta: number): boolean {
    this.elapsed += Math.max(0, Math.min(100, Number.isFinite(delta) ? delta : 0));
    return this.current.autoMs !== undefined && this.elapsed >= this.current.autoMs;
  }
  advance(repeat = false): 'locked' | 'advanced' | 'done' {
    if (repeat || !this.canAdvance) return 'locked';
    if (this.index + 1 === this.beats.length) return 'done';
    this.index++; this.elapsed = 0; return 'advanced';
  }
}

/** Non-destructive contain: portrait and landscape images retain every pixel. */
export function containImage(width: number, height: number, boxWidth: number, boxHeight: number): { width: number; height: number; scale: number } {
  if ([width, height, boxWidth, boxHeight].some(n => !Number.isFinite(n) || n <= 0)) throw new Error('Invalid image dimensions');
  const scale = Math.min(boxWidth / width, boxHeight / height);
  return { width: width * scale, height: height * scale, scale };
}
