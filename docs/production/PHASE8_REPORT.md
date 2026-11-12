# PHASE 8 REPORT — Chapter IV: The Fate — Varlgrim · Heart of Time · Ultimate Perlindungan · Level 10

Tanggal: 13 November 2026. Platform: desktop web, Phaser 4.2.1, TypeScript strict, Vite. Tidak ada commit, push, atau deploy otomatis. Modern Interlude, Epilog, kredit akhir, pesan anniversary, foto dan identitas modern TIDAK dibuat.

## STATUS AKHIR

| Dimensi | Status |
|---|---|
| Fungsional (alur, mekanik, save) | **PASS** pada semua pengujian otomatis di bawah |
| QA otomatis | **PASS** (unit 1531/1531; tsc bersih; Edge produksi regresi 906 + Phase 8; Chrome Phase 8 119/119) |
| Visual | **REVIEW PENDING** — seluruh art Bab IV DRAFT/NEEDS_REVIEW, digambar dengan kode; belum dinilai manusia |
| Audio | **REVIEW PENDING** — 23 SFX asli diukur objektif saja; belum didengar manusia; BGM = AWAITING_COMPOSER (tidak dibuat) |
| Balance / pacing | **REVIEW PENDING** — angka dari simulasi dan bot; belum playtest manusia |
| Performa | Headless saja; FPS perangkat nyata **belum diukur** |

Tidak ada klaim playtest manusia, kualitas visual akhir, atau kualitas audio akhir.

---

## A. Ringkasan deliverable

| Area | Hasil |
|---|---|
| Chapter IV playable | Kartu akhir Bab III "Mulai Bab IV" → Warden Fortress → Varlgrim → Heart of Time → menara runtuh → Ruang Gema → Torvan → kembali ke Aveloria → kartu "Bab IV selesai". Berhenti di sana. |
| Fortress | 9 ruang, dua teka-teki pengamatan, 5 encounter, 2 lentera istirahat, lentera checkpoint pra-boss, pintasan, peti dan catatan lore. |
| Varlgrim (B04 = C04) | Tongkat kayu besar berpilin (bukan jam pasir), 3 fase (Keeper, Distortion, Meteor), pola deterministik tanpa RNG. |
| Meteor + Perlindungan | Telegraf penuh minimal satu giliran aksi; hanya selamat dengan Ultimate Perlindungan Velthia; tanpa softlock; ulang cepat. |
| Progression | Level cap 5→10, EXP data-driven, ledger kompatibilitas save lama. |
| Cerita | 36 baris kanon C4-01..07 verbatim, 162 baris DRAFT_IMPL penghubung. |
| SFX | 23 id baru (registry 67 id / 86 berkas), semua sintesis kode. Tanpa BGM. |
| Art | B04/M04/M06 atlas battle, C04 eksplorasi, Fortress (93 frame), Aveloria pascakrisis, 5 atlas VFX baru. Semua DRAFT. |

## B. Baseline

Commit `a377e3d` (Phase 7 FUNCTIONAL PASS). Baseline unit dan Edge dijalankan ulang sebelum perubahan: Edge 906 PASS (722 regresi + 184 Phase 7). Satu kali jalan baseline pertama berakhir exit 1 dengan log terpotong; jalan ulang pada dist yang sama bersih (906). **Penyebab tidak diketahui; dicatat sebagai flake yang tidak dapat dijelaskan.**

## C. Alur Chapter IV (beat C4-01..07)

| Beat | Isi | Penanda |
|---|---|---|
| C4-01 | Kartu "Mulai Bab IV", Gerbang Luar, Riftborn pertama, laporan kurir A, Aula Lonceng | `c4.start` |
| (kerja) | Arsip Penjaga: pusaka bergema mengajarkan Perlindungan (bukan level) | `c4.aegis_learned` |
| C4-02 | Ruang Uji Segel (boleh gagal, ulangi), lentera Serambi (pulih penuh + checkpoint), konfrontasi 6 baris | `c4.aegis_trial`, `checkpoint.c4_before_varlgrim`, `c4.confront` |
| C4-03 | Varlgrim kalah; berlutut bertumpu tongkat; dua baris kanon | `boss.varlgrim`, `c4.lean_seen` |
| C4-04 | Dua pengunci Heart (urutan bebas), jendela busur, menara runtuh dari kejauhan | `c4.heart_open`, `c4.tower_fallen` |
| C4-05 | Ruang Gema: peta kulit + dua keping logam (gema, tidak dapat diambil), ingatan lama | `c4.old_memory` |
| C4-06 | Pengakuan Varlgrim; Torvan muncul, batas kekuasaan; Torvan pergi | `c4.varlgrim_truth`, `c4.creator_reveal` |
| C4-07 | Pulang lewat Gerbang Luar, Aveloria pascakrisis: evakuasi selamat, sebagian tidak | `c4.returned`, `chapter.4_complete` |

Aturan beat: flag di akhir beat N menghasilkan beat N+1 (`storyBeatFor`). Validasi `GameState` menolak flag Bab IV tanpa `C3.complete`, menolak flag Bab IV pada slot Bab I–III, dan menegakkan rantai urutan (mis. `checkpoint` mensyaratkan `aegisTrial`).

## D. Warden Fortress

```
Jalan masuk -> Gerbang Luar (Riftborn) -> lorong -> Aula Lonceng Berhenti (lentera istirahat)
  barat: bekas barak (guardpost: Oathguard+Riftborn; peti Potion) -> Arsip Penjaga (pusaka Perlindungan, jubah)
  timur: Ruang Uji Segel (uji Perlindungan; zirah Benteng)
  utara: Pintu Segel -> Koridor Retakan (lentera istirahat; jangkar; fortress_rift) -> Serambi Heart (lentera checkpoint)
  Ruang Heart (Varlgrim) -> Ruang Gema -> Gerbang Luar (pulang)
```

- **Teka-teki 1, Urutan Segel Jaga:** empat pilar (Fajar, Siang, Senja, Malam). Urutan tertulis di buku jaga (Arsip). Salah = semua padam, dapat diulang. Benar membuka Pintu Segel.
- **Teka-teki 2, Jangkar Retakan:** tiga slab, dua jangkar yang membalik pasangan slab. Semua keadaan dapat dicapai dan diselesaikan (dibuktikan dengan unit test; selalu dapat dibalik).
- **Pengunci Heart ganda:** bukan teka-teki; keduanya wajib, urutan bebas.
- Tanpa QTE, refleks, atau acak. Kemajuan sementara tidak disimpan (hanya flag selesai).
- **Encounter:** `fortress_riftborn`, `fortress_gravorn`, `fortress_guardpost`, `fortress_rift` (berat), `fortress_aegis_trial` (uji). Dua lentera istirahat bebas dipasang karena pertarungan berurutan menguras HP/MP (temuan balance E2E).
- **Checkpoint:** lentera Serambi memulihkan HP/MP penuh dan menyimpan `checkpoint.c4_before_varlgrim`; Pintu Heart terbuka sesudahnya. Retry/ulang tidak mengulang Fortress.

## E. Varlgrim (lihat `VARLGRIM_BOSS_DESIGN.md`)

HP 1150, ATK 50, MAG 44, DEF 16, MDEF 12, SPD 8 (selalu bertindak sesudah kedua pemain tiap ronde). Fase: Keeper (100–66%), Distortion (≤65%), Meteor (≤35%). Satu giliran `phase_shift` pada tiap transisi; masuk fase 3 membangkitkan anggota yang tumbang pada 25% HP. Siklus pola deterministik; tiap serangan berat bertelegraf (`keeper_stance`→`keeper_strike`, `fracture_mark`→`fracture_strike`). Setelah `meteor_fall` selalu aksi lembut (`seal_pulse`), minimal dua aksi biasa sebelum meteor berikutnya. Kalah: berlutut, tidak meledak.

## F. Meteor dan Ultimate Perlindungan (lihat `ULTIMATE_SHIELD_MECHANIC.md`)

**Mekanik:** Perlindungan = muatan battle 0/1, 0 MP, aksi Velthia, memasang status `aegis` pada seluruh anggota hidup. `meteor_call` (niat terlihat satu ronde) membuka jendela, mengisi ulang muatan, dan menghapus racun/stun. `meteor_fall` datang hanya sesudah ≥ satu ronde pemain penuh. Tanpa perisai: mematikan (kekalahan sah). Dengan perisai: HP tidak pernah di bawah 1 (tekanan `min(HP-1, ceil(22% maxHP))`).

**Pembuktian tanpa softlock:**
1. `meteor_hold`: bila Velthia belum bertindak, Varlgrim menahan meteor, tidak menjatuhkannya. Meteor tidak jatuh bila Velthia KO (Potion membangkitkan di Bab IV; fase 3 membangkitkan otomatis).
2. Siklus giliran tidak pernah menghilangkan giliran siapa pun, sehingga Velthia selalu mendapat satu giliran di antara `meteor_call` dan `meteor_fall` (diuji untuk 5 konfigurasi SPD, termasuk boss tercepat).
3. `meteor-nosoftlock.test.ts`: grid 864 keadaan, 16.440 simulasi aksi, dan fuzz 400 pertarungan: tidak ada keadaan tanpa aksi legal, tidak ada meteor tak terhindarkan selagi Perlindungan tersedia.
4. Menu: Perlindungan naik ke menu utama dan terfokus saat langit ditahan (dibuktikan di E2E, Edge dan Chrome); banner naskah `meteor_call` tampil sebelum dampak.
5. Ulang cepat "Ulang dari fase meteor" memulihkan snapshot awal fase 3 (di memori) tanpa memutar transisi masuk, tanpa hadiah; "Coba Lagi" memuat checkpoint penuh. Dibuktikan di E2E (jumlah transisi final tidak berubah; EXP tidak ganda).
6. Kegagalan yang sah diuji: mengabaikan telegraf berujung kekalahan, kartu kalah menawarkan kedua pilihan, kekalahan tidak menyentuh save/flag/hadiah.

**Telegraf:** Linimasa `meteor_telegraph` ≥ 1,6 s; langit ditahan (siluet di langit) dan banner; `meteor_fall` ≈ 3,2–4,6 s terukur (3,88 s spesifikasi); `aegis_cast` ≈ 2,36 s. Meteor tidak memakai kilat layar penuh; goyang hanya bila Screen Shake aktif.

## G. Progression (lihat `PROGRESSION_LEVEL10.md`)

`LEVEL_THRESHOLDS = [0,25,70,140,235,300,395,500,650,800]`; `MAX_LEVEL`/`EXP_CAP` dibaca dari data (tidak ada 5/235 terkunci). Growth L6–10 per profil. Enam pasif DRAFT. Zirah Benteng (`warden_plate`, `keeper_robe`) dari peti. Hadiah Bab IV disetel 46/54/56/60/48/200. Hasil E2E: Varlgrim dimenangkan dengan level akhir 8–10; EXP boss tepat satu hadiah (200, dipotong cap 800).

**Kompatibilitas save lama:** ledger `rewardLedger.ts` (dipasang di `SaveRepository.decode` untuk v2) membangun ulang EXP yang terpotong cap lama dari flag `reward.*`. Hanya menaikkan, idempoten, tidak pernah menurunkan level atau mengarang EXP; 48 kombinasi migrasi diuji. Save Bab I–III lama tetap terbaca (E2E + unit).

**Skenario pemain:** target level 6–7 sebelum koridor, 7–8 saat Varlgrim pada jalur wajib. Simulasi E: L8 margin tipis (sisa HP ≈ 44%, 20 ronde); pemain terkuat L10 selesai ≈ 15 ronde dan tetap melihat satu meteor. Bot strategis E2E (zirah dipakai, poin jurus dibelanjakan, Perlindungan tepat waktu) menang pada percobaan pertama; bot sederhana kalah. **Pemain tanpa gear atau yang abai kemungkinan kalah; ini perlu playtest manusia.**

## H. Cerita

- 36 baris kanon C4-01..07 dipakai verbatim (unit + E2E menguji C4-01, C4-02 dan lainnya).
- **Varlgrim:** menjaga segel karena takut dicatat sebagai penjaga yang diam; mengaku retak pertama ada di segelnya, ia salah membaca setengah ramalan dan memisahkan ingatan Yaric–Velthia; tidak ada pembelaan; **tidak ada pengampunan instan** (Velthia menunda keputusan "di depan orang-orang yang kau rugikan"; Varlgrim: "Itu adil."; nasib akhirnya dibiarkan terbuka).
- **Torvan:** reveal sebagai pencipta tepat pada C4-06 tanpa deus ex machina: ia tidak berhak mencabut pilihan manusia maupun akibatnya, tidak menghidupkan korban, tidak mengatur siapa yang dipedulikan, tidak memberi hadiah perpisahan, pergi tanpa cahaya.
- **Yaric–Velthia:** saling memilih lewat gestur kecil (tangan terulur lalu ditarik, dua pengunci, "Kita yang memutuskan"). Tidak ada kata cinta atau monolog takdir panjang (dicek tes).
- **Konsekuensi:** menara runtuh; evakuasi warga selamat; satu penjaga gerbang bawah gugur; arsip bawah terkubur; Azie mengakui perintah Velthia benar, dewan menunggu.
- Semua penghubung DRAFT_IMPL ditandai; dialog kerja belum approved.

## I. SFX (lihat `SFX_DESIGN_AND_MANIFEST.md`, bagian Phase 8)

23 id baru (Fortress door/seal/echo, Varlgrim staff/bind/distortion/mark/phase shift, meteor charge/descent/impact, Perlindungan cast/form/stress/fade, Heart lock/unseal, tower collapse, Riftborn, Gravorn, transisi final). WAV 44,1 kHz mono 16-bit, puncak −3 dBFS. Analisis otomatis (`analyze.mjs`): format, klip = 0, DC, klik tepi, kesenjangan grup ±4 dB; hash SHA-256 di manifest; Phase 7 beku (hash tetap). Bug AudioManager yang ditemukan S diperbaiki dengan tes regresi. Browser meminta berkas SFX Bab IV nyata tanpa 404; tidak ada `BGM_*` dimuat. **Kualitas bunyi belum didengar manusia (AUDIO-REVIEW PENDING).** Catatan: bila pemain tidak mendengar apa pun di area tertentu, penyebab umum ialah AudioContext belum terbuka sebelum tombol pertama ditekan atau slider SFX 0.

## J. QA (nyata)

| Pengujian | Hasil |
|---|---|
| `npx tsc --noEmit` | bersih |
| `npx vitest run` | **61 file, 1531 tes lulus** |
| Edge produksi regresi (semua suite lama) | **906/906** (84+197+37+54+38+75+55+105+77+184; identik baseline) |
| Edge Phase 8, 1366 penuh + 1920 singkat | **168/168** |
| Edge Phase 8, 1920×1080 penuh | **119/119** |
| Chrome Phase 8, 1366 penuh | **119/119** |
| Regresi sprite tak terlihat (5 battle berurutan) | lulus di 1366 dan 1920: semua sprite terlihat (piksel nyata), tidak di (0,0), tanpa VFX sisa |
| Aksesibilitas | Shake ON+Flash OFF dan Shake OFF+Flash ON: selesai tanpa error; Reduced Flashes tanpa kilat layar penuh |
| Kekalahan | 0 kekalahan tak terduga pada rute normal (`defeats:*` = 0); kekalahan disengaja diuji (tanpa Perlindungan, ulang cepat, retry penuh) |

Catatan jujur soal pengujian:
- Regresi Edge penuh pertama gagal pada satu pemeriksaan (1920 jalur singkat: "C4-02 verbatim"). Penyebabnya tes, bukan game: pintasan QA sudah menandai `C4.confront`, jadi dialog sengaja tidak diputar ulang. Pemeriksaan kini hanya berlaku di jalur penuh (yang lulus di 1366, 1920, Chrome); jalur singkat memeriksa bahwa battle langsung terbuka. Sesudahnya satu kegagalan lain (teleport pemicu tertimpa pemuatan adegan di jalur singkat) diperbaiki dengan percobaan ulang di tes. Phase 8 lalu dijalankan ulang bersih (168/168). Suite lama tidak diulang setelah perbaikan ini karena hanya `phase8.mjs` yang berubah; hasil 906 berasal dari jalan sebelumnya.
- Temuan nyata dari E2E yang diperbaiki di game: baris "Kabur" terpotong di menu enam baris (dilepas bila Perlindungan naik ke menu utama); siluet meteor terpotong di atas (diposisikan ulang); chip status "Perlindungan 99 giliran" (chip tanpa angka).

**Performa (headless, BUKAN FPS perangkat):** `perf8.mjs` pada Edge headless: rata-rata frame 16,66 ms pada Fortress idle, battle Varlgrim idle, `aegis_cast`, dan `meteor_fall` di 1366 dan 1920 (satu frame maksimum 33,4 ms pada `meteor_fall` 1920). Karena rAF headless terkunci 60 Hz, angka ini hanya membuktikan tidak ada stall besar, bukan FPS GPU nyata. Efek aktif setelah meteor 10 sprite (aegis/aftermath sebelum memudar), bukan kebocoran tak terbatas. Atlas VFX Phase 8 ≈ 11 MB GPU dimuat tanpa syarat (belum dibuat dimuat bersyarat). **Performa perangkat nyata: BELUM DIUKUR.**

## K. Screenshot dan preview

Screenshot E2E di `.dev-cache/e2e-p8-edge-final2/` (15 berkas): `p8_fortress_gate`, `p8_seals_solved`, `p8_archive`, `p8_riftborn_battle`, `p8_gravorn_battle`, `p8_rift_aligned`, `p8_rift_battle`, `p8_varlgrim_intro`, `p8_aegis_menu`, `p8_meteor_defeat`, `p8_varlgrim_victory`, `p8_heart_open`, `p8_torvan_reveal`, `p8_aveloria_aftermath`, `p8_chapter4_end`. Contact sheet art: `docs/production/sprint4/{fortress,aveloria,battle,vfx}-contact-sheets/`. Preview lokal: `cd web` lalu `npm run dev` → **http://127.0.0.1:5173/** (dari Title: Baru/Lanjut; untuk Bab IV mainkan sampai kartu akhir Bab III, atau muat slot Bab III).

## L. Perubahan berkas (ringkas)

- Baru: `story/{chapter4Flags,Chapter4Story}.ts`, `story/c4/*`, `rpg/{chapter4Rewards,rewardLedger}.ts`, `combat/{varlgrim,aegis,c4Enemies}.ts`, `dialogue/chapter4*.ts/json`, `world/{Fortress*,AveloriaC4*,fortressMaps,fortressPuzzle}.ts`, peta `data/maps/fortress.map.mjs`, `data/{fortressAssets,...}`, generator `scripts/gen-fortress-art.mjs`, atlas `public/assets/{environment/fortress,battle/B04|M04|M06,characters/C04,vfx/vfx_*}`, 23 SFX + `scripts/sfx/analyze.mjs`, tes unit baru (aegis, meteor-nosoftlock, chapter4-*, varlgrim-balance, progression-level10, reward-ledger, fortress-*, vfx-phase8, sfx-analysis) dan E2E `phase8.mjs`, `perf8.mjs`.
- Diubah: `GameState`, `SaveRepository`, `WorldScene`, `BattleScene`, `BattlePanel`, `SliceEndScene`, `TransitionScene`, `SceneRouter`, `Chapter1Story`, `main.ts` (hook `qa.chapter4/battleHp/build`), `BattleEngine/BattleSession/encounters/presentation`, `rpg/{definitions,progression,validation,party}.ts`, `AudioManager`, `Vfx*`, `sfxRegistry`, `ui/labels`, `story/journal`, `tests/e2e/run.mjs`, dokumen (`CLAUDE.md`, `README.md`, `PHASES.md`, `TASKS.md`, `QA_CHECKLIST.md`, `GAME_SYSTEMS.md`, `ASSET_INDEX.md`, `AUDIO_COMPOSER_HANDOFF.md`, `SFX_DESIGN_AND_MANIFEST.md`).
- Tes lama yang diubah karena cap 5→10 dan alasannya: `rpg.test.ts`, `chapter3-engine.test.ts`, `chapter3-balance.test.ts` (lihat `PROGRESSION_LEVEL10.md` bagian 7).
- Skema save: tidak ada bump (`save_v2`, data schema 2, key `tfbt.save.v1.*`).
- Catatan agen per area: `docs/production/sprint4/{P,E,N,F,A4,BA,V,S}.md`; kontrak: `sprint4/CONTRACT.md`.

## M. Keterbatasan dan kesiapan fase berikutnya

**Keterbatasan jujur:**
1. Art DRAFT code-native: Varlgrim `defeated` terbaca seperti membungkuk, pose `cast` lemah, sprite eksplorasi C04 kasar; VFX terbaca "kode-like".
2. SFX belum didengar manusia; BGM tidak ada (AWAITING_COMPOSER; `BGM_FINAL_BOSS`, `BGM_CRISIS` hanya nama kunci).
3. Balance: margin Varlgrim di L8 tipis menurut simulasi; `fortress_rift` berat di L6; jalur minimum Chronolith melewati dua level sekaligus; Selaras Langkah kurang efisien dibanding Denyut. Perlu playtest manusia, lalu setel `VARLGRIM`, `AEGIS.stressPct`, `C4_POWER`.
4. Snapshot ulang cepat hanya di memori (hilang bila scene battle ditutup; "Coba Lagi" tetap bekerja).
5. Performa nyata dan GPU belum diukur; VFX 11 MB dimuat tanpa syarat.
6. Satu flake baseline tak terjelaskan (bagian B).
7. Menu jurus Velthia 10 baris: dicek di E2E layout, belum dinilai manusia (penggulir).
8. Dialog kerja Bab IV belum approved; kanon di atas dokumen kerja.

**Kesiapan Modern Interlude/Epilog (TIDAK diimplementasikan):** `chapter.4_complete` dan `c4.complete` menjadi pintu masuk yang jelas; `storyBeatFor` mengembalikan `C4-DONE`; fase berikutnya perlu menambah flag dan validasinya sendiri (belum diverifikasi apakah schema 2 cukup tanpa migrasi). Data personal modern (foto, pesan anniversary) hanya dari Game Director dengan persetujuan per aset dan tidak boleh ada di build publik. Menunggu instruksi baru.
