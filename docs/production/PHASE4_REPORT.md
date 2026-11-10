# Phase 4 — Playable JRPG Vertical Slice

Tanggal: 10 November 2026. Workspace `D:\01_DEVELOPMENT\GAME\FINAL`, source `web/`.

## 1. Status dan scope

**PHASE 4 PASS — scope fungsional MVP dan QA otomatis.** Semua syarat kritis DoD playable terpenuhi: Title sampai Mournfang/penutup, RPG terintegrasi, defeat/retry, save/load sebelum/sesudah boss, regression, strict TypeScript dan build. Hasil akhir **405 unit +375 pemeriksaan produksi Edge +38 Chrome +38 dev Edge**, seluruhnya lulus. Art/balancing/pacing manusia tetap perlu review. Tidak ada Phase 5, Chapter II, implementasi Aveloria/Velthia, deployment, commit atau push.

Scope adalah **bagian pembuka Chapter I sampai Mournfang**, dilanjutkan penanda akhir demo menuju Aveloria. Tidak menyetel `chapter.1_complete`. Target pacing pemain 10–15 menit; durasi manusia belum diukur. Waktu automation dilaporkan terpisah dan tidak disamakan dengan durasi playtest manusia atau FPS GPU nyata.

## 2. Audit dan baseline aktual

Git aktif dan working tree bersih sebelum edit. Implementasi Phase 0–3, source/metadata aset, approved Cerita Revisi 02, naskah C1-05, RULES/GDD/FULL_STORY/SKILLS_AND_BOSSES/GAME_SYSTEMS/PHASES/TASKS/QA, asset registry/index, technical design dan laporan Phase 0–3 diperiksa.

Baseline yang benar-benar dijalankan ulang:

| Gate sebelum edit | Hasil |
|---|---|
| TypeScript strict + unit | **378/378**, 14 test files, PASS |
| Production build | PASS |
| Browser produksi | **84 + 136 + 37 + 54 = 311/311**, PASS |
| Focused dev Phase 3 | **54/54**, PASS |

Bukti: `.dev-cache/logs/phase4-baseline-verify.log`, `phase4-baseline-e2e.log`, `phase4-baseline-dev.log`. Warning profiling plugin Vite tidak menggagalkan baseline build (exit 0). Tidak ada instalasi ulang Node/dependency atau konfigurasi sistem/global; cache/TEMP/TMP/artifacts memakai environment proyek di D:.

## 3. Alur playable dan scene direction

Title → Mulai Baru/Lanjut → Yaric terbangun → periksa sekitar → Nambo → jalan hutan berulang → papan/semak/peti → Hollowling → EXP/level/RPG menu/save → interaksi **Lanjut** di ujung utara → tepi Hutan 1 → jejak cakar/tempat istirahat → checkpoint aman → Mournfang → aftermath → jalan ke timur → **Jalan ke Aveloria**, akhir demo bagian awal Bab I.

Peta hutan berulang dan PNG periodiknya tidak dirombak. `forest_edge` adalah sambungan linear kecil yang memakai props hutan existing dan ground yang digambar kode pada grid 8 px. Jalur berbelok, kayu tumbang, jejak cakar, clearing boss dan papan timur punya fungsi orientasi/anticipation. Collision tetap berasal dari data murni dan kaki prop; tidak berasal dari renderer. Tidak ada NPC baru. Nambo tetap berada di peta asal, tidak ikut diteleport ke arena.

`Chapter1Story` menentukan urutan aksi; `WorldScene` menjalankannya. Keempat baris C1-05, ekspresi dan pause disalin verbatim dari `DIALOGUE_EVENTS.json`: menolak berkelahi → respons singkat → setelah boss surut, melihat kesakitan → mempertanyakan hutan. Tidak ada pidato boss, penjelasan segel, atau perubahan lore. Naskah dialog kerja tetap DRAFT; approved plot tidak diubah.

Tambahan **DRAFT_IMPL** terbatas pada petunjuk checkpoint, tujuan HUD, warning mekanik dan penutup demo. Teks checkpoint tidak menambahkan identitas/lore. Papan Aveloria memakai ulang kalimat existing. Penutup menyatakan akhir demo bagian awal Bab I dan bersambung di Aveloria, bukan seluruh Chapter I selesai.

## 4. Boss mechanics dan balancing DRAFT

`encounters.ts` memisahkan konfigurasi encounter/flags/checkpoint/reward. `BattleSession` menerima encounter `hollowling` atau `mournfang`; default Hollowling tetap kompatibel. `BattleEngine` murni menentukan AI, intent, damage dan interruption. `BattlePanel` membaca intent untuk warning yang tetap terlihat ketika menu berubah; UI/effect bukan sumber gameplay.

| Mournfang | Nilai DRAFT |
|---|---:|
| HP | 224 (Hollowling 112) |
| MP | 0 |
| ATK / DEF | 18 / 10 |
| MAG / MDEF / SPD | 3 / 6 / 6 |
| Normal attack power | 1 |
| Heavy sweep power | 1.8 |
| Reward | 45 EXP +20 emas +1 Potion |

Pola deterministik **serang normal → persiapan → sapuan berat → pemulihan**, lalu ulang. Di antara setiap aksi boss ada giliran pemain penuh. Persiapan dan pemulihan tidak melukai atau memakai resource pemain. Perintah boss yang melompati intent ditolak engine.

Sapuan memakai rumus fisik existing: `max(1, floor(max(1, ATK × power − DEF × 0.5) × guard))`; guard 0.5 saat Bertahan. Pada level 2 dengan armor awal DEF 9: normal 13, sapuan 27, sapuan ditahan 13. Tanpa armor DEF 7: normal 14, sapuan 28, ditahan 14.

Header **SAPUAN! / GOYAH** tetap terlihat saat submenu berubah; pesan aksi menjelaskan sapuan berikutnya dan pilihan respons. Warning tidak menutupi sprite dan tidak bergantung pada shake, flash, warna saja atau audio. Bertahan membagi damage; Ground Slam 4 MP saat intent sapuan aktif menggagalkannya dan mengalihkan boss ke pemulihan. Ground Slam di luar charge tetap damage fisik biasa. Potion adalah item bersama Phase 3. Tidak ada phase RNG, elemental system baru, stun-lock, surprise lethal special atau grinding wajib.

Unit simulation membuktikan: level 2 tanpa Potion/passive/equipment bisa menang dengan counter; legacy level 1 dengan perlengkapan awal juga bisa menang. Mengabaikan semua warning tanpa healing dapat kalah. Ini bukti strategi deterministik, bukan persetujuan balancing manusia.

## 5. RPG, reward, checkpoint dan save/load

HP/MP battle, equipment, passive dan skills memakai snapshot Phase 3 yang sama. World/battle/shop tetap memakai satu inventory. Reward boss satu transaksi: vitals, konsumsi, `boss.mournfang`, ledger `reward.mournfang.rpg`, EXP/level, emas dan Potion. Reward baru commit setelah **Lanjutkan** pada victory; contact/recovery/result saja tidak menulis progress atau storage. Defeat/retry/abandon tidak memberi reward. Loot dibatasi kapasitas dan receipt menampilkan jumlah yang benar-benar masuk.

Dengan kemenangan Hollowling normal, boss membawa total EXP 25→70, level 2→3, emas 8→28, satu Potion tambahan, satu poin jurus baru. Growth dan pasif Phase 3 tetap berlaku; kenaikan HP/MP current hanya selisih maksimum. Tidak mengubah Ultimate atau party solo Yaric.

`restBeforeMournfang` memulihkan HP/MP maksimum efektif dan menandai checkpoint; tidak membuat Potion, emas, EXP atau equipment. Bisa diulang di kayu tumbang. Checkpoint wajib otomatis tersedia di jalan boss; sebelum battle snapshot dipastikan full HP/MP dan ditempatkan **(704,400), hadap kanan**, di luar trigger. Retry mengembalikan resource/gear/flags checkpoint termasuk item/MP dan intent awal, sambil mempertahankan waktu aktif yang sudah berlalu.

Repository/storage tidak diganti: envelope `save_v2`, data schema 2, namespace lama dan tiga slot manual + autosave. Perubahan hanya nilai area/beat dan flags tambahan, tanpa field wajib baru; save Phase 3 v2 tetap dapat dibaca. Migrasi v1, checksum, strict validation, backup/recovery, future-schema protection dan error feedback existing dipertahankan. Validasi tambahan menolak boss/slice flags yang mendahului Hollowling/boss.

Autosave saat transisi area sudah selesai, checkpoint/rest stabil, sebelum boss, setelah aftermath selesai, dan pada penutup demo stabil. Tidak ada write pada turn/telegraph/animasi/defeat/retry. Manual save/load, Continue, Settings terpisah dan fallback storage tetap berfungsi. Memuat save sebelum boss mengembalikan seluruh cabang state, tidak mempertahankan loot dari save sesudah boss.

**Save lokal browser/origin; menghapus site data dapat menghilangkan progress. Backup satu generasi bukan cloud save.**

## 6. Visual dan animasi — status jujur

Concept `B01_NEW_CONCEPT_DRAFT.png` diperiksa sebagai referensi identitas: binatang hutan berwajah tulang, tanduk bercabang, tubuh organik. Runtime memakai **atlas grid asli 384×96, empat pose 96×96** idle/attack/hit/defeated. PNG dan JSON disalin byte-identical; tidak mengubah sumber atau memperkecil ilustrasi HD menjadi sprite. Source JSON DRAFT; registry review **NEEDS_REVIEW**.

`mournfangPlayback` memberi timing/alias pose dalam kode; pose idle dipakai kembali untuk tahan anticipation/recovery. Tidak ada klaim 11 frame baru, walk cycle atau animasi final. Boss memakai pergantian pose, approach singkat, hit, defeated, lalu surut/fade bersama bayangannya; efek terbatas membantu kontak. C01 dan Ground Slam tetap memakai atlas v3.3 asli. World sprite boss menghadapi Yaric; battle boss di kiri menghadap kanan. Pivot logis source stabil, tetapi kaki/visible baseline pada pose B01 belum ideal dan tetap masuk backlog artist.

Backlog visual:

| Prioritas | Kekurangan / pekerjaan artist berikutnya |
|---|---|
| Tinggi | B01 empat pose sangat kasar: wajah tulang, kaki, volume tubuh, tanduk dan detail organik belum terbaca sesuai concept. Perlu authored pixel pass yang direview manusia |
| Tinggi | B01 perlu anticipate/sweep/recover yang berbeda dan articulated hit/retreat; beberapa piksel tepi/pivot membutuhkan review. Alias pose bukan pengganti animasi produksi |
| Tinggi, warisan | Fragmen pedang/piksel tepi pada atlas C01 v3.3, sprite Nambo placeholder dan art hutan DRAFT tetap terbuka |
| Sedang | Sambungan ground tepi hutan/props existing perlu penyatuan tekstur/palet artist; susunan pohon harus tetap menjaga jalur dan siluet pemain |
| Review manusia | Readability pada ukuran layar nyata, feel kamera/transisi dan pacing; bukan klaim FPS/headless setara GPU pemain |

Tidak ada redesign Title/dialog/battle/Pause. UI baru hanya warning boss, nama/reward dinamis, label save area/beat dan penutup sederhana Deep Plum/Bitter Lime.

## 7. QA aktual

| Gate akhir | Hasil |
|---|---|
| Unit/TypeScript/build awal | 404/404, 15 files, strict TS/build PASS |
| Final verify | **PASS: 405/405**, 15 files, TypeScript strict dan production build |
| Final browser produksi seluruh suite | **PASS: 84/84 smoke + 162/162 cerita/persistence/full slice + 37/37 battle + 54/54 RPG/save + 38/38 boss = 375/375** |
| Focused Chrome produksi | **PASS: 38/38**, Chrome 157.0.8103.39 headless |
| Focused dev Phase 4 | **PASS: 38/38**, Edge 157.0.4341.46 headless pada server existing 5173 |
| Visual screenshots final | **PASS untuk keterbacaan/layout yang diperiksa**, kedua resolusi; art tetap DRAFT/NEEDS_REVIEW |

Kasus unit baru: urutan AI, full response turn, guarded damage, GS interruption/MP, command/token rejection, winnability dengan resource terbatas/legacy level, defeat/retry, ledger/loot/cap, checkpoint repeat, save round-trip sebelum/sesudah boss, invalid chronology, dialog source parity, byte-equal assets dan route/blocker.

Browser alur penuh memperluas perjalanan keyboard existing dari Title tanpa seeded state/teleport: progression/menu/manual save/refresh → lanjut ke boss → counter → victory → save/refresh → load sebelum/sesudah boss → gunakan loot → penutup/save/Continue. Focused fixture `?qa=1` memeriksa defeat sesudah menghabiskan Potion/MP, retry, spam input, mid-combat refresh, Pause/Settings/Title, no double rewards, kedua resolusi dan efek aktual. Harness hanya QA; tidak menjadi jalur cerita pemain.

Riwayat temuan awal: TypeScript menemukan mapping area placeholder dan unused test imports; diperbaiki. Browser menemukan **old WorldScene masih menulis area/posisi selama fade**, sehingga perpindahan area tertimpa. Update scene lama kini dihentikan saat leaving. Focused awal **36/38**: HP 108/108 bertumpuk dengan MP; koordinat HP digeser, warning dipindah ke header/pesan agar tidak menutupi sprite. Satu full run **375/375** lulus sebelum polish bayangan/retry terakhir.

Assertion input lama sempat gagal pada timing headless: pengukuran dua tombol mencakup jeda antar keydown, helper face melepas tombol sebelum frame polling, dan titik uji menghadap membelakangi bekas langkah terlalu dekat batas hit area. Pengukuran kini hanya selama kedua tombol ditahan, face menunggu frame aktual, dan fixture dipindah ke posisi utara dengan margin yang jelas. Tidak mengubah collision/aturan interaksi gameplay atau mengabaikan assertion. Suite cerita diulang setelah perbaikan fixture; hasil final di tabel setelah selesai.

Laporan produksi final dirakit per-suite setelah suite cerita diulang: seluruh lima JSON harus `failed:0` dan timestamp sesudah build yang sama. Bukti di `.dev-cache/test-artifacts/phase4-production/matrix.json`, menyimpan total 375, nama bundle `index-C8MZ3UE8.js` dan SHA256 `ea6c69cadd6e3a99968cbbf877fffb5cb43bd9824abb501fa62b44d596b3e45d`. Run gabungan sebelumnya mencatat kegagalan fixture interaksi; tidak disembunyikan atau dianggap hijau. Hasil suite cerita terkoreksi 162/162 menggantikannya dalam matriks final; suite lain tetap memakai build yang sama.

Logs utama: `.dev-cache/logs/phase4-verify-complete.log`, `phase4-e2e-complete.log` (termasuk kegagalan fixture), `phase4-e2e-story-rerun.log` (cerita final), `phase4-e2e-chrome.log`, `phase4-e2e-dev.log`. Bukti awal tetap disimpan, termasuk run 375/375 sebelum polish di `phase4-production-initial/`. Folder `phase4-production/`, `phase4-chrome/`, `phase4-dev/` memisahkan JSON/screenshots agar hasil browser berbeda tidak saling menimpa.

Screenshot produksi yang diperiksa: [checkpoint](../../.dev-cache/test-artifacts/phase4-production/p1_phase4_checkpoint.png), [telegraph](../../.dev-cache/test-artifacts/phase4-production/p4_telegraph_1366.png), [Ground Slam](../../.dev-cache/test-artifacts/phase4-production/p1_phase4_boss_ground_slam.png), [victory](../../.dev-cache/test-artifacts/phase4-production/p4_victory.png), [defeat](../../.dev-cache/test-artifacts/phase4-production/p4_defeat.png), [penutup 1080p](../../.dev-cache/test-artifacts/phase4-production/p4_ending_1920.png), [save sesudah boss](../../.dev-cache/test-artifacts/phase4-production/p1_phase4_save_after_boss.png).

Build final: game JS 129.30 kB (gzip 43.67 kB), Phaser 1,367.07 kB (gzip 357.00 kB), dari output Vite. Boot loopback lokal sampai Title: Edge production **1.647/1.448 detik** (1366/1920), Chrome **1.346/0.830 detik**, Edge dev **4.375/4.325 detik**, dari timestamp browser QA. Continuation sesudah Hollowling/RPG memakai **84.3 detik wall-clock automation**; snapshot ending mencatat **242.9 detik aktif pada cabang save saat itu**. Counter aktif memakai frame cap dan berubah saat load cabang lama, sehingga bukan wall-clock seluruh sesi QA.

Tidak ada pengukuran FPS GPU, jaringan publik atau durasi manusia. Target pacing 10–15 menit tetap perlu human playtest; tidak ditambahkan padding/dialog panjang untuk memaksa angka. Browser kedua resolusi selesai tanpa fatal JS, failed asset atau permintaan audio. Screenshot final production/Chrome/dev diperiksa untuk readability; tidak mengesahkan kualitas art produksi.

## 8. Audio dan preview

Tidak ada musik/SFX dibuat, diunduh atau ditambahkan. Forest memakai cue existing `BGM_FOREST_01`, normal battle `BGM_BATTLE`, Mournfang `BGM_BOSS`, hasil memakai SFX existing; semua **AWAITING_COMPOSER**. Penutup memakai sunyi, tanpa cue duplikat. Composer handoff diperbarui untuk kebutuhan forest/normal/boss/anticipation/victory/defeat/demo. Boot hanya memuat audio READY sehingga game tetap senyap tanpa missing request.

Preview dev existing **http://127.0.0.1:5173/**; production E2E memakai preview sementara port 4199. Tidak ada deployment. Perintah proyek (dot-source `web/scripts/dev-env.ps1` dulu): `npm run verify`, `npm run test:e2e`; focused memakai `E2E_SUITES=phase4.mjs`, server existing memakai `E2E_URL`.

## 9. Files dan kesiapan lanjutan

Daftar Git: **11 file baru, 39 dimodifikasi (50 total)**. Tidak ada perubahan original `assets/`, approved source/narrative, dependency/lockfile, registry musik, konfigurasi global, commit/push atau deployment. `git diff --check` lulus; LF/CRLF warnings bukan whitespace errors. SHA256 B01 PNG source dan runtime sama: `afb4c922df7a0757e53ad24f0e4e47afbdffb5b0b5bc66fbfedd65de1ca5e3d8`.

```text
BARU
docs/production/PHASE4_REPORT.md
web/public/assets/battle/B01_BATTLE_ATLAS_DRAFT.json
web/public/assets/battle/B01_BATTLE_ATLAS_DRAFT.png
web/src/game/combat/encounters.ts
web/src/game/dialogue/mournfang.ts
web/src/game/rpg/checkpoints.ts
web/src/game/scenes/SliceEndScene.ts
web/src/game/world/forestEdge.ts
web/tests/e2e/phase4-helpers.mjs
web/tests/e2e/phase4.mjs
web/tests/unit/vertical-slice.test.ts

DIMODIFIKASI
ASSET_INDEX.md
ASSET_MANIFEST.md
AUDIO_COMPOSER_HANDOFF.md
CLAUDE.md
GAME_SYSTEMS.md
PHASES.md
QA_CHECKLIST.md
README.md
TASKS.md
docs/production/CHANGELOG.md
docs/production/MVP_0_1.md
docs/production/PHASES.md
docs/production/SESSION_HANDOFF.md
docs/production/TASKS.md
docs/quality/QA_CHECKLIST.md
web/README.md
web/package.json
web/scripts/prepare-battle-assets.mjs
web/src/game/combat/BattleAtlas.ts
web/src/game/combat/BattleEngine.ts
web/src/game/combat/BattleSession.ts
web/src/game/config/constants.ts
web/src/game/config/createGameConfig.ts
web/src/game/data/assetManifest.ts
web/src/game/data/ids.ts
web/src/game/data/maps/forest1.map.mjs
web/src/game/rpg/progression.ts
web/src/game/scenes/BattleScene.ts
web/src/game/scenes/PlaceholderScene.ts
web/src/game/scenes/SaveLoadScene.ts
web/src/game/scenes/WorldScene.ts
web/src/game/story/Chapter1Story.ts
web/src/game/systems/GameState.ts
web/src/main.ts
web/src/ui/components/BattlePanel.ts
web/tests/e2e/phase1.mjs
web/tests/e2e/run.mjs
web/tests/unit/assets.test.ts
web/tests/unit/story.test.ts
```

Fondasi tersedia untuk pekerjaan lanjutan sesudah review: encounter configurable, AI intent terpisah, checkpoint aman, reward ledger, save kompatibel dan akses UI penutup. **Phase 5/Chapter II belum dimulai.** Aveloria, Talric, Azie, Velthia dan akhir Chapter I adalah pekerjaan berikutnya hanya setelah instruksi pengguna. Human playtest, balancing dan visual backlog tetap membutuhkan review.
