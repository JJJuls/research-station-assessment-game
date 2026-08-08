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
