# Asset manifest v3.1

**Runtime Phase 4:** B01 Mournfang memakai PNG/JSON `B01_BATTLE_ATLAS_DRAFT` yang disalin utuh ke `web/public/assets/battle/`. Hanya empat pose authored pada grid 96×96; playback menahan/menggunakan ulang pose, bukan animasi lengkap baru. Source JSON DRAFT, status review registry NEEDS_REVIEW. Concept art hanya referensi; tidak diperkecil menjadi texture runtime. Seluruh source tetap utuh. Lihat `docs/production/PHASE4_REPORT.md` untuk backlog visual.

**Runtime update Phase 2 (10 November 2026):** tiga atlas battle v3.3 C01/M01/Ground Slam beserta JSON disalin utuh ke `web/public/assets/battle/` dan dimuat lewat AssetRegistry. NEEDS_REVIEW; sumber tidak dimodifikasi. Status terkini di ASSET_INDEX.md dan docs/production/PHASE2_REPORT.md.

Roster: C01–C09, M01–M06, B01–B03. B04 uses the C04 Varlgrim identity and wooden staff, for 18 unique entities.

New individual image files and strict per-file tests are recorded in `ASSET_INDEX.md` and `ASSET_FILES.json`. Portrait redraws, separate expressions, turnarounds, standalone weapons, concept VFX and illustrations are DRAFT. Grid-authored exploration/battle atlases and JSON frames exist, but their native-size animation quality remains NEEDS_REVIEW. C05–C09 are noncombat. C02 has hand-cast spells, no physical weapon.

The four original sheets and v3 crops are preserved under `assets/source_references/`, status REFERENCE. No source crop is represented as final art. Music has not been generated and remains AWAITING_COMPOSER. Private modern media are not supplied.
