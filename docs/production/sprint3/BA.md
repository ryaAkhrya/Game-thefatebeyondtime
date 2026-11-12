# Agen BA (Battle Art) — Phase 7

Status: DRAFT / NEEDS_REVIEW. Atlas battle penuh untuk C02 Velthia, B03 Chronolith, M05 Oathguard dari desain RESMI. Atlas DRAFT lama (blob/orb 4 pose) tidak layak dan tidak dipakai; sumber `assets/` tidak diubah.

## Dibuat
- `web/scripts/battle-art/bakit.py` (pustaka: palet k-means tetap, boneka kertas, pixelize area-average, outline, atlas+JSON, lembar kontak), `build_c02.py`, `build_b03.py`, `build_m05.py`. Jalankan: `python -I web/scripts/battle-art/build_X.py` (35 dtk masing-masing; perlu Pillow/numpy/scipy; tidak ada jaringan/acak selain seed tetap).
- Aset: `web/public/assets/battle/{C02,B03,M05}_BATTLE_V1.{png,json}`.
- Kode: `combat/BattleAtlas.ts` (`BATTLE_TEXTURE.C02/B03/M05`, `fullAtlas()`, `frameKeyFor()`, `REQUIRED_BATTLE_FRAMES`), `data/assetManifest.ts` (tiga entri `*_BATTLE_V1`, `imported`, dimuat umum oleh BootScene lewat `assets.loadable()`: spritesheet key = id, meta JSON key = `${id}:meta`; TIDAK perlu edit BootScene).
- Tes: `web/tests/unit/battle-art-phase7.test.ts` (31 tes, lulus): grid/JSON/kunci frame, alfa keras, margin sel, ukuran berdiri, pivot & baris kaki, palet <= 32 + outline membungkus siluet, tanpa piksel liar (pulau < 4 px), selisih piksel antar semua pasangan pose, tell charge Chronolith (piksel ember + busur naik, kaki identik), tangan Velthia terangkat, Velthia menghadap kiri, kabel manifest.
- Lembar kontak (sudah dilihat): `docs/production/sprint3/battle-contact-sheets/*_contact.png` di dua latar (tanah #65533E, backdrop #304734).

## Angka untuk BattleScene (lead)
Semua frame satu pivot per atlas; pivot y = baris opak terbawah (termasuk outline) = garis tanah; `yForFoot()` yang ada sudah benar.

| Atlas | texture key | frame | pivot | menghadap | bbox idle (w x h) | event |
|---|---|---|---|---|---|---|
| C02 | `C02_BATTLE_V1` | 116x112 | [58,108] | KIRI (sisi party, tanpa flip) | 33 x 101 | `cast` (idx 3) |
| B03 | `B03_BATTLE_V1` | 192x140 | [80,136] | depan (simetris) | 126 x 129 | `attack` (idx 4) |
| M05 | `M05_BATTLE_V1` | 160x128 | [84,123] | KANAN (sisi musuh, tanpa flip) | 90 x 112 | `attack` (idx 3) |

Saran: Velthia ≈ Yaric (94 px) → tinggi 101 px, `HOME_X` party ketiga ±0.80–0.82 w, `GROUND` sama dengan C03 (0.56)/C01 (0.70) sesuai baris. Chronolith boss: tinggi 129 px, lebar 126 (jangkauan lengan serang sampai +45 px kanan pivot dalam frame 192): tempatkan seperti Mournfang (`HOME_X.enemySingle` 0.244, `GROUND.enemySingle` 0.70) dengan `standOff` boss ≥ 130 px dan bayangan ±112x7. Pada view h≈270 sprite 129 px tinggi muat (kepala di y≈59). Oathguard: 112 px, dua Oathguard pada `enemyTwo` [0.18,0.34] (jarak ±77 px pada w=480) akan tumpang tindih (lebar 90, tombak lebih lebar saat serang) — pakai satu per slot atau geser.

## Kunci frame
- C02: `idle_a idle_b anticipation cast heal shield summon followthrough recovery hit_recoil hit_recover death_start defeated` + alias `attack` (= rect `cast`, durasi 280). Intent: serang = `anticipation`→`cast`→`followthrough`→`recovery`; heal = `heal`; ward = `shield`; summon alam = `summon`.
- B03: `idle_a idle_b anticipation charge attack followthrough recovery guard special hit_recoil hit_recover death_start defeated`. Tell sebelum serangan = `anticipation`→`charge` (busur naik, inti menyala). `guard` = pertahanan; `special` = turn-shift temporal.
- M05: `idle_a idle_b anticipation attack followthrough recovery hit_recoil hit_recover death_start defeated`.
Durasi ada di JSON (`duration_ms`). Memakai kunci khusus yang tak ada → `frameKeyFor(atlas,key,'attack')`.

## Kualitas (jujur)
- Fungsional: PASS (grid, pivot, palet, outline, perbedaan pose terverifikasi piksel; `tsc --noEmit` bersih).
- Visual: PARTIAL. Semua pose = re-pose gambar yang sama (bukan gambar tangan): sendi/ujung potongan terlihat kasar, shading mengikuti sumber. Chronolith terbaik dan jelas berbeda dari Mournfang/Veyrath (simetris, busur batu, inti amber); Oathguard terbaca baik, pose serang tombak horizontal kasar; Velthia terbaca (gaun plum/emas/krem, rambut pendek, tanpa senjata) tetapi kecil/sempit dan tangan hanya 3–5 px (diperbesar), wajah profil minimal. `hit_recoil` memakai kilap putih (flash) 8–20%. Kontras terhadap tanah coklat: batu Chronolith mirip tanah (andalkan outline plum 1 px). Belum diuji E2E `battleSpriteVisibility` (lead/E2E). Semua butuh seniman untuk final.

## Permintaan ke lead
1. `tests/unit/assets.test.ts` (bukan milik saya) kini gagal 2 tes karena tiga entri manifest baru: daftar id terurut (baris ±26) perlu menambahkan `'B03_BATTLE_V1','C02_BATTLE_V1','M05_BATTLE_V1'` dan `registry.loadable()` 16 → 19 (baris ±35).
2. BattleScene: untuk id `C02`/`B03`/`M05` pakai `fullAtlas(cache.json.get(`${BATTLE_TEXTURE[id]}:meta`))` (atlas sudah penuh; jangan lewat `draftPosePlayback`); `meta(id)` sudah jatuh ke cache JSON bila tak ada di `draftPlayback` (cukup tidak memasukkan id ini). Velthia menghadap kiri seperti Yaric (tanpa flip), Oathguard/Chronolith seperti Mournfang (tanpa flip).
3. Bayangan boss B03: setSize ≈ 120x7 (seperti B01 116).
