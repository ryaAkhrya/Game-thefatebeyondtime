import type { DialogueLine, DialogueScript, ExpressionId } from './types';

// Existing DRAFT scene script, verbatim from DIALOGUE_EVENTS.json. No new story dialogue.
function line(id: string, expression: ExpressionId, text: string, pauseMs: number): DialogueLine {
  return { type: 'line', id, speaker: 'C01', expression, text, pauseMs, kind: 'speech', source: 'DIALOGUE_EVENTS', portrait: `assets/characters/C01_Yaric/C01_EXPRESSION_${expression}.png` };
}
export const FIRST_HOLLOWLING_INTRO: DialogueScript = {
  id: 'C1-04-INTRO', nodes: [line('C1-04-L001', 'CONFUSED', 'Apa itu...?', 550)],
};
export const FIRST_HOLLOWLING_VICTORY: DialogueScript = {
  id: 'C1-04-VICTORY', nodes: [line('C1-04-L002', 'NEUTRAL', 'Aku bisa bertarung.', 250), line('C1-04-L003', 'CONFUSED', 'Harusnya itu kabar baik, kan?', 250)],
};
