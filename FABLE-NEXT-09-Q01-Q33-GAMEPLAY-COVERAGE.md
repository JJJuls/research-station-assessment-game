# FABLE-NEXT-09 — Q01-Q33 Gameplay Coverage Contract

Status: CONTRACT — audit record + implementation contract. No gameplay is
implemented by this document. Every phase in §10 requires explicit approval
before it starts (CLAUDE.md: the branch name is not an authorisation).

- Audit baseline: `d4d9bf1` on `fable-autonomous-game-build-v1` (2026-07-25).
- Contract branch: `fable-next-09-q01-q33-coverage-contract-v1` (worktree,
  branched from `d4d9bf1`; this file is the only change).
- Prior contract in force: `FABLE-NEXT-08-RICH-MINIGAME-INTERFACES.md`
  (executed; verification record
  `docs/game/NEXT-08-RICH-MINIGAMES-VERIFICATION-RECORD.md`; asset set
  `outpost-assets-v3`; Phase 6 drag deferred).

## 1. Purpose

Answer, item by item for Q01-Q33: does the finished game as it exists at
`d4d9bf1` give a participant a **genuine gameplay experience** that embodies
the approved behavioural translation — or only structural traceability
(registered events, matrix rows, summary-variable names)? Then contract the
bounded, decision-gated work needed to close the genuine gaps without touching
anything that is frozen.

This document changes nothing scientific. Every event name and derived
indicator proposed here is a **CANDIDATE** unless it already appears as
canonical in `docs/research/event-schema.md` / `docs/research/scoring-plan.md`.
No open decision in `docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md` is
resolved here; where a gap is SA-/D-gated, the matching phase **stops for the
research owner** instead of coding around it.

## 2. Authority and precedence

Per CLAUDE.md, by domain: (1) exact 33-item battery (external) — wording,
direction, scale membership; (2)
`docs/scientific/Q01-Q33_GAMIFIED_MEASUREMENT_SPECIFICATION.md` (v0.1,
2026-07-15) — behavioural translation; (3) `docs/research/event-schema.md` —
canonical event names; (4) `docs/research/scoring-plan.md` — approved derived
variables; (5) V3 build contract — architecture and discipline; (6) historical
material — evidence only. This contract sits below all of them: where §6
proposals and any authority conflict, the authority wins and the conflict is
routed to §13, never edited around.

## 3. Classification rubric — structural traceability vs genuine embodiment

Structural traceability = a Q-item has matrix rows, registered
`study_item_ids`, event names, and/or summary-variable names. Genuine gameplay
embodiment = a participant standing in the world encounters the approved
behavioural **opportunity** (per the measurement specification: valid,
comprehensible, with real alternative choices) and their **choice/process**
produces the telemetry. The four classes used in §6/§7:

- **FULLY EMBODIED** — a distinct participant-facing experience instantiates
  the approved behavioural translation, and its canonical events are emitted
  from that experience. (Scoring-layer gaps — missing derived variables — are
  noted but do not demote the class; they are D2-family work.)
- **PARTIALLY EMBODIED** — real gameplay exists, but a named part of the
  approved opportunity is missing (an episode, a repetition, a required
  framing, or a blocked measurement window).
- **TELEMETRY-ONLY** — events fire (or are registered) from bookkeeping,
  flags, or other modules' side effects; the participant never encounters a
  distinct opportunity for this item. For Q32 (and Q33 once its inputs exist)
  TELEMETRY-ONLY is the **approved end state** — the specification forbids a
  separate minigame; that is marked "by design".
- **ABSENT** — the approved analogue has no experience and no emitted events
  (blocked, unbuilt, or the only live telemetry belongs to a superseded
  rationale that the research owner has already ruled misaligned).

A row whose only live telemetry is a **superseded mapping** (Q27 hazard tags,
Q29/Q31 stabiliser/hazard tags, Q30 verification tags, Q33 rush/resolve tags —
all SA-gated) is classed ABSENT for the approved analogue, with the contested
telemetry explicitly noted; this contract does not remove or retag those
events (that is the SA rulings' job).

## 4. Audit basis and source findings

Audited at `d4d9bf1` (read-only): the measurement specification; the actual
validator sources; event-schema and scoring-plan; the NEXT-08 contract,
verification record and `docs/game/UI-PRESENTATION-CONTRACT.md`;
`docs/game/UI-MANUAL-ACCEPTANCE-ROUTES.md`; the open-decision register; and
every participant-reachable scene, task, minitask, inventory interaction, NPC
interaction and scenario console in `src/`.

Findings about the sources themselves (recorded, not fixed here):

- **F-1 — validator scope.** `scripts/validate-traceability-matrix.mjs`
  consumes exactly: `docs/research/research-traceability-matrix.json` (the
  only matrix), `src/world/CanonicalEventContext.ts`,
  `src/systems/ScoringManager.ts`, all `src/**/*.ts(x)` (code references), all
  `e2e/**/*.ts` (spec references), plus internal seed/room tables. It does
  **not** read either `.md` matrix or the blueprint JSON
  (`docs/game/q01-q33-feature-traceability.json`, `documentation_only: true`).
  `docs/research/RESEARCH-TRACEABILITY-MATRIX.md` self-declares "the JSON
  wins".
- **F-2 — CRLF worktree artifact.** In a CRLF checkout the validator's
  registration regex matches 0 of 70 `CANONICAL_EVENT_CONTEXT` entries, so it
  reports 71 spurious errors. Proven mechanical artifact (matches the known
  "run from main tree / LF checkout" note); no genuine matrix-vs-source drift
  is evidenced. Operational rule for all §10 phases: run the validator from an
  LF checkout.
- **F-3 — stale hand-authored matrix rows.** The JSON's hand-authored `items`
  rows still mark as unemitted several events that demonstrably fire at
  `d4d9bf1` (per-item `inventory_item_sorted_correct` /
  `inventory_item_misplaced`, `wrong_tool_selected`,
  `side_repair_step_completed`, `engineer_report_accuracy_scored`) — the
  NEXT-02..08 landings outran the annotations, and the manual acceptance
  routes already assert those events live. Documentation-sync gap → Phase 1.
- **F-4 — undocumented pilot telemetry.** The `scenario_*` family and
  `final_core_blocked_pending_decisions` are emitted, deliberately unmapped
  (`study_item_ids: []` by rule), and absent from `event-schema.md`. Recording
  them in the schema's raw-telemetry section → §13 (NEXT-09-OD-2, approved
  documentation-only: raw unmapped telemetry, no study-item or scoring
  promotion).
- **F-5 — prior audit superseded.** `docs/game/Q01-Q33-CURRENT-STATE-GAP-AUDIT.md`
  (2026-07-17, baseline `bfca741`) predates NEXT-05..08; its PARTIAL verdicts
  for Q01/Q02/Q07/Q15/Q16/Q19 no longer describe the code. §6/§7 of this
  document supersede it as the current-state audit (as an audit only — it
  decides nothing scientific either).

## 5. Current participant-facing surface at d4d9bf1

### 5.1 Route

Boot → **Dock** (tutorial; duty-roster HUD) → **Station Hub** → free roam over
8 open stations. Hard gate: the Final Core interface stays locked
(`final_core_blocked_pending_decisions`, step-back-only card) until all four
scenario decisions are committed and acknowledged — explicit
`src/scenarios/pilotRoute.ts` state, never event counts and never
`SessionState.active_objectives`. Strictly required: the four scenario
consoles + Final Core synchronization. Everything else — Dock tutorial,
Archive task, Systems Repair, Engineer report/duty, Inventory kit prep, Hazard
console, Side Repair, Interruption Corridor — is optional but instrumented,
with omissions cross-flagged at Final Core (missing kit, disordered workspace,
unresolved duty, non-return).

### 5.2 Room-by-room interaction inventory

All interactions share one model: approach within 72 px → "Press SPACE to
interact" → card panel (`RoomScene.renderPromptStage`; pointer hover/click,
Arrow Up/Down + Enter, hidden 1-9 shortcuts; optional NEXT-08 task surfaces as
redundant activators). No drag, no timers, no text entry.

| Room (`room_id`)                                | Interactables                                                                               | Participant tasks                                                                                                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dock / Arrival Bay (`dock_arrival`)             | Arrival Terminal, movement marker, Hub door                                                 | Tutorial: skip / review controls / practice (one-shot). Control/usability data only.                                                                                         |
| Station Hub (`station_hub`)                     | 8 station doors, Dock door, Status Board, Priority Allocation console                       | Scenario B (ordered 3-slot allocation); read-only progress board. Never Q-mapped.                                                                                            |
| Archive Room (`archive_room`)                   | Archive Terminal, Log Shelves, Reconciliation Desk                                          | Scripted-failure code task (wrong code → feedback → revised query); log hint; Scenario C.                                                                                    |
| Systems Repair (`systems_repair_room`)          | Repair Panel, Repair Manual station                                                         | Multi-cycle sequence task (default fails; manual-guided revision succeeds; `attempt_number` per cycle; schematic surface).                                                   |
| Engineer Hub (`engineer_hub`)                   | Engineer Kai (NPC), Calibration Bench                                                       | Report-back (quick-from-memory / review evidence / clarification → record-card claim scored vs live state → relay-duty offer); Scenario A.                                   |
| Inventory / Prep (`inventory_prep_room`)        | Quartermaster Console, Prep Bench, 3 labelled bins, Field Kit Crate, Seal Log, Vale (decor) | Per-item kit prep (carry one of 8 items → crate or bin; close-out: checklist, unmissable review, verify-or-skip, restore-vs-leave cleanup) + legacy options 1-3; Scenario D. |
| Hazard Control (`hazard_control_room`)          | Hazard Warning terminal                                                                     | Check detail / continue (informed vs reckless branch) / avoid route (repeatable by design).                                                                                  |
| Side Repair Bay (`optional_side_repair_bay`)    | Utility Bot, Parts Shelf                                                                    | Offer (ignore/accept/defer) → fetch → fit → run check; defer keeps progress; walk-away after ≥1 step = observed abandonment; step-tile tracker.                              |
| Interruption Corridor (`interruption_corridor`) | Comms Beacon, Relay Checkpoint, Antenna Junction                                            | Beacon offer (switch / acknowledge / ignore, one-shot); competing antenna task (align + confirm); relay check-in = observed return act.                                      |
| Final Core (`final_core_room`)                  | Core Interface                                                                              | Route gate; then quick sync / review + integrate / resolve flags / force through flags (4th appears only with outstanding issues); one-shot.                                 |

Legacy prototype `Main.tsx` is reachable only via `?scene=prototype` — off the
participant route; excluded from coverage claims.

### 5.3 Current NPC roster

| NPC                | Where                         | Interaction                                                                   | Gates                                                             |
| ------------------ | ----------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Engineer Kai       | Engineer Hub                  | Full report-back dialogue tree + relay-duty offer                             | Relay duty feeds Corridor checkpoint + Final Core duty resolution |
| Quartermaster Vale | Inventory room                | **None — decorative sprite only**; the Quartermaster Console carries the role | —                                                                 |
| Utility Bot        | Side Repair Bay               | Stabiliser offer + work console                                               | Nothing on the main route                                         |
| Station AI         | Dock (voice in feedback text) | None (not an entity)                                                          | —                                                                 |

### 5.4 Input model and DEV probes (frozen surface)

Keyboard: WASD/arrows move, SPACE interact, ESC pause, arrows+Enter in
prompts, hidden 1-9. Mouse: hover/click on cards and task surfaces — fully
redundant, identical event streams (NEXT-08 Route A). DEV probes (all
DEV-only, preserved verbatim): `__lastRoomFeedbackText`, `__playerProbe`,
`__routeObjectiveText`, `__lastPromptBody`, `__promptCards`,
`__roomStatusText`, `__minigameSurface`, `__prepStatusText`,
`__scenarioProbe`, `__procTextures`, `__researchExportConfig`, and the
`window.researchRuntime` debug API (getEvents, getSummary, getMissionState,
completeDebugSession, exportEventsJSON, submitSessionExport, …).

## 6. Item-level coverage matrix (Q01-Q33)

Format per item — Construct | Spec translation & strength | Present events
(canonical, emitted at `d4d9bf1` unless marked) | Summary variables (per
scoring-plan status) | Manifestation & location | **Coverage** | Missing
experience | Proposed implementation (all new names CANDIDATE) | Invariance
constraints | Required tests. "Vars missing" = canonical target named in
scoring-plan with status missing/rename — D2-family scoring work, listed once
here and not repeated as a gameplay gap.

Shared-module rule (spec §8): one event sequence is never counted as multiple
independent item observations. Modules: Archive failure-and-revision (Q13
primary; Q22-Q26 supporting), Repair difficulty (Q14/Q21/Q24 primary;
Q22/Q23/Q25 supporting), Interruption/continuity (Q15/Q17/Q18/Q19), Side
repair arc (Q07/Q16/Q20), goal-horizon (Q29+Q31, weak Q32), goal-granularity
(Q30, weak Q33), maladaptive stopping (Q26 repetition / Q27 utility-stop /
Q28 known blocker).

---

### Q01 — BFI-2 Organisation (BFI-C-04, positive)

- Spec: checklist + ordered kit prep; sequence/accuracy primary, never speed.
  Strong analogue.
- Events: `inventory_checklist_opened` (checklist act, never prompt-open),
  `inventory_item_sorted_correct` (per item, `object_id` = item id,
  `attempt_number`), `inventory_sequence_followed` (judged at kit-full in
  per-item mode), `inventory_sequence_completed` (emitted, registration open).
- Vars: `organisation_checklist_use` (rename pending), `organisation_accuracy_score`
  missing, `sequence_quality` missing (D2-family).
- Manifestation: per-item prep mode — bench pickup, single carried slot,
  placement into crate/bins, checklist view at console. Inventory room,
  Quartermaster Console + Prep Bench.
- **Coverage: FULLY EMBODIED.**
- Missing experience: none for the approved opportunity.
- Proposal: none (scoring alignment only, D2).
- Invariance: freeze all inventory event names, per-item `object_id`/
  `attempt_number` payloads, prompt copy, one-shot completion.
- Tests: existing inventory specs + manual route 1 stay green unchanged.

### Q02 — BFI-2 Organisation (BFI-C-01, reverse)

- Spec: preventable misplacements/omissions left after a clear correction
  opportunity; consequence surfaced at Final Core. Strong reverse analogue.
- Events: `inventory_item_misplaced`, `missing_item` (once per item at first
  close-out review, unmapped by D2 rule), `inventory_verification_skipped`,
  `final_core_missing_item_flagged`.
- Vars: `organisation_error_count` (rename pending), `avoidable_omission_count`
  missing.
- Manifestation: misplacement possible per item; unmissable bench review at
  close-out = the correction opportunity; corrections carry `attempt_number`
  ≥ 2; missing kit flagged at Final Core entry. Inventory room + Final Core.
- **Coverage: FULLY EMBODIED.**
- Missing experience: none. (D2 rule stands: omissions are evaluated against
  final `prepared_items` state, never `missing_item` alone.)
- Proposal: none.
- Invariance: as Q01; `final_core_missing_item_flagged` stays an entry-time
  system flag, never a participant-visible verdict.
- Tests: manual route 2; existing misplace/review specs unchanged.

### Q03 — BFI-2 Organisation (BFI-C-07, positive)

- Spec: maintained storage order **plus one later tool-retrieval episode**
  (Repair/Final Core) — accurate retrieval from the expected location. Strong
  analogue.
- Events: `correct_tool_selected` / `wrong_tool_selected`,
  `workspace_tidy_confirmed` emitted. `prepared_tool_used` is canonical and
  registered (Q03) but **unemitted** — schema notes "later cross-room unit".
- Vars: `prepared_resource_use`, `tool_retrieval_accuracy`,
  `workspace_tidy_score` — all missing.
- Manifestation: storage order and packing exist (Inventory room); the later
  retrieval episode does not exist anywhere.
- **Coverage: PARTIALLY EMBODIED** — the cross-room retrieval episode is the
  named missing half.
- Missing experience: a moment in a later task where the participant retrieves
  and uses an item they packed, from where they packed it.
- Proposal (Phase 2): Repair Panel gains one preparatory micro-step when (and
  only when) the session packed the kit: a "collect the tool you need"
  stage — the participant chooses which stored container/location to open
  (kit crate vs bins, mirrored as neutral cards); retrieving the correct item
  from where they actually placed it and first applying it to the repair
  emits `prepared_tool_used` exactly once (canonical, already registered);
  a wrong location emits nothing new (`wrong_tool_selected` is
  Inventory-scoped and stays there — no reuse across rooms per schema rule).
  Sessions without a packed kit see the current panel unchanged
  (no-opportunity state preserved). Observed moment approved (NEXT-09-OD-3):
  emission only on retrieval from the stored location plus first application
  to Systems Repair — never on container opening, item selection, display,
  or carrying; a session with no qualifying packed tool is a no-opportunity
  state.
- Invariance: no change to any existing repair event/moment; the new stage is
  additive, card-panel only, neutral copy; skippable design questions go to
  the owner, not resolved here.
- Tests: focused spec — kit-packed session shows the stage and emits
  `prepared_tool_used` once; kit-less session byte-identical to baseline;
  keyboard/mouse parity; Route G invariance for kit-less replay.

### Q04 — BFI-2 Organisation (BFI-C-10, reverse) — cleanup, never planning

- Spec: explicit restore-or-leave choice after task completion. Strong reverse
  analogue. Approved decision: cleanup/restoration only.
- Events: `cleanup_completed` + `workspace_tidy_confirmed` vs
  `workspace_left_disordered`; `final_core_workspace_issue_flagged`.
- Vars: `cleanup_failure_count` missing (must not conflate with action
  counts); partial-cleanup option not implemented (open in schema).
- Manifestation: chosen act at the Inventory close-out (restore vs leave);
  consequence flag at Final Core. Inventory room + Final Core.
- **Coverage: FULLY EMBODIED.**
- Missing experience: none required. (Partial-cleanup granularity = owner
  option, not a gap.)
- Proposal: none.
- Invariance: Q04 must remain a chosen act; never auto-cleanup; never planning
  framing.
- Tests: manual route 3 unchanged.

### Q05 — BFI-2 Productiveness (BFI-C-05, reverse) — task initiation

- Spec: latency from objective-confirmed + control-restored to first
  goal-directed action; reading instructions is not avoidance; no universal
  cut-off before pilot calibration. Moderate reverse analogue.
- Events: `task_started` ⛔ blocked (D7 — V3 lists Q05+Q15, MASTER_33 Q05
  only) and unemitted; no `objective_confirmed`/`control_restored` capture
  exists anywhere.
- Vars: `task_initiation_latency`, `productiveness_action_ratio` — missing.
- Manifestation: none — no confirmation moment, no latency window.
- **Coverage: ABSENT** (blocked: D7; adjacent idle definition D3).
- Missing experience: an explicit, neutral objective-confirmation act that
  opens a measurement window.
- Proposal (Phase 6, decision-gated): a duty-roster confirmation interaction
  (Hub or Dock terminal): the participant reviews the assignment card and
  confirms it — a natural briefing act, no timing pressure shown. CANDIDATE
  events `objective_confirmed`, `first_goal_directed_action`
  (+ `task_started` per D7's resolution). **Stops for D7 (and D3 for the
  idle side) before any event is wired** — the interaction shell is not built
  until the events it exists to feed are ruled on.
- Invariance: no change to route gating; the confirmation act must not become
  a progression gate without an explicit owner ruling.
- Tests: (post-ruling) latency window opens exactly once; reading/manual
  actions excluded from avoidance; no-opportunity sessions distinguishable.

### Q06 — BFI-2 Productiveness (BFI-C-08, positive)

- Spec: required-task completion + effective-action ratio across Archive,
  Repair, Final Core; never pure speed. Strong analogue.
- Events: `repair_completed`, `archive_completed`, `final_core_completed`
  (+ legacy `objective_completed` once when Archive+Repair both complete).
- Vars: `required_completion_rate`, `productiveness_completion_score`,
  `effective_action_ratio` — missing.
- Manifestation: the completion experiences exist and are first-class tasks.
  But on the enforced pilot route, Archive and Repair are **optional**: only
  the four scenarios + Final Core gate progression, while the spec's Q06/Q08
  reasoning assumes genuinely required duties.
- **Coverage: PARTIALLY EMBODIED** — completion gameplay exists; the
  "required" framing the spec leans on is not what the route enforces, and
  process-level capture (goal-relevant vs unnecessary action) is absent.
- Missing experience: required-duty framing for Archive/Repair; the
  resolution below closes the framing half, while process-level capture
  (effective action) stays D2-family.
- Proposal: NEXT-09-OD-1 is **resolved framing-only** (§13): Archive and
  Systems Repair become assigned duties on the participant duty roster; they
  remain skippable; omissions remain observable at Final Core; the existing
  four-scenario Final Core gate is unchanged. Route-gate extension is removed
  as an option under this contract. Effective-action capture is a D2-family
  scoring decision.
- Invariance: the Final Core gate condition (four scenario decisions, explicit
  pilotRoute state) is frozen; no proposal may repoint it.
- Tests: (framing pass) duty roster lists Archive/Repair as assigned duties;
  both remain skippable end-to-end; gate and event streams byte-identical on
  a Route G replay avoiding new modules.

### Q07 — BFI-2 Productiveness (BFI-C-11, positive)

- Spec: completion of a knowingly accepted multi-step useful task (Side
  Repair); acceptance-to-completion window. Strong-moderate analogue.
- Events: `stabiliser_option_offered`/`side_repair_accepted` (+ aliases),
  `side_repair_step_completed` (fetch/fit/check), `side_repair_deferred`,
  `side_repair_abandoned_after_start`, `side_repair_completed`,
  `final_bonus_unlocked`.
- Vars: `accepted_task_completion_rate`/`optional_followthrough_rate` family
  missing (candidates); legacy derived-style events noted in schema.
- Manifestation: full accept → fetch → fit → check arc with step tiles,
  deferral and observed walk-away. Side Repair Bay, Utility Bot + Parts
  Shelf.
- **Coverage: FULLY EMBODIED.** Confound (completionism/curiosity) is handled
  by the separated accepted/deferred/abandoned/completed events — never a
  sole work-ethic score.
- Missing/Proposal: none.
- Invariance: offer fires only while unaccepted (protects opportunity count);
  defer ≠ abandon stays distinguishable.
- Tests: manual route 5 unchanged.

### Q08 — BFI-2 Productiveness (BFI-C-02, reverse)

- Spec: avoidance/idling/unresolved duty across ≥2 valid required
  opportunities after Dock competence; never inferred from one delay.
  Moderate reverse analogue, pattern-level.
- Events: `task_avoidance` (+ legacy ignore) emitted from the Corridor ignore
  path; `accepted_duty_unresolved` at Final Core;
  `excessive_idle_after_instruction` and `baseline_idle_seconds` ⛔ blocked
  on D3 (idle definition); `tutorial_help_shown` wired-disabled.
- Vars: `avoidant_delay_count`, `unresolved_required_task_count`,
  `productive_engagement_rate` — missing.
- Manifestation: one avoidance context (beacon ignore) plus end-state flags;
  the idle dimension and a second required-duty context are absent.
- **Coverage: PARTIALLY EMBODIED** (single-context; idle half blocked on D3;
  the "required opportunities" half shares the resolved NEXT-09-OD-1 framing
  with Q06).
- Missing experience: a second, clearly-required duty opportunity whose
  deferral/non-resolution is observable; the idle window (post-D3).
- Proposal: rides on the resolved NEXT-09-OD-1 framing (Archive/Systems
  Repair as assigned roster duties — skippable, omissions observable at
  Final Core, four-scenario gate unchanged) + D3; no bespoke idle mechanic
  invented here (no artificial waiting is permitted by spec).
- Invariance: never score one delay; no-opportunity vs non-performance stays
  distinguishable.
- Tests: (post-ruling) ignore path unchanged; idle events fire only per the
  ruled definition.

### Q09 — BFI-2 Responsibility (BFI-C-03, positive)

- Spec: report-back to Kai — evidence review/clarification vs unverified
  answer; accuracy against real mission state; options never moral labels.
  Strong analogue; primary responsibility indicator, separate from
  persistence.
- Events: `engineer_report_opened`, `engineer_evidence_reviewed`,
  `engineer_clarification_requested`, `engineer_report_submitted_prepared` /
  `_unprepared`, `engineer_report_accuracy_scored` (emitted; **unmapped raw
  telemetry — Q09 registration = SA-8, deliberately withheld**).
- Vars: `responsibility_report_count` exact; `prepared_report_flag` rename
  pending; `report_accuracy_score` missing (blocked behind SA-8/D2).
- Manifestation: full three-stage Kai dialogue with record-card claims scored
  against live state (`reportAccuracy.ts`); no grade shown, identical
  acknowledgement either way. Engineer Hub, NPC Kai.
- **Coverage: FULLY EMBODIED.** The remaining gap is registration/scoring
  (SA-8/D2/D5), not experience.
- Missing/Proposal: none. SA-8 stop stands.
- Invariance: accuracy is never surfaced to the participant; claim-card copy
  frozen.
- Tests: manual route 6 unchanged.

### Q10 — BFI-2 Responsibility (BFI-C-09, positive)

- Spec: follow-through on an accepted duty active across rooms until Final
  Core; honest declining is never penalised. Strong analogue.
- Events: `engineer_supervision_assigned` (unmapped), `_accepted`,
  `_declined` (unmapped, no-penalty), `_completed` (Final Core resolve path),
  `accepted_duty_unresolved` (Final Core completion with duty open).
- Vars: `commitment_followthrough_rate`, `accepted_duty_unresolved_count` —
  missing.
- Manifestation: duty offer at Kai; duty persists across rooms; resolution or
  non-resolution observed at Final Core. Engineer Hub + Final Core.
- **Coverage: FULLY EMBODIED.** (`engineer_supervision_skipped` has no
  distinct act by design — noted, not a gap.)
- Missing/Proposal: none.
- Invariance: decline path stays penalty-free and unmapped.
- Tests: routes 6/9 unchanged.

### Q11 — BFI-2 Responsibility (BFI-C-12, reverse)

- Spec: Final Core integration review — resolve/acknowledge vs
  force-finalising with preventable issues; no coercive countdown. Strong
  reverse analogue.
- Events: `final_core_status_reviewed`, `unresolved_issue_reviewed`,
  `issue_resolution_attempted`, `final_core_issue_resolved`,
  `final_core_rushed`, `final_core_force_continue`, `final_core_completed`
  (+ legacy quality-tier events pending consolidation).
- Vars: `accountability_review_flag`, `preventable_unresolved_count` missing;
  `final_quality_score` shape = D2 sub-item 3.
- Manifestation: full review/resolve/rush/force choice set at the Core
  Interface, flags real (kit, workspace, duty, non-return). Final Core room.
- **Coverage: FULLY EMBODIED.**
- Missing/Proposal: none.
- Invariance: the 4th "force" option appears only while issues are
  outstanding; no timer ever.
- Tests: manual route 9 unchanged.

### Q12 — BFI-2 Responsibility (BFI-C-06, reverse) — prudence

- Spec: ignoring available warning detail before consequential action;
  prudence/carefulness, never fear/risk-appetite, never Goal-Time. Strong
  reverse analogue. Hazard room stays principally prudence (approved).
- Events: `hazard_warning_seen`, `hazard_info_checked` (reserved for
  info-checking), `hazard_informed_continue`, `hazard_reckless_continue`
  (metadata `info_checked_before_continuing`), `hazard_route_avoided`
  (D1-resolved: telemetry-only, never scored), legacy `hazard_avoidance`.
- Vars: `prudence_check_rate` and `reckless_shortcut_count` missing — both
  currently folded into mixed-construct counters (D2 sub-item 1).
- Manifestation: check-detail vs continue branches with identical neutral
  panel wording. Hazard Control room.
- **Coverage: FULLY EMBODIED.** Note: the prompt is repeatable by design
  (prototype parity); first-response retention is a spec-§8.2 open principle,
  not resolved here. The hazard-consequence trio
  (`hazard_issue_created`/`_resolved`/`final_hazard_issue`) is unbuilt —
  UD-HAZARD-CONSEQUENCE remains with its owner.
- Missing/Proposal: none in this contract.
- Invariance: informed/reckless wording identical to participant; amber
  restricted to Hazard.
- Tests: manual route 7 unchanged.

### Q13 — Grit-S Perseverance (GRIT-02, positive)

- Spec: standardised first-attempt failure → feedback → revision →
  completion. Strong analogue. Archive module is Q13-primary.
- Events: `archive_code_entered` (+ legacy `archive_attempt`),
  `archive_wrong_code`, `archive_feedback_used`, `archive_strategy_revision`
  (tagged Q13/Q22/Q26), `archive_completed`, `archive_abandoned`,
  `archive_returned_after_failure`.
- Vars: `game_difficulty_persistence` exact (shared);
  `adaptive_persistence_count` missing; `post_failure_reengagement` missing.
- Manifestation: deterministic scripted failure (code A17), learnable
  feedback, revised query completes. Archive Terminal.
- **Coverage: FULLY EMBODIED.**
- Missing/Proposal: none.
- Invariance: scripted failure and feedback text frozen (stimulus freeze).
- Tests: existing archive specs unchanged.

### Q14 — Grit-S Perseverance (GRIT-04, positive)

- Spec: sustained useful effort in a multi-step demanding task — manual use,
  revised sequence after diagnosis; effective effort, never raw actions/time.
  Moderate-strong analogue.
- Events: `repair_sequence_submitted`, `repair_failed`,
  `repair_manual_opened`/`manual_page_reviewed`/`repair_manual_used`,
  `repair_strategy_revision` (manual-guided success only), `repair_completed`
  — all with `attempt_number`. Candidates `repair_step_completed` /
  `repair_diagnostic_completed` remain unbuilt (owner decision; a
  physically-assembled richer repair mechanic was explicitly ruled out of
  NEXT-08 scope for needing schema/scoring decisions).
- Vars: `difficulty_persistence_score` family: `game_difficulty_persistence`
  exact; `useful_effort_count` missing.
- Manifestation: multi-cycle repair with manual station and honest side panel
  (no guidance leakage). Systems Repair room.
- **Coverage: FULLY EMBODIED** for the approved cycle model.
- Missing/Proposal: none here; per-step diagnostic granularity stays an
  unpromoted candidate.
- Invariance: `repair_strategy_revision` keeps its manual-guided-success-only
  semantics (Q23 safeguard); sequences never reopen post-completion.
- Tests: manual route 4 unchanged.

### Q15 — Grit-S Perseverance (GRIT-07, positive)

- Spec: return to and completion of an already-started task after an
  interruption; non-return (not switching) is the negative evidence. Strong
  analogue.
- Events: `interruption_received`, `goal_switch_accepted`, `switched_task`
  (first real competing interaction), `return_to_unfinished_task` (observed
  return act at Relay Checkpoint; **co-fires with
  `returned_to_original_task` — SA-9 open**), `prior_goal_completed`,
  `task_completed_after_interruption` (same physical act — shared evidence;
  ignore-branch semantics = SA-10).
- Vars: `return_to_task_rate` partial (raw count today),
  `started_task_completion_rate` missing.
- Manifestation: genuine pending original (relay duty accepted at Kai),
  beacon interruption, competing antenna task, observed return and check-in.
  Interruption Corridor (+ Engineer Hub prerequisite).
- **Coverage: FULLY EMBODIED.** Opportunity exists only when the relay duty
  was accepted — the no-opportunity state (`original_task_id: null`) stays
  analyst-excludable, as designed.
- Missing/Proposal: none; SA-9/SA-10 stops stand.
- Invariance: co-fire pair untouched until SA-9; one moment never becomes two
  observations.
- Tests: manual route 8 unchanged.

### Q16 — Grit-S Perseverance (GRIT-08, positive)

- Spec: accurate sustained completion of a multi-step optional task with
  final verification. Strong-moderate analogue; interpreted with Q07 and
  organisation, never alone.
- Events: side-repair arc (accept/steps/complete — `run_check` is the
  verification step) and inventory verification acts
  (`inventory_verified_complete` / `inventory_verification_skipped`).
- Vars: `diligence_step_accuracy`, `verified_completion_rate` — missing.
- Manifestation: both named opportunities exist in full. Side Repair Bay +
  Inventory room.
- **Coverage: FULLY EMBODIED** (shared modules; never double-counted with
  Q07).
- Missing/Proposal: none.
- Invariance: as Q07/Q01.
- Tests: routes 1/5 unchanged.

### Q17 — Grit-S Consistency of Interest (GRIT-01, reverse) — exploratory

- Spec: attractive non-mandatory competing objective while a task is
  unfinished; switch-without-return is the pattern; switching alone can be
  rational. Moderate exploratory — discriminant only.
- Events: `new_goal_offered` (balanced framing metadata), `switched_task`,
  `returned_to_original_task` (SA-9 pair), `prior_goal_abandoned`;
  `competing_task_viewed` ⛔ registered, deliberately unemitted (D6).
- Vars: `distraction_switch_rate`, `switch_without_return_count`,
  `return_after_switch_flag` — missing (exploratory family; label mechanism
  SA-7/D2).
- Manifestation: complete switch/return/non-return module (shared with
  Q15/Q19). Interruption Corridor.
- **Coverage: FULLY EMBODIED** (exploratory; shared-module evidence).
- Missing experience: none required; the details-viewing act D6 would map is
  an event-layer question, not a missing opportunity.
- Proposal: none; D6 stop stands.
- Invariance: balanced framing metadata frozen; exploratory label obligations
  (SA-7) untouched.
- Tests: route 8 unchanged.

### Q18 — Grit-S Consistency of Interest (GRIT-06, reverse) — QUESTIONNAIRE-PRIMARY

- Spec translation: persistent three-stage background objective (Engineer
  Hub calibration) spanning rooms and ≥1 interruption — continuity, voluntary
  revisit, unresolved-at-core. Weak exploratory proxy; never described as
  long-term-focus measurement; no artificial waiting.
- Events: `objective_active`, `final_unresolved_due_to_nonreturn` — both real
  but emitted by the Corridor/Final-Core machinery, not by any dedicated
  background objective.
- Vars: `longitudinal_focus_proxy`, `unresolved_after_interruption` —
  missing; SA-7 governs the label wording.
- Manifestation: none of its own — evidence is a shadow of the interruption
  module.
- **Coverage: TELEMETRY-ONLY.** Questionnaire-primary status caps how much
  this matters, but the spec's named opportunity (a background multi-stage
  objective) does not exist.
- Missing experience: the background calibration arc itself.
- Proposal (Phase 7, optional, decision-gated): a three-stage calibration
  task at the Engineer Hub bench — stage 1 available early, stages 2-3
  unlocked by natural progress elsewhere (never by waiting); revisits are
  voluntary; unresolved state flagged (not blocking) at Final Core. All
  events CANDIDATE (`background_objective_offered/accepted/…` per spec) —
  **needs event-schema decision; no bespoke Q18 score; weak-proxy label
  mandatory everywhere (SA-7)**.
- Invariance: never gates the route; never surfaces continuity framing to
  the participant.
- Tests: (post-ruling) stage unlocks tied to progress events only; Final Core
  flag appears without blocking.

### Q19 — Grit-S Consistency of Interest (GRIT-05, reverse) — exploratory

- Spec: credible new option after accepting an original goal;
  abandonment/non-return scored, not switching. Moderate exploratory.
- Events: `new_goal_offered`, `goal_switch_accepted`, `prior_goal_completed`,
  `prior_goal_abandoned` (Final-Core-bound closure; no-opportunity session
  can never emit).
- Vars: `goal_switch_without_return_count` missing (exploratory family).
- Manifestation: corridor module end-to-end (shared). Interruption Corridor +
  Final Core.
- **Coverage: FULLY EMBODIED** (exploratory; shared-module evidence, never
  double-counted with Q15/Q17).
- Missing/Proposal: none.
- Invariance: balanced urgency/value framing frozen.
- Tests: route 8 unchanged.

### Q20 — Grit-S Consistency of Interest (GRIT-03, reverse) — QUESTIONNAIRE-PRIMARY

- Spec translation: voluntary anomaly-investigation arc — start in Side
  Repair, **two later stages with stable utility**; started-but-not-sustained
  pattern. Very weak exploratory; NO bespoke Q20 score (approved decision).
- Events: `side_repair_accepted`, `side_repair_first_step`,
  `side_repair_abandoned_after_start` — real observed acts.
- Vars: `start_without_sustain_count`, `optional_followthrough_rate`,
  `voluntary_return_flag` — missing (exploratory).
- Manifestation: the single side-repair arc gives genuine start/defer/
  walk-away observation, but the spec's multi-stage anomaly arc with stable
  utility across later rooms does not exist.
- **Coverage: PARTIALLY EMBODIED** (single-arc evidence present; the
  cross-room staged arc absent; questionnaire-primary caps the priority).
- Missing experience: the optional anomaly arc's later stages.
- Proposal (Phase 7, optional, decision-gated, lowest priority): anomaly
  discovery during Side Repair (`anomaly_*` CANDIDATES per spec) with two
  later optional stages of stable, explicitly stated utility. Needs
  event-schema decision; supplementary process evidence only — no score.
- Invariance: never gates anything; stopping must remain rationally
  ambiguous-free (utility stated).
- Tests: (post-ruling) stage availability and voluntary-return events.

### Q21 — Persistence Despite Difficulty (PDD-01, positive)

- Spec: standardised setback + available support + adaptive continuation;
  never reward raw retries. Strong analogue.
- Events: `repair_failed`, `repair_manual_used`, `repair_strategy_revision`,
  `repair_completed`, `repair_abandoned`, `repair_returned_after_failure`.
- Vars: `game_difficulty_persistence` exact; `failure_recovery_score`
  missing.
- Manifestation: repair difficulty module (solvable after support). Systems
  Repair room.
- **Coverage: FULLY EMBODIED.**
- Missing/Proposal: none.
- Invariance: difficulty standardisation frozen (default sequence always
  fails; manual-guided succeeds).
- Tests: route 4 unchanged.

### Q22 — Persistence Despite Difficulty (PDD-03, positive)

- Spec: support consulted AND applied — next action must reflect the
  information. Strong analogue with reading controls.
- Events: `archive_feedback_used`, `repair_manual_used`,
  `manual_page_reviewed`, `archive_strategy_revision`,
  `repair_strategy_revision` (guided-success semantics enforce "applied").
- Vars: `manual_or_feedback_used` missing; `strategy_revision_count` exists
  but mixes in `hazard_info_checked` (construct-mixing — D2 sub-item 1).
- Manifestation: manual station + feedback loop, application enforced by
  mechanics. Archive + Repair rooms.
- **Coverage: FULLY EMBODIED.**
- Missing/Proposal: none (D2 fixes the variable, not the gameplay).
- Invariance: guided-only revision semantics frozen.
- Tests: routes 4 and archive specs unchanged.

### Q23 — Persistence Despite Difficulty (PDD-05, positive)

- Spec: adaptive retries distinguished from identical repetition. Strong
  analogue.
- Events: `archive_strategy_revision` (known listing divergence: registration
  carries Q13/Q22/Q26 — catalogued), `repair_strategy_revision`,
  `archive_same_wrong_code_repeated`, `repair_same_sequence_repeated`.
- Vars: `adaptive_retry_count`, `blind_retry_count` (exact),
  `strategy_revision_count` (mixed, D2).
- Manifestation: both retry qualities observable in both difficulty modules.
- **Coverage: FULLY EMBODIED.**
- Missing/Proposal: none.
- Invariance: identical-repetition comparison stays immediately-previous-only
  (repair) — a documented semantic, not to drift.
- Tests: unchanged.

### Q24 — Persistence Despite Difficulty (PDD-04, positive)

- Spec: independent post-setback re-engagement in Repair, replicating Q13's
  Archive episode without double-counting (cross-task convergence). Strong
  analogue.
- Events: `repair_abandoned`, `repair_returned_after_failure` (construct_id
  deliberately unset — D4), plus archive counterparts.
- Vars: `post_setback_completion_score`, `setback_reengagement_rate` —
  missing.
- Manifestation: leaving after failure and re-entering is a real navigable
  act. Systems Repair (+ Archive) rooms.
- **Coverage: FULLY EMBODIED** (D4 is a tagging decision, not a gameplay
  gap).
- Missing/Proposal: none; D4 stop stands.
- Invariance: abandonment fires on exit-after-failure-incomplete only.
- Tests: unchanged.

### Q25 — Persistence Despite Difficulty (PDD-02, positive)

- Spec: re-engagement or non-return after leaving a difficult task; strategic
  pause-and-return allowed; only no-return-with-unresolved counts against.
  Moderate analogue.
- Events: `archive_returned_after_failure`, `repair_returned_after_failure`,
  abandonment counterparts (D4 construct pending).
- Vars: `reengagement_after_failure`, `abandonment_after_failure_count`
  (current implementation counts legacy `hazard_avoidance` only — mis-wired;
  D2-family correction), `difficult_task_completion_rate` missing.
- Manifestation: shared with Q24 module; end-of-session unresolved state
  visible via Final Core flags.
- **Coverage: FULLY EMBODIED** (gameplay); scoring wiring notably wrong
  pending D2/D4.
- Missing/Proposal: none.
- Invariance: as Q24.
- Tests: unchanged.

### Q26 — Inappropriate Persistence (IP-02, maladaptive-positive)

- Spec: identical failed action repeated after explicit feedback; debounced;
  separate from adaptive persistence always. Strong maladaptive analogue.
- Events: `archive_same_wrong_code_repeated`, `repair_same_sequence_repeated`.
- Vars: `blind_retry_count` exact; `game_inappropriate_persistence` exact
  name (4th term addition = D2 sub-item 2).
- Manifestation: resubmitting the same wrong code/sequence is a real,
  distinct act in both modules.
- **Coverage: FULLY EMBODIED.**
- Missing/Proposal: none.
- Invariance: valence separation absolute (approved decision 4).
- Tests: unchanged.

### Q27 — Inappropriate Persistence (IP-01, maladaptive-positive)

- Approved analogue (settled decision): **continuation after an explicit
  utility-stop / no-additional-benefit signal**. Hazard recklessness is NOT
  the Q27 analogue (Hazard stays prudence).
- Present state: the live tree still tags `hazard_reckless_continue` with
  Q27 (superseded rationale; SA-1 decides whether the tag stays) and feeds
  `uncertainty_inappropriate_count`. No utility-stop experience exists.
- Vars (approved-analogue): `excess_continuation_count`,
  `no_point_persistence_flag` — CANDIDATES, nothing wired.
- **Coverage: ABSENT** for the approved analogue; contested superseded
  telemetry present (explicitly not removed or reinterpreted here — SA-1's
  call).
- Missing experience: an explicit, credible "further cycles provide no
  additional benefit" signal followed by a free choice to keep cycling or
  stop.
- Proposal (Phase 4, SA-2-gated): after the Side Repair `run_check` succeeds
  (or at a small diagnostic console in the bay), the console states plainly
  that the system is stable and further check cycles will add nothing; the
  panel then still offers "run another check cycle" alongside "close the
  work order". Repeat cycles are debounced, each an explicit chosen act
  (`utility_stop_signal`, `unnecessary_cycle_started/_completed`,
  `task_stopped_appropriately` — all CANDIDATE per spec). Curiosity
  minimised by stating no new information will result. **Stops for SA-2
  (module + events + scoring feed) before any code.**
- Invariance: existing side-repair events/moments untouched; the stop signal
  must be unambiguous (Q28-grade comprehension evidence rules apply).
- Tests: (post-ruling) signal shown exactly once before window opens; cycle
  debounce; stop path never penalised in any surfaced feedback.

### Q28 — Inappropriate Persistence (IP-03, maladaptive-positive)

- Spec: forcing a blocked action after an explicit blocker statement AND an
  available valid alternative; window opens only after evidenced
  understanding. Strong maladaptive analogue.
- Events: `final_core_blocker_shown`, `unresolved_issue_reviewed`,
  `issue_resolution_attempted`, `final_core_issue_resolved`,
  `final_core_force_continue` (raw; summary term = D2 sub-item 2).
- Vars: `force_continue_count`/`blocker_ignored_count` — missing pending D2.
- Manifestation: blocker card with real resolution alternative and a distinct
  force option, only while issues are outstanding. Final Core room.
- **Coverage: FULLY EMBODIED.**
- Missing/Proposal: none.
- Invariance: force option's conditional appearance frozen.
- Tests: route 9 unchanged.

### Q29 — Goal-Time Preference (GTP-01, long-term pole) — exploratory

- Approved analogue (settled): balanced immediate-vs-distributed goal-horizon
  choice — matched effort/value/difficulty, options never labelled
  short/long-term, initial choice logged **before** any interruption; shares
  ONE dimension with Q31 (one choice is never two observations).
- Present state: live tags sit on `stabiliser_option_offered` /
  `stabiliser_accepted` / `final_core_stability_bonus`
  (`delayed_benefit_investment` family) — the superseded rationale SA-3
  exists to rule on. No balanced horizon choice exists.
- **Coverage: ABSENT** for the approved module; contested telemetry present.
- Missing experience: the balanced work-order choice itself.
- Proposal (Phase 5, SA-3-gated): a planning terminal (Hub operations board
  or a Kai planning option) offers two work orders of matched total effort
  and stated value: one self-contained with immediate closure, one split
  across stations with closure at the end; neutral copy, no time labels,
  counterbalanced order across sessions; placed on the route so the choice
  commits before the Corridor beacon can fire; a second, differently skinned
  instance later is **required** — every session gets two valid
  counterbalanced goal-horizon opportunities. CANDIDATE events per spec
  (`horizon_choice_offered`, `option_details_viewed`,
  `immediate_goal_selected`, `distributed_goal_selected`,
  `distributed_goal_revisited`, `distributed_goal_completed`); ONE shared
  variable (`goal_horizon_preference`) for Q29+Q31. **Stops for SA-3.**
- Invariance: existing side-repair/final-core events keep firing unchanged;
  no participant-facing wording may hint at time horizons or the construct.
- Tests: (post-ruling) choice logged before interruption; matched-option copy
  audit; single-variable assertion; keyboard/mouse parity.

### Q30 — Goal-Time Preference (GTP-03, small-goal pole) — exploratory

- Approved analogue (settled): repeated balanced choices between several
  independently closable smaller objectives and one integrated objective;
  ≥2 valid opportunities before any pattern; NEVER inferred from
  carelessness, skipped preparation, or Hazard.
- Present state: live tags on `inventory_verified_complete` /
  `inventory_verification_skipped` (`short_term_shortcut_count`) — exactly
  the prohibited inference; SA-4 exists to rule on removal. No granularity
  choice exists.
- **Coverage: ABSENT** for the approved module; contested telemetry present.
- Missing experience: the work-order-structure choice, twice.
- Proposal (Phase 5, SA-4-gated): at the Quartermaster Console (and a second
  instance at another station), the participant chooses how to take on a
  bundle of prep/maintenance work: as several small independent orders each
  closable on its own, or as one integrated order closing all at once —
  matched total effort/benefit/difficulty, neutral copy. CANDIDATE events
  (`goal_structure_choice_offered`, `small_goal_set_selected`,
  `integrated_goal_selected`, completion counterparts); indicator
  `goal_granularity_preference` CANDIDATE. **Stops for SA-4.**
- Invariance: existing inventory flow and events untouched; the choice must
  restructure presentation of the same work, never change its amount.
- Tests: (post-ruling) ≥2 opportunities per session; balance audit; no
  carelessness-derived inference anywhere.

### Q31 — Goal-Time Preference (GTP-04, short-term pole) — exploratory

- Approved analogue: the SAME shared goal-horizon module as Q29 — opposite
  pole, one variable, never two observations from one choice.
- Present state: live tags on `hazard_informed_continue` /
  `hazard_reckless_continue` (`risky_shortcut_count`) — superseded (Hazard is
  prudence); SA-3's scope.
- **Coverage: ABSENT** (approved module); contested telemetry present.
- Everything else: identical to Q29 (Phase 5, SA-3-gated, shared variable).

### Q32 — Goal-Time Preference (GTP-02, long-term; NOT reverse-scored) — QUESTIONNAIRE-PRIMARY

- Approved treatment (settled): **no separate question or minigame** —
  derived only from selecting/sustaining/completing extended distributed
  objectives across ≥2 valid horizon opportunities; no distinct Q32 score.
- Present state: weak-proxy tags on `side_repair_completed` /
  `final_bonus_unlocked` (SA-5 confirms or trims them);
  `optional_future_benefit_score` intentionally not implemented.
- **Coverage: TELEMETRY-ONLY — by design.** The SA-3 horizon module only
  makes the derived treatment technically possible (its `distributed_goal_*`
  events are Q32's intended inputs); the treatment remains blocked until
  SA-5 is ruled.
- Missing experience: none permitted. No proposal. SA-5 stop stands.
- Tests: absence tests — no Q32-specific surface may ever appear.

### Q33 — Goal-Time Preference (GTP-05, short-duration pole) — QUESTIONNAIRE-PRIMARY

- Approved treatment (settled): end-of-session portfolio of **self-selected**
  short vs distributed completions from the Q29-Q31 modules; required short
  tasks excluded; NEVER inferred from Final Core rushing, poor quality, or
  unresolved issues; no direct claim.
- Present state: live tags on `final_core_issue_resolved` /
  `final_core_rushed` / `final_core_completed`
  (`rush_to_finish_count`/`delayed_finalization_score`) — exactly the
  prohibited inference; SA-6 exists to rule (blocked behind SA-3/SA-4).
- **Coverage: ABSENT** for the approved portfolio basis (its inputs don't
  exist until the SA-3/SA-4 modules land); contested telemetry present.
- Missing experience: none of its own — the SA-3/SA-4 modules only make the
  portfolio technically derivable; derivation remains blocked until SA-6 is
  ruled. No separate mechanic permitted. SA-6 stop stands.
- Tests: absence tests as Q32.

## 7. Coverage roll-up

| Class                      | Items                                                                                                                       | Count |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----- |
| FULLY EMBODIED             | Q01 Q02 Q04 Q07 Q09 Q10 Q11 Q12 Q13 Q14 Q15 Q16 Q17 Q19 Q21 Q22 Q23 Q24 Q25 Q26 Q28                                         | 21    |
| PARTIALLY EMBODIED         | Q03 (retrieval episode) Q06 (required framing + process capture) Q08 (single context; idle blocked) Q20 (staged arc absent) | 4     |
| TELEMETRY-ONLY             | Q18 (module absent) Q32 (**by design**)                                                                                     | 2     |
| ABSENT (approved analogue) | Q05 (D7-blocked) Q27 (SA-2) Q29 (SA-3) Q30 (SA-4) Q31 (SA-3) Q33 (SA-6, derived)                                            | 6     |

Every ABSENT row except Q05 carries live **contested** telemetry from a
superseded rationale — structural traceability that must not be mistaken for
embodiment, and equally must not be deleted without its SA ruling.

## 8. Gap registers

### 8.1 Missing minitasks (proposed, all decision-gated per §6)

1. Prepared-tool retrieval micro-step at the Repair Panel (Q03; canonical
   event exists; observed moment approved per NEXT-09-OD-3).
2. Goal-horizon work-order choice, two counterbalanced instances (Q29/Q31;
   SA-3).
3. Goal-granularity work-order structure choice, ≥2 instances (Q30; SA-4).
4. Utility-stop diagnostic cycles after side-repair check (Q27; SA-2).
5. Objective-confirmation briefing act + initiation window (Q05, Q08; D7,
   D3).
6. Background three-stage calibration arc, optional (Q18; event-schema
   decision; questionnaire-primary).
7. Anomaly-investigation staged arc, optional, lowest priority (Q20;
   event-schema decision; questionnaire-primary).

### 8.2 Missing objects / inventory items

- Operations/planning board (Hub) or Kai planning console entry — hosts 8.1.2
  and the duty roster confirmation (8.1.5).
- Second granularity-choice surface at a non-inventory station (8.1.3).
- Diagnostic console (or extended Utility Bot console stage) in the Side
  Repair Bay (8.1.4).
- Calibration rig props for three bench stages (8.1.6); anomaly sensor object
  (8.1.7).
- Icons for all of the above via the existing `proc-*`/`proc-icon-*`
  procedural foundry only (frozen manifest discipline; external 97-candidate
  pack remains `NOT_GENERATED`).
- No new registry inventory items are required; the 8-item registry and
  single-carry model are sufficient for every proposal. (Q03 reuses packed
  items; nothing new to carry.)

### 8.3 NPC roster plan

Current roster: §5.3. Additions proposed (all placeholder-tier, procedural):

- **Quartermaster Vale becomes interactive** — hosts the granularity choice
  (8.1.3 first instance) and keeps all existing console functions unchanged
  (console remains the legacy path; Vale is additive). Optional per SA-4
  design ruling.
- **No other new NPCs.** The horizon choice and confirmation act live on
  terminals or existing Kai dialogue to avoid new-dialogue sprawl; the
  Utility Bot hosts the utility-stop stage. Kai, Utility Bot, Station AI and
  all existing dialogue trees are otherwise frozen.

### 8.4 Scoring/documentation gaps recorded (not gameplay; owned elsewhere)

D2 family (mixed `strategy_revision_count`, `game_inappropriate_persistence`
4th term, `final_quality_score` shape, exploratory-label mechanism,
`abandonment_after_failure_count` mis-wire), SA-7 labels, SA-8 accuracy
registration, D4/D5/D6/D7 mappings, matrix staleness (F-3), schema gap (F-4).

## 9. Design rules binding every §10 phase

- **Research neutrality:** no validated Q01-Q33 wording, no construct labels,
  no moral/short-vs-long-term/quality labels in any participant-facing text;
  no praise/blame; identical acknowledgements across branches; icons are
  identity only, never validity (NEXT-08 rules carry forward in full).
- **Presentation:** every new surface uses the canonical card panel via
  `renderPromptStage` (+ optional NEXT-08 `presentation` task surfaces with
  redundant activators). Zero-new-copy does NOT carry forward — new modules
  need new strings — but every new string passes wording review against the
  battery and construct vocabulary before commit.
- **Keyboard and mouse:** full parity (hover/click ≡ arrows+Enter), hidden
  1-9 retained, visible non-colour-only focus, no drag, no timers, no
  flashing, no text entry, readable at 800×600. Movement stays
  keyboard-only.
- **Persistence rules:** new module state lives in SessionState (or
  module-scope mirrors like inventory's) and survives room re-entry;
  one-shot semantics — horizon choice commits once per instance (logged
  before any interruption); granularity instances each commit once;
  utility-stop cycles repeatable but debounced; deferral vs abandonment
  distinguishable wherever both exist; no state resets on re-entry.
- **Repetition rules:** Q30 needs ≥2 instances; Q29/Q31 require two valid
  counterbalanced instances of the one shared choice — never counted twice
  across items; Q27 cycles debounced; no artificial waiting anywhere (Q18
  stages unlock on progress, never time).
- **Participant burden:** the required NEXT-09 additions together target no
  more than approximately 8-10 added median minutes, pending pilot
  calibration; the Q18/Q20 arcs remain optional and non-blocking and sit
  outside this required-time budget.
- **Telemetry invariance:** every existing event name, payload key, metadata
  key, emission moment, one-shot guard, route gate
  (`final_core_blocked_pending_decisions` + pilotRoute state), scoring
  boundary, frozen wording, mapping, and DEV probe is preserved bit-for-bit.
  New events appear only after an explicit event-schema decision and are
  enumerated in an allowlist per phase; UI interactions (hover/focus/
  panel-open) never log.
- **Opportunity/choice/process/outcome/control separation** and
  no-opportunity coding per spec §8.2 apply to every new module.

## 10. Phased commit plan (each phase: one approval, one commit, stop)

Ordering: documentation truth first, then the one gap closable with an
already-canonical event, then SA-gated modules by scientific priority.
Phases 3-8 each begin with a **research-owner decision checkpoint** — if the
ruling does not arrive, the phase does not start; nothing is coded "pending".

- **Phase 0 (no commit):** worktree + branch from current HEAD; LF checkout;
  baseline capture — full Playwright suite green; scripted Route G baseline
  event capture (§11.4) stored for comparison.
- **Phase 1 — matrix truth-up (docs only):** refresh the hand-authored rows
  of `docs/research/research-traceability-matrix.json` (+ md companion) to
  match `d4d9bf1` reality (F-3): per-item inventory events, side-repair
  steps, `engineer_report_accuracy_scored` emission status; run validator
  `--write` from an LF checkout + prettier. Authorised files:
  `docs/research/research-traceability-matrix.json`,
  `docs/research/RESEARCH-TRACEABILITY-MATRIX.md`, and
  `docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md` (recording the §13
  NEXT-09 dispositions). No source, event-mapping, or scoring change of any
  kind; no mapping is added, removed, or promoted — recording emission
  reality and decision dispositions only. Gate: validator green; `git diff`
  touches only the three authorised files.
- **Phase 2 — Q03 retrieval episode (NEXT-09-OD-3 approved; emission
  definition fixed in §13):** the §6-Q03 micro-step; emits only the
  already-canonical, already-registered `prepared_tool_used`. Focused specs
  - Route G (kit-less replay must be 0-diff; kit-packed replay adds exactly
    one allowlisted event).
- **Phase 3 — SA-1/SA-3/SA-4/SA-5/SA-6 retag execution (docs+code, only as
  explicitly ruled):** whatever the research owner rules for the contested
  tags (Q27 hazard — SA-1; Q29/Q31 stabiliser/hazard — SA-3; Q30
  verification — SA-4; Q32 side-repair weak-proxy — SA-5; Q33 final-core —
  SA-6) is applied verbatim and only as explicitly ruled — this contract
  pre-authorises nothing.
- **Phase 4 — Q27 utility-stop module (SA-2):** §6-Q27 proposal.
- **Phase 5 — goal-horizon + goal-granularity modules (SA-3 + SA-4):**
  §6-Q29/Q30/Q31 proposals; landing these modules only makes the Q32/Q33
  derived treatment technically possible — it remains blocked until SA-5/
  SA-6 are ruled; no surface of their own, ever.
- **Phase 6 — Q05 initiation window (D7 + D3):** §6-Q05 proposal.
- **Phase 7 — optional questionnaire-primary arcs (own event-schema
  decisions):** Q18 background calibration; Q20 anomaly arc. Explicitly
  skippable; questionnaire-primary items lose nothing if never built.
- **Phase 8 — docs closure:** room docs, UI-PRESENTATION-CONTRACT addendum,
  manual-routes additions (§11.3), verification record, matrix `--write`.
- NEXT-09-OD-1 is resolved framing-only (§13): the duty-roster framing
  change (Archive/Systems Repair listed as assigned duties — skippable,
  omissions observable at Final Core, four-scenario gate unchanged) lands in
  its own approved pass; route-gate extension is not an option under this
  contract.

## 11. Verification

### 11.1 Focused gates (every commit)

`npm.cmd run lint:tsc`; `npm.cmd run build`; validator (LF checkout);
`git diff --check`; phase-focused Playwright specs (extended, never
weakened); eslint when practical. A green build is necessary, never
sufficient — `playwright-game-verify` runtime evidence per phase.

### 11.2 Full-suite gates

Entire Playwright suite green at Phase 0 (baseline), after Phase 2, after
each SA-gated module phase, and at final state. Reviewer cadence:
`research-data-reviewer` after every phase touching events/mappings/matrix;
`gameplay-implementation-reviewer` after every room change;
`browser-qa-reviewer` on every "done" claim; all three at final.

### 11.3 Manual acceptance routes

Routes 1-11 in `docs/game/UI-MANUAL-ACCEPTANCE-ROUTES.md` remain valid and
unchanged. New routes added as their phases land:

- Route 12 (Phase 2): kit-packed session — repair tool-retrieval step
  appears; retrieval from the stored location plus first application to the
  repair logs `prepared_tool_used` once (never on opening, selection,
  display or carrying); kit-less session — panel byte-identical to baseline.
- Route 13 (Phase 4): utility-stop — signal card shown after successful
  check; run 2 extra cycles then stop (events debounced); fresh session:
  stop immediately (no penalty wording anywhere).
- Route 14 (Phase 5): horizon choice — both required instances present, both
  orders (counterbalance), first instance commits before entering the
  Corridor; verify one shared choice event only; distributed path
  revisit/completion events.
- Route 15 (Phase 5): granularity choice ×2 — small-set and integrated paths;
  matched-effort audit against the copy.
- Route 16 (Phase 6): confirmation act — window opens once; reading manual
  first does not count as avoidance.
- Route 17 (Phase 7): background calibration stages unlock by progress only;
  Final Core flag non-blocking. Anomaly arc stage utility statements present.
- Route 18 (all phases): keyboard-only and mouse-only completion of every
  new surface with identical event streams (extends routes 10/11).

### 11.4 Final automated telemetry-comparison route (Route G)

Scripted Playwright route replay (position-synced driving per the
established probe method) covering: tutorial → all four scenarios → archive →
repair → engineer prepared report + duty → inventory per-item prep +
cleanup → hazard informed path → side repair complete → interruption
switch-and-return → final core resolve+complete. Captured ordered event
stream (names + payload keys + metadata keys) compared against the Phase 0
`d4d9bf1` baseline:

- On a replay avoiding all new modules: **zero diffs** (byte-compatible).
- On a replay exercising new modules: diffs must be exactly the per-phase
  allowlisted new events, in their contracted positions; every pre-existing
  event identical in name, payload keys, and relative order.
- Run after Phase 2, after each module phase, and at final state; any other
  diff stops the line.

## 12. Preservation invariants (explicit freeze list)

Event names & payloads (all §5.2 emissions incl. legacy aliases, scenario\_\*
family, gate event); `CanonicalEventContext` registrations (except as ruled
in Phase 3); ScoringManager formulas & `GameSummaryVariables` fields (D2
owns changes); SessionState/pilotRoute gate semantics; EventLogger,
QualtricsBridge, DataQualityTracker, ResearchRuntime; all frozen participant
copy incl. scripted failure codes and instruction line; stimulus freeze
(`outpost-assets-v3`; any asset addition = single end-of-line version bump
with no participant data from intermediates); all DEV probes (§5.4) and the
debug API; hidden 1-9 shortcuts; ESC/pause semantics; no-Escape-dismiss on
assessment prompts; Interruption Corridor's deliberate no-side-panel; SA-11's
withheld requisition display; scenario consoles' unenriched card panels
(NEXT-08 scope boundary); `Main.tsx` prototype untouched and off-route.

## 13. Open decisions

Existing (blocking, unchanged, never resolved here): SA-1..SA-11, D2..D8,
INT-1..INT-6, UD-HAZARD-CONSEQUENCE, spec-§8.2 principles (no-opportunity
coding, debouncing, first-vs-final response, deferment definition,
incomplete-session handling). D1 resolved 2026-07-12 and held verbatim.

New, raised by this audit. Dispositions are recorded below and are mirrored
into the SCIENTIFIC-AUTHORITY register in Phase 1's docs pass:

- **NEXT-09-OD-1 — RESOLVED (framing-only).** Archive and Systems Repair
  become assigned duties on the participant duty roster; they remain
  skippable; omissions remain observable at Final Core; the existing
  four-scenario Final Core gate remains unchanged. Route-gate extension is
  removed as an option under this contract.
- **NEXT-09-OD-2 — APPROVED (documentation-only).** The `scenario_*` family
  and `final_core_blocked_pending_decisions` are documented in
  event-schema.md's raw unmapped-telemetry section as emitted reality, with
  no study-item mapping and no scoring promotion of any kind.
- **NEXT-09-OD-3 — APPROVED.** `prepared_tool_used` fires exactly once, and
  only when a previously packed task-relevant tool is retrieved from its
  stored location and first applied to the Systems Repair task — never on
  container opening, item selection, display, or carrying. A session with no
  qualifying packed tool is a no-opportunity state.

## 14. Contract completion definition

This contract is complete when: (a) this document is committed on
`fable-next-09-q01-q33-coverage-contract-v1` with no other file changed;
(b) the research owner has been shown §7's roll-up, §8's gap registers, and
§13's new open decisions. Implementation completion is defined per phase in
§10/§11 and requires per-phase approval; no phase is authorised by this
document's existence.
