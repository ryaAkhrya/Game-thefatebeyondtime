import { CHRONOLITH_REWARD, FIRST_HOLLOWLING_FLAG, MOURNFANG_FLAG, MOURNFANG_REWARD, MOURNFANG_VICTORY_SEEN, OATHGUARD_REWARD, PATROL_REWARD, TEMPLE_MIXED_REWARD } from '../../../src/game/combat/encounters';
import { AEGIS_TRIAL_REWARD, FORTRESS_COURT_REWARD, FORTRESS_GUARD_REWARD, FORTRESS_HALL_REWARD, FORTRESS_RIFT_REWARD, VARLGRIM_REWARD } from '../../../src/game/rpg/chapter4Rewards';
import { HOLLOWLING_REWARD, PROFILES, SKILLS } from '../../../src/game/rpg/definitions';
import { enterChapter3, joinVelthia } from '../../../src/game/rpg/party';
import { applyReward, baseStatsAt, effectiveStats } from '../../../src/game/rpg/progression';
import { C2 } from '../../../src/game/story/chapter2Flags';
import { C3 } from '../../../src/game/story/chapter3Flags';
import { C4 } from '../../../src/game/story/chapter4Flags';
import { createNewGameData, type GameStateData } from '../../../src/game/systems/GameState';
import { chapter2End } from './chapter3';

export { chapter2End };

/** Akhir Bab I: Hollowling + Mournfang (Yaric EXP 70, L3). */
export function chapter1End(): GameStateData {
  let d = createNewGameData();
  for (const f of [FIRST_HOLLOWLING_FLAG, MOURNFANG_FLAG, MOURNFANG_VICTORY_SEEN]) d.flags[f] = true;
  d = applyReward(d, HOLLOWLING_REWARD).data; d = applyReward(d, MOURNFANG_REWARD).data;
  return d;
}
/** Akhir Bab II dengan patroli Hutan 2 opsional (EXP 18 untuk Yaric dan Torvan). */
export function chapter2EndWithPatrol(): GameStateData {
  const d = chapter2End(); d.flags[C2.patrol] = true;
  return applyReward(d, PATROL_REWARD).data;
}
export interface Ch3Options { patrol2?: boolean; temple1?: boolean; temple2?: boolean }
/**
 * Akhir Bab III dengan kode BARU (tanpa pemotongan cap): Velthia bergabung, hadiah kuil opsional, Chronolith dikalahkan.
 * Jalur minimum wajib = hanya Hollowling, Mournfang, duo, Veyrath, Chronolith (Yaric EXP 303).
 */
export function chapter3End(opts: Ch3Options = {}): GameStateData {
  let d = enterChapter3(opts.patrol2 ? chapter2EndWithPatrol() : chapter2End());
  d.area = 'aveloria'; d = joinVelthia(d);
  d.area = 'temple'; d.position = { x: 100, y: 100, facing: 'up' };
  for (const f of [C3.decision, C3.departed, C3.templeEntered, C3.gateOpen]) d.flags[f] = true;
  if (opts.temple1) { d.flags[C3.templeFight1] = true; d = applyReward(d, OATHGUARD_REWARD).data; }
  if (opts.temple2) { d.flags[C3.templeFight2] = true; d = applyReward(d, TEMPLE_MIXED_REWARD).data; }
  for (const f of [C3.chronolith, C3.chronolithOutroSeen, C3.complete]) d.flags[f] = true;
  return applyReward(d, CHRONOLITH_REWARD).data;
}

export interface C4Pick { court?: boolean; hall?: boolean; guard?: boolean; rift?: boolean; aegis?: boolean; varlgrim?: boolean }
/** Bab IV dari akhir Bab III dengan encounter benteng yang dipilih (kode baru). */
export function chapter4From(c3: GameStateData, pick: C4Pick): GameStateData {
  let d = structuredClone(c3);
  d.chapter = 'IV'; d.area = 'fortress';
  for (const f of [C4.start, C4.entered]) d.flags[f] = true;
  const give = (on: boolean | undefined, flag: string, reward: Parameters<typeof applyReward>[1]) => { if (on) { d.flags[flag] = true; d = applyReward(d, reward).data; } };
  const aegis = !!(pick.aegis || pick.varlgrim);
  if (aegis) d.flags[C4.aegisLearned] = true;
  give(pick.court, C4.fightCourt, FORTRESS_COURT_REWARD);
  give(pick.hall, C4.fightHall, FORTRESS_HALL_REWARD);
  give(pick.guard, C4.fightGuard, FORTRESS_GUARD_REWARD);
  give(pick.rift, C4.fightRift, FORTRESS_RIFT_REWARD);
  give(aegis, C4.aegisTrial, AEGIS_TRIAL_REWARD);
  if (pick.varlgrim) { for (const f of [C4.checkpoint, C4.confront, C4.varlgrim]) d.flags[f] = true; d = applyReward(d, VARLGRIM_REWARD).data; }
  return d;
}

/**
 * Simulasi save LAMA: EXP/level dipotong di cap 5 (EXP 235), stat L5, poin jurus 4 - dibelanjakan, HP/MP dibatasi stat L5.
 * Hanya karakter yang EXP-nya > 235 yang berubah (sama seperti `gainExp` lama).
 */
export function legacyClamp(src: GameStateData): GameStateData {
  const d = structuredClone(src);
  for (const [id, c] of Object.entries(d.rpg.characters)) {
    const profile = PROFILES[id]!;
    if (c.exp <= 235) continue;
    c.exp = 235; c.level = 5; c.baseStats = baseStatsAt(5, profile);
    const spent = c.unlockedSkills.reduce((n, s) => n + (SKILLS.find(k => k.id === s)?.cost ?? 0), 0);
    c.skillPoints = 4 - spent;
    const stats = effectiveStats(d, id);
    const v = id === 'C01' ? d.vitals : d.partyVitals?.[id as 'C03' | 'C02'];
    if (v) { v.hp = Math.min(v.hp, stats.HP); v.mp = Math.min(v.mp, stats.MP); }
  }
  return d;
}
