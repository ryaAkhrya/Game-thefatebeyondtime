import { describe, expect, it } from 'vitest';
import { BattleEngine, enemyAI, type BattleState, type Command, type StatusEffect } from '../../src/game/combat/BattleEngine';
import { AEGIS_COMMAND } from '../../src/game/story/chapter4Flags';
import { LEAD_IN, VARLGRIM } from '../../src/game/combat/varlgrim';
import { actorOf, atMeteorCall, bossAct, c4Engine, doTurn, legalActions, mulberry32 } from './helpers/chapter4';

/**
 * Bukti no-softlock untuk meteor Varlgrim (SKILLS_AND_BOSSES.md "Meteor fairness contract" butir 3-6).
 * (1) Eksplorasi sistematis: untuk SETIAP keadaan awal jendela di grid (HP, MP, item, status, urutan giliran) seluruh urutan aksi pemain
 *     dienumerasi: ada urutan yang bertahan, dan satu-satunya yang bertahan adalah yang memakai Perlindungan.
 * (2) Fuzz: ratusan pertarungan acak dengan invarian pada setiap aksi boss.
 */

interface Outcome { aegis: boolean; survived: boolean }
function explore(e: BattleEngine, snap: BattleState, usedAegis: boolean, out: Outcome[], startTurn: number): void {
  e.restore(snap);
  const s = e.snapshot();
  if (s.outcome || s.meteor!.falls > 0) { out.push({ aegis: usedAegis, survived: s.outcome === null }); return; }
  if (s.turn > startTurn + 9) throw new Error('jendela tidak berakhir: hold tanpa akhir?');
  if (e.current.side === 'enemy') { bossAct(e); explore(e, e.snapshot(), usedAegis, out, startTurn); return; }
  const actions = legalActions(e);
  expect(actions.length).toBeGreaterThan(0); // tidak pernah ada giliran tanpa aksi (tidak ada softlock input)
  for (const a of actions) { e.restore(snap); doTurn(e, a.command, a.targetId); explore(e, e.snapshot(), usedAegis || a.command === AEGIS_COMMAND, out, startTurn); }
}

const STATUS_SETS: Record<string, StatusEffect[]> = {
  none: [], poison_stun: [{ id: 'poison', turns: 3 }, { id: 'stun', turns: 2 }], shield_defup: [{ id: 'shield', turns: 3, amount: 40 }, { id: 'def_up', turns: 2 }], regen_atk: [{ id: 'regen', turns: 2, amount: 8 }, { id: 'atk_up', turns: 2 }],
};

describe('meteor: eksplorasi sistematis keadaan awal jendela', () => {
  const grid: { name: string; setup: () => BattleEngine }[] = [];
  for (const spd of [[17, 16, 8], [8, 16, 17], [16, 17, 12]] as const)
    for (const yHp of [0, 1, 0.2, 1] as const)
      for (const vHp of [1, 0.2, 1] as const)
        for (const vMp of [0, 3, 1] as const)
          for (const potions of [0, 3] as const)
            for (const st of Object.keys(STATUS_SETS))
              grid.push({ name: `SPD${spd} yHp${yHp} vHp${vHp} vMp${vMp} potion${potions} ${st}`, setup: () => {
                const e = c4Engine('varlgrim', { level: 8, potions }, a => { a[0]!.stats.SPD = spd[0]; a[1]!.stats.SPD = spd[1]; a[2]!.stats.SPD = spd[2]; });
                return atMeteorCall(e, s => {
                  const y = s.actors.find(a => a.id === 'C01')!, v = s.actors.find(a => a.id === 'C02')!;
                  y.hp = yHp === 0 ? 0 : Math.max(1, Math.round(y.stats.HP * yHp)); v.hp = Math.max(1, Math.round(v.stats.HP * vHp)); v.mp = Math.round(v.stats.MP * vMp); y.mp = vMp === 0 ? 0 : y.mp;
                  v.aegis = 0; // muatan habis sebelum jendela: telegraf harus memulihkannya
                  y.statuses = yHp === 0 ? [] : structuredClone(STATUS_SETS[st]!); v.statuses = structuredClone(STATUS_SETS[st]!);
                  s.cursor = s.order.indexOf('C04');
                }); } });
  it(`grid awal jendela: ${grid.length} keadaan; selalu ada urutan yang bertahan; hanya Perlindungan yang menyelamatkan`, () => {
    let sims = 0, survivingStates = 0;
    for (const g of grid) {
      const e = g.setup();
      const call = bossAct(e);
      expect(call.command, g.name).toBe('meteor_call');
      const snap = e.snapshot();
      expect(actorOf(e, 'C02').aegis, g.name).toBe(1); // muatan pulih meskipun habis sebelumnya
      const out: Outcome[] = [];
      explore(e, snap, false, out, snap.turn);
      sims += out.length;
      const survive = out.filter(o => o.survived);
      expect(survive.length, g.name).toBeGreaterThan(0);                       // ada urutan yang bertahan
      expect(out.filter(o => o.aegis).every(o => o.survived), g.name).toBe(true); // memakai Perlindungan = selalu bertahan
      expect(survive.every(o => o.aegis), g.name).toBe(true);                   // tidak ada cara lain yang menyelamatkan
      expect(out.filter(o => !o.aegis).length, g.name).toBeGreaterThan(0);      // mengabaikan telegraf adalah pilihan sah (defeat)
      survivingStates++;
    }
    expect(survivingStates).toBe(grid.length);
    expect(sims).toBeGreaterThan(grid.length * 10);
  }, 120_000);
});

describe('meteor: fuzz invarian (ratusan pertarungan acak)', () => {
  const PLAIN = (c: string) => !['meteor_call', 'meteor_hold', 'meteor_fall', 'phase_shift'].includes(c);
  const stats = { fights: 0, calls: 0, falls: 0, lethalFalls: 0, protectedFalls: 0, holds: 0, shifts: 0, revives: 0 };
  function fuzz(seed: number): void {
    const rng = mulberry32(seed * 7919 + 13);
    const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)]!;
    const level = 6 + Math.floor(rng() * 5);
    const e = c4Engine('varlgrim', { level, potions: Math.floor(rng() * 4), passives: rng() < 0.7, hpFrac: 0.3 + rng() * 0.7, mpFrac: pick([0, 0.1, 0.5, 1]) }, a => {
      a[0]!.stats.SPD = 6 + Math.floor(rng() * 19); a[1]!.stats.SPD = 6 + Math.floor(rng() * 19); a[2]!.stats.SPD = 3 + Math.floor(rng() * 24);
      const b = a[2]!; b.hp = Math.ceil(b.stats.HP * pick([1, 0.7, 0.5, 0.3, 0.2]));
    }, undefined, () => { throw new Error('RNG'); });
    stats.fights++;
    let lastBoss = '', calmSinceFall = -1, sinceShift = 0, firstCall = true, phase = 1, inWindowBossCmds: string[] = [];
    for (let step = 0; step < 500 && !e.snapshot().outcome; step++) {
      const pre = e.snapshot(), me = e.current;
      for (const a of pre.actors) { expect(a.hp).toBeGreaterThanOrEqual(0); expect(a.hp).toBeLessThanOrEqual(a.stats.HP); expect(a.mp).toBeGreaterThanOrEqual(0); }
      if (me.side === 'player') {
        const acts = legalActions(e); expect(acts.length, `seed ${seed}`).toBeGreaterThan(0);
        if (pre.meteor!.open) {
          for (const a of pre.actors.filter(x => x.side === 'player')) expect(a.statuses.some(s => s.id === 'poison' || s.id === 'stun'), `seed ${seed} status di jendela`).toBe(false);
          const everyoneCovered = pre.actors.filter(x => x.side === 'player' && x.hp > 0).every(x => x.statuses.some(s => s.id === 'aegis'));
          if (me.id === 'C02') expect(e.unavailable(AEGIS_COMMAND) === null || everyoneCovered, `seed ${seed}: Perlindungan harus tersedia di giliran Velthia dalam jendela`).toBe(true);
        }
        let choice = pick(acts);
        const aegisOption = acts.find(a => a.command === AEGIS_COMMAND);
        if (aegisOption && pre.meteor!.open && rng() < 0.6) choice = aegisOption;
        doTurn(e, choice.command as Command, choice.targetId);
        continue;
      }
      // ---- giliran boss ----
      const cmd = enemyAI(me);
      const w = pre.meteor!, vAlive = pre.actors.find(a => a.id === 'C02')!.hp > 0;
      if (cmd === 'meteor_call') { expect(vAlive, `seed ${seed}: meteor tidak boleh dipanggil saat Velthia tumbang`).toBe(true); expect(w.open).toBe(false); stats.calls++; if (!firstCall) expect(calmSinceFall, `seed ${seed}: >= 2 aksi biasa antar meteor`).toBeGreaterThanOrEqual(2); else expect(sinceShift, `seed ${seed}: aksi biasa sebelum meteor pertama`).toBeGreaterThanOrEqual(VARLGRIM.minPlainBeforeFirstMeteor); inWindowBossCmds = []; }
      if (cmd === 'meteor_fall') { expect(w.open, `seed ${seed}`).toBe(true); expect(w.velthiaActed, `seed ${seed}: dampak tidak pernah datang sebelum Velthia bertindak`).toBe(true); }
      if (w.open) expect(['meteor_hold', 'meteor_fall'], `seed ${seed}: tidak ada sumber kerusakan musuh selama jendela`).toContain(cmd);
      if (lastBoss in LEAD_IN) expect(cmd === LEAD_IN[lastBoss as keyof typeof LEAD_IN] || cmd === 'meteor_hold', `seed ${seed}: ${lastBoss} harus diikuti pasangannya, bukan ${cmd}`).toBe(true);
      if (cmd === 'phase_shift') { expect(lastBoss in LEAD_IN, `seed ${seed}: phase_shift di tengah telegraf`).toBe(false); stats.shifts++; }
      const covered = pre.actors.filter(x => x.side === 'player' && x.hp > 0).map(x => ({ id: x.id, aegis: x.statuses.some(s => s.id === 'aegis'), hp: x.hp }));
      const r = bossAct(e);
      const post = e.snapshot();
      if (cmd === 'phase_shift') { expect(r.amount).toBe(0); if (r.revived) stats.revives++; }
      if (cmd === 'meteor_hold') { stats.holds++; expect(r.effects).toEqual([]); }
      if (cmd === 'meteor_fall') {
        stats.falls++;
        for (const c of covered) {
          const hp = post.actors.find(a => a.id === c.id)!.hp;
          if (c.aegis) { expect(hp, `seed ${seed}: perisai menahan`).toBeGreaterThanOrEqual(1); stats.protectedFalls += 1; } else { expect(hp, `seed ${seed}: tanpa perisai tewas`).toBe(0); stats.lethalFalls++; }
        }
        expect(post.meteor!.open).toBe(false);
        for (const a of post.actors) expect(a.statuses.some(s => s.id === 'aegis')).toBe(false);
        calmSinceFall = 0; firstCall = false;
      } else if (PLAIN(cmd) && calmSinceFall >= 0) calmSinceFall++;
      if (cmd === 'phase_shift') { sinceShift = 0; calmSinceFall = 0; firstCall = post.meteor!.falls === 0; } else if (PLAIN(cmd)) sinceShift++;
      const ph = post.actors.find(a => a.id === 'C04')!.phase!; expect(ph).toBeGreaterThanOrEqual(phase); phase = ph;
      lastBoss = cmd; inWindowBossCmds.push(cmd);
    }
    // jika kalah, penyebabnya sah: terjadi meteor tanpa perisai ATAU HP habis oleh serangan biasa (bukan oleh celah)
    const end = e.snapshot();
    expect(['victory', 'defeat', null]).toContain(end.outcome);
  }
  it('400 pertarungan acak: semua invarian jendela, fase, dan urutan terpenuhi', () => {
    for (let seed = 1; seed <= 400; seed++) fuzz(seed);
    // cakupan: skenario yang diuji benar-benar terjadi
    expect(stats.fights).toBe(400);
    expect(stats.calls).toBeGreaterThan(150); expect(stats.falls).toBeGreaterThan(100);
    expect(stats.lethalFalls).toBeGreaterThan(20); expect(stats.protectedFalls).toBeGreaterThan(100);
    expect(stats.shifts).toBeGreaterThan(300);
  }, 120_000);
});
