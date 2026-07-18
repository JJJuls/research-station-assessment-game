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
- Stage the kit yourself at the bench, item by item (per-item preparation
  mode, FABLE-NEXT-02 — see the dated section below).

(The three legacy options remain one combined choice each, preserved verbatim;
the separable checklist-use / item-placement / verification / cleanup sub-steps
the canonical design calls for are implemented by the per-item mode.)

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
"Inventory / Preparation Room" — refreshed 2026-07-18 for FABLE-NEXT-02. Every
canonical event above is now emitted except `prepared_tool_used` (registered
but unemitted — the Q03 retrieval episode is a later cross-room unit) and
`readiness_verified` (deliberately unemitted — no distinct readiness action
exists); `inventory_sequence_completed` is emitted but unregistered/unmapped
(open research-owner decision, see the schema table).

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

- Player selects a wrong tool: in per-item mode `wrong_tool_selected` (stray
  item packed into the kit crate; `object_id` = registry `item_id`,
  `attempt_number`) is logged distinctly from `missing_item` (still-missing
  requisition item, logged once per session per item at the first close-out
  review that surfaces it — i.e. pre-correction). On the legacy shortcut
  option the distinction still does not exist: only the combined legacy
  cascade (with additive `missing_item`) fires there.
- Player skips verification but the kit happens to be complete:
  `inventory_verification_skipped` (process signal) and
  `inventory_verified_complete` (the verification act) are independent events
  on BOTH verification stages (legacy option-2 chain and per-item close-out);
  the skip fires regardless of kit completeness.
- Player leaves the workspace disordered: propagates via
  `SessionState.workspace_status = disordered` (V3 Section 3.1) to Final Core,
  where `final_core_workspace_issue_flagged` is emitted at room entry
  (Wave 1A).

## Playwright verification targets

`inventory_prep_logging.spec.ts` — drives the three legacy console paths
(canonical aliases asserted additively beside the unchanged legacy events) and
the FABLE-NEXT-02 per-item flows: systematic placement (checklist, ordered
placement, review, verify, reset), misplacement + correction (higher
`attempt_number` re-placement), rushed path (skip items/verification, disorder
chosen at the cleanup stage), and pre-engagement/post-completion station
gating. `readiness_verified` has no spec target — it is deliberately
unemitted. Remaining secondary-surface runtime gaps are listed in the
review-pass section below; runtime/browser verification of the per-item flows
is still owed (spec authored compile-only).

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
_(Superseded by the FABLE-NEXT-02 section below: all of these except
`prepared_tool_used` — a later unit — and `readiness_verified` — no
distinct action — are now emitted by the per-item mode.)_

## FABLE-NEXT-02 per-item preparation mode (2026-07-18)

Contract: `docs/game/CANONICAL-ROOM-AND-MINIGAME-CONTRACTS.md` §R4 target
minigame; task file `FABLE-NEXT-02-INVENTORY-PREP-Q01-Q04.md`. Additive:
the three legacy console options, their labels, feedback strings, event
cascades and one-shot gate text are preserved verbatim, and every
pre-existing spec/journey choreography (which only ever presses options
1-3) is untouched. A fourth console option — "Stage the kit yourself at
the bench, item by item." — engages the per-item mode.

### Mechanic

- `src/data/itemRegistry.ts`: 8 registry items — 5 kit-required (checklist
  order: Torque Driver, Diagnostic Probe, Coolant Cartridge, Spare Fuse
  Pack, Patch Tape) + 3 stray items homed to 3 labelled bins (Hex Spanner →
  Hand Tools Rack, Sealant Canister → Consumables Bin, Relay Board →
  Electronics Shelf). Deliberately the smallest carried-item substrate: one
  carried item at a time, locations, attempt counts — no generic backpack,
  stacking, crafting, rarity, currency or cross-room item use (the Q03
  retrieval episode is a later unit).
- Stations (all gated inert until the mode is engaged, and closed out after
  prep completion so repeated interactions can never inflate counts): Prep
  Bench (16,7.5 tiles — mirrors the seal log on the right block), Hand
  Tools Rack (4,2), Consumables Bin (10,2), Electronics Shelf (16,2), Field
  Kit Crate (6,10.5). Every interactable pair stays ≥72 px separated; the
  seal log, console and Hub door remain strict nearest targets on their
  audited approaches.
- Flow: engage at console → collect one item at a time at the bench (each
  take-option names the item AND its destination tag — transparency
  safeguard: label ambiguity must never mimic disorganisation) → place into
  a bin or the kit crate (neutral feedback; items can be taken back out at
  any time) → close out at the console → **unmissable bench review** (the
  ONE correction opportunity; lists still-out/missing/out-of-place items
  without moral framing) → go back and correct, or proceed → verify or skip
  → **restore-vs-leave cleanup stage** → completion. Keyboard only, no
  timers, no colour-only cues, accuracy over speed.

### Emission placement (per-item mode; approved names only)

- One placement = one event, `object_id` = registry `item_id`,
  `attempt_number` = that item's placement count: bins log
  `inventory_item_sorted_correct` / `inventory_item_misplaced`; the kit
  crate logs `correct_tool_selected` / `wrong_tool_selected`. Collecting or
  taking an item back emits nothing — the corrected RE-placement (higher
  `attempt_number` after a misplacement event) is the logged act, which is
  why `inventory_item_corrected` stays a CANDIDATE and is not emitted.
- `inventory_checklist_opened` fires only on checklist ACTIONS ("Check the
  kit requisition list."), never on prompt open and never on mode
  engagement (shortcut-credit rule). Mode engagement itself emits no event
  (no approved name; derivable from the per-item events that follow).
- `inventory_sequence_completed` (once, console context): every registry
  item has been placed at some destination.
- `inventory_sequence_followed` (once, console context): judged exactly
  once, at the first moment the kit holds all required items; fires iff
  their first placements into the kit happened in checklist order.
- `missing_item` (once per item per session, `object_id` = item_id): logged
  at the close-out review that surfaces the still-missing requisition item.
  Unmapped raw telemetry (no CanonicalEventContext entry, by schema).
- Review step: structurally guaranteed on every close-out path — its
  occurrence is derivable from event order (any
  `inventory_verified_complete`/`inventory_verification_skipped` implies a
  review preceded it). No dedicated review/opportunity event exists;
  `cleanup_opportunity_shown` and a correction-opportunity-shown event stay
  CANDIDATES for the research owner.
- Verification stage: `inventory_verified_complete` (run) or
  `inventory_verification_skipped` (plausible skip). The verification act
  fires regardless of kit completeness; the result is shown honestly in the
  cleanup-stage body text and is derivable from the event stream (no new
  metadata keys added). `readiness_verified` stays deliberately unemitted —
  no distinct readiness action exists and it must never be double-logged
  from the same click.
- Cleanup stage: `workspace_tidy_confirmed` + `cleanup_completed` (reset)
  or `workspace_left_disordered` (leave). Reached from EVERY close-out
  path, including the rushed one — disorder is chosen, never asserted
  (Q04 closed decision).
- Q30 tags on the verification events are SA-4's question: untouched,
  unextended.

### State propagation

- Kit state (locations/attempts/carried item) lives at module scope in
  `itemRegistry.ts`, so room re-entry preserves it (contract §R4
  interruption/return); a page (re)load starts a fresh session and a fresh
  state.
- On completion: `prepared_items` gains the kit crate's ACTUAL contents
  (registry order — including any wrongly packed stray that survived
  correction), then `field_kit` iff every required item is packed. The
  field keeps its `string[]` shape; `field_kit` membership semantics for
  the Final Core flags are identical to the legacy paths. A carried item is
  set back on the bench at completion (it is not packed, so a required item
  left in hand keeps `field_kit` absent). `workspace_status` is written by
  the cleanup choice. Exiting the room mid-flow leaves prep incomplete
  (`field_kit` absent → Final Core missing-item flag), with kit state
  preserved for return.
- No new SessionState field was needed (`kit_item_state` reserved as the
  additive option if per-item placement detail must ever be exported).

### Scoring boundary (unchanged this unit)

ScoringManager aggregates only legacy names, so the per-item mode changes
NO summary field (`organization_*` counts stay driven by the legacy
options). `organisation_accuracy_score`, `organisation_error_count`,
`cleanup_failure_count` remain approved TARGETS for a later D2-family
scoring pass; this unit only guarantees their raw inputs exist.

### Validity notes (psychometric-task-design gate record)

- Q01 (systematic, +): checklist-before-action (`inventory_checklist_opened`
  ordering vs first placement), ordered placement
  (`inventory_sequence_followed`), verification
  (`inventory_verified_complete`). Strong analogue per spec §3.
- Q02 (disorganised, R): only errors SURVIVING the review's correction
  opportunity are trait-relevant — first mistakes are never flagged at
  placement time (neutral feedback) and the correction opportunity is
  structurally unmissable and sequence-derivable. Missing-item consequence
  propagates to Final Core via `field_kit` absence.
- Q03 (maintained order, +): tidy storage state via bin sorting and
  tool-selection events; the RETRIEVAL episode is explicitly a later unit.
- Q04 (cleanup, R — closed decision): explicit restore-vs-leave stage on
  every close-out path; never planning-before-action, never a labelled
  "wrong" choice.
- Confound controls: destination tags in plain text on every take-option
  (reading/label-ambiguity safeguard), no timers (speed pressure), no
  colour-only cues, one-shot completion gate (no score inflation), no
  checklist credit on shortcut/engagement clicks.
- Wording check: all player-facing text uses operational language ("stage",
  "stow", "pack", "reset the bench", "rack tag") — no Q01-Q04/BFI item
  wording appears in labels, bodies or feedback.

### Recorded deviations and follow-ups (review pass, 2026-07-18)

- **Contract §R4 "restore/partial/leave" vs implemented "restore/leave"**:
  the cleanup stage is binary. No approved event name exists for a partial
  restore (spec Q04 lists `partial_cleanup_count` only as a candidate
  derived indicator), so the partial option would require an event-schema
  decision — recorded here as an OPEN point for the research owner, not
  silently narrowed.
- **`missing_item` fires at the first review (pre-correction) and is
  once-per-session per item**: the later D2-family scoring pass must not
  count a `missing_item` event as an unresolved preventable omission
  without checking final state (`prepared_items`/`field_kit`) — the
  correction may have resolved it (Q02 rule: only post-correction errors
  are trait evidence).
- **`inventory_prep_opened` count is mode-dependent**: the per-item flow
  requires 3+ console opens vs 1 on legacy paths. Unmapped raw telemetry,
  feeds no aggregate; analysts should not compare its raw count across
  modes.
- **event-schema.md §4 Inventory status column stale** ("missing — needs a
  per-item mini-game" rows that are now emitted; checklist
  emission-placement note lacked the second per-item source). Schema edits
  were out of scope for FABLE-NEXT-02 by task file. **Resolved 2026-07-18**
  by the follow-up docs-only refresh pass: §4 Inventory table and this doc
  updated to the implemented emission sources; no gameplay source, event
  identifier, registration, mapping or scoring change; the open
  research-owner decisions (partial restoration, `inventory_sequence_completed`
  registration, candidate events) are recorded as OPEN, not resolved.
- **Secondary-surface runtime coverage gaps** (follow-up
  playwright-game-verify pass): prompt/feedback text assertions
  (checklist body, review issue lines, gate feedback via
  `__lastRoomFeedbackText`/`__lastPromptBody`), put-back/keep-hold/
  step-back/empty-bench options, verification run on an incomplete kit,
  close-out while carrying an item, bin-to-wrong-bin misplacement, a
  wrongly packed stray surviving to `prepared_items`, pre-engagement
  gating of bins/crate, and mid-flow room exit + re-entry preserving
  module-scope kit state.

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
