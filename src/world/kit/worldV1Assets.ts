/**
 * World V1 production asset table (professional world rebuild, vertical
 * slice) — PROVISIONAL MODEL-SELECTED PixelLab candidates, NOT HUMAN-APPROVED.
 *
 * Every texture key → public URL. Provenance (batch, PixelLab object/job
 * id, prompt item, source canvas, alpha trim, SHA-256, acceptance) lives in
 * `public/assets/world-v1/manifest.json` and the register
 * `docs/game/world-v1/ASSET-PROVENANCE-REGISTER.md`. Presentation only:
 * no mechanic, event, window or score reads any of these textures; every
 * asset is anchored at its bottom-centre ground contact by the scenes and
 * collides only through the layout's authored footprints.
 */

/** Still images (alpha-trimmed frames). */
export const WORLD_V1_IMAGE_URLS: Record<string, string> = {
  // operations / workstation family (batch O1, O2, O4)
  'w1-terminal-available': 'assets/world-v1/operations/terminal-available.png',
  'w1-terminal-settled': 'assets/world-v1/operations/terminal-settled.png',
  'w1-plan-board': 'assets/world-v1/operations/plan-board.png',
  'w1-evidence-desk': 'assets/world-v1/operations/evidence-desk.png',
  'w1-reading-desk': 'assets/world-v1/operations/reading-desk.png',
  'w1-qc-counter': 'assets/world-v1/operations/qc-counter.png',
  'w1-gauge': 'assets/world-v1/operations/gauge.png',
  'w1-filing-cabinet': 'assets/world-v1/operations/filing-cabinet.png',
  'w1-notice-board': 'assets/world-v1/operations/notice-board.png',
  'w1-document-trolley': 'assets/world-v1/operations/document-trolley.png',
  'w1-chair': 'assets/world-v1/operations/chair.png',
  'w1-folders': 'assets/world-v1/operations/folders.png',
  'w1-stool': 'assets/world-v1/operations/stool.png',
  'w1-radio-cradle': 'assets/world-v1/operations/radio-cradle.png',
  'w1-paper-stack': 'assets/world-v1/operations/paper-stack.png',
  'w1-ops-counter': 'assets/world-v1/operations/ops-counter.png',
  // storage / service family (batch O1, O2, O4, O5)
  'w1-crate-stack': 'assets/world-v1/storage/crate-stack.png',
  'w1-tool-cart': 'assets/world-v1/storage/tool-cart.png',
  'w1-pallet-jack': 'assets/world-v1/storage/pallet-jack.png',
  'w1-cable-drum': 'assets/world-v1/storage/cable-drum.png',
  'w1-crate': 'assets/world-v1/storage/crate.png',
  'w1-extinguisher': 'assets/world-v1/storage/extinguisher.png',
  'w1-bollard': 'assets/world-v1/storage/bollard.png',
  'w1-debris-panel': 'assets/world-v1/storage/debris-panel.png',
  'w1-cable-coil': 'assets/world-v1/storage/cable-coil.png',
  'w1-drum': 'assets/world-v1/storage/drum.png',
  'w1-waste-bin': 'assets/world-v1/storage/waste-bin.png',
  'w1-hazard-sign': 'assets/world-v1/storage/hazard-sign.png',
  'w1-crate-b': 'assets/world-v1/storage/crate-b.png',
  'w1-cable-spool': 'assets/world-v1/storage/cable-spool.png',
  'w1-lockers': 'assets/world-v1/storage/lockers.png',
  'w1-cover-loose': 'assets/world-v1/storage/cover-loose.png',
  'w1-cover-secured': 'assets/world-v1/storage/cover-secured.png',
  'w1-shelving': 'assets/world-v1/storage/shelving.png',
  // architecture (batch O1, O2, O3, O4, O5)
  'w1-service-lamp-standby':
    'assets/world-v1/architecture/service-lamp-standby.png',
  'w1-service-lamp-steady':
    'assets/world-v1/architecture/service-lamp-steady.png',
  'w1-strip-light-standby':
    'assets/world-v1/architecture/strip-light-standby.png',
  'w1-strip-light-steady':
    'assets/world-v1/architecture/strip-light-steady.png',
  'w1-junction-box': 'assets/world-v1/architecture/junction-box.png',
  'w1-cable-tray': 'assets/world-v1/architecture/cable-tray.png',
  'w1-vent-grille': 'assets/world-v1/architecture/vent-grille.png',
  'w1-pipe-run': 'assets/world-v1/architecture/pipe-run.png',
  'w1-status-lamp': 'assets/world-v1/architecture/status-lamp.png',
  'w1-intercom': 'assets/world-v1/architecture/intercom.png',
  'w1-door-north-closed': 'assets/world-v1/architecture/door-north-closed.png',
  'w1-door-side-closed': 'assets/world-v1/architecture/door-side-closed.png',
  'w1-airlock-closed': 'assets/world-v1/architecture/airlock-closed.png',
  'w1-airlock-open': 'assets/world-v1/architecture/airlock-open.png',
  'w1-dock-window': 'assets/world-v1/architecture/dock-window.png',
  'w1-status-panel-standby':
    'assets/world-v1/architecture/status-panel-standby.png',
  'w1-status-panel-steady':
    'assets/world-v1/architecture/status-panel-steady.png',
  // exterior / opening (pixen)
  'w1-shuttle': 'assets/world-v1/exterior/shuttle.png',
  'w1-module-roof-a': 'assets/world-v1/exterior/module-roof-a.png',
  'w1-module-roof-b': 'assets/world-v1/exterior/module-roof-b.png',
  'w1-mast': 'assets/world-v1/exterior/mast.png',
  'w1-drift-rock': 'assets/world-v1/exterior/drift-rock.png',
};

/**
 * Animation strips (uniform frames). The airlock strip runs closed (0) →
 * open (4): PixelLab v3 frames 0–3 plus the static open still as frame 4
 * (the generated frames 4–6 were rejected — off-palette interior).
 */
export const WORLD_V1_STRIP_URLS: Record<
  string,
  { url: string; frameWidth: number; frameHeight: number; frames: number }
> = {
  'w1-airlock-open-strip': {
    url: 'assets/world-v1/architecture/airlock-open-strip.png',
    frameWidth: 96,
    frameHeight: 96,
    frames: 5,
  },
};

/**
 * 16-tile Wang tilesets in the committed v3 sheet layout (4×4; the
 * metadata JSON beside each PNG records the corner → bounding-box map that
 * StationMapBuilder's WANG_INDEX_TO_FRAME already encodes).
 */
export const WORLD_V1_TILESET_URLS: Record<string, string> = {
  'w1-tileset-exterior': 'assets/world-v1/exterior/tileset-exterior.png',
};

/** Runtime tint that settles the shuttle's light hull into the palette. */
export const SHUTTLE_HULL_TINT = 0xb9c8d8;
