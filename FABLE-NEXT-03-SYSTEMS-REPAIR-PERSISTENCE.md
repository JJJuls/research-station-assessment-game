# FABLE-NEXT-03 — Repair/Side-Repair persistence-substrate hardening

Implementation-ready task file (do not execute in the blueprint pass).
Parent: roadmap Stage 1 unit 1.5; contracts §R2 and §R6.

## Objective

Make effort and follow-through observed rather than asserted in the two
persistence arcs: (A) Side Repair becomes a real multi-step task; (B)
Systems Repair supports a bounded multi-cycle difficulty sequence using
existing approved events + `attempt_number`.

## Q mappings

- A: Q07 (completion after acceptance across real steps), Q16 (sustained
  accurate steps), Q20 weak (start-without-sustain becomes observable —
  still questionnaire-primary, no Q20 score).
- B: Q14/Q21 (useful effort, continued engagement), Q23/Q26 (adaptive vs
  identical retries across cycles), Q24/Q25 (abandon/return unchanged).

## Player mechanic (via `psychometric-task-design` gate before coding)

A: after acceptance, 3 steps — fetch component from parts shelf, fit at
console, run check. Defer keeps progress; abandonment after step ≥1 is a
real walk-away; completion requires all steps. Difficulty rises mildly at
step 2 (stable utility; no stop signal — Q27's utility-stop stage remains
SA-2-gated and is NOT built here).
B: the repair allows up to N (2-3) failed cycles before the manual-guided
revision succeeds; each cycle is a distinct submitted sequence with
`attempt_number`; identical resubmission still detected.

## Raw events (decided BEFORE coding)

A emits (approved): `side_repair_step_completed` (per step; step ids in
`metadata.step` — record this payload placement in event-schema.md as an
additive clarification, `control_error_count` precedent, not only in the
room doc), plus the existing accept/defer/abandon/complete family
unchanged. B emits (approved, no new names):
`repair_sequence_submitted`/`repair_failed`/`repair_strategy_revision`/
`repair_same_sequence_repeated`/`repair_completed` with `attempt_number`
incrementing.

NOT emitted (CANDIDATES — need event-schema decisions; flag, don't build):
`repair_step_completed`/`repair_diagnostic_completed` (Systems Repair
step granularity), `side_repair_returned`, any anomaly-arc name
(`anomaly_*`), any utility-stop name (`utility_stop_signal` etc. — SA-2).

## Candidate variables

None wired here. `optional_followthrough_rate`,
`accepted_task_completion_rate`, `adaptive_retry_count` stay
CANDIDATE/target for the D2-family scoring pass. Note for that pass: with
multi-cycle B, `blind_retry_count` semantics must be re-checked so
debounce still excludes input bounce (ADV-7 stays green).

## Validity risks

- One-press non-independence (Q07/Q16/Q20/Q29/Q32 on a single completion)
  is reduced but not resolved — SA-3/SA-5 still own the Q29/Q32 tags; do
  not touch registrations.
- Duration is never effort: step counts and revision acts, not time.
- Difficulty inflation: steps stay trivial motorically; no dexterity.
- Q20 claims: none — start-without-sustain remains a weak proxy, no score.

## Bounded scope

Two scenes only (`SideRepairScene.ts`, `RepairScene.ts`), shared
`roomTaskState.ts` if needed, parts-shelf station addition in Side Repair,
room docs 02/06 updates. No registration edits, no scoring edits, no new
event names, no other rooms.

## Tests / reviews

Extend `side_repair_logging.spec.ts` (step path, defer-resume across
rooms, abandon-at-step-2) and `repair_room_logging.spec.ts` (multi-cycle
adaptive, multi-cycle identical-repeat, abandon/return unchanged);
ADV-7 re-run. Then the three reviewers in order.

## Preservation constraints

Legacy events and payloads unchanged; existing one-press paths retired
only where replaced by observed equivalents that keep every legacy event
firing at the same semantic moment (accept on accept, complete on
complete). `final_bonus_unlocked`/`final_core_stability_bonus` behaviour
unchanged.

## Git

Isolated worktree branch; local commits only. **No push, no merge, no
PR.**
