# Room 1 — Archive Room

Contract reference: V3 Section 4, "Room 1 — Archive Room".
`room_id`: `archive_room`.

## Purpose

Response to setback, feedback use, revision after failure, blind repetition.

## Mapped Q-items

Q13, Q22, Q23, Q24, Q25, Q26.

## Construct targets

Perseverance of Effort, Persistence Despite Difficulty, adaptive persistence,
inappropriate persistence, productiveness after failure. Adaptive persistence
(Q13, Q22-Q25) and inappropriate persistence (Q26) must stay in separate derived
variables per `docs/research/MASTER_33_ALIGNMENT.md`.

## Player-facing fiction

An Archive AI guards an access log/code the player needs. Log shelves and data
panels are available for context. The player's first/naive attempt fails; the
terminal shows feedback.

## Task flow

1. Enter Archive Room, open archive terminal.
2. Player attempts a code/query — the naive first attempt fails.
3. Feedback panel is shown.
4. Player may: inspect logs/compare, read feedback, revise the query, repeat the
   same wrong response, leave, or return later.
5. Completion flag sent to mission checklist when a revised query succeeds.

## Valid choices/actions

- Enter access code (may repeat an already-failed code).
- Read terminal feedback.
- Try a revised archive query (success path).

(Current prototype implements exactly these three at one station; canonical
design also allows log comparison and leave/return-later branches — see
Implementation notes.)

## Canonical events

`archive_room_entered`, `archive_terminal_opened`, `archive_code_entered`,
`archive_wrong_code`, `archive_feedback_shown`, `archive_feedback_used`,
`archive_log_compared`, `archive_strategy_revision`,
`archive_same_wrong_code_repeated`, `archive_abandoned`,
`archive_returned_after_failure`, `archive_completed`.

Current-to-canonical alias table: `docs/research/event-schema.md` §4, "Archive
Room" — this room has the strongest current alignment (5 exact matches:
`archive_wrong_code`, `archive_same_wrong_code_repeated`,
`archive_feedback_used`, `archive_strategy_revision`, `archive_completed`).

## Derived variables

`post_failure_reengagement`, `adaptive_persistence_count`, `blind_retry_count`,
`strategy_revision_count`, `archive_completion_flag`,
`abandonment_after_failure_count`, `game_inappropriate_persistence_component`.

## Scoring notes

Feedback must be understandable — this measures response to setback, not hidden
puzzle ability or reading difficulty (V3 validity caution). Repeating the
identical wrong code contributes to `blind_retry_count`/inappropriate
persistence; revising the query contributes to adaptive persistence. These two
must never merge into one variable (see `scoring-plan.md` §4).

## Failure/edge cases

- Player repeats the exact same wrong code: must log
  `archive_same_wrong_code_repeated`, not a second `archive_wrong_code` —
  current implementation already does this correctly (`didRepeat` check in
  `Main.tsx`).
- Player never revises and leaves without completing: should log
  `archive_abandoned` (currently missing — no event fires on leaving without
  completion).
- Player leaves after failure and comes back later: should log
  `archive_returned_after_failure` (currently missing).

## Playwright verification targets

`archive_room_logging.spec.ts` — drive wrong-code entry, feedback read, revised
query; confirm `archive_wrong_code`, `archive_feedback_used`,
`archive_strategy_revision`, `archive_completed` all appear via
`getEvents()`/`printEvents()` with `room_id: "archive_room"`. Also drive the
repeat-wrong-code path and confirm `archive_same_wrong_code_repeated` fires
instead of a duplicate `archive_wrong_code`.

## Implementation notes

**Implemented as a real room in Phase D of the V1 slice**
(`src/scenes/ArchiveScene.ts`, a `RoomScene` subclass): terminal alcove, log
shelves (the canonical "optional log comparison step" → `archive_log_compared`),
and a Hub door supporting the leave/return path. The prototype's
wrong-code/feedback/revision logic was ported verbatim (labels, feedback
strings, event sequences, `didRepeat` check); all previously-missing canonical
events now fire additively. The prototype station remains reachable via
`?scene=prototype`.

### Forced-failure manipulation record (approved plan §12)

- **Authority:** V3 §4 Room 1 ("The first or naive attempt fails. Feedback is
  shown.") and this doc's task flow step 2.
- **Triggering rule:** access code A17 is deterministically incorrect on every
  submission for every participant; no randomisation exists in the scene; the
  first outcome cannot vary between participants in a condition.
- **Measured post-setback behaviour:** revise (`archive_strategy_revision`),
  repeat identical wrong code (`archive_same_wrong_code_repeated` — never
  merged with adaptive variables), use feedback/logs (`archive_feedback_used`,
  `archive_log_compared`), leave unresolved (`archive_abandoned`), return
  (`archive_returned_after_failure`), complete (`archive_completed`).
- **Puzzle-ability control:** labelled option selection (no free-text); wrong-
  code feedback and log-shelf text are plainly readable and in-fiction.
- **Pilot/debrief implications:** the scripted first failure is mild deception
  (a failing default presented as real); the study debrief must disclose that
  the first failure was standardized for all participants; pilot testing must
  confirm the feedback text is comprehensible (comprehension failure would
  confound the setback response).

### Event-mapping status (Phase D)

- 5 pre-existing mapped events: byte-identical mappings preserved (verified
  by research-data-reviewer, no drift).
- `archive_abandoned` → `study_item_ids: ["Q24"]`,
  `archive_returned_after_failure` → `["Q24","Q25"]` per
  MASTER_33_ALIGNMENT's Events columns. **`construct_id` deliberately unset
  for both — PENDING psychometric decision** (abandonment is disengagement
  evidence; assigning it to `adaptive_persistence` would be wrong-signed;
  routed to the user / psychometric-task-design).
- `archive_room_entered`, `archive_terminal_opened`, `archive_code_entered`,
  `archive_feedback_shown`, `archive_log_compared`: in no Q-row Events
  column → carry `room_id`/`task_id` only (no invented mappings).

### Reviewer-confirmed behaviour notes

- `archive_abandoned` requires a prior failed attempt (leaving with zero
  attempts logs nothing) — narrower than this doc's edge-case sentence but the
  scientifically defensible reading of Q24 (setback required). **Pending user
  confirmation**; update the edge-case wording if approved.
- Option 3 (revised query) is selectable before any failure, so completion
  without experiencing the manipulation is possible — ported prototype design,
  flagged for the refinement beat (`psychometric-task-design`).
- Room-transit events reuse the terminal's `object_id`
  (`archive_access_terminal`) — cosmetic; interpret via `event_type`.

Done test (fail → feedback → revise → complete, plus repeat-wrong-code
variant): **passes in the connected world** (Playwright-verified; adaptive
summary `strategy_revision_count=1, game_inappropriate_persistence=0`;
maladaptive summary `blind_retry_count=1, game_inappropriate_persistence=1,
strategy_revision_count=0`; abandon/return cycle logs exactly one
`archive_abandoned` + one `archive_returned_after_failure`). Evidence:
`docs/testing/slice-evidence/phaseD/`.

**FABLE-NEXT-06 presentation (2026-07-19)**: participant interactions
run through the shared visual choice-card panel (mouse + keyboard;
numeric keys retained as hidden dev/test shortcuts) - card panel (all prompts).
Contract: `docs/game/UI-PRESENTATION-CONTRACT.md`. No event, payload,
mapping, scoring or task-state change.

## Anti-leakage note

No Grit-S/BFI item wording (Q13, Q22-Q26) may appear in terminal text, feedback
messages, or option labels. Current option labels ("Enter access code A17",
"Read terminal feedback", "Try revised archive query") are in-fiction and do not
leak item wording — keep any future text in this same register.
