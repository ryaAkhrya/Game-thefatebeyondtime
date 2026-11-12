# Phase 7 — Status WIP (snapshot sebelum jeda)

**Status: PARTIAL / IN PROGRESS.** Bukan laporan akhir. `PHASE7_REPORT.md` belum ditulis.

## Sudah ada (kode + tes unit)
- Transisi battle 4 kategori + return (`TransitionScene`, `combat/presentation.ts`, `SceneRouter`), linimasa aksi data-driven + hitstop (`BattleScene`), langkah kaki berbasis jarak (`world/footsteps.ts`).
- Bab III: dialog 38 skrip (65 baris canon verbatim), Aveloria krisis (`AveloriaCrisisView`), Kuil Jejak (`TempleView`, 3 teka-teki), party switch Yaric+Velthia (Torvan cadangan terjaga), Velthia 5 jurus, Oathguard, Chronolith (telegraf, guard, rewind), encounter + save/validasi, `Chapter3Story`, "Mulai Bab III".
- Seni DRAFT: atlas battle Velthia/Chronolith/Oathguard, aset krisis kota, aset kuil, pustaka VFX piksel (5 atlas, 24 efek).
- SFX asli (44 id, 53 WAV, sintesis kode, generator `web/scripts/sfx`) terpasang di UI, langkah, battle. BGM tidak dibuat (tetap AWAITING_COMPOSER).
- Terverifikasi: `tsc` bersih; 1049 tes unit lulus; build produksi OK; tangkapan layar browser untuk Aveloria krisis, Kuil, Chronolith, Oathguard terlihat sesuai.

## Belum selesai / belum diverifikasi
- Suite `tests/e2e/phase7.mjs` sudah ditulis tetapi **belum pernah dijalankan**.
- Regresi E2E penuh (Phase 0–6, Sprint 1–2) pada build ini **belum selesai**; smoke melapor 83/84 sebelum pengecekan "tanpa file musik" diperbaiki agar mengizinkan SFX `.wav`.
- Belum: pengujian Chrome, ukur performa sebelum/sesudah, QA 1920x1080 untuk Bab III, kualitas suara belum didengar manusia (AUDIO-REVIEW PENDING), kualitas seni DRAFT/NEEDS_REVIEW.
- Dokumen belum diperbarui: `PHASE7_REPORT.md`, `SFX_DESIGN_AND_MANIFEST.md` (ada dari agen), CLAUDE.md, README, PHASES, TASKS, QA_CHECKLIST, AUDIO_COMPOSER_HANDOFF. `BATTLE_TRANSITION_AND_PACING_SPEC.md` ditulis; angka terukur menunggu E2E.
- Keputusan desain terbuka: level cap game = 5 (brief menyebut level 8–10); Velthia masuk di L4.
