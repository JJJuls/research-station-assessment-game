/**
 * Frozen-stimuli version identifier (approved plan §8 static-stimuli rule).
 * Bumped on ANY committed asset change so the logged pair
 * (game_version, asset_set_version) identifies exactly which stimuli a
 * participant saw. Recorded per-asset in
 * docs/assets/pixellab-asset-manifest.md; formally locked at the
 * stimulus-freeze gate (plan §17b) before any pilot/formal data collection.
 */
export const ASSET_SET_VERSION = 'outpost-assets-v5';

/** Player character texture keys (PixelLab player-researcher-v1). */
export const RESEARCHER_DIRECTIONS = [
  'south',
  'west',
  'east',
  'north',
] as const;
export type ResearcherDirection = (typeof RESEARCHER_DIRECTIONS)[number];

export const researcherRotationKey = (dir: ResearcherDirection) =>
  `researcher-rot-${dir}`;
export const researcherWalkFrameKey = (dir: ResearcherDirection, i: number) =>
  `researcher-walk-${dir}-${i}`;
export const researcherIdleFrameKey = (dir: ResearcherDirection, i: number) =>
  `researcher-idle-${dir}-${i}`;

export const RESEARCHER_WALK_FRAMES = 8;
// breathing-idle template renders 4 frames per direction.
export const RESEARCHER_IDLE_FRAMES = 4;

/**
 * Committed PixelLab room props (Phase F Wave 3). Key → public URL; every
 * file is recorded with prompt/hash/lineage in
 * docs/assets/pixellab-asset-manifest.md.
 */
export const PROP_TEXTURES: Record<string, string> = {
  'prop-dock-terminal': 'assets/props/dock/arrival-terminal.png',
  'prop-dock-airlock': 'assets/props/dock/airlock-door.png',
  'prop-dock-signage': 'assets/props/dock/signage.png',
  'prop-dock-crates': 'assets/props/dock/supply-crates.png',
  'prop-hub-status-board': 'assets/props/hub/status-board.png',
  'prop-hub-door-frame': 'assets/props/hub/door-frame.png',
  'prop-hub-console': 'assets/props/hub/hub-console.png',
  'prop-hub-locked-door': 'assets/props/hub/locked-door.png',
  'prop-archive-terminal': 'assets/props/archive/terminal.png',
  'prop-archive-shelves': 'assets/props/archive/log-shelves.png',
  'prop-archive-panels': 'assets/props/archive/data-panels.png',
  'prop-archive-racks': 'assets/props/archive/server-racks.png',
};

/**
 * Pilot Unit 6 — PROVISIONAL MODEL-SELECTED PixelLab v1 sheets
 * (PROVISIONAL — USER-AUTHORISED FOR EXPERIMENTAL PILOT INTEGRATION —
 * NOT FINAL ART APPROVAL). Selection + verification:
 * docs/game/PILOT-ASSET-SELECTION-AND-PROVENANCE.md. Sheets load as
 * Phaser spritesheets (pixel-exact, no retouching): player action
 * sheets are 576×384 (6 frames × rows S/W/E/N of 96×96, feet-line
 * y=71); effect sheets are 448×64 (7 one-shot frames of 64×64).
 */
export const PLAYER_ACTION_KINDS = ['scan', 'dig', 'pickup'] as const;
export type PlayerActionKind = (typeof PLAYER_ACTION_KINDS)[number];

export const playerActionSheetKey = (kind: PlayerActionKind) =>
  `plv1-action-${kind}`;

export const PLAYER_ACTION_SHEET_URLS: Record<PlayerActionKind, string> = {
  scan: 'assets/pixellab-runtime/player-actions/scan-sweep.png',
  dig: 'assets/pixellab-runtime/player-actions/dig.png',
  pickup: 'assets/pixellab-runtime/player-actions/pickup.png',
};

export const PLAYER_ACTION_FRAMES_PER_ROW = 6;

/** Sheet row per facing (pack contract: rows south/west/east/north). */
export const PLAYER_ACTION_ROW: Record<ResearcherDirection, number> = {
  south: 0,
  west: 1,
  east: 2,
  north: 3,
};

/** One-shot effect sheets (texture key → URL; 7 frames of 64×64). */
export const EFFECT_SHEET_URLS: Record<string, string> = {
  'plv1-fx-dig-dust': 'assets/pixellab-runtime/effects/dig-dust.png',
  'plv1-fx-scan-pulse': 'assets/pixellab-runtime/effects/scan-pulse.png',
  'plv1-fx-sparks': 'assets/pixellab-runtime/effects/repair-sparks.png',
};

/**
 * Unit 7 (professional presentation) — PROVISIONAL MODEL-SELECTED — NOT
 * HUMAN-APPROVED PixelLab v1 promotions (docs/game/
 * PIXELLAB-RUNTIME-ASSET-PROVENANCE.md, "Unit 7"). Stills load as images,
 * strips as spritesheets at the frame size recorded here. Presentation
 * only: no mechanic, event, window or score reads any of them.
 */
export const UNIT7_STILL_URLS: Record<string, string> = {
  'plv1-bot-standby': 'assets/pixellab-runtime/robots/bot-standby.png',
  'plv1-bot-working': 'assets/pixellab-runtime/robots/bot-working.png',
  'plv1-core-coolant-column':
    'assets/pixellab-runtime/props/core-coolant-column.png',
  'plv1-core-pillar-a': 'assets/pixellab-runtime/props/core-pillar-a.png',
  'plv1-core-pillar-b': 'assets/pixellab-runtime/props/core-pillar-b.png',
  'plv1-core-console': 'assets/pixellab-runtime/props/core-console.png',
  'plv1-utility-tower': 'assets/pixellab-runtime/props/utility-tower.png',
  'plv1-utility-panel': 'assets/pixellab-runtime/props/utility-panel.png',
  'plv1-utility-desk': 'assets/pixellab-runtime/props/utility-desk.png',
  'plv1-arch-door': 'assets/pixellab-runtime/props/arch-door.png',
  'plv1-arch-vent': 'assets/pixellab-runtime/props/arch-vent.png',
  'plv1-arch-grille': 'assets/pixellab-runtime/props/arch-grille.png',
  'plv1-arch-pipes': 'assets/pixellab-runtime/props/arch-pipes.png',
};

export const UNIT7_STRIP_URLS: Record<
  string,
  { url: string; frameWidth: number; frameHeight: number; frames: number }
> = {
  'plv1-core-sync': {
    url: 'assets/pixellab-runtime/sequences/core-sync.png',
    frameWidth: 64,
    frameHeight: 96,
    frames: 7,
  },
  'plv1-airlock-open': {
    url: 'assets/pixellab-runtime/sequences/airlock-open.png',
    frameWidth: 96,
    frameHeight: 64,
    frames: 7,
  },
  'plv1-antenna-signal': {
    url: 'assets/pixellab-runtime/sequences/antenna-signal.png',
    frameWidth: 64,
    frameHeight: 96,
    frames: 7,
  },
  'plv1-fx-snowfall': {
    url: 'assets/pixellab-runtime/effects/snowfall.png',
    frameWidth: 96,
    frameHeight: 96,
    frames: 9,
  },
};
