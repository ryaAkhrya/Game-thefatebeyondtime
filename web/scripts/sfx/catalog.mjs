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

// ---------- Phase 8 (Bab IV): helper + resep ----------
/** Resonansi kayu tua berat (staf): rasio tak harmonik, peluruhan cepat. */
const WOOD = [
  { ratio: 1, amp: 1, tau: 0.16 },
  { ratio: 1.58, amp: 0.6, tau: 0.12 },
  { ratio: 2.43, amp: 0.4, tau: 0.08 },
  { ratio: 3.71, amp: 0.22, tau: 0.05 },
];
/** Dengung bertumpuk: sine-sine dengan swell bersama (tremolo opsional). Bukan melodi: satu sapuan akor. */
const hum = (sec, freqs, up, amps = null, tremHz = 0, tremDepth = 0) => {
  const out = mono(sec);
  freqs.forEach((f, i) => {
    const s = applyEnv(osc(sec, f), env.swell(up, sec));
    if (tremHz) for (let k = 0; k < s.length; k++) s[k] *= 1 - tremDepth * (0.5 + 0.5 * Math.sin((2 * Math.PI * tremHz * k) / SR));
    mixInto(out, s, 0, amps ? amps[i] : 1 / (1 + i * 0.5));
  });
  return out;
};
/** Rekam ulang buffer dengan amplop fungsi-waktu (untuk meluruh ke senyap pada ujung). */
const shape = (b, fn) => applyEnv(b, fn);

/** Normalisasi ke puncak 1 lalu saturasi tanh: merapatkan faktor puncak (loudness efektif naik tanpa menaikkan puncak). */
const soft = (b, drive) => {
  let p = 0;
  for (let i = 0; i < b.length; i++) p = Math.max(p, Math.abs(b[i]));
  if (p > 0) for (let i = 0; i < b.length; i++) b[i] /= p;
  return saturate(b, drive);
};

const P8 = {};

// --- dunia: Benteng Penjaga ---
P8.SFX_FORTRESS_DOOR_ANCIENT = (rng) => {
  const n = 3.0;
  const out = mono(n);
  mixInto(out, applyEnv(grind(2.1, rng, 240, 3.2, 0.5), env.swell(0.7, 2.1)), 0.05, 1.0);
  mixInto(out, applyEnv(biquad(noise(1.9, rng, 'pink'), 'bp', sweep(150, 430, 1.8), 3), env.swell(0.8, 1.9)), 0.1, 0.55);
  mixInto(out, partials(0.9, 62, scaled(STONE, 3)), 0.05, 0.22);
  mixInto(out, thump(0.6, 95, 38, 0.1, 0.17), 1.9, 1.0);
  mixInto(out, partials(1.0, 110, scaled(STONE, 3)), 1.9, 0.4);
  mixInto(out, biquad(crackle(1.0, rng, 420, 0.4), 'lp', 2400, 0.7), 1.95, 0.2);
  return finish(reverb(soft(out, 1.8), { room: 1.6, wet: 0.25, damp: 0.5 }), { fadeIn: 0.04, fadeOut: 0.5 });
};
P8.SFX_SEAL_ACTIVATE = (rng) => {
  const n = 2.0;
  const out = mono(n);
  mixInto(out, reversed(reverb(bell(0.7, 440, 1.2), { room: 1, wet: 0.25 })), 0, 0.5);
  mixInto(out, hum(1.5, [220, 330], 0.55, [0.5, 0.35], 4.5, 0.25), 0.1, 0.5);
  mixInto(out, click(0.04, rng, { hp: 900, lp: 5000, tau: 0.006 }), 0.58, 0.5);
  mixInto(out, thump(0.2, 140, 80, 0.05, 0.06), 0.58, 0.55);
  mixInto(out, bell(1.2, 659.25, 1.2), 0.6, 0.55);
  mixInto(out, bell(1.1, 880, 1.0), 0.72, 0.35);
  mixInto(out, bell(0.9, 1318.5, 0.8), 0.84, 0.2);
  return finish(reverb(out, { room: 1.2, wet: 0.28 }), { fadeOut: 0.35 });
};
P8.SFX_SEAL_ERROR = (rng, v) => {
  const n = 0.75;
  const f = 190 * Math.pow(2, (v * 1.5) / 12);
  const two = sum([osc(0.45, sweep(f, f * 0.88, 0.3), 'tri'), 1], [osc(0.45, sweep(f * 1.059, f * 0.93, 0.3), 'tri'), 0.8]);
  const out = mono(n);
  mixInto(out, applyEnv(biquad(two, 'lp', 700, 0.8), env.perc(0.004, 0.1)), 0, 0.8);
  mixInto(out, click(0.04, rng, { hp: 900, lp: 4500, tau: 0.006 }), 0, 0.6);
  mixInto(out, thump(0.2, 160, 90, 0.04, 0.05), 0, 0.6);
  mixInto(out, partials(0.4, 330, scaled(STONE, 0.8)), 0, 0.25);
  return finish(reverb(soft(out, 1.7), { room: 0.6, wet: 0.12 }), { fadeOut: 0.2 });
};
P8.SFX_ECHO_MEMORY = (rng) => {
  const n = 3.4;
  const out = mono(n);
  const chord = mono(2.6);
  [[293.66, 0.5], [440, 0.4], [587.33, 0.3], [739.99, 0.16]].forEach(([f, a]) => {
    mixInto(chord, applyEnv(sum([osc(2.6, f), 1], [osc(2.6, f * 1.003), 0.7]), env.swell(1.0, 2.6)), 0, a);
  });
  mixInto(out, biquad(chord, 'lp', 2400, 0.7), 0.2, 1);
  mixInto(out, reversed(reverb(bell(0.9, 587.33, 1.1), { room: 1.2, wet: 0.25 })), 0, 0.4);
  mixInto(out, bell(1.5, 880, 1.2), 1.0, 0.35);
  mixInto(out, air(1.8, rng, 1800, 1.5, 0.9, 1.8), 0.3, 0.1);
  return finish(reverb(out, { room: 1.6, wet: 0.35, damp: 0.55 }), { fadeIn: 0.03, fadeOut: 0.7 });
};
P8.SFX_HEART_LOCK = (rng) => {
  const n = 1.9;
  const out = mono(n);
  mixInto(out, click(0.06, rng, { hp: 600, lp: 5000, tau: 0.012 }), 0, 0.9);
  mixInto(out, thump(0.35, 150, 70, 0.07, 0.09), 0, 0.9);
  mixInto(out, partials(1.2, 110, scaled(STONE, 4)), 0.01, 0.5);
  mixInto(out, bell(1.4, 164.81, 1.8), 0.05, 0.55);
  mixInto(out, bell(1.0, 329.63, 1.2), 0.12, 0.3);
  mixInto(out, hum(1.2, [82.4], 0.3), 0.1, 0.25);
  return finish(reverb(soft(out, 1.7), { room: 1.4, wet: 0.28 }), { fadeOut: 0.45 });
};
P8.SFX_HEART_UNSEAL = (rng) => {
  const n = 3.4;
  const out = mono(n);
  mixInto(out, applyEnv(grind(1.6, rng, 260, 6, 0.5), env.swell(0.5, 1.6)), 0, 0.8);
  [293.66, 440, 587.33, 739.99, 880, 1174.7].forEach((f, k) => mixInto(out, bell(1.6, f, 1.2), 0.5 + k * 0.18, 0.5 - k * 0.04));
  mixInto(out, hum(2.4, [146.83, 220, 293.66, 369.99], 1.0, [0.2, 0.18, 0.15, 0.1]), 0.4, 1);
  mixInto(out, thump(0.8, 70, 34, 0.2, 0.25), 1.55, 0.9);
  mixInto(out, click(0.08, rng, { hp: 500, lp: 5000, tau: 0.015 }), 1.55, 0.5);
  mixInto(out, partials(1.2, 100, scaled(STONE, 4)), 1.55, 0.35);
  mixInto(out, bell(1.6, 587.33, 1.4), 1.6, 0.45);
  return finish(reverb(out, { room: 1.6, wet: 0.32 }), { fadeOut: 0.8 });
};
P8.SFX_TOWER_COLLAPSE_DISTANT = (rng) => {
  const n = 4.4;
  const out = mono(n);
  mixInto(out, applyEnv(biquad(noise(3.8, rng, 'brown'), 'lp', (t) => 140 - 50 * Math.min(1, t / 3), 0.7), env.swell(1.2, 3.8)), 0, 1.8);
  [[0.45, 1], [1.15, 0.8], [1.85, 0.55], [2.5, 0.35]].forEach(([t, g]) => mixInto(out, biquad(thump(0.7, 62, 30, 0.15, 0.2), 'lp', 140, 0.7), t, g));
  mixInto(out, biquad(crackle(3, rng, 700, 1.2), 'lp', 900, 0.7), 0.3, 0.12);
  mixInto(out, applyEnv(osc(3.2, sweep(70, 45, 3)), env.swell(1.2, 3.2)), 0, 0.25);
  const far = biquad(reverb(soft(out, 1.8), { room: 2.0, wet: 0.35, damp: 0.7 }), 'lp', 480, 0.7);
  return finish(far, { fadeIn: 0.2, fadeOut: 0.9 });
};

// --- Varlgrim: staf kayu berat + temporal "dry ticking" ---
P8.SFX_VARLGRIM_STAFF_SWING = (rng, v) => {
  const n = 0.7;
  const peak = 0.3;
  const whoosh = applyEnv(biquad(noise(n, rng), 'bp', (t) => (t < peak ? 260 * Math.pow(5, t / peak) : 1300 * Math.pow(0.4, (t - peak) / 0.3)), 1.3), env.swell(peak, n));
  const body = applyEnv(osc(n, sweep(150 + v * 12, 80, 0.5)), env.swell(0.28, n));
  const creak = applyEnv(biquad(osc(0.35, (t) => 180 + 120 * t + 8 * Math.sin(60 * t), 'saw'), 'bp', (t) => 500 + 700 * t, 5), env.swell(0.12, 0.35));
  return finish(sum([whoosh, 1], [body, 0.22], [creak, 0.25]), { fadeIn: 0.01, fadeOut: 0.18 });
};
P8.SFX_VARLGRIM_STAFF_IMPACT = (rng, v) => {
  const n = 1.2;
  const th = thump(n, 130 + v * 10, 42, 0.12, 0.12);
  const wood = partials(n, 170 + v * 12, scaled(WOOD, 1.0));
  const crack = applyEnv(biquad(noise(n, rng), 'bp', 900, 1.0), env.perc(0.001, 0.025));
  const knock = click(n, rng, { hp: 700, lp: 4500, tau: 0.008 });
  const floor = partials(n, 95, scaled(STONE, 1.5));
  return finish(reverb(soft(sum([th, 1], [wood, 0.5], [crack, 0.8], [knock, 0.6], [floor, 0.25]), 2.2), { room: 0.6, wet: 0.18, damp: 0.6 }), { fadeOut: 0.3 });
};
P8.SFX_TEMPORAL_BIND = (rng, v) => {
  const n = 1.4;
  const out = mono(n);
  mixInto(out, thump(0.3, 110, 60, 0.06, 0.08), 0, 0.7);
  mixInto(out, partials(0.4, 140, scaled(WOOD, 0.6)), 0, 0.3);
  mixInto(out, ticksAt(n, decelTimes(9, 0.95, 0.12 + v * 0.01), rng, { f: 1500, amp: 0.35, tau: 0.005, hp: 1800 }), 0, 1);
  const veil = mono(1.0);
  [330, 495].forEach((f) => mixInto(veil, bell(1.0, f, 1.3), 0, 0.6));
  mixInto(out, reversed(biquad(reverb(veil, { room: 1.1, wet: 0.3 }), 'lp', 2200, 0.7)), 0.1, 0.3);
  mixInto(out, applyEnv(osc(1.2, sweep(82.4, 70, 1.1)), env.swell(0.3, 1.2)), 0, 0.25);
  return finish(out, { fadeOut: 0.3 });
};
P8.SFX_TIME_DISTORTION = (rng) => {
  const n = 2.2;
  const out = mono(n);
  const saws = sum([osc(1.5, sweep(330, 55, 1.4), 'saw'), 1], [osc(1.5, sweep(349, 58, 1.4), 'saw'), 0.8]);
  mixInto(out, applyEnv(biquad(saws, 'lp', (t) => 1800 * Math.pow(0.25, t / 1.4), 0.9), env.swell(0.2, 1.5)), 0, 0.45);
  mixInto(out, applyEnv(biquad(noise(1.5, rng), 'bp', sweep(3500, 300, 1.3), 2), env.swell(0.25, 1.5)), 0, 0.3);
  mixInto(out, ticksAt(n, decelTimes(10, 1.4, 0.05).map((t, i) => t + (i % 3) * 0.015), rng, { f: 2100, amp: 0.4 }), 0, 1);
  const cl = mono(1.0);
  [220, 311.1, 466.2].forEach((f) => mixInto(cl, bell(1.0, f, 1.2), 0, 0.5));
  mixInto(out, reversed(reverb(cl, { room: 1.2, wet: 0.3 })), 0.1, 0.4);
  const throb = applyEnv(osc(1.6, 60), env.swell(0.4, 1.6));
  for (let k = 0; k < throb.length; k++) throb[k] *= 0.5 + 0.5 * Math.sin((2 * Math.PI * 5 * k) / SR);
  mixInto(out, throb, 0, 0.3);
  mixInto(out, thump(0.3, 70, 40, 0.1, 0.1), 1.55, 0.6);
  return finish(reverb(out, { room: 1.2, wet: 0.2 }), { fadeOut: 0.35 });
};
P8.SFX_BOSS_PHASE_SHIFT = (rng) => {
  const n = 2.2;
  const out = mono(n);
  mixInto(out, bell(1.8, 98, 3), 0.45, 0.8);
  mixInto(out, applyEnv(biquad(noise(0.5, rng), 'bp', sweep(400, 2500, 0.45), 1.5), env.swell(0.44, 0.5)), 0, 0.5);
  mixInto(out, click(0.06, rng, { hp: 500, lp: 6000, tau: 0.02 }), 0.45, 0.8);
  mixInto(out, thump(0.5, 75, 36, 0.15, 0.18), 0.45, 0.9);
  mixInto(out, ticksAt(n, [1.35], rng, { f: 1700, amp: 0.5, tau: 0.005, hp: 1800 }), 0, 1);
  return finish(reverb(out, { room: 1.4, wet: 0.25 }), { fadeOut: 0.45 });
};
P8.SFX_FRACTURE_MARK = (rng, v) => {
  const n = 1.0;
  const out = mono(n);
  mixInto(out, applyEnv(osc(0.4, sweep(500 + v * 40, 1900, 0.3)), env.swell(0.3, 0.4)), 0, 0.5);
  mixInto(out, crackle(0.4, rng, 2600, 0.06), 0.28, 0.5);
  mixInto(out, partials(0.7, 1568 + v * 40, scaled(PING, 1.6)), 0.3, 0.5);
  mixInto(out, ticksAt(n, [0.32, 0.58], rng, { f: 1800, amp: 0.4, tau: 0.005, hp: 2000 }), 0, 1);
  mixInto(out, thump(0.2, 200, 110, 0.04, 0.04), 0.3, 0.4);
  return finish(reverb(soft(out, 1.8), { room: 0.7, wet: 0.15 }), { fadeOut: 0.3 });
};

// --- Meteor: gemuruh jauh -> jatuh -> tabrakan besar -> keheningan ---
P8.SFX_METEOR_CHARGE = (rng) => {
  const n = 2.6;
  const out = mono(n);
  mixInto(out, applyEnv(biquad(noise(2.2, rng, 'brown'), 'lp', (t) => 110 + 90 * t, 0.8), env.swell(1.6, 2.2)), 0, 1.6);
  mixInto(out, applyEnv(osc(2.2, sweep(40, 62, 2.0)), env.swell(1.7, 2.2)), 0, 0.5);
  mixInto(out, applyEnv(osc(2.2, sweep(80, 124, 2.0)), env.swell(1.7, 2.2)), 0, 0.25);
  mixInto(out, applyEnv(biquad(noise(2.0, rng), 'bp', (t) => 500 + 400 * t, 1.2), env.swell(1.5, 2.0)), 0.1, 0.12);
  mixInto(out, applyEnv(biquad(osc(0.9, (t) => 110 + 60 * t + 6 * Math.sin(45 * t), 'saw'), 'bp', (t) => 400 + 500 * t, 4), env.swell(0.4, 0.9)), 0, 0.22);
  return finish(reverb(out, { room: 1.8, wet: 0.3, damp: 0.6 }), { fadeIn: 0.05, fadeOut: 0.55 });
};
P8.SFX_METEOR_DESCENT = (rng) => {
  const n = 2.0;
  const rise = (t) => (t < 1.75 ? Math.pow(t / 1.75, 2.0) : Math.max(0, 1 - (t - 1.75) / 0.1));
  const out = mono(n);
  mixInto(out, shape(biquad(noise(n, rng, 'pink'), 'lp', (t) => 250 * Math.pow(10, Math.min(t, 1.8) / 1.8), 0.9), rise), 0, 1.0);
  mixInto(out, shape(osc(n, sweep(45, 90, 1.7)), rise), 0, 0.5);
  mixInto(out, shape(reversed(crackle(n, rng, 3000, 0.9)), rise), 0, 0.2);
  mixInto(out, shape(biquad(noise(n, rng), 'bp', sweep(700, 2200, 1.8), 6), rise), 0, 0.1);
  return finish(out, { fadeIn: 0.1, fadeOut: 0.08 });
};
P8.SFX_METEOR_IMPACT = (rng) => {
  const n = 3.6;
  const out = mono(n);
  mixInto(out, click(0.15, rng, { hp: 400, lp: 7000, tau: 0.03 }), 0, 1.0);
  mixInto(out, applyEnv(osc(2, sweep(85, 24, 0.5)), env.perc(0.002, 0.45)), 0, 1.2);
  mixInto(out, applyEnv(biquad(noise(3, rng, 'brown'), 'lp', 160, 0.8), env.perc(0.01, 0.7)), 0, 1.5);
  mixInto(out, partials(2.5, 70, scaled(STONE, 6)), 0, 0.35);
  mixInto(out, crackle(2.4, rng, 1800, 0.7), 0.15, 0.35);
  mixInto(out, applyEnv(biquad(noise(0.8, rng), 'bp', sweep(2500, 500, 0.5), 0.8), env.perc(0.002, 0.12)), 0, 0.5);
  const big = reverb(soft(out, 2.6), { room: 1.8, wet: 0.22 });
  // keheningan sesudah tabrakan: ekor meluruh ke senyap pada 0.9 s terakhir
  return finish(shape(big, (t) => (t < 2.4 ? 1 : Math.max(0, 1 - (t - 2.4) / 0.9))), { fadeOut: 0.3 });
};

// --- Perlindungan (Ultimate Shield Velthia): harmonik, anggun, bukan alarm ---
P8.SFX_AEGIS_CAST = (rng) => {
  const n = 2.8;
  const out = mono(n);
  [[146.83, 0], [220, 0.3], [293.66, 0.6], [440, 0.9], [587.33, 1.2]].forEach(([f, t0], i) => {
    const len = 2.2 - t0;
    mixInto(out, applyEnv(sum([osc(len, f), 1], [osc(len, f * 1.004), 0.6]), env.swell(0.8, len)), t0, 0.5 - i * 0.05);
  });
  mixInto(out, air(1.4, rng, 6000, 2, 0.9, 1.4), 0.6, 0.07);
  mixInto(out, bell(1.2, 587.33, 1.1), 1.65, 0.6);
  mixInto(out, bell(1.0, 880, 1.0), 1.73, 0.35);
  mixInto(out, thump(0.3, 90, 60, 0.08, 0.1), 1.65, 0.35);
  return finish(reverb(out, { room: 1.3, wet: 0.3 }), { fadeIn: 0.05, fadeOut: 0.45 });
};
P8.SFX_AEGIS_FORM = (rng) => {
  const n = 2.2;
  const out = mono(n);
  mixInto(out, hum(1.7, [146.83, 220], 0.3, [0.45, 0.35]), 0, 1);
  [587.33, 739.99, 880, 1174.7].forEach((f, i) => mixInto(out, bell(1.4, f, 1.1), i * 0.04, 0.5 - i * 0.07));
  mixInto(out, hum(1.4, [880, 1318.5], 0.3, [0.1, 0.07], 3, 0.4), 0.1, 1);
  mixInto(out, thump(0.3, 110, 62, 0.06, 0.1), 0, 0.6);
  return finish(reverb(out, { room: 1.5, wet: 0.35 }), { fadeOut: 0.5 });
};
P8.SFX_AEGIS_STRESS = (rng, v) => {
  const n = 2.4;
  const out = mono(n);
  const strain = mono(2.0);
  [220, 222.6, 330, 334].forEach((f, i) => mixInto(strain, applyEnv(osc(2.0, f), env.swell(0.3, 2.0)), 0, i < 2 ? 0.5 : 0.3));
  for (let k = 0; k < strain.length; k++) strain[k] *= 1 - 0.35 * (0.5 + 0.5 * Math.sin((2 * Math.PI * 7 * k) / SR));
  mixInto(out, biquad(strain, 'lp', 900, 0.8), 0, 0.35);
  mixInto(out, applyEnv(osc(2.0, sweep(55, 48, 1.8)), env.swell(0.2, 2.0)), 0, 0.45);
  mixInto(out, applyEnv(biquad(noise(2.0, rng, 'brown'), 'lp', 180, 0.8), env.swell(0.3, 2.0)), 0, 0.4);
  [[0.2, 0.4, 1568], [0.75 + v * 0.05, 0.6, 1480], [1.3, 0.85, 1397]].forEach(([t, a, f]) => {
    mixInto(out, click(0.05, rng, { hp: 2500, lp: 9000, tau: 0.01 }), t, a);
    mixInto(out, partials(0.5, f, scaled(PING, 0.8)), t, a);
    mixInto(out, applyEnv(biquad(noise(0.2, rng), 'bp', 3000, 1), env.perc(0.001, 0.04)), t, a * 0.6);
    mixInto(out, thump(0.15, 160, 90, 0.04, 0.05), t, a * 0.4);
  });
  return finish(reverb(soft(out, 1.7), { room: 1, wet: 0.22 }), { fadeIn: 0.02, fadeOut: 0.4 });
};
P8.SFX_AEGIS_FADE = (rng) => {
  const n = 2.6;
  const out = mono(n);
  [1174.7, 880, 587.33, 440].forEach((f, k) => mixInto(out, bell(1.3, f, 1.2), k * 0.2, 0.5 - k * 0.07));
  mixInto(out, applyEnv(biquad(noise(1.4, rng), 'hp', 7000, 0.7), env.perc(0.1, 0.45)), 0, 0.05);
  mixInto(out, applyEnv(osc(1.8, sweep(293.66, 146.83, 1.6)), env.swell(0.12, 1.8)), 0, 0.3);
  return finish(reverb(out, { room: 1.6, wet: 0.38 }), { fadeOut: 0.8 });
};

// --- musuh Bab IV ---
P8.SFX_RIFTBORN_ATTACK = (rng, v) => {
  const n = 0.6;
  const out = mono(n);
  mixInto(out, applyEnv(biquad(osc(0.3, sweep(380 + v * 40, 1100, 0.18), 'saw', { ratio: 1.41, index: 3 }), 'bp', (t) => 900 + 3000 * t, 2), env.swell(0.12, 0.3)), 0, 0.5);
  mixInto(out, applyEnv(biquad(noise(0.3, rng), 'bp', sweep(1200, 6000, 0.14), 1.4), env.perc(0.006, 0.05)), 0.09, 0.8);
  mixInto(out, crackle(0.25, rng, 2500, 0.05), 0.12, 0.35);
  mixInto(out, thump(0.2, 170, 90, 0.04, 0.05), 0.13, 0.55);
  mixInto(out, applyEnv(osc(0.3, sweep(700, 300, 0.25)), env.perc(0.004, 0.06)), 0.12, 0.15);
  return finish(soft(out, 2.2), { fadeOut: 0.14 });
};
P8.SFX_GRAVORN_ATTACK = (rng, v) => {
  const n = 0.95;
  const out = mono(n);
  mixInto(out, applyEnv(biquad(noise(0.3, rng, 'brown'), 'lp', 300, 0.8), env.swell(0.12, 0.3)), 0, 0.8);
  mixInto(out, thump(0.7, 95 - v * 6, 36, 0.14, 0.14), 0.22, 1.0);
  mixInto(out, partials(0.6, 140 + v * 18, scaled(STONE, 1.6)), 0.22, 0.45);
  mixInto(out, applyEnv(biquad(noise(0.5, rng, 'brown'), 'lp', 200, 0.8), env.perc(0.004, 0.16)), 0.22, 1.0);
  mixInto(out, click(0.05, rng, { hp: 700, lp: 5000, tau: 0.012 }), 0.22, 0.6);
  mixInto(out, crackle(0.4, rng, 700, 0.1), 0.24, 0.2);
  return finish(reverb(saturate(out, 1.4), { room: 0.7, wet: 0.14 }), { fadeOut: 0.22 });
};
P8.SFX_BATTLE_TRANSITION_FINAL = (rng) => {
  const n = 1.6;
  const out = mono(n);
  mixInto(out, reversed(reverb(bell(0.9, 98, 2.2), { room: 1.2, wet: 0.2 })), 0, 0.55);
  mixInto(out, thump(0.4, 58, 40, 0.06, 0.12), 0.1, 0.8);
  mixInto(out, thump(0.4, 58, 40, 0.06, 0.12), 0.62, 0.9);
  mixInto(out, hum(1.2, [73.4, 110, 146.8, 220], 1.0, [0.25, 0.2, 0.18, 0.12]), 0, 1);
  mixInto(out, partials(0.6, 140, scaled(WOOD, 1.0)), 1.0, 0.6);
  mixInto(out, thump(0.6, 90, 32, 0.12, 0.2), 1.0, 1.1);
  mixInto(out, click(0.04, rng, { hp: 600, lp: 4500, tau: 0.01 }), 1.0, 0.7);
  return finish(reverb(out, { room: 1.3, wet: 0.22 }), { fadeOut: 0.25 });
};
Object.assign(R, P8);

// ---------- katalog ----------
/** Tiap entri: id, category, variants, minIntervalMs, gain (volume relatif runtime), trigger (teks dokumen), desc + recipe (dokumentasi). `phase` = fase asal (7 = Phase 7, 8 = Bab IV). */
const E = (id, category, o) => ({ id, category, variants: 1, phase: 7, ...o });
const E8 = (id, category, o) => ({ id, category, variants: 1, phase: 8, ...o });

export const CATALOG = [
  E('SFX_UI_MOVE', 'ui', { minIntervalMs: 45, gain: 0.5, trigger: 'MenuList atas/bawah (semua menu), Settings, RpgMenu ganti anggota', desc: 'Tik lembut tinggi untuk pindah fokus.', recipe: 'Sine 1900Hz turun cepat (exp tau 12ms) + parsial 3800Hz + klik HP 3k; fade 20ms.' }),
  E('SFX_UI_CONFIRM', 'ui', { minIntervalMs: 80, gain: 0.55, trigger: 'MenuList konfirmasi (Title/Pause/Journal), Settings, DialogueBox: pilihan dipilih, SaveLoad: membuka konfirmasi', desc: 'Denting kaca dua nada naik (A5 -> E6).', recipe: 'Parsial 1/2/3x (denting) A5 lalu E6 +50ms, peluruhan ~90ms.' }),
  E('SFX_UI_CANCEL', 'ui', { minIntervalMs: 80, gain: 0.5, trigger: 'tombol kembali semua overlay UI; item menu nonaktif; aksi RpgMenu/Shop gagal; Batal pada konfirmasi', desc: 'Dua nada segitiga turun lembut (C5 -> G4).', recipe: 'Triangle 523 lalu 392Hz +55ms, LP 1.5-1.8k, tau 50-60ms.' }),
  E('SFX_UI_SELECT_ITEM', 'ui', { minIntervalMs: 60, gain: 0.5, trigger: 'RpgMenu: perlengkapan dipasang; Journal: catatan dipilih; Shop/SaveLoad: ganti tab; Settings: ubah nilai', desc: 'Petikan kayu-kaca pendek.', recipe: 'FM sine 1320Hz rasio 2, indeks 3 meluruh 20ms + klik tipis.' }),
  E('SFX_UI_ITEM_USE', 'ui', { minIntervalMs: 120, gain: 0.6, trigger: 'RpgMenu: item dipakai / skill dibuka', desc: 'Sapuan naik berkilau lalu denting.', recipe: 'Sine 520->1560Hz exp 110ms swell + noise BP 6.5k + denting 1568Hz +100ms.' }),
  E('SFX_UI_SAVE_OK', 'ui', { minIntervalMs: 200, gain: 0.6, trigger: 'SaveLoadScene: simpan/muat berhasil', desc: 'Arpeggio denting C6-E6-G6 cepat.', recipe: 'Tiga parsial-denting 1046.5/1318.5/1568Hz berjarak 45ms.' }),
  E('SFX_UI_SAVE_FAIL', 'ui', { minIntervalMs: 200, gain: 0.55, trigger: 'SaveLoadScene: simpan/muat gagal', desc: 'Dua dengung rendah disonan (sekunde kecil) turun.', recipe: 'Saw 220+233.1Hz lalu 196+207.7Hz +95ms, LP 900Hz, glide -10%.' }),
  E('SFX_UI_DIALOGUE_ADVANCE', 'ui', { minIntervalMs: 60, gain: 0.4, trigger: 'DialogueBox: lanjut halaman/baris', desc: 'Tok kayu rendah sangat pendek dan pelan (sering terdengar).', recipe: 'Sine 520Hz turun cepat tau 11ms + klik LP 4k.' }),
  E('SFX_UI_DIALOGUE_CHOICE', 'ui', { minIntervalMs: 60, gain: 0.45, trigger: 'DialogueBox: opsi pilihan digeser', desc: 'Dua denting kecil naik (G5 -> B5) saat opsi pilihan dialog bergeser.', recipe: 'Parsial-denting 784Hz lalu 988Hz +35ms.' }),
  E('SFX_UI_SHOP_BUY', 'ui', { minIntervalMs: 100, gain: 0.42, trigger: 'ShopScene: beli berhasil', desc: 'Dua koin logam naik.', recipe: 'FM sine 2349Hz & 3136Hz rasio 3.5 indeks 2.2 meluruh 40ms, +50ms.' }),
  E('SFX_UI_SHOP_SELL', 'ui', { minIntervalMs: 100, gain: 0.42, trigger: 'ShopScene: jual berhasil', desc: 'Dua koin turun + gesekan kain halus.', recipe: 'FM 3136 -> 2093Hz +50ms + noise BP 1.6k lembut.' }),

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

  // ===== Phase 8 (Bab IV: The Fate) =====
  E8('SFX_FORTRESS_DOOR_ANCIENT', 'world', { minIntervalMs: 1500, gain: 0.7, trigger: 'lead: Benteng Penjaga: gerbang batu kuno terbuka (Gerbang Luar, pintu ke Ruang Heart, pintasan Koridor Retakan)', desc: 'Pintu batu tua: gerus batu panjang yang berat, berhenti dengan satu hantaman dalam dan debu halus. Beda dari SFX_DOOR_OPEN (kayu).', recipe: 'Noise coklat LP 240Hz AM 3Hz swell 0.7s + noise pink BP 150->430Hz Q3; parsial batu 62Hz; thump 95->38Hz + parsial batu 110Hz di 1.9s; crackle LP; reverb 1.6.' }),
  E8('SFX_SEAL_ACTIVATE', 'world', { minIntervalMs: 400, gain: 0.7, trigger: 'lead: Ruang Uji Segel / Benteng: segel rune diaktifkan (pilar/alas/penyelarasan)', desc: 'Segel menyala: denting terbalik, dengung kuinta dua nada bertremolo pelan, klik batu, tiga denting harmonik (E5 A5 E6). Anggun, bukan alarm.', recipe: 'Lonceng 440Hz dibalik; hum sine 220+330Hz tremolo 4.5Hz; klik + thump 140Hz; lonceng 659/880/1318Hz berurutan; reverb 1.2.' }),
  E8('SFX_SEAL_ERROR', 'world', { variants: 2, minIntervalMs: 300, gain: 0.7, trigger: 'lead: Benteng: urutan segel/teka-teki salah (satu kali per percobaan, bukan per langkah)', desc: 'Penolakan tumpul: dua nada segitiga disonan (sekunde kecil) turun, redam LP 700Hz, ketukan batu. Tidak tajam; dua variasi.', recipe: 'Triangle f & f*1.059 glide -12%, LP 700Hz tau 100ms; klik + thump 160Hz; parsial batu 330Hz; f=190Hz (+1.5 semiton variasi 2); reverb kecil.' }),
  E8('SFX_ECHO_MEMORY', 'world', { minIntervalMs: 1500, gain: 0.7, trigger: 'lead: Ruang Gema: menyentuh objek kuno (dua objek, C4-05); pusaka Velthia bergema di Arsip', desc: 'Gema ingatan hangat: akor D-A-D-F# berdetune halus yang mengembang, denting terbalik lalu satu denting lembut, napas udara. Satu sapuan, bukan melodi.', recipe: 'Sine 293.66/440/587.33/740Hz (+detune 0.3%) swell 1s LP 2.4k; lonceng 587Hz terbalik; lonceng 880Hz; noise BP 1.8k; reverb 1.6 wet 0.35.' }),
  E8('SFX_HEART_LOCK', 'world', { minIntervalMs: 800, gain: 0.75, trigger: 'lead: Ruang Heart: setiap pengunci Heart ditahan (Yaric, Velthia; dua kali per adegan)', desc: 'Pengunci Heart terpasang: klik palang berat, hantaman batu, lonceng rendah E3 dan dengung 82Hz.', recipe: 'Klik BP + thump 150->70Hz + parsial batu 110Hz tau x4; lonceng 164.8/329.6Hz; sine 82.4Hz; reverb 1.4.' }),
  E8('SFX_HEART_UNSEAL', 'world', { minIntervalMs: 2000, gain: 0.7, trigger: 'lead: Ruang Heart: kedua pengunci dibuka bersama (C4 heartOpen)', desc: 'Heart terbuka: mekanisme batu menggerus, enam denting harmonik menaik, akor lembut, hantaman dalam dan denting hangat penutup.', recipe: 'Noise coklat LP 260Hz AM 6Hz; lonceng D4-A4-D5-F#5-A5-D6 berjarak 180ms; hum 4 sine; thump 70->34Hz + klik + parsial batu di 1.55s; lonceng 587Hz; reverb 1.6.' }),
  E8('SFX_TOWER_COLLAPSE_DISTANT', 'world', { minIntervalMs: 3000, gain: 0.62, trigger: 'lead: jendela busur Ruang Heart ke Aveloria (C4-04): menara runtuh dari kejauhan; sekali', desc: 'Runtuhnya menara dari jauh: gemuruh coklat sangat teredam, empat dentum jauh yang makin kecil, serpihan samar. Disengaja redam dan "jauh" (gain rendah).', recipe: 'Noise coklat LP 140->90Hz swell 1.2s; empat thump 62->30Hz LP 140Hz (1/0.8/0.55/0.35); crackle LP 900Hz; sine 70->45Hz; reverb 2.0 lalu LP 480Hz.' }),

  E8('SFX_VARLGRIM_STAFF_SWING', 'boss', { variants: 2, minIntervalMs: 250, gain: 0.85, trigger: 'lead: BattleScene: keeper_strike / fracture_strike (anticipation -> swing), satu kali per ayunan; dua variasi', desc: 'Ayunan staf kayu besar: whoosh rendah menanjak 260->1300Hz lalu meredup, derit kayu, badan sine rendah. Lebih berat dan lambat dari SFX_GREATSWORD_SWING.', recipe: 'Noise BP 260->1300->520Hz Q1.3 swell 300ms + sine 150->80Hz + saw BP derit; dua variasi (badan 150/162Hz).' }),
  E8('SFX_VARLGRIM_STAFF_IMPACT', 'boss', { variants: 2, minIntervalMs: 200, gain: 1.0, trigger: 'lead: BattleScene: kontak staf (keeper_strike / fracture_strike), sekali di kontak, bukan di telegraf', desc: 'Hantaman kayu tua: gedebuk, resonansi kayu (parsial 170Hz), retak kayu, ketukan lantai batu. "Wood impact" dari SKILLS_AND_BOSSES.', recipe: 'Thump 130->42Hz + parsial kayu 170Hz (1/1.58/2.43/3.71x) + noise BP 900Hz + klik + parsial batu 95Hz; saturasi 1.4; reverb kering 0.6.' }),
  E8('SFX_TEMPORAL_BIND', 'boss', { variants: 2, minIntervalMs: 500, gain: 0.8, trigger: 'lead: BattleScene: time_bind / saat status ikatan temporal menempel pada target (sekali)', desc: '"Dry ticking" halus: tongkat ditanam (gedebuk + kayu), sembilan tik kering makin renggang, kilau lonceng terbalik teredam, dengung rendah. Bukan jam dinding.', recipe: 'Thump 110->60Hz + parsial kayu; 9 tik deselerasi 1.5kHz HP 1.8k amp 0.35; lonceng 330/495Hz terbalik LP 2.2k; sine 82->70Hz.' }),
  E8('SFX_TIME_DISTORTION', 'boss', { minIntervalMs: 1000, gain: 0.8, trigger: 'lead: BattleScene: distortion_wave (seluruh barisan; fase 2); juga seal_pulse bila perlu', desc: 'Distorsi waktu: saw jatuh seperti pita berhenti, sapuan noise turun, tik tidak beraturan melambat, kilau terbalik, denyut sub 5Hz, hantaman penutup.', recipe: 'Saw 330->55Hz LP 1.8k turun; noise BP 3.5k->300Hz; 10 tik deselerasi + jitter; lonceng 220/311/466Hz terbalik; sine 60Hz AM 5Hz; thump.' }),
  E8('SFX_BOSS_PHASE_SHIFT', 'boss', { minIntervalMs: 1500, gain: 0.8, trigger: 'lead: BattleScene: phase_shift (jeda transisi fase 1->2 dan 2->3, tanpa damage)', desc: 'Pergeseran fase: sapuan naik, gong rendah 98Hz, retak pendek, satu tik terakhir lalu hening.', recipe: 'Noise BP 400->2500Hz swell 450ms; lonceng 98Hz tau x3; klik; thump 75->36Hz; satu tik di 1.35s; reverb 1.4.' }),
  E8('SFX_FRACTURE_MARK', 'boss', { variants: 2, minIntervalMs: 400, gain: 0.75, trigger: 'lead: BattleScene: fracture_mark menandai target (fase 2); sekali per penandaan', desc: 'Penanda retakan: sapuan sine naik, retak kaca kering, denting tinggi, dua tik; dua variasi.', recipe: 'Sine 500->1900Hz; crackle BP; parsial 1568/1608Hz; dua tik 1.8kHz; thump 200Hz; reverb kecil.' }),

  E8('SFX_METEOR_CHARGE', 'meteor', { minIntervalMs: 1500, gain: 0.65, trigger: 'lead: BattleScene: meteor_call / meteor_hold (telegraf, langit ditahan); sekali per panggilan dan sekali per hold', desc: 'Gemuruh jauh: staf diangkat (derit kayu), gemuruh coklat membesar pelan, sub 40->62Hz dengan harmonik, desir angin tipis. "Distant rumble" tanpa melodi.', recipe: 'Noise coklat LP 110->200Hz swell 1.6s; sine 40->62Hz + 80->124Hz; noise BP 500->900Hz; saw BP derit; reverb 1.8 teredam.' }),
  E8('SFX_METEOR_DESCENT', 'meteor', { minIntervalMs: 1500, gain: 0.7, trigger: 'lead: BattleScene: meteor_fall fase jatuh (kamera mengikuti); langsung disambung SFX_METEOR_IMPACT', desc: 'Meteor jatuh: raungan pink noise yang LP-nya membuka 250->2500Hz, sub menanjak, serpihan terbalik, desing sempit tipis; berakhir keras lalu dipotong (fade 80ms) untuk disambung tabrakan.', recipe: 'Noise pink LP 250->2500Hz amplop kuadrat 1.75s; sine 45->90Hz; crackle terbalik; noise BP 700->2200Hz Q6 tipis.' }),
  E8('SFX_METEOR_IMPACT', 'meteor', { minIntervalMs: 3000, gain: 1.0, trigger: 'lead: BattleScene: meteor_fall dampak. JANGAN memutar SFX apa pun ~0.6 s sesudahnya ("keheningan" aftermath); mulai SFX_AEGIS_STRESS di dampak bila perisai menahan', desc: 'Tabrakan besar: klik penuh-pita, boom sub 85->24Hz, gemuruh coklat, batu bergema, serpihan; ekor sengaja meluruh ke senyap pada 0.9 s terakhir.', recipe: 'Klik 0.4-7k; sine 85->24Hz tau 450ms; noise coklat LP 160Hz tau 700ms; parsial batu 70Hz x6; crackle; noise BP; saturasi 2.0 + reverb 1.8; amplop meluruh ke 0 mulai 2.4s.' }),

  E8('SFX_AEGIS_CAST', 'aegis', { minIntervalMs: 2000, gain: 0.8, trigger: 'lead: BattleScene: velthia_aegis (antisipasi -> muatan); sekali per cast', desc: 'Perlindungan dirapal: lima lapis sine harmonik (D3-A3-D4-A4-D5) masuk bertahap dan mengembang, kilau udara, lalu satu denting D5/A5 saat muatan penuh. Bukan sapuan sirene.', recipe: 'Lima sine harmonik (detune 0.4%) masuk berjarak 300ms, swell 0.8s; noise BP 6k tipis; lonceng 587/880Hz di 1.65s + thump 90Hz; reverb 1.3.' }),
  E8('SFX_AEGIS_FORM', 'aegis', { minIntervalMs: 1000, gain: 0.8, trigger: 'lead: BattleScene: pembentukan perisai (sesudah SFX_AEGIS_CAST); sekali', desc: 'Perisai terbentuk: dengung D3/A3 lebar, empat denting D5-F#5-A5-D6, kilau bertremolo 3Hz, hantaman lembut penutup. Beda dari SFX_MAGIC_VELTHIA_SHIELD (ward).', recipe: 'hum sine 146.8+220Hz; lonceng 587/740/880/1175Hz berjarak 40ms; sine 880/1318Hz tremolo 3Hz; thump 110->62Hz; reverb 1.5.' }),
  E8('SFX_AEGIS_STRESS', 'aegis', { variants: 2, minIntervalMs: 800, gain: 0.75, trigger: 'lead: BattleScene: perisai menahan dampak meteor (retak bertingkat); mulai di dampak, sekali; dua variasi', desc: 'Perisai menahan: tegangan resonan (dua pasang sine berdetune, tremolo 7Hz), tekanan sub, tiga retakan kaca makin besar (klik + denting + gedebuk). Terasa berat namun tidak melengking.', recipe: 'Sine 220/222.6/330/334Hz AM 7Hz LP 900Hz; sine 55->48Hz + noise coklat LP 180Hz; tiga retakan di 0.2/0.75/1.3s (1568/1480/1397Hz) amp 0.4/0.6/0.85; reverb 1.' }),
  E8('SFX_AEGIS_FADE', 'aegis', { minIntervalMs: 1500, gain: 0.75, trigger: 'lead: BattleScene: perisai memudar sesudah aftermath meteor; sekali', desc: 'Perisai memudar: empat denting turun (D6-A5-D5-A4), kilau meluruh, dengung jatuh 294->147Hz, reverb panjang. Lega, hangat.', recipe: 'Lonceng 1175/880/587/440Hz berjarak 200ms; noise HP 7k meluruh; sine 294->147Hz; reverb 1.6 wet 0.38.' }),

  E8('SFX_RIFTBORN_ATTACK', 'boss', { variants: 3, minIntervalMs: 150, gain: 0.85, trigger: 'lead: BattleScene: Riftborn rift_lash / rift_surge (kontak, sekali); tiga variasi karena sering muncul', desc: 'Cambuk retakan: robekan saw-FM menanjak, desis noise 1.2->6kHz, serpihan retak, hantaman ringan, turunan disonan. Lebih tipis dan cepat dari SFX_ENEMY_ATTACK.', recipe: 'Saw FM 380->1100Hz BP menyapu; noise BP 1.2->6kHz; crackle; thump 170->90Hz; sine 700->300Hz; tiga variasi (nada awal +40Hz).' }),
  E8('SFX_GRAVORN_ATTACK', 'boss', { variants: 3, minIntervalMs: 200, gain: 0.9, trigger: 'lead: BattleScene: Gravorn gravorn_heave / gravorn_crush (kontak, sekali); tiga variasi', desc: 'Hantaman raksasa batu: dengus rendah, gedebuk 95->36Hz, dering batu, gemuruh coklat, serpihan. Lebih kecil dan gelap dari SFX_GROUND_SLAM.', recipe: 'Noise coklat LP 300Hz swell; thump 95->36Hz; parsial batu 140Hz x1.6; noise coklat LP 200Hz; klik; crackle; saturasi 1.4; reverb 0.7.' }),
  E8('SFX_BATTLE_TRANSITION_FINAL', 'transition', { minIntervalMs: 1500, gain: 0.85, trigger: 'lead: TransitionScene kategori `final` (masuk battle Varlgrim): menutup layar', desc: 'Transisi final: gong rendah terbalik, dua denyut lambat 58Hz, tumpukan sine rendah D2-A2-D3-A3 mengembang, lalu staf kayu ditanam (hantaman dalam + resonansi kayu).', recipe: 'Lonceng 98Hz tau x2.2 dibalik; dua thump 58->40Hz; hum 73/110/147/220Hz; parsial kayu 140Hz + thump 90->32Hz + klik di 1.0s; reverb 1.3.' }),
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
  // Phase 8 (Bab IV)
  world: { minMs: 400, maxMs: 4500, rmsMin: -30, rmsMax: -8 },
  boss: { minMs: 400, maxMs: 2300, rmsMin: -30, rmsMax: -8 },
  meteor: { minMs: 1500, maxMs: 3700, rmsMin: -32, rmsMax: -8 },
  aegis: { minMs: 1500, maxMs: 3000, rmsMin: -30, rmsMax: -8 },
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
