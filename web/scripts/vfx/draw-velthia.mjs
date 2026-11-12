// Atlas vfx_velthia: sihir kerajaan Velthia. Bahasa bentuk = LENGKUNG, SIMETRIS, cincin/bulan sabit/kelopak membulat,
// aksen plum + lime pahit + emas pucat (config/palette.ts). Dibedakan dari Torvan (sudut tajam, hijau-cokelat tanah).
// Juga memuat heal_sparkle & shield_hit_spark (efek bersama).
import { Cv } from './kit.mjs';

export const PALETTE = {
  ink: '#1D1625', plum: '#3B2A4A', plumLift: '#4D3A5F', plumLine: '#6A5580', mist: '#8A77A0', rose: '#C97B84', petal: '#E3B4C0',
  lime: '#C7D96A', limeD: '#8FA044', limeDD: '#5E7034', gold: '#E3B66A', pale: '#F3E2A8', paper: '#ECE3D6',
};

const rad = (d) => (d * Math.PI) / 180;
/** paksa simetri kiri-kanan (kiri menang) */
function sym(cv) { for (let y = 0; y < cv.h; y++) for (let x = 0; x < Math.floor(cv.w / 2); x++) cv.d[y * cv.w + (cv.w - 1 - x)] = cv.d[y * cv.w + x]; return cv; }

function dot(cv, x, y, c) { cv.set(x, y, c); }
function plus(cv, x, y, c, c2 = c) { cv.set(x, y, c2); cv.set(x - 1, y, c); cv.set(x + 1, y, c); cv.set(x, y - 1, c); cv.set(x, y + 1, c); }

export function frames(P) {
  const out = [];
  const add = (group, name, cv, pivotY = 0.5) => out.push({ group, name, cv, pivotY });

  // ------------------------------------------------ motes (partikel)
  { const c = new Cv(5, 5); plus(c, 2, 2, P.lime, P.pale); add('motes', 'vmote_a', c); }
  { const c = new Cv(7, 7); plus(c, 3, 3, P.pale, P.paper); c.set(3, 1, P.gold); c.set(3, 5, P.gold); c.set(1, 3, P.gold); c.set(5, 3, P.gold); add('motes', 'vmote_b', c); }
  { const c = new Cv(5, 5); c.set(2, 0, P.limeD); c.set(1, 1, P.limeD); c.set(3, 1, P.limeD); c.set(0, 2, P.limeD); c.set(4, 2, P.limeD); c.set(1, 2, P.lime); c.set(3, 2, P.lime); c.set(2, 1, P.lime); c.set(2, 2, P.pale); c.set(2, 3, P.lime); c.set(1, 3, P.limeD); c.set(3, 3, P.limeD); c.set(2, 4, P.limeD); add('motes', 'vmote_c', c); }
  { const c = new Cv(3, 3); c.rect(0, 0, 2, 2, P.pale); c.set(1, 1, P.gold); add('motes', 'vmote_d', c); }

  // ------------------------------------------------ velthia_pulse: telapak membuka
  {
    const c = new Cv(32, 32);
    [[11, 14], [15, 12], [19, 14]].forEach(([x, y]) => c.rect(x, y, 2, 2, P.lime)); c.rect(15, 18, 2, 2, P.pale);
    add('velthia_pulse_palm', 'vpalm_1', sym(c));
  }
  {
    const c = new Cv(32, 32);
    c.ring(16, 18, 6, 6, 1, P.plumLine);
    [[-90, 7], [-60, 6], [-120, 6], [-30, 5], [-150, 5]].forEach(([a, l], i) => c.petal(16 + Math.cos(rad(a)) * 6, 18 + Math.sin(rad(a)) * 6, l, 3, a, (x, y, u, v) => (v < 0 ? P.lime : P.limeD)));
    c.ellipse(16, 18, 2, 2, P.pale);
    add('velthia_pulse_palm', 'vpalm_2', sym(c));
  }
  {
    const c = new Cv(32, 32);
    c.ring(16, 18, 8, 8, 1, P.plumLine); c.ring(16, 18, 6, 6, 1, P.lime);
    [[-90, 10], [-62, 9], [-118, 9], [-34, 7], [-146, 7]].forEach(([a, l]) => c.petal(16 + Math.cos(rad(a)) * 7, 18 + Math.sin(rad(a)) * 7, l, 3, a, (x, y, u, v) => (u > 0.45 ? P.pale : v < 0 ? P.lime : P.limeD)));
    c.ellipse(16, 18, 2.5, 2.5, P.pale); c.set(15, 17, P.paper);
    add('velthia_pulse_palm', 'vpalm_3', sym(c));
  }
  {
    const c = new Cv(32, 32);
    c.ring(16, 18, 9, 9, 1, P.plumLine, (x, y, a) => Math.abs(Math.sin(a * 2)) < 0.25);
    [[-90, 8], [-55, 7], [-125, 7], [-20, 5], [-160, 5]].forEach(([a, l]) => c.petal(16 + Math.cos(rad(a)) * 8, 18 + Math.sin(rad(a)) * 8, l, 2, a, (x, y, u, v) => (v < 0 ? P.lime : P.limeD)));
    c.ellipse(16, 18, 2, 2, P.lime); plus(c, 16, 6, P.pale);
    add('velthia_pulse_palm', 'vpalm_4', sym(c));
  }

  // ------------------------------------------------ velthia_pulse: busur cahaya tunggal (cembung ke kanan), normal + calm
  for (const calm of [false, true]) {
    [[26, 4], [40, 7], [52, 6]].forEach(([span, mw], k) => {
      const c = new Cv(28, 36);
      const C = [3, 18], R = 16;
      for (let y = 0; y < 36; y++)
        for (let x = 0; x < 28; x++) {
          const dx = x + 0.5 - C[0], dy = C[1] - (y + 0.5);
          const r = Math.hypot(dx, dy), th = (Math.atan2(dy, dx) * 180) / Math.PI;
          if (Math.abs(th) > span) continue;
          const u = Math.abs(th) / span;
          const w = (mw * Math.sqrt(Math.max(0, 1 - u ** 3))) / 2;
          const d = r - R;
          if (w < 0.4 || Math.abs(d) > w) continue;
          const q = Math.abs(d) / w;
          const core = calm ? P.pale : P.paper;
          c.set(x, y, q < 0.35 ? core : q < 0.75 ? (calm ? P.lime : P.pale) : (d > 0 ? P.lime : P.limeD));
        }
      add('velthia_pulse_arc', `varc_${k + 1}${calm ? '_c' : ''}`, c);
    });
  }

  // ------------------------------------------------ pulse hit (cincin membesar)
  for (const calm of [false, true]) {
    const sfx = calm ? '_c' : '';
    const hot = calm ? P.gold : P.pale, edge = calm ? P.limeD : P.lime;
    {
      const c = new Cv(32, 32); c.ellipse(16, 16, 3, 3, hot); c.ring(16, 16, 5, 5, 1, edge);
      add('velthia_pulse_hit', `vhit_1${sfx}`, sym(c));
    }
    {
      const c = new Cv(32, 32); c.ring(16, 16, 9, 9, 1, hot);
      [-90, 0, 90, 180].forEach((a) => c.petal(16 + Math.cos(rad(a)) * 9, 16 + Math.sin(rad(a)) * 9, 5, 3, a, calm ? P.gold : P.paper));
      [-45, 45, 135, 225].forEach((a) => c.set(16 + Math.cos(rad(a)) * 7, 16 + Math.sin(rad(a)) * 7, edge));
      add('velthia_pulse_hit', `vhit_2${sfx}`, sym(c));
    }
    if (calm) continue;
    { const c = new Cv(32, 32); c.ring(16, 16, 12, 12, 1, P.lime, (x, y, a) => Math.abs(Math.sin(a * 4)) < 0.35); for (let i = 0; i < 8; i++) c.set(16 + Math.cos(rad(i * 45 + 22)) * 13, 16 + Math.sin(rad(i * 45 + 22)) * 13, P.pale); add('velthia_pulse_hit', 'vhit_3', sym(c)); }
    { const c = new Cv(32, 32); for (let i = 0; i < 8; i++) c.set(16 + Math.cos(rad(i * 45)) * 14.5, 16 + Math.sin(rad(i * 45)) * 14.5, i % 2 ? P.limeD : P.lime); add('velthia_pulse_hit', 'vhit_4', sym(c)); }
  }

  // ------------------------------------------------ velthia_mend: cincin di kaki (pivot tengah)
  [6, 10, 14, 18].forEach((rx, k) => {
    const c = new Cv(40, 14);
    const skip = k === 3 ? (x, y, a) => Math.abs(Math.sin(a * 3)) < 0.3 : undefined;
    c.ring(20, 7, rx, Math.max(2.2, rx * 0.34), 1, (x, y, dx, dy) => (dy < -0.2 && dx < 0.3 ? P.pale : dy > 0.4 ? P.limeD : P.lime), skip);
    if (k >= 1) c.ring(20, 7, rx - 3, Math.max(1.5, (rx - 3) * 0.3), 1, P.limeDD);
    add('velthia_mend_ring', `vmend_${k + 1}`, sym(c));
  });

  // ------------------------------------------------ velthia_ward: sigil perisai 48x56 (simetris)
  {
    const cx = 24, cy = 28, RX = 17, RY = 22;
    const mk = (stage) => {
      const c = new Cv(48, 56);
      if (stage === 1) { [[0, -RY], [0, RY], [-RX, 0], [RX, 0]].forEach(([dx, dy]) => { plus(c, cx + dx, cy + dy, P.pale, P.paper); }); c.ring(cx, cy, 4, 4, 1, P.plumLine, (x, y, a) => Math.abs(Math.sin(a * 2)) < 0.5); return c; }
      const ring = (th, col, skipFn) => c.ring(cx, cy, RX, RY, th, col, skipFn);
      if (stage === 2) { ring(1, P.lime, (x, y) => Math.abs(y + 0.5 - cy) < RY * 0.55 && !(Math.abs(x + 0.5 - cx) > RX * 0.9)); [[0, -RY], [0, RY]].forEach(([dx, dy]) => plus(c, cx + dx, cy + dy, P.pale)); return c; }
      ring(1, P.lime);
      c.ring(cx, cy, RX - 3, RY - 3, 1, P.plumLine);
      c.ring(cx, cy, RX + 2, RY + 2, 1, P.plum, (x, y, a) => Math.abs(Math.sin(a * 6)) < 0.55);
      if (stage >= 4) {
        for (let y = 0; y < 56; y++) for (let x = 0; x < 48; x++) { const dx = (x + 0.5 - cx) / (RX - 4), dy = (y + 0.5 - cy) / (RY - 4); if (dx * dx + dy * dy < 1 && !c.get(x, y) && (x % 2 === 0 && y % 2 === 0)) c.set(x, y, stage === 6 ? P.plumLine : P.mist); }
        c.ring(cx, cy, RX - 1, RY - 1, 1, (x, y, dx, dy) => (dx + dy < -0.3 ? P.pale : P.lime), (x, y, a) => !(a < -1.2 && a > -2.2) && !(a > 1.0 && a < 2.1 && false));
      }
      if (stage === 5) {
        for (let i = 0; i < 6; i++) { const a = rad(i * 60 + 30); plus(c, cx + Math.cos(a) * (RX - 1), cy + Math.sin(a) * (RY - 1), P.gold, P.pale); }
        c.ring(cx, cy, 11, 15, 1, (x, y, dx, dy) => (dy < 0 ? P.pale : P.lime), (x) => Math.abs(x + 0.5 - cx) < 5); // dua bulan sabit "( )" simetris
      }
      if (stage === 6) c.dither(2);
      return c;
    };
    for (let s = 1; s <= 6; s++) add('velthia_ward', `vward_${s}`, sym(mk(s)));
  }

  // ------------------------------------------------ shield_hit_spark 24x24 (+calm)
  for (const calm of [false, true]) {
    const sfx = calm ? '_c' : '';
    const hot = calm ? P.gold : P.paper, mid = calm ? P.lime : P.pale;
    {
      const c = new Cv(24, 24);
      for (const a of [0, 90, 180, 270]) c.petal(12 + Math.cos(rad(a)) * 1, 12 + Math.sin(rad(a)) * 1, 8, 3, a, (x, y, u) => (u < 0.2 ? hot : mid));
      c.ellipse(12, 12, 2, 2, hot);
      add('shield_hit_spark', `vspark_1${sfx}`, sym(c));
    }
    {
      const c = new Cv(24, 24);
      c.ring(12, 12, 6, 6, 1, mid);
      for (const a of [0, 90, 180, 270]) c.petal(12 + Math.cos(rad(a)) * 6, 12 + Math.sin(rad(a)) * 6, 6, 3, a, calm ? P.limeD : P.gold);
      [45, 135, 225, 315].forEach((a) => c.set(12 + Math.cos(rad(a)) * 4, 12 + Math.sin(rad(a)) * 4, hot));
      add('shield_hit_spark', `vspark_2${sfx}`, sym(c));
    }
    if (calm) continue;
    { const c = new Cv(24, 24); for (let i = 0; i < 8; i++) c.set(12 + Math.cos(rad(i * 45)) * 9, 12 + Math.sin(rad(i * 45)) * 9, i % 2 ? P.lime : P.pale); c.ring(12, 12, 8, 8, 1, P.limeD, (x, y, a) => Math.abs(Math.sin(a * 4)) < 0.6); add('shield_hit_spark', 'vspark_3', sym(c)); }
    { const c = new Cv(24, 24); for (let i = 0; i < 4; i++) c.set(12 + Math.cos(rad(i * 90 + 45)) * 10, 12 + Math.sin(rad(i * 90 + 45)) * 10, P.limeD); add('shield_hit_spark', 'vspark_4', sym(c)); }
  }

  // ------------------------------------------------ velthia_bloom 48x48 (pivot pangkal batang)
  {
    const stem = (c, h) => { for (let y = 0; y < h; y++) { c.set(23, 42 - y, P.limeD); c.set(24, 42 - y, P.lime); } };
    const baseLeaves = (c, s) => { c.petal(23, 40, s, 4, 200, (x, y, u, v) => (v < 0 ? P.lime : P.limeD)); c.petal(25, 40, s, 4, -20, (x, y, u, v) => (v < 0 ? P.lime : P.limeD)); };
    const flower = (c, cy, n, len, offset, colA, colB) => { for (let i = 0; i < n; i++) { const a = -90 + offset + i * (360 / n); c.petal(24 + Math.cos(rad(a)) * 2, cy + Math.sin(rad(a)) * 2, len, 5, a, (x, y, u, v) => (v < 0 ? colA : colB)); } };
    const ground = (c, rx) => c.ring(24, 42, rx, rx * 0.3, 1, P.limeD);
    // 1: biji bercahaya
    { const c = new Cv(48, 48); ground(c, 6); c.rect(23, 39, 3, 3, P.pale); baseLeaves(c, 5); add('velthia_bloom', 'vbloom_1', sym(c), 42 / 48); }
    // 2: kuncup
    { const c = new Cv(48, 48); ground(c, 8); stem(c, 8); baseLeaves(c, 7); c.petal(24, 34, 9, 6, -90, (x, y, u, v) => (v < 0 ? P.rose : P.plumLine)); add('velthia_bloom', 'vbloom_2', sym(c), 42 / 48); }
    // 3: setengah mekar
    { const c = new Cv(48, 48); ground(c, 10); stem(c, 14); baseLeaves(c, 9); flower(c, 28, 2, 8, 0, P.petal, P.rose); c.petal(24, 29, 9, 5, -90, (x, y, u, v) => (v < 0 ? P.petal : P.rose)); add('velthia_bloom', 'vbloom_3', sym(c), 42 / 48); }
    // 4: mekar enam kelopak
    { const c = new Cv(48, 48); ground(c, 12); stem(c, 14); baseLeaves(c, 10); flower(c, 26, 6, 9, 0, P.petal, P.rose); c.ellipse(24, 26, 2.5, 2.5, P.pale); c.set(23, 25, P.paper); add('velthia_bloom', 'vbloom_4', sym(c), 42 / 48); }
    // 5: penuh dua lapis + cincin + butir cahaya
    { const c = new Cv(48, 48); ground(c, 17); c.ring(24, 42, 12, 4, 1, P.lime); stem(c, 14); baseLeaves(c, 11); flower(c, 26, 8, 12, 22.5, P.paper, P.petal); flower(c, 26, 8, 9, 0, P.petal, P.rose); c.ellipse(24, 26, 3, 3, P.pale); c.rect(23, 25, 2, 2, P.paper); [[8, 14], [40, 14], [12, 6], [36, 6]].forEach(([x, y]) => plus(c, x, y, P.pale, P.lime)); add('velthia_bloom', 'vbloom_5', sym(c), 42 / 48); }
    // 6: kelopak mulai lepas
    { const c = new Cv(48, 48); ground(c, 17); c.ring(24, 42, 12, 4, 1, P.limeD, (x, y, a) => Math.abs(Math.sin(a * 3)) < 0.4); stem(c, 14); baseLeaves(c, 11); flower(c, 26, 6, 9, 0, P.petal, P.rose); c.ellipse(24, 26, 3, 3, P.pale); [[10, 18], [38, 20], [14, 10], [34, 8], [24, 4]].forEach(([x, y]) => c.petal(x, y, 4, 3, 20, (px, py, u, v) => (v < 0 ? P.petal : P.rose))); add('velthia_bloom', 'vbloom_6', sym(c), 42 / 48); }
    // 7: memudar
    { const c = new Cv(48, 48); ground(c, 14); stem(c, 10); baseLeaves(c, 8); flower(c, 28, 6, 6, 0, P.petal, P.rose); c.dither(1); [[14, 14], [34, 12]].forEach(([x, y]) => plus(c, x, y, P.pale)); add('velthia_bloom', 'vbloom_7', sym(c), 42 / 48); }
  }
  // kelopak kecil jatuh
  { const c = new Cv(6, 5); c.petal(0.5, 1, 5, 3, 15, (x, y, u, v) => (v < 0 ? P.petal : P.rose)); add('petals', 'vpetal_a', c); }
  { const c = new Cv(6, 5); c.petal(0.5, 1, 5, 3, -20, (x, y, u, v) => (v < 0 ? P.paper : P.petal)); add('petals', 'vpetal_b', c); }
  { const c = new Cv(5, 5); c.petal(0.5, 1, 4, 3, 40, (x, y, u, v) => (v < 0 ? P.rose : P.plumLine)); add('petals', 'vpetal_c', c); }

  // ------------------------------------------------ velthia_concord: simpul penghubung + sigil ujung
  { const c = new Cv(9, 9); plus(c, 4, 4, P.limeD); c.set(4, 4, P.pale); add('concord', 'vnode_1', sym(c)); }
  { const c = new Cv(9, 9); c.ring(4.5, 4.5, 3.5, 3.5, 1, P.lime); c.set(4, 4, P.plumLine); c.set(5, 5, P.plumLine); c.set(4, 5, P.plumLine); c.set(5, 4, P.plumLine); add('concord', 'vnode_2', sym(c)); }
  { const c = new Cv(9, 9); c.ring(4.5, 4.5, 4, 4, 1, P.pale); c.ring(4.5, 4.5, 2, 2, 1, P.lime); c.rect(4, 4, 1, 1, P.paper); add('concord', 'vnode_3', c); }
  [0, 15, 30, 45].forEach((a0, k) => {
    const c = new Cv(24, 24);
    c.ring(12, 12, 10.5, 10.5, 1, P.plumLine); 
    for (let i = 0; i < 4; i++) { const a = a0 + i * 90; c.petal(12 + Math.cos(rad(a)) * 2, 12 + Math.sin(rad(a)) * 2, 6, 3, a, (x, y, u, v) => (v < 0 ? P.pale : P.lime)); }
    for (let i = 0; i < 4; i++) { const a = rad(a0 + 45 + i * 90); c.set(12 + Math.cos(a) * 10, 12 + Math.sin(a) * 10, P.gold); }
    c.ellipse(12, 12, 1.6, 1.6, P.paper);
    add('concord', `vsigil_${k + 1}`, c);
  });
  return out;
}
