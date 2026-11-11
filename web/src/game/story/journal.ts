import { CITY_FLAG } from './aveloriaFlags';
import { C2 } from './chapter2Flags';
import { FIRST_HOLLOWLING_FLAG } from '../combat/BattleSession';
import { MOURNFANG_FLAG } from '../combat/encounters';
import { IDENTITY_FLAG } from './identity';

/**
 * Catatan Jurnal, diturunkan dari flag (selalu konsisten dengan save). Naskah kerja DRAFT_IMPL, bukan dialog approved.
 * Ditulis dari sudut pandang pemain ("aku") dan TIDAK menyebut nama protagonis sebelum identitasnya terungkap.
 */
export interface JournalNote {
  id: string;
  title: string;
  text: string;
}

interface NoteDef extends JournalNote {
  when: (f: Readonly<Record<string, boolean>>) => boolean;
}

const has = (flag: string) => (f: Readonly<Record<string, boolean>>): boolean => !!f[flag];

const NOTES: readonly NoteDef[] = [
  { id: 'wake', title: 'Terbangun', when: has('c1.intro_seen'),
    text: 'Aku terbangun di hutan tanpa ingatan. Sebilah pedang besar tertancap di tanah, dan tanganku tahu cara memegangnya.' },
  { id: 'nambo', title: 'Nambo', when: has('story.c1_nambo'),
    text: 'Seorang pengembara bernama Nambo menunjuk jalan ke kota Aveloria, di timur. Ia sendiri tersesat: pohon yang sama muncul dua kali.' },
  { id: 'loop', title: 'Jalan berulang', when: has('story.c1_loop'),
    text: 'Papan penunjuk dan pohon yang sama muncul lagi dan lagi. Jalan ini tidak berpindah; aku yang tidak maju sampai menyadarinya.' },
  { id: 'hollowling', title: 'Hollowling', when: has(FIRST_HOLLOWLING_FLAG),
    text: 'Makhluk berbentuk kabut menghadang di jalan. Tubuhku bergerak sendiri dan aku menang.' },
  { id: 'mournfang', title: 'Mournfang', when: has(MOURNFANG_FLAG),
    text: 'Penjaga tepi hutan bernama Mournfang tumbang. Jalan ke timur terbuka kembali.' },
  { id: 'gate', title: 'Gerbang Aveloria', when: has(CITY_FLAG.gate),
    text: 'Talric, kepala penjaga, menahanku di gerbang dan bertanya namaku. Aku belum bisa menjawab.' },
  { id: 'archive', title: 'Arsip Azie', when: has(CITY_FLAG.archive),
    text: 'Azie mencatat laporan orang yang kehilangan ingatan. Sebagian warga menyebut kejadian ini The Fate; tak ada dua laporan yang sepakat.' },
  { id: 'velthia', title: 'Ratu Velthia', when: has(CITY_FLAG.velthia),
    text: 'Ratu Velthia mengizinkanku tinggal di kota untuk sementara. Ia bertanya terlalu teliti untuk sekadar rasa ingin tahu.' },
  { id: 'bells', title: 'Dua dentang', when: has(CITY_FLAG.complete),
    text: 'Lonceng menara berbunyi dua kali untuk jam yang sama. Aku merasa pernah mendengar yang kedua.' },
  { id: 'two_notes', title: 'Dua catatan', when: has(C2.depart),
    text: 'Azie menemukan dua versi legenda yang saling bertentangan. Salinan yang lebih tua katanya tersimpan di Liora.' },
  { id: 'letter', title: 'Surat pengantar', when: has(C2.farewell),
    text: 'Velthia menandatangani sendiri surat untuk penjaga Liora. Ia berpesan: pulang membawa jawaban, bukan luka baru.' },
  { id: 'zira', title: 'Zira', when: has(C2.zira),
    text: 'Zira, pemulih bingkai di Liora, membandingkan dua ukiran. Satu cerita menyebut bencana, yang lain dua orang yang berusaha pulang.' },
  { id: 'name', title: 'Sebuah nama', when: (f) => !!f[IDENTITY_FLAG] || !!f[C2.forest],
    text: 'Di batu penanda, satu suara menyebut sebuah nama: Yaric. Aku tidak tahu milik siapa suara itu, tetapi namaku terasa benar.' },
  { id: 'torvan', title: 'Torvan', when: has(C2.torvan),
    text: 'Seorang bocah bernama Torvan menawarkan diri menunjukkan jalan. Ia berunding seperti pedagang.' },
  { id: 'veyrath', title: 'Penjaga jalan lama', when: has(C2.veyrath),
    text: 'Veyrath, penjaga yang masih setia pada sumpah lamanya, tumbang. Ia melindungi sesuatu yang bahkan tak lagi ia ingat.' },
  { id: 'fragments', title: 'Fragmen ramalan', when: has(C2.fragments),
    text: 'Catatan penjaga lama menyebut Varlgrim dan sebuah segel. Baris ramalan di bawahnya dicoret.' },
  { id: 'report', title: 'Laporan', when: has(C2.complete),
    text: 'Aku menyerahkan temuan itu kepada Velthia. Penyelidikan masih jauh dari selesai.' },
];

/** Catatan yang sudah terbuka, yang terbaru di atas. */
export function journalNotes(flags: Readonly<Record<string, boolean>>): JournalNote[] {
  return NOTES.filter((n) => n.when(flags)).map(({ id, title, text }) => ({ id, title, text })).reverse();
}
