# Phase 10 fictional art sources

Generated using built-in imagegen from the existing fictional character/concept references. Exact prompts: [IMAGEGEN_PROMPTS.md](../../docs/production/phase10/IMAGEGEN_PROMPTS.md). File hashes and reference paths: [PROVENANCE.json](PROVENANCE.json). Human art approval is pending.

Selected sources are `sources/C02..C09_turnaround.png`, `C03/M02/M03/B02_battle.png`, `epilogue_seated.png`, `modern.png`, `cliff.png` and `memories.png` (three vertically stacked panels). Files ending `_v1` are rejected first iterations; `_pre_revision` preserves the overly textured world/seated sources replaced following user feedback on 2026-11-14. The selected exploration and seated poses now use broader pixel clusters with Yaric as the style benchmark. Revision prompts: [IMAGEGEN_REVISION_PROMPTS.md](../../docs/production/phase10/IMAGEGEN_REVISION_PROMPTS.md). `references/` holds immutable before sprites from baseline commit 3a754a8.

Preparation: `npm --prefix web run assets:phase10`; dependencies are existing Pillow/NumPy. Sources stay outside Vite public. The importer creates native PNG/JSON plus comparison/contact sheets. Original concepts and earlier raw/normalized runtime copies remain preserved. No real photographs, private identity or BGM are part of this package.

Runtime locations: `web/public/assets/characters/final/`, four `battle/*_BATTLE_V2` pairs, `chapter2/B02_encounter.png`, and `ending/`. Manual public approval is limited to explicit known paths in `web/scripts/phase10/approve_assets.mjs`; unknown public files continue to be rejected. Never approve an entire directory.

The existing code-native `town_crisis_atlas` and `town_c4_atlas` also refine anonymous residents and seated camp groups. Their source is `web/scripts/town-art/crisis-citizens.mjs` and `c4-camp.mjs`; these are not imagegen renders. Preparation applies both generators after the selected imagegen sources. `audit_town.py` verifies unchanged geometry/pivots and all 80 non-target prop frames, and produces the comparison sheets. Baseline atlas PNG/JSON files are preserved in `references/`.
