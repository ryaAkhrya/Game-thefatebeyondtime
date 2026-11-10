/** Subset Storage yang dipakai game; mudah di-mock di tes. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
}

export class MemoryStorage implements StorageLike {
  private readonly map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
}

/**
 * Mengambil localStorage dengan aman. Di beberapa mode (private window, site data diblokir)
 * mengakses `window.localStorage` saja bisa melempar error, jadi dibungkus try/catch dan diuji
 * dengan menulis-baca-hapus kunci probe. Mengembalikan null jika tidak tersedia.
 */
export function probeStorage(getter: () => StorageLike | null | undefined = defaultGetter): StorageLike | null {
  try {
    const s = getter();
    if (!s) return null;
    const probe = '__tfbt_probe__';
    s.setItem(probe, '1');
    const ok = s.getItem(probe) === '1';
    s.removeItem(probe);
    return ok ? s : null;
  } catch {
    return null;
  }
}

function defaultGetter(): StorageLike | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}
