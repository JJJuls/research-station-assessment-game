/**
 * Dig controller (field-actions foundation).
 *
 * Physical terrain digging: D attempts the cell under the player's
 * facing-direction probe (Player.selector — the adjacent-cell body the
 * sprite already maintains), runs a brief bounded timed action with a
 * progress bar and dig animation, and applies the persistent result:
 * disturbed ground on every valid dig (empty or not), recovery of a
 * buried object only from its actual registered cell, and the
 * inventory-full field-cache fallback so item conservation always
 * holds. Ineligible surfaces refuse neutrally via the host's feedback.
 *
 * Telemetry stays with the host (onResolved); nothing here logs.
 */

import type Phaser from 'phaser';

import { playActionAnimation } from '../gameplay/actionAnimations';
import { performWorldAction } from '../gameplay/actions';
import { showFloatingText } from '../gameplay/actions';
import { sfxDig, sfxPickup } from '../gameplay/audio';
import { burstParticles } from '../gameplay/effects';
import { addInventoryItem } from '../gameplay/inventory';
import { getGameItem } from '../gameplay/items';
import type { DigSurfaceRegistry } from './digSurfaceRegistry';
import type { FieldCacheManager } from './fieldCache';

export const DIG_ACTION_DURATION_MS = 1500;

export interface DigRecord {
  col: number;
  row: number;
  zone_id: string | null;
  outcome: 'empty' | 'recovered' | 'cached';
  object_id: string | null;
  item_id: string | null;
}

export interface DigRefusal {
  col: number;
  row: number;
  reason: 'not_diggable' | 'zone_inactive' | 'already_dug';
}

export interface DigControllerConfig {
  scene: Phaser.Scene;
  registry: DigSurfaceRegistry;
  caches: FieldCacheManager;
  /** Facing-direction probe centre (Player.selector). */
  getProbePosition: () => { x: number; y: number };
  onResolved: (record: DigRecord) => void;
  onRefused: (refusal: DigRefusal) => void;
  /** Persistent terrain-change hook (the scene draws the decals). */
  onCellDug: (col: number, row: number) => void;
  showFeedback: (message: string) => void;
}

const REFUSAL_MESSAGES: Record<DigRefusal['reason'], string> = {
  not_diggable: 'The surface here is sealed — no digging on this ground.',
  zone_inactive:
    'This plot is staked for a scheduled exercise — the range console controls access.',
  already_dug: 'This spot is already excavated.',
};

export class DigController {
  private readonly config: DigControllerConfig;
  /** Most recent resolved record (host probe convenience). */
  lastRecord: DigRecord | null = null;

  constructor(config: DigControllerConfig) {
    this.config = config;
  }

  /**
   * The D-chip target: the centre of the facing-adjacent cell when it
   * is currently diggable, else null (chip hidden, key routed to the
   * ineligible-press hook).
   */
  getDigTarget(): { x: number; y: number } | null {
    const probe = this.config.getProbePosition();
    const cell = this.config.registry.resolveCell(probe.x, probe.y);

    if (!this.config.registry.isDiggable(cell.col, cell.row)) {
      return null;
    }

    return this.config.registry.cellCenter(cell.col, cell.row);
  }

  /** Neutral refusal for a D press with no diggable cell in front. */
  handleIneligiblePress(): void {
    const probe = this.config.getProbePosition();
    const cell = this.config.registry.resolveCell(probe.x, probe.y);
    const reason = this.config.registry.refusalReason(cell.col, cell.row);

    if (reason === null) {
      return;
    }

    this.config.showFeedback(REFUSAL_MESSAGES[reason]);
    this.config.onRefused({ col: cell.col, row: cell.row, reason });
  }

  /** Starts one timed dig at the (already validated) target cell. */
  performDig(target: { x: number; y: number }): boolean {
    const { scene, registry } = this.config;
    const cell = registry.resolveCell(target.x, target.y);
    const started = performWorldAction({
      scene,
      x: target.x,
      y: target.y,
      label: 'Digging…',
      durationMs: DIG_ACTION_DURATION_MS,
      cancellable: true,
      onComplete: () => this.resolveDig(cell.col, cell.row),
    });

    if (started) {
      sfxDig();
      playActionAnimation({
        scene,
        x: target.x,
        y: target.y,
        kind: 'dig',
        icon: 'proc-icon-excavation-spade',
        durationMs: DIG_ACTION_DURATION_MS,
      });
    }

    return started;
  }

  private resolveDig(col: number, row: number): void {
    const { registry, caches, scene } = this.config;
    const resolution = registry.dig(col, row);

    if (resolution.result === 'refused') {
      // The cell became ineligible mid-action (defensive; the global
      // action mutex makes this effectively unreachable).
      this.config.showFeedback(REFUSAL_MESSAGES[resolution.reason]);
      this.config.onRefused({ col, row, reason: resolution.reason });

      return;
    }

    const center = registry.cellCenter(col, row);

    // Persistent, visible terrain change on EVERY valid dig.
    this.config.onCellDug(col, row);
    burstParticles(scene, center.x, center.y, {
      colors: [0x8a7f6a, 0x5c5546, 0xcfd8df],
      seed: col * 31 + row,
      count: 10,
    });

    if (resolution.result === 'empty') {
      this.config.showFeedback('The excavation is empty at this spot.');

      const record: DigRecord = {
        col,
        row,
        zone_id: resolution.zone_id,
        outcome: 'empty',
        object_id: null,
        item_id: null,
      };

      this.lastRecord = record;
      this.config.onResolved(record);

      return;
    }

    const { object } = resolution;
    const item = getGameItem(object.item_id);

    if (addInventoryItem(object.item_id)) {
      registry.markUnearthed(object.object_id);
      sfxPickup();
      showFloatingText(scene, center.x, center.y, `+ ${item.label}`);

      const record: DigRecord = {
        col,
        row,
        zone_id: resolution.zone_id,
        outcome: 'recovered',
        object_id: object.object_id,
        item_id: object.item_id,
      };

      this.lastRecord = record;
      this.config.onResolved(record);

      return;
    }

    // Inventory full: the result is preserved as a recoverable cache at
    // the excavation (item conservation, never destruction).
    registry.markUnearthed(object.object_id);
    caches.create(object.item_id, center.x, center.y);
    this.config.showFeedback(
      `Belt full — the ${item.label} is cached beside the excavation. Make room, then collect it with SPACE/E.`,
    );

    const record: DigRecord = {
      col,
      row,
      zone_id: resolution.zone_id,
      outcome: 'cached',
      object_id: object.object_id,
      item_id: object.item_id,
    };

    this.lastRecord = record;
    this.config.onResolved(record);
  }
}
