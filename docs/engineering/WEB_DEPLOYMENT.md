# WEB BUILD & DEPLOYMENT — PC DESKTOP ONLY

## Phase 0 local

Di IDE, buka root repo. Claude buat `web/` dari template Phaser + Vite + TS yang cocok dengan Phaser 4.2.1. Jalankan:

```bash
cd web
npm install
npm run dev
```

Browser `localhost` menampilkan title/panel kosong yang sesuai phase saat ini. `npm run build` menghasilkan `web/dist/` saat lulus. Jangan klaim URL produksi sudah ada sebelum deploy dilakukan oleh pemilik.

## Rilis statis

- Host seluruh isi `web/dist/` ke penyedia static HTTPS (Vercel/Netlify/Cloudflare Pages, atau host statis sendiri) setelah user memberi izin.
- Jika base path bukan root domain, konfigurasi `base` Vite dan url asset dengan benar; direct refresh tidak memberi 404.
- Tidak ada server realtime atau DB untuk single-player. Save dan Settings berada di browser pengunjung.
- Test Chrome/Edge desktop Windows, window 1366x768, 1920x1080, F11 fullscreen; mode mobile tampil pesan tidak didukung.
- Audit ukuran asset dan waktu loading; kompres sprite/music bila terlalu berat tanpa merusak kualitas.

## Private anniversary

Gunakan build konfigurasi pribadi **terpisah** dan deployment dengan akses yang benar bila menyertakan foto/audio pribadi. Jangan pernah menganggap password HTML/CSS menyembunyikan file public. Pastikan izin pasangan untuk penggunaan foto terutama jika URL dibagikan.
