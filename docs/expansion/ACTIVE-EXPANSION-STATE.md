# Active Expansion State — Wave 1A / 1B / Sprint A

Live checkpoint file. Updated after every commit. Newest entry first.

- **Branch**: `fable-autonomous-game-build-v1` (V1 slice frozen at `556e273`)
- **Protected branch**: `fable-final-game-prep-from-prototype` @ `e8a8994` — untouched
- **Session constraints**: main Fable agent only; PixelLab disabled; Playwright
  via CLI only; no push/merge/PR/rebase/reset/branch-switch.

## Current status — SPRINT PHASES A6 + 4 + 5 COMPLETE (this commit)

- **Phase-boundary full suite: GREEN** (`.last-run.json` status passed, 0
  failed; 31.7 min; RTK-compressed count line read "PASS (35)" for the
  36 tests collected at start — Playwright's own record is authoritative).
- **A6 (robustness + delegation)**: `9d6406d` room-acceptance +
  connected-journey templates; `fe325db` station implementation
  conventions (registration/state-lifetime rules, explicit
  no-further-centralization ruling, fragile-points list) +
  `docs/ai/DEBUGGING-CHECKLIST.md`; `3ee9424` prettier-mangle fix. No code
  changes — A2 spec already covers invalid-route/reload runtime behavior;
  no demonstrated defect justified touching verified scenes.
- **Phase 4 (participant lifecycle)**: this commit —
  `docs/architecture/PARTICIPANT-LIFECYCLE.md` (launch→return audit,
  zero defects; fallback-identity and return-URL failure paths were the
  only uncovered areas) + `e2e/participant_lifecycle.spec.ts` (2/2 PASS
  targeted: bare launch → fallback ids + null return; malformed
  return_url → null, no crash). Suite is now 38 tests.
- **Phase 5 (technical stimulus-freeze audit)**: `d6a5a84` —
  `docs/research/STIMULUS-FREEZE-TECHNICAL-AUDIT.md`; all 17 manifest
  SHA-256 records byte-verified; no unmanifested art since `556e273`;
  pre-pilot work split technical (T1–T4) vs user-owned scientific. Freeze
  NOT approved (user-owned).
- **Phase 6 (in progress)**: `1c3f492` sonnet continuation guide.
- **Exact next action**: write `docs/ai/POST-FABLE-MASTER-HANDOFF.md`,
  update the Sprint A handoff to final state, then session-end checkpoint
  (build + tsc + diff --check + clean tree).

## Prior status — SPRINT A PHASE A5 COMPLETE (d58ddd7)

- **Base**: `278f9ef` (A4). This commit adds
  `docs/architecture/CROSS-ROOM-INTEGRATION.md` — the cross-room
  integration contract: full writers→readers matrix for every SessionState
  mission field (each row pinned to its runtime verification in the A2/A3/
  A4 specs), status-board consumption rules, and the mandatory three-layer
  Hazard→Final Core split (technically available: `hazard_status` written
  - verified on all branches / currently consumed: nothing / scientifically
    unspecified: `hazard_issue_created`/`hazard_issue_resolved`/
    `final_hazard_issue` — user-owned, MUST NOT be implemented autonomously).
- **Audit result: zero technical defects with authoritative semantics.**
  Known asymmetries documented as user-owned: inventory organization
  scoring naming split (Beat-13), forced-path summary quality derivation
  (Beat-13), Hazard board line permanently `pending` (D1 consequence).
- **Docs-only unit** — no code changes; tsc clean.
- **Exact next action**: Phase A6 — robustness + delegation architecture
  (invalid-route/reload resilience already runtime-covered in A2; add
  reusable conventions/templates for later models, fragile-architecture
  notes; no cosmetic refactoring), then phase-boundary full suite (36).

## Prior status — SPRINT A PHASE A4 COMPLETE (278f9ef)

- **Base**: `71cadfb` (A3 checkpoint). This commit adds
  `e2e/connected_participant_journeys.spec.ts` (3 sessions), journey.ts
  in-room helpers (openStationAlcove, completeDockTutorial,
  position-independent dockToHubJourney), and the evidence record
  `docs/testing/connected-journey/CONNECTED-JOURNEY-EVIDENCE.md`.
- **3/3 connected journeys PASS through real doors** — P1 adaptive/informed
  /duty-completed/high-quality-core (+ return flow), P2 shortcut/declined/
  switched/partial-repair/reckless/forced-core, P3 practice/defer-then-
  complete/avoided/ignored/blind-retry/rushed-core. Hazard branches split
  across sessions (scientific validity). Zero game defects; zero console
  errors; mission-state, event-order, one-shot, metadata, and frozen-summary
  spot checks all live-verified.
- **New Beat-13 observation (user-owned)**: ScoringManager organization
  formulas count only the legacy option-3 inventory names; the chained
  systematic path emits canonical names only, so organization_kit_verified
  stays false on that path (raw events fully logged; analytically
  recoverable). Details in the evidence doc §Observation.
- **Exact next action**: Phase A5 — cross-room integration contract doc
  (incl. the Hazard available/consumed/unspecified split), then A6
  robustness/delegation architecture.

## Prior status — SPRINT A PHASE A3 COMPLETE (71cadfb)

- **Base**: `54ba3e8` (A2). Commits: `76c91f2` (journey helpers + route
  rework), `167837e` (navigation smoke spec), this state/handoff commit.
- **A3 deliverables**: `e2e/journey.ts` (count-aware transition waits,
  door-driven legs, error capture, mission-state probe, subsequence/
  metadata/return-flow assertions) + `e2e/connected_world_smoke.spec.ts`
  (full door ring, one navigation-only session).
- **Two test-infra defects found & fixed during bring-up** (game code
  untouched): (1) count-after-action race — the transition-wait baseline
  must be captured BEFORE the triggering action; (2) `hubToStationDoor`
  mid-height clamp legs wedged against the Hub console block / undershot
  from side-wall return spawns — all routes now normalize via a pocket-safe
  north-west anchor (down-clamp, 400ms up-hop, west-clamp, north-clamp).
- **Full suite 33/33 PASS (18.8m), zero retries** under SwiftShader.
- **Exact next action**: Phase A4 — three connected participant journeys
  (P1 adaptive/informed, P2 shortcut/interrupted/reckless, P3
  avoid/defer/rushed; hazard branches split across sessions), evidence in
  docs/testing/connected-journey/.

## Prior status — SPRINT A PHASE A2 COMPLETE (54ba3e8)

- **Base**: `6424697` (A2 audit doc) on `2c455c7` (A1). This commit adds
  `e2e/state_session_continuity.spec.ts` (4 tests: reload semantics, direct
  room launch + current_room_id, invalid `?scene=` fallback with error
  listeners, door-transition current_room_id + getSummary purity) and one
  **test-infra fix** in `playwright.config.ts`.
- **Flake root cause found & fixed (infra, not game)**: the historical
  "cold-Vite first-load timeout" was actually Phaser's WebGL renderer boot
  failing on the FIRST context of every fresh headless Chromium
  ("Framebuffer status: Framebuffer Unsupported" + context loss, visible in
  the Vite client-error stream). Fixed by forcing deterministic software GL
  (`--use-gl=angle --use-angle=swiftshader`). Result: **full suite 32/32
  PASS in 11.1 min with ZERO first-attempt failures** (previously the
  run's first test always burned a retry).
- **A2 audit (docs/architecture/STATE-AND-SESSION-CONTINUITY.md)**: zero
  demonstrated game defects. Three observations documented for user rulings
  (dock controlErrorCount per-visit lifetime; debug completeDebugSession
  unguarded objective_completed; reload double-session_start analysis
  caveat).
- **Exact next action**: Phase A3 — reusable connected-journey Playwright
  helpers (door-driven navigation, mission/event/metadata assertions,
  error capture), checkpointed separately from the journey specs.

## Prior status — SPRINT A PHASE A1 COMPLETE (2c455c7)

- **Base**: `201c8fa` (tag `hazard-control-verified-201c8fa`). Sprint A
  (final Fable window) running per the Sprint A brief; continuous handoff at
  `docs/ai/FABLE-FINAL-SPRINT-A-HANDOFF.md`.
- **A1 — connected-world transition contract**: full static audit (scene
  registrations, `?scene=` routes incl. invalid fallback→dock, Hub door
  ring, spawns vs 72px radius, exits, collision/world bounds, camera/FIT,
  transition-event emission, session-metadata preservation, prototype
  route). **Zero demonstrated defects; zero fixes.** Deliverables:
  `docs/architecture/CONNECTED-WORLD-TRANSITION-CONTRACT.md` +
  `docs/architecture/transition-inventory.json` (machine-readable, entry
  events verified against scene sources). tsc PASS (docs-only change).
- **Notable audit observations (non-defects, §10 of contract)**: sealed-door
  branch now unreachable (kept as safety net); double `setCurrentRoom` per
  transition (idempotent, covers direct launches); unknown `?scene=` silent
  dock fallback (documented intent).
- **Exact next action**: Phase A2 — state/session continuity audit + tests
  (re-entry semantics, one-shot guards, reload, direct launch, metadata
  continuity, debug API, scoring-summary consistency, Hazard state, Final
  Core consumption). Checkpoint per coherent unit.

## Prior status — HAZARD CONTROL VERIFIED (201c8fa)

- **Base**: `fbe98bf` (verification plan) on `ecd2256` (implementation).
  This commit adds `e2e/hazard_control_logging.spec.ts` (4 tests, incl.
  console-error listeners) and the evidence doc
  `docs/testing/hazard-verification/HAZARD-EVIDENCE.md`.
- **Consolidated verification: 28/28 PASS, 0 failures** — full suite (9
  prior specs, 24 tests) + the new hazard spec (4 tests); all 4 hazard
  tests first-attempt PASS in the full run. Two pass-on-retry cases were
  the documented cold-Vite first-load timeout on pre-existing specs — no
  behavioural assertion ever failed. **Zero game defects found; zero fixes
  applied.** The U6 hazard door route worked as authored.
- **Verified live (H1-H11 + D1 invariants)**: all three branches with exact
  `study_item_ids`/`construct_id`/`success` pins; `hazard_route_avoided`
  additive beside verbatim legacy `hazard_avoidance`, telemetry-only
  (`[]`, no construct), moving NO construct variable;
  `abandonment_count = 1` from the legacy event only; reckless metadata
  live; warning repeatable; leave-and-return keeps informed classification;
  `hazard_status` propagation; Qualtrics params on every event; no console
  errors; no invented completion gate.
- **Wave 1 build is now COMPLETE: all 8 stations implemented and
  runtime-verified.** Remaining work is decision-gated, not build-gated:
  Beat-13 supervised scoring bundle (D2, includes `final_core_force_continue`
  - `strategy_revision_count` fixes + `final_quality_score` +
    exploratory-label mechanism), then Beat 14 Qualtrics return preview;
    hazard consequence propagation into Final Core
    (`hazard_issue_created/resolved`, `final_hazard_issue`) stays a
    documented gap pending task-design semantics (hazard_status source now
    exists).
- **Exact next action**: dispatch `research-data-reviewer` +
  `gameplay-implementation-reviewer` sequentially over the Hazard beat
  range (`317e07b..HEAD`) per the routing policy — the room has passed its
  consolidated verification, so reviewer dispatch is now permitted.

## Hazard implementation checkpoint (fbe98bf)

- **Base**: `ecd2256` (Hazard Control implementation, station beat 7) on
  `f27130d` (D1 ruling recorded). Build + tsc PASS at `ecd2256`.
- **Implemented per D1 (Option A)**: `HazardScene` (`?scene=hazard`), registry
  `sceneKey` flip + statusBoardLabel 'Hazard control'; audit-first port
  (labels/feedback/legacy events verbatim; warning on every prompt open;
  repeatable prompt — no invented one-shot gate; live
  `metadata.info_checked_before_continuing` on reckless). Session-lifetime
  `infoChecked` via U2 factory (leave-and-return keeps informed
  classification). Additive canonical: `hazard_room_entered` (unmapped
  precedent), `hazard_route_avoided` (D1: `study_item_ids []`, no construct,
  telemetry-only, registered in `CANONICAL_EVENT_CONTEXT`). `hazard_status`
  vocabulary: informed_continue / reckless_continue / route_avoided.
- **Deliberately unemitted (documented)**: `hazard_issue_created`,
  `hazard_issue_resolved` (no documented emission semantics/resolve
  mechanic), `final_hazard_issue` (Final Core side; `hazard_status` now
  provides its SessionState source). ScoringManager/QualtricsBridge
  untouched (Beat-13 stays user-gated; `abandonment_count` continues to
  derive from legacy `hazard_avoidance` — ScoringManager.ts:88 unchanged).
- **Exact next action**: run the consolidated verification gate per
  `docs/expansion/HAZARD-VERIFICATION-PLAN.md` (Playwright enabled for the
  gate only): author `e2e/hazard_control_logging.spec.ts`, run the full
  suite, fix only demonstrated defects, final verification commit + report.
  Reviewers are dispatched only after the room passes verification.

## D1 ruling recorded (f27130d)

- **Base**: `317e07b` (Wave 1 review gate `c22ad7d` + user decision brief).
  Review gate result: CONDITIONAL PASS (0 blockers; 1 user-owned major = Beat-13
  RD-1; details in `docs/expansion/reviews/WAVE1-REVIEW-GATE.md`).
- **USER RULING D1 (2026-07-12) — `hazard_avoidance` canonical resolution:
  Option A authorized.** New additive canonical event `hazard_route_avoided`:
  `study_item_ids: []`, `construct_id` unset — raw behavioural telemetry only,
  never construct-scored, never in ScoringManager formulas, no Q-item mapping
  inferred, no success semantics invented. Legacy `hazard_avoidance` stays
  emitted verbatim (existing semantics; `abandonment_count` derivation
  preserved). `hazard_info_checked` reserved exclusively for actual
  information-checking. Avoidance stays analytically distinguishable from
  info-checking, informed continuation, reckless continuation, and
  abandonment. Recorded in: this file; `WAVE1-USER-DECISION-BRIEF.md` §A;
  `docs/research/event-schema.md` §4 Hazard table (new `approved` row).
- **Unresolved issue 3 is RESOLVED** (list below updated). Issues 1-2, 4-8
  remain open and user-owned; Beat-13 (issue 6) stays out of scope for the
  Hazard beat — ScoringManager/QualtricsBridge remain untouched.
- **Exact next action**: implement Hazard Control (last Wave 1 room beat) per
  `docs/game/rooms/05-hazard-control.md` + the D1 ruling; then build/tsc, a
  clean implementation commit, a consolidated Playwright verification plan,
  and the runtime verification gate before any reviewer dispatch.

## Wave 1B verification complete (89e9597)

- **Base**: `d9d4789` (verification-prep checkpoint); this commit adds the
  verification results. Full evidence:
  `docs/testing/wave1b-verification/WAVE1B-EVIDENCE.md` (+ raw prototype
  drive report JSON alongside).
- **Consolidated Playwright suite: 24/24 PASS, 0 flaky** (final run) — all
  six Wave 1A rooms (repair, engineer, inventory, side_repair,
  interruption, final_core) plus the three V1 regression specs; every
  spec-pinned `study_item_ids`/`construct_id`/`success` verified against
  live events; scoring separation invariants verified in both directions;
  mission-state propagation verified via debug probe.
- **Defect found & fixed (1, genuine)**: SideRepairScene grid row 7 central
  block overlapped the spawn and made the Utility Bot unreachable (all
  paths dead). Fixed by clearing the central segment (placeholder geometry
  only — no scientific change). Evidence §2.
- **Debug API (gated via qualtrics-logging-review)**: additive dev-only,
  read-only `getMissionState()` on `window.researchRuntime` (7th method;
  baseline six unchanged; defensive copy — no mutation path). The prep-doc
  claim that `sessionState` was already exposed was wrong (corrected in the
  plan). Launch spec's pinned surface updated accordingly. Evidence §3.
- **Test-side fixes**: `waitForNthEvent` helper (re-entry race);
  repair test 3 exit re-choreographed (block-vs-wall clamp ambiguity); NEW
  `objective_completed` Archive+Repair parity test (fires exactly once,
  archive-terminal payload context). `hubToStationDoor` door-ring routes
  needed **no** tuning — verified as authored for all six stations.
- **Prototype regression (`?scene=prototype`, headed drive)**: dock,
  archive-adaptive, archive-maladaptive event sequences = **0 diffs** vs
  `baseline-e8a8994` fixtures on all stable fields; append-only + return-URL
  invariants hold. The two documented additive payload deltas verified
  live: `side_repair_completed` +`study_item_ids [Q07,Q16,Q32]` (no
  construct), `final_core_status_reviewed` +`[Q11]`/`responsibility`;
  names/order/one-shots/co-events byte-identical; fixture JSONs untouched.
  Evidence §5.
- **Final gates**: build PASS, tsc PASS, `git diff --check` clean, zero
  diff to CanonicalEventContext/ScoringManager/QualtricsBridge/EventLogger/
  SessionState/DataQualityTracker; Hazard Control confirmed unimplemented
  (no scene, no sceneKey, sealed door).
- **Runtime-verification debt (issue 9): CLEARED** for all six Wave 1A
  rooms — they are now verified working in a real browser, not just
  compiled.
- **Exact next action**: (1) dispatch `research-data-reviewer` +
  `gameplay-implementation-reviewer` over the Wave 1A+1B diff (per Wave 1A
  plan step 3); (2) user decisions remain the only build blockers —
  `hazard_avoidance` → Hazard Control beat (+ its spec), then the
  supervised Beat-13 scoring beat (ScoringManager/QualtricsBridge,
  `final_quality_score_computed`/`final_summary_previewed`/
  `qualtrics_return_previewed`).

## Wave 1B preparation (d9d4789)

- **Base commit**: `7a76cf4` (Wave 1A build phase complete + final state doc);
  this docs checkpoint is HEAD. Working tree otherwise clean; branch ahead of
  origin by local commits only (no push).
- **Preparation results** (2026-07-12):
  - `npm.cmd run build` PASS (pre-existing chunk-size warning only);
    `npm.cmd run lint:tsc` PASS.
  - All six Wave 1A specs exist and compile; every pinned
    `study_item_ids`/`construct_id`/`success` value statically verified
    against the frozen `CANONICAL_EVENT_CONTEXT` — zero mismatches.
  - `researchRuntime.sessionState.getMissionState()` debug surface confirmed
    (`src/systems/ResearchRuntime.ts:32`).
  - Baseline fixtures `docs/testing/baseline-e8a8994/*.json` verified to
    contain NO `side_repair_completed`/`final_core_status_reviewed` events —
    the flagged "re-baseline" is a live-prototype payload-delta check plus
    additive documentation, not a fixture rewrite.
- **Verification plan**: `docs/expansion/WAVE-1B-VERIFICATION-PLAN.md` —
  per-room expected navigation/events/science/state (§3), the exact spec
  updates owed (§4: route tuning; ONE coverage gap — `objective_completed`
  Archive+Repair parity test; prototype regression procedure §5), and the
  execution order (§6).
- **Exact Playwright paths** (config `playwright.config.ts`, serial,
  port 5173): `e2e/launch_with_research_params.spec.ts`,
  `e2e/movement_and_first_interaction.spec.ts`,
  `e2e/archive_room_logging.spec.ts` (V1 regression, run first);
  `e2e/repair_room_logging.spec.ts`, `e2e/engineer_hub_logging.spec.ts`,
  `e2e/inventory_prep_logging.spec.ts`, `e2e/side_repair_logging.spec.ts`,
  `e2e/interruption_corridor_logging.spec.ts`,
  `e2e/final_core_summary.spec.ts` (Wave 1A, build order); shared fixtures
  `e2e/helpers.ts` (`hubToStationDoor` routes untuned except archive).
- **Expected assertions**: as pinned in the six specs (registry-verified this
  session) and enumerated per room in the verification plan §3 — event
  presence/absence, one-shot counts, science-context pins, mission-state
  probes, summary separation invariant (adaptive path leaves
  `game_inappropriate_persistence` = 0 / `blind_retry_count` = 0).
- **Blocked scientific decisions** (user-owned, unchanged — full list §7 of
  the plan and "Unresolved issues" below): hazard_avoidance (blocks Hazard
  beat), idle threshold, abandon/return construct_id, supervised-report and
  alert-acknowledged mappings, Beat-13 scoring bundle, task_started
  dual-listing.
- **Next action**: user enables Playwright → run the Wave 1B verification
  pass per plan §6 (`playwright-game-verify` skill). No further autonomous
  build work exists: Hazard Control stays blocked on the hazard_avoidance
  decision; Beat-13 scoring and ScoringManager/QualtricsBridge remain out of
  scope.

## Wave 1A final status (base `7a76cf4`)

- **Last build commit**: `5f206e5` — Station beat 6: Final Core Room
- **WAVE 1A BUILD PHASE COMPLETE** except Hazard Control (user-blocked, see
  below). 6 of 7 remaining stations implemented; connected world now spans
  Dock → Hub → Archive/Repair/Engineer/Inventory/Side Repair/Interruption/
  Final Core, with cross-room propagation live end-to-end.
- **Completed**:
  1. `dd498f2` — `REMAINING-STATION-INVENTORY.md` (7 stations: sources,
     study_item_ids, construct_ids, semantics, legacy+canonical events,
     scoring restrictions, readiness, risks; cross-station open parameters).
  2. `f1db32f` — `EXPANSION-WAVE-1-PLAN.md` (5-criteria ranking, station
     order Repair → Engineer Hub → Inventory → Side Repair → Interruption →
     Hazard(blocked) → Final Core; shared-architecture units U1–U6).
  3. `ed2a39b` — this state file.
  4. `2fbbd57` — **U1**: `src/world/stationRegistry.ts` (8 stations: room_id,
     label, routeParam, sceneKey?, hubDoor, hubSpawn);
     `isSceneRouteRegistered` in SceneRouter; HubScene door ring + getSpawn
     read the registry; Boot calls `registerBuiltStationRoutes()`. Zero
     behaviour change (archive-only open; sealed semantics byte-identical).
     Files: `src/world/stationRegistry.ts`, `src/world/SceneRouter.ts`,
     `src/world/index.ts`, `src/scenes/HubScene.ts`, `src/scenes/Boot.ts`.
     Build + tsc PASS. ESLint: 353 pre-existing repo-wide CRLF/prettier
     errors only (not introduced by this wave).
  5. `72c6bc9` — **U2**: `src/world/roomTaskState.ts` —
     `createRoomTaskState` (module-scope session-lifetime store, duplicate
     key throws, test-only `resetAllRoomTaskStates` not barrel-exported per
     `resetSessionOnceFlags` precedent) + shared `FailedTaskState` helpers
     (`recordFailedAttempt` didRepeat check, `shouldLogAbandonedOnExit`,
     `shouldLogReturnedOnEnter` — ArchiveScene semantics byte-for-byte).
     ArchiveScene deliberately not migrated. Files:
     `src/world/roomTaskState.ts`, `src/world/index.ts`. Build + tsc PASS.
  6. `cb9eabf` — **U3**: RoomScene prompts generalized — N options (1..9,
     declared order, never randomised), `PromptStage` + `PromptOption.nextStage`
     chained follow-up stages; ≤3-option prompts byte-identical to V1 slice
     (panel 560×230, "Press 1, 2, or 3 to choose."). Files:
     `src/world/RoomScene.ts`, `src/world/index.ts`. Build + tsc PASS.
  7. `a57bab4` — **U4**: ~40 canonical registrations added to
     `CanonicalEventContext.ts` per the population rule. construct_id unset
     (documented) for: `inventory_verification_skipped` (Q02+Q30),
     `side_repair_accepted` (Q07+Q16+Q20), `side_repair_step_completed`
     (Q07+Q16), `interruption_received` (Q15+Q17), `final_core_rushed`
     (Q11+Q33), `final_core_completed` (Q06+Q33), `repair_abandoned` /
     `repair_returned_after_failure` (F1 precedent),
     `issue_resolution_attempted` (valence mismatch vs Q28). Skipped as
     doc-conflict: `task_started`, `objective_completed`. Deferred to room
     beats (live prototype emissions, Phase-0 baseline protection):
     `side_repair_completed`, `final_core_status_reviewed`. Build + tsc
     PASS.
  8. `6afac6b` — **U5 (rescoped)**: registry-driven Hub status board
     (`statusBoardLabel` per open station, collective sealed line;
     byte-identical output today). Original U5 (mission-state vocabulary
     helpers) **deliberately deferred to room beats**: SessionState already
     exposes every V3 §3.1 field + setter, and status vocabularies are
     room-beat decisions per its documented rule — pre-building wrappers
     would invent vocabulary. Build + tsc PASS.
  9. `9bbb5cc` — **U6**: `e2e/helpers.ts` gains `hubToStationDoor` (8
     door-ring routes, wall-clamp choreography; sealed-room routes must be
     tuned in each room's verification pass), exported `waitForRoomEntry`,
     `selectPromptOption`, `findEvent(s)`, `eventContext`. Compile-checked
     only (Playwright disabled this session). tsc + build PASS.

**Shared-architecture phase (U1–U6) complete.**

10. `26379ce` — **Station beat 1: Systems Repair Room.** `RepairScene`
    (`?scene=repair`, Hub door open, registry flip, statusBoardLabel
    'Systems repair'); audit-first port, legacy events verbatim; additive
    canonical events incl. abandon/return via U2 helpers; new
    `repairManualStation` interactable (`repair_manual_opened` +
    `manual_page_reviewed`); `task_started` NOT emitted (doc conflict —
    unresolved issue 8); `objective_completed` connected-world parity via
    `RoomScene.logObjectiveCompletedIfBothDone()` (called from Archive +
    Repair completion; archive-terminal payload context preserved);
    `e2e/repair_room_logging.spec.ts` authored compile-only. Room doc +
    event-schema §4 updated. Build + tsc PASS. **Runtime/browser
    verification owed** (Playwright disabled this session) — room is
    implemented, not yet verified "working".

11. `871105c` — **Station beat 2: Engineer Hub.** `EngineerScene`
    (`?scene=engineer`, Hub door open, statusBoardLabel 'Engineer report').
    Report path audit-first verbatim (incl. one-shot gate text). Duty
    mechanic: chained U3 stage after any report — `engineer_supervision_assigned`
    on offer; accept → `engineer_supervision_accepted` (Q10) +
    `relay_supervision` (constant in `src/data/duties.ts`) into
    accepted_duties + active_objectives; decline →
    `engineer_supervision_declined` + skipped_duties, no penalty framing.
    `engineer_supervision_completed/skipped` + `accepted_duty_unresolved`
    deferred to Final Core beat per contract wording. Additive
    `engineer_hub_entered`. Spec `engineer_hub_logging.spec.ts`
    compile-only. Room doc + event-schema updated. Build + tsc PASS.
    Runtime verification owed (issue 9).

12. `cc10ed9` — **Station beat 3: Inventory / Preparation Room.**
    `InventoryScene` (`?scene=inventory`, statusBoardLabel 'Kit
    preparation'). Legacy 3-option prompt verbatim; contract sub-steps as
    chained stages after the systematic option only (verify vs plausible
    skip → cleanup vs leave); canonical equivalents additive on all paths.
    Documented emission placement: `inventory_checklist_opened` on the
    checklist option, never on prompt open (Q01 contamination guard).
    Per-item events unemitted (need per-item mini-game — user decision).
    SessionState: `field_kit` prepared item (absent on shortcut),
    `workspace_status` tidy/disordered (`src/data/missionVocabulary.ts`).
    Spec compile-only. Build + tsc PASS. Runtime verification owed.

13. `6e09afc` — **Station beat 4: Optional Side Repair Bay.**
    `SideRepairScene` (`?scene=side_repair`, statusBoardLabel 'Stabiliser
    repair'). Legacy 3 options verbatim; additive canonical:
    `side_repair_discovered` (once, first entry), `stabiliser_option_offered`
    (each offer), accept/start decomposition (`stabiliser_accepted` +
    `side_repair_accepted` + `side_repair_first_step`),
    `side_repair_abandoned_after_start`, `final_bonus_unlocked`. **Defer
    branch added** (option 4, `side_repair_deferred`) — does not complete
    the room, offer reopens; defer ≠ abandon (confound control).
    `side_repair_completed` mapping (Q07/Q16/Q32, unset construct) now
    registered — **intentional prototype-payload change; re-baseline the
    Phase-0 fixture field during the verification pass** (issue 9).
    `side_repair_status` vocabulary: ignored/abandoned_after_start/
    deferred/completed. Unemitted, documented: `side_repair_step_completed`
    (needs multi-step mini-game), canonical `side_repair_abandoned` (not
    matrix-listed). Spec compile-only. Build + tsc PASS.

14. `76be9f0` — **Station beat 5: Interruption Corridor.**
    `InterruptionScene` (`?scene=interruption`, statusBoardLabel 'Comms
    interruption'). Legacy options + derived-style events verbatim; NO new
    interpretation-at-log-time events (scoring-plan §9). Canonical
    additions = direct alias renames only (`interruption_received`,
    `switched_task`, `prior_goal_abandoned`, `returned_to_original_task`,
    `task_avoidance` per room-doc mapping) + `interruption_corridor_entered`
    - state-grounded `objective_active` (Q18; once per session, only while
      active_objectives non-empty). Unemitted with per-event docs:
      `competing_task_viewed` (open decision), `new_goal_offered`,
      `goal_switch_accepted`, `return_to_unfinished_task`,
      `prior_goal_completed`, `task_completed_after_interruption` (need real
      objective mechanics), `final_unresolved_due_to_nonreturn` (Final Core),
      `excessive_idle_after_instruction` (idle parameter).
      `interruption_status`: switched_away/returned_to_task/alert_ignored.
      Spec compile-only. Build + tsc PASS.

15. `5f206e5` — **Station beat 6: Final Core Room.** `FinalCoreScene`
    (`?scene=final_core`, statusBoardLabel 'Core synchronization'). Legacy
    3 options verbatim. System flag events once per session at entry from
    real SessionState: `final_core_missing_item_flagged`,
    `final_core_workspace_issue_flagged`, `final_unresolved_due_to_nonreturn`,
    `final_core_stability_bonus`. Q28 blocker: prompt body lists
    outstanding flags (`final_core_blocker_shown`); appended option 4 =
    `final_core_force_continue`; issue-free sessions see exactly the legacy
    prompt. Duty follow-through: resolve path →
    `engineer_supervision_completed` + objective cleared; other completion
    paths with duty active → `accepted_duty_unresolved`.
    `engineer_supervision_skipped` unemitted (no formal skip action —
    documented). Additive: `final_core_entered` (room entry),
    `final_core_rushed`, `final_core_completed`,
    `unresolved_issue_reviewed`/`issue_resolution_attempted`/
    `final_core_issue_resolved` (real-state conditioned).
    `final_core_status_reviewed` Q11 mapping registered (fixture
    re-baseline flagged). Missing, documented:
    `final_quality_score_computed`, `final_summary_previewed`,
    `qualtrics_return_previewed` (ScoringManager/QualtricsBridge gate),
    hazard consequence flags (upstream blocked). Spec compile-only.
    Build + tsc PASS.

- **Exact next action (BLOCKED — requires user input)**: the only
  remaining station is **Hazard Control**, explicitly gated on the
  user-owned `hazard_avoidance` canonical resolution (unresolved issue 3;
  event-schema §4 requires the decision "before this room's implementation
  beat"). No further station or scoring work can proceed autonomously:
  Beat-13 scoring fixes are user-flagged (issue 6), the
  ScoringManager/QualtricsBridge event emissions are gated behind
  qualtrics-logging-review, and the runtime-verification pass (issue 9)
  requires Playwright, disabled this session. **When resuming**: (1) get
  the hazard_avoidance decision → build Hazard Control (last room beat,
  smallest); (2) run the playwright-game-verify pass over all six new
  rooms + prototype fixture re-baseline (side_repair_completed,
  final_core_status_reviewed payload fields); (3) dispatch
  research-data-reviewer + gameplay-implementation-reviewer over the wave;
  (4) schedule the supervised Beat-13 scoring beat.

## Unresolved issues (user-owned; never decided autonomously)

1. Dock idle threshold/definition (gates `baseline_idle_seconds`,
   `tutorial_help_shown` watcher, `excessive_idle_after_instruction`).
2. `construct_id` for abandon/return events (Q24/Q25 family) — ports keep
   unset per committed precedent.
3. ~~`hazard_avoidance` canonical resolution~~ — **RESOLVED by user ruling D1
   (2026-07-12, Option A): canonical `hazard_route_avoided`, study_item_ids
   `[]`, construct unset, telemetry-only; legacy event + `abandonment_count`
   preserved. Hazard Control beat unblocked.**
4. `engineer_report_submitted_supervised` canonical mapping (non-blocking).
5. `interruption_alert_acknowledged` mapping (non-blocking).
6. Beat-13 scoring fixes bundle (out of Wave 1A scope by design).
7. Stimulus-freeze reviewer dispositions (gate participants, not this wave).
8. `task_started` Q-listing conflict: V3 §5 lists it under Q05 **and** Q15;
   `MASTER_33_ALIGNMENT.md` lists it under Q05 only. Event stays unemitted
   and unregistered until resolved (affects Repair, Archive, Interruption).
9. Runtime/browser verification debt: RepairScene (beat 1) and all
   subsequent Wave 1A rooms are implemented + compile-verified only;
   a `playwright-game-verify` pass (incl. prototype-fixture regression and
   route tuning for `hubToStationDoor`) is owed before any "works" claim.

## Commit log (wave)

| SHA       | Unit   | Content                       |
| --------- | ------ | ----------------------------- |
| `dd498f2` | Docs 1 | Remaining-station inventory   |
| `f1db32f` | Docs 2 | Wave 1 plan (ranking + units) |
| `ed2a39b` | Docs 3 | Active expansion state file   |
| `2fbbd57` | U1     | Station registry + routing    |
| `b9b4d49` | Docs   | State checkpoint after U1     |
| `72c6bc9` | U2     | Room task-state factory       |
| `35599ac` | Docs   | State checkpoint after U2     |
| `cb9eabf` | U3     | N-option/multi-stage prompts  |
| `ffc817b` | Docs   | State checkpoint after U3     |
| `a57bab4` | U4     | Canonical event registrations |
| `20d6bff` | Docs   | State checkpoint after U4     |
| `6afac6b` | U5     | Registry-driven status board  |
| `cc8d597` | Docs   | State checkpoint after U5     |
| `9bbb5cc` | U6     | e2e station-driving fixtures  |
| `0a61fe2` | Docs   | State checkpoint after U6     |
| `26379ce` | Room 2 | Systems Repair Room beat      |
| `cf48ff6` | Docs   | State checkpoint after beat 1 |
| `871105c` | Room 3 | Engineer Hub beat             |
| `078589e` | Docs   | State checkpoint after beat 2 |
| `cc10ed9` | Room 4 | Inventory/Prep beat           |
| `5b5050c` | Docs   | State checkpoint after beat 3 |
| `6e09afc` | Room 5 | Side Repair Bay beat          |
| `1dc94e2` | Docs   | State checkpoint after beat 4 |
| `76be9f0` | Room 6 | Interruption Corridor beat    |
| `12947d1` | Docs   | State checkpoint after beat 5 |
| `5f206e5` | Room 7 | Final Core Room beat          |
