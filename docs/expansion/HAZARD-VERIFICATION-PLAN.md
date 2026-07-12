# Hazard Control — Consolidated Playwright Verification Plan

- **Room under verification**: `hazard_control_room` (`HazardScene`,
  implemented at `ecd2256` per user ruling D1; room doc
  `docs/game/rooms/05-hazard-control.md`).
- **Gate rule**: Playwright (test runner via `npx playwright test`, serial,
  dev server port 5173 per `playwright.config.ts`) is enabled **only** for
  this verification gate. No PixelLab. Fix only demonstrated defects; any
  fix is followed by a re-run of the affected specs.
- **Spec**: `e2e/hazard_control_logging.spec.ts` (new, V3 §9 required name),
  using the shared `e2e/helpers.ts` fixtures (`hubToStationDoor` hazard
  route tuned during this pass if needed — sealed-room routes were authored
  untested in U6).
- **Regression**: the full existing suite (24 tests across 9 specs) must
  still pass — the registry flip opens a previously sealed Hub door, which
  touches shared presentation.

## Test matrix (all with `room_id: "hazard_control_room"`, `task_id: "hazard_route_decision"`)

| #   | Branch                                     | Drive                                                                                        | Expected events (exact payload pins)                                                                                                                                                                                                                                                                                      |
| --- | ------------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | Entry, reachability, return                | Hub → Hazard door → terminal → back to Hub                                                   | `hazard_room_entered` on each entry (no `study_item_ids`/`construct_id` — unmapped precedent); terminal reachable (prompt opens); door returns player to Hub at the hazard `hubSpawn`; no fatal console errors                                                                                                            |
| H2  | Warning repeatability                      | Open prompt twice without deciding                                                           | `hazard_warning_seen` ×2 (`Q12`/`prudence` each time; prototype has no one-shot)                                                                                                                                                                                                                                          |
| H3  | Information checked                        | Option 1                                                                                     | `hazard_info_checked` — `study_item_ids ['Q12','Q27']`, **no** `construct_id` (dual-listing precedent), no success                                                                                                                                                                                                        |
| H4  | Informed continuation                      | Option 1 then option 2                                                                       | `hazard_informed_continue` — `['Q31']`, `goal_time_exploratory`, no success, **no metadata**; `hazard_status = 'informed_continue'`                                                                                                                                                                                       |
| H5  | Reckless continuation                      | Fresh session, option 2 directly                                                             | `hazard_reckless_continue` — `['Q12','Q27','Q31']`, `inappropriate_persistence`, `success: null`, `metadata.info_checked_before_continuing: false`; `hazard_status = 'reckless_continue'`; NO `hazard_informed_continue`                                                                                                  |
| H6  | Route avoided (D1)                         | Fresh session, option 3                                                                      | Legacy `hazard_avoidance` (unregistered — no `study_item_ids`/`construct_id` fields) AND canonical `hazard_route_avoided` — `study_item_ids: []`, **no** `construct_id`, no success; `hazard_status = 'route_avoided'`; NO continue/info events                                                                           |
| H7  | Leave-and-return informed classification   | Option 1 → exit to Hub → re-enter → option 2                                                 | `hazard_room_entered` ×2; final continue logs `hazard_informed_continue` (session-lifetime `infoChecked` survives scene restart — prototype parity)                                                                                                                                                                       |
| H8  | No construct-scoring contribution (D1)     | After H6 session                                                                             | `computeSummary()` (debug `printSummary()`/`getEvents()` path): `abandonment_count = 1` (legacy derivation intact, ScoringManager.ts:88); `game_inappropriate_persistence = 0`; `blind_retry_count = 0`; `game_uncertainty_persistence = 0`; no other variable moved by `hazard_route_avoided` (it appears in no formula) |
| H9  | Reckless scoring compatibility             | After H5 session                                                                             | `game_inappropriate_persistence = 1` and `blind_retry_count = 1` via the PRE-EXISTING `hazard_reckless_continue` term (formula unchanged this beat); `abandonment_count = 0`                                                                                                                                              |
| H10 | Qualtrics/session metadata                 | Launch `?scene=hazard&participant_id=...&game_session_id=...&condition=...&game_version=...` | Every hazard event carries `session_id`, `participant_id`, `game_session_id`, `condition`, `game_version`, `timestamp_ms`, `elapsed_seconds` (ResearchRuntime append; caller fields never overridden)                                                                                                                     |
| H11 | Completion/abandonment semantics preserved | After any decision                                                                           | `completed_rooms` does NOT include `hazard_control_room` (legacy repeatable semantics — no invented completion gate); no abandonment event exists or fires for this room (avoidance ≠ abandonment per D1); re-opening the prompt after a decision still works                                                             |

## Explicit D1 invariants verified

1. `hazard_route_avoided` emitted **additively beside** legacy
   `hazard_avoidance` (both present, in that order, on one avoid choice).
2. `hazard_route_avoided` carries `study_item_ids: []` and no
   `construct_id` — raw telemetry only.
3. `hazard_info_checked` fires **only** on the info-check option (H3), never
   on avoidance (H6 asserts its absence).
4. Avoidance, info-checking, informed continuation, reckless continuation,
   and abandonment remain analytically distinct (each asserted by presence
   AND absence across H3-H6).
5. `abandonment_count` compatibility: still derives solely from legacy
   `hazard_avoidance` (H8).

## Procedure

1. `npm.cmd run build` + `npm.cmd run lint:tsc` (already green at `ecd2256`).
2. Author `e2e/hazard_control_logging.spec.ts` (compile-checked via tsc as
   part of the suite).
3. Run the hazard spec headless; then the full suite (existing 24 + new).
4. Any failure: diagnose first — distinguish test-choreography issues
   (route/wait tuning, allowed) from real defects (fix minimally, document,
   re-run). Never patch game logic just to make a check pass without
   documenting the defect.
5. Record results (pass counts, defects found/fixed, event payload evidence)
   in `docs/testing/hazard-verification/HAZARD-EVIDENCE.md`; final
   verification commit.
