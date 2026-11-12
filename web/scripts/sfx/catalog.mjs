/**
 * Katalog SFX ORIGINAL Phase 7: tiap entri = id, kategori, resep sintesis (fungsi murni), gain runtime, interval minimum.
 * Semua bunyi dibuat dari nol oleh dsp.mjs; tidak ada sampel/rekaman/BGM. Status kualitas: FUNCTIONAL / AUDIO-REVIEW PENDING
 * (belum ditinjau telinga manusia). Resep ditulis ringkas di `recipe` agar tercatat di manifest dan dokumen desain.
 */
import {
  SR, buf, env, applyEnv, osc, partials, BELL, STONE, noise, biquad, reverb, mixInto, reversed, sum, saturate, click, crackle,
  finish, mtof,
} from './dsp.mjs';

// ---------- helper ----------
const PING = [{ ratio: 1, amp: 1, tau: 0.1 }, { ratio: 2, amp: 0.32, tau: 0.06 }, { ratio: 3, amp: 0.1, tau: 0.04 }];
const scaled = (parts, k) => parts.map((p) => ({ ...p, tau: p.tau * k }));
const bell = (sec, f, k = 1, parts = BELL) => partials(sec, f, scaled(parts, k));
const ping = (sec, f, k = 1) => partials(sec, f, scaled(PING, k));
const mono = (sec) => buf(sec);
/** frekuensi eksponensial dari f0 ke f1 selama d detik, lalu tetap */
const sweep = (f0, f1, d) => (t) => f0 * Math.pow(f1 / f0, Math.min(1, t / d));
const thump = (sec, f0, f1, d, tau) => applyEnv(osc(sec, sweep(f0, f1, d)), env.perc(0.0012, tau));
/** deret tik: waktu (detik) -> buffer kecil */
function ticksAt(len, times, rng, { f = 2400, amp = 0.5, tau = 0.004, hp = 3000 } = {}) {
  const out = mono(len);
  for (const t of times) {
    const tick = sum([applyEnv(osc(0.03, f * (0.97 + rng.next() * 0.06)), env.perc(0.0003, tau)), 0.8], [click(0.03, rng, { hp, lp: 9000, tau }), 0.6]);
    mixInto(out, tick, t, amp * (0.8 + rng.next() * 0.4));
  }
  return out;
}
/** waktu tik dengan jarak makin rapat (akselerasi) atau makin renggang (deselerasi) */
const accelTimes = (n, span, start = 0) => Array.from({ length: n }, (_, k) => start + span * (1 - Math.pow(1 - k / n, 2)));
const decelTimes = (n, span, start = 0) => Array.from({ length: n }, (_, k) => start + span * Math.pow(k / n, 2));
const grind = (sec, rng, lp = 260, amHz = 9, depth = 0.6) => {
  const n = biquad(noise(sec, rng, 'brown'), 'lp', lp, 0.8);
  for (let i = 0; i < n.length; i++) n[i] *= 1 - depth * (0.5 + 0.5 * Math.sin(2 * Math.PI * amHz * (i / SR)));
  return n;
};
const air = (sec, rng, fc, q = 1, a = 0.1, total = sec) => applyEnv(biquad(noise(sec, rng), 'bp', fc, q), env.swell(a, total));

// ---------- resep ----------
const R = {};

// UI
R.SFX_UI_MOVE = (rng) => {
  const n = 0.07;
  const a = applyEnv(osc(n, (t) => 1900 - 5000 * t), env.perc(0.0008, 0.012));
  const b = applyEnv(osc(n, 3800), env.perc(0.0008, 0.006));
  return finish(sum([a, 0.8], [b, 0.22], [click(n, rng, { hp: 3000, lp: 8000, tau: 0.002 }), 0.12]), { fadeOut: 0.02 });
};
R.SFX_UI_CONFIRM = () => {
  const out = mono(0.2);
  mixInto(out, ping(0.2, 880, 0.9), 0, 1);
  mixInto(out, ping(0.2, 1318.5, 0.9), 0.05, 0.85);
  return finish(out, { fadeOut: 0.05 });
};
R.SFX_UI_CANCEL = () => {
  const out = mono(0.17);
  mixInto(out, applyEnv(biquad(osc(0.17, 523.25, 'tri'), 'lp', 1800), env.perc(0.001, 0.05)), 0, 1);
  mixInto(out, applyEnv(biquad(osc(0.17, 392, 'tri'), 'lp', 1500), env.perc(0.001, 0.06)), 0.055, 0.9);
  return finish(out, { fadeOut: 0.05 });
};
R.SFX_UI_SELECT_ITEM = (rng) => {
  const n = 0.09;
  const a = applyEnv(osc(n, 1320, 'sine', { ratio: 2, index: (t) => 3 * Math.exp(-t / 0.02) }), env.perc(0.0006, 0.03));
  return finish(sum([a, 1], [click(n, rng, { hp: 3500, tau: 0.002 }), 0.1]), { fadeOut: 0.03 });
};
R.SFX_UI_ITEM_USE = (rng) => {
  const n = 0.2;
  const s = applyEnv(osc(n, sweep(520, 1560, 0.11)), env.swell(0.09, 0.16));
  const sh = applyEnv(biquad(noise(n, rng), 'bp', 6500, 2), env.swell(0.1, 0.2));
  const p = mono(n);
  mixInto(p, ping(0.1, 1568, 0.7), 0.1, 1);
  return finish(sum([s, 0.7], [sh, 0.25], [p, 0.9]), { fadeOut: 0.06 });
};
R.SFX_UI_SAVE_OK = () => {
  const out = mono(0.2);
  [1046.5, 1318.5, 1568].forEach((f, i) => mixInto(out, ping(0.2, f, 0.5), i * 0.045, 1 - i * 0.08));
  return finish(out, { fadeOut: 0.06 });
};
R.SFX_UI_SAVE_FAIL = () => {
  const out = mono(0.2);
  const one = (f1, f2) => applyEnv(biquad(sum([osc(0.1, (t) => f1 * (1 - 0.1 * t / 0.1), 'saw'), 1], [osc(0.1, (t) => f2 * (1 - 0.1 * t / 0.1), 'saw'), 1]), 'lp', 900, 0.8), env.perc(0.004, 0.045));
  mixInto(out, one(220, 233.1), 0, 1);
  mixInto(out, one(196, 207.7), 0.095, 0.9);
  return finish(out, { fadeOut: 0.05 });
};
R.SFX_UI_DIALOGUE_ADVANCE = (rng) => {
  const n = 0.055;
  const a = applyEnv(osc(n, (t) => 520 - 3000 * t), env.perc(0.0008, 0.011));
  return finish(sum([a, 0.9], [click(n, rng, { hp: 1500, lp: 4000, tau: 0.002 }), 0.12]), { fadeOut: 0.02 });
};
R.SFX_UI_DIALOGUE_CHOICE = () => {
  const out = mono(0.1);
  mixInto(out, ping(0.1, 784, 0.45), 0, 0.8);
  mixInto(out, ping(0.1, 988, 0.5), 0.035, 1);
  return finish(out, { fadeOut: 0.04 });
};
const coin = (f, k = 1) => applyEnv(osc(0.16, f, 'sine', { ratio: 3.5, index: (t) => 2.2 * Math.exp(-t / 0.04) }), env.perc(0.0005, 0.05 * k));
R.SFX_UI_SHOP_BUY = () => {
  const out = mono(0.2);
  mixInto(out, coin(2349), 0, 0.9);
  mixInto(out, coin(3136, 1.3), 0.05, 1);
  return finish(out, { fadeOut: 0.06 });
};
R.SFX_UI_SHOP_SELL = (rng) => {
  const out = mono(0.19);
  mixInto(out, coin(3136), 0, 0.9);
  mixInto(out, coin(2093, 1.3), 0.05, 1);
  mixInto(out, applyEnv(biquad(noise(0.1, rng), 'bp', 1600, 0.8), env.swell(0.03, 0.1)), 0.09, 0.14);
  return finish(out, { fadeOut: 0.06 });
};

// Langkah
R.SFX_STEP_GRASS = (rng) => {
  const n = 0.11;
  const sw = applyEnv(biquad(noise(n, rng), 'bp', rng.range(2800, 4000), 0.9), env.perc(0.004, rng.range(0.022, 0.034)));
  const sw2 = mono(n);
  mixInto(sw2, applyEnv(biquad(noise(0.08, rng), 'hp', 5200, 0.7), env.perc(0.003, 0.02)), rng.range(0.015, 0.03), 1);
  const th = thump(n, 90, 58, 0.04, 0.02);
  return finish(sum([sw, 0.9], [sw2, 0.35], [th, rng.range(0.28, 0.42)]), { fadeOut: 0.04 });
};
R.SFX_STEP_DIRT = (rng) => {
  const n = 0.1;
  const body = applyEnv(biquad(noise(n, rng), 'lp', rng.range(1000, 1600), 0.8), env.perc(0.002, 0.022));
  const th = thump(n, rng.range(65, 85), 48, 0.04, 0.03);
  const grit = applyEnv(crackle(n, rng, 900, 0.03), (t) => (t < 0.09 ? 1 : 0));
  return finish(sum([body, 0.8], [th, rng.range(0.6, 0.8)], [grit, 0.35]), { fadeOut: 0.04 });
};
R.SFX_STEP_STONE = (rng) => {
  const n = 0.1;
  const cl = click(n, rng, { hp: 2500, lp: 9000, tau: 0.004 });
  const ring = partials(n, rng.range(900, 1700), scaled(STONE, 0.28));
  const th = thump(n, 115, 70, 0.04, 0.03);
  const body = applyEnv(biquad(noise(n, rng), 'bp', 2000, 1), env.perc(0.001, 0.012));
  return finish(sum([cl, 0.55], [ring, 0.32], [th, 0.45], [body, 0.4]), { fadeOut: 0.04 });
};

// Interaksi
R.SFX_INTERACT = (rng) => {
  const n = 0.22;
  const out = mono(n);
  mixInto(out, applyEnv(osc(0.1, sweep(620, 880, 0.06)), env.perc(0.002, 0.04)), 0, 0.8);
  mixInto(out, ping(0.15, 1318.5, 0.6), 0.05, 0.55);
  mixInto(out, click(0.02, rng, { hp: 3000, tau: 0.002 }), 0, 0.1);
  return finish(out, { fadeOut: 0.07 });
};
R.SFX_CHEST_OPEN = (rng) => {
  const n = 0.9;
  const creak = applyEnv(biquad(osc(0.42, (t) => 130 + 260 * t + 9 * Math.sin(40 * t) , 'saw'), 'bp', (t) => 500 + 900 * t, 4), env.swell(0.15, 0.42));
  const out = mono(n);
  mixInto(out, creak, 0, 0.9);
  mixInto(out, click(0.04, rng, { hp: 800, lp: 5000, tau: 0.008 }), 0.4, 0.9);
  mixInto(out, thump(0.12, 300, 150, 0.05, 0.04), 0.4, 0.7);
  [1568, 1976, 2349].forEach((f, i) => mixInto(out, bell(0.45, f, 0.5), 0.43 + i * 0.06, 0.5 - i * 0.05));
  return finish(reverb(out, { room: 0.8, wet: 0.2 }), { fadeOut: 0.12 });
};
R.SFX_ITEM_PICKUP = (rng) => {
  const n = 0.32;
  const out = mono(n);
  mixInto(out, applyEnv(osc(0.25, 1175, 'sine', { ratio: 2, index: (t) => 2 * Math.exp(-t / 0.03) }), env.perc(0.0008, 0.07)), 0, 0.9);
  mixInto(out, applyEnv(osc(0.25, 1760, 'sine', { ratio: 2, index: (t) => 2 * Math.exp(-t / 0.03) }), env.perc(0.0008, 0.09)), 0.07, 1);
  mixInto(out, applyEnv(biquad(noise(0.2, rng), 'hp', 7000, 0.7), env.swell(0.04, 0.2)), 0.07, 0.07);
  return finish(out, { fadeOut: 0.1 });
};
R.SFX_DOOR_OPEN = (rng) => {
  const n = 0.9;
  const out = mono(n);
  mixInto(out, thump(0.2, 130, 70, 0.06, 0.05), 0, 0.8);
  mixInto(out, applyEnv(biquad(osc(0.6, (t) => 90 + 70 * t + 5 * Math.sin(33 * t), 'saw'), 'bp', (t) => 350 + 500 * t, 5), env.swell(0.2, 0.6)), 0.08, 0.9);
  mixInto(out, applyEnv(biquad(noise(0.5, rng), 'lp', 1100, 0.7), env.swell(0.2, 0.5)), 0.15, 0.25);
  mixInto(out, click(0.04, rng, { hp: 700, lp: 4500, tau: 0.01 }), 0.03, 0.7);
  return finish(saturate(out, 2), { fadeOut: 0.15 });
};
R.SFX_PUZZLE_ACTIVATE = (rng) => {
  const n = 0.6;
  const out = mono(n);
  mixInto(out, applyEnv(grind(0.5, rng, 520, 14, 0.6), env.adsr(0.03, 0.1, 0.7, 0.35, 0.15)), 0, 1.0);
  mixInto(out, partials(0.5, 440, scaled(STONE, 2.2)), 0.2, 0.55);
  mixInto(out, applyEnv(osc(0.4, 880), env.swell(0.2, 0.4)), 0.2, 0.08);
  return finish(reverb(out, { room: 0.9, wet: 0.2 }), { fadeOut: 0.12 });
};
R.SFX_PUZZLE_SOLVED = (rng) => {
  const n = 1.45;
  const out = mono(n);
  mixInto(out, thump(0.4, 90, 48, 0.1, 0.12), 0, 0.8);
  mixInto(out, applyEnv(grind(0.35, rng, 300, 10, 0.5), env.perc(0.01, 0.12)), 0, 0.6);
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => mixInto(out, bell(0.9, f, 1.3), 0.06 + i * 0.12, 0.55));
  [523.25, 783.99, 1046.5].forEach((f) => mixInto(out, applyEnv(osc(1.0, f), env.swell(0.2, 1.0)), 0.45, 0.14));
  return finish(reverb(out, { room: 1.2, wet: 0.28 }), { fadeOut: 0.3 });
};

// Battle
R.SFX_BATTLE_TRANSITION_NORMAL = (rng) => {
  const n = 0.85;
  const out = mono(n);
  mixInto(out, applyEnv(biquad(noise(0.55, rng), 'bp', sweep(250, 4000, 0.5), 2.5), env.swell(0.45, 0.55)), 0, 1);
  mixInto(out, thump(0.35, 140, 45, 0.15, 0.14), 0.46, 1.1);
  mixInto(out, click(0.06, rng, { hp: 1000, lp: 7000, tau: 0.02 }), 0.46, 0.8);
  return finish(out, { fadeOut: 0.15 });
};
R.SFX_BATTLE_TRANSITION_BOSS = (rng) => {
  const n = 1.4;
  const out = mono(n);
  [0, 0.32].forEach((t) => mixInto(out, thump(0.4, 62, 44, 0.05, 0.14), t, 0.9));
  const stack = sum([osc(1.0, 110, 'saw'), 1], [osc(1.0, 116.5, 'saw'), 1], [osc(1.0, 164.8, 'saw'), 0.7]);
  mixInto(out, applyEnv(biquad(stack, 'lp', sweep(200, 2600, 1.0), 2), env.swell(1.0, 1.0)), 0.1, 0.5);
  mixInto(out, applyEnv(biquad(noise(0.45, rng), 'bp', sweep(800, 6000, 0.3), 0.9), env.perc(0.005, 0.2)), 1.0, 0.8);
  mixInto(out, thump(0.4, 80, 34, 0.12, 0.2), 1.0, 1.2);
  return finish(reverb(saturate(out, 1.3), { room: 1.1, wet: 0.2 }), { fadeOut: 0.2 });
};
R.SFX_BATTLE_TRANSITION_TEMPORAL = (rng) => {
  const n = 1.15;
  const out = mono(n);
  mixInto(out, applyEnv(grind(1.1, rng, 300, 6, 0.55), env.swell(0.8, 1.1)), 0, 0.7);
  const cluster = mono(0.9);
  [392, 587.3, 880].forEach((f, i) => mixInto(cluster, bell(0.9, f, 1.2), i * 0.03, 0.6));
  mixInto(out, reversed(reverb(cluster, { room: 1.2, wet: 0.3 })), 0.05, 0.6);
  mixInto(out, ticksAt(n, accelTimes(12, 0.95, 0.05), rng, { f: 2600, amp: 0.45 }), 0, 1);
  mixInto(out, thump(0.3, 70, 40, 0.1, 0.12), 0.98, 0.9);
  return finish(out, { fadeOut: 0.18 });
};
R.SFX_BATTLE_TRANSITION_SCRIPTED = () => {
  const n = 1.0;
  const out = mono(n);
  const b = bell(0.6, 196, 1.4);
  mixInto(out, reversed(reverb(b, { room: 1, wet: 0.2 })), 0, 0.55);
  mixInto(out, bell(0.55, 196, 1.4), 0.45, 0.9);
  mixInto(out, thump(0.3, 75, 45, 0.1, 0.12), 0.45, 0.5);
  return finish(reverb(out, { room: 1.2, wet: 0.22 }), { fadeOut: 0.2 });
};
R.SFX_BATTLE_CONFIRM = (rng) => {
  const out = mono(0.2);
  mixInto(out, thump(0.2, 330, 190, 0.06, 0.04), 0, 0.9);
  mixInto(out, ping(0.18, 1175, 0.8), 0.02, 0.8);
  mixInto(out, click(0.02, rng, { hp: 2500, tau: 0.002 }), 0, 0.15);
  return finish(out, { fadeOut: 0.06 });
};
R.SFX_GREATSWORD_SWING = (rng) => {
  const n = 0.38;
  const whoosh = applyEnv(biquad(noise(n, rng), 'bp', (t) => (t < 0.18 ? 500 * Math.pow(6, t / 0.18) : 3000 * Math.pow(0.4, (t - 0.18) / 0.2)), 1.8), env.swell(0.17, n));
  const body = applyEnv(osc(n, sweep(220, 110, 0.3)), env.swell(0.15, n));
  const hiss = applyEnv(biquad(noise(n, rng), 'hp', 5000, 0.7), env.swell(0.18, n));
  return finish(sum([whoosh, 1], [body, 0.18], [hiss, 0.12]), { fadeIn: 0.01, fadeOut: 0.1 });
};
R.SFX_GREATSWORD_IMPACT = (rng) => {
  const n = 0.5;
  const th = thump(n, 160, 48, 0.15, 0.09);
  const body = applyEnv(biquad(noise(n, rng), 'lp', 900, 0.8), env.perc(0.001, 0.05));
  const ring = partials(n, 640, [{ ratio: 1, amp: 1, tau: 0.15 }, { ratio: 2.32, amp: 0.6, tau: 0.11 }, { ratio: 3.87, amp: 0.4, tau: 0.08 }, { ratio: 5.6, amp: 0.2, tau: 0.05 }]);
  const cl = click(n, rng, { hp: 3000, lp: 10000, tau: 0.006 });
  return finish(saturate(sum([th, 1], [body, 0.55], [ring, 0.28], [cl, 0.7]), 1.5), { fadeOut: 0.12 });
};
R.SFX_GROUND_SLAM = (rng) => {
  const n = 0.6;
  const boom = applyEnv(osc(n, sweep(100, 32, 0.35)), env.perc(0.002, 0.22));
  const rumble = applyEnv(biquad(noise(n, rng, 'brown'), 'lp', 180, 0.8), env.perc(0.005, 0.3));
  const crack = click(n, rng, { hp: 800, lp: 6000, tau: 0.02 });
  const debris = crackle(n, rng, 900, 0.25, 0.05);
  const stone = partials(n, 120, scaled(STONE, 2));
  return finish(reverb(saturate(sum([boom, 1], [rumble, 1.4], [crack, 0.8], [debris, 0.3], [stone, 0.3]), 1.8), { room: 0.9, wet: 0.15 }), { fadeOut: 0.25 });
};
R.SFX_ENEMY_ATTACK = (rng) => {
  const n = 0.4;
  const out = mono(n);
  mixInto(out, applyEnv(biquad(osc(0.2, sweep(180, 90, 0.18), 'saw', { ratio: 1.5, index: 4 }), 'bp', 1200, 1.5), env.swell(0.1, 0.2)), 0, 0.55);
  mixInto(out, air(0.2, rng, 4000, 0.9, 0.1, 0.2), 0, 0.3);
  [0.12, 0.155, 0.19].forEach((t, i) => mixInto(out, applyEnv(biquad(noise(0.1, rng), 'bp', 3200 + i * 300, 1.2), env.perc(0.001, 0.03)), t, 0.9));
  mixInto(out, thump(0.2, 140, 80, 0.05, 0.05), 0.12, 0.4);
  return finish(out, { fadeOut: 0.1 });
};
R.SFX_DAMAGE = (rng) => {
  const n = 0.28;
  const th = thump(n, 120, 60, 0.07, 0.07);
  const pop = applyEnv(biquad(noise(n, rng), 'lp', 1500, 0.8), env.perc(0.001, 0.03));
  const d1 = applyEnv(osc(n, sweep(340, 180, 0.2)), env.perc(0.001, 0.08));
  const d2 = applyEnv(osc(n, sweep(360, 190, 0.2)), env.perc(0.001, 0.08));
  return finish(sum([th, 1], [pop, 0.8], [d1, 0.18], [d2, 0.18]), { fadeOut: 0.08 });
};
R.SFX_ENEMY_DAMAGE = (rng) => {
  const n = 0.26;
  const crunch = applyEnv(biquad(noise(n, rng), 'bp', 1800, 1.1), env.perc(0.001, 0.035));
  const grit = crackle(n, rng, 1400, 0.04);
  const tone = applyEnv(biquad(osc(n, sweep(520, 240, 0.12), 'saw'), 'lp', 1800), env.perc(0.001, 0.06));
  return finish(sum([crunch, 1], [grit, 0.3], [tone, 0.35], [thump(n, 140, 80, 0.05, 0.05), 0.4]), { fadeOut: 0.08 });
};
R.SFX_DEFEND = (rng) => {
  const n = 0.32;
  const clang = partials(n, 420, scaled([{ ratio: 1, amp: 1, tau: 0.12 }, { ratio: 2.76, amp: 0.7, tau: 0.09 }, { ratio: 5.4, amp: 0.45, tau: 0.06 }, { ratio: 8.9, amp: 0.25, tau: 0.04 }, { ratio: 11.3, amp: 0.12, tau: 0.03 }], 1));
  return finish(sum([clang, 0.5], [thump(n, 100, 70, 0.04, 0.05), 0.55], [click(n, rng, { hp: 2500, tau: 0.004 }), 0.45]), { fadeOut: 0.1 });
};
R.SFX_HEAL = (rng) => {
  const n = 1.0;
  const out = mono(n);
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => mixInto(out, applyEnv(sum([osc(0.6, f), 1], [osc(0.6, f * 2), 0.18]), env.perc(0.01, 0.28)), i * 0.12, 0.6));
  mixInto(out, applyEnv(osc(0.9, 261.6), env.swell(0.25, 0.9)), 0, 0.22);
  mixInto(out, applyEnv(biquad(noise(0.7, rng), 'bp', 6500, 3), env.swell(0.3, 0.7)), 0.2, 0.08);
  return finish(reverb(out, { room: 1, wet: 0.28 }), { fadeOut: 0.2 });
};
R.SFX_SHIELD = (rng) => {
  const n = 0.7;
  const out = mono(n);
  mixInto(out, applyEnv(osc(0.4, sweep(330, 660, 0.18), 'sine', { ratio: 1.5, index: (t) => 3 - 2.5 * Math.min(1, t / 0.18) }), env.swell(0.17, 0.4)), 0, 0.8);
  mixInto(out, partials(0.5, 1320, scaled(PING, 3)), 0.17, 0.4);
  mixInto(out, thump(0.2, 130, 80, 0.05, 0.06), 0.17, 0.5);
  mixInto(out, air(0.3, rng, 5500, 1, 0.14, 0.3), 0, 0.1);
  return finish(reverb(out, { room: 0.8, wet: 0.18 }), { fadeOut: 0.15 });
};
R.SFX_STATUS_POISON = (rng) => {
  const n = 0.65;
  const out = mono(n);
  for (let i = 0; i < 5; i++) {
    const f0 = rng.range(220, 420);
    const d = rng.range(0.05, 0.09);
    mixInto(out, applyEnv(osc(0.12, (t) => f0 * (1 + 3 * Math.min(1, t / d))), env.perc(0.003, 0.025)), 0.03 + i * 0.1 + rng.range(0, 0.04), 0.5);
  }
  mixInto(out, applyEnv(biquad(noise(0.55, rng), 'bp', 4000, 1), env.swell(0.15, 0.55)), 0.05, 0.12);
  mixInto(out, applyEnv(biquad(sum([osc(0.6, (t) => 117 * (1 - 0.15 * t), 'tri'), 1], [osc(0.6, (t) => 124 * (1 - 0.15 * t), 'tri'), 1]), 'lp', 400, 0.8), env.swell(0.2, 0.6)), 0, 0.5);
  return finish(out, { fadeOut: 0.14 });
};
R.SFX_VICTORY = () => {
  const n = 2.45;
  const out = mono(n);
  const notes = [[72, 0], [76, 0.12], [79, 0.24], [84, 0.36], [88, 0.54], [91, 0.7]];
  notes.forEach(([m, t]) => mixInto(out, bell(1.4, mtof(m), 0.9), t, 0.5));
  [72, 79, 84, 88].forEach((m) => mixInto(out, applyEnv(sum([osc(1.8, mtof(m)), 1], [osc(1.8, mtof(m) * 2), 0.12]), env.swell(0.12, 1.8)), 0.72, 0.13));
  mixInto(out, bell(1.6, mtof(96), 1.1), 0.72, 0.3);
  return finish(reverb(out, { room: 1.4, wet: 0.3 }), { fadeOut: 0.5 });
};
R.SFX_DEFEAT = () => {
  const n = 2.45;
  const out = mono(n);
  [[67, 0], [63, 0.45], [60, 0.9], [55, 1.35]].forEach(([m, t], i) => mixInto(out, biquad(bell(1.4, mtof(m), 1.6), 'lp', 2200, 0.7), t, 0.55 - i * 0.04));
  mixInto(out, applyEnv(sum([osc(2.3, 98), 1], [osc(2.3, 98.7), 1]), env.swell(0.6, 2.3)), 0, 0.14);
  mixInto(out, applyEnv(osc(1.4, sweep(55, 41, 1.2)), env.swell(0.3, 1.4)), 1.0, 0.3);
  return finish(reverb(out, { room: 1.5, wet: 0.32 }), { fadeOut: 0.6 });
};

// Sihir
R.SFX_MAGIC_TORVAN = (rng) => {
  const n = 0.95;
  const out = mono(n);
  mixInto(out, partials(0.25, 330, [{ ratio: 1, amp: 1, tau: 0.05 }, { ratio: 2.4, amp: 0.5, tau: 0.03 }, { ratio: 4.1, amp: 0.25, tau: 0.02 }]), 0, 0.8);
  mixInto(out, thump(0.12, 240, 170, 0.04, 0.04), 0, 0.5);
  const leaves = applyEnv(biquad(noise(0.7, rng), 'bp', 4500, 1.2), env.swell(0.4, 0.7));
  for (let i = 0; i < leaves.length; i++) leaves[i] *= 0.6 + 0.4 * Math.sin(2 * Math.PI * 21 * (i / SR)) * Math.sin(2 * Math.PI * 13 * (i / SR));
  mixInto(out, leaves, 0.1, 0.35);
  const fl = sweep(587.3, 880, 0.5);
  const tone = applyEnv(osc(0.8, fl), env.swell(0.35, 0.8));
  const breath = applyEnv(biquad(noise(0.8, rng), 'bp', fl, 12), env.swell(0.35, 0.8));
  mixInto(out, sum([tone, 0.3], [breath, 1.2]), 0.12, 0.5);
  return finish(reverb(saturate(out, 2.2), { room: 1, wet: 0.2, damp: 0.6 }), { fadeOut: 0.2 });
};
R.SFX_MAGIC_VELTHIA_CAST = (rng) => {
  const n = 0.9;
  const out = mono(n);
  mixInto(out, air(0.25, rng, 4500, 1, 0.1, 0.25), 0, 0.12);
  mixInto(out, bell(0.8, 1174.7, 1), 0.05, 0.7);
  mixInto(out, bell(0.6, 1760, 0.8), 0.12, 0.4);
  mixInto(out, bell(0.5, 2349.3, 0.7), 0.2, 0.28);
  return finish(reverb(out, { room: 1.2, wet: 0.3 }), { fadeOut: 0.2 });
};
R.SFX_MAGIC_VELTHIA_SHIELD = (rng) => {
  const n = 1.15;
  const out = mono(n);
  [587.3, 880, 740, 1174.7].forEach((f, i) => mixInto(out, bell(1.0, f, 1.1), i * 0.05, 0.5 - i * 0.04));
  [1174.7, 1760].forEach((f) => {
    const s = applyEnv(osc(0.9, f), env.swell(0.2, 0.9));
    for (let i = 0; i < s.length; i++) s[i] *= 0.6 + 0.4 * Math.sin(2 * Math.PI * 5 * (i / SR));
    mixInto(out, s, 0.15, 0.1);
  });
  mixInto(out, air(0.7, rng, 8000, 1, 0.25, 0.7), 0.1, 0.07);
  return finish(reverb(out, { room: 1.3, wet: 0.35 }), { fadeOut: 0.25 });
};
R.SFX_MAGIC_VELTHIA_HEAL = () => {
  const n = 1.2;
  const out = mono(n);
  const soft = [{ ratio: 1, amp: 1, tau: 0.5 }, { ratio: 2, amp: 0.25, tau: 0.3 }, { ratio: 3, amp: 0.06, tau: 0.2 }];
  [740, 880, 1174.7, 1480].forEach((f, i) => mixInto(out, partials(0.9, f, soft), i * 0.14, 0.6));
  mixInto(out, applyEnv(osc(1.1, 293.7), env.swell(0.35, 1.1)), 0, 0.12);
  return finish(reverb(out, { room: 1.4, wet: 0.35 }), { fadeOut: 0.3 });
};
R.SFX_CHRONOLITH_CHARGE = (rng) => {
  const n = 1.2;
  const out = mono(n);
  mixInto(out, applyEnv(grind(1.3, rng, 220, 5, 0.6), env.swell(1.1, 1.3)), 0, 1);
  mixInto(out, applyEnv(biquad(noise(1.1, rng), 'bp', sweep(200, 650, 1.0), 3), env.swell(0.9, 1.1)), 0, 0.25);
  const cl = mono(1.0);
  [330, 495].forEach((f) => mixInto(cl, bell(1.0, f, 1.4), 0, 0.6));
  mixInto(out, reversed(reverb(cl, { room: 1.2, wet: 0.3 })), 0.25, 0.55);
  mixInto(out, ticksAt(n, accelTimes(14, 1.05, 0.1), rng, { f: 2200, amp: 0.4 }), 0, 1);
  mixInto(out, applyEnv(osc(1.3, sweep(55, 110, 1.2)), env.swell(1.1, 1.3)), 0, 0.3);
  return finish(out, { fadeOut: 0.15 });
};
R.SFX_CHRONOLITH_STRIKE = (rng) => {
  const n = 1.0;
  const out = mono(n);
  mixInto(out, thump(n, 80, 35, 0.15, 0.2), 0, 1.1);
  mixInto(out, click(0.1, rng, { hp: 600, lp: 6000, tau: 0.015 }), 0, 0.8);
  mixInto(out, partials(n, 180, scaled(STONE, 2.5)), 0, 0.45);
  mixInto(out, applyEnv(biquad(noise(0.6, rng, 'brown'), 'lp', 140, 0.8), env.perc(0.005, 0.3)), 0, 1.2);
  mixInto(out, ticksAt(n, decelTimes(5, 0.6, 0.3), rng, { f: 1800, amp: 0.18, tau: 0.006 }), 0, 1);
  return finish(reverb(saturate(out, 1.5), { room: 1.5, wet: 0.22 }), { fadeOut: 0.25 });
};
R.SFX_CHRONOLITH_TEMPORAL = (rng) => {
  const n = 1.2;
  const out = mono(n);
  const times = decelTimes(11, 1.0, 0.02);
  const t1 = ticksAt(n, times.filter((_, i) => i % 2 === 0), rng, { f: 2400, amp: 0.5 });
  const t2 = ticksAt(n, times.filter((_, i) => i % 2 === 1), rng, { f: 1800, amp: 0.45 });
  mixInto(out, sum([t1, 1], [t2, 1]), 0, 1);
  const cl = mono(1.1);
  [220, 330].forEach((f) => mixInto(cl, bell(1.1, f, 1.4), 0, 0.6));
  mixInto(out, reversed(reverb(cl, { room: 1.3, wet: 0.3 })), 0.1, 0.5);
  mixInto(out, applyEnv(biquad(osc(1.2, sweep(160, 40, 1.1), 'saw'), 'lp', 600, 0.8), env.swell(0.2, 1.2)), 0, 0.3);
  mixInto(out, applyEnv(grind(1.2, rng, 200, 4, 0.5), env.swell(0.3, 1.2)), 0, 0.6);
  mixInto(out, thump(0.25, 80, 45, 0.08, 0.1), 1.1, 0.7);
  return finish(out, { fadeOut: 0.18 });
};

// ---------- katalog ----------
/** Tiap entri: id, category, variants, minIntervalMs, gain (volume relatif runtime), trigger (teks dokumen), desc + recipe (dokumentasi). */
const E = (id, category, o) => ({ id, category, variants: 1, ...o });

export const CATALOG = [
  E('SFX_UI_MOVE', 'ui', { minIntervalMs: 45, gain: 0.5, trigger: 'MenuList atas/bawah (semua menu), Settings, RpgMenu ganti anggota', desc: 'Tik lembut tinggi untuk pindah fokus.', recipe: 'Sine 1900Hz turun cepat (exp tau 12ms) + parsial 3800Hz + klik HP 3k; fade 20ms.' }),
  E('SFX_UI_CONFIRM', 'ui', { minIntervalMs: 80, gain: 0.55, trigger: 'MenuList konfirmasi (Title/Pause/Journal), Settings, DialogueBox: pilihan dipilih, SaveLoad: membuka konfirmasi', desc: 'Denting kaca dua nada naik (A5 -> E6).', recipe: 'Parsial 1/2/3x (denting) A5 lalu E6 +50ms, peluruhan ~90ms.' }),
  E('SFX_UI_CANCEL', 'ui', { minIntervalMs: 80, gain: 0.5, trigger: 'tombol kembali semua overlay UI; item menu nonaktif; aksi RpgMenu/Shop gagal; Batal pada konfirmasi', desc: 'Dua nada segitiga turun lembut (C5 -> G4).', recipe: 'Triangle 523 lalu 392Hz +55ms, LP 1.5-1.8k, tau 50-60ms.' }),
  E('SFX_UI_SELECT_ITEM', 'ui', { minIntervalMs: 60, gain: 0.5, trigger: 'RpgMenu: perlengkapan dipasang; Journal: catatan dipilih; Shop/SaveLoad: ganti tab; Settings: ubah nilai', desc: 'Petikan kayu-kaca pendek.', recipe: 'FM sine 1320Hz rasio 2, indeks 3 meluruh 20ms + klik tipis.' }),
  E('SFX_UI_ITEM_USE', 'ui', { minIntervalMs: 120, gain: 0.6, trigger: 'RpgMenu: item dipakai / skill dibuka', desc: 'Sapuan naik berkilau lalu denting.', recipe: 'Sine 520->1560Hz exp 110ms swell + noise BP 6.5k + denting 1568Hz +100ms.' }),
  E('SFX_UI_SAVE_OK', 'ui', { minIntervalMs: 200, gain: 0.6, trigger: 'SaveLoadScene: simpan/muat berhasil', desc: 'Arpeggio denting C6-E6-G6 cepat.', recipe: 'Tiga parsial-denting 1046.5/1318.5/1568Hz berjarak 45ms.' }),
  E('SFX_UI_SAVE_FAIL', 'ui', { minIntervalMs: 200, gain: 0.55, trigger: 'SaveLoadScene: simpan/muat gagal', desc: 'Dua dengung rendah disonan (sekunde kecil) turun.', recipe: 'Saw 220+233.1Hz lalu 196+207.7Hz +95ms, LP 900Hz, glide -10%.' }),
  E('SFX_UI_DIALOGUE_ADVANCE', 'ui', { minIntervalMs: 60, gain: 0.35, trigger: 'DialogueBox: lanjut halaman/baris', desc: 'Tok kayu rendah sangat pendek dan pelan (sering terdengar).', recipe: 'Sine 520Hz turun cepat tau 11ms + klik LP 4k.' }),
  E('SFX_UI_DIALOGUE_CHOICE', 'ui', { minIntervalMs: 60, gain: 0.45, trigger: 'DialogueBox: opsi pilihan digeser', desc: 'Dua denting kecil naik (G5 -> B5) saat opsi pilihan dialog bergeser.', recipe: 'Parsial-denting 784Hz lalu 988Hz +35ms.' }),
  E('SFX_UI_SHOP_BUY', 'ui', { minIntervalMs: 100, gain: 0.6, trigger: 'ShopScene: beli berhasil', desc: 'Dua koin logam naik.', recipe: 'FM sine 2349Hz & 3136Hz rasio 3.5 indeks 2.2 meluruh 40ms, +50ms.' }),
  E('SFX_UI_SHOP_SELL', 'ui', { minIntervalMs: 100, gain: 0.6, trigger: 'ShopScene: jual berhasil', desc: 'Dua koin turun + gesekan kain halus.', recipe: 'FM 3136 -> 2093Hz +50ms + noise BP 1.6k lembut.' }),

  E('SFX_STEP_GRASS', 'step', { variants: 4, minIntervalMs: 90, gain: 0.5, trigger: 'wired by lead: WorldScene', desc: 'Gesekan rumput, empat variasi (pita tengah 2.8-4kHz acak).', recipe: 'Noise BP 2.8-4kHz tau ~28ms + desis HP 5.2k tertunda + gedebuk sine 90->58Hz.' }),
  E('SFX_STEP_DIRT', 'step', { variants: 4, minIntervalMs: 90, gain: 0.55, trigger: 'wired by lead: WorldScene', desc: 'Pijakan tanah: gedebuk rendah + kerikil halus, empat variasi.', recipe: 'Noise LP 1-1.6kHz + gedebuk 65-85Hz + klik acak (crackle).' }),
  E('SFX_STEP_STONE', 'step', { variants: 4, minIntervalMs: 90, gain: 0.5, trigger: 'wired by lead: WorldScene', desc: 'Ketukan batu: klik tajam + dering batu pendek, empat variasi.', recipe: 'Klik HP 2.5k + parsial batu 0.9-1.7kHz (tau ~28ms) + gedebuk 115->70Hz.' }),

  E('SFX_INTERACT', 'interact', { minIntervalMs: 150, gain: 0.6, trigger: 'wired by lead: WorldScene', desc: 'Pip lembut naik + denting kecil.', recipe: 'Sine 620->880Hz + denting 1318Hz +50ms + klik.' }),
  E('SFX_CHEST_OPEN', 'interact', { minIntervalMs: 400, gain: 0.7, trigger: 'wired by lead: WorldScene', desc: 'Derit kayu, klik kait, tiga denting berkilau.', recipe: 'Saw berderit + BP menyapu 500-1400Hz; klik + gedebuk 300Hz; denting 1568/1976/2349Hz; reverb kecil.' }),
  E('SFX_ITEM_PICKUP', 'interact', { minIntervalMs: 150, gain: 0.6, trigger: 'wired by lead: WorldScene', desc: 'Dua petikan FM cerah naik + kilau.', recipe: 'FM 1175Hz lalu 1760Hz (rasio 2) + noise HP 7k.' }),
  E('SFX_DOOR_OPEN', 'interact', { minIntervalMs: 500, gain: 0.7, trigger: 'wired by lead: WorldScene', desc: 'Pintu kayu: gedebuk, derit panjang, hembusan udara.', recipe: 'Saw 90->160Hz BP menyapu 350-850Hz + noise LP 1.1k + klik kait.' }),
  E('SFX_PUZZLE_ACTIVATE', 'interact', { minIntervalMs: 300, gain: 0.7, trigger: 'wired by lead: WorldScene', desc: 'Gerus batu rendah + dering batu + dengung rune.', recipe: 'Noise coklat LP 520Hz AM 14Hz; parsial batu 440Hz tau ~2x; sine 880Hz samar; reverb.' }),
  E('SFX_PUZZLE_SOLVED', 'interact', { minIntervalMs: 800, gain: 0.75, trigger: 'wired by lead: WorldScene', desc: 'Denyut batu dalam + empat denting naik + akor menggantung.', recipe: 'Thump 90->48Hz + gerus; denting C5-E5-G5-C6; akor sine C-G-C dengan reverb 1.2s.' }),

  E('SFX_BATTLE_TRANSITION_NORMAL', 'transition', { minIntervalMs: 800, gain: 0.8, trigger: 'wired by lead: BattleScene/WorldScene', desc: 'Sapuan udara naik lalu hantaman rendah.', recipe: 'Noise BP 250->4000Hz Q2.5 swell 450ms + thump 140->45Hz + klik.' }),
  E('SFX_BATTLE_TRANSITION_BOSS', 'transition', { minIntervalMs: 1000, gain: 0.85, trigger: 'wired by lead: BattleScene/WorldScene', desc: 'Dua denyut jantung 62Hz, tumpukan saw naik, hantaman besar.', recipe: 'Sine 62->44Hz x2; saw 110/116.5/164.8Hz LP 200->2600Hz; noise BP + thump 80->34Hz; saturasi + reverb.' }),
  E('SFX_BATTLE_TRANSITION_TEMPORAL', 'transition', { minIntervalMs: 1000, gain: 0.8, trigger: 'wired by lead: BattleScene/WorldScene', desc: 'Gerus batu + kilau lonceng terbalik + tik makin rapat.', recipe: 'Noise coklat LP 300Hz AM 6Hz; lonceng 392/587/880Hz direverb lalu dibalik; 12 tik akselerasi; thump akhir.' }),
  E('SFX_BATTLE_TRANSITION_SCRIPTED', 'transition', { minIntervalMs: 1000, gain: 0.8, trigger: 'wired by lead: BattleScene/WorldScene', desc: 'Lonceng rendah terbalik lalu satu pukulan dalam.', recipe: 'Lonceng 196Hz dibalik (0-450ms) lalu dipukul maju + thump 75Hz; reverb.' }),
  E('SFX_BATTLE_CONFIRM', 'ui', { minIntervalMs: 80, gain: 0.6, trigger: 'wired by lead: BattleScene', desc: 'Konfirmasi perintah battle: tok berbobot + denting.', recipe: 'Thump 330->190Hz + denting 1175Hz + klik.' }),
  E('SFX_GREATSWORD_SWING', 'battle', { minIntervalMs: 120, gain: 0.85, trigger: 'wired by lead: BattleScene', desc: 'Sabetan pedang besar: whoosh menanjak lalu mereda.', recipe: 'Noise BP 500->3000->1200Hz Q1.8 swell 170ms + sine 220->110Hz + desis HP 5k.' }),
  E('SFX_GREATSWORD_IMPACT', 'battle', { minIntervalMs: 60, gain: 1.0, trigger: 'wired by lead: BattleScene', desc: 'Hantaman berat: gedebuk + dering logam + klik.', recipe: 'Thump 160->48Hz + noise LP 900Hz + parsial logam 640Hz + klik HP 3k; saturasi 1.5.' }),
  E('SFX_GROUND_SLAM', 'battle', { minIntervalMs: 200, gain: 1.0, trigger: 'wired by lead: BattleScene', desc: 'Hantaman tanah: boom sub, retakan, serpihan batu.', recipe: 'Sine 100->32Hz; noise coklat LP 180Hz; klik 0.8-6kHz; crackle serpihan; parsial batu 120Hz; saturasi 1.8; reverb pendek.' }),
  E('SFX_ENEMY_ATTACK', 'battle', { minIntervalMs: 120, gain: 0.9, trigger: 'wired by lead: BattleScene', desc: 'Cakaran Hollowling: geraman serak + tiga goresan.', recipe: 'Saw FM 180->90Hz BP 1.2k; tiga noise BP 3.2-3.8kHz tau 30ms; thump 140Hz.' }),
  E('SFX_DAMAGE', 'battle', { minIntervalMs: 80, gain: 0.95, trigger: 'wired by lead: BattleScene', desc: 'Pemain terkena: gedebuk tumpul + dua nada disonan turun.', recipe: 'Thump 120->60Hz + pop noise LP 1.5k + sine 340->180Hz & 360->190Hz.' }),
  E('SFX_ENEMY_DAMAGE', 'battle', { minIntervalMs: 80, gain: 0.95, trigger: 'wired by lead: BattleScene', desc: 'Musuh terkena: remuk tajam lebih cerah dari DAMAGE.', recipe: 'Noise BP 1.8k tau 35ms + crackle + saw 520->240Hz LP 1.8k + thump 140Hz.' }),
  E('SFX_DEFEND', 'battle', { minIntervalMs: 120, gain: 0.85, trigger: 'wired by lead: BattleScene', desc: 'Tangkis: denting logam tumpul + gedebuk.', recipe: 'Parsial logam 420Hz (1/2.76/5.4/8.9/11.3x) + thump 100->70Hz + klik.' }),
  E('SFX_HEAL', 'magic', { minIntervalMs: 200, gain: 0.8, trigger: 'wired by lead: BattleScene', desc: 'Penyembuhan hangat: arpeggio sine naik + kilau.', recipe: 'Sine C5-E5-G5-C6 (+oktaf samar) tau 280ms; pad 261Hz; noise BP 6.5k; reverb.' }),
  E('SFX_SHIELD', 'magic', { minIntervalMs: 200, gain: 0.8, trigger: 'wired by lead: BattleScene', desc: 'Kubah pelindung: FM menanjak + dering kaca + thunk.', recipe: 'FM 330->660Hz rasio 1.5 indeks 3->0.5; parsial 1320Hz; thump; reverb.' }),
  E('SFX_STATUS_POISON', 'magic', { minIntervalMs: 300, gain: 0.8, trigger: 'wired by lead: BattleScene', desc: 'Racun: gelembung naik, desis, dengung disonan turun.', recipe: '5 sine blip glide naik acak; noise BP 4k; triangle 117/124Hz LP 400Hz turun.' }),
  E('SFX_VICTORY', 'stinger', { minIntervalMs: 2000, gain: 0.8, trigger: 'wired by lead: BattleScene', desc: 'Stinger kemenangan (efek, bukan musik): arpeggio lonceng mayor + akor menggantung.', recipe: 'Lonceng MIDI 72/76/79/84/88/91 berjarak ~120ms; akor sine C-G-C-E; lonceng C7; reverb 1.4s.' }),
  E('SFX_DEFEAT', 'stinger', { minIntervalMs: 2000, gain: 0.8, trigger: 'wired by lead: BattleScene', desc: 'Stinger kekalahan (efek): empat lonceng gelap turun + dengung rendah.', recipe: 'Lonceng G4-Eb4-C4-G3 LP 2.2k; sine 98/98.7Hz detune; sine 55->41Hz; reverb 1.5s.' }),

  E('SFX_MAGIC_TORVAN', 'magic', { minIntervalMs: 200, gain: 0.8, trigger: 'wired by lead: BattleScene', desc: 'Sihir alam Torvan: ketukan kayu, gemerisik daun, napas seruling.', recipe: 'Parsial kayu 330Hz (1/2.4/4.1x) + gedebuk; noise BP 4.5k AM daun; sine 587->880Hz + noise BP Q12 (napas); reverb teredam.' }),
  E('SFX_MAGIC_VELTHIA_CAST', 'magic', { minIntervalMs: 200, gain: 0.75, trigger: 'wired by lead: BattleScene', desc: 'Rapal Velthia: lonceng D6 dengan kilau naik, anggun.', recipe: 'Lonceng 1174.7/1760/2349Hz berjarak ~70ms + desir udara; reverb 1.2.' }),
  E('SFX_MAGIC_VELTHIA_SHIELD', 'magic', { minIntervalMs: 250, gain: 0.75, trigger: 'wired by lead: BattleScene', desc: 'Perisai Velthia: akor lonceng (D-A-F#-D) + kilau bertremolo.', recipe: 'Empat lonceng; sine 1174.7/1760Hz tremolo 5Hz; noise BP 8k; reverb 1.3.' }),
  E('SFX_MAGIC_VELTHIA_HEAL', 'magic', { minIntervalMs: 250, gain: 0.75, trigger: 'wired by lead: BattleScene', desc: 'Penyembuh Velthia: denting lembut naik panjang berekor.', recipe: 'Parsial lembut 740/880/1174.7/1480Hz berjarak 140ms + pad 293.7Hz; reverb 1.4.' }),
  E('SFX_CHRONOLITH_CHARGE', 'magic', { minIntervalMs: 300, gain: 0.85, trigger: 'wired by lead: BattleScene', desc: 'Chronolith mengisi: gerus batu, kilau terbalik, tik makin rapat.', recipe: 'Noise coklat LP 220Hz AM 5Hz; BP 200->650Hz; lonceng 330/495Hz dibalik; 14 tik akselerasi; sine 55->110Hz.' }),
  E('SFX_CHRONOLITH_STRIKE', 'magic', { minIntervalMs: 300, gain: 1.0, trigger: 'wired by lead: BattleScene', desc: 'Hantaman batu waktu: thump dalam, retak, resonansi, tik pudar.', recipe: 'Sine 80->35Hz; klik 0.6-6kHz; parsial batu 180Hz; noise coklat LP 140Hz; 5 tik deselerasi; saturasi + reverb.' }),
  E('SFX_CHRONOLITH_TEMPORAL', 'magic', { minIntervalMs: 300, gain: 0.85, trigger: 'wired by lead: BattleScene', desc: 'Distorsi waktu: tik-tok melambat, kilau terbalik, saw jatuh seperti pita berhenti.', recipe: '11 tik deselerasi 2400/1800Hz bergantian; lonceng 220/330Hz dibalik; saw 160->40Hz LP 600; gerus; thump.' }),
];

/** Batas durasi (ms) dan jendela RMS (dBFS pada berkas, setelah normalisasi puncak -3 dBFS) per kategori; dipakai tes. */
export const CATEGORY_LIMITS = {
  ui: { minMs: 40, maxMs: 200, rmsMin: -26, rmsMax: -9 },
  step: { minMs: 60, maxMs: 140, rmsMin: -30, rmsMax: -10 },
  interact: { minMs: 150, maxMs: 1500, rmsMin: -28, rmsMax: -9 },
  transition: { minMs: 500, maxMs: 1600, rmsMin: -26, rmsMax: -8 },
  battle: { minMs: 150, maxMs: 600, rmsMin: -26, rmsMax: -8 },
  magic: { minMs: 300, maxMs: 1200, rmsMin: -28, rmsMax: -8 },
  stinger: { minMs: 1000, maxMs: 2500, rmsMin: -30, rmsMax: -10 },
};

/** Render satu entri -> array Float32Array (satu per variasi). Resep id yang sama selalu menghasilkan bunyi yang sama. */
export function renderCue(entry, makeRng, hashSeed) {
  const out = [];
  for (let v = 0; v < entry.variants; v++) {
    const fn = R[entry.id];
    if (!fn) throw new Error(`resep hilang: ${entry.id}`);
    out.push(fn(makeRng(hashSeed(`${entry.id}#${v}`)), v));
  }
  return out;
}
