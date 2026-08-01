/**
 * Physical action framework (overnight playable prototype, Unit 1).
 *
 * Reusable timed world actions — scan, dig, collect, install, repair,
 * deliver — that visibly occur at a world position: a labelled progress
 * bar fills over the action's duration, the player holds still (RoomScene
 * freezes movement while an action runs), and the result applies on
 * completion. One action at a time.
 *
 * Purely presentational timing: durations are game-feel constants, never
 * measurement windows; nothing here logs events (the hosting scene logs
 * its own telemetry at start/completion as appropriate).
 */

import Phaser from 'phaser';

import { Depth } from '../constants';

const BAR_WIDTH = 120;
const BAR_HEIGHT = 10;

interface WorldActionConfig {
  scene: Phaser.Scene;
  /** World position the action happens at (bar renders above it). */
  x: number;
  y: number;
  /** Short in-fiction verb phrase, e.g. "Scanning...". */
  label: string;
  durationMs: number;
  onComplete: () => void;
}

let actionActive = false;

/** True while a timed world action is running (RoomScene freezes input). */
export function isWorldActionActive(): boolean {
  return actionActive;
}

/**
 * Manual world-action bracket (Unit 7): lets a custom interaction loop
 * (the salvage tension phase) borrow the exact input isolation a timed
 * action has — avatar holds still, no prompt can open — without a
 * progress bar. Callers MUST pair begin/end (shutdown-safe callers end
 * in their scene-shutdown handler).
 */
export function beginManualWorldAction() {
  actionActive = true;
}

export function endManualWorldAction() {
  actionActive = false;
}

/**
 * Runs one timed world action. Returns false (and does nothing) when an
 * action is already running. Cleans itself up if the scene shuts down
 * mid-action (room transition safety).
 */
export function performWorldAction(config: WorldActionConfig): boolean {
  if (actionActive) {
    return false;
  }

  actionActive = true;

  const { scene, x, y, label, durationMs, onComplete } = config;
  const barX = x - BAR_WIDTH / 2;
  const barY = y - 58;

  const labelText = scene.add
    .text(x, barY - 14, label, {
      backgroundColor: '#101820',
      color: '#ffffff',
      font: '13px monospace',
      padding: { x: 6, y: 3 },
    })
    .setOrigin(0.5)
    .setDepth(Depth.AboveWorld);
  const barBack = scene.add
    .rectangle(barX, barY, BAR_WIDTH, BAR_HEIGHT, 0x101820, 1)
    .setOrigin(0)
    .setStrokeStyle(1, 0x33475a)
    .setDepth(Depth.AboveWorld);
  const barFill = scene.add
    .rectangle(barX + 2, barY + 2, 1, BAR_HEIGHT - 4, 0x5fd3c4, 1)
    .setOrigin(0)
    .setDepth(Depth.AboveWorld);

  let finished = false;

  const cleanup = () => {
    actionActive = false;
    labelText.destroy();
    barBack.destroy();
    barFill.destroy();
  };

  const onShutdown = () => {
    if (!finished) {
      finished = true;
      cleanup();
    }
  };

  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, onShutdown);

  scene.tweens.add({
    targets: barFill,
    width: BAR_WIDTH - 4,
    duration: durationMs,
    ease: 'Linear',
    onComplete: () => {
      if (finished) {
        return;
      }

      finished = true;
      scene.events.off(Phaser.Scenes.Events.SHUTDOWN, onShutdown);
      cleanup();
      onComplete();
    },
  });

  return true;
}

/**
 * Rising, fading feedback text at a world position ("+ Core Sample",
 * "Installed"). Pure presentation; destroys itself.
 */
export function showFloatingText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
) {
  const floating = scene.add
    .text(x, y - 30, text, {
      color: '#5fd3c4',
      font: 'bold 14px monospace',
      stroke: '#101820',
      strokeThickness: 3,
    })
    .setOrigin(0.5)
    .setDepth(Depth.AboveWorld);

  scene.tweens.add({
    targets: floating,
    y: y - 66,
    alpha: 0,
    duration: 1400,
    ease: 'Cubic.easeOut',
    onComplete: () => floating.destroy(),
  });
}

/** Test-only escape hatch: clears a stuck action flag between specs. */
export function resetWorldActionState() {
  actionActive = false;
}
