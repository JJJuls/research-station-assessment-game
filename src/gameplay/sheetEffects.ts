/**
 * One-shot sheet effects (pilot Unit 6; presentation only).
 *
 * Plays a PROVISIONAL MODEL-SELECTED PixelLab effect sheet (7 frames of
 * 64×64, loaded in Boot as a spritesheet) once at a world position and
 * destroys the sprite on completion. Pure presentation: no event, no
 * gating, identical playback for every participant. Safe no-op when the
 * texture is not loaded (fallback skins keep working).
 */
import type Phaser from 'phaser';

import { Depth } from '../constants';

export const EFFECT_SHEET_FRAME_COUNT = 7;

export function playSheetEffect(
  scene: Phaser.Scene,
  textureKey: string,
  x: number,
  y: number,
  options?: { frameRate?: number; depth?: number },
): void {
  if (!scene.textures.exists(textureKey)) {
    return;
  }

  const animKey = `fx_${textureKey}`;

  if (!scene.anims.exists(animKey)) {
    scene.anims.create({
      key: animKey,
      frames: scene.anims.generateFrameNumbers(textureKey, {
        start: 0,
        end: EFFECT_SHEET_FRAME_COUNT - 1,
      }),
      frameRate: options?.frameRate ?? 14,
      repeat: 0,
    });
  }

  const sprite = scene.add
    .sprite(x, y, textureKey, 0)
    .setDepth(options?.depth ?? Depth.AboveWorld - 1);

  sprite.play(animKey);
  sprite.once('animationcomplete', () => sprite.destroy());
}
