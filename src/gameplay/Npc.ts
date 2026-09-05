/**
 * NPC actor presentation (overnight playable prototype, Unit 1; World V1).
 *
 * A visible station character: distinct sprite, drop shadow and an
 * optional two-frame work cycle. Interaction itself goes through the
 * room's existing station mechanics; this class is pure presentation and
 * never logs events. World V1 (PROFESSIONAL-WORLD-DESIGN-V1 §10): no
 * perpetual idle bob (animation only with a state reason) and no name
 * chip — the contextual prompt carries the name (`E — Talk to Vale`).
 */

import Phaser from 'phaser';

import { worldDepth } from '../constants';

export interface NpcActorConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  /** proc-npc-* / plv1-* texture key. */
  texture: string;
  /** In-fiction display name (kept for probes; no chip is drawn). */
  name: string;
  /** Kept for call-site compatibility (no idle bob exists any more). */
  still?: boolean;
  /**
   * Two-frame work cycle (Unit 6): when both textures exist and the
   * actor's base texture is frames[0], the sprite alternates between the
   * frames on a fixed cadence — a visible working loop instead of a
   * static pose. Pure presentation; identical for every participant.
   */
  workFrames?: readonly [string, string];
}

export class NpcActor {
  readonly sprite: Phaser.GameObjects.Image;
  readonly name: string;
  private nameVisible = false;
  private workTimer: Phaser.Time.TimerEvent | null = null;

  constructor(config: NpcActorConfig) {
    const { scene, x, y, texture, name } = config;

    this.name = name;

    // Drop shadow (Player.ts shadow language: ellipse under the feet).
    scene.add.ellipse(x, y + 24, 26, 9, 0x000000, 0.25).setDepth(-0.25);

    this.sprite = scene.add
      .image(x, y, texture)
      // Y-sorted world depth at the foot line (presentation only).
      .setDepth(worldDepth(y + 24));

    // Unit 6: two-frame work cycle (fixed 700 ms cadence, timer dies
    // with the scene; texture flip only — position/radius untouched).
    const frames = config.workFrames;

    if (
      frames !== undefined &&
      texture === frames[0] &&
      scene.textures.exists(frames[0]) &&
      scene.textures.exists(frames[1])
    ) {
      let flip = false;

      this.workTimer = scene.time.addEvent({
        delay: 700,
        loop: true,
        callback: () => {
          if (this.sprite.active) {
            flip = !flip;
            this.sprite.setTexture(frames[flip ? 1 : 0]);
          }
        },
      });
    }
  }

  /** Unit 7: ends the two-frame work cycle (e.g. a finished pose). */
  stopWorkLoop() {
    this.workTimer?.remove(false);
    this.workTimer = null;
  }

  /** Kept for call-site compatibility: the prompt carries the name now. */
  setNameVisible(visible: boolean) {
    this.nameVisible = visible;
  }

  isNameVisible(): boolean {
    return this.nameVisible;
  }
}
