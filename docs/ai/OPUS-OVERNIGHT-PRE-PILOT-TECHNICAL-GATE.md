# Opus Overnight Pre-Pilot Technical Gate

Independent technical verification and deployment-artifact audit of the
gameplay repository, run as a bounded overnight gate to decide whether this
repo is a stable baseline for the upcoming Max 5× Qualtrics integration
sprint. This is **not** an integration-implementation phase: no
decision-gated Qualtrics completion/return/export pipeline was built, no
scientific mapping/scoring/stimulus/event semantics were touched.

Companion documents (unchanged in substance by this gate):
`docs/ai/PRE-MAX-QUALTRICS-INTEGRATION-AUDIT.md`,
`docs/integration/QUALTRICS-END-TO-END-CONTRACT.md`,
`docs/testing/ADVERSARIAL-JOURNEY-PLAN.md`,
`docs/ai/POST-FABLE-MASTER-HANDOFF.md`,
`docs/ai/FABLE-SPRINT-B-PART1-HANDOFF.md`.

---

## 1. Executive verdict

The gameplay repository is **technically stable and reproducible**, and is a
**sound baseline** for the Max integration sprint. Every hard technical gate
that is meaningful pre-integration passes: TypeScript is clean, both the
ordinary and deployment builds are reproducible, the full Playwright suite is
green across two independent full runs, and every DEV/test debug surface is
correctly excluded from the production artifact.

The repository is **NOT** pilot-ready, and this gate does not change that.
Pilot-readiness is blocked by the previously-catalogued P0 cluster
(production completion→return→export path, raw-event export/reproducibility,
persistence decision, Beat-13/D2 scoring) — every one of which is
**decision-gated on user-owned scientific/architecture choices**, not on
technical instability. The gate confirms there is **no undiscovered technical
rot** underneath those known gaps.

Readiness classification (see §19 for the full ladder):

- **Ready for internal developer testing** — YES (today).
- **Ready for supervised usability testing** — YES, with the deployment
  artifact from `npm run bundle` (not `npm run build`) and an operator who
  accepts that no data leaves the browser.
- **Ready for research pilot** — NO (P0 cluster, decision-gated).
- **Ready for formal participant data collection** — NO (P0 + P1 cluster).

One deployment-hygiene finding (**P1-6**) is fully characterised here with
executable artifact evidence and is the single most deployment-relevant
technical item; it is a small, well-understood config gap, not architectural.

---

## 2. Exact repository checkpoint

- Repository: `C:\Users\Juls\Desktop\research-station-assessment-game`
- Branch: `fable-autonomous-game-build-v1`
- HEAD at gate start: `474b7ee` (`docs(integration): pre-Max Qualtrics
end-to-end integration audit`), clean working tree, no stash.
- Protected branch `fable-final-game-prep-from-prototype @ e8a8994` — untouched.
- Latest ten commits at start: `474b7ee`, `0c3529c`, `ec7d4e1`, `034c05b`,
  `653780d`, `db6380d`, `ff28f3d`, `14bc470`, `dfefc8d`, `c734645`.
- Ignored-only untracked paths: `dist/`, `node_modules/`, `test-results/`,
  `.playwright-mcp/`, `.claude/settings.local.json`, `.husky/_/`. No
  unexpected tracked or generated files.
- Test inventory: **49 tests / 22 spec files** (`npx playwright test --list`
  → 49; `e2e/*.spec.ts` → 22, plus `helpers.ts` + `journey.ts` support
  modules). Matches all handoff documentation.

## 3. Environment and commands

- OS: Windows 10 (19045). Shell: Git Bash for POSIX; `npm.cmd` for scripts.
- Node `v24.18.0`; npm `9.6.7`; `.nvmrc` = `24`.
- TypeScript `6.0.3`; Vite `8.0.10`; Phaser `3.90.0`; `@playwright/test`
  `1.61.1`; Playwright browsers: Chromium `1228` + `chromium_headless_shell`
  `1228` + ffmpeg (installed; no download needed).
- Playwright config (`playwright.config.ts`): `testDir ./e2e`, per-test
  `timeout 120_000`, `retries 1`, `workers 1` (serial — shared dev server),
  `list` reporter, `baseURL http://localhost:5173`, SwiftShader launch args
  (`--use-gl=angle --use-angle=swiftshader`, load-bearing for deterministic
  WebGL boot), `webServer` `npx vite --port 5173 --strictPort`,
  `reuseExistingServer: true`. No `projects` block → single default Chromium.
- Package scripts: `build` = `npm run clean && vite build`; `bundle` =
  `bash scripts/bundle.sh`; `clean` = `rmSync('dist')`; `lint` = `eslint .`;
  `lint:tsc` = `tsc --noEmit`; `preview` = `vite preview`; `start` =
  `vite --open`.

Reproduction commands are consolidated in §21.

## 4. Static-verification results (Phase A)

| Command                                 | Exit | Duration             | Result                                |
| --------------------------------------- | ---- | -------------------- | ------------------------------------- |
| `npm.cmd run lint:tsc` (`tsc --noEmit`) | 0    | ~2.8 s               | **clean**                             |
| `npm.cmd run lint` (`eslint .`)         | 1    | ~6.5 s               | **352 errors — all CRLF (see below)** |
| `git diff --check`                      | 0    | —                    | clean                                 |
| `git diff --cached --check`             | 0    | —                    | clean                                 |
| `npm.cmd run build`                     | 0    | ~4.6 s (vite 1.77 s) | passes, 89 modules                    |
| `CI=true npm.cmd run bundle`            | 0    | ~5.2 s (vite 1.48 s) | passes, 88 modules                    |

**TypeScript** — the authoritative hard gate — is **clean**.

**ESLint** reports 352 errors, and **every one is `prettier/prettier`
"Delete `␍`"** (a carriage-return character) — i.e. a pure CRLF-vs-LF
line-ending complaint, zero logic/type/style findings. Root cause is
environmental, not a code defect:

- All git blobs are **LF-only** (`git show HEAD:<file>` shows no CR; `file`
  reports plain "ASCII text").
- This machine has `core.autocrlf=true`, so git rewrites LF→CRLF on checkout.
- Prettier's config (`.prettierrc` = `{ "singleQuote": true }`, no
  `endOfLine`) defaults to LF and flags the CRLF working-tree bytes.
- The affected set is exactly the **template/untouched** files that still
  carry their CRLF checkout (e.g. `analytics.ts`, `env.ts`, `vite.config.mts`,
  `eslint.config.mts`, `components/*`); Fable-authored files were rewritten
  with LF and pass (verified: `analytics.ts` cr=25, `index.ts` cr=0,
  `ResearchRuntime.ts` cr=0).
- The tree still shows **clean** because `autocrlf` normalises CRLF→LF for
  diff comparison.
- CI (`.github/workflows/build.yml`, ubuntu, fresh `npm ci`, default
  `autocrlf=false`) checks out LF blobs, so **`npm run lint` passes in CI**.

This is a **known, pre-existing, documented, non-blocking** item:
`POST-FABLE-MASTER-HANDOFF.md §9`/`§11 item 10` records it as "CRLF/lint
repo cleanup (353 pre-existing, never blocking) — Codex". 352 vs 353 is
trivial drift (one file rewritten LF since). **Classification: accepted /
environmental warning** (see §16). It does not affect the build or the
deployed artifact.

**Build warnings**: both builds emit exactly one warning — the Vite chunk-size
notice (`> 500 kB after minification`, the 1.37 MB single JS chunk). Known
**P2-12**, accepted limitation (load performance only). No other warnings.

## 5. Full-suite Playwright pass 1 (Phase B)

- Command: `PLAYWRIGHT_JSON_OUTPUT_NAME=<sp>/pass1.json npx playwright test
--reporter=list,json` (default config; dev server auto-started on :5173).
- Started `2026-07-13T15:48:11Z`, ended `2026-07-13T16:34:26Z`, **exit 0**.

**Result: 49 passed / 0 failed / 0 flaky / 0 skipped.** Wall-clock
**46.2 min** (2,771,975 ms). JSON stats: `expected 49, unexpected 0, flaky 0,
skipped 0`. **Zero retries were consumed by any test** (`flaky 0` — no test
failed-then-passed; every one passed on its first attempt), despite the
config's `retries: 1` budget being available. No `test.only`/`test.skip` in
the suite (all 49 ran).

- Console errors: none surfaced by any spec. Page errors: none. Timeouts:
  none. Traces/screenshots/videos: none produced (the config captures none on
  success; there were no failures to trigger artifacts).
- The documented **49 tests / 22 spec files** inventory remains accurate.
- Slowest specs (all first-attempt PASS): ADV-5 status board 596.4 s;
  `connected_participant_journeys` P1 265.7 s; `connected_world_smoke`
  264.9 s; P2 222.7 s; P3 194.6 s; ADV-3 archive 126.1 s. Full per-test
  timing/headroom in §9.

## 6. Full-suite Playwright pass 2 (Phase C)

Run from a fresh Playwright process and a fresh dev server (pass 1's
webServer was confirmed torn down — nothing on :5173 before launch), same
command and config.

- Started `2026-07-13T16:36:09Z`, ended `2026-07-13T17:22:15Z`, **exit 0**.
- **Result: 49 passed / 0 failed / 0 flaky / 0 skipped.** Wall-clock
  **46.1 min** (2,763,362 ms). JSON stats: `expected 49, unexpected 0,
flaky 0, skipped 0`. **Zero retries consumed.**
- No console errors, no page errors, no timeouts, no artifacts produced.

## 7. Third-run evidence

**Not run — not required.** Pass 1 and pass 2 agree completely (both 49/0/0/0,
zero retries, sub-2-second timing variance on the longest specs), and there
was no probable flake and no isolated correction to re-validate. A third full
run would consume ~46 min of allowance for no additional signal, so it was
deliberately skipped per the gate's conservation rule.

## 8. Failure and flake analysis

**No failures occurred in either pass, and no flake was observed.** Both full
runs were clean sweeps (49/49) with zero retries consumed — the config's
`retries: 1` budget was never touched, so no test failed-then-passed. Because
there were zero failures, the failure-classification taxonomy (implementation
defect / test-expectation defect / test-infra defect / environmental /
probable flake / decision-gated ambiguity) has no entries this gate.

Pass-1 vs pass-2 comparison across the required dimensions:

| Dimension                            | Finding                                                                                                                                                                                       |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Timing variation                     | Negligible. ADV-5 596.4 s → 594.6 s (Δ −1.8 s); connected P1 265.7 → 265.2; smoke 264.9 → 264.8; P2 222.7 → 222.5; P3 194.6 → 195.4 (Δ +0.8 s); archive 126.1 → 124.8. Total 46.2 → 46.1 min. |
| Retries                              | 0 in both passes (`flaky 0`).                                                                                                                                                                 |
| Order dependence                     | None. Serial `workers: 1`, identical spec order both runs; no cross-spec coupling surfaced.                                                                                                   |
| Stale servers / port conflicts       | None. :5173 confirmed clear before each launch; pass 1's webServer torn down before pass 2.                                                                                                   |
| State leakage                        | None. Cross-session isolation (ADV-1) passed both runs; each spec uses a fresh page context.                                                                                                  |
| Session leakage                      | None (ADV-1 / status-board fresh-session isolation green both passes).                                                                                                                        |
| Intermittent navigation failures     | None. The route-heavy specs (connected journeys, status board) passed first-attempt both runs.                                                                                                |
| Inconsistent event counts            | None. Count-dependent assertions (per-room logging, journey subsequences, input-spam single-decision) passed identically.                                                                     |
| Inconsistent mission-state rendering | None. ADV-5 asserts board text byte-for-byte against `getMissionState()`; green both runs.                                                                                                    |
| Tests near timeout budget            | Tightest is ADV-5 at 66% of 900 s (§9); comfortable both runs.                                                                                                                                |

**Conclusion: the suite is reproducible and not flake-prone on this
environment.** The historical WebGL first-context flake is fully mitigated by
the SwiftShader launch args (no first-attempt burn observed in 98 test
executions across the two passes).

## 9. Timing and timeout analysis

Per-test timeout is 120 s in `playwright.config.ts`; the long specs raise it
locally via `test.setTimeout`. Pass-1 durations against each budget (headroom
= budget − actual):

| Spec (test)                                              | Budget          | Pass-1 actual | Used  | Headroom      |
| -------------------------------------------------------- | --------------- | ------------- | ----- | ------------- |
| `adversarial_status_board_display` (board deterministic) | 900 s           | 596.4 s       | 66%   | 303.6 s (34%) |
| `connected_participant_journeys` P1 adaptive             | 600 s           | 265.7 s       | 44%   | 334.3 s       |
| `connected_world_smoke` (8-station round trip)           | 600 s           | 264.9 s       | 44%   | 335.1 s       |
| `connected_participant_journeys` P2 shortcut             | 600 s           | 222.7 s       | 37%   | 377.3 s       |
| `connected_participant_journeys` P3 avoid/defer          | 600 s           | 194.6 s       | 32%   | 405.4 s       |
| `adversarial_archive_abandon_return`                     | 360 s           | 126.1 s       | 35%   | 233.9 s       |
| `adversarial_hazard_repeat_decisions`                    | 300 s           | 69.2 s        | 23%   | 230.8 s       |
| `adversarial_direct_launch_navigation`                   | 240 s           | 64.8 s        | 27%   | 175.2 s       |
| all remaining specs                                      | 120 s (default) | ≤ 59.2 s      | ≤ 49% | ≥ 60.8 s      |

**The tightest ratio is ADV-5 at 66% of its 900 s budget** — a deliberate,
documented headroom (`FABLE-SPRINT-B-PART1-HANDOFF`: earlier 600 s ceiling
was raised to 900 s after one first-attempt hit 600 s). 34% / ~5 min of slack
remains; no other test exceeds 49% of its budget. **No test is near its
ceiling**, and none relies on the config `retries: 1` to pass. Pass-2 timing
comparison is in §8.

## 10. Production-artifact findings (Phase D)

Inspected the real files emitted by both builds.

**Ordinary `npm run build` → `dist/` (base `/`):**

- `dist/index.html` (1.10 kB) contains an **external script**
  `https://unpkg.com/github-corners/dist/embed.min.js` and a **GitHub ribbon**
  linking `https://github.com/remarkablegames/phaser-rpg`, plus the ribbon
  `<style>` block.
- Asset references are **absolute**: `src="/assets/index-*.js"`,
  `href="/assets/*.css"`, `href="/manifest.json"` → **base `/`** (breaks
  hosting under a nested path).
- Inert `gtag` inline stub present (defines `window.gtag`, pushes
  `gtag('js', new Date())` to `dataLayer` — no network).
- 89 modules transformed.

**Deployment `npm run bundle` → `dist/` (base `./`):**

- `dist/index.html` (0.82 kB): unpkg script + ribbon + ribbon style
  **stripped** (gated `<% if (process.env.BUNDLE !== 'true') %>` in
  `index.html`; `scripts/bundle.sh` runs `BUNDLE=true npm run build --
--base=./`). **Zero external hosts** (grep for `https?://` → none).
- Asset references are **relative**: `src="./assets/index-*.js"`,
  `href="./assets/*.css"`, `href="./manifest.json"` → subpath-safe.
- Inert `gtag` inline stub **still present** (not gated by BUNDLE, but inert).
- 88 modules transformed (one fewer than the ordinary build).

**Common to both artifacts:**

- **No source maps** anywhere in `dist/` (`find dist -name '*.map'` → none).
- **No** `researchRuntime` global, `window.__lastRoomFeedbackText` probe,
  `unpkg`, or `googletagmanager` strings in the production JS bundle (see §12).
- The single `localhost` string in the bundle is `QualtricsBridge`'s
  no-`window` SSR fallback (`http://localhost/`, never reached in a browser).
- The 5 `console.log` occurrences are all Phaser/matter-js library internals;
  **app source contains zero `console.log`/`console.debug`**.
- No absolute filesystem paths (`C:\Users…`) in the bundle.
- Template PWA/shell leftovers copied from `public/` into `dist/`:
  `favicon.ico`, `logo192.png`, `logo512.png`, `app-icon.png`,
  `manifest.json`, `robots.txt`, `<title>Phaser RPG | remarkablegames`,
  `<meta description="Game created using Phaser RPG">`,
  `<link rel="manifest" href="…/manifest.json">`. **P2-10** (title is
  participant-visible).
- `return_url`/query-parameter handling: `QualtricsBridge.buildReturnUrl`
  returns `null` on null/empty/whitespace/unparseable `return_url`, resolves
  relative URLs against `window.location.href`, appends every
  `GameSummaryVariables` key as a query param; **does not enforce `http(s)`**
  (INT-4, user-owned). This function is present in the bundle but is only
  invoked by the DEV-gated `completeDebugSession` — **no production code
  navigates to the returned URL** (the known P0-1 gap).

**Static-host / nested-path expectation:** the `bundle` artifact's relative
base (`./`) makes it servable from any nested path; the ordinary `build`
artifact's absolute base (`/`) requires root hosting or an explicit
`--base`. Direct navigation + reload behaviour is validated at runtime in §13.

## 11. Build-versus-bundle comparison

| Dimension             | `npm run build`               | `npm run bundle`                                     |
| --------------------- | ----------------------------- | ---------------------------------------------------- |
| Script                | `npm run clean && vite build` | `bash scripts/bundle.sh` → `BUNDLE=true … --base=./` |
| Base path             | `/` (absolute asset URLs)     | `./` (relative asset URLs)                           |
| External unpkg script | **present**                   | **stripped**                                         |
| GitHub ribbon         | **present**                   | **stripped**                                         |
| Inert gtag stub       | present                       | present                                              |
| Modules transformed   | 89                            | 88                                                   |
| `index.html` size     | 1.10 kB                       | 0.82 kB                                              |
| Source maps           | none                          | none                                                 |
| Nested-path hosting   | broken (needs `--base`)       | works                                                |
| Zip/`open` step       | n/a                           | `bash` only, skipped under `CI=true`                 |

**Only `npm run bundle` is a defensible participant-deployment command.** The
documentation-canonical "production build" (`npm run build`) is **not** the
deployment artifact — it ships an external network dependency and a
third-party ribbon and cannot be hosted under a subpath. This is finding
**P1-6**; see §17 and the Max hand-off note below.

**bundle.sh portability note:** `scripts/bundle.sh` uses `zip` and `open`
(macOS) after the build, guarded by `if [[ $CI != 'true' ]]`. On Windows/CI
those tools are absent; running with `CI=true` cleanly skips them and still
produces the correct `dist/`. The zip/`open` packaging step therefore does
not run on this platform without `CI=true`, but the **artifact itself is
correct** — the packaging convenience is orthogonal to deployment correctness.

## 12. DEV / test-probe exposure analysis

All debug/test surfaces are `import.meta.env.DEV`-gated and
dead-code-eliminated from the PROD bundle. Verified by grepping the built
production JS (`dist/assets/index-*.js`):

| Surface                                             | Source gate                                                 | In PROD bundle                     |
| --------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------- |
| `window.researchRuntime` (7-method debug API)       | `ResearchRuntime.ts:190` `if (!import.meta.env.DEV) return` | **absent** (0 hits)                |
| `window.__lastRoomFeedbackText` probe (ADV-5)       | `RoomScene.ts:181,395` `import.meta.env.DEV`                | **absent** (0 hits)                |
| Playwright/test globals (`__PLAYWRIGHT`, `__probe`) | n/a                                                         | **absent** (0 hits)                |
| Phaser arcade physics debug                         | `index.ts:28` `import.meta.env.DEV`                         | off in PROD                        |
| `disableContextMenu`                                | `index.ts:31` `import.meta.env.PROD`                        | on in PROD                         |
| gtag `ga-disable` flag                              | `analytics.ts:20` `import.meta.env.DEV`                     | analytics tree-shaken out entirely |

The class-method names `getMissionState`/`completeDebugSession`/
`exportEventsJSON` do appear in the bundle, but only as ordinary methods on
the `ResearchRuntime`/`SessionState` classes (`getMissionState` powers the
live Hub status board). **The global _exposure_ is what is stripped** — no
`window.*` handle reaches any of them in production. This is correct and is
the crux of the P0-1 gap: the completion/return machinery _exists as code_
but has no production entry point.

## 13. Runtime production smoke-test results (Phase E)

The **`npm run bundle` deployment artifact** was served via `vite preview`
(port 4173) and driven by a focused 3-test production smoke (a scratchpad
spec, never added to the committed suite). The suite's normal helpers depend
on the DEV-only `researchRuntime` API, so this spec waits on the Phaser
`<canvas>` instead and asserts the DEV surfaces are **absent**.

**Result: 3 passed / 0 failed (20.6 s), exit 0.**

| Smoke check                      | Evidence                                                                                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial launch + Hub/canvas boot | `<canvas>` visible and sized (clientWidth/Height > 0) within budget                                                                                  |
| Launch-parameter parsing         | URL retains `participant_id=SMOKE_P1`; game boots with the 5-param launch URL                                                                        |
| Representative interaction       | Dock→Hub movement + SPACE poke ran with zero page/console errors                                                                                     |
| Reload behaviour                 | Reload mid-session re-boots to a booting canvas, no errors (consistent with the in-memory, no-persistence design — reload starts fresh from the URL) |
| Missing `return_url` grace       | Launch without `return_url` boots cleanly, no crash, no errors                                                                                       |
| DEV-only window APIs             | `window.researchRuntime` **undefined**, `window.__lastRoomFeedbackText` **undefined** in the production artifact                                     |
| Page/console errors              | **none** across all three tests                                                                                                                      |
| Asset loading (static route)     | All bundle assets served 200 by `vite preview`                                                                                                       |

**Nested-path / static-host compatibility:** the same `dist/` was served by a
zero-dependency Node static host mounted at a **nested prefix** `/study/game/`.
`index.html`, the hashed JS, the hashed CSS, and `manifest.json` all returned
**HTTP 200**, confirming the bundle's relative base (`./`) is subpath-portable
(the way a real static host / project-path deployment would serve it). The
ordinary `npm run build` artifact (base `/`) would **not** survive this test —
another concrete facet of P1-6.

Not exercised (correctly out of scope): real participant data collection, any
send to an external service, and the decision-gated completion/return/export
pipeline (which does not exist in production by design — P0-1).

## 14. Contract / document consistency findings (Phase F)

Executable evidence was compared against the adversarial journey plan, active
expansion state, both handoffs, the Qualtrics end-to-end contract, the
pre-Max integration audit, and package-script/deployment documentation.

**Consistent (verified accurate):**

- **Test inventory 49 / 22** — asserted by `PRE-MAX…AUDIT §2/§11`,
  `QUALTRICS…CONTRACT §19`, `FABLE-SPRINT-B-PART1-HANDOFF`, and
  `ACTIVE-EXPANSION-STATE` — matches `--list` exactly.
- **P1-6 build/bundle divergence** — the audit (§5/§7/§10) and the contract
  (§17/§18) describe the unpkg script, ribbon, base `/` vs `./`, and
  BUNDLE-stripping precisely as the artifacts show.
- **DEV-only debug surface** — the contract §18 DEV/PROD table matches the
  bundle grep in §12 exactly.
- **ADV-9/10/11 documented-but-unbuilt (P2)** — `ADVERSARIAL-JOURNEY-PLAN §2`
  and the handoff both correctly mark these planned, not implemented; the
  suite count (49) reflects their absence.
- **CRLF/lint 353→"never blocking"** — `POST-FABLE §9/§11` matches the §4
  finding.

**Minor drift (recorded, not silently "corrected"):**

- The prior audit states `npm run build` = "89 modules, 1.92 s"; this gate
  measured 89 modules / 1.77 s vite (4.6 s wall incl. clean) — module count
  identical, timing is machine/run variance. No action.
- CRLF error count 352 (this run) vs 353 (documented). Trivial; the docs'
  "pre-existing, never blocking" characterisation stands. No action.

No stale command names, no inaccurate readiness claims (every doc already
labels the repo NOT pilot-ready), no contracts-without-evidence, and no
implementation-without-contract were found. Documentation is **not** edited
where evidence is not decisive; the only updates made by this gate are the
additive checkpoint entries in §18-referenced docs (see the update log at the
end of this file).

## 15. Technical defect register

**Verified reproducible technical defects with unambiguously authoritative
intended behaviour: none.** Consistent with every prior audit
(`POST-FABLE §6`: "Known technical defects: none"). No isolated code
correction was applied because no candidate met the fix bar (reproduced +
authoritative-intended-behaviour + purely technical + no user decision + no
scientific/stimulus change). The P0/P1 items in §17 are missing
implementations or config/deployment gaps gated on user decisions, not
logic defects in existing code.

## 16. Accepted warnings

| Warning                                    | Class                              | Disposition                                                           |
| ------------------------------------------ | ---------------------------------- | --------------------------------------------------------------------- |
| ESLint 352 × `prettier/prettier` CRLF      | environmental (Windows `autocrlf`) | **accepted** — CI passes; documented non-blocking (POST-FABLE §11.10) |
| Vite chunk > 500 kB (1.37 MB JS)           | performance (P2-12)                | **accepted** — no code-splitting; load-time only                      |
| `bundle.sh` `zip`/`open` absent on Windows | tooling portability                | **accepted** — `CI=true` skips; artifact still correct                |

None are deployment-blocking for a supervised context; the chunk size is the
only one worth revisiting for slow participant connections.

## 17. P0 / P1 / P2 blocker matrix

Severity carried forward verbatim from `PRE-MAX…AUDIT §7` (this gate produced
**no new** P0/P1 technical defects; it adds executable confirmation).

| ID       | Title                                                           | Class                               | Owner         | Gate status                                                                 |
| -------- | --------------------------------------------------------------- | ----------------------------------- | ------------- | --------------------------------------------------------------------------- |
| **P0-1** | No production completion→return→export path                     | missing impl + INT-1                | user → Max    | confirmed (DEV-only) — **do not fix here**                                  |
| **P0-2** | Raw events never exported; scores not reproducible              | validity + INT-2                    | user → Max    | confirmed — do not fix here                                                 |
| **P0-3** | No persistence; reload/crash loses data                         | risk + user decision                | user → Max    | confirmed (§13 reload) — do not fix here                                    |
| **P0-4** | Beat-13/D2 scoring bundle not landed                            | scientific decision                 | user → Max    | confirmed absent — do not fix here                                          |
| **P1-5** | Empty-string launch identity bypasses fallback                  | defect / intended-behaviour (INT-3) | user → Max    | confirmed (frozen by ADV-6)                                                 |
| **P1-6** | Default `build` ships external unpkg + ribbon + base `/`        | deployment/privacy                  | Sonnet/config | **fully characterised here** (§10/§11); mitigated by using `npm run bundle` |
| **P1-7** | No completion-status taxonomy                                   | missing contract (INT-5)            | user → Max    | unchanged                                                                   |
| **P1-8** | `asset_set_version` absent from payloads                        | traceability (INT-6)                | user → Max    | unchanged                                                                   |
| **P1-9** | No event sequence numbers; ADV-9 unbuilt                        | integrity/coverage                  | Max           | unchanged                                                                   |
| P2-10    | Stale template HTML/PWA metadata (title, manifest, icons, gtag) | config                              | Sonnet        | confirmed in `dist/`                                                        |
| P2-11    | Prototype hazard path diverges from D1 (`?scene=prototype`)     | accepted limitation                 | —             | unchanged (not participant path)                                            |
| P2-12    | 1.37 MB single JS chunk                                         | performance                         | —             | confirmed (build warning)                                                   |
| P2-13    | No global error boundary → `recordTechnicalError()`             | resilience                          | Max           | unchanged                                                                   |

## 18. Exact remaining technical work (pre-pilot)

Unchanged from the audit's Unit plan; nothing here is unblocked by this gate
except that the baseline is now regression-verified. In dependency order:

1. **Unit 0 (user, no code):** rule INT-1 (return mechanism), INT-2 (raw
   export channel), INT-5 (completion-status taxonomy), D2 scope. Blocks all
   of return/export/scoring.
2. **Unit 1:** empty-identity handling (P1-5/INT-3) in `SessionState`.
3. **Unit 2:** event persistence + monotonic sequence numbers + ADV-9
   append-only harness + reload/crash handling (P0-3/P1-9/INT-2).
4. **Unit 3:** production completion trigger → finalise summary → build &
   navigate `return_url` with status taxonomy; raw export (P0-1/P0-2/P1-7).
5. **Unit 4:** adversarial coverage of the now-live production paths (INT-4).
6. **Unit 5:** single documented deployment command with no external deps +
   correct base + shell-metadata cleanup (P1-6/P2-10); hosted round-trip.
7. **Unit 6:** dataset/codebook 1:1 + scoring reproducibility.
8. **Unit 7:** full regression (prod + dev) + formal pilot-readiness gate.

**P1-6 note for Unit 5 (do not over-build):** the intended deployment
artifact behaviour is already explicit and proven here — `npm run bundle`
already produces the correct no-external-dep, relative-base artifact. The
remaining work is (a) making one command the _documented, canonical_
deployment command and (b) the P2-10 shell-metadata cleanup. A minimal
deterministic option, if desired, is to also gate the inert gtag stub and set
`base` in `vite.config.mts`, but neither is required for a correct artifact
today and both are Sonnet/config scope, not this gate's.

## 19. Pilot-readiness classification

Explicit, non-conflated ladder:

- **Ready for internal developer testing — YES.** tsc clean, both builds
  reproducible, full suite green ×2, dev debug API available. A developer can
  run `npm run start`, drive the full connected world, and inspect
  `window.researchRuntime` today.
- **Ready for supervised usability testing — YES (conditional).** Serve the
  `npm run bundle` artifact; an operator supervises; participants can play the
  full journey. Condition: everyone accepts that **no data is returned to
  Qualtrics and nothing is persisted** (P0 cluster). Do **not** serve the
  `npm run build` artifact to participants (P1-6).
- **Ready for research pilot — NO.** Blocked by P0-1/P0-2/P0-3/P0-4, all
  decision-gated. An unsupervised participant would lose data on reload and
  return nothing to Qualtrics.
- **Ready for formal participant data collection — NO.** Additionally
  requires the P1 cluster (identity, taxonomy, provenance, sequencing) and
  Beat-13/D2 scoring + codebook reproducibility.

## 20. Recommended next Max 5× session

Begin with **Unit 0 (user decisions)** — INT-1, INT-2, INT-5, and D2 scope —
then run **Unit 1 verbatim** from `PRE-MAX-QUALTRICS-INTEGRATION-AUDIT.md §19`
(empty-identity handling in `SessionState`, single bounded commit). This gate
establishes that a fresh session can start Unit 1 from `474b7ee` (or the gate
checkpoint commit) **without repeating full regression discovery**: the
suite is green ×2, the baseline is clean, and the P0/P1 register is current.

Do **not** let the Max session start from `npm run build` as the deployment
reference — the canonical deployment artifact for any participant-facing test
is `npm run bundle` until Unit 5 formalises it.

## 21. Commands to reproduce the evidence

```bash
# Checkpoint
git rev-parse --abbrev-ref HEAD           # fable-autonomous-game-build-v1
git rev-parse HEAD                        # 474b7ee…
git status --porcelain                    # (clean)

# Phase A — static
npm.cmd run lint:tsc                      # clean (hard gate)
npm.cmd run lint                          # 352 CRLF-only (environmental; CI passes)
git diff --check                          # clean
npm.cmd run build                         # ordinary build → dist/ (base /)
CI=true npm.cmd run bundle                # deployment build → dist/ (base ./)

# Phase D — artifact inspection (per build)
grep -oE "https?://[^\" ]+" dist/index.html            # ordinary: unpkg+github; bundle: none
grep -oE '(src|href)="[^\"]*"' dist/index.html         # base / vs ./
find dist -name '*.map'                                # none (no source maps)
JS=$(ls dist/assets/index-*.js); \
  for p in researchRuntime __lastRoomFeedbackText unpkg googletagmanager \
           sourceMappingURL; do echo "$p: $(grep -oc "$p" "$JS")"; done  # all 0

# Phase B/C — full suite (serial, ~30 min each; ADV-5 ~10 min)
PLAYWRIGHT_JSON_OUTPUT_NAME=pass1.json npx playwright test --reporter=list,json
PLAYWRIGHT_JSON_OUTPUT_NAME=pass2.json npx playwright test --reporter=list,json
npx playwright test --list                # 49 tests / 22 spec files

# Phase E — production-artifact smoke (against the bundle artifact)
CI=true npm.cmd run bundle                # ensure dist/ is the bundle build
npx playwright test --config <scratchpad>/prod-smoke.config.ts
node <scratchpad>/nested-serve.mjs &      # nested-path host at /study/game/
curl -sI http://localhost:4273/study/game/    # 200 → relative base works nested
```

---

_Gate discipline: main Opus agent only; no subagents; no MCP; no push/merge/
rebase/reset/branch-switch; no protected-branch edits; no
package.json/lockfile changes; no scientific/stimulus/scoring/event-semantics
changes; no decision-gated pipeline implementation._
