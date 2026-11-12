// Atlas vfx_varlgrim (Phase 8): Varlgrim, Penjaga Waktu. Bahasa bentuk = kayu (tongkat besar berpilin, BUKAN jam pasir) + "jeda" teal
// (cincin putus-putus, retakan zig-zag) + penanda amber. Tanpa kilat putih berlebihan; varian tenang `_c` memetakan paper/amberL ke amberM.
// Isi: temporal_bind, time_distortion, staff_impact, fracture_mark (persisten), fracture_strike, seal_pulse, phase_shift, keeper_stance.
import { Cv, Rng } from './kit.mjs';
import { clamp, crackPath, dashed, glint, polyline, puff, rad, remap, shard } from './draw-util.mjs';

export const PALETTE = {
  ink: '#1D1625', woodD: '#3B2A1F', woodM: '#6B4A2E', woodL: '#9A6F44',
  tealD: '#2F5E62', tealM: '#5E9A98', tealL: '#A9D6D0',
  amberD: '#A8742F', amberM: '#E3B66A', amberL: '#F3DC9A', paper: '#ECE3D6',
  dust: '#C2B49A', dustD: '#9C8E78', stoneD: '#463F3F', ash: '#5A4C55',
};

export function frames(P) {
  const out = [];
  const add = (group, name, cv, pivotY = 0.5) => out.push({ group, name, cv, pivotY });
  const calmOf = (cv) => remap(cv, { [P.paper]: P.amberM, [P.amberL]: P.amberM, [P.tealL]: P.tealM });

  // ------------------------------------------------ partikel
  { const c = new Cv(3, 3); c.rect(0, 0, 2, 2, P.tealM); c.set(0, 0, P.tealL); add('particles', 'tmote_a', c); }
  { const c = new Cv(3, 3); c.rect(0, 0, 2, 2, P.amberM); c.set(0, 0, P.amberL); add('particles', 'tmote_b', c); }
  { const c = new Cv(5, 3); c.rect(0, 0, 4, 2, P.woodM); c.set(0, 0, P.woodL); c.set(1, 0, P.woodL); add('particles', 'tsplint_a', c); }
  { const c = new Cv(4, 3); c.rect(0, 0, 3, 2, P.woodL); c.set(2, 1, P.woodD); add('particles', 'tsplint_b', c); }
  { const c = new Cv(3, 3); c.rect(0, 0, 2, 2, P.dust); c.set(1, 1, P.dustD); add('particles', 'tdust_p', c); }

  // ------------------------------------------------ temporal_bind: 3 cincin teal putus-putus mengencang di tubuh target, lalu terkunci (64x80, pusat 32,40)
  {
    const cx = 32, ys = [-16, 0, 16], rs = [26, 22, 18, 14, 12, 12];
    rs.forEach((r, k) => {
      const c = new Cv(64, 80);
      const locked = k >= 4;
      ys.forEach((dy, i) => {
        const ry = Math.max(3, r * 0.3);
        c.ring(cx, 40 + dy, r, ry, 1, locked ? P.amberD : P.tealD, (x, y, a) => Math.abs(Math.sin(a * 5 + i * 1.3 + k)) < 0.32);
        c.ring(cx, 40 + dy, r - 1.5, Math.max(2, ry - 1.5), 1, locked ? P.amberM : P.tealM, (x, y, a) => Math.abs(Math.sin(a * 5 + i * 1.3 + k + 0.9)) < 0.42);
        for (let q = 0; q < 4; q++) { const a = rad(q * 90 + 45 + i * 15 + k * 12); c.set(cx + Math.cos(a) * r, 40 + dy + Math.sin(a) * ry, locked ? P.amberL : P.tealL); }
      });
      if (locked) for (const dy of ys) { c.rect(cx - 1, 40 + dy - Math.round(Math.max(3, r * 0.3)) - 1, 2, 3, P.amberM); c.rect(cx - 1, 40 + dy + Math.round(Math.max(3, r * 0.3)) - 1, 2, 3, P.amberD); }
      if (k === 5) c.dither(1);
      add('temporal_bind', `tbind_${k + 1}`, c);
    });
  }

  // ------------------------------------------------ time_distortion: gelombang jeda melebar + irisan garis tergeser (200x112, pusat 100,56)
  {
    const cx = 100, cy = 58;
    [28, 46, 64, 80, 92, 98].forEach((rx, k) => {
      const c = new Cv(200, 112);
      const ry = rx * 0.4;
      // cincin gelombang terpotong-potong: tiap segmen bergeser vertikal 0/1/2 px (slip waktu)
      const segs = 20;
      for (let s = 0; s < segs; s++) {
        if (s % 4 === 3) continue;
        const t = new Cv(200, 112);
        t.ring(cx, cy, rx, ry, k < 4 ? 2 : 1, (x, y, dx, dy) => (dy < 0 ? P.tealM : P.tealD), (x, y, a) => Math.floor((((a + Math.PI) / (Math.PI * 2)) * segs) % segs) !== s);
        c.blit(t, 0, (s * 7 + k) % 3);
      }
      if (k >= 1) c.ring(cx, cy, Math.round(rx * 0.7), Math.round(ry * 0.7), 1, P.tealD, (x, y, a) => Math.abs(Math.sin(a * 6 + k)) < 0.5);
      // irisan: garis mendatar putus-putus bergeser (kesan bingkai waktu terpotong)
      for (let i = 0; i < 6; i++) {
        const y = cy - ry * 0.8 + i * ry * 0.32, off = (i % 2 ? 1 : -1) * (2 + k);
        const len = Math.max(8, rx * 0.5);
        dashed(c, [[cx - len + off, Math.round(y)], [cx + len + off, Math.round(y)]], 5, 4, i % 3 === 0 ? P.tealL : P.tealM, i * 3);
      }
      for (let q = 0; q < 8; q++) { const a = rad(q * 45 + 11 + k * 7); c.set(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, q % 2 ? P.amberM : P.amberL); }
      if (k >= 4) c.dither(k === 4 ? 1 : 2);
      add('time_distortion', `tdist_${k + 1}`, c);
      if (k >= 1 && k <= 3) add('time_distortion', `tdist_${k + 1}_c`, calmOf(c));
    });
  }

  // ------------------------------------------------ staff_impact: hantaman kayu: serpihan + busur debu (56x56)
  {
    const cx = 28, cy = 30;
    const mk = (k, calm) => {
      const c = new Cv(56, 56);
      const core = calm ? P.amberM : P.paper;
      if (k === 0) { c.ellipse(cx, cy, 7, 5, (x, y, dx, dy) => (dx + dy < -0.2 ? core : P.amberM)); for (let a = 0; a < 360; a += 45) { const r = rad(a + 22); c.line(cx + Math.cos(r) * 9, cy + Math.sin(r) * 7, cx + Math.cos(r) * 15, cy + Math.sin(r) * 12, P.amberD); } }
      if (k === 1) {
        for (let a = 0; a < 360; a += 45) { const r = rad(a), l = 14 + (a % 90 ? 0 : 5); shard(c, cx + Math.cos(r) * l, cy + Math.sin(r) * l * 0.85, 4, a * 3, (x, y, px, py) => (x + y < px + py ? P.woodL : P.woodD), a + 3, 4); }
        c.ring(cx, cy, 12, 9, 2, P.dust, (x, y, ang) => Math.abs(Math.sin(ang * 4)) < 0.3);
        c.ellipse(cx, cy, 3, 2, P.amberM);
      }
      if (k === 2) {
        for (let a = 0; a < 360; a += 45) { const r = rad(a + 8), l = 20 + (a % 90 ? 3 : 7); shard(c, cx + Math.cos(r) * l, cy + Math.sin(r) * l * 0.85, 3, a * 5, (x, y, px, py) => (x + y < px + py ? P.woodL : P.woodM), a + 9, 4); }
        c.ring(cx, cy, 19, 14, 2, P.dustD, (x, y, ang) => Math.abs(Math.sin(ang * 5)) < 0.35);
      }
      if (k === 3) { c.ring(cx, cy, 23, 17, 1, P.dustD, (x, y, ang) => Math.abs(Math.sin(ang * 5)) < 0.45); for (let a = 0; a < 360; a += 60) { const r = rad(a + 20); puff(c, cx + Math.cos(r) * 22, cy + Math.sin(r) * 16, 4, [P.stoneD, P.dustD, P.dust], 80 + a, 3, 0.8); } }
      if (k === 4) { for (let a = 0; a < 360; a += 60) { const r = rad(a + 20); c.set(cx + Math.cos(r) * 25, cy + Math.sin(r) * 19, P.dustD); c.set(cx + Math.cos(r) * 26, cy + Math.sin(r) * 20, P.dust); } }
      return c;
    };
    for (let k = 0; k < 5; k++) { add('staff_impact', `simp_${k + 1}`, mk(k, false)); if (k < 2) add('staff_impact', `simp_${k + 1}_c`, mk(k, true)); }
  }

  // ------------------------------------------------ fracture_mark: simbol retak di atas target, persisten (loop 4 frame) + peluruhan (40x56)
  {
    const mk = (k, calm) => {
      const c = new Cv(40, 56);
      const rg = new Rng(7);
      const pts = crackPath(20, 4, 20, 50, 5, 6, rg);
      const glow = [P.tealM, P.tealL, P.tealM, P.tealD][k];
      polyline(c, pts.map(([x, y]) => [x + 1, y + 1]), P.ink);
      polyline(c, pts, calm && glow === P.tealL ? P.tealM : glow);
      [[1, -12, 8], [3, 12, 7], [4, -10, 6]].forEach(([i, dx, dy], bi) => { const q = pts[i]; polyline(c, [[q[0], q[1]], [q[0] + dx, q[1] + dy]], bi === 1 ? P.amberM : P.tealM); });
      c.ring(20, 28, 15, 15, 1, P.tealD, (x, y, a) => Math.abs(Math.sin(a * 3 + k * 1.57)) < 0.42);
      const pip = [P.amberM, P.amberD, P.amberM, P.amberL][k];
      c.rect(19, 27, 2, 2, calm && pip === P.amberL ? P.amberM : pip);
      return c;
    };
    for (let k = 0; k < 4; k++) add('fracture_mark', `fmark_${k + 1}`, mk(k, false));
    const base = mk(0, false);
    [1, 2, 3].forEach((lv) => { const c = remap(base, { [P.tealM]: P.tealD, [P.amberM]: P.amberD }); c.dither(lv); add('fracture_mark', `fmark_x${lv}`, c); });
  }

  // ------------------------------------------------ fracture_strike: retakan menyambar menembus target (72x88, pusat 36,44)
  {
    const mk = (k, calm) => {
      const c = new Cv(72, 88);
      const core = calm ? P.amberM : P.paper, mid = calm ? P.amberM : P.amberL;
      const grow = [0.35, 1, 1, 0.8, 0.5, 0.3][k];
      const pts = crackPath(36, 2, 36, 2 + 84 * grow, 7, 8, new Rng(41));
      if (k <= 4) {
        polyline(c, pts.map(([x, y]) => [x + 1, y + 1]), P.ink);
        polyline(c, pts.map(([x, y]) => [x - 1, y]), P.tealM);
        polyline(c, pts.map(([x, y]) => [x + 1, y]), P.tealD);
        polyline(c, pts, k === 1 || k === 2 ? core : mid);
        if (k >= 1) [[2, -22, 12], [4, 20, 10], [6, -16, 8], [3, 18, -8]].forEach(([i, dx, dy], bi) => { const q = pts[Math.min(i, pts.length - 1)]; polyline(c, [[q[0], q[1]], [q[0] + dx, q[1] + dy]], bi % 2 ? P.tealM : mid); });
        if (k >= 1 && k <= 3) { for (let a = 0; a < 360; a += 45) { const r = rad(a + 10); shard(c, 36 + Math.cos(r) * (16 + k * 5), 44 + Math.sin(r) * (18 + k * 4), 3, a * 2, (x, y, px, py) => (x + y < px + py ? P.tealL : P.tealD), a + 5, 4); } }
      }
      if (k >= 4) { for (let a = 0; a < 360; a += 40) { const r = rad(a); c.set(36 + Math.cos(r) * 28, 44 + Math.sin(r) * 30, P.tealM); c.set(36 + Math.cos(r) * 31, 44 + Math.sin(r) * 33, P.tealD); } }
      return c;
    };
    for (let k = 0; k < 6; k++) { add('fracture_strike', `fstr_${k + 1}`, mk(k, false)); if (k >= 1 && k <= 2) add('fracture_strike', `fstr_${k + 1}_c`, mk(k, true)); }
  }

  // ------------------------------------------------ seal_pulse: cincin segel di kaki Varlgrim (source), gelombang rendah (travel), cincin menghantam barisan (target)
  {
    const gl = (c, cx, cy, rx, ry, n, off, a, b) => { for (let i = 0; i < n; i++) { const t = rad(i * (360 / n) + off); const x = Math.round(cx + Math.cos(t) * rx), y = Math.round(cy + Math.sin(t) * ry); c.set(x, y, a); c.set(x, y - 1, b); } };
    [14, 26, 38, 46].forEach((rx, k) => {
      const c = new Cv(104, 36);
      c.ring(52, 18, rx, rx * 0.28, 1, k < 3 ? P.amberM : P.amberD, (x, y, a) => Math.abs(Math.sin(a * 4 + k)) < 0.3);
      c.ring(52, 18, rx - 3, Math.max(2, rx * 0.28 - 2), 1, P.tealD, (x, y, a) => Math.abs(Math.sin(a * 6)) < 0.4);
      gl(c, 52, 18, rx, rx * 0.28, 8, k * 9, P.amberL, P.amberM);
      if (k === 3) c.dither(1);
      add('seal_pulse_src', `spsrc_${k + 1}`, c);
    });
    [[0, 36, 14], [1, 40, 12], [2, 34, 10]].forEach(([k, w, h]) => {
      const c = new Cv(48, 20);
      const cy = 12 - k;
      for (let i = 0; i < w / 2; i++) { const t = i / (w / 2); const y = Math.round(cy - 3 * Math.sin(t * Math.PI)); const x = 4 + i * 2; c.rect(x, y, 2, 2, P.tealM); c.set(x, y - 1, P.tealL); c.set(x + 1, y + 2, P.tealD); }
      c.rect(2, cy + 1, 4, 2, P.amberM); c.rect(w + 2 - k, cy + 1, 4, 2, P.amberD);
      void h; add('seal_pulse_wave', `spwave_${k + 1}`, c);
    });
    for (const calm of [false, true]) {
      [22, 44, 66, 84, 96].forEach((rx, k) => {
        if (calm && k > 2) return;
        const c = new Cv(200, 64);
        const hot = calm ? P.amberM : P.amberL;
        c.ring(100, 32, rx, rx * 0.26, k < 3 ? 2 : 1, k < 2 ? hot : P.amberM, (x, y, a) => Math.abs(Math.sin(a * 6 + k)) < 0.22);
        c.ring(100, 32, rx - 4, Math.max(2, rx * 0.26 - 2), 1, P.tealM, (x, y, a) => Math.abs(Math.sin(a * 8)) < 0.35);
        for (let i = 0; i < 10; i++) { const t = rad(i * 36 + 12 * k), x = Math.round(100 + Math.cos(t) * rx), y = Math.round(32 + Math.sin(t) * rx * 0.26); c.rect(x - 1, y - 1, 2, 2, i % 2 ? P.amberD : hot); }
        if (k >= 3) c.dither(k === 3 ? 1 : 2);
        add('seal_pulse_hit', `sphit_${k + 1}${calm ? '_c' : ''}`, c);
      });
    }
  }

  // ------------------------------------------------ phase_shift: jeda transisi fase: cincin naik + garis vertikal putus-putus + bintik amber (96x112, pusat 48,64)
  {
    const mk = (k, calm) => {
      const c = new Cv(96, 112);
      const hi = calm ? P.amberM : P.amberL;
      for (let i = 0; i < 4; i++) {
        const y = 100 - ((k * 9 + i * 22) % 96), r = 12 + (96 - Math.abs(y - 56)) * 0.12;
        const alive = (k + i) % 8 < 7;
        if (!alive) continue;
        c.ring(48, y, Math.round(r + k), Math.round((r + k) * 0.3), 1, (y < 30 || y > 90) ? P.tealD : P.tealM, (x, yy, a) => Math.abs(Math.sin(a * 5 + i)) < 0.3);
      }
      for (let i = -2; i <= 2; i++) dashed(c, [[48 + i * 8, 104], [48 + i * 8, 100 - k * 8 - Math.abs(i) * 6]], 4, 4, Math.abs(i) === 2 ? P.tealD : P.tealM, i * 3 + k);
      for (let q = 0; q < 6; q++) c.set(26 + ((q * 17 + k * 5) % 44), 104 - ((k * 11 + q * 19) % 90), q % 3 ? P.amberM : hi);
      glint(c, 48, 104 - k * 11, 1, P.amberM, hi);
      if (k >= 6) c.dither(k === 6 ? 1 : 2);
      return c;
    };
    for (let k = 0; k < 8; k++) { add('phase_shift', `pshift_${k + 1}`, mk(k, false)); if (k >= 1 && k <= 5) add('phase_shift', `pshift_${k + 1}_c`, mk(k, true)); }
  }

  // ------------------------------------------------ keeper_stance: tongkat ditanam: lingkaran penjaga di kaki + retak tanah (80x40)
  {
    [10, 22, 32, 36, 36].forEach((rx, k) => {
      const c = new Cv(80, 40);
      c.ring(40, 22, rx, rx * 0.3, 1, P.woodL, (x, y, a) => Math.abs(Math.sin(a * 3)) < 0.18);
      if (k >= 1) c.ring(40, 22, rx - 4, Math.max(2, rx * 0.3 - 2), 1, P.amberD, (x, y, a) => Math.abs(Math.sin(a * 6)) < 0.35);
      if (k >= 2) for (let i = 0; i < 4; i++) { const t = rad(i * 90 + 45); const x = Math.round(40 + Math.cos(t) * (rx - 2)), y = Math.round(22 + Math.sin(t) * (rx * 0.3 - 1)); c.rect(x - 1, y - 1, 3, 2, P.amberM); c.set(x, y - 2, P.amberL); }
      c.line(40, 22, 40 - 4 - k * 2, 26, P.woodD); c.line(40, 22, 40 + 5 + k * 2, 25, P.woodD); c.line(40, 22, 41, 29 + Math.min(k, 2), P.woodD);
      if (k >= 1) puff(c, 40 - rx * 0.6, 20, 3 + k, [P.stoneD, P.dustD, P.dust], 20 + k, 3, 0.7);
      if (k >= 1) puff(c, 40 + rx * 0.6, 20, 3 + k, [P.stoneD, P.dustD, P.dust], 30 + k, 3, 0.7);
      if (k === 4) c.dither(1);
      add('keeper_stance', `kstance_${k + 1}`, c);
    });
  }
  return out;
}
