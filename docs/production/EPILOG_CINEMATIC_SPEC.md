# Phase 9 — Epilog cinematic specification

13 November 2026. Plot follows approved Revisi 02. `E-01` and `E-02` text is copied verbatim from the existing `DIALOGUE_EVENTS.json` into `ending/epilogue.lines.json` (12 lines). That JSON is an editorial working script, not newly approved dialogue. Human review remains required.

## Order and framing

| Beat | Composition / action | Minimum hold |
|---|---|---|
| `remember` | Warm distant valley, Aveloria label, “Satu ingatan, setelah kerajaan selamat.” | 2.3 s |
| `cliff-arrival` | Velthia already seated; Yaric approaches from the right path, then sits. E-01 begins after arrival. | 2.2 s + player-paced dialogue |
| `promise` | Two backs share the horizon. No portrait covers their composition. Eight E-02 lines, including the getting-lost callback. | Player-paced dialogue |
| `cloud-path` | Existing sky, sparse clouds reveal the shape of a forest path. No dialogue. | 2.6 s |
| `cloud-heart` | The same visual region recalls the opened Heart motif. | 2.6 s |
| `silhouettes` | Two anonymous modern silhouettes appear amid cloud strata, for the audience. | 3.2 s |
| `continued` | Negative space, Cinzel, exact text **To Be Continued**, short split motif. | 3 s |
| `credits` | Three editable credit pages with known contributions and tools/font licenses. | 1.8 s/page; Esc skips safely |
| `message` | Private-only user-authored paragraphs followed by signature. Absent in public. | 2.5 s/page; input paced |
| `complete` | Quiet project title; Enter returns to Title. | 0.5 s |

The public story is complete without any photographs. Clouds are a montage device, not a vision experienced by the fantasy characters. The silhouette sequence contains no new prophecy, future knowledge or fate-enforced romance. The old tower remains a broken stump in the far skyline.

## Visual implementation and honest asset status

`EndingArt.ts` draws on a fixed 640×360 canvas at integer scale (2× at 1366×768 with matte margins, 3× at 1920×1080). UI stays in the existing 960×540 design space. Original sprites retain their pixel size. The seated poses reuse the head/torso pixels of existing C01/C02 back-facing frames and add bent cloth/legs with code. This is a **DRAFT derivative pose**, not a claimed final artist redraw. Modern silhouettes claim no real-person likeness.

The canvas texture is reused; no texture is allocated every frame. Environmental drawing updates at 20 Hz. Clouds drift in whole pixels, grass tips bend a single pixel, and sprite torso frames provide idle variation. Reduced Flashes slows ambient drift; neither setting enables flashes or shake. There is no screen flicker, bloom or particle emitter. Dark fades join beats; all sky scenes share a horizon and character placement.

These are deliberately modest code-native assets. The valley's geometric hills, modern architecture, seated anatomy and cloud silhouettes need visual art review. Automated screenshots do not establish final artistic quality.

## Audio and credits

Modern uses `BGM_MODERN`, cliff uses `BGM_EPILOGUE`, credits uses `BGM_CREDITS`. All remain **AWAITING_COMPOSER / SILENCE**. One existing original `SFX_ECHO_MEMORY` is reused quietly at the first memory fragment (volume multiplier 0.28, rate 0.8). Dialogue navigation is silent here. No new SFX or BGM files were generated.

Credit metadata is `CREDITS` in `ending/direction.ts`: Yudis (game direction/story), Claude Code and OpenAI Codex (AI-assisted development), actual tools and the fonts' OFL licenses. No invented studio members, composer or artist. Font license texts are copied from installed Fontsource packages into `web/public/legal/fonts.txt`. Credits can be revised without editing the renderer.

Explicit replay is offered on Title after completion and never writes checkpoints, rewards, inventory or playtime. Credits skip follows the same completion path as viewing all pages; private message still follows credits in the private profile.
