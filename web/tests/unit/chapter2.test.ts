import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { chapter2Script, C2_AZIE, C2_DUO_INTRO, C2_DUO_OUTRO, C2_FAREWELL, C2_FRAGMENT_A, C2_FRAGMENT_B, C2_RETURN, C2_TORVAN, C2_VEYRATH_INTRO, C2_VEYRATH_OUTRO, C2_ZIRA } from '../../src/game/dialogue/chapter2';
import { CITY_FLAG } from '../../src/game/story/aveloriaFlags';
import { C2 } from '../../src/game/story/chapter2Flags';
import { Chapter1Story } from '../../src/game/story/Chapter1Story';
import { Chapter2Story } from '../../src/game/story/Chapter2Story';
import { createNewGameData, GameState, validateGameStateData, type GameStateData } from '../../src/game/systems/GameState';
import { MOURNFANG_FLAG, MOURNFANG_VICTORY_SEEN, FIRST_HOLLOWLING_FLAG } from '../../src/game/combat/encounters';
import { joinTorvan, restChapter2Party } from '../../src/game/rpg/party';
import { applyReward, effectiveStats } from '../../src/game/rpg/progression';
import { unlockSkill, useItem } from '../../src/game/rpg/actions';
import { BattleEngine, YARIC_STATS, actor, enemyAI, turnOrder, type Command } from '../../src/game/combat/BattleEngine';
import { BRIAROOT_STATS, DUO_REWARD, VEYRATH_STATS } from '../../src/game/combat/encounters';
import { BattleSession } from '../../src/game/combat/BattleSession';
import { buildForest2, buildLiora, loadForest2, loadLiora } from '../../src/game/world/chapter2Maps';
import { footBox, moveWithCollision } from '../../src/game/world/Collision';

function chapter2(area: GameStateData['area'] = 'aveloria'): GameStateData {
  const d = createNewGameData(); d.chapter = 'II'; d.area = area;
  for (const f of [FIRST_HOLLOWLING_FLAG, MOURNFANG_FLAG, MOURNFANG_VICTORY_SEEN, ...Object.values(CITY_FLAG), C2.start]) d.flags[f] = true;
  if (area === 'liora' || area === 'forest_2') for (const f of [C2.depart, C2.farewell]) d.flags[f] = true;
  if (area === 'forest_2') { d.flags[C2.zira] = true; d.position = { x: 152, y: 560, facing: 'right' }; }
  else d.position = area === 'liora' ? { x: 480, y: 624, facing: 'up' } : { x: 856, y: 824, facing: 'right' };
  return d;
}
function doTurn(e: BattleEngine, command: Command, targetId?: string) {
  const p = e.prepare(command, e.snapshot().turn, targetId);
  expect(p).not.toBeNull(); const result = e.impact(p!.token); expect(result).not.toBeNull();
  expect(e.finish(p!.token)).toBe(true); return result!;
}

describe('Chapter II source, story and world', () => {
  const root = resolve(__dirname, '../../../');
  const source = JSON.parse(readFileSync(resolve(root, 'DIALOGUE_EVENTS.json'), 'utf8')) as { scene_id: string; line_id: string; spoken_text: string; emotion_id: string; pause_ms: number; portrait_asset_path: string }[];
  const scripts = [C2_AZIE, C2_FAREWELL, C2_ZIRA, chapter2Script('C2-04'), C2_TORVAN, C2_DUO_INTRO, C2_DUO_OUTRO,
    C2_VEYRATH_INTRO, C2_VEYRATH_OUTRO, C2_FRAGMENT_A, C2_FRAGMENT_B, C2_RETURN];
  it('plays all 97 source dialogue lines once, byte-for-byte in text, expression, pause and portrait', () => {
    const rows = scripts.flatMap(s => s.nodes).filter(n => n.type === 'line' && n.source === 'DIALOGUE_EVENTS');
    const ids = rows.map(n => n.id);
    expect(ids).toHaveLength(97); expect(new Set(ids).size).toBe(97);
    for (const n of rows) {
      if (n.type !== 'line') continue;
      const original = source.find(s => s.line_id === n.id)!;
      expect([n.text, n.expression, n.pauseMs, n.portrait]).toEqual([original.spoken_text, original.emotion_id, original.pause_ms, original.portrait_asset_path]);
    }
    expect(rows.some(n => n.type === 'line' && /pencipta dunia|kehidupan modern|reinkarnasi/i.test(n.text))).toBe(false);
  });
  it('Chapter I remains valid and Chapter II starts only from a complete old ending', () => {
    expect(validateGameStateData(createNewGameData())).not.toBeNull();
    const good = chapter2(); expect(validateGameStateData(good)?.storyBeat).toBe('C2-01');
    expect(validateGameStateData({ ...good, flags: { ...good.flags, [CITY_FLAG.complete]: false } })).toBeNull();
    expect(validateGameStateData({ ...good, chapter: 'I' })).toBeNull();
  });
  it('Azie, farewell, Zira, Torvan and Veyrath are gated by actual previous outcomes', () => {
    const gs = new GameState(); gs.load(chapter2()); let story = new Chapter1Story(gs);
    expect(story.objective()).toContain('Azie');
    expect(story.interact('velthia', { wrapCount: 0 })[0]).toMatchObject({ type: 'dialogue' });
    expect(story.interact('azie', { wrapCount: 0 }).map(a => a.type)).toEqual(['dialogue', 'setFlag']);
    const d = gs.snapshot()!; d.flags[C2.depart] = true; d.flags[C2.farewell] = true; d.area = 'liora'; gs.load(d); story = new Chapter1Story(gs);
    expect(story.interact('liora_to_forest', { wrapCount: 0 })[0]).toMatchObject({ type: 'toast' });
    expect(story.interact('zira', { wrapCount: 0 }).map(a => a.type)).toEqual(['dialogue', 'setFlag']);
  });
  it('village and woodland have traversable landmarks, branch, collisions and exits', () => {
    expect(buildLiora().id).toBe('liora'); expect(buildForest2().id).toBe('forest_2');
    const village = loadLiora(), forest = loadForest2();
    expect(village.collision.canStand(footBox(480, 624))).toBe(true);
    expect(village.collision.canStand(footBox(520, 320))).toBe(false);
    expect(forest.collision.canStand(footBox(152, 560))).toBe(true);
    expect(forest.collision.canStand(footBox(820, 400))).toBe(true);
    expect(forest.collision.canStand(footBox(1040, 320))).toBe(true);
    expect(moveWithCollision(forest.collision, 152, 560, 150, 0).x).toBeGreaterThan(250);
    forest.collision.setDynamic('veyrath_passage', forest.map.solidRects.find(s => s.id === 'veyrath_passage')!);
    expect(moveWithCollision(forest.collision, 960, 320, 120, 0).x).toBeLessThan(992);
  });
});

describe('Torvan party, battle, progression and persistence', () => {
  function joined(): GameStateData {
    const d = chapter2('forest_2'); d.flags[C2.forest] = true;
    return joinTorvan(d);
  }
  it('joins atomically after forest discovery and leaves old save shape untouched', () => {
    const old = chapter2('forest_2'); old.flags[C2.forest] = true;
    expect(old.partyVitals).toBeUndefined(); expect(old.rpg.characters.C03).toBeUndefined();
    const next = joinTorvan(old);
    expect(next.party).toEqual(['C01', 'C03']); expect(next.flags[C2.torvan]).toBe(true);
    expect(next.items.twig_staff).toBe(1); expect(next.rpg.characters.C03?.unlockedSkills).toEqual(['ranting_nakal', 'bukan_aku']);
    expect(next.partyVitals?.C03.hp).toBe(effectiveStats(next, 'C03').HP);
    expect(validateGameStateData(next)).not.toBeNull(); expect(joinTorvan(next)).toEqual(next);
    expect(old.party).toEqual(['C01']);
  });
  it('unlocks Torvan healing after progression and applies shared Potion to the selected ally only', () => {
    const d = joined(); d.items.potion = 1;
    expect(unlockSkill(d, 'tunas_bandel', 'C03').ok).toBe(false);
    const progressed = applyReward(d, DUO_REWARD).data;
    const unlocked = unlockSkill(progressed, 'tunas_bandel', 'C03');
    expect(unlocked.ok).toBe(true);
    if (!unlocked.ok) return;
    expect(unlocked.data.rpg.characters.C03!.skillPoints).toBe(0);
    expect(unlocked.data.rpg.characters.C03!.unlockedSkills).toContain('tunas_bandel');
    const hurt = structuredClone(unlocked.data); hurt.partyVitals!.C03.hp -= 30;
    const potion = useItem(hurt, 'potion', 'C03');
    expect(potion.ok).toBe(true);
    if (!potion.ok) return;
    expect(potion.data.partyVitals!.C03.hp).toBe(effectiveStats(potion.data, 'C03').HP);
    expect(potion.data.vitals).toEqual(hurt.vitals);
    expect(potion.data.items.potion).toBe((hurt.items.potion ?? 0) - 1);
    const yaric = actor('C01', 'player', YARIC_STATS); yaric.hp -= 30; yaric.stats.SPD = 1;
    const torvan = actor('C03', 'player', effectiveStats(unlocked.data, 'C03')); torvan.skills = unlocked.data.rpg.characters.C03!.unlockedSkills;
    const briaroot = actor('M02', 'enemy', BRIAROOT_STATS);
    const battle = new BattleEngine([yaric, torvan, briaroot]);
    const heal = doTurn(battle, 'tunas_bandel', 'C01');
    expect(heal.targetId).toBe('C01'); expect(heal.amount).toBe(24);
    expect(battle.snapshot().actors.find(a => a.id === 'C01')!.hp).toBe(yaric.hp + 24);
    expect(battle.snapshot().actors.find(a => a.id === 'C03')!.mp).toBe(torvan.mp - 4);
  });
  it('rejects forged party/HP/skill combinations and restores both members on a safe rest', () => {
    const d = joined();
    expect(validateGameStateData({ ...d, partyVitals: undefined })).toBeNull();
    expect(validateGameStateData({ ...d, party: ['C01'] })).toBeNull();
    expect(validateGameStateData({ ...d, partyVitals: { C03: { hp: 999, mp: 1 } } })).toBeNull();
    d.vitals.hp = 5; d.partyVitals!.C03.hp = 7;
    const rested = restChapter2Party(d);
    expect(rested.vitals.hp).toBe(effectiveStats(rested).HP);
    expect(rested.partyVitals!.C03.hp).toBe(effectiveStats(rested, 'C03').HP);
    expect(rested.items).toEqual(d.items); expect(rested.rpg).toEqual(d.rpg);
  });
  it('offers one optional varied patrol only after the persisted 20-second encounter cooldown', () => {
    const forged = joined(); forged.flags[C2.patrol] = true;
    expect(validateGameStateData(forged)).toBeNull();
    const d = joined(); d.flags[C2.tutorial] = true; d.playtimeSec = 40; d.world.lastChapter2EncounterSec = 25;
    const gs = new GameState(); gs.load(d); const story = new Chapter2Story(gs);
    expect(story.interact('forest2_patrol')[0]?.type).toBe('toast');
    const ready = gs.snapshot()!; ready.playtimeSec = 45; gs.load(ready);
    expect(story.interact('forest2_patrol')).toEqual([{ type: 'battle', encounter: 'forest2_patrol' }]);
    const patrol = new BattleSession(gs, 'forest2_patrol');
    expect(patrol.engine.snapshot().actors.map(a => a.id)).toEqual(['C01', 'C03', 'M02', 'M03']);
    expect(patrol.engine.unavailable('run')).toBeNull();
    const beforeEscape = gs.snapshot()!;
    const escape = new BattleEngine(patrol.engine.snapshot().actors, beforeEscape.items, true, () => 0);
    doTurn(escape, 'run');
    expect(escape.snapshot().outcome).toBe('escaped');
    expect(patrol.commitVictory()).toBe(false);
    expect(gs.snapshot()).toEqual(beforeEscape);
    const won = gs.snapshot()!; won.flags[C2.patrol] = true; gs.load(won);
    expect(story.interact('forest2_patrol')[0]?.type).toBe('toast');
    expect(validateGameStateData({ ...won, world: { ...won.world, lastChapter2EncounterSec: 999 } })).toBeNull();
  });
  it('orders Torvan, Yaric, enemy by SPD and lets the player choose separate enemy/ally targets', () => {
    const yaric = actor('C01', 'player', YARIC_STATS);
    const torvan = actor('C03', 'player', effectiveStats(joined(), 'C03'));
    const briaroot = actor('M02', 'enemy', BRIAROOT_STATS);
    const enemy = actor('M01', 'enemy', { ...BRIAROOT_STATS, SPD: 7 });
    const e = new BattleEngine([enemy, yaric, briaroot, torvan], { potion: 1 });
    expect(turnOrder(e.snapshot().actors)).toEqual(['C03', 'C01', 'M02', 'M01']);
    expect(e.prepare('attack', 1, 'C01')).toBeNull();
    const hit = doTurn(e, 'ranting_nakal', 'M02'); expect(hit.targetId).toBe('M02');
    expect(e.snapshot().actors.find(a => a.id === 'M01')!.hp).toBe(enemy.stats.HP);
    doTurn(e, 'defend'); doTurn(e, 'attack'); doTurn(e, 'attack');
    expect(e.current.id).toBe('C03');
    const shield = doTurn(e, 'bukan_aku', 'C01'); expect(shield.targetId).toBe('C01');
    expect(e.snapshot().actors.find(a => a.id === 'C01')!.statuses.some(s => s.id === 'def_up')).toBe(true);
  });
  it('one fallen ally does not defeat the party; poison stays on its own target', () => {
    const yaric = actor('C01', 'player', { ...YARIC_STATS, SPD: 1 }); yaric.hp = 1;
    const torvan = actor('C03', 'player', { ...YARIC_STATS, SPD: 2 });
    const briaroot = actor('M02', 'enemy', { ...BRIAROOT_STATS, SPD: 20 });
    const e = new BattleEngine([yaric, torvan, briaroot], {}, false, () => 0);
    doTurn(e, 'attack'); expect(e.snapshot().outcome).toBeNull(); expect(e.current.id).toBe('C03');
    expect(e.snapshot().actors.find(a => a.id === 'C01')!.hp).toBe(0);
    expect(e.snapshot().actors.find(a => a.id === 'C03')!.statuses).toEqual([]);
  });
  it('Veyrath uses guard, warned thrust and magic break instead of Mournfang sweep', () => {
    const yaric = actor('C01', 'player', YARIC_STATS), torvan = actor('C03', 'player', effectiveStats(joined(), 'C03'));
    const knight = actor('B02', 'enemy', VEYRATH_STATS), e = new BattleEngine([yaric, torvan, knight]);
    doTurn(e, 'defend'); doTurn(e, 'defend'); doTurn(e, 'attack');
    expect(e.snapshot().actors.find(a => a.id === 'B02')!.intent).toBe('knight_guard');
    doTurn(e, 'defend'); doTurn(e, 'defend'); doTurn(e, enemyAI(e.current));
    expect(e.snapshot().actors.find(a => a.id === 'B02')!.intent).toBe('knight_thrust');
    const cut = doTurn(e, 'ranting_nakal', 'B02'); expect(cut.text).toContain('terputus');
    expect(e.snapshot().actors.find(a => a.id === 'B02')!.intent).toBe('knight_recover');
  });
  it('duo victory grants each member EXP once; defeat/retry rolls back both HP and shared items', () => {
    const gs = new GameState(); const start = joined(); start.flags[C2.secondMarker] = true; start.items.potion = 2; gs.load(start);
    const s = new BattleSession(gs, 'duo_tutorial');
    for (let n = 0; n < 100 && !s.engine.snapshot().outcome; n++) {
      const current = s.engine.current;
      const command: Command = current.side === 'enemy' ? enemyAI(current) : current.id === 'C03' && current.mp >= 3 ? 'ranting_nakal' : current.id === 'C01' && current.mp >= 4 ? 'ground_slam' : 'attack';
      doTurn(s.engine, command);
    }
    expect(s.engine.snapshot().outcome).toBe('victory'); expect(s.commitVictory()).toBe(true);
    const won = gs.snapshot()!; expect(won.flags[C2.tutorial]).toBe(true);
    expect(won.rpg.characters.C01!.exp).toBe(28); expect(won.rpg.characters.C03!.exp).toBe(28);
    expect(s.commitVictory()).toBe(false); expect(gs.snapshot()).toEqual(won);
    const low = structuredClone(start); low.vitals.hp = 1; low.partyVitals!.C03.hp = 1; gs.load(low);
    const checkpoint = gs.snapshot()!;
    const retry = new BattleSession(gs, 'duo_tutorial'); retry.engine.addStatus('C01', 'poison', 1); retry.engine.addStatus('C03', 'poison', 1);
    doTurn(retry.engine, 'defend'); doTurn(retry.engine, 'defend');
    expect(retry.engine.snapshot().outcome).toBe('defeat'); expect(retry.retry()).toBe(true);
    expect(gs.snapshot()).toEqual(checkpoint); expect(gs.snapshot()!.flags[C2.tutorial]).toBeUndefined();
  });
});
