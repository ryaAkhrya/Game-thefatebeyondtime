import source from './epilogue.lines.json';
import type { CharacterId } from '../data/ids';
import type { DialogueScript } from '../dialogue/types';
import type { EndingStep } from './progress';
import type { CinematicBeat } from './CinematicSequencer';

export const PUBLIC_ECHO_FRAGMENTS = {
  archive: { caption: 'Sebuah lambang di antara catatan lama.', source: 'DRAFT_IMPL' },
  heirloom: { caption: 'Pusaka yang dibawa Velthia.', source: 'DRAFT_IMPL' },
  heart: { caption: 'Dua pengunci. Dibuka bersama.', source: 'DRAFT_IMPL' },
} as const;
export const ENDING_NARRATION = {
  era: { text: 'Berabad-abad kemudian', source: 'R02' },
  remember: { text: 'Satu ingatan, setelah kerajaan selamat.', source: 'DRAFT_IMPL' },
} as const;

export const ENDING_DIRECTION: Record<EndingStep, CinematicBeat> = {
  era: { id: 'era', minMs: 2000 }, walk: { id: 'walk', minMs: 700 }, artefact: { id: 'artefact', minMs: 1200 },
  archive: { id: 'archive', minMs: 1600 }, heirloom: { id: 'heirloom', minMs: 1600 }, heart: { id: 'heart', minMs: 1800 },
  awakening: { id: 'awakening', minMs: 1000 }, memories: { id: 'memories', minMs: 2000 },
  remember: { id: 'remember', minMs: 2300 }, 'cliff-arrival': { id: 'cliff-arrival', minMs: 2200 }, promise: { id: 'promise', minMs: 900 },
  'cloud-path': { id: 'cloud-path', minMs: 2600 }, 'cloud-heart': { id: 'cloud-heart', minMs: 2600 }, silhouettes: { id: 'silhouettes', minMs: 3200 },
  continued: { id: 'continued', minMs: 3000 }, credits: { id: 'credits', minMs: 1800 }, message: { id: 'message', minMs: 2500 }, complete: { id: 'complete', minMs: 500 },
};
// Known contributions only. Each page can be reviewed without changing the renderer.
export const CREDITS = [
  { heading: 'THE FATE', subheading: 'BEYOND TIME', lines: ['Arahan permainan & cerita', 'Yudis'] },
  { heading: 'PEMBUATAN', subheading: '', lines: ['Pengembangan dan visual berbantuan AI', 'Claude Code · OpenAI Codex · OpenAI imagegen', 'Implementasi, pengujian, dan dokumentasi'] },
  { heading: 'PERANGKAT & LISENSI', subheading: '', lines: ['Phaser · TypeScript · Vite · Vitest · Playwright', 'Cinzel · SIL Open Font License 1.1', 'Source Sans 3 · SIL Open Font License 1.1'] },
] as const;

/** R02 approves events; dialogue follows the user's November 2026 conversational revision. */
export function epilogueScript(scene: 'E-01' | 'E-02'): DialogueScript {
  return { id: scene, nodes: source.filter(l => l.scene_id === scene).map(l => ({
    type: 'line', id: l.line_id, speaker: l.speaker_id as CharacterId, text: l.spoken_text,
    kind: 'speech', source: 'DIALOGUE_EVENTS', pauseMs: l.pause_ms,
    // Deliberately no portrait: keep the pair and their shared horizon as the visual focus.
  })) };
}
const draft = (id: string, lines: readonly [string, string][]): DialogueScript => ({ id, nodes: lines.map(([label,text], i) => ({ type: 'line', id: `${id}-X${i+1}`, speaker: 'SYSTEM', label, text, kind: 'speech', pauseMs: 350, source: 'DRAFT_IMPL' })) });
// Fictional connective dialogue only. No claims about real habits, dates, faces or relationship events.
export const ARTEFACT_SCRIPT = draft('M-01', [
  ['Yudis', 'Saffa, bentar. Coba lihat yang di batu itu.'],
  ['Saffa', 'Yang bulat ini? Kenapa?'],
  ['Yudis', 'Iya. Garis di tengahnya putus. Kayak pernah lihat.'],
  ['Saffa', 'Di mana?'],
  ['Yudis', 'Nah, itu. Aku nggak ingat. Cuma rasanya kenal.'],
  ['Saffa', 'Kirain kamu mau bilang kita salah jalan.'],
  ['Yudis', 'Kalau itu, aku masih yakin jalannya benar.'],
  ['Saffa', 'Masih?'],
  ['Yudis', 'Oke, cukup yakin. Tapi lihat dulu, deh.'],
  ['Saffa', '...Bentar. Kok aku juga merasa pernah lihat?'],
  ['Yudis', 'Kamu juga?'],
  ['Saffa', 'Iya. Bukan batunya. Lambangnya.'],
]);
export const AWAKENING_SCRIPT = draft('M-02', [
  ['Yudis', 'Tadi... kamu lihat juga?'],
  ['Saffa', 'Ada ruangan penuh buku. Terus pintu besar itu.'],
  ['Yudis', 'Dua pengunci. Aku ingat tanganku ada di salah satunya.'],
  ['Saffa', 'Aku di sebelahmu. Tapi bajunya beda. Semuanya beda.'],
  ['Yudis', 'Aneh, ya. Aku tahu itu kamu, padahal wajahnya nggak sama.'],
  ['Saffa', 'Aku juga tahu itu kamu. Nggak perlu lihat lama-lama.'],
  ['Yudis', 'Itu bukan tempat yang pernah kita datangi, kan?'],
  ['Saffa', 'Bukan. Tapi rasanya juga nggak kayak baru lihat.'],
  ['Yudis', 'Kayak ingatan yang bukan dari hidup kita sekarang.'],
  ['Saffa', 'Kamu pusing?'],
  ['Yudis', 'Sedikit. Kita duduk sebentar, ya?'],
  ['Saffa', 'Iya. Nggak usah buru-buru. Aku di sini.'],
]);
