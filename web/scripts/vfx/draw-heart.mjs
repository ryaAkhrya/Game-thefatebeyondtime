// Atlas vfx_heart (Phase 8): Heart (segel emas pucat + teal jeda) dan debu menara runtuh dari kejauhan.
// heart_lock_glow = segel pengunci berdenyut pelan (loop, persisten, tanpa kedip tajam); heart_unseal = cincin pecah + tiang cahaya emas pucat naik
// (flashy, ada `_c`); tower_dust = tiang debu jauh yang naik dan melebar (untuk jendela busur Ruang Heart, C4-04). Tanpa jam pasir/jam.
import { Cv, Rng } from './kit.mjs';
import { clamp, glint, puff, rad, remap } from './draw-util.mjs';

export const PALETTE = {
  ink: '#1D1625', goldD: '#A8742F', gold: '#E3B66A', pale: '#F3E2A8', tealD: '#2F5E62', tealM: '#5E9A98', tealL: '#A9D6D0',
  mist: '#ECE3D6', dust: '#C2B49A', dustD: '#9C8E78', dustDD: '#6E655F', smoke: '#463F3F', smokeL: '#5A4C55', plum: '#4D3A5F', plumL: '#8A77A0',
};

export function frames(P) {
  const out = [];
  const add = (group, name, cv, pivotY = 0.5) => out.push({ group, name, cv, pivotY });

  // partikel
  { const c = new Cv(4, 4); glint(c, 1, 1, 1, P.gold, P.pale); add('particles', 'hmote_a', c); }
  { const c = new Cv(3, 3); c.rect(0, 0, 2, 2, P.gold); c.set(0, 0, P.pale); add('particles', 'hmote_b', c); }
  { const c = new Cv(3, 3); c.rect(0, 0, 2, 2, P.tealM); add('particles', 'hmote_c', c); }
  { const c = new Cv(4, 3); c.rect(0, 0, 3, 2, P.dust); c.set(2, 1, P.dustD); add('particles', 'hdust_a', c); }

  // ------------------------------------------------ heart_lock_glow: segel pengunci 48x48 (pusat 24,24), loop 4 frame + peluruhan 3 frame
  {
    const mk = (k) => {
      const c = new Cv(48, 48);
      // cincin luar: 6 busur putus-putus berputar 15 derajat per frame (periode 60 -> loop mulus setelah 4 frame)
      c.ring(24, 24, 20, 20, 1, P.goldD, (x, y, a) => (((a * 180) / Math.PI + 180 + k * 15) % 60) > 40);
      c.ring(24, 24, 16, 16, 1, P.plumL, (x, y, a) => Math.abs(Math.sin(a * 3 + k * 0.52)) < 0.28);
      // inti: lengkung runcing kecil di tengah (lancet) + denyut hangat pelan
      const core = [P.gold, P.pale, P.gold, P.goldD][k];
      c.poly([[24, 8], [31, 24], [24, 40], [17, 24]], P.plum);
      c.poly([[24, 12], [28, 24], [24, 36], [20, 24]], core);
      c.poly([[24, 17], [26, 24], [24, 31], [22, 24]], P.goldD);
      for (let i = 0; i < 4; i++) { const a = rad(i * 90 + 45 + k * 22.5); glint(c, Math.round(24 + Math.cos(a) * 20), Math.round(24 + Math.sin(a) * 20), 1, i % 2 ? P.tealM : P.gold, P.pale); }
      return c;
    };
    for (let k = 0; k < 4; k++) add('heart_lock_glow', `hlock_${k + 1}`, mk(k));
    const base = mk(0);
    [1, 2, 3].forEach((lv) => { const c = remap(base, { [P.pale]: P.goldD, [P.gold]: P.goldD, [P.tealM]: P.tealD }); c.dither(lv); add('heart_lock_glow', `hlock_x${lv}`, c); });
  }

  // ------------------------------------------------ heart_unseal: cincin pecah + tiang cahaya (96x112, pusat dasar 48,96)
  {
    const mk = (k, calm) => {
      const c = new Cv(96, 112);
      const hi = calm ? P.gold : P.pale, mid = P.gold;
      const split = [0, 3, 8, 14, 20, 26, 30][k];
      // enam segmen cincin bergerak keluar
      for (let s = 0; s < 6; s++) {
        const a0 = s * 60 + 6, ang = rad(a0 + 24);
        const ox = Math.cos(ang) * split, oy = Math.sin(ang) * split * 0.3;
        const t = new Cv(96, 112);
        t.ring(48, 96, 22, 7, 2, (x, y, dx, dy) => (dy < 0 ? hi : mid), (x, y, a) => { const d = (((a * 180) / Math.PI + 360) % 360); return !(d >= a0 && d < a0 + 48); });
        c.blit(t, Math.round(ox), Math.round(oy));
      }
      // tiang cahaya: bertingkat (kotak bertangga, tepi dither), tingginya naik
      const h = [0, 14, 40, 70, 84, 78, 50][k], w = [0, 6, 12, 14, 12, 8, 4][k];
      for (let y = 0; y < h; y++) {
        const yy = 94 - y, t = y / Math.max(1, h), half = Math.round((w / 2) * (1 - t * 0.35));
        for (let x = -half; x <= half; x++) {
          const edge = Math.abs(x) >= half - 1;
          if (edge && ((x + y) & 1)) continue;
          c.set(48 + x, yy, edge ? mid : Math.abs(x) < half / 2 ? hi : P.gold);
        }
      }
      if (k >= 2 && k <= 5) for (let i = 0; i < 10; i++) { const r = new Rng(70 + i + k * 11); c.set(32 + r.int(0, 32), 90 - ((k * 13 + i * 17) % 80), i % 3 === 0 ? hi : i % 3 === 1 ? P.gold : P.tealM); }
      if (k === 6) c.dither(1);
      return c;
    };
    for (let k = 0; k < 7; k++) { add('heart_unseal', `hunseal_${k + 1}`, mk(k, false), 96 / 112); if (k >= 2 && k <= 5) add('heart_unseal', `hunseal_${k + 1}_c`, mk(k, true), 96 / 112); }
  }

  // ------------------------------------------------ tower_dust: debu runtuhnya menara dari kejauhan (192x128, pivot garis cakrawala y=112)
  {
    const tones = [P.dustDD, P.dustD, P.dust, P.mist];
    const dark = [P.smoke, P.dustDD, P.dustD, P.dust];
    const mk = (k) => {
      const c = new Cv(192, 128);
      const rg = new Rng(2000 + k);
      const gy = 112;
      // dasar: awan rendah melebar
      const baseW = [20, 34, 48, 62, 72, 80, 84, 86][k];
      const nb = 6 + Math.floor(k / 2);
      for (let i = 0; i < nb; i++) puff(c, 96 + (i - (nb - 1) / 2) * (baseW * 1.7 / nb) + rg.int(-3, 3), gy - 8 - (i % 2) * 3, 11 + (k > 3 ? 3 : 0) + (i % 3) * 2, tones, 2100 + i + k * 9, 4, 0.7);
      // tiang naik: gumpalan bertumpuk makin tinggi lalu melebar di puncak
      const colH = [10, 30, 52, 70, 80, 84, 82, 76][k];
      for (let h = 14; h < colH; h += 10) { const f = h / Math.max(1, colH); puff(c, 96 + Math.round(Math.sin(h * 0.2 + k) * 4) + (k > 5 ? Math.round((h - 40) * 0.1) : 0), gy - 10 - h, 9 + f * 8 + (k > 2 ? 3 : 0), f > 0.55 ? tones : dark, 2200 + h + k * 5, 4, 0.9); }
      // tiang kedua yang lebih kecil, tertunda
      if (k >= 2) { const h2 = Math.max(0, colH - 26); for (let h = 12; h < h2; h += 10) puff(c, 138 + Math.round(Math.sin(h * 0.3) * 3), gy - 8 - h, 7 + h / 14, dark, 2400 + h + k, 3, 0.9); }
      // serpihan jatuh di tepi
      if (k >= 1 && k <= 6) for (let i = 0; i < 7; i++) c.set(70 + rg.int(0, 52), gy - 22 - ((k * 9 + i * 14) % 70), i % 2 ? P.dustDD : P.smokeL);
      c.outline(P.ink);
      if (k >= 6) c.dither(k === 6 ? 1 : 2);
      return c;
    };
    for (let k = 0; k < 8; k++) add('tower_dust', `tdustf_${k + 1}`, mk(k), 112 / 128);
  }
  void clamp;
  return out;
}
