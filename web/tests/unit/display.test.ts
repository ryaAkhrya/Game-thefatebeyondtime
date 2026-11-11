import { describe, expect, it } from 'vitest';
import { checkDesktopSupport, computeDisplay } from '../../src/game/systems/DisplayScale';
import { visibleChars } from '../../src/game/utils/typewriter';
import { TEXT_SPEED_MS_PER_CHAR } from '../../src/game/data/settingsSchema';

describe('computeDisplay 16:9 (kanvas = piksel perangkat, zoom dunia bulat)', () => {
  it('1920x1080 fit: kanvas 1920x1080, zoom dunia 3 (view 640x360), skala UI 2', () => {
    const r = computeDisplay(1920, 1080, 'fit', 1);
    expect(r).toMatchObject({ pixelWidth: 1920, pixelHeight: 1080, cssWidth: 1920, cssHeight: 1080, worldZoom: 3, battleZoom: 4, uiScale: 2 });
  });

  it('1366x768 fit: kanvas penuh viewport 1:1, zoom dunia BULAT 2 (tanpa skala 2,13x), skala UI pecahan hanya untuk teks', () => {
    const r = computeDisplay(1366, 768, 'fit', 1);
    expect(r.pixelHeight).toBe(768);
    expect(Math.abs(r.pixelWidth / r.pixelHeight - 16 / 9)).toBeLessThan(0.01);
    expect(r.pixelWidth).toBeLessThanOrEqual(1366);
    expect(Number.isInteger(r.worldZoom)).toBe(true);
    expect(r.worldZoom).toBe(2);
    expect(Number.isInteger(r.battleZoom)).toBe(true);
    expect(r.uiScale).toBeCloseTo(768 / 540, 5);
  });

  it('1366x768 pixel perfect = 1280x720 (kelipatan 2x), letterbox, tepat zoom 2', () => {
    const r = computeDisplay(1366, 768, 'pixel_perfect', 1);
    expect(r).toMatchObject({ pixelWidth: 1280, pixelHeight: 720, worldZoom: 2, cssWidth: 1280, cssHeight: 720 });
  });

  it('1920x1080 pixel perfect = 3x tepat tanpa letterbox', () => {
    expect(computeDisplay(1920, 1080, 'pixel_perfect', 1)).toMatchObject({ pixelWidth: 1920, pixelHeight: 1080, worldZoom: 3 });
  });

  it('zoom dunia dan battle selalu bilangan bulat pada berbagai viewport/DPR', () => {
    for (const [w, h, dpr] of [[1280, 720, 1], [1366, 768, 1], [1440, 900, 1], [1600, 900, 1], [1536, 864, 1.25], [1920, 1080, 1], [2560, 1440, 1], [3840, 2160, 1], [1000, 600, 1], [800, 450, 1]] as const) {
      for (const mode of ['fit', 'pixel_perfect'] as const) {
        const r = computeDisplay(w, h, mode, dpr);
        expect(Number.isInteger(r.worldZoom) && r.worldZoom >= 1, `${w}x${h}@${dpr} ${mode} world`).toBe(true);
        expect(Number.isInteger(r.battleZoom) && r.battleZoom >= 2, `${w}x${h}@${dpr} ${mode} battle`).toBe(true);
        expect(Number.isInteger(r.pixelWidth) && Number.isInteger(r.pixelHeight)).toBe(true);
        expect(r.pixelWidth).toBeLessThanOrEqual(Math.floor(w * dpr));
        expect(r.pixelHeight).toBeLessThanOrEqual(Math.floor(h * dpr));
      }
    }
  });

  it('DPR 1,25: backing store = piksel perangkat dan CSS 1:1 dengannya', () => {
    const r = computeDisplay(1536, 864, 'fit', 1.25); // 1920x1080 perangkat
    expect(r).toMatchObject({ pixelWidth: 1920, pixelHeight: 1080, worldZoom: 3 });
    expect(r.cssWidth * 1.25).toBeCloseTo(1920, 5);
  });

  it('jendela ultrawide: dibatasi tinggi, tidak di-stretch', () => {
    const r = computeDisplay(2560, 720, 'fit', 1);
    expect(r.pixelHeight).toBeLessThanOrEqual(720);
    expect(Math.abs(r.pixelWidth / r.pixelHeight - 16 / 9)).toBeLessThan(0.01);
  });

  it('viewport sangat kecil tidak menghasilkan ukuran 0 atau NaN', () => {
    for (const mode of ['fit', 'pixel_perfect'] as const) {
      const r = computeDisplay(100, 50, mode, 1);
      expect(r.pixelWidth).toBeGreaterThan(0);
      expect(Number.isFinite(r.uiScale) && r.uiScale > 0).toBe(true);
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
