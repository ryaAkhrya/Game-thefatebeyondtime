import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BattleEngine, enemyAI, intentHint, type Command } from '../../src/game/combat/BattleEngine';
import { BattleSession } from '../../src/game/combat/BattleSession';
import { BOSS_CHECKPOINT, BOSS_CHECKPOINT_FLAG, FIRST_HOLLOWLING_FLAG, FOREST_EDGE_FLAG, MOURNFANG_FLAG, MOURNFANG_REWARD, MOURNFANG_STATS, MOURNFANG_VICTORY_SEEN, SLICE_COMPLETE } from '../../src/game/combat/encounters';
import { mournfangPlayback } from '../../src/game/combat/BattleAtlas';
import { MOURNFANG_INTRO, MOURNFANG_RESPONSE, MOURNFANG_VICTORY } from '../../src/game/dialogue/mournfang';
import { applyReward } from '../../src/game/rpg/progression';
import { HOLLOWLING_REWARD } from '../../src/game/rpg/definitions';
import { restBeforeMournfang } from '../../src/game/rpg/checkpoints';
import { GameState, createNewGameData, validateGameStateData, type GameStateData } from '../../src/game/systems/GameState';
import { SaveRepository } from '../../src/game/systems/SaveRepository';
import { MemoryStorage } from '../../src/game/systems/StorageAdapter';
import { Chapter1Story } from '../../src/game/story/Chapter1Story';
import { loadForestEdge } from '../../src/game/world/forestEdge';
import { footBox, moveWithCollision } from '../../src/game/world/Collision';
import { readPng } from './helpers/png';

function checkpoint(level = 2): GameStateData {
  const initial = createNewGameData();
  const d = level === 2 ? applyReward(initial, HOLLOWLING_REWARD).data : initial;
  for (const flag of ['c1.intro_seen', 'story.c1_awake', 'story.c1_nambo', 'story.c1_loop', 'c1.loop_noticed', 'c1.hollowling_victory_seen', FIRST_HOLLOWLING_FLAG, FOREST_EDGE_FLAG]) d.flags[flag] = true;
  d.area = 'forest_edge'; d.position = { ...BOSS_CHECKPOINT }; d.storyBeat = 'C1-05';
  return restBeforeMournfang(d);
}
function session(d = checkpoint()) { const gs = new GameState(); gs.load(d); return { gs, battle: new BattleSession(gs, 'mournfang') }; }
function act(e: BattleEngine, command: Command) { const p = e.prepare(command, e.snapshot().turn); if (!p) throw new Error(e.unavailable(command) ?? 'Rejected'); const impact = e.impact(p.token)!; expect(e.finish(p.token)).toBe(true); return impact; }
function win(e: BattleEngine, strategy: 'interrupt' | 'guard' | 'reckless' = 'interrupt') {
  for (let turns = 0; !e.snapshot().outcome && turns < 120; turns++) {
    if (e.current.side === 'enemy') act(e, enemyAI(e.current));
    else {
      const boss = e.snapshot().actors.find(a => a.id === 'B01')!;
      act(e, strategy !== 'reckless' && boss.intent === 'sweep' ? strategy === 'interrupt' && e.current.mp >= 4 ? 'ground_slam' : 'defend' : 'attack');
    }
  }
  return e.snapshot();
}

describe('Mournfang pattern, response window and difficulty', () => {
  it('has twice the tutorial HP, slower SPD, and begins with a normal strike', () => {
    const { battle } = session(); expect(MOURNFANG_STATS.HP).toBe(224); expect(battle.engine.current.id).toBe('C01');
    expect(enemyAI(battle.engine.snapshot().actors[1])).toBe('attack');
  });
  it('normal -> windup -> sweep -> recover repeats with a full player action between each', () => {
    const { battle } = session(), e = battle.engine; const choices: Command[] = [];
    for (let i = 0; i < 5; i++) { act(e, 'defend'); choices.push(enemyAI(e.current)); act(e, enemyAI(e.current)); expect(e.current.id).toBe('C01'); }
    expect(choices).toEqual(['attack', 'boss_windup', 'boss_sweep', 'boss_recover', 'attack']);
  });
  it('windup spends no HP and the next accepted player action can defend against sweep', () => {
    const e = session().battle.engine; act(e, 'attack'); act(e, 'attack'); act(e, 'attack');
    const hp = e.snapshot().actors[0]!.hp; act(e, 'boss_windup'); expect(e.current.hp).toBe(hp);
    expect(intentHint(e.snapshot().actors[1]!)).toContain('Bertahan'); const turn = e.snapshot().turn;
    act(e, 'defend'); expect(act(e, 'boss_sweep').amount).toBe(13); expect(e.snapshot().turn).toBe(turn + 2);
  });
  it('engine rejects skipping telegraph, boss moves from the player and stale contacts', () => {
    const e = session().battle.engine; expect(e.prepare('boss_sweep', 1)).toBeNull(); act(e, 'attack');
    expect(e.prepare('boss_sweep', 2)).toBeNull(); const p = e.prepare('attack', 2)!;
    e.impact(p.token); const after = e.snapshot(); expect(e.impact(p.token)).toBeNull(); expect(e.snapshot()).toEqual(after); e.finish(p.token);
  });
  it('Ground Slam interrupts only a charged sweep and spends exactly 4 MP', () => {
    const e = session().battle.engine; act(e, 'attack'); act(e, 'attack'); act(e, 'attack'); act(e, 'boss_windup');
    const mp = e.current.mp, hp = e.current.hp; const hit = act(e, 'ground_slam');
    expect(hit.text).toContain('gagal'); expect(e.snapshot().actors[0]!.mp).toBe(mp - 4); expect(enemyAI(e.current)).toBe('boss_recover'); act(e, 'boss_recover'); expect(e.current.hp).toBe(hp);
  });
  it('Ground Slam before charge deals normal damage without skipping windup', () => {
    const e = session().battle.engine; act(e, 'ground_slam'); expect(enemyAI(e.current)).toBe('attack'); act(e, 'attack'); expect(e.snapshot().actors[1]!.intent).toBe('windup');
  });
  it.each([1, 2])('level %i solo can win with no Potions, using readable counters and no grinding', level => {
    const result = win(session(checkpoint(level)).battle.engine); expect(result.outcome).toBe('victory'); expect(result.actors[0]!.hp).toBeGreaterThan(0); expect(result.items.potion ?? 0).toBe(0);
  });
  it('level 2 can win after unequipping both slots, with no passive or consumable', () => {
    const d = checkpoint(); d.rpg.characters.C01!.equipment = { weapon: null, armor: null }; const result = win(session(d).battle.engine);
    expect(result.outcome).toBe('victory'); expect(result.actors[0]!.hp).toBeGreaterThan(0);
  });
  it('ignoring all telegraphs without healing loses; defeat does not mutate GameState', () => {
    const { gs, battle } = session(), before = gs.snapshot(); expect(win(battle.engine, 'reckless').outcome).toBe('defeat'); expect(gs.snapshot()).toEqual(before); expect(battle.commitVictory()).toBe(false);
  });
  it('defeat -> retry restores exact checkpoint resources, items and initial AI', () => {
    const d = checkpoint(); d.vitals.hp = 1; d.items.potion = 1; const { gs, battle } = session(d);
    act(battle.engine, 'potion'); while (!battle.engine.snapshot().outcome) act(battle.engine, battle.engine.current.side === 'enemy' ? enemyAI(battle.engine.current) : 'defend');
    expect(battle.retry()).toBe(true); expect(battle.engine.snapshot().actors[0]!.hp).toBe(1); expect(battle.engine.snapshot().items.potion).toBe(1); expect(battle.engine.snapshot().actors[1]!.intent).toBe('strike'); expect(gs.snapshot()).toEqual(d);
  });
  it('wrong chronology cannot start boss, and an encounter completion is not an entry flag', () => {
    const gs = new GameState(); gs.startNewGame(); expect(() => new BattleSession(gs, 'mournfang')).toThrow(); expect(session().gs.hasFlag(MOURNFANG_FLAG)).toBe(false);
  });
  it('retry keeps active playtime while restoring the combat checkpoint', () => {
    const d = checkpoint(); d.vitals.hp = 1; const { gs, battle } = session(d);
    gs.tick(0.1); act(battle.engine, 'attack'); act(battle.engine, 'attack');
    expect(battle.retry()).toBe(true); expect(gs.snapshot()!.playtimeSec).toBe(0.1); expect(gs.snapshot()!.vitals.hp).toBe(1);
  });
});

describe('Boss rewards, checkpoint and persistence', () => {
  it('rest refills to effective maxima repeatedly without creating loot, EXP, gold or gear', () => {
    const d = checkpoint(); d.vitals = { hp: 1, mp: 0 }; d.items.potion = 0;
    const next = restBeforeMournfang(d); expect(next.vitals).toEqual({ hp: 108, mp: 14 }); expect(next.flags[BOSS_CHECKPOINT_FLAG]).toBe(true);
    expect(next.items).toEqual(d.items); expect(next.rpg).toEqual(d.rpg); expect(restBeforeMournfang(next)).toEqual(next); expect(d.vitals.hp).toBe(1);
  });
  it('rest out of area/order is rejected', () => { expect(() => restBeforeMournfang(createNewGameData())).toThrow(); });
  it('victory commits boss flag, 45 EXP, 20 gold and one Potion exactly once after recovery', () => {
    const { gs, battle } = session(); win(battle.engine); expect(gs.hasFlag(MOURNFANG_FLAG)).toBe(false);
    expect(battle.previewReward()?.items).toEqual({ potion: 1 }); expect(battle.commitVictory()).toBe(true);
    const d = gs.snapshot()!; expect(d.rpg.characters.C01!.exp).toBe(70); expect(d.rpg.characters.C01!.level).toBe(3); expect(d.rpg.gold).toBe(28); expect(d.items.potion).toBe(1); expect(d.flags[MOURNFANG_FLAG]).toBe(true);
    expect(battle.commitVictory()).toBe(false); expect(battle.retry()).toBe(false); expect(gs.snapshot()).toEqual(d);
    expect(applyReward(d, MOURNFANG_REWARD).receipt).toBeNull();
  });
  it('loot caps safely; invalid reward items never mutate the input', () => {
    const d = checkpoint(); d.items.potion = 999; const next = applyReward(d, MOURNFANG_REWARD); expect(next.data.items.potion).toBe(999); expect(next.receipt?.items).toBeUndefined();
    expect(() => applyReward(d, { ...MOURNFANG_REWARD, items: { potion: -1 } })).toThrow(); expect(d.rpg.gold).toBe(8);
  });
  it('save/load before and after boss preserves complete RPG state, story order and no duplicate reward', () => {
    const { gs, battle } = session(), repo = new SaveRepository(new MemoryStorage()); expect(repo.write('slot1', gs.snapshot()!).ok).toBe(true);
    win(battle.engine); battle.commitVictory(); gs.setFlag(MOURNFANG_VICTORY_SEEN); gs.setFlag(SLICE_COMPLETE); const d = gs.snapshot()!;
    expect(repo.write('slot2', d).ok).toBe(true); const loaded = repo.read('slot2'); if (loaded.status !== 'ok') throw new Error();
    expect(loaded.data).toEqual(d); expect(loaded.data.storyBeat).toBe('SLICE-DONE'); expect(applyReward(loaded.data, MOURNFANG_REWARD).receipt).toBeNull();
    const before = repo.read('slot1'); expect(before.status === 'ok' && before.data.flags[MOURNFANG_FLAG]).toBeUndefined();
  });
  it.each([MOURNFANG_FLAG, FOREST_EDGE_FLAG, BOSS_CHECKPOINT_FLAG, SLICE_COMPLETE, MOURNFANG_VICTORY_SEEN])('rejects out-of-order new flag %s', flag => {
    const d = createNewGameData(); d.flags[flag] = true; expect(validateGameStateData(d)).toBeNull();
  });
});

describe('C1-05 staging, DRAFT assets and path', () => {
  it('uses the exact four script lines, portraits and pauses from DIALOGUE_EVENTS', () => {
    const events = JSON.parse(readFileSync(resolve(__dirname, '../../../DIALOGUE_EVENTS.json'), 'utf8')) as { line_id: string; spoken_text: string; emotion_id: string; pause_ms: number }[];
    for (const script of [MOURNFANG_INTRO, MOURNFANG_RESPONSE, MOURNFANG_VICTORY]) for (const n of script.nodes) {
      if (n.type !== 'line') continue; const original = events.find(e => e.line_id === n.id)!;
      expect(n.text).toBe(original.spoken_text); expect(n.expression).toBe(original.emotion_id); expect(n.pauseMs).toBe(original.pause_ms); expect(n.portrait).toContain(`C01_EXPRESSION_${n.expression}`);
    }
  });
  it('only opens the continuation after Hollowling and routes boss -> post-dialogue -> ending in order', () => {
    const gs = new GameState(); gs.startNewGame(); const story = new Chapter1Story(gs), ctx = { wrapCount: 0 };
    expect(story.interact('forest_exit#0', ctx)).toEqual([]); expect(story.trigger('mournfang', ctx)).toEqual([]);
    gs.load(checkpoint()); expect(story.interact('forest_exit#0', ctx)).toEqual([{ type: 'forestEdge' }]);
    expect(story.trigger('mournfang', ctx).map(a => a.type)).toEqual(['dialogue', 'mournfangApproach', 'dialogue', 'battle']);
    expect(story.interact('slice_exit', ctx)).toEqual([]); gs.setFlag(MOURNFANG_FLAG);
    expect(story.trigger('mournfang', ctx)).toEqual([]); expect(story.onStart()[0]?.type).toBe('dialogue');
    gs.setFlag(MOURNFANG_VICTORY_SEEN); expect(story.onStart()).toEqual([]); expect(story.interact('slice_exit', ctx).at(-1)?.type).toBe('sliceEnd');
  });
  it('copies B01 PNG/JSON unchanged and aliases only four real key poses', () => {
    const root = resolve(__dirname, '../../..'), pub = resolve(__dirname, '../../public/assets/battle');
    for (const ext of ['png', 'json']) expect(readFileSync(resolve(pub, `B01_BATTLE_ATLAS_DRAFT.${ext}`))).toEqual(readFileSync(resolve(root, `assets/bosses/B01_Mournfang/B01_BATTLE_ATLAS_DRAFT.${ext}`)));
    const raw = JSON.parse(readFileSync(resolve(pub, 'B01_BATTLE_ATLAS_DRAFT.json'), 'utf8')), playback = mournfangPlayback(raw);
    const png = readPng(resolve(pub, 'B01_BATTLE_ATLAS_DRAFT.png')); expect([png.width, png.height]).toEqual([384, 96]); expect(png.data[3]).toBe(0);
    for (const [index, f] of Object.values(raw.frames).entries()) expect((f as { rect: number[] }).rect).toEqual([index * 96, 0, 96, 96]);
    expect(raw.status).toBe('DRAFT'); expect(Object.keys(raw.frames)).toHaveLength(4); expect(new Set(Object.values(playback.frames).map(f => f.index_0_based))).toEqual(new Set([0, 1, 2, 3]));
    expect(playback.frames.attack!.index_0_based).toBe(1); expect(playback.frames.defeated!.index_0_based).toBe(3);
  });
  it('new route is walkable, reaches checkpoint/arena/exit and blocker closes the boss bypass', () => {
    const { map, collision } = loadForestEdge(); expect(map.npcs).toEqual([]);
    for (const p of [[96, 656], [480, 656], [480, 400], [704, 400], [832, 400], [960, 400], [1304, 400]]) expect(collision.canStand(footBox(p[0]!, p[1]!)), p.join(',')).toBe(true);
    let x = 96, y = 656;
    for (const [tx, ty] of [[480, 656], [480, 400], [704, 400], [960, 400], [1320, 400]]) {
      for (let n = 0; n < 500 && (x !== tx || y !== ty); n++) { const m = moveWithCollision(collision, x, y, Math.sign(tx! - x) * Math.min(4, Math.abs(tx! - x)), Math.sign(ty! - y) * Math.min(4, Math.abs(ty! - y))); x = m.x; y = m.y; }
      expect([x, y]).toEqual([tx, ty]);
    }
    const block = map.solidRects[0]!; collision.setDynamic(block.id, block);
    for (let yy = 244; yy < 576; yy += 8) expect(collision.canStand(footBox(904, yy))).toBe(false);
    collision.setDynamic(block.id, null); expect(collision.canStand(footBox(904, 400))).toBe(true);
  });
});
