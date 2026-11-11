# Polish Sprint 2 — Art dunia permukiman: Aveloria dan Liora

Status: DRAFT dev art (kode-native, dibangkitkan deterministik). Hanya visual: tidak ada perubahan trigger, id interactable, posisi NPC cerita, spawn, exit, toko, geometri lonceng maupun pan kamera kota. Aset belum dicatat di ASSET_INDEX.md (sesuai instruksi).

## Pipeline
- `node scripts/gen-town-art.mjs [aveloria|liora]` -> `public/assets/environment/town/{aveloria,liora}_{ground.png, atlas.png, atlas.json}`. Modul di `scripts/town-art/` (pixel, kit material, bangunan, sprite/prop/ground per kota, bayangan, font 3x5 untuk papan nama, `preview.mjs` untuk lembar kontak).
- Tata letak bersama: `src/game/data/maps/town.layout.mjs` (+ `.d.mts`). Item = frame + titik pijak (tengah-bawah); `sol`/`sols` = jejak tabrakan benda dekoratif BARU (bangunan memakai solid lama). Runtime: `world/townArt.ts` (`drawTown`), dipanggil dari `drawAveloria` dan `drawChapter2Ground('liora')`. Atlas/gambar terdaftar di `TOWN_ATLASES/TOWN_IMAGES` (`environmentAssets.ts`).
- Tanah = satu PNG per kota (1280x1408 dan 960x704): paving, material, transisi, dinding belakang ruang pertemuan, atap istana, bayangan jatuh semua sprite sudah dibaking (tidak menimpa karakter). Sprite diurutkan menurut y kaki (override `d` hanya untuk arsip 775 agar Azie tampak di terasnya, kios belakang 863, gerbang 1170, pintu istana 447).
- Jumlah objek: Aveloria sekitar 90 image + 1 tanah; Liora sekitar 110 (termasuk cincin pohon). Satu draw tiap atlas.

## Palet (cahaya kiri-atas, bayangan kanan-bawah ke warna keunguan `#231d33`/`#2a2233`, outline 1 px `#1d1625`)
- Aveloria (~34 warna): batu pucat 6 (`#4b4a57..#ece6d4`), slate 5, plum dalam 5 (`#3b2a4a` inti), kayu 5, rumput dingin 5, paving 5, tanah 4, air 4, teal (daun jendela) 4, besi 4, perunggu 4 (hanya lonceng/ring kecil), krem/mawar/hijau-muda (motif dua garis putus), warna dagangan.
- Liora (~32 warna): tanah 5, rumput hangat 5, jerami 5, kayu 5, kapur 4, oker 4, batu 5, sirap 5, kain (indigo 3, madder 3, linen 3), air 4, bunga (pink/pucat/lavender).

## Bahasa arsitektur
- Aveloria: batu kapur pucat berlapis (ashlar), plester dengan sudut quoin, atap slate pinggul, lengkung batu bergaya voussoir, spanduk plum dengan dua garis putus (mawar/hijau-muda) hanya di bangunan sipil/gerbang/istana, awning plum-krem hanya di pasar, kayu gelap untuk pintu/rak. Tidak ada emas: lonceng dan cincin pintu perunggu kecil saja. Dinding kota + gerbang berlengkung dengan portcullis, menara lonceng dengan jam di pukul 9 dan ruang lonceng terbuka (lonceng = sprite terpisah yang diayun), fasad istana rendah dengan portal 80 px (pintu tertutup/terbuka mengikuti flag arsip), ruang pertemuan (cutaway) berlantai batu kotak, karpet plum bergaris putus, jendela tinggi + berkas cahaya keras (tanpa glow), lemari arsip, meja kerja panjang bukan takhta. Sayap istana digambar sebagai atap slate di sekeliling ruang pertemuan.
- Liora: kayu, jerami, tanah, kapur. Empat rumah berbeda (rangka kayu+kapur+jerami; tanah oker+sirap+gudang; balok mendatar+jerami berlumut; batu+kayu menjorok+sirap pelana), jalan tanah dengan bekas roda, tepi bergerigi, pengaruh budaya bingkai ukir (bingkai di dinding, bengkel Zira dengan dua ukiran yang sesuai deskripsi: lambang retak dan dua jalur yang hampir bertemu, tiang cerita berukir).

## Daftar prop
Aveloria: home1/home2/penginapan (INAP)/arsip (ARSIP, teras)/tembok barat-timur/rumah gerbang (AVELORIA)/portcullis/menara/lonceng/fasad istana/pintu x2/petak pagar tanaman/lampu/sumur/bangku/papan petunjuk (PASAR, ISTANA, ARSIP)/papan ke Liora/peti/tong/karung/pot/kios belakang+depan/kios sayur/gerobak/meja Azie x2/lemari arsip x2 varian/meja kerja/kursi/pohon bulat/cemara/ek/semak.
Liora: 4 rumah/bengkel Zira/rak jemur A+B/sumur/gerobak/tumpukan kayu/tong x2/jerami/palung/pagar/jemuran/kebun A+B/linden/apel/cemara/semak/pakis/gerbang hutan (HUTAN)/papan (AVELORIA)/kursi/tiang cerita/lentera/bangku/landasan+kapak/tumpukan papan.

## Aturan penempatan
1. Siluet = jejak: bangunan memakai solid lama; elemen tinggi (cerobong, menara, atap) boleh menjulang di atas jejak dan menutupi pemain yang berdiri di utaranya (urut menurut y kaki).
2. Benda dekoratif baru wajib punya `sol` yang sepadan dengan dasar visualnya; CollisionMap membulatkan ke sel 8 px, jadi jalan 64 px tetap lebih dari cukup.
3. Jangan menutup rute: diuji flood fill (lihat bawah). Kantong tertutup ditolak (contoh: jerami NE dipindah agar tidak mengurung kantong di timur rumah NE).
4. Tidak ada pintu rumah yang menghadap tembok: rumah 2 dan penginapan (baris selatan, menempel tembok kota) sengaja tanpa pintu depan (jendela ceruk/ lubang gudang); pintu rumah 1 menghadap plaza.
5. Ruang kosong dipertahankan: tengah plaza (medalion), halaman istana, ruang pertemuan, jalan selatan, pusat Liora.

## Verifikasi
- Sebelum/sesudah: `.dev-cache/test-artifacts/sprint2/town/before_*` dan `after_*` (1920x1080 dan 1366x768; gerbang, jalan, plaza, pasar, rumah barat, arsip, menara, halaman, istana, ruang pertemuan, tembok, jalan keluar; Liora: pusat, bengkel, utara, selatan, rumah barat/timur, halaman SW/SE, tepi).
- `tests/unit/townReach.test.ts` (baru): rute asli tetap terjangkau kecuali yang tertutup jejak dekorasi, >86% sel terjangkau tersisa, semua spawn/posisi NPC cerita dapat dipijak dan terhubung, setiap interactable dan trigger dapat dijangkau dari titik terjangkau, dekorasi tidak menimpa kaki NPC/spawn, semua frame layout ada di atlas. `aveloria.test.ts` tidak diubah dan lulus.

## Yang masih lemah (jujur)
- Pola paving plaza sedikit seperti dinding bata; blok variasi rumput/tanah masih terlihat seperti tambalan besar pada beberapa tampilan.
- Atap sayap istana (tampak atas) berupa pola genteng vertikal yang bising; ruang pertemuan tidak punya dinding sisi tinggi dan plafon sungguhan.
- Lorong gerbang tidak punya dinding lorong terpisah; portcullis hanya diverifikasi dari atlas, bukan dari state "gerbang tertutup" di browser.
- Pohon dan semak memakai satu algoritma mahkota (bergumpal 4 px) sehingga terasa seragam; tidak ada pengaturan angin/animasi.
- Rak jemur A terbaca seperti pagar papan; pencahayaan ruang pertemuan tidak mengikuti arah bayangan karakter.
- NPC/warga/penjaga masih sprite lama (tugas pihak lain); kios sayur menumpuk dengan warga penjualnya.
- Belum ada tahap malam/dusk khusus pada art (overlay dusk lama tetap dipakai).
