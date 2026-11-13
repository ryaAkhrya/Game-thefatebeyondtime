import { describe, expect, it } from 'vitest';
import source from '../../../DIALOGUE_EVENTS.json';
import { ENDING, ENDING_STEPS, endingCheckpoint } from '../../src/game/ending/progress';
import { ARTEFACT_SCRIPT, AWAKENING_SCRIPT, epilogueScript } from '../../src/game/ending/direction';
import { CinematicSequencer, containImage } from '../../src/game/ending/CinematicSequencer';
import { validateAnniversary } from '../../src/game/ending/memorySchema';
import { GameState, createNewGameData, validateGameStateData } from '../../src/game/systems/GameState';
import { SaveRepository } from '../../src/game/systems/SaveRepository';
import { SaveCoordinator } from '../../src/game/systems/SaveCoordinator';
import { MemoryStorage } from '../../src/game/systems/StorageAdapter';
import { C4 } from '../../src/game/story/chapter4Flags';
import { chapter1End, chapter2End, chapter3End, chapter4From } from './helpers/progression';

function chapter4End() {
  const d = chapter4From(chapter3End(), { varlgrim: true });
  Object.values(C4).forEach(f => { d.flags[f] = true; });
  d.area = 'aveloria'; return d;
}
describe('Phase 9 checkpoints and compatible saves', () => {
  it.each(ENDING_STEPS)('round-trips %s through repository, preserving inventory and rewards', step => {
    const base = chapter4End(), storage = new MemoryStorage(), repo = new SaveRepository(storage);
    expect(validateGameStateData(base)).not.toBeNull();
    const d = endingCheckpoint(base, step, step === 'memories' ? 3 : 0);
    expect(repo.write('slot1', d).ok).toBe(true);
    const result = repo.read('slot1'); if (result.status !== 'ok') throw Error(result.status);
    expect(result.data.ending).toEqual(d.ending); expect(result.data.items).toEqual(base.items); expect(result.data.rpg).toEqual(base.rpg);
    expect(result.data.flags[C4.complete]).toBe(true);
    expect(endingCheckpoint(d, step, d.ending!.memoryIndex)).toEqual(d);
  });
  it('does not allow ending before Chapter IV or mismatched ending flags/chapter/area', () => {
    expect(() => endingCheckpoint(createNewGameData(), 'era')).toThrow();
    const d = endingCheckpoint(chapter4End(), 'promise');
    for (const corrupt of [{ ...d, chapter: 'IV' }, { ...d, area: 'fortress' }, { ...d, ending: { step: 'unknown', memoryIndex: 0 } }, { ...d, ending: { step: 'promise', memoryIndex: 1 } }, { ...d, flags: { ...d.flags, [ENDING.modernComplete]: false } }, { ...d, flags: { ...d.flags, [ENDING.complete]: true } }, { ...d, ending: undefined }]) expect(validateGameStateData(corrupt)).toBeNull();
  });
  it('refuses to regress a committed ending checkpoint or a completed private memory index', () => {
    const d=endingCheckpoint(chapter4End(),'memories',3);
    expect(()=>endingCheckpoint(d,'era')).toThrow(/regress/);
    expect(()=>endingCheckpoint(d,'memories',2)).toThrow(/regress/);
    expect(endingCheckpoint(d,'remember').storyBeat).toBe('E-01');
    expect(endingCheckpoint(chapter4End(),'archive').storyBeat).toBe('M-02');
  });
  it('rejects private fields, invalid indices and ending metadata on an early slot', () => {
    const d = endingCheckpoint(chapter4End(), 'memories');
    for (const memoryIndex of [-1, 1.5, 101, NaN]) expect(validateGameStateData({ ...d, ending: { step: 'memories', memoryIndex } })).toBeNull();
    expect(validateGameStateData({ ...d, ending: { ...d.ending, caption: 'QA ONLY' } })).toBeNull();
    expect(validateGameStateData({ ...createNewGameData(), ending: d.ending })).toBeNull();
  });
  it('reads Chapter I–IV saves without inventing ending progress or rewriting their bytes', () => {
    for (const d of [chapter1End(), chapter2End(), chapter3End(), chapter4End()]) {
      const storage = new MemoryStorage(), repo = new SaveRepository(storage); expect(repo.write('slot2', d).ok).toBe(true);
      const bytes = storage.getItem('tfbt.save.v1.slot2'); const result = repo.read('slot2'); expect(result.status).toBe('ok');
      if (result.status === 'ok') expect(result.data.ending).toBeUndefined(); expect(storage.getItem('tfbt.save.v1.slot2')).toBe(bytes);
    }
  });
  it('permits a safe ending checkpoint with Yaric KO, while combat still forbids it', () => {
    const state = new GameState(), repo = new SaveRepository(new MemoryStorage()), coord = new SaveCoordinator(state, repo);
    const d = chapter4End(); d.vitals.hp = 0; state.load(d); coord.setSafe(true); expect(coord.isSafe).toBe(false);
    state.load(endingCheckpoint(d, 'era')); coord.requestAutosave(); expect(coord.flush()?.ok).toBe(true);
    coord.setSafe(false); coord.requestAutosave(); expect(coord.flush()).toBeNull(); expect(coord.hasPendingAutosave).toBe(true);
  });
});
describe('Cinematic timing and narrative', () => {
  it('handles fast input, held Enter, automatic timing and oversized deltas without skipping a beat', () => {
    const s = new CinematicSequencer([{ id: 'a', minMs: 200, autoMs: 400 }, { id: 'b', minMs: 200 }]);
    expect(s.advance()).toBe('locked'); s.update(10000); expect(s.time).toBe(100); s.update(100);
    expect(s.advance(true)).toBe('locked'); expect(s.advance()).toBe('advanced'); expect(s.advance()).toBe('locked');
    s.update(100);s.update(100);expect(s.advance()).toBe('done');
    const auto = new CinematicSequencer([{ id: 'auto', minMs: 100, autoMs: 200 }]); expect(auto.update(100)).toBe(false);expect(auto.update(100)).toBe(true);
  });
  it.each([[1920,1080],[1080,1920],[400,400]])('contains the entire %d×%d image without distortion', (w,h) => {
    const fit=containImage(w,h,710,306);expect(fit.width).toBeLessThanOrEqual(710);expect(fit.height).toBeLessThanOrEqual(306);expect(fit.width/fit.height).toBeCloseTo(w/h);
  });
  it('uses expanded E-01/E-02 working script verbatim, and labels all modern dialogue DRAFT_IMPL', () => {
    for (const scene of ['E-01','E-02'] as const) {
      const rows=source.filter(l=>l.scene_id===scene);expect(epilogueScript(scene).nodes.map(l=>l.type==='line'?l.text:'')).toEqual(rows.map(l=>l.spoken_text));
    }
    for(const script of [ARTEFACT_SCRIPT,AWAKENING_SCRIPT]){
      expect(script.nodes).toHaveLength(12);
      expect(script.nodes.every(l=>l.type==='line'&&l.source==='DRAFT_IMPL')).toBe(true);
      const lines=script.nodes.filter(l=>l.type==='line');
      expect(new Set(lines.map(l=>l.label))).toEqual(new Set(['Yudis','Saffa']));
      expect(lines.some(l=>l.text.includes('nggak')||l.text.includes('Nggak'))).toBe(true);
    }
    expect(epilogueScript('E-01').nodes).toHaveLength(8); expect(epilogueScript('E-02').nodes).toHaveLength(16);
  });
});
function manifest() { return { version: 1, memories: [{ id: 'qa-only', caption: 'QA fixture, never shown in gameplay.', image: 'images/qa.png', durationMs: 6000, transition: 'fade' }], message: { paragraphs: ['QA fixture content.'], signature: 'QA' } }; }
describe('Private content schema', () => {
  it('accepts optional dates, groups, notes and zero photos with a user-authored message', () => {
    const m=manifest();expect(validateAnniversary(m).memories).toHaveLength(1);m.memories=[];expect(validateAnniversary(m).memories).toHaveLength(0);
  });
  it.each(['../qa.png','images/../../qa.png','https://example.com/qa.png','images/a.svg','images/a\\b.png','images//a.png','/images/a.png'])('rejects unsafe photo reference %s', image=>{const m=manifest();m.memories[0]!.image=image;expect(()=>validateAnniversary(m)).toThrow();});
  it('rejects duplicate IDs, unreadable durations, missing messages and unfilled templates',()=>{
    const a=manifest();a.memories.push({...a.memories[0]!});expect(()=>validateAnniversary(a)).toThrow();
    const b=manifest();b.memories[0]!.durationMs=100;expect(()=>validateAnniversary(b)).toThrow();
    const c=manifest();c.message.paragraphs=[];expect(()=>validateAnniversary(c)).toThrow();
    const d=manifest();d.message.paragraphs=['[PESAN ANNIVERSARY PERTAMA DARI YUDIS]'];expect(()=>validateAnniversary(d)).toThrow();
  });
  it('rejects linebreak-heavy fields and coerced transition objects that could escape layout rules',()=>{
    const a=manifest();a.memories[0]!.caption='A\n'.repeat(100);expect(()=>validateAnniversary(a)).toThrow();
    const b=manifest();b.message.paragraphs=['A\n'.repeat(100)];expect(()=>validateAnniversary(b)).toThrow();
    const c=manifest();expect(()=>validateAnniversary({...c,memories:[{...c.memories[0],transition:['fade']}]})).toThrow();
  });
});
