# Four-zone map foundation — implementation and verification report

Bounded unit: **cohesive four-zone assessment route (map foundation only)**.
Session: Fable, 2026-08-14, worktree
`.claude/worktrees/fable-four-zone-map-foundation`.

- Branch: `fable-four-zone-map-foundation-v1`
- Base: `9be9de4368910864ec21fb24f40debfecccc5eb7`
  (descends from `74c4fe0`, the action-assessment rebuild report commit)
- Final HEAD: the single local commit
  `feat(game): establish cohesive four-zone assessment route`
  (this report is part of that commit, so its SHA is recorded in the
  session handoff rather than here; verify with `git log -1`)

Nothing was pushed, merged, tagged, deployed or removed; no branch or
worktree was deleted; no protected scientific, research, decision,
event-schema, scoring, runtime-data or `.claude` configuration file was
touched; `asset-candidates/**` and `package*.json` are untouched.

## 1. Changed files (exact, = the frozen allowlist)

New source (6):

| File                                       | Role                                                                                                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/world/fourZoneRoute.ts`               | Route/controller: fixed zone order, `ZoneScene` base (map build, movement/collision, proximity, single forward transition, beacon, endpoint completion, DEV probes) |
| `src/world/RouteGuidanceHud.ts`            | Route-guidance HUD: single objective line, transient zone-title card, H-toggled controls legend (hidden by default)                                                 |
| `src/scenes/StationConcourseScene.ts`      | Zone 1                                                                                                                                                              |
| `src/scenes/DiagnosticsLaboratoryScene.ts` | Zone 2                                                                                                                                                              |
| `src/scenes/ExteriorRecoveryYardScene.ts`  | Zone 3                                                                                                                                                              |
| `src/scenes/UtilityCoreDeckScene.ts`       | Zone 4                                                                                                                                                              |

Modified existing (3 — the registration/router maximum):

| File                       | Change                                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `src/constants/key.ts`     | Four new scene keys (keys double as zone keys)                                                             |
| `src/scenes/index.ts`      | Barrel exports → automatic Phaser scene registration                                                       |
| `src/world/SceneRouter.ts` | Default launch → `station_concourse`; four explicit `?scene=` zone aliases added beside the legacy aliases |

New tests (2) + evidence + report:

- `e2e/four_zone_route.spec.ts` — focused functional route spec
- `e2e/four_zone_visual_capture.spec.ts` — 8-frame visual capture
- `docs/verification/screenshots-four-zone/` — 8 inspected frames
- `docs/verification/FOUR-ZONE-MAP-FOUNDATION-REPORT.md` — this report

No preload/texture registration file was needed: every reused asset is
either generated procedurally at Boot (`proc-*` foundry, theme
tilesets) or already preloaded at the base tree (`plv1-*` NPC stills,
player frames).

## 2. Map and route diagrams

Route (fixed, forward-only, no participant branching):

```
default launch
     │
     ▼
[1] Station Concourse ──(centre-north door)──▶ [2] Diagnostics Laboratory
     ──(centre-north Exterior Airlock)──▶ [3] Exterior Recovery Yard
     ──(north-east Utility Deck airlock)──▶ [4] Utility & Core Deck
     ──(walk into north alcove)──▶ Core Chamber endpoint (no exit beyond)
```

Zone maps (25×19 tile grids, 32 px tiles, 800×608 px, camera-follow;
`#` wall/ridge, `.` floor, `-` doorway):

```
[1] STATION CONCOURSE ('hub' theme)      [2] DIAGNOSTICS LABORATORY ('ops')
#########################                #########################
###########--############  ← to Lab     ###########--############  ← to Yard
#.......................#                #.......................#
#.......................#  checkpoint   #.......................#   (2-row
#.......................#  NW           #........#####..........#   corridor
#..####...........####..#  ← rails      #.......................#   around the
#.......................#                #.......................#   briefing
#.......................#  logistics W  #..W..................E.#   display)
#.......................#  workcells E  #.......................#  3 panels W
#.......................#                #..W..................E.#  3 panels E
#.......................#                #.......................#
#..####...........####..#  ← rails      #..W..................E.#
#.......................#                #.......................#
#.......................#  arrival SW   #.......................#
#.......................#  spawn S-ctr  #.......................#  spawn S-ctr
#.......................#                #.......................#
######################### ×3            ######################### ×3

[3] EXTERIOR RECOVERY YARD ('exterior')  [4] UTILITY & CORE DECK ('utility')
#########################                #########################
#####################--##  ← to Deck    #########################
#.......................#   (NE)        ##########.....##########  ← Core
#.....2.......3....4....#                ##########.....##########    Chamber
#.......................#                ##########.....##########    alcove
#.......................#     5         #####...............#####  ← funnel
#.......................#                #.......................#
#........#######........#                #.cache.................#
#........#######........#  central      #.......................#
#........#######........#  landmark     #recycler.........pump..#
#........#######........#  (relay 04)   #.......................#
#........#######........#                #..........bench........#
#..1....................#                #.......................#
#.......................#                #.......................#
#..spawn(SW airlock)....#                #.......................#
######################### ×3            ######################### ×3
```

Zone 3's five work pads sit clockwise along the service path:
1 Pressure Regulation Station (W) → 2 Antenna Alignment Platform (NW)
→ 3 Field Manual Station (N) → 4 Power Relay Junction (NE) → 5 Core
Sample Extraction Rig (E, below the exit airlock).

## 3. The four zones

1. **Station Concourse** (`station_concourse`) — professional intake
   floor. Spawn centre-south facing north; Arrival Terminal SW;
   Operations Desk as the central focal decor cluster (reception desk,
   light pool, ambient Vale still); Logistics Bay west; Operational
   Workcells east; Crew Checkpoint NW; single transition centre-north.
   Ten inactive future-station shells (Operations Board, Intake
   Console, Logistics Bench, Calibration Cabinet, Cargo Workcell,
   Calibration Conveyor, Maintenance Roster, Quality-Control Bench,
   Crew Checkpoint, Sample Transfer) plus the Arrival Terminal. Floor
   zoning via rail stubs, light pools, muted area signage and amber
   rail-end safety lights — no crate filler. No M numbers anywhere.
2. **Diagnostics Laboratory** (`diagnostics_laboratory`) — one coherent
   lab: entrance centre-south, wide unobstructed central aisle, three
   inactive panels west (Signal Lattice, Multi-Source Status Board,
   Causal Systems Table), three east (Protocol Transfer Console,
   Equipment Trainer, Diagnostic Hypothesis Console) — six visually
   distinct props in one panel language; a briefing/display surface on
   a centre-north display wall; the Exterior Airlock beyond it (reached
   around the display through a two-tile corridor); no other doors.
3. **Exterior Recovery Yard** (`exterior_recovery_yard`) — polar
   exterior with snow terrain, restrained deterministic snowfall
   (reduced-motion aware), footprint trails tracing the clockwise
   service path, equipment foundation plates under all five pads,
   amber safety lighting, sector-post boundary fencing inside the
   ridge walls, and a central landmark (relay module + comms mast)
   visible from most of the map. Entrance airlock apron SW; exit NE.
   Path legibility comes from geometry and environmental cues — no
   painted arrow.
4. **Utility & Core Deck** (`utility_core_deck`) — Magnet Recycler
   west, Coolant Intake Pump east, Depleted Cache Test Area NW,
   Sample Processing Bench centre; the Core Chamber is a physically
   integrated raised north alcove (core column + interface, funnel
   shoulder walls, converging light pools, threshold marker). Walking
   into the alcove completes the route preview; no exit beyond.

## 4. Route-preview and guidance behaviour

- Zone entry: brief zone-title card (~2.6 s, tween-faded, reduced-motion
  aware), then a single persistent objective line, e.g.
  “Route orientation: proceed to the Diagnostics Laboratory.”
- Exactly one destination beacon (pulsing cyan band at the forward
  transition) that hides on arrival (< 120 px) and after completion.
- Contextual name chip + interaction hint only near the nearest
  eligible object; one consistent language: `SPACE / E — inspect`
  (shells/endpoint) and `SPACE / E — proceed` (transition).
- Inactive shell inspection shows a short neutral transient
  description (“… Offline during route orientation.”) — no modal card,
  no option list, no logging, no gating.
- Controls legend hidden by default; H toggles
  (Arrows/SPACE·E/ESC/M — mechanics only). ESC pauses to the existing
  Menu and resumes in place. M toggles the ambience mute.
- Transitions: single forward door per zone, fade-out → next zone.
  No task success involved anywhere; backtracking is structurally
  impossible (no backward doors); zone order cannot be skipped or
  reordered in-game.
- Endpoint: entering the Core Chamber alcove flips the objective to
  “Route orientation complete — Core Chamber reached.”

## 5. Reused systems (no rebuilds)

`StationMapBuilder.buildPlaceholderRoomMap` (character grids, dual-grid
Wang visuals, RenderTexture bake, collision from the invisible logical
layer) · procedural theme tilesets + floor-variation overlays
(`hub`/`ops`/`exterior`/`utility` themes) · `Player` controller
(movement, collision body, camera follow, drop shadow) · fade
transition pattern (force-restarted fade, SceneRouter precedent) ·
`gameplay/audio` ambience + UI/door cues (`startAmbience`,
`sfxDoor`, `sfxUiSelect`, mute toggle) · `gameplay/effects.snowfall`
(deterministic, reduced-motion aware) · existing Menu pause scene ·
existing viewport handling (Phaser FIT scale, themed void colour) ·
debug-gated collision overlay (`?debug` on dev builds, unchanged) ·
DEV probe conventions (`__playerProbe` shape reused; new read-only
`__zoneProbe`).

Deliberately NOT reused: `RoomScene` itself (it hard-wires the
duty-roster HUD, prompt-card measurement surface and
`researchRuntime` logging — all out of scope for a measurement-free
route), and `transitionToRoom` (it writes `SessionState`). The zones
use a purpose-built `ZoneScene` that reuses the underlying proven
infrastructure without touching the research runtime.

## 6. Reused runtime assets and provenance

All from the base tree; nothing generated, downloaded, or taken from
`asset-candidates/**`:

- **Procedural foundry textures** (`src/world/proceduralTextures.ts`,
  generated at Boot, deterministic): proc-console-quartermaster,
  proc-console-wall, proc-console-scenario, proc-board-workorders,
  proc-board-portfolio, proc-bench-prep, proc-crate-components,
  proc-cabinet-calibration, proc-desk-closure, proc-specimen-case,
  proc-rig-intake, proc-rig-recycler, proc-reclamation-post,
  proc-diag-board, proc-rack-tools, proc-shelf-electronics,
  proc-gauge-card, proc-valve-relief, proc-antenna-damaged,
  proc-notebook-stand, proc-panel-warning, proc-ice-bore,
  proc-core-column, proc-core-interface, proc-station-module,
  proc-beacon-comms, proc-sector-post, proc-footprints,
  proc-ground-disturbed, proc-dig-mound, proc-crate-supply,
  proc-pipe-valve, proc-light-pool, proc-window-exterior,
  proc-wall-pipes, proc-seat-bench, proc-desk-reception,
  proc-cart-utility, proc-worker-hauler, proc-worker-tech.
- **Procedural theme tilesets** (`proceduralTilesets.ts`): `hub`,
  `ops`, `exterior`, `utility` (visuals only; collision unchanged).
- **PixelLab runtime stills** (PROVISIONAL MODEL-SELECTED, NOT
  HUMAN-APPROVED — `docs/game/PIXELLAB-RUNTIME-ASSET-PROVENANCE.md`;
  preloaded in Boot at the base): `plv1-vale` (Concourse operations
  desk), `plv1-kai` (Laboratory east side) — ambient, inactive figures
  only; and the PixelLab researcher player frames via the existing
  `Player` skin selection.

## 7. Legacy scenes excluded from the participant route

Not reachable from any zone; still directly launchable via explicit
developer `?scene=` aliases (SceneRouter) for regression testing:
`main` (prototype), `dock`, `hub`, `archive`, `repair`, `engineer`,
`inventory`, `hazard`, `side_repair`, `interruption`, `final_core`,
`field`, `ops_annex`, `artifact_field` (ArtifactSurvey),
`coolant_yard`, `pump_house`, `utility_bay`. No zone declares a door
to any of them; the walkthrough spec confirms only the four zone
scenes are visited on the participant route. No legacy scene or its
tests were deleted.

## 8. Tests and verification results

All commands run in this worktree; PW_DEV_PORT=5301 isolates the dev
server from other checkouts.

| Gate                    | Command                                                                                                             | Result                                                                                                                                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck               | `npm.cmd run lint:tsc`                                                                                              | PASS (repeatedly; final run clean)                                                                                                                                                                                                                                                                          |
| Production build        | `npm.cmd run build`                                                                                                 | PASS (pre-existing chunk-size warning only)                                                                                                                                                                                                                                                                 |
| Focused functional spec | `PW_DEV_PORT=5301 npx playwright test four_zone_route --retries=0 --workers=1`                                      | PASS — 3/3 tests                                                                                                                                                                                                                                                                                            |
| Focused visual spec     | `PW_DEV_PORT=5301 npx playwright test four_zone_visual_capture --retries=0 --workers=1`                             | PASS — 1/1, 8 frames written                                                                                                                                                                                                                                                                                |
| Router regression       | `PW_DEV_PORT=5301 npx playwright test four_zone_route adversarial_direct_launch_navigation --retries=0 --workers=1` | PASS — 4/4                                                                                                                                                                                                                                                                                                  |
| Whitespace              | `git diff --check`                                                                                                  | clean                                                                                                                                                                                                                                                                                                       |
| Allowlist               | `node scripts/claude/verify-unit.mjs --allow …` (13 entries)                                                        | PASS — every change inside the allowlist                                                                                                                                                                                                                                                                    |
| ESLint (new files)      | `npx eslint <new/changed files>`                                                                                    | New files clean. Untouched files across this worktree fail `prettier/prettier` en masse because the worktree is checked out CRLF while the index is LF (known Windows-worktree pitfall; pre-existing, not introduced here — verified identical failures on untouched `StationMapBuilder.ts`/`DockScene.ts`) |

The functional spec establishes (single keyboard-driven walkthrough,
no scene jumps): default launch → Station Concourse; legend hidden ↔ H
toggles; wall-collision clamps; shell inspection changes nothing in
the research event log; route order exactly Concourse → Laboratory →
Yard → Utility/Core via the three forward doors; objective text
updates at every transition; beacon hides on arrival; backtracking
attempt is inert; endpoint completion by arrival alone; no exit beyond
the Core Chamber; **zero research events added across the entire
walkthrough** (also proving no `technical_error` fired); zero page
errors; all four `?scene=` zone aliases registered; legacy `?scene=dock`
still boots the Dock.

Selected regression scope (deliberately narrow): only
`adversarial_direct_launch_navigation` was added beyond the unit's own
specs, because the only shared files touched are the scene-key table,
the scene barrel and SceneRouter — surfaces exercised by explicit
`?scene=` launches. The full 150+ suite was not run (per the unit
contract); see §11 for the known impact of the default-launch flip on
legacy specs.

One deterministic defect was found and fixed during verification: the
Laboratory's briefing-display wall originally sat one row below the
airlock doorway, leaving a single-tile (32 px) corridor that the 42 px
player collision body cannot pass — the airlock was physically
unreachable. The display wall moved down one row (two-tile corridor);
the walkthrough then passed at retries=0.

## 9. Screenshot inventory (all 8 manually inspected)

`docs/verification/screenshots-four-zone/`:

| Frame                               | Content                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| `1a-station_concourse-arrival`      | Spawn view: full concourse, zoning rails, shells, ops desk, north door + beacon |
| `1b-station_concourse-route`        | Mid-floor readability vantage                                                   |
| `2a-diagnostics_laboratory-arrival` | Aisle, 3+3 panels, briefing display, airlock                                    |
| `2b-diagnostics_laboratory-route`   | Central-aisle vantage between the panel rows                                    |
| `3a-exterior_recovery_yard-arrival` | SW airlock apron, landmark, pads, NE exit                                       |
| `3b-exterior_recovery_yard-route`   | NW path bend: pads 2-4, landmark, exit                                          |
| `4a-utility_core_deck-arrival`      | Full deck: converging lanes, alcove, stations                                   |
| `4b-utility_core_deck-route`        | Centre lane below the Core Chamber alcove                                       |

Visual findings and fixes (two bounded fix passes inside the
allowlist):

1. **Fixed** — the door signage (`DIAGNOSTICS LABORATORY`,
   `EXTERIOR AIRLOCK`) rendered at the map's top-centre was hidden
   behind the fixed objective line; moved beside each door onto the
   wall band.
2. **Fixed** — the relocated signs then collided with
   `proc-window-exterior` wall decor; windows shifted east
   (Concourse, Laboratory). Re-captured; all signs fully legible.
3. **Noted, pre-existing** — a pale angular overlay icon in the
   top-right corner appears in every capture _including the legacy
   `screenshots-rebuild` set at the base commit_; it is a global
   pre-existing element, not introduced by this unit.
4. **Noted** — `proc-worker-tech` (ambient figure, Utility Deck) reads
   slightly blocky at this scale; acceptable as ambient dressing.

Acceptance criteria: no black bands (themed void + full-viewport
maps), no clipped objective, no overlapping HUD/dialogue, player
correctly layered, exits recognizable (doorway accent + teal marker +
beacon + signage), walkable lanes distinguishable, no prop blocks the
route (proven by the driven walkthrough), no room reads as an empty
rectangle, no developer or measurement labels visible. The controls
legend is hidden in all frames by design; its geometry
(650..796 × 494..~580) fits the 800×600 viewport without clipping
(verified statically; toggle behaviour verified by the functional
spec).

## 10. Review passes

The four project reviewer agents (`gameplay-reviewer`,
`visual-reviewer`, `test-reviewer`, `scientific-reviewer`) were not
discoverable in this session's agent registry (known discovery
limitation; a fresh session lists them). Fallback per the operating
mode: four independent read-only review subagents were run, each
instructed to load and adopt the corresponding
`.claude/agents/<reviewer>.md` charter, with editing forbidden. One
post-review bounded fix round was used (of the maximum two); the two
pre-review screenshot fix passes in §9 preceded the reviews.

Findings and dispositions (fixes = the one post-review bounded fix
round, all inside the allowlist, all re-verified green afterwards):

**Scientific-boundary review — verdict: no measurement concerns; all
six boundary claims CONFIRMED** (import-list and transitive-dependency
checks, participant-string audit, diff-stat audit, gating audit).
Two informational notes recorded for the research owner (not resolved
here): (N-1) several inactive-shell descriptions pre-describe future
stations in recognisable terms (e.g. the Sample Processing Bench's
"work areas reset here"); whether route-orientation text should be
genericised before those stations activate is an entry-state/priming
question for the research owner at activation time. (N-2) the
participant default now reaches no measurement content at all —
consistent with this neutral foundation unit; wiring measurement
content into the route is a future, separately-reviewable decision.

**Gameplay review — verdict: confirmed on all six claims; no blockers
or majors; five minors.** Dispositions:

- Buffered interact press could auto-fire on entering range (JustDown
  latches until read) — **fixed**: the flags are read/cleared every
  frame; only in-range presses act.
- Stale feedback timer could truncate a newer message — **fixed**:
  the pending removal timer is cancelled on replacement.
- Held-ESC pause/resume flicker + ESC during transition fade —
  **fixed**: `event.repeat` and `transitioning` guards on the zone ESC
  handler (the Menu-side guard is outside the allowlist; noted below).
- Legend says "inspect" but doors say "proceed" — **fixed**: legend
  line now reads "SPACE/E interact".
- Endpoint copy spoke in development-schedule terms — **fixed**: now
  "Core access is sealed during route orientation."
- Not fixed (outside the frozen allowlist, recorded as follow-ups):
  the legacy pause-menu card (`Menu.tsx`) lists C/D/F/TAB actions that
  do not exist on the route and does not mention H/M; H-legend
  discoverability has no in-scene mention.

**Visual review — verdict: readable with noted defects; no blockers;
one major.** Dispositions:

- (major) Laboratory centre read as an empty rectangle with orphaned
  light pools — **fixed**: pools re-anchored beside the panel bays and
  over the airlock approach; a subtle centre-aisle floor guide line
  added (aisle remains unobstructed per the zone contract).
- Utility Deck thin diagonal conduit read as a stray vector —
  **fixed**: removed (anchored centre conduit retained).
- Lavender `proc-worker-tech` was a palette outlier — **fixed**:
  swapped to the slate `proc-worker-hauler`.
- Recovery Yard exit was the weakest transition — **fixed** (partly):
  flanking amber safety lights added at the airlock; sign kept muted
  by design; the adjacent pre-existing corner icon is outside this
  unit.
- "TEST AREA" wording risked reading as assessment language —
  **fixed**: signage now "DEPLETED CACHE" (the shell's mission-given
  name "Depleted Cache Test Area" is unchanged).
- ~4 px HUD-to-signage clearance in the Laboratory — **fixed**: door
  signage moved to y 46 in zones 1-3.
- Notes accepted without change: near-illegible diegetic "RELAY 04"
  pad label; repeated paired floor-hatch motif across three zones;
  pre-existing top-right overlay icon (predates the unit).

**Test review — verdict: the specs establish route order and
accessibility, not merely scene loading; one major.** Dispositions:

- (major W1) The backtracking/endpoint/shell-inspection claims rested
  on change-absence assertions with no positive control — **fixed**:
  a DEV-only `window.__zoneFeedbackText` probe (cleared per zone
  entry) was added to `ZoneScene.showZoneFeedback`, and the spec now
  asserts the displayed text after each inspection ("Arrival
  Terminal", "Multi-Source Status Board", "Pressure Regulation
  Station"), asserts the probe is still null after the backtracking
  press, and asserts the endpoint description after the endpoint
  press — converting all previously-vacuous passes into positive
  evidence.
- (minor W2) door presses have no in-test swallowed-input retry —
  accepted: a swallowed press fails loud (waitForZone timeout), and
  the unit's gates run at retries=0.
- (minor W3) drive coordinates are layout-coupled — accepted for the
  positive path (mis-routes fail loud); the W1 fix removes the silent
  side.
- (minor W4) several per-zone claims asserted in one zone only
  (beacon/legend/collision), ESC path unexercised — accepted for this
  foundation unit; recorded as spec follow-ups.
- Visual-capture caveats (no expects, tween nondeterminism) —
  accepted: capture-only by design; frames are manually inspected.

After the fix round: `lint:tsc` PASS, ESLint on all unit files clean,
both specs re-run PASS at `--retries=0 --workers=1` (4/4 tests), all
8 refreshed frames re-inspected manually (pass).

## 11. Known limitations

- **Legacy default-launch specs are stale by design.** 29 existing
  spec files boot without a `scene` param and previously landed in the
  Dock; the mandated default flip to Station Concourse means they now
  need `scene: 'dock'` (or equivalent) to test the legacy route. They
  were not modified (outside the allowlist) and not run. This is the
  main follow-up cost of the default flip and a candidate next unit.
- The zone-2/3/4 `?scene=` aliases allow direct developer launches
  into later zones (needed for verification and the visual spec);
  in-game participant navigation cannot skip zones. If the research
  owner wants participant launches restricted to the default entry,
  alias gating would be a separate decision.
- Route-preview state is per-scene only; there is no persistence, so a
  page reload restarts at the Concourse (acceptable for a map
  foundation; a later unit owns route/session state).
- The Core Chamber is an endpoint marker, not a room; its interior
  becomes real content in a later unit.
- The pre-existing top-right overlay icon (see §9) remains
  unidentified in this unit's scope; it predates the unit.
- Worktree-wide CRLF checkout makes full-tree ESLint noisy (§8);
  commits normalize to LF, so this does not enter the repository.
- The legacy pause menu (`src/scenes/Menu.tsx`, outside the frozen
  allowlist) reachable via ESC lists field-action controls (C/D/F/TAB)
  that do not exist on the route and omits H/M; its ESC handler also
  lacks a key-repeat guard. Both are pre-existing and recorded as
  follow-ups for a unit that may touch that file.
- Per-zone guidance claims (beacon arrival-hide, legend default,
  collision bounds) are spec-asserted in one zone each; the other
  zones share the same `ZoneScene` code path. Broader per-zone spec
  coverage is a noted follow-up.

## 12. Boundary confirmations

- No measurement, scoring, event-schema, scoring-plan, Qualtrics,
  export, or scientific-authority file changed
  (`git diff 9be9de4 --stat` = exactly the §1 file list).
- The new code imports nothing from `src/systems` or
  `src/measurement`; no event is emitted anywhere on the route; the
  walkthrough spec pins the event log flat.
- No M01-M26 opportunity, no item window, no candidate/canonical
  variable, no score/weight/threshold/composite, no "good player"
  score, no legacy Q01-Q33 evidence reuse, no trait inference from
  navigation, no success-gated zone exposure.
- No open decision in `docs/ai/SCIENTIFIC-AUTHORITY-AND-OPEN-DECISIONS.md`
  was touched or resolved; M01-M26 remain unvalidated proposals; the
  2026-07-29 global ruling was not reinterpreted.
- PixelLab was not called; `asset-candidates/**` untouched; no new
  external assets.
- Nothing was pushed, merged, tagged, deployed; no PR; no branch or
  worktree deleted; `.claude` configuration unchanged.

## 13. Recommended next bounded unit (not implemented)

**Legacy-spec launch repair**: update the 29 default-launch legacy
specs to boot explicitly with `scene: 'dock'` (one mechanical pass,
spec files only), then a full-suite sweep to re-baseline. This
restores regression coverage of the legacy route before any zone
gains real stations. Alternative next unit if the owner prefers
content first: activate the Station Concourse's intake flow (Arrival
Terminal) as its own contracted unit.
