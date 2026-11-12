import { describe, expect, it } from 'vitest';
import { FootstepTracker, SPRINT_STRIDE, STEP_SFX, WALK_STRIDE, surfaceFor } from '../../src/game/world/footsteps';
import { SPRINT_SPEED, WALK_SPEED } from '../../src/game/world/movement';

function steps(speed: number, sprint: boolean, seconds: number): number {
  const t = new FootstepTracker(); let n = 0;
  for (let i = 0; i < seconds * 60; i++) if (t.update(speed / 60, sprint)) n++;
  return n;
}

describe('langkah kaki', () => {
  it('tidak berbunyi saat diam atau tertahan dinding (moved = 0)', () => {
    const t = new FootstepTracker();
    for (let i = 0; i < 300; i++) expect(t.update(0, false)).toBe(false);
  });
  it('berbunyi berdasarkan jarak tempuh; lari lebih cepat dari jalan', () => {
    const walk = steps(WALK_SPEED, false, 4), run = steps(SPRINT_SPEED, true, 4);
    expect(walk).toBeGreaterThan(8); expect(walk).toBeLessThan(18);
    expect(run).toBeGreaterThan(walk * 1.3);
    expect(WALK_STRIDE).toBeGreaterThan(SPRINT_STRIDE);
  });
  it('langkah pertama segera, berhenti lalu mulai lagi tidak menumpuk', () => {
    const t = new FootstepTracker();
    let first = -1;
    for (let i = 0; i < 60; i++) if (t.update(WALK_SPEED / 60, false)) { first = i; break; }
    expect(first).toBeGreaterThanOrEqual(0); expect(first).toBeLessThan(20);
    t.update(0, false);
    let n = 0; for (let i = 0; i < 6; i++) if (t.update(WALK_SPEED / 60, false)) n++;
    expect(n).toBeLessThanOrEqual(1);
  });
  it('permukaan per area dan id SFX tersedia', () => {
    expect(surfaceFor('forest_1')).toBe('grass'); expect(surfaceFor('liora')).toBe('grass'); expect(surfaceFor('forest_edge')).toBe('dirt');
    expect(surfaceFor('aveloria')).toBe('stone'); expect(surfaceFor('temple')).toBe('stone');
    expect(Object.values(STEP_SFX)).toEqual(['SFX_STEP_GRASS', 'SFX_STEP_DIRT', 'SFX_STEP_STONE']);
  });
});
