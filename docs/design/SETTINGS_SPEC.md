# SETTINGS SPEC — WAJIB BERFUNGSI

**Status: LOCKED fitur, nilai default adalah rekomendasi awal yang bisa diuji.** Settings bukan tombol pajangan, harus dapat diakses dan disimpan sejak MVP 0.1. Target input keyboard desktop.

## 1. Akses

- Title screen: `New Game`, `Continue`, **`Settings`**, `Controls`, `Credits` (Credits boleh sederhana).
- Saat bermain: `Esc`/Pause → `Resume`, `Save`, **`Settings`**, `Return to Title` (dengan konfirmasi jika progres belum disimpan).
- Settings **tersedia tanpa harus punya save game**. Perubahan berlaku langsung dan dipakai pada scene lain.
- Di bawah 16:9, kotak settings tidak boleh terpotong; dukungan mobile bukan target, tapi berikan pesan desktop-only.

## 2. Daftar setting

| Key | Tipe & opsi | Default draft | Perilaku nyata |
|---|---|---|---|
| `master_volume` | 0–100%, step 5 | 100 | mengalikan volume seluruh kanal |
| `bgm_volume` | 0–100%, step 5 | 70 | musik area, battle, ending |
| `sfx_volume` | 0–100%, step 5 | 80 | UI, footsteps, hit, status, bell |
| `mute_all` | on/off | off | menghentikan suara sementara tanpa menghapus slider |
| `text_speed` | Lambat / Normal / Cepat / Instan | Normal | durasi per karakter dialog; konfirmasi saat mengetik menampilkan teks penuh, konfirmasi lagi lanjut |
| `fullscreen` | on/off | off | meminta fullscreen ketika ditekan (perlu user gesture/browser izin); update UI jika browser menolak/keluar |
| `screen_scale` | Pixel Perfect / Fit | Fit | rasio 16:9 tetap, tidak melebar; pixel-perfect bila memungkinkan secara teknis |
| `screen_shake` | on/off | on | mematikan shake di battle/cutscene, tidak mematikan feedback penting |
| `reduced_flashes` | on/off | on (aman) | minim flashing dan transisi menyilaukan |

**Boleh belakangan:** custom keyboard rebinding, bahasa lain, color-blind profiles. Jangan menambah 20 setting rumit untuk MVP.

## 3. Navigasi keyboard

- Up/Down memilih opsi, Left/Right menyesuaikan slider, Enter/Z memilih, Esc/X kembali, fokus terlihat jelas.
- Tombol yang masih ditahan ketika menutup setting tidak memicu gerakan dunia/aksi ganda.
- Saat fullscreen gagal browser mengembalikan nilai toggle dan menampilkan pesan singkat, bukan diam.
- Reset to Default memakai konfirmasi dua langkah; cancel mempertahankan nilai lama.

## 4. Penyimpanan

- `SettingsRepository` menyimpan schema version `settings_v1` di storage browser terpisah dari story save.
- Load saat boot **sebelum musik diputar**; tetapkan default jika data hilang/invalid.
- Settings survive refresh, browser restart, New Game, Continue dan Reset Game Progress.
- Bila storage diblokir, setting masih berfungsi dalam sesi saat ini, dengan pemberitahuan bahwa perubahan tidak tersimpan permanen.
- Volume master efektif = master × channel; mute memaksa 0 tanpa mengubah posisi slider.
- Musik user yang dipasang nanti tunduk pada slider BGM, bukan jalur audio khusus yang mengabaikan Settings.

## 5. Uji penerimaan wajib

- Title → Settings: slider BGM dapat diubah; berpindah scene tidak mereset; refresh halaman tetap nilainya.
- Dalam battle, Pause/Settings bila diizinkan tidak mengonsumsi giliran dan tidak menggandakan aksi.
- Text Speed: empat mode dapat dibedakan nyata; teks instan tidak menyebabkan double advance.
- Fullscreen: berhasil atau error state ditampilkan; Escape browser mengembalikan UI sesuai kondisi sebenarnya.
- `Reduced Flashes` menonaktifkan flash cepat, `Screen Shake` benar-benar menonaktifkan shake.
- UI keyboard-only, tidak perlu mouse; fokus terlihat, semua slider dapat dioperasikan.
- Audio autoplay policy: musik dimulai setelah pemain menekan input, bukan mencoba autoplay lalu crash.
- Reset Defaults tidak menghapus save data.

## 6. Pengarahan visual anti-slop

Menu dibangun dengan pixel-art minimal yang fungsional, sesuai RULES.md. Jangan memakai glassmorphism, tombol neon, gradient glossy, 3 panel transparan, atau ikon dekorasi seragam. Volume terlihat sebagai bar sederhana; teks cukup besar dan kontrasnya aman. Main menu game adalah game, bukan landing page SaaS.
