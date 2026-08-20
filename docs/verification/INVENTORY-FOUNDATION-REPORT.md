# Interactive Inventory and Organisation Foundation — Verification Report

Unit: `feat(game): add interactive inventory and organisation foundation`
Branch: `fable-interactive-inventory-foundation-v1`
Base: `f7197d02c603b6ed372184afc8876f3778074251` (four-zone assessment route)
Date: 2026-08-20

---

## 1. What was built

One authoritative, professional inventory system running inside the actual
Phaser game:

- **Domain layer** (`src/inventory/model.ts`, `engine.ts`) — a pure,
  Phaser-independent transactional engine: item definitions, stacks with
  stable instance ids, fixed containers (10-slot hotbar, 20-slot backpack,
  20-slot storage locker, 2+1 workbench, M02/M03 workstation containers),
  and explicit-result commands (pick up all/one/half, place with
  move/merge/swap semantics, cancel-held safe restore, quick transfer,
  deterministic sort, consolidate, atomic recipe commit, add/take/discard,
  snapshot + load/migrate). Every command runs against a structured clone,
  is validated against the full invariant set AND an item-conservation
  check, and rolls back completely on any failure.
- **Runtime store** (`src/inventory/store.ts`) — the single module-scope
  state instance (page-session lifetime, survives scene transitions like
  every other gameplay system), with change notification, positional
  seeding, and a pending world-drop queue.
- **Overlay UI** (`src/inventory/ui/InventoryOverlayScene.ts` + helpers) —
  a centred modal overlay opened with **I**, launched over a paused host
  scene (Menu/ESC precedent) so world movement, hotkeys and pointer
  targets are structurally inert while open. Five modes: personal stores,
  container transfer, workbench, M02 filing workstation, M03 press bench.
- **Inventory Lab** (`?scene=inventory_lab`) — a developer proving ground
  with four visibly separated stations: supply pickup (four world
  bundles), storage transfer, assembly bench, and the organisation
  measurement prototypes (M02 + M03 A/B).
- **Compatibility adapter** (`src/gameplay/inventory.ts`) — the legacy
  ten-slot carry belt is now a thin adapter over the authoritative
  hotbar container; its public API, semantics and probe shape are
  preserved verbatim. The obsolete path (the old private module-scope
  `inventory` object in that file) no longer exists.

### Duplicate-store consolidation

Before this unit two inventory stores existed: the gameplay carry belt
(`src/gameplay/inventory.ts`) and the protected Q01-Q04 kit-preparation
substrate (`src/data/itemRegistry.ts`). The carry belt is now an adapter
over the single authoritative store. The Q01-Q04 substrate is untouched by
design — it is a measurement layer, not a runtime inventory, and remains
deliberately separate.

## 2. Exact changed files

New:

```
src/inventory/model.ts            src/inventory/engine.ts
src/inventory/store.ts            src/inventory/itemDefs.ts
src/inventory/telemetry.ts        src/inventory/inventoryTextures.ts
src/inventory/m02Filing.ts        src/inventory/m03Reset.ts
src/inventory/ui/theme.ts         src/inventory/ui/keyGuard.ts
src/inventory/ui/UiButton.ts      src/inventory/ui/SlotGridView.ts
src/inventory/ui/openOverlay.ts   src/inventory/ui/HotbarHud.ts
src/inventory/ui/InventoryOverlayScene.ts
src/scenes/InventoryLabScene.ts
e2e/inventory_foundation.spec.ts
e2e/inventory_measurement_isolation.spec.ts
e2e/inventory_visual_capture.spec.ts
docs/verification/INVENTORY-FOUNDATION-REPORT.md
docs/verification/screenshots-inventory-foundation/*.png (10 frames)
```

Modified shared runtime files (exactly five, at the unit's limit):

```
src/constants/key.ts          + inventoryLab / inventoryOverlay scene keys
src/scenes/index.ts           + barrel registration of the two new scenes
src/world/SceneRouter.ts      + ?scene=inventory_lab alias
src/world/fourZoneRoute.ts    + minimum I-key integration (wireInventoryOverlayKey)
src/gameplay/inventory.ts     rewritten as the compatibility adapter
```

## 3. Interaction model

**I** opens/closes the overlay from every four-zone route scene and the
Inventory Lab (TAB remains an unadvertised legacy alias for belt cycling
in RoomScene rooms only — untouched). While open: the host scene is
paused (movement stops, C/D/F/E/Space and world pointer targets are
inert), the background stays visible behind a dimmer, and resuming resets
latched key state.

Mouse: left-drag moves whole stacks (6 px threshold; translucent ghost;
reserved source placeholder; cyan valid / red invalid target highlight;
snap-back on invalid or outside drops, skipped under reduced motion);
drop-on-same-definition merges up to the maximum with the excess kept
held/at source; drop-on-different swaps; right-click takes one;
Shift+right-click takes half; Shift+click quick-transfers; double-click
consolidates partial stacks; Delete opens a confirmation (never an
immediate destroy).

Keyboard parity: arrows move a always-visible focus ring across the
grids; SPACE/ENTER pick up/place; SHIFT+SPACE quick-transfers; S splits
half; R sorts the focused ordinary container; DELETE opens the confirm;
ESC cancels a held stack first, then closes; I closes. Both input paths
call exactly the same store commands (verified by an end-state
equivalence test).

Ordinary functions: deterministic manual Sort (category → display name →
definition id → stack id; never automatic; hidden in M02/M03), storage
container side-by-side transfer, world pickup through the authoritative
service (per-stack all-or-nothing; refusals leave the bundle in the world
with clear feedback), confirmed world drops that materialise as
recoverable bundles at the player's feet, hover/focus detail panel
(name, category, quantity, description, combine compatibility), and two
non-scored demonstration recipes (Fuse Contacts ×2 + Relay Housing →
Fused Relay Cartridge; Sample Vial + Seal Cap → Sealed Sample) committed
atomically from the two-input workbench with output-capacity checked
before any ingredient is consumed.

## 4. Persistence and migration

Inventory state is module-scope (survives every scene transition; a page
reload starts a fresh session — the project's session-isolation
convention; nothing is written to web storage). `inventory-v1` snapshots
serialise the full container set with stable stack ids; loading validates
structure, definitions, and invariants and refuses malformed input with
the prior state kept. The bounded legacy shape (pre-foundation ten-slot
belt `{slots, selected_index}`) migrates into the hotbar container.

## 5. M02 / M03 separation

The inventory engine is shared infrastructure; its general telemetry is
`secondary_inventory_*` — contextual/ecological only, never primary
evidence for any item. The overlay's measurement modes use disjoint,
namespace-bound containers and objects: M02 items (12 incident sheets,
three case folders) and M03 items (five standardised residuals per
occasion) can never enter the player inventory and ordinary items can
never enter a workstation (structural guarantee in the accept rules).

- **M02** — Incident Filing Workstation: counterbalanced starting desk
  layout (`layout_a`/`layout_b`, assigned deterministically from the
  session id and recorded on the validity register and every event),
  persistently visible filing reference (clicking it records an explicit
  consult), physical drag/keyboard filing (misfiling possible — no answer
  buttons), one explicit **Commit filing state** action capturing the
  complete final placement (per-document container, misfiled/unfiled/
  untraceable counts, move and reversal counts, active time). Sort is
  absent. Family: `proto_m02_*` only.
- **M03** — two matched press-bench occasions A and B: each follows a
  real three-cycle press activity that leaves exactly five standardised
  residuals on the surface (identical recorded starting state); a
  component store exists but tidying is never instructed; closing the
  panel is departure and captures the surface exactly as left; both
  occasions complete as valid observations whether or not anything was
  stored; neither is gated on M02 or on the other. One-shot occasions;
  family: `proto_m03_*` with `opportunity_id` distinguishing A and B.

Provisional event families (NONE canonical; no CANONICAL_EVENT_CONTEXT
entries; invisible to ScoringManager, which matches exact literal names):

- `secondary_inventory_*`: opened, closed, place, quick_transfer, sort,
  consolidate, commit_recipe, discard, world_drop, add_item, world_pickup,
  world_drop_materialised, lab_entered.
- `proto_m02_*`: opportunity_opened, panel_opened, reference_viewed,
  item_moved, move_reversal, committed, panel_closed_without_commit,
  reopened_after_commit, technical_failure.
- `proto_m03_*`: press_cycle, opportunity_opened, residual_moved,
  residual_stored, surface_state_at_departure, window_closed,
  technical_failure.

Validity register usage (`src/measurement/validity.ts`, read-only import):
opportunities declared/offered at Lab entry, entered on window open,
completed on commit (M02) or window close (M03); aborts stay pending and
technical failures are marked invalid — never a low measurement. No score,
weight, threshold or trait interpretation is computed anywhere.

Design decisions taken (documented, not silently decided): quick transfer
is disabled inside M02/M03 (uniform deliberate placement, no differential
affordances); the filing reference is permanently visible with click-to-
consult instrumentation; M03 occasions are one-shot (bench reads idle
after closure).

## 6. Tests and results

All runs `--retries=0 --workers=1` on the isolated dev server
(`PW_DEV_PORT=5307`).

- `e2e/inventory_foundation.spec.ts` — **26/26 passed** (2.8 m).
  15 pure domain-invariant tests (engine imported directly) + 11
  participant-input tests driving the real UI with genuine pointer
  down/move/up and key events against probe-reported coordinates.
  Covers every §11 domain and input requirement, including mid-drag
  ghost/placeholder assertions, invalid-drop restore, keyboard/mouse
  end-state equivalence, full-inventory refusal without loss (30/30
  slots), recoverable world drop, and both recipes via the visible UI.
- `e2e/inventory_measurement_isolation.spec.ts` — **4/4 passed** (1.5 m).
  Family disjointness, counterbalance recording, sort absence, commit
  capture (misfiled=1/unfiled=10 for the scripted run), abort-stays-
  pending, M03 independence (B completed before A, before M02),
  leaving-everything-valid, no canonical scoring fields, canonical
  summary untouched.
- `e2e/inventory_visual_capture.spec.ts` — **1/1 passed**; ten frames
  committed under `docs/verification/screenshots-inventory-foundation/`.
- Post-fix-round re-run (after the consolidated review fixes):
  **31/31 passed** — foundation 26/26 + isolation 5/5 (now including the
  static canonical-registry check, the positive R-sort assertion, the
  airtight secondary-event-list checks, post-workstation summary checks,
  and the M03 proximity guard) — retries=0, workers=1, 3.7 m. Visual
  capture re-run green and all ten frames re-inspected.
- Regression: see §8.
- `npm.cmd run lint:tsc` and `npm.cmd run build` — clean throughout.
- ESLint — clean on every unit file (`npx eslint src/inventory
src/scenes/InventoryLabScene.ts src/gameplay/inventory.ts` plus the
  three specs); the repository-wide run remains dominated by the
  pre-existing worktree CRLF checkout noise (56 k `Delete ␍` findings
  across files this unit does not touch).

### Defects found and fixed during verification

1. **Phaser 3.90 keyboard queue re-emission** (real engine hazard, not a
   test artifact): `KeyboardManager.onKeyDown` processes the WHOLE event
   queue synchronously per DOM event and only clears it on POST_STEP, so
   several presses inside one slow frame re-emit every earlier event
   (diagnosed with per-event timestamp logging: 5 DOM keydowns → up to 20
   handler firings). Fix: `src/inventory/ui/keyGuard.ts` — a per-handler
   once-per-event WeakSet guard applied to every keyboard handler this
   unit adds (overlay, HotbarHud, Lab, I-key wiring). Pre-existing
   handlers elsewhere in the repo are out of scope and noted as a
   carry-forward observation.
2. **Lab walkability**: the player body (32×42) clips the row-5/row-11
   rail stubs on east-west legs at station height; a blocked walk made a
   test collect the wrong bundle. Fixes: bundles placed on the open row,
   M02 desk at x=272 and M03 bench A at x=384 (both with a full
   body-width of clearance on their approach column), and the spec walk
   helper routes through the open y=300 lane.
3. **M02 code-badge legibility / help-line overflow** (visual round):
   code badges got their own dark chip with bright ink; the help line was
   shortened to fit the panel.

## 7. Manual verification

- Every one of the ten frames was inspected individually (see §9) against
  the unit's reject checklist; two visual defects were found and fixed
  (badge legibility, help-line overflow) and the frames re-captured.
- Mouse-path playthrough and keyboard-only playthrough were performed via
  Playwright's real input pipeline (genuine pointer down/move/up and key
  events — no direct mutation calls): the mouse pass covers open → drag
  transfer → split → quick transfer → sort → craft → discard/world-drop →
  M02 filing → M03 both occasions; the keyboard-only pass covers open →
  focus navigation → pick/place → split → transfer → ESC-cancel → close
  with end-state equality to the mouse pass asserted.
- Honest limitation: no human hand physically held a mouse in this
  session. The input events are real at the browser-protocol level, but a
  human hands-on pass (feel, pacing, pointer comfort) is recommended
  before treating game-feel as signed off.

## 8. Regression

- **Four-zone route**: `e2e/four_zone_route.spec.ts` — **3/3 passed**
  (retries=0, quiet run). The `?scene=` default launch is unchanged
  (station_concourse, asserted in the foundation spec) and
  opening/closing I works in all four zone scenes (asserted per scene).
- **Legacy RoomScene + adapter**: `e2e/artifact_survey.spec.ts` —
  **3/3 passed** (direct-scene boot; exercises RoomScene creation, the
  belt HUD and `__inventoryProbe` through the compatibility adapter). A
  standalone instrumented boot of `?scene=field` (heaviest adapter
  consumer) confirmed clean creation, zero page errors and normal event
  flow, and the ice-bore prompt flow was reproduced working end-to-end
  with real input.
- **Pre-existing breakage inherited from the base commit** (NOT caused
  by this unit): every default-route journey spec —
  `field_route.spec.ts`, `inventory_prep_logging.spec.ts`,
  `coolant_yard_route.spec.ts` and kin — waits for
  `__playerProbe.scene === 'dock'` after a parameterless launch, but the
  four-zone foundation (this unit's base, f7197d0) changed the
  participant default to `station_concourse` and made the zone layer
  event-free, so `bootGame`'s event wait can never satisfy. 12 such
  tests fail identically at the base checkout semantics; this unit does
  not touch the router default or those specs. Repairing that suite is a
  follow-up unit for the route owner.
- **Known-flaky at both base and unit**: `e2e/ice_salvage.spec.ts`'s
  deck test failed/passed non-deterministically on BOTH the base
  worktree and this branch across repeated paired/solo runs (base: pass
  then fail; unit: fail in pair, pass solo). The failure mode is the
  documented `driveAxisTo` walk fragility on that terrain, not an
  inventory behaviour; the salvage prompt itself was verified working on
  this branch with real input.

## 9. Screenshot inventory

`docs/verification/screenshots-inventory-foundation/`:

| Frame                              | Content                                                                                    | Verdict                |
| ---------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------- |
| 01-inventory-open                  | Personal stores overlay, populated hotbar, focus ring, detail area                         | pass                   |
| 02-item-being-dragged              | Mid-drag ghost over valid (cyan) input slot, reserved source visible                       | pass                   |
| 03-valid-and-invalid-drop-feedback | Same drag over the insert-locked output: red invalid highlight                             | pass                   |
| 04-stack-split                     | Right-click split: source 4, held ×1, refusal feedback line visible                        | pass                   |
| 05-storage-container-transfer      | Side-by-side locker/backpack/hotbar, 20 seeded stacks, distinct panels                     | pass                   |
| 06-workbench-combination           | Inputs consumed, Fused Relay Cartridge in output, accent confirmation                      | pass                   |
| 07-m02-filing-workstation          | 12 coded sheets (layout_b order), 3 case folders, filing reference, commit button, no sort | pass (after badge fix) |
| 08-m03-reset-opportunity-a         | Post-activity surface with 5 residuals, store tray, no tidy instruction                    | pass                   |
| 09-m03-reset-opportunity-b         | Matched occasion B, identical starting state                                               | pass                   |
| 10-keyboard-focus-state            | Focus ring after keyboard navigation                                                       | pass                   |

## 10. Reviewer findings

Four independent read-only reviews were requested. The project reviewer
agents (`scientific-reviewer`, `gameplay-reviewer`, `test-reviewer`,
`visual-reviewer`) were not discoverable in this session's agent registry
(worktree session limitation — a fresh session in the worktree is needed
for direct invocation), so each review was run by a general-purpose agent
instructed to read and adopt the corresponding `.claude/agents/*.md`
brief verbatim. Findings and dispositions:

**Overall verdicts:** scientific — "no blockers as a developer-only
foundation; two majors before participant use"; gameplay — "usable with
noted friction; no blockers; no reachable item loss/duplication path";
test — "solid suite, no blockers, two majors"; visual — "readable with
noted defects; no blockers, no majors; clears the reject bar".

One consolidated bounded fix round was applied after all four reviews
(re-verified afterwards — see §6):

| #              | Finding (severity)                                                                                                                | Disposition                                                                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SCI-1          | "M02"/"M03" collide with the historical M01-M26 numbering (major)                                                                 | OPEN DECISION for the research owner (see below) — the unit contract itself mandates these identifiers, so no autonomous rename was made                   |
| SCI-2          | 'ORGANISATION PROTOTYPES' signage leaks the construct (major, dev-only today)                                                     | FIXED: neutral 'STATION 4 — RECORDS & PRESS'                                                                                                               |
| SCI-3          | M02 move/reversal counts inflated by pick-cancel cycles; move origins lost (minor)                                                | FIXED: held documents keep their last real container in the tracking baseline (cancels are no-ops; origins preserved; return-to-desk counts as a reversal) |
| SCI-5          | 'departure' close reason was dead code (minor)                                                                                    | FIXED: single 'panel_closed' close reason                                                                                                                  |
| SCI-6          | M03 fixed condition overloaded the counterbalance slot (minor)                                                                    | FIXED: register `form` + event `starting_condition` carry it; counterbalance stays null                                                                    |
| SCI-8          | Non-close() teardown skipped the M02/M03 capture (note)                                                                           | FIXED: SHUTDOWN also closes the measurement windows (idempotent)                                                                                           |
| SCI-4/7/9      | M03 instant-close semantics; session-end missingness; move≠store semantics (minor/notes)                                          | OPEN DECISION / documented (see below and §11)                                                                                                             |
| GAME-1         | Assemble/Commit/Press/reference had no keyboard path (major)                                                                      | FIXED: C activates the mode action (assemble / commit filing / run press), V consults the filing reference; help lines advertise both                      |
| GAME-2         | Stale drag flag ate the click after a cancel-drop (major)                                                                         | FIXED: the flag clears on the tick after every drag gesture                                                                                                |
| GAME-3         | Ghost vanished while a partial-merge remainder was still held (minor)                                                             | FIXED: ghost rebuilds with the remaining quantity                                                                                                          |
| GAME-4         | SPACE could slip-confirm the discard dialog (minor)                                                                               | FIXED: only ENTER (or the button) confirms                                                                                                                 |
| GAME-6         | Adapter notifies belt listeners on failed ops too (minor)                                                                         | ACCEPTED: cosmetic re-render only; documented behavioural delta                                                                                            |
| GAME-7         | Malformed v1 snapshot could carry a fractional hotbar selection (minor)                                                           | FIXED: non-integer selections load as null                                                                                                                 |
| GAME-10        | Drag-release over a button activated it; ESC mid-drag left drag state (notes)                                                     | FIXED: armed-press buttons; ESC clears drag state                                                                                                          |
| GAME-5/9/12/13 | Hotbar sort asymmetry; legacy-remove droppable coupling; zone I-key undiscoverable; stale desk verb + "chute" copy (minors/notes) | Verb + copy FIXED; the rest documented in §11                                                                                                              |
| TEST-1         | R-key sort assertion was vacuous (major)                                                                                          | FIXED: the sort test now positively asserts R sorts the focused backpack                                                                                   |
| TEST-2         | "summary untouched" unasserted after workstation activity (major)                                                                 | FIXED: asserted at the end of the M02 and M03 tests                                                                                                        |
| TEST-4         | Leak check covered only one secondary event name (minor)                                                                          | FIXED: airtight assertion — the complete secondary event list during workstation sessions is exactly the Lab-entry marker                                  |
| TEST-5         | M03 re-approach could false-pass on a failed walk (minor)                                                                         | FIXED: player-proximity (<72px) asserted before the negative check                                                                                         |
| TEST-6         | Per-zone input-resume check accepted "still blocked" (minor)                                                                      | FIXED: strict movement assertion (either direction)                                                                                                        |
| TEST-12        | Unexercised event types not covered by scoring-field checks (note)                                                                | FIXED: static assertion that CANONICAL*EVENT_CONTEXT contains no proto_m02*_/proto*m03*_/secondary*inventory*\* key                                        |
| TEST-3/9/13    | Counterbalance determinism untested; in-game-door persistence test gap; helper triplication (minor/notes)                         | Documented in §11 (multi-session design / allowlist constraint)                                                                                            |
| VIS-1          | World text bled through the 0.97-alpha panel (minor)                                                                              | FIXED: opaque panel                                                                                                                                        |
| VIS-2          | Belt name chip clipped at the panel edge (minor)                                                                                  | FIXED: chip repositioned right of the belt, fully under the panel                                                                                          |
| VIS-3          | Container vs player slots identical chrome (minor)                                                                                | FIXED: non-player grids have distinct slot fill/stroke                                                                                                     |
| VIS-4/5        | Keyboard ghost read as placed; valid-drop ring identical to focus ring (minor/note)                                               | FIXED: brighter reserved fill, raised ghost, 3px + tinted-fill drop highlight                                                                              |
| VIS-6          | Help line contrast low (note)                                                                                                     | FIXED: help line uses the brighter dim tone                                                                                                                |
| VIS-7/8/9      | Similar circular icons; clipped corner sprite in captures; M03 layout sparseness (notes)                                          | ACCEPTED / documented                                                                                                                                      |

### Open decisions for the research owner (not resolved autonomously)

1. **M02/M03 identifier assignment** (SCI-1): this unit's contract mandated
   `proto_m02_*`/`proto_m03_*` for the filing and reset prototypes, but the
   action-assessment rebuild's provisional M-battery already used M02/M03
   for other measures. Options: renumber these prototypes, record a
   crosswalk note redefining the slots, or rename the families (e.g.
   `proto_filing_*`/`proto_reset_*`). All names are provisional, so any of
   these is cheap now.
2. **M03 minimum-exposure rule** (SCI-4 / GAME M-2): a reflexive close
   seconds after the window opens currently completes the occasion as a
   valid "left everything" observation (`elapsed_active_ms` allows post-hoc
   screening). Decide: analysis-time screening vs an
   `insufficient_opportunity` threshold vs allowing re-entry until leaving
   the room.
3. **Process-count semantics** (SCI-3/9): whether M02 move/reversal counts
   and M03 "residual_moved" (which includes surface rearrangement) are the
   intended definitions before any derived indicator is ever proposed.
4. **Keyboard-modality note** (GAME M-1): keyboard parity for commit/press
   actions was added in this unit (pre-pilot, no participant data exists);
   recorded so the input-modality coverage decision is explicit.

## 11. Known defects and deferred work

- The Phaser keyboard queue re-emission hazard also affects PRE-EXISTING
  handlers (RoomScene/ZoneScene ESC, M, prompt keys). Out of this unit's
  scope; recommended follow-up: apply `guardKeyHandler` (or an upstream
  Phaser fix) repo-wide.
- Number keys 1-0 select hotbar slots in the Inventory Lab (where the new
  HotbarHud is present). Zone scenes received only the minimum I-key
  integration per the protected-map rule, so 1-0 selection and a visible
  hotbar strip are not present on the route; RoomScene rooms keep their
  existing belt + TAB.
- World drops materialise as recoverable bundles in the Inventory Lab
  (allowWorldDrop). In zone scenes the Delete flow offers a confirmed
  permanent discard only for discardable items; legacy route items are
  protected (not discardable, not world-droppable outside the Lab).
- Scene-transition persistence is exercised via the module-scope store +
  the route regression specs (items carried across rooms through the
  adapter); the Lab itself has no doors by design.
- A human hands-on playthrough is recommended (see §7).
- The three pre-existing zero-byte junk files (`cd`, `echo`, `git`) at
  the worktree root predate this unit, are untracked, and could not be
  deleted (sandbox denial). They are excluded from the commit and left in
  place.

## 12. Confirmation of what did not change

- No file under `docs/scientific/`, `docs/research/`, `docs/decisions/`,
  `docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md`, or
  `04_GLOBAL_SCIENTIFIC_RULING_VERBATIM.txt` was touched.
- EventLogger, ResearchRuntime, ScoringManager, DataQualityTracker,
  SessionState, QualtricsBridge, CanonicalEventContext,
  researchInteractions, the export/Supabase configuration, package.json,
  package-lock.json, tsconfig.json, vite.config.mts,
  playwright.config.ts, ESLint config, `.claude/**`, and
  `asset-candidates/**` are all unchanged.
- No canonical event name, scoring formula, weight, threshold, or trait
  interpretation was added, altered, or resolved. All new event names are
  provisional (proto*\*/secondary*\*) and are research-owner decisions to
  promote or discard.
- No dependency was installed; no PixelLab asset was generated or
  promoted; the four-zone map layout is unchanged except the I-key hook.
- Nothing was pushed, merged, tagged, deployed; no PR was created; no
  branch or worktree was deleted or removed.

## 13. How to launch and test

```
npm.cmd run start
# then open:
http://localhost:5173/?scene=inventory_lab

# focused suites (from the worktree root):
PW_DEV_PORT=5307 npx playwright test e2e/inventory_foundation.spec.ts --retries=0 --workers=1
PW_DEV_PORT=5307 npx playwright test e2e/inventory_measurement_isolation.spec.ts --retries=0 --workers=1
PW_DEV_PORT=5307 npx playwright test e2e/inventory_visual_capture.spec.ts --retries=0 --workers=1
```

In the Lab: walk with arrows; E/Space collects bundles and opens
stations; **I** opens the inventory anywhere (also in every four-zone
scene via the normal `?scene=` aliases); number keys 1-0 select hotbar
slots; ESC pauses to the menu.
