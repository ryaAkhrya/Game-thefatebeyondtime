import type { DialogueLine, DialogueScript, ExpressionId } from './types';
const line = (id: string, expression: ExpressionId, text: string, pauseMs: number): DialogueLine => ({
  type: 'line', id, speaker: 'C01', expression, text, pauseMs, kind: 'speech', source: 'DIALOGUE_EVENTS',
  portrait: `assets/characters/C01_Yaric/C01_EXPRESSION_${expression}.png`,
});
// Verbatim working C1-05 text and expression choices from DIALOGUE_EVENTS.json. Still DRAFT dialogue.
export const MOURNFANG_INTRO: DialogueScript = { id: 'C1-05-INTRO', nodes: [line('C1-05-L001', 'NEUTRAL', 'Aku nggak mau berkelahi denganmu.', 250)] };
export const MOURNFANG_RESPONSE: DialogueScript = { id: 'C1-05-RESPONSE', nodes: [line('C1-05-L002', 'NEUTRAL', 'Baiklah. Aku sudah mencoba.', 250)] };
export const MOURNFANG_VICTORY: DialogueScript = { id: 'C1-05-VICTORY', nodes: [
  line('C1-05-L003', 'NEUTRAL', 'Ia terlihat... kesakitan.', 550),
  line('C1-05-L004', 'CONFUSED', 'Ada apa dengan hutan ini?', 250),
] };
// DRAFT_IMPL system guidance, no new lore, character speech or canonical scene.
export const BEFORE_MOURNFANG: DialogueScript = { id: 'C1-05-CHECKPOINT', nodes: [
  { type: 'line', id: 'C1-05-X001', speaker: 'SYSTEM', text: 'Jejak cakar melintang di jalan. Ada tempat untuk beristirahat di dekat kayu tumbang.', kind: 'system', source: 'DRAFT_IMPL', pauseMs: 250 },
] };
export const AVELORIA_SIGN: DialogueScript = { id: 'C1-05-AVELORIA-SIGN', nodes: [
  { type: 'line', id: 'C1-05-X002', speaker: 'C01', expression: 'NEUTRAL', portrait: 'assets/characters/C01_Yaric/C01_EXPRESSION_NEUTRAL.png', text: "'Aveloria — terus ke timur.'", kind: 'read', source: 'REUSE', pauseMs: 250 },
] };
