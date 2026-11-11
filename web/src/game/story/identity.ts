import { C2 } from './chapter2Flags';

/**
 * Identitas Yaric (Polish Sprint 1, DRAFT_IMPL).
 *
 * Yaric terbangun tanpa ingatan dan belum tahu namanya. Sampai momen pengenalan (Bab II, batu penanda pertama
 * di Hutan 2, sesaat sebelum ia memperkenalkan diri kepada Torvan di C2-05) UI TIDAK boleh menampilkan nama itu:
 * label dialog, Status, Inventaris, Jurnal, Simpan/Muat dan battle memakai label anonim.
 *
 * - ID internal karakter tetap `C01`; hanya tampilan yang berubah.
 * - Keadaan presentasi = satu flag cerita di save (aman terhadap save/load), ditambah penurunan dari flag Bab II
 *   lama supaya save yang dibuat sebelum sprint ini tidak "lupa" nama (kompatibel mundur).
 * - Bukan nama terukir pada sarung pedang (opsi O-15 ditunda) dan tidak mengungkap Yudis/reinkarnasi.
 */
export const IDENTITY_FLAG = 'identity.name_known';

/** Label anonim untuk ucapan. Monolog batin (thought) tidak memakai label sama sekali. */
export const UNKNOWN_LABEL = '???';
/** Bentuk sapaan netral dalam kalimat narasi/battle sebelum nama diketahui. */
export const UNKNOWN_SELF = 'Kau';

export const TRUE_NAME = 'Yaric';

/** Flag Bab II yang hanya mungkin ada sesudah Yaric memperkenalkan diri kepada Torvan (save lama sebelum sprint ini). */
const IMPLIES_NAME: readonly string[] = [C2.forest, C2.torvan, C2.tutorial, C2.veyrath, C2.complete];

export function isNameKnown(flags: Readonly<Record<string, boolean>> | undefined): boolean {
  if (!flags) return false;
  if (flags[IDENTITY_FLAG]) return true;
  return IMPLIES_NAME.some((flag) => flags[flag]);
}

/** Nama tampilan karakter. Hanya C01 yang dapat anonim; karakter lain selalu memakai nama dari tabel. */
export function displayNameOf(id: string, known: boolean, table: Readonly<Record<string, string>>): string {
  if (id === 'C01') return known ? TRUE_NAME : UNKNOWN_LABEL;
  return table[id] ?? '';
}
