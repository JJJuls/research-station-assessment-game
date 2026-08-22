/**
 * Hidden-target registry for the field scanner (field-actions foundation).
 *
 * Pure, deterministic, Phaser-free. A scene registers its hidden survey
 * targets (fixed or counterbalanced-by-recorded-form positions — never
 * uncontrolled random placement) and the scanner resolves one reading
 * per scan from the player's position.
 *
 * "Nearest eligible" resolution: among ACTIVE targets whose distance is
 * within their own detection radius, the one with the highest signal
 * strength wins (ties broken by smaller distance, then by target id, so
 * the resolution is total and deterministic). When no active target is
 * in radius the reading is a neutral no-signal with no target identity
 * attached — indoor/off-range scans therefore return "no survey signal"
 * with zero information leakage about hidden positions.
 *
 * Nothing here logs an event or computes a score.
 */

import { computeSignalStrength } from './signalModel';

export interface FieldTarget {
  /** Stable target id (recorded on scan telemetry). */
  target_id: string;
  x: number;
  y: number;
  /** Per-target detection radius (px); fixed per form. */
  detection_radius: number;
  /** Recorded placement form ('fixed', 'form_a', 'form_b', ...). */
  form_id: string;
  /** Owning zone tag ('calibration', 'm23_plot', 'm26_control', ...). */
  zone_id: string;
  /** Inactive targets are invisible to the scanner (window gating). */
  active: boolean;
  /** A recovered/revealed target stops signalling. */
  recovered: boolean;
}

export interface TargetReading {
  target: FieldTarget;
  distance: number;
  strength: number;
}

export class FieldTargetRegistry {
  private readonly targets = new Map<string, FieldTarget>();

  register(target: FieldTarget): void {
    if (this.targets.has(target.target_id)) {
      throw new Error(`Duplicate field target: ${target.target_id}`);
    }

    this.targets.set(target.target_id, { ...target });
  }

  get(targetId: string): FieldTarget {
    const target = this.targets.get(targetId);

    if (target === undefined) {
      throw new Error(`Unknown field target: ${targetId}`);
    }

    return target;
  }

  has(targetId: string): boolean {
    return this.targets.has(targetId);
  }

  setActive(targetId: string, active: boolean): void {
    this.get(targetId).active = active;
  }

  markRecovered(targetId: string): void {
    this.get(targetId).recovered = true;
  }

  /** Every target currently visible to the scanner. */
  private eligibleTargets(): FieldTarget[] {
    return [...this.targets.values()].filter(
      (target) => target.active && !target.recovered,
    );
  }

  /**
   * Resolves one scan reading from a world position, or null when no
   * eligible active target is inside its own detection radius.
   */
  resolveReading(x: number, y: number): TargetReading | null {
    let best: TargetReading | null = null;

    for (const target of this.eligibleTargets()) {
      const distance = Math.hypot(target.x - x, target.y - y);

      if (distance > target.detection_radius) {
        continue;
      }

      const strength = computeSignalStrength(distance, target.detection_radius);
      const candidate: TargetReading = { target, distance, strength };

      if (
        best === null ||
        candidate.strength > best.strength ||
        (candidate.strength === best.strength &&
          candidate.distance < best.distance) ||
        (candidate.strength === best.strength &&
          candidate.distance === best.distance &&
          candidate.target.target_id < best.target.target_id)
      ) {
        best = candidate;
      }
    }

    return best;
  }

  /** Test/scenario escape hatch. */
  reset(): void {
    this.targets.clear();
  }
}
