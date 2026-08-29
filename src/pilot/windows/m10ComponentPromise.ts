/**
 * M10 — Bounded social commitment: deliver a named component
 * (evidence-led pilot v2, Unit 2).
 *
 * Ledger (sheet 09): voluntarily accept delivery of a named component,
 * receive a standardised interruption, and later hand it to the available
 * named NPC; explicit acceptance; item/recipient always available; one
 * neutral reminder; no dialogue wording scored.
 *
 * Mechanic: at the incident handover Vale asks whether the participant
 * will carry the sealed calibration key card to Kai (accept/decline).
 * Immediately after acceptance the standardised interruption fires (the
 * station pressure alarm — identical for everyone, ~2 s, no choice). Kai
 * is available in the Laboratory (episode 3) and beside Vale on the return
 * (episode 5); Kai's prompt offers the handover whenever the participant
 * carries the card. One neutral reminder: the mission-log line.
 *
 * Raw components: promise_accepted, promise_fulfilled, handover_delay
 * (ms from acceptance to handover), interruption_exposure, cutoff_state
 * (open at the review → 'unfulfilled_at_review').
 */
import { registerMissionLogEntry } from '../pilotRoute';
import { phaseMetadata } from '../return/returnEpisodeModel';
import { type InputMode, ItemWindow } from './windowKit';

export const M10_OPPORTUNITY_ID = 'proto_m10_component_promise';
export const M10_ENTRY_STATE_VERSION = 'm10-component-promise-v1';
export const M10_FAMILY = 'proto_m10_promise_';
export const M10_COMPONENT_LABEL = 'Calibration key card';
export const M10_INTERRUPTION_TEXT =
  'PRESSURE ALARM — coolant loop transient. Hold position until the alarm clears.';

interface M10State {
  offered: boolean;
  accepted: boolean | null;
  acceptedAtMs: number | null;
  interruptionShownAtMs: number | null;
  interruptionAcknowledgedAtMs: number | null;
  handedOverAtMs: number | null;
  handoverNpc: string | null;
  reminderLogViews: number;
  kaiEncounters: number;
}

let state: M10State = {
  offered: false,
  accepted: null,
  acceptedAtMs: null,
  interruptionShownAtMs: null,
  interruptionAcknowledgedAtMs: null,
  handedOverAtMs: null,
  handoverNpc: null,
  reminderLogViews: 0,
  kaiEncounters: 0,
};

export const m10Window = new ItemWindow({
  item: 'M10',
  opportunityId: M10_OPPORTUNITY_ID,
  windowId: 'm10_promise_accept',
  entryStateVersion: M10_ENTRY_STATE_VERSION,
  family: M10_FAMILY,
  scene: 'station_concourse',
  objectId: 'm10_component_promise',
});

export function declareM10() {
  m10Window.declare();
}

/**
 * Unit 5: every event carries its phase and BOTH ledger window ids
 * (accept / handover) so the two phases stay traceably linked without
 * ever sharing a raw event. The handover phase begins at the
 * standardised interruption (window id switch, Unit 2).
 */
function m10Phase() {
  return phaseMetadata(
    'M10',
    m10Window.spec.windowId === 'm10_promise_handover' ? 'end' : 'start',
  );
}

function logM10(suffix: string, metadata: Record<string, unknown>) {
  m10Window.log(suffix, { ...m10Phase(), ...metadata });
}

export function m10State(): Readonly<M10State> {
  return state;
}

export function presentM10Offer(nowMs: number) {
  declareM10();

  if (!state.offered) {
    state.offered = true;
    m10Window.present(nowMs, {
      component: M10_COMPONENT_LABEL,
      recipient: 'Kai',
    });
  }
}

export function answerM10Offer(
  accepted: boolean,
  nowMs: number,
  inputMode: InputMode,
) {
  presentM10Offer(nowMs);

  if (state.accepted !== null) {
    return;
  }

  state.accepted = accepted;
  state.acceptedAtMs = nowMs;
  m10Window.open(nowMs, { accepted });
  logM10('offer_answered', { accepted, input_mode: inputMode });

  if (accepted) {
    registerMissionLogEntry({
      id: 'm10_promise',
      kind: 'obligation',
      order: 12,
      text: () => `Hand the ${M10_COMPONENT_LABEL.toLowerCase()} to Kai.`,
      isClosed: () => state.handedOverAtMs !== null,
    });
  } else {
    m10Window.complete(
      nowMs,
      {
        promise_accepted: false,
        promise_fulfilled: null,
        handover_delay_ms: null,
        interruption_exposure: false,
        cutoff_state: 'declined',
      },
      inputMode,
    );
  }
}

export function m10Carrying(): boolean {
  return state.accepted === true && state.handedOverAtMs === null;
}

/** The standardised interruption was shown (host modal) and acknowledged. */
export function noteM10InterruptionShown(nowMs: number) {
  if (state.accepted !== true || state.interruptionShownAtMs !== null) {
    return;
  }

  state.interruptionShownAtMs = nowMs;
  m10Window.spec.windowId = 'm10_promise_handover';
  logM10('interruption_shown', { input_mode: 'system' });
}

export function noteM10InterruptionAcknowledged(
  nowMs: number,
  inputMode: InputMode,
) {
  if (
    state.interruptionShownAtMs === null ||
    state.interruptionAcknowledgedAtMs !== null
  ) {
    return;
  }

  state.interruptionAcknowledgedAtMs = nowMs;
  logM10('interruption_acknowledged', { input_mode: inputMode });
}

export function noteM10ReminderLogViewed() {
  if (m10Carrying()) {
    state.reminderLogViews += 1;
  }
}

/** Kai encountered while carrying (handover available; not taken = recorded). */
export function noteM10KaiEncounter() {
  if (m10Carrying()) {
    state.kaiEncounters += 1;
    logM10('recipient_available', {
      encounter: state.kaiEncounters,
      input_mode: 'system',
    });
  }
}

/** The hand-over act at Kai. */
export function handOverM10(nowMs: number, npc: string, inputMode: InputMode) {
  if (!m10Carrying()) {
    return false;
  }

  state.handedOverAtMs = nowMs;
  state.handoverNpc = npc;
  logM10('handed_over', { npc, input_mode: inputMode });
  m10Window.complete(
    nowMs,
    {
      ...m10Phase(),
      promise_accepted: true,
      promise_fulfilled: true,
      handover_delay_ms: nowMs - (state.acceptedAtMs ?? nowMs),
      handover_npc: npc,
      interruption_exposure: state.interruptionShownAtMs !== null,
      interruption_acknowledged: state.interruptionAcknowledgedAtMs !== null,
      recipient_encounters_before_handover: state.kaiEncounters,
      reminder_log_views: state.reminderLogViews,
      cutoff_state: null,
    },
    inputMode,
  );

  return true;
}

/** Deck review: an accepted, unfulfilled promise closes as a completed observation. */
export function closeM10AtReview(nowMs: number) {
  if (!state.offered) {
    m10Window.markAbsent('offer never presented before the review');
    return;
  }

  if (state.accepted === null) {
    m10Window.open(nowMs, { accepted: null });
    m10Window.stop(
      nowMs,
      'closed_at_review',
      { offer_unanswered: true },
      'system',
    );
    return;
  }

  if (m10Carrying()) {
    m10Window.complete(
      nowMs,
      {
        ...m10Phase(),
        promise_accepted: true,
        promise_fulfilled: false,
        handover_delay_ms: null,
        interruption_exposure: state.interruptionShownAtMs !== null,
        interruption_acknowledged: state.interruptionAcknowledgedAtMs !== null,
        recipient_encounters_before_handover: state.kaiEncounters,
        reminder_log_views: state.reminderLogViews,
        cutoff_state: 'unfulfilled_at_review',
      },
      'system',
    );
  }
}

/** Test-only escape hatch. */
export function resetM10State() {
  state = {
    offered: false,
    accepted: null,
    acceptedAtMs: null,
    interruptionShownAtMs: null,
    interruptionAcknowledgedAtMs: null,
    handedOverAtMs: null,
    handoverNpc: null,
    reminderLogViews: 0,
    kaiEncounters: 0,
  };
  m10Window.reset();
  m10Window.spec.windowId = 'm10_promise_accept';
}
