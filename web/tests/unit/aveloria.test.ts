import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createNewGameData, GameState, validateGameStateData } from '../../src/game/systems/GameState';
import { AveloriaStory } from '../../src/game/story/AveloriaStory';
import { CITY_FLAG as F, CITY_SPAWN } from '../../src/game/story/aveloriaFlags';
import { loadAveloria, CITY_NPCS, CITIZENS } from '../../src/game/world/aveloria';
import { footBox, moveWithCollision } from '../../src/game/world/Collision';
import { CITY_ARCHIVE, CITY_AUDIENCE, CITY_GATE, BELL_FIRST, BELL_SECOND } from '../../src/game/dialogue/aveloria';
import { derrriaShop, tradeWithDerrria } from '../../src/game/rpg/derrria';
import { SaveRepository } from '../../src/game/systems/SaveRepository';
import type { StoryAction } from '../../src/game/story/Chapter1Story';
import { PORTRAIT_EXPRESSIONS } from '../../src/game/data/assetPaths';

function arrived() {
  const d = createNewGameData(); d.area = 'aveloria'; d.position = { ...CITY_SPAWN };
  for (const f of ['story.c1_awake', 'story.c1_nambo', 'story.c1_loop', 'c1.intro_seen', 'battle.first_hollowling', 'c1.hollowling_victory_seen', 'boss.mournfang', 'c1.mournfang_victory_seen']) d.flags[f] = true;
  return d;
}
function story(flags: string[] = []) {
  const data = arrived(); flags.forEach(f => data.flags[f] = true);
  const state = new GameState(); state.load(data); return { state, story: new AveloriaStory(state) };
}
const outcomes = (actions: StoryAction[]) => actions.filter(a => a.type === 'setFlag').map(a => a.flag);
const throughGate = [F.vista, F.gate];
const throughArchive = [...throughGate, F.archive];
const throughAudience = [...throughArchive, F.velthia];

describe('Aveloria Chapter I sequence', () => {
  it('vista once, no reward or battle outcome', () => {
    const s = story(); expect(outcomes(s.story.onStart())).toEqual([F.vista]); s.state.setFlag(F.vista); expect(s.story.onStart()).toEqual([]);
  });
  it('gate commits only after the entire source script', () => {
    const s = story([F.vista]); const actions = s.story.trigger('city_gate');
    expect(actions.map(a => a.type)).toEqual(['cityStage', 'dialogue', 'setFlag', 'cityStage']);
    expect(outcomes(actions)).toEqual([F.gate]); expect(s.state.hasFlag(F.gate)).toBe(false);
  });
  it('one completed gate never retriggers automatically', () => expect(story(throughGate).story.trigger('city_gate')).toEqual([]));
  it('archive and audience cannot skip Talric', () => {
    const s = story([F.vista]); expect(s.story.interact('azie')).toEqual([]); expect(s.story.trigger('city_audience')).toEqual([]);
    expect(s.story.interact('velthia')).toEqual([]); expect(s.story.trigger('city_bells')).toEqual([]);
  });
  it('Azie completes before the audience becomes available', () => {
    const s = story(throughGate); expect(outcomes(s.story.interact('azie'))).toEqual([F.archive]); expect(s.story.trigger('city_audience')).toEqual([]);
    s.state.setFlag(F.archive); expect(outcomes(s.story.trigger('city_audience'))).toEqual([F.velthia]);
  });
  it('completed archive has a short repeat instead of the source encounter', () => {
    const actions = story(throughArchive).story.interact('azie'); expect(outcomes(actions)).toEqual([]);
    expect(actions[0]).toMatchObject({ type: 'dialogue', script: { id: 'C1-07-REPEAT' } });
  });
  it('two distinct visual bell actions precede the completion transaction', () => {
    const actions = story(throughAudience).story.trigger('city_bells');
    expect(actions.filter(a => a.type === 'cityBell')).toEqual([{ type: 'cityBell', number: 1 }, { type: 'cityBell', number: 2 }]);
    expect(actions.slice(-2)).toEqual([{ type: 'setFlag', flag: F.complete }, { type: 'chapterEnd' }]);
    expect(outcomes(actions)).toEqual([F.complete]);
  });
  it('ending reload does not repeat bells or start Chapter II', () => {
    const s = story([...throughAudience, F.complete]); expect(s.story.trigger('city_bells')).toEqual([]);
    expect(s.story.interact('velthia')).toEqual([{ type: 'chapterEnd' }]); expect(s.state.snapshot()!.chapter).toBe('I'); expect(s.state.snapshot()!.party).toEqual(['C01']);
  });
  it('citizens react to the witnessed double bell without becoming named lore sources', () => {
    const before = story(throughGate).story.interact('porter'); const after = story([...throughAudience, F.complete]).story.interact('porter');
    expect(before).not.toEqual(after); expect(CITIZENS).toHaveLength(4);
  });
});

describe('source dialogue, acting and spoiler boundaries', () => {
  const root = resolve(__dirname, '../../..');
  const original = JSON.parse(readFileSync(resolve(root, 'DIALOGUE_EVENTS.json'), 'utf8'));
  for (const script of [CITY_GATE, CITY_ARCHIVE, CITY_AUDIENCE, BELL_FIRST, BELL_SECOND]) {
    it(`${script.id}: every sourced line is verbatim and references a loaded individual expression`, () => {
      for (const n of script.nodes) if (n.type === 'line' && n.source === 'DIALOGUE_EVENTS') {
        const line = original.find((r: { line_id: string }) => r.line_id === n.id);
        expect(n.text).toBe(line.spoken_text); expect(n.expression).toBe(line.emotion_id); expect(n.portrait).toBe(line.portrait_asset_path);
        expect(n.pauseMs).toBe(line.pause_ms); expect(PORTRAIT_EXPRESSIONS[n.speaker]).toContain(n.expression);
      }
    });
  }
  it('all 43 source lines are retained in their original order', () => {
    const scripts = [CITY_GATE, CITY_ARCHIVE, CITY_AUDIENCE, BELL_FIRST, BELL_SECOND];
    const ids = scripts.flatMap(s => s.nodes.filter(n => n.type === 'line' && n.source === 'DIALOGUE_EVENTS').map(n => n.id));
    expect(ids).toEqual(original.filter((n: { scene_id: string }) => ['C1-06', 'C1-07', 'C1-08', 'C1-09'].includes(n.scene_id)).map((n: { line_id: string }) => n.line_id));
    expect(ids).toHaveLength(43);
  });
  it('Velthia has flavor choice, amusement, concern and authority; no forced love', () => {
    expect(CITY_AUDIENCE.nodes.some(n => n.type === 'choice')).toBe(true);
    expect(new Set(CITY_AUDIENCE.nodes.filter(n => n.type === 'line' && n.speaker === 'C02').map(n => n.type === 'line' ? n.expression : ''))).toEqual(new Set(['STERN', 'AMUSED', 'WORRIED']));
    const text = JSON.stringify([CITY_AUDIENCE, BELL_FIRST, BELL_SECOND]); expect(text).not.toMatch(/Yudis|Torvan|Heart of Time|pencipta dunia|penyebab.*segel|jatuh cinta/);
  });
  it('DRAFT bridge makes both signals understandable without audio and includes the investigation', () => {
    const text = JSON.stringify([BELL_FIRST, BELL_SECOND]); expect(text).toContain('Pukul sembilan, sekali lagi'); expect(text).toContain('Jarum menara belum berpindah'); expect(text).toContain('periksa menara'); expect(text).toContain('Belum ada alasan untuk menahannya');
  });
  it.each(CITY_NPCS)('$entity imported source PNG and metadata are unchanged', n => {
    const dir = { C02: 'Velthia', C05: 'Azie', C06: 'Talric', C09: 'Derrria' }[n.entity];
    for (const ext of ['png', 'json']) expect(readFileSync(resolve(root, `web/public/assets/characters/${n.entity}_explore.${ext}`))).toEqual(readFileSync(resolve(root, `assets/characters/${n.entity}_${dir}/${n.entity}_EXPLORATION_ATLAS_DRAFT.${ext}`)));
  });
});

describe('city collision is independent of render', () => {
  it('safe spawn, main street, plaza, market, courtyard and meeting room are walkable', () => {
    const { collision } = loadAveloria(); for (const [x, y] of [[640, 1312], [640, 1000], [640, 920], [344, 944], [640, 560], [640, 304]]) expect(collision.canStand(footBox(x!, y!)), `${x},${y}`).toBe(true);
  });
  it('solid homes, shelves, well and counters cannot be crossed', () => {
    const { collision } = loadAveloria(); for (const [x, y] of [[240, 760], [912, 808], [472, 840], [344, 900], [488, 240], [824, 520]]) expect(collision.canStand(footBox(x!, y!)), `${x},${y}`).toBe(false);
  });
  it('entry and palace blockers cannot be bypassed, and removing them opens the route', () => {
    const { map, collision } = loadAveloria(); for (const id of ['city_gate', 'palace_door']) {
      const solid = map.solidRects.find(r => r.id === id)!; collision.setDynamic(id, solid);
      const x = 640, y = id === 'city_gate' ? 1168 : 424; expect(collision.canStand(footBox(x, y))).toBe(false);
      collision.setDynamic(id, null); expect(collision.canStand(footBox(x, y))).toBe(true);
    }
    expect(collision.canStand(footBox(560, 1168))).toBe(false); expect(collision.canStand(footBox(720, 1168))).toBe(false);
  });
  it('continuous keyboard routes connect all Chapter I areas without tunnelling', () => {
    const { collision } = loadAveloria(); let p = { x: 640, y: 1312 };
    for (const [x, y] of [[640, 944], [416, 944], [640, 944], [640, 840], [912, 840], [640, 840], [640, 304]]) {
      p = moveWithCollision(collision, p.x, p.y, x! - p.x, y! - p.y); expect([p.x, p.y]).toEqual([x, y]);
    }
  });
});

describe('v2 compatibility and persistent shop', () => {
  it('old v2 forest state remains byte-equivalent after validation', () => { const old = createNewGameData(); expect(validateGameStateData(old)).toEqual(old); });
  it.each([[F.gate, F.vista], [F.archive, F.gate], [F.velthia, F.archive], [F.complete, F.velthia]])('rejects %s without %s', (next, previous) => {
    const data = arrived(); Object.values(F).forEach(f => data.flags[f] = true); data.flags[previous] = false; data.flags[next] = true; expect(validateGameStateData(data)).toBeNull();
  });
  it('rejects arrival without the defeated boss and its completed aftermath', () => {
    const data = arrived(); delete data.flags['c1.mournfang_victory_seen']; expect(validateGameStateData(data)).toBeNull();
  });
  it('shop commits currency, shared inventory and stock together without resetting on reopen', () => {
    const { state } = story(throughGate); const data = state.snapshot()!; data.rpg.gold = 28;
    const buy = tradeWithDerrria(data, 'buy', 'potion'); expect(buy.ok).toBe(true); if (!buy.ok) return;
    expect(buy.data.rpg.gold).toBe(16); expect(buy.data.items.potion).toBe(1); expect(derrriaShop(buy.data).stock.potion).toBe(4);
    expect(validateGameStateData(buy.data)).toEqual(buy.data);
    const sell = tradeWithDerrria(buy.data, 'sell', 'potion'); expect(sell.ok).toBe(true); if (!sell.ok) return;
    expect(sell.data.rpg.gold).toBe(22); expect(sell.data.items.potion).toBe(0); expect(derrriaShop(sell.data).stock.potion).toBe(5);
    expect(data.rpg.gold).toBe(28); expect(data.world.shops).toBeUndefined();
  });
  it('unaffordable/invalid transactions leave the whole branch unchanged', () => {
    const { state } = story(throughGate); const before = state.snapshot()!; const raw = JSON.stringify(before);
    expect(tradeWithDerrria(before, 'buy', 'potion').ok).toBe(false); expect(tradeWithDerrria(before, 'sell', 'starter_greatsword').ok).toBe(false); expect(JSON.stringify(before)).toBe(raw);
  });
  it.each([-1, 1000, 1.5, '5'])('rejects malformed saved shop stock %s', quantity => {
    const { state } = story(throughGate); const raw = state.snapshot()!; raw.world.shops = { derrria: { potion: quantity as number } }; expect(validateGameStateData(raw)).toBeNull();
  });
  it('rejects unknown shop/item keys and pre-gate stock', () => {
    const { state } = story(throughGate); const raw = state.snapshot()!; raw.world.shops = { derrria: { made_up: 1 } }; expect(validateGameStateData(raw)).toBeNull();
    raw.world.shops = { unregistered: { potion: 1 } }; expect(validateGameStateData(raw)).toBeNull(); raw.world.shops = { derrria: { potion: 1 } }; raw.flags[F.gate] = false; expect(validateGameStateData(raw)).toBeNull();
  });
  it('gate/plaza/ending slots round trip stock, position and solo Chapter I state', () => {
    const map = new Map<string, string>(); const storage = { get length() { return map.size; }, key: (i: number) => [...map.keys()][i] ?? null, getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); }, removeItem: (k: string) => { map.delete(k); } };
    const saves = new SaveRepository(storage);
    for (const [slot, flags, y] of [['slot1', throughGate, 1192], ['slot2', throughArchive, 840], ['slot3', [...throughAudience, F.complete], 520]] as const) {
      const { state } = story([...flags]); const d = state.snapshot()!; d.position = { x: 640, y, facing: 'up' }; d.world.shops = { derrria: { potion: 3, travel_coat: 1 } };
      expect(saves.write(slot, d).ok).toBe(true); const read = saves.read(slot); expect(read.status).toBe('ok'); if (read.status === 'ok') expect(read.data).toEqual(d);
    }
  });
});
