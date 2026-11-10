import { describe, expect, it } from 'vitest';
import { ALL_CHAPTER1_SCRIPTS } from '../../src/game/dialogue/chapter1';
import type { DialogueLine } from '../../src/game/dialogue/types';
import { Chapter1Story, FLAG, ITEM_POTION, TEXT, type StoryAction, type StoryContext } from '../../src/game/story/Chapter1Story';
import { GameState } from '../../src/game/systems/GameState';

/** Menjalankan StoryAction seperti WorldScene (dialog dianggap selesai), dan merekam jejak. */
function run(state: GameState, actions: readonly StoryAction[], trace: string[] = []): string[] {
  for (const a of actions) {
    switch (a.type) {
      case 'dialogue':
        trace.push(`D:${a.script.id}`);
        break;
      case 'setFlag':
        state.setFlag(a.flag);
        trace.push(`F:${a.flag}`);
        break;
      case 'giveItem':
        if (!state.hasFlag(FLAG.chestReward)) {
          state.addItem(a.item, a.count);
          state.setFlag(FLAG.chestReward);
        }
        trace.push(`I:${a.item}`);
        break;
      case 'toast':
        trace.push(`T:${a.text}`);
        break;
      default:
        trace.push(a.type);
    }
  }
  return trace;
}

function fresh() {
  const state = new GameState();
  state.startNewGame();
  const story = new Chapter1Story(state);
  const ctx = (extra: Partial<StoryContext> = {}): StoryContext => ({ wrapCount: 0, ...extra });
  return { state, story, ctx };
}

function completeC101(s: ReturnType<typeof fresh>): void {
  run(s.state, s.story.onStart());
  run(s.state, s.story.interact('ground_tracks', s.ctx()));
  run(s.state, s.story.interact('sword', s.ctx()));
}

describe('C1-01 — Yaric terbangun', () => {
  it('intro dimainkan sekali; ulang tidak mengulang', () => {
    const { state, story } = fresh();
    expect(story.objective()).toBeNull();
    const first = story.onStart();
    expect(first.map((a) => a.type)).toEqual(['dialogue', 'setFlag', 'objective']);
    run(state, first);
    expect(story.onStart()).toEqual([]); // idempoten
    expect(story.objective()).toBe('Periksa sekitar (0/2)');
  });

  it('flag story.c1_awake HANYA setelah dua objek diperiksa, dan setelah dialognya (urutan aksi)', () => {
    const s = fresh();
    run(s.state, s.story.onStart());
    const a1 = s.story.interact('ground_tracks', s.ctx());
    expect(a1.some((a) => a.type === 'setFlag' && a.flag === FLAG.awake)).toBe(false);
    run(s.state, a1);
    expect(s.state.hasFlag(FLAG.awake)).toBe(false);
    expect(s.story.objective()).toBe('Periksa sekitar (1/2)');

    const a2 = s.story.interact('sword', s.ctx());
    const types = a2.map((a) => (a.type === 'setFlag' ? `F:${a.flag}` : a.type === 'dialogue' ? `D:${a.script.id}` : a.type));
    // dialog pedang -> flag pedang -> objective -> jurnal -> flag awake
    expect(types.indexOf(`D:C1-01-EXAMINE-SWORD`)).toBeLessThan(types.indexOf(`F:${FLAG.examinedSword}`));
    expect(types.indexOf('D:C1-01-JOURNAL')).toBeLessThan(types.indexOf(`F:${FLAG.awake}`));
    run(s.state, a2);
    expect(s.state.hasFlag(FLAG.awake)).toBe(true);
    expect(s.story.objective()).toBe('Cari jalan keluar dari hutan.');
  });

  it('memeriksa objek lagi tidak menggandakan flag/jurnal', () => {
    const s = fresh();
    completeC101(s);
    const again = s.story.interact('sword', s.ctx());
    expect(again.map((a) => a.type)).toEqual(['dialogue']);
    const again2 = s.story.interact('ground_tracks', s.ctx());
    expect(again2.map((a) => a.type)).toEqual(['dialogue']);
  });

  it('urutan periksa dibalik (pedang dulu) tetap selesai', () => {
    const s = fresh();
    run(s.state, s.story.onStart());
    run(s.state, s.story.interact('sword', s.ctx()));
    run(s.state, s.story.interact('ground_tracks', s.ctx()));
    expect(s.state.hasFlag(FLAG.awake)).toBe(true);
  });

  it('gerbang: petunjuk hanya sebelum awake', () => {
    const s = fresh();
    expect(s.story.trigger('gate_hint', s.ctx())).toEqual([{ type: 'toast', text: TEXT.gateHint }]);
    completeC101(s);
    expect(s.story.trigger('gate_hint', s.ctx())).toEqual([]);
  });
});

describe('C1-02 — Nambo', () => {
  it('tidak bisa dimulai sebelum C1-01 selesai (zona maupun bicara)', () => {
    const s = fresh();
    expect(s.story.trigger('nambo_zone', s.ctx())).toEqual([]);
    expect(s.story.interact('nambo', s.ctx())).toEqual([]);
  });

  it('terpicu otomatis di zona; flag story.c1_nambo hanya setelah seluruh dialog', () => {
    const s = fresh();
    completeC101(s);
    const acts = s.story.trigger('nambo_zone', s.ctx());
    const types = acts.map((a) => (a.type === 'setFlag' ? 'F' : a.type === 'dialogue' ? 'D' : a.type === 'npc' ? `N:${a.op}` : a.type));
    expect(types).toEqual(['N:face_player', 'D', 'F', 'N:step_aside', 'objective']);
    expect(s.state.hasFlag(FLAG.nambo)).toBe(false); // belum dijalankan
    run(s.state, acts);
    expect(s.state.hasFlag(FLAG.nambo)).toBe(true);
    expect(s.story.objective()).toBe('Ikuti jalan sampai gerbang batu.');
  });

  it('tidak terpicu dua kali (zona dan bicara memutar ulang baris lama saja)', () => {
    const s = fresh();
    completeC101(s);
    run(s.state, s.story.trigger('nambo_zone', s.ctx()));
    expect(s.story.trigger('nambo_zone', s.ctx())).toEqual([]);
    const again = s.story.interact('nambo', s.ctx());
    expect(again).toHaveLength(1);
    const a = again[0]!;
    expect(a.type).toBe('dialogue');
    if (a.type === 'dialogue') {
      expect(a.script.id).toBe('C1-02-REPEAT');
      expect(a.script.nodes.every((n) => n.type === 'line' && n.source === 'REUSE')).toBe(true);
    }
  });
});

describe('C1-03 — jalur hutan berulang', () => {
  it('papan pertama: hanya membaca "Aveloria — terus ke timur."', () => {
    const s = fresh();
    completeC101(s);
    const a = s.story.interact('sign#0', s.ctx());
    expect(run(s.state, a)).toEqual(['D:C1-03-SIGN-FIRST', `F:${FLAG.signRead}`]);
    expect(s.state.hasFlag(FLAG.loopNoticed)).toBe(false);
  });

  it('membaca papan salinan pertama lagi tidak memicu pengulangan', () => {
    const s = fresh();
    completeC101(s);
    run(s.state, s.story.interact('sign#0', s.ctx()));
    expect(run(s.state, s.story.interact('sign#0', s.ctx()))).toEqual(['D:C1-03-SIGN-FIRST']);
    expect(s.state.hasFlag(FLAG.loopNoticed)).toBe(false);
  });

  it('papan salinan 1 (atau setelah tergeser) = "Papan yang tadi?" -> membuka semak, flag progres', () => {
    const s = fresh();
    completeC101(s);
    run(s.state, s.story.interact('sign#0', s.ctx()));
    const trace = run(s.state, s.story.interact('sign#1', s.ctx({ copy: 1 })));
    expect(trace).toEqual(['D:C1-03-SIGN-REPEAT', `F:${FLAG.loopNoticed}`, 'openThicket', `T:${TEXT.thicketOpened}`]);
    expect(s.state.hasFlag(FLAG.loopNoticed)).toBe(true);
    // kasus lain: tergeser balik di salinan 0
    const t = fresh();
    completeC101(t);
    run(t.state, t.story.interact('sign#0', t.ctx()));
    expect(run(t.state, t.story.interact('sign#0', t.ctx({ wrapCount: 1 })))).toContain('openThicket');
  });

  it('belum membaca papan sama sekali lalu tiba di salinan 1: baris pertama + pengulangan (urutan terjaga)', () => {
    const s = fresh();
    completeC101(s);
    const trace = run(s.state, s.story.interact('sign#1', s.ctx({ copy: 1 })));
    expect(trace.slice(0, 3)).toEqual(['D:C1-03-SIGN-FIRST', `F:${FLAG.signRead}`, 'D:C1-03-SIGN-REPEAT']);
  });

  it('semak berduri: menghalangi dengan pesan sebelum disadari, tidak ada aksi sesudahnya', () => {
    const s = fresh();
    completeC101(s);
    expect(s.story.interact('thicket#0', s.ctx())).toEqual([{ type: 'toast', text: TEXT.thicketBlocked }]);
    run(s.state, s.story.interact('sign#1', s.ctx({ copy: 1 })));
    expect(s.story.interact('thicket#0', s.ctx())).toEqual([]);
  });

  it('story.c1_loop hanya saat memasuki jalan setapak SETELAH pengulangan disadari; sekali saja', () => {
    const s = fresh();
    completeC101(s);
    expect(s.story.trigger('trail_enter#0', s.ctx())).toEqual([]);
    run(s.state, s.story.interact('sign#1', s.ctx({ copy: 1 })));
    const acts = s.story.trigger('trail_enter#0', s.ctx());
    expect(acts.map((a) => a.type)).toEqual(['setFlag', 'objective']);
    run(s.state, acts);
    expect(s.state.hasFlag(FLAG.loop)).toBe(true);
    expect(s.story.trigger('trail_enter#0', s.ctx())).toEqual([]);
  });

  it('peti: tidak bisa dibuka sebelum jalan terbuka; hadiah Potion tepat SEKALI', () => {
    const s = fresh();
    completeC101(s);
    expect(s.story.interact('chest#0', s.ctx())).toEqual([]);
    run(s.state, s.story.interact('sign#1', s.ctx({ copy: 1 })));
    const first = s.story.interact('chest#0', s.ctx());
    expect(first.map((a) => a.type)).toEqual(['openChest', 'giveItem', 'dialogue']);
    run(s.state, first);
    expect(s.state.itemCount(ITEM_POTION)).toBe(1);
    // memeriksa lagi dan dari salinan lain: "Sudah kosong."
    for (const id of ['chest#0', 'chest#1']) {
      const again = s.story.interact(id, s.ctx());
      expect(again.map((a) => a.type)).toEqual(['dialogue']);
      run(s.state, again);
    }
    expect(s.state.itemCount(ITEM_POTION)).toBe(1);
    // bahkan jika giveItem dipaksa dijalankan ulang, flag reward mencegah ganda
    run(s.state, [{ type: 'giveItem', item: ITEM_POTION, count: 1 }]);
    expect(s.state.itemCount(ITEM_POTION)).toBe(1);
  });

  it('C1-04 replaces demo end only after Nambo and loop; victory prevents retrigger', () => {
    const s = fresh();
    completeC101(s);
    expect(s.story.trigger('demo_end#0', s.ctx())).toEqual([]);
    run(s.state, s.story.interact('sign#1', s.ctx({ copy: 1 })));
    run(s.state, s.story.trigger('trail_enter#0', s.ctx()));
    expect(s.story.trigger('demo_end#0', s.ctx())).toEqual([]); // cannot skip Nambo
    run(s.state, s.story.trigger('nambo_zone', s.ctx()));
    const end = s.story.trigger('demo_end#0', s.ctx());
    expect(end.map((a) => a.type)).toEqual(['dialogue', 'battle']);
    expect(s.state.hasFlag(FLAG.hollowling)).toBe(false); // entry is not victory
    s.state.setFlag(FLAG.hollowling);
    expect(s.story.trigger('demo_end#0', s.ctx())).toEqual([]);
    const post = s.story.onStart();
    expect(post.map(a => a.type)).toEqual(['dialogue', 'setFlag', 'objective']);
    run(s.state, post);
    expect(s.story.onStart()).toEqual([]);
    expect(s.story.objective()).toBe('Lanjutkan lewat ujung jalan utara.');
  });
});

describe('Alur lengkap dan batas cakupan', () => {
  it('jalur pemain normal menyelesaikan C1-01, C1-02, C1-03 dengan flag kanonik', () => {
    const s = fresh();
    completeC101(s);
    run(s.state, s.story.trigger('nambo_zone', s.ctx()));
    run(s.state, s.story.interact('sign#0', s.ctx()));
    run(s.state, s.story.interact('sign#1', s.ctx({ copy: 1 })));
    run(s.state, s.story.trigger('trail_enter#0', s.ctx()));
    run(s.state, s.story.interact('chest#0', s.ctx()));
    for (const f of [FLAG.awake, FLAG.nambo, FLAG.loop]) expect(s.state.hasFlag(f), f).toBe(true);
    const snap = s.state.snapshot()!;
    expect(Object.keys(snap.flags).filter((k) => k.startsWith('story.')).sort()).toEqual(['story.c1_awake', 'story.c1_loop', 'story.c1_nambo']);
  });

  it('tidak ada flag cerita di luar C1-01..03 (tidak ada c1_gate/c1_archive/c1_velthia/c2..)', () => {
    const s = fresh();
    completeC101(s);
    run(s.state, s.story.trigger('nambo_zone', s.ctx()));
    run(s.state, s.story.interact('sign#1', s.ctx({ copy: 1 })));
    run(s.state, s.story.trigger('trail_enter#0', s.ctx()));
    run(s.state, s.story.trigger('demo_end#0', s.ctx()));
    const storyFlags = Object.keys(s.state.snapshot()!.flags).filter((k) => k.startsWith('story.'));
    expect(storyFlags.every((k) => ['story.c1_awake', 'story.c1_nambo', 'story.c1_loop'].includes(k))).toBe(true);
  });

  it('semua ID dialog yang dipakai adalah C1-01..03 dan tidak memuat battle (C1-04+)', () => {
    const ids = ALL_CHAPTER1_SCRIPTS.flatMap((sc) => sc.nodes.filter((n): n is DialogueLine => n.type === 'line').map((n) => n.id));
    expect(ids.every((id) => /^C1-0[123]-/.test(id))).toBe(true);
  });

  it('GameState: setFlag idempoten dan butuh game aktif', () => {
    const gs = new GameState();
    expect(() => gs.setFlag('x')).toThrow();
    gs.startNewGame();
    expect(gs.setFlag('x')).toBe(true);
    expect(gs.setFlag('x')).toBe(false);
    gs.addItem('potion');
    gs.addItem('potion');
    expect(gs.itemCount('potion')).toBe(2);
    gs.setPosition(10.4, 20.6, 'left', 'forest_1');
    expect(gs.snapshot()!.position).toEqual({ x: 10, y: 21, facing: 'left' });
  });
});
