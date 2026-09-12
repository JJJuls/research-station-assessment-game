/**
 * Pilot opening (skippable) — World V2 rescue.
 *
 * Two authored key-art shots rendered through the same wide world plate
 * as every room (640×360 world px at 2×/3×):
 *
 *   Shot 1 (establishing): Station 080 on its snowbound plateau at cold
 *   dawn — connected modules, warm windows, Mast 04 bent, the flagged
 *   approach lane. The camera drifts across the painting toward the
 *   dock.
 *   Shot 2 (the berth): the relief shuttle on final approach at the
 *   station's docking seal, landing lights through blowing snow.
 *
 * Both shots are PixelLab key art (public/assets/world-v2/opening/,
 * provenance in the world-v2 manifest), shown at 2× with a slow drift;
 * light snowfall is layered as simple world-space flakes. Timing is
 * WALL-CLOCK: captions, the camera and the cut are functions of the raw
 * elapsed time read in update(), so the shot ends at the same wall time
 * on any machine. Any key or click skips. Skipping or finishing changes
 * NO measurement entry state: the Dock's one finish function lands both
 * in the identical state. Under reduced motion the shots are static and
 * the captions hold for the same total time. Logs `pilot_opening_*`
 * (unmapped route telemetry) through the Dock.
 */
import Phaser from 'phaser';

import { key } from '../../constants';
import { prefersReducedMotion } from '../../inventory/ui/theme';
import {
  attachWorldPlate,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  type WorldPlate,
} from '../../world/viewport';
import { OPENING_CAPTIONS } from '../storyState';

interface OpeningLaunchData {
  resumeKey: string;
  onDone?: (outcome: 'completed' | 'skipped') => void;
}

/** Total opening length (wall-clock ms). */
export const OPENING_SHOT_MS = 8600;
const HANDOVER_MS = 200;
export const OPENING_TOTAL_MS = OPENING_SHOT_MS + HANDOVER_MS;

/** The cut from the establishing shot to the berth shot. */
const CUT_MS = 5200;
/** Cross-fade length at the cut. */
const FADE_MS = 260;

/** Key art is shown at 2× (art pixels match the rooms' 2× composite). */
const ART_SCALE = 2;
/** Source key-art size (px). */
const ART_W = 688;
const ART_H = 384;

/** Snowfall: simple world-space flakes (no emitter; deterministic). */
const SNOW_COUNT = 44;

declare global {
  interface Window {
    /** DEV-only, read-only opening probe. */
    __pilotOpeningProbe?: {
      open: boolean;
      caption_index: number;
      outcome: 'completed' | 'skipped' | null;
      /** Wall-clock ms since the shot started (at the last probe write). */
      elapsed_ms: number;
      shuttle_landed: boolean;
    } | null;
  }
}

const easeInOut = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

export class PilotOpeningScene extends Phaser.Scene {
  private resumeKey: string = key.scene.dock;
  private onDone: OpeningLaunchData['onDone'];
  private finished = false;
  private captionIndex = -1;
  private captionText!: Phaser.GameObjects.Text;
  private plate!: WorldPlate;
  private shotA!: Phaser.GameObjects.Image;
  private shotB!: Phaser.GameObjects.Image;
  private snow: { rect: Phaser.GameObjects.Rectangle; speed: number }[] = [];
  private shuttleLanded = false;
  private reduced = false;
  private startedAt = 0;

  constructor() {
    super(key.scene.pilotOpening);
  }

  init(data?: Partial<OpeningLaunchData>) {
    this.resumeKey = data?.resumeKey ?? key.scene.dock;
    this.onDone = data?.onDone;
    this.finished = false;
    this.captionIndex = -1;
    this.shuttleLanded = false;
    this.snow = [];
  }

  create() {
    this.scene.bringToTop();
    // The paused Dock underneath is not drawn while the shot runs.
    this.scene.setVisible(false, this.resumeKey);

    this.reduced = prefersReducedMotion();

    // The world is the two paintings at 2×, stacked at the same origin;
    // the cut is a visibility swap (with a short fade on the plate).
    this.shotA = this.add
      .image(0, 0, 'w2-opening-station')
      .setOrigin(0)
      .setScale(ART_SCALE)
      .setDepth(0);
    this.shotB = this.add
      .image(0, 0, 'w2-opening-berth')
      .setOrigin(0)
      .setScale(ART_SCALE)
      .setDepth(0)
      .setVisible(false);
    this.shotA.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.shotB.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

    this.plate = attachWorldPlate(this, 'wide');
    this.plate.setBounds(ART_W * ART_SCALE, ART_H * ART_SCALE);
    this.plate.setClearColor(0x101820);

    // Light snowfall drifting across the frame (world space, above art).
    for (let i = 0; i < SNOW_COUNT; i += 1) {
      const size = 2 + (i % 3);
      const rect = this.add
        .rectangle(
          (i * 173) % (ART_W * ART_SCALE),
          (i * 97) % (ART_H * ART_SCALE),
          size,
          size,
          0xf0f6fb,
          0.5 + (i % 4) * 0.1,
        )
        .setDepth(5);

      this.snow.push({ rect, speed: 40 + (i % 5) * 22 });
    }

    this.buildCaptions();

    this.plate.snapScroll(0, 0);

    if (this.reduced) {
      // Static: hold the berth shot (the state the cut lands in).
      this.showShot('b');
      this.plate.snapScroll(
        (ART_W * ART_SCALE - this.plate.width) / 2,
        (ART_H * ART_SCALE - this.plate.height) / 2,
      );
    }

    const skip = () => this.finish('skipped');

    this.input.keyboard!.once('keydown', skip);
    this.input.once('pointerdown', skip);
    this.startedAt = performance.now();
    this.update();
  }

  /** Wall-clock ms since the shot started. */
  private elapsed(): number {
    return performance.now() - this.startedAt;
  }

  private showShot(which: 'a' | 'b') {
    this.shotA.setVisible(which === 'a');
    this.shotB.setVisible(which === 'b');

    if (which === 'b' && !this.shuttleLanded) {
      this.shuttleLanded = true;
    }
  }

  update(_time?: number, deltaMs = 16) {
    if (this.finished) {
      return;
    }

    const elapsed = this.elapsed();

    // Captions on the wall clock (storyboard times).
    let index = -1;

    for (let i = 0; i < OPENING_CAPTIONS.length; i += 1) {
      if (elapsed >= OPENING_CAPTIONS[i].atMs) {
        index = i;
      }
    }

    if (index !== this.captionIndex) {
      this.captionIndex = index;
      this.captionText.setText(index < 0 ? '' : OPENING_CAPTIONS[index].text);
    }

    if (!this.reduced) {
      const maxX = ART_W * ART_SCALE - this.plate.width;
      const maxY = ART_H * ART_SCALE - this.plate.height;

      if (elapsed < CUT_MS) {
        // Shot 1: drift from the bent mast (upper left) toward the dock
        // vault (lower centre-right).
        const t = easeInOut(clamp01(elapsed / CUT_MS));

        this.showShot('a');
        this.plate.snapScroll(
          maxX * (0.08 + 0.62 * t),
          maxY * (0.05 + 0.85 * t),
        );
      } else {
        // Shot 2: slow push along the dock wall toward the seal.
        const t = easeInOut(
          clamp01((elapsed - CUT_MS) / (OPENING_SHOT_MS - CUT_MS)),
        );

        this.showShot('b');
        this.plate.snapScroll(maxX * (0.55 - 0.35 * t), maxY * (0.5 + 0.3 * t));
      }

      // A short dip to black at the cut (both cameras fade together).
      if (elapsed >= CUT_MS - FADE_MS && elapsed < CUT_MS) {
        const dim = (elapsed - (CUT_MS - FADE_MS)) / FADE_MS;

        this.cameras.main.setAlpha(1 - dim * 0.9);
      } else if (elapsed >= CUT_MS && elapsed < CUT_MS + FADE_MS) {
        const rise = (elapsed - CUT_MS) / FADE_MS;

        this.cameras.main.setAlpha(0.1 + rise * 0.9);
      } else {
        this.cameras.main.setAlpha(1);
      }

      // Snow: constant drift, wrapped inside the art bounds.
      const step = Math.min(50, deltaMs) / 1000;

      for (const flake of this.snow) {
        flake.rect.y += flake.speed * step;
        flake.rect.x -= flake.speed * 0.35 * step;

        if (flake.rect.y > ART_H * ART_SCALE) {
          flake.rect.y = -4;
        }

        if (flake.rect.x < -4) {
          flake.rect.x = ART_W * ART_SCALE;
        }
      }
    }

    if (elapsed >= OPENING_TOTAL_MS) {
      this.finish('completed');
      return;
    }

    this.refreshProbe(null);
  }

  private buildCaptions() {
    // Fixed on screen (HUD): captions and the skip affordance.
    this.captionText = this.add
      .text(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 122, '', {
        color: '#dfe9f1',
        font: '16px monospace',
        backgroundColor: '#101820',
        padding: { x: 16, y: 10 },
        wordWrap: { width: 620 },
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5)
      .setDepth(50)
      .setScrollFactor(0);
    this.add
      .text(
        DESIGN_WIDTH / 2,
        DESIGN_HEIGHT - 44,
        'Press any key or click to skip',
        {
          color: '#9fb2c1',
          font: '13px monospace',
          backgroundColor: '#101820',
          padding: { x: 10, y: 5 },
        },
      )
      .setOrigin(0.5)
      .setDepth(50)
      .setScrollFactor(0);
  }

  private finish(outcome: 'completed' | 'skipped') {
    if (this.finished) {
      return;
    }

    this.finished = true;
    this.tweens.killAll();
    this.cameras.main.setAlpha(1);
    this.refreshProbe(outcome);
    this.scene.setVisible(true, this.resumeKey);
    this.onDone?.(outcome);
    this.scene.resume(this.resumeKey);
    this.scene.stop();
  }

  private refreshProbe(outcome: 'completed' | 'skipped' | null) {
    if (typeof window === 'undefined' || !import.meta.env.DEV) {
      return;
    }

    window.__pilotOpeningProbe = {
      open: outcome === null,
      caption_index: this.captionIndex,
      outcome,
      elapsed_ms: Math.round(this.elapsed()),
      shuttle_landed: this.shuttleLanded,
    };
  }
}
