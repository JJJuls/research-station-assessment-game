/**
 * NPC actor presentation (overnight playable prototype, Unit 1).
 *
 * A visible station character: distinct sprite, drop shadow, gentle idle
 * bob, and a name chip that appears only in interaction proximity
 * (contextual labelling — no permanent banners). Interaction itself goes
 * through the room's existing station mechanics; this class is pure
 * presentation and never logs events.
 */

import Phaser from 'phaser';

import { Depth, worldDepth } from '../constants';

export interface NpcActorConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  /** proc-npc-* / proc-bot-* texture key. */
  texture: string;
  /** In-fiction display name shown on proximity (e.g. "Engineer Kai"). */
  name: string;
  /** Disable the idle bob (e.g. seated/console-mounted figures). */
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
  private nameChipParts: Phaser.GameObjects.GameObject[];
  private nameVisible = false;
  private workTimer: Phaser.Time.TimerEvent | null = null;

  constructor(config: NpcActorConfig) {
    const { scene, x, y, texture, name } = config;

    // Drop shadow (Player.ts shadow language: ellipse under the feet).
    scene.add.ellipse(x, y + 24, 26, 9, 0x000000, 0.25).setDepth(-0.25);

    this.sprite = scene.add
      .image(x, y, texture)
      // Unit 7: y-sorted world depth at the foot line (presentation only).
      .setDepth(worldDepth(y + 24));

    if (config.still !== true) {
      scene.tweens.add({
        targets: this.sprite,
        y: y - 2,
        duration: 1300,
        repeat: -1,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
    }

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

    // Name chip (buildLabelChip language), hidden until proximity.
    const label = scene.add
      .text(x, y - 44, name, {
        // Guaranteed-contrast chip (defect fix: name read dark-on-dark
        // over some interiors when the plate behind it was occluded).
        backgroundColor: '#101820',
        color: '#dce7f0',
        font: '12px monospace',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5);
    const chip = scene.add
      .rectangle(
        x,
        y - 44,
        Math.ceil(label.width),
        Math.ceil(label.height),
        0x101820,
        0.92,
      )
      .setStrokeStyle(1, 0x33475a);

    // The chip reads above every world sprite (Unit 7 depth sort).
    chip.setDepth(Depth.AbovePlayer);
    label.setDepth(Depth.AbovePlayer);
    this.nameChipParts = [chip, label];

    // Force-hide the freshly created parts (the state-guarded setter
    // below would no-op on the initial `false`, leaving them visible).
    for (const part of this.nameChipParts) {
      (part as Phaser.GameObjects.Rectangle).setVisible(false);
    }
  }

  /** Unit 7: ends the two-frame work cycle (e.g. a finished pose). */
  stopWorkLoop() {
    this.workTimer?.remove(false);
    this.workTimer = null;
  }

  setNameVisible(visible: boolean) {
    if (this.nameVisible === visible) {
      return;
    }

    this.nameVisible = visible;

    for (const part of this.nameChipParts) {
      (part as Phaser.GameObjects.Rectangle).setVisible(visible);
    }
  }
}
