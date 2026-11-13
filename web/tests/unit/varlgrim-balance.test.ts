import { describe, expect, it } from 'vitest';
import type { Command } from '../../src/game/combat/BattleEngine';
import { AEGIS_COMMAND } from '../../src/game/story/chapter4Flags';
import { VARLGRIM_STATS } from '../../src/game/combat/varlgrim';
import { aegisOnlyC4, atMeteorCall, bossAct, c4Engine, doTurn, mulberry32, partyStats, playC4, recklessC4, smartC4, type C4Foe, type C4Result, type PartyOpts, type Policy } from './helpers/chapter4';

/**
 * Simulasi balancing Varlgrim dan musuh Benteng (DRAFT). Tanpa RNG engine (engine Bab IV deterministik); "noise" = peluang aksi
 * acak sah dari pemain (seeded), untuk mengukur variasi pemain, BUKAN keberuntungan. Stat pemain dari baseStatsAt/ITEMS/SKILLS
 * (helper chapter4.ts), sehingga mengikuti kurva level 6-10 apa pun nilainya.
 */
const PROFILES = {
  /** underleveled, tanpa pasif, perlengkapan awal, satu Potion */
  low: { level: 7, gear: 'basic', passives: false, potions: 1 } as PartyOpts,
  /** sasaran desain: sebelum Varlgrim ~L8, perlengkapan Benteng, dua pasif, tiga Potion */
  avg: { level: 8, gear: 'standard', passives: true, potions: 3 } as PartyOpts,
  /** sesudah semua jalur sampingan: L9 */
  avg9: { level: 9, gear: 'standard', passives: true, potions: 3 } as PartyOpts,
  /** dekat cap: L10 dengan semua pasif yang terbuka */
  high: { level: 10, gear: 'standard', passives: 'all', potions: 3 } as PartyOpts,
};
function play(o: PartyOpts, pol: Policy, seed = 1, noise = 0, foe: C4Foe = 'varlgrim'): C4Result { return playC4(c4Engine(foe, o), pol, mulberry32(seed), noise); }
function batch(o: PartyOpts, pol: Policy, n: number, noise: number, foe: C4Foe = 'varlgrim') {
  let w = 0, rounds = 0;
  for (let i = 0; i < n; i++) { const r = play(o, pol, i + 1, noise, foe); if (r.outcome === 'victory') { w++; rounds += r.rounds; } }
  return { win: w / n, avgRounds: w ? rounds / w : 0 };
}
const swap = (pol: Policy, from: (c: Command) => boolean, to: Command): Policy => (s, me, e) => { const c = pol(s, me, e); return from(c.command) && e.unavailable(to) === null ? { command: to } : c; };

describe('Varlgrim: balancing (stat dari kurva level, parametrik)', () => {
  it('stat boss berada di kisaran yang disimulasikan dan tidak ada RNG; HP boss > 0 dan fase tidak melompat', () => {
    expect(VARLGRIM_STATS.HP).toBeGreaterThan(900); expect(VARLGRIM_STATS.SPD).toBeLessThan(partyStats(PROFILES.low).C02.SPD); // boss bertindak sesudah kedua pemain tiap ronde
  });
  it('pemain rata-rata L8 yang bermain strategis menang (Yaric = damage, Velthia = dukungan) dalam 14-24 ronde, dengan sisa HP dan Potion terpakai', () => {
    const r = play(PROFILES.avg, smartC4);
    expect(r.outcome).toBe('victory'); expect(r.rounds).toBeGreaterThanOrEqual(14); expect(r.rounds).toBeLessThanOrEqual(24);
    expect(r.hpLeft / r.hpMax).toBeGreaterThan(0.05);
    expect(r.aegisCasts).toBeGreaterThanOrEqual(1); expect(r.meteors).toBeGreaterThanOrEqual(1); expect(r.phases).toEqual([1, 2, 3]);
  });
  it('L9 menang lebih nyaman dan lebih cepat dari L8; L10 dengan semua pasif paling nyaman tetapi tetap melihat meteor (14-22 ronde pada L8-L9)', () => {
    const l8 = play(PROFILES.avg, smartC4), l9 = play(PROFILES.avg9, smartC4), l10 = play(PROFILES.high, smartC4);
    for (const r of [l8, l9, l10]) expect(r.outcome).toBe('victory');
    expect(l9.rounds).toBeLessThanOrEqual(l8.rounds); expect(l10.rounds).toBeLessThanOrEqual(l9.rounds);
    expect(l9.hpLeft / l9.hpMax).toBeGreaterThan(l8.hpLeft / l8.hpMax); expect(l10.hpLeft / l10.hpMax).toBeGreaterThan(l9.hpLeft / l9.hpMax);
    expect(l9.rounds).toBeGreaterThanOrEqual(14); expect(l9.rounds).toBeLessThanOrEqual(22); expect(l10.rounds).toBeGreaterThanOrEqual(12);
    expect(l10.meteors).toBeGreaterThanOrEqual(1); // pemain terkuat pun tidak dapat melewati meteor dengan menyerang cepat
  });
  it('pemain level rendah (L7, tanpa pasif/perlengkapan Benteng, 1 Potion) kalah bila hanya biasa-biasa saja: tidak ada jalan pintas dari level', () => {
    expect(play(PROFILES.low, smartC4).outcome).toBe('defeat');
    expect(batch(PROFILES.low, smartC4, 30, 0.2).win).toBeLessThan(0.3);
  });
  it('sembrono (tidak membaca telegraf: tanpa Perlindungan/Bertahan/Pulih) selalu kalah di L7-L10, termasuk pemain terkuat', () => {
    for (const o of [PROFILES.low, PROFILES.avg, PROFILES.avg9, PROFILES.high]) { const r = play(o, recklessC4); expect(r.outcome, `L${o.level}`).toBe('defeat'); expect(r.aegisCasts).toBe(0); }
  });
  it('hanya membaca meteor tidak cukup di L8: Defend/Ward/Mend/Potion dibutuhkan (kekalahan atau margin tipis)', () => {
    const r = play(PROFILES.avg, aegisOnlyC4); expect(r.outcome === 'defeat' || r.hpLeft / r.hpMax < 0.05).toBe(true);
    expect(play(PROFILES.low, aegisOnlyC4).outcome).toBe('defeat');
  });
  it('variasi pemain (bukan RNG): L9 dengan 20% aksi acak masih menang di sebagian besar percobaan; L8 menang sebagian; hasil dapat diulang persis', { timeout: 30000 }, () => {
    const l9 = batch(PROFILES.avg9, smartC4, 40, 0.2), l8 = batch(PROFILES.avg, smartC4, 40, 0.2);
    expect(l9.win).toBeGreaterThan(0.45); expect(l9.win).toBeLessThan(0.95);
    expect(l8.win).toBeGreaterThan(0.15); expect(l8.win).toBeLessThan(l9.win);
    expect(batch(PROFILES.avg9, smartC4, 10, 0.2)).toEqual(batch(PROFILES.avg9, smartC4, 10, 0.2)); // deterministik
    const hard = batch(PROFILES.avg9, smartC4, 40, 0.35); expect(hard.win).toBeLessThan(l9.win); expect(hard.win).toBeGreaterThan(0.2); // sembrono turun tetapi tidak mustahil
  });
  it('setiap alat bernilai di L8 (level sasaran): tanpa Pulih/Ward/Mekar kalah; tanpa Defend atau tanpa Potion sisa HP lebih sedikit; Perlindungan saja tidak cukup', () => {
    const base = play(PROFILES.avg, smartC4);
    expect(base.outcome).toBe('victory');
    const worse = (r: C4Result) => r.outcome === 'defeat' || r.hpLeft < base.hpLeft;
    expect(play(PROFILES.avg, swap(smartC4, c => c === 'velthia_mend' || c === 'velthia_ward' || c === 'velthia_bloom', 'velthia_pulse')).outcome, 'tanpa Pulih/Ward/Mekar').toBe('defeat');
    expect(worse(play(PROFILES.avg, swap(smartC4, c => c === 'defend', 'attack'))), 'tanpa Defend').toBe(true);
    expect(worse(play({ ...PROFILES.avg, potions: 0 }, smartC4)), 'tanpa Potion').toBe(true);
    expect(play(PROFILES.avg, aegisOnlyC4).outcome).toBe('defeat');
  });
  it('Yaric adalah penyerang utama dan Velthia pendukung: kerusakan Yaric > Velthia, dan Velthia memakai aksi non-serangan', () => {
    const e = c4Engine('varlgrim', PROFILES.avg9); playC4(e, smartC4);
    const log = e.snapshot().log;
    const dmg = (who: string) => log.filter(l => l.startsWith(`${who}:`) && /Varlgrim menerima (\d+)/.test(l)).reduce((n, l) => n + Number(/Varlgrim menerima (\d+)/.exec(l)![1]), 0);
    expect(dmg('Yaric')).toBeGreaterThan(dmg('Velthia'));
    expect(log.filter(l => l.startsWith('Velthia:') && /Perlindungan|Pulih|Selubung|Mekar|Selaras/.test(l)).length).toBeGreaterThanOrEqual(3);
  });
  it('MP nol atau rendah tidak membuat macet: dari jendela meteor dengan MP 0 Perlindungan tetap menyelamatkan dan pertarungan berlanjut sampai hasil sah', () => {
    for (const mpFrac of [0, 0.1]) {
      const e = atMeteorCall(c4Engine('varlgrim', { ...PROFILES.avg9, mpFrac }));
      bossAct(e); doTurn(e, 'defend'); doTurn(e, AEGIS_COMMAND); bossAct(e);
      expect(e.snapshot().outcome, `MP ${mpFrac}`).toBeNull();
      const r = playC4(e, smartC4); // lanjut dengan MP rendah
      expect(['victory', 'defeat']).toContain(r.outcome);
    }
  });
  it('level 6-10: kemenangan strategis meningkat monoton terhadap level (tanpa lonjakan tak wajar); stat memakai kurva P', () => {
    const margin = (lvl: number) => { const r = play({ level: lvl, gear: 'standard', passives: lvl >= 9 ? 'all' : true, potions: 3 }, smartC4); return r.outcome === 'victory' ? r.hpLeft / r.hpMax : -1; };
    const ms = [7, 8, 9, 10].map(margin);
    for (let i = 1; i < ms.length; i++) expect(ms[i]!).toBeGreaterThanOrEqual(ms[i - 1]!);
    expect(ms[0]!).toBeLessThan(0.3); expect(ms.at(-1)!).toBeGreaterThan(0.4);
  });
});

describe('musuh Benteng: balancing', () => {
  const lv = (level: number): PartyOpts => ({ level, gear: 'standard', passives: false, potions: 2 });
  it('Riftborn, Gravorn, penjaga, dan koridor dapat dimenangkan strategis di L6-L8 dengan sisa HP; pemain acak 30% masih menang pada encounter tunggal', () => {
    for (const foe of ['riftborn', 'gravorn', 'guardpost'] as C4Foe[]) for (const level of [6, 7, 8]) {
      const r = play(lv(level), smartC4, 1, 0, foe); expect(r.outcome, `${foe} L${level}`).toBe('victory'); expect(r.hpLeft / r.hpMax, `${foe} L${level}`).toBeGreaterThan(0.4); expect(r.rounds).toBeGreaterThanOrEqual(3); expect(r.rounds).toBeLessThanOrEqual(12);
      expect(batch(lv(level), smartC4, 20, 0.3, foe).win, `${foe} L${level} noisy`).toBeGreaterThan(0.8);
    }
    for (const level of [6, 7, 8]) { const r = play(lv(level), smartC4, 1, 0, 'rift'); expect(r.outcome, `rift L${level}`).toBe('victory'); expect(r.rounds).toBeLessThanOrEqual(20); }
  });
  it('Riftborn Penguji: tutorial Perlindungan yang dapat dimainkan; membaca telegraf menang, mengabaikannya kalah (sah); surge pasti datang', () => {
    for (const level of [6, 8, 10]) {
      const smart = play(lv(level), smartC4, 1, 0, 'trial'); expect(smart.outcome, `L${level}`).toBe('victory'); expect(smart.aegisCasts).toBeGreaterThanOrEqual(1); expect(smart.rounds).toBeLessThanOrEqual(10);
      expect(play(lv(level), aegisOnlyC4, 1, 0, 'trial').outcome).toBe('victory');
      expect(play(lv(level), recklessC4, 1, 0, 'trial').outcome).toBe('defeat');
    }
  });
});

describe('kontrak AEGIS: tidak ada jalan melemahkan keunikan Perlindungan lewat balancing', () => {
  it('setiap perintah selain velthia_aegis tidak menyelamatkan dari meteor: lihat meteor-nosoftlock (grid) dan ini: pemain terkuat tanpa Perlindungan kalah di meteor pertama', () => {
    const r = play(PROFILES.high, recklessC4); expect(r.outcome).toBe('defeat'); expect(r.meteors).toBe(1);
    expect(r.hpLeft).toBe(0);
    expect(AEGIS_COMMAND).toBe('velthia_aegis');
  });
});
