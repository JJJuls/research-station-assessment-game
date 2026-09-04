import Phaser from 'phaser';

import { key } from '../constants';
import { setPilotLaunchMode } from '../pilot/pilotCoverage';
import { researchRuntime } from '../systems';
import { fadeAllCameras } from './viewport';

/**
 * Maps the `?scene=` launch query parameter to a Phaser scene key. The
 * default (no/unknown parameter) is the current prototype scene so Phase A
 * introduces zero behavioural change; Phase B flips the default to the Dock
 * room once it exists. `?scene=prototype` must keep working until every
 * prototype station has been ported to a real room (approved plan §11 —
 * no research station may disappear).
 */
const SCENE_PARAM_TO_KEY: Record<string, string> = {
  archive: key.scene.archive,
  // Physical-mechanics session (Unit 3): the Ridge Annex artifact survey.
  artifact_field: key.scene.artifactSurvey,
  // Action-assessment rebuild (Unit 2): the coolant red line areas.
  coolant_yard: key.scene.coolantYard,
  // Evidence-led pilot v2 (Unit 6): the Core Chamber. Direct alias =
  // developer launch (readiness rules still apply; `&dev_closure=inspect`
  // is the visibly labelled DEV-only inspection bypass).
  core_chamber: key.scene.coreChamber,
  // Four-zone assessment route (map foundation unit): the four zone
  // scenes. Direct aliases exist for regression/verification launches;
  // the participant default (below) always enters the Station Concourse
  // and the in-game route is forward-only.
  diagnostics_laboratory: key.scene.diagnosticsLaboratory,
  dock: key.scene.dock,
  exterior_recovery_yard: key.scene.exteriorRecoveryYard,
  // Field-actions foundation: developer proving ground for the reusable
  // scan/dig/magnet subsystem (never the participant default).
  field_actions_lab: key.scene.fieldActionsLab,
  // Overnight prototype: the Survey Terrace gameplay area and the two
  // Unit 3 measurement-module areas (not assessment stations — no
  // station-registry entries).
  field: key.scene.field,
  hub: key.scene.hub,
  // Information Processing foundation: developer proving ground for the
  // signal-decoder / pipe-lattice / fault-diagnosis subsystem (never on
  // the participant route).
  information_processing_lab: key.scene.informationProcessingLab,
  // Interactive inventory foundation: developer proving ground for the
  // authoritative inventory system (never on the participant route).
  inventory_lab: key.scene.inventoryLab,
  ops_annex: key.scene.opsAnnex,
  prototype: key.scene.main,
  pump_house: key.scene.pumpHouse,
  // Evidence-led pilot v2 (Unit 1): the Records Workshop zone (episodes 2
  // and 5). Direct alias = developer launch, like every other zone alias.
  records_workshop: key.scene.recordsWorkshop,
  station_concourse: key.scene.stationConcourse,
  utility_bay: key.scene.utilityBay,
  utility_core_deck: key.scene.utilityCoreDeck,
};

/**
 * Participant-route scene keys: launching at any of these is a PARTICIPANT
 * launch (the default and `?scene=dock`). Every other alias is a developer
 * launch — legacy rooms, proving-ground labs, direct zone skips — and is
 * recorded as such in the pilot coverage registry (session contamination).
 */
const PARTICIPANT_START_KEYS = new Set<string>([key.scene.dock]);

export function resolveStartSceneKey(): string {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('scene');
  const resolved =
    requested !== null && requested in SCENE_PARAM_TO_KEY
      ? SCENE_PARAM_TO_KEY[requested]
      : // Professional pilot route: the participant default is the Dock
        // (arrival + control tutorial). Legacy rooms (Hub ring, prototype),
        // the proving-ground labs and direct zone aliases stay reachable
        // ONLY through the explicit `?scene=` aliases above.
        key.scene.dock;

  setPilotLaunchMode(
    PARTICIPANT_START_KEYS.has(resolved) && !isLegacyRoute()
      ? 'participant'
      : 'developer',
    resolved,
  );

  return resolved;
}

/**
 * `?route=legacy` keeps the historical Dock → Hub ring route for the legacy
 * regression specs and developer walkthroughs: the Dock's north door then
 * targets the Station Hub instead of the pilot Concourse. Never the
 * participant default; recorded as a developer launch.
 */
export function isLegacyRoute(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return new URLSearchParams(window.location.search).get('route') === 'legacy';
}

/** Whether a `?scene=` alias is already routable. */
export function isSceneRouteRegistered(param: string): boolean {
  return param in SCENE_PARAM_TO_KEY;
}

/**
 * Registers an additional `?scene=` alias once its scene exists (used by
 * room build phases so unbuilt scenes are never routable).
 */
export function registerSceneRoute(param: string, sceneKey: string) {
  if (param in SCENE_PARAM_TO_KEY) {
    throw new Error(
      `Scene route "${param}" is already registered (protected: the prototype route must never be overwritten)`,
    );
  }

  SCENE_PARAM_TO_KEY[param] = sceneKey;
}

export interface RoomTransitionTarget {
  /** Phaser scene key to start. */
  sceneKey: string;
  /**
   * Canonical `room_id` (event-schema.md §2) or the documented
   * control/usability area id (`station_hub`) for SessionState tracking.
   */
  roomId: string;
  /** Optional spawn hint the target scene may read from its init data. */
  spawn?: string;
}

/**
 * Fades out, updates SessionState's current room, and starts the target
 * scene. Event logging for room entry belongs to the *target* scene's
 * create() (one place per room, so entries via any door log identically).
 */
export function transitionToRoom(
  from: Phaser.Scene,
  target: RoomTransitionTarget,
) {
  const camera = from.cameras.main;

  camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    researchRuntime.sessionState.setCurrentRoom(target.roomId);
    from.scene.start(target.sceneKey, { spawn: target.spawn });
  });
  // Force-restart the shared fade effect: without `force`, a fade already in
  // progress (e.g. the room's entry fadeIn) makes fadeOut a no-op and
  // FADE_OUT_COMPLETE never fires, soft-locking the transition. V4: the
  // HUD camera fades with the world camera.
  fadeAllCameras(from, 'out', 250);
}
