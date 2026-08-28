/**
 * Secondary contextual telemetry for the questionnaire-primary items
 * (evidence-led pilot v2, Unit 2).
 *
 * M08 ("Tends to be lazy.") and M11 ("Sometimes behaves irresponsibly.")
 * are QUESTIONNAIRE-PRIMARY (sheet 09). Their in-game behaviour is
 * descriptive SECONDARY telemetry only: no opportunity is declared on the
 * validity register, no window exists, no reward or route gate depends on
 * it, and nothing here is ever interpreted as a score or a trait value.
 *
 * - `secondary_m08_optional_job_*`: engagement with two naturally
 *   available optional useful jobs (stowing incoming supplies; the
 *   optional filter swap on the work-order board) with fatigue context
 *   (route stage/episode) — never "laziness".
 * - `secondary_m11_seal_obligation_*`: the sample-seal obligation
 *   acknowledged on the Seal Log and whether the seal was resolved when a
 *   sealed sample was transferred — one narrow compliance act, never
 *   broad irresponsibility.
 */
import { researchRuntime } from '../../systems';
import { pilotEpisode, pilotStage } from '../pilotRoute';

export const M08_SECONDARY_ID = 'secondary_m08_optional_job';
export const M11_SECONDARY_ID = 'secondary_m11_seal_obligation';

export type M08OptionalJob = 'stow_supplies' | 'filter_swap';

interface SecondaryState {
  m08: Record<
    M08OptionalJob,
    { offered: boolean; engaged: boolean; engagedAtMs: number | null }
  >;
  m11: {
    acknowledged: boolean;
    acknowledgedAtMs: number | null;
    sealResolvedAtTransfer: boolean | null;
    transfers: number;
  };
}

let state: SecondaryState = initial();

function initial(): SecondaryState {
  return {
    m08: {
      stow_supplies: { offered: false, engaged: false, engagedAtMs: null },
      filter_swap: { offered: false, engaged: false, engagedAtMs: null },
    },
    m11: {
      acknowledged: false,
      acknowledgedAtMs: null,
      sealResolvedAtTransfer: null,
      transfers: 0,
    },
  };
}

function log(
  eventType: string,
  objectId: string,
  metadata: Record<string, unknown>,
) {
  researchRuntime.logInteraction({
    scene: 'pilot_secondary',
    object_id: objectId,
    episode: 'secondary_context',
    event_type: eventType,
    metadata: {
      secondary_only: true,
      primary_inference: 'none',
      route_stage: pilotStage(),
      route_episode: pilotEpisode(),
      ...metadata,
    },
  });
}

export function secondaryState(): Readonly<SecondaryState> {
  return state;
}

// ——— M08 ————————————————————————————————————————————————————————————————

export function noteM08JobOffered(job: M08OptionalJob) {
  if (state.m08[job].offered) {
    return;
  }

  state.m08[job].offered = true;
  log(`${M08_SECONDARY_ID}_offered`, `m08_${job}`, {
    job,
    eligible_context: true,
    fatigue_context: { stage: pilotStage(), episode: pilotEpisode() },
  });
}

export function noteM08JobEngaged(job: M08OptionalJob, nowMs: number) {
  noteM08JobOffered(job);

  if (state.m08[job].engaged) {
    return;
  }

  state.m08[job].engaged = true;
  state.m08[job].engagedAtMs = nowMs;
  log(`${M08_SECONDARY_ID}_engaged`, `m08_${job}`, {
    job,
    fatigue_context: { stage: pilotStage(), episode: pilotEpisode() },
  });
}

// ——— M11 ————————————————————————————————————————————————————————————————

export function acknowledgeM11Obligation(nowMs: number, inputMode: string) {
  if (state.m11.acknowledged) {
    return;
  }

  state.m11.acknowledged = true;
  state.m11.acknowledgedAtMs = nowMs;
  log(`${M11_SECONDARY_ID}_acknowledged`, 'm11_seal_log', {
    secondary_obligation_acknowledged: true,
    input_mode: inputMode,
  });
}

/** A sample was transferred (locker stow); sealed = obligation resolved. */
export function noteM11SampleTransfer(sealed: boolean) {
  state.m11.transfers += 1;

  if (state.m11.sealResolvedAtTransfer === null) {
    state.m11.sealResolvedAtTransfer = sealed;
  }

  log(`${M11_SECONDARY_ID}_transfer`, 'm11_seal_log', {
    secondary_seal_resolved_at_transfer: sealed,
    secondary_obligation_acknowledged: state.m11.acknowledged,
    transfer_index: state.m11.transfers,
  });
}

/** Test-only escape hatch. */
export function resetSecondaryTelemetry() {
  state = initial();
}
