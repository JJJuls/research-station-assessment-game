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
