import { BattleEngine, enemyAI, type BattleActor, type BattleState, type Command } from '../../../src/game/combat/BattleEngine';
import { BattleSession } from '../../../src/game/combat/BattleSession';
import { FIRST_HOLLOWLING_FLAG, MOURNFANG_FLAG, MOURNFANG_VICTORY_SEEN, MOURNFANG_REWARD, DUO_REWARD, VEYRATH_REWARD } from '../../../src/game/combat/encounters';
import { HOLLOWLING_REWARD } from '../../../src/game/rpg/definitions';
import { enterChapter3, joinTorvan, joinVelthia } from '../../../src/game/rpg/party';
import { applyReward } from '../../../src/game/rpg/progression';
import { CITY_FLAG } from '../../../src/game/story/aveloriaFlags';
import { C2 } from '../../../src/game/story/chapter2Flags';
import { C3 } from '../../../src/game/story/chapter3Flags';
import { createNewGameData, GameState, type GameStateData } from '../../../src/game/systems/GameState';

/** Akhir Bab II yang realistis: semua hadiah wajib (Hollowling, Mournfang, duo, Veyrath); Yaric EXP 183 (L4), Torvan EXP 113 (L3). */
export function chapter2End(): GameStateData {
  let d = createNewGameData(); d.chapter = 'II'; d.area = 'forest_2';
  for (const f of [FIRST_HOLLOWLING_FLAG, MOURNFANG_FLAG, MOURNFANG_VICTORY_SEEN, ...Object.values(CITY_FLAG), C2.start, C2.depart, C2.farewell, C2.zira, C2.forest]) d.flags[f] = true;
  d.position = { x: 152, y: 560, facing: 'right' };
  d = applyReward(d, HOLLOWLING_REWARD).data; d = applyReward(d, MOURNFANG_REWARD).data;
  d = joinTorvan(d);
  for (const f of [C2.secondMarker, C2.tutorial, C2.veyrath, C2.fragmentA, C2.fragments, C2.complete]) d.flags[f] = true;
  d = applyReward(d, DUO_REWARD).data; d = applyReward(d, VEYRATH_REWARD).data;
  d.items.potion = 3;
  return d;
}
export function chapter3Start(): GameStateData { const d = enterChapter3(chapter2End()); d.area = 'aveloria'; return d; }
export function chapter3Temple(): GameStateData {
  const d = joinVelthia(chapter3Start());
  d.area = 'temple'; d.position = { x: 100, y: 100, facing: 'up' };
  for (const f of [C3.decision, C3.departed, C3.templeEntered, C3.gateOpen]) d.flags[f] = true;
  return d;
}

export function doTurn(e: BattleEngine, command: Command, targetId?: string) {
  const p = e.prepare(command, e.snapshot().turn, targetId);
  if (!p) throw new Error(`rejected ${command}: ${e.unavailable(command, targetId)}`);
  const r = e.impact(p.token); if (!r) throw new Error('no impact');
  if (!e.finish(p.token)) throw new Error('no finish');
  return r;
}

export type Policy = (s: BattleState, me: BattleActor, e: BattleEngine) => { command: Command; targetId?: string };
const find = (s: BattleState, id: string) => s.actors.find(a => a.id === id);
const boss = (s: BattleState) => s.actors.find(a => a.side === 'enemy' && a.hp > 0)!;
function ok(e: BattleEngine, c: Command, t?: string) { return e.unavailable(c, t) === null; }

/** Pemain hemat: sembuhkan saat terluka, pasang selubung pada target hantaman, selebihnya serang. */
export const smartPolicy: Policy = (s, me, e) => {
  const b = boss(s), allies = s.actors.filter(a => a.side === 'player' && a.hp > 0);
  const lowest = [...allies].sort((x, y) => x.hp / x.stats.HP - y.hp / y.stats.HP)[0]!;
  const frac = (a: BattleActor) => a.hp / a.stats.HP;
  const potions = s.items.potion ?? 0;
  const guarded = b.statuses.some(x => x.id === 'chrono_guard');
  if (me.id === 'C02') {
    const slamT = b.intent === 'chrono_slam' ? find(s, b.intentTargetId ?? '') : undefined;
    if (frac(lowest) < 0.4 && ok(e, 'velthia_mend', lowest.id)) return { command: 'velthia_mend', targetId: lowest.id };
    if (slamT && !slamT.statuses.some(x => x.id === 'shield') && ok(e, 'velthia_ward', slamT.id)) return { command: 'velthia_ward', targetId: slamT.id };
    if (slamT && frac(slamT) < 0.6 && ok(e, 'velthia_mend', slamT.id)) return { command: 'velthia_mend', targetId: slamT.id };
    if (b.intent === 'chrono_guard' || guarded) {
      if (ok(e, 'velthia_bloom') && !allies.every(a => a.statuses.some(x => x.id === 'regen')) && allies.some(a => frac(a) < 0.85)) return { command: 'velthia_bloom' };
      if (frac(lowest) < 0.75 && ok(e, 'velthia_mend', lowest.id)) return { command: 'velthia_mend', targetId: lowest.id };
    }
    const y = find(s, 'C01');
    if (!guarded && y && y.hp > 0 && !y.statuses.some(x => x.id === 'concord') && ok(e, 'velthia_concord')) return { command: 'velthia_concord' };
    if (frac(lowest) < 0.7 && ok(e, 'velthia_mend', lowest.id)) return { command: 'velthia_mend', targetId: lowest.id };
    if (ok(e, 'velthia_pulse')) return { command: 'velthia_pulse' };
    return { command: 'defend' };
  }
  const v = find(s, 'C02');
  const velthiaCanMend = !!v && v.hp > 0 && v.mp >= 4;
  if (frac(me) < 0.35 && potions > 0 && ok(e, 'potion', me.id) && (!velthiaCanMend || frac(me) < 0.2)) return { command: 'potion', targetId: me.id };
  if (v && v.hp > 0 && frac(v) < 0.35 && potions > 0 && ok(e, 'potion', 'C02')) return { command: 'potion', targetId: 'C02' };
  if (guarded && me.hp / me.stats.HP > 0.5) return { command: 'defend' };
  if (ok(e, 'ground_slam')) return { command: 'ground_slam' };
  return { command: 'attack' };
};
/** Pemain naif: hanya serang/Ground Slam/Denyut dan satu Potion saat HP rendah. */
export const naivePolicy: Policy = (s, me, e) => {
  if (me.id === 'C02') return ok(e, 'velthia_pulse') ? { command: 'velthia_pulse' } : { command: 'attack' };
  if (me.hp / me.stats.HP < 0.3 && (s.items.potion ?? 0) > 0 && ok(e, 'potion', me.id)) return { command: 'potion', targetId: me.id };
  return ok(e, 'ground_slam') ? { command: 'ground_slam' } : { command: 'attack' };
};

export interface SimResult { outcome: 'victory' | 'defeat' | 'timeout'; rounds: number; bossActions: number; potionsLeft: number; log: string[] }
/** Mainkan satu pertarungan penuh. `noise` = peluang aksi acak sah (seeded) untuk mengukur variasi pemain. */
export function simulate(engine: BattleEngine, policy: Policy, rng: () => number = () => 1, noise = 0, maxActions = 400): SimResult {
  let bossActions = 0, actions = 0;
  while (actions++ < maxActions) {
    const s = engine.snapshot();
    if (s.outcome) break;
    const me = engine.current;
    if (me.side === 'enemy') { doTurn(engine, enemyAI(me)); bossActions++; continue; }
    let choice = policy(s, me, engine);
    if (noise > 0 && rng() < noise) {
      const options: { command: Command; targetId?: string }[] = [{ command: 'attack' }, { command: 'defend' }];
      for (const c of ['ground_slam', 'velthia_pulse', 'velthia_bloom', 'velthia_concord'] as Command[]) if (engine.unavailable(c) === null) options.push({ command: c });
      choice = options[Math.floor(rng() * options.length)]!;
    }
    doTurn(engine, choice.command, choice.targetId);
  }
  const s = engine.snapshot();
  return { outcome: s.outcome === 'victory' || s.outcome === 'defeat' ? s.outcome : 'timeout', rounds: bossActions, bossActions, potionsLeft: s.items.potion ?? 0, log: s.log };
}
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function bossSession(mutate?: (d: GameStateData) => void): { gs: GameState; session: BattleSession; start: GameStateData } {
  const gs = new GameState(); const d = chapter3Temple(); mutate?.(d); gs.load(d);
  return { gs, session: new BattleSession(gs, 'chronolith'), start: gs.snapshot()! };
}
