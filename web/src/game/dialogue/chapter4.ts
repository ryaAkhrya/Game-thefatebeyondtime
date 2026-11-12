import source from './chapter4.lines.json';
import type { CharacterId } from '../data/ids';
import type { DialogueChoice, DialogueLine, DialogueNode, DialogueScript, ExpressionId, LineKind } from './types';

/**
 * Chapter IV (The Fate), data dialog Phase 8.
 *
 * - 36 baris `DIALOGUE_EVENTS.json` C4-01..C4-07 dimasukkan VERBATIM (pembicara, ekspresi, jeda, portrait, teks), sekali
 *   saja, urut kanon (`source: 'DIALOGUE_EVENTS'`, ID asli C4-0n-Lxxx). Salinan ada di `chapter4.lines.json`.
 * - Semua baris lain adalah penghubung implementasi (`source: 'DRAFT_IMPL'`, ID `C4-..-Xnnn`): laporan Talric, arsip dan
 *   Perlindungan, kesaksian Varlgrim, Heart dibuka bersama, Ruang Gema, pengakuan Varlgrim, batas kekuasaan Torvan,
 *   kepulangan ke Aveloria, dan banner battle. Bukan naskah approved; menunggu review Game Director.
 * - Kebenaran terungkap bertahap. Varlgrim tragis, hemat bicara, konkret; tidak ada pengampunan instan dan nasib akhirnya
 *   tidak dipastikan. Torvan mengaku pencipta tetapi menolak menghapus kebebasan memilih maupun akibat tindakan.
 * - "Yaric" tampil lewat `speakerLabel` (speaker C01). Narasi SYSTEM tidak menyebut nama itu. Tidak ada konten modern,
 *   tidak ada adegan tebing epilog, tidak ada kredit.
 * - Ekspresi `REMORSE` (C04) dibutuhkan baris kanon tetapi belum ada pada union `ExpressionId` (types.ts bukan milik N);
 *   dilewatkan lewat cast terpusat `REMORSE` di bawah. Lihat docs/production/sprint4/N.md.
 */

interface SourceRow { scene_id: string; line_id: string; speaker_id: string; spoken_text: string; emotion_id: string; portrait_asset_path: string; pause_ms: number }
const rows = source as SourceRow[];

/** Baris kanon C4-0n-L<from>..L<to> (inklusif) sesuai JSON. */
export function chapter4Canon(scene: string, from = 1, to = Infinity): DialogueLine[] {
  return rows
    .filter(l => l.scene_id === scene && Number(l.line_id.slice(-3)) >= from && Number(l.line_id.slice(-3)) <= to)
    .map(l => ({ type: 'line' as const, id: l.line_id, speaker: l.speaker_id as CharacterId, expression: l.emotion_id as ExpressionId,
      portrait: l.portrait_asset_path, text: l.spoken_text, pauseMs: l.pause_ms, kind: 'speech' as const, source: 'DIALOGUE_EVENTS' as const }));
}

/** Pembangkit ID berurutan per awalan (deterministik; urutan pemanggilan = urutan impor modul). */
function ids(prefix: string): () => string {
  let n = 0;
  return () => `${prefix}-X${String(++n).padStart(3, '0')}`;
}
const arrival = ids('C4-01');
const reportIds = ids('C4-REPORT');
const archiveIds = ids('C4-ARCHIVE');
const aegisIds = ids('C4-AEGIS');
const riftIds = ids('C4-RIFTBORN');
const confront = ids('C4-02');
const bossIds = ids('C4-BOSS');
const lean = ids('C4-03');
const heart = ids('C4-04');
const memory = ids('C4-05');
const truth = ids('C4-06');
const homeward = ids('C4-07');

type Who = CharacterId | 'SYSTEM';
/** Ekspresi C04 yang belum ada pada union ExpressionId (portrait diturunkan agen BA). */
const REMORSE = 'REMORSE' as string as ExpressionId;

function draft(id: string, speaker: Who, expression: ExpressionId | undefined, text: string, extra: { label?: string; kind?: LineKind; pauseMs?: number } = {}): DialogueLine {
  return { type: 'line', id, speaker, expression, label: extra.label, text,
    kind: extra.kind ?? (speaker === 'SYSTEM' ? 'system' : 'speech'), source: 'DRAFT_IMPL', pauseMs: extra.pauseMs ?? 350 };
}
type Next = () => string;
const say = (next: Next, speaker: CharacterId, expression: ExpressionId, text: string, pauseMs?: number): DialogueLine =>
  draft(next(), speaker, expression, text, { pauseMs });
// Penutur tetap, supaya naskah mudah dibaca.
const yaric = (n: Next, e: ExpressionId, t: string, p?: number): DialogueLine => say(n, 'C01', e, t, p);
const velthia = (n: Next, e: ExpressionId, t: string, p?: number): DialogueLine => say(n, 'C02', e, t, p);
const torvan = (n: Next, e: ExpressionId, t: string, p?: number): DialogueLine => say(n, 'C03', e, t, p);
const varlgrim = (n: Next, e: ExpressionId, t: string, p?: number): DialogueLine => say(n, 'C04', e, t, p);
const azie = (n: Next, e: ExpressionId, t: string, p?: number): DialogueLine => say(n, 'C05', e, t, p);
const talric = (n: Next, e: ExpressionId, t: string, p?: number): DialogueLine => say(n, 'C06', e, t, p);
const narr = (next: Next, text: string, label?: string, pauseMs?: number): DialogueLine => draft(next(), 'SYSTEM', undefined, text, { label, pauseMs });
const read = (next: Next, text: string, label: string): DialogueLine => draft(next(), 'SYSTEM', undefined, text, { label, kind: 'read', pauseMs: 450 });
const script = (id: string, ...nodes: DialogueNode[]): DialogueScript => ({ id, nodes });

// ---------------------------------------------------------------------------------------------------------------------
// Benteng Kala: gerbang, laporan, arsip, Perlindungan, Riftborn pertama.
// ---------------------------------------------------------------------------------------------------------------------

/** C4-01 L001..L004 kanon + pembuka dan penutup DRAFT_IMPL. Hening singkat, lalu kontrol kembali ke pemain. */
export const C4_ARRIVAL = script('C4-01-ARRIVAL',
  narr(arrival, 'Gerbang Luar Benteng Kala berdiri miring di antara dua batu hitam. Jam logam di atasnya berdentang terlalu cepat, lalu diam, lalu berdentang lagi.'),
  narr(arrival, 'Di balik gerbang, lorong bergeser kembali ke bentuk semula dengan bunyi batu menggesek batu. Selama beberapa napas tidak ada yang bicara.'),
  ...chapter4Canon('C4-01'),
  narr(arrival, 'Pintu bergeser sedikit, berhenti, lalu bergeser lagi, seperti ragu apakah mereka boleh masuk. Keduanya melangkah masuk.'),
);

/** DRAFT_IMPL: pos kurir di Gerbang Luar. Laporan Talric pendek, praktis, tanpa basa-basi. */
export const C4_REPORT_A = script('C4-REPORT-A',
  read(reportIds, '"Kepada Yang Mulia. Sisi timur dan pasar sudah kosong. Warga kawasan menara tua baru separuh keluar. Lonceng menara berhenti sejak subuh."', 'Laporan Talric'),
  read(reportIds, '"Azie masih membantah perintah menutup arsip bawah. Bantahannya kucatat, perintahnya kujalankan. Kota saya jaga. Talric."', 'Laporan Talric'),
  velthia(reportIds, 'NEUTRAL', 'Bantahan dicatat, perintah dijalankan. Begitulah cara Talric bekerja.'),
  yaric(reportIds, 'NEUTRAL', 'Dia terdengar seperti orang yang belum tidur sejak kita berangkat.'),
  velthia(reportIds, 'WORRIED', 'Memang belum. Jangan kita buat ia menunggu lebih lama dari yang perlu.'),
);

/** DRAFT_IMPL: pos kurir di Serambi Heart. Menyiapkan "Talric mengabariku tadi" pada C4-04-L002. */
export const C4_REPORT_B = script('C4-REPORT-B',
  read(reportIds, '"Kawasan menara sudah kosong. Retak di fondasinya melebar sejak tengah hari, dan kami tak bisa menahannya lagi."', 'Laporan Talric'),
  read(reportIds, '"Bila menara jatuh sebelum Yang Mulia kembali, jangan berbalik. Selesaikan yang di sana. Kota saya jaga. Talric."', 'Laporan Talric'),
  yaric(reportIds, 'CONFUSED', 'Dia menyuruhmu jangan pulang kalau menaranya jatuh?'),
  velthia(reportIds, 'STERN', 'Dia menulisnya seolah sudah siap kumarahi. Kalau menara itu harus jatuh, biar jatuh dalam keadaan kosong. Itu sudah kuusahakan.'),
  velthia(reportIds, 'NEUTRAL', 'Ayo. Kita selesaikan yang di sini.'),
);

/** DRAFT_IMPL: Arsip Penjaga. Lore kehilangan Varlgrim tanpa menyebut namanya sebagai pelaku; pusaka bergema, Perlindungan terbuka. */
export const C4_ARCHIVE_VELTHIA = script('C4-ARCHIVE',
  narr(archiveIds, 'Arsip Penjaga: rak-rak batu penuh gulungan yang disusun menurut jaga, bukan menurut tahun. Satu rak dikosongkan dengan sengaja.'),
  read(archiveIds, '"Jaga ketiga: seorang penjaga memasuki retakan pertama untuk memeriksanya dan tidak kembali. Arsip ini ditutup oleh penjaga kepala."', 'Catatan jaga'),
  yaric(archiveIds, 'NEUTRAL', 'Ada yang masuk ke retakan itu dan tidak keluar lagi.'),
  velthia(archiveIds, 'WORRIED', 'Dan penulisnya tidak menuliskan namanya. Seolah menyebutnya saja terlalu sakit.'),
  narr(archiveIds, 'Pusaka kerajaan di pinggang Velthia menghangat. Lingkaran dengan satu garis patah itu menyala tipis, lalu garis patahnya tertutup sesaat.'),
  velthia(archiveIds, 'SURPRISED', 'Pusakaku bergema. Ia mengenali sesuatu di arsip ini.'),
  narr(archiveIds, 'Di tepi lingkaran muncul satu kata terukir cahaya: Perlindungan.'),
  velthia(archiveIds, 'NEUTRAL', 'Bukan serangan. Ia menutup lingkaran di sekeliling siapa pun yang berdiri bersamaku, dan hanya mau dipanggil setelah ia berkumpul.'),
  yaric(archiveIds, 'CONFUSED', 'Kapan harus dipanggil?'),
  velthia(archiveIds, 'STERN', 'Tepat sebelum sesuatu jatuh. Terlalu cepat sia-sia, terlalu lambat tidak berguna. Aku yang menentukan, dan kau menjagaku sampai saat itu.'),
  yaric(archiveIds, 'DETERMINED', 'Itu bagian yang bisa kukerjakan.'),
);

/** DRAFT_IMPL: Ruang Uji Segel. Tutorial Perlindungan yang boleh gagal dan diulang. */
export const C4_AEGIS_TRIAL_INTRO = script('C4-AEGIS-INTRO',
  narr(aegisIds, 'Ruang Uji Segel: lantai berlingkar, dinding bergurat bekas benturan. Di tengahnya seekor Riftborn bergerak lamban, bukan liar, seperti sedang diperintah.'),
  velthia(aegisIds, 'NEUTRAL', 'Para penjaga memakai ruangan ini untuk menguji segel. Penguji itu menghimpun retakan, lalu menghantam sekali, keras.'),
  velthia(aegisIds, 'STERN', 'Saat ia mengumpulkan retakan itulah saatnya Perlindungan. Bukan sesudahnya.'),
  yaric(aegisIds, 'CONFUSED', 'Kalau aku salah menghitung?'),
  velthia(aegisIds, 'AMUSED', 'Kita ulang. Ruangan ini memang dibuat supaya orang boleh salah dulu.'),
  yaric(aegisIds, 'NEUTRAL', 'Akhirnya ada ruangan yang masuk akal.'),
);

export const C4_AEGIS_TRIAL_DONE = script('C4-AEGIS-DONE',
  narr(aegisIds, 'Riftborn itu runtuh menjadi serpihan pucat. Lingkaran di lantai memudar, seperti menarik napas lega.'),
  yaric(aegisIds, 'SURPRISED', 'Pukulan tadi seharusnya melemparkanku ke dinding. Aku cuma merasa ditekan.'),
  velthia(aegisIds, 'WORRIED', 'Perlindungan bukan kekebalan. Yang datang nanti jauh lebih berat, dan kau akan merasakan tekanannya.'),
  velthia(aegisIds, 'STERN', 'Kalau Varlgrim memanggil sesuatu yang besar, tidak akan ada waktu untuk ragu. Giliranku harus kudapat.'),
  yaric(aegisIds, 'DETERMINED', 'Akan kujaga.'),
);

/** DRAFT_IMPL: pertemuan pertama dengan Riftborn di Gerbang Luar. Gambaran, bukan eksposisi. */
export const C4_RIFTBORN_FIRST = script('C4-RIFTBORN-FIRST',
  narr(riftIds, 'Dari retakan di dinding, sesuatu merangkak keluar: bentuknya seperti bayangan orang yang sedang jatuh, tetapi sangat lambat.'),
  yaric(riftIds, 'SURPRISED', 'Itu bukan Hollowling.'),
  velthia(riftIds, 'STERN', 'Hollowling menjauhi retakan. Yang ini keluar dari sana. Riftborn.'),
  yaric(riftIds, 'CONFUSED', 'Kau tahu namanya?'),
  velthia(riftIds, 'NEUTRAL', 'Arsip Azie menyebutnya satu kali. Yang kuingat: ia menghimpun retakan dulu, baru menghantam.'),
  yaric(riftIds, 'DETERMINED', 'Kalau begitu jangan biarkan ia selesai menghimpun.'),
);

// ---------------------------------------------------------------------------------------------------------------------
// Ruang Heart: kesaksian, pertarungan, Heart dibuka bersama.
// ---------------------------------------------------------------------------------------------------------------------

/**
 * C4-02 L001..L006 kanon. Satu `choice` untuk Yaric disisipkan setelah L003 (respons dua frasa; keduanya bermuara ke L004
 * kanon tanpa cabang lore). Dua opsi adalah kalimat pembuka, bukan L004 itu sendiri, supaya L004 tetap muncul tepat sekali.
 */
const CONFRONT_CHOICE: DialogueChoice = {
  type: 'choice', id: 'C4-02-CHOICE', speaker: 'C01', options: [
    { id: 'skeptic', text: 'Berdiri? Dari sini lantainya kelihatan miring.', expression: 'CONFUSED' },
    { id: 'gentle', text: 'Aku tahu kau takut. Aku tidak bermaksud menyerangmu.', expression: 'NEUTRAL' },
  ],
};
export const C4_CONFRONT = (() => {
  const canon = chapter4Canon('C4-02');
  return script('C4-02-CONFRONT',
    narr(confront, 'Ruang Heart. Varlgrim berdiri dekat simbol itu, bukan di takhta. Tongkat kayu berpilin di tangannya, ujungnya menyentuh lantai seperti tongkat peziarah.'),
    narr(confront, 'Ia menggerakkan satu tangan. Di udara terbit kilasan: menara retak, orang-orang berlarian, lonceng berhenti di tengah dentang.', undefined, 600),
    ...canon.slice(0, 3),
    CONFRONT_CHOICE,
    ...canon.slice(3),
    narr(confront, 'Varlgrim menurunkan tangannya. Kilasan itu padam. Ia memandang simbol Heart sebentar, lebih lama dari yang ia pandang mereka.'),
    varlgrim(confront, 'STERN', 'Aku tidak akan mencabutnya. Aku tidak punya dendam pada kalian, dan karena itu aku minta maaf. Tapi kalian harus melewatiku.'),
    narr(confront, 'Ia mengangkat tongkatnya, tanpa tergesa.'),
  );
})();

/** DRAFT_IMPL: sebelum pertarungan. Pemain diberi tahu dengan bahasa dunia kapan memilih Perlindungan. */
export const C4_BOSS_INTRO = script('C4-03-INTRO',
  narr(bossIds, 'Varlgrim menanam ujung tongkatnya ke lantai. Udara di ruangan itu melambat satu napas, lalu kembali.'),
  velthia(bossIds, 'STERN', 'Dengarkan. Kalau ia mengangkat tongkat dan menahan langit, jangan menyerang.'),
  velthia(bossIds, 'STERN', 'Beri aku giliran. Perlindungan, tepat saat langit tertahan. Itu satu-satunya jalan keluar.'),
  yaric(bossIds, 'NEUTRAL', 'Dan sampai saat itu?'),
  velthia(bossIds, 'NEUTRAL', 'Kita bertarung seperti biasa. Pelan, tapi jangan berhenti.'),
  varlgrim(bossIds, 'STERN', 'Kalian mempelajari sesuatu di bawah tadi. Bagus. Aku tidak ingin mengalahkan orang yang belum siap.'),
);

/** C4-03 L001..L002 kanon + jeda. Varlgrim jatuh bertumpu pada tongkat, tidak meledak. */
export const C4_VICTORY_LEAN = script('C4-03-LEAN',
  narr(lean, 'Langit di atas ruangan kembali kosong. Varlgrim berlutut, kedua tangan bertumpu pada tongkatnya. Napasnya berat, tetapi teratur.', undefined, 500),
  ...chapter4Canon('C4-03'),
  narr(lean, 'Varlgrim tidak menjawab. Pandangannya tertuju pada simbol Heart di dinding, bukan pada mereka.'),
);

/** DRAFT_IMPL: dua pengunci yang harus dibuka bersama (bukan otomatis setelah boss). */
export const C4_HEART_APPROACH = script('C4-04-APPROACH',
  narr(heart, 'Simbol Heart tertanam di dinding: lingkaran besar dengan satu garis patah, diapit dua pengunci batu di kiri dan kanan. Retakan merambat di antara keduanya.'),
  yaric(heart, 'NEUTRAL', 'Dua pengunci. Satu di sisi sana, satu di sisi sini.'),
  velthia(heart, 'NEUTRAL', 'Dibuat supaya tidak ada yang bisa membukanya sendirian.'),
  yaric(heart, 'CONFUSED', 'Siapa yang membuat sesuatu seperti itu?'),
  velthia(heart, 'WORRIED', 'Orang yang tahu betapa bahayanya satu orang mengambil keputusan sendirian.'),
  narr(heart, 'Ia sempat melirik Varlgrim, yang tidak mengangkat kepala.'),
  yaric(heart, 'DETERMINED', 'Kalau begitu kita lakukan berdua. Aku yang kiri?'),
  velthia(heart, 'AMUSED', 'Kau selalu berbelok ke kiri. Untuk sekali ini, bagus.'),
);

export const C4_HEART_LOCK_YARIC = script('C4-04-LOCK-YARIC',
  narr(heart, 'Sang pengembara menaruh telapak tangannya pada pengunci kiri. Batunya dingin, lalu hangat, lalu bergetar pelan.'),
  yaric(heart, 'NEUTRAL', 'Sudah di sisiku. Tinggal sisimu.'),
  narr(heart, 'Pengunci itu menyala redup dan menunggu.'),
);

export const C4_HEART_LOCK_VELTHIA = script('C4-04-LOCK-VELTHIA',
  narr(heart, 'Velthia menyentuh pengunci kanan. Pusaka di pinggangnya menyala sesaat, selaras dengan cahaya samar di sisi seberang.'),
  velthia(heart, 'NEUTRAL', 'Sudah di sisiku. Tinggal sisimu.'),
  narr(heart, 'Pengunci itu menyala redup dan menunggu.'),
);

/** DRAFT_IMPL: Heart terbuka. Tanpa ledakan; gangguan mereda, jendela busur menghadap Aveloria. */
export const C4_HEART_OPEN = script('C4-04-OPEN',
  narr(heart, 'Kedua pengunci menyala bersamaan. Simbol Heart berputar sekali, perlahan, dan garis patahnya merapat.'),
  narr(heart, 'Tidak ada ledakan cahaya. Suara retakan yang sejak tadi merambat di dinding mereda, seperti napas panjang yang akhirnya dilepas.'),
  velthia(heart, 'WORRIED', 'Retakannya berhenti melebar.'),
  yaric(heart, 'NEUTRAL', 'Berhenti saja. Tidak menutup.'),
  velthia(heart, 'NEUTRAL', 'Untuk sekarang itu sudah cukup.'),
  narr(heart, 'Di sisi ruangan, sebuah jendela busur terbuka, menghadap ke arah Aveloria. Varlgrim tetap di tempatnya. Ia hanya menatap simbol itu menutup.'),
);

/** C4-04 L001..L004 kanon + pembuka dan penutup DRAFT_IMPL. Kamera hanya menunjukkan debu dari kejauhan. */
export const C4_TOWER_FALL = script('C4-04-TOWER',
  narr(heart, 'Dari jendela busur, jauh di ufuk, gumpalan debu naik perlahan di atas atap-atap kota tua. Menara yang biasanya terlihat dari mana pun sudah tidak ada.'),
  ...chapter4Canon('C4-04'),
  narr(heart, 'Lonceng tidak terdengar. Dari jarak sejauh ini tidak ada yang berlari, dan hanya itu yang membuat debu tersebut bisa dipandang.'),
  narr(heart, 'Sang pengembara berdiri di sampingnya dan tidak berkata apa-apa. Velthia tidak menjauh.'),
  velthia(heart, 'STERN', 'Ayo. Masih ada yang harus diselesaikan di sini.'),
);

// ---------------------------------------------------------------------------------------------------------------------
// Ruang Gema: dua benda kuno, ingatan lama (hanya Aveloria).
// ---------------------------------------------------------------------------------------------------------------------

export const C4_MEMORY_ENTER = script('C4-05-ENTER',
  narr(memory, 'Di ujung ruangan, dinding yang tadinya rata terbuka menjadi lengkungan. Ruang Gema: lantainya mengilap seperti air yang membeku.'),
  velthia(memory, 'NEUTRAL', 'Ruangan ini terbuka setelah Heart. Pelan-pelan saja.'),
  yaric(memory, 'NEUTRAL', 'Aku belum menyentuh apa-apa.'),
  velthia(memory, 'AMUSED', 'Belum. Ada dua benda di sana. Lihat satu per satu.'),
);

export const C4_MEMORY_A = script('C4-05-A',
  narr(memory, 'Selembar peta kulit terbaring di atas alas batu, separuh pudar. Dua jalur digambar di atasnya dengan dua tulisan tangan: satu rapi, satu miring dan berbelok-belok.'),
  yaric(memory, 'CONFUSED', 'Jalur yang miring itu. Entah kenapa aku merasa bisa mengenali kesalahannya.'),
  velthia(memory, 'NEUTRAL', 'Dua orang menggambar peta yang sama dan tidak sepakat.'),
  narr(memory, 'Saat disentuh, peta itu berubah seperti uap dingin di telapak tangan, lalu kembali. Benda ini hanya gema dan tidak bisa diangkat.'),
);

export const C4_MEMORY_B = script('C4-05-B',
  narr(memory, 'Di alas lain tergeletak dua keping logam kecil. Masing-masing separuh lingkaran; bila didekatkan, garis patahnya bertemu dan menjadi utuh.'),
  velthia(memory, 'VULNERABLE', 'Aku mengenali ini. Aku tidak ingat kapan, tapi tanganku tahu cara memegangnya.'),
  yaric(memory, 'SURPRISED', 'Separuh milikku, separuh milikmu?'),
  velthia(memory, 'NEUTRAL', 'Begitulah rasanya.'),
  narr(memory, 'Keping-keping itu memudar di ujung jari, seperti napas di kaca. Ruangan mulai bergetar halus.'),
);

/** C4-05 L001..L004 kanon + penutup DRAFT_IMPL: mereka memilih, bukan karena ramalan. Tanpa pidato, tanpa pengakuan panjang. */
export const C4_OLD_MEMORY = script('C4-05-MEMORY',
  narr(memory, 'Cahaya di Ruang Gema menarik diri ke satu titik. Sesaat ruangan ini tampak seperti dulu: bersih, belum retak, dan dua sosok berdiri di tengahnya tanpa wajah yang jelas.', undefined, 600),
  ...chapter4Canon('C4-05'),
  velthia(memory, 'NEUTRAL', 'Waktu itu tidak ada ramalan yang menyuruh kita. Kita yang memutuskan.'),
  yaric(memory, 'NEUTRAL', 'Aku cuma ingat memutuskannya. Rasanya seperti keputusanku sendiri.'),
  velthia(memory, 'NEUTRAL', 'Memang.'),
  velthia(memory, 'VULNERABLE', 'Ingatan ini terasa rapuh. Seperti bisa tumpah kalau kupegang terlalu keras.'),
  yaric(memory, 'NEUTRAL', 'Kalau begitu pegang pelan-pelan. Aku di sini.'),
  narr(memory, 'Gema itu padam. Keping logam tadi sudah tidak ada, tetapi keduanya masih menggenggam tangan masing-masing, seperti menyimpan sesuatu.'),
);

// ---------------------------------------------------------------------------------------------------------------------
// Varlgrim dan Torvan (C4-06).
// ---------------------------------------------------------------------------------------------------------------------

/**
 * C4-06 L001..L003 kanon + pengakuan DRAFT_IMPL. Varlgrim konkret, tidak membela diri. Velthia tetap tegas: tanggung jawab
 * diakui, tidak ada maaf instan, keputusan tentang dirinya ditunda. Nasib akhir tidak dipastikan.
 */
export const C4_VARLGRIM_TRUTH = (() => {
  const canon = chapter4Canon('C4-06', 1, 3);
  return script('C4-06-TRUTH',
    narr(truth, 'Varlgrim berdiri di ambang Ruang Gema, bertumpu pada tongkatnya. Gema yang tersisa memutar sesuatu hanya untuknya.'),
    narr(truth, 'Sebuah segel dipasang. Sesaat kemudian, di tepinya, retakan pertama muncul. Varlgrim tidak berkedip.', undefined, 500),
    canon[0]!,
    varlgrim(truth, REMORSE, 'Retak pertama ada di segelku. Aku memasangnya, dan dari sanalah semuanya merambat.'),
    varlgrim(truth, REMORSE, 'Aku membaca setengah ramalan, lalu percaya pada setengah itu. Aku salah menghitung risikonya.'),
    varlgrim(truth, 'SAD', 'Ingatan kalian berdua, akulah yang memisahkannya. Kukira itu cara menjauhkan kalian dari akhir yang kulihat.'),
    yaric(truth, 'ANGRY', 'Jadi itu sebabnya aku bangun di hutan tanpa tahu namaku sendiri.'),
    varlgrim(truth, 'SAD', 'Ya.', 600),
    varlgrim(truth, 'STERN', 'Aku tidak akan menyebutnya kesalahpahaman. Aku memilihnya, dan akulah yang menanggungnya.'),
    canon[1]!,
    velthia(truth, 'STERN', 'Rumah yang roboh dan orang yang kehilangan hari-harinya tidak kembali hanya karena kau sudah melihat semuanya.'),
    canon[2]!,
    yaric(truth, 'CONFUSED', 'Kau mau menahan retakan yang kau buat sendiri. Setelah semua ini?'),
    varlgrim(truth, 'STERN', 'Aku tahu di mana segelku paling rapuh. Itu satu-satunya hal yang masih bisa kukerjakan dengan benar.'),
    velthia(truth, 'STERN', 'Kerjakan. Tentang dirimu, keputusannya kuambil nanti, di depan orang-orang yang kau rugikan. Bukan malam ini, dan bukan hanya di hadapanku.'),
    varlgrim(truth, 'NEUTRAL', 'Itu adil.'),
    narr(truth, 'Ia berjalan ke dinding yang paling retak dan menanamkan ujung tongkatnya di celah itu. Retakan kecil di sana berhenti merambat. Ia tidak menoleh lagi.'),
  );
})();

/**
 * C4-06 L004..L010 kanon + batas kekuasaan Torvan (DRAFT_IMPL). Ia tenang dan sedikit jenaka; tidak ada efek dewa. Ia menolak
 * menghapus pilihan maupun akibat, tidak menghidupkan korban, tidak mengampuni Varlgrim, tidak mengatur siapa yang dipedulikan.
 */
export const C4_TORVAN_REVEAL = (() => {
  const canon = chapter4Canon('C4-06', 4, 10);
  const byId = (id: string): DialogueLine => canon.find(l => l.id === id)!;
  return script('C4-06-TORVAN',
    narr(truth, 'Langkah ringan terdengar dari lorong. Torvan berdiri di ambang Ruang Gema, tangan di saku, sepatunya berlumpur kering.'),
    byId('C4-06-L004'), byId('C4-06-L005'), byId('C4-06-L006'), byId('C4-06-L007'), byId('C4-06-L008'), byId('C4-06-L009'), byId('C4-06-L010'),
    velthia(truth, 'STERN', 'Berlatih apa, tepatnya?'),
    torvan(truth, 'MISCHIEVOUS', 'Mengatakannya tanpa membuat orang berlutut. Tolong jangan berlutut. Lantainya dingin.'),
    velthia(truth, 'STERN', 'Kalau begitu jawab satu hal. Kalau kau bisa membuat dunia, kenapa menara itu dibiarkan jatuh?'),
    torvan(truth, 'SOLEMN', 'Karena segel itu dipasang oleh orang yang memilih memasangnya. Aku tidak berhak mencabut pilihan manusia, dan tidak berhak menghapus akibatnya.'),
    yaric(truth, 'SAD', 'Orang-orang yang sudah hilang karena retakan ini. Tidak bisa kau...'),
    torvan(truth, 'SAD', 'Tidak. Dan itu bukan karena aku tidak peduli.', 600),
    torvan(truth, 'SOLEMN', 'Kalau akibat bisa kubatalkan sesuka hati, pilihan kalian tidak lagi berarti apa-apa.'),
    narr(truth, 'Torvan menoleh pada Varlgrim yang masih berdiri di dinding yang retak.'),
    torvan(truth, 'SOLEMN', 'Varlgrim. Aku tidak datang untuk mengampunimu. Itu bukan hakku.'),
    varlgrim(truth, 'NEUTRAL', 'Aku tidak mengharapkannya.'),
    torvan(truth, 'NEUTRAL', 'Bagus. Teruskan pekerjaanmu.'),
    yaric(truth, 'CONFUSED', 'Dan ramalan itu? The Fate? Dua jalan bertemu, jadi memang sudah ditulis begitu?'),
    torvan(truth, 'DETERMINED', 'Bukan perintah. Hanya catatan bahwa dua jalan bisa bertemu, di mana pun mereka berada.'),
    torvan(truth, 'NEUTRAL', 'Siapa yang kalian pedulikan setelah bertemu, itu bukan tulisanku. Aku tidak mengatur itu.'),
    yaric(truth, 'EMBARRASSED', 'Aku tidak berniat bertanya soal itu.'),
    torvan(truth, 'MISCHIEVOUS', 'Kau menoleh pada Velthia sebelum aku selesai bicara.'),
    velthia(truth, 'AMUSED', 'Aku melihatnya.'),
  );
})();

/** DRAFT_IMPL: Torvan pergi dengan cara sederhana. Tanpa hadiah, tanpa efek, tanpa menghidupkan siapa pun. */
export const C4_TORVAN_LEAVES = script('C4-06-LEAVES',
  torvan(truth, 'NEUTRAL', 'Tidak ada hadiah perpisahan, kalau kau berharap. Kalian sudah punya cukup banyak.'),
  torvan(truth, 'MISCHIEVOUS', 'Lagi pula, di Aveloria ada tiga ember yang belum selesai kuisi.'),
  yaric(truth, 'CONFUSED', 'Kau pergi begitu saja?'),
  torvan(truth, 'SOLEMN', 'Begitu saja. Yang tersisa di sini bukan pekerjaanku, dan aku tidak mau mencurinya dari kalian.'),
  velthia(truth, 'WORRIED', 'Kau akan kembali?'),
  torvan(truth, 'NEUTRAL', 'Mungkin. Kalau ada roti.'),
  narr(truth, 'Torvan berjalan ke lorong tanpa menoleh. Langkahnya terdengar sampai tikungan, lalu tidak lagi. Saat sang pengembara menyusul, lorong itu kosong.'),
);

/** DRAFT_IMPL: resolusi emosional singkat Yaric dan Velthia. Gestur kecil, tanpa pidato; bukan adegan tebing epilog. */
export const C4_AFTER_TORVAN = script('C4-06-AFTER',
  yaric(truth, 'NEUTRAL', 'Aku pernah menyuruh anak itu mencuci kaki sebelum masuk istana.'),
  velthia(truth, 'AMUSED', 'Dan ia mencucinya. Itu juga sebuah pilihan.'),
  yaric(truth, 'SAD', 'Aku masih belum ingat semuanya. Mungkin tidak akan pernah.'),
  velthia(truth, 'NEUTRAL', 'Kau tidak butuh semuanya untuk memutuskan apa yang kau lakukan malam ini.'),
  yaric(truth, 'EMBARRASSED', 'Malam ini aku mau pulang ke Aveloria dan memeriksa apakah semua orang sudah makan.'),
  velthia(truth, 'AMUSED', 'Itu kalimat paling masuk akal yang kudengar hari ini.'),
  narr(truth, 'Mereka berjalan berdampingan ke gerbang. Tangan sang pengembara sempat terulur, lalu ditariknya kembali. Velthia berpura-pura tidak melihat.'),
);

// ---------------------------------------------------------------------------------------------------------------------
// Pulang (C4-07).
// ---------------------------------------------------------------------------------------------------------------------

/** DRAFT_IMPL: Gerbang Luar saat pulang. Jam kembali tepat waktu; panggilan balik pada candaan peta di C4-01. */
export const C4_RETURN_GATE = script('C4-07-GATE',
  narr(homeward, 'Jam logam di atas Gerbang Luar berdentang sekali, tepat pada waktunya. Lorong di baliknya diam dan tidak bergeser lagi.'),
  yaric(homeward, 'NEUTRAL', 'Jamnya berbunyi pada waktunya.'),
  velthia(homeward, 'NEUTRAL', 'Satu hal yang berjalan benar hari ini.'),
  yaric(homeward, 'CONFUSED', 'Jalan pulang ke Aveloria lewat mana?'),
  velthia(homeward, 'AMUSED', 'Lewat jalan yang tadi kita masuki. Jangan tanya siapa yang memegang peta.'),
  yaric(homeward, 'NEUTRAL', 'Aku tidak akan tanya.'),
  velthia(homeward, 'NEUTRAL', 'Bagus.'),
);

/** C4-07 L001..L006 kanon + DRAFT_IMPL: harga nyata (menara hilang, arsip terkubur, satu penjaga gugur), tanpa pesta. */
export const C4_RETURN_AVELORIA = (() => {
  const canon = chapter4Canon('C4-07');
  return script('C4-07-AVELORIA',
    narr(homeward, 'Malam turun di atas Aveloria. Di tempat menara tua dulu berdiri kini hanya ada langit terbuka dan debu yang turun pelan. Warga menunggu di luar tembok, berselimut.'),
    canon[0]!,
    azie(homeward, 'NEUTRAL', 'Evakuasi berjalan sesuai urutan Yang Mulia. Kuperiksa dua kali, dan aku tidak suka harus memeriksanya dua kali.'),
    azie(homeward, 'WORRIED', 'Arsip bawah menara terkubur hampir seluruhnya. Aku keberatan waktu perintah menutupnya turun. Ternyata perintah itu benar.'),
    talric(homeward, 'NEUTRAL', 'Satu penjaga gerbang bawah terlambat keluar. Kami menemukannya sore tadi. Namanya sudah kucatat.'),
    velthia(homeward, 'WORRIED', 'Tulis juga keluarganya. Aku sendiri yang akan menemui mereka.'),
    azie(homeward, 'WORRIED', 'Dewan tetap menunggu jawaban soal menara itu. Evakuasimu tepat. Persoalannya belum selesai.'),
    ...canon.slice(1),
    talric(homeward, 'SUSPICIOUS', 'Satu laporan lagi, Yang Mulia. Anak yang membagi roti di aula selatan pergi tanpa pamit. Ember-embernya disusun rapi dekat sumur.'),
    velthia(homeward, 'NEUTRAL', 'Catat saja: pergi atas kehendaknya sendiri.'),
    talric(homeward, 'NEUTRAL', 'Itu bukan catatan yang biasa saya tulis.'),
    velthia(homeward, 'AMUSED', 'Hari ini bukan hari yang biasa.'),
    narr(homeward, 'Lonceng terakhir yang masih utuh berbunyi sekali, tepat pada waktunya. Tidak seorang pun menghitungnya dua kali.'),
  );
})();

// ---------------------------------------------------------------------------------------------------------------------
// Banner battle (teks sangat pendek; <= 80 karakter).
// ---------------------------------------------------------------------------------------------------------------------
export const C4_BATTLE_CALLOUTS: Record<string, { speaker: CharacterId; expression: ExpressionId; text: string }> = {
  phase2: { speaker: 'C04', expression: 'STERN', text: 'Waktu di sini mulai bengkok. Jaga langkah kalian.' },
  phase3: { speaker: 'C04', expression: 'DETERMINED', text: 'Inilah akhir yang kulihat. Aku tidak akan membiarkannya terjadi.' },
  meteor_call: { speaker: 'C02', expression: 'STERN', text: 'Langit itu akan jatuh. Hanya Perlindungan yang menahannya. Beri aku giliran!' },
  meteor_hold: { speaker: 'C04', expression: 'STERN', text: 'Aku menunggu. Lindungi diri kalian sebelum ini jatuh.' },
  meteor_survived: { speaker: 'C01', expression: 'DETERMINED', text: 'Kita masih berdiri! Lanjutkan sebelum ia memanggil lagi.' },
  aegis_taught: { speaker: 'C02', expression: 'NEUTRAL', text: 'Pusaka ini mengajarkanku Perlindungan: satu perisai untuk kita berdua.' },
  defeat_hint: { speaker: 'C02', expression: 'WORRIED', text: 'Ingat: saat langit ditahan, Perlindungan lebih penting daripada serangan.' },
};

// ---------------------------------------------------------------------------------------------------------------------
// Registri dan peta cakupan kanon.
// ---------------------------------------------------------------------------------------------------------------------
export const C4_SCRIPTS: Record<string, DialogueScript> = {
  C4_ARRIVAL, C4_REPORT_A, C4_REPORT_B, C4_ARCHIVE_VELTHIA, C4_AEGIS_TRIAL_INTRO, C4_AEGIS_TRIAL_DONE, C4_RIFTBORN_FIRST,
  C4_CONFRONT, C4_BOSS_INTRO, C4_VICTORY_LEAN, C4_HEART_APPROACH, C4_HEART_LOCK_YARIC, C4_HEART_LOCK_VELTHIA, C4_HEART_OPEN,
  C4_TOWER_FALL, C4_MEMORY_ENTER, C4_MEMORY_A, C4_MEMORY_B, C4_OLD_MEMORY, C4_VARLGRIM_TRUTH, C4_TORVAN_REVEAL,
  C4_TORVAN_LEAVES, C4_AFTER_TORVAN, C4_RETURN_GATE, C4_RETURN_AVELORIA,
};

/** Adegan kanon -> skrip yang memainkannya (urut). Dipakai tes untuk membuktikan 36 baris tepat sekali dan berurutan. */
export const C4_CANON_COVERAGE: readonly { sceneId: string; lineCount: number; scripts: readonly string[] }[] = [
  { sceneId: 'C4-01', lineCount: 4, scripts: ['C4_ARRIVAL'] },
  { sceneId: 'C4-02', lineCount: 6, scripts: ['C4_CONFRONT'] },
  { sceneId: 'C4-03', lineCount: 2, scripts: ['C4_VICTORY_LEAN'] },
  { sceneId: 'C4-04', lineCount: 4, scripts: ['C4_TOWER_FALL'] },
  { sceneId: 'C4-05', lineCount: 4, scripts: ['C4_OLD_MEMORY'] },
  { sceneId: 'C4-06', lineCount: 10, scripts: ['C4_VARLGRIM_TRUTH', 'C4_TORVAN_REVEAL'] },
  { sceneId: 'C4-07', lineCount: 6, scripts: ['C4_RETURN_AVELORIA'] },
];
