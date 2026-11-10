# Phase 3 — RPG Systems, Progression & Persistence

Tanggal: 10 November 2026. Workspace: `D:\01_DEVELOPMENT\GAME\FINAL`. Stack tetap Phaser 4.2.1, TypeScript strict, Vite dan Vitest; desktop browser, keyboard, single-player tanpa backend.

## A. Status

**PHASE 3 PASS** untuk scope fungsional dan QA otomatis: TypeScript strict, **378/378 unit test**, production build, **311/311 browser checks produksi**, serta **54/54 focused browser checks dev** lulus. Review manusia/balancing/art tetap terbuka. Phase 4 belum dimulai; tidak ada commit/push atau deployment.

Scope ini menambahkan fondasi RPG dan persistence pada Chapter I yang sudah playable. Tidak menambah chapter, map, NPC, boss, dialog kanon, musik, SFX, atau art. Art Phase 2 tetap **NEEDS_REVIEW**, termasuk fragmen/piksel tepi dalam atlas sumber; status Phase 3 tidak mengesahkan art tersebut.

## B. Audit dan baseline

- Git sudah aktif dan working tree bersih sebelum perubahan. Tidak ada perubahan pengguna yang ditimpa. Tidak ada dependency baru atau instalasi ulang Node/npm.
- Dokumentasi aktual, approved Cerita Revisi 02 dan arsitektur Phase 0–2 dibaca sebelum implementasi. Fondasi `GameState`, `SaveRepository`, Settings, input, battle dan world dipakai kembali.
- Baseline sebelum edit: **273/273 unit**, 12 test files, TypeScript strict, production build; browser **84/84 Phase 0 + 110/110 Phase 1 + 37/37 Phase 2 = 231/231**.
- Bukti baseline: `.dev-cache/logs/phase3-baseline-verify.log` dan `phase3-baseline-e2e.log`.
- Dependency, npm/Vite cache, logs dan screenshots tetap di drive D:. Perintah memakai environment proyek `web/scripts/dev-env.ps1`, tanpa mengubah npm global/PATH.

## C. Arsitektur dan RPG systems

### Satu sumber data gameplay

`GameStateData` merupakan snapshot data murni. `rpg/definitions.ts`, `progression.ts`, `inventory.ts`, `actions.ts`, dan `validation.ts` memisahkan definisi, perhitungan, transaksi dan validasi dari Phaser. Scene hanya menampilkan snapshot dan menjalankan hasil transaksi. Field yang diizinkan disalin secara eksplisit saat validasi; objek renderer/circular extra tidak ikut masuk save.

`BattleSession` mengambil stat efektif, jurus, inventory dan vitals dari snapshot yang sama. `BattleEngine` menggunakan definisi/effect Potion yang juga dipakai inventory dunia. Reward dan konsumsi baru masuk state saat kemenangan dikonfirmasi; defeat/retry memulihkan checkpoint. Layar baru tidak menjadi sumber angka damage atau progression.

### EXP, level dan reward — angka DRAFT

| Level | EXP kumulatif |
| --- | ---: |
| 1 | 0 |
| 2 | 25 |
| 3 | 70 |
| 4 | 140 |
| 5 (cap awal) | 235 |

Base level 1 Yaric: HP 96, MP 12, ATK 16, DEF 6, MAG 5, MDEF 7, SPD 10. Growth per level: **+12 HP, +2 MP, +3 ATK, +1 DEF, +1 MAG, +1 MDEF, +1 SPD**. Rumus base stat = base level 1 + growth × (level − 1). EXP dibatasi pada threshold cap; tiap level baru memberi satu poin jurus.

Stat efektif dihitung ulang dari **base + bonus equipment + pasif terbuka**. Pedang Besar awal +4 ATK dan Baju Jalan +2 DEF membuat stat level 1 efektif tetap sama dengan Phase 2: ATK 20, DEF 8. Level 2 memberi maksimum HP/MP 108/14. Saat naik level, current HP/MP mendapat selisih maksimum (+12/+2), dibatasi maksimum baru; tidak otomatis full heal.

Hollowling memberi **25 EXP dan 8 emas** sekali, pada konfirmasi `Lanjutkan` di hasil victory. Receipt menampilkan EXP, emas, level lama/baru dan poin jurus. Commit kemenangan mencakup vitals, inventory, flag encounter dan ledger `reward.first_hollowling.rpg` dalam satu snapshot tervalidasi. Defeat, retry, kabur atau commit berulang tidak memberi reward. Memuat checkpoint lama mengembalikan seluruh cabang save, bukan menggabungkan saldo dari dua timeline.

Progression menerima profile parameter untuk karakter mendatang; fixture karakter lain menguji growth/threshold terpisah. Hanya profile Yaric/C01 terdaftar untuk game sekarang. Torvan/Velthia belum masuk party; profile, skill dan balancing mereka tetap pekerjaan fase berikutnya.

### Inventory dan equipment

- `items` adalah satu inventory kuantitas untuk peti, dunia, battle, equipment dan toko. Angka mencakup barang yang sedang terpasang; slot menyimpan referensi ID, bukan mengurangi jumlah barang.
- Potion memulihkan hingga **36 HP**, tidak dapat digunakan pada HP penuh, KO, stok kosong, atau dari equipment/key item. Konsumsi hanya sesudah effect valid. Peti memakai flag existing sehingga tidak memberi Potion kedua setelah load.
- Dua slot: `weapon` dan `armor`. Equip/unequip mengecek stok yang belum dipakai karakter lain, slot dan class. Stat selalu dihitung ulang sehingga pergantian berulang tidak menumpuk bonus.
- Pedang Besar terikat Yaric, tidak dijual. Tidak ada perubahan visual senjata. Baju Jalan dan nama/balance item tambahan tetap DRAFT.
- Key item tidak dapat dipakai, dijual atau dibuang. `qa_key` dan `qa_staff` hanya fixture/harness; tidak diberikan oleh Chapter I. Tongkat uji memeriksa penolakan class swordsman.
- Jumlah item 0–999; emas 0–999999. Nilai pecahan/negatif/non-finite, ID yang tidak dikenal dan dictionary prototype ditolak pada boundary terkait.

### Jurus

Ground Slam tetap jurus awal, fisik, **4 MP**, dengan perhitungan Phase 2. Engine menolak skill yang tidak terbuka. Cabang awal swordsman mempunyai dua pasif **DRAFT**, masing-masing memerlukan level 2, Ground Slam dan satu poin:

- **Hantaman Berat**: ATK +2.
- **Kuda-kuda Kukuh**: DEF +2.

Kemenangan tutorial memberi satu poin sehingga pemain memilih salah satu lebih dahulu. Pasif tidak dapat dibeli dua kali; poin tidak negatif. Persyaratan, cost, class dan effect ada di definitions; UI hanya menampilkan alasan dan melakukan transaksi. Ultimate approved tidak diubah.

### Shop foundation

`trade()` menghitung snapshot inventory/gold dan stock baru setelah seluruh pemeriksaan berhasil. Buy memeriksa harga, stock, emas dan kapasitas; sell memeriksa kepemilikan yang tidak sedang dipakai, sellable/key restriction, kapasitas stock dan batas emas. Transaksi gagal tidak mengubah input. Potion: beli 12, jual 6; Baju Jalan: beli 20, jual 8; angka DRAFT.

`ShopScene` reusable, keyboard, mode Beli/Jual, descriptions dan feedback. Belum ada scene merchant yang sesuai kronologi di playable Chapter I, sehingga hanya diakses lewat harness **`?qa=1` → `window.__tfbt.qa.shop()`**, bukan menu cerita. Harness memberi fixture emas 48 dan item uji. Tidak menempatkan Derrria atau NPC baru di Hutan 1. Stock disimpan pada objek shop sesi; official merchant stock/save dan ekonomi chapter berikutnya belum ditentukan.

## D. Save/load dan keamanan data

### Schema dan compatibility

Satu `SaveRepository` existing tetap menjadi boundary storage. Envelope **`save_v2`**, data **`schemaVersion: 2`**. Key **tetap `tfbt.save.v1.{auto,slot1,slot2,slot3}`** untuk menemukan slot lama; nama key bukan versi payload. Settings memakai repository/key sendiri.

| Field data | Isi |
| --- | --- |
| `chapter`, `storyBeat`, `area` | chapter, beat, area; beat dinormalisasi dari flags |
| `position` | x, y, facing |
| `party` | ID anggota aktif, saat ini C01 |
| `flags` | progression cerita, NPC, semak, peti, encounter, reward ledger |
| `items`, `vitals` | jumlah inventory, current HP/MP |
| `rpg.gold` | currency |
| `rpg.characters` | class, EXP/level, baseStats, skillPoints, unlockedSkills, equipment |
| `world.forestWrapCount` | jumlah loop hutan untuk kelanjutan event |
| `playtimeSec` | waktu aktif dunia/battle, delta dibatasi; pause tidak dihitung |

Load memvalidasi checksum, slot, timestamp, schema, finite/range, EXP↔level, baseStats terhadap profile, point yang diperoleh/dibelanjakan, prerequisite skill, ownership/class equipment dan vitals. Tidak menyimpan instance Phaser. Posisi lama yang tidak walkable/out-of-bounds diarahkan ke spawn aman tanpa membuang flags atau inventory.

**Migrasi v1:** checksum diperiksa sebelum migrasi. Starter gear, RPG awal, world counter dan vitals yang belum ada diberi default; item/flags/vitals/posisi valid dipertahankan. Migrasi hanya di memori ketika dibaca, tidak rewrite slot asli. Save berikutnya menggunakan v2. Legacy yang sudah menang ditandai ledger sudah diproses, tanpa memberi hadiah retroaktif. Schema masa depan tidak dihapus dan write ke primary tersebut ditolak.

### Slot, backup, error

- Tiga slot manual + satu autosave. UI menampilkan kosong/rusak/versi tak didukung/storage tidak tersedia, waktu WIB, chapter/area/beat, level, HP/MP dan durasi.
- Manual overwrite dan load memakai konfirmasi, fokus awal **Batal**. Escape kembali secara konsisten. Autosave ditampilkan untuk load, tidak sebagai target manual save.
- Primary valid sebelumnya disalin ke **`<key>.backup`** sebelum overwrite. Write dibaca kembali untuk verifikasi. Bila write gagal, rollback primary dicoba; bila primary korup/hilang, read dapat memulihkan backup tervalidasi. UI slot menandai pemulihan backup.
- Jika pembacaan awal gagal, kode tidak menjalankan rollback/remove sebelum write benar-benar dicoba. Quota/blocked/read/write failure tidak mengklaim sukses atau menghapus slot lama. Backup bukan jaminan terhadap penghapusan site data atau seluruh localStorage.
- Title **Lanjut** memilih save valid paling baru dan membangun kembali WorldScene. Tanpa save valid tombol nonaktif. Manual load dan New Game mengosongkan antrean autosave sesi lama.

**Save berada lokal pada browser dan origin yang sama. Menghapus data situs/browser atau mengganti origin/port dapat membuat progress tidak tersedia. Tidak ada cloud/account/export pada scope ini.**

### Checkpoint aman

`SaveCoordinator` adalah scheduler di atas repository existing. Save hanya ketika game aktif, HP >0 dan world stabil. Permintaan saat tidak aman ditunda; manual save memberi alasan jika tidak aman. Tidak menyimpan dialog/battle yang setengah selesai.

Autosave setelah aksi event penting selesai dan flags sudah final (termasuk Nambo menepi), checkpoint loop hutan, checkpoint sebelum encounter, dan setelah dialog kemenangan selesai. Posisi sebelum battle disimpan di y=100 menghadap bawah, di luar trigger. Selama battle/defeat/retry tidak ada write; victory baru disimpan setelah kembali stabil. Kegagalan tidak diulang setiap frame; checkpoint berikutnya dapat mencoba lagi.

Perubahan inventory/equipment/jurus lewat menu memerlukan manual save atau checkpoint berikutnya. Tidak setiap keypress disimpan otomatis. Playtime adalah waktu aktif dengan frame delta cap, bukan pengukuran wall-clock presisi.

Load merekonstruksi NPC, semak dan peti dari flag existing, memulihkan counter loop dan posisi, serta menonaktifkan encounter yang sudah menang. Tidak menggandakan item atau reward.

## E. UI, integrasi dan QA

Pause menyediakan **Lanjutkan, Status, Inventaris, Perlengkapan, Jurus, Simpan/Muat, Pengaturan, Kembali ke Judul**. Layar baru memakai Deep Plum/Bitter Lime dan kamera UI existing, fokus keyboard, deskripsi dan perbandingan stat. Saat battle, menu mutasi RPG/save diblokir; Settings tetap dapat digunakan. Tidak merombak Title/dialog/battle selain receipt reward dan label build.

### Hasil eksekusi

| Gate | Hasil |
| --- | --- |
| Baseline sebelum edit | 273 unit, 231 browser checks; strict TS/build PASS |
| Final `npm run verify` | **PASS: 378/378 unit, 14 test files; strict TS dan production build PASS** |
| Final production browser regression | **PASS: 84/84 smoke + 136/136 Phase 1/story/persistence + 37/37 Phase 2 + 54/54 Phase 3 = 311/311** |
| Focused dev browser Phase 3 | **PASS: 54/54**, server existing port 5173, termasuk no JS/failed asset/audio request |
| Visual screenshots | **PASS pada screenshot yang diperiksa:** Status, Inventory, equipment, jurus, save/load dan shop; label/description/footer sudah berada dalam panel |

Unit mencakup cap/EXP/multi-level, idempotensi reward, checkpoint battle, shared item effect, quantity/class/key restrictions, equip berulang, skill requirements/points, transaksi rollback, schema dan field stripping, migration, backup/recovery, read failure, write/readback failure, quota/unavailable dan gate autosave.

Browser menjalankan jalur nyata dengan keyboard: **Title → Chapter I → Nambo → jalur loop → peti → Hollowling → Victory → Status/Inventaris/Jurus/Equipment → tiga slot manual → refresh → Continue → manual load → kembali peti/encounter**. Snapshot state dan storage diperiksa selain tampilan. Settings tetap terpisah. Suite Phase 3 juga menguji resume sebelum encounter, konsumsi Potion dan resources battle setelah load, shop fixture, backup, corrupt/future/blocked/quota, input fokus dan layout pada **1366×768 serta 1920×1080**. Browser merekam fatal JS, failed assets dan audio request.

Riwayat kegagalan yang diperbaiki: focused awal 53/54 karena label autosave disabled melampaui baris; dipendekkan. Regresi production awal 84/84 + 135/136 + 37/37 + 54/54; satu kegagalan berasal dari deskripsi equipment yang bertumpuk dengan pesan sukses. Deskripsi dipendekkan, footer save dipindah ke dalam panel, lalu suite lengkap diulang. Dev pertama juga 53/54: fungsi lulus, tetapi beberapa request modul Vite dibatalkan dengan `net::ERR_ABORTED`. Pengulangan sesudah server dimuat menghasilkan **54/54 tanpa request gagal**, tanpa mengabaikan/filter assertion jaringan atau mengubah kode. Hasil awal tersebut bukan gate final.

Logs di `.dev-cache/logs/`: `phase3-verify-final.log`, `phase3-e2e-final.log`, `phase3-e2e-dev-rerun.log`, serta log awal `phase3-e2e-production.log` dan `phase3-e2e-dev-final.log`. Final production JSON disalin ke `.dev-cache/test-artifacts/phase3-production/` sebelum focused dev dijalankan; final focused dev ada di `e2e-phase3-report.json`, dan dev awal di `e2e-phase3-dev-initial-report.json`. Browser report JSON/screenshots di `.dev-cache/test-artifacts/`; nama `p1_phase3_*` untuk alur penuh, `p3_*` untuk UI/skenario Phase 3. Contoh: [equipment setelah unequip](../../.dev-cache/test-artifacts/p1_phase3_equipment.png), [save tiga slot](../../.dev-cache/test-artifacts/p1_phase3_save.png), [skill requirements](../../.dev-cache/test-artifacts/p1_phase3_skills.png), [shop harness](../../.dev-cache/test-artifacts/p3_shop_1920.png). Art originals tidak diedit dan asset registry/frame tests tetap bagian `verify`. `git diff --check` lulus; LF/CRLF warnings dari konfigurasi Git bukan whitespace errors.

## F. Preview

Dev server existing digunakan kembali: **http://127.0.0.1:5173/**. Production E2E memakai satu preview sementara pada port 4199 dan menutupnya setelah tes. Jangan membuka server duplikat pada port dev. Perintah dari `web/` setelah dot-source `scripts/dev-env.ps1`:

```powershell
npm run verify
npm run test:e2e
# Hanya jika ingin memakai dev server existing:
$env:E2E_URL = 'http://127.0.0.1:5173/'
$env:E2E_SUITES = 'phase3.mjs'
npm run test:e2e
```

## G. File changes

File baru: lima modul `web/src/game/rpg/`, `RpgMenuScene.ts`, `SaveLoadScene.ts`, `ShopScene.ts`, `SaveCoordinator.ts`, unit `rpg.test.ts`/`persistence.test.ts`, browser `phase3.mjs`/`phase3-helpers.mjs`, dan laporan ini.

File modifikasi: state/repository/services, battle engine/session/scene/panel, world/title/pause, scene registration/constants/IDs, main diagnostics, MenuList, existing save tests, existing browser suites/helpers/runner, package description, README/CLAUDE/PHASES/TASKS/QA dan salinan docs terkait, GAME_SYSTEMS (catatan implementasi DRAFT), session handoff, changelog dan composer handoff. Tidak ada perubahan dependency, lockfile, approved narrative, atlas sumber atau audio.

Daftar Git akhir: **14 file baru, 35 file dimodifikasi**; artifacts/cache diabaikan Git.

```text
BARU
docs/production/PHASE3_REPORT.md
web/src/game/rpg/actions.ts
web/src/game/rpg/definitions.ts
web/src/game/rpg/inventory.ts
web/src/game/rpg/progression.ts
web/src/game/rpg/validation.ts
web/src/game/scenes/RpgMenuScene.ts
web/src/game/scenes/SaveLoadScene.ts
web/src/game/scenes/ShopScene.ts
web/src/game/systems/SaveCoordinator.ts
web/tests/e2e/phase3-helpers.mjs
web/tests/e2e/phase3.mjs
web/tests/unit/persistence.test.ts
web/tests/unit/rpg.test.ts

DIMODIFIKASI
AUDIO_COMPOSER_HANDOFF.md
CLAUDE.md
GAME_SYSTEMS.md
PHASES.md
QA_CHECKLIST.md
README.md
TASKS.md
docs/production/CHANGELOG.md
docs/production/PHASES.md
docs/production/SESSION_HANDOFF.md
docs/production/TASKS.md
docs/quality/QA_CHECKLIST.md
web/README.md
web/package.json
web/src/game/combat/BattleEngine.ts
web/src/game/combat/BattleSession.ts
web/src/game/config/constants.ts
web/src/game/config/createGameConfig.ts
web/src/game/data/ids.ts
web/src/game/scenes/BattleScene.ts
web/src/game/scenes/PauseScene.ts
web/src/game/scenes/TitleScene.ts
web/src/game/scenes/WorldScene.ts
web/src/game/systems/GameState.ts
web/src/game/systems/SaveRepository.ts
web/src/game/systems/Services.ts
web/src/main.ts
web/src/ui/components/BattlePanel.ts
web/src/ui/components/MenuList.ts
web/tests/e2e/battle-helpers.mjs
web/tests/e2e/phase1.mjs
web/tests/e2e/phase2.mjs
web/tests/e2e/run.mjs
web/tests/e2e/smoke.mjs
web/tests/unit/save.test.ts
```

## H. Known limitations

- Browser automation menggunakan **Microsoft Edge 157.0.4341.46 headless di Windows**. Screenshots diperiksa, tetapi belum ada human playtest Phase 3, visible GPU/FPS/perangkat fisik/fullscreen atau browser lain. Tidak mengklaim semua art final atau semua UX disetujui.
- EXP curve, cap awal, growth, harga, nama pasif dan perlengkapan tambahan adalah DRAFT untuk review Game Director. Tidak ada grind/content tambahan untuk mengejar cap.
- Hanya C01 aktif; Torvan/Velthia membutuhkan profile/skills/data save tambahan sebelum dipakai. Tidak ada merchant story, official persistent shop stock, banyak slot equipment atau skill seluruh roster.
- Warisan Phase 1/2: environment/Nambo placeholders dan fragmen pedang pada beberapa frame atlas asli tetap perlu review/perbaikan artist. Original dipertahankan.
- Tidak ada musik/SFX baru; silent fallback dipertahankan. Composer handoff memakai spesifikasi UI move/confirm/back existing tanpa membuat file audio.
- Save lokal browser, backup satu generasi, migrasi v1→v2 saja; bukan cloud save atau jaminan recovery jika semua site data hilang. Perubahan menu perlu disimpan manual/checkpoint berikutnya.

## I. Phase 4 readiness

Foundation data dan scene sudah tersedia untuk integrasi MVP: state murni tervalidasi, reward/checkpoint, menus keyboard, repository berversi, recovery, migration dan QA perjalanan penuh. Sebelum memperluas konten: review balancing/teks DRAFT, lakukan human playtest save/refresh, review art existing, dan tetapkan kebutuhan integrasi berikutnya berdasarkan approved story. Phase 4 hanya dijalankan setelah instruksi baru pengguna; laporan ini tidak menambahkan konten fase tersebut.
