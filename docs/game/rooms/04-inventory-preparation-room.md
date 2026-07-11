# Room 4 — Inventory / Preparation Room

Contract reference: V3 Section 4, "Room 4 — Inventory / Preparation Room".
`room_id`: `inventory_prep_room`.

## Purpose

Orderliness, preparation, systematic organisation, cleanup/disorder, readiness
verification.

## Mapped Q-items

Q01, Q02, Q03, Q04, Q30.

## Construct targets

Organisation, productiveness, prudence, cleanup/disorder, exploratory
short-term shortcut proxy (Q30 is optional/exploratory Goal-Time — label
accordingly, see `docs/research/scoring-plan.md` §8).

**Q04 is cleanup/disorder only** — never planning-before-acting. This is a
hard constraint from V3 Section 1 rule 9 / `MASTER_33_ALIGNMENT.md`; any mechanic
in this room that resembles "plan before you act" must not be labelled Q04.

## Player-facing fiction

A quartermaster console, storage system, prep bench, and kit crate are available.
The player prepares a field kit using a checklist before the next station cycle.

## Task flow

1. Enter Inventory/Prep Room, open checklist.
2. Player sorts items, selects tools, assembles kit.
3. Player verifies readiness (or skips verification).
4. Player cleans/resolves the workspace before leaving (or leaves it
   disordered — this is the Q04 signal).
5. Missing items or unresolved disorder are flagged later at Final Core.

## Valid choices/actions (current)

- Grab tools quickly without checking the list (shortcut/disorganised path).
- Open the checklist and pack the required tools in order (systematic path).
- Sort the workspace and verify the kit before leaving (cleanup/verification
  path).

(Current prototype implements these three as one combined choice rather than
three separable steps — canonical design implies checklist-use, tool-selection,
and cleanup/verification as distinguishable sub-steps; see Implementation
notes.)

## Canonical events

`inventory_room_entered`, `inventory_checklist_opened`,
`inventory_item_sorted_correct`, `inventory_item_misplaced`,
`inventory_sequence_followed`, `inventory_sequence_completed`,
`inventory_verification_skipped`, `inventory_verified_complete`,
`correct_tool_selected`, `wrong_tool_selected`, `prepared_tool_used`,
`readiness_verified`, `missing_item`, `workspace_tidy_confirmed`,
`workspace_left_disordered`, `cleanup_completed`,
`final_core_missing_item_flagged`, `final_core_workspace_issue_flagged`.

Current-to-canonical alias table: `docs/research/event-schema.md` §4,
"Inventory / Preparation Room" — **zero exact string matches**, the weakest
naming alignment of any room, though the underlying
shortcut-vs-systematic-vs-cleanup mechanic conceptually exists.

## Derived variables

`organisation_checklist_use`, `organisation_accuracy_score`,
`sequence_quality`, `avoidable_omission_count`, `organisation_error_count`,
`prepared_resource_use`, `tool_retrieval_accuracy`, `workspace_tidy_score`,
`cleanup_failure_count`, `unresolved_workspace_issue_count`,
`short_term_shortcut_count`, `preparation_delay_benefit`.

## Scoring notes

Q04 must be cleanup/disorder — do not implement it as planning-before-acting
(V3 validity caution, restated in `MASTER_33_ALIGNMENT.md`). Keep the interface
simple so it measures organisation, not drag-and-drop skill. Q30's
`short_term_shortcut_count`/`preparation_delay_benefit` are optional/exploratory
Goal-Time proxies — label accordingly wherever surfaced.

## Failure/edge cases

- Player selects a wrong tool: should log `wrong_tool_selected` distinctly from
  `missing_item` — currently neither is distinguished from the general shortcut
  path.
- Player skips verification but the kit happens to be complete: should still log
  `inventory_verification_skipped` (process signal) independent of
  `inventory_verified_complete` (outcome signal) — currently conflated into one
  combined choice.
- Player leaves the workspace disordered: should propagate to Final Core as
  `final_core_workspace_issue_flagged` — currently no cross-room propagation
  exists (depends on `SessionState`'s `workspace_status` field, per V3 Section
  3.1, which doesn't exist yet).

## Playwright verification targets

`inventory_prep_logging.spec.ts` — drive shortcut path (confirm
`inventory_item_misplaced`/`workspace_left_disordered`-equivalent events),
systematic path (confirm `inventory_checklist_opened`-equivalent +
`inventory_sequence_followed`-equivalent), and cleanup/verify path (confirm
`workspace_tidy_confirmed`/`readiness_verified`-equivalents) — using current
event names until the room is migrated, then re-run against canonical names.

## Implementation notes

Current implementation combines checklist-use, tool-selection, and
cleanup/verification into one 3-option choice rather than the separable
sub-steps the contract's mini-game mechanics section describes (checklist/item
selection, kit assembly slots, verification prompt, cleanup/confirm step as
distinct interactions). This is the room needing the most event-name and
mechanic rework per `docs/research/event-schema.md`. `final_core_missing_item_flagged`
and `final_core_workspace_issue_flagged` also require `SessionState` to carry
`prepared_items`/`workspace_status` across rooms (V3 Section 3.1), which is not
yet implemented.

**Wave 1A status (2026-07-12)**: room implemented as `InventoryScene`
(`src/scenes/InventoryScene.ts`, `?scene=inventory`, Hub door open via the
registry). Legacy 3-option prompt preserved verbatim (labels, feedback,
event sequences, one-shot gate text). Contract-required sub-steps added as
chained stages **after the systematic option only**: verification prompt
(run check → `inventory_verified_complete`; plausible skip →
`inventory_verification_skipped`) then cleanup/confirm step (sort →
`workspace_tidy_confirmed` + `cleanup_completed`; leave →
`workspace_left_disordered`). The shortcut and sort-and-verify options keep
their legacy asserted outcomes and end immediately (chaining after them
would contradict their feedback text); their canonical equivalents are
emitted additively per the alias table.

**Emission placement decision (documented, matrix-grounded)**:
`inventory_checklist_opened` (Q01, organisation) fires on the "Open the
checklist..." option, NOT on prompt open — the alias table's mechanical
`inventory_prep_opened` rename would credit checklist use to shortcut
players; MASTER_33_ALIGNMENT.md defines Q01 as checklist-driven behaviour.
Prompt open keeps legacy `inventory_prep_opened` only (unmapped).

**Still unemitted (needs a per-item mini-game, a task-design decision
beyond an audit-first port)**: `inventory_item_sorted_correct`,
`inventory_item_misplaced`, `wrong_tool_selected`, `prepared_tool_used`,
`readiness_verified`, `inventory_sequence_completed`.

**SessionState propagation (vocabulary defined this beat,
`src/data/missionVocabulary.ts`)**: `prepared_items` gains `field_kit` on
every complete-kit path (systematic terminal options, sort-and-verify);
deliberately absent on the shortcut path → Final Core derives
`final_core_missing_item_flagged` from its absence. `workspace_status` set
to `tidy`/`disordered` → Final Core derives
`final_core_workspace_issue_flagged`. Playwright spec
`e2e/inventory_prep_logging.spec.ts` authored compile-only —
**runtime/browser verification still owed** before any "works" claim.

## Anti-leakage note

No organisation/BFI item wording (Q01-Q04, Q30) may appear in checklist text,
quartermaster dialogue, or option labels. Current labels ("Grab tools quickly
without checking the list", "Open the checklist and pack the required tools in
order", "Sort the workspace and verify the kit before leaving") stay in-fiction —
keep this register.
