/**
 * Action-animation kit (physical-mechanics session, Unit 6).
 *
 * Multi-frame, visibly enacted tool animations for the timed world
 * actions: the equipped tool renders beside the acting sprite and MOVES
 * through the action (a swing arc for digging, a sweeping scan head, an
 * oscillating driver for install/repair work), with small deterministic
 * accents on a fixed cadence. Everything here is pure presentation — no
 * event, no gating, no difficulty, identical geometry for every
 * participant (fixed tween values; accents on fixed timers).
 */

import type Phaser from 'phaser';

import { Depth } from '../constants';
import { burstParticles } from './effects';

export type ActionAnimationKind = 'scan' | 'dig' | 'work' | 'file';

interface ActionAnimationConfig {
  scene: Phaser.Scene;
  /** World position the action happens at. */
  x: number;
  y: number;
  kind: ActionAnimationKind;
  /** Tool icon texture (proc-icon-*); skipped when missing. */
  icon: string;
  durationMs: number;
}

/**
 * Plays one action animation for the duration. Self-cleaning; safe on
 * scene shutdown (tweens/timers die with the scene).
 */
export function playActionAnimation(config: ActionAnimationConfig) {
  const { scene, x, y, kind, icon, durationMs } = config;

  if (!scene.textures.exists(icon)) {
    return;
  }

  const tool = scene.add
    .image(x + 14, y - 26, icon)
    .setDepth(Depth.AboveWorld - 1);

  switch (kind) {
    case 'dig': {
      // Swing arc: raised → driven down, repeating (visible digging).
      tool.setOrigin(0.2, 0.9);
      scene.tweens.add({
        targets: tool,
        angle: { from: -46, to: 38 },
        duration: 340,
        repeat: Math.max(0, Math.floor(durationMs / 680) * 2 - 1),
        yoyo: true,
        ease: 'Quad.easeIn',
      });

      // Snow kicks on the down-strokes (fixed cadence, fixed seeds).
      const strikes = Math.max(1, Math.floor(durationMs / 680));

      for (let strike = 0; strike < strikes; strike++) {
        scene.time.delayedCall(340 + strike * 680, () => {
          burstParticles(scene, x + 6, y + 6, {
            colors: [0xdde9f2, 0xaebfd0],
            seed: 77 + strike,
            count: 5,
            speed: 34,
            sizeMin: 2,
            sizeMax: 3,
          });
        });
      }

      break;
    }

    case 'scan': {
      // Sweeping scan head with a soft pulse each pass.
      tool.setOrigin(0.5, 1);
      scene.tweens.add({
        targets: tool,
        angle: { from: -24, to: 24 },
        duration: 460,
        repeat: Math.max(0, Math.floor(durationMs / 920) * 2 - 1),
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
      break;
    }

    case 'work': {
      // Driver/spanner oscillation (seating, torquing, aligning).
      tool.setOrigin(0.5, 0.8);
      scene.tweens.add({
        targets: tool,
        angle: { from: -14, to: 14 },
        duration: 150,
        repeat: Math.max(0, Math.floor(durationMs / 300) * 2 - 1),
        yoyo: true,
        ease: 'Quad.easeInOut',
      });
      break;
    }

    case 'file':
    default: {
      // Gentle handling bob (logging, filing, casing).
      scene.tweens.add({
        targets: tool,
        y: tool.y - 5,
        duration: 300,
        repeat: Math.max(0, Math.floor(durationMs / 600) - 1),
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
      break;
    }
  }

  scene.time.delayedCall(durationMs, () => tool.destroy());
}
