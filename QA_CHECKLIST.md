# QA CHECKLIST — WEB DESKTOP

## Phase 4 — vertical slice sampai Mournfang

**PHASE 4 PASS (fungsional/QA otomatis).** Bukti/batasan: `docs/production/PHASE4_REPORT.md`. Bukan Chapter I penuh.

- [x] Baseline Phase 3 diulang: 378 unit, 311 browser produksi, 54 dev; strict TS/build.
- [x] 405 unit/15 files, TypeScript strict dan production build lulus; boss AI/window/counter/defeat/retry/reward/checkpoint/save/dialog/asset/route teruji.
- [x] Regresi produksi Edge 375/375 (termasuk cerita ulang 162/162), Chrome 38/38, dev Edge 38/38; perjalanan Title→dua battle→save/refresh→penutup, kedua resolusi, no JS/asset/audio request errors.
- [x] Screenshot final: map/telegraph/GS/victory/defeat/ending/save diperiksa; hit/retry juga diverifikasi melalui frame/actor state aktual. Art tetap DRAFT.
- [ ] Playtest manusia dan target pacing 10–15 menit, art/animasi/balancing DRAFT, GPU/monitor/fullscreen nyata. Audio tetap AWAITING_COMPOSER.

## Phase 3 — RPG dan persistence (10 November 2026)

**PHASE 3 PASS (fungsional/QA otomatis): 378 unit, 311 browser checks produksi, TypeScript strict dan build lulus.** Bukti dan batasan: `docs/production/PHASE3_REPORT.md`.

- [x] Pure progression: EXP sekali, level/growth/cap; inventory dan Potion bersama combat; equip/unequip tanpa stat stacking; skill requirements/points; shop/currency/stock transactions.
- [x] Save schema v2 dan read-only migration v1, validasi base stat/EXP/skill/equipment, tiga slot manual + autosave, backup/recovery dan rollback kegagalan storage.
- [x] Browser Phase 3 dieksekusi: menu keyboard, penggunaan Potion dunia, comparison equipment, locked skills, pre-encounter save, refresh/Continue, shop terisolasi, corrupt/unsupported/blocked/quota cases, kedua resolusi. Perbaikan/re-run final dicatat di laporan.
- [x] Perjalanan Title→C1-04→victory→EXP/skill/equipment→save tiga slot→refresh→Continue→manual load→peti kosong tanpa duplikasi sudah dieksekusi.
- [ ] Playtest manusia, browser lain, monitor/GPU nyata, dan review balancing DRAFT. Audio tetap menunggu komposer; art lama tidak dianggap final.

## Phase 2 — C1-04 (10 November 2026)

**Status keseluruhan PARTIAL pada gate visual.** Bukti lengkap dan angka browser terbaru: `docs/production/PHASE2_REPORT.md`.

- [x] Pure BattleEngine: SPD/tie-break, damage, batas HP/MP, defense, MP cost/no MP, item, escape eligibility, AI, KO, victory, retry, status duration, duplicate action; 273 unit test total lulus.
- [x] Atlas v3.3 asli disalin utuh + JSON metadata; byte equality teruji. Durasi/pivot/event mengikuti metadata; perbedaan center pivot Hollowling dan foot pivot Yaric ditangani di penempatan panggung.
- [x] Browser battle: dua resolusi, Basic Attack/Ground Slam/Bertahan/Potion, MP habis, victory/defeat/retry, Pause/Settings dan silent fallback sudah dieksekusi. Re-run final seluruh suite tercatat di laporan.
- [x] Capture idle, anticipation/attack, Ground Slam fracture/impact, victory, defeat, retry; kontak-sheet seluruh frame sumber diperiksa.
- [ ] Review manusia: rasa berat serangan, balance, keterbacaan pada layar nyata, fullscreen, GPU/performa dan browser lain.
- [ ] Cleanup visual atlas sumber: potongan pedang Yaric dan piksel tepi pada beberapa sel. Sumber dipertahankan sesuai instruksi, status NEEDS_REVIEW.

Checklist di bawah mencakup fase lain juga; save/EXP/leveling/random encounter belum dianggap selesai.

**Jangan klaim PASS jika belum benar-benar diperiksa.** (Item tanpa centang = NOT RUN atau menunggu fase berikutnya, mis. audio terdengar, text speed pada dialog, Pause menu, Reduced Flashes pada efek nyata.) Setiap kolom adalah tes nyata: catat `PASS/FAIL/NOT RUN`, langkah, screenshot dan browser/OS.

## Build dan startup
- [x] `npm ci`/`npm install` dan `npm run build` lulus.  _(Phase 0, 10 Nov 2026: PASS, Edge 157 headless, lihat PHASE0_REPORT.md)_
- [x] `npm run dev` menampilkan title, `npm run preview` memuat build final.  _(dev dan preview: PASS; e2e 84/84 di keduanya)_
- [x] Browser console tidak ada exception kritis, file aset tidak 404.  _(Phase 0, 10 Nov 2026: PASS, Edge 157 headless, lihat PHASE0_REPORT.md)_ _Hanya layar Phase 0._
- [x] Tidak ada file `.gd`/`project.godot` yang dijadikan syarat.
- [x] Website tetap 16:9 pada 1366×768, 1920×1080, fullscreen dan windowed.  _(PASS windowed; fullscreen: toggle teruji, tampilan fullscreen nyata belum diperiksa manusia)_
- [x] Perangkat/viewport sempit mendapat pesan desktop-only yang layak.  _(Phase 0, 10 Nov 2026: PASS, Edge 157 headless, lihat PHASE0_REPORT.md)_

## Input / UX
- [ ] Semua menu, combat, dialog, Settings bisa dioperasikan keyboard tanpa mouse.
- [x] Tidak ada input bocor di balik modal, spam Enter tak double advance.  _(PASS untuk Title/Settings/Controls/placeholder; dialog Phase 1+)_
- [x] Title punya New Game, Continue, Settings; Continue disabled tanpa save.  _(Phase 0, 10 Nov 2026: PASS, Edge 157 headless, lihat PHASE0_REPORT.md)_ _(label: Mulai Baru, Lanjut, Pengaturan, Panduan Kontrol)_
- [x] Pause/Resume aman, tab background tak membuat player bergerak sendiri.  _(Phase 1: Pause/Resume PASS di e2e; tab background hanya diuji sebagai blur melepas tombol: unit + e2e Title, belum di dunia dengan tab sungguhan)_
- [ ] UI pixel grid konsisten, font terbaca, anti-slop `RULES.md` lulus.

## SETTINGS (WAJIB MVP)
- [ ] Master/BGM/SFX slider memengaruhi audio sesuai channel.
- [x] Mute tak mengubah nilai slider, kembali benar setelah unmute.  _(PASS di tingkat logika AudioManager; belum terdengar karena tanpa musik)_
- [x] Text speed Lambat/Normal/Cepat/Instan nyata mengubah dialog.  _(Phase 1: PASS pada dialog nyata: e2e Lambat vs Instan, unit untuk 4 mode)_
- [x] Fullscreen toggle bekerja atau menunjukkan alasan jika ditolak.  _(Phase 0, 10 Nov 2026: PASS, Edge 157 headless, lihat PHASE0_REPORT.md)_ _(diterima dan ditolak sama-sama ditangani)_
- [x] Window sizing/scale Pixel Perfect/Fit 16:9 tanpa blur/stretched.  _(PASS: 1366x768 = 4x, 1920x1080 = 6x tanpa blur; HiDPI nyata belum diuji)_
- [ ] Screen Shake OFF benar-benar menghilangkan shake, Reduced Flashes mengurangi flashing.
- [x] Settings dari Title dan Pause sama nilainya; tetap sesudah refresh/restart browser.  _(Phase 1: PASS: Pengaturan dari Menu Jeda dan Title memakai satu repository; tersimpan dan bertahan setelah refresh)_
- [x] Reset Defaults dengan konfirmasi, **tidak menghapus save**.  _(Phase 0, 10 Nov 2026: PASS, Edge 157 headless, lihat PHASE0_REPORT.md)_
- [x] Browser audio tidak mencoba autoplay sebelum interaksi.  _(PASS: tidak ada audio dimuat; unlock hanya setelah input pertama)_

## World, battle, progression
- [x] Movement/collision/interaction benar, NPC Nambo tak double reward.  _(Phase 1: PASS: Nambo/peti tidak memberi hasil ganda; uji manusia belum)_
- [ ] Random encounter hanya di area yang diizinkan dan cooldown berlaku.
- [ ] Attack, Skill, Item, Defend, Run, target, HP/MP, status dan victory/defeat/escape benar.
- [ ] Reward EXP/item/gold hanya satu kali; EXP → level & skill unlock bisa ditest.
- [ ] Peti tidak memberi potion kedua setelah load.
- [ ] Pause/Settings tidak mengonsumsi giliran battle.

## Save lokal
- [ ] Manual save + autosave, load mengembalikan posisi, quest, item, party, level, skills, flags.
- [ ] Refresh/close tab → Continue bekerja.
- [x] Save korup/dilarang browser storage tidak crash.  _(Phase 0, 10 Nov 2026: PASS, Edge 157 headless, lihat PHASE0_REPORT.md)_
- [ ] Autosave tidak menulis di tengah battle/cutscene transisi.
- [x] Settings persist terpisah dari save game.  _(Phase 0, 10 Nov 2026: PASS, Edge 157 headless, lihat PHASE0_REPORT.md)_

## Narrative canon
- [ ] **Revisi 02** tetap acuan; Varlgrim salah sebab segelnya sendiri.
- [ ] Torvan tidak memperbaiki semua masalah dengan kekuatan tanpa batas.
- [ ] Velthia punya aksi evakuasi yang menyelamatkan warga di IV.
- [ ] Dialog sepenuhnya Indonesia natural sesuai karakter.
- [ ] M-01..03 modern **sesudah IV**, E-01 tebing flashback; tidak ada paradoks.
- [ ] Foto/memori pribadi tidak dikarang AI; public build tanpa assets pribadi.
- [ ] Ending To Be Continued, P.S. sesudah credits private.

## Release / ownership
- [ ] Tidak ada analytics/cookies/tracker tanpa izin.
- [ ] Daftar sumber asset dan izin musik/foto ada.
- [ ] `dist` publik bebas foto/pesan pribadi.
- [ ] Build static HTTPS tested; URL actual baru diumumkan jika sudah deployed.


## v3 asset and final boss checks — OPEN

- [ ] Every PNG atlas has transparent background, stable frame/grid metadata, native-size QA and consistent silhouette.
- [ ] C05–C09 have no combat sprites or invented abilities; B04=C04 staff design.
- [ ] Meteor telegraph visible with reduced flashes; Velthia mandatory and shield reachable on first and later meteor cycles.
- [ ] Reload cannot softlock; silent BGM fallback; private data absent from public build.
