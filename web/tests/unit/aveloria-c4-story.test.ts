import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { GameState } from '../../src/game/systems/GameState';
import { AveloriaC4Story } from '../../src/game/story/c4/aveloriaC4';
import type { StoryAction } from '../../src/game/story/Chapter1Story';
import { C4 } from '../../src/game/story/chapter4Flags';
import { C4_RETURN_AVELORIA } from '../../src/game/dialogue/chapter4';
import * as D from '../../src/game/dialogue/chapter4.aveloria';
import { AVELORIA_C4_IDS } from '../../src/game/world/aveloriaC4';
import { DISPLAY_NAMES } from '../../src/game/dialogue/types';

class MockState {
  readonly flags: Record<string, boolean> = {};
  hasFlag(f: string): boolean { return !!this.flags[f]; }
  setFlag(f: string): boolean { if (this.flags[f]) return false; this.flags[f] = true; return true; }
  snapshot(): { flags: Record<string, boolean> } { return { flags: { ...this.flags } }; }
}
function setup(flags: readonly string[] = [C4.returned]) {
  const state = new MockState(); for (const f of flags) state.flags[f] = true;
  return { state: state as unknown as GameState & MockState, story: new AveloriaC4Story(state as unknown as GameState) };
}
const setFlags = (a: StoryAction[]): string[] => a.flatMap(x => (x.type === 'setFlag' ? [x.flag] : []));
const types = (a: StoryAction[]): string[] => a.map(x => x.type);
/** Menjalankan aksi seperti WorldScene: dialog selesai -> flag dipasang. Mengembalikan log. */
function run(state: GameState, actions: StoryAction[], log: { ops: string[]; dialogues: string[]; items: number; battles: number; areas: string[] }): void {
  for (const a of actions) {
    if (a.type === 'setFlag') state.setFlag(a.flag);
    else if (a.type === 'c4') log.ops.push(a.op);
    else if (a.type === 'dialogue') log.dialogues.push(a.script.id);
    else if (a.type === 'giveItem') log.items++;
    else if (a.type === 'battle') log.battles++;
    else if (a.type === 'changeArea') log.areas.push(a.area);
  }
}
const newLog = () => ({ ops: [] as string[], dialogues: [] as string[], items: 0, battles: 0, areas: [] as string[] });

describe('AveloriaC4Story: pembukaan (C4-07)', () => {
  it('tidak aktif sebelum lead menandai kembali ke Aveloria (flag returned); tidak ada aksi', () => {
    const { story } = setup([]);
    expect(story.active).toBe(false);
    expect(story.onStart()).toEqual([]); expect(story.interact('velthia')).toEqual([]); expect(story.interact('c4_roster')).toEqual([]); expect(story.trigger('apa pun')).toEqual([]);
  });

  it('onStart: koreografi kamera -> C4_RETURN_AVELORIA -> flag returnSeen SESUDAH dialog -> objective; hanya sekali', () => {
    const { state, story } = setup();
    const a = story.onStart();
    expect(types(a)).toEqual(['c4', 'dialogue', 'setFlag', 'objective']);
    expect(a[0]).toEqual({ type: 'c4', op: 'returnOpen' });
    expect(a[1]).toMatchObject({ script: C4_RETURN_AVELORIA });
    expect(setFlags(a)).toEqual([C4.returnSeen]);
    expect(types(a).indexOf('setFlag')).toBeGreaterThan(types(a).indexOf('dialogue'));
    expect(state.hasFlag(C4.returnSeen)).toBe(false); // belum dijalankan = belum di-commit
    state.setFlag(C4.returnSeen);
    expect(story.onStart()).toEqual([]);
  });

  it('adegan kembali tidak pernah men-set returned atau complete (milik lead / penutup)', () => {
    const { story } = setup();
    for (const id of ['talric', 'azie', 'velthia', 'c4_roster']) { const f = setFlags(story.interact(id)); expect(f).not.toContain(C4.returned); expect(f).not.toContain(C4.complete); }
    expect(setFlags(story.onStart())).not.toContain(C4.returned);
  });
});

describe('AveloriaC4Story: urutan flag dan penutup Bab IV', () => {
  it('menemui Talric/Azie/Velthia sebelum adegan selesai memainkan adegan itu (tanpa koreografi kamera) dan tidak menutup bab', () => {
    for (const id of ['talric', 'azie', 'velthia']) {
      const a = setup().story.interact(id);
      expect(types(a)).toEqual(['dialogue', 'setFlag', 'objective']); expect(setFlags(a)).toEqual([C4.returnSeen]);
      expect(a[0]).toMatchObject({ script: C4_RETURN_AVELORIA });
    }
  });

  it('papan daftar sebelum adegan hanya toast; sesudahnya menutup bab (complete) setelah dialog', () => {
    expect(setup().story.interact(AVELORIA_C4_IDS.roster)).toEqual([{ type: 'toast', text: expect.any(String) }]);
    const { story } = setup([C4.returned, C4.returnSeen]);
    const a = story.interact(AVELORIA_C4_IDS.roster);
    expect(types(a)).toEqual(['dialogue', 'setFlag', 'objective']); expect(a[0]).toMatchObject({ script: D.C4_AVE_ROSTER_CLOSE }); expect(setFlags(a)).toEqual([C4.complete]);
  });

  it('bicara dengan Velthia sesudah adegan: dialog penutup -> complete', () => {
    const a = setup([C4.returned, C4.returnSeen]).story.interact('velthia');
    expect(types(a)).toEqual(['dialogue', 'setFlag', 'objective']); expect(a[0]).toMatchObject({ script: D.C4_AVE_VELTHIA_CLOSE }); expect(setFlags(a)).toEqual([C4.complete]);
  });

  it('urutan lengkap dijalankan seperti WorldScene: returned -> returnSeen -> complete, tanpa hadiah, battle, atau pindah area', () => {
    const { state, story } = setup(); const log = newLog();
    run(state, story.onStart(), log); expect(state.hasFlag(C4.returnSeen)).toBe(true); expect(state.hasFlag(C4.complete)).toBe(false);
    for (const id of ['c4_res_a', 'talric', 'azie', 'derrria', 'c4_bell']) run(state, story.interact(id), log); // percakapan opsional tidak mengubah flag
    expect(state.hasFlag(C4.complete)).toBe(false);
    run(state, story.interact('velthia'), log);
    expect(state.hasFlag(C4.complete)).toBe(true);
    expect(log.ops).toEqual(['returnOpen']); expect(log.items).toBe(0); expect(log.battles).toBe(0); expect(log.areas).toEqual([]);
    const setOrder = Object.keys(state.flags);
    expect(setOrder.indexOf(C4.returnSeen)).toBeLessThan(setOrder.indexOf(C4.complete));
  });

  it('complete hanya SEKALI: interaksi penutup berikutnya tidak men-set flag lagi (idempoten, tanpa hadiah ganda)', () => {
    const { state, story } = setup(); const log = newLog();
    run(state, story.onStart(), log);
    let sets = 0;
    for (const id of ['velthia', 'c4_roster', 'velthia', 'c4_roster', 'velthia']) { const a = story.interact(id); sets += setFlags(a).filter(f => f === C4.complete).length; run(state, a, log); }
    expect(sets).toBe(1);
    const after = story.interact('velthia'); expect(setFlags(after)).toEqual([]); expect(after[0]).toMatchObject({ script: D.C4_AVE_VELTHIA_AFTER });
    const board = story.interact(AVELORIA_C4_IDS.roster); expect(setFlags(board)).toEqual([]); expect(types(board)).toEqual(['dialogue']);
    expect(story.onStart()).toEqual([]); // reload sesudah selesai tidak memutar ulang adegan
    expect(log.items).toBe(0);
  });

  it('muat ulang di tengah (returnSeen sudah ada): tidak memutar adegan lagi tetapi bab tetap dapat ditutup', () => {
    const { story } = setup([C4.returned, C4.returnSeen]);
    expect(story.onStart()).toEqual([]);
    expect(setFlags(story.interact('velthia'))).toEqual([C4.complete]);
  });

  it('objective (hanya Jurnal) berubah per tahap dan tidak menyebut nama sebelum saatnya', () => {
    expect(setup([]).story.objective()).toBe('Jelajahi Aveloria.');
    const t = [setup().story.objective(), setup([C4.returned, C4.returnSeen]).story.objective(), setup([C4.returned, C4.returnSeen, C4.complete]).story.objective()];
    expect(new Set(t).size).toBe(3); expect(t[0]).toMatch(/Talric/); expect(t[1]).toMatch(/papan daftar/); expect(t[2]).toBe('Bab IV selesai.');
  });
});

describe('AveloriaC4Story: warga, pengamatan, dan batas isi', () => {
  it('setiap interactable memiliki dialog dan tidak mengubah flag cerita (selain penutup)', () => {
    const { story } = setup([C4.returned, C4.returnSeen]);
    for (const id of [...AVELORIA_C4_IDS.residents, 'talric', 'azie', 'derrria', AVELORIA_C4_IDS.bell, AVELORIA_C4_IDS.fenceSign, 'city_sign']) {
      const a = story.interact(id); expect(a.length, id).toBeGreaterThan(0); expect(types(a), id).toEqual(['dialogue']);
      expect(a[0]).toMatchObject({ type: 'dialogue' });
    }
    expect(story.interact('tidak_ada')).toEqual([]);
  });

  it('4-6 warga tanpa nama, dialog pendek, DRAFT_IMPL, ID C4-AVE-…, mengakui kerugian dan syukur', () => {
    const res = [D.C4_AVE_VENDOR, D.C4_AVE_PORTER, D.C4_AVE_RES_A, D.C4_AVE_RES_B, D.C4_AVE_RES_C, D.C4_AVE_GUARD];
    expect(AVELORIA_C4_IDS.residents.length).toBe(res.length);
    for (const s of res) {
      expect(s.nodes.length).toBeGreaterThanOrEqual(1); expect(s.nodes.length).toBeLessThanOrEqual(2);
      for (const n of s.nodes) { expect(n.type).toBe('line'); if (n.type === 'line') { expect(n.speaker).toBe('SYSTEM'); expect(n.source).toBe('DRAFT_IMPL'); expect(n.id.startsWith('C4-AVE-')).toBe(true); expect(n.text.length).toBeLessThan(260); expect(n.label, 'label peran, bukan nama').toBeTruthy(); } }
    }
    const text = res.map(s => s.nodes.map(n => (n.type === 'line' ? n.text : '')).join(' ')).join(' ').toLowerCase();
    expect(text).toMatch(/atap|rumah|kios|sayur/); expect(text).toMatch(/syukur|lega|selamat|tidur nyenyak|ikut/);
  });

  it('semua baris Aveloria-IV: ID unik, DRAFT_IMPL, tidak ada pembicara Torvan, portrait hanya yang sudah ada', () => {
    const ids = new Set<string>();
    for (const s of D.C4_AVE_SCRIPTS) for (const n of s.nodes) {
      expect(n.type).toBe('line'); if (n.type !== 'line') continue;
      expect(ids.has(n.id), `ID unik ${n.id}`).toBe(false); ids.add(n.id);
      expect(n.source).toBe('DRAFT_IMPL'); expect(n.id.startsWith('C4-AVE-')).toBe(true);
      expect(n.speaker).not.toBe('C03'); expect(n.speaker).not.toBe('C04');
      if (n.speaker !== 'SYSTEM') {
        expect(DISPLAY_NAMES[n.speaker]).toBeTruthy();
        expect(existsSync(resolve(__dirname, `../../public/assets/portraits_hd/${n.speaker}_${n.expression}.png`)), `portrait ${n.speaker}_${n.expression}`).toBe(true);
      }
    }
  });
});

describe('AveloriaC4Story: tidak ada referensi modern atau konten setelah Bab IV', () => {
  const FILES = ['src/game/story/c4/aveloriaC4.ts', 'src/game/dialogue/chapter4.aveloria.ts', 'src/game/world/AveloriaC4View.ts', 'src/game/world/aveloriaC4.ts', 'src/game/data/maps/town.c4.mjs', 'src/game/data/aveloriaC4Assets.ts'];
  const FORBIDDEN = /modern|ponsel|telepon|smartphone|\bfoto\b|kamera ponsel|Yudis|anniversary|kredit|epilog|berabad|kencan|Interlude|BGM_|kota modern|\bkafe\b|internet/i;
  for (const f of FILES) {
    it(`${f} bebas istilah modern/epilog/kredit/BGM`, () => {
      const src = readFileSync(resolve(__dirname, '../..', f), 'utf8');
      // `kamera` murni dipakai untuk kamera game; istilah modern yang dilarang dicari tanpa kata itu
      const m = FORBIDDEN.exec(src); expect(m?.[0] ?? null, `${f}: ${m?.[0]}`).toBeNull();
    });
  }
  it('Torvan dan Varlgrim tidak muncul dalam dialog atau titik adegan Aveloria-IV', () => {
    const src = readFileSync(resolve(__dirname, '../../src/game/dialogue/chapter4.aveloria.ts'), 'utf8') + readFileSync(resolve(__dirname, '../../src/game/story/c4/aveloriaC4.ts'), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); // komentar boleh menyebut aturan, data/dialog tidak
    expect(code).not.toMatch(/torvan|varlgrim|jam pasir|hourglass/i);
  });
});
