# Phase 5 — Chapter I: Arrival at Aveloria

Tanggal: 10 November 2026. Workspace `D:\01_DEVELOPMENT\GAME\FINAL`; source `web/`.

## A. Status

**PHASE 5 PASS — fungsional / QA otomatis.** Seluruh alur Chapter I dari Title sampai penutup Aveloria dapat dimainkan dan seluruh gate kritis implementasi/QA lulus: 460 unit, 484 produksi Edge, 113 Chrome, 113 dev Edge; strict TypeScript dan build PASS. Art dan dialog kerja tetap DRAFT/NEEDS_REVIEW untuk review Game Director. Tidak ada Chapter II playable, commit, push atau deployment.

## B. Alur playable

Title → Yaric terbangun → Nambo → jalur hutan berulang/peti → Hollowling → RPG/checkpoint → Mournfang → aftermath → checkpoint **Jalan ke Aveloria** → **Masuk Aveloria** → pemandangan pertama kota → Talric di gerbang → eksplorasi jalan/plaza/pasar → arsip Azie → halaman istana → audiensi Velthia → kembali ke halaman → lonceng dua kali untuk pukul sembilan → keputusan penyelidikan → **Bab I selesai**.

Checkpoint lama di ujung hutan dipertahankan sebagai tempat menyimpan dan memilih melanjutkan ke kota; teks akhir demo diganti. Masuk Aveloria menjadi pilihan pertama. Setelah ending, pemain dapat menjelajahi Aveloria, menyimpan/memuat, membuka Settings atau kembali ke Title. Bicara lagi dengan Velthia membuka kembali penanda akhir tanpa mengulangi lonceng. Chapter tetap `I`; tidak ada tombol yang menjalankan Chapter II.

Kontrol existing: Arrow/WASD untuk berjalan, Enter/Space/E/Z untuk interaksi/konfirmasi, Esc/X untuk kembali. Khusus dialog Aveloria, Esc membuka Pause; halaman, portrait dan teks tetap tersimpan saat Settings dibuka. Kontrol dialog hutan existing dipertahankan. Tidak perlu mouse, audio, grinding atau anggota party baru untuk menyelesaikan bab.

## C. Sistem Aveloria

Satu peta kingdom linear **1280×1408**, bukan open world atau kerajaan tambahan. Area: gerbang selatan dan jalan pendekatan, jalan batu utama, plaza dengan sumur, dua kios pasar, arsip/laporan di timur, halaman istana, menara lonceng tunggal dan ruang pertemuan dengan meja kerja serta rak. Rumah, meja, kios, sumur, tembok dan rak memiliki collision. Gerbang tertutup sampai dialog Talric selesai; pintu audiensi tertutup sampai pemeriksaan Azie selesai.

`world/aveloria.ts` menyimpan geometri dan menggambar lingkungan DRAFT melalui Phaser Graphics. Collision memakai `CollisionMap`, `footBox`, `moveWithCollision` dan `findInteractable` existing, terpisah dari renderer. `WorldScene` tetap satu penghubung area hutan/kota, memakai kamera follow dan bounds existing. Tidak ada random encounter atau jalur menuju Chapter II di kota.

Warna plaster/batu, atap slate, jalan, kios, keranjang, peti, dua laporan berbeda dan meja pemerintahan memberi fungsi lokasi. Tidak ada ornamen emas atau jam berulang. Identitas UI Deep Plum `#3B2A4A` dan Bitter Lime `#C7D96A` dipertahankan; tidak ada penulisan ulang menu RPG, Pause atau Settings.

**ASSUMPTION / DRAFT:** koordinat/layout kingdom, ukuran bangunan, penempatan meja dan stok awal kios belum merupakan keputusan layout final Game Director. Data geometri, renderer dan import atlas terpisah untuk penggantian art.

## D. Karakter, warga dan toko

| Tokoh | Implementasi Chapter I |
|---|---|
| Yaric C01 | Sprite eksplorasi v3.2 existing, portrait ekspresi existing; solo, bukan battle kit baru |
| Talric C06 | Memeriksa kedatangan karena laporan kehilangan ingatan; membuka gerbang sesudah dialog, hadir pada laporan/audiensi/penyelidikan |
| Azie C05 | Membandingkan laporan dan tafsir The Fate yang belum terbukti; membatasi kesimpulan pada informasi yang tersedia |
| Velthia C02 | Memilih mendengar Yaric, humor kecil dan pengamatan tangan pada pedang; memerintahkan penyelidikan setelah lonceng. Tidak masuk party |
| Derrria C09 | Pedagang pertama pada pasar, greeting pendek DRAFT_IMPL; membuka Shop Phase 3 dengan stok persistent |
| Empat warga tanpa nama | Pembawa peti, penjual sayur, penyapu jalan dan penjaga; dialog singkat sesuai kegiatan, berubah setelah lonceng. Tidak diberi identitas canon baru |

Atlas C02/C05/C06/C09 asli disalin **byte-identical**, termasuk JSON; 192×192, sel 32×48, empat arah × enam frame, pivot kaki `[16,46]`. Renderer memakai variasi idle yang tersedia dan arah hadap; **bukan animasi karakter final**. Source berupa prototipe sangat sederhana, khususnya detail wajah, pakaian dan gerak. Tidak ada wajah/kostum baru atau battle kit untuk NPC. Warga tanpa nama adalah bentuk pixel DRAFT yang digambar kode, bukan hasil mengganti identitas karakter bernama.

Toko memakai pure `trade` existing melalui `tradeWithDerrria`. **ASSUMPTION stok awal:** 5 Potion dan 1 Baju Jalan; harga item existing (Potion beli 12/jual 6). Pembelian/penjualan mengubah emas, shared inventory dan stok dalam satu snapshot tervalidasi. Tidak ada restock otomatis saat membuka ulang/reload. Barang terpakai, bound/key, saldo/stock/capacity tetap mengikuti aturan Phase 3. Tidak ada reward atau EXP dari alur kota. Side quest optional ditunda; bukan fitur yang dianggap selesai.

## E. Dialog dan penyutradaraan

Chapter I dari Word approved `docs/source/CERITA_APPROVED_REVISI_02.docx` diperiksa langsung dan dibandingkan dengan transkrip. Kejadian canon dipertahankan. Naskah dialog kerja **bukan** approval final: seluruh **43 baris C1-06..09** dari `DIALOGUE_EVENTS.json` disimpan terpisah dalam `dialogue/aveloria.lines.json`, verbatim dengan ID, speaker, pause dan path ekspresi. Hanya Chapter I masuk bundle; tidak mengimpor JSON seluruh cerita atau lore spoiler ke runtime.

Talric memakai NEUTRAL/SUSPICIOUS; Azie NEUTRAL/WORRIED; Velthia STERN/AMUSED/WORRIED, Yaric antara lain EMBARRASSED/HAPPY/SURPRISED/CONFUSED. Portrait berasal dari PNG individual existing, diperkecil ke tinggi 128 dengan pipeline portrait existing. Pemetaan teks/ekspresi dan keberadaan PNG diuji, serta pergantian aktual direkam browser. Likeness dan emotional fit final memerlukan review manusia.

Pilihan flavor `Aku tersinggung.` / `Berarti aku istimewa?` berasal dari naskah kerja Chapter I dan memakai DialogueRunner existing. Keduanya kembali ke urutan canon; satu jawaban Velthia tambahan ditandai `DRAFT_IMPL`. Tidak ada affection meter, cinta instan atau ingatan lengkap.

Penghubung **DRAFT_IMPL**: narasi pemandangan pertama, petunjuk navigasi/tujuan, greeting Derrria, dialog warga, respons singkat saat bicara ulang, deskripsi visual kedua lonceng, rasa familiar Yaric–Velthia, tanggapan Azie dan perintah penyelidikan Velthia. Dua kalimat penjaga dan objek laporan memakai `CHAPTER_I_SCRIPT` dengan atribusi sumber. Semua penghubung dicatat pada `source` per baris. Source canon, FULL_STORY dan DIALOGUE_EVENTS tidak diubah. Rahasia Torvan, sebab sebenarnya Varlgrim, identitas modern dan akhir The Fate tidak diungkap.

Pemandangan pertama: kamera meninggalkan Yaric untuk menampilkan plaza, menahan pandangan selama teks dibaca, kemudian kembali sebelum kontrol pulih. Audiensi: komposisi empat tokoh, arah hadap, variasi idle sumber dan Yaric menoleh saat membalas pengamatan Velthia. Lonceng: suasana menjadi senja/malam, kamera mengarah ke menara, bell sprite bergoyang dua kali, jarum tetap pada jam sama, dua pesan terpisah menyebut pukul sembilan. Warga menghentikan kegiatan dan penjaga bereaksi. BGM dihentikan untuk jeda; tidak ada glitch, flash atau shake baru. Teks dan visual cukup tanpa file audio.

## F. Save/load dan state

Envelope `save_v2`, data schema **2**, key `tfbt.save.v1.{auto,slot1,slot2,slot3}` dan migrasi v1 tetap. Tidak ada field wajib baru. Extension optional `world.shops.derrria` menyimpan stok; save v2 forest lama tetap diterima tanpa mengubah snapshot. Validasi menerima hanya shop terdaftar, item dikenal/sellable dan jumlah dalam batas existing. Data malformed ditolak. Emas/inventory/stok tidak disimpan sebagai renderer state.

Flags baru: `c1.aveloria_vista` → `story.c1_gate` → `story.c1_archive` → `story.c1_velthia` → `chapter.1_complete`. Kota memerlukan kemenangan Mournfang dan aftermath selesai. Beat C1-06..09/C1-DONE diturunkan dari flags. Flags final hanya disetel setelah dialog selesai. Scene midway tidak disimpan. Refresh saat lonceng kembali ke checkpoint audiensi, lalu kedua lonceng dapat dimainkan utuh; tidak meninggalkan setengah ending atau reward ganda.

Autosave dijadwalkan setelah outcome stabil dan setelah toko kembali ke World. Manual save dan autosave tetap ditolak saat dialog/cutscene/transisi/pertarungan. Penutup bab flush pada posisi dunia yang stabil. Tiga slot diuji pada gerbang, plaza dan ending; memuat slot gerbang mengembalikan seluruh cabang lama termasuk emas/stock/flags, lalu slot akhir memulihkan cabang akhir tanpa duplikasi. NPC, arah/posisi Yaric, kondisi malam, inventory, gear dan quest objective direkonstruksi dari state. Settings tetap terpisah.

Cleanup input dialog ditambahkan pada shutdown HUD agar keluar ke Title tidak meninggalkan layer dialog. Kamera kembali follow setelah cutscene. SaveRepository, backup/checksum/future-schema protection dan rollback storage existing tidak ditulis ulang.

Perbaikan UI lintas area: scene yang di-pause masih dirender oleh Phaser. `SceneRouter.openOverlay` kini membawa overlay ke paling depan, sehingga Simpan/Muat dan Settings terlihat di atas ending, Pause dan Battle. Struktur menu tidak ditulis ulang. Diagnostic `visibleScenes` dan pemeriksaan layout kini memeriksa urutan render, termasuk scene paused, serta tes browser menegaskan overlay ending/cutscene benar-benar paling atas.

## G. QA aktual

Baseline sebelum integrasi kota benar-benar dijalankan:

| Gate | Hasil |
|---|---:|
| TypeScript strict, unit, build | PASS, **405/405** unit /15 file |
| Produksi Edge Phase 0–4 | **375/375** = 84+162+37+54+38 |
| Chrome boss | **38/38** |
| Dev Edge boss | **38/38** |

Baseline browser awal menemukan dua batas helper: membaca World setelah transisi ke Battle dan berdiri pada jarak tepi probe `slice_exit`. Helper kini menerima World null setelah prelude dan menunggu target exit dari koordinat dengan margin. Runtime Phase 4/bundle baseline tetap sama; cerita baseline diulang sampai 162/162. Log awal gagal tetap tersedia. Angka 375 adalah agregasi lima suite baseline yang semuanya lulus, bukan klaim bahwa percobaan pertama lulus.

Bukti baseline: `.dev-cache/logs/phase5-baseline-verify.log`, `phase5-baseline-e2e.log`, `phase5-baseline-story-rerun.log`, `phase5-baseline-story-final.log`, `phase5-baseline-chrome.log`, `phase5-baseline-dev.log`; JSON terpisah pada `phase5-baseline-production/`, `phase5-baseline-chrome/`, `phase5-baseline-dev/` di test-artifacts.

Implementasi awal: **460/460 unit**, strict TS/build, produksi Edge focused **65/65** pada 1366×768 dan 1920×1080. Satu percobaan dev awal terputus oleh HMR ketika source diedit; itu dicatat sebagai gagal, bukan error jaringan produksi. Setelah itu QA produksi memakai build tetap. Log `phase5-browser-initial.log` dan `phase5-production-initial.log`, evidence awal di `phase5-production-initial/`.

Percobaan dev akhir pertama: Aveloria **69/69**, boss **37/38**. Satu cek request boss menangkap `net::ERR_ABORTED` pada modul dev; semua cek gameplay boss lulus. Hasil gagal tetap ada di `phase5-dev/e2e-phase4-first-report.json` dan `phase5-dev-final.log`. Suite boss dev diulang terpisah tanpa edit runtime pada `phase5-dev-boss-rerun.log`; hasil akhirnya dimasukkan ke matriks berikut.

Percobaan produksi awal juga menemukan helper boss yang belum memakai margin interaksi exit (31/32 sebelum timeout); fixture focused diperbaiki ke x=1312 dan menunggu target nyata, sebagaimana helper perjalanan utama. Hasil gagal ada di `phase5-production-first/e2e-phase4-report.json`. Laptop kemudian dihentikan atas permintaan user; dua suite produksi yang belum selesai dilanjutkan sampai 38/38 boss dan 69/69 kota pada build sebelumnya (`phase5-production-boss-resume.log`, `phase5-production-city-resume.log`).

Review screenshot sesudah resume menemukan **bug visual nyata** yang belum tertangkap pemeriksaan state: layar ending menutupi menu Simpan/Muat yang sudah aktif. Bug urutan render diperbaiki pada SceneRouter; assertion urutan scene terlihat ditambahkan. Bukti sebelum perbaikan disimpan di `phase5-before-overlay-fix/`. Seluruh regresi produksi dan focused Chrome/dev dijalankan ulang pada build sesudah fix ini; hanya hasil sesudah fix yang menentukan status akhir.

Hasil akhir **sesudah perbaikan overlay**, semuanya pada `index-DflZfrNQ.js`:

| Gate akhir | Hasil aktual |
|---|---:|
| TypeScript strict + unit | **460/460**, 16 test files, PASS |
| Production build | PASS; game JS 166,13 kB / gzip 53,09 kB |
| Produksi Edge — UI/settings | **84/84** |
| Produksi Edge — perjalanan tanpa seed Title sampai akhir Chapter I | **196/196** |
| Produksi Edge — battle regression | **37/37** |
| Produksi Edge — RPG/save regression | **54/54** |
| Produksi Edge — focused Mournfang | **38/38** |
| Produksi Edge — focused Aveloria/ending/overlay | **75/75** |
| **Total produksi Edge** | **484/484** |
| Chrome — boss + Aveloria | **113/113** (38+75) |
| Dev Edge — boss + Aveloria | **113/113** (38+75) |

Edge **157.0.4341.46**; Chrome **157.0.8103.39**. Kedua resolusi **1366×768 dan 1920×1080** diuji. Pemeriksaan runtime/network akhir tidak menemukan fatal JavaScript/console error, asset request gagal/404 atau request audio yang belum disediakan. Render order diuji bersama keyboard/input, sehingga menu aktif yang tertutup parent tidak lagi dianggap lulus hanya berdasarkan state. Kedua pilihan flavor Velthia diuji di focused suite. Perjalanan 196 pemeriksaan dimulai dari Title dan memainkan kedua battle serta kota tanpa mengisi flags/teleport QA.

SHA-256 game bundle: `B74A8B94925961E3F2825A3A9F5F0493FCF12AB2D32623804627975B7B5D2F08`. Phaser tetap chunk existing 1.367,07 kB / gzip 357,00 kB. Tidak ada dependency baru atau source map privat dalam build.

Log final: `.dev-cache/logs/phase5-verify-overlay-final.log`, `phase5-e2e-overlay-final.log`, `phase5-chrome-overlay-final.log`, `phase5-dev-overlay-final.log`. JSON/screenshot final berada di `.dev-cache/test-artifacts/phase5-production/`, `phase5-chrome/`, `phase5-dev/`; masing-masing memiliki `matrix.json` yang memverifikasi hasil sesudah waktu build dan hash bundle. Percobaan gagal/terputus serta screenshot sebelum fix dipertahankan sebagai riwayat, bukan dihitung sebagai hasil akhir.

Screenshot runtime yang diperiksa (art tetap DRAFT):

| Adegan | Bukti |
|---|---|
| Pemandangan pertama kota | [Vista 1366](../../.dev-cache/test-artifacts/phase5-production/p5_1366_C1-06-X001.png) |
| Pemeriksaan Talric | [Talric 1366](../../.dev-cache/test-artifacts/phase5-production/p5_1366_C1-06-L003.png) |
| Plaza dan pasar | [Plaza](../../.dev-cache/test-artifacts/phase5-production/p5_1366_plaza.png), [toko nyata](../../.dev-cache/test-artifacts/phase5-production/p5_1366_shop.png) |
| Azie dan laporan | [Azie WORRIED](../../.dev-cache/test-artifacts/phase5-production/p5_1366_C1-07-L003.png) |
| Percakapan Velthia | [Velthia AMUSED](../../.dev-cache/test-artifacts/phase5-production/p5_1366_C1-08-L003.png), [reaksi Yaric 1920](../../.dev-cache/test-artifacts/phase5-production/p5_1920_C1-08-L013.png) |
| Lonceng pada jam sama | [Dentang pertama](../../.dev-cache/test-artifacts/phase5-production/p5_1920_C1-09-X001.png), [dentang kedua](../../.dev-cache/test-artifacts/phase5-production/p5_1920_C1-09-X002.png) |
| Keputusan penyelidikan | [Velthia STERN](../../.dev-cache/test-artifacts/phase5-production/p5_1920_C1-09-X008.png) |
| Penutup Chapter I | [Bab I selesai 1920](../../.dev-cache/test-artifacts/phase5-production/p5_1920_ending.png) |
| Overlay sesudah ending | [Simpan/Muat terlihat](../../.dev-cache/test-artifacts/phase5-production/p5_1920_ending_save.png), [Settings terlihat](../../.dev-cache/test-artifacts/phase5-production/p5_1920_ending_settings.png) |

Seluruh QA browser menggunakan Edge/Chrome headless terpasang melalui `playwright-core`; dependency/browser tidak diinstal ulang. Tidak mengklaim human playtest, pacing nyata, FPS/GPU/monitor nyata atau kualitas audio terdengar. Semua log/cache/artifact baru di drive D:.

## H. File dan batas perubahan

Runtime baru: city geometry/renderer (`world/aveloria.ts`, `AveloriaView.ts`), story/flags (`AveloriaStory.ts`, `aveloriaFlags.ts`), dialogue sumber Chapter I/penghubung, dan adapter persistent shop `rpg/derrria.ts`. World/Chapter1Story/ending/shop/save labels/GameState/portrait loader diperluas; UI RPG/battle dan SaveRepository existing dipertahankan. Import script khusus Aveloria, empat atlas + JSON, 14 portrait turunan dan manifest import ditambahkan. Unit/browser tests dan dokumentasi diperbarui. Daftar perubahan: **35 file baru, 33 dimodifikasi, total 68**. Status awal Git bersih; tidak ada perubahan pengguna yang ditimpa.

```text
 M ASSET_INDEX.md
 M ASSET_MANIFEST.md
 M AUDIO_COMPOSER_HANDOFF.md
 M CLAUDE.md
 M GAME_SYSTEMS.md
 M PHASES.md
 M QA_CHECKLIST.md
 M README.md
 M TASKS.md
 M docs/production/CHANGELOG.md
 M docs/production/PHASES.md
 M docs/production/SESSION_HANDOFF.md
 M docs/production/TASKS.md
 M docs/quality/QA_CHECKLIST.md
 M web/README.md
 M web/package.json
 M web/src/game/data/assetManifest.ts
 M web/src/game/data/assetPaths.ts
 M web/src/game/dialogue/types.ts
 M web/src/game/scenes/SaveLoadScene.ts
 M web/src/game/scenes/ShopScene.ts
 M web/src/game/scenes/SliceEndScene.ts
 M web/src/game/scenes/WorldScene.ts
 M web/src/game/story/Chapter1Story.ts
 M web/src/game/systems/GameState.ts
 M web/src/game/systems/SceneRouter.ts
 M web/src/main.ts
 M web/src/ui/components/DialogueBox.ts
 M web/tests/e2e/phase1.mjs
 M web/tests/e2e/phase4-helpers.mjs
 M web/tests/e2e/phase4.mjs
 M web/tests/e2e/run.mjs
 M web/tests/unit/assets.test.ts
?? docs/production/PHASE5_REPORT.md
?? web/public/assets/aveloria.generated.json
?? web/public/assets/characters/C02_explore.json
?? web/public/assets/characters/C02_explore.png
?? web/public/assets/characters/C05_explore.json
?? web/public/assets/characters/C05_explore.png
?? web/public/assets/characters/C06_explore.json
?? web/public/assets/characters/C06_explore.png
?? web/public/assets/characters/C09_explore.json
?? web/public/assets/characters/C09_explore.png
?? web/public/assets/portraits/C02_AMUSED.png
?? web/public/assets/portraits/C02_NEUTRAL.png
?? web/public/assets/portraits/C02_STERN.png
?? web/public/assets/portraits/C02_SURPRISED.png
?? web/public/assets/portraits/C02_WORRIED.png
?? web/public/assets/portraits/C05_NEUTRAL.png
?? web/public/assets/portraits/C05_SKEPTICAL.png
?? web/public/assets/portraits/C05_WORRIED.png
?? web/public/assets/portraits/C06_ALARMED.png
?? web/public/assets/portraits/C06_NEUTRAL.png
?? web/public/assets/portraits/C06_SUSPICIOUS.png
?? web/public/assets/portraits/C09_AMUSED.png
?? web/public/assets/portraits/C09_NEUTRAL.png
?? web/public/assets/portraits/C09_WORRIED.png
?? web/scripts/prepare-aveloria-assets.mjs
?? web/src/game/dialogue/aveloria.lines.json
?? web/src/game/dialogue/aveloria.ts
?? web/src/game/rpg/derrria.ts
?? web/src/game/story/AveloriaStory.ts
?? web/src/game/story/aveloriaFlags.ts
?? web/src/game/world/AveloriaView.ts
?? web/src/game/world/aveloria.ts
?? web/tests/e2e/phase5-helpers.mjs
?? web/tests/e2e/phase5.mjs
?? web/tests/unit/aveloria.test.ts
```

Tidak ada perubahan source `assets/`, approved Word/transkrip canon, FULL_STORY, root DIALOGUE_EVENTS, dependency lock, musik/SFX atau file privat. Tidak ada project baru, instalasi ulang Node/Phaser/dependency, konfigurasi npm/PATH global, commit, push maupun deploy.

## I. Preview

Dev server existing: **http://127.0.0.1:5173/**. Dari save akhir Phase 4, pergi ke ujung timur lalu pilih **Masuk Aveloria**. Dari Title, seluruh Chapter I bisa dimainkan. Preview produksi sementara hanya dipakai QA dan ditutup oleh runner.

## J. Review visual, dialog dan keterbatasan

Art kota, warga dan NPC atlas tetap **DRAFT / NEEDS_REVIEW**; rumah, sumur, kios dan ruangan masih bentuk sederhana. Source NPC jauh lebih sederhana daripada portrait/Yaric. Animasi jalan/gesture NPC belum final; perubahan posisi antar outcome sebagian memakai staging langsung. Tidak ada klaim sprite final, silhouette fidelity atau final scene direction. Source wajah/kostum dipertahankan. Art replacement berikutnya harus mengikuti desain karakter yang sudah ditetapkan.

Review fungsi: lokasi kerja/NPC mempunyai alasan (laporan, kontrol gerbang, kios/stok, peti, sapuan, penyelidikan); layout tidak menghalangi rute utama setelah syarat selesai. Preview portrait, dialog, storefront, city routing, bell messages dan ending dinilai dari screenshot runtime. Rubrik self-review provisional: identitas 2, konsistensi 1, fungsi 2, human touch 1, narasi 2, pengendalian efek 2 = **10/12**, tanpa nilai 0. Ini penilaian implementasi DRAFT, **bukan approval artistik Game Director**; detail art/kegiatan warga dan ritme adegan masih perlu review manusia.

Playtest manusia diperlukan untuk chemistry, pacing, keterbacaan pada monitor nyata, kenyamanan keyboard, balancing boss lama, fullscreen/GPU nyata dan durasi Chapter I. Tidak memanjangkan dialog demi target menit. Side quest optional dan equipment tambahan ditunda. Toko punya stok terbatas, tidak ada restock harian. Semua audio AWAITING_COMPOSER; belum ada penilaian musik/bunyi lonceng. Audio handoff menyebut kebutuhan komposer; tidak ada file suara dibuat atau diunduh.

## K. Kesiapan Chapter II

Checkpoint `chapter.1_complete`, party solo, kota aman, stok toko, inventory/RPG dan posisi siap dipakai sebagai titik awal perancangan bab berikutnya. Chapter I tetap bisa di-load dan dijelajahi. Tidak ada misi Liora, Zira, Torvan, recruitment, Veyrath, spoiler atau map Chapter II yang diimplementasikan. Bab berikutnya memerlukan instruksi user, review naskah, profil party/encounter/data dan QA baru; Phase 5 ini tidak mengotorisasikan pengerjaannya.
