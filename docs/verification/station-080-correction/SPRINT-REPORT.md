# Station 080 correction sprint — report (session 1, 2026-09-18)

Fable. Branch `fable-professional-world-rescue-v2`, worktree
`.claude/worktrees/fable-professional-world-rebuild`, from `882189a`
(verified: branch, exact HEAD, ancestry, clean tree, no git lock, no
foreign node / vite / headless browser). Nothing pushed, merged, tagged,
deployed or deleted; no asset frozen, no asset-set version bumped, no open
scientific decision resolved, **no PixelLab generation spent** (the brief
did not name PixelLab and CLAUDE.md requires explicit standalone approval —
every art change is reproducible Pillow work on the existing paintings or
engine-side layering; register R13).

This is an **internal / supervised evaluation build**. It is **not
production-ready**: no configured synthetic end-to-end submission exists in
this checkout, the scientific blockers in `OWNER-DECISION-REGISTER.md` are
open, and the items under "Not done" below remain.

## Commits

| Commit    | Content                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------- |
| `33f913c` | feet-sized body, wall skirts, pixel solids, NPC solids, DEV overlay, audit spec; Dock + Concourse fixes |
| `107c1b1` | Workshop: sealed shutter, layered vestibule, supply sprites, item depth, bundle reach                   |
| `13a2fec` | export: absent is never zero, schema/scope versions, fresh keep-alive, reload record; registers         |
| (final)   | Yard uplink rack solid, contextual readout chips, manifest provenance, evidence, report, handoff        |

## A. Screenshot-confirmed defects

| #   | Defect                       | Status               | What changed                                                                                                                                                                                                                                                       |
| --- | ---------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Dock steam rectangle         | **fixed**            | the light spill was a flat ADD `rectangle` and the puffs flat ellipses; both now use one generated soft radial texture whose alpha falls to zero at the rim (normal blend for steam, ADD for the glow) — no sprite boundary on any floor tone / power state        |
| 2   | Dock north door levitating   | **fixed**            | the leaf was a sprite drawn in the pipe band 40 px above the deck; it is now painted into the wall on the wall base (lamp and cone painted out), threshold in the plate's own light pool, walkway lines leading to it; anchor y 64 → 100, approach at the sill     |
| 3   | Concourse locker-top / desk  | **fixed**            | the "object on the lockers" was the storm-damage decal pair placed on the locker fronts → moved to the deck; skewed radio side-table painted out (lane under the desk opened); desk, tables, lockers, board, coils get pixel solids; Vale collides; gauge grounded |
| 4   | Workshop false doorway       | **fixed**            | sealed service shutter (slats, hazard sill, no-entry plate) inside the painted frame                                                                                                                                                                               |
| 5   | Workshop arch / layering     | **fixed**            | wall faces north of the sills collide; the wall mass between the sills is a runtime foreground layer with both door openings cut out, shown while the avatar's feet are between the sills; regression spec                                                         |
| 6   | Workshop floor crates        | **fixed**            | three distinct painted containers + relay unit (`scripts/world-v2/paint_props.py`), grounded shadows                                                                                                                                                               |
| 7   | Workshop loose objects       | **partly**           | loose objects now sort at their foot line (they floated above the avatar); their icons are still the inventory icon set — world-native item sprites not drawn yet                                                                                                  |
| 8   | Recovery Yard scale/identity | **NOT DONE**         | see "Not done" — needs a new open-exterior plate (R13) and a re-derivation of every yard site, the M23 plot and the yard drivers                                                                                                                                   |
| 9   | Yard uplink stand-inside     | **fixed (collider)** | the painted uplink rack had no collider; pixel solid added. Finding for the rebuild: the registry's Post A / Line Panel / Post B anchors do not match the painting (one rack = two antennas + panel) and the "line panel" cells collide where nothing is painted   |

## B. Room scale

Not enlarged this session. What changed the cramped feel without new art:
the feet-sized body (the avatar now walks ~28 px closer to everything
south of it and through every gap its feet fit), precise prop colliders,
and the removed Concourse side-table. Enlarging rooms means larger painted
plates — R13.

## C. Collision and depth — see `COLLISION-AUDIT.md`

## D. UI

- World readout chips are contextual: one at a time, the nearest within
  120 px, only when the whole text is inside the view — fixes the Mast 04
  overflow and the stacked state strips (Yard, Workshop, Deck, Lab use the
  same `clampWorldReadouts`). Texts and probes unchanged.
- Not done: prompt / notification arbitration review, small-text pass at
  1280×720, work-surface material pass.

## E. Scientific coverage — see `OWNER-DECISION-REGISTER.md` §0

No missing item was wired into the participant route: under a strict
reading no such integration is fully determined by owner-approved
documents (M battery unruled, SA §14 approves measurement design only,
candidate `proto_*` names, slot/budget unruled, duplicate instruments).

## F. Export / persistence — see `EXPORT-AND-PERSISTENCE.md`

## G. Verification (sequential, one server, one browser, one worker)

All browser runs were detached, sequential, `--workers=1`, one Vite on
port 5341 started and stopped by Playwright per run, no `src/` or
`public/` edit while a run served. SwiftShader software GL; wall times
are automation figures only.

| Group                | Suite                                                                                                                                        | Result                                                                                                                                                                                                                                                                               | Wall                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| Gates                | `tsc --noEmit` · `vite build` · ESLint + Prettier on every touched file                                                                      | pass                                                                                                                                                                                                                                                                                 | —                     |
| Pure                 | `world_v1_registry`, `spawn_clearance`, `pilot_route_model`, `pilot_exterior_models` (new body model + solids)                               | 49/49, then 41/41 with the yard solid                                                                                                                                                                                                                                                | 9–11 s                |
| Pure / export        | `summary_scope` (new)                                                                                                                        | 5/5                                                                                                                                                                                                                                                                                  | 8 s                   |
| Pure / export        | keep-alive freshness (new, in `participant_completion_handoff`)                                                                              | pass                                                                                                                                                                                                                                                                                 | 7 s                   |
| Collision            | `collision_audit` Concourse (1280×720)                                                                                                       | 44/44 solid faces ≤ 3 px; 1 sweep flagged = gauge-edge graze + model rounding (classified in `COLLISION-AUDIT.md`; spec corrected, **not re-run**)                                                                                                                                   | 16.2 min              |
| Collision            | `collision_audit` Dock (1280×720)                                                                                                            | **1/1** — every face and sweep ≤ 3 px, spawn reachable                                                                                                                                                                                                                               | 9.7 min               |
| Room                 | `world_v2_vestibule_look` (new) + registry                                                                                                   | **24/24**                                                                                                                                                                                                                                                                            | 55 s                  |
| Export / persistence | `research_export_test_mode`, `state_session_continuity`, `participant_completion_handoff`, `summary_scope`                                   | **36 passed, 1 flaky-pass**: the browser keep-alive test (`:1042`) captured no request within 10 s on attempt 1 and passed on the retry — keep-alive delivery after navigation is timing-sensitive under the software renderer; the freshness rule itself is proven by the pure test | 15.5 min              |
| Full route           | `pilot_route`                                                                                                                                | **4/4**                                                                                                                                                                                                                                                                              | in the 33.1 min queue |
| Interaction          | `world_v1_interactions`                                                                                                                      | **3/3**                                                                                                                                                                                                                                                                              | 〃                    |
| Room                 | `world_v2_workshop_look` (15 stations, vestibule both ways) · `world_v2_yard_look` (12 sites, drift pass, airlock) — after-frames in `look/` | **1/1 · 1/1**                                                                                                                                                                                                                                                                        | 〃                    |
| Workshop windows     | `pilot_records`                                                                                                                              | **5 passed, 1 flaky-pass**: test 2 stalled once on the island north-lane climb at (373,174) on attempt 1, passed on retry — not reproduced, not explained; listed as a risk (first suspect: the 14 px feet box against Phaser tile separation bias at low frame rates)               | 〃                    |

**Not run this session (UNKNOWN, not green):** `pilot_yard`, `pilot_lab`,
`pilot_deck`, `pilot_return`, `pilot_signal_incident`,
`pilot_exterior_isolation`, `concourse_interaction_lifecycle`,
`presentation_integration`, `m02_overlay_proof`, `world_v1_camera`,
`world_v1_story`, the lab / deck / core look tours, `persistence_physical`,
`adversarial_reload_partial_state`, `v4_event_projection` (so: **no
projection was regenerated — the rebuilt geometry's event-identity
neutrality is asserted by construction only, not yet by projection**),
every legacy-route suite (the body change is global: legacy rooms keep
their cells + skirt, vertically identical, 5 px narrower per side), the
route capture / video, and every 1920×1080 run.

## Not done (candid)

- **Recovery Yard rebuild (A8)** — the largest item. Design for the next
  unit: a ~56×22-tile open field; north = the plate's own storm horizon
  band, tiled; south = the station hull with the airlock, extended only
  across the apron, the rest bounded by snowbanks / rock / fence runs; the
  drift-bank "pines" of the old seam reused as east/west boundary dressing;
  props keyed out of the two generations and redistributed with real lanes;
  Post A / panel / Post B re-anchored on the painted rack; every yard site,
  the M23 plot origin, `yardVia` and the exterior model literals
  translated together. Best done with a PixelLab exterior plate (R13).
- Lab / Deck / Core / Yard-east prop colliders still cell footprints.
- 1920×1080 runs of the new specs; matched before/after pairs for every
  defect (before = `professional-world-rebuild-v3/route/1280x720/`, after =
  this directory — not yet paired position-for-position).
- Reload-during-open-window and page-hide browser specs beyond the
  existing suites; optional-task refusal / partial-completion route sweep.
- `docs/research/scoring-plan.md` §6 still says the bridge "serializes the
  whole summary object" — the file is write-protected for the agent; the
  one-paragraph correction is in `EXPORT-AND-PERSISTENCE.md` §1 for the
  owner to paste.

## Session 2 (2026-09-19) — PixelLab authorised; Yard rebuilt; remaining rooms; verification

Continuation from `bde6928` (state verified first: branch, HEAD, clean
tree, no lock, no foreign node / browser). Owner ruling at the start of the
session: PixelLab explicitly authorised for the Recovery Yard rebuild,
enlarged room artwork and replacement world sprites (register R13). Nothing
pushed, merged, tagged, deployed, frozen or promoted; no open scientific
decision resolved; asset-set version not bumped.

### Commits

| Commit     | Content                                                                                             |
| ---------- | --------------------------------------------------------------------------------------------------- |
| `7231845`  | Laboratory, Utility Deck, Core: props collide on pixel solids                                       |
| `478199e`  | Recovery Yard rebuilt as one open 1792×768 exterior field; prop sprites; anchors on painted objects |
| `0b35ab91` | world-native M04 debris sprites; workshop lane-climb verification in the driver                     |
| (final)    | evidence, projections, report, register, handoff                                                    |

### What changed

- **Recovery Yard (A8, A9) — done.** One open field (56×24 tiles, ~3.3×
  the old floor) instead of two framed room plates and a pass: storm ridge
  north, fenced banks east / west, station roof with the airlock alcove
  south; continuous camera travel. Every prop is a free-standing sprite
  sorted at its foot line with a pixel solid at its base (the avatar walks
  in front of and behind the mast, gantry and rack, never inside them).
  **Anchor / art / collider mismatches resolved:** the uplink line's Post A,
  Line Status Panel and Post B now stand ON painted objects (post — panel
  rack — post, 95 px spacing kept); the phantom "line panel" cells are
  gone; the coupling and the whole rig compound are rigid translations of
  the V2 painting (their window-internal walking distances are unchanged);
  the M23 plot moved with the room (size 7×6 and both relative target cells
  unchanged; model literals translated; 12/12). Art provenance:
  `docs/game/world-v3/YARD-ART-PROVENANCE.md`.
- **Remaining rooms (C) — done for colliders.** Laboratory, Deck and Core
  props collide on pixel solids; with Dock, Concourse, Workshop vestibule
  and the Yard every participant room now uses the feet-box model with
  painted-footprint colliders. All seven rooms are in the real-input
  collision audit.
- **Loose objects (A7) — done for the participant route.** The M04 debris
  are world-native sprites (they borrowed unrelated inventory icons).
- **Room enlargement (B) — NOT done for interiors** (register R15): each
  enlarged interior is a new plate plus a full re-derivation of the room's
  book and drivers — one bounded unit per room; the yard proves the method.
- **Stall investigation.** The one unexplained stall of session 1
  (`pilot_records` test 2, (373, 173.58)) is classified **driver stall-rule
  misfire in a slow-frame episode**, not a collider: the stop coordinate is
  fractional, and every collider edge in the model is an integer, so the
  avatar stopped because the key was released; the eastward leg then met
  the cutter island (feet bottom 197.6 > island top 192). `workshopVia`
  now verifies the lane climb. The suite passed 5/5 on first attempt in
  this session. The session-1 keep-alive flaky-pass
  (`participant_completion_handoff:1042`) was NOT re-run this session and
  stays listed as unexplained-but-passing-on-retry.
- **Science / export:** no new change; R1–R12 stay pending. The full-route
  projection proves the rebuilt world changed no event identity (below).

### Verification (frozen runner copy, one server, one browser, one worker)

Every browser run used a frozen copy of the tree (`%TEMP%/s080-runner`, a
plain copy with a `node_modules` junction — not a git worktree), one Vite,
one SwiftShader browser, one worker, strictly sequential. Wall times are
automation figures. The tree verified is the committed tree (the runner was
re-synced after each code commit; the last product change is `c8dfd52d`).

| Group                                                                            | Suite                                                                                                                                                                                                                                                                                                                       | Result                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gates                                                                            | `tsc --noEmit` · `vite build` · ESLint + Prettier on touched files                                                                                                                                                                                                                                                          | pass                                                                                                                                                                                                                                                                                                                                                                               |
| Pure                                                                             | registry, spawn clearance, route model, exterior models (12/12 after the plot translation), `summary_scope`, `nav_grid`, `nav_grid_hug`                                                                                                                                                                                     | pass                                                                                                                                                                                                                                                                                                                                                                               |
| Queue A (before the Yard / Lab / Deck / Core / Workshop collider commits; 1.3 h) | corrected Concourse audit, `pilot_lab` 3, `pilot_deck`, `pilot_return` 3, `pilot_signal_incident` 2, `concourse_interaction_lifecycle` 3, `presentation_integration`, `m02_overlay_proof` 2, `world_v1_camera` 3, `world_v1_story` 3, lab / deck / core tours, `persistence_physical` 3, `adversarial_reload_partial_state` | **37 passed, 1 flaky-pass** (`pilot_return` test 1: a 20 s bench wait on attempt 1), **1 environment failure** (`presentation_integration` provenance test: the docs file it reads was not in the runner copy — not a product result)                                                                                                                                              |
| Yard measurement paths                                                           | `pilot_exterior_isolation` 2/2 · `pilot_yard` tests 2 and 3 pass · `pilot_yard` test 1: **every behavioural assertion passes; red on the 300 s automation envelope only** — 363 s / 490 s in the queue, **304 s alone** with the leaner navigator (register R14; limit unchanged)                                           |
| Yard tour                                                                        | `world_v2_yard_look` 12 sites + airlock round-trip, 1280×720                                                                                                                                                                                                                                                                | pass (4.9 min)                                                                                                                                                                                                                                                                                                                                                                     |
| **Event projection 800×600**                                                     | `v4_event_projection` label `world-v4-open-yard` vs the reference `world-v3.json`                                                                                                                                                                                                                                           | **0 differences** — 155 events, 28 opportunities, 25 window ids, final stage `complete`                                                                                                                                                                                                                                                                                            |
| **Event projection 1920×1080**                                                   | label `world-v4-open-yard-1080` vs `world-v4-open-yard`                                                                                                                                                                                                                                                                     | **0 differences**                                                                                                                                                                                                                                                                                                                                                                  |
| Route                                                                            | `pilot_route` 4 · `pilot_deck` (through the new yard) · `pilot_records` 5 · workshop tour                                                                                                                                                                                                                                   | **10/10 first attempt**                                                                                                                                                                                                                                                                                                                                                            |
| 1920×1080 tours                                                                  | yard, lab, deck, core, vestibule regression                                                                                                                                                                                                                                                                                 | **5/5**; the yard runs at ~20 fps at 1080 (open field + sprites)                                                                                                                                                                                                                                                                                                                   |
| 1920×1080 workshop tour                                                          | first run hit its fixed 600 s budget after completing all 15 stations (slow, not stuck) → budget made resolution-aware (a wait budget, not an assertion)                                                                                                                                                                    | **1/1 (7.0 min)** on the rerun                                                                                                                                                                                                                                                                                                                                                     |
| After the Workshop collider commit                                               | workshop tour, `m02_overlay_proof` 2, `pilot_lab` 3, `pilot_signal_incident` 2, `pilot_deck`, `pilot_records`                                                                                                                                                                                                               | **12 passed, 1 failed**: `pilot_records` test 3 (Press A overlay did not open within 8 s, both attempts, inside the 1.1 h queue). Reproduced alone immediately afterwards: **passes (1.3 min)**. The whole file was then re-run without retries: **4/4 (9.7 min)**. Classified as the documented input-miss class inside a long queue, not a collider regression; listed as a risk |
| Collision audit                                                                  | all seven rooms — see `COLLISION-AUDIT.md`                                                                                                                                                                                                                                                                                  | **7/7 rooms pass**; every reachable face pushed (Yard 90, Concourse 24, Workshop 20, Dock 18, Lab 11, Core 8, Deck 7), every stop within 1 px of the model. An under-testing defect in the audit's own planner was found and fixed first (the Yard had 'passed' with 1 face pushed)                                                                                                |

**Still not run (UNKNOWN, not green):** the legacy-route suites (the body
change is global; legacy rooms keep cells + skirt), the export browser
suites after session 1 (`participant_completion_handoff:1042` keep-alive
flaky-pass still unexplained), the collision audit at 1920×1080, the route
capture / recording, matched before/after frame pairs.

**Correction to session 1:** the session-1 text claimed "44/44 solid faces"
for the Concourse audit. The audit pushes only faces the avatar can reach;
the real coverage figures are in `COLLISION-AUDIT.md`.
