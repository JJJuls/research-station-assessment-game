/**
 * Pilot opening (skippable) — World V1 production slice
 * (STORY-STATE-SPEC.md §5, storyboard frames 1–4; frames 5–8 continue
 * inside DockScene.beginArrival on the same wall clock).
 *
 * One continuous exterior arrival rendered through the same wide world
 * plate as every room (1280×720 world px at 1×/1.5×) from a plateau
 * built with the World V1 exterior tileset: Station 080 laid out in its
 * TRUE topology (Dock south of the Concourse, Records west, Laboratory
 * and the Yard's bent mast north, Utility and the Core east), the storm's
 * evidence (Mast 04 bent, a torn roof panel, drifts), and the relief
 * shuttle entering along the cleared approach lane from the south-west,
 * decelerating, and berthing at the Dock's south docking seal — the exact
 * point the participant then steps out of.
 *
 * Timing is WALL-CLOCK: captions, the camera move and the shuttle are
 * functions of the raw elapsed time read in update(), never of the
 * frame-delta accumulators, so the shot ends at the same wall time on any
 * machine. Any key or click skips. Skipping or finishing changes NO
 * measurement entry state: the Dock's one finish function lands both in
 * the identical state. Under reduced motion the shot is static (shuttle
 * berthed) and the captions hold for the same total time. Logs
 * `pilot_opening_*` (unmapped route telemetry) through the Dock.
 */
import Phaser from 'phaser';

import { DepthLayer, key } from '../../constants';
import { prefersReducedMotion } from '../../inventory/ui/theme';
import { ensureKitTextures } from '../../world/kit/kitTextures';
import { SHUTTLE_HULL_TINT } from '../../world/kit/worldV1Assets';
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

/** The exterior shot: frames 1–4 of the storyboard (ms). */
export const OPENING_SHOT_MS = 8600;
const HANDOVER_MS = 200;
export const OPENING_TOTAL_MS = OPENING_SHOT_MS + HANDOVER_MS;

/** Shuttle approach window (frame 2 → 4). */
const APPROACH_START_MS = 1800;
const APPROACH_MS = 4600;
/** Camera move window (frame 3 → 4). */
const MOVE_START_MS = 3200;
const MOVE_MS = 4200;

/**
 * The plateau (60×34 tiles, exterior tileset): a rock ridge around the
 * edges, packed snow inside, the cleared approach lane from the
 * south-west corner to the Dock's berth.
 */
const PLATEAU: readonly string[] = (() => {
  const rows: string[] = [];

  for (let r = 0; r < 34; r += 1) {
    let row = '';

    for (let c = 0; c < 60; c += 1) {
      const edge = r < 2 || r > 31 || c < 2 || c > 57;
      const ridgeNE = r < 6 && c > 48;
      const ridgeNW = r < 5 && c < 10;
      const ridgeSE = r > 28 && c > 50;

      row += edge || ridgeNE || ridgeNW || ridgeSE ? '#' : '.';
    }

    rows.push(row);
  }

  return rows;
})();

/**
 * World positions of the composition (px). Modules follow the route
 * topology: the Concourse at the centre, the Dock south, Records west,
 * the Laboratory north (the Yard's mast beyond), Utility east (the Core
 * beyond). Roof images are 192×128 (centre anchored).
 */
const SHOT = {
  concourse: { x: 960, y: 520 },
  dock: { x: 960, y: 760 },
  records: { x: 640, y: 520 },
  laboratory: { x: 960, y: 300 },
  utility: { x: 1280, y: 520 },
  core: { x: 1540, y: 470 },
  mast: { x: 1010, y: 130 },
  berth: { x: 960, y: 872 },
  shuttleStart: { x: 240, y: 1010 },
  cameraStart: { x: 1000, y: 470 },
  cameraEnd: { x: 960, y: 700 },
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
  private captionIndex = -1;
  private captionText!: Phaser.GameObjects.Text;
  private plate!: WorldPlate;
  private shuttle!: Phaser.GameObjects.Image;
  private shuttleShadow!: Phaser.GameObjects.Ellipse;
  private berthLight!: Phaser.GameObjects.Rectangle;
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
      tilesetKey: 'w1-tileset-exterior',
      floorVariants: false,
    });

    // The same wide world plate as every rebuilt room.
    this.plate = attachWorldPlate(this, 'wide');
    this.plate.setBounds(map.widthInPixels, map.heightInPixels);
    this.plate.setClearColor(STATION_THEMES.exterior.voidColor);

    // Storm ambience: the plateau bake takes a cool tint (one textured
    // quad, no alpha overlay); props keep their own colours.
    for (const child of this.children.list) {
      if (
        child instanceof Phaser.GameObjects.RenderTexture &&
        child.depth === -1
      ) {
        child.setTint(0xa9b8c8);
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
    this.update();
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
      // Frame 3: the slow linear move toward the Dock; the connected
      // station silhouette stays in frame throughout.
      const move = easeInOut(clamp01((elapsed - MOVE_START_MS) / MOVE_MS));
      const cx =
        SHOT.cameraStart.x + (SHOT.cameraEnd.x - SHOT.cameraStart.x) * move;
      const cy =
        SHOT.cameraStart.y + (SHOT.cameraEnd.y - SHOT.cameraStart.y) * move;

      this.plate.snapTo(cx, cy);

      // Frame 2 → 4: the shuttle enters along the cleared lane from the
      // south-west, decelerates and stops at the berth.
      const t = clamp01((elapsed - APPROACH_START_MS) / APPROACH_MS);
      const approach = 1 - (1 - t) * (1 - t) * (1 - t);
      const x =
        SHOT.shuttleStart.x + (SHOT.berth.x - SHOT.shuttleStart.x) * approach;
      const y =
        SHOT.shuttleStart.y + (SHOT.berth.y - SHOT.shuttleStart.y) * approach;
      const heading = Math.atan2(
        SHOT.berth.y - SHOT.shuttleStart.y,
        SHOT.berth.x - SHOT.shuttleStart.x,
      );

      this.shuttle
        .setPosition(x, y)
        .setScale(0.88 + 0.12 * approach)
        // Nose toward the berth while flying; docked nose-north (frame 4).
        .setRotation(t < 1 ? (heading + Math.PI / 2) * (1 - approach) : 0);
      this.shuttleShadow
        .setPosition(x + 6, y + 30 - 14 * (1 - approach))
        .setScale(0.6 + 0.4 * approach)
        .setAlpha(0.35 + 0.35 * approach);

      if (t >= 1 && !this.shuttleLanded) {
        this.shuttleLanded = true;
        this.berthLight.setAlpha(1);
      }

      // Berth light: a single settle after touchdown (no loop).
      if (this.shuttleLanded) {
        const since = elapsed - (APPROACH_START_MS + APPROACH_MS);

        this.berthLight.setAlpha(since < 900 ? 1 : 0.55);
      }
    }

    if (elapsed >= OPENING_TOTAL_MS) {
      this.finish('completed');
      return;
    }

    this.refreshProbe(null);
  }

  /**
   * Station 080 from above in its true topology, with the storm's
   * evidence: the Concourse module at the crossing, the Dock module south
   * of it with the berth on its south face, Records west, the Laboratory
   * north with Mast 04 bent beyond it, Utility east and the Core beyond.
   * Service corridors join the modules along the same edges the doors
   * use inside.
   */
  private buildStation() {
    const link = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      const horizontal = Math.abs(b.x - a.x) > Math.abs(b.y - a.y);
      const length = Math.abs(horizontal ? b.x - a.x : b.y - a.y) - 150;

      this.add
        .rectangle(
          (a.x + b.x) / 2,
          (a.y + b.y) / 2 + (horizontal ? 8 : 0),
          horizontal ? length : 40,
          horizontal ? 40 : length,
          0x2c3745,
          1,
        )
        .setStrokeStyle(1, 0x1e2630)
        .setDepth(DepthLayer.GroundInfra);
      this.add
        .rectangle(
          (a.x + b.x) / 2,
          (a.y + b.y) / 2 + (horizontal ? 8 : 0),
          horizontal ? length : 12,
          horizontal ? 12 : length,
          0x3d4a5c,
          1,
        )
        .setDepth(DepthLayer.GroundInfra + 0.01);
    };

    link(SHOT.records, SHOT.concourse);
    link(SHOT.concourse, SHOT.utility);
    link(SHOT.concourse, SHOT.laboratory);
    link(SHOT.dock, SHOT.concourse);
    link(SHOT.utility, SHOT.core);

    // Module roofs (intact / storm-damaged variants), y-sorted.
    const roof = (at: { x: number; y: number }, damaged: boolean) =>
      this.add
        .image(at.x, at.y, damaged ? 'w1-module-roof-b' : 'w1-module-roof-a')
        .setDepth(DepthLayer.LowProp + at.y / 10000);

    roof(SHOT.laboratory, true);
    roof(SHOT.records, false);
    roof(SHOT.concourse, false);
    roof(SHOT.utility, true);
    this.add
      .image(SHOT.core.x, SHOT.core.y, 'w1-module-roof-a')
      .setScale(0.72)
      .setDepth(DepthLayer.LowProp + SHOT.core.y / 10000);
    roof(SHOT.dock, false);

    // The Dock's south face: the berth's docking seal and a cold pool.
    this.add
      .image(SHOT.dock.x, SHOT.dock.y + 66, 'w1-airlock-closed')
      .setScale(0.5)
      .setDepth(DepthLayer.LowProp + SHOT.dock.y / 10000 + 0.001);
    this.berthLight = this.add
      .rectangle(SHOT.dock.x, SHOT.dock.y + 92, 30, 4, 0x70a8ac, 1)
      .setAlpha(0)
      .setDepth(DepthLayer.LowProp + SHOT.dock.y / 10000 + 0.002);
    this.addDecal(SHOT.berth.x, SHOT.berth.y + 20, 'kit-light-pool-cold', 0.6);

    // The cleared approach lane (packed snow, faint edges) from the
    // south-west to the berth.
    const lane = new Phaser.Geom.Line(
      SHOT.shuttleStart.x,
      SHOT.shuttleStart.y,
      SHOT.berth.x,
      SHOT.berth.y + 30,
    );

    for (let i = 0; i < 12; i += 1) {
      const p = lane.getPoint(i / 11);

      this.add
        .ellipse(p.x, p.y, 120, 44, 0xb9c8d6, 0.5)
        .setDepth(DepthLayer.FloorDecal);
    }

    // Mast 04 on its footing north of the Laboratory, bent by the storm.
    this.add
      .image(SHOT.mast.x, SHOT.mast.y + 64, 'w1-mast')
      .setOrigin(0.5, 1)
      .setDepth(DepthLayer.LowProp + 0.05);
    this.addDecal(SHOT.mast.x - 40, SHOT.mast.y + 70, 'kit-contact-shadow');

    // Storm evidence: drifts on the lee sides, debris near the mast.
    for (const [x, y, flip] of [
      [420, 300, false],
      [1300, 250, true],
      [560, 780, false],
      [1500, 760, true],
      [760, 980, false],
      [1180, 980, true],
    ] as const) {
      this.add
        .image(x, y, 'w1-drift-rock')
        .setFlipX(flip)
        .setDepth(DepthLayer.FloorDecal + 0.05);
    }

    for (const [x, y, angle] of [
      [1090, 190, 20],
      [900, 210, -35],
      [1360, 420, 60],
    ] as const) {
      this.add
        .image(x, y, 'w1-debris-panel')
        .setAngle(angle)
        .setDepth(DepthLayer.FloorDecal + 0.06);
    }
  }

  /** The relief shuttle: approaches along the lane (or sits berthed). */
  private buildShuttle() {
    const berth = SHOT.berth;

    this.shuttleShadow = this.add
      .ellipse(berth.x + 6, berth.y + 30, 150, 46, 0x000000, 0.22)
      .setDepth(DepthLayer.FloorDecal + 0.2);
    this.shuttle = this.add
      .image(berth.x, berth.y, 'w1-shuttle')
      .setTint(SHUTTLE_HULL_TINT)
      .setDepth(DepthLayer.LowProp + 0.5);

    if (this.reduced) {
      this.shuttleLanded = true;
      this.berthLight.setAlpha(0.55);
      return;
    }

    this.shuttle
      .setPosition(SHOT.shuttleStart.x, SHOT.shuttleStart.y)
      .setScale(0.88);
    this.shuttleShadow.setScale(0.6).setAlpha(0.35);
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

  private addDecal(x: number, y: number, texture: string, alpha = 1) {
    if (!this.textures.exists(texture)) {
      return null;
    }

    return this.add
      .image(x, y, texture)
      .setAlpha(alpha)
      .setDepth(DepthLayer.FloorDecal);
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
