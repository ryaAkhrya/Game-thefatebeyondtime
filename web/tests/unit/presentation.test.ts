import { describe, expect, it } from 'vitest';
import { GRAVORN_COMMANDS, RIFTBORN_COMMANDS, VARLGRIM_COMMANDS } from '../../src/game/story/chapter4Flags';
import { HEAVY_IMPACT_CLASSES, PHASE_ORDER, RETURN_TRANSITION, TIMELINES, TRANSITIONS, actionClassFor, effectiveHitstop, fastTimeline, impactFx, impactFxFor, presentationFor, timelineTotalMs, transitionEntryMs } from '../../src/game/combat/presentation';

describe('transisi battle: 4 kategori', () => {
  it('durasi sesuai spesifikasi: normal 0,4-0,8 s, boss lebih panjang dari normal', () => {
    expect(transitionEntryMs('normal')).toBeGreaterThanOrEqual(400);
    expect(transitionEntryMs('normal')).toBeLessThanOrEqual(800);
    expect(transitionEntryMs('boss')).toBeGreaterThan(transitionEntryMs('normal'));
    expect(transitionEntryMs('boss')).toBeLessThanOrEqual(1400); // dramatis tetapi ramah retry
    expect(transitionEntryMs('scripted')).toBeGreaterThan(transitionEntryMs('normal'));
    expect(transitionEntryMs('temporal')).toBeLessThanOrEqual(900);
    expect(RETURN_TRANSITION.coverMs + RETURN_TRANSITION.revealMs).toBeLessThanOrEqual(700);
  });
  it('hanya boss dan final yang punya plakat nama; hanya boss lama yang flashy (final tanpa denyut terang); temporal/final bergerak bertahap', () => {
    for (const k of Object.keys(TRANSITIONS) as (keyof typeof TRANSITIONS)[]) {
      expect(TRANSITIONS[k].nameplate).toBe(k === 'boss' || k === 'final');
      expect(TRANSITIONS[k].flashy).toBe(k === 'boss');
      expect(TRANSITIONS[k].sfx).toMatch(/^SFX_BATTLE_TRANSITION_/);
    }
    expect(TRANSITIONS.temporal.steps).toBeGreaterThan(0);
    expect(TRANSITIONS.normal.steps).toBe(0);
  });
  it('kategori per encounter: Hollowling pertama scripted lalu normal, boss, kuil temporal', () => {
    expect(presentationFor('hollowling', {}).kind).toBe('scripted');
    expect(presentationFor('hollowling', { 'battle.first_hollowling': true }).kind).toBe('normal');
    for (const b of ['mournfang', 'veyrath', 'chronolith']) { expect(presentationFor(b).kind).toBe('boss'); expect(presentationFor(b).bgm).toBe('BGM_BOSS'); }
    expect(presentationFor('temple_oathguard').kind).toBe('temporal');
    expect(presentationFor('forest2_patrol').kind).toBe('normal');
  });
});

describe('linimasa aksi (data-driven)', () => {
  it('serangan dasar 0,7-1,2 s, skill berat 1,2-2 s, spesial boss lebih panjang dari serangan dasar', () => {
    const basic = timelineTotalMs(TIMELINES.basic);
    expect(basic).toBeGreaterThanOrEqual(700); expect(basic).toBeLessThanOrEqual(1200);
    const heavy = timelineTotalMs(TIMELINES.heavy);
    expect(heavy).toBeGreaterThanOrEqual(1200); expect(heavy).toBeLessThanOrEqual(2000);
    expect(timelineTotalMs(TIMELINES.boss_special)).toBeGreaterThanOrEqual(basic);
    expect(timelineTotalMs(TIMELINES.boss_telegraph)).toBeGreaterThan(basic);
  });
  it('setiap kelas lengkap dan non-negatif; telegraf boss punya antisipasi panjang agar terbaca', () => {
    for (const t of Object.values(TIMELINES)) for (const p of PHASE_ORDER) { expect(Number.isFinite(t[p])).toBe(true); expect(t[p]).toBeGreaterThanOrEqual(0); }
    expect(TIMELINES.boss_telegraph.anticipation).toBeGreaterThanOrEqual(400);
    expect(TIMELINES.heavy.hitstop).toBeGreaterThan(TIMELINES.basic.hitstop);
    expect(TIMELINES.support.hitstop).toBe(0);
  });
  it('klasifikasi perintah: telegraf dan serangan boss terpisah; Velthia/Torvan sebagai magic/support', () => {
    expect(actionClassFor('attack')).toBe('basic');
    expect(actionClassFor('ground_slam')).toBe('heavy');
    expect(actionClassFor('boss_windup')).toBe('boss_telegraph');
    expect(actionClassFor('chrono_charge')).toBe('boss_telegraph');
    expect(actionClassFor('chrono_slam')).toBe('boss_special');
    expect(actionClassFor('velthia_pulse')).toBe('magic');
    expect(actionClassFor('velthia_mend')).toBe('support');
    expect(actionClassFor('tidak_dikenal')).toBe('basic');
  });
  it('Reduced Flashes mematikan kilat, Screen Shake mematikan goyang; keduanya independen', () => {
    expect(impactFx({ reducedFlashes: true, screenShake: true }, true)).toEqual({ flash: false, shake: true });
    expect(impactFx({ reducedFlashes: false, screenShake: false }, true)).toEqual({ flash: true, shake: false });
    expect(impactFx({ reducedFlashes: false, screenShake: true }, false)).toEqual({ flash: false, shake: false });
    expect(effectiveHitstop(TIMELINES.heavy, false)).toBeLessThan(effectiveHitstop(TIMELINES.heavy, true));
  });
});

describe('Phase 8: transisi final, presentasi encounter Benteng, kelas aksi Varlgrim/Perlindungan', () => {
  it('transisi final: tanpa denyut terang, plakat nama, gerak tersendat, total masuk <= 1,7 s; boss lama tidak berubah', () => {
    expect(TRANSITIONS.final).toEqual({ kind: 'final', coverMs: 900, holdMs: 760, revealMs: 640, bars: 12, steps: 4, nameplate: true, sfx: 'SFX_BATTLE_TRANSITION_FINAL', flashy: false });
    expect(transitionEntryMs('final')).toBe(1660); expect(transitionEntryMs('final')).toBeLessThanOrEqual(1700);
    expect(TRANSITIONS.boss).toEqual({ kind: 'boss', coverMs: 760, holdMs: 520, revealMs: 560, bars: 10, steps: 0, nameplate: true, sfx: 'SFX_BATTLE_TRANSITION_BOSS', flashy: true });
    expect(transitionEntryMs('boss')).toBe(1280);
  });
  it('presentationFor: Varlgrim final dengan subjudul, encounter Benteng temporal/scripted, boss lama tetap', () => {
    expect(presentationFor('varlgrim')).toEqual({ kind: 'final', name: 'Varlgrim', subtitle: 'Penjaga Waktu', bgm: 'BGM_FINAL_BOSS' });
    for (const e of ['fortress_riftborn', 'fortress_gravorn', 'fortress_guardpost', 'fortress_rift']) { const p = presentationFor(e); expect(p.kind, e).toBe('temporal'); expect(p.name.length).toBeGreaterThan(2); expect(p.bgm).toBe('BGM_BATTLE'); expect(p.subtitle).toBeUndefined(); }
    expect(presentationFor('fortress_riftborn').name).toBe('Retakan'); expect(presentationFor('fortress_guardpost').name).toBe('Penjaga Benteng');
    expect(presentationFor('fortress_aegis_trial')).toMatchObject({ kind: 'scripted', name: 'Riftborn Penguji' });
    for (const b of ['mournfang', 'veyrath', 'chronolith']) { expect(presentationFor(b).kind).toBe('boss'); expect(presentationFor(b).bgm).toBe('BGM_BOSS'); expect(presentationFor(b).subtitle).toBeUndefined(); }
  });
  it('semua perintah C4 dan velthia_aegis terklasifikasi (bukan jatuh ke basic): staf, temporal, telegraf meteor, meteor_fall, aegis_cast, Riftborn, Gravorn', () => {
    expect(actionClassFor('keeper_strike')).toBe('boss_staff'); expect(actionClassFor('fracture_strike')).toBe('boss_staff');
    for (const c of ['keeper_stance', 'time_bind', 'seal_pulse', 'fracture_mark', 'distortion_wave', 'phase_shift']) expect(actionClassFor(c), c).toBe('boss_temporal');
    expect(actionClassFor('meteor_call')).toBe('meteor_telegraph'); expect(actionClassFor('meteor_hold')).toBe('meteor_telegraph');
    expect(actionClassFor('meteor_fall')).toBe('meteor_fall'); expect(actionClassFor('velthia_aegis')).toBe('aegis_cast');
    expect(actionClassFor('rift_lash')).toBe('riftborn'); expect(actionClassFor('rift_gather')).toBe('boss_telegraph'); expect(actionClassFor('rift_surge')).toBe('boss_special');
    expect(actionClassFor('gravorn_heave')).toBe('gravorn'); expect(actionClassFor('gravorn_brace')).toBe('boss_telegraph'); expect(actionClassFor('gravorn_crush')).toBe('boss_special');
    for (const c of [...VARLGRIM_COMMANDS, ...RIFTBORN_COMMANDS, ...GRAVORN_COMMANDS, 'velthia_aegis']) expect(actionClassFor(c), c).not.toBe('basic');
  });
  it('durasi: meteor_fall 3,2-4,0 s, aegis_cast 2,2-2,8 s, telegraf meteor >= 1,6 s; semua fase lengkap dan non-negatif', () => {
    const fall = timelineTotalMs(TIMELINES.meteor_fall), aegis = timelineTotalMs(TIMELINES.aegis_cast), tele = timelineTotalMs(TIMELINES.meteor_telegraph);
    expect(fall).toBeGreaterThanOrEqual(3200); expect(fall).toBeLessThanOrEqual(4000);
    expect(aegis).toBeGreaterThanOrEqual(2200); expect(aegis).toBeLessThanOrEqual(2800);
    expect(tele).toBeGreaterThanOrEqual(1600);
    for (const k of ['boss_staff', 'boss_temporal', 'meteor_telegraph', 'meteor_fall', 'aegis_cast', 'riftborn', 'gravorn'] as const) for (const p of PHASE_ORDER) { expect(Number.isFinite(TIMELINES[k][p])).toBe(true); expect(TIMELINES[k][p]).toBeGreaterThanOrEqual(0); }
  });
  it('hitstop hemat: meteor_fall tidak melebihi boss_special; aegis_cast dan telegraf meteor tanpa hitstop; staf tidak lebih dari serangan berat', () => {
    expect(TIMELINES.meteor_fall.hitstop).toBeLessThanOrEqual(TIMELINES.boss_special.hitstop);
    expect(TIMELINES.aegis_cast.hitstop).toBe(0); expect(TIMELINES.meteor_telegraph.hitstop).toBe(0);
    expect(TIMELINES.boss_staff.hitstop).toBeLessThanOrEqual(TIMELINES.heavy.hitstop);
    expect(effectiveHitstop(TIMELINES.meteor_fall, false)).toBeLessThan(effectiveHitstop(TIMELINES.meteor_fall, true));
  });
  it('Reduced Flashes dan Screen Shake dipatuhi seperti kelas lama untuk meteor_fall; peringatan tidak disembunyikan (telegraf tidak pernah memicu kilat)', () => {
    expect(HEAVY_IMPACT_CLASSES.has('meteor_fall')).toBe(true); expect(HEAVY_IMPACT_CLASSES.has('boss_staff')).toBe(true);
    expect(impactFxFor({ reducedFlashes: true, screenShake: true }, 'meteor_fall')).toEqual({ flash: false, shake: true });
    expect(impactFxFor({ reducedFlashes: false, screenShake: false }, 'meteor_fall')).toEqual({ flash: true, shake: false });
    for (const c of ['meteor_telegraph', 'aegis_cast', 'boss_temporal'] as const) expect(impactFxFor({ reducedFlashes: false, screenShake: true }, c)).toEqual({ flash: false, shake: false });
  });
  it('fastTimeline memperpendek telegraf untuk retry cepat tanpa mengubah kelas asli', () => {
    const fast = fastTimeline(TIMELINES.meteor_telegraph, 0.25);
    expect(timelineTotalMs(fast)).toBeLessThan(timelineTotalMs(TIMELINES.meteor_telegraph) * 0.3);
    expect(timelineTotalMs(TIMELINES.meteor_telegraph)).toBeGreaterThanOrEqual(1600);
    expect(fastTimeline(TIMELINES.basic, 1)).toEqual(TIMELINES.basic); expect(fastTimeline(TIMELINES.basic, 0)).toEqual({ confirm: 0, anticipation: 0, windup: 0, execution: 0, hitstop: 0, reaction: 0, recovery: 0, handoff: 0 });
  });
});
