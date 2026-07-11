import Phaser from 'phaser';

import { key } from '../constants';
import { researchRuntime } from '../systems';

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
  dock: key.scene.dock,
  hub: key.scene.hub,
  prototype: key.scene.main,
};

export function resolveStartSceneKey(): string {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('scene');

  if (requested !== null && requested in SCENE_PARAM_TO_KEY) {
    return SCENE_PARAM_TO_KEY[requested];
  }

  // Phase B: the connected world starts at the Dock / Arrival Bay.
  return key.scene.dock;
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
  // FADE_OUT_COMPLETE never fires, soft-locking the transition.
  camera.fadeEffect.start(true, 250, 0, 0, 0, true);
}
