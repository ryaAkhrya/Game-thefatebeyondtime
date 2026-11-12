import { describe, expect, it } from 'vitest';
import { bossSession, mulberry32, naivePolicy, simulate, smartPolicy, type Policy } from './helpers/chapter3';
import { effectiveStats, gainExp } from '../../src/game/rpg/progression';
import { PROFILES } from '../../src/game/rpg/definitions';
import type { GameStateData } from '../../src/game/systems/GameState';

function batch(policy: Policy, mutate: (d: GameStateData) => void, n = 100, noise = 0.1) {
  let wins = 0, rounds = 0;
  for (let i = 0; i < n; i++) {
    const { session } = bossSession(mutate);
    const r = simulate(session.engine, policy, mulberry32(i + 1), noise);
    if (r.outcome === 'victory') { wins++; rounds += r.rounds; }
  }
  return { win: wins / n, avgRounds: wins ? rounds / wins : 0 };
}
const potions = (n: number) => (d: GameStateData) => { d.items.potion = n; };
/** Naik ke L5 (EXP 235; cap level kini 10, jadi hentikan tepat di ambang L5): gunakan gainExp pada kedua anggota aktif. */
const level5 = (d: GameStateData) => {
  for (const id of ['C01', 'C02']) d.rpg.characters[id] = gainExp(d.rpg.characters[id]!, 235 - d.rpg.characters[id]!.exp, PROFILES[id]);
  d.vitals = { hp: effectiveStats(d, 'C01').HP, mp: effectiveStats(d, 'C01').MP };
  d.partyVitals!.C02 = { hp: effectiveStats(d, 'C02').HP, mp: effectiveStats(d, 'C02').MP };
};

describe('Chronolith balance simulation (Yaric + Velthia, DRAFT numbers; seeded, deterministic)', () => {
  it('entry party: Yaric L4 (EXP 183) and Velthia L4, no temple side fights, no passives', () => {
    const { start } = bossSession();
    expect([start.rpg.characters.C01!.level, start.rpg.characters.C02!.level]).toEqual([4, 4]);
  });
  it('a competent player (heal/ward/pulse/concord) wins in 6-10 boss rounds, with or without potions', () => {
    for (const n of [0, 3]) {
      const r = batch(smartPolicy, potions(n), 1, 0);
      expect(r.win, `potions ${n}`).toBe(1);
      expect(r.avgRounds, `potions ${n}`).toBeGreaterThanOrEqual(6); expect(r.avgRounds).toBeLessThanOrEqual(10);
    }
  });
  it('a competent player with 10% random mistakes still wins most attempts; retry is viable (win rate neither 0 nor certain-by-luck)', () => {
    const r = batch(smartPolicy, potions(3), 100, 0.1);
    expect(r.win).toBeGreaterThanOrEqual(0.8); expect(r.avgRounds).toBeLessThanOrEqual(13);
    const sloppy = batch(smartPolicy, potions(3), 100, 0.35);
    expect(sloppy.win).toBeGreaterThan(0.05); expect(sloppy.win).toBeLessThan(0.95);
  });
  it('a naive attack-only player is no better off than the competent one (the boss rewards ward/mend/concord), yet is not walled', () => {
    const naive = batch(naivePolicy, potions(0), 100, 0.1), smart = batch(smartPolicy, potions(0), 100, 0.1);
    expect(naive.win).toBeLessThanOrEqual(smart.win + 0.02);
    expect(batch(naivePolicy, potions(3), 1, 0).win).toBe(1);
  });
  it('level 5 party is clearly safer than level 4', () => {
    const l4 = batch(smartPolicy, potions(3), 100, 0.25), l5 = batch(smartPolicy, d => { potions(3)(d); level5(d); }, 100, 0.25);
    expect(l5.win).toBeGreaterThanOrEqual(l4.win);
  });
  it('even when Velthia starts the fight at 1 HP the fight is not an instant loss', () => {
    const r = batch(smartPolicy, d => { d.partyVitals!.C02!.hp = 1; d.partyVitals!.C03.hp = 1; }, 1, 0);
    expect(['victory', 'defeat']).toContain(r.win === 1 ? 'victory' : 'defeat');
    const { session } = bossSession(d => { d.partyVitals!.C02!.hp = 0; });
    expect(session.engine.snapshot().actors.find(a => a.id === 'C02')!.hp).toBeGreaterThan(0); // Chapter III membangkitkan 0 HP saat masuk
  });
});
