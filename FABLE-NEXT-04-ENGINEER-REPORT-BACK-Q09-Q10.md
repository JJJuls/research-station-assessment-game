# FABLE-NEXT-04 — Engineer Hub report accuracy (Q09) + duty telemetry check (Q10)

Implementation-ready task file (do not execute in the blueprint pass).
Parent: roadmap Stage 1 unit 1.4; contract §R3.

## Objective

Build the report-accuracy evaluation substrate: evaluate submitted
reports against the real logged station state and emit the schema-listed
`engineer_report_accuracy_scored` as **unmapped raw telemetry** (its Q09
registration does not exist and requires a research-owner event-schema
decision — see Raw events). Confirm (and spec-cover) the Q10 duty loop
end-to-end. No new mechanics beyond the evaluation.

## Q mappings

- Q09 (dependable reporting): accuracy of the submitted report vs
  `SessionState`/event-derived facts; prepared vs unprepared context.
- Q10 (reliable follow-through): no code change expected — verification
  and test-coverage of offer→accept/decline→complete/unresolved.
- Q11 linkage (Final Core outcome) untouched.

## Player mechanic (via `psychometric-task-design` gate before coding)

Report options gain content grounded in actual mission state (e.g. which
stations are complete, kit status) so a "quick from memory" submission can
be objectively accurate or inaccurate. The evaluation is silent — no
grade shown to the player (feedback stays neutral acknowledgement;
no moralising, no score display).

## Raw events (decided BEFORE coding)

Emit: `engineer_report_accuracy_scored` — one per submission. The name is
schema-listed (event-schema.md §4 Engineer table, status "missing") but
**deliberately unmapped in `CanonicalEventContext.ts`** (no Q09
registration exists — this was withheld on purpose, per the CEC comment).
Therefore this unit emits it **unmapped** (`study_item_ids: []`, no
construct — `engineer_hub_entered` precedent), which improves raw
telemetry but does NOT close Q09's outcome side. Adding a Q09
registration is an explicit event-schema addition only the research owner
can approve — request it via the ruling form; do not add it in this unit.
Payload: `success` = accuracy boolean or `metadata.accuracy` as a 0-1
proportion of checkable facts — whichever placement is ruled must be
recorded in event-schema.md itself as an additive clarification
(`control_error_count` precedent), not only in the room doc.

NOT emitted: any new report-content events; D5's legacy
`engineer_report_submitted_supervised` mapping stays open — do not rename
or remove it.

## Candidate variables

`report_accuracy_score` is an approved scoring-plan target (missing) —
computing it in ScoringManager is D2-family work, NOT this unit. This
unit only creates its raw input.

## Validity risks

- Memory/reading confound: checkable facts must be few, concrete and
  visible earlier; clarification path must genuinely help.
- Moral labelling: option text stays operational; evaluation invisible.
- Do not let accuracy evaluation change existing prepared/unprepared
  event semantics or their pinned payloads.

## Bounded scope

`src/scenes/EngineerScene.ts` (+ a small pure evaluation helper), room
doc 03 update. No ScoringManager change; no registration edits beyond the
verified-existing accuracy row; scenario A bench untouched.

## Tests / reviews

Extend `engineer_hub_logging.spec.ts`: accurate-prepared, inaccurate-
unprepared, clarify-then-accurate paths; payload pinning for the accuracy
event; duty-loop regression (`final_core_summary.spec.ts`). Then the
three reviewers in order.

## Preservation constraints

All existing engineer events (incl. legacy `engineer_responsibility_*`,
`engineer_report_submitted_supervised`) keep firing unchanged; duty
recording (`accepted_duties`/`active_objectives`) untouched — it feeds
`objective_active` (Q18).

## Git

Isolated worktree branch; local commits only. **No push, no merge, no
PR.**
