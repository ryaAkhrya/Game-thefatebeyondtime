# PHASE ROADMAP — DESKTOP WEB (CLAUDE CODE)

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

**STATUS: PARTIAL — C1-04 playable, gate visual sumber dan review manusia belum selesai (10 November 2026).** Bukti: `PHASE2_REPORT.md`.

**Tujuan:** satu duel Yaric vs Hollowling yang dapat dimenangkan/kalah dan kembali ke map.

Scope:
- Classic side-view, Attack/Skill/Item/Defend/Run; enemy AI sederhana.
- HP/MP/stat, turn order, damage/heal, win/lose/escape/reward idempotent.
- Encounter C1-04 scripted satu kali; victory kembali ke dunia, defeat/retry dari checkpoint. Random encounter/cooldown ditunda mengikuti scope terbaru Game Director.
- Unit tests battle engine terpisah dari Phaser rendering.

Out of scope: 4 boss, party Torvan, semua status dan animasi final.

DoD: tidak ada softlock/double reward; perintah navigasi keyboard, audio dan effect Settings benar, console tanpa error kritis.

## Phase 3 — RPG State / Save

**STATUS: SELESAI (PHASE 3 PASS) — 10 November 2026.** 378 unit test, strict TypeScript, build dan 311 browser checks produksi lulus; bukti/batasan di PHASE3_REPORT.md. Progression, shared inventory, equipment, skill tree, shop foundation terisolasi, tiga slot manual, autosave aman, Continue, migration/backup berfungsi. Review balancing/art/manusia tetap terbuka; Phase 4 belum dimulai.

**Tujuan:** progress persistent setelah browser ditutup/dibuka.

Scope:
- EXP, level-up, satu node skill tree, status, inventory, 1 potion + 1 equipment.
- Main quest flags dan peti satu-kali, basic pause inventory/skills.
- Manual save dan autosave, Continue, versioned storage validation, error handling, save unavailable warning.
- Settings lengkap sesuai `docs/design/SETTINGS_SPEC.md` (semua input dan persist, jika belum tuntas di Phase 0).

Out of scope: semua quest toko, memory/foto modern.

DoD: refresh → Continue memuat HP, MP, quest, item, skill, posisi, flags; Settings tetap sesuai perubahan; save korup tidak crash.

## Phase 4 — MVP 0.1 (Vertical Slice)

**Tujuan:** demo Chapter I 10–15 menit bisa dimainkan di browser PC dari Title → Ending Demo.

Scope:
- Integrasi Phase 0–3, start intro Yaric di hutan, temui Nambo, peti, Hollowling, progress EXP, Save/Continue, akhir demo.
- Title menu `New Game / Continue / Settings / Controls`, pause, Settings fully functional, fokus keyboard jelas.
- QA 1366×768 dan 1920×1080, browser loading, fullscreen exit, tab blur, audio autoplay, data storage.
- Build statis `web/dist`, test preview production.

Out of scope: Chapter I penuh, semua boss, ending anniversary, sprite final, deployment publik otomatis.

DoD: test di `docs/production/MVP_0_1.md` + `docs/quality/QA_CHECKLIST.md` lulus. Build dijalankan browser desktop tanpa error kritis, termasuk settings dan save.

## Phase 5 — Full Story Production

P5A: Chapter I penuh (Mournfang, Aveloria, Talric, Azie, Velthia). P5B: Chapter II (Liora, Zira, Torvan, Veyrath). P5C: Chapter III (evakuasi Velthia, party swap, kuil, Chronolith, janji). P5D: Chapter IV (Varlgrim, Heart, Torvan reveal) → **modern interlude sesudah IV** → epilog tebing flashback. Semua 40 beat selesai lewat scene director dan script yang sudah direview manusia.

Scope tambahan: toko, equipment lanjutan, AI musuh, side quests singkat, art final sketsa, audio user, public/private assets sesuai izin.

Gate: tiap bab dapat dimainkan lengkap; evidence story flags & metadata; semua perubahan cerita dari approved R02 harus memperoleh approval, tidak boleh dianggap improvisasi bebas Claude.

## Phase 6 — Polish & Release

Balancing, performa desktop, pixel consistency, localization Indonesian proofreading, Settings full QA, audio mixing, accessibility reduced effects, save migration, browser compatibility, load time, public/private security audit, final credits, review beberapa pemain, static hosting jika user memerintahkan.

**Output:** build statis web dengan URL setelah dideploy oleh pemilik; bukan game Windows executable.
