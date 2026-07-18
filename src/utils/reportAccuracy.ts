import { FIELD_KIT_ITEM_ID } from '../data/missionVocabulary';
import type { MissionState } from '../systems/SessionState';

/**
 * FABLE-NEXT-04 — pure report-accuracy evaluation substrate (Q09 raw
 * telemetry input; docs/game/rooms/03-engineer-hub.md).
 *
 * The Engineer report-content stage offers every combination of the two
 * checkable mission facts as an operational status statement. Both facts
 * are few, concrete and visible to the player earlier in the session
 * (memory/reading confound control — task file validity risks):
 *
 * - systems repair cycle complete — SessionState.completed_rooms
 *   ('systems_repair_room', written by RepairScene's success path);
 * - field kit packed — SessionState.prepared_items (FIELD_KIT_ITEM_ID,
 *   written by InventoryScene only when the requisition is complete).
 *
 * Evaluation is silent: nothing here produces player-facing feedback, and
 * no grade is ever displayed. The result feeds only the unmapped raw event
 * engineer_report_accuracy_scored (event-schema.md §4 Engineer Hub).
 * Computing the approved-but-missing report_accuracy_score derived
 * variable from it is D2-family scoring work, NOT done here.
 */

export interface ReportClaim {
  /** Player-facing operational status statement (no moral labels). */
  label: string;
  claimed_systems_repair_complete: boolean;
  claimed_field_kit_packed: boolean;
}

/** The two checkable facts, read from live mission state. */
export interface ReportFacts {
  systems_repair_complete: boolean;
  field_kit_packed: boolean;
}

export interface ReportAccuracyResult {
  /** True iff every checkable fact in the submitted claim is correct. */
  success: boolean;
  /** 0-1 proportion of checkable facts the submitted claim got right. */
  accuracy: number;
  facts_total: number;
  facts_correct: number;
  actual_systems_repair_complete: boolean;
  actual_field_kit_packed: boolean;
}

/**
 * Fixed template order — never reordered or filtered by mission state, so
 * option numbering stays deterministic for participants and specs alike
 * (U3 renderer rule: options are never randomised). Exactly one claim is
 * fully accurate in any mission state.
 */
export const REPORT_CLAIMS: readonly ReportClaim[] = [
  {
    label: 'Report: systems repair cycle logged complete; field kit packed.',
    claimed_systems_repair_complete: true,
    claimed_field_kit_packed: true,
  },
  {
    label:
      'Report: systems repair cycle logged complete; field kit not packed.',
    claimed_systems_repair_complete: true,
    claimed_field_kit_packed: false,
  },
  {
    label: 'Report: systems repair cycle still open; field kit packed.',
    claimed_systems_repair_complete: false,
    claimed_field_kit_packed: true,
  },
  {
    label: 'Report: systems repair cycle still open; field kit not packed.',
    claimed_systems_repair_complete: false,
    claimed_field_kit_packed: false,
  },
];

export function getReportFacts(mission: MissionState): ReportFacts {
  return {
    systems_repair_complete: mission.completed_rooms.includes(
      'systems_repair_room',
    ),
    field_kit_packed: mission.prepared_items.includes(FIELD_KIT_ITEM_ID),
  };
}

export function evaluateReportAccuracy(
  claim: ReportClaim,
  mission: MissionState,
): ReportAccuracyResult {
  const facts = getReportFacts(mission);
  const checks = [
    claim.claimed_systems_repair_complete === facts.systems_repair_complete,
    claim.claimed_field_kit_packed === facts.field_kit_packed,
  ];
  const factsCorrect = checks.filter(Boolean).length;

  return {
    success: factsCorrect === checks.length,
    accuracy: factsCorrect / checks.length,
    facts_total: checks.length,
    facts_correct: factsCorrect,
    actual_systems_repair_complete: facts.systems_repair_complete,
    actual_field_kit_packed: facts.field_kit_packed,
  };
}
