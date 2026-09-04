/**
 * Pilot opening (skippable) — professional pilot route, Unit 2; rebuilt
 * by the V4 visual-validity redesign (mission §18).
 *
 * An in-engine establishing shot of the outpost in the storm's aftermath:
 * the station modules, the coolant tower, the damaged mast and the
 * landing pad composed from the route's own textures at the integer world
 * scale, a slow deterministic push-in of the camera, three short captions,
 * then control passes to the Dock. Any key or click skips. Under reduced
 * motion the shot is static and the captions hold for the same total time.
 *
 * Modal over the paused Dock; skipping or finishing changes NO measurement
 * entry state (the Dock's control tutorial starts identically either way).
 * Logs `pilot_opening_*` (unmapped route telemetry) through the Dock host.
 */
import Phaser from 'phaser';

import { key } from '../../constants';
import { prefersReducedMotion } from '../../inventory/ui/theme';
import { DOCK_PAD_TILESET_KEY } from '../../world/StationMapBuilder';
import {
  DESIGN_HEIGHT,
  DESIGN_SCALE,
  DESIGN_WIDTH,
  fitOverlayScene,
  WORLD_ZOOM,
} from '../../world/viewport';

/**
 * Art scale inside the design space that lands on the integer world zoom
 * on the canvas (design 1.2 × 1.667 = 2.0): pixel art stays pixel-exact.
 */
const ART_SCALE = WORLD_ZOOM / DESIGN_SCALE;

interface OpeningLaunchData {
  resumeKey: string;
  onDone?: (outcome: 'completed' | 'skipped') => void;
}

const CAPTIONS = [
  'Relief flight 7 — outpost approach. Overnight electromagnetic storm.',
  'Station on emergency power. Records disordered, coolant line damaged.',
  'You are the relief operations specialist. Control passes to you at the dock.',
] as const;

/** 3 × 2600 ms + hand-over = 8.2 s (mission §18: 6–12 s). */
const CAPTION_MS = 2600;
const HANDOVER_MS = 400;

/** Establishing shot is wider than the design space; the camera pans it. */
// Wide enough to cover the whole canvas at both ends of the push-in
// (design x −133…933 plus the ±150 px pan).
const SHOT_WIDTH = 1480;
const SHOT_LEFT = (DESIGN_WIDTH - SHOT_WIDTH) / 2;
const HORIZON_Y = 372;

declare global {
  interface Window {
    /** DEV-only, read-only opening probe. */
    __pilotOpeningProbe?: {
      open: boolean;
      caption_index: number;
      outcome: 'completed' | 'skipped' | null;
    } | null;
  }
}

export class PilotOpeningScene extends Phaser.Scene {
  private resumeKey: string = key.scene.dock;
  private onDone: OpeningLaunchData['onDone'];
  private finished = false;
  private captionIndex = 0;
  private captionText!: Phaser.GameObjects.Text;
  private timers: Phaser.Time.TimerEvent[] = [];

  constructor() {
    super(key.scene.pilotOpening);
  }

  init(data?: Partial<OpeningLaunchData>) {
    this.resumeKey = data?.resumeKey ?? key.scene.dock;
    this.onDone = data?.onDone;
    this.finished = false;
    this.captionIndex = 0;
    this.timers = [];
  }

  create() {
    this.scene.bringToTop();
    fitOverlayScene(this);

    const reduced = prefersReducedMotion();

    // The shot lives in one container so the push-in moves the picture,
    // not the camera (captions and the skip line stay fixed on screen).
    const firstShotIndex = this.children.list.length;

    this.buildShot();

    const shot = this.add.container(
      0,
      0,
      this.children.list.slice(
        firstShotIndex,
      ) as Phaser.GameObjects.GameObject[],
    );

    // Captions and the skip affordance are fixed on screen (HUD-style):
    // they do not pan with the shot.
    this.captionText = this.add
      .text(DESIGN_WIDTH / 2, 470, CAPTIONS[0], {
        color: '#dfe9f1',
        font: '16px monospace',
        backgroundColor: '#101820',
        padding: { x: 16, y: 10 },
        wordWrap: { width: 620 },
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5)
      .setDepth(50);
    this.add
      .text(DESIGN_WIDTH / 2, 556, 'Press any key or click to skip', {
        color: '#9fb2c1',
        font: '13px monospace',
        backgroundColor: '#101820',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(50);

    // The push-in: a slow, bounded pan of the picture from the pad edge
    // toward the station (deterministic; no shake, no zoom change).
    // Reduced motion holds the framed composition instead.
    if (!reduced) {
      shot.setX(150);
      this.tweens.add({
        targets: shot,
        x: -110,
        duration: CAPTION_MS * CAPTIONS.length,
        ease: 'Sine.easeInOut',
      });
    } else {
      shot.setX(-20);
    }

    for (let i = 1; i < CAPTIONS.length; i += 1) {
      this.timers.push(
        this.time.delayedCall(CAPTION_MS * i, () => {
          this.captionIndex = i;
          this.captionText.setText(CAPTIONS[i]);
          this.refreshProbe(null);
        }),
      );
    }

    this.timers.push(
      this.time.delayedCall(CAPTION_MS * CAPTIONS.length + HANDOVER_MS, () =>
        this.finish('completed'),
      ),
    );

    const skip = () => this.finish('skipped');

    this.input.keyboard!.once('keydown', skip);
    this.input.once('pointerdown', skip);

    this.refreshProbe(null);
  }

  /**
   * The establishing shot: night sky, a ridge line, the outpost complex
   * (station modules, coolant tower, damaged mast, windows on emergency
   * amber), the landing pad in the foreground and static storm evidence
   * (drifts, debris, frozen streaks). Every texture is drawn at the integer
   * world scale; fallbacks are flat shapes when a texture is absent.
   */
  private buildShot() {
    const left = SHOT_LEFT;
    const right = SHOT_LEFT + SHOT_WIDTH;
    const midX = DESIGN_WIDTH / 2 + 40;

    // Sky: a fine-stepped night gradient (top → horizon).
    const sky = [
      0x05080d, 0x060a10, 0x070c13, 0x080e16, 0x0a1119, 0x0c131d, 0x0e1620,
      0x101a26,
    ];

    sky.forEach((color, index) => {
      const bandTop = (HORIZON_Y / sky.length) * index;

      this.add
        .rectangle(
          left,
          bandTop - 40,
          SHOT_WIDTH,
          HORIZON_Y / sky.length + 41,
          color,
          1,
        )
        .setOrigin(0);
    });

    // Distant ridge.
    const ridge: number[] = [];
    const ridgeSeed = [0, 34, 22, 58, 40, 76, 52, 90, 66, 48, 80, 38, 60, 26];

    for (let i = 0; i < ridgeSeed.length; i += 1) {
      const x = left + (SHOT_WIDTH * i) / (ridgeSeed.length - 1);

      ridge.push(x, HORIZON_Y - 18 - ridgeSeed[i]);
    }

    ridge.push(right, HORIZON_Y + 4, left, HORIZON_Y + 4);
    this.add.polygon(0, 0, ridge, 0x131c28, 1).setOrigin(0);

    // Snow plain.
    this.add
      .rectangle(
        left,
        HORIZON_Y,
        SHOT_WIDTH,
        DESIGN_HEIGHT - HORIZON_Y + 60,
        0x1b2532,
        1,
      )
      .setOrigin(0);
    this.add
      .rectangle(left, HORIZON_Y, SHOT_WIDTH, 3, 0x2b3847, 1)
      .setOrigin(0);

    // Outpost complex on the plain's far edge.
    const baseY = HORIZON_Y + 6;
    const moduleXs = [midX - 250, midX - 60, midX + 130];

    for (const x of moduleXs) {
      this.placeAt(x, baseY, 'proc-station-module', {
        width: 192,
        height: 120,
        color: 0x1f2a38,
      });
    }

    this.placeAt(
      midX + 246,
      baseY - 4,
      'plv1-utility-tower',
      { width: 106, height: 132, color: 0x24303f },
      0x6f8296,
    );

    // Damaged mast (held antenna frame 0 = storm-damaged silhouette).
    if (this.textures.exists('plv1-antenna-signal')) {
      this.add
        .image(midX - 340, baseY - 8, 'plv1-antenna-signal', 0)
        .setOrigin(0.5, 1)
        .setScale(ART_SCALE)
        .setTint(0x8a96a5);
    } else {
      this.add
        .rectangle(midX - 340, baseY - 8, 8, 150, 0x2b3a4a, 1)
        .setOrigin(0.5, 1);
    }

    // Landing pad in the foreground: the dock pad tileset's full-pad
    // tile (frame 12 = every corner "pad") at the world scale, six by two
    // tiles, with static amber corner lights.
    const padY = HORIZON_Y + 118;
    const padTile = 32 * ART_SCALE;

    if (this.textures.exists(DOCK_PAD_TILESET_KEY)) {
      for (let column = 0; column < 7; column += 1) {
        for (let row = 0; row < 2; row += 1) {
          this.add
            .image(
              midX - 20 + (column - 3) * padTile,
              padY + (row - 0.5) * padTile,
              DOCK_PAD_TILESET_KEY,
              12,
            )
            .setScale(ART_SCALE)
            .setTint(0x7c8ea3);
        }
      }
    } else {
      this.add
        .rectangle(midX - 20, padY, 7 * padTile, 2 * padTile, 0x222d3b, 1)
        .setStrokeStyle(2, 0x334252);
    }

    for (const dx of [-3.4 * padTile, 3.4 * padTile]) {
      for (const dy of [-0.9 * padTile, 0.9 * padTile]) {
        this.add.rectangle(midX - 20 + dx, padY + dy, 6, 6, 0x9a7a3a, 0.9);
      }
    }

    // Storm aftermath: drifts against the modules and the tower, debris
    // pieces, frozen wind streaks on the plain — all static.
    for (const [x, w] of [
      [midX - 330, 120],
      [midX - 140, 90],
      [midX + 60, 140],
      [midX + 300, 110],
    ] as const) {
      this.add.ellipse(x, baseY + 6, w, 22, 0x2c3a4a, 1).setOrigin(0.5, 1);
    }

    for (const [x, y, w] of [
      [midX - 420, padY + 60, 26],
      [midX + 250, padY + 30, 18],
      [midX - 110, padY + 84, 22],
    ] as const) {
      this.add.rectangle(x, y, w, 6, 0x33414f, 1);
    }

    // Wind-scoured drift lines on the plain: four long, faint, horizontal
    // ridges (terrain, never falling snow).
    for (const [x, y, w] of [
      [midX - 380, padY + 96, 220],
      [midX + 320, padY + 70, 180],
      [midX - 60, padY + 112, 260],
      [midX + 120, HORIZON_Y + 62, 200],
    ] as const) {
      this.add.rectangle(x, y, w, 3, 0x26323f, 1);
    }
  }

  /** Draws a texture at the world scale, or a flat block if it is absent. */
  private placeAt(
    x: number,
    footY: number,
    textureKey: string,
    fallback: { width: number; height: number; color: number },
    tint?: number,
  ) {
    if (this.textures.exists(textureKey)) {
      const image = this.add
        .image(x, footY, textureKey)
        .setOrigin(0.5, 1)
        .setScale(ART_SCALE);

      if (tint !== undefined) {
        image.setTint(tint);
      }

      return;
    }

    this.add
      .rectangle(x, footY, fallback.width, fallback.height, fallback.color, 1)
      .setOrigin(0.5, 1)
      .setStrokeStyle(1, 0x2e3e4e);
  }

  private finish(outcome: 'completed' | 'skipped') {
    if (this.finished) {
      return;
    }

    this.finished = true;

    for (const timer of this.timers) {
      timer.remove(false);
    }

    this.refreshProbe(outcome);
    this.onDone?.(outcome);
    this.scene.resume(this.resumeKey);
    this.scene.stop();
  }

  private refreshProbe(outcome: 'completed' | 'skipped' | null) {
    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      window.__pilotOpeningProbe = {
        open: outcome === null,
        caption_index: this.captionIndex,
        outcome,
      };
    }
  }
}
