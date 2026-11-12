// Atlas vfx_nature (Torvan): ranting, daun lonjong bersudut, sulur zig-zag, akar runcing. Bahasa bentuk = SUDUT TAJAM
// (belah ketupat, zig-zag, segitiga) + hijau tanah/cokelat. Dibedakan dari Velthia (lengkung, simetri, kelopak/cincin).
import { Cv, stroke } from './kit.mjs';

export const PALETTE = {
  ink: '#1D1625', barkD: '#3B2A1F', bark: '#6B4A2E', barkL: '#9A6F44', leafD: '#2F4A2C', leaf: '#4F7A3A',
  leafL: '#7FA84A', leafH: '#A9C45E', sap: '#E6D9A8', amber: '#D4A64A', rootD: '#4A3526', dirt: '#65533E', dirtL: '#8A6A47',
};

const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

/** daun belah ketupat bersudut. (x,y)=pangkal, ang derajat. */
function leaf(P, cv, x, y, len, wid, ang, body = P.leaf, hi = P.leafL, vein = P.leafD) {
  const a = (ang * Math.PI) / 180;
  const loc = [[0, 0], [len * 0.38, -wid / 2], [len, 0], [len * 0.38, wid / 2]];
  const pts = loc.map(([px, py]) => { const [rx, ry] = rot(px, py, a); return [x + rx, y + ry]; });
  cv.poly(pts, (px, py) => {
    const lx = (px + 0.5 - x) * Math.cos(a) + (py + 0.5 - y) * Math.sin(a), ly = -(px + 0.5 - x) * Math.sin(a) + (py + 0.5 - y) * Math.cos(a);
    return ly < -0.4 ? hi : body;
  });
  const [tx, ty] = rot(len, 0, a), [bx, by] = rot(1, 0, a);
  cv.line(x + bx, y + by, x + tx * 0.85, y + ty * 0.85, vein);
}

function spike(cv, cx, cy, ang, r0, len, w, cIn, cOut) {
  const a = (ang * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
  const b = [cx + ca * r0, cy + sa * r0], t = [cx + ca * (r0 + len), cy + sa * (r0 + len)];
  cv.poly([[b[0] - sa * w / 2, b[1] + ca * w / 2], t, [b[0] + sa * w / 2, b[1] - ca * w / 2]], (x, y) => (Math.hypot(x + 0.5 - b[0], y + 0.5 - b[1]) / len < 0.5 ? cIn : cOut));
}

function dirtMound(P, cv, x, y, rx) {
  cv.ellipse(x, y, rx, 2.2, (px, py, dx, dy) => (dy < -0.2 ? P.dirtL : P.dirt));
  cv.line(x - rx + 1, y + 1, x + rx - 2, y + 1, P.rootD);
}

/** polyline terpotong pada fraksi panjang f; mengembalikan titik terpotong dan jumlah sambungan tercapai */
function truncate(pts, f) {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = lens.reduce((a, b) => a + b, 0);
  let left = total * f; const out = [pts[0]]; let reached = 0;
  for (let i = 0; i < lens.length; i++) {
    if (left >= lens[i]) { out.push(pts[i + 1]); left -= lens[i]; reached = i + 1; }
    else { const t = left / lens[i]; if (t > 0) out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]); break; }
  }
  return { pts: out, reached };
}

export function frames(P) {
  const out = [];
  const add = (group, name, cv, pivotY = 0.5) => out.push({ group, name, cv, pivotY });

  // ------------------------------------------------ partikel kecil
  { const c = new Cv(8, 6); leaf(P, c, 1, 3, 6, 3, 0, P.leaf, P.leafL, P.leafD); add('particles', 'nleaf_a', c); }
  { const c = new Cv(8, 8); leaf(P, c, 1, 6, 7, 3, -45, P.leafL, P.leafH, P.leaf); add('particles', 'nleaf_b', c); }
  { const c = new Cv(6, 8); leaf(P, c, 3, 1, 6, 3, 90, P.leafD, P.leaf, P.leafD); add('particles', 'nleaf_c', c); }
  { const c = new Cv(9, 9); c.line(1, 7, 7, 1, P.bark); c.line(2, 7, 8, 1, P.barkD); c.set(4, 3, P.barkL); c.set(5, 5, P.barkL); c.line(4, 4, 6, 6, P.barkD); c.set(7, 6, P.bark); add('particles', 'ntwig_a', c); }
  { const c = new Cv(9, 5); c.line(1, 2, 7, 2, P.bark); c.line(1, 3, 7, 3, P.barkD); c.set(4, 1, P.barkL); c.set(6, 1, P.bark); add('particles', 'ntwig_b', c); }
  { const c = new Cv(5, 5); c.set(2, 0, P.sap); c.set(1, 1, P.sap); c.set(2, 1, P.amber); c.set(3, 1, P.sap); c.set(0, 2, P.sap); c.set(1, 2, P.amber); c.set(2, 2, P.sap); c.set(3, 2, P.amber); c.set(4, 2, P.sap); c.set(1, 3, P.sap); c.set(2, 3, P.amber); c.set(3, 3, P.sap); c.set(2, 4, P.sap); add('particles', 'nspore', c); }
  { const c = new Cv(5, 5); c.rect(1, 1, 3, 3, P.dirt); c.set(1, 1, P.dirtL); c.set(2, 1, P.dirtL); c.set(3, 3, P.rootD); c.outline(P.ink); add('particles', 'ndirt_a', c); }
  { const c = new Cv(3, 3); c.rect(0, 0, 2, 2, P.dirtL); c.set(1, 1, P.dirt); c.set(2, 2, P.rootD); add('particles', 'ndirt_b', c); }

  // ------------------------------------------------ torvan_leaf_bolt: proyektil daun 24x14 (3 frame kepak)
  [[38, 24, 12], [26, 18, 8], [12, 10, 4]].forEach(([a1, a2, a3], k) => {
    const c = new Cv(26, 16);
    c.line(1, 8, 7, 8, P.bark); c.line(1, 9, 7, 9, P.barkD); c.set(3, 6, P.barkL); c.set(2, 7, P.barkL); c.set(4, 10, P.bark); c.set(5, 11, P.barkD);
    leaf(P, c, 7, 8, 8, 5, -a1 - 12, P.leafL, P.leafH, P.leaf);
    leaf(P, c, 7, 8, 8, 5, a1 + 12, P.leaf, P.leafL, P.leafD);
    leaf(P, c, 6, 8, 17, 7, 0, P.leaf, P.leafL, P.leafD);
    leaf(P, c, 8, 8, 8, 4, -(a2 - 4), P.leafL, P.leafH, P.leaf);
    c.outline(P.ink);
    add('torvan_leaf_bolt', `nbolt_${k + 1}`, c);
  });

  // ------------------------------------------------ nburst 32x32 (bintang runcing + serpihan)
  {
    const c = new Cv(32, 32);
    for (let i = 0; i < 8; i++) spike(c, 16, 16, i * 45, 2, i % 2 ? 8 : 13, 3, P.sap, i % 2 ? P.leaf : P.leafH);
    c.ellipse(16, 16, 2.5, 2.5, P.sap);
    add('nburst', 'nburst_1', c);
  }
  {
    const c = new Cv(32, 32);
    [[-8, -4, -30], [9, -6, 20], [-4, 9, 120], [8, 7, 60], [0, -11, -85]].forEach(([dx, dy, a], i) => leaf(P, c, 16 + dx, 16 + dy, 8, 4, a, i % 2 ? P.leaf : P.leafL, P.leafH, P.leafD));
    c.line(8, 14, 12, 18, P.bark); c.line(21, 10, 24, 6, P.bark); c.line(20, 22, 24, 24, P.barkL);
    add('nburst', 'nburst_2', c);
  }
  {
    const c = new Cv(32, 32);
    [[-12, -7, -30], [12, -9, 25], [-7, 12, 130], [12, 10, 50], [1, -14, -85], [-14, 5, 190]].forEach(([dx, dy, a], i) => leaf(P, c, 16 + dx, 16 + dy, 6, 3, a, i % 2 ? P.leafD : P.leaf, P.leafL, P.leafD));
    c.line(5, 20, 8, 22, P.bark); c.line(25, 14, 27, 10, P.barkD);
    add('nburst', 'nburst_3', c);
  }
  {
    const c = new Cv(32, 32);
    [[-14, -8], [14, -10], [-10, 13], [13, 12], [2, -15], [-15, 4]].forEach(([dx, dy], i) => { c.set(16 + dx, 16 + dy, i % 2 ? P.leafD : P.leaf); c.set(17 + dx, 16 + dy, P.leafD); });
    add('nburst', 'nburst_4', c);
  }

  // ------------------------------------------------ torvan_vine 40x56 (pivot di pangkal sulur)
  {
    const vines = [
      { pts: [[20, 52], [15, 43], [23, 35], [16, 27], [23, 19], [18, 11], [21, 5]], w: 1.7 },
      { pts: [[9, 52], [6, 45], [12, 38], [7, 32], [11, 26]], w: 1.4 },
      { pts: [[31, 52], [34, 44], [28, 37], [33, 30], [29, 24], [33, 19]], w: 1.4 },
    ];
    const fr = [[0.25, 0, 0], [0.45, 0.3, 0.2], [0.7, 0.55, 0.5], [0.9, 0.8, 0.75], [1, 1, 1], [1, 1, 1], [0.5, 0.45, 0.5]];
    fr.forEach((f, k) => {
      const c = new Cv(40, 56);
      vines.forEach((v, vi) => {
        const frac = f[vi];
        if (frac <= 0) return;
        dirtMound(P, c, v.pts[0][0], 52, 5);
        const { pts, reached } = truncate(v.pts, frac);
        if (pts.length < 2) return;
        stroke(c, pts, v.w, (s) => 1 - 0.35 * s, (d) => (d < -0.3 ? P.leafL : d > 0.45 ? P.leafD : P.leaf));
        // duri bersudut dan daun pada sambungan yang sudah tercapai
        for (let j = 1; j <= reached && j < v.pts.length; j++) {
          const [jx, jy] = v.pts[j], dir = j % 2 ? 1 : -1;
          if (k === 6) continue;
          if (j < v.pts.length - 1 || k >= 4) {
            c.line(jx + dir * 2, jy, jx + dir * 5, jy - 3, P.barkL); c.set(jx + dir * 5, jy - 4, P.barkL);
            if (k >= 3) leaf(P, c, jx - dir, jy + 1, k >= 4 ? 8 : 5, k >= 4 ? 4 : 3, dir > 0 ? 200 : -20, P.leaf, P.leafL, P.leafD);
          }
        }
        if (k === 5 && frac >= 1) { const [tx, ty] = v.pts[v.pts.length - 1]; c.rect(tx - 1, ty - 3, 3, 3, P.amber); c.set(tx, ty - 4, P.sap); }
      });
      c.outline(P.ink);
      add('torvan_vine', `nvine_${k + 1}`, c, 52 / 56);
    });
  }

  // ------------------------------------------------ torvan_support 32x40 (tunas tumbuh, pivot pangkal)
  {
    const hs = [6, 12, 18, 22, 24, 15], nl = [0, 2, 4, 6, 6, 4];
    hs.forEach((h, k) => {
      const c = new Cv(32, 40);
      dirtMound(P, c, 16, 35, 6);
      stroke(c, [[16, 35], [15, 35 - h * 0.5], [17, 35 - h]], 1.2, () => 1, (d) => (d < -0.3 ? P.leafL : d > 0.4 ? P.leafD : P.leaf));
      for (let i = 0; i < nl[k]; i++) {
        const dir = i % 2 ? 1 : -1, yy = 33 - Math.floor(i / 2) * Math.max(4, h / 4) - 2;
        leaf(P, c, 16, yy, k === 5 ? 6 : 8 - Math.floor(i / 2), 4, dir > 0 ? -30 - (i * 5) : 210 + (i * 5), i % 2 ? P.leaf : P.leafL, P.leafH, P.leafD);
      }
      if (k === 4) { c.rect(15, 35 - h - 3, 3, 3, P.amber); c.set(16, 35 - h - 4, P.sap); }
      c.outline(P.ink);
      if (k >= 4 && k <= 4) [[5, 20], [27, 20], [7, 29], [25, 29]].forEach(([x, y]) => { c.set(x, y - 1, P.sap); c.set(x - 1, y, P.sap); c.set(x, y, P.amber); c.set(x + 1, y, P.sap); c.set(x, y + 1, P.sap); });
      add('torvan_support', `nsup_${k + 1}`, c, 35 / 40);
    });
  }

  // ------------------------------------------------ forest_summon_small 48x32 (akar runcing menembus tanah)
  {
    const mid = [5, 11, 17, 21, 21, 10, 3], sid = [3, 8, 13, 16, 16, 7, 2];
    mid.forEach((hm, k) => {
      const c = new Cv(48, 32);
      c.ellipse(24, 26, 17, 3.4, (x, y, dx, dy) => (dy < -0.25 ? P.dirtL : P.dirt));
      for (const x of [12, 17, 31, 36, 24]) { c.line(24, 26, x, 26 + (x < 24 ? 1 : 1), P.ink); }
      [[16, sid[k], 7], [24, hm, 8], [32, sid[k], 7]].forEach(([x, h, w], i) => {
        const base = 26;
        const pts = [[x - w / 2, base], [x - 1, base - h * 0.55], [x - 0.5, base - h], [x + 1, base - h * 0.55], [x + w / 2, base]];
        c.poly([[x - w / 2, base], [x - 1.5, base - h * 0.5], [x, base - h], [x + 1.5, base - h * 0.5], [x + w / 2, base]], (px, py) => (px < x - 0.5 ? P.barkL : px > x + 1.2 ? P.barkD : P.bark));
        if (h >= 10) { c.line(x - 2, base - h * 0.45, x - 5, base - h * 0.62, P.bark); c.line(x + 2, base - h * 0.6, x + 5, base - h * 0.8, P.barkD); }
        if (h >= 8) { c.rect(x - w / 2 - 1, base - 3, 3, 2, P.leaf); c.set(x - w / 2, base - 4, P.leafL); c.rect(x + w / 2 - 2, base - 3, 3, 2, P.leafD); }
        void pts; void i;
      });
      c.outline(P.ink);
      if (k >= 1 && k <= 4) [[8, 14], [40, 12], [12, 8], [37, 17]].forEach(([x, y], i) => c.rect(x, y - (k === 1 ? 0 : k) , 2, 2, i % 2 ? P.dirtL : P.dirt));
      add('forest_summon_small', `nsum_${k + 1}`, c, 26 / 32);
    });
  }
  return out;
}
