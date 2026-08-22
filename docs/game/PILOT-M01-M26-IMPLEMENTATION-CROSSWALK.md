# Pilot M01–M26 implementation crosswalk

Branch `fable-professional-assessment-pilot-v1` · foundation merge `9980ea6`
(parents `8aae78e` field actions, `35065f9` information processing; common
ancestor `eb87bd9` interactive inventory). Unit 1 of the professional pilot
mission. **Implementation crosswalk — not a scientific ruling.** Revised after
the read-only scientific review (Round 1: three blockers, twelve majors, eight
minors corrected or recorded below; §6 lists the review trail).

## 0. Status of every statement in this document

- Every opportunity, event family, raw variable and form named below is
  **provisional** (`proto_*`), theory-driven and **not empirically
  validated**. Nothing here is a canonical event name
  (`docs/research/event-schema.md`), an approved formula
  (`docs/research/scoring-plan.md`), a trait score or a validated item score.
- **Item identity is provisional for every scheduled opportunity.** The
  M01–M26 battery is the "26-measure developmental battery" referenced in
  the action-assessment rebuild; **its exact adopted item wording is not
  recorded anywhere in this repository** except as module header comments —
  BESSI Information Processing wording for M13–M18
  (`src/informationProcessing/m13PipeNetwork.ts` … `m18FaultDiagnosis.ts`) and
  battery descriptions for M13/M18/M22–M26 (`src/measurement/m13PipePuzzle.ts`,
  `m18Diagnosis.ts`, `m22Setback.ts` … `m26DepletedField.ts`). Those headers
  were written by the implementing units themselves (circular provenance),
  and the M13/M18 slots carry **two conflicting texts**; therefore the binding
  of BESSI IP items to slots M13–M18 — **all six slots** — is an assumption
  labelled `itemIdentity: 'module_header'` in the coverage schedule, not a
  ruling. The M↔Q crosswalk and the M↔item binding are **open research-owner
  decisions** (`docs/verification/ACTION-ASSESSMENT-REBUILD-REPORT.md` §4,
  §10; `docs/verification/FIELD-ACTIONS-FOUNDATION-REPORT.md` §20). No item
  definition below is inferred from its identifier; where wording is absent
  the item is marked accordingly.
- The inventory foundation's `M02`/`M03` identifiers collide with the
  historical M-numbering (inventory report finding **INV-SCI-1**, open). The
  mission brief adopts "M02 = controlled filing/reference task, M03 =
  standardised disorder/reset occasions" **for the pilot route only**
  (`itemIdentity: 'mission_brief'`); the export carries the identity-basis
  field so the pilot data never asserts an M-number the repository
  contradicts.
- Governing authority applied: `CLAUDE.md` hierarchy;
  `docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md` §13 global ruling
  (item-specific primary opportunity / window / family / variable; no raw
  event in two primaries; carryover firewall; standardised or counterbalanced
  entry state; missing ≠ low; Q29/Q31 the sole authorised shared exception)
  and §14 SA-13; the NEXT-09 separation plan §§11–13. These are applied **by
  analogy** to the M battery because no M-specific ruling exists; the analogy
  is itself flagged (§5, D-X-1) and every finding below must be re-read if the
  research owner replaces it.
- Review-finding identifiers are qualified by their source report:
  `INV-SCI-n` = `docs/verification/INVENTORY-FOUNDATION-REPORT.md`;
  `FA-SCI-n` = `docs/verification/FIELD-ACTIONS-FOUNDATION-REPORT.md`;
  `IP-…` = `docs/verification/INFORMATION-PROCESSING-FOUNDATION-REPORT.md`;
  `REV-…` = the Unit 1 scientific review of this document (§6).

## 1. Summary table (one row per item)

| Item    | Source (as recorded in repo)                                                                        | Identity basis | Participant-route status              | Selected route-primary opportunity (id)                       | Route location                               | Duplicates disabled on the participant route                                                                                                                           |
| ------- | --------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------- | ------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M01     | wording not recorded                                                                                | none           | QUESTIONNAIRE-PRIMARY                 | none                                                          | —                                            | — (ambient inventory tidiness never used)                                                                                                                              |
| M02     | inventory unit contract "controlled filing/reference" (INV-SCI-1 open)                              | mission_brief  | PRIMARY-CANDIDATE                     | `proto_m02_incident_filing`                                   | Concourse › Records & Logistics              | none other                                                                                                                                                             |
| M03     | inventory unit contract "standardised disorder/reset" (INV-SCI-1 open)                              | mission_brief  | PRIMARY-CANDIDATE                     | `proto_m03_reset_a` + `proto_m03_reset_b` (matched occasions) | Concourse › Records & Logistics              | none other                                                                                                                                                             |
| M04     | wording not recorded                                                                                | none           | QUESTIONNAIRE-PRIMARY                 | none                                                          | —                                            | legacy Q04 cleanup module stays dev-only (Q battery)                                                                                                                   |
| M05–M12 | wording not recorded (tier-6 note only)                                                             | none           | MISSING                               | none                                                          | —                                            | —                                                                                                                                                                      |
| M13     | BESSI IP "Solve puzzles." / battery "constrained physical puzzle" (conflict)                        | module_header  | PRIMARY-CANDIDATE                     | `proto_m13_lattice_construction` (pipe board overlay)         | Diagnostics & Signal Laboratory              | Pump House manifold trench `proto_m13_*` (dev alias `pump_house` only)                                                                                                 |
| M14     | BESSI IP "Handle a lot of information."                                                             | module_header  | PRIMARY-CANDIDATE                     | `proto_m14_packet_saturation`                                 | Diagnostics & Signal Laboratory              | none other                                                                                                                                                             |
| M15     | BESSI IP "Make sense of complex information."                                                       | module_header  | PRIMARY-CANDIDATE                     | `proto_m15_layered_cipher`                                    | Diagnostics & Signal Laboratory              | none other                                                                                                                                                             |
| M16     | BESSI IP "Process new information."                                                                 | module_header  | PRIMARY-CANDIDATE                     | `proto_m16_protocol_update`                                   | Diagnostics & Signal Laboratory              | none other                                                                                                                                                             |
| M17     | BESSI IP "Learn things quickly."                                                                    | module_header  | PRIMARY-CANDIDATE                     | `proto_m17_syntax_acquisition`                                | Diagnostics & Signal Laboratory              | none other                                                                                                                                                             |
| M18     | BESSI IP "Find logical solutions to problems." / battery "evidence-consistent diagnosis" (conflict) | module_header  | PRIMARY-CANDIDATE                     | `proto_m18_lattice_fault_diagnosis` (diagnosis console)       | Diagnostics & Signal Laboratory              | Pump House `proto_m18_pressure_diagnosis` (dev alias only; its event renamed `proto_m18_pressure_fault_presented` so the route family `proto_m18_fault_*` is disjoint) |
| M19–M21 | wording not recorded (tier-6 note only)                                                             | none           | MISSING                               | none                                                          | —                                            | —                                                                                                                                                                      |
| M22     | battery "recovery after an explained standardized setback"                                          | module_header  | PRIMARY-CANDIDATE (new host instance) | `proto_m22_housing_seal_setback`                              | Exterior Recovery Yard                       | Pump House/Coolant Yard host `proto_m22_seal_setback` (dev alias only)                                                                                                 |
| M23     | field-actions "useful persistence on a hard but attainable extraction"                              | module_header  | PRIMARY-CANDIDATE                     | `proto_m23_field_recovery`                                    | Exterior Recovery Yard                       | Coolant Yard `proto_m23_frozen_coupling` (dev alias `coolant_yard` only)                                                                                               |
| M24     | field-actions "continuation after an explicitly understood transition to zero benefit"              | module_header  | PRIMARY-CANDIDATE (deck correction)   | `proto_m24_magnet_utility`                                    | Exterior Recovery Yard › Metal Recovery Yard | Coolant Yard recycler `proto_m24_*` (dev alias only); ice-bore free play stays locked                                                                                  |
| M25     | battery "unchanged repetition after a salient mechanical lock"                                      | module_header  | PRIMARY-CANDIDATE (new host instance) | `proto_m25_yardpump_interlock`                                | Exterior Recovery Yard                       | Pump House host `proto_m25_pump_interlock` (dev alias only)                                                                                                            |
| M26     | field-actions "continued search after verified knowledge that a bounded area is depleted"           | module_header  | PRIMARY-CANDIDATE                     | `proto_m26_depleted_search`                                   | Exterior Recovery Yard                       | Coolant Yard `proto_m26_reclaimed_sector` (dev alias only)                                                                                                             |

Counts: 13 PRIMARY-CANDIDATE (M02, M03, M13–M18, M22–M26) · 2
QUESTIONNAIRE-PRIMARY (M01, M04) · 11 MISSING (M05–M12, M19–M21) · 0
SHARED-AUTHORISED · 0 SECONDARY-CONTEXTUAL as a route status · 0 BLOCKED.
No item has two route-primary opportunities. No raw event is primary evidence
for two items (§4). The Utility & Core Deck hosts **no measurement window**
(REV-BLOCK-2.3: end-of-session placement would confound M22/M25 departure
with session withdrawal); it carries the visible operational consequences,
the completeness review and the Final Core only.

Why M05–M12 and M19–M21 are MISSING rather than mapped: the only repository
statement about them is the historical rebuild report's line "M05-M12
preserved as existing canonical-room flows" / "M19-M21 preserved (existing
repair/archive persistence flows)" — a tier-6 historical note with no item
wording, no construct and no mapping rationale. Wiring legacy Q-battery rooms
into the M route on that basis would infer item definitions from identifiers
and re-host Q-primary events as M-primary events (ruling §§1, 6). They are
recorded as MISSING and routed to the research owner (§5, D-X-2).

## 2. Per-item implementation rows

Each block is the full row for the item. "Register" = `src/measurement/validity.ts`
opportunity record (SA-13 semantics); "coverage" = the pilot coverage
registry (`src/pilot/coverageSchedule.ts`, `pilotCoverage.ts`) that derives
`pending | open | completed | missing | invalid | censored | not_applicable`
from the register and never from performance.

Common rules stated once (apply to every PRIMARY-CANDIDATE row):

- **Technical failure** → `invalid (technical_failure)`; never behaviour.
- **Developer-scene exposure** in the same page session → every scheduled
  opportunity `invalid (contamination)` + note `contamination:developer_scene:<key>`
  (one semantics; REV-MAJ-3).
- **Final Core closure** (REV-MAJ-2): entered-unfinished → `censored`;
  declared-never-entered → `missing (participant_absent)`; never-declared
  (zone never reached) → declared then `missing (no_opportunity)`; terminal
  records never overwritten. **Missing is never a low value.**
- **Completeness review** at the Core names only never-entered windows whose
  schedule entry permits naming; departure-closed stopping-rule windows
  (M22, M24, M25, M26) are never named (REV-MAJ-9).
- **No evaluative content** in any NPC report beat (Kai/Vale/Noor debriefs
  are operational acknowledgements only — ruling §8; REV-MIN-7).
- **No visible timer or elapsed-time prompt** anywhere on the route (would
  contaminate every stopping measure).
- **Zone re-entry** is recorded as a control variable (`zone_reentry_count`);
  the Exterior keeps its dig/target registries at session scope so re-entry
  never re-buries a recovered object (REV-MAJ-10).

### M01

- Source / wording: not recorded (identifier only). Construct: not inferable.
- Activity: none on the route. Ambient backpack/storage organisation is
  **never** evidence (mission §9; ruling §11).
- All window fields: not applicable. Time: 0.
- Classification: **questionnaire-primary** (post-game Qualtrics).
- Decision: supply wording; decide whether any authorised opportunity exists.
- Status: **QUESTIONNAIRE-PRIMARY**.

### M02

- Source: inventory unit contract ("controlled filing/reference task");
  identity basis `mission_brief`; INV-SCI-1 open.
- Construct/facet (provisional): accuracy of filing under a reference.
- Activity: Incident Filing Workstation — 12 incident sheets on the intake
  desk, three case folders (IR-7, IR-12, IR-19), a consultable filing
  reference; drag/drop or keyboard; explicit **Commit filing**.
- Route location: Station Concourse › Records & Logistics.
- Opportunity `proto_m02_incident_filing`; window `m02_filing_window_1`;
  entry state `m02-incident-filing-v1`.
- Opening: first open of the workstation panel (`proto_m02_opportunity_opened`,
  `proto_m02_panel_opened`). Closing: Commit (`proto_m02_committed` →
  completed). Panel close without commit keeps the window open; reopen after
  commit is read-only (`proto_m02_reopened_after_commit`).
- Entry state: desk seeded with all 12 sheets, folders empty, reference
  available; identical except layout form.
- Counterbalance: `layout_a` / `layout_b`, deterministic per session id,
  recorded on register and every event.
- Raw variables: per-document final container, `misfiled_count`,
  `unfiled_count`, `untraceable_count`, `move_count`, `reversal_count`,
  `reference_view_count`, `elapsed_active_ms`, `input_mode` per act.
- Family `proto_m02_*`.
- Prior exposure: none required. Vale's briefing never sequences M02 before
  M03 and never mentions tidiness; M02 completion before an M03 occasion is
  recorded as a coded `prior_exposure` entry on that occasion (REV-MIN-6).
- Contamination: any copy instructing tidiness; cross-namespace inserts
  (structurally refused); sort in the m02 namespace (disabled).
- Missing/invalid: never entered → `missing (participant_absent)`; entered,
  never committed → `censored` at Final Core (REV-MIN-5); technical → `invalid`.
- Time: 2.0–3.0 min. Competing explanations: code-reading accuracy, interface
  familiarity, attention lapses, reference-consult habit.
- Classification: theory-driven provisional candidate; not validated.
- Decisions: INV-SCI-1 numbering; INV-SCI-3/9 process-count semantics; names.
- Status: **PRIMARY-CANDIDATE**.

### M03

- Source: inventory unit contract ("standardised disorder / reset occasions");
  identity basis `mission_brief`; INV-SCI-1 open.
- Construct/facet (provisional): restoring a disordered surface uninstructed.
- Activity: Press Stations A and B — three real press cycles each; cycle 3
  leaves five standardised residuals; a component store exists; tidying is
  never instructed; closing the panel is departure.
- Opportunity ids `proto_m03_reset_a`, `proto_m03_reset_b` (one opportunity,
  two matched instances; ruling §1 "repeated set"). Entry `m03-reset-v1`,
  `starting_condition = fixed_identical_layout`, residual slots [0,2,3,5,7].
- Opening: third press cycle (`proto_m03_opportunity_opened`). Closing: panel
  close (`proto_m03_surface_state_at_departure`, `proto_m03_window_closed` →
  completed).
- Counterbalance: form = occasion id; starting condition fixed by design
  (recorded); **instance order is self-selected and exported** as a control
  variable; the beacon never points at a press station before the other.
- Raw: `residual_moved`, `residual_stored`, surface/store state at departure,
  `elapsed_active_ms`, press-cycle count.
- Family `proto_m03_*`.
- Prior exposure: M02 or the other occasion recorded as coded entries.
- Contamination: any "clean up" instruction; cross-namespace transfers.
- Missing/invalid: third cycle never reached → `missing (participant_absent)`
  (or `censored` if entered); one occasion only → each instance coded
  separately, item status is a closure summary only (REV-MIN-2) —
  insufficient-opportunity coding is open (INV-SCI-4).
- Time: 1.5–2.5 min. Competing: reflexive close (INV-SCI-4), not noticing
  residuals, reading residuals as the product.
- Status: **PRIMARY-CANDIDATE**.

### M04

- Source: wording not recorded. No authorised defensible opportunity; never
  inferred from tidiness. Legacy Q04 cleanup module is a Q-battery opportunity
  in a dev-only room; not re-labelled.
- Status: **QUESTIONNAIRE-PRIMARY**. Decision: supply wording/mapping.

### M05 – M12

- Source: wording not recorded; tier-6 note only. No defensible mapping.
- Status: **MISSING** (no proxy invented). Decision D-X-2.

### M13

- Source: BESSI IP "Solve puzzles." (module header) / battery "solving a
  constrained physical puzzle" — conflict recorded; identity `module_header`.
- Activity: Conduit lattice bench (modal pipe board) — 3×3 mounts, fractured
  centre, standard nine-piece bench, feed/intake ports, drag/rotate/place or
  keyboard, explicit TEST FLOW (max 4 runs), STOP TASK.
- Route: Diagnostics & Signal Laboratory. Opportunity
  `proto_m13_lattice_construction`; entry `m13-lattice-v1:<form>`.
- Opening: board first opened. Closing: valid test flow → completed; 4th
  invalid run → exhausted (completed, raw outcome recorded); STOP → exited
  (`missing (participant_absent)`); technical → invalid.
- Entry state: empty board, full standardised bench, form-specific ports.
- Counterbalance: form A (W→E) / B (N→S), per session id.
- Raw: pieces_available, placements, moves, returns, rotations,
  placements_refused, constraints_satisfied_at_submission,
  open_branch_count_at_submission, endpoint_connected_at_submission,
  valve_inline_at_submission, submission_count, final_network_valid,
  active_ms, help_consults, window_status, invalid_reason, entry_state_id,
  form_id, input_mode, `ip_windows_opened_before` (control).
- Comprehension: **no comprehension record exists for M13** (nor M18);
  recorded as a gap (REV-MAJ-6) — open decision whether an inline check is
  added.
- Family `proto_m13_lattice_*`.
- Prior exposure: Pump House manifold (retired duplicate, dev alias only).
- Contamination: correctness previews (none exist); dev-scene exposure.
- Time: 2.0–3.0 min. Competing: spatial ability, pointer dexterity, puzzle
  familiarity.
- Decision: which M13 wording is adopted; names.
- Status: **PRIMARY-CANDIDATE**. Duplicate disposition: Pump House M13
  emitter reachable only via `?scene=pump_house`.

### M14

- Source: BESSI IP "Handle a lot of information." (module header).
- Activity: Packet intake terminal — 4 practice + 12 scored packets, three
  channels, URGENT override, drag chip→bin or typed command, explicit SUBMIT.
- Opportunity `proto_m14_packet_saturation`; entry `m14-packet-v1:<form>`.
- Opening: terminal opened after the common orientation. Closing: SUBMIT
  (completed; an incomplete first submission is warned, the second accepted)
  / STOP (`missing (participant_absent)`) / technical (invalid).
- Entry state: standardised packet form (quantity manipulation only); the
  **common terminal orientation** (`proto_ip_terminal_tutorial`) is a
  validity precondition: failed → `invalid (comprehension_failure)`;
  skipped → `invalid (invalid_entry_state)` + prior-exposure note. The
  orientation status is a **shared control variable inducing a known
  common-cause dependency across M14–M17** (REV-MAJ-6) and is exported with
  every decoder event as `tutorial_status`.
- Counterbalance: form A/B per session id; **decoder station layout** is
  counterbalanced per session (`ip_decoder_layout`: `layout_a` = M14, M15,
  M16, M17 left→right; `layout_b` = reversed) and the realised visit order
  is exported (REV-MAJ-7 / D-X-3).
- Raw: units_presented/processed/correctly_routed/misrouted/omitted/revised,
  revisions, channels_used, submission_complete, submission_count,
  command_sequence_length, pointer/typed commands, input_mode, active_ms,
  help_consults, window_status, invalid_reason, tutorial_status,
  ip_windows_opened_before. No motor-speed score.
- Family `proto_m14_packet_*`.
- Contamination: orientation not completed; dev-scene exposure.
- Missing/invalid: as closing/entry rules.
- Time: 1.0–1.5 min. Competing: typing speed, reading, interface learning.
- Status: **PRIMARY-CANDIDATE**.

### M15

- Source: BESSI IP "Make sense of complex information." (module header).
- Activity: Layered cipher workspace — six fragments, three link keys,
  codebook lookup, shift rule, PAIR/SHIFT commands, live reconstruction.
- Opportunity `proto_m15_layered_cipher`; entry `m15-cipher-v1:<form>`.
- Opening/closing/entry/comprehension/missing rules: as M14 (orientation
  precondition; SUBMIT / STOP / technical).
- Entry state: standardised fragment set per form. Counterbalance: form A/B
  per session; layout counterbalance as M14.
- Raw: rules_presented, relations_required/constructed/correct,
  rule_violations, command_sequence_length, revisions, codebook_consults,
  final_reconstruction_valid, final_message, submission_count, input_mode,
  active_ms, window_status, invalid_reason, tutorial_status,
  ip_windows_opened_before.
- Family `proto_m15_cipher_*`.
- Contamination: orientation not completed; M14 practice within the session
  (recorded via ip_windows_opened_before); dev-scene exposure.
- Time: 1.5–2.0 min. Competing: verbal reasoning, working memory, reading.
- Status: **PRIMARY-CANDIDATE**.

### M16

- Source: BESSI IP "Process new information." (module header).
- Activity: Protocol console — 3 base reports, READY, new rule revealed,
  ACKNOWLEDGE, 6 fresh reports (3 governed by the new rule), revision allowed,
  SUBMIT.
- Opportunity `proto_m16_protocol_update`; entry `m16-protocol-v1:<form>`.
- Opening/closing/comprehension/missing rules: as M14. Failure is never read
  as inability unless exposure was valid (orientation complete, rule
  presented and acknowledged — both recorded).
- Entry state: standardised base protocol + one new rule
  (`critical_override_hold`) per form. Counterbalance: form A/B per session;
  layout counterbalance as M14.
- Raw: base_protocol_complete, base_consistent, new_rule_id/presented/
  acknowledged, first_application(\_correct), final_applications_correct,
  applications_governed, new_rule_errors, revisions_after_rule_presentation,
  codebook_consults_after_rule_presentation, active_ms_after_ready,
  input_mode, submission_count, window_status, invalid_reason,
  tutorial_status, ip_windows_opened_before.
- Family `proto_m16_protocol_*`.
- Contamination: orientation not completed; dev-scene exposure.
- Time: 1.0–1.5 min. Competing: reading speed, rule-switching familiarity.
- Status: **PRIMARY-CANDIDATE**.

### M17

- Source: BESSI IP "Learn things quickly." (module header).
- Activity: Syntax trainer — own VEK/ZOR/KAI grammar, demonstration, READY,
  four matched feedback trials, one transfer trial, per-trial submission.
- Opportunity `proto_m17_syntax_acquisition`; entry `m17-syntax-v1:<form>`.
- Opening: trainer opened after orientation. Closing: fifth trial submitted
  (completed) / STOP (`missing (participant_absent)`, trials so far raw) /
  technical (invalid). Comprehension precondition as M14.
- Entry state: standardised demonstration and matched trials per form.
  Counterbalance: form A/B per session; layout counterbalance as M14.
- Raw per trial: trial_index, trial_type, commands_required/correct,
  semantic_errors, syntax_errors, corrections_before_submission,
  feedback_presented, help_consults, active_ms_after_ready, trial_complete,
  goal_reached, input_mode, final_register; plus trials_completed,
  tutorial_status. **No slope, trials-to-criterion or cutoff computed.**
- Family `proto_m17_syntax_*`.
- Contamination: orientation not completed; dev-scene exposure.
- Missing/invalid: as above.
- Time: 1.5–2.0 min. Competing: prior grammar-learning familiarity, typing.
- Status: **PRIMARY-CANDIDATE**.

### M18

- Source: BESSI IP "Find logical solutions to problems." (module header) /
  battery "evidence-consistent logical diagnosis" (conflict recorded).
- Activity: Diagnosis console — constant reference lattice, fault brief, four
  evidence panels (one neutral), three reversible tests, rules reference, four
  hypotheses with SELECT / RULE OUT, one SUBMIT DIAGNOSIS.
- Opportunity `proto_m18_lattice_fault_diagnosis`; entry `m18-fault-v1:<form>`.
- Opening: console opened — **sequencing only**: refused while the M13 window
  is `open`; available after the M13 window is solved, exhausted, stopped,
  **or was never opened** (REV-MAJ-5); never a performance gate.
- Closing: SUBMIT (completed) / STOP (`missing (participant_absent)`) /
  technical (invalid).
- Entry state: pure function of the M18 form (A leak / B supply restriction);
  `m13_dependency: 'none'`.
- Counterbalance: form A/B per session.
- Raw: evidence_panels_viewed, evidence_view_order, tests_run, test_order,
  rules_views, hypotheses_selected/rejected, hypothesis_revisions,
  contradictions_present_at_submission, final_diagnosis_id,
  final_solution_valid, submission_count, active_ms, help_consults,
  window_status, invalid_reason, ip_windows_opened_before, and
  **`prior_m13_window_status` — a prior-exposure control variable, barred
  from the M18 primary variable** (REV-MAJ-5).
- Comprehension: no comprehension record (as M13; REV-MAJ-6 gap).
- Independence: imports no M13 module; no M13 raw event reused; the legacy
  Pump House event `proto_m18_fault_presented` was renamed
  `proto_m18_pressure_fault_presented` so the route family `proto_m18_fault_*`
  is disjoint from every legacy literal (REV-MAJ-1; asserted by test).
- Family `proto_m18_fault_*`.
- Time: 1.5–2.5 min. Competing: reading, hypothesis-testing familiarity.
- Status: **PRIMARY-CANDIDATE**. Duplicate: Pump House
  `proto_m18_pressure_diagnosis` dev-only.

### M19 – M21

- Source: wording not recorded; tier-6 note only. Status: **MISSING**.
  Decision D-X-2.

### M22

- Source: `src/measurement/m22Setback.ts` — "recovery after an explained
  standardized setback" (module header; identity `module_header`).
- Activity (new host instance, Unit 5): **Relay housing** station in the
  Exterior Recovery Yard — seating the housing seal always produces the
  identical, explained, external setback (brittle batch seal cracks); a fresh
  seal is stocked in the **yard supply crate** at a fixed distance; the
  participant may fetch and seat it, or leave. Physical fetch (walk, pick up,
  return), not an answer card. Availability does **not** depend on M23 or any
  other window (firewall).
- Opportunity `proto_m22_housing_seal_setback` — a **fresh state container**
  created by the yard host from a factory (`createM22SetbackState()`),
  distinct from the legacy Pump House singleton (REV-BLOCK-3); entry
  `m22-housing-seal-v1`; host-specific explanation text names the yard crate
  (REV-BLOCK-2.2).
- Opening: setback revealed. Closing: seal seated → completed; **departure
  from the yard with the window open** → a third explicit terminal code
  `closed_departed_without_recovery` (recorded on the register as
  `invalid_reason: null`, `completed: false`, window detail
  `departed_without_recovery`), with exposure booleans `setback_shown`,
  `spare_seal_location_stated`, `crate_within_sight_line` and an **exit count**
  `yard_exits_during_window` (not a latch — never set when the participant
  returns and seats the seal); never `completed`, never `participant_absent`
  (REV-BLOCK-2). Whether this departure code may ever be treated as evidence
  of non-recovery is **D-X-4** — recorded, not resolved.
- Entry state: seal seating attempted at the housing; setback always on the
  first seating; spare seal always at the same crate; identical text.
- Counterbalance: none (fixed single form; rationale: one standardised
  setback is the manipulation); job order within the yard is counterbalanced
  (see §3).
- Raw: fix_attempted, setback_shown, spare_seal_fetched, seal_seated,
  yard_exits_during_window, closed, active_ms, departure code.
- Family `proto_m22_housing_*` (opportunity_opened, setback_shown,
  spare_fetched, seal_seated, departed, closed, technical_failure).
- Prior exposure: Pump House chain (dev-only). Contamination: dev-scene.
- Missing/invalid: housing never attempted → `missing (participant_absent)`;
  technical → `invalid`.
- Time: 1.0–1.5 min. Competing: not noticing the crate; route fatigue.
- Status: **PRIMARY-CANDIDATE (new host instance)**.

### M23

- Source: field-actions foundation (`proto_m23_field_recovery`) — "useful
  persistence on a hard but attainable extraction".
- Activity: Noor's recovery work order — scan (C) and dig (D) inside the east
  plot to recover the relay coupling; hard but attainable (buried at a fixed
  form cell, signal radius 160 px); no timer; leaving possible.
- Location: Exterior Recovery Yard. Opening: accepting Noor's work order
  (one-shot). Closing: coupling unearthed (completed) or "move to the next
  job" / yard left → window closed pending → at Final Core `censored`
  (entered) — the give-up vs interruption coding is **FA-SCI-5**, open.
- Entry: target inactive and plot disabled until opened; scanner and spade
  issued by Noor at briefing (tool equivalence).
- Counterbalance: `form_a` / `form_b` (cell position), per session id.
- Raw: scan_count, valid_scan_count, unique_scan_positions,
  best_signal_strength, direction_improving_transitions,
  dig_attempt_count, unique_cells_excavated, invalid_action_count,
  active_time_ms, idle_time_ms, interruptions, completed,
  completion_time_ms, exit_status. **No persistence score.**
- Family `proto_m23_field_recovery_*`. Duplicate: Coolant Yard frozen
  coupling dev-only.
- Technical/comprehension: technical → `invalid`; no comprehension record
  beyond Noor's brief (recorded as a gap).
- Contamination: M26 plots reachable by the same signal (radii capped so no
  free signal reaches a plot); free scans outside the window are secondary
  only; dev-scene exposure.
- Time: 2.0–3.0 min. Competing: scanner comprehension, motor search.
- Status: **PRIMARY-CANDIDATE**.

### M24

- Source: field-actions foundation (`proto_m24_magnet_utility`) —
  "continuation after an explicitly understood transition to zero benefit".
- Activity: Magnet recovery rig (F) in the Metal Recovery Yard — real moving
  timing meter, cable and magnet, finite deck, explicit depletion statement,
  visible alternative activity.
- **Scientific correction (Unit 5):** every valid initiated, non-cancelled
  cycle advances the deck position whether the timing band was hit or missed;
  timing accuracy (`locked_in_band`, marker phase at lock) is recorded
  separately as gameplay telemetry and **may never enter the M24 primary
  variable**; the deck (6 positions, identical multiset in forms A/B) is
  reached by everyone who initiates 6 cycles; the identical depletion
  statement follows the final position; no post-depletion cycle yields
  anything; salvage gates nothing; per-cycle duration is recorded (REV-MIN-8).
- Opening: Noor's salvage assignment / first rig readout (one-shot).
- Closing (REV-BLOCK-1): the window reaches `completed` **only if the
  depletion statement was displayed and acknowledged**; closing without the
  signal ever displayed → `missing (no_opportunity)` ("the zero-benefit
  transition was never reached"); `0` post-signal acts is interpretable only
  conditional on acknowledgement and is never written for an unexposed
  window. Yard left / "next job" → closure per the same rule; technical →
  invalid.
- Raw: cycles, cycle_count_pre_signal / post_signal, depletion_shown,
  depletion_acknowledged, alternative_activity, time_post_signal_ms, per-cycle
  hook_set / locked_in_band / lock_source / pull_position / outcome_tier /
  cycle_duration_ms.
- Counterbalance: deck form A/B per session; **M24/M26 order counterbalanced
  per session** (`exterior_job_order`) with a neutral Noor check-in between
  them (REV-MAJ-8); cross exposure recorded (`prior_exposure:
proto_m26_futility_signal_seen` / `proto_m24_depletion_signal_seen`).
- Family `proto_m24_magnet_utility_*`. Duplicates: Coolant Yard recycler
  dev-only; ice-bore free play locked.
- Contamination: dev-scene exposure; the twin zero-benefit signals are a
  known contrast/practice channel pilot analysis must test (ruling §10).
- Time: 2.0–3.0 min. Competing: enjoyment of the mechanic, not reading the
  banner (acknowledgement recorded).
- Decision: post-signal definition; interruption counters (FA-SCI-9).
- Status: **PRIMARY-CANDIDATE (deck correction required)**.

### M25

- Source: `src/measurement/m25PumpLock.ts` — "unchanged repetition after a
  salient mechanical lock" (module header).
- Activity (new host instance, Unit 5): **Yard coolant pump** in the Exterior
  Recovery Yard — prime control works for three cycles with visible readouts,
  then the interlock engages; the breaker reset sits beside it the whole
  time; each post-lock prime repeats the identical lock statement. Two
  physical stations (prime control / breaker reset), not answer cards.
- Opportunity `proto_m25_yardpump_interlock` — fresh state container from
  `createM25PumpLockState()` (REV-BLOCK-3); entry `m25-yardpump-v1`.
- Opening: lock engaged. Closing: breaker reset → completed; **departure
  with the window open** → `closed_departed_without_reset` (third explicit
  code, exposure booleans `lock_statement_shown`, `breaker_visible`, exit
  count; never completed, never absent; D-X-4).
- Entry state: three useful cycles then lock; identical readouts; breaker
  adjacent and named in the lock statement.
- Counterbalance: none within the module (fixed by design); job order within
  the yard counterbalanced (§3).
- Raw: useful_cycles, lock_engaged, post_lock_primes, reset_done, running,
  yard_exits_during_window, departure code.
- Family `proto_m25_yardpump_*`. Duplicate: Pump House host dev-only.
- Contamination: dev-scene exposure. Missing/invalid: pump never attempted →
  `missing (participant_absent)`; technical → `invalid`.
- Time: 0.5–1.0 min. Competing: not seeing the breaker.
- Status: **PRIMARY-CANDIDATE (new host instance)**.

### M26

- Source: field-actions foundation (`proto_m26_depleted_search`) — "continued
  search after verified knowledge that a bounded area is depleted".
- Activity: Noor's sector verification — control plot with an attainable
  buried sample first; then the verification post certificate (futility
  statement), explicit acknowledgement, and the fenced depleted plot (empty
  by construction); useful alternative visible.
- Opportunity `proto_m26_depleted_search`; entry `m26-depleted-search-v1`;
  control form fixed (`control_fixed`, cell {3,19}); opening: assignment
  accepted (one-shot); phase control → futile on control recovery.
- Closing (REV-BLOCK-1): `completed` **only if** the control was recovered
  and the futility certificate was **displayed and acknowledged**; closing
  before the certificate was displayed → `missing (no_opportunity)`; control
  never recovered → the depleted phase never opens (`missing
(no_opportunity)`). `0` post-futility acts is interpretable only
  conditional on acknowledgement.
- Counterbalance: none within the module (fixed control cell, rationale: the
  control phase must be attainable and identical); M24/M26 order
  counterbalanced per session (§3).
- Raw: control_completed, control_scan/dig_count, futility_signal_displayed_at,
  futility_signal_acknowledged, pre_ack_act_count, post_futility_scan/dig
  counts, post_futility_unique_positions, post_futility_active_time_ms,
  alternative_activity_entered, exit_status.
- Family `proto_m26_depleted_search_*`; control and futile events separate.
- Prior exposure: M23 scan/dig mechanic (same room) and M24 depletion
  signal, both recorded as coded entries. Contamination: dev-scene exposure.
- Missing/invalid: as above; technical → `invalid`.
- Time: 1.5–2.5 min. Competing: not reading the certificate (ack recorded).
- Status: **PRIMARY-CANDIDATE**.

## 3. Route gates, fail-forward, order and contamination rules applied

- Gates check only that scheduled opportunities were **encountered and
  explicitly closed** (completed / missing / invalid / censored / departure
  code); never a correct answer, performance, persistence, recovery,
  tidiness or trait.
- Every task has STOP / leave; abandonment → missing/censored or the
  documented departure code, never a low value.
- Order: the route's zone order is fixed by the mission (documented as the
  navigation spine and exported). Within zones, **counterbalanced per
  session and exported**: decoder station layout (`ip_decoder_layout`), the
  Exterior job order (`exterior_job_order`: M23 first for tool issue, then
  {M25, M22} order and {M24, M26} order each counterbalanced) — D-X-3 widened
  accordingly (REV-MAJ-7). Realised visit order is exported.
- Dev scene aliases (`inventory_lab`, `information_processing_lab`,
  `field_actions_lab`, `coolant_yard`, `pump_house`, legacy hub rooms) are
  not reachable from participant navigation; a dev alias launch in the same
  page session marks every scheduled opportunity `invalid (contamination)`.
- Technical failure → `invalid (technical_failure)`; Final Core closure per
  §2 common rules.

## 4. Pairwise event-family / raw-variable boundaries

Primary families on the route: `proto_m02_*`, `proto_m03_*`,
`proto_m13_lattice_*`, `proto_m14_packet_*`, `proto_m15_cipher_*`,
`proto_m16_protocol_*`, `proto_m17_syntax_*`, `proto_m18_fault_*`,
`proto_m22_housing_*`, `proto_m23_field_recovery_*`,
`proto_m24_magnet_utility_*`, `proto_m25_yardpump_*`,
`proto_m26_depleted_search_*`. Pairwise disjoint by prefix **and** no route
prefix matches any `proto_*` literal outside its own route module (asserted
by `e2e/pilot_coverage.spec.ts`, which scans `src/`). Secondary-only
families: `secondary_inventory_*`, `secondary_field_action_*`,
`proto_ip_tutorial_*`, route/telemetry `pilot_*` (Unit 2+). No secondary
event is ever a primary input. The M24/M26 signals and the M23/M26 scan
mechanic are recorded cross-exposure channels, not shared primaries.

## 5. Research-owner decisions still required (recorded, not resolved)

- **D-X-1** Applying the Q-battery global ruling (§13) and SA-13 to the
  M battery by analogy — confirm or replace.
- **D-X-2** Exact adopted wording and mapping for M01, M04–M12, M19–M21; the
  M↔Q crosswalk; whether the tier-6 "existing flows" note is to be honoured;
  **the identity of slots M13–M18 (BESSI IP items vs the 26-measure
  battery) for all six** (REV-MAJ-12).
- **D-X-3** Counterbalanced assignment vs fixed layout/order for M14–M17,
  the Exterior job order and any future deck pair — implemented as
  counterbalanced + exported pending ruling.
- **D-X-4** M22/M25 departure code (`closed_departed_without_recovery/reset`):
  may it ever be treated as evidence of non-recovery/non-reset (only with all
  exposure preconditions true and no return), or is it always missing data?
  M23 give-up vs interruption (FA-SCI-5); M24 post-signal definition; the
  M24/M26 unexposed-window code (`no_opportunity` used here).
- **INV-SCI-1** M02/M03 numbering; **INV-SCI-3/4/9** inventory process
  semantics; all `proto_*` names (tier 3) and any derived indicator (tier 4).
- **REV-MAJ-6** shared orientation dependency across M14–M17; inline
  comprehension checks for M13/M18.
- Which M13 / M18 wording is adopted (see D-X-2).

## 6. Review trail (Unit 1)

Scientific review (read-only, Opus): 3 blockers, 12 majors, 8 minors, 5
informational. Round-1 corrections applied in this revision: BLOCK-1 (M24/M26
exposure precondition → `no_opportunity`), BLOCK-2 (departure code; exit
count; host-specific text; M22/M25 moved out of the end-of-session deck into
the Exterior), BLOCK-3 (factory state containers), MAJ-1 (families; legacy
rename; src scan test), MAJ-2 (Final Core closure coding), MAJ-3 (one
contamination semantics), MAJ-4 (rows completed), MAJ-5 (M18 never-opened;
`prior_m13_window_status`), MAJ-6 (orientation as shared control; gap
recorded), MAJ-7 (counterbalanced layout/order), MAJ-8 (M24/M26 order +
transition + cross exposure), MAJ-9 (review naming rule), MAJ-10 (yard
registries session-scoped; re-entry count), MAJ-11 (identity basis field),
MAJ-12 (all six slots), MIN-1..8 (qualified citations; instance summary
caveat; precedence; M02 censored; coded M02→M03 exposure; no evaluative
beats; per-cycle duration; budget wording). Round 2 is reserved for
regressions introduced by Round 1 or unresolved blockers/majors found at the
post-integration review.
