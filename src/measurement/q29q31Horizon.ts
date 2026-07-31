/**
 * Q29/Q31 shared goal-horizon module state (SA-3 adopted design; Unit 3).
 *
 * ONE shared construct state for the sole authorised shared-construct
 * exception: two matched, counterbalanced horizon situations — form A
 * NPC-mediated (Kai's planning slate, Engineer Hub), form B
 * terminal-mediated (Operations Annex planning terminal). Each situation
 * offers a self-contained/immediate objective and a distributed/delayed
 * objective of comparable total effort and value, never labelled short-
 * or long-term; the initial choice is recorded at selection, before any
 * interruption or consequence.
 *
 * HARD RULE (SA-3): this module records construct-level observations
 * only. It never produces, and must never be split into, separate Q29
 * and Q31 scores. Option position is counterbalanced per session and
 * recorded; encounter order is free-roam and recorded as a control.
 * Event names are internal/provisional; no scoring exists.
 */

export const Q29Q31_OPPORTUNITY_ID = 'proto_q29q31_goal_horizon';
export const Q29Q31_ENTRY_STATE_VERSION = 'q29q31-matched-pair-v1';
export const Q29Q31_OWNER = 'Q29/Q31 (shared construct — sole exception)';

export type HorizonForm = 'A_npc' | 'B_terminal';
export type HorizonChoice = 'immediate' | 'distributed';

export interface HorizonSituationContent {
  form: HorizonForm;
  /** In-fiction prompt body (matched framing, no horizon labels). */
  body: string;
  immediateLabel: string;
  distributedLabel: string;
  /** Inspectable detail (matched effort/value wording). */
  detail: string;
}

/**
 * Matched parallel forms: comparable step counts, benefit magnitude,
 * difficulty and social framing; neither option morally favoured.
 */
export const HORIZON_SITUATIONS: readonly HorizonSituationContent[] = [
  {
    form: 'A_npc',
    body: 'Kai flips his planning slate around. "Two open maintenance requests, one slot on your roster. Your call which one gets logged."',
    immediateLabel:
      'Recalibrate the bench flow meter — one sitting, bench back online today.',
    distributedLabel:
      'Set up the three-stage filter overhaul — the same total work in three later windows, finished at core activation.',
    detail:
      'Kai: "Both are about the same amount of work and matter about the same. The flow meter pays off straight away; the overhaul pays off at activation."',
  },
  {
    form: 'B_terminal',
    body: 'The planning terminal lists two open annex requests for one roster slot.',
    immediateLabel:
      'Patch the dorm heater loop — one sitting, heat restored tonight.',
    distributedLabel:
      'Stage the heat-exchanger refit — the same total work in three later windows, finished at cycle end.',
    detail:
      'Terminal note: both requests are logged at equal workload and equal priority. The patch takes effect immediately; the refit takes effect at cycle end.',
  },
] as const;

export interface HorizonObservation {
  form: HorizonForm;
  choice: HorizonChoice;
  /** Rendered option order ('immediate_first' | 'distributed_first'). */
  option_order: string;
  /** 1-based encounter index within the shared construct (1 or 2). */
  encounter_index: number;
  inspected_detail: boolean;
}

export interface Q29Q31State {
  /** Construct-level observations (max one per form). */
  observations: HorizonObservation[];
  /** Forms whose detail stage was opened before choice. */
  inspected_forms: HorizonForm[];
}

function createInitialHorizonState(): Q29Q31State {
  return { observations: [], inspected_forms: [] };
}

export const q29q31State: Q29Q31State = createInitialHorizonState();

export function horizonFormAnswered(form: HorizonForm): boolean {
  return q29q31State.observations.some((entry) => entry.form === form);
}

export function markHorizonDetailInspected(form: HorizonForm) {
  if (!q29q31State.inspected_forms.includes(form)) {
    q29q31State.inspected_forms.push(form);
  }
}

/**
 * Records the initial choice for one situation (once per form). Returns
 * the observation, or null when the form was already answered.
 */
export function recordHorizonChoice(
  form: HorizonForm,
  choice: HorizonChoice,
  optionOrder: string,
): HorizonObservation | null {
  if (horizonFormAnswered(form)) {
    return null;
  }

  const observation: HorizonObservation = {
    form,
    choice,
    option_order: optionOrder,
    encounter_index: q29q31State.observations.length + 1,
    inspected_detail: q29q31State.inspected_forms.includes(form),
  };

  q29q31State.observations.push(observation);

  return observation;
}

export function horizonConstructComplete(): boolean {
  return q29q31State.observations.length >= HORIZON_SITUATIONS.length;
}

/** Test-only escape hatch. */
export function resetQ29Q31State() {
  Object.assign(q29q31State, createInitialHorizonState());
  q29q31State.observations = [];
  q29q31State.inspected_forms = [];
}
