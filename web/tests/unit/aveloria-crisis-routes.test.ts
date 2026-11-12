import { describe, expect, it } from 'vitest';
import { loadAveloria } from '../../src/game/world/aveloria';
import { footBox, overlaps, type Rect } from '../../src/game/world/Collision';
import {
  CRISIS_ITEMS, CRISIS_STAGES, CRISIS_TRIGGERS, GATE_GUARD, GATHER, MAX_EVAC_WALKERS, SCRIPT_PATHS, TORVAN_LOOP, WALKERS,
  crisisLevel, crisisNpcSpots, itemVisible, walkerFinal, walkersMode, type CrisisStage,
} from '../../src/game/world/aveloriaCrisis';

/** Collision Aveloria dengan gerbang terbuka (jalur evakuasi dan jalur adegan harus lolos setelah gerbang dibuka). */
function openMap() {
  const loaded = loadAveloria();
  loaded.collision.setDynamic('city_gate', null);
  loaded.collision.setDynamic('palace_door', null);
  return loaded;
}
const STEP = 4;
function blockedAlong(col: ReturnType<typeof openMap>['collision'], pts: readonly (readonly [number, number])[]): string[] {
  const bad: string[] = [];
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i]!;
    if (!col.canStand(footBox(x, y))) bad.push(`titik ${x},${y}`);
    if (i === 0) continue;
    const [px, py] = pts[i - 1]!;
    const n = Math.max(1, Math.ceil(Math.hypot(x - px, y - py) / STEP));
    for (let s = 1; s < n; s++) {
      const sx = Math.round(px + ((x - px) * s) / n), sy = Math.round(py + ((y - py) * s) / n);
      if (!col.canStand(footBox(sx, sy))) { bad.push(`segmen ${px},${py}->${x},${y} @${sx},${sy}`); break; }
    }
  }
  return bad;
}

describe('rute evakuasi dan jalur adegan Aveloria krisis', () => {
  const { collision } = openMap();
  for (const w of WALKERS) {
    it(`rute ${w.id}: semua titik dan segmen dapat dipijak`, () => {
      const exitStart = w.route.findIndex(p => p[1] >= 1170);
      const upToExit = exitStart < 0 ? w.route : w.route;
      expect(blockedAlong(collision, upToExit)).toEqual([]);
    });
  }
  for (const [name, path] of Object.entries(SCRIPT_PATHS)) {
    it(`jalur adegan ${name} dapat dipijak`, () => { expect(blockedAlong(collision, path)).toEqual([]); });
  }
  it('jalur Torvan dan posisi kumpul/penjaga dapat dipijak', () => {
    expect(blockedAlong(collision, TORVAN_LOOP)).toEqual([]);
    for (const p of [...Object.values(GATHER), GATE_GUARD]) expect(collision.canStand(footBox(p.x, p.y)), `${p.x},${p.y}`).toBe(true);
  });
  it('semua rute berakhir di tujuan sesuai jenis (keluar gerbang atau titik kumpul)', () => {
    for (const w of WALKERS) {
      const last = w.route[w.route.length - 1]!;
      if (w.end === 'exit') expect(last[1]).toBeGreaterThanOrEqual(1300);
      else expect(last, w.id).toEqual([GATHER[w.id]!.x, GATHER[w.id]!.y]);
      for (const [x, y] of w.route) expect(x >= 0 && y >= 0 && x <= 1280 && y <= 1408).toBe(true);
    }
  });
  it('jumlah warga yang terlihat dibatasi (6-10) dan id unik', () => {
    expect(WALKERS.length).toBeGreaterThanOrEqual(6);
    expect(WALKERS.length).toBeLessThanOrEqual(MAX_EVAC_WALKERS);
    expect(new Set(WALKERS.map(w => w.id)).size).toBe(WALKERS.length);
    expect(WALKERS.filter(w => w.delay > 14).length).toBe(0);
  });
  it('posisi awal tidak saling menumpuk (jarak antar warga >= 20 px)', () => {
    for (let i = 0; i < WALKERS.length; i++) for (let j = i + 1; j < WALKERS.length; j++) {
      const a = WALKERS[i]!.route[0]!, b = WALKERS[j]!.route[0]!;
      expect(Math.hypot(a[0] - b[0], a[1] - b[1]), `${WALKERS[i]!.id}/${WALKERS[j]!.id}`).toBeGreaterThanOrEqual(20);
    }
  });
});

describe('tabel tahap krisis -> keadaan visual', () => {
  const { collision } = openMap();
  const named: Record<CrisisStage, { level: number; mode: string }> = {
    pre: { level: 1, mode: 'work' }, start: { level: 1, mode: 'work' }, crisisSeen: { level: 1, mode: 'work' }, azieDemand: { level: 1, mode: 'work' },
    velthiaRefuses: { level: 2, mode: 'work' }, evacOrdered: { level: 2, mode: 'stream' }, evacDone: { level: 2, mode: 'done' },
    decision: { level: 3, mode: 'done' }, torvanStays: { level: 3, mode: 'done' }, velthiaJoined: { level: 3, mode: 'done' }, departed: { level: 3, mode: 'done' },
  };
  for (const stage of CRISIS_STAGES) {
    it(`tahap ${stage}: tingkat retakan, mode warga, dan posisi NPC dapat dipijak`, () => {
      expect(crisisLevel(stage)).toBe(named[stage].level);
      expect(walkersMode(stage)).toBe(named[stage].mode);
      const spots = crisisNpcSpots(stage);
      for (const k of ['velthia', 'azie', 'talric', 'torvan', 'gateGuard'] as const) {
        const s = spots[k];
        if (s && s !== 'follow') expect(collision.canStand(footBox(s.x, s.y)), `${k}@${stage} ${s.x},${s.y}`).toBe(true);
      }
      for (const w of WALKERS) {
        const f = walkerFinal(w, stage);
        if (f.visible) expect(collision.canStand(footBox(f.x, f.y)), `${w.id}@${stage}`).toBe(true);
      }
    });
  }
  it('tingkat retakan tidak pernah turun dan item hanya bertambah seiring tahap (kecuali tidak ada item yang hilang)', () => {
    let prev = -1;
    for (const stage of CRISIS_STAGES.filter(s => s !== 'pre')) {
      const n = CRISIS_ITEMS.filter(i => itemVisible(i, stage)).length;
      expect(n).toBeGreaterThanOrEqual(prev); prev = n;
    }
    expect(CRISIS_ITEMS.filter(i => itemVisible(i, 'start')).length).toBeGreaterThan(8);
    expect(CRISIS_ITEMS.filter(i => i.kind === 'float' && itemVisible(i, 'departed')).length).toBeLessThanOrEqual(12);
  });
  it('Velthia pengikut hanya sejak keputusan; Torvan di titik aman hanya setelah evakuasi selesai', () => {
    expect(crisisNpcSpots('evacDone').velthia).not.toBe('follow');
    expect(crisisNpcSpots('decision').velthia).toBe('follow');
    expect(crisisNpcSpots('evacOrdered').torvan).toBeNull();
    expect(crisisNpcSpots('evacDone').torvan).not.toBeNull();
    expect(crisisNpcSpots('velthiaRefuses').gateGuard).toBeNull();
  });
});

describe('geometri tambahan krisis tidak memutus jalur', () => {
  const loaded = openMap();
  const reachable = (a: [number, number], b: [number, number]): boolean => {
    const seen = new Set<number>(); const key = (x: number, y: number): number => (y / STEP) * 4096 + x / STEP;
    const sx = Math.round(a[0] / STEP) * STEP, sy = Math.round(a[1] / STEP) * STEP;
    const stack: [number, number][] = [[sx, sy]]; seen.add(key(sx, sy));
    while (stack.length) {
      const [x, y] = stack.pop()!;
      if (Math.abs(x - b[0]) <= STEP && Math.abs(y - b[1]) <= STEP) return true;
      for (const [dx, dy] of [[STEP, 0], [-STEP, 0], [0, STEP], [0, -STEP]] as const) {
        const nx = x + dx, ny = y + dy, k = key(nx, ny);
        if (nx < 0 || ny < 0 || nx > 1280 || ny > 1408 || seen.has(k) || !loaded.collision.canStand(footBox(nx, ny))) continue;
        seen.add(k); stack.push([nx, ny]);
      }
    }
    return false;
  };
  it('jejak tabrakan prop krisis (panji, gerobak) dipasang: titik penting tetap terhubung', () => {
    for (const it of CRISIS_ITEMS) if (it.sol) loaded.collision.setDynamic(`crisisprop:${it.f ?? it.kind}:${it.x}`, { x: it.x + it.sol[0], y: it.y + it.sol[1], w: it.sol[2], h: it.sol[3] });
    const spawn: [number, number] = [640, 616];
    for (const p of [[640, 250], [640, 1136], [640, 1360], [640, 1070], [576, 1064], [736, 632], [584, 556]] as [number, number][]) expect(reachable(spawn, p), `${p}`).toBe(true);
  });
  it('jejak prop krisis tidak menimpa posisi NPC tahap mana pun, rute atau pemicu', () => {
    const fps: Rect[] = CRISIS_ITEMS.filter(i => i.sol).map(i => ({ x: i.x + i.sol![0], y: i.y + i.sol![1], w: i.sol![2], h: i.sol![3] }));
    for (const f of fps) {
      for (const w of WALKERS) for (const [x, y] of w.route) expect(overlaps(f, footBox(x, y)), `${w.id} ${x},${y}`).toBe(false);
      for (const stage of CRISIS_STAGES) { const s = crisisNpcSpots(stage); for (const k of ['azie', 'talric', 'torvan', 'gateGuard'] as const) { const p = s[k]; if (p) expect(overlaps(f, footBox(p.x, p.y)), `${k}@${stage}`).toBe(false); } }
    }
  });
  it('pemicu krisis dapat disentuh dari area terjangkau', () => {
    for (const t of CRISIS_TRIGGERS) {
      let ok = false;
      for (let x = t.x; x < t.x + t.w && !ok; x += 4) for (let y = t.y; y < t.y + t.h && !ok; y += 4) if (loaded.collision.canStand(footBox(x, y + 2))) ok = true;
      expect(ok, t.id).toBe(true);
    }
  });
});
