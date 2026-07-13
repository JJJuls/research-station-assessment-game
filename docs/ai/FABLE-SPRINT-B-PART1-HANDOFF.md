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
- `dfefc8d` ADV-1 cross-session isolation spec.
- `14bc470` ADV-2 reload-during-partial-state spec.
- `ff28f3d` ADV-3 archive abandon/return cycles spec.
- `db6380d` ADV-4 repeated hazard decisions spec.
- `653780d` ADV-6 hostile launch/return battery spec.
- `034c05b` ADV-7 rapid repeated input spec.
- `ec7d4e1` ADV-8 direct launch → ordinary navigation spec (recovery unit).
- (this commit) ADV-5 status-board display spec (last P1 case).

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
- **Priority C: all four P0 cases COMPLETE**, each 1/1 first-attempt PASS
  targeted, zero game defects found (test-side assumption fixes only):
  ADV-1 `adversarial_session_isolation.spec.ts` (45 s) — zero cross-participant
  bleed; ADV-2 `adversarial_reload_partial_state.spec.ts` (26 s) — no phantom
  Q24/Q25 classification across reload; ADV-3
  `adversarial_archive_abandon_return.spec.ts` (2.2 min) — first live
  coverage of `archive_returned_after_failure`, per-departure semantics
  pinned; ADV-4 `adversarial_hazard_repeat_decisions.spec.ts` (77 s) —
  repeatable-prompt decision semantics, last-write hazard_status,
  abandonment_count accumulation, informed classification persistence.
- **Priority C P1 COMPLETE (all four cases): ADV-5, ADV-6, ADV-7, ADV-8.**
  ADV-6 `adversarial_hostile_launch.spec.ts` (3/3 PASS) — duplicate/oversized/
  encoded/empty launch params and relative/blank/`javascript:` return_url
  shapes, all pinned to code-defined behaviour; two frozen-as-is
  observations routed to the user (empty-string identities bypass the `??`
  fallback; `buildReturnUrl` passes non-http(s) schemes through unchanged).
  ADV-7 `adversarial_input_spam.spec.ts` (2/2 PASS) — option-key hammering
  yields exactly one decision event set; space-spam only toggles the
  prompt, zero decision events, monotonic timestamps. ADV-8
  `adversarial_direct_launch_navigation.spec.ts` (1/1 PASS, 71 s,
  recovery unit this session) — direct `?scene=side_repair` launch flows
  into ordinary door navigation through the Hub into Interruption Corridor
  with metadata/`current_room_id`/status vocabulary intact throughout, and
  re-entering the launch room via a door does not re-fire
  `side_repair_discovered`. Status strings (`ignored`, `alert_ignored`)
  verified byte-for-byte against `src/data/missionVocabulary.ts` before
  the spec was trusted.
  ADV-5 `adversarial_status_board_display.spec.ts` (1/1 PASS twice,
  ~604-609 s each clean run) — the last P1 case. Drives all eight stations
  plus dock through completion, an archive fail/abandon/return cycle, a
  side-repair defer-then-complete cycle, and two repeated Hazard decisions,
  reading the Hub status board after every Hub return and asserting the
  rendered text against `getMissionState()` byte-for-byte (labels/order
  pinned verbatim from `stationRegistry.ts`/`HubScene.buildStatusBoardText`).
  Zero game defects: the board was already an accurate, deterministic
  rendering, including the documented D1 consequence that Hazard Control's
  line stays `pending` forever (no `markRoomCompleted` call exists for that
  room) even after repeated, last-write-wins hazard decisions. Also verified
  fresh-session isolation (a second participant in the same browser context
  sees an all-`pending` board, no leakage from the first). **One small,
  additive, dev-only technical scaffolding change was needed to make the
  rendered board text observable to Playwright at all** (Phaser draws to
  canvas; there was no existing DOM/debug path to read displayed text):
  `RoomScene.showFeedbackMessage` now also writes the shown message to a
  presentation-only, `import.meta.env.DEV`-gated `window.__lastRoomFeedbackText`
  probe (mirrors the `getMissionState()` precedent — read-only, no
  research/event/scoring surface, deliberately kept separate from
  `window.researchRuntime`). `e2e/helpers.ts` gained the matching
  `hubToStatusBoard`/`getLastFeedbackText` helpers and exported the
  previously-private `hubToNorthWestAnchor`. No event/scoring/task/Qualtrics
  code touched. The spec's `test.setTimeout` needed 900 s, not the initially
  tried 600 s — the full 8-station-plus-second-session journey runs ~604-609 s
  wall-clock, and one run's first attempt legitimately hit a 600 s ceiling
  (retry passed); re-run twice clean at 900 s with zero retries.

## Current coherent unit

- ADV-5 unit — complete, committed with this handoff update. **All four P1
  cases (ADV-5, ADV-6, ADV-7, ADV-8) are now done.**

## Exact next action

- P1 is fully complete. Next: P2 — ADV-9 append-only invariant harness,
  ADV-10 interrupted return flow, ADV-11 repeated defer loop
  (ADVERSARIAL-JOURNEY-PLAN.md §2). After P2, run the full suite once at the
  Part 1 phase boundary (not before — brief requires targeted-only runs
  during implementation).

## Tests passing / failing

- Baseline: 38 tests / 14 spec files all passing (Sprint A record).
- New: ADV-1 (1), ADV-2 (1), ADV-3 (1), ADV-4 (1), ADV-6 (3), ADV-7 (2),
  ADV-8 (1), ADV-5 (1) — every targeted run 1st-attempt PASS at its final
  timeout budget, 0 failures (ADV-5's first pass at an initially-tried 600 s
  budget hit that ceiling once and passed only on retry; re-run twice clean
  at 900 s with zero retries before being trusted). Suite now 49 tests / 22
  spec files. Full-suite run not yet done this sprint (deferred to the
  Part 1 phase boundary per the sprint brief).

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

- Priority C (P0 + all P1) is fully complete. Next: P2 cases ADV-9
  (append-only invariant harness), ADV-10 (interrupted return flow), ADV-11
  (repeated defer loop).
- Then a full-suite phase-boundary run (not yet done this sprint).
- Then POST-FABLE-MASTER-HANDOFF.md §11 backlog (items 1–3 are user/Sonnet;
  next Fable-suitable work is decision-gated).
