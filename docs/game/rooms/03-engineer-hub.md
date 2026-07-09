# Room 3 — Engineer Hub / NPC Report-Back

Contract reference: V3 Section 4, "Room 3 — Engineer Hub / NPC Report-Back".
`room_id`: `engineer_hub`.

## Purpose

Interpersonal accountability, dependable reporting, accepted duty follow-through.
Implementation priority: **very high** — fills the responsibility/dependability
gap (Q09-Q11) without altering the persistence scoring model elsewhere (V3
Section 1 rule 9).

## Mapped Q-items

Q09, Q10, Q11.

## Construct targets

Responsibility, dependability, accountability, organisation in reporting.

## Player-facing fiction

Engineer Kai asks for a status report before the next repair cycle, under
plausible time pressure. A report console and duty board are available.

## Task flow

1. Enter Engineer Hub, Engineer Kai requests a status report.
2. Player may review evidence, ask for clarification, or submit immediately.
3. Player submits a prepared or unprepared/shortcut report.
4. Player may accept or decline a relay supervision duty (persists as an
   objective).
5. Later (at Final Core or another station point), the accepted duty is checked
   for follow-through — completed or left unresolved.

## Valid choices/actions (current)

- Submit a quick report from memory (unprepared/shortcut).
- Review station evidence, then report (prepared).
- Ask Engineer Kai for clarification before reporting (prepared, supervised).

**Missing from current implementation**: the duty-board accept/decline step and
any later follow-through check (see Implementation notes) — this is the core of
the room's Q10 mapping and is not yet built, not just misnamed.

## Canonical events

`engineer_hub_entered`, `engineer_report_opened`, `engineer_evidence_reviewed`,
`engineer_clarification_requested`, `engineer_report_submitted_prepared`,
`engineer_report_submitted_unprepared`, `engineer_report_accuracy_scored`,
`engineer_supervision_assigned`, `engineer_supervision_accepted`,
`engineer_supervision_declined`, `engineer_supervision_completed`,
`engineer_supervision_skipped`, `accepted_duty_unresolved`.

Current-to-canonical alias table: `docs/research/event-schema.md` §4, "Engineer
Hub" — 5 exact matches on the report-submission path
(`engineer_report_opened`, `engineer_evidence_reviewed`,
`engineer_clarification_requested`, `engineer_report_submitted_prepared`,
`engineer_report_submitted_unprepared`); the entire supervision/duty mechanic is
unimplemented.

## Derived variables

`prepared_report_flag`, `report_accuracy_score`, `responsibility_report_count`,
`responsibility_adaptive_count`, `commitment_followthrough_rate`,
`duty_followthrough_rate`, `accepted_duty_unresolved_count`,
`accountability_review_flag`.

## Scoring notes

Do not make the responsible option morally obvious — the shortcut option must be
plausible under time pressure (V3 validity caution). This room's additions must
not alter the persistence scoring model elsewhere (V3 Section 1 rule 9) —
confirmed true of current implementation (`scoring-plan.md` §4 flags a _different_
watch item, unrelated to Engineer Hub, in `strategy_revision_count`).

## Failure/edge cases

- Player declines the supervision duty: should log
  `engineer_supervision_declined` and not create an unresolved-duty penalty
  (declining is a valid choice, not a failure).
- Player accepts the duty but never returns to it: should surface
  `accepted_duty_unresolved_count` at Final Core review.
- Player asks for clarification repeatedly: should not inflate
  `responsibility_adaptive_count` without bound — current `markEngineerReportSubmitted`
  one-shot guard already prevents repeated-submission inflation; extend the same
  discipline to any future supervision-acceptance flow.

## Playwright verification targets

`engineer_hub_logging.spec.ts` — drive prepared-report path (evidence review +
submit) and unprepared/shortcut path; confirm `engineer_evidence_reviewed`,
`engineer_report_submitted_prepared` / `engineer_report_submitted_unprepared`
with `room_id: "engineer_hub"`. Once the duty mechanic is implemented, extend
this spec to drive accept -> leave unresolved -> confirm
`accepted_duty_unresolved` fires at the Final Core check.

## Implementation notes

Current implementation is a single-shot report prompt only — no duty board, no
persistent objective, no later follow-through check. This is the room's biggest
gap relative to the contract's core task description ("accept/decline a relay
supervision duty, and later complete or skip accepted duty"). Building the
duty-board + cross-room follow-through is real implementation work (depends on
`SessionState` gaining the `accepted_duties`/`skipped_duties` fields from V3
Section 3.1), not just an event rename — flag as a priority item for whichever
beat implements this room, consistent with the contract's "very high" priority
note.

## Anti-leakage note

No responsibility/dependability item wording (Q09-Q11) may appear in Kai's
dialogue, report console text, or option labels. Current labels ("Submit a quick
report from memory", "Review station evidence, then report", "Ask Engineer Kai
for clarification before reporting") stay in-fiction — keep this register, and
keep the shortcut option framed as a plausible time-pressure choice, not an
obviously "wrong" one.
