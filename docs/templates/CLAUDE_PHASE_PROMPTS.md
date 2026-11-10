# CLAUDE CODE PROMPTS — WEB DESKTOP

## Pertama kali (Phase 0) — copy ke Claude Code

> Baca seluruh `CLAUDE.md`, `RULES.md`, `docs/DECISIONS.md`, GDD, dan dokumen engineering/production yang relevan. Proyek sekarang **The Fate: Beyond Time WEB DESKTOP**, bukan Godot. Kerjakan **hanya Phase 0** menggunakan Phaser 4.2.1 + TypeScript + Vite dari template resmi yang kompatibel. Buat project di folder `web/` dengan title screen dan Settings nyata, keyboard-first, pixel art placeholder, 16:9; tidak ada React/backend/login. Referensi penampilan empat tokoh utama sudah dipilih; sprite dan ekspresi baru masih DRAFT hingga review Game Director. Pastikan Settings Master/BGM/SFX volume, text speed, fullscreen, scale, reduced effects punya sistem penyimpanan terpisah dari game save; implementasi bertahap sesuai Phase 0, jangan mengklaim fitur lengkap jika belum ada. Jalankan npm install/dev/build dan tes yang bisa dijalankan. Laporkan hasil yang benar, perubahan file, cara membuka browser, dan update TASKS/CHANGELOG/HANDOFF. Jangan mengerjakan Phase 1 atau deploy.

## Setiap phase berikutnya

> Baca `CLAUDE.md` dan `RULES.md` serta dokumen Phase X. Periksa keadaan proyek sebelum mengedit. Buat rencana kecil, implementasikan hanya scope X, jalankan `npm run build`, tes unit/browser terkait, periksa keyboard focus & settings, laporkan kegagalan nyata, dan update TASKS/CHANGELOG/HANDOFF. Jangan mengubah lore approved, artistik final atau phase lain tanpa instruksi.

## Jika kode broken

> Audit repo `web/` tanpa langsung refactor seluruhnya. Reproduksi bug dan tulis langkah reproduksi. Temukan root cause, buat patch minimal, jalankan build + smoke regression. Jangan mengubah asset registry final atau menambal bug dengan mematikan fitur. Laporkan perbaikan berbukti dan isu sisa.

## Setelah sketsa datang

> Baca `RULES.md` bagian art pipeline dan `docs/design/ART_AND_ASSETS.md`. Aset manual ini reference utama; jangan menggambar ulang secara generik. Buat design sheet/asset replacements dari sketsa yang user setujui, pertahankan ID logis dan collision/animation contracts. Periksa skala pixel dan karakter saat bergerak, tampilkan review sebelum replace global.

## Sebelum Chapter IV

> Wajib baca cerita `docs/narrative/APPROVED_STORY_R02.md` dan `docs/narrative/LORE_BIBLE.md`. Ingat Chapter IV hanya memori **era Aveloria**; masa modern hadir sebagai **3 beat interlude baru setelah IV**; epilog tebing adalah flashback bagi penonton. Jangan memasukkan foto privat ke public build. Draft dialog perlu approval Game Director.
