# Vercel public-asset hash fix

The deployment of `66299d6` stopped at `assets/battle/B01_BATTLE_V4.json`.
Seven previously approved battle JSON files were CRLF in the Windows working
tree, but LF in Git. The allowlist still pinned their Windows hashes, so a clean
Vercel checkout correctly rejected them. Their parsed JSON data is unchanged.

Updated only the seven known JSON hashes to the existing Git blob bytes:
`B01_BATTLE_V4`, `B03_BATTLE_V1`, `B04_BATTLE_V1`, `C02_BATTLE_V1`,
`M04_BATTLE_V1`, `M05_BATTLE_V1`, and `M06_BATTLE_V1`.
The local files now also use LF, as already required by `.gitattributes`.
The strict public/private guard remains unchanged.

Validation:

- A new LF-approval regression failed on the original B01 hash, then passed
  after correction. The focused privacy suite passes all 6 tests.
- All 326 public allowlist entries match the raw asset bytes exported from Git.
- `npm run build` passes both in the working tree and in an isolated Git-archive
  export with the proposed allowlist/test overlaid, tracked root JSON inputs,
  and the existing installed dependencies. Both audit 340 output files.
- All 8 real Vite privacy canary checks pass, including rejection of unapproved
  public files and attempts to redirect public output into the private directory.

The isolated export runs on Windows with Git's LF file bytes; this verifies the
reported hash mismatch without claiming a Linux-hosted test run. Vercel's npm
`cache-dir` warning is separate from the fatal asset hash error.
