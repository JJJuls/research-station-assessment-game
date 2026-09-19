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
  // Records Workshop: one stitched two-bay plate (1376×384) — machine bay
  // west, records office east, joined by the painted doorway vestibule.
  'w2-workshop-plate': 'assets/world-v2/plates/workshop-plate.png',
  // Diagnostics Laboratory: one 22×12 plate (signal-analysis case room).
  'w2-laboratory-plate': 'assets/world-v2/plates/laboratory-plate.png',
  // Utility Deck: one 22×12 plate (feed hall with the sealed Core alcove).
  'w2-deck-plate': 'assets/world-v2/plates/deck-plate.png',
  // Core Chamber: one 22×12 plate (dormant reactor on its platform).
  'w2-core-plate': 'assets/world-v2/plates/core-plate.png',
  // Exterior Recovery Yard: one stitched two-plate strip (1376×384) —
  // apron + worksite west, recovery field east, joined by the drift pass.
  'w2-yard-plate': 'assets/world-v2/plates/yard-plate.png',
  // Opening key art (PilotOpeningScene pans over these).
  'w2-opening-station': 'assets/world-v2/opening/station-establishing.png',
  'w2-opening-berth': 'assets/world-v2/opening/shuttle-berth.png',
  // Architecture sprites composited over the plates.
  'w2-door-north': 'assets/world-v2/architecture/door-north.png',
  // Floor-supply sprites (scripts/world-v2/paint_props.py): what a world
  // bundle looks like — recognisable containers, not flat parcels.
  'w2-supply-component-crate':
    'assets/world-v2/props/supply-component-crate.png',
  'w2-supply-sample-case': 'assets/world-v2/props/supply-sample-case.png',
  'w2-supply-wire-and-wrap': 'assets/world-v2/props/supply-wire-and-wrap.png',
  'w2-supply-relay-unit': 'assets/world-v2/props/supply-relay-unit.png',
  // World V3 open Recovery Yard: the field plate and its free-standing
  // prop sprites (scripts/world-v2/install_yard_assets.py).
  'w3-yard-field': 'assets/world-v3/yard/yard-field.png',
  'w3-yard-coupling': 'assets/world-v3/yard/coupling.png',
  'w3-yard-uplink-post': 'assets/world-v3/yard/uplink-post.png',
  'w3-yard-uplink-rack': 'assets/world-v3/yard/uplink-rack.png',
  'w3-yard-mast': 'assets/world-v3/yard/mast.png',
  'w3-yard-supply-crate': 'assets/world-v3/yard/supply-crate.png',
  'w3-yard-cable-flag': 'assets/world-v3/yard/cable-flag.png',
  'w3-yard-gantry': 'assets/world-v3/yard/gantry.png',
  'w3-yard-scrap-pile': 'assets/world-v3/yard/scrap-pile.png',
  'w3-yard-rig-bench': 'assets/world-v3/yard/rig-bench.png',
  'w3-yard-parts-cart': 'assets/world-v3/yard/parts-cart.png',
  'w3-yard-lamp-a': 'assets/world-v3/yard/lamp-a.png',
  'w3-yard-lamp-e': 'assets/world-v3/yard/lamp-e.png',
  'w3-yard-rocks-nw': 'assets/world-v3/yard/rocks-nw.png',
  'w3-yard-rocks-sw': 'assets/world-v3/yard/rocks-sw.png',
  'w3-yard-rocks-e': 'assets/world-v3/yard/rocks-e.png',
  'w3-yard-boulder': 'assets/world-v3/yard/boulder.png',
  'w3-yard-debris-a': 'assets/world-v3/yard/debris-a.png',
  'w3-yard-debris-sw': 'assets/world-v3/yard/debris-sw.png',
  'w3-yard-debris-b': 'assets/world-v3/yard/debris-b.png',
  'w3-yard-debris-c': 'assets/world-v3/yard/debris-c.png',
  'w3-yard-debris-lean': 'assets/world-v3/yard/debris-lean.png',
  'w3-yard-stake-field': 'assets/world-v3/yard/stake-field.png',
};

/** Soft warm light pool drawn with ADD blending over a plate. */
export const WARM_POOL_TINT = 0xffb45c;
/** Cool emergency tint multiplied onto a plate before power restore. */
export const EMERGENCY_PLATE_TINT = 0x7e93ad;
