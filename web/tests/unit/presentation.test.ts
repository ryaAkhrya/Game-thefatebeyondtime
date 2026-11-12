import { describe, expect, it } from 'vitest';
import { PHASE_ORDER, RETURN_TRANSITION, TIMELINES, TRANSITIONS, actionClassFor, effectiveHitstop, impactFx, presentationFor, timelineTotalMs, transitionEntryMs } from '../../src/game/combat/presentation';

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
  it('hanya boss yang punya plakat nama dan satu-satunya yang flashy; temporal bergerak bertahap', () => {
    for (const k of Object.keys(TRANSITIONS) as (keyof typeof TRANSITIONS)[]) {
      expect(TRANSITIONS[k].nameplate).toBe(k === 'boss');
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
