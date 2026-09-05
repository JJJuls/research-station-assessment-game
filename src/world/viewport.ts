/**
 * World V1 fixed logical viewport (docs/game/world-v1/CAMERA-AND-SCALE-SPEC.md).
 *
 * Three coordinate spaces, one module:
 *
 *   - WORLD  — room pixels on the 32 px grid. Interaction radii, station /
 *     door positions, spawns and physics never change here. Every world
 *     object is drawn ONCE per frame, 1:1, into the WORLD PLATE (a
 *     1024×576 RenderTexture whose own camera follows the avatar), and the
 *     plate is composited onto the canvas at WORLD_SCALE (1.25) through the
 *     texel-snapped sampler (plateSampler.ts) — a 32×18-tile view that is
 *     pixel-stable at a non-integer ratio.
 *   - DESIGN — the 800×600 space every HUD element and every modal overlay
 *     scene was authored in. It is mapped onto the canvas by a dedicated
 *     camera (zoom DESIGN_SCALE, centred) so no panel geometry changes in
 *     its own coordinate system (information exposure and motor precision
 *     are preserved by construction).
 *   - CANVAS — 1280×720 logical pixels; the browser FIT-letterboxes it.
 *
 * Presentation only: nothing here reads or writes measurement state.
 */
import Phaser from 'phaser';

import { WorldCameraController, type WorldView } from './camera';
import { ensureWorldPlatePipeline } from './plateSampler';

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

/** Default composite scale of the world plate (32 × 18 tiles visible). */
export const DEFAULT_WORLD_SCALE = 1.25;

/**
 * Legacy art scale used by the V4 opening overlay (2× pixel art in the
 * design space). The opening is rebuilt in World V1 U2; until then the
 * constant keeps that scene byte-identical.
 */
export const WORLD_ZOOM = 2;

/** Plate size at the default scale (world px visible at once). */
export const WORLD_VIEW_WIDTH = Math.round(CANVAS_WIDTH / DEFAULT_WORLD_SCALE);
export const WORLD_VIEW_HEIGHT = Math.round(
  CANVAS_HEIGHT / DEFAULT_WORLD_SCALE,
);

export const DESIGN_WIDTH = 800;
export const DESIGN_HEIGHT = 600;
/** Design → canvas scale (fills the canvas height). */
export const DESIGN_SCALE = CANVAS_HEIGHT / DESIGN_HEIGHT;
export const DESIGN_OFFSET_X = (CANVAS_WIDTH - DESIGN_WIDTH * DESIGN_SCALE) / 2;
export const DESIGN_OFFSET_Y =
  (CANVAS_HEIGHT - DESIGN_HEIGHT * DESIGN_SCALE) / 2;

/** Page ground / letterbox colour (src/style.css, game backgroundColor). */
export const PAGE_GROUND = 0x0b1016;

/** Candidate composite scales (the U1 three-scale comparison). */
const SCALE_CANDIDATES = [1, 1.25, 1.5, 2] as const;

/**
 * The active composite scale. DEV-only `?world_scale=<candidate>` selects
 * another candidate for the comparison frames; participant builds always
 * use the default.
 */
export function worldScale(): number {
  if (typeof window === 'undefined' || !import.meta.env.DEV) {
    return DEFAULT_WORLD_SCALE;
  }

  const raw = new URLSearchParams(window.location.search).get('world_scale');
  const candidate = raw === null ? Number.NaN : Number(raw);

  return SCALE_CANDIDATES.includes(
    candidate as (typeof SCALE_CANDIDATES)[number],
  )
    ? candidate
    : DEFAULT_WORLD_SCALE;
}

/** Plate (visible world) size in world px for the active scale. */
export function worldViewSize(): { width: number; height: number } {
  const scale = worldScale();

  return {
    width: Math.round(CANVAS_WIDTH / scale),
    height: Math.round(CANVAS_HEIGHT / scale),
  };
}

export interface DesignSpaceProbe {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  canvasWidth: number;
  canvasHeight: number;
}

export interface CameraProbe {
  scene: string;
  /** Composite scale of the world plate (world px → canvas px). */
  zoom: number;
  scrollX: number;
  scrollY: number;
  viewX: number;
  viewY: number;
  viewWidth: number;
  viewHeight: number;
  boundsWidth: number;
  boundsHeight: number;
  hudZoom: number | null;
  roundPixels: boolean;
  plate: { width: number; height: number; scale: number };
}

declare global {
  interface Window {
    /** DEV-only, read-only: design-space → canvas mapping for e2e clicks. */
    __designSpace?: DesignSpaceProbe | null;
    /** DEV-only, read-only: the active room's world camera state. */
    __cameraProbe?: CameraProbe | null;
  }
}

export const DESIGN_SPACE_PROBE: DesignSpaceProbe = {
  width: DESIGN_WIDTH,
  height: DESIGN_HEIGHT,
  offsetX: DESIGN_OFFSET_X,
  offsetY: DESIGN_OFFSET_Y,
  scale: DESIGN_SCALE,
  canvasWidth: CANVAS_WIDTH,
  canvasHeight: CANVAS_HEIGHT,
};

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__designSpace = DESIGN_SPACE_PROBE;
  window.__cameraProbe = null;
}

/**
 * Points a camera at the 800×600 design space: full-canvas viewport, zoom
 * DESIGN_SCALE, centred, so design (0,0)-(800,600) covers the central
 * 960×720 of the canvas and the 160 px bands either side show whatever
 * lies behind the camera (an opaque backdrop for overlay scenes, the
 * world plate for the HUD camera).
 */
export function fitDesignCamera(camera: Phaser.Cameras.Scene2D.Camera) {
  camera.setViewport(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  camera.setZoom(DESIGN_SCALE);
  camera.centerOn(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2);
  camera.setRoundPixels(false);
}

/**
 * Phaser renders a `scrollFactor(0)` object WITHOUT the camera's scroll
 * term but WITH its zoom-about-centre, so under a zoomed design camera
 * such objects land off by `origin × (1 − zoom)`. The design cameras never
 * scroll, so "fixed on screen" is simply scroll factor 1 for them: before
 * every render, any object authored with `scrollFactor(0)` is remembered
 * as a HUD object and switched to scroll factor 1. The set is the
 * authority for the world/HUD split below. Presentation only.
 */
function installHudObjectTracker(
  scene: Phaser.Scene,
): WeakSet<Phaser.GameObjects.GameObject> {
  const hudObjects = new WeakSet<Phaser.GameObjects.GameObject>();
  const track = () => {
    for (const child of scene.children.list) {
      const candidate = child as Phaser.GameObjects.GameObject & {
        scrollFactorX?: number;
        scrollFactorY?: number;
        setScrollFactor?: (x: number, y?: number) => unknown;
      };

      if (
        candidate.scrollFactorX === 0 &&
        candidate.scrollFactorY === 0 &&
        candidate.setScrollFactor !== undefined
      ) {
        hudObjects.add(candidate);
        candidate.setScrollFactor(1, 1);
      }
    }
  };

  track();
  scene.events.on(Phaser.Scenes.Events.PRE_RENDER, track);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.PRE_RENDER, track);
  });

  return hudObjects;
}

/**
 * Modal overlay scenes: fit the design camera and lay an opaque
 * page-ground backdrop under the scene so the side bands never show the
 * paused world as a fragment (overlays render above the world, never as
 * partial frames). Depth −1000 sits under every panel.
 */
export function fitOverlayScene(scene: Phaser.Scene) {
  fitDesignCamera(scene.cameras.main);
  installHudObjectTracker(scene);
  scene.add
    .rectangle(
      DESIGN_WIDTH / 2,
      DESIGN_HEIGHT / 2,
      CANVAS_WIDTH / DESIGN_SCALE + 8,
      CANVAS_HEIGHT / DESIGN_SCALE + 8,
      PAGE_GROUND,
      1,
    )
    .setDepth(-1000);
}

const PLATE_NAME = '__worldPlate';

/**
 * The world plate of a room scene: the RenderTexture every world object is
 * drawn into, the follow controller that scrolls it, and the composite
 * image the main camera shows. One per room scene.
 */
export class WorldPlate {
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly controller: WorldCameraController;
  private readonly rt: Phaser.GameObjects.RenderTexture;
  private clearColor = PAGE_GROUND;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly worldObjects: (
      child: Phaser.GameObjects.GameObject,
    ) => boolean,
  ) {
    const size = worldViewSize();

    this.width = size.width;
    this.height = size.height;
    this.scale = worldScale();
    this.controller = new WorldCameraController({
      viewWidth: this.width,
      viewHeight: this.height,
    });

    this.rt = scene.add
      .renderTexture(0, 0, this.width, this.height)
      .setOrigin(0)
      .setScale(this.scale)
      .setDepth(-2000)
      .setName(PLATE_NAME);
    // The plate is drawn 1:1 into the texture and composited through the
    // sampler, which relies on hardware bilinear filtering at the seams.
    this.rt.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);

    const pipeline = ensureWorldPlatePipeline(scene);

    if (pipeline !== null) {
      pipeline.configure(this.width, this.height, 1 / this.scale);
      this.rt.setPipeline(pipeline);
    }
  }

  get gameObject(): Phaser.GameObjects.GameObject {
    return this.rt;
  }

  /** Colour shown where a room smaller than the view leaves the plate bare. */
  setClearColor(color: number) {
    this.clearColor = color;
  }

  setBounds(width: number, height: number) {
    this.controller.setBounds(width, height);
  }

  snapTo(x: number, y: number) {
    this.controller.snapTo(x, y);
  }

  /** One frame of following (called from the room's update loop). */
  follow(x: number, y: number) {
    this.controller.update(x, y);
  }

  get view(): WorldView {
    return this.controller.view;
  }

  /** Draws the world for this frame (PRE_RENDER, after the depth sort). */
  render() {
    const view = this.controller.view;

    this.rt.camera.setScroll(view.x, view.y);
    this.rt.fill(this.clearColor, 1);

    const list: Phaser.GameObjects.GameObject[] = [];

    // DynamicTexture.batchList draws every entry it is handed WITHOUT a
    // willRender check (hidden objects included — the invisible collision
    // tilemap layer would paint over the floor), so the plate applies the
    // renderer's own visibility/alpha/camera-filter test here.
    for (const child of this.scene.children.list) {
      if (
        this.worldObjects(child) &&
        child.willRender(
          this.rt.camera as unknown as Phaser.Cameras.Scene2D.Camera,
        )
      ) {
        list.push(child);
      }
    }

    if (list.length > 0) {
      this.rt.draw(list);
    }
  }
}

const platesByScene = new WeakMap<Phaser.Scene, WorldPlate>();

/**
 * Room scenes: the main camera shows only the world plate at the composite
 * scale; a second camera renders the 800×600 design-space HUD. Objects
 * authored with `scrollFactor(0)` are HUD (see installHudObjectTracker),
 * everything else is world and is drawn into the plate — no call site
 * needs to know which camera draws it. Returns the plate.
 */
export function attachWorldPlate(scene: Phaser.Scene): WorldPlate {
  const main = scene.cameras.main;

  main.setViewport(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  main.setZoom(1);
  main.setScroll(0, 0);
  main.setRoundPixels(true);

  const hud = scene.cameras.add(
    0,
    0,
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    false,
    'hud',
  );

  fitDesignCamera(hud);

  const mainBit = main.id;
  const hudBit = hud.id;
  const hudObjects = installHudObjectTracker(scene);
  const isWorld = (child: Phaser.GameObjects.GameObject) =>
    child.name !== PLATE_NAME && !hudObjects.has(child);
  const plate = new WorldPlate(scene, isWorld);

  platesByScene.set(scene, plate);

  // Runs after the tracker's PRE_RENDER pass (registered first) and after
  // the scene's depth sort (Systems.render sorts before emitting): HUD
  // objects render through the HUD camera only, the plate through the
  // main camera only, and world objects through neither — they are drawn
  // into the plate here in display-list (depth) order.
  const classifyAndRender = () => {
    for (const child of scene.children.list) {
      if (child.name === PLATE_NAME) {
        child.cameraFilter = hudBit;
      } else if (hudObjects.has(child)) {
        child.cameraFilter = mainBit;
      } else {
        child.cameraFilter = mainBit | hudBit;
      }
    }

    plate.render();
  };

  scene.events.on(Phaser.Scenes.Events.PRE_RENDER, classifyAndRender);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.PRE_RENDER, classifyAndRender);
    platesByScene.delete(scene);
  });

  return plate;
}

export function getWorldPlate(scene: Phaser.Scene): WorldPlate | null {
  return platesByScene.get(scene) ?? null;
}

/** The visible world rectangle of a room scene (whole pixels). */
export function worldViewOf(scene: Phaser.Scene): WorldView {
  const plate = platesByScene.get(scene);

  if (plate !== undefined) {
    return plate.view;
  }

  const { worldView } = scene.cameras.main;

  return {
    x: worldView.x,
    y: worldView.y,
    width: worldView.width,
    height: worldView.height,
    right: worldView.right,
    bottom: worldView.bottom,
  };
}

/** World point → canvas point. */
export function worldToCanvas(
  scene: Phaser.Scene,
  x: number,
  y: number,
): { x: number; y: number } {
  const view = worldViewOf(scene);
  const scale = platesByScene.get(scene)?.scale ?? 1;

  return { x: (x - view.x) * scale, y: (y - view.y) * scale };
}

/** World point → design-space point (for HUD elements that track a target). */
export function worldToDesign(
  scene: Phaser.Scene,
  x: number,
  y: number,
): { x: number; y: number } {
  const canvas = worldToCanvas(scene, x, y);

  return {
    x: (canvas.x - DESIGN_OFFSET_X) / DESIGN_SCALE,
    y: (canvas.y - DESIGN_OFFSET_Y) / DESIGN_SCALE,
  };
}

/**
 * Pointer (canvas coordinates) → world point through the plate transform.
 * Phaser fills pointer.worldX/Y from whichever camera it hit-tested last,
 * so world-space pointer consumers resolve it here.
 */
export function pointerToWorld(
  scene: Phaser.Scene,
  pointer: { x: number; y: number },
): { x: number; y: number } {
  const view = worldViewOf(scene);
  const scale = platesByScene.get(scene)?.scale ?? 1;

  return { x: view.x + pointer.x / scale, y: view.y + pointer.y / scale };
}

/** Fades every camera of a scene together (world + HUD). */
export function fadeAllCameras(
  scene: Phaser.Scene,
  direction: 'in' | 'out',
  duration: number,
) {
  for (const camera of scene.cameras.cameras) {
    if (direction === 'in') {
      camera.fadeIn(duration, 0, 0, 0);
    } else {
      camera.fadeEffect.start(true, duration, 0, 0, 0, true);
    }
  }
}

/** DEV-only camera probe refresh (called from the room update loop). */
export function publishCameraProbe(scene: Phaser.Scene) {
  if (typeof window === 'undefined' || !import.meta.env.DEV) {
    return;
  }

  const plate = platesByScene.get(scene);
  const hud = scene.cameras.getCamera('hud');
  const view = worldViewOf(scene);
  const bounds = plate?.controller.getBounds() ?? {
    width: scene.cameras.main.getBounds().width,
    height: scene.cameras.main.getBounds().height,
  };

  window.__cameraProbe = {
    scene: scene.scene.key,
    zoom: plate?.scale ?? scene.cameras.main.zoom,
    scrollX: view.x,
    scrollY: view.y,
    viewX: view.x,
    viewY: view.y,
    viewWidth: view.width,
    viewHeight: view.height,
    boundsWidth: bounds.width,
    boundsHeight: bounds.height,
    hudZoom: hud?.zoom ?? null,
    roundPixels: true,
    plate: {
      width: plate?.width ?? view.width,
      height: plate?.height ?? view.height,
      scale: plate?.scale ?? 1,
    },
  };
}
