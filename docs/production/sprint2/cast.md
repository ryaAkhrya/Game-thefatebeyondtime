# Polish Sprint 2 - atlas eksplorasi cast (idle + jalan)

Keluaran: `web/public/assets/characters/final/Cxx_explore.{png,json}` (C02, C03, C05, C06, C07, C08, C09; C01 milik engineer lain, tidak disentuh).
Status semua: DRAFT / NEEDS_REVIEW. Sumber `assets/`, `normalized/` dan `src/` tidak diubah.

## Cara membangun (deterministik, Pillow + numpy)
`python -I web/scripts/author_cast_build.py [C08 C03 C02 C05 C06 C07 C09]` dari akar repo.
Pustaka `web/scripts/author_cast_sprites.py` (parser peta RLE, outline, util). Peta tangan: `web/scripts/sprite-data/C08_maps.txt`, `C03_maps.txt`, `C02_maps.txt`
(huruf = warna legenda, `Y02 H2h1...` = baris interior RLE, dipusatkan di sumbu x=15.5; `x=` posisi absolut; `p`/`v` = piksel/garis tambahan; section `*_staff` = lapisan tongkat Torvan).
Outline 1 px otomatis (3 warna coklat gelap dipilih dari luminans tetangga). Hasil dua kali jalan identik (hash PNG sama).

## Tata letak
Karakter terautor (C08, C03, C02): 6 kolom x 4 baris (down, left, right, up); kolom = berdiri, langkah A, langkah B, idle1, idle2, idle3.
anims: walk = [0,1,0,2] (+row*6), idle = [0,3,4,5], fps walk 7, idle 3. Frame bernama `front_N/left_N/right_N/back_N`.
Fallback (C05, C06, C07, C09): 9 kolom: 0-5 = atlas ternormalisasi lama (byte-identik), 6-8 = idle turunan. walk = [2,3,4,5] (frame asli), idle = [0,6,7,8].

## Per karakter
- **C08 Nambo (diautor ulang)**: peta tangan dari turnaround (rambut coklat acak, goggle kuningan di kepala dengan lensa abu-biru, plester pipi, syal krem + ekor, jaket coklat bertali/gesper emas, sabuk besar, kantong, manset krem, sarung tangan, celana coklat tua bermanset, sepatu). Depan/belakang/samping (right) dilukis; left = cermin. Jalan 4 frame/arah, idle 4 frame/arah.
- **C03 Torvan (diautor ulang)**: rambut pirang + ahoge, plester, wajah tertawa, cowl coklat, kemeja krem gulung lengan, rompi, tas selempang, celana cargo, sepatu, tongkat ranting (lapisan terpisah; idle_2 = ketukan tongkat 1 px). Jalan/idle sama dengan Nambo.
- **C02 Velthia (diautor ulang)**: bob tembaga, anting emas, kerah tinggi, bahu terbuka, jubah plum berlis emas, ikat pinggang cincin, gaun + panel krem, hem emas. Jalan = bob 1 px + hem bergoyang + ujung sepatu bergantian; idle sangat tertahan (napas 1 px, hem 1 px).
- **C05 Azie, C06 Talric, C07 Zira, C09 Derrria (fallback)**: atlas lama dipertahankan + 3 kolom idle turunan (kepala+bahu 1 px; baris 30-43 digeser 1 px ke samping dengan penyalinan kolom tepi).

## Cara frame diturunkan (tanpa skala/blur)
- Depan/belakang: kaki terangkat 2 px dengan membuang 2 baris celana lalu merapatkan; badan turun 1 px; lengan berayun 1 px (blok baris 22-29 per sisi).
- Samping: dua salinan blok kaki digeser berjenjang 0..3 px (kaki jauh digelapkan ke warna palet terdekat, kaki yang mundur diangkat 2 px), badan turun 1 px, tangan geser 1 px.
- Idle: kepala+syal turun 1 px, kibasan puncak rambut 1 px, ekor syal samping 1-2 px, kaki tetap.

## Masalah yang masih ada (jujur)
1. Semua frame jalan/idle adalah turunan algoritmik dari satu pose berdiri per arah, bukan gambar tiap pose; langkah samping terlihat berantakan pada 8x (dua sepatu bertumpuk) tetapi bersih di 1x-2x.
2. Proporsi chibi (kepala 14-15 baris) lebih lebar dari Yaric (23 px); Nambo/Torvan 26-28 px lebar. Tinggi 44-45 px (Yaric 46).
3. `left` adalah cermin `right`: detail asimetris (plester, gesper, tali) ikut terbalik. Wajah samping sangat minim (mata 1 px).
4. Torvan: rambut tampak sebagai massa besar tanpa siluet acak yang jelas; tongkat 1 px statis saat jalan; pada tampak samping tongkat berdiri di depan tubuh, belum tergenggam.
5. Velthia: lengan/tangan nyaris tak terlihat, tampak depan agak kotak (bentuk lonceng), tampak belakang hanya jubah; ujung sepatu gelap di atas outline gelap sulit terbaca.
6. C05/C06/C07/C09 belum diautor: tetap prototipe kasar; idle hanya pergeseran lapisan baris (sendi hem ikut menggeser kaki 1 px karena prototipe tak punya lapisan terpisah).
7. Belum diuji di engine (di luar lingkup): perlu pengecekan WorldScene memakai `cols`/`anims` dari JSON baru (Phaser spritesheet 32x48 dengan cols 6 atau 9).

## Verifikasi
- `web/tests/unit/cast-sprites.test.ts` (36 tes, lulus): dimensi, indeks anim, alfa keras, baris kaki y=46 tiap frame berdiri/jalan/idle, tinggi 40-46, tanpa piksel di tepi sel, idle berpasangan berbeda, palet <= 32.
- Lembar kontak 8x (garis merah = bawah baris kaki y=46): `.dev-cache/test-artifacts/sprint2/cast/after_Cxx.png` / `before_Cxx.png`; komposit identitas (lama, baru depan/kiri/kanan/belakang, Yaric, portrait): `composite_C08.png`, `composite_C03.png`, `composite_C02.png`.
