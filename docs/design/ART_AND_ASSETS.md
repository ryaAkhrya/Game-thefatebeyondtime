# ART & ASSET CONTRACT — PLACEHOLDER FIRST, ANTI-SLOP

**Referensi desain C01–C04 sudah dipilih dari sheet utama.** Wajah, rambut, dan siluet harus konsisten. Aset baru v3.1 masih DRAFT, perlu review manual dan lulus `RULES.md`.

## Gaya final

Classic 16-bit JRPG: pixel-grid konsisten, siluet kuat, hierarki detail, palet terkendali, animasi terbaca. Visual cantik bukan berarti semua elemen terang, glow, gradient, ornate borders, atau bintang bertebaran. Dunia Aveloria harus terasa dihuni: bekas pakai, asimetri yang disengaja, petunjuk keseharian.

## Placeholder MVP

- Yaric = kotak/sprite sederhana berlabel **YARIC — TEMP**; Nambo = bentuk berbeda **NAMBO — TEMP**.
- Monster Hollowling = satu bentuk yang terlihat jelas, bukan AI illustration downscale.
- Background Hutan 1 = tile dasar 16:9 / collision map sederhana.
- UI dialogue/battle/title/settings = panel kotak pixel minimal dengan state fokus terlihat.
- Audio = fallback royalty-free/original aman, atau silent saat slot belum diisi.
- **Jangan menjadikan contoh art generated sebagai keputusan final.**

## Pipeline integrasi sketsa

1. Terima scan/foto sketsa user-approved, catat siapa author dan izin untuk pakai dalam game.
2. Turunkan design sheet: front/side/back/ekspresi/siluet dengan proporsi yang konsisten.
3. Pilih ukuran sprite/tile, frame animasi dan palet setelah test screenshot pada skala native.
4. Revisi oleh manusia; baru masukkan ke `AssetRegistry` menggantikan path placeholder tanpa mengubah ID logis, hitbox, gameplay state.
5. QA 4 arah movement, walk cycle, battle stance, cutscene gesture, keterbacaan pada 1366x768 dan 1080p.

## Asset manifest per mode

| Kategori | MVP | Full Game |
|---|---|---|
| Yaric | 1 placeholder + walk 4 arah | sprite sketsa final + combat/cutscene |
| Velthia/Torvan/Varlgrim | label/reference only | final dari sketsa/review |
| Nambo/Hollowling | placeholder jelas | final dari art direction |
| Hutan | area kecil dengan collision | 2 hutan dengan landmark alami |
| UI | title, Settings, dialogue, battle, pause | seluruh menu sesuai style bible |
| Personal photos | **NONE** | hanya private build jika diizinkan |

## File naming

`char_yaric_walk.png`, `enemy_hollowling.png`, `ui_settings_panel.png`, `bgm_area_01.ogg` adalah contoh nama. Aset final jangan tergantung filename di ratusan scene; mapping via logical ID. PNG transparan piksel harus diuji nearest-neighbor.

## Forbidden styling

Glassmorphism, shiny SaaS gradient cards, glowing runes on every button, ilustrasi fantasy generik yang semuanya simetris, sprite yang cuma hasil mengecilkan gambar detail, efek sinematik tak terkendali, tidak punya negative space. Rujuk rubrik `RULES.md` sebelum menerima aset.
