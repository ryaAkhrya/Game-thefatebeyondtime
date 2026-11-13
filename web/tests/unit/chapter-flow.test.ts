import { describe, expect, it } from 'vitest';
import { nextStoryChapter } from '../../src/game/story/chapterFlow';
import { CITY_FLAG } from '../../src/game/story/aveloriaFlags';
import { C4 } from '../../src/game/story/chapter4Flags';
import { chapter1End, chapter2End, chapter3End, chapter4From } from './helpers/progression';
import { createNewGameData, validateGameStateData } from '../../src/game/systems/GameState';
import { SaveRepository } from '../../src/game/systems/SaveRepository';
import { MemoryStorage } from '../../src/game/systems/StorageAdapter';

describe('Continuous chapter progression and legacy boundary saves', () => {
  const one=chapter1End(); Object.values(CITY_FLAG).forEach(f=>one.flags[f]=true); one.area='aveloria';
  const two=chapter2End(), three=chapter3End(), four=chapter4From(three,{varlgrim:true});
  Object.values(C4).forEach(f=>four.flags[f]=true); four.area='aveloria';
  it.each([['II','aveloria',one],['III','aveloria',two],['IV','fortress',three],['MODERN','modern',four]] as const)(
    'advances a completed chapter to %s with valid save data and no duplicated rewards', (chapter,area,before)=>{
      const bytes=JSON.stringify(before), next=nextStoryChapter(before)!;
      expect(next.data.chapter).toBe(chapter); expect(next.data.area).toBe(area);
      expect(next.data.rpg).toEqual(before.rpg); expect(next.data.items).toEqual(before.items);
      expect(next.data.party).toEqual(before.party); expect(JSON.stringify(before)).toBe(bytes);
      expect(validateGameStateData(next.data)).not.toBeNull();
      const repo=new SaveRepository(new MemoryStorage()); expect(repo.write('slot1',before).ok).toBe(true);
      const legacy=repo.read('slot1'); if(legacy.status!=='ok')throw Error(legacy.status);
      expect(nextStoryChapter(legacy.data)).toEqual(next);
      expect(nextStoryChapter(next.data)).toBeNull();
    });
  it('does not move an unfinished chapter or skip the forest route',()=>{
    expect(nextStoryChapter(null)).toBeNull(); expect(nextStoryChapter(createNewGameData())).toBeNull();
    const d=chapter1End(); d.area='forest_edge'; expect(nextStoryChapter(d)).toBeNull();
    d.flags['c1.vertical_slice_complete']=true;
    const next=nextStoryChapter(d)!; expect(next.data.area).toBe('aveloria'); expect(next.data.chapter).toBe('I');
    expect(nextStoryChapter(next.data)).toBeNull(); expect(next.data.rpg).toEqual(d.rpg);
  });
});
