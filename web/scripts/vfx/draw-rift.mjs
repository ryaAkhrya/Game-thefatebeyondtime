// Atlas vfx_rift (Phase 8): serangan Riftborn (robekan ungu-teal) dan Gravorn (tekanan batu). Digambar menghadap kanan.
// riftborn_lash = sabetan robekan; riftborn_surge = rekahan vertikal terbuka berat (flashy, ada `_c`); gravorn_slam = tekanan turun + retak bintang + debu.
import { Cv, Rng } from './kit.mjs';
import { clamp, crackPath, polyline, puff, rad, remap, shard } from './draw-util.mjs';

export const PALETTE = {
  ink: '#1D1625', v0: '#2B2038', v1: '#5A4470', v2: '#8A6CA8', v3: '#C9A8E0',
  tealD: '#2F5E62', tealM: '#5E9A98', tealL: '#A9D6D0', rose: '#C25058', roseD: '#7A2E3A',
  stoneD: '#463F3F', stoneM: '#6E655F', stoneL: '#9A9088', dust: '#C2B49A', dustD: '#9C8E78',
};

export function frames(P) {
  const out = [];
  const add = (group, name, cv, pivotY = 0.5) => out.push({ group, name, cv, pivotY });
  const calmOf = (cv) => remap(cv, { [P.v3]: P.v2, [P.tealL]: P.tealM });

  // partikel
  { const c = new Cv(4, 4); c.poly([[0, 1], [3, 0], [2, 3]], (x, y) => (x + y < 3 ? P.v3 : P.v1)); add('particles', 'rshard_a', c); }
  { const c = new Cv(3, 3); c.rect(0, 0, 2, 2, P.v2); c.set(0, 0, P.tealL); add('particles', 'rshard_b', c); }
  { const c = new Cv(3, 3); c.rect(0, 0, 2, 2, P.tealM); add('particles', 'rshard_c', c); }
  { const c = new Cv(4, 3); c.rect(0, 0, 3, 2, P.stoneM); c.set(0, 0, P.stoneL); add('particles', 'gchip_a', c); }
  { const c = new Cv(5, 4); c.rect(0, 0, 4, 3, P.stoneD); c.set(0, 0, P.stoneL); c.set(1, 0, P.stoneM); add('particles', 'gchip_b', c); }

  // ------------------------------------------------ riftborn_lash: robekan melengkung (72x56), digambar menghadap kanan; sabetan atas-kiri -> bawah-kanan
  {
    const mk = (k) => {
      const c = new Cv(72, 56);
      const prog = [0.4, 1, 1, 0.85, 0.6][k], wMax = [2.5, 7, 8, 6, 3.5][k];
      const n = 24, m = Math.max(3, Math.round(n * prog));
      const L = [], R = [], mid = [];
      for (let i = 0; i <= m; i++) {
        const t = i / n, x = 8 + t * 56, y = 6 + 44 * Math.pow(t, 1.3) + 5 * Math.sin(t * 3.1);
        const half = (wMax / 2) * Math.sin(Math.min(1, t * 1.15 + 0.04) * Math.PI) * (i % 2 ? 0.8 : 1.1);
        // normal kasar: tegak lurus arah sabetan (kanan-bawah) -> (+1,-1)/sqrt2
        L.push([x - half * 0.7, y - half * 0.7 * -1]); R.push([x + half * 0.7, y + half * 0.7 * -1]); mid.push([x, y]);
      }
      c.poly([...L, ...R.reverse()], P.ink);
      c.outline(P.v1);
      polyline(c, mid.slice(1, -1), P.tealM);
      if (k >= 1 && k <= 3) { const rg = new Rng(300 + k); for (let i = 0; i < 7; i++) { const q = mid[Math.min(mid.length - 1, 2 + i * 3)]; const a = rad(rg.range(-70, 70) + 135); const d = 6 + k + rg.int(0, 3); c.set(q[0] + Math.cos(a) * d, q[1] + Math.sin(a) * d, i % 2 ? P.tealL : P.v3); c.set(q[0] + Math.cos(a) * (d + 2), q[1] + Math.sin(a) * (d + 2), P.v2); } }
      if (k === 4) c.dither(1);
      return c;
    };
    for (let k = 0; k < 5; k++) add('riftborn_lash', `rlash_${k + 1}`, mk(k));
  }

  // ------------------------------------------------ riftborn_surge: rekahan vertikal terbuka berat di target (96x96, pusat 48,52)
  {
    const mk = (k, calm) => {
      const c = new Cv(96, 96);
      const open = [2, 6, 12, 16, 14, 9, 4][k], len = [28, 44, 80, 86, 80, 60, 30][k] / 2;
      const hi = calm ? P.tealM : P.tealL, v3 = calm ? P.v2 : P.v3;
      const edge = crackPath(48, 52 - len, 48, 52 + len, 4, 8, new Rng(500));
      // isi rekahan (gelap) dengan lebar mengikuti sinus
      for (let i = 0; i + 1 < edge.length; i++) {
        const [x0, y0] = edge[i], [x1, y1] = edge[i + 1];
        const t = (i + 0.5) / (edge.length - 1), half = (open / 2) * Math.sin(t * Math.PI);
        c.poly([[x0 - half, y0], [x1 - half, y1], [x1 + half, y1], [x0 + half, y0]], P.ink);
        polyline(c, [[x0 - half - 1, y0], [x1 - half - 1, y1]], P.v2);
        polyline(c, [[x0 + half + 1, y0], [x1 + half + 1, y1]], P.v1);
        if (half > 2) polyline(c, [[x0, y0], [x1, y1]], k >= 2 && k <= 4 ? hi : P.tealD);
      }
      if (k >= 2 && k <= 5) {
        const rg = new Rng(520 + k);
        for (let a = 0; a < 360; a += 40) { const r = rad(a + 15), d = 18 + k * 4 + rg.int(0, 6); shard(c, 48 + Math.cos(r) * d * 0.8, 52 + Math.sin(r) * d, 3 + (a % 80 ? 1 : 0), a * 3, (x, y, px, py) => (x + y < px + py ? v3 : P.v1), a + 7, 4); }
        c.ring(48, 82, 10 + k * 5, 4 + k * 1.5, 1, P.v2, (x, y, a) => Math.abs(Math.sin(a * 4)) < 0.4);
      }
      if (k === 3) c.ellipse(48, 52, 3, 12, (x, y, dx, dy) => (Math.abs(dx) < 0.4 ? hi : P.tealM));
      if (k === 6) c.dither(2);
      return c;
    };
    for (let k = 0; k < 7; k++) { add('riftborn_surge', `rsurge_${k + 1}`, mk(k, false)); if (k >= 2 && k <= 4) add('riftborn_surge', `rsurge_${k + 1}_c`, mk(k, true)); }
  }
  void calmOf; void puff; void clamp;

  // ------------------------------------------------ gravorn_slam: tekanan turun (chevron batu) lalu retak bintang + debu (128x56, pusat 64,40 = tanah)
  {
    const mk = (k) => {
      const c = new Cv(128, 56);
      const gy = 40;
      if (k <= 1) {
        // chevron batu terbalik menekan ke bawah: 3 lapis, makin rapat
        const h = [34, 20][k];
        [0, 1, 2].forEach((i) => { const y0 = gy - h - i * 7, w = 28 - i * 6; polyline(c, [[64 - w, y0], [64, y0 + 10], [64 + w, y0]], i === 0 ? P.stoneL : P.stoneM); polyline(c, [[64 - w, y0 + 1], [64, y0 + 11], [64 + w, y0 + 1]], P.stoneD); });
        c.ring(64, gy, 24 - k * 6, 5, 1, P.stoneM, (x, y, a) => Math.abs(Math.sin(a * 4)) < 0.4);
      } else {
        const L = [0.5, 0.85, 1, 1, 1][k - 2];
        const rg = new Rng(900);
        for (let i = 0; i < 9; i++) {
          const a = rad(-165 + i * 20 + rg.range(-4, 4)), len = (22 + rg.int(0, 36)) * L;
          const pts = crackPath(64, gy, 64 + Math.cos(a) * len * 1.6, gy + Math.sin(a) * len * 0.3, 2, 4, new Rng(910 + i));
          polyline(c, pts.map(([x, y]) => [x, y + 1]), P.ink); polyline(c, pts, k >= 4 ? P.stoneM : P.stoneL);
        }
        if (k >= 2 && k <= 4) c.ring(64, gy, 18 + k * 9, 4 + k * 1.6, 2, P.dust, (x, y, a) => Math.abs(Math.sin(a * 5)) < 0.3);
        if (k >= 2 && k <= 5) for (let i = 0; i < 6; i++) { const t = rad(i * 60 + 20), r2 = 16 + k * 8; puff(c, 64 + Math.cos(t) * r2, gy + Math.sin(t) * r2 * 0.22 - 2, 4 + (k % 3), [P.stoneD, P.dustD, P.dust], 40 + i + k * 8, 3, 0.8); }
        for (let i = 0; i < 5; i++) { const a = rad(-160 + i * 35), d = 12 + k * 7; c.rect(Math.round(64 + Math.cos(a) * d * 1.3), Math.round(gy - 4 + Math.sin(a) * d * 0.7), 3, 2, i % 2 ? P.stoneL : P.stoneM); }
        if (k === 6) c.dither(2);
      }
      return c;
    };
    for (let k = 0; k < 7; k++) add('gravorn_slam', `gslam_${k + 1}`, mk(k), 40 / 56);
  }
  return out;
}
