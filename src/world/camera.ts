/**
 * World camera controller (World V1 — docs/game/world-v1/CAMERA-AND-SCALE-SPEC.md §5).
 *
 * Pure follow model, Node-importable: a dead zone around the view centre,
 * TIME-BASED damping toward the dead-zone-corrected target
 * (alpha = 1 − exp(−dt / τ), τ = 160 ms, ≈ 95 % settled in 0.48 s — the
 * same response at 20, 30 or 60 fps), room bounds (rooms smaller than the
 * view are centred), and whole-pixel scroll snapping for the plate render.
 * Presentation only: nothing here reads or writes measurement state, the
 * camera never moves while the avatar idles inside the dead zone, and it
 * is frozen while a modal owns the scene (the room's update loop stops).
 */

export interface WorldCameraConfig {
  viewWidth: number;
  viewHeight: number;
  /** Dead zone size (world px), centred in the view. */
  deadZoneWidth?: number;
  deadZoneHeight?: number;
  /** Damping time constant (ms). */
  timeConstantMs?: number;
}

export interface WorldView {
  x: number;
  y: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

/**
 * Dead zone sized for the 640×360 field (~15% of the view each axis;
 * the previous 128×80 zone was authored for the 1280×720 field).
 * 0.16 s time constant unchanged.
 */
export const DEFAULT_DEAD_ZONE_WIDTH = 96;
export const DEFAULT_DEAD_ZONE_HEIGHT = 56;
export const DEFAULT_TIME_CONSTANT_MS = 160;

/** Frame deltas above this (tab switch, load stall) are clamped. */
const MAX_STEP_MS = 100;

export class WorldCameraController {
  readonly viewWidth: number;
  readonly viewHeight: number;
  readonly deadZoneWidth: number;
  readonly deadZoneHeight: number;
  readonly timeConstantMs: number;

  private boundsWidth = Number.POSITIVE_INFINITY;
  private boundsHeight = Number.POSITIVE_INFINITY;
  /** Smoothed (fractional) scroll. */
  private scrollX = 0;
  private scrollY = 0;

  constructor(config: WorldCameraConfig) {
    this.viewWidth = config.viewWidth;
    this.viewHeight = config.viewHeight;
    this.deadZoneWidth = config.deadZoneWidth ?? DEFAULT_DEAD_ZONE_WIDTH;
    this.deadZoneHeight = config.deadZoneHeight ?? DEFAULT_DEAD_ZONE_HEIGHT;
    this.timeConstantMs = Math.max(
      1,
      config.timeConstantMs ?? DEFAULT_TIME_CONSTANT_MS,
    );
  }

  setBounds(width: number, height: number) {
    this.boundsWidth = width;
    this.boundsHeight = height;
    this.scrollX = this.clampX(this.scrollX);
    this.scrollY = this.clampY(this.scrollY);
  }

  getBounds(): { width: number; height: number } {
    return { width: this.boundsWidth, height: this.boundsHeight };
  }

  /** Centres the view on a point immediately (scene entry, no easing). */
  snapTo(x: number, y: number) {
    this.scrollX = this.clampX(x - this.viewWidth / 2);
    this.scrollY = this.clampY(y - this.viewHeight / 2);
  }

  /** Places the view's top-left corner immediately (authored compositions). */
  snapScroll(x: number, y: number) {
    this.scrollX = this.clampX(x);
    this.scrollY = this.clampY(y);
  }

  /** The dead-zone-corrected desired scroll for a target (no easing). */
  desiredScroll(targetX: number, targetY: number): { x: number; y: number } {
    let centreX = this.scrollX + this.viewWidth / 2;
    let centreY = this.scrollY + this.viewHeight / 2;
    const halfW = this.deadZoneWidth / 2;
    const halfH = this.deadZoneHeight / 2;
    const dx = targetX - centreX;
    const dy = targetY - centreY;

    if (dx > halfW) {
      centreX += dx - halfW;
    } else if (dx < -halfW) {
      centreX += dx + halfW;
    }

    if (dy > halfH) {
      centreY += dy - halfH;
    } else if (dy < -halfH) {
      centreY += dy + halfH;
    }

    return {
      x: this.clampX(centreX - this.viewWidth / 2),
      y: this.clampY(centreY - this.viewHeight / 2),
    };
  }

  /**
   * One frame of following over `deltaMs`. The target is only pushed
   * toward the view centre once it leaves the dead zone; inside the dead
   * zone the camera holds still (idle animation never moves it).
   */
  update(targetX: number, targetY: number, deltaMs: number) {
    const desired = this.desiredScroll(targetX, targetY);
    const dt = Math.min(MAX_STEP_MS, Math.max(0, deltaMs));
    const alpha = 1 - Math.exp(-dt / this.timeConstantMs);

    this.scrollX = this.ease(this.scrollX, desired.x, alpha);
    this.scrollY = this.ease(this.scrollY, desired.y, alpha);
  }

  /** True when the smoothed scroll has reached its dead-zone target. */
  isSettled(targetX: number, targetY: number): boolean {
    const desired = this.desiredScroll(targetX, targetY);

    return (
      Math.abs(desired.x - this.scrollX) < 0.5 &&
      Math.abs(desired.y - this.scrollY) < 0.5
    );
  }

  /** Whole-pixel scroll for the plate render. */
  get renderScrollX(): number {
    return Math.round(this.scrollX);
  }

  get renderScrollY(): number {
    return Math.round(this.scrollY);
  }

  /** The visible world rectangle (whole pixels). */
  get view(): WorldView {
    const x = this.renderScrollX;
    const y = this.renderScrollY;

    return {
      x,
      y,
      width: this.viewWidth,
      height: this.viewHeight,
      right: x + this.viewWidth,
      bottom: y + this.viewHeight,
    };
  }

  private ease(current: number, desired: number, alpha: number): number {
    const next = current + (desired - current) * alpha;

    return Math.abs(desired - next) < 0.5 ? desired : next;
  }

  private clampX(scroll: number): number {
    return clampScroll(scroll, this.boundsWidth, this.viewWidth);
  }

  private clampY(scroll: number): number {
    return clampScroll(scroll, this.boundsHeight, this.viewHeight);
  }
}

/**
 * Scroll clamp: inside [0, bounds − view] when the room is larger than the
 * view; the room is centred (negative scroll) when it is smaller.
 */
export function clampScroll(
  scroll: number,
  boundsSize: number,
  viewSize: number,
): number {
  if (!Number.isFinite(boundsSize)) {
    return scroll;
  }

  if (boundsSize <= viewSize) {
    return (boundsSize - viewSize) / 2;
  }

  return Math.max(0, Math.min(boundsSize - viewSize, scroll));
}
