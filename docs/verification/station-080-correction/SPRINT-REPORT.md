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
