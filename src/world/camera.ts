/**
 * World camera controller (World V1 — docs/game/world-v1/CAMERA-AND-SCALE-SPEC.md §3).
 *
 * Pure follow model, Node-importable: a dead zone around the view centre,
 * a bounded lerp toward the dead-zone-corrected target, room bounds
 * (rooms smaller than the view are centred), and whole-pixel scroll
 * snapping for the plate render. Presentation only: nothing here reads or
 * writes measurement state, and the camera never moves while the avatar
 * idles inside the dead zone.
 */

export interface WorldCameraConfig {
  viewWidth: number;
  viewHeight: number;
  /** Dead zone size (world px), centred in the view. */
  deadZoneWidth?: number;
  deadZoneHeight?: number;
  /** Per-frame lerp factor toward the corrected target (0 < lerp ≤ 1). */
  lerp?: number;
}

export interface WorldView {
  x: number;
  y: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

export const DEFAULT_DEAD_ZONE_WIDTH = 96;
export const DEFAULT_DEAD_ZONE_HEIGHT = 64;
export const DEFAULT_FOLLOW_LERP = 0.12;

export class WorldCameraController {
  readonly viewWidth: number;
  readonly viewHeight: number;
  readonly deadZoneWidth: number;
  readonly deadZoneHeight: number;
  readonly lerp: number;

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
    this.lerp = Math.min(1, Math.max(0.01, config.lerp ?? DEFAULT_FOLLOW_LERP));
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

  /**
   * One frame of following. The target is only pushed toward the view
   * centre once it leaves the dead zone; inside the dead zone the camera
   * holds still (idle animation never moves it).
   */
  update(targetX: number, targetY: number) {
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

    const desiredX = this.clampX(centreX - this.viewWidth / 2);
    const desiredY = this.clampY(centreY - this.viewHeight / 2);

    this.scrollX = this.ease(this.scrollX, desiredX);
    this.scrollY = this.ease(this.scrollY, desiredY);
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

  private ease(current: number, desired: number): number {
    const next = current + (desired - current) * this.lerp;

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
