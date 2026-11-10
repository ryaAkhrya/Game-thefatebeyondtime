# UX FLOW — DESKTOP BROWSER JRPG

## Prinsip

- Pengalaman tampil seperti game 16-bit klasik, **bukan dashboard website** meskipun dijalankan di browser.
- Keyboard penuh (arrows/WASD, Enter/Z, Esc/X), rasio 16:9; mouse boleh tambahan tetapi tidak diwajibkan.
- Fokus dan state input terpusat, sehingga menu/dialog tidak meneruskan input ke dunia.
- Tampilan manusiawi dan mudah dibaca mengikuti `RULES.md`; tiap screen perlu hierarki jelas dan ruang bernapas.

## Screen navigation

```text
LOAD PAGE (desktop capability check)
  → PRESS START / TITLE
       ├─ NEW GAME → INTRO/FOREST → WORLD
       ├─ CONTINUE → VALID LOCAL SAVE → WORLD
       ├─ SETTINGS → SETTINGS PANEL → TITLE
       ├─ CONTROLS → KEY LEGEND → TITLE
       └─ CREDITS → TITLE

WORLD ── ESC → PAUSE
   ├─ RESUME
   ├─ INVENTORY / EQUIPMENT / SKILL TREE / QUEST (MVP subset)
   ├─ MANUAL SAVE / LOAD
   ├─ SETTINGS → PAUSE (no story reset)
   └─ RETURN TITLE (confirm if unsaved)
WORLD → DIALOGUE → WORLD
WORLD → ENCOUNTER → SIDE-VIEW BATTLE → RESULT → WORLD
WORLD → CUTSCENE → WORLD/NEXT CHAPTER
```

Tidak ada tombol **Quit** ala executable yang menutup browser; gunakan **Return to Title**, `Help`, atau `Credits` bila dibutuhkan.

## Interaction state

- `UIContext = title | world | dialogue | pause | settings | battle | cutscene | ending`.
- Highest overlay menerima keyboard; scene di bawah tak merespons input.
- Dialog typewriter: Enter pertama selama mengetik = tampilkan semuanya; Enter berikutnya = lanjut. Hormati `text_speed`.
- Fokus tombol yang terpilih **selalu terlihat** bahkan ketika mouse tidak dipakai.
- Pause saat `window.blur` boleh dilakukan tanpa menimpa save; Resume tidak mengulang cutscene.

## Battle UI

Classic side-view, hero kanan, enemy kiri; tujuh stats di data, display yang relevan saja. Attack/Skill/Item/Defend/Run, MP/item availability, enemy targeting, buff/debuff duration jelas. Animasi singkat, bukan berkilau terus.

## Save UX

- `Continue` nonaktif tanpa save valid.
- Autosave indikator kecil saat checkpoint sukses; jangan pop-up besar.
- Manual save hanya di state aman, tampilkan alasan jika tidak bisa.
- Load mengembalikan chapter, lokasi, HP/MP, item, quest, flag, party, exp, skill, dan posisi.
- Browser storage bisa terhapus saat pengguna clear site data; jelaskan risiko secara wajar.

## Settings UX

**Wajib dari MVP**; detail lengkap di `docs/design/SETTINGS_SPEC.md`. Tombol Settings ada di title dan pause, menyimpan volume BGM/SFX/Master, mute, kecepatan teks, fullscreen, mode scale, shake/reduced flashes. Ada Reset Defaults yang aman. Tidak boleh sekadar menu palsu.

## Desktop-only behavior

Viewport kecil/mobile: tampilkan layar sederhana "Game ini dirancang untuk PC/laptop dengan keyboard" dengan tombol kembali (jika ada halaman induk). Jangan mengklaim game mendukung sentuh bila belum dites. Layar browser ukuran bervariasi harus letterbox 16:9 tanpa stretch.

## UX acceptance

- Pemain tahu cara mulai game dalam 15 detik; fitur Settings terlihat tanpa menebak.
- Semua modal dan dialog dapat ditutup via keyboard.
- Keyboard navigation tidak loncat dua kali, tab browser yang kehilangan fokus tidak merusak state.
- Teks tidak terpotong pada 1366x768 maupun 1920x1080.
- Screenshot menu tidak mirip template SaaS/AI RPG generik.
