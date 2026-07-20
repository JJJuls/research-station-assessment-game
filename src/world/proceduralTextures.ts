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
  accessory: 'tablet' | 'satchel';
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
  } else {
    // Shoulder strap + hip satchel (the Quartermaster).
    rect(g, cx - 7, top + 12, 3, 18, suitShade);
    rect(g, cx - 7, top + 12, 1, 18, OUTLINE);
    box(g, cx + 8, top + 24, 9, 8, suitShade);
    rect(g, cx + 9, top + 25, 7, 2, OUTLINE);
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
  'proc-npc-vale': { width: 40, height: 56, draw: drawNpcVale },
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
