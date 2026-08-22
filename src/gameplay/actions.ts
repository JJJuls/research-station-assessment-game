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
  /**
   * ESC (or a scene-driven cancel) may abort the action mid-run: the bar
   * disappears, onComplete never fires, onCancel (if given) runs, and the
   * player is immediately free — never frozen (Unit 1, action rebuild).
   */
  cancellable?: boolean;
  onCancel?: () => void;
}

let actionActive = false;
/** Cancel hook of the currently running cancellable action (or null). */
let activeCancelHook: (() => void) | null = null;

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
 *
 * Field-actions foundation: an optional onCancel joins the manual
 * bracket to RoomScene's existing ESC convention (cancel-first,
 * menu-second) exactly like a cancellable timed action. Re-calling
 * beginManualWorldAction with no argument clears the hook while the
 * bracket stays held (a running cycle passing its point of no return).
 * Existing callers pass nothing and keep their behaviour unchanged.
 */
export function beginManualWorldAction(onCancel?: () => void) {
  actionActive = true;
  activeCancelHook = onCancel ?? null;
}

export function endManualWorldAction() {
  actionActive = false;
  activeCancelHook = null;
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

  const { scene, x, y, label, durationMs, onComplete, onCancel } = config;
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
    activeCancelHook = null;
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

  const tween = scene.tweens.add({
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

  if (config.cancellable === true) {
    activeCancelHook = () => {
      if (finished) {
        return;
      }

      finished = true;
      tween.remove();
      scene.events.off(Phaser.Scenes.Events.SHUTDOWN, onShutdown);
      cleanup();
      onCancel?.();
    };
  }

  return true;
}

/**
 * Aborts the running world action if (and only if) it was started with
 * `cancellable: true`. Returns true when an action was cancelled. Safe to
 * call at any time; a non-cancellable action is left untouched.
 */
export function cancelActiveWorldAction(): boolean {
  if (activeCancelHook === null) {
    return false;
  }

  const hook = activeCancelHook;

  activeCancelHook = null;
  hook();

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
  activeCancelHook = null;
}
