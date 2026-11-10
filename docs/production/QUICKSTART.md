# QUICKSTART — PEMILIK GAME (WEB DESKTOP)

## 1. Ekstrak dokumentasi

Ekstrak ZIP terbaru ke direktori kerja, contoh `D:\\TheFateBeyondTime`. Dokumen Word terbaru ada di `docs/source/`; jangan gunakan GDD Godot lama sebagai sumber.

## 2. Siapkan IDE dan tools

Install Node.js LTS, VS Code (atau IDE sejenis), dan Claude Code. Buka **root** `TheFateBeyondTime`, bukan folder dokumen satu-satu. Untuk Phaser sendiri tidak perlu aplikasi editor game terpisah; Claude akan membuat project TypeScript di `web/`.

## 3. Instruksi pertama untuk Claude

Salin prompt Phase 0 dari `docs/templates/CLAUDE_PHASE_PROMPTS.md`. Minta Claude membaca `CLAUDE.md` + `RULES.md`, membuat project web dengan Settings, menjalankan tes lokal, dan **berhenti setelah Phase 0**.

## 4. Menjalankan hasil Phase 0 di komputer

```bash
cd web
npm install
npm run dev
```

Buka URL localhost yang benar-benar ditampilkan terminal. Uji title/Settings. Untuk build: `npm run build` lalu `npm run preview`. Phase 0 dan Phase 1 sudah selesai (intro Chapter I dapat dimainkan dari Mulai Baru); `npm run verify` menjalankan typecheck + unit test + build, dan `npm run test:e2e` menjalankan smoke test browser (butuh Microsoft Edge terpasang; jalankan `npm run build` dulu). Agar cache dan file sementara tetap di drive D:, jalankan `. .\scripts\dev-env.ps1` di PowerShell dari folder `web`.

## 5. Sketsa belum siap?

Tetap lanjut Phase 0–4. Character di-screen hanya placeholder berlabel. Ketika sketsa disetujui, masukkan melalui `docs/design/ART_AND_ASSETS.md` dan mapping AssetRegistry; logika permainan tidak perlu diulang.

## 6. Siapa memutuskan apa?

AI membantu coding, event, visual, serta QA. **Game Director** tetap memutuskan design final, perubahan cerita, musik personal, dan rilis website. Claude tidak boleh mengarang kenangan/foto privat.
