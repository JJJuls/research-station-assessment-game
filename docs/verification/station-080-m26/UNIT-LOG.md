# Unit log — Station 080 M01–M26 implementation run

Branch `fable-professional-world-rescue-v2`, worktree
`.claude/worktrees/fable-professional-world-rebuild`, base
`2a557b720e2b23d56a9516fe7fb3b8d800d37fec` (verified clean, exact HEAD, no
remote branch contains it). Owner approval for the whole 26-item scope and
for running it as a sequence of bounded, reviewed, committed units is the
execution specification itself (the owner's "So lets continue and implement
these changes!" and the 22 September instructions). Each unit below carries
the operating-mode contract fields; every unit ends in one local commit;
nothing is pushed, merged, tagged or deployed by the agent.

Common contract fields (apply to every unit unless a unit overrides them):

- **Prohibited areas:** `docs/research/**`, `docs/scientific/**`,
  `docs/decisions/**`, `docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md`,
  the V3 build contract, `package*.json`, tool configs, `.husky/**`,
  `.claude/settings*.json`, `asset-candidates/**`, `ScoringManager.ts`,
  `SummaryScope.ts` formulas.
- **Entry state:** this branch, clean tree, HEAD = previous unit's commit.
- **Telemetry boundary:** only `proto_*` / `secondary_*` candidate families;
  no canonical event name or approved formula is invented; the scoring plan
  summary is untouched.
- **Stop conditions:** a file outside the allowlist becomes necessary; a
  scientific ambiguity the specification does not settle; a guard block; a
  deterministic failure in a required suite that the unit cannot explain.
- **Model:** Fable (implementation); Opus reviewers read-only.

## U1 — contract and data foundation

- **Objective:** put the versioned register, protocol constants, focused
  clock, feature-extractor framework and export block in place without
  changing any item mechanic.
- **Scientific rationale:** shared rules of the specification (versioning,
  focused time, denominator-of-zero, first-response preservation,
  distinguishable closure/missingness); scientifically neutral for every
  item (no mechanic changes).
- **Participant-facing behaviour:** none changes.
- **Allowed files:** `docs/verification/station-080-m26/**`,
  `src/measurement/protocol.ts`, `src/measurement/focusedClock.ts`,
  `src/measurement/focusMonitor.ts`, `src/measurement/registerV3.ts`,
  `src/measurement/features/**`, `src/pilot/coverageSchedule.ts`,
  `src/pilot/pilotCoverage.ts`, `src/systems/ResearchRuntime.ts`,
  `src/systems/ResearchExportClient.ts`,
  `e2e/m26_protocol_foundation.spec.ts`; extended during verification by
  `e2e/research_export_test_mode.spec.ts` (its exact payload-key assertion
  had to learn the two additive keys — a required-test update to the
  approved protocol, not a loosened assertion).
- **Success behaviour:** typecheck/build green; the schedule derived from
  the register equals the v2 schedule for every item; an empty log exports
  26 items × every feature key, all `null` with a disposition; the focused
  clock excludes hidden/unfocused time by cause and caps on focused time.
- **Failure/recovery:** an extractor fault yields `technical_failure` rows,
  never a lost export; the augmenter is wrapped so an export never breaks.
- **Scientific acceptance:** no wording in the bundle (existing guard test);
  no zero for an unobserved feature; no composite.
- **Gameplay acceptance:** not applicable (no participant-facing change).
- **Required tests:** `npm.cmd run lint:tsc`, `npm.cmd run build`,
  `e2e/m26_protocol_foundation.spec.ts`, `e2e/pilot_coverage.spec.ts`,
  `e2e/evidence_ledger.spec.ts`, `e2e/summary_scope.spec.ts`, ESLint +
  Prettier on touched files.
- **Required screenshots:** none.
- **Commit expectation:** `feat(measurement): station 080 m01-m26 protocol
foundation — register v3, focused clock, feature export`.
- **Review round 1 (read-only):** the project-local reviewer agents were
  not discoverable in this session (a known discovery limitation), so the
  `scientific-reviewer` and `test-reviewer` scopes were run through
  general-purpose agents with the same read-only instructions. Test review:
  every command green (62 pure tests across six specs, lint, typecheck,
  allowlist), adverse cases suggested and added. Scientific review: 8 major
  / 11 minor findings, all bounded fixes applied in round 1 — M17 attainment
  rule, `voluntary_stop` disposition and `closure_reason` on every row,
  caller-stated disposition for zero denominators, `planned_denominator`
  with `incomplete` partial scores, reload-aware `interrupted`, clock keeps
  causes recorded before start, M25 label parity, `independence` per item,
  explicit cited `disposition_override`, M17/M24/M26 companions, addendum
  wording (M22 denominator, scoped insertion text, unchanged
  `export_schema_version`), memoised augmenter with technical-error
  marker, pinned question stems, bounded supporting sequences, overlap
  rule documented. Open-decision candidates recorded in the register §5.
- **Review round 2 (verification):** 18 of 19 findings verified fixed; one
  new major — planned-observation versus conditional-eligibility
  denominators — fixed in round 2 (`denominator_kind` on every feature;
  M10/M11/M19/M20/M21/M23 are complete at any denominator above zero;
  register §5.2 extended) together with the minor clock-restart note.
  Review closed after two rounds per the operating mode.
- **Verification results:** `npm.cmd run lint:tsc` 0 · `npm.cmd run build`
  0 · ESLint + Prettier on every touched file 0 · pure suites
  `m26_protocol_foundation` (14) + `pilot_coverage` + `evidence_ledger` +
  `summary_scope` all green (test reviewer additionally ran
  `pilot_route_model` + `pilot_closure_models`: 62/62) · browser
  `research_export_test_mode` 11/11 after the payload-key update (10/11
  before it; the one failure was the deterministic exact-key assertion,
  now updated) · `verify-unit` PASS · `git diff --check` clean.
- **Deviations:** allowlist extended by the export spec (declared above);
  project reviewer agents not discoverable (general-purpose stand-ins with
  the same read-only scope); no screenshots (none required).
- **Not changed:** every item mechanic, `ScoringManager`, `SummaryScope`,
  `docs/research/**`, `docs/scientific/**`, the v2 ledger and its
  generator, package files, tool configs, settings.
- **Commit:** one local commit; nothing pushed, merged, tagged, deployed or
  deleted.

## U2 — M08 effort allocation (station support console)

- **Objective:** add the owner-approved M08 controlled task: practised
  demanding work (sort readings by a visible rule) versus standing by in
  six 15-focused-second slots with displayed benefits of 1 or 3 station
  output units (three each, counterbalanced), payment and route fixed.
- **Scientific rationale:** specification M08 row ("Add controlled task";
  R09 effort allocation; exploratory counterpart). Measure
  `m08_work_choice_fraction` = Work / explicit valid choices (6 planned);
  per-level fractions, practice performance and work demand as companions;
  a slot without an explicit choice is missing, never Rest.
- **Participant-facing behaviour:** a "Station Support Console" in the
  Recovery Yard (open field south-west of the mast) opens a work surface:
  practice of four readings, then six slots — "Sort readings (+N units)"
  or "Stand by (+0)", both 15 s, same neutral ending; a fictional output
  tally; no praise, no race framing, no reward effect.
- **Allowed files:** `src/pilot/exterior/m08EffortModel.ts` (pure model),
  `src/pilot/windows/m08EffortChoice.ts` (window adapter),
  `src/pilot/windows/m08SurfaceModel.ts`, `src/pilot/windows/reviewClosure.ts`,
  `src/pilot/zoneSites.ts`, `src/world/interactionRegistry.ts`,
  `src/scenes/ExteriorRecoveryYardScene.ts`, `src/measurement/registerV3.ts`,
  `src/measurement/features/**` (m08 extractor), `e2e/m08_effort_choice.spec.ts`,
  `e2e/m08_effort_route.spec.ts`, `e2e/exteriorHelpers.ts`,
  `e2e/pilot_coverage.spec.ts`, `e2e/pilot_closure_models.spec.ts`,
  `e2e/m26_protocol_foundation.spec.ts`, the docs directory.
- **Entry state:** HEAD `9566f1e1`, clean tree.
- **Success behaviour:** six explicit choices complete the window (valid);
  the extracted primary is observed 0–6 with per-level fractions; the
  focused clock excludes hidden / unfocused / closed-surface time.
- **Failure/recovery:** closing the surface pauses a running slot and
  reopening resumes it; Noor's shift end completes an open console as a
  stopped observation with missing slots kept missing; the review marks a
  never-opened console absent and censors an open one; a console left
  before any choice is a voluntary stop with a null value.
- **Telemetry boundary:** family `proto_m08_effort_*` (candidate); the v2
  `secondary_m08_optional_job_*` telemetry is retained as descriptive
  context; no canonical name or formula invented.
- **Scientific acceptance:** missing choice ≠ Rest; both slot kinds equal
  duration; benefit levels balanced; payment/route untouched; exploratory
  label kept.
- **Gameplay acceptance:** console reachable on the ordinary route with
  the audited approach point (registry spec green); no study identifier
  visible; ESC always leaves.
- **Required tests:** `lint:tsc`, `build`, ESLint/Prettier on touched files,
  pure `m08_effort_choice` + foundation + coverage + registry + exterior
  models + closure models + evidence ledger (93/93), browser
  `m08_effort_route` (1/1, 4.3 min, real navigation and pointer input).
- **Required screenshots:** none.
- **Commit expectation:** `feat(m08): station support console — six
15-second work-or-stand-by slots with displayed benefits`.
- **Handoff / deviations:** the schedule-count assertions in
  `pilot_coverage` and `pilot_closure_models` now derive from the register
  (M08 joined the scheduled set); the placement is the Recovery Yard
  (register §5.8). **Independent read-only review of this unit is still
  pending** (the session's context budget was exhausted after
  verification) — the next session must run the scientific and gameplay
  reviews on this commit and apply any bounded fixes as a follow-up
  commit before U3.

## U2-R — M08 independent review closure (bounded fixes)

- **Objective:** close the pending independent read-only review of U2 (and
  its shared U1 dependencies) by applying bounded fixes for every material
  finding and recording the owner-facing open questions the review surfaced.
- **Scientific rationale:** specification M08 row plus the shared rules on
  focused time ("no continued timers behind a closed panel"; "leaving a work
  surface must not let an unattended interval silently finish as valid
  work"), first-response protection under double input, the reload rule
  ("never convert a reload into fresh independent trials"), the
  denominator-of-zero rule for the per-benefit companion, and the
  reachability requirement ("a normal participant route exposes M01–M26").
- **Participant-facing behaviour:** the "Leave console" button now pauses a
  running slot exactly like ESC; every slot (and the practice) ends on a
  neutral interval screen whose single "Continue" control sits away from the
  bins and the two choice buttons, so an in-flight click or a carried-over
  ENTER can never become the next slot's choice; the choice screen states in
  readable copy that both options last the same 15 s and that pay and route
  are unaffected; units are shown as produced by sorting (a Work slot with no
  reading sorted produces none); practice sorts get neutral factual
  feedback; Noor's briefing lists the console as the sixth yard job (between
  the rig and the uplink posts) and the objective line guides to it; a console
  already administered before a reload is not re-run.
- **Allowed files:** `src/pilot/exterior/m08EffortModel.ts`,
  `src/pilot/windows/m08EffortChoice.ts`,
  `src/pilot/windows/m08SurfaceModel.ts`,
  `src/scenes/ExteriorRecoveryYardScene.ts`,
  `src/pilot/exterior/exteriorEpisodeModel.ts`,
  `src/measurement/features/m08.ts`, `src/measurement/features/types.ts`,
  `src/measurement/features/extract.ts`, `src/measurement/registerV3.ts`,
  `src/systems/ResearchRuntime.ts` (one additive read-only getter for prior
  page-load events — reload guard; nothing else), `e2e/m08_effort_choice.spec.ts`,
  `e2e/m08_effort_route.spec.ts`, `e2e/pilot_exterior_models.spec.ts`,
  `e2e/m26_protocol_foundation.spec.ts`, `e2e/exteriorHelpers.ts`,
  `docs/verification/station-080-m26/**`.
- **Entry state:** HEAD `0c6f2d46`, clean tree.
- **Success behaviour:** every material review finding is either fixed in
  code with a test or recorded as an owner question in the register §5; the
  U2 suites stay green; the browser route spec additionally exercises the
  leave-button pause, a keyboard choice and the exported feature row.
- **Failure/recovery:** unchanged closure rules (shift end, review, ESC) plus:
  a shift end with fewer than six completed slots is a censored (stopped)
  observation in the validity register, never "completed"; a reload with
  prior M08 evidence marks the opportunity technically incomplete and leaves
  the prior-load evidence untouched.
- **Telemetry boundary:** `proto_m08_effort_*` candidates only; new suffixes
  `presented` (window kit), `interval_continued`; new metadata
  `served`, `choice_focused_ms`; `measurement_features` rows gain the
  register's `independence` and `coverage_label` (additive); no canonical
  name or approved formula invented; the primary formula is unchanged.
- **Scientific acceptance:** unattended time never completes a slot; a
  choice is always an explicit press on a dedicated control; zero valid
  choices give null at every level; a Work slot's output is produced by
  sorting, never by the choice alone; the choice count itself is unchanged.
- **Gameplay acceptance:** console reachable through Noor's list and the
  beacon without contradiction; readable copy at 800×600; hotkeys visible on
  the buttons.
- **Required tests:** `lint:tsc`, `build`, ESLint/Prettier on touched files,
  pure `m08_effort_choice` + `pilot_exterior_models` + `m26_protocol_foundation`
  - `pilot_coverage` + `pilot_closure_models`, browser `m08_effort_route`.
- **Required screenshots:** none required; the route spec captures the
  choice screen at 800×600 as evidence for the occlusion finding.
- **Stop conditions:** common.
- **Model:** Fable.
- **Commit expectation:** `fix(m08): close the unit 2 review — leave-button
pause, interval screen, served work, reload guard, honest dispositions`.
- **Review round 1 (read-only, on `0c6f2d46`):** the project reviewer
  agents were again not discoverable, so the `scientific-reviewer` and
  `gameplay-reviewer` definitions were run verbatim through general-purpose
  Opus agents. Scientific: 5 major / 8 minor findings; gameplay: 3 high /
  3 medium / 2 low. Material findings and their resolution:
  - Leave button bypassed the pause (S-F1 / G-F1) — fixed: one close path
    (`m08SurfaceHost.close` pauses, then closes); browser spec leaves
    mid-slot through the button on a work slot and a stand-by slot.
  - Click-through / focus carry-over at slot transitions (S-F2 / G-F3) —
    fixed: interval screen with a single Continue control on its own row;
    choice buttons on a row the bins never use; choices are only ever
    presented by Continue.
  - Units credited without any work (S-F3) — fixed under the stated default
    (units produced by sorting; `served` recorded); owner question §5.9.
  - Reload re-administration (S-F4) — fixed: prior-load guard on open,
    prior exposure recorded, window technically incomplete, features
    `interrupted`; `ResearchRuntime.getPriorPageLoadEvents()` added
    (read-only, additive); owner question §5.14.
  - Per-benefit companion always observed (S-F5) — fixed: null with the
    primary's disposition at zero valid; `incomplete` below three per level.
  - Mislabelled dispositions (S-F6) — fixed: `presented` at the briefing
    → presented-but-never-opened is `declined`; shift end with fewer than
    six ended slots is a censored stop in the register, never completed;
    review-time zero-choice closure keeps `voluntary_stop` + `censored`.
  - Practice "passed" without a criterion (S-F7) — fixed: no comprehension
    claim; factual per-sort practice feedback; owner question §5.16.
  - Choice latency included closed time (S-F8) — fixed: `choice_focused_ms`
    beside the wall latency.
  - `value` semantics (S-F9) — documented in the addendum (numerator count
    with denominator beside it; never a ratio).
  - Clustering invisible in the export (S-F10) — fixed: `coverage_label`
    and `independence` on every feature row (additive).
  - Wrong operational label (S-F11) — fixed (Recovery Yard).
  - PRIMARY-CANDIDATE with an exploratory label (S-F12) — kept; owner
    question §5.15; the stale comment in `secondaryTelemetry.ts` is outside
    the allowlist and left as is.
  - Test gaps (S-F13) — closed: keyboard choice and continue, leave-button
    pause, offline reproduction of the feature row from the raw family;
    reload guard covered by pure tests (a browser reload run is a later
    end-to-end unit).
  - Status copy occluded by the readout row (G-F2) — fixed: one-line status,
    explanatory text element; screenshot `test-results/m08-choice-800x600.png`
    (not committed) shows the choice screen legible at 800×600.
  - Redraw chains (G-F4) — fixed: one pending tick, wall-clock timer.
  - "All slots complete" after a stop (G-F5) — fixed: copy from the closure.
  - Console absent from Noor's list and the beacon contradicting the
    objective (G-F6) — fixed: sixth listed job; `EXTERIOR_SITE_ORDER`
    'console' between rig and uplink; beacon orders console 5 / uplink 6.
  - Low-contrast accent readouts and 10 px stimuli (G-F7) — fixed: default
    readout fill, standard size. Hotkeys shown on buttons (G-F8).
  - Not changed (recorded as owner questions §5.10–5.13): work demand,
    the content of "Stand by", a Work choice cut off before its slot, the
    presented-but-not-approached code.
- **Defect found by the new browser coverage (not a review finding):**
  reopening the console during a stand-by slot froze the slot ("13 s
  left" forever) because the tick scheduler asked for the active surface
  while the reopened surface was still in its create step — deterministic
  (2/2 failures with retries off) and fixed with a wall-clock timer plus a
  close serial; the spec now interrupts a work slot AND a stand-by slot
  whatever the counterbalance order.
- **Verification results:** `npm.cmd run lint:tsc` 0 · `npm.cmd run build`
  0 · ESLint + Prettier on every LF touched file 0
  (`exteriorEpisodeModel.ts` is CRLF in the working tree and LF in the
  index — lint-staged normalises it at commit; its 12-line change was
  checked by eye) · pure `m08_effort_choice` + `pilot_exterior_models` +
  `m26_protocol_foundation` + `pilot_coverage` + `pilot_closure_models`
  59/59 · browser `m08_effort_route` 2/2 with retries off (8.7 min for
  both; the earlier 1-flaky run was the deterministic stand-by defect
  above, since fixed) · `verify-unit` and `git diff --check` recorded in
  the handoff.
- **Deviations:** `CLAUDE_UNIT_ALLOWLIST` cannot be exported from inside
  the session (the guard reads the Claude Code process environment), so
  the allowlist was enforced by discipline and checked with `verify-unit`
  before the commit; reviewer stand-ins as above; no third review round
  (the fixes are bounded to cited findings; a fresh review of U2-R itself
  is folded into the U24 end-to-end review).
- **Not changed:** `ScoringManager`, `SummaryScope`, `docs/research/**`,
  `docs/scientific/**`, the v2 ledger, package files, tool configs,
  settings, every other item's mechanic.
- **Commit:** one local commit; nothing pushed, merged, tagged, deployed or
  deleted. U2 is accepted for the purposes of this run (owner questions
  §5.9–5.16 remain open and reversible).
