/**
 * Information Processing overlay language.
 *
 * Reuses the inventory foundation's professional palette and type scale
 * (deep blue-gray surfaces, thin steel strokes, one emissive-cyan accent,
 * dull amber caution, muted red refusal) so every overlay on the station
 * reads as one system. Adds the channel tones the signal tasks need and
 * the shared 800×600 panel metrics. No coupling to the inventory store.
 */

import {
  INV_COLORS,
  INV_FONT,
  INV_TEXT,
  prefersReducedMotion,
} from '../../inventory/ui/theme';

export { INV_COLORS as IP_COLORS, INV_FONT as IP_FONT, INV_TEXT as IP_TEXT };
export { prefersReducedMotion };

/** Channel / origin tones (fill, stroke) — distinguishable, not loud. */
export const IP_TONES = {
  alpha: { fill: 0x1b2f3f, stroke: 0x4f8fb3, text: '#8fc6e6' },
  beta: { fill: 0x2f2a1b, stroke: 0xb38f4f, text: '#e6c68f' },
  gamma: { fill: 0x1f2f27, stroke: 0x5fb38f, text: '#9fe6c6' },
  neutral: { fill: 0x16202c, stroke: 0x3a4d61, text: '#9fb2c1' },
  accent: { fill: 0x1c3b3a, stroke: 0x5fd3c4, text: '#5fd3c4' },
} as const;

/** Shared modal panel (inventory precedent). */
export const IP_PANEL = { x: 40, y: 42, width: 720, height: 516 } as const;

export const IP_DEPTH = {
  dim: 18,
  panel: 20,
  content: 22,
  chip: 24,
  ghost: 60,
  confirm: 70,
} as const;

/** Common close-key wording shown on every IP overlay help line. */
export const IP_LEAVE_HINT = 'ESC leaves (work stays)';
