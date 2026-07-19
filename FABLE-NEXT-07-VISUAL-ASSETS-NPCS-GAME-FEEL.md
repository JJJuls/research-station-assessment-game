# FABLE-NEXT-07 — Visual Assets, NPCs and Game Feel (Polar Meridian coherence pass)

Status: **contract — no implementation has started in the session that
wrote it.** This document is the bounded, implementation-ready work
contract for turning the current functional prototype at commit
`103db23` (`fable-autonomous-game-build-v1`) into a visibly coherent
Polar Meridian game.

**Execution model.** The committed contract plus the explicit launch of
an implementation agent against it **authorises all NEXT-07 phases**. No
per-phase human, owner, or research-owner approval gate exists between
ordinary implementation phases: the implementation agent proceeds to the
next phase automatically after (a) a clean local commit for the current
phase, (b) green phase-specific verification (§9), and (c) no blocking
reviewer finding. The agent stops and reports **only** when it hits one
of these stop conditions:

1. a genuine research-owner decision (a standing open decision from §8,
   or a newly discovered event-schema / scoring-plan question);
2. destructive ambiguity — two readings of this contract would produce
   materially different participant-facing results and neither is safe
   to pick;
3. telemetry risk — any indication that a change could alter an event,
   payload, observed moment, or measurement environment (§4);
4. an unavailable dependency that prevents safe completion of the
   current phase;
5. evidence that this contract cannot be followed without altering
   research mechanics.

Governing documents (authority per CLAUDE.md hierarchy):

- Presentation rules: `docs/game/UI-PRESENTATION-CONTRACT.md` (NEXT-06 —
  card panel, status side panels, boundaries).
- Art direction: "Polar Meridian" §2 of
  `docs/game/VISUAL-ASSET-INTEGRATION-PLAN.md` (branch
  `fable-visual-npc-minigame-design-v1`, commit `e0684e9` — read via
  `git show`; not on this branch). Its palette/salience rules are adopted
  here verbatim as constraints.
- NPC roles and neutrality: `docs/game/NPC-DIALOGUE-AND-ROLE-SPEC.md`
  (same commit `e0684e9`).
- External-asset candidates (NOT available): the 97-candidate pack under
  `docs/game/assets/` (`CANONICAL-ASSET-PROMPT-PACK.md`,
  `canonical-asset-candidate-manifest.json`,
  `CANONICAL-ASSET-INTEGRATION-BACKLOG.md`,
  `CANONICAL-ASSET-REVIEW-CHECKLIST.md`) — every record is
  `NOT_GENERATED` / `human_approval: PENDING`.
- Events / scoring / architecture: `docs/research/event-schema.md`,
  `docs/research/scoring-plan.md`, V3 — none of which this contract
  touches (§4 Telemetry preservation).

---

## 1. Ground truth — visual audit at `103db23`

Verified in this pass against the working tree:

**Engine/canvas.** 800×600 FIT canvas, `pixelArt: true`
(`src/index.ts`). Rooms are 32 px tile grids built by
`src/world/StationMapBuilder.ts`; all rooms share one committed Wang
tileset (`tileset-outpost-interior-v3`, slate deck / gunmetal walls)
rendered on a dual-grid visual layer over an invisible collision layer;
the Dock adds a landing-pad overlay (`tileset-outpost-dock-v3`).

**Player.** Full PixelLab sprite set (`public/assets/characters/player/`):
96×96 frames, 8-frame walk + 4-frame idle, rust-orange suit; 8 directions
committed, 4 cardinal directions loaded (`src/scenes/Boot.ts`). The
player is the only committed character art in the game.

**Props.** Twelve committed PixelLab props
(`src/constants/assets.ts` `PROP_TEXTURES`) cover **Dock, Hub and
Archive only**. Every other station on the canonical route renders the
placeholder: a 40×40 teal rectangle (`0x1f7a8c` fill, `0x5fd3c4` stroke)
with a black label chip (`RoomScene.buildInteractableVisual`,
`src/world/RoomScene.ts:424-438`). Prop-less stations:

| Room (scene)                                | Placeholder stations                                                                                                        |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Engineer Hub (`EngineerScene`)              | "Engineer Kai" (304,176); Calibration Bench (512,176)                                                                       |
| Inventory/Prep (`InventoryScene`)           | Quartermaster Console (320,176); Hand Tools Rack; Consumables Bin; Electronics Shelf; Prep Bench; Field Kit Crate; Seal Log |
| Systems Repair (`RepairScene`)              | Repair Panel; Repair Manual                                                                                                 |
| Hazard Control (`HazardScene`)              | "Hazard Warning" (single station)                                                                                           |
| Side Repair Bay (`SideRepairScene`)         | Utility Bot; Parts Shelf                                                                                                    |
| Interruption Corridor (`InterruptionScene`) | Comms Beacon; Relay Checkpoint; Antenna Junction                                                                            |
| Final Core (`FinalCoreScene`)               | Core Interface                                                                                                              |
| Station Hub (`HubScene`)                    | Priority Allocation console (the only unskinned station in a skinned room)                                                  |

**NPCs.** None exist. `public/assets/characters/npcs/` contains only
`.gitkeep`. Kai is a labelled rectangle; the Quartermaster has no
visual presence at all — the name "Vale" appears nowhere in `src/`.

**UI.** NEXT-06 card panel (560 px, `#101820` backdrop, `#1a2733` cards,
cyan `#5fd3c4` focus border + `▸` marker, monospace text), read-only
status side panels (x = 650, 146 px wide), duty-roster HUD line,
1600 ms feedback toast, floating "Press SPACE to interact" proximity
prompt, black label chips. All UI is runtime rectangles/text;
`public/assets/ui/` is empty.

**Motion/feel.** Room transitions already fade out (250 ms,
`SceneRouter.transitionToRoom`) and fade in (200 ms, `RoomScene.create`).
The Dock movement-target marker has the only tween in the station world.
No lighting, no ambient animation, no interaction effects, no NPC
animation, no audio (audio is decision-gated; zero assets by design).

**Depth.** `src/constants/depth.ts` defines only `AbovePlayer = 10`,
`AboveWorld = 20`.

**Test/verify infrastructure.** All automated tests are Playwright specs
in `e2e/` (33 files, 102 tests at `103db23`); there is **no** `tests/`
directory and no unit-test runner. npm scripts at HEAD: `build`,
`bundle`, `clean`, `lint`, `lint:fix`, `lint:tsc`, `preview`, `start`.
Traceability validation: `node scripts/validate-traceability-matrix.mjs`.

**Net diagnosis.** Dock → Hub → Archive read as a finished game; the six
remaining rooms read as diagrams. The two human beats of the route (Kai,
the Quartermaster) are rectangles. That asymmetry is itself a salience
confound (finished rooms attract more engagement than diagram rooms), so
closing it is both polish and measurement hygiene.

---

## 2. Objective and priority order

Make one normal playthrough of the canonical route (Dock → Hub → the six
station rooms → Final Core) look and feel like a coherent Polar Meridian
game **using only what can be produced in-repo today**. Priorities, in
order (highest visible-impact first):

1. **Identifiable NPCs** — Kai (Engineer Hub) and the Quartermaster
   (Inventory/Prep) become recognisable human figures, distinct from the
   player and from each other.
2. **Consoles and workstations** — no station on the canonical route
   renders the bare 40×40 placeholder rectangle; each station family has
   a distinct silhouette (console, bench, rack, bin, crate, beacon,
   warning panel, core interface).
3. **Distinctive rooms** — room identity via prop-silhouette clusters
   (never palette shifts — a research constraint, visual plan §2.2).
4. **Interaction indicators** — a pulse on the currently nearest
   eligible in-range interactable only, ceasing naturally when no
   interaction is eligible, so what SPACE will do is always legible.
5. **Environmental props** — non-interactive dressing (duller than
   interactables, always).
6. **Lighting** — one uniform, subtle ambient treatment identical in
   every room (edge vignette + emissive accents baked into interactable
   textures). Never per-room tints.
7. **Animation** — small, cool-toned, fixed-parameter ambient loops on
   non-interactive decor with equivalent treatment in every canonical
   room (§6 Phase 7), plus optional identical Kai/Quartermaster idle
   treatment. No new player animation work (diagonal frames stay
   unloaded — out of scope).
8. **Transitions** — already fade both ways; only verify uniformity and
   add nothing unless a gap is found.
9. **UI typography and neutral feedback** — readability pass on the one
   surface participants read for the whole session (line spacing, toast
   duration, label chips, panel hierarchy). Strings unchanged except the
   Phase 6 controls card explicitly authorised in §4.4.

---

## 3. Asset-source rules

**Allowed now (this contract):**

- **A1 — Procedural Phaser textures**, generated at Boot by code in this
  repo (see §5). Deterministic: pure functions of hard-coded constants —
  no randomness, no time/date dependence, identical stimuli for every
  participant and every session.
- **A2 — Reuse of the twelve committed PixelLab props** in other rooms
  where the depiction is honest (e.g. `prop-hub-console` as a generic
  console, `prop-dock-crates` as stores, `prop-archive-racks` as
  machinery, `prop-hub-door-frame` on every room→Hub door). Reuse never
  re-generates or edits the PNG.
- **A3 — Reuse of committed tilesets** (already global).

**Not available / not allowed in this contract:**

- **PixelLab generation** — tooling absent in this environment
  (`CANONICAL-ASSET-PRODUCTION-REPORT.md` §1) and gated on explicit
  standalone approval regardless. The 97 candidates stay `NOT_GENERATED`.
- **Any third-party/downloaded art, fonts, or audio.** A bundled webfont
  would be an external asset — excluded; typography work uses the
  existing monospace stack only.
- **Tuxemon/template assets** (`src/assets/`) in any participant room —
  licence undocumented; prototype-only, untouched.
- **Fabricated provenance** of any kind. Procedural textures are
  documented as procedural, never presented as generated art.

**Forward compatibility.** Every procedural texture key uses the `proc-`
prefix (e.g. `proc-console-report`, `proc-npc-kai`) — disjoint from the
committed `prop-*` namespace — and is applied through the existing
`texture:` field of `addStation`/`addDoor`/`addDecor` configs. When the
gated external pack is eventually generated and approved, each swap is a
one-line texture-key change per station (Integration Backlog batches 1-5
remain the plan of record for that later pass; this contract does not
pre-empt it).

---

## 4. Telemetry-preservation requirements (hard, every phase)

1. **No event identifier, payload field, payload value, or observed
   moment changes.** No new events: hover, focus, pulse, animation and
   panel rendering never log (UI-PRESENTATION-CONTRACT §4).
2. **No changes** to `EventLogger`, `SessionState`, `QualtricsBridge`,
   `DataQualityTracker`, `ScoringManager`, `ResearchRuntime`,
   `ResearchExportClient`, `CanonicalEventContext`, scenario definitions,
   `pilotRoute.ts`, `stationRegistry.ts`, or `SceneRouter` routing
   tables.
3. **No station/door/spawn coordinate, interaction-radius (72 px), room
   layout grid, or collision change.** Art renders at existing
   positions; the dual-grid/`texture:` mechanisms structurally guarantee
   collision and interaction regions are untouched.
4. **No gameplay-string changes.** All existing participant-facing
   strings stay byte-identical. Exactly **one** piece of new
   participant-facing copy is authorised by this contract: the Phase 6
   pause-menu controls card, which is **mechanics-only** — neutral
   control instructions for movement, SPACE interaction, mouse/arrow +
   Enter choice selection, and ESC pause, and nothing else. It must
   contain no task, trait, score, construct, success, or outcome
   information. No "Quartermaster Vale" label and no completed-station
   label suffix are added anywhere (§8 — both resolved conservatively).
   Byte-pinned surfaces (status-board text, ADV-5) are untouchable. No
   validated Q01-Q33 wording anywhere.
5. **Selection flow untouched**: `selectPromptOption` remains the single
   selection path; prompt open/close semantics, one-shot gates, chained
   stages unchanged.
6. **DEV probes keep their shapes**: `__playerProbe`, `__promptCards`,
   `__lastRoomFeedbackText`, `__routeObjectiveText`, `__lastPromptBody`,
   `__roomStatusText`, `window.researchRuntime`.
7. **Measurement-neutral presentation** (consolidated from the governing
   docs, enforced as visual acceptance criteria in §7): cyan `#5fd3c4`
   only on interactables/guidance; amber only in Hazard Control; decor
   duller than interactables; the four scenario consoles visually
   identical; no state-dependent salience (the rejected archive
   shelf-glow precedent binds all rooms); no colour-only states; no
   flashing/strobe; no praise/blame valence in any visual state; the
   Quartermaster must not look visually "suspect" (Scenario D); no
   score-flavoured visuals; identical presentation for every
   participant.
8. **Frozen-stimuli versioning**: `ASSET_SET_VERSION`
   (`src/constants/assets.ts`) is bumped **exactly once**, intentionally
   and monotonically (`outpost-assets-v1` → `outpost-assets-v2`), at the
   completed NEXT-07 baseline — in the final verification/documentation
   commit, not per internal phase. **No participant research data may be
   collected from intermediate NEXT-07 development commits**; only the
   completed, version-bumped baseline is a valid stimulus set. The final
   telemetry-invariance comparison (§10 Route D) tolerates exactly this
   single `asset_set_version` difference.
9. **Mid-sample rule**: none of this lands mid-pilot. The completed
   baseline lands before any pilot data collection starts, or between
   studies.

---

## 5. Fallback procedural-art strategy (the foundry)

One new module, `src/world/proceduralTextures.ts` (exported through the
existing `src/world/index.ts` barrel), owns every runtime-generated
texture:

- `ensureProceduralTextures(scene)` called once from `Boot.create()`
  (before scene routing) generates all `proc-*` textures via
  `Phaser.GameObjects.Graphics.generateTexture` — the exact pattern
  `StationMapBuilder.ensurePlaceholderTexture` already uses.
- **Palette constants imported from one place** (module-level constants
  matching the encoded Polar Meridian values): deck `#39465a`, wall
  `#2b3a4a`, door `#3f5a66`, edge `#1d2937`, panel `#101820`, card
  `#1a2733`, border `#33475a`, interactable accent `#5fd3c4` (only on
  interactables), muted text `#9fb2c1`, hazard amber (Hazard Control
  only, single value chosen at implementation, e.g. `#d9a441`).
- **Shared drawing language** so everything reads as one set: 1-2 px
  dark outline (`#1d2937`), single top-left light direction (one lighter
  rim line), flat fills + one shade step, small cyan emissive elements
  only where the object is interactable (screen glow, button strip),
  sizes in the committed-prop range (32×48 to 64×64).
- **Prop families** (one draw function each; exact pixel layout is
  implementation detail, silhouette is contract): wall console
  (terminal-on-stand), work bench, parts shelf/rack, storage bin, crate,
  warning panel (Hazard only; amber band), comms beacon (tall thin
  mast), utility bot (squat rounded chassis), core interface (wide
  monitor bank), scenario console (one distinct silhouette used
  identically ×4). Stations without a bespoke family (e.g. Relay
  Checkpoint, Antenna Junction, Repair Manual) reuse the nearest honest
  family silhouette rather than growing new architecture.
- **NPC figures** (`proc-npc-kai`, `proc-npc-vale` — the key name is
  internal only; no participant-facing name is added): pixel figures
  drawn to match the player's _apparent on-screen body height_ (±10%;
  measure against the rendered player, whose 96×96 frames have a 32×42
  body). Shared language: dark outline, visor band instead of facial
  features, suit in a cold-neutral role hue — Kai slate-teal, the
  Quartermaster grey-green (NPC spec §2) — so the player's rust-orange
  remains the only warm mid-tone. Distinct silhouettes, not
  palette-swaps: Kai holds a slate tablet; the Quartermaster wears a
  shoulder strap/satchel. Static south-facing. These are explicitly
  **placeholder-tier stand-ins** pending the gated external NPC pass —
  but unlike tinted player clones (the rejected "twin" path, NPC spec
  §2) they are legitimate participant-facing figures because they share
  no frames with the player.
- **Determinism coverage**: the foundry exports a fixed manifest
  (key → dimensions); coverage asserting the manifest is stable and
  `ensureProceduralTextures` is idempotent (second call adds no keys)
  lives in the repository's existing test infrastructure — a Playwright
  spec under `e2e/` (the repo's only test harness; there is no `tests/`
  directory and **no new test runner may be introduced** for this).

Fallback ordering rule: `buildInteractableVisual` already prefers a
loaded `texture:`; configs point at `proc-*` keys now and can point at
approved committed props later. The 40×40 rectangle remains the terminal
fallback if a texture is missing — after this contract it should never
be reachable on the canonical route.

---

## 6. Phased commits

**Structure: seven phases comprising eleven implementation commits —
Phases 1, 2, 3, 4a, 4b, 4c, 4d, 4e, 5, 6 and 7 — plus one additional
final verification/documentation commit.** Conventional commit style
with a `(NEXT-07 phase N)` suffix. The agent moves from one commit to
the next automatically under the Execution model (no per-phase human
approval); each commit must pass the §9 per-commit gates first.

### 6.0 Implementation pre-flight (before any code change)

1. **Confirm the starting commit contains this contract** before
   creating the implementation worktree; then create **one** isolated
   worktree and **one** NEXT-07 branch from it (§11 git permissions).
2. **Verify every referenced path and npm script exists** at the
   starting commit before editing (the §1 references were verified at
   `103db23`; re-verify at the actual base). If a referenced structure
   does not exist — e.g. a `tests/` directory — use the repository's
   actual existing structure (`e2e/` Playwright harness,
   `src/world/index.ts` barrel) rather than creating unnecessary
   architecture.
3. **Preserve line endings and avoid unrelated formatting churn** (this
   repo has a history of CRLF-sensitive tooling on Windows worktrees):
   no repo-wide formatter runs, no whitespace-only diffs outside touched
   hunks; `git diff --check` clean at every commit.

### Phase 1 — Foundry + Engineer Hub (Kai embodied)

- Files: `src/world/proceduralTextures.ts` (new),
  `src/world/index.ts`, `src/scenes/Boot.ts` (one `ensure…` call),
  `src/scenes/EngineerScene.ts` (texture keys + decor), determinism
  coverage per §5 (Playwright spec under `e2e/`).
- Content: `proc-npc-kai` composite station visual at the existing
  "Engineer Kai" station (person-at-console — the station _is_ the
  person, label unchanged, position/radius unchanged); west/east bench
  blocks dressed with `prop-archive-racks` / `prop-dock-crates` (A2
  reuse, visual plan §3.3); `prop-hub-door-frame` on the Hub door.
  Calibration Bench is deliberately **not** touched (Phase 3 owns
  scenario-console uniformity; until then it keeps the placeholder).
- Accept: Kai reads as a human figure at a glance from the room door;
  no palette or salience change to the bench.

### Phase 2 — Inventory/Prep (Quartermaster embodied + seven stations)

- Files: `src/scenes/InventoryScene.ts`,
  `src/world/proceduralTextures.ts` (bin/rack/shelf/bench/crate/console
  families).
- Content: Quartermaster Console gets `proc-console-quartermaster`;
  Hand Tools Rack / Consumables Bin / Electronics Shelf / Prep Bench /
  Field Kit Crate each get their family texture (five distinct
  silhouettes — the per-item minigame becomes spatially legible); the
  Quartermaster figure (`proc-npc-vale`) placed as non-colliding,
  non-interactive decor adjacent to the console (exact offset chosen at
  implementation to keep approach paths clear; never obstructing;
  **unlabelled** per the §8 resolved default — the existing
  "Quartermaster Console" label already carries the role). Seal Log
  deliberately untouched (Phase 3). `prop-dock-crates` /
  `prop-archive-shelves` dressing on the storage blocks (visual plan
  §3.5); door frame.
- Accept: all five item stations distinguishable by silhouette alone;
  the Quartermaster figure visually neutral (no lighting/pose singling
  them out).

### Phase 3 — Shared scenario-console treatment (uniformity beat)

- Files: `src/scenes/HubScene.ts` (Priority Allocation),
  `src/scenes/EngineerScene.ts` (Calibration Bench),
  `src/scenes/ArchiveScene.ts` (Reconciliation Desk),
  `src/scenes/InventoryScene.ts` (Seal Log); foundry.
- One commit across four scenes is a deliberate, contract-authorised
  exception to the one-room-per-commit habit: the four ethical-scenario
  stations must become visually identical **simultaneously** —
  staggering them would create a temporary salience asymmetry between
  scenarios (visual plan §2.4).
- Content: one `proc-console-scenario` texture applied identically ×4;
  distinguishable from canonical task stations by silhouette only,
  never by a stronger cue.
- Accept: the four stations are pixel-identical (same texture key, no
  per-room variation).

### Phase 4 — Remaining rooms (one commit per room: 4a-4e)

Order: 4a Systems Repair, 4b Hazard Control, 4c Interruption Corridor,
4d Final Core, 4e Side Repair Bay.

- Files per commit: that room's scene file, foundry additions.
- Content: family textures on every placeholder station (Repair Panel +
  Repair Manual; the single Hazard Warning panel carrying the **only**
  amber in the game; Comms Beacon / Relay Checkpoint / Antenna
  Junction; core interface via `proc-core-interface` plus
  `prop-hub-status-board` + `prop-archive-racks` dressing (visual plan
  §3.6, skipping `prop-archive-panels` — its salience caveat stands);
  Utility Bot + Parts Shelf); `prop-hub-door-frame` on each Hub door.
- Accept per room: no bare rectangle remains; room identity readable
  from its prop cluster; Hazard amber appears on the warning panel
  band only, matte, never flashing.

### Phase 5 — Interaction indicators + label chips

- Files: `src/world/RoomScene.ts` only (touchy shared file — this beat
  is deliberately isolated).
- Content: (a) alpha pulse on the **currently nearest eligible
  in-range** interactable marker only (700 ms, alpha 1→0.4 yoyo — the
  Dock marker's committed tween values, so guidance strength is
  uniform); the pulse ceases naturally whenever no interaction is
  eligible — out of range, a prompt is open, a transition is running,
  or (where a room already exposes a completion predicate) a one-shot
  station that only replays its already-done feedback. **No label
  suffix and no other completed-state copy is added** (§8 resolved
  default — the visual settled state is simply the absence of the
  pulse). (b) Label chips restyled from raw black to the panel language
  (`#101820` @ 0.92, 1 px `#33475a` border) — label text content
  byte-identical everywhere.
- Accept: exactly one pulsing marker at a time; pulse identical in
  every room; no text diffs anywhere.

### Phase 6 — UI typography + neutral feedback polish

- Files: `src/world/RoomScene.ts`, `src/scenes/Menu.tsx` (controls
  card).
- Content: `lineSpacing: 4` on prompt header/cards/toast; toast
  duration 1600 → 2200 ms (display-only timer; blocks no input, delays
  no event); consistent padding rhythm in the card panel; status-panel
  header/body visual separation (rule line); pause-menu static controls
  card — **explicitly authorised mechanics-only participant copy**
  (§4.4): neutral control instructions covering movement (WASD/arrow
  keys), SPACE interaction, choice selection (point and click, or
  arrow keys + Enter), and ESC pause — and nothing else: no task,
  trait, score, construct, success, or outcome information. All other
  strings byte-identical; monospace stack unchanged (no font bundling).
- Accept: prompt body/options readable at 800×600 FIT in a small
  window; the only string diff in the phase is the controls card.

### Phase 7 — Lighting + ambient animation (uniformity-first)

- Files: `src/world/RoomScene.ts` (shared vignette + shared ambient
  helper), `src/sprites/Player.ts` (drop-shadow ellipse), foundry,
  scene files only where a designated decor element is wired up.
- Content, in strict order of admissibility:
  - (a) **Uniform vignette**: single pre-generated radial-gradient
    texture at screen size, identical alpha in **every** room —
    uniformity is the point; skipped entirely if it muddies legibility
    at review.
  - (b) **Uniform player drop shadow**: static ellipse under the body,
    depth below player, identical in every room.
  - (c) **Optional identical NPC idle treatment**: a 2-frame idle bob
    applied with identical parameters to both Kai and the Quartermaster,
    or to neither.
  - (d) **Room ambient decor loops — equivalence or deferral**: ambient
    animation is limited to **non-interactive decor** and must use
    equivalent density (one designated decor element per canonical
    room), identical period (≥ 1.5 s), amplitude and brightness in
    every canonical room, cool tones only, no amber, no white flash.
    **The Hub status board and every decision-relevant or interactable
    surface are never animated merely for ambience.** If an equivalent
    treatment cannot be implemented safely across **all** canonical
    rooms (e.g. a room lacks a suitable non-interactive decor element),
    **defer room ambient loops entirely** rather than animating only
    some rooms (never a Dock/Hub/Final Core-only subset).
- Accept: no room reads warmer/cooler or more/less alive than another;
  animation never draws the eye to any decision-relevant station; no
  flashing.

### Final commit — verification/documentation (the twelfth commit)

- Files: `src/constants/assets.ts` (the single `ASSET_SET_VERSION` bump
  to `outpost-assets-v2` — §4.8), plus documentation of the completed
  pass (durable verification record consistent with prior NEXT units).
- Content: full-suite run and final gates (§9), manual routes A-D
  (§10), reviewer set at final state, final report. No other source
  changes; any fix a final gate forces happens in its own preceding
  commit, after which the final gates re-run.

**Explicitly not scheduled** (stays in the gated backlog): every
PixelLab batch, audio, minimap, Evidence Ledger, Records Officer /
MERIDIAN embodiment, diagonal player frames, status-board content
changes (S1/ADV-5), requisition display (SA-11), Tuxemon disposition.

---

## 7. Visual acceptance criteria (global, checked at every phase)

1. No 40×40 placeholder rectangle is visible anywhere on the canonical
   route after Phase 4e.
2. Cyan `#5fd3c4` appears only on interactables, doors, guidance cues
   and UI focus — never on decor.
3. Amber appears only in Hazard Control; the player's rust-orange is
   the only warm tone elsewhere.
4. Decor is measurably duller (lower brightness/saturation) than the
   same room's interactables — the data-panels inversion never recurs.
5. The four scenario consoles are visually identical; no other station
   pair is more salient than any scenario console.
6. Kai and the Quartermaster are identifiable as people, mutually
   distinct, distinct from the player, cold-neutral, and neither reads
   as more/less trustworthy than the other.
7. Every state indicator is non-colour-only (a glyph, shape, or motion
   change accompanies any colour change).
8. Nothing flashes: no animation exceeds gentle alpha/position drift;
   no frame-to-frame white or high-contrast strobe.
9. Presentation is identical for every participant and every session
   (determinism coverage + code review — no randomness anywhere in §5).
10. Rooms remain palette-uniform; identity comes from silhouettes.

---

## 8. Presentation decisions — resolved defaults and standing boundaries

The two new-copy questions raised while drafting this contract are
**resolved here with conservative defaults; neither is an open blocker
and neither requires any further approval**:

- **D-N07-1 — Quartermaster naming: RESOLVED — no label.** The
  participant-facing label "Quartermaster Vale" is **not** added. The
  figure remains unlabelled and visually represents the existing
  Quartermaster role; the adjacent console's existing "Quartermaster
  Console" label carries the identity. ("Vale" survives only as the
  internal texture-key name, never shown to participants.)
- **D-N07-2 — Completed-station suffix: RESOLVED — no suffix.** The
  participant-facing suffix " — logged" is **not** added, and no
  completed-station suffix requirement exists anywhere in this
  contract. The interaction pulse (§6 Phase 5) applies only to the
  currently nearest eligible in-range interactable and ceases naturally
  when an interaction is no longer eligible; that absence is the
  entire settled-state treatment.

Standing open decisions this contract must not touch: SA-8..SA-11,
D2-D8, INT-1..6, ADV-5 re-baseline, PROP-CLUTTER-SET/Q04 visuals,
UI-PROGRESS, Evidence Ledger, audio. If any phase turns out to require
one of them, that is stop condition 1 of the Execution model: the phase
stops and reports.

---

## 9. Testing expectations

**Per implementation commit (all eleven), all green before the agent
moves on:**

1. `npm.cmd run lint:tsc` and `npm.cmd run build`.
2. `node scripts/validate-traceability-matrix.mjs` (traceability
   validation).
3. `git diff --check` (no whitespace/line-ending churn — §6.0.3).
4. **Focused Playwright tests** for the touched rooms and shared
   systems only — e.g. `e2e/engineer_hub_logging.spec.ts` for Phase 1,
   `e2e/inventory_prep_logging.spec.ts` for Phase 2, the four
   `scenario_*_logging` specs for Phase 3, the matching room spec for
   each 4a-4e commit, and `e2e/participant_ui_cards.spec.ts` +
   `e2e/connected_world_smoke.spec.ts` for the shared `RoomScene`
   phases (5-7).
5. `npm.cmd run lint` — only because the script exists at HEAD; if it
   is absent at the implementation base, skip it. **Never add or
   replace a lint framework**, and never introduce a new test runner
   (§5 determinism coverage rides the existing Playwright harness).

**Full-suite policy:** the complete current suite — expected **102
tests in 33 files** at `103db23`; use the actual count at the
implementation base — runs **once, at the final integrated NEXT-07
state** (the final verification/documentation commit). An earlier full
run is permitted **only** when a shared-system change creates broad
regression risk (the `RoomScene` phases 5-7 are the expected
candidates); per-room art commits never trigger it.

**Runtime verification:** `playwright-game-verify` evidence for the
phase's room(s) at each logical phase — a green build is never runtime
evidence.

**Review-agent cadence** (review-only; findings route back per
CLAUDE.md):

- `gameplay-implementation-reviewer` + `browser-qa-reviewer`: after
  logical phases (after Phase 1, after Phase 2, after Phase 3, after
  the Phase 4 block completes, and after each of Phases 5-7).
- `research-data-reviewer`: after any change to shared `RoomScene` code
  or participant-presentation surfaces (Phases 3, 5, 6, 7 — plus any
  phase where a reviewer flags an NPC/salience/neutrality surface).
- The **full three-reviewer set** at the final integrated state.

A blocking reviewer finding is a stop-or-fix point: the agent fixes it
in place (new commit, gates re-run) or, if the fix would violate §4,
stops under the Execution model.

**Telemetry-invariance check** (§10 Route D): at the final state, and
after any phase that changes shared interaction infrastructure
(Phases 5-7) — not manually repeated after every room-art commit.

---

## 10. Manual acceptance routes

Visual checks run on a production build (`npm.cmd run preview`) because
DEV shows arcade-physics debug rectangles that contaminate visual
judgement; event checks run on `npm.cmd run start` where
`window.researchRuntime.getEvents()` and the DEV probes exist. Routes
A-C are spot-checked during development as phases land and performed in
full at the final state; Route D follows the §9 cadence.

- **Route A — coherence sweep.** Normal playthrough Dock → tutorial →
  Hub → each station room → Final Core. Per room: no placeholder
  rectangles; station silhouettes match §5 families; decor duller than
  stations; door frames present; §7 items 2-4 and 10 hold.
- **Route B — NPC identity.** Enter Engineer Hub: Kai identifiable as a
  person before reading any label; complete the report flow — no visual
  change to Kai that ranks the chosen option. Enter Inventory/Prep: the
  Quartermaster figure visible beside the console, neutral pose,
  unlabelled (§8); run one per-item prep cycle — the figure never
  obstructs and never reacts.
- **Route C — uniformity and guidance.** Visit all four scenario
  consoles in one session and compare (screenshots): identical. Walk
  between two stations in one room: exactly the nearest eligible
  in-range marker pulses, identical rhythm in every room; the pulse
  ceases when nothing is eligible (walk out of range; open a prompt).
  Confirm no animation anywhere strobes or uses amber outside Hazard.
- **Route D — telemetry invariance.** On `start`, replay a fixed
  scripted route (Dock check-in → Engineer report path 6a of
  `docs/game/UI-MANUAL-ACCEPTANCE-ROUTES.md` → one scenario → Hazard
  informed path) and diff `getEvents()` event-type sequence + payload
  keys against the same route captured at `103db23`. Expected diff:
  none except the single `asset_set_version` provenance value at the
  completed baseline (intermediate commits carry the unbumped value —
  and no participant data is ever collected from them, §4.8).

---

## 11. Non-goals (this contract will not)

- Generate, download, or integrate any external/binary image, font, or
  audio asset; call PixelLab; touch the 97-candidate pack's status.
- Modify research events, payloads, mappings, scoring, persistence,
  routes, gating, scenario logic, SessionState semantics, or any file
  in `src/systems/`, `src/scenarios/`, `src/data/`.
- Move any station/door/spawn, change any layout grid, radius, or
  collision footprint.
- Change byte-pinned or frozen strings; add scenario progress to the
  status board; show requisition state (SA-11); add score or
  personality-flavoured visuals; add any participant-facing copy beyond
  the Phase 6 controls card (§4.4).
- Add NPC pathing, schedules, proximity dialogue, portraits, or any
  branching narrative system.
- Touch `Main.tsx` (prototype), the Tuxemon/template assets, or
  `package.json`/lockfile.
- Implement a minimap, drag-and-drop, timers, or mouse-driven movement.
- Resolve any **standing** open decision (§8 list — D-N07-1/2 are
  resolved by this contract itself).
- **Git boundary:** the implementation agent may create **one** isolated
  worktree, **one** NEXT-07 branch, and local phased commits; it must
  **not** merge, push, create a PR, rewrite existing history, or modify
  the main checkout.

---

## 12. Completion definition

NEXT-07 is complete when **all of the following hold — no individual
human approval between phases is required**:

1. All **eleven implementation commits** (Phases 1, 2, 3, 4a-4e, 5, 6, 7) are present on the NEXT-07 branch, plus the final
   verification/documentation commit (which carries the single
   `ASSET_SET_VERSION` bump).
2. All final gates pass: per-commit gates on every commit, the one
   full-suite run green at the final integrated state, runtime
   verification evidence, the full three-reviewer set with no
   unresolved blocking finding, and manual routes A-D accepted.
3. The canonical route shows **no visible placeholder station
   rectangle** anywhere.
4. The working tree is clean.
5. The final report is produced: rooms touched, files changed, texture
   keys added, verification results, reviewer outcomes, Route D diff,
   and any deferred items (e.g. Phase 7(d) deferral) with reasons.

If the sequence stops early under an Execution-model stop condition,
every landed phase already stands alone as a coherent,
telemetry-invariant improvement, and the stop report takes the place of
the final report. The expected end state: a playthrough in which every
station is a recognisable object, Kai and the Quartermaster are people,
the four scenario decisions look interchangeable, guidance is uniform,
and the event stream is byte-compatible with `103db23` except for the
single asset-set version stamp at the completed baseline.
