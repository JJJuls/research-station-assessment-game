/**
 * Inventory UI visual language (interactive inventory foundation).
 *
 * Adult industrial/scientific styling consistent with the outpost's
 * existing palette (station placeholder tiles, prompt panels, HUD chips):
 * deep blue-gray surfaces, thin steel strokes, a single emissive-cyan
 * interaction accent, dull amber for caution and muted red for danger.
 * No dialogue-card styling, no debug text.
 */

export const INV_COLORS = {
  /** Full-screen dimmer behind the overlay. */
  dim: 0x000000,
  dimAlpha: 0.62,
  /** Main panel surface and border. */
  panel: 0x121a24,
  panelStroke: 0x33475a,
  /** Section headers / sub-panels. */
  section: 0x16202c,
  /** Slot cell fill and border. */
  slot: 0x0d141c,
  slotStroke: 0x2b3a4a,
  /** Hotbar cells get a subtly distinct fill so the quick-access row
   *  reads as its own device. */
  hotbarSlot: 0x101c22,
  hotbarStroke: 0x3d5a5a,
  /** Interaction accent (focus ring, valid drop target, selection). */
  accent: 0x5fd3c4,
  /** Reserved source slot while its stack is held/dragged. */
  reserved: 0x2e3e4c,
  /** Non-player container slots (storage/workbench/workstations). */
  containerSlot: 0x14202c,
  containerStroke: 0x3a4d61,
  /** Valid drop target fill tint (accent-leaning). */
  dropValidFill: 0x16342f,
  /** Invalid drop target / refused action. */
  invalid: 0x8c4a4a,
  /** Caution (discard confirm). */
  caution: 0xd9a066,
  /** Text tones. */
  text: 0xe8eef4,
  textDim: 0x9fb2c1,
  textFaint: 0x62788a,
} as const;

export const INV_TEXT = {
  text: '#e8eef4',
  dim: '#9fb2c1',
  faint: '#62788a',
  accent: '#5fd3c4',
  caution: '#d9a066',
  invalid: '#e08c8c',
} as const;

export const INV_FONT = {
  title: '16px monospace',
  section: '13px monospace',
  body: '12px monospace',
  small: '11px monospace',
  qty: '11px monospace',
} as const;

/** Slot grid metrics. */
export const SLOT_SIZE = 42;
export const SLOT_GAP = 5;
export const SLOT_PITCH = SLOT_SIZE + SLOT_GAP;

/** Honour the OS reduced-motion preference (effects.ts precedent). */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
