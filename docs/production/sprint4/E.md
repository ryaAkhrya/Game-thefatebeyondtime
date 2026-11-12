# Agen E (engine) — catatan Phase 8: Varlgrim, musuh Benteng, Perlindungan

Status: **FUNCTIONAL PASS (engine murni + tes otomatis)**; semua angka DRAFT hasil simulasi, belum playtest manusia. Dokumen desain: `docs/production/VARLGRIM_BOSS_DESIGN.md`, `docs/production/ULTIMATE_SHIELD_MECHANIC.md`.

## File (milik E)

| File | Perubahan |
|---|---|
| `combat/BattleEngine.ts` | `StatusId` += `aegis`; `Intent`/`EnemyCommand`/`Command` += perintah Varlgrim/Riftborn/Gravorn dan `velthia_aegis`; `NAMES`/`actor()` C04, M04, M06; `enemyAI`, `intentHint(enemy, ctx?)`, `unavailable`, `impact`, `advanceIntent`; state `meteor` dan `revivePotion`; `restore()`, `restorePhase()`, `hasPhaseSnapshot`; `aegisStatus()`; `magicDamage()`; `isC4EnemyCommand()` |
| `combat/BattleSession.ts` | syarat Bab IV, komposisi 6 encounter, Perlindungan dibuka flag, bangkit 25% (Bab III dan IV), hadiah/flag, `retryFromPhase()`, `canRetryFromPhase` |
| `combat/encounters.ts` | `EncounterId` += `C4EncounterId`; re-ekspor stat Bab IV; komentar cap level diperbarui |
| `combat/presentation.ts` | `TransitionKind` 'final', `TRANSITIONS.final`, `EncounterPresentation.subtitle`, `BGM_FINAL_BOSS`, `presentationFor` Bab IV, 7 `ActionClass` baru + `TIMELINES`, `actionClassFor`, `fastTimeline`, `HEAVY_IMPACT_CLASSES`, `impactFxFor` |
| BARU `combat/varlgrim.ts` | `VARLGRIM_STATS`, `VARLGRIM` (tuning), siklus pola, `varlgrimNext`, `varlgrimPhaseFor`, `LEAD_IN` |
| BARU `combat/aegis.ts` | `AEGIS`, `AEGIS_SKILL_INFO`, `aegisStress`, `stressLevel` |
| BARU `combat/c4Enemies.ts` | `RIFTBORN_STATS`, `GRAVORN_STATS`, varian pasangan/penguji, `C4_POWER`, pola, tipe `RiftbornCommand`/`GravornCommand` |
| Tes BARU | `aegis-engine.test.ts`, `meteor-nosoftlock.test.ts`, `chapter4-session.test.ts`, `varlgrim-balance.test.ts`, helper `helpers/chapter4.ts`; `presentation.test.ts` diperluas |
| Dok | `VARLGRIM_BOSS_DESIGN.md`, `ULTIMATE_SHIELD_MECHANIC.md`, `sprint4/E.md` |

Tidak disentuh: `rpg/velthia.ts`, `rpg/vitals.ts`, `story/chapter3Flags.ts` (tidak perlu: `velthia_aegis` sengaja TIDAK ditambahkan ke `VELTHIA_COMMANDS`; tipenya `typeof AEGIS_COMMAND` di union `Command`, sehingga menu level Velthia dan tes Bab III tidak berubah). `BattleAtlas.ts` milik BA.

## Hasil tes

- Tes baru: `aegis-engine` 31, `meteor-nosoftlock` 2 (grid 864 keadaan, 16.440 simulasi aksi; fuzz 400 pertarungan), `chapter4-session` 12, `varlgrim-balance` 14, `presentation` +7.
- `npx tsc --noEmit`: bersih (saat laporan ditulis).
- Seluruh `npx vitest run` pada akhir sesi E: 61 file, 1530 tes lulus, 0 gagal (38 s). Satu kali jalan sebelumnya `vfx-atlas.test.ts` (milik V) timeout 5 detik karena beban paralel; lulus pada jalan berikutnya.

## Antarmuka presenter (BattleScene/BattlePanel/VFX/SFX)

### Perintah dan niat baru
`Intent`/`EnemyCommand` memuat nama yang sama dengan `VARLGRIM_COMMANDS`, `RIFTBORN_COMMANDS`, `GRAVORN_COMMANDS`. `enemyAI(enemy)` mengembalikan niat itu sendiri sebagai perintah. Pemain: `velthia_aegis` (`AEGIS_COMMAND`).

### `ImpactResult` baru
- `frameKey`: `'plant'` (tongkat ditanam: `keeper_stance`, `time_bind`, `phase_shift`, `meteor_fall`), `'raise'` (tongkat diangkat: `meteor_call`, `meteor_hold`). Velthia `velthia_aegis` memakai `'special'` (pose tangan; BA boleh menambahkan kunci khusus). Kunci lain tetap standar: `attack`, `cast` (`seal_pulse`, `distortion_wave`, `fracture_mark`), `anticipation` (`gravorn_brace`, `rift_gather` biasa).
- `phase?: 1|2|3`: ada pada `phase_shift` (fase baru) untuk banner `phase2`/`phase3`.
- `meteor?: MeteorReport` pada `meteor_call`, `meteor_hold`, `meteor_fall`, `velthia_aegis` (dan `rift_gather`/`rift_surge` Penguji dengan `source: 'surge'`):
  `{ event: 'call'|'hold'|'fall'|'aegis_cast', source: 'meteor'|'surge', protectedIds: string[], lethal: boolean, savedHp: number, stressMax: 0..3, charge: 0|1 }`.
  - `fall` + `lethal: true` = tidak ada perisai => defeat (animasi: perisai tidak ada, barisan tumbang). `lethal: false` = perisai menahan (retak sesuai `stressMax`).
  - `savedHp` = total HP yang diselamatkan perisai (juga `ImpactResult.absorbed`).
- `effects[]` kind baru: `'meteor'` (per anggota: `amount` = HP hilang nyata, `stress` 0..3, `status: 'aegis'` bila berperisai, `lethal: true` bila tewas, `absorbed` = HP yang diselamatkan), `'aegis'` (tiap anggota ternaungi saat cast), `'revive'` (kebangkitan saat `phase_shift` ke fase 3; `amount` = HP). `heal` dari Potion yang membangkitkan memiliki `revived: true`; `ImpactResult.revived: string[]`.
- `telegraph?: { targetId, next }`: `next` kini `Intent` (`keeper_strike`, `fracture_strike`, `rift_surge`, `gravorn_crush`, atau `chrono_slam`).
- `order?` juga diisi `time_bind` (urutan baru).
- Meteor: `targetIds` = seluruh anggota hidup.

### State dan helper yang dapat dibaca
- `BattleState.meteor?: { open, velthiaActed, calls, holds, falls }` (ada bila boss meteor/Penguji ada), `BattleState.revivePotion?: true`.
- Aktor: `phase` (Varlgrim 1..3), `intent`, `intentTargetId/Name` (stance/mark/brace/gather biasa), `aegis` (Velthia 0/1/undefined), `lethalSurge`, `calm`, `rot`.
- `aegisStatus(state)` => `{ threat, windowOpen, charge: 0|1|null, covered, velthiaAlive }` untuk menu/banner.
- `intentHint(enemy, { aegisCovered })`: teks Indonesia untuk setiap niat; `meteor_fall`/`meteor_hold`/`meteor_call` selalu menyebut Perlindungan dan "tanpa MP".
- `AEGIS_SKILL_INFO` (`aegis.ts`): nama "Perlindungan", MP 0, deskripsi untuk menu.
- `engine.unavailable('velthia_aegis')` memberi alasan Indonesia (belum terbuka, tidak ada ancaman besar, sudah dipakai, sudah menaungi).

### Ulang-cepat
`session.canRetryFromPhase` (true bila kalah dan fase 3 pernah dicapai) dan `session.retryFromPhase()` (memulihkan engine ke awal fase 3 dengan niat `phase_shift`; tidak menyentuh game state, tanpa hadiah). `session.retry()` tetap memuat checkpoint penuh. Pada kekalahan Varlgrim tampilkan dua pilihan bila `canRetryFromPhase`.

### Presentasi (`combat/presentation.ts`)
- `TRANSITIONS.final` (900+760 ms masuk = 1,66 s; tanpa denyut terang; `steps: 4`, plakat nama), `presentationFor('varlgrim')` = `{ kind:'final', name:'Varlgrim', subtitle:'Penjaga Waktu', bgm:'BGM_FINAL_BOSS' }`; encounter Benteng temporal; uji Perlindungan scripted.
- `actionClassFor`: `keeper_strike|fracture_strike` => `boss_staff`; `keeper_stance|time_bind|seal_pulse|fracture_mark|distortion_wave|phase_shift` => `boss_temporal`; `meteor_call|meteor_hold` => `meteor_telegraph` (>= 1,6 s; gunakan `fastTimeline(spec, 0.25)` saat retry cepat); `meteor_fall` => `meteor_fall` (3,88 s); `velthia_aegis` => `aegis_cast` (2,36 s); `rift_lash` => `riftborn`; `gravorn_heave` => `gravorn`; `rift_gather|gravorn_brace` => `boss_telegraph`; `rift_surge|gravorn_crush` => `boss_special`.
- `impactFxFor(opts, cls)` dan `HEAVY_IMPACT_CLASSES` (`heavy`, `boss_special`, `boss_staff`, `meteor_fall`): kilat hanya bila Reduced Flashes mati, goyang hanya bila Screen Shake aktif. Telegraf meteor dan `aegis_cast` tidak pernah memicu kilat/goyang.

## Permintaan ke lead

1. **BattleScene**: (a) `BATTLE_TEXTURE` perlu kunci `C04`, `M04`, `M06` (agen BA) — tipe `EnemyId` pada `BattleSession` kini mencakup `C04|M04|M06` sehingga indeks `BATTLE_TEXTURE[session.enemyId]` bergantung pada itu (tsc bersih saat laporan ditulis); (b) menu skill Velthia: tampilkan "Perlindungan" (`AEGIS_SKILL_INFO`) bila `me.skills` memuat `velthia_aegis`, MP 0, dinonaktifkan dengan alasan `engine.unavailable(...)`; (c) putar urutan cast: antisipasi => muatan => pembentukan perisai (kelas `aegis_cast`, VFX `aegis_*`), dan `meteor_fall` memakai `ImpactResult.meteor` (`lethal` dan `stressMax`) untuk memilih "perisai menahan/retak" atau "tanpa perisai"; (d) `intentHint(enemy, { aegisCovered: aegisStatus(state).covered })` agar banner berubah setelah Velthia memasang perisai; (e) banner naskah (`C4_BATTLE_CALLOUTS`): `phase2/phase3` dari `result.phase` pada `phase_shift`; `meteor_call` dari `meteor.event === 'call'`; `meteor_hold` dari `'hold'`; `meteor_survived` dari `'fall'` dengan `lethal === false`; `aegis_taught` dari `'aegis_cast'` pada uji Perlindungan; `defeat_hint` saat kalah.
2. **BattlePanel (target Potion)**: pada Bab IV sekutu yang tumbang harus bisa dipilih sebagai target Potion (engine mengizinkan lewat `revivePotion`); `engine.unavailable('potion', id)` yang menentukan.
3. **Retry UI** pada `varlgrim`: tampilkan "Ulang dari fase meteor" bila `session.canRetryFromPhase`, selain "Coba lagi" (`retry()`); retry tidak memutar transisi masuk lagi; gunakan `fastTimeline` untuk telegraf bila diinginkan.
4. **GameState/cerita**: checkpoint pra-boss (`restChapter4Party` + `C4.checkpoint`) harus mengisi HP/MP penuh sebelum Varlgrim; `BattleSession('varlgrim')` menolak tanpa `C4.checkpoint` dan `C4.confront`. Urutan validasi sudah mewajibkan `aegisTrial` sebelum `checkpoint`.
5. **Transisi final**: `TransitionScene` perlu membaca `TRANSITIONS.final` dan `EncounterPresentation.subtitle` (sudah dikerjakan lead).
6. **Presenter M05**: `fortress_guardpost` memuat Oathguard (M05 lama) + Riftborn; atlas M05 sudah ada.
7. **Dunia**: encounter `fortress_aegis_trial` hanya membutuhkan `C4.aegisLearned`; hadiah memakai flag `battle.fortress_aegis_trial`.
8. **P.md**: komentar cap level di `encounters.ts` sudah diperbarui (butir sisa masalah P).
9. Tes lama yang tidak bergantung pada hal ini tetap lulus; helper `tests/unit/helpers/chapter4.ts` (`c4Engine`, `smartC4`, `legalActions`, `atMeteorCall`) boleh dipakai untuk E2E/tes lain.

## Sisa masalah / batas jujur

- Angka balancing DRAFT dari kebijakan pemain buatan; margin L8 tipis (sisa HP 44%, 20 ronde; dengan 20% aksi acak hanya 11/40 menang). Setel `VARLGRIM`, `VARLGRIM_STATS`, `AEGIS.stressPct`, `C4_POWER`, stat musuh Benteng setelah playtest manusia.
- Pemain terkuat (L10, semua pasif) selesai dalam ~15 ronde (di bawah rentang atas target) tetapi tetap melihat satu meteor.
- Selaras Langkah tampak kurang efisien dibanding Denyut pada simulasi (6 MP): catatan untuk Game Director, bukan perubahan.
- `fortress_rift` (Gravorn+Riftborn) cukup berat di L6 (hanya 8/20 menang dengan 30% aksi acak); jalur wajib minimum mencapai L6–L7 sebelum koridor, jadi perlu ulasan.
- Snapshot ulang-cepat hanya di memori (hilang bila scene battle ditutup).
- Tidak ada BGM dibuat atau dipilih; `BGM_FINAL_BOSS` hanya nama kunci (AWAITING_COMPOSER).
