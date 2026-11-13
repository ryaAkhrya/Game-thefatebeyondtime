import source from './aveloria.lines.json';
import type { CharacterId } from '../data/ids';
import type { DialogueLine, DialogueScript, ExpressionId } from './types';

/** Only Chapter I lines are bundled. No future chapters, private data or lore bible in runtime. */
export function cityScript(id: string): DialogueScript {
  return { id, nodes: source.filter(l => l.scene_id === id).map(l => ({ type: 'line', id: l.line_id,
    speaker: l.speaker_id as CharacterId, expression: l.emotion_id as ExpressionId,
    portrait: l.portrait_asset_path, text: l.spoken_text, pauseMs: l.pause_ms,
    kind: id === 'C1-09' ? 'thought' : 'speech', source: 'DIALOGUE_EVENTS' })) };
}
export function draft(id: string, speaker: CharacterId | 'SYSTEM', expression: ExpressionId | undefined, text: string, label?: string): DialogueLine {
  return { type: 'line', id, speaker, expression, text, label, kind: speaker === 'SYSTEM' ? 'system' : 'speech', source: 'DRAFT_IMPL', pauseMs: 400 };
}
export const CITY_VISTA: DialogueScript = { id: 'C1-06-VISTA', nodes: [
  draft('C1-06-X001', 'SYSTEM', undefined, 'Di balik pepohonan, jalan batu menuju gerbang Aveloria. Asap dapur naik di antara atap-atap kota.'),
] };
export const CITY_GATE = cityScript('C1-06');
export const CITY_ARCHIVE = cityScript('C1-07');
export const CITY_AUDIENCE = cityScript('C1-08');
// Flavor choices already proposed by CHAPTER_I_SCRIPT. Reply is explicitly DRAFT_IMPL, no lore branch.
CITY_AUDIENCE.nodes.splice(14, 0,
  { type: 'choice', id: 'C1-08-CHOICE', speaker: 'C01', options: [
    { id: 'offended', text: 'Aku tersinggung.', expression: 'EMBARRASSED' },
    { id: 'special', text: 'Berarti aku istimewa?', expression: 'HAPPY' },
  ] },
  draft('C1-08-X001', 'C02', 'AMUSED', 'Kau pandai menghindari pertanyaan. Sayangnya, aku masih punya beberapa.'),
);
export const REPORTS: DialogueScript = { id: 'C1-07-REPORTS', nodes: [
  { ...draft('C1-07-X001', 'SYSTEM', undefined, 'Tiga laporan kejadian di jalur yang sama, pada jam berbeda.'), source: 'CHAPTER_I_SCRIPT' },
  { ...draft('C1-07-X002', 'SYSTEM', undefined, 'Satu lembar memiliki tanggal yang tidak mungkin cocok dengan catatan penjaga.'), source: 'CHAPTER_I_SCRIPT' },
] };
export const BELL_FIRST: DialogueScript = { id: 'C1-09-FIRST', nodes: [
  draft('C1-09-X001', 'SYSTEM', undefined, 'Pukul sembilan. Lonceng menara berdentang.'),
  cityScript('C1-09').nodes[0]!,
] };
export const BELL_SECOND: DialogueScript = { id: 'C1-09-SECOND', nodes: [
  draft('C1-09-X002', 'SYSTEM', undefined, 'Pukul sembilan, sekali lagi. Lonceng kembali berdentang. Jarum menara belum berpindah.'),
  { ...draft('C1-09-X003', 'SYSTEM', undefined, 'Siapa yang membunyikannya lagi?', 'Penjaga'), source: 'CHAPTER_I_SCRIPT' },
  { ...draft('C1-09-X004', 'SYSTEM', undefined, 'Tidak ada orang di atas.', 'Penjaga lain'), source: 'CHAPTER_I_SCRIPT' },
  cityScript('C1-09').nodes[1]!,
  draft('C1-09-X005', 'C02', 'WORRIED', 'Tadi juga begitu. Rasanya... aku sudah mendengar yang kedua ini.'),
  draft('C1-09-X006', 'C01', 'CONFUSED', 'Aku juga. Tapi aku nggak tahu kapan.'),
  draft('C1-09-X007', 'C05', 'WORRIED', 'Dua dentang untuk jam yang sama. Akan kucocokkan dengan laporan penjaga.'),
  draft('C1-09-X008', 'C02', 'STERN', 'Talric, periksa menara. Azie, catat siapa saja yang mendengarnya. Jangan biarkan dugaan menggantikan laporan.'),
  draft('C1-09-X009', 'C06', 'ALARMED', 'Dan orang dari hutan ini?'),
  draft('C1-09-X010', 'C02', 'STERN', 'Tetap di kota. Belum ada alasan untuk menahannya. Aku ingin tahu apa yang sebenarnya terjadi.'),
] };
export const DERRRIA_GREETING: DialogueScript = { id: 'C1-MARKET', nodes: [
  draft('C1-MARKET-X001', 'C09', 'AMUSED', 'Kalau mencari botol yang tidak bocor, kau sudah di tempat yang tepat. Harganya ada di sini.'),
] };
export const CITIZEN_TEXT: Readonly<Record<string, [string, string, string]>> = {
  porter: ['Pembawa peti', 'Peti ini ke pasar. Aku mengambil jalan yang sama setiap pagi; sekarang penjaga selalu menanyakan jam keberangkatanku.', 'Kau juga dengar dua kali? Peti ini belum sempat kuturunkan.'],
  vendor: ['Penjual sayur', 'Yang di keranjang depan baru datang. Jangan tertukar dengan yang kusisihkan untuk dapur istana.', 'Aku baru saja menghitung uangnya. Tadi loncengnya sudah berbunyi, bukan?'],
  sweeper: ['Penyapu jalan', 'Halaman istana di utara. Sisakan jalan di tengah, ya. Daun-daun ini baru kusapu ke tepi.', 'Aku berhenti menyapu pada dentang pertama. Belum kulanjutkan, sudah berdentang lagi.'],
  guard: ['Penjaga', 'Azie menerima laporan di sebelah timur plaza. Ruang pertemuan dibuka setelah pemeriksaannya selesai.', 'Kapten memeriksa menara. Aku diminta mencatat orang yang mendengar kedua dentangnya.'],
};
