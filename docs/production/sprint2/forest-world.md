# Polish Sprint 2: art dunia hutan (Hutan 1, Tepi Hutan, Hutan 2)

Semua art DRAFT, dilukis oleh kode (tanpa aset luar), deterministik, dapat dijalankan ulang. Visual-only: tidak ada perubahan spawn, posisi cerita, pemicu, keluar, zona encounter, checkpoint, peta kolisi koridor, mekanik loop Hutan 1 (`zone.wrapX/period`, `thicket_block*`, `gate_awake`, `mournfang_block`), maupun save.

## Berkas

| Berkas | Isi |
|---|---|
| `web/scripts/lib/pixelkit.mjs` | PNG, RNG/noise periodik, palet berjenjang (`ramp`, `shade`), kanvas piksel (poligon, elips, garis tepi selektif), packer atlas, pratinjau komposit |
| `web/scripts/lib/palettes.mjs` | palet Hutan 1 dan Hutan 2 |
| `web/scripts/lib/envTrees.mjs`, `envProps.mjs`, `forest1Sprites.mjs`, `forest2Sprites.mjs` | sprite (pohon, batu, kayu, papan, peti, pedang, flora, penanda, palisade, dll.) |
| `web/scripts/lib/groundKit.mjs` | dasar peta: rumput/tanah terposterisasi, filter mayoritas, stempel, bayangan, akar, tiang cahaya, riak |
| `web/scripts/gen-forest-art.mjs` | `forest1/ground.png`, `props.png`, `props.json` (atlas dipakai juga oleh Tepi Hutan) |
| `web/scripts/gen-forest-edge-art.mjs` | `forest_edge/ground.png` |
| `web/scripts/gen-forest2-art.mjs` | `forest2/ground.png`, `props.png`, `props.json` |
| `web/scripts/check-forest-layout.mjs` | pemeriksa tata letak: kanopi menutupi area jalan, titik penting di sel walkable |
| `web/src/game/data/maps/forest1.map.mjs`, `forestEdge.map.mjs` (baru), `forest2.map.mjs` (baru) | penempatan prop (+ `.d.mts`) |
| `web/src/game/world/forest2Art.ts` (baru) | render Hutan 2 (dasar, prop, `Forest2Barricade`) |
| `web/tests/unit/forestart.test.ts` (baru) | 9 invarian (sinkron geometri Hutan 2, frame ada, titik cerita terjangkau, jalan setapak/jalan bebas prop padat, keragaman pohon) |

Perintah: `node scripts/gen-forest-art.mjs && node scripts/gen-forest-edge-art.mjs && node scripts/gen-forest2-art.mjs`; `PREVIEW=x,y,w,h,zoom,out.png node scripts/gen-forest-art.mjs` menulis komposit tanpa browser (juga untuk edge dan forest2).

## Aturan bentuk dan cahaya (konsisten di ketiga area)

- Cahaya selalu dari kiri-atas. Muka kiri/atas terang, kanan/bawah gelap. Bayangan jatuh ke kanan-bawah dan dibaking di dasar peta per jenis prop (`SHADOW_OF`), bukan ellipse di sprite.
- Palet tertutup: tiap bahan = satu ramp (indeks 0 = nada garis tepi/bayangan terdalam). Bayangan pada tanah = geser ramp ke nada lebih gelap (tidak ada alfa-blend), tepi bayangan berdither papan catur 1 px. Tidak ada bloom/glow.
- Garis tepi: benda padat (pohon, batu, kayu, papan, peti, semak) memakai garis tepi 1 px selektif (ramp[0] dari bahan tetangga, bukan hitam tunggal). Flora tanah (pakis, rumput, bunga, jamur) tanpa garis tepi, hanya piksel pangkal gelap.
- Kanopi = gugusan daun berlapis (belakang ke depan) dengan kontur bergelombang, tutup terang kiri-atas dan bayangan kanan-bawah per gerombol; konifer = tingkat menjuntai bertepi bergerigi asimetris. Tidak ada noise acak sebagai tekstur.
- Dasar peta: nada diposterisasi dari medan kontinu lalu disaring mayoritas 3x3 (gumpalan bersih); detail = stempel kecil bergerombol dengan kepadatan dari noise gerombol (ada ruang kosong). Bibir jalan: rim gelap 1 px, pita rumput terinjak dengan tanah mengintip bergerombol.
- Hierarki: tanah yang dapat dilalui (jalan, jalan setapak, clearing, glade) selalu lebih terang dan lebih hangat daripada lantai hutan di bawah kanopi; konifer dingin kebiruan (ramp `pine`), pohon berdaun lebar hangat, birch pucat sebagai aksen.

## Palet

Hutan 1 (~66 warna, `forest1Palette`): daun hijau lumut hangat (6), konifer kebiruan (6), daun birch terang (6), kayu (5), kulit birch (5), lumut (4), batu (5), tanah madu (6), rumput (7), air (4), besi (4), baja (5), litter (3), tali (3), jamur (4+3), beri (3), aksen bunga putih/kuning/ungu/merah muda, emas, duri.

Hutan 2 (`forest2Palette`): lebih dingin dan tua. Daun hijau kebiruan (6) + ochre redup (6, hanya 3 gugus per peta), kayu abu-ungu (5), batu biru-abu (5), lumut tosca (4), rumput tosca gelap (7), tanah abu-cokelat (6), air (4), kabut/cahaya dingin, daun beku emas redup (3), baja pecahan (5), jamur biru kelabu.

## Daftar prop

- Pohon berdaun lebar (6 siluet berbeda): `tree_a` ek berkubah, `tree_b` beech lonjong, `tree_c` condong dengan dahan samping, `tree_twin` dua batang, `tree_birch` batang pucat berbelang, `tree_sapling` anakan. Konifer: `tree_pine` cemara bertingkat 5, `tree_fir` pinus lebar jarang miring. `tree_dead` pohon mati berongga.
- Batu: `rock_l`, `rock_s`, `rock_slab`, `rock_c` (tiga batu kecil); semak `bush`, `bush_hedge`, `bush_berry`; `stump`, `log`; `marker_stone`; flora `fern`, `fern_b`, `tuft_a/b`, `flowers`, `flowers_y`, `flowers_v`, `mushrooms`, `mushrooms_b`; cerita: `sign`, `chest_closed/open`, `sword`, `thicket_closed/open`.
- Hutan 2: `tree_old_a` (purba, akar banir), `tree_old_b` (melintir S), `tree_hollow` (berongga), `tree_dead2` (bercabang halus, lumut menjuntai), `tree_spruce_old` (cemara tua berbatang panjang), `tree_gnarl` (membungkuk lebar), `stump_old`, penanda batu `marker_old`/`marker_second`/`marker_broken` (motif dua goresan hampir bertemu, aus; `second` sedikit lebih tegas), `sign_west/east`, `log_fallen`, `log_worked` (takik kapak, baji besi), `log_short`, `bedroll`, `lantern`, `note_stand`, `time_shard`, palisade (`blog_a/b`, `stake_a/b/c`), daun tertahan `leaves_a/b/c`.

## Aturan penempatan

- Kanopi menjulang ke utara dari pangkal batang (prop memakai `setDepth(y)`, titik acuan di dasar). Pohon di UTARA ruang jalan boleh berpangkal dekat tepi; pohon di SELATAN harus berpangkal >= tepi + ~125 px (konifer ~150). `check-forest-layout.mjs` menghitung sisa penutupan.
- Kaki collision hanya pangkal batang/badan (`FOOT`); kanopi tidak pernah menghalangi. Tidak ada prop padat di garis tengah koridor Hutan 1 (diuji).
- Sabuk berlapis: N1 (tangan-susun, dekat jalan), baris latar berjarak tidak teratur dengan jenis tidak pernah sama dengan dua tetangga, S1 hanya menampakkan kanopi di tepi layar bawah.
- Hutan 1: set piece tangan-susun per periode (papan + bunga, kelompok batu + penanda, tunggul + jamur, kayu tumbang, mulut jalan setapak dengan dua pohon penjaga, glade dengan peti dan bunga berkelompok, ambang keluar dibingkai dua pohon). Dekorasi lorong tetap PERIODIK (mekanik "papan yang sama lagi"); dasar peta periodik persis (0 piksel selisih).
- Tempat bangun: kolam cahaya (rumput +1 nada) dan rumput rebah di bawah celah kanopi, jejak terinjak mengarah ke jalan, goresan di kaki pedang, pedang di samping batu berlumut; jalan muncul sebagai lidah tanah dari clearing (bukan tepi lurus).
- Tepi Hutan: jalan barat teduh -> tikungan -> jalur timur dengan tempat istirahat (lingkaran api dingin, log, tunggul) -> arena Mournfang (tanah terinjak, goresan cakar, kawah, serpihan, pohon patah, bayangan bos dibaking) -> padang terang dengan bunga dan paving batu pertama menuju Aveloria.
- Hutan 2: tiga ruang (A lorong barat dengan penanda pertama; B tikungan Torvan; C jalur jaga lama dengan penanda kedua, tempat istirahat, palisade, lantai batu tua bercincin dua garis hampir bertemu, papan catatan dan pecahan waktu). Tanda gangguan waktu: riak halus di tanah di sekitar penanda kedua/pecahan/penanda pertama dan daun emas redup yang tertahan di udara (props, bayangannya di tanah). Tiang cahaya dingin = elips miring berdither yang dilukis (bukan bloom).

## Perubahan kode di luar skrip/data

- `forestEdge.ts`: `buildForestEdge` kini memanggil `buildForestEdgeMap` (data pindah ke `forestEdge.map.mjs`, angka walkable/trigger/spawn identik); `drawForestEdgeGround` memakai tekstur `forest_edge_ground` (fallback datar).
- `chapter2Maps.ts` (hanya bagian forest_2): `loadForest2` menambahkan `FOREST2_EXTRA_SOLIDS` (kaki prop dekoratif di dalam area walkable: papan Ke Liora, gulungan tidur, papan catatan, pecahan, papan Jalan lama, batu pipih).
- `Chapter2View.ts` (hanya cabang forest_2): `drawForest2(scene)` menggantikan `drawChapter2Ground` untuk forest_2, palisade `Forest2Barricade` menggantikan kotak abu.
- `environmentAssets.ts`: atlas `forest2_props`, gambar `forest2_ground`, `forest_edge_ground` di `FOREST_*`.

## Bukti

- Sebelum/sesudah 1920x1080 (dan 1366x768 untuk "after1366_"): `.dev-cache/test-artifacts/sprint2/forest/` (`before_*`, `after_*`, `after1366_*`), tiap area >= 7 sudut.
- `npx tsc --noEmit` bersih; `npx vitest run`: seluruh suite lulus (satu kegagalan sesaat `yaric-sprites` berupa timeout 5 s saat beban paralel, lulus bila dijalankan ulang); `world.test.ts`, `chapter2.test.ts`, `forestart.test.ts` lulus. E2E dan build produksi tidak dijalankan (sesuai instruksi).

## Kelemahan yang masih ada (jujur)

- Dedaunan Hutan 1 masih cerah dan ceria; "tenang tapi sedikit tidak nyaman" baru tercapai lewat komposisi (celah cahaya, sunyi, pengulangan papan), belum lewat nada warna. Perlu grading terpisah (di luar lingkup dasar peta).
- Sabuk latar di balik hutan (lapis 2-4) berupa baris pohon berjarak acak ber-seed: terkurasi jenisnya tetapi bukan tangan-susun satu per satu; rapat dan agak seragam di area yang tidak bisa dimasuki.
- Pohon berukuran seragam skala (tidak ada pohon raksasa Hutan 1); `tree_sapling` satu-satunya ukuran kecil.
- Palisade Veyrath (log berbaring utara-selatan) terbaca seperti tiang totem dari sudut 3/4; lebih baik bila dipahat ulang sebagai barikade lebar.
- Veyrath, Torvan, Nambo, Mournfang masih sprite DRAFT lama (bukan lingkup).
- Prop datar `flowers_y`, `flowers_v`, `mushrooms_b`, `tuft_*` memakai `setDepth(y)` karena `DECAL_TYPES` di `WorldScene.ts` hanya memuat `flowers` dan `mushrooms`; pemain di utara bunga/jamur kecil tertutup sedikit. Disarankan menambahkan tipe itu ke `DECAL_TYPES` (WorldScene bukan milik pekerjaan ini).
- Pecahan waktu tampak seperti kristal biasa (belum ada tanda "waktu" selain riak tanah); bedroll dan lentera di tempat istirahat Hutan 2 kecil.
- Tidak ada lapisan "foreground overhang" (dedaunan di atas pemain di tepi layar) yang dirancang; tidak ada animasi (angin, daun jatuh).
- Pemeriksaan visual hanya pada Edge headless 1366/1920; belum ada tinjauan manusia.
