import type { CharacterId } from '../data/ids';
import type { DialogueLine, DialogueScript, ExpressionId, LineKind } from './types';

/**
 * Warden Fortress (Chapter IV): teks lore, petunjuk teka-teki, papan, catatan dan peti. SEMUA `source: 'DRAFT_IMPL'` (bukan naskah
 * approved, bukan baris DIALOGUE_EVENTS); ID `C4-FORT-Xnnn`. Baris kanon C4-01..07 ada di `dialogue/chapter4.ts` (agen N).
 *
 * Disiplin spoiler dan kanon: Varlgrim disebut lewat bukti lingkungan saja (nama yang tidak dicoret, jubah yang belum selesai
 * dijahit, lilin di ceruk), tidak ada pengakuan; tidak ada konten modern; tidak ada hint bahwa Torvan adalah pencipta. Petunjuk
 * teka-teki selalu datang dari lingkungan/catatan/dialog alami (tanpa banner tujuan).
 */
let n = 0;
const nid = (): string => `C4-FORT-X${String(++n).padStart(3, '0')}`;
type Who = CharacterId | 'SYSTEM';
function line(speaker: Who, expression: ExpressionId | undefined, text: string, extra: { label?: string; kind?: LineKind; pauseMs?: number } = {}): DialogueLine {
  return { type: 'line', id: nid(), speaker, expression, label: extra.label, text,
    kind: extra.kind ?? (speaker === 'SYSTEM' ? 'system' : 'speech'), source: 'DRAFT_IMPL', pauseMs: extra.pauseMs ?? 350 };
}
const say = (speaker: CharacterId, expression: ExpressionId, text: string): DialogueLine => line(speaker, expression, text);
const think = (text: string, expression: ExpressionId = 'NEUTRAL'): DialogueLine => line('C01', expression, text, { kind: 'thought' });
const narr = (text: string, label?: string): DialogueLine => line('SYSTEM', undefined, text, { label });
const read = (label: string, text: string): DialogueLine => line('SYSTEM', undefined, text, { label, kind: 'read', pauseMs: 450 });
const script = (id: string, ...nodes: DialogueLine[]): DialogueScript => ({ id, nodes });

// ---------------------------------------------------------------------------------------------------------------------
// Gerbang Luar
// ---------------------------------------------------------------------------------------------------------------------
export const F_OUTER_GATE = script('C4-FORT-OUTER-GATE',
  narr('Jeruji gerbang tersangkut setengah terangkat. Rantainya tegang, seolah tertahan di antara dua detik.'),
  think('Besinya nggak berkarat. Tapi goresan bawahnya baru. Seperti habis jatuh lalu ditarik naik lagi.'),
);
export const F_OUTER_STATUE = script('C4-FORT-OUTER-STATUE',
  narr('Patung penjaga berzirah. Wajahnya sudah hilang, entah dimakan waktu atau digosok tangan. Di kakinya terpahat: "Berjaga, bukan menahan."'),
  say('C02', 'NEUTRAL', 'Semboyan penjaga waktu. Mereka menjaga jalannya waktu, bukan menahannya.'),
  say('C01', 'NEUTRAL', 'Kalimat yang bagus buat orang yang lagi menahan sesuatu.'),
);
export const F_OUTER_CART = script('C4-FORT-OUTER-CART',
  narr('Gerobak pasokan dengan as patah. Roti di baknya masih hangat, padahal debu di atas papannya setebal jari.'),
  say('C02', 'WORRIED', 'Waktu di tempat ini tidak berjalan sama di setiap sudut. Jangan makan apa pun yang kau temukan.'),
  say('C01', 'NEUTRAL', 'Aku juga nggak berniat makan apa-apa.'),
);

// ---------------------------------------------------------------------------------------------------------------------
// Aula Lonceng Berhenti dan teka-teki Urutan Segel
// ---------------------------------------------------------------------------------------------------------------------
export const F_BELL = script('C4-FORT-BELL',
  narr('Lonceng raksasa tergantung miring di tengah ayunan. Lidahnya membeku sejengkal dari dinding perunggu, dan retaknya memanjang dari bibir sampai mahkota.'),
  say('C02', 'NEUTRAL', 'Lonceng Berhenti. Dulu ia berbunyi setiap pergantian jaga. Catatan istana menyebut bunyinya yang terakhir terdengar sebelum aku lahir.'),
  say('C01', 'NEUTRAL', 'Berhenti di tengah ayunan. Seperti napas yang ditahan.'),
);
export const F_BELL_DIAL = script('C4-FORT-BELL-DIAL',
  narr('Cakram jaga di dinding. Jarumnya hanya satu dan tidak bergerak, menunjuk ke arah yang tidak cocok dengan cahaya obor.'),
  think('Seseorang pernah memutarnya terus-menerus, sampai porosnya aus miring.'),
);
export const F_SEAL_FIRST = script('C4-FORT-SEAL-FIRST',
  say('C02', 'NEUTRAL', 'Empat segel jaga, masing-masing berlambang matahari pada saat yang berbeda.'),
  say('C01', 'CONFUSED', 'Ada urutannya?'),
  say('C02', 'STERN', 'Pasti ada. Penjaga tidak memasang segel tanpa aturan. Cari catatan jaga mereka; di Arsip, kalau aku tidak salah.'),
);
export const F_SEAL_NOLOG = script('C4-FORT-SEAL-NOLOG',
  say('C02', 'NEUTRAL', 'Padam semuanya. Kita hanya menebak. Catatan jaga di Arsip pasti menyebut urutannya.'),
);
export const F_SEAL_SOLVED = script('C4-FORT-SEAL-SOLVED',
  narr('Keempat segel menyala berturut-turut. Di dinding utara, pintu besi bergeser perlahan.'),
  say('C02', 'NEUTRAL', 'Fajar, siang, senja, malam. Sehari penuh. Lonceng ini dulu menandai satu hari yang selesai.'),
  say('C01', 'HAPPY', 'Dan sekarang ia menandai pintu.'),
);
export const F_TRIAL_GATE = script('C4-FORT-TRIAL-GATE',
  narr('Gerbang besi di sisi timur aula. Alur pada tiangnya berbentuk lengkung bertumpuk, sama seperti lambang pada pusaka kerajaan.'),
  say('C02', 'NEUTRAL', 'Alurnya mirip lambang pusakaku. Mungkin gerbang ini menunggu sesuatu yang kubawa.'),
);
export const F_DOOR_SEAL = script('C4-FORT-DOOR-SEAL',
  narr('Pintu besi di dinding utara, berpahat empat lambang matahari yang kosong. Tidak ada gagang, hanya celah di bawahnya tempat cahaya merembes.'),
  think('Pintu ini nggak pakai kunci biasa. Ada yang lain yang menahannya.'),
);
export const F_DOOR_SHORTCUT = script('C4-FORT-DOOR-SHORTCUT',
  narr('Pintu besi tanpa gagang di sisi aula. Dari baliknya terdengar rantai bergemeretak pelan, seperti menunggu seseorang menariknya dari sisi lain.'),
);

// ---------------------------------------------------------------------------------------------------------------------
// Bekas barak
// ---------------------------------------------------------------------------------------------------------------------
export const F_BARRACKS_NAMES = script('C4-FORT-BARRACKS-NAMES',
  read('Daftar jaga', 'Empat puluh satu nama penjaga Benteng Kala, masing-masing dengan tanda jaga. Nama paling bawah digosok habis lalu dipahat ulang dengan tangan yang gemetar: "Hilang dalam jaga. Tidak dicoret."'),
  say('C02', 'WORRIED', 'Hilang, bukan gugur. Ada yang menolak mencoretnya.'),
  say('C01', 'NEUTRAL', 'Dan masih datang ke sini untuk memahatnya lagi.'),
);
export const F_BARRACKS_BUNK = script('C4-FORT-BARRACKS-BUNK',
  narr('Ranjang paling ujung rapi, selimutnya terlipat tiga. Di bantalnya ada tali kulit kecil dengan simpul jaga yang belum pernah dilepas.'),
  say('C01', 'NEUTRAL', 'Seseorang masih merawat tempat tidur ini.'),
);
export const F_BARRACKS_TABLE = script('C4-FORT-BARRACKS-TABLE',
  narr('Dua mangkuk di meja, uapnya masih naik tipis. Tidak ada orang. Sebuah sendok bergerak setengah ketukan, lalu diam.'),
  say('C02', 'WORRIED', 'Retakan menahan potongan waktu di tempatnya. Kita tidak tahu berapa banyak yang ia bawa.'),
  say('C01', 'NEUTRAL', 'Makan malam yang nggak pernah selesai.'),
);
export const F_CHEST_POTION = script('C4-FORT-CHEST-POTION',
  narr('Peti jatah jaga. Di dalamnya ada ramuan dengan tutup yang masih bersegel lilin.'),
);

// ---------------------------------------------------------------------------------------------------------------------
// Arsip Penjaga
// ---------------------------------------------------------------------------------------------------------------------
export const F_ARCHIVE_LOG = script('C4-FORT-ARCHIVE-LOG',
  read('Buku jaga Aula Lonceng', 'Halaman terakhir yang masih terbaca. Segel aula dinyalakan menurut perjalanan matahari dalam satu hari penjagaan, tidak pernah dibalik.'),
  read('Buku jaga Aula Lonceng', 'Pertama FAJAR: setengah matahari di atas garis, sinarnya menyebar. Lalu SIANG: matahari penuh, sinar di semua sisi. Lalu SENJA: setengah matahari tenggelam di bawah garis. Terakhir MALAM: sabit, sendirian.'),
  read('Buku jaga Aula Lonceng', 'Bila urutan keliru, segel padam dan lonceng menolak. Tidak ada hukuman, hanya kewajiban mengulang dari awal.'),
  say('C02', 'NEUTRAL', 'Fajar, siang, senja, malam. Akan kuingat.'),
  say('C01', 'HAPPY', 'Dan kalau kau lupa, catatannya tetap di sini.'),
);
export const F_ARCHIVE_MEMORIAL = script('C4-FORT-ARCHIVE-MEMORIAL',
  narr('Ceruk kecil di dinding. Lilin-lilin yang sudah habis terbakar menumpuk di dasarnya, jumlahnya terlalu banyak untuk dihitung. Di tengah, lonceng tangan perunggu seukuran telapak, retak. Tidak ada nama, hanya satu tanda jaga yang dipahat berulang.'),
  say('C02', 'WORRIED', 'Seseorang menyalakan lilin di sini setiap hari, sampai lilinnya yang lebih dulu menyerah.'),
  say('C01', 'NEUTRAL', 'Siapa pun dia, dia belum selesai berduka.'),
);
export const F_ARCHIVE_CLOAK = script('C4-FORT-ARCHIVE-CLOAK',
  narr('Jubah jaga yang tersampir pada penyangga. Tepinya diberi benang sambungan yang rapi, tetapi jahitan terakhir belum selesai. Jarumnya masih tertancap.'),
  say('C02', 'WORRIED', 'Dijahit untuk seseorang yang tidak kembali. Dan berhenti di tengah.'),
);
export const F_ARCHIVE_SHELF = script('C4-FORT-ARCHIVE-SHELF',
  narr('Rak penuh buku jaga. Punggung tiap buku memuat tanggal yang sama, ditulis berulang oleh tangan yang berbeda, seolah hari itu dijalani berkali-kali.'),
  say('C01', 'NEUTRAL', 'Hari yang sama, tulisan yang berbeda.'),
  say('C02', 'STERN', 'Retakan ini sudah ada jauh sebelum kota kita merasakannya.'),
);
export const F_CHEST_ROBE = script('C4-FORT-CHEST-ROBE',
  narr('Peti kayu bertulang besi di belakang meja arsip. Di dalamnya terlipat jubah penjaga yang masih wangi cendana, tersimpan untuk seseorang yang sudah lama dinanti.'),
);

// ---------------------------------------------------------------------------------------------------------------------
// Ruang Uji Segel
// ---------------------------------------------------------------------------------------------------------------------
export const F_TRIAL_PLAQUE = script('C4-FORT-TRIAL-PLAQUE',
  read('Prasasti Ruang Uji', 'Penjaga tidak diuji dengan lawan yang lebih kuat, melainkan dengan beban yang harus ditanggung bersama.'),
  say('C02', 'NEUTRAL', 'Perisai bukan untuk melukai. Ia menahan sampai yang lain sempat bergerak.'),
);
export const F_CHEST_PLATE = script('C4-FORT-CHEST-PLATE',
  narr('Peti perlengkapan uji. Di dasarnya tersimpan zirah penjaga yang diminyaki rapi, seolah baru kemarin dipakai.'),
);

// ---------------------------------------------------------------------------------------------------------------------
// Koridor Retakan dan teka-teki Jangkar
// ---------------------------------------------------------------------------------------------------------------------
export const F_ANCHOR_HINT = script('C4-FORT-ANCHOR-HINT',
  say('C02', 'NEUTRAL', 'Jangkar waktu. Alurnya tiga garis, dan hanya dua yang menyala. Pasti menunjuk potongan lorong yang digerakkannya.'),
  say('C01', 'NEUTRAL', 'Satu jangkar menggeser dua potongan?'),
  say('C02', 'STERN', 'Dan satu potongan bisa digeser dua jangkar. Semuanya bisa dibalik; kita coba saja.'),
);
export const F_RIFT_SOLVED = script('C4-FORT-RIFT-SOLVED',
  narr('Potongan lorong terakhir jatuh ke tempatnya. Retakan tidak hilang, tetapi lantai itu kini diam.'),
  say('C02', 'NEUTRAL', 'Sejajar. Ia akan tetap begitu selama jangkarnya tidak diganggu.'),
  say('C01', 'NEUTRAL', 'Dan kalau ada yang mengganggu?'),
  say('C02', 'STERN', 'Kita bertemu mereka lebih dulu.'),
);

// ---------------------------------------------------------------------------------------------------------------------
// Serambi Heart
// ---------------------------------------------------------------------------------------------------------------------
export const F_LANTERN_COLD = script('C4-FORT-LANTERN-COLD',
  narr('Lentera jaga di serambi, dinginnya seperti besi yang lama tidak disentuh. Alur di tiangnya meminta tanda dari Ruang Uji Segel.'),
  say('C01', 'NEUTRAL', 'Berarti kita belum boleh beristirahat di sini.'),
  say('C02', 'STERN', 'Atau belum cukup siap untuk apa pun yang ada di balik pintu besar itu. Ruang Uji ada di sayap timur Aula Lonceng.'),
);
export const F_LANTERN_LIT = script('C4-FORT-LANTERN-LIT',
  narr('Lentera itu menyala begitu kau mendekat. Apinya tenang dan berwarna madu; udara di sekitarnya hangat, dan tidak bergeser.'),
  say('C01', 'NEUTRAL', 'Tempat yang aman. Setidaknya untuk sebentar.'),
  say('C02', 'NEUTRAL', 'Pintu Heart akan melepas bagi yang sudah menyalakan lentera ini. Tarik napas dulu.'),
);
export const F_DOOR_HEART = script('C4-FORT-DOOR-HEART',
  narr('Pintu besar berpahat lambang Heart: lingkaran dengan satu garis patah. Takik di ambangnya kosong.'),
  say('C02', 'STERN', 'Alurnya sama dengan lentera tadi. Pintu ini hanya melepas bagi yang sudah menyalakan lentera jaga.'),
);

// ---------------------------------------------------------------------------------------------------------------------
// Pintasan
// ---------------------------------------------------------------------------------------------------------------------
export const F_SHORTCUT_WINDOW = script('C4-FORT-SC-WINDOW',
  narr('Celah jaga di dinding. Dari sini tampak Koridor Retakan dari sisi lain: potongan-potongan lantainya bergeser sendiri, perlahan, lalu kembali, seperti napas.'),
  say('C02', 'NEUTRAL', 'Penjaga dulu menyebutnya lorong yang bernapas. Kita beruntung bisa melewatinya.'),
);
export const F_SHORTCUT_NOTE = script('C4-FORT-SC-NOTE',
  read('Catatan jalur jaga', 'Jalur jaga dari Serambi ke Aula Lonceng. Dibuka dari sisi ini dengan tuas, dan ditutup dari sisi aula supaya tidak ada yang tersesat dari bawah.'),
  read('Catatan jalur jaga', 'Siapa pun yang tiba dari Serambi: tarik tuasnya. Jangan tinggalkan jalan pulang dalam keadaan tertutup.'),
);
export const F_SHORTCUT_LEVER = script('C4-FORT-SC-LEVER',
  narr('Tuas besi yang dingin. Ditarik pelan, rantai di balik dinding bergemeretak, dan jauh di bawah sana sebuah pintu bergeser.'),
);

// ---------------------------------------------------------------------------------------------------------------------
// Ruang Heart
// ---------------------------------------------------------------------------------------------------------------------
export const F_HEART_EMBLEM = script('C4-FORT-HEART-EMBLEM',
  narr('Lambang Heart terpahat besar di dinding utara: lingkaran dengan satu garis patah, dililit rantai pahatan yang mata-matanya berkarat. Di kiri dan kanannya berdiri pengunci batu.'),
  say('C02', 'STERN', 'Rantai ini dipasang belakangan. Pahatan aslinya tidak punya rantai.'),
);
export const F_HEART_SEAL = script('C4-FORT-HEART-SEAL',
  narr('Cincin segel di lantai, separuhnya pecah. Serpihan di tepinya masih tajam, dan tidak ada lumut di sana.'),
  say('C02', 'STERN', 'Pecahannya baru, bukan tua. Segel yang asli retak dari dalam, dan penutup ini dibuat tergesa-gesa.'),
);
export const F_HEART_EMBLEM_OPEN = script('C4-FORT-HEART-EMBLEM-OPEN',
  narr('Garis patah pada lambang itu kini bertemu. Rantainya jatuh ke lantai sebagai serpihan, dan lingkarannya memancarkan cahaya pelan, tidak lebih terang dari lilin.'),
);
export const F_HEART_WINDOW_SHUT = script('C4-FORT-HEART-WINDOW-SHUT',
  narr('Jendela busur di dinding utara, tertutup lempengan batu bergurat lambang Heart. Cahaya senja merembes tipis di tepinya.'),
  say('C02', 'NEUTRAL', 'Dari jendela ini penjaga dulu mengamati kota. Ditutup oleh orang yang tidak ingin lagi melihatnya.'),
);
export const F_HEART_WINDOW_FALLEN = script('C4-FORT-HEART-WINDOW-FALLEN',
  narr('Garis atap yang sama, tetapi menara tuanya tinggal tonggak dan awan debu yang perlahan menipis.'),
  say('C02', 'WORRIED', 'Mereka sudah di luar kota tua. Aku harus mempercayai itu.'),
);

/** Semua naskah Benteng (untuk tes: ID unik, sumber DRAFT_IMPL, tanpa kata terlarang). */
export const FORTRESS_SCRIPTS: readonly DialogueScript[] = [
  F_OUTER_GATE, F_OUTER_STATUE, F_OUTER_CART, F_BELL, F_BELL_DIAL, F_SEAL_FIRST, F_SEAL_NOLOG, F_SEAL_SOLVED, F_TRIAL_GATE, F_DOOR_SEAL,
  F_DOOR_SHORTCUT, F_BARRACKS_NAMES, F_BARRACKS_BUNK, F_BARRACKS_TABLE, F_CHEST_POTION, F_ARCHIVE_LOG, F_ARCHIVE_MEMORIAL, F_ARCHIVE_CLOAK,
  F_ARCHIVE_SHELF, F_CHEST_ROBE, F_TRIAL_PLAQUE, F_CHEST_PLATE, F_ANCHOR_HINT, F_RIFT_SOLVED, F_LANTERN_COLD, F_LANTERN_LIT, F_DOOR_HEART,
  F_SHORTCUT_WINDOW, F_SHORTCUT_NOTE, F_SHORTCUT_LEVER, F_HEART_EMBLEM, F_HEART_SEAL, F_HEART_EMBLEM_OPEN, F_HEART_WINDOW_SHUT, F_HEART_WINDOW_FALLEN,
];
