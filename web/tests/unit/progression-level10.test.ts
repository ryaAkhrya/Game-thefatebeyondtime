import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { equip, skillUnlockReason, trade, unlockSkill } from '../../src/game/rpg/actions';
import { CHAPTER4_REWARDS } from '../../src/game/rpg/chapter4Rewards';
import { EXP_CAP, ITEMS, LEVEL_THRESHOLDS, MAX_LEVEL, SKILLS, TORVAN_PROFILE, VELTHIA_PROFILE, YARIC_PROFILE, type ProgressionProfile } from '../../src/game/rpg/definitions';
import { applyReward, baseStatsAt, createCharacter, effectiveStats, gainExp, levelForExp, STAT_KEYS } from '../../src/game/rpg/progression';
import { REWARD_LEDGER } from '../../src/game/rpg/rewardLedger';
import { createNewGameData, validateGameStateData, type GameStateData } from '../../src/game/systems/GameState';
import { chapter1End, chapter2End, chapter2EndWithPatrol, chapter3End, chapter4From, type C4Pick } from './helpers/progression';

const profiles: ProgressionProfile[] = [YARIC_PROFILE, TORVAN_PROFILE, VELTHIA_PROFILE];
const yaricAt = (exp: number) => { const d = createNewGameData(); d.rpg.characters.C01 = createCharacter(YARIC_PROFILE, exp); const s = effectiveStats(d); d.vitals = { hp: s.HP, mp: s.MP }; return d; };
const OLD_L5 = { C01: { HP: 144, MP: 20, ATK: 28, DEF: 10, MAG: 9, MDEF: 11, SPD: 14 }, C03: { HP: 90, MP: 36, ATK: 11, DEF: 9, MAG: 23, MDEF: 19, SPD: 17 }, C02: { HP: 102, MP: 42, ATK: 10, DEF: 9, MAG: 24, MDEF: 20, SPD: 13 } } as const;

describe('Kurva EXP dan level cap 10', () => {
  it('lima threshold pertama tidak berubah; kurva naik ketat; cap 10 / EXP 800 dibagi semua profil', () => {
    expect(LEVEL_THRESHOLDS.slice(0, 5)).toEqual([0, 25, 70, 140, 235]);
    expect(LEVEL_THRESHOLDS).toHaveLength(10); expect(MAX_LEVEL).toBe(10); expect(EXP_CAP).toBe(800);
    for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) expect(LEVEL_THRESHOLDS[i]!).toBeGreaterThan(LEVEL_THRESHOLDS[i - 1]!);
    for (const p of profiles) expect(p.thresholds).toEqual(LEVEL_THRESHOLDS);
  });
  it('levelForExp tepat di setiap ambang dan satu EXP sebelumnya', () => {
    LEVEL_THRESHOLDS.forEach((t, i) => { expect(levelForExp(t)).toBe(i + 1); if (i > 0) expect(levelForExp(t - 1)).toBe(i); });
    expect(levelForExp(EXP_CAP + 500)).toBe(10);
  });
  it.each(profiles.map(p => [p.id, p] as const))('%s: EXP besar terpotong di cap, level 10, 9 poin jurus; EXP berikutnya tidak menambah apa pun', (_id, p) => {
    const c = gainExp(createCharacter(p), 100000, p);
    expect(c.level).toBe(10); expect(c.exp).toBe(800); expect(c.skillPoints).toBe(9);
    expect(gainExp(c, 1, p)).toEqual(c); expect(c.baseStats).toEqual(baseStatsAt(10, p));
  });
  it('EXP clamp: 790 + 100 = 800; hadiah di cap memberi receipt EXP 0 tanpa galat dan tanpa poin ekstra', () => {
    const c = gainExp(createCharacter(YARIC_PROFILE, 790), 100); expect(c.exp).toBe(800); expect(c.level).toBe(10);
    const d = yaricAt(800); const r = applyReward(d, { id: 'reward.test.cap', exp: 50, gold: 0 });
    expect(r.receipt).toMatchObject({ exp: 0, beforeLevel: 10, afterLevel: 10, skillPoints: 0 }); expect(r.data.rpg.characters.C01!.skillPoints).toBe(9);
  });
  it('gainExp melewati beberapa level sekaligus memberi satu poin per level dan konsisten dengan validasi', () => {
    const d = yaricAt(0); d.rpg.characters.C01 = gainExp(d.rpg.characters.C01!, 500); const s = effectiveStats(d); d.vitals = { hp: s.HP, mp: s.MP };
    expect(d.rpg.characters.C01!.level).toBe(8); expect(d.rpg.characters.C01!.skillPoints).toBe(7); expect(validateGameStateData(d)).not.toBeNull();
  });
});

describe('Pertumbuhan stat', () => {
  it('stat L1-L5 TIDAK berubah (save lama sah) dan sama dengan rumus lama linear', () => {
    for (const p of profiles) for (let l = 1; l <= 5; l++) for (const k of STAT_KEYS) expect(baseStatsAt(l, p)[k], `${p.id} L${l} ${k}`).toBe(p.base[k] + p.growth[k] * (l - 1));
    expect(baseStatsAt(5, YARIC_PROFILE)).toEqual(OLD_L5.C01); expect(baseStatsAt(5, TORVAN_PROFILE)).toEqual(OLD_L5.C03); expect(baseStatsAt(5, VELTHIA_PROFILE)).toEqual(OLD_L5.C02);
  });
  it.each(profiles.map(p => [p.id, p] as const))('%s: setiap stat monoton tidak turun; HP dan MP selalu naik ketat; stat bertumbuh pelan sesudah L5', (_id, p) => {
    for (let l = 2; l <= 10; l++) {
      const a = baseStatsAt(l - 1, p), b = baseStatsAt(l, p);
      for (const k of STAT_KEYS) expect(b[k], `${p.id} ${k} L${l}`).toBeGreaterThanOrEqual(a[k]);
      expect(b.HP).toBeGreaterThan(a.HP); expect(b.MP).toBeGreaterThan(a.MP);
      if (l > 5) for (const k of STAT_KEYS) expect(b[k] - a[k]).toBeLessThanOrEqual(p.growth[k]); // tidak pernah lebih cepat dari L1-5
    }
  });
  it('tidak ada ledakan: HP dan ATK/MAG utama L10 <= 1,4x L5; semua stat <= 1,6x', () => {
    for (const [p, key] of [[YARIC_PROFILE, 'ATK'], [VELTHIA_PROFILE, 'MAG'], [TORVAN_PROFILE, 'MAG']] as const) {
      expect(baseStatsAt(10, p)[key] / baseStatsAt(5, p)[key]).toBeLessThanOrEqual(1.4);
      expect(baseStatsAt(10, p).HP / baseStatsAt(5, p).HP).toBeLessThanOrEqual(1.4);
      for (const k of STAT_KEYS) expect(baseStatsAt(10, p)[k] / baseStatsAt(5, p)[k], `${p.id} ${k}`).toBeLessThanOrEqual(1.6);
    }
  });
  it('identitas kelas dipertahankan di setiap level 1-10', () => {
    for (let l = 1; l <= 10; l++) {
      const y = baseStatsAt(l, YARIC_PROFILE), v = baseStatsAt(l, VELTHIA_PROFILE), t = baseStatsAt(l, TORVAN_PROFILE);
      expect(y.ATK).toBeGreaterThan(v.ATK * 1.5); expect(y.ATK).toBeGreaterThan(t.ATK * 1.5); // Yaric penyerang fisik berat
      expect(y.HP).toBeGreaterThan(v.HP); expect(y.HP).toBeGreaterThan(t.HP); // Yaric paling tebal
      expect(v.MAG).toBeGreaterThan(y.MAG * 1.5); expect(v.MDEF).toBeGreaterThan(y.MDEF); expect(v.MP).toBeGreaterThan(y.MP * 1.5); // Velthia sihir/support
      expect(v.HP).toBeLessThan(y.HP * 0.8); // HP rendah
      expect(t.HP).toBeLessThan(y.HP); expect(t.SPD).toBeGreaterThan(y.SPD - 1); // Torvan support ringan dan cepat
    }
  });
  it('stat akhir (L10) jujur dan dalam rentang yang dimaksudkan (angka rujukan balancing Varlgrim)', () => {
    expect(baseStatsAt(10, YARIC_PROFILE)).toEqual({ HP: 199, MP: 30, ATK: 38, DEF: 15, MAG: 14, MDEF: 16, SPD: 19 });
    expect(baseStatsAt(10, VELTHIA_PROFILE)).toEqual({ HP: 137, MP: 57, ATK: 10, DEF: 14, MAG: 29, MDEF: 30, SPD: 18 });
    expect(baseStatsAt(10, TORVAN_PROFILE)).toEqual({ HP: 120, MP: 51, ATK: 16, DEF: 14, MAG: 28, MDEF: 29, SPD: 22 });
  });
});

describe('Jurus, poin jurus, dan pasif baru', () => {
  const NEW_PASSIVES = ['keen_edge', 'deep_breath', 'veteran_poise', 'clear_mind', 'calm_veil', 'echo_focus'];
  it('pasif baru DRAF: cost 1, level 5-9, prasyarat ada dan sekelas, bonus kecil, deskripsi Indonesia ditandai DRAF', () => {
    for (const id of NEW_PASSIVES) {
      const s = SKILLS.find(k => k.id === id)!; expect(s, id).toBeDefined();
      expect(s.cost).toBe(1); expect(s.level).toBeGreaterThanOrEqual(5); expect(s.level).toBeLessThanOrEqual(9); expect(s.description).toContain('DRAF');
      const pre = SKILLS.find(k => k.id === s.prerequisite)!; expect(pre.classId).toBe(s.classId); expect(pre.level).toBeLessThan(s.level);
      for (const v of Object.values(s.bonus!)) expect(v).toBeLessThanOrEqual(14);
      expect(Object.entries(s.bonus!).every(([k, v]) => (k === 'HP' ? v <= 14 : k === 'MP' ? v <= 6 : v <= 2))).toBe(true);
    }
    expect(new Set(SKILLS.map(s => s.id)).size).toBe(SKILLS.length);
    expect(SKILLS.filter(s => s.classId === 'mage' && NEW_PASSIVES.includes(s.id))).toHaveLength(0); // Torvan tidak mencapai level ini
  });
  it('jurus awal dan pembukaan otomatis tidak berubah (Ground Slam L1; Velthia 5 perintah menurut level)', () => {
    expect(createCharacter().unlockedSkills).toEqual(['ground_slam']);
    const v = (exp: number) => createCharacter(VELTHIA_PROFILE, exp).unlockedSkills;
    expect(v(0)).toEqual(['velthia_pulse', 'velthia_mend']); expect(v(25)).toContain('velthia_ward'); expect(v(70)).toContain('velthia_bloom'); expect(v(140)).toContain('velthia_concord');
    expect(v(800).sort()).toEqual(['velthia_bloom', 'velthia_concord', 'velthia_mend', 'velthia_pulse', 'velthia_ward']); // pasif tidak pernah terbuka otomatis
  });
  it('poin jurus = level - 1 - dibelanjakan; syarat level, prasyarat, dan poin ditegakkan', () => {
    const d = yaricAt(235); // L5: 4 poin
    expect(skillUnlockReason(d, 'keen_edge')).toBe('Buka jurus sebelumnya dulu.'); // belum ada heavy_grip
    let n = unlockSkill(d, 'heavy_grip'); expect(n.ok).toBe(true); if (!n.ok) return;
    expect(skillUnlockReason(n.data, 'deep_breath')).toBe('Perlu level 6.'); // level dicek lebih dulu; juga butuh firm_stance
    n = unlockSkill(n.data, 'firm_stance'); if (!n.ok) return;
    expect(skillUnlockReason(n.data, 'deep_breath')).toBe('Perlu level 6.');
    n = unlockSkill(n.data, 'keen_edge'); expect(n.ok).toBe(true); if (!n.ok) return;
    expect(n.data.rpg.characters.C01!.skillPoints).toBe(4 - 3); expect(validateGameStateData(n.data)).not.toBeNull();
    expect(skillUnlockReason(n.data, 'veteran_poise')).toBe('Perlu level 8.');
  });
  it('Yaric L10 dapat membuka semua pasifnya (9 poin >= 5 pasif) dan Velthia semua pasifnya; stat efektif dan validasi konsisten', () => {
    const y = yaricAt(800); let cur: GameStateData = y;
    for (const id of ['heavy_grip', 'firm_stance', 'keen_edge', 'deep_breath', 'veteran_poise']) { const r = unlockSkill(cur, id); expect(r.ok, id).toBe(true); if (r.ok) cur = r.data; }
    expect(cur.rpg.characters.C01!.skillPoints).toBe(9 - 5);
    expect(effectiveStats(cur).ATK).toBe(38 + 4 + 2 + 2); expect(effectiveStats(cur).DEF).toBe(15 + 2 + 2 + 1); expect(effectiveStats(cur).HP).toBe(199 + 14);
    cur.vitals = { hp: 1, mp: 1 }; expect(validateGameStateData(cur)).not.toBeNull();
    // Velthia
    const v = chapter3End(); v.rpg.characters.C02 = createCharacter(VELTHIA_PROFILE, 800); v.rpg.characters.C01 = createCharacter(YARIC_PROFILE, 800);
    let w = v; for (const id of ['gentle_light', 'royal_poise', 'clear_mind', 'calm_veil', 'echo_focus']) { const r = unlockSkill(w, id, 'C02'); expect(r.ok, id).toBe(true); if (r.ok) w = r.data; }
    expect(w.rpg.characters.C02!.skillPoints).toBe(9 - 5); expect(effectiveStats(w, 'C02').MAG).toBe(29 + 2 + 2 + 0);
    w.vitals = { hp: 1, mp: 1 }; w.partyVitals = { ...w.partyVitals!, C03: { hp: 1, mp: 1 }, C02: { hp: 1, mp: 1 } }; expect(validateGameStateData(w)).not.toBeNull();
  });
  it('validasi menolak pasif di bawah level syaratnya, tanpa prasyarat, atau poin tidak cocok', () => {
    const d = yaricAt(235); d.rpg.characters.C01!.unlockedSkills.push('heavy_grip', 'deep_breath'); d.rpg.characters.C01!.skillPoints = 2;
    expect(validateGameStateData(d)).toBeNull(); // deep_breath level 6, firm_stance belum ada
    const e = yaricAt(235); e.rpg.characters.C01!.unlockedSkills.push('keen_edge'); e.rpg.characters.C01!.skillPoints = 3; expect(validateGameStateData(e)).toBeNull(); // tanpa heavy_grip
    const f = yaricAt(235); f.rpg.characters.C01!.skillPoints = 3; expect(validateGameStateData(f)).toBeNull();
  });
});

describe('Persistensi dan validasi level 6-10', () => {
  it.each(LEVEL_THRESHOLDS.map((t, i) => [i + 1, t] as const))('save level %i (EXP %i) bolak-balik JSON dan identik', (_l, t) => {
    const d = yaricAt(t), back = validateGameStateData(JSON.parse(JSON.stringify(d)));
    expect(back).not.toBeNull(); expect(back!.rpg.characters.C01).toEqual(d.rpg.characters.C01);
  });
  it('menolak: EXP > 800, level tidak cocok EXP, stat memakai rumus lama sesudah L5, poin berlebih', () => {
    const over = yaricAt(800); over.rpg.characters.C01!.exp = 801; expect(validateGameStateData(over)).toBeNull();
    const lvl = yaricAt(800); lvl.rpg.characters.C01!.level = 9; expect(validateGameStateData(lvl)).toBeNull();
    const old = yaricAt(300); old.rpg.characters.C01!.baseStats.ATK = 31; expect(validateGameStateData(old)).toBeNull(); // rumus lama (3/level) pada L6
    const pts = yaricAt(300); pts.rpg.characters.C01!.skillPoints = 6; expect(validateGameStateData(pts)).toBeNull();
  });
  it('vitals divalidasi terhadap stat level 10; save level 5 lama tetap sah', () => {
    const d = yaricAt(800); d.vitals = { hp: 199, mp: 30 }; expect(validateGameStateData(d)).not.toBeNull();
    d.vitals = { hp: 200, mp: 30 }; expect(validateGameStateData(d)).toBeNull();
    const old = yaricAt(235); expect(effectiveStats(old)).toEqual({ HP: 144 + 0, MP: 20, ATK: 28 + 4, DEF: 10 + 2, MAG: 9, MDEF: 11, SPD: 14 }); expect(validateGameStateData(old)).not.toBeNull();
  });
  it('level dan EXP naik sepanjang alur hadiah lewat applyReward dan tidak pernah turun', () => {
    let d = createNewGameData(), last = 0; let lastLevel = 1;
    for (const r of [...REWARD_LEDGER].sort((a, b) => a.exp - b.exp)) {
      const next = applyReward(d, { id: r.id, exp: r.exp, gold: 0 }); d = next.data;
      expect(d.rpg.characters.C01!.exp).toBeGreaterThanOrEqual(last); expect(d.rpg.characters.C01!.level).toBeGreaterThanOrEqual(lastLevel);
      last = d.rpg.characters.C01!.exp; lastLevel = d.rpg.characters.C01!.level;
    }
    expect(last).toBe(EXP_CAP);
  });
});

describe('Perlengkapan Benteng', () => {
  it('warden_plate dan keeper_robe: armor, DEF/MDEF sesuai, tidak dijual, DRAF', () => {
    expect(ITEMS.warden_plate).toMatchObject({ kind: 'equipment', slot: 'armor', classes: ['swordsman'], bonus: { DEF: 3 }, buy: 0, sell: 0, sellable: false });
    expect(ITEMS.keeper_robe).toMatchObject({ kind: 'equipment', slot: 'armor', classes: ['royal_mage'], bonus: { DEF: 2, MDEF: 4 }, buy: 0, sell: 0, sellable: false });
    expect(ITEMS.warden_plate!.description).toContain('DRAF'); expect(ITEMS.keeper_robe!.description).toContain('DRAF');
  });
  it('dapat dipasang hanya oleh kelas yang tepat, memerlukan barangnya, dan lolos validateRpg', () => {
    const d = chapter3End(); d.items.warden_plate = 1; d.items.keeper_robe = 1;
    expect(equip(d, 'armor', 'warden_plate', 'C01').ok).toBe(true); expect(equip(d, 'armor', 'keeper_robe', 'C02').ok).toBe(true);
    expect(equip(d, 'armor', 'warden_plate', 'C02').ok).toBe(false); expect(equip(d, 'armor', 'keeper_robe', 'C01').ok).toBe(false); expect(equip(d, 'armor', 'keeper_robe', 'C03').ok).toBe(false);
    expect(equip(d, 'weapon', 'warden_plate', 'C01').ok).toBe(false);
    const y = equip(d, 'armor', 'warden_plate', 'C01'); if (!y.ok) return; const both = equip(y.data, 'armor', 'keeper_robe', 'C02'); if (!both.ok) return;
    expect(effectiveStats(both.data, 'C01').DEF).toBe(baseStatsAt(6, YARIC_PROFILE).DEF + 3); expect(effectiveStats(both.data, 'C02').MDEF).toBe(baseStatsAt(6, VELTHIA_PROFILE).MDEF + 4);
    expect(validateGameStateData(both.data)).not.toBeNull();
    const missing = chapter3End(); expect(equip(missing, 'armor', 'warden_plate', 'C01').ok).toBe(false); // tidak dimiliki
    const bad = structuredClone(both.data); bad.items.warden_plate = 0; expect(validateGameStateData(bad)).toBeNull();
  });
  it('tidak dijual atau dibeli', () => {
    const d = chapter3End(); d.items.warden_plate = 1; const shop = { id: 'x', name: 'x', stock: { warden_plate: 1, keeper_robe: 1 } };
    for (const id of ['warden_plate', 'keeper_robe']) { expect(trade(d, shop, 'buy', id).ok).toBe(false); expect(trade(d, shop, 'sell', id).ok).toBe(false); }
  });
});

describe('Hadiah: idempoten dan target level per bab', () => {
  it('applyReward idempoten untuk setiap hadiah di ledger: tidak ada hadiah ganda (EXP, emas, item)', () => {
    let d = chapter3End({ patrol2: true, temple1: true, temple2: true });
    for (const r of CHAPTER4_REWARDS) { const first = applyReward(d, { ...r, id: `${r.id}.t` }); const again = applyReward(first.data, { ...r, id: `${r.id}.t` }); expect(again.receipt).toBeNull(); expect(again.data).toBe(first.data); d = first.data; }
    const c = chapter3End(); for (const r of REWARD_LEDGER) { if (c.flags[r.id]) { const x = applyReward(c, { id: r.id, exp: r.exp, gold: 99, items: { potion: 1 } }); expect(x.receipt).toBeNull(); expect(x.data).toBe(c); } }
  });
  const lv = (d: GameStateData) => levelForExp(d.rpg.characters.C01!.exp);
  it('Bab I: L2-3; Bab II: L3-5; Bab III: L5-7 (jalur wajib minimum sampai penuh)', () => {
    expect(lv(chapter1End())).toBe(3); expect(chapter1End().rpg.characters.C01!.exp).toBe(70);
    for (const d of [chapter2End(), chapter2EndWithPatrol()]) { expect(lv(d)).toBeGreaterThanOrEqual(3); expect(lv(d)).toBeLessThanOrEqual(5); }
    for (const o of [{}, { temple1: true }, { temple1: true, temple2: true, patrol2: true }]) { const d = chapter3End(o); expect(lv(d)).toBeGreaterThanOrEqual(5); expect(lv(d)).toBeLessThanOrEqual(7); }
    expect(lv(chapter3End())).toBe(6); expect(chapter3End().rpg.characters.C01!.exp).toBe(303);
  });
  it('sebelum Varlgrim ~L8 (jalur benteng minimum L7-8, penuh L8-9); sesudah Varlgrim L9-10; Velthia sama dengan Yaric', () => {
    const full3 = chapter3End({ patrol2: true, temple1: true, temple2: true }), min3 = chapter3End();
    const paths: Array<[string, GameStateData, C4Pick]> = [
      ['minimum: gerbang+aula+uji (tanpa koridor)', min3, { court: true, hall: true, aegis: true }],
      ['minimum: +rift', min3, { court: true, hall: true, aegis: true, rift: true }],
      ['minimum: +guard', min3, { court: true, hall: true, aegis: true, guard: true }],
      ['penuh', full3, { court: true, hall: true, guard: true, rift: true, aegis: true }],
    ];
    const pre = paths.map(([, c3, pick]) => lv(chapter4From(c3, pick)));
    expect(Math.min(...pre)).toBeGreaterThanOrEqual(7); expect(Math.max(...pre)).toBeLessThanOrEqual(8); expect(pre[1]).toBe(8); expect(pre[3]).toBe(8);
    for (const [name, c3, pick] of paths) {
      const after = chapter4From(c3, { ...pick, varlgrim: true });
      expect(lv(after), name).toBeGreaterThanOrEqual(9); expect(lv(after), name).toBeLessThanOrEqual(10);
      expect(after.rpg.characters.C02!.level).toBe(after.rpg.characters.C01!.level); expect(validateGameStateData(after)).not.toBeNull();
    }
    expect(lv(chapter4From(full3, { court: true, hall: true, guard: true, rift: true, aegis: true, varlgrim: true }))).toBe(10);
  });
  it('tidak ada level gratis tanpa dasar: tanpa hadiah tidak ada EXP; total EXP wajib minimum = jumlah hadiah wajib', () => {
    expect(createNewGameData().rpg.characters.C01!.exp).toBe(0);
    expect(chapter3End().rpg.characters.C01!.exp).toBe(25 + 45 + 28 + 85 + 120);
    const total = CHAPTER4_REWARDS.reduce((s, r) => s + r.exp, 0); expect(total).toBe(46 + 54 + 56 + 60 + 48 + 200);
  });
});

describe('Tidak ada cap 5 lama yang tersisa', () => {
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const read = (f: string) => strip(readFileSync(join(__dirname, '../../src/game/rpg', f), 'utf8'));
  it('progression/validation/rewardLedger tidak mengunci 235, cap 5, atau panjang 5; kurva hanya didefinisikan satu kali di definitions', () => {
    for (const f of ['progression.ts', 'validation.ts', 'rewardLedger.ts', 'party.ts', 'actions.ts']) {
      const src = read(f); expect(src, f).not.toMatch(/\b235\b/); expect(src, f).not.toMatch(/thresholds\.at\(-1\)/); expect(src, f).not.toMatch(/(?:level|skillPoints|length)\s*(?:[<>]=?|===?|!==?|-)\s*[45]\b/);
    }
    expect(read('definitions.ts').match(/\b235\b/g)).toHaveLength(1); // hanya entri LEVEL_THRESHOLDS
    expect(read('definitions.ts')).not.toMatch(/thresholds:\s*\[/);
  });
  it('menu RPG mengambil batas EXP dari thresholds profil (tidak ada 235 terkunci)', () => {
    expect(strip(readFileSync(join(__dirname, '../../src/game/scenes/RpgMenuScene.ts'), 'utf8'))).not.toMatch(/\b235\b/);
  });
});
