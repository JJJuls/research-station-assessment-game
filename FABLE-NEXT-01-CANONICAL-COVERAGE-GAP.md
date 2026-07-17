# FABLE-NEXT-01 — Canonical coverage-gap verification and low-risk closure

Implementation-ready task file (do not execute in the blueprint pass).
Parent: `docs/game/Q01-Q33-IMPLEMENTATION-ROADMAP.md` Stage 1, unit 1.1.

## Objective

Verify the blueprint's coverage claims against the live tree and close the
LOW-RISK gaps only: test-coverage debt for already-emitted, already-
registered events, and any missing logging call for an event that is
schema-approved, registered, and whose mechanic already exists. No new
mechanics, no new event names, no registration changes.

## Q mappings

Cross-cutting. Directly touched raw events keep their existing approved
mappings (e.g. `archive_returned_after_failure` Q24/Q25 family). Nothing
is re-tagged.

## Player mechanic

None added. This unit only asserts and completes logging around existing
mechanics.

## Raw events (decide before coding — all already approved and registered)

- Spec coverage debt (assert, don't change): the 17 emitted events with no
  direct spec reference and the 10 ScoringManager input events referenced
  by no spec — both lists live in
  `docs/research/RESEARCH-TRACEABILITY-MATRIX.md` §5 (mirrored in the
  2026-07-16 gap audit §15; incl. `archive_returned_after_failure`,
  `archive_log_compared`).
- Missing-call audit: confirm every event marked "emitted" in the
  2026-07-16 gap audit actually emits at `bfca741` (drift check).
- Explicitly OUT: every CANDIDATE name, every D/SA/INT-gated event
  (`task_started`, `baseline_idle_seconds`, `competing_task_viewed`,
  utility-stop/HOR/GRA families), `engineer_report_accuracy_scored`
  (FABLE-NEXT-04), `side_repair_step_completed` (FABLE-NEXT-03),
  per-item inventory events (FABLE-NEXT-02).

## Candidate variables

None. No ScoringManager change in this unit.

## Validity risks

- Freezing wrong payloads: new assertions must pin the CURRENT committed
  registrations (frozen-data rule), including the SA-pending stale tags —
  tests document reality; they never anticipate rulings.
- Scope creep into gated work — the OUT list above is binding.

## Bounded scope

- Files: `e2e/*.spec.ts` (new/extended assertions), at most trivial
  logging-call additions inside existing scene handlers.
- One pass; no scene flow changes; no SessionState shape changes; no
  `package.json`; no CanonicalEventContext edits.

## Tests / verification

- FIRST STEP: re-derive both `RESEARCH-TRACEABILITY-MATRIX.md` §5 lists
  against the live suite before asserting anything — at least three of
  the 17 entries are already covered (`archive_returned_after_failure`
  via ADV-3, `station_hub_status_board_viewed`, `final_core_opened`);
  the emission drift-check does not cover spec coverage.
- `npm.cmd run lint:tsc`, `npm.cmd run build`.
- New/extended specs green; then affected-area regression set green.
- Do not run the full suite (76 tests at `bfca741`) concurrently with
  another agent's Playwright work; use `PW_DEV_PORT` isolation in a
  worktree.

## Reviews

`research-data-reviewer` (assertion correctness vs registrations) →
`gameplay-implementation-reviewer` (no flow changes) →
`browser-qa-reviewer` (runtime evidence for any new logging call).

## Preservation constraints

EventLogger/SessionState/QualtricsBridge/DataQualityTracker/
ScoringManager/ResearchRuntime untouched. Scenario layer untouched.
Duty-roster HUD and Final Core route gate untouched.

## Git

Work in an isolated worktree branch. Commit locally with a scoped
message. **Do not push, do not merge, do not open a PR** — integration is
operator-owned.
