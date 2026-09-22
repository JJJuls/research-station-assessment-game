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
