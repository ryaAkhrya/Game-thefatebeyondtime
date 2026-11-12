import type { CharacterId } from '../data/ids';
import type { DialogueLine, DialogueScript, ExpressionId, LineKind } from './types';

/**
 * Chapter IV, Aveloria sesudah menara tua runtuh (C4-07): dialog penghubung dan pengamatan. SEMUA baris `DRAFT_IMPL`
 * (bukan naskah approved), ID unik berawalan `C4-AVE-`. Adegan kanon C4-07 sendiri (`C4_RETURN_AVELORIA`) ada di `chapter4.ts`.
 *
 * Disiplin: pengakuan kerugian dan rasa syukur secara manusiawi, tanpa tragedi berlebihan dan tanpa pesta. Warga tidak bernama
 * (label peran saja). Tidak ada penjelasan Torvan, tidak ada konten setelah Bab IV. Hanya portrait yang sudah ada dipakai.
 */
type Who = CharacterId | 'SYSTEM';
function line(id: string, speaker: Who, expression: ExpressionId | undefined, text: string, extra: { label?: string; kind?: LineKind; pauseMs?: number } = {}): DialogueLine {
  return { type: 'line', id: `C4-AVE-${id}`, speaker, expression, label: extra.label, text,
    kind: extra.kind ?? (speaker === 'SYSTEM' ? 'system' : 'speech'), source: 'DRAFT_IMPL', pauseMs: extra.pauseMs ?? 350 };
}
const say = (id: string, who: CharacterId, expr: ExpressionId, text: string): DialogueLine => line(id, who, expr, text);
const narr = (id: string, text: string, label?: string): DialogueLine => line(id, 'SYSTEM', undefined, text, { label });
const script = (id: string, ...nodes: DialogueLine[]): DialogueScript => ({ id: `C4-AVE-${id}`, nodes });

// ---------------------------------------------------------------------------------------------------------------------
// Menutup hari (penutup Bab IV yang dapat dimainkan)
// ---------------------------------------------------------------------------------------------------------------------

/** Bicara dengan Velthia setelah adegan kembali: menutup hari dan Bab IV. */
export const C4_AVE_VELTHIA_CLOSE = script('VELTHIA-CLOSE',
  narr('VC-01', 'Api masak dikecilkan satu per satu. Tidak ada yang bersorak; orang-orang duduk lebih dekat dan bicara pelan.'),
  say('VC-02', 'C02', 'NEUTRAL', 'Daftar sudah selesai kubaca. Semua nama ada.'),
  say('VC-03', 'C01', 'SAD', 'Dan rumah-rumah mereka?'),
  say('VC-04', 'C02', 'NEUTRAL', 'Sebagian runtuh, sebagian retak. Itu pekerjaan hari-hari berikutnya. Pekerjaan yang bisa dikerjakan.'),
  say('VC-05', 'C01', 'DETERMINED', 'Besok pagi aku ikut mengangkat balok. Aku janji hanya salah jalan satu kali.'),
  say('VC-06', 'C02', 'AMUSED', 'Dua kali tadi katamu. Sudah kucatat.'),
  narr('VC-07', 'Di balik tembok, menara tua tinggal bayangan debu yang pelan-pelan turun. Retakan di paving tidak lagi bergerak.'),
);

/** Memeriksa papan daftar warga (cara lain menutup hari). */
export const C4_AVE_ROSTER_CLOSE = script('ROSTER-CLOSE',
  narr('RO-01', 'Papan daftar: nama-nama ditulis rapat, tiap keluarga satu baris. Di sebelah tiap nama ada tanda centang; beberapa dicoret lalu ditulis ulang.'),
  narr('RO-02', 'Di bagian bawah, tulisan tangan Azie: "Tempat tidur kurang enam. Selimut cukup. Air cukup untuk malam ini."'),
  narr('RO-03', 'Tidak ada baris yang kosong. Tidak ada yang kau cari tanpa menemukannya.'),
  say('RO-04', 'C01', 'NEUTRAL', 'Semuanya ada di sini.'),
  say('RO-05', 'C02', 'NEUTRAL', 'Semuanya ada di sini. Sisanya bisa dibangun lagi.'),
);

/** Sesudah hari ditutup: Velthia, singkat. */
export const C4_AVE_VELTHIA_AFTER = script('VELTHIA-AFTER',
  say('VA-01', 'C02', 'NEUTRAL', 'Istirahatlah. Besok daftar pekerjaannya lebih panjang dari daftar malam ini.'));

/** Bicara dengan Velthia sebelum adegan kembali dimainkan (dipakai bila pemain memotong lebih dulu). */
export const C4_AVE_VELTHIA_BUSY = script('VELTHIA-BUSY',
  say('VB-01', 'C02', 'NEUTRAL', 'Sebentar. Talric belum selesai melapor.'));

// ---------------------------------------------------------------------------------------------------------------------
// Talric, Azie, Velthia, Derrria sesudah adegan kembali (percakapan opsional)
// ---------------------------------------------------------------------------------------------------------------------
export const C4_AVE_TALRIC = script('TALRIC',
  say('T-01', 'C06', 'NEUTRAL', 'Daftar sudah kucocokkan dua kali. Jumlahnya pas. Aku tetap menghitung ulang tiap ada yang lewat.'),
  say('T-02', 'C06', 'NEUTRAL', 'Penjaga bergilir di kota tua sampai puing aman disentuh. Besok kami mulai mengangkat balok.'));
export const C4_AVE_TALRIC_AFTER = script('TALRIC-AFTER',
  say('T-03', 'C06', 'NEUTRAL', 'Kalau mau membantu, besok bawa sarung tangan. Batunya tajam.'));

export const C4_AVE_AZIE = script('AZIE',
  say('A-01', 'C05', 'NEUTRAL', 'Aku mencatat apa yang hilang, bukan hanya siapa yang selamat. Rumah, gudang gandum, sebagian arsip di sisi timur.'),
  say('A-02', 'C05', 'SKEPTICAL', 'Perintah evakuasi itu tepat, dan aku sudah menuliskannya begitu. Tapi tepat tidak berarti disukai. Surat keberatan para bangsawan masih menumpuk.'),
  say('A-03', 'C05', 'WORRIED', 'Daftar yang panjang itu melelahkan. Tetap lebih baik daripada daftar yang pendek karena tidak ada yang tersisa.'));

export const C4_AVE_DERRRIA = script('DERRRIA',
  say('D-01', 'C09', 'WORRIED', 'Kiosku masih berdiri, kata penjaga. Isinya entah. Aku hanya sempat membawa timbangan dan buku utang.'),
  say('D-02', 'C09', 'AMUSED', 'Buku utang itu justru yang paling kuselamatkan. Jangan bilang siapa-siapa.'));

// ---------------------------------------------------------------------------------------------------------------------
// Warga tanpa nama (4-6 baris pendek; mengakui kerugian dan rasa syukur)
// ---------------------------------------------------------------------------------------------------------------------
export const C4_AVE_VENDOR = script('VENDOR',
  narr('V-01', 'Sayurnya sudah layu di kios. Tidak apa-apa. Aku masih punya tangan, dan anakku tidur nyenyak malam ini.', 'Penjual sayur'));
export const C4_AVE_PORTER = script('PORTER',
  narr('P-01', 'Peti-peti itu bisa kuangkat lagi. Yang tadi kuangkat adalah orang tua dari rumah di dekat menara. Beratnya lain.', 'Pembawa peti'));
export const C4_AVE_RES_A = script('RES-A',
  narr('RA-01', 'Atap rumahku sudah tidak ada. Tapi aku mendengar bunyinya runtuh dari sini, bukan dari dalam. Aku bersyukur untuk itu.', 'Warga'));
export const C4_AVE_RES_B = script('RES-B',
  narr('RB-01', 'Anak-anak sudah berhenti bertanya kapan pulang. Kemarin mereka hanya mau tahu apakah kucing mereka ikut. Ikut, ternyata.', 'Warga'));
export const C4_AVE_RES_C = script('RES-C',
  narr('RC-01', 'Empat puluh tahun aku melihat menara itu dari jendela. Anehnya, malam ini yang kurasa bukan sedih saja. Lebih mirip lega yang letih.', 'Warga tua'));
export const C4_AVE_GUARD = script('GUARD',
  narr('G-01', 'Kawasan ini ditutup sampai balok yang tersisa diperiksa. Lonceng terakhir jatuh ke sisi barat. Jangan mendekat ke pagar.', 'Penjaga'));

// ---------------------------------------------------------------------------------------------------------------------
// Pengamatan benda
// ---------------------------------------------------------------------------------------------------------------------
export const C4_AVE_BELL = script('BELL',
  narr('B-01', 'Lonceng menara tergeletak di sisinya, perunggunya retak dari bibir sampai bahu. Lidahnya terlepas dan tidak ada yang berniat memungutnya malam ini.'),
  narr('B-02', 'Ia tidak berbunyi lagi. Entah akan dilebur atau dipasang kembali.'));
export const C4_AVE_FENCE_SIGN = script('FENCE-SIGN',
  narr('F-01', '"TUTUP. Reruntuhan belum stabil. Dilarang masuk sebelum diperiksa penjaga."'));
export const C4_AVE_SIGN = script('SIGN',
  narr('S-01', 'Utara: istana. Timur: arsip (kawasan menara ditutup). Barat: pasar. Selatan: tempat penampungan warga.'));

export const C4_AVE_SCRIPTS: readonly DialogueScript[] = [
  C4_AVE_VELTHIA_CLOSE, C4_AVE_ROSTER_CLOSE, C4_AVE_VELTHIA_AFTER, C4_AVE_VELTHIA_BUSY,
  C4_AVE_TALRIC, C4_AVE_TALRIC_AFTER, C4_AVE_AZIE, C4_AVE_DERRRIA,
  C4_AVE_VENDOR, C4_AVE_PORTER, C4_AVE_RES_A, C4_AVE_RES_B, C4_AVE_RES_C, C4_AVE_GUARD,
  C4_AVE_BELL, C4_AVE_FENCE_SIGN, C4_AVE_SIGN,
];
