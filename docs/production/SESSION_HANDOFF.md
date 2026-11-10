# SESSION HANDOFF — FOR CLAUDE CODE (v2.0, diperbarui setelah Phase 0)

- **Tanggal:** 10 November 2026. **Phase 0 dan Phase 1 selesai** (`PHASE0_REPORT.md`, `PHASE1_REPORT.md`); kode ada di `web/`. Phase 2–6 belum dimulai.
- Proyek adalah website **PC/laptop browser only**: Phaser 4.2.1 + TypeScript + Vite, VS Code/IDE + Claude Code. **Bukan Godot / file EXE**.
- Empat chapter, 40 beat (termasuk M-01..03) dan epilog. Source cerita **Cerita Revisi 02 APPROVED**; jangan pakai timeline lama yang memperlihatkan memori modern dalam Chapter IV.
- Detail Varlgrim, Torvan, Velthia, lore: `docs/narrative/LORE_BIBLE.md`.
- Empat sheet konsep sudah menjadi referensi identitas karakter. Aset individual v3.1 masih DRAFT sampai review Game Director.
- Settings wajib di title dan pause, tersimpan, berfungsi (volume, text speed, fullscreen, scale, reduced effects); baca `docs/design/SETTINGS_SPEC.md`.
- P.S. anniversary, foto/kenangan dan musik user belum tersedia. Jangan fabricate. Public build tidak boleh membundel asset private.
- Phase berikutnya: **Phase 2** (Battle), hanya setelah user memerintahkan. Mulai dengan `. .\web\scripts\dev-env.ps1` lalu `cd web; npm run dev`. Verifikasi dengan `npm run verify` dan `npm run test:e2e`.
- Aset visual aktif = **v3.3** (NEEDS_REVIEW, belum ada yang diimpor ke `web/public`). Aset v3.2 digantikan; `AssetRegistry` menolaknya.
- Instalasi dan cache proyek di drive D: (`web/node_modules`, `.dev-cache/`). Jangan mengubah konfigurasi npm global/PATH.
- Phase 1: resolusi internal 640x360, UI di ruang 320x180 lewat `configureUiCamera`. Cerita: `story/Chapter1Story.ts` (murni) -> `WorldScene` mengeksekusi aksi. Dialog: `dialogue/chapter1.ts` dites terhadap `DIALOGUE_EVENTS.json`.
- Aset DRAFT: lingkungan Hutan 1 (dibuat `web/scripts/gen-forest-art.mjs`), sprite Nambo (kualitas rendah, perlu pengganti), potret diperkecil dari PNG ekspresi. Jangan menganggapnya final.
- Empat teks UI sistem bukan dari naskah (DRAFT_IMPL) tercantum di `PHASE1_REPORT.md` untuk direview.
