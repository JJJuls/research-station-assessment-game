import type { RawGameEvent } from './EventLogger';
import type { SessionMetadata } from './SessionState';

export interface GameSummaryVariables {
  participant_id: string;
  game_session_id: string;
  condition: string;
  game_version: string;
  completed: boolean;
  elapsed_seconds: number;
  game_persistence_total: number;
  game_difficulty_persistence: number;
  game_uncertainty_persistence: number;
  game_inappropriate_persistence: number;
  failure_adaptation_index: number;
  blind_retry_count: number;
  strategy_revision_count: number;
  abandonment_count: number;
  manual_or_feedback_used: boolean;
  objective_completed: boolean;
  responsibility_report_count: number;
  responsibility_adaptive_count: number;
  responsibility_shortcut_count: number;
  responsibility_supervision_used: boolean;
  responsibility_prepared_report: boolean;
  organization_prep_count: number;
  organization_systematic_count: number;
  organization_disorganized_count: number;
  organization_cleanup_count: number;
  organization_checklist_used: boolean;
  organization_kit_verified: boolean;
  organization_shortcut_count: number;
}

export interface ComputeSummaryInput {
  metadata: SessionMetadata;
  elapsed_seconds: number;
  completed?: boolean;
  events?: readonly RawGameEvent[];
}

export function computeSummary(
  input: ComputeSummaryInput,
): GameSummaryVariables {
  const events = input.events ?? [];
  const eventCounts = countEventTypes(events);
  const blindRetryCount =
    eventCounts.archive_same_wrong_code_repeated +
    eventCounts.repair_same_sequence_repeated +
    eventCounts.hazard_reckless_continue;
  const strategyRevisionCount =
    eventCounts.archive_strategy_revision +
    eventCounts.repair_strategy_revision +
    eventCounts.hazard_info_checked;
  const abandonmentCount = eventCounts.hazard_avoidance;
  const manualOrFeedbackUsed =
    eventCounts.archive_feedback_used > 0 || eventCounts.repair_manual_used > 0;
  const objectiveCompleted =
    input.completed === true || eventCounts.objective_completed > 0;
  const gameDifficultyPersistence =
    eventCounts.archive_feedback_used +
    eventCounts.archive_strategy_revision +
    eventCounts.archive_completed +
    eventCounts.repair_manual_used +
    eventCounts.repair_strategy_revision +
    eventCounts.repair_completed;
  const gameUncertaintyPersistence =
    eventCounts.hazard_info_checked + eventCounts.hazard_informed_continue;
  const gameInappropriatePersistence = blindRetryCount;
  const failureAdaptationIndex =
    strategyRevisionCount +
    Number(manualOrFeedbackUsed) +
    eventCounts.archive_completed +
    eventCounts.repair_completed +
    eventCounts.hazard_informed_continue -
    blindRetryCount -
    abandonmentCount;
  const gamePersistenceTotal = Math.max(
    0,
    gameDifficultyPersistence +
      gameUncertaintyPersistence +
      Math.max(failureAdaptationIndex, 0) -
      gameInappropriatePersistence,
  );
  const responsibilityReportCount =
    eventCounts.engineer_report_submitted_unprepared +
    eventCounts.engineer_report_submitted_prepared +
    eventCounts.engineer_report_submitted_supervised;
  const responsibilityPreparedReport =
    eventCounts.engineer_evidence_reviewed > 0 ||
    eventCounts.engineer_report_submitted_prepared > 0 ||
    eventCounts.engineer_report_submitted_supervised > 0;
  const organizationPrepCount =
    eventCounts.inventory_prep_shortcut +
    eventCounts.inventory_systematic_prep +
    eventCounts.inventory_cleanup_completed;
  const organizationCleanupCount =
    eventCounts.inventory_workspace_sorted +
    eventCounts.inventory_cleanup_completed;

  return {
    participant_id: input.metadata.participant_id,
    game_session_id: input.metadata.game_session_id,
    condition: input.metadata.condition,
    game_version: input.metadata.game_version,
    completed: objectiveCompleted,
    elapsed_seconds: input.elapsed_seconds,
    game_persistence_total: gamePersistenceTotal,
    game_difficulty_persistence: gameDifficultyPersistence,
    game_uncertainty_persistence: gameUncertaintyPersistence,
    game_inappropriate_persistence: gameInappropriatePersistence,
    failure_adaptation_index: failureAdaptationIndex,
    blind_retry_count: blindRetryCount,
    strategy_revision_count: strategyRevisionCount,
    abandonment_count: abandonmentCount,
    manual_or_feedback_used: manualOrFeedbackUsed,
    objective_completed: objectiveCompleted,
    responsibility_report_count: responsibilityReportCount,
    responsibility_adaptive_count: eventCounts.engineer_responsibility_adaptive,
    responsibility_shortcut_count: eventCounts.engineer_responsibility_shortcut,
    responsibility_supervision_used:
      eventCounts.engineer_clarification_requested > 0,
    responsibility_prepared_report: responsibilityPreparedReport,
    organization_prep_count: organizationPrepCount,
    organization_systematic_count: eventCounts.inventory_systematic_prep,
    organization_disorganized_count: eventCounts.inventory_disorganized_action,
    organization_cleanup_count: organizationCleanupCount,
    organization_checklist_used: eventCounts.inventory_checklist_used > 0,
    organization_kit_verified: eventCounts.inventory_kit_verified > 0,
    organization_shortcut_count: eventCounts.inventory_prep_shortcut,
  };
}

function countEventTypes(events: readonly RawGameEvent[]) {
  return {
    archive_attempt: countEvents(events, 'archive_attempt'),
    archive_wrong_code: countEvents(events, 'archive_wrong_code'),
    archive_same_wrong_code_repeated: countEvents(
      events,
      'archive_same_wrong_code_repeated',
    ),
    archive_feedback_used: countEvents(events, 'archive_feedback_used'),
    archive_strategy_revision: countEvents(events, 'archive_strategy_revision'),
    archive_completed: countEvents(events, 'archive_completed'),
    repair_attempt: countEvents(events, 'repair_attempt'),
    repair_failed: countEvents(events, 'repair_failed'),
    repair_same_sequence_repeated: countEvents(
      events,
      'repair_same_sequence_repeated',
    ),
    repair_manual_used: countEvents(events, 'repair_manual_used'),
    repair_strategy_revision: countEvents(events, 'repair_strategy_revision'),
    repair_completed: countEvents(events, 'repair_completed'),
    hazard_info_checked: countEvents(events, 'hazard_info_checked'),
    hazard_reckless_continue: countEvents(events, 'hazard_reckless_continue'),
    hazard_informed_continue: countEvents(events, 'hazard_informed_continue'),
    hazard_avoidance: countEvents(events, 'hazard_avoidance'),
    objective_completed: countEvents(events, 'objective_completed'),
    engineer_report_submitted_unprepared: countEvents(
      events,
      'engineer_report_submitted_unprepared',
    ),
    engineer_report_submitted_prepared: countEvents(
      events,
      'engineer_report_submitted_prepared',
    ),
    engineer_report_submitted_supervised: countEvents(
      events,
      'engineer_report_submitted_supervised',
    ),
    engineer_responsibility_adaptive: countEvents(
      events,
      'engineer_responsibility_adaptive',
    ),
    engineer_responsibility_shortcut: countEvents(
      events,
      'engineer_responsibility_shortcut',
    ),
    engineer_clarification_requested: countEvents(
      events,
      'engineer_clarification_requested',
    ),
    engineer_evidence_reviewed: countEvents(
      events,
      'engineer_evidence_reviewed',
    ),
    inventory_prep_shortcut: countEvents(events, 'inventory_prep_shortcut'),
    inventory_systematic_prep: countEvents(events, 'inventory_systematic_prep'),
    inventory_cleanup_completed: countEvents(
      events,
      'inventory_cleanup_completed',
    ),
    inventory_disorganized_action: countEvents(
      events,
      'inventory_disorganized_action',
    ),
    inventory_workspace_sorted: countEvents(
      events,
      'inventory_workspace_sorted',
    ),
    inventory_checklist_used: countEvents(events, 'inventory_checklist_used'),
    inventory_kit_verified: countEvents(events, 'inventory_kit_verified'),
  };
}

function countEvents(events: readonly RawGameEvent[], eventType: string) {
  return events.filter((event) => event.event_type === eventType).length;
}
