export enum Depth {
  AbovePlayer = 10,
  AboveWorld = 20,
}

/**
 * Unit 7 presentation: y-sorted world depth for the avatar, NPC sprites and
 * decor so a figure walks behind tall props and in front of low ones. The
 * foot line (world y) maps into (0, 1) — above the baked floor (-1), the
 * drop shadows (-0.25) and below every UI depth. Presentation only.
 */
export const worldDepth = (footY: number): number =>
  Math.max(0, Math.min(0.99, footY * 0.001));
