import { describe, expect, it } from 'vitest';
import { InputManager, type Intent } from '../../src/game/core/InputManager';
import { SPRINT_MULT, SPRINT_SPEED } from '../../src/game/world/movement';
import { DIRS, animKey, legacyAnims, resolveAnims } from '../../src/game/world/CharacterAnims';
import { CollisionMap, footBox, moveWithCollision } from '../../src/game/world/Collision';

function setup() {
  const target = new EventTarget();
  const im = new InputManager(target);
  const down = (code: string, extra: Record<string, unknown> = {}) => target.dispatchEvent(Object.assign(new Event('keydown', { cancelable: true }), { code, repeat: false, preventDefault() {}, ...extra }));
  const up = (code: string, extra: Record<string, unknown> = {}) => target.dispatchEvent(Object.assign(new Event('keyup'), { code, ...extra }));
  const blur = () => target.dispatchEvent(new Event('blur'));
  return { im, down, up, blur };
}

describe('Sprint: Shift ditahan = lari', () => {
  it('Shift menyalakan isSprintHeld, dilepas mematikannya; bukan intent', () => {
    const { im, down, up } = setup();
    const got: Intent[] = [];
    im.pushLayer('world', e => got.push(e.intent));
    expect(im.isSprintHeld()).toBe(false);
    down('ShiftLeft'); expect(im.isSprintHeld()).toBe(true);
    up('ShiftLeft'); expect(im.isSprintHeld()).toBe(false);
    down('ShiftRight'); expect(im.isSprintHeld()).toBe(true);
    up('ShiftRight');
    expect(got).toEqual([]); // Shift tidak memicu menu, dialog, atau aksi battle
  });

  it('Shift + WASD / Panah: arah tetap empat arah tanpa diagonal, Shift tidak mengubah intent arah', () => {
    const { im, down, up } = setup();
    const got: Intent[] = [];
    im.pushLayer('world', e => got.push(e.intent));
    down('ShiftLeft');
    down('KeyD', { shiftKey: true }); down('ArrowUp', { shiftKey: true });
    expect(im.getMoveDirection()).toBe('up'); // arah terbaru menang, tidak pernah diagonal
    up('ArrowUp', { shiftKey: true });
    expect(im.getMoveDirection()).toBe('right');
    expect(im.isSprintHeld()).toBe(true);
    up('KeyD', { shiftKey: true }); up('ShiftLeft');
    expect(im.getMoveDirection()).toBeNull();
    expect(got.filter(i => i === 'confirm' || i === 'back')).toEqual([]);
  });

  it('Shift tidak membuat Enter/Esc/Spasi memproses ganda atau melewati dialog', () => {
    const { im, down } = setup();
    const got: Intent[] = [];
    im.pushLayer('dialogue', e => got.push(e.intent));
    down('ShiftLeft'); down('Enter', { shiftKey: true });
    expect(got).toEqual(['confirm']);
  });

  it('kehilangan fokus (blur) dan input dimatikan menghapus status lari', () => {
    const { im, down, blur } = setup();
    down('ShiftLeft'); expect(im.isSprintHeld()).toBe(true);
    blur(); expect(im.isSprintHeld()).toBe(false);
    down('ShiftLeft'); im.setEnabled(false); expect(im.isSprintHeld()).toBe(false);
  });

  it('kecepatan lari 1,5-1,8x jalan dan collision per langkah 1 px tidak menembus dinding tipis pada frame terpanjang', () => {
    expect(SPRINT_MULT).toBeGreaterThanOrEqual(1.5);
    expect(SPRINT_MULT).toBeLessThanOrEqual(1.8);
    const map = new CollisionMap(400, 200, [{ shape: 'rect', x: 0, y: 0, w: 400, h: 200 }], [{ x: 200, y: 0, w: 8, h: 200 }]);
    // frame terpanjang yang dipakai game: 50 ms
    let x = 150; const y = 100;
    for (let f = 0; f < 120; f++) x = moveWithCollision(map, x, y, SPRINT_SPEED * 0.05, 0).x;
    expect(x).toBeLessThan(200); // berhenti di dinding, tidak menembus
    expect(map.canStand(footBox(x, y))).toBe(true);
  });
});

describe('CharacterAnims: animasi berbasis data', () => {
  it('atlas lama tanpa data: Yaric 4 kolom dan cast 6 kolom memakai definisi lama', () => {
    expect(legacyAnims(4, 'left').idle.frames).toEqual([4]);
    expect(legacyAnims(4, 'left').walk.frames).toEqual([4, 5, 6, 7]);
    expect(legacyAnims(6, 'up').idle.frames).toEqual([18, 19]);
    expect(legacyAnims(6, 'up').walk.frames).toEqual([20, 21, 22, 23]);
  });
  it('sprint tanpa data = jalan yang lebih cepat; dengan data memakai frame sendiri', () => {
    const base = resolveAnims(null, 4, 'down');
    expect(base.sprint.frames).toEqual(base.walk.frames);
    expect(base.sprint.fps).toBeGreaterThan(base.walk.fps * 1.5);
    const r = resolveAnims({ cols: 4, anims: { down: { idle: { frames: [16, 17, 18, 17], fps: 3 }, sprint: { frames: [32, 33, 34, 35, 36, 37], fps: 14 } } } }, 4, 'down');
    expect(r.idle.frames).toEqual([16, 17, 18, 17]);
    expect(r.sprint.frames).toHaveLength(6);
    expect(r.walk.frames).toEqual([0, 1, 2, 3]);
  });
  it('kunci animasi unik per state dan arah', () => {
    const keys = new Set<string>();
    for (const d of DIRS) for (const s of ['idle', 'walk', 'sprint'] as const) keys.add(animKey('c01', s, d));
    expect(keys.size).toBe(12);
  });
});
