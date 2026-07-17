# Q01-Q33 Current-State Gap Audit (blueprint pass)

Status: documentation only. Branch `fable-q01-q33-playable-blueprint-v1`,
worktree `.claude/worktrees/q01-q33-playable-blueprint`, base `bfca741`.
Date: 2026-07-17.

This audit updates and builds on
`docs/research/audits/CURRENT-Q01-Q33-IMPLEMENTATION-GAP-AUDIT.md`
(2026-07-16, at `88a1635`) — which remains the detailed line-level record —
by folding in the three commits since (`ef98d74` deploy artifact, `326da2e`
technical-error capture, `d6cdf70` Supabase test export) plus the gameplay
integration commits (`72d168a`, `7f967c8`, `bfca741`: four-scenario pilot
layer, duty-roster HUD, Final Core route gate). No source, test, schema,
scoring or decision content is changed by this pass.

Classification vocabulary (per blueprint task): WORKING / PARTIAL /
PLACEHOLDER / STALE / MISSING / BLOCKED-BY-DECISION.

## 1. Canonical sources located

| Source                                                                       | Location                                                                                                                                                                               | Status                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Q01-Q33_GAMIFIED_MEASUREMENT_SPECIFICATION.md`                              | `docs/scientific/` (canonical working copy); duplicate in `C:\Users\Juls\Downloads`                                                                                                    | FOUND — tier-2 behavioural-translation authority                                                                                                                                                         |
| `Remote_Outpost_Q01-Q33_Gamified_Measurement_Translation_Specification.docx` | `docs/scientific/` (`Q01-Q33_GAMIFIED_MEASUREMENT_SPECIFICATION.docx`) and `C:\Users\Juls\Downloads`                                                                                   | FOUND — human-review companion                                                                                                                                                                           |
| `remote_outpost_MASTER_33_alignment_LOCKED_v0_2.xlsx`                        | `C:\Users\Juls\Downloads` (sheets: MASTER_33_ALIGNMENT, CHANGE_LOG, ROOM_COVERAGE, README, SOURCE_NOTES)                                                                               | FOUND — mirrored in-repo by `docs/research/MASTER_33_ALIGNMENT.md`; Q27/Q29-Q33 mechanic rationales superseded **as rationale** by the tier-2 spec (authority doc §8)                                    |
| `remote_outpost_exact_33_item_list_ALIGNED_to_blueprint.xlsx`                | `C:\Users\Juls\Downloads` (sheets: Aligned_Exact_33, Alignment_Audit, Scoring_Notes, Sources)                                                                                          | FOUND — tier-1-adjacent crosswalk; exact wording also quoted per item inside the tier-2 spec                                                                                                             |
| `Original_question_items` (final exact battery)                              | **NOT located in repo or Desktop/Downloads scan**                                                                                                                                      | MISSING locally — tier-1 authority; per-item exact wording is available via the tier-2 spec's crosswalk quotes, which this blueprint treats as tier-1-derived. No wording decision is made in this pass. |
| V3 build contract                                                            | `docs/ai/fable-claude-final-game-build-contract-v3.txt`                                                                                                                                | FOUND                                                                                                                                                                                                    |
| Event schema / scoring plan                                                  | `docs/research/event-schema.md`, `docs/research/scoring-plan.md`                                                                                                                       | FOUND — only sources of approved event names / formulas                                                                                                                                                  |
| Authority + open decisions                                                   | `docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md`                                                                                                                                   | FOUND — SA-1..SA-7, D2-D8, INT-1..INT-6 all OPEN                                                                                                                                                         |
| Room docs                                                                    | `docs/game/rooms/00..08`                                                                                                                                                               | FOUND — partially stale vs Wave 1A/pilot commits (noted below)                                                                                                                                           |
| Route/gameplay/visual/audit reports                                          | `docs/game/PILOT-FOUR-SCENARIO-ROUTE.md`, `docs/game/PILOT-GAMEPLAY-VERTICAL-SLICE.md`, `docs/research/audits/CURRENT-Q01-Q33-IMPLEMENTATION-GAP-AUDIT.md`, gate docs under `docs/ai/` | FOUND                                                                                                                                                                                                    |
| Visual-design branch                                                         | `fable-visual-npc-minigame-design-v1` at `e0684e9` (worktree `visual-npc-minigame-design`, unpushed)                                                                                   | FOUND — docs-only asset inventory + M1-M5 backlog                                                                                                                                                        |

## 2. Implemented rooms (area status)

Unchanged from the 2026-07-16 audit §10 except where noted:

| Area                                              | Status  | One-line evidence                                                                                                               |
| ------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Dock / Arrival (`dock_arrival`)                   | WORKING | Full tutorial/control flow; idle family BLOCKED-BY-DECISION (D3)                                                                |
| Station Hub (`station_hub`)                       | WORKING | Control-only connector; status board byte-pinned; duty-roster HUD added (`bfca741`)                                             |
| Archive (`archive_room`)                          | WORKING | Failure→feedback→revision→completion; abandon/return pair; hosts Scenario C desk (isolated, tested)                             |
| Systems Repair (`systems_repair_room`)            | WORKING | Failure→manual→revision; `task_started` BLOCKED (D7); single-cycle simplification                                               |
| Engineer Hub (`engineer_hub`)                     | WORKING | Report console + relay duty accept/decline + Final Core follow-through; no report-accuracy mechanism; hosts Scenario A bench    |
| Inventory / Prep (`inventory_prep_room`)          | PARTIAL | Choice-prompt only; **no per-item sorting/placement mini-game** (Q01-Q03 substrate missing); hosts Scenario D seal log          |
| Hazard Control (`hazard_control_room`)            | WORKING | Prudence decision path complete; consequence events MISSING (UD-HAZARD-CONSEQUENCE); Q27/Q31 tags STALE (SA-1/SA-3)             |
| Optional Side Repair (`optional_side_repair_bay`) | PARTIAL | 4-option prompt incl. defer; **no multi-step mechanic** (`side_repair_step_completed` missing); Q29/Q32 tags gated SA-3/SA-5    |
| Interruption Corridor (`interruption_corridor`)   | PARTIAL | One-shot prompt; switch/return are **dialogue assertions, not observed acts**; no competing-objective mechanic                  |
| Final Core (`final_core_room`)                    | WORKING | Real cross-room flags, blocker/force branch (Q28), duty resolution, four-scenario route gate (`bfca741`); Q33 tags STALE (SA-6) |

## 3. Implemented canonical tasks vs missing canonical modules

Present: Dock tutorial; Archive failure-and-revision module; Repair difficulty
module (single cycle); Engineer report-back + accepted-duty follow-through;
Inventory checklist/verify/cleanup choice stages; Hazard warning-inspection
decision; Side-repair accept/defer/abandon/complete offer; Interruption
one-shot switch prompt; Final Core integration with blocker/force.

MISSING canonical measurement modules (all named by the tier-2 spec; every
one is decision-gated or task-design-gated as shown):

| Missing module                                                     | Items                 | Gate                                                                                                                                                                                                   |
| ------------------------------------------------------------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Per-item sort/placement + correction + later retrieval (Inventory) | Q01-Q03               | UNBLOCKED (events already canonical: `inventory_item_sorted_correct`, `inventory_item_misplaced`, `wrong_tool_selected`, `prepared_tool_used`); needs `psychometric-task-design` + `room-builder` pass |
| Real return-route / competing-objective mechanic (Interruption)    | Q15, Q17, Q19         | UNBLOCKED core (canonical events `return_to_unfinished_task`, `task_completed_after_interruption`, `new_goal_offered`, `prior_goal_completed` schema-listed); D6 adjacents stay unemitted              |
| Multi-step side-repair / staged anomaly arc                        | Q07, Q16 (Q20 weak)   | `side_repair_step_completed` schema-listed (step granularity = task-design); richer anomaly arc events are CANDIDATES only                                                                             |
| Q27 utility-stop continuation module                               | Q27                   | BLOCKED — SA-2 (+SA-1 for displaced Hazard tags)                                                                                                                                                       |
| Shared goal-horizon choice module                                  | Q29+Q31 (Q32 derived) | BLOCKED — SA-3                                                                                                                                                                                         |
| Goal-granularity choice module (×2 opportunities)                  | Q30 (Q33 portfolio)   | BLOCKED — SA-4 (Q33 portfolio additionally SA-6, behind SA-3/SA-4)                                                                                                                                     |
| Report-accuracy evaluation (Engineer)                              | Q09 outcome side      | `engineer_report_accuracy_scored` canonical-listed missing; `report_accuracy_score` variable is a canonical scoring target (missing) — scoring wiring lands with D2-family work                        |
| Task-initiation latency capture                                    | Q05                   | BLOCKED — D7 (+ no latency plumbing)                                                                                                                                                                   |
| Hazard consequence propagation                                     | Q12 outcome side      | BLOCKED — UD-HAZARD-CONSEQUENCE                                                                                                                                                                        |
| Idle/baseline family                                               | controls, Q08         | BLOCKED — D3                                                                                                                                                                                           |

## 4. Ethical scenarios (separate exploratory layer)

Implemented at `72d168a..bfca741`: configuration-driven `ScenarioController`
(`src/scenarios/`), four scenarios — `priority_allocation` (Hub),
`calibration_anomaly` (Engineer Hub), `incident_reconciliation` (Archive),
`protocol_breach` (Inventory) — with briefing/evidence/selection/revision/
commit/consequence/interruption/abandonment telemetry, duty-roster HUD, and a
Final Core gate on explicit completion of all four. Status: WORKING as a
**pilot-development telemetry layer**. Every `scenario_*` event plus
`final_core_blocked_pending_decisions` is unmapped (no `study_item_ids`, no
`construct_id`), absent from ScoringManager, and never Q-mapped — governance
confirmed in `docs/game/PILOT-FOUR-SCENARIO-ROUTE.md`. Promotion/mapping is a
research-owner decision. See blueprint §6 for separation analysis.

## 5. Current route

Development pilot route (enforced completion, order by convention):
launch → Dock check-in → Hub (Scenario B) → Engineer Hub (Scenario A + Kai
report) → Archive (Scenario C) → Inventory (Scenario D) → Final Core
(route-gated) → debug completion/return. ~188 s automated; ~8-12 min human
estimate. **The canonical Q01-Q33 assessment route (all eight rooms) is not
currently the enforced route** — Repair, Hazard, Side Repair, Interruption
are reachable but not directed by the duty-roster HUD. This is the central
route-design gap for the pilot (see roadmap Stage 1/3 and blueprint §2/§7).

## 6. Inventory/item systems, world interactables, NPCs

- Item systems: none beyond `SessionState.prepared_items` (a `string[]`
  whose only current value is `field_kit`) and `workspace_status`. No item
  registry, no inventory UI,
  no pickup/drop, no equipment. Status: MISSING (justified subset specified
  in `PLAYABLE-FOUNDATION-SYSTEMS-SPEC.md`).
- World interactables: proximity stations per room (RoomScene, 72 px radius,
  SPACE prompt, deterministic 1-N options, chained stages). WORKING.
- NPCs (all placeholder-rendered stations/labels, no sprites/portraits):
  Station AI (Dock), Archive AI, Engineer Kai, Quartermaster console,
  Hazard terminal, Utility Bot, Comms Beacon, Core Interface. WORKING as
  functional stations; PLACEHOLDER as characters (visual pack backlog).
- Task persistence: `SessionState` mission state (V3 §3.1 fields) +
  scenario-module session-lifetime state + duty-roster HUD. In-session only;
  **no durable persistence** (reload loses everything) — BLOCKED (P0-3/INT-2).

## 7. Event logging, scoring, Qualtrics, Supabase, tests

- Event logging: append-only `EventLogger`, context-authoritative
  `ResearchRuntime`, frozen `CanonicalEventContext` registrations. WORKING.
  No sequence numbers / event IDs / schema-version fields (P1-9, schema
  decision). Technical-error covariate now wired (`326da2e`).
- Scoring: 59-field `GameSummaryVariables`; no global score; adaptive vs
  inappropriate persistence separate. D2 sub-items open (`strategy_revision_count`
  prudence mixing S-9; `final_core_force_continue` 4th term; quality-score
  shape; exploratory-label mechanism SA-7).
- Qualtrics: launch parsing verified; `buildReturnUrl()` has **no production
  caller** — completion→return pipeline BLOCKED (INT-1/INT-4/INT-3).
- Supabase: test-only export path (`ResearchExportClient`, edge function,
  `launch_mode=test` gating) at `d6cdf70`; participant-mode transport
  verified zero. WORKING (test mode only); production export BLOCKED (INT-2/INT-5).
- Tests: **76 tests / 31 spec files** at `bfca741` (Playwright
  list-enumeration; 55/23 at audit baseline + scenario/export/
  error-capture/route-gate specs — `bfca741` itself added
  `scenario_route_gate.spec.ts`). Last full-suite record (historical,
  pre-route-gate 73-test suite): 71 passed / 1 flaky / 1 failed with the
  failure fixed test-side and re-run green (commit message `bfca741`).
  Not re-run in this pass.

## 8. Placeholders and features that do not trace cleanly

- Placeholder visuals everywhere by design (placeholder-first discipline);
  PixelLab gated on explicit approval.
- Legacy derived-style raw events still emitted (`interruption_focus_lost`,
  `engineer_responsibility_adaptive`, `side_repair_low_effort`, …) — S-10
  raw-vs-derived smell, resolved per room rebuild.
- Legacy prototype scene `src/scenes/Main.tsx` (`?scene=prototype`) —
  historical evidence, off the participant path.
- `scenario_*` layer: traces to the pilot ethical-behaviour experiment, not
  to Q01-Q33 — correctly labelled, stays separate (blueprint §6).
- No implemented feature was found that is untraceable AND unlabelled; the
  five STALE registrations (Q27/Q29/Q30/Q31/Q33) are the known scientific
  misalignments, all SA-gated.

## 9. Q-item status roll-up (at `bfca741`)

Identical to the 2026-07-16 audit §12 — nothing since has touched Q-item
substrates or registrations:

| Status  | Count | Items                                                       |
| ------- | ----- | ----------------------------------------------------------- |
| ALIGNED | 15    | Q04 Q09 Q10 Q11 Q12 Q13 Q14 Q18 Q20 Q21 Q22 Q23 Q24 Q26 Q28 |
| PARTIAL | 11    | Q01 Q02 Q03 Q06 Q07 Q08 Q15 Q16 Q17 Q19 Q25                 |
| STALE   | 5     | Q27 Q29 Q30 Q31 Q33                                         |
| BLOCKED | 2     | Q05 Q32                                                     |

Per-item detail: `docs/game/Q01-Q33-REQUIREMENTS-TRACEABILITY-MATRIX.md`
(this pass) and the 2026-07-16 audit §11/§13.

## 10. Room-doc staleness note

`docs/game/rooms/03`, `06`, `08` still carry "missing from current
implementation" notes (duty mechanic, defer branch, blocker/force branch)
that Wave 1A/Hazard-beat commits have since implemented — the 2026-07-16
audit and this blueprint supersede those notes as current-state statements.
The room docs remain correct as canonical contracts references. Updating
them is routine doc maintenance for the next respective room pass.
