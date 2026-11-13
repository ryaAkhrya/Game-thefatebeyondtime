# PHASE 10 — Reference-led visual polish

**Latest user revision, 14 November 2026:** Yudis–Saffa, expanded conversational dialogue, cleaner cast/seated sprites using Yaric as the benchmark, bottom-left closing text, and automatic chapter/cinematic handoffs. [Revision report and current QA](phase10/REVISION_REPORT.md) supersede the earlier pass below wherever dialogue, chapter cards, source selection or test counts differ.

13–14 November 2026. **VISUAL IMPLEMENTATION & AUTOMATED QA PASS — HUMAN REVIEW PENDING.** Human art, animation and emotional pacing review remains open; final release review belongs to Phase 11.

Baseline: `3a754a89a9e53eb0bf52e6d5cb7fae06a0c6ebf7` (Phase 9, clean working tree). Baseline strict TypeScript, 63 unit files / 1,574 tests, public build and 324-file privacy audit passed before edits (`.dev-cache/logs/phase10-baseline-verify.log`).

## What changed

Eight exploration actors C02–C09 now derive from their existing fictional front/back concept art, including Velthia's short chestnut hair, plum-and-cream gown, exposed shoulders and gold mantle; individual Azie, Talric, Torvan, Varlgrim, Zira, Nambo and Derrria identities replace rough fallback bodies. Every actor has four separately authored directions and 24 native 32×48 frames, hard alpha, shared 32-color palette and feet fixed at y=46. Integer-pixel walk/idle derivatives are generated from the new direction art; these are not 24 individually hand-drawn animation poses. Yaric's previously authored exploration sprite remains active.

Four remaining primitive battle sheets (Torvan, Briaroot, Wisplet, Veyrath) now use twelve drawn poses each, shared native scale, hard alpha, 48-color palettes and stable floor pivots. Party and enemy facing is preserved. The playback adapter accepts both full metadata and the legacy four-pose source format. Existing detailed Yaric, Velthia, Varlgrim and other battle assets remain active. Review sheets show idle, anticipation, contact, follow-through, recovery, hit, defeat and charge/cast.

Wisplet's air gap is placed inside the active frames: 12 pixels while alive, six during its fall, zero for the collapsed rings. This preserves its hovering appearance and lets defeat land on the floor instead of holding the corpse in the air. The native-pixel test checks these actual bottom rows.

The modern promenade, three memory vignettes (archive, mantle heirloom, opened Heart) and cliff epilogue use new fictional 640×360 pixel backgrounds (96 colors), preserving the ruined distant tower, open relic approach and the story sequence. Yaric and Velthia have separately authored seated anatomy with fixed seat anchors and restrained motion. Yaric's approach faces left and reads the actual atlas walk sequence/FPS. Modern people remain anonymous. The cloud sequence uses rounded pixel silhouettes. Existing detailed world maps, collision and gameplay systems continue to operate with the new cast sprites.

Six unnamed working residents in Aveloria/Liora now have native-pixel hair, face, clothing folds, hands, boots and task-specific tools instead of a few rectangles. Their existing tasks, collision and positions are retained. Veyrath's map appearance has a dedicated 64×64 native image, with a 56-pixel body, rather than shrinking the much larger battle texture at runtime.

Actual aftermath screenshots exposed additional box-shaped camp residents. The existing code-native town generators now refine 162 crisis citizen frames and three seated camp groups. `audit_town.py` compares the baseline atlas pixels: **80 prop frames remain byte-identical at the pixel level, and both complete atlas JSON layouts/pivots remain identical**. Standing/working identities, evacuation paths, palettes and camp content are preserved. Before/after sheets are `phase10/citizens_comparison.png` and `phase10/camp_comparison.png`.

The modern relic now has chipped stone, a bevelled base, grouped surface wear and an inset bronze engraving instead of the flat block. Memory vignettes use their authored glyphs; the former generic floating overlay is used only with fallback art.

The first visual pass preserved dialogue; the subsequent user-requested revision updates dialogue wording, expands modern/epilogue conversations, and names the modern partner Saffa. Approved plot events, save schema, rewards and private photographs remain intact. No BGM was made, selected, downloaded or activated; all cues remain AWAITING_COMPOSER. No deployment or private artifact was made.

The existing three-page credits now acknowledge OpenAI imagegen for the actual visual contribution. No composer or unreleased music credit was invented.

## Art evidence and reproducibility

- Selected generated sources and rejected first iterations: `assets/phase10/sources/`.
- Immutable Phase 9 cast comparisons: `assets/phase10/references/`.
- Before/after exploration sheets: `docs/production/phase10/cast/`.
- Native battle pose sheets: `docs/production/phase10/battle/`.
- Dedicated seated contact: `docs/production/phase10/seated_contact.png`.
- Exact built-in imagegen prompts: [IMAGEGEN_PROMPTS.md](phase10/IMAGEGEN_PROMPTS.md).
- Composer instructions for the Game Director: [BGM_BRIEF_UNTUK_KAMU.md](phase10/BGM_BRIEF_UNTUK_KAMU.md).

Source art was generated using built-in imagegen with the original fictional designs as image references. Pillow/NumPy only prepare the native grid, alpha, palette, pivots and deterministic animation. Original character and monster concepts were preserved. Seated v1 was replaced because it read too much like standing; Briaroot v1 was replaced because two poses crossed their grid boundaries. Their sources and exact prompts remain recorded.

After `. .\web\scripts\dev-env.ps1`, use `npm --prefix web run assets:phase10` to reproduce native assets from the selected sources. The standard `assets:sprites` command applies Phase 10 last. Preparation does not grant public asset approval; `node web/scripts/phase10/approve_assets.mjs` pins only the explicit reviewed fictional-art paths. Unknown files still fail the existing public privacy gate. Do not run legacy sprite authors alone as the final production preparation step.

## Verification

Automated native-size, palette, alpha, provenance, frame diversity and legacy playback checks are added in `web/tests/unit/phase10-art.test.ts`. Browser evidence must be read with the Phase 10 run paths, not previous Phase 9 captures.

| Check | Actual result | Evidence under `.dev-cache/logs/` |
|---|---|---|
| Phase 9 baseline | Strict TS/build; 63 unit files / 1,574 tests; 324-file public audit PASS | `phase10-baseline-verify.log` |
| New art-focused tests | 13/13 PASS | `phase10-art-tests.log` |
| Complete post-change units | **64 files / 1,587 PASS**, one worker | `phase10-unit-final.log` |
| Latest focused units after pose, camp, relic and credit refinements | **9 files / 221 PASS** | `phase10-focused-final.log` |
| Reproducible final asset preparation | **36 runtime files byte-identical across two complete preparations** | `phase10-preparation.log`, `phase10-preparation-results.json` |
| Source-sheet clipping | **18 source renders catalogued; all selected battle sheets have zero opaque cell-edge crossings** | `phase10-preparation.log`, `assets/phase10/PROVENANCE.json` |
| Town preservation | **165 citizen/group frames refined, 80 prop frames unchanged; both atlas geometries/pivots unchanged** | `phase10-town-preservation.json` |
| Final strict TS/public build | PASS; **340 artifact files**, game chunk `index-C_wPRbHd.js` | `phase10-build-final.log` |
| Global Edge regressions before final pixel refinements | **1,165/1,165 PASS**: 906 legacy/sprint + 168 Phase 8 + 91 Phase 9 | `phase10-regression-edge.log` |
| Final Edge art/world checks | **42/42 PASS** at 1366×768 and 1920×1080 | `phase10-art-final-edge.log` |
| Final real-build privacy canaries | **8/8 PASS**, no private build created | `phase10-privacy-final.log`, `phase10-privacy-results.json` |
| Final Edge ending | **91/91 PASS**, 1366×768 and 1920×1080; no fatal JS or missing assets | `phase10-ending-final-edge.log` |
| Final Chrome ending | **91/91 PASS**, 1366×768 and 1920×1080; no fatal JS or missing assets | `phase10-ending-final-chrome.log` |
| Active dev preview | **9/9 PASS**, fullscreen/display/cleanup and existing save slot preserved | `phase10-preview-final.log` |
| Independent final public artifact audit | **340 files; PASS** | `phase10-artifact-final.log` |

The first full default-worker unit run reported nine obsolete assertions (historical normalized status equalled the current manifest; C04 final expected the old nine-column layout) and the unchanged SFX determinism test exceeded its existing 60-second limit. Tests now distinguish the untouched source/normalized copies from the six-column redraw; C04 animation indexes are bounded to the actual 24 frames. The complete rerun with one worker passes all 1,587 tests, including SFX, without changing SFX code or its timeout. The earlier results remain in `phase10-verify.log`.

Initial visual QA exposed a fixture problem: asking the Title QA launcher to switch from an active battle left that battle over the intended world capture. The Phase 10 fixture now reloads to Title between independent encounters and asserts the visible Veyrath map scene before capturing it. This is a QA-fixture correction; normal game scene routing was not changed. Final world evidence uses the corrected run.

The first added Wisplet fixture launched a Chapter II patrol using a Chapter III party and timed out waiting for its menu. The Chapter II QA launcher now explicitly accepts `forest2_patrol`; the final 42-check run uses the correct Yaric–Torvan party and passes. Production battle rules were not changed. The failed fixture remains in the global regression log; it is not counted as a passed Phase 10 suite.

## Final visual evidence

Actual final Edge captures are retained in the repository for review:

- [Velthia in Aveloria](phase10/review/velthia_world_1366.png)
- [Torvan and Briaroot battle](phase10/review/battle_duo_1366.png)
- [Wisplet and Briaroot battle](phase10/review/battle_wisplet_1366.png)
- [Aftermath camp and supporting residents](phase10/review/camp_1366.png)
- [Modern promenade and detailed relic](phase10/review/modern_1366.png)
- [Seated cliff epilogue](phase10/review/cliff_1366.png)

Full final captures and raw results for both resolutions remain in `.dev-cache/phase10-final-edge/` and `.dev-cache/phase10-final-chrome/`; local-preview evidence is in `.dev-cache/phase10-final-preview/`. Directly inspected all eight cast comparison sheets, new battle pose sheets, the NPC/camp comparisons, and actual final world/battle/modern/archive/cliff renders. The final archive render no longer has a floating duplicate glyph. These observations are model visual review, not human approval.

Original fictional concept files, approved story source, music registry and audio files remain unchanged. Working dialogue now follows the user-requested revision documented above. No deployment or real private build occurred. Preview remains available at **http://127.0.0.1:5173/**; direct non-saving ending review is **http://127.0.0.1:5173/?qa=1&preview=ending** (dev only).

## Remaining human work

Review character likeness to the supplied fictional concepts, walk cycles and seated interaction in game at both resolutions. Review the battle motion and emotional ending cadence. Compose the BGM using the linked brief. Real private memories/message still require user-authored inputs through the existing private integration. Phase 11 final QA/release preparation follows these decisions; this report does not claim human acceptance or final release.
