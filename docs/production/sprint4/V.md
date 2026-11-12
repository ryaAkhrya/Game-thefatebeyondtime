# Agen V (VFX) — catatan Phase 8 (Bab IV)

Status semua aset: **DRAFT / NEEDS_REVIEW** (digambar dengan kode deterministik, belum ditinjau manusia/seniman, belum dilihat di dalam game). Tidak ada BGM, tidak ada git, `dist` tidak disentuh, tidak ada build/E2E.

## Yang dibuat
| Bagian | Lokasi |
|---|---|
| Lima atlas baru (PNG + JSON Phaser) | `web/public/assets/vfx/vfx_{varlgrim,rift,meteor,aegis,heart}.png/.json` |
| Generator (reproducible) | `web/scripts/vfx/draw-{varlgrim,rift,meteor,aegis,heart}.mjs`, `draw-util.mjs` (dither Bayer, noise sudut, retakan, awan), `atlases.mjs` (daftar + `renderAtlas`, murni tanpa I/O) + `atlases.d.mts`, `build.mjs` (ditulis ulang tipis), `kit.mjs` (`buildAtlas` + opsi `packed`) |
| Contact sheet | `docs/production/sprint4/vfx-contact-sheets/vfx_*.png` + `.rows.txt` (Phase 7 tetap di `sprint3/`) |
| Runtime | `src/game/vfx/Vfx.ts` (API baru), `vfxSpecs.ts` (23 spec + tipe layer baru), `vfxAssets.ts` (atlas + palet + `VFX_PHASE8_KEYS`), `index.ts` |
| Tes | `tests/unit/vfx-atlas.test.ts` (diperluas), `tests/unit/vfx-phase8.test.ts` (baru), `vfx.test.ts` (tak diubah, tetap lulus) |

Regenerasi: `node scripts/vfx/build.mjs [key ...]` dari `web/` (tanpa argumen = semua sepuluh atlas; kelima atlas Phase 7 keluar byte-identik karena `packed` hanya aktif untuk atlas Phase 8).

## Atlas
| Atlas | Frame | Ukuran atlas | Warna | Isi |
|---|---|---|---|---|
| `vfx_varlgrim` | 75 | 512x603 | 15 | temporal_bind, time_distortion, staff_impact, fracture_mark, fracture_strike, seal_pulse, phase_shift, keeper_stance |
| `vfx_rift` | 27 | 512x186 | 15 | riftborn_lash, riftborn_surge, gravorn_slam |
| `vfx_meteor` | 52 | 1024x1392 (≈5,7 MB GPU) | 16 | meteor_sky_hold, meteor_descent, meteor_impact, meteor_aftermath |
| `vfx_aegis` | 47 | 512x1514 (≈3,1 MB) | 12 | aegis_charge, aegis_form, aegis_hold, aegis_stress, aegis_fade |
| `vfx_heart` | 30 | 512x451 | 15 | heart_lock_glow, heart_unseal, tower_dust |

Semua: palet tertutup ≤ 16 warna (kanvas berindeks palet), alfa hanya 0/255, tanpa blur/bloom/gradien halus (transisi tona = dither Bayer/papan catur), cahaya kiri-atas, frame sumber ≤ 512 px (terbesar 380x230). Atlas Phase 8 memakai frame **terpangkas** (`trimmed: true`, `sourceSize`/`spriteSourceSize` utuh, pivot terhadap `sourceSize`) dan rak diurutkan menurut tinggi agar padat. Pivot semua frame x = 0,5.

## Cara memanggil dari BattleScene (koordinat = piksel panggung, kamera stage; zoom bulat tidak perlu diurus: sprite 1x, `scale` bulat)
`this.vfx2` = `Vfx` yang sama seperti Phase 7. Tambahan API:
```ts
const h = this.vfx2.start(id, x, y, opts?): VfxHandle;   // { stop(): void }  — efek persisten
this.vfx2.play(id, x, y, { level?, from?, durationMs?, ...opts lama });
```
`stop()`: peluruhan piksel (frame exit) lalu bersih; aman dipanggil berulang / setelah `clear()` / setelah efek selesai; id tak dikenal → pegangan no-op. Efek persisten menghitung ke cap 64, dibersihkan oleh `clear()`/`destroy()`/shutdown. `play()` pada spec persisten berhenti sendiri di `durationMs` spec (6000 ms); `start()` tanpa `durationMs` berjalan sampai `stop()`.

### Meteor (momen terpenting)
| Efek | Titik (x,y) | Parameter | Catatan |
|---|---|---|---|
| `meteor_sky_hold` (persisten, loop 6 frame @200 ms) | pusat siluet di langit (frame 256x196; badan ≈144x124) | `start()` → `stop()` saat dampak/penghentian | depth 3 (di bawah petarung, di atas latar). Kerak berpilin, retakan jeda teal berdenyut merayap, bara di sisi bawah, busur jeda berputar, 6 keping mengorbit. `stop()`: 3 frame luruh dither. |
| `meteor_descent` | **titik tabrak di tanah** (dasar badan meteor mendarat di y) | `from` {x,y}: titik awal (bawaan lurus di atas, 260 px × scale); `durationMs` (bawaan 1200; lead ≈1000–1400); `scale` bulat; `flip` | 6 frame membesar menurut kemajuan (badan 150→240 px) dengan lidah bara ke atas; jatuh dipercepat (e = f²); jejak bara/batu diskret. Disarankan `from` = pusat siluet sky_hold (hentikan sky_hold di saat yang sama) dan `onDone` memicu `meteor_impact`. depth 12 (di depan petarung; ubah `depth` bila perlu). |
| `meteor_impact` | titik tabrak (tanah) | `seed`; Reduced Flashes → `_c` + partikel ½ | letusan kubah api/debu 380x230 (6 frame, BUKAN jamur), cincin kejut mendatar 380x84 (depth −5), retak lantai 330x72 (depth −8), batu terlempar memantul, bara, abu. Guncangan 280 ms/0,012 lewat `screenShake`. Tanpa kilatan putih (inti amber pucat 1 frame; varian tenang = amber sedang). |
| `meteor_aftermath` | titik tabrak | — | 3,4 s: retak membara mendingin (5 tahap), asap pelan naik, bara melayang, abu jatuh. Ringan (≤ 25 sprite). |

Urutan yang dianjurkan: `meteor_sky_hold` (start) → … `meteor_call/hold` … → `sky.stop()` + `meteor_descent` (`onDone`) → `meteor_impact` + `aegis_stress` (+ `aegis_hold.stop()` sesudahnya bila perlu) → `meteor_aftermath`.

### Perlindungan (Ultimate Shield Velthia)
Bahasa bentuk: **kipas lima lengkung runcing (gerbang gotik/kelopak)** emas pucat + lime pahit di atas plum, bukan lingkaran/oval. Kanopi (tengah emas pucat, pasangan emas, ditambah dua lengkung luar lime berkaki sampai tanah) di atas kepala kedua sekutu; kaki luar di luar sekutu; sigil tanah. Frame perisai 176→192x144, pivot (0,5; 0,9): **(x,y) = titik tengah garis tanah kedua sekutu** (selebar ±96 px; sekutu berjarak ≈ 55 px pada HOME_X 0,76/0,875 muat di dalam). Apex di (x, y−126).

| Efek | Titik | Parameter | Catatan |
|---|---|---|---|
| `aegis_charge` | tangan Velthia | — | 6 frame: titik emas → cincin → lengkung mungil terbentuk di atas tangan + 12 partikel berkumpul. Flashy → `_c` (frame 4–6). |
| `aegis_form` | tengah garis tanah dua sekutu | — | 8 frame: sigil tanah → kaki luar naik → lengkung luar menutup → pasangan tengah → lengkung tengah → panel kisi dither → permata puncak; 10 partikel naik. 0,83 s + 0,7 s partikel. Calm: kontur saja tanpa kisi. depth 11. |
| `aegis_hold` (persisten, loop 4 frame @220 ms) | idem | `start()`/`stop()` | kontur tipis 2 px saja (tanpa isi), titik cahaya bergeser pelan; tidak menutup karakter/UI. `stop()` = `aegis_fade` (4 frame luruh dari puncak ke tanah). |
| `aegis_stress` | idem | **`level` 1..3** | overlay retak dari puncak: L1 satu retak + percikan kecil; L2 dua cabang + serpihan; L3 tiga cabang + celah putus-putus di sepanjang lengkung (gelap/emas) + banyak serpihan. Frame 4 mereda. Guncangan 140 ms/0,006. `level` di luar rentang dijepit; bawaan 1. Hold tetap di bawahnya. |
| `aegis_fade` | idem | — | luruh dither dari puncak ke tanah + partikel naik. Bila hold dipakai, `stop()` sudah memutarnya; panggil `play('aegis_fade')` hanya bila hold tidak berjalan. |

### Efek Varlgrim / musuh / Heart
- `temporal_bind` (x,y = badan target, 64x80): tiga cincin teal putus-putus mengencang lalu terkunci amber. `time_distortion` (x,y = tengah barisan, 200x112): gelombang jeda + irisan bergeser (flashy, `_c`). `staff_impact` (x,y = titik kena): serpihan kayu + debu, guncang 110 ms (flashy). `fracture_mark` (persisten; x,y = di atas/tengah target): glif retak berdenyut, `stop()` saat `fracture_strike`. `fracture_strike` (x,y = target, 72x88): retak vertikal menyambar (flashy). `seal_pulse` (x,y = kaki Varlgrim, `target` = tengah barisan): cincin segel → gelombang rendah → cincin menghantam barisan (flashy). `phase_shift` (x,y = Varlgrim, 96x112): cincin naik + garis putus-putus (tanpa kerusakan; flashy). `keeper_stance` (x,y = kaki Varlgrim): lingkaran penjaga + retak tanah + debu, guncang kecil.
- `riftborn_lash` (x,y = target, menghadap kanan; `flip` untuk sisi lain), `riftborn_surge` (x,y = target; rekahan vertikal, flashy), `gravorn_slam` (x,y = **tanah** di bawah target; chevron tekanan → retak bintang + debu, guncang 150 ms).
- `heart_lock_glow` (persisten; segel emas pucat 48x48 di titik pengunci; `stop()` saat dibuka), `heart_unseal` (x,y = dasar titik pengunci; cincin pecah + tiang cahaya emas pucat naik; flashy), `tower_dust` (x,y = garis cakrawala di jendela busur; 2,7 s; plum debu naik+melebar; frame 192x128, pivot di y=112).
- Efek bukan-battle (Heart/tower_dust) memakai kelas `Vfx` yang sama; scene dunia cukup memenuhi `VfxScene` (add.image + events) dan memuat atlas `vfx_heart`.

## Kendala yang dihormati
Cap global 64 (puncak terbesar: meteor_impact 29 sprite; hold + stress + impact + aftermath bersamaan < 64), pooling (sprite dipakai ulang; `start/stop` berulang tidak menambah objek), Reduced Flashes (flashy → frame `_c` yang dibuktikan tes: total cahaya ≤ aslinya, tanpa piksel luminans > 210, partikel ½), semua depth < 20, koordinat/skala bulat. Efek persisten tidak punya partikel (hanya satu sprite berputar).

## Bukti
- `node scripts/vfx/build.mjs vfx_varlgrim vfx_rift vfx_meteor vfx_aegis vfx_heart`: kelima atlas terbangun (palet 15/15/16/12/15 warna).
- `npx vitest run tests/unit/vfx` (PowerShell + dev-env): **166 tes lulus** (3 berkas). Mencakup: id lengkap (24+23), tiap frame di dalam atlas/tidak tumpang/alfa 0/255/tidak kosong/tidak opak penuh, palet ⊆ `VFX_PALETTES` ≤ 16, batas ukuran (frame ≤ 512, atlas ≤ 4096, ≤ 8 MB), hash PNG/JSON stabil dua kali build **dan sama dengan berkas di public/**, varian tenang tidak lebih terang/tanpa putih, spec konsisten (partikel puncak, durasi, depth), `start/stop` bersih (exit, no-op bila ganda/setelah clear/destroy), cap 64, pooling tidak bocor, 12 battle berurutan tanpa kebocoran sprite/listener, descent (`from`, `durationMs`, frame monoton, titik akhir tepat), level aegis_stress, Reduced Flashes efek baru.
- `npx tsc --noEmit`: file milik V bersih (satu galat TS6133 di `tests/unit/helpers/chapter4.ts` milik agen lain).
- Tinjauan visual: contact sheet dan potongan per-frame dilihat satu per satu (zoom 2–4×), termasuk komposit perisai di atas dua blok seukuran sekutu. **Belum** ada tangkapan di dalam game (dilarang build/E2E).

## Keterbatasan / batas jujur
- Seni dibuat dengan kode, DRAFT: siluet meteor terbaca (kerak berpilin + retakan teal + bara) tetapi belum sekelas redraw seniman; ekor bara descent berbentuk lidah agak geometris; letusan impact dan `tower_dust` memakai gumpalan awan berlapis dither yang agak "kartun"; `fracture_strike` dan retak aegis terbaca seperti petir tipis; ring kejut berupa batu/debu melayang (bukan dinding debu rapat); `time_distortion`/`seal_pulse` bergaris tipis (1–2 px) dan mungkin perlu `scale:2` di resolusi rendah.
- Ukuran meteor (badan 144 px di langit → 240 px saat jatuh pada stage 480x270) dan posisi apex perisai (126 px) perlu disetel lead terhadap sprite/kamera sebenarnya; pivot descent = dasar badan.
- `vfx_meteor` ≈ 5,7 MB GPU; kelima atlas Phase 8 total ≈ 11 MB. Bila `BootScene` memuat semua `VFX_ATLASES` saat boot, itu tambahan beban; alternatifnya muat `VFX_PHASE8_KEYS` hanya saat Bab IV (lead).
- Varian tenang hanya untuk efek yang terang/berkedip (bukan semua frame); `meteor_descent`/`sky_hold` tidak flashy (tepi bara tidak berkedip; em4 hanya sedikit piksel). Kilat kamera (`Effects.flash`) tetap tanggung jawab lead: jangan dipanggil di samping `meteor_impact`/`aegis_stress` kecuali Reduced Flashes mati.
- `stop()` pada efek non-persisten hanya melepas sprite efek itu; efek anak (mis. debu dari `chronolith_slam`) berjalan sampai selesai.

## Permintaan ke lead
1. Panggil `vfx.clear()` saat retry/keluar battle (sudah anjuran Phase 7) dan simpan pegangan `start()` (`sky`, `aegis`) agar `stop()`-nya dipanggil pada urutan meteor; pegangan basi aman.
2. Pasang `screenShake` pada konstruktor `Vfx` (meteor_impact 280 ms/0,012, aegis_stress 140/0,006, dst. sudah ada di spec); jangan menggandakan guncangan sendiri untuk id ini.
3. Muat atlas Phase 8 (`VFX_PHASE8_KEYS`) di BootScene atau bersyarat Bab IV; `ASSET_INDEX.md` perlu entri "VFX Phase 8 — DRAFT/NEEDS_REVIEW" menunjuk ke berkas ini (bukan milikku).
4. Skrip npm opsional `"assets:vfx": "node scripts/vfx/build.mjs"` (package.json bukan milikku).
5. QA visual di battle nyata: skala/posisi meteor vs sprite Varlgrim, jarak perisai terhadap kedua sekutu (HOME_X 0,76 / 0,875; garis tanah Velthia berbeda dari Yaric — gunakan titik tengah, atau panggil dengan `scale` tetap 1), keterbacaan di zoom 3 (768p).
