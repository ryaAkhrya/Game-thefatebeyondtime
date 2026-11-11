import type { StorageLike } from './StorageAdapter';

const KEY = 'tfbt.hints.v1';

/**
 * Petunjuk mekanik sekali-tampil (prinsip "show, don't over-instruct"). Disimpan terpisah dari save dan settings;
 * menghapus data situs hanya membuat petunjuk muncul lagi satu kali. Mengembalikan true hanya pada klaim pertama.
 */
export function claimHint(storage: StorageLike | null, id: string): boolean {
  let seen: Record<string, boolean> = {};
  try { seen = JSON.parse(storage?.getItem(KEY) ?? '{}') as Record<string, boolean>; } catch { seen = {}; }
  if (seen[id]) return false;
  seen[id] = true;
  try { storage?.setItem(KEY, JSON.stringify(seen)); } catch { /* storage opsional */ }
  return true;
}
