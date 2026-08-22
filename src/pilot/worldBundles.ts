/**
 * World bundles — recoverable world items for the pilot zones (Unit 3).
 *
 * Ported from the inventory proving ground (InventoryLabScene.spawnBundle /
 * pickUpBundle) into a reusable layer: a bundle is a small crate with a label
 * chip; SPACE/E next to it moves each contained stack into the participant's
 * hotbar/backpack through the authoritative inventory service (all-or-
 * nothing per stack; whatever cannot fit STAYS on the floor — a refused
 * pickup never loses an item). Confirmed world drops from the overlay
 * materialise as bundles at the participant's feet on scene resume.
 *
 * Telemetry: `secondary_inventory_world_pickup` /
 * `secondary_inventory_world_drop_materialised` (contextual only — never
 * item evidence; ambient inventory handling is never a primary measure).
 */
import Phaser from 'phaser';

import { Depth } from '../constants';
import { sfxPickup, sfxUnavailable } from '../gameplay/audio';
import { CONTAINER_IDS } from '../inventory/model';
import { drainWorldDrops, invAddItem } from '../inventory/store';
import { logSecondaryInventoryEvent } from '../inventory/telemetry';

export interface BundleContent {
  definitionId: string;
  quantity: number;
}

export interface WorldBundle {
  id: string;
  label: string;
  x: number;
  y: number;
  contents: BundleContent[];
  visuals: Phaser.GameObjects.GameObject[];
}

export const BUNDLE_REACH_PX = 64;

export class WorldBundleLayer {
  private bundles: WorldBundle[] = [];
  private seq = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly showFeedback: (message: string) => void,
  ) {}

  spawn(label: string, x: number, y: number, contents: BundleContent[]) {
    this.seq += 1;

    const crate = this.scene.add
      .rectangle(x, y, 26, 20, 0x6a5a3a, 1)
      .setStrokeStyle(1, 0x9a8a5a);
    const strap = this.scene.add.rectangle(x, y, 26, 4, 0x9a8a5a, 1);
    const chip = this.scene.add
      .text(x, y + 20, label, {
        backgroundColor: '#101820',
        color: '#dfe9f1',
        font: '10px monospace',
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5, 0)
      .setDepth(Depth.AboveWorld - 3);

    this.bundles.push({
      id: `bundle_${this.seq}`,
      label,
      x,
      y,
      contents: contents.map((entry) => ({ ...entry })),
      visuals: [crate, strap, chip],
    });
  }

  /** Materialises confirmed overlay world drops at the given position. */
  materialiseDrops(x: number, y: number) {
    for (const stack of drainWorldDrops()) {
      this.spawn(
        'Set-down bundle',
        Phaser.Math.Clamp(x + 40, 60, 740),
        Phaser.Math.Clamp(y + 20, 80, 480),
        [{ definitionId: stack.definitionId, quantity: stack.quantity }],
      );
      logSecondaryInventoryEvent('world_drop_materialised', {
        definition_id: stack.definitionId,
        quantity: stack.quantity,
      });
    }
  }

  nearest(x: number, y: number): WorldBundle | null {
    let best: WorldBundle | null = null;
    let bestDistance = BUNDLE_REACH_PX;

    for (const bundle of this.bundles) {
      const distance = Phaser.Math.Distance.Between(x, y, bundle.x, bundle.y);

      if (distance < bestDistance) {
        bestDistance = distance;
        best = bundle;
      }
    }

    return best;
  }

  count(): number {
    return this.bundles.length;
  }

  serialize() {
    return this.bundles.map((bundle) => ({
      id: bundle.id,
      label: bundle.label,
      x: bundle.x,
      y: bundle.y,
      contents: bundle.contents.map((entry) => ({ ...entry })),
    }));
  }

  /** Collects the nearest bundle in reach; returns whether one was in reach. */
  tryCollectNearest(x: number, y: number): boolean {
    const bundle = this.nearest(x, y);

    if (bundle === null) {
      return false;
    }

    const remaining: BundleContent[] = [];
    let takenAny = false;

    for (const content of bundle.contents) {
      const change = invAddItem({
        definitionId: content.definitionId,
        quantity: content.quantity,
        targetContainerIds: [
          CONTAINER_IDS.playerHotbar,
          CONTAINER_IDS.playerBackpack,
        ],
        allOrNothing: true,
      });

      if (change.ok) {
        takenAny = true;
      } else {
        remaining.push(content);
      }
    }

    bundle.contents = remaining;

    if (takenAny) {
      sfxPickup();
      logSecondaryInventoryEvent('world_pickup', {
        bundle: bundle.label,
        remaining: remaining.length,
      });
    }

    if (remaining.length === 0) {
      for (const visual of bundle.visuals) {
        visual.destroy();
      }

      this.bundles = this.bundles.filter((candidate) => candidate !== bundle);
      this.showFeedback(`${bundle.label} collected.`);
    } else if (takenAny) {
      this.showFeedback(
        'Inventory full — part of the bundle is still on the floor.',
      );
    } else {
      sfxUnavailable();
      this.showFeedback('Inventory full. The bundle stays where it is.');
    }

    return true;
  }
}
