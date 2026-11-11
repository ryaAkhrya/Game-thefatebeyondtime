# Polish Sprint 1 — UI/UX, Title, tipografi, identitas Yaric, sprite eksplorasi

Pengerjaan 11 November 2026. Workspace `D:\01_DEVELOPMENT\GAME\FINAL`, aplikasi `web/`. Tidak ada commit, push atau deploy. Tidak masuk Bab III, tidak ada idle animation (Sprint 2), tidak ada musik/SFX, tidak ada perubahan combat logic atau balancing.

## A. Status

**PARTIAL → PASS untuk gate otomatis dan bukti visual browser; menunggu review manusia.** Semua yang diminta Definition of Done sudah diimplementasikan dan diperiksa di browser nyata (Edge, plus Chrome untuk suite baru dan kota), tetapi penilaian akhir (selera tipografi/komposisi, kualitas siluet Title, kenyamanan pada monitor nyata) hanya bisa dilakukan manusia. Art pengganti tetap diperlukan (lihat M).

| Gate | Hasil |
|---|---|
| TypeScript strict + build produksi | PASS (`npm run verify`) |
| Unit test | **588/588**, 19 file (baseline 488, +100: `sprites.test.ts` 72, `sprint1.test.ts` 10, sisanya perluasan display/assets) |
| Produksi Edge, regresi Phase 0–6 | smoke 84/84, Title journey 197/197, Phase 2 37/37, Phase 3 54/54, Phase 4 38/38, Phase 5 75/75, Phase 6 55/55 |
| Produksi Edge, suite baru `sprint1.mjs` (1366×768 + 1920×1080) | **105/105** |
| Chrome (existing) | `sprint1.mjs` 105/105, `phase5.mjs` 75/75 |
| Baseline sebelum sprint | 488 unit; Edge produksi 539/539 (84+196+37+54+38+75+55). Log: `.dev-cache/logs/sprint1-baseline-*` |

Build akhir: `index-DdzwAqHG.js`, SHA-256 `1C1CF06D716A451DA16BAB312B60BD0289C53C93C3E06B02C499B5D46D5CB0BF`. Bukti: `.dev-cache/logs/sprint1-final-{verify,e2e,chrome2}.log`.

Catatan kejujuran: run pertama pada kode baru gagal di beberapa tempat dan semuanya ditelusuri, bukan dilonggarkan (lihat J). Satu pemeriksaan Phase 6 (`walk` ke Torvan berhenti 1 px di luar jangkauan interaksi pada frame yang lebih cepat) diperbaiki dengan menggeser titik tujuan uji ke 538 (jarak aman), bukan mengubah jangkauan interaksi game.

## B. Masalah UI yang ditemukan (dari screenshot aktual, folder `before/`)

1. **Font kasar** bukan sekadar "terlalu besar": UI digambar di grid 320×180 (kamera zoom 2 pada kanvas 640×360) memakai Press Start 2P 8 px, lalu CSS memperbesar kanvas 3× (1080p) atau **2,13×** (1366×768, skala pecahan → piksel tidak rata). Satu piksel font = 6 piksel layar; tidak ada ukuran di antara 8 dan 16 px.
2. Dunia pada 1366×768 diskalakan pecahan (2,13×): pixel art tidak rata dan bergeser saat kamera bergulir.
3. Banner tujuan permanen ("Periksa sekitar (0/2)", "Ikuti jejak jalan ke timur") dan petunjuk tombol selalu tampil.
4. Title Screen berupa placeholder: judul monospace + daftar menu + label "v0.1.0 - Phase 4" + petunjuk tombol.
5. Dialog: kotak 304 px lebar menutup sepertiga layar, 28 karakter per baris, portrait 110×128 diperbesar buram.
6. Inventaris: jendela satu layar penuh untuk dua barang; rincian berulang ("Atur barang ini di Perlengkapan", HP berulang); semua barang tampak nonaktif.
7. Battle: panel 308 px di atas dan di bawah menutup panggung; party/enemy/giliran/log dijejalkan di dua kotak; sprite 53% tinggi layar.
8. Nama "Yaric" bocor di label dialog, battle HUD, Status/Inventaris/Simpan-Muat, deskripsi barang ("Greatsword Yaric"), teks battle.
9. Sprite Yaric: kiri/kanan lebih kecil (40/36 px vs 46) dan kaki melayang 6/10 px (akar masalah: pada atlas sumber, tampak samping digambar lebih pendek dan rata-atas, bukan rata-bawah); tampak belakang mahkota rambut terpotong di sumber.
10. Bug ditemukan saat QA: `SettingsScene` memakai objek teks yang sudah hancur pada pembukaan kedua (exception di `create`); diperbaiki dan sekarang tertutup oleh `Title journey` yang membuka Pengaturan dua kali.

## C. Creative direction dan alasannya

**Modern classic JRPG — minimal, sinematik, tenang.** Prinsip: panel hanya sebesar kebutuhan isi, ruang kosong dipakai dengan sengaja, satu ornamen fungsional.

- **Palet:** Deep Plum `#3B2A4A` dan Bitter Lime `#C7D96A` tetap. Pendukung: `ink #1D1625`, `night #120D19`, `plumLift`, `plumLine`, `plumMist`, `paper #ECE3D6`, `rose #C97B84` (pasangan lime pada motif), `mp #8FB4C9` (MP; label HP/MP selalu ada), `danger #D9706F` (HP rendah/bahaya boss), `warn`. Satu tempat: `web/src/game/config/palette.ts`.
- **Motif dua garis terputus yang hampir bertemu** dipakai hemat dan berfungsi: pada Title (celah antara dua busur, dua tokoh berhadapan), di bawah judul/kepala menu (pembeda lime/mawar), dan lencana giliran battle. Tidak dipaksakan ke setiap elemen.
- **Tipografi:** Cinzel (judul, kepala menu, nama) untuk nuansa dongeng klasik; Source Sans 3 (isi, dialog, angka) untuk keterbacaan Bahasa Indonesia, angka tabular dan italik pikiran. Keduanya dari @fontsource (SIL OFL), terpasang di `web/node_modules` (D:). Font final belum ditetapkan Game Director.
- **Dialog:** panel rendah, potongan dada portrait HD "tumbuh" dari tepi atas panel, nama dalam Cinzel lime; pikiran dalam italik.
- **Menu:** daftar ringkas kiri + rincian kontekstual kanan; fokus = alas terangkat + garis lime (bukan batang lime penuh); item tak bisa dipakai redup dengan kerangka tipis bila difokus.
- **Battle:** panggung diutamakan; satu pita bawah tipis (perintah | pesan | kartu party), kartu musuh kecil di kiri atas, lencana giliran/bahaya di tengah atas, penanda segitiga di atas anggota aktif/target.

## D. Tipografi dan rendering

- **Kanvas = piksel perangkat** (`DisplayScale.computeDisplay`): Fit memenuhi viewport 16:9; Pixel Perfect = kelipatan bulat 640×360 dengan letterbox; DPR diperhitungkan (CSS 1:1 dengan piksel perangkat, termasuk 125%).
- **Dunia:** zoom kamera **bilangan bulat** (2× pada 1366×768, 3× pada 1920×1080), `roundPixels`, tanpa penskalaan pecahan. **Battle:** zoom bulat terpisah (3× / 4×).
- **UI:** ruang desain 960×540 digambar 1:1 pada resolusi perangkat (`ui/kit/ui.ts`): ukuran dibulatkan ke piksel, garis rambut 1 px, teks dirasterisasi pada ukuran perangkat (tajam di 1366×768 maupun 1920×1080). Skala teks tetap hierarki: judul 60 / display 28 / heading 17 / dialog 16 / isi 14,5 / kecil 12 / mikro 10,5 (satuan desain).
- **Relayout:** perubahan jendela/Skala Tampilan/fullscreen memancarkan `tfbt-display`; semua scene UI membangun ulang diri (diuji: resize runtime ke 1600×900 dan 1280×720).
- **Wrap dialog** diukur dengan lebar sebenarnya pada ukuran desain (identik di semua resolusi); `DialogueRunner` menerima fungsi `wrap` (typewriter dan halaman tetap).
- Portrait HD 352 px (`portraits_hd/`, 42 file) dengan filter linear; pixel art tetap nearest.

## E. Title Screen baru

Komposisi satu bidang: langit malam → kabut ungu, dua busur terputus (mawar/lime) yang "bernapas" pelan, **Yaric (kiri, jubah + greatsword tertancap)** dan **Velthia (kanan, siluet bob dan busana kerajaan)** berhadapan di antara busur, menu di celah di antara mereka. Judul "THE FATE" (Cinzel 700) dengan "BEYOND TIME" (lime) dan satu garis motif. Siluet = tampak samping turnaround resmi, diberi nada plum gelap + detail samar + cahaya tepi lime/mawar (bukan dua PNG mentah). Tidak ada nomor phase/versi/petunjuk developer dominan; petunjuk tombol kecil di pojok. Menu: Mulai Baru / Lanjut / Pengaturan / Panduan Kontrol, keyboard penuh. Gerak halus: fade-in, kedip bintang, napas celah busur (tanpa kilat).

Keterbatasan jujur: siluet berasal dari crop REFERENCE (`C01/C02_TURNAROUND_SIDE`, `C01_WEAPON_GREATSWORD`), jadi ini **DRAFT** dan bukan key art final; Velthia memakai flip dari tampak samping.

## F. Inventaris, dialog, battle, menu lain

- **Inventaris:** jendela menyesuaikan jumlah barang; daftar kiri (penanda kategori, nama, ×jumlah), rincian kanan (nama, deskripsi, statistik relevan: bonus atau HP + bar), tanpa pengulangan; perlengkapan tidak digambar seolah nonaktif. Equipment: bandingan ATK/DEF/MAG dengan warna naik/turun. Status: portrait besar + bar HP/MP/EXP dan statistik berlabel Indonesia. Jurus: status buka/terkunci + biaya.
- **Dialog:** panel rendah 3 baris, portrait HD, nama, typewriter lama, indikator lanjut, pilihan di dalam panel.
- **Battle solo/duo:** lihat C. Informasi HP/MP, status, bahaya (SAPUAN!/TUSUKAN!), giliran dan target tetap ada; perhitungan damage/balancing tidak berubah.
- **Pause** (laci kiri + lokasi/waktu), **Jurnal** (baru), **Simpan/Muat** (kartu slot + rincian), **Toko**, **Pengaturan** (baris dengan slider segmen), **Panduan Kontrol** (tutup tombol), **Akhir bab** (kartu tengah). Micro-feedback: fade 90 ms saat overlay terbuka, bobbing penanda giliran.

## G. Pengurangan instruksi

Banner tujuan dihapus dari HUD; tujuan hanya di **Jurnal** (Pause → Jurnal; juga catatan yang ditemukan, DRAFT_IMPL). Petunjuk interaksi kecil melayang di atas objek (tombol E + kata kerja). Petunjuk mekanik sekali-tampil (`systems/Hints.ts`, disimpan di `tfbt.hints.v1`, terpisah dari save): "Enter/Spasi juga dapat…" dan kontrol battle pertama. Petunjuk keamanan/boss telegraph tetap jelas. Tidak ada banner permanen; tidak ada softlock (alur cerita tidak berubah).

## H. Identity reveal Yaric

- Canon approved tidak menetapkan adegan pengenalan; hanya C2-05-L011 ("Yaric.") menunjukkan ia sudah tahu namanya saat bertemu Torvan. Revisi menandai opsi nama terukir sarung pedang (O-15) sebagai belum canon, jadi **tidak dipakai**.
- **DRAFT_IMPL:** pada batu penanda pertama Hutan 2 (C2-04), narasi: jari menyentuh goresan terdalam, sebuah suara menyebut satu kata — "…Yaric." (label "Suara") — lalu pikiran "Yaric…?" (tanpa label), flag `identity.name_known`, lalu pikiran "Itu namaku…" **dengan label "Yaric"** (pertama kali), kemudian `story.c2_forest`. Tidak menyebut Yudis, reinkarnasi atau memori Velthia.
- **Sebelum reveal:** ucapan berlabel "???", monolog tanpa label, UI memakai "???" (Status, Simpan/Muat, battle), teks battle memakai "Kau"/"-mu", deskripsi barang tidak memuat nama, Jurnal tanpa nama. ID `C01` tidak berubah.
- **Save/load:** satu flag biasa (`identity.name_known`), schema 2 tidak berubah; save Bab II lama otomatis dianggap sudah tahu nama (turunan flag `story.c2_forest/torvan/…`); save Bab I tetap anonim. Diuji unit dan browser (reload → Continue → Status "Yaric").
- Audit: unit test memeriksa seluruh dialog Bab I (C1-01..09) dan C2-01..04 pra-reveal terhadap label dan teks; E2E memeriksa label sepanjang opening dan semua menu.

## I. Sprite eksplorasi empat arah

Detail dan lembar kontak: `.dev-cache/test-artifacts/sprint1/sprites/` dan `ASSET_INDEX.md`. Akar masalah ada di atlas sumber (pada tampak samping: tinggi 40/36 px, rata-atas), bukan di transform. Hasil (salinan runtime ternormalisasi `web/public/assets/characters/normalized/`, sumber dan salinan lama tidak disentuh, skrip deterministik `scripts/normalize-exploration-sprites.mjs`):

| | Sebelum (bawah/tinggi) | Sesudah |
|---|---|---|
| Yaric down / up | y46 / 46 | y46 / 46 |
| Yaric kiri | y40 / 40 (melayang 6) | y46 / 46 |
| Yaric kanan | y36 / 36 (melayang 10) | y46 / 46 (cermin kiri) |
| C02,C05,C09 / C03,C06,C08 / C07 | kaki 45 / 47 / 45 | kaki 46 semua |

Teknik: hanya memindah/menggandakan piksel (6 baris pada kiri/kanan Yaric: leher/badan/jubah/paha), tanpa interpolasi. Origin 47/48 dipakai konsisten (juga di kota/Liora, sebelumnya 46/48 → sprite 1 px terlalu rendah), bayangan 20×6. Diverifikasi di browser pada tekstur yang benar-benar dimuat: 16 frame Yaric berakhir di baris 46 dengan tinggi seragam (suite `sprint1`).

**Belum final / perlu redraw:** `C01 back_0..3` (mahkota rambut terpotong rata di sumber), `right_*` adalah cermin kiri (shading terbalik) dan memuat 6 baris piksel dobel, semua C02/C03/C05/C06/C07/C08/C09 adalah prototipe kasar (badan sama di semua arah, tanpa animasi kaki; hanya garis kaki dikoreksi), tinggi antar-karakter 41–46 px tidak disetarakan.

## J. Hasil tes (rinci) dan temuan selama pengujian

Unit baru: `sprint1.test.ts` (identitas, jurnal, reveal, save, battle, aset UI), `sprites.test.ts` (72 invarian atlas), `display.test.ts` (zoom bulat pada 10 viewport/DPR). E2E baru `sprint1.mjs` (105 pemeriksaan × dua resolusi): kanvas = piksel perangkat dan zoom bulat, Title (tanpa teks phase), keyboard, kerahasiaan nama di dialog/HUD/Status/Inventaris/Simpan-Muat/battle, ketiadaan banner tujuan, Jurnal, layout setiap menu, battle solo/duo/Mournfang/Veyrath, reveal + save/load, empat arah Yaric pada tekstur yang dimuat, resize runtime, Pixel Perfect, tanpa error konsol/404/audio.

Temuan yang diperbaiki saat QA: label Yaric berubah by design (uji diperbarui); kamera memakai `worldView` (scroll mentah tidak lagi sama dengan tepi pandang saat zoom); geometri battle kini dalam pecahan panggung (uji koordinat 320×180 diganti uji struktural: kaki sejajar, musuh kiri/party kanan); garis tipis di scrim battle (strip bulat) diganti gradasi kanvas; exception `SettingsScene` pada pembukaan kedua; origin NPC kota 47/48; wrap dialog memakai ukur, bukan 28 karakter; helper uji Phase 5 tidak lagi mengandalkan jendela layer `world` yang singkat.

## K. Screenshot before/after

`.dev-cache/test-artifacts/sprint1/`: `before/` (24 gambar, build lama), `after/` (`s1_*`, 57 gambar, 1366 dan 1920), `compare/` (16 gambar berdampingan: title, opening dialog, dunia/banner, inventaris, pause, battle Hollowling, Aveloria, Yaric kiri/kanan/atas), `sprites/` (lembar kontak). Bukti tambahan per suite di `sprint1-final/`. Untuk review langsung: buka `after/s1_title_1920.png`, `s1_opening_dialogue`, `s1_identity_reveal`, `s1_inventory`, `s1_battle_duo`, `s1_battle_veyrath`, `s1_yaric_*`. Preview lokal: `http://127.0.0.1:5173/` (`npm run dev`).

## L. File berubah

Baru: `web/src/ui/kit/ui.ts`, `ui/components/frame.ts`, `ui/labels.ts`, `game/story/{identity,journal}.ts`, `game/dialogue/speaker.ts`, `game/systems/Hints.ts`, `game/scenes/JournalScene.ts`, `web/scripts/{prepare-ui-assets,normalize-exploration-sprites}.mjs`, `web/public/assets/{portraits_hd,title,characters/normalized}/`, `ui.generated.json`, `tests/e2e/sprint1.mjs`, `tests/unit/{sprint1,sprites}.test.ts`, laporan ini. Ditulis ulang: `TitleScene`, `HudScene`, `PauseScene`, `RpgMenuScene`, `SaveLoadScene`, `ShopScene`, `SettingsScene`, `ControlsScene`, `SliceEndScene`, `BattleScene`, `ui/components/{DialogueBox,MenuList,BattlePanel}.ts`, `DisplayScale`, `DisplayController`. Diubah: `WorldScene` (zoom, prompt, debug), `BootScene`, `createGameConfig`, `constants`, `palette`, `main.ts` (hook QA), `BattleSession` (nama anonim), `DialogueRunner` (opsi `wrap`), `Chapter2Story`/`chapter2.ts` (reveal), `assetManifest`/`assetPaths`, `AveloriaView`/`Chapter2View` (origin), `definitions` (deskripsi barang), `SceneRouter` (debug), `page.css`, `package.json` (dua font, `assets:prepare`), suite E2E lama (penyesuaian semantik). Dihapus: `PlaceholderScene` (kode mati), `ui/styles/theme.ts` (diganti kit). Dokumen: `CLAUDE.md`, `ASSET_INDEX.md`, README/TASKS/SESSION_HANDOFF.

## M. Batasan

- Tidak ada uji manusia pada monitor/GPU nyata; kualitas tipografi, komposisi, pacing tidak dinilai otomatis. Fullscreen sebenarnya tidak dapat diuji headless (relayout diuji lewat resize; DPR 1,25 diuji pada level unit).
- Siluet Title dari crop referensi; belum ada key art. Portrait HD adalah turunan, bukan redraw.
- Sprite pendukung kasar; Yaric belakang/kanan perlu redraw (I). Torvan/Zira/Veyrath/M02/M03 tetap DRAFT.
- Dialog/jurnal/reveal DRAFT_IMPL belum disetujui Game Director.
- Font final belum ditetapkan. Audio tetap AWAITING_COMPOSER.
- Petunjuk sekali-tampil memakai storage terpisah; menghapus data situs memunculkannya lagi satu kali.
- Posisi prompt interaksi, jarak serang battle (stage unit) dan komposisi Title dirancang pada 16:9; tidak ada dukungan layar sentuh/ukuran di bawah 800×450 (tetap desktop-only).

## N. Kesiapan Sprint 2

Sprite dasar kini konsisten (kaki, ukuran, origin 47/48, bayangan) sehingga idle animation dapat dibangun di atas atlas ternormalisasi; kerangka UI (kit, relayout, hook QA `frameBounds`/`sceneTexts`) siap. Prasyarat sebelum animasi: keputusan artist untuk `back_*`/`right_*` Yaric dan sprite pendukung, serta keputusan font/key art Title. Sprint 2 dan Bab III belum dimulai.
