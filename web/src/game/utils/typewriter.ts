import { TEXT_SPEED_MS_PER_CHAR, type TextSpeed } from '../data/settingsSchema';

/** Jumlah karakter yang terlihat setelah `elapsedMs`. Instan -> semua langsung tampil. */
export function visibleChars(elapsedMs: number, speed: TextSpeed, total: number): number {
  const per = TEXT_SPEED_MS_PER_CHAR[speed];
  if (per <= 0) return total;
  return Math.min(total, Math.max(0, Math.floor(elapsedMs / per)));
}
