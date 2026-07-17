import type { PromptOption, PromptStage, RoomStationConfig } from '../world';
import type {
  OrderedPicksDecisionDef,
  ScenarioChoiceOptionDef,
  ScenarioDefinition,
  SingleChoiceDecisionDef,
} from './scenarioTypes';

/**
 * Pilot ethical-decision scenario engine.
 *
 * One ScenarioController is constructed per scene INSTANCE (scenes are
 * recreated by scene.start), but scenario progress lives at module scope for
 * the page-session lifetime (roomTaskState precedent: leave-and-return is
 * measured behaviour, so committed/completed state must survive room
 * transitions). A fresh page load — how every participant session and every
 * Playwright spec begins — starts from a clean state; specs can also import
 * resetAllScenarioStates directly (resetSessionOnceFlags precedent).
 *
 * Event identifiers (stable; pilot-development telemetry, deliberately
 * unmapped in CANONICAL_EVENT_CONTEXT — see scenarioTypes.ts governance
 * note). metadata.scenario_id is attached to every one:
 *
 * - scenario_entered            first briefing open of the session
 * - scenario_briefing_opened    every briefing open
 * - scenario_evidence_opened    evidence panel opened (evidence_id, optional)
 * - scenario_evidence_closed    evidence panel closed (evidence_id, dwell_ms)
 * - scenario_optional_info_requested  optional evidence opened (evidence_id)
 * - scenario_option_selected    complete or per-slot selection (choice_value)
 * - scenario_option_changed     complete selection differs from previous
 * - scenario_decision_committed final commit (choice_value + latency fields)
 * - scenario_consequence_shown  consequence panel rendered
 * - scenario_completed          consequence acknowledged (terminal, once)
 * - scenario_interrupted        panel closed before commit (step-away)
 * - scenario_abandoned          room left before commit (after entering)
 */

/** Session-lifetime progress for one scenario. */
export interface ScenarioSessionState {
  entered: boolean;
  enteredAtMs: number | null;
  briefingOpens: number;
  /** Unique evidence ids viewed at least once. */
  evidenceViewed: string[];
  /** Total evidence opens including repeats. */
  evidenceOpens: number;
  optionalInfoRequests: number;
  /** Latest COMPLETE pre-commit selection (option id / joined slot ids). */
  selectedValue: string | null;
  firstSelectedAtMs: number | null;
  lastSelectedAtMs: number | null;
  /** Times a complete selection replaced a DIFFERENT complete selection. */
  selectionChanges: number;
  committedValue: string | null;
  committedAtMs: number | null;
  consequenceShown: boolean;
  completed: boolean;
  interruptions: number;
  abandonments: number;
}

function createScenarioSessionState(): ScenarioSessionState {
  return {
    entered: false,
    enteredAtMs: null,
    briefingOpens: 0,
    evidenceViewed: [],
    evidenceOpens: 0,
    optionalInfoRequests: 0,
    selectedValue: null,
    firstSelectedAtMs: null,
    lastSelectedAtMs: null,
    selectionChanges: 0,
    committedValue: null,
    committedAtMs: null,
    consequenceShown: false,
    completed: false,
    interruptions: 0,
    abandonments: 0,
  };
}

const scenarioStates = new Map<string, ScenarioSessionState>();

function getScenarioState(scenarioId: string): ScenarioSessionState {
  let state = scenarioStates.get(scenarioId);

  if (state === undefined) {
    state = createScenarioSessionState();
    scenarioStates.set(scenarioId, state);
  }

  return state;
}

/**
 * Test-only deterministic reset (resetSessionOnceFlags precedent; NOT
 * re-exported through a barrel used by gameplay code paths).
 */
export function resetAllScenarioStates() {
  scenarioStates.clear();
  publishScenarioProbe();
}

/**
 * Read-only EXPLICIT completion state for one scenario (route-gate and
 * progress-display source of truth — never an event-count heuristic).
 * Untouched scenarios read as not completed.
 */
export function isScenarioCompleted(scenarioId: string): boolean {
  return scenarioStates.get(scenarioId)?.completed === true;
}

/**
 * Dev-only, read-only progress probe for runtime verification (Playwright),
 * mirroring window.__playerProbe: presentation/telemetry only, never read
 * back into gameplay, dead-code-eliminated from production builds.
 */
declare global {
  interface Window {
    __scenarioProbe?: Record<string, ScenarioSessionState> | null;
  }
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__scenarioProbe = {};
}

function publishScenarioProbe() {
  if (typeof window === 'undefined' || !import.meta.env.DEV) {
    return;
  }

  const snapshot: Record<string, ScenarioSessionState> = {};

  for (const [id, state] of scenarioStates) {
    snapshot[id] = { ...state, evidenceViewed: [...state.evidenceViewed] };
  }

  window.__scenarioProbe = snapshot;
}

/** Narrow logging/feedback surface a host RoomScene provides. */
export interface ScenarioHost {
  logScenarioEvent(
    eventType: string,
    context?: {
      choice_value?: string | number | null;
      metadata?: Record<string, unknown>;
    },
  ): void;
  showFeedback(message: string): void;
}

export class ScenarioController {
  private readonly state: ScenarioSessionState;
  /** Transient per-panel-session timing/picks (reset on every panel open). */
  private decisionOpenedAtMs: number | null = null;
  private evidenceOpenedAtMs: number | null = null;
  private orderedPicks: string[] = [];

  constructor(
    private readonly definition: ScenarioDefinition,
    private readonly host: ScenarioHost,
  ) {
    this.state = getScenarioState(definition.id);
  }

  /** Read-only progress view (for host-scene conditionals). */
  getProgress(): Readonly<ScenarioSessionState> {
    return this.state;
  }

  /**
   * Station config for RoomScene.addStation. The one-shot completion gate
   * and the entered/briefing telemetry live in onPromptOpened (FinalCore
   * gate precedent); the briefing body is set per open so a committed-but-
   * unacknowledged session re-opens directly on its consequence.
   */
  buildStationConfig(position: { x: number; y: number }): RoomStationConfig {
    const config: RoomStationConfig = {
      interactionKey: this.definition.interactionKey,
      label: this.definition.stationLabel,
      x: position.x,
      y: position.y,
      promptBody: this.definition.briefing,
      onPromptOpened: () => {
        if (this.state.completed) {
          this.host.showFeedback(this.definition.completedFeedback);
          return false;
        }

        // Recovery path: committed but never acknowledged (should be
        // unreachable through normal play — the consequence stage has a
        // single option — but a scene restart mid-panel must not re-open
        // the decision).
        if (this.state.committedValue !== null) {
          config.promptBody = this.buildConsequenceBody(
            this.state.committedValue,
          );
          return true;
        }

        config.promptBody = this.definition.briefing;
        this.orderedPicks = [];

        const now = Date.now();

        if (!this.state.entered) {
          this.state.entered = true;
          this.state.enteredAtMs = now;
          this.log('scenario_entered');
        }

        this.state.briefingOpens += 1;
        this.log('scenario_briefing_opened', {
          metadata: { open_number: this.state.briefingOpens },
        });
        publishScenarioProbe();
        return true;
      },
    };

    return config;
  }

  /**
   * Options for the station's root prompt render (RoomScene.getPromptOptions
   * branch). Pairs with buildStationConfig's per-open promptBody.
   */
  getRootOptions(): PromptOption[] {
    if (this.state.committedValue !== null && !this.state.completed) {
      return this.buildConsequenceOptions(this.state.committedValue);
    }

    return this.buildBriefingOptions();
  }

  /**
   * Host-scene room-exit hook: leaving the room after entering the scenario
   * but before committing logs one abandonment marker (per departure).
   */
  handleRoomExit() {
    if (!this.state.entered || this.state.committedValue !== null) {
      return;
    }

    this.state.abandonments += 1;
    this.log('scenario_abandoned', {
      metadata: {
        had_selection: this.state.selectedValue !== null,
        abandonment_number: this.state.abandonments,
      },
    });
    publishScenarioProbe();
  }

  // ——————————————————————— stage builders ———————————————————————

  private buildBriefingStage(): PromptStage {
    return {
      body: this.definition.briefing,
      options: this.buildBriefingOptions(),
    };
  }

  private buildBriefingOptions(): PromptOption[] {
    const options: PromptOption[] = this.definition.evidence.map(
      (evidence) => ({
        label: evidence.label,
        feedback: '',
        getEventTypes: () => [],
        onSelected: () => {
          const now = Date.now();

          this.evidenceOpenedAtMs = now;
          this.state.evidenceOpens += 1;

          if (!this.state.evidenceViewed.includes(evidence.id)) {
            this.state.evidenceViewed.push(evidence.id);
          }

          if (evidence.optional === true) {
            this.state.optionalInfoRequests += 1;
            this.log('scenario_optional_info_requested', {
              metadata: { evidence_id: evidence.id },
            });
          }

          this.log('scenario_evidence_opened', {
            metadata: {
              evidence_id: evidence.id,
              optional: evidence.optional === true,
              open_number: this.state.evidenceOpens,
            },
          });
          publishScenarioProbe();
        },
        nextStage: () => this.buildEvidenceStage(evidence.id, evidence.body),
      }),
    );

    options.push({
      label: this.definition.decideOptionLabel ?? 'Make your decision.',
      feedback: '',
      getEventTypes: () => [],
      onSelected: () => {
        this.decisionOpenedAtMs = Date.now();
      },
      nextStage: () => this.buildDecisionStage(),
    });

    options.push({
      label: this.definition.stepAwayLabel ?? 'Step away for now.',
      feedback:
        this.definition.stepAwayFeedback ?? 'You step away from the console.',
      getEventTypes: () => [],
      onSelected: () => {
        this.state.interruptions += 1;
        this.log('scenario_interrupted', {
          metadata: {
            phase: 'briefing',
            had_selection: this.state.selectedValue !== null,
            interruption_number: this.state.interruptions,
          },
        });
        publishScenarioProbe();
      },
    });

    return options;
  }

  private buildEvidenceStage(evidenceId: string, body: string): PromptStage {
    return {
      body,
      options: [
        {
          label: 'Return to the overview.',
          feedback: '',
          getEventTypes: () => [],
          onSelected: () => {
            const openedAt = this.evidenceOpenedAtMs;

            this.evidenceOpenedAtMs = null;
            this.log('scenario_evidence_closed', {
              metadata: {
                evidence_id: evidenceId,
                dwell_ms: openedAt === null ? null : Date.now() - openedAt,
              },
            });
          },
          nextStage: () => this.buildBriefingStage(),
        },
      ],
    };
  }

  private buildDecisionStage(): PromptStage {
    return this.definition.decision.mode === 'single'
      ? this.buildSingleChoiceStage(this.definition.decision)
      : this.buildOrderedSlotStage(this.definition.decision, 0, []);
  }

  private buildSingleChoiceStage(
    decision: SingleChoiceDecisionDef,
  ): PromptStage {
    const options: PromptOption[] = decision.options.map((option) => ({
      label: option.label,
      feedback: '',
      getEventTypes: () => [],
      onSelected: () => this.recordCompleteSelection(option.id),
      nextStage: () => this.buildConfirmStage(option.id, option.label),
    }));

    options.push({
      label: 'Return to the overview.',
      feedback: '',
      getEventTypes: () => [],
      nextStage: () => this.buildBriefingStage(),
    });

    return { body: decision.prompt, options };
  }

  private buildConfirmStage(
    optionId: string,
    optionLabel: string,
  ): PromptStage {
    const decision = this.definition.decision as SingleChoiceDecisionDef;
    const hint =
      decision.confirmHint ?? 'Committed decisions are logged and final.';

    return {
      body: `You are about to: ${optionLabel}\n\n${hint}`,
      options: [
        {
          label: 'Commit this decision.',
          feedback: '',
          getEventTypes: () => [],
          onSelected: () => this.commitDecision(optionId),
          nextStage: () => this.buildConsequenceStage(optionId),
        },
        {
          label: 'Reconsider the options.',
          feedback: '',
          getEventTypes: () => [],
          onSelected: () => {
            this.decisionOpenedAtMs = Date.now();
          },
          nextStage: () => this.buildSingleChoiceStage(decision),
        },
      ],
    };
  }

  private buildOrderedSlotStage(
    decision: OrderedPicksDecisionDef,
    slotIndex: number,
    picks: string[],
  ): PromptStage {
    const remaining = decision.candidates.filter(
      (candidate) => !picks.includes(candidate.id),
    );
    const pickedLines = picks.map(
      (id, index) =>
        `${decision.slotLabels[index]}: ${this.candidateLabel(decision, id)}`,
    );
    const body =
      `${decision.prompt}\n\nAssign ${decision.slotLabels[slotIndex]}.` +
      (pickedLines.length > 0 ? `\n${pickedLines.join('\n')}` : '');

    const options: PromptOption[] = remaining.map((candidate) => ({
      label: candidate.label,
      feedback: '',
      getEventTypes: () => [],
      onSelected: () => {
        const nextPicks = [...picks, candidate.id];

        this.orderedPicks = nextPicks;
        this.log('scenario_option_selected', {
          choice_value: candidate.id,
          metadata: {
            slot: slotIndex + 1,
            slot_label: decision.slotLabels[slotIndex],
            ms_since_decision_opened: this.msSinceDecisionOpened(),
          },
        });

        if (nextPicks.length === decision.slotLabels.length) {
          this.recordCompleteSelection(nextPicks.join('>'), true);
        }
      },
      nextStage: () => {
        const picksNow = this.orderedPicks;

        return picksNow.length === decision.slotLabels.length
          ? this.buildAllocationReviewStage(decision, picksNow)
          : this.buildOrderedSlotStage(decision, picksNow.length, picksNow);
      },
    }));

    options.push({
      label:
        slotIndex === 0 ? 'Return to the overview.' : 'Restart the allocation.',
      feedback: '',
      getEventTypes: () => [],
      onSelected: () => {
        this.orderedPicks = [];

        if (slotIndex !== 0) {
          this.decisionOpenedAtMs = Date.now();
        }
      },
      nextStage: () =>
        slotIndex === 0
          ? this.buildBriefingStage()
          : this.buildOrderedSlotStage(decision, 0, []),
    });

    return { body, options };
  }

  private buildAllocationReviewStage(
    decision: OrderedPicksDecisionDef,
    picks: string[],
  ): PromptStage {
    const value = picks.join('>');
    const lines = picks.map(
      (id, index) =>
        `${decision.slotLabels[index]}: ${this.candidateLabel(decision, id)}`,
    );
    const hint =
      decision.confirmHint ?? 'Committed allocations are logged and final.';

    return {
      body: `Allocation review:\n${lines.join('\n')}\n\n${hint}`,
      options: [
        {
          label: 'Commit this allocation.',
          feedback: '',
          getEventTypes: () => [],
          onSelected: () => this.commitDecision(value),
          nextStage: () => this.buildConsequenceStage(value),
        },
        {
          label: 'Revise the allocation.',
          feedback: '',
          getEventTypes: () => [],
          onSelected: () => {
            this.orderedPicks = [];
            this.decisionOpenedAtMs = Date.now();
          },
          nextStage: () => this.buildOrderedSlotStage(decision, 0, []),
        },
      ],
    };
  }

  private buildConsequenceStage(committedValue: string): PromptStage {
    return {
      body: this.buildConsequenceBody(committedValue),
      options: this.buildConsequenceOptions(committedValue),
    };
  }

  private buildConsequenceBody(committedValue: string): string {
    return this.definition.resolveOutcome(committedValue).consequence;
  }

  private buildConsequenceOptions(committedValue: string): PromptOption[] {
    const outcome = this.definition.resolveOutcome(committedValue);

    return [
      {
        label: 'Acknowledge and continue.',
        feedback: outcome.acknowledgeFeedback ?? 'Decision logged.',
        getEventTypes: () => [],
        onSelected: () => {
          if (this.state.completed) {
            return;
          }

          this.state.completed = true;
          this.log('scenario_completed', {
            choice_value: committedValue,
            metadata: {
              total_duration_ms:
                this.state.enteredAtMs === null
                  ? null
                  : Date.now() - this.state.enteredAtMs,
            },
          });
          publishScenarioProbe();
        },
      },
    ];
  }

  // ——————————————————————— recording helpers ———————————————————————

  /**
   * Records a COMPLETE pre-commit selection. Logs scenario_option_selected
   * (single mode; ordered mode logs per-slot picks itself and passes
   * skipSelectedEvent) and scenario_option_changed when it replaces a
   * different previous complete selection.
   */
  private recordCompleteSelection(value: string, skipSelectedEvent = false) {
    const now = Date.now();
    const previous = this.state.selectedValue;

    if (!skipSelectedEvent) {
      this.log('scenario_option_selected', {
        choice_value: value,
        metadata: {
          reselected: previous === value,
          ms_since_decision_opened: this.msSinceDecisionOpened(),
        },
      });
    }

    if (previous !== null && previous !== value) {
      this.state.selectionChanges += 1;
      this.log('scenario_option_changed', {
        metadata: {
          previous_value: previous,
          new_value: value,
          change_number: this.state.selectionChanges,
        },
      });
    }

    this.state.selectedValue = value;
    this.state.lastSelectedAtMs = now;

    if (this.state.firstSelectedAtMs === null) {
      this.state.firstSelectedAtMs = now;
    }

    publishScenarioProbe();
  }

  private commitDecision(value: string) {
    // Belt-and-braces: the stage flow cannot reach commit twice, but a
    // double keypress race must never double-log a committed decision.
    if (this.state.committedValue !== null) {
      return;
    }

    const now = Date.now();

    this.state.committedValue = value;
    this.state.committedAtMs = now;
    this.log('scenario_decision_committed', {
      choice_value: value,
      metadata: {
        changes_before_commit: this.state.selectionChanges,
        evidence_viewed_count: this.state.evidenceViewed.length,
        evidence_viewed: [...this.state.evidenceViewed],
        optional_info_requested: this.state.optionalInfoRequests > 0,
        commit_latency_ms:
          this.state.lastSelectedAtMs === null
            ? null
            : now - this.state.lastSelectedAtMs,
        ms_since_first_selection:
          this.state.firstSelectedAtMs === null
            ? null
            : now - this.state.firstSelectedAtMs,
        ms_since_entered:
          this.state.enteredAtMs === null ? null : now - this.state.enteredAtMs,
      },
    });

    this.state.consequenceShown = true;
    this.log('scenario_consequence_shown', {
      metadata: { committed_value: value },
    });
    publishScenarioProbe();
  }

  private candidateLabel(
    decision: OrderedPicksDecisionDef,
    candidateId: string,
  ): string {
    const candidate: ScenarioChoiceOptionDef | undefined =
      decision.candidates.find((entry) => entry.id === candidateId);

    return candidate?.label ?? candidateId;
  }

  private msSinceDecisionOpened(): number | null {
    return this.decisionOpenedAtMs === null
      ? null
      : Date.now() - this.decisionOpenedAtMs;
  }

  private log(
    eventType: string,
    context?: {
      choice_value?: string | number | null;
      metadata?: Record<string, unknown>;
    },
  ) {
    this.host.logScenarioEvent(eventType, {
      choice_value: context?.choice_value,
      metadata: { scenario_id: this.definition.id, ...context?.metadata },
    });
  }
}
