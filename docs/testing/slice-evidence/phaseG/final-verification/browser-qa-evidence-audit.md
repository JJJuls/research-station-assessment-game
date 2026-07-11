# Browser-QA evidence audit — V1 slice (Phase G final verification)

Date: 2026-07-11 · Branch `fable-autonomous-game-build-v1` · Working tree at
`687c2f4` + Phase G docs/e2e-helper changes (this directory).

Audit performed **inline in the main agent** following
`.claude/agents/browser-qa-reviewer.md`'s checklist and report format: the
`browser-qa-reviewer` subagent launch failed on a session limit and the user
directed the audit be completed in the main thread without respawning agents.

## 1. Scope

Done-claim audit of the whole V1 vertical slice (Dock → Hub → Archive
connected world, PixelLab `outpost-assets-v1` stimuli, canonical + legacy
event logging, Qualtrics contract) after Phase F asset integration.

## 2. Code gate results

- `npm.cmd run build`: **PASS** (exit 0, `build-log.txt`)
- `npm.cmd run lint:tsc`: **PASS** (exit 0, `tsc-log.txt`)
- Explicitly treated as necessary-not-sufficient; everything below is runtime
  evidence.

## 3. Runtime smoke results

Dev server (`npm.cmd run start`), Chromium via Playwright MCP.

- Load: no blank screen, no fatal errors. Console errors on the audited page
  load: **0** (`browser_console_messages`, current-navigation scope). A
  historical `all:true` dump contains texture-processing errors and one
  `ReferenceError: PROP_TEXTURES` from **stale HMR states** earlier in the
  Phase F work session (mid-download edits); they do not occur on a fresh
  load of the committed code and the production build passes.
- `window.researchRuntime` exists; surface is exactly the six contract
  methods, all `function`: `completeDebugSession`, `exportEventsJSON`,
  `getEvents`, `getSummary`, `printEvents`, `printSummary`
  (`final-session1-evidence.json`). Each was exercised: `getEvents` (31
  events), `getSummary` (well-formed summary), `exportEventsJSON` (non-empty
  JSON string), `completeDebugSession` (summary + returnUrl),
  `printEvents`/`printSummary` exercised in the committed spec
  `launch_with_research_params.spec.ts`.

## 4. Behavioural path results

**Session 1 — adaptive profile** (`final-session1-evidence.json`,
31 events, exact order):
`session_start, scene_start, dock_started, movement_instruction_shown,
first_movement, first_interaction, dock_tutorial_opened,
dock_controls_reviewed, dock_tutorial_completed, dock_instruction_followed,
tutorial_completed, control_error_count, scene_start, station_hub_entered,
scene_start, archive_room_entered, archive_terminal_opened, archive_attempt,
archive_code_entered, archive_wrong_code, archive_feedback_shown,
archive_terminal_opened, archive_feedback_used, archive_log_compared,
archive_terminal_opened, archive_attempt, archive_code_entered,
archive_strategy_revision, archive_completed, scene_start,
station_hub_entered`

- Full canonical Dock set incl. `tutorial_completed` (metadata
  `path: reviewed`) and `control_error_count` (metadata `count: 2` from two
  deliberate out-of-range SPACE presses) alongside all legacy `dock_*`
  events. Dock events carry `study_item_ids: []`, no construct.
- Hub entry logged per entry; no assessment/baseline re-fires on re-entry.
- Archive adaptive path: scripted A17 failure → feedback → log comparison →
  revision → completion. Payloads carry 21 fields
  (`payloadFields` in evidence file), correct `room_id`, `study_item_ids`
  (e.g. `archive_wrong_code` → Q13/adaptive_persistence, success false).
- Summary invariants: `strategy_revision_count=1`, `blind_retry_count=0`,
  `game_inappropriate_persistence=0`, `failure_adaptation_index=3`,
  `game_difficulty_persistence=3`, `manual_or_feedback_used=true`,
  control flags correct. **PASS**

**Session 2 — inappropriate-persistence profile**
(`final-session2-evidence.json`, fresh reload): dock → hub → archive, A17
twice (identical wrong code), leave unresolved, re-enter.
`archive_wrong_code` ×1, `archive_same_wrong_code_repeated` ×1,
`archive_abandoned` on exit (study_item_ids `["Q24"]`, no construct_id —
deliberate, pending user decision), `archive_returned_after_failure` on
re-entry (`["Q24","Q25"]`). Summary: `blind_retry_count=1`,
`game_inappropriate_persistence=1`, `strategy_revision_count=0`,
`failure_adaptation_index=-1`, `game_difficulty_persistence=0`,
`manual_or_feedback_used=false` — matches the Phase 0 baseline maladaptive
invariants; **adaptive vs inappropriate persistence fully separated. PASS**

Screenshots: `final-dock.png`, `final-hub.png`, `final-archive.png` (plus
route probes). Earlier full-playthrough evidence: `../phaseG-01..09`.

## 5. Qualtrics parameter results

Launched with all five params
(`participant_id=P-FINAL-G, game_session_id=GS-FINAL-G,
condition=test_condition, game_version=v1-slice, return_url=…`). All five
reflected in every event payload and in `getSummary()`.
`completeDebugSession().returnUrl` preserves the original `return_url`
(including its own query string) and appends the full summary-variable set;
raw event log unchanged afterwards (append-only). Missing-params fallback
covered by the committed spec. **PASS**

## 6. Playwright spec status

`e2e/`: `launch_with_research_params.spec.ts`,
`movement_and_first_interaction.spec.ts`, `archive_room_logging.spec.ts`
(6 tests, workers=1, retry=1). Final run: see `playwright-suite-log.txt` in
this directory. During Phase G the archive spec exposed a **test-helper
defect** (fixed in `e2e/helpers.ts`, no game code touched): fixed-duration
movement legs under-deliver distance when the machine is loaded (Phaser
frame-delta cap), intermittently under-shooting doors. Helpers now (a) wait
deterministically on the canonical room-entry event after door transitions
and (b) route every leg to overshoot against a clamping wall. Specs for the
seven unported rooms are intentionally absent (rooms not yet built).

## 7. Done-test verdict

- Dock (room doc 00): move → interact → confirm readiness, canonical +
  legacy events, control-only labelling — **PASS** (observed, §4).
- Hub (control/usability): navigation events, sealed doors, idempotent
  re-entry — **PASS** (observed here and in `../phaseG-04/05` evidence).
- Archive (room doc 01): scripted first failure, adaptive and blind-retry
  branches, leave/return events, persistence separation — **PASS** (§4).
- Prototype route: `?scene=prototype` regression vs the Phase 0 fixture
  (all 9 stations, event-for-event) — **PASS** (earlier Phase G run,
  `../`; fixture `docs/testing/baseline-e8a8994/`).

## 8. Verification gaps found

- **Significant:** `archive_log_compared` is only reachable from a narrow
  band below the shelves (side approaches bottom out at ~80 px vs the 72 px
  radius) — participants may geometrically miss the optional log step.
  Recorded in the stimulus-freeze checklist as a user decision.
- **Minor:** e2e suite exercises cardinal routes only; no spec asserts the
  `archive_abandoned`/`archive_returned_after_failure` pair (verified via
  MCP session 2 evidence instead) — candidate for a Beat-15 spec.
- **Minor:** `baseline_idle_seconds`/`tutorial_help_shown` remain untestable
  while the idle threshold is an open user parameter (mechanism disabled by
  design).

## 9. Verdict

**Verified with minor gaps** — every done-claim has direct runtime evidence
(driven paths + event/payload/summary assertions + screenshots); remaining
gaps are documented decisions or deferred spec coverage, none contradicting
a claim.
