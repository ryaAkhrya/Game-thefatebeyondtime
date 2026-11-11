# TASKS — STATUS SEBENARNYA

## Polish Sprint 1 — UI/UX, Title, identitas Yaric, sprite (11 November 2026)

- [x] Kanvas = piksel perangkat, zoom dunia/battle bulat, UI 960x540 tajam (Cinzel + Source Sans 3); Fit/Pixel Perfect/resize berfungsi.
- [x] Title Screen baru (siluet Yaric–Velthia), dialog, Inventaris/Status/Jeda/Jurnal/Simpan/Pengaturan/Toko dan battle solo/duo didesain ulang; banner tujuan dihapus (tujuan di Jurnal).
- [x] Nama Yaric anonim sampai reveal DRAFT_IMPL di batu penanda pertama Hutan 2 (`identity.name_known`); save lama kompatibel.
- [x] Sprite eksplorasi ternormalisasi (kaki y=46; Yaric kiri/kanan tidak lagi melayang/kecil). Perlu redraw artist: Yaric belakang/kanan dan seluruh sprite pendukung.
- [x] 588 unit, produksi Edge 645 (84+197+37+54+38+75+55+105), Chrome sprint1 105 + kota 75; strict TS/build. Laporan: `docs/production/POLISH_SPRINT1_REPORT.md`.
- [ ] Review manusia (tipografi/komposisi/key art Title, monitor nyata), font final, key art; Sprint 2 (idle animation) dan Bab III menunggu instruksi.

## Phase 6 otonom — Chapter II

- [x] Baseline Phase 0–5: 460 unit, 484 Edge produksi, 113 Chrome, 113 dev Edge; TypeScript/build.
- [x] C2-01..09 playable: Azie/Velthia, Liora/Zira, Hutan 2/Torvan, duo tutorial, Veyrath, fragmen, laporan dan ending.
- [x] Party duo, skill/support/target/status/EXP per anggota, save v2 kompatibel, retry/reward sekali.
- [x] Patroli opsional M02+M03, cooldown 20 detik tersimpan; tidak mewajibkan grinding.
- [ ] Review artistik, dialog kerja, balancing/pacing manusia, audio komposer. Angka QA aktual: `PHASE6_REPORT.md`.
- [ ] Bab III menunggu instruksi baru.

## Riwayat Phase 5 — Chapter I / Aveloria (10 November 2026)

- [x] Baseline aktual: 405 unit, 375 produksi Edge, 38 Chrome boss, 38 dev Edge boss; strict TypeScript/build.
- [x] C1-06..09: vista Aveloria, Talric, arsip Azie, audiensi Velthia, dua lonceng, penyelidikan dan penutup Chapter I.
- [x] Safe-zone kota dengan gerbang, jalan/plaza/pasar, halaman dan ruang pertemuan; collision/kamera existing.
- [x] Empat atlas NPC DRAFT asli, portrait individual/ekspresi, pilihan keyboard, empat warga tanpa nama.
- [x] Toko Derrria: shared inventory, emas dan stok persistent; tidak ada reward kota atau party join.
- [x] Save v2 additive/optional, flags berurutan, posisi/NPC/malam pulih; save forest lama tetap valid.
- [x] 460 unit/16 files dan strict TS/build; QA browser awal Aveloria 65/65 kedua resolusi.
- [x] **Phase 5 PASS fungsional/QA otomatis:** 460 unit, 484 produksi Edge, 113 Chrome, 113 dev Edge; strict TS/build, render order dan screenshot lulus. [Laporan Phase 5](PHASE5_REPORT.md).
- [ ] Review manusia: visual/animasi DRAFT, dialog/chemistry, pacing, hardware nyata, audio komposer.
- [ ] Side quest optional (backlog). Chapter II hanya setelah instruksi baru; tidak diimplementasikan pada Phase 5 ini.

Bagian Phase 0–4 berikut adalah riwayat.


**Phase 4 PASS (fungsional/QA otomatis)** (10 Nov 2026): intro sampai Mournfang dan penutup menuju Aveloria. 405 unit, 375 produksi Edge +38 Chrome +38 dev Edge, strict TS/build lulus. Bukti di `PHASE4_REPORT.md`. Art DRAFT/NEEDS_REVIEW, human pacing belum divalidasi; Phase 5/Chapter II belum dikerjakan.

## Phase 0 — Web Foundation

- [x] Buat Vite + Phaser 4.2.1 + TS di `web/` dan lockfile.
- [x] Setup title screen 16:9 + pixel scaling (320x180 internal; Fit / Pixel Perfect).
- [x] Implement keyboard focus global dan desktop-only message.
- [x] Implement SettingsRepository dan panel Settings dari Title (9 opsi, Reset + konfirmasi).
- [x] Jalankan `npm run dev`, `npm run build` dan catat hasil (85 unit test + 84 e2e Edge lulus).
- [x] Report (PHASE0_REPORT.md). Commit: tidak dilakukan, folder bukan repositori git; jangan push remote tanpa izin.

## Phase 1 — Exploration & Dialogue

- [x] Yaric movement 4 arah + collision (atlas eksplorasi v3.2, bukan placeholder; NEEDS_REVIEW).
- [x] Hutan demo (DRAFT dev art), Nambo (sprite DRAFT), interaksi papan/peti/objek/NPC.
- [x] Dialog Indonesia + portrait/ekspresi + Text Speed + pilihan keyboard; Pause -> Pengaturan.
- [x] QA input dan scene transitions (e2e 93 cek + 204 unit; Edge headless saja, belum diuji manusia).

## Phase 2 — Battle

- [x] Duel C1-04, musuh kiri/pemain kanan, atlas v3.3 asli + metadata.
- [x] Serang, Jurus Ground Slam, Barang Potion, Bertahan; Kabur tutorial nonaktif dengan alasan.
- [x] Pure engine, SPD/tie-break, HP/MP bounds, status foundation, AI, kemenangan/kekalahan/retry.
- [x] Commit sekali, inventory/vitals konsisten, flag `battle.first_hollowling`, kembali ke dunia; scripted satu kali, tanpa random encounter.
- [x] 273 unit test + strict TypeScript + build; hasil browser terbaru di PHASE2_REPORT.md.
- [ ] Review visual manusia dan cleanup potongan pedang/piksel tepi dalam atlas sumber. NEEDS_REVIEW; belum PASS penuh.

## Phase 3 — RPG / Save

- [x] EXP/level, shared inventory, equipment dan dua pasif DRAFT Yaric.
- [x] Manual save tiga slot, autosave aman, Load/Continue setelah refresh.
- [x] Shop foundation/UI terisolasi dari cerita; buy/sell/currency/stock dan transaksi gagal aman.
- [x] Delapan menu Pause terhubung; Settings tetap persisten dan terpisah.
- [x] Migrasi save v1→v2 read-only, backup/recovery, quota/corruption/storage unavailable; bukti akhir di PHASE3_REPORT.md.
- [ ] Review manusia untuk UI dan balancing/pasif DRAFT.

## Phase 4 — MVP

- [x] Intro/Nambo/loop/Hollowling/RPG → tepi hutan → checkpoint → Mournfang → penutup menuju Aveloria; bukan Chapter I penuh.
- [x] Boss AI, telegraph, Bertahan/GS/Potion, retry aman, reward/loot sekali dan persistence.
- [x] Source dialog C1-05 dan empat pose B01 existing, status DRAFT/NEEDS_REVIEW jujur.
- [x] Gate akhir: 405 unit, 375 produksi Edge, 38 Chrome, 38 dev Edge, strict TypeScript/build dan screenshot readability. Bukti di PHASE4_REPORT.md.
- [ ] Human playtest/pacing target 10–15 menit, review visual/animasi/balancing DRAFT dan GPU/layar nyata.

## Phase 5 — Full game

- [ ] Chapters I–IV, modern interlude, epilog (40 beat) dan semua RPG systems.
- [ ] Review aset individual dari source sheet terpilih → art produksi setelah uji visual dan game.
- [ ] Audio buatan user & media personal diberi izin, private build terpisah.

## Phase 6 — Release

- [ ] Polish, balancing, bugs, Settings, browser compatibility, legal asset audit.
- [ ] Hosting static **hanya setelah user meminta deploy**.

## Template handoff task

`Task ID` / `Phase` / `File berubah` / `Test dijalankan + hasil` / `Screenshots` / `Known issues` / `Next steps`. Ubah checkbox berdasarkan bukti, bukan karena file dibuat.
