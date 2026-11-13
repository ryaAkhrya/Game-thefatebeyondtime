// Dialog Chapter I, beat C1-01..C1-03.
// Sumber utama: DIALOGUE_EVENTS.json (line_id, teks, ekspresi, pause_ms) + docs/narrative/scripts/CHAPTER_I_SCRIPT.md.
// Teks MASIH DRAFT (belum direview Game Director) tetapi tidak ditulis ulang. tests/unit/dialogue-data.test.ts
// membandingkan setiap baris dengan DIALOGUE_EVENTS.json, sehingga data ini tidak bisa menyimpang diam-diam.
//
// Catatan editorial:
// - C1-03-L001 di JSON memuat karakter rusak (U+FFFD) di tempat tanda pisah; naskah (CHAPTER_I_SCRIPT.md) memakai "—".
// - Opsi O-15 (nama Yaric terukir pada sarung pedang) BELUM canon: tidak diimplementasikan.
// - Pilihan jawaban C1-02 adalah "PILIHAN FLAVOR" naskah: kedua opsi bermuara ke jawaban Nambo yang sama.

import type { DialogueLine, DialogueScript, ExpressionId } from './types';

const P = (cid: string, dir: string, ex: ExpressionId): string => `assets/characters/${dir}/${cid}_EXPRESSION_${ex}.png`;
const Y = (ex: ExpressionId): string => P('C01', 'C01_Yaric', ex);
const N = (ex: ExpressionId): string => P('C08', 'C08_Nambo', ex);

function yaric(
  id: string,
  ex: ExpressionId,
  text: string,
  kind: DialogueLine['kind'],
  pauseMs: number | undefined,
  source: DialogueLine['source'] = 'DIALOGUE_EVENTS',
): DialogueLine {
  return { type: 'line', id, speaker: 'C01', expression: ex, text, kind, pauseMs, portrait: Y(ex), source };
}
function nambo(id: string, ex: ExpressionId, text: string, pauseMs = 250, source: DialogueLine['source'] = 'DIALOGUE_EVENTS'): DialogueLine {
  return { type: 'line', id, speaker: 'C08', expression: ex, text, kind: 'speech', pauseMs, portrait: N(ex), source };
}
function system(id: string, label: string, text: string): DialogueLine {
  return { type: 'line', id, speaker: 'SYSTEM', label, text, kind: 'system', pauseMs: 250, source: 'CHAPTER_I_SCRIPT' };
}

// ---------------- C1-01 ----------------
export const C1_01_INTRO: DialogueScript = {
  id: 'C1-01-INTRO',
  nodes: [
    yaric('C1-01-L001', 'CONFUSED', 'Hah...?', 'thought', 550),
    yaric('C1-01-L002', 'CONFUSED', 'Ini di mana?', 'thought', 250),
    yaric('C1-01-L003', 'CONFUSED', 'Aku... tadi sedang apa?', 'thought', 550),
  ],
};

export const C1_01_EXAMINE_GROUND: DialogueScript = {
  id: 'C1-01-EXAMINE-GROUND',
  nodes: [
    yaric('C1-01-X001', 'CONFUSED', 'Ada bekas langkah. Salah satunya mungkin milikku. Arah datangnya malah nggak jelas.', 'thought', 250, 'CHAPTER_I_SCRIPT'),
  ],
};

export const C1_01_EXAMINE_SWORD: DialogueScript = {
  id: 'C1-01-EXAMINE-SWORD',
  nodes: [yaric('C1-01-X002', 'CONFUSED', 'Tanganku tahu cara memegang ini. Kepalaku nggak tahu kenapa.', 'thought', 250, 'CHAPTER_I_SCRIPT')],
};

export const C1_01_JOURNAL: DialogueScript = {
  id: 'C1-01-JOURNAL',
  nodes: [system('C1-01-X003', 'Jurnal', 'Cari jalan keluar dari hutan. Setelah itu, cari tahu siapa diriku.')],
};

// ---------------- C1-02 ----------------
export const C1_02_MEET: DialogueScript = {
  id: 'C1-02-MEET',
  nodes: [
    nambo('C1-02-L001', 'SURPRISED', 'Hei. Kau dari arah sana?'),
    yaric('C1-02-L002', 'NEUTRAL', 'Kayaknya.', 'speech', 250),
    nambo('C1-02-L003', 'SURPRISED', 'Kayaknya?'),
    yaric('C1-02-L004', 'CONFUSED', 'Aku baru bangun. Nggak ingat gimana bisa sampai di sini.', 'speech', 250),
    nambo('C1-02-L005', 'SURPRISED', 'Ada yang sakit?'),
    yaric('C1-02-L006', 'NEUTRAL', 'Cuma kepalaku. Tapi bukan karena luka, kayaknya.', 'speech', 250),
    nambo('C1-02-L007', 'SURPRISED', 'Namamu siapa?'),
    yaric('C1-02-L008', 'NEUTRAL', 'Nah, itu juga yang lagi kucari.', 'speech', 250),
    nambo('C1-02-L009', 'NEUTRAL', 'Wah. Harimu lagi berat, ya.'),
    yaric('C1-02-L010', 'CONFUSED', 'Kamu selalu nenangin orang kayak gitu?', 'speech', 250),
    nambo('C1-02-L011', 'HAPPY', 'Biasanya berhasil.'),
    {
      type: 'choice',
      id: 'C1-02-CHOICE-ASK',
      speaker: 'C01',
      options: [
        { id: 'town', text: 'Ada kota dekat sini?', expression: 'NEUTRAL' },
        { id: 'way', text: 'Kau bisa tunjukkan jalan?', expression: 'NEUTRAL' },
      ],
    },
    nambo('C1-02-L012', 'NEUTRAL', 'Ikuti jalan sampai gerbang batu. Namanya Aveloria. Di sana ada tabib, penjaga, dan lebih banyak orang yang mungkin bisa membantu.'),
    yaric('C1-02-L013', 'CONFUSED', 'Kamu nggak ikut?', 'speech', 250),
    nambo('C1-02-L014', 'SURPRISED', 'Aku lagi nyari jalan yang tadi kulewati. Tapi kok pohon yang sama muncul dua kali, ya?'),
    yaric('C1-02-L015', 'NEUTRAL', 'Jangan-jangan kamu nyasar.', 'speech', 250),
    nambo('C1-02-L016', 'NEUTRAL', 'Bisa jadi. Tapi aku cukup yakin tadi pohonnya yang pindah.'),
  ],
};

/** Bicara lagi dengan Nambo setelah C1-02: hanya MEMAKAI ULANG baris naskah (tidak ada teks baru). */
export const C1_02_REPEAT: DialogueScript = {
  id: 'C1-02-REPEAT',
  nodes: [
    nambo('C1-02-L014', 'SURPRISED', 'Aku lagi nyari jalan yang tadi kulewati. Tapi kok pohon yang sama muncul dua kali, ya?', 250, 'REUSE'),
    nambo('C1-02-L016', 'NEUTRAL', 'Bisa jadi. Tapi aku cukup yakin tadi pohonnya yang pindah.', 250, 'REUSE'),
  ],
};

// ---------------- C1-03 ----------------
export const C1_03_SIGN_FIRST: DialogueScript = {
  id: 'C1-03-SIGN-FIRST',
  nodes: [yaric('C1-03-L001', 'NEUTRAL', "'Aveloria — terus ke timur.'", 'read', 250)],
};

export const C1_03_SIGN_REPEAT: DialogueScript = {
  id: 'C1-03-SIGN-REPEAT',
  nodes: [
    yaric('C1-03-L002', 'CONFUSED', 'Papan yang tadi?', 'thought', 250),
    yaric('C1-03-L003', 'DETERMINED', 'Kalau aku balik, jangan-jangan ada tiga.', 'thought', 250),
  ],
};

export const C1_03_CHEST_OPEN: DialogueScript = {
  id: 'C1-03-CHEST-OPEN',
  nodes: [system('C1-03-X001', '', 'Mendapat 1 Potion.'), yaric('C1-03-L004', 'NEUTRAL', 'Setidaknya ada sesuatu yang berguna.', 'thought', 250)],
};

export const C1_03_CHEST_EMPTY: DialogueScript = {
  id: 'C1-03-CHEST-EMPTY',
  nodes: [yaric('C1-03-X002', 'NEUTRAL', 'Sudah kosong.', 'thought', 250, 'CHAPTER_I_SCRIPT')],
};

export const ALL_CHAPTER1_SCRIPTS: readonly DialogueScript[] = [
  C1_01_INTRO,
  C1_01_EXAMINE_GROUND,
  C1_01_EXAMINE_SWORD,
  C1_01_JOURNAL,
  C1_02_MEET,
  C1_02_REPEAT,
  C1_03_SIGN_FIRST,
  C1_03_SIGN_REPEAT,
  C1_03_CHEST_OPEN,
  C1_03_CHEST_EMPTY,
];
