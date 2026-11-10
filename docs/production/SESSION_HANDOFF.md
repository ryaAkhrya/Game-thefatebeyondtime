# SESSION HANDOFF — FOR CLAUDE CODE (v2.0, diperbarui setelah Phase 0)

- **Tanggal:** 10 November 2026. Phase 0–2 playable; **Phase 3 RPG/persistence diimplementasikan**, status tes akhir di `PHASE3_REPORT.md`. Phase 4–6 belum dimulai. Art Phase 2 tetap NEEDS_REVIEW.
- Proyek adalah website **PC/laptop browser only**: Phaser 4.2.1 + TypeScript + Vite, VS Code/IDE + Claude Code. **Bukan Godot / file EXE**.
- Empat chapter, 40 beat (termasuk M-01..03) dan epilog. Source cerita **Cerita Revisi 02 APPROVED**; jangan pakai timeline lama yang memperlihatkan memori modern dalam Chapter IV.
- Detail Varlgrim, Torvan, Velthia, lore: `docs/narrative/LORE_BIBLE.md`.
- Empat sheet konsep sudah menjadi referensi identitas karakter. Aset individual v3.1 masih DRAFT sampai review Game Director.
- Settings wajib di title dan pause, tersimpan, berfungsi (volume, text speed, fullscreen, scale, reduced effects); baca `docs/design/SETTINGS_SPEC.md`.
- P.S. anniversary, foto/kenangan dan musik user belum tersedia. Jangan fabricate. Public build tidak boleh membundel asset private.
- Tugas berikutnya: review hasil Phase 3; **Phase 4 hanya setelah instruksi baru**. Dot-source `web/scripts/dev-env.ps1`; `npm run verify`, `npm run test:e2e`. `E2E_URL` memakai server existing, `E2E_SUITES=phase3.mjs` untuk focused browser QA. Tidak ada commit/push otomatis.
- Battle memakai atlas **v3.3** (NEEDS_REVIEW), salinan PNG/JSON utuh di `web/public/assets/battle/`. Battle v3.2 ditolak registry; eksplorasi Yaric v3.2 tetap sah karena belum ada atlas eksplorasi v3.3.
- Instalasi dan cache proyek di drive D: (`web/node_modules`, `.dev-cache/`). Jangan mengubah konfigurasi npm global/PATH.
- Phase 1: resolusi internal 640x360, UI di ruang 320x180 lewat `configureUiCamera`. Cerita: `story/Chapter1Story.ts` (murni) -> `WorldScene` mengeksekusi aksi. Dialog: `dialogue/chapter1.ts` dites terhadap `DIALOGUE_EVENTS.json`.
- Aset DRAFT: lingkungan Hutan 1 (dibuat `web/scripts/gen-forest-art.mjs`), sprite Nambo (kualitas rendah, perlu pengganti), potret diperkecil dari PNG ekspresi. Jangan menganggapnya final.
- Empat teks UI sistem bukan dari naskah (DRAFT_IMPL) tercantum di `PHASE1_REPORT.md` untuk direview.

- Phase 2: `combat/BattleEngine.ts` murni (prepare → impact → finish); `BattleSession.ts` checkpoint/retry dan victory commit; `BattleScene` hanya playback/input; `BattlePanel` UI terpisah. 273 unit tests lulus. Hasil browser/known limitations lihat PHASE2_REPORT.md.
- Flag resmi C1-04: `battle.first_hollowling`. Baris L001 sebelum duel; L002/L003 setelah kemenangan. Akhir demo Phase 1 kini transisi battle. World kembali di y=100, di luar trigger, mencegah re-entry.
- Catatan historis Phase 2: HP/MP dahulu opsional, persistence/EXP/gold belum diimplementasikan saat itu. **Digantikan Phase 3**: vitals wajib di schema v2, shared inventory, reward EXP/gold dan save/load penuh (lihat handoff di bawah). Defeat/retry tetap rollback checkpoint.
- Atlas asli mengandung potongan pedang di tepi beberapa frame. Jangan redraw atau menyebut art final; penggantian artist harus tetap mengikuti desain approved. Hollowling pivot [48,48], Yaric [48,95], VFX [48,63]; scene menempatkan titik bawah pada y=130.

## Phase 3 handoff terkini

- `rpg/definitions`, `progression`, `inventory`, `actions`, `validation` adalah data/logika murni. `GameState.items` tetap satu inventory untuk dunia, battle, equipment dan shop. HP/MP Yaric di `vitals`; stat efektif = base level + equipment + pasif.
- Hollowling 25 EXP +8 emas; level 2 pada 25 EXP, HP/MP max naik 12/2, skill point +1. Pasif ATK+2 atau DEF+2, masing-masing 1 poin, DRAFT. Ground Slam tetap jurus awal 4 MP. Stat level 1 efektif sama dengan Phase 2.
- `SaveRepository` tetap satu storage boundary. Envelope `save_v2`, data `schemaVersion:2`; key tetap `tfbt.save.v1.{auto,slot1,slot2,slot3}`. Tidak mengganti namespace agar slot lama tetap ditemukan. v1 diverifikasi checksum lalu dimigrasikan di memori, tanpa rewrite otomatis saat read.
- Save valid sebelumnya menjadi `<key>.backup` sebelum overwrite; corrupt/missing primary dapat memakai backup tervalidasi. Versi future dilindungi. Quota/read/write errors tidak menghapus slot lama atau mengklaim sukses.
- `SaveCoordinator` memblokir writes selama battle/dialog/transition. Autosave setelah story flags selesai (termasuk NPC step aside), wrap checkpoint, sebelum battle, dan setelah dialog victory selesai. Manual save/load melalui Pause; load mengosongkan antrean autosave sesi lama.
- Semua layar baru: RpgMenuScene, SaveLoadScene, ShopScene. Shop hanya `?qa=1` → `__tfbt.qa.shop()`; tidak ada Derrria/merchant dalam cerita Hutan 1. Simpan lokal browser; hapus site data dapat menghapus progress.
- Perubahan skill/equipment/item melalui menu perlu manual save atau checkpoint berikutnya; jangan mengklaim setiap keypress otomatis disimpan. Tidak ada save objek Phaser, tidak ada BGM/SFX baru atau deployment.
