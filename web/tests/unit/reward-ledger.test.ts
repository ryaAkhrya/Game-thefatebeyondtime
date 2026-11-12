import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REWARD_LEDGER, ledgerExpFor, normalizeLedger, normalizeLedgerReport } from '../../src/game/rpg/rewardLedger';
import { EXP_CAP, PROFILES, TORVAN_PROFILE, YARIC_PROFILE } from '../../src/game/rpg/definitions';
import { enterChapter3, joinVelthia } from '../../src/game/rpg/party';
import { createCharacter, effectiveStats, gainExp, levelForExp } from '../../src/game/rpg/progression';
import { memberVitals } from '../../src/game/rpg/vitals';
import { validateGameStateData, type GameStateData } from '../../src/game/systems/GameState';
import { chapter1End, chapter2End, chapter2EndWithPatrol, chapter3End, chapter4From, legacyClamp } from './helpers/progression';

const valid = (d: GameStateData) => { const v = validateGameStateData(JSON.parse(JSON.stringify(d))); expect(v, 'fixture/hasil harus lolos validateGameStateData').not.toBeNull(); return v!; };
const same = (d: GameStateData) => { const n = normalizeLedger(d); expect(n).toBe(d); return n; };
const exp = (d: GameStateData, id: string) => d.rpg.characters[id]!.exp;

describe('REWARD_LEDGER: tabel hadiah', () => {
  it('setiap flag hadiah di source (reward.*.rpg) terdaftar di ledger, tanpa duplikat', () => {
    const ids = new Set<string>();
    const walk = (dir: string) => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p); else if (/\.ts$/.test(f)) for (const m of readFileSync(p, 'utf8').matchAll(/id:\s*'(reward\.[a-z0-9_.]+\.rpg)'/g)) ids.add(m[1]!); } };
    walk(join(__dirname, '../../src/game'));
    expect([...ids].sort()).toEqual(REWARD_LEDGER.map(e => e.id).sort());
    expect(new Set(REWARD_LEDGER.map(e => e.id)).size).toBe(REWARD_LEDGER.length);
    for (const e of REWARD_LEDGER) { expect(Number.isSafeInteger(e.exp) && e.exp > 0).toBe(true); expect(e.id.startsWith('reward.')).toBe(true); }
  });
  it('ledgerExpFor: Yaric = semua hadiah ber-flag; Torvan hanya era Bab II; Velthia = Yaric sesudah bergabung (0 sebelum)', () => {
    const c2 = chapter2End(), c3 = chapter3End();
    expect(ledgerExpFor(c2, 'C01')).toBe(183); expect(ledgerExpFor(c2, 'C03')).toBe(113); expect(ledgerExpFor(c2, 'C02')).toBe(0);
    expect(ledgerExpFor(c3, 'C01')).toBe(303); expect(ledgerExpFor(c3, 'C03')).toBe(113); expect(ledgerExpFor(c3, 'C02')).toBe(303);
    expect(ledgerExpFor(chapter2EndWithPatrol(), 'C03')).toBe(131);
    expect(ledgerExpFor(c3, 'C99')).toBe(0); expect(ledgerExpFor({ flags: {} }, 'C01')).toBe(0);
  });
  it('hadiah tanpa flag tidak dihitung (tidak ada EXP tanpa dasar)', () => {
    const d = chapter3End(); const before = ledgerExpFor(d, 'C01'); delete d.flags['reward.c3_chronolith.rpg'];
    expect(ledgerExpFor(d, 'C01')).toBe(before - 120);
  });
});

describe('normalizeLedger: save yang sudah benar tidak berubah', () => {
  it.each([['akhir Bab I', chapter1End], ['akhir Bab II', chapter2End], ['akhir Bab II + patroli', chapter2EndWithPatrol],
    ['Bab III penuh (kode baru, tanpa pemotongan)', () => chapter3End({ patrol2: true, temple1: true, temple2: true })],
    ['Bab III jalur minimum (kode baru)', () => chapter3End()]])('%s: objek identik dan tetap sah', (_n, make) => {
    const d = valid(make()); const n = same(d); expect(validateGameStateData(n)).not.toBeNull();
  });
  it('Bab III sebelum Chronolith (EXP < 235, belum terpotong): tidak berubah', () => {
    const d = chapter3End({ temple1: true, temple2: true }); d.flags['reward.c3_chronolith.rpg'] = false; d.flags['boss.chronolith'] = false; d.flags['chapter.3_complete'] = false; d.flags['c3.chronolith_outro_seen'] = false;
    // EXP tetap dari fixture (sudah termasuk Chronolith); uji hanya bahwa ledger lebih kecil tidak menurunkan EXP
    const n = normalizeLedger(d); expect(exp(n, 'C01')).toBe(exp(d, 'C01'));
  });
  it('save sudah penuh (EXP 800, L10) tidak berubah dan lolos validasi', () => {
    let d = chapter4From(chapter3End({ patrol2: true, temple1: true, temple2: true }), { court: true, hall: true, guard: true, rift: true, aegis: true, varlgrim: true });
    d = valid(d); expect(exp(d, 'C01')).toBe(EXP_CAP); expect(d.rpg.characters.C01!.level).toBe(10); same(d);
  });
});

describe('normalizeLedger: migrasi save lama dengan EXP terpotong cap 235', () => {
  const cases: Array<[string, Parameters<typeof chapter3End>[0], number]> = [
    ['jalur minimum (akhir Bab III)', {}, 303],
    ['dengan patroli kuil', { temple1: true, temple2: true }, 353],
    ['dengan semua opsional Bab II-III', { patrol2: true, temple1: true, temple2: true }, 371],
  ];
  it.each(cases)('Bab III akhir terpotong: %s -> Yaric dan Velthia dipulihkan ke EXP ledger', (_n, opts, want) => {
    const fresh = chapter3End(opts), old = valid(legacyClamp(fresh));
    expect(exp(old, 'C01')).toBe(235); expect(old.rpg.characters.C01!.level).toBe(5); // save lama sah di bawah aturan baru
    const n = valid(normalizeLedger(old));
    for (const id of ['C01', 'C02']) {
      expect(exp(n, id), id).toBe(want); expect(n.rpg.characters[id]!.level, id).toBe(levelForExp(want));
      expect(n.rpg.characters[id]!.skillPoints).toBe(n.rpg.characters[id]!.level - 1);
    }
    expect(n.rpg.characters.C03).toEqual(old.rpg.characters.C03); // Torvan cadangan tidak tersentuh
    expect(n.partyVitals!.C03).toEqual(old.partyVitals!.C03);
    expect(n.party).toEqual(['C01', 'C02']);
    expect(n.rpg.gold).toBe(old.rpg.gold); expect(n.items).toEqual(old.items); expect(n.flags).toEqual(old.flags);
  });
  it('Bab III awal: Torvan masih aktif (tanpa Velthia) dan Velthia baru bergabung tidak berubah', () => {
    const start = enterChapter3(chapter2End()); start.area = 'aveloria'; valid(start); same(start);
    const joined = joinVelthia(start); joined.area = 'temple'; joined.flags['c3.temple_entered'] = true; valid(joined);
    expect(ledgerExpFor(joined, 'C02')).toBe(183); expect(exp(joined, 'C02')).toBe(183); same(joined);
  });
  it('ledger lebih kecil dari EXP (flag hadiah dihapus) tidak pernah menurunkan EXP', () => {
    const d = chapter3End(); for (const f of ['reward.c3_chronolith.rpg', 'boss.chronolith', 'c3.chronolith_outro_seen', 'chapter.3_complete']) delete d.flags[f];
    expect(ledgerExpFor(d, 'C01')).toBe(183); valid(d); same(d); expect(exp(d, 'C01')).toBe(303);
  });
  it('vitals: tidak turun, tidak melebihi stat baru, naik sebesar kenaikan maksimum (seperti applyReward)', () => {
    const old = legacyClamp(chapter3End());
    old.vitals = { hp: 77, mp: 5 }; old.partyVitals = { ...old.partyVitals!, C02: { hp: 40, mp: 11 } };
    valid(old);
    const before = { y: effectiveStats(old, 'C01'), v: effectiveStats(old, 'C02') }, n = valid(normalizeLedger(old));
    const after = { y: effectiveStats(n, 'C01'), v: effectiveStats(n, 'C02') };
    expect(n.vitals.hp).toBe(Math.min(after.y.HP, 77 + after.y.HP - before.y.HP)); expect(n.vitals.mp).toBe(Math.min(after.y.MP, 5 + after.y.MP - before.y.MP));
    expect(n.vitals.hp).toBeGreaterThanOrEqual(77); expect(n.vitals.hp).toBeLessThanOrEqual(after.y.HP);
    const v = memberVitals(n, 'C02')!; expect(v.hp).toBe(40 + after.v.HP - before.v.HP); expect(v.mp).toBe(11 + after.v.MP - before.v.MP);
    expect(after.y.HP).toBeGreaterThan(before.y.HP); expect(after.v.HP).toBeGreaterThan(before.v.HP);
  });
  it('anggota tumbang (HP 0) tetap tumbang; HP penuh tetap penuh', () => {
    const old = legacyClamp(chapter3End()); old.partyVitals = { ...old.partyVitals!, C02: { hp: 0, mp: 3 } };
    const full = effectiveStats(old, 'C01'); old.vitals = { hp: full.HP, mp: full.MP };
    const n = valid(normalizeLedger(old));
    expect(memberVitals(n, 'C02')!.hp).toBe(0); expect(n.vitals.hp).toBe(effectiveStats(n, 'C01').HP);
  });
  it('poin jurus dihitung ulang dengan jurus yang sudah dibelanjakan; jurus otomatis Velthia konsisten', () => {
    const old = legacyClamp(chapter3End());
    const y = old.rpg.characters.C01!; y.unlockedSkills.push('heavy_grip', 'firm_stance'); y.skillPoints = 2;
    const v = old.rpg.characters.C02!; v.unlockedSkills.push('gentle_light'); v.skillPoints = 3;
    valid(old);
    const n = valid(normalizeLedger(old));
    expect(n.rpg.characters.C01!.skillPoints).toBe(5 - 2); expect(n.rpg.characters.C01!.unlockedSkills).toEqual(old.rpg.characters.C01!.unlockedSkills);
    expect(n.rpg.characters.C02!.skillPoints).toBe(5 - 1);
    for (const s of ['velthia_pulse', 'velthia_mend', 'velthia_ward', 'velthia_bloom', 'velthia_concord']) expect(n.rpg.characters.C02!.unlockedSkills).toContain(s);
  });
  it('level dan EXP tidak pernah turun, hasil sah, idempoten, input tidak dimutasi (semua kombinasi opsional x legacy x vitals)', () => {
    let count = 0;
    for (const patrol2 of [false, true]) for (const temple1 of [false, true]) for (const temple2 of [false, true]) for (const legacy of [false, true]) for (const frac of [0, 0.4, 1]) {
      const base = chapter3End({ patrol2, temple1, temple2 }); const src = legacy ? legacyClamp(base) : base;
      const s = effectiveStats(src, 'C01'); src.vitals = { hp: Math.floor(s.HP * frac), mp: Math.floor(s.MP * frac) };
      const snapshot = JSON.stringify(src), n = normalizeLedger(src);
      expect(JSON.stringify(src)).toBe(snapshot);
      for (const id of Object.keys(src.rpg.characters)) { expect(exp(n, id)).toBeGreaterThanOrEqual(exp(src, id)); expect(n.rpg.characters[id]!.level).toBeGreaterThanOrEqual(src.rpg.characters[id]!.level); }
      valid(n); expect(normalizeLedger(n)).toBe(n); expect(normalizeLedgerReport(n).changes).toEqual([]);
      const v0 = memberVitals(src, 'C02')!, v1 = memberVitals(n, 'C02')!; expect(v1.hp).toBeGreaterThanOrEqual(v0.hp); expect(v1.mp).toBeGreaterThanOrEqual(v0.mp);
      expect(n.vitals.hp).toBeGreaterThanOrEqual(src.vitals.hp); expect(n.vitals.hp).toBeLessThanOrEqual(effectiveStats(n, 'C01').HP);
      count++;
    }
    expect(count).toBe(48);
  });
  it('laporan perubahan: hanya karakter yang berubah, dan EXP tidak melebihi cap', () => {
    const r = normalizeLedgerReport(legacyClamp(chapter3End({ patrol2: true, temple1: true, temple2: true })));
    expect(r.changes.map(c => c.id).sort()).toEqual(['C01', 'C02']);
    for (const c of r.changes) { expect(c.expBefore).toBe(235); expect(c.expAfter).toBe(371); expect(c.levelBefore).toBe(5); expect(c.levelAfter).toBe(6); }
  });
});

describe('normalizeLedger: fixture QA dan kasus tepi', () => {
  it('EXP QA di atas ledger (QA menyetel L8 tanpa flag pendukung) tidak turun dan objek tidak berubah', () => {
    const d = chapter2End(); d.rpg.characters.C01 = gainExp(createCharacter(), 500); valid(d);
    expect(exp(d, 'C01')).toBe(500); expect(d.rpg.characters.C01!.level).toBe(8); same(d);
  });
  it('EXP QA di bawah ledger dinaikkan ke ledger (flag hadiah sebagai dasar), tidak pernah ke bawah', () => {
    const d = chapter2End();
    d.rpg.characters.C01 = createCharacter(YARIC_PROFILE, 100); d.rpg.characters.C03 = createCharacter(TORVAN_PROFILE, 0);
    const ys = effectiveStats(d, 'C01'), ts = effectiveStats(d, 'C03'); d.vitals = { hp: ys.HP - 5, mp: ys.MP }; d.partyVitals = { C03: { hp: ts.HP, mp: ts.MP } }; valid(d);
    const n = valid(normalizeLedger(d));
    expect(exp(n, 'C01')).toBe(183); expect(exp(n, 'C03')).toBe(113);
    expect(n.rpg.characters.C01!.level).toBe(4); expect(n.rpg.characters.C03!.level).toBe(3);
    expect(n.vitals.hp).toBeGreaterThanOrEqual(d.vitals.hp); expect(n.partyVitals!.C03.hp).toBeGreaterThanOrEqual(d.partyVitals!.C03.hp);
  });
  it('Torvan tidak pernah menerima EXP Bab III-IV dari ledger (cadangan)', () => {
    const d = chapter4From(chapter3End({ patrol2: true }), { court: true, hall: true, aegis: true });
    expect(exp(d, 'C03')).toBe(131); expect(ledgerExpFor(d, 'C03')).toBe(131); same(d);
  });
  it('EXP tidak pernah melebihi cap bahkan bila ledger melebihinya (jalur penuh 835 -> 800)', () => {
    const d = chapter4From(chapter3End({ patrol2: true, temple1: true, temple2: true }), { court: true, hall: true, guard: true, rift: true, aegis: true, varlgrim: true });
    expect(ledgerExpFor(d, 'C01')).toBeGreaterThan(EXP_CAP); expect(exp(d, 'C01')).toBe(EXP_CAP);
    for (const id of Object.keys(PROFILES)) if (d.rpg.characters[id]) expect(exp(normalizeLedger(d), id)).toBeLessThanOrEqual(EXP_CAP);
  });
  it('Bab IV akhir yang terpotong cap lama (tidak terjadi di kode nyata) tetap dipulihkan dengan benar dan sah', () => {
    const base = chapter4From(chapter3End({ patrol2: true, temple1: true, temple2: true }), { court: true, hall: true, aegis: true });
    const old = legacyClamp(base);
    old.partyVitals = { ...old.partyVitals! };
    valid(old);
    const n = valid(normalizeLedger(old));
    expect(exp(n, 'C01')).toBe(exp(base, 'C01')); expect(exp(n, 'C02')).toBe(exp(base, 'C02'));
  });
  it('save legacy v1 dengan flag hadiah tetapi EXP 0 (migrasi v1 menyetel flag tanpa memberi EXP) dipulihkan ke 25 EXP (dasar: flag) - dicatat sebagai perilaku sengaja', () => {
    const d = chapter1End(); d.flags['reward.mournfang.rpg'] = false;
    const y = d.rpg.characters.C01!; Object.assign(y, { exp: 0, level: 1, skillPoints: 0 }); y.baseStats = { HP: 96, MP: 12, ATK: 16, DEF: 6, MAG: 5, MDEF: 7, SPD: 10 };
    d.vitals = { hp: 96, mp: 12 }; valid(d);
    const n = valid(normalizeLedger(d)); expect(exp(n, 'C01')).toBe(25); expect(n.rpg.characters.C01!.level).toBe(2);
  });
});
