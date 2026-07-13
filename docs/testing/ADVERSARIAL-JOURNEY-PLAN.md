# Adversarial Journey Plan — Sprint B Part 1 Priority B

Ranked adversarial test architecture for the connected world (2026-07-13).
Baseline suite: 38 tests / 14 spec files, all passing (Sprint A record).
Companion data: `docs/research/research-traceability-matrix.json`
`findings.*` (untested scoring inputs; events lacking direct coverage).

Rules inherited from the sprint brief: fix only demonstrated technical
defects; never change scientific semantics (D2–D8 and event meanings are
user-owned); tests assert **currently authored + documented** behaviour,
never invented gates. Mutually exclusive behavioural branches go in separate
participant sessions (A4 precedent). Documented non-defects (double
`setCurrentRoom`, silent dock fallback, Hazard board line `pending`,
`hazard_status` having no reader, debug `completeDebugSession` unguarded
`objective_completed`, reload double-`session_start`) are asserted as-is,
never "fixed".

## 1. Coverage inventory (mandated case families → existing evidence)

| #   | Case family                                   | Current coverage                                                                                                                                                                                         | Gap                                                                                                                                             |
| --- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Rapid repeated interaction input              | None directly (blind-retry tests repeat deliberate choices, not input spam)                                                                                                                              | **Full**                                                                                                                                        |
| 2   | Repeated room entry/exit                      | Partial: repair leave/return (`repair_room_logging` t3), hazard leave/return (t4), side-repair defer reopen                                                                                              | No multi-cycle sweep; Archive abandon/return path never exercised (`archive_returned_after_failure` — registered Q24/Q25 event, zero spec refs) |
| 3   | Partial progress → Hub return                 | Partial: P2 journey partial-repair re-entry                                                                                                                                                              | Covered adequately via family 2                                                                                                                 |
| 4   | Reload during partial room state              | Partial: `state_session_continuity` t1 reloads at Dock baseline only                                                                                                                                     | **Reload mid-room with partial task state**                                                                                                     |
| 5   | Direct-room launch → ordinary navigation      | Partial: direct launch boots + `current_room_id` (continuity t2)                                                                                                                                         | No follow-on navigation/completion after direct launch                                                                                          |
| 6   | Repeated completion attempts                  | Partial: `objective_completed` exactly-once (repair t4)                                                                                                                                                  | Re-triggering completed stations per room                                                                                                       |
| 7   | Repeated defer / interruption                 | Partial: one defer reopen; interruption one-shot gate (t3)                                                                                                                                               | Multi-defer loop then complete                                                                                                                  |
| 8   | Repeated Hazard decisions                     | Partial: warning repeatable (t1)                                                                                                                                                                         | Repeat decisions across re-entries (per authored repeatable-prompt semantics)                                                                   |
| 9   | Hazard info-check → leave → return → continue | **Covered** (`hazard_control_logging` t4)                                                                                                                                                                | —                                                                                                                                               |
| 10  | Invalid scene query                           | **Covered** (continuity t3)                                                                                                                                                                              | —                                                                                                                                               |
| 11  | Malformed/missing launch params               | Covered for bare launch (lifecycle t1, launch t3)                                                                                                                                                        | Hostile values (dup params, encodings, oversized)                                                                                               |
| 12  | Malformed return_url                          | Covered for one malformed shape (lifecycle t2)                                                                                                                                                           | Additional hostile shapes incl. `javascript:` scheme                                                                                            |
| 13  | Duplicate one-shot event attempts             | Partial per room                                                                                                                                                                                         | Consolidated re-trigger sweep across one-shots                                                                                                  |
| 14  | Stale mission-state display                   | **Covered** (ADV-5: `e2e/adversarial_status_board_display.spec.ts`) — board text verified against `getMissionState()` across untouched/completed/abandoned/deferred/hazard-decision/cross-session states | —                                                                                                                                               |
| 15  | State leakage between participant sessions    | None explicit (each test uses a fresh context by construction)                                                                                                                                           | **Sequential participants in one browser context**                                                                                              |
| 16  | Interrupted return flow                       | None (debug completion path exercised once in launch t2)                                                                                                                                                 | Repeat/interrupt completion; assert documented unguarded behaviour                                                                              |
| 17  | Append-only event-order invariants            | Partial: journey subsequence asserts; prototype fixture order                                                                                                                                            | Dedicated invariant harness (monotonic timestamps, append-only counts, defensive copies)                                                        |

## 2. Ranked adversarial cases

Ranking criteria in order: (1) scientific-data risk, (2) state-corruption
risk, (3) event-duplication risk, (4) participant-flow risk, (5) size of the
current evidence gap.

### P0 — implement first (Priority C order)

- **ADV-1 Cross-session participant isolation** (family 15). Two sequential
  participants load the game in the SAME browser context (fresh `page.goto`
  each, different `participant_id`). Assert: zero event bleed (P2's log
  contains no P1 events; counts start at baseline), mission state reset
  (module-scope stores re-created on load), summary derived only from own
  events, Qualtrics params reflect the new participant on every event.
  Rationale: cross-participant contamination silently corrupts every derived
  variable — highest scientific-data risk; zero current evidence.
- **ADV-2 Reload during partial room state** (family 4). Fail the repair
  once (partial state: failure recorded, room incomplete), reload the page
  in-room-route, then re-enter and complete. Assert: fresh log (no phantom
  `repair_returned_after_failure` from pre-reload state — module stores
  reset), second `session_start` (documented A2 caveat), metadata preserved
  from URL, completion path logs normally post-reload.
- **ADV-3 Duplicate one-shot sweep + Archive abandon/return** (families 2,
  6, 13). Multi-cycle entry/exit of Archive with a failure first:
  `archive_abandoned` on exit-after-failure, `archive_returned_after_failure`
  on re-entry (first live coverage of this registered Q24/Q25 event), then
  repeat cycles asserting the documented per-cycle semantics and that
  session-one-shots (`side_repair_discovered`, `objective_active`,
  `objective_completed`) never re-fire on repeated triggers.
- **ADV-4 Repeated Hazard decisions across re-entries** (family 8). Avoid →
  re-enter → informed continue → re-enter → prompt again. Assert authored
  semantics only: prompt repeatable, warning re-fires per open, each decision
  logs its own event (no invented one-shot gate), `hazard_status` reflects
  the latest decision, `abandonment_count` derives solely from legacy
  `hazard_avoidance` occurrences, informed classification persistence per t4
  precedent. Separate session from ADV-3 (mutually exclusive branches).

### P1 — next

- **ADV-5 Stale mission-state display** (family 14). Complete stations,
  return to Hub each time, read the status board text; assert board lines
  agree with `getMissionState()` (Hazard line stays `pending` — documented
  D1 consequence, asserted as-is).
- **ADV-6 Hostile launch/return battery** (families 11, 12). Duplicate
  query params, URL-encoded junk, oversized values, empty strings,
  `javascript:` and relative `return_url` shapes. Assert: no crash, fallback
  identity rules per PARTICIPANT-LIFECYCLE.md, `buildReturnUrl` returns
  null-or-well-formed only.
- **ADV-7 Rapid repeated input** (family 1). Key-spam SPACE and option keys
  during prompt open/decision (hold + repeat). Assert one decision → one
  event set; no duplicate legacy/canonical pairs.
- **ADV-8 Direct-room launch → ordinary navigation** (family 5). Launch
  `?scene=hazard` directly, decide, walk out to Hub, complete another
  station. Assert `current_room_id` tracking, metadata continuity, no
  double room-entry artifacts.

### P2 — as capacity allows

- **ADV-9 Append-only/event-order invariant harness** (family 17):
  monotonic `timestamp_ms`/`elapsed_seconds` per log, log length strictly
  non-decreasing across probes, `getEvents()` mutation does not affect the
  runtime log (defensive copy), `getSummary()` purity (A2 precedent).
- **ADV-10 Interrupted/repeated return flow** (family 16):
  `completeDebugSession()` twice → second `objective_completed` logged
  (documented unguarded behaviour, asserted not fixed); reload after
  completion → fresh session per ADV-2 semantics.
- **ADV-11 Repeated defer loop** (family 7): defer side repair ×3 across
  exits, then complete; assert offer reopens each time, defer events count
  per authored semantics, completion still unlocks the bonus.

## 3. Implementation notes

- Use `e2e/journey.ts` + `e2e/helpers.ts` primitives (count-aware waits:
  capture baselines BEFORE the triggering action; NW-anchor hub routes).
- SwiftShader launch args in `playwright.config.ts` are load-bearing.
- Debugging: targeted spec runs only; no full-suite loops; no screenshots
  unless a failure needs one. First stop for any failure:
  `docs/ai/DEBUGGING-CHECKLIST.md`.
- Each ADV case lands as its own spec (or extends the closest existing
  spec) in a separate commit with state/handoff updates.
- Anything requiring a scientific ruling (e.g. if repeated-decision
  semantics turn out undocumented for a branch) is documented in the
  handoff as an exact question and the case is narrowed to the documented
  subset — never widened by inference.
