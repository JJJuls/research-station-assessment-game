# FABLE-NEXT-05 — Real interruption/return mechanic + Final Core closure integrity

Implementation-ready task file (do not execute in the blueprint pass).
Parent: roadmap Stage 1 unit 1.3; contract §R7 (+§R8 closure, §R5 note).

## Objective

Rebuild the Interruption Corridor around a genuinely competing objective
with an observed return act, and verify Final Core closure events reflect
it. Hazard Control is explicitly NOT rebuilt here (its consequence
mechanic is UD-HAZARD-CONSEQUENCE, user-owned; its Q27/Q31 tags are
SA-1/SA-3) — this unit only re-verifies Hazard regression.

## Q mappings

- Q15 (finish what is begun): interruption of a genuinely pending
  objective; observed return; completion after interruption.
- Q17 (diverted, exploratory): inspect/switch with a later return
  opportunity.
- Q19 (goal switch, exploratory): new goal offered/accepted while prior
  commitment pending; abandonment observable.
- Q18 (weak proxy): `objective_active` semantics unchanged.
- Q08: ignore branch (`task_avoidance`) unchanged.

## Player mechanic (via `psychometric-task-design` gate before coding)

The Comms Beacon offers a real small task at a second corridor station
(balanced framing: not more urgent, not more valuable — framing recorded
in metadata). If the player switches, the competing task actually runs
(1-2 interactions). The prior objective (e.g. accepted relay duty or an
in-progress room task) stays visible on the roster; returning to and
finishing it is a physical act at its own station. One later return
opportunity is guaranteed before Final Core.

## Raw events (decided BEFORE coding — approved, schema-listed)

Emit (with per-event triggers and duplication rules decided BEFORE
coding — the schema rows for these are bare "missing" entries, so this
table is the unit's binding proposal; any residual ambiguity goes to the
research owner, not into code):

| Event                               | Fires at (one distinct semantic moment each)                                                                                                                                                                                               | Duplication  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| `interruption_received`             | Comms offer presented                                                                                                                                                                                                                      | once/session |
| `new_goal_offered`                  | competing objective concretely offered (with framing metadata)                                                                                                                                                                             | once/session |
| `goal_switch_accepted`              | player commits to the competing task                                                                                                                                                                                                       | once/session |
| `switched_task`                     | player begins the competing task's first interaction                                                                                                                                                                                       | once/session |
| `return_to_unfinished_task`         | the observed return ACT: re-engaging the original task's station after having switched                                                                                                                                                     | once/session |
| `returned_to_original_task`         | same physical moment as the return act when the original is the pre-interruption objective — **flag to research owner whether it co-fires with `return_to_unfinished_task` (Q15 vs Q17 carriers) or one is folded; do not decide locally** | once/session |
| `prior_goal_completed`              | the original objective's completion interaction finishes                                                                                                                                                                                   | once/session |
| `task_completed_after_interruption` | completion of the ORIGINAL task when an interruption occurred earlier in the session — same act as `prior_goal_completed`; shared-evidence, never analysed as two observations                                                             | once/session |
| `prior_goal_abandoned`              | Final-Core-bound closure with the original never re-engaged, or explicit abandon act                                                                                                                                                       | once/session |
| `task_avoidance`                    | ignore branch (unchanged)                                                                                                                                                                                                                  | unchanged    |
| `objective_active`                  | unchanged state-grounded semantics                                                                                                                                                                                                         | once/session |
| `final_unresolved_due_to_nonreturn` | Final Core (unchanged)                                                                                                                                                                                                                     | once/session |

Metadata keys introduced here (offer framing, task ids) must have their
placement recorded in event-schema.md as an additive clarification
(`control_error_count` precedent), not only in the room doc.

NOT emitted (blocked/candidate): `competing_task_viewed` (**D6** — leave
unemitted; keep legacy `interruption_alert_acknowledged` as-is),
`excessive_idle_after_instruction` (**D3**), `task_deferred`
(CANDIDATE), `task_started` (**D7**). Legacy derived-style events:
**`interruption_focus_lost` and `interruption_alert_acknowledged` ARE
consumed by ScoringManager summary formulas — they must be KEPT and
flagged**; raw-vs-derived cleanup for consumed names belongs to the
D2-family scoring pass, not this unit. Unconsumed derived-style names may
be dropped only with room doc + specs updated in the same pass.

## Candidate variables

`return_to_task_rate` (approved target, currently count-based),
`goal_switch_without_return_count` (approved target, missing),
`distraction_switch_rate` (CANDIDATE, exploratory label mandatory) — all
wired only in the D2-family scoring pass.

## Validity risks

- Switching is rational: only non-return with a valid original is
  negative — later return opportunity is mandatory.
- Offer balance is a validity requirement: log framing metadata.
- Q29/Q31 dependency: if SA-3's horizon choice ever lands, its initial
  choice must be logged BEFORE this module can fire — keep the corridor
  entry order configurable.
- One-shot semantics: interruption remains once per session;
  `objective_active` stays state-grounded (never re-fired).
- No-pending-objective branch: a participant can reach the corridor with
  nothing genuinely pending (relay duty declined, prior rooms complete).
  Define this explicitly as a **no-opportunity state** for Q15/Q17/Q19 —
  the interruption offer may still fire as general gameplay, but no
  switch/return observation is interpretable; record the state so
  analysts can exclude it (per the opportunity-flag rule; the coding
  convention itself stays within the open spec §8.2 family — flag, don't
  invent a payload rule).

## Bounded scope

`src/scenes/InterruptionScene.ts` (+ second station), additive
SessionState record for the competing objective (never touching
`active_objectives` semantics used by Q18 without research review),
`FinalCoreScene.ts` only if closure reads change shape (prefer none),
room doc 07 update. No Hazard changes; no registration edits; no scoring.

## Tests / reviews

Rebuild `interruption_corridor_logging.spec.ts`: switch→do competing
task→observed return→original completed; switch→never return→
`prior_goal_abandoned` + Final Core `final_unresolved_due_to_nonreturn`;
ignore path; `objective_active` one-shot; journey P2 regression; Hazard
spec regression untouched-green. Then the three reviewers in order.

## Preservation constraints

Q18 event semantics frozen; scenario layer untouched; duty-roster HUD
lines may gain the competing-task label (labels only, no scores); Final
Core route gate untouched.

## Git

Isolated worktree branch; local commits only. **No push, no merge, no
PR.**
