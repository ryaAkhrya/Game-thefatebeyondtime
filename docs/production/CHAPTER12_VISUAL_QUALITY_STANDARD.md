# Chapter I–II Visual Quality Standard (Polish Sprint 2)

Standar teknis untuk Chapter III–IV. Semua angka di bawah dipakai dan teruji pada codebase ini (rujukan file di tiap bagian). Bila sebuah aset tidak memenuhi standar, statusnya **bukan** final: catat di `ASSET_INDEX.md` sebagai DRAFT/NEEDS_REVIEW dengan daftar frame yang perlu redraw.

## 1. Skala, densitas, dan kamera

- 1 piksel aset = 1 piksel dunia. Kanvas = piksel perangkat; kamera dunia memakai **zoom bilangan bulat** (2× pada 1366×768, 3× pada 1920×1080; `systems/DisplayScale.ts`). Zoom battle terpisah dan juga bulat (3×/4×). Tidak ada penskalaan pecahan pada pixel art, tidak ada `setScale` non-bulat pada sprite dunia.
- Petak = 32 px. Karakter overworld = sel **32×48**, tubuh **44–46 px** tinggi, lebar badan 23–28 px. Pintu rumah ±20×32 px, jendela ±12×14 px, batang pohon (pangkal) 16–24 px, kanopi 64–120 px.
- Kerapatan piksel identik di semua objek: tidak boleh ada objek yang digambar pada resolusi lebih halus/kasar dari karakter.

## 2. Karakter overworld (sprite)

**Format atlas** (`web/public/assets/characters/final/Cxx_explore.png` + `.json`): sel 32×48, `cols` kolom (4/6/9), baris 0–3 = down, left, right, up. JSON memuat `frames{rect,pivot}`, `cols`, dan `anims`:

```json
"anims": { "down": { "idle": {"frames":[16,17,18,19,18,17],"fps":3},
                       "walk": {"frames":[0,1,2,3],"fps":8},
                       "sprint": {"frames":[32,36,40,44,48,52],"fps":14} }, "left": {…}, "right": {…}, "up": {…} }
```
(indeks grid = baris × cols + kolom). `world/CharacterAnims.ts` mendaftarkan animasi dari data ini (`registerCharacterAnims`), `playState(sprite, tag, state, dir)` memutarnya; NPC idle mulai dari frame acak agar tidak serempak. Atlas tanpa `anims` jatuh ke definisi lama; sprint tanpa data = jalan yang dipercepat. Manifest: `assetManifest.ts` `finalPath` (atlas final) di atas `publicPath` (turunan ternormalisasi Sprint 1) dan `rawPublicPath` (salinan byte-identik sumber).
**Foot pivot:** baris opak terbawah SETIAP frame (semua arah, semua state, kontak maupun lintasan) = **y 46**; pusat kaki dalam ±2 px dari x 16 (`Yaric 14.1–17.1`). Origin Phaser `(0.5, 47/48)` (tepi bawah baris kaki tepat di y dunia = dasar `footBox`). Tidak ada piksel pada baris 0 atau kolom 0/31 (bukan clipping). Diuji: `tests/unit/{sprites,yaric-sprites,cast-sprites}.test.ts` dan `sprint2.mjs` (`frameBounds` pada tekstur yang BENAR-BENAR dimuat browser).
**Outline:** 1 px, warna kelompok gelap-hangat dari bahan tetangga (bukan hitam murni); bayangan/shading berpalet tertutup (≤32 warna per karakter), alfa keras 0/255, tanpa blur, tanpa glow.
**Animasi arah:** left dan right boleh cermin (catat sebagai kekurangan: shading terbalik). Jalan = 4 frame; idle = 4–6 frame; sprint (khusus pemain) = 6 frame per arah dengan condong ke depan, langkah panjang, jubah mengembang.
**Idle:** gerak NYATA pada lapisan bagian tubuh (kepala/bahu turun 1 px, ujung jubah/rambut/syal bergeser 1–2 px, ayunan tongkat) dengan kaki tetap; DILARANG mengganti dengan scale/offset seluruh sprite. Diuji piksel-demi-piksel (`yaric-sprites.test.ts`: idle berbeda antar frame pada pita rambut/torso/ujung jubah dan baris kaki identik; E2E: `diffPngs` antar tangkapan layar).
**Bayangan:** ellipse 20×6 alfa 0,38 di (x, y−1), depth y−1 (`WorldScene.makeWalker`); bayangan benda statis dipanggang ke dasar peta.
**Collision:** `footBox` 16×8 berpusat di x, tepi bawah di y. Kecepatan jalan 88 px/s; **sprint (Shift) 1,65×** (`world/movement.ts`). `moveWithCollision` bergerak per langkah 1 px per sumbu sehingga tidak ada tunneling; pemicu cerita diperiksa sepanjang jalur frame (langkah ≤2 px, `WorldScene.checkTriggers`). Sprint nonaktif otomatis bila layer input teratas bukan `world` (dialog, pause, menu, battle, transisi). Shift bukan intent (`InputManager.isSprintHeld`).

## 3. Battle: sprite musuh dan boss

- Sel monster 96×96 (pivot dalam JSON); boss besar boleh 160×128 (Mournfang V4: pivot `[77,124]`, menghadap kanan, tidak di-flip di battle). Semua frame dalam satu atlas memakai pivot SAMA; baris kaki identik antar frame (tidak ada drift).
- Kunci frame wajib (kontrak `combat/BattleAtlas.ts`): `idle_a, idle_b, anticipation, attack, followthrough, recovery, hit_recoil, hit_recover, death_start, defeated` + `event.frame_key`. Atlas v4 membawa `duration_ms` sendiri (`bossAtlas()`); atlas empat pose lama diadaptasi `mournfangPlayback`.
- BattleScene menaruh sprite dari **garis tanah** (`yForFoot`), bukan koordinat y mentah, sehingga musuh melayang dan berpijak berbagi tanah yang sama dengan party. Jarak serang boss (`standOff` 112 px) lebih lebar daripada monster kecil.
- Kontras: siluet harus terbaca di atas tanah #65533E DAN latar #304734: outline 1 px plum #1D1625 + nada tubuh berbeda dari tanah. Contoh: Mournfang V4 (27 warna, kontras outline–tanah selisih luma 60).
- **Validasi visibilitas boss (wajib untuk boss baru):** `tests/e2e/visual-helpers.mjs` `battleSpriteVisibility(page, id)` menangkap area sprite dengan dan tanpa sprite (hook `__tfbt.battleHide`) dan menghitung piksel yang berubah. Ambang di `sprint2.mjs`: boss ≥22% kotak berubah dan selisih rata-rata ≥30; monster ≥8–10%. Juga: sprite di sisi kiri, di dalam layar, tidak hilang selama giliran bergulir, hanya mundur setelah defeat.

## 4. Lingkungan

**Pipeline:** setiap area dihasilkan skrip deterministik (`scripts/gen-forest-art.mjs`, `gen-forest-edge-art.mjs`, `gen-forest2-art.mjs`, `gen-town-art.mjs`; pustaka `scripts/lib/pixelkit.mjs`, `palettes.mjs`, `town-art/`) → dasar peta dipanggang menjadi satu PNG + atlas prop (`props.png/json`, pivot per frame sebagai pecahan) → didaftarkan di `data/environmentAssets.ts` → digambar oleh `world/*Art.ts`. Penempatan prop ada di data peta (`*.map.mjs`, `town.layout.mjs`), bukan di `WorldScene`.
**Palet:** satu palet tertutup per area; tiap bahan = satu ramp (indeks 0 = tepi/bayangan terdalam). Hutan 1 ≈66 warna hangat; Hutan 2 lebih dingin/tua (teal-abu, ochre redup hanya 3 gugus); Aveloria batu kapur pucat + atap slate + panji plum, tanpa emas; Liora kayu, jerami, tanah, kapur. Hirarki: tanah yang dapat dilalui selalu lebih terang/hangat daripada lantai di bawah kanopi.
**Cahaya:** dari kiri-atas; muka kiri/atas terang, kanan/bawah gelap; bayangan jatuh ke kanan-bawah dan DIPANGGANG di dasar peta (tidak ada ellipse hitam di bawah pohon/bangunan), tepi bayangan berdither papan catur 1 px; tanpa bloom.
**Garis tepi:** benda padat memakai garis 1 px selektif (ramp[0] bahan tetangga); flora tanah tanpa outline.
**Pohon dan vegetasi:** setiap spesies punya SILUET berbeda (bukan recolor): Hutan 1 delapan siluet berdaun lebar/konifer + pohon mati; Hutan 2 pohon tua dengan akar banir, melintir, berongga, mati berlumut, cemara tua. Kanopi = gugusan daun berlapis dengan tutup terang kiri-atas, bukan noise. Tidak ada tekstur acak sebagai "detail".
**Variasi tile / dasar:** nada diposterisasi dari medan kontinu lalu filter mayoritas 3×3 (gumpalan bersih); detail = stempel kecil berkelompok dengan kepadatan dari noise gerombol (sengaja ada ruang kosong). Transisi bahan (rumput → rumput terinjak → tanah) dengan bibir gelap 1 px.
**Penempatan:** kanopi menjulang ke utara dari pangkal batang; pohon di selatan ruang jalan berpangkal ≥ tepi + ~125 px (konifer ~150) agar tidak menutup jalan (`scripts/check-forest-layout.mjs`). Kaki collision = pangkal saja; kanopi tidak pernah menghalangi. Set piece tangan-susun per area; sabuk latar berjarak tidak teratur dan tidak pernah sejenis dengan dua tetangga. Titik cerita (spawn, interactable, pemicu, keluar) wajib sel walkable terjangkau (`forestart.test.ts`, `townReach.test.ts` – flood fill terhadap geometri asli).
**Depth:** semua sprite dunia di-sort dengan y pangkal (`setDepth(y)`, origin di dasar); decal datar (`flowers*`, `mushrooms*`) selalu di bawah karakter (`DECAL_TYPES`). Bangunan tinggi dipisah menjadi lapis belakang/depan bila NPC harus berdiri di antaranya (kios Derrria); override depth hanya bila perlu (arsip 775 untuk Azie).
**Kota:** satu bahasa arsitektur per kota; bangunan memiliki bentuk atap, pintu, jendela, cerobong, teras; objek keseharian berfungsi (sumur, gerobak, rak jemur, tali jemuran). Papan nama in-world, bukan label debug.
**Performa:** dasar peta = 1 PNG/beberapa chunk, atlas bersama, GameObject prop ratusan bukan ribuan, tidak ada tekstur baru per frame. Ukur: rata-rata frame dunia ≈16,6 ms (headless, `sprint2.mjs`).

## 5. UI yang dikunci (Sprint 1)
Title, tipografi (Cinzel + Source Sans 3), dialog, menu, battle UI, Jurnal, Pengaturan tidak diubah di Sprint 2. Perubahan UI hanya untuk bug/penyelarasan.

## 6. Checklist QA visual (setiap area/karakter/boss baru)
1. Screenshot 1366×768 DAN 1920×1080 (3+ bagian tiap area) — evaluasi terhadap kriteria "anti-slop": bukan noise, bukan recolor, bukan stiker, bukan glow penutup.
2. Karakter: `frameBounds` semua frame (kaki 46, tanpa piksel tepi, tinggi 44–46), crown/rambut utuh pada keempat arah, idle berubah pada piksel (bukan geser), sprint berbeda dari jalan.
3. Boss/monster: `battleSpriteVisibility` lulus (ratio + delta), sisi kiri, atlas kunci frame lengkap, kontras terhadap tanah dan latar.
4. Peta: titik cerita terjangkau (flood fill), footprint collision sesuai bentuk visual, depth benar (berjalan di belakang/depan pohon/bangunan), save/Continue tidak menaruh pemain di dalam solid (`standable`).
5. Unit + TypeScript + build + E2E (semua suite) + konsol tanpa error/404/audio.
## 7. Checklist produksi
**Peta:** (1) data peta + collision lebih dulu, (2) palet area, (3) generator ground + atlas, (4) set piece di titik cerita, (5) sabuk latar, (6) uji jangkauan, (7) screenshot, (8) catat kelemahan di `docs/production/sprint2/*`.
**NPC:** referensi turnaround + portrait → pixelization terkendali + cleaning manual → front/side/back, kiri = cermin kanan → jalan 4 frame + idle 4 frame (lapisan nyata) → `anims` → uji `cast-sprites.test.ts` → verifikasi di adegan nyata bersama Yaric.
**Boss:** konsep resmi → segmentasi → pixelization + redraw tracing wajah → kontras terhadap dua latar → 10 kunci frame → uji `mournfang.test.ts`-style + `battleSpriteVisibility` → catat pose mana yang redraw asli vs rekomposisi.
