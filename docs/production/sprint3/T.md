# Sprint 3 / Agen T (Temple) - Kuil Jejak (`area.temple`)

Status: DRAFT/NEEDS_REVIEW. Seni dilukis kode (bukan karya seniman), semua teks pemain Indonesia. Tidak ada BGM. WorldScene.ts dan file milik agen lain TIDAK disentuh; yang dibutuhkan lead ada di bagian "Wiring".

## File yang dibuat / diubah
| File | Isi |
|---|---|
| `web/src/game/data/maps/temple.map.mjs` + `.d.mts` | SATU sumber data: ruang (walkable), prop+posisi, kaki collision, interaktif, pemicu, spawn, titik kembali battle, penghalang gerbang. Dipakai game, generator dan tes. |
| `web/src/game/world/templeMaps.ts` | `loadTemple()`, `buildTemple()`, `TEMPLE_SPAWN`, `TEMPLE_FROM_FOREST`, `TEMPLE_BATTLE_RETURN`, `TEMPLE_GATE_ID/RECT`, `TEMPLE_BOSS_TRIGGER`. |
| `web/src/game/world/templePuzzle.ts` | Logika teka-teki MURNI (tanpa Phaser): `TemplePuzzleSession`, `activate`, `gateIsOpen`, `toFlags/fromFlags`, dsb. |
| `web/src/game/world/TempleView.ts` | Renderer + keadaan visual (`implements AreaView3`). |
| `web/src/game/story/c3/temple.ts` | `TempleStory` (`objective/onStart/interact/trigger`), `TEMPLE_OPS`, `templeSession`, `TEMPLE_FLAG`. |
| `web/scripts/gen-temple-art.mjs` + `scripts/lib/templeSprites.mjs` | Generator aset deterministik (lib khusus kuil). `node scripts/gen-temple-art.mjs [--preview]`. |
| `web/public/assets/environment/temple/{ground.png,props.png,props.json}` | 1280x1280 dasar peta; atlas 78 frame (pivot per frame, `foot` per frame). 49 warna (dasar) / 73 warna (atlas), alfa keras 0/255. |
| `web/src/game/data/environmentAssets.ts` | HANYA `TEMPLE_ATLASES` (`temple_props`) dan `TEMPLE_IMAGES` (`temple_ground`). |
| `web/tests/unit/temple-{puzzle,story,map}.test.ts` | 35 tes (lulus). |
| `docs/production/sprint3/temple-preview/*.png` | Pratinjau (map_initial/map_done/map_collision, room_*, collision_south/north). |

## Desain ringkas
Ruang (utara = atas): Jalan masuk -> **Halaman Reruntuhan** (court, terbuka) -> pintu barat **Ruang Pilar** (teka-teki A) / pintu timur **Ruang Segel** (B) -> **Lorong** -> **Ruang Gerbang** (C, perkemahan di ceruk timur, gerbang aula) -> **Aula Chronolith**. Peta 1280x1280, tidak ada labirin: tiap ruang satu layar, jalan tengah selalu terbuka, dua garis emas putus-putus di lantai menuntun dari jalan masuk ke gerbang ("dua jalur yang hampir bertemu").

Teka-teki (pengamatan, jawaban terlihat di lingkungan, salah = reset aman tanpa hukuman, tanpa grinding):
- **A Pilar bergaris** (Ruang Pilar): 3 pilar berlambang 1/2/3 garis (garis ketiga tertutup tambalan baru, berbingkai aksen Bitter Lime) diacak posisinya. Lukisan dinding di atas pilar menunjukkan urutan 1 -> 2 -> 3. Salah urutan = pilar meredup, mulai lagi + dialog petunjuk.
- **B Segel lama** (Ruang Segel): 3 cakram di dinding; lampu yang berhenti (rantai, nyala beku, percikan beku) menjatuhkan TIANG CAHAYA ke cakram ketiga. Jawaban = cakram yang disinari (`b_disc_3`).
- **C Alas arah** (Ruang Gerbang): 3 alas menghadap lingkaran di lantai (`c_dial_l`, `c_dial_r`, `c_dial_m`). Interaksi memutar searah jarum jam (U,T,S,B). Dua lukisan di dinding menunjukkan lingkaran dengan tiga panah menuju pusat: dari barat (menunjuk timur), dari timur (menunjuk barat), dari bawah (hijau-lime, menunjuk utara). Alas selatan (`c_dial_m`) permukaannya ditutup plester baru (jarum tersembunyi, takik arah tetap terlihat di bibir). Alas membeku (toast) sampai A dan B selesai, jadi gerbang selalu terbuka di depan mata pemain.
- Gerbang aula: tiga lampu di ambang menyala per teka-teki yang selesai; semua selesai -> gerbang bergeser (3 frame `gate_closed/half/open`, penghalang collision `hall_gate` dilepas).

Motif waktu: batu retak dengan potongan bergeser, serpihan batu yang berhenti di udara (`chips_*`, bayangan di tanah), busur lambang lantai yang bergeser kuantisasi, lampu yang berhenti. Bukan neon/glitch digital. Aksen: Deep Plum (relung/panel), emas pucat (inlay lambang), Bitter Lime (hanya "garis yang ditutup").

## Wiring (untuk lead, WorldScene.ts)
1. **Muat peta**: `area === 'temple' ? loadTemple()` (dari `world/templeMaps`). `map.id === 'temple'`. Jangan gambar dasar/prop default untuk `temple` (TempleView menggambar dasar + semua prop sendiri; `map.props` sengaja kosong agar render prop Hutan 1 tidak menggambar apa pun).
2. **View**: setelah `this.interactables` dibuat: `this.temple = new TempleView(this, this.loaded, this.interactables);` lalu `this.temple.apply(flags)` (harus dipanggil juga setiap `setFlag` pada area ini, seperti `applyFlagState` untuk `chapter2`/`city`) dan `this.temple.update(this.player, moved > 0, delta, this.sprinting)` tiap frame; `destroy()` saat shutdown. `apply` melepas penghalang gerbang bila `gateIsOpen(flags)`, mengaktifkan/menonaktifkan interaktif `chronolith`, `hall_record`, `hall_exit` dan menyembunyikan patroli yang sudah dibersihkan.
3. **Aksi c3**: `case 'c3': await this.temple?.handleAction(a.op, a.arg)` (AreaView3). Op yang dipakai TempleStory: `pillar_on <id>`, `puzzle_reset A`, `disc_on <id>`, `disc_wrong <id>`, `dial_set "<id>:<0-3>"`, `puzzle_fx A|B|C`, `gate_open`, `chronolith_wake`, `camp_rest` (no-op). Op tak dikenal diabaikan.
4. **Cerita**: untuk `area === 'temple'` delegasikan ke `new TempleStory(gameState)` (`objective()`, `onStart()`, `interact(id)`, `trigger(id)`). Boleh dibuat ulang tiap panggilan: kemajuan sementara (urutan pilar, arah alas) disimpan di `templeSession` (modul), direset di `onStart()` (sekali per scene). Panggil `onStart()` seperti `Chapter2Story` (dialog pintu masuk sekali; pemulihan gerbang; outro Chronolith setelah menang).
5. **changeArea 'temple'**: posisi = `TEMPLE_FROM_FOREST` ({x:640,y:1240,facing:'up'}; `TEMPLE_SPAWN` = titik cadangan di halaman). `standable` check memakai `loaded.collision` seperti biasa.
6. **Battle** (`{type:'battle', encounter}` untuk `temple_oathguard` | `temple_mixed` | `chronolith`): SEBELUM menyimpan/pindah scene, tetapkan `player = TEMPLE_BATTLE_RETURN[encounter]` dan `setPosition(x, y, facing, 'temple')` (titik-titik ini berada di luar semua pemicu; mencegah loop pemicu saat scene dibuat ulang). Kemenangan harus menyetel `battle.temple_oathguard` / `battle.temple_mixed` / `boss.chronolith` (flag `C3.templeFight1/2/chronolith`); patroli yang sudah dibersihkan tidak muncul lagi (apply menyembunyikan sprite, TempleStory.trigger mengembalikan `[]`). Kekalahan: patroli tetap ada dan bisa dihindari; boss bisa dipicu ulang dengan berjalan ke dalam aula (tanpa intro ulang) atau interaktif `chronolith`.
7. **restParty**: `temple_camp` mengembalikan `[...(camp dialog sekali), c3 camp_rest, {type:'restParty'}, setFlag C3.checkpoint, toast, objective]`. `restParty` harus memulihkan party Bab III (Yaric+Velthia), tanpa hadiah.
8. **chapter3End**: `hall_exit` mengembalikan `[..., setFlag C3.complete, {type:'chapter3End'}]`.
9. BGM `BGM_TEMPLE` (AWAITING_COMPOSER, senyap). Langkah kaki sudah `stone` untuk `temple` di `footsteps.ts`.
10. Sorting: prop memakai `setDepth(y)` titik dasar; lampu gerbang depth 481; decal -500 (sudah di TempleView).

### Urutan StoryAction dari tepi hutan sampai akhir bab
1. (Lead) `changeArea:'temple'` -> `TEMPLE_FROM_FOREST`. `onStart()`: `[dialogue C3_TEMPLE_ENTRANCE, setFlag c3.temple_entered]`.
2. Pemain berjalan ke halaman. Opsional: pemicu `temple_fight1` (penjaga di pojok barat daya halaman) -> `[toast, battle temple_oathguard]`.
3. Masuk `temple_chamber_w|e` atau `temple_inner` (pertama kali) -> `[dialogue C3_PUZZLE_INTRO, setFlag c3.puzzle_intro_seen]` (juga dipasang di awal interaksi puzzle pertama bila belum).
4. A (barat) dan B (timur) bebas urutan; C setelah keduanya. Tiap teka-teki selesai: `[... c3 puzzle_fx X, dialogue C3_PUZZLE_SOLVED_X, setFlag c3.puzzle_x, objective]`.
5. C selesai (terakhir): ditambah `[c3 gate_open, dialogue C3_GATE_OPEN, setFlag c3.hall_gate_open, setFlag checkpoint.c3_before_chronolith, objective]`.
6. Perkemahan (ceruk timur Ruang Gerbang), kapan saja: lihat butir 7 di atas.
7. Pemicu `temple_fight2` (Oathguard+Wisplet, sisi barat Ruang Gerbang) opsional -> `battle temple_mixed`.
8. Masuk aula: pemicu `temple_chronolith` (hanya bila gerbang terbuka dan belum menang) -> `[c3 chronolith_wake, (dialogue C3_CHRONOLITH_INTRO + setFlag c3.chronolith_intro_seen sekali), battle chronolith]`.
9. Setelah menang (`boss.chronolith`): `onStart()` -> `[dialogue C3_CHRONOLITH_OUTRO, setFlag c3.chronolith_outro_seen, objective]`.
10. Pemain memeriksa catatan di dinding utara (`hall_record`, aktif setelah outro) -> `[dialogue C3_HIDDEN_NAME, setFlag c3.varlgrim_name]` (tidak auto-play).
11. `hall_exit` (pintu di dinding utara aula, aktif setelah catatan dibaca) -> `[dialogue C3_PROMISE, setFlag c3.promise_seen, dialogue C3_CHAPTER_END, setFlag chapter.3_complete, chapter3End]`.

### Interaktif (id -> hasil)
| id | lokasi | hasil |
|---|---|---|
| `temple_exit` | papan di jalan masuk | toast (tidak meninggalkan area; lead dapat mengganti dengan changeArea) |
| `inspect_1` | lukisan dinding halaman (dua sosok menuju lingkaran) | `C3_TEMPLE_INSPECT_1` |
| `temple_note` | lectern catatan di halaman | `[INTRO sekali] C3_PUZZLE_NOTE`, setFlag `c3.puzzle_note_read` |
| `inspect_2` | relief lingkaran + garis patah di atas pintu barat | `C3_TEMPLE_INSPECT_2` |
| `a_mural` | lukisan urutan lambang di Ruang Pilar | `C3_PUZZLE_HINT_A` |
| `a_pillar_1/2/3` | tiga pilar | teka-teki A (progress: c3 pillar_on+toast; salah: c3 puzzle_reset+toast+HINT_A) |
| `b_lamp` | lampu yang berhenti | `C3_PUZZLE_HINT_B` |
| `b_disc_1/2/3` | tiga cakram | teka-teki B (salah: c3 disc_wrong+toast+HINT_B) |
| `c_mural_l/r` | dua lukisan arah di dinding Ruang Gerbang | `C3_PUZZLE_HINT_C` |
| `inspect_3` | lingkaran di lantai Ruang Gerbang | `C3_TEMPLE_INSPECT_3` |
| `c_dial_l/r/m` | tiga alas | teka-teki C (beku sebelum A+B: toast; salah tidak ada) |
| `temple_camp` | api unggun | istirahat + checkpoint (`C3_TEMPLE_CAMP` sekali) |
| `chronolith` | Chronolith (hanya aktif bila gerbang terbuka & belum menang) | sama dengan pemicu boss |
| `inspect_4` | kolom bercincin logam retak di ambang aula | `C3_TEMPLE_INSPECT_4` |
| `hall_record` / `hall_exit` | dinding utara aula | lihat butir 10-11 |

Pemicu: `temple_fight1`, `temple_fight2`, `temple_chamber_w`, `temple_chamber_e`, `temple_inner`, `temple_chronolith` (boss; persegi y 328..352 di aula).
Penyesuaian teks yang diminta: tidak ada. Catatan: `C3_TEMPLE_INSPECT_4` menyebut "cincin logam retak terpasang pada dinding" di "ambang aula": diwujudkan sebagai cincin besi di kolom (`column_ringed`) di dalam pintu aula.

## Verifikasi
- `npx vitest run tests/unit/temple*.test.ts`: 3 berkas, 35 tes lulus (teka-teki: permutasi, reset, idempoten, serialisasi flag 8 kombinasi, gerbang hanya bila semua selesai; cerita: alur lengkap dengan MockState, urutan commit flag sesudah dialog, tanpa hadiah ganda, checkpoint, patroli tidak kembali, tanpa softlock; peta: spawn dapat dipijak, flood fill 8 px menjangkau semua interaktif lewat kotak uji nyata (`findInteractable`), aula hanya setelah gerbang terbuka, pemicu tidak menabrak collision, titik kembali battle di luar pemicu, frame atlas ada, tepi piksel keras).
- `npx tsc --noEmit`: tidak ada error di file Kuil (error yang tersisa saat saya menjalankan hanya `BattleScene.ts` milik agen lain).
- Visual: dirender ke `docs/production/sprint3/temple-preview/` dan dilihat (map_initial, map_done, room_court/west/east/ante/hall, collision overlay). Tidak diuji di browser (dilarang build/E2E): `TempleView` belum pernah dijalankan di Phaser nyata; hanya lolos tsc.

## Keterbatasan jujur
- Semua seni DRAFT code-native: pustaka stempel prosedural, belum karya piksel tangan. Pola lantai bata berulang dan dinding berblok tampak seragam dari jauh; murals berupa glyph sederhana (tokoh lukisan berupa siluet).
- Oathguard/Wisplet di dunia atas hanyalah sprite patroli DRAFT (2/3 frame, idle sederhana) mengikuti kartu referensi; BUKAN atlas battle dan tidak menggantikannya. Chronolith di dunia (`chronolith_dormant/wake/still`) bukan sprite battle.
- Efek cahaya adalah bentuk tetap berdither (tiang cahaya di Ruang Segel, bercak di aula), bukan pencahayaan dinamis. Animasi: hanya api unggun (2 frame), patroli, getar kuantisasi, gerbang 3 frame, kedip 3x pada selesai teka-teki (alpha 0.65/1, bukan kilatan penuh layar).
- Hutan di selatan jalan masuk adalah massa dedaunan datar (bukan pohon individual); tidak ada rute kembali ke hutan (papan hanya toast).
- Kemajuan di tengah teka-teki A/C (urutan pilar, arah alas) tidak disimpan di save (hanya flag A/B/C); setelah muat ulang mulai dari awal (aman, sengaja).
- `TempleView.handleAction('puzzle_fx')` memakai SFX_PUZZLE_ACTIVATE/SOLVED/DOOR_OPEN/UI_CANCEL dari registry bila READY; senyap bila tidak.

## Permintaan ke lead
- Tambahkan di `ASSET_INDEX.md`: `environment/temple/ground.png|props.png|props.json` = DRAFT code-native (gen-temple-art.mjs), 78 frame, 49/73 warna; patroli Oathguard/Wisplet dunia = DRAFT bukan atlas battle.
- Pastikan `EncounterId`/BattleSession menerima `temple_oathguard`, `temple_mixed`, `chronolith` (sudah ada di `encounters.ts`) dan flag kemenangannya sama dengan `C3.templeFight1/2`, `C3.chronolith`.
- `journal.ts`: gunakan `TempleStory.objective()` untuk tujuan di area `temple`.
