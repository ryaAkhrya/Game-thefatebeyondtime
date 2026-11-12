import { describe, expect, it } from 'vitest';
import { BattleSession, REVIVE_FRACTION } from '../../src/game/combat/BattleSession';
import { enemyAI } from '../../src/game/combat/BattleEngine';
import { AEGIS_TRIAL_REWARD, FORTRESS_COURT_REWARD, FORTRESS_GUARD_REWARD, FORTRESS_HALL_REWARD, FORTRESS_RIFT_REWARD, VARLGRIM_REWARD } from '../../src/game/rpg/chapter4Rewards';
import { memberVitals } from '../../src/game/rpg/vitals';
import { effectiveStats } from '../../src/game/rpg/progression';
import { AEGIS_COMMAND, C4, C4_ENCOUNTERS, type C4EncounterId } from '../../src/game/story/chapter4Flags';
import { GameState, storyBeatFor, type GameStateData } from '../../src/game/systems/GameState';
import { chapter3End, chapter4From } from './helpers/progression';
import { actorOf as _unused, bossAct, doTurn, playC4, recklessC4 } from './helpers/chapter4';
void _unused;

/** Bab IV pada saat Varlgrim: semua encounter benteng selesai, Perlindungan dipelajari dan diuji, checkpoint dan konfrontasi selesai. */
function preBoss(mutate?: (d: GameStateData) => void): GameStateData {
  const d = chapter4From(chapter3End(), { court: true, hall: true, guard: true, rift: true, aegis: true });
  d.flags[C4.checkpoint] = true; d.flags[C4.confront] = true;
  d.storyBeat = storyBeatFor(d.flags);
  const y = effectiveStats(d, 'C01'), v = effectiveStats(d, 'C02');
  d.vitals = { hp: y.HP, mp: y.MP }; d.partyVitals = { ...d.partyVitals!, C02: { hp: v.HP, mp: v.MP } };
  mutate?.(d);
  return d;
}
/** Bab IV sebelum encounter benteng apa pun, Perlindungan sudah dipelajari. */
function earlyFortress(): GameStateData {
  const d = chapter4From(chapter3End(), { aegis: false }); d.flags[C4.aegisLearned] = true; d.storyBeat = storyBeatFor(d.flags);
  return d;
}
const session = (encounter: C4EncounterId, d: GameStateData = preBoss()): { gs: GameState; s: BattleSession } => {
  const gs = new GameState(); gs.load(d); return { gs, s: new BattleSession(gs, encounter) };
};
const win = (s: BattleSession) => { const st = s.engine.snapshot(); for (const a of st.actors) if (a.side === 'enemy') a.hp = 0; st.outcome = 'victory'; s.engine.restore(st); };
/** Pemain hanya bertahan: kalah di meteor pertama (tanpa Perlindungan). */
function loseVarlgrim(s: BattleSession): void {
  const st = s.engine.snapshot(); const b = st.actors.find(a => a.id === 'C04')!; b.hp = Math.floor(b.stats.HP * 0.3); s.engine.restore(st);
  for (let i = 0; i < 80 && !s.engine.snapshot().outcome; i++) { if (s.engine.current.side === 'enemy') bossAct(s.engine); else doTurn(s.engine, 'defend'); }
  expect(s.engine.snapshot().outcome).toBe('defeat');
}

describe('BattleSession Bab IV: syarat dan komposisi', () => {
  it('tepat enam encounter C4, semua ditolak di luar Bab IV/benteng dan tanpa Velthia', () => {
    expect([...C4_ENCOUNTERS].sort()).toEqual(['fortress_aegis_trial', 'fortress_gravorn', 'fortress_guardpost', 'fortress_rift', 'fortress_riftborn', 'varlgrim']);
    for (const enc of C4_ENCOUNTERS) {
      const gs3 = new GameState(); gs3.load(chapter3End()); expect(() => new BattleSession(gs3, enc), enc).toThrow(/Chapter IV battle/);
      // flag C4.entered hilang membuat save tidak sah; uji lewat snapshot langsung
      const gs = new GameState(); gs.load(preBoss()); const snap = gs.snapshot()!; snap.flags[C4.entered] = false;
      const fake = { snapshot: () => snap } as unknown as GameState;
      expect(() => new BattleSession(fake, enc), enc).toThrow(/Chapter IV battle/);
    }
  });
  it('varlgrim butuh checkpoint dan konfrontasi; uji Perlindungan butuh Perlindungan dipelajari', () => {
    const noCp = chapter4From(chapter3End(), { aegis: true }); const g1 = new GameState(); g1.load(noCp);
    expect(() => new BattleSession(g1, 'varlgrim')).toThrow(/checkpoint/);
    const d = preBoss(); const snap = structuredClone(d); snap.flags[C4.aegisLearned] = false;
    expect(() => new BattleSession({ snapshot: () => snap } as unknown as GameState, 'fortress_aegis_trial')).toThrow(/Aegis/);
  });
  it('Varlgrim: aktor C04, Velthia membawa velthia_aegis (dibuka flag, bukan level) dengan muatan penuh; Yaric tidak', () => {
    const { s } = session('varlgrim');
    const st = s.engine.snapshot();
    expect(st.actors.map(a => a.id).sort()).toEqual(['C01', 'C02', 'C04']);
    const v = st.actors.find(a => a.id === 'C02')!;
    expect(v.skills).toContain(AEGIS_COMMAND); expect(v.aegis).toBe(1); expect(st.actors.find(a => a.id === 'C01')!.skills).not.toContain(AEGIS_COMMAND);
    expect(st.meteor).toMatchObject({ open: false }); expect(st.revivePotion).toBe(true); expect(st.allowRun).toBe(false);
    expect(st.actors.find(a => a.id === 'C04')).toMatchObject({ intent: 'keeper_stance', phase: 1, name: 'Varlgrim' });
    expect(s.enemyIds).toEqual(['C04']);
  });
  it('encounter lain: komposisi musuh, Penguji letal, Perlindungan tersedia tetapi tanpa muatan di luar uji', () => {
    const d = earlyFortress();
    const comp: Record<string, string[]> = { fortress_riftborn: ['M06'], fortress_gravorn: ['M04'], fortress_guardpost: ['M05', 'M06'], fortress_rift: ['M04', 'M06'], fortress_aegis_trial: ['M06'] };
    for (const [enc, ids] of Object.entries(comp)) {
      const { s } = session(enc as C4EncounterId, d);
      expect(s.engine.snapshot().actors.filter(a => a.side === 'enemy').map(a => a.id), enc).toEqual(ids);
      const v = s.engine.snapshot().actors.find(a => a.id === 'C02')!;
      expect(v.skills, enc).toContain(AEGIS_COMMAND);
      expect(v.aegis, enc).toBe(enc === 'fortress_aegis_trial' ? 1 : undefined);
    }
    const trial = session('fortress_aegis_trial', d).s.engine.snapshot().actors.find(a => a.id === 'M06')!;
    expect(trial).toMatchObject({ lethalSurge: true, intent: 'rift_gather' });
    expect(session('fortress_riftborn', d).s.engine.snapshot().actors.find(a => a.id === 'M06')!.lethalSurge).toBeUndefined();
    expect(session('fortress_aegis_trial', d).s.engine.snapshot().meteor).toBeDefined(); expect(session('fortress_gravorn', d).s.engine.snapshot().meteor).toBeUndefined();
  });
  it('stat pertemuan mengikuti stat efektif save (level dan perlengkapan), bukan angka beku', () => {
    const d = preBoss(); const { s } = session('varlgrim', d);
    const st = s.engine.snapshot();
    expect(st.actors.find(a => a.id === 'C01')!.stats).toEqual(effectiveStats(d, 'C01')); expect(st.actors.find(a => a.id === 'C02')!.stats).toEqual(effectiveStats(d, 'C02'));
    expect(d.rpg.characters.C01!.level).toBeGreaterThanOrEqual(8); // jalur penuh benteng
  });
  it('anggota 0 HP pada save dibangkitkan 25% saat masuk (tidak menjebak)', () => {
    const d = preBoss(x => { x.vitals = { hp: 0, mp: 0 }; x.partyVitals!.C02 = { hp: 0, mp: 0 }; });
    const { s } = session('varlgrim', d); const st = s.engine.snapshot();
    for (const id of ['C01', 'C02']) { const a = st.actors.find(x => x.id === id)!; expect(a.hp).toBe(Math.max(1, Math.ceil(a.stats.HP * REVIVE_FRACTION))); }
  });
  it('encounter ID Bab IV dipetakan ke flag selesai dan hadiah yang benar', () => {
    const d = earlyFortress();
    const map: [C4EncounterId, string, { id: string }][] = [['fortress_riftborn', C4.fightCourt, FORTRESS_COURT_REWARD], ['fortress_gravorn', C4.fightHall, FORTRESS_HALL_REWARD], ['fortress_guardpost', C4.fightGuard, FORTRESS_GUARD_REWARD],
      ['fortress_rift', C4.fightRift, FORTRESS_RIFT_REWARD], ['fortress_aegis_trial', C4.aegisTrial, AEGIS_TRIAL_REWARD]];
    for (const [enc, flag, reward] of map) {
      const { gs, s } = session(enc, d); expect(s.completionFlag).toBe(flag);
      win(s); expect(s.commitVictory(), enc).toBe(true);
      expect(gs.hasFlag(flag)).toBe(true); expect(gs.hasFlag(reward.id)).toBe(true);
      expect(s.commitVictory(), `${enc} kedua kali`).toBe(false);
    }
    expect(session('varlgrim').s.completionFlag).toBe(C4.varlgrim);
  });
});

describe('BattleSession Bab IV: kemenangan, retry, tanpa hadiah ganda', () => {
  it('commitVictory Varlgrim sekali: flag boss, hadiah (EXP/emas/item) satu kali, yang tumbang bangkit 25%, save sah', () => {
    const d = preBoss(x => { x.partyVitals!.C02 = { hp: 0, mp: 3 }; });
    const gs = new GameState(); gs.load(d);
    const s = new BattleSession(gs, 'varlgrim'); // masuk: Velthia dibangkitkan; kita buat ia tumbang lagi sebelum menang
    const st = s.engine.snapshot(); st.actors.find(a => a.id === 'C02')!.hp = 0; st.actors.find(a => a.id === 'C04')!.hp = 0; st.outcome = 'victory'; s.engine.restore(st);
    const exp0 = d.rpg.characters.C01!.exp, gold0 = d.rpg.gold, potions0 = d.items.potion ?? 0;
    expect(s.commitVictory()).toBe(true);
    const after = gs.snapshot()!;
    expect(after.flags[C4.varlgrim]).toBe(true); expect(after.flags[VARLGRIM_REWARD.id]).toBe(true);
    expect(after.rpg.characters.C01!.exp).toBe(exp0 + VARLGRIM_REWARD.exp); expect(after.rpg.gold).toBe(gold0 + VARLGRIM_REWARD.gold);
    expect(after.items.potion).toBe(potions0 + (VARLGRIM_REWARD.items!.potion ?? 0));
    const v = memberVitals(after, 'C02')!; expect(v.hp).toBeGreaterThanOrEqual(1);
    expect(after.storyBeat).toBe(storyBeatFor(after.flags));
    expect(s.commitVictory()).toBe(false);
    const again = new BattleSession(gs, 'varlgrim'); win(again); expect(again.commitVictory()).toBe(false); // flag boss: tidak ada hadiah ganda
    expect(gs.snapshot()!.rpg.characters.C01!.exp).toBe(exp0 + VARLGRIM_REWARD.exp);
  });
  it('retry() hanya sesudah kekalahan; memulihkan checkpoint penuh dengan muatan Perlindungan penuh; berulang kali tanpa hadiah ganda', () => {
    const d = preBoss(); const { gs, s } = session('varlgrim', d);
    expect(s.retry()).toBe(false); // belum kalah
    const before = JSON.stringify(gs.snapshot());
    for (let k = 0; k < 3; k++) {
      loseVarlgrim(s);
      expect(s.retry()).toBe(true);
      const st = s.engine.snapshot();
      expect(st.outcome).toBeNull(); expect(st.actors.find(a => a.id === 'C02')!.aegis).toBe(1); expect(st.actors.find(a => a.id === 'C04')!.phase).toBe(1);
      expect(st.meteor).toMatchObject({ open: false, falls: 0 });
      for (const a of st.actors.filter(x => x.side === 'player')) expect(a.hp).toBe(Math.max(1, Math.min(a.stats.HP, a.hp)));
      expect(gs.hasFlag(C4.varlgrim)).toBe(false); expect(gs.hasFlag(VARLGRIM_REWARD.id)).toBe(false);
      expect(JSON.stringify(gs.snapshot())).toBe(before);
    }
    win(s); expect(s.commitVictory()).toBe(true);
    expect(s.retry()).toBe(false); // sudah menang
    const after = gs.snapshot()!;
    expect(after.rpg.characters.C01!.exp).toBe(d.rpg.characters.C01!.exp + VARLGRIM_REWARD.exp);
  });
  it('retryFromPhase(): ulang dari awal fase meteor tanpa menyentuh game state; tidak tersedia sebelum fase 3 tercapai', () => {
    const d = preBoss(); const { gs, s } = session('varlgrim', d);
    // kalah di fase 1: tidak ada snapshot fase 3
    const st0 = s.engine.snapshot(); for (const a of st0.actors) if (a.side === 'player') a.hp = 0; st0.actors.find(a => a.id === 'C01')!.hp = 0; st0.outcome = 'defeat'; s.engine.restore(st0);
    expect(s.canRetryFromPhase).toBe(false); expect(s.retryFromPhase()).toBe(false);
    expect(s.retry()).toBe(true);
    const before = JSON.stringify(gs.snapshot());
    loseVarlgrim(s); // melewati fase 3 lalu kalah oleh meteor tanpa Perlindungan
    expect(s.canRetryFromPhase).toBe(true);
    expect(s.retryFromPhase()).toBe(true);
    const st = s.engine.snapshot();
    expect(st.outcome).toBeNull(); expect(st.actors.find(a => a.id === 'C04')).toMatchObject({ phase: 3, intent: 'phase_shift' });
    expect(JSON.stringify(gs.snapshot())).toBe(before); // tanpa penyimpanan, tanpa hadiah
    expect(gs.hasFlag(VARLGRIM_REWARD.id)).toBe(false);
    // dari sana: bertahan dari meteor dengan Perlindungan, lalu menang -> hadiah satu kali
    for (let i = 0; i < 60 && !st.outcome; i++) {
      const e = s.engine; if (e.snapshot().outcome) break;
      if (e.current.side === 'enemy') { bossAct(e); if (e.snapshot().meteor!.falls > 0) break; continue; }
      doTurn(e, e.current.id === 'C02' && e.unavailable(AEGIS_COMMAND) === null && e.snapshot().meteor!.open ? AEGIS_COMMAND : 'defend');
    }
    expect(s.engine.snapshot().outcome).toBeNull(); expect(s.engine.snapshot().meteor!.falls).toBeGreaterThanOrEqual(1);
    win(s); expect(s.commitVictory()).toBe(true); expect(s.commitVictory()).toBe(false);
    expect(s.canRetryFromPhase).toBe(false);
  });
  it('kekalahan berulang (retry penuh dan retryFromPhase bergantian) tidak pernah menggandakan hadiah atau mengubah save', () => {
    const d = preBoss(); const { gs, s } = session('varlgrim', d);
    const before = JSON.stringify(gs.snapshot());
    for (let k = 0; k < 4; k++) {
      loseVarlgrim(s);
      if (k % 2 === 0) { expect(s.retryFromPhase()).toBe(true); const e = s.engine; for (let i = 0; i < 40 && !e.snapshot().outcome; i++) { if (e.current.side === 'enemy') bossAct(e); else doTurn(e, 'defend'); } expect(e.snapshot().outcome).toBe('defeat'); expect(s.retry()).toBe(true); }
      else expect(s.retry()).toBe(true);
      expect(JSON.stringify(gs.snapshot())).toBe(before);
    }
  });
  it('simulasi penuh melalui sesi (pemain reckless) berakhir defeat sah, bukan macet', () => {
    const { s } = session('varlgrim');
    const r = playC4(s.engine, recklessC4);
    expect(r.outcome).toBe('defeat'); expect(r.meteors).toBeLessThanOrEqual(1);
    expect(enemyAI(s.engine.snapshot().actors.find(a => a.id === 'C04')!)).toBeDefined();
  });
});
