# Private memories — local integration guide

No personal photos, partner name, relationship dates or user-authored anniversary message were supplied for Phase 9. None were invented. The public game skips the private gallery and P.S. entirely.

## Local layout

Keep all real data outside `web/public/` and outside tracked source:

```text
FINAL/
  private/anniversary/             # ignored input; never uploaded
    memories.json
    images/                       # original PNG/JPEG/WebP files
  private-build/anniversary/       # ignored output; LOCAL ONLY
  web/anniversary.template.json    # tracked structure only; invalid until filled
```

Create the local directory yourself when the content is ready. Copy `web/anniversary.template.json` to `private/anniversary/memories.json` and replace its message with your own words. Its bracketed template is intentionally rejected by validation. Leaving `memories: []` is valid when you want a private written message without photos.

Use one paragraph per field (no embedded line breaks); message paragraphs belong in separate array entries. Each memory has this structure (documentation placeholders are not accepted as finished personal content):

```json
{
  "id": "memory_01",
  "caption": "[KENANGAN YANG ANDA TULIS SENDIRI]",
  "image": "images/your-approved-photo.jpg",
  "durationMs": 8000,
  "transition": "fade"
}
```

Optional fields: `date` (your own display text, max 48 characters), `note` (180), `group` (80). Order follows the array; grouping does not invent chronology. IDs must be unique, 1–64 letters/digits/underscore/hyphen. Caption max 220 characters. Use `fade`, `hold`, or `pan`; pan moves the contained image subtly inside generous margins and never crops it. All orientations are contained, never stretched. No generative edits, face inference or automatic cropping.

`durationMs` must be an integer from 4,000–60,000 and allow at least 55 ms per caption/note character. Caption and note receive deliberate reading time; manual advance unlocks after 65% of duration (minimum 2 s). The sequence otherwise advances automatically. Space/Enter cannot cascade across new beats. Esc pauses.

The message object requires `paragraphs` (1–12 paragraphs, at most 450 characters each) and `signature` (at most 80 characters). The template supplies only the already-known signature “Yudis”. Date, partner identity and actual message are yours to supply. Each paragraph has its own keyboard-paced page; signature appears on the last. Only this supplied text is rendered after credits.

File references must be local relative paths under `images/`. HTTP URLs, absolute paths, traversal, SVG/HTML, wrong file signatures and missing files fail before building. Each file may be up to 25 MB. The renderer loads one photograph at a time; for browser GPU compatibility, use reviewed copies no larger than 4096 pixels per side where practical. Original source files remain untouched; optional EXIF/location removal must be performed on an approved copy by you before integration. The builder preserves image bytes and therefore preserves any embedded metadata in a private artifact.

## Build profiles

From the project root in PowerShell:

```powershell
. .\web\scripts\dev-env.ps1
npm --prefix web run build
```

This always builds **public** into `web/dist/`. Its virtual private-content module is literally `null`, even when real local private data exists. It validates all public static files against an explicit path + SHA-256 allowlist and scans the actual output for private files/content. Do not “fix” a rejection by automatically approving a directory of photographs; personal content belongs only in the local input above. New public art must receive explicit source/asset review before its individual allowlist entry changes.

Only when real content is ready and you explicitly want a local anniversary artifact:

```powershell
npm --prefix web run build:private -- --confirm-private-local
```

This validates real local input first, then writes **only** `private-build/anniversary/`. Missing data, unfilled message or an omitted confirmation flag fails without creating private output. Running Vite directly in anniversary mode cannot bypass this command's guard. The ordinary dev preview remains public. No private build is made automatically by `verify`, `test`, `dev` or `build`.

After that explicit build, a separate local-only review server can be started from the project root with `python -m http.server 4180 --bind 127.0.0.1 --directory .\private-build\anniversary`. Open `http://127.0.0.1:4180/` and stop the server with Ctrl+C when finished. This command is not run automatically.

Do not upload, push or deploy the private output. It is a static browser artifact whose contents can be read by anyone receiving it; the build flag and folder name are not encryption or access control. Git ignores and root/web Vercel upload exclusions are present as secondary protections. Hosting or sharing requires a separate decision and was not performed here. Frontend environment variables contain no private secrets.

## Review before adding real content

Supply the approved photographs (and permission to use each), captions, dates if wanted, intended order/groups, and your own anniversary message. Partner name/likeness is optional; the current anonymous silhouettes work without either. Recheck portrait/landscape framing, caption length, timing, image decode/GPU limits, and full private flow locally after content is supplied. Never post screenshots containing private data to public bug reports.

The normal development shortcut `?qa=1&preview=ending` is a non-saving public replay; it never substitutes fake relationship content. Real private rendering still needs local review once real assets exist.
