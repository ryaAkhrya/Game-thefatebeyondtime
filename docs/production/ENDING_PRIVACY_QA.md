# Ending privacy QA — Phase 9

13 November 2026. Real personal input is absent. No real anniversary private output is generated. No photos, identities, dates or messages have been uploaded. QA canaries contain no human photographs and are cleaned up after tests.

## Boundaries

| Boundary | Enforcement |
|---|---|
| Public content | `virtual:ending-content` is literal `null` outside the guarded anniversary build |
| Local inputs | `/private/anniversary/`, ignored, outside Vite public |
| Private output | `/private-build/anniversary/`, ignored, excluded from Vercel CLI uploads |
| Ordinary build | Fixed `web/dist/`; public paths and SHA-256 checked before Vite clears/copies output |
| Unexpected public media | Unknown/modified files and symlinks fail the build; public text is pinned to LF by .gitattributes |
| Private imports | Public bundler rejects paths inside private/private-build |
| Private action | `build:private -- --confirm-private-local`; CLI plus build-only mode guard |
| Validation | Real authored message required; unique IDs, readable durations, local images, no traversal, header checks, presence and size limits |
| Output override | Public/private output overrides rejected; existing output ancestors checked before recursive cleanup |
| Dev server | Web-root-only filesystem allow; private paths denied |
| Save JSON | Only step and numeric photo index; no captions, image paths, dates, identity or message |
| Deployment | None performed; root/web `.vercelignore` protect future CLI uploads |

The explicit command and ignored folder are not encryption. Anyone receiving a static private artifact can inspect its contents. These controls prevent accidental inclusion in ordinary builds; they do not make a published private site confidential. No frontend environment variables hold personal secrets.

## Reproducible artifact checks

From `web/`, after the D: dev environment:

```powershell
npm run typecheck
npm run test
npm run build
node scripts/test-ending-privacy.mjs
npm run privacy:audit
```

The privacy script exercises real Vite builds: unconfirmed private command refusal; direct anniversary-mode bypass refusal; an unapproved public canary rejected before output deletion; then a public build with a separate local synthetic canary manifest/image when the real input folder is absent. Actual dist bytes are scanned for canary metadata and matching image bytes; Git ignores are verified; no private output may be created. Existing inputs are never overwritten. Its own canaries are removed in `finally`.

Unit tests cover image headers, missing files/input, traversal, schema, timing, containment and save privacy. Browser QA renders colored rectangles and maximum-length QA strings through the same private-frame renderer. It never creates fake relationship facts. Exact run results, logs and artifact counts are in `PHASE9_REPORT.md`, not inferred from source.

## Human review still required

Approve each real photograph/identity before a private artifact is built. Review supplied copies for embedded metadata: image bytes are preserved, including EXIF. Keep the private output local; hidden URLs and JavaScript passwords provide no protection. Review allowlist changes individually; never regenerate it over a folder containing personal media. Re-run artifact QA when public art or build tooling changes. Real-photo decode, device GPU limits, real-message pacing and private end-to-end flow must be reviewed after actual content arrives.
