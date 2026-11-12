// Atlas vfx_enemy: cakar Hollowling (kehampaan ungu-gelap + tulang), gores gading Mournfang (tulang + merah tua),
// tusukan Veyrath (baja dingin, lurus bersudut), status racun (hijau sakit + gelembung lavender).
import { Cv, Rng, stroke } from './kit.mjs';

export const PALETTE = {
  ink: '#1D1625', voidD: '#2B2038', voidM: '#5A4470', voidL: '#8A6CA8', boneL: '#E4D9C4', boneD: '#A89C86',
  bloodD: '#7A2E3A', blood: '#C25058', bloodL: '#E58F85', steelL: '#C9D6E4', steelM: '#8296B0', steelD: '#4E5E78',
  poisonL: '#A9C45E', poisonM: '#6E9440', poisonD: '#3F5A2A', bubble: '#C9A8E0',
};

const lerpPts = (a, b, f) => [a, [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]];
function bez(p0, p1, p2, n = 28, f = 1) {
  const pts = [];
  for (let i = 0; i <= n * f; i++) { const t = i / n; pts.push([(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]]); }
  return pts;
}

export function frames(P) {
  const out = [];
  const add = (group, name, cv, pivotY = 0.5) => out.push({ group, name, cv, pivotY });

  // ------------------------------------------------ partikel
  { const c = new Cv(4, 4); c.rect(1, 1, 2, 2, P.voidL); add('particles', 'hshard_a', c); }
  { const c = new Cv(4, 3); c.rect(0, 0, 3, 2, P.voidM); c.set(0, 0, P.voidL); add('particles', 'hshard_b', c); }
  { const c = new Cv(5, 4); c.rect(1, 1, 3, 2, P.boneL); c.set(3, 2, P.boneD); c.outline(P.ink); add('particles', 'mshard_a', c); }
  { const c = new Cv(4, 4); c.rect(1, 1, 2, 2, P.blood); c.set(2, 2, P.bloodD); add('particles', 'mshard_b', c); }
  { const c = new Cv(4, 4); c.rect(1, 1, 2, 2, P.steelM); c.set(1, 1, P.steelL); add('particles', 'ysp_a', c); }
  { const c = new Cv(3, 3); c.set(1, 1, P.steelL); add('particles', 'ysp_b', c); }

  // ------------------------------------------------ hollowling_claw 40x40
  {
    const claws = [0, 1, 2].map((i) => [[5 + 10 * i, 2], [17 + 10 * i, 37]]);
    const draw = (cv, i, f, cols) => {
      const [p0, p1] = claws[i];
      const pts = lerpPts(p0, p1, f);
      stroke(cv, pts, 3.2, (s) => 0.8 - 0.75 * s ** 1.4, (d, s) => (s > 0.82 ? cols[3] : d < -0.35 ? cols[0] : d > 0.4 ? cols[2] : cols[1]));
    };
    const normal = [P.boneL, P.voidL, P.voidD, P.voidM], faded = [P.voidL, P.voidM, P.voidD, P.voidD];
    const specs = [[[0.55, 0, 0], normal], [[1, 0.6, 0], normal], [[1, 1, 1], normal], [[1, 1, 1], faded]];
    specs.forEach(([f, cols], k) => {
      const c = new Cv(40, 40);
      f.forEach((ff, i) => { if (ff > 0) draw(c, i, ff, cols); });
      if (k < 3) c.outline(P.ink);
      add('hollowling_claw', `hclaw_${k + 1}`, c);
    });
    const c = new Cv(40, 40); const r = new Rng(5);
    claws.forEach(([p0, p1]) => { for (let t = 0.1; t < 0.9; t += 0.09) { const x = p0[0] + (p1[0] - p0[0]) * t + r.int(-1, 1), y = p0[1] + (p1[1] - p0[1]) * t; if (r.chance(0.6)) c.set(x, y, P.voidD); if (r.chance(0.3)) c.set(x + 2, y, P.voidM); } });
    add('hollowling_claw', 'hclaw_5', c);
  }

  // ------------------------------------------------ mournfang_slash 72x56
  {
    const g1 = (f) => bez([8, 6], [44, 8], [62, 48], 30, f), g2 = (f) => bez([2, 18], [36, 24], [50, 52], 30, f);
    const cols = (hi, mid, lo, rim) => (d) => (d < -0.55 ? rim : d < -0.1 ? hi : d < 0.5 ? mid : lo);
    const shadeN = cols(P.bloodL, P.blood, P.bloodD, P.boneL), shadeD = cols(P.blood, P.bloodD, P.voidD, P.bloodD);
    const win = [[0.4, 0, shadeN, 5.5], [0.8, 0.45, shadeN, 5.5], [1, 0.9, shadeN, 5.5], [1, 1, shadeD, 4.5]];
    win.forEach(([a, b, sh, hw], k) => {
      const c = new Cv(72, 56);
      stroke(c, g1(a), hw, (s) => Math.min(1, Math.sin(Math.PI * Math.min(1, s * 0.95 + 0.04)) * 1.25) ** 0.8, sh);
      if (b > 0) stroke(c, g2(b), hw - 1, (s) => Math.min(1, Math.sin(Math.PI * Math.min(1, s * 0.95 + 0.04)) * 1.25) ** 0.8, sh);
      c.outline(P.ink);
      add('mournfang_slash', `mslash_${k + 1}`, c);
    });
    { const c = new Cv(72, 56); stroke(c, g1(1), 3, (s) => Math.sin(Math.PI * s) ** 0.8, () => P.bloodD); stroke(c, g2(1), 2.2, (s) => Math.sin(Math.PI * s) ** 0.8, () => P.voidD); c.dither(1); add('mournfang_slash', 'mslash_5', c); }
    { const c = new Cv(72, 56); const r = new Rng(19); for (let i = 0; i < 16; i++) { const t = r.next(); const p = bez([8, 6], [44, 8], [62, 48])[Math.floor(t * 28)]; const x = p[0] + r.int(-6, 6), y = p[1] + r.int(-5, 7); if (i % 3 === 0) { c.rect(x, y, 3, 2, P.boneL); c.set(x + 2, y + 1, P.boneD); } else c.rect(x, y, 2, 2, i % 2 ? P.blood : P.bloodD); } add('mournfang_slash', 'mslash_6', c); }
  }

  // ------------------------------------------------ veyrath_strike 64x40 (lurus, bersudut)
  {
    const prof = (s) => (s < 0.86 ? s / 0.86 : (1 - s) / 0.14);
    const needle = (c, x0, x1, hw, cols) => stroke(c, [[x0, 20], [x1, 20]], hw, prof, (d) => (Math.abs(d) < 0.3 ? cols[0] : d < 0 ? cols[1] : cols[2]));
    const n = [P.steelL, P.steelM, P.steelD];
    { const c = new Cv(64, 40); needle(c, 30, 46, 2.4, n); c.outline(P.ink); add('veyrath_strike', 'vstrike_1', c); }
    { const c = new Cv(64, 40); needle(c, 10, 54, 2.8, n); c.outline(P.ink); add('veyrath_strike', 'vstrike_2', c); }
    {
      const c = new Cv(64, 40); needle(c, 2, 61, 3.2, n);
      for (let i = 0; i < 5; i++) { c.set(61 + i, 20, P.steelL); c.set(61 + i, 19, P.steelM); }
      c.line(58, 14, 62, 18, P.steelM); c.line(58, 26, 62, 22, P.steelM);
      c.outline(P.ink); add('veyrath_strike', 'vstrike_3', c);
    }
    { const c = new Cv(64, 40); needle(c, 4, 40, 1.8, [P.steelM, P.steelD, P.steelD]); c.line(10, 14, 36, 14, P.steelD); c.line(10, 26, 36, 26, P.steelD); c.dither(1); add('veyrath_strike', 'vstrike_4', c); }
    {
      const c = new Cv(64, 40);
      [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dx, dy]) => { for (let i = 2; i <= 9; i++) { c.set(56 + dx * i, 20 + dy * i, i < 6 ? P.steelL : P.steelM); if (i < 5) { c.set(56 + dx * i + dy, 20 + dy * i + dx, P.steelM); } } });
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy]) => { for (let i = 2; i <= 5; i++) c.set(56 + dx * i, 20 + dy * i, P.steelM); });
      c.line(56, 12, 63, 20, P.steelD); c.line(63, 20, 56, 28, P.steelD); c.line(56, 28, 49, 20, P.steelD); c.line(49, 20, 56, 12, P.steelD);
      c.rect(55, 19, 3, 3, P.steelL);
      add('veyrath_strike', 'vstrike_5', c);
    }
    { const c = new Cv(64, 40); const r = new Rng(3); for (let i = 0; i < 12; i++) { const a = r.range(0, Math.PI * 2), d = r.range(6, 15); const x = 56 + Math.cos(a) * d, y = 20 + Math.sin(a) * d * 0.8; if (i % 3 === 0) c.rect(x, y, 2, 2, P.steelM); else c.set(x, y, i % 2 ? P.steelL : P.voidL); } add('veyrath_strike', 'vstrike_6', c); }
  }

  // ------------------------------------------------ status_poison
  [[3, 0], [5, 0], [7, 1], [0, 2]].forEach(([r, mode], k) => {
    const c = new Cv(10, 10);
    if (mode < 2) {
      c.ring(5, 5, r / 2 + 0.5, r / 2 + 0.5, 1, P.poisonM);
      c.ellipse(5, 5, Math.max(0.6, r / 2 - 1), Math.max(0.6, r / 2 - 1), P.poisonL);
      c.set(4, 4, P.boneL); if (r >= 7) { c.set(6, 6, P.bubble); c.set(3, 5, P.bubble); }
      c.outline(P.poisonD);
    } else { [[1, 1], [8, 1], [1, 8], [8, 8], [5, 0], [5, 9]].forEach(([x, y], i) => c.set(x, y, i % 2 ? P.poisonL : P.bubble)); }
    add('status_poison_bubble', `pbub_${k + 1}`, c);
  });
  [[4, 0], [5, 1], [4, 2], [5, 3]].forEach(([r, v], k) => {
    const c = new Cv(24, 20);
    const blobs = [[7, 12, r], [12, 9 - (v % 2), r + 1], [17, 12, r], [12, 14, r - 1]];
    blobs.forEach(([x, y, rr], i) => c.ellipse(x + (k === 2 ? (i % 2 ? 1 : -1) : 0), y, rr, rr - 0.5, (px, py, dx, dy) => (dx + dy < -0.5 ? P.poisonL : dx + dy > 0.5 ? P.poisonD : P.poisonM)));
    c.outline(P.poisonD);
    c.set(8, 17, P.poisonM); c.set(15, 18, P.poisonM); c.set(15, 17, P.poisonD);
    if (k % 2) { c.set(10, 7, P.bubble); c.set(14, 8, P.bubble); }
    add('status_poison_cloud', `pcloud_${k + 1}`, c);
  });
  return out;
}
