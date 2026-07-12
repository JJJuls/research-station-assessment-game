# Wave 1 Review Gate — Consolidated Report

- **Review range:** `556e273..89e9597` (shared architecture U1–U6, six station rooms, Wave 1B runtime verification)
- **Repo state at review:** branch `fable-autonomous-game-build-v1`, HEAD `e5adf6f` (file-identical to `89e9597` for all game/test/doc paths; `e5adf6f` added only agent-routing configuration, outside the review range)
- **Safety checkpoint:** tag `wave-1b-verified-89e9597`
- **Reviewers (run sequentially, read-only):**
  1. `research-data-reviewer` (Sonnet) → `WAVE1-RESEARCH-DATA-REVIEW.md` — verdict: **research-valid with minor notes**
  2. `gameplay-implementation-reviewer` (Sonnet) → `WAVE1-GAMEPLAY-IMPLEMENTATION-REVIEW.md` — verdict: **implementation-sound**
- **Coordinator:** Fable main agent (synthesis only; no findings altered or suppressed). `browser-qa-reviewer` and `cheap-explorer` were not invoked (not required — no missing-reference gap arose). Playwright and PixelLab MCP remained disabled throughout.
- **Process note:** the session's agent registry had not picked up the reviewer definitions as named types, so each reviewer was executed through a generic subagent explicitly pinned to `model: sonnet` with its `.claude/agents/*.md` definition injected verbatim and its tool restrictions restated as hard constraints. Same model, same instructions, same read-only discipline; run strictly one at a time. An earlier research-data-reviewer attempt was terminated by a session usage limit before completing; its partial output was discarded and the review re-run from scratch.

## 1. Gate result

**CONDITIONAL PASS.**

Wave 1 passes the review gate: zero blockers, zero implementation-defect majors, both reviewers issue passing verdicts, build and typecheck pass, and the 24/24 runtime-verification evidence was independently corroborated (the gameplay reviewer re-counted 24 `test()` calls across the nine spec files). The single major-class finding is a **known, disclosed, deliberately deferred** scoring gap owned by the user-supervised Beat-13 bundle — not a defect introduced or concealed by Wave 1 — so it conditions the pass rather than failing it.

Conditions attached to the pass:

1. **Before any data-collection deployment:** the Beat-13 scoring bundle must land (under user supervision) so `game_inappropriate_persistence` includes `final_core_force_continue` per V3 §6 (finding RD-1). Until then, Final Core force-through actions are logged in raw events but absent from the Qualtrics summary variable.
2. **Before Hazard Control implementation:** the user-owned Hazard design decisions (§4 below, items 1 and possibly 3–6) must be resolved — Hazard Control is decision-blocked, not code-blocked.
3. Minor documentation/code-hygiene fixes (§5) should be batched into a small follow-up pass; none blocks progress.

## 2. Consolidated findings ledger

Every finding from both reviewers, none suppressed. IDs: RD = research-data-reviewer, GP = gameplay-implementation-reviewer.

### Blockers (0)

None from either reviewer.

### Major (1)

| ID   | Finding                                                                                                                                                                                                                                                                                                                                                                      | Type                                                                                                                            |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| RD-1 | `ScoringManager.game_inappropriate_persistence` omits the newly emitted `final_core_force_continue`, which V3 §6's composite formula requires. Disclosed in `docs/game/rooms/08-final-core-room.md` and `ACTIVE-EXPANSION-STATE.md` unresolved issue 6; `ScoringManager.ts` was deliberately kept out of Wave 1's touched files pending the supervised Beat-13 scoring beat. | **User-owned scientific decision** (deferred scoring bundle) — not an implementation defect of this wave, but must not be lost. |

### Minor (3)

| ID    | Finding                                                                                                                                                                                                                                                                                                                                                                                                  | Type                                                            |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| RD-2  | Pre-existing (pre-Wave-1) `RepairScene`/`ArchiveScene` revision options are selectable as a first action with no antecedent failure, yet still log `success: true` under `adaptive_persistence` (Q23) — construct-validity risk for a minority of playthroughs. Inherited, not introduced or worsened by Wave 1. (Reviewer dual-labelled this "minor / observation"; recorded here at its higher class.) | Implementation/design gap, pre-existing; future-beat candidate. |
| GP-M1 | Duplicated `markXCompleted()`/`isXCompleted()` one-shot-gate pattern hand-rolled in five scenes instead of a shared helper next to `roomTaskState.ts`. Byte-consistent today; divergence risk tomorrow.                                                                                                                                                                                                  | Implementation hygiene.                                         |
| GP-M2 | `WAVE1B-EVIDENCE.md` §1 per-spec test-count table sums to 23 (attributes 2 tests to `launch_with_research_params`, which has 3). Headline 24/24 claim independently verified as accurate; only the row-level attribution is off by one.                                                                                                                                                                  | Documentation accuracy.                                         |

### Observations (5)

| ID    | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Type                                         |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| RD-3  | `final_core_blocker_shown` is a passive display event carrying `inappropriate_persistence` (Q28) at prompt-open, before any player choice — light construct wrinkle, but consistent with the established `hazard_warning_seen` precedent.                                                                                                                                                                                                                        | User-owned convention, consistently applied. |
| RD-4  | Review-scope note: 2 of 6 new Playwright specs read line-by-line in depth; the other 4 cross-checked via registry mappings, room docs, and the evidence doc. (Partially offset by GP's independent review of all spec files as code and the 24-test recount.)                                                                                                                                                                                                    | Scope note, not a defect.                    |
| GP-O1 | `FinalCoreScene` mutates `promptBody` on a station config object shared by reference with `RoomScene.addStation`'s internal storage — works, but the pass-by-reference contract is undocumented.                                                                                                                                                                                                                                                                 | Implementation hygiene (comment wanted).     |
| GP-O2 | 352 pre-existing repo-wide ESLint `prettier/prettier` CRLF errors, all in foundation files untouched by Wave 1.                                                                                                                                                                                                                                                                                                                                                  | Pre-existing tooling debt.                   |
| GP-O3 | `InventoryScene`'s quick-grab and sort-and-verify options intentionally skip the chained verification/cleanup stages the systematic option goes through, per a documented research-owned justification. GP handed this to the research lane; RD's controlled-option and traceability checks passed the room without flagging it, so the two reviews are consistent: it stands as a **user-owned design decision**, documented in the scene header, not a defect. | User-owned scientific decision (documented). |

### Reviewer disagreements

None material. The only overlap (GP-O3 vs. RD's controlled-option check) reconciles cleanly as described above; both reports are preserved verbatim in full so the overlap remains inspectable.

## 3. Implementation defects vs. user-owned scientific decisions

- **Implementation defects / hygiene (fixable without a scientific decision):** GP-M1 (shared completion-gate helper), GP-M2 (evidence-table row correction), GP-O1 (document the `addStation` reference contract), GP-O2 (pre-existing CRLF lint debt), RD-2 (revision-without-failure gating — the _fix_ is implementation, though the user may want to confirm the intended gating semantics first).
- **User-owned scientific decisions (must NOT be resolved by implementation):** RD-1 (Beat-13 scoring bundle content and timing), RD-3 (display-event construct convention), GP-O3 (Inventory branch-stage asymmetry), plus the full blocked-decision list in §4.

## 4. Blocked-decision list (preserved, all still open, none silently resolved)

Verified by the research reviewer against `ACTIVE-EXPANSION-STATE.md` "Unresolved issues" — all remain recorded as open and user-owned:

1. `hazard_avoidance` canonical event resolution (prerequisite for Hazard Control).
2. Idle-threshold parameter.
3. `task_started` Q-listing conflict.
4. Abandon/return `construct_id` (Q24/Q25).
5. `engineer_report_submitted_supervised` mapping.
6. `interruption_alert_acknowledged` mapping.
7. Beat-13 scoring fixes bundle (includes RD-1's `final_core_force_continue` inclusion).

Hazard Control itself is confirmed **unimplemented** (no scene file, no scene key, sealed door in the registry) and Beat-13 scoring is confirmed **untouched** in the review range.

## 5. Fixes required before Hazard Control

**Code-blocking: none.** Hazard Control is blocked on decisions, not defects. Recommended sequencing:

1. **(Decision, required)** User resolves blocked decision 1 (`hazard_avoidance` canonical resolution) and any of decisions 3–6 they consider prerequisites — Hazard Control cannot be specced correctly without at least decision 1.
2. **(Fix batch, recommended before or alongside the next build beat)** One small documentation/hygiene pass: correct the `WAVE1B-EVIDENCE.md` test-count row (GP-M2), extract the shared completion-gate helper (GP-M1), add the `addStation` reference-contract comment (GP-O1). No scoring, contract, or event changes.
3. **(Supervised scoring beat, required before deployment, not before Hazard Control)** Beat-13 bundle including `final_core_force_continue` (RD-1), with the user deciding scope; RD-2's revision-gating question can be decided in the same sitting.

## 6. Recommended next task

**Present the seven blocked user-owned decisions to the user and obtain a ruling on `hazard_avoidance` (decision 1) plus the Beat-13 bundle scope (decision 7).** That is the exact next task: it unblocks Hazard Control (the only unimplemented Wave 1 room) and schedules the one major finding, and it requires no code changes. Only after decision 1 is ruled should a `room-builder` pass for Hazard Control be planned.

## 7. Is another review required after fixes?

- **Fix batch (§5 item 2, docs/hygiene only):** no full gate re-run. A single `gameplay-implementation-reviewer` spot-check of the helper extraction is sufficient (it touches five scenes' completion gates).
- **Beat-13 scoring bundle:** **yes — mandatory** `research-data-reviewer` re-review (scoring separation and V3 §6 conformance) plus the `qualtrics-logging-review` skill gate, before the change is accepted.
- **Hazard Control implementation (when unblocked):** **yes — full gate**: both reviewers sequentially, plus `browser-qa-reviewer`/`playwright-game-verify` at an explicit runtime-verification gate, per the standing one-room-at-a-time process.

## 8. Tallies

| Class       | Count | IDs                                   |
| ----------- | ----- | ------------------------------------- |
| Blocker     | 0     | —                                     |
| Major       | 1     | RD-1 (user-owned, deferred by design) |
| Minor       | 3     | RD-2, GP-M1, GP-M2                    |
| Observation | 5     | RD-3, RD-4, GP-O1, GP-O2, GP-O3       |
