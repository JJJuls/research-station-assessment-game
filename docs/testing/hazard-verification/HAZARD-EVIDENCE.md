# Hazard Control — Verification Evidence

- **Plan executed**: `docs/expansion/HAZARD-VERIFICATION-PLAN.md` (H1-H11 +
  five D1 invariants). Implementation under test: `ecd2256`
  (`HazardScene`, station beat 7, post-D1 ruling `f27130d`).
- **Environment**: Playwright test runner (`npx playwright test`, serial,
  Vite dev server port 5173 per `playwright.config.ts`), real Chromium.
  Playwright was enabled for this verification gate only; no Playwright MCP,
  no PixelLab.

## 1. Results

| Run | Scope                                                                       | Result                                                                               |
| --- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1   | `hazard_control_logging.spec.ts` (4 tests)                                  | **4/4 PASS** (1 pass-on-retry, see §3)                                               |
| 2   | **Full suite** — 9 prior specs (24 tests) + hazard (4 tests) = 28           | **28/28 PASS, 0 failures** (2 pass-on-retry, both pre-existing specs, see §3)        |
| 3   | `hazard_control_logging.spec.ts` re-run with added console-error assertions | **4/4 PASS**; zero `pageerror`, zero console `error` messages across the driven path |

All four hazard tests passed on the first attempt inside the full-suite run
(run 2, rows: `hazard_control_logging.spec.ts` ×4 PASS, no retry).

## 2. Plan-item coverage (all verified live, exact payload pins)

- **H1 entry/reachability/return**: `hazard_room_entered` on entry
  (`room_id: hazard_control_room`, no `study_item_ids`, no `construct_id` —
  unmapped precedent); terminal reachable from spawn (up-clamp + SPACE);
  Hub return door works; **no console errors or uncaught page errors**
  (run 3 explicit listeners). The U6-authored `hubToStationDoor` hazard
  route worked **as authored** — no tuning needed.
- **H2 warning repeatability**: `hazard_warning_seen` ×2 across two prompt
  opens (Q12/`prudence` each); no one-shot gate (prototype parity).
- **H3 information checked**: `hazard_info_checked` — `['Q12','Q27']`,
  construct deliberately unset, no success.
- **H4 informed continuation**: `hazard_informed_continue` — `['Q31']`,
  `goal_time_exploratory`, no success, **no metadata**;
  `hazard_status = 'informed_continue'`.
- **H5 reckless continuation**: `hazard_reckless_continue` —
  `['Q12','Q27','Q31']`, `inappropriate_persistence`, `success: null`,
  `metadata.info_checked_before_continuing: false` (live-computed);
  no informed/info-checked events; `hazard_status = 'reckless_continue'`.
- **H6 route avoided (D1)**: exactly one legacy `hazard_avoidance`
  (unregistered — no science fields) AND exactly one canonical
  `hazard_route_avoided` (`study_item_ids: []`, no `construct_id`, no
  success), legacy logged first, both from the single avoid choice; no
  info/continue events; `hazard_status = 'route_avoided'`.
- **H7 leave-and-return**: info-check → exit to Hub → re-enter
  (`hazard_room_entered` ×2) → continue logs `hazard_informed_continue`
  (session-lifetime `infoChecked` survives the scene restart — prototype
  Main-scene parity).
- **H8 no construct-scoring contribution (D1)**: after the avoid-only
  session: `abandonment_count = 1` (sole source: legacy `hazard_avoidance`,
  ScoringManager.ts:88 unchanged), `game_inappropriate_persistence = 0`,
  `blind_retry_count = 0`, `game_uncertainty_persistence = 0`.
  `hazard_route_avoided` appears in no ScoringManager formula (repo grep +
  runtime summary both confirm).
- **H9 reckless scoring compatibility**: `game_inappropriate_persistence = 1`
  and `blind_retry_count = 1` via the pre-existing reckless term;
  `abandonment_count = 0` (formula untouched this beat).
- **H10 Qualtrics/session metadata**: `participant_id`, `game_session_id`,
  `condition`, `game_version` reflected verbatim from launch params on
  hazard events, plus `session_id`, `timestamp_ms`, `elapsed_seconds`.
- **H11 completion/abandonment semantics**: `completed_rooms` never gains
  `hazard_control_room` (no invented completion gate — legacy repeatable
  semantics preserved); prompt reopens after a decision (warning fires
  again); no abandonment event exists or fires for this room (avoidance ≠
  abandonment per D1).

All five explicit D1 invariants from the plan are covered by H3-H6 + H8
presence-AND-absence assertions.

## 3. Flake analysis (no game defect)

Each run's FIRST test occasionally hit `bootGame`'s 60s `waitForFunction`
timeout and passed on retry: the documented cold Vite dep-graph compile on a
cold dev server (`e2e/helpers.ts` bootGame comment). In the full-suite run
the two pass-on-retry tests were pre-existing specs
(`archive_room_logging` adaptive path, `final_core_summary` rushed path) —
the same first-load/timing class, unrelated to Hazard Control. No assertion
about game behaviour ever failed; no fix applied (nothing demonstrated).

## 4. Defects found / fixed

**None.** Zero game-code changes were needed during verification; the spec
gained only the H1 console-error listeners between run 1 and run 3
(test-side addition, not a fix). The Side-Repair-class geometry defect was
avoided at design time (central approach lane kept clear per the Wave 1B
finding).

## 5. Gates at completion

- `npm.cmd run build`: PASS (pre-existing chunk-size warning only).
- `npm.cmd run lint:tsc`: PASS.
- ScoringManager/QualtricsBridge: zero diff this beat (git history:
  `ecd2256` touches neither).
- Raw-run JSON artifacts retained in the session scratchpad
  (hazard-run.json, full-run.json, hazard-run2.json).
