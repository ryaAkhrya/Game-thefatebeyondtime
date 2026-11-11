// Pembantu QA visual: bukti PIKSEL nyata dari frame render browser (bukan sekadar objek/texture key ada di memori).

/** Membandingkan dua PNG (base64) di dalam halaman: jumlah piksel berbeda, rata-rata selisih luminans, bbox perbedaan. */
export async function diffPngs(page, aBase64, bBase64) {
  return page.evaluate(async ([a, b]) => {
    const load = async (b64) => { const blob = await (await fetch('data:image/png;base64,' + b64)).blob(); return createImageBitmap(blob); };
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(ia, 0, 0); const da = ctx.getImageData(0, 0, c.width, c.height).data;
    ctx.clearRect(0, 0, c.width, c.height); ctx.drawImage(ib, 0, 0); const db = ctx.getImageData(0, 0, c.width, c.height).data;
    let changed = 0, lum = 0, minX = c.width, minY = c.height, maxX = -1, maxY = -1;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4;
      const d = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]);
      if (d > 24) { changed++; lum += d / 3; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
    }
    return { width: c.width, height: c.height, changed, area: c.width * c.height, meanDelta: changed ? lum / changed : 0, bbox: maxX < 0 ? null : [minX, minY, maxX, maxY] };
  }, [aBase64, bBase64]);
}

/**
 * Apakah sprite battle benar-benar terlihat pada frame render? Tangkap area sprite dengan dan tanpa sprite (disembunyikan lewat
 * hook QA) lalu hitung piksel yang berubah. Mengembalikan metrik + status probe.
 */
export async function battleSpriteVisibility(page, id) {
  const probe = await page.evaluate(i => window.__tfbt.battleProbe(i), id);
  if (!probe) return { id, probe: null, changed: 0, ratio: 0 };
  const lay = await page.evaluate(() => ({ l: window.__tfbt.display(), css: window.__tfbt.canvasCss() }));
  const k = lay.css.w / lay.l.pixelWidth;
  const clip = { x: Math.max(0, Math.floor(probe.x * k)), y: Math.max(0, Math.floor(probe.y * k)), width: Math.max(8, Math.floor(probe.w * k)), height: Math.max(8, Math.floor(probe.h * k)) };
  clip.width = Math.min(clip.width, Math.floor(lay.css.w) - clip.x); clip.height = Math.min(clip.height, Math.floor(lay.css.h) - clip.y);
  const settle = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await settle(); const withSprite = (await page.screenshot({ clip })).toString('base64');
  await page.evaluate(i => window.__tfbt.battleHide(i, true), id); await settle();
  const without = (await page.screenshot({ clip })).toString('base64');
  await page.evaluate(i => window.__tfbt.battleHide(i, false), id); await settle();
  const d = await diffPngs(page, withSprite, without);
  return { id, probe, clip, changed: d.changed, ratio: d.changed / d.area, meanDelta: d.meanDelta, bbox: d.bbox, size: [d.width, d.height] };
}
