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
- Then (FABLE-NEXT-04): choose which status update is actually sent — four
  operational status statements in fixed order covering both checkable
  mission facts (systems repair cycle complete?, field kit packed?); exactly
  one matches the logged state.
- Then: accept or decline the relay supervision duty (chained offer stage).

The duty accept/decline step and the Final Core follow-through check
(complete / unresolved) are implemented and spec-covered end-to-end — the
older "missing" note below in Implementation notes is historical.

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
`engineer_report_submitted_unprepared`); the supervision/duty mechanic is
implemented (offer/accept/decline here, complete/unresolved at Final Core),
and `engineer_report_accuracy_scored` is emitted as unmapped raw telemetry
since FABLE-NEXT-04 (see the schema table for its payload clarification).

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

**Wave 1A status (2026-07-12)**: room implemented as `EngineerScene`
(`src/scenes/EngineerScene.ts`, `?scene=engineer`, Hub door open via the
station registry). Report path ported audit-first: legacy option labels,
feedback strings, event sequences (including the unmapped
`engineer_report_submitted_supervised` and the derived-style
`engineer_responsibility_*` events), Kai's prompt body, and the exact
already-submitted gate text preserved verbatim; one-shot guard now
session-level via `completed_rooms`. **Supervision duty implemented**: after
any report submission a chained prompt stage (U3) offers the relay
supervision duty — `engineer_supervision_assigned` on offer;
accept → `engineer_supervision_accepted` (Q10, responsibility) +
`SessionState.addAcceptedDuty('relay_supervision')` + active objective;
decline → `engineer_supervision_declined` + `addSkippedDuty`, framed as a
plausible workload decision with no penalty. The report option's legacy
feedback string is displayed verbatim as the first paragraph of the duty
stage body (U3 suppresses the toast when a stage chains). Duty
completion/skip and `accepted_duty_unresolved` are **deferred to the Final
Core beat** — the contract places the follow-through check "at Final Core or
related station point"; inventing an earlier check would be an undocumented
scientific decision. Additive `engineer_hub_entered` on every entry.
Playwright spec `e2e/engineer_hub_logging.spec.ts` authored compile-only —
**runtime/browser verification still owed** before any "works" claim.

**FABLE-NEXT-04 status (2026-07-18)**: report-accuracy evaluation substrate
(Q09) implemented. The report flow is now mode → **report content** → duty
offer:

- The response-mode options (labels, feedback strings, event sequences —
  including the legacy `engineer_report_submitted_supervised` and
  `engineer_responsibility_*` names) stay verbatim; the one-shot
  already-submitted gate and `markRoomCompleted('engineer_hub')` timing are
  unchanged; the duty offer still logs `engineer_supervision_assigned` at
  the moment it is shown (it now chains one stage later).
- The new content stage (`buildReportContentStage`) offers the four
  combinations of the two checkable facts as operational status statements
  in **fixed template order** (`src/utils/reportAccuracy.ts` REPORT_CLAIMS —
  never reordered by state): systems repair cycle complete/still open ×
  field kit packed/not packed. Facts read live from SessionState
  (`completed_rooms ∋ systems_repair_room`, `prepared_items ∋ field_kit`) —
  few, concrete, and visible earlier in the session (memory confound
  control).
- Mode-specific stage help: quick = "from memory" only; evidence review =
  station log extract showing the actual values (evidence genuinely
  accessible); clarification = Kai names the two facts he needs, no answers
  (clarification genuinely helps).
- Selecting a statement emits `engineer_report_accuracy_scored` once per
  submission — **unmapped raw telemetry** (no CanonicalEventContext
  registration, `engineer_hub_entered` precedent). Payload: `success` =
  all checkable facts correct; `metadata.accuracy` = 0-1 proportion; plus
  report_mode/facts/claimed/actual keys — placement recorded in
  event-schema.md §4 (additive clarification, `control_error_count`
  precedent).
- The evaluation is **silent**: identical neutral acknowledgement ("Kai
  logs your status update.") for every claim; no grade, no moralising. The
  legacy mode feedback string now heads the content stage body; the neutral
  acknowledgement heads the duty stage body (display-only re-anchoring; no
  event change).
- **Open (research owner)**: a Q09 registration for
  `engineer_report_accuracy_scored` (the event improves raw telemetry but
  does not close Q09's outcome side); D5's
  `engineer_report_submitted_supervised` mapping question stays open;
  `report_accuracy_score` (approved scoring-plan target) remains D2-family
  work — not computed here.
- Spec coverage: `engineer_hub_logging.spec.ts` (accurate-prepared,
  inaccurate-unprepared, clarify-then-accurate, payload pinning,
  once-per-submission with the one-shot gate); duty-loop regression in
  `final_core_summary.spec.ts` (accept→complete, accept→unresolved,
  no-duty paths — Q10 verified end-to-end).

**FABLE-NEXT-06 presentation (2026-07-19)**: participant interactions
run through the shared visual choice-card panel (mouse + keyboard;
numeric keys retained as hidden dev/test shortcuts) - card panel + Report Desk status side panel (no pending-duty reminders by design).
Contract: `docs/game/UI-PRESENTATION-CONTRACT.md`. No event, payload,
mapping, scoring or task-state change.

## Anti-leakage note

No responsibility/dependability item wording (Q09-Q11) may appear in Kai's
dialogue, report console text, or option labels. Current labels ("Submit a quick
report from memory", "Review station evidence, then report", "Ask Engineer Kai
for clarification before reporting") stay in-fiction — keep this register, and
keep the shortcut option framed as a plausible time-pressure choice, not an
obviously "wrong" one.

## NEXT-08 presentation (evidence and claim surfaces)

FABLE-NEXT-08 gave the report-content stage its evidence/claim
presentation (§6.4; presentation only — accuracy scoring, metadata, the
silent identical acknowledgement and duty chaining are unchanged,
verified by the parity spec): the mode-specific help sentence renders
inside a visually distinct inset — the log-extract treatment (left
rule + corner mark) in evidence-review mode, a plain inset in the other
two modes — with byte-identical text and unchanged `__lastPromptBody`
composition; the four claim cards take an identical record-card
treatment, labels verbatim, fixed template order. Deliberately no
fact-grid, tick-mark or claim decomposition: the between-claims
comparison is the Q09 measurement substance. The mode stage and the
duty offer stay plain cards; the calibration-bench scenario console
stays an unenriched NEXT-06 card panel.
