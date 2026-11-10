# TASKS — STATUS SEBENARNYA

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
