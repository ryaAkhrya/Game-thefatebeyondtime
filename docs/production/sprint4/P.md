# Sprint 4 — Agen P (progression): level cap 10, ledger migrasi

Dokumen utama: `docs/production/PROGRESSION_LEVEL10.md` (kurva, tabel EXP per bab, stat per level, pasif, ledger, batas jujur). Status: DRAFT; tidak ada playtest manusia.

## Apa dibuat / diubah
- `web/src/game/rpg/definitions.ts`: `LEVEL_THRESHOLDS = [0,25,70,140,235,300,395,500,650,800]`, `MAX_LEVEL=10`, `EXP_CAP=800`; `ProgressionProfile` + `lateGrowth?`/`lateFromLevel?`; growth L6-10 untuk ketiga profil; 6 pasif DRAF (Yaric: `keen_edge`, `deep_breath`, `veteran_poise`; Velthia: `clear_mind`, `calm_veil`, `echo_focus`); item `warden_plate`, `keeper_robe` (buy/sell 0, tidak dijual, DRAF).
- `web/src/game/rpg/progression.ts`: `baseStatsAt` mendukung growth bertingkat (API tetap), `levelCapOf`/`expCapOf` (data-driven; tidak ada 5/235 terkunci). `gainExp`, `autoSkills`, `applyReward`, receipt: logika tetap, cap dari profil.
- `web/src/game/rpg/validation.ts`: batas exp/skillPoints dari `expCapOf`/`levelCapOf` (perilaku lama untuk L1-5 identik).
- `web/src/game/rpg/chapter4Rewards.ts`: angka EXP disetel (46/54/56/60/48/200; id dan nama ekspor tetap; gold/item tidak diubah).
- BARU `web/src/game/rpg/rewardLedger.ts` (`REWARD_LEDGER`, `ledgerExpFor`, `normalizeLedger`, `normalizeLedgerReport`; murni, belum dipasang).
- Tes BARU: `web/tests/unit/progression-level10.test.ts`, `web/tests/unit/reward-ledger.test.ts`, helper `web/tests/unit/helpers/progression.ts`.
- Tes LAMA diperbarui karena cap 5 -> 10 (alasan di PROGRESSION_LEVEL10.md bagian 7): `rpg.test.ts` (2 assert), `chapter3-engine.test.ts` (Chronolith +120/L6; judul), `chapter3-balance.test.ts` (helper `level5` berhenti di EXP 235).

## Bukti tes
- `npx vitest run tests/unit/progression-level10.test.ts tests/unit/reward-ledger.test.ts tests/unit/rpg.test.ts tests/unit/chapter3-engine.test.ts tests/unit/chapter3-balance.test.ts`: 5 file, 217 tes lulus (dua file baru: 67 tes, termasuk 48 kombinasi migrasi).
- Seluruh `npx vitest run` (akhir sesi): 1130 lulus, 1 gagal, 3 suite tidak termuat — SEMUA milik agen lain: `sfx.test.ts` (registry 67 id vs kontrak 44; S/lead), `chapter2.test.ts`, `story.test.ts`, `vertical-slice.test.ts` gagal memuat karena `Chapter4Story.ts` mengimpor `./c4/fortress` dan `./c4/aveloriaC4` yang belum ada (F/A4). Ketiga suite itu menyentuh hadiah/EXP (tidak bergantung cap) tetapi BELUM bisa diverifikasi; jalankan ulang setelah modul tersedia.
- `npx tsc --noEmit`: tidak ada galat di file milik P (galat tersisa hanya di file agen lain: WorldScene, SliceEndScene, Chapter4Story).

## Sisa masalah / batas jujur
- Semua angka DRAFT; target level tervalidasi lewat simulasi hadiah, bukan playtest.
- Jalur minimum Chronolith melewati dua level sekaligus (L4 -> L6, margin 3 EXP di ambang 300): perlu ulasan rasa.
- Pasif Torvan tidak dibuat (ia tidak pernah melewati L3 pada alur nyata).
- Ledger belum terpasang; legacy v1 menaikkan Yaric ke 25 EXP bila flag hadiah ada (lihat dokumen, kasus tepi 1).
- Komentar di `combat/encounters.ts` baris 23 masih menyebut "cap level 5, EXP 235" (milik E; hanya komentar).

## Permintaan ke lead
1. Pasang `normalizeLedger` pada jalur pemuatan save (sesudah `validateGameStateData` sukses; mis. di `SaveRepository.read` atau `GameState.load` dari save), lalu biarkan autosave berikutnya menulis hasilnya. Opsional: tampilkan toast ("Hadiah EXP yang terpotong dipulihkan") memakai `normalizeLedgerReport(data).changes`.
2. Keputusan legacy v1 (dokumen bagian 5, kasus 1): pakai normalisasi atau lewati untuk hasil `migrateV1`.
3. Pastikan menu skill (`RpgMenuScene`) menampilkan Velthia dengan 10 baris jurus (list sudah punya penggulir `visible`/panah, perlu dicek visual).
4. Isi peti Benteng dengan `warden_plate` / `keeper_robe` lewat `giveItem` (id sudah ada di `ITEMS`).
5. Jalankan ulang tiga suite yang belum termuat (`chapter2`, `story`, `vertical-slice`) dan perbaiki `sfx.test.ts` jika bukan bagian S.

## Ekspor yang dipakai agen lain
- `rpg/definitions`: `LEVEL_THRESHOLDS`, `MAX_LEVEL`, `EXP_CAP`, `ProgressionProfile.lateGrowth/lateFromLevel`, `ITEMS.warden_plate/keeper_robe`, skill id baru.
- `rpg/progression`: `baseStatsAt(level, profile)`, `effectiveStats`, `levelCapOf`, `expCapOf` (E: balancing Varlgrim memakai `baseStatsAt`/`effectiveStats` tanpa perubahan API).
- `rpg/rewardLedger`: `REWARD_LEDGER`, `ledgerExpFor`, `normalizeLedger`, `normalizeLedgerReport` (lead).
- `rpg/chapter4Rewards`: nama/id tidak berubah; hanya angka.
- Helper tes: `tests/unit/helpers/progression.ts` (`chapter1End`, `chapter3End`, `chapter4From`, `legacyClamp`) boleh dipakai agen lain.
