import type { GameStateData } from '../systems/GameState';
import { CITY_FLAG } from '../story/aveloriaFlags';
import { C2 } from '../story/chapter2Flags';
import { TORVAN_PROFILE } from './definitions';
import { createCharacter, effectiveStats } from './progression';

/** One atomic story join; old Chapter I saves remain untouched until this dialogue completes. */
export function joinTorvan(data: GameStateData): GameStateData {
  if (data.flags[C2.torvan]) return data;
  if (data.chapter !== 'II' || data.area !== 'forest_2' || !data.flags[CITY_FLAG.complete] || !data.flags[C2.forest] || data.party.join() !== 'C01') throw new Error('Torvan join out of sequence');
  const next = structuredClone(data);
  next.flags[C2.torvan] = true;
  next.party = ['C01', 'C03'];
  next.rpg.characters.C03 = createCharacter(TORVAN_PROFILE);
  next.items.twig_staff = (next.items.twig_staff ?? 0) + 1;
  const stats = effectiveStats(next, 'C03');
  next.partyVitals = { C03: { hp: stats.HP, mp: stats.MP } };
  return next;
}

/** Repeatable pre-boss rest, with no item/EXP/gold changes. */
export function restChapter2Party(data: GameStateData): GameStateData {
  if (data.chapter !== 'II' || data.area !== 'forest_2' || !data.flags[C2.torvan]) throw new Error('Chapter II rest out of sequence');
  const next = structuredClone(data);
  const yaric = effectiveStats(next, 'C01'), torvan = effectiveStats(next, 'C03');
  next.vitals = { hp: yaric.HP, mp: yaric.MP };
  next.partyVitals = { C03: { hp: torvan.HP, mp: torvan.MP } };
  next.flags[C2.checkpoint] = true;
  return next;
}
