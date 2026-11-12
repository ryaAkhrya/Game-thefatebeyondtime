import type { GameStateData } from '../systems/GameState';
import { CITY_FLAG } from '../story/aveloriaFlags';
import { C2 } from '../story/chapter2Flags';
import { C3 } from '../story/chapter3Flags';
import { TORVAN_PROFILE, VELTHIA_PROFILE } from './definitions';
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

/** Awal Chapter III: hanya sesudah Bab II selesai; party tetap Yaric+Torvan sampai Velthia bergabung. Idempoten. */
export function enterChapter3(data: GameStateData): GameStateData {
  if (data.flags[C3.start] && data.chapter === 'III') return data;
  if (!data.flags[C2.complete] || data.chapter === 'I') throw new Error('Chapter III out of sequence');
  const next = structuredClone(data);
  next.chapter = 'III';
  next.flags[C3.start] = true;
  if (next.world.lastChapter2EncounterSec !== undefined) delete next.world.lastChapter2EncounterSec;
  return next;
}

/**
 * Velthia (C02) menggantikan Torvan sebagai anggota aktif ke-2. Torvan pindah ke cadangan: rpg.characters.C03,
 * partyVitals.C03, perlengkapan, jurus dan item tetap utuh. Velthia bergabung pada EXP Yaric (level sama), dengan Jubah Istana
 * dan tanpa senjata; HP/MP penuh. Atomik dan idempoten.
 */
export function joinVelthia(data: GameStateData): GameStateData {
  if (data.flags[C3.velthiaJoined]) return data;
  if (data.chapter !== 'III' || !data.flags[C3.start] || !data.flags[C2.complete] || !data.flags[C2.torvan] || data.party.join() !== 'C01,C03') throw new Error('Velthia join out of sequence');
  const next = structuredClone(data);
  next.flags[C3.velthiaJoined] = true;
  next.party = ['C01', 'C02'];
  next.rpg.characters.C02 = createCharacter(VELTHIA_PROFILE, next.rpg.characters.C01!.exp);
  next.items.royal_robe = (next.items.royal_robe ?? 0) + 1;
  const stats = effectiveStats(next, 'C02');
  next.partyVitals = { ...next.partyVitals!, C02: { hp: stats.HP, mp: stats.MP } };
  return next;
}
/** Nama yang diminta lead. */
export const applyVelthiaJoin = joinVelthia;

/** Istirahat aman Chapter III: pulihkan HP/MP semua anggota (termasuk cadangan). Tanpa item/EXP/emas baru. */
export function restChapter3Party(data: GameStateData): GameStateData {
  if (data.chapter !== 'III' || !data.flags[C3.velthiaJoined]) throw new Error('Chapter III rest out of sequence');
  const next = structuredClone(data);
  const yaric = effectiveStats(next, 'C01');
  next.vitals = { hp: yaric.HP, mp: yaric.MP };
  for (const id of ['C03', 'C02'] as const) {
    const stats = effectiveStats(next, id);
    next.partyVitals![id] = { hp: stats.HP, mp: stats.MP };
  }
  if (next.flags[C3.gateOpen]) next.flags[C3.checkpoint] = true;
  return next;
}
