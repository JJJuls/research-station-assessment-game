/**
 * Pilot opening (skippable) — World V1 U2 (PROFESSIONAL-WORLD-DESIGN-V1 §9).
 *
 * An in-engine establishing sequence composed from the station's own kit
 * at the world scale and in the world's own top-down perspective: the
 * plateau at dawn, Station 080's modules with visible storm damage, the
 * broken relay mast, the landing pad — and the relief shuttle settling
 * onto the pad in front of the Dock's docking threshold, the exact point
 * where the participant then stands. The picture is rendered through the
 * same world plate and sampler as every room (32×18-tile view, 1.25×
 * composite), so scale, lighting register and perspective carry straight
 * into the playable Dock.
 *
 * Timing is WALL-CLOCK: captions, the pan, the descent and the hand-over
 * are functions of the raw elapsed time read in update(), never of the
 * frame-delta accumulators (Phaser timers and tweens), which fall behind
 * real time when a slow renderer caps the per-frame delta. The shot ends at
 * 15.4 s (≤ 20 s) on any machine; any key or click skips. Skipping or
 * finishing changes NO measurement entry state: the Dock resumes
 * identically either way (the skip press never becomes the first
 * interaction — RoomScene's 300 ms suppression). Under reduced motion the
 * shot is static (shuttle landed) and the captions hold for the same total
 * time. Logs `pilot_opening_*` (unmapped route telemetry) through the Dock.
 */
import Phaser from 'phaser';

import { DepthLayer, key } from '../../constants';
import { prefersReducedMotion } from '../../inventory/ui/theme';
import { ensureKitTextures } from '../../world/kit/kitTextures';
import { STATION_THEMES } from '../../world/proceduralTilesets';
import { buildPlaceholderRoomMap } from '../../world/StationMapBuilder';
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

/** Three captions at 0 / 5 / 10 s; the shot ends at 15 s (+ hand-over). */
export const OPENING_CAPTION_MS = 5000;
const HANDOVER_MS = 400;
export const OPENING_TOTAL_MS = OPENING_CAPTION_MS * OPENING_CAPTIONS.length;

/** The shuttle's descent window (wall-clock ms from the shot's start). */
const DESCENT_START_MS = 3500;
const DESCENT_MS = 6000;
/** The camera pan window. */
const PAN_MS = OPENING_TOTAL_MS - 2000;

const TILE = 32;

/** Dawn tint applied to every world image (no alpha overlay: one quad each). */
const DAWN_TINT = 0x9fb0c8;
const DAWN_TINT_FLOOR = 0x8898b0;

/**
 * The plateau (48×27 tiles, exterior theme): rock ridge along the north
 * and the flanks, packed snow inside, the landing pad ('P') in front of
 * the Dock module in the south-east.
 */
const PLATEAU: readonly string[] = [
  '################################################',
  '################################################',
  '##............................................##',
  '#..............................................#',
  '#..............................................#',
  '#..............................................#',
  '#..............................................#',
  '#..............................................#',
  '#..............................................#',
  '#..............................................#',
  '#..............................................#',
  '#..............................................#',
  '#..............................................#',
  '#..............................................#',
  '#..............................................#',
  '#..............................................#',
  '#..............................................#',
  '#..............................................#',
  '#..............................................#',
  '#..............................................#',
  '#..............................PPPPPPPP........#',
  '#..............................PPPPPPPP........#',
  '#..............................PPPPPPPP........#',
  '#..............................PPPPPPPP........#',
  '#..............................................#',
  '##............................................##',
  '################################################',
];

/** World positions of the composition (px). */
const SHOT = {
  mast: { x: 300, y: 250 },
  modules: [
    { x: 560, y: 300, damaged: true },
    { x: 780, y: 300, damaged: false },
    { x: 1000, y: 300, damaged: true },
  ],
  dockModule: { x: 1120, y: 560 },
  pad: { x: 35 * TILE, y: 21.5 * TILE + 16 },
  shuttleStart: { x: 35 * TILE - 220, y: 21.5 * TILE + 16 - 420 },
  cameraStart: { x: 520, y: 330 },
  cameraEnd: { x: 1060, y: 560 },
} as const;

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
  private captionIndex = 0;
  private captionText!: Phaser.GameObjects.Text;
  private plate!: WorldPlate;
  private shuttle!: Phaser.GameObjects.Image;
  private shuttleShadow!: Phaser.GameObjects.Ellipse;
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
    this.captionIndex = 0;
    this.shuttleLanded = false;
  }

  create() {
    this.scene.bringToTop();
    // The paused Dock underneath is not drawn while the shot runs (the
    // shot fills the canvas; two world plates per frame would only cost).
    this.scene.setVisible(false, this.resumeKey);
    ensureKitTextures(this);

    this.reduced = prefersReducedMotion();

    const map = buildPlaceholderRoomMap(this, {
      theme: 'exterior',
      grid: [...PLATEAU],
    });

    // The same world plate as every room: 1024×576 world px at 1.25.
    this.plate = attachWorldPlate(this);
    this.plate.setBounds(map.widthInPixels, map.heightInPixels);
    this.plate.setClearColor(STATION_THEMES.exterior.voidColor);

    // Dawn: the baked floor is tinted (one textured quad, no alpha overlay).
    for (const child of this.children.list) {
      if (
        child instanceof Phaser.GameObjects.RenderTexture &&
        child.depth === -1
      ) {
        child.setTint(DAWN_TINT_FLOOR);
      }
    }

    this.buildStation();
    this.buildShuttle();
    this.buildCaptions();

    const start = this.reduced ? SHOT.cameraEnd : SHOT.cameraStart;

    this.plate.snapTo(start.x, start.y);

    const skip = () => this.finish('skipped');

    this.input.keyboard!.once('keydown', skip);
    this.input.once('pointerdown', skip);
    this.startedAt = performance.now();
    this.refreshProbe(null);
  }

  /** Wall-clock ms since the shot started. */
  private elapsed(): number {
    return performance.now() - this.startedAt;
  }

  update() {
    if (this.finished) {
      return;
    }

    const elapsed = this.elapsed();

    // Captions on the wall clock.
    const index = Math.min(
      OPENING_CAPTIONS.length - 1,
      Math.floor(elapsed / OPENING_CAPTION_MS),
    );

    if (index !== this.captionIndex) {
      this.captionIndex = index;
      this.captionText.setText(OPENING_CAPTIONS[index]);
    }

    if (!this.reduced) {
      // Camera pan from the mast to the pad and the Dock threshold.
      const pan = easeInOut(clamp01(elapsed / PAN_MS));
      const cx =
        SHOT.cameraStart.x + (SHOT.cameraEnd.x - SHOT.cameraStart.x) * pan;
      const cy =
        SHOT.cameraStart.y + (SHOT.cameraEnd.y - SHOT.cameraStart.y) * pan;

      this.plate.snapTo(cx, cy);

      // The shuttle's descent onto the pad.
      const descent = easeInOut(
        clamp01((elapsed - DESCENT_START_MS) / DESCENT_MS),
      );

      this.shuttle
        .setPosition(
          SHOT.shuttleStart.x + (SHOT.pad.x - SHOT.shuttleStart.x) * descent,
          SHOT.shuttleStart.y + (SHOT.pad.y - SHOT.shuttleStart.y) * descent,
        )
        .setScale(0.8 + 0.2 * descent);
      this.shuttleShadow
        .setScale(0.5 + 0.5 * descent)
        .setAlpha(0.6 + 0.4 * descent);

      if (descent >= 1 && !this.shuttleLanded) {
        this.shuttleLanded = true;
        this.touchdownPuff();
      }
    }

    if (elapsed >= OPENING_TOTAL_MS + HANDOVER_MS) {
      this.finish('completed');
      return;
    }

    this.refreshProbe(null);
  }

  /**
   * Station 080 from the shuttle's approach line: three research modules
   * on the plateau linked by service corridors, the Dock module in front
   * of the pad, Mast 04 on its footing with the broken upper arm, storm
   * evidence (drifts, debris, a scorched roof panel, a torn cable run),
   * emergency amber in the module skylights, the lit arrival bay.
   */
  private buildStation() {
    const modules = SHOT.modules;

    // Corridors first (under the module roofs).
    for (let i = 1; i < modules.length; i += 1) {
      const from = modules[i - 1];
      const to = modules[i];
      const y = from.y - 20;

      for (let x = from.x + 96; x < to.x - 96; x += 64) {
        this.addImage(x + 32, y, 'kit-corridor-roof', DepthLayer.GroundInfra);
      }
    }

    // Corridor from the east module down to the Dock module.
    for (let y = modules[2].y + 64; y < SHOT.dockModule.y - 64; y += 64) {
      this.addImage(
        modules[2].x + 40,
        y + 32,
        'kit-corridor-roof',
        DepthLayer.GroundInfra,
      )?.setAngle(90);
    }

    for (const module of modules) {
      this.addImage(module.x, module.y, 'kit-module-roof', DepthLayer.LowProp);
      // Skylight: emergency amber (power out) on the damaged modules, dim
      // steel on the intact one.
      this.add
        .rectangle(
          module.x,
          module.y - 30,
          60,
          6,
          module.damaged ? 0xc9a24a : 0x3d4a5c,
          1,
        )
        .setDepth(DepthLayer.LowProp + 0.01);

      if (module.damaged) {
        this.addImage(
          module.x + 40,
          module.y + 18,
          'kit-scorch',
          DepthLayer.LowProp + 0.02,
        );
        this.addImage(
          module.x - 40,
          module.y - 70,
          'kit-snow-drift',
          DepthLayer.FloorDecal,
        );
      }
    }

    // The Dock module (arrival bay lit) and its docking threshold facing
    // the pad — the participant's entry point.
    const dock = SHOT.dockModule;

    this.addImage(dock.x, dock.y, 'kit-module-roof', DepthLayer.LowProp);
    this.add
      .rectangle(dock.x, dock.y - 30, 60, 6, 0xbfe0f0, 1)
      .setDepth(DepthLayer.LowProp + 0.01);
    this.addImage(
      dock.x,
      dock.y + 70,
      'kit-airlock-frame',
      DepthLayer.LowProp + 0.02,
    );
    this.addImage(
      dock.x - 76,
      dock.y + 66,
      'kit-bay-window',
      DepthLayer.LowProp + 0.02,
    )?.setScale(0.5);
    this.addImage(
      dock.x + 76,
      dock.y + 66,
      'kit-bay-window',
      DepthLayer.LowProp + 0.02,
    )?.setScale(0.5);
    // Threshold light pool on the pad side.
    this.addImage(
      dock.x,
      dock.y + 110,
      'kit-light-pool-warm',
      DepthLayer.FloorDecal,
      false,
    );

    // Mast 04: the tower on its footing, the upper arm down in the snow.
    const mast = SHOT.mast;

    this.addImage(
      mast.x,
      mast.y + 40,
      'kit-contact-shadow',
      DepthLayer.FloorDecal,
      false,
    );
    this.addImage(
      mast.x,
      mast.y + 40,
      'kit-mast-tower',
      DepthLayer.LowProp + 0.05,
    )?.setOrigin(0.5, 1);
    this.addImage(
      mast.x + 70,
      mast.y + 30,
      'kit-mast-arm',
      DepthLayer.FloorDecal + 0.1,
    )?.setAngle(24);
    this.addImage(
      mast.x - 30,
      mast.y + 60,
      'kit-snow-drift',
      DepthLayer.FloorDecal,
    );

    // Storm evidence on the plateau.
    for (const [x, y, angle] of [
      [420, 420, 10],
      [690, 190, -30],
      [880, 430, 60],
      [1250, 470, -15],
      [980, 700, 35],
    ] as const) {
      this.addImage(x, y, 'kit-debris', DepthLayer.FloorDecal + 0.05)?.setAngle(
        angle,
      );
    }

    for (const [x, y] of [
      [640, 470],
      [1220, 300],
      [430, 640],
    ] as const) {
      this.addImage(x, y, 'kit-snow-drift', DepthLayer.FloorDecal);
    }

    // A torn cable run between the modules and the mast.
    for (let x = mast.x + 40; x < modules[0].x - 100; x += 32) {
      this.addImage(
        x,
        mast.y + 90,
        'kit-cable-tray',
        DepthLayer.FloorDecal + 0.02,
      );
    }

    // Pad lights (amber, static) at the four corners.
    const pad = SHOT.pad;

    for (const dx of [-120, 120]) {
      for (const dy of [-56, 56]) {
        this.addImage(
          pad.x + dx,
          pad.y + dy,
          'kit-pad-light',
          DepthLayer.GroundInfra,
          false,
        );
        this.addImage(
          pad.x + dx,
          pad.y + dy + 6,
          'kit-light-pool-warm',
          DepthLayer.FloorDecal,
          false,
        )
          ?.setScale(0.35)
          .setAlpha(0.7);
      }
    }
  }

  /** The relief shuttle: descends onto the pad (or sits landed). */
  private buildShuttle() {
    const pad = SHOT.pad;

    this.shuttleShadow = this.add
      .ellipse(pad.x, pad.y + 30, 150, 46, 0x000000, 0.22)
      .setDepth(DepthLayer.FloorDecal + 0.2);
    this.shuttle = this.add
      .image(pad.x, pad.y, 'kit-shuttle-top')
      .setDepth(DepthLayer.LowProp + 0.5);

    if (this.reduced) {
      this.shuttleLanded = true;
      return;
    }

    this.shuttle
      .setPosition(SHOT.shuttleStart.x, SHOT.shuttleStart.y)
      .setScale(0.8);
    this.shuttleShadow.setScale(0.5).setAlpha(0.6);
  }

  /** Snow puff on touchdown: three fading ellipses (state-driven, once). */
  private touchdownPuff() {
    const pad = SHOT.pad;

    for (const [dx, w] of [
      [-90, 70],
      [0, 90],
      [90, 70],
    ] as const) {
      const puff = this.add
        .ellipse(pad.x + dx, pad.y + 28, w, 22, 0xe8f2fa, 0.5)
        .setDepth(DepthLayer.LowProp + 0.6);

      this.tweens.add({
        targets: puff,
        alpha: 0,
        scaleX: 1.6,
        scaleY: 1.3,
        duration: 1400,
        onComplete: () => puff.destroy(),
      });
    }
  }

  private buildCaptions() {
    // Fixed on screen (HUD): captions and the skip affordance.
    this.captionText = this.add
      .text(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 122, OPENING_CAPTIONS[0], {
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

  /** A kit image with the dawn tint (light sources keep their colour). */
  private addImage(
    x: number,
    y: number,
    texture: string,
    depth: number,
    tint = true,
  ): Phaser.GameObjects.Image | null {
    if (!this.textures.exists(texture)) {
      return null;
    }

    const image = this.add.image(x, y, texture).setDepth(depth);

    if (tint) {
      image.setTint(DAWN_TINT);
    }

    return image;
  }

  private finish(outcome: 'completed' | 'skipped') {
    if (this.finished) {
      return;
    }

    this.finished = true;
    this.tweens.killAll();
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
