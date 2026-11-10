# QA report — Production Bible v3.2

**Verdict:** a stronger C01/M01/ground-slam **gold pass candidate** and targeted narrative/UI corrections exist. **Not a final production-ready asset pack.** The remaining roster and VFX still need artistic animation work and Game Director acceptance.

| Physical/structural check | Observed | Result |
|---|---:|---|
| PNG strict decode | 248/248 | PASS |
| New required-alpha assets entirely opaque | 0 | PASS |
| Atlas JSON decode | 26/26 | PASS |
| New gold atlas frames, distinct pixel bytes | [('C01', 7, 7, 2, 'C01_ATLAS_PIXEL_PASS_V3_2.png'), ('C01', 16, 16, 2, 'C01_EXPLORATION_PIXEL_PASS_V3_2.png'), ('M01', 7, 7, 2, 'M01_ATLAS_PIXEL_PASS_V3_2.png'), ('C01_GROUND_SLAM', 8, 8, 2, 'C01_GROUND_SLAM_ATLAS_PIXEL_PASS_V3_2.png')] | PASS geometry/distinct poses |
| Dialogue IDs/portrait paths invalid | 0 of 287 | PASS |
| NEUTRAL acting choices | 185 → 139 of 287 | 67 selected line changes, DRAFT |
| v3.1 canon/docx/RULES hash drift | 0 | PASS |
| Music | 13 AWAITING_COMPOSER cues; 0 included OGG | PASS |
| GDD tables | 4 | PASS |

## Manual visual observations

- C01 exploration, C01 battle, M01 battle and C01 ground slam were inspected side-by-side at native 1× on light and nearest 4× on dark; comparison PNGs are in `docs/quality/`. C01 and M01 retain their reference identities and legible silhouettes. Ground slam reads as an ordered crack–rise–impact–settle sequence without conspicuous red halo in the new pixel atlas.
- Pixel atlas colors are shared within each sheet (≤48, ground slam ≤32), alpha is binary, frames are fixed-size. This reduces fringe and palette drift; it does not prove animation timing in Phaser.
- Two new battle atlases have multi-step idle and attack frames, but only **one hit and one defeated pose** each. This is partial battle animation; transitions/recovery need additional authored frames. The old geometric atlases remain as reference and are not superseded for the rest of the roster.
- UI now depicts seven screens and all nine Settings options. Reduced Flashes is ON. Text/focus are visually improved but require keyboard and display testing.
- Torvan's cheek bandage is present in the approved C03 source portrait. The 52 portrait variants and other inherited assets remain DRAFT; no bulk approval or replacement has occurred.
- The six no-line scenes have explicit private/silent/visual dispositions in `DIALOGUE_ACTING_V3_2.md`. Varlgrim's six spoken lines are unchanged; action and consequences carry his conflict pending editorial review. No private details are invented.

## Work remaining before PRODUCTION_READY

1. Art-director sign-off for C01/M01 style, likeness and 1× playback; resolve any overlap/cut seams.
2. In-between and transition frames for hit/defeated, engine playback/pivot/hitbox validation.
3. Apply the accepted pixel language to C02–C09, M02–M06, B01–B03 and shared B04/C04. C05–C09 remain noncombat.
4. Sprite animation passes for all other VFX, including Velthia's hand magic, forest summon, Ultimate shield and Varlgrim meteor; test meteor/shield checkpoint anti-softlock.
5. Implement UI, test every Settings control and reduced-effects behavior.
6. Human line acting pass over the remaining DRAFT dialogue.

No file is labeled PRODUCTION_READY. See `VISUAL_QC_V3_2.md`, `ASSET_INDEX.md`, `DELTA_V3_1_TO_V3_2.md` for evidence and limits.
