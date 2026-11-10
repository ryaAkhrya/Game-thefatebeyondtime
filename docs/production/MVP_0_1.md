# MVP 0.1 — WEB DESKTOP PLAYABLE VERTICAL SLICE

**Target durasi:** 10–15 menit, bergantung pemain. **Bukan** Chapter I penuh. Game dimainkan dari browser PC/laptop, keyboard, single-player, landscape 16:9.

Scope terkini mengikuti instruksi Phase 4 pengguna: mencakup **Mournfang**, checkpoint/retry dan penutup menuju Aveloria. Status implementasi/QA aktual: `PHASE4_REPORT.md`. Durasi manusia tetap perlu playtest; angka automation bukan klaim pacing manusia.

## Alur minimum end-to-end

1. Buka lokal via Vite/preview build; tampil **Title Screen**: New Game, Continue (disabled tanpa save), **Settings**, Controls.
2. Buka Settings → ubah musik/teks/fullscreen/display (lihat Settings Spec) → simpan → kembali Title, nilai tidak hilang.
3. New Game: Yaric bangun di Hutan 1 memakai atlas eksplorasi existing, NEEDS_REVIEW.
4. Bergerak WASD/arrow, collision benar, kamera mengikuti tanpa blur pixel.
5. Interaksi dengan Nambo; dialog full Indonesia natural, text speed mengikuti setting.
6. Temukan satu peti potion; tidak dapat diambil dua kali setelah load.
7. Encounter scripted Hollowling, sekali; masuk battle side-view tanpa crash. Random encounter belum dibuat.
8. Serang/Jurus/Barang/Bertahan/Kabur, HP/MP, AI dan turn order; victory/defeat/retry nyata. Kabur pada encounter scripted nonaktif dengan alasan; foundation escape biasa teruji unit.
9. Menang: EXP dan optional item; minimal satu level-up + satu skill yang dapat dibuka. Reward hanya diberikan sekali.
10. Pause → Inventory → pakai potion, lihat stats & equipment singkat, Save.
11. Refresh tab, Continue → state sama (lokasi, HP/MP, item, EXP, skill, flags, peti, Settings).
12. Ujung utara menuju tepi hutan, checkpoint HP/MP aman, konfrontasi dan battle Mournfang dengan telegraph/counter serta defeat/retry.
13. Setelah boss, aftermath sesuai C1-05 dan jalan timur menuju penutup **Jalan ke Aveloria**. Save/load sebelum/sesudah boss dan penutup. Bukan cutscene seluruh bab.

## Settings MVP harus nyata

- Master volume, BGM, SFX, mute; UI merespons perubahan dan state persist.
- Text speed: Lambat/Normal/Cepat/Instan, dipakai dialogue box.
- Fullscreen: browser request + true state/error feedback.
- Scale: Pixel Perfect/Fit dengan aspek 16:9, tak blur/stretched berlebihan.
- Screen shake toggle + reduced flashes toggle benar-benar mengontrol efek.
- Settings tersedia di Title **dan** Pause, reset defaults dengan konfirmasi.

## State untuk tes

- `new_game` tidak menggunakan progress lama kecuali pemain pilih continue.
- Ledger `reward.first_hollowling.rpg` / `reward.mournfang.rpg` dan flag encounter/boss mencegah reward ganda.
- `reward.c1_chest_potion.claimed` disimpan dan terjaga.
- Autosave setelah checkpoint stabil, tidak saat animasi damage, transisi, atau reward sedang commit.
- Refresh di tengah battle: kembali ke checkpoint world aman terakhir, tanpa duplikasi hasil.
- Save lokal domain ini; tidak menjanjikan sinkronisasi perangkat.

## Acceptance test ringkas

| Kasus | Expected |
|---|---|
| `npm run build` | tanpa fatal/TypeScript error |
| Browser 1366×768 dan 1080p | 16:9 jelas, tidak clipping |
| Keyboard only | semua tombol utama bisa diakses |
| Kembali ke trigger encounter/boss selesai | tidak retrigger/duplikasi reward |
| Boss Run restriction fixture | disabled dan info singkat |
| Repeat click/confirm spam | tidak double reward/dialog |
| Settings > BGM volume 0 | tidak terdengar BGM |
| Text speed instant | dialog langsung penuh tanpa skip 2 baris |
| Browser refresh | Continue dan Settings benar |
| Storage blocked | game tidak crash, ada notifikasi |
| Mobile/narrow viewport | pesan desktop-only bukan game pecah |
| Missing music file | fallback silent tanpa crash |

## Out of MVP

Torvan partner, Velthia party, Aveloria lengkap, Varlgrim dan boss selain B01, seluruh tujuh area, foto/kenangan modern, ending anniversary, art final dan lagu user final. Pengembangan berikutnya hanya setelah instruksi pengguna.

## Syarat laporan Claude

Cantumkan URL lokal yang benar-benar berjalan, lokasi `web/dist` setelah build, daftar tes yang dijalankan, bug terbuka, screenshot bila bisa, perubahan file, dan checklist Phase 4. Jangan menulis "semua sempurna" jika belum ada user playtest.
