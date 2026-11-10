import { describe, expect, it } from 'vitest';
import { GameState, createNewGameData, migrateLegacyGameState, validateGameStateData } from '../../src/game/systems/GameState';
import { SaveRepository, checksumOf } from '../../src/game/systems/SaveRepository';
import { SaveCoordinator } from '../../src/game/systems/SaveCoordinator';
import { MemoryStorage } from '../../src/game/systems/StorageAdapter';
import { SAVE_STORAGE_PREFIX } from '../../src/game/config/constants';
import { applyReward } from '../../src/game/rpg/progression';
import { HOLLOWLING_REWARD } from '../../src/game/rpg/definitions';
import { equip, unlockSkill, useItem } from '../../src/game/rpg/actions';

const key = `${SAVE_STORAGE_PREFIX}slot1`;
function legacy(extra: Record<string, unknown> = {}) {
  const data = { schemaVersion: 1, chapter: 'I', area: 'forest_1', position: { x: 832, y: 100, facing: 'down' }, party: ['C01'], flags: { 'c1.intro_seen': true, 'story.c1_awake': true, 'story.c1_nambo': true, 'c1.loop_noticed': true, 'story.c1_loop': true }, items: { potion: 1 }, vitals: { hp: 55, mp: 8 }, playtimeSec: 123, ...extra };
  return JSON.stringify({ schema: 'save_v1', slot: 'slot1', data, checksum: checksumOf(data), savedAt: '2026-11-10T05:00:00.000Z', summary: { chapter: 'I', area: 'forest_1', playtimeSec: 123 } });
}
describe('Versioned saves, migration, backups and failures', () => {
  it('reads v1 into v2 with legacy progress and keeps original browser bytes unchanged', () => {
    const storage = new MemoryStorage(), old = legacy(); storage.setItem(key, old); const result = new SaveRepository(storage).read('slot1');
    expect(result.status).toBe('ok'); if (result.status !== 'ok') return;
    expect(result.migrated).toBe(true); expect(result.data.schemaVersion).toBe(2); expect(result.data.vitals).toEqual({ hp: 55, mp: 8 }); expect(result.data.items.potion).toBe(1); expect(result.data.storyBeat).toBe('C1-04'); expect(storage.getItem(key)).toBe(old);
  });
  it('legacy victory is not rewarded again during migration', () => {
    const storage = new MemoryStorage(); storage.setItem(key, legacy({ flags: { 'battle.first_hollowling': true, 'reward.c1_chest_potion.claimed': true }, items: { potion: 0 } }));
    const result = new SaveRepository(storage).read('slot1'); if (result.status !== 'ok') throw new Error();
    expect(result.data.flags[HOLLOWLING_REWARD.id]).toBe(true); expect(applyReward(result.data, HOLLOWLING_REWARD).receipt).toBeNull(); expect(result.data.items.potion).toBe(0);
  });
  it('legacy missing items/vitals initializes known starter state without inventing a second Potion', () => {
    const raw = JSON.parse(legacy()).data; delete raw.items; delete raw.vitals; const result = migrateLegacyGameState(raw)!;
    expect(result.items.potion).toBeUndefined(); expect(result.vitals).toEqual({ hp: 96, mp: 12 }); expect(result.items.yaric_greatsword).toBe(1);
  });
  it('bad v1 checksum, stats or item payload is rejected without rewriting it', () => {
    const storage = new MemoryStorage(), payload = JSON.parse(legacy()); payload.data.items.potion = -1; payload.checksum = checksumOf(payload.data); const text = JSON.stringify(payload); storage.setItem(key, text);
    expect(new SaveRepository(storage).read('slot1').status).toBe('corrupt'); expect(storage.getItem(key)).toBe(text);
  });
  it('new saves are save_v2/data v2 in the stable original key namespace', () => {
    const storage = new MemoryStorage(), repo = new SaveRepository(storage); repo.write('slot1', createNewGameData()); const env = JSON.parse(storage.getItem(key)!);
    expect(env.schema).toBe('save_v2'); expect(env.data.schemaVersion).toBe(2); expect(env.checksum).toBe(checksumOf(env.data)); expect(env.slot).toBe('slot1');
  });
  it('overwrite preserves previous valid bytes in the backup', () => {
    const storage = new MemoryStorage(), repo = new SaveRepository(storage); repo.write('slot1', createNewGameData()); const first = storage.getItem(key); repo.write('slot1', applyReward(createNewGameData(), HOLLOWLING_REWARD).data);
    expect(storage.getItem(`${key}.backup`)).toBe(first); expect(repo.read('slot1').status).toBe('ok');
  });
  it.each(['corrupt', 'missing'])('a %s primary recovers from a validated backup', state => {
    const storage = new MemoryStorage(), repo = new SaveRepository(storage); repo.write('slot1', createNewGameData()); repo.write('slot1', applyReward(createNewGameData(), HOLLOWLING_REWARD).data);
    if (state === 'corrupt') storage.setItem(key, '{broken'); else storage.removeItem(key);
    const result = repo.read('slot1'); expect(result.status).toBe('ok'); if (result.status === 'ok') { expect(result.recovered).toBe(true); expect(result.data.rpg.characters.C01!.level).toBe(1); }
  });
  it('never overwrites an unsupported future schema', () => {
    const storage = new MemoryStorage(), future = JSON.stringify({ schema: 'save_v99' }); storage.setItem(key, future);
    expect(new SaveRepository(storage).write('slot1', createNewGameData()).ok).toBe(false); expect(storage.getItem(key)).toBe(future);
  });
  it('quota failure on a new slot leaves no partial save', () => {
    class Quota extends MemoryStorage { override setItem(): void { throw new DOMException('Quota', 'QuotaExceededError'); } }
    const storage = new Quota(); expect(new SaveRepository(storage).write('slot1', createNewGameData()).ok).toBe(false); expect(storage.getItem(key)).toBeNull();
  });
  it('quota failure during backup preserves primary without loss', () => {
    class Quota extends MemoryStorage { blocked = false; override setItem(k: string, v: string): void { if (this.blocked) throw new Error('quota'); super.setItem(k, v); } }
    const storage = new Quota(), repo = new SaveRepository(storage); repo.write('slot1', createNewGameData()); const before = storage.getItem(key); storage.blocked = true;
    expect(repo.write('slot1', applyReward(createNewGameData(), HOLLOWLING_REWARD).data).ok).toBe(false); expect(storage.getItem(key)).toBe(before);
  });
  it('read exceptions before a write never cause removal of an existing slot', () => {
    class ReadFailure extends MemoryStorage { blocked = false; override getItem(k: string): string | null { if (this.blocked) throw new Error('storage blocked'); return super.getItem(k); } }
    const storage = new ReadFailure(), repo = new SaveRepository(storage); repo.write('slot1', createNewGameData()); const before = storage.getItem(key); storage.blocked = true;
    expect(repo.read('slot1').status).toBe('storage_unavailable'); expect(repo.write('slot1', createNewGameData()).ok).toBe(false); storage.blocked = false; expect(storage.getItem(key)).toBe(before);
  });
  it('readback mismatch rolls back the primary, keeping the old checkpoint', () => {
    class BrokenWrite extends MemoryStorage { broken = false; override setItem(k: string, v: string): void { super.setItem(k, this.broken && k === key ? '{broken' : v); } }
    const storage = new BrokenWrite(), repo = new SaveRepository(storage); repo.write('slot1', createNewGameData()); storage.broken = true;
    expect(repo.write('slot1', applyReward(createNewGameData(), HOLLOWLING_REWARD).data).ok).toBe(false); expect(repo.read('slot1').status).toBe('ok');
  });
  it('invalid save dates do not throw or overwrite valid data', () => { const storage = new MemoryStorage(), repo = new SaveRepository(storage); repo.write('slot1', createNewGameData()); const before = storage.getItem(key); expect(repo.write('slot1', createNewGameData(), new Date(NaN)).ok).toBe(false); expect(storage.getItem(key)).toBe(before); });
  it('slot identity and data schema are checked independently of checksum', () => {
    const storage = new MemoryStorage(), repo = new SaveRepository(storage); repo.write('slot1', createNewGameData()); const env = JSON.parse(storage.getItem(key)!); env.slot = 'slot2'; storage.setItem(key, JSON.stringify(env)); expect(repo.read('slot1').status).toBe('corrupt');
    env.slot = 'slot1'; env.data.schemaVersion = 1; env.checksum = checksumOf(env.data); storage.setItem(key, JSON.stringify(env)); expect(repo.read('slot1').status).toBe('corrupt');
  });
  it('all progression, skills, equipment, vitals, flags, chest, NPC, position and currency round trip', () => {
    let d = applyReward(createNewGameData(), HOLLOWLING_REWARD).data; d.items.potion = 1; d.vitals!.hp = 20;
    const used = useItem(d, 'potion'); if (!used.ok) throw new Error(); const skill = unlockSkill(used.data, 'heavy_grip'); if (!skill.ok) throw new Error(); const gear = equip(skill.data, 'armor', null); if (!gear.ok) throw new Error(); d = gear.data;
    d.flags['story.c1_awake'] = true; d.flags['story.c1_nambo'] = true; d.flags['c1.loop_noticed'] = true; d.flags['story.c1_loop'] = true; d.flags['reward.c1_chest_potion.claimed'] = true; d.flags['battle.first_hollowling'] = true; d.flags['c1.hollowling_victory_seen'] = true; d.storyBeat = 'C1-04-DONE'; d.world.forestWrapCount = 2; d.position = { x: 832, y: 100, facing: 'down' };
    const repo = new SaveRepository(new MemoryStorage()); expect(repo.write('slot3', d).ok).toBe(true); const loaded = repo.read('slot3'); if (loaded.status !== 'ok') throw new Error(); expect(loaded.data).toEqual(d); expect(validateGameStateData(loaded.data)).toEqual(d);
  });
  it('migration does not accept future versions or negative legacy resources', () => { const raw = JSON.parse(legacy()).data; expect(migrateLegacyGameState({ ...raw, schemaVersion: 9 })).toBeNull(); expect(migrateLegacyGameState({ ...raw, vitals: { hp: -1, mp: 12 } })).toBeNull(); });
});

describe('Safe checkpoint scheduling', () => {
  function setup() { const state = new GameState(); state.startNewGame(); const storage = new MemoryStorage(), repo = new SaveRepository(storage), gate = new SaveCoordinator(state, repo); return { state, storage, repo, gate }; }
  it('autosave requested during dialogue/battle is deferred until a safe world checkpoint', () => {
    const { gate, repo, state } = setup(); gate.requestAutosave(); expect(gate.flush()).toBeNull(); expect(repo.read('auto').status).toBe('empty');
    state.setFlag('story.c1_nambo'); gate.setSafe(true); expect(gate.flush()?.ok).toBe(true); const saved = repo.read('auto'); expect(saved.status === 'ok' && saved.data.flags['story.c1_nambo']).toBe(true); expect(gate.flush()).toBeNull();
  });
  it('manual save refuses unsafe states and does not write half a battle', () => { const { gate, repo } = setup(); expect(gate.save('slot1').ok).toBe(false); expect(repo.read('slot1').status).toBe('empty'); });
  it('safe manual slots stay separate from autosave', () => { const { gate, repo } = setup(); gate.setSafe(true); expect(gate.save('slot1').ok).toBe(true); gate.requestAutosave(); gate.flush(); expect(repo.read('slot1').status).toBe('ok'); expect(repo.read('auto').status).toBe('ok'); });
  it('KO state cannot become a safe persistent checkpoint', () => { const { state, gate } = setup(); const d = state.snapshot()!; d.vitals!.hp = 0; state.load(d); gate.setSafe(true); expect(gate.isSafe).toBe(false); expect(gate.save('slot1').ok).toBe(false); });
  it('load/new game clears deferred writes, avoiding overwrite from an abandoned session', () => { const { gate } = setup(); gate.setSafe(true); gate.requestAutosave(); gate.reset(); expect(gate.hasPendingAutosave).toBe(false); expect(gate.isSafe).toBe(false); expect(gate.flush()).toBeNull(); });
  it('unavailable/quota storage gives feedback without retrying every frame', () => { const state = new GameState(); state.startNewGame(); const gate = new SaveCoordinator(state, new SaveRepository(null)); gate.setSafe(true); gate.requestAutosave(); expect(gate.flush()?.ok).toBe(false); expect(gate.lastMessage).toContain('Gagal'); expect(gate.flush()).toBeNull(); });
});
