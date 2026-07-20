# FABLE-NEXT-08 — Rich Minigame Interfaces: verification record

Durable record of the NEXT-08 unit (contract:
`FABLE-NEXT-08-RICH-MINIGAME-INTERFACES.md`, committed at `9392e5f`),
executed on branch `fable-next-08-rich-minigames-v1` from base `9392e5f`
(= NEXT-07 baseline `758eb7d` + the committed contract). Asset set:
`outpost-assets-v2` → **`outpost-assets-v3`** (single bump in the final
commit; no participant data may be collected from intermediate NEXT-08
commits).

## 1. Phases landed

| Phase | Commit    | Content                                                       | Focused gate                     |
| ----- | --------- | ------------------------------------------------------------- | -------------------------------- |
| 1     | `78c9888` | Presentation substrate + `proc-icon-*` foundry (16 textures)  | Full suite: 104 passed (1.7 h)   |
| 2     | `7768c33` | Inventory click-select-and-place surfaces                     | inventory + breach: 11 passed    |
| 3     | `d66702c` | Systems Repair tactile panel                                  | repair: 7 passed                 |
| 4     | `9ba5324` | Side Repair fetch-fit-check tracker                           | side repair: 7 passed            |
| 5     | `ede047c` | Engineer evidence inset + record-card claims                  | engineer + calibration: 6 passed |
| 6     | —         | **DEFERRED** (optional Inventory drag — admissibility clause) | —                                |
| 7     | `00c7d5a` | Coherence/accessibility pass + reviewer-finding fixes         | 37 passed (4 rooms + UI + smoke) |
| 8     | `c44a3ab` | UI-PRESENTATION-CONTRACT §8 addendum + 4 room-doc sections    | docs gates green                 |
| Final | (below)   | `outpost-assets-v3` + this record                             | Full suite + Routes A-F          |

## 2. What shipped (participant-facing)

- **Inventory preparation**: destination stages render the station's
  existing silhouette + label and the carried item's icon row as
  redundant activators of the stow/pack option; per-item option cards
  carry item icons; checklist and bench-review lines carry item icons;
  carrying-stage bench tray (inert). No destination previews
  correctness; no tag text at destinations; SA-11 withholding intact.
- **Systems Repair**: schematic strip (slot chips + component + manual
  glyphs, static) + diagnostic readout mirroring exactly the side
  panel's two lines from shared constants; sequence-chip glyphs on
  options 1/3 (identical), manual glyph on option 2. `manualGuided`
  never rendered; manual surfaces stay toasts.
- **Side Repair**: three-tile step tracker (side-panel step strings,
  glyph-differentiated pending/current/done, inert) mirroring
  `stepsCompleted`; part icon on the fit tile while carried; step-act
  cards carry the current-step glyph; offer and defer stay plain.
- **Engineer report**: mode-help sentence in a distinct inset
  (log-extract treatment in evidence-review mode; plain otherwise),
  byte-identical text; four claim cards in an identical record-card
  treatment. No fact-grid or decomposition (Q09 substance untouched).
- **Unchanged**: every choice-card-only surface (scenario consoles ×4,
  status board, Dock/Hub/Archive/Hazard/Corridor/Final Core stages,
  duty offers), all copy, all events, all mechanics.

## 3. Mechanism (substrate)

Optional `PromptStage.presentation` consumed only by
`renderPromptStage`; absent → byte-for-byte pre-NEXT-08 rendering.
Task-surface elements (`tray`/`station`/`steps`/`schematic`), option
icons, record-card + bodyInset/bodyLineIcons header treatments, 560-640
px width clamp. Every interactive element is a redundant activator of a
declared option index converging on `selectPromptOption` (out-of-range
indices render inert — authoring guard). DEV probe
`window.__minigameSurface` (rects + participant labels + activates
index + tile state; cleared on close). `__promptCards`,
`__lastPromptBody` and every other probe shape unchanged.

## 4. Verification

Per-commit gates (all green on every commit): `lint:tsc`, `eslint`,
`build`, `node scripts/validate-traceability-matrix.mjs`,
`git diff --check`, phase-focused Playwright specs (counts above; new
tests are additive — no existing assertion weakened).

- **Route A (input parity)**: automated in all four room specs — fresh
  keyboard-only vs mouse-only sessions, full ordered stream equality on
  `event_type`/`object_id`/`attempt_number` (+ `metadata.step`,
  `success`/metadata-keys where applicable).
- **Route B (repair honesty)**: schematic label asserted byte-equal to
  the side-panel lines before/after a failing cycle; no
  manual/guid/default/revised token can appear (spec-pinned; shared
  constants make divergence impossible).
- **Route C (side repair steps)**: tile states asserted at 0/1/2
  completed steps; walk-away/defer semantics covered by the preserved
  NEXT-03 tests.
- **Route D (engineer surfaces)**: extract byte-pinned in
  `__lastPromptBody`; no surface activators on any engineer stage;
  acknowledgement identical (preserved tests).
- **Route E (telemetry invariance)**: scripted 44-event route (dock →
  inventory placement → repair fail → side repair accept+fetch(+walk-
  away) → engineer full report) captured against a `9392e5f` baseline
  server and the worktree: **zero diffs after Phase 1**; final-state
  re-run recorded below.
- **Route F (uniformity)**: scenario consoles render unenriched
  (presentation never attached to scenario stages; screenshots at the
  final state).

Full-suite runs: 104 passed at Phase 1 (1.7 h); **final integrated
state: 108/109 passed, 1 flaky (1.8 h, PW_DEV_PORT=5281)**. The one
flaky test (`scenario_calibration_logging.spec.ts:212`, an
interruption/room-exit-abandonment path on the untouched calibration
scenario console) passed on the suite's own retry and passed 2/2 on an
isolated re-run — consistent with the documented SwiftShader/headless
intermittent-keypress genre (NEXT-07 verification record), not a
NEXT-08 regression: the file it lives in is shared-room coverage for a
choice-card-only scenario console this contract never touches.

**Route E (final state)**: the same 44-event scripted route captured
against the `9392e5f` baseline dev server and the final worktree state
— **0 diffs** (event-type sequence and payload keys identical; the
only intended difference, `asset_set_version`, lives in the export
envelope, not per-event, and was not exercised by this route).

**Route F**: grep-confirmed no file under `src/scenarios/` ever sets a
`presentation` field on a scenario stage (structurally impossible for
any scenario console to enrich). Runtime-verified on the Priority
Allocation console: `__minigameSurface` null, 560 px unenriched panel,
screenshot on file — byte-equivalent in structure to the pre-NEXT-08
NEXT-06 card panel. The four minigames each carry exactly one surface
treatment plus option/inline glyphs (§5.8 equivalent-density check,
audited in Phase 7).

## 5. Deviations and deferrals (contract §8.0 "reality governs")

1. **Bench tray (Phase 2)**: the §6.1 hands-free bench tray + the 9
   mandated option cards measurably cannot meet the hard §7.4
   readability floor at 800×600 (panel bottom measured y=962 vs canvas
   600; the base stage already ends ≈y599). Adaptation: the
   icon-equipped "Take the …" cards carry the tray presentation (each
   card already contains item label + destination tag verbatim); the
   inert tray renders on the carrying stage (measured fit y=518).
2. **Phase 6 drag-and-drop: deferred entirely** under §6.1's
   admissibility clause: (a) the specified bench drag source no longer
   exists after deviation 1; (b) drag on the existing
   pointerdown-synchronous activators would require drag-threshold or
   pointerup selection — a §5.2 timing-semantic change. Click-select-
   and-place remains the primary and complete model.
3. **Phase 1 file list**: `src/world/index.ts` (barrel re-exports) was
   touched in addition to the listed files (additive types/consts only).
4. **Probe scope**: `__minigameSurface` additionally reports inert
   elements and step-tile `state` (structural metadata mirroring
   side-panel text) beyond §3.5's "activators" letter — DEV-only,
   read-only, required for glyph-state verification without pixel
   reading.

## 6. Reviewer outcomes

Review-only agents ran per the §9 cadence (Phases 1, 2, 3-4 block, 5,
7, and the final set): **no blocking finding at any phase**.
Actioned non-blocking findings: empty-tiles NaN guard (Phase 1 →
landed Phase 2), activator index validation + shared side-panel/surface
string constants + fallback-comment correction (Phases 2-5 reviews →
landed Phase 7). Carry-forwards recorded for owners: keyboard press
helper could reuse the eac3b9f verify-and-retry path in the four new
parity tests (flake-risk only — streams compare loudly); inert station
silhouettes reuse world textures that carry baked-in cyan pixels
(§3.3 coherence note, contract-sanctioned reuse); the §6.3 tracker
reveals all three step names post-acceptance (contract-specified;
recorded for research-owner awareness).

## 7. Production-asset requirements (deferred)

All NEXT-08 art is A1 procedural placeholder-tier (`proc-icon-*`
family, 16 textures, pinned by the determinism spec). The gated
external asset pass (97-candidate pack, `NOT_GENERATED`) may later
replace: item icons ×9, glyph set (slot chip, manual, component, step
states ×3, log mark), and the reused station silhouettes — each swap is
a one-line texture-key change under the frozen-stimuli versioning rule
(new `ASSET_SET_VERSION`, never mid-pilot).
