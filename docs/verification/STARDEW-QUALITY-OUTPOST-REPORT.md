# Stardew-quality outpost redesign — verification report

Branch: `fable-stardew-quality-outpost-v1` (base `fd89f18`, inherited from
`fable-playable-prototype-overnight-v1`). One long autonomous session,
sequential bounded units, one local checkpoint commit per unit. Nothing
was pushed, merged, tagged, deployed or removed.

## Commits

| Commit    | Unit | Summary                                                                                                                                                                                                                                                     |
| --------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `56b3f22` | A    | Original outpost visual system: 10 per-theme procedural Wang tilesets, floor-variation decal overlays, themed camera colours, viewport-filling room grids (no black bands)                                                                                  |
| `ddef7e8` | B    | Hub/Prep/Dock rebuild: windows, pipes, reception, galley corner, hydroponics, light pools, ambient crew patrols, physical bench gear + carried-item bubble; RenderTexture bake (major software-GL perf win); position-synced `dockToHub`, click-retry guard |
| `ec74722` | C    | Survey Terrace transformation: expanded snowfield, horizon habitat modules, deterministic snowfall, fading footprints, scan rings, dig spoil + camera kick + churned ground, damaged→repaired antenna                                                       |
| `68ffd9d` | D    | NPC reactions (Vale/Kai pose progression), Utility Bay fault-lamp bank + bot work sway, Ops Annex physical Q32 lane pips + Q33 dossier stack, Final Core reactor columns + breathing glow, workshop ambience                                                |
| `709cee7` | E    | Procedural WebAudio kit: ambience (hum/wind), footsteps, doors, UI ticks, pickup/scan/dig/install cues, uniform completion chime; mute toggle; reduced-motion support                                                                                       |
| (Unit G)  | G    | Full-route visual capture spec + screenshots + this report; `completeDockTutorial` event-synced                                                                                                                                                             |

## Asset provenance

All new participant-facing art and audio is **original procedural work
authored in-repo** — no downloads, no external packs, no copyrighted
game content:

- `src/world/proceduralTilesets.ts` — 10 themed Wang tilesets + variant
  strips (seeded mulberry32, deterministic).
- `src/world/proceduralTextures.ts` — new props (windows, pipes, seating,
  hydroponics, galley, reception, cart, workers, light pools, antenna
  damaged/repaired, station module, disturbed ground, footprints, core
  column, NPC pose variants) in the established drawing language.
- `src/gameplay/audio.ts` — all sound synthesised from oscillators and
  deterministic noise buffers at runtime.
- Committed PixelLab v3 assets (player frames, doors, terminals, pad)
  continue under their existing recorded provenance.

Conventions and palette: `docs/game/VISUAL-SYSTEM.md`.

## Participant route changes

- Every route room has a distinct visual identity (theme table in
  VISUAL-SYSTEM.md); black bands and dead voids removed everywhere.
- Hub reads as the centre of station life: reception by the dock door,
  operations centre, crew galley corner, hydroponics, two ambient crew
  members on fixed patrol loops, console LEDs, exterior windows.
- Prep room stages its bench gear physically; items leave the bench when
  picked up and the carried item rides beside the player.
- Survey Terrace is a genuine exterior: snowfield, ridge, horizon
  structures, weather, footprints; scan/dig/install are embodied with
  tool bubbles, rings, particles and terrain changes; the antenna is
  visibly broken before and standing/lit after the repair.
- Utility Bay: the bot's workplace, with a fault-lamp bank that
  extinguishes as sweeps isolate faults and visibly stops changing when
  extra cycles add nothing.
- Ops Annex: physical portfolio lane pips and a dossier stack that
  shrinks as contracts close.
- Final Core: reactor columns and a controlled breathing glow that
  settles to steady calm at synchronization — identical baseline and
  identical completion visual on every path.

## Measurement-boundary verification

- No interactable position, interaction radius (72 px), prompt option
  list/order, event emission point, collision footprint, or measurement
  window was changed by any visual/audio work. Art renders via the
  dual-grid + bake path; collision stays on the invisible logical layer.
- All decorative content is deterministic (fixed seeds/waypoints) and
  identical across participants; ambient NPCs never gate anything.
- Physical state displays (bench gear, fault lamps, lane pips, dossier
  stack) mirror only state their room's own panel/prompt already shows.
- Audio is uniform per action class: one selection tick for every
  option, one completion cue for every path.
- Boundary specs pass: Q03 independence, Q27 isolation + prior-exposure
  register, Q29/Q31 single shared construct, Q30 two instances, Q32/Q33
  distinct modules, corridor de-gating, identical Final Core baseline,
  no participant-facing Q labels, canonical event payloads unchanged.

## Tests and builds

- `npm.cmd run lint:tsc` — clean at every unit commit.
- `npm.cmd run build` — production build passes.
- lint-staged (eslint + prettier) — clean on every commit via hooks.
- Full Playwright suite run in deterministic sequential chunks (the
  machine shared CPU with an active user browser session throughout, so
  chunk wall-times ranged 7–72 min). Final state: **every spec file
  green** — chunk 1 (adversarial ×8): 11/11; chunk 2 (archive, smoke,
  dock, engineer, field, final-core, foundation + re-runs): 25/25;
  chunk 3 (field, engineer, hazard, interruption, launch, movement,
  participant ×3): 35/35; chunk 4a (inventory, measurement, textures,
  repair ×2, export): 39/39 after the deliberate manifest-pin update;
  chunk 4b (route-g, scenarios ×6, side-repair, state, technical,
  visual, journeys): 30/30 after one real test-infrastructure fix.
  Occasional first-attempt flake under load is absorbed by the suite's
  built-in retry; four helper hardenings this session reduced it at the
  source (position-synced `dockToHub` and `completeDockTutorial`,
  re-snapshot retry guards in `clickGameRect` AND `selectPromptOption`
  — the latter fixed a real drift where a slow chained stage could
  re-fire the same option number on the follow-up stage).
- New focused verification: `e2e/visual_route_capture.spec.ts` drives
  the COMPLETE first shift (arrival → requisition → terrace recovery →
  utility diagnostic → annex modules → four pilot decisions → Final
  Core synchronization) through normal controls, asserts route and
  mission-cycle completion with zero runtime errors, and captures the
  participant-view screenshot set.

## Screenshots

Before: `docs/verification/screenshots/` (prototype baseline at
`fd89f18`). After: `docs/verification/screenshots-stardew/01…17` —
arrival, hub, requisition, toolbelt, terrace, briefing, scan, dig,
antenna before/after, route completion, utility bay, ops annex, Q32
portfolio, Q33 queue, final core, completion.

## Optional 2.5D diorama (Unit F)

Deliberately not attempted. The verification environment runs on
software GL at its frame-budget margin; the brief makes the spike
strictly subordinate to the stability of the mandatory 2D result, and
the remaining risk budget was spent on route verification instead.

## Remaining shortcomings

- Prompt panels remain text-first (restyled cards, not diegetic
  minigame surfaces beyond the NEXT-08 model).
- NPCs are pose-swap characters, not multi-frame walk-cycle sprites;
  ambient workers patrol with a single south-facing frame.
- The committed dock landing-pad tileset predates the new dock theme
  and reads slightly cooler than its surroundings.
- Status side panels still occupy the right margin as text; a diegetic
  replacement is a future pass.
- Utility Bay/Ops Annex play areas keep their original compact interiors
  (unreachable wall mass fills the viewport around them).

## Remaining scientific gates (unchanged by this session)

- Canonical event names and scoring formulas remain unapproved;
  `proto_*` runtime names remain provisional; open decisions in
  `docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md` (SA queue)
  remain with the research owner. Q18/Q20 questionnaire-primary,
  Q32/Q33 exploratory analogues — all unchanged.

## Launch / verify commands

- `npm.cmd run start` — dev server (add `?scene=<room>` to jump).
- `npm.cmd run build` / `npm.cmd run preview` — production build.
- `npx playwright test` — full suite (PW_DEV_PORT to isolate).
- `npx playwright test visual_route_capture` — full first-shift route
  with participant-view captures.
