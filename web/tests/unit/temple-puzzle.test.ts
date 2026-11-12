import { describe, expect, it } from 'vitest';
import { C3 } from '../../src/game/story/chapter3Flags';
import {
  A_ORDER, B_ANSWER, B_DISCS, DIAL_IDS, DIAL_START, DIAL_TARGET, PUZZLES, PUZZLE_FLAG, TemplePuzzleSession, activate, allSolved, cUnlocked, dialPositions,
  fromFlags, gateIsOpen, gateNeedsOpening, litPillars, puzzleOf, solvedCount, toFlags, type Dir, type PuzzleId,
} from '../../src/game/world/templePuzzle';

const noFlags = (): Record<string, boolean> => ({});
function solveA(flags: Record<string, boolean>, s: TemplePuzzleSession): void {
  for (const id of A_ORDER) activate(id, flags, s);
  flags[C3.puzzleA] = true;
}
function solveB(flags: Record<string, boolean>, s: TemplePuzzleSession): void {
  expect(activate(B_ANSWER, flags, s).kind).toBe('solved');
  flags[C3.puzzleB] = true;
}
function solveC(flags: Record<string, boolean>, s: TemplePuzzleSession): void {
  let last = '';
  for (let i = 0; i < 8; i++) for (const id of DIAL_IDS) {
    const t = DIAL_TARGET[id];
    if (s.dials[id] !== t) last = activate(id, flags, s).kind;
  }
  expect(last).toBe('solved');
  flags[C3.puzzleC] = true;
}

describe('teka-teki Kuil Jejak: A (urutan pilar)', () => {
  it('urutan lambang naik menyelesaikan A; kemajuan dilaporkan per langkah', () => {
    const s = new TemplePuzzleSession(), f = noFlags();
    expect(activate('a_pillar_1', f, s)).toMatchObject({ kind: 'progress', step: 1, total: 3 });
    expect(activate('a_pillar_2', f, s)).toMatchObject({ kind: 'progress', step: 2 });
    expect(litPillars(f, s)).toEqual(['a_pillar_1', 'a_pillar_2']);
    expect(activate('a_pillar_3', f, s)).toMatchObject({ kind: 'solved', puzzle: 'A' });
  });
  it('salah (urutan lain atau menekan pilar yang sudah menyala) mereset aman dan bisa dimulai lagi', () => {
    for (const wrong of ['a_pillar_3', 'a_pillar_2']) {
      const s = new TemplePuzzleSession(), f = noFlags();
      expect(activate(wrong, f, s)).toMatchObject({ kind: 'wrong', puzzle: 'A' });
      expect(s.progressA).toEqual([]);
    }
    const s = new TemplePuzzleSession(), f = noFlags();
    activate('a_pillar_1', f, s);
    expect(activate('a_pillar_1', f, s).kind).toBe('wrong'); // menekan ulang pilar yang menyala
    expect(litPillars(f, s)).toEqual([]);
    activate('a_pillar_1', f, s); activate('a_pillar_3', f, s); // salah di tengah jalan
    expect(s.progressA).toEqual([]);
    for (const id of A_ORDER.slice(0, 2)) activate(id, f, s);
    expect(activate('a_pillar_3', f, s).kind).toBe('solved');
  });
  it('semua 6 permutasi: tepat satu (1,2,3) yang menyelesaikan; sisanya reset tanpa dampak lain', () => {
    const perms = [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]];
    let solved = 0;
    for (const p of perms) {
      const s = new TemplePuzzleSession(), f = noFlags();
      let last = '';
      for (const n of p) { last = activate(`a_pillar_${n}`, f, s).kind; if (last === 'wrong') break; }
      if (last === 'solved') solved++;
    }
    expect(solved).toBe(1);
  });
  it('idempoten setelah selesai: already, sesi tidak berubah', () => {
    const s = new TemplePuzzleSession(), f = noFlags();
    solveA(f, s);
    expect(litPillars(f, s)).toEqual([...A_ORDER]);
    for (const id of A_ORDER) expect(activate(id, f, s)).toEqual({ kind: 'already', puzzle: 'A' });
    expect(s.progressA).toEqual([]);
  });
});

describe('teka-teki Kuil Jejak: B (cakram yang disorot cahaya)', () => {
  it('hanya cakram yang disorot lampu yang berhasil; salah tidak menyimpan keadaan', () => {
    const s = new TemplePuzzleSession(), f = noFlags();
    for (const d of B_DISCS.filter((x) => x !== B_ANSWER)) expect(activate(d, f, s)).toMatchObject({ kind: 'wrong', puzzle: 'B' });
    expect(s.progressA).toEqual([]); expect(s.dials).toEqual(DIAL_START);
    expect(activate(B_ANSWER, f, s)).toMatchObject({ kind: 'solved', puzzle: 'B' });
    f[C3.puzzleB] = true;
    for (const d of B_DISCS) expect(activate(d, f, s).kind).toBe('already');
  });
});

describe('teka-teki Kuil Jejak: C (arah alas)', () => {
  it('terkunci sampai A dan B selesai; membuka kunci tidak mengubah sesi saat terkunci', () => {
    const s = new TemplePuzzleSession(), f = noFlags();
    expect(cUnlocked(f)).toBe(false);
    expect(activate('c_dial_l', f, s)).toEqual({ kind: 'locked', puzzle: 'C' });
    expect(s.dials).toEqual(DIAL_START);
    f[C3.puzzleA] = true; expect(activate('c_dial_l', f, s).kind).toBe('locked');
    f[C3.puzzleB] = true; expect(cUnlocked(f)).toBe(true);
    expect(activate('c_dial_l', f, s)).toMatchObject({ kind: 'dial', pos: 0 }); // barat -> utara
  });
  it('tiap alas berputar searah jarum jam tanpa pernah "salah"; selesai ketika ketiganya sesuai lukisan', () => {
    const s = new TemplePuzzleSession(), f: Record<string, boolean> = { [C3.puzzleA]: true, [C3.puzzleB]: true };
    // putar sembarang urutan: 4 kali kembali ke awal (tidak ada keadaan buntu)
    for (let i = 0; i < 4; i++) activate('c_dial_m', f, s);
    expect(s.dials.c_dial_m).toBe(DIAL_START.c_dial_m);
    expect(DIAL_TARGET).toEqual({ c_dial_l: 1, c_dial_r: 3, c_dial_m: 0 }); // timur, barat, utara (menuju lingkaran)
    solveC(f, s);
    expect(dialPositions(f, s)).toEqual(DIAL_TARGET);
    for (const id of DIAL_IDS) expect(activate(id, f, s).kind).toBe('already');
  });
  it('dialPositions memulihkan sasaran dari flag walau sesi baru (muat save)', () => {
    const fresh = new TemplePuzzleSession();
    expect(dialPositions({ [C3.puzzleC]: true }, fresh)).toEqual(DIAL_TARGET);
    expect(dialPositions({}, fresh)).toEqual(DIAL_START);
  });
});

describe('gerbang aula dan serialisasi flag', () => {
  const subsets: Array<Record<PuzzleId, boolean>> = [];
  for (let m = 0; m < 8; m++) subsets.push({ A: !!(m & 1), B: !!(m & 2), C: !!(m & 4) });
  it('toFlags/fromFlags membulat-balik untuk semua 8 kombinasi dan memakai flag kontrak C3', () => {
    for (const sub of subsets) {
      expect(fromFlags(toFlags(sub))).toEqual(sub);
      for (const p of PUZZLES) expect(toFlags(sub)[PUZZLE_FLAG[p]]).toBe(sub[p] ? true : undefined);
    }
    expect(PUZZLE_FLAG).toEqual({ A: C3.puzzleA, B: C3.puzzleB, C: C3.puzzleC });
  });
  it('gerbang terbuka hanya bila SEMUA teka-teki selesai dan flag gerbang di-commit', () => {
    for (const sub of subsets) {
      const f = { ...toFlags(sub), [C3.gateOpen]: true };
      expect(gateIsOpen(f)).toBe(sub.A && sub.B && sub.C);
      expect(allSolved(toFlags(sub))).toBe(sub.A && sub.B && sub.C);
      expect(solvedCount(toFlags(sub))).toBe([sub.A, sub.B, sub.C].filter(Boolean).length);
    }
    const all = toFlags({ A: true, B: true, C: true });
    expect(gateIsOpen(all)).toBe(false); // flag gerbang belum di-commit
    expect(gateNeedsOpening(all)).toBe(true);
    expect(gateNeedsOpening({ ...all, [C3.gateOpen]: true })).toBe(false);
    expect(gateIsOpen({ [C3.gateOpen]: true })).toBe(false); // flag gerbang saja (rusak/cheat) tidak membuka
  });
  it('A dan B boleh diselesaikan dalam urutan apa pun sebelum C', () => {
    for (const order of [['A', 'B'], ['B', 'A']] as const) {
      const s = new TemplePuzzleSession(), f = noFlags();
      for (const p of order) (p === 'A' ? solveA : solveB)(f, s);
      expect(cUnlocked(f)).toBe(true);
      solveC(f, s);
      expect(allSolved(f)).toBe(true);
    }
  });
  it('puzzleOf hanya mengenali id teka-teki', () => {
    expect(puzzleOf('a_pillar_2')).toBe('A'); expect(puzzleOf('b_disc_1')).toBe('B'); expect(puzzleOf('c_dial_m')).toBe('C');
    expect(puzzleOf('temple_camp')).toBeNull();
    expect(activate('temple_camp', {}, new TemplePuzzleSession())).toEqual({ kind: 'ignored' });
  });
  it('arah alas di data adalah 0..3', () => {
    for (const id of DIAL_IDS) for (const v of [DIAL_START[id], DIAL_TARGET[id]] as Dir[]) expect([0, 1, 2, 3]).toContain(v);
  });
});
