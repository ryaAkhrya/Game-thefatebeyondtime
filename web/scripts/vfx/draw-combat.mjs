// Atlas vfx_combat: tebasan greatsword Yaric, benturan, retakan tanah Ground Slam, pecahan batu/tanah, debu.
// Palet tertutup 16 warna. Cahaya kiri-atas. Semua alfa 0/255.
import { Cv, Rng, arcPt } from './kit.mjs';

export const PALETTE = {
  ink: '#1D1625', paper: '#ECE3D6', steelL: '#B9C6D6', steelM: '#7F93AD', gold: '#E3B66A', pale: '#F2D98F',
  orange: '#D9824A', orangeD: '#A8552F', stoneL: '#9A9088', stoneM: '#6E655F', stoneD: '#463F3F',
  dirtL: '#94744F', dirtM: '#735C44', dirtD: '#43362A', dustL: '#C2B49A', dustM: '#9C8E78',
};

const deg = (a) => (a * Math.PI) / 180;

function spike(cv, cx, cy, ang, r0, len, w, cIn, cOut, split = 0.5) {
  const a = deg(ang), ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
  const b = [cx + ca * r0, cy + sa * r0];
  const t = [cx + ca * (r0 + len), cy + sa * (r0 + len)];
  cv.poly([[b[0] + nx * w / 2, b[1] + ny * w / 2], t, [b[0] - nx * w / 2, b[1] - ny * w / 2]], (x, y) => {
    const d = Math.hypot(x + 0.5 - b[0], y + 0.5 - b[1]) / len;
    return d < split ? cIn : cOut;
  });
}

function chunk(P, pts, base, hi, lo) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const w = Math.max(...xs) + 3, h = Math.max(...ys) + 3;
  const cv = new Cv(w, h);
  cv.poly(pts.map(([x, y]) => [x + 1, y + 1]), base);
  const fill = new Cv(w, h);
  fill.d.set(cv.d);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!fill.get(x, y)) continue;
      if (!fill.get(x + 1, y) || !fill.get(x, y + 1)) cv.set(x, y, lo);
      else if (!fill.get(x - 1, y) || !fill.get(x, y - 1)) cv.set(x, y, hi);
    }
  cv.outline(P.ink);
  return cv;
}

export function frames(P) {
  const out = [];
  const add = (group, name, cv, pivotY = 0.5) => out.push({ group, name, cv, pivotY });

  // ------------------------------------------------ greatsword_trail (busur tebasan, 64x48), normal + calm
  const win = [[0, 0.3, 8], [0.05, 0.62, 13], [0.25, 1, 15], [0.55, 1, 11], [0.82, 1, 6]];
  for (const calm of [false, true]) {
    win.forEach(([t0, t1, mw], k) => {
      const cv = new Cv(64, 48);
      const C = [10, 46], R = 42, a0 = 82, a1 = 4;
      for (let y = 0; y < 48; y++)
        for (let x = 0; x < 64; x++) {
          const dx = x + 0.5 - C[0], dy = C[1] - (y + 0.5);
          const r = Math.hypot(dx, dy), th = (Math.atan2(dy, dx) * 180) / Math.PI;
          const u = (a0 - th) / (a0 - a1);
          if (u < t0 || u > t1) continue;
          const v = (u - t0) / (t1 - t0);
          const w = (mw * Math.pow(v, 1.1) * Math.sqrt(Math.max(0, 1 - Math.pow(v, 9)))) / 2;
          const d = Math.abs(r - R);
          if (w < 0.35 || d > w) continue;
          const q = d / w;
          const core = calm ? P.steelL : P.paper;
          let c = q < 0.34 ? core : q < 0.7 ? P.steelL : P.steelM;
          if (k === 4) c = q < 0.5 ? P.steelL : P.steelM;
          if (k === 3 && c === P.paper) c = P.steelL;
          cv.set(x, y, c);
        }
      if (k >= 1 && k <= 3) {
        const hp = arcPt(C[0], C[1], R, a0 - (a0 - a1) * t1);
        const sp = calm ? P.steelM : P.gold;
        cv.set(hp[0] + 3, hp[1] - 2, sp); cv.set(hp[0] + 5, hp[1] + 1, sp); cv.set(hp[0] - 1, hp[1] - 5, calm ? P.steelM : P.pale);
      }
      add('greatsword_trail', `gs_${k + 1}${calm ? '_c' : ''}`, cv);
    });
  }

  // ------------------------------------------------ percikan kecil (partikel)
  { const c = new Cv(4, 4); c.rect(1, 1, 2, 2, P.gold); add('particles', 'spark_a', c); }
  { const c = new Cv(3, 3); c.set(1, 1, P.paper); add('particles', 'spark_b', c); }
  { const c = new Cv(4, 4); c.rect(1, 1, 2, 2, P.orange); add('particles', 'spark_c', c); }

  // ------------------------------------------------ impact_hit 32x32 (+calm untuk 1,2)
  for (const calm of [false, true]) {
    const sfx = calm ? '_c' : '';
    const hot = calm ? P.gold : P.paper, mid = calm ? P.orange : P.gold, tip = calm ? P.orangeD : P.orange;
    {
      const cv = new Cv(32, 32);
      cv.rect(15, 14, 3, 3, hot);
      for (let i = 1; i <= 4; i++) { cv.set(16 - 2 - i + 1, 15, i < 3 ? mid : tip); cv.set(16 + 1 + i, 15, i < 3 ? mid : tip); cv.set(16, 15 - 2 - i + 1, i < 3 ? mid : tip); cv.set(16, 15 + 2 + i - 1, i < 3 ? mid : tip); }
      add('impact_hit', `hit_1${sfx}`, cv);
    }
    {
      const cv = new Cv(32, 32);
      for (let i = 0; i < 8; i++) {
        const card = i % 2 === 0;
        spike(cv, 16, 16, i * 45 - 90, 2, card ? 13 : 9, card ? 5 : 4, hot, i % 2 ? tip : mid, card ? 0.35 : 0.3);
      }
      cv.ellipse(16, 16, 3, 3, hot);
      add('impact_hit', `hit_2${sfx}`, cv);
    }
    if (calm) continue;
    {
      const cv = new Cv(32, 32);
      for (let i = 0; i < 8; i++) { const a = deg(i * 45 - 90 + 12); const r0 = 8 + (i % 2) * 2; const x = 16 + Math.cos(a) * r0, y = 16 + Math.sin(a) * r0; cv.line(x, y, x + Math.cos(a) * 4, y + Math.sin(a) * 4, i % 2 ? P.orange : P.gold); }
      cv.ring(16, 16, 4, 4, 1, P.orangeD);
      add('impact_hit', 'hit_3', cv);
    }
    {
      const cv = new Cv(32, 32);
      for (let i = 0; i < 8; i++) { const a = deg(i * 45 - 90 + 5); cv.set(16 + Math.cos(a) * (12 + (i % 3)), 16 + Math.sin(a) * (12 + (i % 3)), i % 2 ? P.orangeD : P.orange); }
      cv.set(16, 16, P.orangeD); cv.set(15, 16, P.orangeD);
      add('impact_hit', 'hit_4', cv);
    }
  }

  // ------------------------------------------------ impact_heavy 56x56 (+calm 1,2)
  for (const calm of [false, true]) {
    const sfx = calm ? '_c' : '';
    const hot = calm ? P.gold : P.paper, mid = calm ? P.orange : P.gold, tip = calm ? P.orangeD : P.orange;
    {
      const cv = new Cv(56, 56);
      cv.ellipse(28, 28, calm ? 6 : 9, calm ? 6 : 9, (x, y, dx, dy) => (dx * dx + dy * dy < 0.4 ? hot : mid));
      for (let i = 0; i < 4; i++) spike(cv, 28, 28, i * 90 - 90, 6, calm ? 15 : 22, 6, mid, tip, 0.45);
      for (let i = 0; i < 4; i++) spike(cv, 28, 28, i * 90 - 45, 5, calm ? 9 : 13, 4, mid, tip, 0.4);
      add('impact_heavy', `hvy_1${sfx}`, cv);
    }
    {
      const cv = new Cv(56, 56);
      cv.ring(28, 28, 15, 15, 3, (x, y) => (x + y < 56 ? mid : tip));
      for (let i = 0; i < 12; i++) spike(cv, 28, 28, i * 30, 14, 8, 3, mid, tip, 0.3);
      cv.ellipse(28, 28, 5, 5, P.orangeD);
      if (!calm) cv.ellipse(28, 28, 3, 3, P.pale);
      add('impact_heavy', `hvy_2${sfx}`, cv);
    }
    if (calm) continue;
    {
      const cv = new Cv(56, 56);
      cv.ring(28, 28, 23, 23, 2, (x, y) => (x + y < 56 ? P.gold : P.orange), (x, y, a) => ((Math.floor(((a + Math.PI) * 180) / Math.PI / 24) % 3) === 0));
      for (let i = 0; i < 10; i++) { const a = deg(i * 36 + 10); const r = 12 + (i % 3) * 3; cv.line(28 + Math.cos(a) * r, 28 + Math.sin(a) * r, 28 + Math.cos(a) * (r + 4), 28 + Math.sin(a) * (r + 4), i % 2 ? P.orange : P.gold); }
      add('impact_heavy', 'hvy_3', cv);
    }
    {
      const cv = new Cv(56, 56);
      const rng = new Rng(31);
      for (let i = 0; i < 14; i++) { const a = deg(i * (360 / 14) + rng.range(-6, 6)); const r = rng.range(19, 26); cv.rect(28 + Math.cos(a) * r, 28 + Math.sin(a) * r, 2, 2, i % 3 ? P.orange : P.orangeD); }
      cv.ring(28, 28, 25, 25, 1, P.orangeD, (x, y, a) => ((Math.floor(((a + Math.PI) * 180) / Math.PI / 12) % 2) === 0));
      add('impact_heavy', 'hvy_4', cv);
    }
    {
      const cv = new Cv(56, 56);
      const rng = new Rng(77);
      for (let i = 0; i < 9; i++) { const a = deg(i * 40 + rng.range(-8, 8)); const r = rng.range(18, 25); const x = 28 + Math.cos(a) * r, y = 28 + Math.sin(a) * r; cv.ellipse(x, y, 2.5, 2, P.dustL); cv.rect(x - 2, y, 4, 2, P.dustM); cv.set(x - 2, y - 2, P.dustL); }
      cv.dither(1);
      add('impact_heavy', 'hvy_5', cv);
    }
  }

  // ------------------------------------------------ debris (potongan padat dengan garis tepi)
  const S = (pts, b, h, l) => chunk(P, pts, b, h, l);
  add('debris', 'deb_stone_a', S([[0, 1], [3, 0], [6, 2], [5, 4], [1, 4]], P.stoneM, P.stoneL, P.stoneD));
  add('debris', 'deb_stone_b', S([[1, 0], [4, 1], [4, 4], [0, 3]], P.stoneM, P.stoneL, P.stoneD));
  add('debris', 'deb_stone_c', S([[0, 1], [2, 0], [3, 2], [1, 3]], P.stoneM, P.stoneL, P.stoneD));
  add('debris', 'deb_dirt_a', S([[0, 1], [3, 0], [5, 1], [4, 3], [1, 3]], P.dirtM, P.dirtL, P.dirtD));
  add('debris', 'deb_dirt_b', S([[0, 0], [3, 0], [3, 3], [0, 3]], P.dirtM, P.dirtL, P.dirtD));
  { const c = S([[0, 2], [3, 0], [8, 1], [9, 5], [5, 7], [1, 6]], P.stoneM, P.stoneL, P.stoneD); c.line(5, 3, 6, 6, P.stoneD); add('debris', 'deb_slab', c); }
  { const c = new Cv(4, 4); c.rect(1, 1, 2, 2, P.stoneL); c.set(2, 2, P.stoneD); add('debris', 'deb_pebble', c); }

  // ------------------------------------------------ ground_slam_crack 96x24 (7 tahap)
  {
    const rngR = new Rng(7), rngL = new Rng(11);
    const side = (rng, sgn) => {
      const pts = [];
      let y = 12;
      for (let s = 0; s <= 48; s += 4 + rng.int(0, 1)) { y = Math.max(7, Math.min(16, y + rng.int(-2, 2))); pts.push([48 + sgn * s, y]); }
      const br = [[8, 1], [22, -1], [34, 1]].map(([s, dir]) => ({ s, dir, len: 7 + rng.int(0, 3) }));
      return { pts, br };
    };
    const sides = [side(rngR, 1), side(rngL, -1)];
    const limit = [10, 21, 32, 42, 48, 48, 40];
    limit.forEach((L, k) => {
      const cv = new Cv(96, 24);
      const settle = k === 6;
      for (const sd of sides) {
        let prev = null;
        for (const [x, y] of sd.pts) {
          if (Math.abs(x - 48) > L) break;
          if (prev) { cv.line(prev[0], prev[1], x, y, P.ink); cv.line(prev[0], prev[1] + 1, x, y + 1, P.ink); }
          prev = [x, y];
        }
        for (const b of sd.br) {
          if (Math.abs(b.s) > L - 3) continue;
          const bp = sd.pts.find((p) => Math.abs(p[0] - 48) >= b.s) ?? sd.pts[sd.pts.length - 1];
          const sgn = bp[0] > 48 ? 1 : -1;
          cv.line(bp[0], bp[1], bp[0] + sgn * (b.len - 2), bp[1] + b.dir * Math.min(b.len, 5), P.ink);
        }
      }
      // pusat: kawah lebih lebar saat awal
      const cw = Math.min(8, 3 + k * 2);
      cv.ellipse(48, 12, cw, 3, P.ink);
      // bibir: sisi atas terang (dirtL), sisi bawah gelap (dirtD) di tepi retakan
      const snap = new Cv(96, 24); snap.d.set(cv.d);
      for (let y = 0; y < 24; y++) for (let x = 0; x < 96; x++) {
        if (snap.get(x, y)) continue;
        if (snap.get(x, y + 1) === P.ink && !snap.get(x, y - 1)) cv.set(x, y, k >= 1 ? P.dirtL : 0);
        else if (snap.get(x, y - 1) === P.ink && !snap.get(x, y + 1)) cv.set(x, y, k >= 1 ? P.dirtD : 0);
      }
      if (k >= 2) { // serpihan batu di bibir
        const r = new Rng(40 + k);
        for (let i = 0; i < Math.min(2 + k, 8); i++) { const x = 48 + r.int(-L, L), y = r.int(5, 18); if (!cv.get(x, y)) { cv.set(x, y, P.stoneL); cv.set(x + 1, y, P.stoneM); } }
      }
      if (k >= 4) { // debu di ujung retakan
        for (const sgn of [-1, 1]) for (let i = 0; i < 6; i++) cv.set(48 + sgn * (L - 3 + (i % 3)), 8 + i, i % 2 ? P.dustL : P.dustM);
      }
      if (settle) { for (let y = 0; y < 24; y++) for (let x = 0; x < 96; x++) if (cv.get(x, y) === P.ink && (x + y) % 3 === 0) cv.set(x, y, P.dirtD); cv.dither(1); }
      add('ground_slam_crack', `crack_${k + 1}`, cv);
    });
  }

  // ------------------------------------------------ dust_puff 32x24 (pivot bawah)
  {
    const stage = [[3, 0, 0], [4, 1, 0], [5, 2, 0], [5, 3, 1], [5, 4, 2]];
    stage.forEach(([r, lift, dith], k) => {
      const cv = new Cv(32, 24);
      const blobs = [[10, 17 - lift * 0.4, r], [16, 15 - lift, r + 1], [22, 17 - lift * 0.4, r]];
      if (k >= 2) { blobs[0][0] = 8; blobs[2][0] = 24; }
      for (const [bx, by, br] of blobs)
        cv.ellipse(bx, by, br + 0.5, br - 0.5, (x, y, dx, dy) => (dx + dy < -0.35 ? P.dustL : dx + dy > 0.55 ? P.dustM : P.dustL));
      for (let x = 4; x < 28; x++) { const y = 20 - Math.floor(lift * 0.3); if (cv.get(x, y)) cv.set(x, y, P.dustM); }
      cv.dither(dith);
      add('dust_puff', `dust_${k + 1}`, cv, 20 / 24);
    });
  }
  return out;
}
