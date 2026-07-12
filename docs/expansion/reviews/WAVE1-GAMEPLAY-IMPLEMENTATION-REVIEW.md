<!--
Review gate: Wave 1 (556e273..89e9597)
Reviewer: gameplay-implementation-reviewer (project agent definition, model: sonnet, read-only + verification shell)
Coordinator: Fable main agent (synthesis only)
Date: 2026-07-12
Repo state reviewed: HEAD e5adf6f (file-identical to 89e9597 for all game/docs/test paths)
Preserved verbatim from the reviewer's final report; no findings edited.
-->

# Wave 1 Gameplay/Implementation Review — Remote Outpost Assessment

**Review range:** `556e273..89e9597` (Wave 1 shared architecture U1–U6 + six station rooms + Wave 1B runtime verification). HEAD (`e5adf6f`) differs only in `.claude/agents/` and `docs/ai/COST-CONTROLLED-AGENT-ROUTING.md`, outside this range — ignored per instructions.

## 1. Scope

Files reviewed: `src/world/{stationRegistry,roomTaskState,RoomScene,SceneRouter,CanonicalEventContext,StationMapBuilder,index}.ts`; `src/scenes/{Boot,HubScene,RepairScene,EngineerScene,InventoryScene,SideRepairScene,InterruptionScene,FinalCoreScene,index}.ts`; `src/scenes/ArchiveScene.ts` (4-line diff); `src/systems/ResearchRuntime.ts` (`getMissionState` addition); `src/systems/SessionState.ts` (read for defensive-copy verification); `src/data/{duties,missionVocabulary,researchInteractions}.ts`; `src/constants/key.ts`; all six new `e2e/*_logging.spec.ts` + `final_core_summary.spec.ts` + `e2e/helpers.ts` + `e2e/launch_with_research_params.spec.ts` diff; `docs/testing/wave1b-verification/WAVE1B-EVIDENCE.md`; full commit list `26379ce`…`89e9597`.

## 2. World-flow check

Connected-world flow is correctly wired end to end: Dock → Hub → each of the six rooms → back to Hub. `STATION_REGISTRY` (`src/world/stationRegistry.ts`) is the single source of truth driving the Hub door ring (`HubScene.populateRoom`, `src/scenes/HubScene.ts:64-87`), the `?scene=` route table (`registerBuiltStationRoutes`, called once from `Boot.ts:80`), and each room's `hubSpawn` re-entry position. `SceneRouter.transitionToRoom` (`src/world/SceneRouter.ts:69-83`) force-restarts the fade so a room's own fade-in never soft-locks a transition — this is a real, previously-encountered class of bug and the fix is generic (not room-specific).

Every one of the six rooms' `addDoor` back to the Hub sets `roomId: 'station_hub'` and `spawn: '<own room_id>'`, which `HubScene.getSpawn` (`HubScene.ts:48-57`) resolves via `getStationByRoomId` to place the player just outside the 72px interaction radius (documented rationale in `stationRegistry.ts:36-39` — prevents an immediate SPACE bounce-back). No orphaned or stuck transitions found.

## 3. Scene-structure check

All six new scenes extend `RoomScene` and follow its enter→objective→interact→(mini-decision)→task-state→log→mission-state→exit pattern uniformly: `getLayout`/`getSpawn`/`populateRoom`/`getPromptOptions` abstract methods, `onRoomEntered`/`onRoomExit` hooks. No ad hoc scene patterns found.

`RoomScene`'s U3 generalization to N-option prompts with `nextStage` chaining (`RoomScene.ts:398-524`) is sound: one stable handler array per numeric key (`promptKeyHandlers`), correct on/off pairing in `closePrompt`, deterministic un-randomized option order, and the toast-vs-chain suppression rule (`feedback` shown only when `nextStage` is null) is applied consistently everywhere it's used (Engineer's duty-offer stage, Inventory's verification/cleanup stages).

**Minor — duplicated one-shot "already submitted" pattern.** Five of the six rooms (`EngineerScene`, `InventoryScene`, `SideRepairScene`, `InterruptionScene`, `FinalCoreScene`) each hand-roll an identical `markXCompleted()`/`isXCompleted()` pair (`sessionState.markRoomCompleted(roomId)` / `completed_rooms.includes(roomId)`) instead of a shared helper. `roomTaskState.ts` already factors the analogous `FailedTaskState` pattern for Repair; this simpler completion-gate pattern was not similarly factored. Not a correctness issue (every copy is byte-consistent), but it's the kind of copy-paste divergence risk checklist item 9 asks about — a future edit to one room's gate semantics could silently diverge from the other four.

**Observation — mutable-config coupling in FinalCoreScene.** `FinalCoreScene.populateRoom` stores the station config object in both `this.coreStationConfig` and (via `addStation`) in `RoomScene`'s private `this.stations` array, then mutates `coreStationConfig.promptBody` inside `onPromptOpened` (`FinalCoreScene.ts:99-136`) before `RoomScene.openStationPrompt` reads `station.promptBody` immediately after (`RoomScene.ts:398-407`). This only works because `addStation` stores the object by reference rather than copying it — an implicit contract that isn't documented in `RoomStationConfig`. It functions correctly (verified against `RoomScene.ts:271-290` push-by-reference), but it's a fragile, undocumented coupling between a scene and the base class's internal storage. Worth a comment on `RoomStationConfig.promptBody` or `addStation` if another room later needs the same live-body pattern.

## 4. Task-state check

`createRoomTaskState`/`FailedTaskState` (`roomTaskState.ts`) is a correct, minimal generalization of the Archive precedent: module-scope `Map`s keyed by canonical `room_id`, duplicate-key registration throws, `resetAllRoomTaskStates`/`resetSessionOnceFlags` deliberately not re-exported through the `world` barrel (confirmed against `src/world/index.ts:1-39` — neither symbol appears). `recordFailedAttempt`/`shouldLogAbandonedOnExit`/`shouldLogReturnedOnEnter` correctly implement the one-shot leave/return semantics (`leftAfterFailure` flag clears on detection, matching the Archive/Repair doc'd edge cases).

Branch correctness spot-checked against each room's doc and confirmed no contradictory state:

- **Repair**: fail→manual→revise is the only path to `repair_completed`; blind repeat correctly substitutes `repair_same_sequence_repeated` for `repair_failed` rather than duplicating it (verified live via `repair_room_logging.spec.ts:104-139`).
- **Engineer**: duty accept/decline correctly mutate mutually-exclusive `accepted_duties`/`skipped_duties`/`active_objectives` via `SessionState.addAcceptedDuty`/`addSkippedDuty`, which each remove from the other's list (`SessionState.ts:97-105`) — no state where a duty is both accepted and skipped.
- **Side Repair**: the 4th "defer" option is correctly excluded from `markDecisionLogged()` (`SideRepairScene.ts:196-208`), so the offer stays reopenable — verified against the `side_repair_logging.spec.ts` defer-then-complete test, which shows `stabiliser_option_offered` firing twice and `side_repair_deferred` exactly once.
- **Final Core**: `isRelayDutyActive()` requires membership in _both_ `accepted_duties` and `active_objectives` (`FinalCoreScene.ts:314-321`), so a completed or declined duty never spuriously counts as outstanding.

No task ever ends up simultaneously "completed" and "unresolved" in any path traced.

## 5. Preservation check

No existing prototype logic, EventLogger/SessionState/ScoringManager/ResearchRuntime calls were removed, bypassed, or stubbed. `ArchiveScene`'s 4-line diff only wires the newly-extracted `logObjectiveCompletedIfBothDone()` shared helper into its existing completion path — this is a refactor-and-reuse, not a removal (the byte-for-byte legacy payload behavior is preserved and asserted in `repair_room_logging.spec.ts`'s new parity test). `HubScene` was rewritten from static per-room code to registry-driven, but the evidence doc and code comments assert byte-identical output while Archive is the only prior open room, and I found no behavior divergence in the registry-driven version. `CANONICAL_EVENT_CONTEXT.ts` additions are strictly additive (frozen at module load via `Object.freeze`, `CanonicalEventContext.ts:501-508`) — confirmed via `git diff` that no existing entries were altered.

## 6. Scope-creep check

No forbidden RPG mechanics (money, shops, XP, levels, combat, stat/power upgrades) found anywhere in the six rooms. `final_core_status` is explicitly documented and implemented as a completion-_path_ label (`FINAL_CORE_STATUS_{LOW_QUALITY,STRUCTURED,HIGH_QUALITY,FORCED}`), never a numeric quality score — consistent with the "never a global good-player score" constraint. The Side Repair stability bonus and Inventory kit propagation are visible-but-non-power effects (status flags feeding Final Core's issue list), not gameplay power upgrades. This pass touches exactly the shared architecture plus six rooms as scoped by the approved Wave 1A plan — no unrelated files touched beyond the documented 4-line Archive wiring and the Boot/index barrel registrations needed to bring the new scenes online.

## 7. Build/TypeScript results

- `npm.cmd run build`: **PASS** — only the pre-existing >500kB chunk-size warning, matching the evidence doc's claim.
- `npm.cmd run lint:tsc`: **PASS**, zero errors.
- `npm.cmd run lint`: **352 pre-existing errors**, all `prettier/prettier: Delete ␍` (CRLF line-ending) violations. I enumerated every offending file — all are pre-existing foundation files untouched by this wave (`src/assets/**/index.ts`, `src/components/*.tsx`, `src/constants/{depth,env,tilemap}.ts`, `src/utils/*`, `vite.config.mts`, `eslint.config.mts`, `src/sprites/index.ts`, `src/state/index.ts`, `src/types/vite-env.d.ts`). None of the Wave 1 files (`src/world/*`, the six new scenes, `e2e/*`) appear in the lint failure list. **Observation, out of scope for this wave** — a pre-existing Windows line-ending/prettier-config mismatch, not introduced by this diff.

No unsafe `any`-erasure or unhandled-null risk found on cross-room state: every `getMissionState()` consumer reads through `.includes()`/equality on always-initialized `string[]`/`string` fields (`SessionState.createDefaultMissionState`, `SessionState.ts:132-151`), so Final Core's reads cannot crash on partial state even in a fresh session (verified by the `final_core_summary.spec.ts` "fresh session" test, which enters Final Core with no prior room visited).

## 8. Issues found

**Blocker:** none.

**Major:** none.

**Minor:**

1. Duplicated `markXCompleted()`/`isXCompleted()` one-shot-gate pattern across `EngineerScene`, `InventoryScene`, `SideRepairScene`, `InterruptionScene`, `FinalCoreScene` (checklist item 9) — not a defect, but a maintainability risk; a shared helper alongside `roomTaskState.ts` would remove the divergence risk.
2. `docs/testing/wave1b-verification/WAVE1B-EVIDENCE.md` §1 per-spec test-count table sums to 23, not 24 (it attributes 2 tests to `launch_with_research_params`, which actually has 3 — I independently verified 24 total `test()` calls across the 9 spec files by direct grep count, so the headline "24/24" claim is accurate; only the table's row-level attribution is off by one). Purely a documentation-accuracy issue in an evidence file, not a functional gap.

**Observation:**

1. `FinalCoreScene`'s mutable-`promptBody`-via-shared-object-reference pattern (see §3) — works correctly but is an implicit, undocumented coupling with `RoomScene.addStation`'s pass-by-reference storage.
2. Pre-existing repo-wide CRLF lint failures (352, all outside this wave's files) — flagged for awareness, not caused by or blocking this review.
3. `InventoryScene`'s "grab tools quickly" and "sort-and-verify" options deliberately skip the verification/cleanup chained stages that the "systematic" option goes through (documented in the file header as an intentional, research-owned decision to avoid contradicting each option's asserted legacy outcome). This is a design/psychometric call, not an implementation defect — noting only for handoff/awareness, already covered by the file's own justification comment; re-litigating whether it's the _right_ call is `research-data-reviewer`'s territory, not this gate's.

## 9. Verdict

**Implementation-sound.** Shared architecture (registry, task-state factory, N-option prompt/chaining, canonical-event registration) is well-factored and correctly generalizes the Archive/V1 precedent; all six rooms conform to the room/task abstraction; routing, return paths, and cross-room state reads are correct and crash-safe on partial state; the Side Repair grid fix is a genuine, minimal, correctly-targeted geometry correction (verified independently via grid-column math, not a papering-over); the `getMissionState()` debug addition is genuinely read-only (verified via `SessionState.copyMissionState`'s array-cloning) and dev-only gated; the 24 Playwright tests are substantive (exact `study_item_ids`/`construct_id`/`success` pins, negative assertions on undocumented events, SessionState-propagation checks) rather than smoke-only. Build and typecheck both pass clean. Only minor/observation-level findings — none block the gate.
