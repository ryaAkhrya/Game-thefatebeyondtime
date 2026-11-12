// Atlas vfx_aegis (Phase 8): Perlindungan (Ultimate Shield Velthia). Bahasa bentuk = LENGKUNG RUNCING berlapis (lancet/gerbang, kelopak),
// emas pucat + lime pahit di atas plum pekat. BUKAN lingkaran transparan, BUKAN oval sigil `velthia_ward`. Perisai = satu lengkung luar penuh
// (kaki sampai tanah, di luar kedua sekutu) + dua kanopi lengkung runcing di atas kepala + sigil tanah. Hold = kontur saja (terbaca, tak menutup karakter).
// Frame perisai 176x144, pivot (0,5; ~0,9) = garis tanah titik tengah dua sekutu.
import { Cv, Rng } from './kit.mjs';
import { clamp, crackPath, glint, polyline, rad, remap } from './draw-util.mjs';

export const PALETTE = {
  ink: '#1D1625', plum: '#3B2A4A', plumL: '#4D3A5F', plumLine: '#6A5580', mist: '#8A77A0',
  lime: '#C7D96A', limeD: '#8FA044', limeDD: '#5E7034', gold: '#E3B66A', goldD: '#A8742F', pale: '#F3E2A8', paper: '#ECE3D6',
};

const W = 192, H = 144, CX = 96, BASE = 128;

/** lengkung runcing (lancet): setengah-lebar w, titik sambung ys, tinggi puncak di atas ys = ha; kaki turun sampai y=base */
function lancet(cx, ys, w, ha, base) {
  const R = (ha * ha + w * w) / (2 * w);
  const th1 = Math.acos(-(R - w) / R);
  const pts = [];
  for (let y = base; y > ys; y--) pts.push([cx - w, y]);
  const n = Math.ceil(R * (Math.PI - th1));
  const arc = [];
  for (let i = 0; i <= n; i++) { const th = Math.PI - ((Math.PI - th1) * i) / n; arc.push([cx + (R - w) + R * Math.cos(th), ys - R * Math.sin(th)]); }
  pts.push(...arc);
  for (let i = arc.length - 2; i >= 0; i--) pts.push([2 * cx - arc[i][0], arc[i][1]]);
  for (let y = ys + 1; y <= base; y++) pts.push([cx + w, y]);
  return pts;
}
/** goresan 2 px: tepi kiri/atas terang (lit), kanan/bawah gelap (dark); frac = porsi lintasan dari kedua kaki menuju puncak */
function stroke2(cv, pts, lit, dark, frac = 1) {
  const t = new Cv(cv.w, cv.h);
  const n = pts.length, half = Math.floor(n / 2), take = Math.floor(half * clamp(frac, 0, 1));
  const put = (p) => { const x = Math.round(p[0]), y = Math.round(p[1]); t.set(x, y, 1); t.set(x + 1, y, 1); t.set(x, y + 1, 1); };
  for (let i = 0; i < take; i++) { put(pts[i]); put(pts[n - 1 - i]); }
  if (frac >= 1) put(pts[half]);
  for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) if (t.get(x, y)) cv.set(x, y, !t.get(x - 1, y) || !t.get(x, y - 1) ? lit : dark);
}

/** kipas lima lengkung runcing (gerbang): tengah tertinggi, pasangan tengah, pasangan luar berkaki sampai tanah */
const PANELS = [
  { id: 'c', dx: 0, ys: 50, w: 19, ha: 48, base: 58, ord: 2, lit: 'pale', dark: 'gold' },
  { id: 'l', dx: -38, ys: 60, w: 19, ha: 40, base: 68, ord: 1, lit: 'gold', dark: 'goldD' },
  { id: 'r', dx: 38, ys: 60, w: 19, ha: 40, base: 68, ord: 1, lit: 'gold', dark: 'goldD' },
  { id: 'L', dx: -76, ys: 74, w: 19, ha: 32, base: BASE, ord: 0, lit: 'lime', dark: 'limeD' },
  { id: 'R', dx: 76, ys: 74, w: 19, ha: 32, base: BASE, ord: 0, lit: 'lime', dark: 'limeD' },
].map((p) => ({ ...p, pts: lancet(CX + p.dx, p.ys, p.w, p.ha, p.base), inner: lancet(CX + p.dx, p.ys + 2, 10, Math.round(p.ha * 0.5), p.ys + 12) }));
const ALLPTS = PANELS.flatMap((p) => p.pts);

function groundSigil(cv, P, k, calm) {
  const gl = calm ? P.limeD : P.lime;
  cv.ring(CX, BASE + 2, 80, 9, 1, P.plumLine, (x, y, a) => Math.abs(Math.sin(a * 5)) < 0.3 + (1 - k) * 0.5);
  if (k > 0.3) cv.ring(CX, BASE + 2, 60, 6, 1, P.goldD, (x, y, a) => Math.abs(Math.sin(a * 7)) < 0.4);
  const n = 8;
  for (let i = 0; i < n; i++) { const a = rad(i * (360 / n) + 22.5); if (k * n > i) glint(cv, Math.round(CX + Math.cos(a) * 80), Math.round(BASE + 2 + Math.sin(a) * 9), 1, gl, calm ? P.gold : P.pale); }
}

export function frames(P) {
  const out = [];
  const add = (group, name, cv, pivotY = 0.5) => out.push({ group, name, cv, pivotY });
  const PY = (BASE + 2) / H;

  // interior lengkung luar (untuk panel kisi dither)
  const inside = new Cv(W, H);
  for (const pn of PANELS) { const t = new Cv(W, H); t.poly(pn.pts.map((q) => [q[0], q[1]]), 1); for (let i = 0; i < t.d.length; i++) if (t.d[i]) inside.d[i] = 1; }

  // ------------------------------------------------ partikel
  { const c = new Cv(5, 5); glint(c, 2, 2, 1, P.lime, P.pale); add('particles', 'amote_a', c); }
  { const c = new Cv(4, 4); c.rect(0, 0, 2, 2, P.pale); c.set(1, 1, P.gold); add('particles', 'amote_b', c); }
  { const c = new Cv(3, 3); c.rect(0, 0, 2, 2, P.gold); add('particles', 'amote_c', c); }
  { const c = new Cv(7, 6); c.poly([[0, 1], [4, 0], [6, 3], [2, 5]], (x, y) => (x + y < 5 ? P.pale : P.gold)); add('particles', 'ashard_a', c); }
  { const c = new Cv(5, 5); c.poly([[0, 0], [4, 1], [2, 4]], (x, y) => (x + y < 3 ? P.paper : P.goldD)); add('particles', 'ashard_b', c); }
  { const c = new Cv(4, 4); c.rect(0, 0, 3, 2, P.mist); c.set(0, 0, P.pale); add('particles', 'ashard_c', c); }

  // ------------------------------------------------ aegis_charge: tangan Velthia, 64x64 pusat (32,36); sihir terkumpul -> lengkung mungil terbentuk
  {
    const cx = 32, cy = 36;
    const mk = (k, calm) => {
      const c = new Cv(64, 64);
      const hi = calm ? P.gold : P.pale, mid = calm ? P.limeD : P.lime;
      if (k === 0) { c.ellipse(cx, cy, 1.6, 1.6, hi); glint(c, cx, cy, 3, mid, hi); }
      if (k === 1) { c.ring(cx, cy, 7, 7, 1, P.plumLine, (x, y, a) => Math.abs(Math.sin(a * 2)) < 0.3); c.ellipse(cx, cy, 2.4, 2.4, hi); for (let i = 0; i < 4; i++) { const a = rad(i * 90 + 45); c.set(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9, mid); } }
      if (k >= 2) {
        const w = [0, 0, 7, 9, 10, 10][k], h = [0, 0, 9, 14, 18, 20][k];
        stroke2(c, lancet(cx, cy + 2, w, h, cy + 12), k >= 4 ? hi : mid, calm ? P.goldD : P.gold, k === 2 ? 0.6 : 1);
        if (k >= 3) stroke2(c, lancet(cx, cy + 6, Math.round(w * 0.55), Math.round(h * 0.55), cy + 12), P.plumLine, P.plumL, 1);
        c.ring(cx, cy + 14, 14 + k, 3 + (k > 3 ? 1 : 0), 1, P.plumLine, (x, y, a) => Math.abs(Math.sin(a * 4)) < 0.35);
        if (k >= 4) glint(c, cx, cy + 1 - h, 3, mid, hi);
      }
      if (k === 5) for (let i = 0; i < 6; i++) { const a = rad(i * 60 + 15); c.set(cx + Math.cos(a) * 20, cy + 2 + Math.sin(a) * 9, i % 2 ? mid : hi); }
      return c;
    };
    for (let k = 0; k < 6; k++) { add('aegis_charge', `acharge_${k + 1}`, mk(k, false)); if (k >= 3) add('aegis_charge', `acharge_${k + 1}_c`, mk(k, true)); }
  }

  // ------------------------------------------------ perisai: kanopi + lengkung luar + sigil tanah
  const drawShield = (c, o) => {
    const { fo = 1, fm = 1, fi = 1, fill = 0, calm = false, pips = 0, apex = false, sigil = 1 } = o;
    const hi = calm ? P.gold : P.pale, bright = calm ? P.gold : P.paper;
    if (sigil > 0) groundSigil(c, P, sigil, calm);
    if (fill > 0) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!inside.get(x, y) || c.get(x, y)) continue;
        const on = fill === 1 ? ((x & 3) === 0 && (y & 3) === 0) : fill === 2 ? (((x + y) & 3) === 0 && (x & 1) === 0) : ((x + y) % 2 === 0 && ((x >> 1) + (y >> 1)) % 2 === 0);
        if (on) c.set(x, y, fill === 3 ? P.plumL : P.plum);
      }
    }
    const fr = [fo, fm, fi];
    for (const pn of PANELS) {
      const col = calm && pn.lit === 'lime' ? 'limeD' : pn.lit;
      stroke2(c, pn.pts, calm && pn.lit === 'pale' ? P.gold : P[col], P[pn.dark], fr[pn.ord]);
      if (fr[pn.ord] >= 1 && fill > 0 && pn.ord > 0) stroke2(c, pn.inner, P.plumLine, P.plumL, 1);
    }
    if (apex) for (const pn of PANELS) glint(c, CX + pn.dx, pn.ys - pn.ha - 3, pn.ord === 2 ? 3 : 2, pn.ord === 0 ? P.lime : P.gold, pn.ord === 2 ? bright : hi);
    if (pips) {
      const n = 14, step = ALLPTS.length / n;
      for (let i = 0; i < n; i++) { const q = ALLPTS[Math.floor((i * step + pips * (step / 4)) % ALLPTS.length)]; c.set(Math.round(q[0]) - 1, Math.round(q[1]) - 1, calm ? P.gold : P.pale); }
    }
  };
  // ------------------------------------------------ aegis_form: panel menutup bertahap
  {
    const tbl = [
      { fo: 0, fm: 0, fi: 0, sigil: 0.35 },
      { fo: 0.42, fm: 0, fi: 0, sigil: 0.7 },
      { fo: 0.82, fm: 0.4, fi: 0, sigil: 1 },
      { fo: 1, fm: 0.85, fi: 0.5, sigil: 1 },
      { fo: 1, fm: 1, fi: 1, fill: 1, apex: true },
      { fo: 1, fm: 1, fi: 1, fill: 3, apex: true },
      { fo: 1, fm: 1, fi: 1, fill: 2, apex: true },
      { fo: 1, fm: 1, fi: 1, fill: 1, apex: true, pips: 1 },
    ];
    tbl.forEach((o, i) => {
      const c = new Cv(W, H); drawShield(c, o);
      add('aegis_form', `aform_${i + 1}`, c, PY);
      if (i >= 4) { const cc = new Cv(W, H); drawShield(cc, { ...o, calm: true, fill: 0 }); add('aegis_form', `aform_${i + 1}_c`, cc, PY); }
    });
  }
  // ------------------------------------------------ aegis_hold: kontur persisten, 4 frame loop
  for (let k = 0; k < 4; k++) {
    const c = new Cv(W, H);
    drawShield(c, { apex: true, pips: k + 1, sigil: 1 });
    add('aegis_hold', `ahold_${k + 1}`, c, PY);
  }
  // ------------------------------------------------ aegis_stress: overlay retak (level 1..3 x 4 frame)
  {
    const mkCracks = (level, k, calm) => {
      const c = new Cv(W, H);
      const rg = new Rng(1000 + level * 50);
      const grow = [0.45, 0.8, 1, 1][k];
      const hi = calm ? P.gold : P.paper, mid = calm ? P.goldD : P.pale;
      const branches = [[0, 52 + level * 8, 4], [-26, 44 + level * 10, 3], [30, 40 + level * 9, 3]].slice(0, level);
      branches.forEach(([dx, len, amp], bi) => {
        const ex = CX + dx * (1 + level * 0.35), ey = 12 + len * grow;
        const pts = crackPath(CX, 12, ex, ey, amp, 5 + level, new Rng(1100 + level * 9 + bi));
        polyline(c, pts.map(([x, y]) => [x + 1, y + 1]), P.ink);
        polyline(c, pts, k === 3 ? mid : hi);
        if (level >= 2) for (let i = 1; i < pts.length - 1; i += 2) { const q = pts[i]; polyline(c, [[q[0], q[1]], [q[0] + (bi % 2 ? 7 : -7), q[1] + 5]], mid); }
      });
      if (level === 3) {
        const n = Math.floor(ALLPTS.length * 0.5 * grow);
        for (let i = 0; i < n; i += 3) { const a = ALLPTS[i], b = ALLPTS[ALLPTS.length - 1 - i]; c.rect(Math.round(a[0]) - 1, Math.round(a[1]), 3, 1, i % 6 ? P.ink : mid); c.rect(Math.round(b[0]) - 1, Math.round(b[1]), 3, 1, i % 6 ? P.ink : mid); }
      }
      glint(c, CX, 12, Math.round([3, 4, 5][level - 1] * (k === 3 ? 0.6 : 1)), mid, hi);
      if (k < 3) for (let i = 0; i < 4 + level * 2; i++) { const a = rad(-170 + i * (160 / (3 + level * 2)) + rg.range(-5, 5)); const l = 6 + k * 5 + rg.int(0, 6); c.set(CX + Math.cos(a) * l, 12 + Math.sin(a) * l * 0.8, i % 2 ? mid : hi); }
      if (level >= 2) for (let i = 8; i < PANELS[1].pts.length - 8; i += 9) if (i % 18 === 0 || level === 3) c.set(Math.round(PANELS[1].pts[i][0]) + 1, Math.round(PANELS[1].pts[i][1]) + 2, P.ink);
      return c;
    };
    for (let lv = 1; lv <= 3; lv++) for (let k = 0; k < 4; k++) {
      add(`aegis_stress_L${lv}`, `astress${lv}_${k + 1}`, mkCracks(lv, k, false), PY);
    }
  }
  // ------------------------------------------------ aegis_fade: luruh piksel dari puncak ke tanah (dither makin kuat, warna meredup)
  {
    const base = new Cv(W, H); drawShield(base, { apex: true, sigil: 1 });
    const dim = remap(base, { [P.pale]: P.gold, [P.paper]: P.gold, [P.lime]: P.limeD, [P.gold]: P.goldD });
    for (let k = 0; k < 4; k++) {
      const c = new Cv(W, H); c.d.set(k === 0 ? base.d : dim.d);
      const cut = [0, 38, 74, 112][k];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!c.get(x, y)) continue;
        if (y < cut) c.d[y * W + x] = 0;
        else if (y < cut + 26 && ((x + y) & 1)) c.d[y * W + x] = 0;
        else if (k >= 2 && (x & 1) === 0 && (y & 1) === 0) c.d[y * W + x] = 0;
      }
      if (c.count() === 0) c.set(CX, BASE, P.limeD);
      add('aegis_fade', `afade_${k + 1}`, c, PY);
    }
  }
  return out;
}
