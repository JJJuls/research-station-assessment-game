import type { InteractionKey } from '../world';

/**
 * Pilot ethical-decision scenario framework — configuration types.
 *
 * A scenario is a self-contained, station-triggered decision episode layered
 * on top of the existing RoomScene prompt machinery (U3 stage chaining):
 *
 *   briefing -> (optional) evidence inspection -> decision -> confirm/revise
 *   -> commit -> consequence -> completion (one-shot).
 *
 * GOVERNANCE (authority hierarchy, CLAUDE.md): every `scenario_*` event this
 * framework emits is PILOT-DEVELOPMENT TELEMETRY ONLY. The event names are
 * candidates, not canonical schema entries — they are deliberately absent
 * from CANONICAL_EVENT_CONTEXT (no study_item_ids, no construct_id, no
 * success), absent from ScoringManager, and never Q-mapped. Promoting any of
 * them into docs/research/event-schema.md or scoring-plan.md is a research-
 * owner decision, not something this module may do.
 */

/** One inspectable evidence entry, offered from the scenario briefing. */
export interface ScenarioEvidenceDef {
  /** Stable evidence id (logged in scenario_evidence_* metadata). */
  id: string;
  /** Menu option label shown in the briefing stage (in-fiction). */
  label: string;
  /** Evidence panel body text (in-fiction). */
  body: string;
  /**
   * Marks "optional additional information": opening it additionally logs
   * scenario_optional_info_requested (information-search telemetry).
   */
  optional?: boolean;
}

/** One committable choice (single mode) or slot candidate (ordered mode). */
export interface ScenarioChoiceOptionDef {
  /** Stable option/candidate id (logged as choice_value). */
  id: string;
  /** Player-facing option label (in-fiction; no questionnaire wording). */
  label: string;
}

/** Resolved outcome for one committed decision value. */
export interface ScenarioOutcome {
  /** Consequence panel body shown immediately after commit (in-fiction). */
  consequence: string;
  /** Feedback toast after the consequence is acknowledged. */
  acknowledgeFeedback?: string;
}

/** Single-choice decision: pick one option, confirm or reconsider, commit. */
export interface SingleChoiceDecisionDef {
  mode: 'single';
  /** Decision stage body text. */
  prompt: string;
  options: ScenarioChoiceOptionDef[];
  /** Extra line shown on the confirm stage above Commit/Reconsider. */
  confirmHint?: string;
}

/**
 * Ordered-picks decision (reusable ordering component): assign each slot in
 * `slotLabels` order from `candidates` (no repeats), review the complete
 * allocation, then commit or revise. The committed value is the picked ids
 * joined with '>' in slot order (e.g. "cryostore>life_support").
 */
export interface OrderedPicksDecisionDef {
  mode: 'ordered';
  /** Decision stage body text (restate the performance target here). */
  prompt: string;
  /** One label per slot, in assignment order. Must be < candidates count. */
  slotLabels: string[];
  candidates: ScenarioChoiceOptionDef[];
  /** Extra line shown on the review stage above Commit/Revise. */
  confirmHint?: string;
}

export type ScenarioDecisionDef =
  | SingleChoiceDecisionDef
  | OrderedPicksDecisionDef;

/** Complete configuration for one pilot scenario. */
export interface ScenarioDefinition {
  /** Stable scenario id — metadata.scenario_id on every logged event. */
  id: string;
  /**
   * researchInteractions registry key for the scenario station (supplies
   * room_id / object_id / episode context on every event).
   */
  interactionKey: InteractionKey;
  /** Station marker label in the room (in-fiction). */
  stationLabel: string;
  /** Briefing/overview stage body (in-fiction; states the situation). */
  briefing: string;
  /** Inspectable evidence, in fixed display order (0-7 entries). */
  evidence: ScenarioEvidenceDef[];
  decision: ScenarioDecisionDef;
  /** Label of the briefing option that opens the decision stage. */
  decideOptionLabel?: string;
  /** Label of the briefing option that closes the panel without deciding. */
  stepAwayLabel?: string;
  /** Feedback toast when the player steps away before committing. */
  stepAwayFeedback?: string;
  /** One-shot gate feedback once the scenario is completed (in-fiction). */
  completedFeedback: string;
  /** Maps a committed decision value to its visible consequence. */
  resolveOutcome: (committedValue: string) => ScenarioOutcome;
}
