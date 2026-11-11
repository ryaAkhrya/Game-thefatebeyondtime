# Polish Sprint 2 — World art, karakter, animasi, sprint, Chapter I–II quality lock

Pengerjaan 11–12 November 2026. Workspace `D:\01_DEVELOPMENT\GAME\FINAL`, aplikasi `web/`. Tidak ada commit, push, atau deploy. Tidak masuk Bab III. UI Sprint 1 tidak dirombak. Audio tetap senyap (AWAITING_COMPOSER).

Pekerjaan seni dibagi ke lima engineer paralel (Mournfang; Yaric; cast; dunia hutan; dunia kota) dengan kepemilikan file terpisah; saya mengintegrasikan, menulis mesin animasi/sprint/uji, dan memverifikasi semuanya di browser. Catatan rinci tiap bagian: `docs/production/sprint2/*.md`. Standar teknis: `CHAPTER12_VISUAL_QUALITY_STANDARD.md`.

## A. Status

| Aspek | Status |
|---|---|
| **Fungsional** (boss terlihat, sprint, animasi, save/load, cerita Bab I–II) | **PASS** — dibuktikan di browser |
| **QA otomatis** | **PASS** — unit 676/676, TypeScript strict, build, Edge produksi 722 pemeriksaan, Chrome 115 |
| **Kualitas visual** | **PARTIAL** — peningkatan besar dan terukur (lingkungan, Nambo/Torvan/Velthia, Mournfang), tetapi sebagian aset masih kasar/turunan dan perlu seniman (lihat L). Penilaian estetika akhir butuh review manusia. |

Definition of Done: butir 1–4, 9–16 terpenuhi penuh. Butir 2 (Mournfang idle/attack/hit/defeat) terpenuhi secara fungsional tetapi hanya `idle_a` yang gambar asli; sisanya animasi terbatas (rekomposisi lapisan). Butir 5 (Nambo) dan 7–8 (idle) terpenuhi untuk Yaric/Nambo/Torvan/Velthia; **Azie, Talric, Zira, Derrria hanya mendapat idle turunan di atas sprite prototipe lama** dan warga tanpa nama masih kotak kode → butir 5/8 PARTIAL. Butir 6 (lingkungan): kohesif dan authored di empat area; kelemahan tercatat di L. Karena itu status keseluruhan = **PARTIAL**, bukan PASS penuh.

Baseline sebelum sprint (kode = commit `f996c59`): unit 588/588, build lulus; E2E Edge Sprint 1 final = 645 pemeriksaan (84+197+37+54+38+75+55+105 lulus; hasil dari run final Sprint 1 pada pohon yang sama, tidak diulang).

## B. Bug Mournfang

- **Reproduksi** (browser, `qa.bossBattle()` dan screenshot Sprint 1): sprite SELALU ada di scene (texture dimuat, alpha 1, depth benar, posisi kiri) — bukan bug pemuatan. **Akar masalah art**: atlas `B01_BATTLE_ATLAS_DRAFT` (empat pose 96×96) adalah blob elips/tongkat cokelat-tan yang tampak terbalik, berwarna hampir sama dengan tanah arena (#65533E; selisih luma rata-rata 9) dan tidak menyerupai desain resmi, sehingga pada praktiknya "tidak terlihat". Pada layar nyata (1366/1920) hanya ≈11% kotak sprite berbeda dari latar saat disembunyikan, selisih rata-rata 47 (tanpa kontur).
- **Solusi:** atlas baru `B01_BATTLE_V4` (160×128, 10 frame, 27 warna, outline plum 1 px) dari konsep resmi `B01_NEW_CONCEPT_DRAFT.png` (rusa-serigala berbalut daun, tanduk ranting, tengkorak bertaring, mata amber): segmentasi, pixelization terkendali, wajah/taring digambar ulang dengan tracing. Dipasang lewat manifest (`finalPath`, `finalFrameSize`), `bossAtlas()`, jarak serang boss 112 px, bayangan lebar, dan sprite dunia Tepi Hutan (origin dari pivot).
- **Bukti piksel nyata** (`battleSpriteVisibility`, tangkapan layar dengan/tanpa sprite): Mournfang **35,6% kotak berubah, selisih rata-rata 38** (1920) — tetap terlihat saat idle berganti, saat telegraf sapuan (frame antisipasi), selama giliran bergulir; hilang hanya setelah kalah (alpha 0). Posisi kiri, di dalam layar, tubuh ≈142×99 px. Frame yang dimainkan terverifikasi: anticipation, attack, followthrough, recovery, hit_recoil, hit_recover. Screenshot: `.dev-cache/test-artifacts/sprint2/after/s2_battle_mournfang*_{1366,1920}.png`, perbandingan `sprint2/compare/boss_telegraph_before_after_1920.png`.
- Monster lain juga diperiksa dengan metode yang sama: Hollowling 32%, Briaroot 31%, Veyrath 16%, Torvan 31%, Yaric 30% — semua terlihat (tetap sprite draft kasar untuk Veyrath/Briaroot/Wisplet/Torvan battle).
- **Frame yang butuh artwork tambahan:** pose serang tanduk (kini shear 10° dari tanduk), rahang membuka/menutup, retakan tengkorak, jamur punggung, kaki bawah (lihat L).

## C. Yaric — arah atas

- **Akar:** sumber atlas membuat mahkota rambut tampak belakang terpotong rata (baris y=1 selebar 12–13 px tanpa kontur); offset tidak dapat memulihkannya.
- **Koreksi:** redraw terkontrol keempat frame belakang: kubah rambut berkontur (5–6 px di y=1, melebar ke bawah, kontur gelap sama dengan frame depan); satu baris jubah polos dihapus sehingga tinggi tetap 46 dan kaki tetap y=46; tuft samping dirapikan. Arah lain diaudit (tidak terpotong).
- **Bukti:** pada tekstur yang dimuat browser, 56 frame (walk/idle/sprint × 4 arah): kaki di baris 46 di SEMUA frame, tidak ada piksel pada baris 0/kolom tepi, tinggi 44–46, baris atas mahkota 4–10 px (sebelumnya potongan 12–13 px). Screenshot empat arah: `sprint2/after/s1_yaric_{up,down,left,right}_1920.png`; perbandingan `compare/yaric_up_before_after_1920.png`. Kaki tidak melayang, bayangan 20×6 mengikuti.

## D. Nambo

Atlas baru `C08` (6 kolom): frame berdiri dilukis tangan sebagai peta piksel dari turnaround resmi (goggles di kepala, rambut cokelat acak, perban pipi, syal krem berekor, jaket cokelat bertali dengan gesper, tas/kunci inggris, sarung tangan, celana bermanset, bot), jalan 4 frame dan idle 4 frame (napas, syal, jumput rambut) diturunkan dengan geseran lapisan. Tinggi ≈45 px, kaki y=46. Diverifikasi dalam adegan nyata bersama Yaric di Hutan 1 (`s2_nambo_world_*.png`) dan idle diuji pada piksel (maks ratusan piksel berubah antar frame). **Kekurangan jujur:** kiri = cermin kanan (perban/gesper terbalik), wajah samping minimal, 26–28 px lebih gempal dari Yaric, jalan samping "kaki bertumpuk" pada pembesaran tinggi.

## E. Lingkungan

Empat area dibangun ulang dengan generator deterministik (dasar peta PNG + atlas prop berpivot), palet tertutup per area, cahaya kiri-atas, bayangan dipanggang, garis tepi selektif, depth sorting oleh y pangkal:
- **Hutan 1:** 8 siluet pohon berbeda + pohon mati, 4 bentuk batu, semak/flora; set piece tangan-susun per periode; tempat bangun dengan kolam cahaya, jejak, pedang di samping batu berlumut; jalan menjulur dari clearing. Loop koridor tetap identik (0 piksel beda antar periode).
- **Tepi Hutan:** jalan teduh → tikungan → jalur timur dengan tempat istirahat → arena Mournfang (cakaran, kawah, serpihan) → padang menuju Aveloria.
- **Hutan 2:** identitas sendiri (tua, dingin teal/abu): pohon banir/melintir/berongga/mati berlumut, tiga ruang (lorong, tikungan Torvan, jalur jaga lama), penanda berukir dua garis hampir bertemu, palisade, lantai batu tua bergaris, gangguan waktu halus (riak, daun menggantung). Kotak-kotak dan tujuh pohon identik lama hilang.
- **Aveloria:** batu kapur pucat + atap slate + panji plum (tanpa emas): gerbang berlengkung bersoliditas, tembok dengan celah panah, plaza berpaving dengan medalion dan papan arah, pasar (kios Derrria berlapis belakang/depan), menara lonceng, istana dengan pintu dua keadaan, halaman bertanaman, ruang pertemuan cutaway dengan karpet, rak, meja, berkas cahaya.
- **Liora:** empat rumah berbeda (kayu-jerami, daub-ochre, log, batu-kayu), bengkel Zira dengan dua ukiran sesuai cerita, sumur, rak jemur, tumpukan kayu, tali jemuran, kebun, pohon linden berbangku, jalan tanah berbekas roda.
Bukti sebelum/sesudah: `sprint2/forest/` (82), `sprint2/town/` (74), dan `compare/`.
- **Peta/cerita tidak berubah.** Tidak ada perpindahan posisi NPC/spawn/pemicu/keluar/interactable cerita. Uji jangkauan: `forestart.test.ts` (9), `townReach.test.ts` (13, flood fill terhadap geometri asli), `world.test.ts`. QA E2E menemukan dua dekorasi yang menyempitkan rute uji (lampu jalan Aveloria di y=1040, kursi/lentera Liora) — dipindah, geometri jalur asli pulih.

## F. Idle animation

Sistem berbasis data (`world/CharacterAnims.ts`): atlas membawa `cols` dan `anims` (idle/walk/sprint per arah); NPC idle mulai dari frame acak; fallback untuk atlas tanpa data.
| Karakter | Frame idle/arah | Pendekatan |
|---|---|---|
| Yaric | 4 (ping-pong 6 langkah) | kepala/bahu −1 px, ujung jubah geser 1–2 px, jumput rambut ±1, kaki identik |
| Nambo | 4 | kepala+syal −1 px, jumput, ekor syal 1–2 px |
| Torvan | 4 | napas, ketukan tongkat 1 px, kepala miring |
| Velthia | 4 | sangat tertahan: napas 1 px + ujung gaun 1 px |
| Azie, Talric, Zira, Derrria | 3 turunan | kepala/bahu −1 px, baris bawah geser 1 px (prototipe tanpa lapisan hem — kasar) |
Bukti piksel (bukan timer): `diffPngs` antar tangkapan layar berurutan — Yaric hingga 1767 px berubah (5/5 pasangan), Nambo, Velthia (halus tetapi nyata), plus uji unit selisih per-pita (rambut/torso/ujung jubah) dan baris kaki identik. Warga tanpa nama tetap sprite kotak kode (tanpa idle).

## G. Sprint (Shift)

- **Input:** `InputManager.isSprintHeld()` (Shift kiri/kanan atau `shiftKey`); Shift **bukan intent** → tidak memicu menu/lompat dialog/aksi battle; dihapus saat blur atau input mati. Shift + WASD dan + Panah; tetap empat arah.
- **Kecepatan:** 1,65× jalan (88 → 145 px/s); terukur 1,58× (1366) dan 1,63× (1920) pada jendela 0,7 s (termasuk percepatan awal).
- **Animasi:** state `idle`/`walk`/`sprint` terpisah; sprint = 6 frame per arah, condong, langkah panjang, jubah mengembang, fps 14 (jalan 8). Sprint hanya aktif saat benar-benar bergerak; lepas Shift → jalan tanpa berhenti; lepas tombol → idle.
- **Collision/trigger:** `moveWithCollision` sudah per langkah 1 px (uji unit: 120 frame 50 ms menabrak dinding 8 px tanpa tembus); pemicu cerita kini disapu sepanjang jalur frame (langkah ≤2 px) sehingga tidak terlewat; E2E: lari 4 arah ke tepi peta selalu `standable`, pemicu Hollowling tetap aktif saat berlari, Pause saat sprint membekukan dunia dan Shift tidak bocor, Torvan mengikuti dengan state yang sama (jarak maksimum diukur, tanpa teleport).
- Tanpa stamina/cooldown/toggle. Dinonaktifkan otomatis bila layer input bukan `world`.

## H. Chapter I–II polish

Kamera/zoom bulat dan depth dipertahankan; decal datar selalu di bawah karakter; boss dunia Mournfang memakai atlas baru; origin sprite 47/48 konsisten; Hutan 2 dan Liora tidak lagi memakai label debug; NPC kota/Liora/Torvan memakai animasi data. Regresi penuh Phase 0–6 + Sprint 1 lulus pada build baru (lihat I). Tidak ada dialog/quest/plot baru.

## I. Pengujian

| Gate | Hasil |
|---|---|
| TypeScript strict + build produksi | PASS (`index-T5ZPU5B3.js` 284 kB, gzip 82 kB; SHA-256 `6BEB87C7FD19C6D8C04206DF1A71E21D02ADE68BECFFB9C9C054EFBB1BF4633B`) |
| Unit | **676/676**, 25 file (baseline 588): +`sprint2-engine` 8, `yaric-sprites` 14, `cast-sprites` 36, `mournfang` 8, `forestart` 9, `townReach` 13 (+ penyesuaian assets/world) |
| Edge produksi (semua suite) | smoke 84, Title journey 197, Phase 2 37, Phase 3 54, Phase 4 38, Phase 5 75, Phase 6 55, Sprint 1 105, **Sprint 2 77** = **722/722** |
| Chrome | Sprint 2 77/77, Phase 4 38/38 |
| Konsol/jaringan | tanpa error JS, tanpa 404, tanpa request audio |
Suite baru `tests/e2e/sprint2.mjs` (77 pemeriksaan × 1366/1920): visibilitas piksel boss/monster, 56 frame Yaric dari tekstur yang dimuat, idle berubah pada piksel, sprint (kecepatan, animasi, 4 arah, WASD, tanpa diagonal, collision, trigger, pause, Torvan), idle NPC, performa. Helper: `tests/e2e/visual-helpers.mjs`.
Temuan selama QA yang diperbaiki: dua dekorasi memblokir rute uji (lihat E); tes lama yang mengasumsikan origin boss 92/96 dan atlas normalized disesuaikan; flake `walk` Torvan tidak terulang.
Keterbatasan: uji headless (tanpa GPU/monitor nyata); fullscreen tidak diuji headless; tanpa uji manusia; Fit/Pixel Perfect diuji pada Sprint 1.

## J. Performa

Headless Edge: frame dunia rata-rata **16,66 ms**, p95 17,3 ms (1366) dan 16,6/18,8 ms (1920); tanpa tekstur dibuat per frame. Aset baru total ≈1 MB (dasar peta 45–122 KB, atlas 25–48 KB, Mournfang 48 KB, atlas karakter final 240 KB); dasar peta terbesar (Aveloria 1280×1408) ≈7 MB tekstur terdekode. Bundle JS 266 → 284 kB (+18 kB). Batas: tidak diukur memori browser/GPU nyata.

## K. Perubahan file

Baru: `world/CharacterAnims.ts`, `world/movement.ts`, `data/environmentAssets.ts`, `world/{townArt,forest2Art}.ts`, `data/maps/{town.layout,forestEdge.map,forest2.map}.mjs` (+`.d.mts`), `tests/e2e/{sprint2.mjs,visual-helpers.mjs}`, `tests/unit/{sprint2-engine,yaric-sprites,cast-sprites,mournfang,forestart,townReach}.test.ts`, skrip `scripts/{author-mournfang.py,author-yaric-sprites.py,author_cast_*.py,gen-forest-edge-art.mjs,gen-forest2-art.mjs,gen-town-art.mjs,check-forest-layout.mjs,lib/,town-art/,sprite-data/}`, aset `public/assets/{characters/final,environment/{forest_edge,forest2,town},battle/B01_BATTLE_V4.*}`, `docs/production/{CHAPTER12_VISUAL_QUALITY_STANDARD,POLISH_SPRINT2_REPORT}.md`, `docs/production/sprint2/*`.
Diubah: `WorldScene` (animasi data, sprint, sapuan pemicu, decal, debug), `InputManager` (Shift), `BattleScene`/`BattleAtlas` (boss atlas, stand-off, probe), `BootScene`, `assetManifest` (`finalPath`/`finalFrameSize`), `AveloriaView`/`Chapter2View` (idle NPC, Torvan state), `forest1/forestEdge/chapter2Maps/aveloria` (data/art), `gen-forest-art.mjs`, `main.ts` (hook QA), `package.json` (`assets:sprint2`, `assets:sprites`), suite E2E lama (penyesuaian), `ASSET_INDEX.md`, `CLAUDE.md`, README/TASKS/SESSION_HANDOFF.
Dinormalisasi/diautor ulang: lihat `ASSET_INDEX.md` bagian Sprint 2.

## L. Backlog visual (butuh seniman)

1. **Mournfang V4:** hanya `idle_a` gambar asli; sapuan tanduk = shear; rahang tidak beranimasi; tengkorak datar; jamur punggung hilang; kaki bawah keruh; `hit_recoil` mengangkat kepala hanya 4 px.
2. **Yaric:** idle dan sprint turunan prosedural dari 4 frame jalan (bukan siklus lari gambar tangan); kiri/kanan cermin dengan 6 baris ganda; mahkota belakang berupa kubah, kurang keriting daripada turnaround.
3. **Nambo/Torvan/Velthia:** jalan/idle turunan dari satu pose per arah; kiri = cermin; wajah samping minimal; rambut Torvan satu gumpal; bagian depan Velthia kotak, tangan hampir tak terlihat.
4. **Azie, Talric, Zira, Derrria:** masih prototipe kasar (badan sama di semua arah) + idle turunan; **warga tanpa nama** = kotak kode tanpa idle. Torvan/Veyrath/Briaroot/Wisplet battle masih sprite draft kasar.
5. **Lingkungan:** semua dilukis kode, belum disentuh seniman. Hutan 1 palet masih cerah ("sedikit tidak nyaman" hanya dari komposisi); baris pohon latar tidak tertata tangan; palisade Veyrath mirip tiang totem; kristal waktu polos; Aveloria: paving agak seperti bata, atap sayap istana ramai, ruang pertemuan tanpa dinding samping/langit-langit, lorong gerbang tanpa dinding, portcullis keadaan tertutup belum diverifikasi di browser; semua pohon/semak kota satu algoritma mahkota; rak jemur A mirip pagar; penjual produk menimpa kios. Tidak ada lapisan kanopi foreground maupun animasi ambien.
6. Overlay senja kota lama tidak diubah.

## M. Preview

`http://127.0.0.1:5173/` (dev server aktif; HTTP 200 diverifikasi pada saat penulisan). Kontrol baru: tahan **Shift** untuk lari. Tidak ada deployment.

## N. Kesiapan Chapter III

Standar teknis ada di `CHAPTER12_VISUAL_QUALITY_STANDARD.md` (skala, pivot, kontrak `anims`, atlas boss, pipeline lingkungan, checklist QA/produksi). Prasyarat sebelum Bab III: (1) review manusia atas sprite/lingkungan dan keputusan seniman untuk backlog L, (2) sprite pendukung dan warga tanpa nama diautor ulang dengan kontrak `anims`, (3) boss baru lolos `battleSpriteVisibility`. Bab III belum dimulai.
