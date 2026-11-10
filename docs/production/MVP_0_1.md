# MVP 0.1 — WEB DESKTOP PLAYABLE VERTICAL SLICE

**Target durasi:** 10–15 menit, bergantung pemain. **Bukan** Chapter I penuh. Game dimainkan dari browser PC/laptop, keyboard, single-player, landscape 16:9.

## Alur minimum end-to-end

1. Buka lokal via Vite/preview build; tampil **Title Screen**: New Game, Continue (disabled tanpa save), **Settings**, Controls.
2. Buka Settings → ubah musik/teks/fullscreen/display (lihat Settings Spec) → simpan → kembali Title, nilai tidak hilang.
3. New Game: Yaric bangun di Hutan 1 dengan bentuk placeholder **YARIC TEMP** yang jelas.
4. Bergerak WASD/arrow, collision benar, kamera mengikuti tanpa blur pixel.
5. Interaksi dengan Nambo; dialog full Indonesia natural, text speed mengikuti setting.
6. Temukan satu peti potion; tidak dapat diambil dua kali setelah load.
7. Random encounter Hollowling di luar safe area; masuk battle side-view tanpa crash.
8. Attack/Skill/Item/Defend/Run, HP/MP, enemy AI, turn order. Selesaikan victory/defeat/escape.
9. Menang: EXP dan optional item; minimal satu level-up + satu skill yang dapat dibuka. Reward hanya diberikan sekali.
10. Pause → Inventory → pakai potion, lihat stats & equipment singkat, Save.
11. Refresh tab, Continue → state sama (lokasi, HP/MP, item, EXP, skill, flags, peti, Settings).
12. Peta membawa pemain ke penanda **Akhir Demo** yang membatasi versi MVP; bukan cutscene seluruh bab.

## Settings MVP harus nyata

- Master volume, BGM, SFX, mute; UI merespons perubahan dan state persist.
- Text speed: Lambat/Normal/Cepat/Instan, dipakai dialogue box.
- Fullscreen: browser request + true state/error feedback.
- Scale: Pixel Perfect/Fit dengan aspek 16:9, tak blur/stretched berlebihan.
- Screen shake toggle + reduced flashes toggle benar-benar mengontrol efek.
- Settings tersedia di Title **dan** Pause, reset defaults dengan konfirmasi.

## State untuk tes

- `new_game` tidak menggunakan progress lama kecuali pemain pilih continue.
- `reward.hollowling_encounter` tidak double count bila battle scene diulang.
- `chest.demo_potion.opened` disimpan dan terjaga.
- Autosave setelah checkpoint stabil, tidak saat animasi damage, transisi, atau reward sedang commit.
- Refresh di tengah battle: kembali ke checkpoint world aman terakhir, tanpa duplikasi hasil.
- Save lokal domain ini; tidak menjanjikan sinkronisasi perangkat.

## Acceptance test ringkas

| Kasus | Expected |
|---|---|
| `npm run build` | tanpa fatal/TypeScript error |
| Browser 1366×768 dan 1080p | 16:9 jelas, tidak clipping |
| Keyboard only | semua tombol utama bisa diakses |
| Encounter kedua setelah cooldown | tidak spam/insta-loop |
| Boss Run restriction fixture | disabled dan info singkat |
| Repeat click/confirm spam | tidak double reward/dialog |
| Settings > BGM volume 0 | tidak terdengar BGM |
| Text speed instant | dialog langsung penuh tanpa skip 2 baris |
| Browser refresh | Continue dan Settings benar |
| Storage blocked | game tidak crash, ada notifikasi |
| Mobile/narrow viewport | pesan desktop-only bukan game pecah |
| Missing music file | fallback silent tanpa crash |

## Out of MVP

Torvan partner, Velthia party, Varlgrim, semua monster/boss, tujuh area lengkap, foto dan kenangan modern, ending anniversary, art final dan lagu user final. Semua akan hadir di Phase 5/6 setelah MVP stabil.

## Syarat laporan Claude

Cantumkan URL lokal yang benar-benar berjalan, lokasi `web/dist` setelah build, daftar tes yang dijalankan, bug terbuka, screenshot bila bisa, perubahan file, dan checklist Phase 4. Jangan menulis "semua sempurna" jika belum ada user playtest.
