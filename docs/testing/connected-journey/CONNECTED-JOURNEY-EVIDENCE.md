# Connected Participant Journey Evidence (Sprint A, Phase A4)

Runs executed 2026-07-13 on the Sprint A branch (base `201c8fa`, journey
infra `76c91f2`), Playwright CLI, headless Chromium + SwiftShader, serial
worker against a persistent Vite dev server. Spec:
`e2e/connected_participant_journeys.spec.ts` (plus the A3 navigation smoke
`e2e/connected_world_smoke.spec.ts`).

## Session design

Three participant sessions, because the Hazard branches (informed /
reckless / avoided), Engineer duty accept/decline, and the Interruption
options are mutually exclusive within one participant — mixing them would
contaminate the frozen summary formulas (`blind_retry_count`,
`game_uncertainty_persistence`, `abandonment_count`) and invalidate the
evidence. All journeys traverse REAL doors only (no mid-session `?scene=`
launches); every leg waits count-aware on the target `scene_start`.

| Session            | Coverage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1 `A4_JOURNEY_S1` | Qualtrics params incl. return_url; dock review path; inventory systematic (checklist → verify → cleanup); engineer prepared report + duty accepted; side repair completed; interruption acknowledged+returned (state-grounded `objective_active` with the duty live); hazard info-check → informed continue; archive fail→feedback→revise; repair fail→manual→revise (`objective_completed` parity, exactly once); final core resolve (duty follow-through → `engineer_supervision_completed`, high quality); full return flow. |
| P2 `A4_JOURNEY_S2` | Dock skip; inventory shortcut (no kit); engineer unprepared + duty declined; interruption switch-away; repair partial: fail → exit (`repair_abandoned`) → re-enter (`repair_returned_after_failure`) → exit unfinished (`repair_abandoned` ×2, room never completed); hazard reckless continue (live `info_checked_before_continuing: false` metadata); final core blocker (missing kit + non-return flags) → force continue.                                                                                                   |
| P3 `A4_JOURNEY_S3` | Dock practice path; side repair defer → exit → re-enter → complete (defer ≠ completion; offer reopens; `side_repair_discovered` still once); hazard route avoided (legacy `hazard_avoidance` + canonical `hazard_route_avoided`, D1 pins verified live: `study_item_ids []`, no construct); interruption alert ignored; archive same-wrong-code repeat (blind retry) then adaptive completion; final core quick sync (rushed, low quality, blocker present but options 1-3 available).                                          |

## Results

- **3/3 journeys PASS** (P2, P3 first-attempt in the full-file run; P1
  re-run PASS after an assertion correction — see below). Combined with the
  A3 smoke: entry AND return verified for all eight stations through real
  doors, both Dock↔Hub directions, 10 Hub entries in one session.
- **Mission-state propagation** asserted live at every stage boundary:
  `current_room_id`, `completed_rooms`, `prepared_items`, duties/objectives,
  `workspace_status`, and all five room-status fields
  (informed_continue / reckless_continue / route_avoided / switched_away /
  returned_to_task / alert_ignored / deferred→completed /
  completed_high_quality / completed_forced / completed_low_quality).
- **Event ordering** asserted as journey-order subsequences over the raw
  append-only log (P1: 18 signature events; P2: 14; P3: 14).
- **One-shot protection under real navigation**: `session_start`,
  `dock_started`, `side_repair_discovered`, `objective_completed`,
  `objective_active` each exactly once per session.
- **Metadata**: every event in every session carries the launch
  `participant_id`/`game_session_id`/`condition`/`game_version`; P1's
  return URL preserves the original Qualtrics query and appends the summary.
- **Console/page errors: zero** in all three sessions (listeners installed
  before boot).
- **Frozen-summary spot checks**: P1 separation invariants
  (inappropriate=0, blind=0, abandonment=0, uncertainty=2, quality high);
  P2 (inappropriate=1 from reckless only, blind=1, abandonment=0,
  uncertainty=0); P3 (abandonment=1 from legacy `hazard_avoidance`,
  blind=1 from the repeated wrong code, quality low).

## Defects found

- **Game defects: none.** All three journeys ran end-to-end through the
  real world with correct events, state, and summaries.
- **Spec defect (fixed in-place)**: P1 initially asserted the ScoringManager
  event names `inventory_kit_verified`/`inventory_cleanup_completed` on the
  systematic path; the chained checklist→verify→cleanup stages emit the
  canonical `inventory_verified_complete`/`cleanup_completed` instead.

## Observation for Beat-13 (user-owned; NOT changed)

The ScoringManager organization formulas count the legacy option-3 names
(`inventory_kit_verified`, `inventory_cleanup_completed`,
`inventory_workspace_sorted`). The systematic multi-stage path (option 2 →
verify → cleanup) emits only the canonical names, so
`organization_kit_verified` stays `false` and cleanup counts stay 0 for
participants who verify the kit via the chained stages. Both event sets are
correctly logged raw, so this is recoverable analytically; whether the
frozen formulas should also count the canonical names is a Beat-13 scoring
decision. Recorded in the Sprint A handoff as an unresolved scientific
decision.
