# Participant Deployment — Canonical Artifact

**Status**: authoritative. This is the single authoritative statement of how
the participant-facing artifact is built and verified (Unit 1 of
`docs/ai/NEXT-FABLE-IMPLEMENTATION-UNIT.md`; closes P1-6 / PS-1 / P2-10 as
characterised in `docs/ai/OPUS-OVERNIGHT-PRE-PILOT-TECHNICAL-GATE.md` §10–§13
and `docs/ai/OPUS-PRE-PILOT-PRIVACY-SECURITY-GATE.md` §6).

## The only participant deployment command

```powershell
# Windows PowerShell
$env:CI = 'true'; npm.cmd run bundle
```

```sh
# Git Bash / POSIX shells / CI
CI=true npm run bundle
```

The output is the `dist/` directory. Serve that directory (or a copy of it)
from any static host, including under a nested subpath.

- `CI=true` is required on Windows: `scripts/bundle.sh` otherwise calls `zip`
  and `open` (macOS tools) after the build. With `CI=true` those steps are
  skipped cleanly and `dist/` is still produced in full.
- The script runs `BUNDLE=true npm run build -- --base=./`, which:
  - strips every externally-hosted script and link from `index.html`
    (`unpkg.com` GitHub-corners embed, `github.com` ribbon link) via the
    `BUNDLE` template gate;
  - strips the inert `gtag`/`dataLayer` stub via the same gate;
  - emits **relative** (`./…`) asset, stylesheet and manifest references, so
    the artifact survives hosting under a nested path such as
    `/study/game/`.

## Never serve `npm run build` output to participants

The ordinary production build (`npm run build`, also referenced in `CLAUDE.md`
build-verification commands) remains the correct **build/typecheck
verification target**, but its artifact:

- requests `https://unpkg.com/github-corners/dist/embed.min.js` at page load
  and renders a ribbon linking `https://github.com/remarkablegames/phaser-rpg`;
- uses an absolute `/` base, so it breaks under any subpath deployment.

That makes it a privacy finding (PS-1), not a style preference: a participant
served that artifact triggers a third-party network request. Only
`npm run bundle` output may ever reach a participant.

`vite.config.mts` deliberately keeps the default absolute base for the
ordinary build (the optional `base: './'` hardening was skipped so the
verified dev-server and Playwright flows stay untouched); the relative base is
supplied by `bundle.sh` via `--base=./`.

## Shell metadata (what the served artifact identifies as)

- `<title>` and `<meta name="description">`: `Remote Outpost Assessment` (the
  committed product name, `src/index.ts`).
- `public/manifest.json` `name`/`short_name`: `Remote Outpost Assessment`,
  with an empty icon set.
- The Phaser RPG template icons (`favicon.ico`, `logo192.png`, `logo512.png`,
  `app-icon.png`) are removed; `index.html` declares an empty `data:,`
  favicon so browsers do not fall back to requesting `/favicon.ico` (keeps
  the console free of 404s).
- `public/robots.txt` disallows all crawling — a participant assessment must
  not be indexed by search engines.

## Verification checklist (run against `dist/` after `CI=true npm run bundle`)

All of the following must hold (Git Bash syntax; technical gate §21
reproduction set):

```sh
grep -oE "https?://[^\" ]+" dist/index.html   # no matches (zero external hosts)
grep -E "dataLayer|gtag" dist/index.html      # no matches (no analytics stub)
grep -rlE "researchRuntime|__lastRoomFeedbackText|__playerProbe" dist/assets
                                              # no matches (DEV/test surface absent)
find dist -name "*.map"                       # no matches (no source maps)
```

- `<title>` in `dist/index.html` is `Remote Outpost Assessment`.
- Every asset/manifest reference in `dist/index.html` is relative (`./…`).
- `npm.cmd run preview` (serves `dist/`) boots to the Dock with zero
  console/page errors.

## What this document does not cover

Completion→Qualtrics return, raw-event export, persistence/reload recovery and
the completion-status taxonomy are decision-gated (INT-1…INT-6, P0-3) and are
**not** part of the deployment artifact contract; serving the bundle does not
imply any data leaves the browser.
