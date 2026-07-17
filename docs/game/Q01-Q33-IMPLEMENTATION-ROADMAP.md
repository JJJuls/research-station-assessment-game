# Q01-Q33 Implementation Roadmap (Stages 0-5)

Documentation only; base `bfca741`. Discipline for every stage: one
room/task/transition per pass (`room-builder`), explicit approval before
the next beat, `psychometric-task-design` gate before any
construct-to-mechanic decision, `qualtrics-logging-review` for any
research-system touch, build + `lint:tsc` + relevant Playwright specs
before any done claim, then `research-data-reviewer` →
`gameplay-implementation-reviewer` → `browser-qa-reviewer`. No unit is
schedulable while a decision it depends on is open. Merge strategy for all
stages: short-lived worktree branches off the current integration branch,
one reviewed unit per branch, fast-forward-style merges by the operator —
never agent-initiated pushes; no history rewriting; the research owner's
integration branch remains `fable-autonomous-game-build-v1` until they
rule otherwise. Parallelisation: at most one gameplay-source unit at a
time (shared scenes/SessionState); docs/test-only units may run in
parallel worktrees with `PW_DEV_PORT` isolation; never run two long
Playwright suites concurrently on one machine.

## Stage 0 — current pilot repair (essentially complete at `bfca741`)

Scope realised: four-scenario route completion enforcement, duty-roster
HUD, Final Core route gate (`final_core_blocked_pending_decisions`),
regression-safe integration (71/73 + fixed-flake evidence).

Residual Stage-0 tasks:

| Task                                                                         | Files           | Tests                                       | Effort    | Exit criteria                                                             |
| ---------------------------------------------------------------------------- | --------------- | ------------------------------------------- | --------- | ------------------------------------------------------------------------- |
| 0.1 Full-suite double confirmation on a quiet machine                        | none (run only) | whole suite ×2                              | ~2 h wall | 76/76 twice (list-enumerated count at `bfca741`), flake genres documented |
| 0.2 Live synthetic Supabase test (`.env.local`, launch_mode=test)            | none            | `research_export_test_mode` against staging | short     | one synthetic session row verified end-to-end                             |
| 0.3 Scenario-layer placement ruling request to research owner (blueprint §6) | docs/decisions  | n/a                                         | short     | ruling logged                                                             |

Dependencies: none. Research review: not needed for 0.1/0.2; 0.3 is a
ruling request. Exit: pilot layer stable + placement question with owner.

## Stage 1 — canonical assessment coverage (unblocked measurement substrate)

Goal: close the PARTIAL cluster using ONLY approved event names; complete
logging per module; placeholders visuals stay.

| Unit                                             | Scope (one pass each)                                                                                                                                                                                | Q items                               | Files (likely)                                                             | Tests                                     | Effort | Gate                                                                                                        |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| 1.1 = FABLE-NEXT-01                              | Coverage-gap verification + low-risk emission/test-debt closure                                                                                                                                      | cross                                 | e2e specs; scenes (logging calls only)                                     | new assertions for 17 unreferenced events | S      | none                                                                                                        |
| 1.2 = FABLE-NEXT-02                              | Inventory per-item sort/place/correct/verify mini-game                                                                                                                                               | Q01-Q03 (+Q02 correction)             | `InventoryScene.ts`, `itemRegistry.ts` (new), `SessionState.ts` (additive) | extend `inventory_prep_logging`           | M      | psychometric-task-design interface gate; approved events only                                               |
| 1.3 = FABLE-NEXT-05 (part A)                     | Interruption Corridor real competing objective + observed return                                                                                                                                     | Q15, Q17, Q19                         | `InterruptionScene.ts`, `SessionState.ts`                                  | rebuild corridor spec                     | M      | D6/D3 adjacents stay unemitted                                                                              |
| 1.4 = FABLE-NEXT-04                              | Engineer report-accuracy evaluation + emission (**unmapped**: `engineer_report_accuracy_scored` has no CEC registration by design; a Q09 mapping is an event-schema decision to request, not assume) | Q09 substrate (mapping pending owner) | `EngineerScene.ts`                                                         | extend engineer spec                      | S-M    | accuracy formula stays raw/descriptive; scoring wiring = D2                                                 |
| 1.5 = FABLE-NEXT-03                              | Side Repair multi-step arc (`side_repair_step_completed`) + Repair multi-cycle hardening                                                                                                             | Q07, Q16 (Q14/Q21 enrich)             | `SideRepairScene.ts`, `RepairScene.ts`                                     | extend side-repair/repair specs           | M      | step granularity via psychometric-task-design; no new event names for Systems Repair steps without decision |
| 1.6 Decision-gated modules (NOT schedulable yet) | HOR (SA-3), GRA (SA-4), utility-stop (SA-2/SA-1), Q05 latency (D7), idle family (D3), hazard consequence (UD)                                                                                        | Q27, Q29-Q31, Q05, Q08                | per ruling                                                                 | per ruling                                | M each | **each waits for its ruling**                                                                               |

Dependencies: 1.2 before the prepared-tool consequence (Stage 2); 1.3
needs a pending objective source (exists: relay duty). Research review:
research-data-reviewer after each unit. Browser review:
browser-qa-reviewer per unit. Exit criteria: Q-item PARTIAL count drops
from 11 to ≤4 (Q06 process side, Q08 pattern side, Q25 deferment, plus
whatever awaits rulings); every emitted event spec-asserted.

## Stage 2 — connected playable foundation

Goal: the justified item/NPC/interaction systems (foundation spec S2-S5,
S7, S10) integrated without new science.

| Unit / scope                                     | Files                                                | Tests                  | Effort | Gate                                                    |
| ------------------------------------------------ | ---------------------------------------------------- | ---------------------- | ------ | ------------------------------------------------------- |
| 2.1 Item registry + carried-items HUD (S3/S4)    | `itemRegistry.ts`, `RoomScene.ts`, `SessionState.ts` | HUD + transition specs | S-M    | additive state only                                     |
| 2.2 Prepared-tool consequence episode (S5)       | `RepairScene.ts` or `FinalCoreScene.ts`              | two-path spec          | S      | uses approved events (`prepared_tool_used`, flags)      |
| 2.3 Dialogue presentation unification (S7)       | `RoomScene.ts`                                       | text probes            | S      | wording review on all NPC text                          |
| 2.4 Feedback/consequence style unification (S10) | scenes                                               | existing specs         | S      | neutral-tone review                                     |
| 2.5 Q03 retrieval episode                        | `RepairScene.ts`/`FinalCoreScene.ts`                 | retrieval spec         | S-M    | approved events only (`correct_tool_selected` family)   |
| 2.6 Optional mouse parity (S15)                  | `RoomScene.ts`                                       | parity spec            | S      | OPTIONAL_POST_PILOT — only if time allows, else Stage 5 |

Exit: connected-game feel review (gameplay-implementation-reviewer) —
every admitted MPF system present, no EXCLUDED feature crept in, no new
unmapped event names.

## Stage 3 — research validation (pilot-critical; ruling-driven)

Goal: the data pipeline and scoring separation that make a pilot's data
usable. Almost every unit is decision-gated — the day-1 action is
shipping the ruling requests (packs already exist).

| Unit / scope                                                                                                                                                                                                                                                                       | Gate                                      | Files                                                                                               | Tests                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 3.1 Completion → Qualtrics return + end screen                                                                                                                                                                                                                                     | **INT-1 (+INT-3/INT-4)**                  | `QualtricsBridge`, `FinalCoreScene`, `ResearchRuntime`                                              | new production-path specs (ADV-9/10/11 family) |
| 3.2 Raw-event export channel (production)                                                                                                                                                                                                                                          | **INT-2 (+INT-6)**                        | `ResearchExportClient`, edge function                                                               | export specs                                   |
| 3.3 Status taxonomy + `launch_mode` + incomplete-session handling                                                                                                                                                                                                                  | **INT-5** (+spec §8.2 approvals)          | `SessionState`, export payloads                                                                     | taxonomy specs                                 |
| 3.4 Durable persistence/recovery + sequence numbers                                                                                                                                                                                                                                | **P0-3 / INT-2 / schema decision (P1-9)** | new persistence module                                                                              | reload-recovery specs                          |
| 3.5 D2 scoring bundle: force-continue 4th term; prudence split; quality shape; exploratory-label mechanism (SA-7 text)                                                                                                                                                             | **D2 + SA-7**                             | `ScoringManager`, scoring-plan.md refresh (S-11)                                                    | scoring specs                                  |
| 3.6 SA-1..SA-6 registration edits + module builds as ruled                                                                                                                                                                                                                         | **SA-1..SA-6**                            | `CanonicalEventContext`, affected scenes/specs                                                      | coordinated spec updates same pass             |
| 3.7 Opportunity-flag completeness + no-opportunity coding                                                                                                                                                                                                                          | spec §8.2 ruling                          | scenes                                                                                              | flag specs                                     |
| 3.8 Route direction + scenario-gate arm configuration: extend the `pilotRoute.ts`-pattern route table to direct the duty-roster HUD along the canonical eight-room order (per-arm configurable, labels only — no science, no gating changes beyond the ruled scenario gate on/off) | owner placement ruling (Stage 0.3)        | `pilotRoute.ts` (or a parallel canonical route table), `RoomScene.ts` HUD line, `FinalCoreScene.ts` | route specs per arm                            |
| 3.9 Pilot calibration run: timings, latency distributions, option balance                                                                                                                                                                                                          | after 3.1-3.3                             | none (analysis)                                                                                     | supervised runs                                |

Research review: qualtrics-logging-review skill + research-data-reviewer
on every unit; privacy gate re-check for 3.1/3.2/3.4. Exit: participant-
ready technical pipeline (launch → play → complete → return → export),
scoring separation ruled and implemented, calibration data collected.

## Stage 4 — visual/audio production (gated)

Only after mechanics + logging pass for the rooms concerned. PixelLab
requires explicit standalone human approval per asset pass
(`pixellab-asset-pipeline`); stimulus-freeze discipline (D8 dispositions)
applies; `asset_set_version` per INT-6.

Order (from the visual pack backlog, one room/pass at a time): style
anchor → player sprite → station tiles → room-by-room assets (asset
manifest updated per pass) → NPC sprites/portraits (Kai, Quartermaster,
Utility Bot) → UI skin → audio cues (neutral, non-evaluative). Tests:
visual smoke + viewport specs; no mechanic changes ride asset passes.
Exit: frozen asset set recorded in the manifest with versioning.

## Stage 5 — optional post-pilot expansion (non-contaminating)

Only research-owner-approved, non-scored content; the assessment stays
frozen during data collection — expansion lands only between waves or
after the study.

Candidates (all EU/OPP; each needs explicit approval): anomaly-arc staged
investigation (if Q20 candidates ruled), duty salvage part (Q10
enrichment), lore datapads (unscored), mouse support if not landed,
exterior areas (identity-compatible, non-open-world), additional ethical
scenarios. Hard rules: no new Q mappings without rulings; no EXCLUDED
feature enters; frozen event schema/scoring untouched mid-collection.

## Critical-path note

The scientific critical path is rulings, not code: INT-1/2/5 (+D2, SA-7)
unlock Stage 3; SA-1..SA-6 unlock the five STALE items and three missing
modules. All Stage 1 units are executable today without any ruling, and
they are the fastest way to raise Q-coverage quality while rulings are
pending.
