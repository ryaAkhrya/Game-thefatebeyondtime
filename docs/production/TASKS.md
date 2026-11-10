# TASKS — STATUS SEBENARNYA

**Phase 0 (10 Nov 2026) dan Phase 1 (10 Nov 2026) selesai** — bukti di `docs/production/PHASE0_REPORT.md` dan `PHASE1_REPORT.md`. Phase 2–6 belum dikerjakan. Jangan tandai phase selesai sebelum ada bukti kode+tes.

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

- [ ] Side-view battle vs Hollowling.
- [ ] Attack/Skill/Item/Defend/Run dan target.
- [ ] HP/MP, AI, status dasar, menang/kalah/escape.
- [ ] Reward once, return context, cooldown.
- [ ] Unit+browser tests.

## Phase 3 — RPG / Save

- [ ] EXP/level/skill, inventory/equipment.
- [ ] Manual save, autosave, load, Continue.
- [ ] Settings lengkap + persist + fullscreen error handling.
- [ ] Save corruption/storage blocked handling.

## Phase 4 — MVP

- [ ] Alur 10–15 menit lengkap dari title sampai demo end.
- [ ] Full Settings acceptance.
- [ ] QA Chrome/Edge, 1366x768/1080p, dev/preview build.
- [ ] `npm run build` dan evidence playthrough.

## Phase 5 — Full game

- [ ] Chapters I–IV, modern interlude, epilog (40 beat) dan semua RPG systems.
- [ ] Review aset individual dari source sheet terpilih → art produksi setelah uji visual dan game.
- [ ] Audio buatan user & media personal diberi izin, private build terpisah.

## Phase 6 — Release

- [ ] Polish, balancing, bugs, Settings, browser compatibility, legal asset audit.
- [ ] Hosting static **hanya setelah user meminta deploy**.

## Template handoff task

`Task ID` / `Phase` / `File berubah` / `Test dijalankan + hasil` / `Screenshots` / `Known issues` / `Next steps`. Ubah checkbox berdasarkan bukti, bukan karena file dibuat.
