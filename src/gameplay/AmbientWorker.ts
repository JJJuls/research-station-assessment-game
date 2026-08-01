/**
 * Ambient station worker (Stardew-quality pass, Unit B).
 *
 * A purely decorative crew figure that walks a fixed waypoint loop at a
 * fixed speed. Deterministic by construction: waypoints, speed and the
 * loop order are hard-coded per room, every session runs the identical
 * cycle, and the figure never collides, never gates, never logs, and is
 * never an interaction target — pure set dressing that makes the station
 * feel inhabited (measurement rule: decorative idle movement must never
 * gate an opportunity or vary between participants).
 */

import Phaser from 'phaser';

export interface AmbientWorkerConfig {
  scene: Phaser.Scene;
  /** proc-worker-* texture key. */
  texture: string;
  /** Patrol loop in pixels; the worker starts at the first point. */
  waypoints: { x: number; y: number }[];
  /** Walk speed in px/s (default 40 — unhurried station pace). */
  speed?: number;
  /** Pause at each waypoint in ms (default 900). */
  pauseMs?: number;
}

export class AmbientWorker {
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly scene: Phaser.Scene;
  private readonly waypoints: { x: number; y: number }[];
  private readonly speed: number;
  private readonly pauseMs: number;
  private nextIndex = 1;

  constructor(config: AmbientWorkerConfig) {
    const { scene, texture, waypoints } = config;
    const start = waypoints[0];

    this.scene = scene;
    this.waypoints = waypoints;
    this.speed = config.speed ?? 40;
    this.pauseMs = config.pauseMs ?? 900;

    this.shadow = scene.add
      .ellipse(start.x, start.y + 24, 24, 8, 0x000000, 0.22)
      .setDepth(-0.25);
    this.sprite = scene.add.image(start.x, start.y, texture);

    // Gentle walk bob (scale, not position, so waypoint tweens own x/y).
    scene.tweens.add({
      targets: this.sprite,
      scaleY: { from: 1, to: 0.97 },
      duration: 260,
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });

    // Unit 6: stride sway — a slight alternating lean in time with the
    // bob, so patrols read as walking rather than gliding (visual only).
    scene.tweens.add({
      targets: this.sprite,
      angle: { from: -2, to: 2 },
      duration: 260,
      repeat: -1,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });

    if (waypoints.length > 1) {
      this.walkToNext();
    }
  }

  private walkToNext() {
    const target = this.waypoints[this.nextIndex];
    const distance = Phaser.Math.Distance.Between(
      this.sprite.x,
      this.sprite.y,
      target.x,
      target.y,
    );

    // Face the walk direction (horizontal flip only — single south frame).
    if (target.x !== this.sprite.x) {
      this.sprite.setFlipX(target.x < this.sprite.x);
    }

    this.scene.tweens.add({
      targets: this.sprite,
      x: target.x,
      y: target.y,
      duration: Math.max(200, (distance / this.speed) * 1000),
      ease: 'Linear',
      onUpdate: () => {
        this.shadow.setPosition(this.sprite.x, this.sprite.y + 24);
      },
      onComplete: () => {
        this.nextIndex = (this.nextIndex + 1) % this.waypoints.length;
        this.scene.time.delayedCall(this.pauseMs, () => {
          // Scene may be shutting down between rooms; tweens auto-clean.
          if (this.sprite.active) {
            this.walkToNext();
          }
        });
      },
    });
  }
}
