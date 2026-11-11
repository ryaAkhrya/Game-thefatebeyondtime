# Polish Sprint 2 - Yaric (C01) sprite eksplorasi: mahkota rambut, idle, sprint

Status: NEEDS_REVIEW / DRAFT. Turunan prosedural, bukan gambar seniman. Sumber `assets/` dan atlas `normalized/` tidak diubah.

## Keluaran

- `web/public/assets/characters/final/C01_explore.png` (128x672) dan `.json` (field lama + `cols`, `anims`, `grid`, `frames`, `animations` bernama).
- Generator: `python -I web/scripts/author-yaric-sprites.py` (dari root repo; deterministik, hash PNG/JSON sama pada dua kali jalan; hanya Pillow).
- QA: `python -I web/scripts/yaric-sprites-qa.py` menulis lembar kontak dan laporan diff ke `.dev-cache/test-artifacts/sprint2/yaric/`.
- Tes: `web/tests/unit/yaric-sprites.test.ts` (14 tes).

## Tata letak atlas (indeks grid = baris*4 + kolom)

| Baris | Isi |
|---|---|
| 0..3 | jalan down,left,right,up (4 frame asli; baris 3 dengan mahkota diperbaiki) |
| 4..7 | idle, baris = 4 + arah, kolom = frame 0..3 |
| 8..13 | sprint, baris = 8 + frame (0..5), kolom = arah (down,left,right,up) |

Nama frame: `front|left|right|back_{k}`, `..._idle_{k}`, `..._sprint_{k}`. Total 56 frame unik.

## Part 1 - mahkota rambut tampak belakang

Sumber: baris y=1 selebar 12-13 px, rata, tanpa outline. Perbaikan (`fix_back_crown`): satu baris jubah polos (y=21) dihapus dan semua baris di atasnya turun 1 px (tinggi figur tetap 46, kaki y=46 tidak bergerak), sehingga y=1 bebas; baris y=1 menjadi puncak 5-6 px, y=2 8-10 px, y=3 membulat, sudut atas dipangkas menjadi kubah, "tanduk" samping 3-4 px dipendekkan, piksel yatim dihapus, dan seluruh tepi atas/samping rambut diberi outline gelap dari palet depan ((41,25,27), (43,29,31), (37,27,28)). y=0 tidak dipakai. Audit depan/kiri/kanan: baris puncak y=1 runcing/beroutline, tidak terpotong; tidak diubah.

## Part 2 - idle (4 frame per arah, urutan `[0,1,2,3,2,1]`, 3 fps)

Edit piksel per frame: i0 pose berdiri; i1 ujung jubah menyamping 1-2 px (shear baris di luar inti badan) + kuncir rambut +-1 px; i2 napas keluar (kepala+bahu turun 1 px, bagian dada tertekan) + jubah melebar 1 px; i3 napas keluar + jubah ke sisi lain + kuncir. Baris kaki y>=40 identik dengan pose berdiri (diuji). Tidak ada translasi seluruh sprite. Right = cermin left.

## Part 3 - sprint (6 frame per arah, 14 fps)

- Down: dasar c1/c0/c2/c3 + angkat sepatu kiri/kanan 2 px (lutut naik), kepala turun 0-2 px (condong), jubah mengembang/berkibar 2-3 px, lengan memompa 1 px.
- Left/right: kepala maju 1-2 px dan badan 1 px (shear baris), langkah dipanjangkan 1-2 px (shear kaki), kaki belakang/depan ditendang 3 px pada frame lewat, jubah menjulur 3-4 px; right = cermin left.
- Up: dasar c1/c0/c2/c3, angkat sepatu, kepala turun, jubah mengembang 2-3 px.
Jubah dibatasi otomatis agar tidak menyentuh kolom tepi sel (x=0/31).

## Pembuktian (lihat `.dev-cache/test-artifacts/sprint2/yaric/`)

`before_8x.png`, `after_walk_8x.png`, `after_idle_8x.png`, `after_sprint_8x.png`, `after_all_6x.png`, `crown_before_after_16x.png`, `diff-report.md/json`. Semua pasangan idle berbeda 62-301 piksel; selisih di zona rambut/torso/ujung jubah; selisih setelah penyelarasan translasi sama dengan selisih mentah; baris kaki identik. Sprint berbeda >160 px dari setiap frame jalan. Pusat kaki (8 baris terbawah) sprint 14.3-17.1.

## Cacat seni yang tersisa (jujur)

1. Semua idle/sprint hanya derivasi prosedural dari 4 frame jalan kasar; belum ada ayunan lutut/siku asli, jadi "lari" dari depan/belakang terbaca sebagai langkah dengan sepatu terangkat.
2. Pose sprint tampak depan memakai lengan yang digeser per blok 1 px: tampak sedikit menggumpal.
3. Right tetap cermin left (shading asimetris terbalik); 6 baris digandakan dari normalisasi Sprint 1 masih ada di left/right.
4. Mahkota belakang: kubah dengan outline, belum seikal turnaround; masih ada tuft samping 1-2 px dari sumber.
5. Frame sprint samping kaki belakang "ditendang" tampak sebagai potongan kaki pendek; kaki sisa dipakai bersama sumber kasar. Ujung jubah bergerigi acak hasil shear.
6. Idle: gerak halus, kepala turun 1 px saat napas (tinggi figur 45 px pada i2/i3).
