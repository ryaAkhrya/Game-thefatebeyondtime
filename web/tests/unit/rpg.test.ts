import { describe, expect, it } from 'vitest';
import { createNewGameData, GameState, validateGameStateData } from '../../src/game/systems/GameState';
import { actor, BattleEngine, YARIC_STATS } from '../../src/game/combat/BattleEngine';
import { BattleSession } from '../../src/game/combat/BattleSession';
import { equip, skillUnlockReason, trade, unlockSkill, useItem, type Shop } from '../../src/game/rpg/actions';
import { HOLLOWLING_REWARD, ITEMS, MAX_GOLD, SKILLS, YARIC_PROFILE, type ProgressionProfile } from '../../src/game/rpg/definitions';
import { changeItem, itemUseReason, useConsumable } from '../../src/game/rpg/inventory';
import { applyReward, baseStatsAt, createCharacter, effectiveStats, gainExp, levelForExp } from '../../src/game/rpg/progression';

function level2() { return applyReward(createNewGameData(), HOLLOWLING_REWARD).data; }
const shop = (): Shop => ({ id: 'unit_supply', name: 'Toko Uji', stock: { potion: 3, travel_coat: 2, qa_staff: 1 } });
function rich() { const d = createNewGameData(); d.rpg.gold = 100; d.items.potion = 2; return d; }

describe('Progression and single victory transaction', () => {
  it('level one effective stats preserve the already tested tutorial balance', () => { expect(effectiveStats(createNewGameData())).toEqual(YARIC_STATS); });
  it.each([[0, 1], [24, 1], [25, 2], [69, 2], [70, 3], [140, 4], [235, 5], [299, 5], [300, 6], [800, 10], [999, 10]])('%i EXP maps to level %i', (exp, level) => { expect(levelForExp(exp)).toBe(level); });
  it('Hollowling grants 25 EXP, level 2, 8 gold and one point exactly once', () => {
    const d = createNewGameData(), first = applyReward(d, HOLLOWLING_REWARD), before = structuredClone(first.data);
    expect(first.receipt).toMatchObject({ exp: 25, gold: 8, beforeLevel: 1, afterLevel: 2, skillPoints: 1 });
    expect(first.data.rpg.characters.C01!.baseStats.HP).toBe(108); expect(first.data.rpg.characters.C01!.baseStats.MP).toBe(14);
    expect(applyReward(first.data, HOLLOWLING_REWARD).receipt).toBeNull(); expect(first.data).toEqual(before); expect(d.rpg.characters.C01!.exp).toBe(0);
  });
  it('level growth adds maximum deltas to current HP/MP, does not fully heal', () => {
    const d = createNewGameData(); d.vitals = { hp: 15, mp: 0 }; const next = applyReward(d, HOLLOWLING_REWARD).data;
    expect(next.vitals).toEqual({ hp: 27, mp: 2 }); expect(effectiveStats(next)).toEqual({ HP: 108, MP: 14, ATK: 23, DEF: 9, MAG: 6, MDEF: 8, SPD: 11 });
  });
  it('large reward caps level/EXP and grants every earned point once', () => {
    const c = gainExp(createCharacter(), 10000); expect(c.level).toBe(10); expect(c.exp).toBe(800); expect(c.skillPoints).toBe(9); expect(gainExp(c, 100).skillPoints).toBe(9);
  });
  it.each([-1, NaN, Infinity, 1.5])('rejects invalid EXP %s', exp => { expect(() => gainExp(createCharacter(), exp)).toThrow(); });
  it('gold reward respects cap', () => { const d = rich(); d.rpg.gold = MAX_GOLD - 1; expect(applyReward(d, HOLLOWLING_REWARD).receipt?.gold).toBe(1); });
  it('supports a future character profile without adding them to the active party', () => {
    const profile: ProgressionProfile = { ...YARIC_PROFILE, id: 'C03', classId: 'mage', thresholds: [0, 10, 30], growth: { ...YARIC_PROFILE.growth, MAG: 4 } };
    const c = gainExp(createCharacter(profile), 10, profile); expect(c.classId).toBe('mage'); expect(c.baseStats.MAG).toBe(9); expect(createNewGameData().party).toEqual(['C01']);
  });
  it('defeat and escape do not grant rewards; retry does not add currency/EXP', () => {
    const gs = new GameState(); gs.startNewGame(); const s = new BattleSession(gs), before = gs.snapshot();
    expect(s.commitVictory()).toBe(false); expect(s.retry()).toBe(false); expect(gs.snapshot()).toEqual(before);
    const p = actor('C01', 'player', YARIC_STATS), enemy = actor('M01', 'enemy', YARIC_STATS), e = new BattleEngine([p, enemy], {}, true, () => 0);
    e.prepare('run', 1); e.impact(1); e.finish(1); expect(e.snapshot().outcome).toBe('escaped'); expect(gs.snapshot()).toEqual(before);
    s.engine = e; expect(s.commitVictory()).toBe(false); expect(gs.snapshot()).toEqual(before);
  });
});

describe('One inventory and item effects', () => {
  it('acquisition and consumption do not mutate caller snapshots', () => {
    const items = { potion: 1 }, next = changeItem(items, 'potion', 1); expect(next?.potion).toBe(2); expect(items.potion).toBe(1);
    expect(useConsumable(items, 'potion', { hp: 90, mp: 3 }, 96)).toMatchObject({ items: { potion: 0 }, vitals: { hp: 96, mp: 3 }, healed: 6 });
  });
  it.each([0, NaN, 0.5, Infinity])('invalid quantity %s cannot acquire', amount => { expect(changeItem({}, 'potion', amount)).toBeNull(); });
  it('stock never goes negative or beyond cap, unknown item refused', () => { expect(changeItem({}, 'potion', -1)).toBeNull(); expect(changeItem({ potion: 999 }, 'potion', 1)).toBeNull(); expect(changeItem({}, 'missing', 1)).toBeNull(); });
  it.each(['__proto__', 'constructor', 'toString'])('prototype key %s is not a registered item', id => { expect(changeItem({}, id, 1)).toBeNull(); expect(useConsumable({}, id, { hp: 1, mp: 0 }, 96)).toBeNull(); });
  it.each(['yaric_greatsword', 'travel_coat', 'qa_staff', 'qa_key'])('%s is not a consumable', id => {
    expect(useConsumable({ [id]: 1 }, id, { hp: 1, mp: 0 }, 96)).toBeNull();
  });
  it('empty stock/full HP/KO refuse use without mutation', () => {
    expect(itemUseReason({}, 'potion', { hp: 1, mp: 0 }, 96)).toContain('habis');
    expect(useConsumable({ potion: 1 }, 'potion', { hp: 96, mp: 0 }, 96)).toBeNull(); expect(useConsumable({ potion: 1 }, 'potion', { hp: 0, mp: 0 }, 96)).toBeNull();
  });
  it('world inventory and battle consume the same Potion ID and definition', () => {
    const d = createNewGameData(); d.vitals!.hp = 40; d.items.potion = 2;
    const used = useItem(d, 'potion'); expect(used.ok).toBe(true); if (!used.ok) return;
    expect(used.data.vitals!.hp).toBe(76); expect(used.data.items.potion).toBe(1);
    const gs = new GameState(); gs.load(used.data); const battle = new BattleSession(gs).engine;
    battle.prepare('potion', 1); expect(battle.impact(1)?.amount).toBe(20); expect(battle.snapshot().items.potion).toBe(0); expect(ITEMS.potion!.healHP).toBe(36);
  });
});

describe('Equipment computes base + bonuses without stacking', () => {
  it('unequip lowers stats, equip restores them and never consumes equipment', () => {
    const d = createNewGameData(), off = equip(d, 'weapon', null); expect(off.ok).toBe(true); if (!off.ok) return;
    expect(effectiveStats(off.data).ATK).toBe(16); expect(off.data.items.yaric_greatsword).toBe(1);
    const on = equip(off.data, 'weapon', 'yaric_greatsword'); expect(on.ok && effectiveStats(on.data).ATK).toBe(20);
  });
  it('100 equip/unequip cycles do not accumulate stats or healing', () => {
    let d = createNewGameData(); d.vitals!.hp = 12;
    for (let n = 0; n < 100; n++) { const off = equip(d, 'armor', null); if (!off.ok) throw new Error(); const on = equip(off.data, 'armor', 'travel_coat'); if (!on.ok) throw new Error(); d = on.data; }
    expect(effectiveStats(d).DEF).toBe(8); expect(d.vitals!.hp).toBe(12); expect(d.items.travel_coat).toBe(1);
  });
  it('incompatible class, wrong slot, missing stock and consumables cannot equip', () => {
    const d = rich(); d.items.qa_staff = 1;
    expect(equip(d, 'weapon', 'qa_staff').ok).toBe(false); expect(equip(d, 'armor', 'yaric_greatsword').ok).toBe(false); expect(equip(d, 'weapon', 'potion').ok).toBe(false); delete d.items.yaric_greatsword; expect(equip(d, 'weapon', 'yaric_greatsword').ok).toBe(false);
  });
  it('battle damage uses equipment-derived ATK', () => {
    const d = createNewGameData(), off = equip(d, 'weapon', null); if (!off.ok) throw new Error(); const gs = new GameState(); gs.load(off.data);
    const e = new BattleSession(gs).engine; e.prepare('attack', 1); expect(e.impact(1)?.amount).toBe(13);
  });
});

describe('Small class skill tree', () => {
  it('Ground Slam stays unlocked at level one', () => { expect(createCharacter().unlockedSkills).toEqual(['ground_slam']); });
  it.each(SKILLS.slice(1))('$id requires level 2 and cannot spend a negative point', skill => {
    const d = createNewGameData(), before = structuredClone(d); expect(unlockSkill(d, skill.id).ok).toBe(false); expect(d).toEqual(before);
  });
  it('one level grants one meaningful passive choice; duplicate unlock costs nothing', () => {
    const d = level2(), result = unlockSkill(d, 'heavy_grip'); if (!result.ok) throw new Error(result.message);
    expect(result.data.rpg.characters.C01!.skillPoints).toBe(0); expect(effectiveStats(result.data).ATK).toBe(25);
    expect(unlockSkill(result.data, 'heavy_grip').ok).toBe(false); expect(unlockSkill(result.data, 'firm_stance').ok).toBe(false); expect(result.data.rpg.characters.C01!.skillPoints).toBe(0);
  });
  it('defense branch changes DEF instead of ATK', () => { const result = unlockSkill(level2(), 'firm_stance'); if (!result.ok) throw new Error(); expect(effectiveStats(result.data).DEF).toBe(11); expect(effectiveStats(result.data).ATK).toBe(23); });
  it('prerequisite and class restrictions are explicit', () => {
    const d = level2(); d.rpg.characters.C01!.unlockedSkills = []; expect(skillUnlockReason(d, 'heavy_grip')).toContain('sebelumnya'); d.rpg.characters.C01!.classId = 'mage'; expect(unlockSkill(d, 'heavy_grip').ok).toBe(false);
  });
  it('locked active skill cannot be used in BattleEngine even with full MP', () => {
    const d = createNewGameData(); d.rpg.characters.C01!.unlockedSkills = []; const gs = new GameState(); gs.load(d);
    const e = new BattleSession(gs).engine; expect(e.unavailable('ground_slam')).toContain('belum'); expect(e.prepare('ground_slam', 1)).toBeNull(); expect(e.current.mp).toBe(12);
  });
  it('passive choice and skills survive validated roundtrip', () => { const d = unlockSkill(level2(), 'heavy_grip'); if (!d.ok) throw new Error(); expect(validateGameStateData(d.data)?.rpg).toEqual(d.data.rpg); });
});

describe('Reusable shop transactions', () => {
  it('buy reduces gold and stock and increases shared inventory atomically', () => {
    const d = rich(), s = shop(), result = trade(d, s, 'buy', 'potion', 2); if (!result.ok) throw new Error();
    expect(result.data.rpg.gold).toBe(76); expect(result.data.items.potion).toBe(4); expect(result.shop.stock.potion).toBe(1); expect(d.rpg.gold).toBe(100); expect(s.stock.potion).toBe(3);
  });
  it('sell gives gold, removes stock from bag, returns stock to shop', () => { const result = trade(rich(), shop(), 'sell', 'potion'); if (!result.ok) throw new Error(); expect(result.data.rpg.gold).toBe(106); expect(result.data.items.potion).toBe(1); expect(result.shop.stock.potion).toBe(4); });
  it.each([0, -1, 0.5, NaN, Infinity, 100])('invalid quantity %s is an unchanged failed transaction', q => {
    const d = rich(), s = shop(), before = structuredClone([d, s]); expect(trade(d, s, 'buy', 'potion', q).ok).toBe(false); expect([d, s]).toEqual(before);
  });
  it('insufficient gold, unavailable stock, empty inventory and unknown item all fail without mutation', () => {
    const d = createNewGameData(), s = shop(), before = structuredClone([d, s]);
    expect(trade(d, s, 'buy', 'potion').ok).toBe(false); expect(trade(d, s, 'buy', 'potion', 4).ok).toBe(false); expect(trade(d, s, 'sell', 'potion').ok).toBe(false); expect(trade(d, s, 'buy', 'missing').ok).toBe(false); expect([d, s]).toEqual(before);
  });
  it('key item and bound greatsword cannot be sold; equipped armor cannot be sold', () => { const d = rich(); d.items.qa_key = 1; for (const id of ['qa_key', 'yaric_greatsword', 'travel_coat']) expect(trade(d, shop(), 'sell', id).ok).toBe(false); });
  it('unequipped spare armor may be sold without affecting base stats', () => { const result = equip(rich(), 'armor', null); if (!result.ok) throw new Error(); const sold = trade(result.data, shop(), 'sell', 'travel_coat'); if (!sold.ok) throw new Error(); expect(sold.data.items.travel_coat).toBe(0); expect(effectiveStats(sold.data).DEF).toBe(6); });
  it('gold/inventory caps prevent partial transactions', () => { const d = rich(); d.rpg.gold = MAX_GOLD; expect(trade(d, shop(), 'sell', 'potion').ok).toBe(false); d.items.potion = 999; expect(trade(d, shop(), 'buy', 'potion').ok).toBe(false); });
  it.each([-1, NaN, Infinity, 0.5, MAX_GOLD + 1])('invalid currency %s is rejected', gold => { const d = rich(); d.rpg.gold = gold; expect(trade(d, shop(), 'buy', 'potion').ok).toBe(false); });
});

describe('RPG save validation', () => {
  it.each(['gold', 'characters'])('missing rpg.%s is rejected', key => { const d = createNewGameData(); delete (d.rpg as unknown as Record<string, unknown>)[key]; expect(validateGameStateData(d)).toBeNull(); });
  it.each(['level', 'exp', 'baseStats', 'skillPoints', 'unlockedSkills', 'equipment', 'classId'])('missing character %s is rejected', key => { const d = createNewGameData(); delete (d.rpg.characters.C01 as unknown as Record<string, unknown>)[key]; expect(validateGameStateData(d)).toBeNull(); });
  it('inconsistent EXP/level, base stat inflation and duplicate skills rejected', () => {
    const d = createNewGameData(); d.rpg.characters.C01!.level = 2; expect(validateGameStateData(d)).toBeNull(); d.rpg.characters.C01!.level = 1; d.rpg.characters.C01!.baseStats.ATK = 999; expect(validateGameStateData(d)).toBeNull();
    const dup = createNewGameData(); dup.rpg.characters.C01!.unlockedSkills.push('ground_slam'); expect(validateGameStateData(dup)).toBeNull();
  });
  it('negative points, unknown skills and missing equipment inventory rejected', () => {
    const d = createNewGameData(); d.rpg.characters.C01!.skillPoints = -1; expect(validateGameStateData(d)).toBeNull(); d.rpg.characters.C01!.skillPoints = 0; d.rpg.characters.C01!.unlockedSkills.push('unknown'); expect(validateGameStateData(d)).toBeNull();
    const noWeapon = createNewGameData(); delete noWeapon.items.yaric_greatsword; expect(validateGameStateData(noWeapon)).toBeNull();
  });
  it('playtime and wrap progress are serializable and validated', () => { const gs = new GameState(); gs.startNewGame(); gs.tick(0.02); gs.setWrapCount(2); expect(validateGameStateData(gs.snapshot())?.world.forestWrapCount).toBe(2); expect(gs.snapshot()!.playtimeSec).toBeCloseTo(0.02); });
  it('invalid wrap count and unknown party progress are rejected', () => { const d = createNewGameData(); d.world.forestWrapCount = -1; expect(validateGameStateData(d)).toBeNull(); d.world.forestWrapCount = 0; d.party.push('C03'); expect(validateGameStateData(d)).toBeNull(); });
  it('every level curve stat increases without changing class identity', () => { expect(baseStatsAt(5).ATK).toBeGreaterThan(baseStatsAt(1).ATK); expect(createCharacter().classId).toBe('swordsman'); });
  it('crafted character dictionary and truncated vitals cannot crash or silently heal on load', () => {
    const d = createNewGameData(); Object.defineProperty(d.rpg.characters, '__proto__', { value: {}, enumerable: true }); expect(validateGameStateData(d)).toBeNull();
    const truncated = createNewGameData() as unknown as Record<string, unknown>; delete truncated.vitals; expect(validateGameStateData(truncated)).toBeNull();
  });
  it('validation strips renderer/circular extra fields instead of persisting objects or functions', () => {
    const d = createNewGameData(), renderer: Record<string, unknown> = { update: () => undefined }; renderer.self = renderer;
    (d.rpg.characters.C01 as unknown as Record<string, unknown>).renderer = renderer;
    const valid = validateGameStateData(d)!; expect(valid).not.toBeNull(); expect(valid.rpg.characters.C01).not.toHaveProperty('renderer'); expect(() => JSON.stringify(valid)).not.toThrow();
  });
  it.each([-1, NaN, 1.5])('invalid existing stock %s cannot enter inventory/shop transactions', count => {
    const d = rich(); d.items.potion = count; const before = structuredClone(d);
    expect(changeItem(d.items, 'potion', 1)).toBeNull(); expect(trade(d, shop(), 'buy', 'potion').ok).toBe(false); expect(d).toEqual(before);
  });
});
