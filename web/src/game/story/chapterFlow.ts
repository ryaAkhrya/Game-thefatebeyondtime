import type { GameStateData } from '../systems/GameState';
import { SCENE_KEYS, type SceneKey } from '../data/ids';
import { CITY_FLAG, CITY_SPAWN } from './aveloriaFlags';
import { C2, RETURN_SPAWN } from './chapter2Flags';
import { C3 } from './chapter3Flags';
import { C4 } from './chapter4Flags';
import { enterChapter4 } from '../rpg/party';
import { FORTRESS_SPAWN } from '../world/fortressMaps';
import { endingCheckpoint } from '../ending/progress';

/** Also handles saves made on the old chapter cards. No rewards are granted here. */
export function nextStoryChapter(data: GameStateData | null): { data: GameStateData; scene: SceneKey } | null {
  if (!data || data.ending) return null;
  if (data.chapter === 'IV' && data.flags[C4.complete]) return { data: endingCheckpoint(data, 'era'), scene: SCENE_KEYS.Ending };
  let d = structuredClone(data);
  if (d.chapter === 'III' && d.flags[C3.complete]) {
    d = enterChapter4(d); d.storyBeat = 'C4-01'; d.position = { ...FORTRESS_SPAWN };
  } else if (d.chapter === 'II' && d.flags[C2.complete]) {
    d.chapter = 'III'; d.flags[C3.start] = true; d.storyBeat = 'C3-01'; d.area = 'aveloria'; d.position = { ...RETURN_SPAWN };
  } else if (d.chapter === 'I' && d.flags[CITY_FLAG.complete]) {
    d.chapter = 'II'; d.flags[C2.start] = true; d.storyBeat = 'C2-01'; d.area = 'aveloria'; d.position = { x: 856, y: 824, facing: 'right' };
  } else if (d.chapter === 'I' && d.area === 'forest_edge' && d.flags['c1.vertical_slice_complete']) {
    d.area = 'aveloria'; d.position = { ...CITY_SPAWN };
  } else return null;
  return { data: d, scene: SCENE_KEYS.World };
}
