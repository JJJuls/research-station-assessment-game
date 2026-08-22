/**
 * Recoverable field caches (field-actions foundation).
 *
 * Item-conservation safety net: when a recovered object cannot enter
 * the transactional inventory (belt full), the item is NEVER destroyed —
 * it materialises as a visible, recoverable cache at the recovery spot
 * (excavation cell or rig collection tray). SPACE/E beside a cache
 * retries the same all-or-nothing inventory transaction; a refused
 * retry leaves the cache untouched with clear neutral feedback.
 *
 * Visuals are scene-lifetime presentation; the hosting scene owns
 * telemetry for cache creation/recovery (generic secondary family).
 */

import Phaser from 'phaser';

import { Depth } from '../constants';
import { addInventoryItem } from '../gameplay/inventory';
import { getGameItem } from '../gameplay/items';

export interface FieldCacheEntry {
  cache_id: string;
  item_id: string;
  x: number;
  y: number;
}

export type FieldCacheCollectResult =
  | { result: 'collected'; entry: FieldCacheEntry }
  | { result: 'belt_full'; entry: FieldCacheEntry }
  | { result: 'none_in_reach' };

const CACHE_REACH_PX = 56;

interface CacheVisual {
  parts: Phaser.GameObjects.GameObject[];
}

export class FieldCacheManager {
  private readonly scene: Phaser.Scene;
  private readonly entries = new Map<string, FieldCacheEntry>();
  private readonly visuals = new Map<string, CacheVisual>();
  private cacheCounter = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Creates one cache holding one item at a world position. */
  create(itemId: string, x: number, y: number): FieldCacheEntry {
    const item = getGameItem(itemId);

    this.cacheCounter += 1;

    const entry: FieldCacheEntry = {
      cache_id: `field_cache_${this.cacheCounter}`,
      item_id: itemId,
      x,
      y,
    };

    this.entries.set(entry.cache_id, entry);

    const parts: Phaser.GameObjects.GameObject[] = [];
    const base = this.scene.add
      .rectangle(x, y, 26, 18, 0x2b3a4a, 1)
      .setStrokeStyle(1, 0x5fd3c4, 0.9)
      .setDepth(1);

    parts.push(base);

    if (this.scene.textures.exists(item.icon)) {
      parts.push(this.scene.add.image(x, y - 10, item.icon).setDepth(1.1));
    }

    // Label sits BELOW the cache so it never collides with station
    // name chips / interact prompts anchored above nearby fixtures.
    const label = this.scene.add
      .text(x, y + 24, `Field cache — ${item.label}`, {
        backgroundColor: '#101820',
        color: '#dce7f0',
        font: '11px monospace',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(Depth.AboveWorld - 2);

    parts.push(label);
    this.visuals.set(entry.cache_id, { parts });

    return entry;
  }

  count(): number {
    return this.entries.size;
  }

  /** Serialised cache list (DEV probe / tests). */
  serialize(): FieldCacheEntry[] {
    return [...this.entries.values()].map((entry) => ({ ...entry }));
  }

  /**
   * Attempts to collect the nearest cache in reach through the same
   * transactional inventory command every acquisition path uses.
   */
  tryCollectNearest(x: number, y: number): FieldCacheCollectResult {
    let nearest: FieldCacheEntry | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const entry of this.entries.values()) {
      const distance = Math.hypot(entry.x - x, entry.y - y);

      if (distance <= CACHE_REACH_PX && distance < nearestDistance) {
        nearest = entry;
        nearestDistance = distance;
      }
    }

    if (nearest === null) {
      return { result: 'none_in_reach' };
    }

    if (!addInventoryItem(nearest.item_id)) {
      return { result: 'belt_full', entry: nearest };
    }

    this.entries.delete(nearest.cache_id);

    const visual = this.visuals.get(nearest.cache_id);

    if (visual !== undefined) {
      for (const part of visual.parts) {
        part.destroy();
      }

      this.visuals.delete(nearest.cache_id);
    }

    return { result: 'collected', entry: nearest };
  }
}
