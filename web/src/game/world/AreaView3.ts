/**
 * Kontrak view area Chapter III (Aveloria krisis, Kuil Jejak). WorldScene memanggil view ini; aksi cerita generik
 * `{ type: 'c3', op, arg }` diteruskan ke `handleAction` dan ditunggu sampai selesai.
 */
export interface AreaView3 {
  handleAction(op: string, arg?: string | number): Promise<void>;
  update(player: { x: number; y: number }, moving: boolean, delta: number, sprinting: boolean): void;
  /** Terapkan status visual dari flag (saat load/Continue dan setelah perubahan flag). */
  apply(flags: Readonly<Record<string, boolean>>): void;
  debug(): unknown;
  destroy(): void;
}
