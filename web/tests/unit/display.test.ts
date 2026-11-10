import { describe, expect, it } from 'vitest';
import { checkDesktopSupport, computeScale } from '../../src/game/systems/DisplayScale';
import { visibleChars } from '../../src/game/utils/typewriter';
import { TEXT_SPEED_MS_PER_CHAR } from '../../src/game/data/settingsSchema';

describe('computeScale 16:9', () => {
  it('1920x1080 pixel perfect = 3x (640x360 internal) tepat tanpa letterbox', () => {
    const r = computeScale(1920, 1080, 'pixel_perfect', 1);
    expect(r).toMatchObject({ cssWidth: 1920, cssHeight: 1080, deviceZoom: 3, integer: true });
  });

  it('1366x768 pixel perfect = 2x (1280x720, letterbox, zoom 2x) bukan zoom pecahan', () => {
    const r = computeScale(1366, 768, 'pixel_perfect', 1);
    expect(r).toMatchObject({ cssWidth: 1280, cssHeight: 720, deviceZoom: 2 });
  });

  it('1366x768 fit mengisi viewport, rasio 16:9, tidak melebihi viewport', () => {
    const r = computeScale(1366, 768, 'fit', 1);
    expect(r.cssWidth).toBeLessThanOrEqual(1366);
    expect(r.cssHeight).toBeLessThanOrEqual(768);
    expect(Math.abs(r.cssWidth / r.cssHeight - 16 / 9)).toBeLessThan(0.01);
    expect(r.cssHeight).toBeGreaterThanOrEqual(766); // memenuhi tinggi
  });

  it('jendela ultrawide: dibatasi tinggi, tidak di-stretch', () => {
    const r = computeScale(2560, 720, 'fit', 1);
    expect(r.cssHeight).toBeLessThanOrEqual(720);
    expect(Math.abs(r.cssWidth / r.cssHeight - 16 / 9)).toBeLessThan(0.01);
  });

  it('DPR 1.25 pixel perfect memakai zoom bilangan bulat dalam piksel perangkat', () => {
    const r = computeScale(1536, 864, 'pixel_perfect', 1.25); // 1920x1080 perangkat
    expect(r.deviceZoom).toBe(3);
    expect(r.cssWidth).toBe(1536);
  });

  it('viewport sangat kecil tidak menghasilkan ukuran 0 atau NaN', () => {
    for (const mode of ['fit', 'pixel_perfect'] as const) {
      const r = computeScale(100, 50, mode, 1);
      expect(r.cssWidth).toBeGreaterThan(0);
      expect(Number.isFinite(r.cssHeight)).toBe(true);
    }
  });
});

describe('checkDesktopSupport', () => {
  it('desktop normal OK', () => {
    expect(checkDesktopSupport({ width: 1366, height: 768, coarsePointerOnly: false })).toEqual({ ok: true });
  });
  it('viewport kecil ditolak', () => {
    expect(checkDesktopSupport({ width: 390, height: 844, coarsePointerOnly: false })).toEqual({ ok: false, reason: 'too_small' });
  });
  it('perangkat sentuh-saja ditolak walau layar besar', () => {
    expect(checkDesktopSupport({ width: 1280, height: 800, coarsePointerOnly: true })).toEqual({ ok: false, reason: 'touch_only' });
  });
});

describe('text speed', () => {
  it('empat mode berbeda nyata dan instan menampilkan semua', () => {
    expect(TEXT_SPEED_MS_PER_CHAR.slow).toBeGreaterThan(TEXT_SPEED_MS_PER_CHAR.normal);
    expect(TEXT_SPEED_MS_PER_CHAR.normal).toBeGreaterThan(TEXT_SPEED_MS_PER_CHAR.fast);
    expect(TEXT_SPEED_MS_PER_CHAR.fast).toBeGreaterThan(TEXT_SPEED_MS_PER_CHAR.instant);
    expect(visibleChars(0, 'instant', 40)).toBe(40);
    const t = 600;
    const slow = visibleChars(t, 'slow', 100);
    const normal = visibleChars(t, 'normal', 100);
    const fast = visibleChars(t, 'fast', 100);
    expect(slow).toBeLessThan(normal);
    expect(normal).toBeLessThan(fast);
  });
  it('tidak melebihi panjang teks', () => {
    expect(visibleChars(99999, 'slow', 10)).toBe(10);
  });
});
