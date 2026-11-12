// Polish Sprint 1: aset TURUNAN untuk UI baru (sumber di ../assets TIDAK diubah). Dapat dijalankan ulang.
//   node scripts/prepare-ui-assets.mjs
// 1) Portrait ekspresi resolusi lebih tinggi (tinggi 352 px, resampling bertahap berkualitas tinggi) untuk dialog yang
//    sekarang digambar 1:1 pada resolusi perangkat. Portrait 128 px lama tetap ada untuk kompatibilitas/tes.
// 2) Bahan komposisi Title Screen: tampak samping turnaround Yaric dan Velthia serta bilah greatsword Yaric,
//    diperkecil (tinggi <= 760 px). Di Title Screen ketiganya hanya dipakai sebagai SILUET bernada gelap (tint),
//    bukan sebagai artwork final. Turnaround adalah crop referensi: status DRAFT/REFERENCE, perlu key art dari artist.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const repo = resolve('..');
const pub = resolve('public/assets');
const PORTRAIT_H = 352;
const FIGURE_H = 760;
const ROSTER = [
  { id: 'C01', dir: 'C01_Yaric', names: ['ANGRY', 'CONFUSED', 'DETERMINED', 'EMBARRASSED', 'HAPPY', 'NEUTRAL', 'SAD', 'SURPRISED'] },
  { id: 'C02', dir: 'C02_Velthia', names: ['NEUTRAL', 'STERN', 'AMUSED', 'WORRIED', 'SURPRISED', 'VULNERABLE', 'ANGRY'] },
  { id: 'C03', dir: 'C03_Torvan', names: ['NEUTRAL', 'DETERMINED', 'MISCHIEVOUS', 'CURIOUS', 'SAD', 'SURPRISED', 'SOLEMN', 'UPSET'] },
  // Phase 8 (agen BA): Varlgrim untuk dialog Bab IV.
  { id: 'C04', dir: 'C04_Varlgrim', names: ['NEUTRAL', 'ANGRY', 'STERN', 'REMORSE', 'DETERMINED', 'SAD', 'SURPRISED', 'SUSPICIOUS'] },
  { id: 'C05', dir: 'C05_Azie', names: ['NEUTRAL', 'WORRIED', 'SKEPTICAL'] },
  { id: 'C06', dir: 'C06_Talric', names: ['NEUTRAL', 'SUSPICIOUS', 'ALARMED'] },
  { id: 'C07', dir: 'C07_Zira', names: ['NEUTRAL', 'CAUTIOUS', 'HAPPY', 'SAD'] },
  { id: 'C08', dir: 'C08_Nambo', names: ['CONCERNED', 'HAPPY', 'NEUTRAL', 'SURPRISED'] },
  { id: 'C09', dir: 'C09_Derrria', names: ['NEUTRAL', 'AMUSED', 'WORRIED'] },
];
const FIGURES = [
  { out: 'title_yaric.png', src: 'assets/characters/C01_Yaric/C01_TURNAROUND_SIDE.png' },
  { out: 'title_velthia.png', src: 'assets/characters/C02_Velthia/C02_TURNAROUND_SIDE.png' },
  { out: 'title_greatsword.png', src: 'assets/characters/C01_Yaric/C01_WEAPON_GREATSWORD.png' },
];

mkdirSync(resolve(pub, 'portraits_hd'), { recursive: true });
mkdirSync(resolve(pub, 'title'), { recursive: true });
const items = [];
// Phase 8: UI_ONLY_NEW=1 -> hanya menurunkan portrait yang BELUM ada (aset lama tidak ditimpa), tanpa figur Title; ui.generated.json digabung.
const ONLY_NEW = process.env.UI_ONLY_NEW === '1';

const resizeInPage = async (page, b64, h) =>
  page.evaluate(async ({ b64, h }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    let cur = document.createElement('canvas');
    cur.width = img.width;
    cur.height = img.height;
    cur.getContext('2d').drawImage(img, 0, 0);
    const outH = Math.min(h, img.height);
    const outW = Math.round((img.width * outH) / img.height);
    while (cur.height / 2 > outH) {
      const n = document.createElement('canvas');
      n.width = Math.round(cur.width / 2);
      n.height = Math.round(cur.height / 2);
      const c = n.getContext('2d');
      c.imageSmoothingEnabled = true;
      c.imageSmoothingQuality = 'high';
      c.drawImage(cur, 0, 0, n.width, n.height);
      cur = n;
    }
    const fin = document.createElement('canvas');
    fin.width = outW;
    fin.height = outH;
    const f = fin.getContext('2d');
    f.imageSmoothingEnabled = true;
    f.imageSmoothingQuality = 'high';
    f.drawImage(cur, 0, 0, outW, outH);
    return { png: fin.toDataURL('image/png'), size: [outW, outH], sourceSize: [img.width, img.height] };
  }, { b64, h });

const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL ?? 'msedge', headless: true });
try {
  const page = await browser.newPage();
  for (const def of ROSTER) {
    for (const name of def.names) {
      const src = `assets/characters/${def.dir}/${def.id}_EXPRESSION_${name}.png`;
      if (!existsSync(resolve(repo, src))) { console.warn('tidak ada:', src); continue; }
      const out = `assets/portraits_hd/${def.id}_${name}.png`;
      if (ONLY_NEW && existsSync(resolve('public', out))) continue;
      const res = await resizeInPage(page, readFileSync(resolve(repo, src)).toString('base64'), PORTRAIT_H);
      writeFileSync(resolve('public', out), Buffer.from(res.png.split(',')[1], 'base64'));
      items.push({ id: `${def.id}_${name}`, kind: 'portrait_hd', source: src, out, status: 'DRAFT', size: res.size, sourceSize: res.sourceSize });
    }
  }
  for (const fig of ONLY_NEW ? [] : FIGURES) {
    const res = await resizeInPage(page, readFileSync(resolve(repo, fig.src)).toString('base64'), FIGURE_H);
    const out = `assets/title/${fig.out}`;
    writeFileSync(resolve('public', out), Buffer.from(res.png.split(',')[1], 'base64'));
    items.push({ id: fig.out, kind: 'title_silhouette_source', source: fig.src, out, status: 'DRAFT', size: res.size, sourceSize: res.sourceSize,
      note: 'Crop turnaround/weapon REFERENCE diperkecil; hanya dipakai sebagai siluet bernada gelap di Title Screen, bukan art final.' });
  }
} finally { await browser.close(); }
let outItems = items;
if (ONLY_NEW && existsSync(resolve(pub, 'ui.generated.json'))) {
  const prev = JSON.parse(readFileSync(resolve(pub, 'ui.generated.json'), 'utf8')).items ?? [];
  const ids = new Set(items.map((i) => i.id));
  outItems = [...prev.filter((i) => !ids.has(i.id)), ...items];
}
writeFileSync(resolve(pub, 'ui.generated.json'), JSON.stringify({ generatedBy: 'web/scripts/prepare-ui-assets.mjs', status: 'DRAFT', items: outItems }, null, 2) + '\n');
console.log(`UI assets: ${items.length} item.`);
