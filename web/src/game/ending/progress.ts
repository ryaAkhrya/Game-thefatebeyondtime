import type { GameStateData } from '../systems/GameState';
import { C4 } from '../story/chapter4Flags';

export const ENDING_STEPS = ['era', 'walk', 'artefact', 'archive', 'heirloom', 'heart', 'awakening', 'memories', 'remember', 'cliff-arrival', 'promise', 'cloud-path', 'cloud-heart', 'silhouettes', 'continued', 'credits', 'message', 'complete'] as const;
export type EndingStep = typeof ENDING_STEPS[number];
export interface EndingProgress { step: EndingStep; memoryIndex: number }
export const ENDING = {
  started: 'modern.started', artefact: 'modern.artefact_discovered', awakened: 'modern.memory_awakened',
  modernComplete: 'modern.complete', cliff: 'ending.cliff', promise: 'ending.promise', epilogue: 'ending.epilogue_complete',
  title: 'ending.continued', credits: 'ending.credits', complete: 'game.complete',
} as const;
const at = (step: EndingStep, start: EndingStep): boolean => ENDING_STEPS.indexOf(step) >= ENDING_STEPS.indexOf(start);

/** Pure checkpoint transition. Never grants rewards or carries private captions/identities into a save. */
export function endingCheckpoint(data: GameStateData, step: EndingStep, memoryIndex = 0): GameStateData {
  if (!data.flags[C4.complete]) throw new Error('Ending requires Chapter IV complete');
  if (data.ending && (ENDING_STEPS.indexOf(step) < ENDING_STEPS.indexOf(data.ending.step) || (step === 'memories' && data.ending.step === step && memoryIndex < data.ending.memoryIndex))) throw new Error('Ending checkpoints cannot regress; use replay');
  const d = structuredClone(data);
  d.chapter = at(step, 'remember') ? 'EPILOGUE' : 'MODERN';
  d.area = d.chapter === 'MODERN' ? 'modern' : 'cliff';
  d.ending = { step, memoryIndex };
  d.flags[ENDING.started] = true;
  for (const [flag, start] of [
    [ENDING.artefact, 'archive'], [ENDING.awakened, 'memories'], [ENDING.modernComplete, 'remember'],
    [ENDING.cliff, 'promise'], [ENDING.promise, 'cloud-path'], [ENDING.epilogue, 'continued'],
    [ENDING.title, 'credits'], [ENDING.credits, 'message'], [ENDING.complete, 'complete'],
  ] as const) if (at(step, start)) d.flags[flag] = true;
  d.storyBeat = step === 'complete' ? 'GAME-DONE' : at(step, 'remember') ? 'E-01' : at(step, 'memories') ? 'M-03' : at(step, 'archive') ? 'M-02' : 'M-01';
  return d;
}

export function validateEnding(raw: Record<string, unknown>, flags: Record<string, boolean>): EndingProgress | null | undefined {
  const anyEnding = Object.values(ENDING).some(f => flags[f]);
  if (raw.ending === undefined) return anyEnding || raw.chapter === 'MODERN' || raw.chapter === 'EPILOGUE' || raw.area === 'modern' || raw.area === 'cliff' ? null : undefined;
  if (!raw.ending || typeof raw.ending !== 'object' || Array.isArray(raw.ending)) return null;
  const e = raw.ending as Record<string, unknown>;
  if (Object.keys(e).some(k => k !== 'step' && k !== 'memoryIndex')) return null;
  if (!ENDING_STEPS.includes(e.step as EndingStep) || !Number.isInteger(e.memoryIndex) || Number(e.memoryIndex) < 0 || Number(e.memoryIndex) > 100) return null;
  const step = e.step as EndingStep;
  if (!flags[C4.complete] || !flags[ENDING.started]) return null;
  const epilogue = at(step, 'remember');
  if (raw.chapter !== (epilogue ? 'EPILOGUE' : 'MODERN') || raw.area !== (epilogue ? 'cliff' : 'modern')) return null;
  for (const [flag, start] of [
    [ENDING.artefact, 'archive'], [ENDING.awakened, 'memories'], [ENDING.modernComplete, 'remember'],
    [ENDING.cliff, 'promise'], [ENDING.promise, 'cloud-path'], [ENDING.epilogue, 'continued'],
    [ENDING.title, 'credits'], [ENDING.credits, 'message'], [ENDING.complete, 'complete'],
  ] as const) if (!!flags[flag] !== at(step, start)) return null;
  if (step !== 'memories' && e.memoryIndex !== 0) return null;
  return { step, memoryIndex: Number(e.memoryIndex) };
}

export function isEnding(data: GameStateData | null): boolean { return !!data?.ending; }
export function continueIntoEnding(data: GameStateData | null): boolean { return !!data?.flags[C4.complete]; }
