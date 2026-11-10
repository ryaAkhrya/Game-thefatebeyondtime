# AUDIO & CUTSCENE DESIGN — WEB BROWSER

## Musik

Musik instrumental terasa 16-bit, ada tema Hutan 1, Aveloria, Liora, Hutan 2, dungeon, battle, boss, romance, ending. **Sebagian lagu akan dibuat sendiri oleh Game Director**; gunakan `track_id` dan placeholder/silence, jangan mengarang komposisi private final. SFX untuk menu, lonceng, pedang, heal, step, tidak semua interaksi butuh sound.

## Browser-specific behavior

- Browser dapat memblokir autoplay: AudioManager mulai setelah pemain menekan Start/Enter.
- Bila tab tidak aktif, boleh pause/mute sementara; volume master/BGM/SFX dari Settings harus tetap benar saat kembali.
- Pilih format OGG/MP3 yang kompatibel dengan browser target, uji loading/gagal file/loop/crossfade.
- Jangan membundel musik pihak ketiga tanpa izin dan kredit. User-made soundtrack dapat mengganti file lewat mapping ID.

## Cutscene

Top-down sprite, dialog, gerak kamera seperlunya, musik, tanpa voice acting. Hindari kamera bergerak hanya karena 'cinematic'. Adegan penting per `docs/narrative/SCENE_DIRECTION_BIBLE.md`, dengan voice/nada karakter dalam `docs/narrative/CHARACTER_DIRECTION_BIBLE.md`.

Wajib: skip aman; tidak mengulang reward, flag benar, dialog mematuhi text speed. Keputusan `Reduced Flashes` dan `Screen Shake` di Settings berlaku di setiap cutscene. Alur modern interlude harus **setelah** Chapter IV.

## Private/public boundary

Foto/kenangan modern hanya pada versi privat yang mendapat izin. Tidak boleh menyisipkan materi privat ke `dist` publik meski route 'tersembunyi'. Ending biasa tetap menarik tanpa foto.
