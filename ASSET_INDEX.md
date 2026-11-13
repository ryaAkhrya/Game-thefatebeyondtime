# Asset index v3.3 — per file

## Phase 9 — code-native cinematic assets (DRAFT / NEEDS_REVIEW)

| Runtime asset | Source / provenance | Status |
|---|---|---|
| Modern scene, anonymous pair, relic | `web/src/game/ending/EndingArt.ts`, original code drawing, 640×360 | DRAFT; no real venue/likeness claimed |
| Archive/heirloom/open Heart fragments | Same renderer; existing ring/broken-diagonal motif | DRAFT; no stock photos |
| Cliff, valley, damaged Aveloria, clouds | Same renderer, one reused canvas texture, integer scale | DRAFT; human review pending |
| C01/C02 seated poses | Existing final back-facing head/torso + code-native bent cloth/legs | DRAFT derivative; originals preserved; anatomy review pending |
| Modern cloud silhouettes | Anonymous code-drawn forms, audience montage only | DRAFT; no future vision by fantasy characters |
| Font license text | `web/public/legal/fonts.txt`, installed Fontsource licenses | Public legal text, SHA-256 allowlisted |

No new raster source artwork, personal media, BGM or SFX files. Real photos, partner art and captions are absent. Public static paths and SHA-256 are recorded in `web/public-assets.allowlist.json`; review future entries individually. Private photographs are contained without cropping or generative modification.

## Polish Sprint 2 – aset final karakter, boss, dan lingkungan (semua DRAFT / NEEDS_REVIEW)

Catatan rinci per bagian: `docs/production/sprint2/{yaric,cast,mournfang,forest-world,town-world}.md`. Standar teknis: `docs/production/CHAPTER12_VISUAL_QUALITY_STANDARD.md`. Sumber di `assets/` tidak diubah; semua keluaran dapat dibuat ulang (skrip deterministik, hash identik antar-run).

- **Atlas eksplorasi final** `web/public/assets/characters/final/Cxx_explore.{png,json}` (manifest `finalPath`, di atas `publicPath` ternormalisasi Sprint 1). JSON membawa `cols` dan `anims` (idle/walk/sprint per arah). Dibuat oleh `web/scripts/author-yaric-sprites.py` (C01) dan `web/scripts/author_cast_build.py` + `author_cast_sprites.py` + `sprite-data/*.txt` (C02, C03, C05, C06, C07, C08, C09). `python -I web/scripts/<skrip>` dari root repo; butuh Pillow + numpy.
  - **C01 Yaric** (4 kol x 14 baris, 56 frame): mahkota rambut tampak belakang digambar ulang (kubah berkontur; 1 baris badan dihapus agar tinggi 46 tetap), idle 4 frame/arah (ping-pong), sprint 6 frame/arah. Idle/sprint adalah turunan prosedural dari 4 frame jalan asli (bukan siklus lari gambar tangan); kiri/kanan masih cermin dengan 6 baris ganda dari Sprint 1. Perlu redraw artist.
  - **C08 Nambo, C03 Torvan, C02 Velthia** (6 kol): frame berdiri dilukis tangan sebagai peta piksel (`sprite-data/Cxx_maps.txt`) dari turnaround resmi (goggles/syal/jaket bertali Nambo; rambut pirang/jubah/tongkat ranting Torvan; bob tembaga/gaun plum Velthia). Jalan dan idle diturunkan dari frame berdiri lewat geseran lapisan baris/kolom. Kiri = cermin kanan (perban/gesper terbalik). Wajah samping minimal.
  - **C05 Azie, C06 Talric, C07 Zira, C09 Derrria** (9 kol): atlas prototipe kasar lama dipertahankan (kolom 0-5 byte-identik) + idle turunan 3 frame (kolom 6-8). BELUM diautor ulang.
- **Mournfang V4** `web/public/assets/battle/B01_BATTLE_V4.{png,json}` (1600x128, 10 frame 160x128, pivot [77,124], menghadap kanan, 27 warna, outline plum #1D1625): pixelization terkendali dari `assets/bosses/B01_Mournfang/B01_NEW_CONCEPT_DRAFT.png` + tengkorak/rahang/taring digambar ulang dengan tracing (`web/scripts/author-mournfang.py`). Hanya `idle_a` pose asli; sembilan frame lain = rekomposisi lapisan (pergeseran/shear baris, tanpa rotasi/skala). Atlas lama `B01_BATTLE_ATLAS_DRAFT.*` tetap utuh.
- **Lingkungan** `web/public/assets/environment/{forest1,forest_edge,forest2,town}/` (dasar peta PNG + atlas prop/bangunan dengan pivot): dibuat oleh `gen-forest-art.mjs`, `gen-forest-edge-art.mjs`, `gen-forest2-art.mjs`, `gen-town-art.mjs` (pustaka `scripts/lib/`, `scripts/town-art/`). Dilukis oleh kode tanpa aset luar; bukan hasil seniman. Tata letak: `data/maps/{forest1,forestEdge,forest2,town.layout}.map.mjs`.
- Total aset baru Sprint 2 ≈1 MB (dasar peta 45-122 KB, atlas 25-48 KB).

## Polish Sprint 1 – aset UI turunan (portrait HD dan siluet Title)

Dibuat oleh `web/scripts/prepare-ui-assets.mjs` (Edge headless canvas; sumber di `assets/` TIDAK diubah). Manifes: `web/public/assets/ui.generated.json`. Semua DRAFT.

- **Portrait HD** `web/public/assets/portraits_hd/<ID>_<EKSPRESI>.png` (42 file, tinggi 352 px, latar transparan): turunan resampling bertahap berkualitas tinggi dari PNG ekspresi individual (bukan redraw, bukan pixelation) untuk dialog yang kini digambar 1:1 pada resolusi perangkat. Portrait 128 px lama tetap ada di `portraits/` (kompatibilitas/tes). Dimuat dengan filter linear.
- **Siluet Title Screen** `web/public/assets/title/title_yaric.png`, `title_velthia.png` (tampak samping turnaround, tinggi 760 px) dan `title_greatsword.png` (bilah). Sumbernya crop REFERENCE (`C01_TURNAROUND_SIDE`, `C02_TURNAROUND_SIDE`, `C01_WEAPON_GREATSWORD`); dipakai hanya sebagai **siluet bernada gelap** (tint fill + detail samar), tidak pernah sebagai tekstur final. Belum ada key art final; artist harus menggantinya dengan ilustrasi resmi yang tetap mengikuti desain approved (jubah/greatsword Yaric, rambut bob/busana kerajaan Velthia). Velthia ditampilkan dengan flip horizontal dari tampak samping.
- Font UI: Cinzel 600/700 (judul) dan Source Sans 3 400/600/italic (isi) dari paket npm @fontsource (SIL OFL 1.1), terpasang lokal di `web/node_modules` (drive D:). Font final belum ditetapkan Game Director.

## Polish Sprint 1 – normalized exploration atlases

Game kini memuat **turunan runtime ternormalisasi** `web/public/assets/characters/normalized/Cxx_explore.png` + `.json` (+ `normalized.generated.json`) untuk C01, C02, C03, C05, C06, C07, C08, C09. Dibuat deterministik oleh `web/scripts/normalize-exploration-sprites.mjs` (rantai `npm run assets:prepare`, dijalankan paling akhir; membaca salinan runtime lama). **Source di `assets/` tidak diubah.** Salinan runtime lama `web/public/assets/characters/Cxx_explore.*` juga tidak diubah dan tetap byte-identical dengan source (kecuali PNG C01 = source v3.2 minus piksel liar y>=44 pada frame kiri/kanan, hasil `prepare-assets.mjs`); salinan itu tidak lagi dimuat game (`rawPublicPath` di `assetManifest.ts`). Semua tetap **NEEDS_REVIEW (C01) / DRAFT (lainnya)**; ini bukan aset final dan tidak ada yang PRODUCTION_READY.

Metode (hanya memindahkan/menggandakan piksel yang sudah ada; tanpa resampling, interpolasi, blur; palet dan alpha keras identik; frame/grid/indeks sama: sel 32x48, baris down, left, right, up; C01 4 kolom, lainnya 6):
1. Garis kaki: baris opak terbawah setiap frame dipindah ke y=46 (pivot [16,46]). Satu `dy` per baris arah.
2. Satu `dx` per baris arah (tidak ada centering per frame, jadi siklus jalan tidak bergetar): titik berat 8 baris terbawah (tumpuan kaki) rata-rata dibulatkan ke x=16,0.
3. C01 saja: `left` (sumber tinggi 40 px, kaki melayang 6 px) diregangkan ke tinggi tampak depan, 46 px, dengan menggandakan 6 baris (y11,15,19,23,27,31) yang sama di semua frame; `right` (sumber hanya 36 px dan proporsi lebih kecil) tidak dipakai lagi dan diganti cermin horizontal `left` (frame k = cermin left_k), diregangkan sama. Opsi yang dievaluasi dan ditolak: rata-bawah saja (figur tetap 40/36 px, "lebih kecil"), skala nearest-neighbour seluruh frame 1,15x/1,28x (lebar ikut membesar, kepala lebih besar dari tampak depan, baris/kolom ganda tidak beraturan; 1,28x jelek), peregangan 10 baris pada `right` asli (kurus dan memanjang).

| Karakter | Sebelum (bawah y / tinggi per arah) | Sesudah |
|---|---|---|
| C01 Yaric | down 1-46 (46); left 1-40 (40); right 1-36 (36); up 1-46 (46) | semua arah y1-46, tinggi 46; dx down 0, left +2, right -2 (cermin), up +1 |
| C02 / C05 / C09 | kaki y45, tinggi 41-42 (bob 1 px) | kaki y46 (dy +1), dx -1 |
| C03 / C06 / C08 | kaki y47, tinggi 43-44 | kaki y46 (dy -1), dx -1 |
| C07 Zira | y0-45 (puncak menyentuh tepi sel di frame genap), tinggi 45-46 | y1-46 (dy +1), tidak lagi menyentuh tepi, dx -1 |

Frame yang tetap membutuhkan **redraw seniman** (tidak diklaim final):
- C01 `back_0..back_3` (tampak belakang): bagian atas rambut terpotong rata di y=1 (baris selebar 12-13 px tanpa outline, sedangkan mahkota depan runcing 3 px); pemotongan sudah ada di source dan tidak bisa dipulihkan tanpa menggambar ulang.
- C01 `right_0..right_3`: turunan cermin `left` (shading cahaya dan detail asimetris ikut terbalik); `left_0..left_3` / `right_0..right_3` mengandung 6 baris piksel setinggi 2x pada badan/jubah (bersih secara visual, bukan gambar asli). Frame `left_1/left_3` (dan cerminannya) memiliki garis cokelat 1 px di bawah sepatu yang dipertahankan sebagai sol.
- C02/C03/C05/C06/C07/C08/C09 (semua frame): prototipe kasar, badan sama untuk keempat arah dan hanya kepala berbeda, tanpa animasi kaki/lengan; hanya garis kaki dan offset yang dikoreksi. Tinggi antar-karakter berbeda (41-46 px) karena sumbernya; tidak diskalakan.

Origin Phaser yang cocok dengan pivot [16,46]: pivot = baris piksel kaki terbawah, tepi bawahnya y=47 sel, jadi `setOrigin(0.5, 47/48)` menempatkan tepi bawah kaki tepat pada y dunia (dasar `footBox`). Origin `46/48` akan menurunkan sprite 1 px di bawah footBox.

Tes: `web/tests/unit/sprites.test.ts` (invarian atlas ternormalisasi) dan `web/tests/unit/assets.test.ts` (salinan lama identik byte dengan source; game memuat jalur normalized).

## Web import Phase 6 — Liora, Hutan 2, party dan Veyrath

`web/scripts/prepare-chapter2-assets.mjs` menyalin **6 atlas DRAFT PNG+JSON byte-identical** dari library: C03 eksplorasi/battle, C07 eksplorasi, M02/M03/B02 battle. **13 portrait** C03/C07/C02 VULNERABLE diturunkan dari PNG individual existing lewat resize 128 px. Jejak sumber/output/ukuran dan status ada di `web/public/assets/chapter2.generated.json`. Lingkungan Liora/Hutan 2 dan dua warga tanpa nama adalah code-native DRAFT. Atlas battle C03/M02/M03/B02 hanya empat pose sumber; adapter menahan pose saat playback, tanpa mengklaim frame animasi final. Siluet/ekspresi, terutama C03/C07/B02, perlu review artist. Tidak ada audio baru. Screenshot dan catatan di `docs/production/PHASE6_REPORT.md`.

## Web import Phase 5 — Aveloria

Empat atlas eksplorasi C02 Velthia, C05 Azie, C06 Talric dan C09 Derrria disalin **utuh/byte-identical** dari `assets/characters/<ID>_<Nama>/<ID>_EXPLORATION_ATLAS_DRAFT.{png,json}` ke `web/public/assets/characters/<ID>_explore.{png,json}`. Grid 32×48, atlas 192×192, 24 sel, empat arah × enam frame, pivot [16,46]. DRAFT/NEEDS_REVIEW, tanpa battle kit NPC atau party join Velthia. Wajah/kostum sumber tidak digambar ulang; prototipe sangat sederhana dan animasi belum final.

14 portrait turunan berasal dari **PNG individual** existing, tinggi runtime 128 dengan pipeline resize existing: C02 NEUTRAL/STERN/AMUSED/WORRIED/SURPRISED; C05 NEUTRAL/WORRIED/SKEPTICAL; C06 NEUTRAL/SUSPICIOUS/ALARMED; C09 NEUTRAL/AMUSED/WORRIED. Sumber, output dan ukuran tercatat pada `web/public/assets/aveloria.generated.json`, diproduksi `web/scripts/prepare-aveloria-assets.mjs`. Tidak ada pengganti v3.3 untuk atlas kota ini. Source hash/table di bawah tetap utuh.

Lingkungan Aveloria dan empat warga tanpa nama adalah **code-native DRAFT** di `world/aveloria.ts`/`AveloriaView.ts`: bukan art PNG final. Geometri collision terpisah; renderer dapat diganti tanpa mengubah quest/save. Evidence runtime/review/batasan ada di `docs/production/PHASE5_REPORT.md`. Tidak ada audio, konsep wajah atau source reference crop baru.

## Web import Phase 4 — Mournfang

`assets/bosses/B01_Mournfang/B01_BATTLE_ATLAS_DRAFT.{png,json}` disalin byte-identical ke `web/public/assets/battle/`; hanya empat pose grid 96×96 (idle/attack/hit/defeated). Tidak ada atlas B01 v3.3 yang menggantikannya. Adapter playback menahan pose existing; tidak menambah gambar/frame sumber atau mengklaim animasi final. Source JSON tetap DRAFT; review tetap NEEDS_REVIEW. Detail wajah tulang/tanduk, kaki, artikulasi gerak dan beberapa piksel tepi belum cukup mencerminkan concept art; masuk backlog `docs/production/PHASE4_REPORT.md`. Tidak ada perubahan hash/source asli atau audio.

## Web import status terkini — Phase 2, 10 November 2026

Salinan runtime **byte-identical** PNG + JSON tersedia di `web/public/assets/battle/`:

- `C01_ATLAS_PIXEL_PASS_V3_3.*` dari `assets/characters/C01_Yaric/v3_3/` (11 frame 96x96; contact frame 4).
- `M01_ATLAS_PIXEL_PASS_V3_3.*` dari `assets/monsters/M01_Hollowling/v3_3/` (10 frame 96x96; contact frame 3).
- `C01_GROUND_SLAM_ATLAS_PIXEL_PASS_V3_3.*` dari `assets/vfx/C01_GROUND_SLAM/v3_3/` (8 frame 96x64; impact frame 5).

Status semuanya **NEEDS_REVIEW**, bukan final. `web/scripts/prepare-battle-assets.mjs` hanya menyalin. Tes memverifikasi byte equality, grid, alpha channel dan event; playback memakai `duration_ms` dan pivot asli. Yaric pivot kaki [48,95]; Hollowling pivot tengah [48,48] ditempatkan agar titik bawah sama; VFX [48,63]. Tidak ada GIF gameplay atau atlas battle v3.2.

Visual QA menemukan potongan pedang di sisi kanan beberapa frame Yaric dan piksel yang menyentuh tepi sel pada ketiga atlas. Ini ada pada sumber dan tidak digambar ulang/dihapus. Boundary/pivot/layout runtime sudah diverifikasi lewat screenshot; kualitas grip/siluet/orientasi pose dan perbaikan crop sumber masih perlu artist/Game Director. Lihat `docs/production/PHASE2_REPORT.md`. Bagian Phase 0/1 di bawah adalah riwayat, bukan status impor sekarang.

All `assets/` PNG and JSON paths are indexed with SHA-256 from the actual file. Source sheets and draft UI are not production import targets. The old v3.2 file paths remain addressable. All new animation frames are `NEEDS_REVIEW`.

| Path | Kind | Status | Dimensions | Transparent pixels | SHA-256 |
|---|---|---|---|---:|---|
| assets/bosses/B01_Mournfang/B01_BATTLE_ATLAS_DRAFT.json | pixel atlas metadata | NEEDS_REVIEW | [384, 96] | None | 12711966153494efe8bb53d77bf03f39b33d67a94bb40c0c0f4b40b06b74f21b |
| assets/bosses/B01_Mournfang/B01_BATTLE_ATLAS_DRAFT.png | grid-authored pixel atlas | NEEDS_REVIEW | [384, 96] | 27629 | afb4c922df7a0757e53ad24f0e4e47afbdffb5b0b5bc66fbfedd65de1ca5e3d8 |
| assets/bosses/B01_Mournfang/B01_NEW_CONCEPT_DRAFT.png | new individual illustrated concept | DRAFT | [1536, 1024] | 831450 | 54bdb0bc435ca08ecde3663a25979f54627698534ca4c3736ab742e10c1654ef |
| assets/bosses/B02_Veyrath/B02_BATTLE_ATLAS_DRAFT.json | pixel atlas metadata | NEEDS_REVIEW | [384, 96] | None | 1f2fc99732363825cac2f27b11d4df5ad709021ce93a7f9c4e0c600a64d58c06 |
| assets/bosses/B02_Veyrath/B02_BATTLE_ATLAS_DRAFT.png | grid-authored pixel atlas | NEEDS_REVIEW | [384, 96] | 31314 | e38607c3ff2423cadce00e6aaf5512c1d2057510cfd92f4609fd18ccab02c0d2 |
| assets/bosses/B02_Veyrath/B02_NEW_CONCEPT_DRAFT.png | new individual illustrated concept | DRAFT | [1086, 1448] | 820304 | b2999a9ce32d12fec045cf8f0735e5af57878d4e8dac715f5a8c3e154b523727 |
| assets/bosses/B03_Chronolith/B03_BATTLE_ATLAS_DRAFT.json | pixel atlas metadata | NEEDS_REVIEW | [384, 96] | None | 65c28b751edba55fd0c7573a5c2154ca3991044c26ef0ab7780823130008bc33 |
| assets/bosses/B03_Chronolith/B03_BATTLE_ATLAS_DRAFT.png | grid-authored pixel atlas | NEEDS_REVIEW | [384, 96] | 30258 | b747836dc47e6ae7386c46a99fcb7d87a547061fdd12d41c72fbbbcdac47762a |
| assets/bosses/B03_Chronolith/B03_NEW_CONCEPT_DRAFT.png | new individual illustrated concept | DRAFT | [1312, 1199] | 681078 | ae0317ff36327687135e117280a053f5c83478ae3f26b6ea96aca192cccb9826 |
| assets/characters/C01_Yaric/C01_BATTLE_ATLAS_DRAFT.json | superseded v3.1 draft | REFERENCE | [256, 64] | None | 7cdade570d23c4c6c9c431cb48ca5a33b24bce959878b75018ed40ecb99ddf44 |
| assets/characters/C01_Yaric/C01_BATTLE_ATLAS_DRAFT.png | superseded v3.1 draft | REFERENCE | [256, 64] | 10883 | c2f3f7f855d0ab150961cb9d6448e53c9be7f517d5537af88504fcf23142c57e |
| assets/characters/C01_Yaric/C01_EXPLORATION_ATLAS_DRAFT.json | superseded v3.1 draft | REFERENCE | [192, 192] | None | 7121ef930adac42bc0bc5ca01984ae1aa0ea8556b9ffac15c3f553c8640d4953 |
| assets/characters/C01_Yaric/C01_EXPLORATION_ATLAS_DRAFT.png | superseded v3.1 draft | REFERENCE | [192, 192] | 19076 | b36c9972a7e949d947ac93d52a731f14917e7bba0d5805bf3fe7003ae90c9552 |
| assets/characters/C01_Yaric/C01_EXPRESSION_ANGRY.png | new_redrawn_expression | DRAFT | [537, 623] | 137492 | 8842a629d64a5fc6820499f7e48a09b9240d868c09d7319d5a0eaf2639deacbc |
| assets/characters/C01_Yaric/C01_EXPRESSION_CONFUSED.png | new_redrawn_expression | DRAFT | [522, 605] | 123660 | 234d27df2d738a62e35bad8a593c37d844fdd47c3d80be31d0e447e9fec5125c |
| assets/characters/C01_Yaric/C01_EXPRESSION_DETERMINED.png | new_redrawn_expression | DRAFT | [536, 624] | 128943 | c7abe99983ef5424b2f6a466e07a15950f69132f48c5a5928acb1cc1d0d743de |
| assets/characters/C01_Yaric/C01_EXPRESSION_EMBARRASSED.png | new_redrawn_expression | DRAFT | [557, 624] | 132135 | 627b125c45898b0d1767009e42d8d98c943265e6ab79da9671998b2c48c1f33a |
| assets/characters/C01_Yaric/C01_EXPRESSION_HAPPY.png | new_redrawn_expression | DRAFT | [536, 624] | 131841 | 77fbb3c1fcd44873a815c2d2d64a56b871671d96e86b28747e2edf3b5056d714 |
| assets/characters/C01_Yaric/C01_EXPRESSION_NEUTRAL.png | new_redrawn_expression | DRAFT | [523, 610] | 123714 | 097d0206e5703ab1af6ec28e1886106a9484a47975a1c6e189e7446ac629dd5b |
| assets/characters/C01_Yaric/C01_EXPRESSION_SAD.png | new_redrawn_expression | DRAFT | [553, 607] | 133184 | e9046994386a178ae902d3110aff6f9c14c3fb4879a9fa8975601515ec9677df |
| assets/characters/C01_Yaric/C01_EXPRESSION_SURPRISED.png | new_redrawn_expression | DRAFT | [559, 618] | 130606 | 628bc9ef70508c3476c627418b36334b8ed212ac37101cbffb0265ba0f7726e4 |
| assets/characters/C01_Yaric/C01_TURNAROUND_BACK.png | new_redrawn_turnaround | DRAFT | [357, 998] | 126019 | aff5ea625f55f3d22b954eef247b890453b1a8834cbf84f860e2dcb53b1647ae |
| assets/characters/C01_Yaric/C01_TURNAROUND_FRONT.png | new_redrawn_turnaround | DRAFT | [377, 1003] | 130833 | 2eb51bca65cc26c1b377cf9e7fa8c7e0466a3dc26a5f03973780620d5508aed4 |
| assets/characters/C01_Yaric/C01_TURNAROUND_SIDE.png | new_redrawn_turnaround | DRAFT | [315, 999] | 169142 | d6b7e4fe67ffe2db96f9c662818ea024cdeba9943129b6a303e85209147138d9 |
| assets/characters/C01_Yaric/C01_WEAPON_GREATSWORD.png | new_weapon_concept | DRAFT | [755, 1523] | 844943 | 032ef6278c76c1150cd1a470bfffe1693958dcc81d4e2386beb6634c87c109b0 |
| assets/characters/C01_Yaric/v3_2/C01_ATLAS_PIXEL_PASS_V3_2.json | new atlas frame metadata | NEEDS_REVIEW | [672, 96] | None | 15a09187a08772e504d3f4170543ef5045ad91262461c56893c40aa89cb805d8 |
| assets/characters/C01_Yaric/v3_2/C01_ATLAS_PIXEL_PASS_V3_2.png | new pixel animation candidate | NEEDS_REVIEW | [672, 96] | 43837 | 46a4d43c9d0897d05b54e086ac203d23195fc7e4cad7f6ac86074a01fd860750 |
| assets/characters/C01_Yaric/v3_2/C01_EXPLORATION_PIXEL_PASS_V3_2.json | new atlas frame metadata | NEEDS_REVIEW | [128, 192] | None | ee8e70f01319c443f692ae40a944eb954e593796a044c5883223b288472eee35 |
| assets/characters/C01_Yaric/v3_2/C01_EXPLORATION_PIXEL_PASS_V3_2.png | new pixel animation candidate | NEEDS_REVIEW | [128, 192] | 15068 | f6c736c2c5e0665079c03b39d01eb35b51b8d436c373c68dcf1eb7990b69632c |
| assets/characters/C01_Yaric/v3_2/C01_EXPLORATION_PREVIEW_1X.png | new art source or QA preview | REFERENCE | [128, 192] | 15068 | f6c736c2c5e0665079c03b39d01eb35b51b8d436c373c68dcf1eb7990b69632c |
| assets/characters/C01_Yaric/v3_2/C01_EXPLORATION_PREVIEW_4X.png | new art source or QA preview | REFERENCE | [512, 768] | 241088 | 7beceb540bda61309a040e529abb8242925a978e6dc3ba79c0bdad8908ef7461 |
| assets/characters/C01_Yaric/v3_2/C01_PREVIEW_1X.png | new art source or QA preview | REFERENCE | [672, 96] | 43837 | 46a4d43c9d0897d05b54e086ac203d23195fc7e4cad7f6ac86074a01fd860750 |
| assets/characters/C01_Yaric/v3_2/C01_PREVIEW_4X.png | new art source or QA preview | REFERENCE | [2688, 384] | 701392 | f03e8bd0d421278e7de9da777c02a21f674a5cf81f78083cd3d51f4ec5679c9f |
| assets/characters/C01_Yaric/v3_2/EXPLORATION_SOURCE_SHEET_REFERENCE.png | new art source or QA preview | REFERENCE | [1217, 1293] | 992026 | 29195872d8bc817cf97983b1b533cbe9c4e0cf86f059b74d9da184f74c4ddbe8 |
| assets/characters/C01_Yaric/v3_2/SOURCE_SHEET_REFERENCE.png | new art source or QA preview | REFERENCE | [2098, 749] | 931075 | 43a345d3c2c1764acb3fd2c253a4fa6fa9a4ce358788d815f2b0dc52fdba3890 |
| assets/characters/C01_Yaric/v3_3/C01_ANTICIPATION_V3_3.png | individual animation frame | NEEDS_REVIEW | [96, 96] | 5166 | a5925c66e44568905ee130289f24f9da97f3603821860eb44a3849a56eed66c6 |
| assets/characters/C01_Yaric/v3_3/C01_ATLAS_PIXEL_PASS_V3_3.json | pixel atlas metadata | NEEDS_REVIEW | None | None | 0daacf7cdbc06ce0daad223dc7ccdba63ed2cee629dc0b8272ef7b68711ce8e1 |
| assets/characters/C01_Yaric/v3_3/C01_ATLAS_PIXEL_PASS_V3_3.png | pixel animation atlas | NEEDS_REVIEW | [1056, 96] | 66204 | 3f2268e09defa1ff119c7c4ea794bbf9ec3bfe14c01108debe833ca725e90754 |
| assets/characters/C01_Yaric/v3_3/C01_ATTACK_CONTACT_V3_3.png | individual animation frame | NEEDS_REVIEW | [96, 96] | 7009 | d9c15ad9d4db5303871644a3d55b2462a56afe658bfd4ed6b2ef401a0b8e00db |
| assets/characters/C01_Yaric/v3_3/C01_ATTACK_WINDUP_V3_3.png | individual animation frame | NEEDS_REVIEW | [96, 96] | 6183 | 1f0010fa71446554aabc5ffa4428f36798216539024433f8b7f281bbee80ccc5 |
| assets/characters/C01_Yaric/v3_3/C01_DEATH_START_V3_3.png | individual animation frame | NEEDS_REVIEW | [96, 96] | 5918 | 18b5750cb9ff3746f6f18beb940a9dc0a7c5f92607ad8851fe68f709128b6347 |
| assets/characters/C01_Yaric/v3_3/C01_DEFEATED_V3_3.png | individual animation frame | NEEDS_REVIEW | [96, 96] | 6882 | ddbd707bb4aae641f514b224edc98bdb33e366dc804e8f74a48d814013778dd0 |
| assets/characters/C01_Yaric/v3_3/C01_FOLLOWTHROUGH_V3_3.png | individual animation frame | NEEDS_REVIEW | [96, 96] | 5682 | 81c9f9e754a80155ef5ecded8fac3fb4cc02f883d16d86db08818d44b0616672 |
| assets/characters/C01_Yaric/v3_3/C01_HIT_RECOIL_V3_3.png | individual animation frame | NEEDS_REVIEW | [96, 96] | 5395 | 4f8bb60d82b97b60f9fe4b4f9c84d5430f09f13bfa26777491f9c0900a933524 |
| assets/characters/C01_Yaric/v3_3/C01_HIT_RECOVER_V3_3.png | individual animation frame | NEEDS_REVIEW | [96, 96] | 5111 | 23a55d3c51889031f382a87e1d2482c3da8722d8b413afc01cb115c994cfbefe |
| assets/characters/C01_Yaric/v3_3/C01_IDLE_A_V3_3.png | individual animation frame | NEEDS_REVIEW | [96, 96] | 6358 | f5db5c2a51d0c5ffad21942bd3023868535132dde7ee4232d0037ab0b95af663 |
| assets/characters/C01_Yaric/v3_3/C01_IDLE_B_V3_3.png | individual animation frame | NEEDS_REVIEW | [96, 96] | 6352 | 9cf2f6041fc491dc1a19db596145c792dc8da637137a4cff896c84595bcdbd9d |
| assets/characters/C01_Yaric/v3_3/C01_RECOVERY_V3_3.png | individual animation frame | NEEDS_REVIEW | [96, 96] | 6148 | 9203cabab3f11f76795e84a45d28cd47f004f0fbfc0a756770130e8d15c09db5 |
| assets/characters/C02_Velthia/C02_BATTLE_ATLAS_DRAFT.json | pixel atlas metadata | NEEDS_REVIEW | [256, 64] | None | ba1ce2e11ee621c6c6cb467c64b36403ca3626d495f09646de04b4e51df14037 |
| assets/characters/C02_Velthia/C02_BATTLE_ATLAS_DRAFT.png | grid-authored pixel atlas | NEEDS_REVIEW | [256, 64] | 11563 | ddc28bc7ec1ef97842ea86ca74fe004c753c45278ab19095d16dc0fd5142ccbb |
| assets/characters/C02_Velthia/C02_EXPLORATION_ATLAS_DRAFT.json | pixel atlas metadata | NEEDS_REVIEW | [192, 192] | None | 4dc9bf514136bf9372ec64db172efe2645d9616143fd07609dca62d423102e41 |
| assets/characters/C02_Velthia/C02_EXPLORATION_ATLAS_DRAFT.png | grid-authored pixel atlas | NEEDS_REVIEW | [192, 192] | 19028 | df0fa4af60db6600027439ac48d9bf1787b7a55f8594c738e3d67ca6aaab683d |
| assets/characters/C02_Velthia/C02_EXPRESSION_AMUSED.png | new_redrawn_expression | DRAFT | [590, 621] | 134703 | df3c282b94bf5ef650b39128d97db9ac056e50dc8a5b79f5056644065b3d3ed1 |
| assets/characters/C02_Velthia/C02_EXPRESSION_ANGRY.png | new_redrawn_expression | DRAFT | [537, 604] | 118906 | 2b013b6859f1275561cf800e338eb354e2b72fb84e7998e41d46e53cdc4adf44 |
| assets/characters/C02_Velthia/C02_EXPRESSION_NEUTRAL.png | new_redrawn_expression | DRAFT | [519, 604] | 115655 | c38085ee5c702ec6675210ef500db0841509bad2b160e6dedab421d0e9d2bd25 |
| assets/characters/C02_Velthia/C02_EXPRESSION_RELIEVED.png | new_redrawn_expression | DRAFT | [573, 620] | 136684 | 01e9e75a76d541e4e2cfee22754bebea5c60120b48ff7e6a43234205133d5a47 |
| assets/characters/C02_Velthia/C02_EXPRESSION_STERN.png | new_redrawn_expression | DRAFT | [568, 605] | 133533 | eb0faa2ab66c15d8ee706ffc044ebde33260be6ea3a0a6f7856eaa662a871f76 |
| assets/characters/C02_Velthia/C02_EXPRESSION_SURPRISED.png | new_redrawn_expression | DRAFT | [558, 620] | 123603 | 5dd8a05f0e6fe0e94db105db29b0c6f8de5441ce917d72df81dce8de6a235e6b |
| assets/characters/C02_Velthia/C02_EXPRESSION_VULNERABLE.png | new_redrawn_expression | DRAFT | [559, 604] | 125206 | 5613674bf1c62c8dfa57f34314c18e4cc716a3887c3f4462e70ff93fb5a2af99 |
| assets/characters/C02_Velthia/C02_EXPRESSION_WORRIED.png | new_redrawn_expression | DRAFT | [535, 621] | 122814 | 571c58c865545efdc2efaa798b93add035ce2872db228ff9eecdd8a6649f217e |
| assets/characters/C02_Velthia/C02_TURNAROUND_BACK.png | new_redrawn_turnaround | DRAFT | [415, 1015] | 158827 | 58af26dc327d8760277fa0b785d8094a6910021110c74fac77eb57488b155b7c |
| assets/characters/C02_Velthia/C02_TURNAROUND_FRONT.png | new_redrawn_turnaround | DRAFT | [431, 1020] | 163658 | e0e44600fa5e12469aae44dfd8ab5f841608b27e8449fd6a3aa991ed763f9538 |
| assets/characters/C02_Velthia/C02_TURNAROUND_SIDE.png | new_redrawn_turnaround | DRAFT | [370, 1017] | 193935 | 5449c09277203d773892c85ddc018dfc070847420661079b477eac51e8e3c437 |
| assets/characters/C03_Torvan/C03_BATTLE_ATLAS_DRAFT.json | pixel atlas metadata | NEEDS_REVIEW | [256, 64] | None | 9cfc5ea3b263be634c46181d4ca4bcb46ccf88983cbf1a1517dd62ee19e4f1a4 |
| assets/characters/C03_Torvan/C03_BATTLE_ATLAS_DRAFT.png | grid-authored pixel atlas | NEEDS_REVIEW | [256, 64] | 11254 | 4b4c44ce4a32f3f67c8dabfa1d1cd28cbff46d510fd65bcf0856921e562553b7 |
| assets/characters/C03_Torvan/C03_EXPLORATION_ATLAS_DRAFT.json | pixel atlas metadata | NEEDS_REVIEW | [192, 192] | None | 097424a1eff5ebc7796304b12a2c5e9faea51b21402f990c5f1e019a699a5d4e |
| assets/characters/C03_Torvan/C03_EXPLORATION_ATLAS_DRAFT.png | grid-authored pixel atlas | NEEDS_REVIEW | [192, 192] | 19076 | e4b4e352987648046ae710e8e1b0c8072fb321d3bfed840b4c3dbe455bd60c61 |
| assets/characters/C03_Torvan/C03_EXPRESSION_CURIOUS.png | new_redrawn_expression | DRAFT | [499, 587] | 100522 | 74fe901e4c352eb3f81dc51800a39fcdeadd0cc7b17686d749348d640aedbc54 |
| assets/characters/C03_Torvan/C03_EXPRESSION_DETERMINED.png | new_redrawn_expression | DRAFT | [507, 585] | 96484 | e5ded05b768162c15a6fb0f781ded7d6ef03f515a6fde19137e3f52d1f0ce8b0 |
| assets/characters/C03_Torvan/C03_EXPRESSION_MISCHIEVOUS.png | new_redrawn_expression | DRAFT | [523, 599] | 111319 | fb12b1406bd51023f173cf31d86c1374ed46a7922f5451608c6f9476dcf17d4e |
| assets/characters/C03_Torvan/C03_EXPRESSION_NEUTRAL.png | new_redrawn_expression | DRAFT | [475, 587] | 90066 | 4dee7ad923508e822f7c30c314987490c19df44b3a89631a5e55096fbee1b385 |
| assets/characters/C03_Torvan/C03_EXPRESSION_SAD.png | new_redrawn_expression | DRAFT | [492, 581] | 93683 | 050a98f44f11db35ca8d4e107eee22c2b4a1ec860665e5acfde9e51edcc97b12 |
| assets/characters/C03_Torvan/C03_EXPRESSION_SOLEMN.png | new_redrawn_expression | DRAFT | [537, 589] | 120921 | 6189b435b467ea553a2253a761f285ceed57c4a73c215f0ad846e2f285a2785b |
| assets/characters/C03_Torvan/C03_EXPRESSION_SURPRISED.png | new_redrawn_expression | DRAFT | [509, 599] | 95340 | ce902c746b2387add9d37585c267638379d8ac82a168d1403d4cf8424e9cbbf3 |
| assets/characters/C03_Torvan/C03_EXPRESSION_UPSET.png | new_redrawn_expression | DRAFT | [514, 585] | 94652 | b0091c83600d7b4437b0878e1f0e845a9694171c3ade18422aca22407e2d4e0f |
| assets/characters/C03_Torvan/C03_TURNAROUND_BACK.png | new_redrawn_turnaround | DRAFT | [321, 996] | 114127 | 027a430498a886f59ade03568f2a64cd53e5bbf6275f5f7b0322bd15f8da2ecb |
| assets/characters/C03_Torvan/C03_TURNAROUND_FRONT.png | new_redrawn_turnaround | DRAFT | [330, 996] | 120086 | 243735a6ea25ab5bd85358d4ec667e15216bcfa59869fe4aca6bc497124f5806 |
| assets/characters/C03_Torvan/C03_TURNAROUND_SIDE.png | new_redrawn_turnaround | DRAFT | [232, 992] | 85591 | 658920c143f4a0ebdf0dfc3d1a0ad3baa78a1c5261a10847f8ff234d5e0e805f |
| assets/characters/C03_Torvan/C03_WEAPON_TWIG_STAFF.png | new_weapon_concept | DRAFT | [412, 1721] | 530655 | f453dffdd83f2c37324385f6ee6e0f4ab95493c35bb0a3bd831897e8b966a75c |
| assets/characters/C04_Varlgrim/C04_BATTLE_ATLAS_DRAFT.json | pixel atlas metadata | NEEDS_REVIEW | [256, 64] | None | f644b7a63d967d9c12e19dfe58ab48426de1d5bda4520234fd66ff2e0e5e3542 |
| assets/characters/C04_Varlgrim/C04_BATTLE_ATLAS_DRAFT.png | grid-authored pixel atlas | NEEDS_REVIEW | [256, 64] | 10718 | dc148e0e53ae50c9c9ed27d9e5e614b736665a55f682784b81cc42e1c71a52ee |
| assets/characters/C04_Varlgrim/C04_EXPLORATION_ATLAS_DRAFT.json | pixel atlas metadata | NEEDS_REVIEW | [192, 192] | None | 852a95650b7f7c6677c8c6f13f6bad540a7355ee3305e7029afe7bd01da06ef7 |
| assets/characters/C04_Varlgrim/C04_EXPLORATION_ATLAS_DRAFT.png | grid-authored pixel atlas | NEEDS_REVIEW | [192, 192] | 18428 | 1fec06b8752e533c82533b561ab7110d1add9d8ed69775b4e6a6b1ed0ddf9333 |
| assets/characters/C04_Varlgrim/C04_EXPRESSION_ANGRY.png | new_redrawn_expression | DRAFT | [599, 594] | 114866 | 456d64672b8388db53eadfea8446ef326d1adb89cc4720860d538b7b5c1169e7 |
| assets/characters/C04_Varlgrim/C04_EXPRESSION_DETERMINED.png | new_redrawn_expression | DRAFT | [637, 595] | 125970 | d144dd82a1845397fa5948e1d9c92f448c4f5cb44e2099fc36714ff6a6928c1a |
| assets/characters/C04_Varlgrim/C04_EXPRESSION_NEUTRAL.png | new_redrawn_expression | DRAFT | [579, 575] | 109020 | c3ab917d108a22396ca88224de73912578b423a1158af635e14717f1964d2182 |
| assets/characters/C04_Varlgrim/C04_EXPRESSION_REMORSE.png | new_redrawn_expression | DRAFT | [601, 595] | 120741 | 669def1562a9b157e0ddba3003bc2c574657b7d2e20bc52b5a477e269822fe40 |
| assets/characters/C04_Varlgrim/C04_EXPRESSION_SAD.png | new_redrawn_expression | DRAFT | [612, 574] | 126377 | f014aa2dc30cdd14b50894bb1d2f8e8b918ec3ec45c58f024dd08263ad20cad4 |
| assets/characters/C04_Varlgrim/C04_EXPRESSION_STERN.png | new_redrawn_expression | DRAFT | [584, 579] | 116431 | 4a4e1438d798e8bc238551de9ee8b9e66e1e0cfb480bbbc1c007942776e29aeb |
| assets/characters/C04_Varlgrim/C04_EXPRESSION_SURPRISED.png | new_redrawn_expression | DRAFT | [620, 593] | 121841 | 759730d8b99ff6b8871dd171a2c75bdbe1f7fef53c67703ad4a6e8199db78ae9 |
| assets/characters/C04_Varlgrim/C04_EXPRESSION_SUSPICIOUS.png | new_redrawn_expression | DRAFT | [596, 599] | 130769 | c48278cea2a852ae8f04d7f6ee25f0126d887293cf562fb9d93b7366cad38933 |
| assets/characters/C04_Varlgrim/C04_TURNAROUND_BACK.png | new_redrawn_turnaround | DRAFT | [330, 992] | 79889 | 7e599edeba26378bf568fad9a1cf007068ca516513b08b3ef782289d685f1459 |
| assets/characters/C04_Varlgrim/C04_TURNAROUND_FRONT.png | new_redrawn_turnaround | DRAFT | [330, 998] | 86456 | ac61d71615235f80fbcb181d5f8f12b619ae27aff48c4ea45b469c77709f90b1 |
| assets/characters/C04_Varlgrim/C04_TURNAROUND_SIDE.png | new_redrawn_turnaround | DRAFT | [279, 990] | 95204 | f1e9b3cce6cd279f68b7c0883e2a87a4e12e0ac0157b7e6ad0429f6ff280f485 |
| assets/characters/C04_Varlgrim/C04_WEAPON_WOODEN_STAFF.png | new_weapon_concept | DRAFT | [534, 2158] | 748675 | 04018afd9026f056ac39c83a93736cfb77b11b929e78ce6a0008ab86b65d49e5 |
| assets/characters/C05_Azie/C05_EXPLORATION_ATLAS_DRAFT.json | pixel atlas metadata | NEEDS_REVIEW | [192, 192] | None | 57c080f027fd4fe96575d13938b7c1ee9844cd0f1e19e0476bca5212ac7858b2 |
| assets/characters/C05_Azie/C05_EXPLORATION_ATLAS_DRAFT.png | grid-authored pixel atlas | NEEDS_REVIEW | [192, 192] | 18290 | cac7935a5eee8505ea3291c77b9f4ba83dd2134201a8c53b9a76043304b5f579 |
| assets/characters/C05_Azie/C05_EXPRESSION_AMUSED.png | new_redrawn_expression | DRAFT | [483, 608] | 104140 | d7be1180188ab200f7ae6a7303cf98f2ca7e764a3ae8a1038a3e046f36542dcf |
| assets/characters/C05_Azie/C05_EXPRESSION_NEUTRAL.png | new_redrawn_expression | DRAFT | [484, 607] | 104664 | 700adaa34c280a4b475779f854bfeeaeaa0d233cb736c0a0fd07a5efc6edd88b |
| assets/characters/C05_Azie/C05_EXPRESSION_SKEPTICAL.png | new_redrawn_expression | DRAFT | [487, 610] | 109320 | 0f3e33f178866be1c22fd6fc945e3637631dbd2c811251a079f5caae2e23c0cc |
| assets/characters/C05_Azie/C05_EXPRESSION_WORRIED.png | new_redrawn_expression | DRAFT | [490, 605] | 103201 | 01a65b879525ce5348205a5718316cd3f2fdf4b557f2f646985e070b256aa2fb |
| assets/characters/C05_Azie/C05_TURNAROUND_BACK.png | new_redrawn_turnaround | DRAFT | [291, 887] | 84132 | 1facbd484e8392f1ba6adaae7c0f1b6a5825386e0edb8a3caf86bf57aa067439 |
| assets/characters/C05_Azie/C05_TURNAROUND_FRONT.png | new_redrawn_turnaround | DRAFT | [299, 887] | 86524 | ca05accbbd81a914f1b0085c22c662b1d03ecfb34dbb20ecd86d5f116b7341be |
| assets/characters/C05_Azie/C05_TURNAROUND_SIDE.png | new_redrawn_turnaround | DRAFT | [232, 887] | 76509 | fd8e5f124fd055a6485af42eac5b8a518f0d0e7013759269db33db8f8bf1eb0b |
| assets/characters/C06_Talric/C06_EXPLORATION_ATLAS_DRAFT.json | pixel atlas metadata | NEEDS_REVIEW | [192, 192] | None | 8a0cbbde750fc57e988589f5d1581c3768049bf3843eb852f825fb5d4859c181 |
| assets/characters/C06_Talric/C06_EXPLORATION_ATLAS_DRAFT.png | grid-authored pixel atlas | NEEDS_REVIEW | [192, 192] | 19052 | 2e396139419b1f5f90d30015fb4d50a06e2cc7a003dc1fd34bc281138a81db20 |
| assets/characters/C06_Talric/C06_EXPRESSION_ALARMED.png | new_redrawn_expression | DRAFT | [550, 603] | 114445 | 53c4c750736978ee1517ce3169a370105d26cfc9e0c1567d503227b9120885d6 |
| assets/characters/C06_Talric/C06_EXPRESSION_NEUTRAL.png | new_redrawn_expression | DRAFT | [550, 589] | 115731 | 547a34a8728cb92596b7a766095f8baff93b6e584c27475d9be41a05e868d6e1 |
| assets/characters/C06_Talric/C06_EXPRESSION_RELIEVED.png | new_redrawn_expression | DRAFT | [556, 605] | 115972 | d725fa38924a8b4da8f63d0a384e683f7f01a6dbca4dbd5ac890348102738f16 |
| assets/characters/C06_Talric/C06_EXPRESSION_SUSPICIOUS.png | new_redrawn_expression | DRAFT | [548, 589] | 111979 | 79fda4283aca33bcabea39a0caa47246232ed1456534bb5328f3a1c35a84aa32 |
| assets/characters/C06_Talric/C06_TURNAROUND_BACK.png | new_redrawn_turnaround | DRAFT | [350, 885] | 108408 | b64bf4e2b853a1d75de9d17b26d06c4a69163e3d92eb4b204b49febeea090fa3 |
| assets/characters/C06_Talric/C06_TURNAROUND_FRONT.png | new_redrawn_turnaround | DRAFT | [427, 880] | 143882 | 1de857900f9358d39e05d0988f58c279c8af709e86e142d2b1cb055beaa49c7b |
| assets/characters/C06_Talric/C06_TURNAROUND_SIDE.png | new_redrawn_turnaround | DRAFT | [276, 880] | 99386 | c0ab94efa4e8f1b4d38168930cec0ffb0fc311790235ece3f1ae65230b4a1ca8 |
| assets/characters/C07_Zira/C07_EXPLORATION_ATLAS_DRAFT.json | pixel atlas metadata | NEEDS_REVIEW | [192, 192] | None | 1bfb1a1c536ff79f1b6548730152c78339768d00ec349e4b5cbbfe5d76bad4f0 |
| assets/characters/C07_Zira/C07_EXPLORATION_ATLAS_DRAFT.png | grid-authored pixel atlas | NEEDS_REVIEW | [192, 192] | 16292 | 4916b7b324f3a0081466818dccb8c9490e00946b7f0b727c45c76e5fb95a6fc1 |
| assets/characters/C07_Zira/C07_EXPRESSION_CAUTIOUS.png | new_redrawn_expression | DRAFT | [439, 617] | 85746 | 2d2e10d7ddda2d51bb96c4469930ff5b64e6c4178f5a1e78f6e82c0140e7b2c9 |
| assets/characters/C07_Zira/C07_EXPRESSION_HAPPY.png | new_redrawn_expression | DRAFT | [433, 609] | 81783 | 30236d1ccf39240c54c11c8a1385ba8accc5fe374197336b069a3f8ec2af5495 |
| assets/characters/C07_Zira/C07_EXPRESSION_NEUTRAL.png | new_redrawn_expression | DRAFT | [432, 609] | 81710 | 2a26fc1d258b07a0dfc2d58c14e18b044be01e1b8bf8ea8c2dba6cfd1bad0435 |
| assets/characters/C07_Zira/C07_EXPRESSION_SAD.png | new_redrawn_expression | DRAFT | [439, 616] | 84484 | f75a1684260c097ef17886ed0bb026e4faeaa37ae21c07ef2b6bc7ec1d157a90 |
| assets/characters/C07_Zira/C07_TURNAROUND_BACK.png | new_redrawn_turnaround | DRAFT | [325, 887] | 83499 | beab994fbc0d54c8192d9bcb79eedefae5e3819933b31537d45f762f59f9b6b1 |
| assets/characters/C07_Zira/C07_TURNAROUND_FRONT.png | new_redrawn_turnaround | DRAFT | [329, 887] | 84877 | 1659e90e79c4b7a3995d2b213e35af55bb1451c77639b0722966da22329499b0 |
| assets/characters/C07_Zira/C07_TURNAROUND_SIDE.png | new_redrawn_turnaround | DRAFT | [266, 887] | 64764 | 8f939a2e9c50a9c26ce8a1b97489f44ac18079215ca57831c2f5eeeb9eee81c6 |
| assets/characters/C08_Nambo/C08_EXPLORATION_ATLAS_DRAFT.json | pixel atlas metadata | NEEDS_REVIEW | [192, 192] | None | ad814975a814cde7293ffa5c19325e56e72cedda7b8d1c1607811e7119728044 |
| assets/characters/C08_Nambo/C08_EXPLORATION_ATLAS_DRAFT.png | grid-authored pixel atlas | NEEDS_REVIEW | [192, 192] | 19076 | a56bc9c736797a6555ebbbcd35358ff79b372fcae3d9e3d2bc8a884bab81c3f7 |
| assets/characters/C08_Nambo/C08_EXPRESSION_CONCERNED.png | new_redrawn_expression | DRAFT | [442, 620] | 95217 | 313f68afa0674c000468bac3ee64d1a81cf88ce12b1dc4e6ce0c7327b2585835 |
| assets/characters/C08_Nambo/C08_EXPRESSION_HAPPY.png | new_redrawn_expression | DRAFT | [442, 611] | 91428 | 224a92bda51396998387cd2ac3d9b15f476a5ac66d1e5adafc440c2eb22e7625 |
| assets/characters/C08_Nambo/C08_EXPRESSION_NEUTRAL.png | new_redrawn_expression | DRAFT | [443, 612] | 93580 | e99e87f6b6de72fc1973b3d6b633fbd37e3fa2a9bdbf6dac6caac58ff969d06f |
| assets/characters/C08_Nambo/C08_EXPRESSION_SURPRISED.png | new_redrawn_expression | DRAFT | [446, 622] | 90548 | b2e1daa94ac4df4d75093bc3d1a26d1f289071564d88a5f5f306dd4a95a4fcc2 |
| assets/characters/C08_Nambo/C08_TURNAROUND_BACK.png | new_redrawn_turnaround | DRAFT | [335, 996] | 129191 | fcd6ae99504284c94dccd477361bdb7a489e43b500870004182fdf0823425647 |
| assets/characters/C08_Nambo/C08_TURNAROUND_FRONT.png | new_redrawn_turnaround | DRAFT | [334, 999] | 124416 | 3eb12494557fbeaf86eac36ae1b5bfbb72020f10dad3ec435076c088d6769fdd |
| assets/characters/C08_Nambo/C08_TURNAROUND_SIDE.png | new_redrawn_turnaround | DRAFT | [213, 998] | 75770 | b776f4d8d0709ad2df4506ec9a5f1092a51c2d55e557be1e35ee1ceed0a2c39e |
| assets/characters/C09_Derrria/C09_EXPLORATION_ATLAS_DRAFT.json | pixel atlas metadata | NEEDS_REVIEW | [192, 192] | None | 3b94a53250f9359215918ed17f0976d4e55e44c8a4ed6063cc3ce2ec86909458 |
| assets/characters/C09_Derrria/C09_EXPLORATION_ATLAS_DRAFT.png | grid-authored pixel atlas | NEEDS_REVIEW | [192, 192] | 18008 | 113a28b6a8ec3f9e707e448477bf1c62097ab7914c63d1d141229eb3260e50df |
| assets/characters/C09_Derrria/C09_EXPRESSION_AMUSED.png | new_redrawn_expression | DRAFT | [429, 619] | 74755 | 85818813fd24ddb43289b92c34345c50a5b1cb15b29649ad09eed8dd2518f5fe |
| assets/characters/C09_Derrria/C09_EXPRESSION_NEUTRAL.png | new_redrawn_expression | DRAFT | [438, 620] | 73588 | 3c37653209aa4e48b0f6da4fdaf593e22f05c08fdf9b347a2e895b349278a209 |
| assets/characters/C09_Derrria/C09_EXPRESSION_SKEPTICAL.png | new_redrawn_expression | DRAFT | [425, 623] | 70047 | c8d54e4af9784ba437f19386f343b791d7a36eda21290603b092b7a24a145b9d |
| assets/characters/C09_Derrria/C09_EXPRESSION_WORRIED.png | new_redrawn_expression | DRAFT | [433, 623] | 77555 | 116aeb4677c8781b7351f7025ade67e55dbe2a5f571f09b7b5f464b96c7cbfbc |
| assets/characters/C09_Derrria/C09_TURNAROUND_BACK.png | new_redrawn_turnaround | DRAFT | [339, 997] | 124161 | d8fd205cb58cf5304927c7ccbd5157f0dea8704d435a0b571155c38f2d5b16ec |
| assets/characters/C09_Derrria/C09_TURNAROUND_FRONT.png | new_redrawn_turnaround | DRAFT | [347, 996] | 126468 | eef1030aad80c23dab4dedc64984c2fcd473edbaf12efbe40505afcad3423006 |
| assets/characters/C09_Derrria/C09_TURNAROUND_SIDE.png | new_redrawn_turnaround | DRAFT | [260, 993] | 101734 | ed4ec3b66c924f1b58d3e0ad218e143d36d8ff1b2fad0e3471279c59868d9c5d |
| assets/monsters/M01_Hollowling/M01_BATTLE_ATLAS_DRAFT.json | superseded v3.1 draft | REFERENCE | [256, 64] | None | 3b59bad9b1acc5d81513db5f65885bd9df5610430fdbf6176fcec0eccaedba5e |
| assets/monsters/M01_Hollowling/M01_BATTLE_ATLAS_DRAFT.png | superseded v3.1 draft | REFERENCE | [256, 64] | 10933 | b7b9b5bdfefd0e64ca5ff015a8e328441b11faa53733bcbdf8d73e80c5664fb5 |
| assets/monsters/M01_Hollowling/M01_NEW_CONCEPT_DRAFT.png | new individual illustrated concept | DRAFT | [1448, 1086] | 935734 | b4c7a868fbb578cb8d36297e8b486814ddbd43ae60742ff569fb26dfb28f267b |
| assets/monsters/M01_Hollowling/v3_2/M01_ATLAS_PIXEL_PASS_V3_2.json | new atlas frame metadata | NEEDS_REVIEW | [672, 96] | None | 484dbbe8a4ed838a4d77e31fbe320f4d22560538e372f32f9411e21b1e6b9b25 |
| assets/monsters/M01_Hollowling/v3_2/M01_ATLAS_PIXEL_PASS_V3_2.png | new pixel animation candidate | NEEDS_REVIEW | [672, 96] | 43466 | 84ca5128755b49546daa53f77778c310e5455ceb75ae0e580f9e3ab5bc190648 |
| assets/monsters/M01_Hollowling/v3_2/M01_PREVIEW_1X.png | new art source or QA preview | REFERENCE | [672, 96] | 43466 | 84ca5128755b49546daa53f77778c310e5455ceb75ae0e580f9e3ab5bc190648 |
| assets/monsters/M01_Hollowling/v3_2/M01_PREVIEW_4X.png | new art source or QA preview | REFERENCE | [2688, 384] | 695456 | 817459a196d16e2e9fe7d6425c1ad6ee7736dee3540010dbd3e8f08771935b05 |
| assets/monsters/M01_Hollowling/v3_2/SOURCE_SHEET_REFERENCE.png | new art source or QA preview | REFERENCE | [2172, 724] | 1175737 | f30ab638533dd05844f56b53a94a67fd43049fe487943919e2532c33d70d0131 |
| assets/monsters/M01_Hollowling/v3_3/M01_ANTICIPATION_V3_3.png | individual animation frame | NEEDS_REVIEW | [96, 96] | 6067 | ed8ed277214c71bf5725495ee526dd065888f789e312c1d2a0cffe0aba8c50c5 |
| assets/monsters/M01_Hollowling/v3_3/M01_ATLAS_PIXEL_PASS_V3_3.json | pixel atlas metadata | NEEDS_REVIEW | None | None | adb7b5b73d9a4d86639bee7305d89dfbf7fa70882868d1c5bf3e80914dfdc0a3 |
| assets/monsters/M01_Hollowling/v3_3/M01_ATLAS_PIXEL_PASS_V3_3.png | pixel animation atlas | NEEDS_REVIEW | [960, 96] | 61614 | ca1619d6bf5eec57885390811a927dbd842d281400d94583ba6fa45227d4548a |
| assets/monsters/M01_Hollowling/v3_3/M01_ATTACK_V3_3.png | individual animation frame | NEEDS_REVIEW | [96, 96] | 5850 | a9e781cd308b888db6e25689a8fc48e0614167a656709c3d94e21be516b7474a |
| assets/monsters/M01_Hollowling/v3_3/M01_DEATH_START_V3_3.png | individual animation frame | NEEDS_REVIEW | [96, 96] | 6533 | 1993201ff9e3380687cfd6193818c0366c56d0b172faf2f911319d31b509f421 |
| assets/monsters/M01_Hollowling/v3_3/M01_DEFEATED_V3_3.png | individual animation frame | NEEDS_REVIEW | [96, 96] | 6539 | 09a7aff0739b29b4edc2700ad6bad0f0b7388f0238db77499e289e36946d9393 |
| assets/monsters/M01_Hollowling/v3_3/M01_FOLLOWTHROUGH_V3_3.png | individual animation frame | NEEDS_REVIEW | [96, 96] | 7032 | 8c5e921a779568992c4631cf6e6d72034dc180503a7107093f6acb19b1d5538d |
| assets/monsters/M01_Hollowling/v3_3/M01_HIT_RECOIL_V3_3.png | individual animation frame | NEEDS_REVIEW | [96, 96] | 6296 | 1f994b5898478947ae825e24c83c14cd2e98fe74bbf4e2b7c3eb5bb4b1ce0697 |
| assets/monsters/M01_Hollowling/v3_3/M01_HIT_RECOVER_V3_3.png | individual animation frame | NEEDS_REVIEW | [96, 96] | 5594 | c3dfd127ad58ec08e487df214d3b884ee145a6efab8715616a2ce0f6ea4cae8a |
| assets/monsters/M01_Hollowling/v3_3/M01_IDLE_A_V3_3.png | individual animation frame | NEEDS_REVIEW | [96, 96] | 5914 | ab2f4c2b814b1a702f06ecd043b803276727ba418328e409cbf47489ffc3b542 |
| assets/monsters/M01_Hollowling/v3_3/M01_IDLE_B_V3_3.png | individual animation frame | NEEDS_REVIEW | [96, 96] | 6250 | e8433fe97787466b42c40afaba47248e56fca6beec4d9c8c78588afb22dfe39e |
| assets/monsters/M01_Hollowling/v3_3/M01_RECOVERY_V3_3.png | individual animation frame | NEEDS_REVIEW | [96, 96] | 5539 | 3272b5af9ba158e397688d2b4f76ec98620ca5d474a410eaf3504b55ecae3027 |
| assets/monsters/M02_Briaroot/M02_BATTLE_ATLAS_DRAFT.json | pixel atlas metadata | NEEDS_REVIEW | [256, 64] | None | 9f1a9677135135a35c429b1bc517913044251862f3a1c388344e2dc926ba8240 |
| assets/monsters/M02_Briaroot/M02_BATTLE_ATLAS_DRAFT.png | grid-authored pixel atlas | NEEDS_REVIEW | [256, 64] | 11482 | f0c03668b25587944382f9ee403189d5ec77cb46c8dcfe9ef374ac3f81e79d9a |
| assets/monsters/M02_Briaroot/M02_NEW_CONCEPT_DRAFT.png | new individual illustrated concept | DRAFT | [1285, 1224] | 840788 | ea427b9c41f6f2dc39642258a1e99d030fcc6c76382f634f342e3a9ab939131c |
| assets/monsters/M03_Wisplet/M03_BATTLE_ATLAS_DRAFT.json | pixel atlas metadata | NEEDS_REVIEW | [256, 64] | None | 22be805318cfa2fd2f91b843cbac4da94ec26ccb6a0cee58ba1d0c3abb4bcfc7 |
| assets/monsters/M03_Wisplet/M03_BATTLE_ATLAS_DRAFT.png | grid-authored pixel atlas | NEEDS_REVIEW | [256, 64] | 9381 | 076b8969e66e000d4d98a667f00066f282b8be48e7bb00364235517d38a396fe |
| assets/monsters/M03_Wisplet/M03_NEW_CONCEPT_DRAFT.png | new individual illustrated concept | DRAFT | [1219, 1290] | 980235 | 0bfc8a8aa105daf4e03f6cfdeb9a0419c0e3e213a7671572bf9032ce0b8974cb |
| assets/monsters/M04_Gravorn/M04_BATTLE_ATLAS_DRAFT.json | pixel atlas metadata | NEEDS_REVIEW | [256, 64] | None | b3f3efd16fb3ea29e78b979015e8b87c3e6ea859d3b5daee6ec39b08ded11607 |
| assets/monsters/M04_Gravorn/M04_BATTLE_ATLAS_DRAFT.png | grid-authored pixel atlas | NEEDS_REVIEW | [256, 64] | 8048 | 8df303acd9531d8cb86b46f212090b5a95ad33cff9de9094effbd7e29f0240ef |
| assets/monsters/M04_Gravorn/M04_NEW_CONCEPT_DRAFT.png | new individual illustrated concept | DRAFT | [1293, 1216] | 664749 | c377eb6287ec983fc67068356523462178fc4e4e234ad10a98200a095cf2460f |
| assets/monsters/M05_Oathguard/M05_BATTLE_ATLAS_DRAFT.json | pixel atlas metadata | NEEDS_REVIEW | [256, 64] | None | f76de733527ac6b92ac9150055b7483ffee3ed37dc3c3d8d2ac98a210e4d0624 |
| assets/monsters/M05_Oathguard/M05_BATTLE_ATLAS_DRAFT.png | grid-authored pixel atlas | NEEDS_REVIEW | [256, 64] | 10834 | 3592ee2260675dfa53c90dea304d7a007d92ffb80f8c4bb538676bc54175fbca |
| assets/monsters/M05_Oathguard/M05_NEW_CONCEPT_DRAFT.png | new individual illustrated concept | NEEDS_REVIEW | [1127, 1396] | 726048 | 9078832c08e2d8f7aae8e8e9f8e74dab3a7c8654684260f3de2b038fb2fb8042 |
| assets/monsters/M06_Riftborn/M06_BATTLE_ATLAS_DRAFT.json | pixel atlas metadata | NEEDS_REVIEW | [256, 64] | None | 03e99598de8b2957297500d9a36dbb32abf43822bd52e80e55e1362cad1f496c |
| assets/monsters/M06_Riftborn/M06_BATTLE_ATLAS_DRAFT.png | grid-authored pixel atlas | NEEDS_REVIEW | [256, 64] | 11221 | 09cec5cc68f4ab7d5f307f5ec8f409988acf0bcbac196ec25e1c264593816517 |
| assets/monsters/M06_Riftborn/M06_NEW_CONCEPT_DRAFT.png | new individual illustrated concept | DRAFT | [1312, 1199] | 940624 | 3372523ab7f869032dfff4585f326f099dcf82c5f3e9cb698022abfebcbf3e78 |
| assets/source_references/4 BOSSES(1).png | source sheet | REFERENCE | [1448, 1086] | 0 | 0a2f3d96c08b55ad835d3c3ff73e115a8181224f2a1d2d6c65d164f914b02e5f |
| assets/source_references/4 MAIN CHARACTER DESIGN AND STYLE(2).png | source sheet | REFERENCE | [1447, 1087] | 0 | ccdddf4bd38b2b8f5be5d4c90c80e3a246458efe20d6052a2caf9289bc11adb0 |
| assets/source_references/5 SUPPORTING CHARACTER DESIGN AND STYLE(1).png | source sheet | REFERENCE | [1446, 1087] | 0 | 5dff0efd25f7009c73b7144b42d40cd43b0eab504bfbf16f53c8c6f9dd75bd2b |
| assets/source_references/6 REGULAR MONSTERS CHARACTER DESIGN AND STYLE(1).png | source sheet | REFERENCE | [1446, 1088] | 0 | 21bb285334107db0993e6bf2cfd3e88b0b542baf47f4282c5ac4d3c2b066ff5d |
| assets/source_references/B01_Mournfang/B01_CONCEPT_PANEL_REFERENCE.png | v3 crop reference | REFERENCE | [725, 435] | 0 | 8fcff967f72ed6ae1cb2b7bb8d16b5f1a456c602cb215f96be96f42179759287 |
| assets/source_references/B01_Mournfang/B01_ILLUSTRATION_CROP_REFERENCE.png | v3 crop reference | REFERENCE | [399, 340] | 0 | 108f86fc98b0480fb4250670d5acf583265bea21273776076a0f6ee606904e88 |
| assets/source_references/B01_Mournfang/B01_PIXEL_SOURCE_REFERENCE.png | v3 crop reference | REFERENCE | [544, 96] | 0 | 1db0104595b9e517eecb65713669c582d6b4f4b09b4d1ee77263221db3c58a14 |
| assets/source_references/B02_Veyrath/B02_CONCEPT_PANEL_REFERENCE.png | v3 crop reference | REFERENCE | [724, 435] | 0 | 79f713e77b1523b2d2c0539457ef2abeeac44ecc4da775794d9a595a521ae8b0 |
| assets/source_references/B02_Veyrath/B02_ILLUSTRATION_CROP_REFERENCE.png | v3 crop reference | REFERENCE | [398, 340] | 0 | f85ffc73ffab3061d94457045be78b802816cd83e3d74473722e14d2b23e1eaf |
| assets/source_references/B02_Veyrath/B02_PIXEL_SOURCE_REFERENCE.png | v3 crop reference | REFERENCE | [543, 96] | 0 | 3a186d5d42313110a993e4d0f991d8afca9618293b82be7721a66af0ac6f7392 |
| assets/source_references/B03_Chronolith/B03_CONCEPT_PANEL_REFERENCE.png | v3 crop reference | REFERENCE | [725, 432] | 0 | 5977d820bb5e53dde1838e85d92035867a8247292e222c929e6db8ac36d8b524 |
| assets/source_references/B03_Chronolith/B03_ILLUSTRATION_CROP_REFERENCE.png | v3 crop reference | REFERENCE | [399, 338] | 0 | 14a5fc575d05e8496ed101107fd9eacc0657727bf04e77c84db14fd704f21b81 |
| assets/source_references/B03_Chronolith/B03_PIXEL_SOURCE_REFERENCE.png | v3 crop reference | REFERENCE | [544, 95] | 0 | 983ca206ff946fc3ab6666324795f9e95e28003992e275083d7bb8441287d409 |
| assets/source_references/C01_Yaric/C01_BACK_VIEW_REFERENCE.png | v3 crop reference | REFERENCE | [90, 345] | 0 | 575fd3bff962a743f3615af23b086be0a03ed01f99e59ee3885a1f7863753fc1 |
| assets/source_references/C01_Yaric/C01_CONCEPT_PANEL_REFERENCE.png | v3 crop reference | REFERENCE | [725, 432] | 0 | a4e68e14a194d93ac8f4911eeec83e829c5c073440473f7a1f603ea177131fe9 |
| assets/source_references/C01_Yaric/C01_FRONT_VIEW_REFERENCE.png | v3 crop reference | REFERENCE | [110, 345] | 0 | 67cfe00e255e4bbfc356b23c26eb1537f470a01614ea14efe770af465575bf85 |
| assets/source_references/C01_Yaric/C01_PIXEL_SOURCE_REFERENCE.png | v3 crop reference | REFERENCE | [508, 91] | 0 | fad3a7d40931e1b7b513276161b9be07aceb04c7ed8893e9f01f2949e65c4ecc |
| assets/source_references/C01_Yaric/C01_PORTRAIT_CROP_REFERENCE.png | v3 crop reference | REFERENCE | [334, 362] | 0 | ac0def6f85cd09176b488483c4b343c741e8a87f50f3151f4744254e11d6c3a5 |
| assets/source_references/C01_Yaric/C01_SIDE_VIEW_REFERENCE.png | v3 crop reference | REFERENCE | [95, 345] | 0 | 341fab98698ebd8922614e1f08df5392034bff0cdf3ed378e7e42408a2bbd748 |
| assets/source_references/C01_Yaric/C01_WEAPON_VIEW_REFERENCE.png | v3 crop reference | REFERENCE | [95, 345] | 0 | b05dcfc04e430b3b63a2fefbdc4c7f2462cf4480d398f8644069ced98dbdc589 |
| assets/source_references/C02_Velthia/C02_BACK_VIEW_REFERENCE.png | v3 crop reference | REFERENCE | [150, 340] | 0 | 89ee6e948fd8cfbac6b0f57f61f65dcca8ff8838598f1954a4afa972783de407 |
| assets/source_references/C02_Velthia/C02_CONCEPT_PANEL_REFERENCE.png | v3 crop reference | REFERENCE | [724, 432] | 0 | 391b8dbc345c6a49c1e529e42e04b791e5d1106cc1fd188aec53594833779c31 |
| assets/source_references/C02_Velthia/C02_FRONT_VIEW_REFERENCE.png | v3 crop reference | REFERENCE | [105, 340] | 0 | a9f237d55a190c3baee50f3fab09c69941c40d5ccb81756072f415bd6b9e8267 |
| assets/source_references/C02_Velthia/C02_PIXEL_SOURCE_REFERENCE.png | v3 crop reference | REFERENCE | [507, 91] | 0 | 1c17354571911bb31e129b2872e9fd894d00cecb1e29c0d13e6924cdef6488b7 |
| assets/source_references/C02_Velthia/C02_PORTRAIT_CROP_REFERENCE.png | v3 crop reference | REFERENCE | [333, 362] | 0 | 7fae7ebea23431e35c5638a03694c4273825fe3b4e5e0c4dd7ae8de5e6f40593 |
| assets/source_references/C02_Velthia/C02_SIDE_VIEW_REFERENCE.png | v3 crop reference | REFERENCE | [95, 340] | 0 | 0162720e3e067210d64e0e706d3072df52e7e8e7a1b5c3a66ea8579df6e6cc5a |
| assets/source_references/C03_Torvan/C03_BACK_VIEW_REFERENCE.png | v3 crop reference | REFERENCE | [90, 370] | 0 | 5e7739ca2100474d5dbf3e5bd34188afc35d855933e307cbaacec0082bc7f50f |
| assets/source_references/C03_Torvan/C03_CONCEPT_PANEL_REFERENCE.png | v3 crop reference | REFERENCE | [725, 422] | 0 | 2d7ec02697741598d3393d76ccf62b2b01eca0da7c04d08d9ce9e5640acea4e1 |
| assets/source_references/C03_Torvan/C03_FRONT_VIEW_REFERENCE.png | v3 crop reference | REFERENCE | [80, 370] | 0 | 24008ffcef8c600c2dbf1d247078d67897dba52bb7608b7ff21702acd398d8b6 |
| assets/source_references/C03_Torvan/C03_PIXEL_SOURCE_REFERENCE.png | v3 crop reference | REFERENCE | [508, 89] | 0 | e903e4fa6033f1e31ebbd0928f18236c081c2db3a3c277bcd3aac12974cb6c0e |
| assets/source_references/C03_Torvan/C03_PORTRAIT_CROP_REFERENCE.png | v3 crop reference | REFERENCE | [334, 353] | 0 | 3112a7871160a993c90520b4cd3b9ddfbffbf6bc87b773ca686ff05c13ae75fc |
| assets/source_references/C03_Torvan/C03_SIDE_VIEW_REFERENCE.png | v3 crop reference | REFERENCE | [80, 370] | 0 | 1db7514f459739debf7bb5234e419700e499e27cbb6cfd6da00c6252d052822f |
| assets/source_references/C03_Torvan/C03_WEAPON_VIEW_REFERENCE.png | v3 crop reference | REFERENCE | [75, 350] | 0 | 746f33c8da4d2843f7d6347b7bbe5bb8a0f2ef2b6285e922d38a28a183bff6a4 |
| assets/source_references/C04_Varlgrim/C04_BACK_VIEW_REFERENCE.png | v3 crop reference | REFERENCE | [90, 355] | 0 | 2e07111cd397772078602a9b45b926b2428c1c318899704ed81a8d4d3287b3fe |
| assets/source_references/C04_Varlgrim/C04_CONCEPT_PANEL_REFERENCE.png | v3 crop reference | REFERENCE | [724, 422] | 0 | 31f1d5c18bda93fe59f60e05427d0dc8d65346c2055364d7c9e360dfac118a6a |
| assets/source_references/C04_Varlgrim/C04_FRONT_VIEW_REFERENCE.png | v3 crop reference | REFERENCE | [120, 355] | 0 | 13454051e1bcba08e658c84b4a61c473d81f1808f815c50a7f6adbe098024ab1 |
| assets/source_references/C04_Varlgrim/C04_PIXEL_SOURCE_REFERENCE.png | v3 crop reference | REFERENCE | [507, 89] | 0 | fe14256b6631f0821ad2af1db799a38ec78b7e85ee9aeff66e85108e9a8d02e9 |
| assets/source_references/C04_Varlgrim/C04_PORTRAIT_CROP_REFERENCE.png | v3 crop reference | REFERENCE | [333, 353] | 0 | 22fe526b3d54cfa0cf3ead8750fd9b8a80960479cf894e9608e0d322e76ae90e |
| assets/source_references/C04_Varlgrim/C04_SIDE_VIEW_REFERENCE.png | v3 crop reference | REFERENCE | [100, 355] | 0 | 82fb84a8709928e360a7daf531f0ffcc39ce0b1eeb7c01dd6b9d78477811520c |
| assets/source_references/C04_Varlgrim/C04_WEAPON_VIEW_REFERENCE.png | v3 crop reference | REFERENCE | [60, 355] | 0 | 8ecadf9125b5e86135ffc0997861e7bd37a9e5f437ca9b270ea11959871c4286 |
| assets/source_references/C05_Azie/C05_BACK_VIEW_REFERENCE.png | v3 crop reference | REFERENCE | [100, 348] | 0 | d0a073ea25721a4235c0f1a6d062281f475b3a2ef4ada3e0eb9a46f61e99fb9a |
| assets/source_references/C05_Azie/C05_CONCEPT_PANEL_REFERENCE.png | v3 crop reference | REFERENCE | [724, 433] | 0 | d4909d4297babdee6160b8f807e3975a3cd3aca411e96aa6d2058c4abdfa3789 |
| assets/source_references/C05_Azie/C05_FRONT_VIEW_REFERENCE.png | v3 crop reference | REFERENCE | [105, 348] | 0 | 3e8d7948feb6fd0ade557b58c713f2d9391654a4d5c4ba020a722340e321da11 |
| assets/source_references/C05_Azie/C05_PORTRAIT_CROP_REFERENCE.png | v3 crop reference | REFERENCE | [333, 363] | 0 | 056300325a95f19a2034036ca2c2d383dc63e654163733b17c2ce9077229e51d |
| assets/source_references/C05_Azie/C05_SIDE_VIEW_REFERENCE.png | v3 crop reference | REFERENCE | [80, 348] | 0 | 2c8786caa421d49c882d25c2251ff78e1c81b4d9f46a589b8bbac95f8cd69022 |
| assets/source_references/C06_Talric/C06_BACK_VIEW_REFERENCE.png | v3 crop reference | REFERENCE | [105, 348] | 0 | 62ac944acdc8b47cb61db544365244f33d80601af1287adee045925c6e0c6176 |
| assets/source_references/C06_Talric/C06_CONCEPT_PANEL_REFERENCE.png | v3 crop reference | REFERENCE | [723, 433] | 0 | 6f4bbecabcb4877ec43f2eccbf4d88046953031fd65cd37f360e2aeff6b2a281 |
| assets/source_references/C06_Talric/C06_FRONT_VIEW_REFERENCE.png | v3 crop reference | REFERENCE | [105, 348] | 0 | a510619bca6124cc5a9ee401e2e19180abe92fab31ccf5e70d17e1cb12966411 |
| assets/source_references/C06_Talric/C06_PORTRAIT_CROP_REFERENCE.png | v3 crop reference | REFERENCE | [333, 363] | 0 | 7aed292acc3e7407dec6d5c09348af53b63218191a2299ceec75e4632bd8f0f0 |
| assets/source_references/C06_Talric/C06_SIDE_VIEW_REFERENCE.png | v3 crop reference | REFERENCE | [95, 348] | 0 | 984e91d0409e6ce44b381cd7dac60547942fb217077876810331d35b3fb935c1 |
| assets/source_references/C07_Zira/C07_BACK_VIEW_REFERENCE.png | v3 crop reference | REFERENCE | [72, 315] | 0 | 95b79713ba90339c91794c3f504da5d75ccaebacb80e7e804dc93eeb69acd362 |
| assets/source_references/C07_Zira/C07_CONCEPT_PANEL_REFERENCE.png | v3 crop reference | REFERENCE | [484, 468] | 0 | 89a2956d22667731ffcbb7f7f0efd8a2211aa04ad3578f8039b197aaf7f0c9ec |
| assets/source_references/C07_Zira/C07_FRONT_VIEW_REFERENCE.png | v3 crop reference | REFERENCE | [83, 315] | 0 | 3934f1068926dfc8e147ed0a4bb580d6de16564e90f281e95ea355c17f3d7f2f |
| assets/source_references/C07_Zira/C07_PORTRAIT_CROP_REFERENCE.png | v3 crop reference | REFERENCE | [237, 396] | 0 | 01dbc52b5ec4a8e20e9380b9c7671897d5255e981f56919dc9fb7075ec3d0abc |
| assets/source_references/C08_Nambo/C08_BACK_VIEW_REFERENCE.png | v3 crop reference | REFERENCE | [70, 315] | 0 | 426fa15a6e141937641d50c3ca01b93e998fe169703470272a02898aad47fa68 |
| assets/source_references/C08_Nambo/C08_CONCEPT_PANEL_REFERENCE.png | v3 crop reference | REFERENCE | [484, 468] | 0 | f2bee457833cb41b5da9a1e91ab6af4e8a3408292fc223eb2dc645ed8ec35d97 |
| assets/source_references/C08_Nambo/C08_FRONT_VIEW_REFERENCE.png | v3 crop reference | REFERENCE | [85, 315] | 0 | 214abc826edd1e5bcfa3132da07b06081b10964c64d787ef3a3a34b5c2fc3fb5 |
| assets/source_references/C08_Nambo/C08_PORTRAIT_CROP_REFERENCE.png | v3 crop reference | REFERENCE | [237, 396] | 0 | cf87142dca7318a654c0ce443cc3f313957db74c53dcd6a8994f0ca108d03e16 |
| assets/source_references/C09_Derrria/C09_BACK_VIEW_REFERENCE.png | v3 crop reference | REFERENCE | [72, 315] | 0 | d27661b063de87ed8c2db9963174f3de304cc58dc6aa16bf34517f0021bdc88e |
| assets/source_references/C09_Derrria/C09_CONCEPT_PANEL_REFERENCE.png | v3 crop reference | REFERENCE | [482, 468] | 0 | 0c55d9f9caee74315de92065374bff57648c5bf3c2ec9ed432c51336d85960f5 |
| assets/source_references/C09_Derrria/C09_FRONT_VIEW_REFERENCE.png | v3 crop reference | REFERENCE | [83, 315] | 0 | 9c7ee71ae5a525f54e1638a1701782d1ede12a9e29b68d0b9e5442a6f113e839 |
| assets/source_references/C09_Derrria/C09_PORTRAIT_CROP_REFERENCE.png | v3 crop reference | REFERENCE | [236, 396] | 0 | e9e884a6ff611743b9d2d02fbef1022241ccee5909d4d2594f79127eea6e2a21 |
| assets/source_references/M01_Hollowling/M01_CONCEPT_PANEL_REFERENCE.png | v3 crop reference | REFERENCE | [723, 298] | 0 | 640c19ba642d3a1ea17e6edcc1f791db75a3f90410d89ce31027527f06a0d000 |
| assets/source_references/M01_Hollowling/M01_ILLUSTRATION_CROP_REFERENCE.png | v3 crop reference | REFERENCE | [398, 225] | 0 | d69bc960e6d33c64bf998ed1328444e130e9ad09655470755fa44293cffe8471 |
| assets/source_references/M01_Hollowling/M01_PIXEL_SOURCE_REFERENCE.png | v3 crop reference | REFERENCE | [333, 98] | 0 | 246f2328603c087e6f2f689deca095aa0fa6b714a99fa220a479f6b5eb68aab5 |
| assets/source_references/M02_Briaroot/M02_CONCEPT_PANEL_REFERENCE.png | v3 crop reference | REFERENCE | [724, 298] | 0 | 5c1a2bf3d7e31709fdabc18e0efb905c206e14219e48628b491c8b0d16a31d5c |
| assets/source_references/M02_Briaroot/M02_ILLUSTRATION_CROP_REFERENCE.png | v3 crop reference | REFERENCE | [398, 225] | 0 | 19ff3606a1cd89fe4cf662e6e358f605ca28b83b69bd1dcf4f916775636a7c23 |
| assets/source_references/M02_Briaroot/M02_PIXEL_SOURCE_REFERENCE.png | v3 crop reference | REFERENCE | [333, 98] | 0 | 901ae8506ff60e48ca2f85c7ec2f4bf8acca03b2690909925258821c60b54128 |
| assets/source_references/M03_Wisplet/M03_CONCEPT_PANEL_REFERENCE.png | v3 crop reference | REFERENCE | [723, 299] | 0 | afd2c15867cf8753ab02cb9a1ef615440b5dff4b9d7f6f88325c4e49c21b2b9f |
| assets/source_references/M03_Wisplet/M03_ILLUSTRATION_CROP_REFERENCE.png | v3 crop reference | REFERENCE | [398, 226] | 0 | 773fdbfa28f6bc3dec293cf861d409d6b973a6534340ec43d9b9f5cb45b5f06b |
| assets/source_references/M03_Wisplet/M03_PIXEL_SOURCE_REFERENCE.png | v3 crop reference | REFERENCE | [333, 99] | 0 | 9b67cd697003d051e89870c6ae85e13d4bad4ea08d60e11655f22f80ac62c0a0 |
| assets/source_references/M04_Gravorn/M04_CONCEPT_PANEL_REFERENCE.png | v3 crop reference | REFERENCE | [724, 299] | 0 | c7af35bc7184f8198191d745a73a2b5aa135a884f6e6a128148eb672b2ce58ca |
| assets/source_references/M04_Gravorn/M04_ILLUSTRATION_CROP_REFERENCE.png | v3 crop reference | REFERENCE | [398, 226] | 0 | 10c2e266d8dcaf9f9d231e312b5cbfcccc3aa29bcfa47a17c7a3b5392c491043 |
| assets/source_references/M04_Gravorn/M04_PIXEL_SOURCE_REFERENCE.png | v3 crop reference | REFERENCE | [333, 99] | 0 | 3da3403612be56fa7e231ab0bbd50a5f55990190663393132fe643c4849df00c |
| assets/source_references/M05_Oathguard/M05_CONCEPT_PANEL_REFERENCE.png | v3 crop reference | REFERENCE | [723, 303] | 0 | 8a8c1e7c589263279227450dffc1ff780e890164dc122215e56b10a4552e806f |
| assets/source_references/M05_Oathguard/M05_ILLUSTRATION_CROP_REFERENCE.png | v3 crop reference | REFERENCE | [398, 230] | 0 | 3afb422c7eeaacd7845b50ad26c83032660dc664aa9d88dd65596c65916002a2 |
| assets/source_references/M05_Oathguard/M05_PIXEL_SOURCE_REFERENCE.png | v3 crop reference | REFERENCE | [333, 100] | 0 | a54454067c2e84a1d5ec6d4378b8a630f5494fa2f4eff9d6f3dc29f8bd81043e |
| assets/source_references/M06_Riftborn/M06_CONCEPT_PANEL_REFERENCE.png | v3 crop reference | REFERENCE | [724, 303] | 0 | fd133c2c26e1b9c046536bda67411f8d4c8ffe3ed460d3d202fe47c8c0454c2a |
| assets/source_references/M06_Riftborn/M06_ILLUSTRATION_CROP_REFERENCE.png | v3 crop reference | REFERENCE | [398, 230] | 0 | c76583839401ebd5e202ea94eb80b9082f178eeb5b816fbe06eeebe9d88a99ce |
| assets/source_references/M06_Riftborn/M06_PIXEL_SOURCE_REFERENCE.png | v3 crop reference | REFERENCE | [333, 100] | 0 | 163bf8ecbeebd4f8d43002adfb4366fdc196e5cb763f3ffcfb087da8cd9fa315 |
| assets/source_references/v3_3/C01_GENERATED_SOURCE_SHEET.png | generated source reference | REFERENCE | [2172, 724] | 1327498 | c44c2957839a36e6d4ae787d648e203f70b43692885bcc0094e4c0b59198f700 |
| assets/source_references/v3_3/M01_GENERATED_SOURCE_SHEET.png | generated source reference | REFERENCE | [2172, 724] | 1227110 | a10537dbfd364d72d6a5fbbdfdc64d3a883acae4d7e1e7c782cbc1d3486bf22c |
| assets/source_references/v3_3/VFX_GENERATED_SOURCE_SHEET.png | generated source reference | REFERENCE | [2172, 724] | 1411249 | bef9178d745ef760abdcc062c2c1977adc441e2b4e328aaf3cb70ebb1f7627f5 |
| assets/ui/BATTLE_STATUS_DRAFT.png | superseded v3.1 draft | REFERENCE | [960, 540] | 0 | 13f628aa481c091fd9819ee20bb9a6b6a7c47c6814070291a041cdca8576b445 |
| assets/ui/DIALOGUE_PORTRAIT_DRAFT.png | superseded v3.1 draft | REFERENCE | [960, 540] | 0 | 7553afbe11e21e0e938d4ea6a46609c604f30ec19f96a4f0b20445138c127308 |
| assets/ui/SETTINGS_DRAFT.png | superseded v3.1 draft | REFERENCE | [960, 540] | 0 | 9ba5e59f72fded057563d512d62aacea4d22f3ecee5b5e911616c0ab07d76694 |
| assets/ui/TITLE_SCREEN_DRAFT.png | superseded v3.1 draft | REFERENCE | [960, 540] | 0 | 6e5d05d5c5b2f006563abf30a4336e25de38f8382980d7c928684bbd38b84a5d |
| assets/ui/v3_2/BATTLE_V3_2_DRAFT.png | UI mockup | DRAFT | [960, 540] | 0 | 3c0614bb53ec3ee9426ad07fbd1b870d6a2978866be702c65c226cc2bcc1532a |
| assets/ui/v3_2/DIALOGUE_V3_2_DRAFT.png | UI mockup | DRAFT | [960, 540] | 0 | e617fbf4bab7284b69125f9126eba97469e432ef6ce9b5805bd51a8a5afbe684 |
| assets/ui/v3_2/INVENTORY_V3_2_DRAFT.png | UI mockup | DRAFT | [960, 540] | 0 | d3c8c5c8c8814b62339bf247dcda85fc75055a0a5af466d633f203c18601d739 |
| assets/ui/v3_2/PAUSE_V3_2_DRAFT.png | UI mockup | DRAFT | [960, 540] | 0 | 179a88310cf520b30e2bbdf906ea9c8a0f4b2048fb8ff64de000772c118d9606 |
| assets/ui/v3_2/SAVE_V3_2_DRAFT.png | UI mockup | DRAFT | [960, 540] | 0 | 3cf4ed437f9de7688bf8029cd8835ed2252bbd4b362a3d973d288e03248f3ee3 |
| assets/ui/v3_2/SETTINGS_V3_2_DRAFT.png | UI mockup | DRAFT | [960, 540] | 0 | 77bbfcb4883f47fb0b9f7b34e5377b3a559416d6e5b155e6f0fa46a5e12d2d7b |
| assets/ui/v3_2/TITLE_V3_2_DRAFT.png | UI mockup | DRAFT | [960, 540] | 0 | 2fd960e9065e3c33fbffd0e7a1a9db0aafa110185b1a1adde511e5407e0715b8 |
| assets/ui/v3_3/BATTLE_COMPOSITE_ANTICIPATION_V3_3_DRAFT.png | UI visual draft | NEEDS_REVIEW | [320, 180] | None | 5236f91488c612d5ccf3ca60e897ad6d17423b5ea021446b55e5b50e4ab71e96 |
| assets/ui/v3_3/BATTLE_COMPOSITE_CRACK_V3_3_DRAFT.png | UI visual draft | NEEDS_REVIEW | [320, 180] | None | de21429ddd77ed261305410aa4052b97e68ada1c30fbec6c94b0f1e2e3549cc2 |
| assets/ui/v3_3/BATTLE_COMPOSITE_IMPACT_V3_3_DRAFT.png | UI visual draft | NEEDS_REVIEW | [320, 180] | None | c49efa6f48a87917e5281a5b1c9bfced4e56ff91b2219a4bcf4059d342e9ca59 |
| assets/ui/v3_3/BATTLE_COMPOSITE_RISE_V3_3_DRAFT.png | UI visual draft | NEEDS_REVIEW | [320, 180] | None | 1843d77b4fee846998fda6f6e9355d77cddec9d119ddf2cec87704d3b0d18f48 |
| assets/ui/v3_3/BATTLE_COMPOSITE_SETTLE_V3_3_DRAFT.png | UI visual draft | NEEDS_REVIEW | [320, 180] | None | e84f3a6a2c547be91a7d2ccf99c5eb4479e9088b49ecc9e8557faf1b09b8df65 |
| assets/ui/v3_3/BATTLE_GROUND_SLAM_V3_3_DRAFT.png | UI visual draft | NEEDS_REVIEW | [320, 180] | None | c49efa6f48a87917e5281a5b1c9bfced4e56ff91b2219a4bcf4059d342e9ca59 |
| assets/ui/v3_3/BATTLE_TARGET_V3_3_DRAFT.png | UI visual draft | NEEDS_REVIEW | [320, 180] | None | dfe62a4fe0f820c81adb4f66c12176f4faa490197e2112b70cb03022aa37289d |
| assets/ui/v3_3/CONTROLS_V3_3_DRAFT.png | UI visual draft | NEEDS_REVIEW | [320, 180] | None | 514606537085e43f715e5529e2e3a23c3a22640b95ba5d46983eda885b9e7951 |
| assets/ui/v3_3/DIALOGUE_V3_3_DRAFT.png | UI visual draft | NEEDS_REVIEW | [320, 180] | None | e3c17ac3a76c30f892e7a3e413ee1c3b0bcaf3f77ae7b198e0046e94b7cfb821 |
| assets/ui/v3_3/INVENTORY_V3_3_DRAFT.png | UI visual draft | NEEDS_REVIEW | [320, 180] | None | 8d598162e04265db5dd3e425d232f71f1594e536ec16675996a0e5b24d1290ea |
| assets/ui/v3_3/PAUSE_V3_3_DRAFT.png | UI visual draft | NEEDS_REVIEW | [320, 180] | None | c69581cdda81ac78412d27dd51c024969cae692ecc911ce1dcc507f17812e8b4 |
| assets/ui/v3_3/SAVE_ERROR_V3_3_DRAFT.png | UI visual draft | NEEDS_REVIEW | [320, 180] | None | 094bab7fe9f898fca66103ec31785939953f6512c7cbb76e1d03c8d1277c10cf |
| assets/ui/v3_3/SAVE_LOAD_V3_3_DRAFT.png | UI visual draft | NEEDS_REVIEW | [320, 180] | None | 57132b3bca7756afb789fba10d7ffde2c3f23ec9048c6be0c18f0ab896df8084 |
| assets/ui/v3_3/SAVE_OVERWRITE_V3_3_DRAFT.png | UI visual draft | NEEDS_REVIEW | [320, 180] | None | 433cb6dd866d186c48e08cdfd2352f92bd8f4ef00fa84c3d90a033d14809d3ee |
| assets/ui/v3_3/SETTINGS_V3_3_DRAFT.png | UI visual draft | NEEDS_REVIEW | [320, 180] | None | 616655ace251adff28e7286775666825a360af4fddbadd110f695a679a8acaba |
| assets/ui/v3_3/SKILLS_V3_3_DRAFT.png | UI visual draft | NEEDS_REVIEW | [320, 180] | None | 6461b6f1efb8d7ea86efe31150ea1df7a136256b96fbf7a39aeaf06beee541b6 |
| assets/ui/v3_3/TITLE_V3_3_DRAFT.png | UI visual draft | NEEDS_REVIEW | [320, 180] | None | 46e31c9abf8a0cf163ff6320ae542a6a2b4d49d8a80bb001abc4cb7948cf01ab |
| assets/vfx/B04_METEOR/B04_METEOR_AFTERMATH_CONCEPT.png | new_vfx_concept | NEEDS_REVIEW | [529, 395] | 127731 | bbd88ad7d7db11af26188e0bbc4f2d1fdf3b88ca9d01d6d6a0aaaf9a3722de71 |
| assets/vfx/B04_METEOR/B04_METEOR_ANTICIPATION_CONCEPT.png | new_vfx_concept | NEEDS_REVIEW | [512, 381] | 125169 | 0ed9ee96f0e268164ee18533bcc57d68e700107a2fac34a9b5503594058d2c15 |
| assets/vfx/B04_METEOR/B04_METEOR_BUILD_CONCEPT.png | new_vfx_concept | NEEDS_REVIEW | [543, 575] | 169278 | 43364e7683bd8592ffa2e323ccde068cdd187c35bd22608a2f572933d7c83906 |
| assets/vfx/B04_METEOR/B04_METEOR_IMPACT_CONCEPT.png | new_vfx_concept | NEEDS_REVIEW | [543, 541] | 118496 | c77e5024bc447367be7a46171b6a5640aaf9a30a5f65827464256c6972f0e117 |
| assets/vfx/C01_GROUND_SLAM/C01_GROUND_SLAM_AFTERMATH_CONCEPT.png | new_vfx_concept | NEEDS_REVIEW | [529, 259] | 53361 | dc1b735195c836e99968f48d1964b68602daac0b7d553cb909752d4a67e2422c |
| assets/vfx/C01_GROUND_SLAM/C01_GROUND_SLAM_ANTICIPATION_CONCEPT.png | new_vfx_concept | NEEDS_REVIEW | [513, 190] | 57228 | 36ead0300fa95686c567120959b9c9536aff203b8089951b6f8bc32635c00826 |
| assets/vfx/C01_GROUND_SLAM/C01_GROUND_SLAM_BUILD_CONCEPT.png | new_vfx_concept | NEEDS_REVIEW | [543, 321] | 95978 | fa6a9313359d12fe18240c57b1648be0bb7f927cc0e5f2dde1a54a9ebaae0f00 |
| assets/vfx/C01_GROUND_SLAM/C01_GROUND_SLAM_IMPACT_CONCEPT.png | new_vfx_concept | NEEDS_REVIEW | [543, 451] | 98051 | fbe581d5486894916db2b2e56b1cf3830cb0c27c3a84cb5cf9c9fd2db2c22917 |
| assets/vfx/C01_GROUND_SLAM/v3_2/C01_GROUND_SLAM_ATLAS_PIXEL_PASS_V3_2.json | new atlas frame metadata | NEEDS_REVIEW | [768, 64] | None | a6f03aaca1f0c0e118633f96d26fad86da759a3136d6c62394e401fc8d70ff3c |
| assets/vfx/C01_GROUND_SLAM/v3_2/C01_GROUND_SLAM_ATLAS_PIXEL_PASS_V3_2.png | new pixel animation candidate | NEEDS_REVIEW | [768, 64] | 36844 | 49725740cd168f3f0e2f6ec2b9c5f91efad2c460b86318549ce5eec9bf5408a4 |
| assets/vfx/C01_GROUND_SLAM/v3_2/C01_GROUND_SLAM_PREVIEW_1X.png | new art source or QA preview | REFERENCE | [768, 64] | 36844 | 49725740cd168f3f0e2f6ec2b9c5f91efad2c460b86318549ce5eec9bf5408a4 |
| assets/vfx/C01_GROUND_SLAM/v3_2/C01_GROUND_SLAM_PREVIEW_4X.png | new art source or QA preview | REFERENCE | [3072, 256] | 589504 | e00fedb6476108ff17b6ae387af2903fc2ce16df2db2f090d12a6b31c018685e |
| assets/vfx/C01_GROUND_SLAM/v3_2/SOURCE_SHEET_REFERENCE.png | new art source or QA preview | REFERENCE | [2172, 724] | 1362626 | e820761bd5deb07ae2e8a727636817000d4d4c4c84d4e55894313c4a7206aa45 |
| assets/vfx/C01_GROUND_SLAM/v3_3/C01_GROUND_SLAM_ATLAS_PIXEL_PASS_V3_3.json | pixel atlas metadata | NEEDS_REVIEW | None | None | a268b617888cd8fd079d577ad0a950c2478863768b61cb3a2070962de21385e6 |
| assets/vfx/C01_GROUND_SLAM/v3_3/C01_GROUND_SLAM_ATLAS_PIXEL_PASS_V3_3.png | pixel animation atlas | NEEDS_REVIEW | [768, 64] | 35642 | 7ca9967dccd36610c00be51e664efe9851a9203aaf507ac3eafabaa298b67c75 |
| assets/vfx/C01_GROUND_SLAM/v3_3/C01_GROUND_SLAM_CRACK_SPREAD_V3_3.png | individual animation frame | NEEDS_REVIEW | [96, 64] | 5534 | 90a333e8e0de46197d3254a24745d6b6fd359a9e0e4e7d29d414cea43c6a5bba |
| assets/vfx/C01_GROUND_SLAM/v3_3/C01_GROUND_SLAM_FRACTURE_V3_3.png | individual animation frame | NEEDS_REVIEW | [96, 64] | 5687 | d290867e6fba7b19f5eb8f67059f6f7cbd7badf0b5943621ff9187b3578dcb42 |
| assets/vfx/C01_GROUND_SLAM/v3_3/C01_GROUND_SLAM_GROUND_SETTLES_V3_3.png | individual animation frame | NEEDS_REVIEW | [96, 64] | 4650 | a7d7b08afb36d77b38be9a34eed3f287a0053e4370fc57557497d44af2e4ac1c |
| assets/vfx/C01_GROUND_SLAM/v3_3/C01_GROUND_SLAM_SLAB_APEX_V3_3.png | individual animation frame | NEEDS_REVIEW | [96, 64] | 3768 | ab8ad01d518c7d116d85d8201073d9b0a48ed5d510010434e42b321a4da46e13 |
| assets/vfx/C01_GROUND_SLAM/v3_3/C01_GROUND_SLAM_SLAB_DESCENDS_V3_3.png | individual animation frame | NEEDS_REVIEW | [96, 64] | 4011 | ba5848ebd0c3df4bbf1eab1b2bf804ad6d99691834d68fc464fe51d499572c31 |
| assets/vfx/C01_GROUND_SLAM/v3_3/C01_GROUND_SLAM_SLAB_RISES_V3_3.png | individual animation frame | NEEDS_REVIEW | [96, 64] | 3945 | 83d0375b7d746d94546063210cce18449d328a41da90d707a93da96df3b71339 |
| assets/vfx/C01_GROUND_SLAM/v3_3/C01_GROUND_SLAM_SLAB_SEPARATES_V3_3.png | individual animation frame | NEEDS_REVIEW | [96, 64] | 4621 | 11566e7e71ce5f49d2e1cffa784d0098bc26418eb3ef2b45ee5a9198621103b0 |
| assets/vfx/C01_GROUND_SLAM/v3_3/C01_GROUND_SLAM_SLAB_STRIKES_V3_3.png | individual animation frame | NEEDS_REVIEW | [96, 64] | 3426 | c08eaacd16554a94d58248c96eff8cd4602a6c3fa6ec5f9002d4c433b771f779 |
| assets/vfx/C02_FOREST_SUMMON/C02_FOREST_SUMMON_AFTERMATH_CONCEPT.png | new_vfx_concept | NEEDS_REVIEW | [419, 379] | 80033 | 70422edb8f366ab5a5ebd98e1801a2e97555ee4ed1575e6ecf23f845fde00709 |
| assets/vfx/C02_FOREST_SUMMON/C02_FOREST_SUMMON_ANTICIPATION_CONCEPT.png | new_vfx_concept | NEEDS_REVIEW | [335, 259] | 52985 | 7c59710eb3118073fee267b32314ac83698ae8911e9f972ecc0fb0cf13ae62e2 |
| assets/vfx/C02_FOREST_SUMMON/C02_FOREST_SUMMON_BUILD_CONCEPT.png | new_vfx_concept | NEEDS_REVIEW | [434, 384] | 74568 | 5f1ec1f884c475c4666ff5a7517965d58f6409c69d9938b46d887efba14860d3 |
| assets/vfx/C02_FOREST_SUMMON/C02_FOREST_SUMMON_IMPACT_CONCEPT.png | new_vfx_concept | NEEDS_REVIEW | [510, 493] | 95597 | 9b4bb03cb05e25edc9466c68a61ea845ef36b75ea0cdb8d8ed8f5ef0ec1760d6 |
| assets/vfx/C02_HAND_MAGIC/C02_HAND_MAGIC_AFTERMATH_CONCEPT.png | new_vfx_concept | NEEDS_REVIEW | [401, 218] | 68792 | 39c030f9e20cabe19e6727211b8824b7e6bcdc53cfa8acfca9dbaff3b2ef85e9 |
| assets/vfx/C02_HAND_MAGIC/C02_HAND_MAGIC_ANTICIPATION_CONCEPT.png | new_vfx_concept | NEEDS_REVIEW | [189, 172] | 21246 | 9876add36a4e24160ad6f338966a48b22d52f96385edd8b4ce7b1f1ffe9762e4 |
| assets/vfx/C02_HAND_MAGIC/C02_HAND_MAGIC_BUILD_CONCEPT.png | new_vfx_concept | NEEDS_REVIEW | [515, 292] | 118389 | fa87d3e1cdf7ef4d97bf61accc34b556fb5d7ca9c347562d239ef5cd7bd1cf3a |
| assets/vfx/C02_HAND_MAGIC/C02_HAND_MAGIC_IMPACT_CONCEPT.png | new_vfx_concept | NEEDS_REVIEW | [517, 346] | 114093 | f3d34fd7c36225e6d4b3e6d67e0fe0da117b4a3894d956c654b8a54f702333f1 |
| assets/vfx/C02_PROTECTION_SHIELD/C02_PROTECTION_SHIELD_AFTERMATH_CONCEPT.png | new_vfx_concept | NEEDS_REVIEW | [505, 529] | 119550 | 7b593be6f3348f21fb0f7fe25e0ec7e4177b0a5fc28285c4ef164472fb59b9e1 |
| assets/vfx/C02_PROTECTION_SHIELD/C02_PROTECTION_SHIELD_ANTICIPATION_CONCEPT.png | new_vfx_concept | NEEDS_REVIEW | [450, 225] | 44519 | b7e385ae67e32e30a9b721342c004ddf1fdc38b526245d5c810a3adaebc80007 |
| assets/vfx/C02_PROTECTION_SHIELD/C02_PROTECTION_SHIELD_BUILD_CONCEPT.png | new_vfx_concept | NEEDS_REVIEW | [461, 341] | 38136 | 037a777994f592ce8ea1d8cad74adee89f34d3487f02485dc4876242b0ab25a6 |
| assets/vfx/C02_PROTECTION_SHIELD/C02_PROTECTION_SHIELD_IMPACT_CONCEPT.png | new_vfx_concept | NEEDS_REVIEW | [530, 526] | 99980 | 4626075160eb12a112f6ab37606e3d2a488b9b3ef09aa0232adbd9d0411409c2 |
| assets/vfx/C03_NATURE_SUPPORT/C03_NATURE_SUPPORT_AFTERMATH_CONCEPT.png | new_vfx_concept | NEEDS_REVIEW | [483, 422] | 5803 | e55e78f106a08772e02107b9acc24960ab6ff510d0be33f47388908f5a17e0ce |
| assets/vfx/C03_NATURE_SUPPORT/C03_NATURE_SUPPORT_ANTICIPATION_CONCEPT.png | new_vfx_concept | NEEDS_REVIEW | [473, 235] | 0 | 4e784d5f784ac43c9838207328242795fa8f256cba178b9d01d70c4074f21c07 |
| assets/vfx/C03_NATURE_SUPPORT/C03_NATURE_SUPPORT_BUILD_CONCEPT.png | new_vfx_concept | NEEDS_REVIEW | [543, 467] | 4786 | 096ba616de7bdb36521ab869ae1cca403c2fda0e20891f6965b7e72b1e34b714 |
| assets/vfx/C03_NATURE_SUPPORT/C03_NATURE_SUPPORT_IMPACT_CONCEPT.png | new_vfx_concept | NEEDS_REVIEW | [543, 585] | 16334 | a341f794a390c3795de948f2053ad19cd346baa20832c2a7712f49142a73f55c |
| assets/vfx/C04_TEMPORAL_BIND/C04_TEMPORAL_BIND_AFTERMATH_CONCEPT.png | new_vfx_concept | NEEDS_REVIEW | [380, 257] | 90968 | 9e56883dde6e46b43b03717eac1913a1f12d36f83de78c084568cfb75487eb57 |
| assets/vfx/C04_TEMPORAL_BIND/C04_TEMPORAL_BIND_ANTICIPATION_CONCEPT.png | new_vfx_concept | NEEDS_REVIEW | [459, 309] | 125004 | af918af4f75a0ecd0fc4957f03518e8da119483af14eadcdb5eab1acdef218c7 |
| assets/vfx/C04_TEMPORAL_BIND/C04_TEMPORAL_BIND_BUILD_CONCEPT.png | new_vfx_concept | NEEDS_REVIEW | [474, 339] | 110700 | 7176a84f521a42cf85f4c50f9c582e775e144362a94d81ca2d996afbd6a1a38f |
| assets/vfx/C04_TEMPORAL_BIND/C04_TEMPORAL_BIND_IMPACT_CONCEPT.png | new_vfx_concept | NEEDS_REVIEW | [502, 414] | 156829 | bbb183b7a6525309e2ca8887e831d2d624bc00fcb7342c6e12bc24e2269e8745 |

## Web import status (Phase 0, 10 November 2026)

Nol aset diimpor ke `web/public`. `web/src/game/data/assetManifest.ts` memetakan tiga atlas **v3.3** yang tetap `NEEDS_REVIEW`: `C01_YARIC_BATTLE` (1056x96, 11 frame 96x96, event frame 4), `M01_HOLLOWLING_BATTLE` (960x96, 10 frame, event frame 3), `VFX_C01_GROUND_SLAM` (768x64, 8 frame 96x64, event frame 5). Tes `web/tests/unit/assets.test.ts` memeriksa terhadap file asli: dimensi PNG, kanal alpha ada (bukan bukti kualitas transparansi), grid frame berurutan, dan event frame. Kesamaan wajah/kostum dan kualitas animasi native-size belum diverifikasi manusia. Aset v3.2 ditolak oleh `AssetRegistry`.

## Web import status (Phase 1, 10 November 2026)

Diimpor ke `web/public/assets` (semua belum final; sumber di `assets/` tidak diubah):

| Aset web | Sumber | Status | Catatan |
|---|---|---|---|
| characters/C01_explore.png (+json) | assets/characters/C01_Yaric/v3_2/C01_EXPLORATION_PIXEL_PASS_V3_2.* | NEEDS_REVIEW | Atlas eksplorasi terbaru yang ada (v3.3 tidak memiliki). 104 piksel liar pada frame kiri/kanan (y >= 44) dihapus oleh `web/scripts/prepare-assets.mjs`. |
| characters/C08_explore.png (+json) | assets/characters/C08_Nambo/C08_EXPLORATION_ATLAS_DRAFT.* | DRAFT | Salinan apa adanya; prototipe kualitas rendah, perlu sprite pengganti. |
| portraits/C01_*.png (8), C08_*.png (4) | assets/characters/C01_Yaric/C01_EXPRESSION_*.png, C08_Nambo/C08_EXPRESSION_*.png | DRAFT | Diperkecil ke tinggi 128 px (resampling kualitas tinggi bertahap); bukan pixelation. |
| environment/forest1/ground.png, props.png, props.json | dibuat kode: `web/scripts/gen-forest-art.mjs` | DRAFT dev art | Bukan aset final; tanpa aset luar. Mengganti file tidak mengubah peta/collision. |

Atlas battle v3.3 (Yaric, Hollowling, Ground Slam) tetap `imported: false`. `web/scripts/asset-qa.mjs` menghasilkan lembar kontak dan metrik per frame (bbox, tepi sel, kecocokan kiri/kanan-cermin) untuk verifikasi aset sebelum diimpor.

## Phase 7 battle atlases (Agent BA, 12 November 2026) — DRAFT / NEEDS_REVIEW

Dibuat oleh `web/scripts/battle-art/build_{c02,b03,m05}.py` (+ `bakit.py`; `python -I`, Pillow/numpy/scipy; deterministik). Sumber resmi TIDAK diubah. Metode jujur: konsep/turnaround resmi dipotong menjadi bagian boneka kertas (polygon tangan) pada resolusi tinggi, di-pose (geser/rotasi/skala rigid), dikomposit, lalu di-area-average ke grid battle dengan SATU palet tertutup per atlas (k-means tetap + outline plum #1D1625), alfa keras, tanpa blur. Bukan gambar tangan frame demi frame: setiap pose = re-pose dari gambar yang sama, perlu seniman. Lembar kontak: `docs/production/sprint3/battle-contact-sheets/{C02,B03,M05}_BATTLE_V1_contact.png`. Uji: `web/tests/unit/battle-art-phase7.test.ts`.

| Aset runtime | Sumber resmi | Frame | Status | Catatan jujur |
|---|---|---|---|---|
| `web/public/assets/battle/C02_BATTLE_V1.{png,json}` | `assets/characters/C02_Velthia/C02_TURNAROUND_SIDE.png` | 13 gambar 116x112 (+ alias `attack`=`cast`), pivot [58,108], menghadap KIRI, 27 warna | NEEDS_REVIEW | Velthia tanpa senjata/tongkat. Profil samping dicerminkan (arah cahaya sumber terbalik). Lengan bawah+tangan dipotong dan diputar; lengan atas = tabung lengan prosedural berwarna gaun; tangan diperbesar 1,2-1,3x pada pose sihir agar terbaca. Wajah profil 14 px, kecil. |
| `web/public/assets/battle/B03_BATTLE_V1.{png,json}` | `assets/bosses/B03_Chronolith/B03_NEW_CONCEPT_DRAFT.png` | 13 frame 192x140, pivot [80,136], menghadap depan, 27 warna | NEEDS_REVIEW | Busur, kepala, torso, inti, dua lengan, kaki; kaki tetap kecuali defeated. Urat/inti memakai ramp ember 4 tingkat; tell charge = busur naik + inti menyala/melebar. Urat dilebarkan agar bertahan di grid (agak berbintik). `defeated` = runtuh rendah, busur jatuh kanan (kasar). |
| `web/public/assets/battle/M05_BATTLE_V1.{png,json}` | `assets/monsters/M05_Oathguard/M05_NEW_CONCEPT_DRAFT.png` | 10 frame 160x128, pivot [84,123], menghadap kanan, 25 warna | NEEDS_REVIEW | Tombak-sabit+lengan, lengan menjangkau, helm, badan atas, badan bawah. Jatuh = rotasi kaku seluruh figur. Kaki kanan melayang ±8 px (perspektif konsep). Pose serang: tombak horizontal kasar. |

Atlas DRAFT lama (`C02/B03/M05_BATTLE_ATLAS_DRAFT.*`, blob/lingkaran 4 pose) tetap utuh di `assets/` dan tidak dimuat game.


## Phase 7 — aset kode-native tambahan (lead, 12 November 2026) — DRAFT / NEEDS_REVIEW

| Aset | Lokasi | Pembuat/skrip | Status |
|---|---|---|---|
| VFX piksel (5 atlas: combat, nature, velthia, enemy, chrono; 24 efek) | `web/public/assets/vfx/vfx_*.{png,json}` | `node web/scripts/vfx/build.mjs` (`npm run assets:vfx`) | DRAFT code-native, palet <=16 warna/atlas, alfa keras; contact sheet `docs/production/sprint3/vfx-contact-sheets/` |
| Aset krisis Aveloria (200 frame) | `web/public/assets/environment/town/town_crisis_atlas.{png,json}` | `web/scripts/gen-town-art.mjs crisis` | DRAFT code-native |
| Kuil Jejak (lantai 1280x1280 + atlas 78 frame) | `web/public/assets/environment/temple/{ground.png,props.png,props.json}` | `web/scripts/gen-temple-art.mjs` | DRAFT code-native |
| SFX asli (44 id / 53 WAV) | `web/public/assets/audio/sfx/*.wav` | `node web/scripts/sfx/generate.mjs` (`npm run assets:sfx`) | FUNCTIONAL; kualitas AUDIO-REVIEW PENDING; bukan BGM |

Atlas battle C02/B03/M05 dicatat di bagian "Phase 7 battle atlases" di atas.


## Phase 8 battle atlases (Agent BA, 13 November 2026) — DRAFT / NEEDS_REVIEW

Dibuat oleh `web/scripts/battle-art/build_{b04,m04,m06}.py` (pustaka sama `bakit.py`; `python -I`, Pillow/numpy/scipy; deterministik; tanpa jaringan). Metode identik dengan Phase 7: konsep/turnaround resmi dipotong menjadi bagian boneka kertas (polygon/warna), di-pose rigid pada resolusi tinggi, di-area-average ke grid battle, SATU palet tertutup per atlas (k-means tetap + outline plum #1D1625), alfa keras, tanpa blur; BUKAN gambar tangan frame demi frame dan BUKAN crop referensi mentah. Sumber `assets/` tidak diubah. Lembar kontak: `docs/production/sprint4/battle-contact-sheets/{B04,M04,M06}_BATTLE_V1_contact.png`. Uji: `web/tests/unit/battle-art-phase8.test.ts`.

| Aset runtime | Sumber resmi | Frame | Status | Catatan jujur |
|---|---|---|---|---|
| `web/public/assets/battle/B04_BATTLE_V1.{png,json}` (71676 B / 4027 B; sha256 `54af44417d8f...` / `47643caec576...`) | `assets/characters/C04_Varlgrim/C04_TURNAROUND_SIDE.png` + `C04_WEAPON_WOODEN_STAFF.png` | 13 frame 208x176, pivot [88,171], menghadap KANAN (menuju party; tidak dicerminkan), 30 warna | NEEDS_REVIEW | Varlgrim = id aktor `C04`. Standar 10 + `plant`, `raise`, `cast`. Tongkat kayu berpilin dari gambar tongkat resmi (pita merah + liontin emas ikut), bukan jam pasir. Lengan atas = tabung prosedural berwarna lengan mantel; satu kepalan saja (tangan jauh pada `cast` = salinan gelap kepalan yang sama). `defeated` = tubuh diturunkan + sepatu belakang diputar, kepala tertunduk, bertumpu pada tongkat; keterbacaan "berlutut" lemah (tungkai tertutup jubah). Wajah profil ~12 px. |
| `web/public/assets/battle/M04_BATTLE_V1.{png,json}` (75186 B / 3264 B; `e2df66395a7d...` / `593dbbde7b83...`) | `assets/monsters/M04_Gravorn/M04_NEW_CONCEPT_DRAFT.png` | 11 frame 176x136, pivot [88,131], depan condong kanan, 25 warna | NEEDS_REVIEW | Standar 9 + `guard` (kedua lengan batu di depan kepala/dada). Lengan kiri/kanan, kepala, badan+bahu, kaki sebagai bagian terpisah; lubang kepala di badan diisi batu tetangga. Batu-di-atas-batu: kontras lengan vs badan rendah pada `attack`/`guard`. `defeated` = badan runtuh di antara kaki. |
| `web/public/assets/battle/M06_BATTLE_V1.{png,json}` (52475 B / 2999 B; `d7097038e676...` / `dc0115798a8f...`) | `assets/monsters/M06_Riftborn/M06_NEW_CONCEPT_DRAFT.png` | 10 frame 160x128, pivot [72,124], depan menyentak kanan, `hover_px` 6, 27 warna | NEEDS_REVIEW | "Penguji" memakai atlas yang sama. Dua lapisan (rift ungu + busur/serpihan batu, dipisah menurut warna); pose = putaran berlawanan/skala/terjang. Melayang: baris terbawah = pivot.y-6 kecuali `defeated` (di tanah). `defeated` = tumpukan serpihan jarang (~1100 px, lemah). Serpihan batu agak berbintik. |

Eksplorasi/portrait Varlgrim (turunan; sumber tidak diubah):

| Aset runtime | Sumber | Catatan |
|---|---|---|
| `web/public/assets/characters/C04_explore.{png,json}` (salinan lama, 2937 B / 4781 B; `1fec06b8752e...` / `852a95650b7f...`) | `assets/characters/C04_Varlgrim/C04_EXPLORATION_ATLAS_DRAFT.{png,json}` | byte-identik dengan sumber (`web/scripts/prepare-c04-assets.mjs`) |
| `web/public/assets/characters/normalized/C04_explore.{png,json}` (2238 B; `737303a19af1...`) | idem | `normalize-exploration-sprites.mjs` (garis kaki y=46, pivot 16/46, satu offset-x per arah) |
| `web/public/assets/characters/final/C04_explore.{png,json}` (288x192 = 9 kolom x 4 arah, 3271 B / 13157 B; `854fc493b755...` / `3cc3ee6dba5a...`) | idem | `author_cast_build.py C04` (jalur "fallback": kolom 0-5 = salinan atlas ternormalisasi, kolom 6-8 = idle turunan; `anims` berbasis data). Sprite prototipe kasar (badan sama untuk keempat arah, hanya kepala berbeda, tongkat tidak ada); perlu redraw. Manifest: id `C04_CITY_EXPLORE` (kunci spritesheet BootScene, meta `C04_CITY_EXPLORE:meta`; `${entity}_CITY_EXPLORE` bekerja). |
| `web/public/assets/portraits_hd/C04_{NEUTRAL,ANGRY,STERN,REMORSE,DETERMINED,SAD,SURPRISED,SUSPICIOUS}.png` (tinggi 352) + `C02_ANGRY.png` | `assets/characters/C04_Varlgrim/C04_EXPRESSION_*.png`, `C02_Velthia/C02_EXPRESSION_ANGRY.png` | `node web/scripts/prepare-ui-assets.mjs` (`UI_ONLY_NEW=1` = hanya yang belum ada); pipeline resize yang sama dengan portrait lain; tanpa redraw |

## Phase 8 — aset kode-native tambahan (lead, 13 November 2026) — DRAFT / NEEDS_REVIEW

| Aset | Lokasi | Pembuat/skrip | Status |
|---|---|---|---|
| Warden Fortress (lantai 1792x2432 + atlas 93 frame, palet tertutup 24 warna, tidak berbagi warna dengan Kuil Jejak) | `web/public/assets/environment/fortress/{ground.png,props.png,props.json}` | `node web/scripts/gen-fortress-art.mjs` (+ `scripts/lib/fortressSprites.mjs`) | DRAFT code-native; lembar kontak `docs/production/sprint4/fortress-contact-sheets/` |
| Aveloria sesudah menara runtuh (atlas 45 frame) | `web/public/assets/environment/town/town_c4_atlas.{png,json}` | `node web/scripts/gen-town-c4-art.mjs` | DRAFT code-native; memakai ulang `town_aveloria` dan `town_crisis` |
| VFX Bab IV (5 atlas, 23 efek: varlgrim, rift, meteor, aegis, heart) | `web/public/assets/vfx/vfx_{varlgrim,rift,meteor,aegis,heart}.{png,json}` | `node web/scripts/vfx/build.mjs` | DRAFT code-native; atlas Phase 7 byte-identik; total ≈ 11 MB GPU |
| SFX Bab IV (23 id / 33 WAV; registry kini 67 id / 86 berkas) | `web/public/assets/audio/sfx/*.wav` | `node web/scripts/sfx/generate.mjs`; analisis `node web/scripts/sfx/analyze.mjs` | FUNCTIONAL; kualitas AUDIO-REVIEW PENDING; bukan BGM |

Atlas battle B04 (Varlgrim), M04 (Gravorn), M06 (Riftborn), eksplorasi `C04_CITY_EXPLORE` dan portrait C04 dicatat di bagian "Phase 8 battle atlases" di atas (agen BA). Tidak ada BGM.
