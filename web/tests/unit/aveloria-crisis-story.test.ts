import { describe, expect, it } from 'vitest';
import type { GameState } from '../../src/game/systems/GameState';
import { AveloriaCrisisStory } from '../../src/game/story/c3/aveloriaCrisis';
import type { StoryAction } from '../../src/game/story/Chapter1Story';
import { C3 } from '../../src/game/story/chapter3Flags';
import { AVELORIA_AUDIENCE, AVELORIA_COUNCIL, AVELORIA_TEMPLE_EXIT, CRISIS_STAGES, ID_NOBLE, ID_TORVAN, crisisStage } from '../../src/game/world/aveloriaCrisis';
import * as D from '../../src/game/dialogue/chapter3';

const ORDER = [C3.crisisSeen, C3.azieDemand, C3.velthiaRefuses, C3.evacOrdered, C3.evacDone, C3.decision, C3.torvanStays, C3.velthiaJoined, C3.departed] as const;

/** GameState tiruan: hanya kontrak flag yang dipakai story (validasi save penuh diuji di tes save/chapter3). */
class MockState {
  readonly flags: Record<string, boolean> = {};
  hasFlag(f: string): boolean { return !!this.flags[f]; }
  setFlag(f: string): boolean { if (this.flags[f]) return false; this.flags[f] = true; return true; }
  snapshot(): { flags: Record<string, boolean> } { return { flags: { ...this.flags } }; }
}
function setup(flags: readonly string[] = [C3.start]) {
  const state = new MockState(); for (const f of flags) state.flags[f] = true;
  return { state: state as unknown as GameState & MockState, story: new AveloriaCrisisStory(state as unknown as GameState) };
}
const upTo = (n: number): string[] => [C3.start, ...ORDER.slice(0, n)];
const setFlags = (a: StoryAction[]): string[] => a.flatMap(x => (x.type === 'setFlag' ? [x.flag] : []));
const types = (a: StoryAction[]): string[] => a.map(x => x.type);

/** Menjalankan aksi seperti WorldScene: dialog selesai -> flag dipasang -> joinVelthia sekali. */
function run(state: GameState, actions: StoryAction[], log: { joins: number; ops: string[]; area?: string; dialogues: string[] }): void {
  for (const a of actions) {
    if (a.type === 'setFlag') state.setFlag(a.flag);
    else if (a.type === 'joinVelthia') log.joins++;
    else if (a.type === 'c3') log.ops.push(a.op);
    else if (a.type === 'changeArea') log.area = a.area;
    else if (a.type === 'dialogue') log.dialogues.push(a.script.id);
  }
}

describe('AveloriaCrisisStory: pembukaan', () => {
  it('tidak aktif sebelum Bab III dimulai', () => {
    const { story } = setup([]);
    expect(story.onStart()).toEqual([]); expect(story.trigger(AVELORIA_AUDIENCE)).toEqual([]); expect(story.interact('azie')).toEqual([]);
  });
  it('onStart: koreografi -> dialog -> flag crisisSeen sesudah dialog; hanya sekali', () => {
    const { state, story } = setup();
    const a = story.onStart();
    expect(types(a)).toEqual(['c3', 'dialogue', 'setFlag', 'objective']);
    expect(a[0]).toEqual({ type: 'c3', op: 'crisisOpen' });
    expect(a[1]).toMatchObject({ script: D.C3_CRISIS_WATCH });
    expect(setFlags(a)).toEqual([C3.crisisSeen]);
    expect(state.hasFlag(C3.crisisSeen)).toBe(false); // belum dijalankan = belum di-commit
    state.setFlag(C3.crisisSeen);
    expect(story.onStart()).toEqual([]);
  });
});

describe('AveloriaCrisisStory: rantai adegan', () => {
  it('audiensi: Azie -> Velthia menolak -> bangsawan -> perintah evakuasi; tiap flag SETELAH dialognya', () => {
    const { story } = setup(upTo(1));
    const a = story.trigger(AVELORIA_AUDIENCE);
    expect(types(a)).toEqual(['c3', 'dialogue', 'setFlag', 'dialogue', 'setFlag', 'dialogue', 'dialogue', 'c3', 'setFlag', 'objective']);
    expect(setFlags(a)).toEqual([C3.azieDemand, C3.velthiaRefuses, C3.evacOrdered]);
    expect(a.filter(x => x.type === 'c3').map(x => (x as { op: string }).op)).toEqual(['audienceGather', 'evacStart']);
    expect(a.filter(x => x.type === 'dialogue').map(x => (x as { script: { id: string } }).script.id)).toEqual(
      [D.C3_AZIE_DEMAND, D.C3_VELTHIA_REFUSES, D.C3_NOBLES_DOUBT, D.C3_EVAC_ORDER].map(s => s.id));
    // tidak ada flag sebelum dialog pertamanya
    expect(types(a).indexOf('setFlag')).toBeGreaterThan(types(a).indexOf('dialogue'));
  });
  it('audiensi dapat dilanjutkan dari tengah (hanya bagian yang belum selesai)', () => {
    const a = setup(upTo(3)).story.interact('velthia'); // azieDemand + velthiaRefuses sudah ada
    expect(setFlags(a)).toEqual([C3.evacOrdered]);
    expect(a.some(x => x.type === 'c3' && x.op === 'audienceGather')).toBe(false);
  });
  it('Talric di gerbang: dialog -> evacFinish -> flag evacDone; sebelum evakuasi hanya jawaban sibuk', () => {
    const busy = setup(upTo(2)).story.interact('talric');
    expect(setFlags(busy)).toEqual([]); expect(busy[0]).toMatchObject({ script: D.C3_NPC_TALRIC_BUSY });
    const a = setup(upTo(4)).story.interact('talric');
    expect(types(a)).toEqual(['dialogue', 'c3', 'setFlag', 'objective']);
    expect(a[1]).toEqual({ type: 'c3', op: 'evacFinish' }); expect(setFlags(a)).toEqual([C3.evacDone]);
    const after = setup(upTo(5)).story.interact('talric');
    expect(after[0]).toMatchObject({ script: D.C3_NPC_EVAC_DONE }); expect(setFlags(after)).toEqual([]);
  });
  it('keputusan hanya di ruang pertemuan setelah evakuasi selesai', () => {
    expect(setup(upTo(4)).story.trigger(AVELORIA_COUNCIL)).toEqual([]);
    const a = setup(upTo(5)).story.trigger(AVELORIA_COUNCIL);
    expect(types(a)).toEqual(['dialogue', 'setFlag', 'objective']); expect(a[0]).toMatchObject({ script: D.C3_DECISION }); expect(setFlags(a)).toEqual([C3.decision]);
    expect(setup(upTo(6)).story.trigger(AVELORIA_COUNCIL)).toEqual([]);
  });
  it('Torvan tinggal: dialog -> torvanStays -> joinVelthia -> velthiaJoined; Torvan tidak menawarkan adegan sebelum keputusan', () => {
    const before = setup(upTo(5)).story.interact(ID_TORVAN);
    expect(before.map(x => x.type)).toEqual(['dialogue']); expect(before[0]).toMatchObject({ script: D.C3_NPC_TORVAN_HELPING });
    const a = setup(upTo(6)).story.interact(ID_TORVAN);
    expect(types(a)).toEqual(['c3', 'dialogue', 'setFlag', 'joinVelthia', 'setFlag', 'objective']);
    expect(a[0]).toEqual({ type: 'c3', op: 'torvanFace' }); expect(a[1]).toMatchObject({ script: D.C3_TORVAN_STAYS });
    expect(setFlags(a)).toEqual([C3.torvanStays, C3.velthiaJoined]);
    expect(a.filter(x => x.type === 'joinVelthia')).toHaveLength(1);
  });
  it('pemicu keluar: tidak berangkat sebelum party berubah; berangkat dengan C3_DEPART lalu changeArea temple', () => {
    for (let n = 0; n <= 6; n++) {
      const a = setup(upTo(n)).story.trigger(AVELORIA_TEMPLE_EXIT);
      expect(a.some(x => x.type === 'changeArea'), `n=${n}`).toBe(false);
    }
    const a = setup(upTo(8)).story.trigger(AVELORIA_TEMPLE_EXIT);
    expect(types(a)).toEqual(['dialogue', 'setFlag', 'changeArea']);
    expect(a[0]).toMatchObject({ script: D.C3_DEPART }); expect(setFlags(a)).toEqual([C3.departed]);
    expect(a[2]).toEqual({ type: 'changeArea', area: 'temple' });
    expect(setup(upTo(9)).story.trigger(AVELORIA_TEMPLE_EXIT)).toEqual([{ type: 'changeArea', area: 'temple' }]);
  });
});

describe('AveloriaCrisisStory: idempoten, tanpa softlock, party sekali', () => {
  const INTERACTS = ['azie', 'velthia', 'talric', ID_TORVAN, ID_NOBLE, 'porter', 'vendor', 'sweeper', 'guard', 'derrria', 'reports', 'city_sign'];
  const TRIGGERS = [AVELORIA_AUDIENCE, AVELORIA_COUNCIL, AVELORIA_TEMPLE_EXIT, 'city_gate', 'city_bells'];
  const all = (story: AveloriaCrisisStory): StoryAction[] => [...INTERACTS.flatMap(i => story.interact(i)), ...TRIGGERS.flatMap(t => story.trigger(t)), ...story.onStart()];

  it('di setiap tahap ada aksi yang memajukan cerita (tidak ada jalan buntu) sampai berangkat', () => {
    for (let n = 0; n < ORDER.length; n++) {
      const { state, story } = setup(upTo(n));
      const next = all(story).flatMap(a => (a.type === 'setFlag' ? [a.flag] : []));
      expect(next, `tahap ${n}`).toContain(ORDER[n]);
      void state;
    }
  });
  it('permainan penuh lewat interaksi: tiap flag tepat sekali, joinVelthia sekali, berakhir di temple', () => {
    const { state, story } = setup();
    const log = { joins: 0, ops: [] as string[], dialogues: [] as string[], area: undefined as string | undefined };
    run(state, story.onStart(), log);
    run(state, story.trigger(AVELORIA_AUDIENCE), log);
    run(state, story.interact('talric'), log);
    run(state, story.trigger(AVELORIA_COUNCIL), log);
    run(state, story.interact(ID_TORVAN), log);
    run(state, story.trigger(AVELORIA_TEMPLE_EXIT), log);
    for (const f of ORDER) expect(state.hasFlag(f), f).toBe(true);
    expect(log.joins).toBe(1); expect(log.area).toBe('temple');
    expect(log.ops).toEqual(['crisisOpen', 'audienceGather', 'evacStart', 'evacFinish', 'torvanFace']);
    // mengulang semuanya: tidak ada flag baru, tidak ada party join kedua
    const again = { joins: 0, ops: [] as string[], dialogues: [] as string[], area: undefined as string | undefined };
    const before = JSON.stringify(state.snapshot()!.flags);
    for (const a of all(story)) if (a.type === 'setFlag') expect(state.hasFlag(a.flag), a.flag).toBe(true);
    run(state, all(story), again);
    expect(again.joins).toBe(0);
    expect(JSON.stringify(state.snapshot()!.flags)).toBe(before);
  });
  it('flag hanya muncul di aksi sesudah dialog yang bersangkutan (tidak ada setFlag tanpa dialog sebelumnya, kecuali join)', () => {
    for (let n = 0; n < ORDER.length; n++) {
      const { story } = setup(upTo(n));
      for (const chain of [story.onStart(), story.trigger(AVELORIA_AUDIENCE), story.trigger(AVELORIA_COUNCIL), story.trigger(AVELORIA_TEMPLE_EXIT), story.interact('talric'), story.interact(ID_TORVAN), story.interact('velthia'), story.interact('azie')]) {
        const firstFlag = chain.findIndex(a => a.type === 'setFlag');
        if (firstFlag >= 0) expect(chain.slice(0, firstFlag).some(a => a.type === 'dialogue' || a.type === 'joinVelthia'), JSON.stringify(types(chain))).toBe(true);
      }
    }
  });
  it('NPC ambien memakai skrip yang dijanjikan kontrak dan tidak pernah memasang flag', () => {
    const s = setup(upTo(1)).story;
    const map: Record<string, { id: string }> = { porter: D.C3_NPC_CITIZEN_1, vendor: D.C3_NPC_CITIZEN_2, sweeper: D.C3_NPC_CITIZEN_3, guard: D.C3_NPC_CITIZEN_4, [ID_NOBLE]: D.C3_NPC_NOBLE };
    for (const [id, script] of Object.entries(map)) { const a = s.interact(id); expect(a[0]).toMatchObject({ type: 'dialogue', script: { id: script.id } }); expect(setFlags(a)).toEqual([]); }
    expect(setup(upTo(5)).story.interact('guard')[0]).toMatchObject({ script: { id: D.C3_NPC_EVAC_DONE.id } });
  });
  it('tujuan (jurnal) berubah mengikuti flag dan selalu tersedia', () => {
    const seen = new Set<string>();
    for (let n = 0; n <= ORDER.length; n++) { const o = setup(upTo(n)).story.objective(); expect(o.length).toBeGreaterThan(5); seen.add(o); }
    expect(seen.size).toBeGreaterThanOrEqual(7);
  });
  it('turunan tahap dari flag konsisten dengan urutan CRISIS_STAGES', () => {
    expect(crisisStage({})).toBe('pre');
    expect(crisisStage({ [C3.start]: true })).toBe('start');
    const names = CRISIS_STAGES.slice(1);
    for (let n = 0; n <= ORDER.length; n++) {
      const flags = Object.fromEntries(upTo(n).map(f => [f, true]));
      expect(crisisStage(flags)).toBe(names[n]);
    }
  });
});
