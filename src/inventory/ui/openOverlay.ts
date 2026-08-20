/**
 * Overlay launcher (interactive inventory foundation).
 *
 * The single shared entry point for opening the inventory overlay from a
 * host scene: pause-and-launch, exactly like the ESC→Menu precedent, so
 * the host's update loop, keyboard plugin and pointer targets are all
 * inert while the overlay is open. Deliberately free of researchRuntime
 * imports — hosts on the event-free zone layer stay event-free.
 */

import Phaser from 'phaser';

import { key } from '../../constants';
import type { InventoryOverlayLaunchData } from './InventoryOverlayScene';
import { guardKeyHandler } from './keyGuard';

export function openInventoryOverlay(
  host: Phaser.Scene,
  data?: Omit<InventoryOverlayLaunchData, 'resumeKey'>,
) {
  if (host.scene.isActive(key.scene.inventoryOverlay)) {
    return;
  }

  host.scene.pause(host.scene.key);
  host.scene.launch(key.scene.inventoryOverlay, {
    resumeKey: host.scene.key,
    mode: 'backpack',
    ...data,
  } satisfies InventoryOverlayLaunchData);
}

/**
 * Standard host-side wiring: I opens the overlay, and resuming after any
 * overlay/menu pause clears stale key state (a key released while the
 * host was paused would otherwise stay latched down).
 */
export function wireInventoryOverlayKey(
  host: Phaser.Scene,
  options?: {
    isEligible?: () => boolean;
    launchData?: () => Omit<InventoryOverlayLaunchData, 'resumeKey'>;
  },
) {
  host.input.keyboard!.on(
    'keydown-I',
    guardKeyHandler((event: KeyboardEvent) => {
      if (
        event.repeat ||
        (options?.isEligible !== undefined && !options.isEligible())
      ) {
        return;
      }

      openInventoryOverlay(host, options?.launchData?.());
    }),
  );

  host.events.on(Phaser.Scenes.Events.RESUME, () => {
    host.input.keyboard?.resetKeys();
  });
}
