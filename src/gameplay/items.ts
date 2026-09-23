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
  // Station 080 M11 (Unit 3): the two borrowed instruments. Personal
  // property of an NPC, carried on loan; neither is required by any task
  // and neither unlocks anything (custody is the observation).
  {
    item_id: 'kai_field_probe',
    label: "Field Probe (Kai's)",
    icon: 'proc-icon-diagnostic-probe',
    description:
      "Kai's hand-held field probe, on loan. Hand it back to Kai or leave it on the signal analysis workstation before leaving the laboratory.",
    tags: ['tool'],
  },
  {
    item_id: 'noor_torque_driver',
    label: "Torque Driver (Noor's)",
    icon: 'proc-icon-torque-driver',
    description:
      "Noor's torque driver, on loan. Hand it back to Noor or put it back in the yard supply crate before leaving the yard.",
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
    item_id: 'relay_unit',
    label: 'Relay Unit',
    icon: 'proc-icon-relay-board',
    description:
      'Distribution relay unit released from the workshop relay bench on the return shift. Goes to the outbound handover tray.',
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
  // ——— Coolant red line (action-assessment rebuild, Unit 2) ———
  {
    item_id: 'pipe_segment',
    label: 'Pipe Segment',
    icon: 'proc-icon-pipe-segment',
    description:
      'Straight coolant line section, reclaimed from the yard. The Pump House parts run wants it.',
    tags: ['component'],
  },
  {
    item_id: 'pipe_elbow',
    label: 'Pipe Elbow',
    icon: 'proc-icon-pipe-elbow',
    description:
      'Angled coolant line section, reclaimed from the yard. The Pump House parts run wants it.',
    tags: ['component'],
  },
  {
    item_id: 'ore_chunk',
    label: 'Ore Chunk',
    icon: 'proc-icon-ore-chunk',
    description:
      'Dense mineral chunk turned up by the survey. Goes to the materials tally at handover.',
    tags: ['sample'],
  },
  {
    item_id: 'scrap_plate',
    label: 'Scrap Plate',
    icon: 'proc-icon-scrap-plate',
    description:
      'Bent alloy plate from the old line. Goes to the reclaim tally at handover.',
    tags: ['sample'],
  },
  {
    item_id: 'heat_canister',
    label: 'Heat Canister',
    icon: 'proc-icon-heat-canister',
    description:
      'Single-use exothermic canister. Thaws frozen fittings and iced housings.',
    tags: ['tool'],
  },
  {
    item_id: 'pry_bar',
    label: 'Pry Bar',
    icon: 'proc-icon-pry-bar',
    description:
      'Hardened leverage bar. Frees seized housings once they have some give.',
    tags: ['tool'],
  },
  {
    item_id: 'coolant_coupling',
    label: 'Coolant Coupling',
    icon: 'proc-icon-coolant-coupling',
    description:
      'The heavy line coupling freed from the frozen housing. The pump intake needs it.',
    tags: ['component'],
  },
  {
    item_id: 'valve_seal',
    label: 'Valve Seal',
    icon: 'proc-icon-valve-seal',
    description:
      'Fresh relief-valve seat ring from the yard supply crate. Replaces the cracked shop-stock seal.',
    tags: ['component'],
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
