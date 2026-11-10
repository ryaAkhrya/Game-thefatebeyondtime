# Visual QA and human review checklist v3.2

Inspected transparent new pixel atlases at native 1× on a light background and nearest-neighbor 4× on Deep Plum; see four `docs/quality/V32_*_1X_4X.png` comparison images and the PNG preview strips. These observations are an editorial visual review, not an in-engine acceptance test.

| Asset | 1× silhouette/identity | Motion/frames | Edge on light/dark | Human review still needed |
|---|---|---|---|---|
| C01 exploration | Hair, red torn cloak, cream tunic and boots read; four directions distinguishable | 16 distinct cells; arm/leg changes visible, cloak follows | binary alpha, no obvious halo in light/dark composite | gait timing, side-to-front turn, body proportion |
| C01 battle | recognizably Yaric; greatsword remains very large | idle A/B and anticipation/attack/impact distinct; hit/defeated one pose each | removed tiny disconnected source-cell scraps; binary alpha | edge cleanup at swing, all transition in-betweens, weapon scale and hitboxes |
| M01 battle | ragged dark floating wisp, teeth/eye/claws read; horror silhouette preserved | 7 distinct poses; attack extends claws; death dissolves | binary alpha; fading fragments intentional | native battle readability, lunge/hit recovery and telegraph clarity |
| C01 ground slam | ground crack to raised slab to settle reads | 8 different stages; fixed ground-center anchor, damage at frame 4 | 31-color shared palette and binary alpha; no bright red fringe at 1× composite | screen shake setting, damage timing, collision and reduced effects in engine |
| Old roster | existing 52 portraits/new turnarounds retained as drafts | old battle atlas still four key poses; other VFX still concepts | physical decode/alpha only from v3.1 | all remaining roster sprite art, animation, VFX, edge and face consistency |
| UI | broken paired arc and selected lime focus state | static mockups only | UI screens intentionally opaque | keyboard tests, readable text on target display, localization and persistence |

**Identity check:** Torvan's cheek bandage is visible in the approved C03 portrait on the main sheet; it is not new AI drift. Yaric hair/face and deep red cloak, Velthia proportions and bare-hand casting, Varlgrim heavy wooden staff, and noncombat C05–C09 remain locked by approved references. This review does not grant artist sign-off for all faces or new sprites.

**Acceptance checklist still open:** art director approval on light/dark/1×; animation playback against battle timing; metadata pivot and hitbox in Phaser; anti-softlock meteor/shield encounter; UI Settings persistence and actual keyboard focus; review of 287 line acting choices in context; private modern inputs supplied only by Game Director.
