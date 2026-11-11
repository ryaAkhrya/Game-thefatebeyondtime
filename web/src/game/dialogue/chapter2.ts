import source from './chapter2.lines.json';
import type { CharacterId } from '../data/ids';
import type { DialogueLine, DialogueScript, ExpressionId } from './types';

/** Exactly the 97 working-dialogue entries C2-01..09; approved R02 remains plot authority. */
export function chapter2Script(id: string, from = 1, to = Infinity): DialogueScript {
  return { id, nodes: source.filter(l => l.scene_id === id && Number(l.line_id.slice(-3)) >= from && Number(l.line_id.slice(-3)) <= to)
    .map(l => ({ type: 'line' as const, id: l.line_id, speaker: l.speaker_id as CharacterId,
      expression: l.emotion_id as ExpressionId, portrait: l.portrait_asset_path, text: l.spoken_text,
      pauseMs: l.pause_ms, kind: 'speech' as const, source: 'DIALOGUE_EVENTS' as const })) };
}
export function c2Draft(id: string, text: string, speaker: CharacterId | 'SYSTEM' = 'SYSTEM', expression?: ExpressionId, label?: string): DialogueLine {
  return { type: 'line', id, text, speaker, expression, label, kind: speaker === 'SYSTEM' ? 'system' : 'speech', source: 'DRAFT_IMPL', pauseMs: 350 };
}
const working = (id: string, text: string, label: string): DialogueLine => ({
  ...c2Draft(id, text, 'SYSTEM', undefined, label), kind: 'read', source: 'CHAPTER_II_SCRIPT',
});

export const C2_AZIE = chapter2Script('C2-01');
export const C2_RECORDS: DialogueScript = { id: 'C2-01-RECORDS', nodes: [
  working('C2-01-X001', 'Ketika The Fate bangkit, gerbang masa ditutup.', 'Catatan A'),
  working('C2-01-X002', '...dua jalan yang pernah saling menemukan...', 'Catatan B'),
] };
export const C2_FAREWELL = chapter2Script('C2-02');
export const C2_ZIRA = chapter2Script('C2-03');
export const C2_SHADOW = chapter2Script('C2-04');
export const C2_STONE: DialogueScript = { id: 'C2-04-STONE', nodes: [
  { ...c2Draft('C2-04-X001', 'Lambangnya sama seperti yang ditunjukkan Zira. Tetapi bekas goresnya lebih baru.', 'C01', 'CONFUSED'), kind: 'thought', source: 'CHAPTER_II_SCRIPT' },
] };
export const C2_TORVAN = chapter2Script('C2-05');
C2_TORVAN.nodes.splice(17, 0, { type: 'choice', id: 'C2-05-CHOICE', speaker: 'C01', options: [
  { id: 'careful', text: 'Ikut, tapi jangan bikin repot.', expression: 'DETERMINED' },
  { id: 'show_path', text: 'Kau tahu jalannya, tunjukkan.', expression: 'CONFUSED' },
] });
export const C2_DUO_INTRO = chapter2Script('C2-06', 1, 3);
export const C2_DUO_OUTRO = chapter2Script('C2-06', 4, 7);
export const C2_VEYRATH_INTRO = chapter2Script('C2-07', 1, 4);
export const C2_VEYRATH_OUTRO = chapter2Script('C2-07', 5, 8);
export const C2_FRAGMENT_A: DialogueScript = { id: 'C2-08-A', nodes: [
  working('C2-08-X001', 'Dua jalan... satu janji... penjaga... memisah...', 'Tulisan yang tersisa'),
  ...chapter2Script('C2-08', 1, 4).nodes,
] };
export const C2_FRAGMENT_B: DialogueScript = { id: 'C2-08-B', nodes: [
  c2Draft('C2-08-X002', 'Di tepi catatan penjaga lama tertulis Varlgrim dan kata segel. Baris ramalan di bawahnya dicoret.'),
  c2Draft('C2-08-X003', 'Sesaat, Yaric melihat tangan Velthia menutup sebuah buku. Gambar itu lenyap sebelum ia dapat mengenali ruangnya.'),
  ...chapter2Script('C2-08', 5, 8).nodes,
] };
export const C2_RETURN = chapter2Script('C2-09');
