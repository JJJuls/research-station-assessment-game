# NEXT-07 visual pass — durable verification record

Status: **completed implementation record** for
`FABLE-NEXT-07-VISUAL-ASSETS-NPCS-GAME-FEEL.md` (committed at `081c417`),
executed on branch `fable-next-07-visual-prototype-v1` (isolated worktree,
base `081c417` = `fable-autonomous-game-build-v1` HEAD; `103db23` is the
telemetry/presentation comparison baseline — `git diff 103db23 081c417`
touches only the contract document, so the two are src-identical).

This document is the contract's final-commit verification record (§6
"Final commit", §12.5). The full-suite count and result are recorded in
the final commit message alongside this file.

## 1. Commits by phase

| Phase | Commit        | Scope                                                                                                                                                                                                                                                              |
| ----- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | `7c3ff8d`     | Procedural foundry (`src/world/proceduralTextures.ts`) + Boot hook + DEV determinism probe + `proc-npc-kai` person-at-console + Engineer Hub dressing/door frame + pinned determinism spec                                                                         |
| 2     | `d13b584`     | Inventory/Prep: six station-family textures + `proc-npc-vale` decor figure (unlabelled, D-N07-1) + storage dressing + door frame                                                                                                                                   |
| 3     | `90f8d1e`     | `proc-console-scenario` applied identically ×4 (Priority Allocation, Calibration Bench, Reconciliation Desk, Seal Log) — contract-authorised four-scene commit                                                                                                     |
| 4a    | `f1ca5db`     | Systems Repair: wall-console family on Panel + Manual; door frame                                                                                                                                                                                                  |
| 4b    | `3987915`     | Hazard Control: `proc-panel-warning` (the game's only amber, matte, static); door frame                                                                                                                                                                            |
| 4c    | `5ef580c`     | Interruption Corridor: `proc-beacon-comms` masts (Beacon + Antenna Junction), wall console (Relay Checkpoint); door frame                                                                                                                                          |
| 4d    | `5f7ec4f`     | Final Core: `proc-core-interface` monitor bank + status-board/racks dressing (`prop-archive-panels` skipped — standing caveat); door frame                                                                                                                         |
| 4e    | `f8f942f`     | Side Repair Bay: `proc-bot-utility` + shelf-family Parts Shelf; door frame                                                                                                                                                                                         |
| 5     | `9db9a7c`     | `RoomScene` only: nearest-eligible-in-range interaction pulse (Dock tween values 700 ms / 1→0.4 yoyo, exactly one marker, ceases when ineligible) + panel-language label chips (text byte-identical)                                                               |
| 6     | `da6295d`     | `RoomScene` + `Menu`: lineSpacing 4, toast 1600→2200 ms (display-only), 18/12 padding rhythm, status-panel rule line, pause-menu controls card (the single §4.4-authorised new participant string, mechanics-only)                                                 |
| 7     | `02639a4`     | Uniform edge vignette + uniform player drop shadow; NPC idle bob applied to **neither** figure; room ambient loops **deferred entirely** (see §5)                                                                                                                  |
| fix   | `9fa7a32`     | Archive Hub door frame — Route A final sweep found the one placeholder no phase file list covered                                                                                                                                                                  |
| fix   | `16556e2`     | Phase 7(a) vignette **deferred** (removed) — the full-suite gate surfaced SwiftShader frame-budget flakiness in the verification environment; the vignette was the largest fill-rate addition and 7(a)'s admissibility clause allows skipping it entirely (see §5) |
| fix   | `9ba7b9b`     | Deterministic settle in the shared `selectPromptOption` e2e helper (count-aware-waits discipline via the existing `__promptCards` probe) — closes the suite's documented swallowed-chained-press flake genre; no assertion, event or gameplay change               |
| final | (this commit) | `ASSET_SET_VERSION` → `outpost-assets-v2`, envelope-spec pin `v1`→`v2` (one logical change with the constant) + this record                                                                                                                                        |

## 2. Procedural texture manifest (frozen at `outpost-assets-v2`)

All generated at Boot by `ensureProceduralTextures` — pure functions of
hard-coded Polar Meridian constants, no randomness, idempotent; pinned by
`e2e/proc_textures_determinism.spec.ts`.

| Key                          | Size  | Used by                                                               |
| ---------------------------- | ----- | --------------------------------------------------------------------- |
| `proc-npc-kai`               | 64×64 | Engineer Kai station (person-at-console)                              |
| `proc-npc-vale`              | 40×56 | Quartermaster figure (non-interactive decor, unlabelled)              |
| `proc-console-quartermaster` | 40×56 | Quartermaster Console                                                 |
| `proc-console-wall`          | 40×56 | Repair Panel, Repair Manual, Relay Checkpoint (nearest-honest family) |
| `proc-rack-tools`            | 48×56 | Hand Tools Rack                                                       |
| `proc-bin-consumables`       | 48×40 | Consumables Bin                                                       |
| `proc-shelf-electronics`     | 48×56 | Electronics Shelf, Parts Shelf (family reuse)                         |
| `proc-bench-prep`            | 64×40 | Prep Bench                                                            |
| `proc-crate-fieldkit`        | 48×48 | Field Kit Crate                                                       |
| `proc-console-scenario`      | 48×52 | All four ethical-scenario stations (identical ×4)                     |
| `proc-panel-warning`         | 48×48 | Hazard Warning (only amber in the game)                               |
| `proc-beacon-comms`          | 32×64 | Comms Beacon, Antenna Junction                                        |
| `proc-core-interface`        | 64×56 | Core Interface                                                        |
| `proc-bot-utility`           | 48×48 | Utility Bot                                                           |

Committed-prop (A2) reuse added: `prop-hub-door-frame` on every
room→Hub door; `prop-archive-racks` / `prop-dock-crates` (Engineer),
`prop-dock-crates` / `prop-archive-shelves` (Inventory),
`prop-hub-status-board` + `prop-archive-racks` (Final Core). No PNG was
generated, edited, or re-generated; the 97-candidate external pack stays
`NOT_GENERATED`.

## 3. Per-commit gates

Every implementation commit passed, before moving on: `npm.cmd run
lint:tsc`, `npm.cmd run build`, `npm.cmd run lint`,
`node scripts/validate-traceability-matrix.mjs` (165 events / 33 items /
59 summary variables at every run), `git diff --check`, and its focused
Playwright specs (per §9 item 4) on an isolated dev-server port
(`PW_DEV_PORT`): Phase 1 determinism+engineer 5/5; Phase 2
determinism+inventory 9/9; Phase 3 determinism+four scenario specs 8/8;
4a 7/7; 4b 5/5; 4c 8/8; 4d 4/4; 4e 7/7; Phases 5-7
participant_ui_cards+connected_world_smoke (+determinism in 7) 8/8, 8/8,
9/9; archive fix 3/3.

**Full suite at the final integrated state:** 103 tests in 34 files
(the 102 at `103db23` + the NEXT-07 determinism spec) — **103/103
passed** (1.7 h, serial single-worker, SwiftShader). An earlier full
run had exposed the environment's swallowed-chained-press flake genre
(3 failures, all confirmed load/margin-related, none behavioural);
after the `16556e2`/`eac3b9f` fixes the suite is fully green and the
previously-flaky pilot-route full run passes 3/3 at `--retries 0`.

## 4. Manual acceptance routes (production `preview` build)

- **Route A — coherence sweep: ACCEPTED.** All ten rooms
  screenshot-swept at the final state. No placeholder rectangle remains
  on the canonical route (the sweep itself caught the Archive Hub door —
  fixed in `9fa7a32` and re-verified). Station silhouettes match the §5
  families; decor duller than interactables; door frames present; cyan
  only on interactables/guidance; amber only on the Hazard warning band;
  rooms palette-uniform with silhouette-cluster identity.
- **Route B — NPC identity: ACCEPTED.** Kai reads as a person at a
  glance (visor band, slate-teal suit, tablet, console); the
  Quartermaster figure stands beside the console, grey-green, satchel,
  unlabelled, neutral pose, no cyan, clear of approach corridors. Both
  figures are static textures with no state-dependent rendering — no
  visual reaction to any report choice or prep cycle is structurally
  possible; the report and per-item flows were exercised green in the
  focused specs.
- **Route C — uniformity and guidance: ACCEPTED.** All four scenario
  consoles runtime-confirmed rendering the identical texture (zoomed
  screenshots of all four; identity is also structural — one texture
  key, no per-room parameters). Pulse: pixel-diff evidence shows the
  nearest in-range marker animating (863/2400 px changing across
  350 ms), a static marker out of range (0/2400), and — after an
  approach-then-retreat — a stopped marker byte-identical to the
  never-pulsed reference (alpha fully restored). While a prompt is
  open the station-label layer is hidden entirely, so no pulse can
  render. No animation anywhere strobes or uses amber outside Hazard;
  the only tweens in the game are the Dock marker and the Phase 5
  pulse (both 700 ms alpha yoyo).
- **Route D — telemetry invariance: ACCEPTED.** Fixed scripted route
  (Dock check-in → Engineer report path 6a → priority-allocation
  scenario → Hazard informed path) driven by a temporary capture spec
  (archived out of the suite after use). Baseline captured from the
  main checkout at `081c417` (src-identical to `103db23`). Diff of
  event-type sequence + sorted payload keys per event, at Phase 5,
  Phase 6, Phase 7 and the final bumped state: **37 events, zero
  differences every time**. `asset_set_version` appears only in the
  export-payload envelope (`ResearchRuntime.buildExportPayload`), so
  the completed baseline differs from `103db23` in exactly that single
  envelope value (`outpost-assets-v1` → `outpost-assets-v2`) — §10's
  tolerated diff — and in nothing else. Re-confirmed after the
  post-suite fixes at the fully integrated final state: 37 events,
  zero diffs.

## 5. Deferrals and resolved defaults

- **Phase 7(a) uniform vignette — implemented, then deferred** (removed
  in `16556e2`). The final full-suite gate surfaced intermittent
  swallowed-key-press failures in the SwiftShader (software-GL)
  Playwright environment. Systematic investigation — A/B against a
  `103db23`-equivalent baseline (3/3 pass at `--retries 0`), per-commit
  trials (phase 6 tree 2/3; integrated tree worse), DOM-level key
  capture (presses arrive; the game's chained stage render races the
  next press under long frame times), and instrumented replays —
  showed NEXT-07's added draw load shifted the environment's frame-time
  margin without any behavioural change (Route D event streams stayed
  byte-compatible throughout). The vignette, a full-screen
  alpha-blended quad, was the single largest fill-rate addition;
  Phase 7(a)'s own admissibility clause ("skipped entirely if…")
  covers removal, and uniformity is preserved by absence. The
  remaining margin sensitivity was closed on the test side
  (`9ba7b9b`), where the fragility lives.
- **Phase 7(c) NPC idle bob — applied to neither** (contract
  alternative): keeps every interactable surface unanimated and both
  figures under identical treatment.
- **Phase 7(d) room ambient decor loops — deferred entirely**: Systems
  Repair, Hazard Control, Interruption Corridor and Side Repair Bay
  contain no non-interactive decor element, so the required
  equivalent-density treatment cannot exist across all canonical rooms
  without inventing new decor; the contract mandates full deferral over
  any partial subset.
- **D-N07-1 (no "Quartermaster Vale" label)** and **D-N07-2 (no
  completed-station suffix)** implemented as resolved: "Vale" exists
  only as an internal texture-key name; the settled state is the
  absence of the pulse.
- **Phase 7(a) vignette retained** — legibility review found the edge
  falloff subtle (≈7% per channel at the extreme edge, zero at centre);
  labels/panels render above it.

## 6. Reviewer outcomes (review-only agents, per §9 cadence)

- Phase 1: gameplay + browser-qa — no blocking findings (notes:
  re-run hygiene when tree carries WIP; debug-API smoke folded into the
  final routes).
- Phase 2: gameplay + browser-qa — PASS (notes: screenshot evidence not
  archived in-repo — consistent with prior NEXT practice; Vale/console
  12 px clearance confirmed visually).
- Phase 3: gameplay + browser-qa + research-data — PASS (closure-safety
  of the in-place `config.texture` pattern verified; carry-forward: the
  scenario specs do not exercise the reopen-after-commit recovery path —
  pre-existing coverage blind spot, recorded for the test owner).
- Phase 4 block: gameplay + browser-qa — PASS, no findings (determinism
  manifest re-pin verified at every commit).
- Phase 5: gameplay+research-data — PASS; browser-qa — verified; its
  residual-risk items (alpha reset, multi-station, prompt-open
  cessation) were closed by the Route C evidence above.
- Phase 6: all three roles — PASS (notes: toast/prompt co-location at
  y=72 is pre-existing; no automated guard on the controls-card wording
  — follow-up candidate for the test owner).
- Phase 7: all three roles — PASS.
- Final integrated state: full three-reviewer set run at the final
  commit (results in the final report; no unresolved blocking finding).

## 7. Deferred external-asset requirements (gated backlog, unchanged)

Everything in §6 "Explicitly not scheduled" remains deferred and
untouched: all PixelLab batches (97 candidates `NOT_GENERATED`,
`human_approval: PENDING`), real NPC sprite passes (`npc-kai-v1`,
`npc-quartermaster-v1` remain the highest-value gated items — the
procedural figures are documented placeholder-tier stand-ins), audio,
minimap, Evidence Ledger, Records Officer / MERIDIAN embodiment,
diagonal player frames, status-board content (S1/ADV-5), requisition
display (SA-11), Tuxemon disposition. Open decisions SA-8..SA-11,
D2-D8, INT-1..6 were not touched.

## 8. Stimulus governance

`ASSET_SET_VERSION` was bumped exactly once, in the final commit
(`outpost-assets-v1` → `outpost-assets-v2`). **No participant research
data may be collected from intermediate NEXT-07 development commits**;
only the completed, version-bumped baseline is a valid stimulus set, and
it must land before any pilot data collection starts or between studies
(§4.8/§4.9).
