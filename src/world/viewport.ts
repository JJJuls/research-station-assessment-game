/**
 * V4 fixed logical viewport (docs/game/VISUAL-SYSTEM-V4.md §1).
 *
 * Three coordinate spaces, one module:
 *
 *   - WORLD  — room pixels on the 32 px grid. Interaction radii, station /
 *     door positions, spawns and physics never change here. The world
 *     camera renders it at an integer zoom (WORLD_ZOOM) so a 640×360
 *     world-pixel window fills the 1280×720 canvas.
 *   - DESIGN — the 800×600 space every HUD element and every modal overlay
 *     scene was authored in. It is mapped onto the canvas by a dedicated
 *     camera (zoom DESIGN_SCALE, centred) so no panel geometry changes in
 *     its own coordinate system (mission §6: information exposure and
 *     motor precision are preserved by construction).
 *   - CANVAS — 1280×720 logical pixels; the browser FIT-letterboxes it.
 *
 * Presentation only: nothing here reads or writes measurement state.
 */
import Phaser from 'phaser';

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

/** Integer world zoom: 32 px tiles render as 64 canvas px. */
export const WORLD_ZOOM = 2;
/** World pixels visible at once (20 × 11.25 tiles). */
export const WORLD_VIEW_WIDTH = CANVAS_WIDTH / WORLD_ZOOM;
export const WORLD_VIEW_HEIGHT = CANVAS_HEIGHT / WORLD_ZOOM;

export const DESIGN_WIDTH = 800;
export const DESIGN_HEIGHT = 600;
/** Design → canvas scale (fills the canvas height). */
export const DESIGN_SCALE = CANVAS_HEIGHT / DESIGN_HEIGHT;
export const DESIGN_OFFSET_X = (CANVAS_WIDTH - DESIGN_WIDTH * DESIGN_SCALE) / 2;
export const DESIGN_OFFSET_Y =
  (CANVAS_HEIGHT - DESIGN_HEIGHT * DESIGN_SCALE) / 2;

/** Page ground / letterbox colour (src/style.css, game backgroundColor). */
export const PAGE_GROUND = 0x0b1016;

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
 * world for the HUD camera).
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
 * paused world as a fragment (mission §13: overlays render above the
 * world, never as partial frames). Depth −1000 sits under every panel.
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

/**
 * Room scenes: the main camera renders the WORLD at WORLD_ZOOM and a
 * second camera renders the 800×600 design-space HUD. Objects authored
 * with `scrollFactor(0)` are HUD (see installHudObjectTracker), everything
 * else is world — no call site needs to know which camera draws it.
 * Returns the HUD camera.
 */
export function attachWorldAndHudCameras(
  scene: Phaser.Scene,
): Phaser.Cameras.Scene2D.Camera {
  const world = scene.cameras.main;

  world.setViewport(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  world.setZoom(WORLD_ZOOM);
  world.setRoundPixels(true);

  const hud = scene.cameras.add(
    0,
    0,
    CANVAS_WIDTH,
    CANVAS_HEIGHT,
    false,
    'hud',
  );

  fitDesignCamera(hud);

  const worldBit = world.id;
  const hudBit = hud.id;
  const hudObjects = installHudObjectTracker(scene);
  const classify = () => {
    for (const child of scene.children.list) {
      child.cameraFilter = hudObjects.has(child) ? worldBit : hudBit;
    }
  };

  classify();
  // Runs after the tracker's PRE_RENDER pass (registered first).
  scene.events.on(Phaser.Scenes.Events.PRE_RENDER, classify);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.PRE_RENDER, classify);
  });

  return hud;
}

/** World point → design-space point (for HUD elements that track a target). */
export function worldToDesign(
  camera: Phaser.Cameras.Scene2D.Camera,
  x: number,
  y: number,
): { x: number; y: number } {
  // Phaser keeps `scrollX/Y` relative to the UNZOOMED viewport and zooms
  // about its centre; `worldView` is the visible world rectangle.
  const canvasX = (x - camera.worldView.x) * camera.zoom;
  const canvasY = (y - camera.worldView.y) * camera.zoom;

  return {
    x: (canvasX - DESIGN_OFFSET_X) / DESIGN_SCALE,
    y: (canvasY - DESIGN_OFFSET_Y) / DESIGN_SCALE,
  };
}

/** World point → canvas point (DEV probes that report screen rectangles). */
export function worldToCanvas(
  camera: Phaser.Cameras.Scene2D.Camera,
  x: number,
  y: number,
): { x: number; y: number } {
  return {
    x: (x - camera.worldView.x) * camera.zoom,
    y: (y - camera.worldView.y) * camera.zoom,
  };
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

  const camera = scene.cameras.main;
  const hud = scene.cameras.getCamera('hud');
  const bounds = camera.getBounds();

  window.__cameraProbe = {
    scene: scene.scene.key,
    zoom: camera.zoom,
    scrollX: camera.scrollX,
    scrollY: camera.scrollY,
    viewX: camera.worldView.x,
    viewY: camera.worldView.y,
    viewWidth: camera.worldView.width,
    viewHeight: camera.worldView.height,
    boundsWidth: bounds.width,
    boundsHeight: bounds.height,
    hudZoom: hud?.zoom ?? null,
    roundPixels: camera.roundPixels,
  };
}
