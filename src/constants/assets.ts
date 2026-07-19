/**
 * Frozen-stimuli version identifier (approved plan §8 static-stimuli rule).
 * Bumped on ANY committed asset change so the logged pair
 * (game_version, asset_set_version) identifies exactly which stimuli a
 * participant saw. Recorded per-asset in
 * docs/assets/pixellab-asset-manifest.md; formally locked at the
 * stimulus-freeze gate (plan §17b) before any pilot/formal data collection.
 */
export const ASSET_SET_VERSION = 'outpost-assets-v2';

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
