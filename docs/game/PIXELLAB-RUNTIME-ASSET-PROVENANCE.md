# PixelLab runtime asset provenance (action-assessment rebuild, Unit 5)

**Status of every entry: PROVISIONAL MODEL-SELECTED, NOT HUMAN-APPROVED.**
Selections were made autonomously by the model from the UNAPPROVED
pixelab-v1 candidate pack; nothing here constitutes research-owner or
human approval, and every promotion is reversible (the original pack is
untouched and read-only).

- Candidate source pack: `asset-candidates/pixelab-v1` at commit
  `62ed9851dd47b9b937e3e0daf30b9b2aa460cfd6` on branch
  `fable-pixelab-asset-candidates-v1` (worktree
  `.claude/worktrees/fable-pixelab-asset-candidates`); pack docs:
  REVIEW-CATALOG.md, TECHNICAL-SPECIFICATION.md, STYLE-BIBLE.md,
  PROVENANCE.md. The pack itself is unmodified.
- Promotion method: local Pillow slicing of the pack's Phaser-ready
  96×96 sheets (rows S/W/E/N, feet-line y=71) into the runtime's
  existing per-frame file layout. Scripts run from the session
  scratchpad; no generation, no retouching, no third-party assets.

## Player (drop-in frame replacement, no code change)

| Runtime destination                                                    | Candidate source                       | Candidate ID                   | Why selected                                                                                                     |
| ---------------------------------------------------------------------- | -------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `public/assets/characters/player/walk/{south,west,east,north}/0-7.png` | `player/sheets/plv1-player-a-walk.png` | `plv1-player-a-walk`           | RECOMMENDED hooded-surveyor concept; verified 96×96 RGBA, S/W/E/N rows, zero semi-transparent pixels, feet 69-71 |
| `public/assets/characters/player/idle/{south,west,east,north}/0-3.png` | `player/sheets/plv1-player-a-idle.png` | `plv1-player-a-idle`           | as above (idle feet exactly 71 on all 16 frames)                                                                 |
| `public/assets/characters/player/rotations/<8 dirs>.png`               | `player/normalized/rotations/*.png`    | `plv1-player-a` base rotations | as above                                                                                                         |

Technical adjustments: none (pixel-exact slice). Known accepted defect:
~5 px walk-cycle size breathing (catalog-documented, visible ≥3× zoom
only). Frame counts and animation timing unchanged (walk 8f@10fps,
idle 4f@6fps — Player.ts contract untouched).

## NPC stills (single frames; texture-key swap in Boot/scenes)

| Runtime destination (`public/assets/pixellab-runtime/npcs/`)            | Candidate source (sheet, row 0 = south)           | Candidate ID               | Role               |
| ----------------------------------------------------------------------- | ------------------------------------------------- | -------------------------- | ------------------ |
| `vale-idle.png`, `vale-ready.png`, `vale-work-a.png`, `vale-work-b.png` | `plv1-npc-d-{idle f0, talk f0, work f0, work f3}` | `plv1-npc-d` (RECOMMENDED) | Quartermaster Vale |
| `kai-idle.png`, `kai-work-a.png`, `kai-work-b.png`, `kai-done.png`      | `plv1-npc-b-{idle f0, work f0, work f3, wait f0}` | `plv1-npc-b`               | Engineer Kai       |
| `noor-idle.png`, `noor-work-a.png`, `noor-work-b.png`                   | `plv1-npc-e-{idle f0, work f0, work f3}`          | `plv1-npc-e` (RECOMMENDED) | Surveyor Noor      |

Technical adjustments: none (pixel-exact 96×96 crops). Loaded in Boot
under `plv1-*` keys; scene texture keys switched from the procedural
`proc-npc-*` placeholders (which remain in the foundry, unused-but-
regenerable, so the determinism manifest is unchanged).

## Explicitly NOT promoted (and why)

- All `*-alpha.png` derivatives (background removal verified
  ineffective), everything under `calibration/` (evidence only),
  `sequences/intro/*` (concept art), opaque-background prop boards
  (`measurement/*`, `props/decoration/state-variant-pairs-a`,
  `props/exterior/exterior-props-b`), isometric-leaning prop boards
  (workshop/inventory/laboratory/arrival/archive) — perspective
  mismatch with the straight-on 32px grid.
- Player action sheets (scan-sweep/dig/carry/...) — deferred: wiring
  them requires Player animation-state changes; recorded as follow-up.
- `plv1-player-a-repair` (missing south row), `plv1-npc-h-idle`
  (missing north row) — incomplete direction sets.

## pixelab-v2 (new generation this session)

See `asset-candidates/pixelab-v2/PROVENANCE.md` (raw candidates are
UNAPPROVED; only technically strong ones promoted, listed there).

## Unit 7 — professional presentation (evidence-led pilot v2, 2026-08-30)

**Status of every entry below: PROVISIONAL MODEL-SELECTED — NOT HUMAN-APPROVED.**
Selected autonomously by the model from the same read-only `pixelab-v1`
pack (worktree `.claude/worktrees/fable-pixelab-asset-candidates`, commit
`62ed985`); the pack is unmodified; nothing was generated (ledger decision
D-U7-2). Slicing/composition used a stdlib-only PNG codec run from the
session scratchpad (no retouching, no resampling, pixel-exact crops padded
onto transparent canvases). Presentation only: no mechanic, event, window,
disposition or score reads any of these textures; every scene keeps its
procedural fallback when a texture is absent. Loaded in `Boot` from
`UNIT7_STILL_URLS` / `UNIT7_STRIP_URLS` (`src/constants/assets.ts`).

| Runtime path (`public/assets/pixellab-runtime/`)                       | Texture key                     | Candidate source (pack-relative)                                        | Candidate ID / role                                      | Transformation                                                                                                             | Technical compatibility                                                       | Selection reason                                                                                                                                          | Known defects                                                                          | Approval           |
| ---------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------ |
| `robots/bot-standby.png`                                               | `plv1-bot-standby`              | `robots/normalized/utility-bot-standby.png`                             | `utility-bot-standby` — Utility Deck bot, idle           | none (96×96 copy)                                                                                                          | RGBA, straight-on, no baked shadow                                            | replaces the procedural bot placeholder; state pair with `working`                                                                                        | none noted                                                                             | NOT HUMAN-APPROVED |
| `robots/bot-working.png`                                               | `plv1-bot-working`              | `robots/normalized/utility-bot-working.png`                             | `utility-bot-working` — bot once all feeds are up        | none (96×96 copy)                                                                                                          | as above                                                                      | state change visible in the world (feeds up)                                                                                                              | none noted                                                                             | NOT HUMAN-APPROVED |
| `sequences/core-sync.png`                                              | `plv1-core-sync`                | `sequences/outpost-events/anim-core-sync-{0..6}.png`                    | `anim-core-sync` — Core column, 7 frames 64×96           | frames composed left→right into one 448×96 strip                                                                           | RGBA; frames 0–5 loop, frame 6 differs in silhouette (excluded from the loop) | the only Core-state animation in the pack; replaces the flat procedural vessel                                                                            | ring jitter between frames; frame 6 inconsistent                                       | NOT HUMAN-APPROVED |
| `sequences/airlock-open.png`                                           | `plv1-airlock-open`             | `sequences/outpost-events/anim-airlock-open-{0..6}.png`                 | `anim-airlock-open` — iris airlock, 7 frames 96×64       | composed into one 672×64 strip                                                                                             | RGBA; frame 0 (closed) used as the door image                                 | both airlocks (lab north door, yard south door) read as airlocks                                                                                          | open frames unused (door transition is a fade, not an animation)                       | NOT HUMAN-APPROVED |
| `sequences/antenna-signal.png`                                         | `plv1-antenna-signal`           | `sequences/outpost-events/anim-antenna-signal-{0..6}.png`               | `anim-antenna-signal` — Mast 04 restored, 7 frames 64×96 | composed into one 448×96 strip                                                                                             | RGBA; only frames 0 and 3 are used (still + slow pulse)                       | restored mast reads as a working antenna                                                                                                                  | silhouettes vary between frames (unusable as a full loop)                              | NOT HUMAN-APPROVED |
| `effects/snowfall.png`                                                 | `plv1-fx-snowfall`              | `effects/sheets/snowfall.png`                                           | `snowfall` — 9 frames 96×96                              | none (864×96 copy)                                                                                                         | RGBA packed sheet                                                             | restrained storm layer in the Recovery Yard (α 0.22; reduced motion = one faint frame)                                                                    | none noted                                                                             | NOT HUMAN-APPROVED |
| `props/core-coolant-column.png`                                        | `plv1-core-coolant-column`      | `props/final-core/final-core-props-a.png` box (19,21,70,150)            | `final-core-props-a` slice — coolant column              | crop, padded to 56×132                                                                                                     | straight-on, RGBA                                                             | flanking machinery mass beside the Core column                                                                                                            | contact-sheet lineage (uncropped in the pack)                                          | NOT HUMAN-APPROVED |
| `props/core-pillar-a.png`, `props/core-pillar-b.png`                   | `plv1-core-pillar-a/-b`         | same sheet, boxes (157,21,187,100) / (205,21,235,100)                   | ring pillars                                             | crops padded to 32×80                                                                                                      | straight-on                                                                   | chamber corner mass                                                                                                                                       | as above                                                                               | NOT HUMAN-APPROVED |
| `props/core-console.png`                                               | `plv1-core-console`             | same sheet, box (88,23,141,94)                                          | pedestal console                                         | crop padded to 56×72                                                                                                       | 3/4 view like the procedural consoles                                         | Kai's feed console                                                                                                                                        | as above                                                                               | NOT HUMAN-APPROVED |
| `props/utility-tower.png`                                              | `plv1-utility-tower`            | `props/utility-bay/utility-bay-props-a.png` box (179,14,243,91)         | utility-bay slice — sight-glass tower                    | crop padded to 64×80                                                                                                       | straight-on; slightly more saturated than the foundry palette                 | deck machinery mass (north-west)                                                                                                                          | palette register slightly warmer                                                       | NOT HUMAN-APPROVED |
| `props/utility-panel.png`                                              | `plv1-utility-panel`            | same sheet, box (183,97,241,187)                                        | wall panel                                               | crop padded to 64×92                                                                                                       | straight-on                                                                   | deck north-east wall                                                                                                                                      | as above                                                                               | NOT HUMAN-APPROVED |
| `props/utility-desk.png`                                               | `plv1-utility-desk`             | same sheet, box (15,185,155,239)                                        | control desk                                             | crop padded to 144×56                                                                                                      | 3/4 view                                                                      | deck work surface under the systems board                                                                                                                 | as above                                                                               | NOT HUMAN-APPROVED |
| `props/arch-door.png`                                                  | `plv1-arch-door`                | `props/architecture/architecture-props-a.png` box (95,88,160,162)       | architecture module — double door                        | crop padded to 66×74; rendered with a cyan-leaning tint (0xa9d8d3) and a cyan threshold bar (the uniform interactable cue) | straight-on wall module                                                       | default leaf for every interior pilot door (was a bare cyan square)                                                                                       | olive-grey source register (visual review P1); affordance class is owner decision OD-7 | NOT HUMAN-APPROVED |
| _(not shipped)_ `arch-window`                                          | —                               | same sheet, box (95,16,160,84)                                          | window module                                            | crop padded to 66×68 (evaluated in the first Unit 7 pass)                                                                  | straight-on                                                                   | placed on the Concourse / Laboratory north walls in the first pass, then removed — beside the real north door it read as a second door (visual review M9) | the slice is not in the runtime tree; the foundry window stays                         | not promoted       |
| `props/arch-vent.png`, `props/arch-grille.png`, `props/arch-pipes.png` | `plv1-arch-vent/-grille/-pipes` | same sheet, boxes (24,88,89,162) / (166,88,231,162) / (166,167,231,235) | wall modules                                             | crops padded to 66×74 / 66×74 / 66×68                                                                                      | straight-on                                                                   | south-wall dressing (Concourse, Workshop)                                                                                                                 | olive register beside the steel/navy palette (visual review P1)                        | NOT HUMAN-APPROVED |

Explicitly NOT promoted in Unit 7: the workshop / laboratory / archive /
arrival / inventory prop sheets (isometric-leaning — perspective mismatch
with the straight-on grid), every `measurement/*` board, the drone family,
the beacon-blink strip, the loose bot move/work frames (76×74, unpacked),
player action sheets beyond `scan`/`dig`/`pickup` (ledger D-U7-3), and the
intro / interruption storyboards.
