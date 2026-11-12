import { describe, expect, it } from 'vitest';
import { C4 } from '../../src/game/story/chapter4Flags';
import { FORT } from '../../src/game/story/c4/fortressFlags';
import {
  ANCHOR_EFFECT, ANCHOR_IDS, FortressPuzzleSession, RIFT_INITIAL, SEAL_ORDER, activeBlockers, anchorPressed, anchorTouch, litSeals, riftBits, sealActivate,
  solvableFrom, type AnchorId, type RiftBits,
} from '../../src/game/world/fortressPuzzle';

const perms = <T>(a: readonly T[]): T[][] => (a.length <= 1 ? [[...a]] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));

describe('Teka-teki 1: Urutan Segel Jaga', () => {
  it('urutan benar (Fajar, Siang, Senja, Malam) menyelesaikan; progres dihitung per langkah', () => {
    const s = new FortressPuzzleSession();
    const out = SEAL_ORDER.map((id) => sealActivate(id, {}, s));
    expect(out.map((o) => o.kind)).toEqual(['progress', 'progress', 'progress', 'solved']);
    expect(out[0]).toMatchObject({ step: 1, total: 4 });
    expect(s.sealProgress).toEqual([]); // sesi dibersihkan saat selesai; keadaan selesai hidup di flag
  });

  it('dari 24 permutasi hanya satu yang menyelesaikan; setiap salah mereset aman dan dapat dicoba lagi', () => {
    let solved = 0;
    for (const order of perms(SEAL_ORDER)) {
      const s = new FortressPuzzleSession();
      let last = '';
      for (const id of order) {
        const r = sealActivate(id, {}, s);
        last = r.kind;
        if (r.kind === 'wrong') { expect(s.sealProgress).toEqual([]); break; }
      }
      if (last === 'solved') solved++;
      // tidak terkunci: setelah apa pun, urutan benar tetap dapat diselesaikan
      const out = SEAL_ORDER.map((id) => sealActivate(id, {}, s).kind);
      expect(out[3]).toBe('solved');
    }
    expect(solved).toBe(1);
  });

  it('salah di tengah (mis. Siang lebih dulu) membawa jumlah langkah yang sudah benar', () => {
    const s = new FortressPuzzleSession();
    expect(sealActivate('seal_noon', {}, s)).toMatchObject({ kind: 'wrong', had: 0 });
    sealActivate('seal_dawn', {}, s); sealActivate('seal_noon', {}, s);
    expect(sealActivate('seal_night', {}, s)).toMatchObject({ kind: 'wrong', had: 2 });
    expect(s.sealProgress).toEqual([]);
  });

  it('idempoten dan tahan flag: sesudah selesai selalu `already`, id tak dikenal diabaikan, pemulihan dari flag menyalakan semua pilar', () => {
    const s = new FortressPuzzleSession();
    const f = { [FORT.sealsSolved]: true };
    expect(sealActivate('seal_dusk', f, s)).toEqual({ kind: 'already' });
    expect(s.sealProgress).toEqual([]);
    expect(sealActivate('bukan_segel', {}, s)).toEqual({ kind: 'ignored' });
    expect(litSeals(f, s)).toEqual([...SEAL_ORDER]);
    sealActivate('seal_dawn', {}, s);
    expect(litSeals({}, s)).toEqual(['seal_dawn']);
    s.reset();
    expect(litSeals({}, s)).toEqual([]); // memuat ulang = mulai dari awal (aman)
  });
});

describe('Teka-teki 2: Jangkar Retakan', () => {
  const state = (s: FortressPuzzleSession): string => s.rift.map((b) => (b ? 1 : 0)).join('');

  it('keadaan awal: S1 dan S3 bergeser; A lalu B atau B lalu A menyelesaikan (urutan tidak penting)', () => {
    expect(RIFT_INITIAL).toEqual([true, false, true]);
    for (const order of [['anchor_a', 'anchor_b'], ['anchor_b', 'anchor_a']] as const) {
      const s = new FortressPuzzleSession();
      const r1 = anchorTouch(order[0], {}, s);
      expect(r1.kind).toBe('toggle');
      const r2 = anchorTouch(order[1], {}, s);
      expect(r2.kind).toBe('solved');
      expect(state(s)).toBe('000');
    }
  });

  it('setiap sentuhan dapat dibalik (tidak pernah terkunci): dua sentuhan yang sama kembali ke keadaan awal', () => {
    const s = new FortressPuzzleSession();
    for (const a of ANCHOR_IDS) { anchorTouch(a, {}, s); anchorTouch(a, {}, s); expect(state(s)).toBe('101'); }
    expect(s.pressed).toEqual({ anchor_a: 2, anchor_b: 2 });
  });

  it('semua keadaan yang dapat dicapai dari keadaan awal dapat diselesaikan; jalan acak panjang tidak pernah buntu', () => {
    const seen = new Set<string>();
    const q: RiftBits[] = [RIFT_INITIAL];
    while (q.length) {
      const b = q.pop()!;
      const k = b.map((x) => (x ? 1 : 0)).join('');
      if (seen.has(k)) continue;
      seen.add(k);
      expect(solvableFrom(b), k).toBe(true);
      for (const a of ANCHOR_IDS) { const n = [...b] as [boolean, boolean, boolean]; for (const i of ANCHOR_EFFECT[a]) n[i] = !n[i]; q.push(n); }
    }
    expect(seen.size).toBe(4);
    // urutan sentuhan deterministik bergantian panjang, lalu satu langkah penyelesaian tetap ada
    const s = new FortressPuzzleSession();
    for (let i = 0; i < 25; i++) anchorTouch(ANCHOR_IDS[(i * 7 + 3) % 2]!, {}, s);
    const rest = ANCHOR_IDS.map((a): AnchorId => a).filter((a) => s.pressed[a] % 2 === 0);
    for (const a of rest) anchorTouch(a, {}, s);
    expect(state(s)).toBe('000');
  });

  it('idempoten setelah selesai: `already` tanpa mengubah sesi; keadaan dari flag = semua sejajar', () => {
    const s = new FortressPuzzleSession();
    const f = { [FORT.riftAligned]: true };
    expect(anchorTouch('anchor_a', f, s)).toEqual({ kind: 'already' });
    expect(state(s)).toBe('101');
    expect(riftBits(f, s)).toEqual([false, false, false]);
    expect(anchorPressed(f, s, 'anchor_a')).toBe(true);
    expect(anchorTouch('x', {}, s)).toEqual({ kind: 'ignored' });
    anchorTouch('anchor_a', {}, s);
    expect(anchorPressed({}, s, 'anchor_a')).toBe(true);
    expect(anchorPressed({}, s, 'anchor_b')).toBe(false);
  });
});

describe('Penghalang dinamis diturunkan dari flag + sesi', () => {
  it('keadaan awal: semua pintu menutup dan slab S1/S3 menutup; restore dari flag melepaskannya satu per satu', () => {
    const s = new FortressPuzzleSession();
    expect([...activeBlockers({}, s)].sort()).toEqual(['door_echo', 'door_heart', 'door_seal', 'door_shortcut', 'door_trial', 'slab_1', 'slab_3']);
    expect(activeBlockers({ [C4.aegisLearned]: true }, s).has('door_trial')).toBe(false);
    expect(activeBlockers({ [FORT.sealsSolved]: true }, s).has('door_seal')).toBe(false);
    expect(activeBlockers({ [FORT.shortcutOpen]: true }, s).has('door_shortcut')).toBe(false);
    expect(activeBlockers({ [C4.checkpoint]: true }, s).has('door_heart')).toBe(false);
    expect(activeBlockers({ [C4.heartOpen]: true }, s).has('door_echo')).toBe(false);
    const solved = activeBlockers({ [FORT.riftAligned]: true }, s);
    expect([...solved].filter((k) => k.startsWith('slab'))).toEqual([]);
    // sesi mengubah slab sementara (tanpa flag)
    anchorTouch('anchor_a', {}, s);
    expect([...activeBlockers({}, s)].filter((k) => k.startsWith('slab')).sort()).toEqual(['slab_2', 'slab_3']);
  });
});
