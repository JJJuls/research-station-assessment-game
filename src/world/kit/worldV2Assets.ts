/**
 * World V2 rescue asset table (professional world rescue, branch
 * fable-professional-world-rescue-v2) — PROVISIONAL MODEL-SELECTED
 * PixelLab candidates, NOT HUMAN-APPROVED.
 *
 * The rescue slice renders its rebuilt rooms as AUTHORED PAINTED PLATES:
 * one coherent key-art background per room (collision comes from the
 * invisible logical grid exactly as before), with interactive objects,
 * doors and dynamic lighting layered on top as sprites. Provenance for
 * every plate and sprite lives in `public/assets/world-v2/manifest.json`
 * and `docs/game/world-v2/ASSET-PROVENANCE-REGISTER.md`.
 *
 * Presentation only: no mechanic, event, window or score reads any of
 * these textures.
 */

/** Still images. */
export const WORLD_V2_IMAGE_URLS: Record<string, string> = {
  // Room plates (painted backgrounds; collision is the layout grid).
  'w2-dock-plate': 'assets/world-v2/plates/dock-plate.png',
  'w2-concourse-plate': 'assets/world-v2/plates/concourse-plate.png',
  // Opening key art (PilotOpeningScene pans over these).
  'w2-opening-station': 'assets/world-v2/opening/station-establishing.png',
  'w2-opening-berth': 'assets/world-v2/opening/shuttle-berth.png',
  // Architecture sprites composited over the plates.
  'w2-door-north': 'assets/world-v2/architecture/door-north.png',
};

/** Soft warm light pool drawn with ADD blending over a plate. */
export const WARM_POOL_TINT = 0xffb45c;
/** Cool emergency tint multiplied onto a plate before power restore. */
export const EMERGENCY_PLATE_TINT = 0x7e93ad;
