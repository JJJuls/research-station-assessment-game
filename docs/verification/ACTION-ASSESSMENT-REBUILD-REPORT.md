# Action-assessment rebuild — implementation and verification report

Session: autonomous Fable rebuild (2026-08-08/09).
Branch `fable-action-assessment-rebuild-v1` (worktree
`.claude/worktrees/fable-action-assessment-rebuild`), base `ef47263`.
Nothing was pushed, merged, tagged, deployed or removed; no worktree or
branch was deleted; the pixelab-v1 pack and all protected files are
untouched.

## 1. Commits

| Commit    | Unit | Scope                                                                                                                                                                                                                                                     |
| --------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `a85b5e2` | 1    | C/D/F/E action language, arrows-only movement, ESC-cancellable world actions, FieldActionController + `__actionHints`, ControlsReference (H toggles), Field terrace C/D/F redundant activators. 10 files.                                                 |
| `e1af2bc` | 2    | Coolant Yard + Pump House shell, free C-scan (weak/actionable geometry), fixed 6-deposit dig deck, M23 frozen-coupling extraction, M26 reclaimed-sector window, `driveAxisTo` observed-motion fix. 20 files.                                              |
| `39a7569` | 3    | M13 manifold puzzle (3×3 trench, broken centre, standardised 9-piece set, drag/rotate + full card equivalence, connectivity validation), M18 counterbalanced diagnosis, M22 seal setback/recovery. 14 files.                                              |
| `ee8031b` | 4    | Recycler rig (raw winch cast), M24 counterbalanced 6-pull cosmetic deck + objective exhaustion + acknowledged window, M25 pump interlock, reclaim-credit chip, seat-stage 9-option overflow fix, empty-feedback fix, label-driven spec helpers. 16 files. |
| `4e21aaf` | 5    | PixelLab v1 player frame swap + Vale/Kai/Noor stills, ASSET_SET_VERSION v4, pixelab-v2 batch (6 generated / 0 promoted, dispositions recorded), provenance doc, interact-prompt clamp + NPC name contrast fixes. 82 files.                                |
| `4d67220` | 6    | Loop B restoration task chain (milestone objectives), conditional Final Core coolant gate, complete-first-shift route spec (green at retries=0, milestone-order + duration assertions). 6 files.                                                          |
| `<unit7>` | 7    | This report, rebuild screenshots, sweep results.                                                                                                                                                                                                          |

Exact changed-file lists: `git show --stat <commit>`.

## 2. The playable route (first shift)

Dock check-in → Hub: Vale's requisition (scanner/spade/case collected
physically) → Survey Terrace (existing survey route remains available)
→ east gate → **Coolant Yard** → **Pump House**: pressure fault + work
order (arms the route gate) → yard survey sector: free C-scans
(no-signal / faint-with-bearing / actionable-stake), D-digs with
terrain change and the controlled yield deck (2 pipe segments, elbow,
ore, scrap, empty) → supply crate (heat canister, pry bar) → **M23**
frozen coupling (visible 0-100 progress; dig always works, heat/pry
genuinely help) → Pump House trench: **M13** manifold reconstruction
(drag/rotate or Trench Console cards; connectivity-validated
submission) → **M18** diagnosis (fixed evidence, counterbalanced
options, one-shot) → prescribed fix → **M22** standardised setback
(shop seal cracks; fresh seal in the yard crate) → **M25** pump
restart (3 useful primes → salient interlock → visible breaker reset)
→ four station decisions (existing) → **Final Core**: blocked while
Loop B is open (once the work order was read), completes after the
restart. Optional, non-gating: **M24** recycler rig (F-key
electromagnet casts, cosmetic reclaim credits, objective exhaustion →
acknowledged window), **M26** reclaimed sector, Ridge Annex, ice-bore
free play (still post-assessment locked).

Guidance: persistent duty-roster line (untouched), live quest line
through every coolant milestone, contextual C/D/F hint chips only when
an action is eligible, controls legend (H), nearest-target pulse +
name chips, neutral refusal feedback everywhere; no scores, no trait
feedback, no questionnaire wording anywhere player-facing.

## 3. Mechanics implemented

- **C scan**: player-position sweeps inside staked sectors (rig sonar
  at the exhausted catchment); truthful sweep radius; deterministic
  fixed deposit geometry; scans outside scored windows stay unscored.
- **D dig**: reach + spade required; timed action, spoil/terrain
  change; controlled deck incl. an empty pocket; neutral
  invalid-location feedback; ESC-cancellable; shutdown-safe.
- **F winch**: full embodied cast (lower → tension band → hook →
  reel); raw variant keeps the ice-bore free-play byte-identical.
- **Inventory**: 10-slot belt, TAB cycling, pointer selection, real
  pipe/tool/component objects, full-belt refusals, survives scene
  transitions (module scope).
- **Drag/drop**: PhysicalManipulationLayer for the manifold bench →
  mounts, click-rotate on seated pieces, keyboard card equivalence for
  every manipulation (seat/rotate/return/submit), no auto-completion.
- **E/Space** interact alias; **ESC** cancel-then-pause; arrows-only
  movement (letters freed for actions — an input-contamination guard).

## 4. Measurement snapshot (M01-M26) status

All new modules are provisional (`proto_m<NN>_*`, item-local state,
SA-13 validity register, no canonical names, no scoring, no composite,
no "good player" score). The M↔Q crosswalk is an OPEN research-owner
decision; nothing here claims Q-item identity.

| M       | Status this session                                                                                                                                                                                                                                                                           |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M01/M02 | Preserved (existing inventory-prep flows, untouched).                                                                                                                                                                                                                                         |
| M03     | Preserved (Q03 module, untouched).                                                                                                                                                                                                                                                            |
| M04     | Preserved (Q04 module, untouched; salience-confound fix deliberately deferred — it would alter a committed Q04 stimulus; research-owner call).                                                                                                                                                |
| M05-M12 | Preserved as existing canonical-room flows (dock/engineer/archive/repair/hazard etc.); no new modules.                                                                                                                                                                                        |
| M13     | **Implemented** — `m13PipePuzzle.ts` + ManifoldTrench (owns placement/rotation/removal/submission only; standardised complete piece set at every window start).                                                                                                                               |
| M14-M17 | Still missing → questionnaire-primary for now (recorded; no BESSI-IP analogue existed and none was invented).                                                                                                                                                                                 |
| M18     | **Implemented** — `m18Diagnosis.ts` (evidence checks + one-shot counterbalanced diagnosis; independent of M13 success).                                                                                                                                                                       |
| M19-M21 | Preserved (existing repair/archive persistence flows).                                                                                                                                                                                                                                        |
| M22     | **Implemented** — `m22Setback.ts` (standardised external seal failure; recovery route always open; leaving recorded neutrally).                                                                                                                                                               |
| M23     | **Implemented** — `m23Excavation.ts` (hard-but-attainable; strategy kinds + effectiveness recorded; ineffective acts are contrast facts, never adaptive persistence).                                                                                                                         |
| M24     | **Implemented** — `m24SalvageExhaustion.ts` (counterbalanced cosmetic deck; exhaustion by construction — no post-deck reward possible, jackpot included; comprehension-gated acknowledgement opens the window; only post-ack identical casts are evidence; stop/continue equally accessible). |
| M25     | **Implemented** — `m25PumpLock.ts` (3 useful cycles, salient lock, identical lock statement per unchanged press, visible different strategy).                                                                                                                                                 |
| M26     | **Implemented** — `m26DepletedField.ts` (demonstrated scan/dig first; certificate + own verification scan + explicit acknowledgement; only post-ack in-bounds acts are evidence; pre-ack and whole-map actions excluded).                                                                     |

**Item-locality proof**: each module has its own state container,
opportunity id, entry-state version and `proto_m*`-prefixed event
family; specs assert no `study_item_ids`/`construct_id` on any
provisional event, disjoint families, strict window ordering, and
independence (e.g. no M13 act after the M18 window opens; no ice-deck
`proto_salvage_*` in M24 runs; no M24/M25/M26 cross-events). Failures/
absences are validity-register states (invalid/missing), never low
scores. Rewards are cosmetic credits only and gate nothing scored.

## 5. Assets

- Promoted (PROVISIONAL MODEL-SELECTED, NOT HUMAN-APPROVED —
  `docs/game/PIXELLAB-RUNTIME-ASSET-PROVENANCE.md`): plv1-player-a
  walk/idle/rotations (56 frames, pixel-exact slices), Vale/Kai/Noor
  stills (11 crops) under `public/assets/pixellab-runtime/npcs`.
- Generated this session: 6 pixflux candidates (seeds 4101-4106) into
  `asset-candidates/pixelab-v2/raw` — 0 promoted (edge-geometry /
  perspective / palette dispositions recorded). Quota: 1631 remaining
  at session start; 6 used (cap 240). pixelab-v1 pack untouched.
- New procedural textures: yard/pump-house props, pipe pieces, slots,
  relief valve, diagnostic board, recycler rig, 8 item icons — all in
  the deterministic foundry + pinned manifest.

## 6. Verification

- `npm.cmd run lint:tsc` — pass (throughout; final run below).
- `npm.cmd run build` — pass (final run below).
- `git diff --check` — clean (final run below).
- Focused new specs (all green at retries=0 before their unit commits):
  `action_foundation`, `coolant_yard_route` (2), `pipe_diagnosis_setback`
  (2), `magnet_salvage_ip` (3), `complete_first_shift` (1, 7.8 min),
  `proc_textures_determinism` (2).
- Full-suite sequential sweep (one worker, retries=0 first pass):
  results in §7.
- Route duration: automated full first shift completes in ~8 minutes
  of wall time with every event stamped `elapsed_seconds` (asserted
  < 1800 s). Human-pace design estimate for the required spine:
  ~24-28 minutes (automation removes reading/deliberation time;
  the prior pilot route measured ~8-12 min human at ~199 s automated,
  a ×2.5-3.5 factor that puts this route inside the 24-28 target and
  under the 30-minute ceiling; human timing pilot still required).

## 7. Full-sweep results

Complete suite, sequential, one worker, **retries=0 first pass**:
**148 passed / 13 failed** of 161 tests (3.1 h wall). Honest
classification of the 13, with targeted re-runs:

- **1 deterministic regression, fixed**: `research_export_test_mode`
  pinned `asset_set_version: outpost-assets-v3`; the Unit 5 bump to v4
  broke it. Pin updated (the documented deliberate-diff procedure);
  re-run green.
- **4 of ours, non-deterministic (re-run green)**: `magnet_salvage_ip`
  ×2 and `pipe_diagnosis_setback`'s browser chain (chained-card
  stage-transition races under SwiftShader; the same product chain
  passes in `complete_first_shift` and in the targeted re-runs). The
  diagnosis pair got the staged replay defence; re-verified green.
- **8 pre-existing flaky families** (all present in the
  physical-mechanics baseline sweep, which recorded 11 intermittent
  failures and zero deterministic product regressions):
  `connected_participant_journeys` P1, `engineer_hub_logging` NEXT-08
  surfaces, `ice_salvage` locked/deck + `visual_physical_capture`
  ice frames (the documented ice-approach cluster; the deck test
  passed on re-run, confirming the Unit 4 winch refactor preserved
  free-play semantics), `inventory_prep_logging` NEXT-08 coherence,
  `participant_ui_cards` ×2, `repair_tool_retrieval` Q03 (the
  documented selectPromptOption double-advance retry hazard — the
  received prompt body shows the follow-up stage, the exact failure
  mode annotated inside that helper).

No new deterministic product-code regression remains. Measurement-
boundary specs (`measurement_boundaries`, `route_g_telemetry`,
adversarial set, scenario set) all passed first-attempt.

## 8. Screenshots

- `docs/verification/screenshots-rebuild/01-07*.png` — coolant yard
  overview, reclaimed sector, frozen housing, recycler rig, manifold
  trench/bench, work-order card, pump-house stations.
- Refreshed capture sets from the existing visual specs (player/NPC
  art now the promoted PixelLab candidates).
- Findings from inspection: new player/NPC art renders correctly
  (hub verified at full resolution mid-session); controls legend,
  clamped interact prompt and inventory belt all visible; Vale under
  the hub light pool is slightly washed (cosmetic); the Coolant Yard
  reads functional but sparse (sector posts subtle against snow — a
  future density/marking pass would help); quest line correctly shows
  the coolant directive on yard entry.

## 9. Remaining gameplay defects

- Q04 mess salience confound (deferred deliberately — stimulus change
  needs research-owner disposition).
- HUD objective line can still truncate at ~2 lines of text; card
  panel/right status panel overlap cases from the earlier audit remain
  in some rooms; Ridge Annex density unchanged.
- Vale/Kai/Noor use single-frame stills (no walk/turn animation);
  player action sheets (scan/dig/carry) not yet wired into Player
  animation states.
- M24 rig/M23 housing keep procedural art (pixelab-v2 candidates
  rejected on technical grounds).
- Duty-roster HUD line does not mention the coolant line (kept frozen
  to protect legacy spec assertions); guidance rides the quest line.

## 10. Remaining scientific decisions (none resolved autonomously)

- The M01-M26 ↔ Q-item crosswalk (and whether `proto_m*` families map
  onto any tier-3/tier-4 names) — research owner.
- M14-M17 (BESSI information processing) have no gameplay analogue.
- Duplicated construct surfaces awaiting disposition: M23 yard
  extraction vs the existing Q23 intake rig; M24 recycler exhaustion
  vs the existing Q27 utility-stop module (both old modules preserved
  untouched and reachable; the new route directs participants to the
  new surfaces only).
- Q04 salience fix; burden envelope (14-18 vs 20-30 min); all
  carried-forward audit findings from the physical-mechanics report.
- The Final Core coolant gate's conditional design (armed only by
  reading the work order) — flag for research-owner review as a route
  standardisation decision.

## 11. Reproduction

- Launch: `npm.cmd run start` → `http://localhost:5173/?scene=dock`
  (full shift) or `?scene=coolant_yard` / `?scene=pump_house` direct.
- Focused verification:
  `PW_DEV_PORT=5201 npx playwright test action_foundation coolant_yard_route pipe_diagnosis_setback magnet_salvage_ip complete_first_shift --retries=0 --workers=1`
- Full sweep: `npx playwright test --retries=0 --workers=1` (chunked).
