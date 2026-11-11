# TASKS — STATUS SEBENARNYA

## Polish Sprint 2 — dunia, karakter, animasi, sprint (12 November 2026)

- [x] P0 Mournfang: atlas V4 dari konsep resmi, terbukti terlihat pada piksel render (35% kotak berubah); monster lain diverifikasi sama.
- [x] Yaric arah atas: mahkota rambut digambar ulang; 56 frame (walk/idle/sprint) kaki y=46 tanpa clipping.
- [x] Nambo/Torvan/Velthia diautor ulang dari turnaround; Azie/Talric/Zira/Derrria hanya idle turunan (masih prototipe).
- [x] Hutan 1, Tepi Hutan, Hutan 2, Aveloria, Liora dibangun ulang (generator deterministik); peta cerita tidak berubah.
- [x] Idle berbasis data + sprint Shift (1,65x, collision per langkah, pemicu disapu).
- [x] 676 unit; Edge produksi 722 (84+197+37+54+38+75+55+105+77); Chrome Sprint 2 77 + Phase 4 38. PARTIAL kualitas visual: lihat `docs/production/POLISH_SPRINT2_REPORT.md` bagian L.
- [ ] Review manusia; seniman untuk backlog L; Bab III menunggu instruksi baru.

## Polish Sprint 1 — UI/UX, Title, identitas Yaric, sprite (11 November 2026)

- [x] Kanvas = piksel perangkat, zoom dunia/battle bulat, UI 960x540 tajam (Cinzel + Source Sans 3); Fit/Pixel Perfect/resize berfungsi.
- [x] Title Screen baru (siluet Yaric–Velthia), dialog, Inventaris/Status/Jeda/Jurnal/Simpan/Pengaturan/Toko dan battle solo/duo didesain ulang; banner tujuan dihapus (tujuan di Jurnal).
- [x] Nama Yaric anonim sampai reveal DRAFT_IMPL di batu penanda pertama Hutan 2 (`identity.name_known`); save lama kompatibel.
- [x] Sprite eksplorasi ternormalisasi (kaki y=46; Yaric kiri/kanan tidak lagi melayang/kecil). Perlu redraw artist: Yaric belakang/kanan dan seluruh sprite pendukung.
- [x] 588 unit, produksi Edge 645 (84+197+37+54+38+75+55+105), Chrome sprint1 105 + kota 75; strict TS/build. Laporan: `docs/production/POLISH_SPRINT1_REPORT.md`.
- [ ] Review manusia (tipografi/komposisi/key art Title, monitor nyata), font final, key art; Sprint 2 (idle animation) dan Bab III menunggu instruksi.

## Phase 6 otonom — Chapter II (10 November 2026)

- [x] Baseline Phase 0–5: 460 unit, 484 produksi Edge, 113 Chrome, 113 dev Edge, strict TypeScript/build.
- [x] C2-01..09: Azie/Velthia → Liora/Zira → Hutan 2/Torvan → duo battle/Veyrath → dua fragmen → laporan dan ending Bab II.
- [x] Party dua anggota, HP/MP/EXP/equipment/jurus per anggota, target support, retry dan reward sekali; battle solo Bab I tetap didukung.
- [x] Encounter wajib dan satu patroli M02+M03 opsional dengan cooldown 20 detik; tanpa grinding wajib.
- [x] Save v2 kompatibel Bab I; kondisi Torvan dan cooldown tersimpan sebagai extension; tiga slot, autosave, Continue tetap digunakan.
- [ ] Art Torvan/Zira/Veyrath dan lingkungan DRAFT, review narasi/balancing/pacing manusia, audio komposer; lihat `docs/production/PHASE6_REPORT.md` untuk QA aktual.
- [ ] Bab III menunggu instruksi baru.

## Riwayat Phase 5 — Chapter I / Aveloria (10 November 2026)

- [x] Baseline aktual: 405 unit, 375 produksi Edge, 38 Chrome boss, 38 dev Edge boss; strict TypeScript/build.
- [x] C1-06..09: vista Aveloria, Talric, arsip Azie, audiensi Velthia, dua lonceng, penyelidikan dan penutup Chapter I.
- [x] Safe-zone kota dengan gerbang, jalan/plaza/pasar, halaman dan ruang pertemuan; collision/kamera existing.
- [x] Empat atlas NPC DRAFT asli, portrait individual/ekspresi, pilihan keyboard, empat warga tanpa nama.
- [x] Toko Derrria: shared inventory, emas dan stok persistent; tidak ada reward kota atau party join.
- [x] Save v2 additive/optional, flags berurutan, posisi/NPC/malam pulih; save forest lama tetap valid.
- [x] 460 unit/16 files dan strict TS/build; QA browser awal Aveloria 65/65 kedua resolusi.
- [x] **Phase 5 PASS fungsional/QA otomatis:** 460 unit, 484 produksi Edge, 113 Chrome, 113 dev Edge; strict TS/build, render order dan screenshot lulus. [Laporan Phase 5](docs/production/PHASE5_REPORT.md).
- [ ] Review manusia: visual/animasi DRAFT, dialog/chemistry, pacing, hardware nyata, audio komposer.
- [ ] Side quest optional (backlog). Chapter II hanya setelah instruksi baru; tidak diimplementasikan pada Phase 5 ini.

Bagian Phase 0–4 berikut adalah riwayat.


**Phase 4 PASS (fungsional/QA otomatis)** (10 Nov 2026): intro sampai Mournfang dan penutup menuju Aveloria. 405 unit, 375 produksi Edge +38 Chrome +38 dev Edge, strict TS/build lulus. Bukti di `docs/production/PHASE4_REPORT.md`. Art DRAFT/NEEDS_REVIEW, human pacing belum divalidasi; Phase 5/Chapter II belum dikerjakan.

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

- [x] Side-view: Hollowling kiri, Yaric kanan; atlas v3.3 asli + metadata.
- [x] Serang/Jurus Ground Slam/Barang Potion/Bertahan; Kabur tutorial nonaktif dengan alasan, escape engine biasa teruji unit.
- [x] HP/MP, SPD deterministic, AI eksplisit, fondasi Poison/Stun/ATK Up/DEF Up, menang/kalah/retry.
- [x] Commit sekali, konsumsi item dan vitals konsisten, flag `battle.first_hollowling`, kembali ke dunia. Encounter scripted satu kali; random encounter/cooldown tidak dibuat.
- [x] 273 unit test + strict TypeScript + build; hasil browser terakhir dicatat di PHASE2_REPORT.md.
- [ ] Gate visual final: potongan pedang/piksel tepi dalam atlas sumber dan review manusia. Status aset tetap NEEDS_REVIEW; Phase 2 tidak diklaim PASS penuh.

## Phase 3 — RPG / Save

- [x] EXP/level berbasis data, shared inventory, equipment weapon/armor dan dua pasif DRAFT.
- [x] Tiga slot manual + autosave aman + Load/Continue nyata setelah refresh.
- [x] Shop buy/sell reusable + currency/stock/rollback, hanya harness QA tanpa merchant baru di hutan.
- [x] Pause Status/Inventaris/Perlengkapan/Jurus/Simpan-Muat terhubung, Settings tetap terpisah/persisten.
- [x] Save v2, migrasi v1 read-only, backup, corruption/quota/storage blocked handling; hasil unit/browser akhir di PHASE3_REPORT.md.
- [ ] Review manusia untuk pilihan pasif/angka DRAFT dan UI baru pada layar nyata; bukan fitur Phase 4 yang dikerjakan otomatis.

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


## Asset production backlog v3

- [ ] Approve 9 character portraits and true expression variants; verify face/costume consistency.
- [ ] Draw grid-based exploration atlases for 9 characters and battle atlases only C01–C04.
- [ ] Draw 6 regular and 4 boss encounters; B04 shares C04 identity/staff.
- [ ] Author ground slam, hand magic, forest summon, twig growth, staff temporal attacks, meteor/shield VFX.
- [ ] Receive original music from Game Director; preserve silent fallback.
- [ ] Review DRAFT lines and supply private modern memories if desired.
