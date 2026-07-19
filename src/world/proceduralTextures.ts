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
 * Quartermaster Console (Phase 2): terminal-on-stand silhouette from the
 * wall-console family — monitor head, pedestal, base. The screen carries
 * the cyan emissive cue (interactable station).
 */
function drawConsoleQuartermaster(g: Graphics) {
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
    draw: drawConsoleQuartermaster,
  },
  'proc-rack-tools': { width: 48, height: 56, draw: drawRackTools },
  'proc-bin-consumables': { width: 48, height: 40, draw: drawBinConsumables },
  'proc-shelf-electronics': {
    width: 48,
    height: 56,
    draw: drawShelfElectronics,
  },
  'proc-bench-prep': { width: 64, height: 40, draw: drawBenchPrep },
  'proc-crate-fieldkit': { width: 48, height: 48, draw: drawCrateFieldKit },
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
