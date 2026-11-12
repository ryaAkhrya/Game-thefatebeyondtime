# Agen S (SFX) — catatan Phase 8 (Bab IV)

**Status: FUNCTIONAL / AUDIO-REVIEW PENDING — belum ditinjau manusia.** Saya tidak dapat mendengar audio. Semua yang dilaporkan di sini adalah pengukuran objektif (format, durasi, puncak, RMS/LUFS-perkiraan, klip, DC, tepi, ekor, kerataan puncak, kesenjangan antar kelompok). Pengukuran TIDAK membuktikan bahwa bunyi terdengar baik, anggun, tidak melelahkan, atau cocok dengan adegan; penilaian itu menunggu Game Director. Dokumen desain: `docs/production/SFX_DESIGN_AND_MANIFEST.md` (bagian Phase 8).

## Dibuat
- 23 id SFX ORIGINAL (33 berkas, ~5,2 MB) lewat pipeline kode Phase 7 (`web/scripts/sfx/{dsp,catalog,generate}.mjs`): `SFX_FORTRESS_DOOR_ANCIENT, SEAL_ACTIVATE, SEAL_ERROR(2), ECHO_MEMORY, VARLGRIM_STAFF_SWING(2), VARLGRIM_STAFF_IMPACT(2), TEMPORAL_BIND(2), TIME_DISTORTION, BOSS_PHASE_SHIFT, FRACTURE_MARK(2), METEOR_CHARGE, METEOR_DESCENT, METEOR_IMPACT, AEGIS_CAST, AEGIS_FORM, AEGIS_STRESS(2), AEGIS_FADE, HEART_LOCK, HEART_UNSEAL, TOWER_COLLAPSE_DISTANT, RIFTBORN_ATTACK(3), GRAVORN_ATTACK(3), BATTLE_TRANSITION_FINAL`. Angka dalam kurung = jumlah variasi (`id#i`). Total registry kini 67 id / 86 berkas (~7,9 MB di disk).
- `data/sfxRegistry.ts` dihasilkan ulang (semua READY; `minIntervalMs`, `gain`, `durationMs`; `SfxCategory` ditambah `world | boss | meteor | aegis`). `scripts/sfx/manifest.json` memuat SHA-256 tiap berkas.
- `scripts/sfx/analyze.mjs` (+ `analyze.d.mts`): analisis kualitas otomatis semua WAV; `--json out`, `--patch-doc` (memperbarui tabel di bawah). Tidak menjalankan build/E2E.
- Tes: `tests/unit/sfx.test.ts` (diperluas: id Phase 8, hash Phase 7 beku via `tests/unit/fixtures/sfx-phase7-hashes.json`, tanpa BGM), `tests/unit/sfx-analysis.test.ts` (baru), `tests/unit/sfx-audio.test.ts` (diperluas: perilaku AudioManager + registry asli).
- `docs/production/SFX_DESIGN_AND_MANIFEST.md`: bagian Phase 8 (arah desain, tabel dihasilkan, resep, urutan pemicu).

## Phase 7 tidak berubah
Hash 53 berkas WAV lama identik sebelum/sesudah (dibandingkan sha256 sebelum perubahan dan dijaga tes). Perubahan pada id lama hanya `gain` registry (bukan berkas), hasil keputusan analisis: `SFX_UI_SHOP_BUY` / `SFX_UI_SHOP_SELL` 0.6 -> 0.42, `SFX_UI_DIALOGUE_ADVANCE` 0.35 -> 0.4. Determinisme: dua kali `generate.mjs` -> seluruh 86 sha256 identik.

## Bug AudioManager yang ditemukan dan diperbaiki (`systems/AudioManager.ts`, tes regresi ditambah; terbukti gagal pada kode lama)
1. **Variasi terakhir bergeser oleh percobaan yang tidak berbunyi.** `pickKey` mengubah `lastVariant` dan keadaan RNG sebelum pemeriksaan mute / rate limit / batas suara. Akibat: satu percobaan yang ditahan membuat pemutaran berikutnya mengulang variasi yang sama dengan yang terakhir terdengar (mis. 2 variasi: A diputar, percobaan tertahan memilih B, pemutaran berikut memilih A lagi). Perbaikan: `pickKey` murni; status baru di-commit hanya setelah suara benar-benar dimulai.
2. **`opts.volume` / `opts.rate` bernilai NaN/Infinity** diteruskan ke backend (volume NaN; rate NaN membuat suara langsung dihitung selesai sehingga batas 8 suara tak akurat). Perbaikan: nilai tidak hingga jatuh ke bawaan (volume 1, rate 1), selain itu dijepit seperti sebelumnya.
Perilaku lain yang diverifikasi tes (tidak ada bug): tidak memutar sebelum gesture (`silent_locked`), `unlock` sekali (resume sekali; resume yang melempar tidak berbahaya), master/SFX/mute mengikuti Settings (termasuk `setSfxVolume` backend), rate limit per id memakai `minIntervalMs` dan tidak "terpakai" oleh percobaan yang ditahan, batas 8 suara, variasi `id#i` tanpa pengulangan langsung, `backend.has`/`playSfx` melempar -> tidak pernah throw, key hilang -> senyap.

## Metode analisis (`analyze.mjs`)
| Metrik | Cara | Ambang |
|---|---|---|
| Format | parse RIFF/fmt/data | PCM, 44100 Hz, mono, 16-bit, ukuran RIFF sah, SHA-256 = manifest |
| Puncak / RMS | maks |x| dan RMS (dBFS) | puncak -3 ±0.4 dBFS; RMS dalam jendela per kategori (`CATEGORY_LIMITS`) |
| LUFS-perkiraan | K-weighting BS.1770 dihitung ulang pada 44,1 kHz, tanpa gerbang (integrasi penuh); juga momentary maksimum (jendela 400 ms) | hanya perkiraan; bukan alat ukur tersertifikasi |
| Klip | sampel int16 = ±32767/-32768 | harus 0 |
| DC offset | rata-rata sampel | |DC| < 0.002 |
| Klik awal/akhir | |sampel pertama| / |sampel terakhir| | < 0.01 / < 0.005 (fade pendek). Lonjakan sampel-ke-sampel di tepi hanya dicatat (kemiringan alami sinyal), bukan kriteria. |
| Distorsi kasar | run >= 3 sampel int16 IDENTIK dekat puncak (indikasi kliping/limiter keras); faktor puncak (crest) < 5 dB = peringatan padat | run datar harus 0 |
| Ekor | durasi senyap (< -60 dBFS) di ujung | informasi (impact meteor sengaja punya ekor senyap) |
| Durasi vs peran | `CATEGORY_LIMITS[kategori]` | per kategori |
| Kesenjangan grup | LUFS efektif = LUFS + 20 log10(gain registry); selisih terhadap median kelompok fungsi (kategori) | ±4 dB |

Batasan jujur: kelompok = kategori registry (bukan penilaian manusia atas "fungsi"); LUFS tanpa gerbang menilai rendah bunyi yang berekor panjang/sunyi dan K-weighting meredam sub-bass < 100 Hz, sehingga bobot tabrakan rendah (impact meteor, menara) lebih besar secara fisik daripada angkanya; sinyal tidak diuji melalui speaker/headphone sungguhan; "klik" hanya terdeteksi di sampel tepi, bukan di tengah berkas; spektrum/keanggunan/kelelahan pendengaran tidak diukur.

## Hasil (dihasilkan otomatis oleh `node scripts/sfx/analyze.mjs --patch-doc`)

Ringkasan: 86 berkas, galat keras 0, peringatan 0; sampel klip 0 di semua berkas; |DC| maks 1.67e-3 (berkas langkah lama, di bawah ambang 2e-3); puncak -3.00 dBFS di semua; sampel pertama/terakhir 0 di semua; tidak ada run datar.

### Kelompok fungsi (loudness efektif terhadap median)
<!-- SFX_GROUPS_START -->
| kelompok | berkas | median LUFS efektif | rentang dev. (dB) | di luar ±4 dB |
|---|---:|---:|---|---|
| UI (`ui`) | 12 | -20.3 | -3.4..+2.7 | - |
| Langkah (`step`) | 12 | -23.4 | -0.8..+1.1 | - |
| Interaksi (`interact`) | 6 | -19.8 | -2.8..+2.9 | - |
| Transisi battle (`transition`) | 5 | -20.7 | -3.6..+1 | - |
| Battle (ayun/hantam) (`battle`) | 7 | -19.1 | -3.4..+3.9 | - |
| Sihir/penyembuhan (`magic`) | 10 | -18 | -2.2..+1.3 | - |
| Stinger (`stinger`) | 2 | -18.9 | -0.6..+0.6 | - |
| Dunia Benteng (P8) (`world`) | 8 | -22.8 | -3..+3.2 | - |
| Boss/musuh Bab IV (P8) (`boss`) | 16 | -19.6 | -2..+1.4 | - |
| Meteor (P8) (`meteor`) | 3 | -22.9 | -1.8..+0.8 | - |
| Perlindungan (P8) (`aegis`) | 5 | -20.9 | -1.2..+0.7 | - |
<!-- SFX_GROUPS_END -->

### Per berkas (Phase 7 + Phase 8)
<!-- SFX_ANALYSIS_START -->
| id / berkas | grup | durasi (ms) | puncak (dBFS) | RMS (dBFS) | LUFS~ | LUFS mom. maks | gain | LUFS efektif | dev. grup (dB) | klip | DC | crest (dB) | ekor senyap (ms) | catatan |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `SFX_UI_MOVE` | ui | 70 | -3 | -16.9 | -15.1 | -15.1 | 0.5 | -21.1 | -0.8 | 0 | -3.9e-5 | 13.9 | 4 | ok |
| `SFX_UI_CONFIRM` | ui | 200 | -3 | -13.6 | -13.4 | -13.4 | 0.55 | -18.6 | +1.7 | 0 | -4.2e-5 | 10.6 | 1 | ok |
| `SFX_UI_CANCEL` | ui | 170 | -3 | -13.8 | -14.5 | -14.5 | 0.5 | -20.5 | -0.2 | 0 | 4.8e-4 | 10.8 | 1 | ok |
| `SFX_UI_SELECT_ITEM` | ui | 90 | -3 | -13.1 | -11.8 | -11.8 | 0.5 | -17.8 | +2.5 | 0 | 1.6e-5 | 10.1 | 1 | ok |
| `SFX_UI_ITEM_USE` | ui | 200 | -3 | -16.7 | -15.9 | -15.9 | 0.6 | -20.4 | -0.1 | 0 | 2.3e-7 | 13.7 | 1 | ok |
| `SFX_UI_SAVE_OK` | ui | 200 | -3 | -13.7 | -13.2 | -13.2 | 0.6 | -17.6 | +2.7 | 0 | 1.9e-5 | 10.7 | 1 | ok |
| `SFX_UI_SAVE_FAIL` | ui | 200 | -3 | -17.3 | -18.2 | -18.2 | 0.55 | -23.3 | -3.1 | 0 | 3.2e-4 | 14.3 | 5 | ok |
| `SFX_UI_DIALOGUE_ADVANCE` | ui | 55 | -3 | -15.1 | -15.8 | -15.8 | 0.4 | -23.7 | -3.4 | 0 | -1.1e-3 | 12.1 | 2 | ok |
| `SFX_UI_DIALOGUE_CHOICE` | ui | 100 | -3 | -13.9 | -14.1 | -14.1 | 0.45 | -21.1 | -0.8 | 0 | -5.5e-5 | 10.9 | 0 | ok |
| `SFX_UI_SHOP_BUY` | ui | 200 | -3 | -14.1 | -11 | -11 | 0.42 | -18.5 | +1.8 | 0 | -8.0e-7 | 11.1 | 1 | ok |
| `SFX_UI_SHOP_SELL` | ui | 190 | -3 | -14 | -11 | -11 | 0.42 | -18.5 | +1.7 | 0 | 1.0e-6 | 11 | 1 | ok |
| `SFX_STEP_GRASS_01` | step | 110 | -3 | -18.5 | -16.4 | -16.4 | 0.5 | -22.4 | +0.9 | 0 | -7.0e-4 | 15.5 | 2 | ok |
| `SFX_STEP_GRASS_02` | step | 110 | -3 | -18.3 | -16.4 | -16.4 | 0.5 | -22.4 | +1 | 0 | -7.7e-4 | 15.3 | 1 | ok |
| `SFX_STEP_GRASS_03` | step | 110 | -3 | -18.5 | -16.8 | -16.8 | 0.5 | -22.9 | +0.5 | 0 | -8.0e-4 | 15.5 | 3 | ok |
| `SFX_STEP_GRASS_04` | step | 110 | -3 | -18 | -16.2 | -16.2 | 0.5 | -22.2 | +1.1 | 0 | -8.1e-4 | 15 | 3 | ok |
| `SFX_STEP_DIRT_01` | step | 100 | -3 | -14.8 | -18.2 | -18.2 | 0.55 | -23.4 | 0 | 0 | -1.7e-3 | 11.8 | 1 | ok |
| `SFX_STEP_DIRT_02` | step | 100 | -3 | -15.7 | -18.9 | -18.9 | 0.55 | -24.1 | -0.8 | 0 | -1.2e-3 | 12.7 | 1 | ok |
| `SFX_STEP_DIRT_03` | step | 100 | -3 | -15.7 | -18.7 | -18.7 | 0.55 | -23.9 | -0.5 | 0 | -1.5e-3 | 12.7 | 1 | ok |
| `SFX_STEP_DIRT_04` | step | 100 | -3 | -14.8 | -18.3 | -18.3 | 0.55 | -23.5 | -0.1 | 0 | -1.5e-3 | 11.8 | 1 | ok |
| `SFX_STEP_STONE_01` | step | 100 | -3 | -18 | -17.6 | -17.6 | 0.5 | -23.6 | -0.3 | 0 | -8.9e-4 | 15 | 1 | ok |
| `SFX_STEP_STONE_02` | step | 100 | -3 | -17.3 | -17.6 | -17.6 | 0.5 | -23.6 | -0.2 | 0 | -1.0e-3 | 14.3 | 1 | ok |
| `SFX_STEP_STONE_03` | step | 100 | -3 | -17.8 | -17.3 | -17.3 | 0.5 | -23.3 | +0 | 0 | -9.3e-4 | 14.8 | 1 | ok |
| `SFX_STEP_STONE_04` | step | 100 | -3 | -17.2 | -16.9 | -16.9 | 0.5 | -22.9 | +0.4 | 0 | -1.0e-3 | 14.2 | 1 | ok |
| `SFX_INTERACT` | interact | 220 | -3 | -14.3 | -14.4 | -14.4 | 0.6 | -18.8 | +1 | 0 | 8.1e-5 | 11.3 | 20 | ok |
| `SFX_CHEST_OPEN` | interact | 900 | -3 | -18.6 | -16.8 | -13.5 | 0.7 | -19.9 | -0.1 | 0 | 3.7e-7 | 15.6 | 2 | ok |
| `SFX_ITEM_PICKUP` | interact | 320 | -3 | -13.7 | -12.5 | -12.5 | 0.6 | -16.9 | +2.9 | 0 | 1.7e-5 | 10.7 | 2 | ok |
| `SFX_DOOR_OPEN` | interact | 900 | -3 | -18.1 | -19.5 | -16.4 | 0.7 | -22.6 | -2.8 | 0 | -2.9e-4 | 15.1 | 222 | ok |
| `SFX_PUZZLE_ACTIVATE` | interact | 600 | -3 | -17.3 | -18.1 | -16.5 | 0.7 | -21.2 | -1.4 | 0 | 3.7e-6 | 14.3 | 1 | ok |
| `SFX_PUZZLE_SOLVED` | interact | 1450 | -3 | -16.9 | -17.2 | -13.6 | 0.75 | -19.7 | +0.1 | 0 | -4.0e-5 | 13.9 | 17 | ok |
| `SFX_BATTLE_TRANSITION_NORMAL` | transition | 850 | -3 | -21 | -22.4 | -19.2 | 0.8 | -24.3 | -3.6 | 0 | 6.4e-6 | 18 | 33 | ok |
| `SFX_BATTLE_TRANSITION_BOSS` | transition | 1400 | -3 | -16 | -18.3 | -15 | 0.85 | -19.8 | +0.9 | 0 | -5.4e-5 | 13 | 2 | ok |
| `SFX_BATTLE_TRANSITION_TEMPORAL` | transition | 1150 | -3 | -18.2 | -18.8 | -15.6 | 0.8 | -20.7 | +0 | 0 | -8.3e-6 | 15.2 | 1 | ok |
| `SFX_BATTLE_TRANSITION_SCRIPTED` | transition | 1000 | -3 | -16.7 | -17.7 | -14.4 | 0.8 | -19.7 | +1 | 0 | 3.3e-6 | 13.7 | 2 | ok |
| `SFX_BATTLE_CONFIRM` | ui | 200 | -3 | -15.7 | -15.8 | -15.8 | 0.6 | -20.2 | +0.1 | 0 | -6.3e-4 | 12.7 | 1 | ok |
| `SFX_GREATSWORD_SWING` | battle | 380 | -3 | -18.1 | -16.5 | -16.5 | 0.85 | -17.9 | +1.2 | 0 | -3.6e-9 | 15.1 | 6 | ok |
| `SFX_GREATSWORD_IMPACT` | battle | 500 | -3 | -15.8 | -17.3 | -16.3 | 1 | -17.3 | +1.8 | 0 | -4.5e-4 | 12.8 | 7 | ok |
| `SFX_GROUND_SLAM` | battle | 600 | -3 | -12.5 | -15.2 | -13.6 | 1 | -15.2 | +3.9 | 0 | -3.8e-4 | 9.5 | 3 | ok |
| `SFX_ENEMY_ATTACK` | battle | 400 | -3 | -19.5 | -18.2 | -18.2 | 0.9 | -19.1 | +0 | 0 | 8.0e-7 | 16.5 | 76 | ok |
| `SFX_DAMAGE` | battle | 280 | -3 | -17.2 | -19.3 | -19.3 | 0.95 | -19.7 | -0.7 | 0 | -8.8e-4 | 14.2 | 6 | ok |
| `SFX_ENEMY_DAMAGE` | battle | 260 | -3 | -20.9 | -21.4 | -21.4 | 0.95 | -21.8 | -2.8 | 0 | -3.4e-4 | 17.9 | 13 | ok |
| `SFX_DEFEND` | battle | 320 | -3 | -20.5 | -21.1 | -21.1 | 0.85 | -22.5 | -3.4 | 0 | -2.3e-4 | 17.5 | 5 | ok |
| `SFX_HEAL` | magic | 1000 | -3 | -14.4 | -14.9 | -12.4 | 0.8 | -16.8 | +1.3 | 0 | 1.5e-6 | 11.4 | 4 | ok |
| `SFX_SHIELD` | magic | 700 | -3 | -18.1 | -18.3 | -16.1 | 0.8 | -20.3 | -2.2 | 0 | 2.9e-7 | 15.1 | 8 | ok |
| `SFX_STATUS_POISON` | magic | 650 | -3 | -16 | -17.3 | -15.4 | 0.8 | -19.2 | -1.2 | 0 | -3.5e-7 | 13 | 53 | ok |
| `SFX_VICTORY` | stinger | 2450 | -3 | -18.3 | -17.5 | -13.4 | 0.8 | -19.5 | -0.6 | 0 | 1.7e-6 | 15.3 | 22 | ok |
| `SFX_DEFEAT` | stinger | 2450 | -3 | -15.3 | -16.3 | -14 | 0.8 | -18.3 | +0.6 | 0 | -1.0e-5 | 12.3 | 7 | ok |
| `SFX_MAGIC_TORVAN` | magic | 950 | -3 | -17.6 | -17.8 | -16.3 | 0.8 | -19.7 | -1.7 | 0 | -3.2e-4 | 14.6 | 10 | ok |
| `SFX_MAGIC_VELTHIA_CAST` | magic | 900 | -3 | -17.4 | -15.6 | -12.5 | 0.75 | -18.1 | -0.1 | 0 | -1.1e-7 | 14.4 | 2 | ok |
| `SFX_MAGIC_VELTHIA_SHIELD` | magic | 1150 | -3 | -15.2 | -15.3 | -12.5 | 0.75 | -17.8 | +0.3 | 0 | 4.8e-6 | 12.2 | 2 | ok |
| `SFX_MAGIC_VELTHIA_HEAL` | magic | 1200 | -3 | -15.2 | -14.9 | -12.5 | 0.75 | -17.4 | +0.6 | 0 | -2.6e-6 | 12.2 | 4 | ok |
| `SFX_CHRONOLITH_CHARGE` | magic | 1200 | -3 | -17.6 | -18.6 | -15.3 | 0.85 | -20.1 | -2 | 0 | -9.4e-7 | 14.6 | 0 | ok |
| `SFX_CHRONOLITH_STRIKE` | magic | 1000 | -3 | -15.3 | -17.6 | -14.6 | 1 | -17.6 | +0.4 | 0 | -2.1e-4 | 12.3 | 3 | ok |
| `SFX_CHRONOLITH_TEMPORAL` | magic | 1200 | -3 | -15.6 | -16.5 | -14.8 | 0.85 | -17.9 | +0.1 | 0 | 3.1e-5 | 12.6 | 1 | ok |
| `SFX_FORTRESS_DOOR_ANCIENT` | world | 3000 | -3 | -19.3 | -22.1 | -15.4 | 0.7 | -25.2 | -2.3 | 0 | 4.2e-8 | 16.3 | 30 | ok |
| `SFX_SEAL_ACTIVATE` | world | 2000 | -3 | -19.6 | -19.9 | -14.6 | 0.7 | -23 | -0.2 | 0 | 8.3e-6 | 16.6 | 42 | ok |
| `SFX_SEAL_ERROR_01` | world | 750 | -3 | -19.1 | -20.2 | -17.5 | 0.7 | -23.3 | -0.5 | 0 | -3.0e-4 | 16.1 | 146 | ok |
| `SFX_SEAL_ERROR_02` | world | 750 | -3 | -18.5 | -19.5 | -16.8 | 0.7 | -22.6 | +0.2 | 0 | -3.0e-4 | 15.5 | 114 | ok |
| `SFX_ECHO_MEMORY` | world | 3400 | -3 | -16.8 | -17.5 | -11.7 | 0.7 | -20.6 | +2.3 | 0 | 9.7e-8 | 13.8 | 104 | ok |
| `SFX_HEART_LOCK` | world | 1900 | -3 | -15.9 | -17.1 | -12.5 | 0.75 | -19.6 | +3.2 | 0 | -8.4e-5 | 12.9 | 42 | ok |
| `SFX_HEART_UNSEAL` | world | 3400 | -3 | -18.8 | -19.5 | -15.3 | 0.7 | -22.6 | +0.2 | 0 | -8.2e-8 | 15.8 | 55 | ok |
| `SFX_TOWER_COLLAPSE_DISTANT` | world | 4400 | -3 | -17.5 | -21.7 | -16.2 | 0.62 | -25.9 | -3 | 0 | -2.3e-7 | 14.5 | 108 | ok |
| `SFX_VARLGRIM_STAFF_SWING_01` | boss | 700 | -3 | -16.9 | -17.2 | -15 | 0.85 | -18.6 | +0.9 | 0 | -2.1e-7 | 13.9 | 12 | ok |
| `SFX_VARLGRIM_STAFF_SWING_02` | boss | 700 | -3 | -16.4 | -16.8 | -14.5 | 0.85 | -18.2 | +1.4 | 0 | -6.6e-8 | 13.4 | 11 | ok |
| `SFX_VARLGRIM_STAFF_IMPACT_01` | boss | 1200 | -3 | -19.4 | -21.3 | -16.6 | 1 | -21.3 | -1.8 | 0 | -2.4e-4 | 16.4 | 92 | ok |
| `SFX_VARLGRIM_STAFF_IMPACT_02` | boss | 1200 | -3 | -19.5 | -21.4 | -16.7 | 1 | -21.4 | -1.8 | 0 | -2.5e-4 | 16.5 | 97 | ok |
| `SFX_TEMPORAL_BIND_01` | boss | 1400 | -3 | -17.1 | -18.7 | -16.5 | 0.8 | -20.6 | -1 | 0 | -2.1e-4 | 14.1 | 205 | ok |
| `SFX_TEMPORAL_BIND_02` | boss | 1400 | -3 | -17 | -18.6 | -16.5 | 0.8 | -20.6 | -1 | 0 | -2.1e-4 | 14 | 205 | ok |
| `SFX_TIME_DISTORTION` | boss | 2200 | -3 | -18.7 | -19.7 | -15.6 | 0.8 | -21.6 | -2 | 0 | 1.8e-6 | 15.7 | 33 | ok |
| `SFX_BOSS_PHASE_SHIFT` | boss | 2200 | -3 | -14.4 | -16.3 | -12.2 | 0.8 | -18.2 | +1.3 | 0 | 3.8e-7 | 11.4 | 3 | ok |
| `SFX_FRACTURE_MARK_01` | boss | 1000 | -3 | -16.8 | -15.8 | -12.1 | 0.75 | -18.3 | +1.2 | 0 | 6.4e-8 | 13.8 | 18 | ok |
| `SFX_FRACTURE_MARK_02` | boss | 1000 | -3 | -17.2 | -16.2 | -12.5 | 0.75 | -18.7 | +0.8 | 0 | -2.4e-8 | 14.2 | 26 | ok |
| `SFX_METEOR_CHARGE` | meteor | 2600 | -3 | -18.2 | -21 | -16.2 | 0.65 | -24.7 | -1.8 | 0 | -8.2e-6 | 15.2 | 24 | ok |
| `SFX_METEOR_DESCENT` | meteor | 2000 | -3 | -16.9 | -19 | -13.4 | 0.7 | -22.1 | +0.8 | 0 | -3.5e-7 | 13.9 | 145 | ok |
| `SFX_METEOR_IMPACT` | meteor | 3600 | -3 | -19.4 | -22.9 | -14.7 | 1 | -22.9 | +0 | 0 | -4.1e-5 | 16.4 | 606 | ok |
| `SFX_AEGIS_CAST` | aegis | 2800 | -3 | -17.5 | -18.2 | -13.8 | 0.8 | -20.1 | +0.7 | 0 | 1.1e-8 | 14.5 | 7 | ok |
| `SFX_AEGIS_FORM` | aegis | 2200 | -3 | -19.6 | -20.1 | -15.1 | 0.8 | -22 | -1.2 | 0 | -1.8e-5 | 16.6 | 107 | ok |
| `SFX_AEGIS_STRESS_01` | aegis | 2400 | -3 | -17 | -18.4 | -15.3 | 0.75 | -20.9 | +0 | 0 | 7.9e-7 | 14 | 90 | ok |
| `SFX_AEGIS_STRESS_02` | aegis | 2400 | -3 | -16.5 | -17.8 | -14.8 | 0.75 | -20.3 | +0.6 | 0 | 2.5e-6 | 13.5 | 90 | ok |
| `SFX_AEGIS_FADE` | aegis | 2600 | -3 | -19.2 | -19.1 | -14 | 0.75 | -21.6 | -0.7 | 0 | 3.6e-7 | 16.2 | 193 | ok |
| `SFX_RIFTBORN_ATTACK_01` | boss | 600 | -3 | -17.3 | -17.6 | -15.8 | 0.85 | -19 | +0.6 | 0 | -6.3e-8 | 14.3 | 180 | ok |
| `SFX_RIFTBORN_ATTACK_02` | boss | 600 | -3 | -17.1 | -17.3 | -15.5 | 0.85 | -18.7 | +0.9 | 0 | -4.6e-8 | 14.1 | 180 | ok |
| `SFX_RIFTBORN_ATTACK_03` | boss | 600 | -3 | -16.8 | -17 | -15.3 | 0.85 | -18.4 | +1.1 | 0 | -8.7e-8 | 13.8 | 180 | ok |
| `SFX_GRAVORN_ATTACK_01` | boss | 950 | -3 | -17 | -19.2 | -15.8 | 0.9 | -20.1 | -0.6 | 0 | 5.6e-7 | 14 | 19 | ok |
| `SFX_GRAVORN_ATTACK_02` | boss | 950 | -3 | -17.3 | -19.8 | -16.4 | 0.9 | -20.7 | -1.2 | 0 | 7.8e-6 | 14.3 | 26 | ok |
| `SFX_GRAVORN_ATTACK_03` | boss | 950 | -3 | -18.1 | -20.5 | -17.1 | 0.9 | -21.4 | -1.9 | 0 | -2.4e-6 | 15.1 | 27 | ok |
| `SFX_BATTLE_TRANSITION_FINAL` | transition | 1600 | -3 | -18.5 | -21.1 | -17.4 | 0.85 | -22.6 | -1.9 | 0 | -3.5e-5 | 15.5 | 10 | ok |
<!-- SFX_ANALYSIS_END -->

## Keputusan koreksi
| Temuan (pengukuran awal) | Keputusan | Hasil |
|---|---|---|
| Lonjakan tepi > 0.05 pada 33 berkas lama (kriteria awal saya) | Kriteria dibuang sebagai syarat: itu kemiringan alami sinyal frekuensi tinggi, bukan klik; yang menentukan klik adalah sampel pertama/terakhir (semua 0) | tanpa perubahan berkas |
| "Run datar" memicu positif palsu pada sinus rendah | Definisi diganti: sampel int16 identik berturut-turut dekat puncak | 0 run datar di semua berkas |
| `SFX_UI_SHOP_BUY/SELL` +4.9/+4.8 dB di atas median UI (koin cerah, K-weighting) | gain 0.6 -> 0.42 | +1.8/+1.7 dB |
| `SFX_UI_DIALOGUE_ADVANCE` -4.6 dB | gain 0.35 -> 0.4 (tetap bunyi paling pelan karena paling sering) | -3.4 dB |
| Bunyi Phase 8 awal sangat dinamis (crest 17-19 dB: transien memuncak, badan pelan) sehingga RMS jauh di bawah bunyi lama: `RIFTBORN`, `SEAL_ERROR`, `FORTRESS_DOOR`, `HEART_LOCK`, `FRACTURE_MARK`, `AEGIS_STRESS` | Saturasi tanh terkontrol (`soft()` di `catalog.mjs`: normalisasi lalu tanh) sebelum reverb, puncak tetap -3 dBFS | crest turun ke 13-16 dB (mis. RIFTBORN 19.3 -> 14.3, HEART_LOCK 16.5 -> 12.9, AEGIS_STRESS 18.4 -> 14.0); RMS naik 3-6 dB |
| Saturasi yang sama pada `STAFF_IMPACT`, `METEOR_IMPACT`, `TOWER_COLLAPSE_DISTANT` | Diterapkan, namun hampir tidak menaikkan RMS (crest 15.7-16.4 -> 14.5-16.5: energi dominan sub-bass dan ekor meluruh); loudness-nya diatur lewat `gain` saja | tidak ada klaim perbaikan |
| `SFX_TOWER_COLLAPSE_DISTANT` -4.1 dB (di luar ±4) | gain 0.55 -> 0.62 (tetap sengaja paling pelan: "jauh") | -3.0 dB |
| Meteor: `DESCENT` (momentary tertinggi) lebih keras dari `IMPACT` | gain `CHARGE` 0.8 -> 0.65, `DESCENT` 0.85 -> 0.7; `IMPACT` 1.0 | momentary efektif impact > descent > charge (diuji) |
| `SFX_VARLGRIM_STAFF_IMPACT` lebih pelan dari swing | gain 0.95 -> 1.0 | |

Kendala tersisa: batas `gain <= 1` (tes registry Phase 7) berarti bunyi dengan RMS rendah tidak bisa dinaikkan lagi lewat registry; nilai-nilai di atas sudah di dalam ±4 dB tiap kelompok. Kelompok Bab IV (median -19.6 boss, -20.9 aegis, -22.8 world, -22.9 meteor) berada dalam ±6 dB median battle lama (-19.1): konsistensi saja, bukan kalibrasi pendengaran.

## Sisa masalah (jujur)
- **Kualitas bunyi tidak diketahui.** Tidak ada telinga di sini. Risiko yang perlu didengar manusia: apakah tik temporal terdengar "komikal"/jam dinding; apakah gemuruh meteor terbaca "jauh" di speaker kecil (sub 40-60 Hz hilang di laptop; harmonik 80-124 Hz ditambahkan untuk itu); apakah harmonik Perlindungan terdengar anggun atau tipis; apakah retakan `AEGIS_STRESS`/`FRACTURE_MARK` terlalu tajam; apakah `TOWER_COLLAPSE_DISTANT` cukup "redam". Resep ada di `catalog.mjs`, parameter mudah diubah lalu `npm run assets:sfx`.
- Semua nada memakai set D (D3 A3 D4 A4 D5 dst.) agar sejalan dengan bunyi Velthia Phase 7; belum diperiksa terhadap BGM karena BGM tidak ada (AWAITING_COMPOSER). Komposer dapat mengganti file mana pun dengan id yang sama.
- Tidak ada ducking/mixing dinamis antar kelompok; hanya `gain` statis, batas 8 suara, dan interval minimum.
- Impact meteor: "keheningan" = ekor berkas meluruh ke senyap (~0,6 s terakhir < -60 dBFS) + lead tidak memutar apa pun sesudahnya; pengaturan waktu itu milik lead.
- Ukuran total naik dari ~2,7 MB ke ~7,9 MB. Bila anggaran muat penting, `HEART_UNSEAL`, `ECHO_MEMORY`, `TOWER_COLLAPSE_DISTANT` (3,4-4,4 s) dapat dipangkas.

## Bukti
- `npx vitest run tests/unit/sfx.test.ts tests/unit/sfx-audio.test.ts tests/unit/sfx-analysis.test.ts tests/unit/audio.test.ts`: 143/143 lulus. `npx tsc --noEmit`: tidak ada galat pada berkas milik S.
- Regresi AudioManager terbukti gagal terhadap `AudioManager.ts` dari `HEAD` (3 tes gagal), lulus pada versi baru.

## Permintaan ke lead
1. **Pemicu** (tidak saya pasang): lihat tabel "Urutan pemicu yang disarankan" di `SFX_DESIGN_AND_MANIFEST.md`. Poin penting: `SFX_METEOR_DESCENT` -> `SFX_METEOR_IMPACT` berurutan (descent berakhir keras, dipotong 80 ms); `SFX_AEGIS_STRESS` dimulai bersamaan dengan impact; tidak ada SFX ~0,6 s sesudah impact; `SFX_METEOR_CHARGE` jangan diputar di tiap `meteor_hold` (interval minimum 1,5 s sudah membatasi).
2. **BootScene** memuat semua entri READY dari `SFX_REGISTRY` (key = id atau `id#i`); tidak perlu perubahan daftar manual bila memuat dari registry. `BATTLE_SFX`/`battleSfxRegistry.ts` tidak diubah.
3. Kategori transisi baru `final`: `TransitionScene` memetakan ke `SFX_BATTLE_TRANSITION_FINAL` (1,6 s; stafnya ditanam di ~1,0 s sehingga layar sebaiknya tertutup penuh pada saat itu).
4. Backend `main.ts`: pastikan `playSfx(key, volume, rate)` benar-benar dipakai (permintaan Phase 7 masih berlaku) agar `rate` berlaku.
5. Bila lead menambah id SFX lagi, tambahkan ke `catalog.mjs` (jangan edit `sfxRegistry.ts` manual) dan perbarui `REQUIRED_P8`/hash tes sesuai kebutuhan.
