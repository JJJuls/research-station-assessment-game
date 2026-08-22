/**
 * Field-scanner signal model (field-actions foundation).
 *
 * Pure, deterministic, Phaser-free. One documented monotone formula maps
 * player→target distance to a 0-100 signal strength:
 *
 *   strength = round(100 × clamp(1 − distance / detectionRadius, 0, 1))
 *
 * Properties the tests hold us to: equal distances produce equal
 * strengths (pure function of its inputs); strength is monotonically
 * non-increasing in distance; values clamp to [0, 100]; the boundary
 * cases are exact (distance 0 → 100, distance ≥ radius → 0).
 *
 * The trend comparison is temporal only — the current scan against the
 * PRECEDING COMPARABLE scan (same opportunity context, same target). It
 * never encodes a direction toward the target and never exposes target
 * coordinates. Baseline scoping/reset belongs to the ScanController.
 *
 * Nothing here logs an event or computes a score.
 */

/** Default detection radius (px) for free-play calibration targets. */
export const SIGNAL_DETECTION_RADIUS = 240;

/** Scan cooldown (ms) between resolved scans — short and visible. */
export const SCAN_COOLDOWN_MS = 900;

/** Duration (ms) of the scan sweep world action (game-feel constant). */
export const SCAN_ACTION_DURATION_MS = 1000;

export type SignalCategory = 'none' | 'faint' | 'moderate' | 'strong';

export type SignalTrend = 'stronger' | 'weaker' | 'unchanged';

/**
 * The documented monotone strength formula. Distances are clamped at 0
 * (defensive; distances are Euclidean and never negative in practice).
 */
export function computeSignalStrength(
  distance: number,
  detectionRadius: number = SIGNAL_DETECTION_RADIUS,
): number {
  if (!(detectionRadius > 0)) {
    throw new Error(
      `Signal detection radius must be positive: ${detectionRadius}`,
    );
  }

  const safeDistance = Math.max(0, distance);
  const linear = 1 - safeDistance / detectionRadius;
  const clamped = Math.min(1, Math.max(0, linear));

  return Math.round(100 * clamped);
}

/**
 * Fixed category bands (identical for every participant):
 * 0 → none; 1-33 → faint; 34-66 → moderate; 67-100 → strong.
 */
export function categorizeSignal(strength: number): SignalCategory {
  if (strength <= 0) {
    return 'none';
  }

  if (strength <= 33) {
    return 'faint';
  }

  if (strength <= 66) {
    return 'moderate';
  }

  return 'strong';
}

/**
 * Temporal trend against the preceding comparable scan. `null` previous
 * (first scan of an opportunity/target pairing, or a baseline reset)
 * yields no trend.
 */
export function compareSignalTrend(
  previousStrength: number | null,
  currentStrength: number,
): SignalTrend | null {
  if (previousStrength === null) {
    return null;
  }

  if (currentStrength > previousStrength) {
    return 'stronger';
  }

  if (currentStrength < previousStrength) {
    return 'weaker';
  }

  return 'unchanged';
}

/** Participant-facing wording per category (neutral, non-directional). */
export const SIGNAL_CATEGORY_LABELS: Record<SignalCategory, string> = {
  none: 'NO SURVEY SIGNAL',
  faint: 'FAINT',
  moderate: 'MODERATE',
  strong: 'STRONG',
};

/** Participant-facing wording per trend (temporal, non-directional). */
export const SIGNAL_TREND_LABELS: Record<SignalTrend, string> = {
  stronger: 'stronger than last sweep',
  weaker: 'weaker than last sweep',
  unchanged: 'unchanged from last sweep',
};
