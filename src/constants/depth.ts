export enum Depth {
  AbovePlayer = 10,
  AboveWorld = 20,
}

/**
 * World V1 depth model (docs/game/PROFESSIONAL-WORLD-DESIGN-V1.md §10).
 *
 *   1  floor and decals            -1 … -0.2
 *   2  fixed ground infrastructure -0.19 … -0.01  (rails, trays, low crates)
 *   3  y-sorted actors/objects     worldDepth(footY) ∈ [0, 0.99]
 *   4  overhead architecture       2 … 3           (lintels, hanging pipes)
 *   5  HUD and modal surfaces      Depth.AboveWorld (HUD camera / overlays)
 *
 * The V4 names are kept as aliases so the zones not yet rebuilt keep their
 * meaning. Presentation only.
 */
export const DepthLayer = {
  /** 1 — baked floor + wall RenderTexture. */
  Floor: -1,
  /** 1 — floor decals, light pools, painted lanes, cable runs. */
  FloorDecal: -0.6,
  /** 1 (upper) — floor markings that must read over decals. */
  FloorMarking: -0.3,
  /** 2 — fixed ground infrastructure a figure always stands in front of. */
  GroundInfra: -0.15,
  /** 2 (alias) — low props that never occlude a figure. */
  LowProp: -0.1,
  /** 4 — overhead architecture (door frames/lintels, hanging pipes). */
  Overhead: 2,
  /** 4 (alias) — foreground / overhead elements. */
  Foreground: 2,
  /** 4 (upper) — state glyphs and lamps attached to world objects. */
  WorldReadout: 3,
} as const;

/**
 * Y-sorted world depth for the avatar, NPC sprites and freestanding
 * objects so a figure walks behind tall props and in front of low ones.
 * The foot line (world y) maps into (0, 1) — above the baked floor (-1),
 * the drop shadows (-0.25) and below every UI depth. Presentation only.
 */
export const worldDepth = (footY: number): number =>
  Math.max(0, Math.min(0.99, footY * 0.0005));
