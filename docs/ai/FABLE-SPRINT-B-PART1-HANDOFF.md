# Fable Sprint B Part 1 — Continuous Handoff

Authoritative continuation state for Sprint B Part 1 (unattended Fable
session, 2026-07-13). Base: Sprint A checkpoint `5dbbb14`
(tag `fable-final-sprint-a-5dbbb14`), branch `fable-autonomous-game-build-v1`.
Read `docs/ai/POST-FABLE-MASTER-HANDOFF.md` first for full repo state.

## Starting HEAD

- `5dbbb14` (Sprint A close-out; clean tree; nothing pushed).

## Current HEAD

- See `git log` — this file is updated in/beside each checkpoint commit.

## Commits created this sprint

- `93d8aa6` Priority A: research traceability matrix (MD + JSON + validator).
- `c734645` Priority B: ranked adversarial journey plan (ADV-1..11).
- (this commit) Priority C unit 1: ADV-1 cross-session isolation spec.

## Completed tasks

- Pre-flight verified (branch, tag, clean tree, continuation docs).
- **Priority A COMPLETE** (`93d8aa6`): traceability matrix MD + JSON +
  `scripts/validate-traceability-matrix.mjs`. Validator PASSES (165 events /
  33 items / 59 summary variables; registrations byte-agree with
  `CanonicalEventContext.ts`; code/spec references derived live from the
  tree). All gaps identified, nothing scientific resolved — see MD §3–§7 and
  JSON `findings`.
- **Priority B COMPLETE** (`c734645`):
  `docs/testing/ADVERSARIAL-JOURNEY-PLAN.md` — 17 mandated case families
  inventoried against the 38-test baseline; 11 ranked cases; ADV-1..4 are
  the Priority C implementation order.
- **Priority C in progress**: ADV-1
  (`e2e/adversarial_session_isolation.spec.ts`) PASSES targeted (1/1, 45 s):
  a second participant in the same tab inherits zero events / mission state
  / summary values from the first.

## Current coherent unit

- ADV-3 unit — complete, committed with this handoff update.

## Exact next action

- **ADV-2**: `e2e/adversarial_reload_partial_state.spec.ts` — direct
  `?scene=repair` launch, fail once (option 1), full reload via re-`goto`,
  assert fresh log (no phantom `repair_returned_after_failure`, exactly one
  `session_start`, metadata preserved from URL), then complete (options 2
  then 3) and assert normal completion post-reload. Then **ADV-3** (archive
  abandon/return multi-cycle — first live coverage of the registered
  `archive_returned_after_failure`), then **ADV-4** (repeated hazard
  decisions across re-entries, separate session). Details:
  ADVERSARIAL-JOURNEY-PLAN.md §2; authored semantics pinned from
  `src/world/roomTaskState.ts` + `ArchiveScene.ts` (abandoned fires on
  EVERY exit-after-failure while incomplete; returned once per departure;
  nothing after completion).

## Tests passing / failing

- Baseline: 38 tests / 14 spec files all passing (Sprint A record).
- New: ADV-1, ADV-2, ADV-3 all 1/1 targeted PASS. Suite now 41 tests / 17 files.

## Uncommitted files

- None after this commit.

## Unresolved scientific decisions (user-owned; none decided this sprint)

- D2–D8 unchanged (see `WAVE1-USER-DECISION-BRIEF.md`), plus
  Hazard→Final-Core consequence semantics. New **catalogued divergences**
  (questions documented, not answered) in the matrix:
  1. `archive_strategy_revision` study-item listing: registration
     Q13/Q22/Q26 (event-schema §6 worked example) vs MASTER_33 events
     columns (Q13/Q23 rows). Which listing governs is a user call.
  2. `objective_completed` Q06 listing conflict (V3 §5 vs MASTER_33 mirror).
  3. Doc refreshes owed (stale rows/notes in event-schema §4 Archive,
     MASTER_33 Q10/status section, scoring-plan §5) — factual updates to
     scientific docs left to the user or an explicitly-scoped doc pass.
- Observation (no action taken): station prompts are repeatable by authored
  port design, so re-selecting a completion option after completion logs the
  completion events again (raw log; `completed_rooms` stays unique). Whether
  repeat-completions should be summary-scored differently is Beat-13/D2
  territory — flagged only.

## Part 2 priorities

- Remaining Priority C cases after ADV-1..4: ADV-5 (status-board vs
  SessionState), ADV-6 (hostile launch/return battery), ADV-7 (input spam),
  ADV-8 (direct launch → navigation), then P2 cases ADV-9..11.
- Then POST-FABLE-MASTER-HANDOFF.md §11 backlog (items 1–3 are user/Sonnet;
  next Fable-suitable work is decision-gated).
