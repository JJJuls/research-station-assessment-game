import type Phaser from 'phaser';

/**
 * Stardew-quality outpost tileset foundry.
 *
 * Generates one original 16-tile Wang tileset per station THEME at Boot,
 * plus a small per-theme floor-variation strip, on canvas textures. Every
 * pixel is a pure function of the hard-coded theme constants and a fixed
 * seed (mulberry32) — no time, no Math.random — so every participant and
 * every session sees identical stimuli (frozen-stimuli rule).
 *
 * The sheets are drawn in the SAME 4×4 frame layout as the committed
 * `tileset-outpost-interior-v3` sheet, so StationMapBuilder's existing
 * WANG_INDEX_TO_FRAME mapping and dual-grid renderer apply unchanged.
 * Collision never touches these textures: the invisible logical layer in
 * StationMapBuilder keeps every collision footprint byte-identical.
 *
 * Provenance: 100% original procedural art authored in this file
 * (documented in docs/game/VISUAL-SYSTEM.md). No external downloads, no
 * copyrighted game assets, no PixelLab calls.
 */

export type StationThemeId =
  | 'hub'
  | 'dock'
  | 'prep'
  | 'exterior'
  | 'workshop'
  | 'utility'
  | 'ops'
  | 'core'
  | 'archive'
  | 'corridor';

/** RGB triple; kept numeric for fast canvas fillStyle composition. */
type Rgb = readonly [number, number, number];

export interface StationTheme {
  id: StationThemeId;
  /** Fixed PRNG seed — part of the frozen stimulus definition. */
  seed: number;
  /** Camera/void colour behind and beyond the room map. */
  voidColor: number;
  /** Floor base tone. */
  floor: Rgb;
  /** Second floor tone (plate alternation, subtle). */
  floorAlt: Rgb;
  /** Plate seam / grout lines. */
  seam: Rgb;
  /** Small highlight details (rivets, glints). */
  glint: Rgb;
  /** Wall top (roof) surface. */
  wallTop: Rgb;
  /** Wall top edge highlight (light from top-left). */
  wallEdge: Rgb;
  /** Wall front face (visible where floor lies south of a wall). */
  wallFace: Rgb;
  /** Front-face panel line tone. */
  wallFaceLine: Rgb;
  /** Contact shadow cast onto floor at wall boundaries. */
  shadow: Rgb;
  /** Sparse accent trim (kept dull — cyan stays on interactables). */
  trim: Rgb;
  /** Floor noise strength 0-1 (exterior snow is noisier than plate). */
  noise: number;
  /** 'plate' interior floors, 'snow' exterior terrain, 'grate' industrial. */
  floorStyle: 'plate' | 'snow' | 'grate';
  /** 'panel' interior walls, 'rock' exterior ridges. */
  wallStyle: 'panel' | 'rock';
}

const rgb = (value: number): Rgb => [
  (value >> 16) & 0xff,
  (value >> 8) & 0xff,
  value & 0xff,
];

/**
 * Polar-outpost palette per theme: cool slate/gunmetal/snow family with
 * restrained per-room identity shifts. Amber/rust warmth stays reserved
 * for workers and important machinery (drawn elsewhere), and emissive
 * cyan stays on interactables — tiles use only dull tones of it.
 */
export const STATION_THEMES: Record<StationThemeId, StationTheme> = {
  hub: {
    id: 'hub',
    seed: 0x5eed0001,
    voidColor: 0x0b1118,
    floor: rgb(0x46536b),
    floorAlt: rgb(0x414e64),
    seam: rgb(0x353f52),
    glint: rgb(0x5c6b85),
    wallTop: rgb(0x232c3b),
    wallEdge: rgb(0x3b4a5f),
    wallFace: rgb(0x323e51),
    wallFaceLine: rgb(0x28323f),
    shadow: rgb(0x2c3547),
    trim: rgb(0x3e6b74),
    noise: 0.35,
    floorStyle: 'plate',
    wallStyle: 'panel',
  },
  dock: {
    id: 'dock',
    seed: 0x5eed0002,
    voidColor: 0x0a0f15,
    floor: rgb(0x3d4657),
    floorAlt: rgb(0x384153),
    seam: rgb(0x2d3443),
    glint: rgb(0x515d72),
    wallTop: rgb(0x1f2733),
    wallEdge: rgb(0x35414f),
    wallFace: rgb(0x2c3645),
    wallFaceLine: rgb(0x232b37),
    shadow: rgb(0x272f3d),
    trim: rgb(0x8a6a35),
    noise: 0.4,
    floorStyle: 'plate',
    wallStyle: 'panel',
  },
  prep: {
    id: 'prep',
    seed: 0x5eed0003,
    voidColor: 0x0c1213,
    floor: rgb(0x4b5a58),
    floorAlt: rgb(0x465553),
    seam: rgb(0x394645),
    glint: rgb(0x627270),
    wallTop: rgb(0x25302e),
    wallEdge: rgb(0x3d4c49),
    wallFace: rgb(0x344340),
    wallFaceLine: rgb(0x2a3634),
    shadow: rgb(0x303d3b),
    trim: rgb(0x6d7a4e),
    noise: 0.35,
    floorStyle: 'plate',
    wallStyle: 'panel',
  },
  exterior: {
    id: 'exterior',
    seed: 0x5eed0004,
    voidColor: 0x9fb4c8,
    floor: rgb(0xc9d9e6),
    floorAlt: rgb(0xc1d2e0),
    seam: rgb(0xaebfd0),
    glint: rgb(0xe8f2fa),
    wallTop: rgb(0x5d6d80),
    wallEdge: rgb(0x8195a9),
    wallFace: rgb(0x4a5869),
    wallFaceLine: rgb(0x3d4956),
    shadow: rgb(0xa3b6c9),
    trim: rgb(0x7f95a8),
    noise: 0.5,
    floorStyle: 'snow',
    wallStyle: 'rock',
  },
  workshop: {
    id: 'workshop',
    seed: 0x5eed0005,
    voidColor: 0x0e0f12,
    floor: rgb(0x4a4c55),
    floorAlt: rgb(0x45474f),
    seam: rgb(0x38393f),
    glint: rgb(0x60636e),
    wallTop: rgb(0x24262d),
    wallEdge: rgb(0x3c3f49),
    wallFace: rgb(0x33353e),
    wallFaceLine: rgb(0x292b32),
    shadow: rgb(0x303138),
    trim: rgb(0x8a5a34),
    noise: 0.45,
    floorStyle: 'grate',
    wallStyle: 'panel',
  },
  utility: {
    id: 'utility',
    seed: 0x5eed0006,
    voidColor: 0x0d1013,
    floor: rgb(0x424a4e),
    floorAlt: rgb(0x3d4549),
    seam: rgb(0x32383c),
    glint: rgb(0x576165),
    wallTop: rgb(0x1f2427),
    wallEdge: rgb(0x363e42),
    wallFace: rgb(0x2c3336),
    wallFaceLine: rgb(0x24292c),
    shadow: rgb(0x2b3134),
    trim: rgb(0x9a7a3a),
    noise: 0.45,
    floorStyle: 'grate',
    wallStyle: 'panel',
  },
  ops: {
    id: 'ops',
    seed: 0x5eed0007,
    voidColor: 0x0b0f17,
    floor: rgb(0x3f4a63),
    floorAlt: rgb(0x3a455c),
    seam: rgb(0x2f3849),
    glint: rgb(0x536080),
    wallTop: rgb(0x1e2534),
    wallEdge: rgb(0x364157),
    wallFace: rgb(0x2b3447),
    wallFaceLine: rgb(0x222a39),
    shadow: rgb(0x283041),
    trim: rgb(0x4a6b8a),
    noise: 0.3,
    floorStyle: 'plate',
    wallStyle: 'panel',
  },
  core: {
    id: 'core',
    seed: 0x5eed0008,
    voidColor: 0x06090d,
    floor: rgb(0x2b3540),
    floorAlt: rgb(0x27303a),
    seam: rgb(0x1e262e),
    glint: rgb(0x3d4a58),
    wallTop: rgb(0x131a21),
    wallEdge: rgb(0x27333d),
    wallFace: rgb(0x1d262e),
    wallFaceLine: rgb(0x161d23),
    shadow: rgb(0x1c242c),
    trim: rgb(0x2e6b66),
    noise: 0.3,
    floorStyle: 'plate',
    wallStyle: 'panel',
  },
  archive: {
    id: 'archive',
    seed: 0x5eed0009,
    voidColor: 0x0a0e16,
    floor: rgb(0x3c455d),
    floorAlt: rgb(0x374057),
    seam: rgb(0x2c3446),
    glint: rgb(0x505b77),
    wallTop: rgb(0x1d2331),
    wallEdge: rgb(0x333d52),
    wallFace: rgb(0x293243),
    wallFaceLine: rgb(0x202836),
    shadow: rgb(0x272e3e),
    trim: rgb(0x4e5a82),
    noise: 0.3,
    floorStyle: 'plate',
    wallStyle: 'panel',
  },
  corridor: {
    id: 'corridor',
    seed: 0x5eed000a,
    voidColor: 0x0b1015,
    floor: rgb(0x424d5c),
    floorAlt: rgb(0x3d4856),
    seam: rgb(0x323b47),
    glint: rgb(0x576378),
    wallTop: rgb(0x202834),
    wallEdge: rgb(0x374350),
    wallFace: rgb(0x2d3743),
    wallFaceLine: rgb(0x242c36),
    shadow: rgb(0x2a323e),
    trim: rgb(0x53707a),
    noise: 0.35,
    floorStyle: 'plate',
    wallStyle: 'panel',
  },
};

export const themeTilesetKey = (id: StationThemeId) => `proc-tiles-${id}`;
export const themeVariantsKey = (id: StationThemeId) =>
  `proc-tiles-${id}-variants`;

/** Floor-variation frames per theme strip (frame 0 is always blank). */
export const THEME_VARIANT_FRAMES = 7;

const TILE = 32;
const HALF = 16;

/** Same mask→frame layout as the committed v3 sheet (StationMapBuilder). */
const WANG_INDEX_TO_FRAME = [
  6, 7, 10, 9, 2, 11, 4, 15, 5, 14, 1, 8, 3, 0, 13, 12,
];

/** Deterministic PRNG (mulberry32) — fixed seeds only. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;

  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const css = ([r, g, b]: Rgb, alpha = 1) =>
  alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;

const shade = ([r, g, b]: Rgb, delta: number): Rgb => [
  Math.max(0, Math.min(255, Math.round(r + delta))),
  Math.max(0, Math.min(255, Math.round(g + delta))),
  Math.max(0, Math.min(255, Math.round(b + delta))),
];

type Ctx = CanvasRenderingContext2D;

function px(ctx: Ctx, x: number, y: number, color: Rgb, alpha = 1) {
  ctx.fillStyle = css(color, alpha);
  ctx.fillRect(x, y, 1, 1);
}

function fill(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  color: Rgb,
  alpha = 1,
) {
  ctx.fillStyle = css(color, alpha);
  ctx.fillRect(x, y, w, h);
}

/**
 * Floor quadrant (16×16 at ox,oy). Quadrant edges align with the LOGICAL
 * cell grid (the dual-grid tile is offset by a half tile), so seams drawn
 * on quadrant boundaries produce a clean 32px plate grid in the world:
 * each logical cell reads as one floor plate.
 */
function drawFloorQuadrant(
  ctx: Ctx,
  ox: number,
  oy: number,
  theme: StationTheme,
  rand: () => number,
  parity: number,
) {
  const base = parity === 0 ? theme.floor : theme.floorAlt;

  fill(ctx, ox, oy, HALF, HALF, base);

  if (theme.floorStyle === 'snow') {
    // Snow: soft speckle noise, sparse glints, faint drift bands.
    for (let i = 0; i < 26; i++) {
      const x = ox + Math.floor(rand() * HALF);
      const y = oy + Math.floor(rand() * HALF);
      const bright = rand();

      if (bright > 0.82) {
        px(ctx, x, y, theme.glint, 0.9);
      } else if (bright < 0.22) {
        px(ctx, x, y, theme.seam, 0.5);
      } else {
        px(ctx, x, y, shade(base, (bright - 0.5) * 14), 0.8);
      }
    }

    // One faint wind-drift streak per quadrant.
    const streakY = oy + 3 + Math.floor(rand() * 10);

    fill(
      ctx,
      ox + 2,
      streakY,
      4 + Math.floor(rand() * 8),
      1,
      theme.glint,
      0.35,
    );

    return;
  }

  // Plate/grate floors: seam lines on the top and left quadrant edges
  // (these edges ARE logical-cell boundaries on the dual grid).
  fill(ctx, ox, oy, HALF, 1, theme.seam);
  fill(ctx, ox, oy, 1, HALF, theme.seam);
  // Bottom-right inner bevel for gentle plate relief.
  fill(ctx, ox + 1, oy + 1, HALF - 1, 1, shade(base, 10), 0.7);
  fill(ctx, ox + 1, oy + 1, 1, HALF - 1, shade(base, 10), 0.7);
  fill(ctx, ox, oy + HALF - 1, HALF, 1, shade(base, -8), 0.7);
  fill(ctx, ox + HALF - 1, oy, 1, HALF, shade(base, -8), 0.7);

  if (theme.floorStyle === 'grate') {
    // Industrial tread: two short diagonal notch rows per plate.
    for (let row = 0; row < 2; row++) {
      const gy = oy + 5 + row * 6;

      for (let i = 0; i < 3; i++) {
        const gx = ox + 3 + i * 4 + row * 2;

        px(ctx, gx, gy, theme.seam, 0.9);
        px(ctx, gx + 1, gy + 1, shade(base, 12), 0.9);
      }
    }
  }

  // Corner rivet.
  px(ctx, ox + 2, oy + 2, theme.glint, 0.9);
  px(ctx, ox + 3, oy + 3, theme.seam, 0.6);

  // Speckle wear.
  const speckles = Math.round(6 * theme.noise * 2);

  for (let i = 0; i < speckles; i++) {
    const x = ox + Math.floor(rand() * HALF);
    const y = oy + Math.floor(rand() * HALF);

    px(ctx, x, y, shade(base, (rand() - 0.5) * 20), 0.5);
  }
}

/** Wall-top quadrant: dark roof surface with subtle structure. */
function drawWallTopQuadrant(
  ctx: Ctx,
  ox: number,
  oy: number,
  theme: StationTheme,
  rand: () => number,
) {
  fill(ctx, ox, oy, HALF, HALF, theme.wallTop);

  if (theme.wallStyle === 'rock') {
    // Rock ridge top: chunky tone clusters.
    for (let i = 0; i < 12; i++) {
      const x = ox + Math.floor(rand() * (HALF - 2));
      const y = oy + Math.floor(rand() * (HALF - 2));
      const tone = rand();

      fill(
        ctx,
        x,
        y,
        1 + Math.floor(rand() * 2),
        1 + Math.floor(rand() * 2),
        tone > 0.6 ? theme.wallEdge : shade(theme.wallTop, (tone - 0.4) * 24),
        0.85,
      );
    }

    return;
  }

  // Panel roof: faint girder lines.
  fill(ctx, ox, oy + HALF - 1, HALF, 1, shade(theme.wallTop, -8));
  fill(ctx, ox + HALF - 1, oy, 1, HALF, shade(theme.wallTop, -8));

  for (let i = 0; i < 4; i++) {
    const x = ox + Math.floor(rand() * HALF);
    const y = oy + Math.floor(rand() * HALF);

    px(ctx, x, y, shade(theme.wallTop, (rand() - 0.5) * 14), 0.6);
  }
}

/**
 * One Wang tile for a corner mask (bit set = wall): SE=1, SW=2, NE=4,
 * NW=8. Quadrants map to logical cells NW/(0,0) NE/(16,0) SW/(0,16)
 * SE/(16,16). After the quadrant fills, boundary treatments give walls
 * their front faces, edge highlights and contact shadows.
 */
function drawWangTile(
  ctx: Ctx,
  tx: number,
  ty: number,
  mask: number,
  theme: StationTheme,
  parity: number,
) {
  const rand = mulberry32(theme.seed ^ (mask * 0x9e3779b9 + parity));
  const wallAt = [
    (mask & 8) !== 0, // NW quadrant
    (mask & 4) !== 0, // NE
    (mask & 2) !== 0, // SW
    (mask & 1) !== 0, // SE
  ];
  const qx = [tx, tx + HALF, tx, tx + HALF];
  const qy = [ty, ty, ty + HALF, ty + HALF];

  for (let q = 0; q < 4; q++) {
    if (wallAt[q]) {
      drawWallTopQuadrant(ctx, qx[q], qy[q], theme, rand);
    } else {
      drawFloorQuadrant(ctx, qx[q], qy[q], theme, rand, (parity + q) % 2);
    }
  }

  // Vertical wall→floor faces: a wall quadrant with floor directly below
  // it (inside this tile) shows a front face over the wall quadrant's
  // lower half, plus a contact shadow on the floor beneath.
  const columns: [number, number][] = [
    [0, 2], // NW over SW
    [1, 3], // NE over SE
  ];

  for (const [top, bottom] of columns) {
    if (wallAt[top] && !wallAt[bottom]) {
      const fx = qx[top];
      const fy = qy[top];

      if (theme.wallStyle === 'rock') {
        // Rock face: craggy strata.
        fill(ctx, fx, fy + 6, HALF, HALF - 6, theme.wallFace);

        for (let i = 0; i < 10; i++) {
          const x = fx + Math.floor(rand() * HALF);
          const y = fy + 7 + Math.floor(rand() * (HALF - 8));

          fill(
            ctx,
            x,
            y,
            1 + Math.floor(rand() * 2),
            1,
            rand() > 0.5
              ? theme.wallFaceLine
              : shade(theme.wallFace, rand() * 18),
            0.9,
          );
        }

        fill(ctx, fx, fy + 5, HALF, 1, theme.wallEdge);
      } else {
        // Panel face: plated bulkhead with two horizontal lines.
        fill(ctx, fx, fy + 5, HALF, HALF - 5, theme.wallFace);
        fill(ctx, fx, fy + 5, HALF, 1, theme.wallEdge);
        fill(ctx, fx, fy + 9, HALF, 1, theme.wallFaceLine);
        fill(ctx, fx, fy + 13, HALF, 1, theme.wallFaceLine, 0.7);
        // Sparse trim tab on the face (dull, never emissive).
        if (mask === 12 || mask === 3) {
          fill(ctx, fx + 6, fy + 11, 4, 1, theme.trim, 0.8);
        }
      }

      // Contact shadow on the floor below the face.
      fill(ctx, qx[bottom], qy[bottom], HALF, 2, theme.shadow, 0.75);
      fill(ctx, qx[bottom], qy[bottom] + 2, HALF, 1, theme.shadow, 0.4);
    }

    if (!wallAt[top] && wallAt[bottom]) {
      // Floor above a wall: crisp roof-edge highlight along the wall top.
      fill(ctx, qx[bottom], qy[bottom], HALF, 1, theme.wallEdge);
    }
  }

  // Horizontal boundaries: edge lines + soft side shadows (light source
  // top-left → floor right of a wall receives the shadow).
  const rows: [number, number][] = [
    [0, 1], // NW | NE
    [2, 3], // SW | SE
  ];

  for (const [left, right] of rows) {
    if (wallAt[left] !== wallAt[right]) {
      const bx = qx[right];
      const by = qy[left];

      if (wallAt[left]) {
        // Wall on the left, floor on the right.
        fill(ctx, bx - 1, by, 1, HALF, theme.wallEdge);
        fill(ctx, bx, by, 2, HALF, theme.shadow, 0.5);
      } else {
        // Floor on the left, wall on the right.
        fill(ctx, bx, by, 1, HALF, theme.wallEdge);
      }
    }
  }
}

/**
 * Floor-variation strip: THEME_VARIANT_FRAMES 32×32 frames laid out in a
 * row. Frame 0 is fully transparent; the rest are subtle, non-obstructive
 * decals (vents, wear, cabling, drifts) scattered per logical cell by
 * StationMapBuilder's deterministic coordinate hash.
 */
function drawVariantStrip(ctx: Ctx, theme: StationTheme) {
  for (let frame = 1; frame < THEME_VARIANT_FRAMES; frame++) {
    const ox = frame * TILE;
    const rand = mulberry32(theme.seed ^ (0x517cc1b7 + frame));

    if (theme.floorStyle === 'snow') {
      switch (frame % 4) {
        case 1: {
          // Small rock cluster poking through the snow.
          for (let i = 0; i < 4; i++) {
            const x = ox + 8 + Math.floor(rand() * 14);
            const y = 10 + Math.floor(rand() * 12);
            const w = 2 + Math.floor(rand() * 3);

            fill(ctx, x, y, w, 2, theme.wallTop, 0.9);
            fill(ctx, x, y - 1, w - 1, 1, theme.wallEdge, 0.9);
          }
          break;
        }
        case 2: {
          // Wind-scoured ripples.
          for (let i = 0; i < 5; i++) {
            const y = 4 + i * 5 + Math.floor(rand() * 2);

            fill(
              ctx,
              ox + 3 + Math.floor(rand() * 6),
              y,
              10 + Math.floor(rand() * 12),
              1,
              theme.seam,
              0.6,
            );
          }
          break;
        }
        case 3: {
          // Ice glaze patch.
          fill(ctx, ox + 8, 12, 14, 9, theme.glint, 0.28);
          fill(ctx, ox + 10, 14, 10, 5, theme.glint, 0.32);
          fill(ctx, ox + 9, 13, 3, 1, [255, 255, 255], 0.5);
          break;
        }
        default: {
          // Deeper snow tuft.
          fill(ctx, ox + 10, 14, 12, 6, theme.glint, 0.4);
          fill(ctx, ox + 12, 12, 8, 3, theme.glint, 0.5);
        }
      }
      continue;
    }

    switch (frame) {
      case 1: {
        // Vent grate.
        fill(ctx, ox + 9, 11, 14, 10, shade(theme.floor, -18));
        fill(ctx, ox + 9, 11, 14, 1, theme.seam);
        fill(ctx, ox + 9, 20, 14, 1, shade(theme.floor, 6), 0.8);

        for (let i = 0; i < 4; i++) {
          fill(ctx, ox + 11, 13 + i * 2, 10, 1, theme.seam, 0.9);
        }
        break;
      }
      case 2: {
        // Hairline crack / scuff.
        let x = ox + 6 + Math.floor(rand() * 4);
        let y = 8;

        for (let i = 0; i < 14 && y < 28; i++) {
          px(ctx, x, y, theme.seam, 0.85);

          if (rand() > 0.55) {
            x += rand() > 0.5 ? 1 : -1;
          }

          y += 1 + Math.floor(rand() * 2);
        }
        break;
      }
      case 3: {
        // Cable run clipped to the floor.
        const y = 14 + Math.floor(rand() * 4);

        fill(ctx, ox + 2, y, 28, 1, theme.wallFaceLine, 0.9);
        fill(ctx, ox + 2, y + 1, 28, 1, shade(theme.floor, -12), 0.7);
        fill(ctx, ox + 7, y - 1, 2, 3, theme.glint, 0.8);
        fill(ctx, ox + 21, y - 1, 2, 3, theme.glint, 0.8);
        break;
      }
      case 4: {
        // Wear patch (foot traffic).
        for (let i = 0; i < 22; i++) {
          const x = ox + 6 + Math.floor(rand() * 20);
          const y = 8 + Math.floor(rand() * 16);

          px(ctx, x, y, shade(theme.floor, -14), 0.5);
        }
        break;
      }
      case 5: {
        // Painted guide-line corner (dull trim tone).
        fill(ctx, ox + 5, 6, 1, 20, theme.trim, 0.55);
        fill(ctx, ox + 5, 25, 16, 1, theme.trim, 0.55);
        break;
      }
      default: {
        // Small deck stain.
        fill(ctx, ox + 12, 16, 8, 5, shade(theme.floor, -16), 0.45);
        fill(ctx, ox + 14, 14, 5, 2, shade(theme.floor, -16), 0.35);
      }
    }
  }
}

/**
 * Generates all theme tilesets + variant strips into the scene's texture
 * manager. Idempotent — existing keys are never re-generated.
 */
export function ensureThemeTilesets(scene: Phaser.Scene) {
  for (const theme of Object.values(STATION_THEMES)) {
    const sheetKey = themeTilesetKey(theme.id);

    if (!scene.textures.exists(sheetKey)) {
      const canvas = scene.textures.createCanvas(sheetKey, TILE * 4, TILE * 4);
      const ctx = canvas!.getContext();

      for (let mask = 0; mask < 16; mask++) {
        const frame = WANG_INDEX_TO_FRAME[mask];
        const tx = (frame % 4) * TILE;
        const ty = Math.floor(frame / 4) * TILE;

        drawWangTile(ctx, tx, ty, mask, theme, frame % 2);
      }

      canvas!.refresh();
    }

    const stripKey = themeVariantsKey(theme.id);

    if (!scene.textures.exists(stripKey)) {
      const canvas = scene.textures.createCanvas(
        stripKey,
        TILE * THEME_VARIANT_FRAMES,
        TILE,
      );

      drawVariantStrip(canvas!.getContext(), theme);
      canvas!.refresh();
    }
  }
}
