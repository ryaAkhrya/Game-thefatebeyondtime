# WEB STORAGE & PRIVACY — SAVE LOKAL, BUKAN SERVER

## Penyimpanan MVP

- `SettingsRepository`: small versioned object in localStorage (`thefate.settings.v1`).
- `SaveRepository`: IndexedDB disarankan untuk slot save; localStorage boleh untuk JSON kecil jika diuji. Keduanya **terikat domain/asal website** dan bisa dihapus pengguna.
- `SaveData`: `schema_version`, `slot_id`, `chapter`, `scene_id`, `area_id`, `spawn`, `party`, `stats`, `inventory`, `equipment`, `skills`, `quest_flags`, `event_flags`, `saved_at`. Semua JSON-serializable, tidak menyimpan Phaser GameObjects.
- Update file save secara transactional/logis: payload baru divalidasi dulu, reward satu kali, marker `save_in_progress` opsional dan restore backup jika storage gagal.
- Setelah user mengubah domain/hosting, save lama **tidak otomatis ikut**. Fitur export/import dapat ditambahkan setelah MVP untuk mengatasi migrasi browser/domain.
- `New Game` tidak diam-diam menghapus save manual, harus konfirmasi jika overwrite.

## Risiko keamanan

- Build statis publik memungkinkan orang melihat file yang diunduh browser, termasuk `public/assets` dan `dist/assets`. **JANGAN** memasukkan foto pribadi, pesan privat, nama kontak sensitif ke public build, walaupun rutenya tersembunyi.
- Mode private anniversary harus menggunakan pipeline asset build terpisah dan akses hosting sesuai izin. Jangan pakai 'password prompt' di browser sebagai perlindungan asset sebenarnya.
- Tidak perlu login, cloud DB, server-side session, cookie analytics, atau telemetri untuk game satu pemain.
- Tidak ada pemuatan file lokal user otomatis dari OS.
- Sumber audio/foto harus berizin dan kredit benar; musik user dapat disisipkan nanti lewat slot BGM.

## Penerimaan

- Restart browser → valid save berhasil lanjut. Storage blocked → app tetap jalan sesi sekarang, beri notifikasi.
- Save rusak → Continue disabled/penjelasan, bukan crash.
- Build `public` tidak mengandung byte atau nama file pribadi.
- Settings persist tetapi tidak menimpa atau menghapus save.
