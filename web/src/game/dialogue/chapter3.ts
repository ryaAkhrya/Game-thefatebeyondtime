import source from './chapter3.lines.json';
import type { CharacterId } from '../data/ids';
import type { DialogueLine, DialogueScript, ExpressionId, LineKind } from './types';

/**
 * Chapter III (The Forgotten Promise), data dialog Phase 7.
 *
 * - 65 baris `DIALOGUE_EVENTS.json` C3-01..C3-07 dimasukkan VERBATIM (pembicara, ekspresi, jeda, portrait, teks), sekali
 *   saja, urut kanon (`source: 'DIALOGUE_EVENTS'`, ID asli C3-0n-Lxxx). Salinan ada di `chapter3.lines.json`.
 * - Semua baris lain adalah penghubung implementasi (`source: 'DRAFT_IMPL'`, ID C3-..-Xnnn): krisis istana, tuntutan Azie,
 *   penolakan Velthia, evakuasi, Torvan membantu warga, petunjuk puzzle, pengamatan kuil, Chronolith, nama Varlgrim lewat
 *   bukti. Naskah kerja `CHAPTER_III_SCRIPT.md` yang tidak ada di JSON (mis. "Tidak bergerak.", "Nah. Pintu ini...", tulisan
 *   "Perintah penjagaan: Varlgrim...") juga ditandai DRAFT_IMPL karena belum ada baris JSON-nya. Bukan naskah approved.
 * - Nama "Yaric" tampil lewat `speakerLabel` (speaker C01); pada Bab III flag `identity.name_known` sudah aktif. Narasi
 *   SYSTEM tidak menyebut nama itu.
 * - Disiplin spoiler: "Varlgrim" baru disebut pada C3_HIDDEN_NAME (bukti tulisan); tidak ada konten Bab IV, tidak ada
 *   pengakuan cinta, Torvan tidak menyebut identitas pencipta.
 */

interface SourceRow { scene_id: string; line_id: string; speaker_id: string; spoken_text: string; emotion_id: string; portrait_asset_path: string; pause_ms: number }
const rows = source as SourceRow[];

/** Baris kanon C3-0n-L<from>..L<to> (inklusif) sesuai JSON. */
export function chapter3Canon(scene: string, from = 1, to = Infinity): DialogueLine[] {
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
const aveloria = ids('C3-01');
const torvanStay = ids('C3-02');
const entranceCamp = ids('C3-03');
const puzzle = ids('C3-04');
const chrono = ids('C3-05');
const hidden = ids('C3-06');
const promise = ids('C3-07');
const npc = ids('C3-NPC');

type Who = CharacterId | 'SYSTEM';
function draft(id: string, speaker: Who, expression: ExpressionId | undefined, text: string, extra: { label?: string; kind?: LineKind; pauseMs?: number } = {}): DialogueLine {
  return { type: 'line', id, speaker, expression, label: extra.label, text,
    kind: extra.kind ?? (speaker === 'SYSTEM' ? 'system' : 'speech'), source: 'DRAFT_IMPL', pauseMs: extra.pauseMs ?? 350 };
}
const say = (next: () => string, speaker: CharacterId, expression: ExpressionId, text: string, pauseMs?: number): DialogueLine =>
  draft(next(), speaker, expression, text, { pauseMs });
const think = (next: () => string, text: string, expression: ExpressionId = 'NEUTRAL'): DialogueLine =>
  draft(next(), 'C01', expression, text, { kind: 'thought' });
const narr = (next: () => string, text: string, label?: string): DialogueLine => draft(next(), 'SYSTEM', undefined, text, { label });
const read = (next: () => string, text: string, label: string): DialogueLine => draft(next(), 'SYSTEM', undefined, text, { label, kind: 'read', pauseMs: 450 });
const script = (id: string, ...nodes: DialogueLine[]): DialogueScript => ({ id, nodes });

// ---------------------------------------------------------------------------------------------------------------------
// Aveloria (C3-01 dan C3-02): krisis, tuntutan Azie, penolakan, evakuasi, keputusan ikut ke kuil, Torvan tinggal membantu warga.
// ---------------------------------------------------------------------------------------------------------------------

/** DRAFT_IMPL: pembuka Bab III. Warga mengulang pekerjaan, gerbang terkunci pada waktu yang salah. */
export const C3_CRISIS_WATCH = script('C3-01-CRISIS',
  narr(aveloria, 'Pagi di Aveloria terasa salah. Lonceng menara berdentang dua kali untuk jam yang sama, dan hampir tidak ada yang menoleh.'),
  narr(aveloria, 'Keranjangnya sudah kuangkat tiga kali. Kenapa masih di sini? Rasanya baru saja kupindahkan.', 'Warga'),
  narr(aveloria, 'Gerbang dalam terkunci lagi. Kuncinya kuputar sendiri, tapi catatan jaga bilang sudah terbuka sejak fajar.', 'Penjaga'),
  think(aveloria, 'Mereka tidak sedang berpura-pura. Mereka sungguh lupa sudah mengerjakannya.', 'CONFUSED'),
  think(aveloria, 'Dan setiap kali lonceng itu berbunyi, ada yang melirik ke arahku.', 'NEUTRAL'),
  narr(aveloria, 'Azie mengangkat tangan dari ujung plaza, memberi isyarat agar ia datang ke ruang pertemuan.'),
);

/** DRAFT_IMPL: Azie menuntut Yaric ditahan. Argumen masuk akal; konflik profesional dengan Velthia, bukan pengkhianatan. */
export const C3_AZIE_DEMAND = script('C3-01-AZIE',
  say(aveloria, 'C05', 'WORRIED', 'Yang Mulia, tiga keluarga bangsawan sudah mengirim surat. Mereka bertanya siapa orang hutan yang selalu ada saat lonceng bergetar.'),
  say(aveloria, 'C05', 'NEUTRAL', 'Aku tidak menuduhnya sengaja. Tapi kalau ia ditahan dengan hormat di istana, orang akan melihat kita memegang kendali.'),
  say(aveloria, 'C01', 'ANGRY', 'Jadi aku ditahan supaya orang lain merasa tenang?'),
  say(aveloria, 'C05', 'SKEPTICAL', 'Sampai retakan ini dijelaskan. Dan jujur saja, aku belum punya bukti bahwa kau tidak ada hubungannya.'),
  say(aveloria, 'C02', 'STERN', 'Alasanmu masuk akal, Azie. Satu pertanyaan: kau meminta ini karena yakin akan menyelesaikan masalah, atau karena akan menenangkan mereka?'),
  say(aveloria, 'C05', 'NEUTRAL', 'Yang kedua, Yang Mulia. Dan itu pun bagian dari tugasku.'),
);

/** DRAFT_IMPL: Velthia menolak penahanan dan membalik prioritas ke keselamatan warga. */
export const C3_VELTHIA_REFUSES = script('C3-01-REFUSE',
  say(aveloria, 'C02', 'STERN', 'Tidak. Aku tidak akan menahan orang yang belum terbukti bersalah hanya agar istana tampak tegas.'),
  say(aveloria, 'C05', 'WORRIED', 'Kalau para bangsawan mengira Ratu melindungi orang asing—'),
  say(aveloria, 'C02', 'STERN', 'Maka mereka akan menyebutku keras kepala. Itu bisa kutanggung. Kota yang menunggu jawaban sementara warganya lupa jalan pulang, tidak.'),
  say(aveloria, 'C05', 'SKEPTICAL', 'Aku akan mencatat bahwa aku keberatan.'),
  say(aveloria, 'C02', 'NEUTRAL', 'Catat. Dan catat juga bahwa keberatanmu beralasan.'),
  say(aveloria, 'C01', 'DETERMINED', 'Aku nggak akan lari. Kalau ada yang bisa kubantu, bilang saja.'),
  say(aveloria, 'C02', 'NEUTRAL', 'Tetap di kota dan bantu Talric. Bukan sebagai tahanan.'),
);

/** DRAFT_IMPL: para bangsawan meragukan kepemimpinan Velthia. */
export const C3_NOBLES_DOUBT = script('C3-01-NOBLES',
  narr(aveloria, 'Yang Mulia melindungi pengembara yang asal-usulnya pun tidak jelas, sementara gerbang istana terkunci sendiri?', 'Bangsawan'),
  narr(aveloria, 'Dulu istana memberi jawaban sebelum rakyat sempat bertanya.', 'Bangsawan'),
  say(aveloria, 'C02', 'STERN', 'Dulu istana juga tidak punya lonceng yang berbunyi dua kali. Aku memerintah hari ini, bukan hari kemarin.'),
  say(aveloria, 'C02', 'NEUTRAL', 'Kalian boleh meragukanku. Kalian tidak boleh menghalangi evakuasi.'),
  narr(aveloria, 'Kalau ini ternyata sia-sia, rakyat akan bertanya siapa yang memberi perintah.', 'Bangsawan'),
  say(aveloria, 'C02', 'STERN', 'Dan aku akan menjawabnya. Itu satu hal yang tidak kuserahkan pada orang lain.'),
);

/** DRAFT_IMPL: perintah evakuasi kepada Talric. */
export const C3_EVAC_ORDER = script('C3-01-EVAC',
  say(aveloria, 'C02', 'STERN', 'Talric. Kosongkan sisi timur lebih dulu, lalu pasar. Bawa warga ke aula selatan, lalu ke titik aman di luar tembok.'),
  say(aveloria, 'C06', 'NEUTRAL', 'Dengan penjaga yang ada, bisa. Tapi gerbang dalam terkunci lagi.'),
  say(aveloria, 'C02', 'NEUTRAL', 'Pakai kunci cadangan di ruang jaga. Jangan menunggu catatan.'),
  say(aveloria, 'C06', 'SUSPICIOUS', 'Dan orang dari hutan itu, Yang Mulia?'),
  say(aveloria, 'C02', 'STERN', 'Bekerja bersamamu. Kau boleh mengawasinya sambil mengangkat tandu.'),
  say(aveloria, 'C06', 'NEUTRAL', 'Perintah diterima. Kota saya jaga.'),
);

/** DRAFT_IMPL: Talric memimpin evakuasi di gerbang; kepercayaan pada Yaric tumbuh lewat tindakan, bukan pidato. */
export const C3_TALRIC_EVAC = script('C3-01-TALRIC',
  say(aveloria, 'C06', 'ALARMED', 'Barisan pertama, jalan! Jangan berhenti di gerbang, jangan kembali mengambil barang!'),
  narr(aveloria, 'Tapi tokoku belum kututup...', 'Warga'),
  say(aveloria, 'C06', 'NEUTRAL', 'Toko bisa dibuka lagi. Orang tidak.'),
  say(aveloria, 'C06', 'SUSPICIOUS', 'Kau. Kalau mau berguna, angkat ujung belakang tandu itu. Aku belum memercayaimu, tapi aku butuh dua tangan lagi.'),
  say(aveloria, 'C01', 'DETERMINED', 'Bagian mana yang harus kuangkat?'),
  say(aveloria, 'C06', 'NEUTRAL', 'Ujung belakang. Lihat jalannya, jangan lihat menara.'),
  say(aveloria, 'C06', 'NEUTRAL', 'Setelah ini, Yang Mulia menunggumu di ruang peta.'),
);

/** C3-01 kanon (11 baris) + penutup DRAFT_IMPL: lambang pusaka sebagai alasan, bukan sekadar dekat Yaric. */
export const C3_DECISION = script('C3-01-DECISION',
  narr(aveloria, 'Azie membentangkan laporan kuil di atas meja peta. Talric kembali dari gerbang, masih berperlengkapan tugas.'),
  ...chapter3Canon('C3-01'),
  say(aveloria, 'C05', 'NEUTRAL', 'Kutulis di jurnal istana: lambang pada pintu kuil cocok dengan lambang pusaka kerajaan di arsip. Itu alasannya.'),
  say(aveloria, 'C02', 'NEUTRAL', 'Itu alasannya.'),
  say(aveloria, 'C01', 'CONFUSED', 'Aku nggak bilang apa-apa.'),
  say(aveloria, 'C05', 'NEUTRAL', 'Bagus. Tetap begitu.'),
  say(aveloria, 'C06', 'NEUTRAL', 'Jalur timur sampai pos tua masih aman. Setelah itu kalian sendiri. Selama Yang Mulia pergi, kota saya jaga.'),
  say(aveloria, 'C02', 'STERN', 'Teruskan evakuasinya. Perintah itu tetap berlaku sampai aku kembali.'),
);

/** C3-02 kanon (7 baris) + penghubung DRAFT_IMPL. Torvan membantu warga; ia bukan hilang atau anggota ketiga. */
export const C3_TORVAN_STAYS = script('C3-02-TORVAN',
  narr(torvanStay, 'Di aula selatan, Torvan duduk di antara warga yang menunggu giliran. Ia membagikan roti, dan seorang anak tertawa karenanya.'),
  say(torvanStay, 'C01', 'NEUTRAL', 'Torvan. Velthia ikut aku ke kuil. Kau tetap di sini bersama warga.'),
  ...chapter3Canon('C3-02'),
  narr(torvanStay, 'Susunan rombongan berubah: Velthia kini maju bersama sang pengembara. Torvan menunggu di titik aman, perlengkapannya tetap padanya.'),
  say(torvanStay, 'C03', 'CURIOUS', 'Lagi pula, di sini lebih perlu orang yang bisa memegang ember daripada pedang.'),
  say(torvanStay, 'C02', 'WORRIED', 'Terima kasih, Torvan. Jaga mereka.'),
  say(torvanStay, 'C03', 'NEUTRAL', 'Tentu. Aku di sini sampai kalian kembali.'),
);

/** DRAFT_IMPL: keberangkatan dari gerbang timur. */
export const C3_DEPART = script('C3-02-DEPART',
  say(torvanStay, 'C06', 'NEUTRAL', 'Kota saya jaga. Kembalilah, Yang Mulia.'),
  say(torvanStay, 'C02', 'NEUTRAL', 'Aku akan kembali. Kalau ada yang membantah perintahku saat aku pergi, tulis siapa orangnya.'),
  say(torvanStay, 'C05', 'WORRIED', 'Bawa pulang jawabannya, bukan sekadar cerita.'),
  say(torvanStay, 'C01', 'NEUTRAL', 'Jalur timur sampai pos tua, kan? Siapa yang memegang peta?'),
  say(torvanStay, 'C02', 'AMUSED', 'Aku. Kau cukup menunjuk kalau ada yang terasa familiar.'),
  narr(torvanStay, 'Keduanya meninggalkan gerbang timur menuju Kuil Jejak.'),
);

// ---------------------------------------------------------------------------------------------------------------------
// NPC ambien Aveloria (DRAFT_IMPL, boleh diulang).
// ---------------------------------------------------------------------------------------------------------------------
export const C3_NPC_CITIZEN_1 = script('C3-NPC-CITIZEN-1',
  narr(npc, 'Halaman ini sudah kusapu tiga kali. Tanganku lecet, tapi aku tidak ingat pernah menyapunya.', 'Warga'));
export const C3_NPC_CITIZEN_2 = script('C3-NPC-CITIZEN-2',
  narr(npc, 'Anakku bertanya jalan ke rumah kami sendiri. Tadi pagi ia masih hafal.', 'Warga'));
export const C3_NPC_CITIZEN_3 = script('C3-NPC-CITIZEN-3',
  narr(npc, 'Timbangan ini kuhitung dua kali dan hasilnya berbeda. Sekarang angka pun ikut kacau.', 'Pedagang'));
export const C3_NPC_CITIZEN_4 = script('C3-NPC-CITIZEN-4',
  narr(npc, 'Kalau lonceng berbunyi dua kali, aku duduk dan menunggu yang ketiga. Biasanya tidak datang.', 'Warga tua'));
export const C3_NPC_TALRIC_BUSY = script('C3-NPC-TALRIC',
  say(npc, 'C06', 'NEUTRAL', 'Aku sedang menghitung barisan. Bicara nanti, kalau kota sudah kosong.'));
export const C3_NPC_AZIE_WATCH = script('C3-NPC-AZIE',
  say(npc, 'C05', 'WORRIED', 'Sudah empat puluh baris kejadian yang tidak cocok. Polanya belum terlihat.'));
export const C3_NPC_TORVAN_HELPING = script('C3-NPC-TORVAN',
  say(npc, 'C03', 'MISCHIEVOUS', 'Aku membawa tiga ember dan satu anak. Tolong jangan tanya mana yang lebih berat.'));
export const C3_NPC_NOBLE = script('C3-NPC-NOBLE',
  narr(npc, 'Aku tidak bilang Ratu keliru. Aku hanya ingin tahu siapa yang ia dengarkan.', 'Bangsawan'));
export const C3_NPC_EVAC_DONE = script('C3-NPC-EVACDONE',
  say(npc, 'C06', 'NEUTRAL', 'Barisan terakhir sudah lewat. Tidak ada yang tertinggal.'));

// ---------------------------------------------------------------------------------------------------------------------
// Kuil Jejak (C3-03..C3-07).
// ---------------------------------------------------------------------------------------------------------------------

/** DRAFT_IMPL: tiba di kuil; perbedaan pendapat jujur tentang menunggu fajar (tanpa pengakuan perasaan). */
export const C3_TEMPLE_ENTRANCE = script('C3-03-ENTRANCE',
  narr(entranceCamp, 'Kuil Jejak berdiri di ujung lembah, separuh tenggelam dalam akar dan lumut. Pada pintunya terukir lambang yang sama dengan segel di arsip.'),
  say(entranceCamp, 'C02', 'NEUTRAL', 'Cocok. Sampai ke garis patahnya.'),
  say(entranceCamp, 'C01', 'CONFUSED', 'Nggak ada tuas, nggak ada gagang. Pintunya cuma... tertutup.'),
  say(entranceCamp, 'C02', 'STERN', 'Kita menunggu fajar. Pintu seperti ini tidak kita baca dalam gelap.'),
  say(entranceCamp, 'C01', 'DETERMINED', 'Setiap jam yang kita tunggu, ada orang yang lupa jalan pulang. Dan mereka menyalahkanku.'),
  say(entranceCamp, 'C02', 'WORRIED', 'Aku tahu. Aku juga memikirkannya. Tapi satu salah baca di sini bisa menutup satu-satunya jawaban kita.'),
  say(entranceCamp, 'C01', 'SAD', 'Maaf. Aku nggak marah sama kamu.'),
  say(entranceCamp, 'C02', 'NEUTRAL', 'Kau boleh marah. Jangan pakai itu untuk membuka pintunya.'),
);

/** C3-03 kanon (17 baris) + pembuka/penutup dan jeda panggung sebagai DRAFT_IMPL. */
export const C3_TEMPLE_CAMP = (() => {
  const canon = chapter3Canon('C3-03');
  const bridge = narr(entranceCamp, 'Velthia hendak memindahkan peta dari dekat bara, tetapi petanya sudah lebih dulu digeser menjauh. Keduanya berhenti sejenak.');
  return script('C3-03-CAMP',
    narr(entranceCamp, 'Api menyala kecil, tanpa pendar apa pun. Seutas tali dijemur di dekatnya; Velthia memperbaiki simpul pada peta.'),
    ...canon.slice(0, 15), bridge, ...canon.slice(15),
    narr(entranceCamp, 'Api mengecil. Malam lewat tanpa gangguan, dan fajar datang pelan di antara akar-akar kuil.'),
  );
})();

/** DRAFT_IMPL: masuk lorong; menjelaskan tiga penanda tanpa membocorkan solusi. */
export const C3_PUZZLE_INTRO = script('C3-04-INTRO',
  narr(puzzle, 'Di lorong dalam, tiga penanda menghadap lingkaran di lantai: pilar dua garis, segel tua pada dinding, dan alas dengan jejak yang dihapus.'),
  say(puzzle, 'C02', 'NEUTRAL', 'Pintu aula tidak punya kunci. Alurnya menunggu ketiganya selesai.'),
  say(puzzle, 'C01', 'CONFUSED', 'Jadi kita membuktikan sesuatu kepada sebuah pintu?'),
  say(puzzle, 'C02', 'AMUSED', 'Mungkin kepada diri sendiri. Mulai dari yang terlihat.'),
);

/** Kanon C3-04 L001..L002: objek satu, pilar dua garis (boleh dibaca ulang). */
export const C3_PUZZLE_HINT_A = script('C3-04-HINT-A', ...chapter3Canon('C3-04', 1, 2));
/** Kanon C3-04 L003..L005: objek dua, segel lama. */
export const C3_PUZZLE_HINT_B = script('C3-04-HINT-B', ...chapter3Canon('C3-04', 3, 5));
/** DRAFT_IMPL: objek tiga + salah urutan (dari naskah kerja: "Tidak bergerak." / "Coba lihat bagian yang ditutup."). */
export const C3_PUZZLE_HINT_C = script('C3-04-HINT-C',
  say(puzzle, 'C01', 'NEUTRAL', 'Tidak bergerak.'),
  say(puzzle, 'C02', 'NEUTRAL', 'Coba lihat bagian yang ditutup. Itu petunjuknya.'),
  say(puzzle, 'C01', 'CONFUSED', 'Bekas pahatnya lebih baru dari batu di sekelilingnya.'),
  say(puzzle, 'C02', 'WORRIED', 'Seseorang menutupnya dengan sengaja, dan rapi. Orang yang tergesa-gesa tidak akan serapi itu.'),
);

export const C3_PUZZLE_SOLVED_A = script('C3-04-SOLVED-A',
  say(puzzle, 'C02', 'NEUTRAL', 'Dua garis bertemu di satu lingkaran. Lantainya bergeser sedikit.'),
  say(puzzle, 'C01', 'SURPRISED', 'Batu ini ikut berpikir.'));
export const C3_PUZZLE_SOLVED_B = script('C3-04-SOLVED-B',
  say(puzzle, 'C02', 'NEUTRAL', 'Lambangnya terbaca utuh sekarang. Sama dengan pusaka yang kusimpan di istana.'),
  say(puzzle, 'C01', 'CONFUSED', 'Berarti tempat ini memang berhubungan dengan kerajaanmu.'));
export const C3_PUZZLE_SOLVED_C = script('C3-04-SOLVED-C',
  say(puzzle, 'C01', 'DETERMINED', 'Garis ketiga terbuka. Ketiganya sekarang menyatu.'),
  say(puzzle, 'C02', 'WORRIED', 'Orang yang menutupnya tahu apa yang dikuncinya.'));

/** DRAFT_IMPL: catatan di dinding; petunjuk netral, bukan penjelasan lore. */
export const C3_PUZZLE_NOTE = script('C3-04-NOTE',
  read(puzzle, '"Tiga garis, satu lingkaran. Yang ditutup belakangan bukan berarti yang dilupakan."', 'Catatan di dinding'),
  say(puzzle, 'C02', 'NEUTRAL', 'Tulisan ini bukan bagian dari salinan istana.'),
  say(puzzle, 'C01', 'NEUTRAL', 'Berarti belum ada yang sempat memotongnya.'));

/** DRAFT_IMPL dari naskah kerja ("Nah. Pintu ini rupanya masih mau mendengar alasan." / "Aku lebih suka pintu biasa."). */
export const C3_GATE_OPEN = script('C3-04-GATE',
  narr(puzzle, 'Pintu aula bergeser perlahan, dengan bunyi batu yang sudah lama tidak dipanggil.'),
  say(puzzle, 'C02', 'AMUSED', 'Nah. Pintu ini rupanya masih mau mendengar alasan.'),
  say(puzzle, 'C01', 'HAPPY', 'Aku lebih suka pintu biasa.'));

/** DRAFT_IMPL: pengamatan opsional (pemain memeriksa sendiri). Tidak menyebut nama Varlgrim. */
export const C3_TEMPLE_INSPECT_1 = script('C3-04-INSPECT-1',
  narr(puzzle, 'Lukisan dinding yang separuh terkelupas: dua sosok berjalan dari arah berlawanan menuju satu lingkaran. Wajah keduanya digores habis.'),
  say(puzzle, 'C02', 'WORRIED', 'Digores dari luar. Itu bukan perbuatan waktu.'),
  say(puzzle, 'C01', 'CONFUSED', 'Siapa yang mau menghapus wajah dua orang yang sedang berjalan?'));
export const C3_TEMPLE_INSPECT_2 = script('C3-04-INSPECT-2',
  narr(puzzle, 'Relief lingkaran dengan satu garis patah terpahat di atas ambang.'),
  say(puzzle, 'C02', 'NEUTRAL', 'Lingkaran dengan satu garis patah. Sama dengan lambang pada pusaka kerajaan.'),
  say(puzzle, 'C01', 'NEUTRAL', 'Kerajaanmu pernah punya urusan dengan tempat ini.'),
  say(puzzle, 'C02', 'NEUTRAL', 'Atau tempat ini pernah punya urusan dengan kerajaanku. Aku ingin tahu mana yang benar.'));
export const C3_TEMPLE_INSPECT_3 = script('C3-04-INSPECT-3',
  narr(puzzle, 'Tiga alas batu berjajar menghadap lingkaran di lantai. Satu alas diratakan; bekas pahatnya masih tajam.'),
  say(puzzle, 'C02', 'NEUTRAL', 'Yang ketiga dihapus belakangan. Yang lain sudah berlumut.'),
  say(puzzle, 'C01', 'NEUTRAL', 'Berarti dulu ada tiga, dan ada yang nggak ingin kita tahu.'));
export const C3_TEMPLE_INSPECT_4 = script('C3-04-INSPECT-4',
  narr(puzzle, 'Di ambang aula, sebuah cincin logam retak terpasang pada dinding. Pengikatnya jelas bukan bagian bangunan asli.'),
  say(puzzle, 'C02', 'NEUTRAL', 'Pengikat ini dipasang jauh sesudah kuil dibangun. Seseorang menambahkannya.'),
  say(puzzle, 'C01', 'CONFUSED', 'Menambahkannya untuk menahan apa?'),
  say(puzzle, 'C02', 'NEUTRAL', 'Itu yang akan terbaca kalau kita sampai ke dalam.'));

/** C3-05 L001..L004 kanon + pembuka DRAFT_IMPL. Pertarungan Chronolith mengikuti. */
export const C3_CHRONOLITH_INTRO = script('C3-05-INTRO',
  narr(chrono, 'Pintu di belakang mereka menutup sendiri. Di tengah aula, sebuah blok batu berukir bergerak dalam pola berulang, lalu tersendat.'),
  say(chrono, 'C02', 'WORRIED', 'Arsip menyebutnya Chronolith. Penjaga kuil.'),
  ...chapter3Canon('C3-05', 1, 4),
  say(chrono, 'C02', 'STERN', 'Polanya berulang. Hitung geraknya selagi aku menutup celahnya.'),
);

/** C3-05 L005..L006 kanon + ramalan yang salah dibaca (DRAFT_IMPL). Tidak ada nama Varlgrim di sini. */
export const C3_CHRONOLITH_OUTRO = script('C3-05-OUTRO',
  ...chapter3Canon('C3-05', 5, 6),
  narr(chrono, 'Blok batu itu diam. Dari retakan pada intinya, sebuah lempeng catatan tergeser keluar.'),
  read(chrono, '"Pada akhir zaman dua jalan bertemu. Kehancuran yang terlihat hanyalah satu kemungkinan, bukan hukuman bagi mereka yang bertemu."', 'Lempeng catatan'),
  say(chrono, 'C02', 'SURPRISED', 'Ini bagian ramalan yang utuh. Salinan istana hanya memuat setengahnya.'),
  say(chrono, 'C01', 'CONFUSED', 'Jadi cerita yang kita dengar di Liora memang terpotong.'),
  say(chrono, 'C02', 'WORRIED', 'Terpotong, atau dipotong. Aku tahu mana yang lebih kutakutkan.'),
  say(chrono, 'C01', 'SAD', 'Aku sudah lelah dianggap penyebabnya. Kalau tulisan ini benar, bukan kita.'),
  say(chrono, 'C02', 'NEUTRAL', 'Kalau benar. Kita belum tahu siapa yang memotongnya.'),
);

/** Kanon C3-06 (5 baris) + bukti tertulis DRAFT_IMPL: Varlgrim, segel, Heart of Time, retakan, Benteng Kala. */
export const C3_HIDDEN_NAME = script('C3-06-HIDDEN',
  read(hidden, '"Perintah penjagaan: Varlgrim. Segel dipasang untuk menahan jalan yang ditakuti."', 'Tulisan'),
  ...chapter3Canon('C3-06'),
  read(hidden, '"Heart of Time disegel. Inti segel berada di Benteng Kala. Retakan waktu pertama tercatat sesudah segel dipasang."', 'Tulisan'),
  say(hidden, 'C02', 'WORRIED', 'Retakannya muncul sesudah segel, bukan sebelumnya. Urutannya sulit diabaikan.'),
  say(hidden, 'C01', 'NEUTRAL', 'Tapi belum cukup untuk menyimpulkan.'),
  say(hidden, 'C02', 'NEUTRAL', 'Belum. Itu sebabnya kita ke Benteng Kala.', 550),
);

/** C3-07 L001..L009 kanon + pembuka DRAFT_IMPL. Janji belum dipaparkan lengkap. */
export const C3_PROMISE = script('C3-07-PROMISE',
  narr(promise, 'Di dekat pintu keluar, peta digeser menjauh dari tetesan air. Velthia berhenti tiba-tiba.'),
  ...chapter3Canon('C3-07', 1, 9),
  narr(promise, 'Sekejap, tetesan air di lorong itu terdengar seperti sebuah suara di tempat lain. Kemudian lenyap. Tidak ada yang mengatakan apa-apa.', undefined),
);

/** C3-07 L010..L014 kanon (Torvan di jalur aman) + penutup DRAFT_IMPL yang bersiap menuju Benteng Kala. */
export const C3_CHAPTER_END = script('C3-07-END',
  narr(promise, 'Di jalur aman di luar kuil, Torvan menunggu bersandar pada batu, tangan di saku.'),
  ...chapter3Canon('C3-07', 10, 14),
  say(promise, 'C01', 'CONFUSED', 'Bagaimana kau tahu jalannya? Tidak ada yang lewat sini bertahun-tahun.'),
  say(promise, 'C03', 'MISCHIEVOUS', 'Aku bertanya pada orang yang lewat.'),
  say(promise, 'C02', 'SURPRISED', 'Torvan.'),
  say(promise, 'C03', 'NEUTRAL', 'Pertanyaan bagus. Kita lanjut?'),
  say(promise, 'C02', 'NEUTRAL', 'Tulisan di kuil menyebut Heart of Time dan sebuah segel.'),
  say(promise, 'C03', 'SOLEMN', 'Heart of Time.', 550),
  say(promise, 'C03', 'NEUTRAL', 'Baiklah. Istirahat dulu, kalian berdua kelihatan seperti baru dikejar jam.'),
  say(promise, 'C01', 'NEUTRAL', 'Kita kabari Aveloria dulu. Setelah itu Benteng Kala.'),
  narr(promise, 'Kuil Jejak mereka tinggalkan. Di depan, jalan menuju Benteng Kala.'),
);

// ---------------------------------------------------------------------------------------------------------------------
// Registri dan peta cakupan kanon.
// ---------------------------------------------------------------------------------------------------------------------
export const C3_SCRIPTS: Record<string, DialogueScript> = {
  C3_CRISIS_WATCH, C3_AZIE_DEMAND, C3_VELTHIA_REFUSES, C3_NOBLES_DOUBT, C3_EVAC_ORDER, C3_TALRIC_EVAC, C3_DECISION, C3_TORVAN_STAYS, C3_DEPART,
  C3_NPC_CITIZEN_1, C3_NPC_CITIZEN_2, C3_NPC_CITIZEN_3, C3_NPC_CITIZEN_4, C3_NPC_TALRIC_BUSY, C3_NPC_AZIE_WATCH, C3_NPC_TORVAN_HELPING,
  C3_NPC_NOBLE, C3_NPC_EVAC_DONE,
  C3_TEMPLE_ENTRANCE, C3_TEMPLE_CAMP, C3_PUZZLE_INTRO, C3_PUZZLE_HINT_A, C3_PUZZLE_HINT_B, C3_PUZZLE_HINT_C,
  C3_PUZZLE_SOLVED_A, C3_PUZZLE_SOLVED_B, C3_PUZZLE_SOLVED_C, C3_PUZZLE_NOTE, C3_GATE_OPEN,
  C3_TEMPLE_INSPECT_1, C3_TEMPLE_INSPECT_2, C3_TEMPLE_INSPECT_3, C3_TEMPLE_INSPECT_4,
  C3_CHRONOLITH_INTRO, C3_CHRONOLITH_OUTRO, C3_HIDDEN_NAME, C3_PROMISE, C3_CHAPTER_END,
};

/** Adegan kanon -> skrip yang memainkannya (urut). Dipakai tes untuk membuktikan 65 baris tepat sekali dan berurutan. */
export const C3_CANON_COVERAGE: readonly { sceneId: string; lineCount: number; scripts: readonly string[] }[] = [
  { sceneId: 'C3-01', lineCount: 11, scripts: ['C3_DECISION'] },
  { sceneId: 'C3-02', lineCount: 7, scripts: ['C3_TORVAN_STAYS'] },
  { sceneId: 'C3-03', lineCount: 17, scripts: ['C3_TEMPLE_CAMP'] },
  { sceneId: 'C3-04', lineCount: 5, scripts: ['C3_PUZZLE_HINT_A', 'C3_PUZZLE_HINT_B'] },
  { sceneId: 'C3-05', lineCount: 6, scripts: ['C3_CHRONOLITH_INTRO', 'C3_CHRONOLITH_OUTRO'] },
  { sceneId: 'C3-06', lineCount: 5, scripts: ['C3_HIDDEN_NAME'] },
  { sceneId: 'C3-07', lineCount: 14, scripts: ['C3_PROMISE', 'C3_CHAPTER_END'] },
];
