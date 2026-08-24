# Pilot asset selection and provenance (professional pilot, Unit 6)

**Status of every entry: PROVISIONAL — USER-AUTHORISED FOR EXPERIMENTAL
PILOT INTEGRATION — NOT FINAL ART APPROVAL.** Selections were made
autonomously by the model from the UNAPPROVED pixelab-v1 candidate pack
under the pilot mission's explicit authorisation for experimental
integration. Nothing here constitutes research-owner or human art
approval; every promotion is reversible, and the source pack is
untouched and read-only.

## Source pack

- `asset-candidates/pixelab-v1` at commit
  `62ed9851dd47b9b937e3e0daf30b9b2aa460cfd6` on branch
  `fable-pixelab-asset-candidates-v1` (worktree
  `.claude/worktrees/fable-pixelab-asset-candidates`), 323 candidates,
  all marked UNAPPROVED in `MANIFEST.json`.
- Pack documentation consulted: `REVIEW-CATALOG.md`,
  `TECHNICAL-SPECIFICATION.md`, `STYLE-BIBLE.md`, `PROVENANCE.md`.
- No PixelLab generation was run in this unit (none is authorised).

## Promotion method (this unit)

Byte-exact file copies of whole Phaser-ready sheets — **no slicing, no
retouching, no recompression** — loaded at runtime as Phaser
spritesheets with the pack's own frame geometry. This differs from the
earlier per-frame slicing (action-assessment Unit 5,
`docs/game/PIXELLAB-RUNTIME-ASSET-PROVENANCE.md`) only in load
mechanics; the pixels are identical to the pack.

Verification performed on every promoted file (PNG header read):

| Runtime file (`public/assets/pixellab-runtime/`) | Candidate source (pack)                      | Dimensions | Format            | Layout check                        |
| ------------------------------------------------ | -------------------------------------------- | ---------- | ----------------- | ----------------------------------- |
| `player-actions/scan-sweep.png`                  | `player/sheets/plv1-player-a-scan-sweep.png` | 576×384    | 8-bit RGBA (ct 6) | 6×96 cols × rows S/W/E/N, feet y=71 |
| `player-actions/dig.png`                         | `player/sheets/plv1-player-a-dig.png`        | 576×384    | 8-bit RGBA (ct 6) | as above                            |
| `player-actions/pickup.png`                      | `player/sheets/plv1-player-a-pickup.png`     | 576×384    | 8-bit RGBA (ct 6) | as above                            |
| `effects/dig-dust.png`                           | `effects/sheets/dig-dust.png`                | 448×64     | 8-bit RGBA (ct 6) | 7 one-shot frames of 64×64          |
| `effects/scan-pulse.png`                         | `effects/sheets/scan-pulse.png`              | 448×64     | 8-bit RGBA (ct 6) | as above                            |
| `effects/repair-sparks.png`                      | `effects/sheets/repair-sparks.png`           | 448×64     | 8-bit RGBA (ct 6) | as above                            |

Row order and feet-line come from the pack's per-sheet JSON metadata
(`rows: [south, west, east, north]`, `feetLineY: 71`,
`framesPerRow: 6`); the runtime row mapping (`PLAYER_ACTION_ROW` in
`src/constants/assets.ts`) mirrors it exactly.

## Runtime integration (presentation only — no mechanic reads any of it)

- **Player action animations** (`src/sprites/Player.ts`): one-shot,
  facing-aware animations `scan` (6 fps ≙ 1000 ms scan action), `dig`
  (4 fps ≙ 1500 ms dig action), `pickup` (8 fps). Played from:
  - Exterior Recovery Yard C/D bindings (scan/dig world actions) —
    `RoomScene` already skips `player.update()` during a world action,
    so the animation holds for exactly the action duration;
  - cache pickup (yard) and world-bundle pickup (all pilot zones).
    Movement code, velocities, 32×42 collision body, selector geometry
    and walk/idle timing are untouched; the Misa fallback skin and
    missing-texture boots are safe no-ops.
- **One-shot effects** (`src/gameplay/sheetEffects.ts`): scan pulse at
  the player, dig dust at the dig cell, spark burst at the rig pit on
  each resolved winch cycle. Self-destroying sprites; identical fixed
  playback for every participant; no events, no gating.
- **Frozen-stimuli version**: `ASSET_SET_VERSION` bumped
  `outpost-assets-v4 → outpost-assets-v5`
  (`e2e/research_export_test_mode.spec.ts` pin updated deliberately).

## Presentation review

Adult, restrained presentation: a hooded surveyor performing utilitarian
field work (sweeping a hand scanner, driving a spade, lifting a
bundle); dust/pulse/spark effects are small, brief, desaturated
one-shots. No cartoon exaggeration, no juvenile styling, no reward
fanfare — consistent with the pack's STYLE-BIBLE and the existing
promoted player/NPC art.

## Considered and NOT promoted (with reasons)

- **NPC direction sets** (`plv1-npc-b/d/e` idle/walk/work 4-dir
  sheets): the pilot's three NPCs are stationary anchors; their
  promoted stills (previous unit) already come from these sets.
  Loading full direction sets would add dead assets with no
  participant-visible benefit. `plv1-npc-h-idle` remains excluded
  (missing north row).
- **Prop boards** (`measurement/*`, `props/*` boards): perspective
  mismatch with the straight-on 32 px grid (previous audit,
  unchanged); the procedural `proc-*` prop language stays.
- **Player sheets not needed by the route** (carry, cleanup, terminal,
  startled, interrupted, acknowledge, cold-idle/walk, complete,
  cabinet-\*, sort-bin, specimen, waste-disposal, push/pull, scan-hold):
  no matching on-route world action this unit; deferred, not rejected.
- **`plv1-player-a-repair`**: missing south row (incomplete set).
- **Sequences** (`outpost-events`, `intro`, `interruptions`): cutscene
  material; the pilot route has no cutscene surface and adding one is a
  design decision, not an asset promotion.
- **`calibration/*`, `*-alpha.png` derivatives, contact sheets**:
  evidence/preview material, not runtime candidates.

## Reversal

Delete `public/assets/pixellab-runtime/player-actions/` and
`public/assets/pixellab-runtime/effects/`, revert the Unit 6 code
changes, and restore `ASSET_SET_VERSION` — the pack and all previous
art remain untouched.
