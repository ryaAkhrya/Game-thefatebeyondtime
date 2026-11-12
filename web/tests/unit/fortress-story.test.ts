import { describe, expect, it } from 'vitest';
import { C4, isChapter4Flag, type C4EncounterId } from '../../src/game/story/chapter4Flags';
import { FORT, FORT_FLAGS } from '../../src/game/story/c4/fortressFlags';
import type { StoryAction } from '../../src/game/story/Chapter1Story';
import { FortressStory, FORTRESS_OPS } from '../../src/game/story/c4/fortress';
import { FortressPuzzleSession, SEAL_ORDER } from '../../src/game/world/fortressPuzzle';
import { FORTRESS_INTERACTABLES, FORTRESS_TRIGGERS, FORTRESS_TRIGGER_ENCOUNTER } from '../../src/game/data/maps/fortress.map.mjs';
import * as N from '../../src/game/dialogue/chapter4';
import * as FD from '../../src/game/dialogue/chapter4.fortress';
import type { GameState } from '../../src/game/systems/GameState';

const COMPLETION: Record<C4EncounterId, string> = {
  fortress_riftborn: C4.fightCourt, fortress_gravorn: C4.fightHall, fortress_guardpost: C4.fightGuard, fortress_rift: C4.fightRift,
  fortress_aegis_trial: C4.aegisTrial, varlgrim: C4.varlgrim,
};
/** Rantai urutan flag (salinan aturan validasi GameState untuk Bab IV): flag berikut tidak boleh ada tanpa flag sebelumnya. */
const CHAIN: Array<[string, string]> = [
  [C4.entered, C4.start], [C4.aegisLearned, C4.entered], [C4.aegisTrial, C4.aegisLearned], [C4.fightCourt, C4.entered], [C4.fightHall, C4.entered],
  [C4.fightGuard, C4.entered], [C4.fightRift, C4.entered], [C4.reportA, C4.entered], [C4.reportB, C4.entered], [C4.checkpoint, C4.aegisTrial],
  [C4.confront, C4.checkpoint], [C4.varlgrim, C4.confront], [C4.leanSeen, C4.varlgrim], [C4.unlockYaric, C4.leanSeen], [C4.unlockVelthia, C4.leanSeen],
  [C4.heartOpen, C4.unlockYaric], [C4.heartOpen, C4.unlockVelthia], [C4.towerFallen, C4.heartOpen], [C4.memoryA, C4.heartOpen], [C4.memoryB, C4.heartOpen],
  [C4.oldMemory, C4.heartOpen], [C4.varlgrimTruth, C4.oldMemory], [C4.creatorReveal, C4.oldMemory], [C4.varlgrimStays, C4.varlgrimTruth],
];

/** GameState tiruan: hanya flag dan item. `run` menjalankan StoryAction seperti WorldScene (flag hanya lewat setFlag atau giveItem.flag). */
class Fake {
  flags: Record<string, boolean> = { [C4.start]: true };
  items: Record<string, number> = {};
  log: string[] = [];
  setOrder: string[] = [];
  hasFlag(f: string): boolean { return !!this.flags[f]; }
  snapshot(): { flags: Record<string, boolean>; area: string } { return { flags: this.flags, area: 'fortress' }; }
  private set(f: string): void { if (!this.flags[f]) this.setOrder.push(f); this.flags[f] = true; this.assertChain(); }
  assertChain(): void { for (const [next, prev] of CHAIN) if (this.flags[next] && !this.flags[prev]) throw new Error(`rantai rusak: ${next} tanpa ${prev}`); }
  run(actions: readonly StoryAction[]): void {
    for (const a of actions) {
      if (a.type === 'setFlag') this.set(a.flag);
      else if (a.type === 'giveItem') {
        if (!a.flag) throw new Error('giveItem tanpa flag idempotensi');
        if (!this.flags[a.flag]) { this.items[a.item] = (this.items[a.item] ?? 0) + a.count; this.set(a.flag); }
      } else if (a.type === 'dialogue') this.log.push(`dialogue:${a.script.id}`);
      else if (a.type === 'c4') this.log.push(`c4:${a.op}:${a.arg ?? ''}`);
      else if (a.type === 'battle') this.log.push(`battle:${a.encounter}`);
      else this.log.push(a.type);
    }
  }
  win(enc: C4EncounterId): void { this.set(COMPLETION[enc]); }
}
function make(): { fake: Fake; story: FortressStory; session: FortressPuzzleSession } {
  const fake = new Fake(), session = new FortressPuzzleSession();
  return { fake, session, story: new FortressStory(fake as unknown as GameState, session) };
}
const types = (a: readonly StoryAction[]): string[] => a.map((x) => x.type);
const dialogueIds = (a: readonly StoryAction[]): string[] => a.flatMap((x) => (x.type === 'dialogue' ? [x.script.id] : []));
const battles = (a: readonly StoryAction[]): string[] => a.flatMap((x) => (x.type === 'battle' ? [String(x.encounter)] : []));
const ops = (a: readonly StoryAction[]): string[] => a.flatMap((x) => (x.type === 'c4' ? [x.op] : []));
const flagsOf = (a: readonly StoryAction[]): string[] => a.flatMap((x) => (x.type === 'setFlag' ? [x.flag] : []));
function step(f: Fake, s: FortressStory, kind: 'interact' | 'trigger' | 'start', id = ''): StoryAction[] {
  const a = kind === 'start' ? s.onStart() : kind === 'interact' ? s.interact(id) : s.trigger(id);
  f.run(a);
  return a;
}
function fight(f: Fake, s: FortressStory, trig: string): void {
  const a = step(f, s, 'trigger', trig);
  const enc = battles(a)[0] as C4EncounterId;
  expect(enc, trig).toBe(FORTRESS_TRIGGER_ENCOUNTER[trig as keyof typeof FORTRESS_TRIGGER_ENCOUNTER]);
  f.win(enc);
}
function solveSeals(f: Fake, s: FortressStory): void { for (const id of SEAL_ORDER) step(f, s, 'interact', id); }

/** Memainkan seluruh benteng sampai tepat sebelum `until`. */
function playUntil(f: Fake, s: FortressStory, until: 'seals' | 'trial' | 'rift' | 'lantern' | 'confront' | 'locks' | 'echo' | 'finale' | 'end'): void {
  const order = ['seals', 'trial', 'rift', 'lantern', 'confront', 'locks', 'echo', 'finale', 'end'];
  const upto = order.indexOf(until);
  step(f, s, 'start');
  fight(f, s, 'fortress_court_fight'); fight(f, s, 'fortress_hall_fight'); fight(f, s, 'fortress_guardpost');
  step(f, s, 'interact', 'courier_a'); step(f, s, 'interact', 'archive_log'); step(f, s, 'interact', 'archive_relic');
  if (upto <= 0) return;
  solveSeals(f, s);
  if (upto <= 1) return;
  step(f, s, 'interact', 'trial_pedestal'); f.win('fortress_aegis_trial'); step(f, s, 'start');
  if (upto <= 2) return;
  step(f, s, 'interact', 'anchor_a'); step(f, s, 'interact', 'anchor_b'); fight(f, s, 'fortress_rift_fight');
  if (upto <= 3) return;
  step(f, s, 'interact', 'lantern_rest');
  if (upto <= 4) return;
  fight(f, s, 'heart_confront'); step(f, s, 'start');
  if (upto <= 5) return;
  step(f, s, 'interact', 'heart_lock_yaric'); step(f, s, 'interact', 'heart_lock_velthia');
  if (upto <= 6) return;
  step(f, s, 'trigger', 'echo_enter'); step(f, s, 'interact', 'echo_a');
  if (upto <= 7) return;
  step(f, s, 'interact', 'echo_b');
}

describe('FortressStory: alur Warden Fortress', () => {
  it('onStart: C4-01 sekali, flag di-commit SESUDAH dialog; mulai ulang tidak mengulang; reset sesi', () => {
    const { fake, story, session } = make();
    session.sealProgress.push('seal_dawn');
    const a = story.onStart();
    expect(types(a)).toEqual(['dialogue', 'setFlag', 'objective']);
    expect(dialogueIds(a)).toEqual([N.C4_ARRIVAL.id]);
    expect(a[1]).toMatchObject({ flag: C4.entered });
    expect(fake.flags[C4.entered]).toBeUndefined();
    expect(session.sealProgress).toEqual([]);
    fake.run(a);
    expect(story.onStart()).toEqual([]);
  });

  it('semua interaktif dan pemicu peta ditangani cerita (tidak ada objek bisu) dan tidak pernah melempar', () => {
    const { fake, story } = make();
    const all: Record<string, boolean> = { [C4.start]: true };
    for (const k of Object.values(C4)) all[k] = true;
    for (const k of FORT_FLAGS) all[k] = true;
    for (const it of FORTRESS_INTERACTABLES) {
      fake.flags = { [C4.start]: true };
      const early = story.interact(it.id).length;
      fake.flags = { ...all };
      const late = story.interact(it.id).length;
      expect(early + late, `${it.id} tidak boleh bisu di kedua tahap`).toBeGreaterThan(0);
      fake.flags = { [C4.start]: true, [C4.entered]: true, [C4.aegisLearned]: true, [C4.aegisTrial]: true, [C4.checkpoint]: true, [C4.heartOpen]: true };
      story.interact(it.id);
    }
    fake.flags = { [C4.start]: true };
    for (const t of FORTRESS_TRIGGERS) { story.trigger(t.id); fake.flags = { ...all }; story.trigger(t.id); fake.flags = { [C4.start]: true }; }
    expect(story.interact('tidak_ada')).toEqual([]);
    expect(story.trigger('tidak_ada')).toEqual([]);
  });

  it('seluruh benteng dapat dimainkan sampai akhir: urutan flag sah (rantai GameState), tidak ada flag asing, tidak ada flag yang bukan milik benteng', () => {
    const { fake, story } = make();
    playUntil(fake, story, 'end');
    // gerbang keluar sesudah creatorReveal
    expect(fake.flags[C4.creatorReveal]).toBe(true);
    const exit = step(fake, story, 'interact', 'outer_gate');
    expect(dialogueIds(exit)).toEqual([N.C4_RETURN_GATE.id]);
    expect(ops(exit)).toEqual(['to_aveloria']);
    // flag yang boleh di-commit benteng: semua berawalan Bab IV; TIDAK pernah returned/returnSeen/complete/start
    for (const f of fake.setOrder) expect(isChapter4Flag(f), f).toBe(true);
    for (const f of [C4.returned, C4.returnSeen, C4.complete]) expect(fake.flags[f], f).toBeUndefined();
    // urutan komit cerita
    const idx = (f: string): number => fake.setOrder.indexOf(f);
    const seq = [C4.entered, C4.aegisLearned, FORT.sealsSolved, C4.aegisTrial, FORT.riftAligned, C4.checkpoint, C4.confront, C4.varlgrim, C4.leanSeen, C4.unlockYaric, C4.unlockVelthia,
      C4.heartOpen, C4.towerFallen, C4.memoryA, C4.memoryB, C4.oldMemory, C4.varlgrimTruth, C4.varlgrimStays, FORT.torvanLeft, C4.creatorReveal];
    for (let i = 1; i < seq.length; i++) expect(idx(seq[i]!), `${seq[i]} sesudah ${seq[i - 1]}`).toBeGreaterThan(idx(seq[i - 1]!));
    // setiap flag penting terkomit tepat sekali (setOrder tidak berisi duplikat)
    expect(new Set(fake.setOrder).size).toBe(fake.setOrder.length);
    // semua op `c4` yang dipakai dikenali
    for (const l of fake.log.filter((x) => x.startsWith('c4:'))) expect(FORTRESS_OPS as readonly string[], l).toContain(l.split(':')[1]);
  });

  it('flag di-commit sesudah dialog pada setiap rangkaian yang memuat dialog', () => {
    const { fake, story } = make();
    const all: StoryAction[][] = [];
    const orig = fake.run.bind(fake);
    fake.run = (a: readonly StoryAction[]): void => { all.push([...a]); orig(a); };
    playUntil(fake, story, 'end');
    for (const list of all) {
      const d = list.findIndex((x) => x.type === 'dialogue'), f = list.findIndex((x) => x.type === 'setFlag');
      if (d >= 0 && f >= 0) expect(f, JSON.stringify(list.map((x) => x.type))).toBeGreaterThan(d);
    }
  });

  it('setiap encounter wajib terpicu sekali: sesudah menang, pemicu tidak mengembalikan battle lagi; sebelumnya selalu battle yang benar', () => {
    const { fake, story } = make();
    step(fake, story, 'start');
    const expected: Record<string, C4EncounterId> = { fortress_court_fight: 'fortress_riftborn', fortress_hall_fight: 'fortress_gravorn', fortress_guardpost: 'fortress_guardpost', fortress_rift_fight: 'fortress_rift' };
    for (const [t, enc] of Object.entries(expected)) {
      expect(battles(story.trigger(t)), t).toEqual([enc]);
      expect(battles(story.trigger(t)), `${t} ulang sebelum menang`).toEqual([enc]); // kalah: dapat dicoba lagi
      fake.win(enc);
      expect(story.trigger(t), `${t} sesudah menang`).toEqual([]);
    }
  });

  it('Riftborn pertama: dialog sekali (sesi mengulang pertarungan tanpa dialog ulang)', () => {
    const { fake, story } = make();
    step(fake, story, 'start');
    const a = step(fake, story, 'trigger', 'fortress_court_fight');
    expect(dialogueIds(a)).toEqual([N.C4_RIFTBORN_FIRST.id]);
    expect(dialogueIds(story.trigger('fortress_court_fight'))).toEqual([]);
  });

  it('peti: hadiah sekali lewat flag giveItem; interaksi kedua hanya toast; peti zirah terkunci sebelum uji', () => {
    const { fake, story } = make();
    step(fake, story, 'start');
    const a = step(fake, story, 'interact', 'chest_potion');
    expect(a.find((x) => x.type === 'giveItem')).toMatchObject({ item: 'potion', count: 1, flag: FORT.chestPotion });
    expect(fake.items.potion).toBe(1);
    const again = step(fake, story, 'interact', 'chest_potion');
    expect(types(again)).toEqual(['toast']);
    expect(fake.items.potion).toBe(1);
    step(fake, story, 'interact', 'chest_robe');
    expect(fake.items.keeper_robe).toBe(1);
    expect(types(story.interact('chest_plate'))).toEqual(['toast']);
    expect(fake.items.warden_plate).toBeUndefined();
    fake.flags[C4.aegisLearned] = true; fake.flags[C4.aegisTrial] = true;
    step(fake, story, 'interact', 'chest_plate'); step(fake, story, 'interact', 'chest_plate');
    expect(fake.items.warden_plate).toBe(1);
  });

  it('Perlindungan dipelajari di Arsip (pusaka) sekali; uji hanya setelah itu; dialog selesai uji muncul sekali di onStart', () => {
    const { fake, story } = make();
    step(fake, story, 'start');
    expect(types(story.interact('trial_pedestal'))).toEqual(['toast']); // belum bergema
    const a = step(fake, story, 'interact', 'archive_relic');
    expect(dialogueIds(a)).toEqual([N.C4_ARCHIVE_VELTHIA.id]);
    expect(flagsOf(a)).toEqual([C4.aegisLearned]);
    expect(types(story.interact('archive_relic'))).toEqual(['toast']);
    const t = step(fake, story, 'interact', 'trial_pedestal');
    expect(dialogueIds(t)).toEqual([N.C4_AEGIS_TRIAL_INTRO.id]);
    expect(battles(t)).toEqual(['fortress_aegis_trial']);
    expect(dialogueIds(story.interact('trial_pedestal'))).toEqual([]); // intro sekali
    fake.win('fortress_aegis_trial');
    const done = step(fake, story, 'start');
    expect(dialogueIds(done)).toEqual([N.C4_AEGIS_TRIAL_DONE.id]);
    expect(story.onStart()).toEqual([]);
  });

  it('titik simpan: lentera menolak sebelum uji; sesudah uji rest + flag checkpoint SESUDAH restParty4; aman diulang; mustahil ke Ruang Heart tanpa checkpoint', () => {
    const { fake, story } = make();
    playUntil(fake, story, 'lantern');
    // sebelum checkpoint: tidak mungkin memicu Varlgrim
    expect(story.trigger('heart_confront')).toEqual([]);
    const before = make();
    step(before.fake, before.story, 'start');
    const cold = before.story.interact('lantern_rest');
    expect(dialogueIds(cold)).toEqual([FD.F_LANTERN_COLD.id]);
    expect(flagsOf(cold)).toEqual([]);
    expect(types(cold)).not.toContain('restParty4');
    expect(before.story.trigger('heart_confront')).toEqual([]);
    // sesudah uji
    const a = step(fake, story, 'interact', 'lantern_rest');
    const rest = types(a).indexOf('restParty4'), flag = a.findIndex((x) => x.type === 'setFlag' && x.flag === C4.checkpoint);
    expect(rest).toBeGreaterThanOrEqual(0);
    expect(flag).toBeGreaterThan(rest);
    expect(ops(a)).toContain('door_open');
    const again = step(fake, story, 'interact', 'lantern_rest');
    expect(types(again)).toContain('restParty4');
    expect(dialogueIds(again)).toEqual([]);
    expect(ops(again)).not.toContain('door_open');
  });

  it('Varlgrim: C4-02 sekali + intro sekali; kalah = langsung battle lagi; sesudah menang pemicu diam; lean + approach sekali di onStart', () => {
    const { fake, story } = make();
    playUntil(fake, story, 'confront');
    const first = story.trigger('heart_confront');
    expect(dialogueIds(first)).toEqual([N.C4_CONFRONT.id, N.C4_BOSS_INTRO.id]);
    expect(battles(first)).toEqual(['varlgrim']);
    expect(flagsOf(first)).toEqual([C4.confront, FORT.bossIntroSeen]);
    fake.run(first);
    const retry = story.trigger('heart_confront');
    expect(dialogueIds(retry)).toEqual([]);
    expect(battles(retry)).toEqual(['varlgrim']);
    fake.win('varlgrim');
    expect(story.trigger('heart_confront')).toEqual([]);
    const s = step(fake, story, 'start');
    expect(dialogueIds(s)).toEqual([N.C4_VICTORY_LEAN.id, N.C4_HEART_APPROACH.id]);
    expect(story.onStart()).toEqual([]);
  });

  it('dua pengunci Heart: tertutup sebelum Varlgrim kalah; kedua pengunci diperlukan (urutan bebas); Heart terbuka hanya sesudah keduanya', () => {
    for (const order of [['heart_lock_yaric', 'heart_lock_velthia'], ['heart_lock_velthia', 'heart_lock_yaric']]) {
      const { fake, story } = make();
      playUntil(fake, story, 'locks');
      const f0 = make();
      step(f0.fake, f0.story, 'start');
      expect(types(f0.story.interact('heart_lock_yaric'))).toEqual(['toast']);
      const a = step(fake, story, 'interact', order[0]!);
      expect(flagsOf(a)).not.toContain(C4.heartOpen);
      expect(fake.flags[C4.heartOpen]).toBeUndefined();
      expect(types(story.interact(order[0]!))).toEqual(['toast']); // tidak dapat ganda
      const b = step(fake, story, 'interact', order[1]!);
      expect(flagsOf(b)).toEqual([order[1] === 'heart_lock_yaric' ? C4.unlockYaric : C4.unlockVelthia, C4.heartOpen, C4.towerFallen]);
      expect(ops(b)).toEqual([order[1] === 'heart_lock_yaric' ? 'lock_yaric' : 'lock_velthia', 'heart_open', 'tower_fall']);
      expect(dialogueIds(b).slice(-2)).toEqual([N.C4_HEART_OPEN.id, N.C4_TOWER_FALL.id]);
    }
  });

  it('pemulihan: keluar di tengah dialog tidak membuat softlock (onStart melanjutkan Heart, menara, dan finale)', () => {
    // kedua pengunci menyala tetapi Heart belum terbuka
    const a = make();
    playUntil(a.fake, a.story, 'locks');
    a.fake.flags[C4.unlockYaric] = true; a.fake.flags[C4.unlockVelthia] = true; a.fake.flags[FORT.heartApproachSeen] = true;
    const r = a.story.onStart();
    expect(ops(r)).toEqual(['heart_open', 'tower_fall']);
    a.fake.run(r);
    expect(a.fake.flags[C4.towerFallen]).toBe(true);
    // Heart terbuka tetapi menara belum
    const b = make();
    playUntil(b.fake, b.story, 'locks');
    Object.assign(b.fake.flags, { [C4.unlockYaric]: true, [C4.unlockVelthia]: true, [C4.heartOpen]: true, [FORT.heartApproachSeen]: true });
    expect(ops(b.story.onStart())).toEqual(['tower_fall']);
    // ingatan lama sudah terbuka tetapi finale belum selesai
    const c = make();
    playUntil(c.fake, c.story, 'end');
    for (const f of [C4.varlgrimTruth, C4.varlgrimStays, FORT.torvanLeft, C4.creatorReveal]) delete c.fake.flags[f];
    const fin = c.story.onStart();
    expect(ops(fin)).toEqual(['varlgrim_arrive', 'varlgrim_to_wall', 'torvan_appear', 'torvan_leave']);
    c.fake.run(fin);
    expect(c.fake.flags[C4.creatorReveal]).toBe(true);
    expect(c.story.onStart()).toEqual([]);
  });

  it('Ruang Gema: benda hanya aktif sesudah Heart terbuka; finale hanya sesudah KEDUA benda; tidak ada pengulangan', () => {
    const { fake, story } = make();
    playUntil(fake, story, 'echo');
    expect(types(story.interact('echo_a'))).not.toContain('toast');
    const a = story.interact('echo_a');
    expect(flagsOf(a)).toEqual([C4.memoryA]); // belum finale
    fake.run(a);
    expect(types(story.interact('echo_a'))).toEqual(['toast']);
    const b = story.interact('echo_b');
    expect(flagsOf(b)).toEqual([C4.memoryB, C4.oldMemory, C4.varlgrimTruth, C4.varlgrimStays, FORT.torvanLeft, C4.creatorReveal]);
    expect(dialogueIds(b)).toEqual([N.C4_MEMORY_B.id, N.C4_OLD_MEMORY.id, N.C4_VARLGRIM_TRUTH.id, N.C4_TORVAN_REVEAL.id, N.C4_TORVAN_LEAVES.id, N.C4_AFTER_TORVAN.id]);
    const fresh = make();
    expect(fresh.story.interact('echo_a')).toEqual([]); // Heart tertutup
  });

  it('gerbang keluar: hanya sesudah creatorReveal (flag returned/complete tidak pernah disetel di sini)', () => {
    const { fake, story } = make();
    step(fake, story, 'start');
    expect(ops(story.interact('outer_gate'))).toEqual([]);
    playUntil(fake, story, 'end');
    expect(ops(story.interact('outer_gate'))).toEqual(['to_aveloria']);
    expect(flagsOf(story.interact('outer_gate'))).toEqual([]);
  });

  it('teka-teki lewat cerita: salah = reset + petunjuk (tanpa flag); benar commit flag SESUDAH dialog; slab diselesaikan oleh dua jangkar', () => {
    const { fake, story } = make();
    step(fake, story, 'start');
    const first = story.interact('seal_noon');
    expect(dialogueIds(first)).toEqual([FD.F_SEAL_FIRST.id, FD.F_SEAL_NOLOG.id]);
    expect(ops(first)).toContain('seal_reset');
    expect(flagsOf(first)).toEqual([FORT.sealHintSeen]);
    fake.run(first);
    // sesudah membaca catatan: salah = toast saja
    step(fake, story, 'interact', 'archive_log');
    const wrong = story.interact('seal_night');
    expect(types(wrong)).toEqual(['c4', 'toast']);
    solveSeals(fake, story);
    expect(fake.flags[FORT.sealsSolved]).toBe(true);
    const solvedSeq = fake.log.filter((l) => l.startsWith('c4:seal_solved') || l.startsWith('c4:door_open:seal'));
    expect(solvedSeq).toEqual(['c4:seal_solved:', 'c4:door_open:seal']);
    expect(story.interact('seal_dawn').map((x) => x.type)).toEqual(['toast']);
    // jangkar
    const a = story.interact('anchor_a');
    expect(dialogueIds(a)).toEqual([FD.F_ANCHOR_HINT.id]);
    fake.run(a);
    const arg = (x: StoryAction[]): string => String((x.find((q) => q.type === 'c4' && q.op === 'anchor_touch') as { arg?: string }).arg);
    expect(arg(a)).toBe('anchor_a:011');
    const b = step(fake, story, 'interact', 'anchor_b');
    expect(ops(b)).toEqual(['anchor_touch', 'rift_solved']);
    expect(flagsOf(b)).toEqual([FORT.riftAligned]);
    expect(types(story.interact('anchor_a'))).toEqual(['toast']);
  });

  it('pintasan dan pintu: tuas membuka pintu pintasan sekali; pintu-pintu terkunci memberi petunjuk tanpa flag', () => {
    const { fake, story } = make();
    step(fake, story, 'start');
    expect(dialogueIds(story.interact('door_seal'))).toEqual([FD.F_DOOR_SEAL.id]);
    expect(dialogueIds(story.interact('door_shortcut'))).toEqual([FD.F_DOOR_SHORTCUT.id]);
    expect(dialogueIds(story.interact('trial_gate'))).toEqual([FD.F_TRIAL_GATE.id]);
    expect(dialogueIds(story.interact('door_heart'))).toEqual([FD.F_DOOR_HEART.id]);
    const a = step(fake, story, 'interact', 'shortcut_lever');
    expect(ops(a)).toEqual(['lever_pull', 'door_open']);
    expect(flagsOf(a)).toEqual([FORT.shortcutOpen]);
    expect(types(story.interact('shortcut_lever'))).toEqual(['toast']);
    expect(story.interact('door_shortcut')).toEqual([]);
  });

  it('lentera istirahat bebas: restParty4 + toast, tanpa flag/checkpoint/hadiah, dapat diulang, tidak mengubah rantai flag', () => {
    const { fake, story } = make();
    step(fake, story, 'start');
    const before = JSON.stringify(fake.flags);
    for (const id of ['hall_lantern', 'corridor_lantern']) for (let i = 0; i < 3; i++) {
      const a = step(fake, story, 'interact', id);
      expect(types(a)).toEqual(['restParty4', 'toast']);
      expect(a[1]).toMatchObject({ text: 'HP dan MP pulih.' });
    }
    expect(JSON.stringify(fake.flags)).toBe(before);
    expect(fake.flags[C4.checkpoint]).toBeUndefined();
    expect(fake.items).toEqual({});
  });

  it('laporan kurir: Gerbang Luar dan Serambi menyetel flag laporan masing-masing', () => {
    const { fake, story } = make();
    step(fake, story, 'start');
    expect(flagsOf(step(fake, story, 'interact', 'courier_a'))).toEqual([C4.reportA]);
    expect(flagsOf(step(fake, story, 'interact', 'courier_b'))).toEqual([C4.reportB]);
  });

  it('teks tujuan (Jurnal) turun dari flag, bahasa Indonesia, tanpa nama "Yaric" sebelum dikenal tidak relevan; berubah sesuai tahap', () => {
    const { fake, story } = make();
    const seen = new Set<string>();
    seen.add(story.objective());
    step(fake, story, 'start'); seen.add(story.objective());
    playUntil(make().fake, make().story, 'seals');
    for (const until of ['seals', 'trial', 'rift', 'lantern', 'confront', 'locks', 'echo', 'finale', 'end'] as const) {
      const m = make();
      playUntil(m.fake, m.story, until);
      const o = m.story.objective();
      expect(o.length).toBeGreaterThan(10);
      seen.add(o);
    }
    expect(seen.size).toBeGreaterThanOrEqual(8);
  });
});

describe('Naskah Benteng (dialogue/chapter4.fortress.ts)', () => {
  const scripts = FD.FORTRESS_SCRIPTS;
  it('ID unik berawalan C4-FORT-, sumber DRAFT_IMPL, tiap skrip berisi baris', () => {
    const ids: string[] = [];
    for (const sc of scripts) {
      expect(sc.id.startsWith('C4-FORT-'), sc.id).toBe(true);
      expect(sc.nodes.length, sc.id).toBeGreaterThan(0);
      for (const n of sc.nodes) {
        if (n.type !== 'line') continue;
        expect(n.source).toBe('DRAFT_IMPL');
        expect(n.id.startsWith('C4-FORT-X')).toBe(true);
        ids.push(n.id);
        expect(n.text.length).toBeGreaterThan(5);
      }
    }
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(scripts.map((s) => s.id)).size).toBe(scripts.length);
  });
  it('disiplin kanon: tidak menyebut jam pasir, Yudis/modern, atau jati diri Torvan; Varlgrim hanya lewat bukti', () => {
    const text = scripts.flatMap((s) => s.nodes.flatMap((n) => (n.type === 'line' ? [n.text] : []))).join(' ').toLowerCase();
    for (const bad of ['jam pasir', 'hourglass', 'yudis', 'telepon', 'foto', 'pencipta', 'tahun 20', 'anniversary', 'meteor']) expect(text, bad).not.toContain(bad);
    expect(text).not.toContain('varlgrim'); // lore dibangun dari bukti (nama tidak dicoret, jubah belum selesai), bukan menyebut pelaku
  });
  it('pembicara dan ekspresi memakai portrait yang ada (C01/C02) atau SYSTEM', () => {
    const ok: Record<string, string[]> = { C01: ['ANGRY', 'CONFUSED', 'DETERMINED', 'EMBARRASSED', 'HAPPY', 'NEUTRAL', 'SAD', 'SURPRISED'], C02: ['AMUSED', 'NEUTRAL', 'STERN', 'SURPRISED', 'VULNERABLE', 'WORRIED'] };
    for (const sc of scripts) for (const n of sc.nodes) {
      if (n.type !== 'line' || n.speaker === 'SYSTEM') continue;
      expect(ok[n.speaker], `${sc.id} ${n.speaker}`).toBeDefined();
      expect(ok[n.speaker]).toContain(n.expression);
    }
  });
});
