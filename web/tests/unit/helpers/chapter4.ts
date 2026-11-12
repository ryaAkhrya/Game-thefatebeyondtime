import { BattleEngine, actor, enemyAI, aegisStatus, type BattleActor, type BattleState, type Command, type Stats } from '../../../src/game/combat/BattleEngine';
import { OATHGUARD_STATS } from '../../../src/game/combat/encounters';
import { GRAVORN_PAIR_STATS, GRAVORN_STATS, RIFTBORN_PAIR_STATS, RIFTBORN_STATS, RIFTBORN_TRIAL_STATS } from '../../../src/game/combat/c4Enemies';
import { VARLGRIM_STATS } from '../../../src/game/combat/varlgrim';
import { AEGIS_COMMAND } from '../../../src/game/story/chapter4Flags';
import { ITEMS, PROFILES, SKILLS } from '../../../src/game/rpg/definitions';
import { STAT_KEYS, baseStatsAt } from '../../../src/game/rpg/progression';
import { velthiaSkillsAtLevel } from '../../../src/game/rpg/velthia';
import { doTurn, mulberry32 } from './chapter3';

export { doTurn, mulberry32 };

export interface PartyOpts {
  /** level kedua anggota (stat dari baseStatsAt: mengikuti kurva yang ada, parametrik) */
  level: number;
  /** pasif DRAF yang memakai poin jurus: true = dua pasif awal tiap anggota; 'all' = semua yang terbuka pada level itu (rantai P) dalam batas poin jurus; false = tanpa */
  passives?: boolean | 'all';
  /** 'standard' = perlengkapan Benteng bila ada di ITEMS (warden_plate/keeper_robe), selain itu perlengkapan terbaik yang ada */
  gear?: 'standard' | 'basic';
  potions?: number;
  /** pecahan HP/MP awal (pemain datang dari checkpoint = 1) */
  hpFrac?: number; mpFrac?: number;
}

function gearBonus(ids: (string | undefined)[]): Partial<Stats> {
  const sum: Partial<Stats> = {};
  for (const id of ids) { const b = id ? ITEMS[id]?.bonus : undefined; for (const k of STAT_KEYS) sum[k] = (sum[k] ?? 0) + (b?.[k] ?? 0); }
  return sum;
}
function skillBonus(ids: string[]): Partial<Stats> {
  const sum: Partial<Stats> = {};
  for (const id of ids) { const b = SKILLS.find(s => s.id === id)?.bonus; for (const k of STAT_KEYS) sum[k] = (sum[k] ?? 0) + (b?.[k] ?? 0); }
  return sum;
}
const add = (base: Stats, ...bonus: Partial<Stats>[]): Stats => { const r = { ...base }; for (const b of bonus) for (const k of STAT_KEYS) r[k] += b[k] ?? 0; return r; };

/** Semua pasif (cost 1) yang terbuka pada level itu menurut urutan SKILLS dan prasyarat, dibatasi poin jurus (level - 1). */
function allPassives(classId: string, level: number): string[] {
  const got: string[] = [];
  for (const sk of SKILLS) if (sk.classId === classId && sk.cost === 1 && sk.level <= level && (!sk.prerequisite || got.includes(sk.prerequisite) || SKILLS.find(x => x.id === sk.prerequisite)!.cost === 0) && got.length < level - 1) got.push(sk.id);
  return got;
}

/** Stat efektif standar Yaric (C01) dan Velthia (C02) pada level tertentu. */
export function partyStats(o: PartyOpts): { C01: Stats; C02: Stats } {
  const std = (o.gear ?? 'standard') === 'standard';
  const yArmor = std ? (ITEMS.warden_plate ? 'warden_plate' : 'travel_coat') : 'travel_coat';
  const vArmor = std ? (ITEMS.keeper_robe ? 'keeper_robe' : 'royal_robe') : 'royal_robe';
  const pass = o.passives ?? true;
  const yP = pass === 'all' ? allPassives('swordsman', o.level) : pass ? ['heavy_grip', 'firm_stance'] : [];
  const vP = pass === 'all' ? allPassives('royal_mage', o.level) : pass ? ['gentle_light', 'royal_poise'] : [];
  return {
    C01: add(baseStatsAt(o.level, PROFILES.C01!), gearBonus(['yaric_greatsword', yArmor]), skillBonus(yP)),
    C02: add(baseStatsAt(o.level, PROFILES.C02!), gearBonus([vArmor]), skillBonus(vP)),
  };
}

export type C4Foe = 'varlgrim' | 'trial' | 'riftborn' | 'gravorn' | 'guardpost' | 'rift';
/** Mesin battle C4 langsung (tanpa GameState) agar stat level 6-10 dapat diparametrik. */
export function c4Engine(foe: C4Foe, o: PartyOpts, mutate?: (actors: BattleActor[]) => void, items?: Record<string, number>, random: () => number = () => 0.5): BattleEngine {
  const st = partyStats(o);
  const y = actor('C01', 'player', st.C01); y.skills = ['ground_slam'];
  const v = actor('C02', 'player', st.C02); v.skills = [...velthiaSkillsAtLevel(Math.max(5, o.level)), AEGIS_COMMAND];
  if (foe === 'varlgrim' || foe === 'trial') v.aegis = 1;
  for (const a of [y, v]) { a.hp = Math.max(1, Math.round(a.stats.HP * (o.hpFrac ?? 1))); a.mp = Math.round(a.stats.MP * (o.mpFrac ?? 1)); }
  const enemies = foe === 'varlgrim' ? [actor('C04', 'enemy', VARLGRIM_STATS)]
    : foe === 'guardpost' ? [actor('M05', 'enemy', OATHGUARD_STATS), actor('M06', 'enemy', RIFTBORN_PAIR_STATS)] : foe === 'rift' ? [actor('M04', 'enemy', GRAVORN_PAIR_STATS), actor('M06', 'enemy', RIFTBORN_PAIR_STATS)]
    : foe === 'trial' ? [actor('M06', 'enemy', RIFTBORN_TRIAL_STATS)] : foe === 'riftborn' ? [actor('M06', 'enemy', RIFTBORN_STATS)] : [actor('M04', 'enemy', GRAVORN_STATS)];
  if (foe === 'trial') { enemies[0]!.lethalSurge = true; enemies[0]!.intent = 'rift_gather'; }
  const all = [y, v, ...enemies];
  mutate?.(all);
  return new BattleEngine(all, items ?? { potion: o.potions ?? 3 }, false, random, { revivePotion: true });
}

export type Policy = (s: BattleState, me: BattleActor, e: BattleEngine) => { command: Command; targetId?: string };
const find = (s: BattleState, id: string) => s.actors.find(a => a.id === id);
const foeOf = (s: BattleState) => s.actors.find(a => a.side === 'enemy' && a.hp > 0)!;
const ok = (e: BattleEngine, c: Command, t?: string) => e.unavailable(c, t) === null;
const frac = (a: BattleActor) => a.hp / a.stats.HP;

/** Pemain strategis: Perlindungan saat meteor, Bertahan/Selubung pada sasaran hantaman, Pulih, Potion; sisanya Denyut/Ground Slam fokus (Selaras Langkah diuji tidak lebih efisien: 6 MP untuk 1,5x satu serangan). */
/** Fokus pada musuh paling rapuh dan paling berbahaya lebih dulu (M06 sebelum M04/M05), selebihnya yang pertama. */
const focus = (s: BattleState): string => { const en = s.actors.filter(a => a.side === 'enemy' && a.hp > 0); return (en.find(a => a.id === 'M06') ?? en[0]!).id; };
export const smartC4: Policy = (s, me, e) => {
  const b = s.actors.filter(a => a.side === 'enemy' && a.hp > 0).find(a => a.intent === 'rift_surge' || a.intent === 'gravorn_crush' || a.intent === 'keeper_strike' || a.intent === 'fracture_strike') ?? foeOf(s), allies = s.actors.filter(a => a.side === 'player' && a.hp > 0);
  const lowest = [...allies].sort((x, y) => frac(x) - frac(y))[0]!;
  const potions = s.items.potion ?? 0;
  const heavy = b.intent === 'keeper_strike' || b.intent === 'fracture_strike' || b.intent === 'rift_surge' || b.intent === 'gravorn_crush';
  const mark = heavy ? find(s, b.intentTargetId ?? '') : undefined;
  const windowIntent = b.intent === 'meteor_fall' || b.intent === 'meteor_hold' || (b.intent === 'rift_surge' && !!s.meteor?.open);
  if (me.id === 'C02') {
    if (windowIntent && ok(e, AEGIS_COMMAND)) return { command: AEGIS_COMMAND };
    const down = s.actors.find(a => a.side === 'player' && a.hp <= 0);
    if (down && potions > 0 && ok(e, 'potion', down.id)) return { command: 'potion', targetId: down.id };
    if (frac(lowest) < 0.4 && ok(e, 'velthia_mend', lowest.id)) return { command: 'velthia_mend', targetId: lowest.id };
    if (mark?.id === 'C02' && me.mp >= 12 && !mark.statuses.some(x => x.id === 'shield') && ok(e, 'velthia_ward', mark.id)) return { command: 'velthia_ward', targetId: mark.id };
    if (mark?.id === 'C02' && !mark.defending) return { command: 'defend' };
    if (frac(lowest) < 0.6 && me.mp >= 12 && ok(e, 'velthia_mend', lowest.id)) return { command: 'velthia_mend', targetId: lowest.id };
    if (ok(e, 'velthia_pulse')) return { command: 'velthia_pulse', targetId: focus(s) };
    return { command: 'defend' };
  }
  if (frac(me) < 0.3 && potions > 0 && ok(e, 'potion', me.id)) return { command: 'potion', targetId: me.id };
  const v = find(s, 'C02');
  if (v && v.hp > 0 && frac(v) < 0.3 && v.mp < 4 && potions > 0 && ok(e, 'potion', 'C02')) return { command: 'potion', targetId: 'C02' };
  if (mark && mark.id === me.id && !windowIntent) return { command: 'defend' };
  if (ok(e, 'ground_slam')) return { command: 'ground_slam', targetId: focus(s) };
  return { command: 'attack', targetId: focus(s) };
};
/** Pemain yang membaca telegraf meteor tetapi selebihnya hanya menyerang. */
export const aegisOnlyC4: Policy = (s, me, e) => {
  const b = foeOf(s);
  if (me.id === 'C02') {
    if ((b.intent === 'meteor_fall' || b.intent === 'meteor_hold' || (b.intent === 'rift_surge' && !!s.meteor?.open)) && ok(e, AEGIS_COMMAND)) return { command: AEGIS_COMMAND };
    return ok(e, 'velthia_pulse') ? { command: 'velthia_pulse' } : { command: 'attack' };
  }
  return ok(e, 'ground_slam') ? { command: 'ground_slam' } : { command: 'attack' };
};
/** Pemain naif/sembrono: tidak pernah memakai Perlindungan, Bertahan, atau Pulih. */
export const recklessC4: Policy = (_s, me, e) => {
  if (me.id === 'C02') return ok(e, 'velthia_pulse') ? { command: 'velthia_pulse' } : { command: 'attack' };
  return ok(e, 'ground_slam') ? { command: 'ground_slam' } : { command: 'attack' };
};

export interface C4Result { outcome: 'victory' | 'defeat' | 'timeout'; rounds: number; bossActions: number; hpLeft: number; hpMax: number; mpLeft: number; potionsLeft: number; meteors: number; aegisCasts: number; phases: number[] }
/** Mainkan satu pertarungan penuh dengan kebijakan; `noise` = peluang aksi acak sah (seeded). */
export function playC4(engine: BattleEngine, policy: Policy, rng: () => number = () => 1, noise = 0, maxActions = 600): C4Result {
  let bossActions = 0, actions = 0, rounds = 0, aegisCasts = 0;
  const phases: number[] = [];
  while (actions++ < maxActions) {
    const s = engine.snapshot();
    if (s.outcome) break;
    const me = engine.current;
    if (me.side === 'enemy') {
      doTurn(engine, enemyAI(me)); bossActions++; rounds++;
      const ph = engine.snapshot().actors.find(a => a.id === me.id)?.phase; if (ph && phases.at(-1) !== ph) phases.push(ph);
      continue;
    }
    let choice = policy(s, me, engine);
    if (noise > 0 && rng() < noise) {
      const options: { command: Command; targetId?: string }[] = [{ command: 'attack' }, { command: 'defend' }];
      for (const c of ['ground_slam', 'velthia_pulse', 'velthia_bloom', 'velthia_concord'] as Command[]) if (engine.unavailable(c) === null) options.push({ command: c });
      choice = options[Math.floor(rng() * options.length)]!;
    }
    if (choice.command === AEGIS_COMMAND) aegisCasts++;
    doTurn(engine, choice.command, choice.targetId);
  }
  const s = engine.snapshot();
  const players = s.actors.filter(a => a.side === 'player');
  return { outcome: s.outcome === 'victory' || s.outcome === 'defeat' ? s.outcome : 'timeout', rounds, bossActions,
    hpLeft: players.reduce((n, a) => n + a.hp, 0), hpMax: players.reduce((n, a) => n + a.stats.HP, 0), mpLeft: players.reduce((n, a) => n + a.mp, 0),
    potionsLeft: s.items.potion ?? 0, meteors: s.meteor?.falls ?? 0, aegisCasts, phases };
}
export { aegisStatus };

// ---------------------------------------------------------------- utilitas uji lanjutan

const PLAYER_COMMANDS: Command[] = ['attack', 'defend', 'ground_slam', 'potion', 'velthia_pulse', 'velthia_mend', 'velthia_ward', 'velthia_bloom', 'velthia_concord', AEGIS_COMMAND];
/** Semua aksi sah untuk aktor yang sedang giliran (pemain). Target musuh/sekutu dienumerasi. */
export function legalActions(engine: BattleEngine): { command: Command; targetId?: string }[] {
  const s = engine.snapshot(), out: { command: Command; targetId?: string }[] = [];
  if (s.outcome || engine.current.side !== 'player') return out;
  const players = s.actors.filter(a => a.side === 'player').map(a => a.id), foes = s.actors.filter(a => a.side === 'enemy' && a.hp > 0).map(a => a.id);
  for (const command of PLAYER_COMMANDS) {
    const targets: (string | undefined)[] = command === 'potion' || command === 'velthia_mend' || command === 'velthia_ward' ? players
      : command === 'attack' || command === 'ground_slam' || command === 'velthia_pulse' ? foes : [undefined];
    for (const t of targets) if (engine.unavailable(command, t) === null) out.push(t ? { command, targetId: t } : { command });
  }
  return out;
}

/**
 * Letakkan mesin tepat sebelum boss memanggil meteor: fase 3, niat `meteor_call`, giliran boss.
 * `mutate` mengubah keadaan sebelum dipulihkan (HP/MP/status/urutan).
 */
export function atMeteorCall(engine: BattleEngine, mutate?: (s: BattleState) => void): BattleEngine {
  const s = engine.snapshot();
  const boss = s.actors.find(a => a.id === 'C04')!;
  boss.hp = Math.ceil(boss.stats.HP * 0.3); boss.phase = 3; boss.intent = 'meteor_call'; boss.calm = 2; boss.rot = 0;
  s.cursor = s.order.indexOf('C04');
  mutate?.(s);
  engine.restore(s);
  return engine;
}
/** Jalankan satu aksi musuh sesuai niat. */
export function bossAct(engine: BattleEngine) { return doTurn(engine, enemyAI(engine.current)); }
export const actorOf = (engine: BattleEngine, id: string): BattleActor => engine.snapshot().actors.find(a => a.id === id)!;
