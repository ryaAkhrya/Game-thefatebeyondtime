## Phase 10 — perbaikan visual berdasarkan concept art

Implementasi: cast eksplorasi C02–C09, empat battle yang masih primitif, dan latar/pose ending. Panduan komposisi 13 cue BGM ditulis; musik tidak dibuat. Laporan hasil otomatis dan review manusia: [PHASE10_REPORT](docs/production/PHASE10_REPORT.md). Phase 11 tersisa untuk final QA/release preparation setelah review seni, musik dan konten pribadi. Tidak ada deployment otomatis.

# PHASE ROADMAP — DESKTOP WEB (CLAUDE CODE)

## Phase 9 — Modern Interlude / Epilog / Memories / Credits (13 November 2026)

**FUNCTIONAL PASS — PERSONAL CONTENT & HUMAN REVIEW PENDING.**

Diotorisasi oleh instruksi Phase 9 Game Director. Implementasi cerita modern sesudah IV, artefak dan fragmen, tebing sebagai kenangan Aveloria, janji E-02, awan/siluet, To Be Continued, credits, completion dan replay. Pondasi foto/pesan privat terpisah dari public bundle; konten asli belum tersedia. Status otomatis dan review manusia di `docs/production/PHASE9_REPORT.md`; kontrak save dan panduan privat di laporan terkait. Catatan larangan Phase 9 dalam riwayat Phase 8 kini historis. Scope berhenti sebelum final polish/release/deployment.

## Phase 8 otonom — Chapter IV: The Fate (instruksi terbaru)

Instruksi Phase 8 mengotorisasikan Chapter IV (C4-01..07) dari akhir Bab III sampai Heart of Time selesai dan kembali ke Aveloria: Warden Fortress (teka-teki pengamatan, encounter, checkpoint), boss akhir Varlgrim (tiga fase), meteor + Ultimate Perlindungan Velthia, level cap 10 dengan kompatibilitas save lama, SFX asli (bukan BGM) dan pixel art DRAFT. Status **FUNCTIONAL PASS — VISUAL/AUDIO/BALANCE REVIEW PENDING**; bukti dan sisa masalah: `docs/production/PHASE8_REPORT.md`. **Modern Interlude, Epilog, kredit akhir, pesan anniversary dan data personal modern TIDAK termasuk dan tidak boleh dimulai tanpa instruksi baru.** Tidak ada commit/push/deploy otomatis.

## Riwayat Phase 7 — Chapter III + combat sinematik + SFX asli

Instruksi Phase 7 mengotorisasikan Chapter III (C3-01..07) sampai akhir bab, Velthia sebagai anggota party, Kuil Jejak, boss Chronolith, transisi battle 4 kategori, linimasa aksi/hitstop, pustaka VFX piksel dan SFX asli (bukan BGM). Status **FUNCTIONAL PASS — VISUAL/AUDIO REVIEW PENDING**; bukti dan sisa masalah: `docs/production/PHASE7_REPORT.md`. Bab IV, Varlgrim sebagai boss, meteor, dan Ultimate Perlindungan TIDAK termasuk.

## Riwayat Phase 6 — Chapter II: Whispers of Fate

Instruksi Phase 6 terbaru mengotorisasikan Chapter II C2-01..09 dari akhir Bab I sampai penutup laporan Velthia. Implementasi mencakup Liora, Hutan 2, Zira, Torvan sebagai anggota kedua, combat dua karakter, M01/M02/M03, Veyrath, fragmen, serta save/load yang tetap menerima Bab I. Status QA aktual dan keterbatasan: `docs/production/PHASE6_REPORT.md`. Bab III tidak termasuk. Penomoran "Phase 6 — Polish & Release" di roadmap lama di bawah adalah rencana historis, bukan scope instruksi terbaru.

## Riwayat Phase 5 — Chapter I Completion

Instruksi 10 November 2026 mengotorisasikan **sisa Chapter I saja**, bukan seluruh rencana Full Story Production lama. C1-06..09 telah diimplementasikan: Aveloria/Talric/Azie/Velthia/lonceng/penutup, dengan pasar Derrria, collision/kamera, portrait/choice dan save kota. Runtime tetap Chapter I/party solo. QA akhir/status: `docs/production/PHASE5_REPORT.md` (root) / `PHASE5_REPORT.md` (folder produksi).

Gate aktual: baseline 405 unit/375 Edge/38 Chrome/38 dev diulang; **PHASE 5 PASS fungsional/QA otomatis:** 460 unit, 484 produksi Edge, 113 Chrome dan 113 dev Edge, strict TS/build. Art/naskah/scene direction DRAFT memerlukan review manusia. **Chapter II tidak playable dan tidak boleh dimulai tanpa instruksi baru.** Rencana P5B–D di bawah tetap backlog.


**Satu phase pada satu waktu.** Tidak ada game yang dianggap berjalan hanya karena ada kode. Setelah Phase 0–4: MVP web playable; Phase 5–6: cerita lengkap dan rilis.

## Gerbang umum untuk setiap phase

Sebelum selesai: (1) kode di `web/`, (2) `npm run build` lulus, (3) tes unit / browser yang relevan dijalankan, (4) keyboard-only dipastikan, (5) visual & dialog lulus RULES.md, (6) update `docs/production/TASKS.md`, `docs/production/CHANGELOG.md`, `docs/production/SESSION_HANDOFF.md`, (7) **laporkan hal yang tidak dites**. Satu bug kritis bisa menggagalkan satu phase.

## Phase 0 — Web Foundation

**STATUS: SELESAI (PASS) — 10 November 2026.** Bukti dan daftar yang belum diuji: `docs/production/PHASE0_REPORT.md`.

**Tujuan:** repo Phases/Vite/TS siap dipakai Claude Code dan title/settings kerangka bisa dijalankan di browser.

Scope:
- Dari template Phaser 4 + Vite + TypeScript, buat `web/`, `package.json`, lockfile, lint/typecheck/build scripts seperlunya; pin Phaser ke rilis terverifikasi **4.2.1**.
- Boot/Title Scene, ukuran internal provisional 16:9, nearest pixel scaling, fokus keyboard dan ability menampilkan title menu.
- Buat `SettingsRepository` dan panel Settings sederhana yang menyimpan pilihan (UI artistik tetap placeholder). Tombol Settings harus benar-benar terbuka dari title; slider draf awal boleh terbatas jika jujur, tapi Phase 4 harus lengkap.
- Setup GameState, typed IDs, placeholder asset registry, basic storage detection, gitignore dan README perintah run/build.
- Konfigurasi static export Vite, deteksi desktop-only, browser audio requires gesture.

Out of scope: cerita penuh, sprite final, battle, foto personal, hosting publik.

DoD: `npm run dev` menampilkan title di browser desktop; `npm run build` sukses; keyboard menavigasi title; menu Settings membuka/menutup tanpa error dan nilai tersimpan; status tes terlapor.

## Phase 1 — Exploration / Dialogue

**STATUS: SELESAI (PASS) — 10 November 2026.** Intro Chapter I (C1-01..C1-03) dapat dimainkan; bukti dan daftar yang belum diuji: `docs/production/PHASE1_REPORT.md`. Catatan: DoD menyebut Nambo, papan/peti, dan Pause->Settings; semuanya terpenuhi dan diuji. Resolusi internal dinaikkan ke 640x360.

**Tujuan:** hutan demo dikendalikan pemain dengan NPC.

Scope:
- Yaric placeholder walk 4 arah, collision, camera, map forest kecil.
- Nambo, percakapan bahasa Indonesia, text speed dari Settings, papan/peti.
- Prompt interaksi keyboard, scene transitions + safe zone markers.
- Entity IDs dan return coordinates stabil.

Out of scope: full Chapter I, Mournfang, UI final.

DoD: 60–90 detik pemain bisa berjalan, ngobrol, memeriksa objek; collision benar, dialogue tidak double advance, settings tetap bisa dibuka lewat pause.

## Phase 2 — Turn-Based Battle

**STATUS: PARTIAL — gameplay C1-04 diimplementasikan dan playable, gate visual masih terbuka (10 November 2026).** Lihat `docs/production/PHASE2_REPORT.md`; atlas sumber memiliki potongan/tepi gambar yang perlu cleanup oleh artist dan belum direview manusia.

**Tujuan:** satu duel Yaric vs Hollowling yang dapat dimenangkan/kalah dan kembali ke map.

Scope:
- Classic side-view, Attack/Skill/Item/Defend/Run; enemy AI sederhana.
- HP/MP/stat, turn order, damage/heal, win/lose/escape/reward idempotent.
- Encounter C1-04 scripted satu kali, victory kembali ke dunia, defeat/retry memakai checkpoint aman. Random encounter/cooldown ditunda sesuai scope Phase 2 terbaru dari Game Director.
- Unit tests battle engine terpisah dari Phaser rendering.

Out of scope: 4 boss, party Torvan, semua status dan animasi final.

DoD: tidak ada softlock/double reward; perintah navigasi keyboard, audio dan effect Settings benar, console tanpa error kritis.

## Phase 3 — RPG State / Save

**STATUS: SELESAI (PHASE 3 PASS) — 10 November 2026.** 378 unit test, strict TypeScript, build dan 311 browser checks produksi lulus; bukti/batasan di `docs/production/PHASE3_REPORT.md`. RPG data murni, shared inventory, equipment, skill points, shop foundation tanpa NPC baru, manual slots/autosave/Continue dan migration/backup berfungsi. Review balancing/art/manusia tetap terbuka; Phase 4 tidak dimulai otomatis.

**Tujuan:** progress persistent setelah browser ditutup/dibuka.

Scope:
- EXP, level-up, satu node skill tree, status, inventory, 1 potion + 1 equipment.
- Main quest flags dan peti satu-kali, basic pause inventory/skills.
- Manual save dan autosave, Continue, versioned storage validation, error handling, save unavailable warning.
- Settings lengkap sesuai `docs/design/SETTINGS_SPEC.md` (semua input dan persist, jika belum tuntas di Phase 0).

Out of scope: semua quest toko, memory/foto modern.

DoD: refresh → Continue memuat HP, MP, quest, item, skill, posisi, flags; Settings tetap sesuai perubahan; save korup tidak crash.

## Phase 4 — MVP 0.1 (Vertical Slice)

**STATUS: SELESAI (PHASE 4 PASS, fungsional/QA otomatis) — 10 November 2026.** 405 unit, 375 browser produksi Edge, 38 Chrome dan 38 dev Edge, strict TS/build lulus. Bukti/backlog di `docs/production/PHASE4_REPORT.md`. Instruksi Phase 4 terbaru memasukkan Mournfang ke MVP. Art/balancing/pacing manusia perlu review; Aveloria/Velthia dan seluruh Chapter I belum selesai. Phase 5/Chapter II belum dimulai.

**Tujuan:** demo Chapter I 10–15 menit bisa dimainkan di browser PC dari Title → Ending Demo.

Scope:
- Integrasi Phase 0–3: intro Yaric, Nambo, loop/peti, Hollowling/reward/RPG, checkpoint tepi hutan, Mournfang/telegraph/counter/retry, Save/Continue sebelum/sesudah boss, penutup menuju Aveloria.
- Title menu `New Game / Continue / Settings / Controls`, pause, Settings fully functional, fokus keyboard jelas.
- QA 1366×768 dan 1920×1080, browser loading, fullscreen exit, tab blur, audio autoplay, data storage.
- Build statis `web/dist`, test preview production.

Out of scope: Chapter I penuh/Aveloria/Velthia, boss selain B01, ending anniversary, sprite final, deployment publik otomatis.

DoD: test di `docs/production/MVP_0_1.md` + `docs/quality/QA_CHECKLIST.md` lulus. Build dijalankan browser desktop tanpa error kritis, termasuk settings dan save.

## Phase 5 — Full Story Production

P5A: sisa Chapter I setelah Mournfang (Aveloria, Talric, Azie, Velthia; review boss/aset). P5B: Chapter II (Liora, Zira, Torvan, Veyrath). P5C: Chapter III (evakuasi Velthia, party swap, kuil, Chronolith, janji). P5D: Chapter IV (Varlgrim, Heart, Torvan reveal) → **modern interlude sesudah IV** → epilog tebing flashback. Hanya setelah instruksi baru; semua 40 beat memerlukan scene director dan review naskah manusia.

Scope tambahan: toko, equipment lanjutan, AI musuh, side quests singkat, art final sketsa, audio user, public/private assets sesuai izin.

Gate: tiap bab dapat dimainkan lengkap; evidence story flags & metadata; semua perubahan cerita dari approved R02 harus memperoleh approval, tidak boleh dianggap improvisasi bebas Claude.

## Phase 6 — Polish & Release

Balancing, performa desktop, pixel consistency, localization Indonesian proofreading, Settings full QA, audio mixing, accessibility reduced effects, save migration, browser compatibility, load time, public/private security audit, final credits, review beberapa pemain, static hosting jika user memerintahkan.

**Output:** build statis web dengan URL setelah dideploy oleh pemilik; bukan game Windows executable.


## Pre-phase art/narrative gate v3

Before importing assets, replace reference crops with authored frame atlases and human-reviewed expressions. Before final boss implementation, review meteor fairness and Ultimate economy. Composer files remain AWAITING_COMPOSER.
