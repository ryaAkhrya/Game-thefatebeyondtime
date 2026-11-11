# Mournfang (B01) battle atlas V4 - Polish Sprint 2

Status: DRAFT / NEEDS_REVIEW. "Controlled pixelization of the approved concept, needs artist cleanup."

## Files
- `web/public/assets/battle/B01_BATTLE_V4.png` (1600x128, 10 frames of 160x128, one row, facing RIGHT, hard alpha, 27 colours)
- `web/public/assets/battle/B01_BATTLE_V4.json` (frame rects, shared pivot, durations, `event: attack`)
- `web/scripts/author-mournfang.py` - deterministic authoring script (Python 3 + Pillow + numpy + scipy; `python -I web/scripts/author-mournfang.py`; same bytes on every run)
- `web/scripts/mournfang-preview.py` - contrast metrics and composite preview (debug output goes to `.dev-cache/temp/mournfang/`)
- `web/tests/unit/mournfang.test.ts`
- Old `B01_BATTLE_ATLAS_DRAFT.*` untouched.

## Method (honest)
1. Source: `assets/bosses/B01_Mournfang/B01_NEW_CONCEPT_DRAFT.png`.
2. Segmentation: gradient-magnitude mask (the concept has a clean ink outline, the background is a smooth halo), close, fill small holes, largest component.
3. Layers: body (torso, leaves, legs; fur "filled in" behind the head so it can move), antlers (thickened 3 px before downscale), skull/jaw.
4. Body and antlers: area-average downscale (about 0.096 sprite px per concept px), mild contrast lift, nearest-colour snap (CIE Lab) to a fixed 27-colour palette, no dithering, small-island and 1-px noise cleanup.
5. Skull, jaw, eye socket, nostril, tongue, fangs: TRACED REDRAW (polygons traced by eye on the concept, shaded by rule: light top edge, shadow underside) plus explicit pixel fangs. The auto-pixelized skull was unreadable.
6. Outline: 1 px deep plum `#1d1625` on the silhouette and between layers (antler/skull over body).
7. Frames: layer recomposition only - whole-pixel offsets, per-row shear (fading to 0 at the feet), row deletion/insertion in the lower-leg band, palette ramp steps for flash/dark/eye. No rotation, no scaling, no blur, no glow. Feet rows (y >= 104) are never touched, so the bottom row is byte-identical in all frames.

## Frame status
| frame | how made |
|---|---|
| idle_a | traced redraw + pixelization (the only fully authored pose) |
| idle_b | limited animation: body +1 row, head +1/+1, antlers sheared 1 px |
| anticipation | limited animation: 6 leg rows deleted (crouch), head lowered, antlers sheared forward 6 px |
| attack | limited animation: lunge shear, head thrust +5/+6, antlers forward 5 px |
| followthrough | limited animation: deeper head/antler follow-through |
| recovery | limited animation: partial return |
| hit_recoil | limited animation: body/head pushed back, one palette step lighter (flash) |
| hit_recover | limited animation: partial return |
| death_start | limited animation: sag, amber eye one step dimmer |
| defeated | limited animation: 14 leg rows removed, head lowered, eye dead, palette one step darker |

## Known art flaws (need an artist)
- Only one real pose; all other frames are recompositions. The horn "sweep" is an antler row-shear (about 10 degrees), not a redrawn arc. The jaw never closes/opens differently from idle.
- Skull is flat shaded and small facial detail (cracks, brow ridges) is missing; fangs are rule-built 2 px runs.
- Antler thin branches were thickened; some twigs are 1-2 px and noisy. Leaf clusters are readable but muddy in the lower legs; tail leaves end in stair-stepped shear in lean poses.
- Fur "filled in" behind the head is a nearest-colour extension; visible in hit_recoil as a dark neck wedge.
- Mushroom caps are mostly lost at this resolution (orange/red leaf-like patches on the back).
- The monster is wide: idle bbox 142x99 px. A native 160x128 frame cannot give 1.7x Yaric's height (Yaric ~94 px in its 96 frame); see the wiring note in the report.

## Wiring
Origin/pivot is `[77,124]` (JSON `pivot`), identical for all frames; place the frame so that this point sits on the enemy foot anchor. Facing is RIGHT, do not flip. Display scale 1 is native; integer scale 2 reads as a big boss.
