# Room 7 — Interruption Corridor

Contract reference: V3 Section 4, "Room 7 — Interruption Corridor".
`room_id`: `interruption_corridor`.

## Purpose

Task switching, return-to-task, follow-through after interruption, exploratory
Grit-S Consistency of Interest analogues.

## Mapped Q-items

Q08, Q15, Q17, Q18, Q19, Q20.

## Construct targets

Return-to-task, started-task completion, low productive engagement/avoidance,
consistency proxies, task switching. **Q17-Q20 are weak/exploratory** per
`MASTER_33_ALIGNMENT.md` — switching can be rational behaviour; score
unresolved non-return and abandoned prior goals, not switching alone.

## Player-facing fiction

A competing objective appears via Comms AI / signal beacon while another
objective remains active. A door controller and mission checklist track state.

## Task flow

1. Enter Interruption Corridor with an active prior objective.
2. Comms alert offers a competing task.
3. Player evaluates the interruption: switch, return, abandon the previous
   goal, or complete the original task.
4. Final check (later, e.g. at Final Core) confirms whether the original task
   was resolved.

## Valid choices/actions (current)

- Switch fully to the new request and leave the previous task.
- Acknowledge the alert, then return to the unfinished station task.
- Ignore the alert completely and continue without checking it.

## Canonical events

`interruption_corridor_entered`, `objective_active`, `interruption_received`,
`competing_task_viewed`, `new_goal_offered`, `switched_task`,
`goal_switch_accepted`, `return_to_unfinished_task`,
`returned_to_original_task`, `prior_goal_completed`, `prior_goal_abandoned`,
`task_completed_after_interruption`, `final_unresolved_due_to_nonreturn`,
`task_avoidance`, `excessive_idle_after_instruction`.

Current-to-canonical alias table: `docs/research/event-schema.md` §4,
"Interruption Corridor" — only 1 exact match (`returned_to_original_task`).
Several current events (`interruption_focus_lost`, `interruption_focus_maintained`,
`interruption_possible_rigidity`) assert an interpretation at log time rather
than logging raw behaviour — flagged as a design smell to fix during this
room's rebuild (see `scoring-plan.md` §9).

## Derived variables

`return_to_task_rate`, `started_task_completion_rate`,
`distraction_switch_rate`, `return_after_switch_flag`,
`longitudinal_focus_proxy`, `unresolved_after_interruption`,
`goal_switch_without_return_count`, `low_productive_engagement_proxy`,
`avoidance_count`, `start_without_sustain_count`.

## Scoring notes

Switching can be rational — score unresolved non-return and abandoned prior
goals, not switching alone (V3 validity caution). Months-long interest
stability cannot be reproduced in a short game; label Q18 and related CI
outputs as weak/exploratory everywhere they're surfaced (`scoring-plan.md` §8).

## Failure/edge cases

- Player switches to the new task but later returns and completes the original:
  should log both `switched_task` and `returned_to_original_task` /
  `prior_goal_completed` — not just the final state, since the sequence matters
  for `distraction_switch_rate` vs. `return_after_switch_flag`.
- Player ignores the alert entirely: current logs `interruption_alert_ignored`
  - `interruption_possible_rigidity` — the second is an interpretation
    (rigidity) asserted at log time rather than derived; per the raw-vs-derived
    note, this should become a raw `task_avoidance`-equivalent event with
    `possible_rigidity` computed later in `ScoringManager` from context (e.g. only
    "rigid" if avoidance recurs across multiple interruption events).
- Player never returns to the original task at all: should surface
  `final_unresolved_due_to_nonreturn` at the later check point — currently no
  cross-room mechanism exists for this (depends on `SessionState`'s
  `interruption_status`/`unresolved_objectives` fields, V3 Section 3.1).

## Playwright verification targets

`recommend adding to docs/testing/playwright-smoke-plan.md`'s general
room-coverage pass — no dedicated spec named in V3 Section 9's list for this
room specifically. At minimum: drive switch-then-return path (confirm
`switched_task`-equivalent then `returned_to_original_task`), and
ignore-alert path (confirm `task_avoidance`-equivalent) with `room_id:
"interruption_corridor"`.

## Implementation notes

Current implementation logs several derived-style labels as raw events
(`interruption_focus_lost`, `interruption_focus_maintained`,
`interruption_possible_rigidity`) — when this room is rebuilt, move that
interpretation into `ScoringManager` and keep the raw log strictly behavioural
(see `scoring-plan.md` §9). The final-unresolved-non-return check
(`final_unresolved_due_to_nonreturn`) needs cross-room state that doesn't exist
in `SessionState` yet.

## Anti-leakage note

No Grit-S Consistency of Interest / productiveness item wording (Q08, Q15,
Q17-Q20) may appear in Comms AI dialogue or option labels. Current labels
("Switch fully to the new request...", "Acknowledge the alert, then return...",
"Ignore the alert completely...") stay in-fiction — keep this register.
