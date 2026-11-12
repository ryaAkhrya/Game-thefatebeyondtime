# Agen BA (Battle & Character Art) — Phase 8

Status: DRAFT / NEEDS_REVIEW. Atlas battle penuh Varlgrim (B04/C04), Gravorn (M04), Riftborn (M06), eksplorasi + portrait Varlgrim, audit portrait kanon C4. Sumber `assets/` tidak diubah. Bukan final: semua pose = re-pose dari gambar resmi yang sama, perlu seniman.

## Dibuat
- Skrip (`python -I`, Pillow/numpy/scipy, deterministik, ±40 dtk masing-masing): `web/scripts/battle-art/build_b04.py`, `build_m04.py`, `build_m06.py` (pustaka `bakit.py` tidak diubah; lembar kontak ditulis ke `docs/production/sprint4/battle-contact-sheets/`).
- Aset: `web/public/assets/battle/{B04,M04,M06}_BATTLE_V1.{png,json}` (format JSON Phase 7: `frame_size`, `frames{index_0_based,rect,pivot,duration_ms}`, `event`; tanpa `anims`, seperti atlas V1 lain).
- Eksplorasi: `web/scripts/prepare-c04-assets.mjs` (salinan lama byte-identik) → `normalize-exploration-sprites.mjs` (+ entri C04) → `author_cast_build.py C04` (C04 ditambah ke `FALLBACK_NAMES`; hanya C04 dijalankan, atlas lain tidak berubah, terverifikasi `git status`) → `characters/final/C04_explore.{png,json}` (288x192, `anims` idle/walk per arah).
- Portrait: `prepare-ui-assets.mjs` (+ roster C04 dan `C02_ANGRY`, mode `UI_ONLY_NEW=1`; semua portrait lama byte-identik, `ui.generated.json` digabung 42 → 51 item) → `portraits_hd/C04_{NEUTRAL,ANGRY,STERN,REMORSE,DETERMINED,SAD,SURPRISED,SUSPICIOUS}.png` + `C02_ANGRY.png` (tinggi 352).
- Kode: `combat/BattleAtlas.ts` (`BATTLE_TEXTURE.C04/B04/M04/M06`, `SPECIAL_FRAME_FALLBACK`, `specialFrameKey(atlas,'plant'|'raise'|'cast'|'guard')`, `hasSpecialFrame`, `atlasHoverPx(meta)`; perilaku lama tak berubah), `data/assetManifest.ts` (`B04_BATTLE_V1`, `M04_BATTLE_V1`, `M06_BATTLE_V1`, `C04_CITY_EXPLORE`), `data/assetPaths.ts` (`PORTRAIT_EXPRESSIONS.C04`, `C02` + `ANGRY` → BootScene memuatnya otomatis).
- Tes: `tests/unit/battle-art-phase8.test.ts` (baru) dan `tests/unit/assets.test.ts` (daftar id + `loadable()` 19 → 23). 180/180 lulus bersama `battle-art-phase7` dan `cast-sprites`. `tsc` bersih untuk file milikku.

## Angka untuk BattleScene (lead)
Satu pivot per atlas; pivot y = baris opak terbawah (termasuk outline) = garis tanah (kecuali Riftborn, lihat hover). `yForFoot()` yang ada sudah benar.

| Aktor | texture key (= id manifest, meta `${id}:meta`) | frame | pivot | menghadap | bbox idle (w x h) | event |
|---|---|---|---|---|---|---|
| `C04` Varlgrim (B04) | `B04_BATTLE_V1` | 208x176 | [88,171] | KANAN | 61 x 125 (tongkat termasuk; `plant` 76x158, `raise` 61x164) | `attack` (idx 3) |
| `M04` Gravorn | `M04_BATTLE_V1` | 176x136 | [88,131] | depan, condong kanan | 108 x 101 | `attack` (idx 3) |
| `M06` Riftborn / Penguji | `M06_BATTLE_V1` | 160x128 | [72,124] | depan, menyentak kanan | 87 x 87 | `attack` (idx 3) |

Pakai `fullAtlas(cache.json.get(`${BATTLE_TEXTURE[id]}:meta`))` (jangan lewat `draftPosePlayback`).

Kunci frame: standar `idle_a idle_b anticipation attack followthrough recovery hit_recoil hit_recover death_start defeated` pada ketiganya.
- B04 khusus: `plant` (tongkat ditanam: `time_bind`/`phase_shift`), `raise` (tongkat diangkat, menahan langit: `meteor_call`/`meteor_hold`), `cast` (tangan terulur, tongkat tertanam: `distortion_wave`/`seal_pulse`). `keeper_stance` = `anticipation`; `keeper_strike`/`fracture_strike` = `anticipation`→`attack`→`followthrough`→`recovery`; `meteor_fall` bagi Varlgrim = tetap `raise` lalu `recovery`.
- M04 khusus: `guard` (`gravorn_brace`); `gravorn_heave`/`gravorn_crush` = `anticipation` (lengan terangkat di atas kepala, silhouette ±17 px lebih tinggi)→`attack`→`followthrough`→`recovery`.
- M06: `rift_gather` = `anticipation` (cincin menyempit lalu berhenti), `rift_lash`/`rift_surge` = `attack`→`followthrough` (menyentak ke kanan, `rift_surge` boleh diperpanjang dengan `followthrough` lebih lama).
- `specialFrameKey(atlas, key)` memberi fallback (`plant`/`raise`→`anticipation`, `cast`→`attack`, `guard`→`idle_a`) bila atlas tak punya.

Saran skala/penempatan: Varlgrim tinggi badan ≈ 120 px (1,3x Yaric 94 px; tongkat 126 px), tempatkan seperti Chronolith/Mournfang (`HOME_X.enemySingle` 0.244, `GROUND.enemySingle` 0.70; `standOff` boss ≥ 130 px karena `attack` menjangkau +77 px kanan pivot, `followthrough` +72 px, bayangan ±70x7 di sekitar kaki x≈pivot, bukan di tengah frame). Gravorn 101 px tinggi, 108 px lebar: dua musuh pada `enemyTwo` [0.18,0.34] (jarak ±77 px pada w=480) akan tumpang tindih (Gravorn+Riftborn pada `fortress_rift`; Riftborn 87 px lebar) — geser slot atau skala tampilan 0,8. Riftborn MELAYANG: baris terbawah = pivot.y-6 (`hover_px` = 6 di JSON; `atlasHoverPx(meta)`); gambar bayangan di garis pivot (jangan di dasar sprite) agar tidak terlihat melayang tanpa bayangan; `defeated` jatuh di tanah (baris terbawah = pivot.y).

## Audit portrait kanon C4 (DIALOGUE_EVENTS.json `C4-01..07`, 36 baris) + teks `dialogue/chapter4*.ts`
Sebelum: kurang `C04_{ANGRY,DETERMINED,REMORSE,STERN}` (dan 4 ekspresi C04 lain yang diminta kontrak) serta `C02_ANGRY`. Sesudah: semua ada.
- C01: CONFUSED, DETERMINED, EMBARRASSED, NEUTRAL, SAD, SURPRISED, HAPPY (teks fortress) — ada.
- C02: AMUSED, **ANGRY (baru)**, NEUTRAL, STERN, SURPRISED, VULNERABLE, WORRIED — ada.
- C03: DETERMINED, MISCHIEVOUS, SOLEMN — ada. C05: NEUTRAL, SKEPTICAL, WORRIED — ada. C06: NEUTRAL — ada. C09: AMUSED, WORRIED — ada.
- C04: **ANGRY, DETERMINED, REMORSE, STERN (dipakai) + NEUTRAL, SAD, SURPRISED, SUSPICIOUS (baru)** — diturunkan dari `C04_EXPRESSION_*.png` asli (tidak ada wajah karangan). Uji `battle-art-phase8.test.ts` memeriksa seluruh 36 baris kanon.
Catatan: audit teks `chapter4*.ts` dilakukan terhadap file yang ada pada 13 Nov; bila N/F/A4 menambah ekspresi baru, jalankan ulang audit (tes kanon hanya menjaga baris `DIALOGUE_EVENTS`).

## Kualitas (jujur)
- Fungsional: PASS (grid, JSON↔PNG, alfa keras tidak kosong untuk SETIAP frame, tanpa pulau < 4 px, tubuh utama satu keping, outline membungkus, margin sel, garis kaki konsisten, palet ≤ 32 [30/25/27 + outline termasuk], kunci frame kontrak).
- Visual: PARTIAL. Sudah dibuka dan diperiksa: lembar kontak + zoom.
  - Varlgrim terbaca sebagai pria tua berjanggut berambut ikal panjang, mantel plum bergaris ocher, sabuk, boot, TONGKAT berpilin dengan pita merah; siluet jelas di atas tanah coklat dan backdrop hijau. Kasar: re-pose (sendi lengan prosedural, kepalan tunggal), wajah profil sangat kecil, arah cahaya = sumber; `cast` tangan jauh = salinan kepalan gelap yang bertumpuk dengan tongkat (kurang terbaca); `defeated`/`death_start` terbaca sebagai membungkuk/berlutut tertutup jubah, bukan berlutut yang jelas; `plant` mirip `idle` (beda: tubuh condong, tangan tinggi). Tidak ada animasi jalan.
  - Gravorn: idle bagus (identik konsep); `attack`/`guard`/`followthrough` batu-di-atas-batu sehingga lengan kurang terpisah dari badan; `defeated` bukit batu pendek.
  - Riftborn: terbaca (vortex ungu + busur emas), tell/terjang jelas; speckle oranye pada batu; `defeated` jarang dan lemah.
  - Eksplorasi Varlgrim: prototipe kasar (badan sama untuk semua arah, tidak ada tongkat); belum diautor ulang seperti C02/C03/C08. Tinggi 44 px, kaki y=46.
- Belum diuji E2E `battleSpriteVisibility` (lead/E2E).

## Permintaan ke lead
1. **Arah hadap**: tugas menyebut Varlgrim menghadap KIRI "sisi musuh", tetapi di `BattleScene` musuh berdiri di KIRI layar (`HOME_X.enemySingle` 0.244) dan menghadap KANAN ke party (M05 Oathguard menghadap kanan tanpa flip; Yaric/Velthia menghadap kiri). Atlas B04 saya menghadap KANAN (sumber turnaround samping aslinya menghadap kanan, tanpa cermin). Bila Anda memang menginginkan kiri, cukup `setFlipX(true)` — jangan ubah atlas.
2. Kunci manifest eksplorasi: id mengikuti pola kota (`C04_CITY_EXPLORE`; BootScene memuat `finalPath` `characters/final/C04_explore.png` dengan key = id, meta `C04_CITY_EXPLORE:meta`). Tidak ada key literal `C04_explore`; jika F/A4 menginginkan alias, tambahkan di BootScene/`FortressView` atau minta saya mengganti id.
3. BattleScene: Riftborn melayang (`atlasHoverPx`), pilih `frameKeyFor`/`specialFrameKey` untuk `plant|raise|cast|guard`; `FrameKeyHint` (E) perlu `plant | raise` agar tipe sah.
4. Tes di luar kepemilikanku yang sedang gagal pada saat saya menjalankan seluruh `tests/unit` (bukan akibat perubahanku): `presentation.test.ts` (1), `vfx-atlas.test.ts` (11, atlas VFX Phase 8 V belum ada), `aveloria-crisis-assets.test.ts`, `temple-map.test.ts` (suite gagal dimuat); `tsc`: `WorldScene.ts` (FortressView belum ada), `tests/unit/helpers/chapter4.ts`.
5. `ui.generated.json`/`prepare-ui-assets.mjs`/`prepare-c04-assets.mjs`/`normalize-exploration-sprites.mjs`/`author_cast_build.py` kusentuh sebatas penambahan C04/C02_ANGRY (skrip pipeline portrait/eksplorasi dianggap bagian "pipeline resize/normalisasi yang ada").
