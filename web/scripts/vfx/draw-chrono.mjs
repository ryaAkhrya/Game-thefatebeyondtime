// Atlas vfx_chrono: Chronolith. Lengkung batu + inti ambar yang berkumpul (charge), gelombang batu berat (slam), riak "memutar balik"
// yang halus dan terkuantisasi (temporal: cincin putus-putus teal pucat, bukan neon/glitch/jam melayang).
import { Cv, Rng } from './kit.mjs';

export const PALETTE = {
  ink: '#1D1625', stoneXL: '#C9C0B4', stoneL: '#9A9088', stoneM: '#6E655F', stoneD: '#463F3F',
  tealL: '#A9D6D0', tealM: '#5E9A98', tealD: '#2F5E62', amberL: '#F3DC9A', amberM: '#E3B66A', amberD: '#A8742F',
  dustL: '#C2B49A', dustM: '#9C8E78',
};

const rad = (d) => (d * Math.PI) / 180;

/** titik-titik runut lengkung: kaki kiri naik, setengah lingkaran, kaki kanan turun */
function archPath(cx, cy, r, legBottom, step) {
  const pts = [];
  for (let y = legBottom; y > cy; y -= step) pts.push([cx - r, y]);
  const arcLen = Math.PI * r;
  for (let s = 0; s <= arcLen; s += step) { const a = Math.PI - s / r; pts.push([cx + r * Math.cos(a), cy - r * Math.sin(a)]); }
  for (let y = cy + step; y <= legBottom; y += step) pts.push([cx + r, y]);
  return pts;
}

export function frames(P) {
  const out = [];
  const add = (group, name, cv, pivotY = 0.5) => out.push({ group, name, cv, pivotY });

  // partikel
  { const c = new Cv(3, 3); c.rect(0, 0, 2, 2, P.amberM); c.set(0, 0, P.amberL); add('particles', 'cmote_a', c); }
  { const c = new Cv(3, 2); c.rect(0, 0, 2, 1, P.amberL); add('particles', 'cmote_b', c); }
  { const c = new Cv(3, 3); c.rect(0, 0, 2, 2, P.tealM); c.set(0, 0, P.tealL); add('particles', 'cmote_c', c); }

  // ------------------------------------------------ chronolith_charge 64x64
  {
    const path = archPath(32, 34, 26, 58, 4);
    const lit = [0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1, 1];
    const core = [0, 2, 3, 4, 5, 6, 7, 8];
    for (const calm of [false, true]) {
      lit.forEach((fl, k) => {
        if (calm && k < 4) return; // calm hanya menggantikan frame terang
        const c = new Cv(64, 64);
        const n = Math.floor(path.length * fl);
        path.forEach(([x, y], i) => {
          const on = i < n;
          const col = !on ? P.stoneD : i >= n - 2 ? (calm ? P.tealM : P.tealL) : P.tealM;
          c.rect(x - 1, y - 1, 2, 2, col);
        });
        const r = calm ? Math.min(core[k], 4) : core[k];
        if (r === 0) { c.set(32, 34, P.amberD); c.set(31, 34, P.amberD); }
        else {
          c.ellipse(32, 34, r + 0.5, r + 0.5, (x, y, dx, dy) => (dx * dx + dy * dy < 0.3 && r >= 5 && !calm ? P.amberL : dx * dx + dy * dy < 0.62 ? P.amberM : P.amberD));
          if (r >= 3) c.ring(32, 34, r + 3, r + 3, 1, P.tealD, (x, y, a) => Math.abs(Math.sin(a * 4)) < 0.5);
        }
        add('chronolith_charge', `ccharge_${k + 1}${calm ? '_c' : ''}`, c);
      });
    }
  }

  // ------------------------------------------------ chronolith_slam 112x40: gelombang batu mendatar
  {
    const rxs = [10, 20, 32, 42, 50, 54, 54];
    rxs.forEach((rx, k) => {
      const c = new Cv(112, 40);
      const cx = 56, cy = 22, ry = Math.max(3, rx * 0.3);
      if (k === 0) { c.ellipse(cx, cy, rx, ry, (x, y, dx, dy) => (dy < -0.3 ? P.stoneM : P.stoneD)); c.line(cx - 5, cy, cx + 6, cy + 1, P.ink); c.line(cx, cy - 2, cx + 2, cy + 3, P.ink); }
      const skip = k >= 2 ? (x, y, a) => Math.abs(Math.sin(a * (2 + k))) < 0.12 * (k - 1) : undefined;
      c.ring(cx, cy, rx, ry, k < 3 ? 3 : 2, (x, y, dx, dy) => (dy < -0.35 ? (dx < 0.2 ? P.stoneXL : P.stoneL) : dy < 0.35 ? P.stoneM : P.stoneD), skip);
      if (k >= 1) c.ring(cx, cy, rx - 4, Math.max(1.5, ry - 3), 1, P.stoneD, (x, y, a) => Math.abs(Math.sin(a * 5)) < 0.45);
      c.outline(P.ink);
      if (k >= 3) { const r = new Rng(60 + k); for (let i = 0; i < 6 + k; i++) { const a = r.range(0, Math.PI * 2); const x = cx + Math.cos(a) * (rx + 1), y = cy + Math.sin(a) * (ry + 1) - r.int(1, 5); c.ellipse(x, y, 2.5, 2, P.dustL); c.rect(x - 2, y + 1, 4, 1, P.dustM); } }
      if (k >= 5) c.dither(k === 5 ? 1 : 2);
      add('chronolith_slam', `cslam_${k + 1}`, c, 22 / 40);
    });
    const hs = [10, 24, 34, 22];
    hs.forEach((h, k) => {
      const c = new Cv(14, 40);
      const base = 37, w = 10, x0 = 2;
      const tip = k === 3 ? [[x0, base - h + 5], [x0 + 2, base - h + 2], [x0 + 5, base - h + 6], [x0 + 7, base - h + 1], [x0 + w, base - h + 4]] : [[x0, base - h + 6], [x0 + 3, base - h], [x0 + 6, base - h + 4], [x0 + w, base - h + 7]];
      c.poly([[x0, base], ...tip, [x0 + w, base]], (x) => (x < x0 + 3 ? P.stoneL : x > x0 + 6 ? P.stoneD : P.stoneM));
      for (let y = base - h + 9; y < base - 2; y += 7) { c.line(x0 + 1, y, x0 + 5, y + 2, P.stoneD); c.line(x0 + 5, y + 2, x0 + 9, y + 1, P.stoneD); }
      if (k === 3) c.dither(1);
      c.outline(P.ink);
      c.rect(x0 - 2, base, w + 4, 2, P.dustM);
      add('chronolith_pillar', `cpillar_${k + 1}`, c, 37 / 40);
    });
  }

  // ------------------------------------------------ chronolith_temporal 80x48: riak putar-balik terkuantisasi
  {
    const cx = 40, cy = 24;
    const quant = (c, rx, col, offsetOdd = 1, segs = 14) => {
      const ry = rx * 0.36;
      for (let s = 0; s < segs; s++) {
        if (s % 3 === 2) continue;
        const t = new Cv(80, 48);
        t.ring(cx, cy, rx, ry, 1, col, (x, y, a) => { const idx = Math.floor((((a + Math.PI) / (Math.PI * 2)) * segs) % segs); return idx !== s; });
        c.blit(t, 0, s % 2 ? offsetOdd : 0);
      }
    };
    const spec = [[34, 'main'], [28, 'main'], [22, 'main'], [16, 'main'], [10, 'tiny'], [18, 'out'], [24, 'dots']];
    spec.forEach(([rx, mode], k) => {
      const c = new Cv(80, 48);
      if (mode === 'main') {
        quant(c, rx, P.tealM);
        quant(c, rx - 4, P.tealD, 0, 10);
        for (let i = 0; i < 8; i++) { const a = rad(i * 45 + 10); c.set(cx + Math.cos(a) * (rx + 3), cy + Math.sin(a) * (rx + 3) * 0.36, P.tealL); }
      } else if (mode === 'tiny') {
        c.ring(cx, cy, rx, rx * 0.36, 1, P.tealL, (x, y, a) => Math.abs(Math.sin(a * 3)) < 0.3);
        for (let i = 0; i < 6; i++) { const a = rad(i * 60); c.set(cx + Math.cos(a) * (rx + 4), cy + Math.sin(a) * (rx + 4) * 0.36, P.tealM); }
      } else if (mode === 'out') { quant(c, rx, P.tealD, 0, 12); c.dither(1); }
      else { for (let i = 0; i < 10; i++) { const a = rad(i * 36 + 7); c.set(cx + Math.cos(a) * rx, cy + Math.sin(a) * rx * 0.36, i % 2 ? P.tealD : P.tealM); } }
      add('chronolith_temporal', `crewind_${k + 1}`, c);
    });
  }
  return out;
}
