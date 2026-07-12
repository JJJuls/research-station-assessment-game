# Cross-Room Integration Contract

Sprint A Phase A5 audit at `278f9ef`. Companion to the A1 transition
contract and A2 continuity contract. Documents every cross-room data flow:
who writes shared state, who reads it, and where the flows are deliberately
open. Scientific boundary: nothing here defines new semantics; the Hazard →
Final Core consequence is explicitly recorded as UNSPECIFIED, not designed.

## 1. Writers → readers matrix (SessionState mission fields)

| Field                                                      | Writers                                                                                                                | Readers                                                                                                                                                         | Runtime-verified                                        |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `current_room_id`                                          | `transitionToRoom` + every `RoomScene.create`                                                                          | debug API probes                                                                                                                                                | A2 spec, A3 smoke, A4 journeys                          |
| `completed_rooms`                                          | Dock, Archive, Repair (via completion), Engineer, Inventory, SideRepair, Interruption, FinalCore (`markRoomCompleted`) | Hub status board (`logged`/`pending` per line); each room's own redo gate; `logObjectiveCompletedIfBothDone` (Archive+Repair parity); FinalCore duty/redo logic | A4 P1/P2 (gates + parity)                               |
| `prepared_items` (`field_kit`)                             | Inventory (all completing paths except shortcut)                                                                       | FinalCore entry flag (`final_core_missing_item_flagged`) + blocker label                                                                                        | A4 P1 (absent), P2 (fires)                              |
| `workspace_status` (tidy/disordered)                       | Inventory (per path)                                                                                                   | FinalCore entry flag (`final_core_workspace_issue_flagged`) + blocker label                                                                                     | A4 P1 (tidy → no flag)                                  |
| `accepted_duties` / `skipped_duties` (`relay_supervision`) | Engineer (accept/decline; mutually exclusive)                                                                          | FinalCore duty follow-through (`engineer_supervision_completed` / `accepted_duty_unresolved`) + blocker label                                                   | A4 P1 (completed), P2 (declined → no unresolved event)  |
| `active_objectives` (`relay_supervision`)                  | Engineer (add), FinalCore resolve path (remove)                                                                        | Interruption `objective_active` (state-grounded Q18, once); FinalCore `isRelayDutyActive`                                                                       | A4 P1 (fires + cleared), P2 (absent)                    |
| `unresolved_objectives`                                    | — (no writer anywhere)                                                                                                 | — (no reader)                                                                                                                                                   | reserved vocabulary, not a defect                       |
| `hazard_status`                                            | Hazard (informed_continue / reckless_continue / route_avoided; last selection wins)                                    | **none** — see §3                                                                                                                                               | A4 all three branches (writes verified via debug probe) |
| `side_repair_status`                                       | SideRepair (ignored / abandoned_after_start / deferred / completed)                                                    | FinalCore entry flag (`final_core_stability_bonus` on completed)                                                                                                | A4 P1/P3 (bonus fires), P2 (absent)                     |
| `interruption_status`                                      | Interruption (switched_away / returned_to_task / alert_ignored)                                                        | FinalCore entry flag (`final_unresolved_due_to_nonreturn` on switched_away) + blocker label                                                                     | A4 P2 (fires), P1/P3 (absent)                           |
| `final_core_status`                                        | FinalCore (completed_low_quality / \_structured / \_high_quality / \_forced)                                           | debug API only (terminal state)                                                                                                                                 | A4 P1/P2/P3                                             |

Cross-room event-ordering, revisit/stale-state, duplicate-state, and
completion/return flows are runtime-verified by the A3 smoke + A4 journeys
(see `docs/testing/connected-journey/CONNECTED-JOURNEY-EVIDENCE.md`); the
A2 contract covers the underlying store lifetimes.

## 2. Status-board presentation

The Hub status board is the only shared-progress UI: registry-driven, one
line per open station (`statusBoardLabel`: `logged`/`pending` from
`completed_rooms`), plus the Dock check-in line. It reads live state at
open time (never cached), shows checklist labels only — no scores, no
personality feedback (V3 §2 allowed-progress rule). Hazard Control has a
`statusBoardLabel` but no completion writer (D1: no invented completion
gate), so its line permanently reads `pending` — presentation-consistent
with "no completion gate", not a defect. Sealed-room collective line is
unreachable while all eight stations are open.

## 3. Hazard → Final Core: the three-layer split (DO NOT CONFLATE)

1. **Technically available**: `SessionState.hazard_status` is written on
   every Hazard branch selection and survives all transitions (verified
   live in A4 across all three branches). Any future consumer has a
   reliable, already-tested source.
2. **Currently consumed**: nothing reads `hazard_status`. Final Core's
   entry flags, blocker labels, and option events take no Hazard input;
   the Hub board shows no Hazard completion. This is the implemented,
   verified state of the game.
3. **Scientifically unspecified (user-owned)**: `hazard_issue_created`,
   `hazard_issue_resolved`, and `final_hazard_issue` have no documented
   emission semantics, no resolve mechanic, and no defined Final Core
   consequence (event-schema.md §4 "missing" rows). Whether avoiding or
   recklessly continuing should create a Final Core issue, a blocker
   label, or a scoring input is a task-design decision that MUST NOT be
   implemented autonomously. Nothing in this sprint changed that.

## 4. Known integration asymmetries (documented, user-owned)

1. **Inventory organization scoring split** (found in A4): ScoringManager's
   organization formulas count the legacy option-3 event names
   (`inventory_kit_verified`, `inventory_cleanup_completed`,
   `inventory_workspace_sorted`); the chained systematic path emits only
   canonical names (`inventory_verified_complete`, `cleanup_completed`,
   `workspace_tidy_confirmed`). Raw logs contain everything; formulas are
   frozen until Beat-13.
2. **`final_core_completed` (summary) vs canonical `final_core_completed`
   (event)**: the summary boolean derives from legacy quick/structured/high
   completion events only, so the forced path yields
   `final_core_completion_quality: 'none'`-adjacent behaviour ('none' is
   impossible once a legacy completion event fired; forced emits none of
   them). Frozen formula; Beat-13 scope.
3. **Hazard board line permanently `pending`** (§2) — presentation
   consequence of D1's no-gate ruling.

## 5. Audit result

Zero technical defects with authoritative intended semantics. All flows in
§1 behave as documented and are runtime-verified. The open items (§3, §4)
are scientific decisions, recorded in the Sprint A handoff.
