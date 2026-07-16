# Run report — test-only game-to-Supabase export integration

Autonomous unit executed from `FABLE-AUTONOMOUS-SUPABASE-EXPORT.md` (task file
itself untracked, per its own instructions). Baseline `8f7a07c` on
`fable-autonomous-game-build-v1`.

## Files changed

| File                                                   | Change                                                                                                                                                                                                                                                               |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/systems/ResearchExportClient.ts`                  | **New.** Transport-only export client: envelope freezing, sessionStorage idempotency, typed discriminated results, AbortController timeout.                                                                                                                          |
| `src/systems/ResearchRuntime.ts`                       | Additive wiring: fire-and-forget export on `completeDebugSession()`, `submitSessionExport()` / `getLastExportResult()` (dev-only debug API additions), launch-mode + config resolution. Six baseline debug methods and `completeDebugSession`'s signature unchanged. |
| `src/systems/index.ts`                                 | Barrel export for the new module.                                                                                                                                                                                                                                    |
| `src/types/vite-env.d.ts`                              | Declares `VITE_RESEARCH_INGEST_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` as `string \| undefined`.                                                                                                                                                                      |
| `.env.example`                                         | **New.** Safe placeholders only; real values go in untracked `.env.local`.                                                                                                                                                                                           |
| `e2e/research_export_test_mode.spec.ts`                | **New.** 8 deterministic mocked-network tests (see below).                                                                                                                                                                                                           |
| `e2e/helpers.ts`                                       | `LaunchParams` gains optional `launch_mode`.                                                                                                                                                                                                                         |
| `e2e/launch_with_research_params.spec.ts`              | Pinned debug-API surface extended with the two additive methods (same precedent as Wave 1B's `getMissionState`).                                                                                                                                                     |
| `docs/operations/RESEARCH-SESSION-EXPORT-TEST-MODE.md` | **New.** Research-owner/operations reference.                                                                                                                                                                                                                        |
| `docs/ai/FABLE-SUPABASE-EXPORT-TEST-UNIT-REPORT.md`    | This report.                                                                                                                                                                                                                                                         |

## Architecture and payload

- `ResearchExportClient` receives everything through injected callbacks
  (launch mode, config, session identity, payload builder) — no import cycle,
  no duplicated state, fully transport-scoped. It never logs research events
  and never mutates `EventLogger` / `ScoringManager` / `DataQualityTracker`
  state (read-only copies only).
- Envelope: `{ export_id, participant_id, game_session_id, launch_mode:
'test', client_created_at, payload }` with payload `{ game_version,
asset_set_version, summary, raw_events, data_quality, technical_errors }` —
  all sourced from existing instrumentation (`SessionState` metadata,
  `EventLogger.getEvents()`, `computeSummary(completed = true)`,
  `DataQualityTracker.getMetrics()`, `ASSET_SET_VERSION`). The technical-error
  field is a count only, matching the deliberately content-free existing
  capture. No scoring value is invented.
- Trigger: `completeDebugSession()` fires the export fire-and-forget (the
  method stays synchronous and its result shape is unchanged);
  `window.researchRuntime.submitSessionExport()` is the manual retry;
  `getLastExportResult()` exposes the last typed transport result.

## `export_id` persistence (idempotency)

On first submission for a session identity the client generates one UUID v4
and freezes the **fully serialised envelope string** under
`research-export:v1:<enc(participant_id)>:<enc(game_session_id)>` in
`sessionStorage`. Every retry (same page or after reload in the same tab)
resends those exact bytes, so the server's payload hash matches and it
answers 200 `duplicate: true` — never a second row, never a 409 from this
client. Freezing the bytes (rather than rebuilding) is what makes retries
hash-stable: a rebuilt payload would differ (e.g. `elapsed_seconds`) and
would otherwise collide with the same `export_id`. If `sessionStorage` is
unavailable or throws, an in-memory fallback preserves idempotency for the
page lifetime; after a reload a _fresh_ `export_id` is generated (new row,
never a content conflict). Corrupt stored entries are detected and replaced
with a fresh envelope. Concurrent calls share one in-flight request.

## How participant-mode submission is prevented

Three independent gates, all of which must pass:

1. `submitSessionExport()` refuses unless `import.meta.env.DEV` (production
   participant bundles refuse before the client is even constructed);
2. the client refuses unless the launch URL has exactly `launch_mode=test`
   (checked before any envelope is built);
3. the only trigger is the dev/debug completion path — participant completion
   (Final Core) has no connection to the exporter, verified by an e2e test
   that completes the Final Core with export config present and asserts zero
   transport requests.

No Qualtrics redirect exists in this unit; completion still only previews
the return URL (asserted in e2e).

## Validation commands and results

All run in the isolated worktree at the same baseline:

| Check                                                       | Result                                                                         |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `npx eslint` on every changed TS file                       | Pass (0 issues)                                                                |
| `npm.cmd run lint:tsc`                                      | Pass                                                                           |
| `npx playwright test e2e/research_export_test_mode.spec.ts` | **8/8 pass** (twice: before and after the self-review fixes)                   |
| `npm.cmd run build` (production)                            | Pass (pre-existing chunk-size warning only)                                    |
| Full existing Playwright suite (65 tests)                   | 55 pass, 4 flaky-pass on retry, 6 fail — all 6 are navigation timeouts (below) |

**Navigation-failure triage** (required flake-vs-regression distinction):
every failed attempt was a `waitForRoomEntry`/`waitForEventCount` movement
timeout; zero logging/summary/export assertions failed. On a quiet re-run,
`engineer_hub_logging` (×2) and `inventory_prep_logging` passed; the four
long journey specs (`connected_participant_journeys` P1/P2/P3,
`connected_world_smoke`) kept failing — and **fail identically on a clean,
unmodified `8f7a07c` baseline worktree** (same timeouts, same call sites).
Conclusion: pre-existing environmental failure of the documented
timed-movement-leg flake class on this machine, present with and without
this unit's changes; not a regression, and out of scope to fix here (the
task file forbids broadening into gameplay changes). Evidence: Playwright
JSON reports for the loaded run, quiet re-run, and baseline run (local
logs).

The 8 new tests cover: exact envelope shape and instrumentation sourcing;
201 first ack; stable `export_id` across same-page retry **and** reload
(200 duplicate, byte-identical bodies); distinct sessions → distinct ids;
401/403/409/malformed/network/timeout mapping; missing configuration
refusing with zero requests; non-test and absent launch modes refusing with
zero requests; throwing `sessionStorage` fallback; participant-style Final
Core completion never touching the transport; no navigation after export.
All network is mocked with a same-origin route intercept — the ordinary
suite never contacts the live endpoint.

## Live synthetic test

**Not performed — missing prerequisite.** No ignored local environment file
exists in the repository (`.env.local` absent; only `supabase/.temp/`
project metadata is present, which contains no publishable key), so no
credentials were available and the task file forbids stopping for a secret.
The one remaining manual step is documented in
`docs/operations/RESEARCH-SESSION-EXPORT-TEST-MODE.md` (§ Local synthetic
verification): create `.env.local` from `.env.example`, launch with a fresh
`AUTO-TEST-*` identity and `launch_mode=test`, complete, expect 201 then
200-duplicate on retry.

## Assumptions recorded

1. **Client launch-mode source**: no client-side `launch_mode` existed; it is
   read from the launch URL query (same pattern as the other Qualtrics launch
   params), consistent with the INT-5 Model B dimension. Only the literal
   value `test` enables the exporter; the INT-5 vocabulary decision itself
   remains open and unresolved.
2. **DEV-only gating**: the exporter is additionally gated on
   `import.meta.env.DEV`, so a production bundle cannot submit even with
   `launch_mode=test`. Trade-off: a served production bundle (e.g. supervised
   usability test) cannot use this exporter — documented as a limitation;
   reversible one-line decision if the research owner wants otherwise.
3. **`technical_errors` shape**: the existing capture stores a count only
   (by privacy design), so the envelope field is
   `{ technical_error_count }` sourced from `DataQualityTracker` rather than
   an invented error list.
4. **Debug-API surface extension**: the pinned surface test was updated for
   the two additive methods, following the recorded Wave 1B precedent that
   the six-method baseline is a minimum, not a maximum.
5. **`.env.example`** was created as the conventional example file (the
   tracked `.env` carries only non-secret app metadata and was left
   untouched).
6. **Worktree mechanics**: work was done in an isolated git worktree at the
   same commit and fast-forwarded onto `fable-autonomous-game-build-v1`
   (checkout never left the branch); `.claude/worktrees/` line-ending
   smudge (global `core.autocrlf=true`) was normalised to LF for touched
   files, matching the repository's on-disk convention.

## Unresolved risks

- The live endpoint round-trip (real CORS behaviour, real key, real 201/200
  path) is unverified until the manual synthetic test runs.
- `sessionStorage` accumulates one frozen envelope per test session identity
  in long-lived dev tabs (bounded by tab lifetime; test-only).
- INT-1/2/5, D2 and the participant ingestion/Qualtrics-return design remain
  open research-owner decisions; nothing here forecloses them.

## Recommended next unit

Research-owner decision pack execution for participant-mode ingestion
(INT-1/INT-2/INT-5 + D2 deployment gating), then a separate unit for the
durable participant export buffer + Qualtrics return handoff. Before any of
that: run the one manual live synthetic verification above against the
development endpoint.
