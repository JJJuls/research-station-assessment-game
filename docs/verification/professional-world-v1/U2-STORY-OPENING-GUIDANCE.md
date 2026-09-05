# U2 — story spine, opening, mission card, map, restoration (World V1)

Branch `fable-professional-world-rebuild-v1`; entry HEAD `69eb33d` (the U1
closure commit, itself on `998f26a` U1); tree clean at entry. Contract:
design authority §13 row U2 and the mission contract's Part B, with the
allowlist amendment recorded in §7.

## 1. What was built

- **Story state** (`src/pilot/storyState.ts`, pure, Node-importable): eight
  acts over the UNCHANGED fifteen route stages (`STAGE_ACT`, `STORY_ACT_TITLES`);
  `missionCardAction(stage, zone, ctx)` — one next action for every
  (stage, zone) pair, ≤ 44 characters, the action in the destination zone
  and the door to take elsewhere, never a door already passed;
  `restorationState(element, stage, ctx)` for the lighting and the six
  status-wall sectors — a function of the stage or a terminal disposition
  (record closed, feeds up, Core stable) and never of a value;
  `zoneMark()` and `purposefulReturnPath()` for the map; `npcPosts(stage)`
  (deterministic posts per stage, measurement recipients retained);
  `OPENING_CAPTIONS`.
- **Mission card** (`src/pilot/ui/MissionCard.ts`; `RoomScene` uses it):
  two lines — act title (10 px caps) and one action (13 px) — in a 360
  design-px card anchored to the canvas's top-left safe area (8 px inset;
  outside the 800×600 design space at 1280×720, inside the letterboxed
  canvas at 800×600). DEV probe `__missionCardProbe` (text + design bounds).
  `PilotZoneScene.buildRouteObjectiveText()` and the Dock read the story
  lines; the V4 `LOCAL_OBJECTIVES` table is gone; the zone title card sits
  under the card. The Deck's and the Core's zone-narrowed lines were
  shortened to card length ("Feeds up — Core Chamber, north door.",
  "Inspect the Core, then confirm the review.", "Synchronising — stand by.").
- **Dock terminal moved** (finding V1): kiosk cells (4–5, 12), on the
  movement marker's row; `DOCK_SITES.terminal` (160, 400); the arrival
  spawn is the docking threshold (576, 640). Layout `src/world/layouts/dock.ts`,
  sites `src/pilot/zoneSites.ts`, blockout §1, room doc 00.
- **Opening** (`src/pilot/ui/PilotOpeningScene.ts`, rebuilt): a top-down
  exterior establishing shot rendered through the same world plate as the
  rooms (1024×576 at 1.25) from a 48×27 exterior-theme plateau: three
  research modules with roof seams, vents and skylights (emergency amber
  on the damaged two), service corridors, the Dock module with its lit
  arrival bay and docking threshold facing the pad, Mast 04 upright on its
  footing with the sheared upper arm in the snow, scorch marks, drifts,
  debris, a torn cable run, amber pad lights; a dawn overlay. The relief
  shuttle (192×96 top-down hull) descends onto the pad over 6 s with a
  touchdown snow puff; the camera pans from the mast to the pad/threshold
  over 13 s; three captions at 0 / 5 / 10 s; the shot ends at 15.4 s. Any
  key or click skips; skipping and completing leave the Dock identical
  (event types bar the outcome, stage, zone, spawn, card, instruction —
  `world_v1_story.spec.ts`). Reduced motion: static landed frame, same
  timing. New kit textures (`src/world/kit/kitTextures.ts`): module roof,
  corridor roof, scorch, snow drift, mast tower, mast arm, debris, pad
  light, shuttle (procedural; no PixelLab call). The cut lands on the Dock's
  threshold with the airlock iris open, sealing over ~1 s
  (`DockScene.sealDockingAirlock`; the sealed leaf is otherwise frame 3).
- **Map** (`src/pilot/ui/StationMapScene.ts`, redrawn): the seven zones in
  their true topology (Core north of the Deck, orthogonal links), current
  zone, visited zones, destination, restored sectors (filled mark + the word
  "restored"), the purposeful return as a highlighted path at
  `return_hub`/`workshop_return`, the act title, the same next-action line
  as the card, the mission log (authorised reminder exposure unchanged —
  `noteM09ReminderLogViewed` still fires on open). Probe adds `restored`,
  `return_path`, `act`.
- **Restoration in the Concourse** (`StationConcourseScene`): the status
  wall's six sector lamps follow the story state (dark / amber / green +
  tick bar), five work-area light pools go cold → warm at act 3, a scorched
  junction and fallen fragment on the north wall are repaired once the
  feeds are restored; `onStoryStateChanged()` re-runs on every stage
  change, zone entry and overlay resume; DEV probe `__restorationProbe`.
  The Dock shows only cold emergency pools in act 1.
- **NPC posts**: `npcPosts()` documents the posts; no scene moved an NPC in
  U2 — Kai stays at the Laboratory briefing desk at every stage because he
  is an authorised M10 handover recipient there on the return leg
  (scientific preservation; open decision OD-W1-4), beside the operations
  desk from `return_hub` (existing) and at the Core console (existing).

## 2. Tests

| Spec                                                                                           | Proves                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `world_v1_story_state.spec.ts` (pure)                                                          | eight acts monotonic; one ≤ 44-char operational line per (stage, zone), no passed door, no measurement word; restoration from stage/terminality only, monotonic, restores with zero task success; map marks + return path; NPC posts (recipients retained, clear of doors); captions; `advancePilotStage` callers = explicit beats/commits only |
| `world_v1_story.spec.ts` (runtime)                                                             | opening ≤ 20 s with three captions and the landed shuttle; skip ≡ complete; card title/action in acts 1–2, canvas-safe, clear of the terminal and the avatar, refreshed at check-in / stage change / zone change; map state; restoration persists across a zone exit and re-entry                                                               |
| `world_v1_interactions.spec.ts`                                                                | re-run with the moved terminal (Dock + Concourse + doors)                                                                                                                                                                                                                                                                                       |
| `world_v1_camera.spec.ts`, `world_v1_registry.spec.ts`, `spawn_clearance`, `pilot_route_model` | camera contract and pure invariants with the new Dock geometry                                                                                                                                                                                                                                                                                  |
| `dock_tutorial_paths`, `movement_and_first_interaction`                                        | the legacy Dock bay unchanged                                                                                                                                                                                                                                                                                                                   |
| `pilot_route.spec.ts` (topology)                                                               | non-success-gated advancement through every beat (see §3 for the Laboratory driver)                                                                                                                                                                                                                                                             |
| `world_v1_u2_capture.spec.ts`                                                                  | frames at 800×600 and 1280×720 → `unit2/`                                                                                                                                                                                                                                                                                                       |

## 3. Results

`npm.cmd run lint:tsc`, `npm.cmd run build`, scoped ESLint + prettier: pass.
Runtime runs on port 5372, `--retries=0 --workers=1` (logs `u2-run1.log`,
`u2-run2.log`, `u2-route.log` in the session scratchpad):

| Spec / run                                                                                                                      | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pure: `world_v1_registry`, `world_v1_story_state`, `pilot_route_model`, `spawn_clearance`                                       | 26/26 (reachability with the moved terminal; 7 story-state tests)                                                                                                                                                                                                                                                                                                                                                                                                    |
| run 1: `world_v1_story`, `world_v1_interactions`, `world_v1_camera`, `dock_tutorial_paths`, `movement_and_first_interaction`    | 9/12 — card placement/refresh ✓, restoration persistence ✓, camera 3/3, legacy Dock 3/3, Concourse prompts ✓; **3 failed**: two driver legs ended 20–30 px short right after a scene load / prompt close (70 ms bursts landing inside one slow frame), and the completed opening never reached caption 3                                                                                                                                                             |
| diagnosis                                                                                                                       | the opening's captions ran on Phaser timers, which accumulate the frame-capped delta: at the renderer's slow frames game time ran at ≈ 60 % of wall time (shuttle "landed" at 9.5 s game time ≈ 15 s wall). Fixed: the whole shot is wall-clock driven in `update()`; the paused Dock is hidden while the shot runs; the alpha overlay became per-image tints. Driver: a no-motion short burst doubles the next burst (≤ 240 ms) instead of counting as a wall clamp |
| run 2: the three re-runs                                                                                                        | **3/3** — opening ≤ 20 s with three captions and the landed shuttle, skip ≡ complete (event types, stage, zone, spawn, card, instruction identical); Dock prompts + check-in; every Concourse door both ways, one press = one door use                                                                                                                                                                                                                               |
| run 2: `world_v1_u2_capture` at 800×600 and 1280×720                                                                            | 1/1 each → `unit2/800x600/`, `unit2/1280x720/` (10 frames each)                                                                                                                                                                                                                                                                                                                                                                                                      |
| run 3 (after the correction round): pure 26 + `world_v1_story` 3 + `world_v1_interactions` 3 + `world_v1_camera` 3; captures ×2 | **32/32**, captures 1/1 each (frames regenerated)                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `pilot_route` topology + `pilot_episodes_1_2` episode 1 (runs `u2-route`…`u2-route4`)                                           | route/route2: failed on the destroyed-image defect (fixed); route3: both failed approaching Vale from the north spawn — the walker's re-route restored one axis only and re-entered the ops island; fixed (back to the full start point); **route4: 2/2** — the whole six-zone topology including the Laboratory's Kai prompt (the U1 §5b driver failure is thereby closed) and episode 1's independent windows                                                      |
| projection `world-v1-u2` vs `world-v1-before` (U0)                                                                              | see §3b                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

### 3b. Projection `world-v1-u2` (recorded, NOT green)

`V4_LABEL=world-v1-u2 V4_PROJECTION_BASELINE=…/world-v1-before.json npx playwright test e2e/v4_event_projection.spec.ts`
→ the full route now completes under the driver (the Core reached; 5.7 min)
and `projection/world-v1-u2.json` + `.diff.json` are written. **5
differences** against the U0 baseline, all one root: the driven route did
not open the Concourse monitor gauge (`pilot_station_opened` 7 → 6,
`proto_m09_watch_check_completed` 1 → 0 and its payload-key set absent,
sequence length 154 → 152, one sequence index shifted). No other event
family, window id, form assignment, disposition or payload-key set differs.
Whether the miss is the projection spec's own gauge leg (its V4 approach
offsets under the new walker) or a gauge-side defect is **not proven** in
this session — the gate stays **open** and is the first task of U3
(re-drive the gauge leg with the registry approach; if the gauge itself
fails to prompt, that is a U2 defect to fix before U3 work).

Frames inspected at 1:1: the opening is the same top-down perspective and
pixel scale as the rooms (module roofs, corridors, the mast with its arm in
the snow, the shuttle on the pad in front of the Dock module's threshold;
the cut lands on that threshold with the iris sealing); the mission card sits
in the canvas corner clear of the terminal, the avatar and every prompt at
both viewports; the map shows the true topology with the Dock marked
restored in act 2. Frame rate in the verification renderer stayed at
10.5–13 fps in the rooms.

## 4. Reviews and the correction round

Read-only reviews by general-purpose agents running the project briefs
(the named project agents were again not discoverable in this session):
scientific (opus), gameplay + burden (opus), visual (opus), test (sonnet).
One consolidated correction round (bounded, inside the allowlist).

**Scientific — "concerns found, nothing blocking".** S1 PASS: every
narrative/restoration/map/card state reads a stage or a boolean
disposition, never a value. S2 MEDIUM: the new warm work-area pool in the
reading nook sat 48 px from the M05 lamp and turned amber from act 3 —
**fixed** (no pool in the nook; the lamp's surroundings keep their pre-U2
salience). S3 MEDIUM-LOW: `pilot_opening_skipped/completed` carry no
`elapsed_ms`/captions-seen → **research-owner decision** (event payload;
OD-W1-5). S4 LOW: door-naming lines add wayfinding specificity; the feed
line is less explicit than before → recorded. S5 LOW: the map's
`return_hub` path pre-announces the Records Workshop before Vale's beat →
**research-owner question** (OD-W1-6; M20/M22 sit on that leg). S6 LOW:
`npcPosts()` is a documentation model, not a driver → recorded. S7 LOW:
`feedsReady` is a count (only thresholded) → recorded. S8 PASS: reminder
exposure, `pilotOpening` interaction context, forms, counterbalancing
unchanged; the terminal/spawn moves are geometry only.

**Gameplay — "usable with noted friction".** G1 HIGH: act 1 showed two
cues at once (the marker's ring and the terminal's guidance pool on the
same row) → **fixed**: the Dock has no guidance target until the marker is
reached, then the terminal, then the exit (one cue at a time; the tutorial
mechanic is unchanged). G2 HIGH: the Yard still returned the V4 route line
at `exterior_briefing` ("Take the airlock … and report to Noor", a passed
door) → **fixed** (story line for every stage but the site line). G3
MEDIUM: the act-2 packet's three parts are named once by Vale and the map
log is empty — adding them to the log would be a new reminder exposure →
**not changed**, routed with S5. G4 MEDIUM: the map called a passed zone
"restored" → **fixed** ("work done" tag and legend; the status wall keeps
the restoration language). G5: return path colour + width only → the
"RETURN" label already names it; recorded. G6 LOW: opening facts are not
recoverable later → recorded for the design owner (a briefing panel on the
map would be new exposure). G7 LOW: the Concourse damage repairs at a wall
nobody worked on → recorded (U6 may tie it to the feeds visibly). G8 LOW
(pre-existing): Vale's "Good — you made it…" → **fixed** ("You made it
through the storm.").

**Visual — "readable with noted defects".** V1 HIGH: the tinted shuttle
read as a grey triangle → **fixed** (lighter hull plates; the shuttle keeps
its own colours under the dawn). V2 HIGH: the airlock seal was invisible
because the strip runs closed (0) → open (6) and the leaf had been set to
frame 3 → **fixed** (closed = 0; the cut shows 6 and steps to 0). V3 HIGH:
Vale's prompt above the figure covers the status-wall console face →
**not changed** (the global prompt-placement rule; the lamps themselves
stay visible; recorded for U3's HUD pass). V4 MEDIUM: the card panel covers
the speaking NPC (the NEXT-06 panel design) → recorded. V5 MEDIUM: the
terminal kept "E — Check in" after the check-in → **fixed** (class-3 state
"checked in"; E shows it). V6 MEDIUM: the marker ring is the least salient
element → addressed by G1 (the pool no longer competes). V7 MEDIUM: the
Concourse's lit floor bands read empty → recorded (density continues in
U3–U6 with the restoration dressing). V8 LOW: the map's dim backdrop left
the letterbox bands undimmed → **fixed** (full-canvas backdrop). V9 LOW:
9 px map tags illegible at 800×600 → **fixed** (10 px). Asset notes:
the pad slab's V4 hue and the two figure registers (player suit vs NPC
uniform) are pre-existing; the new procedural textures are **not approved**
by any review (human decision).

**Test review** — see §4b (report of the sonnet reviewer).

**Runtime defects found by the route run and fixed in the same round:**
(a) the Concourse's presentation arrays (lamps, pools, dressing) survived
scene re-creation, so a stage change after a revisit drove destroyed
images (`setTexture` threw on the route at `workshop`) → arrays reset in
`populateRoom()`; (b) the `openPromptAt` diagnostic referenced an
out-of-scope name (`ReferenceError`) → fixed; (c) the episode-1 desk-lamp
press is now event-synced with a swallowed-press retry (the initiation is
the act; a lost press is re-pressed, never inferred).

### 4b. Test review (sonnet)

T1: the card-overlap check recomputes canvas rects from the game's own
probes — internal consistency of the probes, not a pixel proof → recorded
(the frames were inspected by eye and by the visual review). T2/T3: the
restoration-persistence and skip≡complete checks are real (two independent
sessions; re-render on revisit). T4: the `interactAt` nudge could mask a
small geometry regression silently → **fixed** (every nudge is logged in
the run output). T5: the `walkTo` re-route can path around a new wall →
recorded (the pure reachability spec, not the driver, is the geometry
gate). T6: the episode-1 lamp retry lacked failure diagnostics → **fixed**
(observed position/prompt/feedback in the assertion). T7/T8/T9: the
destroyed-image defect confirmed deterministic and fixed; run-1 failures
were load-sensitive and passed unchanged on re-run; the episode-1 lamp
failure was open at review time — closed by route4 (2/2). T10: no spec
mutates game state through `window.*`. ESLint clean on all six files.

## 5. Decisions and open items

- **OD-W1-4 (Kai's return-leg location).** The story-state draft removed
  Kai from the Laboratory at `return_hub`; the Laboratory Kai is an M10
  handover recipient, so he stays. The research owner decides whether the
  Laboratory handover path should remain on the return leg (then U4 gives
  Kai a believable return-leg pose there) or the Concourse post is the only
  recipient.
- **Save/reload.** A page reload is a new session by contract
  (`STATE-AND-SESSION-CONTINUITY.md` §4); restoration persistence is proven
  across zone exit/re-entry within a session; U7 verifies the reload
  semantics for every act.
- **OD-W1-5 (opening exposure covariate).** Should `pilot_opening_skipped`
  / `pilot_opening_completed` carry `elapsed_ms` and the captions seen, and
  is the ≤ 15.4 s opening admissible inside session-elapsed control
  variables? Event-payload decision for the research owner.
- **OD-W1-6 (map look-ahead on the return).** The station map highlights
  the return path to the Records Workshop at `return_hub` before Vale's
  check-in beat names it (M20 is never reminded; M22 sits on that leg). The
  owner decides whether the path may show before the beat.
- **Exterior site lines.** In the Yard at `exterior_work` the existing
  exterior objective model's site lines (up to 118 characters) still fill
  the card and wrap to more than one line; U5 shortens them with the Yard
  rebuild (the story-state line is the fallback elsewhere).

## 6. Not done in U2 (by design)

Records/Laboratory/Yard/Deck/Core rebuilds (U3–U6); item-purpose registry
(U3); the Laboratory Kai driver failure and the projection gate (U4).

## 7. Allowlist amendment (recorded, not silent)

Beyond the U2 row: `src/world/kit/kitTextures.ts` (exterior/opening kit),
`src/world/layouts/dock.ts` and `src/pilot/zoneSites.ts` (the terminal move
the mission's Part B orders), `src/scenes/{UtilityCoreDeckScene,CoreChamberScene}.ts`
(one objective line each, to card length), `docs/game/rooms/00-dock-arrival.md`,
`docs/game/world-v1/{STORY-STATE-SPEC,ROOM-BLOCKOUTS}.md`.

## 8. Confirmation

Nothing pushed, merged, tagged, deployed, published, deleted or removed. No
worktree created or removed. No PixelLab call.
