import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BattleEngine, GROUND_SLAM, HOLLOWLING_STATS, POTION_HEAL, YARIC_STATS, actor, damage, enemyAI, finishStatuses, turnOrder, type Command, type Stats } from '../../src/game/combat/BattleEngine';
import { BattleSession, FIRST_HOLLOWLING_FLAG } from '../../src/game/combat/BattleSession';
import { FIRST_HOLLOWLING_INTRO, FIRST_HOLLOWLING_VICTORY } from '../../src/game/dialogue/firstHollowling';
import { GameState, validateGameStateData } from '../../src/game/systems/GameState';

function duel(options: { hp?: number; mp?: number; enemyHp?: number; allowRun?: boolean; random?: () => number; spd?: number; potions?: number } = {}) {
  const p = actor('C01', 'player', { ...YARIC_STATS, SPD: options.spd ?? YARIC_STATS.SPD });
  p.hp = options.hp ?? p.hp; p.mp = options.mp ?? p.mp;
  const e = actor('M01', 'enemy', HOLLOWLING_STATS); e.hp = options.enemyHp ?? e.hp;
  return new BattleEngine([p, e], { potion: options.potions ?? 1 }, options.allowRun, options.random);
}
function act(e: BattleEngine, c: Command = 'attack') {
  const p = e.prepare(c, e.snapshot().turn);
  expect(p).not.toBeNull();
  const result = e.impact(p!.token);
  expect(result).not.toBeNull();
  expect(e.finish(p!.token)).toBe(true);
  return result!;
}

describe('Turn manager, bounds and action lifecycle', () => {
  it('SPD descending, independent of roster order', () => {
    const fast = actor('M01', 'enemy', { ...HOLLOWLING_STATS, SPD: 20 });
    expect(turnOrder([actor('C01', 'player', YARIC_STATS), fast])).toEqual(['M01', 'C01']);
  });
  it('tie breaks lexically by actor ID, deterministically', () => {
    const p = actor('C01', 'player', YARIC_STATS), e = actor('M01', 'enemy', { ...HOLLOWLING_STATS, SPD: 10 });
    expect(turnOrder([e, p])).toEqual(turnOrder([p, e]));
    expect(turnOrder([e, p])).toEqual(['C01', 'M01']);
  });
  it('enemy can take first turn when faster', () => { expect(duel({ spd: 1 }).current.id).toBe('M01'); });
  it('prepare does not spend resources or apply damage before contact', () => {
    const e = duel(); e.prepare('ground_slam', 1);
    expect(e.current.mp).toBe(12); expect(e.snapshot().actors[1]!.hp).toBe(112);
  });
  it('blocks duplicate prepare, impact and finish, including stale turn tokens', () => {
    const e = duel(); expect(e.prepare('attack', 1)).not.toBeNull();
    expect(e.prepare('attack', 1)).toBeNull(); expect(e.prepare('potion', 1)).toBeNull();
    expect(e.finish(1)).toBe(false); expect(e.impact(99)).toBeNull();
    expect(e.impact(1)?.amount).toBe(17); expect(e.impact(1)).toBeNull();
    expect(e.prepare('attack', 2)).toBeNull();
    expect(e.finish(1)).toBe(true); expect(e.finish(1)).toBe(false);
    expect(e.prepare('attack', 1)).toBeNull(); expect(e.snapshot().turn).toBe(2);
  });
  it('snapshot and actor access cannot mutate internal state', () => {
    const e = duel(), s = e.snapshot(); s.actors[0]!.hp = 0; s.items.potion = 99;
    e.current.stats.ATK = 1000; expect(e.current.hp).toBe(96); expect(e.current.stats.ATK).toBe(20); expect(e.snapshot().items.potion).toBe(1);
  });
  it('clamps input HP and MP to valid bounds', () => { const e = duel({ hp: 1000, mp: -9 }); expect(e.current.hp).toBe(96); expect(e.current.mp).toBe(0); });
  it('rejects duplicate actor IDs', () => { expect(() => new BattleEngine([actor('x', 'player', YARIC_STATS), actor('x', 'enemy', HOLLOWLING_STATS)])).toThrow(); });
  it('rejects missing sides', () => { expect(() => new BattleEngine([actor('C01', 'player', YARIC_STATS)])).toThrow(); });
  it.each(['HP', 'MP', 'ATK', 'DEF', 'MAG', 'MDEF', 'SPD'] as (keyof Stats)[])('rejects invalid %s', key => {
    expect(() => new BattleEngine([actor('C01', 'player', { ...YARIC_STATS, [key]: NaN }), actor('M01', 'enemy', HOLLOWLING_STATS)])).toThrow();
  });
  it('rejects negative stock', () => { expect(() => duel({ potions: -1 })).toThrow(); });
});

describe('Damage, commands and deterministic AI', () => {
  it('basic physical formula = floor(ATK - 0.5 DEF)', () => { expect(act(duel()).amount).toBe(17); });
  it('minimum damage remains one against high DEF', () => {
    const t = actor('M01', 'enemy', { ...HOLLOWLING_STATS, DEF: 999 }); expect(damage(actor('C01', 'player', YARIC_STATS), t)).toBe(1);
  });
  it('Ground Slam costs 4 MP and deals 30 physical damage', () => {
    const e = duel(); expect(act(e, 'ground_slam').amount).toBe(30); expect(e.snapshot().actors[0]!.mp).toBe(12 - GROUND_SLAM.cost);
  });
  it('exact remaining MP can be spent, never negative', () => { const e = duel({ mp: 4 }); act(e, 'ground_slam'); expect(e.snapshot().actors[0]!.mp).toBe(0); });
  it.each([0, 1, 2, 3])('insufficient MP %i leaves turn/resources unchanged', mp => {
    const e = duel({ mp }); const before = e.snapshot(); expect(e.unavailable('ground_slam')).toContain('MP'); expect(e.prepare('ground_slam', 1)).toBeNull(); expect(e.snapshot()).toEqual(before);
  });
  it('Defend halves incoming damage and expires at next accepted owner action', () => {
    const e = duel(); act(e, 'defend'); expect(act(e, enemyAI()).amount).toBe(7);
    expect(e.current.defending).toBe(true); e.prepare('attack', e.snapshot().turn); expect(e.current.defending).toBe(false);
  });
  it('invalid commands do not remove active guard', () => {
    const e = duel({ mp: 0 }); act(e, 'defend'); act(e); expect(e.prepare('ground_slam', 3)).toBeNull(); expect(e.current.defending).toBe(true);
  });
  it('Potion heals capped amount and consumes exactly one', () => {
    const e = duel({ hp: 50 }); const p = e.prepare('potion', 1)!;
    expect(e.snapshot().items.potion).toBe(1); expect(e.impact(p.token)?.amount).toBe(POTION_HEAL);
    expect(e.impact(p.token)).toBeNull(); expect(e.current.hp).toBe(86); expect(e.snapshot().items.potion).toBe(0);
  });
  it('Potion does not exceed max HP', () => { const e = duel({ hp: 90 }); expect(act(e, 'potion').amount).toBe(6); expect(e.snapshot().actors[0]!.hp).toBe(96); });
  it('full HP refuses Potion without consuming it or a turn', () => { const e = duel(); expect(e.prepare('potion', 1)).toBeNull(); expect(e.snapshot().items.potion).toBe(1); expect(e.snapshot().turn).toBe(1); });
  it('empty stock refuses Potion', () => { const e = duel({ hp: 50, potions: 0 }); expect(e.unavailable('potion')).toContain('habis'); expect(e.prepare('potion', 1)).toBeNull(); });
  it('scripted Run is blocked with reason, no turn spent', () => { const e = duel(); expect(e.unavailable('run')).toContain('Hollowling'); expect(e.prepare('run', 1)).toBeNull(); expect(e.snapshot().turn).toBe(1); });
  it('normal encounter Run succeeds with injected deterministic random', () => { const e = duel({ allowRun: true, random: () => 0 }); act(e, 'run'); expect(e.snapshot().outcome).toBe('escaped'); });
  it('failed Run spends a turn and hands control to enemy', () => { const e = duel({ allowRun: true, random: () => 0.99 }); act(e, 'run'); expect(e.snapshot().outcome).toBeNull(); expect(e.current.id).toBe('M01'); });
  it('AI is a predictable basic strike, no specials or RNG', () => { expect(enemyAI()).toBe('attack'); const e = duel({ spd: 1 }); expect(act(e, enemyAI()).amount).toBe(15); });
  it('enemy cannot use player items or skills', () => { const e = duel({ spd: 1 }); expect(e.prepare('potion', 1)).toBeNull(); expect(e.prepare('ground_slam', 1)).toBeNull(); });
  it('lethal strike clamps HP to zero, victory prevents any extra action', () => {
    const e = duel({ enemyHp: 1 }); expect(act(e).amount).toBe(1); expect(e.snapshot().actors[1]!.hp).toBe(0); expect(e.snapshot().outcome).toBe('victory'); expect(e.prepare('attack', 1)).toBeNull();
  });
  it('player death yields defeat, never negative HP', () => { const e = duel({ hp: 1, spd: 1 }); act(e); expect(e.snapshot().actors[0]!.hp).toBe(0); expect(e.snapshot().outcome).toBe('defeat'); });
  it('zero HP on entry is a defeat', () => { expect(duel({ hp: 0 }).snapshot().outcome).toBe('defeat'); });
  it('tutorial can be won using basic attacks alone without items or grinding', () => {
    const e = duel({ potions: 0 }); while (!e.snapshot().outcome) act(e);
    expect(e.snapshot().outcome).toBe('victory'); expect(e.snapshot().actors[0]!.hp).toBe(6);
  });
});

describe('Status duration and resolution foundation', () => {
  it('Poison ticks on owner completed turns only and expires exactly', () => {
    const e = duel(); e.addStatus('C01', 'poison', 2); act(e, 'defend');
    expect(e.snapshot().actors[0]!.hp).toBe(89); act(e); expect(e.snapshot().actors[0]!.statuses[0]!.turns).toBe(1);
    act(e, 'defend'); expect(e.snapshot().actors[0]!.statuses).toEqual([]);
  });
  it('Poison can cause defeat; minimum tick is one', () => {
    const e = duel({ hp: 1 }); e.addStatus('C01', 'poison', 1); act(e, 'defend'); expect(e.snapshot().outcome).toBe('defeat');
    const a = actor('x', 'player', { ...YARIC_STATS, HP: 1 }); a.statuses = [{ id: 'poison', turns: 1 }]; expect(finishStatuses(a)).toBe(1); expect(a.hp).toBe(0);
  });
  it('Stun replaces one owner action without spending MP/item', () => {
    const e = duel(); e.addStatus('C01', 'stun', 1); expect(e.prepare('ground_slam', 1)?.command).toBe('stunned');
    e.impact(1); e.finish(1); expect(e.snapshot().actors[0]!.mp).toBe(12); expect(e.snapshot().actors[0]!.statuses).toEqual([]); expect(e.current.id).toBe('M01');
  });
  it('ATK Up multiplies ATK by 1.25 for one action', () => { const e = duel(); e.addStatus('C01', 'atk_up', 1); expect(act(e).amount).toBe(22); expect(e.snapshot().actors[0]!.statuses).toEqual([]); });
  it('DEF Up multiplies DEF by 1.25 until owner completes a turn', () => { const e = duel(); e.addStatus('M01', 'def_up', 1); expect(act(e).amount).toBe(16); act(e); expect(e.snapshot().actors[1]!.statuses).toEqual([]); });
  it('reapplication refreshes duration, does not stack potency', () => {
    const e = duel(); e.addStatus('C01', 'atk_up', 1); e.addStatus('C01', 'atk_up', 3); e.addStatus('C01', 'atk_up', 2);
    expect(e.current.statuses).toEqual([{ id: 'atk_up', turns: 3 }]); expect(act(e).amount).toBe(22);
  });
  it.each([0, -1, 1.5, NaN])('rejects invalid duration %s', n => { expect(() => duel().addStatus('C01', 'poison', n)).toThrow(); });
});

describe('GameState integration, retry and idempotent rewards', () => {
  function session() { const gs = new GameState(); gs.startNewGame(); gs.addItem('potion'); gs.setFlag('reward.c1_chest_potion.claimed'); gs.setPosition(832, 100, 'down'); return { gs, s: new BattleSession(gs) }; }
  it('cannot create battle without active game', () => { expect(() => new BattleSession(new GameState())).toThrow(); });
  it('victory commits vitals, consumed inventory and canonical flag exactly once', () => {
    const { gs, s } = session(); act(s.engine, 'attack'); act(s.engine); act(s.engine, 'potion'); act(s.engine);
    while (!s.engine.snapshot().outcome) act(s.engine, s.engine.current.side === 'player' && s.engine.current.mp >= 4 ? 'ground_slam' : 'attack');
    expect(s.commitVictory()).toBe(true); const snapshot = gs.snapshot();
    expect(snapshot!.items.potion).toBe(0); expect(snapshot!.flags[FIRST_HOLLOWLING_FLAG]).toBe(true); expect(snapshot!.vitals!.hp).toBeGreaterThan(0);
    expect(s.commitVictory()).toBe(false); expect(s.retry()).toBe(false); expect(gs.snapshot()).toEqual(snapshot);
  });
  it('retry restores the exact checkpoint, even after consuming Potion, with no reward or chest duplication', () => {
    const { gs, s } = session(); const checkpoint = gs.snapshot();
    act(s.engine, 'attack'); act(s.engine); act(s.engine, 'potion'); act(s.engine);
    while (!s.engine.snapshot().outcome) act(s.engine, s.engine.current.side === 'player' ? 'defend' : 'attack');
    expect(s.engine.snapshot().outcome).toBe('defeat'); expect(s.commitVictory()).toBe(false); expect(s.retry()).toBe(true);
    expect(gs.snapshot()).toEqual(checkpoint); expect(s.engine.snapshot().items.potion).toBe(1); expect(s.engine.current.hp).toBe(96); expect(s.engine.current.mp).toBe(12); expect(s.engine.snapshot().turn).toBe(1); expect(s.retry()).toBe(false);
  });
  it('checkpoint includes pre-battle HP/MP, not arbitrary full heal', () => {
    const { gs } = session(); const d = gs.snapshot()!; d.vitals = { hp: 70, mp: 8 }; gs.load(d); const s = new BattleSession(gs);
    expect(s.engine.current.hp).toBe(70); expect(s.engine.current.mp).toBe(8);
  });
  it('does not commit victory before animations finish', () => {
    const { s } = session(); while (s.engine.snapshot().actors[1]!.hp > 17) act(s.engine);
    if (s.engine.current.side === 'enemy') act(s.engine);
    const p = s.engine.prepare('attack', s.engine.snapshot().turn)!; s.engine.impact(p.token);
    expect(s.commitVictory()).toBe(false); s.engine.finish(p.token); expect(s.commitVictory()).toBe(true);
  });
  it('vitals remain compatible with existing validator, old data stays valid', () => {
    const { gs } = session(); const d = gs.snapshot()!; expect(validateGameStateData(d)).toEqual(d);
    d.vitals = { hp: 30, mp: 4 }; expect(validateGameStateData(d)?.vitals).toEqual(d.vitals);
  });
  it.each([{ hp: -1, mp: 0 }, { hp: 97, mp: 0 }, { hp: 96, mp: 13 }, { hp: NaN, mp: 0 }, { hp: 20, mp: 1.5 }])('rejects corrupt vitals %j', vitals => {
    const { gs } = session(); expect(validateGameStateData({ ...gs.snapshot(), vitals })).toBeNull();
  });
});

describe('C1-04 dialogue preserves source data', () => {
  const rows = JSON.parse(readFileSync(resolve(__dirname, '../../../DIALOGUE_EVENTS.json'), 'utf8')) as { line_id: string; spoken_text: string; emotion_id: string; pause_ms: number; portrait_asset_path: string }[];
  it.each([...FIRST_HOLLOWLING_INTRO.nodes, ...FIRST_HOLLOWLING_VICTORY.nodes])('line $id matches the approved working script', node => {
    if (node.type !== 'line') throw new Error('Unexpected choice');
    const row = rows.find(r => r.line_id === node.id)!;
    expect(node.text).toBe(row.spoken_text); expect(node.expression).toBe(row.emotion_id); expect(node.pauseMs).toBe(row.pause_ms); expect(node.portrait).toBe(row.portrait_asset_path);
  });
});
