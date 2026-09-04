export enum Depth {
  AbovePlayer = 10,
  AboveWorld = 20,
}

/**
 * V4 depth policy (docs/game/VISUAL-SYSTEM-V4.md §3). Layers 1–3 and 5 are
 * fixed values; layer 4 (actors and tall obstacles) is y-sorted through
 * worldDepth(); layers 6–7 are the Depth enum above. Presentation only.
 */
export const DepthLayer = {
  /** 1 — baked floor + wall RenderTexture. */
  Floor: -1,
  /** 2 — floor decals, light pools, markings, cable runs, landing pad. */
  FloorDecal: -0.6,
  /** 2 (upper) — floor markings that must read over decals. */
  FloorMarking: -0.3,
  /** 3 — low props a figure always stands in front of. */
  LowProp: -0.1,
  /** 5 — foreground / overhead elements (lintels, hanging pipes). */
  Foreground: 2,
  /** 5 (upper) — state chips and readouts attached to world objects. */
  WorldReadout: 3,
} as const;

/**
 * Unit 7 presentation: y-sorted world depth for the avatar, NPC sprites and
 * decor so a figure walks behind tall props and in front of low ones. The
 * foot line (world y) maps into (0, 1) — above the baked floor (-1), the
 * drop shadows (-0.25) and below every UI depth. Presentation only.
 */
export const worldDepth = (footY: number): number =>
  Math.max(0, Math.min(0.99, footY * 0.001));
