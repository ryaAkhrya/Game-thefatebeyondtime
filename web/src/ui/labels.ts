import type { GameStateData } from '../game/systems/GameState';
import { TRUE_NAME, UNKNOWN_LABEL, isNameKnown } from '../game/story/identity';

export const AREA_LABEL: Readonly<Record<string, string>> = {
  none: '—', forest_1: 'Hutan', forest_edge: 'Tepi Hutan', aveloria: 'Aveloria', liora: 'Liora', forest_2: 'Hutan Lama',
};

export const BEAT_LABEL: Readonly<Record<string, string>> = {
  'C1-01': 'Terbangun', 'C1-02': 'Mencari jalan', 'C1-03': 'Jalur berulang', 'C1-04': 'Sebelum Hollowling', 'C1-04-DONE': 'Usai Hollowling',
  'C1-05': 'Jejak Mournfang', 'C1-05-DONE': 'Usai Mournfang', 'SLICE-DONE': 'Menuju Aveloria', 'C1-06': 'Gerbang Aveloria',
  'C1-07': 'Laporan Azie', 'C1-08': 'Audiensi Velthia', 'C1-09': 'Lonceng menara', 'C1-DONE': 'Bab I selesai',
  'C2-01': 'Dua catatan Azie', 'C2-02': 'Bekal Velthia', 'C2-03': 'Desa Liora', 'C2-04': 'Hutan kedua', 'C2-05': 'Torvan bergabung',
  'C2-06': 'Belajar bersama', 'C2-07': 'Jalan Veyrath', 'C2-08': 'Fragmen ramalan', 'C2-09': 'Kembali melapor', 'C2-DONE': 'Bab II selesai',
};

export function formatPlaytime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h} j ${String(m).padStart(2, '0')} m` : `${m} menit`;
}

/** Nama tampilan anggota party; Yaric anonim sampai identitasnya terungkap. */
export function partyName(id: 'C01' | 'C03', known: boolean): string {
  if (id === 'C03') return 'Torvan';
  return known ? TRUE_NAME : UNKNOWN_LABEL;
}

export function nameKnownIn(data: Pick<GameStateData, 'flags'> | null | undefined): boolean {
  return isNameKnown(data?.flags);
}
