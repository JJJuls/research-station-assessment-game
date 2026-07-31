/**
 * Gameplay item registry (overnight playable prototype, Unit 1).
 *
 * This is the PLAYER-FACING inventory item catalogue for the embodied
 * gameplay route (collect / carry / use / install / deliver). It is
 * deliberately separate from src/data/itemRegistry.ts, which remains the
 * untouched Q01-Q04 kit-preparation measurement substrate — the two item
 * layers never share state, and nothing here feeds a measurement variable.
 *
 * Labels are operational fiction only (anti-leakage rule): no questionnaire
 * wording, no trait language. Icons come from the proc-icon-* foundry
 * (proceduralTextures.ts) and are identity-only.
 */

export type GameItemTag =
  | 'tool'
  | 'component'
  | 'sample'
  | 'document'
  | 'container';

export interface GameItemDefinition {
  /** Stable id — used as object_id on prototype telemetry events. */
  item_id: string;
  label: string;
  /** proc-icon-* texture key (identity glyph, never validity). */
  icon: string;
  /** One-line in-fiction description shown on inspect. */
  description: string;
  tags: readonly GameItemTag[];
}

export const GAME_ITEM_REGISTRY: readonly GameItemDefinition[] = [
  {
    item_id: 'field_scanner',
    label: 'Field Scanner',
    icon: 'proc-icon-field-scanner',
    description:
      'Handheld subsurface scanner. Reads density anomalies at marked survey points.',
    tags: ['tool'],
  },
  {
    item_id: 'excavation_spade',
    label: 'Excavation Spade',
    icon: 'proc-icon-excavation-spade',
    description:
      'Compact powered spade for frozen regolith. Required for sample extraction.',
    tags: ['tool'],
  },
  {
    item_id: 'sample_case',
    label: 'Sample Case',
    icon: 'proc-icon-sample-case',
    description:
      'Insulated carry case. Keeps extracted cores stable during transport.',
    tags: ['container'],
  },
  {
    item_id: 'core_sample',
    label: 'Core Sample',
    icon: 'proc-icon-core-sample',
    description:
      'Extracted subsurface core. The survey lab needs it delivered intact.',
    tags: ['sample'],
  },
  {
    item_id: 'relay_coupling',
    label: 'Relay Coupling',
    icon: 'proc-icon-relay-coupling',
    description:
      'Salvaged antenna relay coupling. Fits the exterior feed housing.',
    tags: ['component'],
  },
  {
    item_id: 'flux_calibrator',
    label: 'Flux Calibrator',
    icon: 'proc-icon-flux-calibrator',
    description:
      'Bench calibration unit for field instruments. Stored in the calibration locker.',
    tags: ['tool'],
  },
] as const;

export function getGameItem(itemId: string): GameItemDefinition {
  const item = GAME_ITEM_REGISTRY.find((entry) => entry.item_id === itemId);

  if (item === undefined) {
    throw new Error(`Unknown gameplay item: ${itemId}`);
  }

  return item;
}

export function isKnownGameItem(itemId: string): boolean {
  return GAME_ITEM_REGISTRY.some((entry) => entry.item_id === itemId);
}
