import { describe, expect, it } from 'vitest';
import { BattleEngine, actor, addShield, applyDamage, enemyAI, intentHint, type BattleActor, type Stats } from '../../src/game/combat/BattleEngine';
import { BattleSession } from '../../src/game/combat/BattleSession';
import { CHRONOLITH_REWARD, CHRONOLITH_STATS, OATHGUARD_REWARD, OATHGUARD_STATS, TEMPLE_MIXED_REWARD, WISPLET_STATS } from '../../src/game/combat/encounters';
import { PROFILES, SKILLS, VELTHIA_PROFILE } from '../../src/game/rpg/definitions';
import { enterChapter3, joinVelthia, applyVelthiaJoin, restChapter3Party } from '../../src/game/rpg/party';
import { createCharacter, effectiveStats, gainExp } from '../../src/game/rpg/progression';
import { equip, unlockSkill, useItem } from '../../src/game/rpg/actions';
import { VELTHIA_SKILLS, VELTHIA_SKILL_INFO, bloomAmount, mendAmount, pulseDamage, velthiaSkillsAtLevel, wardAmount } from '../../src/game/rpg/velthia';
import { memberVitals } from '../../src/game/rpg/vitals';
import { C2 } from '../../src/game/story/chapter2Flags';
import { C3, C3_BEATS, VELTHIA_COMMANDS } from '../../src/game/story/chapter3Flags';
import { GameState, validateGameStateData } from '../../src/game/systems/GameState';
import { SaveRepository } from '../../src/game/systems/SaveRepository';
import { MemoryStorage } from '../../src/game/systems/StorageAdapter';
import { bossSession, chapter2End, chapter3Start, chapter3Temple, doTurn, mulberry32, simulate, smartPolicy } from './helpers/chapter3';

const YARIC_L4: Stats = { HP: 132, MP: 18, ATK: 29, DEF: 11, MAG: 8, MDEF: 10, SPD: 13 };
const VELTHIA_L4 = (): Stats => effectiveStats(chapter3Temple(), 'C02');
function duel(enemyId = 'M01', enemyStats: Stats = { HP: 200, MP: 0, ATK: 20, DEF: 8, MAG: 3, MDEF: 6, SPD: 1 }) {
  const y = actor('C01', 'player', YARIC_L4); y.skills = ['ground_slam'];
  const v = actor('C02', 'player', VELTHIA_L4());
  const e = actor(enemyId, 'enemy', enemyStats);
  return new BattleEngine([y, v, e], { potion: 2 });
}
/** Aksi musuh otomatis sampai giliran pemain berikutnya. */
function pass(e: BattleEngine) { while (!e.snapshot().outcome && e.current.side === 'enemy') doTurn(e, enemyAI(e.current)); }
/** Pasukan tebal agar pola bos bisa diamati tanpa kekalahan; stats bos asli. */
function tank(atk = 25) {
  const bossHp = CHRONOLITH_STATS.HP;
  const y = actor('C01', 'player', { ...YARIC_L4, HP: 5000, ATK: atk }); y.skills = ['ground_slam'];
  const v = actor('C02', 'player', { ...VELTHIA_L4(), HP: 5000 });
  return new BattleEngine([y, v, actor('B03', 'enemy', { ...CHRONOLITH_STATS, HP: bossHp })], { potion: 9 });
}
const hp = (e: BattleEngine, id: string) => e.snapshot().actors.find(a => a.id === id)!.hp;
const act = (e: BattleEngine, id: string) => e.snapshot().actors.find(a => a.id === id)!;

describe('Velthia profile and progression', () => {
  it('has a class profile, no weapon, a robe, and joins at Yaric level with all five MP skills', () => {
    expect(PROFILES.C02).toBe(VELTHIA_PROFILE);
    const d = chapter3Temple(), c = d.rpg.characters.C02!;
    expect(c.classId).toBe('royal_mage'); expect(c.level).toBe(4); expect(c.exp).toBe(d.rpg.characters.C01!.exp);
    expect(c.equipment).toEqual({ weapon: null, armor: 'royal_robe' });
    expect(c.unlockedSkills.sort()).toEqual([...VELTHIA_COMMANDS].sort());
    const s = effectiveStats(d, 'C02');
    expect(s.MAG).toBeGreaterThan(s.ATK); expect(s.HP).toBeLessThan(effectiveStats(d, 'C01').HP); expect(s.MP).toBeGreaterThan(effectiveStats(d, 'C01').MP);
  });
  it('actual progression numbers: level cap is 5 (EXP 235), mandatory Chapter I-II rewards put Yaric at level 4', () => {
    const d = chapter2End();
    expect(d.rpg.characters.C01!.exp).toBe(183); expect(d.rpg.characters.C01!.level).toBe(4);
    expect(d.rpg.characters.C03!.exp).toBe(113); expect(d.rpg.characters.C03!.level).toBe(3);
  });
  it('exports Indonesian names/descriptions, MP costs, target types and unlock levels for the menu', () => {
    expect(VELTHIA_SKILLS.map(s => s.id)).toEqual([...VELTHIA_COMMANDS]);
    for (const s of VELTHIA_SKILLS) {
      expect(s.name.length).toBeGreaterThan(3); expect(s.description).toMatch(/MP/); expect(s.mp).toBeGreaterThan(0); expect(s.vfx).toBe(s.id);
      expect(['enemy', 'ally', 'allies', 'yaric']).toContain(s.target); expect(['cast', 'heal', 'shield', 'summon', 'special']).toContain(s.frameKey);
      expect(SKILLS.find(k => k.id === s.id)).toMatchObject({ classId: 'royal_mage', level: s.unlockLevel, cost: 0 });
    }
    expect(VELTHIA_SKILLS.map(s => s.unlockLevel)).toEqual([1, 1, 2, 3, 4]);
    expect(velthiaSkillsAtLevel(2)).toEqual(['velthia_pulse', 'velthia_mend', 'velthia_ward']);
    expect(VELTHIA_SKILL_INFO.velthia_concord.target).toBe('yaric');
  });
  it('unlocks skills progressively as levels are gained (no skill points needed) and spends optional passives', () => {
    let c = createCharacter(VELTHIA_PROFILE, 0);
    expect(c.unlockedSkills).toEqual(['velthia_pulse', 'velthia_mend']);
    c = gainExp(c, 25, VELTHIA_PROFILE); expect(c.unlockedSkills).toContain('velthia_ward'); expect(c.unlockedSkills).not.toContain('velthia_bloom');
    c = gainExp(c, 45, VELTHIA_PROFILE); expect(c.unlockedSkills).toContain('velthia_bloom'); expect(c.unlockedSkills).not.toContain('velthia_concord');
    c = gainExp(c, 70, VELTHIA_PROFILE); expect(c.unlockedSkills).toContain('velthia_concord');
    const d = chapter3Temple(); const before = effectiveStats(d, 'C02').MAG;
    const r = unlockSkill(d, 'gentle_light', 'C02'); expect(r.ok).toBe(true);
    if (r.ok) { expect(effectiveStats(r.data, 'C02').MAG).toBe(before + 2); expect(validateGameStateData(r.data)).not.toBeNull(); }
    expect(unlockSkill(d, 'ground_slam', 'C02').ok).toBe(false);
  });
  it('the Ultimate shield is not implemented or unlocked (Chapter IV only)', () => {
    expect(SKILLS.some(s => /ultimate|perlindungan_ultimate|protection/i.test(s.id))).toBe(false);
    expect(actor('C02', 'player', VELTHIA_L4()).skills).not.toContain('protection_ultimate');
  });
});

describe('Velthia battle skills', () => {
  it('velthia_pulse is single-target magic ignoring DEF, costs MP and reports presenter fields', () => {
    const e = duel();
    doTurn(e, 'defend'); // Yaric (SPD 13) first
    const mpBefore = act(e, 'C02').mp, mag = act(e, 'C02').stats.MAG;
    const r = doTurn(e, 'velthia_pulse', 'M01');
    expect(r.amount).toBe(pulseDamage(mag, 6)); expect(act(e, 'C02').mp).toBe(mpBefore - 2);
    expect(r).toMatchObject({ actorId: 'C02', command: 'velthia_pulse', skillId: 'velthia_pulse', frameKey: 'cast', targetId: 'M01', targetIds: ['M01'], absorbed: 0 });
    expect(r.effects).toEqual([{ targetId: 'M01', kind: 'damage', amount: r.amount }]);
  });
  it('velthia_mend heals one ally (default: most wounded), refuses full HP and fallen allies', () => {
    const y = actor('C01', 'player', YARIC_L4); const v = actor('C02', 'player', VELTHIA_L4()); y.hp = 50;
    const e = new BattleEngine([y, v, actor('M01', 'enemy', { HP: 200, MP: 0, ATK: 1, DEF: 1, MAG: 1, MDEF: 1, SPD: 1 })]);
    doTurn(e, 'defend');
    expect(e.unavailable('velthia_mend', 'C02')).toBe('HP target masih penuh.');
    const mag = act(e, 'C02').stats.MAG;
    const r = doTurn(e, 'velthia_mend');
    expect(r).toMatchObject({ targetId: 'C01', amount: mendAmount(mag), frameKey: 'heal', skillId: 'velthia_mend' });
    expect(hp(e, 'C01')).toBe(50 + mendAmount(mag)); expect(act(e, 'C02').mp).toBe(VELTHIA_L4().MP - 4);
    const dead = actor('C01', 'player', YARIC_L4); dead.hp = 0;
    const e2 = new BattleEngine([dead, { ...actor('C02', 'player', VELTHIA_L4()), hp: 30 }, actor('M01', 'enemy', { HP: 99, MP: 0, ATK: 1, DEF: 1, MAG: 1, MDEF: 1, SPD: 1 })]);
    expect(e2.unavailable('velthia_mend', 'C01')).toBe('Target tidak tersedia.');
  });
  it('velthia_ward adds a reusable shield: reports absorbed damage, lasts its owner turns, never stacks', () => {
    const e = duel('M01', { HP: 900, MP: 0, ATK: 24, DEF: 8, MAG: 3, MDEF: 6, SPD: 1 });
    doTurn(e, 'attack');
    const mag = act(e, 'C02').stats.MAG, amount = wardAmount(mag);
    const r = doTurn(e, 'velthia_ward', 'C01');
    expect(r).toMatchObject({ frameKey: 'shield', skillId: 'velthia_ward', targetId: 'C01' });
    expect(r.effects[0]).toEqual({ targetId: 'C01', kind: 'shield', amount, status: 'shield' });
    expect(act(e, 'C01').statuses).toContainEqual({ id: 'shield', turns: 3, amount });
    const hit = doTurn(e, 'attack'); // M01 menyerang Yaric
    expect(hit).toMatchObject({ actorId: 'M01', targetId: 'C01', amount: 0 }); expect(hit.absorbed).toBeGreaterThan(0);
    expect(hp(e, 'C01')).toBe(YARIC_L4.HP);
    const left = act(e, 'C01').statuses.find(x => x.id === 'shield')!.amount!;
    expect(left).toBe(amount - hit.absorbed);
    doTurn(e, 'attack'); // Yaric: 3 -> 2
    expect(act(e, 'C01').statuses.find(x => x.id === 'shield')!.turns).toBe(2);
    doTurn(e, 'velthia_ward', 'C01'); // muat ulang, tidak menumpuk
    expect(act(e, 'C01').statuses.filter(x => x.id === 'shield')).toEqual([{ id: 'shield', turns: 3, amount }]);
  });
  it('a ward cast on the caster lasts the same number of enemy actions (extra turn compensates for her own finish)', () => {
    const e = duel('M01', { HP: 900, MP: 0, ATK: 1, DEF: 8, MAG: 3, MDEF: 6, SPD: 1 });
    doTurn(e, 'attack'); doTurn(e, 'velthia_ward', 'C02');
    expect(act(e, 'C02').statuses.find(x => x.id === 'shield')!.turns).toBe(3);
  });
  it('shield helpers: absorb, overflow to HP, expiry by owner turns, no stacking', () => {
    const a = actor('C01', 'player', YARIC_L4);
    addShield(a, 40, 2); addShield(a, 30, 3);
    expect(a.statuses).toEqual([{ id: 'shield', turns: 3, amount: 40 }]);
    expect(applyDamage(a, 25)).toEqual({ hp: 0, absorbed: 25 }); expect(a.statuses[0]!.amount).toBe(15);
    expect(applyDamage(a, 25)).toEqual({ hp: 10, absorbed: 15 }); expect(a.statuses).toEqual([]);
    expect(a.hp).toBe(YARIC_L4.HP - 10);
    expect(() => addShield(a, 0, 1)).toThrow(); expect(() => addShield(a, 5, 0)).toThrow();
  });
  it('velthia_bloom heals the whole party over three of their turns and cures poison', () => {
    const e = duel(); e.addStatus('C01', 'poison', 2);
    doTurn(e, 'defend'); // Yaric: racun menetes
    const hpAfterPoison = hp(e, 'C01'); expect(hpAfterPoison).toBeLessThan(YARIC_L4.HP);
    const r = doTurn(e, 'velthia_bloom');
    expect(r).toMatchObject({ frameKey: 'summon', skillId: 'velthia_bloom' }); expect(r.targetIds.sort()).toEqual(['C01', 'C02']);
    expect(r.effects.every(x => x.kind === 'regen' && x.amount === bloomAmount(act(e, x.targetId).stats.HP))).toBe(true);
    expect(act(e, 'C01').statuses.some(s => s.id === 'poison')).toBe(false);
    pass(e);
    const beforeRegen = hp(e, 'C01');
    doTurn(e, 'defend'); // Yaric: regen
    expect(e.snapshot().ticks).toContainEqual({ actorId: 'C01', kind: 'regen', amount: Math.min(bloomAmount(YARIC_L4.HP), YARIC_L4.HP - beforeRegen) });
    expect(hp(e, 'C01')).toBe(Math.min(YARIC_L4.HP, beforeRegen + bloomAmount(YARIC_L4.HP)));
  });
  it('velthia_concord needs Yaric alive, multiplies his next attack by 1.5 once, restores 4 MP', () => {
    const e = duel(); doTurn(e, 'ground_slam'); // Yaric memakai 4 MP
    const mpBefore = act(e, 'C01').mp; expect(mpBefore).toBe(YARIC_L4.MP - 4);
    const r = doTurn(e, 'velthia_concord');
    expect(r).toMatchObject({ targetId: 'C01', frameKey: 'special', skillId: 'velthia_concord', amount: 4 });
    expect(act(e, 'C01').statuses).toContainEqual({ id: 'concord', turns: 1 }); expect(act(e, 'C01').mp).toBe(mpBefore + 4);
    pass(e);
    const hit = doTurn(e, 'attack');
    expect(hit.amount).toBe(Math.floor(Math.max(1, YARIC_L4.ATK * 1.5 - 8 * 0.5)));
    expect(act(e, 'C01').statuses.some(s => s.id === 'concord')).toBe(false);
    pass(e); doTurn(e, 'velthia_pulse'); pass(e);
    expect(doTurn(e, 'attack').amount).toBe(Math.floor(Math.max(1, YARIC_L4.ATK - 8 * 0.5))); // satu serangan saja
  });
  it('velthia_concord is unavailable without Yaric, for Yaric himself, and on a wrong target; locked/low-MP skills are refused', () => {
    const dead = actor('C01', 'player', YARIC_L4); dead.hp = 0;
    const v = actor('C02', 'player', VELTHIA_L4()); v.mp = 6;
    const e = new BattleEngine([dead, v, actor('M01', 'enemy', { HP: 99, MP: 0, ATK: 1, DEF: 1, MAG: 1, MDEF: 1, SPD: 1 })]);
    expect(e.unavailable('velthia_concord')).toBe('Yaric tidak ada di barisan.');
    expect(e.unavailable('velthia_ward')).toBeNull(); // 5 MP cukup
    expect(e.unavailable('velthia_bloom')).toBe('MP tidak cukup. Perlu 7 MP.');
    const locked = actor('C02', 'player', VELTHIA_L4()); locked.skills = ['velthia_pulse'];
    const e2 = new BattleEngine([actor('C01', 'player', YARIC_L4), locked, actor('M01', 'enemy', { HP: 99, MP: 0, ATK: 1, DEF: 1, MAG: 1, MDEF: 1, SPD: 1 })]);
    doTurn(e2, 'defend'); expect(e2.unavailable('velthia_mend')).toBe('Jurus belum terbuka.');
    expect(e2.unavailable('velthia_pulse', 'C01')).toBe('Target tidak tersedia.');
    expect(e2.prepare('velthia_mend', e2.snapshot().turn)).toBeNull();
  });
  it('enemies and Yaric cannot use enemy-only or Velthia-only commands', () => {
    const e = duel();
    expect(e.unavailable('chrono_slam')).toBe('Aksi ini hanya untuk musuh.'); expect(e.unavailable('oath_brace')).toBe('Aksi ini hanya untuk musuh.');
    expect(e.unavailable('velthia_pulse')).toBe('Jurus belum terbuka.'); // Yaric tidak punya jurus Velthia
  });
});

describe('Party switch, partyVitals and save compatibility', () => {
  it('Velthia replaces Torvan as active member; Torvan keeps level, EXP, skills, equipment, HP/MP and item', () => {
    const before = chapter3Start(); before.partyVitals!.C03 = { hp: 17, mp: 3 };
    const torvanBefore = structuredClone(before.rpg.characters.C03!);
    const after = joinVelthia(before);
    expect(after.party).toEqual(['C01', 'C02']); expect(after.flags[C3.velthiaJoined]).toBe(true); expect(after.flags[C2.torvan]).toBe(true);
    expect(after.rpg.characters.C03).toEqual(torvanBefore); expect(after.partyVitals!.C03).toEqual({ hp: 17, mp: 3 });
    expect(after.items.twig_staff).toBe(before.items.twig_staff); expect(after.items.royal_robe).toBe(1);
    expect(after.partyVitals!.C02).toEqual({ hp: effectiveStats(after, 'C02').HP, mp: effectiveStats(after, 'C02').MP });
    expect(validateGameStateData(after)).not.toBeNull(); expect(joinVelthia(after)).toBe(after); expect(applyVelthiaJoin).toBe(joinVelthia);
    expect(before.party).toEqual(['C01', 'C03']); // input tidak berubah
  });
  it('join is refused out of sequence', () => {
    expect(() => joinVelthia(chapter2End())).toThrow(); // masih Bab II
    const noTorvan = chapter3Start(); noTorvan.party = ['C01']; expect(() => joinVelthia(noTorvan)).toThrow();
    const ch1 = chapter2End(); ch1.chapter = 'I'; expect(() => enterChapter3(ch1)).toThrow();
  });
  it('enterChapter3 needs chapter 2 complete and is idempotent', () => {
    const early = chapter2End(); delete early.flags[C2.complete]; expect(() => enterChapter3(early)).toThrow();
    const d = chapter3Start(); expect(d.chapter).toBe('III'); expect(enterChapter3(d)).toBe(d);
    expect(validateGameStateData(d)?.storyBeat).toBe('C3-01');
  });
  it('rewards go only to active members: reserved Torvan is frozen, Velthia levels', () => {
    const { gs } = bossSession(); const torvan = structuredClone(gs.snapshot()!.rpg.characters.C03!);
    const done = new BattleSession(gs, 'temple_oathguard');
    for (let n = 0; n < 200 && !done.engine.snapshot().outcome; n++) { const c = done.engine.current; doTurn(done.engine, c.side === 'enemy' ? enemyAI(c) : c.id === 'C02' ? 'velthia_pulse' : 'attack'); }
    expect(done.commitVictory()).toBe(true);
    const after = gs.snapshot()!;
    expect(after.rpg.characters.C03).toEqual(torvan);
    expect(after.rpg.characters.C01!.exp).toBe(183 + OATHGUARD_REWARD.exp); expect(after.rpg.characters.C02!.exp).toBe(183 + OATHGUARD_REWARD.exp);
  });
  it('old Chapter I/II saves load unchanged; partyVitals shape still C03-only before Velthia', () => {
    const c2 = chapter2End();
    const loaded = validateGameStateData(JSON.parse(JSON.stringify(c2)))!;
    expect(loaded).toEqual({ ...c2, storyBeat: 'C2-DONE' });
    expect(loaded.partyVitals).toEqual({ C03: expect.any(Object) }); expect(Object.keys(loaded.partyVitals!)).toEqual(['C03']);
    expect(loaded.rpg.characters.C02).toBeUndefined();
    const fresh = validateGameStateData(JSON.parse(JSON.stringify({ ...c2, chapter: 'II', flags: { ...c2.flags, [C2.complete]: false } })))!; expect(fresh.storyBeat).toBe('C2-09');
  });
  it('save_v2 envelope round-trips a Chapter III party with Velthia active and Torvan reserve', () => {
    const repo = new SaveRepository(new MemoryStorage()), d = chapter3Temple(); d.partyVitals!.C03 = { hp: 9, mp: 2 };
    expect(repo.write('slot1', d)).toEqual({ ok: true });
    const r = repo.read('slot1');
    expect(r.status).toBe('ok');
    if (r.status === 'ok') { expect(r.data).toEqual(validateGameStateData(d)); expect(r.data.partyVitals!.C03).toEqual({ hp: 9, mp: 2 }); expect(r.data.party).toEqual(['C01', 'C02']); expect(r.data.schemaVersion).toBe(2); }
    expect(repo.write('auto', chapter2End())).toEqual({ ok: true });
  });
  it('rejects forged Chapter III data', () => {
    const d = chapter3Temple();
    expect(validateGameStateData({ ...d, party: ['C01', 'C03'] })).toBeNull();
    expect(validateGameStateData({ ...d, partyVitals: { C03: d.partyVitals!.C03 } })).toBeNull(); // C02 wajib
    expect(validateGameStateData({ ...d, partyVitals: { ...d.partyVitals!, C02: { hp: 9999, mp: 1 } } })).toBeNull();
    const noTorvanVitals = structuredClone(d); delete (noTorvanVitals.partyVitals as { C03?: unknown }).C03; expect(validateGameStateData(noTorvanVitals)).toBeNull();
    const early = chapter2End(); early.partyVitals = { ...early.partyVitals!, C02: { hp: 5, mp: 5 } }; expect(validateGameStateData(early)).toBeNull();
    const ghost = chapter2End(); ghost.rpg.characters.C02 = createCharacter(VELTHIA_PROFILE); expect(validateGameStateData(ghost)).toBeNull();
    expect(validateGameStateData({ ...d, flags: { ...d.flags, [C2.complete]: false } })).toBeNull();
    expect(validateGameStateData({ ...d, chapter: 'II' })).toBeNull();
    expect(validateGameStateData({ ...d, flags: { ...d.flags, [C3.start]: false } })).toBeNull();
    expect(validateGameStateData({ ...d, flags: { ...d.flags, [C3.velthiaJoined]: false } })).toBeNull();
    expect(validateGameStateData({ ...d, flags: { ...d.flags, [C3.chronolith]: true, [C3.complete]: true } })).not.toBeNull();
    expect(validateGameStateData({ ...d, flags: { ...d.flags, [C3.complete]: true } })).toBeNull(); // selesai tanpa Chronolith
    const outOfOrder = chapter3Start(); outOfOrder.area = 'temple'; expect(validateGameStateData(outOfOrder)).toBeNull();
    const robeless = structuredClone(d); robeless.rpg.characters.C02!.equipment.weapon = 'twig_staff'; expect(validateGameStateData(robeless)).toBeNull();
  });
  it('storyBeat accepts Chapter III beats derived from flags', () => {
    const d = chapter3Temple(); const beats: string[] = [];
    const flow: [string, string][] = [[C3.start, 'C3-01'], [C3.velthiaJoined, 'C3-02'], [C3.templeEntered, 'C3-03'], [C3.puzzleA, 'C3-04'], [C3.gateOpen, 'C3-05'], [C3.chronolith, 'C3-06'], [C3.promise, 'C3-07'], [C3.complete, 'C3-DONE']];
    for (const [flag, beat] of flow) { d.flags[flag] = true; beats.push(validateGameStateData(d)?.storyBeat ?? 'INVALID'); expect(C3_BEATS as readonly string[]).toContain(beat); }
    expect(beats).toEqual(['C3-05', 'C3-05', 'C3-05', 'C3-05', 'C3-05', 'C3-06', 'C3-07', 'C3-DONE']); // chapter3Temple sudah memuat gateOpen
    const gs = new GameState(); gs.load(chapter3Start()); gs.setFlag(C3.crisisSeen); expect(gs.snapshot()!.storyBeat).toBe('C3-01');
  });
  it('item use and equipment accept Velthia (C02) and write to partyVitals.C02 only', () => {
    const d = chapter3Temple(); d.partyVitals!.C02!.hp -= 30; d.vitals.hp -= 10;
    const used = useItem(d, 'potion', 'C02'); expect(used.ok).toBe(true);
    if (used.ok) { expect(used.data.partyVitals!.C02!.hp).toBe(Math.min(effectiveStats(d, 'C02').HP, d.partyVitals!.C02!.hp + 36)); expect(used.data.vitals).toEqual(d.vitals); expect(used.data.partyVitals!.C03).toEqual(d.partyVitals!.C03); }
    expect(useItem(d, 'potion', 'C03').ok).toBe(false); // cadangan tidak aktif
    expect(equip(d, 'weapon', 'twig_staff', 'C02').ok).toBe(false); // tanpa senjata
    expect(equip(d, 'armor', 'travel_coat', 'C02').ok).toBe(false); // sudah dijatah ke Yaric (hanya 1 salinan)
    expect(memberVitals(d, 'C02')).toEqual(d.partyVitals!.C02);
  });
  it('restChapter3Party heals all members including the reserve and marks the boss checkpoint only after the gate opens', () => {
    const d = chapter3Temple(); d.vitals.hp = 1; d.partyVitals!.C02!.hp = 1; d.partyVitals!.C03.hp = 1;
    const r = restChapter3Party(d);
    expect(r.vitals.hp).toBe(effectiveStats(r, 'C01').HP); expect(r.partyVitals!.C02!.hp).toBe(effectiveStats(r, 'C02').HP); expect(r.partyVitals!.C03.hp).toBe(effectiveStats(r, 'C03').HP);
    expect(r.flags[C3.checkpoint]).toBe(true); expect(r.items).toEqual(d.items); expect(r.rpg).toEqual(d.rpg);
    const early = chapter3Temple(); delete early.flags[C3.gateOpen]; expect(restChapter3Party(early).flags[C3.checkpoint]).toBeUndefined();
    expect(() => restChapter3Party(chapter3Start())).toThrow();
  });
});

describe('Temple encounters: Oathguard and mixed', () => {
  const finish = (s: BattleSession, policy: 'attack' | 'pulse' = 'attack') => {
    for (let n = 0; n < 300 && !s.engine.snapshot().outcome; n++) { const c = s.engine.current; doTurn(s.engine, c.side === 'enemy' ? enemyAI(c) : c.id === 'C02' && policy === 'pulse' ? 'velthia_pulse' : c.id === 'C01' && c.mp >= 4 ? 'ground_slam' : 'attack'); }
  };
  it('are gated to Chapter III temple with Velthia; chronolith also needs the opened gate', () => {
    for (const id of ['temple_oathguard', 'temple_mixed', 'chronolith'] as const) {
      const gs = new GameState(); gs.load(chapter3Start()); expect(() => new BattleSession(gs, id)).toThrow();
    }
    const gs = new GameState(); const d = chapter3Temple(); delete d.flags[C3.gateOpen]; gs.load(d);
    expect(() => new BattleSession(gs, 'chronolith')).toThrow(); expect(new BattleSession(gs, 'temple_oathguard').enemyIds).toEqual(['M05']);
    expect(new BattleSession(gs, 'temple_mixed').enemyIds).toEqual(['M05', 'M03']);
  });
  it('Oathguard follows a visible strike/brace/strike pattern; brace raises DEF and magic still lands', () => {
    const gs = new GameState(); gs.load(chapter3Temple()); const s = new BattleSession(gs, 'temple_oathguard');
    const seen: string[] = []; let braced = -1;
    for (let n = 0; n < 24 && !s.engine.snapshot().outcome; n++) {
      const c = s.engine.current;
      if (c.side === 'enemy') { seen.push(enemyAI(c)); if (enemyAI(c) === 'oath_brace') braced = n; expect(c.intent === 'oath_brace' ? intentHint(c) : 'x').not.toBe(''); doTurn(s.engine, enemyAI(c)); }
      else doTurn(s.engine, 'defend');
    }
    expect(seen.slice(0, 6)).toEqual(['attack', 'oath_brace', 'attack', 'attack', 'oath_brace', 'attack']); expect(braced).toBeGreaterThan(0);
    expect(OATHGUARD_STATS.MDEF).toBeLessThan(OATHGUARD_STATS.DEF);
  });
  it('rewards exactly once (flag + reward flag), mixed gives a potion, retry after defeat restores the checkpoint', () => {
    const gs = new GameState(); gs.load(chapter3Temple()); const start = gs.snapshot()!;
    const s = new BattleSession(gs, 'temple_mixed'); finish(s, 'pulse');
    expect(s.engine.snapshot().outcome).toBe('victory'); expect(s.commitVictory()).toBe(true);
    const won = gs.snapshot()!;
    expect(won.flags[C3.templeFight2]).toBe(true); expect(won.flags[TEMPLE_MIXED_REWARD.id]).toBe(true); expect(won.items.potion).toBeGreaterThanOrEqual((start.items.potion ?? 0) + 1 - 6);
    expect(won.rpg.gold - start.rpg.gold).toBe(TEMPLE_MIXED_REWARD.gold);
    expect(s.commitVictory()).toBe(false); expect(gs.snapshot()).toEqual(won);
    expect(() => new BattleSession(gs, 'temple_mixed').commitVictory()).not.toThrow(); // sudah selesai: tidak ada hadiah ganda
    const again = new BattleSession(gs, 'temple_mixed'); finish(again); expect(again.commitVictory()).toBe(false);
    expect(gs.snapshot()!.rpg.gold).toBe(won.rpg.gold);
    // defeat -> retry
    const gs2 = new GameState(); const weak = chapter3Temple(); weak.vitals.hp = 1; weak.partyVitals!.C02!.hp = 1; gs2.load(weak);
    const t = new BattleSession(gs2, 'temple_oathguard'); t.engine.addStatus('C01', 'poison', 1); t.engine.addStatus('C02', 'poison', 1);
    doTurn(t.engine, 'defend'); doTurn(t.engine, 'defend');
    expect(t.engine.snapshot().outcome).toBe('defeat'); expect(t.retry()).toBe(true);
    expect(gs2.snapshot()).toEqual(validateGameStateData(weak)); expect(gs2.snapshot()!.flags[C3.templeFight1]).toBeUndefined();
    expect(t.engine.snapshot().outcome).toBeNull();
  });
  it('a fallen Velthia is revived with partial HP after victory so the world is never softlocked; stats exist for M05/M03', () => {
    const gs = new GameState(); const d = chapter3Temple(); gs.load(d); const s = new BattleSession(gs, 'temple_oathguard');
    // Velthia tumbang di tengah pertarungan
    const snapshot = s.engine.snapshot();
    expect(snapshot.actors.map(a => a.id).sort()).toEqual(['C01', 'C02', 'M05']);
    finish(s); expect(s.engine.snapshot().outcome).toBe('victory');
    expect(WISPLET_STATS.HP).toBeGreaterThan(0);
  });
});

describe('Chronolith (B03)', () => {
  const fresh = () => bossSession().session.engine;
  const boss = (e: BattleEngine): BattleActor => e.snapshot().actors.find(a => a.id === 'B03')!;
  const bossCmds = (e: BattleEngine, n: number, player: (e: BattleEngine) => void = en => { doTurn(en, 'defend'); }) => {
    const out: ReturnType<typeof doTurn>[] = [];
    for (let i = 0; i < 600 && out.length < n && !e.snapshot().outcome; i++) { if (e.current.side === 'enemy') out.push(doTurn(e, enemyAI(e.current))); else player(e); }
    return out;
  };
  it('starts at full pattern with stats, intent and named events', () => {
    const e = fresh(), b = boss(e);
    expect(b.stats).toEqual(CHRONOLITH_STATS); expect(b.hp).toBe(CHRONOLITH_STATS.HP); expect(b.intent).toBe('chrono_sweep'); expect(b.phase).toBe(1);
    expect(e.snapshot().order).toEqual(['C01', 'C02', 'B03']);
  });
  it('every charge is followed by a player round (every living member acts) before the slam, and the slam hits the announced target', () => {
    const e = tank(); const timeline: { who: string; r: ReturnType<typeof doTurn> }[] = [];
    for (let n = 0; n < 200 && !e.snapshot().outcome && timeline.filter(x => x.who === 'B03').length < 24; n++) {
      const cur = e.current; timeline.push({ who: cur.id, r: doTurn(e, cur.side === 'enemy' ? enemyAI(cur) : cur.id === 'C01' ? 'defend' : 'velthia_pulse') });
    }
    let charges = 0;
    for (let i = 0; i < timeline.length; i++) {
      if (timeline[i]!.r.command !== 'chrono_charge') continue;
      charges++;
      const rest = timeline.slice(i + 1), slam = rest.findIndex(x => x.r.command === 'chrono_slam');
      if (slam < 0) continue; // timeline berakhir tepat setelah charge
      expect(slam).toBeGreaterThanOrEqual(2);
      expect(rest.slice(0, slam).map(x => x.who).sort()).toEqual(['C01', 'C02']);
      expect(rest[slam]!.r.targetId).toBe(timeline[i]!.r.telegraph!.targetId);
    }
    expect(charges).toBeGreaterThan(3);
  });
  it('charge targets alternate Yaric then Velthia; the intent hint names the announced target', () => {
    const e2 = tank(); const targets: string[] = [];
    for (let n = 0; n < 120 && targets.length < 4; n++) {
      const cur = e2.current;
      if (cur.side === 'enemy') {
        if (cur.intent === 'chrono_slam') expect(intentHint(cur)).toContain(cur.intentTargetName!);
        const r = doTurn(e2, enemyAI(cur)); if (r.telegraph) { targets.push(r.telegraph.targetId); expect(r.telegraph.next).toBe('chrono_slam'); expect(r.frameKey).toBe('anticipation'); }
      } else doTurn(e2, 'defend');
    }
    expect(targets.slice(0, 3)).toEqual(['C01', 'C02', 'C01']);
  });
  it('slam is the heavy single target, sweep is lighter and hits all living members; shield absorbs; defend halves', () => {
    const e = tank(); const rs = bossCmds(e, 3);
    expect(rs.map(r => r.command)).toEqual(['chrono_sweep', 'chrono_charge', 'chrono_slam']);
    expect(rs[0]!.targetIds.sort()).toEqual(['C01', 'C02']); expect(rs[0]!.frameKey).toBe('attack');
    expect(rs[2]!.targetIds).toEqual(['C01']); expect(rs[2]!.amount).toBeGreaterThan(rs[0]!.effects[0]!.amount * 2);
    const t = actor('C01', 'player', YARIC_L4); addShield(t, 200, 3);
    expect(applyDamage(t, rs[2]!.amount)).toEqual({ hp: 0, absorbed: rs[2]!.amount });
    const e2 = tank(); const d1 = bossCmds(e2, 1, en => { doTurn(en, 'attack'); })[0]!;
    expect(rs[0]!.effects.find(x => x.targetId === 'C01')!.amount).toBeLessThan(d1.effects.find(x => x.targetId === 'C01')!.amount);
  });
  it('chrono_guard halves damage taken for one full player round, is announced, then expires', () => {
    const e = tank(); let normal = 0, guarded = 0; const intents: string[] = [];
    for (let n = 0; n < 200 && intents.length < 7; n++) {
      const cur = e.current;
      if (cur.side === 'enemy') { intents.push(cur.intent!); if (cur.intent === 'chrono_guard') expect(intentHint(cur)).toMatch(/menutup diri/); doTurn(e, enemyAI(cur)); continue; }
      const g = boss(e).statuses.some(x => x.id === 'chrono_guard'), before = boss(e).hp;
      if (cur.id === 'C01') { doTurn(e, 'attack'); const dealt = before - boss(e).hp; if (g) guarded = dealt; else if (!normal) normal = dealt; } else doTurn(e, 'defend');
    }
    expect(intents.slice(0, 4)).toEqual(['chrono_sweep', 'chrono_charge', 'chrono_slam', 'chrono_guard']);
    expect(normal).toBeGreaterThan(0); expect(guarded).toBeGreaterThan(0); expect(guarded).toBeLessThanOrEqual(Math.ceil(normal / 2));
    expect(boss(e).statuses.some(x => x.id === 'chrono_guard')).toBe(false);
  });
  it('chrono_rewind shifts one ally one slot, strips the Concord buff, never removes any turn, and is deterministic', () => {
    const run = () => {
      const e = fresh(); const orders: string[][] = []; let sawRewind = false; const actorsBetween: string[] = [];
      for (let n = 0; n < 200 && !e.snapshot().outcome && !sawRewind; n++) {
        const cur = e.current;
        if (cur.side === 'enemy') {
          if (cur.intent === 'chrono_rewind') {
            expect(intentHint(cur)).toMatch(/memutar waktu/);
            e.addStatus('C01', 'concord', 1); sawRewind = true;
            const r = doTurn(e, 'chrono_rewind'); orders.push(r.order!);
            expect(r.frameKey).toBe('special'); expect(r.effects[0]).toMatchObject({ kind: 'shift', amount: 1, targetId: 'C01' });
            expect(act(e, 'C01').statuses.some(s => s.id === 'concord')).toBe(false);
            // seluruh anggota tetap bertindak sebelum aksi bos berikutnya
            for (let k = 0; k < 5 && e.current.side === 'player'; k++) { actorsBetween.push(e.current.id); doTurn(e, 'defend'); }
            expect(e.current.id).toBe('B03');
          } else doTurn(e, enemyAI(cur));
        } else doTurn(e, cur.id === 'C01' && act(e, 'C01').hp < 70 ? 'potion' : cur.id === 'C02' && act(e, 'C01').hp < 70 ? 'velthia_mend' : 'defend', act(e, 'C01').hp < 70 ? 'C01' : undefined);
      }
      return { orders, actorsBetween, sawRewind };
    };
    const a = run(), b = run();
    expect(a.sawRewind).toBe(true); expect(a).toEqual(b);
    expect(a.orders[0]).toEqual(['C02', 'C01', 'B03']); expect([...a.actorsBetween].sort()).toEqual(['C01', 'C02']); expect(a.actorsBetween[0]).toBe('C02');
  });
  it('rewind with a single living ally changes nothing and cannot skip the last player', () => {
    const y = actor('C01', 'player', YARIC_L4); const b = actor('B03', 'enemy', CHRONOLITH_STATS); b.intent = 'chrono_rewind';
    const e = new BattleEngine([y, b], { potion: 1 });
    doTurn(e, 'defend'); const r = doTurn(e, 'chrono_rewind');
    expect(r.order).toBeUndefined(); expect(e.snapshot().order).toEqual(['C01', 'B03']); expect(e.current.id).toBe('C01');
  });
  it('phase 2 begins at <=50% HP, opens with a guard pause, never splits charge and slam, and stays telegraphed', () => {
    const e = tank(); const cmds: string[] = []; let phaseAt = -1;
    for (let n = 0; n < 300 && !e.snapshot().outcome && cmds.length < 20; n++) {
      const cur = e.current;
      if (cur.side === 'enemy') { cmds.push(doTurn(e, enemyAI(cur)).command); if (phaseAt < 0 && boss(e).phase === 2) phaseAt = cmds.length; }
      else doTurn(e, cur.id === 'C01' ? 'attack' : 'velthia_pulse');
    }
    expect(phaseAt).toBeGreaterThan(0);
    const after = cmds.slice(phaseAt);
    expect(after.slice(0, 5)).toEqual(['chrono_guard', 'chrono_charge', 'chrono_slam', 'chrono_sweep', 'chrono_rewind'].slice(0, Math.min(5, after.length)));
    for (let i = 0; i < cmds.length - 1; i++) if (cmds[i] === 'chrono_charge') expect(cmds[i + 1]).toBe('chrono_slam');
  });
  it('every boss intent has a player-readable hint; none is a surprise action', () => {
    for (const intent of ['chrono_sweep', 'chrono_charge', 'chrono_slam', 'chrono_guard', 'chrono_rewind'] as const) expect(intentHint({ intent }).length).toBeGreaterThan(10);
    expect(enemyAI({ intent: 'chrono_slam' })).toBe('chrono_slam');
  });
  it('victory grants rewards exactly once; the checkpoint retry never duplicates them; only boss + reward flags are set', () => {
    const { gs, session, start } = bossSession(d => { d.items.potion = 3; });
    const r = simulate(session.engine, smartPolicy);
    expect(r.outcome).toBe('victory'); expect(r.rounds).toBeGreaterThanOrEqual(6); expect(r.rounds).toBeLessThanOrEqual(10);
    expect(session.previewReward()).toMatchObject({ exp: 235 - 183, gold: CHRONOLITH_REWARD.gold }); // EXP terpotong cap level 5
    expect(session.commitVictory()).toBe(true);
    const won = gs.snapshot()!;
    const added = Object.keys(won.flags).filter(f => !start.flags[f]).sort();
    expect(added).toEqual([C3.chronolith, CHRONOLITH_REWARD.id].sort());
    expect(won.rpg.gold - start.rpg.gold).toBe(CHRONOLITH_REWARD.gold);
    expect(won.rpg.characters.C01!.level).toBe(5); expect(won.rpg.characters.C02!.level).toBe(5);
    expect(won.chapter).toBe('III'); expect(won.storyBeat).toBe('C3-06'); expect(won.party).toEqual(['C01', 'C02']);
    expect(session.commitVictory()).toBe(false); expect(gs.snapshot()).toEqual(won);
    expect(new BattleSession(gs, 'chronolith').commitVictory()).toBe(false);
    expect(validateGameStateData(won)).not.toBeNull();
  });
  it('defeat then retry restores the exact pre-battle checkpoint (no rewards, items, flags), and a second attempt can win', () => {
    const { gs, session, start } = bossSession(d => { d.items.potion = 3; });
    for (let n = 0; n < 200 && !session.engine.snapshot().outcome; n++) { const c = session.engine.current; doTurn(session.engine, c.side === 'enemy' ? enemyAI(c) : 'defend'); }
    expect(session.engine.snapshot().outcome).toBe('defeat');
    expect(session.commitVictory()).toBe(false);
    expect(session.retry()).toBe(true);
    expect(gs.snapshot()).toEqual(start); expect(gs.snapshot()!.flags[C3.chronolith]).toBeUndefined();
    expect(session.engine.snapshot().outcome).toBeNull(); expect(boss(session.engine).hp).toBe(CHRONOLITH_STATS.HP); expect(boss(session.engine).phase).toBe(1);
    const second = simulate(session.engine, smartPolicy); expect(second.outcome).toBe('victory');
    expect(session.commitVictory()).toBe(true); expect(session.retry()).toBe(false);
  });
  it('no softlock when Velthia is down: Yaric can still act, and the party can lose cleanly then retry', () => {
    const { gs, session, start } = bossSession(d => { d.items.potion = 3; });
    // Velthia tumbang: paksa lewat serangan boss yang diarahkan; di sini kita cek mesin dengan roster tanpa Velthia hidup
    const y = actor('C01', 'player', YARIC_L4); const v = actor('C02', 'player', VELTHIA_L4()); v.hp = 0;
    const solo = new BattleEngine([y, v, actor('B03', 'enemy', CHRONOLITH_STATS)], { potion: 3 });
    expect(solo.snapshot().order).toEqual(['C01', 'B03']); expect(solo.unavailable('attack')).toBeNull(); expect(solo.unavailable('potion', 'C01')).toBe('HP masih penuh. Potion tidak dipakai.');
    for (let n = 0; n < 400 && !solo.snapshot().outcome; n++) { const c = solo.current; doTurn(solo, c.side === 'enemy' ? enemyAI(c) : 'defend'); }
    expect(solo.snapshot().outcome).toBe('defeat');
    // pemain lain tumbang -> chrono_sweep/slam tidak error; retry dari checkpoint tetap tersedia
    for (let n = 0; n < 300 && !session.engine.snapshot().outcome; n++) { const c = session.engine.current; doTurn(session.engine, c.side === 'enemy' ? enemyAI(c) : 'defend'); }
    expect(session.retry()).toBe(true); expect(gs.snapshot()).toEqual(start);
  });
  it('after a victory that leaves a member at 0 HP the member is revived at 25% (world remains playable)', () => {
    // Kondisi dipaksa lewat state internal engine: Velthia tumbang, bos mati.
    const solo = bossSession(d => { d.items.potion = 5; d.partyVitals!.C02!.hp = 1; });
    const eng = solo.session.engine; (eng as unknown as { data: { actors: BattleActor[] } }).data.actors.find(a => a.id === 'C02')!.hp = 0;
    (eng as unknown as { data: { actors: BattleActor[] } }).data.actors.find(a => a.id === 'B03')!.hp = 0;
    (eng as unknown as { checkOutcome(): void }).checkOutcome();
    expect(eng.snapshot().outcome).toBe('victory'); expect(solo.session.commitVictory()).toBe(true);
    const done = solo.gs.snapshot()!; expect(done.partyVitals!.C02!.hp).toBeGreaterThanOrEqual(Math.ceil(effectiveStats(done, 'C02').HP * 0.25) - 1); expect(done.partyVitals!.C02!.hp).toBeGreaterThan(0);
  });
  it('is fully deterministic: two runs of the same policy give identical logs', () => {
    const a = simulate(bossSession().session.engine, smartPolicy, mulberry32(7), 0.2), b = simulate(bossSession().session.engine, smartPolicy, mulberry32(7), 0.2);
    expect(a.log).toEqual(b.log); expect(a.outcome).toBe(b.outcome);
  });
});
