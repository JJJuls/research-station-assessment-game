import type Phaser from 'phaser';

/**
 * NEXT-07 procedural texture foundry (contract §5).
 *
 * Every runtime-generated `proc-*` texture in the game is drawn here, at
 * Boot, via Phaser Graphics — the exact pattern
 * StationMapBuilder.ensurePlaceholderTexture already uses. Deterministic by
 * construction: every draw function is a pure function of the hard-coded
 * constants below — no randomness, no time/date dependence — so every
 * participant and every session sees identical stimuli (frozen-stimuli
 * rule, approved plan §8).
 *
 * Textures are documented as procedural placeholder-tier art, never
 * presented as generated/external assets. The `proc-` prefix is disjoint
 * from the committed PixelLab `prop-*` namespace; when the gated external
 * pack is eventually generated and approved, each station swap is a
 * one-line texture-key change (Integration Backlog batches 1-5).
 */

/**
 * Polar Meridian palette (visual plan §2.1, encoded values only — cyan
 * appears exclusively on interactable emissive elements, never decor).
 */
const OUTLINE = 0x1d2937;
const PANEL = 0x101820;
const CARD = 0x1a2733;
const BORDER = 0x33475a;
const ACCENT = 0x5fd3c4;
const MUTED = 0x9fb2c1;
/** Hazard amber (§5): appears ONLY in the Hazard Control warning-panel
 * texture — matte band, never flashing, the single warm accent besides
 * the player's rust-orange (§7.3). */
const HAZARD_AMBER = 0xd9a441;
const HAZARD_AMBER_SHADE = 0xb08334;

/** NPC suit hues (NPC spec §2): cold-neutral so the player's rust-orange
 * stays the only warm mid-tone. Kai slate-teal; the Quartermaster
 * grey-green. One shade step + one top-left rim per drawing-language rule. */
const KAI_SUIT = 0x4d7078;
const KAI_SUIT_SHADE = 0x3d5a61;
const KAI_SUIT_RIM = 0x6a8f97;
const VALE_SUIT = 0x5d6f62;
const VALE_SUIT_SHADE = 0x49584e;
const VALE_SUIT_RIM = 0x7b917f;
const NPC_SKIN = 0x8fa1ab;

type Graphics = Phaser.GameObjects.Graphics;

function rect(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
) {
  g.fillStyle(color, 1);
  g.fillRect(x, y, w, h);
}

/** Solid shape in the shared drawing language: 1 px dark outline, flat
 * fill, single top-left light rim. */
function box(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: number,
  rim?: number,
) {
  rect(g, x - 1, y - 1, w + 2, h + 2, OUTLINE);
  rect(g, x, y, w, h, fill);

  if (rim !== undefined) {
    rect(g, x, y, w, 1, rim);
    rect(g, x, y, 1, h, rim);
  }
}

interface FigureStyle {
  suit: number;
  suitShade: number;
  suitRim: number;
  /** Distinct silhouette element — never a palette-swap-only variant. */
  accessory: 'tablet' | 'satchel' | 'crate' | 'mug';
}

/**
 * Shared NPC figure language (contract §5): ~44 px standing figure —
 * matching the rendered player's apparent 32×42 body height ±10% — with a
 * dark outline and a visor band instead of facial features. South-facing,
 * static. Shares no frames with the player (the rejected "twin" path).
 */
function drawFigure(g: Graphics, cx: number, top: number, style: FigureStyle) {
  const { suit, suitShade, suitRim } = style;

  // Legs (y +30..+44 from figure top).
  box(g, cx - 8, top + 30, 7, 14, suitShade);
  box(g, cx + 1, top + 30, 7, 14, suitShade);
  // Boots.
  rect(g, cx - 9, top + 42, 9, 3, OUTLINE);
  rect(g, cx, top + 42, 9, 3, OUTLINE);

  // Torso (y +12..+30).
  box(g, cx - 9, top + 12, 18, 18, suit, suitRim);
  rect(g, cx + 6, top + 13, 3, 16, suitShade);
  // Chest seam.
  rect(g, cx - 1, top + 14, 1, 14, suitShade);

  // Arms.
  box(g, cx - 13, top + 14, 4, 12, suitShade);
  box(g, cx + 9, top + 14, 4, 12, suitShade);

  // Head with visor band (no facial features).
  box(g, cx - 6, top, 12, 11, NPC_SKIN, suitRim);
  rect(g, cx - 6, top + 3, 12, 4, PANEL);

  if (style.accessory === 'tablet') {
    // Slate work tablet held at the left hip (Kai).
    box(g, cx - 18, top + 20, 8, 11, CARD);
    rect(g, cx - 17, top + 22, 6, 5, BORDER);
  } else if (style.accessory === 'satchel') {
    // Shoulder strap + hip satchel (the Quartermaster).
    rect(g, cx - 7, top + 12, 3, 18, suitShade);
    rect(g, cx - 7, top + 12, 1, 18, OUTLINE);
    box(g, cx + 8, top + 24, 9, 8, suitShade);
    rect(g, cx + 9, top + 25, 7, 2, OUTLINE);
  } else if (style.accessory === 'crate') {
    // Carried supply crate held in front (ambient hauler silhouette).
    box(g, cx - 11, top + 16, 22, 12, CARD, MUTED);
    rect(g, cx - 11, top + 21, 22, 1, OUTLINE);
    rect(g, cx - 4, top + 18, 8, 2, BORDER);
  } else {
    // Clipboard held at the chest (ambient technician silhouette).
    box(g, cx + 6, top + 17, 8, 11, MUTED);
    rect(g, cx + 7, top + 19, 6, 1, PANEL);
    rect(g, cx + 7, top + 22, 6, 1, PANEL);
    rect(g, cx + 8, top + 15, 4, 2, BORDER);
  }
}

/**
 * Kai person-at-console composite (Phase 1): the Engineer Hub "Engineer
 * Kai" station IS the person — a slate-teal figure with a work tablet
 * standing behind a low report console. The console screen carries the
 * cyan emissive element (this station is interactable).
 */
function drawNpcKai(g: Graphics) {
  drawFigure(g, 32, 5, {
    suit: KAI_SUIT,
    suitShade: KAI_SUIT_SHADE,
    suitRim: KAI_SUIT_RIM,
    accessory: 'tablet',
  });

  // Report console in front of the figure (south side, overlapping feet).
  box(g, 11, 46, 42, 15, CARD, BORDER);
  rect(g, 12, 47, 40, 4, BORDER);
  // Emissive screen strip + button dots (interactable cyan cue).
  rect(g, 19, 48, 26, 2, ACCENT);
  rect(g, 15, 54, 3, 3, MUTED);
  rect(g, 20, 54, 3, 3, MUTED);
  rect(g, 46, 54, 3, 3, ACCENT);
}

/**
 * The Quartermaster figure (Phase 2): standalone non-interactive decor
 * beside the console — grey-green suit, shoulder strap + satchel
 * silhouette. Deliberately carries NO cyan (decor must stay duller than
 * interactables) and no participant-facing name (D-N07-1: unlabelled).
 */
function drawNpcVale(g: Graphics) {
  drawFigure(g, 20, 5, {
    suit: VALE_SUIT,
    suitShade: VALE_SUIT_SHADE,
    suitRim: VALE_SUIT_RIM,
    accessory: 'satchel',
  });
}

/**
 * Unit D pose variants: reaction poses swapped in by scenes as tasks
 * progress (art swaps never alter interaction regions). Each pose keeps
 * its base silhouette and simply repaints one arm.
 */

/** Vale — kit acknowledged: right arm raised in a small wave. */
function drawNpcValeReady(g: Graphics) {
  drawNpcVale(g);
  // Repaint the right arm raised (base arm at cx+9=29, top+14..26).
  rect(g, 28, 18, 6, 9, VALE_SUIT); // clear the lowered arm area
  box(g, 30, 6, 4, 12, VALE_SUIT_SHADE); // raised arm
  box(g, 30, 3, 5, 4, NPC_SKIN); // open hand
}

/** Kai — surveying: tablet raised to chest, studying readings. */
function drawNpcKaiWork(g: Graphics) {
  drawNpcKai(g);
  // Tablet lifted from hip to chest height, head angled toward it.
  rect(g, 14, 25, 8, 11, KAI_SUIT); // clear the hip tablet
  box(g, 16, 20, 9, 12, CARD);
  rect(g, 17, 22, 7, 6, BORDER);
  rect(g, 18, 23, 5, 1, MUTED);
}

/** Kai — job done: free arm raised in acknowledgement. */
function drawNpcKaiDone(g: Graphics) {
  drawNpcKai(g);
  // Repaint the right arm raised (base arm at cx+9=41, top+14..26).
  rect(g, 40, 18, 6, 9, KAI_SUIT); // clear the lowered arm area
  box(g, 42, 6, 4, 12, KAI_SUIT_SHADE);
  box(g, 42, 3, 5, 4, NPC_SKIN);
}

/**
 * Final Core machinery column (Unit D): tall reactor stack with coolant
 * rings and a dull teal core line — the chamber's visual mass. Decor
 * only; the cyan-cued interactable stays the core interface.
 */
function drawCoreColumn(g: Graphics) {
  // Column body.
  box(g, 8, 6, 24, 78, CARD, BORDER);
  // Core sight-line slot with dull teal glow.
  rect(g, 17, 10, 6, 70, PANEL);
  rect(g, 19, 12, 2, 66, 0x2e6b66);
  // Coolant rings.
  for (const y of [16, 34, 52, 70]) {
    rect(g, 4, y, 32, 4, BORDER);
    rect(g, 4, y, 32, 1, MUTED);
  }
  // Base skirt + feed pipes.
  rect(g, 2, 84, 36, 4, OUTLINE);
  rect(g, 12, 2, 4, 4, BORDER);
  rect(g, 24, 2, 4, 4, BORDER);
}

/**
 * Wall-console family (Phase 2/4a): terminal-on-stand silhouette —
 * monitor head, pedestal, base. The screen carries the cyan emissive cue
 * (interactable stations only). Used by the Quartermaster Console and,
 * per the §5 nearest-honest-family reuse rule, by stations without a
 * bespoke family (Repair Panel, Repair Manual, Relay Checkpoint).
 */
function drawConsoleWall(g: Graphics) {
  box(g, 8, 46, 24, 7, CARD, BORDER);
  box(g, 16, 34, 8, 12, BORDER);
  box(g, 4, 6, 32, 26, CARD, BORDER);
  rect(g, 7, 9, 26, 19, PANEL);
  rect(g, 9, 12, 18, 2, ACCENT);
  rect(g, 9, 16, 12, 2, MUTED);
  rect(g, 9, 20, 15, 2, MUTED);
  rect(g, 31, 29, 3, 2, ACCENT);
}

/**
 * Hand Tools Rack (Phase 2): open vertical frame with hanging tools —
 * the only station family with a see-through frame silhouette.
 */
function drawRackTools(g: Graphics) {
  // Frame posts, top rail, feet.
  box(g, 3, 6, 4, 46, BORDER, MUTED);
  box(g, 41, 6, 4, 46, BORDER, MUTED);
  box(g, 7, 6, 34, 4, BORDER);
  rect(g, 2, 52, 44, 2, OUTLINE);
  // Mid rail.
  rect(g, 7, 30, 34, 2, BORDER);
  // Hanging tools (fixed positions/lengths — muted, never cyan).
  rect(g, 11, 12, 3, 12, MUTED);
  rect(g, 10, 10, 5, 3, MUTED);
  rect(g, 19, 12, 3, 8, KAI_SUIT_SHADE);
  rect(g, 26, 12, 4, 14, MUTED);
  rect(g, 25, 10, 6, 3, KAI_SUIT_SHADE);
  rect(g, 34, 12, 3, 10, MUTED);
  rect(g, 12, 34, 3, 10, MUTED);
  rect(g, 20, 34, 4, 12, KAI_SUIT_SHADE);
  rect(g, 28, 34, 3, 8, MUTED);
  rect(g, 34, 34, 4, 11, MUTED);
  // Small cyan label plate (interactable cue).
  rect(g, 20, 7, 8, 2, ACCENT);
}

/**
 * Consumables Bin (Phase 2): low, wide open-top container with visible
 * contents — the squat family silhouette.
 */
function drawBinConsumables(g: Graphics) {
  // Contents above the rim.
  rect(g, 9, 10, 9, 6, MUTED);
  rect(g, 20, 8, 10, 8, KAI_SUIT_SHADE);
  rect(g, 32, 11, 8, 5, MUTED);
  // Bin body with a lighter front lip.
  box(g, 4, 15, 40, 21, CARD, BORDER);
  rect(g, 5, 16, 38, 3, BORDER);
  // Cyan label chip on the front face.
  rect(g, 20, 24, 8, 3, ACCENT);
  // Feet.
  rect(g, 6, 36, 8, 2, OUTLINE);
  rect(g, 34, 36, 8, 2, OUTLINE);
}

/**
 * Electronics Shelf (Phase 2): tall closed cabinet with three module
 * shelves — the gridded family silhouette.
 */
function drawShelfElectronics(g: Graphics) {
  box(g, 4, 5, 40, 48, CARD, BORDER);
  // Shelf boards.
  rect(g, 6, 19, 36, 2, BORDER);
  rect(g, 6, 33, 36, 2, BORDER);
  rect(g, 6, 47, 36, 2, BORDER);
  // Modules per shelf (fixed layout).
  rect(g, 8, 10, 10, 8, BORDER);
  rect(g, 20, 9, 8, 9, MUTED);
  rect(g, 30, 11, 9, 7, BORDER);
  rect(g, 8, 24, 8, 8, MUTED);
  rect(g, 18, 25, 11, 7, BORDER);
  rect(g, 31, 24, 8, 8, MUTED);
  rect(g, 8, 38, 12, 8, BORDER);
  rect(g, 22, 39, 8, 7, MUTED);
  rect(g, 32, 38, 7, 8, BORDER);
  // Two cyan status dots (interactable cue).
  rect(g, 16, 12, 2, 2, ACCENT);
  rect(g, 27, 27, 2, 2, ACCENT);
}

/**
 * Prep Bench (Phase 2): wide, flat work table with staged gear — the
 * horizontal family silhouette.
 */
function drawBenchPrep(g: Graphics) {
  // Staged gear on the tabletop.
  rect(g, 12, 6, 10, 5, MUTED);
  rect(g, 28, 5, 8, 6, KAI_SUIT_SHADE);
  rect(g, 42, 7, 12, 4, MUTED);
  // Tabletop with lighter working edge.
  box(g, 3, 11, 58, 9, BORDER, MUTED);
  // Legs.
  box(g, 7, 20, 6, 16, CARD);
  box(g, 51, 20, 6, 16, CARD);
  // Cyan tag on the front edge (interactable cue).
  rect(g, 28, 14, 8, 3, ACCENT);
}

/**
 * Field Kit Crate (Phase 2): open crate, lid leaning behind, interior
 * visible — the open-box family silhouette.
 */
function drawCrateFieldKit(g: Graphics) {
  // Open lid leaning behind the crate.
  box(g, 9, 6, 30, 9, BORDER, MUTED);
  // Crate body with slat line.
  box(g, 6, 18, 36, 24, CARD, BORDER);
  rect(g, 6, 28, 36, 2, OUTLINE);
  // Interior opening with packed contents.
  rect(g, 10, 20, 28, 6, PANEL);
  rect(g, 13, 21, 8, 4, MUTED);
  rect(g, 25, 22, 9, 3, KAI_SUIT_SHADE);
  // Cyan tag on the front face (interactable cue).
  rect(g, 20, 33, 8, 3, ACCENT);
}

/**
 * Shared scenario console (Phase 3): ONE silhouette applied identically
 * to all four ethical-scenario stations (Priority Allocation,
 * Calibration Bench, Reconciliation Desk, Seal Log) so the four
 * decisions stay visually interchangeable (visual plan §2.4). Dual-panel
 * desk silhouette — distinguishable from every canonical-task family by
 * shape only, with a comparable (never stronger) cyan emissive area.
 */
function drawConsoleScenario(g: Graphics) {
  // Desk base with pedestal.
  box(g, 4, 36, 40, 11, CARD, BORDER);
  rect(g, 20, 31, 8, 5, BORDER);
  // Main screen (left) with readout lines.
  box(g, 5, 8, 23, 19, CARD, BORDER);
  rect(g, 7, 10, 19, 15, PANEL);
  rect(g, 9, 13, 13, 2, ACCENT);
  rect(g, 9, 17, 9, 2, MUTED);
  rect(g, 9, 21, 11, 2, MUTED);
  // Side panel (right), muted.
  box(g, 31, 13, 12, 14, CARD, BORDER);
  rect(g, 33, 15, 8, 10, PANEL);
  rect(g, 34, 17, 6, 2, MUTED);
  // Desk button strip with a single cyan dot.
  rect(g, 9, 39, 4, 3, MUTED);
  rect(g, 15, 39, 4, 3, MUTED);
  rect(g, 35, 39, 3, 3, ACCENT);
}

/**
 * Hazard warning panel (Phase 4b): wide wall panel carrying the game's
 * ONLY amber — one matte diagonal-notched band. Static, never animated,
 * never flashing (§7.8); the small cyan dot keeps the uniform
 * interactable cue.
 */
function drawPanelWarning(g: Graphics) {
  // Mounted wall panel.
  box(g, 4, 6, 40, 36, CARD, BORDER);
  // Matte amber band with dark notches (non-colour-only hazard glyph).
  rect(g, 7, 12, 34, 8, HAZARD_AMBER);
  rect(g, 7, 18, 34, 2, HAZARD_AMBER_SHADE);
  rect(g, 11, 12, 4, 8, OUTLINE);
  rect(g, 21, 12, 4, 8, OUTLINE);
  rect(g, 31, 12, 4, 8, OUTLINE);
  // Muted readout lines below the band.
  rect(g, 9, 26, 22, 2, MUTED);
  rect(g, 9, 31, 16, 2, MUTED);
  // Interactable cyan dot.
  rect(g, 36, 36, 3, 3, ACCENT);
  // Mounting feet.
  rect(g, 10, 42, 6, 4, OUTLINE);
  rect(g, 32, 42, 6, 4, OUTLINE);
}

/**
 * Comms beacon family (Phase 4c): tall thin mast — base, pole, cross
 * rungs, offset dish. Used by the Comms Beacon and (nearest honest
 * family, §5) the Antenna Junction. Cyan tip light = interactable cue.
 */
function drawBeaconComms(g: Graphics) {
  // Base plinth.
  box(g, 8, 52, 16, 8, CARD, BORDER);
  // Mast pole.
  box(g, 14, 8, 4, 44, BORDER, MUTED);
  // Cross rungs.
  rect(g, 8, 16, 16, 2, BORDER);
  rect(g, 10, 28, 12, 2, BORDER);
  rect(g, 8, 40, 16, 2, BORDER);
  // Offset relay dish.
  box(g, 20, 18, 8, 7, CARD, MUTED);
  rect(g, 22, 20, 4, 3, PANEL);
  // Cyan tip light (interactable cue; static, no flashing).
  rect(g, 14, 5, 4, 3, ACCENT);
}

/**
 * Core interface (Phase 4d): wide monitor bank — three screens over a
 * long console base, deliberately the broadest interactable silhouette
 * in the game (the closeout surface). Cyan readouts = interactable cue.
 */
function drawCoreInterface(g: Graphics) {
  // Console base.
  box(g, 4, 40, 56, 12, CARD, BORDER);
  rect(g, 8, 43, 6, 3, MUTED);
  rect(g, 17, 43, 6, 3, MUTED);
  rect(g, 50, 43, 4, 3, ACCENT);
  // Central primary screen.
  box(g, 20, 6, 24, 22, CARD, BORDER);
  rect(g, 22, 8, 20, 18, PANEL);
  rect(g, 24, 11, 14, 2, ACCENT);
  rect(g, 24, 15, 10, 2, MUTED);
  rect(g, 24, 19, 12, 2, MUTED);
  // Flanking side screens.
  box(g, 5, 12, 12, 16, CARD, BORDER);
  rect(g, 7, 14, 8, 12, PANEL);
  rect(g, 8, 17, 6, 2, MUTED);
  box(g, 47, 12, 12, 16, CARD, BORDER);
  rect(g, 49, 14, 8, 12, PANEL);
  rect(g, 50, 17, 6, 2, MUTED);
  // Screen support pillars.
  rect(g, 29, 28, 6, 12, BORDER);
  rect(g, 9, 28, 4, 12, BORDER);
  rect(g, 51, 28, 4, 12, BORDER);
}

/**
 * Utility bot (Phase 4e): squat rounded chassis — stepped dome, body,
 * side tracks, tool arm. Cyan sensor strip = interactable cue.
 */
function drawBotUtility(g: Graphics) {
  // Side tracks.
  box(g, 4, 30, 10, 14, CARD, BORDER);
  box(g, 34, 30, 10, 14, CARD, BORDER);
  rect(g, 6, 34, 6, 2, OUTLINE);
  rect(g, 36, 34, 6, 2, OUTLINE);
  rect(g, 6, 39, 6, 2, OUTLINE);
  rect(g, 36, 39, 6, 2, OUTLINE);
  // Chassis body.
  box(g, 10, 18, 28, 22, BORDER, MUTED);
  // Stepped dome (rounded silhouette).
  rect(g, 14, 13, 20, 6, BORDER);
  rect(g, 17, 10, 14, 4, BORDER);
  rect(g, 14, 13, 20, 1, MUTED);
  rect(g, 17, 10, 14, 1, MUTED);
  // Cyan sensor strip on the dome (interactable cue; static).
  rect(g, 19, 14, 10, 3, ACCENT);
  // Front hatch + tool arm.
  rect(g, 18, 26, 12, 8, CARD);
  rect(g, 20, 28, 8, 2, MUTED);
  rect(g, 38, 22, 6, 3, KAI_SUIT_SHADE);
  rect(g, 42, 22, 3, 8, KAI_SUIT_SHADE);
}

/**
 * NEXT-08 §3.3 icon foundry: the `proc-icon-*` family — small identity
 * glyphs rendered inside prompt-panel task surfaces (stage-surface model,
 * NEXT-08 contract §3). Disjoint from the `proc-*` station silhouettes
 * above and from committed `prop-*` art. Same drawing language (1-2 px
 * outline, flat fills + one shade step, top-left light rim), and the same
 * determinism rule: pure functions of hard-coded constants only.
 *
 * Identity only, never validity (§3.3): no icon variant, tint, or badge
 * encodes correct/incorrect or praise/blame, and no icon texture carries
 * the cyan accent — cyan stays on interactable/focus affordances drawn by
 * the renderer, never baked into an identity glyph.
 */

/** Torque Driver: grip, shaft, driver tip. */
function drawIconTorqueDriver(g: Graphics) {
  box(g, 15, 8, 7, 8, VALE_SUIT_SHADE, VALE_SUIT_RIM);
  box(g, 5, 10, 10, 4, MUTED);
  rect(g, 2, 10, 3, 4, BORDER);
  rect(g, 2, 11, 1, 2, OUTLINE);
}

/** Diagnostic Probe: handheld meter body, readout, probe lead. */
function drawIconDiagnosticProbe(g: Graphics) {
  box(g, 10, 4, 10, 16, CARD, BORDER);
  rect(g, 12, 6, 6, 4, PANEL);
  rect(g, 13, 7, 4, 2, MUTED);
  rect(g, 12, 13, 2, 2, MUTED);
  rect(g, 16, 13, 2, 2, MUTED);
  rect(g, 6, 18, 6, 2, MUTED);
  box(g, 3, 16, 3, 5, BORDER);
}

/** Coolant Cartridge: slate-teal canister, cap, fill band. */
function drawIconCoolantCartridge(g: Graphics) {
  box(g, 7, 6, 10, 14, KAI_SUIT, KAI_SUIT_RIM);
  rect(g, 7, 10, 10, 2, KAI_SUIT_SHADE);
  box(g, 9, 2, 6, 4, BORDER);
  rect(g, 8, 20, 8, 1, OUTLINE);
}

/** Spare Fuse Pack: carton with three fuse cylinders. */
function drawIconFusePack(g: Graphics) {
  rect(g, 6, 5, 3, 5, MUTED);
  rect(g, 11, 5, 3, 5, MUTED);
  rect(g, 16, 5, 3, 5, MUTED);
  box(g, 4, 9, 16, 10, CARD, BORDER);
  rect(g, 6, 13, 12, 2, BORDER);
}

/** Patch Tape: tape roll with a pulled tail. */
function drawIconPatchTape(g: Graphics) {
  box(g, 5, 5, 14, 14, MUTED);
  rect(g, 9, 9, 6, 6, PANEL);
  rect(g, 19, 10, 3, 4, MUTED);
  rect(g, 19, 9, 3, 1, OUTLINE);
}

/** Hex Spanner: open jaw and straight handle. */
function drawIconHexSpanner(g: Graphics) {
  box(g, 3, 7, 6, 10, MUTED);
  rect(g, 3, 10, 3, 4, PANEL);
  box(g, 9, 10, 12, 4, MUTED);
  rect(g, 9, 10, 12, 1, OUTLINE);
}

/** Sealant Canister: grey-green cylinder with nozzle. */
function drawIconSealantCanister(g: Graphics) {
  box(g, 8, 7, 9, 13, VALE_SUIT, VALE_SUIT_RIM);
  rect(g, 8, 12, 9, 2, VALE_SUIT_SHADE);
  rect(g, 10, 3, 4, 4, BORDER);
  rect(g, 10, 3, 4, 1, OUTLINE);
}

/** Relay Board: module board, mounted parts, edge pins. */
function drawIconRelayBoard(g: Graphics) {
  box(g, 4, 6, 16, 12, CARD, BORDER);
  rect(g, 6, 8, 4, 3, MUTED);
  rect(g, 12, 8, 5, 3, KAI_SUIT_SHADE);
  rect(g, 6, 13, 6, 3, KAI_SUIT_SHADE);
  rect(g, 14, 13, 3, 3, MUTED);
  rect(g, 5, 18, 2, 3, MUTED);
  rect(g, 9, 18, 2, 3, MUTED);
  rect(g, 13, 18, 2, 3, MUTED);
  rect(g, 17, 18, 2, 3, MUTED);
}

/** Stabiliser part (Side Repair): finned module on a mounting base. */
function drawIconStabiliserPart(g: Graphics) {
  box(g, 9, 3, 6, 9, CARD, BORDER);
  box(g, 5, 12, 14, 7, BORDER, MUTED);
  rect(g, 7, 19, 10, 2, OUTLINE);
}

/** Sequence-slot chip (Systems Repair schematic dressing). */
function drawIconSlotChip(g: Graphics) {
  rect(g, 10, 4, 4, 2, BORDER);
  box(g, 3, 6, 18, 12, CARD, BORDER);
  rect(g, 5, 8, 14, 8, PANEL);
}

/** Manual / document glyph: page, folded corner, text lines. */
function drawIconManual(g: Graphics) {
  box(g, 5, 3, 14, 18, MUTED);
  rect(g, 15, 3, 4, 4, BORDER);
  rect(g, 8, 9, 8, 1, PANEL);
  rect(g, 8, 12, 8, 1, PANEL);
  rect(g, 8, 15, 6, 1, PANEL);
}

/** Component glyph (schematic dressing): module with top/bottom pins. */
function drawIconComponent(g: Graphics) {
  rect(g, 8, 5, 2, 3, MUTED);
  rect(g, 12, 5, 2, 3, MUTED);
  rect(g, 16, 5, 2, 3, MUTED);
  box(g, 6, 8, 12, 8, KAI_SUIT_SHADE, KAI_SUIT_RIM);
  rect(g, 8, 16, 2, 3, MUTED);
  rect(g, 12, 16, 2, 3, MUTED);
  rect(g, 16, 16, 2, 3, MUTED);
}

/**
 * Step-state tiles (Side Repair tracker): glyph-differentiated, never
 * colour-only (§3.3 / accessibility §7.3) — pending is an empty socket,
 * current carries a chevron, done carries a check. Progress state the
 * side panel already shows in text; never a judgement.
 */
function drawIconStepPending(g: Graphics) {
  box(g, 4, 4, 12, 12, PANEL);
}

function drawIconStepCurrent(g: Graphics) {
  box(g, 4, 4, 12, 12, CARD);
  rect(g, 7, 6, 2, 8, MUTED);
  rect(g, 9, 8, 2, 4, MUTED);
  rect(g, 11, 9, 2, 2, MUTED);
}

function drawIconStepDone(g: Graphics) {
  box(g, 4, 4, 12, 12, CARD);
  rect(g, 5, 10, 2, 2, MUTED);
  rect(g, 7, 12, 2, 2, MUTED);
  rect(g, 9, 10, 2, 2, MUTED);
  rect(g, 11, 8, 2, 2, MUTED);
  rect(g, 13, 6, 2, 2, MUTED);
}

/** Log-extract corner mark (Engineer evidence inset): bracket pair. */
function drawIconLogMark(g: Graphics) {
  rect(g, 2, 2, 6, 2, MUTED);
  rect(g, 2, 2, 2, 6, MUTED);
  rect(g, 8, 12, 6, 2, MUTED);
  rect(g, 12, 8, 2, 6, MUTED);
}

/**
 * Overnight-prototype gameplay icons (Unit 1): identity glyphs for the
 * src/gameplay item registry. Same drawing language and determinism rule
 * as the NEXT-08 family above; identity only, never validity, no cyan.
 */

/** Field Scanner: handheld body, readout, stub antenna. */
function drawIconFieldScanner(g: Graphics) {
  rect(g, 16, 2, 2, 5, MUTED);
  box(g, 7, 6, 12, 14, CARD, BORDER);
  rect(g, 9, 8, 8, 5, PANEL);
  rect(g, 10, 9, 6, 1, MUTED);
  rect(g, 10, 11, 4, 1, MUTED);
  rect(g, 9, 15, 3, 3, MUTED);
  rect(g, 14, 15, 3, 3, KAI_SUIT_SHADE);
}

/** Excavation Spade: shaft, grip, wide blade. */
function drawIconExcavationSpade(g: Graphics) {
  box(g, 10, 2, 5, 3, MUTED);
  rect(g, 11, 5, 3, 9, KAI_SUIT_SHADE);
  box(g, 7, 14, 11, 7, MUTED);
  rect(g, 7, 19, 11, 2, BORDER);
}

/** Sample Case: latched carry case with handle. */
function drawIconSampleCase(g: Graphics) {
  rect(g, 9, 3, 6, 3, BORDER);
  box(g, 4, 6, 16, 13, VALE_SUIT, VALE_SUIT_RIM);
  rect(g, 4, 11, 16, 2, VALE_SUIT_SHADE);
  rect(g, 10, 11, 4, 2, MUTED);
}

/** Core Sample: strata cylinder in a sleeve. */
function drawIconCoreSample(g: Graphics) {
  box(g, 8, 3, 8, 18, KAI_SUIT_SHADE, KAI_SUIT_RIM);
  rect(g, 8, 6, 8, 2, MUTED);
  rect(g, 8, 11, 8, 3, VALE_SUIT_SHADE);
  rect(g, 8, 17, 8, 2, MUTED);
}

/** Relay Coupling: flanged ring with bolt marks. */
function drawIconRelayCoupling(g: Graphics) {
  box(g, 5, 5, 14, 14, MUTED);
  rect(g, 9, 9, 6, 6, PANEL);
  rect(g, 6, 6, 2, 2, OUTLINE);
  rect(g, 16, 6, 2, 2, OUTLINE);
  rect(g, 6, 16, 2, 2, OUTLINE);
  rect(g, 16, 16, 2, 2, OUTLINE);
}

/** Flux Calibrator: bench unit with dial and lead. */
function drawIconFluxCalibrator(g: Graphics) {
  box(g, 4, 7, 16, 12, CARD, BORDER);
  rect(g, 6, 9, 5, 5, PANEL);
  rect(g, 7, 10, 3, 3, MUTED);
  rect(g, 13, 9, 5, 2, KAI_SUIT_SHADE);
  rect(g, 13, 13, 5, 2, KAI_SUIT_SHADE);
  rect(g, 19, 4, 2, 4, MUTED);
}

/**
 * Overnight-prototype field props (Unit 1/2): worksite silhouettes in the
 * shared station drawing language (cyan only on interactable cues).
 */

/** Field equipment locker: tall double-door cabinet with vents. */
function drawLockerField(g: Graphics) {
  box(g, 4, 4, 40, 48, CARD, BORDER);
  rect(g, 23, 6, 2, 44, BORDER);
  rect(g, 8, 10, 12, 2, MUTED);
  rect(g, 8, 14, 12, 2, MUTED);
  rect(g, 28, 10, 12, 2, MUTED);
  rect(g, 28, 14, 12, 2, MUTED);
  rect(g, 18, 30, 3, 6, MUTED);
  rect(g, 27, 30, 3, 6, MUTED);
  // Cyan label chip (interactable cue).
  rect(g, 20, 22, 8, 3, ACCENT);
  rect(g, 2, 52, 44, 2, OUTLINE);
}

/** Survey scan node: staked marker with sensor head. */
function drawScanNode(g: Graphics) {
  box(g, 13, 4, 8, 8, CARD, BORDER);
  rect(g, 15, 6, 4, 3, ACCENT);
  rect(g, 16, 12, 2, 18, BORDER);
  rect(g, 12, 30, 10, 3, MUTED);
  rect(g, 10, 33, 14, 2, OUTLINE);
}

/** Calibration cabinet (Q03 module): four labelled compartments. */
function drawCabinetCalibration(g: Graphics) {
  box(g, 4, 4, 40, 48, CARD, BORDER);
  // Four compartment faces (2×2), each with a small label plate.
  rect(g, 23, 6, 2, 44, BORDER);
  rect(g, 6, 27, 36, 2, BORDER);
  rect(g, 9, 12, 10, 3, MUTED);
  rect(g, 29, 12, 10, 3, MUTED);
  rect(g, 9, 34, 10, 3, MUTED);
  rect(g, 29, 34, 10, 3, MUTED);
  // Cyan issue-chute strip (interactable cue).
  rect(g, 20, 22, 8, 2, ACCENT);
  rect(g, 2, 52, 44, 2, OUTLINE);
}

/** Work order board (Q30 instance 1): pinned order cards on a frame. */
function drawBoardWorkOrders(g: Graphics) {
  box(g, 4, 4, 40, 32, CARD, BORDER);
  rect(g, 8, 8, 10, 8, MUTED);
  rect(g, 21, 8, 10, 8, MUTED);
  rect(g, 34, 8, 6, 8, KAI_SUIT_SHADE);
  rect(g, 8, 20, 14, 10, KAI_SUIT_SHADE);
  rect(g, 25, 20, 15, 10, MUTED);
  // Cyan header strip (interactable cue).
  rect(g, 18, 5, 12, 2, ACCENT);
  rect(g, 20, 36, 8, 4, BORDER);
}

/** Project portfolio board (Q32 module): four project lanes. */
function drawBoardPortfolio(g: Graphics) {
  box(g, 4, 4, 48, 40, CARD, BORDER);
  for (let lane = 0; lane < 4; lane++) {
    const y = 8 + lane * 9;

    rect(g, 8, y, 12, 6, MUTED);
    rect(g, 22, y + 2, 26, 2, PANEL);
    rect(g, 22, y + 2, 6 + lane * 4, 2, KAI_SUIT_SHADE);
  }
  // Cyan header strip (interactable cue).
  rect(g, 22, 5, 12, 2, ACCENT);
  rect(g, 24, 44, 8, 6, BORDER);
}

/** Contract closure desk (Q33 module): desk with a filing tray stack. */
function drawDeskClosure(g: Graphics) {
  // Tray stack on the desk.
  rect(g, 32, 6, 16, 3, MUTED);
  rect(g, 32, 11, 16, 3, MUTED);
  rect(g, 32, 16, 16, 3, KAI_SUIT_SHADE);
  // Desk top and legs.
  box(g, 4, 20, 48, 8, CARD, BORDER);
  rect(g, 8, 28, 4, 10, BORDER);
  rect(g, 44, 28, 4, 10, BORDER);
  // Open ledger with a cyan stamp pad (interactable cue).
  rect(g, 10, 21, 14, 6, MUTED);
  rect(g, 26, 22, 4, 3, ACCENT);
}

/**
 * Stardew-quality pass (Unit B): station-life dressing props. Same
 * drawing language and determinism rules. All decorative — no cyan
 * except tiny dull screen glows well below interactable-cue strength.
 */

/** Exterior window: frame, snowscape view, horizon ridge, glass shine. */
function drawWindowExterior(g: Graphics) {
  box(g, 2, 2, 44, 22, BORDER, MUTED);
  // Snow sky + ground seen through the glass.
  rect(g, 4, 4, 40, 9, 0x8fa8bd);
  rect(g, 4, 13, 40, 9, 0xdde9f2);
  // Distant ridge line.
  rect(g, 7, 11, 9, 2, 0x5d6d80);
  rect(g, 14, 10, 6, 3, 0x6a7b8f);
  rect(g, 28, 11, 11, 2, 0x5d6d80);
  // Mullions + glass shine.
  rect(g, 23, 4, 2, 18, BORDER);
  rect(g, 6, 5, 7, 1, 0xcfe4f0);
  rect(g, 30, 6, 5, 1, 0xcfe4f0);
}

/** Wall pipe run: two pipes, brackets, one valve wheel. */
function drawWallPipes(g: Graphics) {
  rect(g, 1, 4, 46, 4, KAI_SUIT_SHADE);
  rect(g, 1, 4, 46, 1, KAI_SUIT_RIM);
  rect(g, 1, 11, 46, 3, MUTED);
  rect(g, 1, 11, 46, 1, 0xb8c6d0);
  // Brackets.
  for (const x of [6, 22, 38]) {
    rect(g, x, 2, 3, 14, BORDER);
    rect(g, x, 2, 1, 14, OUTLINE);
  }
  // Valve wheel.
  box(g, 29, 1, 8, 8, HAZARD_AMBER_SHADE);
  rect(g, 32, 3, 2, 4, OUTLINE);
}

/** Crew bench seat: slab, legs, cushion strip. */
function drawSeatBench(g: Graphics) {
  box(g, 2, 6, 36, 8, VALE_SUIT, VALE_SUIT_RIM);
  rect(g, 2, 10, 36, 1, VALE_SUIT_SHADE);
  box(g, 5, 14, 5, 7, CARD);
  box(g, 30, 14, 5, 7, CARD);
}

/** Hydroponics rack: two lit shelves of station greens (life accent). */
function drawHydroponics(g: Graphics) {
  box(g, 2, 2, 36, 38, CARD, BORDER);
  // Shelf beds.
  rect(g, 4, 14, 32, 3, BORDER);
  rect(g, 4, 30, 32, 3, BORDER);
  // Greens (the one place a living green appears — small and matte).
  for (const [x, y, w] of [
    [6, 10, 5],
    [13, 9, 4],
    [19, 11, 6],
    [27, 9, 5],
    [6, 26, 4],
    [12, 25, 6],
    [20, 27, 4],
    [26, 25, 6],
  ]) {
    rect(g, x, y, w, 4, 0x4e7a52);
    rect(g, x + 1, y - 1, w - 2, 1, 0x6b9a6e);
  }
  // Grow-light strips (dull warm, never cyan).
  rect(g, 5, 5, 30, 1, 0xc9b268);
  rect(g, 5, 21, 30, 1, 0xc9b268);
}

/** Galley counter: worktop, kettle, mugs, storage below. */
function drawGalley(g: Graphics) {
  // Kettle + mugs on top.
  box(g, 8, 3, 9, 8, MUTED);
  rect(g, 17, 5, 2, 3, MUTED);
  rect(g, 24, 6, 4, 5, KAI_SUIT_SHADE);
  rect(g, 31, 6, 4, 5, VALE_SUIT_SHADE);
  // Counter top and body.
  box(g, 2, 11, 44, 6, BORDER, MUTED);
  box(g, 4, 17, 40, 15, CARD, BORDER);
  rect(g, 23, 19, 2, 11, BORDER);
  rect(g, 8, 22, 10, 2, MUTED);
  rect(g, 30, 22, 10, 2, MUTED);
}

/** Reception desk: angled counter with terminal and ledger. */
function drawDeskReception(g: Graphics) {
  // Terminal + ledger on the counter.
  box(g, 8, 2, 12, 9, CARD, BORDER);
  rect(g, 10, 4, 8, 5, PANEL);
  rect(g, 11, 5, 6, 1, ACCENT);
  rect(g, 34, 5, 12, 6, MUTED);
  rect(g, 35, 7, 10, 1, PANEL);
  // Counter top with lighter working edge; panelled front.
  box(g, 2, 11, 52, 7, BORDER, MUTED);
  box(g, 4, 18, 48, 16, CARD, BORDER);
  rect(g, 6, 21, 44, 1, BORDER);
  rect(g, 18, 20, 2, 12, BORDER);
  rect(g, 36, 20, 2, 12, BORDER);
}

/** Utility push-cart: tray, handle, wheels, loose parts. */
function drawCartUtility(g: Graphics) {
  rect(g, 8, 6, 7, 4, MUTED);
  rect(g, 18, 5, 9, 5, KAI_SUIT_SHADE);
  box(g, 4, 10, 32, 7, CARD, BORDER);
  rect(g, 37, 4, 3, 13, BORDER);
  rect(g, 36, 4, 5, 2, MUTED);
  box(g, 6, 17, 28, 4, CARD);
  rect(g, 8, 21, 5, 5, OUTLINE);
  rect(g, 26, 21, 5, 5, OUTLINE);
  rect(g, 9, 22, 2, 2, MUTED);
  rect(g, 27, 22, 2, 2, MUTED);
}

/** Ambient worker A: hauler carrying a supply crate (slate-blue suit). */
function drawWorkerHauler(g: Graphics) {
  drawFigure(g, 20, 5, {
    suit: 0x566a82,
    suitShade: 0x44546a,
    suitRim: 0x74889f,
    accessory: 'crate',
  });
}

/** Ambient worker B: technician with a clipboard (dust-violet suit). */
function drawWorkerTech(g: Graphics) {
  drawFigure(g, 20, 5, {
    suit: 0x6a5f7a,
    suitShade: 0x544a63,
    suitRim: 0x897d9a,
    accessory: 'mug',
  });
}

/**
 * Soft ceiling light pool: concentric low-alpha ellipses, tinted
 * cool-white. Rendered UNDER props at low opacity — ambience only; it
 * never highlights one interactable over another (uniform-salience).
 */
function drawLightPool(g: Graphics) {
  const cx = 60;
  const cy = 32;

  for (let ring = 5; ring >= 1; ring--) {
    g.fillStyle(0xdcecf4, 0.028 * (6 - ring));
    g.fillEllipse(cx, cy, ring * 22, ring * 12);
  }
}

/**
 * Stardew-quality pass (Unit C): Survey Terrace worksite art. Damaged vs
 * repaired antenna states carry the field task's visible consequence.
 */

/** Antenna feed housing — DAMAGED: tilted mast, open panel, slack cable. */
function drawAntennaDamaged(g: Graphics) {
  // Base plinth with open access panel.
  box(g, 6, 52, 20, 9, CARD, BORDER);
  rect(g, 9, 54, 8, 5, PANEL);
  rect(g, 10, 55, 6, 1, HAZARD_AMBER_SHADE);
  // Tilted mast (stepped diagonal), leaning east.
  box(g, 13, 40, 4, 12, BORDER, MUTED);
  box(g, 15, 28, 4, 13, BORDER);
  box(g, 18, 16, 4, 13, BORDER);
  box(g, 21, 8, 4, 9, BORDER);
  // Broken cross rung hanging.
  rect(g, 11, 33, 7, 2, BORDER);
  rect(g, 9, 35, 3, 2, BORDER);
  // Slack cable drooping from the mast to the ground.
  rect(g, 24, 14, 1, 2, OUTLINE);
  rect(g, 25, 16, 1, 4, OUTLINE);
  rect(g, 26, 20, 1, 6, OUTLINE);
  rect(g, 27, 26, 1, 12, OUTLINE);
  rect(g, 26, 38, 1, 8, OUTLINE);
  rect(g, 25, 46, 1, 8, OUTLINE);
  // Dead tip (no light) + detached dish on the ground.
  rect(g, 22, 5, 4, 3, OUTLINE);
  box(g, 2, 56, 8, 5, CARD, MUTED);
}

/** Antenna feed housing — REPAIRED: upright braced mast, seated dish. */
function drawAntennaRepaired(g: Graphics) {
  // Base plinth, closed panel.
  box(g, 6, 52, 20, 9, CARD, BORDER);
  rect(g, 9, 54, 8, 5, BORDER);
  // Upright mast with cross rungs.
  box(g, 14, 8, 4, 44, BORDER, MUTED);
  rect(g, 8, 16, 16, 2, BORDER);
  rect(g, 10, 28, 12, 2, BORDER);
  rect(g, 8, 40, 16, 2, BORDER);
  // Support braces.
  rect(g, 9, 44, 2, 8, BORDER);
  rect(g, 21, 44, 2, 8, BORDER);
  // Seated relay dish.
  box(g, 20, 18, 8, 7, CARD, MUTED);
  rect(g, 22, 20, 4, 3, PANEL);
  // Live cyan tip light (interactable cue; static).
  rect(g, 14, 4, 4, 4, ACCENT);
}

/** Distant station habitat module (background silhouette, decor only). */
function drawStationModule(g: Graphics) {
  // Snow line on the roof.
  rect(g, 8, 12, 80, 3, 0xdde9f2);
  // Rounded hull (stepped).
  box(g, 6, 14, 84, 40, CARD, BORDER);
  rect(g, 12, 8, 72, 7, CARD);
  rect(g, 12, 8, 72, 1, BORDER);
  // Structural ribs.
  for (const x of [22, 46, 70]) {
    rect(g, x, 15, 2, 38, BORDER);
  }
  // Lit windows (warm interior glow — life inside).
  for (const x of [14, 32, 56, 78]) {
    rect(g, x, 24, 7, 6, 0xc9b268);
    rect(g, x, 24, 7, 1, 0xe0cd8a);
  }
  // Entry hatch + footing skirt.
  rect(g, 40, 38, 12, 16, PANEL);
  rect(g, 41, 39, 10, 2, BORDER);
  rect(g, 2, 54, 92, 4, BORDER);
  // Roof beacon (dull amber, decor — never cyan).
  rect(g, 46, 4, 3, 4, HAZARD_AMBER_SHADE);
}

/** Disturbed / churned snow patch left behind by digging. */
function drawGroundDisturbed(g: Graphics) {
  rect(g, 4, 8, 32, 12, 0xaebfd0);
  rect(g, 7, 6, 26, 4, 0xbccbdb);
  rect(g, 6, 18, 28, 4, 0x99abc0);
  rect(g, 10, 10, 6, 3, KAI_SUIT_SHADE);
  rect(g, 24, 12, 7, 3, KAI_SUIT_SHADE);
  rect(g, 17, 15, 5, 2, MUTED);
  rect(g, 2, 20, 36, 2, 0x93a5ba);
}

/** Boot print pair pressed into snow (fades out via alpha). */
function drawFootprints(g: Graphics) {
  rect(g, 1, 1, 3, 5, 0x9fb2c6);
  rect(g, 2, 0, 2, 2, 0xaebfd0);
  rect(g, 6, 3, 3, 5, 0x9fb2c6);
  rect(g, 7, 2, 2, 2, 0xaebfd0);
}

/** Dig mound: broken frozen regolith with loose rocks. */
function drawDigMound(g: Graphics) {
  rect(g, 6, 16, 28, 8, KAI_SUIT_SHADE);
  rect(g, 10, 12, 20, 6, MUTED);
  rect(g, 16, 9, 10, 5, KAI_SUIT_SHADE);
  rect(g, 8, 22, 5, 3, BORDER);
  rect(g, 27, 21, 6, 3, BORDER);
  rect(g, 19, 6, 4, 4, MUTED);
  rect(g, 4, 24, 32, 2, OUTLINE);
}

/**
 * Registry-item icon key: presentation-layer mapping from an inventory
 * `item_id` (src/data/itemRegistry.ts — deliberately not edited) to its
 * `proc-icon-*` texture. Every registry item has a manifest entry pinned
 * by the determinism spec.
 */
export function itemIconTextureKey(itemId: string): string {
  return `proc-icon-${itemId.replace(/_/g, '-')}`;
}

/** Non-item icon keys used by stage presentations (NEXT-08 §3.3). */
export const ICON_TEXTURES = {
  component: 'proc-icon-component',
  logMark: 'proc-icon-log-mark',
  manual: 'proc-icon-manual',
  slotChip: 'proc-icon-slot-chip',
  stabiliserPart: 'proc-icon-stabiliser-part',
  stepCurrent: 'proc-icon-step-current',
  stepDone: 'proc-icon-step-done',
  stepPending: 'proc-icon-step-pending',
} as const;

interface TextureBuilder {
  width: number;
  height: number;
  draw: (g: Graphics) => void;
}

/**
 * Every procedural texture: key → dimensions + pure draw function. Sizes
 * stay inside the committed-prop range (32×48 to 64×64). This table IS the
 * manifest — coverage in e2e/proc_textures_determinism.spec.ts pins it.
 */
const TEXTURE_BUILDERS: Record<string, TextureBuilder> = {
  'proc-npc-kai': { width: 64, height: 64, draw: drawNpcKai },
  'proc-npc-kai-work': { width: 64, height: 64, draw: drawNpcKaiWork },
  'proc-npc-kai-done': { width: 64, height: 64, draw: drawNpcKaiDone },
  'proc-npc-vale': { width: 40, height: 56, draw: drawNpcVale },
  'proc-npc-vale-ready': { width: 40, height: 56, draw: drawNpcValeReady },
  'proc-core-column': { width: 40, height: 90, draw: drawCoreColumn },
  'proc-console-quartermaster': {
    width: 40,
    height: 56,
    draw: drawConsoleWall,
  },
  'proc-console-wall': { width: 40, height: 56, draw: drawConsoleWall },
  'proc-rack-tools': { width: 48, height: 56, draw: drawRackTools },
  'proc-bin-consumables': { width: 48, height: 40, draw: drawBinConsumables },
  'proc-shelf-electronics': {
    width: 48,
    height: 56,
    draw: drawShelfElectronics,
  },
  'proc-bench-prep': { width: 64, height: 40, draw: drawBenchPrep },
  'proc-crate-fieldkit': { width: 48, height: 48, draw: drawCrateFieldKit },
  'proc-console-scenario': { width: 48, height: 52, draw: drawConsoleScenario },
  'proc-panel-warning': { width: 48, height: 48, draw: drawPanelWarning },
  'proc-beacon-comms': { width: 32, height: 64, draw: drawBeaconComms },
  'proc-core-interface': { width: 64, height: 56, draw: drawCoreInterface },
  'proc-bot-utility': { width: 48, height: 48, draw: drawBotUtility },
  // NEXT-08 §3.3 proc-icon-* family (registry-item icons, itemIconTextureKey).
  'proc-icon-torque-driver': {
    width: 24,
    height: 24,
    draw: drawIconTorqueDriver,
  },
  'proc-icon-diagnostic-probe': {
    width: 24,
    height: 24,
    draw: drawIconDiagnosticProbe,
  },
  'proc-icon-coolant-cartridge': {
    width: 24,
    height: 24,
    draw: drawIconCoolantCartridge,
  },
  'proc-icon-fuse-pack': { width: 24, height: 24, draw: drawIconFusePack },
  'proc-icon-patch-tape': { width: 24, height: 24, draw: drawIconPatchTape },
  'proc-icon-hex-spanner': { width: 24, height: 24, draw: drawIconHexSpanner },
  'proc-icon-sealant-canister': {
    width: 24,
    height: 24,
    draw: drawIconSealantCanister,
  },
  'proc-icon-relay-board': { width: 24, height: 24, draw: drawIconRelayBoard },
  'proc-icon-stabiliser-part': {
    width: 24,
    height: 24,
    draw: drawIconStabiliserPart,
  },
  // NEXT-08 §3.3 glyph icons (ICON_TEXTURES).
  'proc-icon-slot-chip': { width: 24, height: 24, draw: drawIconSlotChip },
  'proc-icon-manual': { width: 24, height: 24, draw: drawIconManual },
  'proc-icon-component': { width: 24, height: 24, draw: drawIconComponent },
  'proc-icon-step-pending': {
    width: 20,
    height: 20,
    draw: drawIconStepPending,
  },
  'proc-icon-step-current': {
    width: 20,
    height: 20,
    draw: drawIconStepCurrent,
  },
  'proc-icon-step-done': { width: 20, height: 20, draw: drawIconStepDone },
  'proc-icon-log-mark': { width: 16, height: 16, draw: drawIconLogMark },
  // Overnight-prototype gameplay icons (src/gameplay/items.ts).
  'proc-icon-field-scanner': {
    width: 24,
    height: 24,
    draw: drawIconFieldScanner,
  },
  'proc-icon-excavation-spade': {
    width: 24,
    height: 24,
    draw: drawIconExcavationSpade,
  },
  'proc-icon-sample-case': { width: 24, height: 24, draw: drawIconSampleCase },
  'proc-icon-core-sample': { width: 24, height: 24, draw: drawIconCoreSample },
  'proc-icon-relay-coupling': {
    width: 24,
    height: 24,
    draw: drawIconRelayCoupling,
  },
  'proc-icon-flux-calibrator': {
    width: 24,
    height: 24,
    draw: drawIconFluxCalibrator,
  },
  // Stardew-quality pass (Unit C): Survey Terrace worksite art.
  'proc-antenna-damaged': { width: 32, height: 64, draw: drawAntennaDamaged },
  'proc-antenna-repaired': { width: 32, height: 64, draw: drawAntennaRepaired },
  'proc-station-module': { width: 96, height: 60, draw: drawStationModule },
  'proc-ground-disturbed': {
    width: 40,
    height: 24,
    draw: drawGroundDisturbed,
  },
  'proc-footprints': { width: 10, height: 8, draw: drawFootprints },
  // Stardew-quality pass (Unit B): station-life dressing props.
  'proc-window-exterior': { width: 48, height: 26, draw: drawWindowExterior },
  'proc-wall-pipes': { width: 48, height: 18, draw: drawWallPipes },
  'proc-seat-bench': { width: 40, height: 22, draw: drawSeatBench },
  'proc-hydroponics': { width: 40, height: 42, draw: drawHydroponics },
  'proc-galley': { width: 48, height: 34, draw: drawGalley },
  'proc-desk-reception': { width: 56, height: 36, draw: drawDeskReception },
  'proc-cart-utility': { width: 42, height: 28, draw: drawCartUtility },
  'proc-worker-hauler': { width: 40, height: 52, draw: drawWorkerHauler },
  'proc-worker-tech': { width: 40, height: 52, draw: drawWorkerTech },
  'proc-light-pool': { width: 120, height: 64, draw: drawLightPool },
  // Overnight-prototype field props.
  'proc-locker-field': { width: 48, height: 56, draw: drawLockerField },
  'proc-scan-node': { width: 34, height: 38, draw: drawScanNode },
  'proc-dig-mound': { width: 40, height: 28, draw: drawDigMound },
  // Overnight-prototype measurement-module stations (Unit 3).
  'proc-cabinet-calibration': {
    width: 48,
    height: 56,
    draw: drawCabinetCalibration,
  },
  'proc-board-workorders': {
    width: 48,
    height: 42,
    draw: drawBoardWorkOrders,
  },
  'proc-board-portfolio': {
    width: 56,
    height: 52,
    draw: drawBoardPortfolio,
  },
  'proc-desk-closure': { width: 56, height: 40, draw: drawDeskClosure },
};

/** Fixed manifest (key → dimensions) for determinism coverage. */
export const PROCEDURAL_TEXTURE_MANIFEST: Readonly<
  Record<string, { width: number; height: number }>
> = Object.freeze(
  Object.fromEntries(
    Object.entries(TEXTURE_BUILDERS).map(([textureKey, builder]) => [
      textureKey,
      { width: builder.width, height: builder.height },
    ]),
  ),
);

/**
 * Generates every missing `proc-*` texture into the given scene's texture
 * manager. Idempotent: keys that already exist are never re-generated (the
 * second call is a no-op). Returns the keys generated by THIS call so Boot
 * can expose the DEV determinism probe.
 */
export function ensureProceduralTextures(scene: Phaser.Scene): string[] {
  const generated: string[] = [];

  for (const [textureKey, builder] of Object.entries(TEXTURE_BUILDERS)) {
    if (scene.textures.exists(textureKey)) {
      continue;
    }

    const graphics = scene.make.graphics({ x: 0, y: 0 }, false);

    builder.draw(graphics);
    graphics.generateTexture(textureKey, builder.width, builder.height);
    graphics.destroy();
    generated.push(textureKey);
  }

  return generated;
}

/**
 * DEV-only, read-only determinism probe (__playerProbe precedent):
 * presentation/verification only, never read back into gameplay, stripped
 * from production builds by the same import.meta.env.DEV gate in Boot.
 */
declare global {
  interface Window {
    __procTextures?: {
      manifest: Record<string, { width: number; height: number }>;
      firstRun: string[];
      secondRunAdded: string[];
      textures: Record<string, { width: number; height: number }>;
    } | null;
  }
}
