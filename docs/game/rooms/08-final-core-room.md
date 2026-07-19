# Room 8 — Final Core Room

Contract reference: V3 Section 4, "Room 8 — Final Core Room".
`room_id`: `final_core_room`.

## Purpose

Integration, final accountability, unresolved issue review, force-continuing
despite explicit blockers, delayed finalization vs. rushing.

## Mapped Q-items

Q04, Q10, Q11, Q28, Q29, Q33.

## Construct targets

Responsibility, organisation cleanup, final quality, inappropriate persistence,
optional delayed-benefit / Goal-Time proxy (Q29, Q33 — label as
optional/exploratory). This room is an **outcome/integration room** — it must
not replace all subindices or become one global good-player score (V3 validity
caution, restated in `scoring-plan.md` §7).

## Player-facing fiction

The Core Interface AI, status monitors, mission checklist, and station
stability meter display prior-room states: missing items, messy workspace,
unresolved duty, hazard consequences, and any optional stabiliser benefit.

## Task flow

1. Enter Final Core, review station status board.
2. Unresolved issues from prior rooms are listed (missing items, workspace
   disorder, unresolved duty, hazard consequence, blocker).
3. Player may review, resolve issues, force continue past a blocker, rush
   finalization, or complete after resolving.
4. Final quality/stability summary and Qualtrics return preview are generated.

## Valid choices/actions (current)

- Start final synchronization immediately (rushed path).
- Review station status, then integrate completed work (structured path).
- Resolve remaining issue flags before final synchronization (high-quality
  path).

**Missing from current implementation**: an explicit blocker-shown /
force-continue branch (Q28's core mechanic), and any actual cross-room issue
data to review (missing items, workspace disorder, unresolved duty, hazard
consequence are all currently empty because upstream rooms don't propagate
state — see Implementation notes).

## Canonical events

`final_core_entered`, `final_core_status_reviewed`,
`final_core_missing_item_flagged`, `final_core_workspace_issue_flagged`,
`final_core_blocker_shown`, `unresolved_issue_reviewed`,
`issue_resolution_attempted`, `final_core_issue_resolved`,
`final_core_force_continue`, `final_core_rushed`, `final_core_completed`,
`final_core_stability_bonus`, `final_quality_score_computed`,
`final_summary_previewed`, `qualtrics_return_previewed`.

Current-to-canonical alias table: `docs/research/event-schema.md` §4, "Final
Core Room" — only 1 exact match (`final_core_status_reviewed`). Current
implementation uses three quality-tier completion events
(`final_core_low_quality_completion`, `final_core_structured_completion`,
`final_core_high_quality_completion`) where canonical expects a single
`final_core_completed` plus richer preceding events — consolidation
recommended when this room is rebuilt.

## Derived variables

`unresolved_issue_count`, `accountability_review_flag`, `final_quality_score`,
`blocker_ignored_count`, `force_continue_count`, `delayed_finalization_score`,
`rush_to_finish_count`, `final_stability_gain`, `accepted_duty_unresolved_count`,
`unresolved_workspace_issue_count`.

## Scoring notes

Final Core must not replace all subindices or become one global "good player"
score (V3 validity caution). `final_quality_score` should reflect this room's
integration quality specifically, not a rollup of every construct in the game.
Q29/Q33-linked variables (`delayed_finalization_score`, `final_stability_gain`)
are optional/exploratory Goal-Time proxies — label accordingly.

## Failure/edge cases

- No unresolved issues exist because upstream rooms don't yet propagate state:
  the status board should degrade gracefully (show "no flagged issues" rather
  than error) until cross-room propagation is implemented — not a Beat 1 change,
  but worth stating as an explicit expectation for whoever builds this room.
- Player forces continue past a shown blocker: must log
  `final_core_force_continue` and contribute to `game_inappropriate_persistence`
  (per the canonical formula in `scoring-plan.md` §3) — currently this term is
  entirely absent from both the event log and the scoring formula.
- Player rushes finalization without reviewing status: should log
  `final_core_rushed` distinctly from a legitimate quick-but-reviewed
  completion — current `final_core_quick_sync` conflates "fast" with
  "unreviewed," these are not necessarily the same thing.

## Playwright verification targets

`final_core_summary.spec.ts` — drive the three current completion paths
(quick-sync/rushed, structured, high-quality/resolved); confirm
`final_core_status_reviewed` and a completion event fire with `room_id:
"final_core_room"`; confirm `window.researchRuntime.completeDebugSession()`
produces a summary and (when `return_url` is set) a Qualtrics return URL
without mutating the raw event log.

## Implementation notes

This room currently cannot reflect any cross-room state because the
propagation events are missing in every upstream room (Inventory's missing-item/
workspace flags, Engineer Hub's unresolved-duty flag, Hazard Control's
consequence flag, Optional Side Repair's stability bonus) and `SessionState`
doesn't yet hold the Section 3.1 mission-state fields needed to carry that state
between rooms. Building real Final Core integration is therefore gated on other
rooms' and `SessionState`'s implementation work, not just this room's own event
names — flag this dependency explicitly when scheduling this room's beat
(likely late, per V3 Section 10's beat ordering, Beat 11 after Beats 3-10).

**Wave 1A status (2026-07-12)**: room implemented as `FinalCoreScene`
(`src/scenes/FinalCoreScene.ts`, `?scene=final_core`, statusBoardLabel
'Core synchronization') — first consumer of the Wave 1A SessionState
writers. Legacy 3 options verbatim (labels, feedback, event sequences,
one-shot gate text). **System flag events** fire once per session at room
entry, independent of player choice: `final_core_missing_item_flagged`
(no `field_kit` in prepared_items), `final_core_workspace_issue_flagged`
(workspace disordered), `final_unresolved_due_to_nonreturn` (interruption
switched_away), `final_core_stability_bonus` (side repair completed).
**Q28 blocker**: with outstanding issues, the prompt body lists them
("Outstanding core flags: …" — the explicit blocker display,
`final_core_blocker_shown`) and an appended 4th option allows
`final_core_force_continue`; with no issues the prompt is exactly the
legacy three options. **Duty follow-through at this check point**: the
resolve path completes an active relay duty
(`engineer_supervision_completed` + objective removal); every completion
path leaving the duty active logs `accepted_duty_unresolved` at completion.
`engineer_supervision_skipped` stays unemitted (no distinct formal
skip-duty action exists — task-design decision). Additive per-path events:
`final_core_rushed` (beside quick-sync), `final_core_completed` (all
paths), `unresolved_issue_reviewed` / `issue_resolution_attempted` /
`final_core_issue_resolved` (conditioned on real issues).
`final_core_entered` fires on room entry (legacy `final_core_opened` stays
on prompt open). `final_core_status_reviewed` gains its Q11 mapping —
intentional prototype-payload change; re-baseline with
`side_repair_completed` in the verification pass. Still missing:
`final_quality_score_computed`, `final_summary_previewed`,
`qualtrics_return_previewed` (ScoringManager/QualtricsBridge emission
points — qualtrics-logging-review gate), hazard consequence display
(Hazard Control blocked). `final_core_status` records the completion path
label only (`src/data/missionVocabulary.ts`), never a score. Spec
`e2e/final_core_summary.spec.ts` authored compile-only —
**runtime/browser verification still owed** before any "works" claim.

**FABLE-NEXT-06 presentation (2026-07-19)**: participant interactions
run through the shared visual choice-card panel (mouse + keyboard;
numeric keys retained as hidden dev/test shortcuts) - card panel + minimal synchronization side panel (no flag list, no path labels by design).
Contract: `docs/game/UI-PRESENTATION-CONTRACT.md`. No event, payload,
mapping, scoring or task-state change.

## Anti-leakage note

No responsibility/inappropriate-persistence/Goal-Time item wording (Q04, Q10,
Q11, Q28, Q29, Q33) may appear in the Core Interface AI's dialogue, status board
text, or option labels. Current labels ("Start final synchronization
immediately", "Review station status, then integrate completed work", "Resolve
remaining issue flags before final synchronization") stay in-fiction — keep
this register.
