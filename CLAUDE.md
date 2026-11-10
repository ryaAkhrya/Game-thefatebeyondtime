# Instruksi Claude Code — The Fate Beyond Time

1. Baca `README.md`, `RULES.md`, `GDD.md`, `LORE_BIBLE.md`, `FULL_STORY.md`, `SCENE_DIRECTION.md`, `GAME_SYSTEMS.md`, `SKILLS_AND_BOSSES.md`, `ASSET_INDEX.md`, `AUDIO_COMPOSER_HANDOFF.md`, `TECHNICAL_DESIGN.md`, `PHASES.md`, `TASKS.md`, `QA_CHECKLIST.md`.
2. Canon cerita ada di `docs/source/CERITA_APPROVED_REVISI_02.docx`. Jika dokumen kerja berbenturan, canon di atas menang. Detail dialog kerja belum approved.
3. Implementasi satu phase per sesi di `web/`: desktop 16:9, keyboard, Phaser 4.2.1, TypeScript, Vite. **Phase 3 diimplementasikan (10 Nov 2026)**: C1-01..04 playable dengan EXP/level, inventory, equipment, dua pasif DRAFT, tiga slot manual/autosave/Continue. Baca `docs/production/PHASE3_REPORT.md` untuk status QA akhir dan `SESSION_HANDOFF.md`. Schema save_v2/data v2 tetap memakai namespace key `tfbt.save.v1.*` agar slot lama tidak hilang; migrasi hanya di memori sampai save berikutnya. Jangan lanjut Phase 4 atau membuat commit/push tanpa instruksi user. Aset Phase 2 tetap NEEDS_REVIEW. Jangan beralih ke Godot/EXE.
4. 18 entitas unik: sembilan C, enam M, tiga boss selain B04; B04 = C04 Varlgrim. Jangan membuat varian jam pasir sebagai canon.
5. Aset aktif adalah **v3.3** (v3.2 digantikan; jangan dipakai). Jangan pakai crop referensi sebagai texture final. Aset baru hanya setelah verifikasi frame, grid, transparansi, kesamaan wajah dan kostum. Catat status sebenar di `ASSET_INDEX.md`.
6. Tidak boleh memilih, mengunduh, mengarang, atau memasukkan BGM. Minta komposisi dari user sesuai `AUDIO_COMPOSER_HANDOFF.md`; jika belum ada, `AWAITING_COMPOSER`, game berjalan tanpa musik.
7. Data personal modern hanya dari Game Director, per asset dengan persetujuan. Build publik tidak memuatnya.
8. Sebelum mulai phase, sebut deliverable dan gate; setelah phase, catat build, tests, visual QA, sisa masalah. Jangan menganggap checkbox selesai tanpa bukti.
9. Instalasi dan cache proyek tetap di drive D: (`web/node_modules`, `.dev-cache/`). Di PowerShell, jalankan `. .\web\scripts\dev-env.ps1` sebelum npm. Jangan mengubah konfigurasi npm global/PATH.
