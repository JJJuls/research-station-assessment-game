import type { DataQualityMetrics } from './DataQualityTracker';
import type { RawGameEvent } from './EventLogger';
import type { SessionMetadata } from './SessionState';

export interface GameSummaryVariables {
  participant_id: string;
  game_session_id: string;
  condition: string;
  game_version: string;
  completed: boolean;
  elapsed_seconds: number;
  game_proactive_total: number;
  game_detection_score: number;
  game_information_seeking_score: number;
  game_initiation_score: number;
  game_persistence_score: number;
  game_social_calibration_score: number;
  game_goal_balance_score: number;
  interaction_count: number;
  wrong_interactions: number;
  focus_loss_count: number;
  focus_loss_seconds: number;
  technical_error_count: number;
}

export interface ComputeSummaryInput {
  metadata: SessionMetadata;
  elapsed_seconds: number;
  completed?: boolean;
  events?: readonly RawGameEvent[];
  data_quality?: DataQualityMetrics;
}

export function computeSummary(
  input: ComputeSummaryInput,
): GameSummaryVariables {
  const events = input.events ?? [];
  const dataQuality = input.data_quality ?? {
    focus_loss_count: 0,
    focus_loss_seconds: 0,
    technical_error_count: 0,
  };

  return {
    participant_id: input.metadata.participant_id,
    game_session_id: input.metadata.game_session_id,
    condition: input.metadata.condition,
    game_version: input.metadata.game_version,
    completed: input.completed ?? false,
    elapsed_seconds: input.elapsed_seconds,
    game_proactive_total: 0,
    game_detection_score: 0,
    game_information_seeking_score: 0,
    game_initiation_score: 0,
    game_persistence_score: 0,
    game_social_calibration_score: 0,
    game_goal_balance_score: 0,
    interaction_count: events.filter(
      (event) => event.event_type === 'interaction',
    ).length,
    wrong_interactions: events.filter(
      (event) => event.event_type === 'wrong_interaction',
    ).length,
    focus_loss_count: dataQuality.focus_loss_count,
    focus_loss_seconds: dataQuality.focus_loss_seconds,
    technical_error_count: dataQuality.technical_error_count,
  };
}
