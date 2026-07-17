# Playable Foundation Systems Spec (Q01-Q33 blueprint)

Documentation only; base `bfca741`. Minimum systems that make the
assessment feel like one connected game. Each entry: why it is needed,
supported Q items/modules, admission classification, smallest viable
implementation (SVI), likely files, tests, risks, and whether it can be
postponed. Existing research systems (EventLogger, SessionState,
ResearchRuntime, ScoringManager, QualtricsBridge, DataQualityTracker,
CanonicalEventContext) are extended only — never bypassed or rewritten.

Classification vocabulary as in the admission matrix.

## S1. Interaction targeting

- Why: deterministic, fair access to stations/objects; the base of every
  measurement opportunity.
- Supports: all modules.
- Classification: MANDATORY_PLAYABLE_FOUNDATION (exists).
- SVI: current RoomScene proximity model (72 px radius, SPACE prompt,
  numbered options, autorepeat-guarded). Extension for object-level play:
  nearest-target highlight when ≥2 interactables overlap.
- Files: `src/world/RoomScene.ts`.
- Tests: existing room specs; ADV-7 input spam.
- Risks: overlapping stations (scenario desks already placed 190+ px
  clear); keep radius constant for comparability.
- Postponable: highlight extension yes; base no (exists).

## S2. Action verbs — inspect / use / open / collect / deliver / talk

- Why: real interactions instead of abstract prompts; verbs map to
  observable process variables (inspection = information-seeking,
  collect/deliver = preparation and follow-through acts).
- Supports: Q01-Q04 (collect/place), Q03 (retrieve/deliver), Q09/Q10
  (talk/report/deliver), Q12 (inspect), Q22 (open/read), OPT steps.
- Classification: MANDATORY_PLAYABLE_FOUNDATION.
- SVI: verbs are prompt options on stations/objects (no free-form verb
  UI): each verb = one option wired to one logged event. No new event
  names — verbs reuse the room's approved events.
- Files: `src/world/RoomScene.ts` (option builder), room scenes.
- Tests: per-room specs assert verb→event mapping.
- Risks: verb inflation → unmapped telemetry; every verb must trace or be
  control-labelled.
- Postponable: partially — required verbs arrive per Stage 1 room pass.

## S3. Contextual item registry

- Why: named items (components, tools, kit contents, records) that rooms
  can reference consistently; substrate for placement/retrieval/steps.
- Supports: Q01-Q03 (kit items, bins), Q07/Q16 (components), Q03
  retrieval, Q10 (optional duty part, post-decision).
- Classification: MANDATORY_PLAYABLE_FOUNDATION.
- SVI: a typed static registry `src/data/itemRegistry.ts`
  (`{ item_id, label, home_bin, rooms, purpose }`), consumed by scenes;
  item state rides the EXISTING `SessionState.prepared_items: string[]`
  (today its only value is `field_kit`) by appending registry `item_id`s
  — **never retyping the field** (its array shape and `field_kit`
  membership are read by `FinalCoreScene` and pinned by specs). If richer
  per-item placement state is needed, add a NEW additive field (e.g.
  `kit_item_state`) beside it. `object_id` on events carries `item_id`
  (payload-compatible, no schema change).
- Files: new `src/data/itemRegistry.ts`; `src/systems/SessionState.ts`
  (additive fields); `src/scenes/InventoryScene.ts` first consumer.
- Tests: inventory per-item spec asserts registry-driven placement events.
- Risks: item sprawl — registry capped to items a canonical task needs
  (≈8-12 for pilot); any additions must pass admission.
- Postponable: no for Stage 1 Inventory pass (its substrate).

## S4. Small inventory (player-held items)

- Why: carrying a component/tool between shelf and console makes
  collect→deliver observable; also serves cross-room retrieval (Q03).
- Supports: Q01-Q03, Q07/Q16 steps, Q03 retrieval episode.
- Classification: MANDATORY_PLAYABLE_FOUNDATION (minimal form only).
- SVI: 1-3 slot "carried items" list rendered as a HUD line (same
  discipline as the duty roster: labels only, no scores); pick up = add,
  install/place = remove; state in SessionState (additive).
- Files: `src/world/RoomScene.ts` (HUD line), `SessionState.ts`.
- Tests: step-path specs assert carried-item transitions via events.
- Risks: inventory-management gameplay creep — no stacking, no sorting UI,
  no capacity puzzles; it is a courier pocket, not a system.
- Postponable: yes until the first multi-step pass (Stage 2 at latest).

## S5. Equipment/tool requirements

- Why: prepared-tool availability makes preparation consequential
  (Q02/Q03 later-consequence design).
- Supports: Q02 (missing-item consequence), Q03 (`prepared_tool_used`).
- Classification: MANDATORY_RESEARCH (consequence side), minimal.
- SVI: one later episode (Repair or Final Core) checks
  `prepared_items` for a named tool; present → `prepared_tool_used`;
  absent → the already-approved missing-item flag path. No gating that
  blocks progress — consequence is displayed, never punitive.
- Files: `RepairScene.ts` or `FinalCoreScene.ts`; SessionState.
- Tests: two-path spec (prepared vs not).
- Risks: soft-locking participants — never block the route on a missing
  tool.
- Postponable: until after the Inventory per-item pass (its consumer).

## S6. Task/objective state

- Why: single source of truth for opportunities, follow-through and
  closure checks; already the V3 §3.1 mission state.
- Supports: Q10, Q15, Q17-Q19, Q18 proxy, Final Core flags; every module.
- Classification: MANDATORY_RESEARCH (exists).
- SVI: current SessionState fields; additive extensions only (per-item
  kit map S3; competing-objective record for the INT rebuild).
- Files: `src/systems/SessionState.ts`.
- Tests: `state_session_continuity.spec.ts` + room specs.
- Risks: `active_objectives` feeds `objective_active` (Q18) — pilot layers
  must never write it (already enforced by the scenario governance).
- Postponable: no (exists; extensions ride their room passes).

## S7. NPC dialogue and report-back

- Why: task delivery, neutral feedback, the Q09/Q10 report-back loop.
- Supports: Q09-Q11, Q18 duty source; orientation everywhere.
- Classification: MANDATORY_RESEARCH (Engineer loop) +
  MANDATORY_PLAYABLE_FOUNDATION (dialogue presentation).
- SVI: existing chained prompt stages as the dialogue container; a thin
  shared dialogue-view helper (speaker label + body + options) so all NPCs
  present identically. No branching-dialogue engine, no relationship
  state, ever.
- Files: `src/world/RoomScene.ts` (presentation), scenes.
- Tests: engineer specs; text probes (`__lastPromptBody`) in DEV.
- Risks: wording leakage — all NPC text passes the no-Q-wording check in
  research review; neutrality rules per NPC table (blueprint §4).
- Postponable: presentation polish yes; Engineer loop exists.

## S8. Room transitions

- Why: one connected world (V3 progression requirement).
- Supports: all; INT module semantics depend on real leaving/returning.
- Classification: MANDATORY_PLAYABLE_FOUNDATION (exists).
- SVI: current door/SceneRouter model; keep exit normalization
  (stationToHubJourney) stable for tests.
- Files: `src/world/SceneRouter.ts`, `RoomScene.ts`, `stationRegistry.ts`.
- Tests: `connected_world_smoke.spec.ts`, journeys.
- Risks: transition side-effects re-firing events (guarded; keep one-shot
  discipline).
- Postponable: no (exists).

## S9. Persistent room/task state (in-session)

- Why: abandon/return classification, deferment, resumable arcs.
- Supports: Q24/Q25 return family, Q7/Q16 resumable steps, Q15 return.
- Classification: MANDATORY_RESEARCH (exists in-session).
- SVI: current module-scope room task state (`roomTaskState.ts`) +
  SessionState; extend per room pass.
- Files: `src/world/roomTaskState.ts`, scenes.
- Tests: abandon/return specs (exist).
- Risks: none new.
- Postponable: no (exists).

## S10. Feedback and consequence presentation

- Why: feedback use is a measured process variable (Q13/Q22); consequences
  make disorder/carelessness meaningful (Q02/Q04/Q12) without moralising.
- Supports: ARC/REP feedback; Final Core flag display; Hazard consequence
  (blocked UD-HAZARD-CONSEQUENCE).
- Classification: MANDATORY_RESEARCH.
- SVI: current feedback panels + Final Core flag list; a shared
  consequence-line style (factual, neutral, re-readable).
- Files: scenes; `RoomScene.ts` presentation.
- Tests: room specs assert feedback events precede revision events.
- Risks: moralising tone = social-desirability contamination; review gate.
- Postponable: no (exists; style unification is cheap polish).

## S11. Interruption handling

- Why: the INT module IS a measurement instrument; interruptions elsewhere
  (scenario step-away, focus loss) must stay distinguishable.
- Supports: Q15/Q17/Q18/Q19; DataQualityTracker covariates.
- Classification: MANDATORY_RESEARCH.
- SVI: rebuild corridor around a real competing objective
  (FABLE-NEXT-05); keep focus-loss (technical) separate from designed
  interruptions (behavioural) — already separated by DataQualityTracker.
- Files: `InterruptionScene.ts`, SessionState, CanonicalEventContext
  (no new registrations without decisions).
- Tests: corridor spec rebuild.
- Risks: D6 mapping open — `competing_task_viewed` stays unemitted.
- Postponable: no for Stage 1 (Q15 substrate).

## S12. Final Core gating

- Why: closure checks (duty, non-return, flags) need a defined end point;
  pilot scenario gate needs per-arm configurability.
- Supports: Q10/Q11/Q18/Q28 closure; pilot layer.
- Classification: MANDATORY_RESEARCH (closure) + CONTROL_OR_USABILITY
  (scenario gate config).
- SVI: existing flag computation + blocker/force; add an arm-level config
  flag (build-time env) to enable/disable the scenario route gate — no
  science change, listed Stage 3.
- Files: `FinalCoreScene.ts`, `src/scenarios/pilotRoute.ts`.
- Tests: `final_core_summary.spec.ts` + route-gate specs (exist).
- Risks: gate must keep reading explicit completion state, never event
  counts (established rule).
- Postponable: config flag until the first canonical-route pilot arm.

## S13. Save/recovery within the session

- Why: reload/crash currently loses everything (P0-3) — a data-loss and
  participant-burden problem.
- Supports: data integrity for every module; INT-5 status taxonomy.
- Classification: MANDATORY_RESEARCH (pilot-critical), BLOCKED-BY-DECISION.
- SVI: after the P0-3/INT-2 ruling — session-scoped storage buffer
  (mechanism per ruling), restore-on-reload of SessionState + event log +
  scenario state; sequence numbers if the payload ruling adds them.
- Files: new persistence module + `ResearchRuntime`, `SessionState`.
- Tests: reload-recovery specs (replace current reset-semantics spec).
- Risks: cross-session contamination (ADV-1 must stay green); privacy
  gate rules apply.
- Postponable: cannot be built before rulings; must land before pilot.

## S14. Keyboard-first accessibility

- Why: control-skill and access barriers must not read as trait signal.
- Supports: every measurement; spec §1.3 controls.
- Classification: CONTROL_OR_USABILITY (exists as discipline).
- SVI: keyboard-complete play (arrows/WASD + SPACE + number keys), no
  timing-critical inputs, no colour-only signals, viewport contract,
  concise text; Dock covariates capture baseline.
- Files: RoomScene/scenes; `participant_viewport_display.spec.ts`.
- Tests: viewport spec (exists); keyboard-only journeys (exist).
- Risks: future minigames must not add dexterity demands (admission rule).
- Postponable: no (standing constraint).

## S15. Optional mouse support

- Why: comfort for some participants; never required.
- Supports: usability only.
- Classification: OPTIONAL_POST_PILOT.
- SVI: click-to-select on prompt options mirroring number keys; identical
  event payloads (input modality in metadata if ever needed — CANDIDATE
  metadata field, not a new event).
- Files: `RoomScene.ts`.
- Tests: parity spec (keyboard vs mouse same events).
- Risks: input-modality variance across participants — log modality;
  keyboard remains the reference path.
- Postponable: yes (post-pilot).

## S16. Telemetry adapters

- Why: one logging spine for research, control, scenario and technical
  events with class separation (see event/data contract).
- Supports: everything.
- Classification: MANDATORY_RESEARCH (exists).
- SVI: current ResearchRuntime context authority + CanonicalEventContext
  registration + DataQualityTracker + test-only ResearchExportClient;
  production export/return BLOCKED (INT-1/2/5).
- Files: `src/systems/*`, `src/world/CanonicalEventContext.ts`.
- Tests: launch/export/error-capture specs (exist).
- Risks: never log free-form error content (privacy); never let pilot
  layers write scored state.
- Postponable: no (exists); production pipeline rides Stage 3 rulings.
