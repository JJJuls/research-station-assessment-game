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

At the Comms Beacon (legacy options verbatim):

- Switch fully to the new request and leave the previous task (the commit —
  the competing task then actually becomes available at the Antenna Junction).
- Acknowledge the alert, then return to the unfinished station task.
- Ignore the alert completely and continue without checking it.

At the Antenna Junction (FABLE-NEXT-05, after a committed switch): realign the
feed, then confirm — the competing task actually runs (two chained
interactions).

At the Relay Checkpoint (FABLE-NEXT-05, while the accepted relay-supervision
duty is active): review the relay log, then log the check-in as complete —
re-engaging it after a committed switch is the observed return act; completing
it is the original objective's completion interaction. The checkpoint stays
available until Final Core (the guaranteed later return opportunity).

## Canonical events

`interruption_corridor_entered`, `objective_active`, `interruption_received`,
`competing_task_viewed`, `new_goal_offered`, `switched_task`,
`goal_switch_accepted`, `return_to_unfinished_task`,
`returned_to_original_task`, `prior_goal_completed`, `prior_goal_abandoned`,
`task_completed_after_interruption`, `final_unresolved_due_to_nonreturn`,
`task_avoidance`, `excessive_idle_after_instruction`.

Current-to-canonical alias table: `docs/research/event-schema.md` §4,
"Interruption Corridor" — since FABLE-NEXT-05 the canonical offer, commit,
switch, return and completion events are all emitted at observed moments (see
the table's per-row triggers and the SA-9 co-fire flag). The legacy
derived-style events (`interruption_focus_lost`,
`interruption_focus_maintained`, `interruption_possible_rigidity` and
siblings) keep firing verbatim at their dialogue moments —
`interruption_focus_lost`/`interruption_alert_acknowledged` are consumed by
ScoringManager summary formulas; the raw-vs-derived cleanup stays D2-family
work (`scoring-plan.md` §9).

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

**Wave 1A status (2026-07-12)**: room implemented as `InterruptionScene`
(`src/scenes/InterruptionScene.ts`, `?scene=interruption`, Hub door open,
statusBoardLabel 'Comms interruption'). Audit-first port: legacy options,
feedback, event sequences — including the legacy derived-style events —
preserved verbatim; per scoring-plan §9 **no new interpretation-at-log-time
events were added**; interpretation stays a ScoringManager concern.
Canonical additions limited to direct alias renames + state-grounded
events: `interruption_corridor_entered` (every entry), `objective_active`
(Q18; once per session, only while `active_objectives` is genuinely
non-empty — e.g. the accepted relay supervision duty),
`interruption_received` (beside legacy on prompt open), `switched_task` +
`prior_goal_abandoned` (switch path), `returned_to_original_task` (return
path), `task_avoidance` (ignore path, this doc's directed mapping).
Deliberately unemitted, documented per event in `event-schema.md` §4:
`competing_task_viewed` (open mapping decision), `new_goal_offered`,
`goal_switch_accepted`, `return_to_unfinished_task`, `prior_goal_completed`,
`task_completed_after_interruption` (all need real cross-room objective
mechanics), `final_unresolved_due_to_nonreturn` (Final Core beat),
`excessive_idle_after_instruction` (user-owned idle parameter).
`interruption_status` vocabulary: `switched_away` / `returned_to_task` /
`alert_ignored` (`src/data/missionVocabulary.ts`) — Final Core reads
`switched_away` as the unresolved-non-return candidate only (switching
alone is never penalised). Spec
`e2e/interruption_corridor_logging.spec.ts` authored compile-only —
**runtime/browser verification still owed** before any "works" claim.

**FABLE-NEXT-05 status (2026-07-19)**: corridor rebuilt around a genuinely
competing objective with an observed return act.

- Stations: Comms Beacon (center, offer — legacy options/labels/feedback/
  event sequences verbatim; prompt body now offers the competing task
  concretely with balanced framing), Relay Checkpoint (west,
  `object_id: relay_checkpoint`), Antenna Junction (east,
  `object_id: aux_antenna_junction`). Two additive `researchInteractions`
  entries (sideRepairPartsShelf precedent).
- The original objective is the relay check-in, genuinely pending while the
  accepted relay-supervision duty is active (`relay_checkpoint_status`
  `pending`, set lazily on corridor entry; the duty itself and its Q10
  events at Engineer Hub / Final Core are untouched). The competing task is
  the antenna realignment (`competing_task_status`); its completion has NO
  canonical event (none schema-listed — recorded in state only).
- Canonical observed moments (schema §4 per-row triggers, task-file binding
  table): `new_goal_offered` at beacon open (beside the frozen
  `interruption_received`; metadata framing/original_task_id/
  competing_task_id — `original_task_id: null` records the no-opportunity
  state; the formal spec §8.2 opportunity-flag convention stays open);
  `goal_switch_accepted` at the switch commit; `switched_task` at the
  junction's first interaction; `return_to_unfinished_task` +
  `returned_to_original_task` co-fired at the physical return act (**SA-9**:
  co-fire vs fold is a research-owner decision — not decided locally);
  `prior_goal_completed` (+ `task_completed_after_interruption` when the
  interruption occurred earlier) at check-in completion;
  `prior_goal_abandoned` at Final-Core-bound closure (FinalCoreScene,
  completion-time, only with a genuinely-pending never-completed original).
- interruption_status: legacy writes verbatim; additive transition —
  completing the check-in after a committed switch settles `switched_away`
  → `returned_to_task`, so `final_unresolved_due_to_nonreturn` (entry) and
  `prior_goal_abandoned` (completion) reflect the observed return. Known
  edge: entering Final Core while switched-away fires the entry flag even
  if the player then walks back and completes the check-in before
  finishing (entry-time vs completion-time observations stay
  distinguishable; documented in schema §4).
- Duty-roster HUD: deliberately NOT extended with a competing-task label —
  the HUD is a single-line pilot-route tracker with exact-string spec pins;
  the optional label (task file: "may gain") was skipped to avoid
  destabilising the route-gate pins. Station labels provide the in-room
  visibility.
- Q29/Q31 (SA-3) dependency: corridor entry order stays configurable — the
  corridor imposes no ordering constraint on any future horizon-choice
  module; nothing here logs before/after any other room by design.
- Commit-time opportunity freeze: `switch_original_task_id` (additive
  SessionState) records whether the check-in was genuinely pending at the
  switch commit; the return act, the status settle and Final Core's
  `prior_goal_abandoned` are gated on this frozen value (a duty accepted
  after an opportunity-less switch never retroactively creates the
  observation). Once Final Core completes, the checkpoint no longer opens
  (terminal closure guard — late acts can never contradict the emitted
  closure).
- Residual trigger ambiguity flagged as **SA-10** (research owner):
  `task_completed_after_interruption` currently fires on ANY earlier beacon
  interruption, including the ignore branch (temporal reading of "an
  interruption occurred earlier in the session") — whether the ignore
  branch counts as "interrupted" for the Q15 carrier is not decided
  locally.
- Deliberately unemitted: `competing_task_viewed` (D6 — legacy
  `interruption_alert_acknowledged` kept as-is), `task_deferred`
  (CANDIDATE), `task_started` (D7), `excessive_idle_after_instruction`
  (D3).
- Spec `e2e/interruption_corridor_logging.spec.ts` rebuilt: switched-and-
  returned arc, switch-never-return Final Core closure (incl. terminal
  guard), acknowledge-and-complete, ignore one-shot, no-opportunity
  session, duty-after-switch frozen gate at the checkpoint, and the
  Final-Core-side frozen-gate discriminator (7 tests, payload pinning and
  once-per-session assertions throughout).

**FABLE-NEXT-06 presentation (2026-07-19)**: participant interactions
run through the shared visual choice-card panel (mouse + keyboard;
numeric keys retained as hidden dev/test shortcuts) - card panel; deliberately NO side panel (map width + return-reminder measurement neutrality).
Contract: `docs/game/UI-PRESENTATION-CONTRACT.md`. No event, payload,
mapping, scoring or task-state change.

## Anti-leakage note

No Grit-S Consistency of Interest / productiveness item wording (Q08, Q15,
Q17-Q20) may appear in Comms AI dialogue or option labels. Current labels
("Switch fully to the new request...", "Acknowledge the alert, then return...",
"Ignore the alert completely...") stay in-fiction — keep this register.
