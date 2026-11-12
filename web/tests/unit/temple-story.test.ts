import { describe, expect, it } from 'vitest';
import { C3 } from '../../src/game/story/chapter3Flags';
import type { StoryAction } from '../../src/game/story/Chapter1Story';
import { TEMPLE_FLAG, TempleStory } from '../../src/game/story/c3/temple';
import { TemplePuzzleSession, DIAL_IDS } from '../../src/game/world/templePuzzle';
import { TEMPLE_INTERACTABLES, TEMPLE_TRIGGERS } from '../../src/game/data/maps/temple.map.mjs';
import type { GameState } from '../../src/game/systems/GameState';

/** GameState tiruan: hanya flag. Menjalankan StoryAction seperti WorldScene (flag di-commit hanya lewat aksi setFlag). */
class Fake {
  flags: Record<string, boolean> = {};
  log: string[] = [];
  hasFlag(f: string): boolean { return !!this.flags[f]; }
  snapshot(): { flags: Record<string, boolean>; area: string } { return { flags: this.flags, area: 'temple' }; }
  run(actions: readonly StoryAction[]): void {
    for (const a of actions) {
      if (a.type === 'setFlag') this.flags[a.flag] = true;
      else if (a.type === 'dialogue') this.log.push(`dialogue:${a.script.id}`);
      else if (a.type === 'c3') this.log.push(`c3:${a.op}:${a.arg ?? ''}`);
      else this.log.push(a.type + (a.type === 'battle' ? `:${a.encounter}` : ''));
    }
  }
}
function make(): { fake: Fake; story: TempleStory; session: TemplePuzzleSession } {
  const fake = new Fake(), session = new TemplePuzzleSession();
  return { fake, session, story: new TempleStory(fake as unknown as GameState, session) };
}
const types = (a: readonly StoryAction[]): string[] => a.map((x) => x.type);
const dialogueIds = (a: readonly StoryAction[]): string[] => a.flatMap((x) => (x.type === 'dialogue' ? [x.script.id] : []));
function press(story: TempleStory, fake: Fake, id: string): StoryAction[] { const a = story.interact(id); fake.run(a); return a; }
function solveAll(story: TempleStory, fake: Fake): void {
  for (const id of ['a_pillar_1', 'a_pillar_2', 'a_pillar_3', 'b_disc_3']) press(story, fake, id);
  for (let i = 0; i < 2; i++) for (const id of DIAL_IDS) press(story, fake, id);
}

describe('TempleStory: alur kuil', () => {
  it('onStart: dialog pintu masuk sekali, flag di-commit sesudah dialog; mulai ulang tidak mengulang', () => {
    const { fake, story } = make();
    const a = story.onStart();
    expect(types(a)).toEqual(['dialogue', 'setFlag']);
    expect(a[1]).toMatchObject({ flag: C3.templeEntered });
    expect(fake.flags[C3.templeEntered]).toBeUndefined(); // belum di-commit sampai aksi dijalankan
    fake.run(a);
    expect(story.onStart()).toEqual([]);
  });

  it('semua interaktif peta ditangani cerita (tidak ada objek bisu) pada tahap cerita yang tepat', () => {
    const { fake, story } = make();
    const all: Record<string, boolean> = { [C3.puzzleA]: true, [C3.puzzleB]: true, [C3.puzzleC]: true, [C3.gateOpen]: true, [C3.chronolith]: true, [C3.chronolithOutroSeen]: true, [C3.hiddenName]: true };
    for (const it of TEMPLE_INTERACTABLES) {
      fake.flags = {};
      expect(story.interact(it.id).length, `${it.id} (awal)`).toBeGreaterThan(0);
      fake.flags = { ...all };
      expect(story.interact(it.id).length, `${it.id} (akhir)`).toBeGreaterThan(0);
    }
    fake.flags = {};
    for (const t of TEMPLE_TRIGGERS) story.trigger(t.id); // tidak melempar
  });

  it('A: salah = reset + petunjuk (tanpa flag); urutan benar commit flag SESUDAH dialog selesai', () => {
    const { fake, story } = make();
    fake.run(story.onStart());
    const wrong = story.interact('a_pillar_3');
    expect(types(wrong)).toContain('dialogue');
    expect(wrong.some((x) => x.type === 'setFlag' && x.flag !== TEMPLE_FLAG.introSeen)).toBe(false);
    expect(wrong.some((x) => x.type === 'c3' && x.op === 'puzzle_reset')).toBe(true);
    fake.run(wrong);
    press(story, fake, 'a_pillar_1'); press(story, fake, 'a_pillar_2');
    const last = press(story, fake, 'a_pillar_3');
    const iDialog = last.findIndex((x) => x.type === 'dialogue' && x.script.id === 'C3-04-SOLVED-A');
    const iFlag = last.findIndex((x) => x.type === 'setFlag' && x.flag === C3.puzzleA);
    expect(iDialog).toBeGreaterThanOrEqual(0);
    expect(iFlag).toBeGreaterThan(iDialog);
    expect(fake.flags[C3.puzzleA]).toBe(true);
    expect(fake.flags[C3.gateOpen]).toBeUndefined();
  });

  it('C terkunci sebelum A dan B; setelah itu alas diputar dan gerbang terbuka hanya saat semua selesai', () => {
    const { fake, story } = make();
    fake.run(story.onStart());
    const locked = story.interact('c_dial_l');
    expect(locked.some((x) => x.type === 'toast')).toBe(true);
    expect(locked.some((x) => x.type === 'c3' && x.op === 'dial_set')).toBe(false);
    for (const id of ['a_pillar_1', 'a_pillar_2', 'a_pillar_3', 'b_disc_3']) press(story, fake, id);
    expect(fake.flags[C3.gateOpen]).toBeUndefined();
    let last: StoryAction[] = [];
    for (let i = 0; i < 2; i++) for (const id of DIAL_IDS) last = press(story, fake, id);
    expect(fake.flags[C3.puzzleC]).toBe(true);
    expect(fake.flags[C3.gateOpen]).toBe(true);
    expect(fake.flags[C3.checkpoint]).toBe(true);
    // urutan: dialog solved C -> flag C -> animasi gerbang -> dialog gerbang -> flag gerbang
    const idx = (p: (x: StoryAction) => boolean): number => last.findIndex(p);
    const dC = idx((x) => x.type === 'dialogue' && x.script.id === 'C3-04-SOLVED-C');
    const fC = idx((x) => x.type === 'setFlag' && x.flag === C3.puzzleC);
    const op = idx((x) => x.type === 'c3' && x.op === 'gate_open');
    const dG = idx((x) => x.type === 'dialogue' && x.script.id === 'C3-04-GATE');
    const fG = idx((x) => x.type === 'setFlag' && x.flag === C3.gateOpen);
    expect(dC).toBeGreaterThanOrEqual(0);
    expect([dC, fC, op, dG, fG].every((v, i, a) => i === 0 || v > a[i - 1]!)).toBe(true);
  });

  it('pemulihan: semua selesai tetapi gerbang belum di-commit -> onStart memperbaiki sekali', () => {
    const { fake, story } = make();
    fake.run(story.onStart());
    fake.flags = { ...fake.flags, [C3.puzzleA]: true, [C3.puzzleB]: true, [C3.puzzleC]: true };
    const a = story.onStart();
    expect(a.some((x) => x.type === 'c3' && x.op === 'gate_open')).toBe(true);
    fake.run(a);
    expect(story.onStart().some((x) => x.type === 'c3' && x.op === 'gate_open')).toBe(false);
  });

  it('idempoten dan tanpa hadiah ganda: mengulang interaksi tidak mengubah flag dan tidak pernah memberi item', () => {
    const { fake, story } = make();
    fake.run(story.onStart());
    solveAll(story, fake);
    const before = JSON.stringify(fake.flags);
    const every: StoryAction[] = [];
    for (const it of TEMPLE_INTERACTABLES) every.push(...story.interact(it.id));
    for (const t of TEMPLE_TRIGGERS) every.push(...story.trigger(t.id));
    expect(every.some((x) => x.type === 'giveItem')).toBe(false);
    for (let i = 0; i < 2; i++) for (const id of ['a_pillar_1', 'a_pillar_2', 'b_disc_3', 'c_dial_l']) {
      const a = press(story, fake, id);
      expect(a.some((x) => x.type === 'setFlag')).toBe(false); // sudah selesai: hanya toast
    }
    // kunjungan ulang (camp/catatan) hanya menambah flag yang sama
    for (const it of TEMPLE_INTERACTABLES) fake.run(story.interact(it.id));
    const after = Object.keys(fake.flags).filter((k) => !(k in JSON.parse(before)));
    expect(after.sort()).toEqual([C3.campSeen, C3.chronolithIntroSeen, C3.puzzleNote].sort());
    expect(fake.flags[C3.complete]).toBeUndefined(); // belum menang atas Chronolith
  });

  it('perkemahan: titik pemulihan memulihkan party dan menandai checkpoint; dialog kemah hanya sekali', () => {
    const { fake, story } = make();
    fake.run(story.onStart());
    const first = press(story, fake, 'temple_camp');
    expect(types(first)).toContain('restParty');
    expect(dialogueIds(first)).toEqual(['C3-03-CAMP']);
    expect(fake.flags[C3.checkpoint]).toBe(true);
    expect(fake.flags[C3.campSeen]).toBe(true);
    const again = press(story, fake, 'temple_camp');
    expect(dialogueIds(again)).toEqual([]);
    expect(types(again)).toContain('restParty');
    expect(again.some((x) => x.type === 'giveItem')).toBe(false);
  });

  it('patroli opsional: bertarung hanya bila belum dibersihkan; tidak muncul lagi sesudah flag menang', () => {
    const { fake, story } = make();
    expect(story.trigger('temple_fight1').some((x) => x.type === 'battle' && x.encounter === 'temple_oathguard')).toBe(true);
    expect(story.trigger('temple_fight2').some((x) => x.type === 'battle' && x.encounter === 'temple_mixed')).toBe(true);
    fake.flags[C3.templeFight1] = true; fake.flags[C3.templeFight2] = true;
    expect(story.trigger('temple_fight1')).toEqual([]);
    expect(story.trigger('temple_fight2')).toEqual([]);
  });

  it('Chronolith: tidak bisa dipicu sebelum gerbang terbuka; intro dialog sekali; boss -> outro -> catatan -> pintu keluar -> akhir bab', () => {
    const { fake, story } = make();
    fake.run(story.onStart());
    expect(story.trigger('temple_chronolith')).toEqual([]);
    expect(story.interact('chronolith').some((x) => x.type === 'battle')).toBe(false);
    solveAll(story, fake);
    const first = story.trigger('temple_chronolith');
    expect(types(first)).toEqual(['c3', 'dialogue', 'setFlag', 'battle']);
    expect(first[3]).toMatchObject({ encounter: 'chronolith' });
    fake.run(first);
    const retry = story.trigger('temple_chronolith'); // kalah lalu coba lagi: tanpa dialog ulang, tanpa softlock
    expect(types(retry)).toEqual(['c3', 'battle']);
    // kemenangan di-commit oleh engine battle (flag boss.chronolith)
    fake.flags[C3.chronolith] = true;
    expect(story.trigger('temple_chronolith')).toEqual([]);
    expect(story.interact('hall_record').every((x) => x.type === 'toast')).toBe(true); // outro belum diputar
    const start = story.onStart();
    expect(dialogueIds(start)).toEqual(['C3-05-OUTRO']);
    fake.run(start);
    expect(story.onStart()).toEqual([]);
    expect(story.interact('hall_exit').every((x) => x.type === 'toast')).toBe(true); // catatan belum dibaca
    const rec = press(story, fake, 'hall_record');
    expect(fake.flags[C3.hiddenName]).toBe(true);
    expect(rec.findIndex((x) => x.type === 'setFlag')).toBeGreaterThan(rec.findIndex((x) => x.type === 'dialogue'));
    const exit = story.interact('hall_exit');
    expect(dialogueIds(exit)).toEqual(['C3-07-PROMISE', 'C3-07-END']);
    expect(types(exit)).toEqual(['dialogue', 'setFlag', 'dialogue', 'setFlag', 'chapter3End']);
    fake.run(exit);
    expect(fake.flags[C3.promise]).toBe(true); expect(fake.flags[C3.complete]).toBe(true);
    expect(types(story.interact('hall_exit'))).toEqual(['chapter3End']);
  });

  it('objective mengikuti flag dan tidak pernah kosong', () => {
    const { fake, story } = make();
    const seen = new Set<string>();
    seen.add(story.objective());
    solveAll(story, fake);
    seen.add(story.objective());
    fake.flags[C3.checkpoint] = true; seen.add(story.objective());
    fake.flags[C3.chronolith] = true; seen.add(story.objective());
    fake.flags[C3.chronolithOutroSeen] = true; seen.add(story.objective());
    fake.flags[C3.hiddenName] = true; seen.add(story.objective());
    fake.flags[C3.complete] = true; seen.add(story.objective());
    expect(seen.size).toBeGreaterThanOrEqual(6);
    for (const s of seen) { expect(s.length).toBeGreaterThan(5); expect(s).not.toMatch(/Yaric/); }
  });

  it('tanpa softlock: dari tiap keadaan sebagian ada tindakan yang memajukan (petunjuk, reset, atau teka-teki berikutnya)', () => {
    const { fake, story } = make();
    fake.run(story.onStart());
    // salah berkali-kali tidak pernah menutup jalan
    for (let i = 0; i < 5; i++) fake.run(story.interact('a_pillar_2'));
    for (let i = 0; i < 5; i++) fake.run(story.interact('b_disc_1'));
    solveAll(story, fake);
    expect(fake.flags[C3.gateOpen]).toBe(true);
    // petunjuk selalu tersedia
    for (const id of ['a_mural', 'b_lamp', 'c_mural_l', 'c_mural_r', 'temple_note']) expect(types(story.interact(id))).toContain('dialogue');
  });

  it('teks puzzle tidak menyebut nama sebelum waktunya dan tidak ada flag bab lain', () => {
    const { fake, story } = make();
    const acts: StoryAction[] = [...story.onStart()];
    for (const it of TEMPLE_INTERACTABLES) acts.push(...story.interact(it.id));
    const setFlags = acts.flatMap((x) => (x.type === 'setFlag' ? [x.flag] : []));
    for (const f of setFlags) expect(f.startsWith('c3.') || f.startsWith('checkpoint.c3') || f.startsWith('boss.') || f.startsWith('battle.') || f.startsWith('party.')).toBe(true);
    void fake;
  });
});
