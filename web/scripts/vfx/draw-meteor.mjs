// Atlas vfx_meteor (Phase 8): meteor Varlgrim. Identitas "waktu": kerak batu berpilin (pita spiral), retakan teal bergaris-jeda
// (putus-putus, denyutnya merayap), busur jeda putus-putus yang berputar pelan, bara di sisi bawah. BUKAN bola api generik dan BUKAN jam pasir.
// Isi: meteor_sky_hold (siluet menggantung, loop), meteor_descent (jatuh, membesar), meteor_impact (cincin kejut/letusan/retak lantai),
// meteor_aftermath (retak mendingin, asap, bara). Varian tenang `_c` = peta ulang ke tona lebih gelap (tanpa em4/em3/tl2 terang).
import { Cv, Rng } from './kit.mjs';
import { bayer, clamp, crackPath, dashed, pickTone, polyline, puff, rad, remap, ringNoise, shard } from './draw-util.mjs';

export const PALETTE = {
  ink: '#1D1625', rk0: '#2B2230', rk1: '#463F3F', rk2: '#6E655F', rk3: '#9A9088',
  em0: '#7A3A2E', em1: '#A8552F', em2: '#D9824A', em3: '#E3B66A', em4: '#F3DC9A',
  tl0: '#2F5E62', tl1: '#5E9A98', tl2: '#A9D6D0', dust: '#C2B49A', dustD: '#9C8E78', ash: '#5A4C55',
};

/** noise Worley di ruang spiral (sudut berpilin terhadap log-radius): kembalikan {id, d1, d2} sel terdekat */
function plateField(seed, cols, rows) {
  const h = (i, j, k) => { let v = Math.imul(i * 374761393 + j * 668265263 + k * 2147483 + seed * 97, 1274126177); v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) / 4294967296; };
  return (ang, lr) => {
    const X = (((ang / (Math.PI * 2)) % 1 + 1) % 1) * cols, Y = lr * rows;
    const ci = Math.floor(X), cj = Math.floor(Y);
    let d1 = 9, d2 = 9, id = 0;
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        const j = cj + dj, i = ci + di, iw = ((i % cols) + cols) % cols;
        const fx = i + h(iw, j, 1), fy = j + h(iw, j, 2);
        const d = Math.hypot(X - fx, (Y - fy) * 1.25);
        if (d < d1) { d2 = d1; d1 = d; id = iw * 31 + j * 7 + 5; } else if (d < d2) d2 = d;
      }
    return { id, d1, d2 };
  };
}

/** badan meteor: siluet bergerigi, lempeng kerak yang berpilin (spiral), retakan teal putus-putus di batas lempeng, bara tepi bawah */
function body(cv, P, cx, cy, rx, ry, o) {
  const { seed = 1, ember = 0.6, glow = 0.5, pulse = 0, craters = 3, falling = false, rim = 0.2 } = o;
  const noise = ringNoise(seed, 4);
  const edgeAt = (ang) => 1 + 0.11 * noise(ang) + 0.05 * noise(ang * 2.7 + 1);
  const field = plateField(seed, 8, 5);
  const rk = [P.rk0, P.rk1, P.rk2, P.rk3];
  const emb = [P.em0, P.em1, P.em2, P.em3, P.em4];
  const x0 = Math.floor(cx - rx * 1.2), x1 = Math.ceil(cx + rx * 1.2), y0 = Math.floor(cy - ry * 1.2), y1 = Math.ceil(cy + ry * 1.2);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      const ang = Math.atan2(dy, dx), rr = Math.hypot(dx, dy), edge = edgeAt(ang);
      if (rr > edge) continue;
      const u = rr / edge;
      const nz = Math.sqrt(Math.max(0, 1 - u * u));
      // pilin: sudut dipuntir menurut log-radius
      const lr = Math.log(u + 0.22) + 1.6;
      const f = field(ang + 1.5 * Math.log(u + 0.22), clamp(lr, 0, 2.99) / 3 * 1);
      const plate = (f.id % 3) - 1; // -1..1 selisih tona per lempeng
      let light = 0.12 + 0.5 * (-0.5 * dx / edge - 0.62 * dy / edge) + 0.4 * nz * nz + plate * 0.13;
      let c;
      const seam = f.d2 - f.d1 < 0.085;
      if (seam) {
        // retakan di batas lempeng; sebagian jadi garis jeda teal putus-putus dengan denyut merayap
        const crackSeam = (f.id % 3) === 0;
        const dash = ((x + y * 2) % 6) < 4;
        if (crackSeam && dash) c = ((Math.floor((x + y) / 6) + f.id + pulse * 2) % 7 === 0) ? P.tl2 : (f.id % 2 ? P.tl1 : P.tl0);
        else c = P.rk0;
      } else {
        c = pickTone(rk, clamp(light, 0, 1), x, y, 0.2);
        // tepi lempeng terang (ridge) kiri-atas
        if (f.d2 - f.d1 < 0.2 && dx + dy < 0 && light > 0.45) c = P.rk3;
      }
      // bara: tepi bawah (atau seluruh tepi bila jatuh) berpita keras, bukan gradien halus
      const bottom = falling ? clamp(dy / edge + 0.75, 0, 1.4) : clamp(dy / edge - 0.02, 0, 1);
      const depth = u - (1 - rim * (0.6 + 0.8 * glow) * (0.35 + 0.65 * bottom) * (0.85 + 0.3 * ember));
      if (depth > 0 && bottom > 0.05 && !seam) {
        const t = clamp(depth / (rim * 1.1) + 0.25 * bottom, 0, 0.99);
        c = emb[Math.min(3, Math.floor(t * 4.2)) + (t > 0.97 && ((x + y) & 1) ? 1 : 0)];
        if (((x + y) & 1) && t < 0.2) c = P.em0;
      } else if (depth > -0.06 && bottom > 0.1 && !seam) c = P.rk1; // tepi hangus tepat sebelum bara
      cv.set(x, y, c);
    }
  // kawah: cekung, bibir terang kiri-atas
  const rg = new Rng(seed * 31 + 7);
  for (let i = 0; i < craters; i++) {
    const a = rg.range(0, Math.PI * 2), d = rg.range(0.38, 0.62);
    const px = cx + Math.cos(a) * d * rx * 0.9, py = cy + Math.sin(a) * d * ry * 0.9;
    const cr = Math.max(2.5, rx * rg.range(0.06, 0.1));
    cv.ellipse(px, py, cr, cr * 0.75, (x, y, dx, dy) => (dx + dy < -0.45 ? P.rk3 : dy > 0.1 ? P.rk0 : P.rk1));
    cv.ellipse(px + 0.6, py + 0.9, cr * 0.65, cr * 0.42, P.rk0);
  }
  cv.outline(P.ink);
}

/** busur jeda: potongan elips putus-putus (rotasi menurut `rot` derajat) di sekeliling badan */
function pauseArcs(cv, P, cx, cy, rx, ry, rot, behindFn) {
  const cols = [P.tl1, P.tl0];
  [1.22, 1.4].forEach((k, ri) => {
    const period = 72 + ri * 24;
    for (let a = 0; a < 360; a += 1) {
      const ang = (a + (rot * period) / 6 * (ri % 2 ? -1 : 1) + ri * 17 + 720) % period;
      if (ang > period * 0.55) continue;
      const th = rad(a);
      const x = cx + Math.cos(th) * rx * k, y = cy + Math.sin(th) * ry * k * 0.5;
      if (behindFn && !behindFn(x, y)) continue;
      cv.set(Math.round(x), Math.round(y), cols[ri]);
    }
  });
}

function chunk(cv, P, x, y, s, seed) {
  const t = new Cv(cv.w, cv.h);
  shard(t, x, y, s, seed * 40, (px, py, cx2, cy2) => (px + py < cx2 + cy2 ? P.rk3 : P.rk1), seed, 5);
  t.outline(P.ink);
  cv.blit(t, 0, 0);
}

export function frames(P) {
  const out = [];
  const add = (group, name, cv, pivotY = 0.5) => out.push({ group, name, cv, pivotY });
  const calmOf = (cv) => remap(cv, { [P.em4]: P.em3, [P.em3]: P.em2, [P.tl2]: P.tl1, [P.rk3]: P.rk2 });

  // ------------------------------------------------ partikel
  [[3, 3, [P.rk3, P.rk2]], [4, 3, [P.rk2, P.rk1]], [5, 4, [P.rk3, P.rk1]], [3, 2, [P.rk2, P.rk2]]].forEach(([w, h, [a, b]], i) => {
    const c = new Cv(w + 1, h + 1); c.rect(0, 0, w, h, b); c.set(0, 0, a); if (w > 3) c.set(1, 0, a); add('particles', `mrock_${'abcd'[i]}`, c);
  });
  { const c = new Cv(3, 3); c.rect(0, 0, 2, 2, P.em2); c.set(0, 0, P.em3); add('particles', 'mem_a', c); }
  { const c = new Cv(3, 3); c.rect(0, 0, 2, 2, P.em1); add('particles', 'mem_b', c); }
  { const c = new Cv(2, 3); c.rect(0, 0, 1, 2, P.em3); add('particles', 'mem_c', c); }
  { const c = new Cv(4, 3); c.rect(0, 0, 3, 2, P.ash); c.set(0, 0, P.rk2); add('particles', 'mash_a', c); }
  { const c = new Cv(3, 3); c.rect(0, 0, 2, 2, P.dustD); add('particles', 'mash_b', c); }
  // asap naik (frame berdasarkan umur)
  [[8, 1], [12, 2], [16, 3], [18, 4]].forEach(([r, k]) => {
    const c = new Cv(r * 2 + 4, r * 2 + 4);
    puff(c, r + 2, r + 2, r, [P.rk0, P.ash, P.rk1, P.rk2], 100 + k, 4);
    if (k >= 3) c.dither(1);
    if (k >= 4) c.dither(2);
    add('smoke', `msmk_${k}`, c);
  });

  // ------------------------------------------------ meteor_sky_hold: 6 frame loop, 248x170, pusat (124,86)
  {
    const W = 256, H = 196, cx = 128, cy = 96, rx = 72, ry = 62;
    const pulses = [0.55, 0.7, 0.85, 1, 0.85, 0.7];
    for (let k = 0; k < 6; k++) {
      const c = new Cv(W, H);
      const back = new Cv(W, H), front = new Cv(W, H);
      // 6 keping mengorbit; ukuran berulang tiap 3 -> loop mulus setelah 6 frame (geser 60/6 = 10 derajat per frame)
      const sizes = [4.5, 3.2, 2.4];
      for (let i = 0; i < 6; i++) {
        const a = rad(i * 60 + k * 10 + 20);
        const px = cx + Math.cos(a) * rx * 1.48, py = cy + 6 + Math.sin(a) * ry * 0.62;
        chunk(Math.sin(a) > 0 ? front : back, P, px, py, sizes[i % 3], 1 + (i % 3));
      }
      pauseArcs(c, P, cx, cy + 4, rx, ry, k, null);
      c.blit(back, 0, 0);
      body(c, P, cx, cy, rx, ry, { seed: 5, ember: pulses[k], glow: 0.55 + 0.15 * pulses[k], pulse: k, craters: 2, rim: 0.22 });
      // bara menetes dari sisi bawah (loop: jatuh 24 px per siklus)
      for (let i = 0; i < 5; i++) {
        const bx = cx - 36 + i * 18 + ((i * 7) % 5), y0 = cy + ry * (0.88 - Math.abs(i - 2) * 0.1) + 4;
        const t = (k + i * 1.3) % 6;
        const dy = Math.round(t * 4);
        if (t < 5) { c.rect(bx, y0 + dy, 1, 2, dy < 12 ? P.em3 : P.em1); if (dy < 8) c.set(bx, y0 + dy - 1, P.em2); }
      }
      c.blit(front, 0, 0);
      add('meteor_sky_hold', `mhold_${k + 1}`, c, 0.5);
    }
  }
  // peluruhan (stop(): pixel fade) 3 frame — dari mhold_1 yang di-dither makin parah, bara padam dahulu
  {
    const base = out.find((f) => f.name === 'mhold_1').cv;
    [1, 2, 3].forEach((lv) => {
      const c = new Cv(base.w, base.h); c.d.set(base.d);
      const m = {}; m[P.em4] = P.em1; m[P.em3] = P.em0; m[P.em2] = P.rk1; m[P.tl2] = P.tl0; m[P.tl1] = P.tl0;
      const d2 = remap(c, lv >= 1 ? m : {});
      d2.dither(lv === 1 ? 1 : lv === 2 ? 2 : 3);
      add('meteor_sky_hold', `mhold_x${lv}`, d2, 0.5);
    });
  }

  // ------------------------------------------------ meteor_descent: 6 ukuran, ekor ke atas, pivot = dasar badan
  {
    const Ds = [150, 164, 180, 198, 218, 240], Ts = [48, 52, 58, 64, 70, 76];
    Ds.forEach((D, k) => {
      const rx = D / 2, ry = D * 0.42, T = Ts[k];
      const W = Math.round(D + 36), cx = Math.round(W / 2), cy = T + Math.round(ry) + 6;
      const H = cy + Math.round(ry) + 10;
      const c = new Cv(W, H);
      // ekor: lidah bara bergelombang (tiap lidah = pita meruncing berlapis em0/em1/em2) + garis jeda teal putus-putus
      const rg = new Rng(900 + k);
      const tongues = [[-0.8, 0.55, 0.5, 0], [0.78, 0.55, 0.45, 2], [-0.52, 0.75, 0.8, 1], [0.5, 0.75, 0.78, 3], [-0.22, 0.9, 1.0, 4], [0.2, 0.9, 0.92, 5]];
      tongues.forEach(([ux, wid, len, ph]) => {
        const bx = cx + ux * rx, by = cy - ry * 0.2, L = ry * 0.8 + T * len * 1.15, w = rx * 0.27 * wid + 3;
        const sway = (6 + 3 * wid) * (ph % 2 ? 1 : -1);
        const strip = (s, col, fn) => {
          const L1 = [], R1 = [];
          for (let i = 0; i <= 14; i++) {
            const t = i / 14, cxl = bx + sway * Math.sin(t * 2.4 + ph + k * 0.6) * t, half = w * s * Math.pow(1 - t, 0.85) * (1 + 0.18 * Math.sin(t * 9 + ph));
            L1.push([cxl - half, by - L * t]); R1.push([cxl + half, by - L * t]);
          }
          c.poly([...L1, ...R1.reverse()], (x, y) => (fn ? fn(x, y) : col));
        };
        strip(1, null, (x, y) => (y < by - L * 0.72 && bayer(x, y) < 0.45 ? P.ash : P.em0));
        strip(0.66, P.em1);
        strip(0.32, (x, y) => (y > by - L * 0.5 ? P.em2 : P.em1));
      });
      for (let i = -2; i <= 2; i++) {
        const x = cx + Math.round(i * rx * 0.34), len = Math.round(T * (0.8 - Math.abs(i) * 0.1));
        dashed(c, [[x, cy - ry * 0.95], [x, cy - ry * 0.95 - len]], 3, 4, P.tl1, (i + 3) * 2);
      }
      const bd = new Cv(W, H);
      body(bd, P, cx, cy, rx, ry, { seed: 5, ember: 1, glow: 1, pulse: k, craters: 2, falling: true, rim: 0.05 });
      c.blit(bd, 0, 0);
      // percikan serpih mengelupas di kiri-kanan
      for (let i = 0; i < 6; i++) { const s = rg.range(0.5, 1) * 3.2; const side = i % 2 ? 1 : -1; chunk(c, P, cx + side * rx * rg.range(1.02, 1.18), cy - rg.range(0, ry * 0.9) - 6, s, 2 + i); }
      add('meteor_descent', `mdesc_${k + 1}`, c, (cy + ry) / H);
    });
  }

  // ------------------------------------------------ meteor_impact
  // letusan pusat: 6 frame 380x230, pivot dasar (gy=212): kilatan inti -> kubah api + batu terlempar -> kubah debu melebar -> menipis.
  // Sengaja BUKAN jamur/tiang: tabrakan batu raksasa = kubah rendah, kipas puing berjejak bara, dinding debu.
  {
    const W = 380, H = 230, cx = 190, gy = 212;
    const smoke = [P.ash, P.rk2, P.rk3, P.dustD];
    const fire = [P.em0, P.em1, P.em2, P.em3];
    const dome = (c, rx, ry, n, r, tones, seed, filler = 0) => {
      for (let i = 0; i < n; i++) { const a = Math.PI + (i / (n - 1)) * Math.PI; puff(c, cx + Math.cos(a) * rx, gy - 6 + Math.sin(a) * ry * 0.92, r * (0.85 + 0.3 * ((i * 7) % 3) / 2), tones, seed + i, 4, 0.8); }
      for (let i = 0; i < filler; i++) puff(c, cx + (i / Math.max(1, filler - 1) - 0.5) * rx * 1.2, gy - 6 - ry * 0.45 - (i % 2) * ry * 0.18, r * 1.5, tones, seed + 50 + i, 5, 0.8);
    };
    const rocks = (c, rg, n, a0, a1, r0, r1, up, sz, trail) => {
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1), a = rad(a0 + (a1 - a0) * t + rg.range(-5, 5)), l = rg.range(r0, r1);
        const x = cx + Math.cos(a) * l, y = gy - 8 + Math.sin(a) * l * up;
        if (trail) for (let j = 1; j <= trail; j++) c.rect(Math.round(cx + Math.cos(a) * l * (1 - j * 0.09)), Math.round(gy - 8 + Math.sin(a) * l * up * (1 - j * 0.09)), 2, 2, j % 2 ? P.em2 : P.em1);
        chunk(c, P, x, y, sz * rg.range(0.7, 1.25), 3 + i);
      }
    };
    const mk = (k) => {
      const c = new Cv(W, H), rg = new Rng(300 + k);
      if (k === 0) {
        // kilatan inti: lensa rendah bergerigi, serpih tajam, jet debu mendatar (amber pucat, bukan putih)
        c.ellipse(cx, gy - 8, 104, 20, (x, y, dx, dy) => (dy < -0.4 ? P.em4 : dy < 0.35 ? P.em3 : P.em2));
        for (let i = 0; i < 15; i++) { const a = rad(-178 + i * 12.5), l = 60 + ((i * 5) % 4) * 26; shard(c, cx + Math.cos(a) * l * 0.9, gy - 10 + Math.sin(a) * l * 0.72, 5 + ((i * 3) % 3) * 3, i * 41, (x, y, px, py) => (x + y < px + py ? P.em3 : P.em2), 70 + i, 4); c.line(cx + Math.cos(a) * 30, gy - 10 + Math.sin(a) * 9, cx + Math.cos(a) * l * 0.9, gy - 10 + Math.sin(a) * l * 0.72, P.em1); }
        c.rect(cx - 130, gy - 2, 260, 3, P.em1);
      } else if (k === 1) {
        dome(c, 70, 74, 9, 26, fire, 330, 3);
        puff(c, cx, gy - 30, 36, [P.em1, P.em2, P.em3, P.em4], 331, 5, 0.8);
        rocks(c, rg, 12, -172, -8, 90, 165, 0.95, 7, 3);
        for (let i = 0; i < 5; i++) puff(c, cx - 130 + i * 65, gy - 8, 16, smoke, 340 + i, 4, 0.7);
        c.rect(cx - 140, gy - 2, 280, 3, P.em0);
      } else if (k === 2) {
        puff(c, cx, gy - 24, 40, [P.em0, P.em1, P.em2, P.em3], 351, 5, 0.8);
        dome(c, 112, 92, 11, 30, smoke, 360, 4);
        rocks(c, rg, 11, -170, -10, 120, 185, 0.8, 6, 2);
        for (let i = 0; i < 7; i++) c.rect(cx - 70 + rg.int(0, 140), gy - 30 - rg.int(0, 70), 2, 2, P.em2);
        c.rect(cx - 150, gy - 2, 300, 3, P.dustD);
      } else if (k === 3) {
        dome(c, 150, 78, 12, 32, smoke, 380, 4);
        rocks(c, rg, 10, -165, -15, 130, 170, 0.45, 6, 0);
        for (let i = 0; i < 5; i++) c.rect(cx - 60 + rg.int(0, 120), gy - 28 - rg.int(0, 40), 2, 2, P.em1);
        c.rect(cx - 160, gy - 2, 320, 3, P.dustD);
      } else if (k === 4) {
        dome(c, 168, 54, 12, 30, smoke, 400, 3);
        for (let i = 0; i < 8; i++) chunk(c, P, cx - 150 + i * 42 + rg.int(-8, 8), gy - 6, 3 + (i % 3), 3 + i);
        c.dither(1);
        c.rect(cx - 170, gy - 2, 340, 3, P.dustD);
      } else {
        dome(c, 176, 36, 12, 24, smoke, 420, 2);
        c.dither(2);
        for (let i = 0; i < 6; i++) chunk(c, P, cx - 140 + i * 56, gy - 5, 3, 3 + i);
      }
      if (k >= 1) { const t = new Cv(W, H); t.d.set(c.d); t.outline(P.ink); return t; }
      return c;
    };
    for (let k = 0; k < 6; k++) { const c = mk(k); add('meteor_impact_burst', `mimp_${k + 1}`, c, gy / H); if (k < 2) add('meteor_impact_burst', `mimp_${k + 1}_c`, calmOf(c), gy / H); }
  }
  // gelombang kejut: dinding debu mendatar diskret (gugus gumpalan di sepanjang elips, berselang celah), 6 frame 380x84
  {
    const W = 380, H = 84, cx = 190, cy = 44;
    const rxs = [46, 84, 122, 150, 170, 182];
    rxs.forEach((rx, k) => {
      const c = new Cv(W, H), ry = rx * 0.19;
      const N = 14 + k * 2, pr = [9, 9, 8, 7, 6, 5][k];
      for (let s = 0; s < N; s++) {
        if (k >= 2 && s % 5 === 4) continue;
        const t = ((s + 0.5) / N) * Math.PI * 2;
        const x = cx + Math.cos(t) * rx, y = cy + Math.sin(t) * ry;
        const back = Math.sin(t) < 0;
        puff(c, x, y - 2, pr * (back ? 0.8 : 1), back ? [P.ash, P.rk2, P.dustD] : [P.rk2, P.dustD, P.dust], 600 + s + k * 20, 3, 0.75);
      }
      c.outline(P.ink);
      if (k >= 4) c.dither(k === 4 ? 1 : 2);
      add('meteor_impact_ring', `mring_${k + 1}`, c, 0.5);
    });
  }
  // retak lantai: 5 frame 330x72 (retakan radial bergerigi + garis bara), digambar dari pusat
  {
    const W = 330, H = 72, cx = 165, cy = 38;
    const rg0 = new Rng(700);
    const rays = Array.from({ length: 13 }, (_, i) => ({ a: rad(-90 + (i / 12) * 180 + (i % 2) * 8), len: 0.55 + rg0.next() * 0.45, seed: i }));
    const lead = [0.22, 0.45, 0.7, 0.9, 1];
    lead.forEach((L, k) => {
      const c = new Cv(W, H);
      const side = (s) => rays.forEach((r, i) => {
        const a = s > 0 ? r.a : Math.PI - r.a;
        const len = 150 * r.len * L;
        const ex = cx + Math.cos(a) * len, ey = cy + Math.sin(a) * len * 0.22;
        const pts = crackPath(cx, cy, ex, ey, 1.5 + L * 1.5, 3 + Math.round(len / 24), new Rng(710 + i * 3 + (s > 0 ? 0 : 1)));
        polyline(c, pts, P.ink);
        polyline(c, pts.map(([x, y]) => [x, y - 1]), k < 3 ? P.em2 : k === 3 ? P.em1 : P.em0);
        if (k >= 1 && i % 3 === 0) c.rect(Math.round(pts[Math.floor(pts.length / 2)][0]), Math.round(pts[Math.floor(pts.length / 2)][1]) - 1, 2, 2, k < 3 ? P.em3 : P.em1);
      });
      side(1); side(-1);
      c.ellipse(cx, cy, 22 * Math.min(1, L * 1.4), 6 * Math.min(1, L * 1.4), (x, y, dx, dy) => (k < 3 ? (dy < 0 ? P.em3 : P.em2) : P.em0));
      c.outline(P.ink);
      add('meteor_impact_crack', `mcrack_${k + 1}`, c, 0.5);
    });
  }
  // ------------------------------------------------ meteor_aftermath: retak membara mendingin 5 frame 330x72
  {
    const W = 330, H = 72, cx = 165, cy = 38;
    const rg0 = new Rng(700);
    const rays = Array.from({ length: 13 }, (_, i) => ({ a: rad(-90 + (i / 12) * 180 + (i % 2) * 8), len: 0.55 + rg0.next() * 0.45 }));
    const cool = [[P.em2, P.em3], [P.em1, P.em2], [P.em0, P.em1], [P.rk1, P.em0], [P.rk1, P.rk2]];
    cool.forEach(([lo, hi], k) => {
      const c = new Cv(W, H);
      const side = (s) => rays.forEach((r, i) => {
        const a = s > 0 ? r.a : Math.PI - r.a;
        const len = 150 * r.len;
        const ex = cx + Math.cos(a) * len, ey = cy + Math.sin(a) * len * 0.22;
        const pts = crackPath(cx, cy, ex, ey, 2.5, 3 + Math.round(len / 24), new Rng(710 + i * 3 + (s > 0 ? 0 : 1)));
        polyline(c, pts, P.ink);
        // bara bertahan di segmen dekat pusat, padam dari ujung
        const keep = Math.max(2, Math.round(pts.length * (1 - k * 0.2)));
        polyline(c, pts.slice(0, keep).map(([x, y]) => [x, y - 1]), lo);
        if (i % 3 === 0 && k < 4) c.rect(Math.round(pts[1][0]), Math.round(pts[1][1]) - 1, 2, 2, hi);
      });
      side(1); side(-1);
      c.ellipse(cx, cy, 22, 6, (x, y, dx, dy) => (k < 3 ? (dy < 0 ? hi : lo) : P.rk0));
      c.outline(P.ink);
      // puing lantai
      const rr = new Rng(800 + k);
      for (let i = 0; i < 14; i++) { const a = rr.range(0, Math.PI * 2), d = rr.range(30, 150); c.rect(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d * 0.22) - 1, 3 + (i % 2), 2, i % 3 ? P.rk2 : P.rk1); }
      if (k === 4) c.dither(1);
      add('meteor_aftermath', `maft_${k + 1}`, c, 0.5);
    });
  }
  return out;
}
