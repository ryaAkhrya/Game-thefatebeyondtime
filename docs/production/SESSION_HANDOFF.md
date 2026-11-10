# SESSION HANDOFF — FOR CLAUDE CODE (v2.0, diperbarui setelah Phase 0)

- **Tanggal:** 10 November 2026. Phase 0/1 selesai. **Phase 2 playable, PARTIAL pada gate visual sumber/review manusia** (`PHASE2_REPORT.md`); kode di `web/`. Phase 3–6 belum dimulai.
- Proyek adalah website **PC/laptop browser only**: Phaser 4.2.1 + TypeScript + Vite, VS Code/IDE + Claude Code. **Bukan Godot / file EXE**.
- Empat chapter, 40 beat (termasuk M-01..03) dan epilog. Source cerita **Cerita Revisi 02 APPROVED**; jangan pakai timeline lama yang memperlihatkan memori modern dalam Chapter IV.
- Detail Varlgrim, Torvan, Velthia, lore: `docs/narrative/LORE_BIBLE.md`.
- Empat sheet konsep sudah menjadi referensi identitas karakter. Aset individual v3.1 masih DRAFT sampai review Game Director.
- Settings wajib di title dan pause, tersimpan, berfungsi (volume, text speed, fullscreen, scale, reduced effects); baca `docs/design/SETTINGS_SPEC.md`.
- P.S. anniversary, foto/kenangan dan musik user belum tersedia. Jangan fabricate. Public build tidak boleh membundel asset private.
- Tugas berikutnya: review visual Phase 2; **Phase 3 hanya setelah instruksi baru**. Mulai dengan `. .\web\scripts\dev-env.ps1` lalu `cd web; npm run dev`. Verifikasi `npm run verify` dan `npm run test:e2e`. Gunakan `E2E_URL` untuk server existing.
- Battle memakai atlas **v3.3** (NEEDS_REVIEW), salinan PNG/JSON utuh di `web/public/assets/battle/`. Battle v3.2 ditolak registry; eksplorasi Yaric v3.2 tetap sah karena belum ada atlas eksplorasi v3.3.
- Instalasi dan cache proyek di drive D: (`web/node_modules`, `.dev-cache/`). Jangan mengubah konfigurasi npm global/PATH.
- Phase 1: resolusi internal 640x360, UI di ruang 320x180 lewat `configureUiCamera`. Cerita: `story/Chapter1Story.ts` (murni) -> `WorldScene` mengeksekusi aksi. Dialog: `dialogue/chapter1.ts` dites terhadap `DIALOGUE_EVENTS.json`.
- Aset DRAFT: lingkungan Hutan 1 (dibuat `web/scripts/gen-forest-art.mjs`), sprite Nambo (kualitas rendah, perlu pengganti), potret diperkecil dari PNG ekspresi. Jangan menganggapnya final.
- Empat teks UI sistem bukan dari naskah (DRAFT_IMPL) tercantum di `PHASE1_REPORT.md` untuk direview.

- Phase 2: `combat/BattleEngine.ts` murni (prepare → impact → finish); `BattleSession.ts` checkpoint/retry dan victory commit; `BattleScene` hanya playback/input; `BattlePanel` UI terpisah. 273 unit tests lulus. Hasil browser/known limitations lihat PHASE2_REPORT.md.
- Flag resmi C1-04: `battle.first_hollowling`. Baris L001 sebelum duel; L002/L003 setelah kemenangan. Akhir demo Phase 1 kini transisi battle. World kembali di y=100, di luar trigger, mencegah re-entry.
- HP/MP sesi opsional `GameStateData.vitals`; full persistence belum ada. Potion engine transactional; kemenangan commit konsumsi, defeat/retry rollback checkpoint. Tidak ada EXP/gold palsu.
- Atlas asli mengandung potongan pedang di tepi beberapa frame. Jangan redraw atau menyebut art final; penggantian artist harus tetap mengikuti desain approved. Hollowling pivot [48,48], Yaric [48,95], VFX [48,63]; scene menempatkan titik bawah pada y=130.
