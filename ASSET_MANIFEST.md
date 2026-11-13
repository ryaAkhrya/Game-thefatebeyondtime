## Phase 10 runtime override

Manifest aktif mengarahkan eksplorasi C02–C09 ke redraw `characters/final/`, dan battle C03/M02/M03/B02 ke atlas penuh `*_BATTLE_V2`. `publicPath`/ukuran source historis tetap mencatat empat pose lama; `finalPath`/`finalFrameSize` mencatat runtime baru. Endpoint preload ending: `web/src/game/ending/artAssets.ts`. Semua aset baru NEEDS_REVIEW. Provenance dan ukuran rinci: `assets/phase10/PROVENANCE.json` dan [PHASE10_REPORT](docs/production/PHASE10_REPORT.md).

# Asset manifest v3.1

## Phase 9 addendum — 13 November 2026

Modern, relic/fragments, cliff, clouds and silhouettes are runtime code-native DRAFT assets in `web/src/game/ending/EndingArt.ts`; seated C01/C02 are derivatives of existing exploration art. Originals are preserved; human review remains required. Font licenses are in `web/public/legal/fonts.txt`. `web/public-assets.allowlist.json` guards public static paths and SHA-256. No real private photos, identity, dates or message exist in tracked runtime content. Local inputs/output are outside Vite public; see `docs/production/PRIVATE_MEMORIES_INTEGRATION_GUIDE.md`. No new BGM or SFX files.

**Runtime Phase 6:** enam atlas DRAFT C03 eksplorasi/battle, C07 eksplorasi, M02/M03/B02 battle disalin byte-identical beserta JSON, ditambah 13 portrait turunan dari PNG individual existing. Manifest import aktual `web/public/assets/chapter2.generated.json`; lingkungan Liora/Hutan 2 code-native DRAFT. Adapter empat pose bukan animasi final. Source tidak diubah, tidak ada BGM/SFX baru; lihat `ASSET_INDEX.md` dan `docs/production/PHASE6_REPORT.md`.

**Runtime Phase 5:** registry kini mengimpor juga C02/C05/C06/C09 exploration DRAFT asli (empat arah × enam frame, 32×48, pivot 16/46), byte-identical PNG/JSON. Portrait individual turunan dan metadata import ada di `web/public/assets/aveloria.generated.json`. Environment/warga kota digambar kode sebagai DRAFT terpisah dari collision. Bukan desain final/redraw, tidak ada battle kit NPC atau party join. Lihat `ASSET_INDEX.md` dan `docs/production/PHASE5_REPORT.md`.

**Runtime Phase 4:** B01 Mournfang memakai PNG/JSON `B01_BATTLE_ATLAS_DRAFT` yang disalin utuh ke `web/public/assets/battle/`. Hanya empat pose authored pada grid 96×96; playback menahan/menggunakan ulang pose, bukan animasi lengkap baru. Source JSON DRAFT, status review registry NEEDS_REVIEW. Concept art hanya referensi; tidak diperkecil menjadi texture runtime. Seluruh source tetap utuh. Lihat `docs/production/PHASE4_REPORT.md` untuk backlog visual.

**Runtime update Phase 2 (10 November 2026):** tiga atlas battle v3.3 C01/M01/Ground Slam beserta JSON disalin utuh ke `web/public/assets/battle/` dan dimuat lewat AssetRegistry. NEEDS_REVIEW; sumber tidak dimodifikasi. Status terkini di ASSET_INDEX.md dan docs/production/PHASE2_REPORT.md.

Roster: C01–C09, M01–M06, B01–B03. B04 uses the C04 Varlgrim identity and wooden staff, for 18 unique entities.

New individual image files and strict per-file tests are recorded in `ASSET_INDEX.md` and `ASSET_FILES.json`. Portrait redraws, separate expressions, turnarounds, standalone weapons, concept VFX and illustrations are DRAFT. Grid-authored exploration/battle atlases and JSON frames exist, but their native-size animation quality remains NEEDS_REVIEW. C05–C09 are noncombat. C02 has hand-cast spells, no physical weapon.

The four original sheets and v3 crops are preserved under `assets/source_references/`, status REFERENCE. No source crop is represented as final art. Music has not been generated and remains AWAITING_COMPOSER. Private modern media are not supplied.
