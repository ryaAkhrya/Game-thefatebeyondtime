# Sprint 4 / Agen F (Fortress) - Warden Fortress (`area.fortress`)

Status: DRAFT / NEEDS_REVIEW. Seni dilukis kode (bukan karya seniman), semua teks pemain Indonesia, tidak ada BGM. `FortressView` belum pernah dijalankan di Phaser/browser nyata (dilarang build/E2E); hanya lolos `tsc` dan tes unit.

## File yang dibuat
| File | Isi |
|---|---|
| `web/src/game/data/maps/fortress.map.mjs` + `.d.mts` | SATU sumber: 20 persegi lantai, penghalang dinamis, jejak kaki, 162 prop, 43 interaktif, 6 pemicu, spawn/titik kembali battle, titik adegan. Dipakai game, generator, tes. |
| `web/src/game/world/fortressMaps.ts` | `loadFortress()`, `FORTRESS_SPAWN`, `FORTRESS_BATTLE_RETURN` (6 encounter), `FORTRESS_STAGE`, `FORTRESS_VISTA`, `dynamicRect`. |
| `web/src/game/world/fortressPuzzle.ts` | Logika teka-teki MURNI + `activeBlockers(flags, session)` (satu-satunya aturan pintu/slab). |
| `web/src/game/world/FortressView.ts` | `implements AreaView3`; visual dari flag; Velthia sprite pengikut; Varlgrim/Torvan aktor adegan; debu; api; tidak memutar audio. |
| `web/src/game/story/c4/fortress.ts`, `fortressFlags.ts` | `FortressStory` (murni, idempoten), `FORTRESS_OPS`, `fortressSession`; flag internal `c4.*` (objek `FORT`). |
| `web/src/game/dialogue/chapter4.fortress.ts` | 35 skrip lore/petunjuk/peti, `DRAFT_IMPL`, ID `C4-FORT-Xnnn` (`FORTRESS_SCRIPTS`). |
| `web/src/game/data/fortressAssets.ts` | `FORTRESS_ATLASES` (`fortress_props`), `FORTRESS_IMAGES` (`fortress_ground`). |
| `web/scripts/gen-fortress-art.mjs` + `scripts/lib/fortressSprites.mjs` | Generator deterministik. `node scripts/gen-fortress-art.mjs [--preview]` (+ `PREVIEW=x,y,w,h,zoom,out.png [PREVIEW_STATE=open]`). |
| `web/public/assets/environment/fortress/{ground.png,props.png,props.json}` | Dasar 1792x2432; atlas 93 frame (pivot + `foot` per frame). Palet tertutup 24 warna, tidak berbagi satu pun warna dengan Kuil Jejak. |
| `web/tests/unit/fortress-{map,puzzle,story,assets}.test.ts` | 51 tes (lulus). |
| `docs/production/sprint4/fortress-contact-sheets/*.png` | Lembar atlas, peta penuh (awal/terbuka), 9 ruang (+ varian terbuka), 2 overlay collision. Sudah dibuka dan diperiksa. |

## Peta (utara = atas, 1792x2432, 32 px/petak)
```
Jalan masuk (spawn 896,2412) -> Gerbang Luar (reportA, Riftborn) -> lorong gerbang -> Aula Lonceng Berhenti
  barat : bekas barak (guardpost; peti Potion) -> Arsip Penjaga (catatan jaga, pusaka = Perlindungan, jubah, peti keeper_robe)
  timur : gerbang besi (terbuka bila aegisLearned) -> Ruang Uji Segel (uji Perlindungan; peti warden_plate setelah uji)
  utara : Pintu Segel (terbuka bila urutan segel benar) -> Koridor Retakan (jangkar A/B, 3 slab, fortress_rift) -> Serambi Heart
  Serambi : lentera jaga (titik simpan, butuh aegisTrial; reportB) -> Pintu Heart (terbuka sesudah checkpoint) -> Ruang Heart
  pintasan: Serambi barat -> lorong panjang + celah jaga + catatan -> pintu pintasan di pojok barat laut Aula Lonceng (tuas ada di sisi lorong)
  Ruang Heart: lambang Heart di dinding utara diapit dua pengunci; Varlgrim di antaranya; jendela busur (tertutup sampai Heart dibuka);
               lorong timur disegel retakan -> Ruang Gema (2 benda kuno)
  Gerbang keluar = Gerbang Luar (interaksi `outer_gate` sesudah creatorReveal; jam logam di lintel)
```
Identitas visual: batu basalt biru-abu berblok besar, muka dinding 64 px dengan pilaster dan tutup, lantai per ruang berpola bermakna (lajur prosesi + cakram jaga pudar di halaman, lantai penunjuk waktu bercincin kuningan di aula, papan kayu + karpet di barak, kotak-kotak + karpet runner di arsip, cincin konsentris berinlay lime di ruang uji, sambungan potongan di koridor, garis jaga kuningan di serambi, alas melingkar + alur pengunci di Heart, riak plum di Gema), obor/perapian berkolam cahaya terdithering, celah cahaya diagonal kiri-atas, retakan lime hanya sebagai aksen (< 2% piksel).

## Teka-teki (tanpa QTE/refleks/acak; tidak ada banner)
1. **Urutan Segel Jaga** (Aula Lonceng): 4 pilar `seal_dawn/noon/dusk/night` (ikon matahari berbeda). Urutan = Fajar, Siang, Senja, Malam, ditulis di buku jaga (Arsip, `archive_log`, flag `c4.watch_log_read`). Salah = semua padam (toast bila sudah membaca; dialog petunjuk bila belum). Benar -> Pintu Segel terbuka (`c4.seals_solved`).
2. **Jangkar Retakan** (Koridor): 3 slab (`slab_1..3`, awal bergeser,sejajar,bergeser). Jangkar A membalik {S1,S2}, B membalik {S2,S3}; masing-masing harus disentuh ganjil kali. Selalu dapat dibalik (tes: 4 keadaan yang dapat dicapai semuanya dapat diselesaikan). Selesai -> `c4.rift_aligned` permanen. Petunjuk: tiga takik pada jangkar (yang menyala = potongan yang digerakkan) + dialog `F_ANCHOR_HINT`.
3. Pengunci Heart ganda (bukan puzzle): `heart_lock_yaric` (kiri) dan `heart_lock_velthia` (kanan; Velthia berjalan ke pengunci) wajib keduanya, urutan bebas.
Kemajuan sementara di `fortressSession` (reset di `onStart`); yang disimpan hanya flag.

## Posisi teleport dan id (untuk E2E lead)
Spawn `FORTRESS_SPAWN` (896,2412 up). Posisi berdiri (kaki) untuk menyentuh objek: lihat `FORTRESS_INTERACTABLES` (kotak) + BFS di tes. Titik aman per tahap (`canStand`, terverifikasi tes):
| Tahap flag minimal | Teleport | Interaksi/pemicu |
|---|---|---|
| awal (`start`) | (896,2412) | pemicu `fortress_court_fight` (y 2090-2110, lebar penuh), `courier_a` (704,2250), `outer_gate` (896,1992) |
| lorong gerbang | (896,1900) | `fortress_hall_fight` (y 1792-1812), titik kembali (896,1836) |
| Aula Lonceng | (896,1840) | `hall_lantern` (620,1646; istirahat bebas), `seal_dawn` (1070,1572) `seal_noon` (722,1772) `seal_dusk` (722,1572) `seal_night` (1070,1772), `bell`, `bell_dial`, `door_seal`, `trial_gate` (1312,1760) |
| sayap barat | (476,1712) | pemicu `fortress_guardpost` (x 416-432, y 1568-1856), `chest_potion` (362,1852), `archive_log` (190,1356), `archive_relic` (304,1384), `chest_robe` (444,1492) |
| sayap timur (`aegisLearned`) | (1312,1712) | `trial_pedestal` (1504,1712; battle), `trial_plaque`, `chest_plate` (setelah aegisTrial) |
| Koridor (`sealsSolved`) | (896,1400) | `corridor_lantern` (896,1318; istirahat bebas, di antara slab S1 dan jangkar), `anchor_a` (838,1344) `anchor_b` (954,1344); pemicu `fortress_rift_fight` (y 884-940) hanya terjangkau sesudah `riftAligned`; kembali (896,1050) |
| Serambi (`riftAligned`) | (896,700) | `lantern_rest` (800,634; butuh `aegisTrial`), `courier_b`, `door_heart`, `shortcut_lever` (600,1364), `shortcut_window`, `shortcut_note` |
| Ruang Heart (+`checkpoint`) | (896,420) | pemicu `heart_confront` (y 340-356, lebar penuh); kembali (896,308); `heart_lock_yaric` (800,162), `heart_lock_velthia` (992,162), `heart_emblem`, `heart_window` (704,108), `heart_seal` |
| Ruang Gema (+`heartOpen`) | (1240,256) | pemicu `echo_enter` (x 1260-1276), `echo_a` (1384,288), `echo_b` (1568,288) |
Menyiapkan state tanpa memainkan: set flag minimal tahap (rantai: `entered, aegisLearned, aegisTrial, checkpoint, confront, varlgrim, leanSeen, unlockYaric, unlockVelthia, heartOpen, towerFallen, memoryA, memoryB, oldMemory`) lalu panggil `view.apply(flags)`.

## `debug()` (window.__tfbt.view3)
`area, props, seals[], slabs[], anchors[], doors{seal,shortcut,trial,heart,echo}, blockers[] (id penghalang aktif), session{seals,rift,pressed}, heart{emblem,window,tower,pylons}, lantern, patrols, velthia/varlgrim/torvan {x,y,visible}, varlgrimTexture ('fallback' bila atlas C04 belum terdaftar), motes`.

## Op `{type:'c4'}` untuk WorldScene (view menangani animasi; WorldScene memutar SFX)
| op (arg) | Dipakai saat | SFX yang diharapkan |
|---|---|---|
| `seal_on` (id pilar) | segel benar berikutnya | `SFX_SEAL_ACTIVATE` |
| `seal_reset` | urutan salah | `SFX_SEAL_ERROR` |
| `seal_solved` | 4 segel selesai (kedip) | `SFX_SEAL_ACTIVATE` |
| `door_open` (`seal`/`shortcut`/`heart`; `trial` & `echo` hanya dari view) | pintu terbuka (animasi, lalu collision dilepas) | `SFX_FORTRESS_DOOR_ANCIENT` |
| `anchor_touch` (`anchor_a:011` = jangkar:bit slab, 1=bergeser) | sentuh jangkar | `SFX_TIME_DISTORTION` (atau `SFX_SEAL_ACTIVATE`) |
| `rift_solved` | tiga slab sejajar | `SFX_SEAL_ACTIVATE` |
| `lantern_on` | lentera menyala | tidak ada (opsional `SFX_SEAL_ACTIVATE`) |
| `lever_pull` | tuas pintasan | `SFX_FORTRESS_DOOR_ANCIENT` |
| `relic_glow` | pusaka Arsip bergema | `SFX_ECHO_MEMORY` |
| `chest_open` (id peti) | peti dibuka | (WorldScene sudah memutar `SFX_ITEM_PICKUP` lewat giveItem) |
| `lock_yaric` / `lock_velthia` | pengunci menyala | `SFX_HEART_LOCK` |
| `heart_open` | kedua pengunci -> Heart terbuka | `SFX_HEART_UNSEAL` |
| `tower_fall` | debu menara (~3,5 s: frame jendela 1,2,3) | `SFX_TOWER_COLLAPSE_DISTANT`; VFX `tower_dust` diputar WorldScene pada `FORTRESS_VISTA` (704,70) |
| `echo_a` / `echo_b` | benda gema disentuh | `SFX_ECHO_MEMORY` |
| `varlgrim_arrive` / `varlgrim_to_wall` / `torvan_appear` / `torvan_leave` | adegan C4-06 | tidak ada |
| `to_aveloria` | `outer_gate` sesudah `C4_RETURN_GATE` | (lead) |
`anchor_touch`, `heart_open`, `tower_fall` boleh ditunggu lama (view `await`).
Aksi lain yang dipakai: `dialogue, setFlag, objective, toast, giveItem{flag}, battle{encounter}, restParty4` (titik simpan: story menyetel `C4.checkpoint` SESUDAH `restParty4`).

## Lentera istirahat bebas (tambahan atas temuan E2E)
`hall_lantern` (prop (620,1634), interaksi berdiri sekitar (620,1646), Aula Lonceng, hub sesudah pemicu Gravorn) dan `corridor_lantern` (prop (896,1306), sisi selatan Koridor Retakan, sebelum `fortress_rift_fight`, terjangkau sesudah Pintu Segel). Interaksi = `[{type:'restParty4'}, toast('HP dan MP pulih.')]`: tanpa flag, tanpa checkpoint, tanpa hadiah, dapat diulang, tidak menyentuh rantai flag. Hanya `lantern_rest` (Serambi) menyetel `C4.checkpoint`. Prop memakai frame `lantern_on` yang sudah ada (atlas tidak berubah; hanya dasar peta diregenerasi untuk bayangan baru). Tes: terjangkau tepat per tahap, bukan penghalang jalur, di luar semua pemicu, story tanpa flag.

## Perilaku encounter
Pemicu -> `{battle}`: `fortress_court_fight`->`fortress_riftborn` (dialog `C4_RIFTBORN_FIRST` sekali), `fortress_hall_fight`->`fortress_gravorn`, `fortress_guardpost`, `fortress_rift_fight`->`fortress_rift`, `heart_confront`->`varlgrim` (`C4_CONFRONT` lalu `C4_BOSS_INTRO` sekali; hanya bila `checkpoint`), pedestal `trial_pedestal`->`fortress_aegis_trial`. Setelah menang (flag `completionFlag`) pemicu diam dan patroli hilang (`apply`). Kalah: pemicu muncul lagi tanpa dialog ulang. Tiap pemicu wajib melintang penuh di jalan (tes BFS: tanpa melewatinya bagian sesudahnya tidak terjangkau). Hadiah hanya dari sistem battle; peti memakai `giveItem{flag:c4.chest_*}`.

## Bukti tes
`npx vitest run tests/unit/fortress-*.test.ts`: 4 file, 51 tes lulus (peta: spawn/titik kembali/pemicu/interaktif terjangkau tepat per tahap, tak ada kantong terjebak, pintasan, footprint=sprite, aset terdaftar; puzzle: 24 permutasi, reset, tidak terkunci, restore dari flag; story: seluruh benteng dimainkan sampai akhir dengan rantai flag GameState, idempoten, pemulihan adegan terputus, tidak ada hadiah ganda; aset: palet 24 warna, alfa keras, disjoint dari kuil, frame/pivot/piksel liar). `npx tsc --noEmit`: tidak ada galat di file milik F (galat tersisa di tes agen lain).

## Permintaan ke lead
1. Pasang `FORTRESS_ATLASES`/`FORTRESS_IMAGES` ke `environmentAssets.ts` (`ENV_ATLASES`/`ENV_IMAGES`) agar BootScene memuat `fortress_props` (+`:meta`) dan `fortress_ground`. Tanpa itu view jatuh ke persegi gelap dan tanpa prop (tidak crash).
2. Varlgrim: view mencari tekstur `C04_CH4_EXPLORE`, `C04_FORTRESS_EXPLORE`, `C04_CITY_EXPLORE`, `C04_CH2_EXPLORE`, `C04_EXPLORE` (dengan `:meta`); jika tidak ada, memakai siluet kode-native (terlihat di `debug().varlgrimTexture`). Beri tahu key final dari BA, atau ubah daftar `VARLGRIM_TEXTURES` di `FortressView.ts`.
3. Isi `C4_OP_SFX` WorldScene sesuai tabel op di atas; putar VFX `tower_dust` pada `tower_fall`. Pan kamera ke `FORTRESS_VISTA` (704,70) sebelum `tower_fall` dan kembalikan sesudahnya (view tidak menyentuh kamera karena tidak memegang target follow).
4. `ASSET_INDEX.md`: tambahkan `environment/fortress/ground.png|props.png|props.json` = DRAFT code-native (gen-fortress-art.mjs), 93 frame, 24 warna, patroli dunia (oathguard/riftborn/gravorn) bukan atlas battle.
5. `journal.ts`/`Chapter4Story.objective()` sudah memakai `FortressStory.objective()`; teks tujuan hanya di Jurnal.
6. `restParty4` dipakai (bukan `rest`); `giveItem` selalu membawa `flag` (c4.chest_potion/robe/plate).
7. Keputusan desain yang menyimpang dari kerangka lead: gerbang keluar ada di **Gerbang Luar** (bukan Ruang Gema) karena `C4_RETURN_GATE` (N) menyebut jam di atas Gerbang Luar; jalan pulang sekitar 2400 px (pintasan + Koridor yang sudah sejajar membantu). Jika ingin keluar di Ruang Gema, ubah `outer_gate` di `FortressStory.interact` dan tambah interaktif di peta.

## Batas jujur
- Seni DRAFT dilukis kode: pustaka stempel prosedural, belum karya piksel tangan. Pola lantai batu berpapan tampak berulang dari jauh; ornamen (rantai, cakram, glyph) sederhana; patroli dunia (Oathguard/Riftborn/Gravorn) hanyalah sprite 2 frame (bobbing), BUKAN atlas battle; objek besar (lonceng, Heart) belum diperiksa pada resolusi 1920x1080 di browser.
- Tidak ada animasi pintu penuh selain 2-3 frame; api obor/perapian 2 frame; debu hanya 28 partikel piksel; "retakan yang menggeser lorong" diwujudkan sebagai slab yang beralih + sentuhan jangkar, bukan pergeseran lantai kontinu.
- Varlgrim tidak berlutut (atlas eksplorasi hanya empat arah); setelah kalah ia berdiri diam. Torvan muncul/pergi dengan fade dan jalan (tanpa efek).
- Lorong pintasan (~800 px) hanya diisi celah jaga, catatan, dan satu obor; itu keterbatasan (ingin pendek tetapi geometri koridor paralel memaksanya).
- `FortressView` belum pernah berjalan di Phaser nyata: pergerakan Velthia, tween adegan, dan penumpukan depth hanya diperiksa lewat kode; perlu E2E lead.
- Kemajuan tengah teka-teki (urutan pilar, keadaan slab) tidak disimpan; setelah memuat mulai dari keadaan awal (aman, disengaja).
- Penyesuaian karena N: lambang Heart di dinding utara diapit dua pengunci dan jendela busur di sisi (bukan di tengah) sesuai teks `C4_HEART_APPROACH`/`C4_HEART_OPEN`.
