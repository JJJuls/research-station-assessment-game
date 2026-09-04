/**
 * Visual effect kit (Stardew-quality pass, Unit C).
 *
 * Small, restrained world effects: scan rings, particle bursts, sparkles,
 * a camera kick, and ambient snowfall. All of it is pure presentation —
 * no effect logs an event, gates input beyond the frames it plays, or
 * varies task difficulty. Any pseudo-randomness comes from mulberry32
 * with FIXED seeds, so every participant sees identical effect geometry
 * (frozen-stimuli rule); only the moment of triggering follows the
 * player's own actions.
 */

import Phaser from 'phaser';

import { Depth } from '../constants';

/** Deterministic PRNG (mulberry32) — fixed seeds only. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;

  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Expanding scan rings: `rings` circles that grow and fade in sequence.
 */
export function ringPulse(
  scene: Phaser.Scene,
  x: number,
  y: number,
  options?: {
    color?: number;
    endRadius?: number;
    rings?: number;
    durationMs?: number;
  },
) {
  const color = options?.color ?? 0x5fd3c4;
  const endRadius = options?.endRadius ?? 52;
  const rings = options?.rings ?? 3;
  const durationMs = options?.durationMs ?? 550;

  for (let ring = 0; ring < rings; ring++) {
    const circle = scene.add
      .circle(x, y, 6)
      .setStrokeStyle(2, color, 0.9)
      .setFillStyle(0, 0)
      .setDepth(Depth.AboveWorld - 1);

    scene.tweens.add({
      targets: circle,
      radius: endRadius,
      alpha: 0,
      delay: ring * (durationMs / 3),
      duration: durationMs,
      ease: 'Cubic.easeOut',
      onComplete: () => circle.destroy(),
    });
  }
}

/**
 * Debris/spray burst: small squares thrown outward with a gravity arc
 * (dig spoil, spark showers, snow kicks). Geometry is a pure function of
 * `seed`.
 */
export function burstParticles(
  scene: Phaser.Scene,
  x: number,
  y: number,
  options: {
    colors: number[];
    seed: number;
    count?: number;
    speed?: number;
    sizeMin?: number;
    sizeMax?: number;
  },
) {
  const rand = mulberry32(options.seed);
  const count = options.count ?? 10;
  const speed = options.speed ?? 60;

  for (let i = 0; i < count; i++) {
    const angle = -Math.PI * (0.15 + 0.7 * rand());
    const velocity = speed * (0.6 + 0.8 * rand());
    const size =
      (options.sizeMin ?? 2) +
      Math.floor(
        rand() * ((options.sizeMax ?? 4) - (options.sizeMin ?? 2) + 1),
      );
    const color = options.colors[Math.floor(rand() * options.colors.length)];
    const chunk = scene.add
      .rectangle(x, y, size, size, color, 1)
      .setDepth(Depth.AboveWorld - 1);
    const dx = Math.cos(angle) * velocity * (rand() > 0.5 ? 1 : -1);
    const dy = Math.sin(angle) * velocity;

    scene.tweens.add({
      targets: chunk,
      x: x + dx,
      y: y + dy + 34,
      alpha: 0,
      angle: (rand() - 0.5) * 180,
      duration: 520 + rand() * 260,
      ease: 'Cubic.easeOut',
      onComplete: () => chunk.destroy(),
    });
  }
}

/** Small pickup sparkle: four glints rising from a point. */
export function sparkle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color = 0xe8f2fa,
) {
  for (let i = 0; i < 4; i++) {
    const glint = scene.add
      .rectangle(x + (i - 1.5) * 7, y + 4, 2, 2, color, 1)
      .setDepth(Depth.AboveWorld - 1);

    scene.tweens.add({
      targets: glint,
      y: y - 18 - i * 4,
      alpha: 0,
      delay: i * 60,
      duration: 480,
      ease: 'Sine.easeOut',
      onComplete: () => glint.destroy(),
    });
  }
}

/** Honour the OS reduced-motion preference for camera/particle effects. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Camera kick for physical impacts — RETIRED by the V4 visual-validity
 * redesign (mission §9: no camera shake during the assessment). Kept as a
 * no-op so call sites and their timing are byte-identical; the impact is
 * still shown by the state-driven dust/spark bursts.
 */
export function cameraKick(scene: Phaser.Scene, intensity = 0.0035) {
  void scene;
  void intensity;
}

/**
 * Ambient snowfall: `count` flakes drifting down-left on looping tweens.
 * Flake starting positions, sizes and speeds are a pure function of the
 * fixed seed — identical weather for every participant, and pure
 * ambience (never obstructs, never highlights anything).
 */
export function snowfall(
  scene: Phaser.Scene,
  options: { width: number; height: number; seed: number; count?: number },
) {
  const rand = mulberry32(options.seed);
  // Reduced motion: a sparse, calmer drift instead of the full weather.
  const count = Math.round(
    (options.count ?? 34) * (prefersReducedMotion() ? 0.25 : 1),
  );

  for (let i = 0; i < count; i++) {
    const size = rand() > 0.7 ? 3 : 2;
    const startX = rand() * options.width;
    const startY = rand() * options.height;
    const fallDuration = 7000 + rand() * 6000;
    const drift = 60 + rand() * 90;
    const flake = scene.add
      .rectangle(startX, startY, size, size, 0xffffff, 0.5 + rand() * 0.35)
      .setDepth(Depth.AboveWorld - 2);

    scene.tweens.add({
      targets: flake,
      y: startY + options.height,
      x: startX - drift,
      duration: fallDuration,
      repeat: -1,
      onRepeat: () => {
        flake.setPosition(startX, startY - options.height * rand());
      },
    });
  }
}

/**
 * Held-tool bubble: shows the tool icon above a sprite for the duration
 * of a timed world action (visible "using the tool" feedback).
 */
export function showHeldTool(
  scene: Phaser.Scene,
  target: { x: number; y: number },
  iconKey: string,
  durationMs: number,
) {
  if (!scene.textures.exists(iconKey)) {
    return;
  }

  const icon = scene.add
    .image(target.x + 16, target.y - 34, iconKey)
    .setDepth(Depth.AboveWorld - 1);

  scene.tweens.add({
    targets: icon,
    y: icon.y - 4,
    duration: 300,
    repeat: Math.max(0, Math.floor(durationMs / 600) - 1),
    yoyo: true,
    ease: 'Sine.easeInOut',
  });
  scene.time.delayedCall(durationMs, () => icon.destroy());
}
