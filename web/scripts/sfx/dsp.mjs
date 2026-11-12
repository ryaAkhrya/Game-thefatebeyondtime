/**
 * DSP kecil untuk SFX ORIGINAL (Phase 7). Murni sintesis: osilator, noise berfilter, FM, sapuan pitch,
 * reverb Schroeder sederhana. Tanpa sampel pihak ketiga, tanpa RNG bawaan runtime (semua deterministik via PRNG berbenih).
 * Semua buffer Float32Array mono 44.1 kHz.
 */
export const SR = 44100;
const TAU = Math.PI * 2;

/** PRNG mulberry32 + helper. */
export function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, range: (lo, hi) => lo + (hi - lo) * next(), signed: () => next() * 2 - 1 };
}

/** FNV-1a 32-bit: benih tetap per id. */
export function hashSeed(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

export const buf = (sec) => new Float32Array(Math.max(1, Math.ceil(sec * SR)));
export const dbToLin = (db) => Math.pow(10, db / 20);
export const linToDb = (x) => 20 * Math.log10(Math.max(x, 1e-12));
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/** Nilai parameter yang bisa berupa angka atau fungsi waktu (detik). */
const val = (p, t) => (typeof p === 'function' ? p(t) : p);

/** Amplop siap pakai (fungsi t -> 0..1). */
export const env = {
  /** serangan linear a, peluruhan eksponensial tau */
  perc: (a, tau) => (t) => (t < a ? t / a : Math.exp(-(t - a) / tau)),
  /** ADSR: a, d, sustain level, hold sampai dur, r */
  adsr: (a, d, s, dur, r) => (t) => {
    if (t < a) return t / a;
    if (t < a + d) return 1 - (1 - s) * ((t - a) / d);
    if (t < dur) return s;
    return s * Math.max(0, 1 - (t - dur) / r);
  },
  /** swell: naik berbentuk sin^2 lalu turun */
  swell: (up, dur) => (t) => {
    if (t < up) return Math.pow(Math.sin((t / up) * Math.PI * 0.5), 2);
    return Math.max(0, 1 - (t - up) / Math.max(1e-4, dur - up));
  },
};

/** Kalikan buffer dengan fungsi amplop. */
export function applyEnv(b, fn) {
  for (let i = 0; i < b.length; i++) b[i] *= fn(i / SR);
  return b;
}

/**
 * Osilator dengan frekuensi fungsi waktu. shape: sine | tri | saw | square (polyBLEP) .
 * fm: {ratio, index} -> modulasi frekuensi sederhana (index bisa fungsi waktu).
 */
export function osc(sec, freq, shape = 'sine', fm = null, phase0 = 0) {
  const b = buf(sec);
  let ph = phase0;
  let mph = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const f = val(freq, t);
    const dt = f / SR;
    let p = ph;
    if (fm) {
      mph += (f * fm.ratio) / SR;
      p = ph + val(fm.index, t) * Math.sin(TAU * mph) / TAU;
    }
    const x = p - Math.floor(p);
    let v;
    switch (shape) {
      case 'tri': v = 4 * Math.abs(x - 0.5) - 1; break;
      case 'saw': v = 2 * x - 1 - polyBlep(x, dt); break;
      case 'square': v = (x < 0.5 ? 1 : -1) + polyBlep(x, dt) - polyBlep((x + 0.5) % 1, dt); break;
      default: v = Math.sin(TAU * x);
    }
    b[i] = v;
    ph += dt;
    if (ph > 1e6) ph -= 1e6;
  }
  return b;
}
function polyBlep(t, dt) {
  if (t < dt) { const x = t / dt; return x + x - x * x - 1; }
  if (t > 1 - dt) { const x = (t - 1) / dt; return x * x + x + x + 1; }
  return 0;
}

/** Jumlah parsial (aditif) dengan rasio & amplitudo & peluruhan sendiri: lonceng/denting. */
export function partials(sec, f0, parts, opts = {}) {
  const b = buf(sec);
  const out = b;
  for (const p of parts) {
    const f = f0 * p.ratio;
    if (f > SR * 0.45) continue;
    const tau = p.tau ?? 0.2;
    const a = p.attack ?? 0.002;
    const detune = p.detune ?? 0;
    const ph0 = p.phase ?? 0;
    for (let i = 0; i < b.length; i++) {
      const t = i / SR;
      const e = (t < a ? t / a : Math.exp(-(t - a) / tau)) * p.amp;
      if (e < 1e-5 && t > a) break;
      const fi = typeof opts.pitch === 'function' ? f * opts.pitch(t) : f;
      out[i] += e * Math.sin(TAU * (fi * t + ph0) + detune * Math.sin(TAU * 5 * t) * 0.3);
    }
  }
  return out;
}

/** Rasio parsial lonceng/gong (inharmonik). */
export const BELL = [
  { ratio: 1, amp: 1, tau: 0.45 },
  { ratio: 2.0, amp: 0.5, tau: 0.3 },
  { ratio: 2.76, amp: 0.42, tau: 0.22 },
  { ratio: 5.4, amp: 0.2, tau: 0.12 },
  { ratio: 8.93, amp: 0.08, tau: 0.07 },
];
/** Rasio parsial batu/logam tumpul (lebih redam). */
export const STONE = [
  { ratio: 1, amp: 1, tau: 0.16 },
  { ratio: 1.59, amp: 0.55, tau: 0.12 },
  { ratio: 2.14, amp: 0.4, tau: 0.09 },
  { ratio: 2.65, amp: 0.25, tau: 0.06 },
];

/** Noise: white | pink | brown. */
export function noise(sec, rng, color = 'white') {
  const b = buf(sec);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
  for (let i = 0; i < b.length; i++) {
    const w = rng.signed();
    if (color === 'pink') {
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      b[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    } else if (color === 'brown') {
      last = (last + 0.02 * w) / 1.02;
      b[i] = last * 3.5;
    } else b[i] = w;
  }
  return b;
}

/** Biquad RBJ dengan fc/Q berupa angka atau fungsi waktu. type: lp | hp | bp | notch | peak | lowshelf */
export function biquad(src, type, fc, q = 0.707, gainDb = 0) {
  const out = new Float32Array(src.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const dyn = typeof fc === 'function' || typeof q === 'function';
  let b0 = 0, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
  const coef = (t) => {
    const f = clamp(val(fc, t), 20, SR * 0.45);
    const Q = Math.max(0.1, val(q, t));
    const w = (TAU * f) / SR;
    const cw = Math.cos(w), sw = Math.sin(w);
    const al = sw / (2 * Q);
    const A = Math.pow(10, gainDb / 40);
    let B0, B1, B2, A0, A1, A2;
    switch (type) {
      case 'hp': B0 = (1 + cw) / 2; B1 = -(1 + cw); B2 = (1 + cw) / 2; A0 = 1 + al; A1 = -2 * cw; A2 = 1 - al; break;
      case 'bp': B0 = al; B1 = 0; B2 = -al; A0 = 1 + al; A1 = -2 * cw; A2 = 1 - al; break;
      case 'notch': B0 = 1; B1 = -2 * cw; B2 = 1; A0 = 1 + al; A1 = -2 * cw; A2 = 1 - al; break;
      case 'peak': B0 = 1 + al * A; B1 = -2 * cw; B2 = 1 - al * A; A0 = 1 + al / A; A1 = -2 * cw; A2 = 1 - al / A; break;
      default: B0 = (1 - cw) / 2; B1 = 1 - cw; B2 = (1 - cw) / 2; A0 = 1 + al; A1 = -2 * cw; A2 = 1 - al; // lp
    }
    b0 = B0 / A0; b1 = B1 / A0; b2 = B2 / A0; a1 = A1 / A0; a2 = A2 / A0;
  };
  if (!dyn) coef(0);
  for (let i = 0; i < src.length; i++) {
    if (dyn && (i & 15) === 0) coef(i / SR);
    const x = src[i];
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    out[i] = y;
  }
  return out;
}

/** Reverb Schroeder (4 comb + 2 allpass). b harus punya ekor kosong cukup untuk meluruh. */
export function reverb(src, { room = 1, wet = 0.25, damp = 0.4, fb = 0.78 } = {}) {
  const combMs = [29.7, 37.1, 41.1, 43.7].map((m) => Math.round((m * room * SR) / 1000));
  const apMs = [5.0, 1.7].map((m) => Math.round((m * SR) / 1000));
  const out = new Float32Array(src.length);
  const wetBuf = new Float32Array(src.length);
  for (const d of combMs) {
    const line = new Float32Array(d);
    let idx = 0, lp = 0;
    for (let i = 0; i < src.length; i++) {
      const y = line[idx];
      lp = y * (1 - damp) + lp * damp;
      line[idx] = src[i] + lp * fb;
      idx = (idx + 1) % d;
      wetBuf[i] += y * 0.25;
    }
  }
  let sig = wetBuf;
  for (const d of apMs) {
    const line = new Float32Array(d);
    let idx = 0;
    const o = new Float32Array(sig.length);
    for (let i = 0; i < sig.length; i++) {
      const z = line[idx];
      const v = sig[i] + z * 0.5;
      line[idx] = v;
      o[i] = z - v * 0.5;
      idx = (idx + 1) % d;
    }
    sig = o;
  }
  for (let i = 0; i < src.length; i++) out[i] = src[i] * (1 - wet * 0.5) + sig[i] * wet * 2;
  return out;
}

/** Campur src ke dst mulai offset (detik) dengan gain. dst tidak diubah ukurannya (dipotong). */
export function mixInto(dst, src, offsetSec = 0, gain = 1) {
  const o = Math.round(offsetSec * SR);
  for (let i = 0; i < src.length; i++) {
    const j = i + o;
    if (j >= dst.length) break;
    if (j >= 0) dst[j] += src[i] * gain;
  }
  return dst;
}

export function reversed(b) {
  const out = new Float32Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b[b.length - 1 - i];
  return out;
}

/** Penjumlahan beberapa buffer dengan gain (panjang = terpanjang). */
export function sum(...items) {
  const n = Math.max(...items.map(([b]) => b.length));
  const out = new Float32Array(n);
  for (const [b, g = 1] of items) for (let i = 0; i < b.length; i++) out[i] += b[i] * g;
  return out;
}

export function saturate(b, drive = 1.5) {
  const norm = Math.tanh(drive);
  for (let i = 0; i < b.length; i++) b[i] = Math.tanh(b[i] * drive) / norm;
  return b;
}

/** Klik pendek (impuls berfilter) untuk transient. */
export function click(sec, rng, { hp = 2000, lp = 9000, tau = 0.004 } = {}) {
  let n = noise(sec, rng, 'white');
  applyEnv(n, env.perc(0.0003, tau));
  n = biquad(n, 'hp', hp, 0.7);
  return biquad(n, 'lp', lp, 0.7);
}

/** Ledakan klik acak (kerikil/debris): impuls jarang dengan amplitudo berpeluruhan. */
export function crackle(sec, rng, density, tau, startSec = 0) {
  const b = buf(sec);
  const n = b.length;
  for (let i = Math.round(startSec * SR); i < n; i++) {
    const t = i / SR - startSec;
    if (rng.next() < density * Math.exp(-t / tau) / SR) b[i] = rng.signed() * (0.4 + 0.6 * rng.next());
  }
  return biquad(b, 'bp', 3200, 0.8);
}

/** Penyelesaian: hilangkan DC, fade in/out, normalisasi puncak (dBFS). */
export function finish(b, { fadeIn = 0.002, fadeOut = 0.03, peakDb = -3, dcBlock = true } = {}) {
  const out = Float32Array.from(b);
  if (dcBlock) {
    let x1 = 0, y1 = 0;
    const R = 0.995;
    for (let i = 0; i < out.length; i++) { const x = out[i]; const y = x - x1 + R * y1; x1 = x; y1 = y; out[i] = y; }
  }
  const nIn = Math.round(fadeIn * SR);
  const nOut = Math.min(out.length, Math.round(fadeOut * SR));
  for (let i = 0; i < nIn && i < out.length; i++) out[i] *= i / nIn;
  for (let i = 0; i < nOut; i++) { const k = i / nOut; out[out.length - 1 - i] *= Math.sin(k * Math.PI * 0.5); }
  let peak = 0;
  for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i]));
  const g = peak > 0 ? dbToLin(peakDb) / peak : 0;
  for (let i = 0; i < out.length; i++) out[i] *= g;
  return out;
}

/** Float32 -> WAV PCM16 mono 44.1 kHz (Buffer). */
export function toWav(samples) {
  const dataLen = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataLen);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + dataLen, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SR, 24); buffer.writeUInt32LE(SR * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(dataLen, 40);
  for (let i = 0; i < samples.length; i++) {
    buffer.writeInt16LE(Math.round(clamp(samples[i], -1, 1) * 32767), 44 + i * 2);
  }
  return buffer;
}

/** Statistik loudness dari Float32 atau Int16 yang sudah dinormalisasi. */
export function stats(samples) {
  let peak = 0, sq = 0;
  for (let i = 0; i < samples.length; i++) { const a = Math.abs(samples[i]); if (a > peak) peak = a; sq += samples[i] * samples[i]; }
  const rms = Math.sqrt(sq / Math.max(1, samples.length));
  return { peakDb: linToDb(peak), rmsDb: linToDb(rms), durationMs: (samples.length / SR) * 1000 };
}

/** Nada MIDI -> Hz. */
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
