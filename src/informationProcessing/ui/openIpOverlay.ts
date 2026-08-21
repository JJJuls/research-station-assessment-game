/**
 * Overlay launcher for the Information Processing overlays.
 *
 * Pause-and-launch, exactly like the inventory overlay / ESC→Menu
 * precedent: the host scene is PAUSED while an overlay is open, so its
 * update loop, keyboard plugin and pointer targets are structurally
 * inert (no world movement, no interaction keys leaking through). The
 * overlay resumes the host when it closes and the host resets latched
 * key state on RESUME.
 */

import Phaser from 'phaser';

import { key } from '../../constants';

export type IpOverlayKey =
  | typeof key.scene.ipSignalTerminal
  | typeof key.scene.ipPipeBoard
  | typeof key.scene.ipDiagnosisConsole;

export interface IpOverlayLaunchData {
  resumeKey: string;
  /** Module / task id the overlay should mount ('tutorial', 'm14'…). */
  taskId: string;
}

export function openIpOverlay(
  host: Phaser.Scene,
  overlayKey: IpOverlayKey,
  taskId: string,
): boolean {
  for (const candidate of [
    key.scene.ipSignalTerminal,
    key.scene.ipPipeBoard,
    key.scene.ipDiagnosisConsole,
  ]) {
    if (host.scene.isActive(candidate)) {
      return false;
    }
  }

  host.scene.pause(host.scene.key);
  host.scene.launch(overlayKey, {
    resumeKey: host.scene.key,
    taskId,
  } satisfies IpOverlayLaunchData);

  return true;
}

/** Standard host-side wiring: clear stale key state after any pause. */
export function wireIpOverlayHost(host: Phaser.Scene) {
  host.events.on(Phaser.Scenes.Events.RESUME, () => {
    host.input.keyboard?.resetKeys();
  });
}
