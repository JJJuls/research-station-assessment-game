# V4 Unit 4 — Exterior Recovery Yard

Contract row: `UNIT-0-BASELINE-AUDIT.md` §5, Unit 4. Commit subject:
`refactor(game): structure exterior recovery yard`. Room doc:
`docs/game/rooms/11-exterior-recovery-yard.md` (V4 section).

## What changed (observable; presentation only)

- **Weather.** Both ambient snowfall layers removed (the seeded tween
  flakes from `src/gameplay/effects.ts` — the helper itself stays for the
  legacy rooms — and the six `plv1-fx-snowfall` loop sprites). The exterior
  floor speckle is calmed (theme `noise` 0.5 → 0.2, exterior theme only, in
  `src/world/proceduralTilesets.ts` — a recorded allowlist deviation: the
  token is the only way to change the baked floor).
- **One service path.** Packed-snow lane plates with an edge line: airlock
  threshold and apron → coupling spur (row 11) → spine to the mast footing
  → east spur to the excavation stake and the compound gate column → the
  gate lane into the Metal Recovery Yard (row 6) → column 7 / row 5 to the
  uplink posts. The way back is the same spine to the apron.
- **Zones by terrain.** Apron plate; cleared ground inside the excavation
  stakes; the compound gravel and the rig pad moved from depths 0.5/0.6
  (inside the actor range — the avatar was drawn under the yard floor) to
  the floor-decal layer, with an edge line.
- **Static storm aftermath.** Five drift ridges along the ridges and walls
  and two debris plates at the wall bases; the disturbed ground and
  footprints stay.
- **Labels removed (10).** Area signage and post captions; the state
  readouts the models drive (coupling, mast, rig, line A/B) keep their text
  and move to the environment register at 2× rasterisation, sorted just
  below their prop's foot line; the mast chip moved 11 px up onto the rock
  edge.
- **Depth.** Dug cells, the plot outline, the conduit and the mast feed
  lines leave the foreground depths (they drew over the avatar) for the
  floor-marking layer; the coupling dial sits on the world-readout layer.
- **Unchanged by construction:** the grid (every rock ridge, the compound,
  the footing, the airlock), `YARD_SITES`, `YARD_RIG_PAD`, the M23 plot,
  target cells and scan spots, every prompt/option/window/event, the C/D/F
  bindings and controllers, caches, deck state and re-entry persistence.

## Tests and evidence (`--retries=0 --workers=1`, `PW_DEV_PORT=5362`)

| Command / spec                                                               | Result                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lint:tsc`, `build`, scoped ESLint, `git diff --check`                       | pass (before and after the correction round)                                                                                                                                                                                                                                                                  |
| `v4_visual_capture` yard/deck/completion leg → `unit4/19…26` (1280×720)      | three runs: two failed at the Dock tutorial before any changed room (`dock_tutorial_paths` passes 2/2 on the same tree — load at the fixed-duration holds); the third captured all eight yard frames, then failed on the Records east-door return step outside the yard — frames inspected at full resolution |
| `v4_visual_capture` yard/deck/completion leg → `unit4/800x600/19…30`         | pass (6.2 min) — the yard at the 0.625 display scale plus the pre-Unit-5 Deck/Core frames under the V4 camera                                                                                                                                                                                                 |
| Smoke (interaction)                                                          | the capture leg itself drives Noor's prompt, the C scan and D dig key paths, the coupling and mast briefs, the F winch timing window and the uplink prompt on the redesigned yard — every station opened; no separate spec run (priority correction)                                                          |
| `v4_event_projection` (`unit4.json`, 3.8 min) + pure `v4_projection_compare` | route completed; **0 scientific differences** vs `baseline-v3.json` (`unit4.diff.json` = `[]`)                                                                                                                                                                                                                |
| post-correction recapture `unit4/19…30` (1280×720)                           | pass (4.6 min, the whole leg); frames 19/26 inspected: chips under the figure, lane legible                                                                                                                                                                                                                   |

## Review round (visual-reviewer + gameplay-reviewer brief, Opus, read-only)

Inputs: `unit4/19…26` at both resolutions, the V3 baseline frames, the
scene diff. Verdict: visual **readable with noted defects**, gameplay
**usable with noted friction**; confirmed: no motion source remains, the
calmer floor is measurable, the compound plate contrast is strong, the
avatar is never under the yard floor. One bounded correction round applied.

| #   | Finding                                                                                              | Sev                          | Disposition                                                                                                                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Y1  | `LINE A` chip drawn over the avatar at Post A (chip sorted at its own foot line, below the figure's) | MAJOR                        | **fixed** — every yard chip sits on the low-prop band (under every figure by construction; chips are placed beside/under their props so nothing overlaps them)                                                                              |
| Y2  | service path ≈ 4 % contrast against the snow — not a lane                                            | MAJOR                        | **fixed** — darker packed-snow token (α 0.7) with a 2 px edge                                                                                                                                                                               |
| Y3  | worksite grammar from raw primitives reads as editor guides                                          | MAJOR                        | **fixed in part** — the bright drift ellipses are removed; the plate language (fill + 1–2 px edge) is the one used in every V4 room and is kept; recorded as an asset-register item (a snow-drift decal texture would be an asset decision) |
| Y4  | excavation field legible only by the cyan outline                                                    | MAJOR (measurement-adjacent) | **fixed within the allowed scope** — the ground plate's contrast is raised; the dashed outline (the M23 discrimination) is untouched; routed to the scientific reviewer/owner as recorded                                                   |
| Y5  | state chips sliced by the brief card, leaving word fragments                                         | MINOR                        | **deferred to Unit 6** (modal layering / readout permanence — owner call recorded)                                                                                                                                                          |
| Y6  | rig chip half outside the compound plate                                                             | MINOR                        | **fixed** — chip centred on the rig                                                                                                                                                                                                         |
| Y7  | chips clipped at the camera edge when their prop is off-screen                                       | MINOR                        | **deferred to Unit 6** (same rule as Records R2)                                                                                                                                                                                            |
| Y8  | drifts the brightest non-HUD elements                                                                | MINOR                        | **fixed** — removed (with Y3)                                                                                                                                                                                                               |
| Y9  | arrival objective still names the airlock (V3 copy)                                                  | pre-existing                 | **deferred to Unit 6** stale-objective pass (research-owner copy)                                                                                                                                                                           |

Not checked by the reviewer: the return leg with the airlock on screen
from the north, the M23 window-closed state, post-completion states, the
depletion banner, reduced motion.
