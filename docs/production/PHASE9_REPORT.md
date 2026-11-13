# PHASE 9 REPORT — Modern Interlude · Epilog · Memories · Credits

13 November 2026. Desktop browser, existing Phaser 4.2.1 / strict TypeScript / Vite project. At the QA handoff, no commit, push, release, deployment or personal-data upload had occurred. A subsequent explicit Game Director request authorizes committing and pushing this Phase 9 handoff; release, deployment and private-data uploads remain outside scope.

## A. Status

**FUNCTIONAL PASS — PERSONAL CONTENT & HUMAN REVIEW PENDING.** Public ending and the modular private-content foundation are implemented and tested. The final source passes strict TypeScript, 1,574 unit tests, public build/privacy checks, and the complete ending in Edge and Chrome at both resolutions. Real personal content and human art/narrative/audio review remain pending. This is not final-release approval.

## B. Modern Interlude

Existing Chapter IV completion card and completed-world Pause menu offer **Lanjutkan kisah**. Continue/loading an older completed Chapter IV save enters modern directly. The era card explicitly says **Berabad-abad kemudian**. A bounded unnamed pedestrian space, two anonymous silhouettes and a familiar engraved relic supply a short keyboard approach/inspection. Archive, heirloom and opened-Heart fragments awaken memories gradually; six concise modern dialogue lines are marked `DRAFT_IMPL`. No real venue, habits, name of partner, relationship date or personal experience was invented. No physical time travel, portal, digital glitch or repeated Torvan twist.

## C. Epilogue

The explicit Aveloria memory card follows the modern resolution. Velthia is seated, Yaric arrives via the path and sits. All 12 E-01/E-02 working-script lines are preserved verbatim from `DIALOGUE_EVENTS.json`, including the getting-lost promise. Their plot follows approved Revisi 02; the spoken script itself remains editorial DRAFT, as the source documents say. Sparse cloud/path/Heart/modern-silhouette compositions are for the audience, then exact **To Be Continued**. A broken tower remains in the skyline. Original back-facing C01/C02 pixels are reused in DRAFT seated derivatives.

## D. Personal memories

`memorySchema.ts`: unique ID, caption, optional date, local image reference, display duration, transition, optional note/group; strict runtime/build validation. Cinematic data is separate from the renderer. Whole portrait/landscape images are contained without cropping/stretching, loaded one at a time, and never modified generatively. A subtle optional pan stays inside generous margins. The reading clock starts after image load; failed images can fall back to their supplied caption without a softlock.

Public content module = `null`. Input = ignored `/private/anniversary/`; private output = ignored `/private-build/anniversary/`. Only `build:private -- --confirm-private-local` can create that local artifact after valid user-authored data exists. No real private build was made. Template and integration guide are provided; no fake private message or human photograph.

## E. Credits and anniversary hook

Three editable credit pages identify only known contributions (Yudis, AI-assisted development with Claude Code/OpenAI Codex, actual tools/fonts). Installed font licenses are distributed in `public/legal/fonts.txt`. Enter advances, Esc safely skips after the short initial hold. Only the private profile renders user-authored P.S. paragraphs/signature after credits. Public skips that beat entirely. Maximum-length private text was rendered with synthetic QA strings, not invented relationship text.

## F. Save/load and completion

Envelope remains `save_v2`, data schema 2, original storage keys. Optional validated `ending: {step,memoryIndex}` has exact prerequisites and cannot regress through the checkpoint helper. Flags preserve IV completion, artefact, awakening, modern resolution, cliff/promise/epilogue, title, credits and `game.complete`. Saves never contain captions/photos/dates/partner identity/message. Refresh resumes a safe beat start; unfinished dialogue/credits/message subpages restart within that beat. Old Chapter I–IV slots remain compatible; no reward/item duplication or Chapter IV restart. Completed Continue shows completion; Title supplies explicit replay that does not mutate saves, flags, rewards or playtime. No New Game+.

## G. Audio

No BGM made, selected, downloaded or added; `BGM_MODERN`, `BGM_EPILOGUE`, `BGM_CREDITS` remain AWAITING_COMPOSER with silent fallback. Composer briefs cover all requested moments. One existing original `SFX_ECHO_MEMORY` is reused quietly (0.28 multiplier, rate 0.8), respecting Master/SFX/mute. No new SFX files. Ending dialogue advances silently. Human listening review remains pending.

## H. Visual QA and screenshots

Real browser screenshots cover modern opening, relic interaction, archive/Heart fragments, cliff, silhouettes, title card and credits. Synthetic colored portrait/landscape frames and maximum-length text test the private renderer without personal data. Art is code-native DRAFT, 640×360 with integer scale and existing UI typography. The source uses hard scanline pixel fills rather than antialiased polygons. Human artistic/emotional judgment is not established by these checks.

Final production screenshots: `.dev-cache/phase9-resize-final-edge/p9_*.png` and `.dev-cache/phase9-resize-final-chrome/p9_*.png` (26 actual captures per browser at 1366x768 and 1920x1080). Reviewed opening, cliff/dialogue and cloud-silhouette captures directly, plus the latest maximum-length synthetic message frame. The frames show a muted unnamed promenade, the preserved story dialogue over the shared cliff view, the damaged distant tower and restrained cloud symbols. These remain DRAFT artwork. Development evidence also exists under `.dev-cache/phase9-dev-final/` and `.dev-cache/phase9-dev-extended/`.

## I. Privacy QA

Path + SHA-256 public allowlist, public/private import and output isolation, local manifest/image validation, Git ignores and root/web Vercel upload exclusions are implemented. Actual output tests and canary scans are specified in `ENDING_PRIVACY_QA.md`; final run results follow in section J. A private browser artifact is readable by anyone receiving it; no password/hidden URL/frontend variable is presented as protection. No external upload or deployment occurred.

## J. Tests and baseline

Initial working tree was **clean**, current baseline commit **cc7f33d** (Phase 8 already committed). No user's uncommitted work was overwritten. Approved R02 DOCX was read directly, relevant story/character/production/system/asset/audio documents and source services were reviewed. Baseline strict typing, **61 files / 1,531 unit tests**, and the original production build passed before implementation. The first sandbox attempt hit Windows `spawn EPERM`; authorized process execution resolved it without changing dependencies/global settings.

<!-- FINAL_RESULTS_START -->
| Check | Actual result | Evidence under `.dev-cache/logs/` |
|---|---|---|
| Original Phase 8 baseline | strict TS/build; 1,531 unit tests; Edge regression 906/906 plus Phase 8 168/168 | `phase9-baseline-verify.log`, `phase9-baseline-e2e.log` |
| Additional original-baseline browsers | full Phase 8 Edge 1920: 119/119; Chrome 1366: 119/119 | `phase9-baseline-p8-edge1920.log`, `phase9-baseline-p8-chrome.log` |
| Final unit tests | **63 files / 1,574 passed**, including 43 new ending/privacy checks | `phase9-unit-resize-final.log` |
| Final strict TS + public build | PASS; game chunk `index-DEBJX_QG.js` | `phase9-build-resize-final.log` |
| Public artifact audit | **324 actual files inspected; PASS** | `phase9-build-resize-final.log` |
| Real Vite privacy canaries | **8/8 PASS**, no private output created | `phase9-privacy-resize-final.log`, `phase9-privacy-results.json` |
| Post-change Edge smoke / Phase 2 / Phase 3 / Phase 4 | **84/84, 37/37, 54/54, 38/38** | `phase9-regression-a.log` |
| Post-change Edge Phase 6 / Polish Sprint 1 | **55/55, 105/105** | `phase9-regression-b.log` |
| Post-change Edge Phase 8 | **168/168** | `phase9-regression-c.log` |
| Serial Edge Phase 5 / Phase 7 | **75/75, 184/184** | `phase9-sequential-final.log` |
| Final Edge Phase 1 | **197/197**, corrected keyboard/collision fixtures | `phase9-fixtures-final.log` |
| Final Edge Sprint 2 | **77/77**, including both-direction input measurement | `phase9-fixtures-final.log` |
| Production ending Edge before final resize fix | **89/89**, both resolutions; no JS/asset errors | `phase9-sequential-final.log`; `.dev-cache/phase9-final-edge/phase9-results.json` |
| Production ending Chrome before final resize fix | **89/89**, both resolutions; no JS/asset errors | `phase9-chrome-final.log` |
| Final production ending Edge | **91/91**, both resolutions including real mid-fade resize; no JS/asset errors | `phase9-edge-resize-final.log` |
| Final production ending Chrome | **91/91**, both resolutions including real mid-fade resize; no JS/asset errors | `phase9-chrome-resize-final.log` |
| Final active dev preview | **9/9**, fullscreen/display/cleanup and existing slot preserved | `phase9-preview-resize-final.log` |
| Final independent artifact recheck | **324 files; PASS** | `phase9-artifact-audit-final.log` |

Focused production resize verification and full ending regressions in both browsers have passed. A real production reproduction established a softlock when a browser resize interrupted the 450 ms fade: the shared relayout handler killed the tween while `changing` remained true, the scene stayed on `era`, and the saved beat stayed `era`. Evidence: `phase9-resize-before.log`. The fix keeps the destination independently of the tween and commits it exactly once at the relayout boundary; normal entry resets the hold/reveal clock. Phase 9 E2E now resizes during that fade at both resolutions and checks recovery plus texture cleanup. After the fix, the same production reproduction reaches `walk`, clears `changing`, saves `walk`, and retains one generated texture (`phase9-resize-after-fixed-observer.log`). The first post-fix observation script registered its listener after game handlers; it incorrectly reported failure even though its own state/save already showed `walk`. That evidence remains in `phase9-resize-after.log`. The observer now installs before application startup on both window and visualViewport, so it verifies that the resize actually interrupted a fade. The final 91/91 runs above supersede the earlier 89-check ending runs; repeated checks are not added together as unique coverage.

The post-change legacy suites above cover 906 checks across ten suites, plus 168 Phase 8 checks, in separate recorded runs. The final EndingScene resize fix is covered by both complete 91-check ending runs. Development evidence is additional, not summed into production coverage: full ending 67/67 at both resolutions; extended 1366 actual C4-07 route plus synthetic private layout 42/42; direct preview/fullscreen/cleanup 9/9. Installed browsers: Edge 157.0.4341.57 and Chrome 157.0.8103.51. Production browser scenarios use the actual served `web/dist/` artifact and isolated browser storage.

Failed attempts are retained. Concurrent browsers caused movement/interaction timing failures and a screenshot timeout in `phase9-regression-{a,b,c}.log` and `phase9-regression-phase1-rerun.log`; a serial run reproduced three fixture issues: a collision route first hit a tree, a long driver-facing tap entered the object, and sequential keydowns were measured before both keys were held. Phase 1 now routes through the clear corridor, bounds the facing tap to browser frames using DOM keyboard events through the real InputManager, and normalizes the unchanged 15-35 px speed limit to the measured keyboard-held interval. Sprint 2 measures only after both direction keys are active, preserving its single-axis assertion. No game collision/speed/input behavior was weakened for these tests. Corrected-fixture reruns passed Phase 1 197/197 and Sprint 2 77/77.

The new Phase 9 fixture originally used a fixed-duration walk that occasionally stopped before the relic. It now waits for the observed approach coordinate, with a deadline and key release in `finally`; the interaction distance requirement is unchanged. Original failed production attempts remain in `phase9-production-{edge,chrome}-movement-fixture.log`.

Under heavy host CPU contention, full unit runs hit the existing five-second default in four pixel/generator/batch audits. Those tests now use explicit 30-second budgets (VFX double-generation: 60 seconds, matching other atlas audits), and Vitest uses two workers. Pixel comparisons, hashes, simulation iterations and all assertions are unchanged. Failed logs remain `phase9-unit-loaded-timeouts.log` and `phase9-unit-cpu-budget-timeouts.log`. Full 1,574-test runs then passed; the final post-resize-fix run completed in 52.66 seconds. An early output-override privacy test is also retained: the first implementation safely kept output public but silently ignored the CLI override; it now explicitly rejects overrides and passes the actual canary check (`phase9-privacy-first-override.log`).
<!-- FINAL_RESULTS_END -->

No screenshot, browser pass count, performance or human review result is fabricated. Browser fixtures use isolated storage. Existing Phase 8 fixture/teleport risks are assessed from actual runs, not assumed away.

## K. Performance

One reusable 640×360 generated cinematic texture, updated at 20 Hz; one private photograph resident at a time, no particle emitters. Direct preview cleanup checks confirm zero generated ending textures/private photos and one Title input layer after repeated exits. Final production Edge rAF samples (90 frames each): modern 1366 mean/max 16.551/17.0 ms, cloud silhouettes 1366 16.529/16.9 ms; modern 1920 16.522/16.8 ms, silhouettes 1920 16.579/17.0 ms. These are scheduling measurements, **not hardware FPS or a GPU benchmark**. Raw values are in `phase9-resize-final-edge/phase9-results.json`; matching Chrome samples are in `phase9-resize-final-chrome/phase9-results.json` (mean range 16.542-16.596 ms, maximum 17.1 ms). Real-device GPU, very large supplied photographs and long real-message pacing are unmeasured.

## L. Changes

- New `web/src/game/ending/`: checkpoint/flags validation, reusable sequencer/containment, schema, data/provenance/credits, original pixel renderer, photo/message frame renderer, source E-01/E-02 lines, private virtual module declaration.
- New `scenes/EndingScene.ts`; integration in Title, SliceEnd, Pause, SaveLoad, World, GameState, SaveCoordinator, scene IDs/config, UI labels, opt-in silent/back callback in DialogueBox, QA diagnostics.
- Build privacy plugin/wrapper/audit/canary scripts, static allowlist, template, font licenses, `.gitignore`, root/web upload exclusions, Vite/TS/package scripts.
- Unit ending/privacy tests, Phase 9 production E2E, direct-preview/fullscreen/cleanup E2E, runner registration.
- Required implementation/spec/private-guide/privacy/report documents plus save extension; CLAUDE, README, PHASES, TASKS, QA, asset manifests, GAME_SYSTEMS, TECHNICAL_DESIGN and composer/SFX handoff updated.

Original assets and approved story files were preserved; no engine replacement/dependency installation. Caches/logs/screenshots stay on D: under `.dev-cache/`.

## M. Known limitations

1. Human review required: modern staging, geometric landscape, seated anatomy, cloud silhouettes, working dialogue, emotional rhythm and SFX listening. No claim of final art or perfect emotional effect.
2. Actual photos/permissions, real captions/dates/order, optional approved partner likeness/name and user's own first-anniversary message are absent.
3. No real private end-to-end artifact was built; real JPEG/WebP decode, metadata/EXIF, GPU limits and actual-message pacing require local review after content arrives. QA uses synthetic pixels/text only.
4. Images preserve source bytes (including embedded metadata); file size is bounded, but supplied image dimensions/device memory require review. Guide recommends reviewed copies up to 4096 px per side.
5. Unfinished dialogue and credits/message subpages resume at their committed beat start. This is deliberate, documented behavior; the exact half-typed page is not a save checkpoint.
6. BGM remains absent by policy. Headless automation is not a human playtest or real-device performance assessment.

## N. Active preview

**http://127.0.0.1:5173/** — existing game dev server.

**http://127.0.0.1:5173/?qa=1&preview=ending** — direct public ending review, development-only, non-saving replay. It was actually exercised in installed Edge, including fullscreen/display changes and unchanged pre-existing slot bytes. No private content is used.

## O. Readiness

Automated functional scope has passed and is ready for Game Director review and later real-content integration. Final polish, human narrative/visual/audio review, real private content review and release QA remain separate work. The subsequent explicit Game Director request authorizes commit/push of this handoff. Final release, deployment and private-data upload remain unauthorized and were not performed.
